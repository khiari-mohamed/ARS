import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourrierDto, CourrierType } from './dto/create-courrier.dto';
import { SearchCourrierDto, CourrierStatus } from './dto/search-courrier.dto';
import { UpdateCourrierStatusDto } from './dto/update-courrier-status.dto';
import { SendCourrierDto } from './dto/send-courrier.dto';
import { GedService } from '../ged/ged.service';
import { OutlookService } from '../integrations/outlook.service';
import { TemplateService } from './template.service';

@Injectable()
export class GecService {
  private readonly logger = new Logger(GecService.name);
  constructor(
    private prisma: PrismaService,
    private gedService: GedService,
    private outlookService: OutlookService,
    private templateService: TemplateService,
  ) {}

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
    const courrier = await this.prisma.courrier.findUnique({ where: { id } });
    if (!courrier) throw new NotFoundException('Courrier not found');
    if (courrier.status !== 'DRAFT') throw new ForbiddenException('Only DRAFT courriers can be sent');
    // Render template if templateUsed is set
    let subject = courrier.subject;
    let body = courrier.body;
    if (courrier.templateUsed) {
      try {
        const tpl = this.templateService.getTemplate(courrier.templateUsed);
        // For demo, use only subject as variable, can be extended
        const variables = { subject: courrier.subject, ...dto };
        subject = this.templateService.renderTemplate((await tpl).subject, variables);
        body = this.templateService.renderTemplate((await tpl).body, variables);
      } catch (e) {
        this.logger.warn(`Template not found: ${courrier.templateUsed}`);
      }
    }
    // Send email if recipientEmail is provided
    if (dto.recipientEmail) {
      await this.outlookService.sendMail(
        dto.recipientEmail,
        subject,
        body
      );
    }
    this.logger.log(`Sending courrier to ${dto.recipientEmail || 'N/A'}: ${subject}`);
    // Archive in GED
    await this.gedService.uploadDocument(
      {
        originalname: courrier.subject + '.txt',
        path: `archived_courriers/${courrier.id}.txt`,
      } as any,
      {
        name: courrier.subject,
        type: 'courrier',
        bordereauId: courrier.bordereauId ?? undefined,
      },
      user,
    );
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
        details: { courrierId: id, recipientEmail: dto.recipientEmail },
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

  // Simulated relance (would be a cron/job in real app)
  async triggerRelances() {
    const pending = await this.prisma.courrier.findMany({
      where: {
        type: 'RELANCE',
        status: 'PENDING_RESPONSE',
        sentAt: { lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, // >3 days
      },
    });
    for (const courrier of pending) {
      this.logger.warn(`Relance overdue for courrier ${courrier.id}`);
      // Notify gestionnaire (real email if possible)
      const uploader = await this.prisma.user.findUnique({ where: { id: courrier.uploadedById } });
      if (uploader && uploader.email) {
        await this.outlookService.sendMail(
          uploader.email,
          `Relance overdue for courrier ${courrier.subject}`,
          `The courrier with subject "${courrier.subject}" is overdue for response.`
        );
      }
    }
    return pending.length;
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
}
