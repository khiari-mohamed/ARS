export const alertLevelColor = (level: 'green' | 'orange' | 'red'): string => {
  switch (level) {
    case 'red':
      return '#f44336';
    case 'orange':
      return '#ff9800';
    case 'green':
      return '#4caf50';
    default:
      return '#9e9e9e';
  }
};

export const alertLevelLabel = (level: 'green' | 'orange' | 'red'): string => {
  switch (level) {
    case 'red':
      return 'Critique';
    case 'orange':
      return 'Attention';
    case 'green':
      return 'Normal';
    default:
      return 'Inconnu';
  }
};

export const alertLevelIcon = (level: 'green' | 'orange' | 'red'): string => {
  switch (level) {
    case 'red':
      return '🔴';
    case 'orange':
      return '🟠';
    case 'green':
      return '🟢';
    default:
      return '⚪';
  }
};

export const formatAlertAge = (createdAt: string): string => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `${diffHours} heure${diffHours > 1 ? 's' : ''}`;
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  }
};

export const getSLAStatusColor = (daysSinceReception: number, slaThreshold: number): string => {
  if (daysSinceReception > slaThreshold) {
    return '#f44336'; // Red - SLA breach
  } else if (daysSinceReception > slaThreshold * 0.8) {
    return '#ff9800'; // Orange - Warning
  } else {
    return '#4caf50'; // Green - On track
  }
};

export const formatSLAStatus = (daysSinceReception: number, slaThreshold: number): string => {
  const daysLeft = slaThreshold - daysSinceReception;
  
  if (daysLeft < 0) {
    return `${Math.abs(daysLeft)} jour${Math.abs(daysLeft) > 1 ? 's' : ''} de retard`;
  } else if (daysLeft === 0) {
    return 'Échéance aujourd\'hui';
  } else {
    return `${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}`;
  }
};

export const getAlertPriority = (alert: any): number => {
  let priority = 0;
  
  // Alert level priority
  switch (alert.alertLevel) {
    case 'red':
      priority += 100;
      break;
    case 'orange':
      priority += 50;
      break;
    case 'green':
      priority += 10;
      break;
  }
  
  // AI score priority
  if (alert.aiScore) {
    priority += alert.aiScore * 20;
  }
  
  // SLA urgency
  if (alert.daysSinceReception && alert.slaThreshold) {
    const slaRatio = alert.daysSinceReception / alert.slaThreshold;
    if (slaRatio > 1) {
      priority += (slaRatio - 1) * 30;
    }
  }
  
  return priority;
};

export const sortAlertsByPriority = (alerts: any[]): any[] => {
  return alerts.sort((a, b) => getAlertPriority(b) - getAlertPriority(a));
};

export const filterAlertsByLevel = (alerts: any[], level?: string): any[] => {
  if (!level) return alerts;
  return alerts.filter(alert => alert.alertLevel === level);
};

export const groupAlertsByType = (alerts: any[]): { [key: string]: any[] } => {
  return alerts.reduce((groups, alert) => {
    const type = alert.alertType || 'GENERIC';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(alert);
    return groups;
  }, {});
};

export const calculateAlertStats = (alerts: any[]) => {
  const total = alerts.length;
  const critical = alerts.filter(a => a.alertLevel === 'red').length;
  const warning = alerts.filter(a => a.alertLevel === 'orange').length;
  const normal = alerts.filter(a => a.alertLevel === 'green').length;
  
  return {
    total,
    critical,
    warning,
    normal,
    criticalPercentage: total > 0 ? Math.round((critical / total) * 100) : 0,
    warningPercentage: total > 0 ? Math.round((warning / total) * 100) : 0,
    normalPercentage: total > 0 ? Math.round((normal / total) * 100) : 0
  };
};