import React, { useState, useEffect } from 'react';
import { fetchBordereaux } from '../services/bordereauxService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface RecentEntry {
  id: string;
  reference: string;
  client: { name: string } | null;
  dateReception: string;
  nombreBS: number;
  statut: string;
  delaiReglement: number;
}

const RecentEntriesTable: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [entries, setEntries] = useState<RecentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentEntries();
  }, []);

  const loadRecentEntries = async () => {
    setLoading(true);
    try {
      // Fetch recent bordereaux (last 10)
      const response = await fetchBordereaux({ 
        page: 1, 
        pageSize: 10,
        sortBy: 'dateReception',
        sortOrder: 'desc'
      });
      
      const data = response.items || response;
      setEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      notify('Erreur lors du chargement des entrées récentes', 'error');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const calculateDaysRemaining = (entry: RecentEntry) => {
    if (!entry.dateReception || !entry.delaiReglement) return 0;
    
    const receptionDate = new Date(entry.dateReception);
    const today = new Date();
    const daysElapsed = Math.floor((today.getTime() - receptionDate.getTime()) / (1000 * 60 * 60 * 24));
    return entry.delaiReglement - daysElapsed;
  };

  const getStatusInfo = (entry: RecentEntry) => {
    const daysRemaining = calculateDaysRemaining(entry);
    const isOverdue = daysRemaining < 0;
    const isAtRisk = daysRemaining <= 3 && daysRemaining >= 0;

    let statusColor = 'text-green-600';
    let statusText = 'OK';
    let bgColor = 'bg-green-50';

    if (isOverdue) {
      statusColor = 'text-red-600';
      statusText = 'En retard';
      bgColor = 'bg-red-50';
    } else if (isAtRisk) {
      statusColor = 'text-yellow-600';
      statusText = 'À risque';
      bgColor = 'bg-yellow-50';
    }

    // Override with actual status if available
    const actualStatus = getActualStatus(entry.statut);
    if (actualStatus) {
      statusText = actualStatus.text;
      statusColor = actualStatus.color;
      bgColor = actualStatus.bg;
    }

    return { statusColor, statusText, bgColor, daysRemaining };
  };

  const getActualStatus = (statut: string) => {
    const statusMap: Record<string, { text: string; color: string; bg: string }> = {
      'EN_ATTENTE': { text: 'En attente', color: 'text-gray-600', bg: 'bg-gray-50' },
      'A_SCANNER': { text: 'À scanner', color: 'text-orange-600', bg: 'bg-orange-50' },
      'SCAN_EN_COURS': { text: 'Scan en cours', color: 'text-blue-600', bg: 'bg-blue-50' },
      'SCANNE': { text: 'Scanné', color: 'text-indigo-600', bg: 'bg-indigo-50' },
      'A_AFFECTER': { text: 'À affecter', color: 'text-purple-600', bg: 'bg-purple-50' },
      'ASSIGNE': { text: 'Assigné', color: 'text-purple-600', bg: 'bg-purple-50' },
      'EN_COURS': { text: 'En cours', color: 'text-yellow-600', bg: 'bg-yellow-50' },
      'TRAITE': { text: 'Traité', color: 'text-green-600', bg: 'bg-green-50' },
      'PRET_VIREMENT': { text: 'Prêt virement', color: 'text-teal-600', bg: 'bg-teal-50' },
      'VIREMENT_EN_COURS': { text: 'Virement en cours', color: 'text-cyan-600', bg: 'bg-cyan-50' },
      'VIREMENT_EXECUTE': { text: 'Virement exécuté', color: 'text-emerald-600', bg: 'bg-emerald-50' },
      'VIREMENT_REJETE': { text: 'Virement rejeté', color: 'text-red-600', bg: 'bg-red-50' },
      'CLOTURE': { text: 'Clôturé', color: 'text-gray-600', bg: 'bg-gray-50' },
      'EN_DIFFICULTE': { text: 'En difficulté', color: 'text-red-600', bg: 'bg-red-50' },
      'PARTIEL': { text: 'Partiel', color: 'text-amber-600', bg: 'bg-amber-50' }
    };

    return statusMap[statut] || null;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Entrées Récentes</h3>
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Entrées Récentes</h3>
        <button
          onClick={loadRecentEntries}
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          🔄 Actualiser
        </button>
      </div>
      
      {entries.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          Aucune entrée récente trouvée
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Référence
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  BS
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SLA
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry) => {
                const statusInfo = getStatusInfo(entry);
                return (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entry.reference}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.client?.name || 'N/A'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(entry.dateReception)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.nombreBS}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.statusColor}`}>
                        {statusInfo.statusText}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        statusInfo.daysRemaining < 0 
                          ? 'bg-red-100 text-red-800'
                          : statusInfo.daysRemaining <= 3
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {statusInfo.daysRemaining < 0 
                          ? `+${Math.abs(statusInfo.daysRemaining)}j`
                          : `J-${statusInfo.daysRemaining}`
                        }
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RecentEntriesTable;