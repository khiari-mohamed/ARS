import React from 'react';
import { VirementStatus } from '../../types/finance';

const VirementStatusTag: React.FC<{ status: VirementStatus }> = ({ status }) => (
  <span
    className={
      status === 'EXECUTE'
        ? 'status-badge confirmed'
        : 'status-badge pending'
    }
  >
    {status === 'EXECUTE' ? 'Exécuté' : status}
  </span>
);

export default VirementStatusTag;