import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, Tabs, Tab, Table, TableHead, TableRow, 
  TableCell, TableBody, Chip, Button, Checkbox, Stack
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { useAuth } from '../../contexts/AuthContext';

interface Document {
  id: string;
  reference: string;
  client: string;
  type: string;
  status: string;
  assignedTo?: string;
  slaStatus: 'green' | 'orange' | 'red';
  uploadedAt: string;
}

const CorbeilleTab: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await fetch('/api/documents/search', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setDocuments(data.map((doc: any) => ({
            id: doc.id,
            reference: doc.name || `DOC/${doc.id}`,
            client: doc.bordereau?.client?.name || 'Client inconnu',
            type: doc.type || 'DOCUMENT',
            status: doc.status || 'UPLOADED',
            assignedTo: doc.uploader?.fullName,
            slaStatus: calculateSlaStatus(doc.uploadedAt),
            uploadedAt: doc.uploadedAt
          })));
        } else {
          throw new Error('Failed to load documents');
        }
      } catch (error) {
        console.error('Failed to load documents:', error);
        setDocuments([]);
      }
    };
    
    loadDocuments();
  }, [tab]);
  
  const calculateSlaStatus = (uploadedAt: string): 'green' | 'orange' | 'red' => {
    const now = new Date();
    const uploaded = new Date(uploadedAt);
    const hours = (now.getTime() - uploaded.getTime()) / (1000 * 60 * 60);
    
    if (hours >= 48) return 'red';    // En retard
    if (hours >= 36) return 'orange'; // À risque
    return 'green';                   // À temps
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

  const getStatusChip = (status: string) => {
    const statusConfig = {
      'TRAITE': { label: 'Traité', color: 'success' },
      'EN_COURS': { label: 'En cours', color: 'primary' },
      'NON_AFFECTE': { label: 'Non affecté', color: 'default' },
      'RETOURNE': { label: 'Retourné', color: 'error' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, color: 'default' };
    return <Chip label={config.label} color={config.color as any} size="small" />;
  };

  const handleBulkAssign = async () => {
    if (selectedIds.length === 0) {
      alert('Veuillez sélectionner des documents');
      return;
    }
    
    try {
      // Bulk assign by updating each document individually
      const promises = selectedIds.map(docId => 
        fetch(`/api/documents/${docId}/assign`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({})
        })
      );
      
      const responses = await Promise.all(promises);
      const allSuccessful = responses.every(response => response.ok);
      
      if (!allSuccessful) {
        throw new Error('Some assignments failed');
      }
      
      alert(`${selectedIds.length} documents assignés`);
      setSelectedIds([]);
      // Reload documents
      window.location.reload();
    } catch (error) {
      console.error('Bulk assignment failed:', error);
      alert('Erreur lors de l\'assignation');
    }
  };

  const handleMarkAsProcessed = async (docId: string) => {
    try {
      const response = await fetch(`/api/documents/${docId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: 'TRAITE' })
      });
      
      if (response.ok) {
        setDocuments(prev => prev.map(doc => 
          doc.id === docId ? {...doc, status: 'TRAITE'} : doc
        ));
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Status update failed:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleReturnToChef = async (docId: string) => {
    try {
      const response = await fetch(`/api/documents/${docId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: 'RETOURNE' })
      });
      
      if (response.ok) {
        setDocuments(prev => prev.map(doc => 
          doc.id === docId ? {...doc, status: 'RETOURNE'} : doc
        ));
      } else {
        throw new Error('Failed to return document');
      }
    } catch (error) {
      console.error('Return failed:', error);
      alert('Erreur lors du retour');
    }
  };

  const getTabsForRole = () => {
    switch (user?.role) {
      case 'CHEF_EQUIPE':
        return ['Traités', 'En cours', 'Non affectés'];
      case 'GESTIONNAIRE':
        return ['En cours', 'Traités', 'Retournés'];
      default:
        return ['Tous', 'En cours', 'Traités'];
    }
  };

  const getFilteredDocuments = () => {
    const tabs = getTabsForRole();
    const currentTab = tabs[tab];
    
    switch (currentTab) {
      case 'Traités':
        return documents.filter(doc => doc.status === 'TRAITE');
      case 'En cours':
        return documents.filter(doc => doc.status === 'EN_COURS');
      case 'Non affectés':
        return documents.filter(doc => doc.status === 'NON_AFFECTE');
      case 'Retournés':
        return documents.filter(doc => doc.status === 'RETOURNE');
      default:
        return documents;
    }
  };

  const filteredDocs = getFilteredDocuments();

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Corbeille - {user?.role === 'CHEF_EQUIPE' ? 'Globale' : 'Personnelle'}
        </Typography>

        {/* Role-specific tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
          {getTabsForRole().map((label, index) => (
            <Tab key={index} label={label} />
          ))}
        </Tabs>

        {/* Bulk actions for Chef d'équipe */}
        {user?.role === 'CHEF_EQUIPE' && selectedIds.length > 0 && (
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AssignmentIcon />}
              onClick={handleBulkAssign}
            >
              Assigner en lot ({selectedIds.length})
            </Button>
            <Button
              variant="outlined"
              onClick={() => setSelectedIds([])}
            >
              Désélectionner
            </Button>
          </Stack>
        )}

        {/* Documents table */}
        <Box sx={{ overflowX: 'auto', width: '100%' }}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                {user?.role === 'CHEF_EQUIPE' && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.length === filteredDocs.length && filteredDocs.length > 0}
                      indeterminate={selectedIds.length > 0 && selectedIds.length < filteredDocs.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(filteredDocs.map(doc => doc.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                    />
                  </TableCell>
                )}
                <TableCell>Référence</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>SLA</TableCell>
                {user?.role === 'CHEF_EQUIPE' && <TableCell>Assigné à</TableCell>}
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDocs.map((doc) => (
                <TableRow key={doc.id}>
                  {user?.role === 'CHEF_EQUIPE' && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedIds.includes(doc.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(prev => [...prev, doc.id]);
                          } else {
                            setSelectedIds(prev => prev.filter(id => id !== doc.id));
                          }
                        }}
                      />
                    </TableCell>
                  )}
                  <TableCell>{doc.reference}</TableCell>
                  <TableCell>{doc.client}</TableCell>
                  <TableCell>{doc.type}</TableCell>
                  <TableCell>{getStatusChip(doc.status)}</TableCell>
                  <TableCell>{getSLAChip(doc.slaStatus)}</TableCell>
                  {user?.role === 'CHEF_EQUIPE' && (
                    <TableCell>{doc.assignedTo || 'Non assigné'}</TableCell>
                  )}
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      {user?.role === 'GESTIONNAIRE' && doc.status === 'EN_COURS' && (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleMarkAsProcessed(doc.id)}
                          >
                            Marquer traité
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleReturnToChef(doc.id)}
                          >
                            Retourner
                          </Button>
                        </>
                      )}
                      {user?.role === 'CHEF_EQUIPE' && (
                        <Button size="small" variant="outlined">
                          Assigner
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        {filteredDocs.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            <Typography>Aucun document dans cette catégorie</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default CorbeilleTab;