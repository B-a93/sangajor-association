import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('learner requests are reviewed by Chairman, Secretary and IPRO offices',async()=>{
  const sql=await read('supabase/migrations/202610090001_learner_request_review.sql');
  for(const office of ['chairman','vice_chairperson','secretary_general','assistant_secretary_general','ipro','assistant_ipro']) assert.match(sql,new RegExp(office));
  assert.match(sql,/can_review_learning_requests/);
  assert.match(sql,/review_skill_exchange_learner_request/);
  assert.match(sql,/status='pending'/);
  assert.match(sql,/A decline reason is required/);
  assert.match(sql,/reviewer_office/);
  assert.match(sql,/learner_user_id=auth\.uid\(\)/);
});

test('learner dashboard is separate and visible to authorised offices',async()=>{
  const [page,app,dashboard]=await Promise.all([read('src/pages/LearnerRequests.tsx'),read('src/App.tsx'),read('src/pages/MemberDashboard.tsx')]);
  assert.match(page,/Learner Requests/);
  assert.match(page,/skill_exchange_learner_request_queue/);
  assert.match(page,/review_skill_exchange_learner_request/);
  assert.match(app,/\/dashboard\/learner-requests/);
  assert.match(dashboard,/can_review_learning_requests/);
  assert.match(dashboard,/unread_learner_request_count/);
});

test('public learner receives pending confirmation and secure status check',async()=>{
  const page=await read('src/pages/PublicSkillExchange.tsx');
  assert.match(page,/Learning request received/);
  assert.match(page,/Pending Review/);
  assert.match(page,/public_skill_learner_status/);
  assert.match(page,/SXL-2026/);
});
