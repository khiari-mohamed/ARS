import React from 'react';
import { ReclamationStatus } from '../../types/reclamation.d';

const statusMap: Record<ReclamationStatus, { label: string; color: string }> = {
  OPEN: { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
  IN_PROGRESS: { label: 'Traitement', color: 'bg-yellow-100 text-yellow-800' },
  ESCALATED: { label: 'Escaladée', color: 'bg-red-100 text-red-800' },
  PENDING_CLIENT_REPLY: { label: 'Attente client', color: 'bg-orange-100 text-orange-800' },
  RESOLVED: { label: 'Résolue', color: 'bg-green-100 text-green-800' },
  CLOSED: { label: 'Clôturée', color: 'bg-gray-100 text-gray-800' },
};

export const StatusBadge: React.FC<{ status: ReclamationStatus }> = ({ status }) => {
  const { label, color } = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
};