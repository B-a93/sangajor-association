import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateAcceptance } from '../supabase/functions/_shared/invitation-policy.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('public registration is disabled without removing login or reset', async () => {
  const [authPage, config] = await Promise.all([read('src/pages/Auth.tsx'), read('supabase/config.toml')]);
  assert.doesNotMatch(authPage, /auth\.signUp/);
  assert.match(authPage, /signInWithPassword/);
  assert.match(authPage, /resetPasswordForEmail/);
  assert.match(config, /enable_signup = false/);
});

test('invitation acceptance validates every lifecycle state', () => {
  const now = new Date('2026-07-30T12:00:00Z');
  const pending = { status: 'pending', expires_at: '2026-08-06T12:00:00Z' };
  assert.equal(validateAcceptance({ invitation: pending, password: 'secure-pass', now }), null);
  assert.equal(validateAcceptance({ invitation: null, password: 'secure-pass', now }).status, 404);
  assert.equal(validateAcceptance({ invitation: pending, password: 'short', now }).status, 400);
  assert.equal(validateAcceptance({ invitation: { ...pending, status: 'accepted' }, password: 'secure-pass', now }).status, 409);
  assert.equal(validateAcceptance({ invitation: { ...pending, status: 'cancelled' }, password: 'secure-pass', now }).status, 410);
  const expired = validateAcceptance({ invitation: { ...pending, expires_at: '2026-07-29T12:00:00Z' }, password: 'secure-pass', now });
  assert.equal(expired.status, 410);
  assert.equal(expired.shouldExpire, true);
});

test('invitation management requires an executive and stores only a token digest', async () => {
  const [manage, shared, migration] = await Promise.all([
    read('supabase/functions/manage-invitation/index.ts'),
    read('supabase/functions/_shared/invitations.ts'),
    read('supabase/migrations/202607300021_member_invitations.sql'),
  ]);
  assert.match(manage, /executiveFromRequest/);
  assert.match(manage, /token_hash: tokenHash/);
  assert.match(shared, /profile\.role !== 'member'/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke insert, update, delete/);
});
