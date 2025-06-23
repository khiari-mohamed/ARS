import React from 'react';
import { ReclamationStatus, ReclamationSeverity } from '../../types/reclamation.d';

export const StatusBadge: React.FC<{ status: ReclamationStatus }> = ({ status }) => {
  const color =
    status === 'OPEN'
      ? 'bg-blue-100 text-blue-800'
      : status === 'IN_PROGRESS'
      ? 'bg-yellow-100 text-yellow-800'
      : status === 'ESCALATED'
      ? 'bg-red-100 text-red-800'
      : status === 'RESOLVED'
      ? 'bg-green-100 text-green-800'
      : status === 'CLOSED'
      ? 'bg-gray-100 text-gray-800'
      : 'bg-gray-100 text-gray-800';
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

export const PriorityBadge: React.FC<{ severity: ReclamationSeverity }> = ({
  severity,
}) => {
  const color =
    severity === 'critical'
      ? 'bg-red-100 text-red-800'
      : severity === 'medium'
      ? 'bg-orange-100 text-orange-800'
      : 'bg-green-100 text-green-800';
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
};