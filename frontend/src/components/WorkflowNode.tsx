import React from 'react';
import { Statut } from '../types/bordereaux';

interface WorkflowNodeProps {
  label: string;
  statut: Statut;
  onClick?: () => void;
}

const statutMap: Record<Statut, { color: string; label: string }> = {
  EN_ATTENTE: { color: 'border-gray-400', label: 'En attente' },
  SCAN_EN_COURS: { color: 'border-yellow-500', label: 'Scan en cours' },
  SCAN_TERMINE: { color: 'border-blue-500', label: 'Scan terminé' },
  ASSIGNE: { color: 'border-indigo-500', label: 'Assigné' },
  TRAITE: { color: 'border-green-500', label: 'Traité' },
  CLOTURE: { color: 'border-green-700', label: 'Clôturé' },
  EN_DIFFICULTE: { color: 'border-red-500', label: 'En difficulté' },
  EN_COURS: { color: 'border-yellow-400', label: 'En cours' },
  PARTIEL: { color: 'border-orange-500', label: 'Partiel' },
};

const WorkflowNode: React.FC<WorkflowNodeProps> = ({ label, statut, onClick }) => {
  const { color, label: statutLabel } = statutMap[statut] || { color: 'border-gray-300', label: statut };
  return (
    <div
      className={`border-2 ${color} rounded p-4 cursor-pointer text-center`}
      onClick={onClick}
    >
      <div className="font-bold text-lg">{label}</div>
      <div className="text-xs mt-2">{statutLabel}</div>
    </div>
  );
};

export default WorkflowNode;
