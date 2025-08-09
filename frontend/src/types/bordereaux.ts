import { Statut, StatusColor } from "../utils/enums";
export type { Statut };

export interface Bordereau {
  id: string;
  reference: string;
  clientId: string;
  contractId: string;
  dateReception: string;
  dateDebutScan?: string | null;
  dateFinScan?: string | null;
  dateReceptionSante?: string | null;
  dateCloture?: string | null;
  dateDepotVirement?: string | null;
  dateExecutionVirement?: string | null;
  delaiReglement: number;
  statut: Statut;
  currentHandler?: any;
  currentHandlerId?: string;
  nombreBS: number;
  createdAt: string;
  updatedAt: string;
  daysElapsed?: number;
  daysRemaining?: number;
  statusColor?: StatusColor;
  scanDuration?: number | null;
  totalDuration?: number | null;
  isOverdue?: boolean;
  client?: any;
  contract?: any;
}

// Forecasting
export interface ForecastResult {
  forecast: number;
  dailyAverage: number;
}

export interface StaffingEstimation {
  forecast: number;
  staffNeeded: number;
}

// AI Integration
export interface AIComplaintAnalysis {
  message: string;
  analysis?: {
    summary?: string;
    categories?: string[];
    [key: string]: any;
  };
}

export interface AIRecommendations {
  message: string;
  recommendations?: {
    suggestion: string;
    confidence?: number;
    [key: string]: any;
  }[];
}

// Full-Text Search: support both Bordereau and Document hits
export type SearchResult = Bordereau | Document;

export interface BordereauForm {
  reference: string;
  dateReception: string;
  clientId: string;
  contractId?: string;
  delaiReglement: number;
  statut?: Statut;
  nombreBS: number;
}

export type BSStatus = "IN_PROGRESS" | "VALIDATED" | "REJECTED";

export interface BS {
  id: string;
  bordereauId: string;
  ownerId: string;
  status: BSStatus;
  processedAt?: string;
  documentId?: string;
  numBs: string;
  etat: string;
  owner?: any;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  path: string;
  uploadedAt?: string;
  uploadedById?: string;
  bordereauId?: string;
  ocrResult?: {
    text?: string;
    confidence?: number;
    [key: string]: any;
  };
}

export interface Virement {
  id: string;
  bordereauId: string;
  montant: number;
  referenceBancaire: string;
  dateDepot: string;
  dateExecution: string;
  confirmed: boolean;
  confirmedById?: string;
  confirmedAt?: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  message: string;
  type: string;
  createdAt: string;
}

export interface KPI {
  id: string;
  reference: string;
  statut: Statut;
  daysElapsed: number;
  daysRemaining: number;
  scanDuration?: number | null;
  totalDuration?: number | null;
  isOverdue: boolean;
  statusColor: StatusColor;
  byStatus?: Record<string, number>;
}

export interface RecurrentComplaint {
  id?: string | number;
  description: string;
  [key: string]: any; // for any other fields your complaints may have
}

export interface AIComplaintAnalysis {
  summary: string;
  recurrent: RecurrentComplaint[];
}