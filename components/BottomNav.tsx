'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  ChartBar,
  Users,
  FileText,
  Package,
  Plus,
  UserPlus,
  Receipt,
  CurrencyDollar,
  X,
} from '@phosphor-icons/react';

const NAV_LEFT = [
  { href: '/dashboard', label: 'Overview', icon: ChartBar },
  { href: '/customers', label: 'Customers', icon: Users },
];
const NAV_RIGHT = [
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/products', label: 'Products', icon: Package },
];

const QUICK_ACTIONS = [
  { href: '/customers/new', label: 'New Customer', desc: 'Add a customer to Sage', icon: UserPlus, active: true },
  { href: '#', label: 'New Invoice', desc: 'Coming soon', icon: Receipt, active: false },
  { href: '#', label: 'Record Payment', desc: 'Coming soon', icon: CurrencyDollar, active: false },
];

export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <>
      {/* Quick Actions Sheet */}
      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Sheet */}
          <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl p-6 pb-8 shadow-2xl animate-slide-up">
            {/* Handle */}
            <div className="mx-auto mb-6 h-1.5 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Create new</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                const content = (
                  <>
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                        action.active
                          ? 'bg-emerald-600 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      <Icon size={22} weight="bold" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {action.label}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {action.desc}
                      </div>
                    </div>
                  </>
                );

                if (!action.active) {
                  return (
                    <button
                      key={action.label}
                      disabled
                      className="w-full flex items-center gap-4 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 opacity-60"
                    >
                      {content}
                    </button>
                  );
                }
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    onClick={() => setOpen(false)}
                    className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30">
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800">
          <div className="max-w-md mx-auto px-6">
            <div className="grid grid-cols-5 items-center h-[68px]">
              {NAV_LEFT.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex flex-col items-center gap-0.5 py-2 transition-colors ${
                      active ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                    }`}
                  >
                    <Icon size={22} weight={active ? 'fill' : 'regular'} />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </Link>
                );
              })}

              {/* Center FAB */}
              <div className="flex justify-center">
                <button
                  onClick={() => setOpen(true)}
                  aria-label="Create new"
                  className={`w-14 h-14 -mt-6 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
                    open
                      ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rotate-45'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                  }`}
                >
                  <Plus size={26} weight="bold" />
                </button>
              </div>

              {NAV_RIGHT.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex flex-col items-center gap-0.5 py-2 transition-colors ${
                      active ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                    }`}
                  >
                    <Icon size={22} weight={active ? 'fill' : 'regular'} />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
        {/* Safe area for iOS */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl h-5" />
      </nav>
    </>
  );
}
