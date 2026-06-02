/**
 * FILE: D:\ARS\server\src\finance\recouvrement.service.ts
 * 
 * Service Recouvrement (SR) - CRITICAL GATE after virement generation
 * 
 * BUSINESS LOGIC:
 * 1. After virement TXT/PDF generated → OV status = ATTENTE_RECOUVREMENT
 * 2. SR checks if payment received → Sets AUTORISE or NON_AUTORISE
 * 3. AUTORISE → Finance can execute
 * 4. NON_AUTORISE → Blocked, visible ONLY to Super Admin
 * 5. Super Admin can override NON_AUTORISE → AUTORISE later
 */

import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatutGlobalService } from './statut-global.service';

export interface BulkRecouvrementDto {
  ordreVirementIds: string[];
  status: 'AUTORISE' | 'NON_AUTORISE';
  comment?: string;
  recouvre?: boolean; // Is payment recovered?
  dateRecouvre?: string; // When payment was recovered
}

export interface RecouvrementValidationResult {
  success: boolean;
  updated: number;
  failed: number;
  errors: Array<{ ovId: string; error: string }>;
}

@Injectable()
export class RecouvrementService {
  private readonly logger = new Logger(RecouvrementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly statutGlobalService: StatutGlobalService,
  ) {}

  /**
   * Bulk validate/reject OVs by Service Recouvrement
   * ROLE RESTRICTION: FINANCE or SUPER_ADMIN only (Recouvrement is a function, not a role)
   */
  async bulkValidateRecouvrement(
    dto: BulkRecouvrementDto,
    userId: string,
    userRole: string,
  ): Promise<RecouvrementValidationResult> {
    // EXACT SPEC: Only Finance or Super Admin can validate (they ARE the recouvrement team)
    if (userRole !== 'FINANCE' && userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Seul le service Finance ou Super Admin peut valider les recouvrements',
      );
    }

    this.logger.log(
      `Bulk recouvrement validation: ${dto.ordreVirementIds.length} OVs, status: ${dto.status}, user: ${userId}`,
    );

    const result: RecouvrementValidationResult = {
      success: true,
      updated: 0,
      failed: 0,
      errors: [],
    };

    for (const ovId of dto.ordreVirementIds) {
      try {
        await this.validateSingleOV(ovId, dto, userId);
        result.updated++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          ovId,
          error: error.message || 'Unknown error',
        });
        this.logger.error(`Failed to validate OV ${ovId}: ${error.message}`);
      }
    }

    if (result.failed > 0) {
      result.success = false;
    }

    this.logger.log(
      `Bulk validation complete: ${result.updated} updated, ${result.failed} failed`,
    );

    return result;
  }

  /**
   * Validate single OV
   */
  private async validateSingleOV(
    ovId: string,
    dto: BulkRecouvrementDto,
    userId: string,
  ): Promise<void> {
    // Check if OV exists
    const ov = await this.prisma.ordreVirement.findUnique({
      where: { id: ovId },
      select: {
        id: true,
        reference: true,
        recouvrementStatus: true,
        etatVirement: true,
      },
    });

    if (!ov) {
      throw new BadRequestException(`OV ${ovId} not found`);
    }

    // EXACT SPEC: Can only validate OVs in ATTENTE_RECOUVREMENT or NON_AUTORISE (for Super Admin override)
    if (
      ov.recouvrementStatus !== 'ATTENTE_RECOUVREMENT' &&
      ov.recouvrementStatus !== 'NON_AUTORISE'
    ) {
      throw new BadRequestException(
        `OV ${ov.reference} already validated (status: ${ov.recouvrementStatus})`,
      );
    }

    // Update OV with recouvrement decision
    const updateData: any = {
      recouvrementStatus: dto.status,
      recouvrementValidatedBy: userId,
      recouvrementValidatedAt: new Date(), // This is the "Date Recouvrement" field
      recouvrementComment: dto.comment || null,
      recouvrementRecouvre: dto.recouvre || false,
    };
    
    // Set dateRecouvrementRecouvre (payment recovery date) if applicable
    if (dto.status === 'AUTORISE') {
      // When AUTORISE, set recovery date to validation date by default
      updateData.dateRecouvrementRecouvre = dto.dateRecouvre ? new Date(dto.dateRecouvre) : new Date();
    }
    
    await this.prisma.ordreVirement.update({
      where: { id: ovId },
      data: updateData,
    });

    // Log history
    await this.prisma.virementHistory.create({
      data: {
        virementId: ovId,
        action: dto.status === 'AUTORISE' ? 'RECOUVREMENT_AUTORISE' : 'RECOUVREMENT_NON_AUTORISE',
        previousState: ov.recouvrementStatus,
        newState: dto.status,
        comment: dto.comment || `Validation recouvrement: ${dto.status}`,
        userId,
      },
    });

    // Update global status based on recouvrement decision
    if (dto.status === 'AUTORISE') {
      await this.statutGlobalService.markAsRecoveryValidated(ovId);
    } else {
      await this.statutGlobalService.markAsRecoveryBlocked(ovId);
    }

    this.logger.log(`OV ${ov.reference} recouvrement status updated to ${dto.status}`);
  }

  /**
   * Get OVs pending recouvrement validation
   * ROLE RESTRICTION: FINANCE or SUPER_ADMIN only
   */
  async getPendingRecouvrementOVs(userRole: string) {
    if (userRole !== 'FINANCE' && userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.ordreVirement.findMany({
      where: {
        recouvrementStatus: 'ATTENTE_RECOUVREMENT',
      },
      include: {
        donneurOrdre: {
          select: { nom: true, banque: true },
        },
        bordereau: {
          select: { reference: true, client: { select: { name: true, modeRecuperation: true } } },
        },
        client: {
          select: { name: true, modeRecuperation: true },
        },
      },
      orderBy: { dateCreation: 'desc' },
    });
  }

  /**
   * Get NON_AUTORISE OVs (Super Admin only)
   */
  async getNonAutoriseOVs(userRole: string) {
    // EXACT SPEC: Only Super Admin can see NON_AUTORISE OVs
    if (userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Seul le Super Admin peut voir les OVs non autorisés');
    }

    return this.prisma.ordreVirement.findMany({
      where: {
        recouvrementStatus: 'NON_AUTORISE',
      },
      include: {
        donneurOrdre: {
          select: { nom: true, banque: true },
        },
        bordereau: {
          select: { reference: true, client: { select: { name: true, modeRecuperation: true } } },
        },
        client: {
          select: { name: true, modeRecuperation: true },
        },
        recouvrementValidator: {
          select: { fullName: true, email: true },
        },
      },
      orderBy: { recouvrementValidatedAt: 'desc' },
    });
  }

  /**
   * Get all OVs with recouvrement status (for tracking)
   */
  async getAllRecouvrementOVs(
    userRole: string,
    filters?: {
      status?: string;
      recouvre?: boolean;
      dateFrom?: string;
      dateTo?: string;
      clientId?: string;
    },
  ) {
    if (userRole !== 'FINANCE' && userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const where: any = {};

    // EXACT SPEC: Non-Super Admin cannot see NON_AUTORISE
    if (userRole !== 'SUPER_ADMIN') {
      where.recouvrementStatus = { not: 'NON_AUTORISE' };
    }

    if (filters?.status) {
      where.recouvrementStatus = filters.status;
    }

    if (filters?.recouvre !== undefined) {
      where.recouvrementRecouvre = filters.recouvre;
    }

    if (filters?.dateFrom) {
      where.dateCreation = { ...where.dateCreation, gte: new Date(filters.dateFrom) };
    }

    if (filters?.dateTo) {
      where.dateCreation = { ...where.dateCreation, lte: new Date(filters.dateTo) };
    }

    if (filters?.clientId) {
      where.OR = [{ clientId: filters.clientId }, { bordereau: { clientId: filters.clientId } }];
    }

    const ovs = await this.prisma.ordreVirement.findMany({
      where,
      select: {
        id: true,
        reference: true,
        montantTotal: true,
        nombreAdherents: true,
        dateCreation: true,
        recouvrementStatus: true,
        recouvrementValidatedAt: true,
        recouvrementComment: true,
        recouvrementRecouvre: true,
        dateRecouvrementRecouvre: true,
        statutGlobal: true,
        typeOperation: true,
        utilisateurSante: true,
        utilisateurFinance: true,
        donneurOrdre: {
          select: { nom: true, banque: true },
        },
        bordereau: {
          select: { 
            reference: true, 
            client: { 
              select: { name: true, modeRecuperation: true } 
            } 
          },
        },
        client: {
          select: { name: true, modeRecuperation: true },
        },
        contract: {
          select: { codeAssure: true },
        },
        items: {
          select: { 
            adherent: { 
              select: { codeAssure: true } 
            } 
          },
          take: 1,
        },
        recouvrementValidator: {
          select: { fullName: true, email: true },
        },
      },
      orderBy: { dateCreation: 'desc' },
    });

    // Fetch user names for utilisateurSante and utilisateurFinance
    const userIds = new Set<string>();
    ovs.forEach(ov => {
      if (ov.utilisateurSante) userIds.add(ov.utilisateurSante);
      if (ov.utilisateurFinance) userIds.add(ov.utilisateurFinance);
    });

    const users = await this.prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, fullName: true },
    });

    const userMap = new Map(users.map(u => [u.id, u.fullName]));

    // Map user IDs to names and extract codeAssure + client name
    return ovs.map(ov => {
      // Resolve client name: bordereau.client > direct client > null
      const clientName = ov.bordereau?.client?.name || ov.client?.name || null;
      
      // Resolve mode recuperation
      const modeRecuperation = ov.bordereau?.client?.modeRecuperation || ov.client?.modeRecuperation || null;
      
      return {
        id: ov.id,
        numeroOrdre: ov.reference,
        reference: ov.reference,
        montantTotal: ov.montantTotal,
        nombreAdherents: ov.nombreAdherents,
        dateCreation: ov.dateCreation,
        createdAt: ov.dateCreation,
        recouvrementStatus: ov.recouvrementStatus,
        recouvrementValidatedAt: ov.recouvrementValidatedAt,
        recouvrementComment: ov.recouvrementComment,
        recouvrementRecouvre: ov.recouvrementRecouvre,
        dateRecouvrementRecouvre: ov.dateRecouvrementRecouvre,
        statutGlobal: ov.statutGlobal,
        typeOperation: ov.typeOperation,
        utilisateurSante: ov.utilisateurSante,
        utilisateurFinance: ov.utilisateurFinance,
        utilisateurSanteNom: ov.utilisateurSante ? userMap.get(ov.utilisateurSante) : null,
        utilisateurFinanceNom: ov.utilisateurFinance ? userMap.get(ov.utilisateurFinance) : null,
        codeAssure: ov.contract?.codeAssure || ov.items?.[0]?.adherent?.codeAssure || null,
        client: {
          name: clientName,
          nom: clientName,
          modeRecuperation: modeRecuperation,
        },
        donneurOrdre: ov.donneurOrdre,
        bordereau: ov.bordereau,
        contract: ov.contract,
        items: ov.items,
        recouvrementValidator: ov.recouvrementValidator,
      };
    });
  }

  /**
   * Override NON_AUTORISE to AUTORISE (Super Admin only)
   */
  async overrideNonAutorise(
    ovId: string,
    userId: string,
    userRole: string,
    comment: string,
  ): Promise<void> {
    // EXACT SPEC: Only Super Admin can override
    if (userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Seul le Super Admin peut débloquer un OV non autorisé');
    }

    const ov = await this.prisma.ordreVirement.findUnique({
      where: { id: ovId },
      select: { id: true, reference: true, recouvrementStatus: true },
    });

    if (!ov) {
      throw new BadRequestException('OV not found');
    }

    if (ov.recouvrementStatus !== 'NON_AUTORISE') {
      throw new BadRequestException(
        `OV ${ov.reference} is not NON_AUTORISE (current: ${ov.recouvrementStatus})`,
      );
    }

    // Override to AUTORISE
    await this.prisma.ordreVirement.update({
      where: { id: ovId },
      data: {
        recouvrementStatus: 'AUTORISE',
        recouvrementValidatedBy: userId,
        recouvrementValidatedAt: new Date(),
        recouvrementComment: `[OVERRIDE SUPER ADMIN] ${comment}`,
      },
    });

    // Log history
    await this.prisma.virementHistory.create({
      data: {
        virementId: ovId,
        action: 'RECOUVREMENT_OVERRIDE_AUTORISE',
        previousState: 'NON_AUTORISE',
        newState: 'AUTORISE',
        comment: `Super Admin override: ${comment}`,
        userId,
      },
    });

    this.logger.log(`Super Admin ${userId} overrode OV ${ov.reference} to AUTORISE`);
  }

  /**
   * Send notification to Finance when OV is AUTORISE
   */
  async notifyFinanceOnAutorise(ovId: string): Promise<void> {
    const ov = await this.prisma.ordreVirement.findUnique({
      where: { id: ovId },
      select: {
        id: true,
        reference: true,
        montantTotal: true,
        bordereau: { select: { client: { select: { name: true } } } },
        client: { select: { name: true } },
      },
    });

    if (!ov) return;

    const clientName = ov.bordereau?.client?.name || ov.client?.name || 'Client inconnu';

    // Get all Finance users
    const financeUsers = await this.prisma.user.findMany({
      where: { role: 'FINANCE', active: true },
      select: { id: true },
    });

    // Create notifications
    const notifications = financeUsers.map((user) => ({
      userId: user.id,
      type: 'RECOUVREMENT_AUTORISE',
      title: '✅ OV Autorisé - Prêt pour Exécution',
      message: `L'OV ${ov.reference} (${clientName}) a été autorisé par le Service Recouvrement. Montant: ${ov.montantTotal.toFixed(2)} TND. Vous pouvez maintenant l'exécuter.`,
      data: { ovId: ov.id, reference: ov.reference, montantTotal: ov.montantTotal },
    }));

    await this.prisma.notification.createMany({ data: notifications });

    this.logger.log(`Finance notified: OV ${ov.reference} AUTORISE`);
  }

  /**
   * Send notification to Super Admin when OV is NON_AUTORISE
   */
  async notifySuperAdminOnNonAutorise(ovId: string): Promise<void> {
    const ov = await this.prisma.ordreVirement.findUnique({
      where: { id: ovId },
      select: {
        id: true,
        reference: true,
        montantTotal: true,
        recouvrementComment: true,
        bordereau: { select: { client: { select: { name: true } } } },
        client: { select: { name: true } },
      },
    });

    if (!ov) return;

    const clientName = ov.bordereau?.client?.name || ov.client?.name || 'Client inconnu';

    // Get all Super Admin users
    const superAdmins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN', active: true },
      select: { id: true },
    });

    // Create notifications
    const notifications = superAdmins.map((user) => ({
      userId: user.id,
      type: 'RECOUVREMENT_NON_AUTORISE',
      title: '⚠️ OV Non Autorisé - Action Requise',
      message: `L'OV ${ov.reference} (${clientName}) a été rejeté par le Service Recouvrement. Motif: ${ov.recouvrementComment || 'Non spécifié'}. Montant: ${ov.montantTotal.toFixed(2)} TND. Vous pouvez le débloquer si nécessaire.`,
      data: { ovId: ov.id, reference: ov.reference, montantTotal: ov.montantTotal },
    }));

    await this.prisma.notification.createMany({ data: notifications });

    this.logger.log(`Super Admin notified: OV ${ov.reference} NON_AUTORISE`);
  }

  /**
   * Get recouvrement statistics
   */
  async getRecouvrementStats(userRole: string) {
    if (userRole !== 'FINANCE' && userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const [attente, autorise, nonAutorise, recouvre] = await Promise.all([
      this.prisma.ordreVirement.count({
        where: { recouvrementStatus: 'ATTENTE_RECOUVREMENT' },
      }),
      this.prisma.ordreVirement.count({
        where: { recouvrementStatus: 'AUTORISE' },
      }),
      this.prisma.ordreVirement.count({
        where: { recouvrementStatus: 'NON_AUTORISE' },
      }),
      this.prisma.ordreVirement.count({
        where: { recouvrementRecouvre: true },
      }),
    ]);

    return {
      attente,
      autorise,
      nonAutorise,
      recouvre,
      total: attente + autorise + nonAutorise,
    };
  }
}
