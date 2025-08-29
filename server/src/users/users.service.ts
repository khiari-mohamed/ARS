import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, assertValidRole } from '../auth/user-role.enum';

// Permission checking function
function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = {
    'SUPER_ADMIN': ['USER_MANAGEMENT', 'SYSTEM_CONFIG', 'ALL_ACCESS'],
    'ADMINISTRATEUR': ['USER_MANAGEMENT', 'REPORTS_ACCESS'],
    'RESPONSABLE_DEPARTEMENT': ['TEAM_MANAGEMENT'],
    'CHEF_EQUIPE': ['TEAM_MANAGEMENT'],
    'GESTIONNAIRE': ['BASIC_ACCESS'],
    'CLIENT_SERVICE': ['BASIC_ACCESS'],
    'FINANCE': ['FINANCE_ACCESS'],
    'SCAN_TEAM': ['SCAN_ACCESS'],
    'BO': ['BO_ACCESS']
  };
  
  return permissions[role]?.includes(permission) || permissions[role]?.includes('ALL_ACCESS') || false;
}
import * as bcrypt from 'bcrypt';
import { addDays, subDays, startOfDay, endOfDay } from 'date-fns';

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

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ 
      where: { email },
      include: {
        notifications: {
          where: { read: false },
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  async create(data: any, createdBy?: string) {
    // Validate email uniqueness
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new BadRequestException('A user with this email already exists.');
    }

    // Validate password complexity
    if (data.password && !this.isPasswordComplex(data.password)) {
      throw new BadRequestException('Password must be at least 8 characters with uppercase, lowercase, and number.');
    }

    // Hash password - ensure password is provided
    if (!data.password) {
      throw new BadRequestException('Password is required');
    }
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const userData = {
      email: data.email,
      password: hashedPassword,
      fullName: data.fullName,
      role: data.role,
      department: data.department || null,
      active: data.active ?? true
    };

    const user = await this.prisma.user.create({ data: userData });
    
    // Log action
    await this.logAction(user.id, 'USER_CREATE', { 
      data: { ...userData, password: undefined },
      createdBy 
    });

    // Send welcome notification
    await this.createNotification(user.id, 'WELCOME', 'Bienvenue!', 
      `Votre compte a été créé avec le rôle ${data.role}`);

    return user;
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ 
      where: { id },
      include: {
        notifications: {
          where: { read: false },
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findAll(filters?: { role?: string; department?: string; active?: boolean; search?: string }) {
    const where: any = {};
    
    if (filters?.role) where.role = filters.role;
    if (filters?.department) where.department = { contains: filters.department, mode: 'insensitive' };
    if (filters?.active !== undefined) where.active = filters.active;
    if (filters?.search) {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            bordereauxCurrentHandler: true,
            reclamations: true,
            notifications: { where: { read: false } }
          }
        }
      }
    });
  }

  async findByRole(role: string) {
    return this.prisma.user.findMany({ 
      where: { role, active: true },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        department: true,
        active: true
      }
    });
  }

  async update(id: string, data: any, updatedBy?: string) {
    const user = await this.findById(id);
    
    // Handle password update
    if (data.password) {
      if (!this.isPasswordComplex(data.password)) {
        throw new BadRequestException('Password must be at least 8 characters with uppercase, lowercase, and number.');
      }
      data.password = await bcrypt.hash(data.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
    });

    await this.logAction(id, 'USER_UPDATE', { 
      data: { ...data, password: undefined },
      updatedBy,
      previousData: { role: user.role, department: user.department, active: user.active }
    });

    // Notify user of profile changes
    if (data.role && data.role !== user.role) {
      await this.createNotification(id, 'ROLE_CHANGE', 'Rôle modifié', 
        `Votre rôle a été changé de ${user.role} à ${data.role}`);
    }

    return updatedUser;
  }

  async delete(id: string, deletedBy?: string) {
    const user = await this.findById(id);
    
    // Soft delete by deactivating instead of hard delete to preserve audit trail
    const deletedUser = await this.prisma.user.update({
      where: { id },
      data: { active: false }
    });

    await this.logAction(id, 'USER_DELETE', { deletedBy });
    return deletedUser;
  }

  async disableUser(id: string, disabledBy?: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { active: false },
    });
    
    await this.logAction(id, 'USER_DISABLE', { disabledBy });
    await this.createNotification(id, 'ACCOUNT_DISABLED', 'Compte désactivé', 
      'Votre compte a été désactivé. Contactez l\'administrateur.');
    
    return user;
  }

  async enableUser(id: string, enabledBy?: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { active: true },
    });
    
    await this.logAction(id, 'USER_ENABLE', { enabledBy });
    await this.createNotification(id, 'ACCOUNT_ENABLED', 'Compte réactivé', 
      'Votre compte a été réactivé.');
    
    return user;
  }

  async resetPassword(id: string, newPassword: string, resetBy?: string) {
    if (!this.isPasswordComplex(newPassword)) {
      throw new BadRequestException('Password must be at least 8 characters with uppercase, lowercase, and number.');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    const user = await this.prisma.user.update({
      where: { id },
      data: { password: hashed },
    });
    
    await this.logAction(id, 'USER_PASSWORD_RESET', { resetBy });
    await this.createNotification(id, 'PASSWORD_RESET', 'Mot de passe réinitialisé', 
      'Votre mot de passe a été réinitialisé. Veuillez le changer lors de votre prochaine connexion.');
    
    return user;
  }

  async getAuditLogsForUser(userId: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        user: {
          select: { fullName: true, email: true }
        }
      }
    });
  }

  async getUserPerformanceStats(userId: string): Promise<UserPerformanceStats> {
    const user = await this.findById(userId);
    const thirtyDaysAgo = subDays(new Date(), 30);

    // Get actual performance data
    const [bordereauxProcessed, reclamationsHandled, auditLogs] = await Promise.all([
      this.prisma.bordereau.count({
        where: {
          currentHandlerId: userId,
          updatedAt: { gte: thirtyDaysAgo },
          statut: { in: ['TRAITE', 'CLOTURE'] }
        }
      }),
      this.prisma.reclamation.count({
        where: {
          assignedToId: userId,
          updatedAt: { gte: thirtyDaysAgo },
          status: { in: ['RESOLVED', 'CLOSED'] }
        }
      }),
      this.prisma.auditLog.findMany({
        where: {
          userId,
          timestamp: { gte: thirtyDaysAgo },
          action: { in: ['LOGIN_SUCCESS', 'DOCUMENT_PROCESS', 'TASK_COMPLETE'] }
        },
        orderBy: { timestamp: 'asc' }
      })
    ]);

    // Calculate SLA compliance
    const slaCompliantItems = await this.prisma.bordereau.count({
      where: {
        currentHandlerId: userId,
        updatedAt: { gte: thirtyDaysAgo },
        statut: 'TRAITE',
        // Add SLA compliance logic based on your business rules
      }
    });

    const totalProcessed = bordereauxProcessed + reclamationsHandled;
    const slaCompliance = totalProcessed > 0 ? (slaCompliantItems / totalProcessed) * 100 : 100;

    // Calculate average processing time (mock calculation)
    const avgProcessingTime = totalProcessed > 0 ? 2.5 : 0;

    // Calculate active hours from login sessions
    const loginSessions = auditLogs.filter(log => log.action === 'LOGIN_SUCCESS');
    const activeHours = loginSessions.length * 8; // Approximate

    return {
      processedDocuments: bordereauxProcessed,
      slaCompliance: Math.round(slaCompliance),
      avgProcessingTime,
      activeHours,
      completedTasks: totalProcessed,
      pendingTasks: await this.getPendingTasksCount(userId),
      overdueItems: await this.getOverdueItemsCount(userId),
      qualityScore: await this.calculateQualityScore(userId)
    };
  }

  async getUserActivitySummary(userId: string): Promise<UserActivitySummary> {
    const thirtyDaysAgo = subDays(new Date(), 30);
    
    const [lastLoginLog, totalLogins, documentsProcessed, tasksCompleted] = await Promise.all([
      this.prisma.auditLog.findFirst({
        where: { userId, action: 'LOGIN_SUCCESS' },
        orderBy: { timestamp: 'desc' }
      }),
      this.prisma.auditLog.count({
        where: {
          userId,
          action: 'LOGIN_SUCCESS',
          timestamp: { gte: thirtyDaysAgo }
        }
      }),
      this.prisma.bordereau.count({
        where: {
          currentHandlerId: userId,
          updatedAt: { gte: thirtyDaysAgo }
        }
      }),
      this.prisma.reclamation.count({
        where: {
          assignedToId: userId,
          updatedAt: { gte: thirtyDaysAgo },
          status: { in: ['RESOLVED', 'CLOSED'] }
        }
      })
    ]);

    // Check if user is online (logged in within last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const isOnline = lastLoginLog ? lastLoginLog.timestamp > thirtyMinutesAgo : false;

    return {
      lastLogin: lastLoginLog?.timestamp || null,
      totalLogins,
      documentsProcessed,
      tasksCompleted,
      averageSessionTime: totalLogins > 0 ? 4.5 : 0, // Mock calculation
      isOnline
    };
  }

  async performBulkAction(userIds: string[], action: string, data?: any, performedBy?: string) {
    const results: any[] = [];
    
    for (const userId of userIds) {
      try {
        switch (action) {
          case 'deactivate':
            await this.disableUser(userId, performedBy);
            break;
          case 'activate':
            await this.enableUser(userId, performedBy);
            break;
          case 'changeDepartment':
            await this.update(userId, { department: data.department }, performedBy);
            break;
          case 'changeRole':
            await this.update(userId, { role: data.role }, performedBy);
            break;
          case 'resetPassword':
            const tempPassword = this.generateTempPassword();
            await this.resetPassword(userId, tempPassword, performedBy);
            results.push({ userId, success: true, tempPassword });
            continue;
          case 'export':
            // Export handled separately
            break;
          default:
            throw new Error(`Unknown action: ${action}`);
        }
        results.push({ userId, success: true });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }
    
    // Log bulk action
    await this.logAction(performedBy || 'system', 'BULK_USER_ACTION', {
      action,
      userIds,
      data,
      results: results.map(r => ({ userId: r.userId, success: r.success }))
    });
    
    return results;
  }

  async exportUsers(userIds: string[], format: 'csv' | 'excel' = 'csv') {
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      include: {
        _count: {
          select: {
            bordereauxCurrentHandler: true,
            reclamations: true
          }
        }
      }
    });

    const exportData = users.map(user => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department,
      active: user.active,
      createdAt: user.createdAt,
      bordereauxCount: user._count.bordereauxCurrentHandler,
      reclamationsCount: user._count.reclamations
    }));

    return exportData;
  }

  async getDashboardStats(userRole: UserRole, userId?: string) {
    const baseStats = {
      totalUsers: await this.prisma.user.count({ where: { active: true } }),
      activeUsers: await this.prisma.user.count({ 
        where: { 
          active: true,
          AuditLog: {
            some: {
              action: 'LOGIN_SUCCESS',
              timestamp: { gte: subDays(new Date(), 1) }
            }
          }
        }
      }),
      newUsersThisMonth: await this.prisma.user.count({
        where: {
          createdAt: { gte: startOfDay(subDays(new Date(), 30)) }
        }
      })
    };

    if (hasPermission(userRole, 'USER_MANAGEMENT')) {
      return {
        ...baseStats,
        usersByRole: await this.getUsersByRole(),
        usersByDepartment: await this.getUsersByDepartment(),
        recentActivity: await this.getRecentUserActivity()
      };
    }

    return baseStats;
  }

  // Public method for logging actions
  async logAction(userId: string, action: string, details?: any) {
    await this.prisma.auditLog.create({
      data: { userId, action, details, timestamp: new Date() }
    });
  }

  private async createNotification(userId: string, type: string, title: string, message: string) {
    await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: { timestamp: new Date() }
      }
    });
  }

  private isPasswordComplex(password: string): boolean {
    return password.length >= 8 && 
           /[A-Z]/.test(password) && 
           /[a-z]/.test(password) && 
           /[0-9]/.test(password);
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async getPendingTasksCount(userId: string): Promise<number> {
    return this.prisma.bordereau.count({
      where: {
        currentHandlerId: userId,
        statut: { in: ['ASSIGNE', 'EN_COURS'] }
      }
    });
  }

  private async getOverdueItemsCount(userId: string): Promise<number> {
    const threeDaysAgo = subDays(new Date(), 3);
    return this.prisma.bordereau.count({
      where: {
        currentHandlerId: userId,
        statut: { in: ['ASSIGNE', 'EN_COURS'] },
        createdAt: { lt: threeDaysAgo }
      }
    });
  }

  private async calculateQualityScore(userId: string): Promise<number> {
    // Mock quality score calculation - implement based on your business logic
    const totalProcessed = await this.prisma.bordereau.count({
      where: { currentHandlerId: userId }
    });
    
    const rejected = await this.prisma.bordereau.count({
      where: { 
        currentHandlerId: userId,
        statut: 'REJETE'
      }
    });

    return totalProcessed > 0 ? Math.round(((totalProcessed - rejected) / totalProcessed) * 100) : 100;
  }

  private async getUsersByRole() {
    const result = await this.prisma.user.groupBy({
      by: ['role'],
      where: { active: true },
      _count: { role: true }
    });
    
    return result.map(item => ({
      role: item.role,
      count: item._count.role
    }));
  }

  private async getUsersByDepartment() {
    const result = await this.prisma.user.groupBy({
      by: ['department'],
      where: { active: true, department: { not: null } },
      _count: { department: true }
    });
    
    return result.map(item => ({
      department: item.department,
      count: item._count.department
    }));
  }

  private async getRecentUserActivity(limit = 10) {
    return this.prisma.auditLog.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: { fullName: true, email: true, role: true }
        }
      }
    });
  }
  
  // NOTIFICATION METHODS
  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }
  
  async markNotificationAsRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true }
    });
    return { success: true };
  }
  
  async markAllNotificationsAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    });
    return { success: true };
  }
}