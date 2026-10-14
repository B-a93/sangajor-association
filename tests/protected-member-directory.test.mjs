import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('member directory and profiles require an invitation-only authenticated session', async () => {
  const [directory, app, migration] = await Promise.all([
    read('src/pages/MemberDirectory.tsx'),
    read('src/App.tsx'),
    read('supabase/migrations/202610140002_authenticated_directory_access.sql'),
  ]);

  assert.match(directory, /supabase\.auth\.getSession\(\)/);
  assert.match(directory, /window\.location\.hash = '\/login'/);
  assert.doesNotMatch(directory, /current_member_directory_access/);
  assert.doesNotMatch(app, /current_member_directory_access/);
  assert.match(migration, /create policy "Active members can view the member directory"/);
  assert.match(migration, /for select to authenticated/);
  assert.match(migration, /trim\(lower\(coalesce\(status, ''\)\)\) = 'active'/);
});

test('directory uses portrait cards without publishing static member records', async () => {
  const [directory, styles] = await Promise.all([
    read('src/pages/MemberDirectory.tsx'),
    read('src/pages/MemberDirectory.css'),
  ]);

  assert.match(directory, /directory-member-portrait/);
  assert.doesNotMatch(directory, /Internal members only/);
  assert.match(directory, /\.from\('Members'\)/);
  assert.doesNotMatch(directory, /\.eq\('status', 'active'\)/);
  assert.match(styles, /\.directory-member-portrait[\s\S]*height: 285px/);
  assert.match(styles, /object-position: center top/);
});
