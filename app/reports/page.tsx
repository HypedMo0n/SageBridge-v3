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
    const invoiced = rows.reduce((sum, invoice) => sum + (invoice.total ?? 0), 0);
    const invoiceCount = rows.length;
    const averageInvoice = invoiceCount ? invoiced / invoiceCount : null;
    const currentBalance = rows.reduce((sum, invoice) => sum + (invoice.balance ?? 0), 0);

    const salesByCustomer = new Map<string, { name: string; sageId: string; total: number }>();
    for (const invoice of rows) {
      const sageId = invoice.customerSageId || 'unknown';
      const previous = salesByCustomer.get(sageId);
      salesByCustomer.set(sageId, {
        sageId,
        name: invoice.customerName || sageId,
        total: (previous?.total ?? 0) + (invoice.total ?? 0),
      });
    }
    const topSales = [...salesByCustomer.values()].sort((a, b) => b.total - a.total).slice(0, 5);
    const topSalesMax = Math.max(...topSales.map((customer) => customer.total), 1);
    const largestBalances = [...customers].filter((customer) => customer.balance != null).sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0)).slice(0, 5);
    const largestBalanceMax = Math.max(...largestBalances.map((customer) => customer.balance ?? 0), 1);

    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const monthRows = invoices.filter((invoice) => {
        const invoiceDate = new Date(invoice.date);
        return invoiceDate.getMonth() === date.getMonth() && invoiceDate.getFullYear() === date.getFullYear();
      });
      return {
        label: date.toLocaleString('en-CA', { month: 'short' }),
        total: monthRows.reduce((sum, invoice) => sum + (invoice.total ?? 0), 0),
      };
    });
    const chartMax = Math.max(...months.map((month) => month.total), 1);

    return { invoiced, invoiceCount, averageInvoice, currentBalance, topSales, topSalesMax, largestBalances, largestBalanceMax, months, chartMax, rows };
  }, [customers, invoices, period]);

  if (loading) return <LoadingRows />;
  if (error) return <ErrorState text={error} />;

  return <>
    <div className="seg section" aria-label="Report period">
      {([[30, '30 days'], [90, '90 days'], [365, 'Year']] as const).map(([value, label]) => <button key={value} className={period === value ? 'active' : ''} onClick={() => setPeriod(value)}>{label}</button>)}
    </div>

    <div className="stat-grid section">
      <ReportStat label="Invoiced" value={formatMoney(report.invoiced)} accent note="Invoice totals" />
      <ReportStat label="Invoice count" value={String(report.invoiceCount)} note="Invoices in period" />
      <ReportStat label="Average invoice" value={report.averageInvoice == null ? '—' : formatMoney(report.averageInvoice)} note="Invoice total ÷ count" />
      <ReportStat label="Current balances" value={formatMoney(report.currentBalance)} note="Invoice balances in period" />
    </div>

    <section className="section">
      <div className="section-head"><h2 className="kicker" style={{ margin: 0 }}>Monthly invoiced trend</h2><span className="row-sub">Invoice totals by date</span></div>
      <div className="chart" aria-label="Six-month invoiced total column chart">
        {report.months.map((month) => <div className="chart-col" key={month.label}><span style={{ height: `${Math.max((month.total / report.chartMax) * 100, month.total ? 2 : 0)}%` }} /><small>{month.label}</small></div>)}
      </div>
    </section>

    <section className="section">
      <h2 className="kicker">Top customers · invoiced sales</h2>
      {report.topSales.map((customer) => <Link className="row" href={`/customers/${customer.sageId}`} key={customer.sageId}><span className="row-main"><span className="row-title">{customer.name}</span><span className="bar" style={{ height: 4, marginTop: 6 }}><i style={{ width: `${(customer.total / report.topSalesMax) * 100}%`, background: 'var(--viz-2)' }} /></span></span><span className="money small">{formatMoney(customer.total)}</span></Link>)}
      {!report.topSales.length && <div className="empty card">No invoiced sales are available for this period.</div>}
    </section>

    <section className="section">
      <h2 className="kicker">Largest current customer balances</h2>
      {report.largestBalances.map((customer) => <Link className="row" href={`/customers/${customer.sageId}`} key={customer.sageId}><span className="row-main"><span className="row-title">{customer.name}</span><span className="bar" style={{ height: 4, marginTop: 6 }}><i style={{ width: `${((customer.balance ?? 0) / report.largestBalanceMax) * 100}%`, background: 'var(--viz-3)' }} /></span></span><span className="money small">{formatMoney(customer.balance ?? 0)}</span></Link>)}
      {!report.largestBalances.length && <div className="empty card">No customer balances are available.</div>}
    </section>

    <section className="section">
      <h2 className="kicker">Invoice activity</h2>
      <div className="stack">{report.rows.slice(0, 10).map((invoice) => <Link className="row" href={`/invoices/${invoice.invoiceNumber}`} key={invoice.id}><span className="row-main"><span className="row-title">{invoice.invoiceNumber}</span><span className="row-sub">{invoice.customerName || invoice.customerSageId || 'Sage 50 customer'}</span></span><span style={{ textAlign: 'right' }}><span className="row-title money">{invoice.total == null ? '—' : formatMoney(invoice.total)}</span><span className="row-sub">Balance {invoice.balance == null ? '—' : formatMoney(invoice.balance)}</span></span></Link>)}</div>
      {!report.rows.length && <div className="empty card">No invoice activity is available for this period.</div>}
    </section>
  </>;
}

function ReportStat({ label, value, note, accent = false }: { label: string; value: string; note: string; accent?: boolean }) {
  return <div className="stat"><span className="kicker">{label}</span><div className="stat-value money" style={accent ? { color: 'var(--color-accent-300)' } : undefined}>{value}</div><span className="row-sub">{note}</span></div>;
}
