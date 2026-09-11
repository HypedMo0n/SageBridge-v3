'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

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
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    setJobStatus('Creating job...');

    try {
      // Create customer job
      const { jobId: newJobId } = await api.createCustomer(formData);
      setJobId(newJobId);
      setJobStatus('✓ Job created, sending to connector...');

      // Poll for completion
      await pollJobStatus(newJobId);
    } catch (err: any) {
      setError(err.message || 'Failed to create customer');
      setIsSubmitting(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    let attempts = 0;
    const maxAttempts = 40; // 40 * 3 seconds = 2 minutes max

    const poll = async () => {
      try {
        const status = await api.getJobStatus(jobId);
        
        if (status.status === 'pending') {
          setJobStatus('⏳ Waiting for connector...');
        } else if (status.status === 'processing') {
          setJobStatus('🔄 Creating in Sage 50...');
        } else if (status.status === 'succeeded') {
          setJobStatus(`✓ Customer created! (Sage ID: ${status.resource?.id})`);
          
          // Wait a moment, then redirect
          setTimeout(() => {
            router.push('/customers');
            router.refresh();
          }, 1500);
          return;
        } else if (status.status === 'failed') {
          setError(status.error || 'Creation failed in Sage 50');
          setIsSubmitting(false);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000); // Poll every 3 seconds
        } else {
          setError('Timeout waiting for creation to complete');
          setIsSubmitting(false);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to check job status');
        setIsSubmitting(false);
      }
    };

    await poll();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link
            href="/customers"
            className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-2 inline-block"
          >
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            New Customer
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          {error && (
            <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg">
              {error}
            </div>
          )}

          {jobStatus && !error && (
            <div className="mb-6 p-4 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-lg">
              {jobStatus}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Customer Name *
              </label>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:opacity-50"
                placeholder="ABC Construction"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                disabled={isSubmitting}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:opacity-50"
                placeholder="contact@abcconstruction.ca"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone
              </label>
              <input
                type="tel"
                disabled={isSubmitting}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:opacity-50"
                placeholder="(604) 555-0100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Address
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:opacity-50"
                placeholder="123 Main St, Vancouver, BC"
              />
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button
              type="submit"
              disabled={isSubmitting || !formData.name}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Customer'}
            </button>
            {!isSubmitting && (
              <Link
                href="/customers"
                className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white py-3 rounded-lg font-medium transition-colors text-center"
              >
                Cancel
              </Link>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
