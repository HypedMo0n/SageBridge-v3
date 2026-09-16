'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type Company } from '@/lib/api';
import {
  COMPANY_STORAGE_KEY,
  resolveSelectedCompany,
  saveSelectedCompany
} from '@/lib/company-selection';

export default function SetupPage() {
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
        const initial = resolveSelectedCompany(list, stored);
        setSelected(initial ?? '');
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load companies');
        setLoading(false);
      });
  }, []);

  const handleContinue = () => {
    if (!selected) return;
    saveSelectedCompany(window.localStorage, selected);
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <main className="setup">
        <div className="setup-card">
          <p className="notice">Loading your companies…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="setup">
        <div className="setup-card">
          <h1 className="kicker">Company Setup</h1>
          <p className="notice error">{error}</p>
          <Link href="/dashboard" className="btn">Back to Dashboard</Link>
        </div>
      </main>
    );
  }

  if (companies.length === 0) {
    return (
      <main className="setup">
        <div className="setup-card">
          <h1 className="kicker">Company Setup</h1>
          <p className="notice">
            No companies are linked to your account yet. Contact your SageBridge
            administrator to get your company added.
          </p>
          <Link href="/dashboard" className="btn">Back to Dashboard</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="setup">
      <div className="setup-card">
        <h1 className="kicker">Select Your Company</h1>
        <p className="notice">
          Choose which Sage 50 company you want to work with. You can switch
          anytime from the header selector.
        </p>

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

        <div className="setup-actions">
          <button
            className="btn primary"
            disabled={!selected}
            onClick={handleContinue}
          >
            Continue
          </button>
          <Link href="/dashboard" className="btn">Cancel</Link>
        </div>
      </div>
    </main>
  );
}
