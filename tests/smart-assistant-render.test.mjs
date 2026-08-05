import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pagePath = 'src/pages/SmartAssistant.tsx';
const readPage = () => readFile(new URL(`../${pagePath}`, import.meta.url), 'utf8');

function extractMessagesEffect(source) {
  const match = source.match(/useEffect\(\(\) => \{([\s\S]*?)\n  \}, \[messages\]\);/);
  assert.ok(match, 'messages scroll effect should use a block body');
  return match[1];
}

test('messages scroll effect tolerates scrollIntoView being undefined', async () => {
  const effect = extractMessagesEffect(await readPage());
  assert.match(effect, /typeof target\?\.scrollIntoView === 'function'/);
  assert.doesNotMatch(effect, /=>\s*endRef\.current\?\.scrollIntoView/);
});

test('messages scroll effect tolerates scrollIntoView not being a function', async () => {
  const effect = extractMessagesEffect(await readPage());
  assert.match(effect, /typeof target\?\.scrollIntoView === 'function'/);
  assert.doesNotMatch(effect, /return\s+target\.scrollIntoView/);
});

test('assistant messages render citations and suggested actions', async () => {
  const page = await readPage();
  assert.match(page, /Array\.isArray\(message\.citations\) && message\.citations\.length > 0/);
  assert.match(page, /message\.citations\.map\(\(citation\) => <a href=\{citation\.href\}/);
  assert.match(page, /Array\.isArray\(suggestedActions\) && suggestedActions\.length > 0/);
  assert.match(page, /suggestedActions\.map\(\(action\) => <button type="button" onClick=\{\(\) => void ask\(action\)\}/);
});
