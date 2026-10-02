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
  assert.match(app, /courseSlug=\{course\.slug\} key=\{course\.slug\}/);
  for (const slug of courses) assert.match(data, new RegExp(`slug: '${slug}'`));
});

test('learn, teach and every course navigation expose and focus the destination heading', async () => {
  const [page, styles] = await Promise.all([
    read('src/pages/PublicSkillExchange.tsx'),
    read('src/pages/PublicSkillExchange.css'),
  ]);

  // Both dedicated form routes use the same destination ref, so course routes receive
  // the learner-heading behavior as well as the selected course.
  assert.match(page, /const destinationHeading = useRef<HTMLHeadingElement>\(null\)/);
  assert.match(page, /destinationHeading\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(page, /destinationHeading\.current\?\.scrollIntoView\(\{ block: 'start', behavior: 'auto' \}\)/);
  assert.match(page, /\[courseSlug, displayPanel\]/);
  assert.match(page, /<h2 ref=\{destinationHeading\} tabIndex=\{-1\}>Join a Free Class<\/h2>/);
  assert.match(page, /<h2 ref=\{destinationHeading\} tabIndex=\{-1\}>Apply to Teach for Free<\/h2>/);
  assert.match(page, /if \(panel === 'learn'\) setLearner\(\(current\) => \(\{ \.\.\.current, course_slug: courseSlug \}\)\)/);

  // The fixed desktop/mobile header cannot cover a scrolled heading, and narrow
  // layouts retain the existing single-column form behavior.
  assert.match(styles, /scroll-margin-top:110px/);
  assert.match(styles, /@media\(max-width:620px\).*\.public-form-grid\{grid-template-columns:1fr\}/s);
});

test('form routes are dedicated views with a visible return path', async () => {
  const page = await read('src/pages/PublicSkillExchange.tsx');
  assert.match(page, /\{!displayPanel && <>/);
  assert.match(page, /\{displayPanel && <div className="public-form-route">/);
  assert.match(page, /href="#\/skill-exchange"><ArrowLeft\/> Back to Skill Exchange/);
});

test('Supabase failures always release busy states and Hostinger has an SPA refresh fallback', async () => {
  const [page, htaccess] = await Promise.all([read('src/pages/PublicSkillExchange.tsx'), read('public/.htaccess')]);
  assert.ok((page.match(/finally \{ setBusy\(false\); \}/g) ?? []).length >= 5);
  assert.match(page, /temporarily unavailable\. Please try again later\./);
  assert.match(htaccess, /RewriteCond %\{REQUEST_FILENAME\} !-f/);
  assert.match(htaccess, /RewriteRule \. \/index\.html \[L\]/);
});
