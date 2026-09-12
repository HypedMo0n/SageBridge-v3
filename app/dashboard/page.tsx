'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus, Receipt, CloudArrowUp, CaretRight } from '@phosphor-icons/react';
import { useSageData } from '@/lib/useSageData';
import { InvoiceRow, LoadingRows, ErrorState } from '@/components/SageRows';
import { formatMoney } from '@/lib/utils';
import { bucketReceivables } from '@/lib/aging';

export default function Page() {
  const { customers, invoices, loading, error } = useSageData();
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), 0);
    return () => clearTimeout(timer);
  }, []);

  const { buckets, total } = bucketReceivables(invoices, now);
  const bucketsMax = Math.max(...buckets.map((b) => b.value), 1);
  const over = invoices.filter((i) => i.balance > 0 && i.dueDate && new Date(i.dueDate).getTime() < now);

  return (
    <>
      {loading ? (
        <LoadingRows />
      ) : error ? (
        <ErrorState text={error} />
      ) : (
        <>
          <section className="section">
            <h2 className="kicker">Owed to you</h2>
            <div className="card hero">
              <div className="hero-money money">{formatMoney(total)}</div>
              <div className="stack" style={{ marginTop: 14, gap: 8 }}>
                {buckets.map((bucket, index) => (
                  <div key={bucket.key} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 9 }}>
                    <span className="row-sub" style={{ whiteSpace: 'nowrap' }}>{bucket.label}</span>
                    <span className="bar" style={{ height: 6, minWidth: 24 }}>
                      <i style={{ width: `${(bucket.value / bucketsMax) * 100}%`, background: `var(--viz-${index + 1})` }} />
                    </span>
                    <span className="small money" style={{ whiteSpace: 'nowrap' }}>{formatMoney(bucket.value).replace('.00', '')}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className="section">
            <h2 className="kicker">Waiting on you</h2>
            <Link className="card" href="/invoices/new" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <span className="icon-box"><Receipt size={15} /></span>
              <span className="row-main">
                <span className="row-title">New invoice from the truck</span>
                <span className="row-sub">Post a quote or invoice through the Sage 50 connector</span>
              </span>
              <CaretRight size={13} />
            </Link>
            <Link className="card" href="/sync" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <span className="icon-box"><CloudArrowUp size={15} /></span>
              <span className="row-main">
                <span className="row-title">Review sync status</span>
                <span className="row-sub">Latest timestamp comes from {customers.length} synced customers</span>
              </span>
              <CaretRight size={13} />
            </Link>
          </section>
          <section>
            <div className="section-head">
              <h2 className="kicker" style={{ margin: 0 }}>Needs a chase</h2>
              <span className="row-sub">{over.length} overdue</span>
            </div>
            <div className="stack">
              {over.slice(0, 5).map((i) => <InvoiceRow i={i} card key={i.id} />)}
            </div>
          </section>
        </>
      )}
      <Link href="/invoices/new" className="fab"><Plus size={17} />New invoice</Link>
    </>
  );
}
