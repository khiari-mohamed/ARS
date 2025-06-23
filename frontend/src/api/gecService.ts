import { LocalAPI } from '../services/axios';
import { Courrier, CourrierCreatePayload, CourrierSearchParams } from '../types/mail';

export async function createCourrier(payload: CourrierCreatePayload | FormData): Promise<Courrier> {
  let res;
  if (payload instanceof FormData) {
    res = await LocalAPI.post('/courriers', payload);
  } else {
    res = await LocalAPI.post('/courriers', payload);
  }
  return res.data;
}

export async function sendCourrier(id: string, payload: { recipientEmail?: string; message?: string }): Promise<Courrier> {
  const res = await LocalAPI.post(`/courriers/${id}/send`, payload);
  return res.data;
}

export async function searchCourriers(params: CourrierSearchParams): Promise<Courrier[]> {
  const res = await LocalAPI.get('/courriers/search', { params });
  return res.data;
}

// --- Template Endpoints ---
export async function getTemplates() {
const res = await LocalAPI.get('/courriers/templates');
return res.data;
}

export async function getTemplate(id: string) {
const res = await LocalAPI.get(`/courriers/templates/${id}`);
return res.data;
}

export async function createTemplate(tpl: { name: string; subject: string; body: string; variables: string[] }) {
const res = await LocalAPI.post('/courriers/templates', tpl);
return res.data;
}

export async function updateTemplate(id: string, tpl: Partial<{ name: string; subject: string; body: string; variables: string[] }>) {
const res = await LocalAPI.patch(`/courriers/templates/${id}`, tpl);
return res.data;
}

export async function deleteTemplate(id: string) {
const res = await LocalAPI.delete(`/courriers/templates/${id}`);
return res.data;
}

export async function renderTemplate(id: string, variables: Record<string, string>) {
const res = await LocalAPI.post(`/courriers/templates/${id}/render`, variables);
return res.data;
}

// --- Courrier Audit Log ---
export async function getCourrierAuditLog(id: string) {
const res = await LocalAPI.get(`/courriers/${id}/audit`);
return res.data;
}

// --- Courrier Status Update ---
export async function updateCourrierStatus(id: string, payload: { status: string }) {
const res = await LocalAPI.patch(`/courriers/${id}/status`, payload);
return res.data;
}

// --- Courrier Delete ---
export async function deleteCourrier(id: string) {
const res = await LocalAPI.delete(`/courriers/${id}`);
return res.data;
}

// --- Analytics Endpoints ---
export async function getCourrierVolume() {
const res = await LocalAPI.get('/analytics/courriers/volume');
return res.data;
}

export async function getCourrierSlaBreaches() {
const res = await LocalAPI.get('/analytics/courriers/sla-breaches');
return res.data;
}

export async function getCourrierRecurrence() {
const res = await LocalAPI.get('/analytics/courriers/recurrence');
return res.data;
}

export async function getCourrierEscalations() {
const res = await LocalAPI.get('/analytics/courriers/escalations');
return res.data;
}