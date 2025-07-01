// src/types/client.d.ts

export interface Client {
  gestionnaires: any;
  id: string;
  name: string;
  reglementDelay: number;
  reclamationDelay: number;
  accountManagerId: string;
  accountManager?: User;
  contracts?: Contract[];
  bordereaux?: Bordereau[];
  reclamations?: Reclamation[];
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export interface Contract {
  id: string;
  clientId: string;
  clientName: string;
  delaiReglement: number;
  delaiReclamation: number;
  documentPath: string;
  assignedManagerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bordereau {
  id: string;
  reference: string;
  clientId: string;
  contractId: string;
  dateReception: string;
  statut: string;
  nombreBS: number;
}

export interface Reclamation {
  id: string;
  clientId: string;
  type: string;
  severity: string;
  status: string;
  description: string;
  createdAt: string;
}