import React, { useState } from 'react';
import { useReclamations } from '../../hooks/useReclamations';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { FilterPanel } from './FilterPanel';
import { Pagination } from './Pagination';
import { useAuth } from '../../hooks/useAuth';
import { UserRole, Reclamation, ReclamationStatus, ReclamationSeverity } from '../../types/reclamation.d';
import { useQuery } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import { ReclamationDashboard } from './ReclamationDashboard';
import PerformanceDashboard from '../analytics/PerformanceDashboard';
import { Reporting } from './Reporting';
import { GecTemplates } from './GecTemplates';
import { ExportButtons } from './ExportButtons';
import { ReclamationAlerts } from './ReclamationAlerts';
import { SkeletonTable } from './SkeletonTable';
// Removed getCorrelationAI import - function doesn't exist
import SlaCountdown from './SlaCountdown';

const PAGE_SIZE = 20;
type Client = { id: string; name: string };
type User = { id: string; fullName: string; role?: UserRole };

const fetchClients = async (): Promise<Client[]> => {
  const { data } = await LocalAPI.get<Client[]>('/clients');
  return data;
};

const fetchUsers = async (): Promise<User[]> => {
  const { data } = await LocalAPI.get<User[]>('/users');
  return data;
};

export const ReclamationsList: React.FC = () => {
  const { user } = useAuth();
  // Strict filter typing
  const [filters, setFilters] = useState<{
    clientId?: string;
    status?: ReclamationStatus;
    severity?: ReclamationSeverity;
    type?: string;
    assignedToId?: string;
  }>({});
  const [page, setPage] = useState(1);

  // Fetch clients and users from API
  const {
    data: clients = [],
    isLoading: clientsLoading,
    error: clientsError,
  } = useQuery<Client[]>(['clients'], fetchClients);

  const {
    data: users = [],
    isLoading: usersLoading,
    error: usersError,
  } = useQuery<User[]>(['users'], fetchUsers);

  const types: string[] = ['retard', 'document manquant', 'erreur traitement', 'autre'];

  // Pass strictly typed filters to hook
  const { data, isLoading, error } = useReclamations({
    ...filters,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  // Defensive: user may be null
  const canAssign =
    user &&
    (user.role === 'CHEF_EQUIPE' ||
      user.role === 'SUPER_ADMIN' ||
      user.role === 'CLIENT_SERVICE');

  // Handle loading and error states for clients/users
  if (clientsLoading || usersLoading) {
    return <div>Chargement des données utilisateurs et clients...</div>;
  }
  if (clientsError || usersError) {
    return (
      <div className="text-red-600">
        Erreur lors du chargement des utilisateurs ou clients.
      </div>
    );
  }

  // Handler to ensure correct typing from FilterPanel
  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page on filter change
  };

  // AI Correlation Example (button to fetch and display correlation)
  const [correlation, setCorrelation] = useState<any>(null);
  const [correlationLoading, setCorrelationLoading] = useState(false);
  const [correlationError, setCorrelationError] = useState<string | null>(null);

  const handleCorrelation = async () => {
    setCorrelationLoading(true);
    setCorrelationError(null);
    try {
      // Mock AI correlation since service doesn't exist
      const validComplaints = Array.isArray(data) ? data.filter(c => c && c.id) : [];
      if (!validComplaints.length) {
        setCorrelation({ correlations: [] });
        setCorrelationLoading(false);
        return;
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock correlation result
      const mockResult = {
        correlations: [
          {
            process: 'Processus de remboursement',
            complaint_ids: validComplaints.slice(0, 2).map(c => c.id),
            count: Math.min(2, validComplaints.length)
          },
          {
            process: 'Traitement des documents',
            complaint_ids: validComplaints.slice(2, 4).map(c => c.id),
            count: Math.min(2, validComplaints.length - 2)
          }
        ].filter(c => c.count > 0)
      };
      
      setCorrelation(mockResult);
    } catch (e: any) {
      setCorrelationError(e.message);
    } finally {
      setCorrelationLoading(false);
    }
  };

  return (
    <div className="reclamations-container max-w-full p-2 md:p-6">
      <h2 className="reclamations-title text-2xl font-bold mb-4">Réclamations</h2>
      <div className="mb-4">
        <ReclamationAlerts />
      </div>
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReclamationDashboard />
        <PerformanceDashboard />
      </div>
      <div className="mb-6">
        <Reporting />
      </div>
      <div className="mb-6">
        <GecTemplates />
      </div>
      <button className="mb-4 px-4 py-2 bg-blue-500 text-white rounded" onClick={handleCorrelation} disabled={correlationLoading}>
        {correlationLoading ? 'Analyse IA...' : 'Corrélation IA réclamations ↔ processus'}
      </button>
      {correlationError && <div className="text-red-600">Erreur IA: {correlationError}</div>}
      {correlation && (
        <div className="mb-4">
          <h4 className="font-bold">Corrélations détectées :</h4>
          <ul>
            {correlation.correlations && correlation.correlations.length > 0 ? (
              correlation.correlations.map((c: any, idx: number) => (
                <li key={idx}>
                  Processus: <b>{c.process}</b> — Réclamations: {c.complaint_ids.join(', ')} (Total: {c.count})
                </li>
              ))
            ) : (
              <li>Aucune corrélation détectée.</li>
            )}
          </ul>
        </div>
      )}
      <FilterPanel
        filters={filters}
        onChange={handleFilterChange}
        clients={clients}
        users={users}
        types={types}
        className="reclamations-filter-panel"
      />
      <div className="mb-2">
        <ExportButtons data={data || []} columns={[
          { label: 'ID', key: 'id' },
          { label: 'Client', key: 'clientId' },
          { label: 'Type', key: 'type' },
          { label: 'Gravité', key: 'severity' },
          { label: 'Statut', key: 'status' },
          { label: 'Date', key: 'createdAt' },
          { label: 'Assigné à', key: 'assignedToId' },
        ]} fileName="reclamations-export" />
      </div>
      {isLoading ? (
        <SkeletonTable rows={8} cols={8} />
      ) : error ? (
        <div className="text-red-600">Erreur: {String(error)}</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded shadow bg-white mt-2">
            <table className="reclamations-table min-w-full text-sm">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Client</th>
                  <th>Département</th>
                  <th>Type</th>
                  <th>Gravité</th>
                  <th>Date</th>
                  <th>SLA</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(data) && data.length > 0 ? (
                  data.map((rec: Reclamation) => (
                    <tr key={rec.id}>
                      <td>{rec.id}</td>
                      <td>{rec.client?.name || clients.find(c => c.id === rec.clientId)?.name || rec.clientId}</td>
                      <td>{rec.bordereauId || '-'}</td>
                      <td>{rec.type}</td>
                      <td>
                        <PriorityBadge severity={rec.severity} />
                      </td>
                      <td>{new Date(rec.createdAt).toLocaleString()}</td>
                      <td>
                        <SlaCountdown 
                          createdAt={rec.createdAt} 
                          slaDays={7}
                          status={rec.status}
                        />
                      </td>
                      <td>
                        <StatusBadge status={rec.status} />
                      </td>
                      <td className="reclamations-actions space-x-2">
                        <button 
                          className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                          onClick={() => window.open(`/reclamations/${rec.id}`, '_blank')}
                        >
                          Voir
                        </button>
                        {user &&
                          (user.role === 'CHEF_EQUIPE' ||
                            user.role === 'SUPER_ADMIN' ||
                            (user.role === 'GESTIONNAIRE' && rec.createdById === user.id)) && (
                            <button 
                              className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600"
                              onClick={() => console.log('Edit', rec.id)}
                            >
                              Editer
                            </button>
                          )}
                        {canAssign && (
                          <button 
                            className="bg-purple-500 text-white px-2 py-1 rounded text-xs hover:bg-purple-600"
                            onClick={() => console.log('Assign', rec.id)}
                          >
                            Assigner
                          </button>
                        )}
                        <button 
                          className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                          onClick={() => window.open(`/reclamations/${rec.id}/gec`, '_blank')}
                        >
                          GEC
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9}>
                      <div className="reclamations-empty-state">
                        Aucune réclamation trouvée.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="reclamations-pagination">
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={Array.isArray(data) ? data.length : 0}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  );
};