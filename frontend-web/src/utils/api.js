/**
 * Configuration Axios - BioMetrics API Client
 * v1.1 - Fix: URL Railway + intercepteur 401 sécurisé
 */
import axios from 'axios';

// ----------------------------------------------------------------
// FIX 1 : L'URL de l'API doit pointer sur Railway, pas localhost.
// Sur Vercel, définir la variable d'environnement :
//   REACT_APP_API_URL = https://biometrics-api-production.up.railway.app/api/v1
// Sans cette variable, le build Vercel appelle localhost et échoue.
// ----------------------------------------------------------------
const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  'https://biometrics-api-production.up.railway.app/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000, // 15s timeout (Railway peut être lent au cold start)
  withCredentials: false, // false = compatible avec tous les CORS
});

// Intercepteur requête : injecter le JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('biometrics_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ----------------------------------------------------------------
// FIX 2 : L'ancien intercepteur 401 redirigeait vers /login
// même pendant l'inscription (register retourne 201, mais si
// le token est invalide lors d'un autre appel, ça bloquait).
// Solution : Ne rediriger QUE si l'utilisateur est déjà connecté
// et reçoit un 401 sur une route protégée (pas sur /auth/*).
// ----------------------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRoute = error.config?.url?.includes('/auth/');
    const isLoggedIn = !!localStorage.getItem('biometrics_token');

    if (error.response?.status === 401 && !isAuthRoute && isLoggedIn) {
      // Session expirée → déconnexion propre
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
  login:    (data) => api.post('/auth/login', data),
  getMe:    ()     => api.get('/auth/me'),
  deleteAccount: () => api.delete('/auth/me'),
};

// ---- Measurements ----
export const measurementsAPI = {
  submit:     (data)           => api.post('/measurements/submit', data),
  getLatest:  (type)           => api.get(`/measurements/latest/${type}`),
  getHistory: (type, from, to) => api.get(`/measurements/history/${type}`, { params: { from, to } }),
  getSummary: ()               => api.get('/measurements/summary'),
  delete:     (id)             => api.delete(`/measurements/${id}`),
};

// ---- Estimates ----
export const estimatesAPI = {
  estimateTemperature: (data)      => api.post('/estimate/temperature', data),
  estimateHRV:         (hrSamples) => api.post('/estimate/hrv', { hr_samples: hrSamples }),
};

// ---- Sharing ----
export const sharingAPI = {
  createLink: (hours) => api.post('/users/share', { duration_hours: hours }),
  getShared:  (token) => api.get(`/users/shared/${token}`),
  revoke:     (token) => api.delete(`/users/share/${token}`),
};

export default api;
