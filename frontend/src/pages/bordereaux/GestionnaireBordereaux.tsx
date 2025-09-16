import { useEffect, useState } from "react";
import { message } from 'antd';
import { fetchUserBordereaux } from "../../services/bordereauxService";
import BordereauCard from "../../components/BordereauCard";
import { useAuth } from '../../contexts/AuthContext';
import "../../styles/gestionnaire.css";

function GestionnaireBordereaux() {
  const { user } = useAuth();
  const [userBordereaux, setUserBordereaux] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const userId = user?.id || '';

  // Pagination calculations
  const totalItems = userBordereaux.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = userBordereaux.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleProcessBordereau = async (bordereauId: string) => {
    const loadingMessage = message.loading('Traitement en cours...', 0);
    
    try {
      const response = await fetch('/api/workflow/gestionnaire/process', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          bordereauId, 
          action: 'TRAITE'
        })
      });
      
      loadingMessage();
      
      if (response.ok) {
        const result = await response.json();
        message.success(result.message || 'Bordereau traité avec succès');
        // Refresh data
        if (userId) {
          fetchUserBordereaux(userId).then(setUserBordereaux);
        }
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Erreur lors du traitement');
      }
    } catch (error) {
      loadingMessage();
      console.error('Process bordereau failed:', error);
      message.error('Erreur de connexion');
    }
  };

  const handleReturnToChef = async (bordereauId: string) => {
    const reason = prompt('Raison du retour au chef d\'équipe:');
    if (!reason) return;
    
    const loadingMessage = message.loading('Retour en cours...', 0);
    
    try {
      const response = await fetch('/api/workflow/gestionnaire/process', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          bordereauId, 
          action: 'RETOURNE_CHEF',
          reason 
        })
      });
      
      loadingMessage();
      
      if (response.ok) {
        const result = await response.json();
        message.success(result.message || 'Dossier retourné au chef');
        // Refresh data
        if (userId) {
          fetchUserBordereaux(userId).then(setUserBordereaux);
        }
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Erreur lors du retour');
      }
    } catch (error) {
      loadingMessage();
      console.error('Return to chef failed:', error);
      message.error('Erreur de connexion');
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserBordereaux(userId).then(setUserBordereaux);
    }
  }, [userId]);

  return (
    <div className="gestionnaire-container">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Enhanced Header */}
        <div className="gestionnaire-header">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <div className="gestionnaire-icon">
              📋
            </div>
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
            <div className="gestionnaire-empty-icon">
              📋
            </div>
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
            {/* Enhanced Quick Stats */}
            <div className="gestionnaire-stats">
              <div className="gestionnaire-stat-card">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', padding: '20px', borderRadius: '50%', marginRight: '20px', boxShadow: '0 8px 20px rgba(33, 150, 243, 0.2)' }}>
                    <span style={{ fontSize: '32px' }}>📊</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#2196f3', marginBottom: '4px' }}>{userBordereaux.length}</div>
                    <div style={{ fontSize: '16px', color: '#666', fontWeight: '600' }}>Total assignés</div>
                  </div>
                </div>
              </div>
              <div className="gestionnaire-stat-card">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ background: 'linear-gradient(135deg, #fff3e0 0%, #ffcc02 100%)', padding: '20px', borderRadius: '50%', marginRight: '20px', boxShadow: '0 8px 20px rgba(255, 152, 0, 0.2)' }}>
                    <span style={{ fontSize: '32px' }}>⏳</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#ff9800', marginBottom: '4px' }}>
                      {userBordereaux.filter(b => ['EN_COURS', 'ASSIGNE'].includes(b.statut)).length}
                    </div>
                    <div style={{ fontSize: '16px', color: '#666', fontWeight: '600' }}>À traiter</div>
                  </div>
                </div>
              </div>
              <div className="gestionnaire-stat-card">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ background: 'linear-gradient(135deg, #e8f5e8 0%, #4caf50 100%)', padding: '20px', borderRadius: '50%', marginRight: '20px', boxShadow: '0 8px 20px rgba(76, 175, 80, 0.2)' }}>
                    <span style={{ fontSize: '32px' }}>✅</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#4caf50', marginBottom: '4px' }}>
                      {userBordereaux.filter(b => ['TRAITE', 'CLOTURE'].includes(b.statut)).length}
                    </div>
                    <div style={{ fontSize: '16px', color: '#666', fontWeight: '600' }}>Traités</div>
                  </div>
                </div>
              </div>
              <div className="gestionnaire-stat-card">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ background: 'linear-gradient(135deg, #ffebee 0%, #f44336 100%)', padding: '20px', borderRadius: '50%', marginRight: '20px', boxShadow: '0 8px 20px rgba(244, 67, 54, 0.2)' }}>
                    <span style={{ fontSize: '32px' }}>⚠️</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#f44336', marginBottom: '4px' }}>
                      {userBordereaux.filter(b => b.statut === 'EN_DIFFICULTE').length}
                    </div>
                    <div style={{ fontSize: '16px', color: '#666', fontWeight: '600' }}>En difficulté</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Bordereaux Table */}
            <div className="gestionnaire-table-container">
              <table className="gestionnaire-table">
                <thead>
                  <tr>
                    <th>Statut</th>
                    <th>Référence</th>
                    <th>Client</th>
                    <th>Date Réception</th>
                    <th>BS</th>
                    <th>SLA</th>
                    <th>Jours Restants</th>
                    <th>Gestionnaire</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map(b => {
                    const daysRemaining = b.daysRemaining || 0;
                    const statusColor = daysRemaining <= 0 ? 'red' : daysRemaining <= 3 ? 'orange' : 'green';
                    const statusIcon = statusColor === 'red' ? '🔴' : statusColor === 'orange' ? '🟡' : '🟢';
                    
                    return (
                      <tr key={b.id} className={`table-row status-${statusColor}`}>
                        <td>
                          <div className="status-cell">
                            <span className="status-icon">{statusIcon}</span>
                            <span className={`status-badge status-${b.statut.toLowerCase()}`}>
                              {b.statut}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="reference-cell">
                            <span className="reference-number">#{b.reference}</span>
                          </div>
                        </td>
                        <td>
                          <div className="client-cell">
                            {b.client?.name || b.clientId}
                          </div>
                        </td>
                        <td>
                          <div className="date-cell">
                            {new Date(b.dateReception).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                        </td>
                        <td>
                          <div className="bs-cell">
                            <span className="bs-count">{b.nombreBS}</span>
                          </div>
                        </td>
                        <td>
                          <div className="sla-cell">
                            <span className="sla-days">{b.delaiReglement}j</span>
                          </div>
                        </td>
                        <td>
                          <div className="remaining-cell">
                            <span className={`remaining-badge remaining-${statusColor}`}>
                              {daysRemaining <= 0 ? `+${Math.abs(daysRemaining)}` : `D-${daysRemaining}`}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="gestionnaire-cell">
                            {b.currentHandler?.fullName || b.currentHandlerId || '--'}
                          </div>
                        </td>
                        <td>
                          <div className="actions-cell">
                            {['EN_COURS', 'ASSIGNE'].includes(b.statut) && (
                              <>
                                <button 
                                  className="action-btn btn-success"
                                  onClick={() => handleProcessBordereau(b.id)}
                                  title="Traiter"
                                >
                                  Traiter
                                </button>
                                <button 
                                  className="action-btn btn-warning"
                                  onClick={() => handleReturnToChef(b.id)}
                                  title="Retour Chef"
                                >
                                  Retour Chef
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination-container">
                  <div className="pagination-info">
                    Affichage de {startIndex + 1} à {Math.min(endIndex, totalItems)} sur {totalItems} éléments
                  </div>
                  <div className="pagination-controls">
                    <button 
                      className={`pagination-btn ${currentPage === 1 ? 'disabled' : ''}`}
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      ‹ Précédent
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        className={`pagination-btn page-btn ${currentPage === page ? 'active' : ''}`}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button 
                      className={`pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`}
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Suivant ›
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Enhanced Personal Performance */}
        <div className="gestionnaire-performance">
          <div className="gestionnaire-perf-header">
            <div className="gestionnaire-perf-icon">
              📈
            </div>
            <div>
              <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Ma Performance Personnelle</h2>
              <p style={{ color: '#666', fontSize: '18px', margin: 0, fontWeight: '500' }}>Statistiques de votre activité</p>
            </div>
          </div>
          <div className="gestionnaire-perf-grid">
            <div className="gestionnaire-perf-card green">
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#2e7d32', marginBottom: '12px' }}>
                {userBordereaux.filter(b => ['TRAITE', 'CLOTURE'].includes(b.statut)).length}
              </div>
              <div style={{ fontSize: '16px', color: '#2e7d32', fontWeight: 'bold' }}>Total traités</div>
            </div>
            <div className="gestionnaire-perf-card red">
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#c62828', marginBottom: '12px' }}>
                {userBordereaux.filter(b => b.statut === 'EN_DIFFICULTE').length}
              </div>
              <div style={{ fontSize: '16px', color: '#c62828', fontWeight: 'bold' }}>En difficulté</div>
            </div>
            <div className="gestionnaire-perf-card blue">
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#1565c0', marginBottom: '12px' }}>
                {userBordereaux.filter(b => ['EN_COURS', 'ASSIGNE'].includes(b.statut)).length}
              </div>
              <div style={{ fontSize: '16px', color: '#1565c0', fontWeight: 'bold' }}>En cours</div>
            </div>
            <div className="gestionnaire-perf-card purple">
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#6a1b9a', marginBottom: '12px' }}>
                {userBordereaux.length > 0 ? Math.round((userBordereaux.filter(b => ['TRAITE', 'CLOTURE'].includes(b.statut)).length / userBordereaux.length) * 100) : 0}%
              </div>
              <div style={{ fontSize: '16px', color: '#6a1b9a', fontWeight: 'bold' }}>Taux de réussite</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GestionnaireBordereaux;