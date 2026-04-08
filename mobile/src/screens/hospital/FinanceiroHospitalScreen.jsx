import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { financeiroService } from '../../services/financeiro.service';
import { useToast } from '../../components/ui/Toast';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { LoadingScreen } from '../../components/ui/LoadingOverlay';
import { COLORS } from '../../utils/constants';
import { formatCurrency, formatDate } from '../../utils/formatters';

const STATUS_VARIANT = {
  PENDENTE: 'warning',
  A_PAGAR: 'info',
  PAGO: 'success',
  CANCELADO: 'danger',
};

export default function FinanceiroHospitalScreen() {
  const showToast = useToast();
  const [extrato, setExtrato] = useState([]);
  const [resumo, setResumo] = useState({ totalPago: 0, totalPendente: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregar = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await financeiroService.getExtratoHospital();
      setExtrato(data.transacoes || data);
      if (data.resumo) setResumo(data.resumo);
    } catch {
      showToast('Erro ao carregar financeiro', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { carregar(); }, []);

  if (loading) return <LoadingScreen />;

  return (
    <LinearGradient colors={['#0A1628', '#0D1B2E']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Financeiro</Text>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard label="Total pago" value={resumo.totalPago} color={COLORS.success} />
          <SummaryCard label="A pagar" value={resumo.totalPendente} color={COLORS.warning} />
        </View>

        <FlatList
          data={extrato}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => carregar(true)} tintColor={COLORS.accent} />}
          ListHeaderComponent={<Text style={styles.sectionTitle}>Histórico de pagamentos</Text>}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={styles.valor}>{formatCurrency(item.valorTotal || item.valor)}</Text>
                <Badge label={item.status} variant={STATUS_VARIANT[item.status] || 'muted'} size="sm" />
              </View>
              <Text style={styles.plantaoTitulo} numberOfLines={1}>{item.plantao?.titulo}</Text>
              <Text style={styles.medico}>{item.medico?.nomeCompleto || item.medico?.usuario?.nome}</Text>
              <Text style={styles.data}>{formatDate(item.createdAt)}</Text>
              {item.nfeStatus && (
                <Text style={styles.nfe}>NFe: {item.nfeStatus}</Text>
              )}
            </Card>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>💳</Text>
              <Text style={styles.emptyText}>Nenhuma transação ainda</Text>
            </View>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <View style={[styles.summaryCard, { borderColor: color }]}>
      <Text style={[styles.summaryValue, { color }]}>{formatCurrency(value)}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingBottom: 12 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 8 },
  summaryCard: { flex: 1, backgroundColor: '#112240', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1 },
  summaryValue: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  summaryLabel: { color: COLORS.textMuted, fontSize: 12 },
  sectionTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  list: { padding: 16, paddingTop: 12 },
  card: { marginBottom: 10 },
  valor: { color: '#fff', fontSize: 18, fontWeight: '800' },
  plantaoTitulo: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 2 },
  medico: { color: COLORS.textMuted, fontSize: 12, marginBottom: 4 },
  data: { color: COLORS.textMuted, fontSize: 12 },
  nfe: { color: COLORS.accent, fontSize: 11, marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, marginTop: 12 },
});
