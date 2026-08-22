import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LocalAPI } from '../../services/axios';

// ─── Design tokens ────────────────────────────────────────────────────────────
// Mirrors the token set used across the rest of the dashboard (EnhancedDashboard.tsx)
// so this card sits inside the page as one visual language instead of a bolted-on
// MUI island. Keep this in sync if the shared palette ever moves to a real module.

const theme = {
  font: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
  surface: '#ffffff',
  surfaceSubtle: '#fafbfd',
  surfaceMuted: '#f3f4f8',
  border: '#e7e9f0',
  borderStrong: '#d9dce6',
  divider: '#eef0f5',
  text: '#161a24',
  textMuted: '#5b6072',
  textFaint: '#9498a8',
  primary: '#c31f2e',
  primaryDark: '#9c1723',
  primarySoft: '#fdeceb',
  success: '#1a9c5b',
  successSoft: '#e9f9f1',
  successBorder: '#b6ecd2',
  warning: '#c17a09',
  warningSoft: '#fef6e7',
  warningBorder: '#f6ddab',
  danger: '#d13438',
  dangerSoft: '#fdecec',
  dangerBorder: '#f5c6c6',
  info: '#2461c0',
  infoSoft: '#eaf2fd',
  infoBorder: '#c3dbf8',
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  shadowSm: '0 1px 3px rgba(20,22,35,.05), 0 1px 2px rgba(20,22,35,.03)',
  shadowMd: '0 6px 16px -4px rgba(20,22,35,.09), 0 2px 6px -2px rgba(20,22,35,.05)',
} as const;

const cardBase: React.CSSProperties = {
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: theme.radiusLg,
  boxShadow: theme.shadowSm,
};

// ─── Types (unchanged) ─────────────────────────────────────────────────────────

interface WorkforceData {
  currentStaff: number;
  requiredStaff: number;
  requiredStaffCalculation?: string;
  currentWorkload: number;
  currentWorkloadCalculation?: string;
  targetWorkload: number;
  targetWorkloadCalculation?: string;
  efficiency: number;
  recommendations: string[];
  departmentAnalysis: {
    department: string;
    currentStaff: number;
    requiredStaff: number;
    workload: number;
    efficiency: number;
    status: 'understaffed' | 'optimal' | 'overstaffed';
  }[];
}

type Period = 'current' | 'forecast' | 'optimal';

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string; icon: string; label: string }> = {
  understaffed: { bg: theme.dangerSoft, text: theme.danger, border: theme.dangerBorder, icon: '⚠', label: 'Sous-effectif' },
  optimal: { bg: theme.successSoft, text: theme.success, border: theme.successBorder, icon: '✓', label: 'Optimal' },
  overstaffed: { bg: theme.warningSoft, text: theme.warning, border: theme.warningBorder, icon: '▾', label: 'Sur-effectif' },
};

// ─── Component ──────────────────────────────────────────────────────────────────

const WorkforceEstimator: React.FC = () => {
  const [data, setData] = useState<WorkforceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('current');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const fetchInFlight = useRef(false);

  const loadWorkforceData = useCallback(async () => {
    if (fetchInFlight.current) return;
    fetchInFlight.current = true;
    setRefreshing(true);
    try {
      const response = await LocalAPI.get('/analytics/workforce-estimator', {
        params: { period },
        timeout: 300000,
      });
      setData(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load workforce data:', error);
      // No fallback data - show empty state when database is empty
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
      fetchInFlight.current = false;
    }
  }, [period]);

  useEffect(() => {
    loadWorkforceData();
    const interval = setInterval(loadWorkforceData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [loadWorkforceData]);

  const staffingGap = data ? data.requiredStaff - data.currentStaff : 0;

  const workloadStatus: 'critical' | 'warning' | 'normal' = (() => {
    if (!data || !data.targetWorkload) return 'normal';
    const ratio = data.currentWorkload / data.targetWorkload;
    if (ratio > 1.2) return 'critical';
    if (ratio > 1.1) return 'warning';
    return 'normal';
  })();

  const workloadAccent =
    workloadStatus === 'critical' ? theme.danger : workloadStatus === 'warning' ? theme.warning : theme.info;

  const efficiencyAccent = !data
    ? theme.info
    : data.efficiency > 80
    ? theme.success
    : data.efficiency > 60
    ? theme.warning
    : theme.danger;

  const requiredAccent = staffingGap > 0 ? theme.danger : staffingGap < 0 ? theme.warning : theme.success;

  return (
    <div style={{ ...cardBase, padding: '22px 24px', fontFamily: theme.font, animation: 'wfe-fade .35s ease' }}>
      <style>{`
        @keyframes wfe-spin { to { transform: rotate(360deg); } }
        @keyframes wfe-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 36, height: 36, borderRadius: 11, background: theme.primarySoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
            👥
          </span>
          <div>
            <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: theme.text }}>Estimateur de Main-d'œuvre</h3>
            <p style={{ margin: '2px 0 0', fontSize: 11.5, color: theme.textFaint, fontWeight: 600 }}>
              Mis à jour {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', background: theme.surfaceMuted, borderRadius: 999, padding: 3, border: `1px solid ${theme.divider}` }}>
            {(['current', 'forecast', 'optimal'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: theme.font,
                  transition: 'background .15s, color .15s',
                  background: period === p ? theme.primary : 'transparent',
                  color: period === p ? '#ffffff' : theme.textMuted,
                }}
              >
                {p === 'current' ? 'Actuel' : p === 'forecast' ? 'Prévision' : 'Optimal'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => loadWorkforceData()}
            title="Actualiser"
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: `1px solid ${theme.border}`,
              background: theme.surface,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: theme.textMuted,
              fontSize: 15,
              flexShrink: 0,
            }}
          >
            <span style={{ display: 'inline-block', animation: refreshing ? 'wfe-spin .8s linear infinite' : 'none' }}>⟳</span>
          </button>
        </div>
      </div>

      {loading ? (
        <SpinnerBlock />
      ) : !data ? (
        <EmptyBlock />
      ) : (
        <>
          {/* Staffing gap banner */}
          {staffingGap !== 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 13,
                padding: '13px 17px',
                marginBottom: 20,
                borderRadius: theme.radiusMd,
                background: staffingGap > 0 ? theme.warningSoft : theme.infoSoft,
                border: `1px solid ${staffingGap > 0 ? theme.warningBorder : theme.infoBorder}`,
              }}
            >
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,.55)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                {staffingGap > 0 ? '⚠' : 'ℹ'}
              </span>
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 13.5, color: theme.text }}>
                  {staffingGap > 0 ? 'Sous-effectif détecté' : 'Sur-effectif détecté'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: theme.textMuted, fontWeight: 600 }}>
                  {staffingGap > 0
                    ? `${staffingGap} gestionnaire${staffingGap > 1 ? 's' : ''} manquant${staffingGap > 1 ? 's' : ''} pour atteindre l'effectif requis`
                    : `${Math.abs(staffingGap)} gestionnaire${Math.abs(staffingGap) > 1 ? 's' : ''} en excès par rapport au besoin actuel`}
                </p>
              </div>
            </div>
          )}

          {/* KPI grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
            <KpiCard
              icon="👥"
              label="Effectif Actuel"
              value={data.currentStaff}
              caption="gestionnaires + seniors"
              accent={theme.primary}
            />
            <KpiCard
              icon="🎯"
              label="Effectif Requis"
              labelTooltip={data.requiredStaffCalculation || 'Calcul basé sur la charge actuelle'}
              value={data.requiredStaff}
              valueColor={requiredAccent}
              caption={
                staffingGap > 0
                  ? `${staffingGap} manquant${staffingGap > 1 ? 's' : ''}`
                  : staffingGap < 0
                  ? `${Math.abs(staffingGap)} en excès`
                  : 'Effectif optimal'
              }
              accent={requiredAccent}
            />
            <KpiCard
              icon="⏱"
              label="Charge Actuelle"
              labelTooltip={data.currentWorkloadCalculation || 'Bordereaux en cours de traitement'}
              value={data.currentWorkload.toLocaleString('fr-FR')}
              caption={`/ ${data.targetWorkload.toLocaleString('fr-FR')} cible`}
              captionTooltip={data.targetWorkloadCalculation || 'Capacité totale de traitement'}
              accent={workloadAccent}
              progress={data.targetWorkload > 0 ? (data.currentWorkload / data.targetWorkload) * 100 : 0}
            />
            <KpiCard
              icon="⚡"
              label="Efficacité Globale"
              value={`${data.efficiency.toFixed(1)}%`}
              accent={efficiencyAccent}
              progress={data.efficiency}
            />
          </div>

          {/* Department analysis */}
          {data.departmentAnalysis && data.departmentAnalysis.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <SectionLabel>Analyse par Département</SectionLabel>
              <div style={{ overflowX: 'auto', border: `1px solid ${theme.divider}`, borderRadius: theme.radiusMd }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: theme.surfaceSubtle }}>
                      {['Département', 'Actuel', 'Requis', 'Charge', 'Efficacité', 'Statut'].map(h => (
                        <th
                          key={h}
                          style={{
                            padding: '10px 14px',
                            textAlign: 'left',
                            fontWeight: 700,
                            color: theme.textMuted,
                            fontSize: 11,
                            textTransform: 'uppercase',
                            letterSpacing: '.04em',
                            borderBottom: `1px solid ${theme.divider}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.departmentAnalysis.map((d, i) => {
                      const s = STATUS_STYLE[d.status] ?? STATUS_STYLE.optimal;
                      return (
                        <tr
                          key={`${d.department}-${i}`}
                          style={{ background: i % 2 !== 0 ? theme.surfaceSubtle : theme.surface, borderBottom: `1px solid ${theme.divider}` }}
                        >
                          <td style={{ padding: '11px 14px', fontWeight: 700, color: theme.text }}>{d.department}</td>
                          <td style={{ padding: '11px 14px', color: theme.text }}>{d.currentStaff}</td>
                          <td style={{ padding: '11px 14px', color: theme.text }}>{d.requiredStaff}</td>
                          <td style={{ padding: '11px 14px', color: theme.text }}>{d.workload}</td>
                          <td style={{ padding: '11px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 48, height: 6, background: theme.surfaceMuted, borderRadius: 999, overflow: 'hidden', flexShrink: 0 }}>
                                <div
                                  style={{
                                    width: `${Math.min(100, Math.max(0, d.efficiency))}%`,
                                    height: '100%',
                                    borderRadius: 999,
                                    background: d.efficiency > 80 ? theme.success : d.efficiency > 60 ? theme.warning : theme.danger,
                                  }}
                                />
                              </div>
                              <span style={{ fontWeight: 700, fontSize: 11.5, color: theme.text }}>{d.efficiency.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '4px 11px',
                                borderRadius: 999,
                                fontSize: 11.5,
                                fontWeight: 700,
                                background: s.bg,
                                color: s.text,
                                border: `1px solid ${s.border}`,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {s.icon} {s.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {data.recommendations && data.recommendations.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <SectionLabel>Recommandations</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.recommendations.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 11,
                      padding: '11px 14px',
                      background: theme.infoSoft,
                      border: `1px solid ${theme.infoBorder}`,
                      borderRadius: theme.radiusMd,
                    }}
                  >
                    <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>💡</span>
                    <p style={{ margin: 0, fontSize: 12.5, color: theme.text, lineHeight: 1.5, fontWeight: 500 }}>{r}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WorkforceEstimator;

// ─── Sub-components ─────────────────────────────────────────────────────────────

const InfoTip: React.FC<{ text: string }> = ({ text }) => {
  const [open, setOpen] = useState(false);
  return (
    <span
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{ position: 'relative', display: 'inline-flex', marginLeft: 5, cursor: 'help' }}
    >
      <span
        style={{
          width: 13,
          height: 13,
          borderRadius: '50%',
          background: theme.surfaceMuted,
          color: theme.textFaint,
          fontSize: 9,
          fontWeight: 800,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid ${theme.borderStrong}`,
          fontStyle: 'italic',
          fontFamily: 'Georgia, serif',
        }}
      >
        i
      </span>
      {open && (
        <span
          style={{
            position: 'absolute',
            bottom: '135%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: theme.text,
            color: '#ffffff',
            fontSize: 11,
            fontWeight: 500,
            lineHeight: 1.4,
            padding: '8px 11px',
            borderRadius: theme.radiusSm,
            width: 190,
            boxShadow: theme.shadowMd,
            zIndex: 30,
            textAlign: 'left',
            fontFamily: theme.font,
          }}
        >
          {text}
          <span
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              borderWidth: 5,
              borderStyle: 'solid',
              borderColor: `${theme.text} transparent transparent transparent`,
            }}
          />
        </span>
      )}
    </span>
  );
};

interface KpiCardProps {
  icon: string;
  label: string;
  labelTooltip?: string;
  value: React.ReactNode;
  valueColor?: string;
  caption?: string;
  captionTooltip?: string;
  accent?: string;
  progress?: number;
}
const KpiCard: React.FC<KpiCardProps> = ({ icon, label, labelTooltip, value, valueColor, caption, captionTooltip, accent = theme.primary, progress }) => (
  <div style={{ ...cardBase, padding: '17px 18px 16px', position: 'relative', display: 'flex', flexDirection: 'column', gap: 9 }}>
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: accent,
        borderTopLeftRadius: theme.radiusLg,
        borderTopRightRadius: theme.radiusLg,
      }}
    />
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</span>
        {labelTooltip && <InfoTip text={labelTooltip} />}
      </div>
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: `${accent}17`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
    </div>
    <div style={{ fontSize: 27, fontWeight: 800, color: valueColor ?? theme.text, lineHeight: 1 }}>{value}</div>
    {caption && (
      <div style={{ display: 'flex', alignItems: 'center', fontSize: 11.5, color: theme.textFaint, fontWeight: 600 }}>
        {caption}
        {captionTooltip && <InfoTip text={captionTooltip} />}
      </div>
    )}
    {typeof progress === 'number' && (
      <div style={{ width: '100%', height: 6, background: theme.surfaceMuted, borderRadius: 999, overflow: 'hidden', marginTop: 2 }}>
        <div
          style={{
            width: `${Math.min(100, Math.max(0, progress))}%`,
            height: '100%',
            background: accent,
            borderRadius: 999,
            transition: 'width .4s ease',
          }}
        />
      </div>
    )}
  </div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4
    style={{
      margin: '0 0 12px',
      fontSize: 12.5,
      fontWeight: 800,
      color: theme.text,
      textTransform: 'uppercase',
      letterSpacing: '.04em',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontFamily: theme.font,
    }}
  >
    <span style={{ width: 3, height: 14, background: theme.primary, borderRadius: 2, display: 'inline-block' }} />
    {children}
  </h4>
);

const SpinnerBlock: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 20px', gap: 14 }}>
    <div style={{ position: 'relative', width: 40, height: 40 }}>
      <div style={{ position: 'absolute', inset: 0, border: `3px solid ${theme.surfaceMuted}`, borderRadius: '50%' }} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: '3px solid transparent',
          borderTopColor: theme.primary,
          borderRightColor: theme.primary,
          borderRadius: '50%',
          animation: 'wfe-spin .7s cubic-bezier(.5,0,.5,1) infinite',
        }}
      />
    </div>
    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: theme.textMuted, fontFamily: theme.font }}>Chargement des données…</p>
  </div>
);

const EmptyBlock: React.FC = () => (
  <div style={{ textAlign: 'center', padding: '44px 20px' }}>
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: '50%',
        background: theme.infoSoft,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22,
        margin: '0 auto 14px',
      }}
    >
      📊
    </div>
    <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: theme.text, fontFamily: theme.font }}>Aucune donnée disponible</p>
    <p style={{ margin: '0 auto', fontSize: 12.5, color: theme.textFaint, maxWidth: 320, fontFamily: theme.font }}>
      Veuillez ajouter des utilisateurs et des données de charge de travail pour générer l'estimation.
    </p>
  </div>
);