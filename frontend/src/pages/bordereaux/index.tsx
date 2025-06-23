import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBordereaux, fetchKPIs } from '../../services/bordereauxService';
import BordereauCard from '../../components/BordereauCard';
import BordereauFilters from '../../components/BordereauFilters';
import BSProgress from '../../components/BSProgress';
import { StatusColor } from '../../utils/enums';

const BordereauxListPage = () => {
  const { data: bordereaux, isLoading, error } = useQuery(['bordereaux'], () => fetchBordereaux());
  const { data: kpis } = useQuery(['bordereaux-kpis'], fetchKPIs);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Bordereaux</h1>
        <BordereauFilters onChange={function (filters: any): void {
          throw new Error('Function not implemented.');
        } } />
        {kpis && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
            <div className="bg-white rounded shadow p-4 text-center">
              <div className="text-lg font-semibold">Reçus cette semaine</div>
              <div className="text-2xl">{kpis.bordereauxReceivedThisWeek ?? '-'}</div>
            </div>
            <div className="bg-white rounded shadow p-4 text-center">
              <div className="text-lg font-semibold">BS traités</div>
              <div className="text-2xl">{kpis.bsProcessed ?? '-'}</div>
            </div>
            <div className="bg-white rounded shadow p-4 text-center">
              <div className="text-lg font-semibold">% SLA</div>
              <div className="text-2xl">{kpis.slaCompliance ?? '-'}</div>
            </div>
            <div className="bg-white rounded shadow p-4 text-center">
              <div className="text-lg font-semibold">Temps moyen</div>
              <div className="text-2xl">{kpis.avgTreatmentTime ?? '-'}</div>
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="text-center py-10">Chargement...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-10">Erreur de chargement</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bordereaux && bordereaux.length > 0 ? (
              bordereaux.map((b: any) => (
                <BordereauCard key={b.id} bordereau={b} />
              ))
            ) : (
              <div className="col-span-full text-center text-gray-500 py-10">Aucun bordereau trouvé</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BordereauxListPage;
