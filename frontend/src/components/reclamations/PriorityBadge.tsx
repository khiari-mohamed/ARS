import React from 'react';
import { ReclamationSeverity } from '../../types/reclamation.d';

const severityMap: Record<ReclamationSeverity, string> = {
  low: 'Faible',
  medium: 'Moyenne',
  critical: 'Critique',
};

export const PriorityBadge: React.FC<{ severity: ReclamationSeverity }> = ({ severity }) => {
  const label = severityMap[severity] || severity;
  return (
    <span className={`priority-badge ${severity}`}>
      {label}
    </span>
  );
};