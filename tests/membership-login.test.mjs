import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('member login accepts email or an automatically assigned membership number', async () => {
  const [auth, login, migration, config] = await Promise.all([
    read('src/pages/Auth.tsx'),
    read('supabase/functions/member-login/index.ts'),
    read('supabase/migrations/202608150005_automatic_membership_numbers.sql'),
    read('supabase/config.toml'),
  ]);
  assert.match(auth, /Email address or membership number/);
  assert.match(auth, /SBC-2026-00010/);
  assert.match(auth, /functions\.invoke\('member-login'/);
  assert.match(login, /membershipNumberPattern/);
  assert.match(login, /The login details are incorrect\./);
  assert.match(login, /signInWithPassword\(\{ email, password \}\)/);
  assert.match(migration, /members_assign_membership_number/);
  assert.match(migration, /highest_existing \+ 1/);
  assert.match(config, /\[functions\.member-login\][\s\S]*verify_jwt = false/);
});

test('accepted phone-only accounts can be converted without deleting member data', async () => {
  const [manage, page] = await Promise.all([
    read('supabase/functions/manage-invitation/index.ts'),
    read('src/pages/MemberInvitations.tsx'),
  ]);
  assert.match(manage, /convert-membership-login/);
  assert.match(manage, /updateUserById\(invitation\.accepted_user_id/);
  assert.doesNotMatch(manage, /convert-membership-login[\s\S]{0,1200}deleteUser/);
  assert.match(page, /Enable Membership Login/);
});

test('activation returns and displays the generated membership number', async () => {
  const [acceptance, page] = await Promise.all([
    read('supabase/functions/accept-invitation/index.ts'),
    read('src/pages/InvitationAcceptance.tsx'),
  ]);
  assert.match(acceptance, /membership_number: member\.membership_number/);
  assert.match(page, /Your membership number:/);
  assert.match(page, /Save this number/);
});
