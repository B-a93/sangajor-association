import { FormEvent, useState } from 'react';
import { supabase } from '../lib/supabase';
import './Auth.css';

type Mode = 'login' | 'register' | 'reset';

export function Auth() {
  const [mode, setMode] = useState<Mode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.hash = '/dashboard';
      }

      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/#/dashboard`,
          },
        });
        if (error) throw error;
        setMessage('Account created. Please check your email to verify your account.');
      }

      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/#/dashboard`,
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
        <h1>{mode === 'login' ? 'Member sign in' : mode === 'register' ? 'Create your account' : 'Reset your password'}</h1>
        <p className="auth-intro">Access your member profile, events, contributions and Association services.</p>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label>
              Full name
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} required autoComplete="name" />
            </label>
          )}

          <label>
            Email address
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          </label>

          {mode !== 'reset' && (
            <label>
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </label>
          )}

          {message && <div className="auth-message" role="status">{message}</div>}

          <button className="primary-button auth-submit" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link'}
          </button>
        </form>

        <div className="auth-links">
          {mode !== 'login' && <button type="button" onClick={() => setMode('login')}>Back to sign in</button>}
          {mode === 'login' && <button type="button" onClick={() => setMode('reset')}>Forgot password?</button>}
          {mode === 'login' && <button type="button" onClick={() => setMode('register')}>Create an account</button>}
        </div>
      </div>
    </section>
  );
}
