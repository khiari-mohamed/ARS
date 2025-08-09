import React, { useState } from 'react';
import { 
  Grid, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
  TextField, Button, Card, CardContent, Box, Stack
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import GetAppIcon from '@mui/icons-material/GetApp';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';

const ReportsTab: React.FC = () => {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    client: '',
    department: ''
  });

  // Mock data for charts
  const slaComplianceData = [
    { type: 'Règlement', compliance: 95 },
    { type: 'Réclamation', compliance: 87 },
    { type: 'Relance', compliance: 92 },
    { type: 'Autre', compliance: 89 }
  ];

  const volumeTrendData = [
    { date: '2025-01-10', sent: 12, received: 8 },
    { date: '2025-01-11', sent: 15, received: 10 },
    { date: '2025-01-12', sent: 18, received: 12 },
    { date: '2025-01-13', sent: 14, received: 9 },
    { date: '2025-01-14', sent: 20, received: 15 }
  ];

  const responseTimeData = [
    { type: 'Règlement', avgTime: 2.1 },
    { type: 'Réclamation', avgTime: 4.5 },
    { type: 'Relance', avgTime: 1.8 },
    { type: 'Autre', avgTime: 3.2 }
  ];

  const presetReports = [
    {
      title: 'Conformité SLA par Type',
      description: 'Analyse de la conformité aux délais par type de correspondance',
      type: 'sla_compliance'
    },
    {
      title: 'Tendances de Volume',
      description: 'Évolution du volume de correspondance dans le temps',
      type: 'volume_trends'
    },
    {
      title: 'Temps de Réponse Moyen',
      description: 'Analyse des temps de réponse par type de courrier',
      type: 'response_time'
    },
    {
      title: 'Rapport Complet GEC',
      description: 'Rapport exhaustif avec tous les indicateurs',
      type: 'complete_report'
    }
  ];

  const handleExport = async (format: 'pdf' | 'excel', reportType?: string) => {
    console.log('Exporting report:', format, reportType, filters);
    const filename = `gec_report_${reportType || 'custom'}_${Date.now()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
    alert(`Rapport généré: ${filename}`);
  };

  return (
    <Box>
      {/* Filters */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Filtres de Rapport</Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <TextField
            label="Date Début"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          
          <TextField
            label="Date Fin"
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          
          <TextField
            label="Client"
            value={filters.client}
            onChange={(e) => setFilters({...filters, client: e.target.value})}
            size="small"
            sx={{ minWidth: 150 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Département</InputLabel>
            <Select
              value={filters.department}
              onChange={(e) => setFilters({...filters, department: e.target.value})}
              label="Département"
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="GESTION">Gestion</MenuItem>
              <MenuItem value="FINANCE">Finance</MenuItem>
              <MenuItem value="COMMERCIAL">Commercial</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        {/* SLA Compliance Chart */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Conformité SLA par Type</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={slaComplianceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="compliance" fill="#1976d2" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Volume Trend Chart */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Tendances de Volume</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={volumeTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sent" stroke="#1976d2" strokeWidth={3} name="Envoyés" />
                <Line type="monotone" dataKey="received" stroke="#d32f2f" strokeWidth={3} name="Reçus" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Response Time Chart */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Temps de Réponse Moyen (jours)</Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avgTime" fill="#4caf50" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Preset Reports */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Rapports Prédéfinis</Typography>
            <Grid container spacing={2}>
              {presetReports.map((report, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                        {report.title}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        {report.description}
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<PictureAsPdfIcon />}
                          onClick={() => handleExport('pdf', report.type)}
                        >
                          PDF
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<TableViewIcon />}
                          onClick={() => handleExport('excel', report.type)}
                        >
                          Excel
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Custom Export */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Export Personnalisé</Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Générez un rapport personnalisé basé sur les filtres sélectionnés
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                startIcon={<PictureAsPdfIcon />}
                onClick={() => handleExport('pdf')}
              >
                Générer PDF
              </Button>
              <Button
                variant="outlined"
                startIcon={<TableViewIcon />}
                onClick={() => handleExport('excel')}
              >
                Générer Excel
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReportsTab;