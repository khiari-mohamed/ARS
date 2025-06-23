import React from 'react';
import { useReclamationPerformance } from '../../hooks/useAnalytics';

const ReclamationPerformanceTable: React.FC<{ params?: any }> = ({ params = {} }) => {
  const { data, isLoading, error } = useReclamationPerformance(params);
  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div className="text-red-600">Erreur chargement performance réclamations</div>;
  return (
    <div>
      <h3 className="text-lg font-bold mb-2">Classement performance réclamations</h3>
      <table className="w-full border rounded">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Utilisateur</th>
            <th className="p-2">Réclamations traitées</th>
          </tr>
        </thead>
        <tbody>
          {data?.length === 0 ? (
            <tr><td colSpan={2} className="text-center text-gray-500 py-4">Aucun utilisateur</td></tr>
          ) : (
            data?.map((u: any) => (
              <tr key={u.uploadedById}>
                <td className="p-2">{u.uploadedById}</td>
                <td className="p-2">{u._count.id}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
export default ReclamationPerformanceTable;
