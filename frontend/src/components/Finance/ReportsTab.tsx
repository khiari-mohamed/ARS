import React, { useState } from 'react';
import { 
  Grid, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
  TextField, Button, Card, CardContent, Box, Stack
} from '@mui/material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import GetAppIcon from '@mui/icons-material/GetApp';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';

const ReportsTab: React.FC = () => {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    society: '',
    donneurOrdre: ''
  });

  // Mock data
  const statusData = [
    { name: 'Exécuté', value: 65, color: '#4caf50' },
    { name: 'En Cours', value: 20, color: '#2196f3' },
    { name: 'Rejeté', value: 10, color: '#f44336' },
    { name: 'Non Exécuté', value: 5, color: '#ff9800' }
  ];

  const slaData = [
    { society: 'AON', onTime: 85, atRisk: 10, overdue: 5 },
    { society: 'AXA', onTime: 78, atRisk: 15, overdue: 7 },
    { society: 'ALLIANZ', onTime: 92, atRisk: 6, overdue: 2 }
  ];

  const handleExport = async (format: 'pdf' | 'excel') => {
    console.log('Exporting report:', format, filters);
    // Mock export
    const filename = `finance_report_${Date.now()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
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
            label="Société"
            value={filters.society}
            onChange={(e) => setFilters({...filters, society: e.target.value})}
            size="small"
            sx={{ minWidth: 150 }}
          />
          
          <TextField
            label="Donneur d'Ordre"
            value={filters.donneurOrdre}
            onChange={(e) => setFilters({...filters, donneurOrdre: e.target.value})}
            size="small"
            sx={{ minWidth: 150 }}
          />
        </Stack>
      </Paper>

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
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ mt: 2 }}>
              {statusData.map((item, index) => (
                <Box key={index} display="flex" alignItems="center" sx={{ mb: 1 }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: item.color, borderRadius: '50%', mr: 1 }} />
                  <Typography variant="body2">{item.name}: {item.value}%</Typography>
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
                <Tooltip />
                <Bar dataKey="onTime" fill="#4caf50" name="À temps" />
                <Bar dataKey="atRisk" fill="#ff9800" name="À risque" />
                <Bar dataKey="overdue" fill="#f44336" name="En retard" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Export Options */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Options d'Export</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
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
                    >
                      Générer PDF
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
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
                    >
                      Générer Excel
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
    </Box>
  );
};

export default ReportsTab;