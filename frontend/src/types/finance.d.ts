export type VirementStatus = 'pending' | 'confirmed';

export interface LinkedBordereau {
  id: string;
  reference: string;
  totalAmount: number;
}

export interface Virement {
  id: string;
  clientId: string;
  clientName: string;
  contractId?: string;
  amount: number;
  date: string;
  status: VirementStatus;
  reference: string;
  paymentMode?: string;
  remarks?: string;
  confirmedBy?: string;
  confirmedAt?: string;
  linkedBordereaux?: LinkedBordereau[];
  createdAt: string;
  updatedAt: string;
}

export interface VirementHistoryEntry {
  id: string;
  virementId: string;
  action: string;
  user: string;
  timestamp: string;
  remarks?: string;
}

export interface VirementSearchParams {
  bordereauReference?: string;
  clientName?: string;
  dateFrom?: string;
  dateTo?: string;
  confirmed?: boolean;
  page?: number;
  size?: number;
}

export interface Bordereau {
  id: string;
  reference: string;
  clientId: string;
  clientName: string;
  totalAmount: number;
  status: string;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
}