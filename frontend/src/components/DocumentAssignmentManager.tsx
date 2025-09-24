import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete
} from '@mui/material';
import {
  Assignment,
  Person,
  Description,
  Schedule,
  CheckCircle,
  Warning
} from '@mui/icons-material';
import { LocalAPI } from '../services/axios';

interface Document {
  id: string;
  name: string;
  type: string;
  status: string;
  uploadedAt: string;
  assignedTo?: {
    id: string;
    fullName: string;
  };
  assignedBy?: {
    id: string;
    fullName: string;
  };
  assignedAt?: string;
  priority: number;
  slaApplicable: boolean;
  bordereau?: {
    reference: string;
    client: {
      name: string;
    };
  };
}

interface User {
  id: string;
  fullName: string;
  role: string;
  department?: string;
}

const DocumentAssignmentManager: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [assignmentReason, setAssignmentReason] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [documentsResponse, usersResponse] = await Promise.all([
        LocalAPI.get('/documents/assignment-view'),
        LocalAPI.get('/users/gestionnaires')
      ]);
      
      setDocuments(documentsResponse.data || []);
      setUsers(usersResponse.data || []);
    } catch (error) {
      console.error('Failed to load assignment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      'BULLETIN_SOIN': 'Bulletin de Soin',
      'COMPLEMENT_INFORMATION': 'Complément Information',
      'ADHESION': 'Adhésion',
      'RECLAMATION': 'Réclamation',
      'CONTRAT_AVENANT': 'Contrat/Avenant',
      'DEMANDE_RESILIATION': 'Demande Résiliation',
      'CONVENTION_TIERS_PAYANT': 'Convention Tiers Payant'
    };
    return typeLabels[type] || type;
  };

  const getDocumentTypeIcon = (type: string) => {
    const typeIcons: Record<string, string> = {
      'BULLETIN_SOIN': '🏥',
      'COMPLEMENT_INFORMATION': '📋',
      'ADHESION': '👥',
      'RECLAMATION': '⚠️',
      'CONTRAT_AVENANT': '📄',
      'DEMANDE_RESILIATION': '❌',
      'CONVENTION_TIERS_PAYANT': '🤝'
    };
    return typeIcons[type] || '📄';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UPLOADED': return 'default';
      case 'EN_COURS': return 'primary';
      case 'TRAITE': return 'success';
      case 'REJETE': return 'error';
      case 'RETOUR_ADMIN': return 'warning';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 3) return 'error';
    if (priority === 2) return 'warning';
    return 'success';
  };

  const handleAssignDocuments = async () => {
    if (!selectedUser || selectedDocuments.length === 0) return;

    try {
      await LocalAPI.post('/documents/assign-bulk', {
        documentIds: selectedDocuments,
        assignedToUserId: selectedUser.id,
        reason: assignmentReason
      });

      setAssignDialogOpen(false);
      setSelectedDocuments([]);
      setSelectedUser(null);
      setAssignmentReason('');
      await loadData();
    } catch (error) {
      console.error('Failed to assign documents:', error);
    }
  };

  const handleReassignDocument = async (documentId: string, newUserId: string) => {
    try {
      await LocalAPI.post(`/documents/${documentId}/reassign`, {
        assignedToUserId: newUserId,
        reason: 'Réassignation par Super Admin'
      });
      await loadData();
    } catch (error) {
      console.error('Failed to reassign document:', error);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (filterType !== 'ALL' && doc.type !== filterType) return false;
    if (filterStatus !== 'ALL' && doc.status !== filterStatus) return false;
    return true;
  });

  const documentStats = {
    total: documents.length,
    assigned: documents.filter(d => d.assignedTo).length,
    unassigned: documents.filter(d => !d.assignedTo).length,
    overdue: documents.filter(d => d.slaApplicable && !d.assignedTo && new Date(d.uploadedAt) < new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)).length
  };

  return (
    <Box>
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total Documents
                  </Typography>
                  <Typography variant="h4">{documentStats.total}</Typography>
                </Box>
                <Description color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Assignés
                  </Typography>
                  <Typography variant="h4" color="success.main">{documentStats.assigned}</Typography>
                </Box>
                <CheckCircle color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Non Assignés
                  </Typography>
                  <Typography variant="h4" color="warning.main">{documentStats.unassigned}</Typography>
                </Box>
                <Schedule color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    SLA Risque
                  </Typography>
                  <Typography variant="h4" color="error.main">{documentStats.overdue}</Typography>
                </Box>
                <Warning color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Type Document</InputLabel>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              label="Type Document"
            >
              <MenuItem value="ALL">Tous les types</MenuItem>
              <MenuItem value="BULLETIN_SOIN">🏥 Bulletins de Soin</MenuItem>
              <MenuItem value="COMPLEMENT_INFORMATION">📋 Compléments Info</MenuItem>
              <MenuItem value="ADHESION">👥 Adhésions</MenuItem>
              <MenuItem value="RECLAMATION">⚠️ Réclamations</MenuItem>
              <MenuItem value="CONTRAT_AVENANT">📄 Contrats/Avenants</MenuItem>
              <MenuItem value="DEMANDE_RESILIATION">❌ Demandes Résiliation</MenuItem>
              <MenuItem value="CONVENTION_TIERS_PAYANT">🤝 Conventions Tiers</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Statut</InputLabel>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              label="Statut"
            >
              <MenuItem value="ALL">Tous les statuts</MenuItem>
              <MenuItem value="UPLOADED">Uploadé</MenuItem>
              <MenuItem value="EN_COURS">En cours</MenuItem>
              <MenuItem value="TRAITE">Traité</MenuItem>
              <MenuItem value="REJETE">Rejeté</MenuItem>
              <MenuItem value="RETOUR_ADMIN">Retour Admin</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={<Assignment />}
            onClick={() => setAssignDialogOpen(true)}
            disabled={selectedDocuments.length === 0}
          >
            Assigner ({selectedDocuments.length})
          </Button>

          <Button variant="outlined" onClick={loadData}>
            Actualiser
          </Button>
        </Box>
      </Paper>

      {/* Documents Table */}
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <input
                  type="checkbox"
                  checked={selectedDocuments.length === filteredDocuments.length && filteredDocuments.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDocuments(filteredDocuments.map(d => d.id));
                    } else {
                      setSelectedDocuments([]);
                    }
                  }}
                />
              </TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Document</TableCell>
              <TableCell>Bordereau</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Priorité</TableCell>
              <TableCell>SLA</TableCell>
              <TableCell>Assigné à</TableCell>
              <TableCell>Date Upload</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDocuments.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell padding="checkbox">
                  <input
                    type="checkbox"
                    checked={selectedDocuments.includes(doc.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDocuments([...selectedDocuments, doc.id]);
                      } else {
                        setSelectedDocuments(selectedDocuments.filter(id => id !== doc.id));
                      }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <span>{getDocumentTypeIcon(doc.type)}</span>
                    <Typography variant="body2">
                      {getDocumentTypeLabel(doc.type)}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {doc.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  {doc.bordereau && (
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {doc.bordereau.reference}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {doc.bordereau.client.name}
                      </Typography>
                    </Box>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={doc.status}
                    color={getStatusColor(doc.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={`P${doc.priority}`}
                    color={getPriorityColor(doc.priority) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {doc.slaApplicable ? (
                    <Chip label="SLA" color="info" size="small" />
                  ) : (
                    <Chip label="No SLA" color="default" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  {doc.assignedTo ? (
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {doc.assignedTo.fullName}
                      </Typography>
                      {doc.assignedAt && (
                        <Typography variant="caption" color="text.secondary">
                          {new Date(doc.assignedAt).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Chip label="Non assigné" color="warning" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  {doc.assignedTo ? (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        // Open reassignment dialog
                      }}
                    >
                      Réassigner
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => {
                        setSelectedDocuments([doc.id]);
                        setAssignDialogOpen(true);
                      }}
                    >
                      Assigner
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Assigner Documents ({selectedDocuments.length})
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Autocomplete
              options={users}
              getOptionLabel={(user) => `${user.fullName} (${user.role})`}
              value={selectedUser}
              onChange={(_, value) => setSelectedUser(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Gestionnaire"
                  placeholder="Sélectionner un gestionnaire"
                  fullWidth
                />
              )}
              sx={{ mb: 2 }}
            />
            
            <TextField
              label="Raison de l'assignation"
              multiline
              rows={3}
              value={assignmentReason}
              onChange={(e) => setAssignmentReason(e.target.value)}
              fullWidth
              placeholder="Optionnel: Raison de cette assignation..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleAssignDocuments}
            variant="contained"
            disabled={!selectedUser}
          >
            Assigner
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentAssignmentManager;