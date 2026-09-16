'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ArrowLeft, CheckCircle, SpinnerGap } from '@phosphor-icons/react';

type WriteStage = 'idle' | 'queued' | 'processing' | 'refreshing' | 'done';

const WRITE_STEPS: Array<{ key: Exclude<WriteStage, 'idle'>; label: string }> = [
  { key: 'queued', label: 'Queued' },
  { key: 'processing', label: 'Creating' },
  { key: 'refreshing', label: 'Refreshing' },
  { key: 'done', label: 'Ready' },
];

function WriteProgress({ stage }: { stage: WriteStage }) {
  const current = WRITE_STEPS.findIndex((step) => step.key === stage);
  const progress = current < 0 ? 0 : ((current + 1) / WRITE_STEPS.length) * 100;

  return (
    <div className="mb-5" aria-label={`Creation progress: ${WRITE_STEPS[current]?.label || 'Starting'}`}>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-500" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1">
        {WRITE_STEPS.map((step, index) => (
          <span key={step.key} className={`text-[11px] ${index <= current ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-zinc-400'}`}>
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function NewCustomerPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [jobStatus, setJobStatus] = useState('');
  const [stage, setStage] = useState<WriteStage>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    setJobStatus('Creating job...');
    setStage('queued');

    try {
      const { jobId } = await api.createCustomer(formData);
      setJobStatus('Sent securely to the connector');
      await pollJobStatus(jobId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
      setIsSubmitting(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    let attempts = 0;
    const maxAttempts = 40;

    const poll = async () => {
      try {
        const status = await api.getJobStatus(jobId);

        if (status.status === 'pending') {
          setStage('queued');
          setJobStatus('Waiting for the SageBridge connector');
        } else if (status.status === 'claimed' || status.status === 'running') {
          setStage('processing');
          setJobStatus('Sage 50 is creating the customer');
        } else if (status.status === 'succeeded') {
          const resourceId = status.resource?.id;
          setStage('refreshing');
          setJobStatus('Created. Refreshing the customer profile');

          if (resourceId) {
            for (let readAttempt = 0; readAttempt < 15; readAttempt++) {
              const customer = await api.getCustomer(resourceId);
              if (customer) {
                setStage('done');
                setJobStatus('Customer created in Sage 50');
                setTimeout(() => router.replace(`/customers/${customer.sageId}`), 700);
                return;
              }
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          }

          setStage('done');
          setJobStatus('Customer created. Opening customers');
          setTimeout(() => router.replace('/customers'), 700);
          return;
        } else if (status.status === 'failed') {
          setError(status.error || 'Creation failed in Sage 50');
          setIsSubmitting(false);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000);
        } else {
          setError('Timed out waiting for Sage 50. Check the connector.');
          setIsSubmitting(false);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to check job status');
        setIsSubmitting(false);
      }
    };

    await poll();
  };

  const inputClass =
    'w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-sm outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-transparent disabled:opacity-50 transition-shadow';

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 mb-4"
      >
        <ArrowLeft size={16} />
        Customers
      </Link>

      <h1 className="text-2xl font-bold tracking-tight mb-5">New customer</h1>

      {stage !== 'idle' && <WriteProgress stage={stage} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm border border-red-200 dark:border-red-900">
            {error}
            <Link href="/help/customer-creation-failed" className="mt-2 inline-block underline">Get help with this</Link>
          </div>
        )}

        {jobStatus && !error && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm border border-emerald-200 dark:border-emerald-900">
            {stage !== 'done' ? (
              <SpinnerGap size={18} className="animate-spin shrink-0" />
            ) : (
              <CheckCircle size={18} weight="fill" className="shrink-0" />
            )}
            {jobStatus}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Customer name
          </label>
          <input
            type="text"
            required
            disabled={isSubmitting}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={inputClass}
            placeholder="ABC Construction"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Email
          </label>
          <input
            type="email"
            disabled={isSubmitting}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={inputClass}
            placeholder="office@abcconstruction.ca"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Phone
          </label>
          <input
            type="tel"
            disabled={isSubmitting}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className={inputClass}
            placeholder="(604) 555-0100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Address
          </label>
          <input
            type="text"
            disabled={isSubmitting}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className={inputClass}
            placeholder="123 Main St, Vancouver, BC"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !formData.name.trim()}
            className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create customer'}
          </button>
          {!isSubmitting && (
            <Link
              href="/customers"
              className="h-12 px-5 flex items-center bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl font-medium text-zinc-700 dark:text-zinc-200 transition-colors"
            >
              Cancel
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
