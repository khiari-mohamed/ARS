export class ExpertiseInfo {
  id?: number; 
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
  // ... add other optical/dental fields as needed
}
