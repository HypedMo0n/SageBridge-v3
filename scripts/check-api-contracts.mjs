import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const api = readFileSync(new URL('../lib/api.ts', import.meta.url), 'utf8');
const types = readFileSync(new URL('../lib/types.ts', import.meta.url), 'utf8');
const firebase = readFileSync(new URL('../lib/firebase.ts', import.meta.url), 'utf8');
const sageData = readFileSync(new URL('../lib/useSageData.ts', import.meta.url), 'utf8');
const invoicesPage = readFileSync(new URL('../app/invoices/page.tsx', import.meta.url), 'utf8');

for (const route of [
  "'/auth/bootstrap'",
  "'/auth/me'",
  '`/api/organizations/${encodeURIComponent(organizationId)}/companies`',
  '`/api/companies/${encodeURIComponent(companyId)}/pairing-codes`',
  '`/api/companies/${encodeURIComponent(companyId)}/provisioning`',
  '`/api/connectors/${encodeURIComponent(id)}/revoke`',
]) assert.ok(api.includes(route), `missing canonical route ${route}`);
for (const legacy of ['/api/auth/bootstrap', "'/api/companies'", "'/api/connectors'", '/api/connectors/pairing-code', "'/api/provisioning'"])
  assert.ok(!api.includes(legacy), `legacy route remains: ${legacy}`);
assert.match(api, /Authorization:\s*`Bearer \$\{token\}`/);
assert.match(api, /'X-Company-Id': companyId/);
assert.match(types, /organization:\s*Organization/);
assert.match(types, /expiresAt:\s*string/);
assert.match(types, /progress:\s*number/);
assert.match(firebase, /sagebridge-identity-hypedmoon/);
assert.match(types, /export interface Quote/);
assert.match(api, /async getQuotes\(\)/);
assert.match(api, /'\/api\/quotes'/);
assert.match(sageData, /api\.getQuotes\(\)/);
assert.match(sageData, /return\{customers,invoices,quotes,products,loading,error\}/);
assert.ok(!invoicesPage.includes('Quotes aren’t available in this list yet'));
assert.match(invoicesPage, /QuoteRow/);

function walk(path) {
  return readdirSync(path).flatMap((name) => {
    if (['node_modules', '.next', '.git'].includes(name)) return [];
    const child = join(path, name);
    return statSync(child).isDirectory() ? walk(child) : [child];
  });
}
const source = walk(fileURLToPath(new URL('..', import.meta.url)))
  .filter((file) => /\.(?:ts|tsx|js|mjs)$/.test(file) && !file.endsWith('check-api-contracts.mjs'))
  .map((file) => readFileSync(file, 'utf8')).join('\n');
assert.ok(!/X-API-Key/i.test(source), 'legacy X-API-Key found in source');
assert.ok(!/universl_main_sage50bridge2026/.test(source), 'legacy API credential found in source');

// The provisioning state machine and job status enum are defined by
// sagebridge-api (src/handlers/phase1.ts PROVISIONING_STATES and
// src/handlers/connector.ts / jobs.ts). This frontend has no automated way
// to read that sibling repo, so the canonical lists are pinned here; keep
// them in sync by hand if the backend's enums change.
const PROVISIONING_STATES = ['awaiting_connector','connector_connected','checking_sage','company_selected','provisioning','syncing_customers','syncing_invoices','syncing_products','syncing_quotes','finalizing','ready','failed'];
const connectorSetup = readFileSync(new URL('../components/ConnectorSetup.tsx', import.meta.url).pathname, 'utf8');
for (const state of PROVISIONING_STATES) {
  assert.ok(types.includes(`'${state}'`), `lib/types.ts ProvisioningStatus is missing '${state}'`);
  if (state !== 'failed') assert.ok(connectorSetup.includes(`'${state}'`), `ConnectorSetup STAGES is missing '${state}'`);
}
assert.ok(api.includes('startProvisioning'), 'lib/api.ts is missing startProvisioning()');
assert.ok(connectorSetup.includes('startProvisioning'), 'ConnectorSetup does not call startProvisioning()');

const JOB_STATUSES = ['pending', 'claimed', 'running', 'succeeded', 'failed'];
for (const status of JOB_STATUSES) assert.ok(types.includes(`'${status}'`), `lib/types.ts JobStatus is missing '${status}'`);
assert.ok(!/status\s*===\s*'processing'/.test(source), "source checks for a job status of 'processing', which the API never sends");

assert.ok(api.includes("'/api/invoices'"), 'lib/api.ts is missing the POST /api/invoices route');
assert.ok(api.includes('createInvoice'), 'lib/api.ts is missing createInvoice()');
const createWizard = readFileSync(new URL('../components/CreateWizard.tsx', import.meta.url).pathname, 'utf8');
assert.ok(createWizard.includes('api.createInvoice'), 'CreateWizard does not call api.createInvoice()');
// Guard against the specific stale hardcoded claims this app has carried
// before ("connector doesn't support invoice.create", "only quotes can be
// posted") - narrower than a blanket "invoice posting is" match, because
// the real, capability-driven "Invoice posting is temporarily unavailable."
// message below is legitimate and must NOT trip this guard.
for (const stale of [/invoice posting is not supported/i, /only quotes can be posted/i, /unavailable in the current connector/i, /posting is disabled without faking/i])
  assert.ok(!stale.test(source), `stale hardcoded invoice-blocking copy remains: ${stale}`);
assert.ok(source.includes('Invoice posting is temporarily unavailable.'), 'missing the required capability-driven "temporarily unavailable" copy');

// PDF export and email workflow: real endpoints, not client-side fakes.
assert.ok(api.includes('getInvoicePdf'), 'lib/api.ts is missing getInvoicePdf()');
assert.ok(api.includes('emailInvoice'), 'lib/api.ts is missing emailInvoice()');
assert.ok(api.includes('getCapabilities'), 'lib/api.ts is missing getCapabilities()');
assert.ok(api.includes('/pdf'), 'lib/api.ts is missing the invoice PDF route');
assert.ok(api.includes('/email'), 'lib/api.ts is missing the invoice email route');
assert.ok(api.includes("'/api/capabilities'"), 'lib/api.ts is missing the /api/capabilities route');

// Regression guard: request() previously let a raw fetch() network failure
// (no HTTP response at all) propagate as an unhandled browser-internal
// exception - "Load failed" on Safari, "Failed to fetch" on Chrome - which
// every caller's generic error display then showed verbatim. It must be
// caught at the one place all API calls funnel through and normalized into
// an actionable ApiError instead.
assert.ok(/try\s*\{\s*response\s*=\s*await fetch/.test(api), 'lib/api.ts request() does not wrap fetch() in a try/catch');
assert.ok(api.includes("'network/unreachable'"), "lib/api.ts is missing the 'network/unreachable' error code for fetch-level failures");
assert.ok(api.includes("throw new ApiError('Could not reach SageBridge"), 'lib/api.ts does not normalize a raw fetch() network failure into an actionable ApiError');

console.log('Frontend API contract assertions passed.');
