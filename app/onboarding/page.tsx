import Link from 'next/link';
import { ConnectorSetup } from '@/components/ConnectorSetup';
import { ConnectorDownloadCard } from '@/components/help/ConnectorDownloadCard';

export default function OnboardingPage() {
  return (
    <div className="onboarding-shell">
      <header className="onboarding-head">
        <span className="auth-mark">S</span>
        <div>
          <p className="kicker">External beta setup</p>
          <h1>Connect your Sage company</h1>
          <p className="notice">Your SageBridge account is ready. Install the connector on your Sage 50 computer, then pair it below.</p>
        </div>
      </header>

      <section className="card">
        <p className="kicker">Before you start</p>
        <p className="notice">Install the SageBridge Connector on the Windows computer where Sage 50 runs. Skip this if it&apos;s already installed.</p>
      </section>
      <ConnectorDownloadCard />

      <ConnectorSetup onboarding />

      <p className="notice" style={{ textAlign: 'center', marginTop: 4 }}>
        Need help? Visit the <Link href="/help" className="help-inline-link-text">Help Center</Link>.
      </p>
    </div>
  );
}
