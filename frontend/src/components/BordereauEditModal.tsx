import React, { useState, useEffect } from 'react';
import { updateBordereau, fetchBordereau } from '../services/bordereauxService';
import { fetchClients } from '../services/clientService';
import { fetchContracts } from '../services/contractService';
import { useNotification } from '../contexts/NotificationContext';

interface BordereauEditModalProps {
  bordereauxId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BordereauEditModal: React.FC<BordereauEditModalProps> = ({
  bordereauxId,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);
  const [bordereau, setBordereau] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    reference: '',
    clientId: '',
    contractId: '',
    nombreBS: 0,
    delaiReglement: 30,
    dateReception: '',
    dateDebutScan: '',
    dateFinScan: '',
    dateCloture: '',
    statut: '',
    observations: '',
    montantTotal: 0,
    priorite: 'NORMALE',
    typeRemboursement: 'STANDARD',
    modeTransmission: 'COURRIER',
    responsableTraitement: '',
    commentaireInterne: ''
  });

  useEffect(() => {
    if (isOpen && bordereauxId) {
      loadData();
    }
  }, [isOpen, bordereauxId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load bordereau details
      const bordereauxData = await fetchBordereau(bordereauxId);
      setBordereau(bordereauxData);
      
      // Load clients and contracts
      const [clientsData, contractsData] = await Promise.all([
        fetchClients(),
        fetchContracts()
      ]);
      
      setClients(clientsData);
      setContracts(contractsData);
      
      // Populate form with existing data
      setFormData({
        reference: bordereauxData.reference || '',
        clientId: bordereauxData.clientId || '',
        contractId: bordereauxData.contractId || '',
        nombreBS: bordereauxData.nombreBS || 0,
        delaiReglement: bordereauxData.delaiReglement || 30,
        dateReception: bordereauxData.dateReception ? bordereauxData.dateReception.split('T')[0] : '',
        dateDebutScan: bordereauxData.dateDebutScan ? bordereauxData.dateDebutScan.split('T')[0] : '',
        dateFinScan: bordereauxData.dateFinScan ? bordereauxData.dateFinScan.split('T')[0] : '',
        dateCloture: bordereauxData.dateCloture ? bordereauxData.dateCloture.split('T')[0] : '',
        statut: bordereauxData.statut || '',
        observations: bordereauxData.observations || '',
        montantTotal: bordereauxData.montantTotal || 0,
        priorite: bordereauxData.priorite || 'NORMALE',
        typeRemboursement: bordereauxData.typeRemboursement || 'STANDARD',
        modeTransmission: bordereauxData.modeTransmission || 'COURRIER',
        responsableTraitement: bordereauxData.responsableTraitement || '',
        commentaireInterne: bordereauxData.commentaireInterne || ''
      });
    } catch (error) {
      notify('Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await updateBordereau(bordereauxId, formData);
      notify('Bordereau modifié avec succès', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      notify('Erreur lors de la modification', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Modifier le bordereau {bordereau?.reference}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Fermer</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Chargement...</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Référence *
                    </label>
                    <input
                      type="text"
                      name="reference"
                      value={formData.reference}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client *
                    </label>
                    <select
                      name="clientId"
                      value={formData.clientId}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Sélectionner un client</option>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner un contrat</option>
                      {contracts.map(contract => (
                        <option key={contract.id} value={contract.id}>
                          {contract.name || contract.nom}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de BS
                    </label>
                    <input
                      type="number"
                      name="nombreBS"
                      value={formData.nombreBS}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date de réception
                    </label>
                    <input
                      type="date"
                      name="dateReception"
                      value={formData.dateReception}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date début scan
                    </label>
                    <input
                      type="date"
                      name="dateDebutScan"
                      value={formData.dateDebutScan}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date fin scan
                    </label>
                    <input
                      type="date"
                      name="dateFinScan"
                      value={formData.dateFinScan}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date de clôture
                    </label>
                    <input
                      type="date"
                      name="dateCloture"
                      value={formData.dateCloture}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Additional Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Délai de règlement (jours)
                    </label>
                    <input
                      type="number"
                      name="delaiReglement"
                      value={formData.delaiReglement}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Montant total
                    </label>
                    <input
                      type="number"
                      name="montantTotal"
                      value={formData.montantTotal}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priorité
                    </label>
                    <select
                      name="priorite"
                      value={formData.priorite}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="BASSE">Basse</option>
                      <option value="NORMALE">Normale</option>
                      <option value="HAUTE">Haute</option>
                      <option value="URGENTE">Urgente</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type de remboursement
                    </label>
                    <select
                      name="typeRemboursement"
                      value={formData.typeRemboursement}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="STANDARD">Standard</option>
                      <option value="URGENT">Urgent</option>
                      <option value="PARTIEL">Partiel</option>
                      <option value="TOTAL">Total</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mode de transmission
                    </label>
                    <select
                      name="modeTransmission"
                      value={formData.modeTransmission}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="COURRIER">Courrier</option>
                      <option value="EMAIL">Email</option>
                      <option value="PORTAIL">Portail web</option>
                      <option value="FAX">Fax</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Responsable traitement
                    </label>
                    <input
                      type="text"
                      name="responsableTraitement"
                      value={formData.responsableTraitement}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nom du responsable"
                    />
                  </div>
                </div>

                {/* Text Areas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observations
                    </label>
                    <textarea
                      name="observations"
                      value={formData.observations}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Observations générales..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Commentaire interne
                    </label>
                    <textarea
                      name="commentaireInterne"
                      value={formData.commentaireInterne}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Commentaire interne (non visible par le client)..."
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Modification...' : 'Modifier le bordereau'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BordereauEditModal;