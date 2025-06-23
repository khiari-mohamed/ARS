import React from 'react';
import { VirementStatus } from '../../types/finance';

const VirementStatusTag: React.FC<{ status: VirementStatus }> = ({ status }) => (
  <span
    className={
      status === 'confirmed'
        ? 'status-badge confirmed'
        : 'status-badge pending'
    }
  >
    {status === 'confirmed' ? 'Confirmé' : 'En attente'}
  </span>
);

export default VirementStatusTag;