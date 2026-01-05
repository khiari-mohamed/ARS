import { useEffect, useState } from "react";
import { fetchUnassignedBordereaux, fetchTeamBordereaux, assignBordereau, fetchUserBordereaux } from "../../services/bordereauxService";
import { fetchUsers } from "../../services/userService";
import BordereauCard from "../../components/BordereauCard";
import { useAuth } from '../../contexts/AuthContext';
import { LocalAPI } from '../../services/axios';
import "../../styles/chef-equipe.css";

interface Gestionnaire {
  id: string;
  fullName: string;
  workload: number;
  capacity: number;
}

function ChefEquipeBordereaux() {
  const { user } = useAuth();
  const isGestionnaire = user?.role === 'GESTIONNAIRE';
  const [activeTab, setActiveTab] = useState<'non-affectes' | 'en-cours' | 'traites'>('non-affectes');
  const [unassignedBordereaux, setUnassignedBordereaux] = useState<any[]>([]);
  const [teamBordereaux, setTeamBordereaux] = useState<any[]>([]);
  const [userBordereaux, setUserBordereaux] = useState<any[]>([]);
  const [gestionnaires, setGestionnaires] = useState<Gestionnaire[]>([]);
  const [selectedBordereaux, setSelectedBordereaux] = useState<string[]>([]);
  const [selectedGestionnaire, setSelectedGestionnaire] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedBordereau, setSelectedBordereau] = useState<any>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsModalType, setStatsModalType] = useState<'en-cours' | 'traites' | 'retournes' | 'non-affectes'>('en-cours');
  const [statsModalData, setStatsModalData] = useState<any[]>([]);
  
  const teamId = user?.teamId || user?.id || '';

  useEffect(() => {
    loadData();
    loadGestionnaires();
  }, [teamId]);

  // Debug userBordereaux for gestionnaire
  useEffect(() => {
    if (isGestionnaire && userBordereaux.length > 0) {
      console.log('🔍 GESTIONNAIRE DEBUG - userBordereaux:', userBordereaux);
      console.log('📊 GESTIONNAIRE STATUS BREAKDOWN:', {
        total: userBordereaux.length,
        enCours: userBordereaux.filter(b => ['EN_COURS', 'ASSIGNE'].includes(b.statut)).length,
        traites: userBordereaux.filter(b => ['TRAITE', 'CLOTURE'].includes(b.statut)).length,
        retournes: userBordereaux.filter(b => b.statut === 'RETOURNE' || b.statut === 'REJETE').length,
        statuses: userBordereaux.map(b => ({ ref: b.reference, status: b.statut }))
      });
    }
  }, [userBordereaux, isGestionnaire]);



  const loadData = async () => {
    try {
      setLoading(true);
      if (isGestionnaire) {
        // Gestionnaires see all bordereaux but can only modify assigned ones
        const [unassigned, team, userAssigned] = await Promise.all([
          fetchUnassignedBordereaux(),
          fetchTeamBordereaux(teamId),
          fetchUserBordereaux(user?.id || '')
        ]);
        setUnassignedBordereaux(unassigned || []);
        setTeamBordereaux(team || []);
        setUserBordereaux(userAssigned || []);
      } else {
        // Chef d'équipe sees only bordereaux from contracts assigned to them
        console.log('🔍 Loading data for Chef d\'équipe:', user?.id);
        const response = await LocalAPI.get('/bordereaux/chef-equipe/corbeille');
        const data = response.data;
        
        console.log('📊 Chef équipe corbeille data:', data);
        console.log('📊 Non affectés:', data.nonAffectes?.length || 0);
        console.log('📊 En cours:', data.enCours?.length || 0);
        console.log('📊 Traités:', data.traites?.length || 0);
        
        setUnassignedBordereaux(data.nonAffectes || []);
        setTeamBordereaux([...data.enCours || [], ...data.traites || []]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGestionnaires = async () => {
    try {
      const users = await fetchUsers();
      let filteredGestionnaires;
      
      if (isGestionnaire) {
        // Gestionnaires don't need to see other gestionnaires
        filteredGestionnaires = [];
      } else {
        // Chef d'équipe only sees gestionnaires in their team
        filteredGestionnaires = users
          .filter((u: any) => u.role === 'GESTIONNAIRE' && u.teamLeaderId === user?.id)
          .map((u: any) => ({
            id: u.id,
            fullName: u.fullName,
            workload: u.workload || 0,
            capacity: u.capacity || 20
          }));
      }
      
      console.log('🔍 Filtered gestionnaires for chef:', user?.id, 'Count:', filteredGestionnaires.length);
      setGestionnaires(filteredGestionnaires);
    } catch (error) {
      console.error('Error loading gestionnaires:', error);
    }
  };

  const handleBordereauSelect = (bordereauId: string) => {
    if (selectedBordereaux.includes(bordereauId)) {
      setSelectedBordereaux(selectedBordereaux.filter(id => id !== bordereauId));
    } else {
      setSelectedBordereaux([...selectedBordereaux, bordereauId]);
    }
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

  const handleGestionnaireStatusChange = async (bordereauId: string, newStatus: string) => {
    try {
      const response = await LocalAPI.post(`/bordereaux/${bordereauId}/gestionnaire-update-status`, {
        newStatus,
        comment: `Status changed to ${newStatus} by ${isGestionnaire ? 'Gestionnaire' : 'Chef d\'équipe'}`
      });

      console.log('✅ Status updated:', response.data.message);
      setShowStatusModal(false);
      await loadData(); // Refresh data
    } catch (error: any) {
      console.error('❌ Status update failed:', error);
      const errorMessage = error.response?.data?.message || 'Erreur de connexion';
      alert(`Erreur: ${errorMessage}`);
    }
  };

  const openStatusModal = (bordereau: any) => {
    setSelectedBordereau(bordereau);
    setShowStatusModal(true);
  };

  const openStatsModal = (type: 'en-cours' | 'traites' | 'retournes' | 'non-affectes') => {
    let data: any[] = [];
    switch (type) {
      case 'non-affectes':
        data = unassignedBordereaux;
        break;
      case 'en-cours':
        data = isGestionnaire ? userBordereaux.filter(b => ['EN_COURS', 'ASSIGNE'].includes(b.statut)) : teamBordereaux.filter(b => ['EN_COURS', 'ASSIGNE'].includes(b.statut));
        break;
      case 'traites':
        data = isGestionnaire ? userBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)) : teamBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut));
        break;
      case 'retournes':
        data = userBordereaux.filter(b => b.statut === 'RETOURNE' || b.statut === 'REJETE');
        break;
    }
    
    console.log('🔍 Opening stats modal:', type, 'Data count:', data.length);
    if (type === 'traites' && data.length > 0) {
      console.log('📊 Sample traites data:', data.slice(0, 2).map(b => ({
        ref: b.reference,
        statut: b.statut,
        dateExecutionVirement: b.dateExecutionVirement,
        virement: b.virement,
        dureeReglement: b.dureeReglement,
        dureeReglementStatus: b.dureeReglementStatus
      })));
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
        return [...teamBordereaux.filter(b => ['EN_COURS', 'ASSIGNE'].includes(b.statut)), ...userBordereaux.filter(b => ['EN_COURS', 'ASSIGNE'].includes(b.statut))];
      case 'traites':
        return teamBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut));
      default:
        return [];
    }
  };

  // Get Durée de traitement from backend calculation
  const getDureeTraitement = (bordereau: any): { days: number | null; isOnTime: boolean } => {
    if (bordereau.dureeTraitement === null || bordereau.dureeTraitement === undefined) {
      return { days: null, isOnTime: true };
    }
    return { 
      days: bordereau.dureeTraitement, 
      isOnTime: bordereau.dureeTraitementStatus === 'GREEN' 
    };
  };

  // Get Durée de règlement from backend calculation
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
        {/* Enhanced Header */}
        <div className="chef-equipe-header">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <div className="chef-equipe-icon">
              👨‍💼
            </div>
            <div>
              <h1 style={{ fontSize: '42px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
                {isGestionnaire ? 'Gestionnaire' : 'Chef d\'Équipe'}
              </h1>
              <p style={{ color: '#666', fontSize: '18px', margin: 0, fontWeight: '500' }}>
                {isGestionnaire ? 'Accès en lecture seule avec modification des dossiers assignés' : 'Gestion et supervision de votre équipe et contrats assignés'}
              </p>
            </div>
          </div>
          <div className="chef-equipe-warning">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '28px', marginRight: '20px' }}>✅</span>
              <div>
                <div style={{ fontWeight: 'bold', color: isGestionnaire ? '#f57c00' : '#2e7d32', fontSize: '18px', marginBottom: '4px' }}>
                  {isGestionnaire ? 'Accès Gestionnaire' : 'Accès Chef d\'Équipe'}
                </div>
                <div style={{ color: isGestionnaire ? '#ef6c00' : '#388e3c', fontSize: '15px', lineHeight: '1.4' }}>
                  {isGestionnaire 
                    ? 'Vous avez une visibilité sur tous les dossiers du bordereau, mais vous ne pouvez changer le statut/état que des dossiers qui vous sont personnellement affectés'
                    : 'Vous gérez uniquement les bordereaux des contrats qui vous sont assignés et supervisez vos gestionnaires'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats - Gestionnaire Only */}
        {isGestionnaire && (
          <div className="chef-equipe-stats">
            <div className="chef-equipe-stat-card" onClick={() => openStatsModal('en-cours')} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', padding: '20px', borderRadius: '50%', marginRight: '20px', boxShadow: '0 8px 20px rgba(33, 150, 243, 0.2)' }}>
                  <span style={{ fontSize: '32px' }}>⏳</span>
                </div>
                <div>
                  <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#2196f3', marginBottom: '4px' }}>
                    {userBordereaux.filter(b => ['EN_COURS', 'ASSIGNE'].includes(b.statut)).length}
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
                    {userBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length}
                  </div>
                  <div style={{ fontSize: '16px', color: '#666', fontWeight: '600' }}>Traités</div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Cliquer pour voir</div>
                </div>
              </div>
            </div>
            <div className="chef-equipe-stat-card" onClick={() => openStatsModal('retournes')} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ background: 'linear-gradient(135deg, #ffebee 0%, #f44336 100%)', padding: '20px', borderRadius: '50%', marginRight: '20px', boxShadow: '0 8px 20px rgba(244, 67, 54, 0.2)' }}>
                  <span style={{ fontSize: '32px' }}>↩️</span>
                </div>
                <div>
                  <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#f44336', marginBottom: '4px' }}>
                    {userBordereaux.filter(b => b.statut === 'RETOURNE' || b.statut === 'REJETE').length}
                  </div>
                  <div style={{ fontSize: '16px', color: '#666', fontWeight: '600' }}>Retournés</div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Cliquer pour voir</div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Chef d'équipe stats - WITH POPUP */}
        {!isGestionnaire && (
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
            <div className="chef-equipe-stat-card">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)', padding: '20px', borderRadius: '50%', marginRight: '20px', boxShadow: '0 8px 20px rgba(156, 39, 176, 0.2)' }}>
                  <span style={{ fontSize: '32px' }}>👥</span>
                </div>
                <div>
                  <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#9c27b0', marginBottom: '4px' }}>
                    {gestionnaires.length}
                  </div>
                  <div style={{ fontSize: '16px', color: '#666', fontWeight: '600' }}>Gestionnaires</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Corbeille Globale - COMMENTED OUT */}
        {false && !isGestionnaire && (
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
                  ? 'Tous les dossiers ont été affectés à vos gestionnaires.'
                  : activeTab === 'en-cours'
                  ? 'Aucun dossier n\'est actuellement en cours de traitement.'
                  : 'Aucun dossier n\'a encore été traité par votre équipe.'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Company-Requested Chef d'équipe Table */}
              <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{ padding: '16px', background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#495057' }}>📋 Tableau de Bord Chef d'Équipe</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa' }}>
                        {activeTab === 'non-affectes' && !isGestionnaire && (
                          <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>Sélection</th>
                        )}
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
                      {tabData.map((bordereau, index) => {
                        // Check if Gestionnaire can modify this bordereau
                        const canModify = !isGestionnaire || bordereau.assignedToUserId === user?.id;
                        const isAssignedToMe = bordereau.assignedToUserId === user?.id;
                        const isSelected = selectedBordereaux.includes(bordereau.id);
                        

                        
                        return (
                        <tr 
                          key={bordereau.id} 
                          style={{ 
                            background: isSelected ? '#e3f2fd' : index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                            cursor: activeTab === 'non-affectes' && !isGestionnaire ? 'pointer' : 'default',
                            opacity: isGestionnaire && !isAssignedToMe ? 0.6 : 1,
                            border: isSelected ? '2px solid #2196f3' : 'none'
                          }}
                          onClick={() => {
                            if (activeTab === 'non-affectes' && !isGestionnaire) {
                              handleBordereauSelect(bordereau.id);
                            }
                          }}
                        >
                          {activeTab === 'non-affectes' && !isGestionnaire && (
                            <td style={{ padding: '12px 8px', borderBottom: '1px solid #dee2e6' }}>
                              <input 
                                type="checkbox" 
                                checked={selectedBordereaux.includes(bordereau.id)}
                                onChange={() => handleBordereauSelect(bordereau.id)}
                                style={{ cursor: 'pointer' }}
                              />
                            </td>
                          )}
                          <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6' }}>
                            {bordereau.client?.name || 'N/A'}
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: 'bold', color: '#0066cc', borderBottom: '1px solid #dee2e6' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {bordereau.reference}
                              {isGestionnaire && isAssignedToMe && (
                                <span style={{
                                  background: '#4caf50',
                                  color: 'white',
                                  padding: '2px 6px',
                                  borderRadius: '10px',
                                  fontSize: '10px',
                                  fontWeight: 'bold'
                                }}>
                                  💼 ASSIGNÉ
                                </span>
                              )}
                              {isGestionnaire && !isAssignedToMe && (
                                <span style={{
                                  background: '#999',
                                  color: 'white',
                                  padding: '2px 6px',
                                  borderRadius: '10px',
                                  fontSize: '10px',
                                  fontWeight: 'bold'
                                }}>
                                  🔒 LECTURE
                                </span>
                              )}
                            </div>
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Original Dossiers Grid (kept for compatibility) */}
              <div className="chef-equipe-dossier-grid" style={{ display: 'none' }}>
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

              {/* Assignment Panel - Only for Chef d'équipe */}
              {activeTab === 'non-affectes' && selectedBordereaux.length > 0 && !isGestionnaire && (
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
        )}

        {/* Performance Section */}
        <div className="chef-equipe-performance">
          <div className="chef-equipe-perf-header">
            <div className="chef-equipe-perf-icon">
              📊
            </div>
            <div>
              <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
                {isGestionnaire ? 'Performance Gestionnaire' : 'Performance de l\'\u00c9quipe'}
              </h2>
              <p style={{ color: '#666', fontSize: '18px', margin: 0, fontWeight: '500' }}>Suivi et analyse des performances</p>
            </div>
          </div>
          <div className="chef-equipe-perf-grid">
            {isGestionnaire ? (
              <>
                <div className="chef-equipe-perf-card blue">
                  <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#1565c0', marginBottom: '12px' }}>
                    {userBordereaux.length}
                  </div>
                  <div style={{ fontSize: '16px', color: '#1565c0', fontWeight: 'bold' }}>Total bordereaux gestionnaire</div>
                </div>
                <div className="chef-equipe-perf-card green">
                  <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#2e7d32', marginBottom: '12px' }}>
                    {userBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length}
                  </div>
                  <div style={{ fontSize: '16px', color: '#2e7d32', fontWeight: 'bold' }}>bordereaux traités par le gestionnaire</div>
                </div>
                <div className="chef-equipe-perf-card orange">
                  <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#f57c00', marginBottom: '12px' }}>
                    {Math.round((userBordereaux.length / 20) * 100) || 0}%
                  </div>
                  <div style={{ fontSize: '16px', color: '#f57c00', fontWeight: 'bold' }}>Charge moyenne du gestionnaire</div>
                </div>
                <div className="chef-equipe-perf-card purple">
                  <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#6a1b9a', marginBottom: '12px' }}>
                    {userBordereaux.length > 0 ? Math.round((userBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length / userBordereaux.length) * 100) : 0}%
                  </div>
                  <div style={{ fontSize: '16px', color: '#6a1b9a', fontWeight: 'bold' }}>Taux de réussite du gestionnaire</div>
                </div>
              </>
            ) : (
              <>
                <div className="chef-equipe-perf-card blue">
                  <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#1565c0', marginBottom: '12px' }}>
                    {unassignedBordereaux.length + teamBordereaux.length}
                  </div>
                  <div style={{ fontSize: '16px', color: '#1565c0', fontWeight: 'bold' }}>Total bordereaux équipe</div>
                </div>
                <div className="chef-equipe-perf-card green">
                  <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#2e7d32', marginBottom: '12px' }}>
                    {teamBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length}
                  </div>
                  <div style={{ fontSize: '16px', color: '#2e7d32', fontWeight: 'bold' }}>bordereaux traités</div>
                </div>
                <div className="chef-equipe-perf-card orange">
                  <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#f57c00', marginBottom: '12px' }}>
                    {Math.round(gestionnaires.reduce((acc, g) => acc + (g.workload / g.capacity), 0) / gestionnaires.length * 100) || 0}%
                  </div>
                  <div style={{ fontSize: '16px', color: '#f57c00', fontWeight: 'bold' }}>Charge moyenne équipe</div>
                </div>
                <div className="chef-equipe-perf-card purple">
                  <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#6a1b9a', marginBottom: '12px' }}>
                    {(unassignedBordereaux.length + teamBordereaux.length) > 0 ? Math.round((teamBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length / (unassignedBordereaux.length + teamBordereaux.length)) * 100) : 0}%
                  </div>
                  <div style={{ fontSize: '16px', color: '#6a1b9a', fontWeight: 'bold' }}>Taux de réussite</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && selectedBordereau && (
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
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '8px' }}>
                Modifier le Statut
              </h2>
              <p style={{ color: '#666', fontSize: '16px' }}>
                Bordereau: <strong>{selectedBordereau.reference}</strong>
              </p>
              <p style={{ color: '#666', fontSize: '14px' }}>
                Statut actuel: <span style={{ 
                  background: '#e3f2fd', 
                  color: '#1976d2', 
                  padding: '4px 8px', 
                  borderRadius: '4px',
                  fontWeight: 'bold'
                }}>{selectedBordereau.statut}</span>
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#1a1a1a' }}>
                Choisir le nouveau statut:
              </h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                {(isGestionnaire ? [
                  { key: 'TRAITE', label: 'Traité', color: '#4caf50', icon: '✅' },
                  { key: 'EN_DIFFICULTE', label: 'En difficulté', color: '#ff9800', icon: '⚠️' },
                  { key: 'REJETE', label: 'Rejeté', color: '#f44336', icon: '❌' }
                ] : [
                  { key: 'TRAITE', label: 'Traité', color: '#4caf50', icon: '✅' },
                  { key: 'EN_DIFFICULTE', label: 'En difficulté', color: '#ff9800', icon: '⚠️' },
                  { key: 'REJETE', label: 'Rejeté', color: '#f44336', icon: '❌' },
                  { key: 'ASSIGNE', label: 'Assigné', color: '#2196f3', icon: '📋' },
                  { key: 'EN_COURS', label: 'En cours', color: '#9c27b0', icon: '⏳' }
                ]).map(status => (
                  <button
                    key={status.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '16px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: '16px',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = status.color;
                      e.currentTarget.style.backgroundColor = status.color + '10';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e0e0e0';
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                    onClick={() => handleGestionnaireStatusChange(selectedBordereau.id, status.key)}
                  >
                    <span style={{ fontSize: '24px', marginRight: '12px' }}>{status.icon}</span>
                    <span style={{ color: status.color, fontWeight: 'bold' }}>{status.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                style={{
                  padding: '12px 24px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  color: '#666',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setShowStatusModal(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Stats Modal for Gestionnaire */}
      {showStatsModal && isGestionnaire && (
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
            maxWidth: '1000px',
            maxHeight: '80vh',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8f9fa'
            }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a', margin: 0 }}>
                  {statsModalType === 'en-cours' ? '⏳ Dossiers En Cours' : 
                   statsModalType === 'traites' ? '✅ Dossiers Traités' : 
                   '↩️ Dossiers Retournés'}
                </h2>
                <p style={{ color: '#666', fontSize: '14px', margin: '4px 0 0 0' }}>
                  {statsModalData.length} dossier(s) trouvé(s)
                </p>
              </div>
              <button
                onClick={() => setShowStatsModal(false)}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                Fermer
              </button>
            </div>
            
            {/* Modal Content */}
            <div style={{ padding: '20px', maxHeight: '60vh', overflow: 'auto' }}>
              {statsModalData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                    {statsModalType === 'en-cours' ? '⏳' : 
                     statsModalType === 'traites' ? '✅' : '↩️'}
                  </div>
                  <h3 style={{ fontSize: '20px', color: '#666', marginBottom: '8px' }}>Aucun dossier</h3>
                  <p style={{ color: '#999' }}>Aucun dossier {statsModalType === 'en-cours' ? 'en cours' : statsModalType === 'traites' ? 'traité' : 'retourné'} pour le moment.</p>
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
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsModalData.map((bordereau, index) => (
                        <tr key={bordereau.id} style={{ borderBottom: '1px solid #f0f0f0', backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                          <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: 'bold', color: '#0066cc' }}>
                            {bordereau.reference}
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                            {bordereau.client?.name || 'Client inconnu'}
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                            <span style={{
                              background: bordereau.statut === 'TRAITE' || bordereau.statut === 'CLOTURE' ? '#4caf50' : 
                                         bordereau.statut === 'RETOURNE' ? '#f44336' : '#2196f3',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}>
                              {bordereau.statut}
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                            {new Date(bordereau.dateReception).toLocaleDateString('fr-FR')}
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                            <span style={{
                              background: '#e3f2fd',
                              color: '#1976d2',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}>
                              {bordereau.documentsCount || bordereau.nombreBS || 0} BS
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                            <span style={{
                              background: '#fff3e0',
                              color: '#f57c00',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}>
                              {bordereau.delaiReglement || 30}j
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => {
                                  setSelectedBordereau(bordereau);
                                  setShowStatusModal(true);
                                  setShowStatsModal(false);
                                }}
                                style={{
                                  background: '#2196f3',
                                  color: 'white',
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                              >
                                ✏️ Modifier
                              </button>
                            </div>
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
                Dossiers {statsModalType === 'non-affectes' ? 'Non Affectés' : statsModalType === 'en-cours' ? 'En Cours' : statsModalType === 'traites' ? 'Traités' : 'Retournés'} ({statsModalData.length})
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
                  <p>Aucun dossier {statsModalType === 'non-affectes' ? 'non affecté' : statsModalType === 'en-cours' ? 'en cours' : statsModalType === 'traites' ? 'traité' : 'retourné'}</p>
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
                        {statsModalData.some(b => b.statut === 'VIREMENT_EXECUTE') && (
                          <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Date Traitement Virement</th>
                        )}
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Durée Règlement</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsModalData.map((bordereau, index) => {
                        const dt = getDureeTraitement(bordereau);
                        const dr = getDureeReglement(bordereau);
                        const isVirementExecute = bordereau.statut === 'VIREMENT_EXECUTE';
                        const dateTraitementVirement = bordereau.dateExecutionVirement || bordereau.virement?.dateExecution;
                        
                        // Use backend-calculated dureeReglement for VIREMENT_EXECUTE
                        const dureeReglementDays = dr.days;
                        const dureeReglementOnTime = dr.isOnTime;
                        
                        return (
                        <tr key={bordereau.id} style={{ borderBottom: '1px solid #f0f0f0', backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                          <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: 'bold' }}>{bordereau.reference}</td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>{bordereau.client?.name || 'N/A'}</td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                            <span style={{
                              background: bordereau.statut === 'VIREMENT_EXECUTE' ? '#9c27b0' :
                                         bordereau.statut === 'TRAITE' || bordereau.statut === 'CLOTURE' ? '#4caf50' : 
                                         bordereau.statut === 'RETOURNE' ? '#f44336' : '#2196f3',
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
                          {statsModalData.some(b => b.statut === 'VIREMENT_EXECUTE') && (
                            <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                              {isVirementExecute && dateTraitementVirement ? (
                                <span style={{ background: '#e1bee7', color: '#6a1b9a', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                                  {new Date(dateTraitementVirement).toLocaleDateString('fr-FR')}
                                </span>
                              ) : (
                                <span style={{ color: '#999', fontSize: '12px' }}>-</span>
                              )}
                            </td>
                          )}
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                            {isVirementExecute && dureeReglementDays !== null ? (
                              <span style={{ 
                                background: dureeReglementOnTime ? '#c8e6c9' : '#ffcdd2', 
                                color: dureeReglementOnTime ? '#1b5e20' : '#b71c1c', 
                                padding: '4px 8px', 
                                borderRadius: '12px', 
                                fontSize: '12px', 
                                fontWeight: 'bold' 
                              }}>
                                ✓ Réglé ({dureeReglementDays}j)
                              </span>
                            ) : dr.days === null ? (
                              <span style={{ color: '#999', fontSize: '12px' }}>En attente</span>
                            ) : (
                              <span style={{ background: dr.isOnTime ? '#e8f5e9' : '#ffebee', color: dr.isOnTime ? '#2e7d32' : '#c62828', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{dr.days}j</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                            <button
                              onClick={() => {
                                setSelectedBordereau(bordereau);
                                setShowStatsModal(false);
                                setShowStatusModal(true);
                              }}
                              style={{
                                background: '#2196f3',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              Modifier
                            </button>
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

export default ChefEquipeBordereaux;