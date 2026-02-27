/**
 * AuthContext - Gestion de l'authentification globale
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restaurer la session depuis localStorage
    const savedUser = localStorage.getItem('biometrics_user');
    const token = localStorage.getItem('biometrics_token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('biometrics_token', access_token);
    localStorage.setItem('biometrics_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (email, password, name) => {
    const res = await authAPI.register({ email, password, name, consent_given: true });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('biometrics_token', access_token);
    localStorage.setItem('biometrics_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('biometrics_token');
    localStorage.removeItem('biometrics_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
};
