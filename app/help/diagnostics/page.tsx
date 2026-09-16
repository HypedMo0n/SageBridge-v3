'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CaretRight, ClipboardText, Check } from '@phosphor-icons/react';
import { useAuth } from '@/components/AuthProvider';
import { api, type Connector, type HealthState, type ProvisioningState } from '@/lib/api';
import { buildDiagnostics, diagnosticsToText } from '@/lib/diagnostics';

export default function DiagnosticsPage() {
  const { company } = useAuth();
  const [connector, setConnector] = useState<Connector | null>(null);
  const [provisioning, setProvisioning] = useState<ProvisioningState | null>(null);
  const [health, setHealth] = useState<HealthState | null>(null);
  const [healthReachable, setHealthReachable] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!company) return;
    api.getConnectors(company.id).then((connectors) => setConnector(connectors.find((item) => item.status !== 'revoked') || null)).catch(() => setConnector(null));
    api.getProvisioning(company.id).then(setProvisioning).catch(() => setProvisioning(null));
  }, [company]);

  useEffect(() => {
    api.health().then((result) => { setHealth(result); setHealthReachable(true); }).catch(() => setHealthReachable(false));
  }, []);

  const fields = buildDiagnostics({ company, connector, provisioning, health, healthReachable });
  const text = diagnosticsToText(fields);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard access can be denied by the browser - the text is still shown below to copy by hand */
    }
  }

  return (
    <>
      <nav aria-label="Breadcrumb" className="help-breadcrumb">
        <Link href="/help">Help Center</Link>
        <CaretRight size={10} aria-hidden="true" />
        <span aria-current="page">Diagnostics</span>
      </nav>

      <section className="card hero section">
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 8px' }}>Support Diagnostics</h1>
        <p className="notice">Safe information you can share with SageBridge support. This never includes your password, connector credentials, or any access token.</p>
      </section>

      <section className="section">
        <h2 className="kicker">Diagnostic information</h2>
        <div className="card">
          {fields.map((field) => (
            <div className="row" key={field.label}>
              <span className="row-main row-title">{field.label}</span>
              <span className="row-sub">{field.value}</span>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 10 }} onClick={copy}>
          {copied ? <><Check size={16} />Copied</> : <><ClipboardText size={16} />Copy diagnostic information</>}
        </button>
      </section>

      <section className="button-grid">
        <Link href="/help" className="btn btn-block">Back to Help Center</Link>
        <Link href="/help/contact" className="btn btn-block">Contact Support</Link>
      </section>
    </>
  );
}
