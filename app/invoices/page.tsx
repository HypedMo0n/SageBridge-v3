import { api } from '@/lib/api';
import { InvoiceCard } from '@/components/InvoiceCard';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  const invoices = await api.getInvoices();

  const unpaid = invoices.filter(i => i.status === 'Unpaid');
  const paid = invoices.filter(i => i.status === 'Paid');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Unpaid Section */}
        {unpaid.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Unpaid ({unpaid.length})
            </h2>
            <div className="grid gap-4">
              {unpaid.map((invoice) => (
                <InvoiceCard key={invoice.id} invoice={invoice} />
              ))}
            </div>
          </div>
        )}

        {/* Paid Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Paid ({paid.length})
          </h2>
          <div className="grid gap-4">
            {paid.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))}
          </div>
        </div>

        {invoices.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📄</div>
            <div className="text-gray-600 dark:text-gray-400">No invoices found</div>
          </div>
        )}
      </div>
    </div>
  );
}
