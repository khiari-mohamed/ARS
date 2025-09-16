import React, { useState, useEffect } from 'react';
import { 
  Grid, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
  TextField, Button, Card, CardContent, Box, Stack, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel,
  Checkbox, Alert
} from '@mui/material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import GetAppIcon from '@mui/icons-material/GetApp';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';
import RefreshIcon from '@mui/icons-material/Refresh';

const ReportsTab: React.FC = () => {
  const [filters, setFilters] = useState({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    society: '',
    donneurOrdre: ''
  });
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [customReportDialog, setCustomReportDialog] = useState(false);
  const [customReportOptions, setCustomReportOptions] = useState({
    includeCharts: true,
    includeDetails: true,
    includeSLA: true,
    includeExceptions: true,
    format: 'pdf'
  });
  const [statusData, setStatusData] = useState<any[]>([]);
  const [slaData, setSlaData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    loadReportData();
  }, [filters]);

  const loadReportData = async () => {
    setLoading(true);
    console.log('🔄 ReportsTab: Loading report data with filters:', filters);
    try {
      // Build query parameters from filters
      const queryParams = new URLSearchParams();
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
      if (filters.society) queryParams.append('societe', filters.society);
      if (filters.donneurOrdre) queryParams.append('donneurOrdre', filters.donneurOrdre);
      
      // Load real data from multiple backend endpoints with filters
      const [ordresVirement, suiviVirements, clients] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/ordres-virement?${queryParams}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(res => res.json()),
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/suivi-virement/list?${queryParams}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(res => res.json()),
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/clients`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(res => res.json()).catch(() => [])
      ]);
      
      // Apply client-side filtering for additional precision
      let filteredData = ordresVirement;
      if (filters.dateFrom || filters.dateTo) {
        filteredData = filteredData.filter((item: any) => {
          const itemDate = new Date(item.dateCreation);
          const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
          const toDate = filters.dateTo ? new Date(filters.dateTo) : null;
          
          if (fromDate && itemDate < fromDate) return false;
          if (toDate && itemDate > toDate) return false;
          return true;
        });
      }
      
      if (filters.society) {
        filteredData = filteredData.filter((item: any) => 
          item.donneurOrdre?.nom?.toLowerCase().includes(filters.society.toLowerCase())
        );
      }
      
      if (filters.donneurOrdre) {
        filteredData = filteredData.filter((item: any) => 
          item.donneurOrdre?.nom?.toLowerCase().includes(filters.donneurOrdre.toLowerCase())
        );
      }
      
      console.log('📊 ReportsTab: Loaded data:', {
        ordresVirement: ordresVirement.length,
        suiviVirements: suiviVirements.length,
        clients: clients.length
      });
      
      const realData = filteredData;
      if (realData && realData.length > 0) {
        // Process filtered data for charts using correct field names
        const statusCounts = realData.reduce((acc: any, item: any) => {
          acc[item.etatVirement] = (acc[item.etatVirement] || 0) + 1;
          return acc;
        }, {});
        
        const total = realData.length;
        const realStatusData = [
          { name: 'Exécuté', value: Math.round((statusCounts['EXECUTE'] || 0) / total * 100), color: '#4caf50', count: statusCounts['EXECUTE'] || 0 },
          { name: 'En Cours', value: Math.round((statusCounts['EN_COURS_EXECUTION'] || 0) / total * 100), color: '#2196f3', count: statusCounts['EN_COURS_EXECUTION'] || 0 },
          { name: 'Rejeté', value: Math.round((statusCounts['REJETE'] || 0) / total * 100), color: '#f44336', count: statusCounts['REJETE'] || 0 },
          { name: 'Non Exécuté', value: Math.round((statusCounts['NON_EXECUTE'] || 0) / total * 100), color: '#ff9800', count: statusCounts['NON_EXECUTE'] || 0 }
        ];
        
        setStatusData(realStatusData);
        
        // Process SLA data by donneur d'ordre (since we don't have society field)
        const donneurGroups = realData.reduce((acc: any, item: any) => {
          const key = item.donneurOrdre?.nom || 'Unknown';
          if (!acc[key]) acc[key] = [];
          acc[key].push(item);
          return acc;
        }, {});
        
        const realSlaData = Object.keys(donneurGroups).slice(0, 5).map(society => {
          const items = donneurGroups[society];
          const executed = items.filter((i: any) => i.etatVirement === 'EXECUTE').length;
          const inProgress = items.filter((i: any) => i.etatVirement === 'EN_COURS_EXECUTION').length;
          const failed = items.filter((i: any) => i.etatVirement === 'REJETE').length;
          const total = items.length;
          
          return {
            society,
            onTime: Math.round(executed / total * 100),
            atRisk: Math.round(inProgress / total * 100),
            overdue: Math.round(failed / total * 100)
          };
        });
        
        setSlaData(realSlaData);
        
        // Generate trend data (last 7 days) using dateCreation
        const trendDays = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          const dayData = realData.filter((item: any) => 
            new Date(item.dateCreation).toDateString() === date.toDateString()
          );
          
          trendDays.push({
            date: date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
            total: dayData.length,
            executed: dayData.filter((i: any) => i.etatVirement === 'EXECUTE').length,
            amount: dayData.reduce((sum: number, i: any) => sum + (i.montantTotal || 0), 0)
          });
        }
        
        setTrendData(trendDays);
        setReportData(realData);
        console.log('✅ ReportsTab: Successfully processed real data');
      } else {
        console.log('⚠️ ReportsTab: No real data found');
        // Set empty data
        setStatusData([]);
        setSlaData([]);
        setTrendData([]);
        setReportData(null);
      }
    } catch (error) {
      console.error('❌ ReportsTab: Failed to load report data:', error);
      // Set empty data on error
      setStatusData([]);
      setSlaData([]);
      setTrendData([]);
      setReportData(null);
    } finally {
      setLoading(false);
      console.log('🏁 ReportsTab: Data loading completed');
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      setLoading(true);
      console.log('🔄 ReportsTab: Starting export with format:', format);
      
      // Call real backend export endpoint
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/suivi-virement/export-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          format,
          filters,
          data: reportData,
          statusData,
          slaData,
          trendData
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const filename = `rapport_financier_${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
        
        console.log('✅ ReportsTab: Export successful:', filename);
        alert(`Rapport généré avec succès: ${filename}`);
      } else {
        throw new Error(`Export failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ ReportsTab: Export failed:', error);
      alert('Erreur lors de la génération du rapport');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomReport = async () => {
    try {
      setLoading(true);
      console.log('🔄 ReportsTab: Starting custom report generation');
      
      // Generate custom report based on selected options
      const customData = {
        format: customReportOptions.format,
        filters,
        data: reportData,
        statusData: customReportOptions.includeCharts ? statusData : [],
        slaData: customReportOptions.includeSLA ? slaData : [],
        trendData: customReportOptions.includeCharts ? trendData : [],
        includeDetails: customReportOptions.includeDetails,
        includeExceptions: customReportOptions.includeExceptions,
        generatedAt: new Date().toISOString()
      };
      
      console.log('📦 ReportsTab: Custom report data:', customData);
      
      // Call backend API
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/suivi-virement/export-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(customData)
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const filename = `rapport_personnalise_${new Date().toISOString().split('T')[0]}.${customReportOptions.format === 'pdf' ? 'pdf' : 'csv'}`;
        
        if (blob.size === 0) {
          throw new Error('Le fichier généré est vide');
        }
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
        
        console.log('✅ ReportsTab: Custom report generated successfully:', filename);
        alert(`Rapport personnalisé généré avec succès: ${filename}`);
      } else {
        const errorText = await response.text();
        throw new Error(`Export failed: ${response.status} - ${errorText}`);
      }
      
      setCustomReportDialog(false);
    } catch (error) {
      console.error('❌ ReportsTab: Custom report failed:', error);
      alert('Erreur lors de la génération du rapport personnalisé: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* Filters */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Filtres de Rapport</Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadReportData}
            disabled={loading}
            size="small"
          >
            Actualiser
          </Button>
        </Box>
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
            label="Société"
            value={filters.society}
            onChange={(e) => setFilters({...filters, society: e.target.value})}
            size="small"
            sx={{ minWidth: 150 }}
            placeholder="Filtrer par société"
          />
          
          <TextField
            label="Donneur d'Ordre"
            value={filters.donneurOrdre}
            onChange={(e) => setFilters({...filters, donneurOrdre: e.target.value})}
            size="small"
            sx={{ minWidth: 150 }}
            placeholder="Filtrer par donneur"
          />
          
          <Button 
            variant="outlined" 
            onClick={() => setFilters({ dateFrom: '', dateTo: '', society: '', donneurOrdre: '' })}
            size="small"
          >
            Réinitialiser
          </Button>
        </Stack>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Charts */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Répartition par Statut</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value}% (${statusData.find(d => d.name === name)?.count || 0})`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ mt: 2 }}>
                {statusData.map((item, index) => (
                  <Box key={index} display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Box display="flex" alignItems="center">
                      <Box sx={{ width: 12, height: 12, bgcolor: item.color, borderRadius: '50%', mr: 1 }} />
                      <Typography variant="body2">{item.name}</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={600}>{item.value}% ({item.count || 0})</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Conformité SLA par Société</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={slaData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="society" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="onTime" fill="#4caf50" name="À temps" />
                  <Bar dataKey="atRisk" fill="#ff9800" name="À risque" />
                  <Bar dataKey="overdue" fill="#f44336" name="En retard" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Trend Chart */}
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Évolution des Virements (7 derniers jours)</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'Montant') return [`${Number(value).toLocaleString()} DT`, name];
                      return [value, name];
                    }}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="total" stroke="#2196f3" strokeWidth={2} name="Total" />
                  <Line yAxisId="left" type="monotone" dataKey="executed" stroke="#4caf50" strokeWidth={2} name="Exécutés" />
                  <Line yAxisId="right" type="monotone" dataKey="amount" stroke="#ff9800" strokeWidth={3} name="Montant" />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

        {/* Export Options */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Options d'Export</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="primary">Rapport PDF</Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      Rapport complet avec graphiques et tableaux
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<PictureAsPdfIcon />}
                      onClick={() => handleExport('pdf')}
                      fullWidth
                      disabled={loading}
                    >
                      Exporter PDF
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="primary">Export Excel</Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      Données détaillées pour analyse
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<TableViewIcon />}
                      onClick={() => handleExport('excel')}
                      fullWidth
                      disabled={loading}
                    >
                      Exporter Excel
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="primary">Rapport Personnalisé</Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      Sélectionner les sections à inclure
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<GetAppIcon />}
                      onClick={() => setCustomReportDialog(true)}
                      fullWidth
                    >
                      Configurer
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
      )}

      {/* Custom Report Dialog */}
      <Dialog open={customReportDialog} onClose={() => setCustomReportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Rapport Personnalisé</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Sélectionnez les sections à inclure:
            </Typography>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={customReportOptions.includeCharts}
                  onChange={(e) => setCustomReportOptions(prev => ({ ...prev, includeCharts: e.target.checked }))}
                />
              }
              label="Graphiques et statistiques"
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={customReportOptions.includeDetails}
                  onChange={(e) => setCustomReportOptions(prev => ({ ...prev, includeDetails: e.target.checked }))}
                />
              }
              label="Détails des transactions"
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={customReportOptions.includeSLA}
                  onChange={(e) => setCustomReportOptions(prev => ({ ...prev, includeSLA: e.target.checked }))}
                />
              }
              label="Analyse SLA"
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={customReportOptions.includeExceptions}
                  onChange={(e) => setCustomReportOptions(prev => ({ ...prev, includeExceptions: e.target.checked }))}
                />
              }
              label="Exceptions et alertes"
            />
            
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Format</InputLabel>
              <Select
                value={customReportOptions.format}
                onChange={(e) => setCustomReportOptions(prev => ({ ...prev, format: e.target.value }))}
                label="Format"
              >
                <MenuItem value="pdf">PDF</MenuItem>
                <MenuItem value="excel">Excel</MenuItem>
                <MenuItem value="word">Word</MenuItem>
              </Select>
            </FormControl>
            
            {reportData && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Données disponibles: {Array.isArray(reportData) ? reportData.length : 0} enregistrements
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomReportDialog(false)}>Annuler</Button>
          <Button 
            variant="contained" 
            onClick={handleCustomReport}
            disabled={loading || !Object.values(customReportOptions).slice(0, 4).some(Boolean)}
          >
            Générer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportsTab;