import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { normalizeExecutiveOffice, roleLabel, type AppRole } from '../lib/executiveAccess';
import { supabase } from '../lib/supabase';
import './ExecutiveOfficeProgress.css';

type TaskStatus = 'pending' | 'ongoing' | 'completed';
type OfficeTask = {
  id: string;
  office: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  progress_percent: number;
  due_date: string | null;
  updated_at: string;
};

const statusLabels: Record<TaskStatus, string> = { pending: 'Pending', ongoing: 'Ongoing', completed: 'Completed' };

export function ExecutiveOfficeProgress() {
  const [session, setSession] = useState<Session | null>(null);
  const [office, setOffice] = useState<AppRole>('member');
  const [tasks, setTasks] = useState<OfficeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', dueDate: '' });

  async function loadTasks() {
    const result = await supabase.from('executive_office_tasks')
      .select('id, office, title, description, status, progress_percent, due_date, updated_at')
      .order('updated_at', { ascending: false });
    if (result.error) setError('Executive office progress could not be loaded. Please try again.');
    else { setTasks((result.data ?? []) as OfficeTask[]); setError(''); }
    setLoading(false);
  }

  useEffect(() => {
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.hash = '/login'; return; }
      setSession(data.session);
      const officeResult = await supabase.rpc('active_executive_office');
      const activeOffice = normalizeExecutiveOffice(officeResult.data);
      if (officeResult.error || activeOffice === 'member') {
        setError('Only active executive officers can view the Executive Work Register.');
        setLoading(false);
        return;
      }
      setOffice(activeOffice);
      await loadTasks();
    });
  }, []);

  const totals = useMemo(() => ({
    pending: tasks.filter((task) => task.status === 'pending').length,
    ongoing: tasks.filter((task) => task.status === 'ongoing').length,
    completed: tasks.filter((task) => task.status === 'completed').length,
  }), [tasks]);

  const grouped = useMemo(() => Object.entries(tasks.reduce<Record<string, OfficeTask[]>>((result, task) => {
    (result[task.office] ??= []).push(task); return result;
  }, {})).sort(([left], [right]) => left.localeCompare(right)), [tasks]);

  async function createTask(event: FormEvent) {
    event.preventDefault();
    if (!session || office === 'member' || saving) return;
    setSaving(true); setError('');
    const result = await supabase.from('executive_office_tasks').insert({
      office, title: form.title.trim(), description: form.description.trim() || null,
      due_date: form.dueDate || null, created_by: session.user.id, updated_by: session.user.id,
    });
    if (result.error) setError('The task could not be added. Confirm that your executive office is active and try again.');
    else { setForm({ title: '', description: '', dueDate: '' }); await loadTasks(); }
    setSaving(false);
  }

  async function updateTask(task: OfficeTask, status: TaskStatus, progress: number) {
    if (!session) return;
    const result = await supabase.from('executive_office_tasks').update({
      status, progress_percent: progress, updated_by: session.user.id,
    }).eq('id', task.id);
    if (result.error) setError('This task could not be updated. You may only update your own office tasks unless you have executive oversight.');
    else await loadTasks();
  }

  if (loading) return <section className="office-progress-state">Preparing the Executive Work Register…</section>;

  return <section className="office-progress-page">
    <header className="office-progress-header"><div><p className="eyebrow">Executive collaboration</p><h1>Executive Work Register</h1><p>Shared visibility across every office—completed, ongoing and pending work in one place.</p></div><a className="secondary-button" href="#/dashboard">Back to dashboard</a></header>
    {error && <p className="office-progress-alert" role="alert">{error}</p>}
    {office !== 'member' && <>
      <div className="office-progress-summary"><article><span>Pending</span><strong>{totals.pending}</strong></article><article><span>Ongoing</span><strong>{totals.ongoing}</strong></article><article><span>Completed</span><strong>{totals.completed}</strong></article><article><span>Total tasks</span><strong>{tasks.length}</strong></article></div>
      <form className="office-task-form" onSubmit={createTask}><div><p className="eyebrow">{roleLabel(office)} office</p><h2>Add an office task</h2></div><label>Task title<input required minLength={3} maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>Due date<input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label><label className="office-task-description">Description<textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add task'}</button></form>
      <div className="office-progress-groups">{grouped.length === 0 ? <p className="office-progress-empty">No office tasks have been recorded yet. Add the first task above.</p> : grouped.map(([taskOffice, officeTasks]) => <section key={taskOffice} className="office-progress-group"><div className="office-progress-group-heading"><h2>{roleLabel(normalizeExecutiveOffice(taskOffice))}</h2><span>{officeTasks.length} task{officeTasks.length === 1 ? '' : 's'}</span></div><div className="office-task-grid">{officeTasks.map((task) => <article key={task.id} className="office-task-card"><div className="office-task-card-heading"><span className={`office-status office-status-${task.status}`}>{statusLabels[task.status]}</span><small>{new Date(task.updated_at).toLocaleDateString()}</small></div><h3>{task.title}</h3>{task.description && <p>{task.description}</p>}<div className="office-progress-track" aria-label={`${task.progress_percent}% complete`}><span style={{ width: `${task.progress_percent}%` }} /></div><div className="office-task-meta"><span>{task.progress_percent}% complete</span><span>{task.due_date ? `Due ${new Date(`${task.due_date}T00:00:00`).toLocaleDateString()}` : 'No due date'}</span></div><div className="office-task-actions"><button type="button" onClick={() => void updateTask(task, 'pending', 0)}>Pending</button><button type="button" onClick={() => void updateTask(task, 'ongoing', Math.max(10, task.progress_percent || 50))}>Ongoing</button><button type="button" onClick={() => void updateTask(task, 'completed', 100)}>Complete</button></div></article>)}</div></section>)}</div>
    </>}
  </section>;
}
