export type AlertLevel = 'green' | 'orange' | 'red';

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
  bordereau: AlertBordereau;
  alertLevel: AlertLevel;
  reason: string;
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
  bordereau?: AlertBordereau;
  document?: any;
  user?: any;
}

export interface AlertsDashboardQuery {
  teamId?: string;
  userId?: string;
  clientId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface AlertHistoryQuery {
  bordereauId?: string;
  userId?: string;
  alertLevel?: AlertLevel;
  fromDate?: string;
  toDate?: string;
}