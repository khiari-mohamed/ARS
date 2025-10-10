import { useEffect, useState } from "react";
import { useAuth } from '../../contexts/AuthContext';
import { LocalAPI } from '../../services/axios';

interface TableauBordStats {
  totalDossiers: number;
  clotures: number;
  enCours: number;
  nonAffectes: number;
}

interface TypeStats {
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
  joursEnCours?: number;
  priorite?: string;
}

function ChefEquipeTableauBord() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TableauBordStats>({
    totalDossiers: 0,
    clotures: 0,
    enCours: 0,
    nonAffectes: 0
  });
  const [typeStats, setTypeStats] = useState<TypeStats>({});
  const [derniersDossiers, setDerniersDossiers] = useState<Dossier[]>([]);
  const [dossiersEnCours, setDossiersEnCours] = useState<Dossier[]>([]);
  const [searchType, setSearchType] = useState('Ref. GSD');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('Tous types');
  const [statutFilter, setStatutFilter] = useState('Tous');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, typeRes, derniersRes, enCoursRes] = await Promise.all([
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/stats'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/types-detail'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/derniers-dossiers'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/dossiers-en-cours')
      ]);

      setStats(statsRes.data);
      setTypeStats(typeRes.data);
      setDerniersDossiers(derniersRes.data);
      setDossiersEnCours(enCoursRes.data);
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
    } catch (error) {
      console.error('Search error:', error);
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

  const handleChangerType = async (dossier: Dossier) => {
    const newType = prompt('Nouveau type de dossier:', dossier.type);
    if (!newType || newType === dossier.type) return;

    try {
      await LocalAPI.post('/bordereaux/chef-equipe/tableau-bord/change-document-type', {
        documentId: dossier.id,
        newType
      });
      alert('Type de dossier modifié avec succès');
      loadData();
    } catch (error) {
      alert('Erreur lors du changement de type');
    }
  };

  const handleRetournerScan = async (dossier: Dossier) => {
    const reason = prompt('Raison du retour vers l\'équipe Scan:');
    if (!reason) return;

    try {
      await LocalAPI.post('/bordereaux/chef-equipe/tableau-bord/return-to-scan', {
        bordereauId: dossier.id,
        reason
      });
      alert('Dossier retourné vers l\'équipe Scan');
      loadData();
    } catch (error) {
      alert('Erreur lors du retour vers Scan');
    }
  };

  const getProgressPercentage = (value: number, total: number) => {
    return total > 0 ? (value / total) * 100 : 0;
  };

  const getAvatarColor = (name: string) => {
    const colors = ['#9c27b0', '#e91e63', '#3f51b5', '#009688', '#ff9800'];
    const index = name.length % colors.length;
    return colors[index];
  };

  const getPriorityColor = (priorite: string) => {
    switch (priorite) {
      case 'Très': return '#f44336';
      case 'Moyenne': return '#ff9800';
      default: return '#4caf50';
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'Traité': return '#4caf50';
      case 'Réglé': return '#4caf50';
      case 'En cours de traitement': return '#ff9800';
      case 'Scan Finalisé': return '#2196f3';
      default: return '#9e9e9e';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Prestation': return '💊';
      case 'Adhésion': return '👤';
      case 'Complément Dossier': return '📄';
      case 'Avenant': return '📝';
      case 'Réclamation': return '📞';
      default: return '📋';
    }
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
        {/* Search Section */}
        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          padding: '20px', 
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
                fontSize: '14px'
              }}
            >
              <option value="Ref. GSD">Ref. GSD</option>
            </select>
            <input
              type="text"
              placeholder="Entrez votre recherche..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <button
              onClick={handleSearch}
              style={{
                background: '#d32f2f',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🔍 Rechercher
            </button>
          </div>
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
                  width: `${getProgressPercentage(stats.clotures, stats.totalDossiers)}%` 
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
                  width: `${getProgressPercentage(stats.enCours, stats.totalDossiers)}%` 
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
                  width: `${getProgressPercentage(stats.nonAffectes, stats.totalDossiers)}%` 
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
            {Object.entries(typeStats).map(([type, data]) => (
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
                Derniers Dossiers Ajoutés
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
                        background: getStatutColor(dossier.statut), 
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
                    <td style={{ padding: '12px 8px', fontSize: '14px', color: '#666' }}>
                      {dossier.date}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: '#2196f3', 
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}>
                          Voir
                        </button>
                        <button 
                          onClick={() => handleChangerType(dossier)}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#9c27b0', 
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Modifier
                        </button>
                        {index === 0 && (
                          <button style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#4caf50', 
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}>
                            Télécharger
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                Dossiers En Cours ({dossiersEnCours.length})
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
              <button style={{ 
                background: '#d32f2f', 
                color: 'white', 
                border: 'none', 
                padding: '6px 12px', 
                borderRadius: '4px', 
                fontSize: '12px', 
                cursor: 'pointer' 
              }}>
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
                {dossiersEnCours.slice(0, 3).map((dossier, index) => (
                  <tr key={dossier.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: 'bold' }}>
                      {dossier.reference}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                      {dossier.client}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '16px' }}>{getTypeIcon(dossier.type)}</span>
                        {dossier.type}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                      {dossier.joursEnCours} jours
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                      <span style={{ 
                        background: getPriorityColor(dossier.priorite || 'Normale'), 
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
                        <button style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: '#2196f3', 
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}>
                          Voir
                        </button>
                        <button 
                          onClick={() => handleRetournerScan(dossier)}
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

export default ChefEquipeTableauBord;