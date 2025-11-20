import React, { useState, useEffect } from 'react';
import financeService from '../../services/financeService';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import {
  AccountBalance,
  TrendingUp,
  Assignment,
  CheckCircle,
  Warning,
  Error,
  FilterList,
  Refresh
} from '@mui/icons-material';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardStats {
  totalOrdres: number;
  ordresEnCours: number;
  ordresExecutes: number;
  ordresRejetes: number;
  montantTotal: number;
}

interface RecentOrdre {
  id: string;
  reference: string;
  etatVirement: string;
  montantTotal: number;
  dateCreation: string;
  bordereau?: {
    client?: {
      name: string;
    };
  };
  donneurOrdre?: {
    nom: string;
  };
}

const FinanceDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    compagnie: '',
    client: '',
    referenceBordereau: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [recentOrdersFilters, setRecentOrdersFilters] = useState({
    compagnie: '',
    client: '',
    referenceBordereau: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showRecentOrdersFilters, setShowRecentOrdersFilters] = useState(false);
  const [showAllRecentOrders, setShowAllRecentOrders] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [documentViewer, setDocumentViewer] = useState<{open: boolean, url: string, title: string, type: 'pdf' | 'txt'}>({
    open: false, url: '', title: '', type: 'pdf'
  });

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      if (filters.compagnie) queryParams.append('compagnie', filters.compagnie);
      if (filters.client) queryParams.append('client', filters.client);
      if (filters.referenceBordereau) queryParams.append('referenceBordereau', filters.referenceBordereau);
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
      
      const data = await financeService.getFinanceDashboard(queryParams.toString());
      setDashboard(data);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du chargement');
      // Set default data to prevent crashes
      setDashboard({
        stats: {
          totalOrdres: 0,
          ordresEnCours: 0,
          ordresExecutes: 0,
          ordresRejetes: 0,
          montantTotal: 0,
          demandesRecuperation: 0,
          montantsRecuperes: 0
        },
        ordresVirement: []
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };
  
  const handleRecentOrdersFilterChange = (field: string, value: string) => {
    setRecentOrdersFilters(prev => ({ ...prev, [field]: value }));
  };
  
  const applyFilters = () => {
    loadDashboard();
  };
  
  const clearFilters = () => {
    setFilters({ compagnie: '', client: '', referenceBordereau: '', dateFrom: '', dateTo: '' });
    setTimeout(() => loadDashboard(), 100);
  };
  
  const clearRecentOrdersFilters = () => {
    setRecentOrdersFilters({ compagnie: '', client: '', referenceBordereau: '', dateFrom: '', dateTo: '' });
    setCurrentPage(1);
  };

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [recentOrdersFilters.compagnie, recentOrdersFilters.client, recentOrdersFilters.referenceBordereau, recentOrdersFilters.dateFrom, recentOrdersFilters.dateTo]);

  useEffect(() => {
    loadDashboard();
  }, []);

  if (isLoading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Chargement du tableau de bord...</Typography>
      </Box>
    );
  }

  if (error && !dashboard) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        <Typography variant="h6">Erreur lors du chargement</Typography>
        <Typography variant="body2">{error}</Typography>
        <Button variant="outlined" onClick={loadDashboard} sx={{ mt: 1 }}>
          Réessayer
        </Button>
      </Alert>
    );
  }

  const stats: DashboardStats = dashboard?.stats || {
    totalOrdres: 0,
    ordresEnCours: 0,
    ordresExecutes: 0,
    ordresRejetes: 0,
    montantTotal: 0
  };
  
  const ordresVirement = dashboard?.ordresVirement || [];

  const renderStatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={2.4}>
        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Total Ordres
                </Typography>
                <Typography variant="h4" color="primary">
                  {stats.totalOrdres}
                </Typography>
              </Box>
              <Assignment color="primary" fontSize="large" />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  En Cours
                </Typography>
                <Typography variant="h4" color="info.main">
                  {stats.ordresEnCours}
                </Typography>
              </Box>
              <TrendingUp color="info" fontSize="large" />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Exécutés
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats.ordresExecutes}
                </Typography>
              </Box>
              <CheckCircle color="success" fontSize="large" />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Rejetés
                </Typography>
                <Typography variant="h4" color="error.main">
                  {stats.ordresRejetes}
                </Typography>
              </Box>
              <Error color="error" fontSize="large" />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Montant Total
                </Typography>
                <Typography variant="h4" color="secondary.main">
                  {(stats.montantTotal || 0).toLocaleString('fr-TN')} TND
                </Typography>
              </Box>
              <AccountBalance color="secondary" fontSize="large" />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const getFilteredRecentOrders = () => {
    let filtered = ordresVirement || [];
    
    if (recentOrdersFilters.compagnie) {
      filtered = filtered.filter((ordre: any) => 
        ordre.compagnieAssurance?.toLowerCase().includes(recentOrdersFilters.compagnie.toLowerCase())
      );
    }
    
    if (recentOrdersFilters.client) {
      filtered = filtered.filter((ordre: any) => 
        ordre.client?.toLowerCase().includes(recentOrdersFilters.client.toLowerCase())
      );
    }
    
    if (recentOrdersFilters.referenceBordereau) {
      filtered = filtered.filter((ordre: any) => 
        ordre.referenceBordereau?.toLowerCase().includes(recentOrdersFilters.referenceBordereau.toLowerCase())
      );
    }
    
    if (recentOrdersFilters.dateFrom) {
      filtered = filtered.filter((ordre: any) => 
        new Date(ordre.dateCreation) >= new Date(recentOrdersFilters.dateFrom)
      );
    }
    
    if (recentOrdersFilters.dateTo) {
      filtered = filtered.filter((ordre: any) => 
        new Date(ordre.dateCreation) <= new Date(recentOrdersFilters.dateTo)
      );
    }
    
    // Sort by dateExecution first (most recent), then by dateCreation (most recent first)
    filtered = filtered.sort((a: any, b: any) => {
      const dateA = new Date(a.dateExecution || a.dateCreation).getTime();
      const dateB = new Date(b.dateExecution || b.dateCreation).getTime();
      return dateB - dateA;
    });
    
    if (showAllRecentOrders) {
      return filtered;
    } else {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      return filtered.slice(startIndex, endIndex);
    }
  };

  const getTotalFilteredCount = () => {
    let filtered = ordresVirement || [];
    
    if (recentOrdersFilters.compagnie) {
      filtered = filtered.filter((ordre: any) => 
        ordre.compagnieAssurance?.toLowerCase().includes(recentOrdersFilters.compagnie.toLowerCase())
      );
    }
    
    if (recentOrdersFilters.client) {
      filtered = filtered.filter((ordre: any) => 
        ordre.client?.toLowerCase().includes(recentOrdersFilters.client.toLowerCase())
      );
    }
    
    if (recentOrdersFilters.referenceBordereau) {
      filtered = filtered.filter((ordre: any) => 
        ordre.referenceBordereau?.toLowerCase().includes(recentOrdersFilters.referenceBordereau.toLowerCase())
      );
    }
    
    if (recentOrdersFilters.dateFrom) {
      filtered = filtered.filter((ordre: any) => 
        new Date(ordre.dateCreation) >= new Date(recentOrdersFilters.dateFrom)
      );
    }
    
    if (recentOrdersFilters.dateTo) {
      filtered = filtered.filter((ordre: any) => 
        new Date(ordre.dateCreation) <= new Date(recentOrdersFilters.dateTo)
      );
    }
    
    return filtered.length;
  };

  const getTotalPages = () => {
    const totalCount = getTotalFilteredCount();
    return Math.ceil(totalCount / itemsPerPage);
  };

  const renderRecentOrdres = () => {
    const filteredOrders = getFilteredRecentOrders();
    
    return (
      <Card elevation={2}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h6">Bloc Ordres de virement récents</Typography>
              {user?.role === 'CHEF_EQUIPE' && (
                <Typography variant="caption" color="info.main" sx={{ fontStyle: 'italic' }}>
                  Affichage limité aux ordres de votre équipe
                </Typography>
              )}
              {user?.role === 'GESTIONNAIRE_SENIOR' && (
                <Typography variant="caption" color="info.main" sx={{ fontStyle: 'italic' }}>
                  Affichage limité à vos clients uniquement
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                size="small"
                onClick={() => setShowRecentOrdersFilters(!showRecentOrdersFilters)}
              >
                Filtres
              </Button>
              <Button
                variant={showAllRecentOrders ? 'contained' : 'outlined'}
                size="small"
                onClick={() => {
                  setShowAllRecentOrders(!showAllRecentOrders);
                  setCurrentPage(1);
                }}
              >
                {showAllRecentOrders ? 'Réduire' : 'Afficher tout'}
              </Button>
              <Button 
                variant="outlined" 
                size="small"
                onClick={async () => {
                  try {
                    const { financeService } = await import('../../services/financeService');
                    await financeService.exportDashboardExcel({
                      compagnie: recentOrdersFilters.compagnie,
                      client: recentOrdersFilters.client,
                      dateFrom: recentOrdersFilters.dateFrom,
                      dateTo: recentOrdersFilters.dateTo
                    });
                  } catch (error) {
                    console.error('Export failed:', error);
                    alert('Erreur lors de l\'export Excel');
                  }
                }}
                startIcon={<Assignment />}
              >
                Export Excel
              </Button>
              <Button 
                variant="outlined" 
                size="small"
                onClick={loadDashboard}
                startIcon={<Refresh />}
              >
                Actualiser
              </Button>
            </Box>
          </Box>
          
          {/* EXACT SPEC: Filtres - Compagnie d'assurance / Client / Référence Bordereau / Période */}
          {showRecentOrdersFilters && (
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>Filtres : Compagnie d'assurance / Client / Référence Bordereau / Période</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={2.5}>
                  <TextField
                    fullWidth
                    label="Compagnie d'assurance"
                    value={recentOrdersFilters.compagnie}
                    onChange={(e) => handleRecentOrdersFilterChange('compagnie', e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={2.5}>
                  <TextField
                    fullWidth
                    label="Client"
                    value={recentOrdersFilters.client}
                    onChange={(e) => handleRecentOrdersFilterChange('client', e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label="Référence Bordereau"
                    value={recentOrdersFilters.referenceBordereau}
                    onChange={(e) => handleRecentOrdersFilterChange('referenceBordereau', e.target.value)}
                    size="small"
                    placeholder="Ex: BORD-2024-001"
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label="Période - Début"
                    type="date"
                    value={recentOrdersFilters.dateFrom}
                    onChange={(e) => handleRecentOrdersFilterChange('dateFrom', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label="Période - Fin"
                    type="date"
                    value={recentOrdersFilters.dateTo}
                    onChange={(e) => handleRecentOrdersFilterChange('dateTo', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={1}>
                  <Button 
                    variant="outlined" 
                    onClick={clearRecentOrdersFilters} 
                    size="small"
                    fullWidth
                  >
                    Réinitialiser
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          )}

        {filteredOrders.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Référence OV</strong></TableCell>
                  <TableCell><strong>Référence Bordereau</strong></TableCell>
                  <TableCell><strong>Compagnie d'Assurance</strong></TableCell>
                  <TableCell><strong>Client / Société</strong></TableCell>
                  <TableCell><strong>Bordereau</strong></TableCell>
                  <TableCell><strong>Montant</strong></TableCell>
                  <TableCell><strong>Statut</strong></TableCell>
                  <TableCell><strong>Date d'Exécution</strong></TableCell>
                  <TableCell><strong>Motif/Observations</strong></TableCell>
                  <TableCell><strong>Demande Récupération</strong></TableCell>
                  <TableCell><strong>Montant Récupéré</strong></TableCell>
                  <TableCell><strong>Documents</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOrders.map((ordre: any, index: number) => (
                  <TableRow key={ordre.id || index} hover>
                    <TableCell>{ordre.reference}</TableCell>
                    <TableCell>{ordre.referenceBordereau || '-'}</TableCell>
                    <TableCell>{ordre.compagnieAssurance || '-'}</TableCell>
                    <TableCell>{ordre.client}</TableCell>
                    <TableCell>{ordre.bordereau}</TableCell>
                    <TableCell>{ordre.montant?.toLocaleString('fr-TN')} TND</TableCell>
                    <TableCell>
                      <Chip
                        label={ordre.statut}
                        color={['EXECUTE', 'VIREMENT_DEPOSE'].includes(ordre.statut) ? 'success' : ['REJETE', 'VIREMENT_NON_VALIDE'].includes(ordre.statut) ? 'error' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {ordre.dateExecution ? new Date(ordre.dateExecution).toLocaleDateString('fr-FR') : '-'}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      {/* EXACT SPEC: Don't display observation written by Responsable Département */}
                      <Typography variant="body2" sx={{ 
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        fontSize: '0.875rem'
                      }}>
                        {ordre.statut === 'VIREMENT_NON_VALIDE' ? '-' : (ordre.motifObservation || '-')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {ordre.demandeRecuperation ? (
                        <Box>
                          <Chip label="Oui" color="warning" size="small" />
                          {ordre.dateDemandeRecuperation && (
                            <Typography variant="caption" display="block">
                              {new Date(ordre.dateDemandeRecuperation).toLocaleDateString('fr-FR')}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Chip label="Non" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      {ordre.montantRecupere ? (
                        <Box>
                          <Chip label="Oui" color="success" size="small" />
                          {ordre.dateMontantRecupere && (
                            <Typography variant="caption" display="block">
                              {new Date(ordre.dateMontantRecupere).toLocaleDateString('fr-FR')}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Chip label="Non" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={async () => {
                            try {
                              const { LocalAPI } = await import('../../services/axios');
                              const response = await LocalAPI.get(`/finance/ordres-virement/${ordre.id}/pdf`, {
                                responseType: 'blob'
                              });
                              const blob = new Blob([response.data], { type: 'application/pdf' });
                              const blobUrl = URL.createObjectURL(blob);
                              setDocumentViewer({
                                open: true,
                                url: blobUrl,
                                title: `PDF OV - ${ordre.reference}`,
                                type: 'pdf'
                              });
                            } catch (error) {
                              console.error('Error loading PDF:', error);
                              alert('Erreur lors du chargement du PDF');
                            }
                          }}
                        >
                          PDF OV
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={async () => {
                            try {
                              const { LocalAPI } = await import('../../services/axios');
                              const response = await LocalAPI.get(`/finance/ordres-virement/${ordre.id}/txt`, {
                                responseType: 'blob'
                              });
                              const blob = new Blob([response.data], { type: 'text/plain' });
                              const blobUrl = URL.createObjectURL(blob);
                              setDocumentViewer({
                                open: true,
                                url: blobUrl,
                                title: `TXT - ${ordre.reference}`,
                                type: 'txt'
                              });
                            } catch (error) {
                              console.error('Error loading TXT:', error);
                              alert('Erreur lors du chargement du TXT');
                            }
                          }}
                        >
                          TXT
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="secondary"
                          onClick={async () => {
                            try {
                              const { LocalAPI } = await import('../../services/axios');
                              const ovResponse = await LocalAPI.get(`/finance/ordres-virement/${ordre.id}`);
                              const ov = ovResponse.data;
                              
                              if (!ov.bordereauId) {
                                alert('Aucun bordereau lié à cet OV');
                                return;
                              }
                              
                              const response = await LocalAPI.get(`/finance/ov-documents/bordereau/${ov.bordereauId}`);
                              const ovDocuments = response.data;
                              const pdfDoc = ovDocuments.find((doc: any) => doc.type === 'BORDEREAU_PDF');
                              
                              if (pdfDoc) {
                                const docResponse = await LocalAPI.get(`/finance/ordres-virement/${pdfDoc.ordreVirementId}/documents/${pdfDoc.id}/pdf`, {
                                  responseType: 'blob'
                                });
                                const blob = new Blob([docResponse.data], { type: 'application/pdf' });
                                const blobUrl = URL.createObjectURL(blob);
                                setDocumentViewer({
                                  open: true,
                                  url: blobUrl,
                                  title: `PDF Uploadé - ${pdfDoc.name}`,
                                  type: 'pdf'
                                });
                              } else {
                                alert('Aucun PDF uploadé trouvé');
                              }
                            } catch (error: any) {
                              console.error('Error loading bordereau PDF:', error);
                              alert(`Erreur: ${error.response?.data?.message || error.message || 'Erreur inconnue'}`);
                            }
                          }}
                        >
                          PDF Bordereau
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="textSecondary">
              {(recentOrdersFilters.compagnie || recentOrdersFilters.client || recentOrdersFilters.referenceBordereau || recentOrdersFilters.dateFrom || recentOrdersFilters.dateTo) 
                ? 'Aucun ordre de virement trouvé avec ces filtres' 
                : 'Aucun ordre de virement récent'
              }
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {(recentOrdersFilters.compagnie || recentOrdersFilters.client || recentOrdersFilters.referenceBordereau || recentOrdersFilters.dateFrom || recentOrdersFilters.dateTo)
                ? 'Essayez de modifier les critères de recherche'
                : 'Les ordres de virement apparaîtront ici une fois créés'
              }
            </Typography>
          </Box>
        )}
        
        {/* Pagination and count info */}
        {filteredOrders.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" color="textSecondary">
                {showAllRecentOrders 
                  ? `Affichage de tous les ${filteredOrders.length} ordres`
                  : `Affichage de ${Math.min(itemsPerPage, filteredOrders.length)} sur ${getTotalFilteredCount()} ordres (Page ${currentPage}/${getTotalPages()})`
                }
                {(recentOrdersFilters.compagnie || recentOrdersFilters.client || recentOrdersFilters.referenceBordereau || recentOrdersFilters.dateFrom || recentOrdersFilters.dateTo) && 
                  ' (filtrés)'
                }
              </Typography>
              
              {!showAllRecentOrders && getTotalPages() > 1 && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Button 
                    size="small" 
                    variant="outlined"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Précédent
                  </Button>
                  <Typography variant="caption" sx={{ mx: 1 }}>
                    {currentPage} / {getTotalPages()}
                  </Typography>
                  <Button 
                    size="small" 
                    variant="outlined"
                    disabled={currentPage === getTotalPages()}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Suivant
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Tableau de Bord Finance
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filtres
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadDashboard}
          >
            Actualiser
          </Button>
        </Box>
      </Box>
      
      {/* EXACT SPEC: Filtres disponibles - Compagnie d'assurance, Client, Référence Bordereau, Période */}
      {showFilters && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#f8f9fa' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Filtres disponibles</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={2.5}>
              <TextField
                fullWidth
                label="Compagnie d'assurance"
                value={filters.compagnie}
                onChange={(e) => handleFilterChange('compagnie', e.target.value)}
                size="small"
                placeholder="Filtrer par compagnie"
              />
            </Grid>
            <Grid item xs={12} md={2.5}>
              <TextField
                fullWidth
                label="Client"
                value={filters.client}
                onChange={(e) => handleFilterChange('client', e.target.value)}
                size="small"
                placeholder="Filtrer par client"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Référence Bordereau"
                value={filters.referenceBordereau}
                onChange={(e) => handleFilterChange('referenceBordereau', e.target.value)}
                size="small"
                placeholder="Ex: BORD-2024-001"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Période - Début"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Période - Fin"
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={1}>
              <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                <Button variant="contained" onClick={applyFilters} size="small" fullWidth>
                  Appliquer
                </Button>
                <Button variant="outlined" onClick={clearFilters} size="small" fullWidth>
                  Réinitialiser
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Attention:</strong> {error}
        </Alert>
      )}

      {/* Rejected Orders Alert */}
      {stats.ordresRejetes > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <strong>Attention:</strong> {stats.ordresRejetes} ordre(s) de virement rejeté(s)
        </Alert>
      )}

      {/* Stats Cards */}
      {renderStatsCards()}

      {/* Recent Orders */}
      {renderRecentOrdres()}
      
      {/* Recovery Stats */}
      {dashboard?.stats && (
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Demandes de Récupération
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {dashboard.stats.demandesRecuperation || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Ordres avec demande de récupération
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Montants Récupérés
                </Typography>
                <Typography variant="h4" color="success.main">
                  {dashboard.stats.montantsRecuperes || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Ordres avec montant récupéré
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Document Viewer Dialog */}
      <Dialog 
        open={documentViewer.open} 
        onClose={() => setDocumentViewer({open: false, url: '', title: '', type: 'pdf'})} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{ sx: { height: '90vh' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{documentViewer.title}</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {documentViewer.type === 'txt' && documentViewer.url && (
              <Button
                variant="contained"
                size="small"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = documentViewer.url;
                  link.download = documentViewer.title.replace('TXT - ', '') + '.txt';
                  link.click();
                }}
              >
                Télécharger
              </Button>
            )}
            <Button 
              onClick={() => setDocumentViewer({open: false, url: '', title: '', type: 'pdf'})}
              size="small"
            >
              Fermer
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '100%' }}>
          {documentViewer.url ? (
            documentViewer.type === 'pdf' ? (
              <iframe
                src={documentViewer.url}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title={documentViewer.title}
              />
            ) : (
              <Box sx={{ p: 2, height: '100%', overflow: 'auto', backgroundColor: '#f5f5f5' }}>
                <iframe
                  src={documentViewer.url}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    border: '1px solid #ddd', 
                    backgroundColor: 'white',
                    fontFamily: 'monospace',
                    fontSize: '14px'
                  }}
                  title={documentViewer.title}
                />
              </Box>
            )
          ) : (
            <Box sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              fontSize: '18px',
              color: '#666'
            }}>
              Chargement du document...
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default FinanceDashboard;