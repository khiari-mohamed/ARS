// src/utils/getSocketUrl.ts
export function getSocketUrl() {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  // Remove trailing /api if present
  return apiUrl.replace(/\/api$/, '');
}