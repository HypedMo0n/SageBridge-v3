import { ConnectorSetup } from '@/components/ConnectorSetup';

export default function OnboardingPage() {
  return <div className="onboarding-shell"><header className="onboarding-head"><span className="auth-mark">S</span><div><p className="kicker">External beta setup</p><h1>Connect your Sage company</h1><p className="notice">Pair a trusted desktop connector and wait for the backend to confirm provisioning.</p></div></header><ConnectorSetup onboarding /></div>;
}
