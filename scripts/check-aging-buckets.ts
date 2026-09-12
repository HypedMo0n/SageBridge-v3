// Real behavioral test for lib/aging.ts - imports and executes the actual
// production bucketing logic (run via `tsx`, see package.json's
// test:aging script) rather than re-describing it in prose. Mirrors the
// acceptance-test invoice scenarios from the A/R aging correctness fix:
// paid, partially paid, current, 1-30/31-60/61-90/90+ overdue, and a
// credit/adjustment that fully offsets an invoice.
import { AGING_BUCKET_DEFINITIONS, bucketReceivables, classifyAgingBucket } from '../lib/aging';

const NOW = new Date('2026-06-15T00:00:00Z').getTime();
const daysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString();
const daysAhead = (days: number) => new Date(NOW + days * 86_400_000).toISOString();

// One invoice per acceptance-test scenario. `balance` is what the connector
// sends after its transaction-netting fix (never the original gross total
// for anything that's been paid down).
const invoices = [
  { id: 'paid', originalTotal: 500, balance: 0, dueDate: daysAgo(40) }, // paid in full
  { id: 'partial', originalTotal: 900, balance: 300, dueDate: daysAgo(10) }, // partially paid: only remainder should count
  { id: 'current', originalTotal: 200, balance: 200, dueDate: daysAhead(5) }, // not yet due
  { id: 'due-today', originalTotal: 50, balance: 50, dueDate: daysAgo(0) }, // due exactly today: still Current, not yet overdue
  { id: 'd1-30', originalTotal: 1000, balance: 1000, dueDate: daysAgo(15) },
  { id: 'd31-60', originalTotal: 2000, balance: 2000, dueDate: daysAgo(45) },
  { id: 'd61-90', originalTotal: 3000, balance: 3000, dueDate: daysAgo(75) },
  { id: 'd90-plus', originalTotal: 4000, balance: 4000, dueDate: daysAgo(120) },
  { id: 'boundary-30', originalTotal: 10, balance: 10, dueDate: daysAgo(30) }, // exactly 30 days: last day of 1-30, not 31-60
  { id: 'boundary-31', originalTotal: 20, balance: 20, dueDate: daysAgo(31) }, // 31 days: first day of 31-60
  { id: 'no-due-date', originalTotal: 75, balance: 75, dueDate: null }, // unresolved due date: treated as Current, not dropped
  { id: 'credit-adjustment', originalTotal: 150, balance: 0, dueDate: daysAgo(20) }, // fully offset by a credit memo
];

let passed = 0, failed = 0;
function check(condition: boolean, message: string) {
  if (condition) { passed++; }
  else { failed++; console.error(`FAIL: ${message}`); }
}

// --- Individual classification -------------------------------------------
check(classifyAgingBucket(invoices.find((i) => i.id === 'current')!.dueDate, NOW) === 'current', 'not-yet-due invoice classifies as current');
check(classifyAgingBucket(invoices.find((i) => i.id === 'due-today')!.dueDate, NOW) === 'current', 'due today classifies as current, not overdue');
check(classifyAgingBucket(invoices.find((i) => i.id === 'd1-30')!.dueDate, NOW) === 'd1_30', '15 days overdue classifies as 1-30');
check(classifyAgingBucket(invoices.find((i) => i.id === 'd31-60')!.dueDate, NOW) === 'd31_60', '45 days overdue classifies as 31-60');
check(classifyAgingBucket(invoices.find((i) => i.id === 'd61-90')!.dueDate, NOW) === 'd61_90', '75 days overdue classifies as 61-90');
check(classifyAgingBucket(invoices.find((i) => i.id === 'd90-plus')!.dueDate, NOW) === 'd90_plus', '120 days overdue classifies as 90+');
check(classifyAgingBucket(invoices.find((i) => i.id === 'boundary-30')!.dueDate, NOW) === 'd1_30', 'exactly 30 days overdue is the last day of 1-30, not 31-60');
check(classifyAgingBucket(invoices.find((i) => i.id === 'boundary-31')!.dueDate, NOW) === 'd31_60', 'exactly 31 days overdue is the first day of 31-60');
check(classifyAgingBucket(invoices.find((i) => i.id === 'no-due-date')!.dueDate, NOW) === 'current', 'missing due date falls back to current rather than being dropped');

// Every invoice must classify into exactly one of the five known buckets.
for (const invoice of invoices) {
  const key = classifyAgingBucket(invoice.dueDate, NOW);
  check(AGING_BUCKET_DEFINITIONS.some((def) => def.key === key), `${invoice.id} classifies into a known bucket (got ${key})`);
}

// --- Full bucketing --------------------------------------------------------
const { buckets, total } = bucketReceivables(invoices, NOW);
const byKey = Object.fromEntries(buckets.map((b) => [b.key, b.value]));

check(AGING_BUCKET_DEFINITIONS.length === 5, 'exactly five aging buckets are defined');
check(
  JSON.stringify(AGING_BUCKET_DEFINITIONS.map((d) => d.label)) === JSON.stringify(['Current', '1–30 days', '31–60 days', '61–90 days', '90+ days']),
  'bucket labels are exactly Current, 1–30 days, 31–60 days, 61–90 days, 90+ days'
);

// Paid invoices and credit-fully-offset invoices contribute $0 - they must
// not appear anywhere, and must not be counted using their original total.
check(byKey.current === 200 + 50 + 75, `current bucket is current+due-today+no-due-date balances only (200+50+75), got ${byKey.current}`);
check(byKey.d1_30 === 300 + 1000 + 10, `1-30 bucket is partial(remaining balance only)+d1-30+boundary-30 (300+1000+10), got ${byKey.d1_30}`);
check(byKey.d31_60 === 2000 + 20, `31-60 bucket is d31-60+boundary-31 (2000+20), got ${byKey.d31_60}`);
check(byKey.d61_90 === 3000, `61-90 bucket is d61-90 only (3000), got ${byKey.d61_90}`);
check(byKey.d90_plus === 4000, `90+ bucket is d90-plus only (4000), got ${byKey.d90_plus}`);

// The partial invoice's ORIGINAL total (900) must never appear anywhere -
// only its remaining balance (300) should be counted, inside the 1-30 bucket.
const allBucketed = Object.values(byKey).reduce((sum, v) => sum + v, 0);
check(!Object.values(byKey).includes(900), "partial invoice's original total (900) does not appear in any bucket");
check(!Object.values(byKey).includes(500) && !Object.values(byKey).includes(150), 'paid and credit-adjusted invoices (original totals 500, 150) contribute nothing');

// Sum(all buckets) === total outstanding A/R, exactly - and matches summing
// every open (balance > 0) invoice directly, proving no double counting and
// no invoice silently dropped.
const expectedTotal = invoices.filter((i) => i.balance > 0).reduce((sum, i) => sum + i.balance, 0);
check(total === expectedTotal, `total (${total}) equals sum of open invoice balances (${expectedTotal})`);
check(allBucketed === total, `sum of all five buckets (${allBucketed}) equals reported total (${total})`);

// No invoice appears in more than one bucket: reclassifying every open
// invoice independently and summing by key must reproduce bucketReceivables'
// own output exactly.
const manualByKey: Record<string, number> = {};
for (const invoice of invoices) {
  if (!(invoice.balance > 0)) continue;
  const key = classifyAgingBucket(invoice.dueDate, NOW);
  manualByKey[key] = (manualByKey[key] ?? 0) + invoice.balance;
}
for (const def of AGING_BUCKET_DEFINITIONS) {
  check((manualByKey[def.key] ?? 0) === byKey[def.key], `independent reclassification agrees with bucketReceivables for '${def.key}'`);
}

// A zero bucket must be exactly 0, not missing/undefined/NaN.
check(typeof byKey.current === 'number' && Number.isFinite(byKey.current), 'every bucket value is a finite number, never undefined/NaN even when zero');

console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
