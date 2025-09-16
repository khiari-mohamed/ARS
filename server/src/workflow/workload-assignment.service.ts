import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AutoNotificationService } from './auto-notification.service';

interface WorkloadStats {
  userId: string;
  fullName: string;
  role: string;
  currentLoad: number;
  capacity: number;
  utilizationRate: number;
  isOverloaded: boolean;
  specializations?: string[];
  teamId?: string;
}

@Injectable()
export class WorkloadAssignmentService {
  private readonly logger = new Logger(WorkloadAssignmentService.name);

  constructor(
    private prisma: PrismaService,
    private autoNotificationService: AutoNotificationService
  ) {}

  /**
   * Auto-assign bordereau based on workload, specialization, and client relationship
   */
  async autoAssignBordereau(bordereauId: string): Promise<{ success: boolean; assignedTo?: string; reason?: string; error?: string }> {
    try {
      // Get bordereau with client and contract info
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: bordereauId },
        include: {
          client: {
            include: { gestionnaires: true }
          },
          contract: {
            include: { assignedManager: true }
          }
        }
      });

      if (!bordereau) {
        return { success: false, error: 'Bordereau not found' };
      }

      // Step 1: Get preferred gestionnaires (chargé de compte)
      let preferredGestionnaires: any[] = [];
      
      if (bordereau.client.gestionnaires && bordereau.client.gestionnaires.length > 0) {
        preferredGestionnaires = bordereau.client.gestionnaires.filter(g => 
          g.role === 'GESTIONNAIRE' && g.active
        );
        this.logger.log(`Found ${preferredGestionnaires.length} preferred gestionnaires for client ${bordereau.client.name}`);
      }

      // Step 2: Get all available gestionnaires as fallback
      const allGestionnaires = await this.prisma.user.findMany({
        where: {
          role: 'GESTIONNAIRE',
          active: true
        }
      });

      // Step 3: Calculate workload for all gestionnaires
      const workloadStats = await this.calculateWorkloadStats([
        ...preferredGestionnaires,
        ...allGestionnaires.filter(g => !preferredGestionnaires.find(p => p.id === g.id))
      ]);

      // Step 4: Apply assignment logic
      let selectedGestionnaire: WorkloadStats | null = null;
      let assignmentReason = '';

      // Priority 1: Preferred gestionnaires with available capacity
      const availablePreferred = workloadStats
        .filter(stats => 
          preferredGestionnaires.find(p => p.id === stats.userId) && 
          !stats.isOverloaded
        )
        .sort((a, b) => a.utilizationRate - b.utilizationRate);

      if (availablePreferred.length > 0) {
        selectedGestionnaire = availablePreferred[0];
        assignmentReason = `Chargé de compte avec charge optimale (${Math.round(selectedGestionnaire.utilizationRate)}%)`;
      }

      // Priority 2: Any available gestionnaire
      if (!selectedGestionnaire) {
        const availableGestionnaires = workloadStats
          .filter(stats => !stats.isOverloaded)
          .sort((a, b) => a.utilizationRate - b.utilizationRate);

        if (availableGestionnaires.length > 0) {
          selectedGestionnaire = availableGestionnaires[0];
          assignmentReason = `Gestionnaire disponible avec charge optimale (${Math.round(selectedGestionnaire.utilizationRate)}%)`;
        }
      }

      // Priority 3: Least overloaded gestionnaire (emergency assignment)
      if (!selectedGestionnaire) {
        const leastOverloaded = workloadStats
          .sort((a, b) => a.utilizationRate - b.utilizationRate)[0];

        if (leastOverloaded) {
          selectedGestionnaire = leastOverloaded;
          assignmentReason = `Affectation d'urgence - gestionnaire le moins chargé (${Math.round(selectedGestionnaire.utilizationRate)}%)`;
          
          // Notify about overload situation
          await this.autoNotificationService.notifyAssignmentFailure(
            bordereauId,
            bordereau.reference,
            'Tous les gestionnaires sont surchargés - affectation d\'urgence effectuée'
          );
        }
      }

      if (!selectedGestionnaire) {
        await this.autoNotificationService.notifyAssignmentFailure(
          bordereauId,
          bordereau.reference,
          'Aucun gestionnaire disponible'
        );
        return { success: false, error: 'No available gestionnaires' };
      }

      // Step 5: Perform the assignment
      await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: {
          assignedToUserId: selectedGestionnaire.userId,
          statut: 'ASSIGNE',
          dateReceptionSante: new Date()
        }
      });

      // Step 6: Send notifications
      await this.autoNotificationService.notifyChefToGestionnaire(
        bordereauId,
        bordereau.reference,
        selectedGestionnaire.userId,
        'Système automatique'
      );

      // Step 7: Check for team overload after assignment
      setTimeout(() => this.autoNotificationService.checkAndNotifyTeamOverload(), 1000);

      this.logger.log(`✅ Auto-assigned bordereau ${bordereau.reference} to ${selectedGestionnaire.fullName}: ${assignmentReason}`);

      return {
        success: true,
        assignedTo: selectedGestionnaire.fullName,
        reason: assignmentReason
      };

    } catch (error) {
      this.logger.error(`Error in auto-assignment: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate workload statistics for gestionnaires
   */
  async calculateWorkloadStats(gestionnaires: any[]): Promise<WorkloadStats[]> {
    const stats: WorkloadStats[] = [];

    for (const gestionnaire of gestionnaires) {
      try {
        // Count active bordereaux assigned to this gestionnaire
        const activeBordereaux = await this.prisma.bordereau.count({
          where: {
            assignedToUserId: gestionnaire.id,
            statut: { notIn: ['CLOTURE', 'TRAITE'] },
            archived: false
          }
        });

        // Get user capacity (default 20 if not set)
        const capacity = gestionnaire.capacity || 20;
        const utilizationRate = (activeBordereaux / capacity) * 100;
        const isOverloaded = activeBordereaux > capacity;

        stats.push({
          userId: gestionnaire.id,
          fullName: gestionnaire.fullName,
          role: gestionnaire.role,
          currentLoad: activeBordereaux,
          capacity,
          utilizationRate,
          isOverloaded,
          teamId: gestionnaire.teamId
        });

      } catch (error) {
        this.logger.warn(`Error calculating workload for ${gestionnaire.fullName}: ${error.message}`);
      }
    }

    return stats;
  }

  /**
   * Get team workload overview
   */
  async getTeamWorkloadOverview(): Promise<{
    teams: any[];
    overloadedTeams: any[];
    totalWorkload: number;
    averageUtilization: number;
  }> {
    try {
      // Get all chefs (team leaders) with their team members
      const chefs = await this.prisma.user.findMany({
        where: { role: 'CHEF_EQUIPE', active: true },
        include: {
          bordereauxTeam: {
            where: { 
              statut: { notIn: ['CLOTURE', 'TRAITE'] },
              archived: false
            }
          }
        }
      });

      // Get all gestionnaires
      const gestionnaires = await this.prisma.user.findMany({
        where: { role: 'GESTIONNAIRE', active: true }
      });

      const workloadStats = await this.calculateWorkloadStats(gestionnaires);
      
      const teams = chefs.map(chef => {
        const teamWorkload = chef.bordereauxTeam.length;
        const teamCapacity = 100; // Configurable team capacity
        
        return {
          id: chef.id,
          name: chef.fullName,
          workload: teamWorkload,
          capacity: teamCapacity,
          utilizationRate: (teamWorkload / teamCapacity) * 100,
          isOverloaded: teamWorkload > teamCapacity,
          members: workloadStats.filter(s => s.teamId === chef.id)
        };
      });

      const overloadedTeams = teams.filter(team => team.isOverloaded);
      const totalWorkload = workloadStats.reduce((sum, stats) => sum + stats.currentLoad, 0);
      const averageUtilization = workloadStats.length > 0 
        ? workloadStats.reduce((sum, stats) => sum + stats.utilizationRate, 0) / workloadStats.length
        : 0;

      return {
        teams,
        overloadedTeams,
        totalWorkload,
        averageUtilization: Math.round(averageUtilization)
      };

    } catch (error) {
      this.logger.error(`Error getting team workload overview: ${error.message}`);
      return {
        teams: [],
        overloadedTeams: [],
        totalWorkload: 0,
        averageUtilization: 0
      };
    }
  }

  /**
   * Suggest reassignments to balance workload
   */
  async suggestReassignments(): Promise<{
    suggestions: Array<{
      bordereauId: string;
      reference: string;
      currentAssignee: string;
      suggestedAssignee: string;
      reason: string;
      priority: 'LOW' | 'MEDIUM' | 'HIGH';
    }>;
    totalSuggestions: number;
  }> {
    try {
      const gestionnaires = await this.prisma.user.findMany({
        where: { role: 'GESTIONNAIRE', active: true }
      });

      const workloadStats = await this.calculateWorkloadStats(gestionnaires);
      
      // Find overloaded gestionnaires
      const overloaded = workloadStats.filter(stats => stats.isOverloaded);
      const underutilized = workloadStats.filter(stats => stats.utilizationRate < 70);

      const suggestions: any[] = [];

      for (const overloadedGestionnaire of overloaded) {
        // Get their bordereaux (oldest first for reassignment)
        const bordereaux = await this.prisma.bordereau.findMany({
          where: {
            assignedToUserId: overloadedGestionnaire.userId,
            statut: { in: ['ASSIGNE', 'EN_COURS'] },
            archived: false
          },
          orderBy: { dateReception: 'asc' },
          take: Math.ceil(overloadedGestionnaire.currentLoad * 0.2) // Suggest reassigning 20%
        });

        for (const bordereau of bordereaux) {
          // Find best alternative assignee
          const bestAlternative = underutilized
            .filter(stats => stats.userId !== overloadedGestionnaire.userId)
            .sort((a, b) => a.utilizationRate - b.utilizationRate)[0];

          if (bestAlternative) {
            const priority = overloadedGestionnaire.utilizationRate > 150 ? 'HIGH' :
                           overloadedGestionnaire.utilizationRate > 120 ? 'MEDIUM' : 'LOW';

            suggestions.push({
              bordereauId: bordereau.id,
              reference: bordereau.reference,
              currentAssignee: overloadedGestionnaire.fullName,
              suggestedAssignee: bestAlternative.fullName,
              reason: `Rééquilibrage: ${overloadedGestionnaire.fullName} (${Math.round(overloadedGestionnaire.utilizationRate)}%) → ${bestAlternative.fullName} (${Math.round(bestAlternative.utilizationRate)}%)`,
              priority
            });
          }
        }
      }

      return {
        suggestions: suggestions.slice(0, 20), // Limit suggestions
        totalSuggestions: suggestions.length
      };

    } catch (error) {
      this.logger.error(`Error generating reassignment suggestions: ${error.message}`);
      return { suggestions: [], totalSuggestions: 0 };
    }
  }

  /**
   * Update user capacity
   */
  async updateUserCapacity(userId: string, newCapacity: number): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { capacity: newCapacity }
      });

      this.logger.log(`Updated capacity for user ${userId} to ${newCapacity}`);
    } catch (error) {
      this.logger.error(`Error updating user capacity: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get workload alerts
   */
  async getWorkloadAlerts(): Promise<{
    overloadedUsers: WorkloadStats[];
    underutilizedUsers: WorkloadStats[];
    criticalAlerts: number;
  }> {
    try {
      const gestionnaires = await this.prisma.user.findMany({
        where: { role: 'GESTIONNAIRE', active: true }
      });

      const workloadStats = await this.calculateWorkloadStats(gestionnaires);
      
      const overloadedUsers = workloadStats.filter(stats => stats.isOverloaded);
      const underutilizedUsers = workloadStats.filter(stats => stats.utilizationRate < 50);
      const criticalAlerts = workloadStats.filter(stats => stats.utilizationRate > 150).length;

      return {
        overloadedUsers,
        underutilizedUsers,
        criticalAlerts
      };

    } catch (error) {
      this.logger.error(`Error getting workload alerts: ${error.message}`);
      return {
        overloadedUsers: [],
        underutilizedUsers: [],
        criticalAlerts: 0
      };
    }
  }

  /**
   * Get BO corbeille - documents waiting for processing
   */
  async getBOCorbeille(): Promise<{
    items: any[];
    stats: {
      pending: number;
      processed: number;
      total: number;
    };
  }> {
    try {
      // Get bordereaux that are waiting for scan or processing
      const pendingBordereaux = await this.prisma.bordereau.findMany({
        where: {
          statut: { in: ['EN_ATTENTE', 'A_SCANNER'] },
          archived: false
        },
        include: {
          client: {
            select: { name: true }
          }
        },
        orderBy: { dateReception: 'desc' },
        take: 50
      });

      // Get stats
      const [pending, processed, total] = await Promise.all([
        this.prisma.bordereau.count({
          where: {
            statut: { in: ['EN_ATTENTE', 'A_SCANNER'] },
            archived: false
          }
        }),
        this.prisma.bordereau.count({
          where: {
            statut: { in: ['SCANNE', 'TRAITE', 'CLOTURE'] },
            archived: false
          }
        }),
        this.prisma.bordereau.count({
          where: { archived: false }
        })
      ]);

      // Format items for BO corbeille
      const items = pendingBordereaux.map(bordereau => ({
        id: bordereau.id,
        reference: bordereau.reference,
        clientName: bordereau.client?.name || 'Client inconnu',
        subject: `${bordereau.nombreBS} BS`,
        createdAt: bordereau.dateReception,
        statut: bordereau.statut
      }));

      return {
        items,
        stats: {
          pending,
          processed,
          total
        }
      };

    } catch (error) {
      this.logger.error(`Error getting BO corbeille: ${error.message}`);
      return {
        items: [],
        stats: {
          pending: 0,
          processed: 0,
          total: 0
        }
      };
    }
  }
}