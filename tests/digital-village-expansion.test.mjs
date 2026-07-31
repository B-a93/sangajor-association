import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('expanded village supports categories, safe images, saves and reports', async () => {
  const migration = await read('supabase/migrations/202607310041_digital_village_expansion.sql');
  assert.match(migration, /category in \('update', 'celebration', 'opportunity', 'memory'\)/);
  assert.match(migration, /primary key \(post_id, member_id\)/);
  assert.match(migration, /unique \(post_id, reporter_id\)/);
  assert.match(migration, /file_size_limit/);
  assert.match(migration, /'village-media', 'village-media', false/);
  assert.match(migration, /storage\.foldername\(name\)/);
});

test('Village Square offers discovery and personal post controls', async () => {
  const page = await read('src/pages/VillageSquare.tsx');
  assert.match(page, /Search the village/);
  assert.match(page, /village_bookmarks/);
  assert.match(page, /village_reports/);
  assert.match(page, /Add photo/);
  assert.match(page, /Delete this post and its comments/);
});
