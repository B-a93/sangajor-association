import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('course is separate and contains the six required lessons and controls', async () => {
  const [data,page,app,hub]=await Promise.all([read('src/data/essentialDigitalSkillsCourse.ts'),read('src/pages/EssentialDigitalSkillsCourse.tsx'),read('src/App.tsx'),read('src/pages/ConnectionHub.tsx')]);
  for(const title of ['Understanding Digital Devices','Using the Internet and Email','Files, Documents and Cloud Storage','Online Communication and Collaboration','Online Safety and Digital Responsibility','Introduction to AI and Productivity Tools']) assert.match(data,new RegExp(title));
  assert.equal((data.match(/number: [1-6], title:/g)??[]).length,6);
  assert.equal((data.match(/question\('q[1-6]'/g)??[]).length,36);
  for(const control of ['Start Lesson','Save and Continue Later','Submit Knowledge Check','Complete Lesson','Previous Lesson','Next Lesson']) assert.match(page,new RegExp(control));
  assert.match(page,/PASSING_SCORE/); assert.match(page,/70%/); assert.match(page,/Final Assessment &amp; Practical Assignment/);
  assert.match(app,/essential-digital-skills\\\/lesson-\(\[1-6\]\)/);
  assert.match(hub,/Essential Digital & Technology Skills/); assert.match(hub,/digital-income/);
});

test('course reuses secure persistence and enforces sequential completion and approvals', async()=>{
 const [page,migration]=await Promise.all([read('src/pages/EssentialDigitalSkillsCourse.tsx'),read('supabase/migrations/202608140001_essential_digital_technology_skills.sql')]);
 for(const table of ['lesson_progress','course_enrolments','course_assessments','course_assignments','learning_certificates']) assert.match(page,new RegExp(table));
 assert.doesNotMatch(migration,/create table/i);
 assert.match(migration,/Previous lesson must be completed/); assert.match(migration,/knowledge_score>=70/);
 assert.match(migration,/Only an approved tutor may verify course requirements/);
 assert.match(migration,/Pending Chairman Approval/); assert.match(migration,/is_active_chairman\(auth\.uid\(\)\)/);
 assert.match(migration,/Only the current active Chairman may approve or reject certificates/);
 assert.match(page,/select\('\*'\).*essential-digital-skills-lesson/s); assert.match(page,/setCompleted\(Boolean\(data\.completed_at\)\)/);
});
