import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('mobile member access is first and remains reachable on short screens', async () => {
  const [header, styles] = await Promise.all([
    read('src/components/layout/Header.tsx'),
    read('src/styles.css'),
  ]);

  const memberLink = header.indexOf('className="mobile-member-link"');
  const publicLinks = header.indexOf('navItems.map', memberLink);

  assert.ok(memberLink > -1, 'mobile member link is missing');
  assert.ok(publicLinks > memberLink, 'mobile member access must appear before public links');
  assert.match(header, /signedIn \? 'Member Dashboard' : 'Member Login'/);
  assert.match(styles, /\.mobile-nav \{[^}]*position: absolute;[^}]*max-height: calc\(100dvh - 82px\);[^}]*overflow-y: auto;/);
  assert.match(styles, /\.mobile-nav \{ top: 72px; max-height: calc\(100dvh - 72px\); \}/);
  assert.match(styles, /safe-area-inset-bottom/);
});
