import { useEffect, useState } from "react";
import { message } from 'antd';
import { fetchUserBordereaux } from "../../services/bordereauxService";
import { useAuth } from '../../contexts/AuthContext';
import { LocalAPI } from '../../services/axios';
import "../../styles/gestionnaire.css";
import "../../styles/chef-equipe.css";

// ────────────────────────────────────────────────────────────────────────────
// "Registre" design tokens — inline CSS overrides applied throughout.
// Logic, state, handlers, effects, and component structure are unchanged.
// Existing classNames (gestionnaire-*, chef-equipe-*) are kept as-is (they may
// carry non-visual behavior from the external stylesheets); inline `style`
// props are layered on top to enforce the Registre look consistently.
// ────────────────────────────────────────────────────────────────────────────
const T = {
  ink900: '#0F1B2D',
  ink700: '#24344A',
  ink500: '#5B6B82',
  ink300: '#9AA7B8',
  line: '#E2E6EC',
  surface: '#FFFFFF',
  canvas: '#F3F5F9',
  brand: '#A82A2E',
  brandDark: '#7E1F22',
  ok: '#1E8E5A',
  okBg: '#E7F5EE',
  warn: '#B4740E',
  warnBg: '#FBF1DF',
  danger: '#B3272D',
  dangerBg: '#FBEAEA',
  info: '#2A5DA8',
  infoBg: '#E9F0FA',
  purple: '#6E4A9E',
  purpleBg: '#F1ECF9',
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'IBM Plex Mono', SFMono-Regular, Consolas, monospace",
};

const panelStyle: React.CSSProperties = {
  background: T.surface,
  borderRadius: 10,
  border: `1px solid ${T.line}`,
};

const thStyle: React.CSSProperties = {
  padding: '11px 10px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  color: T.ink500,
  fontFamily: T.sans,
};

const tdStyle: React.CSSProperties = {
  padding: '11px 10px',
  fontSize: 13,
  fontFamily: T.sans,
  color: T.ink900,
};

const refCellStyle: React.CSSProperties = {
  ...tdStyle,
  fontFamily: T.mono,
  fontWeight: 600,
  color: T.info,
};

function pillStyle(bg: string, fg: string): React.CSSProperties {
  return {
    background: bg,
    color: fg,
    padding: '4px 9px',
    borderRadius: 20,
    fontSize: 11.5,
    fontWeight: 700,
    fontFamily: T.sans,
    display: 'inline-block',
  };
}

function GestionnaireBordereaux() {
  const { user } = useAuth();
  const [userBordereaux, setUserBordereaux] = useState<any[]>([]);
  const userId = user?.id || '';
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'all' | 'a-traiter' | 'traites' | 'retournes'>('all');
  const [modalData, setModalData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'en-cours' | 'traites'>('en-cours');

  const handleProcessBordereau = async (bordereauId: string) => {
    const loadingMessage = message.loading('Traitement en cours...', 0);
    try {
      const response = await LocalAPI.post('/workflow/gestionnaire/process', { bordereauId, action: 'TRAITE' });
      loadingMessage();
      message.success(response.data.message || 'Bordereau traité avec succès');
      if (userId) fetchUserBordereaux(userId).then(setUserBordereaux);
    } catch (error: any) {
      loadingMessage();
      message.error(error.response?.data?.message || 'Erreur de connexion');
    }
  };

  const handleReturnToChef = async (bordereauId: string) => {
    const reason = prompt('Raison du retour au chef d\'équipe:');
    if (!reason) return;
    const loadingMessage = message.loading('Retour en cours...', 0);
    try {
      const response = await LocalAPI.post('/workflow/gestionnaire/process', { bordereauId, action: 'RETOURNE_CHEF', reason });
      loadingMessage();
      message.success(response.data.message || 'Dossier retourné au chef');
      if (userId) fetchUserBordereaux(userId).then(setUserBordereaux);
    } catch (error: any) {
      loadingMessage();
      message.error(error.response?.data?.message || 'Erreur de connexion');
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserBordereaux(userId).then(data => setUserBordereaux(data || [])).catch(() => setUserBordereaux([]));
    }
  }, [userId]);

  const getDureeTraitement = (bordereau: any): { days: number | null; isOnTime: boolean } => {
    if (bordereau.dureeTraitement === null || bordereau.dureeTraitement === undefined) {
      return { days: null, isOnTime: true };
    }
    return {
      days: bordereau.dureeTraitement,
      isOnTime: bordereau.dureeTraitementStatus === 'GREEN'
    };
  };

  const getDureeReglement = (bordereau: any): { days: number | null; isOnTime: boolean } => {
    if (bordereau.dureeReglement === null || bordereau.dureeReglement === undefined) {
      return { days: null, isOnTime: true };
    }
    return {
      days: bordereau.dureeReglement,
      isOnTime: bordereau.dureeReglementStatus === 'GREEN'
    };
  };

  const getTabData = () => {
    switch (activeTab) {
      case 'en-cours':
        return userBordereaux.filter(b => !['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut));
      case 'traites':
        return userBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut));
      default:
        return [];
    }
  };

  const tabData = getTabData();

  return (
    <div className="gestionnaire-container" style={{ fontFamily: T.sans, background: T.canvas, minHeight: '100vh', padding: '24px 20px 60px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div className="gestionnaire-header" style={{ ...panelStyle, padding: '22px', marginBottom: '20px', borderTop: `3px solid ${T.brand}` }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <div className="gestionnaire-icon" style={{
              background: `linear-gradient(135deg, ${T.ink900} 0%, #16263D 100%)`,
              color: 'white',
              width: 56,
              height: 56,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              marginRight: 18
            }}>📋</div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: T.ink900, margin: '0 0 4px 0', fontFamily: T.sans }}>Mes Bordereaux</h1>
              <p style={{ color: T.ink500, fontSize: 14, margin: 0, fontFamily: T.sans }}>Interface personnalisée pour gestionnaire</p>
            </div>
          </div>
          <div className="gestionnaire-warning" style={{ background: T.warnBg, borderRadius: 8, padding: '14px 18px', border: `1px solid ${T.warn}22` }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 22, marginRight: 16 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 700, color: T.warn, fontSize: 14, marginBottom: '2px', fontFamily: T.sans }}>Accès Gestionnaire</div>
                <div style={{ color: T.ink700, fontSize: 13, lineHeight: 1.4, fontFamily: T.sans }}>Vous ne voyez que les bordereaux qui vous sont personnellement assignés</div>
              </div>
            </div>
          </div>
        </div>

        {userBordereaux.length === 0 ? (
          <div className="gestionnaire-empty" style={{ ...panelStyle, padding: '48px 24px', textAlign: 'center' }}>
            <div className="gestionnaire-empty-icon" style={{ fontSize: 40, color: T.ink300, marginBottom: '16px' }}>📋</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: T.ink700, marginBottom: '10px', fontFamily: T.sans }}>Aucun bordereau assigné</h3>
            <p style={{ color: T.ink500, fontSize: 14, marginBottom: '28px', lineHeight: 1.5, fontFamily: T.sans }}>Vous n'avez actuellement aucun bordereau à traiter.</p>
            <div className="gestionnaire-info-box" style={{ background: T.infoBg, borderRadius: 8, padding: '20px', border: `1px solid ${T.info}22` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: 24, marginRight: 12 }}>👨‍💼</span>
                <span style={{ color: T.info, fontWeight: 700, fontSize: 15, fontFamily: T.sans }}>Information</span>
              </div>
              <p style={{ color: T.ink700, fontSize: 13, lineHeight: 1.6, margin: 0, fontFamily: T.sans }}>
                Les bordereaux vous seront assignés par votre chef d'équipe selon la charge de travail et vos compétences.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="gestionnaire-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div
                className="gestionnaire-stat-card"
                onClick={() => { setModalType('all'); setModalData(userBordereaux); setShowModal(true); }}
                style={{ ...panelStyle, padding: '18px', borderTop: `3px solid ${T.brand}`, cursor: 'pointer', transition: 'transform 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ background: T.ink900, padding: '14px', borderRadius: '50%', marginRight: 16, display: 'flex' }}>
                    <span style={{ fontSize: 22 }}>📊</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: T.ink900, marginBottom: '2px', fontFamily: T.mono }}>{userBordereaux.length}</div>
                    <div style={{ fontSize: 13, color: T.ink700, fontWeight: 600, fontFamily: T.sans }}>Total assignés</div>
                    <div style={{ fontSize: 11, color: T.ink300, marginTop: '2px', fontFamily: T.sans }}>Cliquer pour voir</div>
                  </div>
                </div>
              </div>
              <div
                className="gestionnaire-stat-card"
                onClick={() => { setModalType('a-traiter'); setModalData(userBordereaux.filter((b: any) => ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE', 'A_AFFECTER', 'EN_COURS', 'ASSIGNE'].includes(b.statut))); setShowModal(true); }}
                style={{ ...panelStyle, padding: '18px', borderTop: `3px solid ${T.warn}`, cursor: 'pointer', transition: 'transform 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ background: T.warnBg, padding: '14px', borderRadius: '50%', marginRight: 16, display: 'flex' }}>
                    <span style={{ fontSize: 22 }}>⏳</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: T.warn, marginBottom: '2px', fontFamily: T.mono }}>{userBordereaux.filter((b: any) => ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE', 'A_AFFECTER', 'EN_COURS', 'ASSIGNE'].includes(b.statut)).length}</div>
                    <div style={{ fontSize: 13, color: T.ink700, fontWeight: 600, fontFamily: T.sans }}>En cours</div>
                    <div style={{ fontSize: 11, color: T.ink300, marginTop: '2px', fontFamily: T.sans }}>Cliquer pour voir</div>
                  </div>
                </div>
              </div>
              <div
                className="gestionnaire-stat-card"
                onClick={() => { setModalType('traites'); setModalData(userBordereaux.filter((b: any) => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut))); setShowModal(true); }}
                style={{ ...panelStyle, padding: '18px', borderTop: `3px solid ${T.ok}`, cursor: 'pointer', transition: 'transform 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ background: T.okBg, padding: '14px', borderRadius: '50%', marginRight: 16, display: 'flex' }}>
                    <span style={{ fontSize: 22 }}>✅</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: T.ok, marginBottom: '2px', fontFamily: T.mono }}>{userBordereaux.filter((b: any) => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length}</div>
                    <div style={{ fontSize: 13, color: T.ink700, fontWeight: 600, fontFamily: T.sans }}>Traités</div>
                    <div style={{ fontSize: 11, color: T.ink300, marginTop: '2px', fontFamily: T.sans }}>Cliquer pour voir</div>
                  </div>
                </div>
              </div>
              {/* RETOURNES BOX - COMMENTED OUT */}
              {false && (
              <div
                className="gestionnaire-stat-card"
                onClick={() => { setModalType('retournes'); setModalData(userBordereaux.filter((b: any) => b.statut === 'REJETE' || b.statut === 'RETOURNE')); setShowModal(true); }}
                style={{ ...panelStyle, padding: '18px', borderTop: `3px solid ${T.danger}`, cursor: 'pointer', transition: 'transform 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ background: T.dangerBg, padding: '14px', borderRadius: '50%', marginRight: 16, display: 'flex' }}>
                    <span style={{ fontSize: 22 }}>⚠️</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: T.danger, marginBottom: '2px', fontFamily: T.mono }}>{userBordereaux.filter((b: any) => b.statut === 'REJETE' || b.statut === 'RETOURNE').length}</div>
                    <div style={{ fontSize: 13, color: T.ink700, fontWeight: 600, fontFamily: T.sans }}>Retournés</div>
                    <div style={{ fontSize: 11, color: T.ink300, marginTop: '2px', fontFamily: T.sans }}>Cliquer pour voir</div>
                  </div>
                </div>
              </div>
              )}
            </div>

            {/* Tabs */}
            <div style={{ ...panelStyle, overflow: 'hidden', marginBottom: '20px' }}>
              <div className="chef-equipe-tabs" style={{ display: 'flex', borderBottom: `1px solid ${T.line}`, background: T.canvas }}>
                <button
                  className={`chef-equipe-tab ${activeTab === 'en-cours' ? 'active' : ''}`}
                  onClick={() => setActiveTab('en-cours')}
                  style={{
                    flex: 1,
                    padding: '14px',
                    border: 'none',
                    background: activeTab === 'en-cours' ? T.surface : 'transparent',
                    borderBottom: activeTab === 'en-cours' ? `3px solid ${T.brand}` : '3px solid transparent',
                    color: activeTab === 'en-cours' ? T.brand : T.ink500,
                    fontWeight: 700,
                    fontSize: 13,
                    fontFamily: T.sans,
                    cursor: 'pointer'
                  }}
                >
                  En cours ({userBordereaux.filter(b => !['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length})
                </button>
                <button
                  className={`chef-equipe-tab ${activeTab === 'traites' ? 'active' : ''}`}
                  onClick={() => setActiveTab('traites')}
                  style={{
                    flex: 1,
                    padding: '14px',
                    border: 'none',
                    background: activeTab === 'traites' ? T.surface : 'transparent',
                    borderBottom: activeTab === 'traites' ? `3px solid ${T.brand}` : '3px solid transparent',
                    color: activeTab === 'traites' ? T.brand : T.ink500,
                    fontWeight: 700,
                    fontSize: 13,
                    fontFamily: T.sans,
                    cursor: 'pointer'
                  }}
                >
                  Traités ({userBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length})
                </button>
              </div>

              {tabData.length === 0 ? (
                <div className="chef-equipe-empty" style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <div className="chef-equipe-empty-icon" style={{ fontSize: 36, color: T.ink300, marginBottom: '14px' }}>📋</div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: T.ink700, marginBottom: '8px', fontFamily: T.sans }}>
                    Aucun dossier {activeTab === 'en-cours' ? 'en cours' : 'traité'}
                  </h3>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: T.canvas }}>
                        <th style={thStyle}>Client / Prestataire</th>
                        <th style={thStyle}>Référence Bordereau</th>
                        <th style={thStyle}>Date réception BO</th>
                        <th style={thStyle}>Bulletin de soins</th>
                        <th style={thStyle}>Date fin de Scannérisation</th>
                        <th style={thStyle}>Délais contractuels de règlement</th>
                        <th style={thStyle}>Durée de traitement</th>
                        <th style={thStyle}>Durée de règlement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tabData.map((bordereau, index) => {
                        const dt = getDureeTraitement(bordereau);
                        const dr = getDureeReglement(bordereau);
                        return (
                          <tr key={bordereau.id} style={{ background: index % 2 === 0 ? T.surface : '#FAFBFD', borderBottom: `1px solid ${T.line}` }}>
                            <td style={tdStyle}>{bordereau.client?.name || 'N/A'}</td>
                            <td style={refCellStyle}>{bordereau.reference}</td>
                            <td style={{ ...tdStyle, fontFamily: T.mono }}>{bordereau.dateReception ? new Date(bordereau.dateReception).toLocaleDateString('fr-FR') : '-'}</td>
                            <td style={tdStyle}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={pillStyle(T.infoBg, T.info)}>{bordereau.nombreBS || 0} BS</span>
                                {bordereau.BulletinSoin && bordereau.BulletinSoin.length > 0 && (
                                  <span style={{ fontSize: 12, color: T.ink500, fontFamily: T.sans }}>({bordereau.BulletinSoin.filter((bs: any) => bs.etat === 'VALIDATED').length} traités)</span>
                                )}
                              </div>
                            </td>
                            <td style={{ ...tdStyle, fontFamily: T.mono }}>{bordereau.dateFinScan ? new Date(bordereau.dateFinScan).toLocaleDateString('fr-FR') : '-'}</td>
                            <td style={tdStyle}>
                              <span style={pillStyle(T.warnBg, T.warn)}>{bordereau.delaiReglement || 0} jours</span>
                            </td>
                            <td style={tdStyle}>
                              {dt.days === null || dt.days === undefined
                                ? <span style={{ color: T.ink300, fontSize: 12, fontFamily: T.sans }}>En cours</span>
                                : <span style={pillStyle(dt.isOnTime ? T.okBg : T.dangerBg, dt.isOnTime ? T.ok : T.danger)}>{dt.days} jour{dt.days !== 1 ? 's' : ''}</span>
                              }
                            </td>
                            <td style={tdStyle}>
                              {bordereau.statut === 'VIREMENT_EXECUTE' || bordereau.statut === 'CLOTURE' || bordereau.statut === 'PAYE'
                                ? <span style={{ color: T.ok, fontSize: 12, fontWeight: 700, fontFamily: T.sans }}>✓ Réglé ({dr.days || 0}j)</span>
                                : dr.days === null || dr.days === undefined
                                  ? <span style={{ color: T.ink300, fontSize: 12, fontFamily: T.sans }}>En attente</span>
                                  : <span style={pillStyle(dr.isOnTime ? T.okBg : T.dangerBg, dr.isOnTime ? T.ok : T.danger)}>{dr.days} jour{dr.days !== 1 ? 's' : ''}</span>
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        <div className="gestionnaire-performance" style={{ ...panelStyle, padding: '22px' }}>
          <div className="gestionnaire-perf-header" style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <div className="gestionnaire-perf-icon" style={{
              background: `linear-gradient(135deg, ${T.ink900} 0%, #16263D 100%)`,
              color: 'white',
              width: 48,
              height: 48,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              marginRight: 16
            }}>📈</div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: T.ink900, margin: '0 0 4px 0', fontFamily: T.sans }}>Ma Performance Personnelle</h2>
              <p style={{ color: T.ink500, fontSize: 13, margin: 0, fontFamily: T.sans }}>Statistiques de votre activité</p>
            </div>
          </div>
          <div className="gestionnaire-perf-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="gestionnaire-perf-card green" style={{ background: T.okBg, borderRadius: 8, padding: '18px', border: `1px solid ${T.ok}22` }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: T.ok, marginBottom: '8px', fontFamily: T.mono }}>{userBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length}</div>
              <div style={{ fontSize: 13, color: T.ok, fontWeight: 700, fontFamily: T.sans }}>Total traités</div>
            </div>
            <div className="gestionnaire-perf-card red" style={{ background: T.dangerBg, borderRadius: 8, padding: '18px', border: `1px solid ${T.danger}22` }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: T.danger, marginBottom: '8px', fontFamily: T.mono }}>{userBordereaux.filter(b => b.statut === 'EN_DIFFICULTE').length}</div>
              <div style={{ fontSize: 13, color: T.danger, fontWeight: 700, fontFamily: T.sans }}>En difficulté</div>
            </div>
            <div className="gestionnaire-perf-card blue" style={{ background: T.infoBg, borderRadius: 8, padding: '18px', border: `1px solid ${T.info}22` }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: T.info, marginBottom: '8px', fontFamily: T.mono }}>{userBordereaux.filter(b => ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE', 'A_AFFECTER', 'EN_COURS', 'ASSIGNE'].includes(b.statut)).length}</div>
              <div style={{ fontSize: 13, color: T.info, fontWeight: 700, fontFamily: T.sans }}>En cours</div>
            </div>
            <div className="gestionnaire-perf-card purple" style={{ background: T.purpleBg, borderRadius: 8, padding: '18px', border: `1px solid ${T.purple}22` }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: T.purple, marginBottom: '8px', fontFamily: T.mono }}>{userBordereaux.length > 0 ? Math.round((userBordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length / userBordereaux.length) * 100) : 0}%</div>
              <div style={{ fontSize: 13, color: T.purple, fontWeight: 700, fontFamily: T.sans }}>Taux de réussite</div>
            </div>
          </div>
        </div>

        {showModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,27,45,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: T.surface, borderRadius: 10, width: '90%', maxWidth: '1200px', maxHeight: '80vh', overflow: 'hidden', boxShadow: '0 8px 24px rgba(15,27,45,0.16)' }}>
              <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: T.canvas }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: T.ink900, margin: 0, fontFamily: T.sans }}>
                    {modalType === 'all' ? '📊 Tous les Bordereaux' : modalType === 'a-traiter' ? '⏳ Bordereaux En Cours' : modalType === 'traites' ? '✅ Bordereaux Traités' : '⚠️ Bordereaux Retournés'}
                  </h2>
                  <p style={{ color: T.ink500, fontSize: 12.5, margin: '4px 0 0 0', fontFamily: T.sans }}>{modalData.length} bordereau(x)</p>
                </div>
                <button onClick={() => setShowModal(false)} style={{ background: T.danger, color: 'white', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: T.sans }}>Fermer</button>
              </div>
              <div style={{ padding: '20px', maxHeight: '60vh', overflow: 'auto' }}>
                {modalData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: 40, marginBottom: '16px', color: T.ink300 }}>{modalType === 'all' ? '📊' : modalType === 'a-traiter' ? '⏳' : modalType === 'traites' ? '✅' : '⚠️'}</div>
                    <h3 style={{ fontSize: 16, color: T.ink500, fontFamily: T.sans }}>Aucun bordereau</h3>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: T.canvas, borderBottom: `2px solid ${T.line}` }}>
                        <th style={thStyle}>Client</th>
                        <th style={thStyle}>Référence</th>
                        <th style={thStyle}>Date Réception</th>
                        <th style={thStyle}>Documents</th>
                        <th style={thStyle}>Date Scan</th>
                        <th style={thStyle}>Délai</th>
                        <th style={thStyle}>Durée Traitement</th>
                        <th style={thStyle}>Durée Règlement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalData.map((b, i) => {
                        const dt = getDureeTraitement(b);
                        const dr = getDureeReglement(b);
                        return (
                          <tr key={b.id} style={{ borderBottom: `1px solid ${T.line}`, backgroundColor: i % 2 === 0 ? T.surface : '#FAFBFD' }}>
                            <td style={tdStyle}>{b.client?.name || 'N/A'}</td>
                            <td style={refCellStyle}>{b.reference}</td>
                            <td style={{ ...tdStyle, fontFamily: T.mono }}>{b.dateReception ? new Date(b.dateReception).toLocaleDateString('fr-FR') : '-'}</td>
                            <td style={tdStyle}><span style={pillStyle(T.infoBg, T.info)}>{b.nombreBS || 0} documents</span></td>
                            <td style={{ ...tdStyle, fontFamily: T.mono }}>{b.dateFinScan ? new Date(b.dateFinScan).toLocaleDateString('fr-FR') : '-'}</td>
                            <td style={tdStyle}><span style={pillStyle(T.warnBg, T.warn)}>{b.delaiReglement || 0}j</span></td>
                            <td style={tdStyle}>{dt.days === null ? <span style={{ color: T.ink300, fontSize: 12, fontFamily: T.sans }}>En cours</span> : <span style={pillStyle(dt.isOnTime ? T.okBg : T.dangerBg, dt.isOnTime ? T.ok : T.danger)}>{dt.days}j</span>}</td>
                            <td style={tdStyle}>{b.statut === 'VIREMENT_EXECUTE' || b.statut === 'CLOTURE' || b.statut === 'PAYE' ? <span style={{ color: T.ok, fontSize: 12, fontWeight: 700, fontFamily: T.sans }}>✓ Réglé ({dr.days || 0}j)</span> : dr.days === null ? <span style={{ color: T.ink300, fontSize: 12, fontFamily: T.sans }}>En attente</span> : <span style={pillStyle(dr.isOnTime ? T.okBg : T.dangerBg, dr.isOnTime ? T.ok : T.danger)}>{dr.days}j</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GestionnaireBordereaux;