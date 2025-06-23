import { LocalAPI, ExternalAPI } from './axios';

// Local backend endpoints
export const getKPIs = (filters: any) => 
  LocalAPI.get('/dashboard/kpis', { params: filters }).then(res => res.data);

export const getPerformance = (filters: any) => 
  LocalAPI.get('/dashboard/performance', { params: filters }).then(res => res.data);

export const getSLAStatus = (filters: any) => 
  LocalAPI.get('/dashboard/sla-status', { params: filters }).then(res => res.data);

export const getAlerts = (filters: any) => 
  LocalAPI.get('/dashboard/alerts', { params: filters }).then(res => res.data);

export const getCharts = (filters: any) => 
  LocalAPI.get('/dashboard/charts', { params: filters }).then(res => res.data);

// External API endpoints (adjust paths as needed based on external API docs)
export const getExternalKPIs = () => 
  ExternalAPI.get('/api/dashboard/kpis').then(res => res.data.content || res.data);

export const getExternalPerformance = () => 
  ExternalAPI.get('/api/dashboard/performance').then(res => res.data.content || res.data);

export const getExternalSLAStatus = () => 
  ExternalAPI.get('/api/dashboard/sla-status').then(res => res.data.content || res.data);

export const getExternalAlerts = () => 
  ExternalAPI.get('/api/dashboard/alerts').then(res => res.data.content || res.data);

export const getExternalCharts = () => 
  ExternalAPI.get('/api/dashboard/charts').then(res => res.data.content || res.data);

// New: Fetch departments for filtering
export const getDepartments = () => 
  LocalAPI.get('/dashboard/departments').then(res => res.data);
