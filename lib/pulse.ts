/**
 * Business Pulse aggregation layer: turns already-synced invoices/customers
 * into the deterministic, rule-based facts Home needs (prioritized overdue
 * invoices, "needs attention" insights, sync freshness). No AI, no new Sage
 * queries - every input here already comes through useSageData().
 */
import { classifyAgingBucket, type ReceivablesBreakdown } from './aging';
import type { SalesComparison } from './sales';
import { formatMoneyWhole } from './utils';

interface PulseInvoice {
  balance: number;
  dueDate: string | null;
  customerName: string;
  invoiceNumber: string;
}

interface PulseCustomer {
  lastSyncedAt: string;
}

// --- Prioritized overdue invoices ("Needs a chase") ------------------------

const BUCKET_PRIORITY = { d90_plus: 0, d61_90: 1, d31_60: 2, d1_30: 3 } as const;

/**
 * Ranks open, verified-overdue invoices for collection: most overdue tier
 * first (90+, then 61-90, then 31-60, then 1-30), then largest balance,
 * then oldest due date. Invoices with no verified due date are excluded -
 * SageBridge cannot say they're overdue, so they can't be "most worth
 * chasing" for that reason.
 */
export function prioritizeOverdueInvoices<T extends PulseInvoice>(
  invoices: ReadonlyArray<T>,
  now: number,
  limit = 5
): T[] {
  return invoices
    .map((invoice) => ({ invoice, bucket: classifyAgingBucket(invoice.dueDate, now) }))
    .filter((x): x is { invoice: T; bucket: keyof typeof BUCKET_PRIORITY } =>
      isOverdueBucket(x.bucket) && x.invoice.balance > 0
    )
    .sort((a, b) => {
      const rankDiff = BUCKET_PRIORITY[a.bucket] - BUCKET_PRIORITY[b.bucket];
      if (rankDiff !== 0) return rankDiff;
      if (b.invoice.balance !== a.invoice.balance) return b.invoice.balance - a.invoice.balance;
      return new Date(a.invoice.dueDate as string).getTime() - new Date(b.invoice.dueDate as string).getTime();
    })
    .slice(0, limit)
    .map((x) => x.invoice);
}

function isOverdueBucket(bucket: string): bucket is keyof typeof BUCKET_PRIORITY {
  return bucket in BUCKET_PRIORITY;
}

// --- Sync freshness ----------------------------------------------------------

export interface SyncFreshness {
  lastSyncedAt: Date | null;
  ageMs: number | null;
  isStale: boolean;
  /** Short "Updated X ago" label for the healthy state; null when unknown. */
  freshLabel: string | null;
  /** "Sage data hasn't synced since yesterday."-style message for the stale state. */
  staleMessage: string | null;
}

export const STALE_SYNC_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/**
 * Derives freshness purely from the real lastSyncedAt timestamps already on
 * synced customers - never manufactures a time. With no synced customers at
 * all, freshness is honestly "unknown" rather than reported as stale.
 */
export function computeSyncFreshness(customers: ReadonlyArray<PulseCustomer>, now: number, formatRelative: (date: Date, now: number) => string): SyncFreshness {
  const timestamps = customers
    .map((c) => new Date(c.lastSyncedAt).getTime())
    .filter((t) => Number.isFinite(t));

  if (timestamps.length === 0) {
    return { lastSyncedAt: null, ageMs: null, isStale: false, freshLabel: null, staleMessage: null };
  }

  const lastSyncedAt = new Date(Math.max(...timestamps));
  const ageMs = Math.max(0, now - lastSyncedAt.getTime());
  const isStale = ageMs > STALE_SYNC_THRESHOLD_MS;

  if (!isStale) {
    return { lastSyncedAt, ageMs, isStale, freshLabel: `Updated ${formatRelative(lastSyncedAt, now)}`, staleMessage: null };
  }

  const days = Math.floor(ageMs / (24 * 60 * 60 * 1000));
  const staleMessage = days <= 1
    ? "Sage data hasn't synced since yesterday."
    : `Sage data hasn't synced in ${days} days.`;
  return { lastSyncedAt, ageMs, isStale, freshLabel: null, staleMessage };
}

// --- Needs attention ----------------------------------------------------------

export interface AttentionInsight {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  emoji: string;
  text: string;
}

// Deterministic thresholds for "worth a specific callout" - not accounting
// rules, just business judgment calls on what's actually worth surfacing.
const LARGE_OVERDUE_ABSOLUTE_THRESHOLD = 5000; // a single customer owing this much overdue is notable on its own
const LARGE_OVERDUE_SHARE_THRESHOLD = 0.4; // ...or holding this share of all overdue money, even if the dollar figure is smaller
const SALES_DECLINE_THRESHOLD_PCT = 10; // ignore small month-to-month wobble

/**
 * Deterministic, rule-based exceptions only - no AI. Returns at most a
 * small handful of insights, most severe first, and returns none at all
 * when nothing is genuinely worth surfacing (callers should show a calm
 * "Nothing urgent right now" state in that case).
 */
export function generateAttentionInsights(params: {
  receivables: ReceivablesBreakdown;
  invoices: ReadonlyArray<PulseInvoice>;
  sales: SalesComparison;
  staleness: SyncFreshness;
  now: number;
}): AttentionInsight[] {
  const { receivables, invoices, sales, staleness, now } = params;
  const insights: AttentionInsight[] = [];

  if (staleness.isStale && staleness.staleMessage) {
    insights.push({ id: 'stale-sync', severity: 'critical', emoji: '🔴', text: staleness.staleMessage });
  }

  const ninetyPlus = receivables.buckets.find((b) => b.key === 'd90_plus');
  if (ninetyPlus && ninetyPlus.count > 0) {
    insights.push({
      id: 'critical-90-plus',
      severity: 'critical',
      emoji: '🔴',
      text: `${ninetyPlus.count} invoice${ninetyPlus.count === 1 ? '' : 's'} worth ${formatMoneyWhole(ninetyPlus.value)} ${ninetyPlus.count === 1 ? 'is' : 'are'} 90+ days overdue`,
    });
  } else if (receivables.overdueTotal > 0) {
    // Only shown when the 90+ insight above didn't already cover "you have
    // overdue money" - avoids two insights saying the same thing.
    insights.push({
      id: 'overdue-total',
      severity: 'warning',
      emoji: '🟠',
      text: `${formatMoneyWhole(receivables.overdueTotal)} is currently overdue`,
    });
  }

  const topOverdueCustomer = largestOverdueCustomer(invoices, receivables.overdueTotal, now);
  if (topOverdueCustomer) {
    insights.push({
      id: 'large-overdue-customer',
      severity: 'warning',
      emoji: '🟠',
      text: `${topOverdueCustomer.customerName} owes ${formatMoneyWhole(topOverdueCustomer.overdue)} overdue`,
    });
  }

  if (sales.changePct !== null && sales.changePct <= -SALES_DECLINE_THRESHOLD_PCT) {
    insights.push({
      id: 'sales-decline',
      severity: 'info',
      emoji: '🟡',
      text: `Sales are ${Math.abs(sales.changePct)}% below last month`,
    });
  }

  return insights;
}

/**
 * The customer holding the largest share of overdue money, if it's large
 * enough on an absolute or relative basis to be worth a specific callout.
 * Only verified-overdue invoices count (same classification the rest of
 * this module uses) - an unknown-due-date invoice never contributes here.
 */
function largestOverdueCustomer(
  invoices: ReadonlyArray<PulseInvoice>,
  overdueTotal: number,
  now: number
): { customerName: string; overdue: number } | null {
  if (overdueTotal <= 0) return null;

  const overdueByCustomer = new Map<string, number>();
  for (const invoice of invoices) {
    if (!(invoice.balance > 0)) continue;
    const bucket = classifyAgingBucket(invoice.dueDate, now);
    if (!isOverdueBucket(bucket)) continue;
    overdueByCustomer.set(invoice.customerName, (overdueByCustomer.get(invoice.customerName) ?? 0) + invoice.balance);
  }

  let top: { customerName: string; overdue: number } | null = null;
  for (const [customerName, overdue] of overdueByCustomer) {
    if (!top || overdue > top.overdue) top = { customerName, overdue };
  }
  if (!top) return null;

  const meetsAbsoluteThreshold = top.overdue >= LARGE_OVERDUE_ABSOLUTE_THRESHOLD;
  const meetsShareThreshold = top.overdue / overdueTotal >= LARGE_OVERDUE_SHARE_THRESHOLD;
  return meetsAbsoluteThreshold || meetsShareThreshold ? top : null;
}
