import React, { useState, useEffect } from 'react';
import { 
  Grid, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
  TextField, Button, Card, CardContent, Box, Chip, Stack, CircularProgress, Alert
} from '@mui/material';
import { LocalAPI } from '../../services/axios';
import GetAppIcon from '@mui/icons-material/GetApp';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';
import DescriptionIcon from '@mui/icons-material/Description';
import RefreshIcon from '@mui/icons-material/Refresh';

interface Props {
  filters: any;
  dateRange: any;
}

const ReportsTab: React.FC<Props> = ({ filters, dateRange }) => {
  const [reportConfig, setReportConfig] = useState({
    type: 'kpi_summary',
    format: 'pdf',
    period: 'last30days',
    includeCharts: true,
    includeDetails: false
  });

  const [generating, setGenerating] = useState(false);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportStats, setReportStats] = useState<any>(null);

  useEffect(() => {
    loadReportsData();
  }, [filters, dateRange]);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      
      const [reportsResponse, statsResponse] = await Promise.all([
        LocalAPI.get('/analytics/reports/recent').catch((err) => {
          console.warn('Failed to load recent reports:', err.message);
          return null;
        }),
        LocalAPI.get('/analytics/reports/stats').catch((err) => {
          console.warn('Failed to load report stats:', err.message);
          return null;
        })
      ]);

      // Process recent reports - use only real data
      if (reportsResponse?.data && Array.isArray(reportsResponse.data)) {
        const reports = reportsResponse.data.map((report: any) => ({
          id: report.id,
          name: report.filename || `Report_${report.id}`,
          date: new Date(report.createdAt).toLocaleDateString('fr-FR'),
          time: new Date(report.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          size: formatFileSize(report.fileSize || 0),
          type: report.type || 'unknown',
          format: report.format || 'pdf',
          downloadUrl: report.downloadUrl,
          status: report.status || 'completed',
          completedAt: report.completedAt
        }));
        setRecentReports(reports);
      } else {
        setRecentReports([]);
      }

      // Process report statistics - use only real data
      if (statsResponse?.data) {
        setReportStats({
          totalReports: Number(statsResponse.data.totalReports) || 0,
          reportsThisMonth: Number(statsResponse.data.reportsThisMonth) || 0,
          avgGenerationTime: Number(statsResponse.data.avgGenerationTime) || 0,
          mostPopularFormat: statsResponse.data.mostPopularFormat || 'pdf'
        });
      } else {
        setReportStats({
          totalReports: 0,
          reportsThisMonth: 0,
          avgGenerationTime: 0,
          mostPopularFormat: 'pdf'
        });
      }
    } catch (error) {
      console.error('Failed to load reports data:', error);
      // Set empty data on error
      setRecentReports([]);
      setReportStats({ totalReports: 0, reportsThisMonth: 0, avgGenerationTime: 0, mostPopularFormat: 'pdf' });
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const reportTypes = [
    { value: 'kpi_summary', label: 'Résumé KPIs', description: 'Vue d\'ensemble des indicateurs clés' },
    { value: 'performance_detail', label: 'Performance Détaillée', description: 'Analyse par équipe et département' },
    { value: 'sla_compliance', label: 'Conformité SLA', description: 'Rapport de conformité aux délais' },
    { value: 'claims_analysis', label: 'Analyse Réclamations', description: 'Détail des réclamations et résolutions' },
    { value: 'forecast_report', label: 'Rapport Prévisionnel', description: 'Prévisions et recommandations' },
    { value: 'management_summary', label: 'Synthèse Direction', description: 'Rapport exécutif pour la direction' }
  ];

  const handleGenerateReport = async () => {
    if (!reportConfig.type) {
      alert('Veuillez sélectionner un type de rapport');
      return;
    }

    setGenerating(true);
    try {
      const reportParams = {
        type: reportConfig.type,
        format: reportConfig.format,
        period: reportConfig.period,
        includeCharts: reportConfig.includeCharts,
        includeDetails: reportConfig.includeDetails,
        filters: filters || {},
        dateRange: dateRange || {}
      };

      const response = await LocalAPI.post('/analytics/reports/generate', reportParams);
      
      if (response.data && response.data.id) {
        // Show success message
        const reportTypeName = reportTypes.find(t => t.value === reportConfig.type)?.label || reportConfig.type;
        alert(`Rapport "${reportTypeName}" généré avec succès! Il sera disponible dans quelques instants.`);
        
        // Add new report to local state
        const newReport = {
          id: response.data.id,
          name: response.data.filename || `${reportTypeName}_${Date.now()}.${reportConfig.format}`,
          date: new Date().toLocaleDateString('fr-FR'),
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          size: 'Génération...',
          type: response.data.type || reportConfig.type,
          format: response.data.format || reportConfig.format,
          status: 'generating'
        };
        
        setRecentReports(prev => [newReport, ...prev]);
        
        // Poll for completion
        let pollCount = 0;
        const maxPolls = 15; // 30 seconds max
        const pollInterval = setInterval(async () => {
          try {
            pollCount++;
            const updatedReports = await LocalAPI.get('/analytics/reports/recent');
            
            if (updatedReports.data && Array.isArray(updatedReports.data)) {
              const completedReport = updatedReports.data.find((r: any) => r.id === response.data.id);
              
              if (completedReport && completedReport.status === 'completed') {
                clearInterval(pollInterval);
                setRecentReports(prev => prev.map(r => 
                  r.id === response.data.id 
                    ? { 
                        ...r, 
                        status: 'completed', 
                        size: formatFileSize(completedReport.fileSize || 0),
                        completedAt: completedReport.completedAt
                      }
                    : r
                ));
                // Update stats
                loadReportsData();
              } else if (pollCount >= maxPolls) {
                clearInterval(pollInterval);
                setRecentReports(prev => prev.map(r => 
                  r.id === response.data.id 
                    ? { ...r, status: 'timeout', size: 'Timeout' }
                    : r
                ));
              }
            }
          } catch (error) {
            console.warn('Polling error:', error);
            if (pollCount >= maxPolls) {
              clearInterval(pollInterval);
            }
          }
        }, 2000);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Failed to generate report:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur inconnue';
      alert(`Erreur lors de la génération du rapport: ${errorMessage}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = async (reportId: string, filename: string) => {
    try {
      const response = await LocalAPI.get(`/analytics/reports/${reportId}/download`, {
        responseType: 'blob'
      });

      if (response.data && response.data.size > 0) {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Fichier vide ou non trouvé');
      }
    } catch (error: any) {
      console.error('Failed to download report:', error);
      const errorMessage = error.response?.status === 404 ? 'Rapport non trouvé' : 'Erreur lors du téléchargement';
      alert(errorMessage);
    }
  };

  const getReportIcon = (format: string) => {
    switch (format) {
      case 'pdf': return <PictureAsPdfIcon />;
      case 'excel': return <TableViewIcon />;
      default: return <GetAppIcon />;
    }
  };

  return (
    <Grid container spacing={3}>
      {/* Report Statistics */}
      {reportStats && (
        <Grid item xs={12}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">{reportStats.totalReports}</Typography>
                  <Typography variant="body2" color="textSecondary">Total Rapports</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">{reportStats.reportsThisMonth}</Typography>
                  <Typography variant="body2" color="textSecondary">Ce Mois</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">{reportStats.avgGenerationTime.toFixed(1)}s</Typography>
                  <Typography variant="body2" color="textSecondary">Temps Moyen</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="secondary.main">{reportStats.mostPopularFormat.toUpperCase()}</Typography>
                  <Typography variant="body2" color="textSecondary">Format Populaire</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      )}

      {/* Report Configuration */}
      <Grid item xs={12} md={6}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Typography variant="h6">Configuration du Rapport</Typography>
            {loading && <CircularProgress size={20} />}
          </Box>
          
          <Stack spacing={3}>
            <FormControl fullWidth>
              <InputLabel>Type de Rapport</InputLabel>
              <Select
                value={reportConfig.type}
                onChange={(e) => setReportConfig({...reportConfig, type: e.target.value})}
                label="Type de Rapport"
              >
                {reportTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Format</InputLabel>
              <Select
                value={reportConfig.format}
                onChange={(e) => setReportConfig({...reportConfig, format: e.target.value})}
                label="Format"
              >
                <MenuItem value="pdf">PDF</MenuItem>
                <MenuItem value="excel">Excel</MenuItem>
                <MenuItem value="csv">CSV</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Période</InputLabel>
              <Select
                value={reportConfig.period}
                onChange={(e) => setReportConfig({...reportConfig, period: e.target.value})}
                label="Période"
              >
                <MenuItem value="today">Aujourd'hui</MenuItem>
                <MenuItem value="last7days">7 derniers jours</MenuItem>
                <MenuItem value="last30days">30 derniers jours</MenuItem>
                <MenuItem value="last3months">3 derniers mois</MenuItem>
                <MenuItem value="last6months">6 derniers mois</MenuItem>
                <MenuItem value="lastyear">Dernière année</MenuItem>
                <MenuItem value="custom">Personnalisé</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Options</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip 
                  label="Inclure graphiques" 
                  color={reportConfig.includeCharts ? 'primary' : 'default'}
                  onClick={() => setReportConfig({...reportConfig, includeCharts: !reportConfig.includeCharts})}
                  clickable
                />
                <Chip 
                  label="Détails complets" 
                  color={reportConfig.includeDetails ? 'primary' : 'default'}
                  onClick={() => setReportConfig({...reportConfig, includeDetails: !reportConfig.includeDetails})}
                  clickable
                />
              </Stack>
            </Box>

            <Button
              variant="contained"
              size="large"
              startIcon={getReportIcon(reportConfig.format)}
              onClick={handleGenerateReport}
              disabled={generating}
              fullWidth
            >
              {generating ? 'Génération en cours...' : 'Générer le Rapport'}
            </Button>
          </Stack>
        </Paper>
      </Grid>

      {/* Report Preview */}
      <Grid item xs={12} md={6}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>Aperçu du Rapport</Typography>
          
          {reportTypes.find(t => t.value === reportConfig.type) && (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" color="primary">
                  {reportTypes.find(t => t.value === reportConfig.type)?.label}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  {reportTypes.find(t => t.value === reportConfig.type)?.description}
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Contenu inclus:</Typography>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    {reportConfig.type === 'kpi_summary' && (
                      <>
                        <li>KPIs globaux et tendances</li>
                        <li>Conformité SLA par département</li>
                        <li>Volume de traitement</li>
                      </>
                    )}
                    {reportConfig.type === 'performance_detail' && (
                      <>
                        <li>Performance par équipe</li>
                        <li>Classement des gestionnaires</li>
                        <li>Analyse des goulots d'étranglement</li>
                      </>
                    )}
                    {reportConfig.type === 'management_summary' && (
                      <>
                        <li>Synthèse exécutive</li>
                        <li>Recommandations stratégiques</li>
                        <li>Prévisions et planification</li>
                      </>
                    )}
                  </ul>
                </Box>

                <Stack direction="row" spacing={1}>
                  <Chip label={reportConfig.format.toUpperCase()} size="small" />
                  <Chip label={reportConfig.period} size="small" variant="outlined" />
                  {reportConfig.includeCharts && <Chip label="Graphiques" size="small" color="primary" />}
                  {reportConfig.includeDetails && <Chip label="Détails" size="small" color="secondary" />}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Paper>
      </Grid>

      {/* Recent Reports */}
      <Grid item xs={12}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">Rapports Récents ({recentReports.length})</Typography>
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={loadReportsData}
              disabled={loading}
            >
              Actualiser
            </Button>
          </Box>
          
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : recentReports.length > 0 ? (
            <Grid container spacing={2}>
              {recentReports.map((report) => (
                <Grid item xs={12} md={4} key={report.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                        {getReportIcon(report.format)}
                        <Typography variant="subtitle2" noWrap>{report.name}</Typography>
                      </Box>
                      <Typography variant="caption" color="textSecondary">
                        {report.date} {report.time && `à ${report.time}`} • {report.size}
                      </Typography>
                      <Box display="flex" gap={1} sx={{ mt: 1 }}>
                        <Chip label={report.format.toUpperCase()} size="small" />
                        <Chip 
                          label={report.status === 'generating' ? 'En cours' : report.status === 'completed' ? 'Terminé' : report.status === 'timeout' ? 'Timeout' : report.status} 
                          size="small" 
                          color={report.status === 'completed' ? 'success' : report.status === 'generating' ? 'info' : report.status === 'timeout' ? 'error' : 'warning'}
                        />
                      </Box>
                      <Box sx={{ mt: 2 }}>
                        <Button 
                          size="small" 
                          startIcon={<GetAppIcon />}
                          onClick={() => handleDownloadReport(report.id, report.name)}
                          disabled={report.status !== 'completed'}
                          fullWidth
                        >
                          Télécharger
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Alert severity="info">
              Aucun rapport récent disponible. Générez votre premier rapport ci-dessus.
            </Alert>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
};

export default ReportsTab;