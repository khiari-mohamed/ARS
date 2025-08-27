import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourrierDto, CourrierType } from './dto/create-courrier.dto';
import { SearchCourrierDto, CourrierStatus } from './dto/search-courrier.dto';
import { UpdateCourrierStatusDto } from './dto/update-courrier-status.dto';
import { SendCourrierDto } from './dto/send-courrier.dto';
import { GedService } from '../ged/ged.service';
import { OutlookService } from '../integrations/outlook.service';
import { TemplateService } from './template.service';
import { MailTrackingService } from './mail-tracking.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as nodemailer from 'nodemailer';

@Injectable()
export class GecService {
  private readonly logger = new Logger(GecService.name);
  private transporter: nodemailer.Transporter;
  
  constructor(
    private prisma: PrismaService,
    private gedService: GedService,
    private outlookService: OutlookService,
    private templateService: TemplateService,
    private mailTrackingService: MailTrackingService,
  ) {
    this.initializeEmailTransporter();
  }

  private initializeEmailTransporter() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gnet.tn',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true' || true,
      auth: {
        user: process.env.SMTP_USER || 'noreply@arstunisia.com',
        pass: process.env.SMTP_PASS || 'NR*ars2025**##'
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async createCourrier(dto: CreateCourrierDto, user: any) {
    // Only Gestionnaire, Admin, Super Admin can create
    if (!['GESTIONNAIRE', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to create courriers');
    }
    const created = await this.prisma.courrier.create({
      data: {
        ...dto,
        status: 'DRAFT',
        uploadedById: user.id,
      },
    });
    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE_COURRIER',
        details: { dto },
      },
    });
    return created;
  }

  async sendCourrier(id: string, dto: SendCourrierDto, user: any) {
    const courrier = await this.prisma.courrier.findUnique({ 
      where: { id },
      include: { bordereau: { include: { client: true } } }
    });
    if (!courrier) throw new NotFoundException('Courrier not found');
    if (courrier.status !== 'DRAFT') throw new ForbiddenException('Only DRAFT courriers can be sent');
    
    // Render template if templateUsed is set
    let subject = courrier.subject;
    let body = courrier.body;
    if (courrier.templateUsed) {
      try {
        const tpl = await this.templateService.getTemplate(courrier.templateUsed);
        const variables = { 
          subject: courrier.subject, 
          clientName: courrier.bordereau?.client?.name || 'Client',
          bordereauRef: courrier.bordereau?.reference || '',
          date: new Date().toLocaleDateString('fr-FR'),
          ...dto 
        };
        subject = this.templateService.renderTemplate(tpl.subject, variables);
        body = this.templateService.renderTemplate(tpl.body, variables);
      } catch (e) {
        this.logger.warn(`Template not found: ${courrier.templateUsed}`);
      }
    }
    
    let messageId = null;
    // Send email if recipientEmail is provided
    if (dto.recipientEmail) {
      try {
        // Try Outlook first, fallback to SMTP
        if (this.outlookService.isConnected()) {
          await this.outlookService.sendMail(dto.recipientEmail, subject, body);
        } else {
          const mailOptions = {
            from: process.env.SMTP_FROM || 'ARS Tunisia <noreply@arstunisia.com>',
            to: dto.recipientEmail,
            subject: subject,
            html: body,
            text: body.replace(/<[^>]*>/g, '') // Strip HTML for text version
          };
          
          const result = await this.transporter.sendMail(mailOptions);
          messageId = result.messageId;
          
          // Track email delivery
          if (messageId) {
            await this.mailTrackingService.trackDelivery(
              messageId, 
              dto.recipientEmail, 
              'sent',
              { courrierId: id, subject }
            );
          }
        }
        
        this.logger.log(`Email sent successfully to ${dto.recipientEmail}`);
      } catch (error) {
        this.logger.error(`Failed to send email: ${error.message}`);
        // Update status to FAILED
        await this.prisma.courrier.update({
          where: { id },
          data: { status: 'FAILED' },
        });
        throw new Error(`Failed to send email: ${error.message}`);
      }
    }
    
    this.logger.log(`Sending courrier to ${dto.recipientEmail || 'N/A'}: ${subject}`);
    
    // Archive in GED
    try {
      await this.gedService.uploadDocument(
        {
          originalname: courrier.subject + '.html',
          path: `archived_courriers/${courrier.id}.html`,
          buffer: Buffer.from(body, 'utf8')
        } as any,
        {
          name: courrier.subject,
          type: 'courrier',
          bordereauId: courrier.bordereauId ?? undefined,
        },
        user,
      );
    } catch (error) {
      this.logger.warn(`Failed to archive courrier: ${error.message}`);
    }
    
    // Update status
    const updated = await this.prisma.courrier.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });
    
    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'SEND_COURRIER',
        details: { 
          courrierId: id, 
          recipientEmail: dto.recipientEmail,
          messageId,
          subject 
        },
      },
    });
    
    return updated;
  }

  async searchCourriers(query: SearchCourrierDto, user: any) {
    const where: any = {};
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.bordereauId) where.bordereauId = query.bordereauId;
    if (query.createdAfter || query.createdBefore) {
      where.createdAt = {};
      if (query.createdAfter) where.createdAt.gte = new Date(query.createdAfter);
      if (query.createdBefore) where.createdAt.lte = new Date(query.createdBefore);
    }
    // Gestionnaire: only their own
    if (user.role === 'GESTIONNAIRE') {
      where.uploadedById = user.id;
    }
    return this.prisma.courrier.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCourrierById(id: string, user: any) {
    const courrier = await this.prisma.courrier.findUnique({ where: { id } });
    if (!courrier) throw new NotFoundException('Courrier not found');
    if (user.role === 'GESTIONNAIRE' && courrier.uploadedById !== user.id) {
      throw new ForbiddenException('You do not have access to this courrier');
    }
    return courrier;
  }

  async updateCourrierStatus(id: string, dto: UpdateCourrierStatusDto, user: any) {
    const courrier = await this.prisma.courrier.findUnique({ where: { id } });
    if (!courrier) throw new NotFoundException('Courrier not found');
    // Only Admin/Super Admin or owner can update
    if (
      !['ADMIN', 'SUPER_ADMIN'].includes(user.role) &&
      courrier.uploadedById !== user.id
    ) {
      throw new ForbiddenException('You do not have permission to update this courrier');
    }
    const updated = await this.prisma.courrier.update({
      where: { id },
      data: {
        status: dto.status,
        responseAt: dto.status === 'RESPONDED' ? new Date() : undefined,
      },
    });
    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_COURRIER_STATUS',
        details: { courrierId: id, newStatus: dto.status },
      },
    });
    return updated;
  }

  async deleteCourrier(id: string, user: any) {
    const courrier = await this.prisma.courrier.findUnique({ where: { id } });
    if (!courrier) throw new NotFoundException('Courrier not found');
    if (courrier.status !== 'DRAFT') throw new ForbiddenException('Only DRAFT courriers can be deleted');
    if (
      !['ADMIN', 'SUPER_ADMIN'].includes(user.role) &&
      courrier.uploadedById !== user.id
    ) {
      throw new ForbiddenException('You do not have permission to delete this courrier');
    }
    const deleted = await this.prisma.courrier.delete({ where: { id } });
    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE_COURRIER',
        details: { courrierId: id },
      },
    });
    return deleted;
  }

  // Template logic: inject variables into body
  renderTemplate(body: string, variables: Record<string, string>) {
    return body.replace(/{{(\w+)}}/g, (_, key) => variables[key] || '');
  }

  // Automated relance system with cron job
  @Cron(CronExpression.EVERY_HOUR)
  async triggerRelances() {
    this.logger.log('Running automated relance check...');
    
    // Find overdue courriers
    const overdue = await this.prisma.courrier.findMany({
      where: {
        status: 'PENDING_RESPONSE',
        sentAt: { lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, // >3 days
      },
      include: {
        uploader: true,
        bordereau: { include: { client: true } }
      }
    });
    
    // Find SLA breaches
    const slaBreaches = await this.prisma.courrier.findMany({
      where: {
        status: { in: ['SENT', 'PENDING_RESPONSE'] },
        sentAt: { lte: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }, // >5 days
      },
      include: {
        uploader: true,
        bordereau: { include: { client: true } }
      }
    });
    
    let relancesSent = 0;
    let escalationsSent = 0;
    
    // Process overdue courriers
    for (const courrier of overdue) {
      try {
        // Send relance to client if email available
        const clientEmail = courrier.bordereau?.client?.email;
        if (clientEmail) {
          await this.sendRelanceEmail(courrier, clientEmail, 'client');
          relancesSent++;
        }
        
        // Notify gestionnaire
        if (courrier.uploader?.email) {
          await this.sendNotificationEmail(
            courrier.uploader.email,
            'Relance Required',
            `Courrier "${courrier.subject}" requires follow-up. No response received for 3+ days.`,
            courrier
          );
        }
        
        // Update courrier status
        await this.prisma.courrier.update({
          where: { id: courrier.id },
          data: { 
            status: 'PENDING_RESPONSE',
            updatedAt: new Date()
          }
        });
        
      } catch (error) {
        this.logger.error(`Failed to process relance for courrier ${courrier.id}: ${error.message}`);
      }
    }
    
    // Process SLA breaches (escalation)
    for (const courrier of slaBreaches) {
      try {
        // Find supervisor/manager
        const managers = await this.prisma.user.findMany({
          where: {
            role: { in: ['ADMIN', 'SUPER_ADMIN', 'RESPONSABLE_DEPARTEMENT'] },
            active: true
          }
        });
        
        for (const manager of managers) {
          if (manager.email) {
            await this.sendEscalationEmail(manager.email, courrier);
            escalationsSent++;
          }
        }
        
        // Create alert log
        await this.prisma.alertLog.create({
          data: {
            alertType: 'SLA_BREACH',
            alertLevel: 'HIGH',
            message: `Courrier SLA breach: ${courrier.subject}`,
            notifiedRoles: ['ADMIN', 'SUPER_ADMIN'],
            resolved: false
          }
        });
        
      } catch (error) {
        this.logger.error(`Failed to escalate courrier ${courrier.id}: ${error.message}`);
      }
    }
    
    this.logger.log(`Relance check completed: ${relancesSent} relances sent, ${escalationsSent} escalations sent`);
    return { overdue: overdue.length, relancesSent, escalationsSent };
  }
  
  private async sendRelanceEmail(courrier: any, recipientEmail: string, type: 'client' | 'prestataire') {
    const subject = `Relance - ${courrier.subject}`;
    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f57c00;">Relance - Réponse Attendue</h2>
        <p>Bonjour,</p>
        <p>Nous vous relançons concernant notre courrier du ${new Date(courrier.sentAt).toLocaleDateString('fr-FR')}.</p>
        <div style="background-color: #fff3e0; padding: 15px; margin: 20px 0; border-left: 4px solid #f57c00;">
          <h3>Objet:</h3>
          <p>${courrier.subject}</p>
        </div>
        <p>Merci de nous faire parvenir votre réponse dans les plus brefs délais.</p>
        <p>Cordialement,<br>L'équipe ARS</p>
      </div>
    `;
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'ARS Tunisia <noreply@arstunisia.com>',
      to: recipientEmail,
      subject,
      html: body
    };
    
    await this.transporter.sendMail(mailOptions);
  }
  
  private async sendNotificationEmail(recipientEmail: string, subject: string, message: string, courrier?: any) {
    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">🔔 Notification ARS</h2>
        <p>${message}</p>
        ${courrier ? `
          <div style="background-color: #f8fafc; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <h3>Détails du courrier:</h3>
            <p><strong>Objet:</strong> ${courrier.subject}</p>
            <p><strong>Envoyé le:</strong> ${new Date(courrier.sentAt).toLocaleDateString('fr-FR')}</p>
            <p><strong>Type:</strong> ${courrier.type}</p>
          </div>
        ` : ''}
        <p>Veuillez prendre les mesures nécessaires.</p>
        <p>Cordialement,<br>Système ARS</p>
      </div>
    `;
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'ARS Tunisia <noreply@arstunisia.com>',
      to: recipientEmail,
      subject: `[ARS] ${subject}`,
      html: body
    };
    
    await this.transporter.sendMail(mailOptions);
  }
  
  private async sendEscalationEmail(recipientEmail: string, courrier: any) {
    const subject = `🚨 Escalation SLA - ${courrier.subject}`;
    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">🚨 Escalation - Dépassement SLA</h2>
        <p>Bonjour,</p>
        <p>Un courrier a dépassé les délais SLA et nécessite une intervention urgente.</p>
        <div style="background-color: #fef2f2; padding: 15px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <h3>Détails du courrier:</h3>
          <p><strong>Objet:</strong> ${courrier.subject}</p>
          <p><strong>Envoyé le:</strong> ${new Date(courrier.sentAt).toLocaleDateString('fr-FR')}</p>
          <p><strong>Jours de retard:</strong> ${Math.floor((Date.now() - new Date(courrier.sentAt).getTime()) / (1000 * 60 * 60 * 24))}</p>
          <p><strong>Gestionnaire:</strong> ${courrier.uploader?.fullName || 'N/A'}</p>
          <p><strong>Client:</strong> ${courrier.bordereau?.client?.name || 'N/A'}</p>
        </div>
        <p><strong>Action requise:</strong> Intervention immédiate pour résoudre ce retard.</p>
        <p>Cordialement,<br>Système ARS</p>
      </div>
    `;
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'ARS Tunisia <noreply@arstunisia.com>',
      to: recipientEmail,
      subject,
      html: body
    };
    
    await this.transporter.sendMail(mailOptions);
  }

  // Notification: send email to admin (or log if no email)
  async notify(type: string, message: string, email?: string) {
    if (email) {
      await this.outlookService.sendMail(
        email,
        `[NOTIFY] ${type}`,
        message
      );
    } else {
      this.logger.log(`[NOTIFY] ${type}: ${message}`);
    }
  }

  async respondToCourrier(id: string, response: string, user: any) {
    const courrier = await this.prisma.courrier.findUnique({ where: { id } });
    if (!courrier) throw new NotFoundException('Courrier not found');
    
    // Update status to responded
    const updated = await this.prisma.courrier.update({
      where: { id },
      data: {
        status: 'RESPONDED',
        responseAt: new Date(),
      },
    });
    
    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'RESPOND_TO_COURRIER',
        details: { courrierId: id, response },
      },
    });
    
    return updated;
  }

  // Analytics and reporting methods
  async getGECAnalytics(period: string = '30d') {
    const startDate = this.getStartDateForPeriod(period);
    
    const [totalCourriers, sentCourriers, pendingCourriers, overdueCount] = await Promise.all([
      this.prisma.courrier.count({
        where: { createdAt: { gte: startDate } }
      }),
      this.prisma.courrier.count({
        where: { 
          status: 'SENT',
          createdAt: { gte: startDate }
        }
      }),
      this.prisma.courrier.count({
        where: { 
          status: 'PENDING_RESPONSE',
          createdAt: { gte: startDate }
        }
      }),
      this.prisma.courrier.count({
        where: {
          status: 'PENDING_RESPONSE',
          sentAt: { lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
        }
      })
    ]);

    const typeDistribution = await this.prisma.courrier.groupBy({
      by: ['type'],
      where: { createdAt: { gte: startDate } },
      _count: { id: true }
    });

    const statusDistribution = await this.prisma.courrier.groupBy({
      by: ['status'],
      where: { createdAt: { gte: startDate } },
      _count: { id: true }
    });

    return {
      totalCourriers,
      sentCourriers,
      pendingCourriers,
      overdueCount,
      successRate: totalCourriers > 0 ? (sentCourriers / totalCourriers) * 100 : 0,
      typeDistribution: typeDistribution.map(t => ({ type: t.type, count: t._count.id })),
      statusDistribution: statusDistribution.map(s => ({ status: s.status, count: s._count.id })),
      period
    };
  }

  async getSLABreaches() {
    const breaches = await this.prisma.courrier.findMany({
      where: {
        status: { in: ['SENT', 'PENDING_RESPONSE'] },
        sentAt: { lte: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
      },
      include: {
        uploader: { select: { fullName: true, email: true } },
        bordereau: { 
          include: { 
            client: { select: { name: true } } 
          } 
        }
      },
      orderBy: { sentAt: 'asc' }
    });

    return breaches.map(courrier => ({
      id: courrier.id,
      subject: courrier.subject,
      type: courrier.type,
      sentAt: courrier.sentAt,
      daysOverdue: Math.floor((Date.now() - new Date(courrier.sentAt || new Date()).getTime()) / (1000 * 60 * 60 * 24)),
      uploader: courrier.uploader?.fullName,
      client: courrier.bordereau?.client?.name,
      status: courrier.status
    }));
  }

  async getVolumeStats(period: string = '7d') {
    const startDate = this.getStartDateForPeriod(period);
    const endDate = new Date();
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const volumeData: Array<{date: string; sent: number; received: number}> = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const [sent, received] = await Promise.all([
        this.prisma.courrier.count({
          where: {
            sentAt: { gte: date, lt: nextDate }
          }
        }),
        this.prisma.courrier.count({
          where: {
            createdAt: { gte: date, lt: nextDate }
          }
        })
      ]);
      
      volumeData.push({
        date: date.toISOString().split('T')[0],
        sent,
        received
      });
    }
    
    return volumeData;
  }

  async createAutomaticRelance(bordereauId: string, type: 'CLIENT' | 'PRESTATAIRE', user: any) {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true }
    });
    
    if (!bordereau) throw new NotFoundException('Bordereau not found');
    
    // Get appropriate template
    const templates = await this.templateService.listTemplates();
    const template = templates.find(t => t.name.toLowerCase().includes('relance'));
    
    if (!template) {
      throw new NotFoundException('Relance template not found');
    }
    
    // Create courrier
    const courrier = await this.createCourrier({
      subject: `Relance - Bordereau ${bordereau.reference}`,
      body: `Relance automatique pour le bordereau ${bordereau.reference}`,
      type: 'RELANCE' as CourrierType,
      templateUsed: template.id,
      bordereauId
    }, user);
    
    // Send immediately if client email available
    if (bordereau.client?.email) {
      await this.sendCourrier(courrier.id, {
        recipientEmail: bordereau.client.email
      }, user);
    }
    
    return courrier;
  }

  async getAIInsights() {
    try {
      // Get recent courriers for analysis
      const recentCourriers = await this.prisma.courrier.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        },
        include: {
          bordereau: { include: { client: true } }
        }
      });
      
      // Prepare data for AI analysis
      const complaints = recentCourriers
        .filter(c => c.type === 'RECLAMATION')
        .map(c => ({
          id: c.id,
          description: c.body,
          client: c.bordereau?.client?.name || 'Unknown',
          date: c.createdAt.toISOString(),
          type: c.type
        }));
      
      if (complaints.length === 0) {
        return { insights: [], message: 'No complaints data available for analysis' };
      }
      
      // Call AI microservice for pattern analysis
      const aiUrl = process.env.AI_MICROSERVICE_URL || 'http://localhost:8002';
      const response = await fetch(`${aiUrl}/pattern_recognition/recurring_issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaints })
      });
      
      if (response.ok) {
        const aiResults = await response.json();
        return {
          insights: aiResults.recurring_groups || [],
          totalAnalyzed: complaints.length,
          patternsFound: aiResults.total_groups || 0,
          summary: aiResults.summary
        };
      }
      
      return { insights: [], message: 'AI analysis temporarily unavailable' };
    } catch (error) {
      this.logger.error(`AI insights failed: ${error.message}`);
      return { insights: [], message: 'AI analysis failed', error: error.message };
    }
  }

  private getStartDateForPeriod(period: string): Date {
    const now = new Date();
    switch (period) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
}
