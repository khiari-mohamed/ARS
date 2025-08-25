import React, { useState, useEffect } from 'react';
import { getAIRecommendations } from '../services/bordereauxService';
import '../styles/bordereaux.css';

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
          <h3 className="bordereau-kpi-label">Recommandations IA</h3>
          <p className="bordereau-kpi-value" style={{fontSize: '1.5rem'}}>
            {recommendations?.recommendations?.length || 0}
          </p>
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
                
                <button
                  className="bordereau-btn bordereau-btn-secondary"
                  style={{fontSize: '0.75rem', padding: '4px 8px', width: '100%'}}
                  onClick={() => window.open(`/bordereaux/${rec.id}`, '_blank')}
                >
                  Voir détails →
                </button>
              </div>
            ))}
            
            <div style={{textAlign: 'center', marginTop: '16px', padding: '8px'}}>
              <button
                className="bordereau-btn bordereau-btn-primary"
                style={{fontSize: '0.75rem', padding: '6px 12px'}}
                onClick={loadRecommendations}
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
              onClick={loadRecommendations}
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