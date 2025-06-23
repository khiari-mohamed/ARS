import React, { useEffect, useState } from 'react';
import { WorkflowAssignment, WorkflowStatus } from '../../types/workflow';
import { getWorkflowAssignments, updateWorkflowAssignment } from '../../api/workflowApi';
import {
  Table, TableBody, TableCell, TableHead, TableRow, Paper, IconButton, Typography, CircularProgress,
  Dialog, DialogTitle, DialogContent, MenuItem, Select, FormControl, InputLabel, Box, Button, DialogActions, Snackbar, Alert, DialogContentText
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TimelineIcon from '@mui/icons-material/Timeline';
import DoneIcon from '@mui/icons-material/Done';
import WorkflowStatusChip from './WorkflowStatusChip';
import axios from 'axios';

interface Props {
  onSelect: (assignment: WorkflowAssignment) => void;
}

const statusOptions: WorkflowStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'];
const typeOptions = ['BORDEREAU', 'RECLAMATION', 'CONTRACT', 'OTHER'];

const WorkflowList: React.FC<Props> = ({ onSelect }) => {
  const [assignments, setAssignments] = useState<WorkflowAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [traceOpen, setTraceOpen] = useState(false);
  const [traceData, setTraceData] = useState<any>(null);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<WorkflowAssignment | null>(null);
  const [newAssignee, setNewAssignee] = useState('');
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success'|'error'|'info'}>({open: false, message: '', severity: 'success'});

  // Filtres
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    setLoading(true);
    const data = await getWorkflowAssignments();
    setAssignments(data);
    setLoading(false);
  };

  const handleTrace = async (taskId: string) => {
    const res = await axios.get(`/api/workflow/visualize/${taskId}`);
    setTraceData(res.data);
    setTraceOpen(true);
  };

  const handleMarkCompleted = async (assignment: WorkflowAssignment) => {
    await updateWorkflowAssignment(assignment.id, { status: 'COMPLETED' });
    setSnackbar({open: true, message: 'Tâche marquée comme complétée', severity: 'success'});
    fetchAssignments();
  };

  // Calcul de la charge par gestionnaire
  const workload: Record<string, number> = {};
  assignments.forEach(a => {
    if (a.status !== 'COMPLETED') {
      const key = a.assigneeName || a.assigneeId;
      workload[key] = (workload[key] || 0) + 1;
    }
  });

  // Réaffectation
  const handleOpenReassign = (assignment: WorkflowAssignment) => {
    setSelectedAssignment(assignment);
    setNewAssignee('');
    setReassignOpen(true);
  };
  const handleReassign = async () => {
    if (selectedAssignment && newAssignee) {
      await updateWorkflowAssignment(selectedAssignment.id, { assigneeId: newAssignee });
      setSnackbar({open: true, message: 'Tâche réaffectée avec succès', severity: 'success'});
      setReassignOpen(false);
      fetchAssignments();
    }
  };

  // Get unique assignees for filter dropdown
  const assigneeOptions = Array.from(
    new Set(assignments.map(a => a.assigneeName || a.assigneeId).filter(Boolean))
  );

  // Apply filters
  const filteredAssignments = assignments.filter(a =>
    (!statusFilter || a.status === statusFilter) &&
    (!typeFilter || a.taskType === typeFilter) &&
    (!assigneeFilter || (a.assigneeName || a.assigneeId) === assigneeFilter)
  );

  if (loading) return <CircularProgress />;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Affectations de workflow
      </Typography>
      {/* Filtres */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Statut</InputLabel>
          <Select
            value={statusFilter}
            label="Statut"
            onChange={e => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">Tous</MenuItem>
            {statusOptions.map(status => (
              <MenuItem key={status} value={status}>{status.replace('_', ' ')}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Type de tâche</InputLabel>
          <Select
            value={typeFilter}
            label="Type de tâche"
            onChange={e => setTypeFilter(e.target.value)}
          >
            <MenuItem value="">Tous</MenuItem>
            {typeOptions.map(type => (
              <MenuItem key={type} value={type}>{type}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Assigné à</InputLabel>
          <Select
            value={assigneeFilter}
            label="Assigné à"
            onChange={e => setAssigneeFilter(e.target.value)}
          >
            <MenuItem value="">Tous</MenuItem>
            {assigneeOptions.map(assignee => (
              <MenuItem key={assignee} value={assignee}>{assignee}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button onClick={fetchAssignments} variant="outlined" size="small">Rafraîchir</Button>
      </Box>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID tâche</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Assigné à</TableCell>
            <TableCell>Charge</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell>Assigné le</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredAssignments.map((a) => {
            const assignee = a.assigneeName || a.assigneeId;
            return (
              <TableRow key={a.id}>
                <TableCell>{a.taskId}</TableCell>
                <TableCell>{a.taskType}</TableCell>
                <TableCell>{assignee}</TableCell>
                <TableCell>{workload[assignee] || 0}</TableCell>
                <TableCell><WorkflowStatusChip status={a.status} /></TableCell>
                <TableCell>{new Date(a.assignedAt).toLocaleString('fr-FR')}</TableCell>
                <TableCell>
                  <IconButton onClick={() => onSelect(a)} size="small" title="Voir détails">
                    <VisibilityIcon />
                  </IconButton>
                  <IconButton onClick={() => handleTrace(a.taskId)} size="small" title="Tracer le workflow">
                    <TimelineIcon />
                  </IconButton>
                  {a.status !== 'COMPLETED' && (
                    <>
                      <IconButton
                        onClick={() => handleMarkCompleted(a)}
                        size="small"
                        title="Marquer comme terminé"
                      >
                        <DoneIcon color="success" />
                      </IconButton>
                      <Button size="small" onClick={() => handleOpenReassign(a)}>Réaffecter</Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {/* Modale de réaffectation */}
      <Dialog open={reassignOpen} onClose={() => setReassignOpen(false)}>
        <DialogTitle>Réaffecter la tâche</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sélectionnez un nouvel utilisateur pour cette tâche.
          </DialogContentText>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Nouvel assigné</InputLabel>
            <Select
              value={newAssignee}
              label="Nouvel assigné"
              onChange={e => setNewAssignee(e.target.value)}
            >
              {assigneeOptions.map(assignee => (
                <MenuItem key={assignee} value={assignee}>{assignee}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReassignOpen(false)}>Annuler</Button>
          <Button onClick={handleReassign} disabled={!newAssignee} variant="contained">Réaffecter</Button>
        </DialogActions>
      </Dialog>
      {/* Snackbar de notification */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({...snackbar, open: false})}>
        <Alert onClose={() => setSnackbar({...snackbar, open: false})} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      {/* Dialog de trace, labels en français */}
      <Dialog open={traceOpen} onClose={() => setTraceOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Traçabilité du workflow</DialogTitle>
        <DialogContent>
          {traceData ? (
            <>
              <Typography variant="subtitle1">Étapes :</Typography>
              <ul>
                {traceData.stages.map((stage: any, idx: number) => (
                  <li key={idx}>
                    <b>{stage.name}</b> - {stage.status} ({stage.date ? new Date(stage.date).toLocaleString('fr-FR') : ''})
                  </li>
                ))}
              </ul>
              <Typography variant="subtitle1">Historique :</Typography>
              <ul>
                {traceData.history.map((h: any, idx: number) => (
                  <li key={idx}>
                    <b>{h.date ? new Date(h.date).toLocaleString('fr-FR') : ''}</b> – {h.user}: {h.action} ({h.fromStatus} → {h.toStatus})
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Typography>Chargement...</Typography>
          )}
        </DialogContent>
      </Dialog>
    </Paper>
  );
};

export default WorkflowList;