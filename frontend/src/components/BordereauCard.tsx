import React, { useState } from 'react';
import { Bordereau } from "../types/bordereaux";
import BordereauStatusBadge from "./BordereauStatusBadge";
import MobileBordereauCard from "./MobileBordereauCard";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from '../hooks/useAuth';
import BordereauAssignModal from "./BordereauAssignModal";
import { markBordereauAsProcessed, returnBordereau, archiveBordereau, restoreBordereau } from "../services/bordereauxService";
import { MdCheckCircle, MdWarning, MdError, MdAssignmentInd, MdDelete } from 'react-icons/md';
import { useNotification } from '../contexts/NotificationContext';

interface Props {
  bordereau: Bordereau;
  onAssignSuccess?: () => void;
  isCorbeille?: boolean;
}

const BordereauCard: React.FC<Props> = ({ bordereau, onAssignSuccess, isCorbeille }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState(false);
  const { notify } = useNotification();

  // Role-based permissions
  const isChef = user?.role === 'CHEF_EQUIPE';
  const isGestionnaire = user?.role === 'GESTIONNAIRE';
  const isAdmin = user?.role === 'ADMINISTRATEUR';
  const isBO = user?.role === 'CLIENT_SERVICE';

  // Actions
  const canAssign = isChef || isAdmin;
  const canProcess = isGestionnaire;
  const canExport = isAdmin;

  // Alert/notification logic
  const isOverdue = bordereau.statusColor === 'RED';
  const isAtRisk = bordereau.statusColor === 'ORANGE';

  // Modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [processLoading, setProcessLoading] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);

  // Quick action handlers
  const handleAssign = (e: React.MouseEvent) => {
    e.preventDefault();
    setAssignModalOpen(true);
  };
  
  const handleProcess = (e: React.MouseEvent) => {
    e.preventDefault();
    setProcessModalOpen(true);
  };

  const confirmProcess = async () => {
    setProcessLoading(true);
    setProcessError(null);
    try {
      await markBordereauAsProcessed(bordereau.id);
      setProcessModalOpen(false);
      notify('Bordereau marqué comme traité', 'success');
      if (onAssignSuccess) onAssignSuccess();
    } catch (err: any) {
      setProcessError(err?.response?.data?.message || "Erreur lors du traitement.");
      notify('Erreur lors du traitement du bordereau', 'error');
    } finally {
      setProcessLoading(false);
    }
  };
  
  const handleReturn = (e: React.MouseEvent) => {
    e.preventDefault();
    setReturnModalOpen(true);
  };

  const confirmReturn = async () => {
    setReturnLoading(true);
    setReturnError(null);
    try {
      await returnBordereau(bordereau.id, returnReason);
      setReturnModalOpen(false);
      setReturnReason("");
      notify('Bordereau retourné au chef', 'info');
      if (onAssignSuccess) onAssignSuccess();
    } catch (err: any) {
      setReturnError(err?.response?.data?.message || "Erreur lors du retour.");
      notify('Erreur lors du retour du bordereau', 'error');
    } finally {
      setReturnLoading(false);
    }
  };
  
  const handleExport = (e: React.MouseEvent) => {
    e.preventDefault();
    // Export logic
  };
  
  const handleCreateCourrier = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(`/bordereaux/${bordereau.id}?tab=courriers&action=create`);
  };
  
  const handleViewCourriers = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(`/bordereaux/${bordereau.id}?tab=courriers`);
  };

  // Color-coded background for SLA status - exact specification colors
  const bgColor =
    bordereau.statusColor === 'RED'
      ? 'bg-red-50 border-red-200'
      : bordereau.statusColor === 'ORANGE'
      ? 'bg-yellow-50 border-yellow-200'
      : 'bg-green-50 border-green-200';

  // Check if mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  if (isMobile) {
    return (
      <MobileBordereauCard 
        bordereau={bordereau} 
        onAssignSuccess={onAssignSuccess} 
        isCorbeille={isCorbeille} 
      />
    );
  }

  return (
    <div className={`bordereau-card ${bgColor} border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 mb-4 overflow-hidden`}>
      {/* Card Header - Exact specification layout */}
      <Link
        to={`/bordereaux/${bordereau.id}`}
        className="block text-inherit no-underline"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {bordereau.statusColor === 'RED' && (
                  <span title="Retard" className="text-red-500 text-lg">🔴</span>
                )}
                {bordereau.statusColor === 'ORANGE' && (
                  <span title="Risque" className="text-orange-500 text-lg">🟡</span>
                )}
                {bordereau.statusColor === 'GREEN' && (
                  <span title="OK" className="text-green-500 text-lg">🟢</span>
                )}
                <h3 className="font-mono text-lg font-bold text-blue-900 truncate">
                  # {bordereau.reference}
                </h3>
              </div>
              <div className="text-sm text-gray-600 mb-1">
                <span className="font-medium">Client:</span> {bordereau.client?.name || bordereau.clientId}
              </div>
              <div className="text-xs text-gray-500">
                Reçu le: {new Date(bordereau.dateReception).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </div>
            </div>
            <div className="ml-4 text-right">
              <BordereauStatusBadge statut={bordereau.statut} color={bordereau.statusColor} />
              <div className="mt-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  (bordereau.daysRemaining || 0) <= 0
                    ? 'bg-red-100 text-red-800'
                    : (bordereau.daysRemaining || 0) <= 3
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {(bordereau.daysRemaining || 0) <= 0 
                    ? `+${Math.abs(bordereau.daysRemaining || 0)}` 
                    : `D-${bordereau.daysRemaining || 0}`
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Card Metrics - Exact specification */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">BS:</span>
              <span className="font-bold ml-1">{bordereau.nombreBS}</span>
            </div>
            <div>
              <span className="text-gray-600">SLA:</span>
              <span className="font-bold ml-1">{bordereau.delaiReglement}j</span>
            </div>
            <div>
              <span className="text-gray-600">Restant:</span>
              <span className="font-bold ml-1">{bordereau.daysRemaining || 0}j</span>
            </div>
            <div>
              <span className="text-gray-600">Gestionnaire:</span>
              <span className="font-bold ml-1 truncate">
                {bordereau.currentHandler?.fullName || bordereau.currentHandlerId || '--'}
              </span>
            </div>
          </div>
        </div>
      </Link>
      
      {/* Role-based Actions - Exact specification */}
      <div className="px-6 py-4 bg-white">
        <div className="flex flex-wrap gap-2">
          {canAssign && (
            <button 
              type="button" 
              className="btn-xs btn-primary" 
              onClick={handleAssign} 
              disabled={actionLoading}
            >
              Affecter
            </button>
          )}
          {canProcess && (
            <>
              <button 
                type="button" 
                className="btn-xs btn-success" 
                onClick={handleProcess} 
                disabled={actionLoading}
              >
                Traiter
              </button>
              <button 
                type="button" 
                className="btn-xs btn-warning" 
                onClick={handleReturn} 
                disabled={actionLoading}
              >
                Retour Chef
              </button>
            </>
          )}
          {canExport && (
            <button 
              type="button" 
              className="btn-xs btn-secondary" 
              onClick={handleExport} 
              disabled={actionLoading}
            >
              Exporter
            </button>
          )}
          {canAssign && !isCorbeille && (
            <button
              type="button"
              className="btn-xs btn-danger"
              onClick={() => setConfirmArchiveOpen(true)}
              disabled={actionLoading}
            >
              Archiver
            </button>
          )}
          {canAssign && isCorbeille && (
            <button
              type="button"
              className="btn-xs btn-success"
              onClick={() => setConfirmRestoreOpen(true)}
              disabled={actionLoading}
            >
              Restaurer
            </button>
          )}
        </div>
      </div>
      
      {/* Archive Confirmation Modal */}
      {confirmArchiveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" onClick={() => setConfirmArchiveOpen(false)} aria-label="Fermer">✕</button>
            <h2 className="text-xl font-bold mb-4">Confirmer l'archivage</h2>
            <p>Voulez-vous vraiment <strong>archiver</strong> ce bordereau ?</p>
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn-secondary" onClick={() => setConfirmArchiveOpen(false)}>Annuler</button>
              <button className="btn-danger" onClick={async () => {
                try {
                  await archiveBordereau(bordereau.id);
                  setConfirmArchiveOpen(false);
                  notify('Bordereau archivé', 'success');
                  if (onAssignSuccess) onAssignSuccess();
                } catch (error) {
                  notify('Erreur lors de l\'archivage', 'error');
                }
              }}>Archiver</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Restore Confirmation Modal */}
      {confirmRestoreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" onClick={() => setConfirmRestoreOpen(false)} aria-label="Fermer">✕</button>
            <h2 className="text-xl font-bold mb-4">Confirmer la restauration</h2>
            <p>Voulez-vous vraiment <strong>restaurer</strong> ce bordereau ?</p>
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn-secondary" onClick={() => setConfirmRestoreOpen(false)}>Annuler</button>
              <button className="btn-success" onClick={async () => {
                try {
                  await restoreBordereau(bordereau.id);
                  setConfirmRestoreOpen(false);
                  notify('Bordereau restauré', 'success');
                  if (onAssignSuccess) onAssignSuccess();
                } catch (error) {
                  notify('Erreur lors de la restauration', 'error');
                }
              }}>Restaurer</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Assignment Modal */}
      {assignModalOpen && (
        <BordereauAssignModal
          bordereauId={bordereau.id}
          onClose={() => setAssignModalOpen(false)}
          onSuccess={() => {
            setAssignModalOpen(false);
            if (onAssignSuccess) onAssignSuccess();
          }}
        />
      )}
      
      {/* Process Modal */}
      {processModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" onClick={() => setProcessModalOpen(false)} aria-label="Fermer">✕</button>
            <h2 className="text-xl font-bold mb-4">Confirmer le traitement</h2>
            <p>Voulez-vous vraiment marquer ce bordereau comme <strong>traité</strong> ?</p>
            {processError && <div className="text-red-600 text-sm mt-2">{processError}</div>}
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn-secondary" onClick={() => setProcessModalOpen(false)} disabled={processLoading}>Annuler</button>
              <button className="btn-success" onClick={confirmProcess} disabled={processLoading}>
                {processLoading ? 'Traitement...' : 'Traiter'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Return Modal */}
      {returnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" onClick={() => setReturnModalOpen(false)} aria-label="Fermer">✕</button>
            <h2 className="text-xl font-bold mb-4">Retourner au chef</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Raison du retour</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                rows={3}
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Expliquez pourquoi vous retournez ce bordereau..."
              />
            </div>
            {returnError && <div className="text-red-600 text-sm mt-2">{returnError}</div>}
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn-secondary" onClick={() => setReturnModalOpen(false)} disabled={returnLoading}>Annuler</button>
              <button className="btn-warning" onClick={confirmReturn} disabled={returnLoading || !returnReason.trim()}>
                {returnLoading ? 'Retour...' : 'Retourner'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .btn-xs {
          padding: 0.25rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 500;
          border-radius: 0.375rem;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-primary {
          background-color: #0b5ed7;
          color: white;
        }
        
        .btn-primary:hover {
          background-color: #0a58ca;
        }
        
        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }
        
        .btn-secondary:hover {
          background-color: #5c636a;
        }
        
        .btn-success {
          background-color: #198754;
          color: white;
        }
        
        .btn-success:hover {
          background-color: #157347;
        }
        
        .btn-warning {
          background-color: #fd7e14;
          color: white;
        }
        
        .btn-warning:hover {
          background-color: #e8681c;
        }
        
        .btn-danger {
          background-color: #dc3545;
          color: white;
        }
        
        .btn-danger:hover {
          background-color: #c82333;
        }
        
        .btn-xs:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .bordereau-card {
          border-radius: 0;
          box-shadow: 0 2px 8px 0 rgba(31,38,135,0.08);
        }
        
        .no-underline {
          text-decoration: none;
        }
      `}</style>
    </div>
  );
};

export default BordereauCard;