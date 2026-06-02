/**
 * Service to manage OrdreVirement.statutGlobal field
 * Automatically updates the global status based on workflow events
 * 
 * Status Flow (6 steps from diagram):
 * 1. EN_ATTENTE → Order created
 * 2. VALIDE_INTERNE → Internal validation approved
 * 3. VALIDE_RECOUVREMENT → Recovery approved (payment received)
 * 3b. BLOQUE_RECOUVREMENT → Recovery blocked (payment not received)
 * 4. COMPTABILISE → Accounting entries generated (TXT created)
 * 5. INTEGRE_SAGE → Successfully integrated in Sage
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatutGlobalService {
  private readonly logger = new Logger(StatutGlobalService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Update to VALIDE_INTERNE when internal validation is approved
   */
  async markAsValidatedInternally(ordreVirementId: string): Promise<void> {
    await this.updateStatut(ordreVirementId, 'VALIDE_INTERNE');
    this.logger.log(`OV ${ordreVirementId} → VALIDE_INTERNE`);
  }

  /**
   * Update to VALIDE_RECOUVREMENT when recovery approves (payment received)
   */
  async markAsRecoveryValidated(ordreVirementId: string): Promise<void> {
    await this.updateStatut(ordreVirementId, 'VALIDE_RECOUVREMENT');
    this.logger.log(`OV ${ordreVirementId} → VALIDE_RECOUVREMENT`);
  }

  /**
   * Update to BLOQUE_RECOUVREMENT when recovery blocks (payment not received)
   */
  async markAsRecoveryBlocked(ordreVirementId: string): Promise<void> {
    await this.updateStatut(ordreVirementId, 'BLOQUE_RECOUVREMENT');
    this.logger.log(`OV ${ordreVirementId} → BLOQUE_RECOUVREMENT`);
  }

  /**
   * Update to COMPTABILISE when Sage TXT is generated
   */
  async markAsAccounted(ordreVirementId: string): Promise<void> {
    await this.updateStatut(ordreVirementId, 'COMPTABILISE');
    this.logger.log(`OV ${ordreVirementId} → COMPTABILISE`);
  }

  /**
   * Update to INTEGRE_SAGE when successfully integrated in Sage
   * (This would be called by Sage integration callback/webhook)
   */
  async markAsSageIntegrated(ordreVirementId: string): Promise<void> {
    await this.updateStatut(ordreVirementId, 'INTEGRE_SAGE');
    this.logger.log(`OV ${ordreVirementId} → INTEGRE_SAGE`);
  }

  /**
   * Get current status
   */
  async getCurrentStatut(ordreVirementId: string): Promise<string> {
    const ov = await this.prisma.ordreVirement.findUnique({
      where: { id: ordreVirementId },
      select: { statutGlobal: true },
    });
    return ov?.statutGlobal || 'EN_ATTENTE';
  }

  /**
   * Internal helper to update status
   */
  private async updateStatut(
    ordreVirementId: string,
    newStatut: 'EN_ATTENTE' | 'VALIDE_INTERNE' | 'VALIDE_RECOUVREMENT' | 'BLOQUE_RECOUVREMENT' | 'COMPTABILISE' | 'INTEGRE_SAGE',
  ): Promise<void> {
    await this.prisma.ordreVirement.update({
      where: { id: ordreVirementId },
      data: { statutGlobal: newStatut },
    });
  }
}
