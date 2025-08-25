import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface BordereauCorbeilleModalProps {
  bordereaux: any[];
  onClose: () => void;
  onFilterChange: (filters: any) => void;
  getSLAStatus: (bordereau: any) => any;
}

const BordereauCorbeilleModal: React.FC<BordereauCorbeilleModalProps> = ({ 
  bordereaux, 
  onClose, 
  onFilterChange,
  getSLAStatus 
}) => {
  const { user } = useAuth();
  
  const isChefEquipe = user?.role === 'CHEF_EQUIPE';
  const isGestionnaire = user?.role === 'GESTIONNAIRE';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const handleQuickFilter = (filters: any) => {
    console.log('🔍 Corbeille: Applying filter:', filters);
    console.log('🔍 Corbeille: Calling onFilterChange...');
    onFilterChange(filters);
    console.log('🔍 Corbeille: Closing modal...');
    onClose();
  };

  return (
    <div className="bordereau-details-modal">
      <div className="bordereau-details-content" style={{maxWidth: '1200px'}}>
        <div className="bordereau-details-header">
          <h2 className="bordereau-details-title">
            {isChefEquipe && '📂 Corbeille Chef d\'Équipe'}
            {isGestionnaire && '📋 Ma Corbeille Personnelle'}
            {isSuperAdmin && '🗂️ Corbeille Globale Super Admin'}
          </h2>
          <button
            onClick={onClose}
            className="bordereau-details-close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bordereau-details-body">
          <div className="bordereau-details-section">
            <h3>📊 Vue d'ensemble</h3>
            <p className="bordereau-details-value text-sm mb-4">
              {isChefEquipe && 'Gérez les affectations et réaffectations de votre équipe'}
              {isGestionnaire && 'Vos bordereaux assignés et en cours de traitement'}
              {isSuperAdmin && 'Vue transversale - Réaffectations et gestion globale'}
            </p>

            {/* Chef d'Équipe Corbeille */}
            {isChefEquipe && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div 
                  className="bg-white p-4 rounded-lg border-l-4 border-orange-400 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleQuickFilter({statut: ['SCANNE', 'A_AFFECTER'], archived: false})}
                >
                  <div className="text-2xl font-bold text-orange-600">
                    {bordereaux.filter(b => ['SCANNE', 'A_AFFECTER'].includes(b.statut)).length}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">📋 Non affectés</div>
                  <div className="text-xs text-gray-500 mt-1">Prêts pour assignation</div>
                </div>
                <div 
                  className="bg-white p-4 rounded-lg border-l-4 border-blue-400 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleQuickFilter({statut: ['ASSIGNE', 'EN_COURS'], archived: false})}
                >
                  <div className="text-2xl font-bold text-blue-600">
                    {bordereaux.filter(b => ['ASSIGNE', 'EN_COURS'].includes(b.statut)).length}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">⚡ En cours</div>
                  <div className="text-xs text-gray-500 mt-1">Affectés - Réaffectables</div>
                </div>
                <div 
                  className="bg-white p-4 rounded-lg border-l-4 border-green-400 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleQuickFilter({statut: ['TRAITE', 'CLOTURE'], archived: false})}
                >
                  <div className="text-2xl font-bold text-green-600">
                    {bordereaux.filter(b => ['TRAITE', 'CLOTURE'].includes(b.statut)).length}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">✅ Traités</div>
                  <div className="text-xs text-gray-500 mt-1">Terminés</div>
                </div>
                <div 
                  className="bg-white p-4 rounded-lg border-l-4 border-red-400 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleQuickFilter({statut: ['EN_DIFFICULTE', 'MIS_EN_INSTANCE'], archived: false})}
                >
                  <div className="text-2xl font-bold text-red-600">
                    {bordereaux.filter(b => ['EN_DIFFICULTE', 'MIS_EN_INSTANCE'].includes(b.statut)).length}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">⚠️ Bloqués</div>
                  <div className="text-xs text-gray-500 mt-1">Nécessitent réaffectation</div>
                </div>
              </div>
            )}

            {/* Gestionnaire Corbeille */}
            {isGestionnaire && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div 
                  className="bg-white p-4 rounded-lg border-l-4 border-blue-400 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleQuickFilter({statut: ['ASSIGNE'], assignedToUserId: user?.id})}
                >
                  <div className="text-2xl font-bold text-blue-600">
                    {bordereaux.filter(b => b.statut === 'ASSIGNE' && b.assignedToUserId === user?.id).length}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">📥 Assignés à moi</div>
                  <div className="text-xs text-gray-500 mt-1">À démarrer</div>
                </div>
                <div 
                  className="bg-white p-4 rounded-lg border-l-4 border-yellow-400 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleQuickFilter({statut: ['EN_COURS'], assignedToUserId: user?.id})}
                >
                  <div className="text-2xl font-bold text-yellow-600">
                    {bordereaux.filter(b => b.statut === 'EN_COURS' && b.assignedToUserId === user?.id).length}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">⚡ En cours</div>
                  <div className="text-xs text-gray-500 mt-1">En traitement</div>
                </div>
                <div 
                  className="bg-white p-4 rounded-lg border-l-4 border-green-400 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleQuickFilter({statut: ['TRAITE'], assignedToUserId: user?.id})}
                >
                  <div className="text-2xl font-bold text-green-600">
                    {bordereaux.filter(b => b.statut === 'TRAITE' && b.assignedToUserId === user?.id).length}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">✅ Traités</div>
                  <div className="text-xs text-gray-500 mt-1">Terminés</div>
                </div>
                <div 
                  className="bg-white p-4 rounded-lg border-l-4 border-red-400 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleQuickFilter({urgentSLA: true, assignedToUserId: user?.id})}
                >
                  <div className="text-2xl font-bold text-red-600">
                    {bordereaux.filter(b => getSLAStatus(b).days <= 3 && b.assignedToUserId === user?.id).length}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">🚨 Urgences</div>
                  <div className="text-xs text-gray-500 mt-1">SLA critique</div>
                </div>
              </div>
            )}

            {/* Super Admin Corbeille Globale */}
            {isSuperAdmin && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div 
                  className="bg-white p-4 rounded-lg border-l-4 border-gray-400 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleQuickFilter({archived: false})}
                >
                  <div className="text-2xl font-bold text-gray-600">{bordereaux.length}</div>
                  <div className="text-sm text-gray-600 font-medium">📊 Total</div>
                  <div className="text-xs text-gray-500 mt-1">Tous bordereaux</div>
                </div>
                <div 
                  className="bg-white p-4 rounded-lg border-l-4 border-orange-400 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleQuickFilter({statut: ['SCANNE', 'A_AFFECTER']})}
                >
                  <div className="text-2xl font-bold text-orange-600">
                    {bordereaux.filter(b => ['SCANNE', 'A_AFFECTER'].includes(b.statut)).length}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">📋 Non affectés</div>
                  <div className="text-xs text-gray-500 mt-1">Réaffectables</div>
                </div>
                <div 
                  className="bg-white p-4 rounded-lg border-l-4 border-blue-400 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleQuickFilter({statut: ['ASSIGNE', 'EN_COURS']})}
                >
                  <div className="text-2xl font-bold text-blue-600">
                    {bordereaux.filter(b => ['ASSIGNE', 'EN_COURS'].includes(b.statut)).length}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">⚡ En cours</div>
                  <div className="text-xs text-gray-500 mt-1">Réaffectables</div>
                </div>
                <div 
                  className="bg-white p-4 rounded-lg border-l-4 border-red-400 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleQuickFilter({statut: ['EN_DIFFICULTE', 'MIS_EN_INSTANCE']})}
                >
                  <div className="text-2xl font-bold text-red-600">
                    {bordereaux.filter(b => ['EN_DIFFICULTE', 'MIS_EN_INSTANCE'].includes(b.statut)).length}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">🚨 Bloqués</div>
                  <div className="text-xs text-gray-500 mt-1">Urgence réaffectation</div>
                </div>
                <div 
                  className="bg-white p-4 rounded-lg border-l-4 border-green-400 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleQuickFilter({statut: ['TRAITE', 'CLOTURE']})}
                >
                  <div className="text-2xl font-bold text-green-600">
                    {bordereaux.filter(b => ['TRAITE', 'CLOTURE'].includes(b.statut)).length}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">✅ Terminés</div>
                  <div className="text-xs text-gray-500 mt-1">Clôturés</div>
                </div>
              </div>
            )}

            {/* Actions rapides */}
            {(isChefEquipe || isSuperAdmin) && (
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">🚀 Actions Rapides</h4>
                <div className="flex flex-wrap gap-2">
                  <button 
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
                    onClick={() => handleQuickFilter({statut: ['SCANNE', 'A_AFFECTER']})}
                  >
                    📋 Voir non affectés
                  </button>
                  <button 
                    className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-medium hover:bg-yellow-200 transition-colors"
                    onClick={() => handleQuickFilter({statut: ['EN_COURS', 'ASSIGNE']})}
                  >
                    ⚡ Voir en cours
                  </button>
                  <button 
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
                    onClick={() => handleQuickFilter({statut: ['EN_DIFFICULTE', 'MIS_EN_INSTANCE']})}
                  >
                    🚨 Voir bloqués
                  </button>
                  <button 
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                    onClick={() => handleQuickFilter({archived: false})}
                  >
                    🔄 Tout afficher
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ✖ Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default BordereauCorbeilleModal;