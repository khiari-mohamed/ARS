/**
 * src/types/contract.d.ts
 * Canonical Contract type for all frontend usage.
 */
export interface Contract {
  id: string;
  clientId: string;
  clientName: string;
  delaiReglement: number;
  delaiReclamation: number;
  escalationThreshold?: number;
  documentPath: string;
  assignedManagerId: string;
  createdAt: string;
  updatedAt: string;
  startDate: string;
  endDate: string;
  signature?: string;
  version?: number;
}