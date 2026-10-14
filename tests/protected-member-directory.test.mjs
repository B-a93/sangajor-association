import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('member directory and profiles require an active internal member', async () => {
  const [directory, app, migration] = await Promise.all([
    read('src/pages/MemberDirectory.tsx'),
    read('src/App.tsx'),
    read('supabase/migrations/202607310051_members_source_of_truth.sql'),
  ]);

  assert.match(directory, /\.eq\('auth_user_id', currentSession\.user\.id\)/);
  assert.match(directory, /currentMember\?\.status\?\.toLowerCase\(\) !== 'active'/);
  assert.match(app, /\.eq\('auth_user_id', currentSession\.user\.id\)/);
  assert.match(migration, /create policy "Active members can view the member directory"/);
  assert.match(migration, /public\.is_active_member\(\).*status, ''\)\) = 'active'/s);
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
