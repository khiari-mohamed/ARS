

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

const REGISTRE_STYLES = `
  .gsd-root {
    --ink-900:#0F1B2D; --ink-700:#24344A; --ink-500:#5B6B82; --ink-300:#9AA7B8;
    --line:#E2E6EC; --surface:#FFFFFF; --canvas:#F3F5F9;
    --brand:#A82A2E; --brand-dark:#7E1F22;
    --ok:#1E8E5A; --ok-bg:#E7F5EE; --warn:#B4740E; --warn-bg:#FBF1DF;
    --danger:#B3272D; --danger-bg:#FBEAEA; --info:#2A5DA8; --info-bg:#E9F0FA;
    font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    background: var(--canvas); min-height: 100vh; color: var(--ink-900);
    padding: 24px 20px 60px;
  }
  .gsd-root * { box-sizing: border-box; }
  @media (max-width: 640px) { .gsd-root { padding: 16px 12px 48px; } }

  .gsd-wrap { max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }

  .gsd-header {
    background: linear-gradient(135deg, var(--ink-900) 0%, #16263D 100%);
    border-bottom: 3px solid var(--brand);
    border-radius: 10px;
    padding: 28px 24px;
    color: white;
    display: flex; align-items: center; gap: 18px;
  }
  .gsd-header-icon {
    width: 56px; height: 56px; border-radius: 50%; background: rgba(255,255,255,0.08);
    display: flex; align-items: center; justify-content: center; font-size: 26px; flex-shrink: 0;
  }
  .gsd-header-eyebrow {
    display: inline-block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em;
    background: rgba(168,42,46,0.25); color: #F3C6C7; padding: 3px 10px; border-radius: 20px;
    margin-bottom: 10px; font-weight: 600;
  }
  .gsd-header h1 { font-size: 24px; font-weight: 700; margin: 0 0 6px 0; letter-spacing: -0.2px; }
  .gsd-header p { color: #C4CCDA; font-size: 13px; margin: 0; }

  .gsd-alert-panel {
    display: flex; align-items: center; gap: 16px; border-radius: 10px; padding: 16px 18px;
    border: 1px solid var(--line);
  }
  .gsd-alert-panel--ok { background: var(--ok-bg); border-color: rgba(30,142,90,0.25); }
  .gsd-alert-panel--warn { background: var(--warn-bg); border-color: rgba(180,116,14,0.25); }
  .gsd-alert-title { font-weight: 700; font-size: 15px; margin-bottom: 3px; }
  .gsd-alert-panel--ok .gsd-alert-title { color: var(--ok); }
  .gsd-alert-panel--warn .gsd-alert-title { color: var(--warn); }
  .gsd-alert-text { font-size: 13px; line-height: 1.5; color: var(--ink-700); }

  .gsd-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
  .gsd-stat-card {
    background: var(--surface); border: 1px solid var(--line); border-top: 3px solid var(--brand);
    border-radius: 10px; padding: 18px; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease;
    display: flex; align-items: center; gap: 16px;
  }
  .gsd-stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(15,27,45,0.08); }
  .gsd-stat-card--static { cursor: default; }
  .gsd-stat-card--static:hover { transform: none; box-shadow: none; }
  .gsd-stat-icon-badge {
    width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-size: 24px; flex-shrink: 0;
  }
  .gsd-stat-num {
    font-family:'IBM Plex Mono',SFMono-Regular,Consolas,monospace; font-weight: 700; font-size: 28px; line-height: 1;
  }
  .gsd-stat-label { font-size: 13px; color: var(--ink-500); font-weight: 600; margin-top: 6px; }
  .gsd-stat-hint { font-size: 11px; color: var(--ink-300); margin-top: 3px; }

  .gsd-panel { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 18px; }
  .gsd-panel--flush { padding: 0; overflow: hidden; }
  .gsd-panel-header {
    display: flex; align-items: center; gap: 16px; padding: 16px 18px; background: var(--canvas);
    border-bottom: 1px solid var(--line);
  }
  .gsd-panel-title { font-size: 16px; font-weight: 700; color: var(--ink-700); margin: 0; }

  .gsd-tabs { display: flex; border-bottom: 1px solid var(--line); background: var(--surface); }
  .gsd-tab {
    padding: 14px 20px; border: none; background: none; cursor: pointer; font-size: 13px; font-weight: 700;
    color: var(--ink-500); border-bottom: 3px solid transparent; transition: color 0.15s ease;
  }
  .gsd-tab.active { color: var(--brand); border-bottom-color: var(--brand); }

  .gsd-empty { text-align: center; padding: 60px 20px; color: var(--ink-500); }
  .gsd-empty-icon { font-size: 44px; margin-bottom: 14px; opacity: 0.6; }
  .gsd-empty h3 { font-size: 20px; font-weight: 700; color: var(--ink-900); margin-bottom: 10px; }
  .gsd-empty p { font-size: 14px; line-height: 1.5; }

  .gsd-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .gsd-table { width: 100%; border-collapse: collapse; min-width: 900px; }
  .gsd-table thead th {
    background: var(--ink-900); color: white; text-transform: uppercase; letter-spacing: 0.03em;
    font-size: 11.5px; font-weight: 700; padding: 11px 10px; text-align: left; white-space: nowrap;
  }
  .gsd-table tbody td { padding: 11px 10px; font-size: 13px; color: var(--ink-700); border-bottom: 1px solid var(--line); }
  .gsd-table tbody tr:nth-child(even) { background: #FAFBFD; }
  .gsd-table tbody tr:hover { background: #F0F3F8; }
  .gsd-table tbody tr.gsd-row--selected { background: var(--info-bg); box-shadow: inset 3px 0 0 var(--info); }
  .gsd-cell--ref {
    font-family:'IBM Plex Mono',SFMono-Regular,Consolas,monospace; font-weight: 600; color: var(--brand-dark);
  }

  .gsd-row--locked {
    background-image: repeating-linear-gradient(135deg, rgba(15,27,45,0.035) 0 6px, transparent 6px 12px);
    box-shadow: inset 3px 0 0 var(--ink-300);
  }

  .gsd-status {
    display: inline-flex; align-items: center; gap: 4px; padding: 4px 9px; border-radius: 20px;
    font-size: 11px; font-weight: 700; white-space: nowrap;
  }
  .gsd-status--ok { background: var(--ok-bg); color: var(--ok); }
  .gsd-status--warn { background: var(--warn-bg); color: var(--warn); }
  .gsd-status--danger { background: var(--danger-bg); color: var(--danger); }
  .gsd-status--info { background: var(--info-bg); color: var(--info); }
  .gsd-status--purple { background: #F1ECF9; color: #6E4A9E; }
  .gsd-status--neutral { background: var(--canvas); color: var(--ink-500); }

  .gsd-tag {
    display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 20px; font-size: 10px; font-weight: 700;
  }
  .gsd-tag--ok { background: var(--ok); color: white; }
  .gsd-tag--neutral { background: #99A3B0; color: white; }
  .gsd-tag-row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }

  .gsd-btn {
    border: none; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer;
    padding: 8px 14px; transition: transform 0.1s ease, opacity 0.15s ease, background 0.15s ease;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .gsd-btn:not(:disabled):hover { transform: translateY(-1px); }
  .gsd-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .gsd-btn--brand { background: var(--brand); color: white; }
  .gsd-btn--brand:not(:disabled):hover { background: var(--brand-dark); }
  .gsd-btn--info { background: var(--info); color: white; }
  .gsd-btn--danger { background: var(--danger); color: white; }
  .gsd-btn--neutral { background: var(--surface); color: var(--ink-700); border: 1px solid var(--line); }
  .gsd-btn--sm { padding: 4px 9px; font-size: 11px; }

  .gsd-assign-panel { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 20px; }
  .gsd-assign-title { font-size: 17px; font-weight: 700; color: var(--ink-900); margin-bottom: 18px; }
  .gsd-gestionnaire-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
  .gsd-gestionnaire-card {
    background: var(--canvas); border: 2px solid var(--line); border-radius: 8px; padding: 14px; cursor: pointer;
    text-align: center; transition: border-color 0.15s ease, background 0.15s ease;
  }
  .gsd-gestionnaire-card.selected { border-color: var(--info); background: var(--info-bg); }
  .gsd-gestionnaire-card .avatar { font-size: 28px; margin-bottom: 8px; }
  .gsd-gestionnaire-card .name { font-weight: 700; font-size: 14px; margin-bottom: 6px; color: var(--ink-900); }
  .gsd-gestionnaire-card .load { font-size: 12px; color: var(--ink-500); }
  .gsd-progress-track { width: 100%; height: 5px; border-radius: 4px; background: var(--line); margin-top: 8px; overflow: hidden; }
  .gsd-progress-fill { height: 100%; }

  .gsd-perf-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
  .gsd-perf-card { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 18px; text-align: center; }
  .gsd-perf-num {
    font-family:'IBM Plex Mono',SFMono-Regular,Consolas,monospace; font-weight: 700; font-size: 28px; margin-bottom: 6px;
  }
  .gsd-perf-label { font-size: 13px; font-weight: 700; }

  .gsd-overlay {
    position: fixed; inset: 0; background: rgba(15,27,45,0.55); display: flex; align-items: center;
    justify-content: center; z-index: 1000;
  }
  .gsd-modal {
    background: var(--surface); border-radius: 10px; width: 90%; box-shadow: 0 20px 40px rgba(15,27,45,0.3);
    display: flex; flex-direction: column;
  }
  .gsd-modal--sm { max-width: 500px; }
  .gsd-modal--lg { max-width: 1000px; max-height: 80vh; overflow: hidden; }
  .gsd-modal--xl { max-width: 1200px; max-height: 80vh; overflow: hidden; }
  .gsd-modal-header {
    padding: 18px 22px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between;
    align-items: center; background: var(--canvas);
  }
  .gsd-modal-body { padding: 18px 22px; overflow-y: auto; }
  .gsd-modal-title { margin: 0; font-size: 18px; font-weight: 700; color: var(--ink-900); }
  .gsd-modal-sub { color: var(--ink-500); font-size: 13px; margin: 4px 0 0 0; }

  .gsd-status-choice {
    display: flex; align-items: center; padding: 14px; border: 2px solid var(--line); border-radius: 8px;
    background: var(--surface); cursor: pointer; transition: all 0.15s ease; font-size: 15px; font-weight: 600;
    width: 100%; text-align: left;
  }
`;

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

  const isBordereauLocked = (bordereau: any) => bordereau?.statut === 'VIREMENT_EXECUTE';

  const handleBordereauSelect = (bordereauId: string) => {
    const bordereau = [...unassignedBordereaux, ...teamBordereaux, ...userBordereaux].find(item => item.id === bordereauId);
    if (isBordereauLocked(bordereau)) return;

    if (selectedBordereaux.includes(bordereauId)) {
      setSelectedBordereaux(selectedBordereaux.filter(id => id !== bordereauId));
    } else {
      setSelectedBordereaux([...selectedBordereaux, bordereauId]);
    }
  };

  const handleAssignBordereaux = async () => {
    if (!selectedGestionnaire || selectedBordereaux.length === 0) return;

    const hasLockedSelection = selectedBordereaux.some((id) => {
      const bordereau = [...unassignedBordereaux, ...teamBordereaux, ...userBordereaux].find(item => item.id === id);
      return isBordereauLocked(bordereau);
    });

    if (hasLockedSelection) {
      alert('Impossible de modifier un bordereau déjà en statut "Virement Exécuté".');
      return;
    }

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
    if (isBordereauLocked(bordereau)) {
      return;
    }
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

  const dureeTraitementBadge = (bordereau: any) => {
    const dt = getDureeTraitement(bordereau);
    if (dt.days === null || dt.days === undefined) {
      return <span className="gsd-tag gsd-tag--neutral">En cours</span>;
    }
    return (
      <span className={`gsd-status ${dt.isOnTime ? 'gsd-status--ok' : 'gsd-status--danger'}`}>
        {dt.days} jour{dt.days !== 1 ? 's' : ''}
      </span>
    );
  };

  const dureeReglementBadge = (bordereau: any) => {
    if (bordereau.statut === 'VIREMENT_EXECUTE' || bordereau.statut === 'CLOTURE' || bordereau.statut === 'PAYE') {
      const days = getDureeReglement(bordereau).days;
      return <span className="gsd-status gsd-status--ok">✓ Réglé ({days || 0}j)</span>;
    }
    const dr = getDureeReglement(bordereau);
    if (dr.days === null || dr.days === undefined) {
      return <span className="gsd-tag gsd-tag--neutral">En attente</span>;
    }
    return (
      <span className={`gsd-status ${dr.isOnTime ? 'gsd-status--ok' : 'gsd-status--danger'}`}>
        {dr.days} jour{dr.days !== 1 ? 's' : ''}
      </span>
    );
  };

  return (
    <div className="gsd-root">
      <style>{REGISTRE_STYLES}</style>
      <div className="gsd-wrap">
        {/* Header */}
        <div className="gsd-header">
          <div className="gsd-header-icon">👨‍💼</div>
          <div>
            <span className="gsd-header-eyebrow">{isGestionnaire ? 'Accès Gestionnaire' : "Accès Chef d'Équipe"}</span>
            <h1>{isGestionnaire ? 'Gestionnaire' : "Chef d'Équipe"}</h1>
            <p>
              {isGestionnaire
                ? 'Accès en lecture seule avec modification des dossiers assignés'
                : 'Gestion et supervision de votre équipe et contrats assignés'}
            </p>
          </div>
        </div>

        <div className={`gsd-alert-panel ${isGestionnaire ? 'gsd-alert-panel--warn' : 'gsd-alert-panel--ok'}`}>
          <span style={{ fontSize: '22px' }}>✅</span>
          <div>
            <div className="gsd-alert-title">{isGestionnaire ? 'Accès Gestionnaire' : "Accès Chef d'Équipe"}</div>
            <div className="gsd-alert-text">
              {isGestionnaire
                ? 'Vous avez une visibilité sur tous les dossiers du bordereau, mais vous ne pouvez changer le statut/état que des dossiers qui vous sont personnellement affectés'
                : 'Vous gérez uniquement les bordereaux des contrats qui vous sont assignés et supervisez vos gestionnaires'}
            </div>
          </div>
        </div>

        {/* Quick Stats - Gestionnaire Only */}
        {isGestionnaire && (
          <div className="gsd-stats-grid">
            <div className="gsd-stat-card" onClick={() => openStatsModal('en-cours')}>
              <div className="gsd-stat-icon-badge" style={{ background: 'var(--info-bg)' }}>⏳</div>
              <div>
                <div className="gsd-stat-num" style={{ color: 'var(--info)' }}>
                  {userBordereaux.filter(b => ['EN_COURS', 'ASSIGNE'].includes(b.statut)).length}
                </div>
                <div className="gsd-stat-label">En cours</div>
                <div className="gsd-stat-hint">Cliquer pour voir</div>
              </div>
            </div>
            <div className="gsd-stat-card" onClick={() => openStatsModal('traites')}>
              <div className="gsd-stat-icon-badge" style={{ background: 'var(--ok-bg)' }}>✅</div>
              <div>
                <div className="gsd-stat-num" style={{ color: 'var(--ok)' }}>
                  {userBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length}
                </div>
                <div className="gsd-stat-label">Traités</div>
                <div className="gsd-stat-hint">Cliquer pour voir</div>
              </div>
            </div>
            <div className="gsd-stat-card" onClick={() => openStatsModal('retournes')}>
              <div className="gsd-stat-icon-badge" style={{ background: 'var(--danger-bg)' }}>↩️</div>
              <div>
                <div className="gsd-stat-num" style={{ color: 'var(--danger)' }}>
                  {userBordereaux.filter(b => b.statut === 'RETOURNE' || b.statut === 'REJETE').length}
                </div>
                <div className="gsd-stat-label">Retournés</div>
                <div className="gsd-stat-hint">Cliquer pour voir</div>
              </div>
            </div>
          </div>
        )}

        {/* Chef d'équipe stats - WITH POPUP */}
        {!isGestionnaire && (
          <div className="gsd-stats-grid">
            <div className="gsd-stat-card" onClick={() => openStatsModal('non-affectes')}>
              <div className="gsd-stat-icon-badge" style={{ background: 'var(--warn-bg)' }}>📋</div>
              <div>
                <div className="gsd-stat-num" style={{ color: 'var(--warn)' }}>{unassignedBordereaux.length}</div>
                <div className="gsd-stat-label">Non affectés</div>
                <div className="gsd-stat-hint">Cliquer pour voir</div>
              </div>
            </div>
            <div className="gsd-stat-card" onClick={() => openStatsModal('en-cours')}>
              <div className="gsd-stat-icon-badge" style={{ background: 'var(--info-bg)' }}>⏳</div>
              <div>
                <div className="gsd-stat-num" style={{ color: 'var(--info)' }}>
                  {teamBordereaux.filter(b => ['EN_COURS', 'ASSIGNE'].includes(b.statut)).length}
                </div>
                <div className="gsd-stat-label">En cours</div>
                <div className="gsd-stat-hint">Cliquer pour voir</div>
              </div>
            </div>
            <div className="gsd-stat-card" onClick={() => openStatsModal('traites')}>
              <div className="gsd-stat-icon-badge" style={{ background: 'var(--ok-bg)' }}>✅</div>
              <div>
                <div className="gsd-stat-num" style={{ color: 'var(--ok)' }}>
                  {teamBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length}
                </div>
                <div className="gsd-stat-label">Traités</div>
                <div className="gsd-stat-hint">Cliquer pour voir</div>
              </div>
            </div>
            <div className="gsd-stat-card gsd-stat-card--static">
              <div className="gsd-stat-icon-badge" style={{ background: '#F1ECF9' }}>👥</div>
              <div>
                <div className="gsd-stat-num" style={{ color: '#6E4A9E' }}>{gestionnaires.length}</div>
                <div className="gsd-stat-label">Gestionnaires</div>
              </div>
            </div>
          </div>
        )}

        {/* Corbeille Globale - COMMENTED OUT (unchanged: still gated behind `false`) */}
        {false && !isGestionnaire && (
          <div className="gsd-panel gsd-panel--flush">
            <div className="gsd-panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="gsd-header-icon" style={{ width: '44px', height: '44px', fontSize: '20px', background: 'var(--canvas)' }}>📥</div>
                <div>
                  <h2 className="gsd-panel-title" style={{ fontSize: '18px' }}>Corbeille Globale</h2>
                  <p className="gsd-modal-sub">Gestion et affectation des dossiers</p>
                </div>
              </div>
            </div>

            <div className="gsd-tabs">
              <button className={`gsd-tab ${activeTab === 'non-affectes' ? 'active' : ''}`} onClick={() => setActiveTab('non-affectes')}>
                Non affectés ({unassignedBordereaux.length})
              </button>
              <button className={`gsd-tab ${activeTab === 'en-cours' ? 'active' : ''}`} onClick={() => setActiveTab('en-cours')}>
                En cours ({teamBordereaux.filter(b => ['EN_COURS', 'ASSIGNE'].includes(b.statut)).length})
              </button>
              <button className={`gsd-tab ${activeTab === 'traites' ? 'active' : ''}`} onClick={() => setActiveTab('traites')}>
                Traités ({teamBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length})
              </button>
            </div>

            {loading ? (
              <div className="gsd-empty">
                <div className="gsd-empty-icon">⏳</div>
                <p>Chargement des dossiers...</p>
              </div>
            ) : tabData.length === 0 ? (
              <div className="gsd-empty">
                <div className="gsd-empty-icon">📋</div>
                <h3>Aucun dossier {activeTab === 'non-affectes' ? 'non affecté' : activeTab === 'en-cours' ? 'en cours' : 'traité'}</h3>
                <p>
                  {activeTab === 'non-affectes'
                    ? 'Tous les dossiers ont été affectés à vos gestionnaires.'
                    : activeTab === 'en-cours'
                    ? 'Aucun dossier n\'est actuellement en cours de traitement.'
                    : 'Aucun dossier n\'a encore été traité par votre équipe.'}
                </p>
              </div>
            ) : (
              <>
                <div style={{ padding: '18px' }}>
                  <div className="gsd-panel gsd-panel--flush">
                    <div className="gsd-panel-header">
                      <h3 className="gsd-panel-title" style={{ fontSize: '15px' }}>📋 Tableau de Bord Chef d'Équipe</h3>
                    </div>
                    <div className="gsd-table-scroll">
                      <table className="gsd-table">
                        <thead>
                          <tr>
                            {activeTab === 'non-affectes' && !isGestionnaire && <th>Sélection</th>}
                            <th>Client / Prestataire</th>
                            <th>Référence Bordereau</th>
                            <th>Date réception BO</th>
                            <th>Bulletin de soins</th>
                            <th>Date fin de Scannérisation</th>
                            <th>Délais contractuels de règlement</th>
                            <th>Durée de traitement</th>
                            <th>Durée de règlement</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tabData.map((bordereau) => {
                            const isAssignedToMe = bordereau.assignedToUserId === user?.id;
                            const isSelected = selectedBordereaux.includes(bordereau.id);
                            const locked = bordereau.statut === 'VIREMENT_EXECUTE';
                            return (
                              <tr
                                key={bordereau.id}
                                className={`${isSelected ? 'gsd-row--selected' : ''} ${locked ? 'gsd-row--locked' : ''}`}
                                style={{
                                  cursor: activeTab === 'non-affectes' && !isGestionnaire && !locked ? 'pointer' : 'default',
                                  opacity: isGestionnaire && !isAssignedToMe ? 0.6 : 1,
                                }}
                                onClick={() => {
                                  if (activeTab === 'non-affectes' && !isGestionnaire && !locked) {
                                    handleBordereauSelect(bordereau.id);
                                  }
                                }}
                              >
                                {activeTab === 'non-affectes' && !isGestionnaire && (
                                  <td>
                                    <input
                                      type="checkbox"
                                      checked={selectedBordereaux.includes(bordereau.id)}
                                      onChange={() => handleBordereauSelect(bordereau.id)}
                                      style={{ cursor: locked ? 'not-allowed' : 'pointer' }}
                                      disabled={locked}
                                    />
                                  </td>
                                )}
                                <td>{bordereau.client?.name || 'N/A'}</td>
                                <td className="gsd-cell--ref">
                                  <div className="gsd-tag-row">
                                    {bordereau.reference}
                                    {locked && <span className="gsd-tag gsd-tag--neutral">🔒 Verrouillé</span>}
                                    {isGestionnaire && isAssignedToMe && <span className="gsd-tag gsd-tag--ok">💼 ASSIGNÉ</span>}
                                    {isGestionnaire && !isAssignedToMe && <span className="gsd-tag gsd-tag--neutral">🔒 LECTURE</span>}
                                  </div>
                                </td>
                                <td>{bordereau.dateReception ? new Date(bordereau.dateReception).toLocaleDateString('fr-FR') : '-'}</td>
                                <td>
                                  <div className="gsd-tag-row">
                                    <span className="gsd-status gsd-status--info">{bordereau.nombreBS || 0} BS</span>
                                    {bordereau.BulletinSoin && bordereau.BulletinSoin.length > 0 && (
                                      <span style={{ fontSize: '11px', color: 'var(--ink-500)' }}>
                                        ({bordereau.BulletinSoin.filter((bs: any) => bs.etat === 'VALIDATED').length} traités)
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td>{bordereau.dateFinScan ? new Date(bordereau.dateFinScan).toLocaleDateString('fr-FR') : '-'}</td>
                                <td><span className="gsd-status gsd-status--warn">{bordereau.delaiReglement || 0} jours</span></td>
                                <td>{dureeTraitementBadge(bordereau)}</td>
                                <td>{dureeReglementBadge(bordereau)}</td>
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
                    <div className="gsd-assign-panel" style={{ marginTop: '18px' }}>
                      <h3 className="gsd-assign-title">
                        Affecter {selectedBordereaux.length} dossier(s) sélectionné(s)
                      </h3>

                      <div className="gsd-gestionnaire-grid">
                        {gestionnaires.map(gestionnaire => (
                          <div
                            key={gestionnaire.id}
                            className={`gsd-gestionnaire-card ${selectedGestionnaire === gestionnaire.id ? 'selected' : ''}`}
                            onClick={() => setSelectedGestionnaire(gestionnaire.id)}
                          >
                            <div className="avatar">👤</div>
                            <div className="name">{gestionnaire.fullName}</div>
                            <div className="load">Charge: {gestionnaire.workload}/{gestionnaire.capacity}</div>
                            <div className="gsd-progress-track">
                              <div
                                className="gsd-progress-fill"
                                style={{
                                  width: `${Math.min((gestionnaire.workload / gestionnaire.capacity) * 100, 100)}%`,
                                  background: gestionnaire.workload >= gestionnaire.capacity ? 'var(--danger)' : 'var(--ok)',
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ marginTop: '20px', textAlign: 'center' }}>
                        <button
                          className="gsd-btn gsd-btn--brand"
                          onClick={handleAssignBordereaux}
                          disabled={!selectedGestionnaire || selectedBordereaux.some((id) => {
                            const bordereau = [...unassignedBordereaux, ...teamBordereaux, ...userBordereaux].find(item => item.id === id);
                            return isBordereauLocked(bordereau);
                          })}
                        >
                          Affecter les dossiers
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Performance Section */}
        <div className="gsd-panel">
          <div className="gsd-panel-header" style={{ margin: '-18px -18px 18px -18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div className="gsd-header-icon" style={{ width: '44px', height: '44px', fontSize: '20px', background: 'var(--surface)', border: '1px solid var(--line)' }}>📊</div>
              <div>
                <h2 className="gsd-panel-title" style={{ fontSize: '18px' }}>
                  {isGestionnaire ? 'Performance Gestionnaire' : "Performance de l'Équipe"}
                </h2>
                <p className="gsd-modal-sub">Suivi et analyse des performances</p>
              </div>
            </div>
          </div>
          <div className="gsd-perf-grid">
            {isGestionnaire ? (
              <>
                <div className="gsd-perf-card">
                  <div className="gsd-perf-num" style={{ color: 'var(--info)' }}>{userBordereaux.length}</div>
                  <div className="gsd-perf-label" style={{ color: 'var(--info)' }}>Total bordereaux gestionnaire</div>
                </div>
                <div className="gsd-perf-card">
                  <div className="gsd-perf-num" style={{ color: 'var(--ok)' }}>
                    {userBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length}
                  </div>
                  <div className="gsd-perf-label" style={{ color: 'var(--ok)' }}>bordereaux traités par le gestionnaire</div>
                </div>
                <div className="gsd-perf-card">
                  <div className="gsd-perf-num" style={{ color: 'var(--warn)' }}>
                    {Math.round((userBordereaux.length / 20) * 100) || 0}%
                  </div>
                  <div className="gsd-perf-label" style={{ color: 'var(--warn)' }}>Charge moyenne du gestionnaire</div>
                </div>
                <div className="gsd-perf-card">
                  <div className="gsd-perf-num" style={{ color: 'var(--brand)' }}>
                    {userBordereaux.length > 0 ? Math.round((userBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length / userBordereaux.length) * 100) : 0}%
                  </div>
                  <div className="gsd-perf-label" style={{ color: 'var(--brand)' }}>Taux de réussite du gestionnaire</div>
                </div>
              </>
            ) : (
              <>
                <div className="gsd-perf-card">
                  <div className="gsd-perf-num" style={{ color: 'var(--info)' }}>{unassignedBordereaux.length + teamBordereaux.length}</div>
                  <div className="gsd-perf-label" style={{ color: 'var(--info)' }}>Total bordereaux équipe</div>
                </div>
                <div className="gsd-perf-card">
                  <div className="gsd-perf-num" style={{ color: 'var(--ok)' }}>
                    {teamBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length}
                  </div>
                  <div className="gsd-perf-label" style={{ color: 'var(--ok)' }}>bordereaux traités</div>
                </div>
                <div className="gsd-perf-card">
                  <div className="gsd-perf-num" style={{ color: 'var(--warn)' }}>
                    {Math.round(gestionnaires.reduce((acc, g) => acc + (g.workload / g.capacity), 0) / gestionnaires.length * 100) || 0}%
                  </div>
                  <div className="gsd-perf-label" style={{ color: 'var(--warn)' }}>Charge moyenne équipe</div>
                </div>
                <div className="gsd-perf-card">
                  <div className="gsd-perf-num" style={{ color: 'var(--brand)' }}>
                    {(unassignedBordereaux.length + teamBordereaux.length) > 0 ? Math.round((teamBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length / (unassignedBordereaux.length + teamBordereaux.length)) * 100) : 0}%
                  </div>
                  <div className="gsd-perf-label" style={{ color: 'var(--brand)' }}>Taux de réussite</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && selectedBordereau && (
        <div className="gsd-overlay">
          <div className="gsd-modal gsd-modal--sm">
            <div style={{ padding: '26px 26px 0 26px' }}>
              <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink-900)', marginBottom: '8px' }}>
                  Modifier le Statut
                </h2>
                <p style={{ color: 'var(--ink-500)', fontSize: '14px' }}>
                  Bordereau: <strong style={{ color: 'var(--ink-900)' }}>{selectedBordereau.reference}</strong>
                </p>
                <p style={{ color: 'var(--ink-500)', fontSize: '13px' }}>
                  Statut actuel: <span className="gsd-status gsd-status--info">{selectedBordereau.statut}</span>
                </p>
              </div>

              <div style={{ marginBottom: '22px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', color: 'var(--ink-900)' }}>
                  Choisir le nouveau statut:
                </h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {(isGestionnaire ? [
                    { key: 'TRAITE', label: 'Traité', color: '#1E8E5A', icon: '✅' },
                    { key: 'EN_DIFFICULTE', label: 'En difficulté', color: '#B4740E', icon: '⚠️' },
                    { key: 'REJETE', label: 'Rejeté', color: '#B3272D', icon: '❌' }
                  ] : [
                    { key: 'TRAITE', label: 'Traité', color: '#1E8E5A', icon: '✅' },
                    { key: 'EN_DIFFICULTE', label: 'En difficulté', color: '#B4740E', icon: '⚠️' },
                    { key: 'REJETE', label: 'Rejeté', color: '#B3272D', icon: '❌' },
                    { key: 'ASSIGNE', label: 'Assigné', color: '#2A5DA8', icon: '📋' },
                    { key: 'EN_COURS', label: 'En cours', color: '#6E4A9E', icon: '⏳' }
                  ]).map(status => (
                    <button
                      key={status.key}
                      className="gsd-status-choice"
                      disabled={selectedBordereau?.statut === 'VIREMENT_EXECUTE'}
                      style={{
                        opacity: selectedBordereau?.statut === 'VIREMENT_EXECUTE' ? 0.45 : 1,
                        cursor: selectedBordereau?.statut === 'VIREMENT_EXECUTE' ? 'not-allowed' : 'pointer',
                        pointerEvents: selectedBordereau?.statut === 'VIREMENT_EXECUTE' ? 'none' : 'auto'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedBordereau?.statut === 'VIREMENT_EXECUTE') return;
                        e.currentTarget.style.borderColor = status.color;
                        e.currentTarget.style.backgroundColor = status.color + '10';
                      }}
                      onMouseLeave={(e) => {
                        if (selectedBordereau?.statut === 'VIREMENT_EXECUTE') return;
                        e.currentTarget.style.borderColor = 'var(--line)';
                        e.currentTarget.style.backgroundColor = 'var(--surface)';
                      }}
                      onClick={() => handleGestionnaireStatusChange(selectedBordereau.id, status.key)}
                    >
                      <span style={{ fontSize: '22px', marginRight: '12px' }}>{status.icon}</span>
                      <span style={{ color: status.color, fontWeight: 700 }}>{status.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 26px 26px 26px', borderTop: '1px solid var(--line)' }}>
              <button className="gsd-btn gsd-btn--neutral" onClick={() => setShowStatusModal(false)}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal for Gestionnaire */}
      {showStatsModal && isGestionnaire && (
        <div className="gsd-overlay">
          <div className="gsd-modal gsd-modal--lg">
            <div className="gsd-modal-header">
              <div>
                <h2 className="gsd-modal-title">
                  {statsModalType === 'en-cours' ? '⏳ Dossiers En Cours' :
                   statsModalType === 'traites' ? '✅ Dossiers Traités' :
                   '↩️ Dossiers Retournés'}
                </h2>
                <p className="gsd-modal-sub">{statsModalData.length} dossier(s) trouvé(s)</p>
              </div>
              <button className="gsd-btn gsd-btn--danger" onClick={() => setShowStatsModal(false)}>
                Fermer
              </button>
            </div>

            <div className="gsd-modal-body">
              {statsModalData.length === 0 ? (
                <div className="gsd-empty">
                  <div className="gsd-empty-icon">
                    {statsModalType === 'en-cours' ? '⏳' : statsModalType === 'traites' ? '✅' : '↩️'}
                  </div>
                  <h3>Aucun dossier</h3>
                  <p>Aucun dossier {statsModalType === 'en-cours' ? 'en cours' : statsModalType === 'traites' ? 'traité' : 'retourné'} pour le moment.</p>
                </div>
              ) : (
                <div className="gsd-table-scroll">
                  <table className="gsd-table">
                    <thead>
                      <tr>
                        <th>Référence</th>
                        <th>Client</th>
                        <th>Statut</th>
                        <th>Date Réception</th>
                        <th>Documents</th>
                        <th>Délai</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsModalData.map((bordereau) => {
                        const locked = bordereau.statut === 'VIREMENT_EXECUTE';
                        return (
                          <tr key={bordereau.id} className={locked ? 'gsd-row--locked' : ''}>
                            <td className="gsd-cell--ref">
                              {bordereau.reference}
                              {locked && <span className="gsd-tag gsd-tag--neutral" style={{ marginLeft: '6px' }}>🔒</span>}
                            </td>
                            <td>{bordereau.client?.name || 'Client inconnu'}</td>
                            <td>
                              <span className={`gsd-status ${
                                bordereau.statut === 'TRAITE' || bordereau.statut === 'CLOTURE' ? 'gsd-status--ok' :
                                bordereau.statut === 'RETOURNE' ? 'gsd-status--danger' : 'gsd-status--info'
                              }`}>
                                {bordereau.statut}
                              </span>
                            </td>
                            <td>{new Date(bordereau.dateReception).toLocaleDateString('fr-FR')}</td>
                            <td><span className="gsd-status gsd-status--info">{bordereau.documentsCount || bordereau.nombreBS || 0} BS</span></td>
                            <td><span className="gsd-status gsd-status--warn">{bordereau.delaiReglement || 30}j</span></td>
                            <td>
                              <button
                                className="gsd-btn gsd-btn--info gsd-btn--sm"
                                onClick={() => {
                                  if (isBordereauLocked(bordereau)) return;
                                  setSelectedBordereau(bordereau);
                                  setShowStatusModal(true);
                                  setShowStatsModal(false);
                                }}
                                disabled={isBordereauLocked(bordereau)}
                                style={{ opacity: isBordereauLocked(bordereau) ? 0.45 : 1, cursor: isBordereauLocked(bordereau) ? 'not-allowed' : 'pointer' }}
                              >
                                ✏️ Modifier
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

      {/* Stats Modal */}
      {showStatsModal && (
        <div className="gsd-overlay">
          <div className="gsd-modal gsd-modal--xl">
            <div className="gsd-modal-header">
              <h2 className="gsd-modal-title">
                Dossiers {statsModalType === 'non-affectes' ? 'Non Affectés' : statsModalType === 'en-cours' ? 'En Cours' : statsModalType === 'traites' ? 'Traités' : 'Retournés'} ({statsModalData.length})
              </h2>
              <button className="gsd-btn gsd-btn--danger" onClick={() => setShowStatsModal(false)}>
                Fermer
              </button>
            </div>

            <div className="gsd-modal-body">
              {statsModalData.length === 0 ? (
                <div className="gsd-empty">
                  <div className="gsd-empty-icon">📋</div>
                  <p>Aucun dossier {statsModalType === 'non-affectes' ? 'non affecté' : statsModalType === 'en-cours' ? 'en cours' : statsModalType === 'traites' ? 'traité' : 'retourné'}</p>
                </div>
              ) : (
                <div className="gsd-table-scroll">
                  <table className="gsd-table">
                    <thead>
                      <tr>
                        <th>Référence</th>
                        <th>Client</th>
                        <th>Statut</th>
                        <th>Date Réception</th>
                        <th>Documents</th>
                        <th>Délai</th>
                        <th>Durée Traitement</th>
                        {statsModalData.some(b => b.statut === 'VIREMENT_EXECUTE') && <th>Date Traitement Virement</th>}
                        <th>Durée Règlement</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsModalData.map((bordereau) => {
                        const dr = getDureeReglement(bordereau);
                        const isVirementExecute = bordereau.statut === 'VIREMENT_EXECUTE';
                        const dateTraitementVirement = bordereau.dateExecutionVirement || bordereau.virement?.dateExecution;
                        return (
                          <tr key={bordereau.id} className={isVirementExecute ? 'gsd-row--locked' : ''}>
                            <td className="gsd-cell--ref">
                              {bordereau.reference}
                              {isVirementExecute && <span className="gsd-tag gsd-tag--neutral" style={{ marginLeft: '6px' }}>🔒</span>}
                            </td>
                            <td>{bordereau.client?.name || 'N/A'}</td>
                            <td>
                              <span className={`gsd-status ${
                                bordereau.statut === 'VIREMENT_EXECUTE' ? 'gsd-status--purple' :
                                bordereau.statut === 'TRAITE' || bordereau.statut === 'CLOTURE' ? 'gsd-status--ok' :
                                bordereau.statut === 'RETOURNE' ? 'gsd-status--danger' : 'gsd-status--info'
                              }`}>
                                {bordereau.statut}
                              </span>
                            </td>
                            <td>{bordereau.dateReception ? new Date(bordereau.dateReception).toLocaleDateString('fr-FR') : '-'}</td>
                            <td><span className="gsd-status gsd-status--info">{bordereau.nombreBS || 0} BS</span></td>
                            <td><span className="gsd-status gsd-status--warn">{bordereau.delaiReglement || 30} jours</span></td>
                            <td>{dureeTraitementBadge(bordereau)}</td>
                            {statsModalData.some(b => b.statut === 'VIREMENT_EXECUTE') && (
                              <td>
                                {isVirementExecute && dateTraitementVirement ? (
                                  <span className="gsd-status gsd-status--purple">{new Date(dateTraitementVirement).toLocaleDateString('fr-FR')}</span>
                                ) : (
                                  <span className="gsd-tag gsd-tag--neutral">-</span>
                                )}
                              </td>
                            )}
                            <td>{dureeReglementBadge(bordereau)}</td>
                            <td>
                              <button
                                className="gsd-btn gsd-btn--info gsd-btn--sm"
                                onClick={() => {
                                  if (isBordereauLocked(bordereau)) return;
                                  setSelectedBordereau(bordereau);
                                  setShowStatsModal(false);
                                  setShowStatusModal(true);
                                }}
                                disabled={isBordereauLocked(bordereau)}
                                style={{ opacity: isBordereauLocked(bordereau) ? 0.45 : 1, cursor: isBordereauLocked(bordereau) ? 'not-allowed' : 'pointer' }}
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