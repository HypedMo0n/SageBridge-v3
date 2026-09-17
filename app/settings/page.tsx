'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getSelectedCompanyId, type Capabilities, type ConnectorInfo } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

const groups = [
  ['Sync', [['Sync frequency', 'Every 15 min'], ['Wi-Fi only', 'Off']]],
  ['Documents', [['Company & logo', '—'], ['Tax rates', '—']]],
  ['Account', [['Users & permissions', 'Managed on desktop'], ['This device', 'Current browser']]],
] as const;

function AboutSection() {
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [connector, setConnector] = useState<ConnectorInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    const companyId = getSelectedCompanyId();
    Promise.all([
      api.getCapabilities(),
      api.bootstrap(),
      companyId ? api.getConnectors(companyId) : Promise.resolve<ConnectorInfo[]>([]),
    ]).then(([caps, boot, connectors]) => {
      if (cancelled) return;
      setCapabilities(caps);
      const company = boot.companies.find((c) => c.id === companyId) || null;
      setCompanyName(company?.name ?? null);
      setLastSeenAt(company?.lastSeenAt ?? null);
      // Not every deployment has a connector paired yet, and a company can
      // have more than one over its lifetime - the most recently seen one
      // is the one actually relevant to "is sync working right now".
      const active = [...connectors].sort((a, b) => (b.lastSeenAt || '').localeCompare(a.lastSeenAt || ''))[0] ?? null;
      setConnector(active);
    }).catch(() => { /* best-effort: this section stays on its "unknown" defaults */ });
    return () => { cancelled = true; };
  }, []);

  const rows: Array<[string, string]> = [
    ['App version', process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ? `0.1.0 (${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 7)})` : '0.1.0'],
    ['API release', capabilities?.release ?? 'unknown'],
    ['API build', capabilities?.buildSha ?? 'unknown'],
    ['Company', companyName ?? 'No company selected'],
    ['Connector', connector ? `${connector.version ?? 'unknown version'} · ${connector.online ? 'Online' : 'Offline'}` : 'Not paired'],
    ['Last sync', lastSeenAt ? new Date(lastSeenAt).toLocaleString('en-CA') : 'Not reported'],
  ];

  return (
    <section className="section card">
      <h2 className="kicker">About</h2>
      {rows.map(([label, value]) => <div className="row" key={label}><span className="row-main">{label}</span><span className="row-sub">{value}</span></div>)}
    </section>
  );
}

export default function Page() {
  const { logout } = useAuth();
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
        // The account no longer exists server-side, so this must fully
        // sign out of Firebase (not just clear the company selection) -
        // otherwise the stale, still-"authenticated" session would land on
        // /onboarding and hang forever re-bootstrapping a deleted account.
        // logout() clears the selected company, signs out, and navigates
        // to /login via the router.
        await logout();
        return;
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
    <AboutSection />
    {message && <p className="notice">{message}</p>}
    <button className="btn" onClick={() => setMessage('Settings are managed by the Sage 50 connector.')}>Save settings</button>
  </>;
}
