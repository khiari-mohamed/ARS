import React, { useEffect, useState } from 'react';
import KPIWidgets from './KPIWidgets';
import PerformanceChart from './PerformanceChart';
import SLAStatusPanel from './SLAStatusPanel';
import RoleSpecificPanel from './RoleSpecificPanel';
import AlertsPanel from './AlertsPanel';
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
  const [filters, setFilters] = useState<any>({});
  const [departments, setDepartments] = useState<any[]>([]);

  // Handle filter changes
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
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
    <div style={{ padding: 24 }}>
      <h2>Dashboard</h2>
      {/* Filter Controls */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <label>
          Department:&nbsp;
          <select name="departmentId" onChange={handleFilterChange} value={filters.departmentId || ''}>
            <option value="">All</option>
            {departments.map((department: any) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          From:&nbsp;
          <input type="date" name="fromDate" onChange={handleFilterChange} value={filters.fromDate || ''} />
        </label>
        <label>
          To:&nbsp;
          <input type="date" name="toDate" onChange={handleFilterChange} value={filters.toDate || ''} />
        </label>
        {/* Add more filters as needed */}
      </div>
      <KPIWidgets kpis={kpis} />
      <div style={{ display: 'flex', gap: 24, marginTop: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <SLAStatusPanel slaStatus={slaStatus} />
          <PerformanceChart data={performance} />
        </div>
        <div style={{ flex: 1, minWidth: 320 }}>
          <AlertsPanel alerts={alerts} />
          <UserPerformance data={performance} />
        </div>
      </div>
      <div style={{ marginTop: 32 }}>
        <LineChart data={charts.trend || []} dataKey="count" label="BS traités" />
      </div>
      <div style={{ marginTop: 32 }}>
        <RoleSpecificPanel role={user?.role ?? ''} data={{ kpis, performance, alerts }} />
      </div>
      <div style={{ marginTop: 32 }}>
        <FeedbackForm page="dashboard" />
      </div>
    </div>
  );
};

export default Dashboard;