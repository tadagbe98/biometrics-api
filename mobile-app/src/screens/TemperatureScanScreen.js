/**
 * TemperatureScanScreen - Mesure de température via batterie
 * L'utilisateur pose l'écran sur son front pour estimer la température
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Alert, ScrollView
} from 'react-native';
import { estimatesAPI, measurementsAPI } from '../utils/api';

// Simulation du capteur batterie (en vrai: react-native-device-info)
// import DeviceInfo from 'react-native-device-info';
const getBatteryTemp = () => Promise.resolve(35 + Math.random() * 3); // Simulation
const getAmbientTemp = () => Promise.resolve(24 + Math.random() * 4); // Simulation

const STEPS = [
  { id: 1, icon: '🧼', text: 'Lavez-vous les mains', duration: 0 },
  { id: 2, icon: '📱', text: 'Nettoyez l\'écran du téléphone', duration: 0 },
  { id: 3, icon: '🤳', text: 'Posez l\'écran sur votre front', duration: 90 },
  { id: 4, icon: '🔄', text: 'Ne bougez pas pendant 90 secondes', duration: 0 },
];

export default function TemperatureScanScreen() {
  const [step, setStep] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [countdown, setCountdown] = useState(90);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef(null);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  };

  const startScan = async () => {
    setStep(2);
    setScanning(true);
    setCountdown(90);
    startPulse();

    let count = 90;
    intervalRef.current = setInterval(async () => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(intervalRef.current);
        await performEstimation();
      }
    }, 1000);
  };

  const performEstimation = async () => {
    setScanning(false);
    setLoading(true);

    try {
      const batteryTemp = await getBatteryTemp();
      const ambientTemp = await getAmbientTemp();

      const res = await estimatesAPI.estimateTemperature({
        battery_temp: batteryTemp,
        contact_time: 90,
        ambient_temp: ambientTemp,
      });

      const { estimated_temp, confidence, interpretation } = res.data;
      setResult({ estimated_temp, confidence, interpretation });
      setStep(3);

      // Sauvegarder automatiquement
      await measurementsAPI.submit({
        type: 'temperature',
        value: estimated_temp,
        raw_data: { battery_temp: batteryTemp, ambient_temp: ambientTemp, contact_time: 90 },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'effectuer l\'estimation. Vérifiez votre connexion.');
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(0);
    setResult(null);
    setScanning(false);
    setCountdown(90);
    clearInterval(intervalRef.current);
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const getTemperatureColor = (temp) => {
    if (!temp) return '#64748b';
    if (temp < 36) return '#3b82f6';
    if (temp < 37.5) return '#22c55e';
    if (temp < 38) return '#f97316';
    return '#ef4444';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌡️ Mesure de Température</Text>
        <Text style={styles.headerSub}>Estimation via capteurs du téléphone</Text>
      </View>

      {/* Étape 0: Instructions */}
      {step === 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          {STEPS.map((s) => (
            <View key={s.id} style={styles.stepRow}>
              <Text style={styles.stepIcon}>{s.icon}</Text>
              <Text style={styles.stepText}>{s.text}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.btnPrimary} onPress={() => setStep(1)}>
            <Text style={styles.btnPrimaryText}>Je suis prêt(e) →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Étape 1: Préparation */}
      {step === 1 && (
        <View style={styles.card}>
          <Text style={styles.stepIcon}>🤳</Text>
          <Text style={styles.instructionTitle}>Positionnement</Text>
          <Text style={styles.instructionText}>
            Posez délicatement l'écran de votre téléphone contre votre front.{'\n\n'}
            L'écran doit être en contact direct avec la peau pendant toute la durée du scan.
          </Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={startScan}>
            <Text style={styles.btnPrimaryText}>🚀 Démarrer le scan (90s)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setStep(0)}>
            <Text style={styles.btnSecondaryText}>← Retour</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Étape 2: Scan en cours */}
      {step === 2 && (
        <View style={[styles.card, styles.cardCenter]}>
          <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.countdown}>{countdown}</Text>
            <Text style={styles.countdownLabel}>secondes</Text>
          </Animated.View>
          <Text style={styles.scanningText}>📡 Mesure en cours...</Text>
          <Text style={styles.scanningHint}>
            Restez immobile, l'écran doit rester en contact avec votre front
          </Text>
          <TouchableOpacity style={styles.btnDanger} onPress={reset}>
            <Text style={styles.btnDangerText}>✕ Annuler</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Étape 3: Résultat */}
      {step === 3 && result && (
        <View style={styles.card}>
          <Text style={styles.resultLabel}>Température estimée</Text>
          <Text style={[styles.resultTemp, { color: getTemperatureColor(result.estimated_temp) }]}>
            {result.estimated_temp}°C
          </Text>
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>
              Fiabilité : {Math.round(result.confidence * 100)}%
            </Text>
          </View>
          <View style={styles.interpretationBox}>
            <Text style={styles.interpretationText}>{result.interpretation}</Text>
          </View>
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              ⚠️ Estimation à titre informatif uniquement.
              Non certifié médical. Consultez un médecin pour un diagnostic.
            </Text>
          </View>
          <TouchableOpacity style={styles.btnPrimary} onPress={reset}>
            <Text style={styles.btnPrimaryText}>🔄 Nouvelle mesure</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>⏳ Calcul en cours...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#7c3aed', padding: 24, paddingTop: 48,
    alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: 'white' },
  headerSub: { fontSize: 13, color: '#ddd6fe', marginTop: 4 },

  card: {
    margin: 16, backgroundColor: 'white', borderRadius: 16,
    padding: 24, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, elevation: 3,
  },
  cardCenter: { alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 16 },

  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepIcon: { fontSize: 28, marginRight: 12, textAlign: 'center' },
  stepText: { fontSize: 15, color: '#334155', flex: 1 },

  instructionTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', textAlign: 'center', marginVertical: 12 },
  instructionText: { fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 24 },

  pulseCircle: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center',
    marginVertical: 24, borderWidth: 3, borderColor: '#7c3aed',
  },
  countdown: { fontSize: 52, fontWeight: '800', color: '#7c3aed' },
  countdownLabel: { fontSize: 14, color: '#7c3aed' },
  scanningText: { fontSize: 18, fontWeight: '600', color: '#1e293b', marginTop: 8 },
  scanningHint: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 8, marginBottom: 24 },

  resultLabel: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  resultTemp: { fontSize: 64, fontWeight: '800', textAlign: 'center', marginVertical: 8 },
  confidenceBadge: {
    backgroundColor: '#f0fdf4', borderRadius: 20, paddingHorizontal: 16,
    paddingVertical: 6, alignSelf: 'center', marginBottom: 16,
  },
  confidenceText: { color: '#22c55e', fontWeight: '600', fontSize: 14 },
  interpretationBox: {
    backgroundColor: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 16,
  },
  interpretationText: { fontSize: 15, color: '#334155', textAlign: 'center' },
  disclaimer: {
    backgroundColor: '#fffbeb', borderRadius: 10, padding: 12, marginBottom: 20,
  },
  disclaimerText: { fontSize: 12, color: '#92400e', textAlign: 'center' },

  btnPrimary: {
    backgroundColor: '#7c3aed', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  btnPrimaryText: { color: 'white', fontWeight: '700', fontSize: 16 },
  btnSecondary: {
    borderWidth: 1.5, borderColor: '#7c3aed', borderRadius: 12,
    padding: 14, alignItems: 'center', marginTop: 8,
  },
  btnSecondaryText: { color: '#7c3aed', fontWeight: '600', fontSize: 15 },
  btnDanger: {
    backgroundColor: '#fef2f2', borderRadius: 12, padding: 14,
    alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#fecaca',
  },
  btnDangerText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },

  loadingOverlay: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  loadingText: { color: 'white', fontSize: 18, fontWeight: '600' },
});
