import { useEffect, useState, useMemo } from "react";
import { useAuth } from '../../contexts/AuthContext';
import { LocalAPI } from '../../services/axios';
import "../../styles/chef-equipe.css";
import DossiersList from '../../components/BS/DossiersList';

interface DossierStats {
  prestation: { total: number; breakdown: { [key: string]: number }; gestionnaireBreakdown: { [key: string]: number } };
  adhesion: { total: number; breakdown: { [key: string]: number }; gestionnaireBreakdown: { [key: string]: number } };
  complement: { total: number; breakdown: { [key: string]: number }; gestionnaireBreakdown: { [key: string]: number } };
  resiliation: { total: number; breakdown: { [key: string]: number }; gestionnaireBreakdown: { [key: string]: number } };
  reclamation: { total: number; breakdown: { [key: string]: number }; gestionnaireBreakdown: { [key: string]: number } };
  avenant: { total: number; breakdown: { [key: string]: number }; gestionnaireBreakdown: { [key: string]: number } };
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
  client: string;
  type: string;
  statut: string;
  date: string;
  gestionnaire?: string;
  completionPercentage?: number;
  dossierStates?: string[];
  priorite?: string;
  joursEnCours?: number;
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

const panelHeaderTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: T.ink700,
  margin: 0,
  fontFamily: T.sans,
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
    padding: '8px 12px',
    border: `1px solid ${T.line}`,
    borderRadius: 6,
    background: disabled ? T.canvas : T.surface,
    color: disabled ? T.ink300 : T.ink700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 13,
    fontFamily: T.sans,
    fontWeight: 600,
  };
}

function getSemanticPair(kind: 'ok' | 'warn' | 'danger' | 'info') {
  switch (kind) {
    case 'ok': return { bg: T.okBg, fg: T.ok };
    case 'warn': return { bg: T.warnBg, fg: T.warn };
    case 'danger': return { bg: T.dangerBg, fg: T.danger };
    default: return { bg: T.infoBg, fg: T.info };
  }
}

function ChefEquipeDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DossierStats>({
    prestation: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
    adhesion: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
    complement: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
    resiliation: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
    reclamation: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
    avenant: { total: 0, breakdown: {}, gestionnaireBreakdown: {} }
  });
  const [gestionnaireAssignments, setGestionnaireAssignments] = useState<GestionnaireAssignment[]>([]);
  const [gestionnaireSeniorAssignments, setGestionnaireSeniorAssignments] = useState<GestionnaireAssignment[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [documents, setDocuments] = useState<Dossier[]>([]);
  const [filteredDossiers, setFilteredDossiers] = useState<Dossier[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Dossier[]>([]);
  const [selectedDossiers, setSelectedDossiers] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState('Tous');
  const [societeFilter, setSocieteFilter] = useState('Toutes');
  const [statutFilter, setStatutFilter] = useState('Tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [societes, setSocietes] = useState<string[]>([]);
  const [gestionnaireFilter, setGestionnaireFilter] = useState('Tous');
  const [availableGestionnaires, setAvailableGestionnaires] = useState<string[]>([]);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [currentPDFUrl, setCurrentPDFUrl] = useState('');
  const [currentDossier, setCurrentDossier] = useState<any>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showRetourScanModal, setShowRetourScanModal] = useState(false);
  const [retourScanReason, setRetourScanReason] = useState('');
  const [selectedDossierForRetour, setSelectedDossierForRetour] = useState<string | null>(null);
  const [retourScanType, setRetourScanType] = useState<'bordereau' | 'documents'>('bordereau');
  const [selectedDocumentsForRetour, setSelectedDocumentsForRetour] = useState<string[]>([]);
  const [bordereauDocuments, setBordereauDocuments] = useState<any[]>([]);
  const [showAddDocumentModal, setShowAddDocumentModal] = useState(false);
  const [selectedBordereauForDoc, setSelectedBordereauForDoc] = useState<string | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [documentsPage, setDocumentsPage] = useState(1);
  const documentsPerPage = 20;
  const [reassignedDocs, setReassignedDocs] = useState<any[]>([]);
  const [reassignedByMember, setReassignedByMember] = useState<Record<string, { name: string; count: number }>>({});
  const [loadingReassigned, setLoadingReassigned] = useState(false);
  const [reassignedDocsPage, setReassignedDocsPage] = useState(1);
  const REASSIGNED_PAGE_SIZE = 10;

  // ── Merged "Bordereaux" table (replaces the old "Derniers Bordereaux Ajoutés" + "Bordereaux" pair) ──
  const [mergedFilters, setMergedFilters] = useState({
    reference: '', client: '', type: '', statut: '', priorite: '', dateFrom: '', dateTo: ''
  });
  const [filteredMergedBordereaux, setFilteredMergedBordereaux] = useState<Dossier[]>([]);
  const [mergedPage, setMergedPage] = useState(1);
  const mergedPerPage = 10;

  // Documents Individuels table filters
  const [filterDocuments, setFilterDocuments] = useState({ reference: '', bordereauReference: '', client: '', type: '', statut: '', gestionnaire: '', dateFrom: '', dateTo: '' });
  const [filteredDocumentsTable, setFilteredDocumentsTable] = useState<Dossier[]>([]);

  const uniqueStatuts = useMemo(() => 
    [...new Set([...dossiers, ...documents].map((d: any) => d.statut).filter(Boolean))].sort(),
    [dossiers, documents]
  );
  const uniqueTypes = useMemo(() => 
    [...new Set([...dossiers, ...documents].map((d: any) => d.type).filter(Boolean))].sort(),
    [dossiers, documents]
  );
  const uniquePriorites = useMemo(() =>
    [...new Set(dossiers.map((d: any) => d.priorite).filter(Boolean))].sort(),
    [dossiers]
  );
  const uniqueGestionnairesFilter = useMemo(() => 
    [...new Set(documents.map((d: any) => d.gestionnaire).filter(Boolean))].sort(),
    [documents]
  );

  useEffect(() => {
    loadDashboardData();
    loadReassignedDocuments();
    
    // Listen for PDF modal events from DossiersList
    const handlePDFModal = (event: any) => {
      const { pdfUrl, document } = event.detail;
      const serverBaseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || window.location.origin;
      setCurrentPDFUrl(`${serverBaseUrl}${pdfUrl}`);
      setCurrentDossier(document);
      setShowPDFModal(true);
    };
    
    window.addEventListener('openPDFModal', handlePDFModal);
    
    return () => {
      window.removeEventListener('openPDFModal', handlePDFModal);
    };
  }, []);

  const loadReassignedDocuments = async () => {
    if (!user?.id) return;
    setLoadingReassigned(true);
    try {
      const response = await LocalAPI.get(`/super-admin/chef-equipe/reassigned-documents?userId=${user.id}`);
      if (response.data.success) {
        setReassignedDocs(response.data.documents || []);
        setReassignedByMember(response.data.byMember || {});
        setReassignedDocsPage(1);
      }
    } catch (error) {
      console.error('Error loading reassigned documents:', error);
    } finally {
      setLoadingReassigned(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [typeFilter, societeFilter, statutFilter, searchQuery, dossiers, documents]);

  // Merged Bordereaux table filter
  useEffect(() => {
    const filtered = dossiers.filter((d: any) => {
      const refMatch = !mergedFilters.reference || String(d.reference || '').trim().toLowerCase().includes(mergedFilters.reference.trim().toLowerCase());
      return refMatch &&
        (!mergedFilters.client || String(d.client || '').trim().toLowerCase().includes(mergedFilters.client.trim().toLowerCase())) &&
        (!mergedFilters.type || d.type === mergedFilters.type) &&
        (!mergedFilters.statut || d.statut === mergedFilters.statut) &&
        (!mergedFilters.priorite || d.priorite === mergedFilters.priorite) &&
        (!mergedFilters.dateFrom || new Date(d.date) >= new Date(mergedFilters.dateFrom)) &&
        (!mergedFilters.dateTo || new Date(d.date) <= new Date(mergedFilters.dateTo));
    });
    setFilteredMergedBordereaux(filtered);
    setMergedPage(1);
  }, [mergedFilters, dossiers]);

  // Documents Individuels table filter
  useEffect(() => {
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
    setDocumentsPage(1);
  }, [filterDocuments, documents]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // NOTE: 'derniers-dossiers' + a separate 'dossiers-en-cours' call were replaced by the
      // single cached 'bordereaux-unified' endpoint (30s Redis TTL, one Prisma query,
      // isEnCours flag per row) — this is what now powers the merged "Bordereaux" table below.
      const [statsResponse, dossiersResponse, documentsResponse, assignmentsResponse, seniorAssignmentsResponse] = await Promise.all([
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/types-detail'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/bordereaux-unified'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/documents-individuels'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/gestionnaire-assignments-dossiers'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/gestionnaire-senior-assignments')
      ]);

      const dossiersList: Dossier[] = dossiersResponse.data?.items || [];
      setDossiers(dossiersList);

      const uniqueSocietes = [...new Set(dossiersList.map((d: Dossier) => d.client).filter(Boolean))] as string[];
      setSocietes(uniqueSocietes.sort());

      if (documentsResponse.data) {
        setDocuments(documentsResponse.data);
        setFilteredDocuments(documentsResponse.data);
      } else {
        console.warn('⚠️ No documents data received');
      }

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
      } else {
        console.warn('⚠️ No stats data received');
      }

      if (assignmentsResponse.data) {
        setGestionnaireAssignments(assignmentsResponse.data);
        const uniqueGestionnaires = [...new Set(assignmentsResponse.data.map((a: any) => a.gestionnaire))].sort() as string[];
        setAvailableGestionnaires(uniqueGestionnaires);
      } else {
        console.warn('⚠️ No assignments data received');
      }

      if (seniorAssignmentsResponse.data) {
        setGestionnaireSeniorAssignments(seniorAssignmentsResponse.data);
      } else {
        console.warn('⚠️ No senior assignments data received');
      }
    } catch (error: any) {
      console.error('❌ Error loading dashboard data:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
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
      filtered = filtered.filter(d => d.client === societeFilter);
    }
    if (statutFilter !== 'Tous') {
      filtered = filtered.filter(d => d.statut === statutFilter);
    }
    if (searchQuery.trim()) {
      filtered = filtered.filter(d => 
        d.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.client && d.client.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    setFilteredDossiers(filtered);

    let filteredDocs = [...documents];
    if (typeFilter !== 'Tous') {
      filteredDocs = filteredDocs.filter(d => d.type === typeFilter);
    }
    if (societeFilter !== 'Toutes') {
      filteredDocs = filteredDocs.filter(d => d.client === societeFilter);
    }
    if (statutFilter !== 'Tous') {
      filteredDocs = filteredDocs.filter(d => d.statut === statutFilter);
    }
    if (searchQuery.trim()) {
      filteredDocs = filteredDocs.filter(d => 
        d.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.client && d.client.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    setFilteredDocuments(filteredDocs);
  };

  const handleSelectAll = () => {
    if (selectedDossiers.length === filteredDocuments.length) {
      setSelectedDossiers([]);
    } else {
      setSelectedDossiers(filteredDocuments.map(d => d.id));
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
      ...filteredDossiers.map(d => [d.reference, d.nom || '', d.client, d.type, d.statut, d.date])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-chef-equipe-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTransfer = async (type: string) => {
    if (selectedDossiers.length === 0) {
      alert('Veuillez sélectionner au moins un dossier');
      return;
    }
    
    try {
      const response = await LocalAPI.post('/bordereaux/chef-equipe/transfer-dossiers', {
        dossierIds: selectedDossiers,
        targetType: type
      });
      
      if (response.data.success) {
        alert(`Transfert réussi: ${response.data.transferred} dossier(s) transféré(s) vers ${type}`);
        setSelectedDossiers([]);
        loadDashboardData();
      } else {
        alert('Erreur lors du transfert');
      }
    } catch (error) {
      console.error('Transfer error:', error);
      alert('Erreur lors du transfert');
    }
  };

  const handleViewPDF = async (dossierId: string) => {
    try {
      const response = await LocalAPI.get(`/bordereaux/chef-equipe/tableau-bord/dossier-pdf/${dossierId}`);
      if (response.data.success && response.data.hasDocument) {
        const dossier = filteredDossiers.find(d => d.id === dossierId);
        const serverBaseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || window.location.origin;
        setCurrentPDFUrl(`${serverBaseUrl}${response.data.pdfUrl}`);
        setCurrentDossier(dossier);
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
    } catch (error) {
      console.error('Status modification error:', error);
      alert('Erreur lors de la modification du statut');
    }
  };

  const handleModifyStatus = (dossierId: string) => {
    const dossier = filteredDossiers.find(d => d.id === dossierId);
    const document = filteredDocuments.find(d => d.id === dossierId);
    if (dossier) {
      setCurrentDossier({ ...dossier, isDocument: false });
      setShowStatusModal(true);
    } else if (document) {
      setCurrentDossier({ ...document, isDocument: true });
      setShowStatusModal(true);
    }
  };

  const handleConfirmStatusChange = async (newStatus: string) => {
    if (!currentDossier) return;
    
    try {
      const endpoint = '/bordereaux/chef-equipe/tableau-bord/modify-dossier-status';
      const payload = { dossierId: currentDossier.id, newStatus };
      const response = await LocalAPI.post(endpoint, payload);
      
      if (response.data.success) {
        alert('Statut modifié avec succès');
        loadDashboardData();
        setShowStatusModal(false);
        setCurrentDossier(null);
      } else {
        alert('Erreur lors de la modification du statut');
      }
    } catch (error) {
      console.error('Status modification error:', error);
      alert('Erreur lors de la modification du statut');
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
        alert('Erreur lors de la modification du statut');
      }
    } catch (error) {
      console.error('Mark as traité error:', error);
      alert('Erreur lors de la modification du statut');
    }
  };

  const handleRetourScan = async (dossierId: string) => {
    setSelectedDossierForRetour(dossierId);
    setRetourScanReason('');
    setRetourScanType('bordereau');
    setSelectedDocumentsForRetour([]);
    
    try {
      const response = await LocalAPI.get(`/bordereaux/${dossierId}`);
      setBordereauDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
      setBordereauDocuments([]);
    }
    
    setShowRetourScanModal(true);
  };

  const handleRemoveDocument = async (documentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer ce document du bordereau ?')) return;
    
    try {
      const response = await LocalAPI.post('/bordereaux/chef-equipe/remove-document-from-bordereau', {
        documentId
      });
      
      if (response.data.success) {
        alert('Document retiré avec succès');
        loadDashboardData();
      }
    } catch (error) {
      console.error('Remove document error:', error);
      alert('Erreur lors du retrait du document');
    }
  };

  const handleAddDocument = (bordereauId: string) => {
    setSelectedBordereauForDoc(bordereauId);
    setShowAddDocumentModal(true);
  };

  // Supports selecting and uploading 1..N files at once, no cap.
  const handleUploadDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !selectedBordereauForDoc) return;

    setUploadingDocument(true);
    setUploadingCount(files.length);

    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('files', file));
    formData.append('bordereauId', selectedBordereauForDoc);

    try {
      const response = await LocalAPI.post('/bordereaux/chef-equipe/upload-document-to-bordereau', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        const count = response.data.count ?? files.length;
        alert(`${count} document(s) uploadé(s) et ajouté(s) avec succès`);
        setShowAddDocumentModal(false);
        setSelectedBordereauForDoc(null);
        loadDashboardData();
      } else {
        alert('Erreur lors de l\'upload des documents');
      }
    } catch (error) {
      console.error('Upload document error:', error);
      alert('Erreur lors de l\'upload du/des document(s)');
    } finally {
      setUploadingDocument(false);
      setUploadingCount(0);
      // allow re-selecting the same file(s) again later
      event.target.value = '';
    }
  };

  const handleConfirmRetourScan = async () => {
    if (!selectedDossierForRetour || !retourScanReason.trim()) {
      alert('Veuillez saisir une raison pour le retour');
      return;
    }

    if (retourScanType === 'documents' && selectedDocumentsForRetour.length === 0) {
      alert('Veuillez sélectionner au moins un document');
      return;
    }

    try {
      const response = await LocalAPI.post('/bordereaux/chef-equipe/tableau-bord/return-to-scan', {
        dossierId: selectedDossierForRetour,
        reason: retourScanReason,
        setAsReturnedToScan: true,
        returnType: retourScanType,
        documentIds: retourScanType === 'documents' ? selectedDocumentsForRetour : undefined
      });
      
      if (response.data.success) {
        const message = retourScanType === 'bordereau' 
          ? 'Bordereau complet retourné vers l\'équipe Scan avec succès'
          : `${selectedDocumentsForRetour.length} document(s) retourné(s) vers l\'équipe Scan avec succès`;
        alert(message);
        setShowRetourScanModal(false);
        setRetourScanReason('');
        setSelectedDossierForRetour(null);
        setSelectedDocumentsForRetour([]);
        setBordereauDocuments([]);
        loadDashboardData();
      } else {
        alert('Erreur lors du retour vers Scan');
      }
    } catch (error) {
      console.error('Retour scan error:', error);
      alert('Erreur lors du retour vers Scan');
    }
  };

  const getPriorityPair = (priorite?: string) => {
    switch (priorite) {
      case 'Très': case 'Élevée': return getSemanticPair('danger');
      case 'Moyenne': return getSemanticPair('warn');
      default: return getSemanticPair('ok');
    }
  };

  const getStatutPair = (statut?: string) => {
    if (statut === 'Traité') return getSemanticPair('ok');
    if (statut === 'En cours') return getSemanticPair('warn');
    return getSemanticPair('info');
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
          Registre · Équipe
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, fontFamily: T.sans, color: '#FFFFFF' }}>Dashboard Chef d'équipe</h1>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 20px 60px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Statistics Section (Cards Row) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' }}>
          {/* Prestation Card */}
          <div style={{ ...panelStyle, borderTop: `3px solid ${T.brand}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={panelHeaderTitle}>Prestation</h3>
              <span style={{ background: T.ink900, color: 'white', padding: '3px 9px', borderRadius: 20, fontSize: 13, fontWeight: 600, fontFamily: T.mono }}>{stats.prestation?.total || 0}</span>
            </div>
            <div style={{ fontSize: 12, color: T.ink500, fontFamily: T.sans }}>
              <div style={{ fontWeight: 700, marginBottom: '4px', color: T.ink700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Par client:</div>
              {Object.entries(stats.prestation?.breakdown || {}).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                  <span>{key}:</span> <span style={{ fontFamily: T.mono }}>{value}</span>
                </div>
              ))}
              <div style={{ fontWeight: 700, marginTop: '6px', marginBottom: '4px', color: T.ink700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Par gestionnaire:</div>
              {Object.entries(stats.prestation?.gestionnaireBreakdown || {}).map(([key, value]) => {
                const memberEntry = Object.values(reassignedByMember).find(m => m.name === key);
                const reassignedCount = memberEntry ? memberEntry.count : 0;
                const totalCount = (value as number) + reassignedCount;
                return (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                    <span>{key}:</span> 
                    <span style={{ fontFamily: T.mono }}>
                      {totalCount}
                      {reassignedCount > 0 && <span style={{ color: T.info, fontSize: '10px', marginLeft: '4px', fontFamily: T.sans }}>(↻{reassignedCount})</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Adhésion Card */}
          <div style={{ ...panelStyle, borderTop: `3px solid ${T.brand}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={panelHeaderTitle}>Adhésion</h3>
              <span style={{ background: T.ink900, color: 'white', padding: '3px 9px', borderRadius: 20, fontSize: 13, fontWeight: 600, fontFamily: T.mono }}>{stats.adhesion?.total || 0}</span>
            </div>
            <div style={{ fontSize: 12, color: T.ink500, fontFamily: T.sans }}>
              {Object.entries(stats.adhesion?.breakdown || {}).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>{key}:</span> <span style={{ fontFamily: T.mono }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Complément de dossier Card */}
          <div style={{ ...panelStyle, borderTop: `3px solid ${T.info}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={panelHeaderTitle}>Complément de dossier</h3>
              <span style={{ background: T.info, color: 'white', padding: '3px 9px', borderRadius: 20, fontSize: 13, fontWeight: 600, fontFamily: T.mono }}>{stats.complement?.total || 0}</span>
            </div>
            <div style={{ fontSize: 12, color: T.ink500, fontFamily: T.sans }}>
              {Object.entries(stats.complement?.breakdown || {}).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>{key}:</span> <span style={{ fontFamily: T.mono }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Résiliation Card */}
          <div style={{ ...panelStyle, borderTop: `3px solid ${T.brand}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={panelHeaderTitle}>Résiliation</h3>
              <span style={{ background: T.ink900, color: 'white', padding: '3px 9px', borderRadius: 20, fontSize: 13, fontWeight: 600, fontFamily: T.mono }}>{stats.resiliation?.total || 0}</span>
            </div>
            <div style={{ fontSize: 12, color: T.ink500, fontFamily: T.sans }}>
              {Object.entries(stats.resiliation?.breakdown || {}).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>{key}:</span> <span style={{ fontFamily: T.mono }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Réclamation Card */}
          <div style={{ ...panelStyle, borderTop: `3px solid ${T.brand}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={panelHeaderTitle}>Réclamation</h3>
              <span style={{ background: T.ink900, color: 'white', padding: '3px 9px', borderRadius: 20, fontSize: 13, fontWeight: 600, fontFamily: T.mono }}>{stats.reclamation?.total || 0}</span>
            </div>
            <div style={{ fontSize: 12, color: T.ink500, fontFamily: T.sans }}>
              {Object.entries(stats.reclamation?.breakdown || {}).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>{key}:</span> <span style={{ fontFamily: T.mono }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Avenant Card */}
          <div style={{ ...panelStyle, borderTop: `3px solid ${T.brand}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={panelHeaderTitle}>Avenant</h3>
              <span style={{ background: T.ink900, color: 'white', padding: '3px 9px', borderRadius: 20, fontSize: 13, fontWeight: 600, fontFamily: T.mono }}>{stats.avenant?.total || 0}</span>
            </div>
            <div style={{ fontSize: 12, color: T.ink500, fontFamily: T.sans }}>
              {Object.entries(stats.avenant?.breakdown || {}).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>{key}:</span> <span style={{ fontFamily: T.mono }}>{value}</span>
                </div>
              ))}
            </div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button 
              onClick={handleExport}
              style={btnStyle('brand')}
            >
              Exporter
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.ink700, fontFamily: T.sans }}>Transférer vers:</span>
            <button onClick={() => handleTransfer('Prestation')} style={{ ...btnStyle('info'), padding: '6px 12px', fontSize: 12 }}>Prestation</button>
            <button onClick={() => handleTransfer('Complément')} style={{ ...btnStyle('info'), padding: '6px 12px', fontSize: 12 }}>Complément</button>
            <button onClick={() => handleTransfer('Adhésion')} style={{ ...btnStyle('info'), padding: '6px 12px', fontSize: 12 }}>Adhésion</button>
            <button onClick={() => handleTransfer('Résiliation')} style={{ ...btnStyle('info'), padding: '6px 12px', fontSize: 12 }}>Résiliation</button>
            <button onClick={() => handleTransfer('Avenant')} style={{ ...btnStyle('info'), padding: '6px 12px', fontSize: 12 }}>Avenant</button>
            <button onClick={() => handleTransfer('Réclamation')} style={{ ...btnStyle('info'), padding: '6px 12px', fontSize: 12 }}>Réclamation</button>
          </div>
        </div>

        {/* Gestionnaire Assignments Section */}
        <div style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: T.ink700, margin: 0, fontFamily: T.sans }}>Affectations par Gestionnaire</h3>
            <select 
              value={gestionnaireFilter} 
              onChange={(e) => setGestionnaireFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="Tous">Tous les gestionnaires</option>
              {availableGestionnaires.map(gest => (
                <option key={gest} value={gest}>{gest}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {gestionnaireAssignments
              .filter(assignment => gestionnaireFilter === 'Tous' || assignment.gestionnaire === gestionnaireFilter)
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
                    {assignment.returnedBy && (assignment.retournes || 0) > 0 && (
                      <div style={{ fontSize: 11, color: T.danger, fontWeight: 700, marginLeft: '16px', marginTop: '2px', fontFamily: T.sans }}>
                        → Retourné par: {assignment.returnedBy}
                      </div>
                    )}
                    {(() => {
                      const memberEntry = Object.values(reassignedByMember).find(m => m.name === assignment.gestionnaire);
                      return memberEntry ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                          <span style={{ color: T.info }}>↻ Réaffectés:</span>
                          <span style={{ fontWeight: 700, color: T.info, fontFamily: T.mono }}>{memberEntry.count}</span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: T.ink500, fontFamily: T.sans }}>
                  <strong style={{ color: T.ink700 }}>Par type:</strong> {Object.entries(assignment.documentsByType || {}).map(([type, count]) => `${type}: ${count}`).join(', ') || 'Aucun'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bordereaux Section — merges the former "Derniers Bordereaux Ajoutés" and "Bordereaux" tables */}
        <div style={{ ...panelStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 18px 0' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: T.ink700, marginBottom: '4px', fontFamily: T.sans }}>Bordereaux</h3>
            <p style={{ fontSize: 12, color: T.ink500, margin: '0 0 14px 0', fontFamily: T.sans }}>Derniers bordereaux ajoutés et bordereaux en cours — vue unifiée</p>

            {/* Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px', marginBottom: '16px', padding: '12px', background: T.canvas, borderRadius: 8 }}>
              <input type="text" placeholder="Référence" value={mergedFilters.reference} onChange={(e) => setMergedFilters({...mergedFilters, reference: e.target.value})} style={inputStyle} />
              <input type="text" placeholder="Client" value={mergedFilters.client} onChange={(e) => setMergedFilters({...mergedFilters, client: e.target.value})} style={inputStyle} />
              <select value={mergedFilters.type} onChange={(e) => setMergedFilters({...mergedFilters, type: e.target.value})} style={inputStyle}>
                <option value="">Tous types</option>
                {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={mergedFilters.statut} onChange={(e) => setMergedFilters({...mergedFilters, statut: e.target.value})} style={inputStyle}>
                <option value="">Tous statuts</option>
                {uniqueStatuts.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={mergedFilters.priorite} onChange={(e) => setMergedFilters({...mergedFilters, priorite: e.target.value})} style={inputStyle}>
                <option value="">Toutes priorités</option>
                {uniquePriorites.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input type="date" placeholder="Date début" value={mergedFilters.dateFrom} onChange={(e) => setMergedFilters({...mergedFilters, dateFrom: e.target.value})} style={inputStyle} />
              <input type="date" placeholder="Date fin" value={mergedFilters.dateTo} onChange={(e) => setMergedFilters({...mergedFilters, dateTo: e.target.value})} style={inputStyle} />
              <button onClick={() => setMergedFilters({ reference: '', client: '', type: '', statut: '', priorite: '', dateFrom: '', dateTo: '' })} style={btnStyle('danger')}>Effacer</button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
              <thead>
                <tr style={{ background: T.ink900 }}>
                  <th style={thStyle}>Référence</th>
                  <th style={thStyle}>Client</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Statut</th>
                  <th style={thStyle}>% Finalisation</th>
                  <th style={thStyle}>États Dossiers</th>
                  <th style={thStyle}>Priorité</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMergedBordereaux.slice((mergedPage - 1) * mergedPerPage, mergedPage * mergedPerPage).map((dossier, index) => {
                  const completionPercentage = dossier.completionPercentage || 0;
                  const dossierStates = dossier.dossierStates || [dossier.statut];
                  const statutPair = getStatutPair(dossier.statut);
                  const prioPair = getPriorityPair(dossier.priorite);
                  const fillColor = completionPercentage >= 80 ? T.ok : completionPercentage >= 50 ? T.warn : T.danger;
                  return (
                    <tr key={`bordereau-${dossier.id}`} style={{ background: index % 2 === 0 ? T.surface : '#FAFBFD', borderBottom: `1px solid ${T.line}` }}>
                      <td style={refCellStyle}>{dossier.reference}</td>
                      <td style={tdStyle}>{dossier.client}</td>
                      <td style={tdStyle}>{dossier.type}</td>
                      <td style={tdStyle}>
                        <span style={statusPillStyle(statutPair.bg, statutPair.fg)}>{dossier.statut}</span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '46px', height: '6px', background: T.line, borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${completionPercentage}%`, height: '100%', background: fillColor }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: T.mono, color: T.ink700 }}>{completionPercentage}%</span>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {dossierStates.length > 0 ? dossierStates.map((state, idx) => {
                            const pair = state === 'Traité' ? getSemanticPair('ok') : state === 'En cours' ? getSemanticPair('warn') : getSemanticPair('danger');
                            return (
                              <span key={idx} style={{ background: pair.bg, color: pair.fg, padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: T.sans }}>
                                {state}
                              </span>
                            );
                          }) : <span style={{ fontSize: 12, color: T.ink300 }}>-</span>}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={statusPillStyle(prioPair.bg, prioPair.fg)}>
                          {dossier.priorite || 'Normale'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontFamily: T.mono }}>{dossier.date}</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <button onClick={() => handleRetourScan(dossier.id)} style={linkBtnStyle(T.purple)} title="Retour Scan">Retour Scan</button>
                          <button onClick={() => handleAddDocument(dossier.id)} style={linkBtnStyle(T.ok)} title="Ajouter Document(s)">+ Doc</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredMergedBordereaux.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', gap: '8px' }}>
              <button
                onClick={() => setMergedPage(prev => Math.max(1, prev - 1))}
                disabled={mergedPage === 1}
                style={paginationBtnStyle(mergedPage === 1)}
              >
                ← Précédent
              </button>
              <span style={{ padding: '8px 16px', fontSize: 13, color: T.ink500, fontFamily: T.sans }}>
                Page {mergedPage} sur {Math.ceil(filteredMergedBordereaux.length / mergedPerPage)}
              </span>
              <button
                onClick={() => setMergedPage(prev => Math.min(Math.ceil(filteredMergedBordereaux.length / mergedPerPage), prev + 1))}
                disabled={mergedPage >= Math.ceil(filteredMergedBordereaux.length / mergedPerPage)}
                style={paginationBtnStyle(mergedPage >= Math.ceil(filteredMergedBordereaux.length / mergedPerPage))}
              >
                Suivant →
              </button>
            </div>
          )}
        </div>

        {/* Dossiers Section (Table) */}
        <div style={{ ...panelStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${T.line}` }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: T.ink700, margin: 0, fontFamily: T.sans }}>Dossiers Individuels</h3>
            <p style={{ fontSize: 12, color: T.ink500, margin: '4px 0 0 0', fontFamily: T.sans }}>Affichage par dossier (non par bordereau)</p>
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
            <input type="date" placeholder="Date début" value={filterDocuments.dateFrom} onChange={(e) => setFilterDocuments({...filterDocuments, dateFrom: e.target.value})} style={inputStyle} />
            <input type="date" placeholder="Date fin" value={filterDocuments.dateTo} onChange={(e) => setFilterDocuments({...filterDocuments, dateTo: e.target.value})} style={inputStyle} />
            <button onClick={() => setFilterDocuments({ reference: '', bordereauReference: '', client: '', type: '', statut: '', gestionnaire: '', dateFrom: '', dateTo: '' })} style={btnStyle('danger')}>Effacer</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
              <thead>
                <tr style={{ background: T.ink900 }}>
                  <th style={thStyle}>
                    <input 
                      type="checkbox" 
                      checked={selectedDossiers.length === filteredDocuments.length && filteredDocuments.length > 0}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={thStyle}>Réf. Dossier</th>
                  <th style={thStyle}>Réf. Bordereau</th>
                  <th style={thStyle}>Client</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Statut Dossier</th>
                  <th style={thStyle}>Gestionnaire</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocumentsTable.slice((documentsPage - 1) * documentsPerPage, documentsPage * documentsPerPage).map((document, index) => {
                  const pair = document.statut === 'Traité' ? getSemanticPair('ok') : document.statut === 'En cours' ? getSemanticPair('warn') : getSemanticPair('info');
                  return (
                  <tr key={document.id} style={{ background: index % 2 === 0 ? T.surface : '#FAFBFD', borderBottom: `1px solid ${T.line}` }}>
                    <td style={tdStyle}>
                      <input 
                        type="checkbox" 
                        checked={selectedDossiers.includes(document.id)}
                        onChange={() => handleSelectDossier(document.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={refCellStyle}>{document.reference}</td>
                    <td style={{ ...refCellStyle, color: T.purple }}>{(document as any).bordereauReference || 'N/A'}</td>
                    <td style={tdStyle}>{document.client}</td>
                    <td style={tdStyle}>{document.type}</td>
                    <td style={tdStyle}>
                      <span style={statusPillStyle(pair.bg, pair.fg)}>
                        {document.statut}
                      </span>
                    </td>
                    <td style={tdStyle}>{document.gestionnaire || 'Non assigné'}</td>
                    <td style={{ ...tdStyle, fontFamily: T.mono }}>{document.date}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button 
                          onClick={() => handleViewPDF(document.id)}
                          style={linkBtnStyle(T.info)}
                          title="Voir PDF du document"
                        >
                          Voir PDF
                        </button>
                        <button onClick={() => handleMarkAsTraite(document.id)} style={{ ...btnStyle('ok'), padding: '4px 9px', fontSize: 11, borderRadius: 5 }} title="Marquer comme Traité">✓ Traité</button>
                        <button 
                          onClick={() => handleRemoveDocument(document.id)}
                          style={linkBtnStyle(T.danger)}
                          title="Retirer du bordereau"
                        >
                          Retirer
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
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', gap: '8px' }}>
              <button
                onClick={() => setDocumentsPage(prev => Math.max(1, prev - 1))}
                disabled={documentsPage === 1}
                style={paginationBtnStyle(documentsPage === 1)}
              >
                ← Précédent
              </button>
              <span style={{ padding: '8px 16px', fontSize: 13, color: T.ink500, fontFamily: T.sans }}>
                Page {documentsPage} sur {Math.ceil(filteredDocumentsTable.length / documentsPerPage)}
              </span>
              <button
                onClick={() => setDocumentsPage(prev => Math.min(Math.ceil(filteredDocumentsTable.length / documentsPerPage), prev + 1))}
                disabled={documentsPage >= Math.ceil(filteredDocumentsTable.length / documentsPerPage)}
                style={paginationBtnStyle(documentsPage >= Math.ceil(filteredDocumentsTable.length / documentsPerPage))}
              >
                Suivant →
              </button>
            </div>
          )}
        </div>

        {/* Documents Réaffectés Section */}
        <div style={{ ...panelStyle, borderTop: `3px solid ${T.info}`, background: T.infoBg }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: T.info, margin: 0, fontFamily: T.sans }}>↻ Documents Réaffectés à Moi</h3>
            <button onClick={loadReassignedDocuments} style={btnStyle('info')}>↻ Actualiser</button>
          </div>
          <div style={{ background: T.surface, borderRadius: 8, padding: '12px', marginBottom: '12px', border: `1px solid ${T.line}` }}>
            <div style={{ display: 'flex', gap: '24px', fontFamily: T.sans, fontSize: 13 }}>
              <div><strong style={{ color: T.ink700 }}>Total:</strong> <span style={{ fontFamily: T.mono }}>{Array.isArray(reassignedDocs) ? reassignedDocs.length : 0}</span> document(s)</div>
              <div style={{ color: T.danger }}><strong>🔴 En retard:</strong> <span style={{ fontFamily: T.mono }}>{Array.isArray(reassignedDocs) ? reassignedDocs.filter(d => d.isOverdue).length : 0}</span></div>
              <div style={{ color: T.ok }}><strong>🟢 À jour:</strong> <span style={{ fontFamily: T.mono }}>{Array.isArray(reassignedDocs) ? reassignedDocs.filter(d => !d.isOverdue).length : 0}</span></div>
            </div>
          </div>
          {loadingReassigned ? (
            <div style={{ textAlign: 'center', padding: '40px', color: T.ink500, fontFamily: T.sans }}>Chargement...</div>
          ) : !Array.isArray(reassignedDocs) || reassignedDocs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: T.ink500, background: T.surface, borderRadius: 8, fontFamily: T.sans, border: `1px solid ${T.line}` }}>Aucun document réaffecté</div>
          ) : (
            <div style={{ overflowX: 'auto', background: T.surface, borderRadius: 8, border: `1px solid ${T.line}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: T.ink900 }}>
                    <th style={thStyle}>Document</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Bordereau</th>
                    <th style={thStyle}>Client</th>
                    <th style={thStyle}>Assigné le</th>
                    <th style={thStyle}>Statut</th>
                    <th style={thStyle}>Délai</th>
                  </tr>
                </thead>
                <tbody>
                  {reassignedDocs.slice((reassignedDocsPage - 1) * REASSIGNED_PAGE_SIZE, reassignedDocsPage * REASSIGNED_PAGE_SIZE).map((doc, index) => {
                    const pair = doc.status === 'TRAITE' ? getSemanticPair('ok') : doc.status === 'EN_COURS' ? getSemanticPair('warn') : getSemanticPair('info');
                    return (
                    <tr key={doc.id} style={{ background: index % 2 === 0 ? T.surface : '#FAFBFD', borderBottom: `1px solid ${T.line}` }}>
                      <td style={tdStyle}>{doc.name}</td>
                      <td style={tdStyle}>{doc.type}</td>
                      <td style={refCellStyle}>{doc.bordereauReference}</td>
                      <td style={tdStyle}>{doc.clientName}</td>
                      <td style={{ ...tdStyle, fontFamily: T.mono }}>{new Date(doc.assignedAt).toLocaleDateString()}</td>
                      <td style={tdStyle}>
                        <span style={statusPillStyle(pair.bg, pair.fg)}>{doc.status}</span>
                      </td>
                      <td style={{ ...tdStyle, color: doc.isOverdue ? T.danger : T.ok, fontWeight: 700, fontFamily: T.mono }}>{doc.daysRemaining}j restants</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {reassignedDocs.length > REASSIGNED_PAGE_SIZE && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '12px', padding: '12px', background: T.surface, borderRadius: 8, border: `1px solid ${T.line}` }}>
              <button onClick={() => setReassignedDocsPage(p => Math.max(1, p - 1))} disabled={reassignedDocsPage === 1} style={paginationBtnStyle(reassignedDocsPage === 1)}>← Précédent</button>
              <span style={{ fontSize: 12, color: T.ink500, fontFamily: T.sans }}>Page {reassignedDocsPage} sur {Math.ceil(reassignedDocs.length / REASSIGNED_PAGE_SIZE)}</span>
              <button onClick={() => setReassignedDocsPage(p => Math.min(Math.ceil(reassignedDocs.length / REASSIGNED_PAGE_SIZE), p + 1))} disabled={reassignedDocsPage >= Math.ceil(reassignedDocs.length / REASSIGNED_PAGE_SIZE)} style={paginationBtnStyle(reassignedDocsPage >= Math.ceil(reassignedDocs.length / REASSIGNED_PAGE_SIZE))}>Suivant →</button>
            </div>
          )}
        </div>

        {/* Liste Dossiers Section */}
        <div style={panelStyle}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: T.ink700, marginBottom: '16px', fontFamily: T.sans }}>Liste Dossiers</h3>
          <DossiersList params={{}} />
        </div>

      </div>
      
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
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.brand, fontFamily: T.sans }}>
                  {currentDossier?.reference} - {currentDossier?.client}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: T.ink500, fontFamily: T.sans }}>
                  Type: {currentDossier?.type} | Statut: {currentDossier?.statut}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
      
      {/* Add Document Modal */}
      {showAddDocumentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15,27,45,0.55)',
          zIndex: 1002,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: T.surface,
            borderRadius: 10,
            padding: '22px',
            maxWidth: '500px',
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
                📎 Ajouter des Documents
              </h3>
              <button
                onClick={() => setShowAddDocumentModal(false)}
                disabled={uploadingDocument}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: uploadingDocument ? 'not-allowed' : 'pointer',
                  color: T.ink500
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: 13, 
                fontWeight: 700, 
                marginBottom: '8px',
                color: T.ink700,
                fontFamily: T.sans
              }}>
                Sélectionner un ou plusieurs fichiers (sans limite) :
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onChange={handleUploadDocument}
                disabled={uploadingDocument}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `2px dashed ${T.line}`,
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: T.sans,
                  cursor: uploadingDocument ? 'not-allowed' : 'pointer'
                }}
              />
              <p style={{ fontSize: 12, color: T.ink500, marginTop: '8px', fontFamily: T.sans }}>
                Vous pouvez sélectionner plusieurs fichiers à la fois (Ctrl/Cmd + clic, ou glisser une sélection).
              </p>
              {uploadingDocument && (
                <div style={{ marginTop: '12px', textAlign: 'center', color: T.ink500, fontFamily: T.sans }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
                  <p>Upload de {uploadingCount} fichier(s) en cours...</p>
                </div>
              )}
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '14px',
              borderTop: `1px solid ${T.line}`
            }}>
              <button
                onClick={() => setShowAddDocumentModal(false)}
                disabled={uploadingDocument}
                style={btnStyle('neutral', uploadingDocument)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Retour Scan Modal */}
      {showRetourScanModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15,27,45,0.55)',
          zIndex: 1002,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: T.surface,
            borderRadius: 10,
            padding: '22px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
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
                ↩️ Retour vers l'équipe Scan
              </h3>
              <button
                onClick={() => setShowRetourScanModal(false)}
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
            
            {/* Return Type Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: 13, 
                fontWeight: 700, 
                marginBottom: '12px',
                color: T.ink700,
                fontFamily: T.sans
              }}>
                Type de retour:
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    setRetourScanType('bordereau');
                    setSelectedDocumentsForRetour([]);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: retourScanType === 'bordereau' ? `2px solid ${T.brand}` : `1px solid ${T.line}`,
                    borderRadius: 6,
                    background: retourScanType === 'bordereau' ? T.dangerBg : T.surface,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontFamily: T.sans,
                    fontWeight: retourScanType === 'bordereau' ? 700 : 400,
                    color: retourScanType === 'bordereau' ? T.brand : T.ink700
                  }}
                >
                  📋 Bordereau complet
                </button>
                <button
                  onClick={() => setRetourScanType('documents')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: retourScanType === 'documents' ? `2px solid ${T.brand}` : `1px solid ${T.line}`,
                    borderRadius: 6,
                    background: retourScanType === 'documents' ? T.dangerBg : T.surface,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontFamily: T.sans,
                    fontWeight: retourScanType === 'documents' ? 700 : 400,
                    color: retourScanType === 'documents' ? T.brand : T.ink700
                  }}
                >
                  📄 Documents spécifiques
                </button>
              </div>
            </div>

            {/* Document Selection (only if documents type selected) */}
            {retourScanType === 'documents' && bordereauDocuments.length > 0 && (
              <div style={{ marginBottom: '20px', padding: '12px', background: T.canvas, borderRadius: 8 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: 13, 
                  fontWeight: 700, 
                  marginBottom: '12px',
                  color: T.ink700,
                  fontFamily: T.sans
                }}>
                  Sélectionner les documents à retourner:
                </label>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {bordereauDocuments.map((doc: any) => (
                    <div key={doc.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px',
                      marginBottom: '6px',
                      background: T.surface,
                      border: `1px solid ${T.line}`,
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setSelectedDocumentsForRetour(prev => 
                        prev.includes(doc.id) 
                          ? prev.filter(id => id !== doc.id)
                          : [...prev, doc.id]
                      );
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedDocumentsForRetour.includes(doc.id)}
                        onChange={() => {}}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, fontFamily: T.sans, color: T.ink900 }}>{doc.name}</div>
                        <div style={{ fontSize: 11, color: T.ink500, fontFamily: T.sans }}>{doc.type}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '8px', fontSize: 12, color: T.ink500, fontFamily: T.sans }}>
                  {selectedDocumentsForRetour.length} document(s) sélectionné(s)
                </div>
              </div>
            )}

            {retourScanType === 'documents' && bordereauDocuments.length === 0 && (
              <div style={{ marginBottom: '20px', padding: '12px', background: T.warnBg, borderRadius: 8, fontSize: 13, color: T.warn, fontFamily: T.sans }}>
                ⚠️ Aucun document disponible pour ce bordereau
              </div>
            )}
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: 13, 
                fontWeight: 700, 
                marginBottom: '8px',
                color: T.ink700,
                fontFamily: T.sans
              }}>
                Raison du retour vers l'équipe Scan:
              </label>
              <textarea
                value={retourScanReason}
                onChange={(e) => setRetourScanReason(e.target.value)}
                placeholder="Veuillez expliquer la raison du retour..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  border: `1px solid ${T.line}`,
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: T.sans,
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '14px',
              borderTop: `1px solid ${T.line}`
            }}>
              <button
                onClick={() => setShowRetourScanModal(false)}
                style={btnStyle('neutral')}
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmRetourScan}
                disabled={!retourScanReason.trim() || (retourScanType === 'documents' && selectedDocumentsForRetour.length === 0)}
                style={{
                  background: (retourScanReason.trim() && (retourScanType === 'bordereau' || selectedDocumentsForRetour.length > 0)) ? T.brand : T.ink300,
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 6,
                  cursor: (retourScanReason.trim() && (retourScanType === 'bordereau' || selectedDocumentsForRetour.length > 0)) ? 'pointer' : 'not-allowed',
                  fontSize: 13,
                  fontFamily: T.sans,
                  fontWeight: 700
                }}
              >
                Confirmer le retour
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default ChefEquipeDashboard;