import React, { useState } from 'react';
import { Container, Box } from '@mui/material';
import WorkflowList from '../../components/Workflow/WorkflowList';
import WorkflowDetails from '../../components/Workflow/WorkflowDetails';
import { WorkflowAssignment } from '../../types/workflow';
import WorkflowForm from '../../components/Workflow/WorkflowForm';
import WorkflowDiagram from './WorkflowDiagram';
import NotificationListener from '../../components/Workflow/NotificationListener';
import WorkflowTimeline from './WorkflowTimeline';
import WorkloadDashboard from '../../components/Workflow/WorkloadDashboard';

const WorkflowPage: React.FC = () => {
  const [selected, setSelected] = useState<WorkflowAssignment | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = () => setRefreshKey(k => k + 1);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <NotificationListener />
      <WorkloadDashboard />
      <WorkflowDiagram taskId={selected?.taskId} />
      {selected?.taskId && <WorkflowTimeline taskId={selected.taskId} />}
      <WorkflowForm onCreated={handleCreated} />
      <Box sx={{ my: 4 }}>
        <WorkflowList key={refreshKey} onSelect={setSelected} />
      </Box>
      <WorkflowDetails assignment={selected} onClose={() => setSelected(null)} />
    </Container>
  );
};

export default WorkflowPage;
