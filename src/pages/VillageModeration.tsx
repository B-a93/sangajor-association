import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Flag, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { VillageReport } from '../types/village';
import './VillageSquare.css';

export function VillageModeration() {
  const [reports, setReports] = useState<VillageReport[]>([]);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) { window.location.hash = '/login'; return; }
    const { data: authorized } = await supabase.rpc('can_moderate_village');
    setAllowed(Boolean(authorized));
    if (!authorized) { setLoading(false); return; }
    const { data, error } = await supabase.from('village_reports')
      .select('id, reason, details, status, resolution_note, created_at, reporter:profiles!village_reports_reporter_id_fkey(full_name), post:village_posts(body, author:profiles!village_posts_author_id_fkey(full_name))')
      .order('created_at', { ascending: false });
    if (error) setMessage('You do not have access to Village moderation, or reports could not be loaded.');
    else setReports((data ?? []) as unknown as VillageReport[]);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function resolve(id: string, status: 'reviewed' | 'resolved') {
    const note = window.prompt('Add a private moderation note (optional).') ?? '';
    const { error } = await supabase.rpc('resolve_village_report', { target_report_id: id, target_status: status, note });
    setMessage(error ? 'The report could not be updated.' : `Report marked ${status}.`);
    if (!error) await load();
  }
  if (loading) return <section className="village-state">Opening the moderation queue…</section>;
  if (!allowed) return <section className="village-state"><div><h1>Access denied</h1><p>Village moderation is restricted to authorized officers.</p><a href="#/dashboard">Return to dashboard</a></div></section>;
  return <section className="village-page"><header className="village-header"><div><p className="eyebrow">Community safety</p><h1>Village moderation</h1><p>Review member concerns consistently and keep a clear resolution record.</p></div><a className="secondary-button" href="#/dashboard/village">Back to Village Square</a></header>
    {message && <p className="village-message" role="status">{message}</p>}
    <div className="moderation-summary"><ShieldCheck /><strong>{reports.filter((report) => report.status === 'open').length}</strong><span> open reports</span></div>
    <div className="moderation-list">{reports.length === 0 ? <article className="village-empty"><CheckCircle2 /><h2>The village is all clear</h2><p>There are no community reports to review.</p></article> : reports.map((report) => <article className="moderation-card" key={report.id}><header><Flag /><div><strong>{report.reason}</strong><span>{report.status} · {new Date(report.created_at).toLocaleDateString()}</span></div></header><blockquote>{report.post?.body || 'Post no longer available'}</blockquote><p>Reported by {report.reporter?.full_name || 'Member'} · Posted by {report.post?.author?.full_name || 'Member'}</p>{report.details && <p>{report.details}</p>}{report.resolution_note && <small>Resolution: {report.resolution_note}</small>}<div><button type="button" onClick={() => void resolve(report.id, 'reviewed')}>Mark reviewed</button><button type="button" onClick={() => void resolve(report.id, 'resolved')}>Resolve</button></div></article>)}</div>
  </section>;
}
