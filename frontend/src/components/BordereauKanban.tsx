import React, { useState, useEffect } from 'react';
import { fetchUnassignedBordereaux, fetchTeamBordereaux, assignBordereau2 as assignBordereau } from '../services/bordereauxService';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../contexts/NotificationContext';
import BordereauAssignModal from './BordereauAssignModal';

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
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="kanban-container">
      {/* Bulk Actions Bar */}
      <div className="flex justify-between items-center mb-4 p-4 bg-gray-50 rounded">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {selectedBordereaux.size} bordereau(x) sélectionné(s)
          </span>
          {selectedBordereaux.size > 0 && (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleBulkAssign}
            >
              Affecter en lot
            </button>
          )}
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={loadData}
        >
          Actualiser
        </button>
      </div>

      <div className="kanban-board grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((column) => (
          <div key={column.id} className="kanban-column">
            {/* Column Header */}
            <div 
              className="kanban-column-header p-4 rounded-t-lg text-white font-semibold flex justify-between items-center"
              style={{ backgroundColor: column.color }}
            >
              <div className="flex items-center gap-2">
                <span>{column.title}</span>
                <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                  {column.bordereaux.length}
                </span>
              </div>
              <button
                className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded"
                onClick={() => selectAllInColumn(column.id)}
                title="Sélectionner tout"
              >
                ☑
              </button>
            </div>

            {/* Droppable Area */}
            <div className={`kanban-column-content min-h-96 p-4 bg-gray-50 rounded-b-lg border-2 border-dashed border-gray-200`}>
              {column.bordereaux.map((bordereau, index) => (
                <div
                  key={bordereau.id}
                  className={`kanban-card mb-3 p-4 bg-white rounded-lg shadow-sm border transition-all hover:shadow-md ${
                    selectedBordereaux.has(bordereau.id) ? 'ring-2 ring-blue-400' : ''
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedBordereaux.has(bordereau.id)}
                        onChange={() => toggleBordereauSelection(bordereau.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded"
                      />
                      <div className="flex items-center gap-1">
                        {bordereau.statusColor === 'RED' && (
                          <span className="text-red-500" title="Retard">🔴</span>
                        )}
                        {bordereau.statusColor === 'ORANGE' && (
                          <span className="text-orange-500" title="Risque">🟡</span>
                        )}
                        {bordereau.statusColor === 'GREEN' && (
                          <span className="text-green-500" title="OK">🟢</span>
                        )}
                        <span className="font-mono text-sm font-bold text-blue-900">
                          {bordereau.reference}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      D-{bordereau.daysRemaining || 0}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="space-y-1 text-sm">
                    <div className="font-medium text-gray-800">
                      {bordereau.client?.name || bordereau.clientId}
                    </div>
                    <div className="text-gray-600">
                      BS: {bordereau.nombreBS} • SLA: {bordereau.delaiReglement}j
                    </div>
                    <div className="text-xs text-gray-500">
                      Reçu: {new Date(bordereau.dateReception).toLocaleDateString()}
                    </div>
                    {bordereau.currentHandler && (
                      <div className="text-xs text-blue-600">
                        👤 {bordereau.currentHandler.fullName}
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                    <div className="flex gap-1">
                      {column.id === 'unassigned' && (
                        <button
                          className="btn btn-xs btn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDraggedBordereau(bordereau);
                            setAssignModalOpen(true);
                          }}
                        >
                          Affecter
                        </button>
                      )}
                      <button
                        className="btn btn-xs btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/bordereaux/${bordereau.id}`, '_blank');
                        }}
                      >
                        Voir
                      </button>
                    </div>
                    <div className="text-xs text-gray-400">
                      {bordereau.statut}
                    </div>
                  </div>
                </div>
              ))}
              
              {column.bordereaux.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <div className="text-4xl mb-2">📋</div>
                  <div>Aucun bordereau</div>
                </div>
              )}
            </div>
          </div>
        ))}
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

      <style>{`
        .kanban-container {
          padding: 1rem;
        }
        
        .kanban-board {
          min-height: 600px;
        }
        
        .kanban-column {
          background: transparent;
        }
        
        .kanban-column-header {
          position: sticky;
          top: 0;
          z-index: 10;
        }
        
        .kanban-column-content {
          max-height: 70vh;
          overflow-y: auto;
        }
        
        .kanban-card {
          cursor: grab;
          user-select: none;
        }
        
        .kanban-card:active {
          cursor: grabbing;
        }
        
        .btn {
          padding: 0.25rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-primary {
          background-color: #0d6efd;
          color: white;
        }
        
        .btn-primary:hover {
          background-color: #0b5ed7;
        }
        
        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }
        
        .btn-secondary:hover {
          background-color: #5c636a;
        }
        
        .btn-xs {
          padding: 0.125rem 0.5rem;
          font-size: 0.75rem;
        }
        
        .btn-sm {
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
};

export default BordereauKanban;