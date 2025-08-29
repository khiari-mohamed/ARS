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
  status: 'SENT' | 'PENDING_RESPONSE' | 'RESPONDED' | 'FAILED';
  slaStatus: 'green' | 'orange' | 'red';
  priority: 'NORMAL' | 'URGENT' | 'CRITIQUE';
  subject: string;
  body?: string;
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
      try {
        const token = localStorage.getItem('token');
        const queryParams = new URLSearchParams();
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.priority) queryParams.append('priority', filters.priority);
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
          // Filter for sent courriers only
          const sentCourriers = courriers.filter((c: any) => ['SENT', 'PENDING_RESPONSE', 'RESPONDED', 'FAILED'].includes(c.status));
          
          const mappedItems = sentCourriers.map((courrier: any) => ({
            id: courrier.id,
            reference: `OUT/${new Date(courrier.createdAt).getFullYear()}/${courrier.id.substring(0, 3)}`,
            to: 'client@example.com', // Would come from courrier data in real implementation
            dateSent: courrier.sentAt || courrier.createdAt,
            type: courrier.type,
            linkedTo: courrier.bordereauId || 'N/A',
            status: courrier.status,
            slaStatus: getSLAStatusFromDate(courrier.sentAt || courrier.createdAt),
            priority: 'NORMAL',
            subject: courrier.subject,
            body: courrier.body
          }));
          setItems(mappedItems);
        }
      } catch (error) {
        console.error('Failed to load outbox items:', error);
      }
    };
    loadItems();
  }, [filters]);
  
  const getSLAStatusFromDate = (dateStr: string): 'green' | 'orange' | 'red' => {
    const date = new Date(dateStr);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 2) return 'green';
    if (daysDiff <= 5) return 'orange';
    return 'red';
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      'SENT': { label: 'Envoyé', color: 'info' },
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

  const handleAction = async (action: string, itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    switch (action) {
      case 'view':
        alert(`Détail du courrier:\n\nSujet: ${item.subject}\nDestinataire: ${item.to}\nDate: ${new Date(item.dateSent).toLocaleString()}\nStatut: ${item.status}\n\nContenu:\n${item.body || 'Contenu non disponible'}`);
        break;
        
      case 'resend':
        if (window.confirm('Êtes-vous sûr de vouloir renvoyer ce courrier ?')) {
          try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/courriers/${itemId}/send`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ recipientEmail: item.to })
            });
            
            if (response.ok) {
              setItems(prev => prev.map(i => 
                i.id === itemId ? {...i, status: 'SENT' as const} : i
              ));
              alert('Courrier renvoyé avec succès');
            } else {
              alert('Erreur lors du renvoi');
            }
          } catch (error) {
            console.error('Failed to resend:', error);
            alert('Erreur lors du renvoi');
          }
        }
        break;
        
      case 'cancel':
        if (window.confirm('Êtes-vous sûr de vouloir annuler ce courrier ?')) {
          try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/courriers/${itemId}/status`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ status: 'FAILED' })
            });
            
            if (response.ok) {
              setItems(prev => prev.map(i => 
                i.id === itemId ? {...i, status: 'FAILED' as const} : i
              ));
              alert('Courrier annulé');
            } else {
              alert('Erreur lors de l\'annulation');
            }
          } catch (error) {
            console.error('Failed to cancel:', error);
            alert('Erreur lors de l\'annulation');
          }
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
                  {['SENT'].includes(item.status) && (
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