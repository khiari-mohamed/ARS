import React from 'react';
import { Statut } from '../types/bordereaux';

interface WorkflowStep {
  status: Statut;
  label: string;
  description: string;
  icon: string;
  color: string;
  team: string;
}

const workflowSteps: WorkflowStep[] = [
  {
    status: 'EN_ATTENTE',
    label: 'En attente',
    description: 'Bordereau créé, en attente de traitement',
    icon: '⏳',
    color: 'bg-gray-100 text-gray-800',
    team: 'Bureau d\'Ordre'
  },
  {
    status: 'A_SCANNER',
    label: 'À scanner',
    description: 'Prêt pour la numérisation',
    icon: '📄',
    color: 'bg-orange-100 text-orange-800',
    team: 'Service SCAN'
  },
  {
    status: 'SCAN_EN_COURS',
    label: 'Scan en cours',
    description: 'Numérisation et OCR en cours',
    icon: '🔄',
    color: 'bg-blue-100 text-blue-800',
    team: 'Service SCAN'
  },
  {
    status: 'SCANNE',
    label: 'Scanné',
    description: 'Numérisation terminée, documents indexés',
    icon: '✅',
    color: 'bg-indigo-100 text-indigo-800',
    team: 'Service SCAN'
  },
  {
    status: 'A_AFFECTER',
    label: 'À affecter',
    description: 'Prêt pour affectation à un gestionnaire',
    icon: '👥',
    color: 'bg-purple-100 text-purple-800',
    team: 'Chef d\'Équipe'
  },
  {
    status: 'ASSIGNE',
    label: 'Assigné',
    description: 'Affecté à un gestionnaire santé',
    icon: '👤',
    color: 'bg-purple-100 text-purple-800',
    team: 'Gestionnaire'
  },
  {
    status: 'EN_COURS',
    label: 'En cours',
    description: 'Traitement métier en cours',
    icon: '⚡',
    color: 'bg-yellow-100 text-yellow-800',
    team: 'Gestionnaire'
  },
  {
    status: 'TRAITE',
    label: 'Traité',
    description: 'Traitement terminé, validation effectuée',
    icon: '✅',
    color: 'bg-green-100 text-green-800',
    team: 'Gestionnaire'
  },
  {
    status: 'PRET_VIREMENT',
    label: 'Prêt virement',
    description: 'Prêt pour génération du virement',
    icon: '💰',
    color: 'bg-teal-100 text-teal-800',
    team: 'Service Financier'
  },
  {
    status: 'VIREMENT_EN_COURS',
    label: 'Virement en cours',
    description: 'Ordre de virement généré et transmis',
    icon: '🏦',
    color: 'bg-cyan-100 text-cyan-800',
    team: 'Service Financier'
  },
  {
    status: 'VIREMENT_EXECUTE',
    label: 'Virement exécuté',
    description: 'Virement confirmé par la banque',
    icon: '✅',
    color: 'bg-emerald-100 text-emerald-800',
    team: 'Service Financier'
  },
  {
    status: 'CLOTURE',
    label: 'Clôturé',
    description: 'Dossier terminé et archivé',
    icon: '🔒',
    color: 'bg-gray-100 text-gray-800',
    team: 'Système'
  }
];

interface Props {
  currentStatus: Statut;
  onStatusClick?: (status: Statut) => void;
  showDetails?: boolean;
}

const BordereauWorkflowViewer: React.FC<Props> = ({ 
  currentStatus, 
  onStatusClick, 
  showDetails = true 
}) => {
  const getCurrentStepIndex = () => {
    return workflowSteps.findIndex(step => step.status === currentStatus);
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <span className="mr-2">🔄</span>
          Workflow du Bordereau
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Suivi du processus de traitement du bordereau
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progression</span>
          <span className="text-sm text-gray-500">
            {currentStepIndex + 1} / {workflowSteps.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${((currentStepIndex + 1) / workflowSteps.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="space-y-4">
        {workflowSteps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isPending = index > currentStepIndex;

          return (
            <div
              key={step.status}
              className={`flex items-start p-4 rounded-lg border-2 transition-all duration-300 ${
                isCurrent 
                  ? 'border-blue-500 bg-blue-50' 
                  : isCompleted 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200 bg-gray-50'
              } ${onStatusClick ? 'cursor-pointer hover:shadow-md' : ''}`}
              onClick={() => onStatusClick?.(step.status)}
            >
              {/* Step Icon */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                isCurrent 
                  ? 'bg-blue-500 text-white' 
                  : isCompleted 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-300 text-gray-600'
              }`}>
                {isCompleted ? '✓' : step.icon}
              </div>

              {/* Step Content */}
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className={`font-semibold ${
                    isCurrent ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-600'
                  }`}>
                    {step.label}
                  </h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${step.color}`}>
                    {step.team}
                  </span>
                </div>
                
                {showDetails && (
                  <p className={`text-sm mt-1 ${
                    isCurrent ? 'text-blue-700' : isCompleted ? 'text-green-700' : 'text-gray-500'
                  }`}>
                    {step.description}
                  </p>
                )}

                {/* Status Indicator */}
                <div className="flex items-center mt-2">
                  {isCompleted && (
                    <span className="text-xs text-green-600 font-medium">
                      ✓ Terminé
                    </span>
                  )}
                  {isCurrent && (
                    <span className="text-xs text-blue-600 font-medium flex items-center">
                      <span className="animate-pulse mr-1">●</span>
                      En cours
                    </span>
                  )}
                  {isPending && (
                    <span className="text-xs text-gray-400 font-medium">
                      En attente
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow for non-last steps */}
              {index < workflowSteps.length - 1 && (
                <div className="flex-shrink-0 ml-4">
                  <div className={`w-6 h-6 flex items-center justify-center ${
                    isCompleted ? 'text-green-500' : 'text-gray-300'
                  }`}>
                    ↓
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Légende :</h4>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
            <span className="text-gray-600">Terminé</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
            <span className="text-gray-600">En cours</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-300 rounded-full mr-1"></div>
            <span className="text-gray-600">En attente</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BordereauWorkflowViewer;