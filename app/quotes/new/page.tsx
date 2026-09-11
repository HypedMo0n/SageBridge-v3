'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, type Customer, type Product } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import { ArrowLeft, CheckCircle, MagnifyingGlass, Minus, Plus, SpinnerGap, Trash } from '@phosphor-icons/react';

type QuoteLine = { sku: string; name: string; quantity: number; unitPrice: number };
type Stage = 'idle' | 'queued' | 'processing' | 'done';

export default function NewQuotePage() {
  const router = useRouter();
  const [initialCustomerId] = useState(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('customerId') || '');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<Stage>('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getCustomers(), api.getProducts()])
      .then(([customerRows, productRows]) => { setCustomers(customerRows); setProducts(productRows); })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load Sage data'))
      .finally(() => setLoading(false));
  }, []);

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => !lines.some((line) => line.sku === product.sku) && (!q || product.name.toLowerCase().includes(q) || product.sku.toLowerCase().includes(q))).slice(0, 8);
  }, [products, lines, query]);

  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const addProduct = (product: Product) => {
    setLines((current) => [...current, { sku: product.sku, name: product.name, quantity: 1, unitPrice: product.price }]);
    setQuery('');
  };
  const updateLine = (index: number, patch: Partial<QuoteLine>) => setLines((current) => current.map((line, i) => i === index ? { ...line, ...patch } : line));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(''); setSubmitting(true); setStage('queued'); setMessage('Sending securely to the connector');
    try {
      const { jobId } = await api.createQuote({ customerId, lines: lines.map(({ sku, quantity, unitPrice }) => ({ sku, quantity, unitPrice })) });
      for (let attempt = 0; attempt < 60; attempt++) {
        const job = await api.getJobStatus(jobId);
        if (job.status === 'pending') { setStage('queued'); setMessage('Waiting for the SageBridge connector'); }
        if (job.status === 'processing') { setStage('processing'); setMessage('Sage 50 is creating the quote'); }
        if (job.status === 'failed') throw new Error(job.error || 'Sage 50 rejected the quote');
        if (job.status === 'succeeded') {
          setStage('done'); setMessage(`Quote ${job.resource?.id || ''} created in Sage 50`);
          setTimeout(() => router.replace(customerId ? `/customers/${customerId}` : '/dashboard'), 1200);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      throw new Error('Timed out waiting for Sage 50. Check the connector.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Quote creation failed'); setSubmitting(false); setStage('idle');
    }
  }

  const input = 'h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 dark:border-zinc-800 dark:bg-zinc-900 disabled:opacity-60';

  return (
    <div className="mx-auto max-w-md px-4 py-6 pb-28">
      <Link href={customerId ? `/customers/${customerId}` : '/customers'} className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500"><ArrowLeft size={16} /> Back</Link>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">Sage sales</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">New quote</h1>
      <p className="mt-1 text-sm text-zinc-500">Choose existing Sage items. Sage calculates tax when posted.</p>

      {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
      {stage !== 'idle' && <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">{stage === 'done' ? <CheckCircle size={19} weight="fill" /> : <SpinnerGap size={19} className="animate-spin" />}{message}</div>}

      <form onSubmit={submit} className="mt-6 space-y-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Customer</label>
          <select required disabled={loading || submitting} value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={input}>
            <option value="">Select a customer</option>
            {customers.map((customer) => <option key={customer.sageId} value={customer.sageId}>{customer.name}</option>)}
          </select>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Items</h2><span className="text-xs text-zinc-500">SKU required</span></div>
          <div className="relative"><MagnifyingGlass size={18} className="absolute left-3 top-3 text-zinc-400" /><input disabled={submitting} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products or services" className={`${input} pl-10`} /></div>
          {query && <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">{available.length ? available.map((product) => <button key={product.sku} type="button" onClick={() => addProduct(product)} className="flex w-full items-center justify-between border-b border-zinc-100 px-4 py-3 text-left last:border-0 dark:border-zinc-800"><span><span className="block text-sm font-medium">{product.name}</span><span className="text-xs text-zinc-500">{product.sku}</span></span><span className="text-sm font-semibold">{formatMoney(product.price)}</span></button>) : <p className="p-4 text-sm text-zinc-500">No matching Sage items</p>}</div>}

          <div className="mt-3 space-y-3">
            {lines.length === 0 && <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">Search above to add the first item.</div>}
            {lines.map((line, index) => <div key={line.sku} className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex justify-between gap-3"><div><p className="font-medium">{line.name}</p><p className="text-xs text-zinc-500">{line.sku}</p></div><button type="button" aria-label={`Remove ${line.name}`} onClick={() => setLines((current) => current.filter((_, i) => i !== index))} className="text-zinc-400 hover:text-red-600"><Trash size={18} /></button></div>
              <div className="mt-4 grid grid-cols-[1fr_1.2fr] gap-3"><div><label className="mb-1 block text-xs text-zinc-500">Quantity</label><div className="flex h-11 items-center rounded-xl border border-zinc-200 dark:border-zinc-800"><button type="button" onClick={() => updateLine(index, { quantity: Math.max(0.01, line.quantity - 1) })} className="h-full px-3"><Minus size={14} /></button><input type="number" min="0.01" step="0.01" value={line.quantity} onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })} className="min-w-0 flex-1 bg-transparent text-center text-sm outline-none" /><button type="button" onClick={() => updateLine(index, { quantity: line.quantity + 1 })} className="h-full px-3"><Plus size={14} /></button></div></div><div><label className="mb-1 block text-xs text-zinc-500">Unit price</label><input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(e) => updateLine(index, { unitPrice: Number(e.target.value) })} className={input} /></div></div>
              <p className="mt-3 text-right font-semibold tabular-nums">{formatMoney(line.quantity * line.unitPrice)}</p>
            </div>)}
          </div>
        </section>

        <div className="rounded-2xl bg-zinc-950 p-5 text-white dark:bg-white dark:text-zinc-950"><div className="flex items-center justify-between"><span className="text-sm text-zinc-400 dark:text-zinc-500">Subtotal before Sage tax</span><span className="text-xl font-bold tabular-nums">{formatMoney(subtotal)}</span></div><p className="mt-2 text-xs text-zinc-500">Quote number: QT-YYYYMMDD-NNN, assigned by the connector.</p></div>
        <button type="submit" disabled={submitting || !customerId || lines.length === 0 || lines.some((line) => line.quantity <= 0 || line.unitPrice < 0)} className="h-12 w-full rounded-xl bg-emerald-600 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700">{submitting ? 'Creating quote...' : 'Create quote in Sage 50'}</button>
      </form>
    </div>
  );
}
