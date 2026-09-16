'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, type CompanyDetail } from '@/lib/api';
import {
  COMPANY_STORAGE_KEY,
  resolveSelectedCompany,
  saveSelectedCompany,
} from '@/lib/company-selection';

const CONNECTOR_DOWNLOAD_URL = 'https://github.com/HypedMo0n/SageBridge-Connector/releases/latest/download/sagebridge-connector-installer.zip';

export default function OnboardingPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');

  useEffect(() => {
    // Skip onboarding for returning users who already completed it
    const completed = window.localStorage.getItem('sb.onboardingComplete');
    if (completed === 'true') {
      router.replace('/dashboard');
      return;
    }

    api.bootstrap()
      .then(state => {
        setCompanies(state.companies);
        const stored = window.localStorage.getItem(COMPANY_STORAGE_KEY);
        setSelected(resolveSelectedCompany(state.companies, stored) ?? '');
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Unable to reach the server');
        setLoading(false);
      });
  }, []);

  const handleDone = () => {
    if (companies.length > 0 && !selected) return;
    if (selected) {
      saveSelectedCompany(window.localStorage, selected);
    }
    window.localStorage.setItem('sb.onboardingComplete', 'true');
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <main className="setup">
        <div className="setup-card">
          <p className="notice">Loading your setup…</p>
        </div>
      </main>
    );
  }

  const hasCompanies = companies.length > 0;

  return (
    <main className="setup">
      <div className="setup-card">
        <h1 className="kicker">Welcome to SageBridge</h1>
        <p className="notice">
          Connect your Sage 50 company to the cloud in 3 steps. No credit card required.
        </p>

        {/* Step 1: Download — always visible */}
        <div className="onboarding-step">
          <span className="step-number">1</span>
          <div style={{ flex: 1 }}>
            <h3 className="step-title">Download the Connector</h3>
            <p className="step-desc">
              The connector runs on your office PC where Sage 50 is installed. It syncs
              your data to the cloud automatically.
            </p>
          </div>
          <a
            className="btn primary small-btn"
            href={CONNECTOR_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download
          </a>
        </div>

        {/* Step 2: Install & configure */}
        <div className="onboarding-step">
          <span className="step-number">2</span>
          <div style={{ flex: 1 }}>
            <h3 className="step-title">Install & Configure</h3>
            <p className="step-desc">
              Run the connector on your office PC. It will ask for your Sage 50 login
              and creates a pairing link.
            </p>
          </div>
          <Link className="btn small-btn" href="/pair">
            How to Pair
          </Link>
        </div>

        {/* Step 3: Sync */}
        <div className="onboarding-step">
          <span className="step-number">3</span>
          <div style={{ flex: 1 }}>
            <h3 className="step-title">Start Syncing</h3>
            <p className="step-desc">
              After pairing, your customers, invoices, and products appear here.
              Your company name comes from your Sage 50 file — it shows up automatically
              after the connector connects.
            </p>
          </div>
          <button
            className="btn primary small-btn"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
        </div>

        {error && (
          <p className="notice error" style={{ marginTop: 12 }}>
            {error} — the setup steps above still work without a server connection.
          </p>
        )}

        {/* Empty state: no companies yet */}
        {!hasCompanies && (
          <div className="empty-state" style={{ marginTop: 20, padding: '16px', background: 'var(--color-card)', borderRadius: 12, border: '1px solid var(--color-divider)' }}>
            <h3 className="step-title" style={{ marginBottom: 6 }}>No companies yet</h3>
            <p className="step-desc" style={{ marginBottom: 12 }}>
              Your company will appear here once you install the connector on your office PC
              and pair it with your Sage 50 company file. Go through steps 1 and 2 above,
              then come back and refresh this page.
            </p>
            <Link href="/pair" className="btn small-btn">Go to Pairing</Link>
          </div>
        )}

        {/* Company selection — only if companies exist */}
        {hasCompanies && (
          <>
            <h2 className="kicker" style={{ marginTop: 24 }}>Select Your Company</h2>
            <div className="company-list">
              {companies.map(c => (
                <button
                  key={c.id}
                  className={`company-option ${selected === c.id ? 'selected' : ''}`}
                  onClick={() => setSelected(c.id)}
                >
                  <span className="company-name">{c.name}</span>
                  <span className="company-meta">
                    {c.connectorStatus === 'connected' ? '● Online' : '○ Offline'}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="setup-actions" style={{ marginTop: 20 }}>
          <button
            className="btn primary"
            disabled={companies.length > 0 && !selected}
            onClick={handleDone}
          >
            {hasCompanies ? 'Finish Setup' : 'I\'ve installed the connector'}
          </button>
          <Link href="/dashboard" className="btn">Skip for now</Link>
        </div>
      </div>
    </main>
  );
}
