import axios from 'axios';
import type { AxiosInstance } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
});

const setAuthInterceptor = (instance: AxiosInstance) => {
  instance.interceptors.request.use(config => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
};

setAuthInterceptor(api);

// For backward compatibility with existing imports
export const LocalAPI = api;
export const ExternalAPI = api;