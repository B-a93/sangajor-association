import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Skill Exchange offers Google and email verification with production return and draft restoration', async () => {
  const page = await read('src/pages/PublicSkillExchange.tsx');
  assert.match(page, /Continue with Google/); assert.match(page, /Verify by Email/);
  assert.match(page, /provider: 'google'/); assert.match(page, /https:\/\/sangajorbcs8\.org\/#\/skill-exchange/);
  assert.match(page, /sessionStorage\.setItem/); assert.match(page, /sessionStorage\.getItem/);
  assert.match(page, /readOnly=\{verified\}/); assert.match(page, /data\.user\?\.email/);
  assert.doesNotMatch(page, /Telephone \/ WhatsApp|type="tel"|phone:/);
});

test('verification reports safe actionable auth failures', async () => {
  const page = await read('src/pages/PublicSkillExchange.tsx');
  for (const text of ['Google verification was cancelled', 'verification email could not be sent', 'Too many verification attempts', 'not configured for this return address', 'invalid or has expired']) assert.match(page, new RegExp(text));
  assert.match(page, /optional preflight function must not prevent/);
  assert.match(page, /supabase\.auth\.signInWithOtp/);
});

test('database and preparation endpoint accept only verified email identities', async () => {
  const [migration, edge] = await Promise.all([read('supabase/migrations/202610010002_skill_exchange_email_auth.sql'), read('supabase/functions/public-skill-verification/index.ts')]);
  assert.match(migration, /verification_channel = 'email'/); assert.match(migration, /email_confirmed_at is not null/);
  assert.match(migration, /alter column telephone drop not null/); assert.match(migration, /,null,btrim\(application->>'location'\)/);
  assert.match(edge, /channel !== 'email'/); assert.doesNotMatch(edge, /phone_confirm|channel === 'email'/);
});


test('learner request completes immediately after email or Google verification', async () => {
  const page = await read('src/pages/PublicSkillExchange.tsx');
  assert.match(page, /autoComplete beforeOAuth/);
  assert.match(page, /await completeLearnerRegistration\(verifiedLearner\)/);
  assert.match(page, /draft\.target === 'learner'[\s\S]*completeLearnerRegistration\(verifiedLearner\)/);
  assert.match(page, /Registration complete/);
  assert.match(page, /Start Course/);
  assert.doesNotMatch(page, /remain Pending Review until the Chairman/);
  assert.match(page, /learnerSubmissionStarted/);
  assert.doesNotMatch(page, /Email verified\. You may now submit the form\.'); onVerified/);
});


test('learner form is validated before verification and hides raw constraint errors', async () => {
  const page = await read('src/pages/PublicSkillExchange.tsx');
  assert.match(page, /ready=\{learner\.full_name\.trim\(\)\.length >= 2/);
  assert.match(page, /Complete your full name, location and course selection before verifying your email/);
  assert.match(page, /Enter your full name using at least two characters/);
  assert.match(page, /details\.location\.trim\(\)\.length < 2/);
});
