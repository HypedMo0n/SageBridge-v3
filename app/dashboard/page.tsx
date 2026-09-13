'use client';

import Link from 'next/link';
import { CaretRight, CloudArrowUp, Plus } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { useSageData } from '@/lib/useSageData';
import { ErrorState, InvoiceRow, LoadingRows } from '@/components/SageRows';
import { formatMoney } from '@/lib/utils';

const money = (value: number | null | undefined) => value == null ? '—' : formatMoney(value);

function monthStart(offset: number) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offset, 1);
}

export default function Page() {
  const { customers, invoices, loading, error } = useSageData();
  const brief = useMemo(() => {
    const currentStart = monthStart(0);
    const nextStart = monthStart(1);
    const previousStart = monthStart(-1);
    const currentMonth = invoices.filter((invoice) => {
      const date = new Date(invoice.date);
      return date >= currentStart && date < nextStart;
    });
    const previousMonth = invoices.filter((invoice) => {
      const date = new Date(invoice.date);
      return date >= previousStart && date < currentStart;
    });
    const invoicedThisMonth = currentMonth.reduce((sum, invoice) => sum + (invoice.total ?? 0), 0);
    const previousInvoiced = previousMonth.reduce((sum, invoice) => sum + (invoice.total ?? 0), 0);
    const currentBalances = customers.reduce((sum, customer) => sum + (customer.balance ?? 0), 0);
    return {
      invoicedThisMonth,
      invoiceCount: currentMonth.length,
      averageInvoice: currentMonth.length ? invoicedThisMonth / currentMonth.length : null,
      previousInvoiced,
      currentBalances,
      customerCount: customers.length,
      recentInvoices: [...invoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5),
    };
  }, [customers, invoices]);

  if (loading) return <LoadingRows />;
  if (error) return <ErrorState text={error} />;

  return <>
    <section className="section">
      <h2 className="kicker">Morning brief</h2>
      <div className="stat-grid">
        <div className="stat"><span className="kicker">Invoiced this month</span><div className="stat-value money">{formatMoney(brief.invoicedThisMonth)}</div><span className="row-sub">{brief.invoiceCount} invoice{brief.invoiceCount === 1 ? '' : 's'}</span></div>
        <div className="stat"><span className="kicker">Average invoice</span><div className="stat-value money">{money(brief.averageInvoice)}</div><span className="row-sub">This month</span></div>
        <div className="stat"><span className="kicker">Customer balances</span><div className="stat-value money">{formatMoney(brief.currentBalances)}</div><span className="row-sub">Current balance total</span></div>
        <div className="stat"><span className="kicker">Customers</span><div className="stat-value money">{brief.customerCount}</div><span className="row-sub">Sage 50 records</span></div>
      </div>
    </section>

    <section className="section card">
      <div className="section-head"><div><h2 className="kicker" style={{ margin: 0 }}>Month comparison</h2><p className="row-sub">Invoiced totals by invoice date</p></div><span className="money">{brief.previousInvoiced ? `${((brief.invoicedThisMonth - brief.previousInvoiced) / brief.previousInvoiced * 100).toFixed(1)}%` : '—'}</span></div>
      <div className="row"><span className="row-main">This month</span><span className="money">{formatMoney(brief.invoicedThisMonth)}</span></div>
      <div className="row"><span className="row-main">Previous month</span><span className="money">{formatMoney(brief.previousInvoiced)}</span></div>
    </section>

    <section className="section">
      <div className="section-head"><h2 className="kicker" style={{ margin: 0 }}>Recent invoices</h2><Link href="/invoices" className="row-sub">View all <CaretRight size={12} /></Link></div>
      <div className="stack">{brief.recentInvoices.map((invoice) => <InvoiceRow i={invoice} key={invoice.id} />)}</div>
      {!brief.recentInvoices.length && <div className="empty card">No invoices are available.</div>}
    </section>

    <section className="section">
      <h2 className="kicker">Quick actions</h2>
      <div className="button-grid">
        <Link href="/invoices/new" className="btn btn-primary"><Plus size={16} />New invoice</Link>
        <Link href="/quotes/new" className="btn"><Plus size={16} />New quote</Link>
      </div>
    </section>

    <section className="section card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><CloudArrowUp size={18} /><span className="row-main"><strong className="row-title">Sage 50 data</strong><span className="row-sub">Last synced records are shown above.</span></span><Link href="/sync" aria-label="View sync status"><CaretRight size={13} /></Link></div>
    </section>
  </>;
}
