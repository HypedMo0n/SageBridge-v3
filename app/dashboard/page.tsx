import { api } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [customers, invoices, products] = await Promise.all([
    api.getCustomers(),
    api.getInvoices(),
    api.getProducts(),
  ]);

  const totalReceivables = customers.reduce((sum, c) => sum + c.balance, 0);
  const totalInvoiced = invoices.reduce((sum, i) => sum + i.total, 0);
  const unpaidInvoices = invoices.filter(i => i.status === 'Unpaid').length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">SageBridge</h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Synced</span>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Total Receivables
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {formatMoney(totalReceivables)}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">
              ↑ {customers.length} customers
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Total Invoiced
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {formatMoney(totalInvoiced)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {invoices.length} invoices
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Unpaid Invoices
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {unpaidInvoices}
            </div>
            <div className={`text-sm ${unpaidInvoices > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {unpaidInvoices > 0 ? 'Needs attention' : 'All paid'}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Products
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {products.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              In catalog
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/customers"
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
          >
            <div className="text-4xl mb-3">👥</div>
            <div className="font-semibold text-gray-900 dark:text-white">Customers</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{customers.length} total</div>
          </Link>

          <Link
            href="/invoices"
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
          >
            <div className="text-4xl mb-3">📄</div>
            <div className="font-semibold text-gray-900 dark:text-white">Invoices</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{invoices.length} total</div>
          </Link>

          <Link
            href="/products"
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
          >
            <div className="text-4xl mb-3">📦</div>
            <div className="font-semibold text-gray-900 dark:text-white">Products</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{products.length} items</div>
          </Link>

          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white hover:shadow-lg transition-shadow cursor-pointer">
            <div className="text-4xl mb-3">＋</div>
            <div className="font-semibold">Quick Add</div>
            <div className="text-sm opacity-90">Coming soon</div>
          </div>
        </div>
      </div>
    </div>
  );
}
