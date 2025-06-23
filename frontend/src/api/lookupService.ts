import { LocalAPI } from '../services/axios';

// Returns [{id, fullName, ...}]
export const getTeams = async () => {
  const { data } = await LocalAPI.get('/users', { params: { role: 'CHEF_EQUIPE' } });
  return data;
};

// Returns [{id, name, ...}]
export const getClients = async () => {
  const { data } = await LocalAPI.get('/clients');
  return data;
};

// Returns [{id, fullName, email, ...}]
export const getUsers = async () => {
  const { data } = await LocalAPI.get('/users');
  return data;
};