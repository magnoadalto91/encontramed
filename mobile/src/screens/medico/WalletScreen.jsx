import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { LoadingScreen } from '../../components/ui/LoadingOverlay';
import { COLORS } from '../../utils/constants';
import { formatCurrency, formatDate } from '../../utils/formatters';

function StatCard({ icon, label, value, color }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={22} color={color || COLORS.accent} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Stars({ nota }) {
  if (!nota) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 }}>
      <Ionicons name="star" size={12} color="#FFD700" />
      <Text style={{ color: '#FFD700', fontSize: 12, fontWeight: '700' }}>{Number(nota).toFixed(1)}</Text>
    </View>
  );
}

function HistoricoItem({ item }) {
  const pago = !!item.pagoEm;
  return (
    <View style={styles.histItem}>
      <View style={{ flex: 1 }}>
        <Text style={styles.histTitulo}>{item.plantao?.titulo || 'Plantão'}</Text>
        <Text style={styles.histDate}>{item.plantao?.localCidade} · {formatDate(item.plantao?.dataInicio)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.histValor, pago && { color: COLORS.success }]}>
          {formatCurrency(item.valorLiquido)}
        </Text>
        <View style={[styles.histBadge, pago ? styles.badgePago : styles.badgePendente]}>
          <Text style={styles.histBadgeText}>{pago ? 'Pago' : 'Pendente'}</Text>
        </View>
      </View>
    </View>
  );
}

function FuturoItem({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.futuroItem} onPress={onPress} activeOpacity={0.75}>
      <Ionicons name="calendar-outline" size={18} color={COLORS.accent} style={{ marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.futuroTitulo}>{item.titulo}</Text>
        <Text style={styles.futuroSub}>{item.hospital?.nomeFantasia || item.hospital?.razaoSocial}</Text>
        <Text style={styles.futuroDate}>{formatDate(item.dataInicio)}</Text>
      </View>
      <Text style={styles.futuroValor}>{formatCurrency(item.valorBase)}</Text>
    </TouchableOpacity>
  );
}

export default function WalletScreen({ navigation }) {
  const showToast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('resumo'); // 'resumo' | 'historico' | 'futuros'

  const carregar = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const r = await api.get('/wallet/medico');
      setData(r.data);
    } catch {
      showToast('Erro ao carregar carteira', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { carregar(); }, []);

  if (loading) return <LoadingScreen message="Carregando carteira..." />;

  const tabs = [
    { key: 'resumo', label: 'Resumo' },
    { key: 'futuros', label: 'A receber' },
    { key: 'historico', label: 'Histórico' },
  ];

  return (
    <LinearGradient colors={['#0A1628', '#0D1B2E']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Minha Carteira</Text>
          {data?.notaMedia && <Stars nota={data.notaMedia} />}
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {tabs.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={
            tab === 'historico' ? (data?.historico || []) :
            tab === 'futuros'   ? (data?.plantoesFuturos || []) :
            []
          }
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => carregar(true)} tintColor={COLORS.accent} />}
          ListHeaderComponent={
            tab === 'resumo' ? (
              <View>
                {/* Total recebido */}
                <View style={styles.totalCard}>
                  <Text style={styles.totalLabel}>Total recebido</Text>
                  <Text style={styles.totalValue}>{formatCurrency(data?.totalRecebido || 0)}</Text>
                  <Text style={styles.totalSub}>{data?.totalPlantoes || 0} plantões pagos</Text>
                </View>
                {/* Stats */}
                <View style={styles.statsRow}>
                  <StatCard icon="time-outline" label="A receber" value={formatCurrency(data?.valorPendente || 0)} color={COLORS.warning} />
                  <StatCard icon="calendar-outline" label="Próximos" value={data?.plantoesFuturos?.length || 0} />
                  <StatCard icon="star-outline" label="Avaliação" value={data?.notaMedia ? `${Number(data.notaMedia).toFixed(1)} ★` : '—'} color="#FFD700" />
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) =>
            tab === 'historico'
              ? <HistoricoItem item={item} />
              : <FuturoItem item={item} onPress={() => navigation.navigate('PlantaoDetail', { id: item.id })} />
          }
          ListEmptyComponent={
            tab !== 'resumo' ? (
              <View style={styles.empty}>
                <Ionicons name="wallet-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>
                  {tab === 'historico' ? 'Nenhum pagamento registrado' : 'Nenhum plantão confirmado'}
                </Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  tabBtnActive: { backgroundColor: 'rgba(38,208,206,0.15)', borderColor: COLORS.accent },
  tabText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: COLORS.accent },
  list: { padding: 16, paddingTop: 8 },

  totalCard: { backgroundColor: '#112240', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', marginBottom: 14 },
  totalLabel: { color: COLORS.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  totalValue: { color: COLORS.accent, fontSize: 36, fontWeight: '800', marginTop: 6 },
  totalSub: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: '#112240', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', gap: 4 },
  statValue: { color: '#fff', fontSize: 16, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center' },

  histItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#112240', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  histTitulo: { color: '#fff', fontSize: 14, fontWeight: '600' },
  histDate: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  histValor: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '700' },
  histBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  badgePago: { backgroundColor: 'rgba(46,213,115,0.15)' },
  badgePendente: { backgroundColor: 'rgba(255,200,0,0.12)' },
  histBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },

  futuroItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#112240', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  futuroTitulo: { color: '#fff', fontSize: 14, fontWeight: '600' },
  futuroSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  futuroDate: { color: COLORS.accent, fontSize: 12, marginTop: 2 },
  futuroValor: { color: COLORS.accent, fontSize: 15, fontWeight: '800' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, marginTop: 12 },
});
