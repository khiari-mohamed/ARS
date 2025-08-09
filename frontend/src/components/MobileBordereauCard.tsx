import React, { useState } from 'react';
import { Bordereau } from '../types/bordereaux';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../contexts/NotificationContext';
import { markBordereauAsProcessed, returnBordereau } from '../services/bordereauxService';

interface Props {
  bordereau: Bordereau;
  onAssignSuccess?: () => void;
  isCorbeille?: boolean;
}

const MobileBordereauCard: React.FC<Props> = ({ bordereau, onAssignSuccess, isCorbeille }) => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [showActions, setShowActions] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Role-based permissions
  const isChef = user?.role === 'CHEF_EQUIPE';
  const isGestionnaire = user?.role === 'GESTIONNAIRE';
  const isAdmin = user?.role === 'ADMINISTRATEUR';

  const canAssign = isChef || isAdmin;
  const canProcess = isGestionnaire;

  const handleSwipeLeft = () => {
    setShowActions(true);
    setTimeout(() => setShowActions(false), 3000); // Auto-hide after 3s
  };

  const handleProcess = async () => {
    setActionLoading(true);
    try {
      await markBordereauAsProcessed(bordereau.id);
      notify('Bordereau marqué comme traité', 'success');
      if (onAssignSuccess) onAssignSuccess();
    } catch (error) {
      notify('Erreur lors du traitement', 'error');
    } finally {
      setActionLoading(false);
      setShowActions(false);
    }
  };

  const handleReturn = async () => {
    setActionLoading(true);
    try {
      await returnBordereau(bordereau.id, 'Retourné depuis mobile');
      notify('Bordereau retourné au chef', 'info');
      if (onAssignSuccess) onAssignSuccess();
    } catch (error) {
      notify('Erreur lors du retour', 'error');
    } finally {
      setActionLoading(false);
      setShowActions(false);
    }
  };

  const getStatusColor = () => {
    switch (bordereau.statusColor) {
      case 'RED': return 'bg-red-50 border-red-200';
      case 'ORANGE': return 'bg-yellow-50 border-yellow-200';
      case 'GREEN': return 'bg-green-50 border-green-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (bordereau.statusColor) {
      case 'RED': return <span className="text-red-500 text-lg">🔴</span>;
      case 'ORANGE': return <span className="text-orange-500 text-lg">🟡</span>;
      case 'GREEN': return <span className="text-green-500 text-lg">🟢</span>;
      default: return null;
    }
  };

  return (
    <div className="mobile-bordereau-card-container">
      <div 
        className={`mobile-bordereau-card ${getStatusColor()} border rounded-lg p-4 mb-3 relative overflow-hidden transition-all duration-300 ${
          showActions ? 'transform -translate-x-20' : ''
        }`}
        onTouchStart={(e) => {
          const startX = e.touches[0].clientX;
          const handleTouchMove = (e: TouchEvent) => {
            const currentX = e.touches[0].clientX;
            const diff = startX - currentX;
            if (diff > 50) { // Swipe left threshold
              handleSwipeLeft();
              document.removeEventListener('touchmove', handleTouchMove);
            }
          };
          document.addEventListener('touchmove', handleTouchMove);
          document.addEventListener('touchend', () => {
            document.removeEventListener('touchmove', handleTouchMove);
          }, { once: true });
        }}
      >
        {/* Card Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <div>
              <div className="font-mono text-sm font-bold text-blue-900">
                {bordereau.reference}
              </div>
              <div className="text-xs text-gray-500">
                {bordereau.client?.name || bordereau.clientId}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-xs px-2 py-1 rounded-full font-medium ${
              bordereau.statusColor === 'RED' 
                ? 'bg-red-100 text-red-800'
                : bordereau.statusColor === 'ORANGE'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {bordereau.statut}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              D-{bordereau.daysRemaining || 0}
            </div>
          </div>
        </div>

        {/* Card Content */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-600">BS</div>
            <div className="font-medium">{bordereau.nombreBS}</div>
          </div>
          <div>
            <div className="text-gray-600">SLA</div>
            <div className="font-medium">{bordereau.delaiReglement}j</div>
          </div>
          <div>
            <div className="text-gray-600">Reçu le</div>
            <div className="font-medium text-xs">
              {new Date(bordereau.dateReception).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Gestionnaire</div>
            <div className="font-medium text-xs">
              {bordereau.currentHandler?.fullName || '--'}
            </div>
          </div>
        </div>

        {/* Overflow Menu */}
        <button
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600"
          onClick={() => setShowActions(!showActions)}
        >
          ⋮
        </button>

        {/* Tap to open detail */}
        <div 
          className="absolute inset-0 cursor-pointer"
          onClick={() => window.open(`/bordereaux/${bordereau.id}`, '_blank')}
        />
      </div>

      {/* Swipe Actions */}
      <div className={`mobile-actions-panel absolute right-0 top-0 h-full flex items-center gap-2 pr-4 transition-all duration-300 ${
        showActions ? 'opacity-100 visible' : 'opacity-0 invisible'
      }`}>
        {canProcess && (
          <>
            <button
              className="action-btn bg-green-500 text-white p-3 rounded-full shadow-lg"
              onClick={handleProcess}
              disabled={actionLoading}
              title="Traiter"
            >
              ✅
            </button>
            <button
              className="action-btn bg-orange-500 text-white p-3 rounded-full shadow-lg"
              onClick={handleReturn}
              disabled={actionLoading}
              title="Retourner"
            >
              ↩️
            </button>
          </>
        )}
        {canAssign && (
          <button
            className="action-btn bg-blue-500 text-white p-3 rounded-full shadow-lg"
            onClick={() => {
              // Handle assign
              setShowActions(false);
            }}
            title="Affecter"
          >
            👤
          </button>
        )}
      </div>

      <style>{`
        .mobile-bordereau-card-container {
          position: relative;
          touch-action: pan-y;
        }
        
        .mobile-bordereau-card {
          user-select: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
        }
        
        .mobile-actions-panel {
          z-index: 10;
        }
        
        .action-btn {
          transition: all 0.2s;
          border: none;
          cursor: pointer;
        }
        
        .action-btn:active {
          transform: scale(0.95);
        }
        
        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        @media (max-width: 768px) {
          .mobile-bordereau-card {
            margin-bottom: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
};

export default MobileBordereauCard;