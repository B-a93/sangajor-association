import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('connections require consent and prevent duplicate member pairs', async () => {
  const migration = await read('supabase/migrations/202607310037_connection_hub.sql');
  assert.match(migration, /check \(requester_id <> recipient_id\)/);
  assert.match(migration, /least\(requester_id, recipient_id\), greatest\(requester_id, recipient_id\)/);
  assert.match(migration, /recipient_id = auth\.uid\(\) and status = 'pending'/);
});

test('messages are private to accepted connection participants', async () => {
  const migration = await read('supabase/migrations/202607310037_connection_hub.sql');
  assert.match(migration, /c\.status = 'accepted' and auth\.uid\(\) in \(c\.requester_id, c\.recipient_id\)/);
  assert.match(migration, /char_length\(trim\(body\)\) between 1 and 2000/);
  assert.match(migration, /mark_connection_messages_read/);
});

test('member portal exposes discovery, requests, connections and messaging', async () => {
  const page = await read('src/pages/ConnectionHub.tsx');
  const app = await read('src/App.tsx');
  assert.match(page, /SANGAJOR Connection Hub/);
  assert.match(page, /Connection requests/);
  assert.match(page, /Private conversation/);
  assert.match(app, /\/dashboard\/connections/);
});


test('Connection Hub presents one skills exchange with learning and teaching pathways', async () => {
  const page = await read('src/pages/ConnectionHub.tsx');
  assert.match(page, /Skills Learning &amp; Exchange/);
  assert.match(page, /Learn a Skill/);
  for (const category of ['Digital & Technology Skills', 'Business & Entrepreneurship', 'Career & Professional Development', 'Financial Literacy', 'Leadership & Communication', 'Cooking & Baking', 'Tailoring\/Crafts\/Creativity', 'Agriculture & Farming', 'Family Wellbeing', 'Community Development']) {
    assert.match(page, new RegExp(category.replace('&', '\\&')));
  }
  assert.match(page, /Digital Income & Online Work/);
  assert.match(page, /category\.introduction/);
  assert.match(page, /category\.skills\.map/);
  assert.match(page, /skill\.description/);
  for (const skill of ['Everyday Digital Literacy', 'Starting a Small Business', 'CV & Application Writing', 'Budgeting & Saving', 'Public Speaking', 'Food Safety & Hygiene', 'Sewing & Garment Repair', 'Crop Planning', 'Healthy Communication', 'Project Planning']) {
    assert.match(page, new RegExp(skill.replace('&', '\\&')));
  }
  assert.match(page, /Teach a Skill/);
  for (const field of ['skill', 'experience', 'format', 'availability', 'resources']) assert.match(page, new RegExp(`teaching\\.${field}`));
  assert.match(page, /All submissions require approval before publication/);
  assert.match(page, /member_connections/);
  assert.match(page, /connection_messages/);
});

test('learning-system plan defines controlled, non-accredited certificates', async () => {
  const roadmap = await read('docs/ROADMAP.md');
  assert.match(roadmap, /Certificate of Completion/);
  assert.match(roadmap, /required lessons, attendance and any stated quiz or assignment requirements have been verified/);
  assert.match(roadmap, /Certificate of Participation/);
  assert.match(roadmap, /approval from the tutor or an authorised Association executive/);
  assert.match(roadmap, /unique certificate number and a verification method/);
  assert.match(roadmap, /must never state or imply formal accreditation/);
});

test('teaching offers are private and pending approval when submitted', async () => {
  const migration = await read('supabase/migrations/202608080003_skills_learning_exchange.sql');
  assert.match(migration, /skill_teaching_submissions/);
  assert.match(migration, /status text not null default 'pending'/);
  assert.match(migration, /auth\.uid\(\) = member_id and status = 'pending'/);
  assert.match(migration, /auth\.uid\(\) = member_id/);
});
