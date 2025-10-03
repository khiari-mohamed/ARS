// EXACT 6 virement statuses from specifications
export type EtatVirement = 
  | 'NON_EXECUTE'              // When bordereau is "Traité"
  | 'EN_COURS_EXECUTION'       // Applied by Finance service
  | 'EXECUTE_PARTIELLEMENT'    // Partial execution (Finance action)
  | 'REJETE'                   // Failed (Finance action)
  | 'BLOQUE'                   // Suspended/stopped (Finance action)
  | 'EXECUTE';                 // When bordereau is "Payé"

export interface DonneurOrdre {
  id: string;
  nom: string;
  rib: string;
  banque: string;
  agence?: string;
  structureTxt: string;
  formatTxtType: string;
  statut: 'ACTIF' | 'INACTIF';
}

export interface Adherent {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  clientId: string;
  rib: string;
  codeAssure?: string;
  numeroContrat?: string;
  statut: 'ACTIF' | 'INACTIF';
  createdAt: string;
  updatedAt: string;
}

export interface OrdreVirement {
  id: string;
  reference: string;
  donneurOrdreId: string;
  bordereauId?: string;
  dateCreation: string;
  dateTraitement?: string;
  utilisateurSante: string;
  utilisateurFinance?: string;
  etatVirement: EtatVirement;
  dateEtatFinal?: string;
  commentaire?: string;
  montantTotal: number;
  nombreAdherents: number;
  fichierPdf?: string;
  fichierTxt?: string;
  // Recovery tracking - EXACT SPEC
  demandeRecuperation: boolean;
  dateDemandeRecuperation?: string;
  montantRecupere: boolean;
  dateMontantRecupere?: string;
  motifObservation?: string;
  // Validation workflow
  validationStatus: string;
  validatedBy?: string;
  validatedAt?: string;
  validationComment?: string;
  // Relations
  donneurOrdre?: DonneurOrdre;
  bordereau?: any;
}

export interface SuiviVirement {
  id: string;
  numeroBordereau: string;
  societe: string;
  dateInjection: string;
  utilisateurSante: string;
  dateTraitement?: string;
  utilisateurFinance?: string;
  etatVirement: EtatVirement;
  dateEtatFinal?: string;
  commentaire?: string;
  motifObservation?: string;
  demandeRecuperation: boolean;
  dateDemandeRecuperation?: string;
  montantRecupere: boolean;
  dateMontantRecupere?: string;
  ordreVirementId?: string;
  ordreVirement?: OrdreVirement;
}

export interface BordereauTraite {
  id: string;
  clientSociete: string;
  referenceOV: string;
  referenceBordereau: string;
  montantBordereau: number;
  dateFinalisationBordereau?: string;
  dateInjection: string;
  statutVirement: EtatVirement;
  dateTraitementVirement?: string;
  motifObservation?: string;
  demandeRecuperation: boolean;
  dateDemandeRecuperation?: string;
  montantRecupere: boolean;
  dateMontantRecupere?: string;
}

export interface FinanceDashboardStats {
  totalOrdres: number;
  ordresEnCours: number;
  ordresExecutes: number;
  ordresRejetes: number;
  montantTotal: number;
  demandesRecuperation: number;
  montantsRecuperes: number;
}

export interface FinanceDashboard {
  stats: FinanceDashboardStats;
  ordresVirement: OrdreVirement[];
}