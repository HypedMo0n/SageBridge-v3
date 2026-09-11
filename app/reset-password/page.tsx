'use client';

import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useState } from 'react';
import { auth } from '@/lib/firebase';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage('If an account exists for that email, a reset link is on its way.');
    } catch {
      setMessage('We could not send a reset email. Check the address and try again.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="auth-shell"><section className="auth-card"><p className="kicker">Account recovery</p><h1>Reset your password</h1><p className="notice">We’ll send a secure reset link to your email.</p>{message && <div className="notice-box" role="status">{message}</div>}<form className="auth-form" onSubmit={submit}><label>Email<input className="auth-input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button></form><Link className="auth-link" href="/login">Back to sign in</Link></section></div>;
}
