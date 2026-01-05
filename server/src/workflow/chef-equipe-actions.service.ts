import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowNotificationsService } from './workflow-notifications.service';

export interface AssignToGestionnaireDto {
  bordereauId: string;
  gestionnaireId: string;
  chefId: string;
  notes?: string;
}

export interface RejectBordereauDto {
  bordereauId: string;
  reason: string;
  chefId: string;
  returnTo?: 'BO' | 'SCAN';
}

export interface HandlePersonallyDto {
  bordereauId: string;
  chefId: string;
  notes?: string;
}

export interface RecuperBordereauDto {
  bordereauId: string;
  chefId: string;
  reason?: string;
}

@Injectable()
export class ChefEquipeActionsService {
  private readonly logger = new Logger(ChefEquipeActionsService.name);

  constructor(
    private prisma: PrismaService,
    private workflowNotifications: WorkflowNotificationsService
  ) {}

  async getChefCorbeille(chefId: string) {
    // Verify user is chef d'équipe
    const chef = await this.prisma.user.findUnique({
      where: { id: chefId }
    });

    if (!chef || !['CHEF_EQUIPE', 'SUPER_ADMIN'].includes(chef.role)) {
      throw new BadRequestException('User is not a chef d\'équipe');
    }

    // Build access filter
    const accessFilter = this.buildChefAccessFilter(chef);
    
    // Get team member IDs once to avoid N+1 queries
    const teamMemberIds = await this.getTeamMemberIds(chefId);
    
    const [nonAffectes, enCours, traites] = await Promise.all([
      // Non-assigned items ready for assignment
      this.prisma.bordereau.findMany({
        where: {
          ...accessFilter,
          statut: { in: ['SCANNE', 'A_AFFECTER'] },
          assignedToUserId: null,
          archived: false
        },
        include: {
          client: { select: { name: true } },
          contract: { 
            select: { 
              delaiReglement: true,
              delaiReclamation: true 
            } 
          },
          documents: {
            select: { name: true, type: true }
          }
        },
        orderBy: { dateReception: 'asc' }
      }),

      // Items currently being processed by team members
      this.prisma.bordereau.findMany({
        where: {
          ...accessFilter,
          statut: { in: ['ASSIGNE', 'EN_COURS'] },
          assignedToUserId: { in: teamMemberIds },
          archived: false
        },
        include: {
          client: { select: { name: true } },
          contract: { 
            select: { 
              delaiReglement: true,
              delaiReclamation: true 
            } 
          },
          currentHandler: { 
            select: { 
              id: true, 
              fullName: true 
            } 
          }
        },
        orderBy: { dateReception: 'asc' }
      }),

      // Recently completed items
      this.prisma.bordereau.findMany({
        where: {
          ...accessFilter,
          statut: { in: ['TRAITE', 'CLOTURE'] },
          assignedToUserId: { in: teamMemberIds },
          updatedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          },
          archived: false
        },
        include: {
          client: { select: { name: true } },
          currentHandler: { 
            select: { 
              id: true, 
              fullName: true 
            } 
          }
        },
        orderBy: { updatedAt: 'desc' }
      })
    ]);

    // Calculate SLA status and priority for each item
    const processItems = (items: any[]) => items.map(item => {
      const slaInfo = this.calculateSLAStatus(item);
      return {
        id: item.id,
        reference: item.reference,
        clientName: item.client?.name || 'Unknown',
        nombreBS: item.nombreBS,
        dateReception: item.dateReception,
        statut: item.statut,
        assignedTo: item.currentHandler?.fullName,
        assignedToId: item.currentHandler?.id,
        documentsCount: item.documents?.length || 0,
        ...slaInfo,
        canAssign: ['SCANNE', 'A_AFFECTER'].includes(item.statut),
        canReject: ['SCANNE', 'A_AFFECTER', 'EN_DIFFICULTE'].includes(item.statut),
        canHandle: ['SCANNE', 'A_AFFECTER'].includes(item.statut)
      };
    });

    const processedNonAffectes = processItems(nonAffectes);
    const processedEnCours = processItems(enCours);
    const processedTraites = processItems(traites);

    // Calculate statistics
    const stats = {
      nonAffectes: processedNonAffectes.length,
      enCours: processedEnCours.length,
      traites: processedTraites.length,
      enRetard: [...processedNonAffectes, ...processedEnCours].filter(item => item.slaStatus === 'OVERDUE').length,
      critiques: [...processedNonAffectes, ...processedEnCours].filter(item => item.slaStatus === 'CRITICAL').length,
      aRisque: [...processedNonAffectes, ...processedEnCours].filter(item => item.slaStatus === 'AT_RISK').length
    };

    return {
      nonAffectes: processedNonAffectes,
      enCours: processedEnCours,
      traites: processedTraites,
      stats,
      availableGestionnaires: await this.getAvailableGestionnaires(chefId)
    };
  }

  async assignToGestionnaire(dto: AssignToGestionnaireDto) {
    const { bordereauId, gestionnaireId, chefId, notes } = dto;

    // Validate chef exists and has proper role
    const chef = await this.prisma.user.findUnique({
      where: { id: chefId }
    });

    if (!chef || !['CHEF_EQUIPE', 'SUPER_ADMIN'].includes(chef.role)) {
      throw new BadRequestException('Invalid chef d\'équipe');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Validate bordereau
      const bordereau = await tx.bordereau.findUnique({
        where: { id: bordereauId },
        include: { client: true }
      });

      if (!bordereau) {
        throw new BadRequestException('Bordereau not found');
      }

      if (!['SCANNE', 'A_AFFECTER'].includes(bordereau.statut)) {
        throw new BadRequestException(`Cannot assign bordereau with status ${bordereau.statut}`);
      }

      // Validate gestionnaire
      const gestionnaire = await tx.user.findUnique({
        where: { id: gestionnaireId }
      });

      if (!gestionnaire || (gestionnaire.role !== 'GESTIONNAIRE' && gestionnaire.role !== 'GESTIONNAIRE_SENIOR') || !gestionnaire.active) {
        throw new BadRequestException('Invalid or inactive gestionnaire');
      }

      // Check gestionnaire workload
      const currentWorkload = await tx.bordereau.count({
        where: {
          assignedToUserId: gestionnaireId,
          statut: { in: ['ASSIGNE', 'EN_COURS'] },
          archived: false
        }
      });

      const maxCapacity = gestionnaire.capacity || 20;
      if (currentWorkload >= maxCapacity) {
        throw new BadRequestException(`Gestionnaire ${gestionnaire.fullName} is at full capacity (${currentWorkload}/${maxCapacity})`);
      }

      // Assign bordereau
      const updatedBordereau = await tx.bordereau.update({
        where: { id: bordereauId },
        data: {
          statut: 'ASSIGNE',
          assignedToUserId: gestionnaireId,
          teamId: chefId,
          currentHandlerId: gestionnaireId,
          dateReceptionSante: new Date()
        }
      });

      // GESTIONNAIRE_SENIOR FIX: Update all documents to EN_COURS status
      if (gestionnaire?.role === 'GESTIONNAIRE_SENIOR') {
        await tx.document.updateMany({
          where: { bordereauId },
          data: { status: 'EN_COURS' }
        });
      }

      // Create assignment history
      await tx.traitementHistory.create({
        data: {
          bordereauId,
          userId: chefId,
          action: 'ASSIGNMENT',
          fromStatus: bordereau.statut,
          toStatus: 'ASSIGNE',
          assignedToId: gestionnaireId
        }
      });

      // Send notification to gestionnaire
      await tx.notification.create({
        data: {
          userId: gestionnaireId,
          type: 'TASK_ASSIGNED',
          title: 'Nouveau dossier assigné',
          message: `Le bordereau ${bordereau.reference} (${bordereau.client?.name}) vous a été assigné pour traitement`,
          data: {
            bordereauId,
            reference: bordereau.reference,
            clientName: bordereau.client?.name,
            assignedBy: chefId,
            notes
          }
        }
      });

      // Log action
      await tx.auditLog.create({
        data: {
          userId: chefId,
          action: 'BORDEREAU_ASSIGNED',
          details: {
            bordereauId,
            reference: bordereau.reference,
            gestionnaireId,
            gestionnaireName: gestionnaire.fullName,
            notes
          }
        }
      });

      return {
        success: true,
        bordereau: updatedBordereau,
        assignedTo: {
          id: gestionnaire.id,
          name: gestionnaire.fullName
        },
        message: `Bordereau ${bordereau.reference} assigné à ${gestionnaire.fullName}`
      };
    });
  }

  async rejectBordereau(dto: RejectBordereauDto) {
    const { bordereauId, reason, chefId, returnTo = 'SCAN' } = dto;

    // Validate bordereau
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true }
    });

    if (!bordereau) {
      throw new BadRequestException('Bordereau not found');
    }

    // Determine new status based on return destination
    let newStatus: string;
    let notificationTarget: string[] = [];

    switch (returnTo) {
      case 'BO':
        newStatus = 'EN_ATTENTE';
        notificationTarget = ['BUREAU_ORDRE'];
        break;
      case 'SCAN':
        newStatus = 'A_SCANNER';
        notificationTarget = ['SCAN'];
        break;
      default:
        newStatus = 'REJETE';
    }

    // Update bordereau
    const updatedBordereau = await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: {
        statut: newStatus as any,
        assignedToUserId: null,
        currentHandlerId: null,
        teamId: null,
        documentStatus: returnTo === 'SCAN' ? 'RETOURNER_AU_SCAN' : 'NORMAL'
      }
    });

    // Create rejection history
    await this.prisma.traitementHistory.create({
      data: {
        bordereauId,
        userId: chefId,
        action: 'REJECTION',
        fromStatus: bordereau.statut,
        toStatus: newStatus
      }
    });

    // Send notifications to target service
    if (notificationTarget.length > 0) {
      const targetUsers = await this.prisma.user.findMany({
        where: {
          role: { in: notificationTarget },
          active: true
        }
      });

      for (const user of targetUsers) {
        await this.prisma.notification.create({
          data: {
            userId: user.id,
            type: 'BORDEREAU_REJECTED',
            title: 'Bordereau rejeté',
            message: `Le bordereau ${bordereau.reference} a été rejeté par le chef d'équipe. Raison: ${reason}`,
            data: {
              bordereauId,
              reference: bordereau.reference,
              reason,
              rejectedBy: chefId,
              returnTo
            }
          }
        });
      }
    }

    // Log action
    await this.prisma.auditLog.create({
      data: {
        userId: chefId,
        action: 'BORDEREAU_REJECTED',
        details: {
          bordereauId,
          reference: bordereau.reference,
          reason,
          returnTo,
          newStatus
        }
      }
    });

    return {
      success: true,
      bordereau: updatedBordereau,
      newStatus,
      returnTo,
      message: `Bordereau ${bordereau.reference} rejeté et retourné au service ${returnTo}`
    };
  }

  async handlePersonally(dto: HandlePersonallyDto) {
    const { bordereauId, chefId, notes } = dto;

    // Validate bordereau
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true }
    });

    if (!bordereau) {
      throw new BadRequestException('Bordereau not found');
    }

    if (!['SCANNE', 'A_AFFECTER'].includes(bordereau.statut)) {
      throw new BadRequestException(`Cannot handle bordereau with status ${bordereau.statut}`);
    }

    // Assign to chef personally
    const updatedBordereau = await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: {
        statut: 'EN_COURS',
        assignedToUserId: chefId,
        currentHandlerId: chefId,
        teamId: chefId
      }
    });

    // Create assignment history
    await this.prisma.traitementHistory.create({
      data: {
        bordereauId,
        userId: chefId,
        action: 'SELF_ASSIGNMENT',
        fromStatus: bordereau.statut,
        toStatus: 'EN_COURS',
        assignedToId: chefId
      }
    });

    // Log action
    await this.prisma.auditLog.create({
      data: {
        userId: chefId,
        action: 'BORDEREAU_SELF_ASSIGNED',
        details: {
          bordereauId,
          reference: bordereau.reference,
          notes
        }
      }
    });

    return {
      success: true,
      bordereau: updatedBordereau,
      message: `Bordereau ${bordereau.reference} pris en charge personnellement`
    };
  }

  async recupererBordereau(dto: RecuperBordereauDto) {
    const { bordereauId, chefId, reason } = dto;

    // Validate chef
    const chef = await this.prisma.user.findUnique({
      where: { id: chefId }
    });

    if (!chef || !['CHEF_EQUIPE', 'SUPER_ADMIN'].includes(chef.role)) {
      throw new BadRequestException('Invalid chef d\'équipe');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Validate bordereau
      const bordereau = await tx.bordereau.findUnique({
        where: { id: bordereauId },
        include: { 
          client: true,
          currentHandler: true
        }
      });

      if (!bordereau) {
        throw new BadRequestException('Bordereau not found');
      }

      if (!bordereau.assignedToUserId) {
        throw new BadRequestException('Bordereau is not assigned to anyone');
      }

      // Update bordereau to unassigned state
      const updatedBordereau = await tx.bordereau.update({
        where: { id: bordereauId },
        data: {
          statut: 'A_AFFECTER',
          assignedToUserId: null,
          currentHandlerId: null,
          teamId: null
        }
      });

      // Create history entry
      await tx.traitementHistory.create({
        data: {
          bordereauId,
          userId: chefId,
          action: 'RECUPERATION',
          fromStatus: bordereau.statut,
          toStatus: 'A_AFFECTER'
        }
      });

      // Notify the previous gestionnaire
      if (bordereau.assignedToUserId) {
        await tx.notification.create({
          data: {
            userId: bordereau.assignedToUserId,
            type: 'TASK_RETRIEVED',
            title: 'Dossier récupéré',
            message: `Le bordereau ${bordereau.reference} vous a été retiré par le chef d'équipe${reason ? `: ${reason}` : ''}`,
            data: {
              bordereauId,
              reference: bordereau.reference,
              retrievedBy: chefId,
              reason
            }
          }
        });
      }

      // Log action
      await tx.auditLog.create({
        data: {
          userId: chefId,
          action: 'BORDEREAU_RETRIEVED',
          details: {
            bordereauId,
            reference: bordereau.reference,
            previousAssignee: bordereau.currentHandler?.fullName,
            reason
          }
        }
      });

      return {
        success: true,
        bordereau: updatedBordereau,
        message: `Bordereau ${bordereau.reference} récupéré avec succès`
      };
    });
  }

  async reassignBordereau(bordereauId: string, fromGestionnaireId: string, toGestionnaireId: string, chefId: string, reason?: string) {
    // Validate bordereau
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true }
    });

    if (!bordereau) {
      throw new BadRequestException('Bordereau not found');
    }

    if (bordereau.assignedToUserId !== fromGestionnaireId) {
      throw new BadRequestException('Bordereau is not assigned to the specified gestionnaire');
    }

    // Validate new gestionnaire
    const newGestionnaire = await this.prisma.user.findUnique({
      where: { id: toGestionnaireId }
    });

    if (!newGestionnaire || newGestionnaire.role !== 'GESTIONNAIRE') {
      throw new BadRequestException('Invalid new gestionnaire');
    }

    // Check new gestionnaire workload
    const currentWorkload = await this.prisma.bordereau.count({
      where: {
        assignedToUserId: toGestionnaireId,
        statut: { in: ['ASSIGNE', 'EN_COURS'] }
      }
    });

    const maxCapacity = newGestionnaire.capacity || 20;
    if (currentWorkload >= maxCapacity) {
      throw new BadRequestException(`Gestionnaire ${newGestionnaire.fullName} is at full capacity`);
    }

    // Reassign bordereau
    const updatedBordereau = await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: {
        assignedToUserId: toGestionnaireId,
        currentHandlerId: toGestionnaireId,
        statut: 'ASSIGNE' // Reset to assigned status
      }
    });

    // Create reassignment history
    await this.prisma.traitementHistory.create({
      data: {
        bordereauId,
        userId: chefId,
        action: 'REASSIGNMENT',
        fromStatus: bordereau.statut,
        toStatus: 'ASSIGNE',
        assignedToId: toGestionnaireId
      }
    });

    // Notify both gestionnaires
    const oldGestionnaire = await this.prisma.user.findUnique({
      where: { id: fromGestionnaireId }
    });

    // Notify old gestionnaire
    await this.prisma.notification.create({
      data: {
        userId: fromGestionnaireId,
        type: 'TASK_REASSIGNED',
        title: 'Dossier réassigné',
        message: `Le bordereau ${bordereau.reference} vous a été retiré et réassigné à ${newGestionnaire.fullName}`,
        data: {
          bordereauId,
          reference: bordereau.reference,
          reassignedTo: newGestionnaire.fullName,
          reason
        }
      }
    });

    // Notify new gestionnaire
    await this.prisma.notification.create({
      data: {
        userId: toGestionnaireId,
        type: 'TASK_ASSIGNED',
        title: 'Nouveau dossier assigné (réassignation)',
        message: `Le bordereau ${bordereau.reference} vous a été réassigné depuis ${oldGestionnaire?.fullName}`,
        data: {
          bordereauId,
          reference: bordereau.reference,
          reassignedFrom: oldGestionnaire?.fullName,
          reason
        }
      }
    });

    return {
      success: true,
      bordereau: updatedBordereau,
      reassignedFrom: oldGestionnaire?.fullName,
      reassignedTo: newGestionnaire.fullName,
      message: `Bordereau ${bordereau.reference} réassigné de ${oldGestionnaire?.fullName} à ${newGestionnaire.fullName}`
    };
  }

  private async getTeamMemberIds(chefId: string): Promise<string[]> {
    const teamMembers = await this.prisma.user.findMany({
      where: {
        teamLeaderId: chefId,
        role: 'GESTIONNAIRE',
        active: true
      },
      select: { id: true }
    });

    return teamMembers.map(member => member.id);
  }

  private async getAvailableGestionnaires(chefId: string) {
    // Get gestionnaires and their workloads in a single optimized query
    const gestionnaires = await this.prisma.user.findMany({
      where: {
        role: 'GESTIONNAIRE',
        active: true
      },
      select: {
        id: true,
        fullName: true,
        capacity: true,
        bordereaux: {
          where: {
            statut: { in: ['ASSIGNE', 'EN_COURS'] },
            archived: false
          },
          select: { id: true }
        }
      }
    });

    // Calculate workload metrics
    const gestionnaireWorkloads = gestionnaires.map((gestionnaire) => {
      const currentWorkload = gestionnaire.bordereaux.length;
      const maxCapacity = gestionnaire.capacity || 20;
      const availableCapacity = Math.max(0, maxCapacity - currentWorkload);
      const utilizationRate = maxCapacity > 0 ? (currentWorkload / maxCapacity) * 100 : 0;

      return {
        id: gestionnaire.id,
        name: gestionnaire.fullName,
        currentWorkload,
        maxCapacity,
        availableCapacity,
        utilizationRate: Math.round(utilizationRate),
        isAvailable: availableCapacity > 0,
        status: utilizationRate >= 100 ? 'FULL' : utilizationRate >= 80 ? 'HIGH' : utilizationRate >= 50 ? 'MEDIUM' : 'LOW'
      };
    });

    return gestionnaireWorkloads.sort((a, b) => a.utilizationRate - b.utilizationRate);
  }

  private calculateSLAStatus(bordereau: any): {
    slaStatus: 'ON_TIME' | 'AT_RISK' | 'OVERDUE' | 'CRITICAL';
    remainingTime: number;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  } {
    const now = new Date();
    const daysSinceReception = Math.floor(
      (now.getTime() - new Date(bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const slaLimit = bordereau.delaiReglement || bordereau.contract?.delaiReglement || 30;
    const remainingTime = Math.max(0, (slaLimit - daysSinceReception) * 24); // in hours

    let slaStatus: 'ON_TIME' | 'AT_RISK' | 'OVERDUE' | 'CRITICAL';
    let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

    if (daysSinceReception > slaLimit) {
      slaStatus = 'OVERDUE';
      priority = 'URGENT';
    } else if (remainingTime <= 24) {
      slaStatus = 'CRITICAL';
      priority = 'URGENT';
    } else if (remainingTime <= 72) {
      slaStatus = 'AT_RISK';
      priority = 'HIGH';
    } else {
      slaStatus = 'ON_TIME';
      priority = daysSinceReception > slaLimit * 0.5 ? 'MEDIUM' : 'LOW';
    }

    return { slaStatus, remainingTime, priority };
  }

  async getChefDashboardStats(chefId: string) {
    const teamMemberIds = await this.getTeamMemberIds(chefId);
    const allManagedIds = [...teamMemberIds, chefId];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalAssigned,
      inProgress,
      completedToday,
      overdue,
      teamPerformance
    ] = await Promise.all([
      this.prisma.bordereau.count({
        where: {
          assignedToUserId: { in: allManagedIds },
          statut: { in: ['ASSIGNE', 'EN_COURS'] }
        }
      }),
      this.prisma.bordereau.count({
        where: {
          assignedToUserId: { in: allManagedIds },
          statut: 'EN_COURS'
        }
      }),
      this.prisma.bordereau.count({
        where: {
          assignedToUserId: { in: allManagedIds },
          statut: 'TRAITE',
          updatedAt: { gte: today }
        }
      }),
      this.prisma.bordereau.count({
        where: {
          assignedToUserId: { in: allManagedIds },
          statut: { in: ['ASSIGNE', 'EN_COURS'] },
          dateReception: {
            lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
          }
        }
      }),
      this.getTeamPerformanceStats(allManagedIds)
    ]);

    return {
      totalAssigned,
      inProgress,
      completedToday,
      overdue,
      teamSize: teamMemberIds.length,
      teamPerformance,
      efficiency: completedToday > 0 && totalAssigned > 0 ? Math.round((completedToday / Math.max(completedToday, 1)) * 100) : 0
    };
  }

  private async getTeamPerformanceStats(memberIds: string[]) {
    const performance = await Promise.all(
      memberIds.map(async (memberId) => {
        const member = await this.prisma.user.findUnique({
          where: { id: memberId },
          select: { fullName: true }
        });

        const [assigned, completed] = await Promise.all([
          this.prisma.bordereau.count({
            where: {
              assignedToUserId: memberId,
              statut: { in: ['ASSIGNE', 'EN_COURS'] }
            }
          }),
          this.prisma.bordereau.count({
            where: {
              assignedToUserId: memberId,
              statut: 'TRAITE',
              updatedAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
              }
            }
          })
        ]);

        return {
          id: memberId,
          name: member?.fullName || 'Unknown',
          assigned,
          completed,
          efficiency: completed > 0 ? Math.round((completed / Math.max(completed + assigned, 1)) * 100) : 0
        };
      })
    );

    return performance.sort((a, b) => b.efficiency - a.efficiency);
  }

  private buildChefAccessFilter(user: any): any {
    if (user.role === 'SUPER_ADMIN') {
      return {};
    }
    
    if (user.role === 'CHEF_EQUIPE') {
      return {
        contract: {
          teamLeaderId: user.id
        }
      };
    }
    
    return {};
  }
}