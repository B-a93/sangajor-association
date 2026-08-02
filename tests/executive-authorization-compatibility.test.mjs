import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const migrationPath = 'supabase/migrations/202608010003_executive_authorization_compatibility.sql';

test('migration defines active-member authorization before anything calls it', async () => {
  const sql = await read(migrationPath);
  const definition = sql.indexOf('create or replace function public.is_active_member(');
  const unreadRpc = sql.indexOf('create or replace function public.unread_announcement_count(');

  assert.notEqual(definition, -1);
  assert.notEqual(unreadRpc, -1);
  assert.ok(definition < unreadRpc);
  assert.match(
    sql.slice(definition, sql.indexOf('create or replace function public.normalize_executive_office(')),
    /from public\."Members" m[\s\S]*m\.auth_user_id = user_id[\s\S]*m\.status/,
  );
});

test('notification RPC is unconditional and does not require communication tables', async () => {
  const sql = await read(migrationPath);
  assert.match(sql, /create or replace function public\.unread_announcement_count\(\)[\s\S]*language plpgsql/);
  assert.match(sql, /to_regclass\('public\.announcements'\) is null/);
  assert.match(sql, /grant execute on function public\.unread_announcement_count\(\) to authenticated/);
});

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
  assert.match(dashboard, /rpc\('active_executive_office'\)/);
  assert.doesNotMatch(dashboard, /membership_number, role, status/);
  assert.match(dashboard, /permissionChecks\.map/);
  assert.doesNotMatch(dashboard, /Some optional portal tools are temporarily unavailable/);
});

const repairMigrationPath = 'supabase/migrations/202608020001_repair_dashboard_authorization_rpcs.sql';
const dashboardRpcs = [
  'active_executive_office',
  'can_manage_members',
  'can_manage_finances',
  'can_manage_events',
  'can_manage_announcements',
  'can_manage_documents',
  'can_manage_volunteers',
  'can_view_executive_analytics',
  'can_moderate_village',
  'unread_announcement_count',
];

test('follow-up migration repairs databases where the original migration is already recorded', async () => {
  const sql = await read(repairMigrationPath);

  for (const rpc of dashboardRpcs) {
    assert.match(sql, new RegExp(`create or replace function public\\.${rpc}\\(`));
  }

  const activeDefinition = sql.indexOf('create or replace function public.active_executive_office(');
  assert.notEqual(activeDefinition, -1);
  assert.ok(activeDefinition < sql.indexOf('create or replace function public.office_has_permission('));
  assert.doesNotMatch(sql.slice(0, activeDefinition), /if[\s\S]*active_executive_office/);
});

test('repair always creates the notification RPC without requiring optional tables', async () => {
  const sql = await read(repairMigrationPath);
  const definition = sql.slice(
    sql.indexOf('create or replace function public.unread_announcement_count('),
    sql.indexOf('revoke all on function public.is_active_member('),
  );

  assert.match(definition, /language plpgsql/);
  assert.match(definition, /to_regclass\('public\.announcements'\) is null/);
  assert.match(definition, /execute \$query\$/);
  assert.doesNotMatch(definition, /create or replace function[\s\S]*if to_regclass/);
});

test('repair ends with information-schema verification for every dashboard RPC', async () => {
  const sql = await read(repairMigrationPath);
  const verification = sql.slice(sql.lastIndexOf('select routine_name'));

  assert.match(verification, /from information_schema\.routines/);
  assert.match(verification, /where routine_schema = 'public'/);
  for (const rpc of dashboardRpcs) assert.match(verification, new RegExp(`'${rpc}'`));
});


test('required RPC verification fails for any missing exact signature', async () => {
  for (const path of [migrationPath, repairMigrationPath]) {
    const sql = await read(path);
    assert.ok(sql.includes('do $required_dashboard_rpcs$'));
    assert.match(sql, /to_regprocedure\(signature\) is null/);
    assert.match(sql, /raise exception 'Executive authorization migration incomplete/);
    for (const rpc of dashboardRpcs) {
      const signature = rpc === 'unread_announcement_count' ? `${rpc}()` : `${rpc}(uuid)`;
      assert.ok(sql.includes(`public.${signature}`));
    }
  }
});
