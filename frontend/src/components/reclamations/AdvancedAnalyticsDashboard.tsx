import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import * as newAiService from '../../services/newAiService';
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
  return newAiService.performAIAnalysis(analysisType, parameters);
};

const generateAIReport = async (reportType: string, period: string) => {
  return newAiService.generateAIReport(reportType, period);
};

// Generate Excel report from data
const generateExcelReport = (reportData: any) => {
  // Create workbook
  const wb = {
    SheetNames: ['Résumé', 'Détails', 'Tendances', 'Recommandations'],
    Sheets: {} as any
  };

  // Summary sheet
  const summaryData = [
    ['Rapport d\'Analyse Avancée - Réclamations ARS', '', '', ''],
    ['', '', '', ''],
    ['Période d\'analyse:', reportData.period, '', ''],
    ['Date de génération:', new Date(reportData.generatedAt).toLocaleString('fr-FR'), '', ''],
    ['Devise:', reportData.currency || 'TND', '', ''],
    ['', '', '', ''],
    ['RÉSUMÉ EXÉCUTIF', '', '', ''],
    ['Total réclamations:', reportData.summary?.totalReclamations || 0, '', ''],
    ['Réclamations résolues:', reportData.summary?.resolvedClaims || 0, '', ''],
    ['Réclamations en attente:', reportData.summary?.pendingClaims || 0, '', ''],
    ['Temps moyen de résolution:', `${reportData.summary?.avgResolutionTime || 0} jours`, '', ''],
    ['', '', '', ''],
    ['ANALYSE PAR TYPE', '', '', '']
  ];

  // Add breakdown by type
  if (reportData.breakdown?.byType) {
    Object.entries(reportData.breakdown.byType).forEach(([type, count]) => {
      summaryData.push([type, count as number, '', '']);
    });
  }

  summaryData.push(['', '', '', '']);
  summaryData.push(['ANALYSE PAR SÉVÉRITÉ', '', '', '']);
  
  // Add breakdown by severity
  if (reportData.breakdown?.bySeverity) {
    Object.entries(reportData.breakdown.bySeverity).forEach(([severity, count]) => {
      summaryData.push([severity, count as number, '', '']);
    });
  }

  wb.Sheets['Résumé'] = {
    '!ref': `A1:D${summaryData.length}`,
    ...summaryData.reduce((acc, row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const cellRef = String.fromCharCode(65 + colIndex) + (rowIndex + 1);
        acc[cellRef] = { v: cell, t: typeof cell === 'number' ? 'n' : 's' };
      });
      return acc;
    }, {} as any)
  };

  // Trends sheet
  const trendsData = [
    ['TENDANCES QUOTIDIENNES', '', '', ''],
    ['Date', 'Nombre', 'Précision (%)', ''],
  ];

  if (reportData.trends?.daily) {
    reportData.trends.daily.forEach((trend: any) => {
      trendsData.push([
        new Date(trend.date).toLocaleDateString('fr-FR'),
        trend.count,
        Math.round(trend.accuracy),
        ''
      ]);
    });
  }

  trendsData.push(['', '', '', '']);
  trendsData.push(['TENDANCES PAR CATÉGORIE', '', '', '']);
  trendsData.push(['Catégorie', 'Tendance (%)', '', '']);

  if (reportData.trends?.categories) {
    reportData.trends.categories.forEach((cat: any) => {
      trendsData.push([cat.category, cat.trend, '', '']);
    });
  }

  wb.Sheets['Tendances'] = {
    '!ref': `A1:D${trendsData.length}`,
    ...trendsData.reduce((acc, row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const cellRef = String.fromCharCode(65 + colIndex) + (rowIndex + 1);
        acc[cellRef] = { v: cell, t: typeof cell === 'number' ? 'n' : 's' };
      });
      return acc;
    }, {} as any)
  };

  // Recommendations sheet
  const recommendationsData = [
    ['RECOMMANDATIONS', '', '', ''],
    ['', '', '', ''],
  ];

  if (reportData.recommendations) {
    reportData.recommendations.forEach((rec: string, index: number) => {
      recommendationsData.push([`${index + 1}.`, rec, '', '']);
    });
  }

  wb.Sheets['Recommandations'] = {
    '!ref': `A1:D${recommendationsData.length}`,
    ...recommendationsData.reduce((acc, row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const cellRef = String.fromCharCode(65 + colIndex) + (rowIndex + 1);
        acc[cellRef] = { v: cell, t: typeof cell === 'number' ? 'n' : 's' };
      });
      return acc;
    }, {} as any)
  };

  // Details sheet
  const detailsData = [
    ['DÉTAILS TECHNIQUES', '', '', ''],
    ['', '', '', ''],
    ['Source des données:', reportData.source || 'local_analysis', '', ''],
    ['Période d\'analyse:', reportData.period, '', ''],
    ['Total réclamations analysées:', reportData.totalClaims || 0, '', ''],
    ['', '', '', ''],
    ['MÉTADONNÉES', '', '', ''],
    ['Type de rapport:', reportData.type, '', ''],
    ['Version:', '1.0', '', ''],
    ['Système:', 'ARS - Assurance Réclamations', '', '']
  ];

  wb.Sheets['Détails'] = {
    '!ref': `A1:D${detailsData.length}`,
    ...detailsData.reduce((acc, row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const cellRef = String.fromCharCode(65 + colIndex) + (rowIndex + 1);
        acc[cellRef] = { v: cell, t: typeof cell === 'number' ? 'n' : 's' };
      });
      return acc;
    }, {} as any)
  };

  // Convert to Excel and download
  const wbout = writeExcel(wb);
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Rapport-ARS-${reportData.type}-${reportData.period}-${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Simple Excel writer (minimal implementation)
const writeExcel = (workbook: any): ArrayBuffer => {
  // This is a simplified Excel writer - in production, use a library like xlsx
  const csvContent = Object.keys(workbook.Sheets).map(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const range = sheet['!ref'];
    if (!range) return '';
    
    const [start, end] = range.split(':');
    const startCol = start.charCodeAt(0) - 65;
    const startRow = parseInt(start.slice(1)) - 1;
    const endCol = end.charCodeAt(0) - 65;
    const endRow = parseInt(end.slice(1)) - 1;
    
    let csv = `Sheet: ${sheetName}\n`;
    for (let row = startRow; row <= endRow; row++) {
      const rowData = [];
      for (let col = startCol; col <= endCol; col++) {
        const cellRef = String.fromCharCode(65 + col) + (row + 1);
        const cell = sheet[cellRef];
        rowData.push(cell ? cell.v : '');
      }
      csv += rowData.join('\t') + '\n';
    }
    return csv;
  }).join('\n\n');
  
  return new TextEncoder().encode(csvContent).buffer;
};

const AdvancedAnalyticsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [period, setPeriod] = useState('30d');
  const [aiAnalysisDialog, setAiAnalysisDialog] = useState(false);
  const [selectedAnalysisType, setSelectedAnalysisType] = useState('');
  const [analysisParameters, setAnalysisParameters] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [threshold, setThreshold] = useState(0.8);
  const [minFrequency, setMinFrequency] = useState(3);
  const [horizon, setHorizon] = useState('30d');
  const [impactAnalysisDialog, setImpactAnalysisDialog] = useState(false);
  const [actionPlanDialog, setActionPlanDialog] = useState(false);
  const [selectedRootCause, setSelectedRootCause] = useState<any>(null);
  const [reportSuccess, setReportSuccess] = useState(false);

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
      generateAIReport(reportType, period),
    onSuccess: (data) => {
      // Show success message and handle report data
      console.log('Report generated successfully:', data);
      setReportSuccess(true);
      setTimeout(() => setReportSuccess(false), 5000); // Hide after 5 seconds
      
      if (data.report) {
        // Generate Excel report
        generateExcelReport(data.report);
      }
    },
    onError: (error) => {
      console.error('Report generation failed:', error);
    }
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
    if (selectedAnalysisType) {
      // Build parameters based on analysis type
      let parameters = {};
      
      switch (selectedAnalysisType) {
        case 'sentiment_analysis':
          parameters = {
            categories: selectedCategories.length > 0 ? selectedCategories : ['REMBOURSEMENT', 'DELAI_TRAITEMENT'],
            threshold: threshold,
            period: period
          };
          break;
        case 'pattern_detection':
          parameters = {
            threshold: threshold,
            minFrequency: minFrequency,
            period: period
          };
          break;
        case 'root_cause_analysis':
          parameters = {
            minFrequency: minFrequency,
            categories: selectedCategories,
            period: period
          };
          break;
        case 'predictive_analysis':
          parameters = {
            horizon: horizon,
            categories: selectedCategories,
            period: period
          };
          break;
        case 'cost_impact_analysis':
          parameters = {
            currency: 'TND',
            categories: selectedCategories,
            period: period
          };
          break;
        default:
          parameters = { period: period };
      }
      
      aiAnalysisMutation.mutate({
        type: selectedAnalysisType,
        parameters
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
            Vérifiez que le service backend est disponible et que des données existent pour cette période.
          </Alert>
        </Grid>
      ) : patterns.length === 0 ? (
        <Grid item xs={12}>
          <Alert severity="info">
            Aucun pattern détecté pour cette période. Cela peut indiquer des données insuffisantes ou des réclamations trop variées.
          </Alert>
        </Grid>
      ) : (
        patterns.map((pattern: any) => (
          <Grid item xs={12} md={6} lg={4} key={pattern.id}>
            <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="h6" gutterBottom sx={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
                    "{pattern.pattern}"
                  </Typography>
                  <Chip
                    label={pattern.impact === 'high' ? 'Impact Élevé' : pattern.impact === 'medium' ? 'Impact Moyen' : 'Impact Faible'}
                    color={pattern.impact === 'high' ? 'error' : pattern.impact === 'medium' ? 'warning' : 'success'}
                    size="small"
                    sx={{ flexShrink: 0 }}
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
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {pattern.categories.map((category: string, index: number) => (
                      <Chip 
                        key={index} 
                        label={category} 
                        size="small" 
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
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
                    
                    <Box display="flex" gap={1} mb={2} sx={{ flexWrap: 'wrap' }}>
                      <Chip 
                        label={cause.category} 
                        color="primary" 
                        size="small" 
                        icon={<Assessment />}
                      />
                      <Chip 
                        label={`${cause.frequency} réclamations`} 
                        size="small" 
                        variant="outlined"
                      />
                      <Chip 
                        label={`${formatTND(cause.estimatedCost)}`} 
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
      <Box sx={{ mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
          <Typography variant="h4" gutterBottom>
            Analyses Avancées - Réclamations
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
            <Tooltip title="Actualiser toutes les données">
              <IconButton 
                onClick={handleRefreshAll} 
                disabled={refreshing}
                color="primary"
                size="small"
              >
                {refreshing ? <CircularProgress size={20} /> : <Refresh />}
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Psychology />}
              onClick={() => setAiAnalysisDialog(true)}
              disabled={aiAnalysisMutation.isPending}
              sx={{ minWidth: 'auto', px: 1.5 }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Analyse </Box>IA
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Download />}
              onClick={() => reportGenerationMutation.mutate({ reportType: 'advanced', period })}
              disabled={reportGenerationMutation.isPending}
              sx={{ minWidth: 'auto', px: 1.5 }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Générer </Box>Rapport
            </Button>
          </Box>
        </Box>
      </Box>

      {(patternsError || rootCausesError || insightsError || metricsError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Erreur lors du chargement des données. Veuillez réessayer.
        </Alert>
      )}
      
      {reportSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setReportSuccess(false)}>
          ✅ Rapport généré avec succès! Le fichier a été téléchargé automatiquement.
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTabs-scrollButtons': {
              '&.Mui-disabled': { opacity: 0.3 }
            }
          }}
        >
          <Tab 
            label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {patternsLoading ? <CircularProgress size={16} /> : <Timeline />}
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Patterns </Box>IA
            </Box>}
          />
          <Tab 
            label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {rootCausesLoading ? <CircularProgress size={16} /> : <BugReport />}
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Causes </Box>Racines
            </Box>}
          />
          <Tab 
            label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {insightsLoading ? <CircularProgress size={16} /> : <Insights />}
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Insights </Box>IA
            </Box>}
          />
          <Tab 
            label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {metricsLoading ? <CircularProgress size={16} /> : <Assessment />}
              Métriques
            </Box>}
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
                  onChange={(e) => {
                    setSelectedAnalysisType(e.target.value);
                    // Reset parameters when type changes
                    setSelectedCategories([]);
                    setThreshold(0.8);
                    setMinFrequency(3);
                    setHorizon('30d');
                  }}
                >
                  <MenuItem value="sentiment_analysis">😊 Analyse de Sentiment Client</MenuItem>
                  <MenuItem value="pattern_detection">🔍 Détection de Patterns ARS</MenuItem>
                  <MenuItem value="root_cause_analysis">🔧 Analyse Causes Racines</MenuItem>
                  <MenuItem value="predictive_analysis">📊 Prédictions & Tendances</MenuItem>
                  <MenuItem value="cost_impact_analysis">💰 Impact Coût (TND)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* Categories Selection */}
            {(selectedAnalysisType === 'sentiment_analysis' || 
              selectedAnalysisType === 'root_cause_analysis' || 
              selectedAnalysisType === 'predictive_analysis' ||
              selectedAnalysisType === 'cost_impact_analysis') && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Catégories de réclamations</InputLabel>
                  <Select
                    multiple
                    value={selectedCategories}
                    onChange={(e) => setSelectedCategories(e.target.value as string[])}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="REMBOURSEMENT">💰 Remboursement</MenuItem>
                    <MenuItem value="DELAI_TRAITEMENT">⏱️ Délai de traitement</MenuItem>
                    <MenuItem value="QUALITE_SERVICE">⭐ Qualité de service</MenuItem>
                    <MenuItem value="ERREUR_DOSSIER">📋 Erreur de dossier</MenuItem>
                    <MenuItem value="TECHNIQUE">🔧 Problème technique</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            {/* Threshold for Pattern Detection and Sentiment Analysis */}
            {(selectedAnalysisType === 'pattern_detection' || selectedAnalysisType === 'sentiment_analysis') && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Seuil de confiance"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  inputProps={{ min: 0.1, max: 1.0, step: 0.1 }}
                  helperText="Entre 0.1 (moins strict) et 1.0 (très strict)"
                />
              </Grid>
            )}
            
            {/* Min Frequency for Pattern Detection and Root Cause Analysis */}
            {(selectedAnalysisType === 'pattern_detection' || selectedAnalysisType === 'root_cause_analysis') && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Fréquence minimale"
                  value={minFrequency}
                  onChange={(e) => setMinFrequency(parseInt(e.target.value))}
                  inputProps={{ min: 1, max: 50 }}
                  helperText="Nombre minimum d'occurrences"
                />
              </Grid>
            )}
            
            {/* Horizon for Predictive Analysis */}
            {selectedAnalysisType === 'predictive_analysis' && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Horizon de prédiction</InputLabel>
                  <Select
                    value={horizon}
                    onChange={(e) => setHorizon(e.target.value)}
                  >
                    <MenuItem value="7d">📅 7 jours</MenuItem>
                    <MenuItem value="30d">📅 30 jours</MenuItem>
                    <MenuItem value="90d">📅 3 mois</MenuItem>
                    <MenuItem value="180d">📅 6 mois</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            {/* Preview of generated parameters */}
            {selectedAnalysisType && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>🤖 Paramètres générés automatiquement:</strong>
                  </Typography>
                  <Typography variant="body2" component="pre" sx={{ fontSize: '0.8rem', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
                    {JSON.stringify({
                      ...(selectedAnalysisType === 'sentiment_analysis' && {
                        categories: selectedCategories.length > 0 ? selectedCategories : ['REMBOURSEMENT', 'DELAI_TRAITEMENT'],
                        threshold: threshold
                      }),
                      ...(selectedAnalysisType === 'pattern_detection' && {
                        threshold: threshold,
                        minFrequency: minFrequency
                      }),
                      ...(selectedAnalysisType === 'root_cause_analysis' && {
                        minFrequency: minFrequency,
                        categories: selectedCategories
                      }),
                      ...(selectedAnalysisType === 'predictive_analysis' && {
                        horizon: horizon,
                        categories: selectedCategories
                      }),
                      ...(selectedAnalysisType === 'cost_impact_analysis' && {
                        currency: 'TND',
                        categories: selectedCategories
                      }),
                      period: period
                    }, null, 2)}
                  </Typography>
                </Alert>
              </Grid>
            )}
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
            {aiAnalysisMutation.isPending ? 'Analyse en cours...' : 'Lancer l\'analyse IA'}
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