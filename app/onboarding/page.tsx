'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { api, type PairingCode, type ProvisioningState } from '@/lib/api';
import { deriveStage, importItemStatus, sageDetectionStatus, IMPORT_ITEMS, readLocalStep, writeLocalStep, type LocalStep } from '@/lib/onboarding-stage';

const CONNECTOR_DOWNLOAD_URL = 'https://github.com/HypedMo0n/SageBridge-Connector/releases/download/beta-v1.1.0/sagebridge-connector-beta-v1.1.0.zip';

function errorText(reason: unknown) {
  return reason instanceof Error ? reason.message : 'Something went wrong. Please try again.';
}

export default function OnboardingPage() {
  const { company, refreshWorkspace } = useAuth();
  const [localStep, setLocalStep] = useState<LocalStep>(() => readLocalStep(typeof window === 'undefined' ? undefined : window.localStorage, company?.id));
  const [pairing, setPairing] = useState<PairingCode | null>(null);
  const [provisioning, setProvisioning] = useState<ProvisioningState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadProvisioning = useCallback(async (companyId: string) => {
    try { setProvisioning(await api.getProvisioning(companyId)); }
    catch (reason) { console.error('Could not load provisioning:', reason); }
  }, []);

  // Resume correctly on mount/refresh: pull the latest backend truth once,
  // rather than trusting whatever was in memory before the reload.
  useEffect(() => {
    if (!company) return;
    let active = true;
    api.getProvisioning(company.id).then((next) => { if (active) setProvisioning(next); }).catch((reason) => console.error('Could not load provisioning:', reason));
    return () => { active = false; };
  }, [company]);

  const stage = useMemo(() => deriveStage(company, provisioning, localStep), [company, provisioning, localStep]);

  const advanceLocalStep = (next: LocalStep) => { writeLocalStep(typeof window === 'undefined' ? undefined : window.localStorage, company?.id, next); setLocalStep(next); };

  const generateCode = useCallback(async (companyId: string) => {
    setBusy(true); setError('');
    try { setPairing(await api.createPairingCode(companyId)); }
    catch (reason) { setError(errorText(reason)); }
    finally { setBusy(false); }
  }, []);

  const beginProvisioning = useCallback(async (companyId: string) => {
    setBusy(true); setError('');
    try { setProvisioning(await api.startProvisioning(companyId)); }
    catch (reason) { setError(errorText(reason)); }
    finally { setBusy(false); }
  }, []);

  // A single poll loop, only while there is something backend-side worth
  // watching for (pairing/connect/importing/failed). Never runs during the
  // purely local download/install steps or once ready. One interval at a
  // time; always cleared on unmount or when polling is no longer needed.
  const shouldPoll = stage === 'pair' || stage === 'connect' || stage === 'importing' || stage === 'failed';
  useEffect(() => {
    if (!shouldPoll || !company) return;
    const companyId = company.id;
    const id = setInterval(() => {
      Promise.all([refreshWorkspace(), loadProvisioning(companyId)]).catch((reason) => console.error('Onboarding poll failed:', reason));
    }, 4000);
    return () => clearInterval(id);
  }, [shouldPoll, company, refreshWorkspace, loadProvisioning]);

  if (!company) {
    return <main className="setup"><div className="setup-card"><p className="notice">Loading your workspace…</p></div></main>;
  }

  return (
    <main className="setup">
      <div className="setup-card">
        <h1 className="kicker">Welcome to SageBridge</h1>

        {stage === 'download' && (
          <section className="card onboarding-step-card">
            <h2 className="step-heading">Connect Sage 50</h2>
            <p className="notice">SageBridge securely connects to Sage 50 through a small Windows app installed on the computer where Sage 50 is used.</p>
            <a className="btn btn-primary btn-block" href={CONNECTOR_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">Download SageBridge Connector</a>
            <p className="notice" style={{ marginTop: 8, fontSize: 11, color: 'var(--color-neutral-500)' }}>Windows · Sage 50 Canada</p>
            <button className="btn btn-block" style={{ marginTop: 12 }} onClick={() => advanceLocalStep('install')}>I&apos;ve downloaded it</button>
          </section>
        )}

        {stage === 'install' && (
          <section className="card onboarding-step-card">
            <h2 className="step-heading">Open SageBridge Connector</h2>
            <p className="notice">Extract the downloaded ZIP, then open SageBridgeConnector.exe on the Windows computer where Sage 50 is installed. SageBridge will open its setup window automatically - no command line is required.</p>
            <button className="btn btn-block" style={{ marginBottom: 8 }} onClick={() => advanceLocalStep('download')}>← Back to download</button>
            <button
              className="btn btn-primary btn-block"
              disabled={busy}
              onClick={() => { advanceLocalStep('pair'); if (company) generateCode(company.id); }}
            >
              {busy ? 'Requesting code…' : "I've opened SageBridge Connector"}
            </button>
          </section>
        )}

        {stage === 'pair' && (
          <section className="card onboarding-step-card">
            <h2 className="step-heading">Pair your computer</h2>
            <p className="notice">SageBridge Connector will ask for a one-time code the first time it runs. Generate one below and enter it there.</p>
            {pairing && (
              <div className="pair-code-display">
                <strong>{pairing.code}</strong>
                <span>Expires {new Date(pairing.expiresAt).toLocaleTimeString()}</span>
              </div>
            )}
            <button className="btn btn-primary btn-block" onClick={() => company && generateCode(company.id)} disabled={busy}>
              {busy ? 'Requesting code…' : pairing ? 'Generate a new code' : 'Generate pairing code'}
            </button>
          </section>
        )}

        {stage === 'connect' && (
          <section className="card onboarding-step-card">
            <h2 className="step-heading">Connect to Sage 50</h2>
            <div className="status-line"><span className="status-check">✓</span> Computer connected</div>
            <p className="notice">Your SageBridge Connector is online. Start setup to detect your Sage 50 company and begin importing your data.</p>
            <button className="btn btn-primary btn-block" onClick={() => company && beginProvisioning(company.id)} disabled={busy}>
              {busy ? 'Starting…' : 'Start setup'}
            </button>
          </section>
        )}

        {stage === 'importing' && provisioning && (
          <section className="card onboarding-step-card">
            <h2 className="step-heading">Importing your Sage data</h2>
            <div className="status-line"><span className="status-check">✓</span> Computer connected</div>
            {sageDetectionStatus(provisioning.state) === 'detected' ? (
              <div className="status-line"><span className="status-check">✓</span> Sage 50 detected</div>
            ) : (
              <div className="status-line"><span className="status-spinner" /> Checking Sage 50…</div>
            )}
            <div className="import-list">
              {IMPORT_ITEMS.map(({ state, label }) => {
                const status = importItemStatus(state, provisioning.state);
                return (
                  <div key={state} className={`import-item ${status}`}>
                    <span className="import-icon">{status === 'complete' ? '✓' : status === 'active' ? '○' : '·'}</span>
                    <span className="import-label">{label}</span>
                  </div>
                );
              })}
            </div>
            <p className="notice">{provisioning.progress}% complete</p>
          </section>
        )}

        {stage === 'failed' && provisioning && (
          <section className="card onboarding-step-card">
            <h2 className="step-heading">Setup couldn&apos;t finish</h2>
            <div className="error-box" role="alert">
              {provisioning.errorMessage || 'Something interrupted the connection to Sage 50.'}
              {provisioning.errorCode ? ` (${provisioning.errorCode})` : ''}
            </div>
            <p className="notice">Make sure the SageBridge Connector is running and Sage 50 is open on the office computer, then try again.</p>
            <button className="btn btn-primary btn-block" onClick={() => company && beginProvisioning(company.id)} disabled={busy}>
              {busy ? 'Retrying…' : 'Retry setup'}
            </button>
          </section>
        )}

        {stage === 'ready' && (
          <section className="card onboarding-step-card">
            <h2 className="step-heading">SageBridge is ready</h2>
            <p className="notice">{company.name} is connected and synced.</p>
            <Link className="btn btn-primary btn-block" href="/dashboard">Open SageBridge</Link>
          </section>
        )}

        {error && <p className="notice error">{error}</p>}

        {stage !== 'ready' && stage !== 'download' && (
          <p className="notice" style={{ marginTop: 12, fontSize: 11 }}>
            Need help? <Link href="/pair">View pairing instructions</Link>
          </p>
        )}
      </div>
    </main>
  );
}
