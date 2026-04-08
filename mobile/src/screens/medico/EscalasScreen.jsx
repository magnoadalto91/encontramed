import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { LoadingScreen } from '../../components/ui/LoadingOverlay';
import { COLORS } from '../../utils/constants';
import { formatDate, formatTime } from '../../utils/formatters';

const TIPO_LABEL = {
  SEMANAL: 'Semanal',
  QUINZENAL: 'Quinzenal',
  MENSAL: 'Mensal',
  PERSONALIZADO: 'Personalizado',
};

export default function EscalasScreen({ navigation }) {
  const showToast = useToast();
  const [escalas, setEscalas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregar = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { data } = await api.get('/escalas/minhas');
      setEscalas(data.escalas || data);
    } catch {
      showToast('Erro ao carregar escalas', 'error');
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
          <Text style={styles.title}>Minhas Escalas</Text>
          <Text style={styles.subtitle}>Plantões recorrentes confirmados</Text>
        </View>

        <FlatList
          data={escalas}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => carregar(true)} tintColor={COLORS.accent} />}
          renderItem={({ item }) => <EscalaCard escala={item} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>📅</Text>
              <Text style={styles.emptyText}>Nenhuma escala ativa</Text>
              <Text style={styles.emptyHint}>Escalas recorrentes aparecem aqui quando confirmadas pelo hospital</Text>
            </View>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

function EscalaCard({ escala }) {
  const config = escala.configuracao || {};
  return (
    <Card style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={styles.cardTitle}>{escala.nome || escala.hospital?.nomeFantasia}</Text>
        <Badge label={TIPO_LABEL[escala.tipo] || escala.tipo} variant="accent" size="sm" />
      </View>
      <Text style={styles.hospital}>{escala.hospital?.nomeFantasia}</Text>
      {config.horaInicio && (
        <Text style={styles.info}>⏰ {config.horaInicio} – {config.horaFim}</Text>
      )}
      <Text style={styles.info}>📋 {escala._count?.plantoes || 0} plantões gerados</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingBottom: 12 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  subtitle: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
  list: { padding: 16, paddingTop: 8 },
  card: { marginBottom: 12 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  hospital: { color: COLORS.accent, fontSize: 13, marginBottom: 8 },
  info: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 4 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600', marginTop: 12 },
  emptyHint: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 },
});
