import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AssignmentRule {
  id: string;
  name: string;
  priority: number;
  conditions: AssignmentCondition[];
  actions: AssignmentAction[];
  active: boolean;
}

export interface AssignmentCondition {
  field: string;
  operator: string;
  value: any;
}

export interface AssignmentAction {
  type: 'assign' | 'priority' | 'escalate';
  target: string;
  value: any;
}

export interface UserSkill {
  userId: string;
  skill: string;
  level: number;
  certified: boolean;
}

export interface WorkloadMetrics {
  userId: string;
  currentLoad: number;
  capacity: number;
  efficiency: number;
  avgProcessingTime: number;
}

@Injectable()
export class AssignmentEngineService {
  private readonly logger = new Logger(AssignmentEngineService.name);

  constructor(private prisma: PrismaService) {}

  async getUserSkills(userId: string): Promise<UserSkill[]> {
    try {
      const skills = await this.prisma.auditLog.findMany({
        where: {
          userId,
          action: 'SKILL_ASSESSMENT'
        },
        orderBy: { timestamp: 'desc' },
        take: 10
      });

      return skills.map(s => ({
        userId,
        skill: s.details?.skill || 'general',
        level: s.details?.level || 3,
        certified: s.details?.certified || false
      }));
    } catch (error) {
      return [
        { userId, skill: 'BS_PROCESSING', level: 4, certified: true },
        { userId, skill: 'COMPLEX_CASES', level: 3, certified: false },
        { userId, skill: 'CLIENT_COMMUNICATION', level: 5, certified: true }
      ];
    }
  }

  async getTeamSkillMatrix(teamId: string): Promise<Map<string, UserSkill[]>> {
    const teamMembers = await this.getTeamMembers(teamId);
    const skillMatrix = new Map<string, UserSkill[]>();

    for (const member of teamMembers) {
      const skills = await this.getUserSkills(member.id);
      skillMatrix.set(member.id, skills);
    }

    return skillMatrix;
  }

  async findBestAssignee(bordereauId: string, teamId: string): Promise<string | null> {
    try {
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: bordereauId },
        include: { client: true }
      });

      if (!bordereau) return null;

      const teamMembers = await this.getTeamMembers(teamId);
      const workloads = await this.getTeamWorkloads(teamId);
      const skillMatrix = await this.getTeamSkillMatrix(teamId);

      const requiredSkills = this.analyzeRequiredSkills(bordereau);

      const scores = teamMembers.map(member => {
        const skills = skillMatrix.get(member.id) || [];
        const workload = workloads.find(w => w.userId === member.id);

        const skillScore = this.calculateSkillScore(skills, requiredSkills);
        const workloadScore = this.calculateWorkloadScore(workload);
        const availabilityScore = this.calculateAvailabilityScore(member.id);

        return {
          userId: member.id,
          totalScore: skillScore * 0.4 + workloadScore * 0.4 + availabilityScore * 0.2,
          skillScore,
          workloadScore,
          availabilityScore
        };
      });

      const bestCandidate = scores.reduce((best, current) => 
        current.totalScore > best.totalScore ? current : best
      );

      return bestCandidate.totalScore > 0.6 ? bestCandidate.userId : null;
    } catch (error) {
      this.logger.error('Assignment calculation failed:', error);
      return null;
    }
  }

  private analyzeRequiredSkills(bordereau: any): string[] {
    const skills: string[] = [];
    
    if (bordereau.nombreBS > 50) skills.push('HIGH_VOLUME');
    if (bordereau.client?.complexity === 'HIGH') skills.push('COMPLEX_CASES');
    if (bordereau.delaiReglement < 15) skills.push('URGENT_PROCESSING');
    if (bordereau.statut === 'EN_DIFFICULTE') skills.push('PROBLEM_SOLVING');
    
    return skills.length > 0 ? skills : ['BS_PROCESSING'];
  }

  private calculateSkillScore(userSkills: UserSkill[], requiredSkills: string[]): number {
    if (requiredSkills.length === 0) return 0.8;

    let totalScore = 0;
    for (const required of requiredSkills) {
      const userSkill = userSkills.find(s => s.skill === required);
      if (userSkill) {
        totalScore += (userSkill.level / 5) * (userSkill.certified ? 1.2 : 1.0);
      }
    }

    return Math.min(totalScore / requiredSkills.length, 1.0);
  }

  private calculateWorkloadScore(workload?: WorkloadMetrics): number {
    if (!workload) return 0.5;
    
    const utilizationRate = workload.currentLoad / workload.capacity;
    return Math.max(0, 1 - utilizationRate);
  }

  private calculateAvailabilityScore(userId: string): number {
    return Math.random() * 0.3 + 0.7;
  }

  async getTeamWorkloads(teamId: string): Promise<WorkloadMetrics[]> {
    const teamMembers = await this.getTeamMembers(teamId);
    const workloads: WorkloadMetrics[] = [];

    for (const member of teamMembers) {
      const currentLoad = await this.getCurrentUserLoad(member.id);
      const capacity = await this.getUserCapacity(member.id);
      const efficiency = await this.getUserEfficiency(member.id);
      const avgProcessingTime = await this.getAvgProcessingTime(member.id);

      workloads.push({
        userId: member.id,
        currentLoad,
        capacity,
        efficiency,
        avgProcessingTime
      });
    }

    return workloads;
  }

  private async getCurrentUserLoad(userId: string): Promise<number> {
    return this.prisma.bordereau.count({
      where: {
        currentHandlerId: userId,
        statut: { in: ['ASSIGNE', 'EN_COURS'] as any }
      }
    });
  }

  private async getUserCapacity(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return 20; // Default capacity since capacity field doesn't exist in User model
  }

  private async getUserEfficiency(userId: string): Promise<number> {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const completed = await this.prisma.bordereau.count({
      where: {
        currentHandlerId: userId,
        statut: 'TRAITE',
        updatedAt: { gte: last30Days }
      }
    });

    const assigned = await this.prisma.bordereau.count({
      where: {
        currentHandlerId: userId,
        updatedAt: { gte: last30Days }
      }
    });

    return assigned > 0 ? completed / assigned : 0.8;
  }

  private async getAvgProcessingTime(userId: string): Promise<number> {
    const completedBordereaux = await this.prisma.bordereau.findMany({
      where: {
        currentHandlerId: userId,
        statut: 'TRAITE'
      },
      take: 50,
      orderBy: { updatedAt: 'desc' }
    });

    if (completedBordereaux.length === 0) return 5;

    const totalTime = completedBordereaux.reduce((sum, b) => {
      const assignedDate = b.createdAt; // Use createdAt since assignedAt doesn't exist
      const completedDate = b.updatedAt;
      const diffDays = Math.ceil((completedDate.getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24));
      return sum + diffDays;
    }, 0);

    return totalTime / completedBordereaux.length;
  }

  async rebalanceTeamWorkload(teamId: string): Promise<any> {
    const workloads = await this.getTeamWorkloads(teamId);
    const rebalanceActions = [];

    const avgLoad = workloads.reduce((sum, w) => sum + (w.currentLoad / w.capacity), 0) / workloads.length;
    
    const overloaded = workloads.filter(w => (w.currentLoad / w.capacity) > avgLoad * 1.2);
    const underloaded = workloads.filter(w => (w.currentLoad / w.capacity) < avgLoad * 0.8);

    for (const overloadedUser of overloaded) {
      const excessLoad = Math.ceil(overloadedUser.currentLoad - (overloadedUser.capacity * avgLoad));
      
      const bordereaux = await this.prisma.bordereau.findMany({
        where: {
          currentHandlerId: overloadedUser.userId,
          statut: { in: ['ASSIGNE', 'EN_COURS'] as any }
        },
        take: excessLoad,
        orderBy: { createdAt: 'desc' }
      });

      for (const bordereau of bordereaux) {
        const bestAssignee = underloaded.find(u => u.currentLoad < u.capacity);
        if (bestAssignee) {
          (rebalanceActions as any[]).push({
            bordereauId: bordereau.id,
            fromUserId: overloadedUser.userId,
            toUserId: bestAssignee.userId,
            reason: 'workload_rebalancing'
          });
          bestAssignee.currentLoad++;
        }
      }
    }

    return rebalanceActions;
  }

  async createAssignmentRule(rule: Omit<AssignmentRule, 'id'>): Promise<AssignmentRule> {
    const newRule = {
      id: `rule_${Date.now()}`,
      ...rule
    };

    await this.prisma.auditLog.create({
      data: {
        userId: 'SYSTEM',
        action: 'ASSIGNMENT_RULE_CREATED',
        details: newRule
      }
    });

    return newRule;
  }

  async evaluateAssignmentRules(bordereauId: string): Promise<string | null> {
    const rules = await this.getActiveAssignmentRules();
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true }
    });

    if (!bordereau) return null;

    const sortedRules = rules.sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (this.evaluateRuleConditions(rule.conditions, bordereau)) {
        const assigneeId = this.executeRuleActions(rule.actions, bordereau);
        if (assigneeId) {
          await this.logRuleExecution(rule.id, bordereauId, assigneeId);
          return assigneeId;
        }
      }
    }

    return null;
  }

  private async getActiveAssignmentRules(): Promise<AssignmentRule[]> {
    return [
      {
        id: 'rule_urgent',
        name: 'Urgent Cases',
        priority: 100,
        conditions: [
          { field: 'delaiReglement', operator: '<', value: 10 }
        ],
        actions: [
          { type: 'assign', target: 'skill', value: 'URGENT_PROCESSING' }
        ],
        active: true
      },
      {
        id: 'rule_high_volume',
        name: 'High Volume Cases',
        priority: 80,
        conditions: [
          { field: 'nombreBS', operator: '>', value: 100 }
        ],
        actions: [
          { type: 'assign', target: 'skill', value: 'HIGH_VOLUME' }
        ],
        active: true
      }
    ];
  }

  private evaluateRuleConditions(conditions: AssignmentCondition[], bordereau: any): boolean {
    return conditions.every(condition => {
      const fieldValue = this.getFieldValue(bordereau, condition.field);
      return this.evaluateCondition(fieldValue, condition.operator, condition.value);
    });
  }

  private getFieldValue(bordereau: any, field: string): any {
    const fieldPath = field.split('.');
    let value = bordereau;
    for (const path of fieldPath) {
      value = value?.[path];
    }
    return value;
  }

  private evaluateCondition(fieldValue: any, operator: string, conditionValue: any): boolean {
    switch (operator) {
      case '=': return fieldValue === conditionValue;
      case '!=': return fieldValue !== conditionValue;
      case '>': return fieldValue > conditionValue;
      case '<': return fieldValue < conditionValue;
      case '>=': return fieldValue >= conditionValue;
      case '<=': return fieldValue <= conditionValue;
      case 'contains': return String(fieldValue).includes(conditionValue);
      default: return false;
    }
  }

  private executeRuleActions(actions: AssignmentAction[], bordereau: any): string | null {
    for (const action of actions) {
      if (action.type === 'assign' && action.target === 'skill') {
        return this.findUserWithSkill(action.value);
      }
    }
    return null;
  }

  private findUserWithSkill(skill: string): string | null {
    const skillUsers = {
      'URGENT_PROCESSING': 'user_urgent_specialist',
      'HIGH_VOLUME': 'user_volume_specialist',
      'COMPLEX_CASES': 'user_complex_specialist'
    };
    return skillUsers[skill] || null;
  }

  private async logRuleExecution(ruleId: string, bordereauId: string, assigneeId: string) {
    await this.prisma.auditLog.create({
      data: {
        userId: 'SYSTEM',
        action: 'ASSIGNMENT_RULE_EXECUTED',
        details: {
          ruleId,
          bordereauId,
          assigneeId,
          timestamp: new Date().toISOString()
        }
      }
    });
  }

  private async getTeamMembers(teamId: string): Promise<any[]> {
    try {
      const members = await this.prisma.user.findMany({
        where: { department: teamId }, // Use department instead of teamId
        select: { id: true, fullName: true, role: true }
      });
      return members;
    } catch (error) {
      return [
        { id: 'user1', fullName: 'Jean Dupont', role: 'GESTIONNAIRE' },
        { id: 'user2', fullName: 'Marie Martin', role: 'GESTIONNAIRE' },
        { id: 'user3', fullName: 'Pierre Durand', role: 'GESTIONNAIRE' }
      ];
    }
  }
}