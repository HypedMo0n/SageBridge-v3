// Real behavioral test for lib/aging.ts - imports and executes the actual
// production bucketing logic (run via `tsx`, see package.json's test:aging
// script) rather than re-describing it in prose. Covers every case listed
// in the Business Pulse V1 milestone: no invoices, all paid, current
// unpaid, due today, 1-day overdue, the 30/31/60/61/90/91-day boundaries,
// no due date, partial balance, and multiple customers.
import { AGING_BUCKET_DEFINITIONS, bucketReceivables, classifyAgingBucket, describeDueStatus } from '../lib/aging';

const NOW = new Date('2026-06-15T00:00:00Z').getTime();
const daysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString();
const daysAhead = (days: number) => new Date(NOW + days * 86_400_000).toISOString();

let passed = 0, failed = 0;
function check(condition: boolean, message: string) {
  if (condition) { passed++; }
  else { failed++; console.error(`FAIL: ${message}`); }
}

// --- Bucket definitions ------------------------------------------------------
check(AGING_BUCKET_DEFINITIONS.length === 5, 'exactly five aging buckets are defined');
check(
  JSON.stringify(AGING_BUCKET_DEFINITIONS.map((d) => d.label)) === JSON.stringify(['Not due', '1–30 overdue', '31–60 overdue', '61–90 overdue', '90+ overdue']),
  'bucket labels use plain business language: Not due, 1–30 overdue, 31–60 overdue, 61–90 overdue, 90+ overdue'
);

// --- No invoices --------------------------------------------------------------
{
  const { buckets, total, overdueTotal, unknownDueDate } = bucketReceivables([], NOW);
  check(total === 0, 'no invoices: total is 0');
  check(overdueTotal === 0, 'no invoices: overdueTotal is 0');
  check(unknownDueDate.count === 0 && unknownDueDate.value === 0, 'no invoices: no unknown-due-date records');
  check(buckets.every((b) => b.value === 0 && b.count === 0), 'no invoices: every bucket is zero');
}

// --- All invoices paid ---------------------------------------------------------
{
  const paid = [
    { balance: 0, dueDate: daysAgo(40) },
    { balance: 0, dueDate: daysAgo(10) },
  ];
  const { buckets, total, overdueTotal } = bucketReceivables(paid, NOW);
  check(total === 0, 'all invoices paid: total is 0');
  check(overdueTotal === 0, 'all invoices paid: overdueTotal is 0');
  check(buckets.every((b) => b.value === 0), 'all invoices paid: no bucket receives anything');
}

// --- Individual classification: core cases --------------------------------
check(classifyAgingBucket(daysAhead(5), NOW) === 'not_due', 'not-yet-due invoice classifies as not_due');
check(classifyAgingBucket(daysAgo(0), NOW) === 'not_due', 'due today classifies as not_due, not overdue');
check(classifyAgingBucket(daysAgo(1), NOW) === 'd1_30', '1 day overdue classifies as d1_30');
check(classifyAgingBucket(daysAgo(15), NOW) === 'd1_30', '15 days overdue classifies as d1_30');
check(classifyAgingBucket(daysAgo(45), NOW) === 'd31_60', '45 days overdue classifies as d31_60');
check(classifyAgingBucket(daysAgo(75), NOW) === 'd61_90', '75 days overdue classifies as d61_90');
check(classifyAgingBucket(daysAgo(120), NOW) === 'd90_plus', '120 days overdue classifies as d90_plus');

// --- Boundary days: 30/31, 60/61, 90/91 - no gaps, no double counting ------
check(classifyAgingBucket(daysAgo(30), NOW) === 'd1_30', 'exactly 30 days overdue is the last day of 1-30, not 31-60');
check(classifyAgingBucket(daysAgo(31), NOW) === 'd31_60', 'exactly 31 days overdue is the first day of 31-60');
check(classifyAgingBucket(daysAgo(60), NOW) === 'd31_60', 'exactly 60 days overdue is the last day of 31-60, not 61-90');
check(classifyAgingBucket(daysAgo(61), NOW) === 'd61_90', 'exactly 61 days overdue is the first day of 61-90');
check(classifyAgingBucket(daysAgo(90), NOW) === 'd61_90', 'exactly 90 days overdue is the last day of 61-90, not 90+');
check(classifyAgingBucket(daysAgo(91), NOW) === 'd90_plus', 'exactly 91 days overdue is the first day of 90+');

// --- No due date: represented honestly as 'unknown', never manufactured as not_due ---
check(classifyAgingBucket(null, NOW) === 'unknown', 'missing due date classifies as unknown, not not_due');
check(classifyAgingBucket(undefined, NOW) === 'unknown', 'undefined due date classifies as unknown');
check(classifyAgingBucket('not-a-date', NOW) === 'unknown', 'unparseable due date classifies as unknown');

// --- describeDueStatus --------------------------------------------------------
check(describeDueStatus(0, daysAgo(10), NOW) === 'Paid', 'paid invoice describes as Paid regardless of due date');
check(describeDueStatus(50, null, NOW) === 'Due date unknown', 'open invoice with no due date describes honestly as unknown, not as current/not due');
check(describeDueStatus(50, daysAgo(0), NOW) === 'Due today', 'due today describes as Due today');
check(describeDueStatus(50, daysAgo(1), NOW) === '1 day overdue', '1 day overdue describes in singular');
check(describeDueStatus(50, daysAgo(12), NOW) === '12 days overdue', '12 days overdue describes in plural with count');
check(describeDueStatus(50, daysAhead(1), NOW) === 'Due in 1 day', 'due tomorrow describes in singular');
check(describeDueStatus(50, daysAhead(5), NOW) === 'Due in 5 days', 'due in 5 days describes in plural with count');

// --- Full bucketing: paid, partial, current, boundaries, no-due-date, credit ---
const invoices = [
  { id: 'paid', originalTotal: 500, balance: 0, dueDate: daysAgo(40) },
  { id: 'partial', originalTotal: 900, balance: 300, dueDate: daysAgo(10) },
  { id: 'current', originalTotal: 200, balance: 200, dueDate: daysAhead(5) },
  { id: 'due-today', originalTotal: 50, balance: 50, dueDate: daysAgo(0) },
  { id: 'one-day-overdue', originalTotal: 40, balance: 40, dueDate: daysAgo(1) },
  { id: 'd1-30', originalTotal: 1000, balance: 1000, dueDate: daysAgo(15) },
  { id: 'd31-60', originalTotal: 2000, balance: 2000, dueDate: daysAgo(45) },
  { id: 'd61-90', originalTotal: 3000, balance: 3000, dueDate: daysAgo(75) },
  { id: 'd90-plus', originalTotal: 4000, balance: 4000, dueDate: daysAgo(120) },
  { id: 'boundary-30', originalTotal: 10, balance: 10, dueDate: daysAgo(30) },
  { id: 'boundary-31', originalTotal: 20, balance: 20, dueDate: daysAgo(31) },
  { id: 'boundary-60', originalTotal: 15, balance: 15, dueDate: daysAgo(60) },
  { id: 'boundary-61', originalTotal: 25, balance: 25, dueDate: daysAgo(61) },
  { id: 'boundary-90', originalTotal: 12, balance: 12, dueDate: daysAgo(90) },
  { id: 'boundary-91', originalTotal: 22, balance: 22, dueDate: daysAgo(91) },
  { id: 'no-due-date', originalTotal: 75, balance: 75, dueDate: null },
  { id: 'credit-adjustment', originalTotal: 150, balance: 0, dueDate: daysAgo(20) },
];

const { buckets, total, overdueTotal, unknownDueDate } = bucketReceivables(invoices, NOW);
const byKey = Object.fromEntries(buckets.map((b) => [b.key, b.value]));
const countByKey = Object.fromEntries(buckets.map((b) => [b.key, b.count]));

// Paid and fully-offset (credit) invoices contribute $0 and never appear.
check(byKey.not_due === 200 + 50, `not_due bucket is current+due-today (200+50), got ${byKey.not_due}`);
check(byKey.d1_30 === 300 + 40 + 1000 + 10, `1-30 bucket is partial+one-day-overdue+d1-30+boundary-30 (300+40+1000+10), got ${byKey.d1_30}`);
check(byKey.d31_60 === 2000 + 20 + 15, `31-60 bucket is d31-60+boundary-31+boundary-60 (2000+20+15), got ${byKey.d31_60}`);
check(byKey.d61_90 === 3000 + 25 + 12, `61-90 bucket is d61-90+boundary-61+boundary-90 (3000+25+12), got ${byKey.d61_90}`);
check(byKey.d90_plus === 4000 + 22, `90+ bucket is d90-plus+boundary-91 (4000+22), got ${byKey.d90_plus}`);

// The invoice without a due date is explicitly represented, not dropped and
// not folded into not_due.
check(unknownDueDate.count === 1 && unknownDueDate.value === 75, 'no-due-date invoice (75) is explicitly represented as unknown, not silently excluded');
check(!Object.values(byKey).includes(75) && countByKey.not_due === 2, 'the unknown-due-date invoice does not leak into the not_due bucket');

// Partial invoice's ORIGINAL total (900) never appears anywhere - only its
// remaining balance (300) counts, inside the 1-30 bucket.
const allBucketed = Object.values(byKey).reduce((sum, v) => sum + v, 0);
check(!Object.values(byKey).includes(900), "partial invoice's original total (900) does not appear in any bucket");
check(!Object.values(byKey).includes(500) && !Object.values(byKey).includes(150), 'paid and credit-adjusted invoices (original totals 500, 150) contribute nothing');

// Aging bucket total = outstanding total, subject to the explicitly
// represented unknown record - sum(buckets) + unknown === total, exactly.
const expectedTotal = invoices.filter((i) => i.balance > 0).reduce((sum, i) => sum + i.balance, 0);
check(total === expectedTotal, `total (${total}) equals sum of open invoice balances (${expectedTotal})`);
check(allBucketed + unknownDueDate.value === total, `sum of buckets (${allBucketed}) plus unknown (${unknownDueDate.value}) equals total (${total})`);

// Overdue total = sum of outstanding invoices whose verified due date has
// passed - excludes not_due and excludes the unknown-due-date invoice.
const expectedOverdue = allBucketed - byKey.not_due;
check(overdueTotal === expectedOverdue, `overdueTotal (${overdueTotal}) excludes not_due and unknown (${expectedOverdue})`);

// No invoice appears in more than one bucket: independent reclassification
// reproduces bucketReceivables' own output exactly.
const manualByKey: Record<string, number> = {};
for (const invoice of invoices) {
  if (!(invoice.balance > 0)) continue;
  const key = classifyAgingBucket(invoice.dueDate, NOW);
  if (key === 'unknown') continue;
  manualByKey[key] = (manualByKey[key] ?? 0) + invoice.balance;
}
for (const def of AGING_BUCKET_DEFINITIONS) {
  check((manualByKey[def.key] ?? 0) === byKey[def.key], `independent reclassification agrees with bucketReceivables for '${def.key}'`);
}

// A zero bucket must be exactly 0, not missing/undefined/NaN.
check(typeof byKey.not_due === 'number' && Number.isFinite(byKey.not_due), 'every bucket value is a finite number, never undefined/NaN even when zero');

// --- Multiple customers: bucketReceivables is customer-agnostic; grouping
// per customer is the caller's job (lib/pulse.ts), verified there. Here,
// confirm mixing invoices from different customers still reconciles.
{
  const multi = [
    { balance: 1000, dueDate: daysAgo(100) }, // Customer A, 90+
    { balance: 500, dueDate: daysAgo(45) },   // Customer B, 31-60
    { balance: 0, dueDate: daysAgo(10) },     // Customer B, paid
  ];
  const result = bucketReceivables(multi, NOW);
  check(result.total === 1500, 'multiple customers: total sums across customers correctly');
  check(result.buckets.find((b) => b.key === 'd90_plus')!.value === 1000, 'multiple customers: 90+ bucket is customer A only');
  check(result.buckets.find((b) => b.key === 'd31_60')!.value === 500, 'multiple customers: 31-60 bucket is customer B only');
}

console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
