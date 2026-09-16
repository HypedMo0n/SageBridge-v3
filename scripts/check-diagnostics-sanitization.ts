// Proves the Support Diagnostics builder never surfaces a secret, even if
// a caller accidentally hands it one - the required defense-in-depth from
// PART 9 of the Help Center spec. Run with:
//   npx tsx scripts/check-diagnostics-sanitization.ts

import assert from 'node:assert/strict';
import { buildDiagnostics, diagnosticsToText } from '../lib/diagnostics';
import type { Company, Connector, HealthState, ProvisioningState } from '../lib/api';

const BANNED_SUBSTRINGS = [
  'Bearer ', 'eyJhbGciOi', // a real JWT always starts like this
  'Authorization', 'password', 'secret', 'credential', 'pairing-code-ABCD', 'api_key', 'cloudflare-token',
];

function assertClean(text: string, label: string) {
  const lower = text.toLowerCase();
  for (const banned of BANNED_SUBSTRINGS) {
    assert.ok(!lower.includes(banned.toLowerCase()), `${label} leaked a banned value: "${banned}"\n${text}`);
  }
}

// 1) Normal, fully-populated input should produce a clean, readable report.
const company: Company = { id: 'company_1', name: 'Universal Construction', connectorStatus: 'online', lastSeenAt: new Date().toISOString(), online: true };
const connector: Connector = { id: 'connector_abcdefgh12345', name: 'Office PC', machineName: 'OFFICE-PC', companyId: 'company_1', status: 'online', lastSeenAt: new Date().toISOString(), lastSyncAt: new Date().toISOString(), version: '1.1.0' };
const provisioning: ProvisioningState = { state: 'ready', progress: 100, errorCode: null, errorMessage: null, updatedAt: new Date().toISOString(), counts: {} };
const health: HealthState = { status: 'healthy', release: 'beta1-rc1', buildSha: 'abcdef1', apiContractVersion: 'v1' };

const normal = buildDiagnostics({ company, connector, provisioning, health, healthReachable: true });
const normalText = diagnosticsToText(normal);
assertClean(normalText, 'normal diagnostics text');
assert.ok(normalText.includes('Universal Construction'), 'company name should appear in diagnostics');
assert.ok(normal.some((field) => field.label === 'Connector ID (abbreviated)'), 'connector id should appear (abbreviated)');
assert.ok(!normalText.includes('connector_abcdefgh12345'), 'connector id must be abbreviated, not shown in full');

// 2) Adversarial input: a caller that (by mistake) puts a secret-shaped
// value into a field the builder does read. The sanitizer must strip it
// rather than let it through just because the shape of the object matched.
const dirtyConnector = { ...connector, version: 'Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.secret.payload' } as Connector;
const dirty = buildDiagnostics({ company, connector: dirtyConnector, provisioning, health, healthReachable: true });
const dirtyText = diagnosticsToText(dirty);
assertClean(dirtyText, 'diagnostics text built from a dirty connector.version field');
assert.ok(!dirty.some((field) => field.label === 'Connector version'), 'a field containing a banned pattern must be dropped entirely, not partially redacted');

// 3) Missing data must be omitted, never fabricated.
const sparse = buildDiagnostics({ company: null, connector: null, provisioning: null, health: null, healthReachable: null });
assert.equal(sparse.length, 1, 'with nothing available, only the frontend version should be reported');
assert.equal(sparse[0].label, 'SageBridge frontend version');

console.log('Diagnostics sanitization assertions passed.');
