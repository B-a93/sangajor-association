import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('assistant data is private, scoped and opt-in', async () => {
  const migration = await read('supabase/migrations/202607310047_ai_assistant_automation.sql');
  assert.match(migration, /enable row level security/g);
  assert.match(migration, /member_id=auth\.uid\(\)/);
  assert.match(migration, /user_id=auth\.uid\(\)/);
  assert.match(migration, /member_assistant_context/);
  assert.match(migration, /published context used to ground assistant answers/);
});

test('assistant function authenticates, grounds replies and limits input', async () => {
  const [fn, replies, config] = await Promise.all([
    read('supabase/functions/member-assistant/index.ts'),
    read('supabase/functions/_shared/assistant-replies.mjs'),
    read('supabase/config.toml'),
  ]);
  // The Edge gateway's legacy verifier rejects JWTs from asymmetric signing
  // keys. Requests must reach the function, which validates them with getUser.
  assert.match(config, /\[functions\.member-assistant\][\s\S]*?verify_jwt = false/);
  assert.match(fn, /client\.auth\.getUser\(\)/);
  assert.match(fn, /authenticationError \|\| !user/);
  assert.match(fn, /\.slice\(0, 500\)/);
  assert.match(fn, /member_assistant_context/);
  assert.match(fn, /assistant_messages/);
  assert.match(fn, /request\.method !== 'POST'/);
  assert.match(fn, /\.eq\('member_id', user\.id\)/);
  assert.match(fn, /replyWriteError/);
  assert.match(fn, /answerFromContext/);
  assert.match(replies, /reply\('help'/);
  assert.match(replies, /reply\('leadership'/);
  assert.doesNotMatch(fn, /SERVICE_ROLE/);
});

test('member portal exposes assistant chat and automation controls', async () => {
  const [page, app, dashboard] = await Promise.all([read('src/pages/SmartAssistant.tsx'), read('src/App.tsx'), read('src/pages/MemberDashboard.tsx')]);
  assert.match(page, /Private by design/);
  assert.match(page, /Smart automation/);
  assert.match(page, /Automations never publish, pay or RSVP/);
  assert.match(page, /no external AI service is used/);
  assert.match(page, /suggestedActions/);
  assert.match(page, /Authorization: `Bearer \$\{session\.access_token\}`/);
  assert.match(page, /response\?\.status === 401/);
  assert.match(app, /dashboard\/assistant/);
  assert.match(dashboard, /Ask Sanga/);
});
