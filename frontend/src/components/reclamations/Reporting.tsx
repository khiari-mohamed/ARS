import React, { useState, useEffect } from 'react';
import { useReclamations } from '../../hooks/useReclamations';
import { ExportButtons } from './ExportButtons';
import { SkeletonTable } from './SkeletonTable';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { Reclamation, ReclamationStatus, ReclamationSeverity } from '../../types/reclamation.d';
import { useQuery } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  FilterList,
  GetApp,
  Print,
  Refresh,
  Assessment
} from '@mui/icons-material';

type Client = { id: string; name: string };
type User = { id: string; fullName: string };

interface ReportFilters {
  clientId?: string;
  status?: ReclamationStatus;
  severity?: ReclamationSeverity;
  type?: string;
  assignedToId?: string;
  fromDate?: string;
  toDate?: string;
}

const fetchClients = async (): Promise<Client[]> => {
  const { data } = await LocalAPI.get<Client[]>('/clients');
  return data;
};

const fetchUsers = async (): Promise<User[]> => {
  const { data } = await LocalAPI.get<User[]>('/users');
  return data;
};

export const Reporting: React.FC = () => {
  const [filters, setFilters] = useState<ReportFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>({});

  const {
    data: clients = [],
    isLoading: clientsLoading,
  } = useQuery<Client[]>(['clients'], fetchClients);

  const {
    data: users = [],
    isLoading: usersLoading,
  } = useQuery<User[]>(['users'], fetchUsers);

  const { data, isLoading, error } = useReclamations({
    ...appliedFilters,
    take: 1000, // Get more data for reporting
  });

  const types = ['retard', 'document manquant', 'erreur traitement', 'autre'];
  const statuses: ReclamationStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  const severities: ReclamationSeverity[] = ['low', 'medium', 'critical'];

  const handleFilterChange = (field: keyof ReportFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value || undefined
    }));
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
  };

  const resetFilters = () => {
    setFilters({});
    setAppliedFilters({});
  };

  const handlePrint = () => {
    if (!data || data.length === 0) {
      alert('Aucune donnée à imprimer');
      return;
    }
    
    const printContent = `
      <html>
        <head>
          <title>Rapport des Réclamations</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #1976d2; margin-bottom: 20px; }
            .info { margin-bottom: 20px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .status-open { color: #ff9800; }
            .status-resolved { color: #4caf50; }
            .status-critical { color: #f44336; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Rapport des Réclamations</h1>
          <div class="info">
            <p><strong>Date de génération:</strong> ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
            <p><strong>Nombre total:</strong> ${totalReclamations} réclamations</p>
          </div>
          <table>
            <thead>
              <tr>
                ${columns.map(col => `<th>${col.label}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(rec => `
                <tr>
                  <td>${rec.id.substring(0, 8)}...</td>
                  <td>${rec.client?.name || clients.find(c => c.id === rec.clientId)?.name || 'Client inconnu'}</td>
                  <td>${rec.type}</td>
                  <td class="status-${rec.severity}">${rec.severity === 'low' ? 'Faible' : rec.severity === 'medium' ? 'Moyenne' : rec.severity === 'critical' ? 'Critique' : rec.severity}</td>
                  <td class="status-${rec.status.toLowerCase()}">${rec.status === 'OPEN' ? 'Ouverte' : rec.status === 'IN_PROGRESS' ? 'En cours' : rec.status === 'RESOLVED' ? 'Résolue' : rec.status === 'CLOSED' ? 'Fermée' : rec.status}</td>
                  <td>${new Date(rec.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td>${users.find(u => u.id === rec.assignedToId)?.fullName || rec.assignedToId || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const columns = [
    { label: 'ID', key: 'id' },
    { label: 'Client', key: 'clientId' },
    { label: 'Type', key: 'type' },
    { label: 'Gravité', key: 'severity' },
    { label: 'Statut', key: 'status' },
    { label: 'Date', key: 'createdAt' },
    { label: 'Assigné à', key: 'assignedToId' },
  ];

  // Calculate summary statistics
  const totalReclamations = Array.isArray(data) ? data.length : 0;
  const openReclamations = Array.isArray(data) ? data.filter(r => ['OPEN', 'open'].includes(r.status)).length : 0;
  const resolvedReclamations = Array.isArray(data) ? data.filter(r => ['RESOLVED', 'CLOSED'].includes(r.status)).length : 0;
  const criticalReclamations = Array.isArray(data) ? data.filter(r => r.severity === 'critical').length : 0;

  if (clientsLoading || usersLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Chargement des données...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: '100%', mx: 'auto', p: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <Assessment sx={{ mr: 1, color: 'primary.main' }} />
          Reporting Réclamations
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Générez des rapports détaillés avec filtres avancés et options d'export
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main">{totalReclamations}</Typography>
              <Typography variant="body2" color="text.secondary">Total</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">{openReclamations}</Typography>
              <Typography variant="body2" color="text.secondary">Ouvertes</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">{resolvedReclamations}</Typography>
              <Typography variant="body2" color="text.secondary">Résolues</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">{criticalReclamations}</Typography>
              <Typography variant="body2" color="text.secondary">Critiques</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <FilterList sx={{ mr: 1 }} />
            Filtres de Rapport
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Client</InputLabel>
                <Select
                  value={filters.clientId || ''}
                  onChange={(e) => handleFilterChange('clientId', e.target.value)}
                  label="Client"
                >
                  <MenuItem value="">Tous</MenuItem>
                  {clients.map(client => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Statut</InputLabel>
                <Select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  label="Statut"
                >
                  <MenuItem value="">Tous</MenuItem>
                  {statuses.map(status => (
                    <MenuItem key={status} value={status}>
                      {status === 'OPEN' ? 'Ouverte' : 
                       status === 'IN_PROGRESS' ? 'En cours' :
                       status === 'RESOLVED' ? 'Résolue' : 
                       status === 'CLOSED' ? 'Fermée' : status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Gravité</InputLabel>
                <Select
                  value={filters.severity || ''}
                  onChange={(e) => handleFilterChange('severity', e.target.value)}
                  label="Gravité"
                >
                  <MenuItem value="">Toutes</MenuItem>
                  {severities.map(severity => (
                    <MenuItem key={severity} value={severity}>
                      {severity === 'low' ? 'Faible' : 
                       severity === 'medium' ? 'Moyenne' : 
                       severity === 'critical' ? 'Critique' : severity}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={filters.type || ''}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  label="Type"
                >
                  <MenuItem value="">Tous</MenuItem>
                  {types.map(type => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Assigné à</InputLabel>
                <Select
                  value={filters.assignedToId || ''}
                  onChange={(e) => handleFilterChange('assignedToId', e.target.value)}
                  label="Assigné à"
                >
                  <MenuItem value="">Tous</MenuItem>
                  {users.map(user => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.fullName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              {/* Placeholder for alignment */}
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Du"
                value={filters.fromDate || ''}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Au"
                value={filters.toDate || ''}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<FilterList />}
              onClick={applyFilters}
            >
              Filtrer
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={resetFilters}
            >
              Réinitialiser
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Export Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Actions d'Export
          </Typography>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <ExportButtons 
              data={data || []} 
              columns={columns} 
              fileName="reporting-reclamations" 
            />
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={handlePrint}
              sx={{ ml: 1 }}
            >
              Imprimer ce rapport
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent>
          <>
            <Typography variant="h6" gutterBottom>
              Données du Rapport ({totalReclamations} résultats)
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Erreur lors du chargement des données: {String(error)}
              </Alert>
            )}
            
            {isLoading ? (
              <SkeletonTable rows={8} cols={columns.length} />
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'grey.50' }}>
                      {columns.map(col => (
                        <TableCell key={col.key} sx={{ fontWeight: 600 }}>
                          {col.label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.isArray(data) && data.length > 0 ? (
                      data.map((rec: Reclamation) => (
                        <TableRow key={rec.id} hover>
                          <TableCell>
                            <Chip 
                              label={rec.id.substring(0, 8) + '...'} 
                              size="small" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            {rec.client?.name || clients.find(c => c.id === rec.clientId)?.name || 'Client inconnu'}
                          </TableCell>
                          <TableCell>
                            <Chip label={rec.type} size="small" color="primary" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <PriorityBadge severity={rec.severity} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={rec.status} />
                          </TableCell>
                          <TableCell>
                            {new Date(rec.createdAt).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell>
                            {users.find(u => u.id === rec.assignedToId)?.fullName || rec.assignedToId || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                          <Typography variant="h6" color="text.secondary" gutterBottom>
                            Aucune donnée à afficher
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Essayez de modifier vos filtres ou vérifiez qu'il y a des réclamations dans le système
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        </CardContent>
      </Card>
    </Box>
  );
};