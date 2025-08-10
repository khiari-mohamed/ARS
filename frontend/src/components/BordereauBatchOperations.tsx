import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  LinearProgress,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  Assignment,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Person,
  Update,
  Archive
} from '@mui/icons-material';
import { fetchUsers, bulkUpdateBordereaux, bulkAssignBordereaux } from '../services/bordereauxService';

interface Props {
  open: boolean;
  onClose: () => void;
  selectedBordereaux: string[];
  onSuccess: () => void;
}

const operations = [
  { 
    id: 'assign', 
    label: 'Affecter en lot', 
    icon: <Person />, 
    description: 'Assigner les bordereaux sélectionnés à un gestionnaire'
  },
  { 
    id: 'status', 
    label: 'Changer le statut', 
    icon: <Update />, 
    description: 'Modifier le statut de tous les bordereaux sélectionnés'
  },
  { 
    id: 'archive', 
    label: 'Archiver', 
    icon: <Archive />, 
    description: 'Archiver les bordereaux sélectionnés'
  }
];

const statusOptions = [
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'SCAN_EN_COURS', label: 'Scan en cours' },
  { value: 'SCAN_TERMINE', label: 'Scan terminé' },
  { value: 'ASSIGNE', label: 'Assigné' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'TRAITE', label: 'Traité' },
  { value: 'CLOTURE', label: 'Clôturé' },
  { value: 'EN_DIFFICULTE', label: 'En difficulté' }
];

const BordereauBatchOperations: React.FC<Props> = ({ 
  open, 
  onClose, 
  selectedBordereaux, 
  onSuccess 
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedOperation, setSelectedOperation] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const steps = ['Sélectionner l\'opération', 'Configurer', 'Confirmer', 'Résultats'];

  React.useEffect(() => {
    if (open) {
      loadUsers();
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setActiveStep(0);
    setSelectedOperation('');
    setAssigneeId('');
    setNewStatus('');
    setResults(null);
    setError(null);
  };

  const loadUsers = async () => {
    try {
      const data = await fetchUsers({ role: 'GESTIONNAIRE' });
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleNext = () => {
    if (activeStep === 0 && !selectedOperation) {
      setError('Veuillez sélectionner une opération');
      return;
    }
    
    if (activeStep === 1) {
      if (selectedOperation === 'assign' && !assigneeId) {
        setError('Veuillez sélectionner un gestionnaire');
        return;
      }
      if (selectedOperation === 'status' && !newStatus) {
        setError('Veuillez sélectionner un nouveau statut');
        return;
      }
    }
    
    setError(null);
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
    setError(null);
  };

  const executeOperation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let result;
      
      switch (selectedOperation) {
        case 'assign':
          result = await bulkAssignBordereaux(selectedBordereaux, assigneeId);
          break;
        case 'status':
          result = await bulkUpdateBordereaux(selectedBordereaux, { statut: newStatus });
          break;
        case 'archive':
          result = await bulkUpdateBordereaux(selectedBordereaux, { archived: true });
          break;
        default:
          throw new Error('Opération non supportée');
      }
      
      setResults(result);
      setActiveStep(3);
      
      if (result.successCount > 0) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (error: any) {
      setError(error.message || 'Erreur lors de l\'exécution de l\'opération');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Sélectionner l'opération à effectuer
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {selectedBordereaux.length} bordereau(x) sélectionné(s)
            </Typography>
            
            <List>
              {operations.map((operation) => (
                <ListItem
                  key={operation.id}
                  button
                  selected={selectedOperation === operation.id}
                  onClick={() => setSelectedOperation(operation.id)}
                  sx={{ 
                    border: 1, 
                    borderColor: selectedOperation === operation.id ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    mb: 1
                  }}
                >
                  <ListItemIcon>{operation.icon}</ListItemIcon>
                  <ListItemText
                    primary={operation.label}
                    secondary={operation.description}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Configuration de l'opération
            </Typography>
            
            {selectedOperation === 'assign' && (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Gestionnaire</InputLabel>
                <Select
                  value={assigneeId}
                  label="Gestionnaire"
                  onChange={(e) => setAssigneeId(e.target.value)}
                >
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.fullName} ({user.email})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            {selectedOperation === 'status' && (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Nouveau statut</InputLabel>
                <Select
                  value={newStatus}
                  label="Nouveau statut"
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  {statusOptions.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            {selectedOperation === 'archive' && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Les bordereaux archivés seront déplacés vers la corbeille et ne seront plus visibles dans la liste principale.
              </Alert>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Confirmer l'opération
            </Typography>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              Vous êtes sur le point d'effectuer l'opération suivante :
            </Alert>
            
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {operations.find(op => op.id === selectedOperation)?.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sur {selectedBordereaux.length} bordereau(x)
              </Typography>
              
              {selectedOperation === 'assign' && assigneeId && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Gestionnaire : {users.find(u => u.id === assigneeId)?.fullName}
                </Typography>
              )}
              
              {selectedOperation === 'status' && newStatus && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Nouveau statut : {statusOptions.find(s => s.value === newStatus)?.label}
                </Typography>
              )}
            </Box>
            
            <Alert severity="warning" sx={{ mt: 2 }}>
              Cette action ne peut pas être annulée. Êtes-vous sûr de vouloir continuer ?
            </Alert>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Résultats de l'opération
            </Typography>
            
            {results && (
              <Box>
                <Box display="flex" gap={2} mb={2}>
                  <Chip
                    icon={<CheckCircle />}
                    label={`${results.successCount} Réussis`}
                    color="success"
                  />
                  <Chip
                    icon={<ErrorIcon />}
                    label={`${results.errorCount} Échecs`}
                    color="error"
                  />
                </Box>
                
                {results.errors && results.errors.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Erreurs :
                    </Typography>
                    <List dense>
                      {results.errors.slice(0, 5).map((error: any, index: number) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <Warning color="error" />
                          </ListItemIcon>
                          <ListItemText
                            primary={error.bordereauId}
                            secondary={error.message}
                          />
                        </ListItem>
                      ))}
                    </List>
                    {results.errors.length > 5 && (
                      <Typography variant="caption" color="text.secondary">
                        ... et {results.errors.length - 5} autres erreurs
                      </Typography>
                    )}
                  </Box>
                )}
                
                {results.successCount > 0 && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    L'opération a été effectuée avec succès sur {results.successCount} bordereau(x).
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Opérations en lot
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {renderStepContent()}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          {activeStep === 3 ? 'Fermer' : 'Annuler'}
        </Button>
        
        {activeStep > 0 && activeStep < 3 && (
          <Button onClick={handleBack}>
            Précédent
          </Button>
        )}
        
        {activeStep < 2 && (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={loading}
          >
            Suivant
          </Button>
        )}
        
        {activeStep === 2 && (
          <Button
            variant="contained"
            onClick={executeOperation}
            disabled={loading}
            color="primary"
          >
            {loading ? 'Exécution...' : 'Exécuter'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BordereauBatchOperations;