import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CorbeilleItem {
  id: string;
  type: 'reclamation';
  reference: string;
  clientName: string;
  subject: string;
  priority: string;
  status: string;
  createdAt: Date;
  assignedTo?: string;
  slaStatus: 'ON_TIME' | 'AT_RISK' | 'OVERDUE' | 'CRITICAL';
  remainingTime: number; // in hours
}

export interface CorbeilleStats {
  nonAffectes: number;
  enCours: number;
  traites: number;
  enRetard: number;
  critiques: number;
}

@Injectable()
export class CorbeilleService {
  private readonly logger = new Logger(CorbeilleService.name);

  constructor(private prisma: PrismaService) {}

  // Chef d'Équipe - Global Corbeille
  async getChefCorbeille(userId: string): Promise<{
    nonAffectes: CorbeilleItem[];
    enCours: CorbeilleItem[];
    traites: CorbeilleItem[];
    stats: CorbeilleStats;
  }> {
    try {
      // Non affectés: OPEN status without assignment
      const nonAffectes = await this.getUnassignedReclamations();
      
      // En cours: IN_PROGRESS, EN_COURS, ESCALATED, or assigned OPEN items
      const enCours = await this.getInProgressReclamations();
      
      // Traités: RESOLVED, CLOSED, FERMEE, etc.
      const traites = await this.getResolvedReclamations();

      const stats = await this.calculateStats();

      return {
        nonAffectes,
        enCours,
        traites,
        stats
      };
    } catch (error) {
      this.logger.error('Failed to get chef corbeille:', error);
      return {
        nonAffectes: [],
        enCours: [],
        traites: [],
        stats: { nonAffectes: 0, enCours: 0, traites: 0, enRetard: 0, critiques: 0 }
      };
    }
  }

  // Gestionnaire - Personal Corbeille
  async getGestionnaireCorbeille(userId: string): Promise<{
    enCours: CorbeilleItem[];
    traites: CorbeilleItem[];
    retournes: CorbeilleItem[];
    stats: CorbeilleStats;
  }> {
    try {
      const [enCours, traites, retournes] = await Promise.all([
        this.getReclamationsByStatus(['IN_PROGRESS', 'ESCALATED'], userId),
        this.getReclamationsByStatus(['RESOLVED'], userId),
        this.getReclamationsByStatus(['OPEN'], userId, true) // returned items
      ]);

      const stats = await this.calculatePersonalStats(userId);

      return {
        enCours,
        traites,
        retournes,
        stats
      };
    } catch (error) {
      this.logger.error('Failed to get gestionnaire corbeille:', error);
      return {
        enCours: [],
        traites: [],
        retournes: [],
        stats: { nonAffectes: 0, enCours: 0, traites: 0, enRetard: 0, critiques: 0 }
      };
    }
  }

  // Get reclamations by status
  private async getReclamationsByStatus(
    statuses: string[], 
    assignedToId?: string | null,
    isReturned = false
  ): Promise<CorbeilleItem[]> {
    try {
      // Handle different status formats in database
      const normalizedStatuses = statuses.flatMap(status => {
        switch (status.toUpperCase()) {
          case 'OPEN':
            return ['OPEN', 'open', 'OUVERTE', 'OUVERT'];
          case 'IN_PROGRESS':
            return ['IN_PROGRESS', 'EN_COURS', 'en_cours'];
          case 'RESOLVED':
            return ['RESOLVED', 'RESOLU', 'FERMEE', 'CLOSED'];
          case 'ESCALATED':
            return ['ESCALATED', 'ESCALADE'];
          default:
            return [status];
        }
      });

      const where: any = {
        status: { in: normalizedStatuses }
      };

      if (assignedToId) {
        where.assignedToId = assignedToId;
      } else if (assignedToId === null) {
        where.assignedToId = null;
      }

      const reclamations = await this.prisma.reclamation.findMany({
        where,
        include: {
          client: { select: { name: true } },
          assignedTo: { select: { fullName: true } }
        },
        orderBy: [
          { createdAt: 'desc' }
        ]
      });

      const items: CorbeilleItem[] = [];

      for (const rec of reclamations) {
        const slaStatus = await this.calculateSLAStatus(rec);
        
        // Normalize severity for display
        let normalizedSeverity = rec.severity;
        const sev = rec.severity?.toLowerCase();
        if (sev === 'haute' || sev === 'high') normalizedSeverity = 'critical';
        else if (sev === 'moyenne' || sev === 'medium') normalizedSeverity = 'medium';
        else if (sev === 'faible' || sev === 'low') normalizedSeverity = 'low';
        
        items.push({
          id: rec.id,
          type: 'reclamation',
          reference: `REC-${rec.id.substring(0, 8)}`,
          clientName: rec.client?.name || 'Client inconnu',
          subject: rec.description?.substring(0, 100) + (rec.description?.length > 100 ? '...' : ''),
          priority: normalizedSeverity,
          status: rec.status,
          createdAt: rec.createdAt,
          assignedTo: rec.assignedTo?.fullName,
          slaStatus: slaStatus.status,
          remainingTime: slaStatus.remainingTime
        });
      }

      return items;
    } catch (error) {
      this.logger.error('Failed to get reclamations by status:', error);
      return [];
    }
  }

  // Calculate SLA status for a reclamation
  private async calculateSLAStatus(reclamation: any): Promise<{
    status: 'ON_TIME' | 'AT_RISK' | 'OVERDUE' | 'CRITICAL';
    remainingTime: number;
  }> {
    try {
      // Get SLA days from client or default
      const client = await this.prisma.client.findUnique({
        where: { id: reclamation.clientId }
      });

      const slaDays = client?.reclamationDelay || 7;
      const deadline = new Date(reclamation.createdAt);
      deadline.setDate(deadline.getDate() + slaDays);

      const now = new Date();
      const remainingTime = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60)));
      
      const totalTime = deadline.getTime() - reclamation.createdAt.getTime();
      const elapsedTime = now.getTime() - reclamation.createdAt.getTime();
      const percentageUsed = (elapsedTime / totalTime) * 100;

      let status: 'ON_TIME' | 'AT_RISK' | 'OVERDUE' | 'CRITICAL' = 'ON_TIME';

      if (remainingTime <= 0) {
        status = 'OVERDUE';
      } else if (percentageUsed >= 90) {
        status = 'CRITICAL';
      } else if (percentageUsed >= 70) {
        status = 'AT_RISK';
      }

      return { status, remainingTime };
    } catch (error) {
      return { status: 'ON_TIME', remainingTime: 0 };
    }
  }

  // Calculate global stats
  private async calculateStats(): Promise<CorbeilleStats> {
    try {
      const [nonAffectes, enCours, traites] = await Promise.all([
        // Non affectés: OPEN without assignment
        this.prisma.reclamation.count({
          where: { 
            status: { in: ['OPEN', 'open', 'OUVERTE', 'OUVERT'] },
            assignedToId: null
          }
        }),
        // En cours: IN_PROGRESS, EN_COURS, ESCALATED, or assigned OPEN
        this.prisma.reclamation.count({
          where: {
            OR: [
              { status: { in: ['IN_PROGRESS', 'EN_COURS', 'en_cours', 'ESCALATED', 'ESCALADE'] } },
              { 
                status: { in: ['OPEN', 'open', 'OUVERTE', 'OUVERT'] },
                assignedToId: { not: null }
              }
            ]
          }
        }),
        // Traités: RESOLVED, CLOSED
        this.prisma.reclamation.count({
          where: { 
            status: { in: ['RESOLVED', 'RESOLU', 'FERMEE', 'CLOSED'] }
          }
        })
      ]);

      // Calculate overdue and critical from all non-resolved
      const allOpen = await this.prisma.reclamation.findMany({
        where: { 
          status: { 
            notIn: ['RESOLVED', 'RESOLU', 'FERMEE', 'CLOSED'] 
          }
        },
        select: { id: true, createdAt: true, clientId: true, severity: true }
      });

      let enRetard = 0;
      let critiques = 0;

      for (const rec of allOpen) {
        const slaStatus = await this.calculateSLAStatus(rec);
        if (slaStatus.status === 'OVERDUE') enRetard++;
        if (slaStatus.status === 'CRITICAL') critiques++;
        
        // Also count high severity as critical
        const sev = rec.severity?.toLowerCase();
        if (sev === 'haute' || sev === 'high' || sev === 'critical') {
          critiques++;
        }
      }

      return {
        nonAffectes,
        enCours,
        traites,
        enRetard,
        critiques
      };
    } catch (error) {
      this.logger.error('Failed to calculate stats:', error);
      return { nonAffectes: 0, enCours: 0, traites: 0, enRetard: 0, critiques: 0 };
    }
  }

  // Calculate personal stats for gestionnaire
  private async calculatePersonalStats(userId: string): Promise<CorbeilleStats> {
    try {
      const [enCours, traites] = await Promise.all([
        this.prisma.reclamation.count({
          where: { 
            assignedToId: userId,
            status: { in: ['IN_PROGRESS', 'ESCALATED'] }
          }
        }),
        this.prisma.reclamation.count({
          where: { 
            assignedToId: userId,
            status: { in: ['RESOLVED', 'CLOSED'] }
          }
        })
      ]);

      // Get returned items count
      const returnedReclamations = await this.prisma.reclamationHistory.findMany({
        where: {
          action: 'RETURN',
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      });

      const retournes = returnedReclamations.length;

      // Calculate personal overdue
      const personalReclamations = await this.prisma.reclamation.findMany({
        where: { 
          assignedToId: userId,
          status: { notIn: ['RESOLVED', 'CLOSED'] }
        },
        select: { id: true, createdAt: true, clientId: true }
      });

      let enRetard = 0;
      let critiques = 0;

      for (const rec of personalReclamations) {
        const slaStatus = await this.calculateSLAStatus(rec);
        if (slaStatus.status === 'OVERDUE') enRetard++;
        if (slaStatus.status === 'CRITICAL') critiques++;
      }

      return {
        nonAffectes: retournes,
        enCours,
        traites,
        enRetard,
        critiques
      };
    } catch (error) {
      this.logger.error('Failed to calculate personal stats:', error);
      return { nonAffectes: 0, enCours: 0, traites: 0, enRetard: 0, critiques: 0 };
    }
  }

  // Bulk assignment
  async bulkAssign(reclamationIds: string[], assignedToId: string, assignedBy: string): Promise<number> {
    try {
      let assigned = 0;

      for (const id of reclamationIds) {
        await this.prisma.reclamation.update({
          where: { id },
          data: { 
            assignedToId,
            status: 'IN_PROGRESS'
          }
        });

        await this.prisma.reclamationHistory.create({
          data: {
            reclamationId: id,
            userId: assignedBy,
            action: 'BULK_ASSIGN',
            toStatus: 'IN_PROGRESS',
            description: `Assigné en lot à ${assignedToId}`
          }
        });

        assigned++;
      }

      return assigned;
    } catch (error) {
      this.logger.error('Failed to bulk assign:', error);
      return 0;
    }
  }

  // Return reclamation to chef
  async returnToChef(reclamationId: string, userId: string, reason: string): Promise<boolean> {
    try {
      await this.prisma.reclamation.update({
        where: { id: reclamationId },
        data: { 
          assignedToId: null,
          status: 'OPEN'
        }
      });

      await this.prisma.reclamationHistory.create({
        data: {
          reclamationId,
          userId,
          action: 'RETURN',
          fromStatus: 'IN_PROGRESS',
          toStatus: 'OPEN',
          description: reason
        }
      });

      // Notify chef
      const chefs = await this.prisma.user.findMany({
        where: { role: 'CHEF_EQUIPE' }
      });

      for (const chef of chefs) {
        await this.prisma.notification.create({
          data: {
            userId: chef.id,
            type: 'RECLAMATION_RETURNED',
            title: 'Réclamation retournée',
            message: `La réclamation ${reclamationId} a été retournée: ${reason}`,
            data: { reclamationId, reason }
          }
        });
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to return reclamation:', error);
      return false;
    }
  }

  // Get unassigned reclamations (OPEN without assignment)
  private async getUnassignedReclamations(): Promise<CorbeilleItem[]> {
    try {
      const reclamations = await this.prisma.reclamation.findMany({
        where: {
          status: { in: ['OPEN', 'open', 'OUVERTE', 'OUVERT'] },
          assignedToId: null
        },
        include: {
          client: { select: { name: true } },
          assignedTo: { select: { fullName: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      const items: CorbeilleItem[] = [];
      for (const rec of reclamations) {
        const slaStatus = await this.calculateSLAStatus(rec);
        let normalizedSeverity = rec.severity;
        const sev = rec.severity?.toLowerCase();
        if (sev === 'haute' || sev === 'high') normalizedSeverity = 'critical';
        else if (sev === 'moyenne' || sev === 'medium') normalizedSeverity = 'medium';
        else if (sev === 'faible' || sev === 'low') normalizedSeverity = 'low';
        
        items.push({
          id: rec.id,
          type: 'reclamation',
          reference: `REC-${rec.id.substring(0, 8)}`,
          clientName: rec.client?.name || 'Client inconnu',
          subject: rec.description?.substring(0, 100) + (rec.description?.length > 100 ? '...' : ''),
          priority: normalizedSeverity,
          status: rec.status,
          createdAt: rec.createdAt,
          assignedTo: rec.assignedTo?.fullName,
          slaStatus: slaStatus.status,
          remainingTime: slaStatus.remainingTime
        });
      }
      return items;
    } catch (error) {
      this.logger.error('Failed to get unassigned reclamations:', error);
      return [];
    }
  }

  // Get in-progress reclamations (IN_PROGRESS, EN_COURS, ESCALATED, or assigned OPEN)
  private async getInProgressReclamations(): Promise<CorbeilleItem[]> {
    try {
      const reclamations = await this.prisma.reclamation.findMany({
        where: {
          OR: [
            // Explicitly in progress or escalated
            { status: { in: ['IN_PROGRESS', 'EN_COURS', 'en_cours', 'ESCALATED', 'ESCALADE'] } },
            // Assigned OPEN items (considered in progress)
            { 
              status: { in: ['OPEN', 'open', 'OUVERTE', 'OUVERT'] },
              assignedToId: { not: null }
            }
          ]
        },
        include: {
          client: { select: { name: true } },
          assignedTo: { select: { fullName: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      const items: CorbeilleItem[] = [];
      for (const rec of reclamations) {
        const slaStatus = await this.calculateSLAStatus(rec);
        let normalizedSeverity = rec.severity;
        const sev = rec.severity?.toLowerCase();
        if (sev === 'haute' || sev === 'high') normalizedSeverity = 'critical';
        else if (sev === 'moyenne' || sev === 'medium') normalizedSeverity = 'medium';
        else if (sev === 'faible' || sev === 'low') normalizedSeverity = 'low';
        
        items.push({
          id: rec.id,
          type: 'reclamation',
          reference: `REC-${rec.id.substring(0, 8)}`,
          clientName: rec.client?.name || 'Client inconnu',
          subject: rec.description?.substring(0, 100) + (rec.description?.length > 100 ? '...' : ''),
          priority: normalizedSeverity,
          status: rec.status,
          createdAt: rec.createdAt,
          assignedTo: rec.assignedTo?.fullName,
          slaStatus: slaStatus.status,
          remainingTime: slaStatus.remainingTime
        });
      }
      return items;
    } catch (error) {
      this.logger.error('Failed to get in-progress reclamations:', error);
      return [];
    }
  }

  // Get resolved reclamations (RESOLVED, CLOSED, FERMEE, etc.)
  private async getResolvedReclamations(): Promise<CorbeilleItem[]> {
    try {
      const reclamations = await this.prisma.reclamation.findMany({
        where: {
          status: { in: ['RESOLVED', 'RESOLU', 'FERMEE', 'CLOSED', 'TERMINE', 'FINI'] }
        },
        include: {
          client: { select: { name: true } },
          assignedTo: { select: { fullName: true } }
        },
        orderBy: { updatedAt: 'desc' } // Most recently resolved first
      });

      const items: CorbeilleItem[] = [];
      for (const rec of reclamations) {
        const slaStatus = await this.calculateSLAStatus(rec);
        let normalizedSeverity = rec.severity;
        const sev = rec.severity?.toLowerCase();
        if (sev === 'haute' || sev === 'high') normalizedSeverity = 'critical';
        else if (sev === 'moyenne' || sev === 'medium') normalizedSeverity = 'medium';
        else if (sev === 'faible' || sev === 'low') normalizedSeverity = 'low';
        
        items.push({
          id: rec.id,
          type: 'reclamation',
          reference: `REC-${rec.id.substring(0, 8)}`,
          clientName: rec.client?.name || 'Client inconnu',
          subject: rec.description?.substring(0, 100) + (rec.description?.length > 100 ? '...' : ''),
          priority: normalizedSeverity,
          status: rec.status,
          createdAt: rec.createdAt,
          assignedTo: rec.assignedTo?.fullName,
          slaStatus: 'ON_TIME', // Resolved items are considered on time
          remainingTime: 0 // No remaining time for resolved items
        });
      }
      return items;
    } catch (error) {
      this.logger.error('Failed to get resolved reclamations:', error);
      return [];
    }
  }

  // Auto-assignment based on workload
  async autoAssign(reclamationId: string): Promise<string | null> {
    try {
      // Find available gestionnaires
      const gestionnaires = await this.prisma.user.findMany({
        where: {
          role: 'GESTIONNAIRE',
          active: true
        }
      });

      if (gestionnaires.length === 0) return null;

      // Calculate workload for each gestionnaire
      const workloads = await Promise.all(
        gestionnaires.map(async (user) => {
          const count = await this.prisma.reclamation.count({
            where: {
              assignedToId: user.id,
              status: { in: ['IN_PROGRESS', 'ESCALATED'] }
            }
          });
          return { userId: user.id, workload: count };
        })
      );

      // Find gestionnaire with lowest workload
      workloads.sort((a, b) => a.workload - b.workload);
      const selectedUserId = workloads[0].userId;

      // Assign the reclamation
      await this.prisma.reclamation.update({
        where: { id: reclamationId },
        data: { 
          assignedToId: selectedUserId,
          status: 'IN_PROGRESS'
        }
      });

      await this.prisma.reclamationHistory.create({
        data: {
          reclamationId,
          userId: 'SYSTEM',
          action: 'AUTO_ASSIGN',
          toStatus: 'IN_PROGRESS',
          description: `Auto-assigné à ${selectedUserId}`
        }
      });

      return selectedUserId;
    } catch (error) {
      this.logger.error('Failed to auto-assign:', error);
      return null;
    }
  }
}