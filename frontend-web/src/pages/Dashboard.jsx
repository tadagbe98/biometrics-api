/**
 * Dashboard Principal - BioMetrics
 * Affiche les mesures en temps réel avec graphiques
 */
import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { useMeasurements, useMeasurementHistory, useSubmitMeasurement } from '../hooks/useMeasurements';
import { useAuth } from '../contexts/AuthContext';
import { estimatesAPI } from '../utils/api';

// ---- Cartes de métriques ----
function MetricCard({ title, value, unit, icon, color, confidence, interpretation }) {
  return (
    <div className={`metric-card metric-card--${color}`}>
      <div className="metric-card__icon">{icon}</div>
      <div className="metric-card__content">
        <span className="metric-card__title">{title}</span>
        <span className="metric-card__value">
          {value !== undefined ? `${value} ${unit}` : '—'}
        </span>
        {confidence && (
          <span className="metric-card__confidence">
            Fiabilité: {Math.round(confidence * 100)}%
          </span>
        )}
        {interpretation && (
          <span className="metric-card__interpretation">{interpretation}</span>
        )}
      </div>
    </div>
  );
}

// ---- Formulaire de saisie manuelle ----
function ManualInput({ onSuccess }) {
  const [type, setType] = useState('temperature');
  const [value, setValue] = useState('');
  const { submit, loading, error, success } = useSubmitMeasurement();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await submit(type, parseFloat(value));
    if (ok) {
      setValue('');
      onSuccess?.();
    }
  };

  return (
    <form className="manual-input" onSubmit={handleSubmit}>
      <h3>📝 Saisie manuelle</h3>
      <div className="manual-input__row">
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="temperature">🌡️ Température (°C)</option>
          <option value="hr">❤️ Fréquence cardiaque (bpm)</option>
          <option value="steps">🚶 Pas</option>
          <option value="hrv">💓 HRV (ms)</option>
          <option value="respiration">🫁 Respiration (resp/min)</option>
        </select>
        <input
          type="number"
          step="0.1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Valeur"
          required
        />
        <button type="submit" disabled={loading || !value}>
          {loading ? '⏳' : '➕ Ajouter'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">✅ Mesure enregistrée !</p>}
    </form>
  );
}

// ---- Graphique d'historique ----
function HistoryChart({ type, label, color, unit }) {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { data, loading } = useMeasurementHistory(type, weekAgo, today);

  const chartData = data
    .slice()
    .reverse()
    .map((m) => ({
      time: new Date(m.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      value: m.value,
    }));

  if (loading) return <div className="chart-loading">Chargement...</div>;
  if (chartData.length === 0) return (
    <div className="chart-empty">
      <span>📊 Aucune donnée pour {label}</span>
    </div>
  );

  return (
    <div className="history-chart">
      <h3>{label} - 7 derniers jours</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit={unit} />
          <Tooltip formatter={(v) => [`${v} ${unit}`, label]} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={`${color}22`}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- Dashboard principal ----
export default function Dashboard() {
  const { user, logout } = useAuth();
  const { summary, loading, refresh } = useMeasurements();
  const [disclaimer, setDisclaimer] = useState(true);

  const metrics = summary?.summary || {};

  const getInterpretation = (type, value) => {
    if (!value) return null;
    if (type === 'temperature') {
      if (value < 36) return '❄️ Hypothermie possible';
      if (value < 37.5) return '✅ Normale';
      if (value < 38) return '⚠️ Légèrement élevée';
      if (value < 39) return '🔥 Fièvre légère';
      return '🚨 Fièvre élevée';
    }
    if (type === 'hr') {
      if (value < 60) return '💤 Bradycardie';
      if (value <= 100) return '✅ Normal';
      return '⚡ Tachycardie';
    }
    return null;
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard__header">
        <div className="dashboard__header-left">
          <span className="logo">💗 BioMetrics</span>
          <span className="greeting">Bonjour, {user?.name} 👋</span>
        </div>
        <button className="btn-logout" onClick={logout}>Déconnexion</button>
      </header>

      {/* Disclaimer */}
      {disclaimer && (
        <div className="disclaimer-banner">
          ⚠️ <strong>Usage personnel uniquement.</strong> Cet outil n'est pas un dispositif médical.
          Consultez un professionnel de santé pour tout diagnostic.
          <button onClick={() => setDisclaimer(false)}>✕</button>
        </div>
      )}

      <div className="dashboard__content">
        {/* Métriques */}
        <section className="metrics-grid">
          <MetricCard
            title="Température"
            value={metrics.temperature?.value}
            unit="°C"
            icon="🌡️"
            color="orange"
            confidence={metrics.temperature?.confidence}
            interpretation={getInterpretation('temperature', metrics.temperature?.value)}
          />
          <MetricCard
            title="Fréquence cardiaque"
            value={metrics.hr?.value}
            unit="bpm"
            icon="❤️"
            color="red"
            interpretation={getInterpretation('hr', metrics.hr?.value)}
          />
          <MetricCard
            title="Pas aujourd'hui"
            value={metrics.steps?.value}
            unit="pas"
            icon="🚶"
            color="green"
          />
          <MetricCard
            title="HRV"
            value={metrics.hrv?.value}
            unit="ms"
            icon="💓"
            color="purple"
          />
          <MetricCard
            title="Respiration"
            value={metrics.respiration?.value}
            unit="resp/min"
            icon="🫁"
            color="blue"
          />
          <MetricCard
            title="Activité"
            value={metrics.activity?.value}
            unit="kcal"
            icon="🏃"
            color="teal"
          />
        </section>

        {/* Saisie manuelle */}
        <section>
          <ManualInput onSuccess={refresh} />
        </section>

        {/* Graphiques */}
        <section className="charts-grid">
          <HistoryChart type="temperature" label="Température" color="#f97316" unit="°C" />
          <HistoryChart type="hr" label="Fréquence cardiaque" color="#ef4444" unit="bpm" />
          <HistoryChart type="steps" label="Pas quotidiens" color="#22c55e" unit="pas" />
          <HistoryChart type="hrv" label="HRV" color="#a855f7" unit="ms" />
        </section>
      </div>
    </div>
  );
}
