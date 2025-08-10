import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface EscalationRule {
  id: string;
  name: string;
  priority: number;
  triggers: EscalationTrigger[];
  actions: EscalationAction[];
  active: boolean;
}

export interface EscalationTrigger {
  type: 'time_based' | 'status_based' | 'quality_based' | 'workload_based';
  condition: string;
  value: any;
  threshold: number;
}

export interface EscalationAction {
  type: 'notify' | 'reassign' | 'priority_boost' | 'manager_alert';
  target: string;
  parameters: any;
}

export interface EscalationCase {
  id: string;
  bordereauId: string;
  ruleId: string;
  triggeredAt: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';
  assignedTo?: string;
  resolution?: string;
  resolvedAt?: Date;
}

@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(private prisma: PrismaService) {}

  // === AUTOMATIC ESCALATION RULES ===
  async createEscalationRule(rule: Omit<EscalationRule, 'id'>): Promise<EscalationRule> {
    const newRule = {
      id: `escalation_${Date.now()}`,
      ...rule
    };

    await this.prisma.auditLog.create({
      data: {
        userId: 'SYSTEM',
        action: 'ESCALATION_RULE_CREATED',
        details: newRule
      }
    });

    return newRule;
  }

  async getActiveEscalationRules(): Promise<EscalationRule[]> {
    // Mock escalation rules - in production would be stored in database
    return [
      {
        id: 'rule_sla_breach',
        name: 'SLA Breach Escalation',
        priority: 100,
        triggers: [
          {
            type: 'time_based',
            condition: 'days_overdue',
            value: 'greater_than',
            threshold: 2
          }
        ],
        actions: [
          {
            type: 'manager_alert',
            target: 'team_leader',
            parameters: { urgency: 'high' }
          },
          {
            type: 'priority_boost',
            target: 'bordereau',
            parameters: { new_priority: 'URGENT' }
          }
        ],
        active: true
      },
      {
        id: 'rule_stuck_processing',
        name: 'Stuck in Processing',
        priority: 80,
        triggers: [
          {
            type: 'status_based',
            condition: 'status_duration',
            value: 'EN_COURS',
            threshold: 5
          }
        ],
        actions: [
          {
            type: 'notify',
            target: 'current_handler',
            parameters: { message: 'Bordereau en cours depuis 5 jours' }
          },
          {
            type: 'reassign',
            target: 'team_leader',
            parameters: { reason: 'stuck_processing' }
          }
        ],
        active: true
      },
      {
        id: 'rule_quality_issues',
        name: 'Quality Issues Escalation',
        priority: 90,
        triggers: [
          {
            type: 'quality_based',
            condition: 'error_count',
            value: 'greater_than',
            threshold: 3
          }
        ],
        actions: [
          {
            type: 'manager_alert',
            target: 'quality_manager',
            parameters: { urgency: 'medium' }
          },
          {
            type: 'reassign',
            target: 'senior_specialist',
            parameters: { reason: 'quality_issues' }
          }
        ],
        active: true
      },
      {
        id: 'rule_workload_overload',
        name: 'Workload Overload',
        priority: 70,
        triggers: [
          {
            type: 'workload_based',
            condition: 'utilization_rate',
            value: 'greater_than',
            threshold: 1.2
          }
        ],
        actions: [
          {
            type: 'manager_alert',
            target: 'team_leader',
            parameters: { urgency: 'medium' }
          },
          {
            type: 'reassign',
            target: 'available_team_member',
            parameters: { reason: 'workload_balancing' }
          }
        ],
        active: true
      }
    ];
  }

  async evaluateEscalationRules(): Promise<EscalationCase[]> {
    const rules = await this.getActiveEscalationRules();
    const escalationCases: EscalationCase[] = [];

    // Get all bordereaux that might need escalation
    const candidateBordereaux = await this.getCandidateBordereaux();

    for (const bordereau of candidateBordereaux) {
      for (const rule of rules) {
        if (await this.shouldEscalate(bordereau, rule)) {
          const escalationCase = await this.createEscalationCase(bordereau.id, rule.id);
          await this.executeEscalationActions(escalationCase, rule.actions);
          escalationCases.push(escalationCase);
        }
      }
    }

    return escalationCases;
  }

  private async getCandidateBordereaux(): Promise<any[]> {
    // Get bordereaux that might need escalation
    return this.prisma.bordereau.findMany({
      where: {
        statut: { in: ['ASSIGNE', 'EN_COURS', 'EN_DIFFICULTE'] }
      },
      include: {
        client: true,
        currentHandler: true
      }
    });
  }

  private async shouldEscalate(bordereau: any, rule: EscalationRule): Promise<boolean> {
    // Check if escalation already exists for this bordereau and rule
    const existingEscalation = await this.getExistingEscalation(bordereau.id, rule.id);
    if (existingEscalation) return false;

    // Evaluate all triggers
    for (const trigger of rule.triggers) {
      if (await this.evaluateTrigger(bordereau, trigger)) {
        return true;
      }
    }

    return false;
  }

  private async evaluateTrigger(bordereau: any, trigger: EscalationTrigger): Promise<boolean> {
    switch (trigger.type) {
      case 'time_based':
        return this.evaluateTimeTrigger(bordereau, trigger);
      case 'status_based':
        return this.evaluateStatusTrigger(bordereau, trigger);
      case 'quality_based':
        return this.evaluateQualityTrigger(bordereau, trigger);
      case 'workload_based':
        return this.evaluateWorkloadTrigger(bordereau, trigger);
      default:
        return false;
    }
  }

  private evaluateTimeTrigger(bordereau: any, trigger: EscalationTrigger): boolean {
    const now = new Date();
    const dueDate = new Date(bordereau.dateLimite);
    const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    switch (trigger.condition) {
      case 'days_overdue':
        return daysOverdue > trigger.threshold;
      case 'approaching_deadline':
        return daysOverdue > -trigger.threshold && daysOverdue <= 0;
      default:
        return false;
    }
  }

  private evaluateStatusTrigger(bordereau: any, trigger: EscalationTrigger): boolean {
    if (bordereau.statut !== trigger.value) return false;

    const now = new Date();
    const statusChangeDate = bordereau.updatedAt;
    const daysSinceChange = Math.ceil((now.getTime() - statusChangeDate.getTime()) / (1000 * 60 * 60 * 24));

    return daysSinceChange > trigger.threshold;
  }

  private async evaluateQualityTrigger(bordereau: any, trigger: EscalationTrigger): Promise<boolean> {
    // Get error count for this bordereau
    const errorCount = await this.prisma.auditLog.count({
      where: {
        action: 'PROCESSING_ERROR',
        details: {
          path: ['bordereauId'],
          equals: bordereau.id
        }
      }
    });

    switch (trigger.condition) {
      case 'error_count':
        return errorCount > trigger.threshold;
      default:
        return false;
    }
  }

  private async evaluateWorkloadTrigger(bordereau: any, trigger: EscalationTrigger): Promise<boolean> {
    if (!bordereau.currentHandlerId) return false;

    const currentLoad = await this.prisma.bordereau.count({
      where: {
        currentHandlerId: bordereau.currentHandlerId,
        statut: { in: ['ASSIGNE', 'EN_COURS'] }
      }
    });

    const user = await this.prisma.user.findUnique({
      where: { id: bordereau.currentHandlerId }
    });

    const capacity = 20; // Default capacity since capacity field doesn't exist
    const utilizationRate = currentLoad / capacity;

    switch (trigger.condition) {
      case 'utilization_rate':
        return utilizationRate > trigger.threshold;
      default:
        return false;
    }
  }

  // === ESCALATION CASE MANAGEMENT ===
  async createEscalationCase(bordereauId: string, ruleId: string): Promise<EscalationCase> {
    const escalationCase: EscalationCase = {
      id: `case_${Date.now()}`,
      bordereauId,
      ruleId,
      triggeredAt: new Date(),
      status: 'PENDING'
    };

    await this.prisma.auditLog.create({
      data: {
        userId: 'SYSTEM',
        action: 'ESCALATION_TRIGGERED',
        details: escalationCase
      }
    });

    return escalationCase;
  }

  async executeEscalationActions(escalationCase: EscalationCase, actions: EscalationAction[]): Promise<void> {
    for (const action of actions) {
      try {
        await this.executeAction(escalationCase, action);
      } catch (error) {
        this.logger.error(`Failed to execute escalation action: ${action.type}`, error);
      }
    }
  }

  private async executeAction(escalationCase: EscalationCase, action: EscalationAction): Promise<void> {
    switch (action.type) {
      case 'notify':
        await this.sendNotification(escalationCase, action);
        break;
      case 'reassign':
        await this.reassignBordereau(escalationCase, action);
        break;
      case 'priority_boost':
        await this.boostPriority(escalationCase, action);
        break;
      case 'manager_alert':
        await this.sendManagerAlert(escalationCase, action);
        break;
    }
  }

  private async sendNotification(escalationCase: EscalationCase, action: EscalationAction): Promise<void> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: escalationCase.bordereauId },
      include: { currentHandler: true }
    });

    if (!bordereau?.currentHandler) return;

    await this.prisma.auditLog.create({
      data: {
        userId: bordereau.currentHandler.id,
        action: 'ESCALATION_NOTIFICATION',
        details: {
          escalationCaseId: escalationCase.id,
          message: action.parameters.message,
          timestamp: new Date().toISOString()
        }
      }
    });
  }

  private async reassignBordereau(escalationCase: EscalationCase, action: EscalationAction): Promise<void> {
    const newAssigneeId = await this.findReassignmentTarget(escalationCase, action);
    
    if (newAssigneeId) {
      await this.prisma.bordereau.update({
        where: { id: escalationCase.bordereauId },
        data: {
          currentHandlerId: newAssigneeId
        }
      });

      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'ESCALATION_REASSIGNMENT',
          details: {
            escalationCaseId: escalationCase.id,
            newAssigneeId,
            reason: action.parameters.reason,
            timestamp: new Date().toISOString()
          }
        }
      });
    }
  }

  private async boostPriority(escalationCase: EscalationCase, action: EscalationAction): Promise<void> {
    await this.prisma.bordereau.update({
      where: { id: escalationCase.bordereauId },
      data: {
        priority: action.parameters.new_priority
      }
    });

    await this.prisma.auditLog.create({
      data: {
        userId: 'SYSTEM',
        action: 'ESCALATION_PRIORITY_BOOST',
        details: {
          escalationCaseId: escalationCase.id,
          newPriority: action.parameters.new_priority,
          timestamp: new Date().toISOString()
        }
      }
    });
  }

  private async sendManagerAlert(escalationCase: EscalationCase, action: EscalationAction): Promise<void> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: escalationCase.bordereauId },
      include: { currentHandler: true }
    });

    const managerId = await this.getManagerId(action.target, bordereau);
    
    if (managerId) {
      await this.prisma.auditLog.create({
        data: {
          userId: managerId,
          action: 'ESCALATION_MANAGER_ALERT',
          details: {
            escalationCaseId: escalationCase.id,
            urgency: action.parameters.urgency,
            bordereauId: escalationCase.bordereauId,
            timestamp: new Date().toISOString()
          }
        }
      });
    }
  }

  // === ESCALATION TRACKING ===
  async getEscalationCases(filters?: any): Promise<EscalationCase[]> {
    // Mock escalation cases for development
    return [
      {
        id: 'case_001',
        bordereauId: 'bordereau_001',
        ruleId: 'rule_sla_breach',
        triggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'IN_PROGRESS',
        assignedTo: 'manager_001'
      },
      {
        id: 'case_002',
        bordereauId: 'bordereau_002',
        ruleId: 'rule_stuck_processing',
        triggeredAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        status: 'RESOLVED',
        assignedTo: 'team_leader_001',
        resolution: 'Reassigned to senior specialist',
        resolvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    ];
  }

  async resolveEscalationCase(caseId: string, resolution: string, userId: string): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'ESCALATION_RESOLVED',
        details: {
          escalationCaseId: caseId,
          resolution,
          resolvedAt: new Date().toISOString()
        }
      }
    });
  }

  async getEscalationStatistics(period: string = '30d'): Promise<any> {
    const dateRange = this.getDateRange(period);
    
    // Mock statistics
    return {
      totalEscalations: 15,
      resolvedEscalations: 12,
      pendingEscalations: 3,
      avgResolutionTime: 4.2, // hours
      escalationsByRule: [
        { ruleId: 'rule_sla_breach', count: 8 },
        { ruleId: 'rule_stuck_processing', count: 4 },
        { ruleId: 'rule_quality_issues', count: 2 },
        { ruleId: 'rule_workload_overload', count: 1 }
      ],
      escalationTrends: [
        { date: '2024-01-01', count: 2 },
        { date: '2024-01-02', count: 1 },
        { date: '2024-01-03', count: 3 }
      ]
    };
  }

  // === HELPER METHODS ===
  private async getExistingEscalation(bordereauId: string, ruleId: string): Promise<boolean> {
    const existing = await this.prisma.auditLog.findFirst({
      where: {
        action: 'ESCALATION_TRIGGERED',
        details: {
          path: ['bordereauId'],
          equals: bordereauId
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    return !!existing;
  }

  private async findReassignmentTarget(escalationCase: EscalationCase, action: EscalationAction): Promise<string | null> {
    switch (action.target) {
      case 'team_leader':
        return this.findTeamLeader(escalationCase.bordereauId);
      case 'senior_specialist':
        return this.findSeniorSpecialist();
      case 'available_team_member':
        return this.findAvailableTeamMember(escalationCase.bordereauId);
      default:
        return null;
    }
  }

  private async findTeamLeader(bordereauId: string): Promise<string | null> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { currentHandler: true }
    });

    if (!bordereau?.currentHandler?.department) return null;

    const teamLeader = await this.prisma.user.findFirst({
      where: {
        department: bordereau.currentHandler.department,
        role: 'CHEF_EQUIPE'
      }
    });

    return teamLeader?.id || null;
  }

  private async findSeniorSpecialist(): Promise<string | null> {
    const specialist = await this.prisma.user.findFirst({
      where: {
        role: 'GESTIONNAIRE',
        // Add criteria for senior specialist
      }
    });

    return specialist?.id || null;
  }

  private async findAvailableTeamMember(bordereauId: string): Promise<string | null> {
    // Find team member with lowest workload
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { currentHandler: true }
    });

    if (!bordereau?.currentHandler?.department) return null;

    const teamMembers = await this.prisma.user.findMany({
      where: {
        department: bordereau.currentHandler.department,
        role: 'GESTIONNAIRE'
      }
    });

    // Find member with lowest current workload
    let bestMember: any = null;
    let lowestLoad = Infinity;

    for (const member of teamMembers) {
      const currentLoad = await this.prisma.bordereau.count({
        where: {
          currentHandlerId: member.id,
          statut: { in: ['ASSIGNE', 'EN_COURS'] }
        }
      });

      if (currentLoad < lowestLoad) {
        lowestLoad = currentLoad;
        bestMember = member;
      }
    }

    return bestMember?.id || null;
  }

  private async getManagerId(target: string, bordereau: any): Promise<string | null> {
    switch (target) {
      case 'team_leader':
        return this.findTeamLeader(bordereau.id);
      case 'quality_manager':
        const qualityManager = await this.prisma.user.findFirst({
          where: { role: 'QUALITY_MANAGER' }
        });
        return qualityManager?.id || null;
      default:
        return null;
    }
  }

  private getDateRange(period: string): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      default:
        start.setDate(end.getDate() - 30);
    }

    return { start, end };
  }
}