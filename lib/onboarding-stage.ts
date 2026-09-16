import type { CompanyDetail, ProvisioningState, ProvisioningStatus } from './api';

// Purely local, user-driven pre-pairing progress. The backend has no way to
// observe whether a human has downloaded or installed anything, so these
// two steps are gated by explicit clicks, not inferred state. Persisted
// only so a refresh doesn't force the user back to square one - it is
// NEVER used to unlock protected routes (see AuthProvider.setupComplete,
// which is gated on provisioningState === 'ready' alone).
export type LocalStep = 'download' | 'install' | 'pair';
export const LOCAL_STEP_KEY = 'sagebridge.onboarding.localStep';
export const LOCAL_STEPS: LocalStep[] = ['download', 'install', 'pair'];

// Scoped per company now that multi-company workspaces exist - one
// account's companies can be at different local pre-pairing steps
// (e.g. company A already paired, company B still needs a download
// acknowledgement). Falls back to the bare key when no company id is
// known yet (e.g. workspace still loading), so behavior degrades
// gracefully rather than throwing.
export function localStepStorageKey(companyId?: string | null): string {
  return companyId ? `${LOCAL_STEP_KEY}:${companyId}` : LOCAL_STEP_KEY;
}

export function readLocalStep(storage: Pick<Storage, 'getItem'> | undefined, companyId?: string | null): LocalStep {
  const stored = storage?.getItem(localStepStorageKey(companyId));
  return (LOCAL_STEPS as string[]).includes(stored || '') ? (stored as LocalStep) : 'download';
}

export function writeLocalStep(storage: Pick<Storage, 'setItem'> | undefined, companyId: string | null | undefined, step: LocalStep) {
  storage?.setItem(localStepStorageKey(companyId), step);
}

// From here on, the backend's own provisioning state machine (see
// sagebridge-api src/handlers/phase1.ts PROVISIONING_STATES/NEXT) is
// authoritative - the frontend only renders it, never guesses ahead of it.
export type Stage = 'download' | 'install' | 'pair' | 'connect' | 'importing' | 'failed' | 'ready';

export const FSM_ORDER: ProvisioningStatus[] = ['awaiting_connector', 'connector_connected', 'checking_sage', 'company_selected', 'provisioning', 'syncing_customers', 'syncing_invoices', 'syncing_products', 'syncing_quotes', 'finalizing', 'ready'];
export const IMPORTING_STATES: ProvisioningStatus[] = ['checking_sage', 'company_selected', 'provisioning', 'syncing_customers', 'syncing_invoices', 'syncing_products', 'syncing_quotes', 'finalizing'];
export const IMPORT_ITEMS: Array<{ state: ProvisioningStatus; label: string }> = [
  { state: 'syncing_customers', label: 'Customers' },
  { state: 'syncing_invoices', label: 'Invoices' },
  { state: 'syncing_products', label: 'Products & services' },
  { state: 'syncing_quotes', label: 'Quotes' },
];

/**
 * Reconstructs the correct onboarding stage from backend state (company +
 * provisioning), falling back to the local pre-pairing step only when the
 * backend has no signal yet at all. This is what makes onboarding
 * resumable: refreshing, closing the tab, or reopening later always lands
 * on the right stage instead of restarting from Download.
 */
export function deriveStage(company: CompanyDetail | null, provisioning: ProvisioningState | null, localStep: LocalStep): Stage {
  const state = provisioning?.state;
  if (state === 'ready') return 'ready';
  if (state === 'failed') return 'failed';
  if (state && IMPORTING_STATES.includes(state)) return 'importing';
  const connectorLive = company?.connectorStatus === 'connected' || state === 'connector_connected';
  if (connectorLive) return 'connect';
  if (!company) return 'download';
  return localStep;
}

/**
 * Status of one import row against the REAL provisioning FSM order. Both
 * sides of the comparison use the same FSM_ORDER index scale - the
 * previous implementation compared a 0-3 display-array index against a
 * 0-10 FSM index, which meant a company entering 'checking_sage' (index 2)
 * showed "Customers" (display index 0) as already complete.
 */
export function importItemStatus(resourceState: ProvisioningStatus, current: ProvisioningStatus | undefined): 'waiting' | 'active' | 'complete' {
  if (!current) return 'waiting';
  const resourceIdx = FSM_ORDER.indexOf(resourceState);
  const currentIdx = FSM_ORDER.indexOf(current);
  if (currentIdx > resourceIdx) return 'complete';
  if (currentIdx === resourceIdx) return 'active';
  return 'waiting';
}

/**
 * Whether the backend has actually detected/selected a Sage 50 company yet
 * ('company_selected' or later), as distinct from merely checking for one
 * ('checking_sage'). Claiming detection during checking_sage is factually
 * wrong - the connector hasn't found anything yet at that point.
 */
export function sageDetectionStatus(state: ProvisioningStatus | undefined): 'checking' | 'detected' {
  if (!state) return 'checking';
  const companySelectedIdx = FSM_ORDER.indexOf('company_selected');
  const idx = FSM_ORDER.indexOf(state);
  return idx >= companySelectedIdx ? 'detected' : 'checking';
}

/**
 * The single source of truth for "has THE CURRENTLY SELECTED company
 * finished onboarding". Deliberately scoped to one company, not "any
 * company on this account" - with multi-company workspaces, one company
 * being ready must never unlock the app for a different, still-incomplete
 * selected company. A connected connector is also NOT completion - only
 * the provisioning FSM's terminal 'ready' state means Sage 50 data has
 * actually finished importing. Used by AuthProvider to gate protected
 * routes for the company the user currently has selected.
 */
export function isSetupComplete(company: Pick<CompanyDetail, 'provisioningState'> | null | undefined): boolean {
  return company?.provisioningState === 'ready';
}
