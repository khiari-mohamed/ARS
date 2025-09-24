import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { createBordereau } from '../services/bordereauxService';
import { fetchClients } from '../services/clientService';
import { fetchContractsByClient } from '../services/contractService';
import DocumentUploadPortal from './DocumentUploadPortal';

const BOWorkflowInterface: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [clients, setClients] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    reference: '',
    clientId: '',
    contractId: '',
    nombreBS: 1,
    delaiReglement: 30,
    dateReception: new Date().toISOString().split('T')[0],
    typeDocument: 'BS',
    gestionnaire: '',
    observations: ''
  });

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (formData.clientId) {
      loadContracts(formData.clientId);
    }
  }, [formData.clientId]);

  const loadClients = async () => {
    try {
      const data = await fetchClients();
      setClients(data);
    } catch (error) {
      notify('Erreur lors du chargement des clients', 'error');
    }
  };

  const loadContracts = async (clientId: string) => {
    try {
      const data = await fetchContractsByClient(clientId);
      setContracts(data);
      
      // Auto-select contract if only one exists
      if (data.length === 1) {
        const contract = data[0];
        setFormData(prev => ({
          ...prev,
          contractId: contract.id,
          delaiReglement: contract.delaiReglement || prev.delaiReglement,
          gestionnaire: contract.assignedManager?.fullName || ''
        }));
      }
    } catch (error) {
      notify('Erreur lors du chargement des contrats', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const bordereauData = {
        reference: formData.reference,
        dateReception: formData.dateReception,
        clientId: formData.clientId,
        contractId: formData.contractId || undefined,
        delaiReglement: formData.delaiReglement,
        nombreBS: formData.nombreBS,
        statut: 'A_SCANNER', // BO creates → ready for SCAN
        createdBy: user?.id
      };

      await createBordereau(bordereauData);
      
      notify('Bordereau créé avec succès! Notification envoyée à l\'équipe SCAN.', 'success');
      
      // Reset form
      setFormData({
        reference: '',
        clientId: '',
        contractId: '',
        nombreBS: 1,
        delaiReglement: 30,
        dateReception: new Date().toISOString().split('T')[0],
        typeDocument: 'BS',
        gestionnaire: '',
        observations: ''
      });
      setContracts([]);
    } catch (error: any) {
      notify(error.response?.data?.message || 'Erreur lors de la création', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="mr-3">📋</span>
              Bureau d'Ordre (BO)
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Saisie des informations liées aux dossiers reçus physiquement
            </p>
          </div>

          {/* Workflow Steps */}
          <div className="px-6 py-4 bg-blue-50 border-b border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-blue-600">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold mr-2">1</div>
                <span className="font-medium">BO - Saisie dossier</span>
              </div>
              <div className="flex-1 h-1 mx-4 bg-gray-200 rounded">
                <div className="h-full bg-blue-500 rounded w-1/4"></div>
              </div>
              <div className="flex items-center text-gray-400">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center font-bold mr-2">2</div>
                <span>SCAN - Numérisation</span>
              </div>
              <div className="flex-1 h-1 mx-4 bg-gray-200 rounded"></div>
              <div className="flex items-center text-gray-400">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center font-bold mr-2">3</div>
                <span>Chef - Affectation</span>
              </div>
              <div className="flex-1 h-1 mx-4 bg-gray-200 rounded"></div>
              <div className="flex items-center text-gray-400">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center font-bold mr-2">4</div>
                <span>Gestionnaire - Traitement</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Nouveau dossier</h2>
            <p className="text-sm text-gray-600">Remplissez les informations du dossier reçu</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de fichier *
                </label>
                <select
                  name="typeDocument"
                  value={formData.typeDocument}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="BS">BS (Bulletin de Soin)</option>
                  <option value="ADHESION">Adhésion</option>
                  <option value="CONTRAT">Contrat</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de fichiers reçus *
                </label>
                <input
                  type="number"
                  name="nombreBS"
                  value={formData.nombreBS}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Référence du bordereau *
                </label>
                <input
                  type="text"
                  name="reference"
                  value={formData.reference}
                  onChange={handleInputChange}
                  placeholder="BORD-2024-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de réception *
                </label>
                <input
                  type="date"
                  name="dateReception"
                  value={formData.dateReception}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Client Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client (Compagnie d'assurances) *
                </label>
                <select
                  name="clientId"
                  value={formData.clientId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Sélectionner un client...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contrat
                </label>
                <select
                  name="contractId"
                  value={formData.contractId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!formData.clientId}
                >
                  <option value="">Sélectionner un contrat...</option>
                  {contracts.map(contract => (
                    <option key={contract.id} value={contract.id}>
                      {contract.name || contract.clientName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Délais contractuels de règlement (jours) *
                </label>
                <input
                  type="number"
                  name="delaiReglement"
                  value={formData.delaiReglement}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chargé de compte associé
                </label>
                <input
                  type="text"
                  name="gestionnaire"
                  value={formData.gestionnaire}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  placeholder="Auto-rempli depuis le contrat"
                  readOnly
                />
              </div>
            </div>

            {/* Observations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observations
              </label>
              <textarea
                name="observations"
                value={formData.observations}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Observations particulières sur le dossier..."
              />
            </div>

            {/* Workflow Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <span className="text-blue-500 mr-2">ℹ️</span>
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">Processus automatique après saisie :</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>✅ Notification automatique envoyée à l'équipe SCAN</li>
                    <li>🔄 Affectation automatique selon le chargé de compte</li>
                    <li>⏰ Suivi des délais et alertes SLA</li>
                    <li>📊 Progression automatique du workflow</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                📁 Upload Documents
              </button>
              
              {/* COMMENTED OUT: Redundant scan workflow trigger - Use SCAN Dashboard instead */}
              <button
                type="submit"
                disabled={loading || !formData.reference || !formData.clientId}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                    Création...
                  </>
                ) : (
                  '✅ Créer le bordereau'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <DocumentUploadPortal
            open={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            onSuccess={() => {
              setShowUploadModal(false);
              notify('Documents uploadés avec succès', 'success');
            }}
          />
        )}
      </div>
    </div>
  );
};

export default BOWorkflowInterface;