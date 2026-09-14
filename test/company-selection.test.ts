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

test('API client and chrome apply the selected company', () => {
  const apiSource = readFileSync(new URL('../lib/api.ts', import.meta.url), 'utf8');
  const chromeSource = readFileSync(new URL('../components/AppChrome.tsx', import.meta.url), 'utf8');
  assert.match(apiSource, /companyRequestHeaders\(window\.localStorage\)/);
  assert.match(apiSource, /getCompanies\(\)/);
  assert.match(apiSource, /\/api\/companies', undefined, false\)/);
  assert.match(chromeSource, /aria-label="Select company"/);
  assert.match(chromeSource, /saveSelectedCompany\(window\.localStorage/);
  assert.match(chromeSource, /window\.location\.reload\(\)/);
});

test('omits company header before a company has been selected', () => {
  const storage = { getItem() { return null; }, setItem() {} };
  assert.deepEqual(companyRequestHeaders(storage), {});
});
