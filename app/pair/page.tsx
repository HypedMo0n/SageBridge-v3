'use client';

import { PlugsConnected, Download } from '@phosphor-icons/react';

const CONNECTOR_DOWNLOAD_URL = 'https://github.com/HypedMo0n/SageBridge-Connector/releases/download/beta-v1.1.0/sagebridge-connector-beta-v1.1.0.zip';

export default function Page() {
  return (
    <div style={{ textAlign: 'center', paddingTop: 30 }}>
      <div className="icon-box accent-box" style={{ width: 52, height: 52, border: '1px solid var(--color-accent)', margin: 'auto' }}>
        <PlugsConnected size={25} />
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 500, margin: '18px 0 8px' }}>Pair with Sage 50</h2>
      <p className="notice">Pairing codes are generated from SageBridge and entered into the SageBridge Connector on your office computer.</p>

      {/* Connector download CTA */}
      <div className="card download-cta" style={{ textAlign: 'left', marginTop: 20, borderColor: 'var(--color-accent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span className="icon-box accent-box" style={{ width: 36, height: 36, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Download size={18} />
          </span>
          <div>
            <span className="row-title" style={{ fontSize: 15, fontWeight: 500, display: 'block' }}>SageBridge Connector</span>
            <span className="row-sub" style={{ fontSize: 12 }}>Required to link your Sage 50 company file</span>
          </div>
        </div>
        <p className="notice" style={{ margin: '0 0 12px', fontSize: 12 }}>
          Download the connector and run the installer once on your office PC. It opens its own setup window - no command line is needed.
        </p>
        <a className="btn btn-primary" href={CONNECTOR_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textAlign: 'center' }}>
          Download Connector
        </a>
        <p className="notice" style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--color-neutral-500)' }}>
          Windows 10/11 · Sage 50 Canada 2026
        </p>
      </div>

      <div className="card" style={{ textAlign: 'left', marginTop: 24 }}>
        {[
          ['1', 'Generate a pairing code', 'From the SageBridge onboarding screen on this account.'],
          ['2', 'Open SageBridge Connector', 'It sits beside Sage 50 on the office computer.'],
          ['3', 'Enter the code there', 'The one-time code expires in ten minutes.'],
        ].map(([n, a, b]) => (
          <div className="row" key={n}>
            <span className="avatar" style={{ width: 24, height: 24, borderRadius: 999 }}>{n}</span>
            <span className="row-main">
              <span className="row-title">{a}</span>
              <span className="row-sub">{b}</span>
            </span>
          </div>
        ))}
      </div>
      <p className="notice" style={{ marginTop: 16 }}>No password is typed on the phone. The desktop stays the source of truth.</p>
    </div>
  );
}
