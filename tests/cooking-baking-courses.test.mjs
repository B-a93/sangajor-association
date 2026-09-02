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

test('practical lesson knowledge checks expose scores, retries, and immediate progression',async()=>{
 const [page,data,migration]=await Promise.all([read('src/pages/PracticalCourse.tsx'),read('src/data/cookingBakingCourses.ts'),read('supabase/migrations/202609020001_practical_course_answer_indices.sql')]);
 assert.match(page,/submit_practical_course_knowledge_check',\{target_course:course\.slug,lesson_number:lessonNumber,submitted_answers:answers\}/);
 assert.match(page,/const value=Number\(data\);setScore\(value\);setKnowledgeSubmitted\(true\)/);
 assert.match(page,/Your score: \$\{value\}% — Passed/);
 assert.match(page,/Your score: \$\{value\}% — Please try again/);
 assert.match(page,/passed=knowledgeSubmitted&&score!==null&&score>=70/);
 assert.match(page,/ready=sectionIds\.length===4&&activityLength>=40&&passed/);
 assert.match(page,/complete_practical_course_lesson/);
 assert.match(page,/Lesson completion could not be verified\. Supabase query error/);
 assert.match(page,/setCompleted\(true\)/);
 assert.match(page,/lessonNumber\+1.*Next Lesson/s);
 assert.match(page,/role="alert"/);
 assert.match(page,/error\.message/);
 assert.match(page,/checked=\{answers\[questionId\] === optionIndex\}/);
 assert.match(data,/\(i\+1\)%4/);
 assert.match(migration,/submitted_answers->>\('q'\|\|n\)=\(\(n\+1\)%4\)::text/);
});

test('both practical courses only complete after the exact RPC succeeds and completed_at is verified',async()=>{
 const page=await read('src/pages/PracticalCourse.tsx');
 assert.match(page,/uniqueLessonSections\(read,lesson\)/);
 assert.match(page,/sectionIds\.length===4&&activityLength>=40&&passed/);
 assert.match(page,/4-sectionIds\.length.*lesson sections still need to be marked as read/);
 assert.match(page,/40-activityLength.*more character/);
 assert.match(page,/const rpcParameters=\{target_course:course\.slug,lesson_number:lessonNumber,section_ids:sectionIds,activity_response:activity\.trim\(\)\}/);
 assert.match(page,/supabase\.rpc\('complete_practical_course_lesson',rpcParameters\)/);
 assert.match(page,/Supabase RPC error: \$\{fullSupabaseError\(error\)\}/);
 assert.match(page,/if\(!row\.completed_at\)/);
 assert.match(page,/lesson_progress\.completed_at is still NULL/);
 assert.match(page,/setCompleted\(true\);setNotice\(`Lesson \$\{lessonNumber\} completed/);
 assert.match(page,/!completed&&!ready.*completion-requirements/s);
 const data=await read('src/data/cookingBakingCourses.ts');
 for(const slug of ['everyday-cooking-skills','practical-baking-skills']) assert.match(data,new RegExp(`slug:'${slug}'`));
});


test('practical lessons reset and restore only lesson-specific learner answers',async()=>{
 const [page,app,data]=await Promise.all([read('src/pages/PracticalCourse.tsx'),read('src/App.tsx'),read('src/data/cookingBakingCourses.ts')]);
 assert.match(page,/const \[answers,setAnswers\]=useState<Record<string,number>>\(\{\}\)/);
 assert.match(page,/setAnswers\(\{\}\);\s*setScore\(null\);\s*setKnowledgeSubmitted\(false\);\s*\}, \[courseSlug, lessonNumber\]\)/);
 assert.match(page,/eq\('lesson_slug',currentLessonSlug\)\.maybeSingle\(\)/);
 assert.match(page,/if\(data\?\.lesson_slug===currentLessonSlug\)/);
 assert.doesNotMatch(page,/correctAnswer|correctIndex|answerValue|question\.answer/);
 assert.doesNotMatch(data,/answer: number|return \{id,prompt,options,answer\}/);
 assert.match(page,/key=\{currentSlug\} data-lesson-slug=\{currentSlug\}/);
 assert.match(app,/key=\{`\$\{cookingCourse\.slug\}-lesson-\$\{cookingLessonMatch\[1\]\}`\}/);
 assert.match(app,/cookingLessonMatch = route\.match\(\/\^.*lesson-\(\[1-6\]\)/);
 assert.match(app,/bakingLessonMatch = route\.match\(\/\^.*lesson-\(\[1-6\]\)/);
});
