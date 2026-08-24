import { ClipboardList, Globe, Receipt, Users, Wallet, Wrench, type LucideIcon } from 'lucide-react';

export interface StarterTemplate {
  id: string;
  icon: LucideIcon;
  name: string;
  description: string;
}

// Starter ideas only — there is no template engine, so every card just opens the
// New-Project flow. Never imply a template is applied automatically. This list
// is the single source used by both HomeScreen and TemplatesScreen.
export const STARTER_TEMPLATES: StarterTemplate[] = [
  { id: 'task-dashboard', icon: ClipboardList, name: 'Task dashboard', description: 'Track tasks, due dates and progress for your team.' },
  { id: 'invoicing-app', icon: Receipt, name: 'Invoicing app', description: 'Send invoices and track payments for your business.' },
  { id: 'portfolio-site', icon: Globe, name: 'Portfolio site', description: 'Show off your work with a personal site.' },
  { id: 'internal-tool', icon: Wrench, name: 'Internal tool', description: 'A tool for your team\'s daily workflow.' },
  { id: 'expense-tracker', icon: Wallet, name: 'Expense tracker', description: 'Log spending and see where your money goes.' },
  { id: 'customer-list', icon: Users, name: 'Customer list', description: 'Keep track of customers and conversations.' },
];
