import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('members can validate, upload and save a profile photograph', async () => {
  const page = await read('src/pages/EditMemberProfile.tsx');
  assert.match(page, /member-profile-photos/);
  assert.match(page, /image\/jpeg/);
  assert.match(page, /5 \* 1024 \* 1024/);
  assert.match(page, /profile_photo: profilePhoto/);
  assert.match(page, /Upload a clear photograph/);
});
