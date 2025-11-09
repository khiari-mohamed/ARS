export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMINISTRATEUR'
  | 'RESPONSABLE_DEPARTEMENT'
  | 'CHEF_EQUIPE'
  | 'GESTIONNAIRE_SENIOR'
  | 'GESTIONNAIRE'
  | 'CLIENT_SERVICE'
  | 'FINANCE'
  | 'SCAN_TEAM'
  | 'BO';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  department?: string;
  departmentId?: string;
  team?: string;
  phone?: string;
  photo?: string;
  position?: string;
  active: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  permissions?: string[];
  assignedClients?: string[];
  unreadNotifications?: number;
  activeTasksCount?: number;
  reclamationsCount?: number;
  performanceStats?: UserPerformanceStats;
  activitySummary?: UserActivitySummary;
  _count?: {
    notifications?: number;
    bordereauxCurrentHandler?: number;
    reclamations?: number;
  };
}

export interface UserFilters {
  role?: UserRole;
  department?: string;
  active?: boolean;
  search?: string;
}

export interface CreateUserDto {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  department?: string;
  departmentId?: string;
  team?: string;
  phone?: string;
  position?: string;
  photo?: string;
  permissions?: string[];
  assignedClients?: string[];
  active?: boolean;
}

export interface UpdateUserDto {
  fullName?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  department?: string;
  departmentId?: string;
  team?: string;
  phone?: string;
  position?: string;
  photo?: string;
  permissions?: string[];
  assignedClients?: string[];
  active?: boolean;
}

export interface UserPerformanceStats {
  processedDocuments: number;
  slaCompliance: number;
  avgProcessingTime: number;
  activeHours: number;
  completedTasks: number;
  pendingTasks: number;
  overdueItems: number;
  qualityScore: number;
}

export interface UserActivitySummary {
  lastLogin: Date | null;
  totalLogins: number;
  documentsProcessed: number;
  tasksCompleted: number;
  averageSessionTime: number;
  isOnline: boolean;
}

export interface UserDashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  usersByRole: { role: string; count: number }[];
  usersByDepartment: { department: string; count: number }[];
  recentActivity: AuditLog[];
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  details?: any;
  timestamp: string;
  user?: {
    fullName: string;
    email: string;
    role: string;
  };
}

export interface BulkActionResult {
  userId: string;
  success: boolean;
  error?: string;
  tempPassword?: string;
}

export interface UserNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
}

// Role labels for display
export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Administrateur',
  ADMINISTRATEUR: 'Administrateur',
  RESPONSABLE_DEPARTEMENT: 'Responsable Département',
  CHEF_EQUIPE: 'Chef d\'Équipe',
  GESTIONNAIRE_SENIOR: 'Gestionnaire Senior',
  GESTIONNAIRE: 'Gestionnaire',
  CLIENT_SERVICE: 'Service Client',
  FINANCE: 'Finance',
  SCAN_TEAM: 'Équipe Scan',
  BO: 'Bureau d\'Ordre'
};

// Department options - now loaded dynamically from database
export const DEPARTMENTS: string[] = [];