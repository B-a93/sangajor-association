import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('learner registrations remain visible to Chairman, Secretary and IPRO offices',async()=>{
  const [reviewMigration,instantMigration]=await Promise.all([
    read('supabase/migrations/202610090001_learner_request_review.sql'),
    read('supabase/migrations/202610100001_instant_public_course_access.sql'),
  ]);
  for(const office of ['chairman','vice_chairperson','secretary_general','assistant_secretary_general','ipro','assistant_ipro']) assert.match(reviewMigration,new RegExp(office));
  assert.match(reviewMigration,/can_review_learning_requests/);
  assert.match(instantMigration,/status = 'approved'/);
  assert.match(instantMigration,/automatic_registration/);
  assert.match(instantMigration,/can_access_learning_course/);
});

test('learner dashboard is read only for authorised offices',async()=>{
  const [page,app,dashboard]=await Promise.all([read('src/pages/LearnerRequests.tsx'),read('src/App.tsx'),read('src/pages/MemberDashboard.tsx')]);
  assert.match(page,/Learner Registrations/);
  assert.match(page,/skill_exchange_learner_request_queue/);
  assert.doesNotMatch(page,/review_skill_exchange_learner_request/);
  assert.doesNotMatch(page,/>Approve</);
  assert.doesNotMatch(page,/>Decline</);
  assert.match(app,/\/dashboard\/learner-requests/);
  assert.match(dashboard,/can_review_learning_requests/);
  assert.match(dashboard,/unread_learner_request_count/);
});

test('verified public learner is registered automatically and can start immediately',async()=>{
  const page=await read('src/pages/PublicSkillExchange.tsx');
  assert.match(page,/Registration complete/);
  assert.match(page,/Start Course/);
  assert.match(page,/Register for free/);
  assert.match(page,/courseRoutes/);
  assert.doesNotMatch(page,/Learning request received/);
});
