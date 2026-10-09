import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { publicCourses } from '../data/publicCourses';
import { supabase } from '../lib/supabase';
import './TeachingRequests.css';

type LearnerRegistration = {
  id:string; reference_number:string; learner_name:string; email:string; location:string;
  course_slug:string; verification_channel:string; status:'pending'|'approved'|'declined';
  submitted_at:string; reviewed_at:string|null; decision_reason:string|null;
  reviewer_name:string|null; reviewer_office:string|null;
};

export function LearnerRequests() {
  const [rows,setRows]=useState<LearnerRegistration[]>([]);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState('');

  useEffect(()=>{
    void (async()=>{
      const {data,error}=await supabase.rpc('skill_exchange_learner_request_queue');
      if(error){
        setMessage('Learner registrations could not be loaded. Access is limited to the Chairman’s, Secretary’s and IPRO offices.');
        setRows([]);
      } else {
        setRows((data??[]) as LearnerRegistration[]);
        await supabase.rpc('mark_learner_request_notifications_read');
      }
      setLoading(false);
    })();
  },[]);

  const courseTitle=(slug:string)=>publicCourses.find(course=>course.slug===slug)?.title??slug.replaceAll('-',' ');

  if(loading)return <section className="teaching-request-state">Loading learner registrations…</section>;
  return <section className="teaching-requests-page">
    <header><div><p className="eyebrow">Chairman · Secretary · IPRO</p><h1>Learner Registrations</h1><p>View verified public learners. Registration is automatic, so no approval is required.</p></div><a className="secondary-button" href="#/dashboard">Back to dashboard</a></header>
    {message&&<p className="dashboard-alert" role="status">{message}</p>}
    <nav className="request-filters" aria-label="Learner registration total"><button type="button" className="active"><CheckCircle2/> Registered <strong>{rows.length}</strong></button></nav>
    <div className="teaching-request-list">{rows.map(row=><article key={row.id}>
      <div className="request-heading"><div><p className="eyebrow">{row.reference_number} · {row.learner_name}</p><h2>{courseTitle(row.course_slug)}</h2></div><span className="request-status approved">Registered</span></div>
      <dl><div><dt>Email</dt><dd>{row.email}</dd></div><div><dt>Location</dt><dd>{row.location}</dd></div><div><dt>Course</dt><dd>{courseTitle(row.course_slug)}</dd></div><div><dt>Verification</dt><dd>{row.verification_channel}</dd></div><div><dt>Registration date</dt><dd><time dateTime={row.submitted_at}>{new Date(row.submitted_at).toLocaleString()}</time></dd></div></dl>
    </article>)}{rows.length===0&&<p className="empty-requests">No learner registrations yet.</p>}</div>
  </section>;
}
