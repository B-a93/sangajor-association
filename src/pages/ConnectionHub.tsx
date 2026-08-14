import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Award, BookOpen, CheckCircle2, Download, GraduationCap, Languages, MessageCircle, Mic, Search, Square, Trash2, UserCheck, UserPlus, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ConnectionMessage, ConnectionProfile, MemberConnection } from '../types/connection';
import './ConnectionHub.css';


const learningCategories = [
  {
    title: 'Education & Teaching Support',
    introduction: 'Support members to continue learning and help educators strengthen welcoming, safe and inclusive learning spaces.',
    pathways: [
      { title: 'Learn and Return to Education', skills: [
        { name: 'Adult Literacy', description: 'Build reading and writing confidence at a comfortable pace, with practical support for everyday life.' },
        { name: 'English', description: 'Develop useful speaking, listening, reading and writing skills for study, work and daily communication.' },
        { name: 'Mathematics', description: 'Strengthen foundational numeracy and work through mathematics topics step by step.' },
        { name: 'Computer Literacy', description: 'Learn essential device, document, email and internet skills for education and work.' },
        { name: 'Exam Preparation', description: 'Plan revision, practise questions and develop calm, effective study routines.' },
        { name: 'Vocational Pathways', description: 'Explore practical training routes and identify the skills, entry steps and support needed to progress.' },
      ] },
      { title: 'Teaching & Tutoring Skills', skills: [
        { name: 'Lesson Planning', description: 'Set clear learning goals and organise relevant, achievable learning activities.' },
        { name: 'Classroom Management', description: 'Create respectful routines that encourage participation, focus and positive behaviour.' },
        { name: 'Inclusive Teaching', description: 'Adapt teaching so learners with different strengths, needs and backgrounds can participate with dignity.' },
        { name: 'Assessment', description: 'Use fair checks for understanding and constructive feedback to guide next steps.' },
        { name: 'Safeguarding', description: 'Understand responsibilities, appropriate boundaries and how to report a concern through approved channels.' },
        { name: 'Volunteer Tutoring', description: 'Prepare to offer patient, reliable learning support within the Association’s approved tutoring arrangements.' },
      ] },
    ],
  },
  {
    title: 'Digital & Technology Skills',
    introduction: 'Build the confidence to use everyday technology safely, productively and creatively.',
    skills: [
      { name: 'Everyday Digital & Technology Skills', description: 'Build the confidence to use smartphones, computers, email, the internet, digital documents, online communication and introductory AI tools safely and effectively.' },
      { name: 'Digital Income & Online Work', description: 'Explore legitimate freelancing, online payments, AI tools, social-media work and practical scam awareness.' },
      { name: 'Online Safety & Privacy', description: 'Recognise common digital risks and protect your accounts, information and devices.' },
    ],
  },
  {
    title: 'Business & Entrepreneurship',
    introduction: 'Turn useful ideas into responsible ventures that serve customers and strengthen livelihoods.',
    skills: [
      { name: 'Starting a Small Business', description: 'Shape an achievable business idea, understand your customer and plan a practical launch.' },
      { name: 'Sales & Customer Service', description: 'Build trust with customers through clear communication, reliable service and ethical selling.' },
      { name: 'Record-Keeping & Pricing', description: 'Track income and costs so you can price fairly and make informed business decisions.' },
    ],
  },
  {
    title: 'Career & Professional Development',
    introduction: 'Prepare for opportunities and grow the habits needed for a confident professional journey.',
    skills: [
      { name: 'CV & Application Writing', description: 'Present your experience and strengths clearly in targeted applications.' },
      { name: 'Interview Preparation', description: 'Practise thoughtful answers and professional communication for interviews.' },
      { name: 'Workplace Readiness', description: 'Develop dependable habits for teamwork, time management and professional conduct.' },
    ],
  },
  {
    title: 'Financial Literacy',
    introduction: 'Make informed everyday money decisions for greater personal, family and business resilience.',
    skills: [
      { name: 'Budgeting & Saving', description: 'Create a realistic spending plan and build savings toward clear goals.' },
      { name: 'Banking & Digital Payments', description: 'Use financial services and digital payments more confidently and securely.' },
      { name: 'Responsible Borrowing', description: 'Compare borrowing options and understand costs, obligations and warning signs.' },
    ],
  },
  {
    title: 'Leadership & Communication',
    introduction: 'Strengthen the people skills needed to guide, listen and collaborate with integrity.',
    skills: [
      { name: 'Public Speaking', description: 'Plan and deliver clear, confident messages for different audiences.' },
      { name: 'Team Leadership', description: 'Set shared goals, support participation and follow through responsibly.' },
      { name: 'Conflict Resolution', description: 'Approach disagreements calmly and work toward respectful, practical solutions.' },
    ],
  },
  {
    title: 'Cooking & Baking',
    introduction: 'Develop practical food skills for the home, community events or a future enterprise.',
    skills: [
      { name: 'Food Safety & Hygiene', description: 'Prepare, handle and store food using clean and responsible practices.' },
      { name: 'Everyday Cooking', description: 'Plan and prepare balanced meals using accessible ingredients and reliable methods.' },
      { name: 'Baking Basics', description: 'Learn accurate measuring, mixing and baking techniques for consistent results.' },
    ],
  },
  {
    title: 'Tailoring/Crafts/Creativity',
    introduction: 'Build creative confidence through hands-on making, design and practical craft techniques.',
    skills: [
      { name: 'Sewing & Garment Repair', description: 'Learn essential stitching, measuring and repair techniques for everyday garments.' },
      { name: 'Craft Making', description: 'Turn accessible materials into useful or decorative handmade items.' },
      { name: 'Creative Design', description: 'Develop ideas through colour, composition and simple design planning.' },
    ],
  },
  {
    title: 'Agriculture & Farming',
    introduction: 'Share practical approaches to productive, responsible farming and food growing.',
    skills: [
      { name: 'Crop Planning', description: 'Choose suitable crops and organise planting around seasons, space and available resources.' },
      { name: 'Soil & Plant Care', description: 'Support healthy growth through thoughtful soil preparation, watering and crop care.' },
      { name: 'Farm Business Basics', description: 'Estimate costs, reduce waste and plan how farm products can reach customers.' },
    ],
  },
  {
    title: 'Family Wellbeing',
    introduction: 'Learn respectful practices that support healthier relationships and more resilient households.',
    skills: [
      { name: 'Healthy Communication', description: 'Use attentive listening and respectful language in everyday family conversations.' },
      { name: 'Household Planning', description: 'Coordinate responsibilities, priorities and resources through shared planning.' },
      { name: 'Parenting Support', description: 'Explore positive routines and age-appropriate ways to guide and encourage children.' },
    ],
  },
  {
    title: 'Community Development',
    introduction: 'Grow the skills to organise, serve and create positive change together.',
    skills: [
      { name: 'Project Planning', description: 'Turn a community need into clear activities, responsibilities and achievable outcomes.' },
      { name: 'Volunteer Coordination', description: 'Welcome volunteers, match people to useful roles and support a safe team effort.' },
      { name: 'Fundraising & Partnerships', description: 'Present community priorities honestly and build responsible support relationships.' },
    ],
  },
] as const;

type TeacherListing = { id: string; subjects: string; learner_levels: string; languages: string; availability: string; teaching_format: string; teacher: { full_name: string } | null };
type GroupRoom = { id: string; name: string; description: string | null };
type GroupMessage = { id: string; room_id: string; sender_id: string; body: string | null; voice_path: string | null; voice_duration_seconds: number | null; voice_url?: string; created_at: string; sender: { full_name: string; avatar_url: string | null } | null };

function normalizeVoiceMimeType(mimeType: string) {
  const baseType = mimeType.toLowerCase().split(';')[0].trim();
  return ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'].includes(baseType)
    ? baseType
    : 'audio/webm';
}

type HubMode = 'connections' | 'skills';

export function ConnectionHub() {
  return <MemberHub mode="connections" />;
}

export function SkillsExchange() {
  return <MemberHub mode="skills" />;
}

function MemberHub({ mode }: { mode: HubMode }) {
  const [me, setMe] = useState('');
  const [members, setMembers] = useState<ConnectionProfile[]>([]);
  const [connections, setConnections] = useState<MemberConnection[]>([]);
  const [messages, setMessages] = useState<ConnectionMessage[]>([]);
  const [selected, setSelected] = useState('');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [teaching, setTeaching] = useState({ skill: '', experience: '', format: '', availability: '', resources: '' });
  const [submittingSkill, setSubmittingSkill] = useState(false);
  const [teachers, setTeachers] = useState<TeacherListing[]>([]);
  const [teacherProfile, setTeacherProfile] = useState({ subjects: '', learner_levels: '', languages: '', availability: '', teaching_format: '' });
  const [submittingTeacher, setSubmittingTeacher] = useState(false);
  const [groupRooms, setGroupRooms] = useState<GroupRoom[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [groupDraft, setGroupDraft] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingSecondsRef = useRef(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);

  async function load() {
    const { data: auth } = await supabase.auth.getSession();
    const userId = auth.session?.user.id;
    if (!userId) { window.location.hash = '/login'; return; }
    setMe(userId);
    if (mode === 'skills') {
      const teacherListings = await supabase.from('member_teacher_network').select('id, subjects, learner_levels, languages, availability, teaching_format, teacher:profiles!member_teacher_network_member_id_fkey(full_name)').eq('status', 'approved').order('approved_at', { ascending: false });
      if (teacherListings.error) setNotice('The Skills Exchange Programme could not be loaded. Please try again.');
      else setTeachers((teacherListings.data ?? []) as unknown as TeacherListing[]);
    } else {
      const [profiles, links, rooms] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url, role').eq('is_active', true).neq('id', userId).order('full_name'),
        supabase.from('member_connections').select('id, requester_id, recipient_id, status, created_at, requester:profiles!member_connections_requester_id_fkey(id, full_name, avatar_url, role), recipient:profiles!member_connections_recipient_id_fkey(id, full_name, avatar_url, role)').order('created_at', { ascending: false }),
        supabase.from('connection_group_rooms').select('id, name, description').eq('is_active', true).order('created_at'),
      ]);
      if (profiles.error || links.error || rooms.error) setNotice('The Connection Hub could not be loaded. Please try again.');
      else {
        setMembers((profiles.data ?? []) as ConnectionProfile[]);
        setConnections((links.data ?? []) as unknown as MemberConnection[]);
        setGroupRooms((rooms.data ?? []) as GroupRoom[]);
        setSelectedGroup((current) => current || rooms.data?.[0]?.id || '');
      }
    }
    setLoading(false);
  }

  async function joinTeacherNetwork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmittingTeacher(true);
    const { error } = await supabase.from('member_teacher_network').insert({ member_id: me, ...teacherProfile });
    setSubmittingTeacher(false);
    if (error) setNotice(error.message); else {
      setTeacherProfile({ subjects: '', learner_levels: '', languages: '', availability: '', teaching_format: '' });
      setNotice('Thank you. Your teacher profile will be listed after approval.');
    }
  }

  useEffect(() => { void load(); }, [mode]);
  useEffect(() => {
    if (mode !== 'connections') return;
    if (!selected) { setMessages([]); return; }
    void supabase.from('connection_messages').select('*').eq('connection_id', selected).order('created_at').then(({ data, error }) => {
      if (error) setNotice('Messages could not be loaded.'); else setMessages((data ?? []) as ConnectionMessage[]);
      if (!error) void supabase.rpc('mark_connection_messages_read', { target_connection_id: selected });
    });
  }, [mode, selected]);

  async function loadGroupMessages(roomId: string) {
    const { data, error } = await supabase.from('connection_group_messages')
      .select('id, room_id, sender_id, body, voice_path, voice_duration_seconds, created_at, sender:profiles!connection_group_messages_sender_id_fkey(full_name, avatar_url)')
      .eq('room_id', roomId).is('deleted_at', null).order('created_at');
    if (error) { setNotice('Group messages could not be loaded. Please try again.'); return; }
    const signedMessages = await Promise.all(((data ?? []) as unknown as GroupMessage[]).map(async (message) => {
      if (!message.voice_path) return message;
      const signed = await supabase.storage.from('connection-voice-notes').createSignedUrl(message.voice_path, 900);
      return { ...message, voice_url: signed.data?.signedUrl };
    }));
    setGroupMessages(signedMessages);
  }

  useEffect(() => {
    if (mode !== 'connections' || !selectedGroup) { setGroupMessages([]); return; }
    void loadGroupMessages(selectedGroup);
    const channel = supabase.channel(`connection-group-${selectedGroup}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connection_group_messages', filter: `room_id=eq.${selectedGroup}` }, () => { void loadGroupMessages(selectedGroup); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [mode, selectedGroup]);

  useEffect(() => () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const connectedIds = new Set(connections.filter((item) => item.status !== 'declined').flatMap((item) => [item.requester_id, item.recipient_id]));
  const discover = useMemo(() => members.filter((member) => !connectedIds.has(member.id) && member.full_name.toLowerCase().includes(search.toLowerCase())), [members, connections, search]);
  const accepted = connections.filter((item) => item.status === 'accepted');
  const requests = connections.filter((item) => item.status === 'pending' && item.recipient_id === me);
  const other = (connection: MemberConnection) => connection.requester_id === me ? connection.recipient : connection.requester;

  async function connect(memberId: string) {
    const { error } = await supabase.from('member_connections').insert({ requester_id: me, recipient_id: memberId });
    setNotice(error ? error.message : 'Connection request sent.'); if (!error) await load();
  }
  async function respond(id: string, response: 'accepted' | 'declined') {
    const { error } = await supabase.rpc('respond_to_connection', { target_connection_id: id, response });
    setNotice(error ? error.message : `Request ${response}.`); if (!error) await load();
  }
  async function send(event: FormEvent) {
    event.preventDefault(); if (!draft.trim() || !selected) return;
    const { error } = await supabase.from('connection_messages').insert({ connection_id: selected, sender_id: me, body: draft.trim() });
    if (error) setNotice(error.message); else { setDraft(''); const { data } = await supabase.from('connection_messages').select('*').eq('connection_id', selected).order('created_at'); setMessages((data ?? []) as ConnectionMessage[]); }
  }

  async function sendGroupMessage(event: FormEvent) {
    event.preventDefault();
    if (!groupDraft.trim() || !selectedGroup) return;
    const { error } = await supabase.from('connection_group_messages').insert({ room_id: selectedGroup, sender_id: me, body: groupDraft.trim() });
    if (error) setNotice(error.message);
    else { setGroupDraft(''); await loadGroupMessages(selectedGroup); }
  }

  async function deleteGroupMessage(message: GroupMessage) {
    if (!selectedGroup || message.sender_id !== me) return;
    if (!window.confirm('Delete this message for everyone in the room?')) return;
    const { data: voicePath, error } = await supabase.rpc('delete_own_connection_group_message', { target_message_id: message.id });
    if (error) { setNotice('The message could not be deleted. Please try again.'); return; }
    setGroupMessages((current) => current.filter((item) => item.id !== message.id));
    if (voicePath) {
      const removed = await supabase.storage.from('connection-voice-notes').remove([voicePath]);
      if (removed.error) setNotice('The message was deleted, but its voice-note file could not be removed.');
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  async function startRecording() {
    if (!selectedGroup || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setNotice('Voice recording is not supported by this browser.'); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined);
      recorderRef.current = recorder;
      recordingStreamRef.current = stream;
      recordingChunksRef.current = [];
      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);
      recorder.ondataavailable = (event) => { if (event.data.size) recordingChunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        const duration = Math.max(1, recordingSecondsRef.current || 1);
        // Browsers often report values such as audio/webm;codecs=opus. Supabase
        // bucket MIME allow-lists require the normalized base media type.
        const storageMimeType = normalizeVoiceMimeType(recorder.mimeType || 'audio/webm');
        const blob = new Blob(recordingChunksRef.current, { type: storageMimeType });
        if (!blob.size || blob.size > 5 * 1024 * 1024) { setNotice('Voice notes must be under 5 MB.'); return; }
        setUploadingVoice(true);
        const extension = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
        const path = `${selectedGroup}/${me}/${crypto.randomUUID()}.${extension}`;
        const uploaded = await supabase.storage.from('connection-voice-notes').upload(path, blob, { contentType: storageMimeType, upsert: false });
        if (uploaded.error) setNotice('The voice note could not be uploaded. Please try again.');
        else {
          const inserted = await supabase.from('connection_group_messages').insert({ room_id: selectedGroup, sender_id: me, voice_path: path, voice_duration_seconds: Math.min(duration, 120) });
          if (inserted.error) { await supabase.storage.from('connection-voice-notes').remove([path]); setNotice(inserted.error.message); }
          else await loadGroupMessages(selectedGroup);
        }
        setUploadingVoice(false);
      };
      recorder.start(1000);
      setRecording(true);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((seconds) => {
        const next = Math.min(seconds + 1, 120);
        recordingSecondsRef.current = next;
        if (next >= 120) stopRecording();
        return next;
      }), 1000);
    } catch {
      setNotice('Microphone permission is required to record a voice note.');
    }
  }

  async function volunteerToTeach(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingSkill(true);
    const { error } = await supabase.from('skill_teaching_submissions').insert({ member_id: me, ...teaching });
    setSubmittingSkill(false);
    if (error) setNotice(error.message);
    else {
      setTeaching({ skill: '', experience: '', format: '', availability: '', resources: '' });
      setNotice('Thank you for volunteering. Your submission is awaiting approval before publication.');
    }
  }

  if (loading) return <section className="connection-state">Opening {mode === 'skills' ? 'the Skills Exchange Programme' : 'the Connection Hub'}…</section>;
  return <section className="connection-page">
    <header className="connection-header"><div><p className="eyebrow">MySANGAJOR Digital Village</p><h1>{mode === 'skills' ? 'Skills Exchange Programme' : 'SANGAJOR Connection Hub'}</h1><p>{mode === 'skills' ? 'Learn practical skills, find approved tutors or volunteer to share what you know.' : 'Reconnect safely, grow your network and have private conversations with fellow members.'}</p></div><a className="secondary-button" href="#/dashboard">Back to dashboard</a></header>
    {notice && <p className="connection-notice" role="status">{notice}</p>}
    {mode === 'skills' && <section className="skills-exchange" aria-labelledby="skills-exchange-title">
      <div className="hub-package-heading"><p className="eyebrow">Learn, share and grow</p><h2 id="skills-exchange-title">Skills Learning &amp; Exchange</h2><p>Build practical knowledge or help another member grow by sharing what you know.</p></div>
      <div className="skill-pathways">
        <article className="skill-pathway learn-pathway"><BookOpen aria-hidden="true"/><h3>Learn a Skill</h3><p>Explore learning areas supported by community knowledge, trusted resources and approved volunteer teachers.</p><div className="learning-formats" aria-label="Certificate availability by learning format"><div><strong>Structured courses</strong><span className="certificate-badge"><Award size={15} aria-hidden="true"/> Certificate of Completion Available</span></div><div><strong>Workshops</strong><span className="certificate-badge participation"><Award size={15} aria-hidden="true"/> Certificate of Participation Available</span></div></div>
          <div className="learning-categories">{learningCategories.map((category) => <section className={'pathways' in category ? 'education-category' : ''} key={category.title}><h4>{category.title}</h4><p className="category-introduction">{category.introduction}</p>{'pathways' in category ? <div className="education-pathways">{category.pathways.map((pathway) => <div key={pathway.title}><h5>{pathway.title}</h5><ul>{pathway.skills.map((skill) => <CourseCard key={skill.name} skill={skill}/>)}</ul></div>)}</div> : <ul>{category.skills.map((skill) => <CourseCard key={skill.name} skill={skill}/>)}</ul>}</section>)}</div>
        </article>
        <article className="skill-pathway teach-pathway"><GraduationCap aria-hidden="true"/><h3>Teach a Skill</h3><p>Volunteer to share practical knowledge with fellow SANGAJOR members. Tell us how you can help.</p>
          <form onSubmit={volunteerToTeach}>
            <label>Skill you can teach<input required maxLength={120} value={teaching.skill} onChange={(event) => setTeaching({ ...teaching, skill: event.target.value })}/></label>
            <label>Your experience<textarea required maxLength={1000} value={teaching.experience} onChange={(event) => setTeaching({ ...teaching, experience: event.target.value })}/></label>
            <label>Teaching format<input required maxLength={120} placeholder="Online, in person or small group" value={teaching.format} onChange={(event) => setTeaching({ ...teaching, format: event.target.value })}/></label>
            <label>Availability<input required maxLength={200} placeholder="Days and times that work for you" value={teaching.availability} onChange={(event) => setTeaching({ ...teaching, availability: event.target.value })}/></label>
            <label>Supporting resources<textarea required maxLength={1000} placeholder="Materials, links, equipment or notes you can provide" value={teaching.resources} onChange={(event) => setTeaching({ ...teaching, resources: event.target.value })}/></label>
            <p className="approval-note">All submissions require approval before publication.</p>
            <button className="primary-button" disabled={submittingSkill}>{submittingSkill ? 'Submitting…' : 'Volunteer to teach'}</button>
          </form>
        </article>
      </div>
      <div className="certificate-information">
        <section className="certificate-requirements" aria-labelledby="certificate-requirements-title"><div className="certificate-section-heading"><CheckCircle2 aria-hidden="true"/><div><p className="eyebrow">Clear completion pathway</p><h3 id="certificate-requirements-title">Certificate requirements</h3></div></div><p>Certificates are only issued after the applicable requirements have been checked and approved.</p><dl><div><dt>Lessons</dt><dd>Complete all required course lessons.</dd></div><div><dt>Attendance</dt><dd>Meet the stated course or workshop attendance requirement.</dd></div><div><dt>Quiz or assignment</dt><dd>Pass any required quiz or submit the required assignment.</dd></div><div><dt>Approval</dt><dd>A tutor verifies the learning evidence; only the current active Chairman gives final certificate approval.</dd></div></dl><p className="certificate-safeguard">Opening a lesson, link or resource does not complete a course and will never automatically issue a certificate.</p></section>
        <section className="my-certificates" aria-labelledby="my-certificates-title"><div className="certificate-section-heading"><Award aria-hidden="true"/><div><p className="eyebrow">Your achievements</p><h3 id="my-certificates-title">My Certificates</h3></div></div><p>Certificates appear here for you to view and download only after final approval by the current active Chairman.</p><div className="certificate-empty"><Download aria-hidden="true"/><strong>View course certificates</strong><span>Open your course dashboard to view an approved certificate number or follow its approval status.</span><a href="#/dashboard/learning/digital-income">Open course dashboard</a></div></section>
      </div>
      <section className="teacher-network" aria-labelledby="teacher-network-title">
        <div className="teacher-network-heading"><GraduationCap aria-hidden="true"/><div><p className="eyebrow">Approved member educators</p><h3 id="teacher-network-title">Member Teacher Network</h3><p>Members with teaching experience can offer respectful learning support. Profiles only appear here after Association approval.</p></div></div>
        {teachers.length > 0 ? <div className="teacher-listings">{teachers.map((teacher) => <article key={teacher.id}><h4>{teacher.teacher?.full_name ?? 'Approved member teacher'}</h4><dl><div><dt>Subjects</dt><dd>{teacher.subjects}</dd></div><div><dt>Learner levels</dt><dd>{teacher.learner_levels}</dd></div><div><dt><Languages size={15}/> Languages</dt><dd>{teacher.languages}</dd></div><div><dt>Availability</dt><dd>{teacher.availability}</dd></div><div><dt>Teaching format</dt><dd>{teacher.teaching_format}</dd></div></dl></article>)}</div> : <p className="connection-empty">Approved teacher profiles will appear here as the network grows.</p>}
        <form className="teacher-network-form" onSubmit={joinTeacherNetwork}><h4>Apply to join the network</h4><p>Share your teaching profile for review. Please describe the learners you support by level or learning goal—never by a negative label.</p><div>
          <label>Subjects<input required maxLength={300} value={teacherProfile.subjects} onChange={(event) => setTeacherProfile({ ...teacherProfile, subjects: event.target.value })}/></label><label>Learner levels<input required maxLength={300} placeholder="For example: foundational, primary, secondary or adult learning" value={teacherProfile.learner_levels} onChange={(event) => setTeacherProfile({ ...teacherProfile, learner_levels: event.target.value })}/></label><label>Languages<input required maxLength={300} value={teacherProfile.languages} onChange={(event) => setTeacherProfile({ ...teacherProfile, languages: event.target.value })}/></label><label>Availability<input required maxLength={300} value={teacherProfile.availability} onChange={(event) => setTeacherProfile({ ...teacherProfile, availability: event.target.value })}/></label><label>Teaching format<input required maxLength={120} placeholder="Online, in person or blended" value={teacherProfile.teaching_format} onChange={(event) => setTeacherProfile({ ...teacherProfile, teaching_format: event.target.value })}/></label>
        </div><p className="approval-note">For learner safety and trust, the Association reviews every profile before it is listed.</p><button className="primary-button" disabled={submittingTeacher}>{submittingTeacher ? 'Submitting…' : 'Submit teacher profile'}</button></form>
      </section>
    </section>}
    {mode === 'connections' && <>
    <section className="group-chat" aria-labelledby="group-chat-title">
      <div className="group-chat-heading"><div><p className="eyebrow">Member communication</p><h2 id="group-chat-title"><Users size={22}/> Group rooms</h2><p>Join respectful conversations with active Association members. Voice notes are limited to two minutes.</p></div></div>
      {groupRooms.length ? <div className="group-chat-layout">
        <nav className="group-room-list" aria-label="Group rooms">{groupRooms.map((room) => <button className={selectedGroup === room.id ? 'selected' : ''} type="button" key={room.id} onClick={() => setSelectedGroup(room.id)}><strong>{room.name}</strong><span>{room.description}</span></button>)}</nav>
        <div className="group-conversation">
          <h3>{groupRooms.find((room) => room.id === selectedGroup)?.name ?? 'Group conversation'}</h3>
          <div className="group-message-list" aria-live="polite">{groupMessages.length ? groupMessages.map((message) => <article className={message.sender_id === me ? 'mine' : ''} key={message.id}><strong>{message.sender?.full_name ?? 'Association member'}</strong>{message.body && <p>{message.body}</p>}{message.voice_url && <audio controls preload="metadata" src={message.voice_url}>Your browser cannot play this voice note.</audio>}<div className="group-message-meta"><time>{new Date(message.created_at).toLocaleString()}</time>{message.sender_id === me && <button type="button" onClick={() => void deleteGroupMessage(message)} aria-label="Delete this message"><Trash2 size={14} aria-hidden="true"/> Delete</button>}</div></article>) : <p className="connection-empty">No messages yet. Start the group conversation respectfully.</p>}</div>
          <form className="group-message-form" onSubmit={sendGroupMessage}><label htmlFor="group-message">Message</label><textarea id="group-message" maxLength={2000} value={groupDraft} onChange={(event) => setGroupDraft(event.target.value)} placeholder="Write a message to the group"/><div><button className="primary-button" disabled={!groupDraft.trim()}>Send message</button>{recording ? <button className="voice-button recording" type="button" onClick={stopRecording}><Square size={17}/> Stop · {recordingSeconds}s</button> : <button className="voice-button" type="button" onClick={() => void startRecording()} disabled={uploadingVoice}><Mic size={18}/> {uploadingVoice ? 'Uploading…' : 'Record voice note'}</button>}</div></form>
        </div>
      </div> : <p className="connection-empty">No active group rooms are available yet.</p>}
    </section>
    {requests.length > 0 && <section><h2><UserPlus size={21}/> Connection requests</h2><div className="connection-cards">{requests.map((item) => <article key={item.id}><Avatar profile={item.requester}/><div><strong>{item.requester.full_name}</strong><span>{item.requester.role.replaceAll('_', ' ')}</span></div><div className="connection-actions"><button onClick={() => respond(item.id, 'accepted')}>Accept</button><button onClick={() => respond(item.id, 'declined')}>Decline</button></div></article>)}</div></section>}
    <div className="connection-layout"><section><h2><UserCheck size={21}/> My connections</h2>{accepted.length ? <div className="connection-cards">{accepted.map((item) => <article className={selected === item.id ? 'selected' : ''} key={item.id}><Avatar profile={other(item)}/><div><strong>{other(item).full_name}</strong><span>{other(item).role.replaceAll('_', ' ')}</span></div><button aria-label={`Message ${other(item).full_name}`} onClick={() => setSelected(item.id)}><MessageCircle size={19}/></button></article>)}</div> : <p className="connection-empty">Accepted connections will appear here.</p>}</section>
      <section className="conversation"><h2>Private conversation</h2>{selected ? <><div className="message-list" aria-live="polite">{messages.length ? messages.map((message) => <p className={message.sender_id === me ? 'mine' : ''} key={message.id}>{message.body}<time>{new Date(message.created_at).toLocaleString()}</time></p>) : <span>Start the conversation with a friendly hello.</span>}</div><form onSubmit={send}><label htmlFor="connection-message">Message</label><textarea id="connection-message" maxLength={2000} required value={draft} onChange={(event) => setDraft(event.target.value)}/><button className="primary-button">Send message</button></form></> : <p className="connection-empty">Choose a connection to view your conversation.</p>}</section></div>
    <section><h2><Search size={21}/> Discover members</h2><label className="member-search"><span>Search by name</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a classmate"/></label><div className="connection-cards discover">{discover.map((member) => <article key={member.id}><Avatar profile={member}/><div><strong>{member.full_name}</strong><span>{member.role.replaceAll('_', ' ')}</span></div><button onClick={() => connect(member.id)}>Connect</button></article>)}</div>{!discover.length && <p className="connection-empty">No new members match your search.</p>}</section></>}
  </section>;
}

function CourseCard({ skill }: { skill: { readonly name: string; readonly description: string } }) {
  const lessonHref = skill.name === 'Digital Income & Online Work' ? '#/dashboard/learning/digital-income' : skill.name === 'Everyday Digital & Technology Skills' ? '#/dashboard/learning/everyday-digital-technology-skills' : null;
  return <li className="course-card"><strong>{skill.name}</strong><span>{skill.description}</span><span className="certificate-badge"><Award size={15} aria-hidden="true"/> Certificate of Completion Available</span><small>A Certificate of Completion will be issued after you complete all required lessons and meet the course requirements.</small>{lessonHref && <a className="course-link" href={lessonHref}>Open Lesson 1 & course dashboard</a>}</li>;
}

function Avatar({ profile }: { profile: ConnectionProfile }) {
  return profile.avatar_url ? <img className="connection-avatar" src={profile.avatar_url} alt="" loading="lazy" decoding="async"/> : <span className="connection-avatar fallback" aria-hidden="true">{profile.full_name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>;
}
