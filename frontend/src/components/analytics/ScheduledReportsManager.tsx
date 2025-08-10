import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  PlayArrow,
  Pause,
  Schedule,
  Email,
  Download,
  Assessment,
  Person,
  Group
} from '@mui/icons-material';

const ScheduledReportsManager: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [reportDialog, setReportDialog] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [newReport, setNewReport] = useState({
    name: '',
    description: '',
    reportType: 'dashboard',
    dataSource: 'bordereaux',
    schedule: {
      frequency: 'daily',
      time: '08:00',
      timezone: 'Europe/Paris'
    },
    recipients: [] as any[],
    format: 'pdf',
    active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Mock data
      setReports([
        {
          id: 'report_001',
          name: 'Rapport Quotidien des Bordereaux',
          description: 'Rapport quotidien des bordereaux traités et en cours',
          reportType: 'dashboard',
          dataSource: 'bordereaux',
          schedule: {
            frequency: 'daily',
            time: '08:00',
            timezone: 'Europe/Paris'
          },
          recipients: [
            { type: 'user', identifier: 'manager_001', name: 'Manager Principal', deliveryMethod: 'email' },
            { type: 'group', identifier: 'supervisors', name: 'Superviseurs', deliveryMethod: 'both' }
          ],
          format: 'pdf',
          active: true,
          lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000),
          nextRun: new Date(Date.now() + 8 * 60 * 60 * 1000),
          status: 'active'
        },
        {
          id: 'report_002',
          name: 'Rapport Hebdomadaire des Réclamations',
          description: 'Analyse hebdomadaire des réclamations par catégorie',
          reportType: 'chart',
          dataSource: 'reclamations',
          schedule: {
            frequency: 'weekly',
            time: '09:00',
            timezone: 'Europe/Paris',
            daysOfWeek: [1]
          },
          recipients: [
            { type: 'email', identifier: 'direction@company.com', name: 'Direction', deliveryMethod: 'email' }
          ],
          format: 'excel',
          active: true,
          lastRun: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          nextRun: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          status: 'active'
        },
        {
          id: 'report_003',
          name: 'Rapport Mensuel Financier',
          description: 'Rapport mensuel des virements et performance financière',
          reportType: 'custom',
          dataSource: 'virements',
          schedule: {
            frequency: 'monthly',
            time: '07:00',
            timezone: 'Europe/Paris',
            dayOfMonth: 1
          },
          recipients: [
            { type: 'user', identifier: 'cfo_001', name: 'Directeur Financier', deliveryMethod: 'both' }
          ],
          format: 'pdf',
          active: false,
          lastRun: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          nextRun: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          status: 'paused'
        }
      ]);

      setExecutions([
        {
          id: 'exec_001',
          reportId: 'report_001',
          startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000),
          status: 'completed',
          fileSize: 245678,
          recipients: ['manager_001', 'supervisors'],
          deliveryStatus: { 'manager_001': 'sent', 'supervisors': 'sent' }
        },
        {
          id: 'exec_002',
          reportId: 'report_002',
          startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 8 * 60 * 1000),
          status: 'completed',
          fileSize: 156789,
          recipients: ['direction@company.com'],
          deliveryStatus: { 'direction@company.com': 'sent' }
        },
        {
          id: 'exec_003',
          reportId: 'report_001',
          startedAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 26 * 60 * 60 * 1000 + 3 * 60 * 1000),
          status: 'failed',
          error: 'Database connection timeout',
          recipients: ['manager_001'],
          deliveryStatus: { 'manager_001': 'failed' }
        }
      ]);

      setStatistics({
        totalReports: 15,
        activeReports: 12,
        pausedReports: 2,
        errorReports: 1,
        totalExecutions: 456,
        successfulExecutions: 432,
        failedExecutions: 24,
        successRate: 94.7,
        avgExecutionTime: 3.2,
        byFrequency: {
          daily: 8,
          weekly: 4,
          monthly: 2,
          quarterly: 1
        },
        byFormat: {
          pdf: 7,
          excel: 5,
          csv: 2,
          html: 1
        }
      });
    } catch (error) {
      console.error('Failed to load scheduled reports data:', error);
    }
  };

  const handleCreateReport = async () => {
    try {
      console.log('Creating scheduled report:', newReport);
      await loadData();
      setReportDialog(false);
      setNewReport({
        name: '',
        description: '',
        reportType: 'dashboard',
        dataSource: 'bordereaux',
        schedule: {
          frequency: 'daily',
          time: '08:00',
          timezone: 'Europe/Paris'
        },
        recipients: [] as any[],
        format: 'pdf',
        active: true
      });
      setActiveStep(0);
    } catch (error) {
      console.error('Failed to create scheduled report:', error);
    }
  };

  const handleToggleReport = async (reportId: string, active: boolean) => {
    try {
      console.log(`${active ? 'Activating' : 'Pausing'} report:`, reportId);
      await loadData();
    } catch (error) {
      console.error('Failed to toggle report:', error);
    }
  };

  const handleRunReport = async (reportId: string) => {
    try {
      console.log('Running report:', reportId);
      await loadData();
    } catch (error) {
      console.error('Failed to run report:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: { [key: string]: string } = {
      daily: 'Quotidien',
      weekly: 'Hebdomadaire',
      monthly: 'Mensuel',
      quarterly: 'Trimestriel',
      yearly: 'Annuel'
    };
    return labels[frequency] || frequency;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const addRecipient = () => {
    setNewReport(prev => ({
      ...prev,
      recipients: [
        ...prev.recipients,
        { type: 'user', identifier: '', name: '', deliveryMethod: 'email' }
      ]
    }));
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Gestion des Rapports Programmés
      </Typography>

      {/* Statistics */}
      {statistics && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Rapports Actifs
                </Typography>
                <Typography variant="h4" component="div">
                  {statistics.activeReports}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  sur {statistics.totalReports} total
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Taux de Succès
                </Typography>
                <Typography variant="h4" component="div">
                  {statistics.successRate.toFixed(1)}%
                </Typography>
                <Typography variant="caption" color="success.main">
                  {statistics.successfulExecutions} succès
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Temps Moyen
                </Typography>
                <Typography variant="h4" component="div">
                  {statistics.avgExecutionTime.toFixed(1)}min
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Génération
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Exécutions Totales
                </Typography>
                <Typography variant="h4" component="div">
                  {statistics.totalExecutions}
                </Typography>
                <Typography variant="caption" color="error.main">
                  {statistics.failedExecutions} échecs
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Scheduled Reports */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  Rapports Programmés ({reports.length})
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setReportDialog(true)}
                >
                  Nouveau Rapport
                </Button>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nom</TableCell>
                      <TableCell>Fréquence</TableCell>
                      <TableCell>Format</TableCell>
                      <TableCell>Prochaine Exécution</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {report.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {report.description}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Schedule fontSize="small" />
                            <Typography variant="body2">
                              {getFrequencyLabel(report.schedule.frequency)}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {report.schedule.time}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={report.format.toUpperCase()} size="small" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(report.nextRun).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(report.nextRun).toLocaleTimeString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={report.status}
                            color={getStatusColor(report.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <IconButton
                              size="small"
                              onClick={() => handleRunReport(report.id)}
                              title="Exécuter maintenant"
                            >
                              <PlayArrow />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleReport(report.id, !report.active)}
                              title={report.active ? 'Suspendre' : 'Activer'}
                            >
                              {report.active ? <Pause /> : <PlayArrow />}
                            </IconButton>
                            <IconButton size="small" title="Modifier">
                              <Edit />
                            </IconButton>
                            <IconButton size="small" color="error" title="Supprimer">
                              <Delete />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Executions */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Exécutions Récentes
              </Typography>
              
              <List>
                {executions.slice(0, 5).map((execution) => (
                  <ListItem key={execution.id}>
                    <ListItemIcon>
                      {execution.status === 'completed' ? (
                        <Assessment color="success" />
                      ) : execution.status === 'failed' ? (
                        <Assessment color="error" />
                      ) : (
                        <Assessment color="info" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle2">
                            {reports.find(r => r.id === execution.reportId)?.name || 'Rapport'}
                          </Typography>
                          <Chip
                            label={execution.status}
                            color={execution.status === 'completed' ? 'success' : 'error'}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(execution.startedAt).toLocaleString()}
                          </Typography>
                          {execution.fileSize && (
                            <Typography variant="caption" color="text.secondary">
                              Taille: {formatFileSize(execution.fileSize)}
                            </Typography>
                          )}
                          {execution.error && (
                            <Typography variant="caption" color="error.main">
                              Erreur: {execution.error}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Statistics Charts */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Statistiques des Rapports
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Répartition par Fréquence
                  </Typography>
                  <List dense>
                    {Object.entries(statistics?.byFrequency || {}).map(([frequency, count]) => (
                      <ListItem key={frequency}>
                        <ListItemText
                          primary={getFrequencyLabel(frequency)}
                          secondary={`${count} rapport(s)`}
                        />
                        <Typography variant="h6" color="primary">
                          {String(count)}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Répartition par Format
                  </Typography>
                  <List dense>
                    {Object.entries(statistics?.byFormat || {}).map(([format, count]) => (
                      <ListItem key={format}>
                        <ListItemText
                          primary={format.toUpperCase()}
                          secondary={`${count} rapport(s)`}
                        />
                        <Typography variant="h6" color="secondary">
                          {String(count)}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create Report Dialog */}
      <Dialog open={reportDialog} onClose={() => setReportDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nouveau Rapport Programmé</DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} orientation="vertical">
            <Step>
              <StepLabel>Configuration de Base</StepLabel>
              <StepContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Nom du rapport"
                      value={newReport.name}
                      onChange={(e) => setNewReport(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Description"
                      value={newReport.description}
                      onChange={(e) => setNewReport(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Type de Rapport</InputLabel>
                      <Select
                        value={newReport.reportType}
                        label="Type de Rapport"
                        onChange={(e) => setNewReport(prev => ({ ...prev, reportType: e.target.value }))}
                      >
                        <MenuItem value="dashboard">Tableau de Bord</MenuItem>
                        <MenuItem value="table">Tableau</MenuItem>
                        <MenuItem value="chart">Graphique</MenuItem>
                        <MenuItem value="custom">Personnalisé</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Source de Données</InputLabel>
                      <Select
                        value={newReport.dataSource}
                        label="Source de Données"
                        onChange={(e) => setNewReport(prev => ({ ...prev, dataSource: e.target.value }))}
                      >
                        <MenuItem value="bordereaux">Bordereaux</MenuItem>
                        <MenuItem value="reclamations">Réclamations</MenuItem>
                        <MenuItem value="virements">Virements</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                <Box sx={{ mb: 1, mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => setActiveStep(1)}
                    disabled={!newReport.name || !newReport.description}
                  >
                    Continuer
                  </Button>
                </Box>
              </StepContent>
            </Step>

            <Step>
              <StepLabel>Programmation</StepLabel>
              <StepContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Fréquence</InputLabel>
                      <Select
                        value={newReport.schedule.frequency}
                        label="Fréquence"
                        onChange={(e) => setNewReport(prev => ({
                          ...prev,
                          schedule: { ...prev.schedule, frequency: e.target.value }
                        }))}
                      >
                        <MenuItem value="daily">Quotidien</MenuItem>
                        <MenuItem value="weekly">Hebdomadaire</MenuItem>
                        <MenuItem value="monthly">Mensuel</MenuItem>
                        <MenuItem value="quarterly">Trimestriel</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="time"
                      label="Heure d'exécution"
                      value={newReport.schedule.time}
                      onChange={(e) => setNewReport(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule, time: e.target.value }
                      }))}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Format</InputLabel>
                      <Select
                        value={newReport.format}
                        label="Format"
                        onChange={(e) => setNewReport(prev => ({ ...prev, format: e.target.value }))}
                      >
                        <MenuItem value="pdf">PDF</MenuItem>
                        <MenuItem value="excel">Excel</MenuItem>
                        <MenuItem value="csv">CSV</MenuItem>
                        <MenuItem value="html">HTML</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={newReport.active}
                          onChange={(e) => setNewReport(prev => ({ ...prev, active: e.target.checked }))}
                        />
                      }
                      label="Activer immédiatement"
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mb: 1, mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => setActiveStep(2)}
                    sx={{ mr: 1 }}
                  >
                    Continuer
                  </Button>
                  <Button onClick={() => setActiveStep(0)}>
                    Retour
                  </Button>
                </Box>
              </StepContent>
            </Step>

            <Step>
              <StepLabel>Destinataires</StepLabel>
              <StepContent>
                <Box sx={{ mb: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={addRecipient}
                    sx={{ mb: 2 }}
                  >
                    Ajouter Destinataire
                  </Button>

                  {newReport.recipients.map((recipient: any, index: number) => (
                    <Card key={index} sx={{ mb: 2, p: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <FormControl fullWidth>
                            <InputLabel>Type</InputLabel>
                            <Select
                              value={recipient.type}
                              label="Type"
                              onChange={(e) => {
                                const newRecipients = [...newReport.recipients];
                                newRecipients[index].type = e.target.value;
                                setNewReport(prev => ({ ...prev, recipients: newRecipients }));
                              }}
                            >
                              <MenuItem value="user"><Person sx={{ mr: 1 }} />Utilisateur</MenuItem>
                              <MenuItem value="email"><Email sx={{ mr: 1 }} />Email</MenuItem>
                              <MenuItem value="group"><Group sx={{ mr: 1 }} />Groupe</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            label="Identifiant"
                            value={recipient.identifier}
                            onChange={(e) => {
                              const newRecipients = [...newReport.recipients];
                              newRecipients[index].identifier = e.target.value;
                              setNewReport(prev => ({ ...prev, recipients: newRecipients }));
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <FormControl fullWidth>
                            <InputLabel>Livraison</InputLabel>
                            <Select
                              value={recipient.deliveryMethod}
                              label="Livraison"
                              onChange={(e) => {
                                const newRecipients = [...newReport.recipients];
                                newRecipients[index].deliveryMethod = e.target.value;
                                setNewReport(prev => ({ ...prev, recipients: newRecipients }));
                              }}
                            >
                              <MenuItem value="email">Email</MenuItem>
                              <MenuItem value="portal">Portail</MenuItem>
                              <MenuItem value="both">Les deux</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    </Card>
                  ))}

                  {newReport.recipients.length === 0 && (
                    <Alert severity="info">
                      Ajoutez au moins un destinataire pour recevoir le rapport.
                    </Alert>
                  )}
                </Box>

                <Box sx={{ mb: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleCreateReport}
                    disabled={newReport.recipients.length === 0}
                    sx={{ mr: 1 }}
                  >
                    Créer le Rapport
                  </Button>
                  <Button onClick={() => setActiveStep(1)}>
                    Retour
                  </Button>
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialog(false)}>Annuler</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScheduledReportsManager;