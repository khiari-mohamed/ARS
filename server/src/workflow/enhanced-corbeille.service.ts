import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowNotificationsService } from './workflow-notifications.service';
import { TeamRoutingService } from './team-routing.service';

@Injectable()
export class EnhancedCorbeilleService {
  private readonly logger = new Logger(EnhancedCorbeilleService.name);

  constructor(
    private prisma: PrismaService,
    private workflowNotifications: WorkflowNotificationsService,
    private teamRouting: TeamRoutingService
  ) {}

  async getChefCorbeille(userId: string) {
    try {
      // Get all bordereaux for this chef's team
      const [nonAffectes, enCours, traites] = await Promise.all([
        // Non-assigned items ready for assignment (scanned documents)
        this.prisma.bordereau.findMany({
          where: {
            statut: { in: ['SCANNE', 'A_AFFECTER'] },
            assignedToUserId: null
          },
          include: {
            client: true,
            contract: true
          },
          orderBy: { dateReception: 'asc' }
        }),

        // Items currently being processed by team members
        this.prisma.bordereau.findMany({
          where: {
            statut: { in: ['ASSIGNE', 'EN_COURS'] }
          },
          include: {
            client: true,
            contract: true,
            currentHandler: true
          },
          orderBy: { dateReception: 'asc' }
        }),

        // Completed items
        this.prisma.bordereau.findMany({
          where: {
            statut: { in: ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'] }
          },
          include: {
            client: true,
            contract: true,
            currentHandler: true
          },
          orderBy: { updatedAt: 'desc' },
          take: 50
        })
      ]);

      // Calculate SLA status for each item
      const now = new Date();
      const processItems = (items: any[]) => items.map(item => {
        const daysSinceReception = Math.floor((now.getTime() - new Date(item.dateReception).getTime()) / (1000 * 60 * 60 * 24));
        const slaLimit = item.delaiReglement || item.contract?.delaiReglement || 30;
        const remainingTime = Math.max(0, (slaLimit - daysSinceReception) * 24);

        let slaStatus: 'ON_TIME' | 'AT_RISK' | 'OVERDUE' | 'CRITICAL';
        if (daysSinceReception > slaLimit) slaStatus = 'OVERDUE';
        else if (remainingTime <= 24) slaStatus = 'CRITICAL';
        else if (remainingTime <= 72) slaStatus = 'AT_RISK';
        else slaStatus = 'ON_TIME';

        return {
          id: item.id,
          type: 'bordereau',
          reference: item.reference,
          clientName: item.client?.name || 'Unknown',
          subject: `${item.nombreBS || 0} BS - ${item.client?.name}`,
          priority: this.calculatePriority(item, daysSinceReception, slaLimit),
          status: item.statut,
          createdAt: item.dateReception,
          assignedTo: item.currentHandler?.fullName,
          slaStatus,
          remainingTime
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
        critiques: [...processedNonAffectes, ...processedEnCours].filter(item => item.slaStatus === 'CRITICAL').length
      };

      return {
        nonAffectes: processedNonAffectes,
        enCours: processedEnCours,
        traites: processedTraites,
        stats
      };
    } catch (error) {
      this.logger.error(`Error getting chef corbeille: ${error.message}`);
      return {
        nonAffectes: [],
        enCours: [],
        traites: [],
        stats: { nonAffectes: 0, enCours: 0, traites: 0, enRetard: 0, critiques: 0 }
      };
    }
  }

  async getGestionnaireCorbeille(userId: string) {
    try {
      const [enCours, traites, retournes] = await Promise.all([
        // Items assigned to this gestionnaire
        this.prisma.bordereau.findMany({
          where: {
            assignedToUserId: userId,
            statut: { in: ['ASSIGNE', 'EN_COURS'] }
          },
          include: {
            client: true,
            contract: true
          },
          orderBy: { dateReception: 'asc' }
        }),

        // Recently completed items
        this.prisma.bordereau.findMany({
          where: {
            assignedToUserId: userId,
            statut: { in: ['TRAITE', 'CLOTURE'] },
            updatedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          },
          include: {
            client: true,
            contract: true
          },
          orderBy: { updatedAt: 'desc' }
        }),

        // Items returned by gestionnaire
        this.prisma.bordereau.findMany({
          where: {
            assignedToUserId: userId,
            statut: 'EN_DIFFICULTE'
          },
          include: {
            client: true,
            contract: true
          },
          orderBy: { updatedAt: 'desc' }
        })
      ]);

      const now = new Date();
      const processItems = (items: any[]) => items.map(item => {
        const daysSinceReception = Math.floor((now.getTime() - new Date(item.dateReception).getTime()) / (1000 * 60 * 60 * 24));
        const slaLimit = item.delaiReglement || item.contract?.delaiReglement || 30;
        const remainingTime = Math.max(0, (slaLimit - daysSinceReception) * 24);

        let slaStatus: 'ON_TIME' | 'AT_RISK' | 'OVERDUE' | 'CRITICAL';
        if (daysSinceReception > slaLimit) slaStatus = 'OVERDUE';
        else if (remainingTime <= 24) slaStatus = 'CRITICAL';
        else if (remainingTime <= 72) slaStatus = 'AT_RISK';
        else slaStatus = 'ON_TIME';

        return {
          id: item.id,
          reference: item.reference,
          clientName: item.client?.name || 'Unknown',
          subject: `${item.nombreBS || 0} BS - ${item.client?.name}`,
          priority: this.calculatePriority(item, daysSinceReception, slaLimit),
          status: item.statut,
          createdAt: item.dateReception,
          slaStatus,
          remainingTime,
          canReturn: item.statut === 'ASSIGNE' || item.statut === 'EN_COURS'
        };
      });

      const processedEnCours = processItems(enCours);
      const processedTraites = processItems(traites);
      const processedRetournes = processItems(retournes);

      const stats = {
        enCours: processedEnCours.length,
        traites: processedTraites.length,
        retournes: processedRetournes.length,
        enRetard: processedEnCours.filter(item => item.slaStatus === 'OVERDUE').length,
        critiques: processedEnCours.filter(item => item.slaStatus === 'CRITICAL').length
      };

      return {
        enCours: processedEnCours,
        traites: processedTraites,
        retournes: processedRetournes,
        stats
      };
    } catch (error) {
      this.logger.error(`Error getting gestionnaire corbeille: ${error.message}`);
      return {
        enCours: [],
        traites: [],
        retournes: [],
        stats: { enCours: 0, traites: 0, retournes: 0, enRetard: 0, critiques: 0 }
      };
    }
  }

  async markBordereauAsProcessed(bordereauId: string, gestionnaireId: string) {
    try {
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: bordereauId },
        include: { client: true }
      });

      if (!bordereau) {
        throw new Error('Bordereau not found');
      }

      if (bordereau.assignedToUserId !== gestionnaireId) {
        throw new Error('Unauthorized: Bordereau not assigned to this gestionnaire');
      }

      await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: {
          statut: 'TRAITE',
          dateReceptionSante: new Date(),
          updatedAt: new Date()
        }
      });

      // Create audit log
      await this.prisma.auditLog.create({
        data: {
          userId: gestionnaireId,
          action: 'BORDEREAU_PROCESSED',
          details: {
            bordereauId,
            reference: bordereau.reference,
            processedAt: new Date().toISOString()
          }
        }
      });

      this.logger.log(`Bordereau ${bordereau.reference} marked as processed by ${gestionnaireId}`);
      
      return {
        success: true,
        message: 'Bordereau marked as processed successfully'
      };
    } catch (error) {
      this.logger.error(`Mark as processed failed: ${error.message}`);
      throw error;
    }
  }

  async bulkAssignBordereaux(bordereauIds: string[], assigneeId: string, assignedBy: string) {
    try {
      const results: Array<{ id: string; success: boolean; error?: string }> = [];
      
      for (const bordereauId of bordereauIds) {
        try {
          await this.prisma.bordereau.update({
            where: { id: bordereauId },
            data: {
              assignedToUserId: assigneeId,
              statut: 'ASSIGNE',
              updatedAt: new Date()
            }
          });

          // Send notification to assigned gestionnaire
          await this.workflowNotifications.notifyWorkflowTransition(
            bordereauId,
            'A_AFFECTER',
            'ASSIGNE'
          );

          results.push({ id: bordereauId, success: true });
        } catch (error: any) {
          results.push({ id: bordereauId, success: false, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      this.logger.log(`Bulk assigned ${successCount}/${bordereauIds.length} bordereaux to ${assigneeId}`);

      return {
        assigned: successCount,
        failed: bordereauIds.length - successCount,
        results
      };
    } catch (error) {
      this.logger.error(`Bulk assignment failed: ${error.message}`);
      throw error;
    }
  }

  async autoAssignByClient(bordereauIds: string[], assignedBy: string) {
    try {
      const results: Array<{ id: string; success: boolean; assignedTo?: string; error?: string }> = [];
      
      for (const bordereauId of bordereauIds) {
        try {
          const bordereau = await this.prisma.bordereau.findUnique({
            where: { id: bordereauId },
            include: { client: true }
          });

          if (!bordereau) {
            results.push({ id: bordereauId, success: false, error: 'Bordereau not found' });
            continue;
          }

          // Find gestionnaire who has handled this client before
          const clientSpecialist = await this.prisma.user.findFirst({
            where: {
              role: 'GESTIONNAIRE',
              active: true,
              bordereauxCurrentHandler: {
                some: {
                  clientId: bordereau.clientId,
                  statut: { in: ['TRAITE', 'CLOTURE'] }
                }
              }
            },
            include: {
              _count: {
                select: {
                  bordereauxCurrentHandler: {
                    where: { statut: { in: ['ASSIGNE', 'EN_COURS'] } }
                  }
                }
              }
            }
          });

          let selectedGestionnaire = clientSpecialist;

          // If no specialist or specialist is overloaded, find least loaded gestionnaire
          if (!clientSpecialist || clientSpecialist._count.bordereauxCurrentHandler > 15) {
            selectedGestionnaire = await this.prisma.user.findFirst({
              where: {
                role: 'GESTIONNAIRE',
                active: true
              },
              include: {
                _count: {
                  select: {
                    bordereauxCurrentHandler: {
                      where: { statut: { in: ['ASSIGNE', 'EN_COURS'] } }
                    }
                  }
                }
              },
              orderBy: {
                bordereauxCurrentHandler: {
                  _count: 'asc'
                }
              }
            });
          }

          if (selectedGestionnaire) {
            await this.prisma.bordereau.update({
              where: { id: bordereauId },
              data: {
                assignedToUserId: selectedGestionnaire.id,
                statut: 'ASSIGNE',
                updatedAt: new Date()
              }
            });

            await this.workflowNotifications.notifyWorkflowTransition(
              bordereauId,
              'A_AFFECTER',
              'ASSIGNE'
            );

            results.push({ 
              id: bordereauId, 
              success: true, 
              assignedTo: selectedGestionnaire.fullName 
            });
          } else {
            results.push({ id: bordereauId, success: false, error: 'No available gestionnaire' });
          }
        } catch (error: any) {
          results.push({ id: bordereauId, success: false, error: error.message });
        }
      }

      return {
        assigned: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      this.logger.error(`Auto assignment by client failed: ${error.message}`);
      throw error;
    }
  }

  async autoAssignByType(bordereauIds: string[], documentType: string, assignedBy: string) {
    try {
      const results: Array<{ id: string; success: boolean; assignedTo?: string; error?: string }> = [];
      
      // Find gestionnaires specialized in this document type
      const specialists = await this.prisma.user.findMany({
        where: {
          role: 'GESTIONNAIRE',
          active: true
        },
        include: {
          bordereauxCurrentHandler: {
            where: {
              statut: { in: ['ASSIGNE', 'EN_COURS'] }
            },
            include: {
              documents: {
                where: { type: documentType },
                take: 1
              }
            }
          },
          _count: {
            select: {
              bordereauxCurrentHandler: {
                where: { statut: { in: ['ASSIGNE', 'EN_COURS'] } }
              }
            }
          }
        }
      });

      // Sort by experience with document type and current workload
      const sortedGestionnaires = specialists.sort((a, b) => {
        const aExperience = a.bordereauxCurrentHandler.filter(b => b.documents.length > 0).length;
        const bExperience = b.bordereauxCurrentHandler.filter(b => b.documents.length > 0).length;
        
        if (aExperience !== bExperience) {
          return bExperience - aExperience; // More experience first
        }
        return a._count.bordereauxCurrentHandler - b._count.bordereauxCurrentHandler; // Less workload first
      });

      let currentGestionnaireIndex = 0;
      
      for (const bordereauId of bordereauIds) {
        try {
          if (sortedGestionnaires.length === 0) {
            results.push({ id: bordereauId, success: false, error: 'No available gestionnaire' });
            continue;
          }

          const selectedGestionnaire = sortedGestionnaires[currentGestionnaireIndex % sortedGestionnaires.length];
          currentGestionnaireIndex++;

          await this.prisma.bordereau.update({
            where: { id: bordereauId },
            data: {
              assignedToUserId: selectedGestionnaire.id,
              statut: 'ASSIGNE',
              updatedAt: new Date()
            }
          });

          await this.workflowNotifications.notifyWorkflowTransition(
            bordereauId,
            'A_AFFECTER',
            'ASSIGNE'
          );

          results.push({ 
            id: bordereauId, 
            success: true, 
            assignedTo: selectedGestionnaire.fullName 
          });
        } catch (error: any) {
          results.push({ id: bordereauId, success: false, error: error.message });
        }
      }

      return {
        assigned: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      this.logger.error(`Auto assignment by type failed: ${error.message}`);
      throw error;
    }
  }

  async returnToChef(bordereauId: string, gestionnaireId: string, reason: string) {
    try {
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: bordereauId },
        include: {
          client: true,
          currentHandler: true
        }
      });

      if (!bordereau) {
        throw new Error('Bordereau not found');
      }

      if (bordereau.assignedToUserId !== gestionnaireId) {
        throw new Error('Unauthorized: Bordereau not assigned to this gestionnaire');
      }

      // Update bordereau status
      await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: {
          statut: 'EN_DIFFICULTE',
          assignedToUserId: null,
          updatedAt: new Date()
        }
      });

      // Create audit log
      await this.prisma.auditLog.create({
        data: {
          userId: gestionnaireId,
          action: 'BORDEREAU_RETURNED',
          details: {
            bordereauId,
            reference: bordereau.reference,
            reason,
            returnedAt: new Date().toISOString()
          }
        }
      });

      // Notify chef d'équipe
      await this.workflowNotifications.notifyWorkflowTransition(
        bordereauId,
        'ASSIGNE',
        'EN_DIFFICULTE'
      );

      this.logger.log(`Bordereau ${bordereau.reference} returned to chef by ${gestionnaireId}: ${reason}`);
      
      return {
        success: true,
        message: 'Bordereau returned to chef successfully'
      };
    } catch (error) {
      this.logger.error(`Return to chef failed: ${error.message}`);
      throw error;
    }
  }

  async rejectBordereau(bordereauId: string, chefId: string, reason: string) {
    try {
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: bordereauId },
        include: { client: true }
      });

      if (!bordereau) {
        throw new Error('Bordereau not found');
      }

      // Update bordereau status to rejected
      await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: {
          statut: 'REJETE',
          assignedToUserId: null,
          updatedAt: new Date()
        }
      });

      // Create audit log
      await this.prisma.auditLog.create({
        data: {
          userId: chefId,
          action: 'BORDEREAU_REJECTED',
          details: {
            bordereauId,
            reference: bordereau.reference,
            reason,
            rejectedAt: new Date().toISOString()
          }
        }
      });

      // Notify workflow transition
      await this.workflowNotifications.notifyWorkflowTransition(
        bordereauId,
        'A_AFFECTER',
        'REJETE'
      );

      this.logger.log(`Bordereau ${bordereau.reference} rejected by chef ${chefId}: ${reason}`);
      
      return {
        success: true,
        message: 'Bordereau rejected successfully'
      };
    } catch (error) {
      this.logger.error(`Reject bordereau failed: ${error.message}`);
      throw error;
    }
  }

  async treatBordereauPersonally(bordereauId: string, chefId: string) {
    try {
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: bordereauId },
        include: { client: true }
      });

      if (!bordereau) {
        throw new Error('Bordereau not found');
      }

      // Assign to chef personally
      await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: {
          assignedToUserId: chefId,
          statut: 'EN_COURS',
          updatedAt: new Date()
        }
      });

      // Create audit log
      await this.prisma.auditLog.create({
        data: {
          userId: chefId,
          action: 'BORDEREAU_SELF_ASSIGNED',
          details: {
            bordereauId,
            reference: bordereau.reference,
            selfAssignedAt: new Date().toISOString()
          }
        }
      });

      // Notify workflow transition
      await this.workflowNotifications.notifyWorkflowTransition(
        bordereauId,
        'A_AFFECTER',
        'EN_COURS_CHEF'
      );

      this.logger.log(`Bordereau ${bordereau.reference} self-assigned by chef ${chefId}`);
      
      return {
        success: true,
        message: 'Bordereau assigned to chef successfully'
      };
    } catch (error) {
      this.logger.error(`Self-assign bordereau failed: ${error.message}`);
      throw error;
    }
  }

  private calculatePriority(item: any, daysSinceReception: number, slaLimit: number): string {
    if (daysSinceReception > slaLimit) return 'URGENT';
    if (daysSinceReception > slaLimit - 3) return 'HIGH';
    if (item.nombreBS > 50) return 'HIGH';
    return 'NORMAL';
  }
}