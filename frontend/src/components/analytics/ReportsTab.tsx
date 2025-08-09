import React, { useState } from 'react';
import { 
  Grid, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
  TextField, Button, Card, CardContent, Box, Chip, Stack
} from '@mui/material';
import GetAppIcon from '@mui/icons-material/GetApp';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';

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

  const reportTypes = [
    { value: 'kpi_summary', label: 'Résumé KPIs', description: 'Vue d\'ensemble des indicateurs clés' },
    { value: 'performance_detail', label: 'Performance Détaillée', description: 'Analyse par équipe et département' },
    { value: 'sla_compliance', label: 'Conformité SLA', description: 'Rapport de conformité aux délais' },
    { value: 'claims_analysis', label: 'Analyse Réclamations', description: 'Détail des réclamations et résolutions' },
    { value: 'forecast_report', label: 'Rapport Prévisionnel', description: 'Prévisions et recommandations' },
    { value: 'management_summary', label: 'Synthèse Direction', description: 'Rapport exécutif pour la direction' }
  ];

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      // Mock report generation - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create mock download
      const filename = `analytics_report_${Date.now()}.${reportConfig.format}`;
      console.log('Generating report:', filename, reportConfig);
      
      // In real implementation, this would download the actual file
      alert(`Rapport généré: ${filename}`);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setGenerating(false);
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
      {/* Report Configuration */}
      <Grid item xs={12} md={6}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>Configuration du Rapport</Typography>
          
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
          <Typography variant="h6" sx={{ mb: 2 }}>Rapports Récents</Typography>
          <Grid container spacing={2}>
            {[
              { name: 'KPI_Summary_2025-01-15.pdf', date: '15/01/2025', size: '2.3 MB' },
              { name: 'Performance_Detail_2025-01-10.xlsx', date: '10/01/2025', size: '1.8 MB' },
              { name: 'SLA_Compliance_2025-01-05.pdf', date: '05/01/2025', size: '1.2 MB' }
            ].map((report, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" noWrap>{report.name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {report.date} • {report.size}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Button size="small" startIcon={<GetAppIcon />}>
                        Télécharger
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default ReportsTab;