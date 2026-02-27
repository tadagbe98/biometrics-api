/**
 * Custom Hooks - Récupération des données de mesures
 */
import { useState, useEffect, useCallback } from 'react';
import { measurementsAPI, estimatesAPI } from '../utils/api';

/**
 * Hook pour récupérer les dernières mesures
 */
export function useMeasurements() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await measurementsAPI.getSummary();
      setSummary(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { summary, loading, error, refresh };
}

/**
 * Hook pour l'historique d'un type de mesure
 */
export function useMeasurementHistory(type, from, to) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!type) return;
    
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await measurementsAPI.getHistory(type, from, to);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Erreur");
      } finally {
        setLoading(false);
      }
    };
    
    fetch();
  }, [type, from, to]);

  return { data, loading, error };
}

/**
 * Hook pour soumettre une mesure
 */
export function useSubmitMeasurement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const submit = async (type, value, rawData = null) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await measurementsAPI.submit({
        type,
        value,
        raw_data: rawData,
        timestamp: new Date().toISOString()
      });
      setSuccess(true);
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'envoi");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { submit, loading, error, success };
}
