'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { api, ApiError, type Connector } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';

const groups = [
  ['Sync', [['Sync frequency', 'Managed by connector'], ['Notifications', 'Workspace settings']]],
  ['Documents', [['Company & logo', 'From Sage 50'], ['Default terms', 'From Sage 50'], ['Tax rates', 'From Sage 50']]],
] as const;

function errorText(error: unknown) {
  return error instanceof ApiError || error instanceof Error ? error.message : 'The service returned an unexpected error.';
}

export default function SettingsPage() {
  const { user, company, logout } = useAuth();

  return (
    <>
      {groups.map(([title, rows]) => (
        <section className="section" key={title}>
          <h2 className="kicker">{title}</h2>
          <div className="card">
            {rows.map(([label, detail]) => (
              <div className="row" key={label}>
                <span className="row-main row-title">{label}</span>
                <span className="row-sub">{detail}</span>
              </div>
            ))}
          </div>
        </section>
      ))}

      <SageConnectionSection companyId={company?.id ?? null} companyName={company?.name ?? null} />

      <section className="section">
        <h2 className="kicker">Account</h2>
        <div className="card">
          <div className="row">
            <span className="row-main">
              <span className="row-title">Logged in</span>
              <span className="row-sub">{user?.email}</span>
            </span>
          </div>
          <Link href="/pair" className="btn btn-block">Manage connectors</Link>
          <button onClick={logout} className="btn btn-block settings-signout">Log out</button>
        </div>
      </section>
    </>
  );
}

function SageConnectionSection({ companyId, companyName }: { companyId: string | null; companyName: string | null }) {
  const [connectors, setConnectors] = useState<Connector[] | null>(null);
  const [error, setError] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!companyId) return;
    api.getConnectors(companyId).then(setConnectors).catch((err) => setError(errorText(err)));
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const active = (connectors ?? []).filter((c) => c.status !== 'revoked');

  const disconnect = async (connectorId: string) => {
    setBusy(true);
    setError('');
    try {
      await api.revokeConnector(connectorId);
      setConfirmingId(null);
      load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section">
      <h2 className="kicker">Sage 50 connection</h2>
      <div className="card">
        {companyName && <div className="row-title" style={{ marginBottom: 10 }}>{companyName}</div>}

        {!connectors ? (
          <p className="notice">Loading connection status…</p>
        ) : active.length === 0 ? (
          <>
            <div className="row" style={{ padding: '4px 2px' }}>
              <span className="connector-dot" aria-hidden />
              <span className="row-main row-sub" style={{ marginLeft: 8 }}>Not connected</span>
            </div>
            <Link href="/pair" className="btn btn-block" style={{ marginTop: 10 }}>Pair a computer</Link>
          </>
        ) : (
          active.map((connector) => (
            <div key={connector.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`connector-dot ${connector.status === 'online' ? 'connector-online' : ''}`} aria-hidden />
                <span className="row-title" style={{ fontWeight: 500 }}>{connector.status === 'online' ? 'Online' : 'Offline'}</span>
              </div>
              {connector.machineName && <div className="row-sub" style={{ marginTop: 4 }}>Paired to {connector.machineName}</div>}
              <div className="row-sub" style={{ marginTop: 2 }}>
                {connector.status === 'online' && connector.lastSyncAt
                  ? `Last synced ${formatRelativeTime(new Date(connector.lastSyncAt))}`
                  : connector.lastSeenAt
                    ? `Last seen ${formatRelativeTime(new Date(connector.lastSeenAt))}`
                    : 'Never synced yet'}
              </div>

              {confirmingId === connector.id ? (
                <div className="notice-box" style={{ marginTop: 12 }}>
                  <p className="row-title" style={{ marginBottom: 6 }}>Disconnect Sage 50?</p>
                  <p className="row-sub" style={{ lineHeight: 1.5 }}>
                    This computer will no longer be able to sync or make changes through SageBridge.
                    Your existing Sage 50 data will not be deleted.
                  </p>
                  <div className="button-grid" style={{ marginTop: 12 }}>
                    <button className="btn" disabled={busy} onClick={() => setConfirmingId(null)}>Cancel</button>
                    <button className="btn settings-signout" disabled={busy} onClick={() => disconnect(connector.id)}>
                      {busy ? 'Disconnecting…' : 'Disconnect'}
                    </button>
                  </div>
                </div>
              ) : (
                <button className="btn btn-block settings-signout" style={{ marginTop: 10 }} onClick={() => setConfirmingId(connector.id)}>
                  Disconnect Sage 50
                </button>
              )}
            </div>
          ))
        )}

        {error && <p className="notice" style={{ color: '#df8997', marginTop: 8 }}>{error}</p>}
      </div>
    </section>
  );
}
