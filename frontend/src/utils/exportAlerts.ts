import { alertLevelLabel } from './alertUtils';

export const exportAlertsToCSV = (alerts: any[]) => {
  const headers = [
    'ID Bordereau',
    'Type d\'Alerte',
    'Niveau',
    'Raison',
    'Statut',
    'Client',
    'Équipe',
    'Assigné à',
    'Date Création',
    'Date Réception',
    'Jours Écoulés'
  ];

  const csvContent = [
    headers.join(','),
    ...alerts.map(alert => {
      const daysSince = alert.bordereau.dateReception 
        ? Math.round((new Date().getTime() - new Date(alert.bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return [
        alert.bordereau.id,
        alert.alertType || 'N/A',
        alertLevelLabel(alert.alertLevel),
        `"${alert.reason.replace(/"/g, '""')}"`,
        alert.bordereau.statut,
        alert.bordereau.clientId || 'N/A',
        alert.bordereau.teamId || 'N/A',
        alert.assignedTo?.fullName || 'Non assigné',
        new Date(alert.bordereau.createdAt).toLocaleDateString(),
        alert.bordereau.dateReception ? new Date(alert.bordereau.dateReception).toLocaleDateString() : 'N/A',
        daysSince
      ].join(',');
    })
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `alertes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};