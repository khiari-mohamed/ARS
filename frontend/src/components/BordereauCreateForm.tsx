import React, { useState, useEffect } from "react";
import { createBordereau } from "../services/bordereauxService";
import { fetchClients, fetchClientById } from "../services/clientService";
import { fetchContractsByClient, fetchContractById, Contract } from "../services/contractService";
import { Statut } from "../types/bordereaux";
import { Client } from "../types/client.d";

interface Props {
  onSuccess: () => void;
}

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

const BordereauCreateForm: React.FC<Props> = ({ onSuccess }) => {
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
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Erreur lors de la création du bordereau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="block font-semibold">Référence *</label>
        <input
          type="text"
          className="input"
          value={reference}
          onChange={e => setReference(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block font-semibold">Date de réception *</label>
        <input
          type="date"
          className="input"
          value={dateReception}
          onChange={e => setDateReception(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block font-semibold">Client *</label>
        <select
          className="input"
          value={clientId}
          onChange={e => setClientId(e.target.value)}
          required
        >
          <option value="">Sélectionner...</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block font-semibold">Contrat</label>
        <select
          className="input"
          value={contractId}
          onChange={e => setContractId(e.target.value)}
        >
          <option value="">Sélectionner...</option>
          {contracts.map(c => (
            <option key={c.id} value={c.id}>{c.name || c.nom}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block font-semibold">Délai de règlement (jours) *</label>
        <input
          type="number"
          className="input"
          value={delaiReglement}
          onChange={e => setDelaiReglement(e.target.value)}
          min={1}
          required
        />
      </div>
      <div>
        <label className="block font-semibold">Nombre de BS *</label>
        <input
          type="number"
          className="input"
          value={nombreBS}
          onChange={e => setNombreBS(e.target.value)}
          min={1}
          required
        />
      </div>
      <div>
        <label className="block font-semibold">Statut</label>
        <select
          className="input"
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
          <label className="block font-semibold">Gestionnaire assigné</label>
          <input type="text" className="input" value={manager} disabled />
        </div>
      )}
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {success && <div className="text-green-600 text-sm">{success}</div>}
      <div className="flex justify-end gap-2">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? "Création..." : "Créer"}
        </button>
      </div>
    </form>
  );
};

export default BordereauCreateForm;
