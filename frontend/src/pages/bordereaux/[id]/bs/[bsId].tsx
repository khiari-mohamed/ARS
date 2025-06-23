import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchBSList } from '../../../../services/bordereauxService';

const BSDetailsPage = () => {
  const { id, bsId } = useParams();
  const { data: bsList, isLoading } = useQuery(['bsList', id], () => fetchBSList(id as string), { enabled: !!id });
  const bs = bsList?.find((b: any) => b.id === bsId);

  if (isLoading || !bs) return <div className="text-center py-10">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded shadow p-6">
        <h1 className="text-2xl font-bold mb-4">BS {bs.numBs}</h1>
        <div className="mb-2">Statut: <span className="font-semibold">{bs.status}</span></div>
        <div className="mb-2">Propriétaire: {bs.owner?.username || bs.ownerId}</div>
        <div className="mb-2">Date action: {bs.processedAt ? new Date(bs.processedAt).toLocaleDateString() : '-'}</div>
        <div className="mb-2">Document: {bs.documentId ? <a href={`/documents/${bs.documentId}`} className="text-blue-600 underline">Voir</a> : <span className="text-gray-400">-</span>}</div>
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Historique / OCR</h2>
          {/* Placeholder for OCR output, logs, etc. */}
          <div className="text-gray-500">À implémenter: OCR, logs utilisateur, etc.</div>
        </div>
      </div>
    </div>
  );
};

export default BSDetailsPage;
