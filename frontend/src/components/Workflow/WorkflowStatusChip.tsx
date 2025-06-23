import React from 'react';
import { Chip } from '@mui/material';
import { WorkflowStatus } from '../../types/workflow';

const statusColor: Record<WorkflowStatus, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  PENDING: 'default',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  OVERDUE: 'error',
};

const statusLabel: Record<WorkflowStatus, string> = {
  PENDING: 'En attente',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
  OVERDUE: 'En retard',
};

const WorkflowStatusChip: React.FC<{ status: WorkflowStatus }> = ({ status }) => (
  <Chip label={statusLabel[status]} color={statusColor[status]} size="small" />
);

export default WorkflowStatusChip;