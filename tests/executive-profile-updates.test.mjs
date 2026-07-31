import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const executiveData = await readFile(new URL('../src/data/executives.ts', import.meta.url), 'utf8');
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('Mbaye Manga has the requested profile details without Facebook', () => {
  const profile = executiveData.match(/slug:'mbaye-manga'[\s\S]*?status:'complete'/)?.[0];

  assert.ok(profile, 'Mbaye Manga profile should exist');
  assert.match(profile, /motto:'Service before Pleasure'/);
  assert.match(profile, /skills:\[[^\]]*'Communication'/);
  assert.doesNotMatch(profile, /facebook:/);
});

test('executive portrait paths live in the typed executive data', async () => {
  const portraits = {
    'Omar Bah': '/omar Bah-chairman Jul 28, 2026, 11_28_29 AM.png',
    'Kaddy Bojang': '/Kaddy-Bojang-vice-chairlady-png.png',
    'Landing Bojang': '/landing-bojang sg24, 2026, 01_46_19 PM.png',
    'Lamin Bangura': '/Lamin-Bangura-Ass-SG Jul 27, 2026, 11_34_59 PM.png',
    'Mbaye Manga': '/mbaye-manga-Treasurer 28, 2026, 12_29_12 AM.png',
    'Bakary Bojang': '/Bakary-Bojang-ASS-Treasurer Jul 28, 2026, 12_20_02 PM.png',
    'Saidou Jallow': '/Saidou-Jallow-Auditor-general Jul 25, 2026, 09_43_31 PM.png',
    'Fatou Nyassi': '/Fatou-Nyassi-ASSI-auditor-general Jul 28, 2026, 12_27_07 PM.png',
    'Tida Bojang': '/Tida-Bojang-Assi-IPRO-crop.png',
    'Banna Bojang': '/Banna-Bojang-IPRO-png.png',
    'Demba Jammeh': '/DEMBA-Jammeh-programme- officerJul 28, 2026, 12_17_40 PM.png',
    'Bakary Colley': '/Bakary-colley-assi-programme officer.png',
    'Ismaila Manga': '/ismaila-manga-adviser Jul 28, 2026, 12_34_15 PM.png',
    'Yusupha Badjie': '/yusupha-badjie-adviser Jul 28, 2026, 12_15_22 AM.png',
  };

  for (const [name, image] of Object.entries(portraits)) {
    const slug = name.toLowerCase().replaceAll(' ', '-');
    const profile = executiveData.match(new RegExp(`slug:'${slug}'[\\s\\S]*?status:'complete'`))?.[0];

    assert.ok(profile, `${name} profile should exist`);
    assert.match(profile, new RegExp(`image:'${image.replaceAll('.', '\\.')}'`));
    await access(new URL(`../public${image}`, import.meta.url));
  }

  assert.doesNotMatch(index, /executive-portraits\.js/);
});

test('Mariama Sibo Bojang has a complete adviser profile', () => {
  const profile = executiveData.match(/slug:'mariama-sibo-bojang'[\s\S]*?status:'complete'/)?.[0];

  assert.ok(profile, 'Mariama Sibo Bojang profile should be complete');
  assert.match(profile, /role:'Adviser'/);
  assert.match(profile, /bio:/);
  assert.match(profile, /reason:/);
  assert.match(profile, /vision:/);
  assert.match(profile, /motto:/);
  assert.match(profile, /skills:/);
});
