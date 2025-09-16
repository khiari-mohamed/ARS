export class UpdateBordereauDto {
  reference?: string;
  dateReception?: string;
  clientId?: string;
  contractId?: string;
  dateDebutScan?: string;
  dateFinScan?: string;
  dateReceptionSante?: string;
  dateCloture?: string;
  dateDepotVirement?: string;
  dateExecutionVirement?: string;
  delaiReglement?: number;
  statut?: any;
  nombreBS?: number;
  priority?: number;
  observations?: string;
  commentaireInterne?: string;
  montantTotal?: number;
}