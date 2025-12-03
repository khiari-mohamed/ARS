import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Statut } from '@prisma/client';

@Injectable()
export class BordereauStatusAutomationService {
  private readonly logger = new Logger(BordereauStatusAutomationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check and update bordereau status based on document assignments
   * Rule 1: If all documents are assigned → status changes to EN_COURS
   */
  async checkAndUpdateStatusAfterAssignment(bordereauId: string): Promise<void> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { documents: true }
    });

    if (!bordereau || bordereau.documents.length === 0) return;

    const allAssigned = bordereau.documents.every(doc => doc.assignedToUserId !== null);

    if (allAssigned && bordereau.statut === Statut.A_AFFECTER) {
      await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: { statut: Statut.EN_COURS }
      });
      
      this.logger.log(`✅ Bordereau ${bordereau.reference}: Status changed A_AFFECTER → EN_COURS (all documents assigned)`);
    }
  }

  /**
   * Check and update bordereau status based on document processing
   * Rule 2: If all documents are treated/rejected → status changes to TRAITE
   */
  async checkAndUpdateStatusAfterProcessing(bordereauId: string): Promise<void> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { documents: true }
    });

    if (!bordereau || bordereau.documents.length === 0) return;

    const allProcessed = bordereau.documents.every(doc => 
      doc.status === 'TRAITE' || doc.status === 'REJETE'
    );

    if (allProcessed && bordereau.statut === Statut.EN_COURS) {
      await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: { 
          statut: Statut.TRAITE,
          dateCloture: new Date()
        }
      });
      
      this.logger.log(`✅ Bordereau ${bordereau.reference}: Status changed EN_COURS → TRAITE (all documents processed)`);
    }
  }

  /**
   * Check and update bordereau status when virement is executed
   * Rule 3: If virement is executed → status changes to CLOTURE
   */
  async checkAndUpdateStatusAfterVirement(bordereauId: string): Promise<void> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { virement: true }
    });

    if (!bordereau || !bordereau.virement) return;

    if (bordereau.virement.confirmed && bordereau.statut === Statut.TRAITE) {
      await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: { 
          statut: Statut.CLOTURE,
          dateCloture: new Date()
        }
      });
      
      this.logger.log(`✅ Bordereau ${bordereau.reference}: Status changed TRAITE → CLOTURE (virement executed)`);
    }
  }

  /**
   * Comprehensive status check - runs all rules
   */
  async checkAllRules(bordereauId: string): Promise<void> {
    await this.checkAndUpdateStatusAfterAssignment(bordereauId);
    await this.checkAndUpdateStatusAfterProcessing(bordereauId);
    await this.checkAndUpdateStatusAfterVirement(bordereauId);
  }
}
