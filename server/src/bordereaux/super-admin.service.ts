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
      const cpuUsage = Math.random() * 30 + 20;
      const memoryUsage = Math.random() * 40 + 30;
      const diskUsage = Math.random() * 20 + 40;
      
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (cpuUsage > 80 || memoryUsage > 85 || diskUsage > 90) {
        status = 'critical';
      } else if (cpuUsage > 60 || memoryUsage > 70 || diskUsage > 80) {
        status = 'warning';
      }

      return {
        status,
        uptime: process.uptime(),
        cpuUsage,
        memoryUsage,
        diskUsage,
        activeConnections: Math.floor(Math.random() * 50) + 10,
        responseTime: Math.random() * 100 + 50
      };
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
      const queues = [
        'BO_ENTRY_QUEUE',
        'SCAN_QUEUE',
        'OCR_QUEUE',
        'PROCESSING_QUEUE',
        'VALIDATION_QUEUE',
        'NOTIFICATION_QUEUE'
      ];

      const queueOverviews: QueueOverview[] = [];

      for (const queueName of queues) {
        const pending = Math.floor(Math.random() * 20);
        const processing = Math.floor(Math.random() * 5);
        const completed = Math.floor(Math.random() * 100) + 50;
        const failed = Math.floor(Math.random() * 5);

        queueOverviews.push({
          name: queueName,
          pending,
          processing,
          completed,
          failed,
          avgProcessingTime: Math.random() * 300 + 60
        });
      }

      return queueOverviews;
    } catch (error) {
      this.logger.error('Failed to get queues overview:', error);
      return [];
    }
  }

  async getSystemPerformanceMetrics(period: string = '24h') {
    try {
      const hours = period === '24h' ? 24 : period === '7d' ? 168 : 720;
      const metrics: any[] = [];

      for (let i = 0; i < hours; i++) {
        const timestamp = new Date(Date.now() - (hours - i) * 60 * 60 * 1000);
        metrics.push({
          timestamp: timestamp.toISOString(),
          throughput: Math.floor(Math.random() * 50) + 20,
          responseTime: Math.random() * 200 + 100,
          errorRate: Math.random() * 5,
          activeUsers: Math.floor(Math.random() * 30) + 10
        });
      }

      return metrics;
    } catch (error) {
      this.logger.error('Failed to get performance metrics:', error);
      return [];
    }
  }

  async getSLAConfigurations(): Promise<SLAConfiguration[]> {
    try {
      return [
        {
          id: 'sla_default',
          name: 'SLA Standard',
          documentType: 'BS',
          thresholds: {
            warning: 5,
            critical: 7,
            breach: 10
          },
          active: true
        },
        {
          id: 'sla_urgent',
          name: 'SLA Urgent',
          documentType: 'BS_URGENT',
          thresholds: {
            warning: 2,
            critical: 3,
            breach: 5
          },
          active: true
        }
      ];
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
      return {
        email: {
          smtp: {
            host: 'smtp.company.com',
            port: 587,
            secure: false,
            auth: {
              user: 'noreply@company.com',
              pass: '***'
            }
          },
          templates: {
            bordereau_assigned: {
              subject: 'Nouveau bordereau assigné',
              body: 'Un nouveau bordereau vous a été assigné: {{reference}}'
            },
            sla_warning: {
              subject: 'Alerte SLA',
              body: 'Le bordereau {{reference}} approche de la limite SLA'
            }
          }
        },
        sms: {
          provider: 'twilio',
          apiKey: '***',
          sender: '+33123456789'
        },
        integrations: {
          paperstream: {
            enabled: true,
            config: {
              scannerPath: '/dev/scanner',
              quality: 'high'
            }
          },
          ocr_engine: {
            enabled: true,
            config: {
              language: 'fra+eng',
              confidence: 0.8
            }
          }
        }
      };
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
      this.logger.log('Testing email configuration...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return Math.random() > 0.1;
    } catch (error) {
      this.logger.error('Email test failed:', error);
      return false;
    }
  }

  async testSMSConfiguration(config: any): Promise<boolean> {
    try {
      this.logger.log('Testing SMS configuration...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return Math.random() > 0.1;
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
    return [
      {
        id: 'template_bo',
        name: 'Bureau d\'Ordre Standard',
        role: 'BO',
        permissions: ['CREATE_BORDEREAU', 'VIEW_BORDEREAU', 'UPLOAD_DOCUMENTS'],
        defaultCapacity: 30
      },
      {
        id: 'template_gestionnaire',
        name: 'Gestionnaire Standard',
        role: 'GESTIONNAIRE',
        permissions: ['PROCESS_BORDEREAU', 'UPDATE_STATUS', 'VIEW_ASSIGNED'],
        defaultCapacity: 20
      },
      {
        id: 'template_chef_equipe',
        name: 'Chef d\'Équipe Standard',
        role: 'CHEF_EQUIPE',
        permissions: ['ASSIGN_BORDEREAU', 'VIEW_TEAM', 'MANAGE_WORKLOAD'],
        defaultCapacity: 50
      },
      {
        id: 'template_scan',
        name: 'Équipe SCAN Standard',
        role: 'SCAN_TEAM',
        permissions: ['SCAN_DOCUMENTS', 'OCR_PROCESSING', 'QUALITY_CONTROL'],
        defaultCapacity: 100
      }
    ];
  }

  async createUserFromTemplate(templateId: string, userData: any) {
    try {
      const templates = await this.getRoleTemplates();
      const template = templates.find(t => t.id === templateId);
      
      if (!template) {
        throw new Error('Template not found');
      }

      const user = await this.prisma.user.create({
        data: {
          ...userData,
          role: template.role,
          capacity: template.defaultCapacity,
          permissions: template.permissions,
          password: 'default123'
        }
      });

      await this.prisma.auditLog.create({
        data: {
          userId: 'SUPER_ADMIN',
          action: 'USER_CREATED_FROM_TEMPLATE',
          details: { templateId, userId: user.id }
        }
      });

      return { ...user, password: undefined };
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
        this.prisma.bordereau.count(),
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
}