import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('production repair authorizes only active Members linked to the Auth UID', async () => {
  const migration = await read('supabase/migrations/202607310051_members_source_of_truth.sql');
  assert.match(migration, /alter table public\."Members" add column if not exists auth_user_id uuid/);
  assert.match(migration, /unique index if not exists members_one_auth_account_idx/);
  assert.match(migration, /m\.auth_user_id = user_id[\s\S]*lower\(coalesce\(m\.status, ''\)\) = 'active'/);
  assert.match(migration, /create or replace function public\.is_executive/);
  assert.match(migration, /'ipro','assistant_ipro'/);
  assert.match(migration, /'banna bojang'/);
  assert.doesNotMatch(migration, /insert into public\."Members"/i);
});

test('invitation acceptance links an existing Member or creates exactly one record', async () => {
  const acceptance = await read('supabase/functions/accept-invitation/index.ts');
  assert.match(acceptance, /from\('Members'\)\.select\('id, auth_user_id, email, phone, membership_number'\)/);
  assert.match(acceptance, /if \(existingMember\?\.auth_user_id\)/);
  assert.match(acceptance, /\.update\(\{ auth_user_id: created\.user\.id/);
  assert.match(acceptance, /\.is\('auth_user_id', null\)/);
  assert.doesNotMatch(acceptance, /from\('profiles'\)/);
  assert.match(acceptance, /from\('Members'\)\.insert\(memberValues\)/);
});

test('normal members cannot pass executive role checks', async () => {
  const migration = await read('supabase/migrations/202607310051_members_source_of_truth.sql');
  const executiveFunction = migration.slice(migration.indexOf('create or replace function public.is_executive'), migration.indexOf('create or replace function public.can_manage_members'));
  assert.doesNotMatch(executiveFunction, /'member'/);
  assert.match(migration, /role, 'member'/);
});
