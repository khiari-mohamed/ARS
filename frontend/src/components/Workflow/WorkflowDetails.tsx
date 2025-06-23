import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import { WorkflowAssignment } from '../../types/workflow';
import WorkflowStatusChip from './WorkflowStatusChip';

interface Props {
  assignment: WorkflowAssignment | null;
  onClose: () => void;
}

const WorkflowDetails: React.FC<Props> = ({ assignment, onClose }) => {
  if (!assignment) return null;

  return (
    <Dialog open={!!assignment} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Workflow Assignment Details</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Task ID:</Typography>
          <Typography>{assignment.taskId}</Typography>
        </Box>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Task Type:</Typography>
          <Typography>{assignment.taskType}</Typography>
        </Box>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Assignee:</Typography>
          <Typography>{assignment.assigneeName || assignment.assigneeId}</Typography>
        </Box>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Status:</Typography>
          <WorkflowStatusChip status={assignment.status} />
        </Box>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Assigned At:</Typography>
          <Typography>{new Date(assignment.assignedAt).toLocaleString()}</Typography>
        </Box>
        {assignment.completedAt && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Completed At:</Typography>
            <Typography>{new Date(assignment.completedAt).toLocaleString()}</Typography>
          </Box>
        )}
        {assignment.notes && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Notes:</Typography>
            <Typography>{assignment.notes}</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default WorkflowDetails;