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
  { value: "ASSIGNE", label: "Assigné" },
  { value: "EN_COURS", label: "En cours" },
  { value: "TRAITE", label: "Traité" },
  { value: "PRET_VIREMENT", label: "Prêt virement" },
  { value: "VIREMENT_EN_COURS", label: "Virement en cours" },
  { value: "VIREMENT_EXECUTE", label: "Virement exécuté" },
  { value: "VIREMENT_REJETE", label: "Virement rejeté" },
  { value: "CLOTURE", label: "Clôturé" },
  { value: "EN_DIFFICULTE", label: "En difficulté" },
  { value: "PARTIEL", label: "Partiel" },
];

const BordereauCreateForm: React.FC<Props> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [reference, setReference] = useState("");
  const [dateReception, setDateReception] = useState("");
  const [clientId, setClientId] = useState("");
  const [contractId, setContractId] = useState("");
  const [delaiReglement, setDelaiReglement] = useState("");
  const [nombreBS, setNombreBS] = useState("");
  const [statut, setStatut] = useState<Statut>("EN_ATTENTE");
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [manager, setManager] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Only BO, Chef, Admin can create
  const isBO = user?.role === 'CLIENT_SERVICE';
  const isChef = user?.role === 'CHEF_EQUIPE';
  const isAdmin = user?.role === 'ADMINISTRATEUR';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isManager = user?.role === 'MANAGER';
  const canCreate = isBO || isChef || isAdmin || isSuperAdmin || isManager;

  useEffect(() => {
    fetchClients().then(setClients);
  }, []);

  useEffect(() => {
    if (!clientId) {
      setContracts([]);
      setContractId("");
      setDelaiReglement("");
      setManager("");
      return;
    }
    // Fetch contracts for selected client
    fetchContractsByClient(clientId).then((data) => {
      setContracts(data);
      // If only one contract, auto-select it
      if (data.length === 1) {
        setContractId(data[0].id.toString());
        setDelaiReglement(data[0].delaiReglement?.toString() || "");
        setManager(data[0].assignedManagerId || "");
      } else {
        setContractId("");
        setDelaiReglement("");
        setManager("");
      }
    });
    // Fetch client profile for fallback reglementDelay and manager
    fetchClientById(clientId).then((client) => {
      if (!contractId && client.reglementDelay) {
        setDelaiReglement(client.reglementDelay.toString());
      }
      if (client.accountManager && client.accountManager.fullName) {
        setManager(client.accountManager.fullName);
      }
    });
  }, [clientId]);

  useEffect(() => {
    if (!contractId) return;
    fetchContractById(contractId).then((contract) => {
      setDelaiReglement(contract.delaiReglement?.toString() || "");
      setManager(contract.assignedManagerId || "");
    });
  }, [contractId]);

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
      // Prepare notification payload (backend will handle notification)
      const payload = {
        reference,
        dateReception,
        clientId,
        contractId: contractId || undefined,
        delaiReglement: Number(delaiReglement),
        nombreBS: Number(nombreBS),
        statut,
        createdBy: user?.id,
        // Optionally, add auto-assignment fields if needed
      };
      await createBordereau(payload);
      setSuccess("Bordereau créé et notification envoyée à l'équipe SCAN.");
      setReference("");
      setDateReception("");
      setClientId("");
      setContractId("");
      setDelaiReglement("");
      setNombreBS("");
      setStatut("EN_ATTENTE");
      setManager("");
      onSuccess();
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
        <p className="text-red-500 text-xs">
          Rôle actuel: {user?.role || 'Non défini'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Référence *</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={reference}
            onChange={e => setReference(e.target.value)}
            placeholder="Ex: BORD-2024-001"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date de réception *</label>
          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={dateReception}
            onChange={e => setDateReception(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Client *</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Contrat</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={contractId}
            onChange={e => setContractId(e.target.value)}
          >
            <option value="">Sélectionner un contrat...</option>
            {contracts.map(c => (
              <option key={c.id} value={c.id}>{c.name || c.nom}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Délai de règlement (jours) *</label>
          <input
            type="number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={delaiReglement}
            onChange={e => setDelaiReglement(e.target.value)}
            min={1}
            placeholder="30"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de BS *</label>
          <input
            type="number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={nombreBS}
            onChange={e => setNombreBS(e.target.value)}
            min={1}
            placeholder="1"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={statut}
            onChange={e => setStatut(e.target.value as Statut)}
          >
            {statutOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        {manager && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gestionnaire assigné</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600" 
              value={manager} 
              disabled 
            />
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <div className="flex items-center">
              <span className="text-red-500 mr-2">⚠️</span>
              {error}
            </div>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              {success}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                Création...
              </>
            ) : (
              "Créer le bordereau"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BordereauCreateForm;