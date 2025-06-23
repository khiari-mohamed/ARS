import React from 'react';
import { useUserDailyTargetAnalysis } from '../../hooks/useAnalytics';

const DailyTargetTable: React.FC<{ params?: any }> = ({ params = {} }) => {
  const { data, isLoading, error } = useUserDailyTargetAnalysis(params);
  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div className="text-red-600">Erreur chargement daily target</div>;
  return (
    <div>
      <h3 className="text-lg font-bold mb-2">Objectif quotidien par utilisateur</h3>
      <table className="w-full border rounded">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Utilisateur</th>
            <th className="p-2">Moyenne/Jour</th>
            <th className="p-2">Objectif</th>
            <th className="p-2">Atteint</th>
          </tr>
        </thead>
        <tbody>
          {data?.length === 0 ? (
            <tr><td colSpan={4} className="text-center text-gray-500 py-4">Aucun utilisateur</td></tr>
          ) : (
            data?.map((u: any) => (
              <tr key={u.userId}>
                <td className="p-2">{u.userId}</td>
                <td className="p-2">{u.avgPerDay.toFixed(2)}</td>
                <td className="p-2">{u.target}</td>
                <td className="p-2">{u.meetsTarget ? '✅' : '❌'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
export default DailyTargetTable;
