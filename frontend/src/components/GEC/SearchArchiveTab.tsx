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
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedCourrier, setSelectedCourrier] = useState<any>(null);

  const handleSearch = async () => {
    console.log('🔍 Starting search with filters:', filters);
    setSearching(true);
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      // Build query parameters from filters
      if (filters.type) queryParams.append('type', filters.type);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.dateFrom) queryParams.append('createdAfter', filters.dateFrom);
      if (filters.dateTo) queryParams.append('createdBefore', filters.dateTo);
      
      const response = await fetch(`http://localhost:5000/api/courriers/search?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const courriers = await response.json();
        console.log('🔍 Search results:', courriers.length, 'courriers found');
        
        // Apply client-side filters for fields not supported by backend
        let filteredResults = courriers;
        
        if (filters.client) {
          filteredResults = filteredResults.filter((c: any) => 
            c.bordereau?.client?.name?.toLowerCase().includes(filters.client.toLowerCase()) ||
            c.uploader?.email?.toLowerCase().includes(filters.client.toLowerCase())
          );
        }
        
        if (filters.keywords) {
          filteredResults = filteredResults.filter((c: any) => 
            c.subject?.toLowerCase().includes(filters.keywords.toLowerCase()) ||
            c.body?.toLowerCase().includes(filters.keywords.toLowerCase())
          );
        }
        
        // Map to display format
        const mappedResults = filteredResults.map((courrier: any) => ({
          id: courrier.id,
          reference: `${courrier.type}/${new Date(courrier.createdAt).getFullYear()}/${courrier.id.substring(0, 8)}`,
          client: courrier.bordereau?.client?.name || courrier.uploader?.email || 'N/A',
          date: courrier.createdAt,
          type: courrier.type,
          status: courrier.status,
          priority: 'NORMAL', // Mock priority
          subject: courrier.subject,
          body: courrier.body,
          sentAt: courrier.sentAt,
          bordereauId: courrier.bordereauId
        }));
        
        setResults(mappedResults);
        console.log('🔍 Filtered results:', mappedResults.length, 'items');
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
    if (courrier.bordereauId) {
      alert(`Courrier lié au bordereau: ${courrier.bordereauId}\nRedirection vers le GED...`);
    } else {
      alert('Ce courrier n\'est pas archivé dans le GED');
    }
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
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Résultats ({results.length})
          </Typography>
          
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Référence</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Priorité</TableCell>
                <TableCell>Sujet</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.reference}</TableCell>
                  <TableCell>{item.client}</TableCell>
                  <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{getStatusChip(item.status)}</TableCell>
                  <TableCell>{getPriorityChip(item.priority)}</TableCell>
                  <TableCell>{item.subject}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button 
                        size="small" 
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleViewCourrier(item)}
                      >
                        Ouvrir
                      </Button>
                      <Button 
                        size="small" 
                        startIcon={<DownloadIcon />}
                        onClick={() => handleDownloadCourrier(item)}
                      >
                        Télécharger
                      </Button>
                      <Button 
                        size="small" 
                        startIcon={<FolderIcon />}
                        onClick={() => handleViewInGED(item)}
                      >
                        Voir dans GED
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {results.length === 0 && !searching && (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          <SearchIcon sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h6">Utilisez les filtres ci-dessus pour rechercher</Typography>
          <Typography variant="body2">
            Recherchez dans l'archive complète de correspondance
          </Typography>
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
    </Box>
  );
};

export default SearchArchiveTab;