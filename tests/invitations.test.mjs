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

test('invitations support email-only, phone-only, or both contacts', async () => {
  const [manage, migration] = await Promise.all([
    read('supabase/functions/manage-invitation/index.ts'),
    read('supabase/migrations/202608070002_repair_invitation_contacts_and_ownership.sql'),
  ]);
  assert.match(manage, /if \(!email && !phone\)/);
  assert.match(manage, /if \(email && !\/\^\\S\+@/);
  assert.match(manage, /if \(phone && !\/\^\\\+/);
  assert.match(manage, /email, phone,/);
  assert.match(migration, /invitations_contact_required/);
  assert.match(migration, /email is not null[\s\S]*or \(phone is not null/);
});

test('repair uses Members ownership and preserves legacy invitation history', async () => {
  const migration = await read('supabase/migrations/202608070002_repair_invitation_contacts_and_ownership.sql');
  assert.match(migration, /inviter_member_id uuid/);
  assert.match(migration, /references public\."Members"\(id\)/);
  assert.match(migration, /drop constraint if exists invitations_inviter_id_fkey/);
  assert.match(migration, /alter column inviter_id drop not null/);
  assert.doesNotMatch(migration, /delete from public\.invitations|drop column inviter_id/i);
  assert.match(migration, /accepted_user_id[\s\S]*Supabase Auth user identity/);
});

test('manager resolves authoritative member and returns a shareable URL without persisting raw token', async () => {
  const [manage, shared, migration] = await Promise.all([
    read('supabase/functions/manage-invitation/index.ts'),
    read('supabase/functions/_shared/invitations.ts'),
    read('supabase/migrations/202608070002_repair_invitation_contacts_and_ownership.sql'),
  ]);
  assert.match(shared, /from\('Members'\)\.select\('id, auth_user_id'\)/);
  assert.match(manage, /inviter_member_id: manager\.member\.id/);
  assert.match(manage, /invitation_url: invitationUrl/);
  assert.match(manage, /token_hash: tokenHash/);
  assert.doesNotMatch(manage, /token:\s*token[,}]/);
  assert.match(migration, /array|can_manage_invitations/);
});

test('phone-only acceptance uses supported phone Auth identity and never invents email', async () => {
  const acceptance = await read('supabase/functions/accept-invitation/index.ts');
  assert.match(acceptance, /phone: invitation\.phone, phone_confirm: true/);
  assert.match(acceptance, /signInWithPassword\(\{ \.\.\.loginIdentity, password \}\)/);
  assert.doesNotMatch(acceptance, /@.*phone|placeholder.*email|invent/i);
});

test('WhatsApp sharing launches wa.me with name and secure invitation URL', async () => {
  const page = await read('src/pages/MemberInvitations.tsx');
  assert.match(page, /https:\/\/wa\.me\/\$\{number\}\?text=/);
  assert.match(page, /Hello \$\{fullName\}/);
  assert.match(page, /\$\{invitationUrl\}/);
  assert.match(page, /Send via WhatsApp/);
  assert.match(page, /No automated WhatsApp delivery occurred/);
});

test('deployment keeps public signup closed and verifies historical token safety', async () => {
  const [config, docs, verification] = await Promise.all([
    read('supabase/config.toml'),
    read('docs/EXECUTIVE_INVITATION_CONTACTS_DEPLOYMENT.md'),
    read('supabase/verification/invitation_contacts_and_ownership.sql'),
  ]);
  assert.match(config, /enable_signup = false/);
  assert.match(docs, /run only[\s\S]*202608070002_repair_invitation_contacts_and_ownership\.sql/i);
  assert.match(docs, /manage-invitation.*accept-invitation/s);
  assert.match(verification, /historical_total/);
  assert.match(verification, /missing_token_hash/);
});

test('executive invitations use the complete office allow-list and persist assignments', async () => {
  const [page, manage, migration] = await Promise.all([
    read('src/lib/executiveInvitationRoles.ts'), read('supabase/functions/manage-invitation/index.ts'),
    read('supabase/migrations/202608070003_executive_member_invitations.sql'),
  ]);
  for (const office of ['chairman', 'vice_chairlady', 'assistant_auditor', 'adviser_4']) {
    assert.match(page, new RegExp(office));
    assert.match(manage, new RegExp(office));
    assert.match(migration, new RegExp(office));
  }
  assert.match(migration, /executive_office text/);
  assert.match(migration, /executive_position text/);
});

test('acceptance creates a member and activates an invited executive office', async () => {
  const acceptance = await read('supabase/functions/accept-invitation/index.ts');
  assert.match(acceptance, /from\('Members'\)\.insert\(memberValues\)/);
  assert.match(acceptance, /from\('executive_roles'\)\.insert/);
  assert.match(acceptance, /office: invitation\.executive_office/);
  assert.match(acceptance, /position: invitation\.executive_position/);
  assert.match(acceptance, /status: 'active'/);
  assert.match(acceptance, /eq\('status', 'pending'\)/);
});

test('invitation token query parameters do not turn the acceptance route into the homepage', async () => {
  const router = await read('src/hooks/useHashRoute.ts');
  const app = await read('src/App.tsx');
  assert.match(router, /hashPath\.split\('\?'\)\[0\]/);
  assert.match(app, /'\/accept-invitation': <InvitationAcceptance \/>/);
});

test('successful activation does not become an Edge Function error when automatic login fails', async () => {
  const acceptance = await read('supabase/functions/accept-invitation/index.ts');
  const page = await read('src/pages/InvitationAcceptance.tsx');
  assert.match(acceptance, /activated: true, requires_sign_in: true/);
  assert.doesNotMatch(acceptance, /Account activated\. Please sign in\.' }, 500/);
  assert.match(page, /data\?\.activated && data\?\.requires_sign_in/);
  assert.match(page, /Sign in with the email address or phone number used for your invitation/);
  assert.match(page, /href="#\/login"/);
});
