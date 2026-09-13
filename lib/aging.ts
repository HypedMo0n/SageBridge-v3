export type AgingBucketKey = 'not_due' | 'd1_30' | 'd31_60' | 'd61_90' | 'd90_plus';

/**
 * 'unknown' is not an aging bucket - it means SageBridge cannot verify
 * whether the invoice is overdue at all, because no usable due date came
 * through the sync. It must never be silently folded into 'not_due': that
 * would assert the invoice isn't due yet, which is a claim we cannot make.
 */
export type AgingClassification = AgingBucketKey | 'unknown';

export interface AgingBucket {
  key: AgingBucketKey;
  label: string;
  value: number;
  count: number;
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
 * two buckets, and none can fall through unclassified. Labels use plain
 * business language (no accounting terms) per the Business Pulse product
 * principle.
 */
export const AGING_BUCKET_DEFINITIONS: readonly AgingBucketDefinition[] = [
  { key: 'not_due', label: 'Not due', minDays: -Infinity, maxDays: 0 },
  { key: 'd1_30', label: '1–30 overdue', minDays: 0, maxDays: 30 },
  { key: 'd31_60', label: '31–60 overdue', minDays: 30, maxDays: 60 },
  { key: 'd61_90', label: '61–90 overdue', minDays: 60, maxDays: 90 },
  { key: 'd90_plus', label: '90+ overdue', minDays: 90, maxDays: Infinity },
];

/**
 * Classifies a single open invoice's age. Returns 'unknown' - never a
 * bucket - when the due date is missing or unparseable, so callers can
 * represent that state honestly instead of manufacturing an age.
 */
export function classifyAgingBucket(dueDate: string | null | undefined, now: number): AgingClassification {
  if (!dueDate) return 'unknown';
  const dueTime = new Date(dueDate).getTime();
  if (!Number.isFinite(dueTime)) return 'unknown';
  const daysPastDue = (now - dueTime) / 86_400_000;
  const bucket = AGING_BUCKET_DEFINITIONS.find((b) => daysPastDue > b.minDays && daysPastDue <= b.maxDays);
  return bucket?.key ?? 'd90_plus';
}

export interface ReceivablesBreakdown {
  /** The five real, day-based buckets. Their values sum to (total - unknownValue). */
  buckets: AgingBucket[];
  /** Total outstanding balance across every open invoice, known-due-date or not. */
  total: number;
  /** Sum of buckets d1_30..d90_plus only - balances with a verified overdue due date. */
  overdueTotal: number;
  /** Open invoices whose due date is missing/unparseable - explicitly represented, never dropped. */
  unknownDueDate: { count: number; value: number };
}

/**
 * Buckets a list of invoices' open balances by age.
 *
 * - Only invoices with a positive balance count as owed; paid/closed
 *   invoices (balance <= 0) contribute $0 and are excluded entirely, never
 *   appearing in any bucket.
 * - Every open invoice with a verified due date is classified into exactly
 *   one bucket. Invoices with no verified due date are counted in `total`
 *   and `unknownDueDate`, never in a bucket - so bucket totals plus
 *   unknownDueDate.value always equal `total` exactly by construction.
 */
export function bucketReceivables(
  invoices: ReadonlyArray<{ balance: number; dueDate: string | null }>,
  now: number = Date.now()
): ReceivablesBreakdown {
  const valueByKey = new Map<AgingBucketKey, number>(AGING_BUCKET_DEFINITIONS.map((def) => [def.key, 0]));
  const countByKey = new Map<AgingBucketKey, number>(AGING_BUCKET_DEFINITIONS.map((def) => [def.key, 0]));
  let total = 0;
  let unknownValue = 0;
  let unknownCount = 0;

  for (const invoice of invoices) {
    if (!(invoice.balance > 0)) continue;
    total += invoice.balance;
    const key = classifyAgingBucket(invoice.dueDate, now);
    if (key === 'unknown') {
      unknownValue += invoice.balance;
      unknownCount += 1;
      continue;
    }
    valueByKey.set(key, (valueByKey.get(key) ?? 0) + invoice.balance);
    countByKey.set(key, (countByKey.get(key) ?? 0) + 1);
  }

  const buckets = AGING_BUCKET_DEFINITIONS.map((def) => ({
    key: def.key,
    label: def.label,
    value: valueByKey.get(def.key) ?? 0,
    count: countByKey.get(def.key) ?? 0,
  }));
  const overdueTotal = buckets
    .filter((b) => b.key !== 'not_due')
    .reduce((sum, b) => sum + b.value, 0);

  return { buckets, total, overdueTotal, unknownDueDate: { count: unknownCount, value: unknownValue } };
}

/**
 * Human due-date status for one invoice, for display next to an amount
 * (e.g. in an invoice row/card). Whole days, floored - "how overdue" should
 * read as a plain day count, not a fractional one.
 */
export function describeDueStatus(balance: number, dueDate: string | null | undefined, now: number): string {
  if (!(balance > 0)) return 'Paid';
  const classification = classifyAgingBucket(dueDate, now);
  if (classification === 'unknown') return 'Due date unknown';
  const dueTime = new Date(dueDate as string).getTime();
  const daysPastDue = Math.floor((now - dueTime) / 86_400_000);
  if (daysPastDue > 0) return `${daysPastDue} day${daysPastDue === 1 ? '' : 's'} overdue`;
  if (daysPastDue === 0) return 'Due today';
  const daysUntilDue = -daysPastDue;
  return `Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`;
}
