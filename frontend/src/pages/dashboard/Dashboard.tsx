import React, { useEffect, useState } from 'react';
import KPIWidgets from './KPIWidgets';
import PerformanceChart from './PerformanceChart';
import SLAStatusPanel from './SLAStatusPanel';
import RoleSpecificPanel from './RoleSpecificPanel';
import AlertsPanel from './AlertsPanel';
import TeamPerformanceDashboard from '../../components/analytics/TeamPerformanceDashboard';
import RecentEntriesTable from '../../components/RecentEntriesTable';
import { getKPIs, getPerformance, getSLAStatus, getAlerts, getCharts, getDepartments } from '../../services/dashboardService';
import { useAuthContext } from '../../contexts/AuthContext';
import UserPerformance from '../../components/UserPerformance';
import LineChart from '../../components/LineChart';
import FeedbackForm from '../../components/FeedbackForm';

const Dashboard: React.FC = () => {
  const { user } = useAuthContext();
  const [kpis, setKpis] = useState<any>({});
  const [performance, setPerformance] = useState<any[]>([]);
  const [slaStatus, setSlaStatus] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [charts, setCharts] = useState<any>({});
  const [filters, setFilters] = useState<any>({
    departmentId: '',
    fromDate: '',
    toDate: ''
  });
  const [departments, setDepartments] = useState<any[]>([]);

  // Handle filter changes
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev: any) => ({ ...prev, [name]: value }));
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      departmentId: '',
      fromDate: '',
      toDate: ''
    });
  };

  // Fetch departments for the filter dropdown
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const deptData = await getDepartments();
        setDepartments(deptData);
      } catch (error) {
        console.error("Error fetching departments:", error);
      }
    };
    fetchDepartments();
  }, []);

  // Polling for real-time updates, refetch on filter change
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setKpis(await getKPIs(filters));
        setPerformance(await getPerformance(filters));
        setSlaStatus(await getSLAStatus(filters));
        setAlerts(await getAlerts(filters));
        setCharts(await getCharts(filters));
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };
    fetchAll();
    const interval = setInterval(fetchAll, 15000); // 15s
    return () => clearInterval(interval);
  }, [filters]);

  return (
    <div className="dashboard-root">
      <h2 className="dashboard-title">Dashboard</h2>
      {/* Filter Controls */}
      <div className="dashboard-filters card-panel" style={{ 
        display: 'flex', 
        gap: '1rem', 
        alignItems: 'center', 
        padding: '1rem', 
        backgroundColor: '#f5f5f5', 
        borderRadius: '8px', 
        marginBottom: '1rem',
        flexWrap: 'wrap'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <strong>Department:</strong>
          <select 
            name="departmentId" 
            onChange={handleFilterChange} 
            value={filters.departmentId}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">All</option>
            {departments.map((department: any) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <strong>From:</strong>
          <input 
            type="date" 
            name="fromDate" 
            onChange={handleFilterChange} 
            value={filters.fromDate}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <strong>To:</strong>
          <input 
            type="date" 
            name="toDate" 
            onChange={handleFilterChange} 
            value={filters.toDate}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </label>
        <button 
          onClick={clearFilters}
          style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: '#1976d2', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer'
          }}
        >
          Clear Filters
        </button>
      </div>
      <div className="dashboard-kpi-row">
        <KPIWidgets kpis={kpis} />
      </div>
      <div className="dashboard-main-grid-2x2">
        <SLAStatusPanel slaStatus={slaStatus} />
        <div className="dashboard-sharp-panel">
          <h3 className="dashboard-sharp-title">Aperçu des alertes</h3>
          <AlertsPanel alerts={alerts} />
        </div>
        <div className="dashboard-sharp-panel">
          <h3 className="dashboard-sharp-title">Classement de l'équipe</h3>
          <UserPerformance data={performance} />
        </div>
        <div className="dashboard-sharp-panel">
          <h3 className="dashboard-sharp-title">Performance - BS traités</h3>
          <LineChart data={charts.trend || []} dataKey="count" label="BS traités" />
        </div>
      </div>
      {/* Recent Entries */}
      <div className="dashboard-sharp-panel mt-6">
        <RecentEntriesTable />
      </div>
      
      {/* Team Breakdown */}
      <div className="dashboard-sharp-panel mt-6">
        <h3 className="dashboard-sharp-title">Répartition par équipe</h3>
        <TeamPerformanceDashboard data={performance} />
      </div>
      {/* Client Breakdown (if available) */}
      {/* <ClientBreakdownDashboard data={clientPerformance} /> */}
      <PerformanceChart data={performance} />
      <RoleSpecificPanel role={user?.role ?? ''} data={{ kpis, performance, alerts }} />
      <FeedbackForm page="dashboard" />
    </div>
  );
};

export default Dashboard;
