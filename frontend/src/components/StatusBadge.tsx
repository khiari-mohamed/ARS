import React from 'react';

// Map backend status codes to display labels and CSS class suffixes
const statusMap: Record<string, { label: string; className: string }> = {
  OPEN: { label: 'Ouverte', className: 'open' },
  IN_PROGRESS: { label: 'En cours', className: 'in-progress' },
  ESCALATED: { label: 'Escaladée', className: 'escalated' },
  PENDING_CLIENT_REPLY: { label: 'En attente client', className: 'pending' },
  RESOLVED: { label: 'Résolue', className: 'closed' },
  CLOSED: { label: 'Fermée', className: 'closed' },
  REVIEW: { label: 'À revoir', className: 'review' },
  // fallback for legacy or unknown statuses
  breached: { label: 'Breached', className: 'escalated' },
  green: { label: 'Within deadline', className: 'open' },
  orange: { label: 'At risk', className: 'pending' },
  red: { label: 'Breached', className: 'escalated' },
};

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const info = statusMap[status] || { label: status, className: 'review' };
  return (
    <span className={`status-badge ${info.className}`}>
      {info.label}
    </span>
  );
};

export default StatusBadge;