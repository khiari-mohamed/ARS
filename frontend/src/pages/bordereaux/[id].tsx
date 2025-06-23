import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchBordereau, fetchBSList, fetchDocuments, fetchVirement, fetchAlerts } from '../../services/bordereauxService';
import BordereauStatusBadge from '../../components/BordereauStatusBadge';
import BSListTable from '../../components/BSListTable';

const BordereauDetailsPage = () => {
  const { id } = useParams();
  const { data: bordereau, isLoading } = useQuery(['bordereau', id], () => fetchBordereau(id as string), { enabled: !!id });
  const { data: bsList } = useQuery(['bsList', id], () => fetchBSList(id as string), { enabled: !!id });
  const { data: documents } = useQuery(['documents', id], () => fetchDocuments(id as string), { enabled: !!id });
  const { data: virement } = useQuery(['virement', id], () => fetchVirement(id as string), { enabled: !!id });
  const { data: alerts } = useQuery(['alerts', id], () => fetchAlerts(id as string), { enabled: !!id });

  if (isLoading || !bordereau) return <div className="text-center py-10">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Bordereau {bordereau.reference}</h1>
          <BordereauStatusBadge statut={bordereau.statut} color={bordereau.statusColor} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <div className="text-sm text-gray-600">Client: {bordereau.client?.username || bordereau.clientId}</div>
            <div className="text-sm text-gray-600">Contrat: {bordereau.contract?.name || bordereau.contractId}</div>
            <div className="text-sm text-gray-600">Date réception: {new Date(bordereau.dateReception).toLocaleDateString()}</div>
            <div className="text-sm text-gray-600">Deadline: {bordereau.daysRemaining} jours restants</div>
            <div className="text-sm text-gray-600">Nombre de BS: {bordereau.nombreBS}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">SLA: <span className={`font-bold ${bordereau.statusColor === 'RED' ? 'text-red-600' : bordereau.statusColor === 'ORANGE' ? 'text-orange-600' : 'text-green-600'}`}>{bordereau.statusColor}</span></div>
            <div className="text-sm text-gray-600">Temps écoulé: {bordereau.daysElapsed} jours</div>
            <div className="text-sm text-gray-600">Durée scan: {bordereau.scanDuration ?? '-'}</div>
            <div className="text-sm text-gray-600">Durée totale: {bordereau.totalDuration ?? '-'}</div>
            <div className="text-sm text-gray-600">Retard: {bordereau.isOverdue ? 'Oui' : 'Non'}</div>
          </div>
        </div>
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">BS List</h2>
          <BSListTable bsList={bsList || []} />
        </div>
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Documents</h2>
          {documents && documents.length > 0 ? (
            <ul className="list-disc pl-5">
              {documents.map((doc: any) => (
                <li key={doc.id}><a href={doc.url} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">{doc.name || doc.id}</a></li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-500">Aucun document lié</div>
          )}
        </div>
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Virement</h2>
          {virement ? (
            <div className="text-sm text-gray-600">Montant: {virement.amount} | Statut: {virement.status} | Date: {virement.date}</div>
          ) : (
            <div className="text-gray-500">Aucun virement</div>
          )}
        </div>
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Alertes</h2>
          {alerts && alerts.length > 0 ? (
            <ul className="list-disc pl-5">
              {alerts.map((alert: any) => (
                <li key={alert.id} className="text-red-600">{alert.message}</li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-500">Aucune alerte</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BordereauDetailsPage;
