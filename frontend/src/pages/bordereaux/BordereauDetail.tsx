import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchBordereau, progressToNextStage, sendCustomNotification, linkDocumentToBordereau } from '../../services/bordereauxService';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import BordereauWorkflowViewer from '../../components/BordereauWorkflowViewer';

const BordereauDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useNotification();
  
  const [bordereau, setBordereau] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [bulletinSoins, setBulletinSoins] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [virement, setVirement] = useState<any>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) {
      loadBordereauDetails();
    }
  }, [id]);

  const loadBordereauDetails = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const data = await fetchBordereau(id);
      setBordereau(data);
      setDocuments(data.documents || []);
      setBulletinSoins(data.bulletinSoins || []);
      setAlerts(data.alerts || []);
      setVirement(data.virement);
    } catch (error) {
      notify('Erreur lors du chargement des détails', 'error');
      navigate('/bordereaux');
    } finally {
      setLoading(false);
    }
  };

  const handleProgressToNext = async () => {
    if (!id) return;
    
    try {
      await progressToNextStage(id);
      notify('Bordereau progressé vers l\'étape suivante', 'success');
      loadBordereauDetails();
    } catch (error) {
      notify('Erreur lors de la progression', 'error');
    }
  };

  const handleSendNotification = async (message: string, recipients: string[]) => {
    if (!id) return;
    
    try {
      await sendCustomNotification(id, message, recipients);
      notify('Notification envoyée avec succès', 'success');
      setShowNotificationModal(false);
    } catch (error) {
      notify('Erreur lors de l\'envoi de la notification', 'error');
    }
  };

  const calculateDaysRemaining = () => {
    if (!bordereau?.dateReception || !bordereau?.delaiReglement) return 0;
    
    const receptionDate = new Date(bordereau.dateReception);
    const today = new Date();
    const daysElapsed = Math.floor((today.getTime() - receptionDate.getTime()) / (1000 * 60 * 60 * 24));
    return bordereau.delaiReglement - daysElapsed;
  };

  const getSLAStatus = () => {
    const daysRemaining = calculateDaysRemaining();
    if (daysRemaining < 0) return { color: 'text-red-600 bg-red-100', label: 'En retard', icon: '🔴' };
    if (daysRemaining <= 3) return { color: 'text-yellow-600 bg-yellow-100', label: 'Risque', icon: '🟡' };
    return { color: 'text-green-600 bg-green-100', label: 'OK', icon: '🟢' };
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Non défini';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des détails...</p>
        </div>
      </div>
    );
  }

  if (!bordereau) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Bordereau introuvable</h2>
          <p className="text-gray-600 mb-4">Le bordereau demandé n'existe pas ou a été supprimé.</p>
          <button
            onClick={() => navigate('/bordereaux')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  const slaStatus = getSLAStatus();
  const daysRemaining = calculateDaysRemaining();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/bordereaux')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              >
                ← Retour
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Bordereau {bordereau.reference}
                </h1>
                <p className="text-sm text-gray-600">
                  Client: {bordereau.client?.name} • Créé le {formatDate(bordereau.createdAt)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* SLA Status */}
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${slaStatus.color}`}>
                <span className="mr-1">{slaStatus.icon}</span>
                {slaStatus.label} ({daysRemaining > 0 ? `J-${daysRemaining}` : `+${Math.abs(daysRemaining)} jours`})
              </div>
              
              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={handleProgressToNext}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                >
                  Progresser
                </button>
                <button
                  onClick={() => setShowNotificationModal(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm"
                >
                  Notifier
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status and Overview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Vue d'ensemble</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{bordereau.nombreBS}</div>
                    <div className="text-sm text-gray-600">Bulletins de soins</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{bordereau.delaiReglement}j</div>
                    <div className="text-sm text-gray-600">Délai règlement</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{documents.length}</div>
                    <div className="text-sm text-gray-600">Documents</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{alerts.length}</div>
                    <div className="text-sm text-gray-600">Alertes</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: 'overview', label: 'Détails', icon: '📋' },
                    { id: 'documents', label: 'Documents', icon: '📄' },
                    { id: 'bulletins', label: 'Bulletins de soins', icon: '🏥' },
                    { id: 'history', label: 'Historique', icon: '📜' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="mr-2">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Informations générales</h3>
                        <dl className="space-y-3">
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Référence</dt>
                            <dd className="text-sm text-gray-900">{bordereau.reference}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Client</dt>
                            <dd className="text-sm text-gray-900">{bordereau.client?.name}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Contrat</dt>
                            <dd className="text-sm text-gray-900">{bordereau.contract?.name || 'Non défini'}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Statut</dt>
                            <dd className="text-sm text-gray-900">{bordereau.statut}</dd>
                          </div>
                        </dl>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Dates importantes</h3>
                        <dl className="space-y-3">
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Date réception</dt>
                            <dd className="text-sm text-gray-900">{formatDate(bordereau.dateReception)}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Date début scan</dt>
                            <dd className="text-sm text-gray-900">{formatDate(bordereau.dateDebutScan)}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Date fin scan</dt>
                            <dd className="text-sm text-gray-900">{formatDate(bordereau.dateFinScan)}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Date clôture</dt>
                            <dd className="text-sm text-gray-900">{formatDate(bordereau.dateCloture)}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  </div>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Documents ({documents.length})</h3>
                      <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm">
                        Ajouter document
                      </button>
                    </div>
                    
                    {documents.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">📄</div>
                        <p>Aucun document attaché</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {documents.map(doc => (
                          <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-2xl">📄</span>
                              <span className="text-xs text-gray-500">{doc.type}</span>
                            </div>
                            <h4 className="font-medium text-gray-900 truncate">{doc.name}</h4>
                            <p className="text-sm text-gray-500 mt-1">
                              Ajouté le {formatDate(doc.uploadedAt)}
                            </p>
                            <div className="mt-3 flex space-x-2">
                              <button className="text-blue-600 hover:text-blue-800 text-sm">Voir</button>
                              <button className="text-green-600 hover:text-green-800 text-sm">Télécharger</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Bulletins Tab */}
                {activeTab === 'bulletins' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Bulletins de soins ({bulletinSoins.length})</h3>
                    </div>
                    
                    {bulletinSoins.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">🏥</div>
                        <p>Aucun bulletin de soin</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° BS</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">État</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date soin</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {bulletinSoins.map(bs => (
                              <tr key={bs.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {bs.numBs}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    bs.etat === 'VALIDATED' ? 'bg-green-100 text-green-800' :
                                    bs.etat === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {bs.etat}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {bs.montant ? `${bs.montant}€` : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatDate(bs.dateSoin)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button className="text-blue-600 hover:text-blue-900 mr-3">Voir</button>
                                  <button className="text-green-600 hover:text-green-900">Traiter</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Historique des actions</h3>
                    <div className="space-y-4">
                      {/* Mock history data */}
                      {[
                        { action: 'Création du bordereau', user: 'Bureau d\'Ordre', date: bordereau.createdAt },
                        { action: 'Début du scan', user: 'Service SCAN', date: bordereau.dateDebutScan },
                        { action: 'Fin du scan', user: 'Service SCAN', date: bordereau.dateFinScan },
                      ].filter(item => item.date).map((item, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{item.action}</p>
                            <p className="text-xs text-gray-500">Par {item.user} • {formatDate(item.date)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Workflow */}
            <BordereauWorkflowViewer 
              currentStatus={bordereau.statut}
              showDetails={false}
            />

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
              <div className="space-y-3">
                <button
                  onClick={handleProgressToNext}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                >
                  Progresser vers l'étape suivante
                </button>
                <button
                  onClick={() => setShowNotificationModal(true)}
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm"
                >
                  Envoyer une notification
                </button>
                <button className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm">
                  Générer rapport PDF
                </button>
                <button className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm">
                  Exporter données
                </button>
              </div>
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertes actives</h3>
                <div className="space-y-3">
                  {alerts.map((alert, index) => (
                    <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-medium text-red-800">{alert.message}</p>
                      <p className="text-xs text-red-600 mt-1">{formatDate(alert.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Envoyer une notification</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const message = formData.get('message') as string;
              const recipients = (formData.get('recipients') as string).split(',').map(r => r.trim());
              handleSendNotification(message, recipients);
            }}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Message</label>
                <textarea
                  name="message"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  required
                  placeholder="Votre message..."
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Destinataires (emails séparés par des virgules)</label>
                <input
                  name="recipients"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  placeholder="email1@example.com, email2@example.com"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  onClick={() => setShowNotificationModal(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Envoyer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BordereauDetailPage;