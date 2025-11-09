import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Grid, Tabs, Tab, useTheme, useMediaQuery,
  FormControl, InputLabel, Select, MenuItem, TextField, Button, Stack,
  Chip, Typography, CircularProgress, Autocomplete
} from '@mui/material';
import GlobalKPIHeader from './GlobalKPIHeader';
import OverviewTab from './OverviewTab';
import PerformanceTab from './PerformanceTab';
import ClaimsTab from './ClaimsTab';
import SLARiskTab from './SLARiskTab';
import ForecastingTab from './ForecastingTab';
import ReportsTab from './ReportsTab';
// COMMENTED OUT: Extra components not in core requirements
// import AdvancedFilteringDashboard from './AdvancedFilteringDashboard';
// import ScheduledReportsManager from './ScheduledReportsManager';
import PredictiveAnalyticsDashboard from './PredictiveAnalyticsDashboard';
// import RealTimeDashboard from './RealTimeDashboard';
// import OVAnalyticsDashboard from './OVAnalyticsDashboard';
import DocumentTypesTab from './DocumentTypesTab';
import AnalyticsMobileView from './AnalyticsMobileView';
import { useAuth } from '../../contexts/AuthContext';
import { LocalAPI } from '../../services/axios';

interface AnalyticsFilters {
  dateRange: string;
  fromDate?: Date | null;
  toDate?: Date | null;
  clientId?: string;
  departmentId?: string;
  teamId?: string;
  status?: string;
  slaStatus?: string;
}

interface FilterOptions {
  clients: { id: string; name: string; companyName?: string }[];
  departments: { id: string; name: string; code?: string }[];
  teams: { id: string; name: string }[];
}

const AnalyticsDashboard: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: 'all',
    fromDate: null,
    toDate: null
  });
  const [globalKPIs, setGlobalKPIs] = useState<any>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    clients: [],
    departments: [],
    teams: []
  });
  const [loading, setLoading] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<string[]>([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();

  // Listen for tab change events from child components
  useEffect(() => {
    const handleTabChange = (event: any) => {
      if (event.detail && typeof event.detail.tab === 'number') {
        setTab(event.detail.tab);
      }
    };

    window.addEventListener('analytics-tab-change', handleTabChange);
    return () => window.removeEventListener('analytics-tab-change', handleTabChange);
  }, []);

  // Load filter options on component mount
  useEffect(() => {
    loadFilterOptions();
  }, []);

  // Load data when filters change
  useEffect(() => {
    loadAnalyticsData();
    updateAppliedFilters();
  }, [filters]);

  const loadFilterOptions = async () => {
    try {
      const [clientsResponse, departmentsResponse, teamsResponse] = await Promise.all([
        LocalAPI.get('/clients'),
        LocalAPI.get('/analytics/filter-options/departments'),
        LocalAPI.get('/analytics/filter-options/teams')
      ]);

      setFilterOptions({
        clients: clientsResponse.data || [],
        departments: departmentsResponse.data || [],
        teams: teamsResponse.data || []
      });
    } catch (error) {
      console.error('Failed to load filter options:', error);
      throw error;
    }
  };

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const dateRange = getDateRange();
      const filterParams = {
        ...dateRange,
        clientId: filters.clientId,
        departmentId: filters.departmentId,
        teamId: filters.teamId,
        slaStatus: filters.slaStatus
      };

      // NEW: Load analytics for all document types with SLA exclusions
      const [kpisResponse, documentStatsResponse] = await Promise.all([
        LocalAPI.get('/analytics/kpis/daily', { params: filterParams }),
        LocalAPI.get('/analytics/documents/all-types', { params: filterParams })
      ]);

      setGlobalKPIs({
        slaCompliance: kpisResponse.data.slaCompliance || 0,
        totalBordereaux: kpisResponse.data.totalCount || 0,
        avgProcessingTime: kpisResponse.data.avgDelay || 0,
        rejectionRate: kpisResponse.data.rejectionRate || 0,
        activeAlerts: kpisResponse.data.activeAlerts || 0,
        // NEW: Document type statistics
        documentStats: {
          bulletinSoin: documentStatsResponse.data?.BULLETIN_SOIN || 0,
          complementInfo: documentStatsResponse.data?.COMPLEMENT_INFORMATION || 0,
          adhesions: documentStatsResponse.data?.ADHESION || 0,
          reclamations: documentStatsResponse.data?.RECLAMATION || 0,
          contrats: documentStatsResponse.data?.CONTRAT_AVENANT || 0,
          resiliations: documentStatsResponse.data?.DEMANDE_RESILIATION || 0,
          conventions: documentStatsResponse.data?.CONVENTION_TIERS_PAYANT || 0
        },
        // NEW: SLA-applicable vs non-SLA document counts
        slaStats: {
          applicable: (documentStatsResponse.data?.BULLETIN_SOIN || 0) + 
                     (documentStatsResponse.data?.COMPLEMENT_INFORMATION || 0) + 
                     (documentStatsResponse.data?.ADHESION || 0) + 
                     (documentStatsResponse.data?.RECLAMATION || 0),
          nonApplicable: (documentStatsResponse.data?.CONTRAT_AVENANT || 0) + 
                        (documentStatsResponse.data?.DEMANDE_RESILIATION || 0) + 
                        (documentStatsResponse.data?.CONVENTION_TIERS_PAYANT || 0)
        }
      });
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      setGlobalKPIs({
        slaCompliance: 0,
        totalBordereaux: 0,
        avgProcessingTime: 0,
        rejectionRate: 0,
        activeAlerts: 0,
        documentStats: {
          bulletinSoin: 0,
          complementInfo: 0,
          adhesions: 0,
          reclamations: 0,
          contrats: 0,
          resiliations: 0,
          conventions: 0
        },
        slaStats: {
          applicable: 0,
          nonApplicable: 0
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAppliedFilters = () => {
    const applied: string[] = [];
    
    if (filters.fromDate && filters.toDate) {
      const from = filters.fromDate.toLocaleDateString('fr-FR');
      const to = filters.toDate.toLocaleDateString('fr-FR');
      applied.push(`Période: ${from} - ${to}`);
    }
    
    if (filters.clientId) {
      const client = filterOptions.clients.find(c => c.id === filters.clientId);
      applied.push(`Client: ${client?.name || filters.clientId}`);
    }
    
    if (filters.departmentId) {
      const dept = filterOptions.departments.find(d => d.id === filters.departmentId);
      applied.push(`Département: ${dept?.name || filters.departmentId}`);
    }
    
    if (filters.slaStatus) {
      const slaLabels: Record<string, string> = {
        'ontime': 'À temps',
        'atrisk': 'À risque',
        'overdue': 'En retard'
      };
      applied.push(`SLA: ${slaLabels[filters.slaStatus] || filters.slaStatus}`);
    }
    
    setAppliedFilters(applied);
  };

  const handleFilterChange = (field: string, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleFromDateChange = (date: Date | null) => {
    setFilters(prev => ({ ...prev, fromDate: date }));
  };

  const handleToDateChange = (date: Date | null) => {
    setFilters(prev => ({ ...prev, toDate: date }));
  };

  const resetFilters = () => {
    setFilters({ 
      dateRange: 'all',
      fromDate: null,
      toDate: null
    });
  };

  const removeFilter = (filterToRemove: string) => {
    if (filterToRemove.includes('Client:')) {
      setFilters(prev => ({ ...prev, clientId: undefined }));
    } else if (filterToRemove.includes('Département:')) {
      setFilters(prev => ({ ...prev, departmentId: undefined }));
    } else if (filterToRemove.includes('SLA:')) {
      setFilters(prev => ({ ...prev, slaStatus: undefined }));
    } else if (filterToRemove.includes('Période:')) {
      setFilters(prev => ({ ...prev, fromDate: null, toDate: null }));
    }
  };

  const applyFilters = () => {
    console.log('Applying filters:', filters);
    loadAnalyticsData();
    updateAppliedFilters();
  };

  const getDateRange = () => {
    if (filters.fromDate && filters.toDate) {
      return {
        fromDate: filters.fromDate.toISOString().split('T')[0],
        toDate: filters.toDate.toISOString().split('T')[0]
      };
    }
    return {};
  };

  const tabLabels = [
    'Vue d\'ensemble', 
    'Types Documents',
    'Performance',
    'Réclamations',
    'Risques SLA',
    'Prévisions',
    'Analyses Prédictives',
    'Rapports'
    // COMMENTED OUT: Extra tabs not in core requirements
    // 'Temps Réel',
    // 'OV Analytics',
    // 'Filtrage Avancé',
    // 'Rapports Programmés'
  ];

  return (
    <Box sx={{ p: 2 }}>
      {/* Global KPI Header */}
      <GlobalKPIHeader />

      {/* Mobile View */}
      {isMobile && (
        <>
          <AnalyticsMobileView 
            filters={filters}
            onFilterChange={handleFilterChange}
            onTabChange={setTab}
            globalKPIs={globalKPIs}
          />
          
          {/* Mobile Tab Content */}
          <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {tabLabels[tab]}
            </Typography>
            <Box>
              {tab === 0 && <OverviewTab filters={filters} dateRange={getDateRange()} />}
              {tab === 1 && <DocumentTypesTab filters={filters} dateRange={getDateRange()} />}
              {tab === 2 && <PerformanceTab filters={filters} dateRange={getDateRange()} />}
              {tab === 3 && <ClaimsTab filters={filters} dateRange={getDateRange()} />}
              {tab === 4 && <SLARiskTab filters={filters} dateRange={getDateRange()} />}
              {tab === 5 && <ForecastingTab filters={filters} dateRange={getDateRange()} />}
              {tab === 6 && <PredictiveAnalyticsDashboard />}
              {tab === 7 && <ReportsTab filters={filters} dateRange={getDateRange()} />}
              {/* COMMENTED OUT: Extra tabs not in core requirements */}
              {/* {tab === 8 && <RealTimeDashboard />} */}
              {/* {tab === 9 && <OVAnalyticsDashboard />} */}
              {/* {tab === 10 && <AdvancedFilteringDashboard />} */}
              {/* {tab === 11 && <ScheduledReportsManager />} */}
            </Box>
          </Paper>
        </>
      )}

      {/* Desktop View */}
      {!isMobile && (
        <>
          {/* Filters Bar */}
          <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
            <Stack spacing={2}>
              {/* Filter Controls */}
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <TextField
                  label="Du"
                  type="date"
                  size="small"
                  sx={{ minWidth: 150 }}
                  value={filters.fromDate ? filters.fromDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleFromDateChange(e.target.value ? new Date(e.target.value) : null)}
                  InputLabelProps={{ shrink: true }}
                />

                <TextField
                  label="Au"
                  type="date"
                  size="small"
                  sx={{ minWidth: 150 }}
                  value={filters.toDate ? filters.toDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleToDateChange(e.target.value ? new Date(e.target.value) : null)}
                  InputLabelProps={{ shrink: true }}
                />

                <Autocomplete
                  size="small"
                  sx={{ minWidth: 150 }}
                  options={filterOptions.clients}
                  getOptionLabel={(option) => option.name || option.companyName || 'Client'}
                  value={filterOptions.clients.find(c => c.id === filters.clientId) || null}
                  onChange={(_, value) => handleFilterChange('clientId', value?.id)}
                  renderInput={(params) => <TextField {...params} label="Client" placeholder="Sélectionner un client" />}
                />

                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Département</InputLabel>
                  <Select
                    value={filters.departmentId || ''}
                    onChange={(e) => handleFilterChange('departmentId', e.target.value)}
                    label="Département"
                  >
                    <MenuItem value="">Tous les départements</MenuItem>
                    {filterOptions.departments.map((dept) => (
                      <MenuItem key={dept.id || dept.code} value={dept.id || dept.code}>{dept.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Status SLA</InputLabel>
                  <Select
                    value={filters.slaStatus || ''}
                    onChange={(e) => handleFilterChange('slaStatus', e.target.value)}
                    label="Status SLA"
                  >
                    <MenuItem value="">Tous les départements</MenuItem>
                    <MenuItem value="ontime">À temps</MenuItem>
                    <MenuItem value="atrisk">À risque</MenuItem>
                    <MenuItem value="overdue">En retard</MenuItem>
                  </Select>
                </FormControl>

                <Button 
                  variant="contained" 
                  onClick={applyFilters} 
                  size="small"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} /> : null}
                >
                  {loading ? 'Chargement...' : 'Appliquer'}
                </Button>

                <Button variant="outlined" onClick={resetFilters} size="small">
                  Réinitialiser
                </Button>
              </Stack>

              {/* Applied Filters */}
              {appliedFilters.length > 0 && (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Filtres appliqués:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {appliedFilters.map((filter, index) => (
                      <Chip
                        key={index}
                        label={filter}
                        size="small"
                        onDelete={() => removeFilter(filter)}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Paper>

          {/* Main Content */}
          <Paper elevation={2} sx={{ p: 3 }} data-analytics-tabs>
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
              {tab === 1 && <DocumentTypesTab filters={filters} dateRange={getDateRange()} />}
              {tab === 2 && <PerformanceTab filters={filters} dateRange={getDateRange()} />}
              {tab === 3 && <ClaimsTab filters={filters} dateRange={getDateRange()} />}
              {tab === 4 && <SLARiskTab filters={filters} dateRange={getDateRange()} />}
              {tab === 5 && <ForecastingTab filters={filters} dateRange={getDateRange()} />}
              {tab === 6 && <PredictiveAnalyticsDashboard />}
              {tab === 7 && <ReportsTab filters={filters} dateRange={getDateRange()} />}
              {/* COMMENTED OUT: Extra tabs not in core requirements */}
              {/* {tab === 8 && <RealTimeDashboard />} */}
              {/* {tab === 9 && <OVAnalyticsDashboard />} */}
              {/* {tab === 10 && <AdvancedFilteringDashboard />} */}
              {/* {tab === 11 && <ScheduledReportsManager />} */}
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default AnalyticsDashboard;