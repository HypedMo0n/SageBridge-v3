'use client';

import Link from 'next/link';
import { CaretRight, Package, Wrench, Receipt } from '@phosphor-icons/react';
import type { Customer, Invoice, Product } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/utils';

export const initials = (value: string) => value.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const money = (value: number | null | undefined) => value == null ? '—' : formatMoney(value);

export function CustomerRow({ c }: { c: Customer }) {
  return <Link href={`/customers/${c.sageId}`} className="row">
    <span className="avatar">{initials(c.name)}</span>
    <span className="row-main"><span className="row-title">{c.name}</span><span className="row-sub">{c.city || c.email || 'Sage 50 customer'}</span></span>
    <span style={{ textAlign: 'right' }}><span className="row-title money">{money(c.balance)}</span><span className="row-sub">Current balance</span></span>
    <CaretRight className="chev" size={13} />
  </Link>;
}

export function InvoiceRow({ i, card = false }: { i: Invoice; card?: boolean }) {
  return <Link href={`/invoices/${i.invoiceNumber}`} className={card ? 'card' : 'row'} style={card ? { display: 'block' } : undefined}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Receipt className="subtle" size={card ? 0 : 18} />
      <span className="row-main"><span className="row-title" style={{ fontWeight: 500 }}>{i.invoiceNumber}</span><span className="row-sub">{i.customerName || i.customerSageId || 'Sage 50 customer'}</span></span>
      <span className="row-sub">{formatDate(i.date)}</span>
      <CaretRight className="chev" size={13} />
    </div>
    {card && <><div className="rule" /><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span><b className="money" style={{ fontSize: 18, fontWeight: 400 }}>{money(i.total)}</b><span className="row-sub">Original total</span></span>
      <span style={{ textAlign: 'right' }}><b className="money" style={{ fontSize: 14, fontWeight: 400 }}>{money(i.balance)}</b><span className="row-sub">Current balance</span></span>
    </div></>}
  </Link>;
}

export function ProductRow({ p }: { p: Product }) {
  const Icon = p.isService ? Wrench : Package;
  const low = p.stock != null && p.reorderLevel != null && p.stock <= p.reorderLevel;
  return <div className="row"><span className={`icon-box ${p.isService ? 'accent-box' : ''}`}><Icon size={15} /></span><span className="row-main"><span className="row-title">{p.name}</span><span className="row-sub">{p.sku} · {p.isService ? 'Service' : p.stock == null ? 'Stock unavailable' : low ? `${p.stock} left · reorder` : `${p.stock} in stock`}</span></span><span className="row-title money">{money(p.price)}</span></div>;
}

export function LoadingRows() { return <div className="stack">{[1, 2, 3, 4].map((x) => <div className="skeleton" key={x} />)}</div>; }
export function ErrorState({ text }: { text: string }) { return <div className="error">{text}</div>; }
