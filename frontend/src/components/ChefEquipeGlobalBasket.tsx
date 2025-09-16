import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { 
  fetchUnassignedBordereaux, 
  fetchTeamBordereaux, 
  fetchChefEquipeCorbeille,
  assignBordereau,
  reassignBordereau 
} from '../services/bordereauxService';
import { fetchUsers } from '../services/bordereauxService';
import '../styles/ChefEquipe.css';

interface ChefEquipeGlobalBasketProps {
  onAssignmentSuccess?: () => void;
}

const ChefEquipeGlobalBasket: React.FC<ChefEquipeGlobalBasketProps> = ({ onAssignmentSuccess }) => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [activeTab, setActiveTab] = useState<'unassigned' | 'team' | 'processed'>('unassigned');
  const [unassignedBordereaux, setUnassignedBordereaux] = useState<any[]>([]);
  const [teamBordereaux, setTeamBordereaux] = useState<any[]>([]);
  const [processedBordereaux, setProcessedBordereaux] = useState<any[]>([]);
  const [gestionnaires, setGestionnaires] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBordereaux, setSelectedBordereaux] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignmentTarget, setAssignmentTarget] = useState('');
  const [workloadStats, setWorkloadStats] = useState<any>({});

  useEffect(() => {
    loadData();
    loadGestionnaires();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Use the dedicated Chef d'équipe corbeille endpoint
      const corbeilleData = await fetchChefEquipeCorbeille();
      
      setUnassignedBordereaux(corbeilleData.nonAffectes || []);
      setTeamBordereaux(corbeilleData.enCours || []);
      setProcessedBordereaux(corbeilleData.traites || []);
      
      // Calculate workload stats
      await calculateWorkloadStats();
    } catch (error) {
      console.error('Data loading error:', error);
      notify('Erreur lors du chargement des données', 'error');
      
      // Fallback to individual API calls
      try {
        const [unassigned, team] = await Promise.all([
          fetchUnassignedBordereaux(),
          fetchTeamBordereaux(user?.id || '')
        ]);

        setUnassignedBordereaux(unassigned || []);
        
        // Separate team bordereaux by status
        const teamData = team || [];
        setTeamBordereaux(teamData.filter((b: any) => !['TRAITE', 'CLOTURE'].includes(b.statut)));
        setProcessedBordereaux(teamData.filter((b: any) => ['TRAITE', 'CLOTURE'].includes(b.statut)));
      } catch (fallbackError) {
        console.error('Fallback data loading also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadGestionnaires = async () => {
    try {
      const users = await fetchUsers({ role: 'GESTIONNAIRE', active: true });
      setGestionnaires(users || []);
    } catch (error) {
      console.error('Gestionnaires loading error:', error);
      notify('Erreur lors du chargement des gestionnaires', 'error');
    }
  };

  const calculateWorkloadStats = async () => {
    try {
      const users = await fetchUsers({ role: 'GESTIONNAIRE', active: true });
      const stats: any = {};
      
      for (const gestionnaire of users) {
        const assignedBordereaux = await fetchTeamBordereaux(gestionnaire.id);
        const activeBordereaux = assignedBordereaux.filter((b: any) => 
          !['TRAITE', 'CLOTURE'].includes(b.statut)
        );
        
        stats[gestionnaire.id] = {
          name: gestionnaire.fullName,
          active: activeBordereaux.length,
          total: assignedBordereaux.length,
          capacity: gestionnaire.capacity || 20,
          overloaded: activeBordereaux.length > (gestionnaire.capacity || 20)
        };
      }
      
      setWorkloadStats(stats);
    } catch (error) {
      console.error('Error calculating workload stats:', error);
    }
  };

  const handleBulkAssign = async () => {
    if (!assignmentTarget || selectedBordereaux.length === 0) {
      notify('Veuillez sélectionner un gestionnaire et des bordereaux', 'warning');
      return;
    }

    try {
      const promises = selectedBordereaux.map(bordereauId =>
        assignBordereau(bordereauId, assignmentTarget)
      );

      await Promise.all(promises);
      
      notify(`${selectedBordereaux.length} bordereau(x) affecté(s) avec succès`, 'success');
      setSelectedBordereaux([]);
      setShowAssignModal(false);
      setAssignmentTarget('');
      loadData();
      onAssignmentSuccess?.();
    } catch (error) {
      notify('Erreur lors de l\'affectation', 'error');
    }
  };

  const handleReassign = async (bordereauId: string, newUserId: string, comment: string) => {
    try {
      await reassignBordereau(bordereauId, newUserId, comment);
      notify('Bordereau réaffecté avec succès', 'success');
      loadData();
      onAssignmentSuccess?.();
    } catch (error) {
      notify('Erreur lors de la réaffectation', 'error');
    }
  };

  // Chef d'équipe specific actions
  const handleRejectBordereau = async (bordereauId: string) => {
    const reason = prompt('Raison du rejet (optionnel):');
    if (reason !== null) {
      try {
        const response = await fetch('/api/workflow/chef-equipe/reject', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ bordereauId, reason })
        });
        
        if (!response.ok) {
          throw new Error('Failed to reject bordereau');
        }
        
        notify('Bordereau rejeté avec succès', 'success');
        loadData();
        onAssignmentSuccess?.();
      } catch (error) {
        notify('Erreur lors du rejet', 'error');
      }
    }
  };

  const handleSelfAssign = async (bordereauId: string) => {
    if (confirm('Voulez-vous traiter ce bordereau personnellement ?')) {
      try {
        await assignBordereau(bordereauId, user?.id || '');
        notify('Bordereau pris en charge personnellement', 'success');
        loadData();
        onAssignmentSuccess?.();
      } catch (error) {
        notify('Erreur lors de la prise en charge', 'error');
      }
    }
  };

  const handleViewDetails = (bordereauId: string) => {
    window.open(`/home/bordereaux/${bordereauId}`, '_blank');
  };

  const handleRecuperBordereau = async (bordereauId: string) => {
    const reason = prompt('Raison de la récupération (optionnel):');
    if (reason !== null) {
      try {
        const response = await fetch('/api/workflow/chef-equipe/recuperer', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ bordereauId, reason })
        });
        
        if (!response.ok) {
          throw new Error('Failed to recuperer bordereau');
        }
        
        notify('Bordereau récupéré avec succès', 'success');
        loadData();
        onAssignmentSuccess?.();
      } catch (error) {
        notify('Erreur lors de la récupération', 'error');
      }
    }
  };

  const toggleBordereauSelection = (bordereauId: string) => {
    setSelectedBordereaux(prev =>
      prev.includes(bordereauId)
        ? prev.filter(id => id !== bordereauId)
        : [...prev, bordereauId]
    );
  };

  const getTabCount = (tab: string) => {
    switch (tab) {
      case 'unassigned': return unassignedBordereaux.length;
      case 'team': return teamBordereaux.length;
      case 'processed': return processedBordereaux.length;
      default: return 0;
    }
  };

  const getCurrentBordereaux = () => {
    switch (activeTab) {
      case 'unassigned': return unassignedBordereaux;
      case 'team': return teamBordereaux;
      case 'processed': return processedBordereaux;
      default: return [];
    }
  };

  const getOverloadedGestionnaires = () => {
    return Object.values(workloadStats).filter((stat: any) => stat.overloaded);
  };

  if (loading) {
    return (
      <div className="chef-equipe-container">
        <div className="chef-equipe-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <h3 className="loading-title">Chargement de la corbeille globale</h3>
            <p className="loading-subtitle">Veuillez patienter...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chef-equipe-container">
      <div className="chef-equipe-content">
        {/* Header with Stats */}
        <div className="chef-header">
          <div className="chef-header-content">
            <h1 className="chef-title">
              <span>👨💼</span>
              Corbeille Globale - Chef d'Équipe
            </h1>
            <p className="chef-subtitle">
              Vision complète de tous les dossiers et gestion des affectations d'équipe
            </p>
          </div>

          {/* Quick Stats */}
          <div className="stats-grid">
            <div className="stat-card stat-orange">
              <div className="stat-number">{unassignedBordereaux.length}</div>
              <div className="stat-label">Non affectés</div>
            </div>
            <div className="stat-card stat-blue">
              <div className="stat-number">{teamBordereaux.length}</div>
              <div className="stat-label">En cours</div>
            </div>
            <div className="stat-card stat-green">
              <div className="stat-number">{processedBordereaux.length}</div>
              <div className="stat-label">Traités</div>
            </div>
            <div className="stat-card stat-red">
              <div className="stat-number">{getOverloadedGestionnaires().length}</div>
              <div className="stat-label">Équipes surchargées</div>
            </div>
          </div>
        </div>

        {/* Overload Alerts */}
        {getOverloadedGestionnaires().length > 0 && (
          <div className="overload-alert">
            <div className="alert-title">
              <span>⚠️</span>
              Alertes de surcharge détectées
            </div>
            <div className="alert-content">
              <ul>
                {getOverloadedGestionnaires().map((stat: any, index) => (
                  <li key={index}>
                    {stat.name}: {stat.active}/{stat.capacity} dossiers actifs
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs-container">
          <div className="tabs-nav">
            {[
              { key: 'unassigned', label: 'Non affectés', icon: '📥' },
              { key: 'team', label: 'En cours', icon: '🔄' },
              { key: 'processed', label: 'Traités', icon: '✅' }
            ].map((tab) => (
              <button
                key={tab.key}
                className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key as any)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span>{tab.label}</span>
                <span className="tab-badge">{getTabCount(tab.key)}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {/* Bulk Actions for Unassigned */}
            {activeTab === 'unassigned' && unassignedBordereaux.length > 0 && (
              <div className="bulk-actions">
                <div className="bulk-actions-info">
                  <span>Actions groupées ({selectedBordereaux.length} sélectionné(s))</span>
                  <button
                    onClick={() => setSelectedBordereaux(
                      selectedBordereaux.length === unassignedBordereaux.length 
                        ? [] 
                        : unassignedBordereaux.map(b => b.id)
                    )}
                    className="bulk-select-all"
                  >
                    {selectedBordereaux.length === unassignedBordereaux.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                </div>
                <button
                  onClick={() => setShowAssignModal(true)}
                  disabled={selectedBordereaux.length === 0}
                  className="bulk-assign-btn"
                >
                  👤 Affecter la sélection
                </button>
              </div>
            )}

            {/* Bordereaux Grid */}
            {getCurrentBordereaux().length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  {activeTab === 'unassigned' ? '📥' : activeTab === 'team' ? '🔄' : '✅'}
                </div>
                <h3 className="empty-title">
                  {activeTab === 'unassigned' ? 'Aucun bordereau non affecté' : 
                   activeTab === 'team' ? 'Aucun bordereau en cours' : 
                   'Aucun bordereau traité'}
                </h3>
                <p className="empty-description">
                  {activeTab === 'unassigned' ? 'Tous les bordereaux sont affectés' : 
                   activeTab === 'team' ? 'Aucun bordereau en cours de traitement' : 
                   'Aucun bordereau traité récemment'}
                </p>
              </div>
            ) : (
              <div className="bordereaux-grid">
                {getCurrentBordereaux().map(bordereau => (
                  <div key={bordereau.id} className="bordereau-card">
                    {activeTab === 'unassigned' && (
                      <input
                        type="checkbox"
                        checked={selectedBordereaux.includes(bordereau.id)}
                        onChange={() => toggleBordereauSelection(bordereau.id)}
                        className="bordereau-checkbox"
                      />
                    )}
                    
                    <div className="bordereau-content">
                      <div className="bordereau-header">
                        <div className="bordereau-info">
                          <h3>{bordereau.reference}</h3>
                          <p>{bordereau.clientName}</p>
                          <p>{new Date(bordereau.createdAt).toLocaleDateString()} • {bordereau.subject}</p>
                        </div>
                        <div className="bordereau-status">
                          <span className={`sla-badge sla-${bordereau.slaStatus?.toLowerCase().replace('_', '-') || 'on-time'}`}>
                            {bordereau.slaStatus}
                          </span>
                          {bordereau.assignedTo && (
                            <span className="assigned-to">👤 {bordereau.assignedTo}</span>
                          )}
                        </div>
                      </div>
                      
                      {/* CHEF D'ÉQUIPE ACTION BUTTONS */}
                      {activeTab === 'unassigned' && (
                        <div className="action-buttons">
                          <button
                            onClick={() => {
                              setSelectedBordereaux([bordereau.id]);
                              setShowAssignModal(true);
                            }}
                            className="action-btn btn-assign"
                          >
                            👤 Affecter
                          </button>
                          <button
                            onClick={() => handleRejectBordereau(bordereau.id)}
                            className="action-btn btn-reject"
                          >
                            ❌ Rejeter
                          </button>
                          <button
                            onClick={() => handleSelfAssign(bordereau.id)}
                            className="action-btn btn-self-assign"
                          >
                            ✋ Traiter
                          </button>
                        </div>
                      )}
                      
                      {/* Actions for En Cours tab */}
                      {activeTab === 'team' && (
                        <div className="action-buttons">
                          <button
                            onClick={() => handleViewDetails(bordereau.id)}
                            className="action-btn btn-view"
                          >
                            👁️ Voir Détails
                          </button>
                          <button
                            onClick={() => handleRecuperBordereau(bordereau.id)}
                            className="action-btn btn-recuperer"
                          >
                            🔄 Récupérer
                          </button>
                          <button
                            onClick={() => {
                              setSelectedBordereaux([bordereau.id]);
                              setShowAssignModal(true);
                            }}
                            className="action-btn btn-reassign"
                          >
                            🔄 Réaffecter
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Assignment Modal */}
        {showAssignModal && (
          <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">
                  Affecter {selectedBordereaux.length} bordereau(x)
                </h3>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="modal-close"
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">
                    Gestionnaire
                  </label>
                  <select
                    value={assignmentTarget}
                    onChange={(e) => setAssignmentTarget(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Sélectionner un gestionnaire...</option>
                    {gestionnaires.map(gestionnaire => {
                      const stats = workloadStats[gestionnaire.id];
                      return (
                        <option key={gestionnaire.id} value={gestionnaire.id}>
                          {gestionnaire.fullName} 
                          {stats && ` (${stats.active}/${stats.capacity})`}
                          {stats?.overloaded && ' ⚠️ SURCHARGÉ'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {assignmentTarget && workloadStats[assignmentTarget]?.overloaded && (
                  <div className="overload-alert">
                    <div className="alert-title">
                      <span>⚠️</span>
                      Attention : Gestionnaire surchargé
                    </div>
                    <div className="alert-content">
                      Ce gestionnaire a déjà {workloadStats[assignmentTarget].active} dossiers actifs.
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  onClick={handleBulkAssign}
                  disabled={!assignmentTarget}
                  className="action-btn btn-assign"
                >
                  Affecter
                </button>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="action-btn btn-view"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChefEquipeGlobalBasket;