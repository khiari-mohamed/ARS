import React from 'react';
import { useAlertEscalationFlag } from '../../hooks/useAnalytics';

const AlertEscalationBanner: React.FC = () => {
  const { data, isLoading, error } = useAlertEscalationFlag();
  if (isLoading) return null;
  if (error) return null;
  if (!data?.escalate) return null;
  return (
    <div className="bg-red-600 text-white p-3 rounded mb-4 text-center font-bold">
      🚨 Escalade requise : des alertes critiques sont présentes !
    </div>
  );
};
export default AlertEscalationBanner;
