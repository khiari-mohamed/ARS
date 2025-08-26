import axios from 'axios';

export const LocalAPI = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
});

export const ExternalAPI = axios.create({
  baseURL: process.env.REACT_APP_EXTERNAL_API_URL || 'http://localhost:3002',
  timeout: 10000,
});

export const AIAPI = axios.create({
  baseURL: process.env.REACT_APP_AI_MICROSERVICE_URL || 'http://localhost:8002',
  timeout: 30000,
});

// Add request interceptor for AI API auth
AIAPI.interceptors.request.use(async (config) => {
  // Skip auth for token endpoint
  if (config.url?.includes('/token')) {
    return config;
  }
  
  let aiToken: string | null = localStorage.getItem('ai_token');
  if (!aiToken) {
    // Get token if not available
    const formData = new URLSearchParams();
    formData.append('username', 'admin');
    formData.append('password', 'secret');
    
    try {
      const tokenResponse = await axios.post(`${process.env.REACT_APP_AI_MICROSERVICE_URL || 'http://localhost:8002'}/token`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      if (tokenResponse.data?.access_token) {
        aiToken = tokenResponse.data.access_token as string;
        localStorage.setItem('ai_token', aiToken);
      }
    } catch (error) {
      console.error('Failed to get AI token in interceptor:', error);
    }
  }
  
  if (aiToken) {
    config.headers.Authorization = `Bearer ${aiToken}`;
  }
  
  return config;
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