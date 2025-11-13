import { useEffect, useState } from "react";
import { LocalAPI } from '../../services/axios';
import { useAuth } from '../../contexts/AuthContext';
import "../../styles/chef-equipe.css";

function GestionnaireSeniorBordereaux() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'non-affectes' | 'en-cours' | 'traites'>('non-affectes');
  const [unassignedBordereaux, setUnassignedBordereaux] = useState<any[]>([]);
  const [teamBordereaux, setTeamBordereaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsModalType, setStatsModalType] = useState<'en-cours' | 'traites' | 'non-affectes'>('en-cours');
  const [statsModalData, setStatsModalData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await LocalAPI.get('/bordereaux/gestionnaire-senior/corbeille');
      const data = response.data;
      
      console.log('📊 Gestionnaire Senior corbeille data:', data);
      
      setUnassignedBordereaux(data.nonAffectes || []);
      setTeamBordereaux([...data.enCours || [], ...data.traites || []]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openStatsModal = (type: 'en-cours' | 'traites' | 'non-affectes') => {
    let data: any[] = [];
    switch (type) {
      case 'non-affectes':
        data = unassignedBordereaux;
        break;
      case 'en-cours':
        data = teamBordereaux.filter(b => ['EN_COURS', 'ASSIGNE'].includes(b.statut));
        break;
      case 'traites':
        data = teamBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut));
        break;
    }
    
    setStatsModalType(type);
    setStatsModalData(data);
    setShowStatsModal(true);
  };

  const getTabData = () => {
    switch (activeTab) {
      case 'non-affectes':
        return unassignedBordereaux.filter(b => !b.assignedToUserId);
      case 'en-cours':
        return teamBordereaux.filter(b => ['EN_COURS', 'ASSIGNE'].includes(b.statut));
      case 'traites':
        return teamBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut));
      default:
        return [];
    }
  };

  const getDureeTraitement = (bordereau: any): { days: number | null; isOnTime: boolean } => {
    if (bordereau.dureeTraitement === null || bordereau.dureeTraitement === undefined) {
      return { days: null, isOnTime: true };
    }
    return { 
      days: bordereau.dureeTraitement, 
      isOnTime: bordereau.dureeTraitementStatus === 'GREEN' 
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
          <div className="chef-equipe-stat-card" onClick={() => openStatsModal('non-affectes')} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ background: 'linear-gradient(135deg, #fff3e0 0%, #ffcc02 100%)', padding: '20px', borderRadius: '50%', marginRight: '20px', boxShadow: '0 8px 20px rgba(255, 152, 0, 0.2)' }}>
                <span style={{ fontSize: '32px' }}>📋</span>
              </div>
              <div>
                <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#ff9800', marginBottom: '4px' }}>{unassignedBordereaux.length}</div>
                <div style={{ fontSize: '16px', color: '#666', fontWeight: '600' }}>Non affectés</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Cliquer pour voir</div>
              </div>
            </div>
          </div>
          <div className="chef-equipe-stat-card" onClick={() => openStatsModal('en-cours')} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', padding: '20px', borderRadius: '50%', marginRight: '20px', boxShadow: '0 8px 20px rgba(33, 150, 243, 0.2)' }}>
                <span style={{ fontSize: '32px' }}>⏳</span>
              </div>
              <div>
                <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#2196f3', marginBottom: '4px' }}>
                  {teamBordereaux.filter(b => ['EN_COURS', 'ASSIGNE'].includes(b.statut)).length}
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

        {/* Tabs */}
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '24px' }}>
          <div className="chef-equipe-tabs">
            <button 
              className={`chef-equipe-tab ${activeTab === 'non-affectes' ? 'active' : ''}`}
              onClick={() => setActiveTab('non-affectes')}
            >
              Non affectés ({unassignedBordereaux.length})
            </button>
            <button 
              className={`chef-equipe-tab ${activeTab === 'en-cours' ? 'active' : ''}`}
              onClick={() => setActiveTab('en-cours')}
            >
              En cours ({teamBordereaux.filter(b => ['EN_COURS', 'ASSIGNE'].includes(b.statut)).length})
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
                Aucun dossier {activeTab === 'non-affectes' ? 'non affecté' : activeTab === 'en-cours' ? 'en cours' : 'traité'}
              </h3>
              <p style={{ color: '#666', fontSize: '20px', marginBottom: '40px', lineHeight: '1.5' }}>
                {activeTab === 'non-affectes' 
                  ? 'Tous les dossiers ont été affectés.'
                  : activeTab === 'en-cours'
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
                          return (
                            <span style={{ 
                              background: dureeTraitement.isOnTime ? '#e8f5e9' : '#ffebee', 
                              color: dureeTraitement.isOnTime ? '#2e7d32' : '#c62828', 
                              padding: '4px 8px', 
                              borderRadius: '12px', 
                              fontSize: '12px', 
                              fontWeight: 'bold',
                              display: 'inline-block'
                            }}>
                              {dureeTraitement.days} jour{dureeTraitement.days !== 1 ? 's' : ''}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6' }}>
                        {(() => {
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
                {unassignedBordereaux.length + teamBordereaux.length}
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
                {Math.round(((unassignedBordereaux.length + teamBordereaux.length) / 20) * 100) || 0}%
              </div>
              <div style={{ fontSize: '16px', color: '#f57c00', fontWeight: 'bold' }}>Charge moyenne</div>
            </div>
            <div className="chef-equipe-perf-card purple">
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#6a1b9a', marginBottom: '12px' }}>
                {(unassignedBordereaux.length + teamBordereaux.length) > 0 ? Math.round((teamBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length / (unassignedBordereaux.length + teamBordereaux.length)) * 100) : 0}%
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
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>BS</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Délai</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsModalData.map((bordereau, index) => (
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
                        </tr>
                      ))}
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
