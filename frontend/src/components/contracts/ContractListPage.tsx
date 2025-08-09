import React, { useEffect, useState } from 'react';
import { Contract } from '../../types/contract.d';
import { ContractService } from '../../api/ContractService';
import ContractTable from './ContractTable';
import ContractFormModal from './ContractFormModal';
import ContractCard from './ContractCard';
import ContractDetail from './ContractDetail';
import { useAuth } from '../../contexts/AuthContext';
import { Paper, Typography, Button, Grid } from '@mui/material';
import './contracts.css';

const ContractListPage: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editContract, setEditContract] = useState<Contract | null>(null);
  const [filters, setFilters] = useState<any>({});
  const [dashboard, setDashboard] = useState<any>(null);
  const [historyModal, setHistoryModal] = useState<{ open: boolean; contract: Contract | null; history: any[] }>({ open: false, contract: null, history: [] });
  const [adminResult, setAdminResult] = useState<string | null>(null);
  const [previewModal, setPreviewModal] = useState<{ open: boolean; contract: Contract | null }>({ open: false, contract: null });
  const [showExternal, setShowExternal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const { user } = useAuth();
  if (!user) return <div>Loading...</div>;

  const fetchContracts = async () => {
    setLoading(true);
   if (showExternal) {
  // @ts-ignore
  const { fetchExternalContracts } = await import('../../services/contractService');
  const data = await fetchExternalContracts();
  // Map external contracts to internal ContractType
  const mapped = data.map((ext: any) => ({
    id: ext.id,
    clientId: ext.nomSociete || '', // or another field if available
    clientName: ext.nomSociete || ext.nom || '',
    startDate: ext.dateEffet || '',
    endDate: ext.dateFin || '',
    signature: '', // external API may not provide this
    delaiReglement: 0,
    delaiReclamation: 0,
    escalationThreshold: undefined,
    assignedManagerId: '',
    documentPath: '',
    notes: ext.contractNotes || '',
    createdAt: '',
    updatedAt: '',
    assignedManager: undefined,
    history: [],
    version: undefined,
  }));
  setContracts(mapped);
} else {
  const data = await ContractService.search(filters);
  setContracts(data);
}
    setLoading(false);
  };

  useEffect(() => { fetchContracts(); }, [filters, showExternal]);
  useEffect(() => { ContractService.getStatistics().then(setDashboard); }, []);

  // Export helpers
  const handleExport = async (type: 'excel' | 'pdf') => {
    const blob = type === 'excel'
      ? await ContractService.exportExcel(filters)
      : await ContractService.exportPdf(filters);
    const url = window.URL.createObjectURL(new Blob([blob]));
    const a = document.createElement('a');
    a.href = url;
    a.download = type === 'excel' ? 'contracts.xlsx' : 'contracts.pdf';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Helper to get file extension
  const getFileExtension = (path: string) => path.split('.').pop()?.toLowerCase() || '';

  const handleViewContract = (contract: Contract) => {
    setSelectedContract(contract);
  };

  if (selectedContract) {
    return (
      <div style={{ padding: 16 }}>
        <Button 
          onClick={() => setSelectedContract(null)} 
          sx={{ mb: 2 }}
          variant="outlined"
        >
          ← Retour à la liste
        </Button>
        <ContractDetail contract={selectedContract} />
      </div>
    );
  }

  return (
    <div style={{ padding: 16, minHeight: '100vh', background: '#f7f9fb' }}>
      <Paper sx={{ p: 2, mb: 3, boxShadow: 2 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>Contrats</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => { setEditContract(null); setShowModal(true); }}
          sx={{ mb: 2, mr: 2 }}
        >
          Nouveau Contrat
        </Button>
        <Button onClick={() => handleExport('excel')} sx={{ mr: 1 }}>Export Excel</Button>
        <Button onClick={() => handleExport('pdf')} sx={{ mr: 1 }}>Export PDF</Button>
        <Button 
          onClick={() => setShowExternal(e => !e)} 
          variant={showExternal ? 'contained' : 'outlined'}
          sx={{ mr: 1 }}
        >
          {showExternal ? 'Contrats Internes' : 'Contrats Externes'}
        </Button>
      {dashboard && (
        <div className="dashboard-stats" style={{ display: 'flex', gap: 16, margin: '16px 0' }}>
          <div>Total: {dashboard.total}</div>
          <div>Active: {dashboard.active}</div>
          <div>Expired: {dashboard.expired}</div>
          <div>Expiring Soon: {dashboard.expiringSoon}</div>
          <div>SLA Compliant: {dashboard.slaCompliant}</div>
        </div>
      )}
      {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
        <div className="admin-tools" style={{ marginBottom: 16 }}>
          <b>Admin Tools</b>
          <button onClick={async () => setAdminResult(JSON.stringify(await ContractService.checkSla()))}>SLA Check</button>
          <button onClick={async () => setAdminResult(JSON.stringify(await ContractService.indexGed()))}>GED Index</button>
          <button onClick={async () => setAdminResult(JSON.stringify(await ContractService.associateBordereaux()))}>Associate Bordereaux</button>
          <button onClick={async () => setAdminResult(JSON.stringify(await ContractService.triggerReminders()))}>Reminders</button>
          <button onClick={async () => setAdminResult(JSON.stringify(await ContractService.linkComplaints()))}>Link Complaints</button>
          {adminResult && <pre style={{ background: '#eee', padding: 8 }}>{adminResult}</pre>}
        </div>
      )}
      <div className="contracts-filter-bar">
        <input
          type="text"
          placeholder="Filter by client name"
          value={filters.clientName || ''}
          onChange={e => setFilters((f: any) => ({ ...f, clientName: e.target.value }))}
        />
        <select
          value={filters.status || ''}
          onChange={e => setFilters((f: any) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="future">Future</option>
          <option value="expired">Expired</option>
        </select>
        <input
          type="number"
          placeholder="Escalation Min"
          value={filters.escalationMin || ''}
          onChange={e => setFilters((f: any) => ({ ...f, escalationMin: e.target.value }))}
          style={{ width: 120 }}
        />
        <input
          type="number"
          placeholder="Escalation Max"
          value={filters.escalationMax || ''}
          onChange={e => setFilters((f: any) => ({ ...f, escalationMax: e.target.value }))}
          style={{ width: 120 }}
        />
        <input
          type="date"
          placeholder="Start Date From"
          value={filters.startDateFrom || ''}
          onChange={e => setFilters((f: any) => ({ ...f, startDateFrom: e.target.value }))}
        />
        <input
          type="date"
          placeholder="Start Date To"
          value={filters.startDateTo || ''}
          onChange={e => setFilters((f: any) => ({ ...f, startDateTo: e.target.value }))}
        />
        <input
          type="date"
          placeholder="End Date From"
          value={filters.endDateFrom || ''}
          onChange={e => setFilters((f: any) => ({ ...f, endDateFrom: e.target.value }))}
        />
        <input
          type="date"
          placeholder="End Date To"
          value={filters.endDateTo || ''}
          onChange={e => setFilters((f: any) => ({ ...f, endDateTo: e.target.value }))}
        />
        {/* Manager filter can be a select if you fetch managers dynamically */}
        <input
          type="text"
          placeholder="Manager ID"
          value={filters.assignedManagerId || ''}
          onChange={e => setFilters((f: any) => ({ ...f, assignedManagerId: e.target.value }))}
        />
      </div>
        <ContractTable
          contracts={contracts}
          loading={loading}
          onEdit={contract => { setEditContract(contract); setShowModal(true); }}
          onDelete={async id => { await ContractService.delete(id); fetchContracts(); }}
          onHistory={async contract => {
            const history = await ContractService.getHistory(contract.id);
            setHistoryModal({ open: true, contract, history });
          }}
          onPreview={contract => setPreviewModal({ open: true, contract })}
          onView={handleViewContract}
          user={user}
        />
        <ContractCard contracts={contracts} />
      </Paper>
      {showModal && (
        <ContractFormModal
          contract={editContract}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchContracts(); }}
        />
      )}
      {historyModal.open && (
        <div className="modal">
          <button onClick={() => setHistoryModal({ open: false, contract: null, history: [] })}>Close</button>
          <h3>Contract History for {historyModal.contract?.clientName}</h3>
          <pre style={{ maxHeight: 400, overflow: 'auto' }}>{JSON.stringify(historyModal.history, null, 2)}</pre>
        </div>
      )}
      {previewModal.open && previewModal.contract && (
        <div className="modal">
          <button onClick={() => setPreviewModal({ open: false, contract: null })}>Close</button>
          <h3>Preview Document: {previewModal.contract.documentPath.split('/').pop()}</h3>
          {(() => {
            const ext = getFileExtension(previewModal.contract!.documentPath);
            if (ext === 'pdf') {
              return (
                <iframe
                  src={previewModal.contract.documentPath}
                  style={{ width: '80vw', height: '80vh', border: 'none' }}
                  title="PDF Preview"
                />
              );
            } else if (ext === 'doc' || ext === 'docx') {
              return (
                <div>
                  <p>Preview for DOC/DOCX is not supported in-browser. Please download the file to view.</p>
                  <a href={previewModal.contract.documentPath} download>Download</a>
                </div>
              );
            } else {
              return <div>Unsupported file type for preview.</div>;
            }
          })()}
        </div>
      )}
    </div>
  );
};

export default ContractListPage;