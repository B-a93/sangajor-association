import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('public contact page provides a persistent enquiry form and email fallback', async () => {
  const [contact, styles, migration] = await Promise.all([
    read('src/pages/Contact.tsx'),
    read('src/pages/Contact.css'),
    read('supabase/migrations/202608200001_public_contact_enquiries.sql'),
  ]);

  assert.match(contact, /supabase\.from\('contact_messages'\)\.insert/);
  assert.match(contact, /href=\{\`mailto:\$\{associationEmail\}\`\}/);
  assert.match(contact, /navigator\.clipboard\.writeText\(associationEmail\)/);
  assert.match(contact, /Please provide either an email address or phone number/);
  assert.match(styles, /\.contact-form-layout/);
  assert.match(styles, /@media \(max-width: 700px\)/);

  assert.match(migration, /alter table public\.contact_messages enable row level security/);
  assert.match(migration, /for insert\s+to anon, authenticated/);
  assert.match(migration, /revoke all on public\.contact_messages from anon, authenticated/);
  assert.doesNotMatch(migration, /grant select[\s\S]*to anon/);
});

test('public Association copy matches the logo and founding story', async () => {
  const [footer, about, membership, site] = await Promise.all([
    read('src/components/layout/Footer.tsx'),
    read('src/pages/About.tsx'),
    read('src/pages/Membership.tsx'),
    read('src/data/site.ts'),
  ]);

  assert.match(footer, /Together for a Better Future\./);
  assert.match(about, /Build a strong institution from the ground up for future generations\./);
  assert.doesNotMatch(about, /institution than the one we inherited/);
  assert.match(membership, /access to friendships, opportunities/);
  assert.match(site, /personal and professional connections/);
});
