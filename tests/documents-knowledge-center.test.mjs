import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('documents are versioned and audience controlled', async () => {
  const migration = await read('supabase/migrations/202607300033_documents_knowledge_center.sql');
  assert.match(migration, /document_category as enum \('meeting_minutes', 'policy', 'report', 'form', 'resource'\)/);
  assert.match(migration, /unique \(document_key, version\)/);
  assert.match(migration, /item\.audience = 'all_members' or role <> 'member'/);
  assert.match(migration, /update public\.documents set status = 'archived'/);
});

test('private document storage is protected by metadata access', async () => {
  const migration = await read('supabase/migrations/202607300033_documents_knowledge_center.sql');
  assert.match(migration, /'association-documents', 'association-documents', false/);
  assert.match(migration, /public\.can_view_document\(item\)/);
  assert.match(migration, /file_size_limit/);
});

test('member and officer workflows expose knowledge center features', async () => {
  const center = await read('src/pages/KnowledgeCenter.tsx');
  const administration = await read('src/pages/DocumentAdministration.tsx');
  assert.match(center, /Documents &amp; Knowledge Centre/);
  assert.match(center, /createSignedUrl/);
  assert.match(administration, /Document Management/);
  assert.match(administration, /set_document_status/);
});
