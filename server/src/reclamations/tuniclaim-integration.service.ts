import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TuniclaimService } from '../integrations/tuniclaim.service';

@Injectable()
export class TuniclaimIntegrationService {
  private readonly logger = new Logger(TuniclaimIntegrationService.name);

  constructor(
    private prisma: PrismaService,
    private tuniclaimService: TuniclaimService
  ) {}

  /**
   * Gestion centralisée des réclamations MY TUNICLAIM
   */
  async getCentralizedReclamations(filters?: any) {
    try {
      const reclamations = await this.prisma.reclamation.findMany({
        where: {
          ...filters,
          // Filter for MY TUNICLAIM related reclamations
          description: {
            contains: 'TUNICLAIM',
            mode: 'insensitive'
          }
        },
        include: {
          client: true,
          assignedTo: true,
          createdBy: true,
          bordereau: true,
          history: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return {
        reclamations,
        stats: {
          total: reclamations.length,
          open: reclamations.filter(r => r.status === 'OPEN').length,
          inProgress: reclamations.filter(r => r.status === 'IN_PROGRESS').length,
          resolved: reclamations.filter(r => r.status === 'RESOLVED').length,
          highPriority: reclamations.filter(r => r.severity === 'HAUTE').length
        }
      };
    } catch (error) {
      this.logger.error('Failed to get centralized reclamations:', error);
      throw error;
    }
  }

  /**
   * Classification automatique via IA
   */
  async classifyReclamation(reclamationId: string) {
    try {
      const reclamation = await this.prisma.reclamation.findUnique({
        where: { id: reclamationId },
        include: { client: true, bordereau: true }
      });

      if (!reclamation) {
        throw new Error('Reclamation not found');
      }

      // AI Classification logic
      const classification = await this.performAIClassification(reclamation.description);
      
      // Update reclamation with AI classification
      const updated = await this.prisma.reclamation.update({
        where: { id: reclamationId },
        data: {
          type: classification.type,
          severity: classification.severity,
          priority: classification.priority
        }
      });

      // Add history entry
      await this.prisma.reclamationHistory.create({
        data: {
          reclamationId,
          userId: 'system',
          action: 'AI_CLASSIFICATION',
          description: `Classification automatique: ${classification.type} - ${classification.severity}`,
          aiSuggestions: classification
        }
      });

      return {
        success: true,
        classification,
        reclamation: updated
      };
    } catch (error) {
      this.logger.error('Failed to classify reclamation:', error);
      throw error;
    }
  }

  /**
   * Historique et traçabilité complète
   */
  async getCompleteHistory(reclamationId: string) {
    try {
      const history = await this.prisma.reclamationHistory.findMany({
        where: { reclamationId },
        include: {
          user: {
            select: { id: true, fullName: true, role: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Get related documents and communications
      const reclamation = await this.prisma.reclamation.findUnique({
        where: { id: reclamationId },
        include: {
          client: true,
          bordereau: {
            include: {
              documents: true,
              courriers: true
            }
          }
        }
      });

      return {
        history,
        reclamation,
        timeline: this.buildTimeline(history, reclamation)
      };
    } catch (error) {
      this.logger.error('Failed to get complete history:', error);
      throw error;
    }
  }

  /**
   * Notifications et relances automatiques
   */
  async setupAutomaticNotifications(reclamationId: string, config: any) {
    try {
      const reclamation = await this.prisma.reclamation.findUnique({
        where: { id: reclamationId },
        include: { client: true }
      });

      if (!reclamation) {
        throw new Error('Reclamation not found');
      }

      // Schedule automatic notifications based on SLA
      const slaHours = this.getSLAHours(reclamation.severity);
      const notifications: Array<{
        type: string;
        scheduledAt: Date;
        message: string;
      }> = [];

      // 75% SLA warning
      const warningTime = new Date(Date.now() + (slaHours * 0.75 * 60 * 60 * 1000));
      notifications.push({
        type: 'SLA_WARNING',
        scheduledAt: warningTime,
        message: `Réclamation ${reclamationId} approche de la limite SLA`
      });

      // SLA breach alert
      const breachTime = new Date(Date.now() + (slaHours * 60 * 60 * 1000));
      notifications.push({
        type: 'SLA_BREACH',
        scheduledAt: breachTime,
        message: `Réclamation ${reclamationId} a dépassé le SLA`
      });

      // Store notifications
      for (const notification of notifications) {
        await this.prisma.notification.create({
          data: {
            userId: reclamation.assignedToId || reclamation.createdById,
            type: notification.type,
            title: 'Alerte SLA Réclamation',
            message: notification.message,
            data: { reclamationId, scheduledAt: notification.scheduledAt }
          }
        });
      }

      return { success: true, notifications };
    } catch (error) {
      this.logger.error('Failed to setup automatic notifications:', error);
      throw error;
    }
  }

  /**
   * Analyse IA et détection d'anomalies
   */
  async performAnomalyDetection(period = '30d') {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      const reclamations = await this.prisma.reclamation.findMany({
        where: {
          createdAt: { gte: startDate }
        },
        include: {
          client: true,
          bordereau: true
        }
      });

      // Analyze patterns
      const patterns = this.analyzePatterns(reclamations);
      const anomalies = this.detectAnomalies(patterns);

      return {
        period,
        totalReclamations: reclamations.length,
        patterns,
        anomalies,
        recommendations: this.generateRecommendations(anomalies)
      };
    } catch (error) {
      this.logger.error('Failed to perform anomaly detection:', error);
      throw error;
    }
  }

  /**
   * Réponses automatiques
   */
  async generateAutoResponse(reclamationId: string) {
    try {
      const reclamation = await this.prisma.reclamation.findUnique({
        where: { id: reclamationId },
        include: { client: true }
      });

      if (!reclamation) {
        throw new Error('Reclamation not found');
      }

      // Generate response based on type and content
      const response = await this.generateResponseContent(reclamation);

      return {
        success: true,
        response: {
          subject: response.subject,
          body: response.body,
          template: response.template,
          recipientEmail: reclamation.client.email
        }
      };
    } catch (error) {
      this.logger.error('Failed to generate auto response:', error);
      throw error;
    }
  }

  /**
   * Intégration avec processus internes
   */
  async integrateWithInternalProcesses(reclamationId: string) {
    try {
      const reclamation = await this.prisma.reclamation.findUnique({
        where: { id: reclamationId },
        include: {
          client: true,
          bordereau: {
            include: {
              BulletinSoin: true,
              documents: true
            }
          }
        }
      });

      if (!reclamation) {
        throw new Error('Reclamation not found');
      }

      const integrations: Array<{
        type: string;
        id: string;
        reference?: string;
        status?: any;
        clientName?: string;
        delaiReglement?: number;
        name?: string;
        path?: string;
      }> = [];

      // Link to bordereau if exists
      if (reclamation.bordereau) {
        integrations.push({
          type: 'BORDEREAU',
          id: reclamation.bordereau.id,
          reference: reclamation.bordereau.reference,
          status: reclamation.bordereau.statut
        });
      }

      // Link to contracts
      const contracts = await this.prisma.contract.findMany({
        where: { clientId: reclamation.clientId }
      });

      integrations.push(...contracts.map(contract => ({
        type: 'CONTRACT',
        id: contract.id,
        clientName: contract.clientName,
        delaiReglement: contract.delaiReglement
      })));

      // Link to documents
      if (reclamation.bordereau?.documents) {
        integrations.push(...reclamation.bordereau.documents.map(doc => ({
          type: 'DOCUMENT',
          id: doc.id,
          name: doc.name,
          path: doc.path
        })));
      }

      return {
        success: true,
        reclamation,
        integrations
      };
    } catch (error) {
      this.logger.error('Failed to integrate with internal processes:', error);
      throw error;
    }
  }

  /**
   * Gestion des escalades
   */
  async manageEscalation(reclamationId: string, escalationType: 'AUTO' | 'MANUAL' = 'AUTO') {
    try {
      const reclamation = await this.prisma.reclamation.findUnique({
        where: { id: reclamationId },
        include: {
          assignedTo: true,
          client: true
        }
      });

      if (!reclamation) {
        throw new Error('Reclamation not found');
      }

      // Determine escalation target
      const escalationTarget = await this.getEscalationTarget(reclamation);

      // Update reclamation
      const updated = await this.prisma.reclamation.update({
        where: { id: reclamationId },
        data: {
          status: 'ESCALATED',
          assignedToId: escalationTarget.id,
          priority: Math.min((reclamation.priority || 1) + 1, 5)
        }
      });

      // Add history entry
      await this.prisma.reclamationHistory.create({
        data: {
          reclamationId,
          userId: escalationTarget.id,
          action: 'ESCALATED',
          description: `Escalade ${escalationType} vers ${escalationTarget.fullName}`,
          fromStatus: reclamation.status,
          toStatus: 'ESCALATED'
        }
      });

      // Send notification
      await this.prisma.notification.create({
        data: {
          userId: escalationTarget.id,
          type: 'ESCALATION',
          title: 'Réclamation Escaladée',
          message: `La réclamation ${reclamationId} vous a été escaladée`,
          data: { reclamationId, escalationType }
        }
      });

      return {
        success: true,
        reclamation: updated,
        escalatedTo: escalationTarget
      };
    } catch (error) {
      this.logger.error('Failed to manage escalation:', error);
      throw error;
    }
  }

  // Private helper methods
  private async performAIClassification(description: string) {
    // Simulate AI classification
    const keywords = description.toLowerCase();
    
    let type = 'AUTRE';
    let severity = 'MOYENNE';
    let priority = 2;

    if (keywords.includes('urgent') || keywords.includes('critique')) {
      severity = 'HAUTE';
      priority = 4;
    }
    
    if (keywords.includes('paiement') || keywords.includes('virement')) {
      type = 'FINANCIERE';
    } else if (keywords.includes('document') || keywords.includes('scan')) {
      type = 'DOCUMENTAIRE';
    } else if (keywords.includes('délai') || keywords.includes('retard')) {
      type = 'DELAI';
    }

    return { type, severity, priority, confidence: 0.85 };
  }

  private buildTimeline(history: any[], reclamation: any) {
    const timeline: Array<{
      date: any;
      event: string;
      description: string;
      user: any;
    }> = [];
    
    // Add creation event
    timeline.push({
      date: reclamation.createdAt,
      event: 'CREATED',
      description: 'Réclamation créée',
      user: reclamation.createdBy?.fullName || 'System'
    });

    // Add history events
    history.forEach(h => {
      timeline.push({
        date: h.createdAt,
        event: h.action,
        description: h.description,
        user: h.user?.fullName || 'System'
      });
    });

    return timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private getSLAHours(severity: string): number {
    switch (severity) {
      case 'HAUTE': return 4;
      case 'MOYENNE': return 24;
      case 'BASSE': return 72;
      default: return 24;
    }
  }

  private analyzePatterns(reclamations: any[]) {
    const patterns = {
      byType: {},
      byClient: {},
      bySeverity: {},
      byHour: new Array(24).fill(0),
      byDay: new Array(7).fill(0)
    };

    reclamations.forEach(r => {
      // By type
      patterns.byType[r.type] = (patterns.byType[r.type] || 0) + 1;
      
      // By client
      const clientName = r.client?.name || 'Unknown';
      patterns.byClient[clientName] = (patterns.byClient[clientName] || 0) + 1;
      
      // By severity
      patterns.bySeverity[r.severity] = (patterns.bySeverity[r.severity] || 0) + 1;
      
      // By hour and day
      const date = new Date(r.createdAt);
      patterns.byHour[date.getHours()]++;
      patterns.byDay[date.getDay()]++;
    });

    return patterns;
  }

  private detectAnomalies(patterns: any) {
    const anomalies: Array<{
      type: string;
      client?: string;
      count: number;
      threshold: number;
      peakHour?: number;
    }> = [];

    // Check for unusual client activity
    const clientCounts = Object.values(patterns.byClient) as number[];
    const avgClientCount = clientCounts.reduce((a, b) => a + b, 0) / clientCounts.length;
    
    Object.entries(patterns.byClient).forEach(([client, count]) => {
      if ((count as number) > avgClientCount * 2) {
        anomalies.push({
          type: 'HIGH_CLIENT_ACTIVITY',
          client,
          count: count as number,
          threshold: avgClientCount * 2
        });
      }
    });

    // Check for unusual time patterns
    const maxHourCount = Math.max(...patterns.byHour);
    const avgHourCount = patterns.byHour.reduce((a, b) => a + b, 0) / 24;
    
    if (maxHourCount > avgHourCount * 3) {
      const peakHour = patterns.byHour.indexOf(maxHourCount);
      anomalies.push({
        type: 'UNUSUAL_TIME_PATTERN',
        peakHour,
        count: maxHourCount,
        threshold: avgHourCount * 3
      });
    }

    return anomalies;
  }

  private generateRecommendations(anomalies: any[]) {
    const recommendations: Array<{
      type: string;
      message: string;
      priority: string;
    }> = [];

    anomalies.forEach(anomaly => {
      switch (anomaly.type) {
        case 'HIGH_CLIENT_ACTIVITY':
          recommendations.push({
            type: 'CLIENT_REVIEW',
            message: `Examiner les réclamations du client ${anomaly.client} (${anomaly.count} réclamations)`,
            priority: 'HIGH'
          });
          break;
        case 'UNUSUAL_TIME_PATTERN':
          recommendations.push({
            type: 'STAFFING_REVIEW',
            message: `Pic d'activité à ${anomaly.peakHour}h - considérer l'ajustement des équipes`,
            priority: 'MEDIUM'
          });
          break;
      }
    });

    return recommendations;
  }

  private async generateResponseContent(reclamation: any) {
    const templates = {
      FINANCIERE: {
        subject: 'Réponse à votre réclamation financière',
        body: 'Nous avons bien reçu votre réclamation concernant un problème financier. Notre équipe examine votre dossier et vous contactera sous 24h.',
        template: 'FINANCIAL_RESPONSE'
      },
      DOCUMENTAIRE: {
        subject: 'Réponse à votre réclamation documentaire',
        body: 'Nous avons bien reçu votre réclamation concernant un problème de documentation. Nous vérifions vos documents et vous répondrons rapidement.',
        template: 'DOCUMENT_RESPONSE'
      },
      DELAI: {
        subject: 'Réponse à votre réclamation de délai',
        body: 'Nous avons bien reçu votre réclamation concernant un retard de traitement. Nous enquêtons sur votre dossier et vous tiendrons informé.',
        template: 'DELAY_RESPONSE'
      },
      AUTRE: {
        subject: 'Réponse à votre réclamation',
        body: 'Nous avons bien reçu votre réclamation. Notre équipe l\'examine et vous contactera prochainement.',
        template: 'GENERAL_RESPONSE'
      }
    };

    return templates[reclamation.type] || templates.AUTRE;
  }

  private async getEscalationTarget(reclamation: any) {
    // Find a supervisor or manager to escalate to
    const supervisor = await this.prisma.user.findFirst({
      where: {
        role: { in: ['CHEF_EQUIPE', 'SUPER_ADMIN'] },
        active: true
      }
    });

    return supervisor || reclamation.assignedTo;
  }
}