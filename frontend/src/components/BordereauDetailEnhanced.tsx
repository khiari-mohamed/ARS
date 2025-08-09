import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchBordereau, fetchBSList, fetchDocuments, fetchVirement, fetchAlerts } from '../services/bordereauxService';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../contexts/NotificationContext';
import BordereauStatusBadge from './BordereauStatusBadge';
import BSListTable from './BSListTable';
import CourrierPanel from './CourrierPanel';
import DocumentViewer from './DocumentViewer';

const TABS = [
  { key: 'details', label: 'Détails', icon: '📋' },
  { key: 'documents', label: 'Documents (GED)', icon: '📁' },
  { key: 'activities', label: 'Activités', icon: '📊' },
  { key: 'reclamations', label: 'Réclamations', icon: '⚠️' },
  { key: 'virements', label: 'Virements', icon: '💰' }
];

const BordereauDetailEnhanced: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { notify } = useNotification();
  const [activeTab, setActiveTab] = useState('details');
  const [bordereau, setBordereau] = useState<any>(null);
  const [bsList, setBsList] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [virement, setVirement] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // Role-based permissions
  const canEdit = ['CHEF_EQUIPE', 'ADMINISTRATEUR'].includes(user?.role || '');
  const canAssign = ['CHEF_EQUIPE', 'ADMINISTRATEUR'].includes(user?.role || '');
  const canProcess = user?.role === 'GESTIONNAIRE';
  const canGenerateOV = ['FINANCE', 'ADMINISTRATEUR'].includes(user?.role || '');

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const [bordereauData, bsData, docsData, virementData, alertsData] = await Promise.all([
        fetchBordereau(id),
        fetchBSList(id),
        fetchDocuments(id),
        fetchVirement(id),
        fetchAlerts(id)
      ]);

      setBordereau(bordereauData);
      setBsList(bsData || []);
      setDocuments(docsData || []);
      setVirement(virementData);
      setAlerts(alertsData || []);
    } catch (error) {
      notify('Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !bordereau) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-500">Chargement...</div>
      </div>
    );
  }

  const renderDetailsTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Informations générales</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Client</label>
                <div className="mt-1 text-sm text-gray-900">
                  {bordereau.client?.name || bordereau.clientId}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Prestataire</label>
                <div className="mt-1 text-sm text-gray-900">
                  {bordereau.prestataire?.name || '-'}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Réf bordereau</label>
                <div className="mt-1 font-mono text-sm font-bold text-blue-900">
                  {bordereau.reference}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <div className="mt-1 text-sm text-gray-900">
                  {bordereau.type || 'BS'}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nb BS</label>
                <div className="mt-1 text-sm font-bold text-gray-900">
                  {bordereau.nombreBS}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contrat</label>
                <div className="mt-1 text-sm text-gray-900">
                  {bordereau.contract?.clientName || '-'}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Chargé de compte</label>
              <div className="mt-1 text-sm text-gray-900">
                {bordereau.contract?.assignedManager?.fullName || '-'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Suivi temporel</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date réception BO</label>
                <div className="mt-1 text-sm text-gray-900">
                  {new Date(bordereau.dateReception).toLocaleDateString('fr-FR')}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date début Scan</label>
                <div className="mt-1 text-sm text-gray-900">
                  {bordereau.dateDebutScan 
                    ? new Date(bordereau.dateDebutScan).toLocaleDateString('fr-FR')
                    : '-'
                  }
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date fin Scan</label>
                <div className="mt-1 text-sm text-gray-900">
                  {bordereau.dateFinScan 
                    ? new Date(bordereau.dateFinScan).toLocaleDateString('fr-FR')
                    : '-'
                  }
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date réception équipe Santé</label>
                <div className="mt-1 text-sm text-gray-900">
                  {bordereau.dateReceptionSante 
                    ? new Date(bordereau.dateReceptionSante).toLocaleDateString('fr-FR')
                    : '-'
                  }
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date réelle de clôture</label>
                <div className="mt-1 text-sm text-gray-900">
                  {bordereau.dateCloture 
                    ? new Date(bordereau.dateCloture).toLocaleDateString('fr-FR')
                    : '-'
                  }
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date limite</label>
                <div className="mt-1 text-sm font-bold">
                  <span className={
                    bordereau.statusColor === 'RED' 
                      ? 'text-red-600'
                      : bordereau.statusColor === 'ORANGE'
                      ? 'text-orange-600'
                      : 'text-green-600'
                  }>
                    {bordereau.daysRemaining} jours
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">SLA status</label>
                <div className="mt-1">
                  <BordereauStatusBadge statut={bordereau.statut} color={bordereau.statusColor} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Assigned team/user</label>
                <div className="mt-1 text-sm text-gray-900">
                  {bordereau.currentHandler?.fullName || bordereau.team?.fullName || '-'}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Rendement estimé</label>
              <div className="mt-1 text-sm text-gray-900">
                {bordereau.rendement || 'Non calculé'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDocumentsTab = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Documents scannés</h3>
          {canEdit && (
            <button className="btn-primary">
              📁 Ajouter document
            </button>
          )}
        </div>
      </div>
      <div className="p-6">
        {documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📄</div>
            <div>Aucun document attaché</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div key={doc.id} className="border rounded-lg p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-medium text-sm truncate">{doc.name}</div>
                    <div className="text-xs text-gray-500">{doc.type}</div>
                  </div>
                  <div className="ml-2">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      👁️ Voir
                    </button>
                  </div>
                </div>
                {doc.ocrResult && (
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    OCR: {doc.ocrResult.confidence}% confiance
                  </div>
                )}
                <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                  <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                  <div className="flex gap-1">
                    <button className="text-blue-600 hover:text-blue-800">📥 Télécharger</button>
                    <button className="text-green-600 hover:text-green-800">🔄 Re-ingest</button>
                    <button className="text-orange-600 hover:text-orange-800">🏷️ Tag</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderActivitiesTab = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold">Flux d'activités</h3>
      </div>
      <div className="p-6">
        {bordereau.traitementHistory && bordereau.traitementHistory.length > 0 ? (
          <div className="space-y-4">
            {bordereau.traitementHistory.map((activity: any, index: number) => (
              <div key={activity.id || index} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-b-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-medium">
                  {activity.user?.fullName?.charAt(0) || 'S'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{activity.user?.fullName || 'Système'}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(activity.createdAt).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700">{activity.action}</div>
                  {activity.toStatus && (
                    <div className="text-xs text-gray-500 mt-1">
                      Statut: {activity.fromStatus} → {activity.toStatus}
                    </div>
                  )}
                  {activity.assignedTo && (
                    <div className="text-xs text-gray-500 mt-1">
                      Assigné à: {activity.assignedTo.fullName}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📊</div>
            <div>Aucune activité enregistrée</div>
          </div>
        )}
      </div>
    </div>
  );

  const renderVirementsTab = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Ordre de Virement (OV)</h3>
          {canGenerateOV && !virement && (
            <button className="btn-primary">
              💰 Générer OV
            </button>
          )}
        </div>
      </div>
      <div className="p-6">
        {virement ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">OV #</label>
                <div className="mt-1 font-mono text-sm font-bold">{virement.id}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Statut</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    virement.confirmed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {virement.confirmed ? 'Confirmé' : 'En attente'}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Montant total</label>
                <div className="mt-1 text-lg font-bold text-green-600">
                  {virement.montant.toFixed(2)} €
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Référence bancaire</label>
                <div className="mt-1 font-mono text-sm">{virement.referenceBancaire}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date dépôt</label>
                <div className="mt-1 text-sm">
                  {new Date(virement.dateDepot).toLocaleDateString('fr-FR')}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date exécution</label>
                <div className="mt-1 text-sm">
                  {new Date(virement.dateExecution).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <button className="btn-secondary">📄 PDF</button>
              <button className="btn-secondary">📝 TXT</button>
              {!virement.confirmed && (
                <button className="btn-success">✅ Confirmer</button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">💰</div>
            <div>Aucun virement généré</div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  Bordereau — {bordereau.reference}
                </h1>
                <BordereauStatusBadge statut={bordereau.statut} color={bordereau.statusColor} />
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span>Client: {bordereau.client?.name || bordereau.clientId}</span>
                <span>Contrat: {bordereau.contract?.clientName || '-'}</span>
                <span>Gestionnaire: {bordereau.currentHandler?.fullName || '-'}</span>
                <span>Date réception: {new Date(bordereau.dateReception).toLocaleDateString('fr-FR')}</span>
                <span className={`font-medium ${
                  bordereau.statusColor === 'RED' 
                    ? 'text-red-600'
                    : bordereau.statusColor === 'ORANGE'
                    ? 'text-orange-600'
                    : 'text-green-600'
                }`}>
                  Deadline: {bordereau.daysRemaining} jours
                </span>
              </div>
              <div className="flex gap-2 mt-3 text-sm">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">nb BS: {bordereau.nombreBS}</span>
                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">montant total: {bordereau.montant || 'N/A'}</span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2 ml-6">
              {canAssign && (
                <button className="btn-primary">👤 Affecter</button>
              )}
              {canGenerateOV && (
                <button className="btn-success">💰 Générer OV</button>
              )}
              <button className="btn-secondary">📝 Ajouter note</button>
              <button className="btn-secondary">📥 Télécharger PDF</button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - 70%/30% Layout */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Column (70%) */}
          <div className="lg:col-span-3">
            {/* Tabs */}
            <div className="bg-white rounded-t-lg shadow-sm">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {TABS.map((tab) => (
                    <button
                      key={tab.key}
                      className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.key
                          ? 'border-blue-600 text-blue-700'
                          : 'border-transparent text-gray-500 hover:text-blue-600 hover:border-gray-300'
                      }`}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      <span className="mr-2">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-b-lg shadow-sm p-6">
              {activeTab === 'details' && renderDetailsTab()}
              {activeTab === 'documents' && renderDocumentsTab()}
              {activeTab === 'activities' && renderActivitiesTab()}
              {activeTab === 'reclamations' && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">⚠️</div>
                  <div>Module réclamations à implémenter</div>
                </div>
              )}
              {activeTab === 'virements' && renderVirementsTab()}
            </div>
          </div>

          {/* Side Panel (30%) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow p-4">
              <h4 className="font-semibold text-sm text-gray-700 mb-3">Statistiques rapides</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Temps écoulé</span>
                  <span className="font-medium">{bordereau.daysElapsed} j</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Durée scan</span>
                  <span className="font-medium">{bordereau.scanDuration || '-'} j</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Durée totale</span>
                  <span className="font-medium">{bordereau.totalDuration || '-'} j</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Retard</span>
                  <span className={`font-medium ${bordereau.isOverdue ? 'text-red-600' : 'text-green-600'}`}>
                    {bordereau.isOverdue ? 'Oui' : 'Non'}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Alerts */}
            {alerts.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4">
                <h4 className="font-semibold text-sm text-gray-700 mb-3">Alertes récentes</h4>
                <div className="space-y-2">
                  {alerts.slice(0, 3).map((alert) => (
                    <div key={alert.id} className="text-xs p-2 bg-red-50 border border-red-200 rounded">
                      <div className="font-medium text-red-800">{alert.alertType}</div>
                      <div className="text-red-600">{alert.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-4">
              <h4 className="font-semibold text-sm text-gray-700 mb-3">Actions rapides</h4>
              <div className="space-y-2">
                {canProcess && (
                  <>
                    <button className="w-full btn-success text-sm">✅ Marquer traité</button>
                    <button className="w-full btn-warning text-sm">↩️ Retourner chef</button>
                  </>
                )}
                <button className="w-full btn-secondary text-sm">📧 Envoyer courrier</button>
                <button className="w-full btn-secondary text-sm">📋 Voir historique</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .btn-primary, .btn-secondary, .btn-success, .btn-warning {
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
        
        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }
        
        .btn-success {
          background-color: #198754;
          color: white;
        }
        
        .btn-warning {
          background-color: #fd7e14;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default BordereauDetailEnhanced;