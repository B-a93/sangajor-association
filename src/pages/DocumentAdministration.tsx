import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Archive, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { DocumentAudience, DocumentCategory, KnowledgeDocument } from '../types/document';
import './KnowledgeCenter.css';

const blank = { title: '', description: '', category: 'resource' as DocumentCategory, audience: 'all_members' as DocumentAudience, meetingDate: '', documentKey: '' };
export function DocumentAdministration() {
  const [allowed, setAllowed] = useState<boolean | null>(null); const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [form, setForm] = useState(blank); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const load = useCallback(async () => { const { data: authorized } = await supabase.rpc('can_manage_documents'); setAllowed(Boolean(authorized)); if (!authorized) return; const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false }); if (error) setMessage('Document records could not be loaded.'); else setDocuments((data ?? []) as KnowledgeDocument[]); }, []);
  useEffect(() => { void load(); }, [load]);
  async function upload(event: FormEvent) {
    event.preventDefault(); if (!file) { setMessage('Choose a file to upload.'); return; } setBusy(true); setMessage('');
    const { data: auth } = await supabase.auth.getUser(); const id = crypto.randomUUID(); const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-'); const path = `${id}/${safeName}`;
    const storage = await supabase.storage.from('association-documents').upload(path, file, { contentType: file.type, upsert: false });
    if (storage.error) { setMessage(storage.error.message); setBusy(false); return; }
    const key = form.documentKey.trim() || id; const previous = documents.filter((item) => item.document_key === key).sort((a,b) => b.version-a.version)[0];
    const { error } = await supabase.from('documents').insert({ id, title: form.title.trim(), description: form.description.trim() || null, category: form.category, audience: form.audience, file_path: path, file_name: file.name, file_size: file.size, mime_type: file.type || 'application/octet-stream', document_key: key, version: (previous?.version ?? 0) + 1, meeting_date: form.meetingDate || null, created_by: auth.user?.id });
    if (error) { await supabase.storage.from('association-documents').remove([path]); setMessage(error.message); } else { setForm(blank); setFile(null); setMessage('Document uploaded as a draft.'); void load(); } setBusy(false);
  }
  async function status(id: string, next: 'published' | 'archived') { setBusy(true); const { error } = await supabase.rpc('set_document_status', { target_document_id: id, new_status: next }); setMessage(error ? error.message : `Document ${next}.`); if (!error) void load(); setBusy(false); }
  if (allowed === null) return <section className="knowledge-state">Checking document access…</section>;
  if (!allowed) return <section className="knowledge-state"><div><h1>Access denied</h1><p>Document management is restricted to authorized officers.</p><a href="#/dashboard">Return to dashboard</a></div></section>;
  return <section className="knowledge-page"><header className="knowledge-header"><div><p className="eyebrow">Executive administration</p><h1>Document Management</h1><p>Upload, version and publish resources for the Association.</p></div><a className="secondary-button" href="#/dashboard">Back to dashboard</a></header>
    {message && <p className="knowledge-message" role="status">{message}</p>}
    <form className="document-form" onSubmit={upload}><h2><Upload size={21}/> Upload document</h2><div className="document-form-grid"><label>Title<input required minLength={3} maxLength={180} value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})}/></label><label>Category<select value={form.category} onChange={(e)=>setForm({...form,category:e.target.value as DocumentCategory})}><option value="meeting_minutes">Meeting minutes</option><option value="policy">Policy</option><option value="report">Report</option><option value="form">Form</option><option value="resource">Resource</option></select></label><label>Audience<select value={form.audience} onChange={(e)=>setForm({...form,audience:e.target.value as DocumentAudience})}><option value="all_members">All members</option><option value="executives">Executives only</option></select></label><label>Meeting date<input type="date" value={form.meetingDate} onChange={(e)=>setForm({...form,meetingDate:e.target.value})}/></label><label>Document key <small>(reuse for a new version)</small><input value={form.documentKey} onChange={(e)=>setForm({...form,documentKey:e.target.value})} placeholder="e.g. constitution"/></label><label>File<input required type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" onChange={(e)=>setFile(e.target.files?.[0] ?? null)}/></label></div><label>Description<textarea rows={3} maxLength={1000} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/></label><button className="primary-button" disabled={busy}>{busy ? 'Working…' : 'Upload draft'}</button></form>
    <h2>Document library</h2><div className="document-management-list">{documents.map((item)=><article key={item.id}><div><span className={`document-status ${item.status}`}>{item.status}</span><strong>{item.title}</strong><p>{item.file_name} · version {item.version} · {item.audience === 'executives' ? 'Executives' : 'All members'}</p></div><div>{item.status === 'draft' && <button disabled={busy} onClick={()=>status(item.id,'published')}>Publish</button>}{item.status === 'published' && <button disabled={busy} onClick={()=>status(item.id,'archived')}><Archive size={16}/> Archive</button>}</div></article>)}</div>
  </section>;
}
