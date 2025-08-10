import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add,
  Upload,
  Assessment,
  Speed,
  Error,
  CheckCircle,
  Visibility,
  FileUpload,
  BatchPrediction
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import BOEntryForm from '../components/BOEntryForm';
import BOBatchForm from '../components/BOBatchForm';
import BOPerformanceMetrics from '../components/BOPerformanceMetrics';
import DocumentUploadPortal from '../components/DocumentUploadPortal';
import { fetchBODashboard } from '../services/boService';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const BODashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await fetchBODashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load BO dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'EN_ATTENTE': return 'warning';
      case 'EN_COURS': return 'info';
      case 'TRAITE': return 'success';
      case 'CLOTURE': return 'success';
      case 'EN_DIFFICULTE': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={600}>
          Bureau d'Ordre Dashboard
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setActiveDialog('entry')}
            sx={{ minWidth: 140 }}
          >
            Nouvelle Entrée
          </Button>
          <Button
            variant="outlined"
            startIcon={<BatchPrediction />}
            onClick={() => setActiveDialog('batch')}
            sx={{ minWidth: 140 }}
          >
            Entrée Lot
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileUpload />}
            onClick={() => setActiveDialog('upload')}
            sx={{ minWidth: 140 }}
          >
            Upload Documents
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Entrées Aujourd'hui
                  </Typography>
                  <Typography variant="h4" component="div">
                    {dashboardData?.todayEntries || 0}
                  </Typography>
                </Box>
                <Add color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    En Attente
                  </Typography>
                  <Typography variant="h4" component="div">
                    {dashboardData?.pendingEntries || 0}
                  </Typography>
                </Box>
                <Error color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Vitesse Moyenne
                  </Typography>
                  <Typography variant="h4" component="div">
                    {dashboardData?.performance?.entrySpeed?.toFixed(1) || '0.0'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    entrées/heure
                  </Typography>
                </Box>
                <Speed color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Taux d'Erreur
                  </Typography>
                  <Typography variant="h4" component="div">
                    {dashboardData?.performance?.errorRate?.toFixed(1) || '0.0'}%
                  </Typography>
                </Box>
                <Assessment color="secondary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Distribution par Statut (7 derniers jours)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData?.documentTypes || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ statut, _count }) => `${statut}: ${_count.id}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="_count.id"
                >
                  {(dashboardData?.documentTypes || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Performance Metrics
            </Typography>
            <BOPerformanceMetrics userId={user?.id} />
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Entrées Récentes
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Référence</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Date Réception</TableCell>
                    <TableCell>Nb Documents</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(dashboardData?.recentEntries || []).map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {entry.reference}
                        </Typography>
                      </TableCell>
                      <TableCell>{entry.client?.name}</TableCell>
                      <TableCell>
                        {new Date(entry.dateReception).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{entry.nombreBS}</TableCell>
                      <TableCell>
                        <Chip
                          label={entry.statut}
                          color={getStatusColor(entry.statut) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Voir Détails">
                          <IconButton size="small">
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!dashboardData?.recentEntries || dashboardData.recentEntries.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary">
                          Aucune entrée récente
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      <BOEntryForm
        open={activeDialog === 'entry'}
        onClose={() => setActiveDialog(null)}
        onSuccess={() => {
          setActiveDialog(null);
          loadDashboard();
        }}
      />

      <BOBatchForm
        open={activeDialog === 'batch'}
        onClose={() => setActiveDialog(null)}
        onSuccess={() => {
          setActiveDialog(null);
          loadDashboard();
        }}
      />

      <DocumentUploadPortal
        open={activeDialog === 'upload'}
        onClose={() => setActiveDialog(null)}
        onSuccess={() => {
          setActiveDialog(null);
          loadDashboard();
        }}
      />
    </Box>
  );
};

export default BODashboard;