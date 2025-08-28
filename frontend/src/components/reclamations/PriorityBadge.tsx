import React from 'react';
import { ReclamationSeverity } from '../../types/reclamation.d';

const severityMap: Record<ReclamationSeverity, string> = {
  low: 'Faible',
  medium: 'Moyenne',
  critical: 'Critique',
};

const severityColors: Record<ReclamationSeverity, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  critical: 'bg-red-100 text-red-800',
};

export const PriorityBadge: React.FC<{ severity: ReclamationSeverity }> = ({ severity }) => {
  const label = severityMap[severity] || severity;
  const color = severityColors[severity] || 'bg-gray-100 text-gray-800';
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
};