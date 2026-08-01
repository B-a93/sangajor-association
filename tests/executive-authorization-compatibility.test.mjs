import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const migrationPath = 'supabase/migrations/202608010003_executive_authorization_compatibility.sql';

test('all dashboard RPCs authorize through active Members and executive_roles', async () => {
  const sql = await read(migrationPath);
  assert.match(sql, /from public\."Members" m\s+join public\.executive_roles er on er\.member_id = m\.id/);
  assert.match(sql, /m\.auth_user_id = user_id[\s\S]*m\.status[\s\S]*is_active/);
  for (const rpc of ['can_manage_members','can_manage_finances','can_manage_events','can_manage_announcements','can_manage_documents','can_manage_volunteers','can_view_executive_analytics','can_moderate_village','unread_announcement_count']) {
    assert.match(sql, new RegExp(`create or replace function public\\.${rpc}\\(`));
  }
  assert.doesNotMatch(sql, /public\.profiles/);
  assert.doesNotMatch(sql, /'admin'/);
});

test('office normalization and Banna verification preserve IPRO-only permissions', async () => {
  const sql = await read(migrationPath);
  assert.match(sql, /when 'assistant_public_relations_officer' then 'assistant_ipro'/);
  assert.match(sql, /where lower\(btrim\(coalesce\(m\.first_name,''\) \|\| ' ' \|\| coalesce\(m\.last_name,''\)\)\) = 'banna bojang'/);
  assert.match(sql, /can_manage_announcements\(m\.auth_user_id\)/);
  assert.match(sql, /can_moderate_village\(m\.auth_user_id\)/);
});

test('dashboard reads office assignments and isolates permission failures', async () => {
  const dashboard = await read('src/pages/MemberDashboard.tsx');
  assert.match(dashboard, /from\('executive_roles'\)[\s\S]*select\('office'\)[\s\S]*eq\('member_id', member\.id\)[\s\S]*eq\('is_active', true\)/);
  assert.doesNotMatch(dashboard, /membership_number, role, status/);
  assert.match(dashboard, /permissionChecks\.map/);
  assert.doesNotMatch(dashboard, /Executive authorization could not be resolved/);
});
