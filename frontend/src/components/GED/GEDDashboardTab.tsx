import React, { useState, useEffect } from 'react';
import { 
  Grid, Paper, Typography, Card, CardContent, Box, LinearProgress,
  Table, TableHead, TableRow, TableCell, TableBody, Chip
} from '@mui/material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DescriptionIcon from '@mui/icons-material/Description';
import ScannerIcon from '@mui/icons-material/Scanner';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '../../contexts/AuthContext';

const GEDDashboardTab: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [slaData, setSlaData] = useState<any[]>([]);
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Mock data - replace with actual API calls
        setStats({
          totalDocs: 1245,
          inProgress: 89,
          overdue: 12,
          slaCompliance: 87.5
        });

        setSlaData([
          { name: 'À temps', value: 75, color: '#4caf50' },
          { name: 'À risque', value: 15, color: '#ff9800' },
          { name: 'En retard', value: 10, color: '#f44336' }
        ]);

        setRecentDocs([
          { id: '1', name: 'BS_Client_A_001.pdf', type: 'BS', uploadedAt: '2025-01-15', status: 'SCANNE' },
          { id: '2', name: 'Contrat_Client_B.pdf', type: 'CONTRAT', uploadedAt: '2025-01-15', status: 'EN_COURS' },
          { id: '3', name: 'Justificatif_001.pdf', type: 'JUSTIFICATIF', uploadedAt: '2025-01-14', status: 'TRAITE' }
        ]);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    };
    loadDashboardData();
  }, []);

  const getStatusChip = (status: string) => {
    const statusConfig = {
      'ENREGISTRE': { label: 'Enregistré', color: 'default' },
      'SCANNE': { label: 'Scanné', color: 'info' },
      'AFFECTE': { label: 'Affecté', color: 'warning' },
      'EN_COURS': { label: 'En cours', color: 'primary' },
      'TRAITE': { label: 'Traité', color: 'success' },
      'RETOURNE': { label: 'Retourné', color: 'error' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, color: 'default' };
    return <Chip label={config.label} color={config.color as any} size="small" />;
  };

  const getRoleSpecificWidget = () => {
    switch (user?.role) {
      case 'SCAN_TEAM':
        return (
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Documents en attente de scan</Typography>
            <Typography variant="h3" color="warning.main">23</Typography>
            <Typography variant="body2" color="textSecondary">documents à traiter</Typography>
          </Paper>
        );
      case 'CHEF_EQUIPE':
        return (
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Affectations en attente</Typography>
            <Typography variant="h3" color="info.main">15</Typography>
            <Typography variant="body2" color="textSecondary">documents non affectés</Typography>
          </Paper>
        );
      case 'GESTIONNAIRE':
        return (
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Ma charge de travail</Typography>
            <Typography variant="h3" color="primary.main">8</Typography>
            <Typography variant="body2" color="textSecondary">documents assignés</Typography>
          </Paper>
        );
      default:
        return (
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Vue globale</Typography>
            <Typography variant="h3" color="success.main">{stats?.slaCompliance}%</Typography>
            <Typography variant="body2" color="textSecondary">conformité SLA</Typography>
          </Paper>
        );
    }
  };

  if (!stats) return <Typography>Chargement...</Typography>;

  return (
    <Box>
      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                <DescriptionIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Documents</Typography>
              </Box>
              <Typography variant="h3" color="primary" sx={{ fontWeight: 600 }}>
                {stats.totalDocs}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                dans le système
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                <AssignmentIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">En cours</Typography>
              </Box>
              <Typography variant="h3" color="info.main" sx={{ fontWeight: 600 }}>
                {stats.inProgress}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                en traitement
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                <ScannerIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h6">En retard</Typography>
              </Box>
              <Typography variant="h3" color="error.main" sx={{ fontWeight: 600 }}>
                {stats.overdue}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                SLA dépassé
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">SLA Compliance</Typography>
              </Box>
              <Typography variant="h3" color="success.main" sx={{ fontWeight: 600 }}>
                {stats.slaCompliance}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={stats.slaCompliance} 
                color="success"
                sx={{ mt: 1, height: 6, borderRadius: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* SLA Distribution Chart */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Répartition SLA</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={slaData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {slaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ mt: 2 }}>
              {slaData.map((item, index) => (
                <Box key={index} display="flex" alignItems="center" sx={{ mb: 1 }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: item.color, borderRadius: '50%', mr: 1 }} />
                  <Typography variant="body2">{item.name}: {item.value}%</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Role-Specific Widget */}
        <Grid item xs={12} md={6}>
          {getRoleSpecificWidget()}
        </Grid>

        {/* Recent Documents */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Documents Récents</Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Date Upload</TableCell>
                  <TableCell>Statut</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentDocs.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>{doc.name}</TableCell>
                    <TableCell>{doc.type}</TableCell>
                    <TableCell>{new Date(doc.uploadedAt).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusChip(doc.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GEDDashboardTab;