import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('public Skill Exchange has both prominent actions, free programme statement and complete teaching form', async () => {
  const page = await read('src/pages/PublicSkillExchange.tsx');
  assert.match(page, /Join a Free Class/);
  assert.match(page, /Apply to Teach for Free/);
  assert.match(page, /Courses are offered free of charge, and approved instructors volunteer their knowledge and time without payment/);
  for (const field of ['Full name','Email address','Telephone / WhatsApp number','Location','Skill or workshop title','Description of what you want to teach','Relevant experience','Intended audience','Preferred format','Availability','Required resources','Supporting document or portfolio link']) assert.match(page, new RegExp(field));
  assert.match(page, /voluntary and unpaid/);
  assert.match(page, /Pending Review/);
  assert.match(page, /signInWithOtp/);
  assert.match(page, /verifyOtp/);
  assert.match(page, /public-skill-verification/);
});

test('public applications are separate, verified, rate limited and locked behind RLS RPCs', async () => {
  const sql = await read('supabase/migrations/202610010001_public_skill_exchange.sql');
  assert.match(sql, /create table if not exists public\.public_skill_teaching_applications/);
  assert.match(sql, /alter table public\.public_skill_teaching_applications enable row level security/);
  assert.match(sql, /public\.verified_public_contact/);
  assert.match(sql, /Submission limit reached/);
  assert.match(sql, /public_skill_verification_attempts/);
  assert.match(sql, /website/);
  assert.match(sql, /status text not null default 'pending'/);
  assert.match(sql, /voluntary_unpaid_consent boolean not null check \(voluntary_unpaid_consent\)/);
  assert.match(sql, /revoke all on table public\.public_skill_teaching_applications/);
});

test('combined secure queue authorises Chairman and programme officers without publishing applicants', async () => {
  const [sql, dashboard, app] = await Promise.all([read('supabase/migrations/202610010001_public_skill_exchange.sql'), read('src/pages/TeachingRequests.tsx'), read('src/App.tsx')]);
  assert.match(sql, /programme_officer','assistant_programme_officer/);
  assert.match(sql, /from public\.skill_teaching_submissions/);
  assert.match(sql, /from public\.public_skill_teaching_applications/);
  assert.match(sql, /request_information/);
  assert.match(sql, /safeguarding and conduct orientation/);
  assert.doesNotMatch(sql, /insert into public\.member_teacher_network/);
  assert.match(dashboard, /Approval does not automatically publish a teacher or create a course/);
  assert.match(app, /'\/skill-exchange'/);
  assert.match(app, /'\/dashboard\/teaching-requests'/);
});

test('applicant receives a private reference and status only through matching verified identity', async () => {
  const sql = await read('supabase/migrations/202610010001_public_skill_exchange.sql');
  assert.match(sql, /reference_number text not null unique/);
  assert.match(sql, /a\.applicant_user_id=auth\.uid\(\)/);
  assert.match(sql, /upper\(a\.reference_number\)=upper\(btrim\(reference\)\)/);
  assert.match(sql, /information_requested/);
  assert.match(sql, /'approved','declined'/);
});
