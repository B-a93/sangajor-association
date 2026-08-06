import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('executive analytics are aggregated and role protected', async () => {
  const migration = await read('supabase/migrations/202607310045_executive_analytics.sql');
  assert.match(migration, /can_view_executive_analytics/);
  assert.match(migration, /Not authorised to view executive analytics/);
  assert.match(migration, /Aggregated, executive-only organisational health metrics/);
  assert.match(migration, /least\(greatest\(range_days, 7\), 365\)/);
});

test('production repair exposes the exact zero-argument, authenticated-only RPC', async () => {
  const migration = await read('supabase/migrations/202608060001_repair_executive_analytics_rpc.sql');
  assert.match(migration, /drop function if exists public\.executive_analytics\(integer\)/);
  assert.match(migration, /create or replace function public\.executive_analytics\(\)/);
  assert.match(migration, /can_view_executive_analytics\(auth\.uid\(\)\)/);
  assert.match(migration, /raise exception 'Not authorised to view executive analytics' using errcode = '42501'/);
  assert.match(migration, /revoke all on function public\.executive_analytics\(\) from public/);
  assert.match(migration, /revoke all on function public\.executive_analytics\(\) from anon/);
  assert.match(migration, /grant execute on function public\.executive_analytics\(\) to authenticated/);
  assert.doesNotMatch(migration, /public\.profiles/);
  assert.match(migration, /public\."Members"/);
});

test('executives pass the authoritative gate while ordinary members remain blocked', async () => {
  const authorization = await read('supabase/migrations/202608020001_repair_dashboard_authorization_rpcs.sql');
  assert.match(authorization, /create or replace function public\.can_view_executive_analytics\(user_id uuid default auth\.uid\(\)\)[\s\S]*?office_has_permission\(user_id,array\['chairman','vice_chairperson','secretary_general','treasurer','auditor_general'\]\)/);
  assert.match(authorization, /join public\.executive_roles er on er\.member_id = m\.id[\s\S]*?m\.auth_user_id = user_id[\s\S]*?m\.status/);
  assert.doesNotMatch(authorization, /can_view_executive_analytics[\s\S]*?array\[[^\]]*'member'/);
});

test('production RPC response contract matches every frontend field and is empty-safe', async () => {
  const migration = await read('supabase/migrations/202608060001_repair_executive_analytics_rpc.sql');
  const analyticsType = await read('src/types/analytics.ts');
  for (const key of ['generatedAt', 'rangeDays', 'members', 'total', 'new', 'finance', 'collected', 'payments', 'engagement', 'eventResponses', 'villagePosts', 'volunteerApplications', 'announcementReads', 'monthlyActivity', 'month']) {
    assert.match(migration, new RegExp(`'${key}'`), `migration must return ${key}`);
    assert.match(analyticsType, new RegExp(`\\b${key}\\b`), `frontend contract must consume ${key}`);
  }
  assert.match(migration, /coalesce\(\(select sum\(d\.amount\)[\s\S]*?\), 0\)/);
  assert.match(migration, /coalesce\(\([\s\S]*?jsonb_agg[\s\S]*?\), '\[\]'::jsonb\)/);
});

test('portal invokes the discoverable zero-argument overload', async () => {
  const page = await read('src/pages/ExecutiveAnalytics.tsx');
  assert.match(page, /supabase\.rpc\('executive_analytics'\)/);
  assert.doesNotMatch(page, /range_days/);
});

test('verification SQL checks PostgREST-visible zero-argument signature', async () => {
  const verification = await read('supabase/verification/executive_analytics.sql');
  assert.match(verification, /select to_regprocedure\('public\.executive_analytics\(\)'\);/);
});

test('dashboard supports trends, reporting periods and export', async () => {
  const page = await read('src/pages/ExecutiveAnalytics.tsx');
  const app = await read('src/App.tsx');
  const dashboard = await read('src/pages/MemberDashboard.tsx');
  assert.match(page, /Six-month momentum/);
  assert.match(page, /Export CSV/);
  assert.match(page, /Last \{data\.rangeDays\} days/);
  assert.match(app, /dashboard\/analytics/);
  assert.match(dashboard, /can_view_executive_analytics/);
});
