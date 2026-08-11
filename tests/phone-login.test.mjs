import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('member login accepts either email or an international phone number', async () => {
  const auth = await read('src/pages/Auth.tsx');

  assert.match(auth, /value\.includes\('@'\)/);
  assert.match(auth, /\^\\\+\[1-9\]\\d\{7,14\}\$/);
  assert.match(auth, /signInWithPassword\(\{ \.\.\.identity, password \}\)/);
  assert.match(auth, /Email address or phone number/);
  assert.match(auth, /\+2203145237/);
});

test('phone-only password recovery gives an actionable message until SMS is configured', async () => {
  const auth = await read('src/pages/Auth.tsx');

  assert.match(auth, /Phone password recovery requires SMS service/);
  assert.match(auth, /resetPasswordForEmail/);
  assert.doesNotMatch(auth, /signInWithOtp/);
});
