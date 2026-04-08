import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
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
      // compute stats
      const abertos = lista.filter(p => p.status === 'ABERTO').length;
      const confirmados = lista.filter(p => p.status === 'CONFIRMADO').length;
      const realizados = lista.filter(p => p.status === 'REALIZADO').length;
      setStats({ abertos, confirmados, realizados });
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

  return (
    <LinearGradient colors={['#0A1628', '#0D1B2E']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => carregar(true)} tintColor={COLORS.accent} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>
                {user?.hospital?.nomeFantasia || user?.hospital?.razaoSocial || 'Hospital'}
              </Text>
              <Text style={styles.subtitle}>Visão geral</Text>
            </View>
            <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notificacoes')}>
              <Text style={{ fontSize: 22 }}>🔔</Text>
              {countNotif > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{countNotif > 9 ? '9+' : countNotif}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatCard label="Abertos" value={stats.abertos} color={COLORS.success} />
            <StatCard label="Confirmados" value={stats.confirmados} color={COLORS.accent} />
            <StatCard label="Realizados" value={stats.realizados} color={COLORS.textMuted} />
          </View>

          {/* Quick action */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.newBtn}
              onPress={() => navigation.navigate('CriarPlantao')}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#26D0CE', '#1A6EBD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.newBtnGrad}>
                <Text style={styles.newBtnText}>+ Publicar novo plantão</Text>
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
                <Text style={{ fontSize: 32, textAlign: 'center' }}>🏥</Text>
                <Text style={styles.emptyText}>Nenhum plantão publicado ainda</Text>
              </Card>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function StatCard({ label, value, color }) {
  return (
    <View style={[styles.stat, { borderColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
  greeting: { color: '#fff', fontSize: 18, fontWeight: '800', maxWidth: 260 },
  subtitle: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
  notifBtn: { position: 'relative', padding: 4 },
  badge: { position: 'absolute', top: 0, right: 0, backgroundColor: COLORS.danger, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  stat: { flex: 1, backgroundColor: '#112240', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1 },
  statValue: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  statLabel: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center' },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  newBtn: { marginBottom: 16 },
  newBtnGrad: { borderRadius: 12, padding: 16, alignItems: 'center' },
  newBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyCard: { alignItems: 'center', padding: 24, gap: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, marginTop: 8, textAlign: 'center' },
});
