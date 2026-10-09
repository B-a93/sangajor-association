import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { publicCourses } from '../data/publicCourses';
import { supabase } from '../lib/supabase';
import './TeachingRequests.css';

type LearnerRequest = {
  id:string; reference_number:string; learner_name:string; email:string; location:string;
  course_slug:string; verification_channel:string; status:'pending'|'approved'|'declined';
  submitted_at:string; reviewed_at:string|null; decision_reason:string|null;
  reviewer_name:string|null; reviewer_office:string|null;
};
type Filter = 'pending'|'approved'|'declined';

export function LearnerRequests() {
  const [rows,setRows]=useState<LearnerRequest[]>([]);
  const [filter,setFilter]=useState<Filter>('pending');
  const [notes,setNotes]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState('');
  const [saving,setSaving]=useState('');

  async function load(){
    setLoading(true);
    const {data,error}=await supabase.rpc('skill_exchange_learner_request_queue');
    if(error){setMessage('Learner requests could not be loaded. Access is limited to the Chairman’s, Secretary’s and IPRO offices.');setRows([]);}
    else{setRows((data??[]) as LearnerRequest[]);setMessage('');await supabase.rpc('mark_learner_request_notifications_read');}
    setLoading(false);
  }
  useEffect(()=>{void load();},[]);
  const visible=useMemo(()=>rows.filter(row=>row.status===filter),[rows,filter]);
  const courseTitle=(slug:string)=>publicCourses.find(course=>course.slug===slug)?.title??slug.replaceAll('-',' ');

  async function review(row:LearnerRequest,decision:'approved'|'declined'){
    const reason=notes[row.id]?.trim()??'';
    if(decision==='declined'&&!reason){setMessage('A reason is required when declining a learning request.');return;}
    setSaving(row.id);setMessage('');
    const {error}=await supabase.rpc('review_skill_exchange_learner_request',{request_id:row.id,decision,reason:reason||null});
    setSaving('');
    if(error)setMessage(error.message);
    else{setMessage(`Learning request ${decision}.`);await load();}
  }

  if(loading)return <section className="teaching-request-state">Loading learner requests…</section>;
  return <section className="teaching-requests-page">
    <header><div><p className="eyebrow">Chairman · Secretary · IPRO</p><h1>Learner Requests</h1><p>Review verified requests from members of the public who want to join free Skill Exchange classes.</p></div><a className="secondary-button" href="#/dashboard">Back to dashboard</a></header>
    {message&&<p className="dashboard-alert" role="status">{message}</p>}
    <nav className="request-filters" aria-label="Learner request status">{(['pending','approved','declined'] as const).map(status=><button type="button" className={filter===status?'active':''} onClick={()=>setFilter(status)} key={status}>{status==='pending'?<Clock3/>:status==='approved'?<CheckCircle2/>:<XCircle/>}{status==='pending'?'Pending Review':status[0].toUpperCase()+status.slice(1)} <strong>{rows.filter(row=>row.status===status).length}</strong></button>)}</nav>
    <div className="teaching-request-list">{visible.map(row=><article key={row.id}>
      <div className="request-heading"><div><p className="eyebrow">{row.reference_number} · {row.learner_name}</p><h2>{courseTitle(row.course_slug)}</h2></div><span className={`request-status ${row.status}`}>{row.status==='pending'?'Pending Review':row.status}</span></div>
      <dl><div><dt>Email</dt><dd>{row.email}</dd></div><div><dt>Location</dt><dd>{row.location}</dd></div><div><dt>Course</dt><dd>{courseTitle(row.course_slug)}</dd></div><div><dt>Verification</dt><dd>{row.verification_channel}</dd></div><div><dt>Submission date</dt><dd><time dateTime={row.submitted_at}>{new Date(row.submitted_at).toLocaleString()}</time></dd></div>{row.reviewed_at&&<div><dt>Decision date</dt><dd>{new Date(row.reviewed_at).toLocaleString()}</dd></div>}{row.reviewer_name&&<div><dt>Reviewed by</dt><dd>{row.reviewer_name}{row.reviewer_office?` · ${row.reviewer_office.replaceAll('_',' ')}`:''}</dd></div>}</dl>
      {row.decision_reason&&<p className={row.status==='declined'?'decline-reason':'information-reason'}><strong>Decision note:</strong> {row.decision_reason}</p>}
      {row.status==='pending'&&<div className="request-actions"><label>Decision note<textarea maxLength={2000} value={notes[row.id]??''} onChange={event=>setNotes({...notes,[row.id]:event.target.value})} placeholder="Optional for approval; required when declining"/></label><div><button className="primary-button" disabled={saving===row.id} onClick={()=>void review(row,'approved')}>Approve</button><button className="secondary-button" disabled={saving===row.id} onClick={()=>void review(row,'declined')}>Decline</button></div></div>}
    </article>)}{visible.length===0&&<p className="empty-requests">No {filter==='pending'?'Pending Review':filter} learner requests.</p>}</div>
  </section>;
}
