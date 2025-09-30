import React, { useEffect, useState } from 'react';
import { 
  fetchClients, 
  createClient, 
  updateClient, 
  deleteClient, 
  exportClientsAdvanced, 
  fetchAvailableGestionnaires,
  uploadClientContract,
  downloadClientContract,
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

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await fetchClients({ name: searchTerm, status: statusFilter });
      setClients(data);
      if (!selectedClient && data.length > 0) {
        setSelectedClient(data[0]);
      }
    } catch (error) {
      notify('Erreur lors du chargement des clients', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
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

  const handleSubmitClient = async (data: Partial<Client>) => {
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

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
  };

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      const blob = await exportClientsAdvanced(format, { name: searchTerm, status: statusFilter });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clients-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      notify(`Export ${format.toUpperCase()} réussi`, 'success');
    } catch (error) {
      notify('Erreur lors de l\'export', 'error');
    }
  };

  const filteredClients = clients
    .filter(client => 
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

  const canManageClients = ['SUPER_ADMIN', 'ADMINISTRATEUR', 'CHEF_EQUIPE'].includes(user?.role || '');

  return (
    <div className="client-module">
      {/* Header */}
      <div className="client-header">
        <div className="client-header-content">
          <h1 className="client-title">📋 Module Client</h1>
          <p className="client-subtitle">Base de données centrale des compagnies d'assurance</p>
        </div>
        
        {/* Search and Filters */}
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
            </select>
          </div>
          
          {/* Action Buttons */}
          {canManageClients && (
            <div className="action-buttons">
              <button
                onClick={handleAddClient}
                className="btn btn-primary"
              >
                ➕ Ajouter Client
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="btn btn-secondary"
              >
                📊 Exporter Excel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="client-layout">
        {/* Client List */}
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
              {filteredClients.map(client => (
                <div
                  key={client.id}
                  className={`client-card ${selectedClient?.id === client.id ? 'selected' : ''}`}
                  onClick={() => handleSelectClient(client)}
                >
                  <div className="client-card-header">
                    <h4 className="client-name">{client.name}</h4>
                    <span className={`status-badge ${client.status || 'active'}`}>
                      {client.status === 'active' ? 'Actif' : client.status === 'inactive' ? 'Inactif' : 'Suspendu'}
                    </span>
                  </div>
                  
                  <div className="client-card-info">
                    <div className="info-item">
                      <span className="label">Chargé de Compte:</span>
                      <span className="value">{client.gestionnaires?.[0]?.fullName || 'Non assigné'}</span>
                    </div>
                    <div className="info-row">
                      <div className="info-item">
                        <span className="label">Délai Règlement:</span>
                        <span className="value">{client.reglementDelay}j</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Délai Réclamation:</span>
                        <span className="value">{client.reclamationDelay}h</span>
                      </div>
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
              ))}
            </div>
          )}
        </div>

        {/* Client Details */}
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

      {/* Client Form Modal */}
      {showForm && (
        <ClientFormModal
          client={editingClient}
          onSubmit={handleSubmitClient}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
};

// Fixed Client Detail View Component with inline styles
const ClientDetailViewFixed: React.FC<{ client: Client; onUpdate: () => void }> = ({ client, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const { notify } = useNotification();

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Client Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>{client.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: client.status === 'active' ? '#10b981' : '#ef4444' }}></span>
              <span style={{ fontSize: '0.875rem', color: '#6b7280', fontFamily: 'monospace' }}>ID: {client.id.slice(0, 8)}</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>{client.bordereaux?.length || 0}</span>
              <span style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>Bordereaux</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>{client.reclamations?.length || 0}</span>
              <span style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>Réclamations</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>{client.contracts?.length || 0}</span>
              <span style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>Contrats</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Tabs */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f8fafc', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {[
            { id: 'overview', label: '📋 Aperçu' },
            { id: 'contracts', label: '📑 Contrats' },
            { id: 'sla', label: '⏱️ Paramètres SLA' },
            { id: 'bordereaux', label: '📄 Bordereaux' },
            { id: 'reclamations', label: '📞 Réclamations' },
            { id: 'analytics', label: '📊 Analytics' },
            { id: 'history', label: '📚 Historique' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                border: activeTab === tab.id ? '2px solid #3b82f6' : '1px solid #d1d5db',
                background: activeTab === tab.id ? '#eff6ff' : '#ffffff',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                color: activeTab === tab.id ? '#1e40af' : '#374151',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {activeTab === 'overview' && <ClientOverviewTab client={client} />}
        {activeTab === 'contracts' && <ClientContractsTab client={client} />}
        {activeTab === 'sla' && <ClientSLATab client={client} onUpdate={onUpdate} />}
        {activeTab === 'bordereaux' && <ClientBordereauxTab client={client} />}
        {activeTab === 'reclamations' && <ClientReclamationsTab client={client} />}
        {activeTab === 'analytics' && <ClientAnalyticsTab client={client} />}
        {activeTab === 'history' && <ClientHistoryTab client={client} />}
      </div>
    </div>
  );
};

// Original Client Detail View Component
const ClientDetailView: React.FC<{ client: Client; onUpdate: () => void }> = ({ client, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const { notify } = useNotification();

  const tabs = [
    { id: 'overview', label: '📋 Aperçu', icon: '📋' },
    { id: 'contracts', label: '📑 Contrats', icon: '📑' },
    { id: 'sla', label: '⏱️ Paramètres SLA', icon: '⏱️' },
    { id: 'bordereaux', label: '📄 Bordereaux', icon: '📄' },
    { id: 'reclamations', label: '📞 Réclamations', icon: '📞' },
    { id: 'analytics', label: '📊 Analytics', icon: '📊' },
    { id: 'history', label: '📚 Historique', icon: '📚' }
  ];

  return (
    <div className="client-detail">
      {/* Client Header */}
      <div className="client-detail-header">
        <div className="client-info">
          <h2 className="client-detail-name">{client.name}</h2>
          <div className="client-meta">
            <span className={`status-indicator ${client.status || 'active'}`}></span>
            <span className="client-id">ID: {client.id.slice(0, 8)}</span>
          </div>
        </div>
        
        <div className="client-stats">
          <div className="stat-item">
            <span className="stat-value">{client.bordereaux?.length || 0}</span>
            <span className="stat-label">Bordereaux</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{client.reclamations?.length || 0}</span>
            <span className="stat-label">Réclamations</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{client.contracts?.length || 0}</span>
            <span className="stat-label">Contrats</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="client-tabs">
        <div className="tab-list">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="tab-content">
          {activeTab === 'overview' && <ClientOverviewTab client={client} />}
          {activeTab === 'contracts' && <ClientContractsTab client={client} />}
          {activeTab === 'sla' && <ClientSLATab client={client} onUpdate={onUpdate} />}
          {activeTab === 'bordereaux' && <ClientBordereauxTab client={client} />}
          {activeTab === 'reclamations' && <ClientReclamationsTab client={client} />}
          {activeTab === 'analytics' && <ClientAnalyticsTab client={client} />}
          {activeTab === 'history' && <ClientHistoryTab client={client} />}
        </div>
      </div>
    </div>
  );
};

// Tab Components (simplified for now - will be implemented separately)
// Payment Stats Component
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
          <h4>📊 Statistiques de Paiement (Module Finance)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '12px' }}>
            <div style={{ textAlign: 'center', padding: '8px', background: '#f0f9ff', borderRadius: '6px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>
                {paymentStats.paymentStats.paidOnTime}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Payés dans les délais</div>
            </div>
            <div style={{ textAlign: 'center', padding: '8px', background: '#fef2f2', borderRadius: '6px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ef4444' }}>
                {paymentStats.paymentStats.paidLate}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Payés en retard</div>
            </div>
            <div style={{ textAlign: 'center', padding: '8px', background: '#f9fafb', borderRadius: '6px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937' }}>
                {paymentStats.paymentStats.totalPaid}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total sinistres payés</div>
            </div>
            <div style={{ textAlign: 'center', padding: '8px', background: '#eff6ff', borderRadius: '6px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>
                {paymentStats.paymentStats.onTimeRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Taux de ponctualité</div>
            </div>
          </div>
        </div>
      )}
      {paymentStats?.reclamationTimingStats && (
        <div className="info-card">
          <h4>📞 Statistiques de Réclamations</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '12px' }}>
            <div style={{ textAlign: 'center', padding: '8px', background: '#f0f9ff', borderRadius: '6px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>
                {paymentStats.reclamationTimingStats.handledOnTime}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Traitées dans les délais</div>
            </div>
            <div style={{ textAlign: 'center', padding: '8px', background: '#fef2f2', borderRadius: '6px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ef4444' }}>
                {paymentStats.reclamationTimingStats.handledLate}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Traitées en retard</div>
            </div>
            <div style={{ textAlign: 'center', padding: '8px', background: '#f9fafb', borderRadius: '6px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937' }}>
                {paymentStats.reclamationTimingStats.totalHandled}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total réclamations traitées</div>
            </div>
            <div style={{ textAlign: 'center', padding: '8px', background: '#eff6ff', borderRadius: '6px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>
                {paymentStats.reclamationTimingStats.onTimeRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Taux de ponctualité</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const ClientOverviewTab: React.FC<{ client: Client }> = ({ client }) => {
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'inactive': return 'Inactif';
      case 'suspended': return 'Suspendu';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'inactive': return '#ef4444';
      case 'suspended': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <div className="tab-panel">
      <h3>Informations Générales</h3>
      <div className="info-grid">
        <div className="info-card">
          <h4>Coordonnées</h4>
          <p><strong>Nom:</strong> {client.name}</p>
          <p><strong>Email:</strong> {client.email || 'Non renseigné'}</p>
          <p><strong>Téléphone:</strong> {client.phone || 'Non renseigné'}</p>
          <p><strong>Adresse:</strong> {client.address || 'Non renseignée'}</p>
          <p>
            <strong>Statut:</strong> 
            <span style={{ color: getStatusColor(client.status), marginLeft: '8px' }}>
              • {getStatusLabel(client.status)}
            </span>
          </p>
        </div>
        <div className="info-card">
          <h4>Paramètres Contractuels</h4>
          <p><strong>Délai Règlement:</strong> {client.reglementDelay} jours</p>
          <p><strong>Délai Réclamation:</strong> {client.reclamationDelay} heures</p>
          <p><strong>Créé le:</strong> {new Date(client.createdAt).toLocaleDateString('fr-FR')}</p>
          <p><strong>Modifié le:</strong> {new Date(client.updatedAt).toLocaleDateString('fr-FR')}</p>
        </div>
        <div className="info-card">
          <h4>Référents</h4>
          <p><strong>Gestionnaires assignés:</strong></p>
          {client.gestionnaires && client.gestionnaires.length > 0 ? (
            client.gestionnaires.map(g => (
              <div key={g.id} className="gestionnaire-item">
                <p>• {g.fullName}</p>
                {g.email && <p style={{ fontSize: '0.875rem', color: '#6b7280', marginLeft: '12px' }}>{g.email}</p>}
              </div>
            ))
          ) : (
            <p style={{ color: '#ef4444' }}>Aucun gestionnaire assigné</p>
          )}
        </div>
        <div className="info-card">
          <h4>Statistiques</h4>
          <p><strong>Bordereaux:</strong> {client.bordereaux?.length || 0}</p>
          <p><strong>Contrats:</strong> {client.contracts?.length || 0}</p>
          <p><strong>Réclamations:</strong> {client.reclamations?.length || 0}</p>
        </div>
        <PaymentStatsCard client={client} />
      </div>
    </div>
  );
};

const ClientContractsTab: React.FC<{ client: Client }> = ({ client }) => {
  const [uploadingContract, setUploadingContract] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { notify } = useNotification();

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const { data } = await LocalAPI.get(`/clients/${client.id}/documents`);
        setDocuments(data);
      } catch (error) {
        console.error('Error loading documents:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDocuments();
  }, [client.id]);

  const handleContractUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      notify('Seuls les fichiers PDF sont autorisés', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      notify('La taille du fichier ne doit pas dépasser 10MB', 'error');
      return;
    }

    setUploadingContract(true);
    try {
      const result = await uploadClientContract(client.id, file);
      notify('Contrat uploadé avec succès', 'success');
      // Add new document to list
      setDocuments(prev => [result, ...prev]);
      // Reset file input
      event.target.value = '';
    } catch (error) {
      notify('Erreur lors de l\'upload du contrat', 'error');
    } finally {
      setUploadingContract(false);
    }
  };

  const handleContractDownload = async (documentId: string, fileName: string) => {
    try {
      const blob = await downloadClientContract(documentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      notify('Erreur lors du téléchargement', 'error');
    }
  };

  if (loading) {
    return (
      <div className="tab-panel">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement des contrats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel">
      <div className="tab-header">
        <h3>Contrats Numériques ({documents.length})</h3>
        <div className="tab-actions">
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            {uploadingContract ? '🔄 Upload...' : '📁 Ajouter Contrat'}
            <input
              type="file"
              accept=".pdf"
              onChange={handleContractUpload}
              disabled={uploadingContract}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>
      
      <div className="contracts-list">
        {documents.length > 0 ? (
          documents.map(document => (
            <div key={document.id} className="contract-item">
              <div className="contract-info">
                <h4>{document.name}</h4>
                <p><strong>Uploadé le:</strong> {new Date(document.uploadedAt).toLocaleDateString('fr-FR')}</p>
                <p><strong>Type:</strong> {document.type}</p>
                <p><strong>Taille:</strong> Document PDF</p>
              </div>
              <div className="contract-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => handleContractDownload(document.id, document.name)}
                >
                  📄 Télécharger
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>Aucun contrat disponible</p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Uploadez le premier contrat pour ce client</p>
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

  const getSLAStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#10b981';
      case 'breach': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <div className="tab-panel">
      <div className="tab-header">
        <h3>Paramètres SLA</h3>
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
          <p className="status-indicator" style={{ color: getSLAStatusColor(slaStatus.status) }}>
            • {slaStatus.status === 'healthy' ? 'Conforme' : slaStatus.status === 'breach' ? 'En dépassement' : 'Attention'}
          </p>
          {slaStatus.reason && <p><strong>Raison:</strong> {slaStatus.reason}</p>}
          {slaStatus.avgSLA && <p><strong>SLA Moyen:</strong> {slaStatus.avgSLA.toFixed(1)} jours</p>}
        </div>
      )}
      
      <div className="sla-config">
        <div className="sla-item">
          <label>Délai de Règlement (jours)</label>
          <input 
            type="number" 
            value={slaConfig.reglementDelay || client.reglementDelay} 
            onChange={(e) => setSlaConfig({ ...slaConfig, reglementDelay: parseInt(e.target.value) || 0 })}
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
            value={slaConfig.reclamationDelay || client.reclamationDelay} 
            onChange={(e) => setSlaConfig({ ...slaConfig, reclamationDelay: parseInt(e.target.value) || 0 })}
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
            value={slaConfig.slaThreshold || client.reglementDelay}
            onChange={(e) => setSlaConfig({ ...slaConfig, slaThreshold: parseInt(e.target.value) || 0 })}
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
            value={slaConfig.escalationThreshold || (client.reglementDelay + 5)}
            onChange={(e) => setSlaConfig({ ...slaConfig, escalationThreshold: parseInt(e.target.value) || 0 })}
            disabled={!editing}
            min="1"
            max="365"
          />
          <small>Déclenche une escalade automatique</small>
        </div>

        <div className="sla-item">
          <label>Notifications Email</label>
          <select 
            value={slaConfig.emailNotifications ? 'enabled' : 'disabled'}
            onChange={(e) => setSlaConfig({ ...slaConfig, emailNotifications: e.target.value === 'enabled' })}
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

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'CLOTURE': return '#10b981';
      case 'EN_COURS': return '#3b82f6';
      case 'EN_ATTENTE': return '#f59e0b';
      case 'EN_DIFFICULTE': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'CLOTURE': return 'Clôturé';
      case 'EN_COURS': return 'En cours';
      case 'EN_ATTENTE': return 'En attente';
      case 'EN_DIFFICULTE': return 'En difficulté';
      default: return statut;
    }
  };

  if (loading) {
    return (
      <div className="tab-panel">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement des bordereaux...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel">
      <h3>Bordereaux Associés ({bordereaux.length})</h3>
      
      {bordereaux.length > 0 ? (
        <div className="bordereaux-list">
          {bordereaux.map(bordereau => (
            <div key={bordereau.id} className="bordereau-item">
              <div className="bordereau-header">
                <h4>{bordereau.reference}</h4>
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(bordereau.statut), color: 'white' }}
                >
                  {getStatusLabel(bordereau.statut)}
                </span>
              </div>
              <div className="bordereau-info">
                <p><strong>Date Réception:</strong> {new Date(bordereau.dateReception).toLocaleDateString('fr-FR')}</p>
                <p><strong>Nombre BS:</strong> {bordereau.nombreBS}</p>
                <p><strong>Délai Règlement:</strong> {bordereau.delaiReglement} jours</p>
                {bordereau.dateCloture && (
                  <p><strong>Date Clôture:</strong> {new Date(bordereau.dateCloture).toLocaleDateString('fr-FR')}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>Aucun bordereau pour ce client</p>
        </div>
      )}
    </div>
  );
};

// Reclamation Create Modal Component (moved up for proper scoping)
const ReclamationCreateModal: React.FC<{
  clientId: string;
  onSubmit: (data: any) => void;
  onClose: () => void;
}> = ({ clientId, onSubmit, onClose }) => {
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
        
        <form onSubmit={handleSubmit} className="reclamation-form">
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
      // Reload reclamations
      const updatedData = await fetchComplaintsByClient(client.id);
      setReclamations(updatedData);
    } catch (error) {
      notify('Erreur lors de la création', 'error');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high': return 'Haute';
      case 'medium': return 'Moyenne';
      case 'low': return 'Basse';
      default: return severity;
    }
  };

  if (loading) {
    return (
      <div className="tab-panel">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement des réclamations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel">
      <div className="tab-header">
        <h3>Réclamations ({reclamations.length})</h3>
        <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
          ➕ Nouvelle Réclamation
        </button>
      </div>
      
      {reclamations.length > 0 ? (
        <div className="reclamations-list">
          {reclamations.map(reclamation => (
            <div key={reclamation.id} className="reclamation-item">
              <div className="reclamation-header">
                <h4>{reclamation.type}</h4>
                <div className="reclamation-badges">
                  <span 
                    className="severity-badge"
                    style={{ backgroundColor: getSeverityColor(reclamation.severity), color: 'white' }}
                  >
                    {getSeverityLabel(reclamation.severity)}
                  </span>
                  <span className="status-badge">{reclamation.status}</span>
                </div>
              </div>
              <div className="reclamation-info">
                <p><strong>Description:</strong> {reclamation.description}</p>
                <p><strong>Créée le:</strong> {new Date(reclamation.createdAt).toLocaleDateString('fr-FR')}</p>
                {reclamation.assignedTo && (
                  <p><strong>Assignée à:</strong> {reclamation.assignedTo.fullName}</p>
                )}
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CLOTURE': return '#10b981';
      case 'EN_COURS': return '#3b82f6';
      case 'ASSIGNE': return '#f59e0b';
      case 'A_SCANNER': return '#ef4444';
      case 'EN_ATTENTE': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

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

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      case 'critical': return '#dc2626';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="tab-panel">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement des analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel">
      <div className="tab-header">
        <h3>Analytics & Performance</h3>
        <select 
          value={period} 
          onChange={(e) => {
            console.log('Period changed to:', e.target.value);
            setPeriod(e.target.value);
          }}
          className="period-select"
        >
          <option value="daily">Quotidien (30j)</option>
          <option value="weekly">Hebdomadaire (12s)</option>
          <option value="monthly">Mensuel (12m)</option>
          <option value="yearly">Annuel (3a)</option>
        </select>
      </div>

      <div className="analytics-grid">
        {/* Risk Assessment */}
        {riskAssessment && (
          <div className="analytics-card">
            <h4>Evaluation des Risques</h4>
            <div className="risk-score">
              <span 
                className="risk-level"
                style={{ color: getRiskLevelColor(riskAssessment.riskLevel) }}
              >
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

        {/* Performance Metrics */}
        {performanceMetrics && (
          <div className="analytics-card">
            <h4>Métriques de Performance</h4>
            <div className="metrics-grid">
              <div className="metric-item">
                <span className="metric-value">{performanceMetrics.bordereauxByStatus?.reduce((acc: number, item: any) => acc + item._count, 0) || 0}</span>
                <span className="metric-label">Bordereaux Traités</span>
              </div>
              <div className="metric-item">
                <span className="metric-value">{performanceMetrics.reclamationsByStatus?.reduce((acc: number, item: any) => acc + item._count, 0) || 0}</span>
                <span className="metric-label">Réclamations</span>
              </div>
              <div className="metric-item">
                <span className="metric-value">{performanceMetrics.slaMetrics?._avg?.delaiReglement?.toFixed(1) || 'N/A'}</span>
                <span className="metric-label">SLA Moyen (jours)</span>
              </div>
            </div>
            
            {/* Payment Timing Stats */}
            {performanceMetrics.paymentStats && (
              <div className="payment-stats">
                <h5>📊 Statistiques de Paiement (Module Finance)</h5>
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
                    <span className="stat-number" style={{ color: '#3b82f6' }}>{performanceMetrics.paymentStats.onTimeRate.toFixed(1)}%</span>
                    <span className="stat-text">Taux de ponctualité</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Reclamation Timing Stats */}
            {performanceMetrics.reclamationTimingStats && (
              <div className="reclamation-timing-stats">
                <h5>📞 Statistiques de Réclamations</h5>
                <div className="stats-row">
                  <div className="stat-box">
                    <span className="stat-number" style={{ color: '#10b981' }}>{performanceMetrics.reclamationTimingStats.handledOnTime}</span>
                    <span className="stat-text">Traitées dans les délais</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-number" style={{ color: '#ef4444' }}>{performanceMetrics.reclamationTimingStats.handledLate}</span>
                    <span className="stat-text">Traitées en retard</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-number">{performanceMetrics.reclamationTimingStats.totalHandled}</span>
                    <span className="stat-text">Total réclamations traitées</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-number" style={{ color: '#3b82f6' }}>{performanceMetrics.reclamationTimingStats.onTimeRate.toFixed(1)}%</span>
                    <span className="stat-text">Taux de ponctualité</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Status Breakdown Charts */}
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
                              backgroundColor: getStatusColor(item.statut)
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

        {/* SLA Compliance */}
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
                      <span className="trend-date">{new Date(trend.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Volume Analysis */}
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
      <div className="tab-panel">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement de l'historique...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel">
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
            {/* This would show audit log entries */}
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
                {communicationHistory.map(comm => (
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
                      <p>Période: {new Date(contract.startDate).toLocaleDateString('fr-FR')} - {new Date(contract.endDate).toLocaleDateString('fr-FR')}</p>
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

// Client Form Modal Component
const ClientFormModal: React.FC<{
  client: Client | null;
  onSubmit: (data: Partial<Client>) => void;
  onClose: () => void;
}> = ({ client, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    name: client?.name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address: client?.address || '',
    reglementDelay: client?.reglementDelay || 30,
    reclamationDelay: client?.reclamationDelay || 48,
    status: (client?.status || 'active') as 'active' | 'inactive' | 'suspended',
    gestionnaireIds: client?.gestionnaires?.map(g => g.id) || []
  });
  const [availableGestionnaires, setAvailableGestionnaires] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadGestionnaires = async () => {
      try {
        // Fetch CHEF_EQUIPE users instead of GESTIONNAIRE
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

  // Remove the handleGestionnaireChange function since we're using a select dropdown now

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
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'suspended' })}
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
              {availableGestionnaires.map(gestionnaire => (
                <option key={gestionnaire.id} value={gestionnaire.id}>
                  {gestionnaire.fullName} ({gestionnaire.email})
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Sauvegarde...' : (client ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientListPage;
