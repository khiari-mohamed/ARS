import { useEffect, useState } from "react";
import { message } from 'antd';
import { fetchUserBordereaux } from "../../services/bordereauxService";
import { useAuth } from '../../contexts/AuthContext';
import { LocalAPI } from '../../services/axios';
import "../../styles/gestionnaire.css";

function GestionnaireBordereaux() {
  const { user } = useAuth();
  const [userBordereaux, setUserBordereaux] = useState<any[]>([]);
  const userId = user?.id || '';
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'all' | 'a-traiter' | 'traites' | 'retournes'>('all');
  const [modalData, setModalData] = useState<any[]>([]);

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

  return (
    <div className="gestionnaire-container">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div className="gestionnaire-header">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <div className="gestionnaire-icon">📋</div>
            <div>
              <h1 style={{ fontSize: '42px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Mes Bordereaux</h1>
              <p style={{ color: '#666', fontSize: '18px', margin: 0, fontWeight: '500' }}>Interface personnalisée pour gestionnaire</p>
            </div>
          </div>
          <div className="gestionnaire-warning">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '28px', marginRight: '20px' }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 'bold', color: '#f57c00', fontSize: '18px', marginBottom: '4px' }}>Accès Gestionnaire</div>
                <div style={{ color: '#ef6c00', fontSize: '15px', lineHeight: '1.4' }}>Vous ne voyez que les bordereaux qui vous sont personnellement assignés</div>
              </div>
            </div>
          </div>
        </div>

        {userBordereaux.length === 0 ? (
          <div className="gestionnaire-empty">
            <div className="gestionnaire-empty-icon">📋</div>
            <h3 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '16px', letterSpacing: '-0.5px' }}>Aucun bordereau assigné</h3>
            <p style={{ color: '#666', fontSize: '20px', marginBottom: '40px', lineHeight: '1.5' }}>Vous n'avez actuellement aucun bordereau à traiter.</p>
            <div className="gestionnaire-info-box">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '32px', marginRight: '16px' }}>👨💼</span>
                <span style={{ color: '#1976d2', fontWeight: 'bold', fontSize: '22px' }}>Information</span>
              </div>
              <p style={{ color: '#1565c0', fontSize: '17px', lineHeight: '1.6', margin: 0, fontWeight: '500' }}>
                Les bordereaux vous seront assignés par votre chef d'équipe selon la charge de travail et vos compétences.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="gestionnaire-stats">
              <div className="gestionnaire-stat-card" onClick={() => { setModalType('all'); setModalData(userBordereaux); setShowModal(true); }} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', padding: '20px', borderRadius: '50%', marginRight: '20px', boxShadow: '0 8px 20px rgba(33, 150, 243, 0.2)' }}>
                    <span style={{ fontSize: '32px' }}>📊</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#2196f3', marginBottom: '4px' }}>{userBordereaux.length}</div>
                    <div style={{ fontSize: '16px', color: '#666', fontWeight: '600' }}>Total assignés</div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Cliquer pour voir</div>
                  </div>
                </div>
              </div>
              <div className="gestionnaire-stat-card" onClick={() => { setModalType('a-traiter'); setModalData(userBordereaux.filter((b: any) => ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE', 'A_AFFECTER', 'EN_COURS', 'ASSIGNE'].includes(b.statut))); setShowModal(true); }} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ background: 'linear-gradient(135deg, #fff3e0 0%, #ffcc02 100%)', padding: '20px', borderRadius: '50%', marginRight: '20px', boxShadow: '0 8px 20px rgba(255, 152, 0, 0.2)' }}>
                    <span style={{ fontSize: '32px' }}>⏳</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#ff9800', marginBottom: '4px' }}>{userBordereaux.filter((b: any) => ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE', 'A_AFFECTER', 'EN_COURS', 'ASSIGNE'].includes(b.statut)).length}</div>
                    <div style={{ fontSize: '16px', color: '#666', fontWeight: '600' }}>En cours</div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Cliquer pour voir</div>
                  </div>
                </div>
              </div>
              <div className="gestionnaire-stat-card" onClick={() => { setModalType('traites'); setModalData(userBordereaux.filter((b: any) => ['TRAITE', 'CLOTURE'].includes(b.statut))); setShowModal(true); }} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ background: 'linear-gradient(135deg, #e8f5e8 0%, #4caf50 100%)', padding: '20px', borderRadius: '50%', marginRight: '20px', boxShadow: '0 8px 20px rgba(76, 175, 80, 0.2)' }}>
                    <span style={{ fontSize: '32px' }}>✅</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#4caf50', marginBottom: '4px' }}>{userBordereaux.filter((b: any) => ['TRAITE', 'CLOTURE'].includes(b.statut)).length}</div>
                    <div style={{ fontSize: '16px', color: '#666', fontWeight: '600' }}>Traités</div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Cliquer pour voir</div>
                  </div>
                </div>
              </div>
              {/* RETOURNES BOX - COMMENTED OUT */}
              {false && (
              <div className="gestionnaire-stat-card" onClick={() => { setModalType('retournes'); setModalData(userBordereaux.filter((b: any) => b.statut === 'REJETE' || b.statut === 'RETOURNE')); setShowModal(true); }} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ background: 'linear-gradient(135deg, #ffebee 0%, #f44336 100%)', padding: '20px', borderRadius: '50%', marginRight: '20px', boxShadow: '0 8px 20px rgba(244, 67, 54, 0.2)' }}>
                    <span style={{ fontSize: '32px' }}>⚠️</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#f44336', marginBottom: '4px' }}>{userBordereaux.filter((b: any) => b.statut === 'REJETE' || b.statut === 'RETOURNE').length}</div>
                    <div style={{ fontSize: '16px', color: '#666', fontWeight: '600' }}>Retournés</div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Cliquer pour voir</div>
                  </div>
                </div>
              </div>
              )}
            </div>
          </>
        )}

        <div className="gestionnaire-performance">
          <div className="gestionnaire-perf-header">
            <div className="gestionnaire-perf-icon">📈</div>
            <div>
              <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Ma Performance Personnelle</h2>
              <p style={{ color: '#666', fontSize: '18px', margin: 0, fontWeight: '500' }}>Statistiques de votre activité</p>
            </div>
          </div>
          <div className="gestionnaire-perf-grid">
            <div className="gestionnaire-perf-card green">
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#2e7d32', marginBottom: '12px' }}>{userBordereaux.filter(b => ['TRAITE', 'CLOTURE'].includes(b.statut)).length}</div>
              <div style={{ fontSize: '16px', color: '#2e7d32', fontWeight: 'bold' }}>Total traités</div>
            </div>
            <div className="gestionnaire-perf-card red">
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#c62828', marginBottom: '12px' }}>{userBordereaux.filter(b => b.statut === 'EN_DIFFICULTE').length}</div>
              <div style={{ fontSize: '16px', color: '#c62828', fontWeight: 'bold' }}>En difficulté</div>
            </div>
            <div className="gestionnaire-perf-card blue">
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#1565c0', marginBottom: '12px' }}>{userBordereaux.filter(b => ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE', 'A_AFFECTER', 'EN_COURS', 'ASSIGNE'].includes(b.statut)).length}</div>
              <div style={{ fontSize: '16px', color: '#1565c0', fontWeight: 'bold' }}>En cours</div>
            </div>
            <div className="gestionnaire-perf-card purple">
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#6a1b9a', marginBottom: '12px' }}>{userBordereaux.length > 0 ? Math.round((userBordereaux.filter(b => ['TRAITE', 'CLOTURE'].includes(b.statut)).length / userBordereaux.length) * 100) : 0}%</div>
              <div style={{ fontSize: '16px', color: '#6a1b9a', fontWeight: 'bold' }}>Taux de réussite</div>
            </div>
          </div>
        </div>

        {showModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '90%', maxWidth: '1200px', maxHeight: '80vh', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a', margin: 0 }}>
                    {modalType === 'all' ? '📊 Tous les Bordereaux' : modalType === 'a-traiter' ? '⏳ Bordereaux En Cours' : modalType === 'traites' ? '✅ Bordereaux Traités' : '⚠️ Bordereaux Retournés'}
                  </h2>
                  <p style={{ color: '#666', fontSize: '14px', margin: '4px 0 0 0' }}>{modalData.length} bordereau(x)</p>
                </div>
                <button onClick={() => setShowModal(false)} style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>Fermer</button>
              </div>
              <div style={{ padding: '20px', maxHeight: '60vh', overflow: 'auto' }}>
                {modalData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>{modalType === 'all' ? '📊' : modalType === 'a-traiter' ? '⏳' : modalType === 'traites' ? '✅' : '⚠️'}</div>
                    <h3 style={{ fontSize: '20px', color: '#666' }}>Aucun bordereau</h3>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d' }}>Client</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d' }}>Référence</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d' }}>Date Réception</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d' }}>Documents</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d' }}>Date Scan</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d' }}>Délai</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d' }}>Durée Traitement</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d' }}>Durée Règlement</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalData.map((b, i) => {
                        const getDT = (bd: any) => bd.dureeTraitement === null ? { days: null, isOnTime: true } : { days: bd.dureeTraitement, isOnTime: bd.dureeTraitementStatus === 'GREEN' };
                        const getDR = (bd: any) => bd.dureeReglement === null ? { days: null, isOnTime: true } : { days: bd.dureeReglement, isOnTime: bd.dureeReglementStatus === 'GREEN' };
                        const dt = getDT(b); const dr = getDR(b);
                        return (
                          <tr key={b.id} style={{ borderBottom: '1px solid #f0f0f0', backgroundColor: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                            <td style={{ padding: '12px 8px', fontSize: '14px' }}>{b.client?.name || 'N/A'}</td>
                            <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: 'bold', color: '#0066cc' }}>{b.reference}</td>
                            <td style={{ padding: '12px 8px', fontSize: '14px' }}>{b.dateReception ? new Date(b.dateReception).toLocaleDateString('fr-FR') : '-'}</td>
                            <td style={{ padding: '12px 8px', fontSize: '14px' }}><span style={{ background: '#e3f2fd', color: '#1976d2', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{b.nombreBS || 0} documents</span></td>
                            <td style={{ padding: '12px 8px', fontSize: '14px' }}>{b.dateFinScan ? new Date(b.dateFinScan).toLocaleDateString('fr-FR') : '-'}</td>
                            <td style={{ padding: '12px 8px', fontSize: '14px' }}><span style={{ background: '#fff3e0', color: '#f57c00', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{b.delaiReglement || 0}j</span></td>
                            <td style={{ padding: '12px 8px', fontSize: '14px' }}>{dt.days === null ? <span style={{ color: '#999', fontSize: '12px' }}>En cours</span> : <span style={{ background: dt.isOnTime ? '#e8f5e9' : '#ffebee', color: dt.isOnTime ? '#2e7d32' : '#c62828', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{dt.days}j</span>}</td>
                            <td style={{ padding: '12px 8px', fontSize: '14px' }}>{dr.days === null ? <span style={{ color: '#999', fontSize: '12px' }}>En attente</span> : <span style={{ background: dr.isOnTime ? '#e8f5e9' : '#ffebee', color: dr.isOnTime ? '#2e7d32' : '#c62828', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{dr.days}j</span>}</td>
                            <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                              {['EN_COURS', 'ASSIGNE'].includes(b.statut) && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <span style={{ background: '#e8f5e9', color: '#2e7d32', border: '1px solid #4caf50', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>✓ Traiter</span>
                                  <span style={{ background: '#fff3e0', color: '#e65100', border: '1px solid #ff9800', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>↩ Retour</span>
                                </div>
                              )}
                              {['TRAITE', 'CLOTURE'].includes(b.statut) && <span style={{ fontSize: '12px', color: '#4caf50', fontWeight: 'bold' }}>✓ Complété</span>}
                            </td>
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
