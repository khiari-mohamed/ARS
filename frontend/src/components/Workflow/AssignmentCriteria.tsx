import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  Assignment,
  Person,
  Business,
  Category,
  AutoAwesome,
  CheckCircle
} from '@mui/icons-material';
import { LocalAPI } from '../../services/axios';

interface Bordereau {
  id: string;
  reference: string;
  clientName: string;
  nombreBS: number;
  statut: string;
  dateReception: string;
}

interface User {
  id: string;
  fullName: string;
  role: string;
  currentLoad?: number;
}

const AssignmentCriteria: React.FC = () => {
  const [selectedBordereaux, setSelectedBordereaux] = useState<string[]>([]);
  const [availableBordereaux, setAvailableBordereaux] = useState<Bordereau[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [assignmentType, setAssignmentType] = useState<'manual' | 'client' | 'type' | 'ai'>('manual');
  const [selectedUser, setSelectedUser] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultDialog, setResultDialog] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [bordereaux, users] = await Promise.all([
        LocalAPI.get('/super-admin/bordereaux/unassigned'),
        LocalAPI.get('/super-admin/gestionnaires')
      ]);

      setAvailableBordereaux(bordereaux.data || []);
      setAvailableUsers(users.data || []);
    } catch (error) {
      console.error('Failed to load assignment data:', error);
      setAvailableBordereaux([]);
      setAvailableUsers([]);
    }
  };

  const handleBordereauSelect = (bordereauId: string) => {
    setSelectedBordereaux(prev => 
      prev.includes(bordereauId) 
        ? prev.filter(id => id !== bordereauId)
        : [...prev, bordereauId]
    );
  };

  const handleSelectAll = () => {
    if (selectedBordereaux.length === availableBordereaux.length) {
      setSelectedBordereaux([]);
    } else {
      setSelectedBordereaux(availableBordereaux.map(b => b.id));
    }
  };

  const executeAssignment = async () => {
    if (selectedBordereaux.length === 0) {
      alert('Veuillez sélectionner au moins un bordereau');
      return;
    }

    setLoading(true);
    try {
      let result;
      
      switch (assignmentType) {
        case 'manual':
          if (!selectedUser) {
            alert('Veuillez sélectionner un gestionnaire');
            return;
          }
          result = await LocalAPI.post('/super-admin/assign/bulk', {
            bordereauIds: selectedBordereaux,
            userId: selectedUser
          });
          break;

        case 'client':
          result = await LocalAPI.post('/super-admin/assign/by-client', {
            bordereauIds: selectedBordereaux
          });
          break;

        case 'type':
          if (!documentType) {
            alert('Veuillez spécifier le type de document');
            return;
          }
          // For type-based assignment, use client-based logic for now
          result = await LocalAPI.post('/super-admin/assign/by-client', {
            bordereauIds: selectedBordereaux
          });
          break;

        case 'ai':
          result = await LocalAPI.post('/super-admin/assign/ai', {
            bordereauIds: selectedBordereaux
          });
          break;
      }

      setAssignmentResult(result.data);
      setResultDialog(true);
      setSelectedBordereaux([]);
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Assignment failed:', error);
      alert('Erreur lors de l\'affectation');
    } finally {
      setLoading(false);
    }
  };

  const renderAssignmentOptions = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" mb={2}>
          Critères d'Affectation
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Type d'affectation</InputLabel>
              <Select
                value={assignmentType}
                onChange={(e) => setAssignmentType(e.target.value as any)}
                label="Type d'affectation"
              >
                <MenuItem value="manual">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Person />
                    Manuel
                  </Box>
                </MenuItem>
                <MenuItem value="client">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Business />
                    Par Client
                  </Box>
                </MenuItem>
                <MenuItem value="type">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Category />
                    Par Type
                  </Box>
                </MenuItem>
                <MenuItem value="ai">
                  <Box display="flex" alignItems="center" gap={1}>
                    <AutoAwesome />
                    IA Optimisée
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {assignmentType === 'manual' && (
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Gestionnaire</InputLabel>
                <Select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  label="Gestionnaire"
                >
                  {availableUsers.map(user => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.fullName} ({user.currentLoad || 0} dossiers)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {assignmentType === 'type' && (
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Type de document"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                placeholder="ex: BS, FACTURE, COURRIER"
              />
            </Grid>
          )}

          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="contained"
              onClick={executeAssignment}
              disabled={loading || selectedBordereaux.length === 0}
              startIcon={loading ? <CircularProgress size={20} /> : <Assignment />}
              sx={{ height: '56px' }}
            >
              {loading ? 'Affectation...' : 'Affecter'}
            </Button>
          </Grid>
        </Grid>

        {assignmentType === 'client' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Affectation automatique basée sur l'historique client et la charge de travail
          </Alert>
        )}

        {assignmentType === 'ai' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Affectation optimisée par IA basée sur les compétences, la charge et la complexité
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderBordereauTable = () => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Bordereaux à Affecter ({availableBordereaux.length})
          </Typography>
          <Box>
            <Chip 
              label={`${selectedBordereaux.length} sélectionnés`} 
              color="primary" 
              sx={{ mr: 1 }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={handleSelectAll}
            >
              {selectedBordereaux.length === availableBordereaux.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedBordereaux.length === availableBordereaux.length && availableBordereaux.length > 0}
                    indeterminate={selectedBordereaux.length > 0 && selectedBordereaux.length < availableBordereaux.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Référence</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Nombre BS</TableCell>
                <TableCell>Date Réception</TableCell>
                <TableCell>Statut</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {availableBordereaux.map((bordereau) => (
                <TableRow key={bordereau.id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedBordereaux.includes(bordereau.id)}
                      onChange={() => handleBordereauSelect(bordereau.id)}
                    />
                  </TableCell>
                  <TableCell>{bordereau.reference}</TableCell>
                  <TableCell>{bordereau.clientName}</TableCell>
                  <TableCell>{bordereau.nombreBS}</TableCell>
                  <TableCell>
                    {new Date(bordereau.dateReception).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell>
                    <Chip label={bordereau.statut} size="small" color="warning" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  return (
    <Box p={3}>
      <Typography variant="h4" mb={3} display="flex" alignItems="center" gap={1}>
        <Assignment />
        Affectation par Critères
      </Typography>

      {renderAssignmentOptions()}
      {renderBordereauTable()}

      {/* Results Dialog */}
      <Dialog open={resultDialog} onClose={() => setResultDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CheckCircle color="success" />
            Résultats de l'Affectation
          </Box>
        </DialogTitle>
        <DialogContent>
          {assignmentResult && (
            <Box>
              <Typography variant="body1" mb={2}>
                <strong>Affectés avec succès:</strong> {assignmentResult.assigned || assignmentResult.results?.filter((r: any) => r.success).length || 0}
              </Typography>
              <Typography variant="body1" mb={2}>
                <strong>Échecs:</strong> {assignmentResult.failed || assignmentResult.results?.filter((r: any) => !r.success).length || 0}
              </Typography>
              
              {assignmentResult.results && (
                <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Bordereau</TableCell>
                        <TableCell>Statut</TableCell>
                        <TableCell>Assigné à</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {assignmentResult.results.slice(0, 10).map((result: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{result.id}</TableCell>
                          <TableCell>
                            <Chip 
                              label={result.success ? 'Succès' : 'Échec'} 
                              color={result.success ? 'success' : 'error'} 
                              size="small" 
                            />
                          </TableCell>
                          <TableCell>{result.assignedTo || result.error || 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResultDialog(false)}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssignmentCriteria;