import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('lesson one contains the complete content, six-question checks and required actions', async () => {
  const [lesson, data, app, hub] = await Promise.all([read('src/pages/DigitalIncomeLesson.tsx'), read('src/data/digitalIncomeLesson.ts'), read('src/App.tsx'), read('src/pages/ConnectionHub.tsx')]);
  assert.match(app, /dashboard\/learning\/digital-income\/lesson-1/);
  assert.match(hub, /Open Lesson 1/);
  for (const topic of ['digital income','What you need to begin','Freelancing','Remote employment','Content creation','Digital products','Online business','Affiliate marketing','Dropshipping','Drop servicing','Online scam awareness']) assert.match(data.toLowerCase(), new RegExp(topic.toLowerCase()));
  assert.equal((data.match(/prompt:/g) ?? []).length, 6);
  assert.equal((data.match(/label:/g) ?? []).length, 6);
  for (const action of ['Start Lesson','Save and Continue Later','Submit Knowledge Check','Complete Lesson']) assert.match(lesson, new RegExp(action));
  assert.match(lesson, /PASSING_SCORE/);
  assert.match(lesson, /Lesson 2: Choosing a Profitable Digital Skill or Service/);
});

test('Supabase enforces member ownership and completion requirements', async () => {
  const migration = await read('supabase/migrations/202608080005_digital_income_lesson_one.sql');
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /auth\.uid\(\)=member_id/);
  assert.match(migration, /knowledge_score>=70/g);
  assert.match(migration, /required_sections/);
  assert.match(migration, /required_pathway/);
  assert.match(migration, /completed_at=now\(\)/);
  assert.match(migration, /certificate issue remains subject/);
});

test('auth identity repair preserves progress and restricts learning rows to active linked users', async () => {
  const migration = await read('supabase/migrations/202608080008_repair_digital_income_auth_identity.sql');
  for (const table of ['lesson_progress', 'course_enrolments', 'course_assessments', 'course_assignments', 'learning_certificates']) {
    assert.match(migration, new RegExp(`${table}_member_id_auth_fkey`));
  }
  assert.match(migration, /references auth\.users\(id\)/g);
  assert.match(migration, /"Members" m/);
  assert.match(migration, /m\.auth_user_id = user_id/);
  assert.match(migration, /status, ''\)\)\) = 'active'/);
  assert.match(migration, /completed_at = coalesce\(completed_at, now\(\)\)/);
  assert.doesNotMatch(migration, /delete from public\.(lesson_progress|course_enrolments|course_assessments|course_assignments|learning_certificates)/i);
});

test('lesson progress survives reload and lesson two unlocks only from persisted completion', async () => {
  const lesson = await read('src/pages/DigitalIncomeLesson.tsx');
  assert.match(lesson, /select\('\*'\).*lesson_slug', 'digital-income-lesson-1'\)\.maybeSingle\(\)/s);
  assert.match(lesson, /setCompleted\(Boolean\(data\.completed_at\)\)/);
  assert.match(lesson, /rpc\('complete_digital_income_lesson_one'/);
  assert.match(lesson, /select\('\*'\).*\.single\(\)/s);
  assert.match(lesson, /else if \(!saved\.completed_at\)/);
  assert.match(lesson, /setCompleted\(true\)/);
  assert.match(lesson, /completed \? 'next-lesson unlocked' : 'next-lesson'/);
  assert.match(lesson, /import\.meta\.env\.DEV \? `\$\{action\}: \$\{message\}`/);
  assert.ok(lesson.indexOf('setSubmittedScore(score)') > lesson.indexOf('if (error) setNotice(databaseError'));
});

test('production verification checks the linked member and complete 100 percent record', async () => {
  const verification = await read('supabase/verification/digital_income_persistence.sql');
  assert.match(verification, /m\.auth_user_id = auth\.uid\(\)/);
  assert.match(verification, /knowledge_score = 100/);
  assert.match(verification, /knowledge_submitted = true/);
  assert.match(verification, /completed_at is not null/);
});
