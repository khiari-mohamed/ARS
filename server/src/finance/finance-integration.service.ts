import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdreVirementService } from './ordre-virement.service';

@Injectable()
export class FinanceIntegrationService {
  private readonly logger = new Logger(FinanceIntegrationService.name);

  constructor(
    private prisma: PrismaService,
    private ordreVirementService: OrdreVirementService
  ) {}

  /**
   * Integrate with existing Virement system when bordereau is ready for payment
   */
  async createVirementFromBordereau(bordereauId: string, userId: string) {
    try {
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: bordereauId },
        include: {
          client: true,
          BulletinSoin: true
        }
      });

      if (!bordereau) {
        throw new Error('Bordereau not found');
      }

      // Check if virement already exists
      const existingVirement = await this.prisma.virement.findUnique({
        where: { bordereauId }
      });

      if (existingVirement) {
        this.logger.warn(`Virement already exists for bordereau ${bordereauId}`);
        return existingVirement;
      }

      // Calculate total amount from BulletinSoin
      const totalAmount = bordereau.BulletinSoin.reduce((sum, bs) => sum + (bs.totalPec || 0), 0);

      // Create basic virement record
      const virement = await this.prisma.virement.create({
        data: {
          bordereauId,
          montant: totalAmount,
          referenceBancaire: `VIR-${bordereau.reference}`,
          dateDepot: new Date(),
          dateExecution: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next day
          confirmed: false,
          confirmedById: userId
        }
      });

      // Update bordereau status
      await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: { 
          statut: 'PRET_VIREMENT',
          dateDepotVirement: new Date()
        }
      });

      this.logger.log(`Created virement ${virement.id} for bordereau ${bordereauId}`);
      return virement;

    } catch (error) {
      this.logger.error(`Failed to create virement for bordereau ${bordereauId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Notify finance team when bordereau is ready for virement processing
   */
  async notifyFinanceForVirement(bordereauId: string) {
    try {
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: bordereauId },
        include: { client: true }
      });

      if (!bordereau) return;

      const financeUsers = await this.prisma.user.findMany({
        where: { role: 'FINANCE', active: true }
      });

      for (const user of financeUsers) {
        await this.prisma.notification.create({
          data: {
            userId: user.id,
            type: 'BORDEREAU_READY_VIREMENT',
            title: 'Bordereau prêt pour virement',
            message: `Le bordereau ${bordereau.reference} (${bordereau.client?.name}) est prêt pour traitement virement`,
            data: {
              bordereauId,
              reference: bordereau.reference,
              clientName: bordereau.client?.name,
              montant: (bordereau as any).BulletinSoin?.reduce((sum: number, bs: any) => sum + (bs.totalPec || 0), 0) || 0
            }
          }
        });
      }

      this.logger.log(`Notified finance team for bordereau ${bordereauId}`);
    } catch (error) {
      this.logger.error(`Failed to notify finance team: ${error.message}`);
    }
  }

  /**
   * Update bordereau status when virement is processed
   */
  async updateBordereauFromVirement(virementId: string, status: 'EN_COURS' | 'EXECUTE' | 'REJETE') {
    try {
      const virement = await this.prisma.virement.findUnique({
        where: { id: virementId },
        include: { bordereau: true }
      });

      if (!virement) return;

      let bordereauStatus;
      let updateData: any = {};

      switch (status) {
        case 'EN_COURS':
          // NO STATUS CHANGE - bordereau stays TRAITE
          return; // Exit early, don't update
        case 'EXECUTE':
          bordereauStatus = 'CLOTURE'; // Only EXECUTE changes to CLOTURE
          updateData.dateExecutionVirement = new Date();
          updateData.dateCloture = new Date();
          break;
        case 'REJETE':
          // NO STATUS CHANGE - bordereau stays TRAITE
          return; // Exit early, don't update
      }

      await this.prisma.bordereau.update({
        where: { id: virement.bordereauId },
        data: {
          statut: bordereauStatus,
          ...updateData
        }
      });

      this.logger.log(`Updated bordereau ${virement.bordereauId} status to ${bordereauStatus}`);
    } catch (error) {
      this.logger.error(`Failed to update bordereau from virement: ${error.message}`);
    }
  }
}