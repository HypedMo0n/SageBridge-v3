import { api } from '@/lib/api';
import { CustomerCard } from '@/components/CustomerCard';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const customers = await api.getCustomers();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
            <Link
              href="/customers/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              + New
            </Link>
          </div>
        </div>
      </header>

      {/* Customer List */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid gap-4">
          {customers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>

        {customers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <div className="text-gray-600 dark:text-gray-400">No customers found</div>
          </div>
        )}
      </div>
    </div>
  );
}
