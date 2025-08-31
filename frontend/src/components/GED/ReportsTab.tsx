import React, { useState, useEffect } from 'react';
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
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    client: '',
    type: ''
  });
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<string[]>([]);

  useEffect(() => {
    loadReportData();
    loadClients();
  }, [filters]);

  const loadClients = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/documents/search', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const documents = await response.json();
        const uniqueClients = [...new Set(documents.map((d: any) => d.clientName).filter(Boolean))] as string[];
        setClients(uniqueClients);
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error('Failed to load clients:', error);
      setClients([]);
    }
  };

  const loadReportData = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/documents/analytics?' + new URLSearchParams({
        period: '30d',
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        client: filters.client,
        type: filters.type
      }), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        setReportData(null);
      }
    } catch (error) {
      console.error('Failed to load report data:', error);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic data from API only
  const slaComplianceData = reportData?.slaByClient || [];
  const processingTimeData = reportData?.processingTimeByType || [];
  const volumeData = reportData?.volumeByDepartment || [];

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
    try {
      const response = await fetch('http://localhost:5000/api/documents/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          type: reportType || 'custom',
          format: format === 'pdf' ? 'pdf' : 'xlsx',
          filters,
          reportData: {
            slaCompliance: slaComplianceData,
            processingTime: processingTimeData,
            volume: volumeData
          }
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const filename = `ged_report_${reportType || 'custom'}_${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        console.log(`✅ Rapport téléchargé: ${filename}`);
      } else {
        throw new Error('Failed to generate report');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Erreur lors de la génération du rapport');
    }
  };
  


  return (
    <Box>
      {/* Filters */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Filtres de Rapport</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" gap={2}>
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
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Client</InputLabel>
            <Select
              value={filters.client}
              onChange={(e) => setFilters({...filters, client: e.target.value})}
              label="Client"
            >
              <MenuItem value="">Tous</MenuItem>
              {clients.map(client => (
                <MenuItem key={client} value={client}>{client}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              label="Type"
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="BS">BS</MenuItem>
              <MenuItem value="CONTRACT">Contrat</MenuItem>
              <MenuItem value="COURRIER">Courrier</MenuItem>
              <MenuItem value="FACTURE">Facture</MenuItem>
              <MenuItem value="RECLAMATION">Réclamation</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        {/* Charts */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Conformité SLA par Client</Typography>
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                <Typography>Chargement des données...</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={slaComplianceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="client" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value}%`, 'Conformité']} />
                  <Bar dataKey="compliance" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
            )}
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
                  {volumeData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ mt: 2 }}>
              {volumeData.map((item: any, index: number) => (
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
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" height={250}>
                <Typography>Chargement des données...</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={processingTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value}h`, 'Temps moyen']} />
                  <Bar dataKey="avgTime" fill="#4caf50" />
                </BarChart>
              </ResponsiveContainer>
            )}
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
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} gap={1}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<PictureAsPdfIcon />}
                          onClick={() => handleExport('pdf', report.type)}
                          disabled={loading}
                        >
                          PDF
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<TableViewIcon />}
                          onClick={() => handleExport('excel', report.type)}
                          disabled={loading}
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
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} gap={2}>
              <Button
                variant="contained"
                startIcon={<PictureAsPdfIcon />}
                onClick={() => handleExport('pdf')}
                disabled={loading}
              >
                Générer PDF
              </Button>
              <Button
                variant="outlined"
                startIcon={<TableViewIcon />}
                onClick={() => handleExport('excel')}
                disabled={loading}
              >
                Générer Excel
              </Button>
              <Button
                variant="text"
                onClick={loadReportData}
                disabled={loading}
              >
                {loading ? 'Actualisation...' : 'Actualiser'}
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReportsTab;