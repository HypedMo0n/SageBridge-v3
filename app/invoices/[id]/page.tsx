'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CaretRight } from '@phosphor-icons/react';
import { api, type Invoice } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/utils';
import { LoadingRows, initials } from '@/components/SageRows';

const money = (value: number | null | undefined) => value == null ? '—' : formatMoney(value);

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>();

  useEffect(() => { api.getInvoice(id).then(setInvoice); }, [id]);

  if (invoice === undefined) return <LoadingRows />;
  if (!invoice) return <div className="empty">Invoice not found.</div>;

  return <>
    <section className="card hero section">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span className="kicker">Invoice {invoice.invoiceNumber}</span>
        <span className="row-sub">Issued {formatDate(invoice.date)}</span>
      </div>
      <div className="hero-money money">{money(invoice.balance)}</div>
      <p className="row-sub">Current balance</p>
      <div className="rule" />
      {invoice.customerSageId ? <Link href={`/customers/${invoice.customerSageId}`} className="row" style={{ padding: 0 }}>
        <span className="avatar">{initials(invoice.customerName || invoice.customerSageId)}</span>
        <span className="row-main"><span className="row-title">{invoice.customerName || invoice.customerSageId}</span><span className="row-sub">Customer</span></span>
        <CaretRight size={13} />
      </Link> : <p className="notice">Customer reference is not present in the current Sage response.</p>}
    </section>

    <section className="section">
      <h2 className="kicker">Lines</h2>
      <div className="card"><p className="notice">Line items are not included in the current invoice API response. No line details are invented.</p></div>
    </section>

    <section className="section">
      <h2 className="kicker">Totals</h2>
      <div className="row"><span className="row-main">Pre-tax total</span><span className="money">{money(invoice.preTaxTotal)}</span></div>
      <div className="row"><span className="row-main">Original total</span><span className="money">{money(invoice.total)}</span></div>
      <div className="row"><span className="row-main">Current balance</span><span className="money">{money(invoice.balance)}</span></div>
      <div className="row"><span className="row-main">Home-currency total</span><span className="money">{money(invoice.homeCurrencyTotal)}</span></div>
      <div className="row"><span className="row-main">Home-currency balance</span><span className="money">{money(invoice.homeCurrencyBalance)}</span></div>
      <div className="row"><span className="row-main">Transaction-currency total</span><span className="money">{money(invoice.transactionCurrencyTotal)}</span></div>
      <div className="row"><span className="row-main">Transaction-currency balance</span><span className="money">{money(invoice.transactionCurrencyBalance)}</span></div>
    </section>

    {invoice.reference && <section className="section"><h2 className="kicker">Reference</h2><div className="card"><p className="notice">{invoice.reference}</p></div></section>}
  </>;
}
