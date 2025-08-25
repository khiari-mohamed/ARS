import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import '../../styles/bordereaux.css';
import { 
  fetchBordereaux, 
  fetchKPIs, 
  getPerformanceAnalytics,
  progressToNextStage,
  batchUpdateStatus,
  bulkAssignBordereaux,
  exportBordereauxCSV
} from '../../services/bordereauxService';
import { fetchUsers } from '../../services/bordereauxService';
import EnhancedBordereauCreateForm from '../../components/EnhancedBordereauCreateForm';
import AIRecommendations from '../../components/AIRecommendations';

const BordereauxDashboard: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  
  const [bordereaux, setBordereaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<any>({});
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    loadUsers();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bordereauxData, kpisData, analyticsData] = await Promise.all([
        fetchBordereaux(filters),
        fetchKPIs(),
        getPerformanceAnalytics(filters)
      ]);
      
      setBordereaux(Array.isArray(bordereauxData) ? bordereauxData : bordereauxData.items || []);
      setKpis(kpisData);
      setAnalytics(analyticsData);
    } catch (error) {
      notify('Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const usersData = await fetchUsers({ role: 'GESTIONNAIRE' });
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleBulkAction = async (action: string, value?: any) => {
    if (selectedRows.size === 0) {
      notify('Sélectionnez au moins un bordereau', 'warning');
      return;
    }

    try {
      const ids = Array.from(selectedRows);
      
      switch (action) {
        case 'assign':
          await bulkAssignBordereaux(ids, value);
          notify(`${ids.length} bordereau(x) assigné(s)`, 'success');
          break;
        case 'status':
          await batchUpdateStatus(ids, value);
          notify(`${ids.length} bordereau(x) mis à jour`, 'success');
          break;
        case 'progress':
          for (const id of ids) {
            await progressToNextStage(id);
          }
          notify(`${ids.length} bordereau(x) progressé(s)`, 'success');
          break;
      }
      
      setSelectedRows(new Set());
      loadData();
    } catch (error) {
      notify('Erreur lors de l\'opération', 'error');
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
      notify('Export réalisé avec succès', 'success');
    } catch (error) {
      notify('Erreur lors de l\'export', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'EN_ATTENTE': 'bg-gray-100 text-gray-800',
      'A_SCANNER': 'bg-orange-100 text-orange-800',
      'SCAN_EN_COURS': 'bg-blue-100 text-blue-800',
      'SCANNE': 'bg-indigo-100 text-indigo-800',
      'A_AFFECTER': 'bg-purple-100 text-purple-800',
      'ASSIGNE': 'bg-purple-100 text-purple-800',
      'EN_COURS': 'bg-yellow-100 text-yellow-800',
      'TRAITE': 'bg-green-100 text-green-800',
      'PRET_VIREMENT': 'bg-teal-100 text-teal-800',
      'VIREMENT_EN_COURS': 'bg-cyan-100 text-cyan-800',
      'VIREMENT_EXECUTE': 'bg-emerald-100 text-emerald-800',
      'CLOTURE': 'bg-gray-100 text-gray-800',
      'EN_DIFFICULTE': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getSLAStatus = (bordereau: any) => {
    if (!bordereau.dateReception || !bordereau.delaiReglement) return { color: 'text-gray-500', days: 0 };
    
    const today = new Date();
    const reception = new Date(bordereau.dateReception);
    const elapsed = Math.floor((today.getTime() - reception.getTime()) / (1000 * 60 * 60 * 24));
    const remaining = bordereau.delaiReglement - elapsed;
    
    if (remaining < 0) return { color: 'text-red-600', days: remaining, label: 'En retard' };
    if (remaining <= 3) return { color: 'text-orange-600', days: remaining, label: 'Urgent' };
    return { color: 'text-green-600', days: remaining, label: 'OK' };
  };

  if (loading) {
    return (
      <div className="bordereau-loading">
        <div style={{textAlign: 'center'}}>
          <div className="bordereau-spinner"></div>
          <p style={{color: '#6b7280', marginTop: '16px'}}>Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bordereau-dashboard">
      {/* Header */}
      <div className="bordereau-header">
        <div className="bordereau-header-content">
          <div>
            <h1 className="bordereau-title">Gestion des Bordereaux</h1>
            <p className="bordereau-subtitle">Tableau de bord centralisé pour le suivi des bordereaux</p>
          </div>
          <div className="bordereau-user-info">
            Connecté en tant que <span style={{fontWeight: 600}}>{user?.fullName}</span>
          </div>
        </div>
      </div>

      <div className="bordereau-main">
        {/* KPI Cards */}
        <div className="bordereau-kpi-container">
          <div className="bordereau-kpi-card">
            <div className="bordereau-kpi-content">
              <div className="bordereau-kpi-info">
                <div className="bordereau-kpi-icon">
                  <span>📊</span>
                </div>
                <h3 className="bordereau-kpi-label">Total Bordereaux</h3>
                <p className="bordereau-kpi-value">{bordereaux.length}</p>
              </div>
            </div>
          </div>

          <div className="bordereau-kpi-card kpi-success">
            <div className="bordereau-kpi-content">
              <div className="bordereau-kpi-info">
                <div className="bordereau-kpi-icon icon-success">
                  <span>✅</span>
                </div>
                <h3 className="bordereau-kpi-label">Traités</h3>
                <p className="bordereau-kpi-value value-success">
                  {bordereaux.filter(b => ['TRAITE', 'CLOTURE'].includes(b.statut)).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bordereau-kpi-card kpi-danger">
            <div className="bordereau-kpi-content">
              <div className="bordereau-kpi-info">
                <div className="bordereau-kpi-icon icon-danger">
                  <span>⚠️</span>
                </div>
                <h3 className="bordereau-kpi-label">En retard</h3>
                <p className="bordereau-kpi-value value-danger">
                  {bordereaux.filter(b => getSLAStatus(b).days < 0).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bordereau-kpi-card kpi-warning">
            <div className="bordereau-kpi-content">
              <div className="bordereau-kpi-info">
                <div className="bordereau-kpi-icon icon-warning">
                  <span>📈</span>
                </div>
                <h3 className="bordereau-kpi-label">Conformité SLA</h3>
                <p className="bordereau-kpi-value value-warning">{analytics?.slaCompliance || 0}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="bordereau-actions-bar">
          <div className="bordereau-actions-content">
            <div className="bordereau-actions-left">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bordereau-btn bordereau-btn-primary"
              >
                <span>+</span>
                Nouveau Bordereau
              </button>
              
              <button
                onClick={handleExport}
                className="bordereau-btn bordereau-btn-success"
              >
                <span>📊</span>
                Exporter
              </button>

              {selectedRows.size > 0 && (
                <>
                  <div className="h-6 w-px bg-gray-300"></div>
                  <span className="text-sm text-gray-600">{selectedRows.size} sélectionné(s)</span>
                  
                  <select
                    onChange={(e) => e.target.value && handleBulkAction('assign', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    defaultValue=""
                  >
                    <option value="">Assigner à...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.fullName}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleBulkAction('progress')}
                    className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    Progresser
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Tableau
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Kanban
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* AI Recommendations Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            {/* Content */}
        {viewMode === 'table' ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === bordereaux.length && bordereaux.length > 0}
                        onChange={() => {
                          if (selectedRows.size === bordereaux.length) {
                            setSelectedRows(new Set());
                          } else {
                            setSelectedRows(new Set(bordereaux.map(b => b.id)));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Référence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SLA
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      BS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bordereaux.map((bordereau) => {
                    const sla = getSLAStatus(bordereau);
                    return (
                      <tr key={bordereau.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(bordereau.id)}
                            onChange={() => {
                              const newSelection = new Set(selectedRows);
                              if (newSelection.has(bordereau.id)) {
                                newSelection.delete(bordereau.id);
                              } else {
                                newSelection.add(bordereau.id);
                              }
                              setSelectedRows(newSelection);
                            }}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{bordereau.reference}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(bordereau.dateReception).toLocaleDateString('fr-FR')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{bordereau.client?.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(bordereau.statut)}`}>
                            {bordereau.statut}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${sla.color}`}>
                            {sla.days < 0 ? `+${Math.abs(sla.days)}j` : `${sla.days}j`}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bordereau.nombreBS}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => window.open(`/bordereaux/${bordereau.id}`, '_blank')}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Voir
                            </button>
                            <button
                              onClick={() => progressToNextStage(bordereau.id).then(() => loadData())}
                              className="text-green-600 hover:text-green-900"
                            >
                              Progresser
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bordereau-kanban-container">
            {['A_SCANNER', 'EN_COURS', 'TRAITE', 'CLOTURE'].map(status => {
              const statusBordereaux = bordereaux.filter(b => b.statut === status);
              const getStatusColor = (status: string) => {
                const colors = {
                  'A_SCANNER': '#f59e0b',
                  'EN_COURS': '#3b82f6', 
                  'TRAITE': '#10b981',
                  'CLOTURE': '#6b7280'
                };
                return colors[status as keyof typeof colors] || '#6b7280';
              };
              
              return (
                <div key={status} className="bordereau-kanban-column">
                  {/* Column Header */}
                  <div className="bordereau-kanban-header" style={{ background: `linear-gradient(135deg, ${getStatusColor(status)}, ${getStatusColor(status)}dd)` }}>
                    <div className="bordereau-kpi-info">
                      <h3 className="bordereau-kpi-label" style={{color: 'white', margin: 0}}>{status}</h3>
                      <p className="bordereau-kpi-value" style={{color: 'white', fontSize: '2rem', margin: 0}}>
                        {statusBordereaux.length}
                      </p>
                    </div>
                  </div>
                  
                  {/* Cards Container */}
                  <div className="bordereau-kanban-cards">
                    {statusBordereaux.map(bordereau => {
                      const sla = getSLAStatus(bordereau);
                      const getSLAIconColor = () => {
                        if (sla.days < 0) return '#ef4444';
                        if (sla.days <= 3) return '#f59e0b';
                        return '#10b981';
                      };
                      
                      return (
                        <div key={bordereau.id} className="bordereau-kanban-card">
                          {/* Card Header */}
                          <div className="bordereau-kpi-content">
                            <div className="bordereau-kpi-info">
                              <div className="bordereau-kpi-icon" style={{width: '48px', height: '48px', background: getSLAIconColor()}}>
                                <span style={{fontSize: '1.5rem'}}>
                                  {sla.days < 0 ? '⚠️' : sla.days <= 3 ? '🟡' : '✅'}
                                </span>
                              </div>
                              <h3 className="bordereau-kpi-label">{bordereau.reference}</h3>
                              <p className="bordereau-kpi-value" style={{fontSize: '1.5rem'}}>
                                {sla.days < 0 ? `+${Math.abs(sla.days)}j` : `${sla.days}j`}
                              </p>
                            </div>
                          </div>

                          {/* Card Content */}
                          <div style={{marginTop: '16px', marginBottom: '16px'}}>
                            <div className="bordereau-kpi-label" style={{marginBottom: '8px'}}>
                              {bordereau.client?.name || bordereau.clientId}
                            </div>
                            <div style={{color: '#6b7280', fontSize: '0.875rem', marginBottom: '4px'}}>
                              📋 {bordereau.nombreBS} BS
                            </div>
                            <div style={{color: '#9ca3af', fontSize: '0.75rem'}}>
                              {new Date(bordereau.dateReception).toLocaleDateString('fr-FR')}
                            </div>
                          </div>

                          {/* Card Actions */}
                          <div style={{display: 'flex', gap: '8px', marginTop: '16px'}}>
                            <input
                              type="checkbox"
                              checked={selectedRows.has(bordereau.id)}
                              onChange={() => {
                                const newSelection = new Set(selectedRows);
                                if (newSelection.has(bordereau.id)) {
                                  newSelection.delete(bordereau.id);
                                } else {
                                  newSelection.add(bordereau.id);
                                }
                                setSelectedRows(newSelection);
                              }}
                              style={{marginRight: '8px'}}
                            />
                            <button
                              className="bordereau-btn bordereau-btn-secondary"
                              style={{fontSize: '0.75rem', padding: '4px 8px', flex: 1}}
                              onClick={() => window.open(`/bordereaux/${bordereau.id}`, '_blank')}
                            >
                              Voir →
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    
                    {statusBordereaux.length === 0 && (
                      <div style={{textAlign: 'center', color: '#9ca3af', padding: '48px 16px'}}>
                        <div className="bordereau-kpi-icon" style={{margin: '0 auto 16px', background: '#f3f4f6'}}>
                          <span style={{fontSize: '2rem'}}>📋</span>
                        </div>
                        <div className="bordereau-kpi-label">Aucun bordereau</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </div>
          
          {/* AI Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <AIRecommendations />
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="bordereau-modal-overlay">
          <div className="bordereau-modal-container">
            <div className="bordereau-modal-content">
              <div className="bordereau-modal-header">
                <h3 className="bordereau-modal-title">
                  Créer un nouveau bordereau
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="bordereau-modal-close"
                >
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="bordereau-modal-body">
                <EnhancedBordereauCreateForm 
                  onSuccess={() => {
                    setShowCreateModal(false);
                    loadData();
                  }} 
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BordereauxDashboard;