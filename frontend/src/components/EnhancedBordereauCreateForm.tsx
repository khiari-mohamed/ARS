import React, { useState, useEffect } from "react";
import { createBordereau } from "../services/bordereauxService";
import { fetchClients, fetchClientById } from "../services/clientService";
import { fetchContractsByClient, fetchContractById, Contract } from "../services/contractService";
import { Statut } from "../utils/enums";
import { Client } from "../types/client.d";
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onSuccess: () => void;
}

const statutOptions: { value: Statut; label: string }[] = [
  { value: "EN_ATTENTE", label: "En attente" },
  { value: "A_SCANNER", label: "À scanner" },
  { value: "SCAN_EN_COURS", label: "Scan en cours" },
  { value: "SCANNE", label: "Scanné" },
  { value: "A_AFFECTER", label: "À affecter" },
];

const EnhancedBordereauCreateForm: React.FC<Props> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [reference, setReference] = useState("");
  const [dateReception, setDateReception] = useState("");
  const [clientId, setClientId] = useState("");
  const [contractId, setContractId] = useState("");
  const [delaiReglement, setDelaiReglement] = useState("");
  const [nombreBS, setNombreBS] = useState("");
  const [statut, setStatut] = useState<Statut>("A_SCANNER");
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [manager, setManager] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const canCreate = ['CLIENT_SERVICE', 'CHEF_EQUIPE', 'ADMINISTRATEUR', 'SUPER_ADMIN', 'MANAGER'].includes(user?.role || '');

  useEffect(() => {
    fetchClients().then(setClients);
    // Auto-set today's date
    setDateReception(new Date().toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (!clientId) {
      setContracts([]);
      setContractId("");
      setDelaiReglement("");
      setManager("");
      return;
    }
    
    fetchContractsByClient(clientId).then((data) => {
      setContracts(data);
      if (data.length === 1) {
        setContractId(data[0].id.toString());
        setDelaiReglement(data[0].delaiReglement?.toString() || "");
        setManager(data[0].assignedManagerId || "");
      }
    });
    
    fetchClientById(clientId).then((client) => {
      if (!contractId && client.reglementDelay) {
        setDelaiReglement(client.reglementDelay.toString());
      }
      if (client.accountManager?.fullName) {
        setManager(client.accountManager.fullName);
      }
    });
  }, [clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!canCreate) {
      setError("Vous n'avez pas le droit de créer un bordereau.");
      return;
    }
    
    if (!reference || !dateReception || !clientId || !delaiReglement || !nombreBS) {
      setError("Tous les champs obligatoires doivent être remplis.");
      return;
    }
    
    setLoading(true);
    try {
      await createBordereau({
        reference,
        dateReception,
        clientId,
        contractId: contractId || undefined,
        delaiReglement: Number(delaiReglement),
        nombreBS: Number(nombreBS),
        statut,
        createdBy: user?.id,
      });
      
      setSuccess("Bordereau créé avec succès ! Notification envoyée à l'équipe SCAN.");
      setTimeout(() => onSuccess(), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Erreur lors de la création du bordereau.");
    } finally {
      setLoading(false);
    }
  };

  if (!canCreate) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-500 text-4xl mb-3">🚫</div>
        <h3 className="text-lg font-semibold text-red-800 mb-2">Accès refusé</h3>
        <p className="text-red-600 text-sm mb-4">
          Vous n'avez pas les droits nécessaires pour créer un bordereau.
        </p>
        <p className="text-red-500 text-xs">Rôle actuel: {user?.role || 'Non défini'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <span className="mr-2">📋</span>
            Créer un nouveau bordereau
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Remplissez les informations ci-dessous pour créer un bordereau
          </p>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep >= 1 ? 'bg-blue-100' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Informations de base</span>
            </div>
            <div className="flex-1 h-1 mx-4 bg-gray-200 rounded">
              <div className={`h-full bg-blue-500 rounded transition-all duration-300 ${currentStep >= 2 ? 'w-full' : 'w-0'}`}></div>
            </div>
            <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep >= 2 ? 'bg-blue-100' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Client & Contrat</span>
            </div>
          </div>
        </div>
        
        <form className="p-6" onSubmit={handleSubmit}>
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold mr-2">1</span>
                Informations de base
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Référence *
                    <span className="text-xs text-gray-500 ml-1">(Ex: BORD-2024-001)</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    value={reference}
                    onChange={e => setReference(e.target.value)}
                    placeholder="BORD-2024-001"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date de réception *</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    value={dateReception}
                    onChange={e => setDateReception(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de BS *</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    value={nombreBS}
                    onChange={e => setNombreBS(e.target.value)}
                    min={1}
                    placeholder="1"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Statut initial</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    value={statut}
                    onChange={e => setStatut(e.target.value as Statut)}
                  >
                    {statutOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  onClick={() => setCurrentStep(2)}
                  disabled={!reference || !dateReception || !nombreBS}
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Client & Contract */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-bold mr-2">2</span>
                Client et Contrat
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client *</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    required
                  >
                    <option value="">Sélectionner un client...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contrat
                    <span className="text-xs text-gray-500 ml-1">(Auto-sélectionné si unique)</span>
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    value={contractId}
                    onChange={e => setContractId(e.target.value)}
                  >
                    <option value="">Sélectionner un contrat...</option>
                    {contracts.map(c => (
                      <option key={c.id} value={c.id}>{c.name || c.nom || c.clientName}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Délai de règlement (jours) *
                    <span className="text-xs text-gray-500 ml-1">(Auto-rempli depuis le contrat/client)</span>
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    value={delaiReglement}
                    onChange={e => setDelaiReglement(e.target.value)}
                    min={1}
                    placeholder="30"
                    required
                  />
                </div>
                
                {manager && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gestionnaire assigné</label>
                    <div className="flex items-center px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                      <span className="mr-2">👤</span>
                      <span className="text-gray-700">{manager}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Workflow Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <span className="text-blue-500 mr-2">ℹ️</span>
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Processus automatique :</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Notification automatique envoyée à l'équipe SCAN</li>
                      <li>Affectation automatique selon la charge de travail</li>
                      <li>Suivi des délais et alertes SLA</li>
                      <li>Progression automatique du workflow</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between">
                <button
                  type="button"
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  onClick={() => setCurrentStep(1)}
                >
                  ← Précédent
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  disabled={loading || !clientId || !delaiReglement}
                >
                  {loading ? (
                    <>
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                      Création...
                    </>
                  ) : (
                    "✅ Créer le bordereau"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error and Success Messages */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              <div className="flex items-center">
                <span className="text-red-500 mr-2">⚠️</span>
                {error}
              </div>
            </div>
          )}
          
          {success && (
            <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                {success}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default EnhancedBordereauCreateForm;