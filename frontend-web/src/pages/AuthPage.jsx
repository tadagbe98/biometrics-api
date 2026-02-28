/**
 * Page Login/Register - BioMetrics
 * v1.1 - Fix: gestion d'erreurs améliorée, messages clairs
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Traduction des erreurs API en messages lisibles
function parseError(err) {
  const status = err?.response?.status;
  const detail = err?.response?.data?.detail;

  if (!err?.response) {
    return "Impossible de joindre le serveur. Vérifiez votre connexion internet.";
  }
  if (status === 400) {
    if (typeof detail === 'string' && detail.includes('déjà utilisé')) {
      return "Cette adresse email est déjà utilisée. Essayez de vous connecter.";
    }
    if (typeof detail === 'string') return detail;
    return "Données invalides. Vérifiez le formulaire.";
  }
  if (status === 401) return "Email ou mot de passe incorrect.";
  if (status === 422) return "Formulaire incomplet. Vérifiez tous les champs.";
  if (status === 429) return "Trop de tentatives. Attendez 1 minute puis réessayez.";
  if (status >= 500) return "Erreur serveur. L'API est peut-être en train de démarrer (30s).";
  return detail || "Une erreur inattendue s'est produite.";
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (mode) => {
    setIsLogin(mode === 'login');
    setError('');
  };

  const validate = () => {
    if (!email.includes('@') || !email.includes('.')) {
      return "Adresse email invalide.";
    }
    if (password.length < 8) {
      return "Le mot de passe doit contenir au moins 8 caractères.";
    }
    if (!isLogin && !name.trim()) {
      return "Votre nom est requis.";
    }
    if (!isLogin && !consent) {
      return "Vous devez accepter les conditions d'utilisation pour vous inscrire.";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email.trim(), password, name.trim());
      }
      navigate('/dashboard');
    } catch (err) {
      setError(parseError(err));
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
            type="button"
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Connexion
          </button>
          <button
            type="button"
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Créer un compte
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Nom complet</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Landry TADAGBE"
                autoComplete="name"
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              autoComplete={isLogin ? 'username' : 'email'}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 caractères"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              disabled={loading}
            />
          </div>

          {!isLogin && (
            <div className="form-group form-group--checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  disabled={loading}
                />
                J'accepte que mes données soient traitées à des fins de bien-être personnel.
                <strong> Usage non médical.</strong> Je peux demander leur suppression à tout moment.
              </label>
            </div>
          )}

          {error && (
            <div className="form-error" role="alert">
              ❌ {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading
              ? '⏳ Chargement...'
              : isLogin
              ? '🔐 Se connecter'
              : '🚀 Créer mon compte'}
          </button>
        </form>

        {/* Message si l'API est froide (Railway cold start) */}
        {loading && (
          <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
            Premier démarrage : jusqu'à 30 secondes possible…
          </p>
        )}

        <div className="auth-disclaimer">
          ⚠️ Cet outil est exclusivement à usage personnel et de bien-être.
          Il ne constitue pas un dispositif médical certifié.
        </div>
      </div>
    </div>
  );
}
