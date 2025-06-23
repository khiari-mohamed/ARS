import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { normalizeAnalyticsRole } from '../../utils/roleMap';

import KpiDashboard from './KpiDashboard';
import PerformanceDashboard from './PerformanceDashboard';
import AlertsPanel from './AlertsPanel';
import RecommendationsPanel from './RecommendationsPanel';
import TrendsChart from './TrendsChart';
import ExportButton from './ExportButton';
import AlertEscalationBanner from './AlertEscalationBanner';
import SlaComplianceChart from './SlaComplianceChart';
import ReclamationPerformanceTable from './ReclamationPerformanceTable';
import ClientSlaVolumeDashboard from './ClientSlaVolumeDashboard';
import DailyTargetTable from './DailyTargetTable';
import PriorityScoreList from './PriorityScoreList';
import PeriodComparisonChart from './PeriodComparisonChart';
import SlaTrendChart from './SlaTrendChart';
import ThroughputGapKPI from './ThroughputGapKPI';
import StaffingDashboard from './StaffingDashboard';
import TraceabilityPanel from './TraceabilityPanel';

const RoleSpecificPanel: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const normalizedRole = normalizeAnalyticsRole(user.role);

  switch (normalizedRole) {
    case 'ADMINISTRATEUR':
      return (
        <div className="analytics-dashboard-grid">
          <div className="analytics-dashboard-row">
            <AlertEscalationBanner />
          </div>
          <div className="analytics-dashboard-row grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <KpiDashboard />
            <PerformanceDashboard />
            <AlertsPanel />
          </div>
          <div className="analytics-dashboard-row grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            <RecommendationsPanel />
            <SlaComplianceChart />
            <ReclamationPerformanceTable />
            <ClientSlaVolumeDashboard />
            <DailyTargetTable />
            <PriorityScoreList />
            <ThroughputGapKPI />
            <StaffingDashboard />
            <TraceabilityPanel />
          </div>
          <div className="analytics-dashboard-row grid-cols-1 md:grid-cols-2 gap-6">
            <PeriodComparisonChart />
            <SlaTrendChart />
            <TrendsChart />
          </div>
          <div className="analytics-dashboard-row">
            <ExportButton />
          </div>
        </div>
      );
    case 'CHEF_EQUIPE':
      return (
        <div className="space-y-6">
          <AlertEscalationBanner />
          <KpiDashboard />
          <PerformanceDashboard />
          <AlertsPanel />
          <RecommendationsPanel />
          <SlaComplianceChart />
          <ReclamationPerformanceTable />
          <ClientSlaVolumeDashboard />
          <DailyTargetTable />
          <PriorityScoreList />
          <PeriodComparisonChart />
          <SlaTrendChart />
        </div>
      );
    case 'GESTIONNAIRE':
      return (
        <div className="space-y-6">
          <KpiDashboard />
          <PerformanceDashboard />
        </div>
      );
    default:
      return <KpiDashboard />;
  }
};

export default RoleSpecificPanel;