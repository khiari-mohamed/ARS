import { Bordereau, Statut, User, Contract } from '@prisma/client';

export enum StatusColor {
  GREEN = 'GREEN',
  ORANGE = 'ORANGE',
  RED = 'RED',
}

export class BordereauResponseDto {
  id: string;
  reference: string;
  clientId: string;
  contractId: string;
  dateReception: Date;
  dateDebutScan?: Date | null;
  dateFinScan?: Date | null;
  dateReceptionSante?: Date | null;
  dateCloture?: Date | null;
  dateDepotVirement?: Date | null;
  dateExecutionVirement?: Date | null;
  delaiReglement: number;
  statut: Statut;
  nombreBS: number;
  createdAt: Date;
  updatedAt: Date;
  
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
  dureeReglement?: number | null;
  dureeReglementStatus?: 'GREEN' | 'RED' | null;

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
      dateExecutionVirement: bordereau.dateExecutionVirement || null,
      dateReceptionBO: bordereau.dateReceptionBO || null,
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
      
      // Calculate days remaining until deadline
      const daysRemaining = bordereau.delaiReglement - daysElapsed;
      
      // Determine status color based on days remaining
      let statusColor = StatusColor.GREEN;
      if (daysRemaining <= 0) {
        statusColor = StatusColor.RED;
      } else if (daysRemaining <= 3) {
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
      
      // Calculate Durée de traitement (date de traitement - date BO)
      // Use dateCloture if available, otherwise use current date for in-progress calculation
      if (bordereau.dateReceptionBO) {
        const dateBO = new Date(bordereau.dateReceptionBO);
        
        if (bordereau.dateCloture) {
          const dateTraitement = new Date(bordereau.dateCloture);
          response.dureeTraitement = Math.floor(
            (dateTraitement.getTime() - dateBO.getTime()) / (1000 * 60 * 60 * 24)
          );
          response.dureeTraitementStatus = response.dureeTraitement <= bordereau.delaiReglement ? 'GREEN' : 'RED';
        } else {
          // In progress - calculate current duration
          const now = new Date();
          response.dureeTraitement = Math.floor(
            (now.getTime() - dateBO.getTime()) / (1000 * 60 * 60 * 24)
          );
          response.dureeTraitementStatus = response.dureeTraitement <= bordereau.delaiReglement ? 'GREEN' : 'RED';
        }
      } else {
        response.dureeTraitement = null;
        response.dureeTraitementStatus = null;
      }
      
      // Calculate Durée de règlement (date de règlement - date BO)
      if (bordereau.dateReceptionBO && bordereau.dateExecutionVirement) {
        const dateBO = new Date(bordereau.dateReceptionBO);
        const dateReglement = new Date(bordereau.dateExecutionVirement);
        response.dureeReglement = Math.floor(
          (dateReglement.getTime() - dateBO.getTime()) / (1000 * 60 * 60 * 24)
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