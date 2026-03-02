import React, { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Chip, Box, CircularProgress, Card, CardContent, Popover } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from 'recharts';
import { LocalAPI } from '../../services/axios';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupIcon from '@mui/icons-material/Group';
import SpeedIcon from '@mui/icons-material/Speed';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WarningIcon from '@mui/icons-material/Warning';

interface Props {
  filters: any;
  dateRange: any;
}

const PerformanceTab: React.FC<Props> = ({ filters, dateRange }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [performanceKpis, setPerformanceKpis] = useState<any>(null);
  const [gestionnaireFilter, setGestionnaireFilter] = useState('');
  const [gestDateRange, setGestDateRange] = useState({ fromDate: '', toDate: '' });
  const [appliedDateRange, setAppliedDateRange] = useState({ fromDate: '', toDate: '' });
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedGest, setSelectedGest] = useState<any>(null);

  const loadPerformanceData = async () => {
    try {
      setLoading(true);
      
      const gestParams: any = {};
      if (appliedDateRange.fromDate) gestParams.fromDate = appliedDateRange.fromDate;
      if (appliedDateRange.toDate) gestParams.toDate = appliedDateRange.toDate;
      
      console.log('📅 Gestionnaire date params:', gestParams);
      
      // Apply parent filters to all API calls
      const apiParams = { ...dateRange };
      if (filters.clientId) apiParams.clientId = filters.clientId;
      if (filters.slaStatus) apiParams.slaStatus = filters.slaStatus;
      
      console.log('🔍 Frontend apiParams being sent:', apiParams);
      console.log('🔍 Frontend filters:', filters);
      console.log('🔍 Frontend dateRange:', dateRange);
      
      const [performanceResponse, slaResponse, kpiResponse, gestionnairesDailyResponse, alertsResponse] = await Promise.all([
        LocalAPI.get('/analytics/performance/by-user', { params: apiParams }),
        LocalAPI.get('/analytics/sla-compliance-by-user', { params: apiParams }),
        LocalAPI.get('/analytics/kpis/daily', { params: apiParams }),
        LocalAPI.get('/analytics/gestionnaires/daily-performance', { params: gestParams }),
        LocalAPI.get('/analytics/alerts', { params: apiParams })  // ✅ FIX: Pass apiParams to alerts
      ]);

      const performanceData = performanceResponse.data;
      const slaData = slaResponse.data;
      const kpiData = kpiResponse.data;
      const alertData = alertsResponse.data;

      // Calculate performance KPIs
      const totalProcessed = performanceData.processedByUser?.reduce((sum: number, user: any) => sum + (user._count?.id || 0), 0) || 0;
      
      // Get total active users from system (not just those with processed bordereaux)
      const totalUsersResponse = await LocalAPI.get('/users/count-active');
      const totalUsers = totalUsersResponse.data.count || 0;
      
      const activeUsersWithData = slaData.filter((user: any) => user.userName && user.total > 0);
      const avgSlaCompliance = activeUsersWithData.length > 0 ? Math.round(activeUsersWithData.reduce((sum: any, user: any) => sum + (user.complianceRate || 0), 0) / activeUsersWithData.length) : 0;
      const avgProcessingTime = kpiData.avgDelay || 0;
      const enAttenteCount = kpiData.enAttenteCount || 0;

      setPerformanceKpis({
        totalProcessed,
        avgSlaCompliance,
        totalUsers,
        avgProcessingTime,
        enAttenteCount
      });

      // Get department performance from backend with filters
      const deptPerformanceResponse = await LocalAPI.get('/analytics/performance/by-department', { params: apiParams });
      const departmentPerformance = deptPerformanceResponse.data || [];
      
      console.log('📊 Department Performance Data:', departmentPerformance);
      console.log('📊 Number of departments:', departmentPerformance.length);
      
      // Process volume trend data from bsPerDay
      const volumeTrend = kpiData.bsPerDay?.map((day: any) => ({
        date: new Date(day.createdAt).toLocaleDateString('fr-FR'),
        volume: day._count?.id || 0
      })) || [];

      // Calculate SLA distribution from alert data
      const slaCompliant = alertData.ok?.length || 0;
      const slaAtRisk = alertData.warning?.length || 0;
      const slaOverdue = alertData.critical?.length || 0;
      
      const slaDistribution = [
        { name: 'À temps', value: slaCompliant, color: '#4caf50' },
        { name: 'À risque', value: slaAtRisk, color: '#ff9800' },
        { name: 'En retard', value: slaOverdue, color: '#f44336' }
      ];

      // Process team ranking from SLA data with real user names
      const teamRanking = slaData
        .filter((user: any) => user.userName && user.total > 0)
        .slice(0, 5)
        .map((user: any) => ({
          name: user.userName,
          processed: user.total,
          slaRate: Math.round(user.complianceRate)
        }));



      setData({
        departmentPerformance,
        teamRanking,
        userPerformance: slaData.slice(0, 10),
        gestionnairesDailyPerformance: gestionnairesDailyResponse.data,
        volumeTrend,
        slaDistribution
      });
    } catch (error) {
      console.error('Failed to load performance data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerformanceData();
  }, [filters, dateRange, appliedDateRange]);

  const handleApplyDateFilter = () => {
    setAppliedDateRange(gestDateRange);
  };

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>, gest: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedGest(gest);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
    setSelectedGest(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Chargement des données de performance...</Typography>
      </Box>
    );
  }

  if (!data) return <Typography>Aucune donnée de performance disponible</Typography>;

  const getSLAColor = (rate: number) => {
    if (rate >= 90) return 'success';
    if (rate >= 80) return 'warning';
    return 'error';
  };

  return (
    <Grid container spacing={3}>
      {/* Performance KPI Cards */}
      {performanceKpis && (
        <Grid item xs={12}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <AssessmentIcon color="primary" />
                    <Box>
                      <Typography variant="h4">{performanceKpis.totalProcessed}</Typography>
                      <Typography color="textSecondary">Total Traités</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <TrendingUpIcon color="success" />
                    <Box>
                      <Typography variant="h4">{performanceKpis.avgSlaCompliance}%</Typography>
                      <Typography color="textSecondary">SLA Moyen</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            {/* COMMENTED OUT: Redundant Utilisateurs Actifs - Already in Super Admin Gestion Utilisateurs */}
            {/* <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <GroupIcon color="info" />
                    <Box>
                      <Typography variant="h4">{performanceKpis.totalUsers}</Typography>
                      <Typography color="textSecondary">Utilisateurs Actifs</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid> */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <SpeedIcon color="warning" />
                    <Box>
                      <Typography variant="h4">{performanceKpis.avgProcessingTime.toFixed(1)}j</Typography>
                      <Typography color="textSecondary">Temps Moyen</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <WarningIcon color="warning" />
                    <Box>
                      <Typography variant="h4">{performanceKpis.enAttenteCount}</Typography>
                      <Typography color="textSecondary">En Attente</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', mt: 0.5 }}>
                        (EN_ATTENTE + A_SCANNER + SCAN_EN_COURS + A_AFFECTER + ASSIGNE)
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      )}

      {/* Department Performance Chart - COMMENTED OUT */}
      {/* <Grid item xs={12} md={8}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Performance par Département</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.departmentPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="slaCompliance" fill="#1976d2" name="SLA %" />
              <Bar dataKey="workload" fill="#ff9800" name="Charge" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Grid> */}

      {/* Volume Trend Chart */}
      <Grid item xs={12} md={8}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Volume de Traitement</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.volumeTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="volume" stroke="#1976d2" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* SLA Distribution Chart */}
      <Grid item xs={12} md={4}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Répartition SLA</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.slaDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value">
                {data.slaDistribution.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Daily Gestionnaire Performance */}
      <Grid item xs={12}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Performance Quotidienne des Gestionnaires</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end', bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>Nom</Typography>
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={gestionnaireFilter}
                  onChange={(e) => setGestionnaireFilter(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px' }}
                />
              </Box>
              <Box sx={{ minWidth: 150 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>Date début</Typography>
                <input
                  type="date"
                  value={gestDateRange.fromDate}
                  onChange={(e) => setGestDateRange({ ...gestDateRange, fromDate: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px' }}
                />
              </Box>
              <Box sx={{ minWidth: 150 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>Date fin</Typography>
                <input
                  type="date"
                  value={gestDateRange.toDate}
                  onChange={(e) => setGestDateRange({ ...gestDateRange, toDate: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px' }}
                />
              </Box>
              <button
                onClick={handleApplyDateFilter}
                style={{
                  padding: '10px 20px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Appliquer
              </button>
            </Box>
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Gestionnaire</TableCell>
                  <TableCell align="right">Total Documents</TableCell>
                  <TableCell align="right">Traités</TableCell>
                  <TableCell align="right">Dernières 24h</TableCell>
                  <TableCell align="right" width="200px">Progression</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.gestionnairesDailyPerformance
                  ?.filter((gest: any) => 
                    gest.name.toLowerCase().includes(gestionnaireFilter.toLowerCase())
                  )
                  .map((gest: any) => {
                  // Calculate completion rate: Traités / Total Documents
                  const completionRate = gest.documentsProcessed > 0 
                    ? (gest.documentsTraites / gest.documentsProcessed) * 100 
                    : 0;
                  
                  return (
                    <TableRow key={gest.id}>
                      <TableCell>{gest.name}</TableCell>
                      <TableCell align="right">{gest.documentsProcessed}</TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 'bold',
                            color: 'error.main'
                          }}
                        >
                          {gest.documentsTraites || 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 'bold',
                            color: gest.documentsLast24h > 0 ? 'success.main' : 'text.secondary'
                          }}
                        >
                          {gest.documentsLast24h}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: '100%', bgcolor: 'grey.200', borderRadius: 1, height: 8 }}>
                            <Box 
                              sx={{ 
                                width: `${Math.min(completionRate, 100)}%`, 
                                bgcolor: completionRate >= 80 ? 'success.main' : completionRate >= 50 ? 'warning.main' : 'error.main', 
                                borderRadius: 1, 
                                height: 8 
                              }} 
                            />
                          </Box>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              minWidth: 40, 
                              cursor: 'pointer',
                              '&:hover': { textDecoration: 'underline' }
                            }}
                            onClick={(e) => handlePopoverOpen(e, gest)}
                          >
                            {Math.round(completionRate)}%
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </Grid>

      {/* Team Ranking - COMMENTED OUT */}
      {/* <Grid item xs={12} md={4}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Top Performers</Typography>
          <Box>
            {data.teamRanking.length > 0 ? (
              data.teamRanking.map((team: any, index: number) => (
                <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1">{team.name}</Typography>
                    <Chip 
                      label={`${team.slaRate}%`} 
                      color={getSLAColor(team.slaRate) as any}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    {team.processed} bordereaux traités
                  </Typography>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 3 }}>
                Aucun gestionnaire avec des bordereaux traités dans cette période
              </Typography>
            )}
          </Box>
        </Paper>
      </Grid> */}

      {/* Formula Popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        {selectedGest && (
          <Box sx={{ p: 2, maxWidth: 300 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Calcul de Progression
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>{selectedGest.name}</strong>
            </Typography>
            <Box sx={{ bgcolor: 'grey.100', p: 1.5, borderRadius: 1, fontFamily: 'monospace' }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Progression = (Traités / Total) × 100
              </Typography>
              <Typography variant="body2" sx={{ color: 'primary.main' }}>
                = ({selectedGest.documentsTraites} / {selectedGest.documentsProcessed}) × 100
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                = {Math.round((selectedGest.documentsTraites / selectedGest.documentsProcessed) * 100)}%
              </Typography>
            </Box>
          </Box>
        )}
      </Popover>
      
      {/* Department Performance Table - COMMENTED OUT */}
      {/* <Grid item xs={12}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Détail par Département</Typography>
          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Département</TableCell>
                  <TableCell>Conformité SLA</TableCell>
                  <TableCell>Temps Moyen</TableCell>
                  <TableCell>Charge de Travail</TableCell>
                  <TableCell>Performance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.departmentPerformance.map((dept: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="subtitle2">{dept.department}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={`${dept.slaCompliance}%`} 
                        color={getSLAColor(dept.slaCompliance) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{dept.avgTime}j</TableCell>
                    <TableCell>{dept.workload}</TableCell>
                    <TableCell>
                      <Chip 
                        label={dept.slaCompliance >= 90 ? 'Excellent' : dept.slaCompliance >= 80 ? 'Bon' : 'Améliorer'}
                        color={getSLAColor(dept.slaCompliance) as any}
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </Grid> */}
    </Grid>
  );
};

export default PerformanceTab;