import React, { useState, useEffect } from 'react';
import { 
  Paper, Typography, Table, TableHead, TableRow, TableCell, 
  TableBody, Chip, Button, Stack, FormControl, InputLabel, 
  Select, MenuItem, TextField, Box
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SendIcon from '@mui/icons-material/Send';
import CancelIcon from '@mui/icons-material/Cancel';

interface OutboxItem {
  id: string;
  reference: string;
  to: string;
  dateSent: string;
  type: string;
  linkedTo: string;
  status: 'SENT' | 'DELIVERED' | 'PENDING_RESPONSE' | 'RESPONDED' | 'FAILED';
  slaStatus: 'green' | 'orange' | 'red';
  priority: 'NORMAL' | 'URGENT' | 'CRITIQUE';
  subject: string;
}

const OutboxTab: React.FC = () => {
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    const loadItems = async () => {
      // Mock data - replace with actual API call when available
      setItems([
        {
          id: '1',
          reference: 'OUT/2025/001',
          to: 'client.a@example.com',
          dateSent: '2025-01-15',
          type: 'REGLEMENT',
          linkedTo: 'BS-123',
          status: 'PENDING_RESPONSE',
          slaStatus: 'green',
          priority: 'NORMAL',
          subject: 'Courrier de règlement - Dossier BS-123'
        },
        {
          id: '2',
          reference: 'OUT/2025/002',
          to: 'client.b@example.com',
          dateSent: '2025-01-14',
          type: 'NOTIFICATION',
          linkedTo: 'CONTRAT-456',
          status: 'DELIVERED',
          slaStatus: 'green',
          priority: 'NORMAL',
          subject: 'Notification de traitement'
        }
      ]);
    };
    loadItems();
  }, [filters]);

  const getStatusChip = (status: string) => {
    const statusConfig = {
      'SENT': { label: 'Envoyé', color: 'info' },
      'DELIVERED': { label: 'Livré', color: 'success' },
      'PENDING_RESPONSE': { label: 'En attente réponse', color: 'warning' },
      'RESPONDED': { label: 'Répondu', color: 'success' },
      'FAILED': { label: 'Échec', color: 'error' }
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Chip label={config.label} color={config.color as any} size="small" />;
  };

  const getSLAChip = (slaStatus: string) => {
    const config = {
      'green': { label: '🟢 À temps', color: 'success' },
      'orange': { label: '🟠 À risque', color: 'warning' },
      'red': { label: '🔴 En retard', color: 'error' }
    };
    const { label, color } = config[slaStatus as keyof typeof config];
    return <Chip label={label} color={color as any} size="small" />;
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

  const handleAction = (action: string, itemId: string) => {
    console.log(`${action} for item ${itemId}`);
    const item = items.find(i => i.id === itemId);
    
    switch (action) {
      case 'view':
        alert(`Voir le détail du courrier ${item?.reference}`);
        break;
      case 'resend':
        if (window.confirm('Êtes-vous sûr de vouloir renvoyer ce courrier ?')) {
          alert(`Courrier ${item?.reference} renvoyé`);
        }
        break;
      case 'cancel':
        if (window.confirm('Êtes-vous sûr de vouloir annuler ce courrier ?')) {
          setItems(prev => prev.map(i => 
            i.id === itemId ? {...i, status: 'FAILED' as any} : i
          ));
        }
        break;
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Boîte d'Envoi ({items.length})
      </Typography>

      {/* Filters */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Statut</InputLabel>
            <Select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              label="Statut"
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="SENT">Envoyé</MenuItem>
              <MenuItem value="DELIVERED">Livré</MenuItem>
              <MenuItem value="PENDING_RESPONSE">En attente réponse</MenuItem>
              <MenuItem value="RESPONDED">Répondu</MenuItem>
              <MenuItem value="FAILED">Échec</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
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

          <TextField
            label="Date début"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
            size="small"
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="Date fin"
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
      </Box>

      {/* Items Table */}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Référence</TableCell>
            <TableCell>À</TableCell>
            <TableCell>Date Envoi</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Lié à</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell>SLA</TableCell>
            <TableCell>Priorité</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.reference}</TableCell>
              <TableCell>{item.to}</TableCell>
              <TableCell>{new Date(item.dateSent).toLocaleDateString()}</TableCell>
              <TableCell>{item.type}</TableCell>
              <TableCell>{item.linkedTo}</TableCell>
              <TableCell>{getStatusChip(item.status)}</TableCell>
              <TableCell>{getSLAChip(item.slaStatus)}</TableCell>
              <TableCell>{getPriorityChip(item.priority)}</TableCell>
              <TableCell>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    startIcon={<VisibilityIcon />}
                    onClick={() => handleAction('view', item.id)}
                  >
                    Voir
                  </Button>
                  {item.status === 'FAILED' && (
                    <Button
                      size="small"
                      startIcon={<SendIcon />}
                      onClick={() => handleAction('resend', item.id)}
                      color="primary"
                    >
                      Renvoyer
                    </Button>
                  )}
                  {['SENT', 'DELIVERED'].includes(item.status) && (
                    <Button
                      size="small"
                      startIcon={<CancelIcon />}
                      onClick={() => handleAction('cancel', item.id)}
                      color="error"
                    >
                      Annuler
                    </Button>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {items.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          <Typography>Aucun courrier envoyé</Typography>
        </Box>
      )}
    </Paper>
  );
};

export default OutboxTab;