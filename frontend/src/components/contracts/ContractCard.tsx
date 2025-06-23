import React from 'react';
import { Contract } from '../../types/ContractType';
import { getContractStatus } from '../../utils/contractStatus';

interface Props {
  contracts: Contract[];
}

const ContractCard: React.FC<Props> = ({ contracts }) => {
  const safeContracts = Array.isArray(contracts) ? contracts : [];
  const stats = safeContracts.reduce(
    (acc, c) => {
      const status = getContractStatus(c.startDate, c.endDate);
      acc[status]++;
      return acc;
    },
    { future: 0, active: 0, expired: 0 }
  );
  return (
    <div style={{ display: 'flex', gap: 16, margin: '16px 0' }}>
      <div style={{ background: '#e0f7fa', padding: 16, borderRadius: 8 }}>
        <b>Active</b>
        <div>{stats.active}</div>
      </div>
      <div style={{ background: '#e3f2fd', padding: 16, borderRadius: 8 }}>
        <b>Future</b>
        <div>{stats.future}</div>
      </div>
      <div style={{ background: '#ffebee', padding: 16, borderRadius: 8 }}>
        <b>Expired</b>
        <div>{stats.expired}</div>
      </div>
    </div>
  );
};

export default ContractCard;