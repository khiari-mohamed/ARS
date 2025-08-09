import React, { useState } from 'react';
import { Contract } from '../../types/contract.d';
import { 
  Paper, Typography, Grid, Card, CardContent, IconButton, TextField,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, Chip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningIcon from '@mui/icons-material/Warning';
import { ContractService } from '../../api/ContractService';

interface Props {
  contract: Contract;
  onUpdate: () => void;
}

const ContractSLASection: React.FC<Props> = ({ contract, onUpdate }) => {
  const [editDialog, setEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    delaiReglement: contract.delaiReglement,
    delaiReclamation: contract.delaiReclamation,
    escalationThreshold: contract.escalationThreshold || 0
  });

  const handleSave = async () => {
    try {
      await ContractService.update(contract.id, editForm);
      setEditDialog(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to update SLA parameters:', error);
    }
  };

  const getSLAStatus = (current: number, threshold?: number) => {
    if (!threshold) return { label: 'N/A', color: 'default' };
    if (current <= threshold * 0.8) return { label: 'Optimal', color: 'success' };
    if (current <= threshold) return { label: 'Acceptable', color: 'warning' };
    return { label: 'Critique', color: 'error' };
  };

  const slaCards = [
    {
      title: 'Délai de Traitement',
      value: `${contract.delaiReglement} jours`,
      icon: <AccessTimeIcon />,
      status: getSLAStatus(contract.delaiReglement, contract.escalationThreshold),
      description: 'Temps maximum pour traiter un dossier'
    },
    {
      title: 'Délai de Règlement',
      value: `${contract.delaiReclamation} jours`,
      icon: <AccessTimeIcon />,
      status: getSLAStatus(contract.delaiReclamation, contract.escalationThreshold),
      description: 'Temps maximum pour effectuer un paiement'
    },
    {
      title: 'Seuil d\'Escalade',
      value: contract.escalationThreshold ? `${contract.escalationThreshold} jours` : 'Non défini',
      icon: <WarningIcon />,
      status: { label: 'Configuré', color: contract.escalationThreshold ? 'success' : 'warning' },
      description: 'Seuil de déclenchement des alertes'
    }
  ];

  return (
    <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
      <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Paramètres SLA
        </Typography>
        <IconButton onClick={() => setEditDialog(true)} size="small">
          <EditIcon />
        </IconButton>
      </Grid>
      
      <Grid container spacing={3}>
        {slaCards.map((card, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Card elevation={2} sx={{ height: '100%' }}>
              <CardContent>
                <Grid container alignItems="center" spacing={2}>
                  <Grid item>
                    {card.icon}
                  </Grid>
                  <Grid item xs>
                    <Typography variant="subtitle2" color="textSecondary">
                      {card.title}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {card.value}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {card.description}
                    </Typography>
                  </Grid>
                  <Grid item>
                    <Chip 
                      label={card.status.label} 
                      color={card.status.color as any}
                      size="small"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Modifier les Paramètres SLA</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Délai de Règlement (jours)"
                type="number"
                value={editForm.delaiReglement}
                onChange={(e) => setEditForm({...editForm, delaiReglement: Number(e.target.value)})}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Délai de Réclamation (jours)"
                type="number"
                value={editForm.delaiReclamation}
                onChange={(e) => setEditForm({...editForm, delaiReclamation: Number(e.target.value)})}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Seuil d'Escalade (jours)"
                type="number"
                value={editForm.escalationThreshold}
                onChange={(e) => setEditForm({...editForm, escalationThreshold: Number(e.target.value)})}
                fullWidth
                helperText="Déclenche une alerte si ce seuil est dépassé"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Annuler</Button>
          <Button onClick={handleSave} variant="contained">Sauvegarder</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ContractSLASection;