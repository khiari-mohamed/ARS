import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Error,
  Analytics,
  Lightbulb,
  BugReport
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const AlertAnalyticsDashboard: React.FC = () => {
  const [period, setPeriod] = useState('30d');
  const [effectiveness, setEffectiveness] = useState<any[]>([]);
  const [falsePositives, setFalsePositives] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [fpDialog, setFpDialog] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [fpReason, setFpReason] = useState('');
  const [fpCategory, setFpCategory] = useState('');

  useEffect(() => {
    loadAnalyticsData();
  }, [period]);

  const loadAnalyticsData = async () => {
    try {
      // Mock data
      setEffectiveness([
        {
          alertType: 'SLA_BREACH',
          totalAlerts: 156,
          truePositives: 142,
          falsePositives: 14,
          precision: 91.0,
          recall: 88.2,
          f1Score: 89.6,
          accuracy: 89.1
        },
        {
          alertType: 'SYSTEM_DOWN',
          totalAlerts: 89,
          truePositives: 85,
          falsePositives: 4,
          precision: 95.5,
          recall: 92.4,
          f1Score: 93.9,
          accuracy: 94.2
        },
        {
          alertType: 'HIGH_VOLUME',
          totalAlerts: 234,
          truePositives: 198,
          falsePositives: 36,
          precision: 84.6,
          recall: 86.1,
          f1Score: 85.3,
          accuracy: 84.9
        },
        {
          alertType: 'PROCESSING_DELAY',
          totalAlerts: 123,
          truePositives: 98,
          falsePositives: 25,
          precision: 79.7,
          recall: 81.3,
          f1Score: 80.5,
          accuracy: 80.1
        }
      ]);

      setFalsePositives([
        {
          alertId: 'alert_001',
          alertType: 'SLA_BREACH',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          reason: 'Threshold set too low for weekend processing',
          category: 'threshold_too_low',
          impact: 'medium',
          preventable: true
        },
        {
          alertId: 'alert_002',
          alertType: 'SYSTEM_DOWN',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          reason: 'Scheduled maintenance not excluded',
          category: 'system_maintenance',
          impact: 'high',
          preventable: true
        },
        {
          alertId: 'alert_003',
          alertType: 'HIGH_VOLUME',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          reason: 'Data spike due to batch processing',
          category: 'data_anomaly',
          impact: 'low',
          preventable: false
        }
      ]);

      setTrends(Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        totalAlerts: Math.floor(Math.random() * 50) + 20,
        falsePositives: Math.floor(Math.random() * 10) + 2,
        avgResolutionTime: Math.random() * 60 + 30
      })));

      setRecommendations([
        {
          type: 'threshold_adjustment',
          alertType: 'PROCESSING_DELAY',
          description: 'Adjust thresholds for PROCESSING_DELAY to reduce false positives',
          expectedImpact: 'Reduce false positives by ~8%',
          priority: 'high',
          estimatedEffort: '2-4 hours'
        },
        {
          type: 'rule_modification',
          alertType: 'HIGH_VOLUME',
          description: 'Add batch processing detection to HIGH_VOLUME alerts',
          expectedImpact: 'Eliminate 15 false positives per month',
          priority: 'medium',
          estimatedEffort: '1-2 days'
        },
        {
          type: 'new_alert',
          alertType: 'SLA_BREACH',
          description: 'Create early warning alert for SLA_BREACH to reduce resolution time',
          expectedImpact: 'Reduce resolution time by 30-50%',
          priority: 'medium',
          estimatedEffort: '1-2 days'
        }
      ]);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    }
  };

  const handleTrackFalsePositive = async () => {
    if (!selectedAlert || !fpReason || !fpCategory) return;

    try {
      // Mock tracking
      console.log('Tracking false positive:', { selectedAlert, fpReason, fpCategory });
      setFpDialog(false);
      setFpReason('');
      setFpCategory('');
      setSelectedAlert(null);
      await loadAnalyticsData();
    } catch (error) {
      console.error('Failed to track false positive:', error);
    }
  };

  const getEffectivenessColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 80) return 'warning';
    return 'error';
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Analyses des Alertes
        </Typography>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Période</InputLabel>
          <Select
            value={period}
            label="Période"
            onChange={(e) => setPeriod(e.target.value)}
            size="small"
          >
            <MenuItem value="7d">7 jours</MenuItem>
            <MenuItem value="30d">30 jours</MenuItem>
            <MenuItem value="90d">90 jours</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Efficacité Moyenne
              </Typography>
              <Typography variant="h4" component="div">
                {effectiveness.length > 0 ? 
                  (effectiveness.reduce((sum, e) => sum + e.f1Score, 0) / effectiveness.length).toFixed(1) : 0
                }%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Faux Positifs
              </Typography>
              <Typography variant="h4" component="div">
                {falsePositives.length}
              </Typography>
              <Typography variant="caption" color="warning.main">
                {falsePositives.filter(fp => fp.preventable).length} évitables
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Recommandations
              </Typography>
              <Typography variant="h4" component="div">
                {recommendations.length}
              </Typography>
              <Typography variant="caption" color="error.main">
                {recommendations.filter(r => r.priority === 'high').length} prioritaires
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Types d'Alertes
              </Typography>
              <Typography variant="h4" component="div">
                {effectiveness.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Alert Effectiveness */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Analytics sx={{ mr: 1, verticalAlign: 'middle' }} />
                Efficacité des Alertes
              </Typography>
              
              <List>
                {effectiveness.map((metric) => (
                  <ListItem key={metric.alertType}>
                    <ListItemIcon>
                      <CheckCircle color={getEffectivenessColor(metric.f1Score) as any} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle2">
                            {metric.alertType}
                          </Typography>
                          <Chip
                            label={`F1: ${metric.f1Score}%`}
                            color={getEffectivenessColor(metric.f1Score) as any}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Précision: {metric.precision}% | Rappel: {metric.recall}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {metric.totalAlerts} alertes | {metric.falsePositives} faux positifs
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* False Positives */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  <BugReport sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Faux Positifs Récents
                </Typography>
                <Button
                  size="small"
                  startIcon={<Warning />}
                  onClick={() => setFpDialog(true)}
                >
                  Signaler
                </Button>
              </Box>
              
              <List>
                {falsePositives.map((fp) => (
                  <ListItem key={fp.alertId}>
                    <ListItemIcon>
                      <Error color={getImpactColor(fp.impact) as any} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle2">
                            {fp.alertType}
                          </Typography>
                          <Chip
                            label={fp.impact}
                            color={getImpactColor(fp.impact) as any}
                            size="small"
                          />
                          {fp.preventable && (
                            <Chip label="Évitable" color="warning" size="small" variant="outlined" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {fp.reason}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(fp.timestamp).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Trends Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tendances des Alertes
              </Typography>
              
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="totalAlerts" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="Total Alertes"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="falsePositives" 
                    stroke="#ff7300" 
                    strokeWidth={2}
                    name="Faux Positifs"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recommendations */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Lightbulb sx={{ mr: 1, verticalAlign: 'middle' }} />
                Recommandations
              </Typography>
              
              {recommendations.map((rec, index) => (
                <Alert
                  key={index}
                  severity={getPriorityColor(rec.priority) as any}
                  sx={{ mb: 2 }}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    {rec.alertType}
                  </Typography>
                  <Typography variant="body2">
                    {rec.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Impact: {rec.expectedImpact} | Effort: {rec.estimatedEffort}
                  </Typography>
                </Alert>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Métriques de Performance
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Précision par Type d'Alerte
                  </Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={effectiveness}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="alertType" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="precision" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Répartition des Faux Positifs
                  </Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Seuil trop bas', value: 8 },
                          { name: 'Maintenance', value: 5 },
                          { name: 'Anomalie données', value: 3 },
                          { name: 'Config erreur', value: 2 }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* False Positive Dialog */}
      <Dialog open={fpDialog} onClose={() => setFpDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Signaler un Faux Positif</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ID de l'alerte"
                value={selectedAlert?.id || ''}
                onChange={(e) => setSelectedAlert({ id: e.target.value })}
                placeholder="alert_001"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Catégorie</InputLabel>
                <Select
                  value={fpCategory}
                  label="Catégorie"
                  onChange={(e) => setFpCategory(e.target.value)}
                >
                  <MenuItem value="threshold_too_low">Seuil trop bas</MenuItem>
                  <MenuItem value="system_maintenance">Maintenance système</MenuItem>
                  <MenuItem value="data_anomaly">Anomalie de données</MenuItem>
                  <MenuItem value="configuration_error">Erreur de configuration</MenuItem>
                  <MenuItem value="other">Autre</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Raison du faux positif"
                value={fpReason}
                onChange={(e) => setFpReason(e.target.value)}
                placeholder="Décrivez pourquoi cette alerte était un faux positif..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFpDialog(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleTrackFalsePositive}
            disabled={!selectedAlert?.id || !fpReason || !fpCategory}
          >
            Signaler
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AlertAnalyticsDashboard;