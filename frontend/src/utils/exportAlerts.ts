import { Alert } from '../types/alerts.d';

export function exportAlertsToCSV(alerts: Alert[], filename = 'alerts.csv') {
  const headers = ['ID', 'Date réception', 'Statut', 'Equipe', 'Niveau', 'Raison'];
  const rows = alerts.map(a => [
    a.bordereau.id,
    a.bordereau.dateReception || '',
    a.bordereau.statut,
    a.bordereau.teamId,
    a.alertLevel,
    a.reason,
  ]);
  const csvContent =
    [headers, ...rows]
      .map(row => row.map(String).map(s => `"${s.replace(/"/g, '""')}"`).join(','))
      .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}