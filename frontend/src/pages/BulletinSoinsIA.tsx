import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { aiService } from '../services/aiService';
import { LocalAPI } from '../services/axios';
import { AssignmentSuggestions } from '../components/BS/AssignmentSuggestions';
import { RebalancingSuggestions } from '../components/BS/RebalancingSuggestions';
import { PrioritiesDashboard } from '../components/BS/PrioritiesDashboard';

// ─── Constants ────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL = 60_000;

// ─── Micro-components (duplicated from EnhancedDashboard for identical look) ──

const Spinner: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
    <div style={{
      width: 44, height: 44,
      border: '3px solid #e5e7eb',
      borderTop: '3px solid #d52b36',
      borderRadius: '50%',
      animation: 'ars-spin 0.8s linear infinite',
    }} />
    <p style={{ color: '#6b7280', fontWeight: 500, margin: 0 }}>Chargement du module IA…</p>
  </div>
);

const ModalShell: React.FC<{ title: string; onClose: () => void; maxWidth?: number; children: React.ReactNode; accentColor?: string }> = ({
  title, onClose, maxWidth = 480, children, accentColor = '#d52b36'
}) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
    <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,.25)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: `3px solid ${accentColor}` }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: accentColor }}>{title}</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#9ca3af', lineHeight: 1, padding: 0 }}>×</button>
      </div>
      <div style={{ padding: 24, flex: 1, overflow: 'auto' }}>{children}</div>
    </div>
  </div>
);

const InfoBox: React.FC<{ color: string; border: string; children: React.ReactNode }> = ({ color, border, children }) => (
  <div style={{ padding: '10px 14px', background: color, border: `1px solid ${border}`, borderRadius: 8, fontSize: 14 }}>{children}</div>
);

interface BannerProps { icon: string; color: string; border: string; title: string; desc?: string; children?: React.ReactNode }
const Banner: React.FC<BannerProps> = ({ icon, color, border, title, desc, children }) => (
  <div style={{ padding: '12px 16px', background: color, border: `1px solid ${border}`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
    <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
    <div style={{ flex: 1 }}>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{title}</p>
      {desc && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{desc}</p>}
    </div>
    {children && <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{children}</div>}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const BulletinSoinsIA: React.FC = () => {
  const { user } = useAuthContext();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [showAIExplanationModal, setShowAIExplanationModal] = useState(false);

  const fetchInFlight = useRef(false);
  const aiInFlight = useRef(false);

  // ── Fetch light dashboard data (kpis + performance) needed to feed AI recommendations ──
  const fetchDashboardData = useCallback(async () => {
    if (fetchInFlight.current) return;
    fetchInFlight.current = true;
    try {
      setError(null);
      const dashRes = await LocalAPI.get('/dashboard/role-based', { params: {}, timeout: 300_000 });
      setDashboardData(dashRes.data);
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.response?.data?.message ?? 'Erreur de connexion — vérifiez votre connexion réseau');
    } finally {
      setLoading(false);
      fetchInFlight.current = false;
    }
  }, []);

  // ── Fetch AI insights (EXACT same logic as EnhancedDashboard) ──
  const fetchAIInsights = useCallback(async () => {
    if (!dashboardData?.kpis || aiInFlight.current) return;
    aiInFlight.current = true;
    try {
      const isReady = await aiService.ensureReady();
      if (!isReady) throw new Error('Authentication failed');

      const healthCheck = await aiService.healthCheck();
      let recommendations = { recommendations: [] };

      if (healthCheck.status === 'healthy') {
        try {
          const agentsRes = await LocalAPI.get('/users/gestionnaires');
          const agents = agentsRes.data ?? [];
          const fallbackBordereaux = new Array(Math.max(0, dashboardData.kpis?.totalBordereaux ?? 0));
          recommendations = await aiService.getRecommendations({
            bordereaux: fallbackBordereaux,
            agents,
            workload: dashboardData.performance?.performance ?? [],
            currentWorkload: fallbackBordereaux.length,
            staff_count: agents.length,
          });
        } catch (e) {
          console.warn('AI recommendations unavailable:', e);
        }
      }

      setAiInsights({ health: healthCheck, recommendations: recommendations?.recommendations ?? [], lastUpdated: new Date() });
    } catch (e) {
      setAiInsights({ health: { status: 'unavailable', message: 'Service inaccessible' }, recommendations: [], lastUpdated: new Date() });
    } finally {
      aiInFlight.current = false;
    }
  }, [dashboardData]);

  // ── Effects ───────────────────────────────────────────────────────────────────

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  // AI insights after dashboard data arrives
  useEffect(() => {
    if (dashboardData) fetchAIInsights();
  }, [fetchAIInsights, dashboardData]);

  // Auto-refresh
  useEffect(() => {
    const id = setInterval(() => {
      fetchDashboardData();
      if (aiInsights?.health?.status === 'unavailable') fetchAIInsights();
    }, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchDashboardData, aiInsights, fetchAIInsights]);

  // ─────────────────────────────────────────────────────────────────────────────
  // EARLY RETURNS
  // ─────────────────────────────────────────────────────────────────────────────

  if (loading && !dashboardData) return (
    <>
      <style>{`@keyframes ars-spin { to { transform: rotate(360deg); } }`}</style>
      <Spinner />
    </>
  );

  if (error) return (
    <div style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚨</div>
      <h3 style={{ color: '#dc2626', marginBottom: '1rem' }}>Problème de Connexion ARS</h3>
      <div style={{ padding: '1.25rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: '1.5rem', textAlign: 'left' }}>
        <p style={{ margin: 0, color: '#b91c1c', fontWeight: 600 }}>{error}</p>
      </div>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button onClick={fetchDashboardData} style={{ padding: '0.7rem 1.4rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>🔄 Réessayer</button>
        <button onClick={() => window.location.reload()} style={{ padding: '0.7rem 1.4rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>🔄 Recharger</button>
      </div>
      <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>Si le problème persiste, contactez l'administrateur ARS</p>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  const canViewModule = dashboardData?.role === 'SUPER_ADMIN' || dashboardData?.role === 'ADMINISTRATEUR' || user?.role === 'RESPONSABLE_DEPARTEMENT';

  return (
    <>
      <style>{`@keyframes ars-spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ padding: '1rem' }}>

        {/* AI status banner */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '1.5rem 0', maxWidth: 1440 }}>
          {aiInsights && (
            <Banner
              icon="🤖"
              color={aiInsights.health.status === 'healthy' ? '#f0fdf4' : '#fffbeb'}
              border={aiInsights.health.status === 'healthy' ? '#bbf7d0' : '#fde68a'}
              title={`Intelligence Artificielle ARS : ${aiInsights.health.status === 'healthy' ? 'Active' : 'Indisponible'}`}
              desc={aiInsights.health.message}
            >
              {aiInsights.recommendations.length > 0 && (
                <span style={{ padding: '3px 10px', background: '#22c55e', color: 'white', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                  {aiInsights.recommendations.length} recommandation(s)
                </span>
              )}
              {aiInsights.health.status === 'unavailable' && (
                <button onClick={fetchAIInsights} style={{ padding: '4px 12px', background: '#22c55e', color: 'white', border: 'none', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
                  Réactiver
                </button>
              )}
            </Banner>
          )}
        </div>

        {/* Module Bulletin de Soins */}
        {canViewModule && (
          <div style={{ marginTop: '2rem', padding: '1.5rem 2rem', border: '1px solid #e0e7ff', borderRadius: 12, backgroundColor: 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ width: 4, height: 22, backgroundColor: '#10b981', marginRight: '1rem', borderRadius: 2 }}></div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1f2937' }}>Module Bulletin de Soins</h3>
              <button onClick={() => setShowAIExplanationModal(true)} style={{ marginLeft: 'auto', padding: '7px 14px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                ℹ️ Comment ça marche ?
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#374151' }}>Suggestions d'Assignation IA</h4>
                <div style={{ maxHeight: 320, overflow: 'auto' }}><AssignmentSuggestions showActions={false} /></div>
              </div>
              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#374151' }}>Suggestions de Rééquilibrage IA</h4>
                <div style={{ maxHeight: 320, overflow: 'auto' }}><RebalancingSuggestions /></div>
              </div>
            </div>
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: 8 }}>
              <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#374151' }}>Priorités par Gestionnaire</h4>
              <PrioritiesDashboard />
            </div>
          </div>
        )}

        {/* AI recommendations */}
        {(aiInsights?.recommendations.length ?? 0) > 0 && (
          <div style={{ marginTop: '2rem', padding: '1.5rem 2rem', border: '1px solid #e0e7ff', borderRadius: 12, backgroundColor: 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ width: 4, height: 22, backgroundColor: '#6366f1', marginRight: '1rem', borderRadius: 2 }}></div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1f2937' }}>🤖 Recommandations IA</h3>
              <span style={{ marginLeft: 'auto', padding: '5px 14px', background: '#6366f1', color: 'white', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                {aiInsights.recommendations.length} recommandation(s)
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {aiInsights.recommendations.map((rec: string, i: number) => {
                const isCrit = rec.includes('🚨') || rec.includes('CRITIQUE') || rec.includes('URGENT');
                const isWarn = rec.includes('⚠️') || rec.includes('Alerte') || rec.includes('Attention');
                const bg     = isCrit ? '#fef2f2' : isWarn ? '#fffbeb' : '#f0f9ff';
                const border = isCrit ? '#ef4444' : isWarn ? '#f59e0b' : '#3b82f6';
                return (
                  <div key={i} style={{ padding: '1rem', background: bg, border: `2px solid ${border}`, borderRadius: 8, display: 'flex', gap: 10 }}>
                    <span style={{ flexShrink: 0, fontSize: 18 }}>{isCrit ? '🚨' : isWarn ? '⚠️' : '📊'}</span>
                    <span style={{ fontSize: 14, lineHeight: 1.5, color: '#374151' }}>{rec}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI unavailable notice */}
        {aiInsights?.health?.status === 'unavailable' && (
          <div style={{ marginTop: '2rem', padding: '1rem 1.5rem', border: '1px solid #fde68a', borderRadius: 10, background: '#fffbeb' }}>
            <h4 style={{ margin: '0 0 6px', color: '#92400e' }}>Service IA Indisponible</h4>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: '#6b7280' }}>Les fonctionnalités de base du tableau de bord restent disponibles.</p>
            <button onClick={fetchAIInsights} style={{ padding: '7px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Réessayer la connexion IA</button>
          </div>
        )}

      </div>

      {/* AI explanation modal */}
      {showAIExplanationModal && (
        <ModalShell title="🤖 Système d'Assignation IA" onClose={() => setShowAIExplanationModal(false)} maxWidth={860} accentColor="#6366f1">
          <div style={{ fontSize: 14, lineHeight: 1.7, color: '#374151' }}>
            <InfoBox color="#f0f9ff" border="#bae6fd">
              💡 L'IA analyse la charge de travail, les performances historiques et les délais SLA pour recommander les meilleurs gestionnaires pour chaque dossier.
            </InfoBox>
            <h4 style={{ color: '#6366f1', marginTop: 20 }}>📊 Formule de Score (0–1)</h4>
            <div style={{ background: '#fef3c7', padding: 12, borderRadius: 8, fontFamily: 'monospace', fontSize: 13, marginBottom: 16 }}>
              Score = (Charge × 40%) + (Efficacité × 25%) + (SLA × 20%) + (Retards × 15%)
            </div>
            {[
              ['Charge (40%)', 'Plus la charge est faible → meilleur score. Score_Charge = 1 − (charge_actuelle / charge_max)'],
              ['Efficacité (25%)', 'Dossiers traités avec succès / total assignés'],
              ['SLA (20%)', 'Pourcentage de dossiers traités dans les délais contractuels'],
              ['Retards (15%)', 'Nombre de dossiers dépassant les délais (pénalité)'],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: '8px 12px', background: '#f9fafb', borderLeft: '3px solid #6366f1', borderRadius: '0 6px 6px 0', marginBottom: 8 }}>
                <strong>{k}</strong> — {v}
              </div>
            ))}
            <h4 style={{ color: '#6366f1', marginTop: 20 }}>⚖️ Rééquilibrage automatique</h4>
            <p>L'IA détecte les gestionnaires surchargés (charge &gt; moyenne + 20%) et propose des transferts vers les moins chargés, en évitant les doublons et en recalculant après chaque transfert.</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
            <button onClick={() => setShowAIExplanationModal(false)} style={{ padding: '10px 28px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>Compris !</button>
          </div>
        </ModalShell>
      )}
    </>
  );
};

export default BulletinSoinsIA;