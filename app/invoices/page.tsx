'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import { useSageData } from '@/lib/useSageData';
import { InvoiceRow, QuoteRow, LoadingRows, ErrorState } from '@/components/SageRows';

type DocumentView = 'Invoices' | 'Quotes' | 'All';
type InvoiceFilter = 'All' | 'Overdue' | 'Open' | 'Paid';

export default function Page() {
  const { invoices, quotes, loading, error } = useSageData();
  const [view, setView] = useState<DocumentView>('Invoices');
  const [filter, setFilter] = useState<InvoiceFilter>('All');
  const now = new Date();
  const rows = invoices.filter((invoice) => filter === 'All' || filter === 'Paid' && invoice.balance <= 0 || filter === 'Open' && invoice.balance > 0 || filter === 'Overdue' && invoice.balance > 0 && Boolean(invoice.dueDate) && new Date(invoice.dueDate as string) < now);
  const showsInvoices = view !== 'Quotes';
  const showsQuotes = view !== 'Invoices';

  return <>
    <div className="work-toolbar">
      <div className="seg" aria-label="Document view">
        {(['Invoices', 'Quotes', 'All'] as DocumentView[]).map((item) => <button key={item} type="button" className={view === item ? 'active' : ''} aria-pressed={view === item} onClick={() => setView(item)}>{item}</button>)}
      </div>
      <div className="work-create" aria-label="Create document">
        <Link href="/invoices/new" className="btn"><Plus size={16} />Invoice</Link>
        <Link href="/quotes/new" className="btn btn-primary"><Plus size={16} />Quote</Link>
      </div>
    </div>

    {showsInvoices && <section className="work-section" aria-labelledby="invoice-heading">
      <div className="work-section-head"><div><h2 id="invoice-heading">Invoices</h2><p>Synced from Sage 50</p></div><div className="chips">{(['All', 'Overdue', 'Open', 'Paid'] as InvoiceFilter[]).map((item) => <button type="button" onClick={() => setFilter(item)} className={`chip ${filter === item ? 'active' : ''}`} aria-pressed={filter === item} key={item}>{item}</button>)}</div></div>
      {loading ? <LoadingRows /> : error ? <ErrorState text={error} /> : rows.length ? <div className="stack work-list">{rows.map((invoice) => <InvoiceRow i={invoice} card key={invoice.id} />)}</div> : <div className="empty card">No invoices match this filter.</div>}
    </section>}

    {showsQuotes && <section className="work-section quotes-state" aria-labelledby="quote-heading">
      <div className="work-section-head"><div><h2 id="quote-heading">Quotes</h2><p>Synced from Sage 50</p></div></div>
      {loading ? <LoadingRows /> : error ? <ErrorState text={error} /> : quotes.length ? <div className="stack work-list">{quotes.map((quote) => <QuoteRow q={quote} key={quote.id || quote.quoteNumber} />)}</div> : <div className="empty card">No quotes have synced from Sage 50.</div>}
    </section>}

    <Link href={view === 'Quotes' ? '/quotes/new' : '/invoices/new'} className="fab work-fab"><Plus size={17} />New {view === 'Quotes' ? 'quote' : 'invoice'}</Link>
  </>;
}
