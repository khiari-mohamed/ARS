import React, { useState } from 'react';
import { 
  Grid, Paper, Typography, TextField, FormControl, InputLabel, 
  Select, MenuItem, Button, Table, TableHead, TableRow, TableCell, 
  TableBody, Chip, Stack, Box, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FolderIcon from '@mui/icons-material/Folder';

const SearchArchiveTab: React.FC = () => {
  const [filters, setFilters] = useState({
    client: '',
    type: '',
    status: '',
    priority: '',
    dateFrom: '',
    dateTo: '',
    keywords: ''
  });
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [gedDialog, setGedDialog] = useState(false);
  const [selectedCourrier, setSelectedCourrier] = useState<any>(null);

  const handleSearch = async () => {
    console.log('🔍 Starting search with filters:', filters);
    setSearching(true);
    setHasSearched(true);
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      // Build query parameters from filters
      if (filters.type) queryParams.append('type', filters.type);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.dateFrom) queryParams.append('createdAfter', filters.dateFrom);
      if (filters.dateTo) queryParams.append('createdBefore', filters.dateTo);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/search?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const courriers = await response.json();
        console.log('🔍 Search results:', courriers.length, 'courriers found');
        if (courriers.length > 0) {
          console.log('🔍 Sample courrier data:', {
            id: courriers[0].id,
            subject: courriers[0].subject,
            uploader: courriers[0].uploader,
            bordereau: courriers[0].bordereau,
            bodySnippet: courriers[0].body?.substring(0, 100)
          });
        }
        
        // Apply client-side filters for fields not supported by backend
        let filteredResults = courriers;
        
        if (filters.client && filters.client.trim()) {
          const clientFilter = filters.client.toLowerCase().trim();
          console.log('🔍 Filtering by client:', clientFilter);
          
          filteredResults = filteredResults.filter((c: any) => {
            const matches = [
              c.bordereau?.client?.name?.toLowerCase().includes(clientFilter),
              c.uploader?.email?.toLowerCase().includes(clientFilter),
              c.uploader?.fullName?.toLowerCase().includes(clientFilter),
              c.body?.toLowerCase().includes(clientFilter),
              c.subject?.toLowerCase().includes(clientFilter)
            ];
            
            const hasMatch = matches.some(match => match);
            if (hasMatch) {
              console.log('✅ Match found in courrier:', c.id, {
                bordereau: c.bordereau?.client?.name,
                uploader: c.uploader?.fullName,
                email: c.uploader?.email,
                subject: c.subject?.substring(0, 50),
                bodySnippet: c.body?.substring(0, 100)
              });
            }
            return hasMatch;
          });
          
          console.log('🔍 After client filter:', filteredResults.length, 'results');
        }
        
        if (filters.keywords && filters.keywords.trim()) {
          const keywordFilter = filters.keywords.toLowerCase().trim();
          filteredResults = filteredResults.filter((c: any) => 
            (c.subject && c.subject.toLowerCase().includes(keywordFilter)) ||
            (c.body && c.body.toLowerCase().includes(keywordFilter))
          );
        }
        
        if (filters.priority && filters.priority.trim()) {
          filteredResults = filteredResults.filter((c: any) => 
            (c.priority || 'NORMAL') === filters.priority
          );
        }
        
        // Map to display format
        const mappedResults = filteredResults.map((courrier: any) => ({
          id: courrier.id,
          reference: `${courrier.type}/${new Date(courrier.createdAt).getFullYear()}/${courrier.id.substring(0, 8)}`,
          client: courrier.bordereau?.client?.name || courrier.uploader?.fullName || courrier.uploader?.email || 'N/A',
          date: courrier.createdAt,
          type: courrier.type,
          status: courrier.status,
          priority: courrier.priority || 'NORMAL',
          subject: courrier.subject,
          body: courrier.body,
          sentAt: courrier.sentAt,
          bordereauId: courrier.bordereauId
        }));
        
        setResults(mappedResults);
        console.log('🔍 Final results:', mappedResults.length, 'items');
        if (mappedResults.length > 0) {
          console.log('🔍 Sample result:', mappedResults[0]);
        } else {
          console.log('❌ No results after filtering');
        }
      } else {
        console.error('Search failed:', response.status);
        setResults([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleReset = () => {
    setFilters({
      client: '',
      type: '',
      status: '',
      priority: '',
      dateFrom: '',
      dateTo: '',
      keywords: ''
    });
    setResults([]);
    setHasSearched(false);
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      'SENT': { label: 'Envoyé', color: 'info' },
      'RESPONDED': { label: 'Répondu', color: 'success' },
      'PENDING_RESPONSE': { label: 'En attente', color: 'warning' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, color: 'default' };
    return <Chip label={config.label} color={config.color as any} size="small" />;
  };

  const getPriorityChip = (priority: string) => {
    const config = {
      'NORMAL': { label: 'Normal', color: 'default' },
      'URGENT': { label: 'Urgent', color: 'warning' },
      'CRITIQUE': { label: 'Critique', color: 'error' }
    };
    const { label, color } = config[priority as keyof typeof config];
    return <Chip label={label} color={color as any} size="small" />;
  };

  const handleViewCourrier = (courrier: any) => {
    console.log('👁️ Viewing courrier:', courrier.id);
    setSelectedCourrier(courrier);
    setViewDialog(true);
  };

  const handleDownloadCourrier = async (courrier: any) => {
    console.log('💾 Downloading courrier:', courrier.id);
    try {
      // Create a simple HTML file for download
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${courrier.subject}</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .content { line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${courrier.subject}</h1>
            <p><strong>Référence:</strong> ${courrier.reference}</p>
            <p><strong>Client:</strong> ${courrier.client}</p>
            <p><strong>Date:</strong> ${new Date(courrier.date).toLocaleDateString('fr-FR')}</p>
            <p><strong>Type:</strong> ${courrier.type}</p>
            <p><strong>Statut:</strong> ${courrier.status}</p>
          </div>
          <div class="content">
            ${courrier.body || 'Contenu non disponible'}
          </div>
        </body>
        </html>
      `;
      
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `courrier_${courrier.reference.replace(/\//g, '_')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('✅ Courrier downloaded successfully');
    } catch (error) {
      console.error('Failed to download courrier:', error);
      alert('Erreur lors du téléchargement');
    }
  };

  const handleViewInGED = (courrier: any) => {
    console.log('📁 Viewing in GED:', courrier.id);
    setSelectedCourrier(courrier);
    setGedDialog(true);
  };

  return (
    <Box>
      {/* Search Filters */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Recherche & Archive</Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Client"
              value={filters.client}
              onChange={(e) => setFilters({...filters, client: e.target.value})}
              fullWidth
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value})}
                label="Type"
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="REGLEMENT">Règlement</MenuItem>
                <MenuItem value="RECLAMATION">Réclamation</MenuItem>
                <MenuItem value="RELANCE">Relance</MenuItem>
                <MenuItem value="AUTRE">Autre</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Statut</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                label="Statut"
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="SENT">Envoyé</MenuItem>
                <MenuItem value="PENDING_RESPONSE">En attente</MenuItem>
                <MenuItem value="RESPONDED">Répondu</MenuItem>
                <MenuItem value="CLOSED">Clôturé</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Priorité</InputLabel>
              <Select
                value={filters.priority}
                onChange={(e) => setFilters({...filters, priority: e.target.value})}
                label="Priorité"
              >
                <MenuItem value="">Toutes</MenuItem>
                <MenuItem value="NORMAL">Normal</MenuItem>
                <MenuItem value="URGENT">Urgent</MenuItem>
                <MenuItem value="CRITIQUE">Critique</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Date début"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Date fin"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              label="Mots-clés"
              value={filters.keywords}
              onChange={(e) => setFilters({...filters, keywords: e.target.value})}
              fullWidth
              size="small"
              placeholder="Rechercher dans le sujet et le contenu..."
            />
          </Grid>
        </Grid>
        
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
            disabled={searching}
          >
            {searching ? 'Recherche...' : 'Rechercher'}
          </Button>
          <Button variant="outlined" onClick={handleReset}>
            Réinitialiser
          </Button>
        </Stack>
      </Paper>

      {/* Search Results */}
      {results.length > 0 && (
        <Paper elevation={2} sx={{ p: { xs: 1, sm: 3 } }}>
          <Typography variant="h6" sx={{ mb: 2, px: { xs: 2, sm: 0 } }}>
            Résultats ({results.length})
          </Typography>
          
          <Box sx={{ width: '100%', overflowX: 'auto' }}>
            <Table sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 120 }}>Référence</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>Client</TableCell>
                  <TableCell sx={{ minWidth: 80 }}>Date</TableCell>
                  <TableCell sx={{ minWidth: 80 }}>Type</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>Statut</TableCell>
                  <TableCell sx={{ minWidth: 80, display: { xs: 'none', md: 'table-cell' } }}>Priorité</TableCell>
                  <TableCell sx={{ minWidth: 200 }}>Sujet</TableCell>
                  <TableCell sx={{ minWidth: 200 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {item.reference}
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {item.client}
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {new Date(item.date).toLocaleDateString('fr-FR', { 
                        day: '2-digit', 
                        month: '2-digit',
                        year: '2-digit'
                      })}
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {item.type}
                    </TableCell>
                    <TableCell>{getStatusChip(item.status)}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      {getPriorityChip(item.priority)}
                    </TableCell>
                    <TableCell sx={{ 
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {item.subject}
                    </TableCell>
                    <TableCell>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <Button 
                          size="small" 
                          startIcon={<VisibilityIcon />}
                          onClick={() => handleViewCourrier(item)}
                          sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}
                        >
                          Ouvrir
                        </Button>
                        <Button 
                          size="small" 
                          startIcon={<DownloadIcon />}
                          onClick={() => handleDownloadCourrier(item)}
                          sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}
                        >
                          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Télécharger</Box>
                          <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Téléch.</Box>
                        </Button>
                        <Button 
                          size="small" 
                          startIcon={<FolderIcon />}
                          onClick={() => handleViewInGED(item)}
                          sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}
                        >
                          GED
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {results.length === 0 && !searching && hasSearched && (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          <SearchIcon sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h6">Aucun résultat trouvé</Typography>
          <Typography variant="body2">
            Essayez de modifier vos critères de recherche
          </Typography>
        </Paper>
      )}

      {results.length === 0 && !searching && !hasSearched && (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          <SearchIcon sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h6">Utilisez les filtres ci-dessus pour rechercher</Typography>
          <Typography variant="body2">
            Recherchez dans l'archive complète de correspondance
          </Typography>
        </Paper>
      )}

      {searching && (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6">Recherche en cours...</Typography>
        </Paper>
      )}

      {/* View Courrier Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Détails du Courrier - {selectedCourrier?.reference}
        </DialogTitle>
        <DialogContent>
          {selectedCourrier && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Client</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedCourrier.client}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Date</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {new Date(selectedCourrier.date).toLocaleDateString('fr-FR')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Type</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedCourrier.type}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Statut</Typography>
                  {getStatusChip(selectedCourrier.status)}
                </Grid>
              </Grid>
              
              <Typography variant="h6" gutterBottom>Sujet</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>{selectedCourrier.subject}</Typography>
              
              <Typography variant="h6" gutterBottom>Contenu</Typography>
              <Box 
                sx={{ 
                  border: 1, 
                  borderColor: 'divider', 
                  borderRadius: 1, 
                  p: 2, 
                  bgcolor: 'background.paper',
                  maxHeight: 300,
                  overflow: 'auto'
                }}
                dangerouslySetInnerHTML={{ __html: selectedCourrier.body || 'Contenu non disponible' }}
              />
              
              {selectedCourrier.sentAt && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Envoyé le {new Date(selectedCourrier.sentAt).toLocaleString('fr-FR')}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>Fermer</Button>
          <Button 
            variant="contained" 
            startIcon={<DownloadIcon />}
            onClick={() => selectedCourrier && handleDownloadCourrier(selectedCourrier)}
          >
            Télécharger
          </Button>
        </DialogActions>
      </Dialog>

      {/* GED Dialog */}
      <Dialog open={gedDialog} onClose={() => setGedDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Voir dans le GED
        </DialogTitle>
        <DialogContent>
          {selectedCourrier && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Courrier:</strong> {selectedCourrier.reference}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Sujet:</strong> {selectedCourrier.subject}
              </Typography>
              
              {selectedCourrier.bordereauId ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Ce courrier est lié au bordereau: <strong>{selectedCourrier.bordereauId}</strong>
                </Alert>
              ) : (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Ce courrier n'est pas archivé dans le GED
                </Alert>
              )}
              
              <Typography variant="body2" color="text.secondary">
                {selectedCourrier.bordereauId 
                  ? 'Vous allez être redirigé vers le module GED pour consulter ce bordereau.'
                  : 'Ce courrier n\'a pas de bordereau associé et ne peut pas être consulté dans le GED.'
                }
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGedDialog(false)}>Annuler</Button>
          {selectedCourrier?.bordereauId && (
            <Button 
              variant="contained" 
              startIcon={<FolderIcon />}
              onClick={() => {
                console.log('Redirecting to GED for bordereau:', selectedCourrier.bordereauId);
                // Here you would implement the actual GED redirection
                alert('Redirection vers le GED...');
                setGedDialog(false);
              }}
            >
              Ouvrir dans GED
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SearchArchiveTab;