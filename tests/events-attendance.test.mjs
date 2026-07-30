import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('event schedules validate dates, capacity and authorized management roles', async () => {
  const migration = await read('supabase/migrations/202607300027_events_attendance.sql');
  assert.match(migration, /check \(ends_at > starts_at\)/);
  assert.match(migration, /capacity integer check \(capacity is null or capacity > 0\)/);
  assert.match(migration, /'programme_officer', 'assistant_programme_officer', 'secretary_general', 'chairman', 'admin'/);
});

test('RSVP capacity is serialized and attendance writes use protected functions', async () => {
  const migration = await read('supabase/migrations/202607300027_events_attendance.sql');
  assert.match(migration, /where id = target_event_id for update/);
  assert.match(migration, /This event has reached capacity/);
  assert.match(migration, /revoke insert, update, delete on public\.event_attendance/);
  assert.match(migration, /if not public\.can_manage_events\(\)/);
});

test('member and executive portals expose RSVP, publishing and check-in workflows', async () => {
  const member = await read('src/pages/MemberEvents.tsx');
  const administration = await read('src/pages/EventAdministration.tsx');
  assert.match(member, /respond_to_event/);
  assert.match(member, /Events & Attendance/);
  assert.match(administration, /Event Management/);
  assert.match(administration, /set_event_check_in/);
});
