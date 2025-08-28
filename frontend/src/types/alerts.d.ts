export interface Alert {
  id?: string;
  bordereau: {
    id: string;
    reference: string;
    statut: string;
    clientId?: string;
    teamId?: string;
    dateReception?: string;
    createdAt: string;
    assignedToUserId?: string;
  };
  alertLevel: 'green' | 'orange' | 'red';
  alertType?: string;
  reason: string;
  slaThreshold?: number;
  daysSinceReception?: number;
  aiScore?: number;
  aiPrediction?: any;
  assignedTo?: {
    id: string;
    fullName: string;
    email: string;
  };
  comments?: AlertComment[];
  createdAt?: string;
  resolved?: boolean;
  resolvedAt?: string;
}

export interface AlertComment {
  id: string;
  comment: string;
  user?: {
    id: string;
    fullName: string;
  };
  createdAt: string;
}

export interface AlertKPI {
  totalAlerts: number;
  criticalAlerts: number;
  resolvedToday: number;
  avgResolutionTime: number;
  slaCompliance: number;
  alertsByDay: Array<{
    date: string;
    critical: number;
    warning: number;
    normal: number;
  }>;
  alertsByType: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export interface DelayPrediction {
  forecast: any[];
  trend_direction: string;
  recommendations: Array<{
    action: string;
    priority: string;
    reasoning: string;
  }>;
  ai_confidence: number;
  next_week_prediction: number;
  nextWeekForecast?: number;
  recommendation?: string;
}

export interface TeamOverload {
  team: {
    id: string;
    fullName: string;
    role: string;
  };
  count: number;
  alert: string;
  reason: string;
}

export interface ReclamationAlert {
  reclamation: {
    id: string;
    type: string;
    status: string;
    description: string;
    createdAt: string;
  };
  alert: string;
  reason: string;
  status: string;
}

export interface FinanceAlert {
  bordereau: {
    id: string;
    reference: string;
  };
  alertLevel: 'red';
  reason: string;
  alertType: string;
  hoursOverdue: number;
}

export interface EscalationRule {
  id: string;
  name: string;
  alertType: string;
  severity: string;
  active: boolean;
}

export interface EscalationMetrics {
  totalEscalations: number;
  acknowledgedEscalations: number;
  resolvedEscalations: number;
  avgEscalationTime: number;
  successRate: number;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push' | 'slack' | 'teams';
  active: boolean;
  priority: number;
}

export interface AlertAnalytics {
  alertType: string;
  totalAlerts: number;
  truePositives: number;
  falsePositives: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export interface AlertFilters {
  teamId?: string;
  userId?: string;
  clientId?: string;
  fromDate?: string;
  toDate?: string;
  alertLevel?: string;
}

export interface AlertsDashboardQuery {
  teamId?: string;
  userId?: string;
  clientId?: string;
  fromDate?: string;
  toDate?: string;
  alertLevel?: string;
  alertType?: string;
  status?: string;
}

export interface AlertHistoryQuery {
  bordereauId?: string;
  userId?: string;
  alertLevel?: string;
  fromDate?: string;
  toDate?: string;
}

export interface AlertHistoryEntry {
  id: string;
  alertType: string;
  alertLevel: 'green' | 'orange' | 'red';
  message: string;
  createdAt: string;
  resolved: boolean;
  resolvedAt?: string;
  bordereauId?: string;
  userId?: string;
  user?: {
    id: string;
    fullName: string;
  };
  bordereau?: {
    id: string;
    reference: string;
  };
}

export interface PriorityBordereau {
  id: string;
  reference: string;
  priority: number;
  alertLevel: 'green' | 'orange' | 'red';
  reason: string;
  daysSinceReception: number;
  slaThreshold: number;
}

export interface ComparativeAnalytics {
  planned: number;
  actual: number;
  gap: number;
}

export interface TeamOverloadAlert {
  team: {
    id: string;
    fullName: string;
    role: string;
  };
  count: number;
  alert: string;
  reason: string;
}