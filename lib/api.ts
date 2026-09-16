import { auth } from './firebase';
import type { BootstrapState, Capabilities, Company, Connector, Customer, HealthState, Invoice, JobStatus, MeState, PairingCode, Product, ProvisioningState, ProvisioningStatus } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sagebridge-api.cheikhmounirk.workers.dev';
const COMPANY_STORAGE_KEY = 'sagebridge-company-id';
let selectedCompanyId = '';

function readCompanyId() {
  if (selectedCompanyId) return selectedCompanyId;
  if (typeof window !== 'undefined') selectedCompanyId = window.localStorage.getItem(COMPANY_STORAGE_KEY) || '';
  return selectedCompanyId;
}

export function setSelectedCompanyId(companyId: string) {
  selectedCompanyId = companyId;
  if (typeof window !== 'undefined') {
    if (companyId) window.localStorage.setItem(COMPANY_STORAGE_KEY, companyId);
    else window.localStorage.removeItem(COMPANY_STORAGE_KEY);
  }
}

export function getSelectedCompanyId() { return readCompanyId(); }

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

type ErrorBody = { error?: string | { message?: string; code?: string }; message?: string; code?: string };
type RawCompany = Record<string, unknown> & { id: string };
type RawProvisioning = Record<string, unknown>;
type RawConnector = Record<string, unknown> & { id: string };

function stringValue(value: unknown, fallback = '') { return typeof value === 'string' ? value : fallback; }
function numberValue(value: unknown, fallback = 0) { return typeof value === 'number' && Number.isFinite(value) ? value : fallback; }
function nullableString(value: unknown) { return typeof value === 'string' ? value : null; }

function mapCompany(row: RawCompany): Company {
  return {
    id: row.id,
    organizationId: stringValue(row.organizationId ?? row.organization_id) || undefined,
    name: stringValue(row.name ?? row.sageCompanyName ?? row.sage_company_name, 'Sage company'),
    connectorStatus: stringValue(row.connectorStatus ?? row.connector_status, 'unknown'),
    lastSeenAt: nullableString(row.lastSeenAt ?? row.last_seen_at),
    online: row.online === true,
    provisioningState: (nullableString(row.provisioningState ?? row.provisioning_state) as ProvisioningStatus | null),
    provisioningProgress: typeof (row.provisioningProgress ?? row.provisioning_progress) === 'number' ? Number(row.provisioningProgress ?? row.provisioning_progress) : null,
    createdAt: stringValue(row.createdAt ?? row.created_at) || undefined,
  };
}

function mapConnector(row: RawConnector, companyId: string): Connector {
  // "revoked" (an explicit, permanent, admin-driven state) is distinct from
  // liveness (online/offline) - a revoked connector is never "offline", it
  // is "not paired" and must not be shown as if it might come back online.
  const revoked = !!(row.revokedAt ?? row.revoked_at) || row.status === 'revoked';
  return {
    id: row.id,
    name: stringValue(row.displayName ?? row.display_name, 'Sage 50 connector'),
    machineName: nullableString(row.machineName ?? row.machine_name),
    companyId,
    status: revoked ? 'revoked' : row.online === true ? 'online' : 'offline',
    lastSeenAt: nullableString(row.lastSeenAt ?? row.last_seen_at),
    lastSyncAt: nullableString(row.lastSyncAt ?? row.last_sync_at),
    pairedAt: nullableString(row.createdAt ?? row.created_at),
    revokedAt: nullableString(row.revokedAt ?? row.revoked_at),
    version: nullableString(row.version),
  };
}

function mapProvisioning(row: RawProvisioning): ProvisioningState {
  const rawCounts = row.counts && typeof row.counts === 'object' ? row.counts as Record<string, unknown> : {};
  const counts = Object.fromEntries(Object.entries(rawCounts).filter((entry): entry is [string, number] => typeof entry[1] === 'number'));
  return {
    state: stringValue(row.state, 'awaiting_connector') as ProvisioningStatus,
    progress: Math.max(0, Math.min(100, numberValue(row.progress))),
    errorCode: nullableString(row.errorCode ?? row.error_code),
    errorMessage: nullableString(row.errorMessage ?? row.error_message),
    updatedAt: nullableString(row.updatedAt ?? row.updated_at),
    counts,
  };
}

class SageBridgeAPI {
  private async request<T>(endpoint: string, options: RequestInit = {}, retried = false, companyScoped = false): Promise<T> {
    const user = auth.currentUser;
    if (!user) throw new ApiError('Your session has ended. Please sign in again.', 401, 'auth/session-ended');
    const token = await user.getIdToken(retried);
    const companyId = companyScoped ? readCompanyId() : '';
    if (companyScoped && !companyId) throw new ApiError('Select a company before continuing.', 400, 'COMPANY_REQUIRED');
    let response: Response;
    try {
      response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(companyScoped ? { 'X-Company-Id': companyId } : {}),
          ...options.headers,
        },
      });
    } catch (cause) {
      // fetch() rejects here only when the request never got a response at
      // all (DNS/connection failure, CORS preflight rejection, offline).
      // The raw exception's message is a browser-internal string ("Load
      // failed" on Safari, "Failed to fetch" on Chrome, "NetworkError..."
      // on Firefox) that is not actionable and not consistent across
      // browsers - every caller's generic error display otherwise shows
      // that raw text verbatim. Normalize it into one clear, actionable
      // ApiError instead, and keep the original in the console for
      // debugging.
      console.error('Network request failed:', endpoint, cause);
      throw new ApiError('Could not reach SageBridge. Check your connection and try again.', 0, 'network/unreachable');
    }
    if (response.status === 401 && !retried) return this.request<T>(endpoint, options, true, companyScoped);
    if (!response.ok) {
      const body = await response.json().catch(() => null) as ErrorBody | null;
      const nested = typeof body?.error === 'object' ? body.error : null;
      throw new ApiError(nested?.message || (typeof body?.error === 'string' ? body.error : body?.message) || `Request failed (${response.status})`, response.status, nested?.code || body?.code);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  /**
   * Like request(), but for a binary (non-JSON) response - used for the PDF
   * export. Shares the same auth/retry/error-parsing behavior so a failed
   * export surfaces the real server error instead of a blob of garbage.
   */
  private async requestBlob(endpoint: string, companyScoped = false, retried = false): Promise<{ blob: Blob; filename: string | null }> {
    const user = auth.currentUser;
    if (!user) throw new ApiError('Your session has ended. Please sign in again.', 401, 'auth/session-ended');
    const token = await user.getIdToken(retried);
    const companyId = companyScoped ? readCompanyId() : '';
    if (companyScoped && !companyId) throw new ApiError('Select a company before continuing.', 400, 'COMPANY_REQUIRED');
    let response: Response;
    try {
      response = await fetch(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}`, ...(companyScoped ? { 'X-Company-Id': companyId } : {}) },
      });
    } catch (cause) {
      console.error('Network request failed:', endpoint, cause);
      throw new ApiError('Could not reach SageBridge. Check your connection and try again.', 0, 'network/unreachable');
    }
    if (response.status === 401 && !retried) return this.requestBlob(endpoint, companyScoped, true);
    if (!response.ok) {
      const body = await response.json().catch(() => null) as ErrorBody | null;
      throw new ApiError((typeof body?.error === 'string' ? body.error : body?.message) || `Request failed (${response.status})`, response.status, body?.code);
    }
    const disposition = response.headers.get('content-disposition') || '';
    const filename = disposition.match(/filename="?([^";]+)"?/)?.[1] || null;
    return { blob: await response.blob(), filename };
  }

  async bootstrap(): Promise<BootstrapState> {
    const response = await this.request<Omit<BootstrapState, 'companies'> & { companies: RawCompany[] }>('/auth/bootstrap', { method: 'POST' });
    return { ...response, companies: response.companies.map(mapCompany) };
  }

  async me(): Promise<MeState> { return this.request<MeState>('/auth/me'); }

  async getCompanies(organizationId: string): Promise<Company[]> {
    const response = await this.request<{ companies: RawCompany[] }>(`/api/organizations/${encodeURIComponent(organizationId)}/companies`);
    return response.companies.map(mapCompany);
  }

  async createCompany(organizationId: string, name: string): Promise<Company> {
    const response = await this.request<{ company: RawCompany }>(`/api/organizations/${encodeURIComponent(organizationId)}/companies`, { method: 'POST', body: JSON.stringify({ name }) });
    return mapCompany(response.company);
  }

  async createPairingCode(companyId: string): Promise<PairingCode> {
    return this.request<PairingCode>(`/api/companies/${encodeURIComponent(companyId)}/pairing-codes`, { method: 'POST' });
  }

  async getProvisioning(companyId: string): Promise<ProvisioningState> {
    const response = await this.request<{ provisioning: RawProvisioning }>(`/api/companies/${encodeURIComponent(companyId)}/provisioning`);
    return mapProvisioning(response.provisioning);
  }

  async getConnectors(companyId: string): Promise<Connector[]> {
    const response = await this.request<{ connectors: RawConnector[] }>(`/api/companies/${encodeURIComponent(companyId)}/connectors`);
    return response.connectors.map((row) => mapConnector(row, companyId));
  }

  async revokeConnector(id: string): Promise<void> { await this.request(`/api/connectors/${encodeURIComponent(id)}/revoke`, { method: 'POST' }); }

  async startProvisioning(companyId: string): Promise<ProvisioningState> {
    const response = await this.request<{ provisioning: RawProvisioning }>(`/api/companies/${encodeURIComponent(companyId)}/provisioning`, { method: 'POST' });
    return mapProvisioning(response.provisioning);
  }

  async getCustomers(): Promise<Customer[]> { return (await this.request<{ customers: Customer[] }>('/api/customers', {}, false, true)).customers; }
  async getCustomer(id: string): Promise<Customer | null> { return (await this.getCustomers()).find((item) => item.sageId === id || item.id.toString() === id) || null; }
  async createCustomer(data: { name: string; email?: string; phone?: string; address?: string }): Promise<{ jobId: string; status: string }> {
    return this.request('/api/customers', { method: 'POST', body: JSON.stringify({ customer: data, idempotencyKey: `customer-create-${crypto.randomUUID()}` }) }, false, true);
  }
  async getJobStatus(jobId: string): Promise<JobStatus> { return this.request(`/api/jobs/${encodeURIComponent(jobId)}`, {}, false, true); }
  async createQuote(data: { customerId: string; lines: Array<{ sku: string; quantity: number; unitPrice: number }> }): Promise<{ jobId: string; status: string }> {
    return this.request('/api/quotes', { method: 'POST', body: JSON.stringify({ quote: data, idempotencyKey: `quote-create-${crypto.randomUUID()}` }) }, false, true);
  }
  async createInvoice(data: { customerId: string; lines: Array<{ sku: string; quantity: number; unitPrice: number }> }): Promise<{ jobId: string; status: string }> {
    return this.request('/api/invoices', { method: 'POST', body: JSON.stringify({ invoice: data, idempotencyKey: `invoice-create-${crypto.randomUUID()}` }) }, false, true);
  }
  async getInvoices(): Promise<Invoice[]> { return (await this.request<{ invoices: Invoice[] }>('/api/invoices', {}, false, true)).invoices; }
  async getInvoice(id: string): Promise<Invoice | null> {
    try {
      return (await this.request<{ invoice: Invoice }>(`/api/invoices/${encodeURIComponent(id)}`, {}, false, true)).invoice;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }
  async getInvoicePdf(id: string): Promise<{ blob: Blob; filename: string | null }> {
    return this.requestBlob(`/api/invoices/${encodeURIComponent(id)}/pdf`, true);
  }
  async emailInvoice(id: string, data: { to?: string; subject?: string; message?: string }): Promise<{ sent: boolean; to: string }> {
    return this.request(`/api/invoices/${encodeURIComponent(id)}/email`, { method: 'POST', body: JSON.stringify(data) }, false, true);
  }
  async getCapabilities(): Promise<Capabilities> { return this.request<Capabilities>('/api/capabilities'); }

  /**
   * GET /health is deliberately unauthenticated and carries no secrets (see
   * sagebridge-api's src/handlers/health.ts) - it's the one endpoint safe to
   * call without a signed-in user, for Help Center diagnostics.
   */
  async health(): Promise<HealthState> {
    const response = await fetch(`${API_URL}/health`);
    if (!response.ok) throw new ApiError(`Request failed (${response.status})`, response.status);
    return response.json() as Promise<HealthState>;
  }
  async getCustomerInvoices(customerSageId: string): Promise<Invoice[]> { return (await this.getInvoices()).filter((item) => item.customerSageId === customerSageId); }
  async getProducts(): Promise<Product[]> { const response = await this.request<{ all?: Product[]; products?: Product[] }>('/api/products', {}, false, true); return response.all || response.products || []; }
  async getProduct(id: string): Promise<Product | null> { return (await this.getProducts()).find((item) => item.sku === id || item.id.toString() === id) || null; }
}

export const api = new SageBridgeAPI();
export type { BootstrapState, Capabilities, Company, Connector, Customer, HealthState, Invoice, PairingCode, Product, ProvisioningState } from './types';
