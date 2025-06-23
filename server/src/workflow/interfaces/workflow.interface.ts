import { Statut } from '@prisma/client';
import { TASK_TYPES } from '../workflow.constants';

export interface WorkflowTask {
  id: string;
  type: keyof typeof TASK_TYPES;
  reference: string;
  status: Statut;
  priority: number;
  dueDate: Date;
  assignedTo?: string;
  team?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowAssignment {
  taskId: string;
  assigneeId: string;
  assignedAt: Date;
  completedAt?: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
}