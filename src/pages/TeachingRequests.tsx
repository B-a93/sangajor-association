import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './TeachingRequests.css';

type TeachingRequest = { id:string; member_name:string; skill:string; experience:string; teaching_format:string; availability:string; resources:string; status:'pending'|'approved'|'declined'; submitted_at:string; reviewed_at:string|null; decline_reason:string|null };
type Filter = 'pending'|'approved'|'declined';

export function TeachingRequests() {
  const [rows,setRows]=useState<TeachingRequest[]>([]);
  const [filter,setFilter]=useState<Filter>('pending');
  const [reasons,setReasons]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState('');
  const [saving,setSaving]=useState('');

  async function load() {
    setLoading(true);
    const {data,error}=await supabase.rpc('chairman_teaching_request_queue');
    if(error){setMessage('Teaching requests could not be loaded. This dashboard is restricted to the current active Chairman.');setRows([]);}
    else {setRows((data??[]) as TeachingRequest[]);setMessage('');await supabase.rpc('mark_teaching_request_notifications_read');}
    setLoading(false);
  }
  useEffect(()=>{void load();},[]);
  const visible=useMemo(()=>rows.filter(row=>row.status===filter),[rows,filter]);

  async function decide(id:string,decision:'approved'|'declined') {
    const reason=reasons[id]?.trim()||null;
    if(decision==='declined'&&!reason){setMessage('Enter a reason before declining this request.');return;}
    setSaving(id);setMessage('');
    const {error}=await supabase.rpc('decide_teaching_request',{request_id:id,decision,reason});
    setSaving('');
    if(error)setMessage(error.message);else {setMessage(`Teaching request ${decision}.`);await load();}
  }

  if(loading)return <section className="teaching-request-state">Loading teaching requests…</section>;
  return <section className="teaching-requests-page">
    <header><div><p className="eyebrow">Executive Portal · Chairman only</p><h1>Teaching Requests</h1><p>Review proposed skills and workshops submitted through Volunteer to Teach.</p></div><a className="secondary-button" href="#/dashboard">Back to dashboard</a></header>
    {message&&<p className="dashboard-alert" role="status">{message}</p>}
    <nav className="request-filters" aria-label="Teaching request status">
      {(['pending','approved','declined'] as const).map(status=><button type="button" className={filter===status?'active':''} onClick={()=>setFilter(status)} key={status}>{status==='pending'?<Clock3/>:status==='approved'?<CheckCircle2/>:<XCircle/>}{status[0].toUpperCase()+status.slice(1)} <strong>{rows.filter(row=>row.status===status).length}</strong></button>)}
    </nav>
    <div className="teaching-request-list">{visible.map(row=><article key={row.id}>
      <div className="request-heading"><div><p className="eyebrow">{row.member_name}</p><h2>{row.skill}</h2></div><span className={`request-status ${row.status}`}>{row.status}</span></div>
      <dl><div><dt>Experience</dt><dd>{row.experience}</dd></div><div><dt>Teaching format</dt><dd>{row.teaching_format}</dd></div><div><dt>Availability</dt><dd>{row.availability}</dd></div><div><dt>Resources</dt><dd>{row.resources}</dd></div><div><dt>Submission date</dt><dd><time dateTime={row.submitted_at}>{new Date(row.submitted_at).toLocaleString()}</time></dd></div>{row.reviewed_at&&<div><dt>Decision date</dt><dd>{new Date(row.reviewed_at).toLocaleString()}</dd></div>}</dl>
      {row.decline_reason&&<p className="decline-reason"><strong>Decline reason:</strong> {row.decline_reason}</p>}
      {row.status==='pending'&&<div className="request-actions"><label>Reason for declining<textarea maxLength={1000} value={reasons[row.id]??''} onChange={event=>setReasons({...reasons,[row.id]:event.target.value})} placeholder="Required only when declining"/></label><div><button className="primary-button" disabled={saving===row.id} onClick={()=>void decide(row.id,'approved')}>Approve</button><button className="secondary-button" disabled={saving===row.id} onClick={()=>void decide(row.id,'declined')}>Decline</button></div></div>}
    </article>)}{visible.length===0&&<p className="empty-requests">No {filter} teaching requests.</p>}</div>
  </section>;
}
