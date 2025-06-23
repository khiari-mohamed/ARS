import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchDocuments } from '../../../services/bordereauxService';

const DocumentsPage = () => {
  const { id } = useParams();
  const { data: documents, isLoading } = useQuery(['documents', id], () => fetchDocuments(id as string), { enabled: !!id });

  if (isLoading) return <div className="text-center py-10">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Documents liés</h1>
        {documents && documents.length > 0 ? (
          <ul className="list-disc pl-5">
            {documents.map((doc: any) => (
              <li key={doc.id} className="mb-2">
                <a href={doc.url} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">{doc.name || doc.id}</a>
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
