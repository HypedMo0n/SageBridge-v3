'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { api, ApiError, type PairingCode, type ProvisioningState } from '@/lib/api';

const STAGES = [
  ['awaiting_connector', 'Waiting for connector'],
  ['connector_connected', 'Connector connected'],
  ['checking_sage', 'Checking Sage 50 connection'],
  ['company_selected', 'Company selected'],
  ['provisioning', 'Setting up workspace'],
  ['syncing_customers', 'Importing customers'],
  ['syncing_invoices', 'Importing invoices'],
  ['syncing_products', 'Importing products'],
  ['syncing_quotes', 'Importing quotes'],
  ['finalizing', 'Finalizing setup'],
  ['ready', 'Workspace ready'],
] as const;

function errorText(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'The service returned an unexpected error.'; }
function when(value?: string | null) { if (!value) return 'Never reported'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-CA'); }

export function ConnectorSetup({ onboarding = false }: { onboarding?: boolean }) {
  const { workspace, company, selectCompany, refreshWorkspace } = useAuth();
  const [provisioning, setProvisioning] = useState<ProvisioningState | null>(null);
  const [pairing, setPairing] = useState<PairingCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const startingRef = useRef(false);

  const load = useCallback(async () => {
    if (!company) { setProvisioning(null); return null; }
    const next = await api.getProvisioning(company.id);
    setProvisioning(next);
    return next;
  }, [company]);

  const runStartProvisioning = useCallback(async () => {
    if (!company || startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    try { setProvisioning(await api.startProvisioning(company.id)); }
    finally { startingRef.current = false; setStarting(false); }
  }, [company]);

  const autoStart = useCallback((next?: ProvisioningState | null) => {
    if (next?.state === 'connector_connected') runStartProvisioning().catch(() => { /* the next poll retries */ });
  }, [runStartProvisioning]);

  async function retryProvisioning() {
    setError('');
    try { await runStartProvisioning(); }
    catch (reason) { setError(errorText(reason)); }
  }

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load().then((next) => { if (active) autoStart(next); }).catch((reason) => { if (active) setError(errorText(reason)); }).finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [load, autoStart]);
  useEffect(() => {
    if (!pairing && (!provisioning?.state || provisioning.state === 'ready')) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
      Promise.all([load(), refreshWorkspace()]).then(([next]) => autoStart(next)).catch((reason) => setError(errorText(reason)));
    }, 5000);
    return () => window.clearInterval(timer);
  }, [load, autoStart, pairing, provisioning?.state, refreshWorkspace]);

  const expiry = pairing ? new Date(pairing.expiresAt).getTime() : 0;
  const expired = !!pairing && (!Number.isFinite(expiry) || expiry <= now);
  async function generateCode() {
    if (!company) return;
    setBusy(true); setError('');
    try { const next = await api.createPairingCode(company.id); setPairing(next); setNow(Date.now()); await load(); }
    catch (reason) { setError(errorText(reason)); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="card"><p className="notice">Loading your secure workspace…</p></div>;
  const currentStage = STAGES.findIndex(([state]) => state === provisioning?.state);
  const counts = Object.entries(provisioning?.counts || {});

  return <div className="stack setup-stack">
    {error && <div className="error-box" role="alert">{error}</div>}
    {!!workspace?.companies.length && <section className="card"><p className="kicker">Company</p><label className="field-label">SageBridge company<select className="auth-input" value={company?.id || ''} onChange={(event) => selectCompany(event.target.value)}>{workspace.companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></section>}
    {!company && <section className="card"><h2>No company available</h2><p className="notice">Refresh your workspace or ask an organization administrator to grant company access.</p><button className="btn btn-primary btn-block" onClick={() => refreshWorkspace().catch((reason) => setError(errorText(reason)))}>Refresh workspace</button></section>}

    {company && <><section className="card">
      <p className="kicker">1 · Pair the office computer</p><h2>Connect Sage 50</h2>
      <p className="notice">Generate a one-time code, then enter it in SageBridge Connector on the office computer.</p>
      {pairing && !expired && <div className="pair-code" aria-label={`Pairing code ${pairing.code}`}><strong>{pairing.code}</strong><span>Expires {when(pairing.expiresAt)}</span></div>}
      {pairing && expired && <div className="notice-box">This pairing code has expired. Generate a new one.</div>}
      <button className="btn btn-primary btn-block" onClick={generateCode} disabled={busy}>{busy ? 'Requesting code…' : pairing && !expired ? 'Generate a new code' : 'Generate pairing code'}</button>
    </section>

    <section className="card">
      <p className="kicker">2 · Provision workspace</p><h2>Company data</h2>
      {!provisioning && <p className="notice">Provisioning status has not been reported.</p>}
      {provisioning && <><span className={`status-pill status-${provisioning.state}`}>{provisioning.state.replaceAll('_', ' ')}</span><p className="notice">{provisioning.progress}% complete · Updated {when(provisioning.updatedAt)}</p>{provisioning.errorMessage && <div className="error-box">{provisioning.errorMessage}{provisioning.errorCode ? ` (${provisioning.errorCode})` : ''}</div>}{provisioning.state === 'failed' && <button className="btn btn-block" onClick={retryProvisioning} disabled={starting}>{starting ? 'Retrying…' : 'Retry provisioning'}</button>}<div className="progress-list">{STAGES.map(([state, label], index) => <div className="row" key={state}><span className={`step-dot step-${provisioning.state === 'failed' && index === currentStage ? 'failed' : index < currentStage || provisioning.state === 'ready' ? 'complete' : index === currentStage ? 'in_progress' : 'pending'}`} /><span className="row-main"><span className="row-title">{label}</span></span></div>)}</div>{counts.length > 0 && <div className="progress-list">{counts.map(([resource, count]) => <div className="row" key={resource}><span className="row-main row-title">{resource.replaceAll('_', ' ')}</span><span className="row-sub">{count}</span></div>)}</div>}</>}
    </section>

    <section className="card"><p className="kicker">Connector</p><div className="row"><span className={`connector-dot connector-${company.online ? 'online' : 'offline'}`} /><span className="row-main"><span className="row-title">{company.connectorStatus.replaceAll('_', ' ')}</span><span className="row-sub">{company.online ? 'Online' : 'Offline'} · Last seen {when(company.lastSeenAt)}</span></span></div><p className="notice">Connector access can be revoked when a connector record is available from the secured API.</p></section>
    {onboarding && provisioning?.state === 'ready' && <Link className="btn btn-primary btn-block" href="/dashboard">Open SageBridge</Link>}</>}
  </div>;
}
