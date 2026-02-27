/**
 * HeartRateScreen - Mesure FC via caméra (PPG)
 * L'utilisateur couvre l'objectif avec son doigt pour mesurer le pouls
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Alert
} from 'react-native';
import { measurementsAPI, estimatesAPI } from '../utils/api';

// En production: utiliser expo-camera avec analyse des pixels rouges
// import { Camera } from 'expo-camera';

const SAMPLE_DURATION = 30; // secondes

// Simulation de la détection PPG (en vrai: analyse des frames caméra)
const simulatePPGReading = () => {
  const baseHR = 65 + Math.floor(Math.random() * 30);
  const samples = Array.from({ length: 10 }, () =>
    baseHR + (Math.random() - 0.5) * 10
  ).map(Math.round);
  return samples;
};

export default function HeartRateScreen() {
  const [phase, setPhase] = useState('idle'); // idle, instructions, measuring, result
  const [countdown, setCountdown] = useState(SAMPLE_DURATION);
  const [result, setResult] = useState(null);
  const [samples, setSamples] = useState([]);
  const beatAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef(null);

  const heartBeat = () => {
    Animated.sequence([
      Animated.timing(beatAnim, { toValue: 1.3, duration: 200, useNativeDriver: true }),
      Animated.timing(beatAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  const startMeasurement = () => {
    setPhase('measuring');
    setCountdown(SAMPLE_DURATION);
    setSamples([]);

    let count = SAMPLE_DURATION;
    intervalRef.current = setInterval(() => {
      count--;
      setCountdown(count);

      // Simuler l'ajout d'un échantillon chaque 3 secondes
      if (count % 3 === 0) {
        const newSample = 70 + Math.floor(Math.random() * 20);
        setSamples(prev => [...prev, newSample]);
        heartBeat();
      }

      if (count <= 0) {
        clearInterval(intervalRef.current);
        finalizeMeasurement();
      }
    }, 1000);
  };

  const finalizeMeasurement = async () => {
    setPhase('processing');
    const hrSamples = simulatePPGReading();

    try {
      const hrv = await estimatesAPI.estimateHRV(hrSamples);
      const { mean_hr, hrv_rmssd, interpretation } = hrv.data;

      // Sauvegarder FC et HRV
      await measurementsAPI.submit({
        type: 'hr',
        value: mean_hr,
        timestamp: new Date().toISOString(),
      });
      await measurementsAPI.submit({
        type: 'hrv',
        value: hrv_rmssd,
        timestamp: new Date().toISOString(),
      });

      setResult({ mean_hr, hrv_rmssd, interpretation });
      setPhase('result');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de calculer le résultat.');
      setPhase('idle');
    }
  };

  const reset = () => {
    clearInterval(intervalRef.current);
    setPhase('idle');
    setResult(null);
    setSamples([]);
    setCountdown(SAMPLE_DURATION);
  };

  const getHRColor = (hr) => {
    if (!hr) return '#64748b';
    if (hr < 60) return '#3b82f6';
    if (hr <= 100) return '#22c55e';
    return '#ef4444';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>❤️ Fréquence Cardiaque</Text>
        <Text style={styles.headerSub}>Mesure via caméra (PPG)</Text>
      </View>

      {/* IDLE */}
      {phase === 'idle' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Comment ça fonctionne</Text>
          <Text style={styles.infoText}>
            La technique PPG (photopléthysmographie) utilise la caméra de votre
            téléphone pour détecter les variations de flux sanguin dans votre doigt
            via les changements de lumière captés.
          </Text>
          <View style={styles.stepRow}>
            <Text style={styles.stepIcon}>💡</Text>
            <Text style={styles.stepText}>Le flash doit être activé</Text>
          </View>
          <View style={styles.stepRow}>
            <Text style={styles.stepIcon}>☝️</Text>
            <Text style={styles.stepText}>Couvrez l'objectif avec votre index</Text>
          </View>
          <View style={styles.stepRow}>
            <Text style={styles.stepIcon}>⏱️</Text>
            <Text style={styles.stepText}>Restez immobile pendant 30 secondes</Text>
          </View>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => setPhase('instructions')}>
            <Text style={styles.btnPrimaryText}>Commencer →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* INSTRUCTIONS */}
      {phase === 'instructions' && (
        <View style={[styles.card, styles.cardCenter]}>
          <Text style={styles.bigIcon}>☝️</Text>
          <Text style={styles.instructionTitle}>Positionnez votre doigt</Text>
          <Text style={styles.instructionText}>
            Posez délicatement votre index sur l'objectif de la caméra (pas trop fort).{'\n\n'}
            Appuyez sur "Démarrer" quand vous êtes prêt(e).
          </Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={startMeasurement}>
            <Text style={styles.btnPrimaryText}>🔴 Démarrer la mesure</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setPhase('idle')}>
            <Text style={styles.btnSecondaryText}>← Retour</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MEASURING */}
      {phase === 'measuring' && (
        <View style={[styles.card, styles.cardCenter]}>
          <Animated.Text style={[styles.heartIcon, { transform: [{ scale: beatAnim }] }]}>
            ❤️
          </Animated.Text>
          <Text style={styles.countdown}>{countdown}s</Text>
          <Text style={styles.scanningText}>Mesure en cours...</Text>
          <Text style={styles.scanningHint}>
            Gardez votre doigt sur l'objectif.{'\n'}
            Essayez de ne pas bouger.
          </Text>

          {/* Visualisation des samples en temps réel */}
          <View style={styles.samplesRow}>
            {samples.slice(-5).map((s, i) => (
              <View key={i} style={styles.sampleBadge}>
                <Text style={styles.sampleText}>{s}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.btnDanger} onPress={reset}>
            <Text style={styles.btnDangerText}>✕ Annuler</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* PROCESSING */}
      {phase === 'processing' && (
        <View style={[styles.card, styles.cardCenter]}>
          <Text style={styles.bigIcon}>⏳</Text>
          <Text style={styles.instructionTitle}>Analyse en cours...</Text>
        </View>
      )}

      {/* RESULT */}
      {phase === 'result' && result && (
        <View style={styles.card}>
          <View style={styles.resultRow}>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Fréquence cardiaque</Text>
              <Text style={[styles.resultValue, { color: getHRColor(result.mean_hr) }]}>
                {result.mean_hr}
              </Text>
              <Text style={styles.resultUnit}>bpm</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>HRV (RMSSD)</Text>
              <Text style={[styles.resultValue, { color: '#7c3aed' }]}>
                {result.hrv_rmssd}
              </Text>
              <Text style={styles.resultUnit}>ms</Text>
            </View>
          </View>
          <View style={styles.interpretationBox}>
            <Text style={styles.interpretationText}>{result.interpretation}</Text>
          </View>
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              ⚠️ Usage bien-être uniquement. Non médical.
            </Text>
          </View>
          <TouchableOpacity style={styles.btnPrimary} onPress={reset}>
            <Text style={styles.btnPrimaryText}>🔄 Nouvelle mesure</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#ef4444', padding: 24, paddingTop: 48, alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: 'white' },
  headerSub: { fontSize: 13, color: '#fecaca', marginTop: 4 },
  card: {
    margin: 16, backgroundColor: 'white', borderRadius: 16, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, elevation: 3,
  },
  cardCenter: { alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  infoText: { fontSize: 14, color: '#64748b', lineHeight: 20, marginBottom: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  stepIcon: { fontSize: 24, marginRight: 12 },
  stepText: { fontSize: 14, color: '#334155' },
  bigIcon: { fontSize: 60, marginVertical: 16 },
  heartIcon: { fontSize: 60 },
  instructionTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', textAlign: 'center', marginBottom: 12 },
  instructionText: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  countdown: { fontSize: 48, fontWeight: '800', color: '#ef4444', marginTop: 12 },
  scanningText: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginTop: 8 },
  scanningHint: { fontSize: 13, color: '#64748b', textAlign: 'center', marginVertical: 8 },
  samplesRow: { flexDirection: 'row', gap: 8, marginVertical: 16 },
  sampleBadge: {
    backgroundColor: '#fef2f2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  sampleText: { color: '#ef4444', fontWeight: '600', fontSize: 14 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  resultItem: { alignItems: 'center' },
  resultLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  resultValue: { fontSize: 48, fontWeight: '800' },
  resultUnit: { fontSize: 14, color: '#64748b' },
  interpretationBox: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 16 },
  interpretationText: { fontSize: 14, color: '#334155', textAlign: 'center' },
  disclaimer: { backgroundColor: '#fffbeb', borderRadius: 10, padding: 12, marginBottom: 20 },
  disclaimerText: { fontSize: 12, color: '#92400e', textAlign: 'center' },
  btnPrimary: {
    backgroundColor: '#ef4444', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8,
  },
  btnPrimaryText: { color: 'white', fontWeight: '700', fontSize: 16 },
  btnSecondary: {
    borderWidth: 1.5, borderColor: '#ef4444', borderRadius: 12,
    padding: 14, alignItems: 'center', marginTop: 8,
  },
  btnSecondaryText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
  btnDanger: {
    backgroundColor: '#fef2f2', borderRadius: 12, padding: 14,
    alignItems: 'center', marginTop: 8,
  },
  btnDangerText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
});
