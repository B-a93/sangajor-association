import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('announcements enforce audience, lifecycle and communication officer access', async () => {
  const migration = await read('supabase/migrations/202607300029_communication_center.sql');
  assert.match(migration, /announcement_audience as enum \('all_members', 'executives'\)/);
  assert.match(migration, /'ipro', 'assistant_ipro', 'secretary_general', 'chairman', 'admin'/);
  assert.match(migration, /item\.audience = 'all_members' or role <> 'member'/);
  assert.match(migration, /set_announcement_status/);
});

test('read receipts can only be produced through the protected function', async () => {
  const migration = await read('supabase/migrations/202607300029_communication_center.sql');
  assert.match(migration, /not public\.can_view_announcement\(item\)/);
  assert.match(migration, /on conflict do nothing/);
  assert.match(migration, /revoke insert, update, delete on public\.announcement_reads/);
});

test('member and officer portals expose announcement and publishing workflows', async () => {
  const member = await read('src/pages/CommunicationCenter.tsx');
  const administration = await read('src/pages/CommunicationAdministration.tsx');
  assert.match(member, /mark_announcement_read/);
  assert.match(member, /Communication Centre/);
  assert.match(administration, /Communication Management/);
  assert.match(administration, /set_announcement_status/);
});
