export interface Assignment {
  id: string;
  taskId: string;
  taskType: string;
  assigneeId: string;
  assignedAt: Date;
  completedAt?: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  notes?: string;
}