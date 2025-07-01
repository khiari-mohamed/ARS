import React, { useState } from 'react';
import { Container, Box, Button, Snackbar, Alert } from '@mui/material';
import WorkflowList from '../../components/Workflow/WorkflowList';
import WorkflowDetails from '../../components/Workflow/WorkflowDetails';
import { WorkflowAssignment } from '../../types/workflow';
import WorkflowForm from '../../components/Workflow/WorkflowForm';
import WorkflowDiagram from './WorkflowDiagram';
import NotificationListener from '../../components/Workflow/NotificationListener';
import WorkflowTimeline from './WorkflowTimeline';
import WorkloadDashboard from '../../components/Workflow/WorkloadDashboard';
import { triggerAIAssignment } from '../../api/workflowApi';

const WorkflowPage: React.FC = () => {
  const [selected, setSelected] = useState<WorkflowAssignment | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success'|'error' }>({ open: false, message: '', severity: 'success' });

  const handleCreated = () => setRefreshKey(k => k + 1);

  const handleAIAssign = async () => {
    try {
      await triggerAIAssignment();
      setSnackbar({ open: true, message: 'Affectation intelligente IA effectuée avec succès.', severity: 'success' });
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || 'Erreur lors de l’affectation IA.', severity: 'error' });
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <NotificationListener />
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" color="primary" onClick={handleAIAssign}>
          Affectation intelligente IA
        </Button>
      </Box>
      <WorkloadDashboard />
      <WorkflowDiagram taskId={selected?.taskId} />
      {selected?.taskId && <WorkflowTimeline taskId={selected.taskId} />}
      <WorkflowForm onCreated={handleCreated} />
      <Box sx={{ my: 4 }}>
        <WorkflowList key={refreshKey} onSelect={setSelected} />
      </Box>
      <WorkflowDetails assignment={selected} onClose={() => setSelected(null)} />
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
        <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default WorkflowPage;
