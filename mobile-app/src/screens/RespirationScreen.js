/**
 * RespirationScreen - Fréquence Respiratoire via microphone
 *
 * Méthode réelle :
 * - Le microphone capte les sons de la respiration pendant 30–60s
 * - On analyse le niveau sonore (amplitude RMS) en temps réel via expo-av
 * - Chaque inspiration/expiration crée une variation d'amplitude périodique
 * - Un filtre passe-bas (< 0.8 Hz = < 48 resp/min) isole la fréquence respiratoire
 * - La FFT ou la détection de pics compte les cycles respiratoires
 *
 * Conditions optimales :
 * - Environnement silencieux
 * - Téléphone à 10–20 cm de la bouche ou du nez
 * - Respiration normale (pas de retenue)
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Alert
} from 'react-native';
import { Audio } from 'expo-av';
import { measurementsAPI } from '../utils/api';

const MEASURE_DURATION = 45; // secondes
const RMS_INTERVAL_MS = 100; // échantillonnage toutes les 100ms = 10 Hz
const SAMPLE_RATE = 10; // Hz (une valeur RMS toutes les 100ms)

// ────────────────────────────────────────────────────
// Traitement du signal respiratoire
// ────────────────────────────────────────────────────

/**
 * Filtre passe-bas simple (fenêtre glissante)
 * Laisse passer les fréquences < 0.8 Hz (< 48 resp/min)
 */
function lowpassFilter(signal, windowSize = 15) {
  return signal.map((_, i) => {
    const start = Math.max(0, i - windowSize + 1);
    const window = signal.slice(start, i + 1);
    return window.reduce((a, b) => a + b, 0) / window.length;
  });
}

/**
 * Détection de pics dans le signal respiratoire
 * Un pic = une inspiration (ou expiration selon la configuration)
 */
function detectBreathPeaks(signal, minDistance = 8) {
  const filtered = lowpassFilter(signal, 15);
  const mean = filtered.reduce((a, b) => a + b, 0) / filtered.length;
  const std = Math.sqrt(filtered.reduce((a, b) => a + (b - mean) ** 2, 0) / filtered.length);

  if (std < 0.001) return []; // signal trop plat = bruit de fond

  const threshold = mean + 0.3 * std;
  const peaks = [];

  for (let i = minDistance; i < filtered.length - minDistance; i++) {
    if (filtered[i] > threshold) {
      let isPeak = true;
      for (let j = i - minDistance; j <= i + minDistance; j++) {
        if (j !== i && filtered[j] >= filtered[i]) { isPeak = false; break; }
      }
      if (isPeak) peaks.push(i);
    }
  }
  return peaks;
}

/**
 * Calcule la fréquence respiratoire depuis les pics détectés
 */
function computeRespirationRate(peaks, durationSeconds) {
  if (peaks.length < 2) return { rr: null, confidence: 0 };

  // Intervalles entre pics (en secondes)
  const intervals = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push((peaks[i] - peaks[i - 1]) / SAMPLE_RATE);
  }

  // Filtrer les intervalles aberrants (< 1.2s ou > 10s = hors 6-50 resp/min)
  const valid = intervals.filter(t => t >= 1.2 && t <= 10);
  if (valid.length === 0) return { rr: null, confidence: 0 };

  const meanInterval = valid.reduce((a, b) => a + b, 0) / valid.length;
  const rr = Math.round(60 / meanInterval);

  const confidence = Math.min(0.9, 0.3 + (valid.length / 8));
  return { rr, confidence };
}

function interpretRR(rr) {
  if (!rr) return '';
  if (rr < 12) return 'Bradypnée (< 12 resp/min) — Respiration lente';
  if (rr <= 20) return 'Fréquence normale (12–20 resp/min)';
  if (rr <= 30) return 'Légèrement élevée (21–30 resp/min)';
  return 'Tachypnée (> 30 resp/min) — Respiration rapide';
}

// ────────────────────────────────────────────────────
// Composant
// ────────────────────────────────────────────────────
export default function RespirationScreen() {
  const [phase, setPhase] = useState('idle'); // idle | instructions | measuring | result
  const [countdown, setCountdown] = useState(MEASURE_DURATION);
  const [result, setResult] = useState(null);
  const [currentAmplitude, setCurrentAmplitude] = useState(0); // 0–100
  const [liveRR, setLiveRR] = useState(null);
  const [noiseLevel, setNoiseLevel] = useState(0);

  const breathAnim = useRef(new Animated.Value(1)).current;
  const recordingRef = useRef(null);
  const amplitudeBuffer = useRef([]);
  const countdownRef = useRef(null);
  const samplerRef = useRef(null);
  const peakCountRef = useRef(0);

  // Animation respiration
  const startBreathAnim = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, { toValue: 1.3, duration: 2500, useNativeDriver: true }),
        Animated.timing(breathAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, [breathAnim]);

  const stopBreathAnim = useCallback(() => {
    breathAnim.stopAnimation();
    breathAnim.setValue(1);
  }, [breathAnim]);

  const startMeasurement = useCallback(async () => {
    // Demander la permission microphone
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission refusée', 'L\'accès au microphone est requis pour mesurer la fréquence respiratoire.');
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MEDIUM,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        isMeteringEnabled: true, // CRUCIAL : active getStatusAsync().metering
      });

      await recording.startAsync();
      recordingRef.current = recording;

      amplitudeBuffer.current = [];
      setPhase('measuring');
      setCountdown(MEASURE_DURATION);
      startBreathAnim();

      // Échantillonnage du niveau sonore (metering) toutes les 100ms
      samplerRef.current = setInterval(async () => {
        if (!recordingRef.current) return;
        const status = await recordingRef.current.getStatusAsync();
        if (!status.isRecording) return;

        // metering = dB (négatif, proche de 0 = fort)
        // On convertit en amplitude linéaire 0–100
        const db = status.metering ?? -160;
        const amplitude = Math.max(0, Math.min(100, (db + 60) * 100 / 60));
        amplitudeBuffer.current.push(amplitude);
        setCurrentAmplitude(Math.round(amplitude));

        // Analyse temps réel (toutes les 3s = 30 échantillons)
        if (amplitudeBuffer.current.length >= 30 && amplitudeBuffer.current.length % 10 === 0) {
          const peaks = detectBreathPeaks(amplitudeBuffer.current);
          if (peaks.length >= 2) {
            const elapsed = amplitudeBuffer.current.length / SAMPLE_RATE;
            const { rr } = computeRespirationRate(peaks, elapsed);
            if (rr && rr >= 4 && rr <= 50) setLiveRR(rr);
          }
          // Détecter le bruit ambiant (5 premières secondes)
          if (amplitudeBuffer.current.length <= 55) {
            const mean5s = amplitudeBuffer.current.slice(0, 50).reduce((a, b) => a + b, 0) / 50;
            setNoiseLevel(Math.round(mean5s));
          }
        }
      }, RMS_INTERVAL_MS);

      // Compte à rebours
      let count = MEASURE_DURATION;
      countdownRef.current = setInterval(() => {
        count--;
        setCountdown(count);
        if (count <= 0) {
          clearInterval(countdownRef.current);
          finalizeRespiration();
        }
      }, 1000);

    } catch (error) {
      Alert.alert('Erreur microphone', 'Impossible de démarrer l\'enregistrement : ' + error.message);
    }
  }, [startBreathAnim]);

  const finalizeRespiration = useCallback(async () => {
    clearInterval(samplerRef.current);
    stopBreathAnim();

    // Arrêter l'enregistrement
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (_) {}
      recordingRef.current = null;
    }

    const signal = [...amplitudeBuffer.current];
    if (signal.length < 20) {
      Alert.alert('Signal insuffisant', 'La mesure n\'a pas pu être effectuée.');
      setPhase('idle');
      return;
    }

    const peaks = detectBreathPeaks(signal);
    const { rr, confidence } = computeRespirationRate(peaks, MEASURE_DURATION);

    if (!rr) {
      Alert.alert(
        'Signal trop faible',
        'Aucun cycle respiratoire détecté. Rapprochez le téléphone de votre bouche/nez et réessayez dans un endroit silencieux.'
      );
      setPhase('idle');
      return;
    }

    try {
      await measurementsAPI.submit({
        type: 'respiration',
        value: rr,
        timestamp: new Date().toISOString(),
        raw_data: {
          peaks_count: peaks.length,
          signal_length: signal.length,
          noise_level: noiseLevel,
          method: 'microphone_rms',
        },
      });
    } catch (_) {}

    setResult({ rr, confidence, interpretation: interpretRR(rr), peaks: peaks.length });
    setPhase('result');
  }, [stopBreathAnim, noiseLevel]);

  const reset = useCallback(async () => {
    clearInterval(countdownRef.current);
    clearInterval(samplerRef.current);
    stopBreathAnim();
    if (recordingRef.current) {
      try { await recordingRef.current.stopAndUnloadAsync(); } catch (_) {}
      recordingRef.current = null;
    }
    amplitudeBuffer.current = [];
    setPhase('idle');
    setResult(null);
    setCurrentAmplitude(0);
    setLiveRR(null);
    setCountdown(MEASURE_DURATION);
  }, [stopBreathAnim]);

  useEffect(() => () => { reset(); }, []);

  const ampColor = currentAmplitude > 60 ? '#ef4444' : currentAmplitude > 20 ? '#22c55e' : '#94a3b8';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🫁 Fréquence Respiratoire</Text>
        <Text style={styles.headerSub}>Mesure via microphone</Text>
      </View>

      {/* IDLE */}
      {phase === 'idle' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Comment ça fonctionne</Text>
          <Text style={styles.infoText}>
            Le microphone capte le son de votre souffle. L'amplitude sonore varie
            rythmiquement à chaque inspiration et expiration. Un algorithme analyse
            cette courbe pour compter vos cycles respiratoires.
          </Text>
          <View style={styles.stepRow}><Text style={styles.stepIcon}>🤫</Text><Text style={styles.stepText}>Trouvez un endroit silencieux</Text></View>
          <View style={styles.stepRow}><Text style={styles.stepIcon}>📱</Text><Text style={styles.stepText}>Posez le téléphone à 15–25 cm de votre bouche</Text></View>
          <View style={styles.stepRow}><Text style={styles.stepIcon}>🌬️</Text><Text style={styles.stepText}>Respirez normalement pendant 45 secondes</Text></View>
          <View style={styles.stepRow}><Text style={styles.stepIcon}>🔇</Text><Text style={styles.stepText}>Ne parlez pas pendant la mesure</Text></View>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => setPhase('instructions')}>
            <Text style={styles.btnPrimaryText}>Commencer →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* INSTRUCTIONS */}
      {phase === 'instructions' && (
        <View style={[styles.card, styles.cardCenter]}>
          <Text style={styles.bigIcon}>🌬️</Text>
          <Text style={styles.instructionTitle}>Prêt(e) ?</Text>
          <Text style={styles.instructionText}>
            Placez le téléphone face à vous, microphone orienté vers votre bouche.{'\n\n'}
            Respirez normalement — inspirez, expirez à votre rythme habituel.{'\n\n'}
            La mesure dure 45 secondes.
          </Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={startMeasurement}>
            <Text style={styles.btnPrimaryText}>🎙️ Démarrer la mesure</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setPhase('idle')}>
            <Text style={styles.btnSecondaryText}>← Retour</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MEASURING */}
      {phase === 'measuring' && (
        <View style={[styles.card, styles.cardCenter]}>
          <Animated.View style={[styles.breathCircle, { transform: [{ scale: breathAnim }] }]}>
            <Text style={styles.breathIcon}>🌬️</Text>
          </Animated.View>

          <Text style={styles.countdown}>{countdown}s</Text>
          <Text style={styles.scanningText}>Analyse du souffle...</Text>

          {/* Niveau sonore en temps réel */}
          <View style={styles.ampRow}>
            <Text style={styles.ampLabel}>Son capté : </Text>
            <View style={styles.ampBar}>
              <View style={[styles.ampFill, { width: `${currentAmplitude}%`, backgroundColor: ampColor }]} />
            </View>
            <Text style={[styles.ampPct, { color: ampColor }]}>{currentAmplitude}%</Text>
          </View>

          {noiseLevel > 30 && (
            <Text style={styles.warningText}>⚠️ Bruit ambiant élevé — résultat moins fiable</Text>
          )}

          {liveRR && (
            <View style={styles.liveRRBox}>
              <Text style={styles.liveRRLabel}>Estimé en temps réel</Text>
              <Text style={styles.liveRRValue}>{liveRR}</Text>
              <Text style={styles.liveRRUnit}>resp/min</Text>
            </View>
          )}

          <Text style={styles.scanningHint}>
            Respirez normalement.{'\n'}
            Ne parlez pas et évitez les bruits parasites.
          </Text>

          <TouchableOpacity style={styles.btnDanger} onPress={reset}>
            <Text style={styles.btnDangerText}>✕ Annuler</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* RESULT */}
      {phase === 'result' && result && (
        <View style={styles.card}>
          <View style={styles.resultCenter}>
            <Text style={styles.resultLabel}>Fréquence respiratoire</Text>
            <Text style={styles.resultValue}>{result.rr}</Text>
            <Text style={styles.resultUnit}>resp/min</Text>
          </View>
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>Fiabilité : {Math.round(result.confidence * 100)}%  ·  {result.peaks} cycles détectés</Text>
          </View>
          <View style={styles.interpretationBox}>
            <Text style={styles.interpretationText}>{result.interpretation}</Text>
          </View>
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>⚠️ Usage bien-être uniquement. Non médical.</Text>
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
  header: { backgroundColor: '#3b82f6', padding: 24, paddingTop: 48, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: 'white' },
  headerSub: { fontSize: 12, color: '#bfdbfe', marginTop: 4 },
  card: { margin: 16, backgroundColor: 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, elevation: 3 },
  cardCenter: { alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  infoText: { fontSize: 14, color: '#64748b', lineHeight: 20, marginBottom: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepIcon: { fontSize: 22, marginRight: 12, width: 30 },
  stepText: { fontSize: 14, color: '#334155', flex: 1 },
  bigIcon: { fontSize: 60, marginVertical: 16 },
  instructionTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', textAlign: 'center', marginBottom: 12 },
  instructionText: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  breathCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginVertical: 16, borderWidth: 3, borderColor: '#3b82f6' },
  breathIcon: { fontSize: 48 },
  countdown: { fontSize: 48, fontWeight: '800', color: '#3b82f6', marginTop: 8 },
  scanningText: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginTop: 4 },
  ampRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, width: '100%' },
  ampLabel: { fontSize: 13, color: '#64748b' },
  ampBar: { flex: 1, height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, marginHorizontal: 8, overflow: 'hidden' },
  ampFill: { height: '100%', borderRadius: 4 },
  ampPct: { fontSize: 13, fontWeight: '600', width: 36, textAlign: 'right' },
  warningText: { fontSize: 12, color: '#f97316', marginTop: 8, textAlign: 'center' },
  liveRRBox: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 16, marginTop: 16, alignItems: 'center', width: '100%' },
  liveRRLabel: { fontSize: 12, color: '#3b82f6' },
  liveRRValue: { fontSize: 40, fontWeight: '800', color: '#1d4ed8' },
  liveRRUnit: { fontSize: 14, color: '#3b82f6' },
  scanningHint: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 12 },
  resultCenter: { alignItems: 'center', marginBottom: 16 },
  resultLabel: { fontSize: 14, color: '#64748b' },
  resultValue: { fontSize: 64, fontWeight: '800', color: '#1d4ed8' },
  resultUnit: { fontSize: 16, color: '#64748b' },
  confidenceBadge: { backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, alignSelf: 'center', marginBottom: 12 },
  confidenceText: { color: '#3b82f6', fontWeight: '600', fontSize: 13 },
  interpretationBox: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 16 },
  interpretationText: { fontSize: 14, color: '#334155', textAlign: 'center' },
  disclaimer: { backgroundColor: '#fffbeb', borderRadius: 10, padding: 12, marginBottom: 20 },
  disclaimerText: { fontSize: 12, color: '#92400e', textAlign: 'center' },
  btnPrimary: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnPrimaryText: { color: 'white', fontWeight: '700', fontSize: 16 },
  btnSecondary: { borderWidth: 1.5, borderColor: '#3b82f6', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  btnSecondaryText: { color: '#3b82f6', fontWeight: '600', fontSize: 15 },
  btnDanger: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  btnDangerText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
});
