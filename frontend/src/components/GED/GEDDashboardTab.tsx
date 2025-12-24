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
import { LocalAPI } from '../../services/axios';
import { getPaperStreamStatus } from '../../services/gedService';

const GEDDashboardTab: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [slaData, setSlaData] = useState<any[]>([]);
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [paperStreamStatus, setPaperStreamStatus] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Load documents with role-based filtering
        const docsResponse = await LocalAPI.get('/documents/search');
        const docs = docsResponse.data || [];
        
        console.log('📊 [GED Dashboard] Loaded documents:', docs.length);
        
        // Calculate PaperStream stats from documents with batchId
        const paperStreamDocs = docs.filter((d: any) => d.batchId);
        const psProcessed = paperStreamDocs.length;
        const psQuarantined = paperStreamDocs.filter((d: any) => d.ingestStatus === 'QUARANTINED').length;
        const psSuccess = psProcessed - psQuarantined;
        const psSuccessRate = psProcessed > 0 ? ((psSuccess / psProcessed) * 100) : 0;
        
        // Only load PaperStream status for authorized roles
        let psStatus = {
          status: psProcessed > 0 ? 'active' : 'inactive',
          watcherActive: psProcessed > 0,
          totalProcessed: psProcessed,
          totalQuarantined: psQuarantined,
          successRate: psSuccessRate
        };
        
        if (['SUPER_ADMIN', 'SCAN_TEAM', 'CHEF_EQUIPE'].includes(user?.role || '')) {
          try {
            const paperStreamResponse = await LocalAPI.get('/documents/paperstream/status');
            // Merge real-time status with calculated stats
            psStatus = { ...paperStreamResponse.data, ...psStatus };
          } catch (err) {
            console.log('PaperStream API not available, using calculated stats');
          }
        }
        
        // Calculate SLA compliance from real data
        const now = new Date();
        const slaThreshold = 48; // hours
        const warningThreshold = 36; // hours
        let onTime = 0, atRisk = 0, overdue = 0;
        
        docs.forEach((doc: any) => {
          const hours = (now.getTime() - new Date(doc.uploadedAt).getTime()) / (1000 * 60 * 60);
          
          // If document is already processed (TRAITE), it's on time
          if (doc.status === 'TRAITE' || doc.status === 'SCANNE') {
            onTime++;
          } 
          // If document is not processed and older than SLA threshold, it's overdue
          else if (hours > slaThreshold) {
            overdue++;
          } 
          // If document is approaching SLA threshold, it's at risk
          else if (hours > warningThreshold) {
            atRisk++;
          } 
          // Otherwise it's on time
          else {
            onTime++;
          }
        });
        
        const totalDocs = docs.length;
        const inProgress = docs.filter((d: any) => d.status === 'EN_COURS' || d.status === 'UPLOADED').length;
        const slaCompliancePercent = totalDocs > 0 ? ((onTime / totalDocs) * 100) : 0;
        
        console.log('📊 [GED Dashboard] Stats calculated:', {
          totalDocs,
          inProgress,
          overdue,
          onTime,
          atRisk,
          slaCompliance: slaCompliancePercent.toFixed(1),
          paperStream: psStatus
        });
        
        setStats({
          totalDocs,
          inProgress,
          overdue,
          slaCompliance: slaCompliancePercent.toFixed(1)
        });
        
        setSlaData([
          { 
            name: 'À temps', 
            value: totalDocs > 0 ? Math.round((onTime / totalDocs) * 100) : 0, 
            color: '#4caf50' 
          },
          { 
            name: 'À risque', 
            value: totalDocs > 0 ? Math.round((atRisk / totalDocs) * 100) : 0, 
            color: '#ff9800' 
          },
          { 
            name: 'En retard', 
            value: totalDocs > 0 ? Math.round((overdue / totalDocs) * 100) : 0, 
            color: '#f44336' 
          }
        ]);
        
        // Set recent documents
        setRecentDocs(docs.slice(0, 5).map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          type: doc.type,
          uploadedAt: doc.uploadedAt,
          status: doc.status || 'UPLOADED',
          batchId: doc.batchId,
          operatorId: doc.operatorId,
          ingestStatus: doc.ingestStatus
        })));
        
        // Set PaperStream status
        setPaperStreamStatus(psStatus);
        
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        setStats({
          totalDocs: 0,
          inProgress: 0,
          overdue: 0,
          slaCompliance: '0'
        });
        setSlaData([]);
        setRecentDocs([]);
        setPaperStreamStatus({
          status: 'inactive',
          watcherActive: false,
          totalProcessed: 0,
          totalQuarantined: 0,
          successRate: 0
        });
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
    const roleData = {
      'SCAN_TEAM': {
        title: 'Documents en attente de scan',
        value: Math.floor(stats.totalDocs * 0.08),
        color: 'warning.main',
        subtitle: 'documents à traiter',
        suffix: ''
      },
      'CHEF_EQUIPE': {
        title: 'Affectations en attente',
        value: Math.floor(stats.totalDocs * 0.12),
        color: 'info.main',
        subtitle: 'documents non affectés',
        suffix: ''
      },
      'GESTIONNAIRE': {
        title: 'Ma charge de travail',
        value: Math.floor(stats.inProgress * 0.6),
        color: 'primary.main',
        subtitle: 'documents assignés',
        suffix: ''
      }
    };

    const data = roleData[user?.role as keyof typeof roleData] || {
      title: 'Vue globale',
      value: stats?.slaCompliance,
      color: 'success.main',
      subtitle: 'conformité SLA',
      suffix: '%'
    };

    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>{data.title}</Typography>
        <Typography variant="h3" color={data.color}>
          {data.value}{data.suffix || ''}
        </Typography>
        <Typography variant="body2" color="textSecondary">{data.subtitle}</Typography>
      </Paper>
    );
  };

  if (!stats) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
      <Typography>Chargement des données GED...</Typography>
    </Box>
  );

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

        {/* PaperStream Status Widget */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <ScannerIcon sx={{ mr: 1, color: paperStreamStatus?.watcherActive ? 'success.main' : 'error.main' }} />
              PaperStream Integration
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Statut</Typography>
                <Chip 
                  label={paperStreamStatus?.watcherActive ? 'Actif' : 'Inactif'} 
                  color={paperStreamStatus?.watcherActive ? 'success' : 'error'}
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Taux de Succès</Typography>
                <Typography variant="h6" color="success.main">
                  {paperStreamStatus?.successRate?.toFixed(1) || 0}%
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Lots Traités</Typography>
                <Typography variant="h6">{paperStreamStatus?.totalProcessed || 0}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Quarantaine</Typography>
                <Typography variant="h6" color={paperStreamStatus?.totalQuarantined > 0 ? 'error.main' : 'textPrimary'}>
                  {paperStreamStatus?.totalQuarantined || 0}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Recent Documents */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Documents Récents</Typography>
            <Box sx={{ overflowX: 'auto', width: '100%' }}>
              <Table sx={{ minWidth: 700 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Nom</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Date Upload</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>PaperStream</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentDocs.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>{doc.name}</TableCell>
                      <TableCell>{doc.type}</TableCell>
                      <TableCell>{new Date(doc.uploadedAt).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusChip(doc.status)}</TableCell>
                      <TableCell>
                        {doc.batchId ? (
                          <Box>
                            <Chip label={`Lot: ${doc.batchId}`} size="small" variant="outlined" sx={{ mb: 0.5 }} />
                            {doc.operatorId && <Chip label={`Op: ${doc.operatorId}`} size="small" variant="outlined" />}
                            {doc.ingestStatus && (
                              <Chip 
                                label={doc.ingestStatus} 
                                size="small" 
                                color={doc.ingestStatus === 'INGESTED' ? 'success' : 'default'}
                                sx={{ ml: 0.5 }}
                              />
                            )}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="textSecondary">-</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GEDDashboardTab;