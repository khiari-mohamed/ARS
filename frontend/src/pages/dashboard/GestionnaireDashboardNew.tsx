import { useEffect, useState, useMemo } from "react";
import { useAuth } from '../../contexts/AuthContext';
import { LocalAPI } from '../../services/axios';
import "../../styles/chef-equipe.css";
import BSAIPage from '../bs/BSAIPage';

interface DossierStats {
  prestation: { total: number; breakdown: { [key: string]: number }; };
  adhesion: { total: number; breakdown: { [key: string]: number }; };
  complement: { total: number; breakdown: { [key: string]: number }; };
  resiliation: { total: number; breakdown: { [key: string]: number }; };
  reclamation: { total: number; breakdown: { [key: string]: number }; };
  avenant: { total: number; breakdown: { [key: string]: number }; };
}

interface GestionnaireAssignment {
  gestionnaire: string;
  totalAssigned: number;
  documentsAssigned?: number;
  bordereauxAssigned?: number;
  documentsReturned?: number;
  traites?: number;
  enCours?: number;
  retournes?: number;
  returnedBy?: string | null;
  documentsByType: { [key: string]: number };
  bordereauxByType?: { [key: string]: number };
}

interface Dossier {
  id: string;
  reference: string;
  nom?: string;
  societe?: string;
  client?: string;
  clientName?: string;
  type?: string;
  statut?: string;
  date?: string;
  gestionnaire?: string;
  completionPercentage?: number;
  dossierStates?: string[];
  statusModifiedByGestionnaire?: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// "Registre" design tokens — inline CSS overrides applied throughout.
// Logic, state, handlers, effects, and component structure are unchanged.
// ────────────────────────────────────────────────────────────────────────────
const T = {
  ink900: '#0F1B2D',
  ink700: '#24344A',
  ink500: '#5B6B82',
  ink300: '#9AA7B8',
  line: '#E2E6EC',
  surface: '#FFFFFF',
  canvas: '#F3F5F9',
  brand: '#A82A2E',
  brandDark: '#7E1F22',
  ok: '#1E8E5A',
  okBg: '#E7F5EE',
  warn: '#B4740E',
  warnBg: '#FBF1DF',
  danger: '#B3272D',
  dangerBg: '#FBEAEA',
  info: '#2A5DA8',
  infoBg: '#E9F0FA',
  purple: '#6E4A9E',
  purpleBg: '#F1ECF9',
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'IBM Plex Mono', SFMono-Regular, Consolas, monospace",
};

const panelStyle: React.CSSProperties = {
  background: T.surface,
  borderRadius: 10,
  border: `1px solid ${T.line}`,
  padding: 18,
};

const inputStyle: React.CSSProperties = {
  padding: '7px 9px',
  border: `1px solid ${T.line}`,
  borderRadius: 6,
  fontSize: 13,
  fontFamily: T.sans,
  color: T.ink900,
  background: T.surface,
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '11px 10px',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  color: T.ink500,
  fontFamily: T.sans,
};

const thBrandStyle: React.CSSProperties = {
  padding: '11px 10px',
  textAlign: 'left',
  fontSize: 11.5,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  fontFamily: T.sans,
  color: T.surface,
};

const tdStyle: React.CSSProperties = {
  padding: '11px 10px',
  fontSize: 13,
  fontFamily: T.sans,
  color: T.ink900,
};

const refCellStyle: React.CSSProperties = {
  ...tdStyle,
  fontFamily: T.mono,
  fontWeight: 600,
  color: T.info,
};

function statusPillStyle(bg: string, fg: string): React.CSSProperties {
  return {
    background: bg,
    color: fg,
    padding: '4px 9px',
    borderRadius: 20,
    fontSize: 11.5,
    fontWeight: 700,
    fontFamily: T.sans,
    display: 'inline-block',
  };
}

function getSemanticPair(kind: 'ok' | 'warn' | 'danger' | 'info' | 'neutral') {
  switch (kind) {
    case 'ok': return { bg: T.okBg, fg: T.ok };
    case 'warn': return { bg: T.warnBg, fg: T.warn };
    case 'danger': return { bg: T.dangerBg, fg: T.danger };
    case 'neutral': return { bg: T.canvas, fg: T.ink500 };
    default: return { bg: T.infoBg, fg: T.info };
  }
}

function btnStyle(variant: 'brand' | 'info' | 'ok' | 'danger' | 'purple' | 'neutral', disabled?: boolean): React.CSSProperties {
  const map: Record<string, { bg: string; color: string }> = {
    brand: { bg: T.brand, color: '#fff' },
    info: { bg: T.info, color: '#fff' },
    ok: { bg: T.ok, color: '#fff' },
    danger: { bg: T.danger, color: '#fff' },
    purple: { bg: T.purple, color: '#fff' },
    neutral: { bg: T.canvas, color: T.ink700 },
  };
  const c = map[variant];
  return {
    background: c.bg,
    color: c.color,
    border: variant === 'neutral' ? `1px solid ${T.line}` : 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: T.sans,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
  };
}

function linkBtnStyle(color: string, disabled?: boolean): React.CSSProperties {
  return {
    background: 'none',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 12.5,
    fontFamily: T.sans,
    color,
    textDecoration: 'underline',
    opacity: disabled ? 0.4 : 1,
  };
}

function paginationBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '6px 12px',
    border: `1px solid ${T.line}`,
    borderRadius: 6,
    background: disabled ? T.canvas : T.surface,
    color: disabled ? T.ink300 : T.ink700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 12.5,
    fontFamily: T.sans,
    fontWeight: 600,
  };
}

function GestionnaireDashboardNew() {
  const { user } = useAuth();
  
  const getStatusPair = (statut?: string) => {
    switch (statut) {
      case 'À scanner': return getSemanticPair('neutral');
      case 'En cours de Scan': return getSemanticPair('info');
      case 'A_AFFECTER': return getSemanticPair('warn');
      case 'Traité': case 'TRAITE': return getSemanticPair('ok');
      case 'En cours de traitement': case 'EN_COURS': return getSemanticPair('warn');
      case 'En cours': return getSemanticPair('warn');
      case 'Retourné': case 'RETOURNE': return getSemanticPair('danger');
      case 'Nouveau': case 'UPLOADED': return getSemanticPair('info');
      case 'Scanné': case 'SCANNE': return getSemanticPair('info');
      case 'Rejeté': return getSemanticPair('danger');
      default: return getSemanticPair('neutral');
    }
  };
  const [stats, setStats] = useState<DossierStats>({
    prestation: { total: 0, breakdown: {} },
    adhesion: { total: 0, breakdown: {} },
    complement: { total: 0, breakdown: {} },
    resiliation: { total: 0, breakdown: {} },
    reclamation: { total: 0, breakdown: {} },
    avenant: { total: 0, breakdown: {} }
  });
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [documents, setDocuments] = useState<Dossier[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Dossier[]>([]);
  const [filteredDossiers, setFilteredDossiers] = useState<Dossier[]>([]);
  const [selectedDossiers, setSelectedDossiers] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState('Tous');
  const [societeFilter, setSocieteFilter] = useState('Toutes');
  const [statutFilter, setStatutFilter] = useState('Tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [societes, setSocietes] = useState<string[]>([]);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [currentPDFUrl, setCurrentPDFUrl] = useState('');
  const [currentDossier, setCurrentDossier] = useState<any>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [highlightedDocId, setHighlightedDocId] = useState<string | null>(null);
  const [derniersBordereauxPage, setDerniersBordereauxPage] = useState(1);
  const [bordereauxEnCoursPage, setBordereauxEnCoursPage] = useState(1);
  const [dossiersIndividuelsPage, setDossiersIndividuelsPage] = useState(1);
  const [gestionnaireAssignments, setGestionnaireAssignments] = useState<GestionnaireAssignment[]>([]);
  const [gestionnaireFilter, setGestionnaireFilter] = useState('Tous');
  const [availableGestionnaires, setAvailableGestionnaires] = useState<string[]>([]);
  const [reassignedDocs, setReassignedDocs] = useState<any[]>([]);
  const [loadingReassigned, setLoadingReassigned] = useState(false);
  const [reassignedDocsPage, setReassignedDocsPage] = useState(1);
  const REASSIGNED_PAGE_SIZE = 10;

  // Table-specific filters
  const [filterDerniers, setFilterDerniers] = useState({ reference: '', client: '', type: '', statut: '', dateFrom: '', dateTo: '' });
  const [filterBordereaux, setFilterBordereaux] = useState({ reference: '', client: '', statut: '', dateFrom: '', dateTo: '' });
  const [filterDocuments, setFilterDocuments] = useState({ reference: '', bordereauReference: '', client: '', type: '', statut: '', gestionnaire: '', dateFrom: '', dateTo: '' });
  const [filteredDerniersTable, setFilteredDerniersTable] = useState<Dossier[]>([]);
  const [filteredBordereauxTable, setFilteredBordereauxTable] = useState<Dossier[]>([]);
  const [filteredDocumentsTable, setFilteredDocumentsTable] = useState<Dossier[]>([]);
  const uniqueStatuts = useMemo(() => 
    [...new Set([...dossiers, ...documents].map((d: any) => d.statut).filter(Boolean))].sort(),
    [dossiers, documents]
  );
  const uniqueTypes = useMemo(() => 
    [...new Set([...dossiers, ...documents].map((d: any) => d.type).filter(Boolean))].sort(),
    [dossiers, documents]
  );

  useEffect(() => {
    loadDashboardData();
    loadReassignedDocuments();
  }, []);;

  useEffect(() => {
    applyFilters();
  }, [typeFilter, societeFilter, statutFilter, searchQuery, dossiers, documents]);

  // Apply table-specific filters
  useEffect(() => {
    const f1 = dossiers.filter((d: any) => {
      const refMatch = !filterDerniers.reference || String(d.reference || '').trim().toLowerCase().includes(filterDerniers.reference.trim().toLowerCase());
      return refMatch &&
        (!filterDerniers.client || String(d.client || '').trim().toLowerCase().includes(filterDerniers.client.trim().toLowerCase())) &&
        (!filterDerniers.type || d.type === filterDerniers.type) &&
        (!filterDerniers.statut || d.statut === filterDerniers.statut) &&
        (!filterDerniers.dateFrom || new Date(d.date) >= new Date(filterDerniers.dateFrom)) &&
        (!filterDerniers.dateTo || new Date(d.date) <= new Date(filterDerniers.dateTo));
    });
    setFilteredDerniersTable(f1);
    setDerniersBordereauxPage(1);

    const f2 = dossiers.filter((d: any) =>
      (!filterBordereaux.reference || String(d.reference || '').trim().toLowerCase().includes(filterBordereaux.reference.trim().toLowerCase())) &&
      (!filterBordereaux.client || String(d.client || '').trim().toLowerCase().includes(filterBordereaux.client.trim().toLowerCase())) &&
      (!filterBordereaux.statut || d.statut === filterBordereaux.statut) &&
      (!filterBordereaux.dateFrom || new Date(d.date) >= new Date(filterBordereaux.dateFrom)) &&
      (!filterBordereaux.dateTo || new Date(d.date) <= new Date(filterBordereaux.dateTo))
    );
    setFilteredBordereauxTable(f2);
    setBordereauxEnCoursPage(1);

    const f3 = documents.filter((d: any) =>
      (!filterDocuments.reference || String(d.reference || '').trim().toLowerCase().includes(filterDocuments.reference.trim().toLowerCase())) &&
      (!filterDocuments.bordereauReference || String(d.bordereauReference || '').trim().toLowerCase().includes(filterDocuments.bordereauReference.trim().toLowerCase())) &&
      (!filterDocuments.client || String(d.client || '').trim().toLowerCase().includes(filterDocuments.client.trim().toLowerCase())) &&
      (!filterDocuments.type || d.type === filterDocuments.type) &&
      (!filterDocuments.statut || d.statut === filterDocuments.statut) &&
      (!filterDocuments.gestionnaire || (d.gestionnaire && String(d.gestionnaire).trim().toLowerCase().includes(filterDocuments.gestionnaire.trim().toLowerCase()))) &&
      (!filterDocuments.dateFrom || new Date(d.date) >= new Date(filterDocuments.dateFrom)) &&
      (!filterDocuments.dateTo || new Date(d.date) <= new Date(filterDocuments.dateTo))
    );
    setFilteredDocumentsTable(f3);
    setDossiersIndividuelsPage(1);
  }, [filterDerniers, filterBordereaux, filterDocuments, dossiers, documents]);
  
  // useEffect(() => {
  //   console.log('🔍 filteredDocuments updated:', filteredDocuments.length);
  // }, [filteredDocuments]);

  const loadReassignedDocuments = async () => {
    if (!user?.id) return;
    setLoadingReassigned(true);
    try {
      const response = await fetch(`/api/super-admin/gestionnaire/reassigned-documents?userId=${user.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('📄 Reassigned documents response:', data);
        setReassignedDocs(data.documents || []);
        setReassignedDocsPage(1);
      }
    } catch (error) {
      console.error('Error loading reassigned documents:', error);
    } finally {
      setLoadingReassigned(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [statsResponse, dossiersResponse, documentsResponse, assignmentsResponse] = await Promise.all([
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/types-detail'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/derniers-dossiers'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/documents-individuels'),
        LocalAPI.get('/bordereaux/chef-equipe/gestionnaire-assignments-dossiers')
      ]);
      
      if (statsResponse.data) {
        const transformedStats = {
          prestation: {
            total: statsResponse.data.Prestation?.total || 0,
            breakdown: statsResponse.data.Prestation?.clientBreakdown || {},
            gestionnaireBreakdown: statsResponse.data.Prestation?.gestionnaireBreakdown || {}
          },
          adhesion: {
            total: statsResponse.data.Adhésion?.total || 0,
            breakdown: statsResponse.data.Adhésion?.clientBreakdown || {},
            gestionnaireBreakdown: statsResponse.data.Adhésion?.gestionnaireBreakdown || {}
          },
          complement: {
            total: statsResponse.data['Complément Dossier']?.total || 0,
            breakdown: statsResponse.data['Complément Dossier']?.clientBreakdown || {},
            gestionnaireBreakdown: statsResponse.data['Complément Dossier']?.gestionnaireBreakdown || {}
          },
          resiliation: {
            total: 0,
            breakdown: {},
            gestionnaireBreakdown: {}
          },
          reclamation: {
            total: statsResponse.data.Réclamation?.total || 0,
            breakdown: statsResponse.data.Réclamation?.clientBreakdown || {},
            gestionnaireBreakdown: statsResponse.data.Réclamation?.gestionnaireBreakdown || {}
          },
          avenant: {
            total: statsResponse.data.Avenant?.total || 0,
            breakdown: statsResponse.data.Avenant?.clientBreakdown || {},
            gestionnaireBreakdown: statsResponse.data.Avenant?.gestionnaireBreakdown || {}
          }
        };
        setStats(transformedStats);
      }
      
      if (dossiersResponse.data) {
        // derniers-dossiers endpoint returns an array directly (same as chef d'équipe)
        const allDossiers = Array.isArray(dossiersResponse.data) ? dossiersResponse.data : [];
        setDossiers(allDossiers);
        const uniqueSocietes = [...new Set(allDossiers.map((d: Dossier) => d.client).filter(Boolean))] as string[];
        setSocietes(uniqueSocietes.sort());
      }
      
      if (documentsResponse.data) {
        // documents-individuels endpoint returns individual documents
        const allDocuments = Array.isArray(documentsResponse.data) ? documentsResponse.data : [];
        setDocuments(allDocuments);
      }
      
      if (assignmentsResponse.data) {
        setGestionnaireAssignments(assignmentsResponse.data);
        const uniqueGestionnaires = [...new Set(assignmentsResponse.data.map((a: any) => a.gestionnaire))].sort() as string[];
        setAvailableGestionnaires(uniqueGestionnaires);
      }
    } catch (error: any) {
      console.error('❌ Error loading gestionnaire dashboard data:', error);
      setDossiers([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...dossiers];
    
    if (typeFilter !== 'Tous') {
      filtered = filtered.filter(d => d.type === typeFilter);
    }
    
    if (societeFilter !== 'Toutes') {
      filtered = filtered.filter(d => (d.client || d.societe) === societeFilter);
    }
    
    if (statutFilter !== 'Tous') {
      filtered = filtered.filter(d => 
        d.statut === statutFilter || 
        (d.dossierStates && d.dossierStates.includes(statutFilter))
      );
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        d.reference.toLowerCase().includes(query) ||
        ((d.client || d.societe) && (d.client || d.societe)!.toLowerCase().includes(query)) ||
        (d.type && d.type.toLowerCase().includes(query)) ||
        (d.gestionnaire && d.gestionnaire.toLowerCase().includes(query))
      );
    }
    
    setFilteredDossiers(filtered);
    
    // Apply same filters to documents
    let filteredDocs = [...documents];
    
    if (typeFilter !== 'Tous') {
      filteredDocs = filteredDocs.filter(d => d.type === typeFilter);
    }
    
    if (societeFilter !== 'Toutes') {
      filteredDocs = filteredDocs.filter(d => (d.client || d.societe) === societeFilter);
    }
    
    if (statutFilter !== 'Tous') {
      filteredDocs = filteredDocs.filter(d => d.statut === statutFilter);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredDocs = filteredDocs.filter(d => 
        (d.reference && d.reference.toLowerCase().includes(query)) ||
        ((d.client || d.societe) && (d.client || d.societe)!.toLowerCase().includes(query)) ||
        (d.type && d.type.toLowerCase().includes(query)) ||
        (d.gestionnaire && d.gestionnaire.toLowerCase().includes(query)) ||
        (d.statut && d.statut.toLowerCase().includes(query))
      );
    }
    
    setFilteredDocuments(filteredDocs);
  };

  const handleSelectAll = () => {
    if (selectedDossiers.length === filteredDossiers.length) {
      setSelectedDossiers([]);
    } else {
      setSelectedDossiers(filteredDossiers.map(d => d.id));
    }
  };

  const handleSelectDossier = (id: string) => {
    setSelectedDossiers(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    const csvContent = [
      ['Référence', 'Nom', 'Société', 'Type', 'Statut', 'Date'],
      ...filteredDossiers.map(d => [d.reference, d.nom || '', d.client || d.societe || '', d.type, d.statut, d.date])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-gestionnaire-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewPDF = async (dossierId: string) => {
    try {
      // Use chef d'équipe endpoint for PDF access
      const response = await LocalAPI.get(`/bordereaux/chef-equipe/tableau-bord/dossier-pdf/${dossierId}`);
      if (response.data.success && response.data.hasDocument) {
        const dossier = filteredDocuments.find(d => d.id === dossierId) || filteredDossiers.find(d => d.id === dossierId);
        
        const serverBaseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || window.location.origin;
        setCurrentPDFUrl(`${serverBaseUrl}${response.data.pdfUrl}`);
        setCurrentDossier({ ...dossier, isDocument: true });
        setShowPDFModal(true);
      } else {
        alert(response.data.error || 'PDF non disponible pour ce dossier');
      }
    } catch (error) {
      console.error('PDF view error:', error);
      alert('Erreur lors de l\'ouverture du PDF');
    }
  };

  const closePDFModal = () => {
    setShowPDFModal(false);
    setCurrentPDFUrl('');
    setCurrentDossier(null);
  };

  const handleStatusChangeInModal = async (newStatus: string) => {
    if (!currentDossier) return;
    
    try {
      // Use chef d'équipe endpoint for status modification
      const response = await LocalAPI.post('/bordereaux/chef-equipe/tableau-bord/modify-dossier-status', {
        dossierId: currentDossier.id,
        newStatus
      });
      
      if (response.data.success) {
        alert('Statut modifié avec succès');
        loadDashboardData();
        closePDFModal();
      } else {
        alert('Erreur lors de la modification du statut');
      }
    } catch (error: any) {
      console.error('Status modification error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la modification du statut';
      alert(errorMessage);
    }
  };

  const handleModifyStatus = (dossierId: string) => {
    // First try to find in dossiers (bordereaux)
    let dossier = filteredDossiers.find(d => d.id === dossierId);
    
    // If not found, try to find in documents (individual documents)
    if (!dossier) {
      dossier = filteredDocuments.find(d => d.id === dossierId);
    }
    
    if (dossier) {
      setCurrentDossier(dossier);
      setShowStatusModal(true);
    }
  };

  const handleConfirmStatusChange = async (newStatus: string) => {
    if (!currentDossier) return;
    
    const currentScrollPosition = window.scrollY;
    const docId = currentDossier.id;
    
    try {
      const response = await LocalAPI.post('/bordereaux/chef-equipe/tableau-bord/modify-dossier-status', {
        dossierId: currentDossier.id,
        newStatus
      });
      
      if (response.data.success) {
        setShowStatusModal(false);
        setCurrentDossier(null);
        setSuccessMessage('Statut modifié avec succès');
        setShowSuccessToast(true);
        
        setTimeout(() => setShowSuccessToast(false), 3000);
        
        await loadDashboardData();
        
        setTimeout(() => {
          window.scrollTo(0, currentScrollPosition);
          setHighlightedDocId(docId);
          setTimeout(() => setHighlightedDocId(null), 3000);
        }, 100);
      } else {
        alert('Erreur lors de la modification du statut');
      }
    } catch (error: any) {
      console.error('Status modification error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la modification du statut';
      alert(errorMessage);
    }
  };

  const handleMarkAsTraite = async (bordereauId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir marquer ce bordereau comme Traité ?')) return;
    
    try {
      const response = await LocalAPI.post('/bordereaux/chef-equipe/tableau-bord/modify-dossier-status', {
        dossierId: bordereauId,
        newStatus: 'Traité'
      });
      
      if (response.data.success) {
        alert('Bordereau marqué comme Traité avec succès');
        loadDashboardData();
      } else {
        alert(response.data.message || 'Erreur lors de la modification du statut');
      }
    } catch (error: any) {
      console.error('Mark as traité error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Erreur lors de la modification du statut';
      alert(errorMessage);
    }
  };

  const handleMarkAsRetourne = async (bordereauId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir marquer ce bordereau comme Retourné ?')) return;
    
    try {
      const response = await LocalAPI.post('/bordereaux/chef-equipe/tableau-bord/modify-dossier-status', {
        dossierId: bordereauId,
        newStatus: 'Retourné'
      });
      
      if (response.data.success) {
        alert('Bordereau marqué comme Retourné avec succès');
        loadDashboardData();
      } else {
        alert(response.data.message || 'Erreur lors de la modification du statut');
      }
    } catch (error: any) {
      console.error('Mark as retourné error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Erreur lors de la modification du statut';
      alert(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="chef-equipe-container" style={{ background: T.canvas, minHeight: '100vh', fontFamily: T.sans }}>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px', color: T.ink300 }}>⏳</div>
          <p style={{ color: T.ink500, fontSize: '15px', fontFamily: T.sans }}>Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gsd-root" style={{ fontFamily: T.sans, background: T.canvas, minHeight: '100vh', color: T.ink900 }}>
      {/* Header Bar */}
      <div style={{
        background: `linear-gradient(135deg, ${T.ink900} 0%, #16263D 100%)`,
        borderBottom: `3px solid ${T.brand}`,
        color: 'white',
        padding: '22px 20px',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-block',
          background: 'rgba(168,42,46,0.25)',
          color: '#F7C9CB',
          fontSize: 11,
          fontWeight: 400,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          padding: '3px 10px',
          borderRadius: 20,
          marginBottom: 10
        }}>
          Registre · Gestionnaire
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, fontFamily: T.sans, color: '#FFFFFF' }}>Dashboard Gestionnaire</h1>
        <p style={{ margin: '8px 0 0 0', fontSize: 13, opacity: 0.85, fontFamily: T.sans }}>
          Mes dossiers assignés - {user?.fullName}
        </p>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 20px 60px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Statistics Section (Cards Row) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' }}>
          {/* Prestation Card */}
          <div style={{ ...panelStyle, borderTop: `3px solid ${T.brand}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: T.ink700, fontFamily: T.sans }}>Prestation</h3>
              <span style={{ background: T.ink900, color: 'white', padding: '3px 9px', borderRadius: 20, fontSize: 13, fontWeight: 600, fontFamily: T.mono }}>{stats.prestation?.total || 0}</span>
            </div>
            <div style={{ fontSize: 12, color: T.ink500, fontFamily: T.sans }}>
              <div style={{ fontWeight: 700, marginBottom: '4px', color: T.ink700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Par client:</div>
              {Object.entries(stats.prestation?.breakdown || {}).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                  <span>{key}:</span> <span style={{ fontFamily: T.mono }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Adhésion Card */}
          <div style={{ ...panelStyle, borderTop: `3px solid ${T.brand}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: T.ink700, fontFamily: T.sans }}>Adhésion</h3>
              <span style={{ background: T.ink900, color: 'white', padding: '3px 9px', borderRadius: 20, fontSize: 13, fontWeight: 600, fontFamily: T.mono }}>{stats.adhesion?.total || 0}</span>
            </div>
            {stats.adhesion?.total > 0 && (
              <div style={{ fontSize: 12, color: T.ink500, fontFamily: T.sans }}>
                <div style={{ fontWeight: 700, marginBottom: '4px', color: T.ink700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Par client:</div>
                {Object.entries(stats.adhesion?.breakdown || {}).filter(([key, value]) => value > 0).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                    <span>{key}:</span> <span style={{ fontFamily: T.mono }}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Complément de dossier Card */}
          <div style={{ ...panelStyle, borderTop: `3px solid ${T.info}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: T.ink700, fontFamily: T.sans }}>Complément de dossier</h3>
              <span style={{ background: T.info, color: 'white', padding: '3px 9px', borderRadius: 20, fontSize: 13, fontWeight: 600, fontFamily: T.mono }}>{stats.complement?.total || 0}</span>
            </div>
            {stats.complement?.total > 0 && (
              <div style={{ fontSize: 12, color: T.ink500, fontFamily: T.sans }}>
                <div style={{ fontWeight: 700, marginBottom: '4px', color: T.ink700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Par client:</div>
                {Object.entries(stats.complement?.breakdown || {}).filter(([key, value]) => value > 0).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                    <span>{key}:</span> <span style={{ fontFamily: T.mono }}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Résiliation Card */}
          <div style={{ ...panelStyle, borderTop: `3px solid ${T.brand}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: T.ink700, fontFamily: T.sans }}>Résiliation</h3>
              <span style={{ background: T.ink900, color: 'white', padding: '3px 9px', borderRadius: 20, fontSize: 13, fontWeight: 600, fontFamily: T.mono }}>{stats.resiliation?.total || 0}</span>
            </div>
            {stats.resiliation?.total > 0 && (
              <div style={{ fontSize: 12, color: T.ink500, fontFamily: T.sans }}>
                <div style={{ fontWeight: 700, marginBottom: '4px', color: T.ink700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Par client:</div>
                {Object.entries(stats.resiliation?.breakdown || {}).filter(([key, value]) => value > 0).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                    <span>{key}:</span> <span style={{ fontFamily: T.mono }}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Réclamation Card */}
          <div style={{ ...panelStyle, borderTop: `3px solid ${T.brand}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: T.ink700, fontFamily: T.sans }}>Réclamation</h3>
              <span style={{ background: T.ink900, color: 'white', padding: '3px 9px', borderRadius: 20, fontSize: 13, fontWeight: 600, fontFamily: T.mono }}>{stats.reclamation?.total || 0}</span>
            </div>
            {stats.reclamation?.total > 0 && (
              <div style={{ fontSize: 12, color: T.ink500, fontFamily: T.sans }}>
                <div style={{ fontWeight: 700, marginBottom: '4px', color: T.ink700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Par client:</div>
                {Object.entries(stats.reclamation?.breakdown || {}).filter(([key, value]) => value > 0).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                    <span>{key}:</span> <span style={{ fontFamily: T.mono }}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Avenant Card */}
          <div style={{ ...panelStyle, borderTop: `3px solid ${T.brand}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: T.ink700, fontFamily: T.sans }}>Avenant</h3>
              <span style={{ background: T.ink900, color: 'white', padding: '3px 9px', borderRadius: 20, fontSize: 13, fontWeight: 600, fontFamily: T.mono }}>{stats.avenant?.total || 0}</span>
            </div>
            {stats.avenant?.total > 0 && (
              <div style={{ fontSize: 12, color: T.ink500, fontFamily: T.sans }}>
                <div style={{ fontWeight: 700, marginBottom: '4px', color: T.ink700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Par client:</div>
                {Object.entries(stats.avenant?.breakdown || {}).filter(([key, value]) => value > 0).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                    <span>{key}:</span> <span style={{ fontFamily: T.mono }}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filtres Section */}
        <div style={panelStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.ink700, marginBottom: '6px', fontFamily: T.sans }}>Type de document</label>
              <select 
                value={typeFilter} 
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{ ...inputStyle, width: '100%' }}
              >
                <option value="Tous">Tous</option>
                <option value="Prestation">Prestation</option>
                <option value="Adhésion">Adhésion</option>
                <option value="Complément de dossier">Complément</option>
                <option value="Résiliation">Résiliation</option>
                <option value="Réclamation">Réclamation</option>
                <option value="Avenant">Avenant</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.ink700, marginBottom: '6px', fontFamily: T.sans }}>Société</label>
              <select 
                value={societeFilter} 
                onChange={(e) => setSocieteFilter(e.target.value)}
                style={{ ...inputStyle, width: '100%' }}
              >
                <option value="Toutes">Toutes</option>
                {societes.map(societe => (
                  <option key={societe} value={societe}>{societe}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.ink700, marginBottom: '6px', fontFamily: T.sans }}>Statut</label>
              <select 
                value={statutFilter} 
                onChange={(e) => setStatutFilter(e.target.value)}
                style={{ ...inputStyle, width: '100%' }}
              >
                <option value="Tous">Tous</option>
                <option value="Nouveau">Nouveau</option>
                <option value="En cours">En cours</option>
                <option value="Traité">Traité</option>
                <option value="Retourné">Retourné</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.ink700, marginBottom: '6px', fontFamily: T.sans }}>Recherche</label>
              <input
                type="text"
                placeholder="Référence ou nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ ...inputStyle, width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div style={panelStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button 
              onClick={handleExport}
              style={btnStyle('brand')}
            >
              Exporter
            </button>
            <span style={{ fontSize: 13, color: T.ink500, fontFamily: T.sans }}>
              {selectedDossiers.length > 0 ? `${selectedDossiers.length} dossier(s) sélectionné(s)` : 'Mes dossiers assignés uniquement'}
            </span>
          </div>
        </div>

        {/* Gestionnaire Assignments Section */}
        <div style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: T.ink700, margin: 0, fontFamily: T.sans }}>Mes Affectations</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {gestionnaireAssignments
              .filter(assignment => assignment.gestionnaire === user?.fullName)
              .map((assignment, index) => (
              <div key={index} style={{ background: T.canvas, borderRadius: 8, padding: '12px', border: `1px solid ${T.line}` }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: '8px', color: T.ink700, fontFamily: T.sans }}>
                  {assignment.gestionnaire}
                </div>
                <div style={{ fontSize: 12, color: T.ink500, marginBottom: '6px', fontFamily: T.sans }}>
                  <strong style={{ color: T.ink700 }}>Total affectés:</strong> <span style={{ fontFamily: T.mono }}>{assignment.totalAssigned}</span>
                </div>
                <div style={{ fontSize: 12, marginBottom: '6px', fontFamily: T.sans }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: T.ok }}>✓ Traités:</span>
                    <span style={{ fontWeight: 700, fontFamily: T.mono }}>{assignment.traites || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: T.warn }}>⏳ En cours:</span>
                    <span style={{ fontWeight: 700, fontFamily: T.mono }}>{assignment.enCours || 0}</span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: T.danger }}>↩ Retournés:</span>
                      <span style={{ fontWeight: 700, fontFamily: T.mono }}>{assignment.retournes || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: T.info }}>↻ Réaffectés:</span>
                      <span style={{ fontWeight: 700, color: T.info, fontFamily: T.mono }}>{reassignedDocs.length}</span>
                    </div>
                    {assignment.returnedBy && (assignment.retournes || 0) > 0 && (
                      <div style={{ fontSize: 11, color: T.danger, fontWeight: 700, marginLeft: '16px', marginTop: '2px', fontFamily: T.sans }}>
                        → Retourné par: {assignment.returnedBy}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: T.ink500, fontFamily: T.sans }}>
                  <strong style={{ color: T.ink700 }}>Par type:</strong> {Object.entries(assignment.documentsByType || {}).map(([type, count]) => `${type}: ${count}`).join(', ') || 'Aucun'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Derniers Bordereaux Ajoutés Section */}
        <div style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ color: T.brand, fontSize: 15, marginRight: '8px' }}>📋</span>
              <span style={{ fontWeight: 700, fontSize: 16, color: T.ink700, fontFamily: T.sans }}>Derniers Bordereaux Ajoutés</span>
              <span style={{ ...statusPillStyle(T.okBg, T.ok), marginLeft: '12px', fontSize: 10 }}>En temps réel</span>
            </div>
          </div>
          {/* Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '16px', padding: '12px', background: T.canvas, borderRadius: 8 }}>
            <input type="text" placeholder="Référence" value={filterDerniers.reference} onChange={(e) => setFilterDerniers({...filterDerniers, reference: e.target.value})} style={inputStyle} />
            <input type="text" placeholder="Client" value={filterDerniers.client} onChange={(e) => setFilterDerniers({...filterDerniers, client: e.target.value})} style={inputStyle} />
            <select value={filterDerniers.type} onChange={(e) => setFilterDerniers({...filterDerniers, type: e.target.value})} style={inputStyle}>
              <option value="">Tous types</option>
              {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterDerniers.statut} onChange={(e) => setFilterDerniers({...filterDerniers, statut: e.target.value})} style={inputStyle}>
              <option value="">Tous statuts</option>
              {uniqueStatuts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="date" value={filterDerniers.dateFrom} onChange={(e) => setFilterDerniers({...filterDerniers, dateFrom: e.target.value})} style={inputStyle} />
            <input type="date" value={filterDerniers.dateTo} onChange={(e) => setFilterDerniers({...filterDerniers, dateTo: e.target.value})} style={inputStyle} />
            <button onClick={() => setFilterDerniers({ reference: '', client: '', type: '', statut: '', dateFrom: '', dateTo: '' })} style={btnStyle('danger')}>Effacer</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Ref. Dossier</th>
                  <th style={thStyle}>Client</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Statut</th>
                  <th style={thStyle}>Gestionnaire</th>
                  <th style={thStyle}>% Finalisation</th>
                  <th style={thStyle}>États Dossiers</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDerniersTable.slice((derniersBordereauxPage - 1) * 5, derniersBordereauxPage * 5).map((dossier, index) => {
                  const completionPercentage = dossier.completionPercentage || 0;
                  const dossierStates = dossier.dossierStates || [dossier.statut];
                  const isGestionnaire = user?.role === 'GESTIONNAIRE';
                  const canModify = !isGestionnaire && (dossier.gestionnaire === user?.fullName || user?.role === 'CHEF_EQUIPE' || user?.role === 'SUPER_ADMIN');
                  const statutPair = getSemanticPair('ok');
                  const fillColor = completionPercentage >= 80 ? T.ok : completionPercentage >= 50 ? T.warn : T.danger;
                  return (
                    <tr key={`recent-${dossier.id}`} style={{ borderBottom: `1px solid ${T.line}` }}>
                      <td style={refCellStyle}>{dossier.reference}</td>
                      <td style={tdStyle}>{dossier.client || dossier.societe}</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '7px', height: '7px', background: index % 2 === 0 ? T.ok : T.info, borderRadius: '50%' }}></span>
                          {dossier.type}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={statusPillStyle(statutPair.bg, statutPair.fg)}>{dossier.statut}</span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '22px', height: '22px', background: T.purple, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700, fontFamily: T.sans }}>
                            {(dossier.gestionnaire || user?.fullName || 'N').charAt(0)}
                          </div>
                          {dossier.gestionnaire || user?.fullName || 'Moi'}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '40px', height: '6px', background: T.line, borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${completionPercentage}%`, height: '100%', background: fillColor, transition: 'width 0.3s ease' }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: T.mono, color: T.ink700 }}>{completionPercentage}%</span>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {dossierStates?.filter((state): state is string => Boolean(state)).map((state: string, idx: number) => {
                            const pair = state === 'Traité' ? getSemanticPair('ok') : state === 'En cours' ? getSemanticPair('warn') : getSemanticPair('danger');
                            return (
                              <span key={idx} style={{ background: pair.bg, color: pair.fg, padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: T.sans }}>
                                {state}
                              </span>
                            );
                          }) || <span style={{ fontSize: 12, color: T.ink300 }}>-</span>}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, color: T.ink500, fontFamily: T.mono }}>{dossier.date}</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {canModify ? (
                            <button onClick={() => handleModifyStatus(dossier.id)} style={linkBtnStyle(T.purple)}>Modifier</button>
                          ) : (
                            <span style={{ fontSize: 12, color: T.ink300 }}>-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination for Derniers Bordereaux */}
          {filteredDerniersTable.length > 0 && (
            <div style={{ paddingTop: '16px', borderTop: `1px solid ${T.line}`, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <button 
                onClick={() => setDerniersBordereauxPage(Math.max(1, derniersBordereauxPage - 1))}
                disabled={derniersBordereauxPage === 1}
                style={paginationBtnStyle(derniersBordereauxPage === 1)}
              >
                ← Précédent
              </button>
              <span style={{ fontSize: 12, color: T.ink500, fontFamily: T.sans }}>
                Page {derniersBordereauxPage} sur {Math.ceil(filteredDerniersTable.length / 5)}
              </span>
              <button 
                onClick={() => setDerniersBordereauxPage(Math.min(Math.ceil(filteredDossiers.length / 5), derniersBordereauxPage + 1))}
                disabled={derniersBordereauxPage >= Math.ceil(filteredDossiers.length / 5)}
                style={paginationBtnStyle(derniersBordereauxPage >= Math.ceil(filteredDossiers.length / 5))}
              >
                Suivant →
              </button>
            </div>
          )}
        </div>

        {/* Bordereaux en cours Section */}
        <div style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ color: T.warn, fontSize: 15, marginRight: '8px' }}>⏳</span>
              <span style={{ fontWeight: 700, fontSize: 16, color: T.ink700, fontFamily: T.sans }}>Bordereaux</span>
              <span style={{ ...statusPillStyle(T.warnBg, T.warn), marginLeft: '12px', fontSize: 10 }}>Priorité</span>
            </div>
          </div>
          {/* Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '16px', padding: '12px', background: T.canvas, borderRadius: 8 }}>
            <input type="text" placeholder="Référence" value={filterBordereaux.reference} onChange={(e) => setFilterBordereaux({...filterBordereaux, reference: e.target.value})} style={inputStyle} />
            <input type="text" placeholder="Client" value={filterBordereaux.client} onChange={(e) => setFilterBordereaux({...filterBordereaux, client: e.target.value})} style={inputStyle} />
            <select value={filterBordereaux.statut} onChange={(e) => setFilterBordereaux({...filterBordereaux, statut: e.target.value})} style={inputStyle}>
              <option value="">Tous statuts</option>
              {uniqueStatuts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="date" value={filterBordereaux.dateFrom} onChange={(e) => setFilterBordereaux({...filterBordereaux, dateFrom: e.target.value})} style={inputStyle} />
            <input type="date" value={filterBordereaux.dateTo} onChange={(e) => setFilterBordereaux({...filterBordereaux, dateTo: e.target.value})} style={inputStyle} />
            <button onClick={() => setFilterBordereaux({ reference: '', client: '', statut: '', dateFrom: '', dateTo: '' })} style={btnStyle('danger')}>Effacer</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Référence</th>
                  <th style={thStyle}>Client</th>
                  <th style={thStyle}>Statut</th>
                  <th style={thStyle}>% Finalisation</th>
                  <th style={thStyle}>États Dossiers</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBordereauxTable.slice((bordereauxEnCoursPage - 1) * 5, bordereauxEnCoursPage * 5).map((dossier, index) => {
                  const completionPercentage = dossier.completionPercentage || 0;
                  const dossierStates = dossier.dossierStates || [dossier.statut];
                  const isGestionnaire = user?.role === 'GESTIONNAIRE';
                  const statutPair = getStatusPair(dossier.statut);
                  const fillColor = completionPercentage >= 80 ? T.ok : completionPercentage >= 50 ? T.warn : T.danger;
                  return (
                    <tr key={`bordereau-${dossier.id}`} style={{ borderBottom: `1px solid ${T.line}` }}>
                      <td style={refCellStyle}>{dossier.reference}</td>
                      <td style={tdStyle}>{dossier.client || dossier.societe}</td>
                      <td style={tdStyle}>
                        <span style={statusPillStyle(statutPair.bg, statutPair.fg)}>
                          {dossier.statut || 'En cours de traitement'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '40px', height: '6px', background: T.line, borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ width: `${completionPercentage}%`, height: '100%', background: fillColor, transition: 'width 0.3s ease' }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: T.mono, color: T.ink700 }}>{completionPercentage}%</span>
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {dossierStates?.filter((state): state is string => Boolean(state)).map((state: string, idx: number) => {
                            const pair = state === 'Traité' ? getSemanticPair('ok') : state === 'En cours' ? getSemanticPair('warn') : getSemanticPair('danger');
                            return (
                              <span key={idx} style={{ background: pair.bg, color: pair.fg, padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: T.sans }}>
                                {state}
                              </span>
                            );
                          }) || <span style={{ fontSize: 12, color: T.ink300 }}>Nouveau</span>}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 12, color: T.ink300, fontFamily: T.sans }}>Vue seule</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination for Bordereaux en cours */}
          {filteredBordereauxTable.length > 0 && (
            <div style={{ paddingTop: '16px', borderTop: `1px solid ${T.line}`, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <button 
                onClick={() => setBordereauxEnCoursPage(Math.max(1, bordereauxEnCoursPage - 1))}
                disabled={bordereauxEnCoursPage === 1}
                style={paginationBtnStyle(bordereauxEnCoursPage === 1)}
              >
                ← Précédent
              </button>
              <span style={{ fontSize: 12, color: T.ink500, fontFamily: T.sans }}>
                Page {bordereauxEnCoursPage} sur {Math.ceil(filteredBordereauxTable.length / 5)}
              </span>
              <button 
                onClick={() => setDerniersBordereauxPage(Math.min(Math.ceil(filteredDerniersTable.length / 5), derniersBordereauxPage + 1))}
                disabled={derniersBordereauxPage >= Math.ceil(filteredDerniersTable.length / 5)}
                style={paginationBtnStyle(bordereauxEnCoursPage >= Math.ceil(filteredDossiers.length / 5))}
              >
                Suivant →
              </button>
            </div>
          )}
        </div>

        {/* Dossiers Section (Table) */}
        <div style={{ ...panelStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${T.line}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: T.ink700, margin: 0, fontFamily: T.sans }}>Dossiers Individuels</h3>
                <p style={{ fontSize: 12, color: T.ink500, margin: '4px 0 0 0', fontFamily: T.sans }}>Affichage par dossier (non par bordereau)</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: T.ink500, fontFamily: T.sans }}>Total: {filteredDocumentsTable.length} dossiers</span>
              </div>
            </div>
          </div>
          {/* Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '8px', padding: '12px', background: T.canvas }}>
            <input type="text" placeholder="Réf. Dossier" value={filterDocuments.reference} onChange={(e) => setFilterDocuments({...filterDocuments, reference: e.target.value})} style={inputStyle} />
            <input type="text" placeholder="Réf. Bordereau" value={filterDocuments.bordereauReference} onChange={(e) => setFilterDocuments({...filterDocuments, bordereauReference: e.target.value})} style={inputStyle} />
            <input type="text" placeholder="Client" value={filterDocuments.client} onChange={(e) => setFilterDocuments({...filterDocuments, client: e.target.value})} style={inputStyle} />
            <select value={filterDocuments.type} onChange={(e) => setFilterDocuments({...filterDocuments, type: e.target.value})} style={inputStyle}>
              <option value="">Tous types</option>
              {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterDocuments.statut} onChange={(e) => setFilterDocuments({...filterDocuments, statut: e.target.value})} style={inputStyle}>
              <option value="">Tous statuts</option>
              {uniqueStatuts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="text" placeholder="Gestionnaire" value={filterDocuments.gestionnaire} onChange={(e) => setFilterDocuments({...filterDocuments, gestionnaire: e.target.value})} style={inputStyle} />
            <input type="date" value={filterDocuments.dateFrom} onChange={(e) => setFilterDocuments({...filterDocuments, dateFrom: e.target.value})} style={inputStyle} />
            <input type="date" value={filterDocuments.dateTo} onChange={(e) => setFilterDocuments({...filterDocuments, dateTo: e.target.value})} style={inputStyle} />
            <button onClick={() => setFilterDocuments({ reference: '', bordereauReference: '', client: '', type: '', statut: '', gestionnaire: '', dateFrom: '', dateTo: '' })} style={btnStyle('danger')}>Effacer</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: T.ink900 }}>
                  <th style={thBrandStyle}>Réf. Dossier</th>
                  <th style={thBrandStyle}>Réf. Bordereau</th>
                  <th style={thBrandStyle}>Client</th>
                  <th style={thBrandStyle}>Type</th>
                  <th style={thBrandStyle}>Statut Dossier</th>
                  <th style={thBrandStyle}>Gestionnaire</th>
                  <th style={thBrandStyle}>Date</th>
                  <th style={thBrandStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocumentsTable.slice((dossiersIndividuelsPage - 1) * 20, dossiersIndividuelsPage * 20).map((document, index) => {
                  const isGestionnaire = user?.role === 'GESTIONNAIRE';
                  const canModify = isGestionnaire 
                    ? (!document.statusModifiedByGestionnaire && document.gestionnaire === user?.fullName)
                    : (document.gestionnaire === user?.fullName || user?.role === 'CHEF_EQUIPE' || user?.role === 'SUPER_ADMIN');
                  const statutPair = getStatusPair(document.statut);
                  const isHighlighted = highlightedDocId === document.id;
                  return (
                    <tr key={document.id} style={{ 
                      borderBottom: `1px solid ${T.line}`, 
                      backgroundColor: isHighlighted 
                        ? T.okBg 
                        : index % 2 === 0 ? T.surface : '#FAFBFD',
                      transition: 'background-color 0.3s ease',
                      boxShadow: isHighlighted ? `0 0 0 1px ${T.ok} inset` : 'none'
                    }}>
                      <td style={refCellStyle}>{document.reference}</td>
                      <td style={{ ...refCellStyle, color: T.purple }}>{(document as any).bordereauReference || 'N/A'}</td>
                      <td style={tdStyle}>{document.client}</td>
                      <td style={tdStyle}>{document.type}</td>
                      <td style={tdStyle}>
                        <span style={statusPillStyle(statutPair.bg, statutPair.fg)}>
                          {document.statut}
                        </span>
                      </td>
                      <td style={tdStyle}>{document.gestionnaire || 'Non assigné'}</td>
                      <td style={{ ...tdStyle, color: T.ink500 }}>il y a 2 heures</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button 
                            onClick={() => handleViewPDF(document.id)}
                            style={linkBtnStyle(T.info)}
                            title="Voir PDF du dossier"
                          >
                            Voir PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination for Dossiers Individuels */}
          {filteredDocumentsTable.length > 0 && (
            <div style={{ padding: '16px', borderTop: `1px solid ${T.line}`, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              <button 
                onClick={() => setDossiersIndividuelsPage(Math.max(1, dossiersIndividuelsPage - 1))}
                disabled={dossiersIndividuelsPage === 1}
                style={paginationBtnStyle(dossiersIndividuelsPage === 1)}
              >
                ← Précédent
              </button>
              <span style={{ fontSize: 12, color: T.ink500, fontFamily: T.sans }}>
                Page {dossiersIndividuelsPage} sur {Math.ceil(filteredDocumentsTable.length / 20)}
              </span>
              <button 
                onClick={() => setDossiersIndividuelsPage(Math.min(Math.ceil(filteredDocumentsTable.length / 20), dossiersIndividuelsPage + 1))}
                disabled={dossiersIndividuelsPage >= Math.ceil(filteredDocumentsTable.length / 20)}
                style={paginationBtnStyle(dossiersIndividuelsPage >= Math.ceil(filteredDocumentsTable.length / 20))}
              >
                Suivant →
              </button>
            </div>
          )}
        </div>

        {/* Documents Réaffectés Section */}
        <div style={{ ...panelStyle, borderTop: `3px solid ${T.info}`, background: T.infoBg }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: T.info, margin: 0, fontFamily: T.sans }}>↻ Documents Réaffectés à Moi</h3>
            <button onClick={loadReassignedDocuments} style={btnStyle('info')}>↻ Actualiser</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px', padding: '12px', background: T.surface, borderRadius: 8, border: `1px solid ${T.line}` }}>
            <div style={{ textAlign: 'center', fontFamily: T.sans, fontSize: 13 }}><strong style={{ color: T.ink700 }}>Total:</strong> <span style={{ fontFamily: T.mono }}>{reassignedDocs.length}</span> document(s)</div>
            <div style={{ textAlign: 'center', color: T.danger, fontFamily: T.sans, fontSize: 13 }}><strong>🔴 En retard:</strong> <span style={{ fontFamily: T.mono }}>{reassignedDocs.filter(d => d.isOverdue).length}</span></div>
            <div style={{ textAlign: 'center', color: T.ok, fontFamily: T.sans, fontSize: 13 }}><strong>🟢 À jour:</strong> <span style={{ fontFamily: T.mono }}>{reassignedDocs.filter(d => !d.isOverdue).length}</span></div>
          </div>
          {loadingReassigned ? (
            <div style={{ textAlign: 'center', padding: '40px', color: T.ink500, fontFamily: T.sans }}>Chargement...</div>
          ) : reassignedDocs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: T.ink500, background: T.surface, borderRadius: 8, fontFamily: T.sans, border: `1px solid ${T.line}` }}>Aucun document réaffecté</div>
          ) : (
            <div style={{ overflowX: 'auto', background: T.surface, borderRadius: 8, border: `1px solid ${T.line}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: T.ink900 }}>
                    <th style={thBrandStyle}>Document</th>
                    <th style={thBrandStyle}>Type</th>
                    <th style={thBrandStyle}>Bordereau</th>
                    <th style={thBrandStyle}>Client</th>
                    <th style={thBrandStyle}>Assigné le</th>
                    <th style={thBrandStyle}>Statut</th>
                    <th style={thBrandStyle}>Délai</th>
                  </tr>
                </thead>
                <tbody>
                  {reassignedDocs.slice((reassignedDocsPage - 1) * REASSIGNED_PAGE_SIZE, reassignedDocsPage * REASSIGNED_PAGE_SIZE).map((doc, index) => {
                    const statutPair = getStatusPair(doc.status);
                    return (
                    <tr key={doc.id} style={{ borderBottom: `1px solid ${T.line}`, background: doc.isOverdue ? T.dangerBg : index % 2 === 0 ? T.surface : '#FAFBFD' }}>
                      <td style={tdStyle}>{doc.name}</td>
                      <td style={tdStyle}>{doc.type}</td>
                      <td style={refCellStyle}>{doc.bordereauReference}</td>
                      <td style={tdStyle}>{doc.clientName}</td>
                      <td style={{ ...tdStyle, color: T.ink500, fontFamily: T.mono }}>{doc.assignedAt ? new Date(doc.assignedAt).toLocaleDateString('fr-FR') : doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('fr-FR') : '-'}</td>
                      <td style={tdStyle}>
                        <span style={statusPillStyle(statutPair.bg, statutPair.fg)}>{doc.status}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={statusPillStyle(doc.isOverdue ? T.dangerBg : T.okBg, doc.isOverdue ? T.danger : T.ok)}>
                          {doc.remainingDays !== undefined && doc.remainingDays !== null ? `${doc.remainingDays}j restants` : 'N/A'}
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {reassignedDocs.length > REASSIGNED_PAGE_SIZE && (
            <div style={{ paddingTop: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setReassignedDocsPage(p => Math.max(1, p - 1))}
                disabled={reassignedDocsPage === 1}
                style={paginationBtnStyle(reassignedDocsPage === 1)}
              >
                ← Précédent
              </button>
              <span style={{ fontSize: 12, color: T.ink500, fontFamily: T.sans }}>
                Page {reassignedDocsPage} sur {Math.ceil(reassignedDocs.length / REASSIGNED_PAGE_SIZE)}
              </span>
              <button
                onClick={() => setReassignedDocsPage(p => Math.min(Math.ceil(reassignedDocs.length / REASSIGNED_PAGE_SIZE), p + 1))}
                disabled={reassignedDocsPage >= Math.ceil(reassignedDocs.length / REASSIGNED_PAGE_SIZE)}
                style={paginationBtnStyle(reassignedDocsPage >= Math.ceil(reassignedDocs.length / REASSIGNED_PAGE_SIZE))}
              >
                Suivant →
              </button>
            </div>
          )}
        </div>
        <div style={panelStyle}>
          <BSAIPage />
        </div>

      </div>
      
      {/* Success Toast */}
      {showSuccessToast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1005,
          animation: 'slideIn 0.3s ease-out'
        }}>
          <div style={{
            backgroundColor: T.ok,
            color: 'white',
            borderRadius: 8,
            padding: '14px 22px',
            boxShadow: '0 8px 24px rgba(15,27,45,0.16)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '300px',
            fontFamily: T.sans
          }}>
            <span style={{ fontSize: '22px' }}>✓</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{successMessage}</span>
            <button
              onClick={() => setShowSuccessToast(false)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '15px',
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      {/* PDF Modal */}
      {showPDFModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15,27,45,0.55)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: T.surface,
            borderRadius: 10,
            width: '90%',
            height: '90%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 22px',
              borderBottom: `1px solid ${T.line}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: T.canvas
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.ink900, fontFamily: T.sans }}>
                  {currentDossier?.reference} - {currentDossier?.client || currentDossier?.societe}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: T.ink500, fontFamily: T.sans }}>
                  Type: {currentDossier?.type} | Statut: {currentDossier?.statut}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {(() => {
                  const isGestionnaire = user?.role === 'GESTIONNAIRE';
                  const canModify = isGestionnaire 
                    ? (!currentDossier?.statusModifiedByGestionnaire && currentDossier?.gestionnaire === user?.fullName)
                    : (currentDossier?.gestionnaire === user?.fullName || user?.role === 'CHEF_EQUIPE' || user?.role === 'SUPER_ADMIN');
                  
                  return canModify ? (
                    <button 
                      onClick={() => {
                        setShowPDFModal(false);
                        handleModifyStatus(currentDossier.id);
                      }}
                      style={btnStyle('purple')}
                    >
                      ✏️ Modifier Statut
                    </button>
                  ) : (
                    <span style={{ fontSize: 13, color: T.ink300, padding: '8px 16px', fontStyle: 'italic', fontFamily: T.sans }}>
                      📖 Lecture seule
                    </span>
                  );
                })()}
                <button 
                  onClick={closePDFModal}
                  style={btnStyle('danger')}
                >
                  Fermer
                </button>
              </div>
            </div>
            
            {/* PDF Viewer */}
            <div style={{ flex: 1, padding: '16px' }}>
              {currentPDFUrl ? (
                <iframe
                  src={currentPDFUrl}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: 6
                  }}
                  title="PDF Viewer"
                />
              ) : (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  fontSize: 15,
                  color: T.ink500,
                  fontFamily: T.sans
                }}>
                  Chargement du PDF...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Status Modification Modal */}
      {showStatusModal && currentDossier && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15,27,45,0.55)',
          zIndex: 1001,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: T.surface,
            borderRadius: 10,
            padding: '22px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 8px 24px rgba(15,27,45,0.16)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: `1px solid ${T.line}`,
              paddingBottom: '14px'
            }}>
              <h3 style={{
                margin: 0,
                color: T.brand,
                fontSize: 16,
                fontWeight: 700,
                fontFamily: T.sans
              }}>
                ✏️ Modifier le Statut
              </h3>
              <button
                onClick={() => setShowStatusModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: T.ink500
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: 13, marginBottom: '16px', fontFamily: T.sans, color: T.ink900, lineHeight: 1.6 }}>
                Dossier: <strong>{currentDossier.reference}</strong><br/>
                Client: <strong>{currentDossier.client || currentDossier.societe}</strong><br/>
                Statut actuel: <strong>{currentDossier.statut}</strong>
              </p>
              
              <div style={{ display: 'grid', gap: '8px' }}>
                {['En cours', 'Traité', 'Retourné'].map(status => (
                  <button
                    key={status}
                    onClick={() => handleConfirmStatusChange(status)}
                    style={{
                      padding: '12px',
                      border: `1px solid ${T.line}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                      backgroundColor: T.surface,
                      fontSize: 13,
                      fontFamily: T.sans,
                      fontWeight: 700,
                      textAlign: 'left',
                      color: T.ink900,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = T.canvas;
                      e.currentTarget.style.borderColor = T.brand;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = T.surface;
                      e.currentTarget.style.borderColor = T.line;
                    }}
                  >
                    {status === 'En cours' ? '⏳' : status === 'Traité' ? '✓' : '↩️'} {status}
                  </button>
                ))}
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '14px',
              borderTop: `1px solid ${T.line}`
            }}>
              <button
                onClick={() => setShowStatusModal(false)}
                style={btnStyle('neutral')}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionnaireDashboardNew;