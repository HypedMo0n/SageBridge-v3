'use client';

import { useState, useEffect, useMemo } from 'react';
import { api, type Customer } from '@/lib/api';
import { CustomerCard } from '@/components/CustomerCard';
import { SearchBar } from '@/components/SearchBar';
import { Users } from '@phosphor-icons/react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api
      .getCustomers()
      .then(setCustomers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
    );
  }, [customers, query]);

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight mb-4">Customers</h1>
      <SearchBar
        placeholder="Search name, email, phone..."
        value={query}
        onChange={setQuery}
      />

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-36 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse"
              />
            ))}
          </div>
        ) : !query.trim() ? (
          <div className="text-center py-16">
            <Users size={40} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
            <p className="font-medium text-zinc-700 dark:text-zinc-200">Find a customer</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Search {customers.length} customers by name, email, or phone.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
            <p className="text-zinc-500 dark:text-zinc-400">No customers match your search.</p>
          </div>
        ) : (
          filtered.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))
        )}
      </div>
    </div>
  );
}
