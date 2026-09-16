import type { CompanyDetail } from './api';

export const COMPANY_STORAGE_KEY = 'sagebridge.selectedCompanyId';

export interface SelectableCompany {
  id: string;
  name: string;
  connectorStatus?: string | null;
  lastSyncAt?: string | null;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function resolveSelectedCompany(
  companies: CompanyDetail[] | SelectableCompany[],
  storedCompanyId: string | null
): string | null {
  if (storedCompanyId && companies.some(company => company.id === storedCompanyId)) {
    return storedCompanyId;
  }
  return companies[0]?.id ?? null;
}

export function saveSelectedCompany(storage: StorageLike, companyId: string): void {
  storage.setItem(COMPANY_STORAGE_KEY, companyId);
}

export function companyRequestHeaders(storage: Pick<StorageLike, 'getItem'>): Record<string, string> {
  const companyId = storage.getItem(COMPANY_STORAGE_KEY);
  return companyId ? { 'X-Company-Id': companyId } : {};
}
