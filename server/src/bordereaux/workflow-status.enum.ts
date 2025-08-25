/**
 * Complete workflow status enum for Module Bordereaux
 * According to cahier de charges specification
 */
export enum WorkflowStatus {
  // Bureau d'Ordre statuses
  EN_ATTENTE = 'EN_ATTENTE',
  A_SCANNER = 'A_SCANNER',
  
  // Scan Team statuses
  SCAN_EN_COURS = 'SCAN_EN_COURS',
  SCANNE = 'SCANNE',
  
  // Chef d'Equipe statuses
  A_AFFECTER = 'A_AFFECTER',
  ASSIGNE = 'ASSIGNE',
  
  // Gestionnaire statuses
  EN_COURS = 'EN_COURS',
  TRAITE = 'TRAITE',
  MIS_EN_INSTANCE = 'MIS_EN_INSTANCE',
  REJETE = 'REJETE',
  EN_DIFFICULTE = 'EN_DIFFICULTE',
  
  // Finance statuses
  PRET_VIREMENT = 'PRET_VIREMENT',
  VIREMENT_EN_COURS = 'VIREMENT_EN_COURS',
  VIREMENT_EXECUTE = 'VIREMENT_EXECUTE',
  VIREMENT_REJETE = 'VIREMENT_REJETE',
  
  // Final status
  CLOTURE = 'CLOTURE',
  PARTIEL = 'PARTIEL'
}

/**
 * Status transitions allowed by role
 */
export const ROLE_STATUS_TRANSITIONS = {
  BO: {
    from: [WorkflowStatus.EN_ATTENTE],
    to: [WorkflowStatus.A_SCANNER]
  },
  SCAN_TEAM: {
    from: [WorkflowStatus.A_SCANNER, WorkflowStatus.SCAN_EN_COURS],
    to: [WorkflowStatus.SCAN_EN_COURS, WorkflowStatus.SCANNE]
  },
  CHEF_EQUIPE: {
    from: [WorkflowStatus.SCANNE, WorkflowStatus.A_AFFECTER, WorkflowStatus.EN_DIFFICULTE],
    to: [WorkflowStatus.A_AFFECTER, WorkflowStatus.ASSIGNE]
  },
  GESTIONNAIRE: {
    from: [WorkflowStatus.ASSIGNE, WorkflowStatus.EN_COURS],
    to: [WorkflowStatus.EN_COURS, WorkflowStatus.TRAITE, WorkflowStatus.MIS_EN_INSTANCE, WorkflowStatus.REJETE, WorkflowStatus.EN_DIFFICULTE]
  },
  FINANCE: {
    from: [WorkflowStatus.TRAITE, WorkflowStatus.PRET_VIREMENT, WorkflowStatus.VIREMENT_EN_COURS],
    to: [WorkflowStatus.PRET_VIREMENT, WorkflowStatus.VIREMENT_EN_COURS, WorkflowStatus.VIREMENT_EXECUTE, WorkflowStatus.VIREMENT_REJETE]
  },
  SUPER_ADMIN: {
    from: Object.values(WorkflowStatus),
    to: Object.values(WorkflowStatus)
  },
  ADMINISTRATEUR: {
    from: Object.values(WorkflowStatus),
    to: Object.values(WorkflowStatus)
  }
};

/**
 * Get allowed status transitions for a role
 */
export function getAllowedTransitions(role: string, currentStatus: WorkflowStatus): WorkflowStatus[] {
  const transitions = ROLE_STATUS_TRANSITIONS[role as keyof typeof ROLE_STATUS_TRANSITIONS];
  if (!transitions) return [];
  
  if (transitions.from.includes(currentStatus)) {
    return transitions.to;
  }
  
  return [];
}

/**
 * Check if a status transition is allowed for a role
 */
export function isTransitionAllowed(role: string, fromStatus: WorkflowStatus, toStatus: WorkflowStatus): boolean {
  const allowedTransitions = getAllowedTransitions(role, fromStatus);
  return allowedTransitions.includes(toStatus);
}