import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Badge
} from '@mui/material';
import {
  Assignment,
  CheckCircle,
  Schedule,
  PersonAdd,
  Refresh
} from '@mui/icons-material';
import { LocalAPI } from '../../services/axios';
import { useAuth } from '../../contexts/AuthContext';

interface BordereauItem {
  id: string;
  reference: string;
  clientName: string;
  dateReception: string;
  statut: string;
  assignedToUserId?: string;
  assignedUserName?: string;
  delaiReglement: number;
  daysSinceReception: number;
  slaStatus: 'green' | 'orange' | 'red';
}

interface TeamMember {
  id: string;
  fullName: string;
  workload: number;
}

const GlobalCorbeille: React.FC = () => {
  const { user } = useAuth();
  const [bordereaux, setBordereaux] = useState<BordereauItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignDialog, setAssignDialog] = useState(false);
  const [selectedBordereaux, setSelectedBordereaux] = useState<string[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');

  useEffect(() => {
    loadGlobalCorbeille();
    const interval = setInterval(loadGlobalCorbeille, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadGlobalCorbeille = async () => {
    try {
      const [bordereauResponse, teamResponse] = await Promise.all([
        LocalAPI.get('/dashboard/global-corbeille'),
        LocalAPI.get('/users', { params: { role: 'GESTIONNAIRE' } })
      ]);

      const bordereauData = bordereauResponse.data.map((b: any) => ({
        id: b.id,
        reference: b.reference,
        clientName: b.client?.name || 'N/A',
        dateReception: b.dateReception,
        statut: b.statut,
        assignedToUserId: b.assignedToUserId,
        assignedUserName: b.assignedUser?.fullName,
        delaiReglement: b.delaiReglement || 5,
        daysSinceReception: Math.floor((Date.now() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24)),
        slaStatus: calculateSlaStatus(b)
      }));

      setBordereaux(bordereauData);
      setTeamMembers(teamResponse.data || []);
    } catch (error) {
      console.error('Failed to load global corbeille:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSlaStatus = (bordereau: any): 'green' | 'orange' | 'red' => {
    const daysSince = Math.floor((Date.now() - new Date(bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24));
    const slaLimit = bordereau.delaiReglement || 5;
    
    if (daysSince > slaLimit) return 'red';
    if (daysSince > slaLimit - 2) return 'orange';
    return 'green';
  };

  const handleBulkAssign = async () => {
    if (!selectedAssignee || selectedBordereaux.length === 0) return;

    try {
      await LocalAPI.post('/bordereaux/bulk-assign', {
        bordereauIds: selectedBordereaux,
        assigneeId: selectedAssignee
      });
      
      setAssignDialog(false);
      setSelectedBordereaux([]);
      setSelectedAssignee('');
      loadGlobalCorbeille();
    } catch (error) {
      console.error('Bulk assignment failed:', error);
    }
  };

  const getSlaColor = (status: 'green' | 'orange' | 'red') => {
    switch (status) {
      case 'green': return 'success';
      case 'orange': return 'warning';
      case 'red': return 'error';
      default: return 'default';
    }
  };

  const getStatusBucket = (statut: string) => {
    if (['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(statut)) return 'traites';
    if (['EN_COURS', 'ASSIGNE'].includes(statut)) return 'en_cours';
    return 'non_affectes';
  };

  const traites = bordereaux.filter(b => getStatusBucket(b.statut) === 'traites');
  const enCours = bordereaux.filter(b => getStatusBucket(b.statut) === 'en_cours');
  const nonAffectes = bordereaux.filter(b => getStatusBucket(b.statut) === 'non_affectes');

  const renderBordereauTable = (data: BordereauItem[], title: string, showAssign: boolean = false) => (
    <Card sx={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" display="flex" alignItems="center" gap={1}>
            {title === 'Traités' && <CheckCircle color="success" />}
            {title === 'En Cours' && <Schedule color="info" />}
            {title === 'Non Affectés' && <Assignment color="warning" />}
            {title}
            <Badge badgeContent={data.length} color="primary" />
          </Typography>
          {showAssign && (
            <Button
              size="small"
              startIcon={<PersonAdd />}
              onClick={() => setAssignDialog(true)}
              disabled={selectedBordereaux.length === 0}
            >
              Affecter ({selectedBordereaux.length})
            </Button>
          )}
        </Box>
        
        <TableContainer sx={{ flex: 1, maxHeight: '300px' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {showAssign && <TableCell padding="checkbox">Sél.</TableCell>}
                <TableCell>Référence</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>SLA</TableCell>
                {title !== 'Non Affectés' && <TableCell>Assigné à</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((bordereau) => (
                <TableRow key={bordereau.id}>
                  {showAssign && (
                    <TableCell padding="checkbox">
                      <input
                        type="checkbox"
                        checked={selectedBordereaux.includes(bordereau.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBordereaux([...selectedBordereaux, bordereau.id]);
                          } else {
                            setSelectedBordereaux(selectedBordereaux.filter(id => id !== bordereau.id));
                          }
                        }}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {bordereau.reference}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {bordereau.clientName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={`${bordereau.daysSinceReception}j`}
                      color={getSlaColor(bordereau.slaStatus) as any}
                    />
                  </TableCell>
                  {title !== 'Non Affectés' && (
                    <TableCell>
                      <Typography variant="body2">
                        {bordereau.assignedUserName || 'Non assigné'}
                      </Typography>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={showAssign ? 5 : 4} align="center">
                    <Typography color="text.secondary">
                      Aucun bordereau
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">
          Corbeille Globale de l'Équipe
        </Typography>
        <IconButton onClick={loadGlobalCorbeille}>
          <Refresh />
        </IconButton>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          {renderBordereauTable(nonAffectes, 'Non Affectés', true)}
        </Grid>
        <Grid item xs={12} md={4}>
          {renderBordereauTable(enCours, 'En Cours')}
        </Grid>
        <Grid item xs={12} md={4}>
          {renderBordereauTable(traites, 'Traités')}
        </Grid>
      </Grid>

      {/* Assignment Dialog */}
      <Dialog open={assignDialog} onClose={() => setAssignDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Affecter les Bordereaux Sélectionnés</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Gestionnaire</InputLabel>
            <Select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              label="Gestionnaire"
            >
              {teamMembers.map((member) => (
                <MenuItem key={member.id} value={member.id}>
                  {member.fullName} (Charge: {member.workload})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="body2" sx={{ mt: 2 }}>
            {selectedBordereaux.length} bordereau(x) sélectionné(s)
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog(false)}>Annuler</Button>
          <Button 
            variant="contained" 
            onClick={handleBulkAssign}
            disabled={!selectedAssignee}
          >
            Affecter
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GlobalCorbeille;