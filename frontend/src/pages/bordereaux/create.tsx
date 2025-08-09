import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createBordereau } from "../../services/bordereauxService";
import { fetchClients, fetchClientById } from "../../services/clientService";
import { fetchContractsByClient, fetchContractById, Contract } from "../../services/contractService";
import { Statut } from "../../utils/enums";
import { Client } from "../../types/client.d";

const statutOptions: { value: Statut; label: string }[] = [
  { value: "EN_ATTENTE", label: "En attente" },
  { value: "SCAN_EN_COURS", label: "Scan en cours" },
  { value: "SCAN_TERMINE", label: "Scan terminé" },
  { value: "ASSIGNE", label: "Assigné" },
  { value: "TRAITE", label: "Traité" },
  { value: "CLOTURE", label: "Clôturé" },
  { value: "EN_DIFFICULTE", label: "En difficulté" },
  { value: "EN_COURS", label: "En cours" },
  { value: "PARTIEL", label: "Partiel" },
];

const BordereauCreatePage: React.FC = () => {
  const navigate = useNavigate();
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
    fetchContractsByClient(clientId).then((data) => {
      setContracts(data);
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
      });
      setSuccess("Bordereau créé et notification envoyée à l'équipe SCAN.");
      setReference("");
      setDateReception("");
      setClientId("");
      setContractId("");
      setDelaiReglement("");
      setNombreBS("");
      setStatut("EN_ATTENTE");
      setManager("");
      setTimeout(() => navigate("/bordereaux"), 1200);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Erreur lors de la création du bordereau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <form className="bg-white rounded shadow max-w-xl w-full p-8 space-y-6" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-bold mb-4">Créer un Bordereau</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-1">Client *</label>
            <select className="input w-full" value={clientId} onChange={e => setClientId(e.target.value)} required>
              <option value="">Sélectionner...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Type de Fichier *</label>
            <select className="input w-full" value="BS" disabled>
              <option value="BS">BS</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Nombre de Fichiers *</label>
            <input type="number" className="input w-full" value={nombreBS} onChange={e => setNombreBS(e.target.value)} min={1} required />
          </div>
          <div>
            <label className="block font-semibold mb-1">Référence *</label>
            <input type="text" className="input w-full" value={reference} onChange={e => setReference(e.target.value)} required />
          </div>
          <div>
            <label className="block font-semibold mb-1">Date Réception *</label>
            <input type="date" className="input w-full" value={dateReception} onChange={e => setDateReception(e.target.value)} required />
          </div>
          <div>
            <label className="block font-semibold mb-1">Gestionnaire</label>
            <input type="text" className="input w-full" value={manager} disabled />
          </div>
          <div>
            <label className="block font-semibold mb-1">Délais Règlement *</label>
            <input type="number" className="input w-full" value={delaiReglement} onChange={e => setDelaiReglement(e.target.value)} min={1} required />
          </div>
          <div>
            <label className="block font-semibold mb-1">Contrat</label>
            <select className="input w-full" value={contractId} onChange={e => setContractId(e.target.value)}>
              <option value="">Sélectionner...</option>
              {contracts.map(c => (
                <option key={c.id} value={c.id}>{c.name || c.nom}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button type="button" className="btn" style={{ background: '#64748b', color: '#fff' }} onClick={() => navigate('/bordereaux')}>Annuler</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Création..." : "Enregistrer"}</button>
        </div>
        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
        {success && <div className="text-green-600 text-sm mt-2">{success}</div>}
      </form>
    </div>
  );
};

export default BordereauCreatePage;
