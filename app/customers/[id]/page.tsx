'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, type Customer, type Invoice } from '@/lib/api';
import { formatMoney, formatPhoneNumber } from '@/lib/utils';
import { InvoiceCard } from '@/components/InvoiceCard';
import { ArrowLeft, Phone, Envelope, MapPin } from '@phosphor-icons/react';
import { useParams } from 'next/navigation';

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCustomer(params.id).then((c) => {
      setCustomer(c);
      if (c) {
        api.getCustomerInvoices(c.sageId).then(setInvoices);
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

  if (!customer) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-zinc-500 dark:text-zinc-400">Customer not found.</p>
        <Link href="/customers" className="text-emerald-600 dark:text-emerald-400 mt-2 inline-block">
          Back to customers
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 mb-4"
      >
        <ArrowLeft size={16} />
        Customers
      </Link>

      <h1 className="text-2xl font-bold tracking-tight mb-1">{customer.name}</h1>
      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
        {customer.status}
      </span>

      <Link
        href={`/invoices/new?customerId=${customer.sageId}`}
        className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-emerald-600 font-medium text-white transition-colors hover:bg-emerald-700 active:scale-[0.99]"
      >
        Create invoice
      </Link>

      <div className="mt-5 bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800">
        <div className="text-sm text-zinc-500 dark:text-zinc-400">Outstanding balance</div>
        <div
          className={`text-4xl font-bold tabular-nums mt-1 ${
            customer.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {formatMoney(customer.balance)}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-medium transition-colors"
            >
              <Phone size={18} weight="bold" />
              Call
            </a>
          )}
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="flex items-center justify-center gap-2 bg-zinc-900 dark:bg-zinc-700 hover:bg-zinc-800 text-white py-3 rounded-xl font-medium transition-colors"
            >
              <Envelope size={18} weight="bold" />
              Email
            </a>
          )}
        </div>
      </div>

      <div className="mt-4 bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800">
        <h2 className="font-semibold mb-3">Contact information</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
            <Envelope size={16} className="text-zinc-400 shrink-0" />
            {customer.email || 'Not provided'}
          </div>
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
            <Phone size={16} className="text-zinc-400 shrink-0" />
            {formatPhoneNumber(customer.phone)}
          </div>
          {customer.address && (
            <div className="flex items-start gap-2 text-zinc-600 dark:text-zinc-300">
              <MapPin size={16} className="text-zinc-400 shrink-0 mt-0.5" />
              <span>
                {customer.address}
                {customer.city && `, ${customer.city}`}
                {customer.province && `, ${customer.province}`}
                {customer.postalCode && ` ${customer.postalCode}`}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
          Invoices ({invoices.length})
        </h2>
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <InvoiceCard key={invoice.id} invoice={invoice} />
          ))}
        </div>
        {invoices.length === 0 && (
          <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 text-sm">
            No invoices yet.
          </div>
        )}
      </div>
    </div>
  );
}
