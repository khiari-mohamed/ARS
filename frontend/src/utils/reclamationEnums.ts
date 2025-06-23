export const RECLAMATION_TYPES = [
  'retard',
  'document manquant',
  'erreur traitement',
  'autre',
] as const;

export const RECLAMATION_SEVERITIES = [
  'low',
  'medium',
  'critical',
] as const;

export const RECLAMATION_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'ESCALATED',
  'PENDING_CLIENT_REPLY',
  'RESOLVED',
  'CLOSED',
] as const;

export const getStatusLabel = (status: string) => {
  switch (status) {
    case 'OPEN':
      return 'En cours';
    case 'IN_PROGRESS':
      return 'Traitement';
    case 'ESCALATED':
      return 'Escaladée';
    case 'PENDING_CLIENT_REPLY':
      return 'Attente client';
    case 'RESOLVED':
      return 'Résolue';
    case 'CLOSED':
      return 'Clôturée';
    default:
      return status;
  }
};

export const getSeverityLabel = (severity: string) => {
  switch (severity) {
    case 'low':
      return 'Faible';
    case 'medium':
      return 'Moyenne';
    case 'critical':
      return 'Critique';
    default:
      return severity;
  }
};