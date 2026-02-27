/**
 * Page Login/Register - BioMetrics
 */
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function AuthPage({ onSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isLogin && !consent) {
      setError("Vous devez accepter les conditions d'utilisation");
      return;
    }
    
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">
          <span>💗</span>
          <h1>BioMetrics</h1>
          <p>Suivi personnel de bien-être</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(true)}
          >
            Connexion
          </button>
          <button
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(false)}
          >
            Créer un compte
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label>Nom complet</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Landry TADAGBE"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 caractères"
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group form-group--checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                J'accepte que mes données soient traitées à des fins de bien-être personnel.
                <strong> Usage non médical.</strong> Je peux demander leur suppression à tout moment.
              </label>
            </div>
          )}

          {error && <div className="form-error">❌ {error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '⏳ Chargement...' : isLogin ? '🔐 Se connecter' : '🚀 Créer mon compte'}
          </button>
        </form>

        <div className="auth-disclaimer">
          ⚠️ Cet outil est exclusivement à usage personnel et de bien-être.
          Il ne constitue pas un dispositif médical certifié.
        </div>
      </div>
    </div>
  );
}
