import React, { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchDocuments, uploadDocument, archiveDocument, deleteDocument } from '../../../services/bordereauxService';
import { useAuth } from '../../../hooks/useAuth';

const DocumentsPage = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const { data: documents, isLoading, refetch } = useQuery(['documents', id], () => fetchDocuments(id as string), { enabled: !!id });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [docType, setDocType] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<string | null>(null); // docId or null
  const [actionError, setActionError] = useState<string | null>(null);

  // Only Admin and Chef can upload/archive/delete
  const isAdmin = user?.role === 'ADMINISTRATEUR';
  const isChef = user?.role === 'CHEF_EQUIPE';
  const canUpload = isAdmin || isChef;
  const canArchive = isAdmin || isChef;
  const canDelete = isAdmin;

  const handleUpload = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // Placeholder for upload logic (replace with real API call)
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    try {
      await uploadDocument(id, file);
      setSuccess('Document uploadé avec succès.');
      setDocType("");
      refetch();
    } catch {
      setError('Erreur lors de l\'upload du document.');
    } finally {
      setUploading(false);
    }
  };

  // Archive logic
  const handleArchive = async (docId: string) => {
    setActionLoading(docId);
    setActionError(null);
    try {
      await archiveDocument(docId);
      setSuccess('Document archivé avec succès.');
      refetch();
    } catch {
      setActionError('Erreur lors de l\'archivage du document.');
    } finally {
      setActionLoading(null);
    }
  };
  // Delete logic
  const handleDelete = async (docId: string) => {
    setActionLoading(docId);
    setActionError(null);
    try {
      await deleteDocument(docId);
      setSuccess('Document supprimé avec succès.');
      refetch();
    } catch {
      setActionError('Erreur lors de la suppression du document.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Documents liés</h1>
          {canUpload && (
            <>
              <select
                className="input w-32 mr-2"
                value={docType}
                onChange={e => setDocType(e.target.value)}
                disabled={uploading}
              >
                <option value="">Type</option>
                <option value="BS">BS</option>
                <option value="CONTRAT">Contrat</option>
                <option value="AUTRE">Autre</option>
              </select>
              <input type="file" ref={fileInputRef} className="hidden" onChange={onFileChange} />
              <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || !docType}>{uploading ? 'Upload...' : 'Ajouter un document'}</button>
            </>
          )}
        </div>
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        {success && <div className="text-green-600 text-sm mb-2">{success}</div>}
        {isLoading ? (
          <div className="text-center py-10">Chargement...</div>
        ) : documents && documents.length > 0 ? (
          <ul className="list-disc pl-5">
            {documents.map((doc: any) => (
              <li key={doc.id} className="mb-2 flex items-center gap-2">
                <a href={doc.url || doc.path} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">{doc.name || doc.id}</a>
                <span className="ml-2 text-xs text-gray-500">({doc.type})</span>
                <span className="ml-2 text-xs text-gray-400">{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : ''}</span>
                {canArchive && <button className="btn btn-xs btn-secondary ml-2" onClick={() => handleArchive(doc.id)} disabled={actionLoading === doc.id}>{actionLoading === doc.id ? '...':'Archiver'}</button>}
                {canDelete && <button className="btn btn-xs btn-danger ml-2" onClick={() => handleDelete(doc.id)} disabled={actionLoading === doc.id}>{actionLoading === doc.id ? '...':'Supprimer'}</button>}
                {actionError && actionLoading === doc.id && <span className="text-red-600 text-xs ml-2">{actionError}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-500">Aucun document lié</div>
        )}
      </div>
    </div>
  );
};

export default DocumentsPage;
