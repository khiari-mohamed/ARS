import React from 'react';
import RoleSpecificPanel from '../../components/analytics/RoleSpecificPanel';

const AnalyticsDashboard: React.FC = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Analytics & KPIs</h1>
      <RoleSpecificPanel />
    </div>
  );
};

export default AnalyticsDashboard;