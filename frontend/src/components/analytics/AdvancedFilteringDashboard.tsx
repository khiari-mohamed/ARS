import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Breadcrumbs,
  Link,
  Paper
} from '@mui/material';
import {
  FilterList,
  Add,
  Delete,
  TrendingDown as DrillDown,
  DateRange,
  TrendingUp,
  BarChart,
  PieChart,
  ShowChart
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

const AdvancedFilteringDashboard: React.FC = () => {
  const [dataSource, setDataSource] = useState('bordereaux');
  const [filters, setFilters] = useState<any[]>([]);
  const [chartConfig, setChartConfig] = useState<any>({
    chartType: 'line',
    dimensions: [{ field: 'dateCreation', label: 'Date', type: 'time', groupBy: 'day' }],
    metrics: [{ field: 'count', label: 'Nombre', aggregation: 'count' }]
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [drillDownPath, setDrillDownPath] = useState<any[]>([]);
  const [drillDownOptions, setDrillDownOptions] = useState<any[]>([]);
  const [filterDialog, setFilterDialog] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  });
  const [newFilter, setNewFilter] = useState({
    field: '',
    operator: 'equals',
    value: '',
    dataType: 'string'
  });

  useEffect(() => {
    loadChartData();
  }, [dataSource, filters, chartConfig, dateRange]);

  const loadChartData = async () => {
    try {
      // Mock chart data generation
      const mockData = generateMockChartData();
      setChartData(mockData);
      
      // Mock drill-down options
      if (drillDownPath.length === 0) {
        setDrillDownOptions([
          { level: 1, dimension: 'statut', value: 'TRAITE', label: 'Traité', count: 245, percentage: 45.2 },
          { level: 1, dimension: 'statut', value: 'EN_COURS', label: 'En Cours', count: 156, percentage: 28.8 },
          { level: 1, dimension: 'statut', value: 'NOUVEAU', label: 'Nouveau', count: 89, percentage: 16.4 },
          { level: 1, dimension: 'statut', value: 'REJETE', label: 'Rejeté', count: 52, percentage: 9.6 }
        ]);
      }
    } catch (error) {
      console.error('Failed to load chart data:', error);
    }
  };

  const generateMockChartData = () => {
    const data = [];
    const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i < days; i++) {
      const date = new Date(dateRange.start.getTime() + i * 24 * 60 * 60 * 1000);
      data.push({
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 100) + 50,
        value: Math.floor(Math.random() * 1000) + 500,
        success_rate: Math.random() * 20 + 80
      });
    }
    
    return data;
  };

  const handleAddFilter = () => {
    if (newFilter.field && newFilter.value) {
      setFilters([...filters, { ...newFilter, id: Date.now() }]);
      setNewFilter({ field: '', operator: 'equals', value: '', dataType: 'string' });
      setFilterDialog(false);
    }
  };

  const handleRemoveFilter = (filterId: number) => {
    setFilters(filters.filter(f => f.id !== filterId));
  };

  const handleDrillDown = (option: any) => {
    const newPath = [...drillDownPath, option];
    setDrillDownPath(newPath);
    
    // Add filter for drill-down
    const drillDownFilter = {
      id: Date.now(),
      field: option.dimension,
      operator: 'equals',
      value: option.value,
      dataType: 'string'
    };
    setFilters([...filters, drillDownFilter]);
    
    // Mock next level drill-down options
    if (newPath.length === 1) {
      setDrillDownOptions([
        { level: 2, dimension: 'priorite', value: 'HIGH', label: 'Haute', count: 89, percentage: 36.3 },
        { level: 2, dimension: 'priorite', value: 'MEDIUM', label: 'Moyenne', count: 98, percentage: 40.0 },
        { level: 2, dimension: 'priorite', value: 'LOW', label: 'Basse', count: 58, percentage: 23.7 }
      ]);
    } else if (newPath.length === 2) {
      setDrillDownOptions([
        { level: 3, dimension: 'clientId', value: 'client_1', label: 'Client A', count: 25, percentage: 28.1 },
        { level: 3, dimension: 'clientId', value: 'client_2', label: 'Client B', count: 22, percentage: 24.7 },
        { level: 3, dimension: 'clientId', value: 'client_3', label: 'Client C', count: 19, percentage: 21.3 },
        { level: 3, dimension: 'clientId', value: 'client_4', label: 'Client D', count: 23, percentage: 25.9 }
      ]);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      // Reset to root level
      setDrillDownPath([]);
      setFilters(filters.filter(f => !drillDownPath.some(p => p.dimension === f.field)));
    } else {
      // Go back to specific level
      const newPath = drillDownPath.slice(0, index + 1);
      setDrillDownPath(newPath);
      
      // Remove filters beyond this level
      const keepFilters = filters.filter(f => 
        newPath.some(p => p.dimension === f.field) || 
        !drillDownPath.some(p => p.dimension === f.field)
      );
      setFilters(keepFilters);
    }
  };

  const getChartComponent = () => {
    switch (chartConfig.chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsBarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </RechartsBarChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        const pieData = drillDownOptions.map(option => ({
          name: option.label,
          value: option.count
        }));
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        );
      
      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Filtrage Avancé et Drill-down Interactif
      </Typography>

      {/* Controls */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>Source de Données</InputLabel>
            <Select
              value={dataSource}
              label="Source de Données"
              onChange={(e) => setDataSource(e.target.value)}
            >
              <MenuItem value="bordereaux">Bordereaux</MenuItem>
              <MenuItem value="reclamations">Réclamations</MenuItem>
              <MenuItem value="virements">Virements</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>Type de Graphique</InputLabel>
            <Select
              value={chartConfig.chartType}
              label="Type de Graphique"
              onChange={(e) => setChartConfig((prev: any) => ({ ...prev, chartType: e.target.value }))}
            >
              <MenuItem value="line"><ShowChart sx={{ mr: 1 }} />Ligne</MenuItem>
              <MenuItem value="bar"><BarChart sx={{ mr: 1 }} />Barres</MenuItem>
              <MenuItem value="pie"><PieChart sx={{ mr: 1 }} />Secteurs</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DatePicker
            label="Date de début"
            value={dateRange.start}
            onChange={(date) => setDateRange(prev => ({ ...prev, start: date || new Date() }))}
            slotProps={{ textField: { fullWidth: true } }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DatePicker
            label="Date de fin"
            value={dateRange.end}
            onChange={(date) => setDateRange(prev => ({ ...prev, end: date || new Date() }))}
            slotProps={{ textField: { fullWidth: true } }}
          />
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              <FilterList sx={{ mr: 1, verticalAlign: 'middle' }} />
              Filtres Actifs ({filters.length})
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => setFilterDialog(true)}
            >
              Ajouter Filtre
            </Button>
          </Box>

          <Box display="flex" flexWrap="wrap" gap={1}>
            {filters.map((filter) => (
              <Chip
                key={filter.id}
                label={`${filter.field} ${filter.operator} ${filter.value}`}
                onDelete={() => handleRemoveFilter(filter.id)}
                color="primary"
                variant="outlined"
              />
            ))}
            {filters.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Aucun filtre actif
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Breadcrumb Navigation */}
      {drillDownPath.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Navigation Drill-down:
            </Typography>
            <Breadcrumbs>
              <Link
                component="button"
                variant="body2"
                onClick={() => handleBreadcrumbClick(-1)}
                sx={{ textDecoration: 'underline' }}
              >
                Racine
              </Link>
              {drillDownPath.map((path, index) => (
                <Link
                  key={index}
                  component="button"
                  variant="body2"
                  onClick={() => handleBreadcrumbClick(index)}
                  sx={{ textDecoration: 'underline' }}
                >
                  {path.label}
                </Link>
              ))}
            </Breadcrumbs>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Graphique Interactif
              </Typography>
              {getChartComponent()}
            </CardContent>
          </Card>
        </Grid>

        {/* Drill-down Options */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <DrillDown sx={{ mr: 1, verticalAlign: 'middle' }} />
                Options de Drill-down
              </Typography>
              
              <List>
                {drillDownOptions.map((option, index) => (
                  <ListItem key={index} disablePadding>
                    <ListItemButton onClick={() => handleDrillDown(option)}>
                      <ListItemText
                        primary={option.label}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              {option.count} éléments ({option.percentage.toFixed(1)}%)
                            </Typography>
                          </Box>
                        }
                      />
                      <Box display="flex" alignItems="center">
                        <Typography variant="h6" color="primary">
                          {option.count}
                        </Typography>
                        <TrendingUp color="action" sx={{ ml: 1 }} />
                      </Box>
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>

              {drillDownOptions.length === 0 && (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                  Aucune option de drill-down disponible
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Summary Statistics */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Statistiques Résumées
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {chartData.reduce((sum, d) => sum + d.count, 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Éléments
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {chartData.length > 0 ? (chartData.reduce((sum, d) => sum + d.count, 0) / chartData.length).toFixed(0) : 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Moyenne Quotidienne
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main">
                      {chartData.length > 0 ? Math.max(...chartData.map(d => d.count)) : 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Maximum
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      {chartData.length > 0 ? (chartData.reduce((sum, d) => sum + d.success_rate, 0) / chartData.length).toFixed(1) : 0}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Taux de Succès Moyen
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add Filter Dialog */}
      <Dialog open={filterDialog} onClose={() => setFilterDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ajouter un Filtre</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Champ</InputLabel>
                <Select
                  value={newFilter.field}
                  label="Champ"
                  onChange={(e) => setNewFilter(prev => ({ ...prev, field: e.target.value }))}
                >
                  <MenuItem value="statut">Statut</MenuItem>
                  <MenuItem value="priorite">Priorité</MenuItem>
                  <MenuItem value="clientId">Client</MenuItem>
                  <MenuItem value="dateCreation">Date de Création</MenuItem>
                  <MenuItem value="assignedTo">Assigné à</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Opérateur</InputLabel>
                <Select
                  value={newFilter.operator}
                  label="Opérateur"
                  onChange={(e) => setNewFilter(prev => ({ ...prev, operator: e.target.value }))}
                >
                  <MenuItem value="equals">Égal à</MenuItem>
                  <MenuItem value="not_equals">Différent de</MenuItem>
                  <MenuItem value="contains">Contient</MenuItem>
                  <MenuItem value="greater_than">Supérieur à</MenuItem>
                  <MenuItem value="less_than">Inférieur à</MenuItem>
                  <MenuItem value="in">Dans la liste</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Valeur"
                value={newFilter.value}
                onChange={(e) => setNewFilter(prev => ({ ...prev, value: e.target.value }))}
                placeholder="Saisissez la valeur du filtre"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFilterDialog(false)}>Annuler</Button>
          <Button
            onClick={handleAddFilter}
            variant="contained"
            disabled={!newFilter.field || !newFilter.value}
          >
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdvancedFilteringDashboard;