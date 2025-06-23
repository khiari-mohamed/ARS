import React, { useState } from 'react';
import { useReclamations } from '../../hooks/useReclamations';
import { ExportButtons } from './ExportButtons';
import { SkeletonTable } from './SkeletonTable';
import { FilterPanel } from './FilterPanel';
import { Reclamation } from '../../types/reclamation.d';

const columns = [
  { label: 'ID', key: 'id' },
  { label: 'Client', key: 'clientId' },
  { label: 'Type', key: 'type' },
  { label: 'Gravité', key: 'severity' },
  { label: 'Statut', key: 'status' },
  { label: 'Date', key: 'createdAt' },
  { label: 'Assigné à', key: 'assignedToId' },
];

export const Reporting: React.FC = () => {
  const [filters, setFilters] = useState<any>({});
  const { data, isLoading } = useReclamations(filters);

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Reporting Réclamations</h2>
      <FilterPanel
        filters={filters}
        onChange={setFilters}
        clients={[]}
        users={[]}
        types={['retard', 'document manquant', 'erreur traitement', 'autre']}
      />
      <ExportButtons data={data || []} columns={columns} fileName="reporting-reclamations" />
      <div className="overflow-x-auto rounded shadow bg-white mt-4">
        {isLoading ? (
          <SkeletonTable rows={8} cols={columns.length} />
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key} className="px-2 py-1 border-b font-semibold text-left">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.isArray(data) && data.length > 0 ? (
                data.map((rec: Reclamation) => (
                  <tr key={rec.id} className="hover:bg-gray-50">
                    {columns.map(col => (
                      <td key={col.key} className="px-2 py-1 border-b">
                        {col.key === 'createdAt'
                          ? new Date(rec.createdAt).toLocaleString()
                          : (rec as any)[col.key] || '-'}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="text-center py-4 text-gray-500">
                    Aucune donnée à afficher.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      <div className="mt-6 print:hidden">
        <button
          className="bg-gray-700 text-white px-4 py-2 rounded"
          onClick={() => window.print()}
        >
          Imprimer ce rapport
        </button>
      </div>
    </div>
  );
};
