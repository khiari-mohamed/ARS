import axios from 'axios';
import type { AxiosInstance } from 'axios';

export const LocalAPI = axios.create({
  baseURL: process.env.REACT_APP_LOCAL_API_URL,
});

export const ExternalAPI = axios.create({
  baseURL: process.env.REACT_APP_EXTERNAL_API_URL,
});

const setAuthInterceptor = (instance: AxiosInstance) => {
  instance.interceptors.request.use(config => {
    // Use the correct key for the JWT token
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
};

setAuthInterceptor(LocalAPI);
setAuthInterceptor(ExternalAPI);