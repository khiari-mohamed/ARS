import React, { useState, useEffect } from 'react';
import { 
  Grid, Paper, Typography, Card, CardContent, Box, LinearProgress,
  Table, TableHead, TableRow, TableCell, TableBody, Chip, Alert
} from '@mui/material';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import MailIcon from '@mui/icons-material/Mail';
import SendIcon from '@mui/icons-material/Send';
import PendingIcon from '@mui/icons-material/Pending';
import WarningIcon from '@mui/icons-material/Warning';

const GECDashboardTab: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [volumeData, setVolumeData] = useState<any[]>([]);
  const [typeData, setTypeData] = useState<any[]>([]);
  const [urgentItems, setUrgentItems] = useState<any[]>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Mock data - replace with actual API calls
        setStats({
          totalThisMonth: 245,
          pendingReplies: 18,
          slaCompliance: 92.5,
          urgentCount: 5
        });

        setVolumeData([
          { date: '2025-01-10', sent: 12, received: 8 },
          { date: '2025-01-11', sent: 15, received: 10 },
          { date: '2025-01-12', sent: 18, received: 12 },
          { date: '2025-01-13', sent: 14, received: 9 },
          { date: '2025-01-14', sent: 20, received: 15 }
        ]);

        setTypeData([
          { name: 'Règlement', value: 45, color: '#1976d2' },
          { name: 'Réclamation', value: 25, color: '#d32f2f' },
          { name: 'Relance', value: 20, color: '#ed6c02' },
          { name: 'Autre', value: 10, color: '#388e3c' }
        ]);

        setUrgentItems([
          { id: '1', subject: 'Réclamation Client A - Urgent', type: 'RECLAMATION', daysOverdue: 2, priority: 'CRITIQUE' },
          { id: '2', subject: 'Relance Paiement Client B', type: 'RELANCE', daysOverdue: 1, priority: 'URGENT' },
          { id: '3', subject: 'Courrier Règlement en retard', type: 'REGLEMENT', daysOverdue: 3, priority: 'CRITIQUE' }
        ]);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    };
    loadDashboardData();
  }, []);

  const getPriorityChip = (priority: string, daysOverdue: number) => {
    if (daysOverdue > 2) return <Chip label="🔴 Critique" color="error" size="small" />;
    if (daysOverdue > 0) return <Chip label="🟠 Urgent" color="warning" size="small" />;
    return <Chip label="🟢 Normal" color="success" size="small" />;
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
                <MailIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total ce mois</Typography>
              </Box>
              <Typography variant="h3" color="primary" sx={{ fontWeight: 600 }}>
                {stats.totalThisMonth}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                courriers traités
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                <PendingIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">En attente</Typography>
              </Box>
              <Typography variant="h3" color="warning.main" sx={{ fontWeight: 600 }}>
                {stats.pendingReplies}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                réponses attendues
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                <SendIcon color="success" sx={{ mr: 1 }} />
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

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                <WarningIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h6">Urgent</Typography>
              </Box>
              <Typography variant="h3" color="error.main" sx={{ fontWeight: 600 }}>
                {stats.urgentCount}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                éléments critiques
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Volume Trend Chart */}
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Volume de Correspondance</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="sent" 
                  stroke="#1976d2" 
                  strokeWidth={3}
                  name="Envoyés"
                />
                <Line 
                  type="monotone" 
                  dataKey="received" 
                  stroke="#d32f2f" 
                  strokeWidth={3}
                  name="Reçus"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Type Distribution */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Répartition par Type</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ mt: 2 }}>
              {typeData.map((item, index) => (
                <Box key={index} display="flex" alignItems="center" sx={{ mb: 1 }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: item.color, borderRadius: '50%', mr: 1 }} />
                  <Typography variant="body2">{item.name}: {item.value}%</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Urgent Items Alert */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <WarningIcon color="error" sx={{ mr: 1 }} />
              Éléments Urgents & En Retard
            </Typography>
            
            {urgentItems.length > 0 ? (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Sujet</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Priorité</TableCell>
                    <TableCell>Jours de retard</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {urgentItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.subject}</TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>{getPriorityChip(item.priority, item.daysOverdue)}</TableCell>
                      <TableCell>
                        <Typography color="error" sx={{ fontWeight: 600 }}>
                          {item.daysOverdue} jour(s)
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Alert severity="success">
                Aucun élément urgent en retard
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GECDashboardTab;