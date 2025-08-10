import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CustomerClaimSubmission {
  clientId: string;
  type: string;
  category: string;
  subject: string;
  description: string;
  priority: string;
  attachments?: CustomerAttachment[];
  contactPreference: 'email' | 'phone' | 'mail';
  expectedResolution?: Date;
}

export interface CustomerAttachment {
  filename: string;
  contentType: string;
  size: number;
  data: string; // base64 encoded
}

export interface CustomerClaimStatus {
  id: string;
  reference: string;
  status: string;
  statusLabel: string;
  progress: number;
  timeline: ClaimTimelineEvent[];
  estimatedResolution?: Date;
  assignedAgent?: string;
  lastUpdate: Date;
  canCustomerRespond: boolean;
  availableActions: string[];
}

export interface ClaimTimelineEvent {
  id: string;
  date: Date;
  event: string;
  description: string;
  isVisible: boolean;
  actor: string;
  details?: any;
}

export interface CustomerPortalStats {
  totalClaims: number;
  openClaims: number;
  resolvedClaims: number;
  avgResolutionTime: number;
  satisfactionScore: number;
  recentActivity: CustomerActivity[];
}

export interface CustomerActivity {
  id: string;
  type: 'claim_submitted' | 'status_updated' | 'message_received' | 'claim_resolved';
  date: Date;
  description: string;
  claimReference?: string;
}

@Injectable()
export class CustomerPortalService {
  private readonly logger = new Logger(CustomerPortalService.name);

  constructor(private prisma: PrismaService) {}

  // === SELF-SERVICE CLAIM SUBMISSION ===
  async submitClaim(submission: CustomerClaimSubmission): Promise<{ claimId: string; reference: string }> {
    try {
      // Generate unique reference
      const reference = this.generateClaimReference();

      // Create claim record
      const claim = await this.prisma.reclamation.create({
        data: {
          clientId: submission.clientId,
          type: submission.type,
          severity: submission.priority.toUpperCase(),
          status: 'NOUVEAU',
          description: submission.description,
          createdById: submission.clientId,
          createdAt: new Date()
        }
      });

      // Handle attachments
      if (submission.attachments && submission.attachments.length > 0) {
        await this.processAttachments(claim.id, submission.attachments);
      }

      // Create initial timeline event
      await this.createTimelineEvent(claim.id, 'CLAIM_SUBMITTED', 'Réclamation soumise par le client', true, 'CLIENT');

      // Send confirmation notification
      await this.sendSubmissionConfirmation(submission.clientId, claim.id, reference);

      // Trigger automatic classification if enabled
      await this.triggerAutoClassification(claim.id);

      await this.prisma.auditLog.create({
        data: {
          userId: submission.clientId,
          action: 'CLAIM_SUBMITTED_PORTAL',
          details: {
            claimId: claim.id,
            reference,
            category: submission.category,
            priority: submission.priority
          }
        }
      });

      return { claimId: claim.id, reference };
    } catch (error) {
      this.logger.error('Failed to submit claim:', error);
      throw error;
    }
  }

  private generateClaimReference(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `REC-${timestamp}-${random}`;
  }

  private async processAttachments(claimId: string, attachments: CustomerAttachment[]): Promise<void> {
    for (const attachment of attachments) {
      try {
        // In production, would upload to file storage service
        await this.prisma.document.create({
          data: {
            name: attachment.filename,
            type: attachment.contentType,
            path: `/claims/${claimId}/${attachment.filename}`,
            uploadedById: 'CLIENT',
            uploadedAt: new Date()
          }
        });
      } catch (error) {
        this.logger.error(`Failed to process attachment ${attachment.filename}:`, error);
      }
    }
  }

  private async createTimelineEvent(
    claimId: string, 
    event: string, 
    description: string, 
    isVisible: boolean, 
    actor: string,
    details?: any
  ): Promise<void> {
    // Mock timeline event - reclamationTimeline model doesn't exist
    await this.prisma.auditLog.create({
      data: {
        userId: actor,
        action: event,
        details: {
          reclamationId: claimId,
          description,
          isVisible,
          ...details
        }
      }
    });
  }

  private async sendSubmissionConfirmation(clientId: string, claimId: string, reference: string): Promise<void> {
    // Mock notification sending - in production would use notification service
    await this.prisma.auditLog.create({
      data: {
        userId: 'SYSTEM',
        action: 'CONFIRMATION_SENT',
        details: {
          clientId,
          claimId,
          reference,
          type: 'submission_confirmation'
        }
      }
    });
  }

  private async triggerAutoClassification(claimId: string): Promise<void> {
    // Mock auto-classification trigger - in production would call AI service
    await this.prisma.auditLog.create({
      data: {
        userId: 'AI_SYSTEM',
        action: 'AUTO_CLASSIFICATION_TRIGGERED',
        details: { claimId }
      }
    });
  }

  // === STATUS TRACKING FOR CUSTOMERS ===
  async getClaimStatus(claimId: string, clientId: string): Promise<CustomerClaimStatus | null> {
    try {
      const claim = await this.prisma.reclamation.findFirst({
        where: { 
          id: claimId, 
          clientId 
        },
        include: {
          assignedTo: {
            select: { fullName: true }
          }
        }
      });

      if (!claim) {
        return null;
      }

      const timeline = await this.getClaimTimeline(claimId, true); // Only visible events
      const progress = this.calculateProgress(claim.status);
      const availableActions = this.getAvailableCustomerActions(claim.status);

      return {
        id: claim.id,
        reference: claim.id, // Use id as reference since reference field doesn't exist
        status: claim.status,
        statusLabel: this.getStatusLabel(claim.status),
        progress,
        timeline,
        estimatedResolution: new Date(), // Mock estimated resolution
        assignedAgent: claim.assignedTo?.fullName,
        lastUpdate: claim.updatedAt,
        canCustomerRespond: this.canCustomerRespond(claim.status),
        availableActions
      };
    } catch (error) {
      this.logger.error('Failed to get claim status:', error);
      return null;
    }
  }

  private async getClaimTimeline(claimId: string, visibleOnly = false): Promise<ClaimTimelineEvent[]> {
    // Mock timeline using audit logs since reclamationTimeline doesn't exist
    const events = await this.prisma.auditLog.findMany({
      where: {
        details: {
          path: ['reclamationId'],
          equals: claimId
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    return events.map(event => ({
      id: event.id,
      date: event.timestamp,
      event: event.action,
      description: event.details?.description || event.action,
      isVisible: event.details?.isVisible || true,
      actor: event.userId,
      details: event.details
    }));
  }

  private calculateProgress(status: string): number {
    const progressMap = {
      'NOUVEAU': 10,
      'EN_COURS': 30,
      'ANALYSE': 50,
      'ATTENTE_CLIENT': 60,
      'RESOLUTION': 80,
      'RESOLU': 100,
      'FERME': 100,
      'REJETE': 100
    };

    return progressMap[status] || 0;
  }

  private getStatusLabel(status: string): string {
    const labelMap = {
      'NOUVEAU': 'Nouvelle réclamation',
      'EN_COURS': 'En cours de traitement',
      'ANALYSE': 'En cours d\'analyse',
      'ATTENTE_CLIENT': 'En attente de votre réponse',
      'RESOLUTION': 'En cours de résolution',
      'RESOLU': 'Résolu',
      'FERME': 'Fermé',
      'REJETE': 'Rejeté'
    };

    return labelMap[status] || status;
  }

  private getAvailableCustomerActions(status: string): string[] {
    const actionMap = {
      'NOUVEAU': ['Annuler'],
      'EN_COURS': ['Ajouter des informations'],
      'ANALYSE': ['Ajouter des informations'],
      'ATTENTE_CLIENT': ['Répondre', 'Ajouter des documents'],
      'RESOLUTION': ['Accepter la solution', 'Contester la solution'],
      'RESOLU': ['Évaluer le service', 'Rouvrir si nécessaire'],
      'FERME': ['Évaluer le service'],
      'REJETE': ['Faire appel', 'Soumettre une nouvelle réclamation']
    };

    return actionMap[status] || [];
  }

  private canCustomerRespond(status: string): boolean {
    return ['EN_COURS', 'ANALYSE', 'ATTENTE_CLIENT'].includes(status);
  }

  // === CUSTOMER DASHBOARD ===
  async getCustomerPortalStats(clientId: string): Promise<CustomerPortalStats> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [totalClaims, openClaims, resolvedClaims, recentActivity] = await Promise.all([
        this.prisma.reclamation.count({ where: { clientId } }),
        this.prisma.reclamation.count({ 
          where: { 
            clientId, 
            status: { in: ['NOUVEAU', 'EN_COURS', 'ANALYSE', 'ATTENTE_CLIENT', 'RESOLUTION'] }
          }
        }),
        this.prisma.reclamation.count({ 
          where: { 
            clientId, 
            status: { in: ['RESOLU', 'FERME'] },
            updatedAt: { gte: thirtyDaysAgo }
          }
        }),
        this.getRecentCustomerActivity(clientId)
      ]);

      const avgResolutionTime = await this.calculateAvgResolutionTime(clientId);
      const satisfactionScore = await this.getCustomerSatisfactionScore(clientId);

      return {
        totalClaims,
        openClaims,
        resolvedClaims,
        avgResolutionTime,
        satisfactionScore,
        recentActivity
      };
    } catch (error) {
      this.logger.error('Failed to get customer portal stats:', error);
      return {
        totalClaims: 0,
        openClaims: 0,
        resolvedClaims: 0,
        avgResolutionTime: 0,
        satisfactionScore: 0,
        recentActivity: []
      };
    }
  }

  private async getRecentCustomerActivity(clientId: string): Promise<CustomerActivity[]> {
    const activities = await this.prisma.auditLog.findMany({
      where: {
        userId: clientId,
        action: { in: ['CLAIM_SUBMITTED_PORTAL', 'CLAIM_STATUS_UPDATED', 'MESSAGE_RECEIVED', 'CLAIM_RESOLVED'] }
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    });

    return activities.map(activity => ({
      id: activity.id,
      type: this.mapActionToActivityType(activity.action),
      date: activity.timestamp,
      description: this.generateActivityDescription(activity),
      claimReference: activity.details?.reference
    }));
  }

  private mapActionToActivityType(action: string): CustomerActivity['type'] {
    const typeMap = {
      'CLAIM_SUBMITTED_PORTAL': 'claim_submitted',
      'CLAIM_STATUS_UPDATED': 'status_updated',
      'MESSAGE_RECEIVED': 'message_received',
      'CLAIM_RESOLVED': 'claim_resolved'
    };

    return typeMap[action] as CustomerActivity['type'] || 'claim_submitted';
  }

  private generateActivityDescription(activity: any): string {
    const descriptionMap = {
      'CLAIM_SUBMITTED_PORTAL': `Réclamation ${activity.details?.reference} soumise`,
      'CLAIM_STATUS_UPDATED': `Statut mis à jour pour ${activity.details?.reference}`,
      'MESSAGE_RECEIVED': `Nouveau message reçu pour ${activity.details?.reference}`,
      'CLAIM_RESOLVED': `Réclamation ${activity.details?.reference} résolue`
    };

    return descriptionMap[activity.action] || 'Activité sur votre réclamation';
  }

  private async calculateAvgResolutionTime(clientId: string): Promise<number> {
    const resolvedClaims = await this.prisma.reclamation.findMany({
      where: {
        clientId,
        status: { in: ['RESOLU', 'FERME'] }
      },
      select: {
        createdAt: true,
        updatedAt: true
      }
    });

    if (resolvedClaims.length === 0) return 0;

    const totalTime = resolvedClaims.reduce((sum, claim) => {
      const resolutionTime = claim.updatedAt.getTime() - claim.createdAt.getTime();
      return sum + resolutionTime;
    }, 0);

    return Math.round(totalTime / resolvedClaims.length / (1000 * 60 * 60 * 24)); // Convert to days
  }

  private async getCustomerSatisfactionScore(clientId: string): Promise<number> {
    // Mock satisfaction score - in production would calculate from actual feedback
    return Math.random() * 2 + 3; // 3-5 range
  }

  // === CUSTOMER ACTIONS ===
  async addCustomerResponse(claimId: string, clientId: string, message: string, attachments?: CustomerAttachment[]): Promise<void> {
    try {
      // Verify claim ownership
      const claim = await this.prisma.reclamation.findFirst({
        where: { id: claimId, clientId }
      });

      if (!claim) {
        throw new Error('Claim not found or access denied');
      }

      if (!this.canCustomerRespond(claim.status)) {
        throw new Error('Cannot respond to claim in current status');
      }

      // Mock customer message - reclamationMessage model doesn't exist
      await this.prisma.auditLog.create({
        data: {
          userId: clientId,
          action: 'CUSTOMER_MESSAGE',
          details: {
            reclamationId: claimId,
            message,
            senderType: 'CLIENT'
          }
        }
      });

      // Process attachments if any
      if (attachments && attachments.length > 0) {
        await this.processAttachments(claimId, attachments);
      }

      // Update claim status if needed
      if (claim.status === 'ATTENTE_CLIENT') {
        await this.prisma.reclamation.update({
          where: { id: claimId },
          data: { status: 'EN_COURS' }
        });
      }

      // Create timeline event
      await this.createTimelineEvent(claimId, 'CUSTOMER_RESPONSE', 'Réponse du client reçue', true, 'CLIENT');

      // Notify assigned agent
      await this.notifyAgentOfCustomerResponse(claimId, claim.assignedToId || undefined);

      await this.prisma.auditLog.create({
        data: {
          userId: clientId,
          action: 'CUSTOMER_RESPONSE_ADDED',
          details: {
            claimId,
            hasAttachments: attachments && attachments.length > 0
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to add customer response:', error);
      throw error;
    }
  }

  private async notifyAgentOfCustomerResponse(claimId: string, agentId?: string): Promise<void> {
    if (!agentId) return;

    await this.prisma.auditLog.create({
      data: {
        userId: 'SYSTEM',
        action: 'AGENT_NOTIFIED',
        details: {
          claimId,
          agentId,
          type: 'customer_response'
        }
      }
    });
  }

  async submitCustomerFeedback(claimId: string, clientId: string, rating: number, comments?: string): Promise<void> {
    try {
      // Mock feedback - reclamationFeedback model doesn't exist
      await this.prisma.auditLog.create({
        data: {
          userId: clientId,
          action: 'CUSTOMER_FEEDBACK',
          details: {
            reclamationId: claimId,
            rating,
            comments
          }
        }
      });

      await this.createTimelineEvent(claimId, 'FEEDBACK_SUBMITTED', 'Évaluation du service soumise', false, 'CLIENT');

      await this.prisma.auditLog.create({
        data: {
          userId: clientId,
          action: 'FEEDBACK_SUBMITTED',
          details: {
            claimId,
            rating,
            hasComments: !!comments
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to submit customer feedback:', error);
      throw error;
    }
  }

  // === CUSTOMER PORTAL API ===
  async getCustomerClaims(clientId: string, filters?: any): Promise<any[]> {
    try {
      const where: any = { clientId };

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.category) {
        where.type = filters.category;
      }

      if (filters?.dateFrom) {
        where.createdAt = { gte: new Date(filters.dateFrom) };
      }

      const claims = await this.prisma.reclamation.findMany({
        where,
        select: {
          id: true,
          type: true,
          severity: true,
          status: true,
          createdAt: true,
          assignedTo: {
            select: { fullName: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return claims.map(claim => ({
        ...claim,
        statusLabel: this.getStatusLabel(claim.status),
        progress: this.calculateProgress(claim.status),
        canRespond: this.canCustomerRespond(claim.status)
      }));
    } catch (error) {
      this.logger.error('Failed to get customer claims:', error);
      return [];
    }
  }

  async getClaimCategories(): Promise<{ value: string; label: string; description: string }[]> {
    return [
      { value: 'REMBOURSEMENT', label: 'Remboursement', description: 'Problèmes liés aux remboursements' },
      { value: 'DELAI_TRAITEMENT', label: 'Délai de traitement', description: 'Délais trop longs ou dépassés' },
      { value: 'QUALITE_SERVICE', label: 'Qualité de service', description: 'Problèmes de service client' },
      { value: 'ERREUR_DOSSIER', label: 'Erreur de dossier', description: 'Erreurs dans les informations' },
      { value: 'TECHNIQUE', label: 'Problème technique', description: 'Problèmes avec le site ou l\'application' },
      { value: 'AUTRE', label: 'Autre', description: 'Autres types de réclamations' }
    ];
  }
}