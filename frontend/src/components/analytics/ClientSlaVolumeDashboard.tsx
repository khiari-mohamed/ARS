import React, { useState } from 'react';
import { useClientDashboard } from '../../hooks/useAnalytics';

const ClientSlaVolumeDashboard: React.FC = () => {
  const [clientId, setClientId] = useState('');
  const { data, isLoading, error } = useClientDashboard(clientId ? { clientId } : {});
  return (
    <div className="mb-4">
      <h3 className="text-lg font-bold mb-2">KPI Client</h3>
      <input
        className="border p-1 mb-2"
        placeholder="Client ID"
        value={clientId}
        onChange={e => setClientId(e.target.value)}
      />
      {isLoading && <div>Chargement...</div>}
      {error && <div className="text-red-600">Erreur chargement client dashboard</div>}
      {data && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded shadow p-4">
            <div className="font-semibold">Volume</div>
            <div>{data.volume}</div>
          </div>
          <div className="bg-white rounded shadow p-4">
            <div className="font-semibold">SLA Compliance</div>
            <div>{data.slaCompliant}</div>
          </div>
          <div className="bg-white rounded shadow p-4">
            <div className="font-semibold">SLA Breaches</div>
            <div>{data.slaBreaches}</div>
          </div>
          <div className="bg-white rounded shadow p-4">
            <div className="font-semibold">% Compliance</div>
            <div>{data.complianceRate}%</div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ClientSlaVolumeDashboard;
