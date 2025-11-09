import React, { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Chip, Box, CircularProgress, Card, CardContent } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { LocalAPI } from '../../services/axios';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupIcon from '@mui/icons-material/Group';
import SpeedIcon from '@mui/icons-material/Speed';
import AssessmentIcon from '@mui/icons-material/Assessment';

interface Props {
  filters: any;
  dateRange: any;
}

const PerformanceTab: React.FC<Props> = ({ filters, dateRange }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [performanceKpis, setPerformanceKpis] = useState<any>(null);

  const loadPerformanceData = async () => {
    try {
      setLoading(true);
      
      const [performanceResponse, slaResponse, kpiResponse] = await Promise.all([
        LocalAPI.get('/analytics/performance/by-user', { params: dateRange }),
        LocalAPI.get('/analytics/sla-compliance-by-user'),
        LocalAPI.get('/analytics/kpis/daily', { params: dateRange })
      ]);

      const performanceData = performanceResponse.data;
      const slaData = slaResponse.data;
      const kpiData = kpiResponse.data;

      // Calculate performance KPIs
      const totalProcessed = performanceData.processedByUser?.reduce((sum: number, user: any) => sum + (user._count?.id || 0), 0) || 0;
      
      // Get total active users from system (not just those with processed bordereaux)
      const totalUsersResponse = await LocalAPI.get('/users/count-active');
      const totalUsers = totalUsersResponse.data.count || 0;
      
      const activeUsersWithData = slaData.filter((user: any) => user.userName && user.total > 0);
      const avgSlaCompliance = activeUsersWithData.length > 0 ? Math.round(activeUsersWithData.reduce((sum: any, user: any) => sum + (user.complianceRate || 0), 0) / activeUsersWithData.length) : 0;
      const avgProcessingTime = kpiData.avgDelay || 0;

      setPerformanceKpis({
        totalProcessed,
        avgSlaCompliance,
        totalUsers,
        avgProcessingTime
      });

      // Get department performance from backend
      const deptPerformanceResponse = await LocalAPI.get('/analytics/performance/by-department', { params: dateRange });
      const departmentPerformance = deptPerformanceResponse.data || [];
      


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
        userPerformance: slaData.slice(0, 10)
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
  }, [filters, dateRange]);

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
            <Grid item xs={12} sm={6} md={3}>
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
            </Grid>
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
          </Grid>
        </Grid>
      )}

      {/* Department Performance Chart */}
      <Grid item xs={12} md={8}>
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
      </Grid>

      {/* Team Ranking */}
      <Grid item xs={12} md={4}>
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
      </Grid>
      
      {/* Department Performance Table */}
      <Grid item xs={12}>
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
      </Grid>
    </Grid>
  );
};

export default PerformanceTab;