/**
 * Dashboard BioMetrics - Tableau de bord de visualisation
 * 
 * Le web est uniquement pour VISUALISER les données.
 * Les mesures sont prises via l'app mobile (caméra PPG, thermistor, micro).
 */
import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { useMeasurements, useMeasurementHistory } from '../hooks/useMeasurements';
import { useAuth } from '../contexts/AuthContext';

// ── Constantes médicales de référence ─────────────────────────
const REFERENCES = {
  temperature: { min: 36.0, max: 37.5, unit: '°C', label: 'Normale: 36–37.5°C' },
  hr:          { min: 60,   max: 100,  unit: 'bpm', label: 'Normale: 60–100 bpm' },
  hrv:         { min: 20,   max: 70,   unit: 'ms',  label: 'Bonne: 20–70 ms' },
  respiration: { min: 12,   max: 20,   unit: 'resp/min', label: 'Normale: 12–20 resp/min' },
  steps:       { min: 0,    max: null, unit: 'pas', label: 'Objectif: 10 000 pas/j' },
};

// ── Interprétation des valeurs ─────────────────────────────────
function getStatus(type, value) {
  if (!value && value !== 0) return null;
  const ref = REFERENCES[type];
  if (!ref) return null;

  if (type === 'temperature') {
    if (value < 36)   return { label: 'Hypothermie possible', color: '#3b82f6', icon: '❄️' };
    if (value < 37.5) return { label: 'Normale', color: '#22c55e', icon: '✅' };
    if (value < 38)   return { label: 'Légèrement élevée', color: '#f97316', icon: '⚠️' };
    if (value < 39)   return { label: 'Fièvre légère', color: '#ef4444', icon: '🔥' };
    return             { label: 'Fièvre élevée', color: '#dc2626', icon: '🚨' };
  }
  if (type === 'hr') {
    if (value < 60)  return { label: 'Bradycardie', color: '#3b82f6', icon: '💤' };
    if (value <= 100) return { label: 'Normale', color: '#22c55e', icon: '✅' };
    return            { label: 'Tachycardie', color: '#ef4444', icon: '⚡' };
  }
  if (type === 'hrv') {
    if (value < 20)  return { label: 'HRV faible', color: '#ef4444', icon: '📉' };
    if (value < 40)  return { label: 'Modérée', color: '#f97316', icon: '➡️' };
    if (value <= 70) return { label: 'Bonne', color: '#22c55e', icon: '✅' };
    return            { label: 'Excellente', color: '#7c3aed', icon: '🌟' };
  }
  if (type === 'respiration') {
    if (value < 12)  return { label: 'Bradypnée', color: '#3b82f6', icon: '💤' };
    if (value <= 20) return { label: 'Normale', color: '#22c55e', icon: '✅' };
    if (value <= 30) return { label: 'Légèrement élevée', color: '#f97316', icon: '⚠️' };
    return            { label: 'Tachypnée', color: '#ef4444', icon: '🚨' };
  }
  return null;
}

// ── Carte métrique ─────────────────────────────────────────────
function MetricCard({ type, title, value, unit, icon, color, confidence, timestamp }) {
  const status = getStatus(type, value);
  const timeAgo = timestamp ? formatTimeAgo(new Date(timestamp)) : null;

  return (
    <div className={`metric-card metric-card--${color}`}>
      <div className="metric-card__icon">{icon}</div>
      <div className="metric-card__content">
        <span className="metric-card__title">{title}</span>
        <span className="metric-card__value">
          {value !== undefined && value !== null ? `${value} ${unit}` : '—'}
        </span>
        {status && value !== null && (
          <span className="metric-card__status" style={{ color: status.color }}>
            {status.icon} {status.label}
          </span>
        )}
        {confidence && (
          <span className="metric-card__confidence">
            Fiabilité: {Math.round(confidence * 100)}%
          </span>
        )}
        {timeAgo && (
          <span className="metric-card__time">{timeAgo}</span>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffMin < 1) return 'À l\'instant';
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24) return `Il y a ${diffH}h`;
  return `Il y a ${diffD} jour${diffD > 1 ? 's' : ''}`;
}

// ── Graphique historique ───────────────────────────────────────
function HistoryChart({ type, label, color, unit }) {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { data, loading } = useMeasurementHistory(type, weekAgo, today);
  const ref = REFERENCES[type];

  const chartData = data.slice().reverse().map((m) => ({
    time: new Date(m.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    value: m.value,
  }));

  if (loading) return <div className="chart-loading">Chargement...</div>;
  if (chartData.length === 0) return (
    <div className="chart-empty">
      <span>📊</span>
      <p>Aucune donnée pour <strong>{label}</strong></p>
      <p className="chart-empty-hint">Prenez une mesure depuis l'app mobile</p>
    </div>
  );

  return (
    <div className="history-chart">
      <div className="chart-header">
        <h3>{label}</h3>
        <span className="chart-period">7 derniers jours · {chartData.length} mesure{chartData.length > 1 ? 's' : ''}</span>
      </div>
      {ref?.label && <p className="chart-ref">{ref.label}</p>}
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} unit={unit} />
          <Tooltip
            formatter={(v) => [`${v} ${unit}`, label]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          {ref?.min && <ReferenceLine y={ref.min} stroke={`${color}66`} strokeDasharray="4 4" />}
          {ref?.max && <ReferenceLine y={ref.max} stroke={`${color}66`} strokeDasharray="4 4" />}
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={`${color}18`}
            strokeWidth={2}
            dot={{ r: 3, fill: color }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Bannière "Mesures sur mobile" ──────────────────────────────
function MobileBanner() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div className="mobile-banner">
      <div className="mobile-banner__content">
        <span className="mobile-banner__icon">📱</span>
        <div>
          <strong>Les mesures se font sur l'app mobile</strong>
          <p>
            ❤️ FC & HRV → caméra + flash (PPG) &nbsp;·&nbsp;
            🌡️ Température → thermistor batterie &nbsp;·&nbsp;
            🫁 Respiration → microphone
          </p>
          <p className="mobile-banner__hint">
            Ouvrez l'app BioMetrics sur votre téléphone, prenez vos mesures,
            puis revenez ici pour consulter vos résultats.
          </p>
        </div>
      </div>
      <button className="mobile-banner__close" onClick={() => setVisible(false)}>✕</button>
    </div>
  );
}

// ── Résumé santé global ────────────────────────────────────────
function HealthSummary({ metrics }) {
  const checks = [
    { type: 'temperature', value: metrics.temperature?.value },
    { type: 'hr',          value: metrics.hr?.value },
    { type: 'hrv',         value: metrics.hrv?.value },
    { type: 'respiration', value: metrics.respiration?.value },
  ].filter(c => c.value !== null && c.value !== undefined);

  if (checks.length === 0) return null;

  const alerts = checks.filter(c => {
    const s = getStatus(c.type, c.value);
    return s && !['Normale', 'Bonne', 'Excellente', 'Modérée'].includes(s.label);
  });

  return (
    <div className={`health-summary ${alerts.length === 0 ? 'health-summary--ok' : 'health-summary--alert'}`}>
      {alerts.length === 0 ? (
        <><span>✅</span><span>Toutes vos valeurs sont dans les normes</span></>
      ) : (
        <>
          <span>⚠️</span>
          <span>
            {alerts.length} valeur{alerts.length > 1 ? 's' : ''} hors norme :&nbsp;
            {alerts.map(a => getStatus(a.type, a.value)?.label).join(', ')}
          </span>
        </>
      )}
    </div>
  );
}

// ── Dashboard principal ────────────────────────────────────────
export default function Dashboard() {
  const { user, logout } = useAuth();
  const { summary, loading, refresh } = useMeasurements();
  const [disclaimer, setDisclaimer] = useState(true);

  // Rafraîchissement automatique toutes les 30s
  useEffect(() => {
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const metrics = summary?.summary || {};

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard__header">
        <div className="dashboard__header-left">
          <span className="logo">💗 BioMetrics</span>
          <span className="greeting">Bonjour, {user?.name} 👋</span>
        </div>
        <div className="dashboard__header-right">
          <button className="btn-refresh" onClick={refresh} title="Actualiser">
            🔄
          </button>
          <a href="/dev" style={{fontSize:13,color:"var(--primary)",marginRight:12,textDecoration:"none"}}>⚡ Portail dev</a>
          <button className="btn-logout" onClick={logout}>Déconnexion</button>
        </div>
      </header>

      {/* Disclaimer médical */}
      {disclaimer && (
        <div className="disclaimer-banner">
          ⚠️ <strong>Usage personnel uniquement.</strong> Cet outil n'est pas un dispositif médical.
          Consultez un professionnel de santé pour tout diagnostic.
          <button onClick={() => setDisclaimer(false)}>✕</button>
        </div>
      )}

      <div className="dashboard__content">

        {/* Bannière mobile */}
        <MobileBanner />

        {/* Résumé santé */}
        <HealthSummary metrics={metrics} />

        {/* Métriques */}
        <section className="section">
          <h2 className="section-title">📊 Dernières mesures</h2>
          {loading && <p className="loading-hint">Chargement...</p>}
          <div className="metrics-grid">
            <MetricCard
              type="temperature"
              title="Température"
              value={metrics.temperature?.value}
              unit="°C" icon="🌡️" color="orange"
              confidence={metrics.temperature?.confidence}
              timestamp={metrics.temperature?.timestamp}
            />
            <MetricCard
              type="hr"
              title="Fréquence cardiaque"
              value={metrics.hr?.value}
              unit="bpm" icon="❤️" color="red"
              confidence={metrics.hr?.confidence}
              timestamp={metrics.hr?.timestamp}
            />
            <MetricCard
              type="hrv"
              title="HRV (RMSSD)"
              value={metrics.hrv?.value}
              unit="ms" icon="💓" color="purple"
              timestamp={metrics.hrv?.timestamp}
            />
            <MetricCard
              type="respiration"
              title="Respiration"
              value={metrics.respiration?.value}
              unit="resp/min" icon="🫁" color="blue"
              confidence={metrics.respiration?.confidence}
              timestamp={metrics.respiration?.timestamp}
            />
            <MetricCard
              type="steps"
              title="Pas aujourd'hui"
              value={metrics.steps?.value}
              unit="pas" icon="🚶" color="green"
              timestamp={metrics.steps?.timestamp}
            />
            <MetricCard
              type="activity"
              title="Activité"
              value={metrics.activity?.value}
              unit="kcal" icon="🏃" color="teal"
              timestamp={metrics.activity?.timestamp}
            />
          </div>
        </section>

        {/* Graphiques */}
        <section className="section">
          <h2 className="section-title">📈 Historique — 7 jours</h2>
          <div className="charts-grid">
            <HistoryChart type="temperature" label="Température" color="#f97316" unit="°C" />
            <HistoryChart type="hr"          label="Fréquence cardiaque" color="#ef4444" unit="bpm" />
            <HistoryChart type="hrv"         label="HRV (RMSSD)" color="#a855f7" unit="ms" />
            <HistoryChart type="respiration" label="Respiration" color="#3b82f6" unit="r/min" />
          </div>
        </section>

        {/* Légende capteurs */}
        <section className="sensors-legend">
          <h3>🔬 Capteurs utilisés par l'app mobile</h3>
          <div className="sensors-grid">
            <div className="sensor-item">
              <span className="sensor-icon">❤️</span>
              <div>
                <strong>FC & HRV</strong>
                <p>Caméra + Flash (PPG)<br/>Doigt sur l'objectif · 30s</p>
              </div>
            </div>
            <div className="sensor-item">
              <span className="sensor-icon">🌡️</span>
              <div>
                <strong>Température</strong>
                <p>Thermistor NTC batterie<br/>Contact cutané · 30–120s</p>
              </div>
            </div>
            <div className="sensor-item">
              <span className="sensor-icon">🫁</span>
              <div>
                <strong>Respiration</strong>
                <p>Microphone (RMS)<br/>Souffle capté · 45s</p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
