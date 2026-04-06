import { useEffect, useState, useMemo } from "react";
import { useAuth } from '../../contexts/AuthContext';
import { LocalAPI } from '../../services/axios';
import "../../styles/chef-equipe.css";
import BSAIPage from '../bs/BSAIPage';
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
  const [derniersPage, setDerniersPage] = useState(1);
  const [bordereauxPage, setBordereauxPage] = useState(1);
  const [documentsPage, setDocumentsPage] = useState(1);
  const derniersPerPage = 5;
  const bordereauxPerPage = 5;
  const documentsPerPage = 20;
  const [reassignedDocs, setReassignedDocs] = useState<any[]>([]);
  const [reassignedByMember, setReassignedByMember] = useState<Record<string, { name: string; count: number }>>({});
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
    console.log('🔄 Applying filters with dossiers:', dossiers.length);
    applyFilters();
  }, [typeFilter, societeFilter, statutFilter, searchQuery, dossiers, documents]);

  // Apply table-specific filters
  useEffect(() => {
    const f1 = dossiers.filter((d: any) => {
      const refMatch = !filterDerniers.reference || String(d.reference || '').trim().toLowerCase().includes(filterDerniers.reference.trim().toLowerCase());
      if (filterDerniers.reference && !refMatch) {
        console.log('❌ No match:', d.reference, 'vs', filterDerniers.reference);
      }
      return refMatch &&
        (!filterDerniers.client || String(d.client || '').trim().toLowerCase().includes(filterDerniers.client.trim().toLowerCase())) &&
        (!filterDerniers.type || d.type === filterDerniers.type) &&
        (!filterDerniers.statut || d.statut === filterDerniers.statut) &&
        (!filterDerniers.dateFrom || new Date(d.date) >= new Date(filterDerniers.dateFrom)) &&
        (!filterDerniers.dateTo || new Date(d.date) <= new Date(filterDerniers.dateTo));
    });
    console.log('🔍 Filtered Derniers:', f1.length, 'from', dossiers.length);
    setFilteredDerniersTable(f1);
    setDerniersPage(1);

    const f2 = dossiers.filter((d: any) =>
      (!filterBordereaux.reference || d.reference.toLowerCase().includes(filterBordereaux.reference.toLowerCase())) &&
      (!filterBordereaux.client || d.client.toLowerCase().includes(filterBordereaux.client.toLowerCase())) &&
      (!filterBordereaux.statut || d.statut === filterBordereaux.statut) &&
      (!filterBordereaux.dateFrom || new Date(d.date) >= new Date(filterBordereaux.dateFrom)) &&
      (!filterBordereaux.dateTo || new Date(d.date) <= new Date(filterBordereaux.dateTo))
    );
    setFilteredBordereauxTable(f2);

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
  }, [filterDerniers, filterBordereaux, filterDocuments, dossiers, documents]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      console.log('🔄 Loading dashboard data...');
      console.log('📡 API calls:');
      console.log('  - /bordereaux/chef-equipe/dashboard-stats-dossiers');
      console.log('  - /bordereaux/chef-equipe/dashboard-dossiers');
      console.log('  - /bordereaux/chef-equipe/gestionnaire-assignments-dossiers');
      
      // Load real data from backend using LocalAPI with auth
      const [statsResponse, dossiersResponse, documentsResponse, assignmentsResponse, seniorAssignmentsResponse] = await Promise.all([
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/types-detail'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/derniers-dossiers'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/documents-individuels'),
        LocalAPI.get('/bordereaux/chef-equipe/gestionnaire-assignments-dossiers'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/gestionnaire-senior-assignments')
      ]);
      
      console.log('📊 Raw API Responses:');
      console.log('  Stats Response:', statsResponse);
      console.log('  Dossiers Response:', dossiersResponse);
      console.log('  Assignments Response:', assignmentsResponse);
      
      console.log('🔍 FULL API RESPONSES:');
      console.log('Stats Response:', JSON.stringify(statsResponse, null, 2));
      console.log('Dossiers Response:', JSON.stringify(dossiersResponse, null, 2));
      console.log('Assignments Response:', JSON.stringify(assignmentsResponse, null, 2));
      
      if (!dossiersResponse.data && statsResponse.data) {
        console.log('📊 Stats received:', statsResponse.data);
        // Fallback if no dossiers data
        const transformedStats = {
          prestation: {
            total: statsResponse.data.Prestation?.total || 0,
            breakdown: {},
            gestionnaireBreakdown: {}
          },
          adhesion: {
            total: statsResponse.data.Adhésion?.total || 0,
            breakdown: {},
            gestionnaireBreakdown: {}
          },
          complement: {
            total: statsResponse.data['Complément Dossier']?.total || 0,
            breakdown: {},
            gestionnaireBreakdown: {}
          },
          resiliation: {
            total: 0,
            breakdown: {},
            gestionnaireBreakdown: {}
          },
          reclamation: {
            total: statsResponse.data.Réclamation?.total || 0,
            breakdown: {},
            gestionnaireBreakdown: {}
          },
          avenant: {
            total: statsResponse.data.Avenant?.total || 0,
            breakdown: {},
            gestionnaireBreakdown: {}
          }
        };
        setStats(transformedStats);
      } else if (!statsResponse.data) {
        console.warn('⚠️ No stats data received');
      }
      
      if (dossiersResponse.data) {
        console.log('📄 Dossiers received:', dossiersResponse.data.length, dossiersResponse.data);
        console.log('📄 First dossier structure:', dossiersResponse.data[0]);
        setDossiers(dossiersResponse.data);
      }
      
      if (documentsResponse.data) {
        console.log('📄 Documents received:', documentsResponse.data.length, documentsResponse.data);
        console.log('📄 First document structure:', documentsResponse.data[0]);
        setDocuments(documentsResponse.data);
        setFilteredDocuments(documentsResponse.data);
        
        // Extract unique societes from dossiers
        const uniqueSocietes = [...new Set(dossiersResponse.data.map((d: Dossier) => d.client).filter(Boolean))] as string[];
        setSocietes(uniqueSocietes.sort());
        console.log('🏢 Unique societes:', uniqueSocietes);
        
        // Use complete breakdown data from backend
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
      } else {
        console.warn('⚠️ No dossiers data received');
        console.log('⚠️ Dossiers response structure:', dossiersResponse);
      }
      
      if (assignmentsResponse.data) {
        console.log('👥 Gestionnaire assignments received:', assignmentsResponse.data.length, assignmentsResponse.data);
        console.log('👥 First assignment returnedBy:', assignmentsResponse.data[0]?.returnedBy);
        setGestionnaireAssignments(assignmentsResponse.data);
        
        // Extract unique gestionnaire names for filter
        const uniqueGestionnaires = [...new Set(assignmentsResponse.data.map((a: any) => a.gestionnaire))].sort() as string[];
        setAvailableGestionnaires(uniqueGestionnaires);
        console.log('👤 Unique gestionnaires:', uniqueGestionnaires);
      } else {
        console.warn('⚠️ No assignments data received');
      }
      
      if (seniorAssignmentsResponse.data) {
        console.log('⭐ Gestionnaire Senior assignments received:', seniorAssignmentsResponse.data.length, seniorAssignmentsResponse.data);
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
    console.log('🔍 Starting filter with dossiers:', dossiers.length);
    let filtered = [...dossiers];
    console.log('🔍 Initial filtered:', filtered.length);
    
    if (typeFilter !== 'Tous') {
      filtered = filtered.filter(d => d.type === typeFilter);
      console.log('🔍 After type filter:', filtered.length);
    }
    
    if (societeFilter !== 'Toutes') {
      filtered = filtered.filter(d => d.client === societeFilter);
      console.log('🔍 After societe filter:', filtered.length);
    }
    
    if (statutFilter !== 'Tous') {
      filtered = filtered.filter(d => d.statut === statutFilter);
      console.log('🔍 After statut filter:', filtered.length);
    }
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(d => 
        d.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.client && d.client.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      console.log('🔍 After search filter:', filtered.length);
    }
    
    console.log('🔍 Final filtered dossiers:', filtered.length, filtered);
    setFilteredDossiers(filtered);
    
    // Apply same filters to documents (Dossiers Individuels table)
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
    
    console.log('🔍 Final filtered documents:', filteredDocs.length, filteredDocs);
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
        // Reload data to reflect changes
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
        // Find the dossier details
        const dossier = filteredDossiers.find(d => d.id === dossierId);
        
        // Set modal data and show modal
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
    
    // Load documents for this bordereau
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

  const handleUploadDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedBordereauForDoc) return;

    setUploadingDocument(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bordereauId', selectedBordereauForDoc);

    try {
      const response = await LocalAPI.post('/bordereaux/chef-equipe/upload-document-to-bordereau', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        alert('Document uploadé et ajouté avec succès');
        setShowAddDocumentModal(false);
        setSelectedBordereauForDoc(null);
        loadDashboardData();
      }
    } catch (error) {
      console.error('Upload document error:', error);
      alert('Erreur lors de l\'upload du document');
    } finally {
      setUploadingDocument(false);
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

  const getPriorityColor = (priorite?: string) => {
    switch (priorite) {
      case 'Très': case 'Élevée': return '#f44336';
      case 'Moyenne': return '#ff9800';
      default: return '#4caf50';
    }
  };

  if (loading) {
    return (
      <div className="chef-equipe-container">
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: '#666', fontSize: '18px' }}>Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header Bar (Red Background) */}
      <div style={{ background: '#d52b36', color: 'white', padding: '20px 0', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0 }}>Dashboard Chef d'équipe</h1>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>

        {/* Statistics Section (Cards Row) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {/* Prestation Card */}
          <div style={{ background: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Prestation</h3>
              <span style={{ background: '#d52b36', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>{stats.prestation?.total || 0}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>Par client:</div>
              {Object.entries(stats.prestation?.breakdown || {}).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                  <span>{key}:</span> <span>{value}</span>
                </div>
              ))}
              <div style={{ fontWeight: 'bold', marginTop: '6px', marginBottom: '4px', color: '#333' }}>Par gestionnaire:</div>
              {Object.entries(stats.prestation?.gestionnaireBreakdown || {}).map(([key, value]) => {
                const memberEntry = Object.values(reassignedByMember).find(m => m.name === key);
                const reassignedCount = memberEntry ? memberEntry.count : 0;
                const totalCount = (value as number) + reassignedCount;
                return (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                    <span>{key}:</span> 
                    <span>
                      {totalCount}
                      {reassignedCount > 0 && <span style={{ color: '#2196f3', fontSize: '10px', marginLeft: '4px' }}>(🔄{reassignedCount})</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Adhésion Card */}
          <div style={{ background: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Adhésion</h3>
              <span style={{ background: '#d52b36', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>{stats.adhesion?.total || 0}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {Object.entries(stats.adhesion?.breakdown || {}).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>{key}:</span> <span>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Complément de dossier Card */}
          <div style={{ background: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Complément de dossier</h3>
              <span style={{ background: '#2196f3', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>{stats.complement?.total || 0}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {Object.entries(stats.complement?.breakdown || {}).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>{key}:</span> <span>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Résiliation Card */}
          <div style={{ background: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Résiliation</h3>
              <span style={{ background: '#d52b36', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>{stats.resiliation?.total || 0}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {Object.entries(stats.resiliation?.breakdown || {}).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>{key}:</span> <span>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Réclamation Card */}
          <div style={{ background: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Réclamation</h3>
              <span style={{ background: '#d52b36', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>{stats.reclamation?.total || 0}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {Object.entries(stats.reclamation?.breakdown || {}).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>{key}:</span> <span>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Avenant Card */}
          <div style={{ background: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Avenant</h3>
              <span style={{ background: '#d52b36', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>{stats.avenant?.total || 0}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {Object.entries(stats.avenant?.breakdown || {}).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>{key}:</span> <span>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filtres Section */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Type de document</label>
              <select 
                value={typeFilter} 
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
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
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Société</label>
              <select 
                value={societeFilter} 
                onChange={(e) => setSocieteFilter(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
              >
                <option value="Toutes">Toutes</option>
                {societes.map(societe => (
                  <option key={societe} value={societe}>{societe}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Statut</label>
              <select 
                value={statutFilter} 
                onChange={(e) => setStatutFilter(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
              >
                <option value="Tous">Tous</option>
                <option value="Nouveau">Nouveau</option>
                <option value="En cours">En cours</option>
                <option value="Traité">Traité</option>
                <option value="Retourné">Retourné</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Recherche</label>
              <input
                type="text"
                placeholder="Référence ou nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
              />
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button 
              onClick={handleExport}
              style={{ background: '#d52b36', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '14px', cursor: 'pointer' }}
            >
              Exporter
            </button>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Transférer vers:</span>
            <button onClick={() => handleTransfer('Prestation')} style={{ background: '#2196f3', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Prestation</button>
            <button onClick={() => handleTransfer('Complément')} style={{ background: '#2196f3', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Complément</button>
            <button onClick={() => handleTransfer('Adhésion')} style={{ background: '#2196f3', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Adhésion</button>
            <button onClick={() => handleTransfer('Résiliation')} style={{ background: '#2196f3', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Résiliation</button>
            <button onClick={() => handleTransfer('Avenant')} style={{ background: '#2196f3', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Avenant</button>
            <button onClick={() => handleTransfer('Réclamation')} style={{ background: '#2196f3', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Réclamation</button>
          </div>
        </div>

        {/* Gestionnaire Assignments Section */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', margin: 0 }}>Affectations par Gestionnaire</h3>
            <select 
              value={gestionnaireFilter} 
              onChange={(e) => setGestionnaireFilter(e.target.value)}
              style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
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
              .map((assignment, index) => {
                console.log('🔍 Assignment data for', assignment.gestionnaire, ':', assignment);
                console.log('  - retournes:', assignment.retournes);
                console.log('  - returnedBy:', assignment.returnedBy);
                return (
              <div key={index} style={{ background: '#f8f9fa', borderRadius: '6px', padding: '12px', border: '1px solid #dee2e6' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', color: '#495057' }}>
                  {assignment.gestionnaire}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '6px' }}>
                  <strong>Total affectés:</strong> {assignment.totalAssigned}
                </div>
                <div style={{ fontSize: '12px', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#28a745' }}>✓ Traités:</span>
                    <span style={{ fontWeight: 'bold' }}>{assignment.traites || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#ffc107' }}>⏳ En cours:</span>
                    <span style={{ fontWeight: 'bold' }}>{assignment.enCours || 0}</span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#dc3545' }}>↩ Retournés:</span>
                      <span style={{ fontWeight: 'bold' }}>{assignment.retournes || 0}</span>
                    </div>
                    {assignment.returnedBy && (assignment.retournes || 0) > 0 && (
                      <div style={{ fontSize: '11px', color: '#dc3545', fontWeight: 'bold', marginLeft: '16px', marginTop: '2px' }}>
                        → Retourné par: {assignment.returnedBy}
                      </div>
                    )}
                    {(() => {
                      const memberEntry = Object.values(reassignedByMember).find(m => m.name === assignment.gestionnaire);
                      return memberEntry ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                          <span style={{ color: '#2196f3' }}>🔄 Réaffectés:</span>
                          <span style={{ fontWeight: 'bold', color: '#2196f3' }}>{memberEntry.count}</span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#6c757d' }}>
                  <strong>Par type:</strong> {Object.entries(assignment.documentsByType || {}).map(([type, count]) => `${type}: ${count}`).join(', ') || 'Aucun'}
                </div>
              </div>
            );
              })}
          </div>
        </div>

        {/* Gestionnaire Senior Section - Commented out as per requirement */}
        {/* <div style={{ background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)', borderRadius: '8px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(76,175,80,0.2)', border: '2px solid #4caf50' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#2e7d32', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>⭐</span>
              Gestionnaires Senior
            </h3>
            <div style={{ background: '#4caf50', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>
              {gestionnaireSeniorAssignments.length} Senior(s)
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {gestionnaireSeniorAssignments.map((assignment, index) => (
              <div key={index} style={{ background: 'white', borderRadius: '8px', padding: '14px', border: '2px solid #4caf50', boxShadow: '0 2px 6px rgba(76,175,80,0.15)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '10px', color: '#2e7d32', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '18px' }}>👤</span>
                  {assignment.gestionnaire}
                </div>
                <div style={{ fontSize: '13px', color: '#388e3c', marginBottom: '8px', fontWeight: '600' }}>
                  <strong>Total affectés:</strong> {assignment.totalAssigned}
                </div>
                <div style={{ fontSize: '12px', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ color: '#4caf50', fontWeight: '500' }}>✓ Traités:</span>
                    <span style={{ fontWeight: 'bold', color: '#2e7d32' }}>{assignment.traites || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ color: '#ff9800', fontWeight: '500' }}>⏳ En cours:</span>
                    <span style={{ fontWeight: 'bold', color: '#f57c00' }}>{assignment.enCours || 0}</span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', marginBottom: '4px' }}>
                      <span style={{ color: '#dc3545', fontWeight: '500' }}>↩ Retournés:</span>
                      <span style={{ fontWeight: 'bold', color: '#c62828' }}>{assignment.retournes || 0}</span>
                    </div>
                    {assignment.returnedBy && (assignment.retournes || 0) > 0 && (
                      <div style={{ fontSize: '11px', color: '#dc3545', fontWeight: 'bold', marginLeft: '16px', marginTop: '2px', background: '#ffebee', padding: '4px 8px', borderRadius: '4px' }}>
                        → Retourné par: {assignment.returnedBy}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#388e3c', background: '#e8f5e9', padding: '6px 8px', borderRadius: '4px', marginTop: '8px' }}>
                  <strong>Par type:</strong> {Object.entries(assignment.documentsByType || {}).map(([type, count]) => `${type}: ${count}`).join(', ') || 'Aucun'}
                </div>
              </div>
            ))}
            {gestionnaireSeniorAssignments.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: '#66bb6a', fontSize: '14px', gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>📋</div>
                <p style={{ margin: 0 }}>Aucun Gestionnaire Senior pour le moment</p>
              </div>
            )}
          </div>
        </div> */}

        {/* Derniers Bordereaux Ajoutés Section */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '16px' }}>Derniers Bordereaux Ajoutés</h3>
          {/* Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
            <input type="text" placeholder="Référence" value={filterDerniers.reference} onChange={(e) => setFilterDerniers({...filterDerniers, reference: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <input type="text" placeholder="Client" value={filterDerniers.client} onChange={(e) => setFilterDerniers({...filterDerniers, client: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <select value={filterDerniers.type} onChange={(e) => setFilterDerniers({...filterDerniers, type: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}>
              <option value="">Tous types</option>
              {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterDerniers.statut} onChange={(e) => setFilterDerniers({...filterDerniers, statut: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}>
              <option value="">Tous statuts</option>
              {uniqueStatuts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="date" placeholder="Date début" value={filterDerniers.dateFrom} onChange={(e) => setFilterDerniers({...filterDerniers, dateFrom: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <input type="date" placeholder="Date fin" value={filterDerniers.dateTo} onChange={(e) => setFilterDerniers({...filterDerniers, dateTo: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <button onClick={() => setFilterDerniers({ reference: '', client: '', type: '', statut: '', dateFrom: '', dateTo: '' })} style={{ padding: '6px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>Effacer</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Référence</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Client</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Type</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>% Finalisation</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>États Dossiers</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Date</th>
                  {/* <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Actions</th> */}
                </tr>
              </thead>
              <tbody>
                {filteredDerniersTable.slice((derniersPage - 1) * derniersPerPage, derniersPage * derniersPerPage).map((dossier, index) => {
                  // Use dynamic completion percentage from backend
                  const completionPercentage = dossier.completionPercentage || 0;
                  // Use dynamic states from backend
                  const dossierStates = dossier.dossierStates || [dossier.statut];
                  return (
                    <tr key={`recent-${dossier.id}`} style={{ background: index % 2 === 0 ? '#ffffff' : '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: '600', color: '#0066cc' }}>{dossier.reference}</td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>{dossier.client}</td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>{dossier.type}</td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '40px', height: '6px', background: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${completionPercentage}%`, height: '100%', background: completionPercentage >= 80 ? '#4caf50' : completionPercentage >= 50 ? '#ff9800' : '#f44336' }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{completionPercentage}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {dossierStates.length > 0 ? dossierStates.map((state, idx) => (
                            <span key={idx} style={{ background: state === 'Traité' ? '#4caf50' : state === 'En cours' ? '#ff9800' : '#f44336', color: 'white', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }}>
                              {state}
                            </span>
                          )) : <span style={{ fontSize: '12px', color: '#999' }}>-</span>}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>{dossier.date}</td>
                      {/* <td style={{ padding: '12px 8px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => handleModifyStatus(dossier.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} title="Modifier Statut">✏️</button>
                        </div>
                      </td> */}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination for Derniers Bordereaux */}
          {filteredDerniersTable.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', gap: '8px' }}>
              <button
                onClick={() => setDerniersPage(prev => Math.max(1, prev - 1))}
                disabled={derniersPage === 1}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: derniersPage === 1 ? '#f5f5f5' : 'white',
                  color: derniersPage === 1 ? '#999' : '#333',
                  cursor: derniersPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                ← Précédent
              </button>
              <span style={{ padding: '8px 16px', fontSize: '14px', color: '#666' }}>
                Page {derniersPage} sur {Math.ceil(filteredDerniersTable.length / derniersPerPage)}
              </span>
              <button
                onClick={() => setDerniersPage(prev => Math.min(Math.ceil(filteredDerniersTable.length / derniersPerPage), prev + 1))}
                disabled={derniersPage >= Math.ceil(filteredDerniersTable.length / derniersPerPage)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: derniersPage >= Math.ceil(filteredDerniersTable.length / derniersPerPage) ? '#f5f5f5' : 'white',
                  color: derniersPage >= Math.ceil(filteredDerniersTable.length / derniersPerPage) ? '#999' : '#333',
                  cursor: derniersPage >= Math.ceil(filteredDerniersTable.length / derniersPerPage) ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Suivant →
              </button>
            </div>
          )}
        </div>

        {/* Bordereaux en cours Section */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '16px' }}>Bordereaux</h3>
          {/* Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
            <input type="text" placeholder="Référence" value={filterBordereaux.reference} onChange={(e) => setFilterBordereaux({...filterBordereaux, reference: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <input type="text" placeholder="Client" value={filterBordereaux.client} onChange={(e) => setFilterBordereaux({...filterBordereaux, client: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <select value={filterBordereaux.statut} onChange={(e) => setFilterBordereaux({...filterBordereaux, statut: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}>
              <option value="">Tous statuts</option>
              {uniqueStatuts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="date" placeholder="Date début" value={filterBordereaux.dateFrom} onChange={(e) => setFilterBordereaux({...filterBordereaux, dateFrom: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <input type="date" placeholder="Date fin" value={filterBordereaux.dateTo} onChange={(e) => setFilterBordereaux({...filterBordereaux, dateTo: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <button onClick={() => setFilterBordereaux({ reference: '', client: '', statut: '', dateFrom: '', dateTo: '' })} style={{ padding: '6px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>Effacer</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Référence</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Client</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Statut</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>% Finalisation</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>États Dossiers</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Priorité</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBordereauxTable.slice((bordereauxPage - 1) * bordereauxPerPage, bordereauxPage * bordereauxPerPage).map((dossier, index) => {
                  // Use dynamic completion percentage from backend
                  const completionPercentage = dossier.completionPercentage || 0;
                  // Use dynamic states from backend
                  const dossierStates = dossier.dossierStates || [dossier.statut];
                  return (
                    <tr key={`bordereau-${dossier.id}`} style={{ background: index % 2 === 0 ? '#ffffff' : '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: '600', color: '#0066cc' }}>{dossier.reference}</td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>{dossier.client}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ background: dossier.statut === 'Traité' ? '#4caf50' : dossier.statut === 'En cours' ? '#ff9800' : '#2196f3', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{dossier.statut}</span>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '40px', height: '6px', background: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${completionPercentage}%`, height: '100%', background: completionPercentage >= 80 ? '#4caf50' : completionPercentage >= 50 ? '#ff9800' : '#f44336' }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{completionPercentage}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {dossierStates.map((state, idx) => (
                            <span key={idx} style={{ background: state === 'Traité' ? '#4caf50' : state === 'En cours' ? '#ff9800' : '#f44336', color: 'white', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }}>
                              {state}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                        <span style={{ 
                          background: getPriorityColor(dossier.priorite), 
                          color: 'white', 
                          padding: '4px 8px', 
                          borderRadius: '12px', 
                          fontSize: '12px', 
                          fontWeight: 'bold' 
                        }}>
                          {dossier.priorite || 'Normale'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {/* <button onClick={() => handleMarkAsTraite(dossier.id)} style={{ background: '#4caf50', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }} title="Marquer comme Traité">✓ Traité</button> */}
                          <button onClick={() => handleRetourScan(dossier.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#9c27b0', textDecoration: 'underline' }} title="Retour Scan">Retour Scan</button>
                          <button onClick={() => handleAddDocument(dossier.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#4caf50', textDecoration: 'underline' }} title="Ajouter Document">+ Doc</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination for Bordereaux en cours */}
          {filteredBordereauxTable.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', gap: '8px' }}>
              <button
                onClick={() => setBordereauxPage(prev => Math.max(1, prev - 1))}
                disabled={bordereauxPage === 1}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: bordereauxPage === 1 ? '#f5f5f5' : 'white',
                  color: bordereauxPage === 1 ? '#999' : '#333',
                  cursor: bordereauxPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                ← Précédent
              </button>
              <span style={{ padding: '8px 16px', fontSize: '14px', color: '#666' }}>
                Page {bordereauxPage} sur {Math.ceil(filteredBordereauxTable.length / bordereauxPerPage)}
              </span>
              <button
                onClick={() => setBordereauxPage(prev => Math.min(Math.ceil(filteredBordereauxTable.length / bordereauxPerPage), prev + 1))}
                disabled={bordereauxPage >= Math.ceil(filteredBordereauxTable.length / bordereauxPerPage)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: bordereauxPage >= Math.ceil(filteredBordereauxTable.length / bordereauxPerPage) ? '#f5f5f5' : 'white',
                  color: bordereauxPage >= Math.ceil(filteredBordereauxTable.length / bordereauxPerPage) ? '#999' : '#333',
                  cursor: bordereauxPage >= Math.ceil(filteredBordereauxTable.length / bordereauxPerPage) ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Suivant →
              </button>
            </div>
          )}
        </div>

        {/* Dossiers Section (Table) */}
        <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px 12px 20px', borderBottom: '1px solid #e0e0e0' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', margin: 0 }}>Dossiers Individuels</h3>
            <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>Affichage par dossier (non par bordereau)</p>
          </div>
          {/* Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '8px', padding: '12px', background: '#f8f9fa' }}>
            <input type="text" placeholder="Réf. Dossier" value={filterDocuments.reference} onChange={(e) => setFilterDocuments({...filterDocuments, reference: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <input type="text" placeholder="Réf. Bordereau" value={filterDocuments.bordereauReference} onChange={(e) => setFilterDocuments({...filterDocuments, bordereauReference: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <input type="text" placeholder="Client" value={filterDocuments.client} onChange={(e) => setFilterDocuments({...filterDocuments, client: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <select value={filterDocuments.type} onChange={(e) => setFilterDocuments({...filterDocuments, type: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}>
              <option value="">Tous types</option>
              {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterDocuments.statut} onChange={(e) => setFilterDocuments({...filterDocuments, statut: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}>
              <option value="">Tous statuts</option>
              {uniqueStatuts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="text" placeholder="Gestionnaire" value={filterDocuments.gestionnaire} onChange={(e) => setFilterDocuments({...filterDocuments, gestionnaire: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <input type="date" placeholder="Date début" value={filterDocuments.dateFrom} onChange={(e) => setFilterDocuments({...filterDocuments, dateFrom: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <input type="date" placeholder="Date fin" value={filterDocuments.dateTo} onChange={(e) => setFilterDocuments({...filterDocuments, dateTo: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <button onClick={() => setFilterDocuments({ reference: '', bordereauReference: '', client: '', type: '', statut: '', gestionnaire: '', dateFrom: '', dateTo: '' })} style={{ padding: '6px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>Effacer</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#d52b36', color: 'white' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedDossiers.length === filteredDocuments.length && filteredDocuments.length > 0}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Réf. Dossier</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Réf. Bordereau</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Client</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Type</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Statut Dossier</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Gestionnaire</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Date</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocumentsTable.slice((documentsPage - 1) * documentsPerPage, documentsPage * documentsPerPage).map((document, index) => (
                  <tr key={document.id} style={{ background: index % 2 === 0 ? '#ffffff' : '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedDossiers.includes(document.id)}
                        onChange={() => handleSelectDossier(document.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: '600', color: '#0066cc' }}>{document.reference}</td>
                    <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: '600', color: '#9c27b0' }}>{(document as any).bordereauReference || 'N/A'}</td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>{document.client}</td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>{document.type}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ 
                        background: document.statut === 'Traité' ? '#4caf50' : document.statut === 'En cours' ? '#ff9800' : '#2196f3', 
                        color: 'white', 
                        padding: '4px 8px', 
                        borderRadius: '12px', 
                        fontSize: '12px', 
                        fontWeight: 'bold' 
                      }}>
                        {document.statut}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>{document.gestionnaire || 'Non assigné'}</td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>{document.date}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleViewPDF(document.id)}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#2196f3', 
                            cursor: 'pointer', 
                            fontSize: '12px',
                            textDecoration: 'underline'
                          }}
                          title="Voir PDF du document"
                        >
                          Voir PDF
                        </button>
                        <button onClick={() => handleMarkAsTraite(document.id)} style={{ background: '#4caf50', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }} title="Marquer comme Traité">✓ Traité</button>
                        {/* <button 
                          onClick={() => handleModifyStatus(document.id)}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#9c27b0', 
                            cursor: 'pointer', 
                            fontSize: '12px',
                            textDecoration: 'underline'
                          }}
                          title="Modifier statut du document"
                        >
                          Modifier Statut
                        </button> */}
                        <button 
                          onClick={() => handleRemoveDocument(document.id)}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#f44336', 
                            cursor: 'pointer', 
                            fontSize: '12px',
                            textDecoration: 'underline'
                          }}
                          title="Retirer du bordereau"
                        >
                          Retirer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination for Dossiers Individuels */}
          {filteredDocumentsTable.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', gap: '8px' }}>
              <button
                onClick={() => setDocumentsPage(prev => Math.max(1, prev - 1))}
                disabled={documentsPage === 1}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: documentsPage === 1 ? '#f5f5f5' : 'white',
                  color: documentsPage === 1 ? '#999' : '#333',
                  cursor: documentsPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                ← Précédent
              </button>
              <span style={{ padding: '8px 16px', fontSize: '14px', color: '#666' }}>
                Page {documentsPage} sur {Math.ceil(filteredDocumentsTable.length / documentsPerPage)}
              </span>
              <button
                onClick={() => setDocumentsPage(prev => Math.min(Math.ceil(filteredDocumentsTable.length / documentsPerPage), prev + 1))}
                disabled={documentsPage >= Math.ceil(filteredDocumentsTable.length / documentsPerPage)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: documentsPage >= Math.ceil(filteredDocumentsTable.length / documentsPerPage) ? '#f5f5f5' : 'white',
                  color: documentsPage >= Math.ceil(filteredDocumentsTable.length / documentsPerPage) ? '#999' : '#333',
                  cursor: documentsPage >= Math.ceil(filteredDocumentsTable.length / documentsPerPage) ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Suivant →
              </button>
            </div>
          )}
        </div>

        {/* Documents Réaffectés Section */}
        <div style={{ background: 'linear-gradient(135deg, #e3f2fd 0%, #2196f3 100%)', borderRadius: '8px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(33,150,243,0.3)', border: '2px solid #2196f3' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0d47a1', margin: 0 }}>🔄 Documents Réaffectés à Moi</h3>
            <button onClick={loadReassignedDocuments} style={{ background: '#2196f3', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>🔄 Actualiser</button>
          </div>
          <div style={{ background: 'white', borderRadius: '6px', padding: '12px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '24px' }}>
              <div><strong>Total:</strong> {Array.isArray(reassignedDocs) ? reassignedDocs.length : 0} document(s)</div>
              <div style={{ color: '#f44336' }}><strong>🔴 En retard:</strong> {Array.isArray(reassignedDocs) ? reassignedDocs.filter(d => d.isOverdue).length : 0}</div>
              <div style={{ color: '#4caf50' }}><strong>🟢 À jour:</strong> {Array.isArray(reassignedDocs) ? reassignedDocs.filter(d => !d.isOverdue).length : 0}</div>
            </div>
          </div>
          {loadingReassigned ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Chargement...</div>
          ) : !Array.isArray(reassignedDocs) || reassignedDocs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666', background: 'white', borderRadius: '6px' }}>Aucun document réaffecté</div>
          ) : (
            <div style={{ overflowX: 'auto', background: 'white', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', borderBottom: '2px solid #ddd' }}>Document</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', borderBottom: '2px solid #ddd' }}>Type</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', borderBottom: '2px solid #ddd' }}>Bordereau</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', borderBottom: '2px solid #ddd' }}>Client</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', borderBottom: '2px solid #ddd' }}>Assigné le</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', borderBottom: '2px solid #ddd' }}>Statut</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', borderBottom: '2px solid #ddd' }}>Délai</th>
                  </tr>
                </thead>
                <tbody>
                  {reassignedDocs.slice((reassignedDocsPage - 1) * REASSIGNED_PAGE_SIZE, reassignedDocsPage * REASSIGNED_PAGE_SIZE).map((doc, index) => (
                    <tr key={doc.id} style={{ background: index % 2 === 0 ? '#ffffff' : '#f9f9f9', borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>{doc.name}</td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>{doc.type}</td>
                      <td style={{ padding: '12px 8px', fontSize: '14px', color: '#2196f3' }}>{doc.bordereauReference}</td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>{doc.clientName}</td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>{new Date(doc.assignedAt).toLocaleDateString()}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ background: doc.status === 'TRAITE' ? '#4caf50' : doc.status === 'EN_COURS' ? '#ff9800' : '#2196f3', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{doc.status}</span>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px', color: doc.isOverdue ? '#f44336' : '#4caf50', fontWeight: 'bold' }}>{doc.daysRemaining}j restants</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {reassignedDocs.length > REASSIGNED_PAGE_SIZE && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '12px', padding: '12px', background: 'white', borderRadius: '6px' }}>
              <button onClick={() => setReassignedDocsPage(p => Math.max(1, p - 1))} disabled={reassignedDocsPage === 1} style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', background: reassignedDocsPage === 1 ? '#f5f5f5' : 'white', color: reassignedDocsPage === 1 ? '#999' : '#333', cursor: reassignedDocsPage === 1 ? 'not-allowed' : 'pointer', fontSize: '13px' }}>← Précédent</button>
              <span style={{ fontSize: '13px', color: '#666' }}>Page {reassignedDocsPage} sur {Math.ceil(reassignedDocs.length / REASSIGNED_PAGE_SIZE)}</span>
              <button onClick={() => setReassignedDocsPage(p => Math.min(Math.ceil(reassignedDocs.length / REASSIGNED_PAGE_SIZE), p + 1))} disabled={reassignedDocsPage >= Math.ceil(reassignedDocs.length / REASSIGNED_PAGE_SIZE)} style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', background: reassignedDocsPage >= Math.ceil(reassignedDocs.length / REASSIGNED_PAGE_SIZE) ? '#f5f5f5' : 'white', color: reassignedDocsPage >= Math.ceil(reassignedDocs.length / REASSIGNED_PAGE_SIZE) ? '#999' : '#333', cursor: reassignedDocsPage >= Math.ceil(reassignedDocs.length / REASSIGNED_PAGE_SIZE) ? 'not-allowed' : 'pointer', fontSize: '13px' }}>Suivant →</button>
            </div>
          )}
        </div>

        {/* Liste Dossiers Section */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '16px' }}>Liste Dossiers</h3>
          <DossiersList params={{}} />
        </div>

        {/* IA & Suggestions Section */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <BSAIPage />
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
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '90%',
            height: '90%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8f9fa'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                  {currentDossier?.reference} - {currentDossier?.client}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>
                  Type: {currentDossier?.type} | Statut: {currentDossier?.statut}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
               {/* Modifier Statut Dropdown  <select 
                  onChange={(e) => handleStatusChangeInModal(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Modifier statut</option>
                  <option value="Nouveau">Nouveau</option>
                  <option value="En cours">En cours</option>
                  <option value="Traité">Traité</option>
                  <option value="Rejeté">Rejeté</option>
                  <option value="Retourné">Retourné</option>
                </select> */}
                <button 
                  onClick={closePDFModal}
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
                    borderRadius: '4px'
                  }}
                  title="PDF Viewer"
                />
              ) : (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  fontSize: '18px',
                  color: '#666'
                }}>
                  Chargement du PDF...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Status Modification Modal */}
      {/* {showStatusModal && currentDossier && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1001,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #e0e0e0',
              paddingBottom: '16px'
            }}>
              <h3 style={{
                margin: 0,
                color: '#d52b36',
                fontSize: '18px',
                fontWeight: 'bold'
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
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', marginBottom: '16px' }}>
                Dossier: <strong>{currentDossier.reference}</strong><br/>
                Client: <strong>{currentDossier.client}</strong><br/>
                Statut actuel: <strong>{currentDossier.statut}</strong>
              </p>
              
              <div style={{ display: 'grid', gap: '8px' }}>
                {['Nouveau', 'En cours', 'Traité', 'Rejeté', 'Retourné'].map(status => {
                  const isDocumentOnly = status === 'Rejeté' || status === 'Retourné';
                  const isDisabled = isDocumentOnly && !currentDossier?.isDocument;
                  return (
                    <button
                      key={status}
                      onClick={() => !isDisabled && handleConfirmStatusChange(status)}
                      disabled={isDisabled}
                      style={{
                        padding: '12px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        backgroundColor: isDisabled ? '#f5f5f5' : 'white',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        opacity: isDisabled ? 0.5 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!isDisabled) {
                          e.currentTarget.style.backgroundColor = '#f0f0f0';
                          e.currentTarget.style.borderColor = '#d52b36';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isDisabled) {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.borderColor = '#e0e0e0';
                        }
                      }}
                    >
                      {status === 'Nouveau' ? '🆕' : status === 'En cours' ? '⏳' : status === 'Traité' ? '✅' : status === 'Rejeté' ? '❌' : '↩️'} {status}
                      {isDisabled && <span style={{ fontSize: '11px', color: '#999', marginLeft: '8px' }}>(Documents uniquement)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid #e0e0e0'
            }}>
              <button
                onClick={() => setShowStatusModal(false)}
                style={{
                  background: '#f5f5f5',
                  color: '#333',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )} */}
      
      {/* Add Document Modal */}
      {showAddDocumentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1002,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #e0e0e0',
              paddingBottom: '16px'
            }}>
              <h3 style={{
                margin: 0,
                color: '#d52b36',
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                📎 Ajouter un Document
              </h3>
              <button
                onClick={() => setShowAddDocumentModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                marginBottom: '8px',
                color: '#333'
              }}>
                Sélectionner un fichier:
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleUploadDocument}
                disabled={uploadingDocument}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px dashed #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: uploadingDocument ? 'not-allowed' : 'pointer'
                }}
              />
              {uploadingDocument && (
                <div style={{ marginTop: '12px', textAlign: 'center', color: '#666' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
                  <p>Upload en cours...</p>
                </div>
              )}
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid #e0e0e0'
            }}>
              <button
                onClick={() => setShowAddDocumentModal(false)}
                disabled={uploadingDocument}
                style={{
                  background: '#f5f5f5',
                  color: '#333',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: uploadingDocument ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
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
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1002,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #e0e0e0',
              paddingBottom: '16px'
            }}>
              <h3 style={{
                margin: 0,
                color: '#d52b36',
                fontSize: '18px',
                fontWeight: 'bold'
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
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>
            
            {/* Return Type Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                marginBottom: '12px',
                color: '#333'
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
                    border: retourScanType === 'bordereau' ? '2px solid #d52b36' : '1px solid #ddd',
                    borderRadius: '6px',
                    background: retourScanType === 'bordereau' ? '#fff5f5' : 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: retourScanType === 'bordereau' ? 'bold' : 'normal',
                    color: retourScanType === 'bordereau' ? '#d52b36' : '#333'
                  }}
                >
                  📋 Bordereau complet
                </button>
                <button
                  onClick={() => setRetourScanType('documents')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: retourScanType === 'documents' ? '2px solid #d52b36' : '1px solid #ddd',
                    borderRadius: '6px',
                    background: retourScanType === 'documents' ? '#fff5f5' : 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: retourScanType === 'documents' ? 'bold' : 'normal',
                    color: retourScanType === 'documents' ? '#d52b36' : '#333'
                  }}
                >
                  📄 Documents spécifiques
                </button>
              </div>
            </div>

            {/* Document Selection (only if documents type selected) */}
            {retourScanType === 'documents' && bordereauDocuments.length > 0 && (
              <div style={{ marginBottom: '20px', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  marginBottom: '12px',
                  color: '#333'
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
                      background: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
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
                        <div style={{ fontSize: '13px', fontWeight: '500' }}>{doc.name}</div>
                        <div style={{ fontSize: '11px', color: '#666' }}>{doc.type}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                  {selectedDocumentsForRetour.length} document(s) sélectionné(s)
                </div>
              </div>
            )}

            {retourScanType === 'documents' && bordereauDocuments.length === 0 && (
              <div style={{ marginBottom: '20px', padding: '12px', background: '#fff3cd', borderRadius: '6px', fontSize: '13px', color: '#856404' }}>
                ⚠️ Aucun document disponible pour ce bordereau
              </div>
            )}
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                marginBottom: '8px',
                color: '#333'
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
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'Arial, sans-serif',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid #e0e0e0'
            }}>
              <button
                onClick={() => setShowRetourScanModal(false)}
                style={{
                  background: '#f5f5f5',
                  color: '#333',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmRetourScan}
                disabled={!retourScanReason.trim() || (retourScanType === 'documents' && selectedDocumentsForRetour.length === 0)}
                style={{
                  background: (retourScanReason.trim() && (retourScanType === 'bordereau' || selectedDocumentsForRetour.length > 0)) ? '#d52b36' : '#ccc',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: (retourScanReason.trim() && (retourScanType === 'bordereau' || selectedDocumentsForRetour.length > 0)) ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 'bold'
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