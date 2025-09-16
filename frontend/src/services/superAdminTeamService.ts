import { LocalAPI } from './axios';

export const fetchTeamWorkload = async () => {
  const { data } = await LocalAPI.get('/super-admin/team-workload');
  return data;
};

export const fetchSuperAdminAlerts = async () => {
  const { data } = await LocalAPI.get('/super-admin/alerts');
  return data;
};

export const acknowledgeAlert = async (alertId: string) => {
  const { data } = await LocalAPI.post(`/super-admin/alerts/${alertId}/acknowledge`);
  return data;
};