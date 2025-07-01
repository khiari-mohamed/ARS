import { LocalAPI } from '../services/axios';
import { WorkflowAssignment } from '../types/workflow';

const API_BASE = '/workflow';

export const getWorkflowAssignments = async (): Promise<WorkflowAssignment[]> => {
  const res = await LocalAPI.get(`${API_BASE}/assignments`);
  return res.data;
};

export const getWorkflowAssignment = async (id: string): Promise<WorkflowAssignment> => {
  const res = await LocalAPI.get(`${API_BASE}/assignments/${id}`);
  return res.data;
};

export const createWorkflowAssignment = async (data: Partial<WorkflowAssignment>): Promise<WorkflowAssignment> => {
  const res = await LocalAPI.post(`${API_BASE}/assignments`, data);
  return res.data;
};

export const updateWorkflowAssignment = async (id: string, data: Partial<WorkflowAssignment>): Promise<WorkflowAssignment> => {
  const res = await LocalAPI.put(`${API_BASE}/assignments/${id}`, data);
  return res.data;
};

// Nouvelle API : Historique d'audit d'une affectation
export const getAssignmentHistory = async (assignmentId: string) => {
  const res = await LocalAPI.get(`${API_BASE}/assignments/history/${assignmentId}`);
  return res.data;
};

// Nouvelle API : Surcharge manuelle de la priorité
export const setTaskPriority = async (taskId: string, priority: number) => {
  const res = await LocalAPI.put(`${API_BASE}/priority`, { taskId, priority });
  return res.data;
};

// Nouvelle API : Visualisation du cycle de vie d'un workflow (diagramme)
export const getWorkflowVisualization = async (taskId: string) => {
  const res = await LocalAPI.get(`${API_BASE}/visualize/${taskId}`);
  return res.data;
};

// Nouvelle API : Déclencher l'affectation intelligente IA
export const triggerAIAssignment = async () => {
  const res = await LocalAPI.post(`${API_BASE}/auto-assign`);
  return res.data;
};