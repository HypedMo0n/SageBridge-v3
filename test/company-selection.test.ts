import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  COMPANY_STORAGE_KEY,
  companyRequestHeaders,
  resolveSelectedCompany,
  saveSelectedCompany
} from '../lib/company-selection.ts';

const companies = [
  { id: 'company-a', name: 'Company A' },
  { id: 'company-b', name: 'Company B' }
];

test('keeps a stored company when it still belongs to the account', () => {
  assert.equal(resolveSelectedCompany(companies, 'company-b'), 'company-b');
});

test('falls back to the first authorized company when stored selection is stale', () => {
  assert.equal(resolveSelectedCompany(companies, 'removed-company'), 'company-a');
  assert.equal(resolveSelectedCompany([], 'company-a'), null);
});

test('persists selection and scopes every API request with X-Company-Id', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem(key: string) { return values.get(key) ?? null; },
    setItem(key: string, value: string) { values.set(key, value); }
  };

  saveSelectedCompany(storage, 'company-b');
  assert.equal(values.get(COMPANY_STORAGE_KEY), 'company-b');
  assert.deepEqual(companyRequestHeaders(storage), { 'X-Company-Id': 'company-b' });
});

// The current architecture loads companies via api.bootstrap() (one call
// returns the user, organization, and every company), not a separate
// getCompanies()/GET /api/companies request - that endpoint and method
// don't exist in this frontend. Company-scoped reads/writes (customers,
// invoices, products, quotes, jobs) still resolve X-Company-Id from the
// same COMPANY_STORAGE_KEY this file defines, just via lib/api.ts's own
// readCompanyId() rather than by calling companyRequestHeaders() directly.
test('companies are loaded via api.bootstrap(), not a separate companies endpoint', () => {
  const apiSource = readFileSync(new URL('../lib/api.ts', import.meta.url), 'utf8');
  assert.match(apiSource, /async bootstrap\(\)[\s\S]*?companies/, 'bootstrap() should be the source of the companies list');
  assert.doesNotMatch(apiSource, /getCompanies\(\)/, 'no separate getCompanies() method exists in the current architecture');
});

test('company-scoped API requests resolve X-Company-Id from the same stored selection', () => {
  const apiSource = readFileSync(new URL('../lib/api.ts', import.meta.url), 'utf8');
  assert.match(apiSource, /import\s*\{\s*COMPANY_STORAGE_KEY\s*\}\s*from\s*'\.\/company-selection'/, 'lib/api.ts must read the same storage key company-selection.ts defines, not a second one');
  assert.match(apiSource, /'X-Company-Id':\s*companyId/);
});

test('AppChrome loads companies from bootstrap and exposes a company selector', () => {
  const chromeSource = readFileSync(new URL('../components/AppChrome.tsx', import.meta.url), 'utf8');
  assert.match(chromeSource, /api\.bootstrap\(\)/);
  assert.match(chromeSource, /resolveSelectedCompany\(/, 'must fall back cleanly when the stored selection is invalid or missing');
  assert.match(chromeSource, /aria-label="Select company"/);
});

test('switching the selected company persists it and reloads to refetch company-scoped data', () => {
  const chromeSource = readFileSync(new URL('../components/AppChrome.tsx', import.meta.url), 'utf8');
  assert.match(chromeSource, /saveSelectedCompany\(window\.localStorage/);
  assert.match(chromeSource, /window\.location\.reload\(\)/);
});

test('omits company header before a company has been selected', () => {
  const storage = { getItem() { return null; }, setItem() {} };
  assert.deepEqual(companyRequestHeaders(storage), {});
});
