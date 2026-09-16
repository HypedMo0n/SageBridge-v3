import type { CategoryId, HelpCategory } from './types';

export const CATEGORIES: HelpCategory[] = [
  { id: 'getting-started', label: 'Getting Started', description: 'Install SageBridge and connect your first Sage 50 company.' },
  { id: 'using-sagebridge', label: 'Using SageBridge', description: 'Customers, invoices, quotes, and the rest of the app.' },
  { id: 'connector-sync', label: 'Connector & Sync', description: 'How the desktop connector keeps SageBridge up to date.' },
  { id: 'troubleshooting', label: 'Troubleshooting', description: 'Fix the most common connection and sync problems.' },
  { id: 'security-privacy', label: 'Security & Privacy', description: 'What SageBridge can see, and how your data is protected.' },
];

export function categoryLabel(id: CategoryId): string {
  return CATEGORIES.find((c) => c.id === id)?.label || id;
}
