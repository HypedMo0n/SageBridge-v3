'use client';

import Link from 'next/link';
import { DownloadSimple, WindowsLogo } from '@phosphor-icons/react';
import { CONNECTOR_DOWNLOAD_URL, CONNECTOR_LAST_KNOWN_VERSION, CONNECTOR_PLATFORM } from '@/lib/connector-release';

/**
 * No authoritative connector release/download mechanism exists yet (no
 * GitHub Releases, no versioned installer artifact, no API-served version
 * endpoint - see lib/connector-release.ts). This shows a real, working
 * "not yet available" state instead of linking to a fake executable, and
 * starts working the moment NEXT_PUBLIC_CONNECTOR_DOWNLOAD_URL is set.
 */
export function ConnectorDownloadCard() {
  return (
    <section className="section">
      <div className="card hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="icon-box accent-box"><WindowsLogo size={18} /></span>
          <span className="row-main">
            <span className="row-title" style={{ fontWeight: 500 }}>SageBridge Connector</span>
            <span className="row-sub">{CONNECTOR_PLATFORM} · Version {CONNECTOR_LAST_KNOWN_VERSION}</span>
          </span>
        </div>

        {CONNECTOR_DOWNLOAD_URL ? (
          <a href={CONNECTOR_DOWNLOAD_URL} className="btn btn-primary btn-block" style={{ marginTop: 14 }}>
            <DownloadSimple size={16} />Download SageBridge Connector
          </a>
        ) : (
          <>
            <div className="notice-box" style={{ marginTop: 14 }}>
              A download link hasn&apos;t been configured for this workspace yet. Contact your administrator or SageBridge support to get the installer.
            </div>
            <button className="btn btn-block" disabled style={{ marginTop: 10 }}><DownloadSimple size={16} />Download not yet available</button>
          </>
        )}

        <div className="button-grid" style={{ marginTop: 10 }}>
          <Link href="/help/install-connector" className="btn">Installation Guide</Link>
          <Link href="/help/system-requirements" className="btn">System Requirements</Link>
        </div>
        <Link href="/help/sage-50-not-detected" className="btn btn-block" style={{ marginTop: 9 }}>Troubleshoot Installation</Link>
      </div>
    </section>
  );
}
