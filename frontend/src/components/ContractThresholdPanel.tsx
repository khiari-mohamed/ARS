import { useState, useEffect } from "react";
import { getContract, updateContractThresholds } from "../services/contractService";

export default function ContractThresholdPanel({ contractId }: { contractId: string }) {
  const [thresholds, setThresholds] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    getContract(contractId)
      .then(contract => setThresholds(contract.thresholds || {}))
      .catch(() => setError("Erreur lors du chargement du contrat"))
      .finally(() => setLoading(false));
  }, [contractId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setThresholds({ ...thresholds, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await updateContractThresholds(contractId, thresholds);
      setSuccess(true);
    } catch {
      setError("Erreur lors de la sauvegarde des seuils");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Chargement...</div>;
  return (
    <div className="contract-threshold-panel">
      <h3>Seuils d'escalade du contrat</h3>
      <label>
        SLA (jours):
        <input
          type="number"
          name="sla"
          value={thresholds.sla || ""}
          onChange={handleChange}
          className="input"
        />
      </label>
      <label>
        Seuil d'alerte (bordereaux):
        <input
          type="number"
          name="overload"
          value={thresholds.overload || ""}
          onChange={handleChange}
          className="input"
        />
      </label>
      <button onClick={handleSave} disabled={saving} className="btn btn-primary mt-2">
        {saving ? "Sauvegarde..." : "Sauvegarder"}
      </button>
      {success && <div className="text-green-600 mt-2">Seuils sauvegardés !</div>}
      {error && <div className="text-red-600 mt-2">{error}</div>}
    </div>
  );
}