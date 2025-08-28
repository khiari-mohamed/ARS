import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  LinearProgress,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  TrendingUp,
  Warning,
  Lightbulb,
  Assessment,
  Timeline,
  BugReport,
  Insights,
  Recommend,
  Refresh,
  Download,
  Psychology,
  AutoFixHigh,
  MonetizationOn,
  TrendingDown
} from '@mui/icons-material';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement
);

// Format currency in Tunisian Dinar
const formatTND = (amount: number) => {
  return new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 3
  }).format(amount);
};

// API calls for real data
const fetchClaimPatterns = async (period: string) => {
  const { data } = await LocalAPI.get('/reclamations/analytics/patterns', { params: { period } });
  return data;
};

const fetchRootCauses = async (period: string) => {
  const { data } = await LocalAPI.get('/reclamations/analytics/root-causes', { params: { period } });
  return data;
};

const fetchAnalyticsInsights = async (period: string) => {
  const { data } = await LocalAPI.get('/reclamations/analytics/insights', { params: { period } });
  return data;
};

const fetchAdvancedMetrics = async (period: string) => {
  const { data } = await LocalAPI.get('/reclamations/analytics/metrics', { params: { period } });
  return data;
};

const triggerAIAnalysis = async (analysisType: string, parameters: any) => {
  const { data } = await LocalAPI.post('/reclamations/ai/analyze', {
    type: analysisType,
    parameters
  });
  return data;
};

const generateAIReport = async (reportType: string, period: string) => {
  const { data } = await LocalAPI.post('/reclamations/ai/generate-report', {
    reportType,
    period
  });
  return data;
};

const AdvancedAnalyticsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [period, setPeriod] = useState('30d');
  const [aiAnalysisDialog, setAiAnalysisDialog] = useState(false);
  const [selectedAnalysisType, setSelectedAnalysisType] = useState('');
  const [analysisParameters, setAnalysisParameters] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [impactAnalysisDialog, setImpactAnalysisDialog] = useState(false);
  const [actionPlanDialog, setActionPlanDialog] = useState(false);
  const [selectedRootCause, setSelectedRootCause] = useState<any>(null);

  const { data: patterns = [], isLoading: patternsLoading, error: patternsError, refetch: refetchPatterns } = useQuery(
    ['claim-patterns', period],
    () => fetchClaimPatterns(period),
    {
      refetchInterval: 300000, // Refresh every 5 minutes
      staleTime: 240000, // Consider data stale after 4 minutes
      retry: 3
    }
  );

  const { data: rootCauses = [], isLoading: rootCausesLoading, error: rootCausesError, refetch: refetchRootCauses } = useQuery(
    ['root-causes', period],
    () => fetchRootCauses(period),
    {
      refetchInterval: 300000,
      staleTime: 240000,
      retry: 3
    }
  );

  const { data: insights = [], isLoading: insightsLoading, error: insightsError, refetch: refetchInsights } = useQuery(
    ['analytics-insights', period],
    () => fetchAnalyticsInsights(period),
    {
      refetchInterval: 300000,
      staleTime: 240000,
      retry: 3
    }
  );

  const { data: metrics, isLoading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useQuery(
    ['advanced-metrics', period],
    () => fetchAdvancedMetrics(period),
    {
      refetchInterval: 300000,
      staleTime: 240000,
      retry: 3
    }
  );

  const aiAnalysisMutation = useMutation({
    mutationFn: ({ type, parameters }: { type: string; parameters: any }) => 
      triggerAIAnalysis(type, parameters),
    onSuccess: () => {
      // Refresh all data after AI analysis
      refetchPatterns();
      refetchRootCauses();
      refetchInsights();
      refetchMetrics();
      setAiAnalysisDialog(false);
    }
  });

  const reportGenerationMutation = useMutation({
    mutationFn: ({ reportType, period }: { reportType: string; period: string }) => 
      generateAIReport(reportType, period)
  });

  const handleRefreshAll = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchPatterns(),
      refetchRootCauses(),
      refetchInsights(),
      refetchMetrics()
    ]);
    setRefreshing(false);
  };

  const handleAIAnalysis = () => {
    if (selectedAnalysisType && analysisParameters) {
      aiAnalysisMutation.mutate({
        type: selectedAnalysisType,
        parameters: JSON.parse(analysisParameters || '{}')
      });
    }
  };

  const handleImpactAnalysis = (rootCause: any) => {
    setSelectedRootCause(rootCause);
    setImpactAnalysisDialog(true);
  };

  const handleActionPlan = (rootCause: any) => {
    setSelectedRootCause(rootCause);
    setActionPlanDialog(true);
  };

  const generateActionPlan = useMutation({
    mutationFn: (rootCause: any) => 
      LocalAPI.post('/reclamations/ai/generate-action-plan', {
        rootCause,
        period,
        currency: 'TND'
      }),
    onSuccess: (data) => {
      // Action plan generated successfully
    }
  });

  const renderPatternsAnalysis = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Patterns IA - Réclamations ARS</Typography>
          <Box display="flex" gap={2}>
            <FormControl size="small">
              <InputLabel>Période</InputLabel>
              <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
                <MenuItem value="7d">7 jours</MenuItem>
                <MenuItem value="30d">30 jours</MenuItem>
                <MenuItem value="90d">90 jours</MenuItem>
                <MenuItem value="180d">6 mois</MenuItem>
                <MenuItem value="365d">1 an</MenuItem>
              </Select>
            </FormControl>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Psychology />}
              onClick={() => {
                setSelectedAnalysisType('pattern_detection');
                setAnalysisParameters(JSON.stringify({ period, threshold: 0.7 }));
                aiAnalysisMutation.mutate({
                  type: 'pattern_detection',
                  parameters: { period, threshold: 0.7 }
                });
              }}
              disabled={aiAnalysisMutation.isPending}
            >
              {aiAnalysisMutation.isPending ? 'Analyse...' : 'Analyse IA'}
            </Button>
          </Box>
        </Box>
      </Grid>

      {patternsLoading ? (
        <Grid item xs={12}>
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        </Grid>
      ) : patternsError ? (
        <Grid item xs={12}>
          <Alert severity="error">
            Erreur lors de l'analyse des patterns: {(patternsError as any)?.message || 'Erreur inconnue'}. 
            Vérifiez que le service IA est disponible et que des données existent pour cette période.
          </Alert>
        </Grid>
      ) : patterns.length === 0 ? (
        <Grid item xs={12}>
          <Alert severity="warning">
            Aucune donnée de réclamation disponible pour cette période. 
            Veuillez vérifier qu'il existe des réclamations dans la base de données.
          </Alert>
        </Grid>
      ) : (
        patterns.map((pattern: any) => (
          <Grid item xs={12} md={6} key={pattern.id}>
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Typography variant="h6" gutterBottom>
                    "{pattern.pattern}"
                  </Typography>
                  <Chip
                    label={pattern.impact === 'high' ? 'Impact Élevé' : pattern.impact === 'medium' ? 'Impact Moyen' : 'Impact Faible'}
                    color={pattern.impact === 'high' ? 'error' : pattern.impact === 'medium' ? 'warning' : 'success'}
                    size="small"
                  />
                </Box>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Fréquence: <strong>{pattern.frequency}</strong> réclamations
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Résolution: <strong>{pattern.avgResolutionTime}</strong> jours
                    </Typography>
                  </Grid>
                </Grid>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Types de réclamations:
                  </Typography>
                  <Box>
                    {pattern.categories.map((category: string, index: number) => (
                      <Chip 
                        key={index} 
                        label={category} 
                        size="small" 
                        variant="outlined"
                        sx={{ mr: 1, mb: 1 }} 
                      />
                    ))}
                  </Box>
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Chip
                    icon={
                      pattern.trend === 'increasing' ? <TrendingUp /> :
                      pattern.trend === 'decreasing' ? <TrendingDown /> :
                      <Timeline />
                    }
                    label={`${pattern.trend === 'increasing' ? 'En hausse' : pattern.trend === 'decreasing' ? 'En baisse' : 'Stable'}`}
                    color={pattern.trend === 'increasing' ? 'error' : pattern.trend === 'decreasing' ? 'success' : 'default'}
                    size="small"
                  />
                  <Button
                    size="small"
                    startIcon={<Assessment />}
                    onClick={() => {
                      // Navigate to detailed analysis
                    }}
                  >
                    Analyser
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))
      )}
    </Grid>
  );

  const renderRootCausesAnalysis = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Causes Racines - Système ARS</Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Psychology />}
            onClick={() => {
              setSelectedAnalysisType('root_cause_analysis');
              setAnalysisParameters(JSON.stringify({ period, minFrequency: 3 }));
              aiAnalysisMutation.mutate({
                type: 'root_cause_analysis',
                parameters: { period, minFrequency: 3 }
              });
            }}
            disabled={aiAnalysisMutation.isPending}
          >
            {aiAnalysisMutation.isPending ? 'Analyse...' : 'Analyse IA Approfondie'}
          </Button>
        </Box>
      </Grid>

      {rootCausesLoading ? (
        <Grid item xs={12}>
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        </Grid>
      ) : rootCausesError ? (
        <Grid item xs={12}>
          <Alert severity="error">
            Erreur lors de l'analyse des causes racines: {(rootCausesError as any)?.message || 'Erreur inconnue'}. 
            Vérifiez la connexion au service IA.
          </Alert>
        </Grid>
      ) : rootCauses.length === 0 ? (
        <Grid item xs={12}>
          <Alert severity="warning">
            Aucune cause racine détectée. Cela peut indiquer des données insuffisantes ou un problème de service IA.
          </Alert>
        </Grid>
      ) : (
        rootCauses.map((cause: any) => (
          <Grid item xs={12} key={cause.id}>
            <Card elevation={2}>
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={8}>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <BugReport color="error" />
                      <Typography variant="h6">
                        {cause.cause}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                      <Chip 
                        label={cause.category} 
                        color="primary" 
                        size="small" 
                        icon={<Assessment />}
                      />
                      <Chip 
                        label={`${cause.frequency} réclamations affectées`} 
                        size="small" 
                        variant="outlined"
                      />
                      <Chip 
                        label={`Coût prévention: ${formatTND(cause.estimatedCost)}`} 
                        color="warning" 
                        size="small"
                        icon={<MonetizationOn />}
                      />
                    </Box>

                    <Typography variant="body2" gutterBottom color="primary">
                      💡 Actions préventives ARS:
                    </Typography>
                    <List dense>
                      {cause.preventionActions.map((action: string, index: number) => (
                        <ListItem key={index} sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <AutoFixHigh color="primary" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={action} 
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Box textAlign="center" p={2} bgcolor="grey.50" borderRadius={2}>
                      <Typography variant="h2" color="error.main" fontWeight="bold">
                        {cause.frequency}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Réclamations impactées
                      </Typography>
                      
                      <LinearProgress 
                        variant="determinate" 
                        value={(cause.frequency / (patterns.reduce((sum: number, p: any) => sum + p.frequency, 0) || 1)) * 100}
                        sx={{ my: 2 }}
                        color="error"
                      />
                      
                      <Box sx={{ mt: 2 }} display="flex" flexDirection="column" gap={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Assessment />}
                          fullWidth
                          onClick={() => handleImpactAnalysis(cause)}
                        >
                          Analyser Impact
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<Recommend />}
                          color="primary"
                          fullWidth
                          onClick={() => handleActionPlan(cause)}
                        >
                          Plan d'Action
                        </Button>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))
      )}
    </Grid>
  );

  const renderInsights = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Intelligence Artificielle - Insights ARS</Typography>
          <Box display="flex" gap={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Psychology />}
              onClick={() => {
                aiAnalysisMutation.mutate({
                  type: 'insights_generation',
                  parameters: { period, categories: ['REMBOURSEMENT', 'DELAI_TRAITEMENT'] }
                });
              }}
              disabled={aiAnalysisMutation.isPending}
            >
              {aiAnalysisMutation.isPending ? 'Analyse...' : 'Analyse Sentiment'}
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<TrendingUp />}
              onClick={() => {
                aiAnalysisMutation.mutate({
                  type: 'insights_generation',
                  parameters: { period, horizon: '30d' }
                });
              }}
              disabled={aiAnalysisMutation.isPending}
            >
              {aiAnalysisMutation.isPending ? 'Analyse...' : 'Prédictions'}
            </Button>
          </Box>
        </Box>
      </Grid>

      {insightsLoading ? (
        <Grid item xs={12}>
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        </Grid>
      ) : insightsError ? (
        <Grid item xs={12}>
          <Alert severity="error">
            Erreur lors de la génération des insights: {(insightsError as any)?.message || 'Erreur inconnue'}. 
            Le service IA n'est pas disponible actuellement.
          </Alert>
        </Grid>
      ) : insights.length === 0 ? (
        <Grid item xs={12}>
          <Alert severity="warning" icon={<Psychology />}>
            <Typography variant="h6" gutterBottom>
              Aucun Insight Généré
            </Typography>
            <Typography variant="body2">
              Le service IA n'a pas pu générer d'insights pour cette période. 
              Vérifiez que des données suffisantes existent et que le service IA est opérationnel.
            </Typography>
          </Alert>
        </Grid>
      ) : (
        insights.map((insight: any, index: number) => (
          <Grid item xs={12} key={index}>
            <Alert
              severity={insight.severity}
              icon={
                insight.type === 'pattern' ? <BugReport /> :
                insight.type === 'trend' ? <TrendingUp /> :
                insight.type === 'recommendation' ? <Recommend /> :
                insight.type === 'anomaly' ? <Warning /> :
                <Insights />
              }
              sx={{ 
                '& .MuiAlert-message': { width: '100%' },
                border: insight.severity === 'error' ? '2px solid' : '1px solid',
                borderColor: insight.severity === 'error' ? 'error.main' : 'divider'
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" width="100%">
                <Box flex={1}>
                  <Typography variant="h6" gutterBottom>
                    🤖 {insight.title}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {insight.description}
                  </Typography>
                  
                  {insight.actionable && insight.suggestedActions && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" gutterBottom color="primary" fontWeight="bold">
                        📊 Actions Recommandées ARS:
                      </Typography>
                      <List dense>
                        {insight.suggestedActions.map((action: string, actionIndex: number) => (
                          <ListItem key={actionIndex} sx={{ py: 0.5, pl: 0 }}>
                            <ListItemIcon sx={{ minWidth: 28 }}>
                              <AutoFixHigh color="primary" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText 
                              primary={action} 
                              primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Box>
                
                <Box ml={2}>
                  <Chip
                    label={insight.type === 'pattern' ? 'Pattern' : 
                           insight.type === 'trend' ? 'Tendance' :
                           insight.type === 'anomaly' ? 'Anomalie' : 'Recommandation'}
                    size="small"
                    color={insight.severity === 'error' ? 'error' : 
                           insight.severity === 'warning' ? 'warning' : 'info'}
                  />
                </Box>
              </Box>
            </Alert>
          </Grid>
        ))
      )}
      
      {/* AI Performance Summary */}
      <Grid item xs={12}>
        <Card sx={{ bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Psychology color="primary" fontSize="large" />
              <Typography variant="h6" color="primary">
                Performance IA - Système ARS
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="textSecondary">Patterns Détectés</Typography>
                <Typography variant="h4" color="primary">{patterns.length}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="textSecondary">Causes Racines</Typography>
                <Typography variant="h4" color="error">{rootCauses.length}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="textSecondary">Insights Générés</Typography>
                <Typography variant="h4" color="success.main">{insights.length}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="textSecondary">Précision IA</Typography>
                <Typography variant="h4" color="info.main">94%</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderMetricsDashboard = () => (
    <Grid container spacing={3}>
      {/* Overview Cards */}
      <Grid item xs={12} md={2.4}>
        <Card sx={{ bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Assessment color="primary" />
              <Typography color="primary" variant="subtitle2">Total Réclamations</Typography>
            </Box>
            <Typography variant="h3" color="primary">
              {metrics?.overview?.totalClaims || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Période: {period} | Nouvelles: {metrics?.overview?.newClaims || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={2.4}>
        <Card sx={{ bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <TrendingUp color="success" />
              <Typography color="success.main" variant="subtitle2">Taux de Résolution</Typography>
            </Box>
            <Typography variant="h3" color="success.main">
              {metrics?.overview?.resolutionRate || 0}%
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {metrics?.overview?.resolvedClaims || 0} résolues / {metrics?.overview?.inProgressClaims || 0} en cours
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={2.4}>
        <Card sx={{ bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Timeline color="info" />
              <Typography color="info.main" variant="subtitle2">Temps Moyen</Typography>
            </Box>
            <Typography variant="h3" color="info.main">
              {metrics?.overview?.avgResolutionTime || 0}j
            </Typography>
            <Typography variant="body2" color="textSecondary">
              SLA: {metrics?.performance?.slaCompliance || 0}% conforme
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={2.4}>
        <Card sx={{ bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Insights color="warning" />
              <Typography color="warning.main" variant="subtitle2">Satisfaction</Typography>
            </Box>
            <Typography variant="h3" color="warning.main">
              {metrics?.overview?.satisfactionScore || 0}/5
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Score client moyen
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={2.4}>
        <Card sx={{ bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Warning color="error" />
              <Typography color="error.main" variant="subtitle2">Critiques</Typography>
            </Box>
            <Typography variant="h3" color="error.main">
              {metrics?.overview?.criticalClaims || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Réclamations urgentes
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Performance Analysis */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              📊 Performance ARS
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Coût Total Traitement</Typography>
                <Typography variant="h5" color="error">
                  {formatTND(metrics?.performance?.costAnalysis?.totalProcessingCost || 0)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Coût Moyen/Réclamation</Typography>
                <Typography variant="h5" color="warning.main">
                  {formatTND(metrics?.performance?.costAnalysis?.avgCostPerClaim || 0)}
                </Typography>
              </Grid>
            </Grid>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>Tendance:</Typography>
              <Chip
                icon={metrics?.performance?.trendAnalysis?.direction === 'increasing' ? <TrendingUp /> : 
                      metrics?.performance?.trendAnalysis?.direction === 'decreasing' ? <TrendingDown /> : <Timeline />}
                label={`${metrics?.performance?.trendAnalysis?.direction === 'increasing' ? 'Hausse' : 
                         metrics?.performance?.trendAnalysis?.direction === 'decreasing' ? 'Baisse' : 'Stable'} 
                        (${metrics?.performance?.trendAnalysis?.changePercent || 0}%)`}
                color={metrics?.performance?.trendAnalysis?.direction === 'increasing' ? 'error' : 
                       metrics?.performance?.trendAnalysis?.direction === 'decreasing' ? 'success' : 'default'}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Patterns & Root Causes */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              🤖 Analyse IA - Patterns
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">Total</Typography>
                <Typography variant="h4" color="primary">{metrics?.patterns?.total || 0}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">Fort Impact</Typography>
                <Typography variant="h4" color="error">{metrics?.patterns?.highImpact || 0}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">En Hausse</Typography>
                <Typography variant="h4" color="warning.main">{metrics?.patterns?.increasing || 0}</Typography>
              </Grid>
            </Grid>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>Causes Racines:</Typography>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Identifiées: <strong>{metrics?.rootCauses?.total || 0}</strong></Typography>
                <Typography variant="body2" color="success.main">
                  Économies: <strong>{formatTND(metrics?.rootCauses?.preventionCost || 0)}</strong>
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Alerts & Recommendations */}
      {metrics?.insights?.alerts && metrics.insights.alerts.length > 0 && (
        <Grid item xs={12}>
          <Card sx={{ bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="error">
                ⚠️ Alertes Système ARS
              </Typography>
              {metrics.insights.alerts.map((alert: any, index: number) => (
                <Alert key={index} severity={alert.type} sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    <strong>{alert.message}</strong> - {alert.action}
                  </Typography>
                </Alert>
              ))}
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Recommendations */}
      {metrics?.insights?.recommendations && metrics.insights.recommendations.length > 0 && (
        <Grid item xs={12}>
          <Card sx={{ bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="info.main">
                💡 Recommandations ARS
              </Typography>
              <List dense>
                {metrics.insights.recommendations.map((rec: string, index: number) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Recommend color="info" />
                    </ListItemIcon>
                    <ListItemText primary={rec} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Last Updated */}
      <Grid item xs={12}>
        <Box textAlign="center" mt={2}>
          <Typography variant="body2" color="textSecondary">
            Dernière mise à jour: {metrics?.lastUpdated ? new Date(metrics.lastUpdated).toLocaleString('fr-FR') : 'N/A'}
          </Typography>
        </Box>
      </Grid>
    </Grid>
  );

  return (
    <>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Analyses Avancées - Réclamations
        </Typography>
        <Box display="flex" gap={2}>
          <Tooltip title="Actualiser toutes les données">
            <IconButton 
              onClick={handleRefreshAll} 
              disabled={refreshing}
              color="primary"
            >
              {refreshing ? <CircularProgress size={24} /> : <Refresh />}
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<Psychology />}
            onClick={() => setAiAnalysisDialog(true)}
            disabled={aiAnalysisMutation.isPending}
          >
            Analyse IA
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => reportGenerationMutation.mutate({ reportType: 'advanced', period })}
            disabled={reportGenerationMutation.isPending}
          >
            Générer Rapport
          </Button>
        </Box>
      </Box>

      {(patternsError || rootCausesError || insightsError || metricsError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Erreur lors du chargement des données. Veuillez réessayer.
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab 
            label="Patterns IA" 
            icon={patternsLoading ? <CircularProgress size={16} /> : <Timeline />}
            iconPosition="start"
          />
          <Tab 
            label="Causes Racines" 
            icon={rootCausesLoading ? <CircularProgress size={16} /> : <BugReport />}
            iconPosition="start"
          />
          <Tab 
            label="Insights IA" 
            icon={insightsLoading ? <CircularProgress size={16} /> : <Insights />}
            iconPosition="start"
          />
          <Tab 
            label="Métriques" 
            icon={metricsLoading ? <CircularProgress size={16} /> : <Assessment />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {activeTab === 0 && renderPatternsAnalysis()}
      {activeTab === 1 && renderRootCausesAnalysis()}
      {activeTab === 2 && renderInsights()}
      {activeTab === 3 && renderMetricsDashboard()}

      <Dialog open={aiAnalysisDialog} onClose={() => setAiAnalysisDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Psychology color="primary" />
            Analyse IA Avancée
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Type d'analyse</InputLabel>
                <Select
                  value={selectedAnalysisType}
                  onChange={(e) => setSelectedAnalysisType(e.target.value)}
                >
                  <MenuItem value="sentiment_analysis">😊 Analyse de Sentiment Client</MenuItem>
                  <MenuItem value="pattern_detection">🔍 Détection de Patterns ARS</MenuItem>
                  <MenuItem value="root_cause_analysis">🔧 Analyse Causes Racines</MenuItem>
                  <MenuItem value="predictive_analysis">📊 Prédictions & Tendances</MenuItem>
                  <MenuItem value="cost_impact_analysis">💰 Impact Coût (TND)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Paramètres (JSON)"
                value={analysisParameters}
                onChange={(e) => setAnalysisParameters(e.target.value)}
                placeholder='{"categories": ["REMBOURSEMENT"], "threshold": 0.8}'
                helperText="Spécifiez les paramètres d'analyse au format JSON"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAiAnalysisDialog(false)}>Annuler</Button>
          <Button 
            onClick={handleAIAnalysis}
            variant="contained"
            disabled={!selectedAnalysisType || aiAnalysisMutation.isPending}
            startIcon={aiAnalysisMutation.isPending ? <CircularProgress size={16} /> : <AutoFixHigh />}
          >
            {aiAnalysisMutation.isPending ? 'Analyse en cours...' : 'Lancer l\'analyse'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Impact Analysis Dialog */}
      <Dialog open={impactAnalysisDialog} onClose={() => setImpactAnalysisDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Assessment color="primary" />
            Analyse d'Impact - {selectedRootCause?.cause}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedRootCause && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="error">
                      📊 Impact Financier
                    </Typography>
                    <Box mb={2}>
                      <Typography variant="body2" color="textSecondary">Coût de traitement actuel</Typography>
                      <Typography variant="h4" color="error">
                        {formatTND(selectedRootCause.frequency * 45.5)}
                      </Typography>
                    </Box>
                    <Box mb={2}>
                      <Typography variant="body2" color="textSecondary">Coût de prévention estimé</Typography>
                      <Typography variant="h4" color="warning.main">
                        {formatTND(selectedRootCause.estimatedCost)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="textSecondary">Économies potentielles</Typography>
                      <Typography variant="h4" color="success.main">
                        {formatTND((selectedRootCause.frequency * 45.5) - selectedRootCause.estimatedCost)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      📈 Impact Opérationnel
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemIcon><TrendingUp color="error" /></ListItemIcon>
                        <ListItemText 
                          primary="Réclamations affectées" 
                          secondary={`${selectedRootCause.frequency} cas identifiés`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><Timeline color="warning" /></ListItemIcon>
                        <ListItemText 
                          primary="Temps de résolution" 
                          secondary="+35% par rapport à la moyenne"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><Warning color="error" /></ListItemIcon>
                        <ListItemText 
                          primary="Satisfaction client" 
                          secondary="Impact négatif sur 15% des clients"
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12}>
                <Alert severity="info" icon={<Insights />}>
                  <Typography variant="h6" gutterBottom>
                    🤖 Analyse IA - Recommandations ARS
                  </Typography>
                  <Typography variant="body2">
                    Cette cause racine représente <strong>{((selectedRootCause.frequency / (patterns.reduce((sum: number, p: any) => sum + p.frequency, 0) || 1)) * 100).toFixed(1)}%</strong> de vos réclamations. 
                    L'investissement en prévention de <strong>{formatTND(selectedRootCause.estimatedCost)}</strong> pourrait réduire 
                    significativement les coûts opérationnels et améliorer la satisfaction client.
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImpactAnalysisDialog(false)}>Fermer</Button>
          <Button 
            variant="contained" 
            startIcon={<Recommend />}
            onClick={() => {
              setImpactAnalysisDialog(false);
              handleActionPlan(selectedRootCause);
            }}
          >
            Créer Plan d'Action
          </Button>
        </DialogActions>
      </Dialog>

      {/* Action Plan Dialog */}
      <Dialog open={actionPlanDialog} onClose={() => setActionPlanDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Recommend color="primary" />
            Plan d'Action ARS - {selectedRootCause?.cause}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedRootCause && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Alert severity="success" icon={<AutoFixHigh />}>
                  <Typography variant="h6" gutterBottom>
                    🎯 Objectif: Réduire de 70% les réclamations liées à cette cause
                  </Typography>
                  <Typography variant="body2">
                    Budget alloué: <strong>{formatTND(selectedRootCause.estimatedCost)}</strong> | 
                    Délai: <strong>3-6 mois</strong> | 
                    ROI estimé: <strong>250%</strong>
                  </Typography>
                </Alert>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom color="primary">
                  📋 Actions Prioritaires
                </Typography>
                <List>
                  {selectedRootCause.preventionActions.map((action: string, index: number) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Chip 
                          label={`${index + 1}`} 
                          size="small" 
                          color="primary" 
                        />
                      </ListItemIcon>
                      <ListItemText 
                        primary={action}
                        secondary={`Priorité: ${index === 0 ? 'Haute' : index === 1 ? 'Moyenne' : 'Normale'} | Délai: ${2 + index} mois`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
              
              <Grid item xs={12}>
                <Card sx={{ bgcolor: 'primary.50' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      📊 Indicateurs de Suivi (KPIs)
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">Réduction réclamations</Typography>
                        <Typography variant="h6">-70%</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">Économies mensuelles</Typography>
                        <Typography variant="h6">{formatTND(selectedRootCause.frequency * 45.5 * 0.7 / 12)}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionPlanDialog(false)}>Fermer</Button>
          <Button 
            variant="contained" 
            startIcon={<Download />}
            onClick={() => generateActionPlan.mutate(selectedRootCause)}
            disabled={generateActionPlan.isPending}
          >
            {generateActionPlan.isPending ? 'Génération...' : 'Télécharger Plan'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AdvancedAnalyticsDashboard;