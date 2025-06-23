import React from 'react';
import { useSlaComplianceByUser } from '../../hooks/useAnalytics';

const SlaComplianceChart: React.FC<{ params?: any }> = ({ params = {} }) => {
  const { data, isLoading, error } = useSlaComplianceByUser(params);
  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div className="text-red-600">Erreur chargement SLA compliance</div>;
  return (
    <div>
      <h3 className="text-lg font-bold mb-2">% SLA Compliance par utilisateur</h3>
      <table className="w-full border rounded">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Utilisateur</th>
            <th className="p-2">Total</th>
            <th className="p-2">SLA OK</th>
            <th className="p-2">% Compliance</th>
          </tr>
        </thead>
        <tbody>
          {data?.length === 0 ? (
            <tr><td colSpan={4} className="text-center text-gray-500 py-4">Aucun utilisateur</td></tr>
          ) : (
            data?.map((u: any) => (
              <tr key={u.userId}>
                <td className="p-2">{u.userId}</td>
                <td className="p-2">{u.total}</td>
                <td className="p-2">{u.slaCompliant}</td>
                <td className="p-2">{u.complianceRate}%</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
export default SlaComplianceChart;
