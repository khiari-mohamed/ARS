import React from 'react';
import KpiDashboard from '../../components/analytics/KpiDashboard';
import PerformanceDashboard from '../../components/analytics/PerformanceDashboard';
import TeamPerformanceDashboard from '../../components/analytics/TeamPerformanceDashboard';
import AssignedTasksDashboard from '../../components/analytics/AssignedTasksDashboard';
import FinanceDashboard from '../../components/analytics/FinanceDashboard';
import BacklogDashboard from '../../components/analytics/BacklogDashboard';

interface RoleSpecificPanelProps {
  role: string;
  data: {
    kpis: any;
    performance: any[];
    alerts: any[];
    // Add other relevant data types as needed
  };
}

const RoleSpecificPanel: React.FC<RoleSpecificPanelProps> = ({ role, data }) => {
  console.log('[RoleSpecificPanel] Rendered with role:', role, 'data:', data);

  switch (role) {
    case 'ADMIN':
    case 'ADMINISTRATEUR':
      return (
        <div role="region" aria-label="Admin Dashboard">
          {/* These components fetch their own data, do not pass 'data' */}
          <KpiDashboard />
          <PerformanceDashboard />
        </div>
      );
    case 'CHEF_EQUIPE':
      return (
        <div role="region" aria-label="Team Performance Dashboard">
          {/* If TeamPerformanceDashboard expects data, pass it; otherwise, remove 'data' */}
          <TeamPerformanceDashboard data={data.performance} />
        </div>
      );
    case 'GESTIONNAIRE':
      return (
        <div role="region" aria-label="Assigned Tasks Dashboard">
          <AssignedTasksDashboard data={data.alerts} />
        </div>
      );
    case 'FINANCE':
      return (
        <div role="region" aria-label="Finance Dashboard">
          <FinanceDashboard data={data.kpis} />
        </div>
      );
    case 'BO':
    case 'SCAN':
      return (
        <div role="region" aria-label="Backlog Dashboard">
          <BacklogDashboard data={data.alerts} />
        </div>
      );
    default:
      return <div role="alert">Role-specific widgets unavailable</div>;
  }
};

export default RoleSpecificPanel;