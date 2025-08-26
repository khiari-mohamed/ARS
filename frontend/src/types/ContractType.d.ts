export interface Contract {
  id: string;
  clientId: string;
  clientName: string;
  name?: string; // For backward compatibility
  nom?: string; // For backward compatibility
  delaiReglement: number; // SLA Treatment delay in days
  delaiReclamation: number; // SLA Claims reply delay in days  
  escalationThreshold?: number; // Alert threshold
  assignedManagerId: string; // Chargé de compte
  startDate: string;
  endDate: string;
  documentPath?: string;
  signature?: string; // Notes
  createdAt: string;
  updatedAt: string;
  version?: number; // For backward compatibility
  thresholds?: any; // For backward compatibility
  notes?: string;
  
  // Relations
  client?: {
    id: string;
    name: string;
  };
  assignedManager?: {
    id: string;
    fullName: string;
    email: string;
  };
  history?: any[];
}
