import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const api = readFileSync(new URL('../lib/api.ts', import.meta.url), 'utf8');
const types = readFileSync(new URL('../lib/types.ts', import.meta.url), 'utf8');
const firebase = readFileSync(new URL('../lib/firebase.ts', import.meta.url), 'utf8');

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

function walk(path) {
  return readdirSync(path).flatMap((name) => {
    if (['node_modules', '.next', '.git'].includes(name)) return [];
    const child = join(path, name);
    return statSync(child).isDirectory() ? walk(child) : [child];
  });
}
const source = walk(new URL('..', import.meta.url).pathname)
  .filter((file) => /\.(?:ts|tsx|js|mjs)$/.test(file) && !file.endsWith('check-api-contracts.mjs'))
  .map((file) => readFileSync(file, 'utf8')).join('\n');
assert.ok(!/X-API-Key/i.test(source), 'legacy X-API-Key found in source');
assert.ok(!/universl_main_sage50bridge2026/.test(source), 'legacy API credential found in source');
console.log('Frontend API contract assertions passed.');
