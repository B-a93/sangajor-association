import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { normalizeAssistantReply, readAssistantError } from '../src/lib/assistantResponse.js';

test('missing suggestedActions is normalized to an empty array', () => {
  assert.deepEqual(normalizeAssistantReply({ answer: 'Hello' }).suggestedActions, []);
});

test('missing citations is normalized to an empty array', () => {
  assert.deepEqual(normalizeAssistantReply({ answer: 'Hello' }).citations, []);
});

test('malformed citations are discarded rather than reaching render callbacks', () => {
  assert.deepEqual(normalizeAssistantReply({ citations: { map: 'not a function', length: 1 } }).citations, []);
  assert.deepEqual(normalizeAssistantReply({ citations: [null, 'bad', { label: 4, href: [] }] }).citations, []);
});

test('unsafe citation links are discarded', () => {
  assert.deepEqual(normalizeAssistantReply({ citations: [{ label: 'Bad', href: 'javascript:alert(1)' }] }).citations, []);
});

test('missing answer is normalized to a safe string', () => {
  assert.equal(normalizeAssistantReply({ suggestedActions: 'bad' }).answer, '');
});

test('already-consumed Edge Function errors are handled without cloning', async () => {
  const response = new Response(JSON.stringify({ error: 'expired' }), { status: 401 });
  await response.text();
  response.clone = () => { throw new Error('clone must not be called'); };
  assert.equal(await readAssistantError(response), null);
});

test('service worker caches a clone while returning an unread response', async () => {
  const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
  const listeners = new Map();
  let cachedBody = '';
  const context = {
    URL,
    Promise,
    self: {
      location: { origin: 'https://example.test' },
      addEventListener: (name, callback) => listeners.set(name, callback),
      skipWaiting: () => Promise.resolve(),
      clients: { claim: () => Promise.resolve() },
    },
    caches: {
      match: async () => undefined,
      open: async () => ({ put: async (_key, response) => { cachedBody = await response.text(); }, addAll: async () => {} }),
      keys: async () => [],
      delete: async () => true,
    },
    fetch: async () => new Response('asset body', { status: 200 }),
  };
  vm.runInNewContext(source, context);
  let responsePromise;
  listeners.get('fetch')({
    request: { method: 'GET', url: 'https://example.test/app.js', mode: 'cors' },
    respondWith: (promise) => { responsePromise = promise; },
  });
  const response = await responsePromise;
  assert.equal(cachedBody, 'asset body');
  assert.equal(await response.text(), 'asset body');
  assert.match(source, /mysangajor-v5/);
});
