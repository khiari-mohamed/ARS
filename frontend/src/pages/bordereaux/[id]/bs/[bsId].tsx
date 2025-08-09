import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../hooks/useAuth';
import { fetchBSDetails, fetchBSLogs, fetchBSOcr, updateBS, assignBS } from '../../../../api/bsApi';
// Status icons replaced with emoji indicators

const statusColor = (status: string) => {
  if (status === 'VALIDATED' || status === 'FAVORABLE') return 'bg-green-100 text-green-700';
  if (status === 'REJECTED' || status === 'DEFAVORABLE') return 'bg-red-100 text-red-700';
  if (status === 'IN_PROGRESS' || status === 'EN_COURS') return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-700';
};

const BSDetailsPage = () => {
  const { user } = useAuth();
  const { id, bsId } = useParams();
  const navigate = useNavigate();
  const [bs, setBs] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [ocr, setOcr] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modal, setModal] = useState<{ type: null | 'assign' | 'process' | 'return' }>({ type: null });

  // Role-based permissions
  const isChef = user?.role === 'CHEF_EQUIPE';
  const isGestionnaire = user?.role === 'GESTIONNAIRE';
  const isAdmin = user?.role === 'ADMINISTRATEUR';

  useEffect(() => {
    if (!bsId) return;
    setLoading(true);
    Promise.all([
      fetchBSDetails(bsId),
      fetchBSLogs(bsId),
      fetchBSOcr(bsId)
    ])
      .then(([bsData, logsData, ocrData]) => {
        setBs(bsData);
        setLogs(logsData);
        setOcr(ocrData?.ocrText || '');
      })
      .catch(() => setError('Erreur lors du chargement du BS.'))
      .finally(() => setLoading(false));
  }, [bsId]);

  // Actions
  // Modal action handlers
  const handleAssign = () => setModal({ type: 'assign' });
  const handleMarkProcessed = () => setModal({ type: 'process' });
  const handleReturn = () => setModal({ type: 'return' });

  const confirmAssign = async () => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
     if (!user || !user.id) return;
await assignBS(bsId!, Number(user.id));
      setSuccess('BS assigné avec succès.');
      setModal({ type: null });
    } catch {
      setError('Erreur lors de l\'assignation.');
    } finally {
      setActionLoading(false);
    }
  };
  const confirmProcess = async () => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await updateBS(bsId!, { etat: 'VALIDATED' });
      setSuccess('BS marqué comme traité.');
      setBs({ ...bs, etat: 'VALIDATED' });
      setModal({ type: null });
    } catch {
      setError('Erreur lors du traitement.');
    } finally {
      setActionLoading(false);
    }
  };
  const confirmReturn = async () => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await updateBS(bsId!, { etat: 'EN_DIFFICULTE' });
      setSuccess('BS retourné au chef.');
      setBs({ ...bs, etat: 'EN_DIFFICULTE' });
      setModal({ type: null });
    } catch {
      setError('Erreur lors du retour.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="text-center py-10">Chargement...</div>;
  if (!bs) return <div className="text-center py-10 text-red-600">BS introuvable</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">BS {bs.numBs}</h1>
          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${statusColor(bs.etat || bs.status)}`}>{bs.etat || bs.status}</span>
        </div>
        {/* Role-based action bar */}
        <div className="flex flex-wrap gap-2 mb-4">
          {isChef && <button className="btn btn-primary btn-xs flex items-center gap-1" onClick={handleAssign} disabled={actionLoading}><span title="Assigner à moi" style={{fontSize: '1.2em'}}>👤</span> Assigner à moi</button>}
          {isGestionnaire && <>
            <button className="btn btn-success btn-xs flex items-center gap-1" onClick={handleMarkProcessed} disabled={actionLoading}><span title="Marquer comme traité" style={{color: '#22c55e', fontSize: '1.2em'}}>🟢</span> Marquer comme traité</button>
            <button className="btn btn-warning btn-xs flex items-center gap-1" onClick={handleReturn} disabled={actionLoading}><span title="Retour Chef" style={{color: '#f59e42', fontSize: '1.2em'}}>🟡</span> Retour Chef</button>
          </>}
          {isAdmin && <button className="btn btn-secondary btn-xs flex items-center gap-1" disabled><span title="Exporter" style={{color: '#ef4444', fontSize: '1.2em'}}>🔴</span> Exporter</button>}
        </div>
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        {success && <div className="text-green-600 text-sm mb-2">{success}</div>}
        {/* Modals for actions */}
        {modal.type === 'assign' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded shadow-lg p-6 w-full max-w-md relative">
              <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" onClick={() => setModal({ type: null })} aria-label="Fermer">✕</button>
              <h2 className="text-xl font-bold mb-4">Confirmer l'assignation</h2>
              <div className="mb-4">Voulez-vous vous assigner ce BS ?</div>
              {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
              <div className="flex justify-end gap-2">
                <button className="btn" onClick={() => setModal({ type: null })}>Annuler</button>
                <button className="btn btn-primary" onClick={confirmAssign} disabled={actionLoading}>{actionLoading ? 'Assignation...' : 'Confirmer'}</button>
              </div>
            </div>
          </div>
        )}
        {modal.type === 'process' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded shadow-lg p-6 w-full max-w-md relative">
              <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" onClick={() => setModal({ type: null })} aria-label="Fermer">✕</button>
              <h2 className="text-xl font-bold mb-4">Confirmer le traitement</h2>
              <div className="mb-4">Voulez-vous marquer ce BS comme <b>traité</b> ?</div>
              {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
              <div className="flex justify-end gap-2">
                <button className="btn" onClick={() => setModal({ type: null })}>Annuler</button>
                <button className="btn btn-success" onClick={confirmProcess} disabled={actionLoading}>{actionLoading ? 'Traitement...' : 'Confirmer'}</button>
              </div>
            </div>
          </div>
        )}
        {modal.type === 'return' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded shadow-lg p-6 w-full max-w-md relative">
              <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" onClick={() => setModal({ type: null })} aria-label="Fermer">✕</button>
              <h2 className="text-xl font-bold mb-4">Retourner au chef</h2>
              <div className="mb-4">Voulez-vous retourner ce BS au chef ?</div>
              {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
              <div className="flex justify-end gap-2">
                <button className="btn" onClick={() => setModal({ type: null })}>Annuler</button>
                <button className="btn btn-warning" onClick={confirmReturn} disabled={actionLoading}>{actionLoading ? 'Retour...' : 'Confirmer'}</button>
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <div className="mb-2"><span className="font-semibold">Assuré:</span> {bs.nomAssure || bs.codeAssure || '-'}</div>
            <div className="mb-2"><span className="font-semibold">Bénéficiaire:</span> {bs.nomBeneficiaire || '-'}</div>
            <div className="mb-2"><span className="font-semibold">Société:</span> {bs.nomSociete || '-'}</div>
            <div className="mb-2"><span className="font-semibold">Date de soin:</span> {bs.dateSoin ? new Date(bs.dateSoin).toLocaleDateString() : '-'}</div>
            <div className="mb-2"><span className="font-semibold">Montant:</span> {bs.montant ?? '-'}</div>
            <div className="mb-2"><span className="font-semibold">Acte:</span> {bs.acte || '-'}</div>
          </div>
          <div>
            <div className="mb-2"><span className="font-semibold">Propriétaire:</span> {bs.owner?.fullName || bs.owner?.username || bs.ownerId || '-'}</div>
            <div className="mb-2"><span className="font-semibold">Date action:</span> {bs.processedAt ? new Date(bs.processedAt).toLocaleDateString() : '-'}</div>
            <div className="mb-2"><span className="font-semibold">Document:</span> {bs.documentId ? <a href={`/documents/${bs.documentId}`} className="text-blue-600 underline">Voir</a> : <span className="text-gray-400">-</span>}</div>
            <div className="mb-2"><span className="font-semibold">Observation:</span> {bs.observationGlobal || '-'}</div>
          </div>
        </div>
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Historique</h2>
          {logs.length === 0 ? (
            <div className="text-gray-500">Aucun log</div>
          ) : (
            <ul className="list-disc pl-5 text-sm">
              {logs.map((log: any) => (
                <li key={log.id}>
                  {log.timestamp && <span>{new Date(log.timestamp).toLocaleString()} - </span>}
                  {log.action} | Utilisateur: {log.userFullName || log.userId}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">OCR</h2>
          {ocr ? (
            <div className="bg-gray-50 border rounded p-2 text-xs whitespace-pre-wrap max-h-48 overflow-auto">{ocr}</div>
          ) : (
            <div className="text-gray-500">Aucun résultat OCR</div>
          )}
        </div>
        <div className="flex justify-end mt-6">
          <button className="btn" style={{ background: '#64748b', color: '#fff' }} onClick={() => navigate(`/bordereaux/${id}`)}>Retour</button>
        </div>
      </div>
    </div>
  );
};

export default BSDetailsPage;
