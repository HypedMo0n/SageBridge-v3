'use client';

import Link from 'next/link';
import { CaretRight, EnvelopeSimple } from '@phosphor-icons/react';
import { SUPPORT_CONFIGURED, SUPPORT_EMAIL, SUPPORT_URL } from '@/lib/support-config';

export default function ContactSupportPage() {
  return (
    <>
      <nav aria-label="Breadcrumb" className="help-breadcrumb">
        <Link href="/help">Help Center</Link>
        <CaretRight size={10} aria-hidden="true" />
        <span aria-current="page">Contact Support</span>
      </nav>

      <section className="card hero section">
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 8px' }}>Contact Support</h1>
        {SUPPORT_CONFIGURED ? (
          <>
            {SUPPORT_EMAIL && <a href={`mailto:${SUPPORT_EMAIL}`} className="btn btn-primary btn-block"><EnvelopeSimple size={16} />Email {SUPPORT_EMAIL}</a>}
            {SUPPORT_URL && <a href={SUPPORT_URL} className="btn btn-block" style={{ marginTop: SUPPORT_EMAIL ? 9 : 0 }}>Open support</a>}
          </>
        ) : (
          <div className="notice-box">
            A support contact hasn&apos;t been configured for this workspace yet. Once one is set (email or ticketing link), it will appear here automatically.
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="kicker">What to include</h2>
        <div className="card">
          <ul className="help-list">
            <li>Your company name</li>
            <li>Roughly when the problem happened</li>
            <li>The exact error message shown, if any</li>
            <li>Your safe diagnostic information (see below)</li>
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="error-box" role="alert">
          Never send your password, connector credential, pairing code, or any access token or key - to us or to anyone. See Safe support practices for what SageBridge will and won&apos;t ask you for.
        </div>
      </section>

      <section className="button-grid">
        <Link href="/help/diagnostics" className="btn btn-primary btn-block">View diagnostic information</Link>
        <Link href="/help/safe-support-practices" className="btn btn-block">Safe support practices</Link>
      </section>

      <section style={{ marginTop: 9 }}>
        <Link href="/help" className="btn btn-block">Back to Help Center</Link>
      </section>
    </>
  );
}
