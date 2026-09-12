// Real behavioral test for lib/sales.ts and lib/pulse.ts (run via `tsx`, see
// package.json's test:pulse script). Covers the Business Pulse V1 milestone
// cases: sales this month, sales last month, zero sales last month, and
// stale synchronization state, plus the insight-generation and
// overdue-prioritization rules built on top of the shared aging module.
import { compareSalesToPriorMonth, monthlySales } from '../lib/sales';
import {
  computeSyncFreshness,
  generateAttentionInsights,
  prioritizeOverdueInvoices,
  STALE_SYNC_THRESHOLD_MS,
} from '../lib/pulse';
import { bucketReceivables } from '../lib/aging';
import { formatRelativeTime } from '../lib/utils';

const NOW = new Date('2026-06-15T12:00:00Z').getTime();
const daysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString();
const daysAhead = (days: number) => new Date(NOW + days * 86_400_000).toISOString();
const minutesAgo = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

let passed = 0, failed = 0;
function check(condition: boolean, message: string) {
  if (condition) { passed++; }
  else { failed++; console.error(`FAIL: ${message}`); }
}

// ============================================================================
// lib/sales.ts
// ============================================================================

// --- Sales this month / last month, normal case -----------------------------
{
  const invoices = [
    { date: daysAgo(5), total: 10000, balance: 0 },   // this month
    { date: daysAgo(3), total: 5000, balance: 5000 }, // this month
    { date: daysAgo(35), total: 12000, balance: 0 },  // last month
  ];
  const cmp = compareSalesToPriorMonth(invoices, NOW);
  check(cmp.thisMonth === 15000, `sales this month sums invoices dated in the current calendar month, got ${cmp.thisMonth}`);
  check(cmp.lastMonth === 12000, `sales last month sums invoices dated in the prior calendar month, got ${cmp.lastMonth}`);
  check(cmp.changePct === Math.round(((15000 - 12000) / 12000) * 100), `changePct is the rounded percent change, got ${cmp.changePct}`);
}

// --- Zero sales last month, positive this month: undefined % change, not 0 or Infinity ---
{
  const invoices = [{ date: daysAgo(5), total: 8000, balance: 0 }];
  const cmp = compareSalesToPriorMonth(invoices, NOW);
  check(cmp.lastMonth === 0, 'zero sales last month: lastMonth is 0');
  check(cmp.thisMonth === 8000, 'zero sales last month: thisMonth still sums correctly');
  check(cmp.changePct === null, 'zero sales last month with sales this month: changePct is null (undefined), not fabricated as 0% or Infinity%');
}

// --- Zero sales both months: no growth, not "no data" -----------------------
{
  const cmp = compareSalesToPriorMonth([], NOW);
  check(cmp.thisMonth === 0 && cmp.lastMonth === 0, 'no invoices at all: both months are 0');
  check(cmp.changePct === 0, 'zero vs zero is a defined, deterministic 0% change');
}

// --- Sales decline ------------------------------------------------------------
{
  const invoices = [
    { date: daysAgo(5), total: 4000, balance: 0 },
    { date: daysAgo(35), total: 5000, balance: 0 },
  ];
  const cmp = compareSalesToPriorMonth(invoices, NOW);
  check(cmp.changePct === -20, `a decline from 5000 to 4000 is -20%, got ${cmp.changePct}`);
}

// --- monthlySales spans calendar months, oldest first ------------------------
{
  const months = monthlySales([], 3, NOW);
  check(months.length === 3, 'monthlySales returns exactly the requested number of months');
  check(months[2].month === new Date(NOW).getMonth(), 'the last entry is the current calendar month');
}

// ============================================================================
// lib/pulse.ts - computeSyncFreshness
// ============================================================================

check(
  computeSyncFreshness([], NOW, formatRelativeTime).freshLabel === null &&
  computeSyncFreshness([], NOW, formatRelativeTime).staleMessage === null,
  'no synced customers at all: freshness is honestly unknown, never fabricated as fresh or stale'
);

{
  const fresh = computeSyncFreshness([{ lastSyncedAt: minutesAgo(12) }], NOW, formatRelativeTime);
  check(fresh.isStale === false, 'synced 12 minutes ago is not stale');
  check(fresh.freshLabel === 'Updated 12 min ago', `fresh label uses the real timestamp, got "${fresh.freshLabel}"`);
  check(fresh.staleMessage === null, 'fresh state has no stale message');
}

{
  // Exactly at the threshold is still fresh - isStale is strictly greater-than.
  const atThreshold = computeSyncFreshness([{ lastSyncedAt: new Date(NOW - STALE_SYNC_THRESHOLD_MS).toISOString() }], NOW, formatRelativeTime);
  check(atThreshold.isStale === false, 'exactly at the stale threshold is still considered fresh (boundary is exclusive)');
}

{
  const justPastThreshold = computeSyncFreshness([{ lastSyncedAt: new Date(NOW - STALE_SYNC_THRESHOLD_MS - 60_000).toISOString() }], NOW, formatRelativeTime);
  check(justPastThreshold.isStale === true, 'one minute past the stale threshold is stale');
  check(justPastThreshold.staleMessage === "Sage data hasn't synced since yesterday.", `1 day stale uses the "yesterday" phrasing, got "${justPastThreshold.staleMessage}"`);
  check(justPastThreshold.freshLabel === null, 'stale state has no fresh label');
}

{
  const veryStale = computeSyncFreshness([{ lastSyncedAt: daysAgo(5) }], NOW, formatRelativeTime);
  check(veryStale.staleMessage === "Sage data hasn't synced in 5 days.", `multi-day stale names the day count, got "${veryStale.staleMessage}"`);
}

{
  // Multiple customers: freshness uses the MOST RECENT sync, not the oldest.
  const mixed = computeSyncFreshness(
    [{ lastSyncedAt: daysAgo(5) }, { lastSyncedAt: minutesAgo(3) }],
    NOW,
    formatRelativeTime
  );
  check(mixed.isStale === false, 'freshness uses the most recent of multiple synced customers, not the stalest');
}

// ============================================================================
// lib/pulse.ts - generateAttentionInsights
// ============================================================================

const FRESH: ReturnType<typeof computeSyncFreshness> = { lastSyncedAt: new Date(NOW), ageMs: 0, isStale: false, freshLabel: 'Updated just now', staleMessage: null };
const NO_SALES_CHANGE = { thisMonth: 1000, lastMonth: 1000, changePct: 0 };

// --- Nothing wrong: calm state ------------------------------------------------
{
  const receivables = bucketReceivables([], NOW);
  const insights = generateAttentionInsights({ receivables, invoices: [], sales: NO_SALES_CHANGE, staleness: FRESH, now: NOW });
  check(insights.length === 0, 'no overdue, no stale sync, no sales decline: no insights fire (caller shows "Nothing urgent right now")');
}

// --- 90+ overdue fires critical, and suppresses the generic overdue insight ---
{
  const invoices = [
    { balance: 4000, dueDate: daysAgo(100), customerName: 'Acme', invoiceNumber: 'INV-1' },
    { balance: 3800, dueDate: daysAgo(120), customerName: 'Acme', invoiceNumber: 'INV-2' },
  ];
  const receivables = bucketReceivables(invoices, NOW);
  const insights = generateAttentionInsights({ receivables, invoices, sales: NO_SALES_CHANGE, staleness: FRESH, now: NOW });
  const critical = insights.find((i) => i.id === 'critical-90-plus');
  check(!!critical, '90+ overdue invoices produce a critical insight');
  check(critical?.text === '2 invoices worth $7,800 are 90+ days overdue', `critical 90+ text is correct, got "${critical?.text}"`);
  check(!insights.some((i) => i.id === 'overdue-total'), 'the generic overdue insight does not also fire when the 90+ insight already covers it');
}

// --- Overdue but nothing 90+: generic overdue insight fires ------------------
{
  const invoices = [{ balance: 1000, dueDate: daysAgo(15), customerName: 'Acme', invoiceNumber: 'INV-1' }];
  const receivables = bucketReceivables(invoices, NOW);
  const insights = generateAttentionInsights({ receivables, invoices, sales: NO_SALES_CHANGE, staleness: FRESH, now: NOW });
  check(insights.some((i) => i.id === 'overdue-total' && i.text === '$1,000 is currently overdue'), 'overdue with no 90+ tier produces the generic overdue insight');
}

// --- Large overdue customer: absolute threshold ------------------------------
{
  const invoices = [
    { balance: 6000, dueDate: daysAgo(45), customerName: 'ABC Construction', invoiceNumber: 'INV-1' },
    { balance: 200, dueDate: daysAgo(10), customerName: 'Small Co', invoiceNumber: 'INV-2' },
  ];
  const receivables = bucketReceivables(invoices, NOW);
  const insights = generateAttentionInsights({ receivables, invoices, sales: NO_SALES_CHANGE, staleness: FRESH, now: NOW });
  const large = insights.find((i) => i.id === 'large-overdue-customer');
  check(large?.text === 'ABC Construction owes $6,000 overdue', `large single-customer overdue names the customer and amount, got "${large?.text}"`);
}

// --- No single customer large enough: no large-customer insight -------------
{
  const invoices = [
    { balance: 400, dueDate: daysAgo(10), customerName: 'A', invoiceNumber: '1' },
    { balance: 400, dueDate: daysAgo(10), customerName: 'B', invoiceNumber: '2' },
    { balance: 400, dueDate: daysAgo(10), customerName: 'C', invoiceNumber: '3' },
  ];
  const receivables = bucketReceivables(invoices, NOW);
  const insights = generateAttentionInsights({ receivables, invoices, sales: NO_SALES_CHANGE, staleness: FRESH, now: NOW });
  check(!insights.some((i) => i.id === 'large-overdue-customer'), 'overdue spread evenly across several customers does not trigger a large-customer callout');
}

// --- Sales decline vs a small wobble ------------------------------------------
{
  const receivables = bucketReceivables([], NOW);
  const decline = generateAttentionInsights({ receivables, invoices: [], sales: { thisMonth: 890, lastMonth: 1000, changePct: -11 }, staleness: FRESH, now: NOW });
  check(decline.some((i) => i.id === 'sales-decline' && i.text === 'Sales are 11% below last month'), 'a meaningful sales decline produces an insight naming the percentage');

  const wobble = generateAttentionInsights({ receivables, invoices: [], sales: { thisMonth: 970, lastMonth: 1000, changePct: -3 }, staleness: FRESH, now: NOW });
  check(!wobble.some((i) => i.id === 'sales-decline'), 'a small month-to-month wobble does not trigger a sales-decline insight');

  const increase = generateAttentionInsights({ receivables, invoices: [], sales: { thisMonth: 1200, lastMonth: 1000, changePct: 20 }, staleness: FRESH, now: NOW });
  check(!increase.some((i) => i.id === 'sales-decline'), 'a sales increase never produces a decline insight');
}

// --- Stale sync promotes into Needs Attention as critical --------------------
{
  const receivables = bucketReceivables([], NOW);
  const stale = computeSyncFreshness([{ lastSyncedAt: daysAgo(2) }], NOW, formatRelativeTime);
  const insights = generateAttentionInsights({ receivables, invoices: [], sales: NO_SALES_CHANGE, staleness: stale, now: NOW });
  check(insights.some((i) => i.id === 'stale-sync' && i.severity === 'critical'), 'a stale connector/sync is promoted into Needs Attention as a critical insight');
}

// ============================================================================
// lib/pulse.ts - prioritizeOverdueInvoices
// ============================================================================

{
  const invoices = [
    { balance: 100, dueDate: daysAgo(15), customerName: 'A', invoiceNumber: 'd1-30-small' },
    { balance: 9000, dueDate: daysAgo(45), customerName: 'B', invoiceNumber: 'd31-60-big' },
    { balance: 500, dueDate: daysAgo(100), customerName: 'C', invoiceNumber: 'd90-plus' },
    { balance: 200, dueDate: daysAhead(0), customerName: 'D', invoiceNumber: 'not-due' },
    { balance: 300, dueDate: null, customerName: 'E', invoiceNumber: 'unknown-due-date' },
    { balance: 0, dueDate: daysAgo(200), customerName: 'F', invoiceNumber: 'paid-90-plus' },
  ];
  const ranked = prioritizeOverdueInvoices(invoices, NOW, 10);
  check(ranked.length === 3, `only verified-overdue, open invoices are ranked (not_due/unknown/paid excluded), got ${ranked.length}`);
  check(ranked[0].invoiceNumber === 'd90-plus', '90+ tier ranks first regardless of balance size');
  check(ranked[1].invoiceNumber === 'd31-60-big', '31-60 tier ranks second');
  check(ranked[2].invoiceNumber === 'd1-30-small', '1-30 tier ranks last among overdue');
}

{
  // Same bucket tier: larger balance first, then older due date as tiebreaker.
  const invoices = [
    { balance: 100, dueDate: daysAgo(10), customerName: 'A', invoiceNumber: 'small-newer' },
    { balance: 500, dueDate: daysAgo(5), customerName: 'B', invoiceNumber: 'big' },
    { balance: 100, dueDate: daysAgo(20), customerName: 'C', invoiceNumber: 'small-older' },
  ];
  const ranked = prioritizeOverdueInvoices(invoices, NOW, 10);
  check(ranked[0].invoiceNumber === 'big', 'within the same tier, larger balance ranks first');
  check(ranked[1].invoiceNumber === 'small-older', 'within the same tier and balance-tier, older due date breaks the tie');
}

{
  const invoices = Array.from({ length: 8 }, (_, i) => ({
    balance: 100 + i,
    dueDate: daysAgo(10 + i),
    customerName: `Customer ${i}`,
    invoiceNumber: `INV-${i}`,
  }));
  const ranked = prioritizeOverdueInvoices(invoices, NOW, 5);
  check(ranked.length === 5, 'prioritizeOverdueInvoices respects the requested limit');
}

console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
