import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('member administration is limited to senior authorized roles', async () => {
  const migration = await read('supabase/migrations/202607300023_executive_member_administration.sql');
  assert.match(migration, /role in \('chairman', 'secretary_general', 'admin'\)/);
  assert.match(migration, /if not public\.can_manage_members\(\)/);
  assert.match(migration, /You cannot deactivate your own account/);
});

test('administrative mutations are audited and unavailable as direct table writes', async () => {
  const migration = await read('supabase/migrations/202607300023_executive_member_administration.sql');
  assert.match(migration, /insert into public\.member_administration_log/);
  assert.match(migration, /revoke insert, update, delete on public\.member_administration_log/);
  assert.match(migration, /security definer set search_path = public/);
});

test('administration portal offers search, status filters and membership-number management', async () => {
  const page = await read('src/pages/MemberAdministration.tsx');
  assert.match(page, /can_manage_members/);
  assert.match(page, /update_member_registry/);
  assert.match(page, /Account status/);
  assert.match(page, /Membership number/);
});

test('membership-number and profile-photo changes are secured and audited', async () => {
  const migration = await read('supabase/migrations/202608080002_profile_photos_and_member_numbers.sql');
  assert.match(migration, /member-profile-photos/);
  assert.match(migration, /storage\.foldername\(name\)/);
  assert.match(migration, /create or replace function public\.update_member_registry/);
  assert.match(migration, /insert into public\.member_registry_log/);
  assert.match(migration, /public\.can_manage_members\(\)/);
});
