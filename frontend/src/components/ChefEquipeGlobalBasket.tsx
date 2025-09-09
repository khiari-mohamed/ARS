import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { 
  fetchUnassignedBordereaux, 
  fetchTeamBordereaux, 
  assignBordereau,
  reassignBordereau 
} from '../services/bordereauxService';
import { fetchUsers } from '../services/bordereauxService';
import BordereauCard from './BordereauCard';

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
      const [unassigned, team] = await Promise.all([
        fetchUnassignedBordereaux(),
        fetchTeamBordereaux(user?.id || '')
      ]);

      setUnassignedBordereaux(unassigned);
      
      // Separate team bordereaux by status
      const teamData = team || [];
      setTeamBordereaux(teamData.filter((b: any) => !['TRAITE', 'CLOTURE'].includes(b.statut)));
      setProcessedBordereaux(teamData.filter((b: any) => ['TRAITE', 'CLOTURE'].includes(b.statut)));
      
      // Calculate workload stats
      await calculateWorkloadStats();
    } catch (error) {
      notify('Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadGestionnaires = async () => {
    try {
      const users = await fetchUsers({ role: 'GESTIONNAIRE', active: true });
      setGestionnaires(users);
    } catch (error) {
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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Chargement de la corbeille globale...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <span className="mr-2">📋</span>
            Corbeille Globale - Chef d'Équipe
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Vision complète de tous les dossiers et gestion des affectations
          </p>
        </div>

        {/* Quick Stats */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{unassignedBordereaux.length}</div>
              <div className="text-sm text-gray-600">Non affectés</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{teamBordereaux.length}</div>
              <div className="text-sm text-gray-600">En cours</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{processedBordereaux.length}</div>
              <div className="text-sm text-gray-600">Traités</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{getOverloadedGestionnaires().length}</div>
              <div className="text-sm text-gray-600">Équipes surchargées</div>
            </div>
          </div>
        </div>

        {/* Overload Alerts */}
        {getOverloadedGestionnaires().length > 0 && (
          <div className="px-6 py-4 bg-red-50 border-t border-red-200">
            <div className="flex items-start">
              <span className="text-red-500 mr-2">⚠️</span>
              <div className="text-sm text-red-700">
                <p className="font-medium mb-1">Alertes de surcharge détectées :</p>
                <ul className="list-disc list-inside space-y-1">
                  {getOverloadedGestionnaires().map((stat: any, index) => (
                    <li key={index}>
                      {stat.name}: {stat.active}/{stat.capacity} dossiers actifs
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'unassigned', label: 'Non affectés', icon: '📥' },
              { key: 'team', label: 'En cours', icon: '🔄' },
              { key: 'processed', label: 'Traités', icon: '✅' }
            ].map((tab) => (
              <button
                key={tab.key}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-blue-600 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab(tab.key as any)}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label} ({getTabCount(tab.key)})
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Bulk Actions for Unassigned */}
          {activeTab === 'unassigned' && unassignedBordereaux.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-blue-700">
                    Actions groupées ({selectedBordereaux.length} sélectionné(s))
                  </span>
                  <button
                    onClick={() => setSelectedBordereaux(
                      selectedBordereaux.length === unassignedBordereaux.length 
                        ? [] 
                        : unassignedBordereaux.map(b => b.id)
                    )}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {selectedBordereaux.length === unassignedBordereaux.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                </div>
                <button
                  onClick={() => setShowAssignModal(true)}
                  disabled={selectedBordereaux.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  👤 Affecter la sélection
                </button>
              </div>
            </div>
          )}

          {/* Bordereaux Grid */}
          {getCurrentBordereaux().length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">
                {activeTab === 'unassigned' ? '📥' : activeTab === 'team' ? '🔄' : '✅'}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {activeTab === 'unassigned' ? 'Aucun bordereau non affecté' : 
                 activeTab === 'team' ? 'Aucun bordereau en cours' : 
                 'Aucun bordereau traité'}
              </h3>
              <p className="text-gray-500">
                {activeTab === 'unassigned' ? 'Tous les bordereaux sont affectés' : 
                 activeTab === 'team' ? 'Aucun bordereau en cours de traitement' : 
                 'Aucun bordereau traité récemment'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getCurrentBordereaux().map(bordereau => (
                <div key={bordereau.id} className="relative">
                  {activeTab === 'unassigned' && (
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedBordereaux.includes(bordereau.id)}
                        onChange={() => toggleBordereauSelection(bordereau.id)}
                        className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                  )}
                  <BordereauCard
                    bordereau={bordereau}
                    onAssignSuccess={() => {
                      loadData();
                      onAssignmentSuccess?.();
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAssignModal(false)}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Affecter {selectedBordereaux.length} bordereau(x)
                  </h3>
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Fermer</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gestionnaire
                    </label>
                    <select
                      value={assignmentTarget}
                      onChange={(e) => setAssignmentTarget(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex">
                        <span className="text-red-400 mr-2">⚠️</span>
                        <div className="text-sm text-red-700">
                          <p className="font-medium">Attention : Gestionnaire surchargé</p>
                          <p>Ce gestionnaire a déjà {workloadStats[assignmentTarget].active} dossiers actifs.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleBulkAssign}
                  disabled={!assignmentTarget}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Affecter
                </button>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChefEquipeGlobalBasket;