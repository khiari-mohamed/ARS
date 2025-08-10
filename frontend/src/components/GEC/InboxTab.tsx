import React, { useState, useEffect } from 'react';
import { 
  Paper, Typography, Table, TableHead, TableRow, TableCell, 
  TableBody, Chip, Button, Stack, FormControl, InputLabel, 
  Select, MenuItem, TextField, Box
} from '@mui/material';
import ReplyIcon from '@mui/icons-material/Reply';
import ForwardIcon from '@mui/icons-material/Forward';
import LinkIcon from '@mui/icons-material/Link';
import VisibilityIcon from '@mui/icons-material/Visibility';

interface InboxItem {
  id: string;
  reference: string;
  from: string;
  dateReceived: string;
  type: string;
  linkedTo: string;
  status: 'PENDING_RESPONSE' | 'RESPONDED' | 'CLOSED';
  slaStatus: 'green' | 'orange' | 'red';
  priority: 'NORMAL' | 'URGENT' | 'CRITIQUE';
  subject: string;
}

const InboxTab: React.FC = () => {
  const [items, setItems] = useState<InboxItem[]>([]);
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
          reference: 'IN/2025/001',
          from: 'client.a@example.com',
          dateReceived: '2025-01-15',
          type: 'RECLAMATION',
          linkedTo: 'CONTRAT-123',
          status: 'PENDING_RESPONSE',
          slaStatus: 'orange',
          priority: 'URGENT',
          subject: 'Réclamation sur le traitement du dossier'
        },
        {
          id: '2',
          reference: 'IN/2025/002',
          from: 'client.b@example.com',
          dateReceived: '2025-01-14',
          type: 'DEMANDE_INFO',
          linkedTo: 'BS-456',
          status: 'RESPONDED',
          slaStatus: 'green',
          priority: 'NORMAL',
          subject: 'Demande d\'information sur remboursement'
        }
      ]);
    };
    loadItems();
  }, [filters]);

  const getStatusChip = (status: string) => {
    const statusConfig = {
      'PENDING_RESPONSE': { label: 'En attente', color: 'warning' },
      'RESPONDED': { label: 'Répondu', color: 'success' },
      'CLOSED': { label: 'Clôturé', color: 'default' }
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
    // Implement actual actions
    switch (action) {
      case 'reply':
        alert(`Répondre au courrier ${itemId}`);
        break;
      case 'forward':
        alert(`Transférer le courrier ${itemId}`);
        break;
      case 'link':
        alert(`Lier le courrier ${itemId} à une réclamation`);
        break;
      case 'view':
        alert(`Voir le détail du courrier ${itemId}`);
        break;
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Boîte de Réception ({items.length})
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
              <MenuItem value="PENDING_RESPONSE">En attente</MenuItem>
              <MenuItem value="RESPONDED">Répondu</MenuItem>
              <MenuItem value="CLOSED">Clôturé</MenuItem>
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
            <TableCell>De</TableCell>
            <TableCell>Date Reçu</TableCell>
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
              <TableCell>{item.from}</TableCell>
              <TableCell>{new Date(item.dateReceived).toLocaleDateString()}</TableCell>
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
                  <Button
                    size="small"
                    startIcon={<ReplyIcon />}
                    onClick={() => handleAction('reply', item.id)}
                    disabled={item.status === 'CLOSED'}
                  >
                    Répondre
                  </Button>
                  <Button
                    size="small"
                    startIcon={<ForwardIcon />}
                    onClick={() => handleAction('forward', item.id)}
                  >
                    Transférer
                  </Button>
                  <Button
                    size="small"
                    startIcon={<LinkIcon />}
                    onClick={() => handleAction('link', item.id)}
                  >
                    Lier
                  </Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {items.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          <Typography>Aucun courrier en réception</Typography>
        </Box>
      )}
    </Paper>
  );
};

export default InboxTab;