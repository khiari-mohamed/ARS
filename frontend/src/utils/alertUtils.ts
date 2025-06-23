import { AlertLevel } from '../types/alerts.d';

export const alertLevelColor = (level: AlertLevel): string => {
  switch (level) {
    case 'red':
      return '#ff4d4f';
    case 'orange':
      return '#faad14';
    case 'green':
      return '#52c41a';
    default:
      return '#d9d9d9';
  }
};

export const alertLevelLabel = (level: AlertLevel): string => {
  switch (level) {
    case 'red':
      return 'Critique';
    case 'orange':
      return 'Alerte';
    case 'green':
      return 'Normal';
    default:
      return 'Inconnu';
  }
};