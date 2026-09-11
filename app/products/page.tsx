import { api } from '@/lib/api';
import { formatMoney } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const products = await api.getProducts();

  const services = products.filter(p => p.isService);
  const items = products.filter(p => !p.isService);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products & Services</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Services */}
        {services.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Services ({services.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map((product) => (
                <div
                  key={product.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {product.name}
                      </h3>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        SKU: {product.sku}
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Service
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatMoney(product.price)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Products */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Products ({items.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((product) => (
              <div
                key={product.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {product.name}
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      SKU: {product.sku}
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    Product
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatMoney(product.price)}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Price</div>
                  </div>
                  {product.stock !== null && (
                    <div>
                      <div className={`text-2xl font-bold ${
                        product.stock < (product.reorderLevel || 0)
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {product.stock}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">In stock</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <div className="text-gray-600 dark:text-gray-400">No products found</div>
          </div>
        )}
      </div>
    </div>
  );
}
