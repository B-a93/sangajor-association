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
