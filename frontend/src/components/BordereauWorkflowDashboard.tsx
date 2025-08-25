import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { fetchBordereaux, getPerformanceAnalytics } from '../services/bordereauxService';

interface WorkflowStats {
  bureauOrdre: {
    total: number;
    readyForScan: number;
  };
  scanTeam: {
    toScan: number;
    scanning: number;
    completed: number;
  };
  chefEquipe: {
    toAssign: number;
    assigned: number;
    inProgress: number;
    difficulties: number;
  };
  gestionnaires: {
    assigned: number;
    inProgress: number;
    processed: number;
    instance: number;
    rejected: number;
  };
  finance: {
    readyForPayment: number;
    paymentInProgress: number;
    paymentExecuted: number;
    paymentRejected: number;
  };
  global: {
    total: number;
    closed: number;
  };
}

const BordereauWorkflowDashboard: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Role checks
  const isBureauOrdre = user?.role === 'BO';
  const isScanTeam = user?.role === 'SCAN_TEAM';
  const isChefEquipe = user?.role === 'CHEF_EQUIPE';
  const isGestionnaire = user?.role === 'GESTIONNAIRE';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdministrateur = user?.role === 'ADMINISTRATEUR';

  useEffect(() => {
    loadWorkflowStats();
  }, []);

  const loadWorkflowStats = async () => {
    setLoading(true);
    try {
      // Mock workflow statistics - in production this would come from the workflow engine
      const mockStats: WorkflowStats = {
        bureauOrdre: {
          total: 15,
          readyForScan: 8
        },
        scanTeam: {
          toScan: 8,
          scanning: 3,
          completed: 12
        },
        chefEquipe: {
          toAssign: 12,
          assigned: 25,
          inProgress: 18,
          difficulties: 4
        },
        gestionnaires: {
          assigned: 25,
          inProgress: 18,
          processed: 45,
          instance: 3,
          rejected: 2
        },
        finance: {
          readyForPayment: 45,
          paymentInProgress: 12,
          paymentExecuted: 156,
          paymentRejected: 3
        },
        global: {
          total: 234,
          closed: 156
        }
      };
      
      setStats(mockStats);
    } catch (error) {
      notify('Erreur lors du chargement des statistiques', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Chargement du tableau de bord...</span>
      </div>
    );
  }

  if (!stats) return null;

  const renderBureauOrdreView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📥 Bureau d'Ordre</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
            <span className="text-sm font-medium">Total bordereaux créés</span>
            <span className="text-xl font-bold text-blue-600">{stats.bureauOrdre.total}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
            <span className="text-sm font-medium">Prêts pour scan</span>
            <span className="text-xl font-bold text-orange-600">{stats.bureauOrdre.readyForScan}</span>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🎯 Actions Disponibles</h3>
        <div className="space-y-2">
          <button className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded transition-colors">
            ➕ Enregistrer nouveau bordereau
          </button>
          <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded transition-colors">
            👁️ Voir bordereaux créés
          </button>
          <button className="w-full text-left p-3 bg-orange-50 hover:bg-orange-100 rounded transition-colors">
            📤 Envoyer au scan
          </button>
        </div>
      </div>
    </div>
  );

  const renderScanTeamView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🖨️ Service SCAN</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
            <span className="text-sm font-medium">À scanner</span>
            <span className="text-xl font-bold text-orange-600">{stats.scanTeam.toScan}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
            <span className="text-sm font-medium">Scan en cours</span>
            <span className="text-xl font-bold text-blue-600">{stats.scanTeam.scanning}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-green-50 rounded">
            <span className="text-sm font-medium">Scannés</span>
            <span className="text-xl font-bold text-green-600">{stats.scanTeam.completed}</span>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🎯 Actions Disponibles</h3>
        <div className="space-y-2">
          <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded transition-colors">
            📂 Importer scan
          </button>
          <button className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded transition-colors">
            ✅ Marquer comme scanné
          </button>
          <button className="w-full text-left p-3 bg-red-50 hover:bg-red-100 rounded transition-colors">
            🚨 Signaler surcharge
          </button>
        </div>
      </div>
    </div>
  );

  const renderChefEquipeView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">👨💼 Corbeille Chef d'Équipe</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
            <span className="text-sm font-medium">À affecter</span>
            <span className="text-xl font-bold text-purple-600">{stats.chefEquipe.toAssign}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
            <span className="text-sm font-medium">Assignés</span>
            <span className="text-xl font-bold text-blue-600">{stats.chefEquipe.assigned}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
            <span className="text-sm font-medium">En cours</span>
            <span className="text-xl font-bold text-yellow-600">{stats.chefEquipe.inProgress}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-red-50 rounded">
            <span className="text-sm font-medium">En difficulté</span>
            <span className="text-xl font-bold text-red-600">{stats.chefEquipe.difficulties}</span>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🎯 Actions Disponibles</h3>
        <div className="space-y-2">
          <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded transition-colors">
            👥 Assigner bordereaux
          </button>
          <button className="w-full text-left p-3 bg-orange-50 hover:bg-orange-100 rounded transition-colors">
            ↩️ Récupérer dossier
          </button>
          <button className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded transition-colors">
            📊 Tableau de bord équipe
          </button>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📈 Performance Équipe</h3>
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {Math.round((stats.chefEquipe.assigned + stats.chefEquipe.inProgress) / stats.chefEquipe.toAssign * 100) || 0}%
            </div>
            <div className="text-sm text-gray-600">Taux d'affectation</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {stats.chefEquipe.difficulties}
            </div>
            <div className="text-sm text-gray-600">Dossiers en difficulté</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGestionnaireView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">👩💻 Ma Corbeille Personnelle</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
            <span className="text-sm font-medium">Assignés à moi</span>
            <span className="text-xl font-bold text-blue-600">{stats.gestionnaires.assigned}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
            <span className="text-sm font-medium">En cours</span>
            <span className="text-xl font-bold text-yellow-600">{stats.gestionnaires.inProgress}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-green-50 rounded">
            <span className="text-sm font-medium">Traités</span>
            <span className="text-xl font-bold text-green-600">{stats.gestionnaires.processed}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
            <span className="text-sm font-medium">En instance</span>
            <span className="text-xl font-bold text-orange-600">{stats.gestionnaires.instance}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-red-50 rounded">
            <span className="text-sm font-medium">Rejetés</span>
            <span className="text-xl font-bold text-red-600">{stats.gestionnaires.rejected}</span>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🎯 Actions Disponibles</h3>
        <div className="space-y-2">
          <button className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded transition-colors">
            ✅ Marquer comme traité
          </button>
          <button className="w-full text-left p-3 bg-yellow-50 hover:bg-yellow-100 rounded transition-colors">
            ⏸️ Mettre en instance
          </button>
          <button className="w-full text-left p-3 bg-red-50 hover:bg-red-100 rounded transition-colors">
            ❌ Rejeter
          </button>
          <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded transition-colors">
            🔄 Renvoyer au chef
          </button>
        </div>
      </div>
    </div>
  );

  const renderSuperAdminView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🔑 Vue Globale</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
            <span className="text-sm font-medium">Total bordereaux</span>
            <span className="text-xl font-bold text-blue-600">{stats.global.total}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-green-50 rounded">
            <span className="text-sm font-medium">Clôturés</span>
            <span className="text-xl font-bold text-green-600">{stats.global.closed}</span>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📥 Bureau d'Ordre</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm">Total</span>
            <span className="font-semibold">{stats.bureauOrdre.total}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Prêts scan</span>
            <span className="font-semibold">{stats.bureauOrdre.readyForScan}</span>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🖨️ Service SCAN</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm">À scanner</span>
            <span className="font-semibold">{stats.scanTeam.toScan}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">En cours</span>
            <span className="font-semibold">{stats.scanTeam.scanning}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Terminés</span>
            <span className="font-semibold">{stats.scanTeam.completed}</span>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">👥 Équipes Santé</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm">À affecter</span>
            <span className="font-semibold">{stats.chefEquipe.toAssign}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">En cours</span>
            <span className="font-semibold">{stats.chefEquipe.inProgress}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Difficultés</span>
            <span className="font-semibold text-red-600">{stats.chefEquipe.difficulties}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {isBureauOrdre && '📥 Tableau de Bord - Bureau d\'Ordre'}
          {isScanTeam && '🖨️ Tableau de Bord - Service SCAN'}
          {isChefEquipe && '👨💼 Tableau de Bord - Chef d\'Équipe'}
          {isGestionnaire && '👩💻 Tableau de Bord - Gestionnaire'}
          {isSuperAdmin && '🔑 Tableau de Bord - Super Admin'}
          {isAdministrateur && '⚙️ Tableau de Bord - Administrateur'}
        </h1>
        <p className="text-gray-600 mt-2">
          Vue d'ensemble de votre workflow et actions disponibles
        </p>
      </div>

      {isBureauOrdre && renderBureauOrdreView()}
      {isScanTeam && renderScanTeamView()}
      {isChefEquipe && renderChefEquipeView()}
      {isGestionnaire && renderGestionnaireView()}
      {(isSuperAdmin || isAdministrateur) && renderSuperAdminView()}
    </div>
  );
};

export default BordereauWorkflowDashboard;