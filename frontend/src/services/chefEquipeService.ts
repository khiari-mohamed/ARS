import { LocalAPI } from './axios';

export const fetchChefEquipeStats = async () => {
  try {
    const response = await LocalAPI.get('/bordereaux/chef-equipe/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching chef equipe stats:', error);
    return { total: 0, clotures: 0, enCours: 0, nonAffectes: 0 };
  }
};

export const fetchDossierTypes = async () => {
  try {
    const response = await LocalAPI.get('/bordereaux/chef-equipe/types');
    return response.data;
  } catch (error) {
    console.error('Error fetching dossier types:', error);
    return [];
  }
};

export const fetchRecentDossiers = async () => {
  try {
    const response = await LocalAPI.get('/bordereaux/chef-equipe/recent');
    return response.data;
  } catch (error) {
    console.error('Error fetching recent dossiers:', error);
    return [];
  }
};

export const fetchDossiersEnCours = async () => {
  try {
    const response = await LocalAPI.get('/bordereaux/chef-equipe/en-cours');
    return response.data;
  } catch (error) {
    console.error('Error fetching dossiers en cours:', error);
    return [];
  }
};

export const searchDossiers = async (query: string, type: string) => {
  try {
    const response = await LocalAPI.get('/bordereaux/chef-equipe/search', {
      params: { query, type }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching dossiers:', error);
    return [];
  }
};