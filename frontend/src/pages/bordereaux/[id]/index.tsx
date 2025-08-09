import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchBordereau } from "../../../services/bordereauxService";
import BordereauStatusBadge from "../../../components/BordereauStatusBadge";
import CourrierPanel from "../../../components/CourrierPanel";
import ContractThresholdPanel from "../../../components/ContractThresholdPanel";

export default function BordereauDetailPage() {
  const { id } = useParams();
  const [bordereau, setBordereau] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("ID de bordereau manquant");
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchBordereau(id)
      .then(setBordereau)
      .catch(() => setError("Erreur lors du chargement du bordereau"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-gray-600 text-sm">Chargement...</div>;
  if (error) return <div className="text-red-600 text-sm">{error}</div>;
  if (!bordereau) return <div className="text-gray-500">Bordereau introuvable</div>;

  return (
    <div className="bordereau-detail-root-grid">
      {/* Bordereau Info Card */}
      <div className="card-panel bordereau-detail-card-info">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18}}>
          <div>
            <div style={{fontWeight: 800, fontSize: 22, color: '#2563eb', marginBottom: 2}}>{bordereau.reference}</div>
            <div style={{fontSize: 15, color: '#334155', marginBottom: 2}}>Client: <b>{bordereau.client?.name || bordereau.clientId}</b></div>
            <div style={{fontSize: 13, color: '#64748b'}}>Reçu le: {new Date(bordereau.dateReception).toLocaleDateString()}</div>
          </div>
          <BordereauStatusBadge statut={bordereau.statut} color={bordereau.statusColor} />
        </div>
        <div style={{display: 'flex', gap: 18, fontSize: 15, fontWeight: 600, color: '#334155', marginBottom: 18}}>
          <span>BS: <b>{bordereau.nombreBS}</b></span>
          <span>SLA: <b>{bordereau.delaiReglement}j</b></span>
          <span>Restant: <b>{bordereau.daysRemaining}</b>j</span>
        </div>
      </div>
      {/* Courriers Card */}
      <div className="card-panel bordereau-detail-card">
        <div style={{fontWeight: 700, color: '#2563eb', fontSize: 18, marginBottom: 12, borderBottom: '1px solid #e5e7eb', paddingBottom: 8, textAlign: 'center'}}>Courriers</div>
        <CourrierPanel />
      </div>
      {/* Seuils d'escalade du contrat Card */}
      {bordereau.contract && bordereau.contract.id && (
        <div className="card-panel bordereau-detail-card">
          <div style={{fontWeight: 700, color: '#2563eb', fontSize: 18, marginBottom: 12, borderBottom: '1px solid #e5e7eb', paddingBottom: 8, textAlign: 'center'}}>Seuils d'escalade du contrat</div>
          <ContractThresholdPanel contractId={bordereau.contract.id} />
        </div>
      )}
    </div>
  );
}
