'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, type Company } from '@/lib/api';
import {
  COMPANY_STORAGE_KEY,
  resolveSelectedCompany,
  saveSelectedCompany,
} from '@/lib/company-selection';

const STEPS = [
  {
    id: 'download',
    title: 'Download the connector',
    description: 'Install the SageBridge connector on a PC where Sage 50 is installed.',
  },
  {
    id: 'connect',
    title: 'Connect your company',
    description: 'Run the connector and log in with your Sage 50 credentials.',
  },
  {
    id: 'sync',
    title: 'See your data',
    description: 'Your customers, invoices, and products sync to the cloud automatically.',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');

  useEffect(() => {
    api.getCompanies()
      .then(list => {
        setCompanies(list);
        const stored = window.localStorage.getItem(COMPANY_STORAGE_KEY);
        setSelected(resolveSelectedCompany(list, stored) ?? '');
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load companies');
        setLoading(false);
      });
  }, []);

  const handleDone = () => {
    if (!selected) return;
    saveSelectedCompany(window.localStorage, selected);
    // Mark onboarding as complete
    window.localStorage.setItem('sb.onboardingComplete', 'true');
    router.push('/dashboard');
  };

  if (loading) return <main className="setup"><div className="setup-card"><p className="notice">Loading…</p></div></main>;
  if (error) return <main className="setup"><div className="setup-card"><p className="notice error">{error}</p><Link href="/dashboard" className="btn">Back</Link></div></main>;

  return (
    <main className="setup">
      <div className="setup-card">
        <h1 className="kicker">Welcome to SageBridge</h1>
        <p className="notice">
          Let&apos;s get your Sage 50 data into the cloud. It takes about 2 minutes.
        </p>

        <div className="onboarding-steps">
          {STEPS.map((step, i) => (
            <div key={step.id} className="onboarding-step">
              <span className="step-number">{i + 1}</span>
              <div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {companies.length > 0 && (
          <>
            <h2 className="kicker" style={{ marginTop: 20 }}>Select Your Company</h2>
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

        <div className="setup-actions">
          <button className="btn primary" disabled={!selected} onClick={handleDone}>
            Finish Setup
          </button>
        </div>
      </div>
    </main>
  );
}
