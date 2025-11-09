import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Collapse,
  Stack
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import {
  Refresh,
  Download,
  Warning,
  CheckCircle,
  Error,
  TrendingUp,
  TrendingDown,
  People,
  Assignment,
  Speed,
  FilterList,
  Clear
} from '@mui/icons-material';
import { 
  getRealTimeStats, 
  exportDashboard, 
  exportPerformanceReport,
  fetchQueuesOverview,
  fetchSystemHealth,
  fetchSystemStats
} from '../services/superAdminService';
import { LocalAPI } from '../services/axios';

interface RealTimeStats {
  timestamp: string;
  systemHealth: any;
  systemStats: any;
  alerts: any;
  teamWorkload: number;
  overloadedTeams: number;
}

const RealTimeSuperAdminDashboard: React.FC = () => {
  const [realTimeData, setRealTimeData] = useState<RealTimeStats | null>(null);
  const [queuesData, setQueuesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  
  // Filter states for each table
  const [showFilters1, setShowFilters1] = useState(false);
  const [showFilters2, setShowFilters2] = useState(false);
  const [showFilters3, setShowFilters3] = useState(false);
  
  const [filters1, setFilters1] = useState({
    reference: '',
    client: '',
    type: '',
    statut: '',
    dateFrom: null as Date | null,
    dateTo: null as Date | null
  });
  
  const [filters2, setFilters2] = useState({
    reference: '',
    client: '',
    statut: '',
    dateFrom: null as Date | null,
    dateTo: null as Date | null
  });
  
  const [filters3, setFilters3] = useState({
    reference: '',
    client: '',
    type: '',
    statut: '',
    gestionnaire: '',
    dateFrom: null as Date | null,
    dateTo: null as Date | null
  });
  
  const [filteredDossiers1, setFilteredDossiers1] = useState<any[]>([]);
  const [filteredDossiers2, setFilteredDossiers2] = useState<any[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<any[]>([]);

  useEffect(() => {
    loadRealTimeData();
    const interval = setInterval(loadRealTimeData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    applyFilters();
  }, [dossiers, documents, filters1, filters2, filters3]);
  
  const applyFilters = () => {
    // Filter Table 1: Derniers Bordereaux
    let filtered1 = dossiers.filter(d => {
      if (filters1.reference && !d.reference?.toLowerCase().includes(filters1.reference.toLowerCase())) return false;
      if (filters1.client && !d.client?.toLowerCase().includes(filters1.client.toLowerCase())) return false;
      if (filters1.type && d.type !== filters1.type) return false;
      if (filters1.statut && d.statut !== filters1.statut) return false;
      if (filters1.dateFrom && new Date(d.dateReception) < filters1.dateFrom) return false;
      if (filters1.dateTo && new Date(d.dateReception) > filters1.dateTo) return false;
      return true;
    });
    setFilteredDossiers1(filtered1);
    
    // Filter Table 2: Bordereaux en cours
    let filtered2 = dossiers.filter(d => {
      if (filters2.reference && !d.reference?.toLowerCase().includes(filters2.reference.toLowerCase())) return false;
      if (filters2.client && !d.client?.toLowerCase().includes(filters2.client.toLowerCase())) return false;
      if (filters2.statut && d.statut !== filters2.statut) return false;
      if (filters2.dateFrom && new Date(d.dateReception) < filters2.dateFrom) return false;
      if (filters2.dateTo && new Date(d.dateReception) > filters2.dateTo) return false;
      return true;
    });
    setFilteredDossiers2(filtered2);
    
    // Filter Table 3: Dossiers Individuels
    let filtered3 = documents.filter(d => {
      if (filters3.reference && !d.reference?.toLowerCase().includes(filters3.reference.toLowerCase())) return false;
      if (filters3.client && !d.client?.toLowerCase().includes(filters3.client.toLowerCase())) return false;
      if (filters3.type && d.type !== filters3.type) return false;
      if (filters3.statut && d.statut !== filters3.statut) return false;
      if (filters3.gestionnaire && !d.gestionnaire?.toLowerCase().includes(filters3.gestionnaire.toLowerCase())) return false;
      if (filters3.dateFrom && new Date(d.uploadedAt || d.date) < filters3.dateFrom) return false;
      if (filters3.dateTo && new Date(d.uploadedAt || d.date) > filters3.dateTo) return false;
      return true;
    });
    setFilteredDocuments(filtered3);
  };
  
  const clearFilters1 = () => {
    setFilters1({ reference: '', client: '', type: '', statut: '', dateFrom: null, dateTo: null });
  };
  
  const clearFilters2 = () => {
    setFilters2({ reference: '', client: '', statut: '', dateFrom: null, dateTo: null });
  };
  
  const clearFilters3 = () => {
    setFilters3({ reference: '', client: '', type: '', statut: '', gestionnaire: '', dateFrom: null, dateTo: null });
  };

  const loadRealTimeData = async () => {
    try {
      const [realTime, queues, dossiersResponse, documentsResponse, statsResponse] = await Promise.all([
        getRealTimeStats(),
        fetchQueuesOverview(),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/derniers-dossiers'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/documents-individuels'),
        LocalAPI.get('/bordereaux/chef-equipe/dashboard-stats-dossiers')
      ]);
      
      setRealTimeData(realTime);
      setQueuesData(queues);
      setDossiers(dossiersResponse.data || []);
      setDocuments(documentsResponse.data || []);
      setStats(statsResponse.data || {});
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load real-time data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    setExporting(true);
    try {
      const result = await exportDashboard(format);
      if (result.success) {
        // In a real implementation, you would trigger file download
        alert(`Export ${format.toUpperCase()} généré avec succès!`);
      }
    } catch (error) {
      alert('Erreur lors de l\'export');
    } finally {
      setExporting(false);
      setExportDialog(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': case 'NORMAL': case 'GOOD': return 'success';
      case 'warning': case 'BUSY': case 'WARNING': return 'warning';
      case 'critical': case 'OVERLOADED': case 'CRITICAL': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': case 'NORMAL': case 'GOOD': return <CheckCircle color="success" />;
      case 'warning': case 'BUSY': case 'WARNING': return <Warning color="warning" />;
      case 'critical': case 'OVERLOADED': case 'CRITICAL': return <Error color="error" />;
      default: return <Speed />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={600}>
            Tableau de Bord Temps Réel
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Dernière mise à jour: {lastUpdate.toLocaleTimeString('fr-FR')}
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => setExportDialog(true)}
            disabled={exporting}
          >
            Exporter
          </Button>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={loadRealTimeData}
            disabled={loading}
          >
            Actualiser
          </Button>
        </Box>
      </Box>

      {/* System Health Alert */}
      {realTimeData?.systemHealth?.status !== 'healthy' && (
        <Alert 
          severity={realTimeData?.systemHealth?.status === 'critical' ? 'error' : 'warning'} 
          sx={{ mb: 3 }}
        >
          <Typography variant="subtitle2">
            🚨 Système en état {realTimeData?.systemHealth?.status === 'critical' ? 'critique' : 'de vigilance'}
          </Typography>
          <Typography variant="body2">
            CPU: {realTimeData?.systemHealth?.cpuUsage?.toFixed(1)}% | 
            Mémoire: {realTimeData?.systemHealth?.memoryUsage?.toFixed(1)}% | 
            Connexions: {realTimeData?.systemHealth?.activeConnections}
          </Typography>
        </Alert>
      )}

      {/* Key Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    État Système
                  </Typography>
                  <Chip
                    label={realTimeData?.systemHealth?.status || 'unknown'}
                    color={getStatusColor(realTimeData?.systemHealth?.status) as any}
                    sx={{ fontWeight: 600 }}
                  />
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Uptime: {Math.floor((realTimeData?.systemHealth?.uptime || 0) / 3600)}h
                  </Typography>
                </Box>
                {getStatusIcon(realTimeData?.systemHealth?.status)}
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
                    Utilisateurs Actifs
                  </Typography>
                  <Typography variant="h4" component="div">
                    {realTimeData?.systemStats?.users?.active || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    / {realTimeData?.systemStats?.users?.total || 0} total
                  </Typography>
                </Box>
                <People color="primary" sx={{ fontSize: 40 }} />
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
                    Équipes Surchargées
                  </Typography>
                  <Typography variant="h4" component="div" color="error.main">
                    {realTimeData?.overloadedTeams || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    / {realTimeData?.teamWorkload || 0} équipes
                  </Typography>
                </Box>
                <Assignment color="error" sx={{ fontSize: 40 }} />
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
                    Bordereaux en Cours
                  </Typography>
                  <Typography variant="h4" component="div">
                    {realTimeData?.systemStats?.bordereaux?.processing || 0}
                  </Typography>
                  <Typography variant="caption" color="info.main">
                    / {realTimeData?.systemStats?.bordereaux?.total || 0} total
                  </Typography>
                </Box>
                <Speed color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Queues Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            État des Files d'Attente
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>File</TableCell>
                  <TableCell align="right">En Attente</TableCell>
                  <TableCell align="right">En Cours</TableCell>
                  <TableCell align="right">Terminés</TableCell>
                  <TableCell align="right">Échecs</TableCell>
                  <TableCell align="right">Temps Moyen (min)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {queuesData.map((queue) => (
                  <TableRow key={queue.name}>
                    <TableCell>{queue.name.replace('_', ' ')}</TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={queue.pending} 
                        color={queue.pending > 10 ? 'warning' : 'default'} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={queue.processing} 
                        color="info" 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={queue.completed} 
                        color="success" 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={queue.failed} 
                        color={queue.failed > 0 ? 'error' : 'default'} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell align="right">
                      {Math.round(queue.avgProcessingTime / 60)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Derniers Bordereaux Ajoutés */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box mb={2}>
            <Typography variant="h6" mb={2}>
              Derniers Bordereaux Ajoutés ({filteredDossiers1.length})
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ width: '100%' }}>
                <TextField
                  size="small"
                  label="Référence"
                  value={filters1.reference}
                  onChange={(e) => setFilters1({ ...filters1, reference: e.target.value })}
                  sx={{ width: 150 }}
                />
                <TextField
                  size="small"
                  label="Client"
                  value={filters1.client}
                  onChange={(e) => setFilters1({ ...filters1, client: e.target.value })}
                  sx={{ width: 150 }}
                />
                <TextField
                  size="small"
                  select
                  label="Type"
                  value={filters1.type}
                  onChange={(e) => setFilters1({ ...filters1, type: e.target.value })}
                  sx={{ width: 120 }}
                >
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="BULLETIN_SOIN">Prestation</MenuItem>
                  <MenuItem value="ADHESION">Adhésion</MenuItem>
                  <MenuItem value="RECLAMATION">Réclamation</MenuItem>
                </TextField>
                <TextField
                  size="small"
                  select
                  label="Statut"
                  value={filters1.statut}
                  onChange={(e) => setFilters1({ ...filters1, statut: e.target.value })}
                  sx={{ width: 120 }}
                >
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="EN_ATTENTE">En Attente</MenuItem>
                  <MenuItem value="SCANNE">Scanné</MenuItem>
                  <MenuItem value="EN_COURS">En Cours</MenuItem>
                  <MenuItem value="TRAITE">Traité</MenuItem>
                  <MenuItem value="REJETE">Rejeté</MenuItem>
                </TextField>
                <DatePicker
                  label="Date début"
                  value={filters1.dateFrom}
                  onChange={(date) => setFilters1({ ...filters1, dateFrom: date })}
                  slotProps={{ textField: { size: 'small', sx: { width: 140 } } }}
                />
                <DatePicker
                  label="Date fin"
                  value={filters1.dateTo}
                  onChange={(date) => setFilters1({ ...filters1, dateTo: date })}
                  slotProps={{ textField: { size: 'small', sx: { width: 140 } } }}
                />
                <Button size="small" onClick={clearFilters1} startIcon={<Clear />} variant="outlined">
                  Effacer
                </Button>
              </Stack>
            </LocalizationProvider>
          </Box>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Référence</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>% Finalisation</TableCell>
                  <TableCell>États Dossiers</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDossiers1.slice(0, 10).map((dossier) => (
                  <TableRow key={dossier.id}>
                    <TableCell>{dossier.reference}</TableCell>
                    <TableCell>{dossier.client}</TableCell>
                    <TableCell>{dossier.type}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LinearProgress 
                          variant="determinate" 
                          value={dossier.completionPercentage || 0}
                          sx={{ width: 40, height: 6 }}
                        />
                        <Typography variant="caption">
                          {dossier.completionPercentage || 0}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {(dossier.dossierStates || [dossier.statut]).map((state: string, idx: number) => (
                        <Chip key={idx} label={state} size="small" sx={{ mr: 0.5 }} />
                      ))}
                    </TableCell>
                    <TableCell>{dossier.date}</TableCell>
                    <TableCell>
                      <IconButton size="small">
                        ✏️
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Bordereaux en cours */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box mb={2}>
            <Typography variant="h6" mb={2}>
              Bordereaux ({filteredDossiers2.length} total)
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ width: '100%' }}>
                <TextField
                  size="small"
                  label="Référence"
                  value={filters2.reference}
                  onChange={(e) => setFilters2({ ...filters2, reference: e.target.value })}
                  sx={{ width: 150 }}
                />
                <TextField
                  size="small"
                  label="Client"
                  value={filters2.client}
                  onChange={(e) => setFilters2({ ...filters2, client: e.target.value })}
                  sx={{ width: 150 }}
                />
                <TextField
                  size="small"
                  select
                  label="Statut"
                  value={filters2.statut}
                  onChange={(e) => setFilters2({ ...filters2, statut: e.target.value })}
                  sx={{ width: 120 }}
                >
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="ASSIGNE">Assigné</MenuItem>
                  <MenuItem value="EN_COURS">En Cours</MenuItem>
                  <MenuItem value="TRAITE">Traité</MenuItem>
                  <MenuItem value="A_AFFECTER">À Affecter</MenuItem>
                </TextField>
                <DatePicker
                  label="Date début"
                  value={filters2.dateFrom}
                  onChange={(date) => setFilters2({ ...filters2, dateFrom: date })}
                  slotProps={{ textField: { size: 'small', sx: { width: 140 } } }}
                />
                <DatePicker
                  label="Date fin"
                  value={filters2.dateTo}
                  onChange={(date) => setFilters2({ ...filters2, dateTo: date })}
                  slotProps={{ textField: { size: 'small', sx: { width: 140 } } }}
                />
                <Button size="small" onClick={clearFilters2} startIcon={<Clear />} variant="outlined">
                  Effacer
                </Button>
              </Stack>
            </LocalizationProvider>
          </Box>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Référence</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>% Finalisation</TableCell>
                  <TableCell>États Dossiers</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDossiers2.slice(0, 10).map((dossier) => (
                  <TableRow key={`en-cours-${dossier.id}`}>
                    <TableCell>{dossier.reference}</TableCell>
                    <TableCell>{dossier.client}</TableCell>
                    <TableCell>
                      <Chip 
                        label={dossier.statut} 
                        color={dossier.statut === 'Traité' ? 'success' : 'primary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LinearProgress 
                          variant="determinate" 
                          value={dossier.completionPercentage || 0}
                          sx={{ width: 40, height: 6 }}
                        />
                        <Typography variant="caption">
                          {dossier.completionPercentage || 0}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {(dossier.dossierStates || [dossier.statut]).map((state: string, idx: number) => (
                        <Chip key={idx} label={state} size="small" sx={{ mr: 0.5 }} />
                      ))}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small">
                        ✏️
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Dossiers Individuels */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box mb={2}>
            <Typography variant="h6" mb={1}>
              Dossiers Individuels ({filteredDocuments.length})
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Affichage par dossier (non par bordereau)
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ width: '100%' }}>
                <TextField
                  size="small"
                  label="Réf. Dossier"
                  value={filters3.reference}
                  onChange={(e) => setFilters3({ ...filters3, reference: e.target.value })}
                  sx={{ width: 140 }}
                />
                <TextField
                  size="small"
                  label="Client"
                  value={filters3.client}
                  onChange={(e) => setFilters3({ ...filters3, client: e.target.value })}
                  sx={{ width: 130 }}
                />
                <TextField
                  size="small"
                  select
                  label="Type"
                  value={filters3.type}
                  onChange={(e) => setFilters3({ ...filters3, type: e.target.value })}
                  sx={{ width: 110 }}
                >
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="BULLETIN_SOIN">Prestation</MenuItem>
                  <MenuItem value="ADHESION">Adhésion</MenuItem>
                  <MenuItem value="RECLAMATION">Réclamation</MenuItem>
                </TextField>
                <TextField
                  size="small"
                  select
                  label="Statut"
                  value={filters3.statut}
                  onChange={(e) => setFilters3({ ...filters3, statut: e.target.value })}
                  sx={{ width: 110 }}
                >
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="Nouveau">Nouveau</MenuItem>
                  <MenuItem value="En cours">En cours</MenuItem>
                  <MenuItem value="Traité">Traité</MenuItem>
                  <MenuItem value="Rejeté">Rejeté</MenuItem>
                </TextField>
                <TextField
                  size="small"
                  label="Gestionnaire"
                  value={filters3.gestionnaire}
                  onChange={(e) => setFilters3({ ...filters3, gestionnaire: e.target.value })}
                  sx={{ width: 130 }}
                />
                <DatePicker
                  label="Date début"
                  value={filters3.dateFrom}
                  onChange={(date) => setFilters3({ ...filters3, dateFrom: date })}
                  slotProps={{ textField: { size: 'small', sx: { width: 130 } } }}
                />
                <DatePicker
                  label="Date fin"
                  value={filters3.dateTo}
                  onChange={(date) => setFilters3({ ...filters3, dateTo: date })}
                  slotProps={{ textField: { size: 'small', sx: { width: 130 } } }}
                />
                <Button size="small" onClick={clearFilters3} startIcon={<Clear />} variant="outlined">
                  Effacer
                </Button>
              </Stack>
            </LocalizationProvider>
          </Box>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Réf. Dossier</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Statut Dossier</TableCell>
                  <TableCell>Gestionnaire</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDocuments.slice(0, 20).map((document) => (
                  <TableRow key={document.id}>
                    <TableCell>{document.reference}</TableCell>
                    <TableCell>{document.client}</TableCell>
                    <TableCell>{document.type}</TableCell>
                    <TableCell>
                      <Chip 
                        label={document.statut} 
                        color={document.statut === 'Traité' ? 'success' : document.statut === 'En cours' ? 'warning' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{document.gestionnaire || 'Non assigné'}</TableCell>
                    <TableCell>{document.date}</TableCell>
                    <TableCell>
                      <Button size="small" variant="text">Voir PDF</Button>
                      <Button size="small" variant="text">Modifier Statut</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* System Performance */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Système
              </Typography>
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">CPU</Typography>
                  <Typography variant="body2">
                    {realTimeData?.systemHealth?.cpuUsage?.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={realTimeData?.systemHealth?.cpuUsage || 0} 
                  color={realTimeData?.systemHealth?.cpuUsage > 80 ? 'error' : 'primary'}
                />
              </Box>
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Mémoire</Typography>
                  <Typography variant="body2">
                    {realTimeData?.systemHealth?.memoryUsage?.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={realTimeData?.systemHealth?.memoryUsage || 0} 
                  color={realTimeData?.systemHealth?.memoryUsage > 80 ? 'error' : 'primary'}
                />
              </Box>
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Connexions Actives</Typography>
                  <Typography variant="body2">
                    {realTimeData?.systemHealth?.activeConnections}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min((realTimeData?.systemHealth?.activeConnections || 0) / 100 * 100, 100)} 
                  color={(realTimeData?.systemHealth?.activeConnections || 0) > 80 ? 'error' : 'primary'}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Alertes Système
              </Typography>
              {realTimeData?.alerts?.critical > 0 && (
                <Alert severity="error" sx={{ mb: 1 }}>
                  {realTimeData?.alerts?.critical} alertes critiques
                </Alert>
              )}
              {realTimeData?.alerts?.warnings > 0 && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  {realTimeData?.alerts?.warnings} avertissements
                </Alert>
              )}
              {(!realTimeData?.alerts?.critical && !realTimeData?.alerts?.warnings) && (
                <Alert severity="success">
                  Aucune alerte active
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Export Dialog */}
      <Dialog open={exportDialog} onClose={() => setExportDialog(false)}>
        <DialogTitle>Exporter le Tableau de Bord</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Choisissez le format d'export pour le tableau de bord complet:
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialog(false)}>Annuler</Button>
          <Button 
            onClick={() => handleExport('excel')} 
            variant="outlined"
            disabled={exporting}
          >
            Excel
          </Button>
          <Button 
            onClick={() => handleExport('pdf')} 
            variant="contained"
            disabled={exporting}
          >
            PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RealTimeSuperAdminDashboard;