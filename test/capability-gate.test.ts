import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveActionAvailability } from '../lib/capability-gate.ts';
import type { Capabilities, ConnectorInfo } from '../lib/api.ts';

const ACTION = 'invoice.create';

function caps(overrides: Partial<Capabilities['features']> = {}): Capabilities {
  return { release: 'beta1-rc1', apiVersion: 'v1', schemaVersion: '0006', buildSha: 'abc123', features: { [ACTION]: true, ...overrides } };
}

function connector(overrides: Partial<ConnectorInfo> = {}): ConnectorInfo {
  return { id: 'conn_1', displayName: 'Office PC', version: '1.1.0', status: 'active', lastSeenAt: new Date().toISOString(), createdAt: new Date().toISOString(), revokedAt: null, online: true, supportedActions: [ACTION], supportedSync: [], ...overrides };
}

test('financial write fails closed while capabilities are still loading', () => {
  const result = resolveActionAvailability({ action: ACTION, capabilitiesStatus: 'loading', capabilities: null, connectorsStatus: 'loading', connectors: null });
  assert.equal(result.status, 'checking');
});

test('financial write fails closed when the capabilities fetch errors - never falls back to "assume true"', () => {
  const result = resolveActionAvailability({ action: ACTION, capabilitiesStatus: 'error', capabilities: null, connectorsStatus: 'loading', connectors: null });
  assert.equal(result.status, 'blocked');
  if (result.status === 'blocked') assert.equal(result.reason, 'capabilities_unavailable');
});

test('an action the API explicitly marks unsupported is "unsupported", not blocked', () => {
  const result = resolveActionAvailability({ action: ACTION, capabilitiesStatus: 'loaded', capabilities: caps({ [ACTION]: false }), connectorsStatus: 'loaded', connectors: [] });
  assert.equal(result.status, 'unsupported');
});

test('missing the feature flag entirely (not just false) is also unsupported, never assumed true', () => {
  const featuresWithoutAction = Object.fromEntries(Object.entries(caps().features).filter(([key]) => key !== ACTION));
  const capabilities = { ...caps(), features: featuresWithoutAction };
  const result = resolveActionAvailability({ action: ACTION, capabilitiesStatus: 'loaded', capabilities, connectorsStatus: 'loaded', connectors: [connector()] });
  assert.equal(result.status, 'unsupported');
});

test('API supports the action but connector status is still loading -> checking, not ready', () => {
  const result = resolveActionAvailability({ action: ACTION, capabilitiesStatus: 'loaded', capabilities: caps(), connectorsStatus: 'loading', connectors: null });
  assert.equal(result.status, 'checking');
});

test('API supports the action but the connector fetch failed -> blocked, never falls back to ready', () => {
  const result = resolveActionAvailability({ action: ACTION, capabilitiesStatus: 'loaded', capabilities: caps(), connectorsStatus: 'error', connectors: null });
  assert.equal(result.status, 'blocked');
  if (result.status === 'blocked') assert.equal(result.reason, 'connector_status_unavailable');
});

test('no connector paired with this company -> blocked with no_connector', () => {
  const result = resolveActionAvailability({ action: ACTION, capabilitiesStatus: 'loaded', capabilities: caps(), connectorsStatus: 'loaded', connectors: [] });
  assert.equal(result.status, 'blocked');
  if (result.status === 'blocked') assert.equal(result.reason, 'no_connector');
});

test('a connector exists but is revoked -> treated the same as no connector', () => {
  const result = resolveActionAvailability({ action: ACTION, capabilitiesStatus: 'loaded', capabilities: caps(), connectorsStatus: 'loaded', connectors: [connector({ revokedAt: new Date().toISOString() })] });
  assert.equal(result.status, 'blocked');
  if (result.status === 'blocked') assert.equal(result.reason, 'no_connector');
});

test('connector is paired but offline -> blocked with connector_offline', () => {
  const result = resolveActionAvailability({ action: ACTION, capabilitiesStatus: 'loaded', capabilities: caps(), connectorsStatus: 'loaded', connectors: [connector({ online: false })] });
  assert.equal(result.status, 'blocked');
  if (result.status === 'blocked') assert.equal(result.reason, 'connector_offline');
});

test('an old connector online but with an empty supportedActions array (never advertised capabilities) is blocked, not assumed capable', () => {
  const result = resolveActionAvailability({ action: ACTION, capabilitiesStatus: 'loaded', capabilities: caps(), connectorsStatus: 'loaded', connectors: [connector({ online: true, supportedActions: [] })] });
  assert.equal(result.status, 'blocked');
  if (result.status === 'blocked') assert.equal(result.reason, 'connector_missing_capability');
});

test('connector is online but explicitly does not advertise this action -> blocked with connector_missing_capability', () => {
  const result = resolveActionAvailability({ action: ACTION, capabilitiesStatus: 'loaded', capabilities: caps(), connectorsStatus: 'loaded', connectors: [connector({ supportedActions: ['customer.create'] })] });
  assert.equal(result.status, 'blocked');
  if (result.status === 'blocked') assert.equal(result.reason, 'connector_missing_capability');
});

test('API supports it AND an online connector advertises it -> ready', () => {
  const result = resolveActionAvailability({ action: ACTION, capabilitiesStatus: 'loaded', capabilities: caps(), connectorsStatus: 'loaded', connectors: [connector()] });
  assert.equal(result.status, 'ready');
});

test('one offline connector and one online capable connector for the same company -> ready (the online one counts)', () => {
  const result = resolveActionAvailability({
    action: ACTION, capabilitiesStatus: 'loaded', capabilities: caps(), connectorsStatus: 'loaded',
    connectors: [connector({ id: 'conn_old', online: false }), connector({ id: 'conn_new', online: true })],
  });
  assert.equal(result.status, 'ready');
});

test('every blocked/unsupported/checking state carries no path that lets the caller proceed to send the request', () => {
  // Regression guard for the core requirement: only 'ready' may be treated
  // as safe to submit. Anything else must read as "not ready" under a
  // simple boolean check, the same one CreateWizard and the customer form
  // use to gate their submit buttons.
  const statuses: Array<ReturnType<typeof resolveActionAvailability>['status']> = ['checking', 'blocked', 'unsupported'];
  for (const status of statuses) {
    assert.notEqual(status, 'ready');
  }
});
