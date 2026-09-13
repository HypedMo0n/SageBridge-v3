'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import { useSageData } from '@/lib/useSageData';
import { InvoiceRow, LoadingRows, ErrorState } from '@/components/SageRows';
import { formatMoneyWhole, formatRelativeTime } from '@/lib/utils';
import { bucketReceivables } from '@/lib/aging';
import { compareSalesToPriorMonth } from '@/lib/sales';
import { computeSyncFreshness, generateAttentionInsights, prioritizeOverdueInvoices } from '@/lib/pulse';

export default function Page() {
  const { customers, invoices, loading, error } = useSageData();
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), 0);
    return () => clearTimeout(timer);
  }, []);

  const pulse = useMemo(() => {
    const receivables = bucketReceivables(invoices, now);
    const sales = compareSalesToPriorMonth(invoices, now);
    const staleness = computeSyncFreshness(customers, now, formatRelativeTime);
    const insights = generateAttentionInsights({ receivables, invoices, sales, staleness, now });
    const topOverdue = prioritizeOverdueInvoices(invoices, now, 5);
    return { receivables, sales, staleness, insights, topOverdue };
  }, [customers, invoices, now]);

  const { receivables, sales, staleness, insights, topOverdue } = pulse;
  const bucketsMax = Math.max(...receivables.buckets.map((b) => b.value), 1);
  const trend = sales.changePct === null ? null : sales.changePct >= 0 ? `↑ ${sales.changePct}%` : `↓ ${Math.abs(sales.changePct)}%`;

  return (
    <>
      {loading ? (
        <LoadingRows />
      ) : error ? (
        <ErrorState text={error} />
      ) : (
        <>
          <section className="section">
            <h2 className="kicker">Business Pulse</h2>
            <div className="stat-grid">
              <div className="stat">
                <span className="kicker">Sales this month</span>
                <div className="stat-value money">{formatMoneyWhole(sales.thisMonth)}</div>
                <span className="row-sub">{trend ? `${trend} vs last month` : 'No prior month to compare'}</span>
              </div>
              <div className="stat">
                <span className="kicker">Customers owe you</span>
                <div className="stat-value money">{formatMoneyWhole(receivables.total)}</div>
                <span className="row-sub">{receivables.overdueTotal > 0 ? `${formatMoneyWhole(receivables.overdueTotal)} overdue` : 'None overdue'}</span>
              </div>
            </div>
            {staleness.freshLabel && (
              <Link href="/sync" className="row-sub" style={{ display: 'inline-block', marginTop: 10 }}>
                {staleness.freshLabel} ✓
              </Link>
            )}
          </section>

          <section className="section">
            <h2 className="kicker">Receivables</h2>
            <div className="card">
              <div className="stack">
                {receivables.buckets.map((bucket, index) => (
                  <div key={bucket.key} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 9 }}>
                    <span className="row-sub" style={{ whiteSpace: 'nowrap' }}>{bucket.label}</span>
                    <span className="bar" style={{ height: 6, minWidth: 24 }}>
                      <i style={{ width: `${(bucket.value / bucketsMax) * 100}%`, background: `var(--viz-${(index % 4) + 1})` }} />
                    </span>
                    <span className="small money" style={{ whiteSpace: 'nowrap' }}>{formatMoneyWhole(bucket.value)}</span>
                  </div>
                ))}
                {receivables.unknownDueDate.count > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 9 }}>
                    <span className="row-sub" style={{ whiteSpace: 'nowrap' }}>Due date unknown</span>
                    <span />
                    <span className="small money" style={{ whiteSpace: 'nowrap', color: 'var(--color-neutral-500)' }}>
                      {formatMoneyWhole(receivables.unknownDueDate.value)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="section">
            <h2 className="kicker">Needs attention</h2>
            <div className="card">
              {insights.length === 0 ? (
                <p className="notice">Nothing urgent right now.</p>
              ) : (
                <div className="stack">
                  {insights.map((insight) => (
                    <div key={insight.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span aria-hidden>{insight.emoji}</span>
                      <span className="small" style={{ lineHeight: 1.4 }}>{insight.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="section-head">
              <h2 className="kicker" style={{ margin: 0 }}>Needs a chase</h2>
              <Link href="/invoices" className="row-sub">See all</Link>
            </div>
            {topOverdue.length === 0 ? (
              <p className="notice">No overdue invoices right now.</p>
            ) : (
              <div className="stack">
                {topOverdue.map((invoice) => <InvoiceRow i={invoice} card key={invoice.id} />)}
              </div>
            )}
          </section>
        </>
      )}
      <Link href="/invoices/new" className="fab"><Plus size={17} />New invoice</Link>
    </>
  );
}
