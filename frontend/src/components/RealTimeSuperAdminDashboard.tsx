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
  Speed,
  Info
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

interface RealTimeSuperAdminDashboardProps {
  onTeamRulesClick: () => void;
}

const RealTimeSuperAdminDashboard: React.FC<RealTimeSuperAdminDashboardProps> = ({ onTeamRulesClick }) => {
  const [realTimeData, setRealTimeData] = useState<RealTimeStats | null>(null);
  const [queuesData, setQueuesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [ageRulesDialog, setAgeRulesDialog] = useState(false);
  const [alertRulesDialog, setAlertRulesDialog] = useState(false);
  const [workloadRulesDialog, setWorkloadRulesDialog] = useState(false);
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

  const formatAge = (hours: number) => {
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}j ${remainingHours}h`;
    }
    return `${hours}h`;
  };

  const getAgeColor = (hours: number) => {
    if (hours > 168) return 'error'; // > 7 days
    if (hours > 72) return 'warning'; // > 3 days
    if (hours > 24) return 'info'; // > 1 day
    return 'default';
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

      {/* System Health Alert - COMMENTED OUT (Client request: too technical) */}
      {false && realTimeData?.systemHealth?.status !== 'healthy' && (
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
        {/* État Système Card - COMMENTED OUT (Client request: too technical) */}
        {false && (
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
        )}

        {/* Utilisateurs Actifs Card - COMMENTED OUT (Client request: not needed) */}
        {false && (
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
        )}

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Bordereaux
                  </Typography>
                  <Typography variant="h4" component="div">
                    {realTimeData?.systemStats?.bordereaux?.total || 0}
                  </Typography>
                  <Typography variant="caption" color="info.main">
                    {realTimeData?.systemStats?.bordereaux?.processing || 0} en cours
                  </Typography>
                </Box>
                <Speed color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 6 } }} onClick={onTeamRulesClick}>
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
                <Box display="flex" flexDirection="column" alignItems="center">
                  <Assignment color="error" sx={{ fontSize: 40 }} />
                  <Info color="action" sx={{ fontSize: 16, mt: 0.5 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Bordereaux en Cours Card - COMMENTED OUT (duplicate - already in header) */}
        {false && (
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
        )}
      </Grid>

      {/* Queues Overview with Alert Rules */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              📋 Cycle de Vie des Bordereaux - Suivi par Étape
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Flux: Bureau d'Ordre → Équipe Scan → Équipe Métier (Traitement) → Finance (Virement)
            </Typography>
          </Box>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Lecture du tableau:</strong><br/>
              • <strong>Total Bloqués</strong> = Nombre de bordereaux coincés à cette étape<br/>
              • <strong>Pas Commencés</strong> = Bordereaux en attente (personne ne travaille dessus)<br/>
              • <strong>En Traitement</strong> = Bordereaux en cours (quelqu'un travaille dessus)<br/>
              • <strong>Attente Max</strong> = Depuis combien de temps le plus ancien attend
            </Typography>
          </Alert>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Étape du Cycle</strong></TableCell>
                  <TableCell align="right"><strong>Total Bloqués</strong></TableCell>
                  <TableCell align="right"><strong>Pas Commencés</strong></TableCell>
                  <TableCell align="right"><strong>En Traitement</strong></TableCell>
                  <TableCell align="right"><strong>Attente Maximum</strong></TableCell>
                  <TableCell align="center"><strong>Urgence</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {queuesData.map((queue) => {
                  const getQueueInfo = (name: string) => {
                    const info: Record<string, { icon: string; desc: string; detail: string; seuil: number }> = {
                      "Bureau d'Ordre": { 
                        icon: '📥', 
                        desc: 'Étape 1: Bureau d\'Ordre', 
                        detail: 'Enregistrement initial du bordereau',
                        seuil: 50 
                      },
                      "Service SCAN": { 
                        icon: '🖨️', 
                        desc: 'Étape 2: Équipe Scan', 
                        detail: 'Numérisation des documents',
                        seuil: 30 
                      },
                      "Traitement": { 
                        icon: '⚙️', 
                        desc: 'Étape 3: Équipe Métier', 
                        detail: 'Traitement par gestionnaires',
                        seuil: 100 
                      },
                      "Finance": { 
                        icon: '💰', 
                        desc: 'Étape 4: Service Finance', 
                        detail: 'Préparation et exécution virement',
                        seuil: 50 
                      }
                    };
                    return info[name] || { icon: '', desc: name, detail: '', seuil: 50 };
                  };
                  
                  const queueInfo = getQueueInfo(queue.name);
                  
                  return (
                  <TableRow key={queue.name} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {queueInfo.icon} {queueInfo.desc}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {queueInfo.detail}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Box>
                        <Typography variant="h6" color={queue.alertLevel === 'CRITICAL' ? 'error.main' : queue.alertLevel === 'WARNING' ? 'warning.main' : 'text.primary'}>
                          {queue.total}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          bordereaux
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{queue.pending}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{queue.processing}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ cursor: 'pointer' }} onClick={() => setAgeRulesDialog(true)}>
                        <Chip 
                          label={formatAge(queue.oldestAge)}
                          color={getAgeColor(queue.oldestAge) as any}
                          size="small"
                          icon={<Info />}
                        />
                        {queue.alertLevel === 'CRITICAL' && (
                          <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
                            ⚠️ Délai dépassé!
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" flexDirection="column" alignItems="center" gap={0.5} sx={{ cursor: 'pointer' }} onClick={() => setAlertRulesDialog(true)}>
                        {queue.alertLevel === 'CRITICAL' && (
                          <>
                            <Error color="error" />
                            <Typography variant="caption" color="error" fontWeight={600}>🔴 CRITIQUE</Typography>
                          </>
                        )}
                        {queue.alertLevel === 'WARNING' && (
                          <>
                            <Warning color="warning" />
                            <Typography variant="caption" color="warning.main" fontWeight={600}>🟠 ATTENTION</Typography>
                          </>
                        )}
                        {queue.alertLevel === 'INFO' && (
                          <>
                            <Info color="info" />
                            <Typography variant="caption" color="info.main" fontWeight={600}>🔵 SURVEILLER</Typography>
                          </>
                        )}
                        {queue.alertLevel === 'NORMAL' && (
                          <>
                            <CheckCircle color="success" />
                            <Typography variant="caption" color="success.main" fontWeight={600}>🟢 NORMAL</Typography>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          {queuesData.some(q => q.alertLevel === 'CRITICAL') && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>🚨 ALERTE CRITIQUE:</strong> Des bordereaux ont dépassé leur délai contractuel ou les files sont surchargées. Action immédiate requise.
              </Typography>
            </Alert>
          )}
          {queuesData.some(q => q.alertLevel === 'WARNING') && !queuesData.some(q => q.alertLevel === 'CRITICAL') && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>⚠️ ATTENTION:</strong> Certains bordereaux approchent de leur délai contractuel (≥80% consommé).
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Team Workload with Calculation Rules */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Charge de Travail des Équipes
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Info />}
              onClick={() => setWorkloadRulesDialog(true)}
            >
              📘 Cliquez pour Comprendre
            </Button>
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
        </CardContent>
      </Card>


      {/* System Performance - COMMENTED OUT (Client request: too technical) */}
      {false && (
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
      )}

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

      {/* Age Rules Dialog */}
      <Dialog open={ageRulesDialog} onClose={() => setAgeRulesDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Info color="primary" />
            <Typography variant="h6">Règles de Calcul - Attente Maximum</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ fontFamily: 'monospace', whiteSpace: 'pre', bgcolor: '#f5f5f5', p: 2, borderRadius: 1, mb: 3 }}>
{`╔════════════════════════════════════════════════════════════════╗
║           CALCUL DE L'ATTENTE MAXIMUM DES BORDEREAUX          ║
╚════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────┐
│  ATTENTE MAX = Temps écoulé depuis la date de réception   │
│              du bordereau le plus ancien                     │
└─────────────────────────────────────────────────────────────┘

   Date Actuelle: 15/01/2025 14:30
   Date Réception Bordereau: 25/11/2023 17:00
   
   Calcul:
   └── Différence = 15/01/2025 - 25/11/2023
       = 416 jours + 21 heures
       = 50j 21h (affiché)`}
          </Box>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            🚦 Codes Couleur par Âge
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Chip label="< 24h" size="small" />
              <Typography variant="body2">Bordereau récent (moins d'un jour)</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: '#e3f2fd', borderRadius: 1 }}>
              <Chip label="1-3j" color="info" size="small" />
              <Typography variant="body2">Bordereau en cours (1 à 3 jours)</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: '#fff3e0', borderRadius: 1 }}>
              <Chip label="3-7j" color="warning" size="small" />
              <Typography variant="body2">Attention requise (3 à 7 jours)</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: '#ffebee', borderRadius: 1 }}>
              <Chip label="> 7j" color="error" size="small" />
              <Typography variant="body2">Délai critique (plus de 7 jours)</Typography>
            </Box>
          </Box>

          <Alert severity="warning" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>⚠️ Important:</strong> L'attente maximum indique le temps écoulé depuis la réception 
              du bordereau le plus ancien dans cette étape. Un délai élevé peut indiquer un blocage ou 
              une surcharge à cette étape du processus.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAgeRulesDialog(false)} variant="contained">
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Workload Calculation Rules Dialog */}
      <Dialog open={workloadRulesDialog} onClose={() => setWorkloadRulesDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Info color="primary" />
            <Typography variant="h6">Calcul de la Charge de Travail - Basé sur le Temps</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ fontFamily: 'monospace', whiteSpace: 'pre', bgcolor: '#f5f5f5', p: 2, borderRadius: 1, mb: 3 }}>
{`╔════════════════════════════════════════════════════════════════╗
║     CALCUL DE LA CHARGE DE TRAVAIL (TIME-BASED)             ║
╚════════════════════════════════════════════════════════════════╝

🎯 OBJECTIF:
Calculer si un gestionnaire peut finir ses documents à temps
selon les délais contractuels (durée de règlement).

┌─────────────────────────────────────────────────────────────┐
│  FORMULE PRINCIPALE:                                        │
│                                                             │
│  Pour chaque document:                                      │
│    Requis/Jour = 1 / Jours_Restants                       │
│                                                             │
│  Total Requis/Jour = Σ (1 / Jours_Restants)              │
│                                                             │
│  Utilisation% = (Total_Requis/Jour / Capacité) × 100     │
└─────────────────────────────────────────────────────────────┘`}
          </Box>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            📊 Exemple Concret
          </Typography>
          <Box sx={{ bgcolor: '#e3f2fd', p: 2, borderRadius: 1, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Gestionnaire: Sonia Bouaicha
            </Typography>
            <Typography variant="body2" component="div">
              • Capacité quotidienne: <strong>50 documents/jour</strong><br/>
              • Documents assignés: <strong>997 documents</strong>
            </Typography>
          </Box>

          <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem', mb: 2 }}>
{`Détail des documents par délai:

┌──────────────────────────────────────────────────────────┐
│ Groupe 1: 200 docs - Délai: 10 jours restants          │
│   Requis/Jour = 200 / 10 = 20 docs/jour                │
├──────────────────────────────────────────────────────────┤
│ Groupe 2: 300 docs - Délai: 15 jours restants          │
│   Requis/Jour = 300 / 15 = 20 docs/jour                │
├──────────────────────────────────────────────────────────┤
│ Groupe 3: 497 docs - Délai: 30 jours restants          │
│   Requis/Jour = 497 / 30 = 16.57 docs/jour             │
└──────────────────────────────────────────────────────────┘

Total Requis/Jour = 20 + 20 + 16.57 = 56.57 docs/jour
Capacité = 50 docs/jour

Utilisation = (56.57 / 50) × 100 = 113% → 🔴 SURCHARGÉ`}
          </Box>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            🚦 Interprétation des Résultats
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: '#e8f5e9', borderRadius: 1 }}>
              <Typography sx={{ fontSize: '1.5rem' }}>🟢</Typography>
              <Box flex={1}>
                <Typography variant="subtitle2" fontWeight={600}>NORMAL (&lt;70%)</Typography>
                <Typography variant="body2">Le gestionnaire peut traiter tous ses documents à temps avec marge de sécurité</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: '#fff3e0', borderRadius: 1 }}>
              <Typography sx={{ fontSize: '1.5rem' }}>🟠</Typography>
              <Box flex={1}>
                <Typography variant="subtitle2" fontWeight={600}>OCCUPÉ (70-89%)</Typography>
                <Typography variant="body2">Charge élevée mais gérable. Surveillance recommandée</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: '#ffebee', borderRadius: 1 }}>
              <Typography sx={{ fontSize: '1.5rem' }}>🔴</Typography>
              <Box flex={1}>
                <Typography variant="subtitle2" fontWeight={600}>SURCHARGÉ (≥90%)</Typography>
                <Typography variant="body2">Impossible de finir à temps. Réaffectation nécessaire!</Typography>
              </Box>
            </Box>
          </Box>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            💡 Avantages de cette Méthode
          </Typography>
          <Box sx={{ bgcolor: '#e8f5e9', p: 2, borderRadius: 1 }}>
            <Typography variant="body2" component="div">
              ✅ <strong>Réaliste:</strong> Prend en compte les délais contractuels<br/>
              ✅ <strong>Prédictif:</strong> Détecte les surcharges avant qu'il soit trop tard<br/>
              ✅ <strong>Équitable:</strong> 80 docs en 4 jours = 50 docs en 2 jours (même charge)<br/>
              ✅ <strong>Actionnable:</strong> Permet de réaffecter intelligemment
            </Typography>
          </Box>

          <Alert severity="warning" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>⚠️ Important:</strong> Cette méthode calcule la charge RÉELLE basée sur les délais. 
              Un gestionnaire avec 100 documents peut être moins surchargé qu'un autre avec 50 documents 
              si les délais sont différents!
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWorkloadRulesDialog(false)} variant="contained">
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RealTimeSuperAdminDashboard;