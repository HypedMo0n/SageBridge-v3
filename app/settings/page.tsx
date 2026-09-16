'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { COMPANY_STORAGE_KEY } from '@/lib/company-selection';

const groups = [
  ['Sync', [['Sync frequency', 'Every 15 min'], ['Wi-Fi only', 'Off']]],
  ['Documents', [['Company & logo', 'Universal Construction'], ['Tax rates', 'HST 13%']]],
  ['Account', [['Users & permissions', 'Managed on desktop'], ['This device', 'Current browser']]],
] as const;

export default function Page() {
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setDeleting(true);
    try {
      const result = await api.deleteAccount();
      if (result.success) {
        // Clear stored company selection and redirect to home
        window.localStorage.removeItem(COMPANY_STORAGE_KEY);
        window.location.href = '/';
      } else {
        setMessage(result.message || 'Failed to delete account');
        setConfirming(false);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to delete account');
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  };

  return <>
    {groups.map(([title, rows]) => <section className="section" key={title}>
      <h2 className="kicker">{title}</h2>
      <div className="card">{rows.map(([label, value]) => <div className="row" key={label}><span className="row-main">{label}</span><span className="row-sub">{value}</span></div>)}</div>
    </section>)}
    <section className="section card">
      <h2 className="kicker">Company</h2>
      <div className="row">
        <span className="row-main">Select company</span>
        <Link href="/setup" className="row-link">Manage →</Link>
      </div>
    </section>
    <section className="section card danger-zone">
      <h2 className="kicker">Danger Zone</h2>
      <p className="notice">Permanently delete your account and all associated data. This cannot be undone.</p>
      <button
        className="btn danger"
        disabled={deleting}
        onClick={handleDelete}
      >
        {deleting ? 'Deleting…' : confirming ? 'Click again to confirm deletion' : 'Delete account'}
      </button>
      {confirming && !deleting && (
        <button className="btn" onClick={() => setConfirming(false)} style={{ marginLeft: 8 }}>
          Cancel
        </button>
      )}
    </section>
    <section className="section card"><h2 className="kicker">Data boundary</h2><p className="notice">SageBridge presents synchronized Sage 50 values. Accounting calculations remain in Sage 50.</p></section>
    {message && <p className="notice">{message}</p>}
    <button className="btn" onClick={() => setMessage('Settings are managed by the Sage 50 connector.')}>Save settings</button>
  </>;
}
