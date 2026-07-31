import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { ExecutiveAnalyticsData, MonthlyActivity } from '../types/analytics';
import './ExecutiveAnalytics.css';

const ranges = [30, 90, 365];
const number = new Intl.NumberFormat('en');
const currency = new Intl.NumberFormat('en-GM', { style: 'currency', currency: 'GMD', maximumFractionDigits: 0 });

function ActivityChart({ activity }: { activity: MonthlyActivity[] }) {
  const maximum = Math.max(1, ...activity.flatMap((item) => [item.members, item.payments]));
  return <div className="analytics-chart" role="img" aria-label="New members and dues payments over the last six months">
    {activity.map((item) => <div className="analytics-chart-group" key={item.month}>
      <div className="analytics-bars">
        <span className="member-bar" style={{ height: `${Math.max(4, item.members / maximum * 100)}%` }} title={`${item.members} new members`} />
        <span className="payment-bar" style={{ height: `${Math.max(4, item.payments / maximum * 100)}%` }} title={`${item.payments} payments`} />
      </div>
      <small>{item.month}</small>
    </div>)}
  </div>;
}

export function ExecutiveAnalytics() {
  const [session, setSession] = useState<Session | null>(null);
  const [days, setDays] = useState(30);
  const [data, setData] = useState<ExecutiveAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { void supabase.auth.getSession().then(({ data: auth }) => {
    setSession(auth.session); if (!auth.session) window.location.hash = '/login';
  }); }, []);

  useEffect(() => {
    if (!session) return;
    setLoading(true); setError('');
    void supabase.rpc('executive_analytics', { range_days: days }).then(({ data: result, error: requestError }) => {
      if (requestError) setError(requestError.message.includes('authorised') ? 'You do not have permission to view executive analytics.' : 'Analytics could not be loaded. Please try again.');
      else setData(result as ExecutiveAnalyticsData);
      setLoading(false);
    });
  }, [days, session]);

  const engagementTotal = useMemo(() => data ? Object.values(data.engagement).reduce((sum, value) => sum + value, 0) : 0, [data]);

  function downloadReport() {
    if (!data) return;
    const rows = [['Metric', `Last ${data.rangeDays} days`], ['Active members', data.members.total], ['New members', data.members.new], ['Dues collected (GMD)', data.finance.collected], ['Dues payments', data.finance.payments], ['Event responses', data.engagement.eventResponses], ['Village posts', data.engagement.villagePosts], ['Volunteer applications', data.engagement.volunteerApplications], ['Announcement reads', data.engagement.announcementReads]];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = `sangajor-executive-report-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
  }

  if (!session || loading) return <section className="analytics-state" aria-live="polite">Preparing executive intelligence…</section>;
  if (error || !data) return <section className="analytics-state" role="alert"><h1>Analytics unavailable</h1><p>{error}</p><a href="#/dashboard">Return to dashboard</a></section>;

  return <section className="executive-analytics">
    <header className="analytics-header"><div><p className="eyebrow">Executive intelligence</p><h1>Association health at a glance</h1><p>Aggregated insights for informed, privacy-conscious decisions.</p></div><div className="analytics-actions"><label>Reporting period<select value={days} onChange={(event) => setDays(Number(event.target.value))}>{ranges.map((range) => <option value={range} key={range}>Last {range} days</option>)}</select></label><button className="primary-button" type="button" onClick={downloadReport}>Export CSV</button></div></header>
    <div className="analytics-kpis">
      <article><span>Active membership</span><strong>{number.format(data.members.total)}</strong><small>+{number.format(data.members.new)} in this period</small></article>
      <article><span>Dues collected</span><strong>{currency.format(data.finance.collected)}</strong><small>{number.format(data.finance.payments)} recorded payments</small></article>
      <article><span>Community engagement</span><strong>{number.format(engagementTotal)}</strong><small>Meaningful actions this period</small></article>
      <article><span>Participation signal</span><strong>{number.format(data.engagement.eventResponses + data.engagement.volunteerApplications)}</strong><small>Event responses and volunteers</small></article>
    </div>
    <div className="analytics-panels"><article><div className="panel-heading"><div><h2>Six-month momentum</h2><p>Member growth and contribution activity</p></div><div className="chart-legend"><span>Members</span><span>Payments</span></div></div><ActivityChart activity={data.monthlyActivity} /></article><article><h2>Engagement mix</h2><dl className="engagement-list"><div><dt>Event responses</dt><dd>{number.format(data.engagement.eventResponses)}</dd></div><div><dt>Village posts</dt><dd>{number.format(data.engagement.villagePosts)}</dd></div><div><dt>Announcement reads</dt><dd>{number.format(data.engagement.announcementReads)}</dd></div><div><dt>Volunteer applications</dt><dd>{number.format(data.engagement.volunteerApplications)}</dd></div></dl></article></div>
    <footer className="analytics-footnote">Updated {new Date(data.generatedAt).toLocaleString()}. Figures are aggregated and contain no member-level personal information.</footer>
  </section>;
}
