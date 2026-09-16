'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { auth } from '@/lib/firebase';

const AUTH_ERRORS: Record<string, string> = {
  'auth/email-already-in-use': 'An account already exists for this email.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/weak-password': 'Use a stronger password with at least 8 characters.',
};

function authMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  return AUTH_ERRORS[code] || 'We could not complete that request. Please try again.';
}

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'signup') {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await sendEmailVerification(credential.user);
        router.replace('/verify-email');
      } else {
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
        router.replace(credential.user.emailVerified ? (search.get('next') || '/onboarding') : '/verify-email');
      }
    } catch (nextError) {
      setError(authMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  const signup = mode === 'signup';
  return (
    <div className="auth-shell">
      <div className="auth-brand"><span className="auth-mark">S</span><span>SageBridge</span></div>
      <section className="auth-card">
        <p className="kicker">External beta</p>
        <h1>{signup ? 'Create your workspace' : 'Welcome back'}</h1>
        <p className="notice">{signup ? 'Use your work email to securely connect Sage 50.' : 'Sign in to your SageBridge workspace.'}</p>
        {error && <div className="error-box" role="alert">{error}</div>}
        <form onSubmit={submit} className="auth-form">
          <label>Email<input className="auth-input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Password<input className="auth-input" type="password" minLength={8} autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</button>
        </form>
        {!signup && <Link className="auth-link" href="/reset-password">Forgot password?</Link>}
        <p className="notice auth-switch">{signup ? 'Already have an account?' : 'New to SageBridge?'} <Link href={signup ? '/login' : '/signup'}>{signup ? 'Sign in' : 'Create account'}</Link></p>
      </section>
    </div>
  );
}
