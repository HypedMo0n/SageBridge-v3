import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

// --- Capabilities client -----------------------------------------------

test('lib/api.ts exposes a Capabilities type matching the API contract shape', () => {
  const apiSource = read('../lib/api.ts');
  assert.match(apiSource, /interface Capabilities\s*\{[^}]*release:\s*string/s);
  assert.match(apiSource, /interface Capabilities\s*\{[^}]*apiVersion:\s*string/s);
  assert.match(apiSource, /interface Capabilities\s*\{[^}]*schemaVersion:\s*string/s);
  assert.match(apiSource, /interface Capabilities\s*\{[^}]*buildSha:\s*string/s);
  assert.match(apiSource, /interface Capabilities\s*\{[^}]*features:\s*Record<string,\s*boolean>/s);
});

test('lib/api.ts calls GET /api/capabilities, not company-scoped', () => {
  const apiSource = read('../lib/api.ts');
  const match = apiSource.match(/async getCapabilities\(\)[\s\S]*?\n {2}\}/);
  assert.ok(match, 'getCapabilities() must exist');
  assert.match(match![0], /\/api\/capabilities/);
  assert.match(match![0], /false,\s*false\)/, 'must not require retried=true or companyScoped=true');
});

test('lib/api.ts exposes getConnectors() for per-connector capability info', () => {
  const apiSource = read('../lib/api.ts');
  assert.match(apiSource, /async getConnectors\(companyId: string\)/);
  assert.match(apiSource, /\/api\/companies\/\$\{encodeURIComponent\(companyId\)\}\/connectors/);
});

// --- No fake accounting authority in CreateWizard -----------------------

test('CreateWizard never presents a client-computed tax/total as Sage-authoritative', () => {
  const wizardSource = read('../components/CreateWizard.tsx');
  assert.doesNotMatch(wizardSource, /1\.13/, 'no hardcoded 13% HST multiplier');
  assert.doesNotMatch(wizardSource, /HST/i, 'no hardcoded tax-rate label');
  assert.doesNotMatch(wizardSource, /\bconst total\b/, 'must not compute a client-side "total" including tax');
});

test('CreateWizard does not collect a note field that is silently discarded', () => {
  const wizardSource = read('../components/CreateWizard.tsx');
  assert.doesNotMatch(wizardSource, /useState\(''\).*\bnote\b/i);
  assert.doesNotMatch(wizardSource, /\bsetNote\b/);
  assert.doesNotMatch(wizardSource, /textarea/i, 'no free-text field whose value is never sent to the API');
});

test('CreateWizard payload sent to the API only contains fields the API/connector consume', () => {
  const wizardSource = read('../components/CreateWizard.tsx');
  const payloadMatch = wizardSource.match(/const payload = \{([^}]*)\}/);
  assert.ok(payloadMatch, 'expected a single payload object built for create calls');
  assert.doesNotMatch(payloadMatch![1], /note/i);
});

// --- Capability gating in CreateWizard and the customer-create form ------

test('CreateWizard and the customer form gate their write action through the shared fail-closed resolver', () => {
  const wizardSource = read('../components/CreateWizard.tsx');
  assert.match(wizardSource, /from '@\/lib\/capability-gate'/, 'must use the shared resolver, not its own inline capability check');
  assert.match(wizardSource, /resolveActionAvailability\(\{ action: 'invoice\.create'/);
  assert.match(wizardSource, /resolveActionAvailability\(\{ action: 'quote\.create'/);
  assert.match(wizardSource, /api\.getConnectors\(/, 'must consult the selected company\'s actual connector, not only deployment-wide capabilities');

  const customerFormSource = read('../app/customers/new/page.tsx');
  assert.match(customerFormSource, /from '@\/lib\/capability-gate'/);
  assert.match(customerFormSource, /resolveActionAvailability\(\{ action: 'customer\.create'/);
  assert.match(customerFormSource, /api\.getConnectors\(/);
});

test('capability fetch failures set an error status, never a fallback to "assume supported"', () => {
  for (const path of ['../components/CreateWizard.tsx', '../app/customers/new/page.tsx']) {
    const source = read(path);
    assert.doesNotMatch(source, /\.catch\(\(\)\s*=>\s*\{\s*\}\)/, `${path}: a capability/connector fetch must not swallow its error silently`);
    assert.match(source, /setCapabilitiesStatus\('error'\)/, `${path}: must set an explicit error status on a failed capabilities fetch`);
    assert.match(source, /setConnectorsStatus\('error'\)/, `${path}: must set an explicit error status on a failed connectors fetch`);
  }
});

test('the submit/post action is disabled for anything other than a resolved "ready" availability', () => {
  const wizardSource = read('../components/CreateWizard.tsx');
  assert.match(wizardSource, /kindSupported = kindAvailability\.status === 'ready'/);

  const customerFormSource = read('../app/customers/new/page.tsx');
  assert.match(customerFormSource, /availability\.status !== 'ready'/);
});

// --- Customer create is reachable from a rendered page -------------------

test('a real "New customer" link is rendered on the customers list, not just the /customers/new route', () => {
  const pageSource = read('../app/customers/page.tsx');
  assert.match(pageSource, /<Link href="\/customers\/new"/);
  // Guard against the link being dead code inside a branch that never renders.
  assert.match(pageSource, /return\s*<>[\s\S]*<Link href="\/customers\/new"[\s\S]*<\/>/);
});

// --- Sync chip reflects real connector liveness --------------------------

test('AppChrome header chip reflects real connector online state, not a hardcoded "Synced"', () => {
  const chromeSource = read('../components/AppChrome.tsx');
  assert.doesNotMatch(chromeSource, />Synced<\/Link>/, 'must not always render "Synced" regardless of state');
  assert.match(chromeSource, /selectedCompany\?\.online/);
  assert.match(chromeSource, /'Offline'/);
});

// --- Confirmed-dead components were actually removed ----------------------

test('orphaned components confirmed to have zero imports were deleted, not left as dead code', () => {
  for (const path of ['BottomNav', 'ConnectorSetup', 'CustomerCard', 'InvoiceCard', 'SearchBar']) {
    assert.equal(existsSync(new URL(`../components/${path}.tsx`, import.meta.url)), false, `components/${path}.tsx should have been removed`);
  }
});

// --- Settings About section is honest about missing metadata --------------

test('Settings About section sources real metadata and falls back to "unknown", never a fabricated value', () => {
  const settingsSource = read('../app/settings/page.tsx');
  assert.match(settingsSource, /api\.getCapabilities\(\)/);
  assert.match(settingsSource, /api\.getConnectors\(/);
  assert.match(settingsSource, /'unknown'/);
});
