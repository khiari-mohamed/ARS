import { useEffect, useState } from "react";
import { fetchUnassignedBordereaux, fetchTeamBordereaux, assignBordereau } from "../../services/bordereauxService";
import { fetchUsers } from "../../services/userService";
import BordereauCard from "../../components/BordereauCard";
import { useAuth } from '../../contexts/AuthContext';
import "../../styles/chef-equipe.css";

interface Gestionnaire {
  id: string;
  fullName: string;
  workload: number;
  capacity: number;
}

function ChefEquipeBordereaux() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'non-affectes' | 'en-cours' | 'traites'>('non-affectes');
  const [unassignedBordereaux, setUnassignedBordereaux] = useState<any[]>([]);
  const [teamBordereaux, setTeamBordereaux] = useState<any[]>([]);
  const [gestionnaires, setGestionnaires] = useState<Gestionnaire[]>([]);
  const [selectedBordereaux, setSelectedBordereaux] = useState<string[]>([]);
  const [selectedGestionnaire, setSelectedGestionnaire] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  const teamId = user?.teamId || user?.id || '';

  useEffect(() => {
    loadData();
    loadGestionnaires();
  }, [teamId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [unassigned, team] = await Promise.all([
        fetchUnassignedBordereaux(),
        fetchTeamBordereaux(teamId)
      ]);
      setUnassignedBordereaux(unassigned || []);
      setTeamBordereaux(team || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGestionnaires = async () => {
    try {
      const users = await fetchUsers();
      const teamGestionnaires = users
        .filter((u: any) => u.role === 'GESTIONNAIRE' && (u.teamId === teamId || u.teamLeaderId === user?.id))
        .map((u: any) => ({
          id: u.id,
          fullName: u.fullName,
          workload: u.workload || 0,
          capacity: u.capacity || 20
        }));
      setGestionnaires(teamGestionnaires);
    } catch (error) {
      console.error('Error loading gestionnaires:', error);
    }
  };

  const handleBordereauSelect = (bordereauId: string) => {
    setSelectedBordereaux(prev => 
      prev.includes(bordereauId) 
        ? prev.filter(id => id !== bordereauId)
        : [...prev, bordereauId]
    );
  };

  const handleAssignBordereaux = async () => {
    if (!selectedGestionnaire || selectedBordereaux.length === 0) return;
    
    try {
      await Promise.all(
        selectedBordereaux.map(bordereauId => 
          assignBordereau(bordereauId, selectedGestionnaire)
        )
      );
      
      setSelectedBordereaux([]);
      setSelectedGestionnaire('');
      await loadData();
    } catch (error) {
      console.error('Error assigning bordereaux:', error);
    }
  };

  const getTabData = () => {
    switch (activeTab) {
      case 'non-affectes':
        return unassignedBordereaux;
      case 'en-cours':
        return teamBordereaux.filter(b => ['EN_COURS', 'ASSIGNE'].includes(b.statut));
      case 'traites':
        return teamBordereaux.filter(b => ['TRAITE', 'CLOTURE'].includes(b.statut));
      default:
        return [];
    }
  };

  const tabData = getTabData();

  return (
    <div className="chef-equipe-container">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Enhanced Header */}
        <div className="chef-equipe-header">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <div className="chef-equipe-icon">
              👨‍💼
            </div>
            <div>
              <h1 style={{ fontSize: '42px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Chef d'Équipe</h1>
              <p style={{ color: '#666', fontSize: '18px', margin: 0, fontWeight: '500' }}>Gestion et supervision de l'équipe</p>
            </div>
          </div>
          <div className="chef-equipe-warning">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '28px', marginRight: '20px' }}>✅</span>
              <div>
                <div style={{ fontWeight: 'bold', color: '#2e7d32', fontSize: '18px', marginBottom: '4px' }}>Accès Chef d'Équipe</div>
                <div style={{ color: '#388e3c', fontSize: '15px', lineHeight: '1.4' }}>Vous gérez la corbeille globale et supervisez votre équipe de gestionnaires</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="chef-equipe-stats">
          <div className="chef-equipe-stat-card">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ background: 'linear-gradient(135deg, #fff3e0 0%, #ffcc02 100%)', padding: '20px', borderRadius: '50%', marginRight: '20px', boxShadow: '0 8px 20px rgba(255, 152, 0, 0.2)' }}>
                <span style={{ fontSize: '32px' }}>📋</span>
              </div>
              <div>
                <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#ff9800', marginBottom: '4px' }}>{unassignedBordereaux.length}</div>
                <div style={{ fontSize: '16px', color: '#666', fontWeight: '600' }}>Non affectés</div>
              </div>
            </div>
          </div>
          <div className="chef-equipe-stat-card">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', padding: '20px', borderRadius: '50%', marginRight: '20px', boxShadow: '0 8px 20px rgba(33, 150, 243, 0.2)' }}>
                <span style={{ fontSize: '32px' }}>⏳</span>
              </div>
              <div>
                <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#2196f3', marginBottom: '4px' }}>
                  {teamBordereaux.filter(b => ['EN_COURS', 'ASSIGNE'].includes(b.statut)).length}
                </div>
                <div style={{ fontSize: '16px', color: '#666', fontWeight: '600' }}>En cours</div>
              </div>
            </div>
          </div>
          <div className="chef-equipe-stat-card">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ background: 'linear-gradient(135deg, #e8f5e8 0%, #4caf50 100%)', padding: '20px', borderRadius: '50%', marginRight: '20px', boxShadow: '0 8px 20px rgba(76, 175, 80, 0.2)' }}>
                <span style={{ fontSize: '32px' }}>✅</span>
              </div>
              <div>
                <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#4caf50', marginBottom: '4px' }}>
                  {teamBordereaux.filter(b => ['TRAITE', 'CLOTURE'].includes(b.statut)).length}
                </div>
                <div style={{ fontSize: '16px', color: '#666', fontWeight: '600' }}>Traités</div>
              </div>
            </div>
          </div>
          <div className="chef-equipe-stat-card">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)', padding: '20px', borderRadius: '50%', marginRight: '20px', boxShadow: '0 8px 20px rgba(156, 39, 176, 0.2)' }}>
                <span style={{ fontSize: '32px' }}>👥</span>
              </div>
              <div>
                <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#9c27b0', marginBottom: '4px' }}>{gestionnaires.length}</div>
                <div style={{ fontSize: '16px', color: '#666', fontWeight: '600' }}>Gestionnaires</div>
              </div>
            </div>
          </div>
        </div>

        {/* Corbeille Globale */}
        <div className="chef-equipe-corbeille">
          <div className="chef-equipe-corbeille-header">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="chef-equipe-corbeille-icon">
                📥
              </div>
              <div>
                <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Corbeille Globale</h2>
                <p style={{ color: '#666', fontSize: '18px', margin: 0, fontWeight: '500' }}>Gestion et affectation des dossiers</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
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
              Traités ({teamBordereaux.filter(b => ['TRAITE', 'CLOTURE'].includes(b.statut)).length})
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
                  ? 'Tous les dossiers ont été affectés à vos gestionnaires.'
                  : activeTab === 'en-cours'
                  ? 'Aucun dossier n\'est actuellement en cours de traitement.'
                  : 'Aucun dossier n\'a encore été traité par votre équipe.'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Dossiers Grid */}
              <div className="chef-equipe-dossier-grid">
                {tabData.map(bordereau => (
                  <div 
                    key={bordereau.id} 
                    className={`chef-equipe-dossier-card ${selectedBordereaux.includes(bordereau.id) ? 'selected' : ''}`}
                    onClick={() => activeTab === 'non-affectes' && handleBordereauSelect(bordereau.id)}
                    style={{ cursor: activeTab === 'non-affectes' ? 'pointer' : 'default' }}
                  >
                    <BordereauCard 
                      bordereau={bordereau} 
                      onAssignSuccess={loadData}
                      showSelect={activeTab === 'non-affectes'}
                      selected={selectedBordereaux.includes(bordereau.id)}
                    />
                  </div>
                ))}
              </div>

              {/* Assignment Panel */}
              {activeTab === 'non-affectes' && selectedBordereaux.length > 0 && (
                <div className="chef-equipe-assign-panel">
                  <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '20px' }}>
                    Affecter {selectedBordereaux.length} dossier(s) sélectionné(s)
                  </h3>
                  
                  <div className="chef-equipe-gestionnaire-list">
                    {gestionnaires.map(gestionnaire => (
                      <div
                        key={gestionnaire.id}
                        className={`chef-equipe-gestionnaire-card ${selectedGestionnaire === gestionnaire.id ? 'selected' : ''}`}
                        onClick={() => setSelectedGestionnaire(gestionnaire.id)}
                      >
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>👤</div>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>{gestionnaire.fullName}</div>
                        <div style={{ fontSize: '14px', color: '#666' }}>
                          Charge: {gestionnaire.workload}/{gestionnaire.capacity}
                        </div>
                        <div style={{ 
                          width: '100%', 
                          height: '4px', 
                          background: '#f0f0f0', 
                          borderRadius: '2px', 
                          marginTop: '8px',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            width: `${Math.min((gestionnaire.workload / gestionnaire.capacity) * 100, 100)}%`, 
                            height: '100%', 
                            background: gestionnaire.workload >= gestionnaire.capacity ? '#f44336' : '#4caf50',
                            borderRadius: '2px'
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '24px', textAlign: 'center' }}>
                    <button
                      onClick={handleAssignBordereaux}
                      disabled={!selectedGestionnaire}
                      style={{
                        background: selectedGestionnaire ? 'linear-gradient(135deg, #9c27b0 0%, #e91e63 100%)' : '#ccc',
                        color: 'white',
                        border: 'none',
                        padding: '16px 32px',
                        borderRadius: '12px',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        cursor: selectedGestionnaire ? 'pointer' : 'not-allowed',
                        boxShadow: selectedGestionnaire ? '0 8px 20px rgba(156, 39, 176, 0.3)' : 'none',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Affecter les dossiers
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Team Performance */}
        <div className="chef-equipe-performance">
          <div className="chef-equipe-perf-header">
            <div className="chef-equipe-perf-icon">
              📊
            </div>
            <div>
              <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Performance de l'Équipe</h2>
              <p style={{ color: '#666', fontSize: '18px', margin: 0, fontWeight: '500' }}>Suivi et analyse des performances</p>
            </div>
          </div>
          <div className="chef-equipe-perf-grid">
            <div className="chef-equipe-perf-card blue">
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#1565c0', marginBottom: '12px' }}>
                {teamBordereaux.length}
              </div>
              <div style={{ fontSize: '16px', color: '#1565c0', fontWeight: 'bold' }}>Total dossiers équipe</div>
            </div>
            <div className="chef-equipe-perf-card green">
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#2e7d32', marginBottom: '12px' }}>
                {teamBordereaux.filter(b => ['TRAITE', 'CLOTURE'].includes(b.statut)).length}
              </div>
              <div style={{ fontSize: '16px', color: '#2e7d32', fontWeight: 'bold' }}>Dossiers traités</div>
            </div>
            <div className="chef-equipe-perf-card orange">
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#f57c00', marginBottom: '12px' }}>
                {Math.round(gestionnaires.reduce((acc, g) => acc + (g.workload / g.capacity), 0) / gestionnaires.length * 100) || 0}%
              </div>
              <div style={{ fontSize: '16px', color: '#f57c00', fontWeight: 'bold' }}>Charge moyenne équipe</div>
            </div>
            <div className="chef-equipe-perf-card purple">
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#6a1b9a', marginBottom: '12px' }}>
                {teamBordereaux.length > 0 ? Math.round((teamBordereaux.filter(b => ['TRAITE', 'CLOTURE'].includes(b.statut)).length / teamBordereaux.length) * 100) : 0}%
              </div>
              <div style={{ fontSize: '16px', color: '#6a1b9a', fontWeight: 'bold' }}>Taux de réussite</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChefEquipeBordereaux;