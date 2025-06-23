import React from 'react';

interface BSListTableProps {
  bsList: any[];
}

const BSListTable: React.FC<BSListTableProps> = ({ bsList }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded shadow">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left">Numéro BS</th>
            <th className="px-4 py-2 text-left">Statut</th>
            <th className="px-4 py-2 text-left">Propriétaire</th>
            <th className="px-4 py-2 text-left">Date action</th>
            <th className="px-4 py-2 text-left">Documents</th>
          </tr>
        </thead>
        <tbody>
          {bsList.map((bs) => (
            <tr key={bs.id} className="border-t">
              <td className="px-4 py-2">{bs.numBs}</td>
              <td className="px-4 py-2">{bs.status}</td>
              <td className="px-4 py-2">{bs.owner?.username || bs.ownerId}</td>
              <td className="px-4 py-2">{bs.processedAt ? new Date(bs.processedAt).toLocaleDateString() : '-'}</td>
              <td className="px-4 py-2">
                {bs.documentId ? (
                  <a href={`/documents/${bs.documentId}`} className="text-blue-600 underline">Voir</a>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BSListTable;
