import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContractAssignmentService {
  private readonly logger = new Logger(ContractAssignmentService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Auto-assign bordereau to chef d'équipe based on contract assignment
   */
  async autoAssignBordereauByContract(bordereauId: string): Promise<any> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: {
        contract: {
          include: {
            teamLeader: {
              include: {
                teamMembers: {
                  where: { 
                    role: 'GESTIONNAIRE',
                    active: true 
                  }
                }
              }
            }
          }
        },
        client: true
      }
    });

    if (!bordereau) {
      throw new Error('Bordereau not found');
    }

    // Check if contract has assigned team leader
    if (bordereau.contract?.teamLeader) {
      const chefEquipe = bordereau.contract.teamLeader;
      
      this.logger.log(`Auto-assigning bordereau ${bordereau.reference} to chef d'équipe ${chefEquipe.fullName} based on contract`);

      // Update bordereau to assign to chef's team
      await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: {
          teamId: chefEquipe.id,
          statut: 'A_AFFECTER' // Ready for chef to assign to gestionnaires
        }
      });

      // Notify chef d'équipe
      await this.prisma.notification.create({
        data: {
          userId: chefEquipe.id,
          type: 'CONTRACT_BORDEREAU_ASSIGNED',
          title: 'Nouveau bordereau contractuel',
          message: `Le bordereau ${bordereau.reference} (contrat ${bordereau.contract.clientName}) est prêt pour affectation à votre équipe`,
          data: {
            bordereauId,
            reference: bordereau.reference,
            contractId: bordereau.contractId,
            clientName: bordereau.client?.name,
            teamMembersCount: chefEquipe.teamMembers.length
          }
        }
      });

      // Log assignment
      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'CONTRACT_BASED_ASSIGNMENT',
          details: {
            bordereauId,
            reference: bordereau.reference,
            contractId: bordereau.contractId,
            assignedToTeamLeader: chefEquipe.id,
            teamLeaderName: chefEquipe.fullName
          }
        }
      });

      return {
        success: true,
        assignedToTeam: chefEquipe.fullName,
        teamMembersCount: chefEquipe.teamMembers.length,
        message: `Bordereau assigné automatiquement à l'équipe de ${chefEquipe.fullName} selon le contrat`
      };
    }

    // Fallback: no contract team leader assigned
    this.logger.warn(`No team leader assigned to contract for bordereau ${bordereau.reference}`);
    return {
      success: false,
      message: 'Aucun chef d\'équipe assigné au contrat - affectation manuelle requise'
    };
  }

  /**
   * Assign contract to chef d'équipe
   */
  async assignContractToTeamLeader(contractId: string, teamLeaderId: string, assignedBy: string): Promise<any> {
    // Validate team leader
    const teamLeader = await this.prisma.user.findUnique({
      where: { id: teamLeaderId },
      include: {
        teamMembers: {
          where: { 
            role: 'GESTIONNAIRE',
            active: true 
          }
        }
      }
    });

    if (!teamLeader || teamLeader.role !== 'CHEF_EQUIPE') {
      throw new Error('Invalid team leader');
    }

    // Update contract
    const contract = await this.prisma.contract.update({
      where: { id: contractId },
      data: { teamLeaderId },
      include: { client: true }
    });

    // Create history entry
    await this.prisma.contractHistory.create({
      data: {
        contractId,
        modifiedById: assignedBy,
        changes: {
          action: 'TEAM_LEADER_ASSIGNED',
          teamLeaderId,
          teamLeaderName: teamLeader.fullName
        }
      }
    });

    // Notify team leader
    await this.prisma.notification.create({
      data: {
        userId: teamLeaderId,
        type: 'CONTRACT_ASSIGNED',
        title: 'Nouveau contrat assigné',
        message: `Le contrat ${contract.clientName} vous a été assigné. Tous les bordereaux de ce contrat seront automatiquement dirigés vers votre équipe.`,
        data: {
          contractId,
          clientName: contract.clientName,
          teamMembersCount: teamLeader.teamMembers.length
        }
      }
    });

    // Auto-assign existing bordereaux of this contract
    const existingBordereaux = await this.prisma.bordereau.findMany({
      where: {
        contractId,
        statut: { in: ['SCANNE', 'A_AFFECTER'] },
        teamId: null
      }
    });

    for (const bordereau of existingBordereaux) {
      await this.autoAssignBordereauByContract(bordereau.id);
    }

    return {
      success: true,
      contract,
      teamLeader: {
        id: teamLeader.id,
        name: teamLeader.fullName,
        teamSize: teamLeader.teamMembers.length
      },
      autoAssignedBordereaux: existingBordereaux.length,
      message: `Contrat assigné à ${teamLeader.fullName}. ${existingBordereaux.length} bordereau(x) existant(s) automatiquement assigné(s).`
    };
  }

  /**
   * Get contracts available for team leader assignment
   */
  async getUnassignedContracts(): Promise<any[]> {
    const contracts = await this.prisma.contract.findMany({
      where: {
        teamLeaderId: null,
        endDate: { gte: new Date() } // Only active contracts
      },
      include: {
        client: true,
        assignedManager: {
          select: { fullName: true }
        },
        _count: {
          select: {
            bordereaux: {
              where: { archived: false }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return contracts.map(contract => ({
      id: contract.id,
      clientName: contract.clientName,
      client: contract.client,
      assignedManager: contract.assignedManager?.fullName,
      bordereauxCount: contract._count.bordereaux,
      startDate: contract.startDate,
      endDate: contract.endDate,
      delaiReglement: contract.delaiReglement,
      delaiReclamation: contract.delaiReclamation
    }));
  }

  /**
   * Get contracts assigned to a specific team leader
   */
  async getTeamLeaderContracts(teamLeaderId: string): Promise<any[]> {
    const contracts = await this.prisma.contract.findMany({
      where: { teamLeaderId },
      include: {
        client: true,
        _count: {
          select: {
            bordereaux: {
              where: { 
                archived: false,
                statut: { notIn: ['CLOTURE'] }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return contracts.map(contract => ({
      id: contract.id,
      clientName: contract.clientName,
      client: contract.client,
      activeBordereaux: contract._count.bordereaux,
      startDate: contract.startDate,
      endDate: contract.endDate,
      delaiReglement: contract.delaiReglement,
      delaiReclamation: contract.delaiReclamation
    }));
  }

  /**
   * Get team leaders available for contract assignment
   */
  async getAvailableTeamLeaders(): Promise<any[]> {
    const teamLeaders = await this.prisma.user.findMany({
      where: {
        role: 'CHEF_EQUIPE',
        active: true
      },
      include: {
        teamMembers: {
          where: { 
            role: 'GESTIONNAIRE',
            active: true 
          }
        },
        contractsAsTeamLeader: {
          where: {
            endDate: { gte: new Date() }
          }
        },
        bordereauxTeam: {
          where: {
            statut: { in: ['ASSIGNE', 'EN_COURS'] },
            archived: false
          }
        }
      }
    });

    return teamLeaders.map(leader => ({
      id: leader.id,
      fullName: leader.fullName,
      teamSize: leader.teamMembers.length,
      activeContracts: leader.contractsAsTeamLeader.length,
      currentWorkload: leader.bordereauxTeam.length,
      capacity: leader.capacity,
      utilizationRate: leader.capacity > 0 ? Math.round((leader.bordereauxTeam.length / leader.capacity) * 100) : 0,
      isAvailable: leader.bordereauxTeam.length < leader.capacity
    }));
  }
}