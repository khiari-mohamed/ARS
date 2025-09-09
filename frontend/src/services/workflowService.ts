import { LocalAPI } from './axios';

const apiRequest = async (url: string, options?: RequestInit) => {
  const response = await LocalAPI.get(url.replace(process.env.REACT_APP_API_URL || 'http://localhost:3001', ''), {
    method: options?.method || 'GET',
    data: options?.body ? JSON.parse(options.body as string) : undefined
  });
  return response.data;
};

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export interface WorkflowNotification {
  id: string;
  fromService: string;
  toService: string;
  bordereauId?: string;
  documentId?: string;
  message: string;
  type: string;
  status: string;
  sentAt: string;
  readAt?: string;
  bordereau?: {
    reference: string;
  };
  document?: {
    name: string;
  };
}

export interface WorkloadStats {
  userId: string;
  fullName: string;
  role: string;
  currentLoad: number;
  capacity: number;
  utilizationRate: number;
  isOverloaded: boolean;
}

export interface ReassignmentSuggestion {
  bordereauId: string;
  reference: string;
  currentAssignee: string;
  suggestedAssignee: string;
  reason: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Get workflow notifications
 */
export const fetchWorkflowNotifications = async (filters?: {
  toService?: string;
  userId?: string;
  status?: string;
  limit?: number;
}): Promise<WorkflowNotification[]> => {
  const params = new URLSearchParams();
  if (filters?.toService) params.append('toService', filters.toService);
  if (filters?.userId) params.append('userId', filters.userId);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const queryString = params.toString();
  const url = `${API_BASE}/workflow/notifications${queryString ? `?${queryString}` : ''}`;
  
  return apiRequest(url);
};

/**
 * Mark workflow notification as read
 */
export const markWorkflowNotificationAsRead = async (notificationId: string): Promise<{ success: boolean }> => {
  return apiRequest(`${API_BASE}/workflow/notifications/${notificationId}/read`, {
    method: 'POST'
  });
};

/**
 * Get team workload overview
 */
export const fetchTeamWorkloadOverview = async (): Promise<{
  teams: any[];
  overloadedTeams: any[];
  totalWorkload: number;
  averageUtilization: number;
}> => {
  return apiRequest(`${API_BASE}/workflow/workload/overview`);
};

/**
 * Get workload alerts
 */
export const fetchWorkloadAlerts = async (): Promise<{
  overloadedUsers: WorkloadStats[];
  underutilizedUsers: WorkloadStats[];
  criticalAlerts: number;
}> => {
  return apiRequest(`${API_BASE}/workflow/workload/alerts`);
};

/**
 * Get reassignment suggestions
 */
export const fetchReassignmentSuggestions = async (): Promise<{
  suggestions: ReassignmentSuggestion[];
  totalSuggestions: number;
}> => {
  return apiRequest(`${API_BASE}/workflow/workload/suggestions`);
};

/**
 * Auto-assign a bordereau
 */
export const autoAssignBordereau = async (bordereauId: string): Promise<{
  success: boolean;
  assignedTo?: string;
  reason?: string;
  error?: string;
}> => {
  return apiRequest(`${API_BASE}/workflow/assign/${bordereauId}`, {
    method: 'POST'
  });
};

/**
 * Update user capacity
 */
export const updateUserCapacity = async (userId: string, capacity: number): Promise<{ success: boolean }> => {
  return apiRequest(`${API_BASE}/workflow/users/${userId}/capacity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ capacity })
  });
};

/**
 * Check team overload (manual trigger)
 */
export const checkTeamOverload = async (): Promise<{ success: boolean; message: string }> => {
  return apiRequest(`${API_BASE}/workflow/check-overload`, {
    method: 'POST'
  });
};

/**
 * Trigger SLA breach notification (for testing)
 */
export const triggerSLABreach = async (
  bordereauId: string, 
  reference: string, 
  daysOverdue: number
): Promise<{ success: boolean; message: string }> => {
  return apiRequest(`${API_BASE}/workflow/sla-breach/${bordereauId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reference, daysOverdue })
  });
};