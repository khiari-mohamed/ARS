export class BulletinSoin {
  id: number;
  numBs: string;
  codeAssure: string;
  nomAssure: string;
  nomBeneficiaire: string;
  nomSociete: string;
  nomPrestation: string;
  nomBordereau: string;
  lien: string;
  dateCreation: Date;
  dateMaladie: Date;
  totalPec: number;
  observationGlobal: string;
  etat: string;
  ownerId: number;
  items: BulletinSoinItem[];
  ocrText?: string;
}

export class BulletinSoinItem {
  id: number;
  nomProduit: string;
  quantite: number;
  commentaire: string;
  nomChapitre: string;
  nomPrestataire: string;
  datePrestation: Date;
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
