import Link from 'next/link';
import type { Customer } from '@/lib/api';
import { formatMoney, formatPhoneNumber, getStatusColor } from '@/lib/utils';

interface CustomerCardProps {
  customer: Customer;
}

export function CustomerCard({ customer }: CustomerCardProps) {
  return (
    <Link
      href={`/customers/${customer.sageId}`}
      className="block bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {customer.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {customer.email || 'No email'}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(customer.status)}`}>
          {customer.status}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
        <span>📞 {formatPhoneNumber(customer.phone)}</span>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
        <div>
          <div className={`text-2xl font-bold ${customer.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {formatMoney(customer.balance)}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {customer.balance > 0 ? 'Outstanding' : 'Paid in full'}
          </div>
        </div>
        <div className="text-blue-600 dark:text-blue-400 font-medium text-sm">
          View details →
        </div>
      </div>
    </Link>
  );
}
