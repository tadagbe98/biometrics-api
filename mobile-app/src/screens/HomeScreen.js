/**
 * HomeScreen - Dashboard mobile BioMetrics
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, Alert
} from 'react-native';
import { measurementsAPI } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

function MetricCard({ icon, label, value, unit, color, onPress }) {
  return (
    <TouchableOpacity style={[styles.metricCard, { borderLeftColor: color }]} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <Text style={styles.metricIcon}>{icon}</Text>
      <View style={styles.metricInfo}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, { color }]}>
          {value !== undefined ? `${value} ${unit}` : '—'}
        </Text>
      </View>
      {onPress && <Text style={styles.metricArrow}>›</Text>}
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const [summary, setSummary] = useState(null);
  const [userName, setUserName] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const res = await measurementsAPI.getSummary();
      setSummary(res.data.summary);
      setUserName(res.data.user);
    } catch (error) {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const logout = async () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler' },
      {
        text: 'Déconnexion',
        onPress: async () => {
          await AsyncStorage.removeItem('biometrics_token');
          navigation.replace('Login');
        }
      }
    ]);
  };

  useEffect(() => { loadData(); }, []);

  const m = summary || {};

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour {userName} 👋</Text>
          <Text style={styles.headerSub}>Tableau de bord santé</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutBtn}>Sortir</Text>
        </TouchableOpacity>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>⚠️ Usage personnel uniquement — Non médical</Text>
      </View>

      {/* Métriques */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dernières mesures</Text>
        <MetricCard icon="🌡️" label="Température" value={m.temperature?.value} unit="°C" color="#f97316" onPress={() => navigation.navigate('Temperature')} />
        <MetricCard icon="❤️" label="Fréquence cardiaque" value={m.hr?.value} unit="bpm" color="#ef4444" onPress={() => navigation.navigate('HeartRate')} />
        <MetricCard icon="🫁" label="Respiration" value={m.respiration?.value} unit="resp/min" color="#3b82f6" onPress={() => navigation.navigate('Respiration')} />
        <MetricCard icon="💓" label="HRV (RMSSD)" value={m.hrv?.value} unit="ms" color="#a855f7" onPress={() => navigation.navigate('HeartRate')} />
        <MetricCard icon="🚶" label="Pas" value={m.steps?.value} unit="pas" color="#22c55e" />
      </View>

      {/* Actions rapides */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mesures rapides</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fef3c7' }]} onPress={() => navigation.navigate('Temperature')}>
            <Text style={styles.actionIcon}>🌡️</Text>
            <Text style={styles.actionText}>Température</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fef2f2' }]} onPress={() => navigation.navigate('HeartRate')}>
            <Text style={styles.actionIcon}>❤️</Text>
            <Text style={styles.actionText}>Fréquence{'\n'}cardiaque</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#eff6ff' }]} onPress={() => navigation.navigate('Respiration')}>
            <Text style={styles.actionIcon}>🫁</Text>
            <Text style={styles.actionText}>Respiration</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f0fdf4' }]} onPress={() => Alert.alert('Bientôt', 'Historique à venir')}>
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionText}>Historique</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Info capteurs */}
      <View style={[styles.section, styles.infoBox]}>
        <Text style={styles.infoTitle}>🔬 Capteurs utilisés</Text>
        <Text style={styles.infoLine}>❤️ FC / HRV → Caméra + Flash (PPG)</Text>
        <Text style={styles.infoLine}>🌡️ Température → Thermistor batterie</Text>
        <Text style={styles.infoLine}>🫁 Respiration → Microphone (RMS)</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#7c3aed', padding: 24, paddingTop: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 20, fontWeight: '700', color: 'white' },
  headerSub: { fontSize: 13, color: '#ddd6fe', marginTop: 2 },
  logoutBtn: { color: '#ddd6fe', fontSize: 14 },
  disclaimer: { backgroundColor: '#fef3c7', padding: 10, alignItems: 'center' },
  disclaimerText: { fontSize: 12, color: '#92400e' },
  section: { margin: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  metricCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, elevation: 2 },
  metricIcon: { fontSize: 28, marginRight: 14 },
  metricInfo: { flex: 1 },
  metricLabel: { fontSize: 12, color: '#64748b' },
  metricValue: { fontSize: 20, fontWeight: '700' },
  metricArrow: { fontSize: 20, color: '#94a3b8' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionBtn: { width: '47%', borderRadius: 12, padding: 16, alignItems: 'center' },
  actionIcon: { fontSize: 32, marginBottom: 8 },
  actionText: { fontSize: 13, fontWeight: '600', color: '#334155', textAlign: 'center' },
  infoBox: { backgroundColor: 'white', borderRadius: 12, padding: 16, borderLeftWidth: 4, borderLeftColor: '#7c3aed' },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 10 },
  infoLine: { fontSize: 13, color: '#64748b', marginBottom: 6 },
});
