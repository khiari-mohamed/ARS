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

  // Calculate document statistics
  const documentStats = bordereau?.documents ? {
    total: bordereau.documents.length,
    byType: bordereau.documents.reduce((acc: any, doc: any) => {
      const type = doc.type || 'Non spécifié';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {})
  } : { total: 0, byType: {} };

  const getDocumentTypeLabel = (type: string) => {
    const labels: any = {
      'BULLETIN_SOIN': '📋 Bulletin de Soin',
      'COMPLEMENT_INFORMATION': '📄 Complément d\'Information',
      'ADHESION': '✍️ Adhésion',
      'RECLAMATION': '📞 Réclamation',
      'CONTRAT_AVENANT': '📑 Contrat/Avenant',
      'DEMANDE_RESILIATION': '❌ Demande de Résiliation',
      'CONVENTION_TIERS_PAYANT': '🤝 Convention Tiers Payant'
    };
    return labels[type] || type;
  };

  const getDocumentTypeColor = (type: string) => {
    const colors: any = {
      'BULLETIN_SOIN': '#3b82f6',
      'COMPLEMENT_INFORMATION': '#8b5cf6',
      'ADHESION': '#10b981',
      'RECLAMATION': '#ef4444',
      'CONTRAT_AVENANT': '#f59e0b',
      'DEMANDE_RESILIATION': '#dc2626',
      'CONVENTION_TIERS_PAYANT': '#06b6d4'
    };
    return colors[type] || '#6b7280';
  };

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
          <span>Documents: <b>{documentStats.total}</b></span>
        </div>

        {/* Document Types Breakdown */}
        {documentStats.total > 0 && (
          <div style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: '1px solid #e5e7eb'
          }}>
            <div style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#64748b',
              marginBottom: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              📎 Répartition des Documents ({documentStats.total})
            </div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8
            }}>
              {Object.entries(documentStats.byType).map(([type, count]: [string, any]) => (
                <span
                  key={type}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: '999px',
                    backgroundColor: getDocumentTypeColor(type),
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700
                  }}
                >
                  {getDocumentTypeLabel(type)}: {count}
                </span>
              ))}
            </div>
          </div>
        )}
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
