import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { plantaoService } from '../../services/plantao.service';
import { useToast } from '../../components/ui/Toast';
import PlantaoCard from '../../components/plantao/PlantaoCard';
import { LoadingScreen } from '../../components/ui/LoadingOverlay';
import { COLORS } from '../../utils/constants';

const FILTERS = [
  { key: null, label: 'Todos' },
  { key: 'CONFIRMADO', label: 'Confirmados' },
  { key: 'EM_ANDAMENTO', label: 'Em andamento' },
  { key: 'REALIZADO', label: 'Realizados' },
  { key: 'CANCELADO', label: 'Cancelados' },
];

const _cache = {};

export default function MeusPlantoesScreen({ navigation }) {
  const showToast = useToast();
  const [status, setStatus] = useState(null);
  const [plantoes, setPlantoes] = useState(_cache[status] || []);
  const [loading, setLoading] = useState(!_cache[status]);
  const [refreshing, setRefreshing] = useState(false);

  const carregar = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!_cache[status]) setLoading(true);
    try {
      const params = status ? { status } : {};
      const data = await plantaoService.listarMeusPlantoes(params);
      const lista = data.plantoes || data;
      _cache[status] = lista;
      setPlantoes(lista);
    } catch {
      showToast('Erro ao carregar plantões', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status]);

  useEffect(() => {
    setPlantoes(_cache[status] || []);
    if (!_cache[status]) setLoading(true);
    carregar();
  }, [status]);

  if (loading && !plantoes.length) return <LoadingScreen />;

  return (
    <LinearGradient colors={['#0A1628', '#0D1B2E']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Meus Plantões</Text>
        </View>

        {/* Filter tabs */}
        <View style={styles.filters}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={String(f.key)}
              style={[styles.filterBtn, status === f.key && styles.filterBtnActive]}
              onPress={() => setStatus(f.key)}
            >
              <Text style={[styles.filterText, status === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={plantoes}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => carregar(true)} tintColor={COLORS.accent} />}
          renderItem={({ item }) => (
            <PlantaoCard
              plantao={item}
              onPress={() => navigation.navigate('PlantaoDetail', { id: item.id })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Nenhum plantão encontrado</Text>
            </View>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingBottom: 8 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  filters: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexWrap: 'wrap' },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  filterBtnActive: { backgroundColor: 'rgba(38,208,206,0.15)', borderColor: COLORS.accent },
  filterText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: COLORS.accent },
  list: { padding: 16, paddingTop: 8 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, marginTop: 12 },
});
