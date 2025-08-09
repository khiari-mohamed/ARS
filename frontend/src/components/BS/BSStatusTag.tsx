import { Tag } from 'antd';
import React from 'react';
import { BSStatus } from '../../types/bs';

const statusMap: Record<BSStatus, { color: string; label: string }> = {
  IN_PROGRESS: { color: 'processing', label: 'En cours' },
  VALIDATED: { color: 'success', label: 'Validé' },
  REJECTED: { color: 'error', label: 'Rejeté' },
  EN_COURS: { color: 'processing', label: 'En cours' },
  EN_DIFFICULTE: { color: 'warning', label: 'En difficulté' },
  CLOTURE: { color: 'default', label: 'Clôturé' },
  DELETED: { color: 'default', label: 'Supprimé' },
};

export const BSStatusTag: React.FC<{ status: BSStatus }> = ({ status }) => {
  const s = statusMap[status] || { color: 'default', label: status };
  return <Tag color={s.color}>{s.label}</Tag>;
};
