import React, { useState } from 'react';
import { 
  Grid, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
  TextField, Button, Card, CardContent, Box, Stack
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import GetAppIcon from '@mui/icons-material/GetApp';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';

const ReportsTab: React.FC = () => {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    client: '',
    type: ''
  });

  // Mock data for charts
  const slaComplianceData = [
    { client: 'Client A', compliance: 92 },
    { client: 'Client B', compliance: 87 },
    { client: 'Client C', compliance: 95 },
    { client: 'Client D', compliance: 83 }
  ];

  const processingTimeData = [
    { type: 'BS', avgTime: 2.3 },
    { type: 'Contrat', avgTime: 4.1 },
    { type: 'Courrier', avgTime: 1.8 },
    { type: 'Réclamation', avgTime: 3.2 }
  ];

  const volumeData = [
    { name: 'Bureau d\'Ordre', value: 35, color: '#8884d8' },
    { name: 'Service Scan', value: 25, color: '#82ca9d' },
    { name: 'Gestionnaires', value: 30, color: '#ffc658' },
    { name: 'Archivage', value: 10, color: '#ff7300' }
  ];

  const presetReports = [
    {
      title: 'Conformité SLA par Client',
      description: 'Analyse détaillée de la conformité aux délais par client',
      type: 'sla_compliance'
    },
    {
      title: 'Temps de Traitement par Type',
      description: 'Temps moyen de traitement selon le type de document',
      type: 'processing_time'
    },
    {
      title: 'Volume par Département',
      description: 'Répartition du volume de documents par département',
      type: 'volume_by_dept'
    },
    {
      title: 'Rapport Complet GED',
      description: 'Rapport exhaustif avec tous les indicateurs',
      type: 'complete_report'
    }
  ];

  const handleExport = async (format: 'pdf' | 'excel', reportType?: string) => {
    console.log('Exporting report:', format, reportType, filters);
    // Mock export
    const filename = `ged_report_${reportType || 'custom'}_${Date.now()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
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
            <InputLabel>Type</InputLabel>
            <Select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              label="Type"
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="BS">BS</MenuItem>
              <MenuItem value="CONTRAT">Contrat</MenuItem>
              <MenuItem value="COURRIER">Courrier</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        {/* Charts */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Conformité SLA par Client</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={slaComplianceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="client" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="compliance" fill="#1976d2" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Volume par Département</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={volumeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {volumeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ mt: 2 }}>
              {volumeData.map((item, index) => (
                <Box key={index} display="flex" alignItems="center" sx={{ mb: 1 }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: item.color, borderRadius: '50%', mr: 1 }} />
                  <Typography variant="body2">{item.name}: {item.value}%</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Temps de Traitement par Type</Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={processingTimeData}>
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
              Générez un rapport personnalisé basé sur les filtres sélectionnés ci-dessus
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