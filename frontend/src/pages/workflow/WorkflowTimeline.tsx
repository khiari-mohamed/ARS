import React, { useEffect, useState } from 'react';
import { Box, Typography, Stepper, Step, StepLabel, Paper, CircularProgress } from '@mui/material';
import { getWorkflowVisualization } from '../../api/workflowApi';

interface TimelineProps {
  taskId: string;
}

const WorkflowTimeline: React.FC<TimelineProps> = ({ taskId }) => {
  const [trace, setTrace] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    setLoading(true);
    getWorkflowVisualization(taskId)
      .then(data => setTrace(data))
      .finally(() => setLoading(false));
  }, [taskId]);

  if (!taskId) return null;
  if (loading) return <CircularProgress />;
  if (!trace || !trace.stages) return <Typography>Aucune donnée de timeline.</Typography>;

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>Chronologie du traitement</Typography>
      <Stepper alternativeLabel activeStep={trace.stages.findIndex((s: any) => s.status === 'IN_PROGRESS' || s.status === 'PENDING')}>
        {trace.stages.map((stage: any, idx: number) => (
          <Step key={stage.name} completed={stage.status === 'COMPLETED'}>
            <StepLabel
              optional={stage.date ? <Typography variant="caption">{new Date(stage.date).toLocaleString('fr-FR')}</Typography> : undefined}
              error={stage.status === 'OVERDUE'}
            >
              {stage.name} <span style={{ fontSize: 12, color: '#888' }}>({stage.status === 'COMPLETED' ? 'Terminé' : stage.status === 'IN_PROGRESS' ? 'En cours' : stage.status === 'OVERDUE' ? 'En retard' : 'En attente'})</span>
            </StepLabel>
          </Step>
        ))}
      </Stepper>
    </Paper>
  );
};

export default WorkflowTimeline;
