import React, { useState } from 'react';
import FinanceDashboard from '../../components/Finance/FinanceDashboard';
import VirementTable from '../../components/Finance/VirementTable';
import VirementFormModal from '../../components/Finance/VirementFormModal';
import VirementHistory from '../../components/Finance/VirementHistory';
import VirementReconciliationPanel from '../../components/Finance/VirementReconciliationPanel';
import ExportButton from '../../components/Finance/ExportButton';
import VirementFilters from '../../components/Finance/VirementFilters';
import { useFinance } from '../../hooks/useFinance';

const FinanceTracker: React.FC = () => {
  const [selectedVirementId, setSelectedVirementId] = useState<string | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);

  const { virements, filters, setFilters, loading, error, reload } = useFinance();

  const handleEditVirement = (id: string) => {
    setSelectedVirementId(id);
    setShowFormModal(true);
  };

  return (
    <div className="finance-module-container">
      <FinanceDashboard />
      <div className="finance-actions-bar">
        <VirementFilters onChange={setFilters} />
        <ExportButton filters={filters} />
      </div>
      <VirementTable
        virements={virements}
        onSelectVirement={setSelectedVirementId}
        onEditVirement={handleEditVirement}
      />
      {showFormModal && selectedVirementId && (
        <VirementFormModal
          virementId={selectedVirementId}
          onClose={() => { setShowFormModal(false); reload(); }}
        />
      )}
      {selectedVirementId && (
        <>
          <VirementHistory virementId={selectedVirementId} />
          <VirementReconciliationPanel virementId={selectedVirementId} />
        </>
      )}
      {loading && <div>Chargement...</div>}
      {error && <div className="error">{error}</div>}
    </div>
  );
};

export default FinanceTracker;