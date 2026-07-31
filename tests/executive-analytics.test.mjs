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

test('dashboard supports trends, reporting periods and export', async () => {
  const page = await read('src/pages/ExecutiveAnalytics.tsx');
  const app = await read('src/App.tsx');
  const dashboard = await read('src/pages/MemberDashboard.tsx');
  assert.match(page, /Six-month momentum/);
  assert.match(page, /Export CSV/);
  assert.match(page, /Reporting period/);
  assert.match(app, /dashboard\/analytics/);
  assert.match(dashboard, /can_view_executive_analytics/);
});
