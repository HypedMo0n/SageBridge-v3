import { api } from '@/lib/api';
import { formatMoney, formatDate, getStatusColor } from '@/lib/utils';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const invoice = await api.getInvoice(params.id);
  
  if (!invoice) {
    notFound();
  }

  const customer = await api.getCustomer(invoice.customerSageId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link
            href="/invoices"
            className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-2 inline-block"
          >
            ← Back to Invoices
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                Invoice {invoice.invoiceNumber}
              </h1>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(invoice.status)}`}>
                {invoice.status}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Invoice Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Customer</div>
              {customer ? (
                <Link
                  href={`/customers/${customer.sageId}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  {invoice.customerName}
                </Link>
              ) : (
                <div className="text-gray-900 dark:text-white font-medium">{invoice.customerName}</div>
              )}
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Date</div>
              <div className="text-gray-900 dark:text-white font-medium">{formatDate(invoice.date)}</div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              ℹ️ Line items coming soon - currently showing totals only
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="text-gray-900 dark:text-white font-medium">{formatMoney(invoice.total)}</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex justify-between text-xl font-bold">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="text-gray-900 dark:text-white">{formatMoney(invoice.total)}</span>
                </div>
              </div>
              {invoice.balance > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div className="flex justify-between text-xl font-bold">
                    <span className="text-gray-900 dark:text-white">Balance Due</span>
                    <span className="text-red-600 dark:text-red-400">{formatMoney(invoice.balance)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            disabled
            className="bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 py-3 rounded-lg font-medium cursor-not-allowed"
          >
            📄 Download PDF (Soon)
          </button>
          <button
            disabled
            className="bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 py-3 rounded-lg font-medium cursor-not-allowed"
          >
            ✉ Email Invoice (Soon)
          </button>
        </div>
      </div>
    </div>
  );
}
