import React from 'react';
import { Contract } from '../../types/ContractType';
import { getContractStatus } from '../../utils/contractStatus';
import { formatDate } from '../../utils/formatDate';

interface Props {
  contracts: Contract[];
  loading: boolean;
  onEdit: (contract: Contract) => void;
  onDelete: (id: string) => void;
  onHistory: (contract: Contract) => void;
  onPreview: (contract: Contract) => void;
  onView: (contract: Contract) => void;
  user: any;
}

const statusColor = {
  future: 'blue',
  active: 'green',
  expired: 'red',
};

const ContractTable: React.FC<Props> = ({ contracts, loading, onEdit, onDelete, onHistory, onPreview, onView, user }) => (
  <table>
    <thead>
      <tr>
        <th>Client</th>
        <th>Start</th>
        <th>End</th>
        <th>Status</th>
        <th>Manager</th>
        <th>Document</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {loading ? (
        <tr><td colSpan={7}>Loading...</td></tr>
      ) : contracts.length === 0 ? (
        <tr><td colSpan={7}>No contracts found.</td></tr>
      ) : contracts.map(contract => {
        const status = getContractStatus(contract.startDate, contract.endDate);
        return (
          <tr key={contract.id}>
            <td>
              <span 
                style={{ cursor: 'pointer', color: '#1976d2', textDecoration: 'underline' }}
                onClick={() => onView(contract)}
                title="Cliquer pour voir les détails"
              >
                {contract.clientName}
              </span>
            </td>
            <td>{formatDate(contract.startDate)}</td>
            <td>{formatDate(contract.endDate)}</td>
            <td style={{ color: statusColor[status] }}>{status.toUpperCase()}</td>
            <td>
              {contract.assignedManager?.fullName ? (
                <span title={contract.assignedManager.email}>{contract.assignedManager.fullName}</span>
              ) : (
                <span title="Manager ID">{contract.assignedManagerId}</span>
              )}
            </td>
            <td>
              {contract.documentPath && (
                <>
                  <a 
                    href={contract.documentPath} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    download
                    title={contract.documentPath.split('/').pop() || 'Download document'}
                  >
                    Download
                  </a>
                  <button style={{ marginLeft: 8 }} onClick={() => onPreview(contract)}>Preview</button>
                </>
              )}
            </td>
            <td>
              {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.id === contract.assignedManagerId) && (
                <>
                  <button onClick={() => onView(contract)}>View</button>
                  <button onClick={() => onEdit(contract)}>Edit</button>
                  {user.role !== 'ADMIN' && (
                    <button onClick={() => onDelete(contract.id)}>Delete</button>
                  )}
                  <button onClick={() => onHistory(contract)}>History</button>
                </>
              )}
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

export default ContractTable;
