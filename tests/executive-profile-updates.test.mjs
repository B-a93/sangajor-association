import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const executiveData = await readFile(new URL('../src/data/executives.ts', import.meta.url), 'utf8');
const homepage = await readFile(new URL('../src/pages/Home.tsx', import.meta.url), 'utf8');
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const footer = await readFile(new URL('../src/components/layout/Footer.tsx', import.meta.url), 'utf8');
const footerStyles = await readFile(new URL('../src/components/layout/Footer.css', import.meta.url), 'utf8');
const globalStyles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

test('Mbaye Manga has the requested profile details without Facebook', () => {
  const profile = executiveData.match(/slug:'mbaye-manga'[\s\S]*?status:'complete'/)?.[0];

  assert.ok(profile, 'Mbaye Manga profile should exist');
  assert.match(profile, /motto:'Service before Pleasure'/);
  assert.match(profile, /skills:\[[^\]]*'Communication'/);
  assert.doesNotMatch(profile, /facebook:/);
});

test('Tida and Banna use their cropped portraits from the executive data', async () => {
  const portraits = {
    'Tida Bojang': '/Tida-Bojang-Assi-IPRO-crop.png',
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

  assert.doesNotMatch(executiveData, /Banna-Bojang-IPRO-Full|Banna Bojang-IPRO|Tida-Bojang-ASS-IPRO/);
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
