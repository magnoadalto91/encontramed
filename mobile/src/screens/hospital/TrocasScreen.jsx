import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { ConfirmModal } from '../../components/ui/Modal';
import { LoadingScreen } from '../../components/ui/LoadingOverlay';
import { COLORS } from '../../utils/constants';
import { formatDate, formatTime } from '../../utils/formatters';

const STATUS_VARIANT = {
  PENDENTE: 'warning',
  APROVADA_HOSPITAL: 'info',
  APROVADA_AMBOS: 'success',
  REJEITADA: 'danger',
  CANCELADA: 'muted',
};

export default function TrocasScreen() {
  const showToast = useToast();
  const [trocas, setTrocas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acao, setAcao] = useState(null); // { type: 'aprovar'|'rejeitar', id }
  const [actionLoading, setActionLoading] = useState(false);

  const carregar = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { data } = await api.get('/trocas/hospital');
      setTrocas(data.trocas || data);
    } catch {
      showToast('Erro ao carregar trocas', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { carregar(); }, []);

  const handleAcao = async () => {
    if (!acao) return;
    setActionLoading(true);
    try {
      const endpoint = acao.type === 'aprovar' ? `/trocas/${acao.id}/aprovar-hospital` : `/trocas/${acao.id}/rejeitar-hospital`;
      await api.post(endpoint);
      showToast(acao.type === 'aprovar' ? 'Troca aprovada!' : 'Troca rejeitada', 'success');
      setAcao(null);
      carregar();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Erro ao processar', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <LinearGradient colors={['#0A1628', '#0D1B2E']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Trocas de Plantão</Text>
          <Text style={styles.subtitle}>Solicitações de troca entre médicos</Text>
        </View>

        <FlatList
          data={trocas}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => carregar(true)} tintColor={COLORS.accent} />}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={styles.cardTitle}>Troca #{item.id}</Text>
                <Badge label={item.status} variant={STATUS_VARIANT[item.status] || 'muted'} size="sm" />
              </View>
              <Text style={styles.info}>
                De: {item.plantaoOrigem?.titulo}
              </Text>
              <Text style={styles.info}>
                Para: {item.plantaoDestino?.titulo}
              </Text>
              <Text style={styles.data}>{formatDate(item.createdAt)}</Text>
              {item.status === 'PENDENTE' && (
                <View style={styles.actions}>
                  <Button title="Aprovar" variant="secondary" size="sm" onPress={() => setAcao({ type: 'aprovar', id: item.id })} style={{ flex: 1, marginRight: 8 }} />
                  <Button title="Rejeitar" variant="danger" size="sm" onPress={() => setAcao({ type: 'rejeitar', id: item.id })} style={{ flex: 1 }} />
                </View>
              )}
            </Card>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>🔄</Text>
              <Text style={styles.emptyText}>Nenhuma solicitação de troca</Text>
            </View>
          }
        />

        <ConfirmModal
          visible={!!acao}
          onClose={() => setAcao(null)}
          onConfirm={handleAcao}
          title={acao?.type === 'aprovar' ? 'Aprovar troca' : 'Rejeitar troca'}
          message={acao?.type === 'aprovar' ? 'Confirma a aprovação desta troca de plantão?' : 'Confirma a rejeição desta solicitação de troca?'}
          confirmText={acao?.type === 'aprovar' ? 'Aprovar' : 'Rejeitar'}
          variant={acao?.type === 'aprovar' ? 'secondary' : 'danger'}
          loading={actionLoading}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingBottom: 12 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  subtitle: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
  list: { padding: 16, paddingTop: 8 },
  card: { marginBottom: 12 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  info: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 4 },
  data: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', marginTop: 12 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, marginTop: 12 },
});
