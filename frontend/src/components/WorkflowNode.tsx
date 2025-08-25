import React from 'react';
import { Statut } from '../types/bordereaux';

interface WorkflowNodeProps {
  label: string;
  statut: Statut;
  onClick?: () => void;
}

const statutMap: Record<Statut, { color: string; label: string }> = {
  EN_ATTENTE: { color: 'border-gray-400', label: 'En attente' },
  A_SCANNER: { color: 'border-orange-400', label: 'À scanner' },
  SCAN_EN_COURS: { color: 'border-yellow-500', label: 'Scan en cours' },
  SCANNE: { color: 'border-blue-500', label: 'Scanné' },
  A_AFFECTER: { color: 'border-purple-400', label: 'À affecter' },
  ASSIGNE: { color: 'border-indigo-500', label: 'Assigné' },
  EN_COURS: { color: 'border-yellow-400', label: 'En cours' },
  TRAITE: { color: 'border-green-500', label: 'Traité' },
  PRET_VIREMENT: { color: 'border-teal-500', label: 'Prêt virement' },
  VIREMENT_EN_COURS: { color: 'border-cyan-500', label: 'Virement en cours' },
  VIREMENT_EXECUTE: { color: 'border-emerald-500', label: 'Virement exécuté' },
  VIREMENT_REJETE: { color: 'border-red-600', label: 'Virement rejeté' },
  CLOTURE: { color: 'border-green-700', label: 'Clôturé' },
  EN_DIFFICULTE: { color: 'border-red-500', label: 'En difficulté' },
  PARTIEL: { color: 'border-orange-500', label: 'Partiel' },
  MIS_EN_INSTANCE: { color: 'border-yellow-600', label: 'Mis en instance' },
  REJETE: { color: 'border-red-700', label: 'Rejeté' }
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
