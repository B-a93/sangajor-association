import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('group rooms and messages are restricted to active members', async () => {
  const migration = await read('supabase/migrations/202608140002_connection_group_chat.sql');
  assert.match(migration, /connection_group_rooms/);
  assert.match(migration, /connection_group_messages/);
  assert.match(migration, /public\.is_active_member\(\)/);
  assert.match(migration, /sender_id = auth\.uid\(\)/);
  assert.match(migration, /public\.can_moderate_village\(auth\.uid\(\)\)/);
  assert.match(migration, /General Members Room/);
});

test('voice notes use a private size-limited bucket and member-owned paths', async () => {
  const migration = await read('supabase/migrations/202608140002_connection_group_chat.sql');
  assert.match(migration, /'connection-voice-notes'/);
  assert.match(migration, /false,\s*5242880/);
  assert.match(migration, /array\['audio\/webm', 'audio\/ogg', 'audio\/mp4', 'audio\/mpeg', 'audio\/wav'\]/);
  assert.match(migration, /\(storage\.foldername\(name\)\)\[2\] = auth\.uid\(\)::text/);
  assert.match(migration, /voice_duration_seconds between 1 and 120/);
});

test('Connection Hub exposes group text chat and two-minute voice recording', async () => {
  const page = await read('src/pages/ConnectionHub.tsx');
  assert.match(page, /Group rooms/);
  assert.match(page, /connection_group_messages/);
  assert.match(page, /Record voice note/);
  assert.match(page, /getUserMedia/);
  assert.match(page, /MediaRecorder/);
  assert.match(page, /createSignedUrl\(message\.voice_path, 900\)/);
  assert.match(page, /next >= 120/);
});

test('browser codec parameters are normalized for the Supabase MIME allow-list', async () => {
  const page = await read('src/pages/ConnectionHub.tsx');
  assert.match(page, /function normalizeVoiceMimeType/);
  assert.match(page, /mimeType\.toLowerCase\(\)\.split\(';'\)\[0\]\.trim\(\)/);
  assert.match(page, /contentType: storageMimeType/);
  assert.doesNotMatch(page, /contentType: blob\.type/);
});
