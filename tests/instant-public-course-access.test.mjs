import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('verified public learners receive immediate full course access', async () => {
  const [page, migration] = await Promise.all([
    read('src/pages/PublicSkillExchange.tsx'),
    read('supabase/migrations/202610100001_instant_public_course_access.sql'),
  ]);
  assert.match(page, /Registration complete/);
  assert.match(page, /Start Course/);
  assert.match(page, /courseRoutes/);
  assert.doesNotMatch(page, /remain Pending Review until the Chairman/);
  assert.match(migration, /alter column status set default 'approved'/);
  assert.match(migration, /create or replace function public\.can_access_learning_course/);
  assert.match(migration, /create or replace function public\.is_active_learning_member/);
  assert.match(migration, /reviewer_office[\s\S]*'automatic_registration'/);
});

test('learner office view is read only while teaching review remains separate', async () => {
  const page = await read('src/pages/LearnerRequests.tsx');
  assert.match(page, /Learner Registrations/);
  assert.match(page, /no approval is required/i);
  assert.doesNotMatch(page, /review_skill_exchange_learner_request/);
  assert.doesNotMatch(page, />Approve</);
  assert.doesNotMatch(page, />Decline</);
});
