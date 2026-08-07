import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateAcceptance } from '../supabase/functions/_shared/invitation-policy.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('public registration is disabled without removing login or reset', async () => {
  const [authPage, config] = await Promise.all([read('src/pages/Auth.tsx'), read('supabase/config.toml')]);
  assert.doesNotMatch(authPage, /auth\.signUp/);
  assert.match(authPage, /signInWithPassword/);
  assert.match(authPage, /resetPasswordForEmail/);
  assert.match(config, /enable_signup = false/);
});

test('invitation acceptance validates every lifecycle state', () => {
  const now = new Date('2026-07-30T12:00:00Z');
  const pending = { status: 'pending', expires_at: '2026-08-06T12:00:00Z' };
  assert.equal(validateAcceptance({ invitation: pending, password: 'secure-pass', now }), null);
  assert.equal(validateAcceptance({ invitation: null, password: 'secure-pass', now }).status, 404);
  assert.equal(validateAcceptance({ invitation: pending, password: 'short', now }).status, 400);
  assert.equal(validateAcceptance({ invitation: { ...pending, status: 'accepted' }, password: 'secure-pass', now }).status, 409);
  assert.equal(validateAcceptance({ invitation: { ...pending, status: 'cancelled' }, password: 'secure-pass', now }).status, 410);
  const expired = validateAcceptance({ invitation: { ...pending, expires_at: '2026-07-29T12:00:00Z' }, password: 'secure-pass', now });
  assert.equal(expired.status, 410);
  assert.equal(expired.shouldExpire, true);
});

test('invitation management requires an executive and stores only a token digest', async () => {
  const [manage, shared, migration] = await Promise.all([
    read('supabase/functions/manage-invitation/index.ts'),
    read('supabase/functions/_shared/invitations.ts'),
    read('supabase/migrations/202607300021_member_invitations.sql'),
  ]);
  assert.match(manage, /invitationManagerFromRequest/);
  assert.match(manage, /token_hash: tokenHash/);
  assert.match(shared, /rpc\('can_manage_invitations'/);
  assert.doesNotMatch(shared, /Members'\).*role|member\.role|user_metadata/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke insert, update, delete/);
});


test('one authoritative invitation permission is used across database, UI, and Edge Function', async () => {
  const [migration, page, dashboard, shared] = await Promise.all([
    read('supabase/migrations/202608070001_repair_executive_invitation_access.sql'),
    read('src/pages/MemberInvitations.tsx'), read('src/pages/MemberDashboard.tsx'),
    read('supabase/functions/_shared/invitations.ts'),
  ]);
  assert.match(migration, /array\['chairman','secretary_general','ipro'\]/);
  assert.match(page, /rpc\('can_manage_invitations'\)/);
  assert.match(dashboard, /'can_manage_invitations'/);
  assert.match(shared, /rpc\('can_manage_invitations'/);
  assert.doesNotMatch(page, /rpc\('is_executive'\)/);
  assert.doesNotMatch(shared, /Members\.role|user_metadata|hard-coded/i);
});

test('executive bootstrap links only unique existing Auth identities without creating users', async () => {
  const migration = await read('supabase/migrations/202608070001_repair_executive_invitation_access.sql');
  assert.match(migration, /join public\.executive_roles/);
  assert.match(migration, /having count\(\*\) = 1/g);
  assert.match(migration, /where m\.auth_user_id is null/);
  assert.doesNotMatch(migration, /insert\s+into\s+auth\.users/i);
  assert.match(migration, /not exists \(select 1 from public\."Members" used/);
});

test('invitation access does not broaden unrelated executive permissions', async () => {
  const migration = await read('supabase/migrations/202608070001_repair_executive_invitation_access.sql');
  for (const rpc of ['can_manage_finances', 'can_manage_events', 'can_manage_documents', 'can_manage_members']) {
    assert.doesNotMatch(migration, new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${rpc}`, 'i'));
  }
});

test('acceptance hashes tokens, creates Auth account, guarded-links Members, and claims once', async () => {
  const acceptance = await read('supabase/functions/accept-invitation/index.ts');
  assert.match(acceptance, /const tokenHash = await sha256\(token\)/);
  assert.match(acceptance, /auth\.admin\.createUser/);
  assert.match(acceptance, /is\('auth_user_id', null\)/);
  assert.match(acceptance, /eq\('status', 'pending'\)/);
  assert.match(acceptance, /signInWithPassword/);
});
