import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('certificate decisions are Chairman-only, audited, and unavailable as table writes', async () => {
  const migration = await read('supabase/migrations/202608080007_chairman_certificate_approval.sql');
  assert.match(migration, /active_executive_office\(user_id\) = 'chairman'/);
  assert.match(migration, /Only the current active Chairman may approve or reject certificates/);
  assert.match(migration, /certificate_approval_audit_log/);
  assert.match(migration, /revoke insert, update, delete on public\.learning_certificates/);
  assert.match(migration, /status='Pending Chairman Approval'/);
  assert.doesNotMatch(migration, /is_executive\(auth\.uid\(\)\).*approve/i);
});

test('Chairman dashboard exposes evidence, decisions, and required rejection reason', async () => {
  const page = await read('src/pages/ChairmanCertificateApproval.tsx');
  for (const label of ['Chairman Certificate Approval','Completed lessons','Quiz / final assessment','Practical assignment','Tutor verification','Completion date','Approve','Reject','Rejection reason']) assert.match(page, new RegExp(label));
  assert.match(page, /is_active_chairman/);
  assert.match(page, /decide_certificate/);
});

test('qualified learners receive the final-approval message', async () => {
  const page = await read('src/pages/DigitalIncomeCourse.tsx');
  assert.match(page, /Congratulations! You have completed the course requirements\. Your certificate has been submitted to the Chairman for final approval\./);
});
