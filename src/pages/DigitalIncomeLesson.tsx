import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, LockKeyhole } from 'lucide-react';
import { knowledgeQuestions, lessonSections, PASSING_SCORE, pathwayQuestions } from '../data/digitalIncomeLesson';
import { supabase } from '../lib/supabase';
import './DigitalIncomeLesson.css';

type Answers = Record<string, string>;

export function DigitalIncomeLesson() {
  const [memberId, setMemberId] = useState('');
  const [started, setStarted] = useState(false);
  const [readSections, setReadSections] = useState<string[]>([]);
  const [pathway, setPathway] = useState<Answers>({});
  const [answers, setAnswers] = useState<Answers>({});
  const [submittedScore, setSubmittedScore] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => { void (async () => {
    const { data: auth } = await supabase.auth.getSession();
    const id = auth.session?.user.id;
    if (!id) { window.location.hash = '/login'; return; }
    setMemberId(id);
    await supabase.from('course_enrolments').upsert({ member_id: id, course_slug: 'digital-income-online-work' }, { onConflict: 'member_id,course_slug' });
    const { data, error } = await supabase.from('lesson_progress').select('*').eq('member_id', id).eq('lesson_slug', 'digital-income-lesson-1').maybeSingle();
    if (error) setNotice('Your saved progress could not be loaded. You may still review the lesson.');
    if (data) {
      setStarted(Boolean(data.started_at)); setReadSections(Array.isArray(data.read_sections) ? data.read_sections : []);
      setPathway((data.pathway_answers as Answers) ?? {}); setAnswers((data.knowledge_answers as Answers) ?? {});
      setSubmittedScore(data.knowledge_submitted ? Number(data.knowledge_score) : null); setCompleted(Boolean(data.completed_at));
    }
    setLoading(false);
  })(); }, []);

  const allRead = lessonSections.every(({ id }) => readSections.includes(id));
  const activityComplete = pathwayQuestions.every(({ id }) => pathway[id]?.trim());
  const allAnswered = knowledgeQuestions.every(({ id }) => answers[id] !== undefined);
  const passed = submittedScore !== null && submittedScore >= PASSING_SCORE;
  const canComplete = allRead && activityComplete && passed;
  const progress = Math.round(((readSections.length + (activityComplete ? 1 : 0) + (passed ? 1 : 0)) / (lessonSections.length + 2)) * 100);
  const score = useMemo(() => Math.round(knowledgeQuestions.filter((question) => Number(answers[question.id]) === question.answer).length / knowledgeQuestions.length * 100), [answers]);

  async function save(message = 'Progress saved. You can safely continue later.') {
    if (!memberId || !started) return;
    setSaving(true);
    const { error } = await supabase.from('lesson_progress').upsert({ member_id: memberId, lesson_slug: 'digital-income-lesson-1', started_at: new Date().toISOString(), read_sections: readSections, pathway_answers: pathway, knowledge_answers: answers, knowledge_score: submittedScore ?? 0, knowledge_submitted: submittedScore !== null, updated_at: new Date().toISOString() }, { onConflict: 'member_id,lesson_slug' });
    setSaving(false); setNotice(error ? 'Progress could not be saved. Please try again.' : message);
  }

  async function startLesson() {
    setStarted(true); setSaving(true);
    const { error } = await supabase.from('lesson_progress').upsert({ member_id: memberId, lesson_slug: 'digital-income-lesson-1', started_at: new Date().toISOString() }, { onConflict: 'member_id,lesson_slug' });
    setSaving(false); setNotice(error ? 'The lesson could not be started. Please try again.' : 'Lesson started. Your progress will be saved to your account.');
  }

  async function submitKnowledge() {
    if (!allAnswered) { setNotice('Answer all six knowledge-check questions before submitting.'); return; }
    setSubmittedScore(score); setNotice(score >= PASSING_SCORE ? `Knowledge check passed with ${score}%.` : `You scored ${score}%. Review the lesson and try again; at least 70% is required.`);
    setSaving(true);
    const { error } = await supabase.from('lesson_progress').upsert({ member_id: memberId, lesson_slug: 'digital-income-lesson-1', started_at: new Date().toISOString(), read_sections: readSections, pathway_answers: pathway, knowledge_answers: answers, knowledge_score: score, knowledge_submitted: true, updated_at: new Date().toISOString() }, { onConflict: 'member_id,lesson_slug' });
    setSaving(false); if (error) setNotice('Your result could not be saved. Please submit it again.');
  }

  async function completeLesson() {
    if (!canComplete) { setNotice('Complete every reading, all six pathway responses and a knowledge-check score of at least 70% first.'); return; }
    setSaving(true);
    const { error } = await supabase.rpc('complete_digital_income_lesson_one', { pathway_responses: pathway, section_ids: readSections });
    setSaving(false);
    if (error) setNotice('Completion could not be recorded. Check every requirement and try again.');
    else { setCompleted(true); setNotice('Lesson 1 complete! Lesson 2 is now unlocked.'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }

  if (loading) return <section className="lesson-state" role="status">Loading your lesson…</section>;
  return <section className="lesson-page">
    <header className="lesson-hero"><div><p className="eyebrow">Digital Income &amp; Online Work</p><h1>Lesson 1: Understanding Digital Income and Online Work</h1><p>Learn how common online-work pathways operate, what you need to begin and how to recognise unsafe offers.</p></div><a className="secondary-button" href="#/dashboard/connections">Back to Skills Learning &amp; Exchange</a></header>
    {notice && <p className={completed ? 'lesson-notice success' : 'lesson-notice'} role="status">{notice}</p>}
    <aside className="lesson-progress" aria-label="Lesson requirements"><div><strong>{progress}% ready to complete</strong><span>Progress is saved to your member account.</span></div><progress max="100" value={completed ? 100 : progress}>{progress}%</progress><ul><li className={allRead ? 'done' : ''}>Read all {lessonSections.length} sections</li><li className={activityComplete ? 'done' : ''}>Complete all 6 pathway questions</li><li className={passed ? 'done' : ''}>Score at least 70% on the knowledge check</li></ul></aside>
    {!started ? <div className="lesson-start"><h2>Ready to begin?</h2><p>Select Start Lesson to record your start and reveal the lesson. Opening this page alone does not count as completion.</p><button className="primary-button" onClick={startLesson} disabled={saving}>{saving ? 'Starting…' : 'Start Lesson'}</button></div> : <>
      <main className="lesson-content">
        <div className="lesson-heading"><p className="eyebrow">Part 1</p><h2>Read every section</h2><p>After carefully reading a section, tick its acknowledgement.</p></div>
        {lessonSections.map((section, index) => <article className="lesson-section" key={section.id}><span className="section-number">{index + 1}</span><div><h3>{section.title}</h3><p>{section.body}</p><label className="read-check"><input type="checkbox" checked={readSections.includes(section.id)} onChange={(event) => setReadSections(event.target.checked ? [...readSections, section.id] : readSections.filter((id) => id !== section.id))}/><span>I have read and understood this section</span></label></div></article>)}
        <section className="lesson-activity" aria-labelledby="pathway-title"><p className="eyebrow">Part 2</p><h2 id="pathway-title">Choose your pathway activity</h2><p>There is no single correct pathway. Complete all six prompts to connect this lesson to your situation.</p>{pathwayQuestions.map((question) => <label key={question.id}>{question.label}<span>{question.hint}</span><textarea rows={3} maxLength={1000} value={pathway[question.id] ?? ''} onChange={(event) => setPathway({ ...pathway, [question.id]: event.target.value })}/></label>)}</section>
        <fieldset className="knowledge-check"><legend>Part 3: Knowledge check</legend><p>Answer all six questions. You may review the lesson and try again. A score of at least 70% is required.</p>{knowledgeQuestions.map((question, questionIndex) => <fieldset key={question.id}><legend>{questionIndex + 1}. {question.prompt}</legend>{question.options.map((option, optionIndex) => <label key={option}><input type="radio" name={question.id} value={optionIndex} checked={answers[question.id] === String(optionIndex)} onChange={(event) => { setAnswers({ ...answers, [question.id]: event.target.value }); setSubmittedScore(null); }}/>{option}</label>)}</fieldset>)}<button className="primary-button" type="button" onClick={submitKnowledge} disabled={saving}>{saving ? 'Saving…' : 'Submit Knowledge Check'}</button>{submittedScore !== null && <p className={passed ? 'quiz-result pass' : 'quiz-result'} role="status">Score: <strong>{submittedScore}%</strong> — {passed ? 'Passed' : 'Not yet passed'}</p>}</fieldset>
      </main>
      <div className="lesson-actions"><button className="secondary-button" onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Save and Continue Later'}</button><button className="primary-button" onClick={completeLesson} disabled={saving || completed || !canComplete}>{completed ? 'Lesson Completed' : 'Complete Lesson'}</button>{!canComplete && <p>Complete all three requirements above to enable lesson completion.</p>}</div>
    </>}
    <section className={completed ? 'next-lesson unlocked' : 'next-lesson'} aria-labelledby="lesson-two-title">{completed ? <CheckCircle2 aria-hidden="true"/> : <LockKeyhole aria-hidden="true"/>}<div><p className="eyebrow">{completed ? 'Unlocked' : 'Locked'}</p><h2 id="lesson-two-title">Lesson 2: Choosing a Profitable Digital Skill or Service</h2><p>{completed ? 'Lesson 1 is complete. Continue to the next lesson.' : 'Meet every Lesson 1 requirement to unlock this lesson.'}</p>{completed && <a className="primary-button" href="#/dashboard/learning/digital-income/lesson-2">Next Lesson</a>}</div></section>
  </section>;
}
