import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface AssignmentRule {
  priority: number;
  condition: (bordereau: any, user: any) => boolean;
  weight: number;
}

interface UserScore {
  user: any;
  score: number;
  workload: number;
  performance: number;
  availability: number;
}

@Injectable()
export class AssignmentEngineService {
  private readonly logger = new Logger(AssignmentEngineService.name);

  private assignmentRules: AssignmentRule[] = [
    {
      priority: 1,
      condition: (bordereau, user) => 
        bordereau.client?.accountManagerId === user.id,
      weight: 10 // Highest priority for account manager
    },
    {
      priority: 2,
      condition: (bordereau, user) => 
        user.department === bordereau.client?.department,
      weight: 8 // Department match
    },
    {
      priority: 3,
      condition: (bordereau, user) => 
        user.expertise?.includes(bordereau.type),
      weight: 6 // Expertise match
    },
    {
      priority: 4,
      condition: (bordereau, user) => 
        bordereau.statusColor === 'RED' && user.seniorityLevel >= 3,
      weight: 7 // Senior users for urgent cases
    }
  ];

  constructor(private prisma: PrismaService) {}

  async autoAssignBordereau(bordereauId: string): Promise<string | null> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { 
        client: true, 
        contract: true 
      }
    });

    if (!bordereau) {
      throw new Error('Bordereau not found');
    }

    // Get eligible users
    const eligibleUsers = await this.getEligibleUsers();
    
    if (eligibleUsers.length === 0) {
      this.logger.warn('No eligible users found for assignment');
      return null;
    }

    // Calculate scores for each user
    const userScores = await this.calculateUserScores(bordereau, eligibleUsers);
    
    // Sort by score (highest first)
    userScores.sort((a, b) => b.score - a.score);
    
    const selectedUser = userScores[0].user;
    
    // Assign bordereau
    await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: {
        assignedToUserId: selectedUser.id,
        statut: 'ASSIGNE'
      }
    });

    // Log assignment decision
    await this.logAssignmentDecision(bordereauId, selectedUser.id, userScores);

    this.logger.log(`Auto-assigned bordereau ${bordereauId} to user ${selectedUser.id} (score: ${userScores[0].score})`);
    
    return selectedUser.id;
  }

  async batchAssignBordereaux(bordereauIds: string[], options?: {
    balanceWorkload?: boolean;
    respectExpertise?: boolean;
    prioritizeUrgent?: boolean;
  }): Promise<{ [bordereauId: string]: string }> {
    const assignments: { [bordereauId: string]: string } = {};
    
    // Get all bordereaux
    const bordereaux = await this.prisma.bordereau.findMany({
      where: { id: { in: bordereauIds } },
      include: { client: true, contract: true }
    });

    // Get eligible users
    const eligibleUsers = await this.getEligibleUsers();
    
    if (eligibleUsers.length === 0) {
      throw new Error('No eligible users found for batch assignment');
    }

    // Sort bordereaux by priority if requested
    if (options?.prioritizeUrgent) {
      bordereaux.sort((a, b) => {
        const aPriority = this.getBordereauPriority(a);
        const bPriority = this.getBordereauPriority(b);
        return bPriority - aPriority;
      });
    }

    // Track user workloads during assignment
    const userWorkloads = new Map<string, number>();
    for (const user of eligibleUsers) {
      const currentWorkload = await this.getCurrentWorkload(user.id);
      userWorkloads.set(user.id, currentWorkload);
    }

    // Assign each bordereau
    for (const bordereau of bordereaux) {
      const userScores = await this.calculateUserScores(bordereau, eligibleUsers);
      
      // Adjust scores based on current workload if balance is requested
      if (options?.balanceWorkload) {
        userScores.forEach(userScore => {
          const currentWorkload = userWorkloads.get(userScore.user.id) || 0;
          const workloadPenalty = currentWorkload * 0.5; // Reduce score based on workload
          userScore.score = Math.max(0, userScore.score - workloadPenalty);
        });
      }

      // Sort and select best user
      userScores.sort((a, b) => b.score - a.score);
      const selectedUser = userScores[0].user;
      
      // Update workload tracking
      const currentWorkload = userWorkloads.get(selectedUser.id) || 0;
      userWorkloads.set(selectedUser.id, currentWorkload + 1);
      
      assignments[bordereau.id] = selectedUser.id;
    }

    // Execute batch assignment
    for (const [bordereauId, userId] of Object.entries(assignments)) {
      await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: {
          assignedToUserId: userId,
          statut: 'ASSIGNE'
        }
      });
    }

    this.logger.log(`Batch assigned ${bordereauIds.length} bordereaux`);
    
    return assignments;
  }

  private async getEligibleUsers(): Promise<any[]> {
    return this.prisma.user.findMany({
      where: {
        role: { in: ['GESTIONNAIRE', 'CHEF_EQUIPE'] },
        active: true
      },
      include: {
        bordereauxCurrentHandler: {
          where: { statut: { notIn: ['CLOTURE', 'TRAITE'] } }
        }
      }
    });
  }

  private async calculateUserScores(bordereau: any, users: any[]): Promise<UserScore[]> {
    const userScores: UserScore[] = [];

    for (const user of users) {
      let score = 0;
      
      // Apply assignment rules
      for (const rule of this.assignmentRules) {
        if (rule.condition(bordereau, user)) {
          score += rule.weight;
        }
      }

      // Calculate workload factor
      const workload = await this.getCurrentWorkload(user.id);
      const workloadScore = Math.max(0, 10 - workload); // Lower workload = higher score
      
      // Calculate performance factor
      const performance = await this.getUserPerformance(user.id);
      const performanceScore = performance * 2; // Performance multiplier
      
      // Calculate availability factor
      const availability = await this.getUserAvailability(user.id);
      const availabilityScore = availability ? 5 : 0;
      
      const totalScore = score + workloadScore + performanceScore + availabilityScore;
      
      userScores.push({
        user,
        score: totalScore,
        workload,
        performance,
        availability: availability ? 1 : 0
      });
    }

    return userScores;
  }

  private async getCurrentWorkload(userId: string): Promise<number> {
    return this.prisma.bordereau.count({
      where: {
        assignedToUserId: userId,
        statut: { notIn: ['CLOTURE', 'TRAITE'] }
      }
    });
  }

  private async getUserPerformance(userId: string): Promise<number> {
    // Calculate performance based on average processing time and quality
    const completedBordereaux = await this.prisma.bordereau.findMany({
      where: {
        assignedToUserId: userId,
        statut: 'CLOTURE',
        dateCloture: { not: null }
      },
      take: 20, // Last 20 completed
      orderBy: { dateCloture: 'desc' }
    });

    if (completedBordereaux.length === 0) return 3; // Default performance

    let totalScore = 0;
    for (const bordereau of completedBordereaux) {
      const processingTime = this.calculateProcessingTime(bordereau);
      const slaCompliance = this.calculateSLACompliance(bordereau);
      
      // Score based on speed and compliance
      const speedScore = Math.max(0, 5 - processingTime); // Faster = better
      const complianceScore = slaCompliance ? 5 : 0;
      
      totalScore += (speedScore + complianceScore) / 2;
    }

    return totalScore / completedBordereaux.length;
  }

  private async getUserAvailability(userId: string): Promise<boolean> {
    // Check if user is available (not on leave, not overloaded)
    const currentWorkload = await this.getCurrentWorkload(userId);
    const maxWorkload = 15; // Configurable threshold
    
    return currentWorkload < maxWorkload;
  }

  private getBordereauPriority(bordereau: any): number {
    let priority = 0;
    
    // SLA urgency
    const daysElapsed = Math.floor(
      (Date.now() - new Date(bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysRemaining = bordereau.delaiReglement - daysElapsed;
    
    if (daysRemaining <= 0) priority += 10; // Overdue
    else if (daysRemaining <= 2) priority += 7; // Very urgent
    else if (daysRemaining <= 5) priority += 4; // Urgent
    
    // Client importance (if VIP client)
    if (bordereau.client?.isVIP) priority += 3;
    
    // Amount importance
    if (bordereau.montant && bordereau.montant > 10000) priority += 2;
    
    return priority;
  }

  private calculateProcessingTime(bordereau: any): number {
    if (!bordereau.dateCloture) return 0;
    
    const start = new Date(bordereau.dateReception);
    const end = new Date(bordereau.dateCloture);
    
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  private calculateSLACompliance(bordereau: any): boolean {
    if (!bordereau.dateCloture) return false;
    
    const processingTime = this.calculateProcessingTime(bordereau);
    return processingTime <= bordereau.delaiReglement;
  }

  private async logAssignmentDecision(bordereauId: string, userId: string, userScores: UserScore[]) {
    const decision = {
      selectedUser: userId,
      scores: userScores.map(us => ({
        userId: us.user.id,
        score: us.score,
        workload: us.workload,
        performance: us.performance,
        availability: us.availability
      }))
    };

    await this.prisma.auditLog.create({
      data: {
        userId: 'SYSTEM',
        action: 'AUTO_ASSIGNMENT_DECISION',
        details: { bordereauId, decision }
      }
    }).catch(() => {
      this.logger.warn(`Failed to log assignment decision for bordereau ${bordereauId}`);
    });
  }

  // Rebalancing suggestions
  async getRebalancingSuggestions(): Promise<{
    type: string;
    fromUser: any;
    toUser: any;
    suggestedCount: number;
    reason: string;
  }[]> {
    const users = await this.getEligibleUsers();
    const suggestions: {
      type: string;
      fromUser: any;
      toUser: any;
      suggestedCount: number;
      reason: string;
    }[] = [];

    // Calculate workload distribution
    const workloads = await Promise.all(
      users.map(async user => ({
        user,
        workload: await this.getCurrentWorkload(user.id),
        performance: await this.getUserPerformance(user.id)
      }))
    );

    // Find overloaded and underloaded users
    const avgWorkload = workloads.reduce((sum, w) => sum + w.workload, 0) / workloads.length;
    const overloaded = workloads.filter(w => w.workload > avgWorkload * 1.3);
    const underloaded = workloads.filter(w => w.workload < avgWorkload * 0.7);

    for (const over of overloaded) {
      for (const under of underloaded) {
        if (over.workload > under.workload + 2) {
          suggestions.push({
            type: 'REBALANCE',
            fromUser: over.user.id,
            toUser: under.user.id,
            suggestedCount: Math.floor((over.workload - under.workload) / 2),
            reason: `Rebalance workload: ${over.user.fullName} (${over.workload}) → ${under.user.fullName} (${under.workload})`
          });
        }
      }
    }

    return suggestions;
  }
}