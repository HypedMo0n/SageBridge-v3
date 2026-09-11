'use client';

import { reload, sendEmailVerification } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function VerifyEmailPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function check() {
    if (!user) return;
    setBusy(true);
    setMessage('');
    try {
      await reload(user);
      if (user.emailVerified) {
        await user.getIdToken(true);
        router.replace('/onboarding');
      } else setMessage('That email is not verified yet. Open the link in your inbox, then check again.');
    } catch {
      setMessage('Could not check verification. Please try again.');
    } finally { setBusy(false); }
  }

  async function resend() {
    if (!user) return;
    setBusy(true);
    try { await sendEmailVerification(user); setMessage('A new verification email was sent.'); }
    catch { setMessage('Could not resend right now. Wait a moment and try again.'); }
    finally { setBusy(false); }
  }

  return <div className="auth-shell"><section className="auth-card"><p className="kicker">One secure step</p><h1>Verify your email</h1><p className="notice">We sent a verification link to <strong>{user?.email}</strong>. You must verify it before company data can be accessed.</p>{message && <div className="notice-box" role="status">{message}</div>}<div className="stack"><button className="btn btn-primary btn-block" onClick={check} disabled={busy}>I’ve verified my email</button><button className="btn btn-block" onClick={resend} disabled={busy}>Resend email</button><button className="auth-link auth-link-button" onClick={logout}>Use another account</button></div></section></div>;
}
