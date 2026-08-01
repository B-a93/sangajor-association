import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = 'supabase/migrations/202608010002_production_assistant_compatibility.sql';
const readMigration = () => readFile(new URL(`../${migrationPath}`, import.meta.url), 'utf8');

test('production assistant compatibility uses Members and never profiles', async () => {
  const sql = await readMigration();
  assert.match(sql, /public\."Members"/);
  assert.match(sql, /m\.auth_user_id = auth\.uid\(\)/);
  assert.doesNotMatch(sql, /public\.profiles/i);
  assert.doesNotMatch(sql, /create table(?: if not exists)? public\."Members"/i);
});

test('migration is idempotent and gives assistant rows Auth ownership', async () => {
  const sql = await readMigration();
  assert.equal((sql.match(/create table if not exists public\.assistant_/g) ?? []).length, 3);
  assert.match(sql, /references auth\.users\(id\) on delete cascade/);
  assert.match(sql, /create index if not exists assistant_conversations_member_idx/);
  assert.match(sql, /drop policy if exists "Members own assistant conversations"/);
  assert.match(sql, /enable row level security/g);
  assert.match(sql, /grant select, insert, update, delete[\s\S]*to authenticated/);
});

test('migration links only unique emails and includes production verification', async () => {
  const sql = await readMigration();
  assert.equal((sql.match(/having count\(\*\) = 1/g) ?? []).length, 2);
  assert.match(sql, /m\.auth_user_id is null/);
  assert.match(sql, /linked\.auth_user_id = a\.auth_user_id/);
  assert.match(sql, /banna bojang/);
  assert.match(sql, /public\.executive_roles/);
  assert.match(sql, /public\.member_assistant_context\(\) as assistant_context/);
});
