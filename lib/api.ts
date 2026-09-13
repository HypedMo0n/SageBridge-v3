import { auth } from './firebase';

// API Configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sagebridge-api-beta.cheikhmounirk.workers.dev';
const COMPANY_STORAGE_KEY = 'sagebridge-company-id';
let selectedCompanyId = '';
let selectedCompanyOwnerUid = '';

function companyStorageKey(uid: string) { return `${COMPANY_STORAGE_KEY}:${uid}`; }
function readCompanyId() {
  const uid = auth.currentUser?.uid || '';
  if (!uid) return '';
  if (selectedCompanyOwnerUid !== uid) { selectedCompanyOwnerUid = uid; selectedCompanyId = ''; }
  if (selectedCompanyId) return selectedCompanyId;
  if (typeof window !== 'undefined') selectedCompanyId = window.localStorage.getItem(companyStorageKey(uid)) || '';
  return selectedCompanyId;
}
export function setSelectedCompanyId(companyId: string) {
  const uid = auth.currentUser?.uid || '';
  selectedCompanyOwnerUid = uid;
  selectedCompanyId = companyId;
  if (typeof window !== 'undefined' && uid) {
    if (companyId) window.localStorage.setItem(companyStorageKey(uid), companyId);
    else window.localStorage.removeItem(companyStorageKey(uid));
  }
}
export function getSelectedCompanyId() { return readCompanyId(); }

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) { super(message); this.name = 'ApiError'; }
}

// Types
export interface Customer {
  id: number;
  sageId: string;
  name: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  fax: string | null;
  address: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  creditLimit: number | null;
  balance: number | null;
  homeCurrencyBalance: number | null;
  status: string | null;
  lastSyncedAt: string;
}

export interface Invoice {
  id: number;
  sageId: string;
  invoiceNumber: string;
  customerSageId: string | null;
  customerName: string | null;
  date: string;
  reference: string | null;
  preTaxTotal: number | null;
  total: number | null;
  balance: number | null;
  homeCurrencyTotal: number | null;
  homeCurrencyBalance: number | null;
  transactionCurrencyTotal: number | null;
  transactionCurrencyBalance: number | null;
}

export interface Product {
  id: number;
  sageId: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string | null;
  price: number | null;
  stock: number | null;
  reorderLevel: number | null;
  category: string | null;
  isService: boolean | null;
  status: string | null;
  lastSyncedAt: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface AuthUser { id: string; email: string | null; name: string | null }
export interface Organization { id: string; name: string; role: string }
export type ProvisioningStatus = 'awaiting_connector' | 'connector_connected' | 'checking_sage' | 'company_selected' | 'provisioning' | 'syncing_customers' | 'syncing_invoices' | 'syncing_products' | 'syncing_quotes' | 'finalizing' | 'ready' | 'failed';
export interface Company { id: string; organizationId?: string; name: string; connectorStatus: string; lastSeenAt: string | null; online: boolean; provisioningState?: ProvisioningStatus | null; provisioningProgress?: number | null; createdAt?: string }
export interface BootstrapState { user: AuthUser; organization: Organization; companies: Company[] }
export interface PairingCode { code: string; expiresAt: string }
export interface ProvisioningState { state: ProvisioningStatus; progress: number; errorCode: string | null; errorMessage: string | null; updatedAt: string | null; counts: Record<string, number | undefined> }

// API Client
class SageBridgeAPI {
  private async request<T>(endpoint: string, options: RequestInit = {}, retried = false, companyScoped = true): Promise<T> {
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
      console.error('Network request failed:', endpoint, cause);
      throw new ApiError('Could not reach SageBridge. Check your connection and try again.', 0, 'network/unreachable');
    }
    if (response.status === 401 && !retried) return this.request<T>(endpoint, options, true, companyScoped);
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string | { message?: string; code?: string }; message?: string; code?: string } | null;
      const nested = typeof body?.error === 'object' ? body.error : null;
      throw new ApiError(nested?.message || (typeof body?.error === 'string' ? body.error : body?.message) || `Request failed (${response.status})`, response.status, nested?.code || body?.code);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  async bootstrap(): Promise<BootstrapState> {
    const response = await this.request<BootstrapState & { companies: Array<Company & Record<string, unknown>> }>('/auth/bootstrap', { method: 'POST' }, false, false);
    return { ...response, companies: response.companies.map((row) => {
      const raw = row as unknown as Record<string, unknown>;
      const lastSeen = raw.lastSeenAt ?? raw.last_seen_at;
      return { ...row, name: String(raw.name ?? raw.sageCompanyName ?? raw.sage_company_name ?? 'Sage company'), connectorStatus: String(raw.connectorStatus ?? raw.connector_status ?? 'unknown'), lastSeenAt: typeof lastSeen === 'string' ? lastSeen : null, online: raw.online === true };
    }) };
  }

  async createPairingCode(companyId: string): Promise<PairingCode> { return this.request(`/api/companies/${encodeURIComponent(companyId)}/pairing-codes`, { method: 'POST' }); }
  async getProvisioning(companyId: string): Promise<ProvisioningState> { const response = await this.request<{ provisioning: ProvisioningState }>(`/api/companies/${encodeURIComponent(companyId)}/provisioning`); return response.provisioning; }
  async startProvisioning(companyId: string): Promise<ProvisioningState> { const response = await this.request<{ provisioning: ProvisioningState }>(`/api/companies/${encodeURIComponent(companyId)}/provisioning`, { method: 'POST' }); return response.provisioning; }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    const response = await this.request<{ customers: Customer[] }>('/api/customers');
    return response.customers;
  }

  async getCustomer(id: string): Promise<Customer | null> {
    try {
      const customers = await this.getCustomers();
      return customers.find(c => c.sageId === id || c.id.toString() === id) || null;
    } catch (error) {
      console.error('Error fetching customer:', error);
      return null;
    }
  }

  async createCustomer(data: { name: string; email?: string; phone?: string; address?: string }): Promise<{ jobId: string; status: string }> {
    const idempotencyKey = `customer-create-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const response = await this.request<{ jobId: string; status: string; message: string }>('/api/customers', {
      method: 'POST',
      body: JSON.stringify({
        customer: data,
        idempotencyKey
      }),
    });

    return { jobId: response.jobId, status: response.status };
  }

  // Poll job status
  async getJobStatus(jobId: string): Promise<{
    jobId: string;
    status: 'pending' | 'processing' | 'succeeded' | 'failed';
    resource?: { type: string; id: string };
    error?: string;
  }> {
    return this.request(`/api/jobs/${jobId}`);
  }

  async createQuote(data: {
    customerId: string;
    lines: Array<{ sku: string; quantity: number; unitPrice: number }>;
  }): Promise<{ jobId: string; status: string }> {
    const idempotencyKey = `quote-create-${Date.now()}-${crypto.randomUUID()}`;
    const response = await this.request<{ jobId: string; status: string }>('/api/quotes', {
      method: 'POST',
      body: JSON.stringify({ quote: data, idempotencyKey }),
    });
    return response;
  }

  async createInvoice(data: {
    customerId: string;
    lines: Array<{ sku: string; quantity: number; unitPrice: number }>;
  }): Promise<{ jobId: string; status: string }> {
    const idempotencyKey = `invoice-create-${Date.now()}-${crypto.randomUUID()}`;
    const response = await this.request<{ jobId: string; status: string }>('/api/invoices', {
      method: 'POST',
      body: JSON.stringify({ invoice: data, idempotencyKey }),
    });
    return response;
  }

  // Invoices
  async getInvoices(): Promise<Invoice[]> {
    const response = await this.request<{ invoices: Invoice[] }>('/api/invoices');
    return response.invoices;
  }

  async getInvoice(id: string): Promise<Invoice | null> {
    try {
      const invoices = await this.getInvoices();
      return invoices.find(i => i.invoiceNumber === id || i.id.toString() === id) || null;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      return null;
    }
  }

  async getCustomerInvoices(customerSageId: string): Promise<Invoice[]> {
    try {
      const invoices = await this.getInvoices();
      return invoices.filter(i => i.customerSageId === customerSageId);
    } catch (error) {
      console.error('Error fetching customer invoices:', error);
      return [];
    }
  }

  // Products
  async getProducts(): Promise<Product[]> {
    const response = await this.request<{ all?: Product[]; products?: Product[] }>('/api/products');
    return response.all || response.products || [];
  }

  async getProduct(id: string): Promise<Product | null> {
    try {
      const products = await this.getProducts();
      return products.find(p => p.sku === id || p.id.toString() === id) || null;
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  }
}

export const api = new SageBridgeAPI();
