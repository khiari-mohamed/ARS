import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Grid, Tabs, Tab, useTheme, useMediaQuery,
  FormControl, InputLabel, Select, MenuItem, TextField, Button, Stack
} from '@mui/material';
import GlobalKPIHeader from './GlobalKPIHeader';
import OverviewTab from './OverviewTab';
import PerformanceTab from './PerformanceTab';
import ClaimsTab from './ClaimsTab';
import SLARiskTab from './SLARiskTab';
import ForecastingTab from './ForecastingTab';
import ReportsTab from './ReportsTab';
import AdvancedFilteringDashboard from './AdvancedFilteringDashboard';
import ScheduledReportsManager from './ScheduledReportsManager';
import PredictiveAnalyticsDashboard from './PredictiveAnalyticsDashboard';
import AnalyticsMobileView from './AnalyticsMobileView';
import { useAuth } from '../../contexts/AuthContext';

interface AnalyticsFilters {
  dateRange: string;
  clientId?: string;
  departmentId?: string;
  teamId?: string;
  status?: string;
  slaStatus?: string;
}

const AnalyticsDashboard: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: 'last30days'
  });
  const [globalKPIs, setGlobalKPIs] = useState<any>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();

  useEffect(() => {
    // Load global KPIs based on filters
    const loadGlobalKPIs = async () => {
      try {
        // Mock data - replace with actual API calls
        setGlobalKPIs({
          slaCompliance: 87.5,
          totalBordereaux: 1245,
          avgProcessingTime: 3.2,
          rejectionRate: 2.1,
          activeAlerts: 8
        });
      } catch (error) {
        console.error('Failed to load global KPIs:', error);
      }
    };
    loadGlobalKPIs();
  }, [filters]);

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const resetFilters = () => {
    setFilters({ dateRange: 'last30days' });
  };

  const getDateRange = () => {
    const now = new Date();
    switch (filters.dateRange) {
      case 'today':
        return { fromDate: now.toISOString().split('T')[0], toDate: now.toISOString().split('T')[0] };
      case 'last7days':
        const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { fromDate: week.toISOString().split('T')[0], toDate: now.toISOString().split('T')[0] };
      case 'last30days':
        const month = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { fromDate: month.toISOString().split('T')[0], toDate: now.toISOString().split('T')[0] };
      default:
        return {};
    }
  };

  const tabLabels = [
    'Vue d\'ensemble',
    'Performance',
    'Réclamations',
    'Risques SLA',
    'Prévisions',
    'Filtrage Avancé',
    'Rapports Programmés',
    'Analyses Prédictives',
    'Rapports'
  ];

  return (
    <Box sx={{ p: 2 }}>
      {/* Global KPI Header */}
      <GlobalKPIHeader kpis={globalKPIs} />

      {/* Mobile View */}
      {isMobile && (
        <AnalyticsMobileView 
          filters={filters}
          onFilterChange={handleFilterChange}
          onTabChange={setTab}
          globalKPIs={globalKPIs}
        />
      )}

      {/* Desktop View */}
      {!isMobile && (
        <>
          {/* Filters Bar */}
          <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Période</InputLabel>
                <Select
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  label="Période"
                >
                  <MenuItem value="today">Aujourd'hui</MenuItem>
                  <MenuItem value="last7days">7 derniers jours</MenuItem>
                  <MenuItem value="last30days">30 derniers jours</MenuItem>
                  <MenuItem value="last3months">3 derniers mois</MenuItem>
                  <MenuItem value="custom">Personnalisé</MenuItem>
                </Select>
              </FormControl>

              <TextField
                size="small"
                label="Client"
                value={filters.clientId || ''}
                onChange={(e) => handleFilterChange('clientId', e.target.value)}
                sx={{ minWidth: 150 }}
              />

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Département</InputLabel>
                <Select
                  value={filters.departmentId || ''}
                  onChange={(e) => handleFilterChange('departmentId', e.target.value)}
                  label="Département"
                >
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="scan">SCAN</MenuItem>
                  <MenuItem value="bo">Bureau d'Ordre</MenuItem>
                  <MenuItem value="gestion">Gestion</MenuItem>
                  <MenuItem value="finance">Finance</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status SLA</InputLabel>
                <Select
                  value={filters.slaStatus || ''}
                  onChange={(e) => handleFilterChange('slaStatus', e.target.value)}
                  label="Status SLA"
                >
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="ontime">À temps</MenuItem>
                  <MenuItem value="atrisk">À risque</MenuItem>
                  <MenuItem value="overdue">En retard</MenuItem>
                </Select>
              </FormControl>

              <Button variant="outlined" onClick={resetFilters} size="small">
                Réinitialiser
              </Button>
            </Stack>
          </Paper>

          {/* Main Content */}
          <Paper elevation={2} sx={{ p: 3 }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{ mb: 3 }}
              variant="scrollable"
              scrollButtons="auto"
            >
              {tabLabels.map((label, index) => (
                <Tab key={index} label={label} />
              ))}
            </Tabs>

            <Box>
              {tab === 0 && <OverviewTab filters={filters} dateRange={getDateRange()} />}
              {tab === 1 && <PerformanceTab filters={filters} dateRange={getDateRange()} />}
              {tab === 2 && <ClaimsTab filters={filters} dateRange={getDateRange()} />}
              {tab === 3 && <SLARiskTab filters={filters} dateRange={getDateRange()} />}
              {tab === 4 && <ForecastingTab filters={filters} dateRange={getDateRange()} />}
              {tab === 5 && <AdvancedFilteringDashboard />}
              {tab === 6 && <ScheduledReportsManager />}
              {tab === 7 && <PredictiveAnalyticsDashboard />}
              {tab === 8 && <ReportsTab filters={filters} dateRange={getDateRange()} />}
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default AnalyticsDashboard;