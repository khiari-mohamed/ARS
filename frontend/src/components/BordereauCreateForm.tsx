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
  const [dateReception, setDateReception] = useState(new Date().toISOString().split('T')[0]);
  const [clientId, setClientId] = useState("");
  const [contractId, setContractId] = useState("");
  const [delaiReglement, setDelaiReglement] = useState("");
  const [delaiReclamation, setDelaiReclamation] = useState("");
  const [nombreBS, setNombreBS] = useState("");
  const [montantTotal, setMontantTotal] = useState("");
  const [statut, setStatut] = useState<Statut>("A_SCANNER");
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [manager, setManager] = useState<string>("");
  const [dateLimiteTraitement, setDateLimiteTraitement] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Only BO, Chef, Admin can create
  const isBO = user?.role === 'BO' || user?.role === 'CLIENT_SERVICE';
  const isChef = user?.role === 'CHEF_EQUIPE';
  const isAdmin = user?.role === 'ADMINISTRATEUR';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isManager = user?.role === 'MANAGER';
  const canCreate = isBO || isChef || isAdmin || isSuperAdmin || isManager;
  
  // Auto-generate reference if empty
  const generateReference = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const time = String(today.getHours()).padStart(2, '0') + String(today.getMinutes()).padStart(2, '0');
    return `BORD-${year}-${month}${day}-${time}`;
  };
  
  // Calculate SLA date limit
  const calculateDateLimite = (receptionDate: string, delaiJours: number) => {
    if (!receptionDate || !delaiJours) return "";
    const date = new Date(receptionDate);
    date.setDate(date.getDate() + delaiJours);
    return date.toISOString().split('T')[0];
  };

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
    // Fetch client profile for fallback delays and manager
    fetchClientById(clientId).then((client) => {
      if (!contractId) {
        if (client.reglementDelay) {
          setDelaiReglement(client.reglementDelay.toString());
        }
        if (client.reclamationDelay) {
          setDelaiReclamation(client.reclamationDelay.toString());
        }
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
      setDelaiReclamation((contract as any).delaiReclamation?.toString() || "");
      setManager(contract.assignedManagerId || "");
    });
  }, [contractId]);
  
  // Update date limite when reception date or delai changes
  useEffect(() => {
    if (dateReception && delaiReglement) {
      const dateLimite = calculateDateLimite(dateReception, Number(delaiReglement));
      setDateLimiteTraitement(dateLimite);
    }
  }, [dateReception, delaiReglement]);
  
  // Auto-generate reference on component mount
  useEffect(() => {
    if (!reference) {
      setReference(generateReference());
    }
  }, []);

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
    
    console.log('📝 Creating bordereau with payload:', {
      reference,
      dateReception,
      clientId,
      contractId,
      delaiReglement: Number(delaiReglement),
      nombreBS: Number(nombreBS),
      montantTotal: montantTotal ? Number(montantTotal) : undefined
    });
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
        montantTotal: montantTotal ? Number(montantTotal) : undefined,
        statut,
        createdBy: user?.id
      };
      const result = await createBordereau(payload);
      console.log('✅ Bordereau created successfully:', result);
      setSuccess(`Bordereau ${reference} créé avec succès et prêt pour numérisation.`);
      
      // Reset form
      setReference(generateReference());
      setDateReception(new Date().toISOString().split('T')[0]);
      setClientId("");
      setContractId("");
      setDelaiReglement("");
      setDelaiReclamation("");
      setNombreBS("");
      setMontantTotal("");
      setStatut("A_SCANNER");
      setManager("");
      setDateLimiteTraitement("");
      
      // Close modal and refresh data
      setTimeout(() => {
        onSuccess();
      }, 1500);
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">📝 Créer un nouveau bordereau</h2>
        <p className="text-sm text-gray-600">Enregistrement initial par le Bureau d'Ordre</p>
      </div>
      
      <form className="space-y-8" onSubmit={handleSubmit}>
        {/* Section 1: Informations générales */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">📄 Informations générales</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Référence Bordereau *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder="Ex: BORD-2024-001"
                  required
                />
                <button
                  type="button"
                  onClick={() => setReference(generateReference())}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                >
                  🔄 Générer
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date de réception BO *</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={dateReception}
                onChange={e => setDateReception(e.target.value)}
                required
              />
            </div>
          </div>
        </div>
        {/* Section 2: Client et Contrat */}
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">🏢 Client et Contrat</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Client / Prestataire *</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Contrat associé</label>
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
            {manager && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Chargé de Compte</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600" 
                  value={manager} 
                  disabled 
                />
              </div>
            )}
          </div>
        </div>
        {/* Section 3: Détails et SLA */}
        <div className="bg-green-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">📈 Détails et SLA</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de BS inclus *</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Délai règlement (jours) *</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Délai réclamation (jours)</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                value={delaiReclamation}
                disabled
                placeholder="Hérité du contrat"
              />
            </div>
            {dateLimiteTraitement && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date limite SLA</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-yellow-50 text-gray-700"
                  value={dateLimiteTraitement}
                  disabled
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Montant total (optionnel)</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={montantTotal}
                onChange={e => setMontantTotal(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
        {/* Section 4: Statut et Métadonnées */}
        <div className="bg-purple-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">⚙️ Statut et Métadonnées</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Statut initial</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={statut}
                onChange={e => setStatut(e.target.value as Statut)}
              >
                <option value="A_SCANNER">📝 À scanner (recommandé)</option>
                <option value="EN_ATTENTE">⏳ En attente</option>
                <option value="SCANNE">📷 Scanné</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Le statut évoluera automatiquement selon le workflow</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Créé par</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600" 
                value={user?.fullName || 'Utilisateur actuel'} 
                disabled 
              />
            </div>
          </div>
        </div>
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
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            📝 Après création, le bordereau sera automatiquement envoyé à l'équipe SCAN
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setReference(generateReference());
                setDateReception(new Date().toISOString().split('T')[0]);
                setClientId("");
                setContractId("");
                setDelaiReglement("");
                setNombreBS("");
                setMontantTotal("");
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              🔄 Réinitialiser
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                  Création en cours...
                </>
              ) : (
                "💾 Créer le bordereau"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default BordereauCreateForm;