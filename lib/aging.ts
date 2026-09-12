export type AgingBucketKey = 'current' | 'd1_30' | 'd31_60' | 'd61_90' | 'd90_plus';

export interface AgingBucket {
  key: AgingBucketKey;
  label: string;
  value: number;
}

interface AgingBucketDefinition {
  key: AgingBucketKey;
  label: string;
  minDays: number;
  maxDays: number;
}

/**
 * The single source of truth for A/R aging buckets. Ranges are in days past
 * due (dueDate), exclusive of minDays and inclusive of maxDays, so every
 * value of daysPastDue matches exactly one bucket - no invoice can land in
 * two buckets, and none can fall through unclassified.
 */
export const AGING_BUCKET_DEFINITIONS: readonly AgingBucketDefinition[] = [
  { key: 'current', label: 'Current', minDays: -Infinity, maxDays: 0 },
  { key: 'd1_30', label: '1–30 days', minDays: 0, maxDays: 30 },
  { key: 'd31_60', label: '31–60 days', minDays: 30, maxDays: 60 },
  { key: 'd61_90', label: '61–90 days', minDays: 60, maxDays: 90 },
  { key: 'd90_plus', label: '90+ days', minDays: 90, maxDays: Infinity },
];

/**
 * Classifies a single open invoice into exactly one aging bucket based on
 * days past its due date. An invoice with no known due date is treated as
 * Current - SageBridge cannot say it's overdue without a due date - but
 * that is a data-completeness limitation of the sync, not a claim that the
 * invoice truly isn't due yet.
 */
export function classifyAgingBucket(dueDate: string | null | undefined, now: number): AgingBucketKey {
  if (!dueDate) return 'current';
  const dueTime = new Date(dueDate).getTime();
  if (!Number.isFinite(dueTime)) return 'current';
  const daysPastDue = (now - dueTime) / 86_400_000;
  const bucket = AGING_BUCKET_DEFINITIONS.find((b) => daysPastDue > b.minDays && daysPastDue <= b.maxDays);
  return bucket?.key ?? 'd90_plus';
}

/**
 * Buckets a list of invoices' open balances by age.
 *
 * - Only invoices with a positive balance count as owed; paid/closed
 *   invoices (balance <= 0) contribute $0 and are excluded entirely, never
 *   appearing in any bucket.
 * - Every open invoice is classified into exactly one bucket, so
 *   sum(buckets[*].value) always equals `total` exactly by construction.
 */
export function bucketReceivables(
  invoices: ReadonlyArray<{ balance: number; dueDate: string | null }>,
  now: number = Date.now()
): { buckets: AgingBucket[]; total: number } {
  const totals = new Map<AgingBucketKey, number>(AGING_BUCKET_DEFINITIONS.map((def) => [def.key, 0]));
  let total = 0;

  for (const invoice of invoices) {
    if (!(invoice.balance > 0)) continue;
    const key = classifyAgingBucket(invoice.dueDate, now);
    totals.set(key, (totals.get(key) ?? 0) + invoice.balance);
    total += invoice.balance;
  }

  const buckets = AGING_BUCKET_DEFINITIONS.map((def) => ({ key: def.key, label: def.label, value: totals.get(def.key) ?? 0 }));
  return { buckets, total };
}
