import React, { useEffect, useMemo, useState } from 'react';
import {
  fetchClients,
  createClient,
  updateClient,
  deleteClient,
  exportClientsAdvanced,
  fetchClientSLAStatus,
  updateClientSLAConfig,
  fetchBordereauxByClient,
  fetchComplaintsByClient,
  createComplaint,
  fetchClientPerformanceAnalytics,
  fetchClientPerformanceMetrics,
  fetchClientRiskAssessment,
  fetchClientHistory,
  fetchCommunicationHistory
} from '../../services/clientService';
import { LocalAPI } from '../../services/axios';
import { Client } from '../../types/client.d';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import '../../styles/client.css';

const ClientListPage: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const loadClients = async () => {
    setLoading(true);
    try {
      const filters: any = { name: searchTerm, status: statusFilter };

      if (user?.role === 'CHEF_EQUIPE' || user?.role === 'GESTIONNAIRE') {
        filters.gestionnaireId = user.id;
      }

      const data = await fetchClients(filters);
      setClients(data);

      if (data.length === 0) {
        setSelectedClient(null);
        return;
      }

      setSelectedClient((current) => {
        if (!current) return data[0];
        return data.find((client: Client) => client.id === current.id) || data[0];
      });
    } catch (error) {
      notify('Erreur lors du chargement des clients', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, statusFilter]);

  const handleAddClient = () => {
    setEditingClient(null);
    setShowForm(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;

    try {
      await deleteClient(id);
      notify('Client supprimé avec succès', 'success');
      if (selectedClient?.id === id) {
        setSelectedClient(null);
      }
      loadClients();
    } catch (error) {
      notify('Erreur lors de la suppression', 'error');
    }
  };

  const handleSubmitClient = async (data: any) => {
    try {
      if (editingClient) {
        await updateClient(editingClient.id, data);
        notify('Client modifié avec succès', 'success');
      } else {
        await createClient(data);
        notify('Client créé avec succès', 'success');
      }
      setShowForm(false);
      loadClients();
    } catch (error) {
      notify('Erreur lors de la sauvegarde', 'error');
    }
  };

  const filteredClients = clients
    .filter(
      (client) =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (statusFilter === 'all' || client.status === statusFilter)
    )
    .sort((a, b) => {
      const aVal = a[sortBy as keyof Client];
      const bVal = b[sortBy as keyof Client];

      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    document.querySelector('.client-cards')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const canManageClients = ['SUPER_ADMIN', 'ADMINISTRATEUR', 'CHEF_EQUIPE'].includes(user?.role || '');

  return (
    <div className="client-module">
      <div className="client-header">
        <div className="client-header-content">
          <h1 className="client-title">📋 Module Client</h1>
          <p className="client-subtitle">Base de données centrale des compagnies d'assurance</p>
        </div>

        <div className="client-search-bar">
          <div className="search-input-group">
            <input
              type="text"
              placeholder="Rechercher un client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
              <option value="suspended">Suspendu</option>
            </select>
          </div>

          {canManageClients && (
            <div className="action-buttons">
              <button onClick={handleAddClient} className="btn btn-primary">
                ➕ Ajouter Client
              </button>
              <button onClick={() => handleExport('excel')} className="btn btn-secondary">
                📊 Exporter Excel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="client-layout">
        <div className="client-list-panel">
          <div className="client-list-header">
            <h3>Liste des Clients ({filteredClients.length})</h3>
            <div className="sort-controls">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="name">Nom</option>
                <option value="reglementDelay">Délai Règlement</option>
                <option value="reclamationDelay">Délai Réclamation</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="sort-toggle"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Chargement des clients...</p>
            </div>
          ) : (
            <div className="client-cards">
              {paginatedClients.map((client) => {
                const contractCount = client.contracts?.length || 0;
                const bordereauCount = client.bordereaux?.length || 0;
                const reclamationCount = client.reclamations?.length || 0;

                return (
                  <div
                    key={client.id}
                    className={`client-card ${selectedClient?.id === client.id ? 'selected' : ''}`}
                    onClick={() => setSelectedClient(client)}
                  >
                    <div className="client-card-header">
                      <div>
                        <h4 className="client-name">{client.name}</h4>
                        <p className="client-card-company">
                          {client.compagnieAssurance?.nom || 'Compagnie non renseignée'}
                        </p>
                      </div>
                      <span className={`status-badge ${client.status || 'active'}`}>
                        {getStatusLabel(client.status)}
                      </span>
                    </div>

                    <div className="client-card-info">
                      <div className="info-item">
                        <span className="label">Chef d'équipe:</span>
                        <span className="value">{client.chargeCompte?.fullName || 'Non assigné'}</span>
                      </div>
                      <div className="info-row">
                        <div className="info-item">
                          <span className="label">Règlement:</span>
                          <span className="value">{client.reglementDelay}j</span>
                        </div>
                        <div className="info-item">
                          <span className="label">Réclamation:</span>
                          <span className="value">{client.reclamationDelay}h</span>
                        </div>
                      </div>
                      <div className="client-card-metrics">
                        <span>{contractCount} contrat{contractCount > 1 ? 's' : ''}</span>
                        <span>{bordereauCount} bordereau{bordereauCount > 1 ? 'x' : ''}</span>
                        <span>{reclamationCount} réclamation{reclamationCount > 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    {canManageClients && (
                      <div className="client-card-actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClient(client);
                          }}
                          className="btn-icon btn-edit"
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClient(client.id);
                          }}
                          className="btn-icon btn-delete"
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {filteredClients.length > itemsPerPage && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ← Précédent
              </button>
              <div className="pagination-info">
                Page {currentPage} sur {totalPages} ({startIndex + 1}-{Math.min(endIndex, filteredClients.length)} sur {filteredClients.length})
              </div>
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Suivant →
              </button>
            </div>
          )}
        </div>

        <div className="client-detail-panel">
          {selectedClient ? (
            <ClientDetailViewFixed client={selectedClient} onUpdate={loadClients} />
          ) : (
            <div className="no-selection">
              <div className="no-selection-content">
                <div className="no-selection-icon">👥</div>
                <h3>Aucun client sélectionné</h3>
                <p>Sélectionnez un client dans la liste pour voir ses détails</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <ClientFormModal
          client={editingClient}
          onSubmit={handleSubmitClient}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );

 async function handleExport(format: 'csv' | 'excel' | 'pdf') {
  if (format !== 'excel') {
    // Keep existing CSV / PDF paths unchanged
    try {
      const blob = await exportClientsAdvanced(format, { name: searchTerm, status: statusFilter });
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `clients-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      notify(`Export ${format.toUpperCase()} réussi`, 'success');
    } catch {
      notify("Erreur lors de l'export", 'error');
    }
    return;
  }
 
  // ── Excel path ──────────────────────────────────────────────────────────────
  notify('Génération du rapport Excel en cours…', 'info');
  try {
    const blob = await exportClientsAdvanced('excel', {
      name:   searchTerm,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
 
    const url      = window.URL.createObjectURL(blob);
    const a        = document.createElement('a');
    a.href         = url;
    a.download     = `clients_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
 
    notify('✅ Rapport Excel généré avec succès (4 feuilles)', 'success');
  } catch (error) {
    console.error('Excel export error:', error);
    notify("❌ Erreur lors de la génération du rapport Excel", 'error');
  }
}
};

const ClientDetailViewFixed: React.FC<{ client: Client; onUpdate: () => void }> = ({ client, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const dashboardStats = useMemo(
    () => [
      { label: 'Bordereaux', value: client.bordereaux?.length || 0 },
      { label: 'Réclamations', value: client.reclamations?.length || 0 },
      { label: 'Contrats', value: client.contracts?.length || 0 },
      { label: 'Adhérents', value: (client as any).adherents?.length || 0 }
    ],
    [client]
  );

  const tabs = [
    { id: 'overview', label: 'Aperçu', icon: '📋', description: 'Identité, contacts, référents et indicateurs' },
    { id: 'operations', label: 'Opérations', icon: '📑', description: 'Contrats et bordereaux regroupés' },
    { id: 'service', label: 'Service & SLA', icon: '⏱️', description: 'SLA et réclamations dans un seul espace' },
    { id: 'analytics', label: 'Analytics', icon: '📊', description: 'Performance, risques et historique' }
  ];

  return (
    <div className="client-workspace">
      <div className="client-workspace-header">
        <div className="client-hero">
          <div className="client-hero-main">
            <div className="client-hero-status">
              <span className={`status-dot ${client.status || 'active'}`}></span>
              <span className="client-hero-status-text">{getStatusLabel(client.status)}</span>
            </div>
            <h2 className="client-hero-title">{client.name}</h2>
            <div className="client-hero-meta">
              <span className="client-hero-id">ID: {client.id.slice(0, 8)}</span>
              <span>{client.compagnieAssurance?.nom || 'Compagnie non renseignée'}</span>
              <span>{getModeRecuperationLabel((client as any).modeRecuperation)}</span>
            </div>
          </div>

          <div className="client-hero-stats">
            {dashboardStats.map((stat) => (
              <div key={stat.label} className="client-hero-stat">
                <span className="client-hero-stat-value">{stat.value}</span>
                <span className="client-hero-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="client-section-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`client-section-tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span className="client-section-tab-icon">{tab.icon}</span>
              <span className="client-section-tab-content">
                <span className="client-section-tab-label">{tab.label}</span>
                <span className="client-section-tab-description">{tab.description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="client-workspace-body">
        {activeTab === 'overview' && <ClientOverviewTab client={client} />}
        {activeTab === 'operations' && <ClientOperationsTab client={client} />}
        {activeTab === 'service' && <ClientServiceTab client={client} onUpdate={onUpdate} />}
        {activeTab === 'analytics' && <ClientAnalyticsHubTab client={client} />}
      </div>
    </div>
  );
};

const PaymentStatsCard: React.FC<{ client: Client }> = ({ client }) => {
  const [paymentStats, setPaymentStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPaymentStats = async () => {
      try {
        const metrics = await fetchClientPerformanceMetrics(client.id);
        setPaymentStats(metrics);
      } catch (error) {
        console.error('Error loading payment stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPaymentStats();
  }, [client.id]);

  if (loading) {
    return (
      <div className="info-card">
        <h4>📊 Statistiques de Paiement</h4>
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <>
      {paymentStats?.paymentStats && (
        <div className="info-card">
          <h4>📊 Statistiques de Paiement</h4>
          <div className="mini-stats-grid">
            <StatMiniCard
              value={paymentStats.paymentStats.paidOnTime}
              label="Payés dans les délais"
              tone="success"
            />
            <StatMiniCard
              value={paymentStats.paymentStats.paidLate}
              label="Payés en retard"
              tone="danger"
            />
            <StatMiniCard
              value={paymentStats.paymentStats.totalPaid}
              label="Total sinistres payés"
              tone="neutral"
            />
            <StatMiniCard
              value={`${paymentStats.paymentStats.onTimeRate.toFixed(1)}%`}
              label="Taux de ponctualité"
              tone="info"
            />
          </div>
        </div>
      )}
      {paymentStats?.reclamationTimingStats && (
        <div className="info-card">
          <h4>📞 Statistiques de Réclamations</h4>
          <div className="mini-stats-grid">
            <StatMiniCard
              value={paymentStats.reclamationTimingStats.handledOnTime}
              label="Traitées dans les délais"
              tone="success"
            />
            <StatMiniCard
              value={paymentStats.reclamationTimingStats.handledLate}
              label="Traitées en retard"
              tone="danger"
            />
            <StatMiniCard
              value={paymentStats.reclamationTimingStats.totalHandled}
              label="Total traitées"
              tone="neutral"
            />
            <StatMiniCard
              value={`${paymentStats.reclamationTimingStats.onTimeRate.toFixed(1)}%`}
              label="Taux de ponctualité"
              tone="info"
            />
          </div>
        </div>
      )}
    </>
  );
};

const ClientOverviewTab: React.FC<{ client: Client }> = ({ client }) => {
  const [bordereaux, setBordereaux] = useState<any[]>([]);
  const [loadingBordereaux, setLoadingBordereaux] = useState(true);

  useEffect(() => {
    const loadBordereaux = async () => {
      try {
        const data = await fetchBordereauxByClient(client.id);
        setBordereaux(data);
      } catch (error) {
        console.error('Error loading bordereaux:', error);
      } finally {
        setLoadingBordereaux(false);
      }
    };

    loadBordereaux();
  }, [client.id]);

  return (
    <div className="client-dashboard-grid">
      <div className="client-dashboard-main">
        <div className="info-card">
          <h4>Coordonnées</h4>
          <div className="details-list">
            <DetailRow label="Nom" value={client.name} />
            <DetailRow label="Compagnie d'Assurance" value={client.compagnieAssurance?.nom || 'Non renseignée'} />
            <DetailRow label="Email" value={client.email || 'Non renseigné'} />
            <DetailRow label="Téléphone" value={client.phone || 'Non renseigné'} />
            <DetailRow label="Adresse" value={client.address || 'Non renseignée'} />
            <DetailRow label="Statut" value={getStatusLabel(client.status)} accent={getStatusColor(client.status)} />
          </div>
        </div>

        <div className="info-card">
          <h4>Paramètres Contractuels</h4>
          <div className="details-list">
            <DetailRow label="Délai Règlement" value={`${client.reglementDelay} jours`} />
            <DetailRow label="Délai Réclamation" value={`${client.reclamationDelay} heures`} />
            <DetailRow
              label="Mode de Récupération"
              value={getModeRecuperationLabel((client as any).modeRecuperation)}
              accent={getModeRecuperationColor((client as any).modeRecuperation)}
            />
            <DetailRow label="Créé le" value={new Date(client.createdAt).toLocaleDateString('fr-FR')} />
            <DetailRow label="Modifié le" value={new Date(client.updatedAt).toLocaleDateString('fr-FR')} />
          </div>
        </div>
      </div>

      <div className="client-dashboard-side">
        <div className="info-card">
          <h4>Référents</h4>
          <div className="reference-block">
            <p className="reference-title">Chef d'Équipe / Chargé de Compte</p>
            {client.chargeCompte ? (
              <UserReferenceCard user={client.chargeCompte} />
            ) : (
              <p className="empty-inline">Aucun chef d'équipe assigné</p>
            )}
          </div>

          <div className="reference-block">
            <p className="reference-title">
              Gestionnaires Supplémentaires ({client.gestionnaires?.length || 0})
            </p>
            {client.gestionnaires && client.gestionnaires.length > 0 ? (
              <div className="reference-list">
                {client.gestionnaires.map((gestionnaire) => (
                  <UserReferenceCard key={gestionnaire.id} user={gestionnaire} />
                ))}
              </div>
            ) : (
              <p className="empty-inline">Aucun gestionnaire supplémentaire</p>
            )}
          </div>
        </div>

        <div className="info-card">
          <h4>Volumes</h4>
          <div className="mini-stats-grid">
            <StatMiniCard value={client.bordereaux?.length || 0} label="Bordereaux" tone="info" />
            <StatMiniCard value={client.contracts?.length || 0} label="Contrats" tone="neutral" />
            <StatMiniCard value={client.reclamations?.length || 0} label="Réclamations" tone="warning" />
            <StatMiniCard value={(client as any).adherents?.length || 0} label="Adhérents" tone="success" />
          </div>
        </div>

        <PaymentStatsCard client={client} />

        {/* Bordereaux Summary */}
        {loadingBordereaux ? (
          <div className="info-card">
            <h4>📄 Bordereaux Récents</h4>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Chargement...</p>
          </div>
        ) : bordereaux.length > 0 ? (
          <div className="info-card">
            <h4>📄 Bordereaux Récents ({bordereaux.length})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              {bordereaux.slice(0, 3).map((bordereau) => {
                const documentsCount = bordereau.documents?.length || 0;
                const documentsByType: { [key: string]: number } = {};

                if (bordereau.documents && bordereau.documents.length > 0) {
                  bordereau.documents.forEach((doc: any) => {
                    const type = doc.type || 'Non spécifié';
                    documentsByType[type] = (documentsByType[type] || 0) + 1;
                  });
                }

                return (
                  <div
                    key={bordereau.id}
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      background: 'linear-gradient(180deg, #ffffff, #f8fafc)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>{bordereau.reference}</strong>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '999px',
                          backgroundColor: getStatusColorForBordereau(bordereau.statut),
                          color: '#fff',
                          fontSize: '0.7rem',
                          fontWeight: '700'
                        }}
                      >
                        {getStatusLabelForBordereau(bordereau.statut)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>
                      <div>Client: <strong>{client.name}</strong></div>
                      <div>Documents: <strong>{documentsCount}</strong> | BS: <strong>{bordereau.nombreBS || 0}</strong></div>
                    </div>
                    {documentsCount > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                        {Object.entries(documentsByType).map(([type, count]) => (
                          <span
                            key={type}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '999px',
                              backgroundColor: getDocumentTypeColor(type),
                              color: '#fff',
                              fontSize: '0.65rem',
                              fontWeight: '700'
                            }}
                          >
                            {getDocumentTypeLabel(type)}: {count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {bordereaux.length > 3 && (
              <p style={{ marginTop: '12px', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
                +{bordereaux.length - 3} autre{bordereaux.length - 3 > 1 ? 's' : ''} bordereau{bordereaux.length - 3 > 1 ? 'x' : ''}
              </p>
            )}
          </div>
        ) : (
          <div className="info-card">
            <h4>📄 Bordereaux</h4>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Aucun bordereau pour ce client</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ClientOperationsTab: React.FC<{ client: Client }> = ({ client }) => {
  return (
    <div className="stacked-panels">
      <ClientContractsTab client={client} />
      <ClientBordereauxTab client={client} />
    </div>
  );
};

const ClientServiceTab: React.FC<{ client: Client; onUpdate: () => void }> = ({ client, onUpdate }) => {
  return (
    <div className="stacked-panels">
      <ClientSLATab client={client} onUpdate={onUpdate} />
      <ClientReclamationsTab client={client} />
    </div>
  );
};

const ClientAnalyticsHubTab: React.FC<{ client: Client }> = ({ client }) => {
  return (
    <div className="stacked-panels">
      <ClientAnalyticsTab client={client} />
      <ClientHistoryTab client={client} />
    </div>
  );
};

const ClientContractsTab: React.FC<{ client: Client }> = ({ client }) => {
  const [contracts, setContracts] = useState<any[]>([]);

  useEffect(() => {
    const loadContracts = async () => {
      try {
        const { data } = await LocalAPI.get(`/contracts?clientId=${client.id}`);
        setContracts(data);
      } catch (error) {
        console.error('Error loading contracts:', error);
      }
    };

    loadContracts();
  }, [client.id]);

  return (
    <div className="tab-panel section-panel">
      <div className="tab-header">
        <h3>Contrats ({contracts.length})</h3>
        <p className="section-description">Vue consolidée des contrats liés au client.</p>
      </div>

      <div className="contracts-list">
        {contracts.length > 0 ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th>Chef d'équipe</th>
                  <th>Période</th>
                  <th>SLA</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => {
                  const now = new Date();
                  const endDate = new Date(contract.endDate);
                  const isActive = endDate >= now;
                  const statusLabel = isActive ? 'Actif' : 'Expiré';

                  return (
                    <tr key={contract.id}>
                      <td>{contract.clientName || contract.codeAssure || contract.id.substring(0, 8)}</td>
                      <td>{contract.teamLeader?.fullName || 'N/A'}</td>
                      <td>
                        {new Date(contract.startDate).toLocaleDateString('fr-FR')} -{' '}
                        {new Date(contract.endDate).toLocaleDateString('fr-FR')}
                      </td>
                      <td>
                        <div>R:{contract.delaiReglement}j</div>
                        <div>C:{contract.delaiReclamation}j</div>
                      </td>
                      <td>
                        <span className={`status-pill ${isActive ? 'success' : 'danger'}`}>{statusLabel}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>Aucun contrat disponible</p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Les contrats apparaîtront ici une fois créés</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ClientSLATab: React.FC<{ client: Client; onUpdate: () => void }> = ({ client, onUpdate }) => {
  const [slaConfig, setSlaConfig] = useState(client.slaConfig || {});
  const [slaStatus, setSlaStatus] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { notify } = useNotification();

  useEffect(() => {
    const loadSLAStatus = async () => {
      try {
        const status = await fetchClientSLAStatus(client.id);
        setSlaStatus(status);
      } catch (error) {
        console.error('Error loading SLA status:', error);
      }
    };

    loadSLAStatus();
  }, [client.id]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateClientSLAConfig(client.id, slaConfig);
      notify('Configuration SLA mise à jour', 'success');
      setEditing(false);
      onUpdate();
    } catch (error) {
      notify('Erreur lors de la mise à jour', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tab-panel section-panel">
      <div className="tab-header">
        <div>
          <h3>Paramètres SLA</h3>
          <p className="section-description">Configuration et suivi contractuel du service.</p>
        </div>
        <div className="tab-actions">
          {!editing ? (
            <button className="btn btn-primary" onClick={() => setEditing(true)}>
              ✏️ Modifier
            </button>
          ) : (
            <div className="edit-actions">
              <button className="btn btn-secondary" onClick={() => setEditing(false)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          )}
        </div>
      </div>

      {slaStatus && (
        <div className="sla-status-card">
          <h4>Statut SLA Actuel</h4>
          <div className="sla-health-row">
            <span className={`status-pill ${mapSlaStatusTone(slaStatus.status)}`}>
              {slaStatus.status === 'healthy'
                ? 'Conforme'
                : slaStatus.status === 'breach'
                  ? 'En dépassement'
                  : 'Attention'}
            </span>
            {slaStatus.avgSLA !== undefined && slaStatus.avgSLA !== null && (
              <span>SLA moyen: {slaStatus.avgSLA.toFixed(1)} jours</span>
            )}
          </div>
          {slaStatus.reason && <p><strong>Raison:</strong> {slaStatus.reason}</p>}
        </div>
      )}

      <div className="sla-config">
        <div className="sla-item">
          <label>Délai de Règlement (jours)</label>
          <input
            type="number"
            value={(slaConfig as any).reglementDelay || client.reglementDelay}
            onChange={(e) =>
              setSlaConfig({ ...(slaConfig as any), reglementDelay: parseInt(e.target.value) || 0 })
            }
            disabled={!editing}
            min="1"
            max="365"
          />
          <small>Délai contractuel de base</small>
        </div>

        <div className="sla-item">
          <label>Délai de Réclamation (heures)</label>
          <input
            type="number"
            value={(slaConfig as any).reclamationDelay || client.reclamationDelay}
            onChange={(e) =>
              setSlaConfig({ ...(slaConfig as any), reclamationDelay: parseInt(e.target.value) || 0 })
            }
            disabled={!editing}
            min="1"
            max="720"
          />
          <small>Délai de réponse aux réclamations</small>
        </div>

        <div className="sla-item">
          <label>Seuil d'Alerte SLA (jours)</label>
          <input
            type="number"
            value={(slaConfig as any).slaThreshold || client.reglementDelay}
            onChange={(e) =>
              setSlaConfig({ ...(slaConfig as any), slaThreshold: parseInt(e.target.value) || 0 })
            }
            disabled={!editing}
            min="1"
            max="365"
          />
          <small>Déclenche une alerte si dépassé</small>
        </div>

        <div className="sla-item">
          <label>Seuil d'Escalade (jours)</label>
          <input
            type="number"
            value={(slaConfig as any).escalationThreshold || client.reglementDelay + 5}
            onChange={(e) =>
              setSlaConfig({ ...(slaConfig as any), escalationThreshold: parseInt(e.target.value) || 0 })
            }
            disabled={!editing}
            min="1"
            max="365"
          />
          <small>Déclenche une escalade automatique</small>
        </div>

        <div className="sla-item">
          <label>Notifications Email</label>
          <select
            value={(slaConfig as any).emailNotifications ? 'enabled' : 'disabled'}
            onChange={(e) =>
              setSlaConfig({ ...(slaConfig as any), emailNotifications: e.target.value === 'enabled' })
            }
            disabled={!editing}
          >
            <option value="enabled">Activées</option>
            <option value="disabled">Désactivées</option>
          </select>
          <small>Notifications automatiques par email</small>
        </div>
      </div>
    </div>
  );
};

const ClientBordereauxTab: React.FC<{ client: Client }> = ({ client }) => {
  const [bordereaux, setBordereaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBordereaux = async () => {
      try {
        const data = await fetchBordereauxByClient(client.id);
        setBordereaux(data);
      } catch (error) {
        console.error('Error loading bordereaux:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBordereaux();
  }, [client.id]);

  const totalDocuments = bordereaux.reduce((sum, bordereau) => sum + (bordereau.documents?.length || 0), 0);

  if (loading) {
    return (
      <div className="tab-panel section-panel">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement des bordereaux...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel section-panel">
      <div className="tab-header">
        <div>
          <h3>Bordereaux ({bordereaux.length || 0})</h3>
          <p className="section-description">Suivi opérationnel détaillé des dossiers réceptionnés.</p>
        </div>
        <div className="summary-chip">Total documents: {totalDocuments || 0}</div>
      </div>

      {bordereaux.length > 0 ? (
        <div className="bordereaux-list">
          {bordereaux.map((bordereau) => {
            const documentsCount = bordereau.documents?.length || 0;
            const documentsByType: { [key: string]: number } = {};

            if (bordereau.documents && bordereau.documents.length > 0) {
              bordereau.documents.forEach((doc: any) => {
                const type = doc.type || 'Non spécifié';
                documentsByType[type] = (documentsByType[type] || 0) + 1;
              });
            }

            return (
              <div key={bordereau.id} className="bordereau-item enhanced">
                <div className="bordereau-header">
                  <div>
                    <h4>{bordereau.reference}</h4>
                    <span
                      className="status-pill info"
                      style={{ backgroundColor: getDocumentTypeColor(bordereau.type), color: '#fff' }}
                    >
                      {getDocumentTypeLabel(bordereau.type)}
                    </span>
                  </div>
                  <span
                    className="status-pill"
                    style={{ backgroundColor: getStatusColorForBordereau(bordereau.statut), color: '#fff' }}
                  >
                    {getStatusLabelForBordereau(bordereau.statut)}
                  </span>
                </div>

                <div className="bordereau-info-grid">
                  <p><strong>Date Réception:</strong> {new Date(bordereau.dateReception).toLocaleDateString('fr-FR')}</p>
                  <p><strong>Nombre BS:</strong> {bordereau.nombreBS || 0}</p>
                  <p><strong>Délai Règlement:</strong> {bordereau.delaiReglement || 0} jours</p>
                  <p><strong>Documents:</strong> {documentsCount || 0}</p>
                  {bordereau.chargeCompte && <p><strong>Charge Compte:</strong> {bordereau.chargeCompte.fullName}</p>}
                  {bordereau.currentHandler && <p><strong>Handler Actuel:</strong> {bordereau.currentHandler.fullName}</p>}
                  {bordereau.team && <p><strong>Équipe:</strong> {bordereau.team.fullName}</p>}
                  {bordereau.dateCloture && (
                    <p><strong>Date Clôture:</strong> {new Date(bordereau.dateCloture).toLocaleDateString('fr-FR')}</p>
                  )}
                </div>

                {documentsCount > 0 && (
                  <div className="document-breakdown">
                    <strong>📎 Répartition des Documents ({documentsCount})</strong>
                    <div className="tag-list">
                      {Object.entries(documentsByType).map(([type, count]) => (
                        <span
                          key={type}
                          className="status-pill"
                          style={{ backgroundColor: getDocumentTypeColor(type), color: '#fff' }}
                        >
                          {getDocumentTypeLabel(type)}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {documentsCount === 0 && (
                  <div className="alert-inline danger">⚠️ Aucun document associé (0 documents)</div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <p>📄 Aucun bordereau pour ce client</p>
          <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Les bordereaux apparaîtront ici une fois créés</p>
        </div>
      )}
    </div>
  );
};

const ReclamationCreateModal: React.FC<{
  clientId: string;
  onSubmit: (data: any) => void;
  onClose: () => void;
}> = ({ onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    type: '',
    severity: 'medium',
    description: '',
    department: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Nouvelle Réclamation</h3>
          <button onClick={onClose} className="modal-close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="reclamation-form client-form">
          <div className="form-group">
            <label>Type de Réclamation *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              required
              className="form-select"
            >
              <option value="">Sélectionner un type</option>
              <option value="Délai de traitement">Délai de traitement</option>
              <option value="Qualité de service">Qualité de service</option>
              <option value="Erreur de traitement">Erreur de traitement</option>
              <option value="Communication">Communication</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Sévérité *</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                required
                className="form-select"
              >
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
            </div>

            <div className="form-group">
              <label>Département</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="form-select"
              >
                <option value="">Sélectionner un département</option>
                <option value="GEC">GEC</option>
                <option value="GED">GED</option>
                <option value="Finance">Finance</option>
                <option value="BO">Bureau d'Ordre</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              className="form-input"
              rows={4}
              placeholder="Décrivez la réclamation en détail..."
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Création...' : 'Créer Réclamation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ClientReclamationsTab: React.FC<{ client: Client }> = ({ client }) => {
  const [reclamations, setReclamations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { notify } = useNotification();

  useEffect(() => {
    const loadReclamations = async () => {
      try {
        const data = await fetchComplaintsByClient(client.id);
        setReclamations(data);
      } catch (error) {
        console.error('Error loading reclamations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReclamations();
  }, [client.id]);

  const handleCreateReclamation = async (data: any) => {
    try {
      await createComplaint(client.id, data);
      notify('Réclamation créée avec succès', 'success');
      setShowCreateForm(false);
      const updatedData = await fetchComplaintsByClient(client.id);
      setReclamations(updatedData);
    } catch (error) {
      notify('Erreur lors de la création', 'error');
    }
  };

  if (loading) {
    return (
      <div className="tab-panel section-panel">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement des réclamations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel section-panel">
      <div className="tab-header">
        <div>
          <h3>Réclamations ({reclamations.length})</h3>
          <p className="section-description">Pilotage qualité et suivi des incidents clients.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
          ➕ Nouvelle Réclamation
        </button>
      </div>

      {reclamations.length > 0 ? (
        <div className="reclamations-list">
          {reclamations.map((reclamation) => (
            <div key={reclamation.id} className="reclamation-item refined">
              <div className="reclamation-header">
                <h4>{reclamation.type}</h4>
                <div className="reclamation-badges">
                  <span
                    className="status-pill"
                    style={{ backgroundColor: getSeverityColor(reclamation.severity), color: 'white' }}
                  >
                    {getSeverityLabel(reclamation.severity)}
                  </span>
                  <span className="status-pill neutral">{reclamation.status}</span>
                </div>
              </div>
              <div className="reclamation-info">
                <p><strong>Description:</strong> {reclamation.description}</p>
                <p><strong>Créée le:</strong> {new Date(reclamation.createdAt).toLocaleDateString('fr-FR')}</p>
                {reclamation.assignedTo && <p><strong>Assignée à:</strong> {reclamation.assignedTo.fullName}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>Aucune réclamation pour ce client</p>
          <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
            Créer la première réclamation
          </button>
        </div>
      )}

      {showCreateForm && (
        <ReclamationCreateModal
          clientId={client.id}
          onSubmit={handleCreateReclamation}
          onClose={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
};

const ClientAnalyticsTab: React.FC<{ client: Client }> = ({ client }) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [riskAssessment, setRiskAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const [analyticsData, metricsData, riskData] = await Promise.all([
          fetchClientPerformanceAnalytics(client.id, period),
          fetchClientPerformanceMetrics(client.id),
          fetchClientRiskAssessment(client.id)
        ]);
        setAnalytics(analyticsData);
        setPerformanceMetrics(metricsData);
        setRiskAssessment(riskData);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [client.id, period]);

  if (loading) {
    return (
      <div className="tab-panel section-panel">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement des analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel section-panel">
      <div className="tab-header">
        <div>
          <h3>Analytics & Performance</h3>
          <p className="section-description">Les graphiques et statistiques sont conservés avec une lecture plus claire.</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="period-select form-select">
          <option value="daily">Quotidien (30j)</option>
          <option value="weekly">Hebdomadaire (12s)</option>
          <option value="monthly">Mensuel (12m)</option>
          <option value="yearly">Annuel (3a)</option>
        </select>
      </div>

      <div className="analytics-grid">
        {riskAssessment && (
          <div className="analytics-card">
            <h4>Évaluation des Risques</h4>
            <div className="risk-score">
              <span className="risk-level" style={{ color: getRiskLevelColor(riskAssessment.riskLevel) }}>
                {riskAssessment.riskScore}/100 - {riskAssessment.riskLevel.toUpperCase()}
              </span>
            </div>
            <div className="risk-factors">
              <strong>Facteurs de risque:</strong>
              <ul>
                {riskAssessment.riskFactors.map((factor: string, index: number) => (
                  <li key={index}>{factor}</li>
                ))}
              </ul>
            </div>
            <div className="recommendations">
              <strong>Recommandations:</strong>
              <ul>
                {riskAssessment.recommendations.map((rec: string, index: number) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {performanceMetrics && (
          <div className="analytics-card">
            <h4>Métriques de Performance</h4>
            <div className="metrics-grid">
              <div className="metric-item">
                <span className="metric-value">
                  {performanceMetrics.bordereauxByStatus?.reduce((acc: number, item: any) => acc + item._count, 0) || 0}
                </span>
                <span className="metric-label">Bordereaux Traités</span>
              </div>
              <div className="metric-item">
                <span className="metric-value">
                  {performanceMetrics.reclamationsByStatus?.reduce((acc: number, item: any) => acc + item._count, 0) || 0}
                </span>
                <span className="metric-label">Réclamations</span>
              </div>
              <div className="metric-item">
                <span className="metric-value">
                  {performanceMetrics.slaMetrics?._avg?.delaiReglement?.toFixed(1) || 'N/A'}
                </span>
                <span className="metric-label">SLA Moyen (jours)</span>
              </div>
            </div>

            {performanceMetrics.paymentStats && (
              <div className="payment-stats">
                <h5>📊 Statistiques de Paiement</h5>
                <div className="stats-row">
                  <div className="stat-box">
                    <span className="stat-number" style={{ color: '#10b981' }}>{performanceMetrics.paymentStats.paidOnTime}</span>
                    <span className="stat-text">Payés dans les délais</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-number" style={{ color: '#ef4444' }}>{performanceMetrics.paymentStats.paidLate}</span>
                    <span className="stat-text">Payés en retard</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-number">{performanceMetrics.paymentStats.totalPaid}</span>
                    <span className="stat-text">Total sinistres payés</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-number" style={{ color: '#3b82f6' }}>
                      {performanceMetrics.paymentStats.onTimeRate.toFixed(1)}%
                    </span>
                    <span className="stat-text">Taux de ponctualité</span>
                  </div>
                </div>
              </div>
            )}

            {performanceMetrics.reclamationTimingStats && (
              <div className="reclamation-timing-stats">
                <h5>📞 Statistiques de Réclamations</h5>
                <div className="stats-row">
                  <div className="stat-box">
                    <span className="stat-number" style={{ color: '#10b981' }}>
                      {performanceMetrics.reclamationTimingStats.handledOnTime}
                    </span>
                    <span className="stat-text">Traitées dans les délais</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-number" style={{ color: '#ef4444' }}>
                      {performanceMetrics.reclamationTimingStats.handledLate}
                    </span>
                    <span className="stat-text">Traitées en retard</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-number">{performanceMetrics.reclamationTimingStats.totalHandled}</span>
                    <span className="stat-text">Total réclamations traitées</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-number" style={{ color: '#3b82f6' }}>
                      {performanceMetrics.reclamationTimingStats.onTimeRate.toFixed(1)}%
                    </span>
                    <span className="stat-text">Taux de ponctualité</span>
                  </div>
                </div>
              </div>
            )}

            <div className="status-charts">
              <div className="chart-section">
                <h5>Bordereaux par Statut</h5>
                <div className="chart-bars">
                  {performanceMetrics.bordereauxByStatus?.map((item: any, index: number) => {
                    const total = performanceMetrics.bordereauxByStatus.reduce((acc: number, i: any) => acc + i._count, 0);
                    const percentage = total > 0 ? (item._count / total) * 100 : 0;

                    return (
                      <div key={index} className="chart-bar-item">
                        <div className="chart-bar">
                          <div
                            className="chart-bar-fill"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: getStatusColorForBordereau(item.statut)
                            }}
                          />
                        </div>
                        <span className="chart-label">{item.statut}: {item._count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {analytics?.slaCompliance && (
          <div className="analytics-card">
            <h4>Conformité SLA - Période: {period}</h4>
            <div className="compliance-score">
              <div className="score-circle">
                <span className="score-value">{analytics.slaCompliance.overallCompliance.toFixed(1)}%</span>
              </div>
              <span className="score-label">Conformité Globale</span>
            </div>
            <div className="trends-section">
              <h5>Tendances SLA</h5>
              <div className="trend-bars">
                {analytics.slaCompliance.trends.slice(-8).map((trend: any, index: number) => {
                  const height = Math.min((trend.count / 10) * 100, 100);
                  const isGood = (trend.avgSla || 0) <= client.reglementDelay;

                  return (
                    <div key={index} className="trend-item">
                      <div
                        className="trend-bar"
                        style={{
                          height: `${height}%`,
                          backgroundColor: isGood ? '#10b981' : '#ef4444'
                        }}
                        title={`${new Date(trend.date).toLocaleDateString('fr-FR')}: ${trend.count} bordereaux, SLA: ${(trend.avgSla || 0).toFixed(1)}j`}
                      />
                      <span className="trend-date">
                        {new Date(trend.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {analytics?.volumeCapacity && (
          <div className="analytics-card">
            <h4>Analyse de Volume</h4>
            <div className="volume-stats">
              <p><strong>Volume Total:</strong> {analytics.volumeCapacity.totalVolume}</p>
              <p><strong>Volume Complété:</strong> {analytics.volumeCapacity.completedVolume}</p>
              <p><strong>Utilisation Capacité:</strong> {analytics.volumeCapacity.capacityUtilization.toFixed(1)}%</p>
            </div>
            <div className="status-breakdown">
              <strong>Répartition par Statut:</strong>
              {analytics.volumeCapacity.statusBreakdown.map((status: any) => (
                <div key={status.statut} className="status-item">
                  <span>{status.statut}: {status._count.id}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ClientHistoryTab: React.FC<{ client: Client }> = ({ client }) => {
  const [history, setHistory] = useState<any>(null);
  const [communicationHistory, setCommunicationHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeHistoryTab, setActiveHistoryTab] = useState('modifications');

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const [historyData, commData] = await Promise.all([
          fetchClientHistory(client.id),
          fetchCommunicationHistory(client.id)
        ]);
        setHistory(historyData);
        setCommunicationHistory(commData);
      } catch (error) {
        console.error('Error loading history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [client.id]);

  if (loading) {
    return (
      <div className="tab-panel section-panel">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement de l'historique...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel section-panel">
      <h3>Historique des Actions</h3>

      <div className="history-tabs">
        <button
          className={`history-tab ${activeHistoryTab === 'modifications' ? 'active' : ''}`}
          onClick={() => setActiveHistoryTab('modifications')}
        >
          Modifications
        </button>
        <button
          className={`history-tab ${activeHistoryTab === 'communications' ? 'active' : ''}`}
          onClick={() => setActiveHistoryTab('communications')}
        >
          Communications
        </button>
        <button
          className={`history-tab ${activeHistoryTab === 'contracts' ? 'active' : ''}`}
          onClick={() => setActiveHistoryTab('contracts')}
        >
          Contrats
        </button>
      </div>

      <div className="history-content">
        {activeHistoryTab === 'modifications' && (
          <div className="modifications-history">
            <h4>Historique des Modifications</h4>
            <div className="history-timeline">
              <div className="timeline-item">
                <div className="timeline-date">{new Date(client.updatedAt).toLocaleDateString('fr-FR')}</div>
                <div className="timeline-content">
                  <strong>Dernière modification</strong>
                  <p>Mise à jour des informations client</p>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-date">{new Date(client.createdAt).toLocaleDateString('fr-FR')}</div>
                <div className="timeline-content">
                  <strong>Création du client</strong>
                  <p>Client ajouté au système</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeHistoryTab === 'communications' && (
          <div className="communications-history">
            <h4>Historique des Communications</h4>
            {communicationHistory.length > 0 ? (
              <div className="communications-list">
                {communicationHistory.map((comm) => (
                  <div key={comm.id} className="communication-item">
                    <div className="comm-header">
                      <strong>{comm.subject}</strong>
                      <span className="comm-date">{new Date(comm.timestamp).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="comm-details">
                      <p><strong>Type:</strong> {comm.type}</p>
                      <p><strong>Utilisateur:</strong> {comm.user}</p>
                      {comm.contactPerson && <p><strong>Contact:</strong> {comm.contactPerson}</p>}
                      <p><strong>Contenu:</strong> {comm.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>Aucune communication enregistrée</p>
            )}
          </div>
        )}

        {activeHistoryTab === 'contracts' && (
          <div className="contracts-history">
            <h4>Historique des Contrats</h4>
            {history?.contracts && history.contracts.length > 0 ? (
              <div className="contracts-timeline">
                {history.contracts.map((contract: any) => (
                  <div key={contract.id} className="timeline-item">
                    <div className="timeline-date">{new Date(contract.createdAt).toLocaleDateString('fr-FR')}</div>
                    <div className="timeline-content">
                      <strong>Contrat {contract.id.slice(0, 8)}</strong>
                      <p>Délai Règlement: {contract.delaiReglement}j</p>
                      <p>
                        Période: {new Date(contract.startDate).toLocaleDateString('fr-FR')} -{' '}
                        {new Date(contract.endDate).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>Aucun contrat dans l'historique</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ClientFormModal: React.FC<{
  client: Client | null;
  onSubmit: (data: any) => void;
  onClose: () => void;
}> = ({ client, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    name: client?.name || '',
    compagnieAssurance: client?.compagnieAssurance?.nom || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address: client?.address || '',
    reglementDelay: client?.reglementDelay || 30,
    reclamationDelay: client?.reclamationDelay || 48,
    status: (client?.status || 'active') as 'active' | 'inactive' | 'suspended',
    gestionnaireIds: client?.gestionnaires?.map((g) => g.id) || [],
    modeRecuperation: (client as any)?.modeRecuperation || ''
  });
  const [availableGestionnaires, setAvailableGestionnaires] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadGestionnaires = async () => {
      try {
        const { data } = await LocalAPI.get('/users', { params: { role: 'CHEF_EQUIPE' } });
        setAvailableGestionnaires(data || []);
      } catch (error) {
        console.error('Error loading gestionnaires:', error);
      }
    };

    loadGestionnaires();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{client ? 'Modifier Client' : 'Nouveau Client'}</h3>
          <button onClick={onClose} className="modal-close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="client-form">
          <div className="form-group">
            <label>Nom du Client *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="form-input"
              placeholder="Nom du client"
            />
          </div>

          <div className="form-group">
            <label>Compagnie d'Assurance *</label>
            <input
              type="text"
              value={formData.compagnieAssurance}
              onChange={(e) => setFormData({ ...formData, compagnieAssurance: e.target.value })}
              required
              className="form-input"
              placeholder="Nom de la compagnie d'assurance"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="form-input"
                placeholder="contact@client.com"
              />
            </div>

            <div className="form-group">
              <label>Téléphone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="form-input"
                placeholder="+216 XX XXX XXX"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Adresse</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="form-input"
              rows={3}
              placeholder="Adresse complète du client"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Délai Règlement (jours) *</label>
              <input
                type="number"
                value={formData.reglementDelay}
                onChange={(e) => setFormData({ ...formData, reglementDelay: parseInt(e.target.value) || 0 })}
                required
                min="1"
                max="365"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Délai Réclamation (heures) *</label>
              <input
                type="number"
                value={formData.reclamationDelay}
                onChange={(e) => setFormData({ ...formData, reclamationDelay: parseInt(e.target.value) || 0 })}
                required
                min="1"
                max="720"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Statut</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'suspended' })
              }
              className="form-select"
            >
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
              <option value="suspended">Suspendu</option>
            </select>
          </div>

          <div className="form-group">
            <label>Chef d'Équipe Assigné</label>
            <select
              value={formData.gestionnaireIds[0] || ''}
              onChange={(e) => setFormData({ ...formData, gestionnaireIds: e.target.value ? [e.target.value] : [] })}
              className="form-select"
            >
              <option value="">Sélectionner un chef d'équipe</option>
              {availableGestionnaires.map((gestionnaire) => (
                <option key={gestionnaire.id} value={gestionnaire.id}>
                  {gestionnaire.fullName} ({gestionnaire.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Mode de récupération *</label>
            <select
              value={formData.modeRecuperation}
              onChange={(e) => setFormData({ ...formData, modeRecuperation: e.target.value })}
              className="form-select"
              required
            >
              <option value="">Sélectionner un mode</option>
              <option value="VIREMENT">Mode de récupération par virement</option>
              <option value="CHEQUE">Mode de récupération par chèque</option>
              <option value="FEUILLE_CAISSE">Mode de récupération sur feuille de caisse</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Sauvegarde...' : client ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: React.ReactNode; accent?: string }> = ({ label, value, accent }) => (
  <div className="detail-row">
    <span className="detail-row-label">{label}</span>
    <span className="detail-row-value" style={accent ? { color: accent } : undefined}>
      {value}
    </span>
  </div>
);

const UserReferenceCard: React.FC<{ user: any }> = ({ user }) => (
  <div className="user-reference-card">
    <div className="user-reference-main">
      <span className="user-reference-name">{user.fullName}</span>
      <span
        className="status-pill"
        style={{
          backgroundColor: getRoleBadgeColor(user.role || ''),
          color: '#fff'
        }}
      >
        {getRoleLabel(user.role || '')}
      </span>
    </div>
    {user.email && <p className="user-reference-meta">{user.email}</p>}
    {(user as any).department && <p className="user-reference-meta">Département: {(user as any).department}</p>}
  </div>
);

const StatMiniCard: React.FC<{ value: React.ReactNode; label: string; tone: 'success' | 'danger' | 'neutral' | 'info' | 'warning' }> = ({
  value,
  label,
  tone
}) => (
  <div className={`mini-stat-card ${tone}`}>
    <div className="mini-stat-value">{value}</div>
    <div className="mini-stat-label">{label}</div>
  </div>
);

const getStatusLabel = (status?: string) => {
  switch (status) {
    case 'active':
      return 'Actif';
    case 'inactive':
      return 'Inactif';
    case 'suspended':
      return 'Suspendu';
    default:
      return status || 'Inconnu';
  }
};

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'active':
      return '#10b981';
    case 'inactive':
      return '#ef4444';
    case 'suspended':
      return '#f59e0b';
    default:
      return '#6b7280';
  }
};

const getModeRecuperationLabel = (mode?: string) => {
  switch (mode) {
    case 'VIREMENT':
      return '🏦 Virement bancaire';
    case 'CHEQUE':
      return '💳 Chèque';
    case 'FEUILLE_CAISSE':
      return '📋 Feuille de caisse';
    default:
      return '❌ Non défini';
  }
};

const getModeRecuperationColor = (mode?: string) => {
  switch (mode) {
    case 'VIREMENT':
      return '#3b82f6';
    case 'CHEQUE':
      return '#10b981';
    case 'FEUILLE_CAISSE':
      return '#f59e0b';
    default:
      return '#ef4444';
  }
};

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'GESTIONNAIRE_SENIOR':
      return '#8b5cf6';
    case 'GESTIONNAIRE':
      return '#3b82f6';
    case 'CHEF_EQUIPE':
      return '#f59e0b';
    default:
      return '#6b7280';
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'GESTIONNAIRE_SENIOR':
      return 'Gestionnaire Senior';
    case 'GESTIONNAIRE':
      return 'Gestionnaire';
    case 'CHEF_EQUIPE':
      return "Chef d'Équipe";
    default:
      return role;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'high':
      return '#ef4444';
    case 'medium':
      return '#f59e0b';
    case 'low':
      return '#10b981';
    default:
      return '#6b7280';
  }
};

const getSeverityLabel = (severity: string) => {
  switch (severity) {
    case 'high':
      return 'Haute';
    case 'medium':
      return 'Moyenne';
    case 'low':
      return 'Basse';
    default:
      return severity;
  }
};

const getRiskLevelColor = (level: string) => {
  switch (level) {
    case 'low':
      return '#10b981';
    case 'medium':
      return '#f59e0b';
    case 'high':
      return '#ef4444';
    case 'critical':
      return '#dc2626';
    default:
      return '#6b7280';
  }
};

const getStatusColorForBordereau = (statut: string) => {
  switch (statut) {
    case 'CLOTURE':
      return '#10b981';
    case 'PAYE':
      return '#059669';
    case 'TRAITE':
      return '#0ea5e9';
    case 'EN_COURS':
      return '#3b82f6';
    case 'ASSIGNE':
      return '#8b5cf6';
    case 'SCANNE':
      return '#06b6d4';
    case 'A_SCANNER':
      return '#f59e0b';
    case 'EN_ATTENTE':
      return '#f97316';
    case 'EN_DIFFICULTE':
      return '#ef4444';
    case 'REJETE':
      return '#dc2626';
    default:
      return '#6b7280';
  }
};

const getStatusLabelForBordereau = (statut: string) => {
  switch (statut) {
    case 'CLOTURE':
      return 'Clôturé';
    case 'PAYE':
      return 'Payé';
    case 'TRAITE':
      return 'Traité';
    case 'EN_COURS':
      return 'En cours';
    case 'ASSIGNE':
      return 'Assigné';
    case 'SCANNE':
      return 'Scanné';
    case 'A_SCANNER':
      return 'À scanner';
    case 'EN_ATTENTE':
      return 'En attente';
    case 'EN_DIFFICULTE':
      return 'En difficulté';
    case 'REJETE':
      return 'Rejeté';
    default:
      return statut;
  }
};

const getDocumentTypeLabel = (type: string) => {
  switch (type) {
    case 'BULLETIN_SOIN':
      return '📋 Bulletin de Soin';
    case 'COMPLEMENT_INFORMATION':
      return "📄 Complément d'Information";
    case 'ADHESION':
      return '✍️ Adhésion';
    case 'RECLAMATION':
      return '📞 Réclamation';
    case 'CONTRAT_AVENANT':
      return '📑 Contrat/Avenant';
    case 'DEMANDE_RESILIATION':
      return '❌ Demande de Résiliation';
    case 'CONVENTION_TIERS_PAYANT':
      return '🤝 Convention Tiers Payant';
    default:
      return type || 'Non spécifié';
  }
};

const getDocumentTypeColor = (type: string) => {
  switch (type) {
    case 'BULLETIN_SOIN':
      return '#3b82f6';
    case 'COMPLEMENT_INFORMATION':
      return '#8b5cf6';
    case 'ADHESION':
      return '#10b981';
    case 'RECLAMATION':
      return '#ef4444';
    case 'CONTRAT_AVENANT':
      return '#f59e0b';
    case 'DEMANDE_RESILIATION':
      return '#dc2626';
    case 'CONVENTION_TIERS_PAYANT':
      return '#06b6d4';
    default:
      return '#6b7280';
  }
};

const mapSlaStatusTone = (status: string) => {
  switch (status) {
    case 'healthy':
      return 'success';
    case 'breach':
      return 'danger';
    case 'warning':
      return 'warning';
    default:
      return 'neutral';
  }
};

export default ClientListPage;
