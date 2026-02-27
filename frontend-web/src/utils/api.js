/**
 * Configuration Axios - BioMetrics API Client
 */
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur : ajouter le token JWT automatiquement
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('biometrics_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur : gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('biometrics_token');
      localStorage.removeItem('biometrics_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ---- Auth ----
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  deleteAccount: () => api.delete('/auth/me'),
};

// ---- Measurements ----
export const measurementsAPI = {
  submit: (data) => api.post('/measurements/submit', data),
  getLatest: (type) => api.get(`/measurements/latest/${type}`),
  getHistory: (type, from, to) => api.get(`/measurements/history/${type}`, {
    params: { from, to }
  }),
  getSummary: () => api.get('/measurements/summary'),
  delete: (id) => api.delete(`/measurements/${id}`),
};

// ---- Estimates ----
export const estimatesAPI = {
  estimateTemperature: (data) => api.post('/estimate/temperature', data),
  estimateHRV: (hrSamples) => api.post('/estimate/hrv', { hr_samples: hrSamples }),
};

// ---- Sharing ----
export const sharingAPI = {
  createLink: (hours) => api.post('/users/share', { duration_hours: hours }),
  getShared: (token) => api.get(`/users/shared/${token}`),
  revoke: (token) => api.delete(`/users/share/${token}`),
};

export default api;
