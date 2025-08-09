import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchBordereau, fetchBSList, fetchDocuments, fetchVirement, fetchAlerts } from '../../services/bordereauxService';
import BordereauStatusBadge from '../../components/BordereauStatusBadge';
import BSListTable from '../../components/BSListTable';
import CourrierPanel from '../../components/CourrierPanel';
import { useAuth } from '../../hooks/useAuth';

const TABS = [
  { key: 'info', label: 'Info' },
  { key: 'bs', label: 'BS' },
  { key: 'documents', label: 'Documents' },
  { key: 'courriers', label: 'Courriers' },
  { key: 'virement', label: 'Virement' },
  { key: 'alertes', label: 'Alertes' },
  { key: 'history', label: 'Historique' },
];

const BordereauDetailsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('info');
  const { data: bordereau, isLoading } = useQuery(['bordereau', id], () => fetchBordereau(id as string), { enabled: !!id });
  const { data: bsList } = useQuery(['bsList', id], () => fetchBSList(id as string), { enabled: !!id });
  const { data: documents } = useQuery(['documents', id], () => fetchDocuments(id as string), { enabled: !!id });
  const { data: virement } = useQuery(['virement', id], () => fetchVirement(id as string), { enabled: !!id });
  const { data: alerts } = useQuery(['alerts', id], () => fetchAlerts(id as string), { enabled: !!id });

  if (!isAuthenticated || !user) return <div className="text-center py-10 text-gray-500">Authentification requise.</div>;
  if (isLoading || !bordereau) return <div className="text-center py-10">Chargement...</div>;

  // Role-based permissions
  const isChef = user.role === 'CHEF_EQUIPE';
  const isGestionnaire = user.role === 'GESTIONNAIRE';
  const isAdmin = user.role === 'ADMINISTRATEUR';
  const isBO = user.role === 'CLIENT_SERVICE';

  // Actions (to be implemented: assign, mark as processed, return, export, etc.)
  // Example: Only Chef/Admin can assign
  const canAssign = isChef || isAdmin;
  // Only Gestionnaire can mark as processed/return
  const canProcess = isGestionnaire;
  // Only Admin can export/audit
  const canExport = isAdmin;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded shadow p-6">
        {/* Top Info Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
          <div>
            <h1 className="text-2xl font-bold mb-1">Bordereau {bordereau.reference}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span>Client: {bordereau.client ? (
                <a href={`/clients/${bordereau.client.id}`} className="text-blue-600 underline">{bordereau.client.name}</a>
              ) : bordereau.clientId}</span>
              <span>Contrat: {bordereau.contract ? (
                <a href={`/contracts/${bordereau.contract.id}`} className="text-blue-600 underline">{bordereau.contract.clientName}</a>
              ) : bordereau.contractId}</span>
              <span>Gestionnaire: {bordereau.currentHandler ? (
                <a href={`/users/${bordereau.currentHandler.id}`} className="text-blue-600 underline">{bordereau.currentHandler.fullName || bordereau.currentHandler.id}</a>
              ) : bordereau.currentHandlerId || '-'}</span>
              <span>Date réception: {new Date(bordereau.dateReception).toLocaleDateString()}</span>
              <span>Deadline: <span className={
                bordereau.statusColor === 'RED' ? 'text-red-600 font-bold' :
                bordereau.statusColor === 'ORANGE' ? 'text-orange-600 font-bold' :
                'text-green-600 font-bold'}>{bordereau.daysRemaining} jours</span></span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <BordereauStatusBadge statut={bordereau.statut} color={bordereau.statusColor} />
            <div className="flex gap-2">
              {bordereau.statusColor === 'RED' && <span className="inline-block w-4 h-4 rounded-full bg-red-500" title="Retard" />}
              {bordereau.statusColor === 'ORANGE' && <span className="inline-block w-4 h-4 rounded-full bg-yellow-400" title="Risque" />}
              {bordereau.statusColor === 'GREEN' && <span className="inline-block w-4 h-4 rounded-full bg-green-500" title="OK" />}
            </div>
          </div>
        </div>
        {/* Role-based action bar */}
        <div className="flex flex-wrap gap-2 mb-4">
          {canAssign && <button className="btn btn-primary btn-xs">Affecter à un gestionnaire</button>}
          {canProcess && <>
            <button className="btn btn-success btn-xs">Marquer comme traité</button>
            <button className="btn btn-warning btn-xs">Retourner au chef</button>
          </>}
          {canExport && <button className="btn btn-secondary btn-xs">Exporter</button>}
        </div>
        {/* Tabs */}
        <div className="flex gap-2 border-b mb-6">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`px-4 py-2 font-semibold border-b-2 transition ${tab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-blue-600'}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {/* Tab Content */}
        {tab === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-600">Nombre de BS: {bordereau.nombreBS}</div>
              <div className="text-sm text-gray-600">SLA: <span className={`font-bold ${bordereau.statusColor === 'RED' ? 'text-red-600' : bordereau.statusColor === 'ORANGE' ? 'text-orange-600' : 'text-green-600'}`}>{bordereau.statusColor}</span></div>
              <div className="text-sm text-gray-600">Temps écoulé: {bordereau.daysElapsed} jours</div>
              <div className="text-sm text-gray-600">Durée scan: {bordereau.scanDuration ?? '-'}</div>
              <div className="text-sm text-gray-600">Durée totale: {bordereau.totalDuration ?? '-'}</div>
              <div className="text-sm text-gray-600">Retard: {bordereau.isOverdue ? 'Oui' : 'Non'}</div>
            </div>
            <div>
              {/* KPIs or performance widgets can go here */}
            </div>
          </div>
        )}
        {tab === 'bs' && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">BS List</h2>
            <BSListTable bsList={bsList || []} />
          </div>
        )}
        {tab === 'documents' && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Documents</h2>
            {documents && documents.length > 0 ? (
              <ul className="list-disc pl-5">
                {documents.map((doc: any) => (
                  <li key={doc.id}><a href={doc.url || doc.path} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">{doc.name || doc.id}</a></li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-500">Aucun document lié</div>
            )}
            {/* Document upload for Chef/Admin */}
            {(isChef || isAdmin) && (
              <button className="btn btn-primary btn-xs mt-2">Ajouter un document</button>
            )}
          </div>
        )}
        {tab === 'courriers' && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Courriers</h2>
            <CourrierPanel />
          </div>
        )}
        {tab === 'virement' && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Virement</h2>
            {virement ? (
              <div className="text-sm text-gray-600">Montant: {virement.amount} | Statut: {virement.status} | Date: {virement.date}</div>
            ) : (
              <div className="text-gray-500">Aucun virement</div>
            )}
          </div>
        )}
        {tab === 'alertes' && (
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
        )}
        {tab === 'history' && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Traitement History</h2>
            {bordereau.traitementHistory && bordereau.traitementHistory.length > 0 ? (
              <ul className="list-disc pl-5">
                {bordereau.traitementHistory.map((h: any) => (
                  <li key={h.id}>
                    {h.createdAt && <span>{new Date(h.createdAt).toLocaleString()} - </span>}
                    {h.action} | Utilisateur: {h.user ? <a href={`/users/${h.user.id}`} className="text-blue-600 underline">{h.user.fullName || h.user.id}</a> : h.userId}
                    {h.assignedTo && <> | Assigné à: <a href={`/users/${h.assignedTo.id}`} className="text-blue-600 underline">{h.assignedTo.fullName || h.assignedTo.id}</a></>}
                    {h.toStatus && <> | Statut: {h.toStatus}</>}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-500">Aucun historique</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BordereauDetailsPage;
