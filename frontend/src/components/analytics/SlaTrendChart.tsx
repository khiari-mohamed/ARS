import React, { useState } from 'react';
import { useSlaTrend } from '../../hooks/useAnalytics';

const SlaTrendChart: React.FC = () => {
  const [params, setParams] = useState<any>({});
  const { data = [], isLoading, error } = useSlaTrend(params);
  return (
    <div>
      <h3 className="text-lg font-bold mb-2">Tendance de conformité SLA</h3>
      <div className="flex gap-2 mb-2">
        <input name="teamId" placeholder="Team ID" className="border p-1" onChange={e => setParams((p: any) => ({ ...p, teamId: e.target.value }))} />
        <input name="userId" placeholder="User ID" className="border p-1" onChange={e => setParams((p: any) => ({ ...p, userId: e.target.value }))} />
        <input name="fromDate" type="date" className="border p-1" onChange={e => setParams((p: any) => ({ ...p, fromDate: e.target.value }))} />
        <input name="toDate" type="date" className="border p-1" onChange={e => setParams((p: any) => ({ ...p, toDate: e.target.value }))} />
      </div>
      {isLoading && <div>Chargement...</div>}
      {error && <div className="text-red-600">Erreur chargement tendance SLA</div>}
      <table className="w-full border rounded mt-2">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Date</th>
            <th className="p-2">Total</th>
            <th className="p-2">SLA OK</th>
            <th className="p-2">% Compliance</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d: any, i: number) => (
            <tr key={d.date + '-' + i}>
              <td className="p-2">{d.date}</td>
              <td className="p-2">{d.total}</td>
              <td className="p-2">{d.slaCompliant}</td>
              <td className="p-2">{d.complianceRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default SlaTrendChart;
