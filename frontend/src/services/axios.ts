import axios from 'axios';

export const LocalAPI = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  timeout: 10000,
});

export const ExternalAPI = axios.create({
  baseURL: process.env.REACT_APP_EXTERNAL_API_URL || 'http://localhost:3002',
  timeout: 10000,
});

// Add request interceptor for auth
LocalAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for error handling
LocalAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);