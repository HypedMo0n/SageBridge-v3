import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  deriveStage,
  importItemStatus,
  isSetupComplete,
  readLocalStep,
  writeLocalStep,
  LOCAL_STEP_KEY,
} from '../lib/onboarding-stage.ts';
import type { CompanyDetail, ProvisioningState, ProvisioningStatus } from '../lib/api.ts';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) { return values.get(key) ?? null; },
    setItem(key: string, value: string) { values.set(key, value); },
  };
}

function company(overrides: Partial<CompanyDetail> = {}): CompanyDetail {
  return { id: 'cmp_1', name: 'My Sage company', connectorStatus: 'awaiting_connector', lastSeenAt: null, online: false, provisioningState: 'awaiting_connector', ...overrides };
}

function provisioning(state: ProvisioningStatus, overrides: Partial<ProvisioningState> = {}): ProvisioningState {
  return { state, progress: 0, errorCode: null, errorMessage: null, updatedAt: null, counts: {}, ...overrides };
}

// Scenario 1: new verified user, connector not installed.
test('a brand new company with no connector starts on the download step', () => {
  assert.equal(deriveStage(company(), provisioning('awaiting_connector'), 'download'), 'download');
});

// Scenario 2: user downloads and advances to install/pair locally.
test('local step advances explicitly and persists across a simulated refresh', () => {
  const storage = memoryStorage();
  assert.equal(readLocalStep(storage), 'download');
  writeLocalStep(storage, 'install');
  assert.equal(readLocalStep(storage), 'install');
  assert.equal(storage.getItem(LOCAL_STEP_KEY), 'install');
  writeLocalStep(storage, 'pair');
  assert.equal(readLocalStep(storage), 'pair');
});

test('an unrecognized or missing stored value falls back to download, never crashes', () => {
  const storage = memoryStorage();
  storage.setItem(LOCAL_STEP_KEY, 'nonsense');
  assert.equal(readLocalStep(storage), 'download');
  assert.equal(readLocalStep(undefined), 'download');
});

// Root cause: a company always exists after bootstrap (bootstrapUser always
// creates one), so a real user must never get silently parked on "pair"
// while still on their local download/install step.
test('an existing, not-yet-connected company does not override the local download/install step', () => {
  const c = company({ connectorStatus: 'awaiting_connector' });
  const p = provisioning('awaiting_connector');
  assert.equal(deriveStage(c, p, 'download'), 'download');
  assert.equal(deriveStage(c, p, 'install'), 'install');
  assert.equal(deriveStage(c, p, 'pair'), 'pair');
});

// Scenario 4/5: connector pairs - backend state becomes authoritative
// regardless of whatever local step the user was on.
test('a connected connector moves to the connect stage even if the local step never advanced', () => {
  const c = company({ connectorStatus: 'connected' });
  assert.equal(deriveStage(c, provisioning('awaiting_connector'), 'download'), 'connect');
  assert.equal(deriveStage(company(), provisioning('connector_connected'), 'download'), 'connect');
});

// Scenario 7/8: user starts setup - checking_sage and beyond are all
// "importing" regardless of local step (the old fictional confirm-company
// gate, which depended on a sageCompanyName field the API never returns,
// is removed entirely).
test('checking_sage through finalizing all resolve to the importing stage', () => {
  const importingStates: ProvisioningStatus[] = ['checking_sage', 'company_selected', 'provisioning', 'syncing_customers', 'syncing_invoices', 'syncing_products', 'syncing_quotes', 'finalizing'];
  for (const state of importingStates) {
    assert.equal(deriveStage(company(), provisioning(state), 'download'), 'importing', `expected importing for ${state}`);
  }
});

// Scenario 10: ready is authoritative no matter what.
test('a ready provisioning state always resolves to ready', () => {
  assert.equal(deriveStage(company({ connectorStatus: 'awaiting_connector' }), provisioning('ready'), 'download'), 'ready');
});

// Scenario 16 (frontend half): failed provisioning is its own stage, distinct from importing.
test('a failed provisioning state resolves to failed, not importing or ready', () => {
  assert.equal(deriveStage(company(), provisioning('failed'), 'download'), 'failed');
});

// Scenario 13: refresh during provisioning resumes correctly straight from
// backend state - local step is irrelevant once the backend has progressed.
test('provisioning state, not local step, decides the stage once the connector has ever connected', () => {
  const c = company({ connectorStatus: 'connected' });
  assert.equal(deriveStage(c, provisioning('syncing_products'), 'pair'), 'importing');
  assert.equal(deriveStage(c, provisioning('ready'), 'pair'), 'ready');
});

// Scenario 9: import progress must use the real FSM index, not the
// 4-item display array's own index - this is the concrete regression test
// for the "index mismatch" bug (checking_sage previously showed Customers
// as already complete).
test('import item status reflects the true provisioning FSM order, not display-array position', () => {
  assert.equal(importItemStatus('syncing_customers', 'checking_sage'), 'waiting', 'checking_sage must not mark customers complete');
  assert.equal(importItemStatus('syncing_customers', 'company_selected'), 'waiting');
  assert.equal(importItemStatus('syncing_customers', 'provisioning'), 'waiting');
  assert.equal(importItemStatus('syncing_customers', 'syncing_customers'), 'active');
  assert.equal(importItemStatus('syncing_customers', 'syncing_invoices'), 'complete');
  assert.equal(importItemStatus('syncing_invoices', 'syncing_customers'), 'waiting');
  assert.equal(importItemStatus('syncing_invoices', 'syncing_invoices'), 'active');
  assert.equal(importItemStatus('syncing_products', 'syncing_quotes'), 'complete');
  assert.equal(importItemStatus('syncing_quotes', 'finalizing'), 'complete');
  assert.equal(importItemStatus('syncing_customers', undefined), 'waiting');
});

// Scenario 14/15/16: route-gating completion signal.
test('setup is complete only when a company has actually reached ready', () => {
  assert.equal(isSetupComplete([company({ provisioningState: 'ready' })]), true);
  assert.equal(isSetupComplete([company({ provisioningState: 'awaiting_connector', connectorStatus: 'connected' })]), false);
  assert.equal(isSetupComplete([company({ provisioningState: 'failed' })]), false);
  assert.equal(isSetupComplete([company({ provisioningState: 'syncing_invoices' })]), false);
  assert.equal(isSetupComplete([]), false);
});

test('AuthProvider gates protected routes on isSetupComplete, not raw connectorStatus', () => {
  const source = readFileSync(new URL('../components/AuthProvider.tsx', import.meta.url), 'utf8');
  assert.match(source, /isSetupComplete\(workspace\?\.companies/);
  assert.doesNotMatch(source, /connectorStatus === 'connected'/, 'route gating must not treat a connected connector as setup-complete');
});

test('pairing and provisioning API calls do not require a company already selected in localStorage', () => {
  const source = readFileSync(new URL('../lib/api.ts', import.meta.url), 'utf8');
  assert.match(source, /createPairingCode\(companyId: string\)[\s\S]{0,160}false, false\)/);
  assert.match(source, /getProvisioning\(companyId: string\)[\s\S]{0,220}false, false\)/);
  assert.match(source, /startProvisioning\(companyId: string\)[\s\S]{0,220}false, false\)/);
});
