import React, { useState, useEffect } from 'react';
import { 
  Grid, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
  TextField, Button, Card, CardContent, Box, Stack, CircularProgress
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import GetAppIcon from '@mui/icons-material/GetApp';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const ReportsTab: React.FC = () => {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    client: '',
    department: ''
  });
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadReportData();
  }, [filters]);

  const loadReportData = async () => {
    console.log('📈 Loading report data with filters:', filters);
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
      if (filters.client) queryParams.append('client', filters.client);
      if (filters.department) queryParams.append('department', filters.department);
      
      const response = await fetch(`http://localhost:5000/api/courriers/reports/data?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📈 Report data loaded:', data);
        setReportData(data);
      } else {
        console.error('Failed to load report data:', response.status);
        // Fallback to mock data
        setReportData(getMockReportData());
      }
    } catch (error) {
      console.error('Failed to load report data:', error);
      // Fallback to mock data
      setReportData(getMockReportData());
    } finally {
      setLoading(false);
    }
  };

  const getMockReportData = () => ({
    slaCompliance: [
      { type: 'Règlement', compliance: 95 },
      { type: 'Réclamation', compliance: 87 },
      { type: 'Relance', compliance: 92 },
      { type: 'Autre', compliance: 89 }
    ],
    volumeTrend: [
      { date: '2025-01-10', sent: 12, received: 8 },
      { date: '2025-01-11', sent: 15, received: 10 },
      { date: '2025-01-12', sent: 18, received: 12 },
      { date: '2025-01-13', sent: 14, received: 9 },
      { date: '2025-01-14', sent: 20, received: 15 }
    ],
    responseTime: [
      { type: 'Règlement', avgTime: 2.1 },
      { type: 'Réclamation', avgTime: 4.5 },
      { type: 'Relance', avgTime: 1.8 },
      { type: 'Autre', avgTime: 3.2 }
    ],
    summary: {
      totalCourriers: 156,
      sentCourriers: 142,
      avgResponseTime: 2.8,
      slaCompliance: 91.2
    }
  });

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
    console.log('💾 Exporting report:', format, reportType, filters);
    setExporting(true);
    
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `rapport_gec_${reportType || 'personnalise'}_${timestamp}`;
      
      if (format === 'pdf') {
        await generatePDF(filename, reportType);
      } else {
        await generateExcel(filename, reportType);
      }
      
      console.log('✅ Report exported successfully:', filename);
    } catch (error) {
      console.error('Failed to export report:', error);
      alert('Erreur lors de la génération du rapport');
    } finally {
      setExporting(false);
    }
  };

  const generatePDF = async (filename: string, reportType?: string) => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Header
    pdf.setFontSize(20);
    pdf.text('Rapport GEC - ARS Tunisia', pageWidth / 2, 20, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 20, 35);
    
    if (filters.dateFrom || filters.dateTo) {
      pdf.text(`Période: ${filters.dateFrom || 'Début'} - ${filters.dateTo || 'Fin'}`, 20, 45);
    }
    
    let yPos = 60;
    
    // Summary
    if (reportData?.summary) {
      pdf.setFontSize(16);
      pdf.text('Résumé Exécutif', 20, yPos);
      yPos += 15;
      
      pdf.setFontSize(12);
      pdf.text(`Total Courriers: ${reportData.summary.totalCourriers}`, 20, yPos);
      yPos += 10;
      pdf.text(`Courriers Envoyés: ${reportData.summary.sentCourriers}`, 20, yPos);
      yPos += 10;
      pdf.text(`Temps de Réponse Moyen: ${reportData.summary.avgResponseTime} jours`, 20, yPos);
      yPos += 10;
      pdf.text(`Conformité SLA: ${reportData.summary.slaCompliance}%`, 20, yPos);
      yPos += 20;
    }
    
    // SLA Compliance Data
    if (reportData?.slaCompliance) {
      pdf.setFontSize(16);
      pdf.text('Conformité SLA par Type', 20, yPos);
      yPos += 15;
      
      pdf.setFontSize(12);
      reportData.slaCompliance.forEach((item: any) => {
        pdf.text(`${item.type}: ${item.compliance}%`, 20, yPos);
        yPos += 10;
      });
    }
    
    pdf.save(`${filename}.pdf`);
  };

  const generateExcel = async (filename: string, reportType?: string) => {
    const workbook = XLSX.utils.book_new();
    
    // Summary Sheet
    if (reportData?.summary) {
      const summaryData = [
        ['Métrique', 'Valeur'],
        ['Total Courriers', reportData.summary.totalCourriers],
        ['Courriers Envoyés', reportData.summary.sentCourriers],
        ['Temps de Réponse Moyen (jours)', reportData.summary.avgResponseTime],
        ['Conformité SLA (%)', reportData.summary.slaCompliance]
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé');
    }
    
    // SLA Compliance Sheet
    if (reportData?.slaCompliance) {
      const slaData = [
        ['Type', 'Conformité (%)'],
        ...reportData.slaCompliance.map((item: any) => [item.type, item.compliance])
      ];
      
      const slaSheet = XLSX.utils.aoa_to_sheet(slaData);
      XLSX.utils.book_append_sheet(workbook, slaSheet, 'Conformité SLA');
    }
    
    // Volume Trend Sheet
    if (reportData?.volumeTrend) {
      const volumeData = [
        ['Date', 'Envoyés', 'Reçus'],
        ...reportData.volumeTrend.map((item: any) => [item.date, item.sent, item.received])
      ];
      
      const volumeSheet = XLSX.utils.aoa_to_sheet(volumeData);
      XLSX.utils.book_append_sheet(workbook, volumeSheet, 'Tendances Volume');
    }
    
    // Response Time Sheet
    if (reportData?.responseTime) {
      const responseData = [
        ['Type', 'Temps Moyen (jours)'],
        ...reportData.responseTime.map((item: any) => [item.type, item.avgTime])
      ];
      
      const responseSheet = XLSX.utils.aoa_to_sheet(responseData);
      XLSX.utils.book_append_sheet(workbook, responseSheet, 'Temps de Réponse');
    }
    
    XLSX.writeFile(workbook, `${filename}.xlsx`);
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
              <BarChart data={reportData?.slaCompliance || []}>
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
              <LineChart data={reportData?.volumeTrend || []}>
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
              <BarChart data={reportData?.responseTime || []}>
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
                          startIcon={exporting ? <CircularProgress size={16} /> : <PictureAsPdfIcon />}
                          onClick={() => handleExport('pdf', report.type)}
                          disabled={exporting}
                        >
                          PDF
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={exporting ? <CircularProgress size={16} /> : <TableViewIcon />}
                          onClick={() => handleExport('excel', report.type)}
                          disabled={exporting}
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
                startIcon={exporting ? <CircularProgress size={16} /> : <PictureAsPdfIcon />}
                onClick={() => handleExport('pdf')}
                disabled={exporting}
              >
                {exporting ? 'Génération...' : 'Générer PDF'}
              </Button>
              <Button
                variant="outlined"
                startIcon={exporting ? <CircularProgress size={16} /> : <TableViewIcon />}
                onClick={() => handleExport('excel')}
                disabled={exporting}
              >
                {exporting ? 'Génération...' : 'Générer Excel'}
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReportsTab;