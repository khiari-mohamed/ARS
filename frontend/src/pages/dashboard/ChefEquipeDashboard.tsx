import { useEffect, useState } from "react";
import { useAuth } from '../../contexts/AuthContext';
import "../../styles/chef-equipe.css";

interface DossierStats {
  total: number;
  clotures: number;
  enCours: number;
  nonAffectes: number;
}

interface DossierType {
  name: string;
  total: number;
  clotures: number;
  enCours: number;
  nonAffectes: number;
}

interface RecentDossier {
  id: string;
  reference: string;
  client: string;
  type: string;
  statut: string;
  gestionnaire: string;
  date: string;
}

function ChefEquipeDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DossierStats>({ total: 0, clotures: 0, enCours: 0, nonAffectes: 0 });
  const [dossierTypes, setDossierTypes] = useState<DossierType[]>([]);
  const [recentDossiers, setRecentDossiers] = useState<RecentDossier[]>([]);
  const [dossiersEnCours, setDossiersEnCours] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('REF');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [typeFilter, setTypeFilter] = useState('Tous types');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const { fetchChefEquipeStats, fetchDossierTypes, fetchRecentDossiers, fetchDossiersEnCours } = await import('../../services/chefEquipeService');
      
      const [statsData, typesData, recentData, enCoursData] = await Promise.all([
        fetchChefEquipeStats(),
        fetchDossierTypes(),
        fetchRecentDossiers(),
        fetchDossiersEnCours()
      ]);
      
      setStats(statsData);
      setDossierTypes(typesData);
      setRecentDossiers(recentData);
      setDossiersEnCours(enCoursData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const { searchDossiers } = await import('../../services/chefEquipeService');
      const results = await searchDossiers(searchQuery, searchType);
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  };

  const handleExport = async () => {
    try {
      const dataToExport = typeFilter === 'Tous types' ? dossiersEnCours : 
        dossiersEnCours.filter(d => d.type.includes(typeFilter));
      
      const csvContent = [
        ['Référence', 'Client', 'Type', 'Jours en cours', 'Priorité'],
        ...dataToExport.map(d => [d.reference, d.client, d.type, d.joursEnCours, d.priorite])
      ].map(row => row.join(',')).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dossiers-en-cours-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleViewDossier = (id: string) => {
    window.open(`/home/bordereaux/${id}`, '_blank');
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const getStatutColor = (statut: string) => {
    switch (statut.toLowerCase()) {
      case 'en cours': return 'bg-yellow-100 text-yellow-800';
      case 'soumis': return 'bg-blue-100 text-blue-800';
      case 'validé': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPrioriteColor = (priorite: string) => {
    switch (priorite.toLowerCase()) {
      case 'élevée': return 'bg-red-100 text-red-800';
      case 'moyenne': return 'bg-yellow-100 text-yellow-800';
      case 'normale': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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
    <div className="chef-equipe-container">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div className="chef-equipe-header" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '20px', borderRadius: '50%', marginRight: '24px' }}>
              <span style={{ fontSize: '40px' }}>📊</span>
            </div>
            <div>
              <h1 style={{ fontSize: '42px', fontWeight: 'bold', color: 'white', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Tableau de Bord Gestion Dossiers</h1>
              <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '18px', margin: 0, fontWeight: '500' }}>Suivi des dossiers par corbeille</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '32px', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#1a1a1a' }}>Recherche de Dossiers</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr auto', gap: '16px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#666', marginBottom: '8px' }}>Réf. GEO</label>
              <select 
                value={searchType} 
                onChange={(e) => setSearchType(e.target.value)}
                style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
              >
                <option value="REF">Référence</option>
                <option value="CLIENT">Client</option>
                <option value="TYPE">Type</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#666', marginBottom: '8px' }}>Recherche</label>
              <input
                type="text"
                placeholder="Entrez votre recherche..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim()}
              style={{
                background: searchQuery.trim() ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' : '#ccc',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: searchQuery.trim() ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
                height: '44px',
                alignSelf: 'end'
              }}
            >
              🔍 Rechercher
            </button>
          </div>
        </div>

        {/* Search Results */}
        {showSearchResults && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '32px', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a1a1a', margin: 0 }}>Résultats de recherche ({searchResults.length})</h3>
              <button onClick={clearSearch} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Fermer</button>
            </div>
            {searchResults.length === 0 ? (
              <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>Aucun résultat trouvé pour "{searchQuery}"</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Réf. Dossier</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Client</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Type</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Statut</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((result) => (
                      <tr key={result.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', fontWeight: '600', color: '#1e40af' }}>{result.reference}</td>
                        <td style={{ padding: '12px', color: '#374151' }}>{result.client}</td>
                        <td style={{ padding: '12px', color: '#374151' }}>{result.type}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '500' }} className={getStatutColor(result.statut)}>
                            {result.statut}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <button onClick={() => handleViewDossier(result.id)} style={{ padding: '4px 8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Voir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Main KPI Cards */}
        <div className="chef-equipe-stats">
          <div style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', color: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 12px 28px rgba(220, 38, 38, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '20px', borderRadius: '50%', marginRight: '20px' }}>
                <span style={{ fontSize: '32px' }}>📁</span>
              </div>
              <div>
                <div style={{ fontSize: '40px', fontWeight: 'bold', marginBottom: '4px' }}>{stats.total}</div>
                <div style={{ fontSize: '16px', fontWeight: '600', opacity: 0.9 }}>Total Dossiers</div>
              </div>
            </div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 12px 28px rgba(22, 163, 74, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '20px', borderRadius: '50%', marginRight: '20px' }}>
                <span style={{ fontSize: '32px' }}>✅</span>
              </div>
              <div>
                <div style={{ fontSize: '40px', fontWeight: 'bold', marginBottom: '4px' }}>{stats.clotures}</div>
                <div style={{ fontSize: '16px', fontWeight: '600', opacity: 0.9 }}>Clôturés</div>
              </div>
            </div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)', color: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 12px 28px rgba(234, 179, 8, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '20px', borderRadius: '50%', marginRight: '20px' }}>
                <span style={{ fontSize: '32px' }}>⏳</span>
              </div>
              <div>
                <div style={{ fontSize: '40px', fontWeight: 'bold', marginBottom: '4px' }}>{stats.enCours}</div>
                <div style={{ fontSize: '16px', fontWeight: '600', opacity: 0.9 }}>En cours</div>
              </div>
            </div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 12px 28px rgba(37, 99, 235, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '20px', borderRadius: '50%', marginRight: '20px' }}>
                <span style={{ fontSize: '32px' }}>✈️</span>
              </div>
              <div>
                <div style={{ fontSize: '40px', fontWeight: 'bold', marginBottom: '4px' }}>{stats.nonAffectes}</div>
                <div style={{ fontSize: '16px', fontWeight: '600', opacity: 0.9 }}>Non Affectés</div>
              </div>
            </div>
          </div>
        </div>

        {/* Détail par Type de Dossier */}
        <div style={{ background: 'white', borderRadius: '20px', padding: '32px', marginBottom: '32px', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: '#1a1a1a' }}>Détail par Type de Dossier</h3>
          <div style={{ display: 'grid', gap: '16px' }}>
            {dossierTypes.map((type, index) => (
              <div key={index} style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a1a1a', margin: 0 }}>{type.name}</h4>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#6366f1' }}>{type.total} dossiers</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div style={{ textAlign: 'center', padding: '12px', background: '#dcfce7', borderRadius: '8px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#16a34a' }}>{type.clotures}</div>
                    <div style={{ fontSize: '12px', color: '#15803d' }}>Clôturés</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '12px', background: '#fef3c7', borderRadius: '8px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#d97706' }}>{type.enCours}</div>
                    <div style={{ fontSize: '12px', color: '#b45309' }}>En cours</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '12px', background: '#dbeafe', borderRadius: '8px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2563eb' }}>{type.nonAffectes}</div>
                    <div style={{ fontSize: '12px', color: '#1d4ed8' }}>Non affectés</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Dossiers Table */}
        <div style={{ background: 'white', borderRadius: '20px', padding: '32px', marginBottom: '32px', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: '#1a1a1a' }}>Derniers Dossiers Ajoutés</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Réf. Dossier</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Client</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Type</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Statut</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Gestionnaire</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentDossiers.map((dossier) => (
                  <tr key={dossier.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontWeight: '600', color: '#1e40af' }}>{dossier.reference}</td>
                    <td style={{ padding: '12px', color: '#374151' }}>{dossier.client}</td>
                    <td style={{ padding: '12px', color: '#374151' }}>{dossier.type}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '500' }} className={getStatutColor(dossier.statut)}>
                        {dossier.statut}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#374151' }}>{dossier.gestionnaire}</td>
                    <td style={{ padding: '12px', color: '#6b7280', fontSize: '14px' }}>{dossier.date}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button onClick={() => handleViewDossier(dossier.id)} style={{ padding: '4px 8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Voir</button>
                        <button onClick={() => handleViewDossier(dossier.id)} style={{ padding: '4px 8px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Modifier</button>
                        <button onClick={() => window.print()} style={{ padding: '4px 8px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Télécharger</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dossiers En Cours */}
        <div style={{ background: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a', margin: 0 }}>Dossiers En Cours ({stats.enCours})</h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select 
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', minWidth: '120px' }}
              >
                <option>Tous types</option>
                {dossierTypes.map(type => (
                  <option key={type.name} value={type.name}>{type.name}</option>
                ))}
              </select>
              <button 
                onClick={handleExport}
                style={{ 
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: '6px', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                📄 Exporter
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Réf. Dossier</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Client</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Type</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Jours en cours</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Priorité</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dossiersEnCours.map((dossier) => (
                  <tr key={dossier.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontWeight: '600', color: '#1e40af' }}>{dossier.reference}</td>
                    <td style={{ padding: '12px', color: '#374151' }}>{dossier.client}</td>
                    <td style={{ padding: '12px', color: '#374151' }}>{dossier.type}</td>
                    <td style={{ padding: '12px', color: '#374151' }}>{dossier.joursEnCours} jours</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '500' }} className={getPrioriteColor(dossier.priorite)}>
                        {dossier.priorite}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button onClick={() => handleViewDossier(dossier.id)} style={{ padding: '4px 8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Voir</button>
                        <button onClick={() => handleViewDossier(dossier.id)} style={{ padding: '4px 8px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Modifier</button>
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