import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SystemHealthMetrics {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeConnections: number;
  responseTime: number;
}

export interface QueueOverview {
  name: string;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  avgProcessingTime: number;
}

export interface SLAConfiguration {
  id: string;
  name: string;
  clientId?: string;
  documentType: string;
  thresholds: {
    warning: number;
    critical: number;
    breach: number;
  };
  active: boolean;
}

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(private prisma: PrismaService) {}

  async getSystemHealth(): Promise<SystemHealthMetrics> {
    try {
      // SYNTHETIC DATA - COMMENTED OUT
      // const cpuUsage = Math.random() * 30 + 20;
      // const memoryUsage = Math.random() * 40 + 30;
      // const diskUsage = Math.random() * 20 + 40;
      
      // let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      // if (cpuUsage > 80 || memoryUsage > 85 || diskUsage > 90) {
      //   status = 'critical';
      // } else if (cpuUsage > 60 || memoryUsage > 70 || diskUsage > 80) {
      //   status = 'warning';
      // }

      // return {
      //   status,
      //   uptime: process.uptime(),
      //   cpuUsage,
      //   memoryUsage,
      //   diskUsage,
      //   activeConnections: Math.floor(Math.random() * 50) + 10,
      //   responseTime: Math.random() * 100 + 50
      // };
      
      // TODO: Use real system metrics from super-admin.controller.ts
      throw new Error('Use super-admin.controller.ts getSystemHealth() instead');
    } catch (error) {
      this.logger.error('Failed to get system health:', error);
      return {
        status: 'critical',
        uptime: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        activeConnections: 0,
        responseTime: 0
      };
    }
  }

  async getAllQueuesOverview(): Promise<QueueOverview[]> {
    try {
      // SYNTHETIC DATA - COMMENTED OUT
      // const queues = [
      //   'BO_ENTRY_QUEUE',
      //   'SCAN_QUEUE',
      //   'OCR_QUEUE',
      //   'PROCESSING_QUEUE',
      //   'VALIDATION_QUEUE',
      //   'NOTIFICATION_QUEUE'
      // ];

      // const queueOverviews: QueueOverview[] = [];

      // for (const queueName of queues) {
      //   const pending = Math.floor(Math.random() * 20);
      //   const processing = Math.floor(Math.random() * 5);
      //   const completed = Math.floor(Math.random() * 100) + 50;
      //   const failed = Math.floor(Math.random() * 5);

      //   queueOverviews.push({
      //     name: queueName,
      //     pending,
      //     processing,
      //     completed,
      //     failed,
      //     avgProcessingTime: Math.random() * 300 + 60
      //   });
      // }

      // return queueOverviews;
      
      // TODO: Use real queue data from super-admin.controller.ts
      throw new Error('Use super-admin.controller.ts getQueuesOverview() instead');
    } catch (error) {
      this.logger.error('Failed to get queues overview:', error);
      return [];
    }
  }

  async getSystemPerformanceMetrics(period: string = '24h') {
    try {
      // SYNTHETIC DATA - COMMENTED OUT
      // const hours = period === '24h' ? 24 : period === '7d' ? 168 : 720;
      // const metrics: any[] = [];

      // for (let i = 0; i < hours; i++) {
      //   const timestamp = new Date(Date.now() - (hours - i) * 60 * 60 * 1000);
      //   metrics.push({
      //     timestamp: timestamp.toISOString(),
      //     throughput: Math.floor(Math.random() * 50) + 20,
      //     responseTime: Math.random() * 200 + 100,
      //     errorRate: Math.random() * 5,
      //     activeUsers: Math.floor(Math.random() * 30) + 10
      //   });
      // }

      // return metrics;
      
      // TODO: Use real performance metrics from super-admin.controller.ts
      throw new Error('Use super-admin.controller.ts getPerformanceMetrics() instead');
    } catch (error) {
      this.logger.error('Failed to get performance metrics:', error);
      return [];
    }
  }

  async getSLAConfigurations(): Promise<SLAConfiguration[]> {
    try {
      // HARDCODED DATA - COMMENTED OUT
      // return [
      //   {
      //     id: 'sla_default',
      //     name: 'SLA Standard',
      //     documentType: 'BS',
      //     thresholds: {
      //       warning: 5,
      //       critical: 7,
      //       breach: 10
      //     },
      //     active: true
      //   },
      //   {
      //     id: 'sla_urgent',
      //     name: 'SLA Urgent',
      //     documentType: 'BS_URGENT',
      //     thresholds: {
      //       warning: 2,
      //       critical: 3,
      //       breach: 5
      //     },
      //     active: true
      //   }
      // ];
      
      // TODO: Use real SLA configurations from super-admin.controller.ts
      throw new Error('Use super-admin.controller.ts getSLAConfigurations() instead');
    } catch (error) {
      this.logger.error('Failed to get SLA configurations:', error);
      return [];
    }
  }

  async createSLAConfiguration(config: Omit<SLAConfiguration, 'id'>): Promise<SLAConfiguration> {
    try {
      const newConfig = {
        id: `sla_${Date.now()}`,
        ...config
      };

      await this.prisma.auditLog.create({
        data: {
          userId: 'SUPER_ADMIN',
          action: 'SLA_CONFIG_CREATED',
          details: newConfig
        }
      });

      return newConfig;
    } catch (error) {
      this.logger.error('Failed to create SLA configuration:', error);
      throw error;
    }
  }

  async updateSLAConfiguration(id: string, updates: Partial<SLAConfiguration>): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: 'SUPER_ADMIN',
          action: 'SLA_CONFIG_UPDATED',
          details: { id, updates }
        }
      });
    } catch (error) {
      this.logger.error('Failed to update SLA configuration:', error);
      throw error;
    }
  }

  async deleteSLAConfiguration(id: string): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: 'SUPER_ADMIN',
          action: 'SLA_CONFIG_DELETED',
          details: { id }
        }
      });
    } catch (error) {
      this.logger.error('Failed to delete SLA configuration:', error);
      throw error;
    }
  }

  async getSystemConfiguration() {
    try {
   
      // TODO: Use real system configuration from super-admin.controller.ts
      throw new Error('Use super-admin.controller.ts getSystemConfiguration() instead');
    } catch (error) {
      this.logger.error('Failed to get system configuration:', error);
      throw error;
    }
  }

  async updateSystemConfiguration(updates: any): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: 'SUPER_ADMIN',
          action: 'SYSTEM_CONFIG_UPDATED',
          details: updates
        }
      });
    } catch (error) {
      this.logger.error('Failed to update system configuration:', error);
      throw error;
    }
  }

  async testEmailConfiguration(config: any): Promise<boolean> {
    try {
      // SYNTHETIC DATA - COMMENTED OUT
      // this.logger.log('Testing email configuration...');
      // await new Promise(resolve => setTimeout(resolve, 1000));
      // return Math.random() > 0.1;
      
      // TODO: Use real email test from super-admin.controller.ts
      throw new Error('Use super-admin.controller.ts testEmailConfiguration() instead');
    } catch (error) {
      this.logger.error('Email test failed:', error);
      return false;
    }
  }

  async testSMSConfiguration(config: any): Promise<boolean> {
    try {
  
      // TODO: Use real SMS test from super-admin.controller.ts
      throw new Error('Use super-admin.controller.ts testSMSConfiguration() instead');
    } catch (error) {
      this.logger.error('SMS test failed:', error);
      return false;
    }
  }

  async getAllUsers(filters?: any) {
    try {
      const users = await this.prisma.user.findMany({
        where: filters,
        orderBy: { createdAt: 'desc' }
      });

      return users.map(user => ({
        ...user,
        password: undefined
      }));
    } catch (error) {
      this.logger.error('Failed to get users:', error);
      return [];
    }
  }

  async bulkCreateUsers(users: any[]): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const userData of users) {
      try {
        await this.prisma.user.create({
          data: {
            ...userData,
            password: 'default123',
            createdAt: new Date()
          }
        });
        success++;
      } catch (error) {
        failed++;
        errors.push(`Failed to create user ${userData.email}: ${error.message}`);
      }
    }

    await this.prisma.auditLog.create({
      data: {
        userId: 'SUPER_ADMIN',
        action: 'BULK_USER_CREATE',
        details: { success, failed, total: users.length }
      }
    });

    return { success, failed, errors };
  }

  async bulkUpdateUsers(updates: { userId: string; data: any }[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const update of updates) {
      try {
        await this.prisma.user.update({
          where: { id: update.userId },
          data: update.data
        });
        success++;
      } catch (error) {
        failed++;
        this.logger.error(`Failed to update user ${update.userId}:`, error);
      }
    }

    await this.prisma.auditLog.create({
      data: {
        userId: 'SUPER_ADMIN',
        action: 'BULK_USER_UPDATE',
        details: { success, failed, total: updates.length }
      }
    });

    return { success, failed };
  }

  async bulkDeleteUsers(userIds: string[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        await this.prisma.user.delete({
          where: { id: userId }
        });
        success++;
      } catch (error) {
        failed++;
        this.logger.error(`Failed to delete user ${userId}:`, error);
      }
    }

    await this.prisma.auditLog.create({
      data: {
        userId: 'SUPER_ADMIN',
        action: 'BULK_USER_DELETE',
        details: { success, failed, total: userIds.length }
      }
    });

    return { success, failed };
  }

  async getRoleTemplates() {
   
    
    // TODO: Use real role templates from super-admin.controller.ts
    throw new Error('Use super-admin.controller.ts getRoleTemplates() instead');
  }

  async createUserFromTemplate(templateId: string, userData: any) {
    try {
     
      // TODO: Use real implementation from super-admin.controller.ts
      throw new Error('Use super-admin.controller.ts createUserFromTemplate() instead');
    } catch (error) {
      this.logger.error('Failed to create user from template:', error);
      throw error;
    }
  }

  async getSystemLogs(filters?: any) {
    try {
      return this.prisma.auditLog.findMany({
        where: filters,
        orderBy: { timestamp: 'desc' },
        take: 1000,
        include: {
          user: {
            select: { id: true, fullName: true, email: true }
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to get system logs:', error);
      return [];
    }
  }

  async getSystemStats() {
    try {
      const [
        totalUsers,
        activeUsers,
        totalBordereaux,
        processingBordereaux,
        totalDocuments,
        systemErrors
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { active: true } }),
        this.prisma.bordereau.count({ where: { archived: false } }),
        this.prisma.bordereau.count({ where: { statut: { in: ['ASSIGNE', 'EN_COURS'] } } }),
        this.prisma.document.count(),
        this.prisma.auditLog.count({ where: { action: { contains: 'ERROR' } } })
      ]);

      return {
        users: { total: totalUsers, active: activeUsers },
        bordereaux: { total: totalBordereaux, processing: processingBordereaux },
        documents: { total: totalDocuments },
        errors: { total: systemErrors }
      };
    } catch (error) {
      this.logger.error('Failed to get system stats:', error);
      return {
        users: { total: 0, active: 0 },
        bordereaux: { total: 0, processing: 0 },
        documents: { total: 0 },
        errors: { total: 0 }
      };
    }
  }

  async getTeamWorkload() {
    try {
      const users = await this.prisma.user.findMany({
        where: { active: true },
        orderBy: { fullName: 'asc' }
      });

      const chefEquipes = users.filter(u => u.role === 'CHEF_EQUIPE');
      const seniors = users.filter(u => u.role === 'GESTIONNAIRE_SENIOR');
      const responsables = users.filter(u => u.role === 'RESPONSABLE_DEPARTEMENT');

      const teams: any[] = [];

      // Chef d'équipe teams
      for (const chef of chefEquipes) {
        const members = users.filter(u => u.teamLeaderId === chef.id);
        
        const chefDocuments = await this.prisma.document.count({
          where: { assignedToUserId: chef.id }
        });

        let totalMembersDocuments = 0;
        for (const member of members) {
          const count = await this.prisma.document.count({
            where: { assignedToUserId: member.id }
          });
          totalMembersDocuments += count;
        }

        const totalWorkload = chefDocuments + totalMembersDocuments;
        const totalCapacity = (chef.capacity || 400) + members.reduce((sum, m) => sum + (m.capacity || 50), 0);
        const utilizationRate = totalCapacity > 0 ? Math.round((totalWorkload / totalCapacity) * 100) : 0;

        let level = 'NORMAL';
        let color = 'success';
        if (utilizationRate >= 90) {
          level = 'OVERLOADED';
          color = 'error';
        } else if (utilizationRate >= 70) {
          level = 'BUSY';
          color = 'warning';
        }

        teams.push({
          id: chef.id,
          name: `Équipe ${chef.fullName}`,
          role: 'CHEF_EQUIPE',
          workload: totalWorkload,
          capacity: totalCapacity,
          utilizationRate,
          level,
          color
        });
      }

      // Individual teams (GESTIONNAIRE_SENIOR)
      for (const senior of seniors) {
        // GESTIONNAIRE_SENIOR gets documents via contract.teamLeaderId
        // this.logger.log(`🔍 Checking GESTIONNAIRE_SENIOR: ${senior.fullName} (${senior.id})`);
        
        const documents = await this.prisma.document.count({
          where: {
            bordereau: {
              archived: false,
              contract: {
                teamLeaderId: senior.id
              }
            }
          }
        });
        
        // this.logger.log(`📄 ${senior.fullName}: ${documents} documents via contract.teamLeaderId`);

        const capacity = senior.capacity || 50;
        const utilizationRate = capacity > 0 ? Math.round((documents / capacity) * 100) : 0;

        let level = 'NORMAL';
        let color = 'success';
        if (utilizationRate >= 90) {
          level = 'OVERLOADED';
          color = 'error';
        } else if (utilizationRate >= 70) {
          level = 'BUSY';
          color = 'warning';
        }

        teams.push({
          id: senior.id,
          name: senior.fullName,
          role: 'GESTIONNAIRE_SENIOR',
          workload: documents,
          capacity,
          utilizationRate,
          level,
          color
        });
      }

      // Individual teams (RESPONSABLE_DEPARTEMENT)
      for (const resp of responsables) {
        const documents = await this.prisma.document.count({
          where: { assignedToUserId: resp.id }
        });

        const capacity = resp.capacity || 20;
        const utilizationRate = capacity > 0 ? Math.round((documents / capacity) * 100) : 0;

        let level = 'NORMAL';
        let color = 'success';
        if (utilizationRate >= 90) {
          level = 'OVERLOADED';
          color = 'error';
        } else if (utilizationRate >= 70) {
          level = 'BUSY';
          color = 'warning';
        }

        teams.push({
          id: resp.id,
          name: resp.fullName,
          role: 'RESPONSABLE_DEPARTEMENT',
          workload: documents,
          capacity,
          utilizationRate,
          level,
          color
        });
      }

      return teams;
    } catch (error) {
      this.logger.error('Failed to get team workload:', error);
      return [];
    }
  }
}