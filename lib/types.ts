export interface Customer {
  id: number;
  sageId: string;
  name: string;
  email: string | null;
  phone: string | null;
  balance: number;
  status: string;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  lastSyncedAt: string;
}

export interface Invoice {
  id: number;
  sageId: string;
  invoiceNumber: string;
  date: string;
  dueDate: string | null;
  total: number;
  balance: number;
  status: string;
  customerSageId: string;
  customerName: string;
  /** Only populated by the single-invoice GET (api.getInvoice), not the list. */
  customerEmail?: string | null;
  customerPhone?: string | null;
}

export interface Capabilities {
  email: boolean;
}

export interface QuoteLine {
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  date: string;
  customerSageId: string;
  customerName: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  lines: QuoteLine[];
}

export interface Product {
  id: number;
  sageId: string;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  stock: number | null;
  reorderLevel: number | null;
  category: string | null;
  isService: boolean;
  lastSyncedAt: string;
}

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
}

export interface Organization {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'member' | string;
}

export type ProvisioningStatus =
  | 'awaiting_connector'
  | 'connector_connected'
  | 'checking_sage'
  | 'company_selected'
  | 'provisioning'
  | 'syncing_customers'
  | 'syncing_invoices'
  | 'syncing_products'
  | 'syncing_quotes'
  | 'finalizing'
  | 'ready'
  | 'failed';

export interface ProvisioningCounts {
  customers?: number;
  invoices?: number;
  products?: number;
  [resource: string]: number | undefined;
}

export interface ProvisioningState {
  state: ProvisioningStatus;
  progress: number;
  errorCode: string | null;
  errorMessage: string | null;
  updatedAt: string | null;
  counts: ProvisioningCounts;
}

export interface Company {
  id: string;
  organizationId?: string;
  name: string;
  connectorStatus: string;
  lastSeenAt: string | null;
  online: boolean;
  provisioningState?: ProvisioningStatus | null;
  provisioningProgress?: number | null;
  createdAt?: string;
}

export type ConnectorStatus = 'online' | 'offline' | 'revoked' | 'unknown';
export interface Connector {
  id: string;
  name: string;
  /** The paired machine's own reported name, e.g. "OFFICE-PC" - distinct from `name` (a display label). */
  machineName: string | null;
  companyId: string;
  status: ConnectorStatus;
  lastSeenAt: string | null;
  /** Last time this connector completed a sync - distinct from lastSeenAt (heartbeat liveness). */
  lastSyncAt: string | null;
  pairedAt?: string | null;
  revokedAt?: string | null;
  version?: string | null;
}

export interface PairingCode {
  code: string;
  expiresAt: string;
}

export interface BootstrapState {
  user: AuthUser;
  organization: Organization;
  companies: Company[];
}

export interface MeState {
  user: AuthUser;
  organizations: Organization[];
}

export interface JobStatus {
  jobId: string;
  status: 'pending' | 'claimed' | 'running' | 'succeeded' | 'failed';
  resource?: { type: string; id: string };
  error?: string;
}
