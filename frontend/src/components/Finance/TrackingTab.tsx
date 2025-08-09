import React, { useState, useEffect } from 'react';
import { 
  Grid, Paper, Typography, Table, TableHead, TableRow, TableCell, 
  TableBody, Chip, Button, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  Stack, Box
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CommentIcon from '@mui/icons-material/Comment';

interface OVRecord {
  id: string;
  reference: string;
  society: string;
  dateInjected: string;
  dateExecuted?: string;
  status: 'NON_EXECUTE' | 'EN_COURS' | 'PARTIELLEMENT_EXECUTE' | 'REJETE' | 'EXECUTE';
  delay: number;
  observations: string;
  donneurOrdre: string;
  totalAmount: number;
}

const TrackingTab: React.FC = () => {
  const [records, setRecords] = useState<OVRecord[]>([]);
  const [filters, setFilters] = useState({
    society: '',
    status: '',
    donneurOrdre: '',
    dateFrom: '',
    dateTo: ''
  });
  const [editDialog, setEditDialog] = useState<{open: boolean, record: OVRecord | null}>({
    open: false, record: null
  });
  const [editForm, setEditForm] = useState({
    status: '',
    dateExecuted: '',
    observations: ''
  });

  useEffect(() => {
    const loadRecords = async () => {
      try {
        const { getOVTracking } = await import('../../services/financeService');
        const data = await getOVTracking(filters);
        setRecords(data);
      } catch (error) {
        console.error('Failed to load OV tracking:', error);
        // Fallback to mock data
        setRecords([
          {
            id: '1',
            reference: 'OV/2025/001',
            society: 'AON',
            dateInjected: '2025-01-15',
            dateExecuted: '2025-01-16',
            status: 'EXECUTE',
            delay: 1,
            observations: 'Traité normalement',
            donneurOrdre: 'ARS Tunisie',
            totalAmount: 1250.75
          }
        ]);
      }
    };
    loadRecords();
  }, [filters]);

  const getStatusChip = (status: string, delay: number) => {
    const getSLAColor = () => {
      if (delay <= 1) return 'success';
      if (delay <= 2) return 'warning';
      return 'error';
    };

    const statusLabels = {
      'NON_EXECUTE': 'Non Exécuté',
      'EN_COURS': 'En Cours',
      'PARTIELLEMENT_EXECUTE': 'Partiellement Exécuté',
      'REJETE': 'Rejeté',
      'EXECUTE': 'Exécuté'
    };

    const statusColors = {
      'NON_EXECUTE': 'default',
      'EN_COURS': 'info',
      'PARTIELLEMENT_EXECUTE': 'warning',
      'REJETE': 'error',
      'EXECUTE': 'success'
    };

    return (
      <Box>
        <Chip 
          label={statusLabels[status as keyof typeof statusLabels]} 
          color={statusColors[status as keyof typeof statusColors] as any}
          size="small"
          sx={{ mb: 0.5 }}
        />
        <br />
        <Chip 
          label={delay <= 1 ? '🟢 À temps' : delay <= 2 ? '🟠 À risque' : '🔴 En retard'}
          color={getSLAColor() as any}
          size="small"
          variant="outlined"
        />
      </Box>
    );
  };

  const handleEditClick = (record: OVRecord) => {
    setEditForm({
      status: record.status,
      dateExecuted: record.dateExecuted || '',
      observations: record.observations
    });
    setEditDialog({open: true, record});
  };

  const handleSaveEdit = async () => {
    if (!editDialog.record) return;
    
    try {
      const { updateOVStatus } = await import('../../services/financeService');
      await updateOVStatus(editDialog.record.id, {
        ...editForm,
        updatedBy: 'current-user' // Replace with actual user ID
      });
      
      // Update local state
      setRecords(prev => prev.map(r => 
        r.id === editDialog.record?.id 
          ? {...r, status: editForm.status as any, dateExecuted: editForm.dateExecuted, observations: editForm.observations, delay: calculateDelay(r.dateInjected, editForm.dateExecuted)}
          : r
      ));
      
      setEditDialog({open: false, record: null});
    } catch (error) {
      console.error('Failed to update record:', error);
    }
  };

  const calculateDelay = (dateInjected: string, dateExecuted?: string) => {
    const injected = new Date(dateInjected);
    const executed = dateExecuted ? new Date(dateExecuted) : new Date();
    return Math.ceil((executed.getTime() - injected.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <Box>
      {/* Filters */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Filtres</Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <TextField
            label="Société"
            value={filters.society}
            onChange={(e) => setFilters({...filters, society: e.target.value})}
            size="small"
            sx={{ minWidth: 150 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Statut</InputLabel>
            <Select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              label="Statut"
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="NON_EXECUTE">Non Exécuté</MenuItem>
              <MenuItem value="EN_COURS">En Cours</MenuItem>
              <MenuItem value="PARTIELLEMENT_EXECUTE">Partiellement Exécuté</MenuItem>
              <MenuItem value="REJETE">Rejeté</MenuItem>
              <MenuItem value="EXECUTE">Exécuté</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Donneur d'Ordre"
            value={filters.donneurOrdre}
            onChange={(e) => setFilters({...filters, donneurOrdre: e.target.value})}
            size="small"
            sx={{ minWidth: 150 }}
          />

          <TextField
            label="Date Début"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
            size="small"
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="Date Fin"
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
      </Paper>

      {/* Records Table */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Suivi des Ordres de Virement ({records.length})
        </Typography>
        
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Référence OV</TableCell>
              <TableCell>Société</TableCell>
              <TableCell>Date Injection</TableCell>
              <TableCell>Date Exécution</TableCell>
              <TableCell>Statut & SLA</TableCell>
              <TableCell>Délai (jours)</TableCell>
              <TableCell>Montant Total</TableCell>
              <TableCell>Observations</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{record.reference}</TableCell>
                <TableCell>{record.society}</TableCell>
                <TableCell>{new Date(record.dateInjected).toLocaleDateString()}</TableCell>
                <TableCell>
                  {record.dateExecuted ? new Date(record.dateExecuted).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>{getStatusChip(record.status, record.delay)}</TableCell>
                <TableCell>{record.delay}</TableCell>
                <TableCell>{record.totalAmount.toFixed(2)} €</TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                    {record.observations || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleEditClick(record)}
                  >
                    Modifier
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({open: false, record: null})} maxWidth="sm" fullWidth>
        <DialogTitle>Modifier le Statut - {editDialog.record?.reference}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Statut</InputLabel>
              <Select
                value={editForm.status}
                onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                label="Statut"
              >
                <MenuItem value="NON_EXECUTE">Non Exécuté</MenuItem>
                <MenuItem value="EN_COURS">En Cours</MenuItem>
                <MenuItem value="PARTIELLEMENT_EXECUTE">Partiellement Exécuté</MenuItem>
                <MenuItem value="REJETE">Rejeté</MenuItem>
                <MenuItem value="EXECUTE">Exécuté</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Date d'Exécution"
              type="date"
              value={editForm.dateExecuted}
              onChange={(e) => setEditForm({...editForm, dateExecuted: e.target.value})}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <TextField
              label="Observations"
              multiline
              rows={3}
              value={editForm.observations}
              onChange={(e) => setEditForm({...editForm, observations: e.target.value})}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({open: false, record: null})}>
            Annuler
          </Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TrackingTab;