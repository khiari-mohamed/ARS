import { Bordereau, Statut, User, Contract } from '@prisma/client';
import { calculateAllSLAs, BordereauForSLA, SLAColor } from '../../utils/sla-calculator';

export enum StatusColor {
  GREEN = 'GREEN',
  ORANGE = 'ORANGE',
  RED = 'RED',
}

/** One of the four unified, company-mandated SLA indicators */
export class SLAIndicatorDto {
  applicable!: boolean;
  frozen!: boolean;
  overdue!: boolean;
  daysElapsed!: number | null;
  daysRemaining!: number | null;
  percentElapsed!: number | null;
  status!: StatusColor | null;

  constructor(partial: Partial<SLAIndicatorDto>) {
    Object.assign(this, partial);
  }

  static fromMetric(metric: {
    applicable: boolean;
    isFrozen: boolean;
    isOverdue: boolean;
    daysElapsed: number | null;
    daysRemaining: number | null;
    percentElapsed: number | null;
    statusColor: SLAColor | null;
  }): SLAIndicatorDto {
    return new SLAIndicatorDto({
      applicable: metric.applicable,
      frozen: metric.isFrozen,
      overdue: metric.isOverdue,
      daysElapsed: metric.daysElapsed,
      daysRemaining: metric.daysRemaining,
      percentElapsed: metric.percentElapsed,
      status: (metric.statusColor as StatusColor | null) ?? null,
    });
  }
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

  // ── Legacy overall KPI fields — kept for backward compatibility, now mirror
  //    "SLA de règlement BO" (exactly what the app used to compute/display) ──
  daysElapsed?: number;
  daysRemaining?: number;
  statusColor?: StatusColor;
  isOverdue?: boolean;

  scanDuration?: number | null;
  totalDuration?: number | null;
  assignedTo?: string;
  dateReceptionBO?: Date | null;

  // ── Legacy duration fields — BUG FIXED, now driven by the unified calculator ──
  dureeTraitement?: number | null;
  dureeTraitementStatus?: 'GREEN' | 'ORANGE' | 'RED' | null;
  dureeTraitementWarning?: string | null;
  dureeReglement?: number | null;
  dureeReglementStatus?: 'GREEN' | 'ORANGE' | 'RED' | null;
  dureeReglementFinance?: number | null;
  dureeReglementFinanceStatus?: 'GREEN' | 'ORANGE' | 'RED' | null;
  dateAffectation?: Date | null;

  // ── The four unified, company-mandated SLA indicators ──
  slaScan?: SLAIndicatorDto;
  slaTraitement?: SLAIndicatorDto;
  slaReglementBO?: SLAIndicatorDto;
  slaReglementFinance?: SLAIndicatorDto;

  // Relations
  client?: User;
  contract?: Contract;
  bulletinSoins?: any[];
  assignedToUser?: { id: string; fullName: string };

  constructor(partial: Partial<BordereauResponseDto>) {
    Object.assign(this, partial);
  }

  static fromEntity(bordereau: any, includeKPIs = true): BordereauResponseDto {
    const response = new BordereauResponseDto({
      ...bordereau,
      dateReception: bordereau.dateReception,
      dateDebutScan: bordereau.dateDebutScan || null,
      dateFinScan: bordereau.dateFinScan || null,
      dateReceptionSante: bordereau.dateReceptionSante || null,
      dateCloture: bordereau.dateCloture || null,
      dateDepotVirement: bordereau.dateDepotVirement || null,
      dateExecutionVirement:
        bordereau.ordresVirement?.[0]?.dateEtatFinal ||
        bordereau.ordresVirement?.[0]?.dateTraitement ||
        bordereau.dateExecutionVirement ||
        null,
      dateReceptionBO: bordereau.dateReceptionBO || null,
      dateAffectation: bordereau.dateAffectation || null,
      createdAt: bordereau.createdAt,
      updatedAt: bordereau.updatedAt,
      client: bordereau.client,
      contract: bordereau.contract,
      bulletinSoins: bordereau.BulletinSoin || [],
      assignedToUser: bordereau.assignedToUser,
    });

    if (includeKPIs) {
      const slaInput: BordereauForSLA = {
        dateReception: bordereau.dateReception,
        delaiReglement: bordereau.delaiReglement || 30,
        statut: bordereau.statut,
        dateDebutScan: bordereau.dateDebutScan,
        dateFinScan: bordereau.dateFinScan,
        dateCloture: bordereau.dateCloture,
        dateExecutionVirement: bordereau.dateExecutionVirement,
        ordresVirement: bordereau.ordresVirement,
      };

      // ✅ ONE unified computation for all 4 indicators — no more scattered
      // date-diff math spread across services.
      const all = calculateAllSLAs(slaInput);

      response.slaScan = SLAIndicatorDto.fromMetric(all.scan);
      response.slaTraitement = SLAIndicatorDto.fromMetric(all.traitement);
      response.slaReglementBO = SLAIndicatorDto.fromMetric(all.reglementBO);
      response.slaReglementFinance = SLAIndicatorDto.fromMetric(all.reglementFinance);

      // Legacy overall fields mirror "SLA de règlement BO" — the only
      // indicator the app used to compute/display before this fix.
      response.daysElapsed = all.reglementBO.daysElapsed ?? 0;
      response.daysRemaining = all.reglementBO.daysRemaining ?? (bordereau.delaiReglement || 30);
      response.statusColor = (all.reglementBO.statusColor as StatusColor) ?? StatusColor.GREEN;
      response.isOverdue = all.reglementBO.isOverdue;

      const receptionDate = new Date(bordereau.dateReception);

      // Raw scan duration (informational only — slaScan carries the colored status)
      response.scanDuration =
        bordereau.dateDebutScan && bordereau.dateFinScan
          ? Math.floor(
              (new Date(bordereau.dateFinScan).getTime() - new Date(bordereau.dateDebutScan).getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : null;

      response.totalDuration = bordereau.dateCloture
        ? Math.floor((new Date(bordereau.dateCloture).getTime() - receptionDate.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // ── Durée de traitement (BUG FIX) ────────────────────────────────────
      // Company definition: dateCloture (finalisation du traitement) − dateReception.
      // The old logic ALSO required every single document/BS row to read
      // "TRAITE" before showing a value. dateCloture is only ever set by the
      // workflow once processing is genuinely finalised — that extra check was
      // redundant, and it silently blanked out a valid duration whenever one
      // denormalized child row lagged behind. Removed. Same clock as slaTraitement.
      if (all.traitement.isFrozen) {
        response.dureeTraitement = all.traitement.daysElapsed;
        response.dureeTraitementStatus = all.traitement.statusColor;
        response.dureeTraitementWarning = null;
      } else if (['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(bordereau.statut)) {
        // Status says finished but dateCloture is missing — data inconsistency.
        // Show an approximate live value flagged with a warning instead of hiding it.
        response.dureeTraitement = all.traitement.daysElapsed;
        response.dureeTraitementStatus = 'ORANGE';
        response.dureeTraitementWarning = 'Durée approximative - Date de clôture manquante';
      } else {
        // Not finished yet — "En cours"
        response.dureeTraitement = null;
        response.dureeTraitementStatus = null;
        response.dureeTraitementWarning = null;
      }

      // ── Durée de règlement BO — Date d'exécution du virement − Date de réception ──
      if (all.reglementBO.isFrozen) {
        response.dureeReglement = all.reglementBO.daysElapsed;
        response.dureeReglementStatus = all.reglementBO.statusColor;
      } else {
        response.dureeReglement = null;
        response.dureeReglementStatus = null;
      }

      // ── Durée de règlement Finance — Date d'exécution du virement − Date de finalisation du traitement ──
      if (all.reglementFinance.isFrozen) {
        response.dureeReglementFinance = all.reglementFinance.daysElapsed;
        response.dureeReglementFinanceStatus = all.reglementFinance.statusColor;
      } else {
        response.dureeReglementFinance = null;
        response.dureeReglementFinanceStatus = null;
      }
    }

    return response;
  }
}