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
console.log('Frontend API contract assertions passed.');
