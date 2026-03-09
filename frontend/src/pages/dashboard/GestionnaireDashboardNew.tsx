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

function GestionnaireDashboardNew() {
  const { user } = useAuth();
  
  const getStatusColor = (statut?: string) => {
    switch (statut) {
      case 'À scanner': return '#9e9e9e';
      case 'En cours de Scan': return '#2196f3';
      case 'A_AFFECTER': return '#ff9800';
      case 'Traité': return '#4caf50';
      case 'En cours de traitement': return '#ff9800';
      case 'En cours': return '#ff9800';
      case 'Retourné': return '#f44336';
      case 'Nouveau': return '#2196f3';
      case 'Scanné': return '#2196f3';
      case 'Rejeté': return '#f44336';
      default: return '#9e9e9e';
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
  }, []);

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
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0 }}>Dashboard Gestionnaire</h1>
        <p style={{ margin: '8px 0 0 0', fontSize: '16px', opacity: 0.9 }}>
          Mes dossiers assignés - {user?.fullName}
        </p>
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
            </div>
          </div>

          {/* Adhésion Card */}
          <div style={{ background: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Adhésion</h3>
              <span style={{ background: '#d52b36', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>{stats.adhesion?.total || 0}</span>
            </div>
            {stats.adhesion?.total > 0 && (
              <div style={{ fontSize: '12px', color: '#666' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>Par client:</div>
                {Object.entries(stats.adhesion?.breakdown || {}).filter(([key, value]) => value > 0).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                    <span>{key}:</span> <span>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Complément de dossier Card */}
          <div style={{ background: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Complément de dossier</h3>
              <span style={{ background: '#2196f3', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>{stats.complement?.total || 0}</span>
            </div>
            {stats.complement?.total > 0 && (
              <div style={{ fontSize: '12px', color: '#666' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>Par client:</div>
                {Object.entries(stats.complement?.breakdown || {}).filter(([key, value]) => value > 0).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                    <span>{key}:</span> <span>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Résiliation Card */}
          <div style={{ background: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Résiliation</h3>
              <span style={{ background: '#d52b36', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>{stats.resiliation?.total || 0}</span>
            </div>
            {stats.resiliation?.total > 0 && (
              <div style={{ fontSize: '12px', color: '#666' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>Par client:</div>
                {Object.entries(stats.resiliation?.breakdown || {}).filter(([key, value]) => value > 0).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                    <span>{key}:</span> <span>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Réclamation Card */}
          <div style={{ background: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Réclamation</h3>
              <span style={{ background: '#d52b36', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>{stats.reclamation?.total || 0}</span>
            </div>
            {stats.reclamation?.total > 0 && (
              <div style={{ fontSize: '12px', color: '#666' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>Par client:</div>
                {Object.entries(stats.reclamation?.breakdown || {}).filter(([key, value]) => value > 0).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                    <span>{key}:</span> <span>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Avenant Card */}
          <div style={{ background: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Avenant</h3>
              <span style={{ background: '#d52b36', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>{stats.avenant?.total || 0}</span>
            </div>
            {stats.avenant?.total > 0 && (
              <div style={{ fontSize: '12px', color: '#666' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>Par client:</div>
                {Object.entries(stats.avenant?.breakdown || {}).filter(([key, value]) => value > 0).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                    <span>{key}:</span> <span>{value}</span>
                  </div>
                ))}
              </div>
            )}
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
            <span style={{ fontSize: '14px', color: '#666' }}>
              {selectedDossiers.length > 0 ? `${selectedDossiers.length} dossier(s) sélectionné(s)` : 'Mes dossiers assignés uniquement'}
            </span>
          </div>
        </div>

        {/* Gestionnaire Assignments Section */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', margin: 0 }}>Mes Affectations</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {gestionnaireAssignments
              .filter(assignment => assignment.gestionnaire === user?.fullName)
              .map((assignment, index) => (
              <div key={index} style={{ background: '#f8f9fa', borderRadius: '6px', padding: '12px', border: '1px solid #dee2e6' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', color: '#495057' }}>
                  👤 {assignment.gestionnaire}
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
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#6c757d' }}>
                  <strong>Par type:</strong> {Object.entries(assignment.documentsByType || {}).map(([type, count]) => `${type}: ${count}`).join(', ') || 'Aucun'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Derniers Bordereaux Ajoutés Section */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ color: '#d52b36', fontSize: '16px', marginRight: '8px' }}>📋</span>
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>Derniers Bordereaux Ajoutés</span>
              <span style={{ background: '#4caf50', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', marginLeft: '12px' }}>En temps réel</span>
            </div>
            {/*<button style={{ background: 'none', border: 'none', color: '#2196f3', cursor: 'pointer', fontSize: '12px' }}>Voir tout</button>*/}
          </div>
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
            <input type="date" value={filterDerniers.dateFrom} onChange={(e) => setFilterDerniers({...filterDerniers, dateFrom: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <input type="date" value={filterDerniers.dateTo} onChange={(e) => setFilterDerniers({...filterDerniers, dateTo: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <button onClick={() => setFilterDerniers({ reference: '', client: '', type: '', statut: '', dateFrom: '', dateTo: '' })} style={{ padding: '6px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>Effacer</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: '#666' }}>Ref. Dossier</th>
                  <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: '#666' }}>Client</th>
                  <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: '#666' }}>Type</th>
                  <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: '#666' }}>Statut</th>
                  <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: '#666' }}>Gestionnaire</th>
                  <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: '#666' }}>% Finalisation</th>
                  <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: '#666' }}>États Dossiers</th>
                  <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: '#666' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: '#666' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDerniersTable.slice((derniersBordereauxPage - 1) * 5, derniersBordereauxPage * 5).map((dossier, index) => {
                  const completionPercentage = dossier.completionPercentage || 0;
                  const dossierStates = dossier.dossierStates || [dossier.statut];
                  const isGestionnaire = user?.role === 'GESTIONNAIRE';
                  const canModify = !isGestionnaire && (dossier.gestionnaire === user?.fullName || user?.role === 'CHEF_EQUIPE' || user?.role === 'SUPER_ADMIN');
                  return (
                    <tr key={`recent-${dossier.id}`} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: 'bold' }}>{dossier.reference}</td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>{dossier.client || dossier.societe}</td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', background: index % 2 === 0 ? '#4caf50' : '#2196f3', borderRadius: '50%' }}></span>
                          {dossier.type}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                        <span style={{ background: '#4caf50', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{dossier.statut}</span>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '24px', height: '24px', background: '#9c27b0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: 'bold' }}>
                            {(dossier.gestionnaire || user?.fullName || 'N').charAt(0)}
                          </div>
                          {dossier.gestionnaire || user?.fullName || 'Moi'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '40px', height: '6px', background: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${completionPercentage}%`, height: '100%', background: completionPercentage >= 80 ? '#4caf50' : completionPercentage >= 50 ? '#ff9800' : '#f44336', transition: 'width 0.3s ease' }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{completionPercentage}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {dossierStates?.filter((state): state is string => Boolean(state)).map((state: string, idx: number) => (
                            <span key={idx} style={{ background: state === 'Traité' ? '#4caf50' : state === 'En cours' ? '#ff9800' : '#f44336', color: 'white', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }}>
                              {state}
                            </span>
                          )) || <span style={{ fontSize: '12px', color: '#999' }}>-</span>}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px', color: '#666' }}>{dossier.date}</td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {canModify ? (
                            <button onClick={() => handleModifyStatus(dossier.id)} style={{ background: 'none', border: 'none', color: '#9c27b0', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }} onMouseEnter={(e) => (e.target as HTMLElement).style.color = '#7b1fa2'} onMouseLeave={(e) => (e.target as HTMLElement).style.color = '#9c27b0'}>Modifier</button>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#ccc' }}>-</span>
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
            <div style={{ padding: '16px', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              <button 
                onClick={() => setDerniersBordereauxPage(Math.max(1, derniersBordereauxPage - 1))}
                disabled={derniersBordereauxPage === 1}
                style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px', cursor: derniersBordereauxPage === 1 ? 'not-allowed' : 'pointer', fontSize: '12px' }}
              >
                ← Précédent
              </button>
              <span style={{ fontSize: '12px', color: '#666' }}>
                Page {derniersBordereauxPage} sur {Math.ceil(filteredDerniersTable.length / 5)}
              </span>
              <button 
                onClick={() => setDerniersBordereauxPage(Math.min(Math.ceil(filteredDossiers.length / 5), derniersBordereauxPage + 1))}
                disabled={derniersBordereauxPage >= Math.ceil(filteredDossiers.length / 5)}
                style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px', cursor: derniersBordereauxPage >= Math.ceil(filteredDossiers.length / 5) ? 'not-allowed' : 'pointer', fontSize: '12px' }}
              >
                Suivant →
              </button>
            </div>
          )}
        </div>

        {/* Bordereaux en cours Section */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ color: '#ff9800', fontSize: '16px', marginRight: '8px' }}>⏳</span>
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>Bordereaux</span>
              <span style={{ background: '#ff9800', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', marginLeft: '12px' }}>Priorité</span>
            </div>
            {/*<button style={{ background: 'none', border: 'none', color: '#2196f3', cursor: 'pointer', fontSize: '12px' }}>Voir tout</button>*/}
          </div>
          {/* Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
            <input type="text" placeholder="Référence" value={filterBordereaux.reference} onChange={(e) => setFilterBordereaux({...filterBordereaux, reference: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <input type="text" placeholder="Client" value={filterBordereaux.client} onChange={(e) => setFilterBordereaux({...filterBordereaux, client: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <select value={filterBordereaux.statut} onChange={(e) => setFilterBordereaux({...filterBordereaux, statut: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}>
              <option value="">Tous statuts</option>
              {uniqueStatuts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="date" value={filterBordereaux.dateFrom} onChange={(e) => setFilterBordereaux({...filterBordereaux, dateFrom: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <input type="date" value={filterBordereaux.dateTo} onChange={(e) => setFilterBordereaux({...filterBordereaux, dateTo: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <button onClick={() => setFilterBordereaux({ reference: '', client: '', statut: '', dateFrom: '', dateTo: '' })} style={{ padding: '6px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>Effacer</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: '#666' }}>Référence</th>
                  <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: '#666' }}>Client</th>
                  <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: '#666' }}>Statut</th>
                  <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: '#666' }}>% Finalisation</th>
                  <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: '#666' }}>États Dossiers</th>
                  <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: '#666' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBordereauxTable.slice((bordereauxEnCoursPage - 1) * 5, bordereauxEnCoursPage * 5).map((dossier, index) => {
                  const completionPercentage = dossier.completionPercentage || 0;
                  const dossierStates = dossier.dossierStates || [dossier.statut];
                  const isGestionnaire = user?.role === 'GESTIONNAIRE';
                  return (
                    <tr key={`bordereau-${dossier.id}`} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: 'bold' }}>{dossier.reference}</td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>{dossier.client || dossier.societe}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ 
                          background: getStatusColor(dossier.statut), 
                          color: 'white', 
                          padding: '4px 8px', 
                          borderRadius: '12px', 
                          fontSize: '12px', 
                          fontWeight: 'bold' 
                        }}>
                          {dossier.statut || 'En cours de traitement'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '40px', height: '6px', background: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${completionPercentage}%`, height: '100%', background: completionPercentage >= 80 ? '#4caf50' : completionPercentage >= 50 ? '#ff9800' : '#f44336', transition: 'width 0.3s ease' }} />
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{completionPercentage}%</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {dossierStates?.filter((state): state is string => Boolean(state)).map((state: string, idx: number) => (
                            <span key={idx} style={{ background: state === 'Traité' ? '#4caf50' : state === 'En cours' ? '#ff9800' : '#f44336', color: 'white', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }}>
                              {state}
                            </span>
                          )) || <span style={{ fontSize: '12px', color: '#999' }}>Nouveau</span>}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                        <span style={{ fontSize: '12px', color: '#999' }}>Vue seule</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination for Bordereaux en cours */}
          {filteredBordereauxTable.length > 0 && (
            <div style={{ padding: '16px', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              <button 
                onClick={() => setBordereauxEnCoursPage(Math.max(1, bordereauxEnCoursPage - 1))}
                disabled={bordereauxEnCoursPage === 1}
                style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px', cursor: bordereauxEnCoursPage === 1 ? 'not-allowed' : 'pointer', fontSize: '12px' }}
              >
                ← Précédent
              </button>
              <span style={{ fontSize: '12px', color: '#666' }}>
                Page {bordereauxEnCoursPage} sur {Math.ceil(filteredBordereauxTable.length / 5)}
              </span>
              <button 
                onClick={() => setDerniersBordereauxPage(Math.min(Math.ceil(filteredDerniersTable.length / 5), derniersBordereauxPage + 1))}
                disabled={derniersBordereauxPage >= Math.ceil(filteredDerniersTable.length / 5)}
                style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px', cursor: bordereauxEnCoursPage >= Math.ceil(filteredDossiers.length / 5) ? 'not-allowed' : 'pointer', fontSize: '12px' }}
              >
                Suivant →
              </button>
            </div>
          )}
        </div>

        {/* Dossiers Section (Table) */}
        <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px 12px 20px', borderBottom: '1px solid #e0e0e0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', margin: 0 }}>Dossiers Individuels</h3>
                <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>Affichage par dossier (non par bordereau)</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>Total: {filteredDocumentsTable.length} dossiers</span>
               {/*} <button style={{ background: '#d52b36', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Actualiser</button>*/}
              </div>
            </div>
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
            <input type="date" value={filterDocuments.dateFrom} onChange={(e) => setFilterDocuments({...filterDocuments, dateFrom: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <input type="date" value={filterDocuments.dateTo} onChange={(e) => setFilterDocuments({...filterDocuments, dateTo: e.target.value})} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
            <button onClick={() => setFilterDocuments({ reference: '', bordereauReference: '', client: '', type: '', statut: '', gestionnaire: '', dateFrom: '', dateTo: '' })} style={{ padding: '6px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>Effacer</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #d52b36' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Réf. Dossier</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Réf. Bordereau</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Client</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Type</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Statut Dossier</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Gestionnaire</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Date</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocumentsTable.slice((dossiersIndividuelsPage - 1) * 20, dossiersIndividuelsPage * 20).map((document, index) => {
                  const isGestionnaire = user?.role === 'GESTIONNAIRE';
                  const canModify = isGestionnaire 
                    ? (!document.statusModifiedByGestionnaire && document.gestionnaire === user?.fullName)
                    : (document.gestionnaire === user?.fullName || user?.role === 'CHEF_EQUIPE' || user?.role === 'SUPER_ADMIN');
                  return (
                    <tr key={document.id} style={{ 
                      borderBottom: '1px solid #f0f0f0', 
                      backgroundColor: highlightedDocId === document.id 
                        ? '#c8e6c9' 
                        : index % 2 === 0 ? '#ffffff' : '#fafafa',
                      transition: 'background-color 0.3s ease',
                      boxShadow: highlightedDocId === document.id ? '0 0 10px rgba(76, 175, 80, 0.5)' : 'none'
                    }}>
                      <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: 'bold' }}>{document.reference}</td>
                      <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: '600', color: '#9c27b0' }}>{(document as any).bordereauReference || 'N/A'}</td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>{document.client}</td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>{document.type}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ 
                          background: getStatusColor(document.statut), 
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
                      <td style={{ padding: '12px 8px', fontSize: '14px', color: '#666' }}>il y a 2 heures</td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button 
                            onClick={() => handleViewPDF(document.id)}
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              color: '#2196f3', 
                              cursor: 'pointer', 
                              fontSize: '12px',
                              textDecoration: 'underline',
                              padding: '4px 8px',
                              borderRadius: '4px'
                            }}
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
            <div style={{ padding: '16px', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              <button 
                onClick={() => setDossiersIndividuelsPage(Math.max(1, dossiersIndividuelsPage - 1))}
                disabled={dossiersIndividuelsPage === 1}
                style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px', cursor: dossiersIndividuelsPage === 1 ? 'not-allowed' : 'pointer', fontSize: '12px' }}
              >
                ← Précédent
              </button>
              <span style={{ fontSize: '12px', color: '#666' }}>
                Page {dossiersIndividuelsPage} sur {Math.ceil(filteredDocumentsTable.length / 20)}
              </span>
              <button 
                onClick={() => setDossiersIndividuelsPage(Math.min(Math.ceil(filteredDocumentsTable.length / 20), dossiersIndividuelsPage + 1))}
                disabled={dossiersIndividuelsPage >= Math.ceil(filteredDocumentsTable.length / 20)}
                style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px', cursor: dossiersIndividuelsPage >= Math.ceil(filteredDocumentsTable.length / 20) ? 'not-allowed' : 'pointer', fontSize: '12px' }}
              >
                Suivant →
              </button>
            </div>
          )}
        </div>

        {/* IA & Suggestions Section */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
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
            backgroundColor: '#4caf50',
            color: 'white',
            borderRadius: '8px',
            padding: '16px 24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '300px'
          }}>
            <span style={{ fontSize: '24px' }}>✅</span>
            <span style={{ fontSize: '15px', fontWeight: '500' }}>{successMessage}</span>
            <button
              onClick={() => setShowSuccessToast(false)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '16px',
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
                  {currentDossier?.reference} - {currentDossier?.client || currentDossier?.societe}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>
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
                      style={{
                        background: '#9c27b0',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      ✏️ Modifier Statut
                    </button>
                  ) : (
                    <span style={{ fontSize: '14px', color: '#999', padding: '8px 16px', fontStyle: 'italic' }}>
                      📖 Lecture seule
                    </span>
                  );
                })()}
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
      {showStatusModal && currentDossier && (
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
                      border: '1px solid #e0e0e0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      textAlign: 'left',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f0f0f0';
                      e.currentTarget.style.borderColor = '#d52b36';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.borderColor = '#e0e0e0';
                    }}
                  >
                    {status === 'En cours' ? '⏳' : status === 'Traité' ? '✅' : '↩️'} {status}
                  </button>
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
      )}
    </div>
  );
}

export default GestionnaireDashboardNew;