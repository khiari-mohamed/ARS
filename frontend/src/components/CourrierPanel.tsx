import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
// Removed non-existent service imports - using mock implementations
import { useAuth } from '../hooks/useAuth';

const statusColor = (status: string) => {
  if (status === 'SENT' || status === 'RESPONDED') return 'bg-green-100 text-green-700';
  if (status === 'FAILED' || status === 'REJECTED') return 'bg-red-100 text-red-700';
  if (status === 'PENDING_RESPONSE' || status === 'DRAFT') return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-700';
};

const CourrierPanel: React.FC = () => {
  const { user } = useAuth();
  const { id: bordereauId } = useParams();
  const [courriers, setCourriers] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<{ open: boolean; id?: string; subject?: string; body?: string }>({ open: false });
  const [respondModal, setRespondModal] = useState<{ open: boolean; id?: string; response?: string }>({ open: false });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Role-based permissions
  const isChef = user?.role === 'CHEF_EQUIPE';
  const isGestionnaire = user?.role === 'GESTIONNAIRE';
  const isAdmin = user?.role === 'ADMINISTRATEUR';
  const isBO = user?.role === 'CLIENT_SERVICE';
  const canCreate = isChef || isGestionnaire || isAdmin;
  const canEdit = isChef || isAdmin;
  const canDelete = isAdmin;

  // Mock service functions
  const searchCourriers = async (params: any) => {
    // Mock data
    return [
      {
        id: '1',
        subject: 'Demande de remboursement',
        status: 'SENT',
        sentAt: new Date(),
        responseAt: null
      },
      {
        id: '2', 
        subject: 'Suivi dossier',
        status: 'PENDING_RESPONSE',
        sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        responseAt: null
      }
    ];
  };

  const createCourrier = async (data: any) => {
    // Mock creation
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { id: Date.now().toString(), ...data };
  };

  const editCourrier = async (id: string, data: any) => {
    // Mock edit
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { id, ...data };
  };

  const deleteCourrier = async (id: string) => {
    // Mock delete
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  };

  const respondCourrier = async (id: string, data: any) => {
    // Mock response
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { id, ...data };
  };

  useEffect(() => {
    if (bordereauId) {
      const sanitizedBordereauId = bordereauId.replace(/[{}$]/g, '');
      searchCourriers({ bordereauId: sanitizedBordereauId }).then(setCourriers);
    }
  }, [bordereauId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createCourrier({ bordereauId, subject, body });
      setShowCreate(false);
      setSubject("");
      setBody("");
      searchCourriers({ bordereauId }).then(setCourriers);
    } catch (err: any) {
      setError("Erreur lors de la création du courrier.");
    } finally {
      setLoading(false);
    }
  };

  // Action handlers (edit/delete/respond) can be implemented here
  const handleEdit = (courrierId: string) => {
    const c = courriers.find(c => c.id === courrierId);
    setEditModal({ open: true, id: courrierId, subject: c?.subject, body: c?.body });
  };
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.id) return;
    setActionLoading(editModal.id);
    setActionError(null);
    try {
      await editCourrier(editModal.id, { subject: editModal.subject, body: editModal.body });
      setEditModal({ open: false });
      searchCourriers({ bordereauId }).then(setCourriers);
    } catch {
      setActionError("Erreur lors de la modification du courrier.");
    } finally {
      setActionLoading(null);
    }
  };
  const handleDelete = async (courrierId: string) => {
    setActionLoading(courrierId);
    setActionError(null);
    try {
      await deleteCourrier(courrierId);
      searchCourriers({ bordereauId }).then(setCourriers);
    } catch {
      setActionError("Erreur lors de la suppression du courrier.");
    } finally {
      setActionLoading(null);
    }
  };
  const handleRespond = (courrierId: string) => {
    setRespondModal({ open: true, id: courrierId, response: "" });
  };
  const handleRespondSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondModal.id) return;
    setActionLoading(respondModal.id);
    setActionError(null);
    try {
      await respondCourrier(respondModal.id, { response: respondModal.response });
      setRespondModal({ open: false });
      searchCourriers({ bordereauId }).then(setCourriers);
    } catch {
      setActionError("Erreur lors de la réponse au courrier.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="courrier-panel">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold">Courriers</h3>
        {canCreate && (
          <button className="btn btn-primary btn-xs" onClick={() => setShowCreate(v => !v)}>
            {showCreate ? "Annuler" : "Créer Courrier"}
          </button>
        )}
      </div>
      {showCreate && (
        <form className="bg-gray-50 p-3 rounded mb-4" onSubmit={handleCreate}>
          <input
            className="input w-full mb-2"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Sujet"
            required
          />
          <textarea
            className="input w-full mb-2"
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Corps"
            required
          />
          <div className="flex gap-2 justify-end">
            <button type="submit" className="btn btn-primary btn-xs" disabled={loading}>{loading ? "Création..." : "Enregistrer"}</button>
          </div>
          {error && <div className="text-red-600 text-xs mt-1">{error}</div>}
        </form>
      )}
      {courriers.length === 0 ? (
        <div className="text-gray-500">Aucun courrier lié</div>
      ) : (
        <table className="min-w-full text-sm mt-2">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left">Sujet</th>
              <th className="px-2 py-1 text-left">Statut</th>
              <th className="px-2 py-1 text-left">Envoyé</th>
              <th className="px-2 py-1 text-left">Réponse</th>
              <th className="px-2 py-1 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {courriers.map(c => (
              <tr key={c.id} className="border-t">
                <td className="px-2 py-1 font-semibold"><span>{c.subject}</span></td>
                <td className="px-2 py-1">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${statusColor(c.status)}`}>{c.status}</span>
                </td>
                <td className="px-2 py-1">{c.sentAt ? new Date(c.sentAt).toLocaleDateString() : '-'}</td>
                <td className="px-2 py-1">{c.responseAt ? new Date(c.responseAt).toLocaleDateString() : '-'}</td>
                <td className="px-2 py-1 flex gap-1">
                  <button className="btn btn-xs btn-primary">Voir</button>
                  {canEdit && <button className="btn btn-xs btn-secondary" onClick={() => handleEdit(c.id)} disabled={actionLoading === c.id}>Éditer</button>}
                  {canDelete && <button className="btn btn-xs btn-danger" onClick={() => handleDelete(c.id)} disabled={actionLoading === c.id}>Supprimer</button>}
                  {isGestionnaire && c.status === 'PENDING_RESPONSE' && <button className="btn btn-xs btn-success" onClick={() => handleRespond(c.id)} disabled={actionLoading === c.id}>Répondre</button>}
                  {actionError && actionLoading === c.id && <span className="text-red-600 text-xs ml-2">{actionError}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    {/* Edit Modal */}
      {editModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" onClick={() => setEditModal({ open: false })} aria-label="Fermer">✕</button>
            <h2 className="text-xl font-bold mb-4">Éditer le courrier</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Sujet</label>
                <input className="input w-full" value={editModal.subject} onChange={e => setEditModal(m => ({ ...m, subject: e.target.value }))} required />
              </div>
              <div>
                <label className="block font-semibold mb-1">Corps</label>
                <textarea className="input w-full" value={editModal.body} onChange={e => setEditModal(m => ({ ...m, body: e.target.value }))} required />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn" onClick={() => setEditModal({ open: false })}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading === editModal.id}>{actionLoading === editModal.id ? "Enregistrement..." : "Enregistrer"}</button>
              </div>
              {actionError && <div className="text-red-600 text-xs mt-1">{actionError}</div>}
            </form>
          </div>
        </div>
      )}
      {/* Respond Modal */}
      {respondModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" onClick={() => setRespondModal({ open: false })} aria-label="Fermer">✕</button>
            <h2 className="text-xl font-bold mb-4">Répondre au courrier</h2>
            <form onSubmit={handleRespondSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Réponse</label>
                <textarea className="input w-full" value={respondModal.response} onChange={e => setRespondModal(m => ({ ...m, response: e.target.value }))} required />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn" onClick={() => setRespondModal({ open: false })}>Annuler</button>
                <button type="submit" className="btn btn-success" disabled={actionLoading === respondModal.id}>{actionLoading === respondModal.id ? "Envoi..." : "Envoyer"}</button>
              </div>
              {actionError && <div className="text-red-600 text-xs mt-1">{actionError}</div>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourrierPanel;
