import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Log a virement history entry
 * 
 * @param virementId - ID of the ordre de virement
 * @param action - Action type (CREATION, VALIDATION, EXECUTION, etc.)
 * @param userId - ID of the user performing the action
 * @param options - Optional parameters
 */
export async function logVirementHistory(
  virementId: string,
  action: string,
  userId: string,
  options?: {
    previousState?: string;
    newState?: string;
    comment?: string;
  }
): Promise<void> {
  try {
    // Verify user exists before logging
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!userExists) {
      console.warn(`⚠️ User ${userId} not found - skipping history log for action ${action}`);
      return;
    }

    await prisma.virementHistory.create({
      data: {
        virementId,
        action,
        userId,
        previousState: options?.previousState,
        newState: options?.newState,
        comment: options?.comment,
      },
    });
    
    console.log(`✅ History logged: ${action} for virement ${virementId} by user ${userId}`);
  } catch (error) {
    console.error('❌ Failed to log virement history:', error);
    // Don't throw - history logging should not break the main flow
  }
}

/**
 * Action types for virement history
 */
export const VIREMENT_ACTIONS = {
  CREATION: 'CREATION',
  VALIDATION: 'VALIDATION',
  AUTORISATION: 'AUTORISATION',
  EXECUTION: 'EXECUTION',
  REJET: 'REJET',
  MODIFICATION: 'MODIFICATION',
  ANNULATION: 'ANNULATION',
  REINJECTION: 'REINJECTION',
  EXPORT: 'EXPORT',
  GENERATION_OV: 'GENERATION_OV',
  GENERATION_VIR: 'GENERATION_VIR',
  DEMANDE_RECUPERATION: 'DEMANDE_RECUPERATION',
  MONTANT_RECUPERE: 'MONTANT_RECUPERE',
  CHANGEMENT_STATUT: 'CHANGEMENT_STATUT',
  CORRECTION: 'CORRECTION',
  RELANCE_TRAITEMENT: 'RELANCE_TRAITEMENT',
} as const;

export type VirementAction = typeof VIREMENT_ACTIONS[keyof typeof VIREMENT_ACTIONS];
