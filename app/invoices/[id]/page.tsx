'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, type Invoice } from '@/lib/api';
import { formatMoney, formatDate } from '@/lib/utils';
import { ArrowLeft, CalendarBlank } from '@phosphor-icons/react';
import { useParams } from 'next/navigation';

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customerId, setCustomerId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getInvoice(params.id).then((inv) => {
      setInvoice(inv);
      if (inv) {
        api.getCustomer(inv.customerSageId).then((c) => {
          if (c) {
            setCustomerId(c.sageId);
          }
        });
      }
      setLoading(false);
    });
  }, [params.id]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <div className="h-6 w-24 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="h-8 w-48 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="h-40 bg-zinc-100 dark:bg-zinc-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-zinc-500 dark:text-zinc-400">Invoice not found.</p>
        <Link href="/invoices" className="text-emerald-600 dark:text-emerald-400 mt-2 inline-block">
          Back to invoices
        </Link>
      </div>
    );
  }

  const isUnpaid = invoice.balance > 0;

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <Link
        href="/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 mb-4"
      >
        <ArrowLeft size={16} />
        Invoices
      </Link>

      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{invoice.invoiceNumber}</h1>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            isUnpaid
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
          }`}
        >
          {isUnpaid ? 'Open' : 'Paid'}
        </span>
      </div>

      <div className="mt-5 bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800">
        <div className="space-y-4">
          <div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Customer</div>
            {customerId ? (
              <Link
                href={`/customers/${customerId}`}
                className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                {invoice.customerName}
              </Link>
            ) : (
              <div className="font-medium">{invoice.customerName}</div>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <CalendarBlank size={16} className="text-zinc-400" />
            {formatDate(invoice.date)}
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
          <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-300">
            <span>Total</span>
            <span className="font-medium tabular-nums">{formatMoney(invoice.total)}</span>
          </div>
          {isUnpaid && (
            <div className="flex justify-between text-lg font-bold">
              <span>Balance due</span>
              <span className="text-red-600 dark:text-red-400 tabular-nums">
                {formatMoney(invoice.balance)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
