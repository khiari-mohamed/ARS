import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Typography,
  Alert
} from '@mui/material';
import { User, UserRole } from '../../types/user.d';

interface Props {
  selectedUsers: User[];
  onBulkAction: (action: string, data?: any) => Promise<void>;
  onClearSelection: () => void;
  currentUserRole: UserRole;
}

const BulkUserActions: React.FC<Props> = ({ 
  selectedUsers, 
  onBulkAction, 
  onClearSelection,
  currentUserRole 
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState('');
  const [bulkData, setBulkData] = useState<any>({});

  const canPerformBulkActions = currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'ADMINISTRATEUR';

  if (!canPerformBulkActions || selectedUsers.length === 0) {
    return null;
  }

  const handleBulkAction = async () => {
    await onBulkAction(actionType, bulkData);
    setDialogOpen(false);
    onClearSelection();
  };

  const openDialog = (action: string) => {
    setActionType(action);
    setDialogOpen(true);
  };

  return (
    <>
      <Box sx={{ 
        position: 'fixed', 
        bottom: 20, 
        right: 20, 
        bgcolor: 'primary.main', 
        color: 'white',
        p: 2,
        borderRadius: 2,
        boxShadow: 3,
        zIndex: 1000
      }}>
        <Typography variant="body2" gutterBottom>
          {selectedUsers.length} utilisateur(s) sélectionné(s)
        </Typography>
        
        <Box display="flex" gap={1} flexWrap="wrap">
          <Button 
            size="small" 
            variant="contained" 
            color="secondary"
            onClick={() => openDialog('deactivate')}
          >
            Désactiver
          </Button>
          
          <Button 
            size="small" 
            variant="contained" 
            color="secondary"
            onClick={() => openDialog('changeDepartment')}
          >
            Changer Dept.
          </Button>
          
          <Button 
            size="small" 
            variant="contained" 
            color="secondary"
            onClick={() => openDialog('export')}
          >
            Exporter
          </Button>
          
          <Button 
            size="small" 
            variant="outlined" 
            sx={{ color: 'white', borderColor: 'white' }}
            onClick={onClearSelection}
          >
            Annuler
          </Button>
        </Box>
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Action groupée - {selectedUsers.length} utilisateur(s)
        </DialogTitle>
        
        <DialogContent>
          {actionType === 'deactivate' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Êtes-vous sûr de vouloir désactiver ces {selectedUsers.length} utilisateurs ?
            </Alert>
          )}
          
          {actionType === 'changeDepartment' && (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Nouveau département</InputLabel>
              <Select
                value={bulkData.department || ''}
                onChange={(e) => setBulkData({ ...bulkData, department: e.target.value })}
              >
                <MenuItem value="Traitement">Traitement</MenuItem>
                <MenuItem value="Finance">Finance</MenuItem>
                <MenuItem value="Service Client">Service Client</MenuItem>
                <MenuItem value="Scan">Scan</MenuItem>
                <MenuItem value="Bureau d'Ordre">Bureau d'Ordre</MenuItem>
              </Select>
            </FormControl>
          )}
          
          {actionType === 'export' && (
            <Box>
              <Typography gutterBottom>Options d'export :</Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={bulkData.includePerformance || false}
                    onChange={(e) => setBulkData({ ...bulkData, includePerformance: e.target.checked })}
                  />
                }
                label="Inclure les statistiques de performance"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={bulkData.includeAuditLogs || false}
                    onChange={(e) => setBulkData({ ...bulkData, includeAuditLogs: e.target.checked })}
                  />
                }
                label="Inclure l'historique des actions"
              />
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleBulkAction} variant="contained">
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BulkUserActions;