import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import corbeilleService, { CorbeilleResponse, CorbeilleItem } from '../../services/corbeilleService';
import { 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Box, 
  Tabs, 
  Tab, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Checkbox, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Alert,
  Chip,
  CircularProgress
} from '@mui/material';
import { Assignment, Warning, CheckCircle, Schedule, TrendingUp } from '@mui/icons-material';

export const BordereauCorbeille: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState('');

  const queryClient = useQueryClient();

  const { data: corbeilleData, isLoading, error, refetch } = useQuery<CorbeilleResponse>(
    ['bordereau-chef-corbeille'],
    () => corbeilleService.getChefCorbeille(),
    { 
      refetchInterval: 30000,
      retry: 3,
      staleTime: 10000
    }
  );

  const { data: users = [], isLoading: usersLoading } = useQuery(
    ['available-gestionnaires'], 
    () => corbeilleService.getAvailableGestionnaires(),
    { staleTime: 5 * 60 * 1000 }
  );

  const assignMutation = useMutation(
    ({ bordereauIds, assigneeId }: { bordereauIds: string[]; assigneeId: string }) =>
      corbeilleService.bulkAssignBordereaux(bordereauIds, assigneeId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['bordereau-chef-corbeille']);
        setSelectedItems([]);
        setAssignModalOpen(false);
        setSelectedAssignee('');
      }
    }
  );

  if (isLoading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Chargement de la corbeille...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        <Typography variant="h6">Erreur lors du chargement</Typography>
        <Button variant="outlined" onClick={() => refetch()} sx={{ mt: 1 }}>
          Réessayer
        </Button>
      </Alert>
    );
  }

  const { nonAffectes = [], enCours = [], traites = [], stats } = corbeilleData || {};

  const handleSelectAll = (items: CorbeilleItem[]) => {
    const itemIds = items.map(item => item.id);
    if (selectedItems.length === itemIds.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(itemIds);
    }
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleBulkAssign = () => {
    if (selectedItems.length === 0 || !selectedAssignee) return;
    assignMutation.mutate({
      bordereauIds: selectedItems,
      assigneeId: selectedAssignee
    });
  };

  const renderStatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={2.4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Non Affectés
                </Typography>
                <Typography variant="h4" color="primary">
                  {stats?.nonAffectes || 0}
                </Typography>
              </Box>
              <Assignment color="primary" />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={2.4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  En Cours
                </Typography>
                <Typography variant="h4" color="info.main">
                  {stats?.enCours || 0}
                </Typography>
              </Box>
              <Schedule color="info" />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Traités
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats?.traites || 0}
                </Typography>
              </Box>
              <CheckCircle color="success" />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  En Retard
                </Typography>
                <Typography variant="h4" color="error.main">
                  {stats?.enRetard || 0}
                </Typography>
              </Box>
              <Warning color="error" />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Critiques
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {stats?.critiques || 0}
                </Typography>
              </Box>
              <TrendingUp color="warning" />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderTable = (items: CorbeilleItem[], showAssignee = false) => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                checked={selectedItems.length === items.length && items.length > 0}
                indeterminate={selectedItems.length > 0 && selectedItems.length < items.length}
                onChange={() => handleSelectAll(items)}
              />
            </TableCell>
            <TableCell>Référence</TableCell>
            <TableCell>Client</TableCell>
            <TableCell>Sujet</TableCell>
            <TableCell>Priorité</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell>SLA</TableCell>
            <TableCell>Date</TableCell>
            {showAssignee && <TableCell>Assigné à</TableCell>}
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} hover>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedItems.includes(item.id)}
                  onChange={() => handleSelectItem(item.id)}
                />
              </TableCell>
              <TableCell>{item.reference}</TableCell>
              <TableCell>{item.clientName}</TableCell>
              <TableCell>
                <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                  {item.subject}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={item.priority}
                  color={corbeilleService.getPriorityColor(item.priority)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={item.status}
                  variant="outlined"
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={corbeilleService.formatRemainingTime(item.remainingTime)}
                  color={corbeilleService.getSLAColor(item.slaStatus)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {new Date(item.createdAt).toLocaleDateString()}
              </TableCell>
              {showAssignee && (
                <TableCell>{item.assignedTo || '-'}</TableCell>
              )}
              <TableCell>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => window.open(`/bordereaux/${item.id}`, '_blank')}
                >
                  Voir
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <div className="bordereau-corbeille p-4">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">
          Corbeille Bordereaux - Chef d'Équipe
        </Typography>
        <Button variant="outlined" onClick={() => refetch()} disabled={isLoading}>
          Actualiser
        </Button>
      </Box>

      {/* Alerts */}
      {(stats?.enRetard || 0) > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <strong>Attention:</strong> {stats?.enRetard || 0} bordereaux en retard SLA
        </Alert>
      )}

      {(stats?.critiques || 0) > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Urgent:</strong> {stats?.critiques || 0} bordereaux critiques
        </Alert>
      )}

      {/* Stats Cards */}
      {renderStatsCards()}

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            {selectedItems.length} élément(s) sélectionné(s)
          </Typography>
          <Button
            variant="contained"
            onClick={() => setAssignModalOpen(true)}
            disabled={selectedItems.length === 0}
          >
            Assigner en lot
          </Button>
        </Box>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label={`Non Affectés (${nonAffectes.length})`} />
          <Tab label={`En Cours (${enCours.length})`} />
          <Tab label={`Traités (${traites.length})`} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        nonAffectes.length > 0 ? renderTable(nonAffectes) : (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary">
              Aucun bordereau non affecté
            </Typography>
          </Paper>
        )
      )}
      {activeTab === 1 && (
        enCours.length > 0 ? renderTable(enCours, true) : (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary">
              Aucun bordereau en cours
            </Typography>
          </Paper>
        )
      )}
      {activeTab === 2 && (
        traites.length > 0 ? renderTable(traites, true) : (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary">
              Aucun bordereau traité
            </Typography>
          </Paper>
        )
      )}

      {/* Assignment Modal */}
      <Dialog open={assignModalOpen} onClose={() => setAssignModalOpen(false)}>
        <DialogTitle>Assigner en lot</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Assigner {selectedItems.length} bordereau(x) à :
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Gestionnaire</InputLabel>
            <Select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              disabled={usersLoading}
            >
              {users.map((user: any) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.fullName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignModalOpen(false)}>Annuler</Button>
          <Button
            onClick={handleBulkAssign}
            variant="contained"
            disabled={!selectedAssignee || assignMutation.isLoading}
          >
            {assignMutation.isLoading ? 'Attribution...' : 'Assigner'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default BordereauCorbeille;