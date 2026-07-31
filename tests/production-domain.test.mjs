import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const productionSources = ['index.html', '.env.example', 'src', 'public', 'supabase'];
const ignoredExtensions = /\.(?:jpe?g|png|webp|gif|ico)$/i;
const temporaryDomain = /(?:hostinger|hostingersite|builder-preview|preview-domain|temporary-domain|your-production-domain)/i;

async function sourceFiles(relativePath) {
  const url = new URL(relativePath, root);
  const entries = await readdir(url, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const child = `${relativePath.replace(/\/$/, '')}/${entry.name}`;
    return entry.isDirectory() ? sourceFiles(`${child}/`) : ignoredExtensions.test(entry.name) ? [] : [child];
  }));
  return files.flat();
}

test('production-facing source contains no temporary Hostinger or placeholder domain', async () => {
  const files = (await Promise.all(productionSources.map(async (source) => {
    if (source.includes('.')) return [source];
    return sourceFiles(`${source}/`);
  }))).flat();

  const offenders = [];
  for (const file of files) {
    const contents = await readFile(new URL(file, root), 'utf8');
    if (temporaryDomain.test(contents)) offenders.push(file);
  }
  assert.deepEqual(offenders, []);
});

test('canonical production domain is wired through discovery and application configuration', async () => {
  const [html, robots, sitemap, manifest, siteConfig, invitations, environment] = await Promise.all([
    readFile(new URL('index.html', root), 'utf8'),
    readFile(new URL('public/robots.txt', root), 'utf8'),
    readFile(new URL('public/sitemap.xml', root), 'utf8'),
    readFile(new URL('public/manifest.webmanifest', root), 'utf8'),
    readFile(new URL('src/config/site.ts', root), 'utf8'),
    readFile(new URL('supabase/functions/manage-invitation/index.ts', root), 'utf8'),
    readFile(new URL('.env.example', root), 'utf8'),
  ]);

  for (const contents of [html, robots, sitemap, manifest, siteConfig, invitations, environment]) {
    assert.match(contents, /https:\/\/sangajorbcs8\.org/);
  }
  assert.match(html, /rel="canonical"/);
  assert.match(html, /property="og:url"/);
  assert.match(html, /"url":"https:\/\/sangajorbcs8\.org\/"/);
});
