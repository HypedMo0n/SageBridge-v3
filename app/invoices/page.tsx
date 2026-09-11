'use client';

import { useState, useEffect, useMemo } from 'react';
import { api, type Invoice } from '@/lib/api';
import { InvoiceCard } from '@/components/InvoiceCard';
import { SearchBar } from '@/components/SearchBar';
import { FileText } from '@phosphor-icons/react';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api
      .getInvoices()
      .then(setInvoices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return invoices.filter(
      (i) =>
        i.invoiceNumber.toLowerCase().includes(q) ||
        i.customerName.toLowerCase().includes(q)
    );
  }, [invoices, query]);

  const unpaid = filtered.filter((i) => i.balance > 0);
  const paid = filtered.filter((i) => i.balance <= 0);

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight mb-4">Invoices</h1>
      <SearchBar
        placeholder="Search invoice # or customer..."
        value={query}
        onChange={setQuery}
      />

      <div className="mt-5 space-y-6">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse"
              />
            ))}
          </div>
        ) : !query.trim() ? (
          <div className="text-center py-16">
            <FileText size={40} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
            <p className="font-medium text-zinc-700 dark:text-zinc-200">Find an invoice</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Search {invoices.length} invoices by number or customer.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={40} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
            <p className="text-zinc-500 dark:text-zinc-400">No invoices match your search.</p>
          </div>
        ) : (
          <>
            {unpaid.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
                  Open ({unpaid.length})
                </h2>
                <div className="space-y-3">
                  {unpaid.map((invoice) => (
                    <InvoiceCard key={invoice.id} invoice={invoice} />
                  ))}
                </div>
              </section>
            )}
            {paid.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
                  Paid ({paid.length})
                </h2>
                <div className="space-y-3">
                  {paid.map((invoice) => (
                    <InvoiceCard key={invoice.id} invoice={invoice} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
