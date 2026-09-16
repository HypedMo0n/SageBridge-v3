'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { api, type CompanyDetail, type PairingCode, type ProvisioningState } from '@/lib/api';

const CONNECTOR_DOWNLOAD_URL = 'https://github.com/HypedMo0n/SageBridge-Connector/releases/download/beta-v1.1.0/sagebridge-connector-beta-v1.1.0.zip';

type Step = 'download' | 'install' | 'pair' | 'detect-sage' | 'confirm-company' | 'importing' | 'ready';

export default function OnboardingPage() {
  const { workspace, company, refreshWorkspace } = useAuth();
  const [step, setStep] = useState<Step>('download');
  const [pairing, setPairing] = useState<PairingCode | null>(null);
  const [provisioning, setProvisioning] = useState<ProvisioningState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [detectedCompany, setDetectedCompany] = useState<CompanyDetail | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadProvisioning = useCallback(async (companyId: string) => {
    try {
      const next = await api.getProvisioning(companyId);
      setProvisioning(next);
      return next;
    } catch (reason) {
      console.error('Could not load provisioning:', reason);
      return null;
    }
  }, []);

  const generateCode = useCallback(async (companyId: string) => {
    setBusy(true);
    setError('');
    try {
      const next = await api.createPairingCode(companyId);
      setPairing(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not generate pairing code');
    } finally {
      setBusy(false);
    }
  }, []);

  const startProvisioning = useCallback(async (companyId: string) => {
    setBusy(true);
    setError('');
    try {
      const next = await api.startProvisioning(companyId);
      setProvisioning(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not start provisioning');
    } finally {
      setBusy(false);
    }
  }, []);

  // Determine step from state
  useEffect(() => {
    if (!company) {
      if (pairing) setStep('pair');
      else setStep('download');
      return;
    }

    if (company.online && company.connectorStatus === 'connected') {
      if (provisioning?.state === 'ready') setStep('ready');
      else if (provisioning?.state === 'failed') setStep('importing');
      else if (provisioning) setStep('importing');
      else setStep('detect-sage');
    } else if (company.connectorStatus === 'connected') {
      setStep('detect-sage');
    } else {
      setStep('pair');
    }
  }, [company, provisioning, pairing]);

  // Poll for provisioning updates
  useEffect(() => {
    if (!company || step === 'download' || step === 'install' || step === 'pair') return;
    const id = setInterval(() => { loadProvisioning(company.id).catch(() => {}); }, 5000);
    timerRef.current = id;
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [company, step, loadProvisioning]);

  // Check if Sage is detected (connector heartbeat received)
  useEffect(() => {
    if (step !== 'detect-sage' || !company) return;
    if (company.sageCompanyName && company.sageCompanyName !== 'Sage company') {
      setDetectedCompany(company);
      setStep('confirm-company');
    }
  }, [step, company]);

  const sageCompanyName = detectedCompany?.sageCompanyName || company?.sageCompanyName;

  const provisioningLabel = (state: string) => {
    const labels: Record<string, string> = {
      awaiting_connector: 'Waiting for connector',
      connector_connected: 'Connector connected',
      checking_sage: 'Checking Sage 50 connection',
      company_selected: 'Company selected',
      provisioning: 'Setting up workspace',
      syncing_customers: 'Importing customers',
      syncing_invoices: 'Importing invoices',
      syncing_products: 'Importing products',
      syncing_quotes: 'Importing quotes',
      finalizing: 'Finalizing setup',
      ready: 'Workspace ready',
      failed: 'Setup failed',
    };
    return labels[state] || state;
  };

  const importStep = (state: string) => {
    const order = ['awaiting_connector', 'connector_connected', 'checking_sage', 'company_selected', 'provisioning', 'syncing_customers', 'syncing_invoices', 'syncing_products', 'syncing_quotes', 'finalizing', 'ready'];
    return order.indexOf(state);
  };

  const currentImportStep = provisioning ? importStep(provisioning.state) : 0;
  const isComplete = (idx: number) => provisioning?.state === 'ready' || (currentImportStep > idx && provisioning?.state !== 'failed');

  return (
    <main className="setup">
      <div className="setup-card">
        <h1 className="kicker">Welcome to SageBridge</h1>

        {/* STEP 1: Download Connector */}
        {step === 'download' && (
          <section className="card onboarding-step-card">
            <h2 className="step-heading">Connect Sage 50</h2>
            <p className="notice">SageBridge securely connects to Sage 50 through a small Windows app installed on the computer where Sage 50 is used.</p>
            <a className="btn primary btn-block" href={CONNECTOR_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
              Download SageBridge Connector
            </a>
            <p className="notice" style={{ marginTop: 8, fontSize: 11, color: 'var(--color-neutral-500)' }}>
              Windows · Sage 50 Canada
            </p>
          </section>
        )}

        {/* STEP 2: Install */}
        {step !== 'download' && step !== 'ready' && (
          <section className="card onboarding-step-card">
            <h2 className="step-heading">Install SageBridge Connector</h2>
            <p className="notice">Install and open SageBridge Connector on the Windows computer where Sage 50 is installed.</p>
          </section>
        )}

        {/* STEP 3: Pair */}
        {(step === 'pair' || step === 'detect-sage' || step === 'confirm-company' || step === 'importing') && (
          <section className="card onboarding-step-card">
            <h2 className="step-heading">Pair your computer</h2>
            <p className="notice">Generate a one-time code, then enter it in SageBridge Connector on the office computer.</p>
            {pairing && (
              <div className="pair-code-display">
                <strong>{pairing.code}</strong>
                <span>Expires {new Date(pairing.expiresAt).toLocaleTimeString()}</span>
              </div>
            )}
            <button className="btn btn-primary btn-block" onClick={() => company && generateCode(company.id)} disabled={busy || !company}>
              {busy ? 'Requesting code…' : pairing ? 'Generate new code' : 'Generate pairing code'}
            </button>
          </section>
        )}

        {/* STEP 4: Detect Sage */}
        {step === 'detect-sage' && (
          <section className="card onboarding-step-card">
            <h2 className="step-heading">Connect to Sage 50</h2>
            <div className="status-line"><span className="status-check">✓</span> Computer connected</div>
            <div className="status-line loading"><span className="status-spinner" /> Checking Sage 50…</div>
            <p className="notice">Your computer is connected. Waiting for Sage 50…</p>
          </section>
        )}

        {/* STEP 5: Confirm Company */}
        {step === 'confirm-company' && sageCompanyName && (
          <section className="card onboarding-step-card">
            <h2 className="step-heading">Connect to Sage 50</h2>
            <div className="status-line"><span className="status-check">✓</span> Computer connected</div>
            <div className="status-line"><span className="status-check">✓</span> Sage 50 detected</div>
            <div className="company-reveal">
              <p className="notice">Found your Sage company:</p>
              <strong className="company-name-reveal">{sageCompanyName}</strong>
            </div>
            <button className="btn btn-primary btn-block" onClick={() => company && startProvisioning(company.id)} disabled={busy}>
              Connect this company
            </button>
          </section>
        )}

        {/* STEP 6: Importing */}
        {step === 'importing' && provisioning && (
          <section className="card onboarding-step-card">
            <h2 className="step-heading">Importing your Sage data</h2>
            <div className="import-list">
              {(['syncing_customers', 'syncing_invoices', 'syncing_products', 'syncing_quotes'] as const).map((state, idx) => (
                <div key={state} className={`import-item ${isComplete(idx) ? 'complete' : currentImportStep === idx ? 'active' : 'pending'}`}>
                  <span className="import-icon">{isComplete(idx) ? '✓' : currentImportStep === idx ? '○' : '·'}</span>
                  <span className="import-label">
                    {idx === 0 ? 'Customers' : idx === 1 ? 'Invoices' : idx === 2 ? 'Products & services' : 'Quotes'}
                  </span>
                </div>
              ))}
            </div>
            {provisioning.state === 'failed' && (
              <div className="error-box">We connected successfully, but some Sage data could not be imported.</div>
            )}
          </section>
        )}

        {/* STEP 7: Ready */}
        {step === 'ready' && (
          <section className="card onboarding-step-card">
            <h2 className="step-heading">SageBridge is ready</h2>
            <p className="notice">{sageCompanyName || company?.name || 'Your company'} is connected and synced.</p>
            <Link className="btn btn-primary btn-block" href="/dashboard">Open SageBridge</Link>
          </section>
        )}

        {error && <p className="notice error">{error}</p>}

        {step !== 'ready' && (
          <p className="notice" style={{ marginTop: 12, fontSize: 11 }}>
            Need help? <Link href="/pair">View pairing instructions</Link>
          </p>
        )}
      </div>
    </main>
  );
}
