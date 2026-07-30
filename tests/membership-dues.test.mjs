import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('dues records enforce valid amounts and finance role authorization', async () => {
  const migration = await read('supabase/migrations/202607300025_membership_dues_finance.sql');
  assert.match(migration, /amount numeric\(12,2\) not null check \(amount > 0\)/);
  assert.match(migration, /'treasurer', 'assistant_treasurer', 'auditor_general', 'chairman', 'admin'/);
  assert.match(migration, /if not public\.can_manage_finances\(\)/);
});

test('payments are immutable to clients and scoped through row level security', async () => {
  const migration = await read('supabase/migrations/202607300025_membership_dues_finance.sql');
  assert.match(migration, /Members can view their own dues payments/);
  assert.match(migration, /revoke insert, update, delete on public\.dues_payments/);
  assert.match(migration, /recorded_by uuid not null/);
});

test('member and finance portals expose dues status and receipt recording', async () => {
  const memberPage = await read('src/pages/MemberDues.tsx');
  const financePage = await read('src/pages/FinanceAdministration.tsx');
  assert.match(memberPage, /Contribution status/);
  assert.match(memberPage, /Payment history/);
  assert.match(financePage, /record_dues_payment/);
  assert.match(financePage, /Payment ledger/);
});
