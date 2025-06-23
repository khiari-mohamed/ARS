import React, { useState } from 'react';
import { Box, Button, TextField, MenuItem, Typography } from '@mui/material';
import { createWorkflowAssignment } from '../../api/workflowApi';
import { WorkflowAssignment } from '../../types/workflow';

interface Props {
  onCreated: (assignment: WorkflowAssignment) => void;
}

const WorkflowForm: React.FC<Props> = ({ onCreated }) => {
  const [taskId, setTaskId] = useState('');
  const [taskType, setTaskType] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const assignment = await createWorkflowAssignment({
        taskId,
        taskType,
        assigneeId,
        notes,
      });
      onCreated(assignment);
      setTaskId('');
      setTaskType('');
      setAssigneeId('');
      setNotes('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Nouvelle affectation de flux de travail
      </Typography>
      <TextField
        label="Task ID"
        value={taskId}
        onChange={e => setTaskId(e.target.value)}
        required
        fullWidth
        margin="normal"
      />
      <TextField
        label="Task Type"
        value={taskType}
        onChange={e => setTaskType(e.target.value)}
        required
        fullWidth
        margin="normal"
        select
      >
        <MenuItem value="BORDEREAU">Bordereau</MenuItem>
        <MenuItem value="RECLAMATION">Reclamation</MenuItem>
        <MenuItem value="CONTRACT">Contract</MenuItem>
        <MenuItem value="OTHER">Other</MenuItem>
      </TextField>
      <TextField
        label="Assignee ID"
        value={assigneeId}
        onChange={e => setAssigneeId(e.target.value)}
        required
        fullWidth
        margin="normal"
      />
      <TextField
        label="Notes"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        fullWidth
        margin="normal"
        multiline
        rows={2}
      />
      <Button type="submit" variant="contained" color="primary" disabled={loading}>
        {loading ? 'Creating...' : 'Create Assignment'}
      </Button>
    </Box>
  );
};

export default WorkflowForm;