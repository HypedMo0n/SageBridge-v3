'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Info } from '@phosphor-icons/react';

export default function NewQuotePage() {
  const [customerId] = useState(() =>
    typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('customerId') || ''
  );

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <Link href={customerId ? `/customers/${customerId}` : '/customers'} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        <ArrowLeft size={16} />
        Back
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">New quote</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Prepare a quote from the customer profile.</p>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-300">
        <Info size={20} className="mt-0.5 shrink-0" />
        <p>Quote creation will activate after the connector supports the quote.create contract. Nothing will be posted yet.</p>
      </div>

      <div className="mt-5 space-y-4 opacity-70">
        <Field label="Customer ID" value={customerId} placeholder="Select a customer" />
        <Field label="Valid until" type="date" />
        <Field label="Description" placeholder="Proposed work" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity" type="number" placeholder="1" />
          <Field label="Price" type="number" placeholder="0.00" />
        </div>
        <button disabled className="h-12 w-full rounded-xl bg-zinc-300 font-medium text-white dark:bg-zinc-700">
          Create quote
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, placeholder, type = 'text' }: { label: string; value?: string; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      <input readOnly={value !== undefined} value={value} type={type} placeholder={placeholder} className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-900" />
    </div>
  );
}
