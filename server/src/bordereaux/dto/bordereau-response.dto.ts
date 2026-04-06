import { Bordereau, Statut, User, Contract } from '@prisma/client';

export enum StatusColor {
  GREEN = 'GREEN',
  ORANGE = 'ORANGE',
  RED = 'RED',
}

export class BordereauResponseDto {
  id!: string;
  reference!: string;
  clientId!: string;
  contractId!: string;
  dateReception!: Date;
  dateDebutScan?: Date | null;
  dateFinScan?: Date | null;
  dateReceptionSante?: Date | null;
  dateCloture?: Date | null;
  dateDepotVirement?: Date | null;
  dateExecutionVirement?: Date | null;
  delaiReglement!: number;
  statut!: Statut;
  nombreBS!: number;
  createdAt!: Date;
  updatedAt!: Date;
  
  // Additional fields for KPIs and tracking
  daysElapsed?: number;
  daysRemaining?: number;
  statusColor?: StatusColor;
  scanDuration?: number | null;
  totalDuration?: number | null;
  isOverdue?: boolean;
  assignedTo?: string;
  dateReceptionBO?: Date | null;
  dureeTraitement?: number | null;
  dureeTraitementStatus?: 'GREEN' | 'RED' | null;
  dureeTraitementWarning?: string | null; // Warning message for data inconsistency
  dureeReglement?: number | null;
  dureeReglementStatus?: 'GREEN' | 'RED' | null;
  dateAffectation?: Date | null;

  // Relations
  client?: User;
  contract?: Contract;
  bulletinSoins?: any[];
  assignedToUser?: { id: string; fullName: string };

  constructor(partial: Partial<BordereauResponseDto>) {
    Object.assign(this, partial);
  }

  static fromEntity(bordereau: any, includeKPIs = true): BordereauResponseDto {
    // Create a new response object with the bordereau data
    const response = new BordereauResponseDto({
      ...bordereau,
      // Ensure date fields are properly handled
      dateReception: bordereau.dateReception,
      dateDebutScan: bordereau.dateDebutScan || null,
      dateFinScan: bordereau.dateFinScan || null,
      dateReceptionSante: bordereau.dateReceptionSante || null,
      dateCloture: bordereau.dateCloture || null,
      dateDepotVirement: bordereau.dateDepotVirement || null,
      dateExecutionVirement: bordereau.ordresVirement?.[0]?.dateEtatFinal || bordereau.ordresVirement?.[0]?.dateTraitement || bordereau.dateExecutionVirement || null,
      dateReceptionBO: bordereau.dateReceptionBO || null,
      dateAffectation: bordereau.dateAffectation || null,
      createdAt: bordereau.createdAt,
      updatedAt: bordereau.updatedAt,
      // Include relations if they exist
      client: bordereau.client,
      contract: bordereau.contract,
      bulletinSoins: bordereau.BulletinSoin || [],
      assignedToUser: bordereau.assignedToUser,
    });
    
    if (includeKPIs) {
      // Calculate days elapsed since reception
      const today = new Date();
      const receptionDate = new Date(bordereau.dateReception);
      const daysElapsed = Math.floor((today.getTime() - receptionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // UNIFIED SLA LOGIC: Calculate percentage elapsed
      const slaThreshold = bordereau.delaiReglement || 30;
      const percentElapsed = (daysElapsed / slaThreshold) * 100;
      const daysRemaining = slaThreshold - daysElapsed;
      
      // Determine status color based on percentage elapsed (UNIFIED: ≤80% green, >80% orange, >100% red)
      let statusColor = StatusColor.GREEN;
      if (percentElapsed > 100) {
        statusColor = StatusColor.RED;
      } else if (percentElapsed > 80) {
        statusColor = StatusColor.ORANGE;
      }
      
      // Calculate scan duration if available
      let scanDuration: number | null = null;
      if (bordereau.dateDebutScan && bordereau.dateFinScan) {
        scanDuration = Math.floor(
          (new Date(bordereau.dateFinScan).getTime() - new Date(bordereau.dateDebutScan).getTime()) / 
          (1000 * 60 * 60 * 24)
        );
      }
      
      // Calculate total duration if closed
      let totalDuration: number | null = null;
      if (bordereau.dateCloture) {
        totalDuration = Math.floor(
          (new Date(bordereau.dateCloture).getTime() - receptionDate.getTime()) / 
          (1000 * 60 * 60 * 24)
        );
      }
      
      // Add KPI fields to response
      response.daysElapsed = daysElapsed;
      response.daysRemaining = daysRemaining;
      response.statusColor = statusColor;
      response.scanDuration = scanDuration;
      response.totalDuration = totalDuration;
      response.isOverdue = daysRemaining <= 0;
      
      // Calculate Durée de traitement (Date Clôture - Date Réception)
      // When bordereau becomes TRAITÉ (processing completed)
      // SAFEGUARD: Only use dateCloture if status is in a "finished" state
      if (bordereau.dateReception) {
        const isFinishedStatus = ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(bordereau.statut);
        
        if (bordereau.dateCloture && isFinishedStatus) {
          // Happy path: dateCloture exists and status is finished
          const dateReception = new Date(bordereau.dateReception);
          const dateCloture = new Date(bordereau.dateCloture);
          response.dureeTraitement = Math.floor(
            (dateCloture.getTime() - dateReception.getTime()) / (1000 * 60 * 60 * 24)
          );
          response.dureeTraitementStatus = response.dureeTraitement <= bordereau.delaiReglement ? 'GREEN' : 'RED';
          response.dureeTraitementWarning = null; // No warning
        } else if (bordereau.statut === 'TRAITE' && !bordereau.dateCloture) {
          // Fallback: TRAITÉ without dateCloture (manual status change)
          // Use current date as approximation
          const now = new Date();
          const dateReception = new Date(bordereau.dateReception);
          response.dureeTraitement = Math.floor(
            (now.getTime() - dateReception.getTime()) / (1000 * 60 * 60 * 24)
          );
          response.dureeTraitementStatus = 'ORANGE' as any; // Special status for approximation
          response.dureeTraitementWarning = 'Durée approximative - Date de clôture manquante';
          
          // Log data inconsistency for monitoring
         // console.warn(`⚠️  Data inconsistency: Bordereau ${bordereau.reference} is TRAITÉ but missing dateCloture`);
        } else if (bordereau.dateCloture && !isFinishedStatus) {
          // Data inconsistency: has dateCloture but status is not finished
          // Ignore the invalid dateCloture
          response.dureeTraitement = null;
          response.dureeTraitementStatus = null;
          response.dureeTraitementWarning = null;
          
          // Log data inconsistency for monitoring
          //console.warn(`⚠️  Data inconsistency: Bordereau ${bordereau.reference} has dateCloture but status is ${bordereau.statut}`);
        } else {
          // Normal case: not finished yet
          response.dureeTraitement = null;
          response.dureeTraitementStatus = null;
          response.dureeTraitementWarning = null;
        }
      } else {
        response.dureeTraitement = null;
        response.dureeTraitementStatus = null;
      }
      
      // Calculate Durée de règlement (Date Execution Virement - Date Réception)
      // When virement is actually executed (payment sent)
      const dateExecutionVirement = bordereau.ordresVirement?.[0]?.dateEtatFinal || 
                                    bordereau.ordresVirement?.[0]?.dateTraitement || 
                                    bordereau.dateExecutionVirement;
      
      if (bordereau.dateReception && dateExecutionVirement) {
        const dateReception = new Date(bordereau.dateReception);
        const dateReglement = new Date(dateExecutionVirement);
        response.dureeReglement = Math.floor(
          (dateReglement.getTime() - dateReception.getTime()) / (1000 * 60 * 60 * 24)
        );
        response.dureeReglementStatus = response.dureeReglement <= bordereau.delaiReglement ? 'GREEN' : 'RED';
      } else {
        response.dureeReglement = null;
        response.dureeReglementStatus = null;
      }
    }
    
    return response;
  }
}