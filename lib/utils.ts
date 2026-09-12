export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
}

/** Whole-dollar currency, for compact business-summary figures (no cents). */
export function formatMoneyWhole(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

/**
 * "5 min ago", "2 hr ago", "3 days ago" - for a real synchronization
 * timestamp only. Never call this with a manufactured/guessed time.
 */
export function formatRelativeTime(date: Date, now: number = Date.now()): string {
  const ms = Math.max(0, now - date.getTime());
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatPhoneNumber(phone: string | null): string {
  if (!phone) return 'No phone';
  
  // Simple Canadian phone number formatting
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export function getStatusColor(status: string): string {
  const statusLower = status.toLowerCase();
  
  if (statusLower === 'paid' || statusLower === 'active') {
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  }
  
  if (statusLower === 'unpaid' || statusLower === 'pending') {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  }
  
  if (statusLower === 'overdue' || statusLower === 'inactive') {
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  }
  
  return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
}
