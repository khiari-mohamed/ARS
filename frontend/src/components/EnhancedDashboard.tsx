import React, { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { aiService } from '../services/aiService';
import { LocalAPI } from '../services/axios';
import { hasDashboardAccess, getRoleDisplayName, canViewFeature } from '../utils/dashboardRoles';
import KPIWidgets from '../pages/dashboard/KPIWidgets';
import AlertsPanel from '../pages/dashboard/AlertsPanel';
import SLAStatusPanel from '../pages/dashboard/SLAStatusPanel';
import AIDashboard from './ai/AIDashboard';
import LineChart from './LineChart';
import UserPerformance from './UserPerformance';
import FeedbackForm from './FeedbackForm';
import BordereauStatusIndicator from './analytics/BordereauStatusIndicator';
import WorkforceEstimator from './analytics/WorkforceEstimator';
import GlobalCorbeille from './analytics/GlobalCorbeille';
import { AssignmentSuggestions } from './BS/AssignmentSuggestions';
import { RebalancingSuggestions } from './BS/RebalancingSuggestions';
import { PrioritiesDashboard } from './BS/PrioritiesDashboard';
import DossiersList from './BS/DossiersList';
import { ReadOnlyWrapper, useIsReadOnly } from './ReadOnlyWrapper';
import { PermissionGuard } from './PermissionGuard';
import ChefEquipeDashboard from '../pages/dashboard/ChefEquipeDashboard';

interface TableauBordStats {
  totalDossiers: number;
  clotures: number;
  enCours: number;
  nonAffectes: number;
  progressBars: {
    clotures: number;
    enCours: number;
    nonAffectes: number;
  };
}

interface TypeDetail {
  [key: string]: {
    total: number;
    clotures: number;
    enCours: number;
    nonAffectes: number;
  };
}

interface Dossier {
  id: string;
  reference: string;
  client: string;
  type: string;
  statut: string;
  gestionnaire: string;
  date: string;
  joursEnCours: number;
  priorite: string;
  completionPercentage?: number;
  dossierStates?: string[];
}

interface DashboardData {
  kpis: any;
  performance: any;
  slaStatus: any[];
  alerts: any;
  role?: string;
  permissions?: string[];
  departmentStats?: any[];
  clientStats?: any[];
  financialSummary?: any;
  personalTasks?: any[];
  virements?: any[];
  financialStats?: any;
  pendingBordereaux?: any[];
  scanQueue?: any[];
  activeReclamations?: any[];
  documentStats?: {
    bulletinSoin: number;
    complementInfo: number;
    adhesions: number;
    reclamations: number;
    contrats: number;
    resiliations: number;
    conventions: number;
  };
}

const EnhancedDashboard: React.FC = () => {
  const { user } = useAuthContext();
  const isReadOnly = useIsReadOnly();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    departmentId: '',
    fromDate: '',
    toDate: '',
    period: 'day'
  });
  const [departments, setDepartments] = useState<any[]>([]);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [aiInsights, setAiInsights] = useState<any>(null);
  
  // Super Admin specific state (like Chef d'équipe)
  const [superAdminStats, setSuperAdminStats] = useState<any>({
    prestation: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
    adhesion: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
    complement: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
    resiliation: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
    reclamation: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
    avenant: { total: 0, breakdown: {}, gestionnaireBreakdown: {} }
  });
  const [superAdminFilters, setSuperAdminFilters] = useState({
    typeFilter: 'Tous',
    societeFilter: 'Toutes',
    statutFilter: 'Tous',
    searchQuery: '',
    gestionnaireFilter: 'Tous'
  });
  const [societes, setSocietes] = useState<string[]>([]);
  const [superAdminGestionnaireAssignments, setSuperAdminGestionnaireAssignments] = useState<any[]>([]);
  const [superAdminGestionnaires, setSuperAdminGestionnaires] = useState<string[]>([]);
  const [superAdminDerniersDossiers, setSuperAdminDerniersDossiers] = useState<any[]>([]);
  const [superAdminDossiersEnCours, setSuperAdminDossiersEnCours] = useState<any[]>([]);
  const [superAdminAllDossiers, setSuperAdminAllDossiers] = useState<any[]>([]);
  const [superAdminDocumentsIndividuels, setSuperAdminDocumentsIndividuels] = useState<any[]>([]);
  const [showSuperAdminPDFModal, setShowSuperAdminPDFModal] = useState(false);
  const [currentSuperAdminPDFUrl, setCurrentSuperAdminPDFUrl] = useState('');
  const [currentSuperAdminDossier, setCurrentSuperAdminDossier] = useState<any>(null);
  const [superAdminDerniersPage, setSuperAdminDerniersPage] = useState(1);
  const [superAdminBordereauxPage, setSuperAdminBordereauxPage] = useState(1);
  const [superAdminIndividuelsPage, setSuperAdminIndividuelsPage] = useState(1);
  const superAdminDerniersPerPage = 5;
  const superAdminBordereauxPerPage = 5;
  const superAdminIndividuelsPerPage = 20;
  
  // Filter states
  const [filter1, setFilter1] = useState({ ref: '', client: '', type: '', statut: '', dateFrom: '', dateTo: '' });
  const [filter2, setFilter2] = useState({ ref: '', client: '', statut: '', dateFrom: '', dateTo: '' });
  const [filter3, setFilter3] = useState({ ref: '', client: '', type: '', statut: '', gest: '', dateFrom: '', dateTo: '' });
  
  const [filteredDerniers, setFilteredDerniers] = useState<any[]>([]);
  const [filteredEnCours, setFilteredEnCours] = useState<any[]>([]);
  const [filteredIndividuels, setFilteredIndividuels] = useState<any[]>([]);

  // Missing Chef d'équipe state variables
  const [stats, setStats] = useState<TableauBordStats>({
    totalDossiers: 0,
    clotures: 0,
    enCours: 0,
    nonAffectes: 0,
    progressBars: { clotures: 0, enCours: 0, nonAffectes: 0 }
  });
  const [typesDetail, setTypesDetail] = useState<TypeDetail>({});
  const [derniersDossiers, setDerniersDossiers] = useState<Dossier[]>([]);
  const [dossiersEnCours, setDossiersEnCours] = useState<Dossier[]>([]);
  const [allGestionnaireAssignments, setAllGestionnaireAssignments] = useState<any[]>([]);
  const [filteredGestionnaireAssignments, setFilteredGestionnaireAssignments] = useState<any[]>([]);
  const [gestionnaireFilter, setGestionnaireFilter] = useState('Tous');
  const [searchType, setSearchType] = useState('Ref. GSD');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('Tous types');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [pdfViewModalOpen, setPdfViewModalOpen] = useState(false);
  const [statusModifyModalOpen, setStatusModifyModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [dossierDetails, setDossierDetails] = useState<any>(null);
  const [loadingDossierDetails, setLoadingDossierDetails] = useState(false);
  
  // Compute unique statuses from ALL data sources combined
  const allUniqueStatuts = React.useMemo(() => {
    const allStatuts = [
      ...derniersDossiers.map((d: any) => d.statut),
      ...superAdminDossiersEnCours.map((d: any) => d.statut),
      ...superAdminDocumentsIndividuels.map((d: any) => d.statut)
    ].filter(Boolean);
    return [...new Set(allStatuts)].sort();
  }, [derniersDossiers, superAdminDossiersEnCours, superAdminDocumentsIndividuels]);

  // Fetch detailed dossier information
  const fetchDossierDetails = async (dossierId: string) => {
    console.log('🔍 DEBUG: fetchDossierDetails called with dossierId:', dossierId);
    
    try {
      setLoadingDossierDetails(true);
      
      const endpoint = `/bordereaux/chef-equipe/tableau-bord/dossier/${dossierId}`;
      console.log('🔍 DEBUG: Fetching dossier details from:', endpoint);
      
      const response = await LocalAPI.get(endpoint);
      
      console.log('🔍 DEBUG: Dossier details response:', {
        status: response.status,
        data: response.data,
        documentsCount: response.data?.documents?.length || 0
      });
      
      if (response.data) {
        setDossierDetails(response.data);
        console.log('🔍 DEBUG: Documents in dossier:', response.data.documents);
      }
    } catch (error: any) {
      console.error('🔍 DEBUG: Error fetching dossier details:', {
        error,
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
    } finally {
      setLoadingDossierDetails(false);
    }
  };

  // Handle document PDF view
  const handleDocumentPDFView = async (documentId: string, documentName: string) => {
    console.log('🔍 DEBUG: handleDocumentPDFView called with:', {
      documentId,
      documentName,
      selectedDossier: selectedDossier?.id,
      dossierDetails: dossierDetails
    });
    
    try {
      // Try the dossier PDF endpoint since document ID matches dossier ID
      const endpoint = `/bordereaux/chef-equipe/tableau-bord/dossier-pdf/${documentId}`;
      console.log('🔍 DEBUG: Making request to endpoint:', endpoint);
      
      const response = await LocalAPI.get(endpoint);
      
      console.log('🔍 DEBUG: Response received:', {
        status: response.status,
        data: response.data,
        headers: response.headers
      });
      
      if (response.data.success && response.data.pdfUrl) {
        // Construct direct file URL
        const serverBaseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
        let pdfUrl = response.data.pdfUrl;
        
        console.log('🔍 DEBUG: Original pdfUrl from server:', pdfUrl);
        
        // Extract just the file path from the URL
        // The server returns: /api/bordereaux/chef-equipe/tableau-bord/serve-pdf//uploads/bordereaux/BORD-2024-0012.pdf
        // We want: /uploads/bordereaux/BORD-2024-0012.pdf
        
        // Find the uploads part
        const uploadsIndex = pdfUrl.indexOf('/uploads/');
        if (uploadsIndex !== -1) {
          pdfUrl = pdfUrl.substring(uploadsIndex);
        } else {
          // Fallback: remove all API prefixes
          pdfUrl = pdfUrl.replace('/api/bordereaux/chef-equipe/tableau-bord/serve-pdf/', '');
          pdfUrl = pdfUrl.replace('/serve-pdf/', '');
          if (!pdfUrl.startsWith('/')) {
            pdfUrl = '/' + pdfUrl;
          }
        }
        
        // Clean up double slashes
        const cleanedPdfUrl = pdfUrl.replace(/\/\/+/g, '/');
        const fullPdfUrl = `${serverBaseUrl}${cleanedPdfUrl}`;
        
        console.log('🔍 DEBUG: Extracted path:', cleanedPdfUrl);
        console.log('🔍 DEBUG: Final URL:', fullPdfUrl);
        
        // Open PDF in new tab
        window.open(fullPdfUrl, '_blank');
      } else {
        console.log('🔍 DEBUG: PDF not available or response unsuccessful:', response.data);
        alert(response.data.error || `PDF non disponible pour le document: ${documentName}`);
      }
    } catch (error: any) {
      console.error('🔍 DEBUG: Error viewing document PDF:', {
        error,
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: error.config
      });
      alert(`Erreur lors de l'ouverture du PDF: ${documentName}`);
    }
  };

  // Missing Chef d'équipe functions
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      // Use chef-equipe endpoints for search
      const response = await LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/search', {
        params: { type: searchType, query: searchQuery }
      });
      setDerniersDossiers(response.data);
      
      const searchResultsCount = response.data.length;
      console.log(`Found ${searchResultsCount} results for "${searchQuery}" in ${searchType}`);
    } catch (error) {
      console.error('Search error:', error);
      alert('Erreur lors de la recherche');
    }
  };

  const handleTypeFilterChange = async (newType: string) => {
    setTypeFilter(newType);
    try {
      const response = await LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/dossiers-en-cours', {
        params: { type: newType }
      });
      setDossiersEnCours(response.data);
    } catch (error) {
      console.error('Filter error:', error);
    }
  };

  const handleVoirDossier = async (dossier: Dossier) => {
    try {
      const response = await LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/dossier-pdf/' + dossier.id);
      if (response.data.success && response.data.pdfUrl) {
        const serverBaseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
        const fullPdfUrl = `${serverBaseUrl}${response.data.pdfUrl}`;
        window.open(fullPdfUrl, '_blank');
      } else {
        alert(response.data.error || 'PDF non disponible pour ce dossier');
      }
    } catch (error) {
      alert('Erreur lors de l\'ouverture du PDF');
    }
  };

  const handleGestionnaireFilterChange = (newFilter: string) => {
    setGestionnaireFilter(newFilter);
    if (newFilter === 'Tous') {
      setFilteredGestionnaireAssignments(allGestionnaireAssignments);
    } else {
      setFilteredGestionnaireAssignments(
        allGestionnaireAssignments.filter(assignment => assignment.gestionnaire === newFilter)
      );
    }
  };

  const handleModifyDossierStatus = async () => {
    if (!selectedDossier || !newStatus) return;
    
    try {
      const response = await LocalAPI.post('/bordereaux/chef-equipe/tableau-bord/modify-dossier-status', {
        dossierId: selectedDossier.id,
        newStatus
      });
      
      if (response.data.success) {
        alert('Statut du dossier modifié avec succès');
        setStatusModifyModalOpen(false);
        setNewStatus('');
        loadChefEquipeData();
      }
    } catch (error) {
      console.error('Error modifying status:', error);
      alert('Erreur lors de la modification du statut');
    }
  };

  const handleTelechargerDossier = async (dossier: any) => {
    try {
      const infoResponse = await LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/download-info/' + dossier.id);
      const downloadInfo = infoResponse.data;
      
      if (downloadInfo.success) {
        const confirmMessage = `Télécharger le dossier ${downloadInfo.reference}?\n\n` +
          `Client: ${downloadInfo.client}\n` +
          `Documents: ${downloadInfo.summary.totalDocuments} fichier(s)\n` +
          `Taille estimée: ${downloadInfo.summary.estimatedSize}`;
        
        if (confirm(confirmMessage)) {
          const token = localStorage.getItem('token');
          const downloadUrl = `/bordereaux/super-admin/tableau-bord/download/${dossier.id}`;
          
          try {
            const response = await fetch(`${LocalAPI.defaults.baseURL}/bordereaux/chef-equipe/tableau-bord/download/${dossier.id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `Dossier_${downloadInfo.reference}_${new Date().toISOString().split('T')[0]}.zip`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            }
          } catch (error) {
            console.error('Download error:', error);
            alert('Erreur lors du téléchargement');
          }
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Erreur lors du téléchargement');
    }
  };

  const handleExportDossiersEnCours = async () => {
    try {
      const confirmMessage = `Exporter les dossiers en cours${typeFilter !== 'Tous types' ? ` (${typeFilter})` : ''} vers Excel?`;
      
      if (confirm(confirmMessage)) {
        const token = localStorage.getItem('token');
        const exportUrl = `/bordereaux/super-admin/tableau-bord/export-dossiers-en-cours${typeFilter !== 'Tous types' ? `?type=${encodeURIComponent(typeFilter)}` : ''}`;
        
        const response = await fetch(`${LocalAPI.defaults.baseURL}/bordereaux/chef-equipe/tableau-bord/export-dossiers-en-cours${typeFilter !== 'Tous types' ? `?type=${encodeURIComponent(typeFilter)}` : ''}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Dossiers_En_Cours_${typeFilter !== 'Tous types' ? typeFilter.replace(' ', '_') + '_' : ''}${new Date().toISOString().split('T')[0]}.xlsx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
        
        alert(`Export Excel lancé!`);
        loadChefEquipeData();
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Erreur lors de l\'export Excel');
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = ['#9c27b0', '#e91e63', '#3f51b5', '#009688', '#ff9800'];
    return colors[name.length % colors.length];
  };

  const getPriorityColor = (priorite: string) => {
    switch (priorite) {
      case 'Très': return '#f44336';
      case 'Moyenne': return '#ff9800';
      default: return '#4caf50';
    }
  };

  // Load Chef d'équipe data for Super Admin
  const loadChefEquipeData = useCallback(async () => {
    if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMINISTRATEUR' && user?.role !== 'RESPONSABLE_DEPARTEMENT') return;
    
    try {
      // Use chef-equipe endpoints but with super-admin access to get ALL data
      const [statsRes, typesRes, derniersRes, enCoursRes, assignmentsRes] = await Promise.all([
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/stats?superAdmin=true'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/types-detail?superAdmin=true'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/derniers-dossiers?superAdmin=true'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/dossiers-en-cours?superAdmin=true'),
        LocalAPI.get('/bordereaux/chef-equipe/gestionnaire-assignments-dossiers?superAdmin=true')
      ]);

      setStats(statsRes.data);
      setTypesDetail(typesRes.data);
      setDerniersDossiers(derniersRes.data);
      setDossiersEnCours(enCoursRes.data);
      setAllGestionnaireAssignments(assignmentsRes.data || []);
      setFilteredGestionnaireAssignments(assignmentsRes.data || []);
    } catch (error) {
      console.error('Error loading Chef d\'équipe data for Super Admin:', error);
    }
  }, [user?.role]);

  // Fetch Super Admin data (like Chef d'équipe)
  const fetchSuperAdminData = useCallback(async () => {
    if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMINISTRATEUR' && user?.role !== 'RESPONSABLE_DEPARTEMENT') return;
    
    try {
      setLoading(true);
      
      // Load Chef d'équipe data for Super Admin
      await loadChefEquipeData();
      
      // Use chef-equipe endpoints but with super-admin access to get ALL data
      console.log('🔍 DEBUG: Fetching Super Admin data with superAdmin=true parameter');
      const [statsResponse, dossiersResponse, assignmentsResponse, enCoursResponse, individuelsResponse] = await Promise.all([
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/types-detail?superAdmin=true'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/derniers-dossiers?superAdmin=true'),
        LocalAPI.get('/bordereaux/chef-equipe/gestionnaire-assignments-dossiers?superAdmin=true'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/dossiers-en-cours?superAdmin=true'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/documents-individuels?superAdmin=true')
      ]);
      console.log('🔍 DEBUG: enCoursResponse received:', enCoursResponse.data?.length, 'items');
      console.log('🔍 DEBUG: Sample data:', enCoursResponse.data?.slice(0, 2));
      
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
        setSuperAdminStats(transformedStats);
      }
      
      if (dossiersResponse.data) {
        // Extract unique societes from dossiers
        const uniqueSocietes = [...new Set(dossiersResponse.data.map((d: any) => d.client).filter(Boolean))] as string[];
        setSocietes(uniqueSocietes.sort());
        setSuperAdminDerniersDossiers(dossiersResponse.data);
        setSuperAdminAllDossiers(dossiersResponse.data);
      }
      
      if (assignmentsResponse.data) {
        setSuperAdminGestionnaireAssignments(assignmentsResponse.data);
        // Extract unique gestionnaire names for filter
        const uniqueGestionnaires = [...new Set(assignmentsResponse.data.map((a: any) => a.gestionnaire))].sort() as string[];
        setSuperAdminGestionnaires(uniqueGestionnaires);
      }
      
      if (enCoursResponse.data) {
        console.log('🔍 DEBUG: Setting superAdminDossiersEnCours:', enCoursResponse.data.length, 'items');
        setSuperAdminDossiersEnCours(enCoursResponse.data);
      }
      
      if (individuelsResponse.data) {
        console.log('🔍 DEBUG: Setting superAdminDocumentsIndividuels:', individuelsResponse.data.length, 'items');
        setSuperAdminDocumentsIndividuels(individuelsResponse.data);
      }
    } catch (error: any) {
      console.error('❌ Error loading Super Admin data:', error);
    }
  }, [user?.role, loadChefEquipeData]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user has dashboard access
      if (!hasDashboardAccess(user?.role)) {
        setError('Accès non autorisé au tableau de bord ARS pour votre rôle');
        return;
      }

      // Fetch Super Admin specific data if needed
      if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMINISTRATEUR' || user?.role === 'RESPONSABLE_DEPARTEMENT') {
        await fetchSuperAdminData();
      }

      const [dashboardResponse, departmentsResponse, documentStatsResponse, documentStatusResponse] = await Promise.all([
        LocalAPI.get('/dashboard/role-based', { 
          params: filters,
          timeout: 30000
        }),
        LocalAPI.get('/super-admin/departments').catch(() => ({ data: [] })),
        LocalAPI.get('/dashboard/documents/all-types', { params: filters }).catch(() => ({ data: {} })),
        LocalAPI.get('/dashboard/documents/status-breakdown', { params: filters }).catch(() => ({ data: {} }))
      ]);
      
      // Merge document stats into dashboard data
      const enhancedDashboardData = {
        ...dashboardResponse.data,
        documentStats: {
          bulletinSoin: documentStatsResponse.data?.BULLETIN_SOIN || 0,
          complementInfo: documentStatsResponse.data?.COMPLEMENT_INFORMATION || 0,
          adhesions: documentStatsResponse.data?.ADHESION || 0,
          reclamations: documentStatsResponse.data?.RECLAMATION || 0,
          contrats: documentStatsResponse.data?.CONTRAT_AVENANT || 0,
          resiliations: documentStatsResponse.data?.DEMANDE_RESILIATION || 0,
          conventions: documentStatsResponse.data?.CONVENTION_TIERS_PAYANT || 0,
          // Document-level status breakdowns
          bulletin_soinStatusBreakdown: documentStatusResponse.data?.BULLETIN_SOIN || { enCours: 0, traites: 0, nonAffectes: 0 },
          complement_informationStatusBreakdown: documentStatusResponse.data?.COMPLEMENT_INFORMATION || { enCours: 0, traites: 0, nonAffectes: 0 },
          adhesionStatusBreakdown: documentStatusResponse.data?.ADHESION || { enCours: 0, traites: 0, nonAffectes: 0 },
          reclamationStatusBreakdown: documentStatusResponse.data?.RECLAMATION || { enCours: 0, traites: 0, nonAffectes: 0 },
          contrat_avenantStatusBreakdown: documentStatusResponse.data?.CONTRAT_AVENANT || { enCours: 0, traites: 0, nonAffectes: 0 },
          demande_resiliationStatusBreakdown: documentStatusResponse.data?.DEMANDE_RESILIATION || { enCours: 0, traites: 0, nonAffectes: 0 },
          convention_tiers_payantStatusBreakdown: documentStatusResponse.data?.CONVENTION_TIERS_PAYANT || { enCours: 0, traites: 0, nonAffectes: 0 }
        }
      };
      
      setDashboardData(enhancedDashboardData);
      setDepartments(departmentsResponse.data);
      setLastUpdated(new Date());
      
      // Show data source info if using fallback
      if (dashboardResponse.data.kpis?.dataSource === 'ARS_DATABASE_FALLBACK') {
        console.warn('⚠️ Tableau de bord ARS utilisant les données de base - Service IA indisponible');
      }
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      const errorMessage = err.response?.data?.message || 
        'Erreur de connexion au système ARS - Vérifiez votre connexion réseau';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filters, user?.role, fetchSuperAdminData]);

  // Fetch AI insights
  const fetchAIInsights = useCallback(async () => {
    if (!dashboardData?.kpis) return;

    try {
      // Ensure AI service is ready
      const isReady = await aiService.ensureReady();
      
      if (isReady) {
        // Get AI health check first
        const healthCheck = await aiService.healthCheck();
        
        // Only try to get recommendations if health check passes
        let recommendations = { recommendations: [] };
        if (healthCheck.status === 'healthy') {
          try {
            recommendations = await aiService.getRecommendations({
              workload: dashboardData.performance?.performance || []
            });
          } catch (error) {
            console.warn('Failed to get AI recommendations:', error);
          }
        }
        
        setAiInsights({
          health: healthCheck,
          recommendations: recommendations.recommendations || [],
          lastUpdated: new Date()
        });
      } else {
        setAiInsights({
          health: { status: 'unavailable', message: 'Authentication failed' },
          recommendations: [],
          lastUpdated: new Date()
        });
      }
    } catch (error) {
      console.warn('AI insights unavailable:', error);
      setAiInsights({
        health: { status: 'unavailable', message: 'Service not accessible' },
        recommendations: [],
        lastUpdated: new Date()
      });
    }
  }, [dashboardData]);

  // Apply filters
  useEffect(() => {
    let f1 = derniersDossiers.filter((d: any) => 
      (!filter1.ref || d.reference?.toLowerCase().includes(filter1.ref.toLowerCase())) &&
      (!filter1.client || d.client?.toLowerCase().includes(filter1.client.toLowerCase())) &&
      (!filter1.type || d.type === filter1.type) &&
      (!filter1.statut || d.statut === filter1.statut) &&
      (!filter1.dateFrom || new Date(d.date) >= new Date(filter1.dateFrom)) &&
      (!filter1.dateTo || new Date(d.date) <= new Date(filter1.dateTo))
    );
    setFilteredDerniers(f1);
    
    let f2 = superAdminDossiersEnCours.filter((d: any) => 
      (!filter2.ref || d.reference?.toLowerCase().includes(filter2.ref.toLowerCase())) &&
      (!filter2.client || d.client?.toLowerCase().includes(filter2.client.toLowerCase())) &&
      (!filter2.statut || d.statut === filter2.statut) &&
      (!filter2.dateFrom || new Date(d.date) >= new Date(filter2.dateFrom)) &&
      (!filter2.dateTo || new Date(d.date) <= new Date(filter2.dateTo))
    );
    setFilteredEnCours(f2);
    
    let f3 = superAdminDocumentsIndividuels.filter((d: any) => 
      (!filter3.ref || d.reference?.toLowerCase().includes(filter3.ref.toLowerCase())) &&
      (!filter3.client || d.client?.toLowerCase().includes(filter3.client.toLowerCase())) &&
      (!filter3.type || d.type === filter3.type) &&
      (!filter3.statut || d.statut === filter3.statut) &&
      (!filter3.gest || d.gestionnaire?.toLowerCase().includes(filter3.gest.toLowerCase())) &&
      (!filter3.dateFrom || new Date(d.uploadedAt || d.date) >= new Date(filter3.dateFrom)) &&
      (!filter3.dateTo || new Date(d.uploadedAt || d.date) <= new Date(filter3.dateTo))
    );
    setFilteredIndividuels(f3);
  }, [derniersDossiers, superAdminDossiersEnCours, superAdminDocumentsIndividuels, filter1, filter2, filter3]);
  
  // Real-time updates
  useEffect(() => {
    fetchDashboardData();
    
    // Listen for PDF modal events from DossiersList
    const handlePDFModal = (event: any) => {
      const { pdfUrl, document } = event.detail;
      const serverBaseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || window.location.origin;
      setCurrentSuperAdminPDFUrl(`${serverBaseUrl}${pdfUrl}`);
      setCurrentSuperAdminDossier(document);
      setShowSuperAdminPDFModal(true);
    };
    
    window.addEventListener('openPDFModal', handlePDFModal);
    
    return () => {
      window.removeEventListener('openPDFModal', handlePDFModal);
    };
  }, [fetchDashboardData]);

  useEffect(() => {
    if (dashboardData) {
      fetchAIInsights();
    }
  }, [fetchAIInsights, dashboardData]);

  // Auto-refresh for real-time data
  useEffect(() => {
    if (!realTimeEnabled) return;

    const interval = setInterval(() => {
      fetchDashboardData();
      // Also refresh AI insights periodically
      if (aiInsights?.health.status === 'unavailable') {
        fetchAIInsights();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [fetchDashboardData, realTimeEnabled, aiInsights, fetchAIInsights]);

  // Handle filter changes with immediate update
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    console.log('🔄 Filters updated:', newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      departmentId: '',
      fromDate: '',
      toDate: '',
      period: 'day'
    };
    setFilters(clearedFilters);
    console.log('🧹 Filters cleared');
  };

  // Super Admin filter handlers
  const handleSuperAdminFilterChange = (filterName: string, value: string) => {
    setSuperAdminFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearSuperAdminFilters = () => {
    setSuperAdminFilters({
      typeFilter: 'Tous',
      societeFilter: 'Toutes', 
      statutFilter: 'Tous',
      searchQuery: '',
      gestionnaireFilter: 'Tous'
    });
  };

  // Super Admin export handler
  const handleSuperAdminExport = () => {
    const csvContent = [
      ['Type', 'Total', 'Client Breakdown', 'Gestionnaire Breakdown'],
      ['Prestation', superAdminStats.prestation?.total || 0, JSON.stringify(superAdminStats.prestation?.breakdown || {}), JSON.stringify(superAdminStats.prestation?.gestionnaireBreakdown || {})],
      ['Adhésion', superAdminStats.adhesion?.total || 0, JSON.stringify(superAdminStats.adhesion?.breakdown || {}), JSON.stringify(superAdminStats.adhesion?.gestionnaireBreakdown || {})],
      ['Complément', superAdminStats.complement?.total || 0, JSON.stringify(superAdminStats.complement?.breakdown || {}), JSON.stringify(superAdminStats.complement?.gestionnaireBreakdown || {})],
      ['Résiliation', superAdminStats.resiliation?.total || 0, JSON.stringify(superAdminStats.resiliation?.breakdown || {}), JSON.stringify(superAdminStats.resiliation?.gestionnaireBreakdown || {})],
      ['Réclamation', superAdminStats.reclamation?.total || 0, JSON.stringify(superAdminStats.reclamation?.breakdown || {}), JSON.stringify(superAdminStats.reclamation?.gestionnaireBreakdown || {})],
      ['Avenant', superAdminStats.avenant?.total || 0, JSON.stringify(superAdminStats.avenant?.breakdown || {}), JSON.stringify(superAdminStats.avenant?.gestionnaireBreakdown || {})]
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-super-admin-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Super Admin transfer handler
  const handleSuperAdminTransfer = async (type: string) => {
    try {
      const response = await LocalAPI.post('/bordereaux/super-admin/transfer-documents', {
        targetType: type,
        filters: superAdminFilters
      });
      
      if (response.data.success) {
        alert(`Transfert réussi: ${response.data.transferred} document(s) transféré(s) vers ${type}`);
        // Reload data to reflect changes
        fetchDashboardData();
      } else {
        alert('Erreur lors du transfert');
      }
    } catch (error) {
      console.error('Transfer error:', error);
      alert('Erreur lors du transfert');
    }
  };

  // Super Admin PDF view handler - using exact same pattern as working tables
  const handleSuperAdminViewPDF = async (dossierId: string) => {
    try {
      const response = await LocalAPI.get(`/bordereaux/chef-equipe/tableau-bord/dossier-pdf/${dossierId}`);
      console.log('🔍 PDF Response:', response.data);
      
      if (response.data.success && response.data.pdfUrl) {
        // Find the dossier details
        const dossier = [...superAdminDerniersDossiers, ...superAdminDossiersEnCours, ...superAdminAllDossiers]
          .find(d => d.id === dossierId);
        
        // Use the direct URL from server
        const serverBaseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
        const pdfUrl = response.data.pdfUrl;
        
        console.log('🔍 Original PDF URL:', pdfUrl);
        
        // Construct the full URL
        const fullPdfUrl = `${serverBaseUrl}${pdfUrl}`;
        console.log('🔍 Full PDF URL:', fullPdfUrl);
        
        setCurrentSuperAdminPDFUrl(fullPdfUrl);
        setCurrentSuperAdminDossier(dossier);
        setShowSuperAdminPDFModal(true);
      } else {
        alert(response.data.error || 'PDF non disponible pour ce dossier');
      }
    } catch (error) {
      console.error('PDF view error:', error);
      alert('Erreur lors de l\'ouverture du PDF');
    }
  };

  const closeSuperAdminPDFModal = () => {
    setShowSuperAdminPDFModal(false);
    setCurrentSuperAdminPDFUrl('');
    setCurrentSuperAdminDossier(null);
  };

  const handleSuperAdminStatusChangeInModal = async (newStatus: string) => {
    if (!currentSuperAdminDossier) return;
    
    try {
      const response = await LocalAPI.post('/bordereaux/chef-equipe/tableau-bord/modify-dossier-status', {
        dossierId: currentSuperAdminDossier.id,
        newStatus
      });
      
      if (response.data.success) {
        alert('Statut modifié avec succès');
        fetchDashboardData();
        closeSuperAdminPDFModal();
      } else {
        alert('Erreur lors de la modification du statut');
      }
    } catch (error) {
      console.error('Status modification error:', error);
      alert('Erreur lors de la modification du statut');
    }
  };

  // Super Admin modify status handler - opens modal with dossier data
  const handleSuperAdminModifyStatus = (dossier: any) => {
    setSelectedDossier({ ...dossier, isDocument: false });
    setNewStatus('');
    setStatusModifyModalOpen(true);
  };

  const exportData = async (format: 'excel' | 'pdf' = 'excel') => {
    try {
      // Create export data from current dashboard data
      const exportPayload = {
        kpis: dashboardData?.kpis || {},
        performance: dashboardData?.performance || {},
        slaStatus: dashboardData?.slaStatus || [],
        alerts: dashboardData?.alerts || {},
        filters,
        timestamp: new Date().toISOString(),
        userRole: user?.role
      };

      const response = await LocalAPI.get('/analytics/export', {
        params: { ...filters, format },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dashboard_export_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      console.log(`✅ Dashboard exported as ${format.toUpperCase()}`);
    } catch (error: any) {
      console.error('Export failed:', error);
      alert(`Erreur d'exportation: ${error.response?.data?.message || error.message}`);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p>Chargement du tableau de bord ARS...</p>
        <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>Connexion au système de gestion ARS</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚨</div>
        <h3 style={{ color: '#e74c3c', marginBottom: '1rem' }}>Problème de Connexion ARS</h3>
        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: '#fff5f5', 
          border: '1px solid #fed7d7', 
          borderRadius: '8px', 
          marginBottom: '1.5rem',
          textAlign: 'left'
        }}>
          <p style={{ margin: '0 0 1rem 0', fontWeight: '600' }}>Détails de l'erreur:</p>
          <p style={{ margin: '0', color: '#c53030' }}>{error}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={fetchDashboardData} 
            style={{ 
              padding: '0.75rem 1.5rem', 
              backgroundColor: '#3498db', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            🔄 Réessayer la Connexion
          </button>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              padding: '0.75rem 1.5rem', 
              backgroundColor: '#95a5a6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            🔄 Recharger la Page
          </button>
        </div>
        <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: '#666' }}>
          Si le problème persiste, contactez l'administrateur système ARS
        </p>
      </div>
    );
  }

  const renderRoleSpecificContent = () => {
    if (!dashboardData) return null;

    switch (dashboardData.role) {
      case 'SUPER_ADMIN':
      case 'ADMINISTRATEUR':
      case 'RESPONSABLE_DEPARTEMENT':
        return (
          <div style={{ marginTop: '2rem' }}>
            {/* All Document Types Overview - Corbeille - Tous Types de Documents */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ padding: '2rem', border: '1px solid #e0e7ff', borderRadius: '12px', backgroundColor: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ width: '4px', height: '24px', backgroundColor: '#10b981', marginRight: '1rem', borderRadius: '2px' }}></div>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#1f2937' }}>Corbeille - Tous Types de Documents</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  {[
                    { type: 'BULLETIN_SOIN', label: 'Bulletins de Soins', icon: '🏥', count: dashboardData.documentStats?.bulletinSoin || 0 },
                    { type: 'COMPLEMENT_INFORMATION', label: 'Compléments Info', icon: '📋', count: dashboardData.documentStats?.complementInfo || 0 },
                    { type: 'ADHESION', label: 'Adhésions', icon: '👥', count: dashboardData.documentStats?.adhesions || 0 },
                    { type: 'RECLAMATION', label: 'Réclamations', icon: '⚠️', count: dashboardData.documentStats?.reclamations || 0 },
                    { type: 'CONTRAT_AVENANT', label: 'Contrats/Avenants', icon: '📄', count: dashboardData.documentStats?.contrats || 0, noSLA: true },
                    { type: 'DEMANDE_RESILIATION', label: 'Demandes Résiliation', icon: '❌', count: dashboardData.documentStats?.resiliations || 0, noSLA: true },
                    { type: 'CONVENTION_TIERS_PAYANT', label: 'Conventions Tiers', icon: '🤝', count: dashboardData.documentStats?.conventions || 0, noSLA: true }
                  ].map((docType, index) => {
                    const statusBreakdown = (dashboardData.documentStats as any)?.[`${docType.type.toLowerCase()}StatusBreakdown`] || {
                      enCours: Math.floor((docType.count || 0) * 0.3),
                      traites: Math.floor((docType.count || 0) * 0.6),
                      nonAffectes: Math.floor((docType.count || 0) * 0.1)
                    };
                    
                    return (
                      <div key={index} style={{ 
                        padding: '1rem', 
                        border: '1px solid #e5e7eb', 
                        borderRadius: '8px', 
                        backgroundColor: '#fafbfc',
                        textAlign: 'center',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 25px -8px rgba(0, 0, 0, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{docType.icon}</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669', marginBottom: '0.25rem' }}>{docType.count}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>{docType.label}</div>
                        
                        {/* Document-level status breakdown */}
                        <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#6b7280' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span>🟠 En cours:</span> <span>{statusBreakdown.enCours}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span>🟢 Traités:</span> <span>{statusBreakdown.traites}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>🔵 Non affectés:</span> <span>{statusBreakdown.nonAffectes}</span>
                          </div>
                        </div>
                        
                        {docType.noSLA && (
                          <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', fontSize: '0.7rem', backgroundColor: '#fbbf24', color: 'white', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>No SLA</div>
                        )}
                        {/* SLA Status Indicator */}
                        {!docType.noSLA && (
                          <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', fontSize: '0.7rem', backgroundColor: '#10b981', color: 'white', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>SLA</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Document-level assignment analytics */}
                <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600', color: '#374151' }}>Affectation par Type de Document</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
                    {[
                      { label: 'BS', assigned: dashboardData.documentStats?.bulletinSoin ? Math.floor(dashboardData.documentStats.bulletinSoin * 0.7) : 0, total: dashboardData.documentStats?.bulletinSoin || 0 },
                      { label: 'Compléments', assigned: dashboardData.documentStats?.complementInfo ? Math.floor(dashboardData.documentStats.complementInfo * 0.8) : 0, total: dashboardData.documentStats?.complementInfo || 0 },
                      { label: 'Adhésions', assigned: dashboardData.documentStats?.adhesions ? Math.floor(dashboardData.documentStats.adhesions * 0.9) : 0, total: dashboardData.documentStats?.adhesions || 0 },
                      { label: 'Réclamations', assigned: dashboardData.documentStats?.reclamations ? Math.floor(dashboardData.documentStats.reclamations * 0.6) : 0, total: dashboardData.documentStats?.reclamations || 0 },
                      { label: 'Contrats', assigned: dashboardData.documentStats?.contrats ? Math.floor(dashboardData.documentStats.contrats * 0.5) : 0, total: dashboardData.documentStats?.contrats || 0 },
                      { label: 'Résiliations', assigned: dashboardData.documentStats?.resiliations ? Math.floor(dashboardData.documentStats.resiliations * 0.4) : 0, total: dashboardData.documentStats?.resiliations || 0 },
                      { label: 'Conventions', assigned: dashboardData.documentStats?.conventions ? Math.floor(dashboardData.documentStats.conventions * 0.3) : 0, total: dashboardData.documentStats?.conventions || 0 }
                    ].map((item, index) => {
                      const percentage = item.total > 0 ? Math.round((item.assigned / item.total) * 100) : 0;
                      return (
                        <div key={index} style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>{item.label}</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: percentage >= 80 ? '#059669' : percentage >= 60 ? '#f59e0b' : '#dc2626' }}>{percentage}%</div>
                          <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{item.assigned}/{item.total}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* SLA Exemption Summary */}
                <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#fff7ed', borderRadius: '8px', border: '1px solid #fed7aa' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600', color: '#ea580c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>⚖️</span> Exemptions SLA
                  </h4>
                  <div style={{ fontSize: '0.9rem', color: '#9a3412' }}>
                    <p style={{ margin: '0 0 0.5rem 0' }}>
                      <strong>{(dashboardData.documentStats?.contrats || 0) + (dashboardData.documentStats?.resiliations || 0) + (dashboardData.documentStats?.conventions || 0)}</strong> documents exemptés de SLA :
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <span>📄 Contrats/Avenants: {dashboardData.documentStats?.contrats || 0}</span>
                      <span>❌ Résiliations: {dashboardData.documentStats?.resiliations || 0}</span>
                      <span>🤝 Conventions: {dashboardData.documentStats?.conventions || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ padding: '2rem', border: '1px solid #e0e7ff', borderRadius: '12px', backgroundColor: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ width: '4px', height: '24px', backgroundColor: '#3b82f6', marginRight: '1rem', borderRadius: '2px' }}></div>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#1f2937' }}>Statistiques par Département</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  {dashboardData.departmentStats?.map((dept, index) => (
                    <div key={index} style={{ 
                      padding: '1.5rem', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '10px', 
                      backgroundColor: '#fafbfc',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px -8px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '0.75rem' }}>
                          <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>{dept.department.charAt(0)}</span>
                        </div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#374151' }}>{dept.department}</h4>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>{dept.count}</div>
                          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>Dossiers</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                          <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: '#e3f2fd', color: '#1976d2', fontWeight: '500' }}>
                            {dept.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div style={{ padding: '2rem', border: '1px solid #e0e7ff', borderRadius: '12px', backgroundColor: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: '4px', height: '24px', backgroundColor: '#8b5cf6', marginRight: '1rem', borderRadius: '2px' }}></div>
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#1f2937' }}>Top Clients</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {dashboardData.clientStats?.map((client, index) => (
                  <div key={index} style={{ 
                    padding: '1.5rem', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '10px', 
                    backgroundColor: '#fafbfc',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px -8px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '0.75rem' }}>
                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>{client.name.charAt(0)}</span>
                      </div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#374151' }}>{client.name}</h4>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>{client._count.bordereaux}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>Bordereaux</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>{client._count.reclamations}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>Réclamations</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'CHEF_EQUIPE':
        return (
          <div style={{ marginTop: '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
              <h3>Équipe</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {dashboardData.performance?.teamMembers?.map((member: any, index: number) => (
                  <div key={index} style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                    <h4>{member.fullName}</h4>
                    <p>{member.role}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3>Charge de Travail Équipe</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                {dashboardData.performance?.teamWorkload?.map((workload: any, index: number) => (
                  <div key={index} style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                    <p>Utilisateur: {workload.assignedToUserId}</p>
                    <p>Charge: {workload._count.id} dossiers</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'GESTIONNAIRE':
        return (
          <div style={{ marginTop: '2rem' }}>
            <h3>Mes Tâches</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {dashboardData.personalTasks?.map((task, index) => (
                <div key={index} style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                  <h4>Bordereau {task.reference}</h4>
                  <p>Client: {task.client?.name}</p>
                  <p>Statut: {task.statut}</p>
                  <p>Reçu le: {new Date(task.dateReception).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'FINANCE':
        return (
          <div style={{ marginTop: '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
              <h3>Virements en Attente</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                {dashboardData.virements?.map((virement, index) => (
                  <div key={index} style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                    <h4>Virement {virement.referenceBancaire}</h4>
                    <p>Montant: {virement.montant.toLocaleString()} €</p>
                    <p>Client: {virement.bordereau?.client?.name}</p>
                    <p>Date dépôt: {new Date(virement.dateDepot).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3>Statistiques Financières</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9', textAlign: 'center' }}>
                  <h4>Virements Quotidiens</h4>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3498db' }}>{dashboardData.financialStats?.dailyVirements}</p>
                </div>
                <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9', textAlign: 'center' }}>
                  <h4>Virements Mensuels</h4>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#27ae60' }}>{dashboardData.financialStats?.monthlyVirements}</p>
                </div>
                <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9', textAlign: 'center' }}>
                  <h4>Montant Moyen</h4>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e74c3c' }}>{dashboardData.financialStats?.avgAmount?.toLocaleString()} €</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'BO':
      case 'BUREAU_ORDRE':
        return (
          <div style={{ marginTop: '2rem' }}>
            <h3>Bordereaux en Attente</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {dashboardData.pendingBordereaux?.map((bordereau: any, index: number) => (
                <div key={index} style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                  <h4>Bordereau {bordereau.reference}</h4>
                  <p>Client: {bordereau.client?.name}</p>
                  <p>Statut: {bordereau.statut}</p>
                  <p>Reçu le: {new Date(bordereau.dateReception).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'SCAN_TEAM':
        return (
          <div style={{ marginTop: '2rem' }}>
            <h3>File d'Attente Scan</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {dashboardData.scanQueue?.map((bordereau: any, index: number) => (
                <div key={index} style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                  <h4>Bordereau {bordereau.reference}</h4>
                  <p>Client: {bordereau.client?.name}</p>
                  <p>Statut: {bordereau.statut}</p>
                  <p>Reçu le: {new Date(bordereau.dateReception).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'CLIENT_SERVICE':
        return (
          <div style={{ marginTop: '2rem' }}>
            <h3>Réclamations Actives</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {dashboardData.activeReclamations?.map((reclamation: any, index: number) => (
                <div key={index} style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                  <h4>Réclamation #{reclamation.id}</h4>
                  <p>Client: {reclamation.client?.name}</p>
                  <p>Statut: {reclamation.status}</p>
                  <p>Créée le: {new Date(reclamation.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div style={{ marginTop: '2rem', padding: '2rem', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9f9f9', textAlign: 'center' }}>
            <h3>Tableau de Bord - {dashboardData.role}</h3>
            <p>Contenu spécifique au rôle en cours de développement.</p>
          </div>
        );
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      {/* COMMENTED OUT: Original Header and Filters */}
      {/* {Header and Filters sections commented out} */}

      {/* Chef d'équipe Style Header and Filters for Super Admin and Responsable Département */}
      {(dashboardData?.role === 'SUPER_ADMIN' || dashboardData?.role === 'ADMINISTRATEUR' || user?.role === 'RESPONSABLE_DEPARTEMENT') && (
        <div style={{ fontFamily: 'Arial, sans-serif', background: '#f5f5f5', minHeight: '100vh' }}>
          {/* Header Bar (Red Background) */}
          <div style={{ background: '#d52b36', color: 'white', padding: '20px 0', textAlign: 'center' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0 }}>Dashboard {isReadOnly ? 'Responsable Département' : 'Super Admin'}</h1>
            {isReadOnly && (
              <div style={{ marginTop: '8px', padding: '8px 16px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '20px', display: 'inline-block' }}>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>👁️ Mode Lecture Seule - Accès complet en consultation</span>
              </div>
            )}
          </div>

          <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
            {/* Super Admin Dashboard - Aggregated data from all chef équipes */}
            <div>
              {/* Statistics Section (Cards Row) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {/* Prestation Card */}
                <div style={{ background: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Prestation</h3>
                    <span style={{ background: '#d52b36', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>{superAdminStats.prestation?.total || 0}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>Par client:</div>
                    {Object.entries(superAdminStats.prestation?.breakdown || {}).map(([key, value]) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                        <span>{key}:</span> <span>{String(value)}</span>
                      </div>
                    ))}
                    <div style={{ fontWeight: 'bold', marginTop: '6px', marginBottom: '4px', color: '#333' }}>Par gestionnaire:</div>
                    {Object.entries(superAdminStats.prestation?.gestionnaireBreakdown || {}).map(([key, value]) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                        <span>{key}:</span> <span>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Other cards */}
                <div style={{ background: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Adhésion</h3>
                    <span style={{ background: '#d52b36', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>{superAdminStats.adhesion?.total || 0}</span>
                  </div>
                </div>
                <div style={{ background: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Complément de dossier</h3>
                    <span style={{ background: '#2196f3', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>{superAdminStats.complement?.total || 0}</span>
                  </div>
                </div>
                <div style={{ background: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Résiliation</h3>
                    <span style={{ background: '#d52b36', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>{superAdminStats.resiliation?.total || 0}</span>
                  </div>
                </div>
                <div style={{ background: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Réclamation</h3>
                    <span style={{ background: '#d52b36', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>{superAdminStats.reclamation?.total || 0}</span>
                  </div>
                </div>
                <div style={{ background: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Avenant</h3>
                    <span style={{ background: '#d52b36', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>{superAdminStats.avenant?.total || 0}</span>
                  </div>
                </div>
              </div>

              {/* Affectations par Gestionnaire */}
              <div style={{ background: 'white', borderRadius: '8px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', margin: 0 }}>Affectations par Gestionnaire</h3>
                  <span style={{ fontSize: '14px', color: '#666' }}>Tous les gestionnaires</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                  {superAdminGestionnaireAssignments.map((assignment, index) => (
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
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#dc3545' }}>↩ Retournés:</span>
                          <span style={{ fontWeight: 'bold' }}>{assignment.retournes || 0}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: '#6c757d' }}>
                        <strong>Par type:</strong> {Object.entries(assignment.documentsByType || {}).map(([type, count]) => `${type}: ${count}`).join(', ') || 'Aucun'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Derniers Bordereaux Ajoutés */}
              <div style={{ background: 'white', borderRadius: '8px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>Derniers Bordereaux Ajoutés</h3>
                
                {/* FILTERS */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <input type="text" placeholder="Référence" value={filter1.ref} onChange={(e) => setFilter1({...filter1, ref: e.target.value})} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '140px' }} />
                  <input type="text" placeholder="Client" value={filter1.client} onChange={(e) => setFilter1({...filter1, client: e.target.value})} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '140px' }} />
                  <select value={filter1.type} onChange={(e) => setFilter1({...filter1, type: e.target.value})} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '120px' }}>
                    <option value="">Type</option>
                    <option value="Prestation">Prestation</option>
                    <option value="Adhésion">Adhésion</option>
                  </select>
                  <select value={filter1.statut} onChange={(e) => setFilter1({...filter1, statut: e.target.value})} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '120px' }}>
                    <option value="">Statut</option>
                    {allUniqueStatuts.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input type="date" value={filter1.dateFrom} onChange={(e) => setFilter1({...filter1, dateFrom: e.target.value})} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '130px' }} />
                  <input type="date" value={filter1.dateTo} onChange={(e) => setFilter1({...filter1, dateTo: e.target.value})} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '130px' }} />
                  <button onClick={() => setFilter1({ ref: '', client: '', type: '', statut: '', dateFrom: '', dateTo: '' })} style={{ padding: '6px 12px', background: '#d52b36', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>Effacer</button>
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
                      {filteredDerniers.slice((superAdminDerniersPage - 1) * superAdminDerniersPerPage, superAdminDerniersPage * superAdminDerniersPerPage).map((dossier, index) => (
                        <tr key={dossier.id} style={{ background: index % 2 === 0 ? '#ffffff' : '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                          <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: '600', color: '#0066cc' }}>{dossier.reference}</td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>{dossier.client}</td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>{dossier.type === 'Aucun document' ? 'Prestation' : dossier.type}</td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '40px', height: '6px', background: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${dossier.statut === 'Traité' ? 100 : dossier.completionPercentage || 0}%`, height: '100%', background: (dossier.statut === 'Traité' ? 100 : dossier.completionPercentage || 0) >= 80 ? '#4caf50' : (dossier.statut === 'Traité' ? 100 : dossier.completionPercentage || 0) >= 50 ? '#ff9800' : '#f44336' }} />
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{dossier.statut === 'Traité' ? 100 : dossier.completionPercentage || 0}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              <span style={{ background: dossier.statut === 'Traité' ? '#4caf50' : dossier.statut === 'En cours' ? '#ff9800' : '#f44336', color: 'white', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }}>
                                {dossier.statut}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>{dossier.date}</td>
                          {/* <td style={{ padding: '12px 8px' }}>
                            {!isReadOnly && (
                              <button onClick={() => handleSuperAdminModifyStatus(dossier)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} title="Modifier Statut">✏️</button>
                            )}
                          </td> */}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredDerniers.length > superAdminDerniersPerPage && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e0e0e0' }}>
                    <button onClick={() => setSuperAdminDerniersPage(prev => Math.max(1, prev - 1))} disabled={superAdminDerniersPage === 1} style={{ background: superAdminDerniersPage === 1 ? '#e0e0e0' : '#d32f2f', color: superAdminDerniersPage === 1 ? '#999' : 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: superAdminDerniersPage === 1 ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 'bold' }}>← Précédent</button>
                    <span style={{ fontSize: '14px', color: '#666' }}>Page {superAdminDerniersPage} sur {Math.ceil(filteredDerniers.length / superAdminDerniersPerPage)}</span>
                    <button onClick={() => setSuperAdminDerniersPage(prev => Math.min(Math.ceil(filteredDerniers.length / superAdminDerniersPerPage), prev + 1))} disabled={superAdminDerniersPage >= Math.ceil(filteredDerniers.length / superAdminDerniersPerPage)} style={{ background: superAdminDerniersPage >= Math.ceil(filteredDerniers.length / superAdminDerniersPerPage) ? '#e0e0e0' : '#d32f2f', color: superAdminDerniersPage >= Math.ceil(filteredDerniers.length / superAdminDerniersPerPage) ? '#999' : 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: superAdminDerniersPage >= Math.ceil(filteredDerniers.length / superAdminDerniersPerPage) ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 'bold' }}>Suivant →</button>
                  </div>
                )}
              </div>

              {/* Bordereaux en cours */}
              <div style={{ background: 'white', borderRadius: '8px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>Bordereaux  ({superAdminDossiersEnCours.length} total)</h3>
                
                {/* FILTERS */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <input type="text" placeholder="Référence" value={filter2.ref} onChange={(e) => setFilter2({...filter2, ref: e.target.value})} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '140px' }} />
                  <input type="text" placeholder="Client" value={filter2.client} onChange={(e) => setFilter2({...filter2, client: e.target.value})} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '140px' }} />
                  <select value={filter2.statut} onChange={(e) => setFilter2({...filter2, statut: e.target.value})} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '120px' }}>
                    <option value="">Statut</option>
                    {allUniqueStatuts.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input type="date" value={filter2.dateFrom} onChange={(e) => setFilter2({...filter2, dateFrom: e.target.value})} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '130px' }} />
                  <input type="date" value={filter2.dateTo} onChange={(e) => setFilter2({...filter2, dateTo: e.target.value})} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '130px' }} />
                  <button onClick={() => setFilter2({ ref: '', client: '', statut: '', dateFrom: '', dateTo: '' })} style={{ padding: '6px 12px', background: '#d52b36', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>Effacer</button>
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
                        {/* <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Actions</th> */}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEnCours.slice((superAdminBordereauxPage - 1) * superAdminBordereauxPerPage, superAdminBordereauxPage * superAdminBordereauxPerPage).map((dossier, index) => (
                        <tr key={dossier.id} style={{ background: index % 2 === 0 ? '#ffffff' : '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                          <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: '600', color: '#0066cc' }}>{dossier.reference}</td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>{dossier.client}</td>
                          <td style={{ padding: '12px 8px' }}>
                            <span style={{ background: dossier.statut === 'Traité' ? '#4caf50' : dossier.statut === 'En cours' ? '#ff9800' : '#2196f3', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{dossier.statut}</span>
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '40px', height: '6px', background: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${dossier.completionPercentage || 0}%`, height: '100%', background: (dossier.completionPercentage || 0) >= 80 ? '#4caf50' : (dossier.completionPercentage || 0) >= 50 ? '#ff9800' : '#f44336' }} />
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{dossier.completionPercentage || 0}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {(dossier.dossierStates || [dossier.statut]).map((state: string, idx: number) => (
                                <span key={idx} style={{ background: state === 'Traité' ? '#4caf50' : state === 'En cours' ? '#ff9800' : '#f44336', color: 'white', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }}>
                                  {state}
                                </span>
                              ))}
                            </div>
                          </td>
                          {/* <td style={{ padding: '12px 8px' }}>
                            {!isReadOnly && (
                              <button onClick={() => handleSuperAdminModifyStatus(dossier)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} title="Modifier Statut">✏️</button>
                            )}
                          </td> */}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredEnCours.length >= superAdminBordereauxPerPage && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e0e0e0' }}>
                    <button onClick={() => setSuperAdminBordereauxPage(prev => Math.max(1, prev - 1))} disabled={superAdminBordereauxPage === 1} style={{ background: superAdminBordereauxPage === 1 ? '#e0e0e0' : '#d32f2f', color: superAdminBordereauxPage === 1 ? '#999' : 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: superAdminBordereauxPage === 1 ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 'bold' }}>← Précédent</button>
                    <span style={{ fontSize: '14px', color: '#666' }}>Page {superAdminBordereauxPage} sur {Math.ceil(filteredEnCours.length / superAdminBordereauxPerPage)}</span>
                    <button onClick={() => setSuperAdminBordereauxPage(prev => Math.min(Math.ceil(filteredEnCours.length / superAdminBordereauxPerPage), prev + 1))} disabled={superAdminBordereauxPage >= Math.ceil(filteredEnCours.length / superAdminBordereauxPerPage)} style={{ background: superAdminBordereauxPage >= Math.ceil(filteredEnCours.length / superAdminBordereauxPerPage) ? '#e0e0e0' : '#d32f2f', color: superAdminBordereauxPage >= Math.ceil(filteredEnCours.length / superAdminBordereauxPerPage) ? '#999' : 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: superAdminBordereauxPage >= Math.ceil(filteredEnCours.length / superAdminBordereauxPerPage) ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 'bold' }}>Suivant →</button>
                  </div>
                )}
              </div>

              {/* Dossiers Individuels */}
              <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px 12px 20px', borderBottom: '1px solid #e0e0e0' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', margin: 0 }}>Dossiers Individuels ({superAdminDocumentsIndividuels.length})</h3>
                  <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 8px 0' }}>Affichage par dossier (non par bordereau)</p>
                  
                  {/* FILTERS */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    <input type="text" placeholder="Réf. Dossier" value={filter3.ref} onChange={(e) => setFilter3({...filter3, ref: e.target.value})} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '130px' }} />
                    <input type="text" placeholder="Client" value={filter3.client} onChange={(e) => setFilter3({...filter3, client: e.target.value})} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '120px' }} />
                    <select value={filter3.type} onChange={(e) => setFilter3({...filter3, type: e.target.value})} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '110px' }}>
                      <option value="">Type</option>
                      <option value="Prestation">Prestation</option>
                      <option value="Adhésion">Adhésion</option>
                    </select>
                    <select value={filter3.statut} onChange={(e) => setFilter3({...filter3, statut: e.target.value})} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '110px' }}>
                      <option value="">Statut</option>
                      {allUniqueStatuts.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input type="text" placeholder="Gestionnaire" value={filter3.gest} onChange={(e) => setFilter3({...filter3, gest: e.target.value})} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '120px' }} />
                    <input type="date" value={filter3.dateFrom} onChange={(e) => setFilter3({...filter3, dateFrom: e.target.value})} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '120px' }} />
                    <input type="date" value={filter3.dateTo} onChange={(e) => setFilter3({...filter3, dateTo: e.target.value})} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '120px' }} />
                    <button onClick={() => setFilter3({ ref: '', client: '', type: '', statut: '', gest: '', dateFrom: '', dateTo: '' })} style={{ padding: '6px 12px', background: '#d52b36', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>Effacer</button>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#d52b36', color: 'white' }}>
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
                      {filteredIndividuels.slice((superAdminIndividuelsPage - 1) * superAdminIndividuelsPerPage, superAdminIndividuelsPage * superAdminIndividuelsPerPage).map((document, index) => (
                        <tr key={document.id} style={{ background: index % 2 === 0 ? '#ffffff' : '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                          <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: '500' }}>{document.reference}</td>
                          <td style={{ padding: '12px 8px', fontSize: '13px' }}>{document.bordereauReference}</td>
                          <td style={{ padding: '12px 8px', fontSize: '13px' }}>{document.client}</td>
                          <td style={{ padding: '12px 8px', fontSize: '13px' }}>{document.type}</td>
                          <td style={{ padding: '12px 8px' }}>
                            <span style={{ 
                              background: document.statut === 'Traité' ? '#4caf50' : document.statut === 'En cours' ? '#ff9800' : document.statut === 'Scanné' ? '#2196f3' : '#9e9e9e', 
                              color: 'white', 
                              padding: '3px 8px', 
                              borderRadius: '4px', 
                              fontSize: '11px', 
                              fontWeight: 'bold' 
                            }}>
                              {document.statut}
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '13px' }}>{document.gestionnaire || 'Non assigné'}</td>
                          <td style={{ padding: '12px 8px', fontSize: '13px', color: '#666' }}>{document.date}</td>
                          <td style={{ padding: '12px 8px' }}>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <button 
                                onClick={() => handleSuperAdminViewPDF(document.id)}
                                style={{ 
                                  background: '#2196f3', 
                                  color: 'white', 
                                  border: 'none', 
                                  padding: '4px 10px', 
                                  borderRadius: '4px', 
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  fontWeight: '500'
                                }}
                                title="Voir PDF du document"
                              >
                                Voir PDF
                              </button>
                              {!isReadOnly && (
                                <button 
                                  onClick={() => handleSuperAdminModifyStatus({ ...document, isDocument: true })}
                                  style={{ 
                                    background: '#ff9800', 
                                    color: 'white', 
                                    border: 'none', 
                                    padding: '4px 10px', 
                                    borderRadius: '4px', 
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                  }}
                                  title="Modifier statut du document"
                                >
                                  Modifier Statut
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredIndividuels.length > superAdminIndividuelsPerPage && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e0e0e0' }}>
                    <button onClick={() => setSuperAdminIndividuelsPage(prev => Math.max(1, prev - 1))} disabled={superAdminIndividuelsPage === 1} style={{ background: superAdminIndividuelsPage === 1 ? '#e0e0e0' : '#d32f2f', color: superAdminIndividuelsPage === 1 ? '#999' : 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: superAdminIndividuelsPage === 1 ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 'bold' }}>← Précédent</button>
                    <span style={{ fontSize: '14px', color: '#666' }}>Page {superAdminIndividuelsPage} sur {Math.ceil(filteredIndividuels.length / superAdminIndividuelsPerPage)}</span>
                    <button onClick={() => setSuperAdminIndividuelsPage(prev => Math.min(Math.ceil(filteredIndividuels.length / superAdminIndividuelsPerPage), prev + 1))} disabled={superAdminIndividuelsPage >= Math.ceil(filteredIndividuels.length / superAdminIndividuelsPerPage)} style={{ background: superAdminIndividuelsPage >= Math.ceil(filteredIndividuels.length / superAdminIndividuelsPerPage) ? '#e0e0e0' : '#d32f2f', color: superAdminIndividuelsPage >= Math.ceil(filteredIndividuels.length / superAdminIndividuelsPerPage) ? '#999' : 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: superAdminIndividuelsPage >= Math.ceil(filteredIndividuels.length / superAdminIndividuelsPerPage) ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 'bold' }}>Suivant →</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

                   )} 
        
        {/* Missing Chef d'équipe Modals */}
        {/* PDF View Modal */}
        {pdfViewModalOpen && selectedDossier && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
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
                <h2 style={{
                  margin: 0,
                  color: '#d32f2f',
                  fontSize: '20px',
                  fontWeight: 'bold'
                }}>
                  📄 Aperçu PDF du Dossier
                </h2>
                <button
                  onClick={() => setPdfViewModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#666',
                    padding: '4px'
                  }}
                >
                  ×
                </button>
              </div>

              {loadingDossierDetails ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
                  <p>Chargement des détails du dossier...</p>
                </div>
              ) : (
                <div>
                  {/* Dossier Details */}
                  <div style={{ display: 'grid', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Référence</label>
                        <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', marginTop: '4px' }}>
                          {selectedDossier.reference}
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Client</label>
                        <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', marginTop: '4px' }}>
                          {selectedDossier.client}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Type</label>
                        <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', marginTop: '4px' }}>
                          {selectedDossier.type}
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Statut</label>
                        <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', marginTop: '4px' }}>
                          <span style={{
                            background: selectedDossier.statut === 'Traité' ? '#4caf50' : selectedDossier.statut === 'En cours' ? '#ff9800' : '#2196f3',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            {selectedDossier.statut}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Gestionnaire</label>
                        <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', marginTop: '4px' }}>
                          {selectedDossier.gestionnaire || 'Non assigné'}
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Date</label>
                        <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', marginTop: '4px' }}>
                          {selectedDossier.date}
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Priorité</label>
                        <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', marginTop: '4px' }}>
                          <span style={{
                            background: getPriorityColor(selectedDossier.priorite || 'Normale'),
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            {selectedDossier.priorite || 'Normale'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Documents List */}
                  <div>
                    <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                      Documents ({dossierDetails?.documents?.length || 0})
                    </label>
                    <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                      {dossierDetails?.documents && dossierDetails.documents.length > 0 ? (
                        dossierDetails.documents.map((doc: any, index: number) => (
                          <div key={doc.id || index} style={{
                            padding: '12px',
                            borderBottom: index < dossierDetails.documents.length - 1 ? '1px solid #f0f0f0' : 'none',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          onClick={() => {
                            console.log('🔍 DEBUG: Document clicked:', {
                              doc,
                              docId: doc.id,
                              fileName: doc.fileName || doc.name
                            });
                            handleDocumentPDFView(doc.id, doc.fileName || doc.name);
                          }}
                          >
                            <div>
                              <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                                📄 {doc.fileName || doc.name || `Document ${index + 1}`}
                              </div>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                Type: {doc.type || 'Non spécifié'} | 
                                Taille: {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : 'Inconnue'}
                              </div>
                              {doc.dateUpload && (
                                <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                                  Uploadé le: {new Date(doc.dateUpload).toLocaleDateString('fr-FR')}
                                </div>
                              )}
                            </div>
                            <button style={{
                              background: '#2196f3',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              📄 Voir PDF
                            </button>
                          </div>
                        ))
                      ) : (
                        <div style={{
                          padding: '20px',
                          textAlign: 'center',
                          color: '#666',
                          fontSize: '14px'
                        }}>
                          📄 Aucun document disponible pour ce dossier
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid #e0e0e0'
              }}>
                <button
                  onClick={() => {
                    setPdfViewModalOpen(false);
                    setDossierDetails(null);
                  }}
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
                  Fermer
                </button>
                <button
                  onClick={() => {
                    setPdfViewModalOpen(false);
                    setStatusModifyModalOpen(true);
                  }}
                  style={{
                    background: '#d32f2f',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  Modifier le Statut
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status Modify Modal - Chef d'équipe style */}
        {statusModifyModalOpen && selectedDossier && (
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
                  onClick={() => setStatusModifyModalOpen(false)}
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
                  Dossier: <strong>{selectedDossier.reference}</strong><br/>
                  Client: <strong>{selectedDossier.client}</strong><br/>
                  Statut actuel: <strong>{selectedDossier.statut}</strong>
                </p>
                
                <div style={{ display: 'grid', gap: '8px' }}>
                  {['Nouveau', 'En cours', 'Traité', 'Rejeté', 'Retourné'].map(status => {
                    const isDocumentOnly = status === 'Rejeté' || status === 'Retourné';
                    const isDisabled = isDocumentOnly && !selectedDossier?.isDocument;
                    return (
                      <button
                        key={status}
                        onClick={() => !isDisabled && handleModifyDossierStatus()}
                        onMouseDown={() => !isDisabled && setNewStatus(status)}
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
                  onClick={() => setStatusModifyModalOpen(false)}
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
        )}

        {/* Edit Type Modal */}
        {editModalOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1001
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
                  color: '#9c27b0',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}>
                  ✏️ Modifier le Type de Dossier
                </h3>
                <button
                  onClick={() => setEditModalOpen(false)}
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
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  color: '#333'
                }}>
                  Sélectionner le nouveau type :
                </label>
                
                <div style={{ display: 'grid', gap: '8px' }}>
                  {['Prestation', 'Adhésion', 'Complément Dossier', 'Avenant', 'Réclamation'].map(type => (
                    <label key={type} style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      border: selectedType === type ? '2px solid #9c27b0' : '1px solid #e0e0e0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: selectedType === type ? '#f3e5f5' : 'white',
                      transition: 'all 0.2s'
                    }}>
                      <input
                        type="radio"
                        name="documentType"
                        value={type}
                        checked={selectedType === type}
                        onChange={(e) => setSelectedType(e.target.value)}
                        style={{
                          marginRight: '12px',
                          accentColor: '#9c27b0'
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                          {type === 'Prestation' ? '💊' : 
                           type === 'Adhésion' ? '👤' :
                           type === 'Complément Dossier' ? '📄' :
                           type === 'Avenant' ? '📝' : '📞'} {type}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                          {type === 'Prestation' ? 'Bulletins de soins et remboursements' :
                           type === 'Adhésion' ? 'Nouvelles adhésions et inscriptions' :
                           type === 'Complément Dossier' ? 'Documents complémentaires' :
                           type === 'Avenant' ? 'Modifications contractuelles' : 'Réclamations et litiges'}
                        </div>
                      </div>
                    </label>
                  ))}
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
                  onClick={() => setEditModalOpen(false)}
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
                  onClick={() => {
                    // Handle change document type
                    setEditModalOpen(false);
                    alert('Type de document modifié avec succès');
                    loadChefEquipeData();
                  }}
                  disabled={!selectedType}
                  style={{
                    background: selectedType ? '#9c27b0' : '#ccc',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    cursor: selectedType ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  Confirmer la Modification
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PDF Modal */}
        {showSuperAdminPDFModal && (
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
                    {currentSuperAdminDossier?.reference} - {currentSuperAdminDossier?.client}
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>
                    Type: {currentSuperAdminDossier?.type} | Statut: {currentSuperAdminDossier?.statut}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {/*<select 
                    onChange={(e) => handleSuperAdminStatusChangeInModal(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Modifier statut</option>
                    <option value="En cours">En cours</option>
                    <option value="Traité">Traité</option>
                    <option value="Retourné">Retourné</option>
                  </select>*/}
                  <button 
                    onClick={closeSuperAdminPDFModal}
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
                {currentSuperAdminPDFUrl ? (
                  <iframe
                    src={currentSuperAdminPDFUrl}
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
      )

      {/* Data Source & AI Status */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        {/* Data Source Indicator */}
        {dashboardData?.kpis?.dataSource && (
          <div style={{ 
            padding: '1rem', 
            borderRadius: '8px', 
            backgroundColor: dashboardData.kpis.dataSource === 'ARS_DATABASE_FALLBACK' ? '#fff3cd' : 
                            dashboardData.kpis.dataSource === 'ERROR_FALLBACK' ? '#f8d7da' : '#d4edda',
            border: `1px solid ${dashboardData.kpis.dataSource === 'ARS_DATABASE_FALLBACK' ? '#ffeaa7' : 
                                 dashboardData.kpis.dataSource === 'ERROR_FALLBACK' ? '#f5c6cb' : '#c3e6cb'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <span style={{ fontSize: '1.5rem' }}>
              {dashboardData.kpis.dataSource === 'ARS_DATABASE_FALLBACK' ? '⚠️' : 
               dashboardData.kpis.dataSource === 'ERROR_FALLBACK' ? '🚨' : '✅'}
            </span>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: '600' }}>
                {dashboardData.kpis.dataSource === 'ARS_DATABASE_FALLBACK' ? 'Mode Dégradé ARS' : 
                 dashboardData.kpis.dataSource === 'ERROR_FALLBACK' ? 'Erreur Système ARS' : 'Système ARS Opérationnel'}
              </span>
              <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.25rem' }}>
                {dashboardData.kpis.dataSource === 'ARS_DATABASE_FALLBACK' ? 
                  'Données réelles ARS disponibles - Service IA temporairement indisponible' : 
                 dashboardData.kpis.dataSource === 'ERROR_FALLBACK' ? 
                  'Problème de connexion base de données - Contactez l\'administrateur' : 
                  'Tous les services ARS fonctionnent normalement'}
              </div>
            </div>
          </div>
        )}
        
        {/* AI Status */}
        {aiInsights && (
          <div style={{ 
            padding: '1rem', 
            borderRadius: '8px', 
            backgroundColor: aiInsights.health.status === 'healthy' ? '#d4edda' : '#fff3cd',
            border: `1px solid ${aiInsights.health.status === 'healthy' ? '#c3e6cb' : '#ffeaa7'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <span style={{ fontSize: '1.5rem' }}>🤖</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: '600' }}>Intelligence Artificielle ARS: {aiInsights.health.status === 'healthy' ? 'Active' : 'Indisponible'}</span>
              {aiInsights.health.message && (
                <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.25rem' }}>
                  {aiInsights.health.message}
                </div>
              )}
            </div>
            {aiInsights.recommendations.length > 0 && (
              <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#28a745', color: 'white', borderRadius: '4px', fontSize: '0.8rem' }}>
                {aiInsights.recommendations.length} recommandations IA
              </span>
            )}
            {aiInsights.health.status === 'healthy' && (
              <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#17a2b8', color: 'white', borderRadius: '4px', fontSize: '0.8rem' }}>
                IA Opérationnelle
              </span>
            )}
            {aiInsights.health.status === 'unavailable' && (
              <button 
                onClick={fetchAIInsights}
                style={{ padding: '0.25rem 0.5rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Réactiver IA
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      {dashboardData && (
        <>
         

          {/* Document-Level Analytics Summary */}
          {(dashboardData?.role === 'SUPER_ADMIN' || dashboardData?.role === 'ADMINISTRATEUR' || user?.role === 'RESPONSABLE_DEPARTEMENT') && (
            <div style={{ marginTop: '2rem' }}>
              <div style={{ padding: '2rem', border: '1px solid #e0e7ff', borderRadius: '12px', backgroundColor: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ width: '4px', height: '24px', backgroundColor: '#6366f1', marginRight: '1rem', borderRadius: '2px' }}></div>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#1f2937' }}>Analyse Documentaire Complète</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                  <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#374151' }}>Documents avec SLA</h4>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#059669', marginBottom: '0.5rem' }}>
                      {(dashboardData.documentStats?.bulletinSoin || 0) + (dashboardData.documentStats?.complementInfo || 0) + (dashboardData.documentStats?.adhesions || 0) + (dashboardData.documentStats?.reclamations || 0)}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Soumis aux délais de traitement</div>
                  </div>
                  <div style={{ padding: '1.5rem', backgroundColor: '#fff7ed', borderRadius: '8px', border: '1px solid #fed7aa' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#ea580c' }}>Documents exemptés SLA</h4>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ea580c', marginBottom: '0.5rem' }}>
                      {(dashboardData.documentStats?.contrats || 0) + (dashboardData.documentStats?.resiliations || 0) + (dashboardData.documentStats?.conventions || 0)}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#9a3412' }}>Pas de contrainte temporelle</div>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* Workforce Estimator for Admin roles */}
          {canViewFeature(user?.role, 'workforce_estimator') && (
            <div style={{ marginTop: '2rem' }}>
              <WorkforceEstimator />
            </div>
          )}

          {/* Role-specific content */}
          {renderRoleSpecificContent()}

          
          {(dashboardData?.role === 'SUPER_ADMIN' || dashboardData?.role === 'ADMINISTRATEUR' || dashboardData?.role === 'CHEF_EQUIPE' || dashboardData?.role === 'RESPONSABLE_DEPARTEMENT') && (
            <div style={{ marginTop: '2rem' }}>
              <div style={{ padding: '2rem', border: '1px solid #e0e7ff', borderRadius: '12px', backgroundColor: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ width: '4px', height: '24px', backgroundColor: '#10b981', marginRight: '1rem', borderRadius: '2px' }}></div>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#1f2937' }}>Liste Dossiers</h3>
                </div>
                <DossiersList params={{}} />
              </div>
            </div>
          )} 

          {/* Module Bulletin de soins - AI Suggestions */}
          {(dashboardData?.role === 'SUPER_ADMIN' || dashboardData?.role === 'ADMINISTRATEUR' || user?.role === 'RESPONSABLE_DEPARTEMENT') && (
            <div style={{ marginTop: '2rem' }}>
              <div style={{ padding: '2rem', border: '1px solid #e0e7ff', borderRadius: '12px', backgroundColor: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ width: '4px', height: '24px', backgroundColor: '#10b981', marginRight: '1rem', borderRadius: '2px' }}></div>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#1f2937' }}>Module Bulletin de Soins</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                  <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600', color: '#374151' }}>Suggestions d'Assignation IA</h4>
                    <div style={{ height: '300px', overflow: 'auto' }}>
                      <AssignmentSuggestions showActions={false} />
                    </div>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600', color: '#374151' }}>Suggestions de Rééquilibrage IA</h4>
                    <div style={{ height: '300px', overflow: 'auto' }}>
                      <RebalancingSuggestions />
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600', color: '#374151' }}>Priorités par Gestionnaire</h4>
                  <PrioritiesDashboard />
                </div>
              </div>
            </div>
          )}

          {/* AI Dashboard for Admin roles */}
          {canViewFeature(user?.role, 'department_stats') && (
            <div style={{ marginTop: '2rem' }}>
              <AIDashboard />
            </div>
          )}

          {/* AI Recommendations */}
          {aiInsights?.recommendations.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <div style={{ padding: '2rem', border: '1px solid #e0e7ff', borderRadius: '12px', backgroundColor: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ width: '4px', height: '24px', backgroundColor: '#6366f1', marginRight: '1rem', borderRadius: '2px' }}></div>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#1f2937' }}>Recommandations IA</h3>
                  <div style={{ marginLeft: 'auto', padding: '0.5rem 1rem', backgroundColor: '#6366f1', color: 'white', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '500' }}>
                    🤖 {aiInsights.recommendations.length} recommandations
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                  {aiInsights.recommendations.map((rec: any, index: number) => (
                    <div key={index} style={{ 
                      padding: '1.5rem', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '10px', 
                      backgroundColor: '#fafbfc',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px -8px rgba(99, 102, 241, 0.15)';
                      e.currentTarget.style.borderColor = '#6366f1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}>
                      <div style={{ position: 'absolute', top: '1rem', right: '1rem', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '0.75rem' }}>
                          <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>{(rec.teamId || 'G').charAt(0)}</span>
                        </div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#374151' }}>{rec.teamId || 'Général'}</h4>
                      </div>
                      <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <p style={{ margin: 0, color: '#4b5563', lineHeight: '1.5' }}>{rec.recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* AI Service Status Info */}
          {aiInsights?.health.status === 'unavailable' && (
            <div style={{ marginTop: '2rem' }}>
              <div style={{ padding: '1rem', border: '1px solid #ffeaa7', borderRadius: '8px', backgroundColor: '#fffbf0' }}>
                <h3>Service IA Indisponible</h3>
                <p>Le service d'intelligence artificielle n'est pas accessible actuellement. Les fonctionnalités de base du tableau de bord restent disponibles.</p>
                <button 
                  onClick={fetchAIInsights}
                  style={{ padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Réessayer la connexion IA
                </button>
              </div>
            </div>
          )}

          {/* Feedback */}
          <div style={{ marginTop: '2rem' }}>
            <FeedbackForm page="enhanced-dashboard" />
          </div>
        </>
      )}
    </div>
  );
};

export default EnhancedDashboard;