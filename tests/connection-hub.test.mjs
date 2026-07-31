import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('connections require consent and prevent duplicate member pairs', async () => {
  const migration = await read('supabase/migrations/202607310037_connection_hub.sql');
  assert.match(migration, /check \(requester_id <> recipient_id\)/);
  assert.match(migration, /least\(requester_id, recipient_id\), greatest\(requester_id, recipient_id\)/);
  assert.match(migration, /recipient_id = auth\.uid\(\) and status = 'pending'/);
});

test('messages are private to accepted connection participants', async () => {
  const migration = await read('supabase/migrations/202607310037_connection_hub.sql');
  assert.match(migration, /c\.status = 'accepted' and auth\.uid\(\) in \(c\.requester_id, c\.recipient_id\)/);
  assert.match(migration, /char_length\(trim\(body\)\) between 1 and 2000/);
  assert.match(migration, /mark_connection_messages_read/);
});

test('member portal exposes discovery, requests, connections and messaging', async () => {
  const page = await read('src/pages/ConnectionHub.tsx');
  const app = await read('src/App.tsx');
  assert.match(page, /SANGAJOR Connection Hub/);
  assert.match(page, /Connection requests/);
  assert.match(page, /Private conversation/);
  assert.match(app, /\/dashboard\/connections/);
});
