/**
 * TemperatureScanScreen - Température corporelle
 *
 * Méthode réelle :
 * - L'utilisateur pose le bas du téléphone (où se trouve la batterie) OU l'écran sur sa peau
 * - expo-device lit la température de la batterie via les APIs système (Android/iOS)
 * - Un thermomètre NTC interne au smartphone se réchauffe au contact de la peau
 * - Après 30–120s de contact, la température de la batterie monte et se stabilise
 * - Un modèle de régression (calibré sur données FeverPhone) estime la T° corporelle
 *
 * Sources: FeverPhone (2022), IMWUT paper, DOI 10.1145/3534582
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Alert, ScrollView
} from 'react-native';
import * as Device from 'expo-device';
import { estimatesAPI, measurementsAPI } from '../utils/api';

// Durée cible : 120s idéal, minimum 30s
const SCAN_DURATION = 120;
const MIN_DURATION = 30;
const SAMPLE_INTERVAL_MS = 2000; // lecture toutes les 2s

// ────────────────────────────────────────────────────
// Lecture température batterie
// ────────────────────────────────────────────────────

/**
 * Lit la température de la batterie du smartphone.
 * Sur Android : retourne une valeur réelle (°C) via BatteryManager
 * Sur iOS     : l'API n'est pas disponible → retourne null (limitation Apple)
 */
async function readBatteryTemperature() {
  try {
    // expo-device expose la température sur Android SDK ≥ 21
    if (Device.isDevice && Device.osName === 'Android') {
      const temp = await Device.getBatteryTemperatureAsync?.();
      if (typeof temp === 'number' && temp > 0) return temp;
    }
    // Fallback iOS ou émulateur : null signifie "lecture impossible"
    return null;
  } catch {
    return null;
  }
}

/**
 * Lecture approximative sur iOS via capacité batterie (proxy indirect).
 * En l'absence d'API officielle, on utilise les données accéléromètre
 * combinées à la chaleur perçue — pas disponible dans cette version.
 * → Sur iOS, on demande à l'utilisateur de saisir manuellement.
 */

// ────────────────────────────────────────────────────
// Composant
// ────────────────────────────────────────────────────
export default function TemperatureScanScreen() {
  const [phase, setPhase] = useState('idle'); // idle | scanning | result | ios_fallback
  const [countdown, setCountdown] = useState(SCAN_DURATION);
  const [result, setResult] = useState(null);
  const [batteryReadings, setBatteryReadings] = useState([]); // courbe de montée en T°
  const [currentBatteryTemp, setCurrentBatteryTemp] = useState(null);
  const [isAndroid, setIsAndroid] = useState(true);
  const [progress, setProgress] = useState(0); // 0–100

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const countdownRef = useRef(null);
  const sampleRef = useRef(null);
  const readingsRef = useRef([]);
  const startTimeRef = useRef(null);

  useEffect(() => {
    // Détecter la plateforme au montage
    const checkPlatform = async () => {
      const isAndroidDevice = Device.osName === 'Android';
      setIsAndroid(isAndroidDevice);
      if (!isAndroidDevice) setPhase('ios_info');
    };
    checkPlatform();
  }, []);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const startScan = useCallback(async () => {
    // Vérifier si la lecture batterie fonctionne
    const initialTemp = await readBatteryTemperature();
    if (initialTemp === null && Device.osName !== 'Android') {
      setPhase('ios_info');
      return;
    }

    setPhase('scanning');
    setCountdown(SCAN_DURATION);
    setBatteryReadings([]);
    readingsRef.current = [];
    startTimeRef.current = Date.now();
    startPulse();

    // Échantillonnage de la température toutes les 2s
    sampleRef.current = setInterval(async () => {
      const temp = await readBatteryTemperature();
      if (temp !== null) {
        readingsRef.current.push(temp);
        setBatteryReadings([...readingsRef.current]);
        setCurrentBatteryTemp(temp);
      }
    }, SAMPLE_INTERVAL_MS);

    // Compte à rebours
    let count = SCAN_DURATION;
    countdownRef.current = setInterval(() => {
      count--;
      setCountdown(count);
      setProgress(Math.round(((SCAN_DURATION - count) / SCAN_DURATION) * 100));
      if (count <= 0) {
        clearInterval(countdownRef.current);
        finalizeEstimation();
      }
    }, 1000);
  }, []);

  const finalizeEstimation = useCallback(async () => {
    clearInterval(sampleRef.current);
    stopPulse();

    const readings = [...readingsRef.current];
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);

    if (readings.length < 5) {
      Alert.alert(
        'Données insuffisantes',
        'La lecture de la température batterie a échoué. Votre appareil ne supporte peut-être pas cette fonctionnalité.'
      );
      setPhase('idle');
      return;
    }

    // Température batterie = moyenne des 5 dernières lectures (stabilisée)
    const latestReadings = readings.slice(-5);
    const batteryTemp = latestReadings.reduce((a, b) => a + b, 0) / latestReadings.length;
    
    // Température ambiante estimée = première lecture (avant contact avec la peau)
    const ambientTemp = readings[0];

    try {
      const res = await estimatesAPI.estimateTemperature({
        battery_temp: batteryTemp,
        contact_time: elapsed,
        ambient_temp: ambientTemp,
      });

      const { estimated_temp, confidence, interpretation } = res.data;

      setResult({
        estimated_temp,
        confidence,
        interpretation,
        battery_temp: Math.round(batteryTemp * 10) / 10,
        ambient_temp: Math.round(ambientTemp * 10) / 10,
        contact_time: elapsed,
      });

      await measurementsAPI.submit({
        type: 'temperature',
        value: estimated_temp,
        timestamp: new Date().toISOString(),
        raw_data: {
          battery_temp: batteryTemp,
          ambient_temp: ambientTemp,
          contact_time: elapsed,
          readings_count: readings.length,
          method: 'battery_thermistor',
        },
      });

      setPhase('result');
    } catch (error) {
      Alert.alert('Erreur', 'Estimation impossible. Vérifiez votre connexion.');
      setPhase('idle');
    }
  }, []);

  const earlyFinish = useCallback(() => {
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    if (elapsed < MIN_DURATION) {
      Alert.alert(
        'Trop tôt',
        `Attendez encore ${MIN_DURATION - elapsed} secondes pour une estimation fiable.`
      );
      return;
    }
    clearInterval(countdownRef.current);
    setCountdown(0);
    finalizeEstimation();
  }, [finalizeEstimation]);

  const reset = useCallback(() => {
    clearInterval(countdownRef.current);
    clearInterval(sampleRef.current);
    stopPulse();
    setPhase('idle');
    setResult(null);
    setCountdown(SCAN_DURATION);
    setBatteryReadings([]);
    setCurrentBatteryTemp(null);
    setProgress(0);
    readingsRef.current = [];
  }, []);

  const tempColor = (t) => {
    if (!t) return '#64748b';
    if (t < 36) return '#3b82f6';
    if (t < 37.5) return '#22c55e';
    if (t < 38) return '#f97316';
    return '#ef4444';
  };

  const minReached = SCAN_DURATION - countdown >= MIN_DURATION;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌡️ Température Corporelle</Text>
        <Text style={styles.headerSub}>Estimation via thermistor de la batterie</Text>
      </View>

      {/* IDLE */}
      {phase === 'idle' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Comment ça fonctionne</Text>
          <Text style={styles.infoText}>
            Le smartphone contient un capteur de température (NTC) intégré à la batterie.
            Au contact de votre peau, il se réchauffe progressivement. Après 2 minutes,
            la température se stabilise et un algorithme estime votre température corporelle.
          </Text>
          <View style={styles.stepRow}><Text style={styles.stepIcon}>🧼</Text><Text style={styles.stepText}>Lavez-vous les mains</Text></View>
          <View style={styles.stepRow}><Text style={styles.stepIcon}>📱</Text><Text style={styles.stepText}>Posez le bas du téléphone sur votre front ou poignet</Text></View>
          <View style={styles.stepRow}><Text style={styles.stepIcon}>⏱️</Text><Text style={styles.stepText}>Minimum 30s, idéalement 2 minutes</Text></View>
          <View style={styles.stepRow}><Text style={styles.stepIcon}>🔢</Text><Text style={styles.stepText}>Ne bougez pas pendant la mesure</Text></View>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => setPhase('position')}>
            <Text style={styles.btnPrimaryText}>Je suis prêt(e) →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* POSITIONNEMENT */}
      {phase === 'position' && (
        <View style={[styles.card, styles.cardCenter]}>
          <Text style={styles.bigIcon}>🤳</Text>
          <Text style={styles.instructionTitle}>Positionnement</Text>
          <Text style={styles.instructionText}>
            Posez le bas de votre téléphone (là où se trouve la batterie)
            fermement contre votre front ou votre poignet intérieur.{'\n\n'}
            L'écran doit être lisible pendant la mesure.{'\n\n'}
            Appuyez sur « Démarrer » puis ne bougez plus.
          </Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={startScan}>
            <Text style={styles.btnPrimaryText}>🚀 Démarrer (120s)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setPhase('idle')}>
            <Text style={styles.btnSecondaryText}>← Retour</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* SCAN EN COURS */}
      {phase === 'scanning' && (
        <View style={[styles.card, styles.cardCenter]}>
          <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.countdown}>{countdown}</Text>
            <Text style={styles.countdownLabel}>secondes</Text>
          </Animated.View>

          {/* Barre de progression */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{progress}% — {minReached ? '✅ Minimum atteint' : `⏳ Minimum dans ${MIN_DURATION - (SCAN_DURATION - countdown)}s`}</Text>

          {/* Température batterie en temps réel */}
          {currentBatteryTemp && (
            <View style={styles.batteryTempBox}>
              <Text style={styles.batteryTempLabel}>Temp. capteur batterie</Text>
              <Text style={styles.batteryTempValue}>{currentBatteryTemp.toFixed(1)}°C</Text>
              <Text style={styles.batteryTempHint}>↗ Monte avec le contact peau</Text>
            </View>
          )}

          {/* Mini graphe des relevés */}
          {batteryReadings.length > 1 && (
            <View style={styles.graphRow}>
              {batteryReadings.slice(-12).map((t, i) => {
                const minT = Math.min(...batteryReadings);
                const maxT = Math.max(...batteryReadings) || minT + 1;
                const h = Math.max(4, Math.round(((t - minT) / (maxT - minT)) * 40));
                return (
                  <View key={i} style={{ width: 8, height: h, backgroundColor: '#7c3aed', borderRadius: 2, marginHorizontal: 2 }} />
                );
              })}
            </View>
          )}

          <Text style={styles.scanningHint}>
            Gardez le téléphone en contact avec votre peau.{'\n'}
            Ne parlez pas, restez immobile.
          </Text>

          <View style={styles.btnRow}>
            {minReached && (
              <TouchableOpacity style={styles.btnEarly} onPress={earlyFinish}>
                <Text style={styles.btnEarlyText}>✓ Terminer maintenant</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.btnDanger} onPress={reset}>
              <Text style={styles.btnDangerText}>✕ Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* RÉSULTAT */}
      {phase === 'result' && result && (
        <View style={styles.card}>
          <Text style={styles.resultLabel}>Température estimée</Text>
          <Text style={[styles.resultTemp, { color: tempColor(result.estimated_temp) }]}>
            {result.estimated_temp}°C
          </Text>
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>Fiabilité : {Math.round(result.confidence * 100)}%</Text>
          </View>
          <View style={styles.interpretationBox}>
            <Text style={styles.interpretationText}>{result.interpretation}</Text>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Capteur batterie</Text>
              <Text style={styles.metaValue}>{result.battery_temp}°C</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Ambiante initiale</Text>
              <Text style={styles.metaValue}>{result.ambient_temp}°C</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Durée contact</Text>
              <Text style={styles.metaValue}>{result.contact_time}s</Text>
            </View>
          </View>
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              ⚠️ Estimation à titre informatif. Non certifié médical.{'\n'}
              Consultez un médecin pour un diagnostic.
            </Text>
          </View>
          <TouchableOpacity style={styles.btnPrimary} onPress={reset}>
            <Text style={styles.btnPrimaryText}>🔄 Nouvelle mesure</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* INFO iOS */}
      {phase === 'ios_info' && (
        <View style={styles.card}>
          <Text style={styles.bigIcon}>🍎</Text>
          <Text style={styles.instructionTitle}>Limitation iOS</Text>
          <Text style={styles.instructionText}>
            Apple ne permet pas aux applications de lire la température de la batterie sur iOS.{'\n\n'}
            Sur Android, cette fonctionnalité est disponible.{'\n\n'}
            Pour iOS, un thermomètre Bluetooth compatible peut être utilisé — fonctionnalité à venir.
          </Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => setPhase('idle')}>
            <Text style={styles.btnPrimaryText}>← Retour</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#7c3aed', padding: 24, paddingTop: 48, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: 'white' },
  headerSub: { fontSize: 12, color: '#ddd6fe', marginTop: 4 },
  card: { margin: 16, backgroundColor: 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, elevation: 3 },
  cardCenter: { alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  infoText: { fontSize: 14, color: '#64748b', lineHeight: 20, marginBottom: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepIcon: { fontSize: 24, marginRight: 12, width: 32 },
  stepText: { fontSize: 14, color: '#334155', flex: 1 },
  bigIcon: { fontSize: 60, marginVertical: 16, textAlign: 'center' },
  instructionTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', textAlign: 'center', marginBottom: 12 },
  instructionText: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  pulseCircle: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center', marginVertical: 16, borderWidth: 3, borderColor: '#7c3aed' },
  countdown: { fontSize: 52, fontWeight: '800', color: '#7c3aed' },
  countdownLabel: { fontSize: 14, color: '#7c3aed' },
  progressBar: { width: '100%', height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, marginTop: 16, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#7c3aed', borderRadius: 4 },
  progressLabel: { fontSize: 13, color: '#64748b', marginTop: 6, marginBottom: 12 },
  batteryTempBox: { backgroundColor: '#f5f3ff', borderRadius: 12, padding: 14, alignItems: 'center', marginVertical: 12, width: '100%' },
  batteryTempLabel: { fontSize: 12, color: '#7c3aed' },
  batteryTempValue: { fontSize: 32, fontWeight: '800', color: '#7c3aed' },
  batteryTempHint: { fontSize: 11, color: '#a78bfa', marginTop: 4 },
  graphRow: { flexDirection: 'row', alignItems: 'flex-end', height: 50, marginVertical: 8 },
  scanningHint: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 8 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btnEarly: { flex: 1, backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#86efac' },
  btnEarlyText: { color: '#16a34a', fontWeight: '600', fontSize: 14 },
  resultLabel: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  resultTemp: { fontSize: 64, fontWeight: '800', textAlign: 'center', marginVertical: 8 },
  confidenceBadge: { backgroundColor: '#f0fdf4', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, alignSelf: 'center', marginBottom: 12 },
  confidenceText: { color: '#22c55e', fontWeight: '600', fontSize: 14 },
  interpretationBox: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 12 },
  interpretationText: { fontSize: 14, color: '#334155', textAlign: 'center' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  metaItem: { alignItems: 'center' },
  metaLabel: { fontSize: 11, color: '#94a3b8' },
  metaValue: { fontSize: 16, fontWeight: '700', color: '#334155' },
  disclaimer: { backgroundColor: '#fffbeb', borderRadius: 10, padding: 12, marginBottom: 20 },
  disclaimerText: { fontSize: 12, color: '#92400e', textAlign: 'center' },
  btnPrimary: { backgroundColor: '#7c3aed', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnPrimaryText: { color: 'white', fontWeight: '700', fontSize: 16 },
  btnSecondary: { borderWidth: 1.5, borderColor: '#7c3aed', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  btnSecondaryText: { color: '#7c3aed', fontWeight: '600', fontSize: 15 },
  btnDanger: { flex: 1, backgroundColor: '#fef2f2', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca' },
  btnDangerText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
});
