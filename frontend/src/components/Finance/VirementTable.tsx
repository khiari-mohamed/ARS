import React from 'react';
import { Virement } from '../../types/finance';
import VirementStatusTag from './VirementStatusTag';
import { formatCurrency, hasDiscrepancy, isOverdue } from '../../utils/financeUtils';

interface VirementTableProps {
  virements: Virement[];
  onSelectVirement: (id: string) => void;
  onEditVirement: (id: string) => void;
}

const VirementTable: React.FC<VirementTableProps> = ({
  virements,
  onSelectVirement,
  onEditVirement,
}) => {
  return (
    <div className="virement-table-container">
      <h2>Liste des Virements</h2>
      <table className="virement-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Montant</th>
            <th>Client</th>
            <th>Contrat</th>
            <th>Réf. Virement</th>
            <th>Status</th>
            <th>Bordereaux liés</th>
            <th>Remarques</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {virements.map((v) => {
            const discrepancy = hasDiscrepancy(v);
            const overdue = isOverdue(v, 7);

            return (
              <tr
                key={v.id}
                className={discrepancy ? 'discrepancy-row' : overdue ? 'overdue-row' : ''}
                onClick={() => onSelectVirement(v.id)}
                style={{
                  background: discrepancy
                    ? '#ffe5e5'
                    : overdue
                    ? '#fffbe5'
                    : undefined,
                  cursor: 'pointer',
                }}
              >
                <td>{new Date(v.date).toLocaleDateString('fr-FR')}</td>
                <td>{formatCurrency(v.amount)}</td>
                <td>{v.clientName}</td>
                <td>{v.contractId || '-'}</td>
                <td>{v.reference}</td>
                <td>
                  <VirementStatusTag status={v.status} />
                </td>
                <td>
                  {v.linkedBordereaux && v.linkedBordereaux.length > 0
                    ? v.linkedBordereaux.map((b) => b.reference).join(', ')
                    : '-'}
                </td>
                <td>{v.remarks || '-'}</td>
                <td>
                  <button onClick={(e) => { e.stopPropagation(); onEditVirement(v.id); }}>
                    Éditer
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <style>{`
        .discrepancy-row { background: #ffe5e5; }
        .overdue-row { background: #fffbe5; }
        .status-badge.confirmed { color: green; font-weight: bold; }
        .status-badge.pending { color: orange; font-weight: bold; }
      `}</style>
    </div>
  );
};

export default VirementTable;