import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, Tabs, Tab, Table, TableHead, TableRow, 
  TableCell, TableBody, Chip, Button, Checkbox, Stack
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { useAuth } from '../../contexts/AuthContext';
import { LocalAPI } from '../../services/axios';

interface Document {
  id: string;
  reference: string;
  client: string;
  type: string;
  status: string;
  assignedTo?: string;
  slaStatus: 'green' | 'orange' | 'red';
  uploadedAt: string;
  bordereauStatus?: string;
}

const CorbeilleTab: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await LocalAPI.get('/documents/search');
        const docs = response.data || [];
        
        const allDocs: Document[] = docs.map((doc: any) => ({
          id: doc.id,
          reference: doc.name || `DOC-${doc.id.substring(0, 8)}`,
          client: doc.bordereau?.client?.name || 'N/A',
          type: doc.type || 'BULLETIN_SOIN',
          status: doc.status,
          bordereauStatus: doc.bordereau?.statut,
          assignedTo: doc.assignedTo?.fullName || 'Non assigné',
          slaStatus: calculateSlaStatus(doc.uploadedAt),
          uploadedAt: doc.uploadedAt
        }));
        
        setDocuments(allDocs);
      } catch (error) {
        console.error('❌ Error loading documents:', error);
        setDocuments([]);
      }
    };
    
    loadDocuments();
  }, [tab, user]);
  
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
      'REJETE': { label: 'Retourné', color: 'error' },
      'RETOURNE': { label: 'Retourné', color: 'error' },
      'SCANNE': { label: 'Scanné', color: 'info' },
      'UPLOADED': { label: 'Nouveau', color: 'default' }
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
      await LocalAPI.post('/bordereaux/bulk-assign-documents', {
        documentIds: selectedIds,
        userId: user?.id
      });
      
      alert(`${selectedIds.length} documents assignés`);
      setSelectedIds([]);
      window.location.reload();
    } catch (error) {
      console.error('Bulk assignment failed:', error);
      alert('Erreur lors de l\'assignation');
    }
  };

  const handleMarkAsProcessed = async (docId: string) => {
    try {
      await LocalAPI.patch(`/documents/${docId}`, {
        status: 'TRAITE'
      });
      
      setDocuments(prev => prev.map(doc => 
        doc.id === docId ? {...doc, status: 'TRAITE'} : doc
      ));
    } catch (error) {
      console.error('Status update failed:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleReturnToChef = async (docId: string) => {
    try {
      await LocalAPI.patch(`/documents/${docId}`, {
        status: 'RETOURNE'
      });
      
      setDocuments(prev => prev.map(doc => 
        doc.id === docId ? {...doc, status: 'RETOURNE'} : doc
      ));
    } catch (error) {
      console.error('Return failed:', error);
      alert('Erreur lors du retour');
    }
  };

  const getTabsForRole = () => {
    switch (user?.role) {
      case 'CHEF_EQUIPE':
        return ['Traités', 'En cours', 'Non affectés', 'Retournés'];
      case 'GESTIONNAIRE':
        return ['En cours', 'Traités', 'Retournés'];
      default:
        return ['Tous', 'En cours', 'Traités'];
    }
  };

  const getFilteredDocuments = () => {
    const tabs = getTabsForRole();
    const currentTab = tabs[tab];
    
    let filtered;
    switch (currentTab) {
      case 'Traités':
        filtered = documents.filter(doc => 
          doc.status === 'TRAITE' ||
          doc.bordereauStatus === 'TRAITE' || 
          doc.bordereauStatus === 'PAYE' ||
          doc.bordereauStatus === 'CLOTURE'
        );
        break;
      case 'En cours':
        filtered = documents.filter(doc => 
          doc.status === 'EN_COURS' ||
          doc.status === 'UPLOADED' ||
          doc.bordereauStatus === 'EN_COURS' || 
          doc.bordereauStatus === 'ASSIGNE' ||
          doc.bordereauStatus === 'SCAN_EN_COURS'
        );
        break;
      case 'Non affectés':
        filtered = documents.filter(doc => 
          doc.bordereauStatus === 'A_AFFECTER' || 
          doc.bordereauStatus === 'A_SCANNER' ||
          doc.bordereauStatus === 'SCANNE'
        );
        break;
      case 'Retournés':
        filtered = documents.filter(doc => 
          doc.status === 'REJETE' ||
          doc.status === 'RETOURNE' ||
          doc.bordereauStatus === 'REJETE' ||
          doc.bordereauStatus === 'RETOURNE'
        );
        break;
      case 'Tous':
        filtered = documents;
        break;
      default:
        filtered = documents;
    }
    
    return filtered;
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        {filteredDocs.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            <Typography>Aucun document dans cette catégorie</Typography>
            <Typography variant="caption">Total documents chargés: {documents.length}</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default CorbeilleTab;