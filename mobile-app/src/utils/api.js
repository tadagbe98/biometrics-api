/**
 * API Client - React Native (même logique que web)
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://votre-api.render.com/api/v1'; // Remplacer par l'URL de production

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Intercepteur token
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('biometrics_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

export const measurementsAPI = {
  submit: (data) => api.post('/measurements/submit', data),
  getLatest: (type) => api.get(`/measurements/latest/${type}`),
  getHistory: (type, from, to) => api.get(`/measurements/history/${type}`, { params: { from, to } }),
  getSummary: () => api.get('/measurements/summary'),
};

export const estimatesAPI = {
  estimateTemperature: (data) => api.post('/estimate/temperature', data),
  estimateHRV: (hrSamples) => api.post('/estimate/hrv', { hr_samples: hrSamples }),
};

export default api;
