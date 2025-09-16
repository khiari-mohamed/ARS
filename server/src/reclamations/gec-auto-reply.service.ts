import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIClassificationService } from './ai-classification.service';
import { AITemplateAutoFillService } from '../gec/ai-template-autofill.service';

@Injectable()
export class GECAutoReplyService {
  private readonly logger = new Logger(GECAutoReplyService.name);

  constructor(
    private prisma: PrismaService,
    private aiClassification: AIClassificationService,
    private aiAutoFill: AITemplateAutoFillService
  ) {}

  async generateAutoReply(reclamationId: string): Promise<{
    templateId: string;
    subject: string;
    body: string;
    confidence: number;
    requiresApproval: boolean;
  }> {
    const reclamation = await this.prisma.reclamation.findUnique({
      where: { id: reclamationId },
      include: { 
        client: true, 
        bordereau: true,
        assignedTo: true 
      }
    });

    if (!reclamation) {
      throw new Error('Reclamation not found');
    }

    // Classify the reclamation using AI
    const classification = await this.aiClassification.classifyClaim(reclamation.description);
    
    // Find appropriate template
    const template = await this.findBestTemplate(classification.category, classification.priority);
    
    if (!template) {
      throw new Error('No suitable template found');
    }

    // Use AI to auto-fill template variables
    const context = {
      reclamationId,
      clientId: reclamation.clientId,
      bordereauId: reclamation.bordereauId || undefined,
      userId: reclamation.assignedToId || undefined
    };

    const aiResult = await this.aiAutoFill.renderTemplateWithAI(template.content, context);
    const subjectResult = await this.aiAutoFill.renderTemplateWithAI(
      `Réponse à votre réclamation - {{reference}}`, 
      context
    );

    // Determine if human approval is required
    const requiresApproval = this.shouldRequireApproval(classification, aiResult.confidence);

    return {
      templateId: template.id,
      subject: subjectResult.renderedContent,
      body: aiResult.renderedContent,
      confidence: Math.min(classification.confidence / 100, aiResult.confidence),
      requiresApproval
    };
  }

  private async findBestTemplate(category: string, priority: string): Promise<any> {
    // Map AI categories to GEC template categories
    const categoryMapping = {
      'REMBOURSEMENT': 'Remboursement',
      'DELAI_TRAITEMENT': 'Délai',
      'QUALITE_SERVICE': 'Service',
      'ERREUR_DOSSIER': 'Erreur',
      'TECHNIQUE': 'Technique'
    };

    const templateCategory = categoryMapping[category] || 'General';

    // Find template by category and priority
    const template = await this.prisma.gecTemplate.findFirst({
      where: {
        category: templateCategory,
        isActive: true,
        type: 'EMAIL'
      },
      orderBy: { usageCount: 'desc' }
    });

    return template;
  }

  private shouldRequireApproval(classification: any, renderingConfidence: number): boolean {
    // Require approval for:
    // - Low confidence classifications (< 80%)
    // - High priority/urgent cases
    // - Low rendering confidence (< 70%)
    
    if (classification.confidence < 80) return true;
    if (classification.priority === 'urgent') return true;
    if (renderingConfidence < 0.7) return true;
    
    return false;
  }

  async approveAndSendReply(reclamationId: string, approvedContent: {
    subject: string;
    body: string;
    recipientEmail: string;
  }, userId: string): Promise<void> {
    // Create courrier record
    const courrier = await this.prisma.courrier.create({
      data: {
        subject: approvedContent.subject,
        body: approvedContent.body,
        type: 'RECLAMATION',
        templateUsed: 'AUTO_REPLY',
        status: 'SENT',
        sentAt: new Date(),
        uploadedById: userId
      }
    });

    // Update reclamation status
    await this.prisma.reclamation.update({
      where: { id: reclamationId },
      data: {
        status: 'RESPONDED',
        updatedAt: new Date()
      }
    });

    // Log the auto-reply action
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'AUTO_REPLY_SENT',
        details: {
          reclamationId,
          courrierId: courrier.id,
          recipientEmail: approvedContent.recipientEmail
        }
      }
    });

    this.logger.log(`Auto-reply sent for reclamation ${reclamationId}`);
  }
}