import type { Company, Connector, HealthState, ProvisioningState } from './api';
import { FRONTEND_VERSION } from './version';

export interface DiagnosticField {
  label: string;
  value: string;
}

export interface DiagnosticsInput {
  company: Company | null;
  connector: Connector | null;
  provisioning: ProvisioningState | null;
  health: HealthState | null;
  healthReachable: boolean | null;
}

// Defense in depth: even though every field below is built from an
// allowlist of known-safe values, this guard strips anything whose label
// or value happens to match a banned pattern before it can reach the
// screen or the clipboard. See PART 9 of the Help Center spec for the
// full "never include" list this maps to.
const BANNED_PATTERNS = [/bearer/i, /jwt/i, /authoriz/i, /password/i, /secret/i, /credential/i, /pairing.?code/i, /api.?key/i, /token/i, /cloudflare/i];

function abbreviate(id: string | null | undefined, length = 8): string | null {
  if (!id) return null;
  return id.length <= length ? id : `${id.slice(0, length)}…`;
}

function sanitize(fields: DiagnosticField[]): DiagnosticField[] {
  return fields.filter((field) => !BANNED_PATTERNS.some((pattern) => pattern.test(field.label) || pattern.test(field.value)));
}

/** Builds the customer-safe diagnostics list. Any value that can't be obtained safely is simply omitted. */
export function buildDiagnostics(input: DiagnosticsInput): DiagnosticField[] {
  const fields: DiagnosticField[] = [{ label: 'SageBridge frontend version', value: FRONTEND_VERSION }];

  if (input.company) {
    fields.push({ label: 'Company', value: input.company.name });
    fields.push({ label: 'Sage connection status', value: input.company.online ? 'Online' : 'Offline' });
  }

  if (input.connector) {
    const abbreviatedId = abbreviate(input.connector.id);
    if (abbreviatedId) fields.push({ label: 'Connector ID (abbreviated)', value: abbreviatedId });
    fields.push({ label: 'Connector status', value: input.connector.status });
    if (input.connector.version) fields.push({ label: 'Connector version', value: input.connector.version });
    if (input.connector.lastSyncAt) fields.push({ label: 'Last successful sync', value: input.connector.lastSyncAt });
  }

  if (input.provisioning) fields.push({ label: 'Setup status', value: input.provisioning.state.replaceAll('_', ' ') });

  if (input.healthReachable === false) {
    fields.push({ label: 'API connectivity', value: 'Unreachable' });
  } else if (input.health) {
    fields.push({ label: 'API connectivity', value: input.health.status === 'healthy' ? 'Reachable' : 'Reporting a problem' });
    if (input.health.release) fields.push({ label: 'API release', value: input.health.release });
  }

  return sanitize(fields);
}

export function diagnosticsToText(fields: DiagnosticField[]): string {
  return fields.map((field) => `${field.label}: ${field.value}`).join('\n');
}
