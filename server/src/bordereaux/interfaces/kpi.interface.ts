export interface BordereauKPI {
  statut: string;
  id: string;
  reference: string;
  daysElapsed: number;
  daysRemaining: number;
  scanDuration?: number | null;
  totalDuration?: number | null;
  isOverdue: boolean;
  statusColor: 'GREEN' | 'ORANGE' | 'RED';
}

export interface TeamKPI {
  teamId: string;
  teamName: string;
  totalBordereaux: number;
  completedBordereaux: number;
  averageProcessingTime: number;
  overdueCount: number;
  onTimeCount: number;
  performanceScore: number;
}

export interface UserKPI {
  userId: string;
  userName: string;
  totalAssigned: number;
  completedCount: number;
  averageProcessingTime: number;
  overdueCount: number;
  onTimeCount: number;
  performanceScore: number;
}