'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, type Customer, type Invoice, type Product } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import {
  Users,
  FileText,
  Package,
  ArrowUpRight,
  Stack,
} from '@phosphor-icons/react';
import type { ElementType } from 'react';

function formatSyncAge(value: string, referenceTime: number): string {
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const seconds = Math.max(0, Math.floor((referenceTime - new Date(normalized).getTime()) / 1000));
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} hr ago`;
}

export default function DashboardPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [referenceTime, setReferenceTime] = useState(0);

  useEffect(() => {
    Promise.all([api.getCustomers(), api.getInvoices(), api.getProducts()])
      .then(([c, i, p]) => {
        setCustomers(c);
        setInvoices(i);
        setProducts(p);
        setReferenceTime(Date.now());
      })
      .catch(console.error);
  }, []);

  const totalReceivables = customers.reduce((s, c) => s + c.balance, 0);
  const openInvoices = invoices.filter((i) => i.balance > 0).length;
  const latestSync = customers.reduce<string | null>((latest, customer) => {
    if (!customer.lastSyncedAt) return latest;
    return !latest || customer.lastSyncedAt > latest ? customer.lastSyncedAt : latest;
  }, null);
  const normalizedLatestSync = latestSync
    ? latestSync.includes('T')
      ? latestSync
      : `${latestSync.replace(' ', 'T')}Z`
    : null;
  const syncIsFresh = normalizedLatestSync && referenceTime
    ? referenceTime - new Date(normalizedLatestSync).getTime() < 10 * 60 * 1000
    : false;

  const stats = [
    {
      label: 'Receivables',
      value: formatMoney(totalReceivables),
      icon: Stack,
      accent: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Open invoices',
      value: openInvoices.toString(),
      icon: FileText,
      accent: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Customers',
      value: customers.length.toString(),
      icon: Users,
      accent: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Products',
      value: products.length.toString(),
      icon: Package,
      accent: 'text-zinc-600 dark:text-zinc-400',
    },
  ];

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SageBridge</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Universal Construction</p>
        </div>
        <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
          <div className={`flex items-center justify-end gap-1.5 font-medium ${syncIsFresh ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
            <span className={`w-2 h-2 rounded-full ${syncIsFresh ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {syncIsFresh ? 'Sage connected' : 'Sync delayed'}
          </div>
          <div className="mt-0.5">{latestSync && referenceTime ? `Synced ${formatSyncAge(latestSync, referenceTime)}` : 'Checking sync...'}</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="min-w-0 bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 [container-type:inline-size]"
            >
              <Icon size={20} className={stat.accent} />
              <div className="mt-3 whitespace-nowrap text-[clamp(0.72rem,8cqi,1.5rem)] leading-tight font-bold tabular-nums">{stat.value}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Quick Access */}
      <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
        Quick access
      </h2>
      <div className="space-y-3">
        <QuickLink href="/customers" icon={Users} label="Customers" count={customers.length} />
        <QuickLink href="/invoices" icon={FileText} label="Invoices" count={invoices.length} />
        <QuickLink href="/products" icon={Package} label="Products & Services" count={products.length} />
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
  count,
}: {
  href: string;
  icon: ElementType;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700 active:scale-[0.99] transition-all"
    >
      <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
        <Icon size={22} weight="bold" />
      </div>
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{count} total</div>
      </div>
      <ArrowUpRight size={18} className="text-zinc-300 dark:text-zinc-600" />
    </Link>
  );
}
