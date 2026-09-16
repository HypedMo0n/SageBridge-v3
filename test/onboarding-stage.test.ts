import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  deriveStage,
  importItemStatus,
  isSetupComplete,
  sageDetectionStatus,
  readLocalStep,
  writeLocalStep,
  localStepStorageKey,
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
  assert.equal(readLocalStep(storage, 'cmp_1'), 'download');
  writeLocalStep(storage, 'cmp_1', 'install');
  assert.equal(readLocalStep(storage, 'cmp_1'), 'install');
  assert.equal(storage.getItem(localStepStorageKey('cmp_1')), 'install');
  writeLocalStep(storage, 'cmp_1', 'pair');
  assert.equal(readLocalStep(storage, 'cmp_1'), 'pair');
});

test('an unrecognized or missing stored value falls back to download, never crashes', () => {
  const storage = memoryStorage();
  storage.setItem(localStepStorageKey('cmp_1'), 'nonsense');
  assert.equal(readLocalStep(storage, 'cmp_1'), 'download');
  assert.equal(readLocalStep(undefined, 'cmp_1'), 'download');
  assert.equal(readLocalStep(storage, undefined), 'download');
});

// Optional cleanup: the local pre-pairing step is scoped per company, since
// a multi-company account can have one company already paired while
// another has never even been downloaded for.
test('local step is scoped per company, not shared across a multi-company workspace', () => {
  const storage = memoryStorage();
  writeLocalStep(storage, 'cmp_a', 'pair');
  writeLocalStep(storage, 'cmp_b', 'download');
  assert.equal(readLocalStep(storage, 'cmp_a'), 'pair');
  assert.equal(readLocalStep(storage, 'cmp_b'), 'download');
  assert.notEqual(localStepStorageKey('cmp_a'), localStepStorageKey('cmp_b'));
});

test('local step falls back to the bare key when no company id is known yet', () => {
  assert.equal(localStepStorageKey(undefined), LOCAL_STEP_KEY);
  assert.equal(localStepStorageKey(null), LOCAL_STEP_KEY);
  assert.equal(localStepStorageKey('cmp_1'), `${LOCAL_STEP_KEY}:cmp_1`);
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

// Scenario 14/15/16: route-gating completion signal, scoped to the
// CURRENTLY SELECTED company only - a ready company must never leak
// completion to a sibling company in the same multi-company workspace.
test('setup is complete only when the selected company has actually reached ready', () => {
  assert.equal(isSetupComplete(company({ provisioningState: 'ready' })), true);
  assert.equal(isSetupComplete(company({ provisioningState: 'awaiting_connector', connectorStatus: 'connected' })), false);
  assert.equal(isSetupComplete(company({ provisioningState: 'failed' })), false);
  assert.equal(isSetupComplete(company({ provisioningState: 'syncing_invoices' })), false);
  assert.equal(isSetupComplete(null), false);
  assert.equal(isSetupComplete(undefined), false);
});

test('selected company ready -> app allowed', () => {
  const selected = company({ id: 'cmp_a', provisioningState: 'ready' });
  assert.equal(isSetupComplete(selected), true);
});

test('selected company incomplete -> onboarding required', () => {
  const selected = company({ id: 'cmp_b', provisioningState: 'awaiting_connector' });
  assert.equal(isSetupComplete(selected), false);
});

test('another company ready but selected company incomplete -> onboarding still required', () => {
  // Company A = ready, Company B = awaiting_connector, user has Company B
  // selected. Only the selected company (B) may decide gating - A's
  // readiness must be completely irrelevant here.
  const companyA = company({ id: 'cmp_a', provisioningState: 'ready' });
  const companyB = company({ id: 'cmp_b', provisioningState: 'awaiting_connector' });
  void companyA; // exists only to make the scenario explicit; isSetupComplete never sees it
  assert.equal(isSetupComplete(companyB), false);
});

test('AuthProvider gates protected routes on the selected company only, not raw connectorStatus or any-company readiness', () => {
  const source = readFileSync(new URL('../components/AuthProvider.tsx', import.meta.url), 'utf8');
  assert.match(source, /isSetupComplete\(company\)/, 'gating must be computed from the single selected company, not the whole companies array');
  assert.doesNotMatch(source, /connectorStatus === 'connected'/, 'route gating must not treat a connected connector as setup-complete');
  assert.doesNotMatch(source, /isSetupComplete\(workspace/, 'gating must not pass the whole companies array to isSetupComplete');
});

// Sage detection must reflect the real FSM, not connector connectivity.
test('Sage 50 is only "detected" once the backend reaches company_selected or later', () => {
  assert.equal(sageDetectionStatus('connector_connected'), 'checking');
  assert.equal(sageDetectionStatus('checking_sage'), 'checking');
  assert.equal(sageDetectionStatus('company_selected'), 'detected');
  assert.equal(sageDetectionStatus('provisioning'), 'detected');
  assert.equal(sageDetectionStatus('syncing_customers'), 'detected');
  assert.equal(sageDetectionStatus('finalizing'), 'detected');
  assert.equal(sageDetectionStatus('ready'), 'detected');
  assert.equal(sageDetectionStatus(undefined), 'checking');
});

test('onboarding only claims Sage 50 is detected once provisioning has actually progressed past checking_sage', () => {
  const source = readFileSync(new URL('../app/onboarding/page.tsx', import.meta.url), 'utf8');
  assert.match(source, /sageDetectionStatus\(provisioning\.state\)/, 'the importing screen must derive detection status instead of hardcoding a checkmark');
});

// The connector's actual Beta distribution is a ZIP containing
// SageBridgeConnector.exe - there is no installer/MSI. Copy that implies
// one misleads a non-technical user into looking for a setup wizard that
// doesn't exist.
test('onboarding copy matches the real ZIP + .exe connector artifact, not a fictional installer', () => {
  const onboardingSource = readFileSync(new URL('../app/onboarding/page.tsx', import.meta.url), 'utf8');
  const pairSource = readFileSync(new URL('../app/pair/page.tsx', import.meta.url), 'utf8');
  for (const source of [onboardingSource, pairSource]) {
    assert.doesNotMatch(source, /run the installer/i, 'no installer exists yet for the Beta connector');
  }
  assert.match(onboardingSource, /SageBridgeConnector\.exe/);
  assert.match(onboardingSource, /I've opened SageBridge Connector/);
});

test('pairing and provisioning API calls do not require a company already selected in localStorage', () => {
  const source = readFileSync(new URL('../lib/api.ts', import.meta.url), 'utf8');
  assert.match(source, /createPairingCode\(companyId: string\)[\s\S]{0,160}false, false\)/);
  assert.match(source, /getProvisioning\(companyId: string\)[\s\S]{0,220}false, false\)/);
  assert.match(source, /startProvisioning\(companyId: string\)[\s\S]{0,220}false, false\)/);
});
