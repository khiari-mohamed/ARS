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

  // Relations
  client?: User;
  contract?: Contract;

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
      createdAt: bordereau.createdAt,
      updatedAt: bordereau.updatedAt,
      // Include relations if they exist
      client: bordereau.client,
      contract: bordereau.contract,
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
    }
    
    return response;
  }
}