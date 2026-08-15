import { FormEvent, useState } from 'react';
import { supabase } from '../lib/supabase';
import { applicationUrl } from '../config/site';
import './Auth.css';

type Mode = 'login' | 'reset';

export function Auth() {
  const [mode, setMode] = useState<Mode>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.functions.invoke('member-login', {
          body: { identifier: identifier.trim(), password },
        });
        if (error || data?.error || !data?.access_token) throw new Error(data?.error ?? 'The login details are incorrect.');
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (sessionError) throw sessionError;
        window.location.hash = '/dashboard';
      }

      if (mode === 'reset') {
        const email = identifier.trim().toLowerCase();
        if (!email.includes('@')) {
          throw new Error('Phone password recovery requires SMS service. For now, contact an executive to reset a phone-only account.');
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: applicationUrl('/#/dashboard'),
        });
        if (error) throw error;
        setMessage('Password reset instructions have been sent to your email.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">MySANGAJOR Digital Village</p>
        <h1>{mode === 'login' ? 'Member sign in' : 'Reset your password'}</h1>
        <p className="auth-intro">Access is invitation-only. Sign in to your member portal or reset your password.</p>

        <form onSubmit={handleSubmit}>
          <label>
            {mode === 'login' ? 'Email address or membership number' : 'Email address'}
            <input
              type={mode === 'login' ? 'text' : 'email'}
              inputMode={mode === 'login' ? 'email' : undefined}
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder={mode === 'login' ? 'Email or SBC-2026-00010' : 'Your email address'}
              required
              autoComplete="username"
            />
            {mode === 'login' && <small>Members without email should use the membership number issued during activation.</small>}
          </label>

          {mode !== 'reset' && (
            <label>
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="current-password" />
            </label>
          )}

          {message && <div className="auth-message" role="status">{message}</div>}

          <button className="primary-button auth-submit" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Send reset link'}
          </button>
        </form>

        <div className="auth-links">
          {mode !== 'login' && <button type="button" onClick={() => setMode('login')}>Back to sign in</button>}
          {mode === 'login' && <button type="button" onClick={() => setMode('reset')}>Forgot password?</button>}
        </div>
      </div>
    </section>
  );
}
