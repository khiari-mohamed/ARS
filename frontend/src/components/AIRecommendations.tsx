import React, { useState, useEffect } from 'react';
import { getAIRecommendations } from '../services/bordereauxService';
import '../styles/bordereaux.css';

interface AIInsight {
  type: 'sla_risk' | 'resource_need' | 'reassignment' | 'priority' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  action?: string;
  bordereauId?: string;
  data?: any;
}

const AIRecommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(loadRecommendations, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadRecommendations = async () => {
    try {
      const data = await getAIRecommendations();
      setRecommendations(data);
    } catch (error) {
      console.error('Error loading AI recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (score: number) => {
    if (score >= 3) return '#ef4444'; // High priority - red
    if (score >= 2) return '#f59e0b'; // Medium priority - orange  
    return '#10b981'; // Low priority - green
  };

  const getPriorityLabel = (score: number) => {
    if (score >= 3) return 'URGENT';
    if (score >= 2) return 'IMPORTANT';
    return 'NORMAL';
  };

  const formatDays = (days: number) => {
    return Math.round(days);
  };

  const handleBordereauClick = async (bordereauId: string) => {
    try {
      // AI Action: Auto-assign bordereau to optimal gestionnaire
      const response = await fetch(`/api/bordereaux/${bordereauId}/ai-assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`✅ IA: Bordereau ${bordereauId} assigné automatiquement à ${result.assignedTo}\nRaison: ${result.reason}`);
        loadRecommendations(); // Refresh data
      } else {
        alert('❌ Erreur lors de l\'assignation automatique');
      }
    } catch (error) {
      console.error('AI assignment error:', error);
      alert('❌ Erreur de connexion');
    }
  };

  const loadAIData = () => {
    loadRecommendations();
  };

  const handlePrioritize = async (bordereauId: string) => {
    try {
      const response = await fetch(`/api/bordereaux/${bordereauId}/ai-prioritize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`⚡ IA: Bordereau ${bordereauId} priorisé\nNouvelle priorité: ${result.priority}\nRaison: ${result.reason}`);
        loadRecommendations();
      } else {
        alert('❌ Erreur lors de la priorisation');
      }
    } catch (error) {
      console.error('AI prioritization error:', error);
      alert('❌ Erreur de connexion');
    }
  };

  const handleResourceAlert = async () => {
    try {
      const response = await fetch('/api/bordereaux/ai/resource-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`👥 IA: Alerte ressources envoyée\nGestionnaires nécessaires: ${result.needed}\nActuels: ${result.current}`);
      }
    } catch (error) {
      console.error('Resource alert error:', error);
    }
  };

  if (loading) {
    return (
      <div className="bordereau-kpi-card">
        <div className="bordereau-kpi-content">
          <div className="bordereau-kpi-info">
            <div className="bordereau-kpi-icon" style={{background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)'}}>
              <span>🤖</span>
            </div>
            <h3 className="bordereau-kpi-label">Recommandations IA</h3>
            <div className="bordereau-spinner" style={{width: '24px', height: '24px', margin: '8px auto'}}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bordereau-kpi-card" style={{minHeight: '400px'}}>
      <div className="bordereau-kpi-content">
        <div className="bordereau-kpi-info">
          <div className="bordereau-kpi-icon" style={{background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)'}}>
            <span>🤖</span>
          </div>
          <h3 className="bordereau-kpi-label">Intelligence Artificielle</h3>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <p className="bordereau-kpi-value" style={{fontSize: '1.5rem', margin: 0}}>
              {recommendations?.recommendations?.length || 0}
            </p>
            <button
              onClick={handleResourceAlert}
              style={{
                fontSize: '0.7rem',
                padding: '2px 6px',
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              👥 Alerte Ressources
            </button>
          </div>
        </div>
      </div>
      
      <div style={{marginTop: '24px', maxHeight: '300px', overflowY: 'auto'}}>
        {recommendations?.recommendations?.length > 0 ? (
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            {recommendations.recommendations.slice(0, 5).map((rec: any, i: number) => (
              <div key={i} className="bordereau-kanban-card" style={{padding: '12px', margin: 0}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px'}}>
                  <div style={{flex: 1}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                      <div 
                        style={{
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          backgroundColor: getPriorityColor(rec.score)
                        }}
                      ></div>
                      <span style={{fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 700, color: '#1e40af'}}>
                        {rec.reference}
                      </span>
                    </div>
                    <div style={{fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px'}}>
                      ⏱ {formatDays(rec.daysSinceReception)}j depuis réception
                    </div>
                    <div style={{fontSize: '0.75rem', color: '#9ca3af'}}>
                      SLA: {rec.slaThreshold}j
                    </div>
                  </div>
                  <div style={{textAlign: 'right'}}>
                    <div 
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'white',
                        background: getPriorityColor(rec.score),
                        padding: '2px 8px',
                        borderRadius: '12px',
                        marginBottom: '4px'
                      }}
                    >
                      {getPriorityLabel(rec.score)}
                    </div>
                    <div style={{fontSize: '0.75rem', color: '#6b7280'}}>
                      Score: {rec.score}
                    </div>
                  </div>
                </div>
                
                <div style={{display: 'flex', gap: '4px'}}>
                  <button
                    className="bordereau-btn bordereau-btn-primary"
                    style={{fontSize: '0.7rem', padding: '3px 6px', flex: 1}}
                    onClick={() => handleBordereauClick(rec.id)}
                  >
                    🤖 Assigner Auto
                  </button>
                  <button
                    className="bordereau-btn bordereau-btn-secondary"
                    style={{fontSize: '0.7rem', padding: '3px 6px', flex: 1}}
                    onClick={() => handlePrioritize(rec.id)}
                  >
                    ⚡ Prioriser
                  </button>
                </div>
              </div>
            ))}
            
            <div style={{textAlign: 'center', marginTop: '16px', padding: '8px'}}>
              <button
                className="bordereau-btn bordereau-btn-primary"
                style={{fontSize: '0.75rem', padding: '6px 12px'}}
                onClick={loadAIData}
              >
                🔄 Actualiser
              </button>
            </div>
          </div>
        ) : (
          <div style={{textAlign: 'center', color: '#9ca3af', padding: '32px 16px'}}>
            <div className="bordereau-kpi-icon" style={{margin: '0 auto 16px', background: '#f3f4f6'}}>
              <span style={{fontSize: '2rem'}}>🤖</span>
            </div>
            <div className="bordereau-kpi-label">Aucune recommandation</div>
            <button
              className="bordereau-btn bordereau-btn-secondary"
              style={{fontSize: '0.75rem', padding: '6px 12px', marginTop: '12px'}}
              onClick={loadAIData}
            >
              🔄 Actualiser
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIRecommendations;

// Export types for use in other components
export type { AIInsight };