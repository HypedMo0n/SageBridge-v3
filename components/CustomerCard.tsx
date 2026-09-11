'use client';

import Link from 'next/link';
import type { Customer } from '@/lib/api';
import { formatMoney, formatPhoneNumber } from '@/lib/utils';
import { ArrowUpRight, Phone } from '@phosphor-icons/react';

interface CustomerCardProps {
  customer: Customer;
}

export function CustomerCard({ customer }: CustomerCardProps) {
  return (
    <Link
      href={`/customers/${customer.sageId}`}
      className="block bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700 active:scale-[0.99] transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {customer.name}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
            {customer.email || 'No email on file'}
          </p>
        </div>
        <ArrowUpRight size={18} className="text-zinc-300 dark:text-zinc-600 shrink-0" />
      </div>

      <div className="flex items-center gap-2 mt-3 text-sm text-zinc-500 dark:text-zinc-400">
        <Phone size={14} className="shrink-0" />
        <span className="truncate">{formatPhoneNumber(customer.phone)}</span>
      </div>

      <div className="flex items-end justify-between mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <div>
          <div
            className={`text-xl font-bold tabular-nums ${
              customer.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {formatMoney(customer.balance)}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {customer.balance > 0 ? 'Outstanding' : 'Paid in full'}
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
          {customer.status}
        </span>
      </div>
    </Link>
  );
}
