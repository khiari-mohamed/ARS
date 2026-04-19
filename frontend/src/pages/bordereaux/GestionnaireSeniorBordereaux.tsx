import { useEffect, useState } from "react";
import { LocalAPI } from '../../services/axios';
import { useAuth } from '../../contexts/AuthContext';
import { Autocomplete } from '@mui/material';
import { Filter, Search } from 'lucide-react';
import "../../styles/chef-equipe.css";

function GestionnaireSeniorBordereaux() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'en-cours' | 'traites'>('en-cours');
  const [unassignedBordereaux, setUnassignedBordereaux] = useState<any[]>([]);
  const [teamBordereaux, setTeamBordereaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsModalType, setStatsModalType] = useState<'en-cours' | 'traites' | 'non-affectes'>('en-cours');
  const [statsModalData, setStatsModalData] = useState<any[]>([]);
  
  // Filter states
  const [clients, setClients] = useState<any[]>([]);
  const [referenceFilter, setReferenceFilter] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [virementFilter, setVirementFilter] = useState('');
  const [slaFilter, setSlaFilter] = useState<'all' | 'respecte' | 'a_risque' | 'en_retard'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filteredData, setFilteredData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    loadClients();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await LocalAPI.get('/bordereaux/gestionnaire-senior/corbeille');
      const data = response.data;
      
      console.log('📊 Gestionnaire Senior corbeille data:', data);
      
      // Gestionnaire Senior has NO nonAffectes - everything goes to enCours
      setUnassignedBordereaux([]);
      const allBordereaux = [...data.enCours || [], ...data.traites || []];
      setTeamBordereaux(allBordereaux);
      setFilteredData(allBordereaux);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const { fetchClients } = await import('../../services/clientService');
      const clientsData = await fetchClients();
      setClients(clientsData || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const openStatsModal = (type: 'en-cours' | 'traites' | 'non-affectes') => {
    let data: any[] = [];
    switch (type) {
      case 'non-affectes':
        data = [];
        break;
      case 'en-cours':
        data = teamBordereaux.filter(b => !['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut));
        break;
      case 'traites':
        data = teamBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut));
        break;
    }
    
    setStatsModalType(type);
    setStatsModalData(data);
    setShowStatsModal(true);
  };

  const calculateSLAStatus = (bordereau: any) => {
    if (!bordereau.dateReception || !bordereau.delaiReglement) return 'UNKNOWN';
    
    const today = new Date();
    const reception = new Date(bordereau.dateReception);
    const delai = bordereau.delaiReglement;
    
    // ✅ FREEZE LOGIC: Stop calculation when virement is executed
    const isFrozen = ['VIREMENT_EXECUTE', 'PAYE', 'CLOTURE'].includes(bordereau.statut);
    const freezeDate = bordereau.dateExecutionVirement || bordereau.dateCloture;
    
    const effectiveEndDate = isFrozen && freezeDate ? new Date(freezeDate) : today;
    const daysElapsed = (effectiveEndDate.getTime() - reception.getTime()) / (1000 * 60 * 60 * 24);
    const percentElapsed = (daysElapsed / delai) * 100;
    
    if (percentElapsed > 100) return 'OVERDUE';
    if (percentElapsed > 80) return 'AT_RISK';
    return 'ON_TIME';
  };

  const applyFilters = () => {
    let filtered = [...teamBordereaux];

    if (referenceFilter) {
      filtered = filtered.filter(b => 
        b.reference?.toLowerCase().includes(referenceFilter.toLowerCase())
      );
    }

    if (selectedClient) {
      filtered = filtered.filter(b => b.clientId === selectedClient);
    }

    if (virementFilter) {
      if (virementFilter === 'NONE') {
        filtered = filtered.filter(b => !b.ordresVirement || b.ordresVirement.length === 0);
      } else {
        filtered = filtered.filter(b => 
          b.ordresVirement && b.ordresVirement.length > 0 && b.ordresVirement[0].etatVirement === virementFilter
        );
      }
    }

    if (slaFilter !== 'all') {
      filtered = filtered.filter(b => {
        const slaStatus = calculateSLAStatus(b);
        if (slaFilter === 'en_retard') return slaStatus === 'OVERDUE';
        if (slaFilter === 'a_risque') return slaStatus === 'AT_RISK';
        if (slaFilter === 'respecte') return slaStatus === 'ON_TIME';
        return true;
      });
    }

    if (dateFrom) {
      filtered = filtered.filter(b => {
        const receptionDate = new Date(b.dateReception);
        return receptionDate >= new Date(dateFrom);
      });
    }
    if (dateTo) {
      filtered = filtered.filter(b => {
        const receptionDate = new Date(b.dateReception);
        return receptionDate <= new Date(dateTo);
      });
    }

    setFilteredData(filtered);
  };

  const resetFilters = () => {
    setReferenceFilter('');
    setSelectedClient('');
    setVirementFilter('');
    setSlaFilter('all');
    setDateFrom('');
    setDateTo('');
    setFilteredData(teamBordereaux);
  };

  useEffect(() => {
    applyFilters();
  }, [referenceFilter, selectedClient, virementFilter, slaFilter, dateFrom, dateTo, teamBordereaux]);

  const getTabData = () => {
    const dataToFilter = filteredData;
    
    switch (activeTab) {
      case 'en-cours':
        return dataToFilter.filter(b => !['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut));
      case 'traites':
        return dataToFilter.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut));
      default:
        return [];
    }
  };

  const getDureeTraitement = (bordereau: any): { days: number | null; isOnTime: boolean; warning?: string } => {
    if (bordereau.dureeTraitement === null || bordereau.dureeTraitement === undefined) {
      return { days: null, isOnTime: true };
    }
    return { 
      days: bordereau.dureeTraitement, 
      isOnTime: bordereau.dureeTraitementStatus === 'GREEN',
      warning: bordereau.dureeTraitementWarning || undefined
    };
  };

  const getDureeReglement = (bordereau: any): { days: number | null; isOnTime: boolean } => {
    if (bordereau.dureeReglement === null || bordereau.dureeReglement === undefined) {
      return { days: null, isOnTime: true };
    }
    return { 
      days: bordereau.dureeReglement, 
      isOnTime: bordereau.dureeReglementStatus === 'GREEN' 
    };
  };

  const tabData = getTabData();

  return (
    <div className="chef-equipe-container">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div className="chef-equipe-header">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <div className="chef-equipe-icon">
              👨‍💼
            </div>
            <div>
              <h1 style={{ fontSize: '42px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
                Gestionnaire Senior - Bordereaux
              </h1>
              <p style={{ color: '#666', fontSize: '18px', margin: 0, fontWeight: '500' }}>
                Gestion autonome de vos clients assignés
              </p>
            </div>
          </div>
          <div className="chef-equipe-warning">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '28px', marginRight: '20px' }}>✅</span>
              <div>
                <div style={{ fontWeight: 'bold', color: '#2e7d32', fontSize: '18px', marginBottom: '4px' }}>
                  Accès Gestionnaire Senior
                </div>
                <div style={{ color: '#388e3c', fontSize: '15px', lineHeight: '1.4' }}>
                  Vous gérez uniquement les bordereaux des contrats qui vous sont assignés (travail autonome)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="chef-equipe-stats">
          <div className="chef-equipe-stat-card" onClick={() => openStatsModal('en-cours')} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', padding: '20px', borderRadius: '50%', marginRight: '20px', boxShadow: '0 8px 20px rgba(33, 150, 243, 0.2)' }}>
                <span style={{ fontSize: '32px' }}>⏳</span>
              </div>
              <div>
                <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#2196f3', marginBottom: '4px' }}>
                  {teamBordereaux.filter(b => !['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length}
                </div>
                <div style={{ fontSize: '16px', color: '#666', fontWeight: '600' }}>En cours</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Cliquer pour voir</div>
              </div>
            </div>
          </div>
          <div className="chef-equipe-stat-card" onClick={() => openStatsModal('traites')} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ background: 'linear-gradient(135deg, #e8f5e8 0%, #4caf50 100%)', padding: '20px', borderRadius: '50%', marginRight: '20px', boxShadow: '0 8px 20px rgba(76, 175, 80, 0.2)' }}>
                <span style={{ fontSize: '32px' }}>✅</span>
              </div>
              <div>
                <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#4caf50', marginBottom: '4px' }}>
                  {teamBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length}
                </div>
                <div style={{ fontSize: '16px', color: '#666', fontWeight: '600' }}>Traités</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Cliquer pour voir</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #f0f0f0', borderTop: '3px solid #2196f3' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ background: '#e3f2fd', borderRadius: '6px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Filter style={{ width: '14px', height: '14px', color: '#1976d2' }} />
            </div>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a1a' }}>Filtres de recherche</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Référence</label>
              <input type="text" placeholder="Rechercher..." value={referenceFilter} onChange={(e) => setReferenceFilter(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', width: '140px', color: '#374151' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client</label>
              <Autocomplete
                options={clients}
                getOptionLabel={(option) => option.name || ''}
                value={clients.find(c => c.id === selectedClient) || null}
                onChange={(e, newValue) => setSelectedClient(newValue?.id || '')}
                renderInput={(params) => (
                  <div ref={params.InputProps.ref}>
                    <input
                      {...params.inputProps}
                      type="text"
                      placeholder="Sélectionner..."
                      style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', width: '100%', color: '#374151' }}
                    />
                  </div>
                )}
                style={{ width: '180px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Statut Virement</label>
              <select value={virementFilter} onChange={(e) => setVirementFilter(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', width: '160px', color: '#374151' }}>
                <option value="">Tous</option>
                <option value="EXECUTE">✅ Exécuté</option>
                <option value="EN_COURS">🔄 En cours</option>
                <option value="EN_COURS_VALIDATION">⏳ En attente validation</option>
                <option value="REJETE">❌ Rejeté</option>
                <option value="NONE">Pas de virement</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SLA</label>
              <select value={slaFilter} onChange={(e) => setSlaFilter(e.target.value as any)} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', width: '190px', color: '#374151' }}>
                <option value="all">📊 Tous ({teamBordereaux.length})</option>
                <option value="en_retard">● En retard ({teamBordereaux.filter(b => calculateSLAStatus(b) === 'OVERDUE').length})</option>
                <option value="a_risque">▲ À risque ({teamBordereaux.filter(b => calculateSLAStatus(b) === 'AT_RISK').length})</option>
                <option value="respecte">✓ Respecté ({teamBordereaux.filter(b => calculateSLAStatus(b) === 'ON_TIME').length})</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date début</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', width: '142px', color: '#374151' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date fin</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', width: '142px', color: '#374151' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <button onClick={resetFilters} style={{ padding: '7px 14px', background: 'white', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
                Effacer
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '24px' }}>
          <div className="chef-equipe-tabs">
            <button 
              className={`chef-equipe-tab ${activeTab === 'en-cours' ? 'active' : ''}`}
              onClick={() => setActiveTab('en-cours')}
            >
              En cours ({teamBordereaux.filter(b => !['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length})
            </button>
            <button 
              className={`chef-equipe-tab ${activeTab === 'traites' ? 'active' : ''}`}
              onClick={() => setActiveTab('traites')}
            >
              Traités ({teamBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length})
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
              <p style={{ color: '#666', fontSize: '18px' }}>Chargement des dossiers...</p>
            </div>
          ) : tabData.length === 0 ? (
            <div className="chef-equipe-empty">
              <div className="chef-equipe-empty-icon">
                📋
              </div>
              <h3 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '16px', letterSpacing: '-0.5px' }}>
                Aucun dossier {activeTab === 'en-cours' ? 'en cours' : 'traité'}
              </h3>
              <p style={{ color: '#666', fontSize: '20px', marginBottom: '40px', lineHeight: '1.5' }}>
                {activeTab === 'en-cours'
                  ? 'Aucun dossier n\'est actuellement en cours de traitement.'
                  : 'Aucun dossier n\'a encore été traité.'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>Client / Prestataire</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>Référence Bordereau</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>Date réception BO</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>Bulletin de soins</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>Date fin de Scannérisation</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>Délais contractuels de règlement</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>Durée de traitement</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>Durée de règlement</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>SLA</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>Statut Virement</th>
                  </tr>
                </thead>
                <tbody>
                  {tabData.map((bordereau, index) => (
                    <tr 
                      key={bordereau.id} 
                      style={{ 
                        background: index % 2 === 0 ? '#ffffff' : '#f8f9fa'
                      }}
                    >
                      <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6' }}>
                        {bordereau.client?.name || 'N/A'}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: 'bold', color: '#0066cc', borderBottom: '1px solid #dee2e6' }}>
                        {bordereau.reference}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6' }}>
                        {bordereau.dateReception ? new Date(bordereau.dateReception).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ 
                            background: '#e3f2fd', 
                            color: '#1976d2', 
                            padding: '4px 8px', 
                            borderRadius: '12px', 
                            fontSize: '12px', 
                            fontWeight: 'bold' 
                          }}>
                            {bordereau.nombreBS || 0} BS
                          </span>
                          {bordereau.BulletinSoin && bordereau.BulletinSoin.length > 0 && (
                            <span style={{ fontSize: '12px', color: '#666' }}>
                              ({bordereau.BulletinSoin.filter((bs: any) => bs.etat === 'VALIDATED').length} traités)
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6' }}>
                        {bordereau.dateFinScan ? new Date(bordereau.dateFinScan).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6' }}>
                        <span style={{ 
                          background: '#fff3e0', 
                          color: '#f57c00', 
                          padding: '4px 8px', 
                          borderRadius: '12px', 
                          fontSize: '12px', 
                          fontWeight: 'bold' 
                        }}>
                          {bordereau.delaiReglement || 0} jours
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6' }}>
                        {(() => {
                          const dureeTraitement = getDureeTraitement(bordereau);
                          if (dureeTraitement.days === null || dureeTraitement.days === undefined) {
                            return <span style={{ color: '#999', fontSize: '12px' }}>En cours</span>;
                          }
                          
                          const hasWarning = !!dureeTraitement.warning;
                          const bgColor = hasWarning ? '#fff3e0' : (dureeTraitement.isOnTime ? '#e8f5e9' : '#ffebee');
                          const textColor = hasWarning ? '#f57c00' : (dureeTraitement.isOnTime ? '#2e7d32' : '#c62828');
                          
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ 
                                background: bgColor, 
                                color: textColor, 
                                padding: '4px 8px', 
                                borderRadius: '12px', 
                                fontSize: '12px', 
                                fontWeight: 'bold',
                                display: 'inline-block'
                              }}>
                                {dureeTraitement.days} jour{dureeTraitement.days !== 1 ? 's' : ''}
                              </span>
                              {hasWarning && (
                                <span 
                                  title={dureeTraitement.warning}
                                  style={{ 
                                    cursor: 'help',
                                    fontSize: '14px',
                                    color: '#f57c00'
                                  }}
                                >
                                  ⚠️
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6' }}>
                        {(() => {
                          if (bordereau.statut === 'VIREMENT_EXECUTE' || bordereau.statut === 'CLOTURE' || bordereau.statut === 'PAYE') {
                            const days = getDureeReglement(bordereau).days;
                            return <span style={{ color: '#4caf50', fontSize: '12px', fontWeight: 'bold' }}>✓ Réglé ({days || 0}j)</span>;
                          }
                          const dureeReglement = getDureeReglement(bordereau);
                          if (dureeReglement.days === null || dureeReglement.days === undefined) {
                            return <span style={{ color: '#999', fontSize: '12px' }}>En attente</span>;
                          }
                          return (
                            <span style={{ 
                              background: dureeReglement.isOnTime ? '#e8f5e9' : '#ffebee', 
                              color: dureeReglement.isOnTime ? '#2e7d32' : '#c62828', 
                              padding: '4px 8px', 
                              borderRadius: '12px', 
                              fontSize: '12px', 
                              fontWeight: 'bold',
                              display: 'inline-block'
                            }}>
                              {dureeReglement.days} jour{dureeReglement.days !== 1 ? 's' : ''}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6' }}>
                        {(() => {
                          const slaStatus = calculateSLAStatus(bordereau);
                          if (slaStatus === 'UNKNOWN') {
                            return <span style={{ color: '#999', fontSize: '12px' }}>-</span>;
                          }
                          return (
                            <span style={{ 
                              background: slaStatus === 'OVERDUE' ? '#ffebee' : slaStatus === 'AT_RISK' ? '#fff3e0' : '#e8f5e9',
                              color: slaStatus === 'OVERDUE' ? '#c62828' : slaStatus === 'AT_RISK' ? '#f57c00' : '#2e7d32',
                              padding: '4px 8px', 
                              borderRadius: '12px', 
                              fontSize: '12px', 
                              fontWeight: 'bold',
                              display: 'inline-block'
                            }}>
                              {slaStatus === 'OVERDUE' ? '● En retard' : slaStatus === 'AT_RISK' ? '▲ À risque' : '✓ Respecté'}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6' }}>
                        {(() => {
                          // Check if virement exists
                          if (bordereau.ordresVirement && bordereau.ordresVirement.length > 0) {
                            const virement = bordereau.ordresVirement[0];
                            const etat = virement.etatVirement;
                            
                            let bgColor = '#e3f2fd';
                            let textColor = '#1976d2';
                            let icon = '⏳';
                            let label = 'En attente';
                            
                            if (etat === 'EXECUTE') {
                              bgColor = '#e8f5e9';
                              textColor = '#2e7d32';
                              icon = '✅';
                              label = 'Exécuté';
                            } else if (etat === 'REJETE') {
                              bgColor = '#ffebee';
                              textColor = '#c62828';
                              icon = '❌';
                              label = 'Rejeté';
                            } else if (etat === 'EN_COURS') {
                              bgColor = '#fff3e0';
                              textColor = '#f57c00';
                              icon = '🔄';
                              label = 'En cours';
                            } else if (etat === 'EN_COURS_VALIDATION') {
                              bgColor = '#e3f2fd';
                              textColor = '#1976d2';
                              icon = '⏳';
                              label = 'En attente';
                            }
                            
                            return (
                              <span style={{ 
                                background: bgColor, 
                                color: textColor, 
                                padding: '4px 8px', 
                                borderRadius: '12px', 
                                fontSize: '11px', 
                                fontWeight: 'bold',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                {icon} {label}
                              </span>
                            );
                          }
                          
                          // No virement yet
                          return <span style={{ color: '#999', fontSize: '12px' }}>Pas de virement</span>;
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Performance Section */}
        <div className="chef-equipe-performance">
          <div className="chef-equipe-perf-header">
            <div className="chef-equipe-perf-icon">
              📊
            </div>
            <div>
              <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
                Performance Gestionnaire Senior
              </h2>
              <p style={{ color: '#666', fontSize: '18px', margin: 0, fontWeight: '500' }}>Suivi et analyse des performances</p>
            </div>
          </div>
          <div className="chef-equipe-perf-grid">
            <div className="chef-equipe-perf-card blue">
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#1565c0', marginBottom: '12px' }}>
                {teamBordereaux.length}
              </div>
              <div style={{ fontSize: '16px', color: '#1565c0', fontWeight: 'bold' }}>Total bordereaux</div>
            </div>
            <div className="chef-equipe-perf-card green">
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#2e7d32', marginBottom: '12px' }}>
                {teamBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length}
              </div>
              <div style={{ fontSize: '16px', color: '#2e7d32', fontWeight: 'bold' }}>Bordereaux traités</div>
            </div>
            <div className="chef-equipe-perf-card orange">
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#f57c00', marginBottom: '12px' }}>
                {Math.round((teamBordereaux.length / 20) * 100) || 0}%
              </div>
              <div style={{ fontSize: '16px', color: '#f57c00', fontWeight: 'bold' }}>Charge moyenne</div>
            </div>
            <div className="chef-equipe-perf-card purple">
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#6a1b9a', marginBottom: '12px' }}>
                {teamBordereaux.length > 0 ? Math.round((teamBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length / teamBordereaux.length) * 100) : 0}%
              </div>
              <div style={{ fontSize: '16px', color: '#6a1b9a', fontWeight: 'bold' }}>Taux de réussite</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Modal */}
      {showStatsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '1200px',
            maxHeight: '80vh',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8f9fa'
            }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                Dossiers {statsModalType === 'non-affectes' ? 'Non Affectés' : statsModalType === 'en-cours' ? 'En Cours' : 'Traités'} ({statsModalData.length})
              </h2>
              <button 
                onClick={() => setShowStatsModal(false)}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Fermer
              </button>
            </div>
            
            <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
              {statsModalData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                  <p>Aucun dossier {statsModalType === 'non-affectes' ? 'non affecté' : statsModalType === 'en-cours' ? 'en cours' : 'traité'}</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #d52b36' }}>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Référence</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Client</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Statut</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Date Réception</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Documents</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Délai</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Durée Traitement</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Durée Règlement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsModalData.map((bordereau, index) => {
                        const dt = getDureeTraitement(bordereau);
                        const dr = getDureeReglement(bordereau);
                        return (
                        <tr key={bordereau.id} style={{ borderBottom: '1px solid #f0f0f0', backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                          <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: 'bold' }}>{bordereau.reference}</td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>{bordereau.client?.name || 'N/A'}</td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                            <span style={{
                              background: bordereau.statut === 'TRAITE' || bordereau.statut === 'CLOTURE' ? '#4caf50' : '#2196f3',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}>
                              {bordereau.statut}
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                            {bordereau.dateReception ? new Date(bordereau.dateReception).toLocaleDateString('fr-FR') : '-'}
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                            <span style={{ background: '#e3f2fd', color: '#1976d2', padding: '4px 8px', borderRadius: '12px', fontSize: '12px' }}>
                              {bordereau.nombreBS || 0} BS
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                            <span style={{ background: '#fff3e0', color: '#f57c00', padding: '4px 8px', borderRadius: '12px', fontSize: '12px' }}>
                              {bordereau.delaiReglement || 30} jours
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                            {dt.days === null ? <span style={{ color: '#999', fontSize: '12px' }}>En cours</span> : <span style={{ background: dt.isOnTime ? '#e8f5e9' : '#ffebee', color: dt.isOnTime ? '#2e7d32' : '#c62828', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{dt.days}j</span>}
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                            {bordereau.statut === 'VIREMENT_EXECUTE' || bordereau.statut === 'CLOTURE' || bordereau.statut === 'PAYE' ? <span style={{ color: '#4caf50', fontSize: '12px', fontWeight: 'bold' }}>✓ Réglé ({dr.days || 0}j)</span> : dr.days === null ? <span style={{ color: '#999', fontSize: '12px' }}>En attente</span> : <span style={{ background: dr.isOnTime ? '#e8f5e9' : '#ffebee', color: dr.isOnTime ? '#2e7d32' : '#c62828', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{dr.days}j</span>}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionnaireSeniorBordereaux;
