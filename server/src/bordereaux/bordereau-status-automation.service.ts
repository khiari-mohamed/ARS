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
   * Special case: Senior-managed bordereaux don't require explicit assignment
   */
  async checkAndUpdateStatusAfterAssignment(bordereauId: string): Promise<void> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { 
        documents: true,
        contract: {
          include: {
            teamLeader: { select: { role: true } }
          }
        }
      }
    });

    if (!bordereau || bordereau.documents.length === 0) return;

    // Check if Senior-managed
    const isSeniorManaged = await this.isSeniorManagedBordereau(bordereau);
    
    // For Senior: no explicit assignment needed (contract relationship grants access)
    // For Regular: all documents must be assigned
    const allAssigned = isSeniorManaged || 
      bordereau.documents.every(doc => doc.assignedToUserId !== null);

    if (allAssigned && bordereau.statut === Statut.A_AFFECTER) {
      await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: { statut: Statut.EN_COURS }
      });
      
      this.logger.log(`✅ Bordereau ${bordereau.reference}: Status changed A_AFFECTER → EN_COURS ${isSeniorManaged ? '(Senior-managed)' : '(all documents assigned)'}`);
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

  /**
   * Check if bordereau is managed by Gestionnaire Senior
   * @param bordereau - Bordereau with contract and teamLeader included
   * @returns true if managed by Senior, false otherwise
   */
  private async isSeniorManagedBordereau(bordereau: any): Promise<boolean> {
    if (!bordereau?.contract?.teamLeaderId) {
      return false;
    }
    
    // If teamLeader is already included in the query
    if (bordereau.contract.teamLeader?.role) {
      return bordereau.contract.teamLeader.role === 'GESTIONNAIRE_SENIOR';
    }
    
    // Otherwise fetch it
    const teamLeader = await this.prisma.user.findUnique({
      where: { id: bordereau.contract.teamLeaderId },
      select: { role: true }
    });
    
    return teamLeader?.role === 'GESTIONNAIRE_SENIOR';
  }
}
