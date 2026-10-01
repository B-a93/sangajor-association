import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const courses = [
  'everyday-digital-technology-skills',
  'digital-income-online-work',
  'everyday-cooking-skills',
  'practical-baking-skills',
];

test('both public programme actions fire native link navigation to existing anonymous routes', async () => {
  const [app, page] = await Promise.all([read('src/App.tsx'), read('src/pages/PublicSkillExchange.tsx')]);
  assert.match(page, /href="#\/skill-exchange\/learn"[^>]*>[^<]*<BookOpen\/> Learn a Skill/);
  assert.match(page, /href="#\/skill-exchange\/teach"[^>]*>[^<]*<GraduationCap\/> Teach a Skill/);
  assert.match(app, /'\/skill-exchange\/learn': <PublicSkillExchange panel="learn"/);
  assert.match(app, /'\/skill-exchange\/teach': <PublicSkillExchange panel="teach"/);
  assert.doesNotMatch(page, /getSession|onAuthStateChange|window\.location\.hash\s*=\s*['"]\/login/);
});

test('every public course card changes URL to a route whose slug selects its registration form', async () => {
  const [app, page, data] = await Promise.all([
    read('src/App.tsx'),
    read('src/pages/PublicSkillExchange.tsx'),
    read('src/data/publicCourses.ts'),
  ]);
  assert.match(page, /href=\{`#\/skill-exchange\/courses\/\$\{course\.slug\}`\}/);
  assert.match(app, /publicCourseMatch = route\.match\(\/\^\\\/skill-exchange\\\/courses/);
  assert.match(app, /publicCourses\.find\(\(item\) => item\.slug === publicCourseMatch\[1\]\)/);
  assert.match(app, /<PublicSkillExchange panel="learn" courseSlug=\{course\.slug\}/);
  for (const slug of courses) assert.match(data, new RegExp(`slug: '${slug}'`));
});

test('Supabase failures always release busy states and Hostinger has an SPA refresh fallback', async () => {
  const [page, htaccess] = await Promise.all([read('src/pages/PublicSkillExchange.tsx'), read('public/.htaccess')]);
  assert.ok((page.match(/finally \{ setBusy\(false\); \}/g) ?? []).length >= 5);
  assert.match(page, /temporarily unavailable\. Please try again later\./);
  assert.match(htaccess, /RewriteCond %\{REQUEST_FILENAME\} !-f/);
  assert.match(htaccess, /RewriteRule \. \/index\.html \[L\]/);
});
