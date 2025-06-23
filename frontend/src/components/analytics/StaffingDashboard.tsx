import React from 'react';
import { useStaffing } from '../../hooks/useAnalytics';

const StaffingDashboard: React.FC = () => {
  const { data, isLoading, error } = useStaffing();
  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div className="text-red-600">Erreur chargement staffing</div>;
  const needed = data?.neededStaff ?? 0;
  const max = 20;
  const percent = Math.min((needed / max) * 100, 100);
  return (
    <div className="bg-white rounded shadow p-4 flex flex-col items-center w-full max-w-md mx-auto">
      <div className="text-lg font-bold mb-2">Effectif Requis</div>
      <div className="w-full mb-2">
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-4 bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${percent}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span>0</span>
          <span>{max}</span>
        </div>
      </div>
      <div className="text-2xl font-bold text-blue-700 mb-1">{needed}</div>
      <div className="text-sm text-gray-700 mb-2">{data?.recommendation ?? '-'}</div>
    </div>
  );
};
export default StaffingDashboard;
