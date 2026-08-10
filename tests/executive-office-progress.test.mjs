import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('IPRO office receives executive analytics access', async () => {
  const sql = await read('supabase/migrations/202608100001_executive_office_progress.sql');
  assert.match(sql, /can_view_executive_analytics[\s\S]*?'ipro','assistant_ipro'/);
});

test('executive work register is visible to every active executive', async () => {
  const sql = await read('supabase/migrations/202608100001_executive_office_progress.sql');
  assert.match(sql, /create table if not exists public\.executive_office_tasks/);
  assert.match(sql, /for select to authenticated using \(public\.is_executive\(auth\.uid\(\)\)\)/);
  assert.match(sql, /status in \('pending', 'ongoing', 'completed'\)/);
  assert.match(sql, /can_manage_executive_task/);
});

test('executive dashboard links to the shared progress register', async () => {
  const dashboard = await read('src/pages/MemberDashboard.tsx');
  const app = await read('src/App.tsx');
  assert.match(dashboard, /Executive Work Register/);
  assert.match(app, /\/dashboard\/executive-progress/);
});
