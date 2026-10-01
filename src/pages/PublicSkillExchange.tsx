import { useEffect, useState, type FormEvent } from 'react';
import { BookOpen, CheckCircle2, GraduationCap, ShieldCheck } from 'lucide-react';
import { publicCourses, type PublicCourseSlug } from '../data/publicCourses';
import { supabase } from '../lib/supabase';
import './PublicSkillExchange.css';

const programmeStatement = 'SANGAJOR Skill Exchange is a community learning initiative. Courses are offered free of charge, and approved instructors volunteer their knowledge and time without payment.';

type PublicSkillExchangeProps = { panel?: 'learn' | 'teach'; courseSlug?: PublicCourseSlug };

type VerificationChannel = 'email' | 'telephone';
type VerificationProps = { email: string; telephone: string; channel: VerificationChannel; onChannel: (value: VerificationChannel) => void; onVerified: () => void };

function ContactVerification({ email, telephone, channel, onChannel, onVerified }: VerificationProps) {
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const destination = channel === 'email' ? email.trim().toLowerCase() : telephone.trim();

  async function sendCode() {
    if (!destination) { setNotice(`Enter your ${channel === 'email' ? 'email address' : 'telephone number'} first.`); return; }
    setBusy(true); setNotice('');
    try {
      const prepared = await supabase.functions.invoke('public-skill-verification', { body: { channel, destination, website: '' } });
      if (prepared.error) { setNotice('Verification is temporarily unavailable. Please try again later.'); return; }
      const result = channel === 'email'
        ? await supabase.auth.signInWithOtp({ email: destination, options: { shouldCreateUser: true } })
        : await supabase.auth.signInWithOtp({ phone: destination, options: { shouldCreateUser: true } });
      if (result.error) setNotice(result.error.message);
      else { setSent(true); setNotice(`We sent a one-time verification code to ${destination}.`); }
    } catch {
      setNotice('Verification is temporarily unavailable. Please try again later.');
    } finally { setBusy(false); }
  }

  async function verifyCode() {
    if (!code.trim()) return;
    setBusy(true); setNotice('');
    try {
      const result = channel === 'email'
        ? await supabase.auth.verifyOtp({ email: destination, token: code.trim(), type: 'email' })
        : await supabase.auth.verifyOtp({ phone: destination, token: code.trim(), type: 'sms' });
      if (result.error) setNotice(result.error.message);
      else { setNotice('Contact verified. You may now submit the form.'); onVerified(); }
    } catch {
      setNotice('Verification is temporarily unavailable. Please try again later.');
    } finally { setBusy(false); }
  }

  return <fieldset className="verification-box"><legend>Verify your contact</legend>
    <p>No Association membership account is required. A one-time code protects the programme from spam and confirms how we can contact you.</p>
    <div className="verification-options"><label><input type="radio" checked={channel === 'email'} onChange={() => onChannel('email')}/> Email</label><label><input type="radio" checked={channel === 'telephone'} onChange={() => onChannel('telephone')}/> Telephone / WhatsApp</label></div>
    {!sent ? <button className="secondary-button" type="button" disabled={busy} onClick={() => void sendCode()}>{busy ? 'Sending…' : 'Send verification code'}</button> : <div className="verification-code"><label>One-time code<input inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={code} onChange={(event) => setCode(event.target.value)}/></label><button className="secondary-button" type="button" disabled={busy} onClick={() => void verifyCode()}>{busy ? 'Checking…' : 'Verify code'}</button></div>}
    {notice && <p role="status">{notice}</p>}
  </fieldset>;
}

const contactDefaults = { full_name: '', email: '', telephone: '', location: '', website: '' };
const teachingDefaults = { ...contactDefaults, title: '', description: '', experience: '', intended_audience: '', preferred_format: 'online', availability: '', required_resources: '', supporting_link: '', voluntary_unpaid_consent: false };

export function PublicSkillExchange({ panel = undefined, courseSlug = publicCourses[0].slug }: PublicSkillExchangeProps) {
  const [learner, setLearner] = useState({ ...contactDefaults, course_slug: courseSlug as string });
  const [teaching, setTeaching] = useState(teachingDefaults);
  const [learnerChannel, setLearnerChannel] = useState<VerificationChannel>('email');
  const [teacherChannel, setTeacherChannel] = useState<VerificationChannel>('email');
  const [learnerVerified, setLearnerVerified] = useState(false);
  const [teacherVerified, setTeacherVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [statusReference, setStatusReference] = useState('');
  const [statusContact, setStatusContact] = useState({ email: '', telephone: '' });
  const [statusChannel, setStatusChannel] = useState<VerificationChannel>('email');
  const [statusVerified, setStatusVerified] = useState(false);
  const [statusResult, setStatusResult] = useState<{ title:string; status:string; information_request:string|null; decision_reason:string|null; instructions:string|null } | null>(null);

  useEffect(() => {
    if (!panel) return;
    document.getElementById(panel === 'learn' ? 'join-class' : 'teach')?.scrollIntoView({ block: 'start' });
  }, [panel]);

  const updateLearner = (field: string, value: string) => setLearner((current) => ({ ...current, [field]: value }));
  const updateTeaching = (field: string, value: string | boolean) => setTeaching((current) => ({ ...current, [field]: value }));

  async function registerLearner(event: FormEvent) {
    event.preventDefault(); if (!learnerVerified) { setConfirmation('Please verify your email or telephone before registering.'); return; }
    setBusy(true); setConfirmation('');
    try {
      const { data, error } = await supabase.rpc('register_public_skill_learner', { registration: { ...learner, verification_channel: learnerChannel } });
      if (error) setConfirmation(error.message); else setConfirmation(`Registration received. Your learner reference is ${data?.[0]?.reference_number}. The programme team will contact you about availability and next steps.`);
    } catch { setConfirmation('Registration is temporarily unavailable. Please try again later.'); }
    finally { setBusy(false); }
  }

  async function submitTeaching(event: FormEvent) {
    event.preventDefault(); if (!teacherVerified) { setConfirmation('Please verify your email or telephone before submitting.'); return; }
    setBusy(true); setConfirmation('');
    try {
      const { data, error } = await supabase.rpc('submit_public_skill_application', { application: { ...teaching, verification_channel: teacherChannel } });
      if (error) setConfirmation(error.message); else { const reference = data?.[0]?.reference_number; setConfirmation(`Application received. Your reference is ${reference}. It will remain Pending Review until an authorised reviewer makes a decision. Save this reference to check your status securely.`); setStatusReference(reference ?? ''); }
    } catch { setConfirmation('The application service is temporarily unavailable. Please try again later.'); }
    finally { setBusy(false); }
  }

  async function checkStatus(event: FormEvent) {
    event.preventDefault(); if (!statusVerified) { setConfirmation('Verify the same contact used on your application before checking its status.'); return; } setBusy(true); setStatusResult(null); setConfirmation('');
    try {
      const { data, error } = await supabase.rpc('public_skill_application_status', { reference: statusReference.trim() });
      if (error) setConfirmation(error.message); else if (!data?.length) setConfirmation('No application was found for this reference and your verified contact. Verify with the same email or telephone used to apply.'); else setStatusResult(data[0]);
    } catch { setConfirmation('Application status is temporarily unavailable. Please try again later.'); }
    finally { setBusy(false); }
  }

  return <main className="public-skills-page">
    <section className="public-skills-hero"><div><p className="eyebrow light">Open to everyone</p><h1>Learn a skill. Share a skill. Strengthen our community.</h1><p className="initiative-statement">{programmeStatement}</p><div className="public-skill-actions"><a className="primary-button" href="#/skill-exchange/learn"><BookOpen/> Learn a Skill</a><a className="button-outline-light" href="#/skill-exchange/teach"><GraduationCap/> Teach a Skill</a></div></div></section>

    <section className="public-course-section" aria-labelledby="public-courses-title"><div className="section-heading"><p className="eyebrow">Free learning</p><h2 id="public-courses-title">Browse courses and workshops</h2><p>Explore current learning pathways. Registration is free and does not require Association membership.</p></div><div className="public-course-grid">{publicCourses.map((course) => <article key={course.slug}><BookOpen/><span>{course.format}</span><h3>{course.title}</h3><p>{course.summary}</p><a href={`#/skill-exchange/courses/${course.slug}`}>Join this free class</a></article>)}</div></section>

    <section className="public-skills-assurance"><ShieldCheck/><div><h2>Safe, reviewed and genuinely free</h2><p>{programmeStatement}</p><p>Teaching proposals are private and stay <strong>Pending Review</strong>. Applying does not publish a teacher profile or create a course. Approved volunteers receive safeguarding, conduct, scheduling and course-preparation instructions before teaching.</p></div></section>

    {panel === 'learn' && <section className="public-form-section" id="join-class"><header><p className="eyebrow">Action 1</p><h2>Join a Free Class</h2><p>Tell us which free course interests you. We will confirm dates or access instructions after contact verification.</p></header><form onSubmit={registerLearner}><div className="public-form-grid"><label>Full name<input required minLength={2} maxLength={120} autoComplete="name" value={learner.full_name} onChange={(e) => updateLearner('full_name', e.target.value)}/></label><label>Email address<input required type="email" maxLength={254} autoComplete="email" value={learner.email} onChange={(e) => { updateLearner('email', e.target.value); setLearnerVerified(false); }}/></label><label>Telephone / WhatsApp number<input required type="tel" maxLength={40} autoComplete="tel" value={learner.telephone} onChange={(e) => { updateLearner('telephone', e.target.value); setLearnerVerified(false); }}/></label><label>Location<input required maxLength={160} value={learner.location} onChange={(e) => updateLearner('location', e.target.value)}/></label><label>Course or workshop<select value={learner.course_slug} onChange={(e) => updateLearner('course_slug', e.target.value)}>{publicCourses.map((course) => <option value={course.slug} key={course.slug}>{course.title}</option>)}</select></label><label className="spam-field" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={learner.website} onChange={(e) => updateLearner('website', e.target.value)}/></label></div><ContactVerification email={learner.email} telephone={learner.telephone} channel={learnerChannel} onChannel={(value) => { setLearnerChannel(value); setLearnerVerified(false); }} onVerified={() => setLearnerVerified(true)}/><button className="primary-button" disabled={busy || !learnerVerified}>{busy ? 'Registering…' : 'Register for free'}</button></form></section>}

    {panel === 'teach' && <section className="public-form-section" id="teach"><header><p className="eyebrow">Action 2</p><h2>Apply to Teach for Free</h2><p>Propose a skill or workshop as an unpaid volunteer. Every application is reviewed privately and is never published automatically.</p></header><form onSubmit={submitTeaching}><div className="public-form-grid"><label>Full name<input required minLength={2} maxLength={120} autoComplete="name" value={teaching.full_name} onChange={(e) => updateTeaching('full_name', e.target.value)}/></label><label>Email address<input required type="email" maxLength={254} autoComplete="email" value={teaching.email} onChange={(e) => { updateTeaching('email', e.target.value); setTeacherVerified(false); }}/></label><label>Telephone / WhatsApp number<input required type="tel" maxLength={40} autoComplete="tel" value={teaching.telephone} onChange={(e) => { updateTeaching('telephone', e.target.value); setTeacherVerified(false); }}/></label><label>Location<input required maxLength={160} value={teaching.location} onChange={(e) => updateTeaching('location', e.target.value)}/></label><label>Skill or workshop title<input required minLength={2} maxLength={160} value={teaching.title} onChange={(e) => updateTeaching('title', e.target.value)}/></label><label>Intended audience<input required minLength={2} maxLength={500} placeholder="Who would benefit?" value={teaching.intended_audience} onChange={(e) => updateTeaching('intended_audience', e.target.value)}/></label><label className="full-width">Description of what you want to teach<textarea required minLength={20} maxLength={3000} rows={5} value={teaching.description} onChange={(e) => updateTeaching('description', e.target.value)}/></label><label className="full-width">Relevant experience<textarea required minLength={2} maxLength={2000} rows={4} value={teaching.experience} onChange={(e) => updateTeaching('experience', e.target.value)}/></label><label>Preferred format<select value={teaching.preferred_format} onChange={(e) => updateTeaching('preferred_format', e.target.value)}><option value="online">Online</option><option value="in_person">In person</option><option value="hybrid">Hybrid</option></select></label><label>Availability<input required minLength={2} maxLength={500} placeholder="Days, times and frequency" value={teaching.availability} onChange={(e) => updateTeaching('availability', e.target.value)}/></label><label className="full-width">Required resources<textarea required minLength={2} maxLength={1500} rows={3} placeholder="Venue, equipment, materials or connectivity needed" value={teaching.required_resources} onChange={(e) => updateTeaching('required_resources', e.target.value)}/></label><label className="full-width">Supporting document or portfolio link (optional)<input type="url" maxLength={1000} placeholder="https://…" value={teaching.supporting_link} onChange={(e) => updateTeaching('supporting_link', e.target.value)}/></label><label className="consent full-width"><input required type="checkbox" checked={teaching.voluntary_unpaid_consent} onChange={(e) => updateTeaching('voluntary_unpaid_consent', e.target.checked)}/> I confirm that my proposed teaching service is voluntary and unpaid.</label><label className="spam-field" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={teaching.website} onChange={(e) => updateTeaching('website', e.target.value)}/></label></div><ContactVerification email={teaching.email} telephone={teaching.telephone} channel={teacherChannel} onChannel={(value) => { setTeacherChannel(value); setTeacherVerified(false); }} onVerified={() => setTeacherVerified(true)}/><button className="primary-button" disabled={busy || !teacherVerified}>{busy ? 'Submitting…' : 'Submit for Pending Review'}</button></form></section>}

    <section className="status-section"><CheckCircle2/><div><p className="eyebrow">Secure status check</p><h2>Check a teaching application</h2><p>Verify the same email or telephone used to apply, then enter your private reference number.</p><div className="status-contacts"><label>Email address<input type="email" value={statusContact.email} onChange={(e) => { setStatusContact({...statusContact,email:e.target.value}); setStatusVerified(false); }}/></label><label>Telephone / WhatsApp<input type="tel" value={statusContact.telephone} onChange={(e) => { setStatusContact({...statusContact,telephone:e.target.value}); setStatusVerified(false); }}/></label></div><ContactVerification email={statusContact.email} telephone={statusContact.telephone} channel={statusChannel} onChannel={(value) => { setStatusChannel(value); setStatusVerified(false); }} onVerified={() => setStatusVerified(true)}/><form onSubmit={checkStatus}><label>Application reference<input required placeholder="SXT-2026-…" value={statusReference} onChange={(e) => setStatusReference(e.target.value)}/></label><button className="secondary-button" disabled={busy || !statusVerified}>Check status</button></form>{statusResult && <article className={`status-result ${statusResult.status}`}><strong>{statusResult.title}</strong><span>{statusResult.status === 'pending' ? 'Pending Review' : statusResult.status}</span>{statusResult.information_request && <p><b>Further information requested:</b> {statusResult.information_request}</p>}{statusResult.decision_reason && <p><b>Decision reason:</b> {statusResult.decision_reason}</p>}{statusResult.instructions && <p><b>Next steps:</b> {statusResult.instructions}</p>}</article>}</div></section>
    {confirmation && <div className="public-confirmation" role="status">{confirmation}</div>}
  </main>;
}
