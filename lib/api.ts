// API Configuration
const API_URL = 'https://sagebridge-api.cheikhmounirk.workers.dev';
const API_KEY = 'universl_main_sage50bridge2026'; // Existing connector credential; preserve until server-side auth migration.

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

// API Client
class SageBridgeAPI {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(body?.error || `API error: ${response.statusText}`);
    }

    return response.json();
  }

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
