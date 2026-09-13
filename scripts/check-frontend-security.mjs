import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));
const layout = read('app/layout.tsx');
const api = read('lib/api.ts');
const auth = read('components/AuthProvider.tsx');

assert.ok(pkg.dependencies?.firebase, 'Firebase client dependency is required');
assert.match(layout, /<AuthProvider>/, 'Root layout must enforce AuthProvider');
for (const path of ['app/login/page.tsx', 'app/signup/page.tsx', 'app/reset-password/page.tsx', 'app/verify-email/page.tsx']) read(path);
assert.match(auth, /onIdTokenChanged/, 'Auth state must track Firebase ID-token changes');
assert.match(auth, /api\.bootstrap\(\)/, 'Verified users must bootstrap authorized companies');
assert.match(api, /Authorization:\s*`Bearer \$\{token\}`/, 'API calls must use a Firebase Bearer token');
assert.match(api, /'X-Company-Id': companyId/, 'Company-scoped calls must send X-Company-Id');
assert.match(api, /sagebridge-company-id.*uid|companyStorageKey\(uid\)/s, 'Company selection must be scoped per Firebase UID');
assert.doesNotMatch(api, /X-API-Key|universl_main_sage50bridge2026/, 'Frontend must not embed the legacy shared API key');
console.log('Frontend security regression checks passed.');
