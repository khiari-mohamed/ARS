import React, { useState, useEffect } from 'react';
import { LocalAPI } from '../../services/axios';
import { useAuth } from '../../contexts/AuthContext';

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

const ChefEquipeTableauBordNew: React.FC = () => {
  const { user } = useAuth();
  const isGestionnaire = user?.role === 'GESTIONNAIRE';
  
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
  const [dossiersIndividuels, setDossiersIndividuels] = useState<any[]>([]);
  const [allDossiersIndividuels, setAllDossiersIndividuels] = useState<any[]>([]);
  const [gestionnaireFilter, setGestionnaireFilter] = useState('Tous');
  const [searchType, setSearchType] = useState('Ref. GSD');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('Tous types');
  const [statutFilter, setStatutFilter] = useState('Tous');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [pdfViewModalOpen, setPdfViewModalOpen] = useState(false);
  const [statusModifyModalOpen, setStatusModifyModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [derniersDossiersPage, setDerniersDossiersPage] = useState(1);
  const [dossiersIndividuelsPage, setDossiersIndividuelsPage] = useState(1);
  const itemsPerPage = 5;
  const dossiersIndividuelsPerPage = 20;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (derniersDossiers.length > 0) {
      setDerniersDossiersPage(1);
    }
  }, [derniersDossiers.length]);

  useEffect(() => {
    applyFiltersToAssignments();
  }, [typeFilter, searchQuery, allGestionnaireAssignments]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, typesRes, derniersRes, enCoursRes, assignmentsRes, individuelsRes] = await Promise.all([
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/stats'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/types-detail'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/derniers-dossiers'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/dossiers-en-cours'),
        LocalAPI.get('/bordereaux/chef-equipe/gestionnaire-assignments-dossiers'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/documents-individuels')
      ]);

      setStats(statsRes.data);
      setTypesDetail(typesRes.data);
      setDerniersDossiers(derniersRes.data);
      setDossiersEnCours(enCoursRes.data);
      setAllGestionnaireAssignments(assignmentsRes.data || []);
      setFilteredGestionnaireAssignments(assignmentsRes.data || []);
      setDossiersIndividuels(individuelsRes.data || []);
      setAllDossiersIndividuels(individuelsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const response = await LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/search', {
        params: { type: searchType, query: searchQuery }
      });
      setDerniersDossiers(response.data);
      
      // Filter individual documents based on search
      const filtered = allDossiersIndividuels.filter(doc => {
        const query = searchQuery.toLowerCase();
        switch (searchType) {
          case 'Ref. GSD':
            return doc.reference?.toLowerCase().includes(query) || doc.bordereauReference?.toLowerCase().includes(query);
          case 'Client':
            return doc.client?.toLowerCase().includes(query);
          case 'Type':
            return doc.type?.toLowerCase().includes(query);
          case 'Gestionnaire':
            return doc.gestionnaire?.toLowerCase().includes(query);
          default:
            return true;
        }
      });
      setDossiersIndividuels(filtered);
      
      // Update the section title to show search results
      const searchResultsCount = response.data.length;
      console.log(`Found ${searchResultsCount} results for "${searchQuery}" in ${searchType}`);
    } catch (error) {
      console.error('Search error:', error);
      alert('Erreur lors de la recherche');
    }
  };

  const handleTypeFilterChange = async (newType: string) => {
    setTypeFilter(newType);
    await applyFilters(newType, statutFilter);
  };

  const handleStatutFilterChange = async (newStatut: string) => {
    setStatutFilter(newStatut);
    await applyFilters(typeFilter, newStatut);
  };

  const applyFilters = async (type: string, statut: string) => {
    try {
      const params: any = {};
      if (type !== 'Tous types') params.type = type;
      if (statut !== 'Tous') params.statut = statut;
      
      const response = await LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/dossiers-en-cours', {
        params
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
        // Open PDF in new tab
        window.open(response.data.pdfUrl, '_blank');
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
    
    // Apply filters to gestionnaire assignments based on current filters
    applyFiltersToAssignments(newFilter);
  };

  const applyFiltersToAssignments = (gestionnaireFilterValue?: string) => {
    const currentGestionnaireFilter = gestionnaireFilterValue || gestionnaireFilter;
    let filtered = [...allGestionnaireAssignments];
    
    if (currentGestionnaireFilter !== 'Tous') {
      filtered = filtered.filter(assignment => assignment.gestionnaire === currentGestionnaireFilter);
    }
    
    // Apply other filters if needed (type, societe, statut, search)
    // This ensures the assignments table also respects the global filters
    
    setFilteredGestionnaireAssignments(filtered);
  };

  const handleOpenStatusModifyModal = () => {
    setPdfViewModalOpen(false);
    setStatusModifyModalOpen(true);
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
        loadData();
      }
    } catch (error) {
      console.error('Error modifying status:', error);
      alert('Erreur lors de la modification du statut');
    }
  };

  const handleOpenEditModal = (dossier: any) => {
    const currentType = dossier.documents?.[0]?.type || dossier.type || 'Prestation';
    setSelectedType(currentType);
    setEditModalOpen(true);
  };

  const handleChangeDocumentType = async () => {
    if (!selectedDossier || !selectedType) return;
    
    const currentType = selectedDossier.documents?.[0]?.type || selectedDossier.type || 'Prestation';
    if (selectedType === currentType) {
      setEditModalOpen(false);
      return;
    }

    try {
      const response = await LocalAPI.post('/bordereaux/chef-equipe/tableau-bord/change-document-type', {
        dossierId: selectedDossier.id,
        newType: selectedType
      });
      
      if (response.data.success) {
        // Refresh the modal data
        const updatedResponse = await LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/dossier/' + selectedDossier.id);
        setSelectedDossier(updatedResponse.data);
        // Refresh the main data
        loadData();
        setEditModalOpen(false);
        alert(response.data.message || 'Type de dossier modifié avec succès');
      }
    } catch (error) {
      console.error('Error changing document type:', error);
      alert('Erreur lors du changement de type');
    }
  };

  const handleTelechargerDossier = async (dossier: any) => {
    try {
      // First get download info
      const infoResponse = await LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/download-info/' + dossier.id);
      const downloadInfo = infoResponse.data;
      
      if (downloadInfo.success) {
        // Show download confirmation
        const confirmMessage = `Télécharger le dossier ${downloadInfo.reference}?\n\n` +
          `Client: ${downloadInfo.client}\n` +
          `Documents: ${downloadInfo.summary.totalDocuments} fichier(s)\n` +
          `Taille estimée: ${downloadInfo.summary.estimatedSize}\n\n` +
          `Le fichier ZIP contiendra:\n` +
          `• Résumé du dossier (JSON)\n` +
          downloadInfo.documents.map((doc: any) => `• ${doc.fileName} (${doc.type})`).join('\n');
        
        if (confirm(confirmMessage)) {
          // Download with authorization
          const token = localStorage.getItem('token');
          const downloadUrl = `/bordereaux/chef-equipe/tableau-bord/download/${dossier.id}`;
          
          try {
            const response = await fetch(`${LocalAPI.defaults.baseURL}${downloadUrl}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
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
            } else {
              throw new Error('Download failed');
            }
          } catch (error) {
            console.error('Download error:', error);
            alert('Erreur lors du téléchargement');
            return;
          }
          
          // Show success message
          alert(`Téléchargement lancé pour le dossier ${downloadInfo.reference}`);
          
          // Refresh data to show updated logs
          loadData();
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Erreur lors du téléchargement');
    }
  };

  const handleReturnToScan = async (dossier: Dossier) => {
    const reason = prompt('Raison du retour vers l\'équipe Scan:');
    if (!reason) return;

    try {
      await LocalAPI.post('/bordereaux/chef-equipe/tableau-bord/return-to-scan', {
        dossierId: dossier.id,
        reason
      });
      alert('Dossier retourné vers l\'équipe Scan');
      loadData();
    } catch (error) {
      alert('Erreur lors du retour vers Scan');
    }
  };

  const handleExportDossiersEnCours = async () => {
    try {
      // Show confirmation
      const confirmMessage = `Exporter les dossiers en cours${typeFilter !== 'Tous types' ? ` (${typeFilter})` : ''} vers Excel?\n\n` +
        `Nombre de dossiers: ${dossiersEnCours.length}\n` +
        `Le fichier Excel sera téléchargé automatiquement.`;
      
      if (confirm(confirmMessage)) {
        // Download with authorization
        const token = localStorage.getItem('token');
        const exportUrl = `/bordereaux/chef-equipe/tableau-bord/export-dossiers-en-cours${typeFilter !== 'Tous types' ? `?type=${encodeURIComponent(typeFilter)}` : ''}`;
        
        try {
          const response = await fetch(`${LocalAPI.defaults.baseURL}${exportUrl}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
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
          } else {
            throw new Error('Export failed');
          }
        } catch (error) {
          console.error('Export error:', error);
          alert('Erreur lors de l\'export Excel');
          return;
        }
        
        // Show success message
        alert(`Export Excel lancé!\n\n` +
          `Fichier: Dossiers en cours${typeFilter !== 'Tous types' ? ` (${typeFilter})` : ''}\n` +
          `Nombre de dossiers: ${dossiersEnCours.length}\n` +
          `Format: Excel (.xlsx)\n\n` +
          `L'export a été enregistré dans le système.`);
        
        // Refresh data to show updated logs
        loadData();
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

  const canModifyDossier = (dossier: any) => {
    if (!isGestionnaire) return true; // Chef d'équipe can modify all
    return dossier.currentHandlerId === user?.id || dossier.assignedToUserId === user?.id;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div>Chargement...</div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ 
        background: '#d32f2f', 
        color: 'white', 
        padding: '20px 40px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 'bold', 
          margin: '0 0 8px 0' 
        }}>
          Tableau de Bord Gestion Dossiers
        </h1>
        <p style={{ 
          fontSize: '14px', 
          margin: 0, 
          opacity: 0.9 
        }}>
          Suivi des dossiers par corbeille
        </p>
      </div>

      <div style={{ padding: '20px 40px' }}>
        {isGestionnaire && (
          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div>
              <strong style={{ color: '#856404' }}>Accès Gestionnaire</strong>
              <p style={{ margin: '4px 0 0 0', color: '#856404', fontSize: '14px' }}>
                Vous avez accès à tous les dossiers en lecture seule. Vous ne pouvez modifier que les dossiers qui vous sont personnellement assignés.
              </p>
            </div>
          </div>
        )}
        {/* Search Section */}
        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          padding: '20px', 
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #e0e0e0'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '16px' 
          }}>
            <span style={{ 
              color: '#d32f2f', 
              fontSize: '16px', 
              marginRight: '8px' 
            }}>🔍</span>
            <span style={{ 
              color: '#d32f2f', 
              fontWeight: 'bold' 
            }}>
              Recherche de Dossiers
            </span>
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '150px 1fr auto', 
            gap: '12px', 
            alignItems: 'center' 
          }}>
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
                background: 'white'
              }}
            >
              <option value="Ref. GSD">Ref. GSD</option>
              <option value="Client">Client</option>
              <option value="Type">Type</option>
              <option value="Gestionnaire">Gestionnaire</option>
            </select>
            <input
              type="text"
              placeholder="Entrez votre recherche..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#d32f2f'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            />
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim()}
              style={{
                background: searchQuery.trim() ? '#d32f2f' : '#ccc',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: searchQuery.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background-color 0.2s'
              }}
            >
              🔍 Rechercher
            </button>
          </div>
          {searchQuery && (
            <div style={{ 
              marginTop: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '12px', color: '#666' }}>
                Recherche active: "{searchQuery}" dans {searchType}
              </span>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDossiersIndividuels(allDossiersIndividuels);
                  loadData();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#d32f2f',
                  cursor: 'pointer',
                  fontSize: '12px',
                  textDecoration: 'underline'
                }}
              >
                Effacer
              </button>
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '16px' 
          }}>
            <span style={{ 
              color: '#d32f2f', 
              fontSize: '16px', 
              marginRight: '8px' 
            }}>📊</span>
            <span style={{ 
              color: '#333', 
              fontWeight: 'bold', 
              fontSize: '16px' 
            }}>
              Corbeille Globale
            </span>
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '20px' 
          }}>
            {/* Total Dossiers */}
            <div style={{ 
              background: '#d32f2f', 
              color: 'white', 
              padding: '24px', 
              borderRadius: '8px',
              textAlign: 'center',
              position: 'relative'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📁</div>
              <div style={{ fontSize: '12px', marginBottom: '8px' }}>Total Dossiers</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px' }}>
                {stats.totalDossiers.toLocaleString()}
              </div>
              <div style={{ 
                height: '4px', 
                background: 'rgba(255,255,255,0.3)', 
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  height: '100%', 
                  background: 'white', 
                  width: '100%' 
                }} />
              </div>
            </div>

            {/* Clôturés */}
            <div style={{ 
              background: '#4caf50', 
              color: 'white', 
              padding: '24px', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>✓</div>
              <div style={{ fontSize: '12px', marginBottom: '8px' }}>Clôturés</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px' }}>
                {stats.clotures.toLocaleString()}
              </div>
              <div style={{ 
                height: '4px', 
                background: 'rgba(255,255,255,0.3)', 
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  height: '100%', 
                  background: 'white', 
                  width: `${stats.progressBars.clotures}%` 
                }} />
              </div>
            </div>

            {/* En cours */}
            <div style={{ 
              background: '#ff9800', 
              color: 'white', 
              padding: '24px', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
              <div style={{ fontSize: '12px', marginBottom: '8px' }}>En cours</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px' }}>
                {stats.enCours.toLocaleString()}
              </div>
              <div style={{ 
                height: '4px', 
                background: 'rgba(255,255,255,0.3)', 
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  height: '100%', 
                  background: 'white', 
                  width: `${stats.progressBars.enCours}%` 
                }} />
              </div>
            </div>

            {/* Non Affectés */}
            <div style={{ 
              background: '#2196f3', 
              color: 'white', 
              padding: '24px', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔧</div>
              <div style={{ fontSize: '12px', marginBottom: '8px' }}>Non Affectés</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px' }}>
                {stats.nonAffectes.toLocaleString()}
              </div>
              <div style={{ 
                height: '4px', 
                background: 'rgba(255,255,255,0.3)', 
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  height: '100%', 
                  background: 'white', 
                  width: `${stats.progressBars.nonAffectes}%` 
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* Détail par Type */}
        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          padding: '20px', 
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 'bold', 
            marginBottom: '20px',
            color: '#333'
          }}>
            Détail par Type de Dossier
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(5, 1fr)', 
            gap: '20px' 
          }}>
            {Object.entries(typesDetail).map(([type, data]) => (
              <div key={type} style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '20px', 
                  marginBottom: '8px' 
                }}>
                  {type === 'Prestation' ? '💊' : 
                   type === 'Adhésion' ? '👤' :
                   type === 'Complément Dossier' ? '📄' :
                   type === 'Avenant' ? '📝' : '📞'}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: 'bold', 
                  marginBottom: '8px',
                  color: '#333'
                }}>
                  {type}
                </div>
                <div style={{ 
                  fontSize: '10px', 
                  color: '#666', 
                  marginBottom: '4px' 
                }}>
                  Total: {data.total}
                </div>
                <div style={{ fontSize: '10px', color: '#666' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '2px' }}>
                    <span style={{ width: '8px', height: '8px', background: '#4caf50', borderRadius: '50%' }}></span>
                    <span>Clôturés: {data.clotures}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '2px' }}>
                    <span style={{ width: '8px', height: '8px', background: '#ff9800', borderRadius: '50%' }}></span>
                    <span>En cours: {data.enCours}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', background: '#2196f3', borderRadius: '50%' }}></span>
                    <span>Non Affectés: {data.nonAffectes}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Affectations par Gestionnaire */}
        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          padding: '20px', 
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '16px' 
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: 'bold', 
              color: '#333',
              margin: 0
            }}>
              Affectations par Gestionnaire
            </h3>
            <select
              value={gestionnaireFilter}
              onChange={(e) => handleGestionnaireFilterChange(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <option value="Tous">Tous les gestionnaires</option>
              {Array.from(new Set(allGestionnaireAssignments.map(a => a.gestionnaire))).map(gest => (
                <option key={gest} value={gest}>{gest}</option>
              ))}
            </select>
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '16px' 
          }}>
            {filteredGestionnaireAssignments.map((assignment, index) => (
              <div key={index} style={{ 
                background: '#f8f9fa', 
                borderRadius: '6px', 
                padding: '16px', 
                border: '1px solid #dee2e6' 
              }}>
                <div style={{ 
                  fontWeight: 'bold', 
                  fontSize: '14px', 
                  marginBottom: '8px', 
                  color: '#495057' 
                }}>
                  {assignment.gestionnaire}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#6c757d', 
                  marginBottom: '8px' 
                }}>
                  <strong>Total affectés:</strong> {assignment.totalAssigned || 0}
                </div>
                <div style={{ fontSize: '12px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#28a745' }}>✓ Traités:</span>
                    <span style={{ fontWeight: 'bold' }}>{assignment.traites || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
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

        {/* Derniers Dossiers */}
        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          padding: '20px', 
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '16px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ 
                color: '#d32f2f', 
                fontSize: '16px', 
                marginRight: '8px' 
              }}>📋</span>
              <span style={{ 
                fontWeight: 'bold', 
                fontSize: '16px' 
              }}>
                Derniers Bordereaux Ajoutés
              </span>
              <span style={{ 
                background: '#4caf50', 
                color: 'white', 
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontSize: '10px', 
                marginLeft: '12px' 
              }}>
                En temps réel
              </span>
            </div>
            <button style={{ 
              background: 'none', 
              border: 'none', 
              color: '#2196f3', 
              cursor: 'pointer',
              fontSize: '12px'
            }}>
              Voir tout
            </button>
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
                {derniersDossiers.slice(0, 3).map((dossier, index) => (
                  <tr key={dossier.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: 'bold' }}>
                      {dossier.reference}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                        {dossier.client}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ 
                          width: '8px', 
                          height: '8px', 
                          background: index % 2 === 0 ? '#4caf50' : '#2196f3', 
                          borderRadius: '50%' 
                        }}></span>
                        {dossier.type}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                      <span style={{ 
                        background: '#4caf50', 
                        color: 'white', 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        fontSize: '12px' 
                      }}>
                        {dossier.statut}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ 
                          width: '24px', 
                          height: '24px', 
                          background: getAvatarColor(dossier.gestionnaire), 
                          borderRadius: '50%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          color: 'white', 
                          fontSize: '12px', 
                          fontWeight: 'bold' 
                        }}>
                          {dossier.gestionnaire.charAt(0)}
                        </div>
                        {dossier.gestionnaire}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ 
                          width: '40px', 
                          height: '6px', 
                          background: '#e0e0e0', 
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            width: `${dossier.completionPercentage || 0}%`, 
                            height: '100%', 
                            background: (dossier.completionPercentage || 0) >= 80 ? '#4caf50' : (dossier.completionPercentage || 0) >= 50 ? '#ff9800' : '#f44336',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{dossier.completionPercentage || 0}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {dossier.dossierStates?.map((state: string, idx: number) => (
                          <span key={idx} style={{
                            background: state === 'Traité' ? '#4caf50' : state === 'En cours' ? '#ff9800' : '#f44336',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: 'bold'
                          }}>
                            {state}
                          </span>
                        )) || <span style={{ fontSize: '12px', color: '#999' }}>-</span>}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px', color: '#666' }}>
                      {dossier.date}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleVoirDossier(dossier)}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#2196f3', 
                            cursor: 'pointer',
                            fontSize: '12px',
                            textDecoration: 'underline'
                          }}
                          onMouseEnter={(e) => (e.target as HTMLElement).style.color = '#1976d2'}
                          onMouseLeave={(e) => (e.target as HTMLElement).style.color = '#2196f3'}
                        >
                          Voir
                        </button>
                        {canModifyDossier(dossier) ? (
                          <button 
                            onClick={() => {
                              setSelectedDossier(dossier);
                              handleOpenEditModal(dossier);
                            }}
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              color: '#9c27b0', 
                              cursor: 'pointer',
                              fontSize: '12px',
                              textDecoration: 'underline'
                            }}
                            onMouseEnter={(e) => (e.target as HTMLElement).style.color = '#7b1fa2'}
                            onMouseLeave={(e) => (e.target as HTMLElement).style.color = '#9c27b0'}
                          >
                            Modifier
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#ccc' }}>Lecture seule</span>
                        )}
                        {canModifyDossier(dossier) && (
                          <button 
                            onClick={() => {
                              setSelectedDossier(dossier);
                              setNewStatus('');
                              setStatusModifyModalOpen(true);
                            }}
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              color: '#ff9800', 
                              cursor: 'pointer',
                              fontSize: '16px'
                            }}
                            title="Modifier le statut"
                          >
                            ✏️
                          </button>
                        )}
                        <button 
                          onClick={() => handleTelechargerDossier(dossier)}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#4caf50', 
                            cursor: 'pointer',
                            fontSize: '12px',
                            textDecoration: 'underline'
                          }}
                          onMouseEnter={(e) => (e.target as HTMLElement).style.color = '#388e3c'}
                          onMouseLeave={(e) => (e.target as HTMLElement).style.color = '#4caf50'}
                        >
                          Télécharger
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dossiers Individuels */}
        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '16px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ 
                color: '#d32f2f', 
                fontSize: '16px', 
                marginRight: '8px' 
              }}>📄</span>
              <span style={{ 
                fontWeight: 'bold', 
                fontSize: '16px' 
              }}>
                Dossiers Individuels ({dossiersIndividuels.length})
              </span>
              <span style={{ 
                fontSize: '12px', 
                color: '#666', 
                marginLeft: '12px' 
              }}>
                Affichage par dossier (non par bordereau)
              </span>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Réf. Dossier</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Réf. Bordereau</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Client</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Type</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Statut Dossier</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Gestionnaire</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dossiersIndividuels
                  .slice((dossiersIndividuelsPage - 1) * dossiersIndividuelsPerPage, dossiersIndividuelsPage * dossiersIndividuelsPerPage)
                  .map((dossier, index) => (
                  <tr key={dossier.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: '500' }}>
                      {dossier.reference}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '13px' }}>
                      {dossier.bordereauReference}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '13px' }}>
                      {dossier.client}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '13px' }}>
                      {dossier.type}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '13px' }}>
                      <span style={{ 
                        background: dossier.statut === 'Traité' ? '#4caf50' : dossier.statut === 'En cours' ? '#ff9800' : dossier.statut === 'Scanné' ? '#2196f3' : '#9e9e9e',
                        color: 'white', 
                        padding: '3px 8px', 
                        borderRadius: '4px', 
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {dossier.statut}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '13px' }}>
                      {dossier.gestionnaire}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '13px', color: '#666' }}>
                      {dossier.date}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button 
                          onClick={() => handleVoirDossier(dossier)}
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
                        >
                          Voir PDF
                        </button>
                        {canModifyDossier(dossier) && (
                          <button 
                            onClick={() => {
                              setSelectedDossier(dossier);
                              setNewStatus('');
                              setStatusModifyModalOpen(true);
                            }}
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
          {/* Pagination for Dossiers Individuels */}
          {dossiersIndividuels.length > dossiersIndividuelsPerPage && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '12px', 
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid #e0e0e0'
            }}>
              <button
                onClick={() => setDossiersIndividuelsPage(prev => Math.max(1, prev - 1))}
                disabled={dossiersIndividuelsPage === 1}
                style={{
                  background: dossiersIndividuelsPage === 1 ? '#e0e0e0' : '#d32f2f',
                  color: dossiersIndividuelsPage === 1 ? '#999' : 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: dossiersIndividuelsPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                ← Précédent
              </button>
              <span style={{ fontSize: '14px', color: '#666' }}>
                Page {dossiersIndividuelsPage} sur {Math.ceil(dossiersIndividuels.length / dossiersIndividuelsPerPage)}
              </span>
              <button
                onClick={() => setDossiersIndividuelsPage(prev => Math.min(Math.ceil(dossiersIndividuels.length / dossiersIndividuelsPerPage), prev + 1))}
                disabled={dossiersIndividuelsPage >= Math.ceil(dossiersIndividuels.length / dossiersIndividuelsPerPage)}
                style={{
                  background: dossiersIndividuelsPage >= Math.ceil(dossiersIndividuels.length / dossiersIndividuelsPerPage) ? '#e0e0e0' : '#d32f2f',
                  color: dossiersIndividuelsPage >= Math.ceil(dossiersIndividuels.length / dossiersIndividuelsPerPage) ? '#999' : 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: dossiersIndividuelsPage >= Math.ceil(dossiersIndividuels.length / dossiersIndividuelsPerPage) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                Suivant →
              </button>
            </div>
          )}
        </div>

        {/* Dossiers En Cours */}
        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '16px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ 
                color: '#d32f2f', 
                fontSize: '16px', 
                marginRight: '8px' 
              }}>🔄</span>
              <span style={{ 
                fontWeight: 'bold', 
                fontSize: '16px' 
              }}>
                Bordereaux En Cours ({dossiersEnCours.length})
              </span>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <select
                value={typeFilter}
                onChange={(e) => handleTypeFilterChange(e.target.value)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                <option value="Tous types">Tous types</option>
                <option value="Prestation">Prestation</option>
                <option value="Adhésion">Adhésion</option>
                <option value="Complément Dossier">Complément Dossier</option>
                <option value="Avenant">Avenant</option>
                <option value="Réclamation">Réclamation</option>
              </select>
              <select
                value={statutFilter}
                onChange={(e) => handleStatutFilterChange(e.target.value)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                <option value="Tous">Tous</option>
                <option value="Nouveau">🆕 Nouveau</option>
                <option value="En cours">⏳ En cours</option>
                <option value="Traité">✅ Traité</option>
                <option value="Retourné">↩️ Retourné</option>
              </select>
              <button 
                onClick={handleExportDossiersEnCours}
                style={{ 
                  background: '#d32f2f', 
                  color: 'white', 
                  border: 'none', 
                  padding: '6px 12px', 
                  borderRadius: '4px', 
                  fontSize: '12px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                📊 Exporter
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fff3e0' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', color: '#666' }}>Ref. Dossier</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', color: '#666' }}>Client</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', color: '#666' }}>Type</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', color: '#666' }}>Jours en cours</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', color: '#666' }}>Priorité</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', color: '#666' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dossiersEnCours.slice(0, 10).map((dossier, index) => (
                  <tr key={dossier.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: 'bold' }}>
                      {dossier.reference}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                      {dossier.client}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ 
                          width: '8px', 
                          height: '8px', 
                          background: index % 3 === 0 ? '#f44336' : index % 3 === 1 ? '#2196f3' : '#4caf50', 
                          borderRadius: '50%' 
                        }}></span>
                        {dossier.type}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                      {dossier.joursEnCours} jours
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                      <span style={{ 
                        background: getPriorityColor(dossier.priorite), 
                        color: 'white', 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        fontSize: '12px' 
                      }}>
                        {dossier.priorite}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleVoirDossier(dossier)}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#2196f3', 
                            cursor: 'pointer',
                            fontSize: '12px',
                            textDecoration: 'underline'
                          }}
                          onMouseEnter={(e) => (e.target as HTMLElement).style.color = '#1976d2'}
                          onMouseLeave={(e) => (e.target as HTMLElement).style.color = '#2196f3'}
                        >
                          Voir
                        </button>
                        {canModifyDossier(dossier) ? (
                          <button 
                            onClick={() => handleReturnToScan(dossier)}
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              color: '#9c27b0', 
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Retour Scan
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#ccc' }}>Non autorisé</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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

            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
              <p style={{ fontSize: '16px', marginBottom: '20px' }}>Aperçu du dossier {selectedDossier.reference}</p>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '30px' }}>Client: {selectedDossier.client}</p>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid #e0e0e0'
            }}>
              <button
                onClick={() => setPdfViewModalOpen(false)}
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
                onClick={handleOpenStatusModifyModal}
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

      {/* Status Modify Modal */}
      {statusModifyModalOpen && selectedDossier && (
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
                color: '#d32f2f',
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                ✏️ Modifier le Statut du Dossier
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
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px',
                color: '#333'
              }}>
                Nouveau statut :
              </label>
              
              <div style={{ display: 'grid', gap: '8px' }}>
                {['Nouveau', 'En cours', 'Traité', 'Retourné'].map(status => (
                  <label key={status} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    border: newStatus === status ? '2px solid #d32f2f' : '1px solid #e0e0e0',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: newStatus === status ? '#ffebee' : 'white',
                    transition: 'all 0.2s'
                  }}>
                    <input
                      type="radio"
                      name="dossierStatus"
                      value={status}
                      checked={newStatus === status}
                      onChange={(e) => setNewStatus(e.target.value)}
                      style={{
                        marginRight: '12px',
                        accentColor: '#d32f2f'
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                        {status === 'Nouveau' ? '🆕' : 
                         status === 'En cours' ? '⏳' :
                         status === 'Traité' ? '✅' : '↩️'} {status}
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
              <button
                onClick={handleModifyDossierStatus}
                disabled={!newStatus}
                style={{
                  background: newStatus ? '#d32f2f' : '#ccc',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: newStatus ? 'pointer' : 'not-allowed',
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

      {/* Modal */}
      {modalOpen && selectedDossier && (
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
                📋 Détails du Dossier
              </h2>
              <button
                onClick={() => setModalOpen(false)}
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

            <div style={{ display: 'grid', gap: '16px' }}>
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
                  <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Statut</label>
                  <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', marginTop: '4px' }}>
                    <span style={{
                      background: '#4caf50',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {selectedDossier.statut}
                    </span>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Gestionnaire</label>
                  <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', marginTop: '4px' }}>
                    {selectedDossier.gestionnaire}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Jours en cours</label>
                  <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', marginTop: '4px' }}>
                    {selectedDossier.joursEnCours} jours
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Priorité</label>
                  <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', marginTop: '4px' }}>
                    <span style={{
                      background: getPriorityColor(selectedDossier.priorite),
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {selectedDossier.priorite}
                    </span>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Délai règlement</label>
                  <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', marginTop: '4px' }}>
                    {selectedDossier.delaiReglement || 30} jours
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Date de réception</label>
                <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', marginTop: '4px' }}>
                  {new Date(selectedDossier.dateReception).toLocaleDateString('fr-FR')}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                  Documents ({selectedDossier.documents.length})
                </label>
                <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                  {selectedDossier.documents.map((doc: any, index: number) => (
                    <div key={doc.id} style={{
                      padding: '12px',
                      borderBottom: index < selectedDossier.documents.length - 1 ? '1px solid #f0f0f0' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{doc.fileName}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{doc.type}</div>
                      </div>
                      <button style={{
                        background: '#2196f3',
                        color: 'white',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}>
                        📄 Voir
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid #e0e0e0'
            }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: '#f5f5f5',
                  color: '#333',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Fermer
              </button>
              {canModifyDossier(selectedDossier) && (
                <button
                  onClick={() => handleOpenEditModal(selectedDossier)}
                  style={{
                    background: '#9c27b0',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Modifier Type
                </button>
              )}
              <button
                onClick={() => {
                  handleTelechargerDossier(selectedDossier);
                  setModalOpen(false);
                }}
                style={{
                  background: '#4caf50',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                📁 Télécharger ZIP
              </button>
              {canModifyDossier(selectedDossier) && (
                <button
                  onClick={() => {
                    handleReturnToScan(selectedDossier);
                    setModalOpen(false);
                  }}
                  style={{
                    background: '#ff9800',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Retour Scan
                </button>
              )}
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
                onClick={handleChangeDocumentType}
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
    </div>
  );
};

export default ChefEquipeTableauBordNew;