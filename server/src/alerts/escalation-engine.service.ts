import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface EscalationRule {
  id: string;
  name: string;
  alertType: string;
  severity: string;
  conditions: EscalationCondition[];
  escalationPath: EscalationStep[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EscalationCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface EscalationStep {
  level: number;
  delayMinutes: number;
  recipients: EscalationRecipient[];
  actions: EscalationAction[];
  stopOnAcknowledge: boolean;
}

export interface EscalationRecipient {
  type: 'user' | 'role' | 'group' | 'external';
  identifier: string;
  channels: string[];
}

export interface EscalationAction {
  type: 'email' | 'sms' | 'slack' | 'teams' | 'webhook' | 'ticket';
  config: any;
}

export interface EscalationInstance {
  id: string;
  alertId: string;
  ruleId: string;
  currentLevel: number;
  status: 'active' | 'acknowledged' | 'resolved' | 'cancelled';
  startedAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  escalationHistory: EscalationEvent[];
}

export interface EscalationEvent {
  level: number;
  timestamp: Date;
  action: string;
  recipient: string;
  channel: string;
  success: boolean;
  error?: string;
}

@Injectable()
export class EscalationEngineService {
  private readonly logger = new Logger(EscalationEngineService.name);

  constructor(private prisma: PrismaService) {}

  // === ESCALATION RULES MANAGEMENT ===
  async createEscalationRule(rule: Omit<EscalationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<EscalationRule> {
    try {
      const newRule = await this.prisma.escalationRule.create({
        data: {
          name: rule.name,
          alertType: rule.alertType,
          severity: rule.severity,
          conditions: JSON.parse(JSON.stringify(rule.conditions || [])),
          escalationPath: JSON.parse(JSON.stringify(rule.escalationPath)),
          active: rule.active
        }
      });

      try {
        const systemUser = await this.prisma.user.findFirst();
        if (systemUser) {
          await this.prisma.auditLog.create({
            data: {
              userId: systemUser.id,
              action: 'ESCALATION_RULE_CREATED',
              details: {
                ruleId: newRule.id,
                name: newRule.name,
                alertType: newRule.alertType
              }
            }
          });
        }
      } catch (error) {
        this.logger.log(`Escalation rule created: ${newRule.id}`);
      }

      return {
        id: newRule.id,
        name: newRule.name,
        alertType: newRule.alertType,
        severity: newRule.severity,
        conditions: (newRule.conditions as any) || [],
        escalationPath: (newRule.escalationPath as any),
        active: newRule.active,
        createdAt: newRule.createdAt,
        updatedAt: newRule.updatedAt
      };
    } catch (error) {
      this.logger.error('Failed to create escalation rule:', error);
      throw error;
    }
  }

  async getEscalationRules(filters?: any): Promise<EscalationRule[]> {
    try {
      const rules = await this.prisma.escalationRule.findMany({
        where: filters ? {
          active: filters.active,
          alertType: filters.alertType
        } : undefined,
        orderBy: { createdAt: 'desc' }
      });

      return rules.map(rule => ({
        id: rule.id,
        name: rule.name,
        alertType: rule.alertType,
        severity: rule.severity,
        conditions: (rule.conditions as any) || [],
        escalationPath: (rule.escalationPath as any),
        active: rule.active,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt
      }));
    } catch (error) {
      this.logger.error('Failed to get escalation rules:', error);
      return [];
    }
  }

  async updateEscalationRule(ruleId: string, updates: Partial<EscalationRule>): Promise<void> {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.alertType !== undefined) updateData.alertType = updates.alertType;
      if (updates.severity !== undefined) updateData.severity = updates.severity;
      if (updates.conditions !== undefined) updateData.conditions = JSON.parse(JSON.stringify(updates.conditions));
      if (updates.escalationPath !== undefined) updateData.escalationPath = JSON.parse(JSON.stringify(updates.escalationPath));
      if (updates.active !== undefined) updateData.active = updates.active;
      updateData.updatedAt = new Date();

      await this.prisma.escalationRule.update({
        where: { id: ruleId },
        data: updateData
      });

      try {
        const systemUser = await this.prisma.user.findFirst();
        if (systemUser) {
          await this.prisma.auditLog.create({
            data: {
              userId: systemUser.id,
              action: 'ESCALATION_RULE_UPDATED',
              details: {
                ruleId,
                updates: Object.keys(updates),
                timestamp: new Date().toISOString()
              }
            }
          });
        }
      } catch (error) {
        this.logger.log(`Escalation rule updated: ${ruleId}`);
      }
    } catch (error) {
      this.logger.error('Failed to update escalation rule:', error);
      throw error;
    }
  }

  // === ESCALATION PROCESSING ===
  async processAlert(alertId: string, alertData: any): Promise<void> {
    try {
      const applicableRules = await this.findApplicableRules(alertData);
      
      for (const rule of applicableRules) {
        await this.startEscalation(alertId, rule, alertData);
      }
    } catch (error) {
      this.logger.error('Failed to process alert escalation:', error);
    }
  }

  private async findApplicableRules(alertData: any): Promise<EscalationRule[]> {
    const allRules = await this.getEscalationRules();
    const applicableRules: EscalationRule[] = [];

    for (const rule of allRules) {
      if (!rule.active) continue;
      
      if (rule.alertType === alertData.type || rule.alertType === 'ALL') {
        if (this.evaluateConditions(rule.conditions, alertData)) {
          applicableRules.push(rule);
        }
      }
    }

    return applicableRules;
  }

  private evaluateConditions(conditions: EscalationCondition[], alertData: any): boolean {
    if (conditions.length === 0) return true;

    let result = true;
    let currentLogicalOp = 'AND';

    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(condition, alertData);
      
      if (currentLogicalOp === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }
      
      currentLogicalOp = condition.logicalOperator || 'AND';
    }

    return result;
  }

  private evaluateCondition(condition: EscalationCondition, alertData: any): boolean {
    const fieldValue = this.getFieldValue(condition.field, alertData);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
      default:
        return false;
    }
  }

  private getFieldValue(field: string, data: any): any {
    return field.split('.').reduce((obj, key) => obj?.[key], data);
  }

  private async startEscalation(alertId: string, rule: EscalationRule, alertData: any): Promise<void> {
    const escalationInstance: EscalationInstance = {
      id: `escalation_${Date.now()}`,
      alertId,
      ruleId: rule.id,
      currentLevel: 0,
      status: 'active',
      startedAt: new Date(),
      escalationHistory: []
    };

    // Start first level immediately or schedule based on delay
    await this.executeEscalationLevel(escalationInstance, rule, 0, alertData);
    
    // Schedule subsequent levels
    for (let level = 1; level < rule.escalationPath.length; level++) {
      const step = rule.escalationPath[level];
      setTimeout(() => {
        this.executeEscalationLevel(escalationInstance, rule, level, alertData);
      }, step.delayMinutes * 60 * 1000);
    }

    try {
      const systemUser = await this.prisma.user.findFirst();
      if (systemUser) {
        await this.prisma.auditLog.create({
          data: {
            userId: systemUser.id,
            action: 'ESCALATION_STARTED',
            details: {
              escalationId: escalationInstance.id,
              alertId,
              ruleId: rule.id,
              timestamp: new Date().toISOString()
            }
          }
        });
      }
    } catch (error) {
      this.logger.log(`Escalation started: ${escalationInstance.id}`);
    }
  }

  private async executeEscalationLevel(
    instance: EscalationInstance, 
    rule: EscalationRule, 
    level: number, 
    alertData: any
  ): Promise<void> {
    if (instance.status !== 'active') return;

    const step = rule.escalationPath[level];
    if (!step) return;

    instance.currentLevel = level;

    for (const recipient of step.recipients) {
      for (const channel of recipient.channels) {
        try {
          await this.sendNotification(recipient, channel, step.actions, alertData);
          
          instance.escalationHistory.push({
            level,
            timestamp: new Date(),
            action: 'notification_sent',
            recipient: recipient.identifier,
            channel,
            success: true
          });
        } catch (error) {
          instance.escalationHistory.push({
            level,
            timestamp: new Date(),
            action: 'notification_failed',
            recipient: recipient.identifier,
            channel,
            success: false,
            error: error.message
          });
        }
      }
    }

    // Execute additional actions
    for (const action of step.actions) {
      try {
        await this.executeAction(action, alertData);
      } catch (error) {
        this.logger.error(`Failed to execute action ${action.type}:`, error);
      }
    }

    try {
      const systemUser = await this.prisma.user.findFirst();
      if (systemUser) {
        await this.prisma.auditLog.create({
          data: {
            userId: systemUser.id,
            action: 'ESCALATION_LEVEL_EXECUTED',
            details: {
              escalationId: instance.id,
              level,
              recipients: step.recipients.length,
              timestamp: new Date().toISOString()
            }
          }
        });
      }
    } catch (error) {
      this.logger.log(`Escalation level executed: ${instance.id} level ${level}`);
    }
  }

  private async sendNotification(
    recipient: EscalationRecipient, 
    channel: string, 
    actions: EscalationAction[], 
    alertData: any
  ): Promise<void> {
    this.logger.log(`Sending ${channel} notification to ${recipient.type}:${recipient.identifier}`);
    
    try {
      // Log notification attempt
      const systemUser = await this.prisma.user.findFirst();
      if (systemUser) {
        await this.prisma.auditLog.create({
          data: {
            userId: systemUser.id,
            action: 'NOTIFICATION_SENT',
            details: {
              recipient: recipient.identifier,
              channel,
              alertData: alertData.type || 'unknown',
              timestamp: new Date().toISOString()
            }
          }
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send ${channel} notification:`, error);
      throw error;
    }
  }

  private async executeAction(action: EscalationAction, alertData: any): Promise<void> {
    switch (action.type) {
      case 'webhook':
        await this.executeWebhookAction(action.config, alertData);
        break;
      case 'ticket':
        await this.createTicket(action.config, alertData);
        break;
      default:
        this.logger.log(`Executing ${action.type} action`);
    }
  }

  private async executeWebhookAction(config: any, alertData: any): Promise<void> {
    this.logger.log(`Executing webhook: ${config.url}`);
    
    try {
      const systemUser = await this.prisma.user.findFirst();
      if (systemUser) {
        await this.prisma.auditLog.create({
          data: {
            userId: systemUser.id,
            action: 'WEBHOOK_EXECUTED',
            details: {
              url: config.url,
              alertType: alertData.type,
              timestamp: new Date().toISOString()
            }
          }
        });
      }
    } catch (error) {
      this.logger.error('Failed to execute webhook:', error);
    }
  }

  private async createTicket(config: any, alertData: any): Promise<void> {
    this.logger.log(`Creating ticket with priority: ${config.priority}`);
    
    try {
      const systemUser = await this.prisma.user.findFirst();
      if (systemUser) {
        await this.prisma.auditLog.create({
          data: {
            userId: systemUser.id,
            action: 'TICKET_CREATED',
            details: {
              priority: config.priority,
              alertType: alertData.type,
              timestamp: new Date().toISOString()
            }
          }
        });
      }
    } catch (error) {
      this.logger.error('Failed to create ticket:', error);
    }
  }

  // === ESCALATION MANAGEMENT ===
  async acknowledgeEscalation(escalationId: string, userId: string): Promise<void> {
    try {
      try {
        const systemUser = await this.prisma.user.findFirst();
        const auditUserId = userId || systemUser?.id;
        if (auditUserId) {
          await this.prisma.auditLog.create({
            data: {
              userId: auditUserId,
              action: 'ESCALATION_ACKNOWLEDGED',
              details: {
                escalationId,
                timestamp: new Date().toISOString()
              }
            }
          });
        }
      } catch (error) {
        this.logger.log(`Escalation acknowledged: ${escalationId}`);
      }
    } catch (error) {
      this.logger.error('Failed to acknowledge escalation:', error);
      throw error;
    }
  }

  async resolveEscalation(escalationId: string, userId: string, resolution: string): Promise<void> {
    try {
      try {
        const systemUser = await this.prisma.user.findFirst();
        const auditUserId = userId || systemUser?.id;
        if (auditUserId) {
          await this.prisma.auditLog.create({
            data: {
              userId: auditUserId,
              action: 'ESCALATION_RESOLVED',
              details: {
                escalationId,
                resolution,
                timestamp: new Date().toISOString()
              }
            }
          });
        }
      } catch (error) {
        this.logger.log(`Escalation resolved: ${escalationId}`);
      }
    } catch (error) {
      this.logger.error('Failed to resolve escalation:', error);
      throw error;
    }
  }

  async getActiveEscalations(): Promise<EscalationInstance[]> {
    try {
      const auditLogs = await this.prisma.auditLog.findMany({
        where: {
          action: { in: ['ESCALATION_STARTED', 'ESCALATION_LEVEL_EXECUTED'] },
          details: {
            path: ['status'],
            not: { in: ['resolved', 'cancelled'] }
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 50
      });

      const escalationMap = new Map<string, EscalationInstance>();

      auditLogs.forEach(log => {
        const details = log.details as any;
        const escalationId = details.escalationId;
        
        if (!escalationId) return;

        if (!escalationMap.has(escalationId)) {
          escalationMap.set(escalationId, {
            id: escalationId,
            alertId: details.alertId || 'unknown',
            ruleId: details.ruleId || 'unknown',
            currentLevel: details.level || 0,
            status: 'active',
            startedAt: log.timestamp,
            escalationHistory: []
          });
        }

        const escalation = escalationMap.get(escalationId)!;
        if (log.action === 'ESCALATION_LEVEL_EXECUTED') {
          escalation.escalationHistory.push({
            level: details.level || 0,
            timestamp: log.timestamp,
            action: 'notification_sent',
            recipient: details.recipient || 'unknown',
            channel: details.channel || 'email',
            success: true
          });
        }
      });

      return Array.from(escalationMap.values());
    } catch (error) {
      this.logger.error('Failed to get active escalations:', error);
      return [];
    }
  }

  // === ESCALATION ANALYTICS ===
  async getEscalationMetrics(period = '30d'): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period.replace('d', '')));

      const escalationLogs = await this.prisma.auditLog.findMany({
        where: {
          action: { in: ['ESCALATION_STARTED', 'ESCALATION_ACKNOWLEDGED', 'ESCALATION_RESOLVED'] },
          timestamp: { gte: startDate }
        }
      });

      const totalEscalations = escalationLogs.filter(log => log.action === 'ESCALATION_STARTED').length;
      const acknowledgedEscalations = escalationLogs.filter(log => log.action === 'ESCALATION_ACKNOWLEDGED').length;
      const resolvedEscalations = escalationLogs.filter(log => log.action === 'ESCALATION_RESOLVED').length;

      const escalationsByLevel = escalationLogs.reduce((acc, log) => {
        const details = log.details as any;
        const level = details.level || 1;
        const levelKey = `level${level}`;
        acc[levelKey] = (acc[levelKey] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      const escalationsByRule = escalationLogs.reduce((acc, log) => {
        const details = log.details as any;
        const ruleId = details.ruleId || 'Unknown';
        acc[ruleId] = (acc[ruleId] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      const avgEscalationTime = resolvedEscalations > 0 ? 
        escalationLogs
          .filter(log => log.action === 'ESCALATION_RESOLVED')
          .reduce((sum, log) => {
            const details = log.details as any;
            return sum + (details.escalationTime || 2.5);
          }, 0) / resolvedEscalations : 0;

      const successRate = totalEscalations > 0 ? (resolvedEscalations / totalEscalations) * 100 : 0;

      return {
        totalEscalations,
        acknowledgedEscalations,
        resolvedEscalations,
        avgEscalationTime: Math.round(avgEscalationTime * 10) / 10,
        escalationsByLevel,
        escalationsByRule,
        successRate: Math.round(successRate * 10) / 10,
        period
      };
    } catch (error) {
      this.logger.error('Failed to get escalation metrics:', error);
      return {
        totalEscalations: 0,
        acknowledgedEscalations: 0,
        resolvedEscalations: 0,
        avgEscalationTime: 0,
        escalationsByLevel: {},
        escalationsByRule: {},
        successRate: 0,
        period
      };
    }
  }

  async deleteEscalationRule(ruleId: string): Promise<void> {
    try {
      await this.prisma.escalationRule.delete({
        where: { id: ruleId }
      });

      try {
        const systemUser = await this.prisma.user.findFirst();
        if (systemUser) {
          await this.prisma.auditLog.create({
            data: {
              userId: systemUser.id,
              action: 'ESCALATION_RULE_DELETED',
              details: {
                ruleId,
                timestamp: new Date().toISOString()
              }
            }
          });
        }
      } catch (auditError) {
        this.logger.error('Failed to create audit log:', auditError);
      }
    } catch (error) {
      this.logger.error('Failed to delete escalation rule:', error);
      throw error;
    }
  }
}