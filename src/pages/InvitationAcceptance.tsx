import { FormEvent, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import './Auth.css';

export function InvitationAcceptance() {
  const token = useMemo(() => new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('token'), []);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState(token ? '' : 'This invitation link is invalid.');
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  async function accept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    if (password !== confirmPassword) return setMessage('Passwords do not match.');
    setLoading(true);
    setMessage('');
    const { data, error } = await supabase.functions.invoke('accept-invitation', { body: { token, password } });
    setLoading(false);
    if (error || !data?.access_token) {
      setMessage(data?.error ?? error?.message ?? 'This invitation is invalid or has expired.');
      return;
    }
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (sessionError) return setMessage(sessionError.message);
    setAccepted(true);
  }

  return <section className="auth-page"><div className="auth-card">
    <p className="eyebrow">Member invitation</p>
    <h1>{accepted ? 'Welcome to SANGAJOR' : 'Activate your account'}</h1>
    {accepted ? <><p>Your account is active. Complete your member profile to get started.</p><a className="primary-button auth-submit" href="#/dashboard/profile">Complete profile</a></> : <form onSubmit={accept}>
      <p className="auth-intro">Create a secure password to accept your invitation.</p>
      <label>Password<input type="password" minLength={8} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <label>Confirm password<input type="password" minLength={8} required autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
      {message && <div className="auth-message" role="alert">{message}</div>}
      <button className="primary-button auth-submit" disabled={loading || !token}>{loading ? 'Activating…' : 'Activate account'}</button>
    </form>}
  </div></section>;
}
