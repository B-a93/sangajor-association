import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import './Finance.css';

type Period = { id: string; name: string; amount: number; currency: string; due_date: string; is_active: boolean };
type Payment = { id: string; period_id: string; amount: number; paid_at: string; payment_method: string; reference: string | null; dues_periods: { name: string; currency: string } | null };

const money = (amount: number, currency = 'GMD') => new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);

export function MemberDues() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) { window.location.hash = '/login'; return; }
    const [periodResult, paymentResult] = await Promise.all([
      supabase.from('dues_periods').select('id, name, amount, currency, due_date, is_active').order('due_date', { ascending: false }),
      supabase.from('dues_payments').select('id, period_id, amount, paid_at, payment_method, reference, dues_periods(name, currency)').order('paid_at', { ascending: false }),
    ]);
    if (periodResult.error || paymentResult.error) setMessage('Your dues information could not be loaded. Please try again.');
    else { setPeriods((periodResult.data ?? []) as Period[]); setPayments((paymentResult.data ?? []) as unknown as Payment[]); }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const paidByPeriod = useMemo(() => payments.reduce<Record<string, number>>((totals, payment) => ({ ...totals, [payment.period_id]: (totals[payment.period_id] ?? 0) + Number(payment.amount) }), {}), [payments]);
  const outstanding = periods.filter((period) => period.is_active).reduce((sum, period) => sum + Math.max(0, Number(period.amount) - (paidByPeriod[period.id] ?? 0)), 0);
  if (loading) return <section className="finance-state">Loading your contributions…</section>;
  return <section className="finance-page">
    <header className="finance-header"><div><p className="eyebrow">Membership contributions</p><h1>My Dues</h1><p>Review your obligations and complete payment history.</p></div><a className="secondary-button" href="#/dashboard">Back to dashboard</a></header>
    {message && <p className="finance-message" role="alert">{message}</p>}
    <div className="finance-summary"><article><span>Outstanding</span><strong>{money(outstanding)}</strong></article><article><span>Total paid</span><strong>{money(payments.reduce((sum, item) => sum + Number(item.amount), 0))}</strong></article><article><span>Receipts</span><strong>{payments.length}</strong></article></div>
    <h2>Contribution status</h2><div className="dues-cards">{periods.map((period) => { const paid = paidByPeriod[period.id] ?? 0; const balance = Math.max(0, Number(period.amount) - paid); return <article key={period.id}><div><strong>{period.name}</strong><span>Due {new Date(`${period.due_date}T00:00:00`).toLocaleDateString()}</span></div><span className={`dues-badge ${balance === 0 ? 'paid' : paid > 0 ? 'partial' : 'due'}`}>{balance === 0 ? 'Paid' : paid > 0 ? 'Part paid' : 'Due'}</span><dl><div><dt>Amount</dt><dd>{money(Number(period.amount), period.currency)}</dd></div><div><dt>Paid</dt><dd>{money(paid, period.currency)}</dd></div><div><dt>Balance</dt><dd>{money(balance, period.currency)}</dd></div></dl></article>; })}{periods.length === 0 && <p>No dues periods have been published yet.</p>}</div>
    <h2>Payment history</h2><div className="finance-table-wrap"><table><thead><tr><th>Date</th><th>Period</th><th>Method</th><th>Reference</th><th>Amount</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td>{new Date(payment.paid_at).toLocaleDateString()}</td><td>{payment.dues_periods?.name ?? 'Dues'}</td><td>{payment.payment_method.replaceAll('_', ' ')}</td><td>{payment.reference || '—'}</td><td>{money(Number(payment.amount), payment.dues_periods?.currency)}</td></tr>)}</tbody></table>{payments.length === 0 && <p className="finance-empty">No payments have been recorded.</p>}</div>
  </section>;
}
