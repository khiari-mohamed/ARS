export type WorkflowStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

export interface WorkflowAssignment {
  id: string;
  taskId: string;
  taskType: string;
  assigneeId: string;
  assignedAt: string;
  completedAt?: string;
  status: WorkflowStatus;
  notes?: string;
  assigneeName?: string; // For display purposes
}