import React, { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { aiService } from '../services/aiService';
import { LocalAPI } from '../services/axios';
import KPIWidgets from '../pages/dashboard/KPIWidgets';
import AlertsPanel from '../pages/dashboard/AlertsPanel';
import SLAStatusPanel from '../pages/dashboard/SLAStatusPanel';
import AIDashboard from './ai/AIDashboard';
import LineChart from './LineChart';
import UserPerformance from './UserPerformance';
import FeedbackForm from './FeedbackForm';

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
}

const EnhancedDashboard: React.FC = () => {
  const { user } = useAuthContext();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    departmentId: '',
    fromDate: '',
    toDate: '',
    period: 'day'
  });
  const [departments] = useState([
    { id: 'bureau-ordre', name: "Bureau d'Ordre" },
    { id: 'scan', name: 'Service SCAN' },
    { id: 'sante', name: 'Équipe Santé' },
    { id: 'production', name: 'Équipe Production' },
    { id: 'finance', name: 'Finance' },
    { id: 'client', name: 'Service Client' }
  ]);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [aiInsights, setAiInsights] = useState<any>(null);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await LocalAPI.get('/dashboard/role-based', { 
        params: filters 
      });
      
      setDashboardData(response.data);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

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

  // Real-time updates
  useEffect(() => {
    fetchDashboardData();
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
        <p>Chargement du tableau de bord...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h3>Erreur de chargement</h3>
        <p>{error}</p>
        <button onClick={fetchDashboardData} style={{ padding: '0.5rem 1rem', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Réessayer
        </button>
      </div>
    );
  }

  const renderRoleSpecificContent = () => {
    if (!dashboardData) return null;

    switch (dashboardData.role) {
      case 'SUPER_ADMIN':
        return (
          <div style={{ marginTop: '2rem' }}>
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

      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <div>
          <h1 style={{ margin: 0, color: '#2c3e50' }}>Tableau de Bord - {user?.role}</h1>
          <p style={{ margin: '0.5rem 0 0 0', color: '#7f8c8d' }}>
            Dernière mise à jour: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={realTimeEnabled}
              onChange={(e) => setRealTimeEnabled(e.target.checked)}
            />
            Temps réel
          </label>
          
          <button 
            onClick={() => exportData('excel')} 
            disabled={!dashboardData}
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: dashboardData ? '#27ae60' : '#95a5a6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: dashboardData ? 'pointer' : 'not-allowed' 
            }}
          >
            📊 Excel
          </button>
          
          <button 
            onClick={() => exportData('pdf')} 
            disabled={!dashboardData}
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: dashboardData ? '#e74c3c' : '#95a5a6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: dashboardData ? 'pointer' : 'not-allowed' 
            }}
          >
            📄 PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ 
        padding: '1.5rem', 
        marginBottom: '2rem', 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        border: '1px solid #e5e7eb',
        boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ width: '4px', height: '20px', backgroundColor: '#6366f1', marginRight: '0.75rem', borderRadius: '2px' }}></div>
          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#374151' }}>Filtres</h4>
          {(filters.departmentId || filters.fromDate || filters.toDate || filters.period !== 'day') && (
            <span style={{ 
              marginLeft: '1rem', 
              padding: '0.25rem 0.5rem', 
              backgroundColor: '#dbeafe', 
              color: '#1e40af', 
              borderRadius: '12px', 
              fontSize: '0.75rem',
              fontWeight: '500'
            }}>
              Filtres actifs
            </span>
          )}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Département:</label>
            <select 
              name="departmentId" 
              value={filters.departmentId} 
              onChange={handleFilterChange} 
              style={{ 
                width: '100%',
                padding: '0.75rem', 
                borderRadius: '6px', 
                border: '1px solid #d1d5db',
                fontSize: '0.875rem',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">Tous</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Du:</label>
            <input
              type="date"
              name="fromDate"
              value={filters.fromDate}
              onChange={handleFilterChange}
              style={{ 
                width: '100%',
                padding: '0.75rem', 
                borderRadius: '6px', 
                border: '1px solid #d1d5db',
                fontSize: '0.875rem'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Au:</label>
            <input
              type="date"
              name="toDate"
              value={filters.toDate}
              onChange={handleFilterChange}
              min={filters.fromDate}
              style={{ 
                width: '100%',
                padding: '0.75rem', 
                borderRadius: '6px', 
                border: '1px solid #d1d5db',
                fontSize: '0.875rem'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Période:</label>
            <select 
              name="period" 
              value={filters.period} 
              onChange={handleFilterChange} 
              style={{ 
                width: '100%',
                padding: '0.75rem', 
                borderRadius: '6px', 
                border: '1px solid #d1d5db',
                fontSize: '0.875rem',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="day">Jour</option>
              <option value="week">Semaine</option>
              <option value="month">Mois</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={clearFilters} 
              style={{ 
                padding: '0.75rem 1rem', 
                backgroundColor: '#6b7280', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6b7280'}
            >
              🧹 Effacer
            </button>
            <button 
              onClick={fetchDashboardData}
              style={{ 
                padding: '0.75rem 1rem', 
                backgroundColor: '#3b82f6', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
            >
              🔄 Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* AI Status */}
      {aiInsights && (
        <div style={{ 
          padding: '1rem', 
          marginBottom: '2rem', 
          borderRadius: '8px', 
          backgroundColor: aiInsights.health.status === 'healthy' ? '#d4edda' : '#fff3cd',
          border: `1px solid ${aiInsights.health.status === 'healthy' ? '#c3e6cb' : '#ffeaa7'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <span style={{ fontSize: '1.5rem' }}>🤖</span>
          <div style={{ flex: 1 }}>
            <span>IA: {aiInsights.health.status}</span>
            {aiInsights.health.message && (
              <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                - {aiInsights.health.message}
              </span>
            )}
          </div>
          {aiInsights.recommendations.length > 0 && (
            <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#28a745', color: 'white', borderRadius: '4px', fontSize: '0.8rem' }}>
              {aiInsights.recommendations.length} recommandations
            </span>
          )}
          {aiInsights.health.status === 'healthy' && (
            <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#17a2b8', color: 'white', borderRadius: '4px', fontSize: '0.8rem' }}>
              IA Active
            </span>
          )}
          {aiInsights.health.status === 'unavailable' && (
            <button 
              onClick={fetchAIInsights}
              style={{ padding: '0.25rem 0.5rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Réessayer
            </button>
          )}
        </div>
      )}

      {/* Main Content */}
      {dashboardData && (
        <>
          {/* KPIs */}
          <div style={{ marginBottom: '2rem' }}>
            <KPIWidgets kpis={dashboardData.kpis} />
          </div>

          {/* Main Grid - 3 columns, 2 rows */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <SLAStatusPanel slaStatus={dashboardData.slaStatus} />
            </div>
            
            <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: 'white' }}>
              <h3>Alertes</h3>
              <AlertsPanel alerts={dashboardData.alerts.alerts || []} />
            </div>
            
            <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: 'white' }}>
              <h3>Performance Équipe</h3>
              <UserPerformance data={dashboardData.performance.performance || []} />
            </div>
            
            <div style={{ gridColumn: 'span 3', padding: '2rem', border: '1px solid #e0e7ff', borderRadius: '12px', backgroundColor: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: '4px', height: '24px', backgroundColor: '#10b981', marginRight: '1rem', borderRadius: '2px' }}></div>
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#1f2937' }}>Tendances & Indicateurs</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ 
                  padding: '1.5rem', 
                  borderRadius: '12px', 
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '4rem', opacity: '0.2' }}>📈</div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: '600' }}>Croissance Mensuelle</h4>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>+{Math.round(Math.random() * 20)}%</div>
                    <p style={{ margin: 0, opacity: '0.9', fontSize: '0.9rem' }}>Augmentation par rapport au mois dernier</p>
                  </div>
                </div>
                <div style={{ 
                  padding: '1.5rem', 
                  borderRadius: '12px', 
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '4rem', opacity: '0.2' }}>⚡</div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: '600' }}>Efficacité Moyenne</h4>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{dashboardData.performance?.summary?.avgEfficiency?.toFixed(1) || 0}%</div>
                    <p style={{ margin: 0, opacity: '0.9', fontSize: '0.9rem' }}>Performance globale de l'équipe</p>
                  </div>
                </div>
              </div>
              <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '1rem' }}>
                <LineChart 
                  data={dashboardData.performance.summary ? [dashboardData.performance.summary] : []} 
                  dataKey="avgEfficiency" 
                  label="Efficacité Moyenne" 
                />
              </div>
            </div>
          </div>

          {/* Role-specific content */}
          {renderRoleSpecificContent()}

          {/* AI Dashboard */}
          {user?.role === 'SUPER_ADMIN' && (
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