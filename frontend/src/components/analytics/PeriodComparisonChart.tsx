import React, { useState } from 'react';
import { useComparativeAnalysis } from '../../hooks/useAnalytics';

const PeriodComparisonChart: React.FC = () => {
  const [period1, setPeriod1] = useState({ fromDate: '', toDate: '' });
  const [period2, setPeriod2] = useState({ fromDate: '', toDate: '' });
  const canQuery = !!(period1.fromDate && period1.toDate && period2.fromDate && period2.toDate);
  const [backendError, setBackendError] = useState<string | null>(null);
  const { data, isLoading, error } = useComparativeAnalysis(
    { period1, period2 },
    { enabled: canQuery }
  );

  React.useEffect(() => {
    if (error && (error as any).response && (error as any).response.data && (error as any).response.data.message) {
      setBackendError((error as any).response.data.message);
    } else if (error) {
      setBackendError('Erreur inconnue du serveur');
    } else {
      setBackendError(null);
    }
  }, [error]);
  return (
    <div>
      <h3 className="text-lg font-bold mb-2">Comparaison de périodes</h3>
      <div className="flex gap-4 mb-2">
        <div>
          <div>Période 1</div>
          <input type="date" value={period1.fromDate} onChange={e => setPeriod1(p => ({ ...p, fromDate: e.target.value }))} className="border p-1" />
          <input type="date" value={period1.toDate} onChange={e => setPeriod1(p => ({ ...p, toDate: e.target.value }))} className="border p-1 ml-2" />
        </div>
        <div>
          <div>Période 2</div>
          <input type="date" value={period2.fromDate} onChange={e => setPeriod2(p => ({ ...p, fromDate: e.target.value }))} className="border p-1" />
          <input type="date" value={period2.toDate} onChange={e => setPeriod2(p => ({ ...p, toDate: e.target.value }))} className="border p-1 ml-2" />
        </div>
      </div>
      {isLoading && <div>Chargement...</div>}
      {backendError && <div className="text-red-600">{backendError}</div>}
      {data && (
        <table className="w-full border rounded mt-2">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Période</th>
              <th className="p-2">Total</th>
              <th className="p-2">SLA OK</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2">Période 1</td>
              <td className="p-2">{data.period1.total}</td>
              <td className="p-2">{data.period1.sla}</td>
            </tr>
            <tr>
              <td className="p-2">Période 2</td>
              <td className="p-2">{data.period2.total}</td>
              <td className="p-2">{data.period2.sla}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
};
export default PeriodComparisonChart;
