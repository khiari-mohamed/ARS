import React, { useState, useEffect } from 'react';
import { fetchUnassignedBordereaux, fetchTeamBordereaux, assignBordereau2 as assignBordereau } from '../services/bordereauxService';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../contexts/NotificationContext';
import BordereauAssignModal from './BordereauAssignModal';
import '../styles/bordereaux.css';

interface KanbanColumn {
  id: string;
  title: string;
  bordereaux: any[];
  color: string;
}

const BordereauKanban: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [columns, setColumns] = useState<KanbanColumn[]>([
    { id: 'unassigned', title: 'Non affectés', bordereaux: [], color: '#6c757d' },
    { id: 'inprogress', title: 'En cours', bordereaux: [], color: '#0d6efd' },
    { id: 'completed', title: 'Traités', bordereaux: [], color: '#198754' }
  ]);
  const [loading, setLoading] = useState(true);
  const [selectedBordereaux, setSelectedBordereaux] = useState<Set<string>>(new Set());
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [draggedBordereau, setDraggedBordereau] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const teamId = user?.teamId || user?.id || '';
      const [unassigned, teamBordereaux] = await Promise.all([
        fetchUnassignedBordereaux(),
        fetchTeamBordereaux(teamId)
      ]);

      const inProgress = teamBordereaux.filter((b: any) => !['CLOTURE', 'TRAITE'].includes(b.statut));
      const completed = teamBordereaux.filter((b: any) => ['CLOTURE', 'TRAITE'].includes(b.statut));

      setColumns([
        { id: 'unassigned', title: 'Non affectés', bordereaux: unassigned, color: '#6c757d' },
        { id: 'inprogress', title: 'En cours', bordereaux: inProgress, color: '#0d6efd' },
        { id: 'completed', title: 'Traités', bordereaux: completed, color: '#198754' }
      ]);
    } catch (error) {
      notify('Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) return;

    // Find the dragged bordereau
    const sourceBordereaux = columns.find(col => col.id === source.droppableId)?.bordereaux || [];
    const bordereau = sourceBordereaux.find(b => b.id === draggableId);
    
    if (!bordereau) return;

    // Handle assignment logic
    if (destination.droppableId === 'inprogress' && source.droppableId === 'unassigned') {
      setDraggedBordereau(bordereau);
      setAssignModalOpen(true);
      return;
    }

    // Update local state optimistically
    const newColumns = columns.map(col => {
      if (col.id === source.droppableId) {
        return {
          ...col,
          bordereaux: col.bordereaux.filter(b => b.id !== draggableId)
        };
      }
      if (col.id === destination.droppableId) {
        return {
          ...col,
          bordereaux: [...col.bordereaux, bordereau]
        };
      }
      return col;
    });

    setColumns(newColumns);
  };

  const handleBulkAssign = () => {
    if (selectedBordereaux.size === 0) {
      notify('Sélectionnez au moins un bordereau', 'warning');
      return;
    }
    setAssignModalOpen(true);
  };

  const handleAssignSuccess = () => {
    setAssignModalOpen(false);
    setDraggedBordereau(null);
    setSelectedBordereaux(new Set());
    loadData();
  };

  const toggleBordereauSelection = (bordereauId: string) => {
    const newSelection = new Set(selectedBordereaux);
    if (newSelection.has(bordereauId)) {
      newSelection.delete(bordereauId);
    } else {
      newSelection.add(bordereauId);
    }
    setSelectedBordereaux(newSelection);
  };

  const selectAllInColumn = (columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    if (!column) return;

    const newSelection = new Set(selectedBordereaux);
    column.bordereaux.forEach(b => newSelection.add(b.id));
    setSelectedBordereaux(newSelection);
  };

  if (loading) {
    return (
      <div className="bordereau-loading">
        <div style={{textAlign: 'center'}}>
          <div className="bordereau-spinner"></div>
          <p style={{color: '#6b7280', marginTop: '16px'}}>Chargement du kanban...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bordereau-dashboard">
      {/* Actions Bar */}
      <div className="bordereau-actions-bar">
        <div className="bordereau-actions-content">
          <div className="bordereau-actions-left">
            <span style={{fontSize: '0.875rem', color: '#6b7280'}}>
              {selectedBordereaux.size} bordereau(x) sélectionné(s)
            </span>
            {selectedBordereaux.size > 0 && (
              <button
                className="bordereau-btn bordereau-btn-primary"
                onClick={handleBulkAssign}
              >
                <span>📋</span>
                Affecter en lot
              </button>
            )}
          </div>
          <button
            className="bordereau-btn bordereau-btn-secondary"
            onClick={loadData}
          >
            <span>🔄</span>
            Actualiser
          </button>
        </div>
      </div>

      <div className="bordereau-main">
        <div className="bordereau-kanban-container">
          {columns.map((column) => (
            <div key={column.id} className="bordereau-kanban-column">
              {/* Column Header */}
              <div className="bordereau-kanban-header" style={{ background: `linear-gradient(135deg, ${column.color}, ${column.color}dd)` }}>
                <div className="bordereau-kpi-info">
                  <h3 className="bordereau-kpi-label" style={{color: 'white', margin: 0}}>{column.title}</h3>
                  <p className="bordereau-kpi-value" style={{color: 'white', fontSize: '2rem', margin: 0}}>
                    {column.bordereaux.length}
                  </p>
                </div>
                <button
                  className="bordereau-btn bordereau-btn-secondary"
                  style={{background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: '0.75rem', padding: '6px 12px'}}
                  onClick={() => selectAllInColumn(column.id)}
                  title="Sélectionner tout"
                >
                  ☑ Tout
                </button>
              </div>

              {/* Cards Container */}
              <div className="bordereau-kanban-cards">
                {column.bordereaux.map((bordereau, index) => {
                  const getSLAColor = () => {
                    const days = bordereau.daysRemaining || 0;
                    if (days < 0) return '#ef4444';
                    if (days <= 3) return '#f59e0b';
                    return '#10b981';
                  };
                  
                  return (
                    <div
                      key={bordereau.id}
                      className={`bordereau-kanban-card ${
                        selectedBordereaux.has(bordereau.id) ? 'selected' : ''
                      }`}
                    >
                      {/* Card Header */}
                      <div className="bordereau-kpi-content">
                        <div className="bordereau-kpi-info">
                          <div className="bordereau-kpi-icon" style={{width: '48px', height: '48px', background: getSLAColor()}}>
                            <span style={{fontSize: '1.5rem'}}>
                              {bordereau.daysRemaining < 0 ? '⚠️' : bordereau.daysRemaining <= 3 ? '🟡' : '✅'}
                            </span>
                          </div>
                          <h3 className="bordereau-kpi-label">{bordereau.reference}</h3>
                          <p className="bordereau-kpi-value" style={{fontSize: '1.5rem'}}>
                            {bordereau.daysRemaining < 0 ? `+${Math.abs(bordereau.daysRemaining)}j` : `${bordereau.daysRemaining}j`}
                          </p>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div style={{marginTop: '16px', marginBottom: '16px'}}>
                        <div className="bordereau-kpi-label" style={{marginBottom: '8px'}}>
                          {bordereau.client?.name || bordereau.clientId}
                        </div>
                        <div style={{color: '#6b7280', fontSize: '0.875rem', marginBottom: '4px'}}>
                          📋 {bordereau.nombreBS} BS
                        </div>
                        <div style={{color: '#9ca3af', fontSize: '0.75rem'}}>
                          {new Date(bordereau.dateReception).toLocaleDateString('fr-FR')}
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div style={{display: 'flex', gap: '8px', marginTop: '16px'}}>
                        <input
                          type="checkbox"
                          checked={selectedBordereaux.has(bordereau.id)}
                          onChange={() => toggleBordereauSelection(bordereau.id)}
                          style={{marginRight: '8px'}}
                        />
                        <button
                          className="bordereau-btn bordereau-btn-secondary"
                          style={{fontSize: '0.75rem', padding: '4px 8px', flex: 1}}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/bordereaux/${bordereau.id}`, '_blank');
                          }}
                        >
                          Voir →
                        </button>
                      </div>
                    </div>
                  );
                })}
                
                {column.bordereaux.length === 0 && (
                  <div style={{textAlign: 'center', color: '#9ca3af', padding: '48px 16px'}}>
                    <div className="bordereau-kpi-icon" style={{margin: '0 auto 16px', background: '#f3f4f6'}}>
                      <span style={{fontSize: '2rem'}}>📋</span>
                    </div>
                    <div className="bordereau-kpi-label">Aucun bordereau</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assignment Modal */}
      {assignModalOpen && (
        <BordereauAssignModal
          bordereauId={draggedBordereau?.id}
          selectedBordereaux={Array.from(selectedBordereaux)}
          onClose={() => {
            setAssignModalOpen(false);
            setDraggedBordereau(null);
          }}
          onSuccess={handleAssignSuccess}
        />
      )}


    </div>
  );
};

export default BordereauKanban;