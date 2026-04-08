import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authStore } from '../../store/authStore';
import { notificacaoStore } from '../../store/notificacaoStore';
import { plantaoService } from '../../services/plantao.service';
import { useToast } from '../../components/ui/Toast';
import PlantaoCard from '../../components/plantao/PlantaoCard';
import Card from '../../components/ui/Card';
import { LoadingScreen } from '../../components/ui/LoadingOverlay';
import { COLORS } from '../../utils/constants';
import useWebSocket from '../../hooks/useWebSocket';

export default function DashboardScreen({ navigation }) {
  const user = authStore(s => s.user);
  const countNotif = notificacaoStore(s => s.count);
  const fetchCount = notificacaoStore(s => s.fetchCount);
  const showToast = useToast();

  const [plantoes, setPlantoes] = useState([]);
  const [stats, setStats] = useState({ abertos: 0, confirmados: 0, realizados: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregar = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await plantaoService.listarDoHospital({ limit: 10 });
      const lista = data.plantoes || data;
      setPlantoes(lista);
      setStats({
        abertos:    lista.filter(p => p.status === 'ABERTO').length,
        confirmados:lista.filter(p => p.status === 'CONFIRMADO').length,
        realizados: lista.filter(p => p.status === 'REALIZADO').length,
      });
    } catch {
      showToast('Erro ao carregar dashboard', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { carregar(); fetchCount(); }, []);

  useWebSocket((msg) => {
    if (['nova_candidatura', 'plantao_atualizado'].includes(msg.type)) carregar();
  });

  if (loading) return <LoadingScreen />;

  const nomeHospital = user?.hospital?.nomeFantasia || user?.hospital?.razaoSocial || 'Hospital';

  return (
    <LinearGradient colors={['#0A1628', '#0D1B2E']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => carregar(true)} tintColor={COLORS.accent} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.hospitalAvatar}>
                <Ionicons name="business" size={22} color={COLORS.accent} />
              </View>
              <View>
                <Text style={styles.greeting} numberOfLines={1}>{nomeHospital}</Text>
                <Text style={styles.subtitle}>Visão geral</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notificacoes')}>
              <Ionicons name={countNotif > 0 ? 'notifications' : 'notifications-outline'} size={24} color={countNotif > 0 ? COLORS.accent : '#fff'} />
              {countNotif > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{countNotif > 9 ? '9+' : countNotif}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatCard icon="folder-open-outline" label="Abertos" value={stats.abertos} color={COLORS.success} />
            <StatCard icon="checkmark-circle-outline" label="Confirmados" value={stats.confirmados} color={COLORS.accent} />
            <StatCard icon="star-outline" label="Realizados" value={stats.realizados} color={COLORS.textMuted} />
          </View>

          {/* Quick action */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.newBtn}
              onPress={() => navigation.navigate('CriarPlantao')}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#26D0CE', '#1A6EBD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.newBtnGrad}>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.newBtnText}>Publicar novo plantão</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Recent plantoes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Plantões recentes</Text>
              <TouchableOpacity onPress={() => navigation.navigate('GerenciarPlantoes')}>
                <Text style={{ color: COLORS.accent, fontSize: 13 }}>Ver todos</Text>
              </TouchableOpacity>
            </View>
            {plantoes.slice(0, 5).map(p => (
              <PlantaoCard
                key={p.id}
                plantao={p}
                onPress={() => navigation.navigate('GerenciarPlantaoDetail', { id: p.id })}
              />
            ))}
            {plantoes.length === 0 && (
              <Card style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={40} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>Nenhum plantão publicado ainda</Text>
              </Card>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <View style={[styles.stat, { borderColor: color }]}>
      <Ionicons name={icon} size={18} color={color} style={{ marginBottom: 4 }} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  hospitalAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(38,208,206,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.accent },
  greeting: { color: '#fff', fontSize: 16, fontWeight: '800', maxWidth: 200 },
  subtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  notifBtn: { position: 'relative', padding: 4 },
  badge: { position: 'absolute', top: 0, right: 0, backgroundColor: COLORS.danger, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  stat: { flex: 1, backgroundColor: '#112240', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel: { color: COLORS.textMuted, fontSize: 10, textAlign: 'center' },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  newBtn: { marginBottom: 16 },
  newBtnGrad: { borderRadius: 12, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  newBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyCard: { alignItems: 'center', padding: 24, gap: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
});
