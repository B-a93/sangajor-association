import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('public contact page provides a persistent enquiry form and reliable email options', async () => {
  const [contact, styles, migration, emailActions, footer, inbox] = await Promise.all([
    read('src/pages/Contact.tsx'),
    read('src/pages/Contact.css'),
    read('supabase/migrations/202608200001_public_contact_enquiries.sql'),
    read('src/components/ui/EmailActions.tsx'),
    read('src/components/layout/Footer.tsx'),
    read('src/pages/ContactEnquiries.tsx'),
  ]);

  assert.match(contact, /supabase\.from\('contact_messages'\)\.insert/);
  assert.match(contact, /<EmailActions[\s\S]*email=\{associationEmail\}/);
  assert.match(emailActions, /https:\/\/mail\.google\.com\/mail\/\?view=cm&fs=1/);
  assert.match(emailActions, /https:\/\/outlook\.office\.com\/mail\/deeplink\/compose/);
  assert.match(emailActions, /navigator\.clipboard\.writeText\(email\)/);
  assert.match(emailActions, /href=\{\`mailto:\$\{email\}/);
  assert.match(footer, /<EmailActions[\s\S]*email=\{associationEmail\}/);
  assert.match(inbox, /<EmailActions[\s\S]*email=\{enquiry\.email\}/);
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

test('contact enquiries are limited to IPRO and Secretariat offices', async () => {
  const [migration, inbox, app, dashboard] = await Promise.all([
    read('supabase/migrations/202608200002_contact_enquiry_office_inbox.sql'),
    read('src/pages/ContactEnquiries.tsx'),
    read('src/App.tsx'),
    read('src/pages/MemberDashboard.tsx'),
  ]);

  assert.match(migration, /'ipro'[\s\S]*'assistant_ipro'[\s\S]*'secretary_general'[\s\S]*'assistant_secretary_general'/);
  assert.match(migration, /public\.can_manage_contact_enquiries\(auth\.uid\(\)\)/);
  assert.match(migration, /for select\s+to authenticated/);
  assert.match(migration, /for update\s+to authenticated/);
  assert.match(migration, /unread_contact_enquiry_count/);
  assert.match(inbox, /\.from\('contact_messages'\)/);
  assert.match(inbox, /status === 'new' \? null : new Date\(\)\.toISOString\(\)/);
  assert.match(app, /'\/dashboard\/contact-enquiries': <ContactEnquiries \/>/);
  assert.match(dashboard, /can_manage_contact_enquiries/);
  assert.match(dashboard, /Open contact inbox/);
});
