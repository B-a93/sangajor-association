import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileText, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { DocumentCategory, KnowledgeDocument } from '../types/document';
import './KnowledgeCenter.css';

const categoryLabels: Record<DocumentCategory, string> = { meeting_minutes: 'Meeting minutes', policy: 'Policies', report: 'Reports', form: 'Forms', resource: 'Resources' };
const readableSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function KnowledgeCenter() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | DocumentCategory>('all');

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) { window.location.hash = '/login'; return; }
    const { data, error } = await supabase.from('documents').select('*').eq('status', 'published').order('published_at', { ascending: false });
    if (error) setMessage('The document library could not be loaded. Please try again.');
    else setDocuments((data ?? []) as KnowledgeDocument[]);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return documents.filter((item) => (category === 'all' || item.category === category) && (!term || `${item.title} ${item.description ?? ''} ${item.file_name}`.toLocaleLowerCase().includes(term)));
  }, [category, documents, query]);

  async function download(item: KnowledgeDocument) {
    setMessage('');
    const { data, error } = await supabase.storage.from('association-documents').createSignedUrl(item.file_path, 60, { download: item.file_name });
    if (error || !data) setMessage('This file could not be downloaded. Please try again.');
    else window.location.assign(data.signedUrl);
  }

  if (loading) return <section className="knowledge-state">Loading the Knowledge Centre…</section>;
  return <section className="knowledge-page">
    <header className="knowledge-header"><div><p className="eyebrow">Member portal</p><h1>Documents &amp; Knowledge Centre</h1><p>Find Association minutes, policies, reports, forms and shared resources.</p></div><a className="secondary-button" href="#/dashboard">Back to dashboard</a></header>
    <div className="knowledge-tools"><label className="knowledge-search"><Search size={19}/><span className="sr-only">Search documents</span><input type="search" placeholder="Search by title, description or file name" value={query} onChange={(event) => setQuery(event.target.value)}/></label><label><span className="sr-only">Filter by category</span><select value={category} onChange={(event) => setCategory(event.target.value as 'all' | DocumentCategory)}><option value="all">All categories</option>{Object.entries(categoryLabels).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
    {message && <p className="knowledge-message" role="alert">{message}</p>}
    <p className="knowledge-count">{visible.length} document{visible.length === 1 ? '' : 's'} found</p>
    <div className="document-grid">{visible.map((item) => <article className="document-card" key={item.id}><div className="document-icon"><FileText/></div><div className="document-card-body"><div className="document-meta"><span>{categoryLabels[item.category]}</span><span>Version {item.version}</span>{item.audience === 'executives' && <span>Executives</span>}</div><h2>{item.title}</h2><p>{item.description || 'No description provided.'}</p><div className="document-detail">{item.meeting_date && <time dateTime={item.meeting_date}>Meeting: {new Date(`${item.meeting_date}T00:00:00`).toLocaleDateString('en-GB', { dateStyle: 'medium' })}</time>}<span>{item.file_name} · {readableSize(item.file_size)}</span></div><button type="button" onClick={() => download(item)}><Download size={17}/> Download</button></div></article>)}</div>
    {!visible.length && <div className="knowledge-empty"><FileText size={38}/><h2>No documents found</h2><p>Try another search or category.</p></div>}
  </section>;
}
