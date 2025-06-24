import React, { useState, useEffect } from 'react';
import { useReclamation, useReclamationHistory, useAssignReclamation, useUpdateReclamation } from '../../hooks/useReclamations';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { ModalViewer } from './ModalViewer';
import { useAuth } from '../../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { ReclamationStatus } from '../../types/reclamation.d';
import { fetchUsers, User } from '../../api/usersApi';
import { Document } from '../../types/document.d';
import { escalateReclamation, fetchAutoReplySuggestion, fetchReclamationAIAnalysis } from '../../api/reclamationsApi';

// Import the correct type for history items if available
// If not, define it here:
interface ReclamationHistory {
  id: string;
  createdAt: string | number | Date;
  user?: { id: string; fullName: string };
  userId?: string;
  action: string;
  description?: string;
}

interface Props {
  id: string;
}

interface ExtendedReclamation {
  document?: Document;
  [key: string]: any;
}

export const ReclamationDetail: React.FC<Props> = ({ id }) => {
  const { user } = useAuth();
  const { data: rec, isLoading } = useReclamation(id) as { data: ExtendedReclamation, isLoading: boolean };
  const { data: history } = useReclamationHistory(id);
  const assignMutation = useAssignReclamation();
  const updateMutation = useUpdateReclamation();

  // For assign modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);

  // For status change
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ReclamationStatus | undefined>(undefined);

  // For comment
  const [comment, setComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // For document preview
  const [docModalOpen, setDocModalOpen] = useState(false);

  // Escalation state
  const [escalating, setEscalating] = useState(false);
  const [escalateError, setEscalateError] = useState<string | null>(null);
  // Auto-reply AI
  const [autoReply, setAutoReply] = useState<string | null>(null);
  const [autoReplyLoading, setAutoReplyLoading] = useState(false);
  // AI Analysis
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);

  // Fetch users for assignment
  const { data: users = [] } = useQuery<User[]>(['users'], fetchUsers);

  // Fetch auto-reply suggestion
  useEffect(() => {
    if (!rec?.id) return;
    setAutoReplyLoading(true);
    fetchAutoReplySuggestion(rec.id)
      .then(res => setAutoReply(res.suggestion))
      .catch(() => setAutoReply(null))
      .finally(() => setAutoReplyLoading(false));
  }, [rec?.id]);

  // Fetch AI analysis
  useEffect(() => {
    setAiAnalysisLoading(true);
    fetchReclamationAIAnalysis()
      .then(setAiAnalysis)
      .catch(() => setAiAnalysis(null))
      .finally(() => setAiAnalysisLoading(false));
  }, []);

  if (isLoading) return <div>Chargement...</div>;
  if (!rec) return <div>Réclamation introuvable.</div>;

  // Permissions
  const canAssign =
    user &&
    (user.role === 'CHEF_EQUIPE' ||
      user.role === 'SUPER_ADMIN' ||
      user.role === 'CLIENT_SERVICE');
  const canChangeStatus =
    user &&
    (user.role === 'CHEF_EQUIPE' ||
      user.role === 'SUPER_ADMIN' ||
      (user.role === 'GESTIONNAIRE' && rec.createdById === user.id));

  // Handlers
  const handleAssign = async () => {
    if (!selectedUserId) return;
    await assignMutation.mutateAsync({ id: rec.id, assignedToId: selectedUserId });
    setAssignModalOpen(false);
  };

  const handleStatusChange = async () => {
    if (!selectedStatus) return;
    await updateMutation.mutateAsync({ id: rec.id, dto: { status: selectedStatus } });
    setStatusModalOpen(false);
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    setCommentSubmitting(true);
    try {
      await updateMutation.mutateAsync({ 
        id: rec.id, 
        dto: { 
          description: rec.description ? `${rec.description}\n\n${comment}` : comment 
        } 
      });
      setComment('');
    } finally {
      setCommentSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-2 md:p-6 bg-white rounded shadow-md">
      <h2 className="text-xl font-bold mb-2">Détail Réclamation</h2>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <StatusBadge status={rec.status} /> <PriorityBadge severity={rec.severity} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div><strong>Client:</strong> {rec.client?.name || rec.clientId}</div>
        <div><strong>Type:</strong> {rec.type}</div>
        <div><strong>Date:</strong> {new Date(rec.createdAt).toLocaleString()}</div>
        <div><strong>Assigné à:</strong> {rec.assignedTo?.fullName || '-'}</div>
        <div className="md:col-span-2"><strong>Description:</strong> {rec.description}</div>
        <div><strong>Bordereau lié:</strong> {rec.bordereauId || '-'}</div>
        <div><strong>Preuve:</strong> {rec.evidencePath ? (<a href={rec.evidencePath} target="_blank" rel="noopener noreferrer">Télécharger</a>) : '-'}</div>
        <div className="md:col-span-2">
          <strong>Document lié:</strong>{' '}
          {rec.document?.path ? (
            <>
              <button
                className="text-blue-600 underline"
                onClick={() => setDocModalOpen(true)}
              >
                Afficher le document
              </button>
              <ModalViewer
                open={docModalOpen}
                onClose={() => setDocModalOpen(false)}
                title="Document lié"
                fileUrl={rec.document.path}
                fileType={rec.document.type === 'pdf' ? 'pdf' : 'image'}
              />
            </>
          ) : rec.documentId ? (
            <span>{rec.documentId}</span>
          ) : (
            '-'
          )}
        </div>
      </div>
      {/* GEC Section */}
      <div className="mt-4 p-3 bg-gray-50 rounded flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <strong>Courrier GEC:</strong>{' '}
          <button className="bg-blue-600 text-white px-3 py-1 rounded mr-2" onClick={() => window.open(`/reclamations/${rec.id}/gec/document`, '_blank')}>Voir le courrier</button>
          <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={() => window.open(`/reclamations/${rec.id}/gec/generate`, '_blank')}>Générer le courrier</button>
        </div>
        <div>
          <button className="bg-gray-700 text-white px-3 py-1 rounded" onClick={() => window.open('/gec-templates', '_blank')}>Gérer les modèles GEC</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {canChangeStatus && (
          <button
            className="bg-yellow-500 text-white px-3 py-1 rounded"
            onClick={() => setStatusModalOpen(true)}
          >
            Changer le statut
          </button>
        )}
        {canAssign && (
          <button
            className="bg-purple-600 text-white px-3 py-1 rounded"
            onClick={() => setAssignModalOpen(true)}
          >
            Affecter à un agent
          </button>
        )}
        {/* Escalate button for eligible users/statuses */}
        {canChangeStatus && rec.status !== 'ESCALATED' && (
          <button
            className="bg-red-600 text-white px-3 py-1 rounded"
            disabled={escalating}
            onClick={async () => {
              setEscalating(true);
              setEscalateError(null);
              try {
                await escalateReclamation(rec.id);
                window.location.reload();
              } catch (e: any) {
                setEscalateError(e?.message || 'Erreur lors de l\'escalade');
              } finally {
                setEscalating(false);
              }
            }}
          >
            {escalating ? 'Escalade...' : 'Escalader'}
          </button>
        )}
      </div>
      {escalateError && <div style={{ color: 'red' }}>{escalateError}</div>}
      {/* Status Modal */}
      {statusModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-96">
            <h3 className="font-bold mb-2">Changer le statut</h3>
            <select
              className="w-full border rounded mb-4"
              value={selectedStatus || rec.status}
              onChange={e => setSelectedStatus(e.target.value as ReclamationStatus)}
            >
              {['OPEN', 'IN_PROGRESS', 'ESCALATED', 'PENDING_CLIENT_REPLY', 'RESOLVED', 'CLOSED'].map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <button className="px-3 py-1" onClick={() => setStatusModalOpen(false)}>
                Annuler
              </button>
              <button
                className="bg-yellow-500 text-white px-3 py-1 rounded"
                onClick={handleStatusChange}
                disabled={updateMutation.isLoading}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Assign Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-96">
            <h3 className="font-bold mb-2">Affecter à un agent</h3>
            <select
              className="w-full border rounded mb-4"
              value={selectedUserId || ''}
              onChange={e => setSelectedUserId(e.target.value)}
            >
              <option value="">Sélectionner un agent</option>
              {users.map((u: User) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <button className="px-3 py-1" onClick={() => setAssignModalOpen(false)}>
                Annuler
              </button>
              <button
                className="bg-purple-600 text-white px-3 py-1 rounded"
                onClick={handleAssign}
                disabled={assignMutation.isLoading}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Comment Box */}
      {/* AI Auto-Reply Suggestion */}
      <div className="mt-6">
        <h4 className="font-semibold mb-1">Suggestion de réponse automatique (IA)</h4>
        {autoReplyLoading ? (
          <div>Chargement de la suggestion...</div>
        ) : autoReply ? (
          <div style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, marginBottom: 8 }}>
            <span style={{ fontFamily: 'monospace' }}>{autoReply}</span>
            <button
              style={{ marginLeft: 12, fontSize: 13 }}
              onClick={() => setComment(comment + (comment ? '\n' : '') + autoReply)}
            >
              Insérer dans le commentaire
            </button>
            <button
              style={{ marginLeft: 8, fontSize: 13 }}
              onClick={() => navigator.clipboard.writeText(autoReply)}
            >
              Copier
            </button>
          </div>
        ) : (
          <div style={{ color: '#888' }}>Aucune suggestion disponible.</div>
        )}
      </div>
      <div className="mt-6">
        <h4 className="font-semibold mb-1">Ajouter un commentaire / remarque</h4>
        <textarea
          className="w-full border rounded p-2 mb-2"
          rows={3}
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Votre commentaire..."
        />
        <button
          className="bg-blue-600 text-white px-3 py-1 rounded"
          onClick={handleAddComment}
          disabled={commentSubmitting || !comment.trim()}
        >
          {commentSubmitting ? 'Envoi...' : 'Ajouter'}
        </button>
      </div>
      <hr className="my-4" />
      {/* AI Analysis Section */}
      <div className="mb-4">
        <h3 className="font-semibold">Analyse IA</h3>
        {aiAnalysisLoading ? (
          <div>Chargement de l'analyse IA...</div>
        ) : aiAnalysis && Array.isArray(aiAnalysis.byType) ? (
          <div style={{ fontSize: 14 }}>
            <div><b>Par type:</b> {aiAnalysis.byType.map((t: any) => `${t.type}: ${t._count.id}`).join(', ')}</div>
            <div><b>Par gravité:</b> {aiAnalysis.bySeverity.map((s: any) => `${s.severity}: ${s._count.id}`).join(', ')}</div>
            <div><b>Résolues:</b> {aiAnalysis.resolved}</div>
            <div><b>Ouvertes:</b> {aiAnalysis.open}</div>
            <div><b>Total:</b> {aiAnalysis.total}</div>
          </div>
        ) : (
          <div style={{ color: '#888' }}>Aucune analyse IA disponible.</div>
        )}
      </div>
      <h3 className="font-semibold">Historique</h3>
      <ul>
        {history?.map((h: ReclamationHistory) => (
          <li key={h.id}>
            <span className="text-xs text-gray-500">{new Date(h.createdAt).toLocaleString()}</span>
            {' - '}
            <strong>{h.user?.fullName || h.userId}</strong> : {h.action}
            {h.description && <> — <span>{h.description}</span></>}
          </li>
        ))}
      </ul>
    </div>
  );
};