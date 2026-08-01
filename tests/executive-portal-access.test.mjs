import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('dashboard loads the authenticated public profile and gates the executive portal', async () => {
  const dashboard = await read('src/pages/MemberDashboard.tsx');
  const access = await read('src/lib/executiveAccess.ts');
  assert.match(dashboard, /from\('Members'\)/);
  assert.match(dashboard, /eq\('auth_user_id', data\.session\.user\.id\)/);
  assert.match(dashboard, /member\.status\?\.toLowerCase\(\) === 'active'/);
  assert.match(dashboard, /isActiveExecutive\(profile\)/);
  assert.match(dashboard, /isExecutive && <section className="executive-portal"/);
  assert.match(dashboard, /Executive Portal/);
  assert.match(access, /profile\?\.is_active/);
  assert.match(access, /'member'/);
  assert.doesNotMatch(access, /role === 'admin'/);
});

test('Banna Bojang is an active IPRO without administrator elevation', async () => {
  const migration = await read('supabase/migrations/202607310049_banna_bojang_executive_access.sql');
  assert.match(migration, /lower\(trim\(full_name\)\) = 'banna bojang'/);
  assert.match(migration, /role = 'ipro'::public\.app_role/);
  assert.match(migration, /is_active = true/);
  assert.doesNotMatch(migration, /role = 'admin'/);
});

test('IPRO tools are linked and direct village access is database protected', async () => {
  const dashboard = await read('src/pages/MemberDashboard.tsx');
  const village = await read('src/pages/VillageModeration.tsx');
  const migration = await read('supabase/migrations/202607310049_banna_bojang_executive_access.sql');
  assert.match(dashboard, /dashboard\/communications\/manage/);
  assert.match(dashboard, /dashboard\/village\/moderation/);
  assert.match(village, /rpc\('can_moderate_village'\)/);
  assert.match(migration, /role in \('chairman', 'secretary_general', 'ipro', 'admin'\)/);
});
