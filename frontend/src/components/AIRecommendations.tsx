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
  const [showResultModal, setShowResultModal] = useState(false);
  const [modalResult, setModalResult] = useState<any>(null);

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
      const response = await fetch(`/api/bordereaux/${bordereauId}/ai-assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setModalResult({
          type: 'assignment',
          success: true,
          title: '🤖 Assignation Automatique IA',
          data: result
        });
        setShowResultModal(true);
        loadRecommendations();
      } else {
        setModalResult({
          type: 'assignment',
          success: false,
          title: '❌ Erreur d\'Assignation',
          error: 'Erreur lors de l\'assignation automatique'
        });
        setShowResultModal(true);
      }
    } catch (error) {
      console.error('AI assignment error:', error);
      setModalResult({
        type: 'assignment',
        success: false,
        title: '❌ Erreur de Connexion',
        error: 'Impossible de contacter le service IA'
      });
      setShowResultModal(true);
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
        setModalResult({
          type: 'prioritization',
          success: true,
          title: '⚡ Priorisation IA',
          data: result
        });
        setShowResultModal(true);
        loadRecommendations();
      } else {
        setModalResult({
          type: 'prioritization',
          success: false,
          title: '❌ Erreur de Priorisation',
          error: 'Erreur lors de la priorisation'
        });
        setShowResultModal(true);
      }
    } catch (error) {
      console.error('AI prioritization error:', error);
      setModalResult({
        type: 'prioritization',
        success: false,
        title: '❌ Erreur de Connexion',
        error: 'Impossible de contacter le service IA'
      });
      setShowResultModal(true);
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
        setModalResult({
          type: 'resource_alert',
          success: true,
          title: '👥 Alerte Ressources IA',
          data: result
        });
        setShowResultModal(true);
      }
    } catch (error) {
      console.error('Resource alert error:', error);
      setModalResult({
        type: 'resource_alert',
        success: false,
        title: '❌ Erreur d\'Alerte',
        error: 'Erreur lors de l\'envoi de l\'alerte'
      });
      setShowResultModal(true);
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
                    onClick={() => handleBordereauClick(rec.id || rec.reference)}
                  >
                    🤖 Assigner Auto
                  </button>
                  <button
                    className="bordereau-btn bordereau-btn-secondary"
                    style={{fontSize: '0.7rem', padding: '3px 6px', flex: 1}}
                    onClick={() => handlePrioritize(rec.id || rec.reference)}
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

      {/* Result Modal */}
      {showResultModal && modalResult && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 600,
                color: modalResult.success ? '#059669' : '#dc2626'
              }}>
                {modalResult.title}
              </h3>
              <button
                onClick={() => setShowResultModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              {modalResult.success ? (
                <div>
                  {modalResult.type === 'assignment' && (
                    <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                      <div style={{ marginBottom: '12px' }}>
                        <strong style={{ color: '#059669' }}>Assigné à:</strong>
                        <span style={{ marginLeft: '8px', fontSize: '1.1rem', fontWeight: 600 }}>
                          {modalResult.data.assignedTo}
                        </span>
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <strong style={{ color: '#059669' }}>Raison:</strong>
                        <p style={{ margin: '4px 0', color: '#374151' }}>
                          {modalResult.data.reason}
                        </p>
                      </div>
                      {modalResult.data.confidence && (
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ color: '#059669' }}>Confiance IA:</strong>
                          <span style={{
                            marginLeft: '8px',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: modalResult.data.confidence === 'high' ? '#dcfce7' : '#fef3c7',
                            color: modalResult.data.confidence === 'high' ? '#166534' : '#92400e'
                          }}>
                            {modalResult.data.confidence.toUpperCase()}
                          </span>
                        </div>
                      )}
                      {modalResult.data.score && (
                        <div>
                          <strong style={{ color: '#059669' }}>Score:</strong>
                          <span style={{ marginLeft: '8px' }}>{modalResult.data.score.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {modalResult.type === 'prioritization' && (
                    <div style={{ padding: '16px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                      <div style={{ marginBottom: '12px' }}>
                        <strong style={{ color: '#92400e' }}>Nouvelle Priorité:</strong>
                        <span style={{
                          marginLeft: '8px',
                          padding: '4px 12px',
                          borderRadius: '16px',
                          fontSize: '1rem',
                          fontWeight: 700,
                          backgroundColor: modalResult.data.priority >= 4 ? '#fecaca' : modalResult.data.priority >= 3 ? '#fed7aa' : '#d1fae5',
                          color: modalResult.data.priority >= 4 ? '#991b1b' : modalResult.data.priority >= 3 ? '#9a3412' : '#065f46'
                        }}>
                          {modalResult.data.priority}/5
                        </span>
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <strong style={{ color: '#92400e' }}>Raison:</strong>
                        <p style={{ margin: '4px 0', color: '#374151' }}>
                          {modalResult.data.reason}
                        </p>
                      </div>
                      {modalResult.data.ai_confidence && (
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ color: '#92400e' }}>Confiance IA:</strong>
                          <span style={{ marginLeft: '8px' }}>{(modalResult.data.ai_confidence * 100).toFixed(1)}%</span>
                        </div>
                      )}
                      {modalResult.data.breach_probability && (
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ color: '#92400e' }}>Risque SLA:</strong>
                          <span style={{ marginLeft: '8px' }}>{(modalResult.data.breach_probability * 100).toFixed(1)}%</span>
                        </div>
                      )}
                      {modalResult.data.daysLeft !== undefined && (
                        <div>
                          <strong style={{ color: '#92400e' }}>Jours restants:</strong>
                          <span style={{ marginLeft: '8px' }}>{modalResult.data.daysLeft}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {modalResult.type === 'resource_alert' && (
                    <div style={{ padding: '16px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #93c5fd' }}>
                      <div style={{ marginBottom: '12px' }}>
                        <strong style={{ color: '#1d4ed8' }}>Gestionnaires actuels:</strong>
                        <span style={{ marginLeft: '8px', fontSize: '1.1rem', fontWeight: 600 }}>
                          {modalResult.data.current}
                        </span>
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <strong style={{ color: '#1d4ed8' }}>Gestionnaires nécessaires:</strong>
                        <span style={{ marginLeft: '8px', fontSize: '1.1rem', fontWeight: 600 }}>
                          {modalResult.data.needed}
                        </span>
                      </div>
                      {modalResult.data.shortage > 0 && (
                        <div style={{
                          padding: '12px',
                          backgroundColor: '#fef2f2',
                          borderRadius: '6px',
                          border: '1px solid #fca5a5',
                          marginTop: '12px'
                        }}>
                          <strong style={{ color: '#dc2626' }}>⚠️ Déficit:</strong>
                          <span style={{ marginLeft: '8px', fontSize: '1.1rem', fontWeight: 600, color: '#dc2626' }}>
                            {modalResult.data.shortage} gestionnaire(s) manquant(s)
                          </span>
                        </div>
                      )}
                      {modalResult.data.alert_sent && (
                        <div style={{ marginTop: '12px', color: '#059669', fontSize: '0.9rem' }}>
                          ✅ Alerte envoyée aux administrateurs
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  padding: '16px',
                  backgroundColor: '#fef2f2',
                  borderRadius: '8px',
                  border: '1px solid #fca5a5',
                  color: '#dc2626'
                }}>
                  {modalResult.error}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setShowResultModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Fermer
              </button>
              {modalResult.success && (
                <button
                  onClick={() => {
                    setShowResultModal(false);
                    loadRecommendations();
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  🔄 Actualiser
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIRecommendations;

// Export types for use in other components
export type { AIInsight };