import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('member directory and profiles require an active internal member', async () => {
  const [directory, app, migration] = await Promise.all([
    read('src/pages/MemberDirectory.tsx'),
    read('src/App.tsx'),
    read('supabase/migrations/202610140001_repair_member_directory_access.sql'),
  ]);

  assert.match(directory, /rpc\('current_member_directory_access'\)/);
  assert.match(directory, /if \(authorizationError \|\| !hasDirectoryAccess\)/);
  assert.match(app, /rpc\('current_member_directory_access'\)/);
  assert.match(migration, /create or replace function public\.current_member_directory_access\(\)/);
  assert.match(migration, /lower\(trim\(m\.email\)\) = lower\(trim\(u\.email\)\)/);
  assert.match(migration, /trim\(lower\(coalesce\(m\.status, ''\)\)\) = 'active'/);
  assert.match(migration, /create policy "Active members can view the member directory"/);
});

test('directory uses portrait cards without publishing static member records', async () => {
  const [directory, styles] = await Promise.all([
    read('src/pages/MemberDirectory.tsx'),
    read('src/pages/MemberDirectory.css'),
  ]);

  assert.match(directory, /directory-member-portrait/);
  assert.match(directory, /Internal members only/);
  assert.match(directory, /\.from\('Members'\)/);
  assert.match(styles, /\.directory-member-portrait[\s\S]*height: 285px/);
  assert.match(styles, /object-position: center top/);
});
