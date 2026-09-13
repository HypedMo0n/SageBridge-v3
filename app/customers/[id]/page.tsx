'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Envelope, Phone, Receipt } from '@phosphor-icons/react';
import { api, type Customer, type Invoice } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import { InvoiceRow, LoadingRows } from '@/components/SageRows';

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>();
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    api.getCustomer(id).then((value) => {
      setCustomer(value);
      if (value) api.getCustomerInvoices(value.sageId).then(setInvoices);
    });
  }, [id]);

  if (customer === undefined) return <LoadingRows />;
  if (!customer) return <div className="empty">Customer not found.</div>;

  const contactLines = [
    ['Contact', customer.contact],
    ['Email', customer.email],
    ['Phone', customer.phone],
    ['Alternate phone', customer.alternatePhone],
    ['Fax', customer.fax],
    ['Address', customer.address],
    ['Sage ID', customer.sageId],
    ['Status', customer.status],
  ].filter(([, value]) => value);

  return <>
    <section className="card hero section">
      <span className="kicker">Current balance</span>
      <div className="hero-money money">{formatMoney(customer.balance)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
        <a className="btn" href={customer.phone ? `tel:${customer.phone}` : undefined} aria-disabled={!customer.phone}><Phone size={16} />Call</a>
        <a className="btn" href={customer.email ? `mailto:${customer.email}` : undefined} aria-disabled={!customer.email}><Envelope size={16} />Email</a>
        <Link className="btn btn-primary" href={`/invoices/new?customerId=${customer.sageId}`}><Receipt size={16} />Invoice</Link>
      </div>
    </section>
    <section className="section"><h2 className="kicker">Details</h2><div className="card">{contactLines.map(([label, value]) => <div className="row" key={label}><span className="row-sub row-main">{label}</span><span className="small">{value}</span></div>)}</div></section>
    <section><h2 className="kicker">Invoices</h2>{invoices.map((invoice) => <InvoiceRow i={invoice} key={invoice.id} />)}{!invoices.length && <div className="empty card">No invoices are available.</div>}</section>
  </>;
}
