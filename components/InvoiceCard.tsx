import Link from 'next/link';
import type { Invoice } from '@/lib/api';
import { formatMoney, formatDate, getStatusColor } from '@/lib/utils';

interface InvoiceCardProps {
  invoice: Invoice;
}

export function InvoiceCard({ invoice }: InvoiceCardProps) {
  return (
    <Link
      href={`/invoices/${invoice.invoiceNumber}`}
      className="block bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {invoice.invoiceNumber}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {invoice.customerName}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(invoice.status)}`}>
          {invoice.status}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
        <span>📅 {formatDate(invoice.date)}</span>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex gap-6">
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatMoney(invoice.total)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
          </div>
          {invoice.balance > 0 && (
            <div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatMoney(invoice.balance)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Due</div>
            </div>
          )}
        </div>
        <div className="text-blue-600 dark:text-blue-400 font-medium text-sm">
          View →
        </div>
      </div>
    </Link>
  );
}
