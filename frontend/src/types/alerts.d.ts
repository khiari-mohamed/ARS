export type AlertLevel = 'green' | 'orange' | 'red';

export type AlertType = 'SLA_BREACH' | 'PERFORMANCE' | 'WORKLOAD' | 'CLAIM' | 'SYSTEM';

export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface AlertBordereau {
  id: string;
  statut: string;
  teamId: string;
  clientId: string;
  userId?: string;
  dateReception?: string;
  createdAt: string;
  courriers?: any[];
  virement?: any;
  [key: string]: any;
}

export interface Alert {
  id?: string;
  bordereau: AlertBordereau;
  alertLevel: AlertLevel;
  alertType?: AlertType;
  status?: AlertStatus;
  reason: string;
  assignedToId?: string;
  assignedTo?: {
    id: string;
    fullName: string;
  };
  acknowledgedAt?: string;
  resolvedAt?: string;
  comments?: AlertComment[];
}

export interface AlertComment {
  id: string;
  alertId: string;
  userId: string;
  user?: {
    id: string;
    fullName: string;
  };
  comment: string;
  createdAt: string;
}

export interface TeamOverloadAlert {
  team: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    createdAt: string;
    password?: string;
  };
  count: number;
  alert: AlertLevel;
  reason: string;
}

export interface ReclamationAlert {
  reclamation: any;
  alert: AlertLevel;
  reason: string;
  status: string;
}

export interface DelayPrediction {
  slope: number;
  intercept: number;
  nextWeekForecast: number;
  recommendation: string;
}

export interface PriorityBordereau extends Alert {}

export interface ComparativeAnalytics {
  planned: number;
  actual: number;
  gap: number;
}

export interface AlertHistoryEntry {
  id: string;
  bordereauId?: string;
  documentId?: string;
  userId?: string;
  alertType: string;
  alertLevel: AlertLevel;
  message: string;
  notifiedRoles: string[];
  createdAt: string;
  resolved?: boolean;
  resolvedAt?: string;
  acknowledgedAt?: string;
  bordereau?: AlertBordereau;
  document?: any;
  user?: any;
  comments?: AlertComment[];
}

export interface AlertsDashboardQuery {
  teamId?: string;
  userId?: string;
  clientId?: string;
  alertType?: AlertType;
  status?: AlertStatus;
  fromDate?: string;
  toDate?: string;
}

export interface AlertHistoryQuery {
  bordereauId?: string;
  userId?: string;
  alertLevel?: AlertLevel;
  alertType?: AlertType;
  resolved?: boolean;
  fromDate?: string;
  toDate?: string;
}

export interface CreateAlertDTO {
  bordereauId?: string;
  documentId?: string;
  alertType: AlertType;
  alertLevel: AlertLevel;
  message: string;
  assignedToId?: string;
}

export interface UpdateAlertDTO {
  status?: AlertStatus;
  assignedToId?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}