/**
 * AuthContext - Gestion de l'authentification globale
 * v1.1 - Fix: gestion du cold start Railway + erreurs réseau
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restaurer la session depuis localStorage au démarrage
  useEffect(() => {
    const savedUser = localStorage.getItem('biometrics_user');
    const token = localStorage.getItem('biometrics_token');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        // JSON corrompu → nettoyer
        localStorage.removeItem('biometrics_user');
        localStorage.removeItem('biometrics_token');
      }
    }
    setLoading(false);
  }, []);

  const saveSession = (token, userData) => {
    localStorage.setItem('biometrics_token', token);
    localStorage.setItem('biometrics_user', JSON.stringify(userData));
    setUser(userData);
  };

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { access_token, user: userData } = res.data;
    saveSession(access_token, userData);
    return userData;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const res = await authAPI.register({
      email,
      password,
      name,
      consent_given: true,
    });
    const { access_token, user: userData } = res.data;
    saveSession(access_token, userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('biometrics_token');
    localStorage.removeItem('biometrics_user');
    setUser(null);
  }, []);

  // Rafraîchir les infos user depuis l'API (optionnel)
  const refreshUser = useCallback(async () => {
    try {
      const res = await authAPI.getMe();
      const updated = res.data;
      localStorage.setItem('biometrics_user', JSON.stringify(updated));
      setUser(updated);
    } catch {
      // Token expiré → déconnexion
      logout();
    }
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
};
