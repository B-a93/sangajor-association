import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('linked Members are projected into legacy feature identities', async () => {
  const migration = await read('supabase/migrations/202608080001_restore_member_feature_identity.sql');
  assert.match(migration, /create or replace function public\.sync_member_feature_identity/);
  assert.match(migration, /after insert or update of auth_user_id/);
  assert.match(migration, /from public\."Members" m where m\.auth_user_id is not null/);
  assert.match(migration, /on conflict \(id\) do update/);
  assert.match(migration, /lower\(coalesce\(m\.status, ''\)\) = 'active'/);
});

test('signed-in navigation returns members to their dashboard', async () => {
  const header = await read('src/components/layout/Header.tsx');
  assert.match(header, /supabase\.auth\.onAuthStateChange/);
  assert.match(header, /signedIn \? '#\/dashboard' : '#\/login'/);
  assert.match(header, /Member Dashboard/);
});

test('authenticated route headings clear the fixed header', async () => {
  const styles = await read('src/styles.css');
  for (const selector of ['member-dashboard', 'member-profile-page', 'connection-page', 'village-page', 'communication-page']) {
    assert.match(styles, new RegExp(`\\.${selector} \\{ padding-top:`));
  }
});
