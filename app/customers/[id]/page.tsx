import { api } from '@/lib/api';
import { formatMoney, formatPhoneNumber, getStatusColor } from '@/lib/utils';
import { InvoiceCard } from '@/components/InvoiceCard';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const customer = await api.getCustomer(params.id);
  
  if (!customer) {
    notFound();
  }

  const invoices = await api.getCustomerInvoices(customer.sageId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link
            href="/customers"
            className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-2 inline-block"
          >
            ← Back to Customers
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {customer.name}
              </h1>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(customer.status)}`}>
                {customer.status}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Balance Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Outstanding Balance
          </div>
          <div className={`text-4xl font-bold mb-4 ${customer.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {formatMoney(customer.balance)}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <a
              href={`tel:${customer.phone}`}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
            >
              📞 Call
            </a>
            <a
              href={`mailto:${customer.email}`}
              className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-medium transition-colors"
            >
              ✉ Email
            </a>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Contact Information
          </h2>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Email</div>
              <div className="text-gray-900 dark:text-white">{customer.email || 'Not provided'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Phone</div>
              <div className="text-gray-900 dark:text-white">{formatPhoneNumber(customer.phone)}</div>
            </div>
            {customer.address && (
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Address</div>
                <div className="text-gray-900 dark:text-white">
                  {customer.address}
                  {customer.city && `, ${customer.city}`}
                  {customer.province && `, ${customer.province}`}
                  {customer.postalCode && ` ${customer.postalCode}`}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Invoices */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Invoices ({invoices.length})
            </h2>
            <button
              disabled
              className="bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-4 py-2 rounded-lg font-medium cursor-not-allowed"
            >
              + Create Invoice (Soon)
            </button>
          </div>

          <div className="grid gap-4">
            {invoices.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))}
          </div>

          {invoices.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="text-6xl mb-4">📄</div>
              <div className="text-gray-600 dark:text-gray-400">No invoices yet</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
