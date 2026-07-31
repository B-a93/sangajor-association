import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('village content is constrained and available only to active members', async () => {
  const migration = await read('supabase/migrations/202607310039_digital_village_foundation.sql');
  assert.match(migration, /char_length\(trim\(body\)\) between 1 and 2000/);
  assert.match(migration, /exists \(select 1 from public\.profiles where id = auth\.uid\(\) and is_active\)/);
  assert.match(migration, /author_id = auth\.uid\(\)/);
  assert.match(migration, /primary key \(post_id, member_id\)/);
});

test('member portal exposes the interactive Village Square', async () => {
  const page = await read('src/pages/VillageSquare.tsx');
  const app = await read('src/App.tsx');
  assert.match(page, /Village Square/);
  assert.match(page, /Publish update/);
  assert.match(page, /village_comments/);
  assert.match(app, /dashboard\/village/);
});
