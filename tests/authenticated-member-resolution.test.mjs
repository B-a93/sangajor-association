import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('production auth identities resolve through the authoritative Members row', async () => {
  const migration = await read('supabase/migrations/202608010001_authenticated_member_resolution.sql');
  assert.match(migration, /from auth\.users/);
  assert.match(migration, /having count\(\*\) = 1/g);
  assert.match(migration, /set auth_user_id = a\.auth_user_id/);
  assert.match(migration, /linked\.auth_user_id = a\.auth_user_id/);
  assert.match(migration, /public\."Members" m[\s\S]*m\.auth_user_id=auth\.uid\(\)/);
  assert.doesNotMatch(migration, /where exists\(select 1 from public\.profiles/);
});

test('assistant ownership follows Auth rather than the retired profiles table', async () => {
  const migration = await read('supabase/migrations/202608010001_authenticated_member_resolution.sql');
  assert.match(migration, /assistant_conversations_member_id_fkey[\s\S]*references auth\.users\(id\)/);
  assert.match(migration, /assistant_messages_member_id_fkey[\s\S]*references auth\.users\(id\)/);
  assert.match(migration, /assistant_automation_preferences_user_id_fkey[\s\S]*references auth\.users\(id\)/);
});

test('development surfaces the query and Edge Function failure details', async () => {
  const [helper, dashboard, assistant, fn] = await Promise.all([
    read('src/lib/errorMessage.ts'), read('src/pages/MemberDashboard.tsx'),
    read('src/pages/SmartAssistant.tsx'), read('supabase/functions/member-assistant/index.ts'),
  ]);
  assert.match(helper, /import\.meta\.env\.DEV/);
  assert.match(dashboard, /No Members row is linked to Authentication user/);
  assert.match(dashboard, /authorizationWarnings/);
  assert.match(assistant, /payload\.details/);
  assert.match(fn, /problem\('Member context unavailable', 403, contextError/);
  assert.match(fn, /ENVIRONMENT'\) !== 'production'/);
});
