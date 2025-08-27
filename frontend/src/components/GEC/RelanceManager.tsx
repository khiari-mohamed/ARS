import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Send as SendIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';

interface RelanceItem {
  id: string;
  subject: string;
  type: string;
  sentAt: string;
  daysOverdue: number;
  uploader: string;
  client: string;
  status: string;
  bordereauId?: string;
}

interface RelanceStats {
  totalOverdue: number;
  relancesSent: number;
  escalationsSent: number;
  lastRun: string;
}

const RelanceManager: React.FC = () => {
  const [relanceItems, setRelanceItems] = useState<RelanceItem[]>([]);
  const [stats, setStats] = useState<RelanceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedBordereau, setSelectedBordereau] = useState('');
  const [relanceType, setRelanceType] = useState<'CLIENT' | 'PRESTATAIRE'>('CLIENT');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadRelanceData = async () => {
    setLoading(true);
    try {
      // Load SLA breaches (overdue items)
      const response = await fetch('/api/courriers/sla-breaches');
      const breaches = await response.json();
      
      if (response.ok) {
        setRelanceItems(breaches);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load relance data' });
    } finally {
      setLoading(false);
    }
  };

  const triggerAutomaticRelances = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/courriers/trigger-relances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setStats({
          totalOverdue: result.overdue,
          relancesSent: result.relancesSent,
          escalationsSent: result.escalationsSent,
          lastRun: new Date().toISOString()
        });
        setMessage({ 
          type: 'success', 
          text: `Relances automatiques exécutées: ${result.relancesSent} relances, ${result.escalationsSent} escalations` 
        });
        loadRelanceData();
      } else {
        setMessage({ type: 'error', text: 'Failed to trigger relances' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to trigger relances' });
    } finally {
      setLoading(false);
    }
  };

  const createManualRelance = async () => {
    if (!selectedBordereau) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/courriers/bordereau/${selectedBordereau}/relance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: relanceType })
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Relance créée et envoyée avec succès' });
        setCreateDialogOpen(false);
        setSelectedBordereau('');
        loadRelanceData();
      } else {
        setMessage({ type: 'error', text: 'Failed to create relance' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create relance' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRelanceData();
  }, []);

  const getPriorityChip = (daysOverdue: number) => {
    if (daysOverdue > 7) {
      return <Chip label="🔴 Critique" color="error" size="small" />;
    } else if (daysOverdue > 3) {
      return <Chip label="🟠 Urgent" color="warning" size="small" />;
    } else {
      return <Chip label="🟡 Attention" color="info" size="small" />;
    }
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      'SENT': { label: 'Envoyé', color: 'info' },
      'PENDING_RESPONSE': { label: 'En attente', color: 'warning' },
      'RESPONDED': { label: 'Répondu', color: 'success' },
      'FAILED': { label: 'Échec', color: 'error' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, color: 'default' };
    return <Chip label={config.label} color={config.color as any} size="small" />;
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" display="flex" alignItems="center">
          <ScheduleIcon sx={{ mr: 1 }} />
          Gestion des Relances
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Créer Relance
          </Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={triggerAutomaticRelances}
            disabled={loading}
          >
            Déclencher Relances Auto
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadRelanceData}
            disabled={loading}
          >
            Actualiser
          </Button>
        </Box>
      </Box>

      {message && (
        <Alert 
          severity={message.type} 
          sx={{ mb: 3 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Éléments en retard
                </Typography>
                <Typography variant="h4" component="div" color="error.main">
                  {stats.totalOverdue}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Relances envoyées
                </Typography>
                <Typography variant="h4" component="div" color="warning.main">
                  {stats.relancesSent}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Escalations
                </Typography>
                <Typography variant="h4" component="div" color="info.main">
                  {stats.escalationsSent}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Dernière exécution
                </Typography>
                <Typography variant="body1" component="div">
                  {new Date(stats.lastRun).toLocaleString('fr-FR')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Éléments nécessitant une relance ({relanceItems.length})
        </Typography>

        {relanceItems.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" color="success.main">
              Aucune relance nécessaire
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tous les courriers sont dans les délais SLA
            </Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Sujet</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Gestionnaire</TableCell>
                <TableCell>Envoyé le</TableCell>
                <TableCell>Retard</TableCell>
                <TableCell>Priorité</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {relanceItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>
                      {item.subject}
                    </Typography>
                  </TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{item.client}</TableCell>
                  <TableCell>{item.uploader}</TableCell>
                  <TableCell>
                    {new Date(item.sentAt).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell>
                    <Typography color="error" sx={{ fontWeight: 600 }}>
                      {item.daysOverdue} jour(s)
                    </Typography>
                  </TableCell>
                  <TableCell>{getPriorityChip(item.daysOverdue)}</TableCell>
                  <TableCell>{getStatusChip(item.status)}</TableCell>
                  <TableCell>
                    <Tooltip title="Voir détails">
                      <IconButton size="small">
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Create Manual Relance Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Créer une Relance Manuelle</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="ID Bordereau"
              value={selectedBordereau}
              onChange={(e) => setSelectedBordereau(e.target.value)}
              placeholder="Entrez l'ID du bordereau"
              sx={{ mb: 3 }}
            />
            
            <FormControl fullWidth>
              <InputLabel>Type de relance</InputLabel>
              <Select
                value={relanceType}
                label="Type de relance"
                onChange={(e) => setRelanceType(e.target.value as 'CLIENT' | 'PRESTATAIRE')}
              >
                <MenuItem value="CLIENT">Client</MenuItem>
                <MenuItem value="PRESTATAIRE">Prestataire</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
          <Button 
            variant="contained" 
            onClick={createManualRelance}
            disabled={!selectedBordereau || loading}
          >
            Créer et Envoyer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RelanceManager;