import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('teaching request migration preserves submissions and secures Chairman decisions', async () => {
  const sql = await read('supabase/migrations/202608200001_teaching_request_review.sql');
  assert.doesNotMatch(sql, /drop table public\.skill_teaching_submissions/i);
  assert.match(sql, /add column if not exists decline_reason/);
  assert.match(sql, /public\.is_active_chairman\(auth\.uid\(\)\)/);
  assert.match(sql, /Only the current active Chairman may approve or decline teaching requests/);
  assert.match(sql, /decision = 'declined'[\s\S]*?A decline reason is required/);
  assert.match(sql, /where id = request_id and status = 'pending'/);
  assert.match(sql, /Members can view own teaching requests and Chairman reviews all/);
});

test('new requests create private in-platform Chairman notifications with a direct link', async () => {
  const sql = await read('supabase/migrations/202608200001_teaching_request_review.sql');
  assert.match(sql, /create table if not exists public\.teaching_request_notifications/);
  assert.match(sql, /href text not null default '#\/dashboard\/teaching-requests'/);
  assert.match(sql, /create trigger notify_chairman_teaching_request/);
  assert.match(sql, /unique\(request_id, recipient_id\)/);
  assert.match(sql, /recipient_id = auth\.uid\(\) and public\.is_active_chairman/);
});

test('Chairman dashboard exposes pending queue, decisions and status history', async () => {
  const [page,dashboard,app] = await Promise.all([
    read('src/pages/TeachingRequests.tsx'), read('src/pages/MemberDashboard.tsx'), read('src/App.tsx'),
  ]);
  for (const label of ['Teaching Requests','Experience','Teaching format','Availability','Resources','Submission date','Approve','Decline','Reason for declining']) assert.match(page,new RegExp(label));
  assert.match(page, /\['pending','approved','declined'\]/);
  assert.match(dashboard, /unread_teaching_request_count/);
  assert.match(dashboard, /#\/dashboard\/teaching-requests/);
  assert.match(app, /'\/dashboard\/teaching-requests'/);
});

test('member UI distinguishes forms and shows own request status with dated confirmation', async () => {
  const page = await read('src/pages/ConnectionHub.tsx');
  assert.match(page, /propose a specific skill or workshop/i);
  assert.match(page, /Apply to Join the Teacher Network/);
  assert.match(page, /Create a teacher profile/);
  assert.match(page, /My teaching requests/);
  assert.match(page, /Teaching request submitted on/);
  assert.match(page, /Status: Pending Chairman review/);
});

test('production verification checks authority, preservation, statuses and notification links', async () => {
  const sql = await read('supabase/verification/teaching_request_review.sql');
  assert.match(sql, /active_executive_office/);
  assert.match(sql, /group by status/);
  assert.match(sql, /pending_requests/);
  assert.match(sql, /n\.href/);
});
