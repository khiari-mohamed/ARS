import { useState, useEffect } from "react";
import { getContract, updateContractThresholds } from "../services/contractService";
import { useAuth } from '../hooks/useAuth';

export default function ContractThresholdPanel({ contractId }: { contractId: string }) {
  const { user } = useAuth();
  const [thresholds, setThresholds] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Only Admin and Chef can edit
  const isAdmin = user?.role === 'ADMINISTRATEUR';
  const isChef = user?.role === 'CHEF_EQUIPE';
  const canEdit = isAdmin || isChef;

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

  if (loading) return <div className="text-gray-600 text-sm">Chargement...</div>;

  return (
    <div className="card-panel contract-threshold-panel-pro" style={{maxWidth: 420, margin: '0 auto'}}>
      <h3 style={{marginBottom: '1.2rem', color: '#2563eb', fontWeight: 700, textAlign: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: 8}}>Seuils d'escalade du contrat</h3>
      <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
        <label style={{fontWeight: 600, color: '#334155', marginBottom: 6}}>
          SLA (jours)
          {canEdit ? (
            <input
              type="number"
              name="sla"
              value={thresholds.sla || ""}
              onChange={handleChange}
              min="0"
              className="filter-input"
              style={{marginTop: 4}}
            />
          ) : (
            <div className="filter-input" style={{marginTop: 4, background: '#f1f5f9'}}><span>{thresholds.sla || '-'}</span></div>
          )}
        </label>
        <label style={{fontWeight: 600, color: '#334155', marginBottom: 6}}>
          Seuil d'alerte (bordereaux)
          {canEdit ? (
            <input
              type="number"
              name="overload"
              value={thresholds.overload || ""}
              onChange={handleChange}
              min="0"
              className="filter-input"
              style={{marginTop: 4}}
            />
          ) : (
            <div className="filter-input" style={{marginTop: 4, background: '#f1f5f9'}}><span>{thresholds.overload || '-'}</span></div>
          )}
        </label>
      </div>
      {canEdit && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
          style={{marginTop: 18, width: '100%'}}>
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </button>
      )}
      {success && (
        <div className="text-green-600" style={{marginTop: 14, textAlign: 'center', fontWeight: 500}}>Seuils sauvegardés !</div>
      )}
      {error && (
        <div className="text-red-600" style={{marginTop: 14, textAlign: 'center', fontWeight: 500}}>{error}</div>
      )}
    </div>
  );
}
