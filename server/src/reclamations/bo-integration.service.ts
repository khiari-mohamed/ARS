import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';

export interface BOReclamationDTO {
  clientId: string;
  type: 'reclamation';
  reference: string;
  description: string;
  severity: 'low' | 'medium' | 'critical';
  documentIds?: string[];
  bordereauId?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
    preferredContact: 'email' | 'phone' | 'mail';
  };
  evidenceFiles?: Express.Multer.File[];
}

@Injectable()
export class BOIntegrationService {
  private readonly logger = new Logger(BOIntegrationService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService
  ) {}

  // Create reclamation from Bureau d'Ordre
  async createFromBO(dto: BOReclamationDTO, createdBy: string): Promise<any> {
    try {
      // Get client SLA configuration
      const client = await this.prisma.client.findUnique({
        where: { id: dto.clientId },
        include: { contracts: true }
      });

      if (!client) {
        throw new Error('Client not found');
      }

      // Calculate SLA deadline
      const slaDays = client.reclamationDelay || 7;
      const slaDeadline = new Date();
      slaDeadline.setDate(slaDeadline.getDate() + slaDays);

      // Auto-assign based on workload
      const assignedToId = await this.autoAssignGestionnaire();

      // Create reclamation
      const reclamation = await this.prisma.reclamation.create({
        data: {
          clientId: dto.clientId,
          type: dto.type,
          severity: dto.severity,
          status: assignedToId ? 'IN_PROGRESS' : 'OPEN',
          description: dto.description,
          assignedToId,
          createdById: createdBy,
          bordereauId: dto.bordereauId,
          evidencePath: dto.evidenceFiles?.[0]?.path
        }
      });

      // Create history entry
      await this.prisma.reclamationHistory.create({
        data: {
          reclamationId: reclamation.id,
          userId: createdBy,
          action: 'CREATE_FROM_BO',
          toStatus: reclamation.status,
          description: `Réclamation créée depuis le Bureau d'Ordre - Ref: ${dto.reference}`
        }
      });

      // Link documents if provided
      if (dto.documentIds && dto.documentIds.length > 0) {
        for (const docId of dto.documentIds) {
          // Update document to link with reclamation
          await this.prisma.document.update({
            where: { id: docId },
            data: { 
              // Note: We need to add reclamationId field to Document model
              // For now, we'll store it in a different way or create a junction table
            }
          });
        }
      }

      // Generate automatic acknowledgment via GEC
      await this.generateAcknowledgment(reclamation.id, client, dto.contactInfo);

      // Create instant alert/notification
      await this.createInstantAlert(reclamation, client);

      // Trigger SLA monitoring
      await this.setupSLAMonitoring(reclamation.id, slaDeadline);

      this.logger.log(`Reclamation ${reclamation.id} created from BO for client ${client.name}`);

      return {
        ...reclamation,
        reference: dto.reference,
        slaDeadline,
        client: { name: client.name }
      };
    } catch (error) {
      this.logger.error('Failed to create reclamation from BO:', error);
      throw error;
    }
  }

  // Auto-assign to least loaded gestionnaire
  private async autoAssignGestionnaire(): Promise<string | null> {
    try {
      const gestionnaires = await this.prisma.user.findMany({
        where: {
          role: 'GESTIONNAIRE',
          active: true
        }
      });

      if (gestionnaires.length === 0) return null;

      // Calculate current workload for each gestionnaire
      const workloads = await Promise.all(
        gestionnaires.map(async (user) => {
          const count = await this.prisma.reclamation.count({
            where: {
              assignedToId: user.id,
              status: { in: ['OPEN', 'IN_PROGRESS'] }
            }
          });
          return { userId: user.id, workload: count, user };
        })
      );

      // Sort by workload (ascending) and return the least loaded
      workloads.sort((a, b) => a.workload - b.workload);
      return workloads[0].userId;
    } catch (error) {
      this.logger.error('Failed to auto-assign gestionnaire:', error);
      return null;
    }
  }

  // Generate automatic acknowledgment via GEC
  private async generateAcknowledgment(reclamationId: string, client: any, contactInfo?: any) {
    try {
      // Get acknowledgment template
      const template = await this.prisma.template.findFirst({
        where: { name: 'RECLAMATION_ACKNOWLEDGMENT' }
      });

      if (!template) {
        this.logger.warn('No acknowledgment template found');
        return;
      }

      // Replace template variables
      let body = template.body
        .replace('{{CLIENT_NAME}}', client.name)
        .replace('{{RECLAMATION_ID}}', reclamationId)
        .replace('{{SLA_DAYS}}', client.reclamationDelay?.toString() || '7')
        .replace('{{DATE}}', new Date().toLocaleDateString('fr-FR'));

      // Create GEC courrier
      const courrier = await this.prisma.courrier.create({
        data: {
          subject: template.subject.replace('{{RECLAMATION_ID}}', reclamationId),
          body,
          type: 'RECLAMATION',
          templateUsed: template.name,
          status: 'DRAFT',
          uploadedById: 'SYSTEM'
        }
      });

      // If email contact preferred, send immediately
      if (contactInfo?.preferredContact === 'email' && contactInfo.email) {
        await this.notificationService.sendEmail(
          contactInfo.email,
          courrier.subject,
          body
        );

        await this.prisma.courrier.update({
          where: { id: courrier.id },
          data: { 
            status: 'SENT',
            sentAt: new Date()
          }
        });
      }

      this.logger.log(`Acknowledgment generated for reclamation ${reclamationId}`);
    } catch (error) {
      this.logger.error('Failed to generate acknowledgment:', error);
    }
  }

  // Create instant alert for new reclamation
  private async createInstantAlert(reclamation: any, client: any) {
    try {
      // Determine alert level based on severity
      let alertLevel = 'info';
      if (reclamation.severity === 'critical') alertLevel = 'critical';
      else if (reclamation.severity === 'medium') alertLevel = 'warning';

      // Create alert log
      await this.prisma.alertLog.create({
        data: {
          alertType: 'NEW_RECLAMATION',
          alertLevel,
          message: `Nouvelle réclamation de ${client.name} - ${reclamation.severity}`,
          notifiedRoles: ['CHEF_EQUIPE', 'SUPER_ADMIN', 'CLIENT_SERVICE']
        }
      });

      // Notify assigned gestionnaire if any
      if (reclamation.assignedToId) {
        await this.prisma.notification.create({
          data: {
            userId: reclamation.assignedToId,
            type: 'NEW_ASSIGNMENT',
            title: 'Nouvelle réclamation assignée',
            message: `Réclamation de ${client.name} vous a été assignée`,
            data: {
              reclamationId: reclamation.id,
              clientName: client.name,
              severity: reclamation.severity
            }
          }
        });
      }

      // Notify chef d'équipe
      const chefs = await this.prisma.user.findMany({
        where: { role: 'CHEF_EQUIPE' }
      });

      for (const chef of chefs) {
        await this.prisma.notification.create({
          data: {
            userId: chef.id,
            type: 'NEW_RECLAMATION',
            title: 'Nouvelle réclamation',
            message: `Nouvelle réclamation de ${client.name} (${reclamation.severity})`,
            data: {
              reclamationId: reclamation.id,
              clientName: client.name,
              severity: reclamation.severity
            }
          }
        });
      }

      this.logger.log(`Instant alert created for reclamation ${reclamation.id}`);
    } catch (error) {
      this.logger.error('Failed to create instant alert:', error);
    }
  }

  // Setup SLA monitoring for the reclamation
  private async setupSLAMonitoring(reclamationId: string, slaDeadline: Date) {
    try {
      // Create audit log for SLA setup
      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'SLA_MONITORING_SETUP',
          details: {
            reclamationId,
            slaDeadline: slaDeadline.toISOString(),
            monitoringEnabled: true
          }
        }
      });

      this.logger.log(`SLA monitoring setup for reclamation ${reclamationId}, deadline: ${slaDeadline}`);
    } catch (error) {
      this.logger.error('Failed to setup SLA monitoring:', error);
    }
  }

  // Get BO dashboard stats
  async getBOStats(): Promise<any> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const [todayCount, weekCount, monthCount, totalCount] = await Promise.all([
        this.prisma.reclamation.count({
          where: { createdAt: { gte: startOfDay } }
        }),
        this.prisma.reclamation.count({
          where: { createdAt: { gte: startOfWeek } }
        }),
        this.prisma.reclamation.count({
          where: { createdAt: { gte: startOfMonth } }
        }),
        this.prisma.reclamation.count()
      ]);

      // Get recent entries
      const recentEntries = await this.prisma.reclamation.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { name: true } },
          assignedTo: { select: { fullName: true } }
        }
      });

      return {
        counts: {
          today: todayCount,
          week: weekCount,
          month: monthCount,
          total: totalCount
        },
        recentEntries: recentEntries.map(r => ({
          id: r.id,
          clientName: r.client?.name,
          type: r.type,
          severity: r.severity,
          status: r.status,
          assignedTo: r.assignedTo?.fullName,
          createdAt: r.createdAt
        }))
      };
    } catch (error) {
      this.logger.error('Failed to get BO stats:', error);
      return {
        counts: { today: 0, week: 0, month: 0, total: 0 },
        recentEntries: []
      };
    }
  }

  // Validate reclamation data before creation
  async validateReclamationData(dto: BOReclamationDTO): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check if client exists
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId }
    });

    if (!client) {
      errors.push('Client not found');
    }

    // Check if bordereau exists (if provided)
    if (dto.bordereauId) {
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: dto.bordereauId }
      });

      if (!bordereau) {
        errors.push('Bordereau not found');
      }
    }

    // Validate required fields
    if (!dto.description || dto.description.trim().length < 10) {
      errors.push('Description must be at least 10 characters');
    }

    if (!dto.type) {
      errors.push('Type is required');
    }

    if (!['low', 'medium', 'critical'].includes(dto.severity)) {
      errors.push('Invalid severity level');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}