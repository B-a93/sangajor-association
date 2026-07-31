import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('committee roster enforces unique assignments and leadership', async () => {
  const migration = await read('supabase/migrations/202607310035_committees_volunteers.sql');
  assert.match(migration, /unique \(committee_id, member_id\)/);
  assert.match(migration, /one_committee_chair/);
  assert.match(migration, /can_manage_volunteers/);
});

test('volunteer workflow protects capacity and service hours', async () => {
  const migration = await read('supabase/migrations/202607310035_committees_volunteers.sql');
  assert.match(migration, /apply_to_volunteer/);
  assert.match(migration, /approved_count >= target\.capacity/);
  assert.match(migration, /record_volunteer_hours/);
  assert.match(migration, /hours_served >= 0/);
});

test('member and officer volunteer workflows are routed', async () => {
  const app = await read('src/App.tsx');
  const member = await read('src/pages/CommitteesVolunteering.tsx');
  const admin = await read('src/pages/VolunteerAdministration.tsx');
  assert.match(app, /dashboard\/volunteering/);
  assert.match(member, /Volunteer now/);
  assert.match(admin, /Committee &amp; Volunteer Management/);
  assert.match(admin, /review_volunteer_application/);
});
