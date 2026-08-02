import assert from 'node:assert/strict';
import test from 'node:test';
import { answerFromContext } from '../supabase/functions/_shared/assistant-replies.mjs';

const assertReplyShape = (reply) => {
  assert.equal(typeof reply.answer, 'string');
  assert.ok(Array.isArray(reply.citations));
  assert.ok(Array.isArray(reply.suggestedActions));
};

test('answers the chairman question with Omar Bah and a safe Leadership link', () => {
  const reply = answerFromContext('Who is the chairman?');
  assertReplyShape(reply);
  assert.equal(reply.intent, 'leadership');
  assert.match(reply.answer, /Omar Bah — Chairman/);
  assert.deepEqual(reply.citations, [{ label: 'Leadership', href: '#/leadership' }]);
});

test('answers the Secretary General question', () => {
  const reply = answerFromContext('Who is the Secretary General?');
  assertReplyShape(reply);
  assert.match(reply.answer, /Landing Bojang — Secretary General/);
});

test('answers the IPRO question', () => {
  const reply = answerFromContext('Who is the IPRO?');
  assertReplyShape(reply);
  assert.match(reply.answer, /Banna Bojang — Information & Public Relations Officer \(IPRO\)/);
});

test('unsupported questions return a complete help reply', () => {
  const reply = answerFromContext('Can you predict tomorrow?');
  assertReplyShape(reply);
  assert.equal(reply.intent, 'help');
  assert.match(reply.answer, /Association leadership/);
});
