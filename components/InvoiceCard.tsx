'use client';

import Link from 'next/link';
import type { Invoice } from '@/lib/api';
import { formatMoney, formatDate } from '@/lib/utils';
import { ArrowUpRight, CalendarBlank } from '@phosphor-icons/react';

interface InvoiceCardProps {
  invoice: Invoice;
}

export function InvoiceCard({ invoice }: InvoiceCardProps) {
  const isUnpaid = invoice.balance > 0;

  return (
    <Link
      href={`/invoices/${invoice.invoiceNumber}`}
      className="block bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700 active:scale-[0.99] transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {invoice.invoiceNumber}
            </h3>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                isUnpaid
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              }`}
            >
              {isUnpaid ? 'Open' : 'Paid'}
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
            {invoice.customerName}
          </p>
        </div>
        <ArrowUpRight size={18} className="text-zinc-300 dark:text-zinc-600 shrink-0" />
      </div>

      <div className="flex items-center gap-2 mt-3 text-sm text-zinc-500 dark:text-zinc-400">
        <CalendarBlank size={14} className="shrink-0" />
        <span>{formatDate(invoice.date)}</span>
      </div>

      <div className="flex items-end justify-between mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex gap-6">
          <div>
            <div className="text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
              {formatMoney(invoice.total)}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Total</div>
          </div>
          {isUnpaid && (
            <div>
              <div className="text-xl font-bold tabular-nums text-red-600 dark:text-red-400">
                {formatMoney(invoice.balance)}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Due</div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
