import React from 'react';
import { ReclamationStatus } from '../../types/reclamation.d';

const steps: { key: ReclamationStatus; label: string }[] = [
  { key: 'OPEN', label: 'Ouverte' },
  { key: 'IN_PROGRESS', label: 'En traitement' },
  { key: 'ESCALATED', label: 'Escaladée' },
  { key: 'PENDING_CLIENT_REPLY', label: 'Attente client' },
  { key: 'RESOLVED', label: 'Résolue' },
  { key: 'CLOSED', label: 'Clôturée' },
];

export const ProcessFlow: React.FC<{ status: ReclamationStatus }> = ({ status }) => {
  const currentIdx = steps.findIndex(s => s.key === status);
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2">
      {steps.map((step, idx) => (
        <React.Fragment key={step.key}>
          <div
            className={`flex flex-col items-center ${
              idx === currentIdx
                ? 'text-blue-600 font-bold' : idx < currentIdx
                ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                idx === currentIdx
                  ? 'border-blue-600 bg-blue-100' : idx < currentIdx
                  ? 'border-green-600 bg-green-100' : 'border-gray-300 bg-gray-100'
              }`}
            >
              {idx + 1}
            </div>
            <span className="text-xs mt-1 whitespace-nowrap">{step.label}</span>
          </div>
          {idx < steps.length - 1 && (
            <div className={`flex-1 h-1 ${idx < currentIdx ? 'bg-green-400' : 'bg-gray-200'}`}></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
