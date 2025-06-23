export function formatDate(date: string | Date, locale?: string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  // If locale is provided, use it; otherwise, fallback to default browser locale
  return d.toLocaleDateString(locale);
}

// Usage examples:
// formatDate('2024-06-01')                // legacy: browser default
// formatDate('2024-06-01', 'fr-FR')       // analytics: French format
// formatDate(new Date(), 'en-US')         // US format