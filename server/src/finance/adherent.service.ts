import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAdherentDto {
  matricule: string;
  nom: string;
  prenom: string;
  clientId: string;
  rib: string;
  codeAssure?: string;
  numeroContrat?: string;
  assurance?: string;
  statut?: string;
}

export interface UpdateAdherentDto {
  nom?: string;
  prenom?: string;
  rib?: string;
  codeAssure?: string;
  numeroContrat?: string;
  assurance?: string;
  statut?: string;
}

@Injectable()
export class AdherentService {
  private readonly logger = new Logger(AdherentService.name);

  constructor(private prisma: PrismaService) {}

  async createAdherent(dto: CreateAdherentDto, userId: string) {
    // Validate RIB format (20 digits)
    if (dto.rib && !/^\d{20}$/.test(dto.rib)) {
      throw new BadRequestException('RIB must be exactly 20 digits');
    }

    // Find client by name or ID
    let client = await this.prisma.client.findFirst({
      where: {
        OR: [
          { id: dto.clientId },
          { name: dto.clientId }
        ]
      }
    });

    if (!client) {
      throw new BadRequestException(`Client ${dto.clientId} not found`);
    }

    // Check for existing matricule
    const existingAdherent = await this.prisma.adherent.findFirst({
      where: {
        matricule: dto.matricule,
        clientId: client.id
      }
    });

    if (existingAdherent) {
      throw new BadRequestException(`Matricule ${dto.matricule} already exists for this client`);
    }

    // BLOCK duplicate RIB + Send notification
    const duplicateRib = await this.prisma.adherent.findFirst({
      where: { rib: dto.rib },
      include: { client: true }
    });

    if (duplicateRib) {
      // Send notification for single entry duplicate
      await this.notifyDuplicateRibBlocked(
        userId,
        [{
          newAdherent: {
            matricule: dto.matricule,
            nom: dto.nom,
            prenom: dto.prenom,
            rib: dto.rib,
            clientId: client.id,
            clientName: client.name,
            codeAssure: dto.codeAssure,
            numeroContrat: dto.numeroContrat
          },
          existingAdherent: {
            id: duplicateRib.id,
            matricule: duplicateRib.matricule,
            nom: duplicateRib.nom,
            prenom: duplicateRib.prenom,
            rib: duplicateRib.rib,
            clientName: duplicateRib.client.name
          },
          pendingData: dto
        }],
        0,
        1
      );

      throw new BadRequestException(
        `RIB ${dto.rib} already exists for adherent ${duplicateRib.nom} ${duplicateRib.prenom} (Matricule: ${duplicateRib.matricule}, Société: ${duplicateRib.client.name})`
      );
    }

    // Create adherent in proper table
    const newAdherent = await this.prisma.adherent.create({
      data: {
        matricule: dto.matricule,
        nom: dto.nom,
        prenom: dto.prenom,
        clientId: client.id,
        rib: dto.rib,
        codeAssure: dto.codeAssure,
        numeroContrat: dto.numeroContrat,
        assurance: dto.assurance,
        statut: dto.statut || 'ACTIF'
      },
      include: {
        client: true
      }
    });

    return {
      id: newAdherent.id,
      matricule: newAdherent.matricule,
      nom: newAdherent.nom,
      prenom: newAdherent.prenom,
      rib: newAdherent.rib,
      codeAssure: newAdherent.codeAssure,
      numeroContrat: newAdherent.numeroContrat,
      assurance: newAdherent.assurance,
      statut: newAdherent.statut,
      duplicateRib: false,
      societe: newAdherent.client.name,
      client: {
        id: newAdherent.client.id,
        name: newAdherent.client.name
      }
    };
  }

  async updateAdherent(id: string, dto: UpdateAdherentDto, userId: string) {
    if (dto.rib && !/^\d{20}$/.test(dto.rib)) {
      throw new BadRequestException('RIB must be exactly 20 digits');
    }

    const current = await this.prisma.adherent.findUnique({ 
      where: { id },
      include: { client: true }
    });
    if (!current) throw new BadRequestException('Adherent not found');

    // BLOCK duplicate RIB on update
    if (dto.rib && dto.rib !== current.rib) {
      const duplicateRib = await this.prisma.adherent.findFirst({
        where: { rib: dto.rib, NOT: { id } },
        include: { client: true }
      });

      if (duplicateRib) {
        // Send notification about blocked duplicate
        await this.notifyDuplicateRibBlocked(
          userId,
          [{
            newAdherent: {
              matricule: current.matricule,
              nom: current.nom,
              prenom: current.prenom,
              rib: dto.rib,
              clientId: current.clientId,
              clientName: current.client.name,
              codeAssure: current.codeAssure || undefined,
              numeroContrat: current.numeroContrat || undefined
            },
            existingAdherent: {
              id: duplicateRib.id,
              matricule: duplicateRib.matricule,
              nom: duplicateRib.nom,
              prenom: duplicateRib.prenom,
              rib: duplicateRib.rib,
              clientName: duplicateRib.client.name
            },
            pendingData: {
              matricule: current.matricule,
              nom: dto.nom || current.nom,
              prenom: dto.prenom || current.prenom,
              clientId: current.clientId,
              rib: dto.rib,
              codeAssure: (dto.codeAssure || current.codeAssure) || undefined,
              numeroContrat: (dto.numeroContrat || current.numeroContrat) || undefined,
              assurance: (dto.assurance || current.assurance) || undefined,
              statut: dto.statut || current.statut
            }
          }],
          0,
          1
        );

        throw new BadRequestException(
          `RIB ${dto.rib} already exists for adherent ${duplicateRib.nom} ${duplicateRib.prenom} (Matricule: ${duplicateRib.matricule}, Société: ${duplicateRib.client.name})`
        );
      }
    }

    // Track ALL field changes
    const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];

    if (dto.nom && dto.nom !== current.nom) {
      changes.push({ field: 'nom', oldValue: current.nom, newValue: dto.nom });
    }
    if (dto.prenom && dto.prenom !== current.prenom) {
      changes.push({ field: 'prenom', oldValue: current.prenom, newValue: dto.prenom });
    }
    if (dto.rib && dto.rib !== current.rib) {
      changes.push({ field: 'rib', oldValue: current.rib, newValue: dto.rib });
      // Keep RIB-specific history for backward compatibility
      await this.prisma.adherentRibHistory.create({
        data: {
          adherentId: id,
          oldRib: current.rib,
          newRib: dto.rib,
          updatedById: userId
        }
      });

      // Create notification
      const users = await this.prisma.user.findMany({
        where: { role: { in: ['SUPER_ADMIN', 'FINANCE', 'CHEF_EQUIPE'] } }
      });
      
      await this.prisma.notification.createMany({
        data: users.map(u => ({
          userId: u.id,
          type: 'RIB_UPDATE',
          title: 'RIB modifié',
          message: `RIB de ${current.nom} ${current.prenom} (${current.matricule}) modifié`,
          data: { adherentId: id, oldRib: current.rib, newRib: dto.rib }
        }))
      });
    }
    if (dto.codeAssure && dto.codeAssure !== current.codeAssure) {
      changes.push({ field: 'codeAssure', oldValue: current.codeAssure || '', newValue: dto.codeAssure });
    }
    if (dto.numeroContrat && dto.numeroContrat !== current.numeroContrat) {
      changes.push({ field: 'numeroContrat', oldValue: current.numeroContrat || '', newValue: dto.numeroContrat });
    }
    if (dto.assurance && dto.assurance !== current.assurance) {
      changes.push({ field: 'assurance', oldValue: current.assurance || '', newValue: dto.assurance });
    }
    if (dto.statut && dto.statut !== current.statut) {
      changes.push({ field: 'statut', oldValue: current.statut, newValue: dto.statut });
    }

    // Save all changes to history
    if (changes.length > 0) {
      await this.prisma.adherentHistory.createMany({
        data: changes.map(change => ({
          adherentId: id,
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          updatedById: userId
        }))
      });
    }

    let duplicateRib = false;
    if (dto.rib) {
      const existing = await this.prisma.adherent.findFirst({
        where: { rib: dto.rib, NOT: { id } }
      });
      duplicateRib = !!existing;
    }

    const updated = await this.prisma.adherent.update({
      where: { id },
      data: {
        nom: dto.nom,
        prenom: dto.prenom,
        rib: dto.rib,
        codeAssure: dto.codeAssure,
        numeroContrat: dto.numeroContrat,
        assurance: dto.assurance,
        statut: dto.statut,
        updatedById: userId
      },
      include: { client: true }
    });

    return {
      id: updated.id,
      matricule: updated.matricule,
      nom: updated.nom,
      prenom: updated.prenom,
      rib: updated.rib,
      codeAssure: updated.codeAssure,
      numeroContrat: updated.numeroContrat,
      assurance: updated.assurance,
      statut: updated.statut,
      duplicateRib,
      societe: updated.client.name,
      client: { id: updated.client.id, name: updated.client.name }
    };
  }

  async getAdherentRibHistory(adherentId: string) {
    // Get ALL changes, not just RIB
    const history = await this.prisma.adherentHistory.findMany({
      where: { adherentId },
      orderBy: { updatedAt: 'desc' }
    });

    const userIds = [...new Set(history.map(h => h.updatedById))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true, role: true }
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    return history.map(h => ({
      ...h,
      updatedBy: userMap.get(h.updatedById)
    }));
  }

  async findAdherentsByClient(clientId: string) {
    return await this.prisma.adherent.findMany({
      where: { clientId },
      include: {
        client: true
      },
      orderBy: { matricule: 'asc' }
    });
  }

  async findAdherentByMatricule(matricule: string, clientId: string) {
    return await this.prisma.adherent.findFirst({
      where: {
        matricule,
        clientId
      },
      include: {
        client: true
      }
    });
  }

  async validateMatricules(matricules: string[], clientId: string) {
    const adherents = await this.prisma.adherent.findMany({
      where: {
        matricule: { in: matricules },
        clientId
      },
      include: {
        client: true
      }
    });

    const found = adherents.map(a => a.matricule);
    const missing = matricules.filter(m => !found.includes(m));

    return {
      valid: adherents,
      missing,
      duplicateRibs: await this.checkDuplicateRibs(adherents.map(a => a.rib))
    };
  }

  private async checkDuplicateRibs(ribs: string[]) {
    const ribCounts = await this.prisma.adherent.groupBy({
      by: ['rib'],
      where: { rib: { in: ribs } },
      _count: { rib: true }
    });

    return ribCounts
      .filter(r => r._count.rib > 1)
      .map(r => r.rib);
  }

  async importAdherents(adherents: CreateAdherentDto[], userId: string) {
    const results: Array<{ success: boolean; adherent?: any; error?: string; matricule?: string; rib?: string; nom?: string; prenom?: string; clientId?: string }> = [];
    const blockedDuplicates: Array<{ 
      newAdherent: { matricule: string; nom: string; prenom: string; rib: string; clientId: string; clientName: string; codeAssure?: string; numeroContrat?: string };
      existingAdherent: { id: string; matricule: string; nom: string; prenom: string; rib: string; clientName: string };
      pendingData: CreateAdherentDto;
    }> = [];
    
    for (const adherent of adherents) {
      try {
        const created = await this.createAdherent(adherent, userId);
        results.push({ success: true, adherent: created });
      } catch (error: any) {
        const errorMsg = error.message || 'Unknown error';
        
        // Track duplicate RIB blocks with FULL details
        if (errorMsg.includes('already exists for adherent')) {
          const duplicateRib = await this.prisma.adherent.findFirst({
            where: { rib: adherent.rib },
            include: { client: true }
          });

          const newClient = await this.prisma.client.findFirst({
            where: {
              OR: [
                { id: adherent.clientId },
                { name: adherent.clientId }
              ]
            }
          });

          if (duplicateRib && newClient) {
            blockedDuplicates.push({
              newAdherent: {
                matricule: adherent.matricule,
                nom: adherent.nom,
                prenom: adherent.prenom,
                rib: adherent.rib,
                clientId: newClient.id,
                clientName: newClient.name,
                codeAssure: adherent.codeAssure,
                numeroContrat: adherent.numeroContrat
              },
              existingAdherent: {
                id: duplicateRib.id,
                matricule: duplicateRib.matricule,
                nom: duplicateRib.nom,
                prenom: duplicateRib.prenom,
                rib: duplicateRib.rib,
                clientName: duplicateRib.client.name
              },
              pendingData: adherent
            });
          }
        }
        
        results.push({ 
          success: false, 
          error: errorMsg,
          matricule: adherent.matricule,
          rib: adherent.rib,
          nom: adherent.nom,
          prenom: adherent.prenom,
          clientId: adherent.clientId
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    // Send notification to SUPER_ADMIN and RESPONSABLE_DEPARTEMENT if duplicates blocked
    if (blockedDuplicates.length > 0) {
      await this.notifyDuplicateRibBlocked(userId, blockedDuplicates, successCount, errorCount);
    }

    return {
      total: adherents.length,
      success: successCount,
      blocked: blockedDuplicates.length,
      errors: results.filter(r => !r.success),
      blockedDuplicates,
      results
    };
  }

  private async notifyDuplicateRibBlocked(
    userId: string,
    blockedDuplicates: Array<{ 
      newAdherent: { matricule: string; nom: string; prenom: string; rib: string; clientId: string; clientName: string; codeAssure?: string; numeroContrat?: string };
      existingAdherent: { id: string; matricule: string; nom: string; prenom: string; rib: string; clientName: string };
      pendingData: CreateAdherentDto;
    }>,
    successCount: number,
    errorCount: number
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true, email: true, role: true }
      });

      const notifyUsers = await this.prisma.user.findMany({
        where: {
          role: { in: ['SUPER_ADMIN', 'RESPONSABLE_DEPARTEMENT'] },
          active: true
        }
      });

      if (notifyUsers.length === 0) return;

      const timestamp = new Date().toISOString();
      const importDate = new Date().toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Create notifications with ACTIONABLE data
      await this.prisma.notification.createMany({
        data: notifyUsers.map(notifyUser => ({
          userId: notifyUser.id,
          type: 'DUPLICATE_RIB_APPROVAL_REQUIRED',
          title: `🚨 ${blockedDuplicates.length} RIB dupliqué(s) - Approbation requise`,
          message: `Import effectué par ${user?.fullName || 'Utilisateur inconnu'} le ${importDate}. ${blockedDuplicates.length} adhérent(s) bloqué(s) pour RIB dupliqué. Cas possibles: compte conjoint (mari/femme), compte familial. Veuillez approuver ou rejeter chaque cas.`,
          data: JSON.parse(JSON.stringify({
            requiresAction: true,
            actionType: 'APPROVE_DUPLICATE_RIB',
            importId: `IMPORT_${timestamp}`,
            importedBy: userId,
            importedByName: user?.fullName,
            importedByEmail: user?.email,
            importedByRole: user?.role,
            importDate: timestamp,
            successCount,
            blockedCount: blockedDuplicates.length,
            totalErrors: errorCount,
            duplicates: blockedDuplicates.map((dup, index) => ({
              id: `DUP_${timestamp}_${index}`,
              status: 'PENDING',
              newAdherent: {
                matricule: dup.newAdherent.matricule,
                nom: dup.newAdherent.nom,
                prenom: dup.newAdherent.prenom,
                fullName: `${dup.newAdherent.nom} ${dup.newAdherent.prenom}`,
                rib: dup.newAdherent.rib,
                clientId: dup.newAdherent.clientId,
                clientName: dup.newAdherent.clientName,
                codeAssure: dup.newAdherent.codeAssure || '',
                numeroContrat: dup.newAdherent.numeroContrat || ''
              },
              existingAdherent: {
                id: dup.existingAdherent.id,
                matricule: dup.existingAdherent.matricule,
                nom: dup.existingAdherent.nom,
                prenom: dup.existingAdherent.prenom,
                fullName: `${dup.existingAdherent.nom} ${dup.existingAdherent.prenom}`,
                rib: dup.existingAdherent.rib,
                clientName: dup.existingAdherent.clientName
              },
              pendingData: dup.pendingData,
              approvedBy: null,
              approvedAt: null,
              rejectedBy: null,
              rejectedAt: null,
              justification: null
            }))
          }))
        }))
      });

      this.logger.log(`✅ Notified ${notifyUsers.length} users about ${blockedDuplicates.length} blocked duplicate RIBs requiring approval`);
    } catch (error) {
      this.logger.error(`Failed to send duplicate RIB notification: ${error.message}`);
    }
  }

  async approveDuplicateRib(notificationId: string, duplicateId: string, userId: string, justification?: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification || notification.type !== 'DUPLICATE_RIB_APPROVAL_REQUIRED') {
      throw new BadRequestException('Invalid notification');
    }

    const data = notification.data as any;
    const duplicate = data.duplicates.find((d: any) => d.id === duplicateId);

    if (!duplicate || duplicate.status !== 'PENDING') {
      throw new BadRequestException('Duplicate not found or already processed');
    }

    // Create the adherent
    const created = await this.createAdherentWithDuplicateRib(
      duplicate.pendingData,
      userId,
      justification
    );

    // Update notification data
    duplicate.status = 'APPROVED';
    duplicate.approvedBy = userId;
    duplicate.approvedAt = new Date().toISOString();
    duplicate.justification = justification;

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { data }
    });

    return created;
  }

  async rejectDuplicateRib(notificationId: string, duplicateId: string, userId: string, reason?: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification || notification.type !== 'DUPLICATE_RIB_APPROVAL_REQUIRED') {
      throw new BadRequestException('Invalid notification');
    }

    const data = notification.data as any;
    const duplicate = data.duplicates.find((d: any) => d.id === duplicateId);

    if (!duplicate || duplicate.status !== 'PENDING') {
      throw new BadRequestException('Duplicate not found or already processed');
    }

    duplicate.status = 'REJECTED';
    duplicate.rejectedBy = userId;
    duplicate.rejectedAt = new Date().toISOString();
    duplicate.justification = reason;

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { data }
    });

    return { success: true, message: 'Duplicate RIB rejected' };
  }

  async approveAllDuplicateRibs(notificationId: string, userId: string, justification?: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification || notification.type !== 'DUPLICATE_RIB_APPROVAL_REQUIRED') {
      throw new BadRequestException('Invalid notification');
    }

    const data = notification.data as any;
    const results: Array<{ success: boolean; adherent?: any; error?: string }> = [];

    for (const duplicate of data.duplicates) {
      if (duplicate.status === 'PENDING') {
        try {
          const created = await this.createAdherentWithDuplicateRib(
            duplicate.pendingData,
            userId,
            justification || 'Approved in bulk'
          );

          duplicate.status = 'APPROVED';
          duplicate.approvedBy = userId;
          duplicate.approvedAt = new Date().toISOString();
          duplicate.justification = justification;

          results.push({ success: true, adherent: created });
        } catch (error: any) {
          results.push({ success: false, error: error.message });
        }
      }
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: JSON.parse(JSON.stringify(data))
    });

    return {
      total: data.duplicates.length,
      approved: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  private async createAdherentWithDuplicateRib(dto: CreateAdherentDto, userId: string, justification?: string) {
    const client = await this.prisma.client.findFirst({
      where: {
        OR: [
          { id: dto.clientId },
          { name: dto.clientId }
        ]
      }
    });

    if (!client) {
      throw new BadRequestException(`Client ${dto.clientId} not found`);
    }

    const newAdherent = await this.prisma.adherent.create({
      data: {
        matricule: dto.matricule,
        nom: dto.nom,
        prenom: dto.prenom,
        clientId: client.id,
        rib: dto.rib,
        codeAssure: dto.codeAssure,
        numeroContrat: dto.numeroContrat,
        assurance: dto.assurance,
        statut: dto.statut || 'ACTIF'
      },
      include: { client: true }
    });

    // Log approval in history
    await this.prisma.adherentHistory.create({
      data: {
        adherentId: newAdherent.id,
        field: 'duplicate_rib_approved',
        oldValue: '',
        newValue: justification || 'Approved by admin',
        updatedById: userId
      }
    });

    return {
      id: newAdherent.id,
      matricule: newAdherent.matricule,
      nom: newAdherent.nom,
      prenom: newAdherent.prenom,
      rib: newAdherent.rib,
      codeAssure: newAdherent.codeAssure,
      numeroContrat: newAdherent.numeroContrat,
      assurance: newAdherent.assurance,
      statut: newAdherent.statut,
      duplicateRib: true,
      societe: newAdherent.client.name,
      client: {
        id: newAdherent.client.id,
        name: newAdherent.client.name
      }
    };
  }

  async deleteAdherent(id: string) {
    // Check if adherent is used in any virement items
    const virementItemsCount = await this.prisma.virementItem.count({
      where: { adherentId: id }
    });

    if (virementItemsCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer cet adhérent car il est lié à ${virementItemsCount} virement(s). Veuillez d'abord supprimer ou modifier les virements associés.`
      );
    }

    // Delete all history first
    await this.prisma.adherentHistory.deleteMany({
      where: { adherentId: id }
    });
    await this.prisma.adherentRibHistory.deleteMany({
      where: { adherentId: id }
    });

    // Delete from adherent table
    const deletedAdherent = await this.prisma.adherent.delete({
      where: { id },
      include: {
        client: true
      }
    });

    return {
      id: deletedAdherent.id,
      matricule: deletedAdherent.matricule,
      message: 'Adherent deleted successfully'
    };
  }

  async searchAdherents(query: string, clientId?: string, user?: any) {
    try {
      const adherentWhere: any = query ? {
        OR: [
          { matricule: { contains: query, mode: 'insensitive' } },
          { nom: { contains: query, mode: 'insensitive' } },
          { prenom: { contains: query, mode: 'insensitive' } },
          { rib: { contains: query, mode: 'insensitive' } },
          { codeAssure: { contains: query, mode: 'insensitive' } },
          { numeroContrat: { contains: query, mode: 'insensitive' } }
        ]
      } : {};

      if (clientId) {
        adherentWhere.clientId = clientId;
      }

      // GESTIONNAIRE_SENIOR and CHEF_EQUIPE: Filter by assigned contracts
      if (user?.role === 'GESTIONNAIRE_SENIOR' || user?.role === 'CHEF_EQUIPE') {
        const assignedContracts = await this.prisma.contract.findMany({
          where: { teamLeaderId: user.id },
          select: { clientId: true }
        });
        const clientIds = assignedContracts.map(c => c.clientId);
        adherentWhere.clientId = { in: clientIds };
      }

      const adherents = await this.prisma.adherent.findMany({
        where: adherentWhere,
        include: { client: true },
        orderBy: { matricule: 'asc' }
      });

      // Check for duplicate RIBs
      const ribCounts = new Map<string, number>();
      adherents.forEach(a => {
        ribCounts.set(a.rib, (ribCounts.get(a.rib) || 0) + 1);
      });

      return adherents.map(adherent => ({
        id: adherent.id,
        matricule: adherent.matricule,
        nom: adherent.nom,
        prenom: adherent.prenom,
        rib: adherent.rib,
        codeAssure: adherent.codeAssure,
        numeroContrat: adherent.numeroContrat,
        assurance: adherent.assurance,
        statut: adherent.statut,
        duplicateRib: ribCounts.get(adherent.rib)! > 1,
        societe: adherent.client.name,
        client: {
          id: adherent.client.id,
          name: adherent.client.name
        }
      }));
    } catch (error) {
      console.error('Failed to search adherents:', error);
      return [];
    }
  }
}