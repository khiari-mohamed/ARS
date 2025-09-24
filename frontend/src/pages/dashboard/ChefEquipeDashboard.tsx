import { useEffect, useState } from "react";
import { useAuth } from '../../contexts/AuthContext';
import { LocalAPI } from '../../services/axios';
import "../../styles/chef-equipe.css";

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
  documentsAssigned: number;
  bordereauxAssigned: number;
  documentsReturned: number;
  documentsByType: { [key: string]: number };
  bordereauxByType: { [key: string]: number };
}

interface Dossier {
  id: string;
  reference: string;
  nom: string;
  societe: string;
  type: string;
  statut: string;
  date: string;
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
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [filteredDossiers, setFilteredDossiers] = useState<Dossier[]>([]);
  const [selectedDossiers, setSelectedDossiers] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState('Tous');
  const [societeFilter, setSocieteFilter] = useState('Toutes');
  const [statutFilter, setStatutFilter] = useState('Nouveau');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [societes, setSocietes] = useState<string[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [typeFilter, societeFilter, statutFilter, searchQuery, dossiers]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load real data from backend using LocalAPI with auth
      const [statsResponse, dossiersResponse, assignmentsResponse] = await Promise.all([
        LocalAPI.get('/bordereaux/chef-equipe/dashboard-stats'),
        LocalAPI.get('/bordereaux/chef-equipe/dashboard-dossiers'),
        LocalAPI.get('/bordereaux/chef-equipe/gestionnaire-assignments')
      ]);
      
      if (statsResponse.data) {
        console.log('📊 Stats received:', statsResponse.data);
        setStats(statsResponse.data);
      }
      
      if (dossiersResponse.data) {
        console.log('📄 Dossiers received:', dossiersResponse.data.length);
        setDossiers(dossiersResponse.data);
        
        // Extract unique societes from dossiers
        const uniqueSocietes = [...new Set(dossiersResponse.data.map((d: Dossier) => d.societe).filter(Boolean))] as string[];
        setSocietes(uniqueSocietes.sort());
      }
      
      if (assignmentsResponse.data) {
        console.log('👥 Gestionnaire assignments received:', assignmentsResponse.data.length);
        setGestionnaireAssignments(assignmentsResponse.data);
      }
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
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
      filtered = filtered.filter(d => d.societe === societeFilter);
    }
    
    if (statutFilter !== 'Tous') {
      filtered = filtered.filter(d => d.statut === statutFilter);
    }
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(d => 
        d.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.nom.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredDossiers(filtered);
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
      ...filteredDossiers.map(d => [d.reference, d.nom, d.societe, d.type, d.statut, d.date])
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
              <span style={{ background: '#d52b36', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>{stats.prestation.total}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>Par client:</div>
              {Object.entries(stats.prestation.breakdown).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                  <span>{key}:</span> <span>{value}</span>
                </div>
              ))}
              <div style={{ fontWeight: 'bold', marginTop: '6px', marginBottom: '4px', color: '#333' }}>Par gestionnaire:</div>
              {Object.entries(stats.prestation.gestionnaireBreakdown).map(([key, value]) => (
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
              <span style={{ background: '#d52b36', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>{stats.adhesion.total}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {Object.entries(stats.adhesion.breakdown).map(([key, value]) => (
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
              <span style={{ background: '#2196f3', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>{stats.complement.total}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {Object.entries(stats.complement.breakdown).map(([key, value]) => (
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
              <span style={{ background: '#d52b36', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>{stats.resiliation.total}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {Object.entries(stats.resiliation.breakdown).map(([key, value]) => (
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
              <span style={{ background: '#d52b36', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>{stats.reclamation.total}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {Object.entries(stats.reclamation.breakdown).map(([key, value]) => (
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
              <span style={{ background: '#d52b36', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>{stats.avenant.total}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {Object.entries(stats.avenant.breakdown).map(([key, value]) => (
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
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#333' }}>Affectations par Gestionnaire</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {gestionnaireAssignments.map((assignment, index) => (
              <div key={index} style={{ background: '#f8f9fa', borderRadius: '6px', padding: '12px', border: '1px solid #dee2e6' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', color: '#495057' }}>
                  {assignment.gestionnaire}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '6px' }}>
                  <strong>Total affectés:</strong> {assignment.totalAssigned} ({assignment.documentsAssigned} docs + {assignment.bordereauxAssigned} bordereaux)
                </div>
                <div style={{ fontSize: '12px', color: '#dc3545', marginBottom: '6px' }}>
                  <strong>Documents retournés:</strong> {assignment.documentsReturned}
                </div>
                <div style={{ fontSize: '11px', color: '#6c757d' }}>
                  <strong>Par type:</strong> {Object.entries({...assignment.documentsByType, ...assignment.bordereauxByType}).map(([type, count]) => `${type}: ${count}`).join(', ') || 'Aucun'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dossiers Section (Table) */}
        <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#d52b36', color: 'white' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedDossiers.length === filteredDossiers.length && filteredDossiers.length > 0}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Référence</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Nom</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Société</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Type</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Statut</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Date</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDossiers.map((dossier, index) => (
                  <tr key={dossier.id} style={{ background: index % 2 === 0 ? '#ffffff' : '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedDossiers.includes(dossier.id)}
                        onChange={() => handleSelectDossier(dossier.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: '600', color: '#0066cc' }}>{dossier.reference}</td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>{dossier.nom}</td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>{dossier.societe}</td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>{dossier.type}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ 
                        background: '#d52b36', 
                        color: 'white', 
                        padding: '4px 8px', 
                        borderRadius: '12px', 
                        fontSize: '12px', 
                        fontWeight: 'bold' 
                      }}>
                        {dossier.statut}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>{dossier.date}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button 
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>


      </div>
    </div>
  );
}

export default ChefEquipeDashboard;