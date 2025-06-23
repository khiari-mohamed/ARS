import { Virement } from '../types/finance';

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'TND' });
}

export function hasDiscrepancy(v: Virement): boolean {
  if (!v.linkedBordereaux || v.linkedBordereaux.length === 0) return false;
  const sum = v.linkedBordereaux.reduce((acc, b) => acc + b.totalAmount, 0);
  return v.amount !== sum;
}

export function isOverdue(v: Virement, days: number = 7): boolean {
  if (v.status === 'confirmed') return false;
  const virementDate = new Date(v.date);
  const now = new Date();
  const diff = (now.getTime() - virementDate.getTime()) / (1000 * 3600 * 24);
  return diff > days;
}