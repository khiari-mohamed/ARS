export interface Contract {
  id: string;
  clientId: string;
  clientName: string;
  startDate: string;
  endDate: string;
  signature?: string; // unified with backend
  delaiReglement: number;
  delaiReclamation: number;
  escalationThreshold?: number;
  assignedManagerId: string;
  documentPath: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  assignedManager?: { id: string; fullName: string; email: string };
  history?: any[];
  version?: number;
}
