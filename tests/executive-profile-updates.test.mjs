import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const executiveData = await readFile(new URL('../src/data/executives.ts', import.meta.url), 'utf8');
const homepage = await readFile(new URL('../src/pages/Home.tsx', import.meta.url), 'utf8');
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const footer = await readFile(new URL('../src/components/layout/Footer.tsx', import.meta.url), 'utf8');
const footerStyles = await readFile(new URL('../src/components/layout/Footer.css', import.meta.url), 'utf8');
const globalStyles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
const leadership = await readFile(new URL('../src/pages/Leadership.tsx', import.meta.url), 'utf8');
const executiveProfile = await readFile(new URL('../src/pages/ExecutiveProfile.tsx', import.meta.url), 'utf8');
const serviceWorker = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const contact = await readFile(new URL('../src/pages/Contact.tsx', import.meta.url), 'utf8');
const siteConfig = await readFile(new URL('../src/config/site.ts', import.meta.url), 'utf8');

const repositoryRoot = new URL('..', import.meta.url);

async function collectTextFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') continue;

    const url = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
    if (entry.isDirectory()) files.push(...await collectTextFiles(url));
    else if (!entry.name.endsWith('.png') && !entry.name.endsWith('.jpeg')) files.push(url);
  }

  return files;
}

test('Mbaye Manga has the requested profile details without Facebook', () => {
  const profile = executiveData.match(/slug:'mbaye-manga'[\s\S]*?status:'complete'/)?.[0];

  assert.ok(profile, 'Mbaye Manga profile should exist');
  assert.match(profile, /motto:'Service before Pleasure'/);
  assert.match(profile, /skills:\[[^\]]*'Communication'/);
  assert.doesNotMatch(profile, /facebook:/);
});

test('Tida and Banna use their cropped portraits from the executive data', async () => {
  const portraits = {
    'Tida Bojang': '/tida-bojang-assistant-ipro-portrait-v2.png',
    'Banna Bojang': '/Banna-Bojang-IPRO-png.png',
  };

  for (const [name, image] of Object.entries(portraits)) {
    const slug = name.toLowerCase().replace(' ', '-');
    const profile = executiveData.match(new RegExp(`slug:'${slug}'[\\s\\S]*?status:'complete'`))?.[0];

    assert.ok(profile, `${name} profile should exist`);
    assert.match(profile, new RegExp(`image:'${image.replaceAll('.', '\\.')}'`));
    assert.match(homepage, new RegExp(`'${slug}'`));
    await access(new URL(`../public${image}`, import.meta.url));
  }

  assert.doesNotMatch(executiveData, /Banna-Bojang-IPRO-Full|Banna Bojang-IPRO/);
});

test('Tida portrait has no legacy reference and reaches every executive surface', async () => {
  const expectedPortrait = '/tida-bojang-assistant-ipro-portrait-v2.png';
  const legacyPortraits = [
    ['Tida-Bojang', 'ASS-IPRO Jul 28, 2026, 12_25_48 PM.png'].join('-'),
    ['Tida-Bojang', 'Assi-IPRO-crop.png'].join('-'),
  ];
  const tidaProfile = executiveData.match(/slug:'tida-bojang'[\s\S]*?status:'complete'/)?.[0];

  assert.ok(tidaProfile, 'Tida Bojang profile should exist');
  assert.match(tidaProfile, /image:'\/tida-bojang-assistant-ipro-portrait-v2\.png'/);
  await access(new URL(`../public${expectedPortrait}`, import.meta.url));

  assert.match(homepage, /homepageLeadershipSlugs[\s\S]*'tida-bojang'/);
  assert.match(homepage, /executive\.image \? <img src=\{executive\.image\}/);
  assert.match(leadership, /executive\.image \? <img src=\{executive\.image\}/);
  assert.match(executiveProfile, /executive\.image \? <img src=\{executive\.image\}/);

  for (const file of await collectTextFiles(repositoryRoot)) {
    const contents = await readFile(file, 'utf8');
    for (const legacyPortrait of legacyPortraits) {
      assert.doesNotMatch(contents, new RegExp(legacyPortrait.replaceAll('.', '\\.')), `legacy Tida portrait found in ${file.pathname}`);
    }
  }

  const publicEntries = await readdir(new URL('../public/', import.meta.url));
  for (const legacyPortrait of legacyPortraits) {
    assert.ok(!publicEntries.includes(legacyPortrait), 'legacy Tida portrait file should be removed');
  }
  assert.match(serviceWorker, /const CACHE = 'mysangajor-v3'/);
});

test('the homepage uses executive data without the legacy portrait override script', () => {
  assert.match(homepage, /import \{ executives \} from '\.\.\/data\/executives';/);
  assert.match(homepage, /executives\.filter\(/);
  assert.doesNotMatch(index, /executive-portraits\.js/);
});

test('Mariama Sibo Bojang has a complete profile and an available portrait', async () => {
  const profile = executiveData.match(/slug:'mariama-sibo-bojang'[\s\S]*?status:'complete'/)?.[0];

  assert.ok(profile, 'Mariama Sibo Bojang profile should be complete');
  assert.match(profile, /image:'\/mariama-sibo-bojang-adviser-png\.png'/);
  assert.match(profile, /bio:/);
  assert.match(profile, /reason:/);
  assert.match(profile, /vision:/);
  await access(new URL('../public/mariama-sibo-bojang-adviser-png.png', import.meta.url));
});

test('site footer styles are scoped and footer link groups are labelled', () => {
  assert.match(footer, /<footer className="site-footer">/);
  assert.match(footer, /<nav aria-label="Footer — Explore">/);
  assert.match(footer, /<nav aria-label="Footer — News and media">/);
  assert.match(footerStyles, /\.site-footer\s*\{/);
  assert.doesNotMatch(globalStyles, /^footer\s*\{/m);
});

test('the official email is shared by contact surfaces and no sample address remains', async () => {
  const officialEmail = 'info@sangajorbcs8.org';

  assert.match(siteConfig, new RegExp(officialEmail.replace('.', '\\.')));
  assert.match(footer, /associationEmail/);
  assert.match(contact, /associationEmail/);
  assert.match(index, new RegExp(`mailto:${officialEmail.replace('.', '\\.')}`));

  for (const file of await collectTextFiles(repositoryRoot)) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, /[\w.+-]+@(?:example\.com|[\w.-]*\.example)\b/i, `sample email found in ${file.pathname}`);
    assert.doesNotMatch(contents, new RegExp(['info', 'sangajor08\\.org'].join('@'), 'i'), `previous association email found in ${file.pathname}`);
  }
});
