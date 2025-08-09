import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { assignBS, updateBS } from '../api/bsApi';

interface BSListTableProps {
  bsList: any[];
}

const statusColor = (status: string) => {
  if (status === 'VALIDATED' || status === 'FAVORABLE') return 'bg-green-100 text-green-700';
  if (status === 'REJECTED' || status === 'DEFAVORABLE') return 'bg-red-100 text-red-700';
  if (status === 'IN_PROGRESS' || status === 'EN_COURS') return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-700';
};

const BSListTable: React.FC<BSListTableProps> = ({ bsList }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id: bordereauId } = useParams();

  const isChef = user?.role === 'CHEF_EQUIPE';
  const isGestionnaire = user?.role === 'GESTIONNAIRE';
  const isAdmin = user?.role === 'ADMINISTRATEUR';

  // Modal and feedback state
  const [modal, setModal] = useState<{ type: null | 'assign' | 'process' | 'return', bsId?: string }>({ type: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Action handlers
  const handleAssign = (bsId: string) => {
    setModal({ type: 'assign', bsId });
    setError(null);
    setSuccess(null);
  };
  const handleMarkProcessed = (bsId: string) => {
    setModal({ type: 'process', bsId });
    setError(null);
    setSuccess(null);
  };
  const handleReturn = (bsId: string) => {
    setModal({ type: 'return', bsId });
    setError(null);
    setSuccess(null);
  };
  const handleExport = (bsId: string) => {
    // Export logic here
  };

  // Confirm actions
  const confirmAssign = async (ownerId: string) => {
    if (!modal.bsId) return;
    setLoading(true);
    setError(null);
    try {
      await assignBS(Number(modal.bsId), Number(ownerId));
      setSuccess('BS assigné avec succès.');
      setModal({ type: null });
      window.location.reload(); // Or trigger a prop callback to refresh
    } catch {
      setError("Erreur lors de l'assignation.");
    } finally {
      setLoading(false);
    }
  };
  const confirmProcess = async () => {
    if (!modal.bsId) return;
    setLoading(true);
    setError(null);
    try {
      await updateBS(modal.bsId, { etat: 'VALIDATED' });
      setSuccess('BS marqué comme traité.');
      setModal({ type: null });
      window.location.reload();
    } catch {
      setError("Erreur lors du traitement.");
    } finally {
      setLoading(false);
    }
  };
  const confirmReturn = async () => {
    if (!modal.bsId) return;
    setLoading(true);
    setError(null);
    try {
      await updateBS(modal.bsId, { etat: 'EN_DIFFICULTE' });
      setSuccess('BS retourné au chef.');
      setModal({ type: null });
      window.location.reload();
    } catch {
      setError("Erreur lors du retour.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded shadow">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left">Numéro BS</th>
            <th className="px-4 py-2 text-left">Assuré</th>
            <th className="px-4 py-2 text-left">Date</th>
            <th className="px-4 py-2 text-left">Statut</th>
            <th className="px-4 py-2 text-left">Propriétaire</th>
            <th className="px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bsList.map((bs) => (
            <tr key={bs.id} className="border-t hover:bg-blue-50 transition cursor-pointer" onClick={() => navigate(`/bordereaux/${bordereauId}/bs/${bs.id}`)}>
              <td className="px-4 py-2 font-bold text-blue-900">{bs.numBs}</td>
              <td className="px-4 py-2">{bs.nomAssure || bs.codeAssure || '-'}</td>
              <td className="px-4 py-2">{bs.dateSoin ? new Date(bs.dateSoin).toLocaleDateString() : '-'}</td>
              <td className="px-4 py-2">
                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${statusColor(bs.etat || bs.status)}`}>{bs.etat || bs.status}</span>
              </td>
              <td className="px-4 py-2">{bs.owner?.fullName || bs.owner?.username || bs.ownerId || '-'}</td>
              <td className="px-4 py-2 flex gap-1">
                <button className="btn btn-xs btn-primary" onClick={e => { e.stopPropagation(); navigate(`/bordereaux/${bordereauId}/bs/${bs.id}`); }}>Voir</button>
                {isChef && <button className="btn btn-xs btn-primary" onClick={e => { e.stopPropagation(); handleAssign(bs.id); }}>Assigner</button>}
                {isGestionnaire && <>
                  <button className="btn btn-xs btn-success" onClick={e => { e.stopPropagation(); handleMarkProcessed(bs.id); }}>Traiter</button>
                  <button className="btn btn-xs btn-warning" onClick={e => { e.stopPropagation(); handleReturn(bs.id); }}>Retour Chef</button>
                </>}
                {isAdmin && <button className="btn btn-xs btn-secondary" onClick={e => { e.stopPropagation(); handleExport(bs.id); }}>Exporter</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    {/* Modals for actions */}
      {modal.type === 'assign' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" onClick={() => setModal({ type: null })} aria-label="Fermer">✕</button>
            <h2 className="text-xl font-bold mb-4">Assigner le BS</h2>
            <div className="mb-4">Saisir l'ID du gestionnaire à assigner :</div>
            <input className="input w-full mb-4" placeholder="ID du gestionnaire" onChange={e => setSuccess(e.target.value)} />
            {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
            <div className="flex justify-end gap-2">
              <button className="btn" onClick={() => setModal({ type: null })}>Annuler</button>
              <button className="btn btn-primary" onClick={() => confirmAssign(success || '')} disabled={loading || !success}>{loading ? 'Assignation...' : 'Assigner'}</button>
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
              <button className="btn btn-success" onClick={confirmProcess} disabled={loading}>{loading ? 'Traitement...' : 'Confirmer'}</button>
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
              <button className="btn btn-warning" onClick={confirmReturn} disabled={loading}>{loading ? 'Retour...' : 'Confirmer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BSListTable;
