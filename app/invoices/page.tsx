'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FileText, Plus } from '@phosphor-icons/react';
import { useSageData } from '@/lib/useSageData';
import { InvoiceRow, LoadingRows, ErrorState } from '@/components/SageRows';

type DocumentView = 'Invoices' | 'Quotes' | 'All';

export default function Page() {
  const { invoices, loading, error } = useSageData();
  const [view, setView] = useState<DocumentView>('Invoices');
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
      <div className="work-section-head"><div><h2 id="invoice-heading">Invoices</h2><p>Synced from Sage 50</p></div></div>
      {loading ? <LoadingRows /> : error ? <ErrorState text={error} /> : invoices.length ? <div className="stack work-list">{invoices.map((invoice) => <InvoiceRow i={invoice} card key={invoice.id} />)}</div> : <div className="empty card">No invoices are available.</div>}
    </section>}

    {showsQuotes && <section className="work-section quotes-state" aria-labelledby="quote-heading">
      <div className="empty card"><span className="icon-box accent-box"><FileText size={20} /></span><h2 id="quote-heading">Quotes aren’t available in this list yet</h2><p>The current API has no quote read route or quote sync. No quote history is shown.</p><Link href="/quotes/new" className="btn btn-primary"><Plus size={16} />Create quote</Link></div>
    </section>}

    <Link href={view === 'Quotes' ? '/quotes/new' : '/invoices/new'} className="fab work-fab"><Plus size={17} />New {view === 'Quotes' ? 'quote' : 'invoice'}</Link>
  </>;
}
