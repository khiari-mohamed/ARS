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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Refresh,
  Download,
  Warning,
  CheckCircle,
  Error,
  People,
  Assignment,
  Speed
} from '@mui/icons-material';
import { 
  getRealTimeStats, 
  exportDashboard,
  fetchQueuesOverview
} from '../services/superAdminService';
import { LocalAPI } from '../services/axios';

interface RealTimeStats {
  timestamp: string;
  systemHealth: any;
  systemStats: any;
  alerts: any;
  teamWorkload: number;
  overloadedTeams: number;
  busyTeams: number;
  teamWorkloadDetails?: any[];
}

const RealTimeSuperAdminDashboard: React.FC = () => {
  const [realTimeData, setRealTimeData] = useState<RealTimeStats | null>(null);
  const [queuesData, setQueuesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  // Removed: dossiers, documents, stats, filters - tables commented out

  useEffect(() => {
    loadRealTimeData();
    const interval = setInterval(loadRealTimeData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadRealTimeData = async () => {
    try {
      const [realTime, queues, teamWorkload] = await Promise.all([
        getRealTimeStats(),
        fetchQueuesOverview(),
        LocalAPI.get('/super-admin/team-workload')
      ]);
      
      console.log('📊 Real-Time Data:', realTime);
      console.log('👥 Team Workload:', teamWorkload.data);
      console.log('📋 Queues:', queues);
      
      setRealTimeData({ ...realTime, teamWorkloadDetails: teamWorkload.data });
      setQueuesData(queues);
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
                  <Typography variant="caption" color="warning.main">
                    {realTimeData?.busyTeams || 0} occupées | {realTimeData?.teamWorkload || 0} total
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

      {/* Queues Overview with Alert Rules */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              État des Files d'Attente
            </Typography>
            <Chip 
              label="Règles: >Seuil OU >24h = Critique" 
              size="small" 
              color="info"
              variant="outlined"
            />
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>File</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">En Attente</TableCell>
                  <TableCell align="right">En Cours</TableCell>
                  <TableCell align="right">Plus Ancien (h)</TableCell>
                  <TableCell align="center">Statut</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {queuesData.map((queue) => (
                  <TableRow key={queue.name}>
                    <TableCell><strong>{queue.name}</strong></TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={queue.total} 
                        color={queue.alertLevel === 'CRITICAL' ? 'error' : queue.alertLevel === 'WARNING' ? 'warning' : 'default'}
                        size="small" 
                      />
                    </TableCell>
                    <TableCell align="right">{queue.pending}</TableCell>
                    <TableCell align="right">{queue.processing}</TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={`${queue.oldestAge}h`}
                        color={queue.oldestAge > 24 ? 'error' : queue.oldestAge > 12 ? 'warning' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {queue.alertLevel === 'CRITICAL' && <Error color="error" />}
                      {queue.alertLevel === 'WARNING' && <Warning color="warning" />}
                      {queue.alertLevel === 'NORMAL' && <CheckCircle color="success" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="caption">
              <strong>Règles d'alerte:</strong> Critique si Total &gt; Seuil OU Plus ancien &gt; 24h | 
              Avertissement si Total &gt; 70% Seuil OU Plus ancien &gt; 12h
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* Team Workload with Calculation Rules */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Charge de Travail des Équipes
            </Typography>
            <Chip 
              label="Règle: <70% Normal | 70-89% Occupé | ≥90% Surchargé" 
              size="small" 
              color="info"
              variant="outlined"
            />
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Rôle</TableCell>
                  <TableCell align="right">Charge</TableCell>
                  <TableCell align="right">Capacité</TableCell>
                  <TableCell align="right">Utilisation</TableCell>
                  <TableCell align="center">Statut</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(realTimeData as any)?.teamWorkloadDetails?.map((team: any) => (
                  <TableRow key={team.id}>
                    <TableCell>{team.name}</TableCell>
                    <TableCell>{team.role}</TableCell>
                    <TableCell align="right">{team.workload}</TableCell>
                    <TableCell align="right">{team.capacity}</TableCell>
                    <TableCell align="right">
                      <Box display="flex" alignItems="center" gap={1}>
                        <LinearProgress 
                          variant="determinate" 
                          value={team.utilizationRate}
                          color={team.level === 'OVERLOADED' ? 'error' : team.level === 'BUSY' ? 'warning' : 'success'}
                          sx={{ width: 60, height: 6 }}
                        />
                        <Typography variant="caption">{team.utilizationRate}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={team.level}
                        color={team.color as any}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="caption">
              <strong>Formule:</strong> Taux d'utilisation = (Bordereaux assignés / Capacité) × 100 | 
              🟢 Normal (&lt;70%) | 🟠 Occupé (70-89%) | 🔴 Surchargé (≥90%)
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* Derniers Bordereaux Ajoutés - COMMENTÉ: Redondant avec dashboard */}
      {/* <Card sx={{ mb: 3 }}>
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
      </Card> */}

      {/* Bordereaux en cours - COMMENTÉ: Redondant avec dashboard */}
      {/* <Card sx={{ mb: 3 }}>
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
      </Card> */}

      {/* Dossiers Individuels - COMMENTÉ: Redondant avec dashboard */}
      {/* <Card sx={{ mb: 3 }}>
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
      </Card> */}

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