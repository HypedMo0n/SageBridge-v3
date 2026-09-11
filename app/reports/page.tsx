'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSageData } from '@/lib/useSageData';
import { ErrorState, LoadingRows } from '@/components/SageRows';
import { formatMoney } from '@/lib/utils';

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

    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const monthRows = rows.filter((invoice) => {
        const invoiceDate = new Date(invoice.date);
        return invoiceDate.getMonth() === date.getMonth() && invoiceDate.getFullYear() === date.getFullYear();
      });
      return {
        label: date.toLocaleString('en-CA', { month: 'short' }),
        invoiced: monthRows.reduce((sum, invoice) => sum + invoice.total, 0),
        collected: monthRows.reduce((sum, invoice) => sum + invoice.total - invoice.balance, 0),
      };
    });
    const chartMax = Math.max(...months.flatMap((month) => [month.invoiced, month.collected]), 1);

    const aging = [
      { label: 'Current', min: -Infinity, max: 0 },
      { label: '1–30', min: 0, max: 30 },
      { label: '31–60', min: 30, max: 60 },
      { label: '61–90+', min: 60, max: Infinity },
    ].map((bucket, index) => {
      const value = invoices
        .filter((invoice) => invoice.balance > 0)
        .filter((invoice) => {
          if (!invoice.dueDate) return index === 0;
          const age = (now.getTime() - new Date(invoice.dueDate).getTime()) / 86_400_000;
          return age > bucket.min && age <= bucket.max;
        })
        .reduce((sum, invoice) => sum + invoice.balance, 0);
      return { ...bucket, value };
    });
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
            <div key={bucket.label} style={{ display: 'grid', gridTemplateColumns: '58px 1fr auto', alignItems: 'center', gap: 9 }}>
              <span className="row-sub">{bucket.label}</span>
              <span className="bar" style={{ height: 6 }}>
                <i style={{ width: `${(bucket.value / report.agingMax) * 100}%`, background: `var(--viz-${index + 1})` }} />
              </span>
              <span className="money small">{formatMoney(bucket.value)}</span>
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
