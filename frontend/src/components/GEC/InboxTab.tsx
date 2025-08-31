import React, { useState, useEffect } from 'react';
import { 
  Paper, Typography, Table, TableHead, TableRow, TableCell, 
  TableBody, Chip, Button, Stack, FormControl, InputLabel, 
  Select, MenuItem, TextField, Box, Dialog, DialogTitle, 
  DialogContent, DialogActions, Divider
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
  status: 'PENDING_RESPONSE' | 'RESPONDED' | 'CLOSED' | 'DRAFT' | 'SENT' | 'FAILED';
  slaStatus: 'green' | 'orange' | 'red';
  priority: 'NORMAL' | 'URGENT' | 'CRITIQUE';
  subject: string;
  body?: string;
}

const InboxTab: React.FC = () => {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    dateFrom: '',
    dateTo: ''
  });
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'view' | 'reply' | 'link' | 'forward'>('view');
  const [replyText, setReplyText] = useState('');
  const [linkReference, setLinkReference] = useState('');
  const [forwardEmail, setForwardEmail] = useState('');
  const [forwardMessage, setForwardMessage] = useState('');

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
          let filteredCourriers = courriers;
          
          // Apply client-side filters
          if (filters.status) {
            filteredCourriers = filteredCourriers.filter((c: any) => c.status === filters.status);
          }
          
          const mappedItems = filteredCourriers.map((courrier: any) => ({
            id: courrier.id,
            reference: `IN/${new Date(courrier.createdAt).getFullYear()}/${courrier.id.substring(0, 3)}`,
            from: courrier.uploader?.email || 'system@ars.com',
            dateReceived: courrier.createdAt,
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
        console.error('Failed to load inbox items:', error);
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
      'PENDING_RESPONSE': { label: 'En attente', color: 'warning' },
      'RESPONDED': { label: 'Répondu', color: 'success' },
      'CLOSED': { label: 'Clôturé', color: 'default' },
      'DRAFT': { label: 'Brouillon', color: 'info' },
      'SENT': { label: 'Envoyé', color: 'primary' },
      'FAILED': { label: 'Échec', color: 'error' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, color: 'default' };
    return <Chip label={config.label} color={config.color as any} size="small" />;
  };

  const getSLAChip = (slaStatus: string) => {
    const config = {
      'green': { label: '🟢 À temps', color: 'success' },
      'orange': { label: '🟠 À risque', color: 'warning' },
      'red': { label: '🔴 En retard', color: 'error' }
    };
    const { label, color } = config[slaStatus as keyof typeof config] || { label: '⚪ Inconnu', color: 'default' };
    return <Chip label={label} color={color as any} size="small" />;
  };

  const getPriorityChip = (priority: string) => {
    const config = {
      'NORMAL': { label: 'Normal', color: 'default' },
      'URGENT': { label: 'Urgent', color: 'warning' },
      'CRITIQUE': { label: 'Critique', color: 'error' }
    };
    const { label, color } = config[priority as keyof typeof config] || { label: 'Normal', color: 'default' };
    return <Chip label={label} color={color as any} size="small" />;
  };

  const handleAction = (action: string, itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    setSelectedItem(item);
    setDialogType(action as 'view' | 'reply' | 'link' | 'forward');
    setDialogOpen(true);
    
    if (action === 'reply') {
      setReplyText('');
    } else if (action === 'link') {
      setLinkReference('');
    } else if (action === 'forward') {
      setForwardEmail('');
      setForwardMessage(`Transfert: ${item.subject}\n\n${item.body || ''}`);
    }
  };
  
  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedItem(null);
    setReplyText('');
    setLinkReference('');
    setForwardEmail('');
    setForwardMessage('');
  };
  
  const handleReply = async () => {
    if (!selectedItem || !replyText.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/courriers/${selectedItem.id}/respond`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ response: replyText })
      });
      
      if (response.ok) {
        // Update item status
        setItems(items.map(item => 
          item.id === selectedItem.id 
            ? { ...item, status: 'RESPONDED' as const }
            : item
        ));
        alert('Réponse envoyée avec succès');
        handleDialogClose();
      } else {
        alert('Erreur lors de l\'envoi de la réponse');
      }
    } catch (error) {
      console.error('Failed to send reply:', error);
      alert('Erreur lors de l\'envoi de la réponse');
    }
  };
  
  const handleLink = async () => {
    if (!selectedItem || !linkReference.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/courriers/${selectedItem.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bordereauId: linkReference })
      });
      
      if (response.ok) {
        setItems(items.map(item => 
          item.id === selectedItem.id 
            ? { ...item, linkedTo: linkReference }
            : item
        ));
        alert(`Courrier lié à ${linkReference}`);
        handleDialogClose();
      } else {
        alert('Erreur lors de la liaison');
      }
    } catch (error) {
      console.error('Failed to link courrier:', error);
      alert('Erreur lors de la liaison');
    }
  };
  
  const handleForward = async () => {
    if (!selectedItem || !forwardEmail.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/courriers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject: `Fwd: ${selectedItem.subject}`,
          body: forwardMessage,
          type: 'AUTRE'
        })
      });
      
      if (response.ok) {
        const newCourrier = await response.json();
        
        // Try to send, but don't fail if email sending fails
        try {
          await fetch(`http://localhost:5000/api/courriers/${newCourrier.id}/send`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ recipientEmail: forwardEmail })
          });
          alert(`Courrier transféré et envoyé à ${forwardEmail}`);
        } catch (emailError) {
          console.warn('Email sending failed, but courrier was created:', emailError);
          alert(`Courrier transféré créé (envoi email échoué - problème SMTP)`);
        }
        
        handleDialogClose();
      } else {
        alert('Erreur lors de la création du transfert');
      }
    } catch (error) {
      console.error('Failed to forward courrier:', error);
      alert('Erreur lors du transfert');
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
      <Box sx={{ overflowX: 'auto' }}>
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
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {items.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          <Typography>Aucun courrier en réception</Typography>
        </Box>
      )}
      
      {/* Action Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogType === 'view' && 'Détail du Courrier'}
          {dialogType === 'reply' && 'Répondre au Courrier'}
          {dialogType === 'link' && 'Lier le Courrier'}
          {dialogType === 'forward' && 'Transférer le Courrier'}
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box>
              {dialogType === 'view' && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2 }}>{selectedItem.subject}</Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>De: {selectedItem.from}</Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>Date: {new Date(selectedItem.dateReceived).toLocaleString()}</Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>Type: {selectedItem.type}</Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body1">
                    {(selectedItem as any).body || 'Contenu du courrier non disponible'}
                  </Typography>
                </Box>
              )}
              
              {dialogType === 'reply' && (
                <Box>
                  <Typography variant="body2" sx={{ mb: 2 }}>Répondre à: {selectedItem.subject}</Typography>
                  <TextField
                    label="Votre réponse"
                    multiline
                    rows={6}
                    fullWidth
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Saisissez votre réponse..."
                  />
                </Box>
              )}
              
              {dialogType === 'link' && (
                <Box>
                  <Typography variant="body2" sx={{ mb: 2 }}>Lier le courrier "{selectedItem.subject}" à:</Typography>
                  <TextField
                    label="Référence (Bordereau, Contrat, etc.)"
                    fullWidth
                    value={linkReference}
                    onChange={(e) => setLinkReference(e.target.value)}
                    placeholder="Ex: BS-2025-001, CONTRAT-123"
                  />
                </Box>
              )}
              
              {dialogType === 'forward' && (
                <Box>
                  <Typography variant="body2" sx={{ mb: 2 }}>Transférer le courrier "{selectedItem.subject}" à:</Typography>
                  <TextField
                    label="Email destinataire"
                    fullWidth
                    type="email"
                    value={forwardEmail}
                    onChange={(e) => setForwardEmail(e.target.value)}
                    placeholder="destinataire@example.com"
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    label="Message"
                    multiline
                    rows={6}
                    fullWidth
                    value={forwardMessage}
                    onChange={(e) => setForwardMessage(e.target.value)}
                  />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Annuler</Button>
          {dialogType === 'reply' && (
            <Button onClick={handleReply} variant="contained" disabled={!replyText.trim()}>
              Envoyer Réponse
            </Button>
          )}
          {dialogType === 'link' && (
            <Button onClick={handleLink} variant="contained" disabled={!linkReference.trim()}>
              Lier
            </Button>
          )}
          {dialogType === 'forward' && (
            <Button onClick={handleForward} variant="contained" disabled={!forwardEmail.trim()}>
              Transférer
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default InboxTab;