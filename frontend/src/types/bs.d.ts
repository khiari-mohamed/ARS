export type BSStatus = 'IN_PROGRESS' | 'VALIDATED' | 'REJECTED' | 'EN_COURS' | 'CLOTURE' | 'DELETED' | 'EN_DIFFICULTE';

export interface BulletinSoinItem {
  id: number;
  nomProduit: string;
  quantite: number;
  commentaire: string;
  nomChapitre: string;
  nomPrestataire: string;
  datePrestation: string;
  typeHonoraire: string;
  depense: number;
  pec: number;
  participationAdherent: number;
  message: string;
  codeMessage: string;
  acuiteDroite: number;
  acuiteGauche: number;
  nombreCle: string;
  nbJourDepassement: number;
}

export interface ExpertiseInfo {
  isFavorable: 'EN_COURS' | 'FAVORABLE' | 'DEFAVORABLE';
  matriculeAdherent: string;
  numBS: string;
  contrat: string;
  cin: string;
  vlodsphere?: number;
  vpogsphere?: number;
  prixMonture?: number;
  codification?: string;
  natureActe?: string;
  societe?: string;
  dents?: string[];
}

export interface BulletinSoin {
  id: number;
  numBs: string;
  codeAssure: string;
  nomAssure: string;
  nomBeneficiaire: string;
  nomSociete: string;
  nomPrestation: string;
  nomBordereau: string;
  lien: string;
  dateCreation: string;
  dateMaladie: string;
  totalPec: number;
  observationGlobal: string;
  etat: BSStatus;
  ownerId: number;
  items: BulletinSoinItem[];
  ocrText?: string;
  expertises?: ExpertiseInfo[];
}

export interface BsLog {
  id: number;
  userId: number;
  bsId: number;
  action: string;
  timestamp: string;
}

export interface BSListResponse {
  items: BulletinSoin[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
