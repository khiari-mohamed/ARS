import React, { useState, useEffect } from 'react';
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
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  Divider
} from '@mui/material';
import { LocalAPI } from '../../services/axios';

interface Props {
  open: boolean;
  onClose: () => void;
  reclamations: any[];
  onAssignmentComplete: () => void;
}

const BulkAssignmentModal: React.FC<Props> = ({ open, onClose, reclamations, onAssignmentComplete }) => {
  const [selectedReclamations, setSelectedReclamations] = useState<string[]>([]);
  const [gestionnaires, setGestionnaires] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchGestionnaires();
      setSelectedReclamations([]);
      setAssignments({});
    }
  }, [open]);

  const fetchGestionnaires = async () => {
    try {
      const { data } = await LocalAPI.get('/users', {
        params: { role: 'GESTIONNAIRE' }
      });
      setGestionnaires(data.filter((u: any) => u.active));
    } catch (error) {
      console.error('Error fetching gestionnaires:', error);
    }
  };

  const handleReclamationToggle = (reclamationId: string) => {
    setSelectedReclamations(prev => 
      prev.includes(reclamationId)
        ? prev.filter(id => id !== reclamationId)
        : [...prev, reclamationId]
    );
  };

  const handleAssignmentChange = (reclamationId: string, assignedToId: string) => {
    setAssignments(prev => ({
      ...prev,
      [reclamationId]: assignedToId
    }));
  };

  const handleSelectAll = () => {
    if (selectedReclamations.length === reclamations.length) {
      setSelectedReclamations([]);
    } else {
      setSelectedReclamations(reclamations.map(r => r.id));
    }
  };

  const handleBulkAssign = async () => {
    setLoading(true);
    try {
      const assignmentData = selectedReclamations.map(reclamationId => ({
        reclamationId,
        assignedToId: assignments[reclamationId]
      })).filter(a => a.assignedToId);

      await LocalAPI.post('/reclamations/bulk-assign-gestionnaires', {
        reclamationIds: selectedReclamations,
        assignments: assignmentData
      });

      onAssignmentComplete();
      onClose();
    } catch (error) {
      console.error('Error in bulk assignment:', error);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = selectedReclamations.length > 0 && 
    selectedReclamations.every(id => assignments[id]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Affectation en Lot des Réclamations
        <Typography variant="body2" color="text.secondary">
          Sélectionnez les réclamations et assignez-les aux gestionnaires
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedReclamations.length === reclamations.length}
                indeterminate={selectedReclamations.length > 0 && selectedReclamations.length < reclamations.length}
                onChange={handleSelectAll}
              />
            }
            label={`Sélectionner tout (${selectedReclamations.length}/${reclamations.length})`}
          />
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        <List sx={{ maxHeight: 400, overflow: 'auto' }}>
          {reclamations.map((reclamation) => (
            <ListItem key={reclamation.id} divider>
              <ListItemIcon>
                <Checkbox
                  checked={selectedReclamations.includes(reclamation.id)}
                  onChange={() => handleReclamationToggle(reclamation.id)}
                />
              </ListItemIcon>
              
              <ListItemText
                primary={`${reclamation.type} - ${reclamation.client?.name || 'Client inconnu'}`}
                secondary={reclamation.description?.substring(0, 100) + '...'}
                sx={{ flex: 1 }}
              />
              
              {selectedReclamations.includes(reclamation.id) && (
                <FormControl sx={{ minWidth: 200, ml: 2 }}>
                  <InputLabel>Assigner à</InputLabel>
                  <Select
                    value={assignments[reclamation.id] || ''}
                    onChange={(e) => handleAssignmentChange(reclamation.id, e.target.value)}
                    label="Assigner à"
                    size="small"
                  >
                    {gestionnaires.map((gestionnaire) => (
                      <MenuItem key={gestionnaire.id} value={gestionnaire.id}>
                        {gestionnaire.fullName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </ListItem>
          ))}
        </List>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button 
          onClick={handleBulkAssign} 
          variant="contained" 
          disabled={!canSubmit || loading}
        >
          {loading ? 'Affectation...' : `Affecter ${selectedReclamations.length} réclamation(s)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkAssignmentModal;