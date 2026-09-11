'use client';

import { useState, useEffect, useMemo } from 'react';
import { api, type Product } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import { SearchBar } from '@/components/SearchBar';
import { Package, Wrench } from '@phosphor-icons/react';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api
      .getProducts()
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }, [products, query]);

  const services = filtered.filter((p) => p.isService);
  const items = filtered.filter((p) => !p.isService);

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight mb-4">Products &amp; Services</h1>
      <SearchBar
        placeholder="Search name or SKU..."
        value={query}
        onChange={setQuery}
      />

      <div className="mt-5 space-y-6">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package size={40} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
            <p className="text-zinc-500 dark:text-zinc-400">
              {query ? 'No products match your search.' : 'No products yet.'}
            </p>
          </div>
        ) : (
          <>
            {services.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
                  Services ({services.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services.map((product) => (
                    <ProductCard key={product.id} product={product} isService />
                  ))}
                </div>
              </section>
            )}
            {items.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
                  Products ({items.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product, isService = false }: { product: Product; isService?: boolean }) {
  const lowStock = product.stock !== null && product.reorderLevel !== null && product.stock < product.reorderLevel;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isService
              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
          }`}
        >
          {isService ? <Wrench size={20} weight="bold" /> : <Package size={20} weight="bold" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{product.name}</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{product.sku}</p>
        </div>
      </div>

      <div className="flex items-end justify-between mt-3">
        <div className="text-lg font-bold tabular-nums">{formatMoney(product.price)}</div>
        {product.stock !== null && !isService && (
          <div
            className={`text-sm font-medium tabular-nums ${
              lowStock ? 'text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            {product.stock} in stock
          </div>
        )}
      </div>
    </div>
  );
}
