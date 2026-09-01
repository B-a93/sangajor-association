import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('cooking and baking are separate complete six-lesson courses',async()=>{
 const [data,page,app,hub]=await Promise.all([read('src/data/cookingBakingCourses.ts'),read('src/pages/PracticalCourse.tsx'),read('src/App.tsx'),read('src/pages/ConnectionHub.tsx')]);
 for(const title of ['Everyday Cooking Skills','Practical Baking Skills','Kitchen Safety, Hygiene and Organisation','Meal Planning, Food Storage and Reducing Waste','Baking Safety, Equipment and Accurate Measuring','Oven Control, Decoration, Storage and Costing']) assert.match(data,new RegExp(title));
 assert.equal((data.match(/number:[1-6],title:/g)??[]).length,12);
 for(const control of ['Start Lesson','Save and Continue Later','Submit Knowledge Check','Complete Lesson','Previous Lesson','Next Lesson']) assert.match(page,new RegExp(control));
 assert.match(app,/everyday-cooking-skills/);assert.match(app,/practical-baking-skills/);
 assert.match(hub,/Everyday Cooking Skills/);assert.match(hub,/Practical Baking Skills/);
});

test('both practical courses reuse secure learning and certificate infrastructure',async()=>{
 const [page,migration]=await Promise.all([read('src/pages/PracticalCourse.tsx'),read('supabase/migrations/202609010001_cooking_and_baking_courses.sql')]);
 for(const table of ['lesson_progress','course_enrolments','course_assessments','course_assignments','learning_certificates']) assert.match(page,new RegExp(table));
 assert.doesNotMatch(migration,/create table/i);
 assert.match(migration,/Previous lesson must be completed/);assert.match(migration,/knowledge_score>=70/);
 assert.match(migration,/Only an approved tutor may verify course requirements/);assert.match(migration,/Pending Chairman Approval/);
 assert.match(migration,/Only the current active Chairman may approve or reject certificates/);
});
