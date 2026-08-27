'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Auth } from '../../lib/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('mode') === 'signup' ? 'signup' : 'login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  useEffect(() => {
    Auth.getSession().then(session => {
      if (session) router.replace('/dashboard');
    });
  }, [router]);

  async function handleLogin(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { error: err } = await Auth.signIn(loginEmail, loginPassword);
      if (err) { setError(err.message); return; }
      router.replace('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const { error: err } = await Auth.signUp(signupEmail, signupPassword, signupName);
      if (err) { setError(err.message); return; }
      setSuccess('Account created! Check your email to verify, then log in.');
      setTab('login');
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">duee<span>.</span></div>
        <div className="login-tagline">Your AI-powered student planner</div>

        <div className="login-tabs">
          <button className={'login-tab' + (tab === 'login' ? ' active' : '')} onClick={() => { setTab('login'); setError(''); setSuccess(''); }}>Log In</button>
          <button className={'login-tab' + (tab === 'signup' ? ' active' : '')} onClick={() => { setTab('signup'); setError(''); setSuccess(''); }}>Sign Up</button>
        </div>

        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        {tab === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email</label>
              <input className="form-control" type="email" placeholder="you@school.edu" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input className="form-control" type="password" placeholder="Your password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Logging in…' : 'Log In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup}>
            <div className="form-group">
              <label>Your Name</label>
              <input className="form-control" type="text" placeholder="Alex Johnson" value={signupName} onChange={e => setSignupName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="form-control" type="email" placeholder="you@school.edu" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input className="form-control" type="password" placeholder="At least 8 characters" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required minLength={8} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Creating account…' : 'Create Free Account'}
            </button>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 10 }}>
              By signing up you agree to our terms. No credit card required.
            </p>
          </form>
        )}

        <Link href="/" className="back-home">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to home
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
