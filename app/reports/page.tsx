'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSageData } from '@/lib/useSageData';
import { ErrorState, LoadingRows } from '@/components/SageRows';
import { formatMoney } from '@/lib/utils';
import { bucketReceivables } from '@/lib/aging';
import { monthlySales } from '@/lib/sales';

type Period = 30 | 90 | 365;

export default function ReportsPage() {
  const { customers, invoices, loading, error } = useSageData();
  const [period, setPeriod] = useState<Period>(90);

  const report = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - period);
    const rows = invoices.filter((invoice) => new Date(invoice.date) >= cutoff);
    const invoiced = rows.reduce((sum, invoice) => sum + invoice.total, 0);
    const outstanding = rows.reduce((sum, invoice) => sum + invoice.balance, 0);
    const collected = invoiced - outstanding;

    const top = [...customers].sort((a, b) => b.balance - a.balance).slice(0, 5);
    const topMax = Math.max(...top.map((customer) => customer.balance), 1);

    const months = monthlySales(rows, 6, now.getTime());
    const chartMax = Math.max(...months.flatMap((month) => [month.invoiced, month.collected]), 1);

    const { buckets: aging } = bucketReceivables(invoices, now.getTime());
    const agingMax = Math.max(...aging.map((bucket) => bucket.value), 1);

    return { invoiced, collected, outstanding, top, topMax, months, chartMax, aging, agingMax };
  }, [customers, invoices, period]);

  if (loading) return <LoadingRows />;
  if (error) return <ErrorState text={error} />;

  return (
    <>
      <div className="seg section" aria-label="Report period">
        {([[30, '30 days'], [90, '90 days'], [365, 'Year']] as const).map(([value, label]) => (
          <button key={value} className={period === value ? 'active' : ''} onClick={() => setPeriod(value)}>
            {label}
          </button>
        ))}
      </div>

      <div className="stat-grid section">
        <ReportStat label="Invoiced" value={formatMoney(report.invoiced)} accent />
        <ReportStat label="Collected" value={formatMoney(report.collected)} accent />
        <ReportStat label="Outstanding" value={formatMoney(report.outstanding)} />
        <ReportStat label="Avg days to pay" value="Unavailable" note="Payment dates are not synced" />
      </div>

      <section className="section">
        <div className="section-head">
          <h2 className="kicker" style={{ margin: 0 }}>Invoiced vs collected</h2>
          <span className="row-sub">Outline invoiced · solid collected</span>
        </div>
        <div className="chart" aria-label="Six-month invoiced versus collected column chart">
          {report.months.map((month) => (
            <div className="chart-col" key={month.label}>
              <span style={{ height: `${Math.max((month.invoiced / report.chartMax) * 100, month.invoiced ? 2 : 0)}%` }} />
              <span style={{ height: `${Math.max((month.collected / report.chartMax) * 100, month.collected ? 2 : 0)}%` }} />
              <small>{month.label}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="kicker">Receivables by age</h2>
        <div className="stack">
          {report.aging.map((bucket, index) => (
            <div key={bucket.key} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 9 }}>
              <span className="row-sub" style={{ whiteSpace: 'nowrap' }}>{bucket.label}</span>
              <span className="bar" style={{ height: 6, minWidth: 24 }}>
                <i style={{ width: `${(bucket.value / report.agingMax) * 100}%`, background: `var(--viz-${index + 1})` }} />
              </span>
              <span className="money small" style={{ whiteSpace: 'nowrap' }}>{formatMoney(bucket.value)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="kicker">Top customers · outstanding</h2>
        {report.top.map((customer) => (
          <Link className="row" href={`/customers/${customer.sageId}`} key={customer.id}>
            <span className="row-main">
              <span className="row-title">{customer.name}</span>
              <span className="bar" style={{ height: 4, marginTop: 6 }}>
                <i style={{ width: `${(customer.balance / report.topMax) * 100}%`, background: 'var(--viz-2)' }} />
              </span>
            </span>
            <span className="money small">{formatMoney(customer.balance)}</span>
          </Link>
        ))}
      </section>

      <section className="section">
        <h2 className="kicker">Where it came from</h2>
        <p className="notice">Revenue by category will appear when invoice line items are included in the Sage sync.</p>
      </section>

      <div className="button-grid">
        <button disabled className="btn btn-primary">Email as PDF</button>
        <button disabled className="btn">Export CSV</button>
      </div>
      <p className="notice">Exports are unavailable because the current API has no report export endpoint. Figures come from the last Sage 50 sync; queued phone changes are excluded.</p>
    </>
  );
}

function ReportStat({ label, value, note = 'Synced records', accent = false }: { label: string; value: string; note?: string; accent?: boolean }) {
  return (
    <div className="stat">
      <span className="kicker">{label}</span>
      <div className="stat-value money" style={accent ? { color: 'var(--color-accent-300)' } : undefined}>{value}</div>
      <span className="row-sub">{note}</span>
    </div>
  );
}
