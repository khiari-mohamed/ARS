import React, { useState, useEffect } from 'react';
import { fetchBordereaux, assignBordereau2 as assignBordereau, markBordereauAsProcessed, exportBordereauxCSV, bulkUpdateBordereaux, bulkAssignBordereaux } from '../services/bordereauxService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import BordereauAssignModal from './BordereauAssignModal';
import BordereauBatchOperations from './BordereauBatchOperations';
import AdvancedBordereauFilters from './AdvancedBordereauFilters';

interface TableColumn {
  key: string;
  label: string;
  sortable: boolean;
  width?: string;
}

const columns: TableColumn[] = [
  { key: 'select', label: '', sortable: false, width: '40px' },
  { key: 'reference', label: 'Réf Bordereau', sortable: true, width: '120px' },
  { key: 'client', label: 'Client / Prestataire', sortable: true, width: '200px' },
  { key: 'nombreBS', label: 'Nb BS', sortable: true, width: '80px' },
  { key: 'dateReception', label: 'Date réception BO', sortable: true, width: '140px' },
  { key: 'dateReceptionSante', label: 'Date réception équipe Santé', sortable: true, width: '180px' },
  { key: 'dateLimite', label: 'Date limite', sortable: true, width: '120px' },
  { key: 'statut', label: 'Status', sortable: true, width: '120px' },
  { key: 'assigned', label: 'Assigned', sortable: true, width: '150px' },
  { key: 'actions', label: 'Actions', sortable: false, width: '200px' }
];

const BordereauTable: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [bordereaux, setBordereaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  // Role-based permissions
  const canAssign = ['CHEF_EQUIPE', 'ADMINISTRATEUR'].includes(user?.role || '');
  const canProcess = user?.role === 'GESTIONNAIRE';
  const canExport = user?.role === 'ADMINISTRATEUR';

  useEffect(() => {
    loadData();
  }, [currentPage, pageSize, sortConfig, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        page: currentPage,
        pageSize,
        ...(sortConfig && {
          sortBy: sortConfig.key,
          sortOrder: sortConfig.direction
        })
      };

      const response = await fetchBordereaux(params);
      
      if (response.items && typeof response.total === 'number') {
        setBordereaux(response.items);
        setTotal(response.total);
      } else {
        setBordereaux(response);
        setTotal(response.length || 0);
      }
    } catch (error) {
      notify('Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = () => {
    if (selectedRows.size === bordereaux.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(bordereaux.map(b => b.id)));
    }
  };

  const handleSelectRow = (id: string) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedRows(newSelection);
  };

  const handleBulkAssign = () => {
    if (selectedRows.size === 0) {
      notify('Sélectionnez au moins un bordereau', 'warning');
      return;
    }
    setAssignModalOpen(true);
  };

  const handleBulkMarkProcessed = async () => {
    if (selectedRows.size === 0) {
      notify('Sélectionnez au moins un bordereau', 'warning');
      return;
    }

    try {
      for (const id of selectedRows) {
        await markBordereauAsProcessed(id);
      }
      notify(`${selectedRows.size} bordereau(x) marqué(s) comme traité(s)`, 'success');
      setSelectedRows(new Set());
      loadData();
    } catch (error) {
      notify('Erreur lors du traitement en lot', 'error');
    }
  };

  const handleExport = async () => {
    try {
      const csv = await exportBordereauxCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bordereaux_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      notify('Erreur lors de l\'export', 'error');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDaysRemaining = (bordereau: any) => {
    const daysRemaining = bordereau.daysRemaining || 0;
    const isOverdue = daysRemaining < 0;
    const isAtRisk = daysRemaining <= 3 && daysRemaining >= 0;

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          isOverdue
            ? 'bg-red-100 text-red-800'
            : isAtRisk
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-green-100 text-green-800'
        }`}
        title={`SLA: due in ${Math.abs(daysRemaining)} days — expected by ${formatDate(bordereau.dateLimite)}`}
      >
        {isOverdue ? `+${Math.abs(daysRemaining)}` : `D-${daysRemaining}`}
      </span>
    );
  };

  const getStatusBadge = (bordereau: any) => {
    const statusColors: Record<string, string> = {
      'EN_ATTENTE': 'bg-gray-100 text-gray-800',
      'SCAN_EN_COURS': 'bg-blue-100 text-blue-800',
      'SCAN_TERMINE': 'bg-indigo-100 text-indigo-800',
      'ASSIGNE': 'bg-purple-100 text-purple-800',
      'EN_COURS': 'bg-yellow-100 text-yellow-800',
      'TRAITE': 'bg-green-100 text-green-800',
      'CLOTURE': 'bg-gray-100 text-gray-800'
    };

    const colorClass = statusColors[bordereau.statut as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';

    return (
      <div className="flex items-center gap-1">
        {bordereau.statusColor === 'RED' && <span className="text-red-500">🔴</span>}
        {bordereau.statusColor === 'ORANGE' && <span className="text-orange-500">🟡</span>}
        {bordereau.statusColor === 'GREEN' && <span className="text-green-500">🟢</span>}
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
          {bordereau.statut.replace('_', ' ')}
        </span>
      </div>
    );
  };

  const renderActionButtons = (bordereau: any) => {
    return (
      <div className="flex items-center gap-1">
        {canAssign && (
          <button
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            onClick={() => {
              // Handle single assign
            }}
            title="Assign"
          >
            👤
          </button>
        )}
        <button
          className="p-1 text-gray-600 hover:bg-gray-50 rounded"
          onClick={() => window.open(`/bordereaux/${bordereau.id}`, '_blank')}
          title="Open"
        >
          👁️
        </button>
        {canProcess && (
          <button
            className="p-1 text-green-600 hover:bg-green-50 rounded"
            onClick={() => {
              // Handle virement
            }}
            title="Virement"
          >
            💰
          </button>
        )}
        <button
          className="p-1 text-gray-600 hover:bg-gray-50 rounded"
          onClick={() => {
            // Handle history
          }}
          title="History"
        >
          📜
        </button>
        <div className="relative group">
          <button className="p-1 text-gray-600 hover:bg-gray-50 rounded">
            ⋯
          </button>
          <div className="absolute right-0 top-8 bg-white shadow-lg rounded-md py-1 z-10 hidden group-hover:block min-w-32">
            <button className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-50">
              Export PDF
            </button>
            <button className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-50">
              Mark returned
            </button>
            <button className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-50">
              Add note
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="bordereau-table-container">
      {/* Top Actions Bar */}
      <div className="flex justify-between items-center mb-4 p-4 bg-gray-50 rounded">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {selectedRows.size} / {bordereaux.length} sélectionné(s)
          </span>
          {selectedRows.size > 0 && (
            <div className="flex gap-2">
              {canAssign && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setBatchModalOpen(true)}
                >
                  Opérations en lot
                </button>
              )}
              {canProcess && (
                <button
                  className="btn btn-success btn-sm"
                  onClick={handleBulkMarkProcessed}
                >
                  Marquer traité
                </button>
              )}
              {canExport && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleExport}
                >
                  Exporter sélection
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => {}}>
            + Ajouter Bordereau
          </button>
          <button className="btn btn-secondary" onClick={() => {}}>
            Importer Excel
          </button>
          <button className="btn btn-warning" onClick={() => {}}>
            Générer OV
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => setAdvancedFiltersOpen(!advancedFiltersOpen)}
          >
            Filtres avancés
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.key === 'select' ? (
                      <button onClick={handleSelectAll}>
                        {selectedRows.size === bordereaux.length ? (
                          <span className="text-blue-600">☑️</span>
                        ) : (
                          <span className="text-gray-400">☐</span>
                        )}
                      </button>
                    ) : (
                      <>
                        {column.label}
                        {column.sortable && sortConfig?.key === column.key && (
                          <span className="text-blue-600">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bordereaux.map((bordereau) => (
              <tr
                key={bordereau.id}
                className={`hover:bg-gray-50 ${
                  selectedRows.has(bordereau.id) ? 'bg-blue-50' : ''
                }`}
              >
                <td className="px-3 py-4">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(bordereau.id)}
                    onChange={() => handleSelectRow(bordereau.id)}
                    className="rounded text-blue-600"
                  />
                </td>
                <td className="px-3 py-4">
                  <div className="font-mono text-sm font-medium text-blue-900">
                    # {bordereau.reference}
                  </div>
                </td>
                <td className="px-3 py-4">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">
                      {bordereau.client?.name || bordereau.clientId}
                    </div>
                    {bordereau.prestataire && (
                      <div className="text-gray-500">
                        {bordereau.prestataire.name}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-4 text-center">
                  <span className="text-sm font-medium">
                    {bordereau.nombreBS}
                  </span>
                </td>
                <td className="px-3 py-4 text-sm text-gray-900">
                  {formatDate(bordereau.dateReception)}
                </td>
                <td className="px-3 py-4 text-sm text-gray-900">
                  {formatDate(bordereau.dateReceptionSante)}
                </td>
                <td className="px-3 py-4">
                  {getDaysRemaining(bordereau)}
                </td>
                <td className="px-3 py-4">
                  {getStatusBadge(bordereau)}
                </td>
                <td className="px-3 py-4">
                  <div className="flex items-center gap-2">
                    {bordereau.currentHandler ? (
                      <>
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                          {bordereau.currentHandler.fullName?.charAt(0) || 'U'}
                        </div>
                        <span className="text-sm">
                          {bordereau.currentHandler.fullName}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">Non assigné</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-4">
                  {renderActionButtons(bordereau)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4 px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Affichage {(currentPage - 1) * pageSize + 1} à {Math.min(currentPage * pageSize, total)} sur {total}
          </span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Précédent
          </button>
          <span className="flex items-center px-3 py-1 text-sm">
            Page {currentPage} / {Math.max(1, Math.ceil(total / pageSize))}
          </span>
          <button
            className="btn btn-sm"
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={currentPage * pageSize >= total}
          >
            Suivant
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {advancedFiltersOpen && (
        <AdvancedBordereauFilters
          onFiltersChange={setFilters}
          clients={clients}
          users={users}
        />
      )}

      {/* Assignment Modal */}
      {assignModalOpen && (
        <BordereauAssignModal
          selectedBordereaux={Array.from(selectedRows)}
          onClose={() => setAssignModalOpen(false)}
          onSuccess={() => {
            setAssignModalOpen(false);
            setSelectedRows(new Set());
            loadData();
          }}
        />
      )}

      {/* Batch Operations Modal */}
      {batchModalOpen && (
        <BordereauBatchOperations
          open={batchModalOpen}
          onClose={() => setBatchModalOpen(false)}
          selectedBordereaux={Array.from(selectedRows)}
          onSuccess={() => {
            setBatchModalOpen(false);
            setSelectedRows(new Set());
            loadData();
          }}
        />
      )}

      <style>{`
        .btn {
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-primary {
          background-color: #0b5ed7;
          color: white;
        }
        
        .btn-primary:hover {
          background-color: #0a58ca;
        }
        
        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }
        
        .btn-secondary:hover {
          background-color: #5c636a;
        }
        
        .btn-success {
          background-color: #198754;
          color: white;
        }
        
        .btn-success:hover {
          background-color: #157347;
        }
        
        .btn-warning {
          background-color: #fd7e14;
          color: white;
        }
        
        .btn-warning:hover {
          background-color: #e8681c;
        }
        
        .btn-sm {
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
        }
        
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default BordereauTable;