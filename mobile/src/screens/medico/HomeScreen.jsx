import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authStore } from '../../store/authStore';
import { notificacaoStore } from '../../store/notificacaoStore';
import { plantaoService } from '../../services/plantao.service';
import { useToast } from '../../components/ui/Toast';
import PlantaoCard from '../../components/plantao/PlantaoCard';
import { LoadingScreen } from '../../components/ui/LoadingOverlay';
import { COLORS } from '../../utils/constants';
import useLocation from '../../hooks/useLocation';
import useWebSocket from '../../hooks/useWebSocket';

// Module-level cache to preserve list across navigation
const _cache = {};

export default function HomeScreen({ navigation }) {
  const user = authStore(s => s.user);
  const countNotif = notificacaoStore(s => s.count);
  const fetchCount = notificacaoStore(s => s.fetchCount);
  const showToast = useToast();

  const [plantoes, setPlantoes] = useState(_cache.plantoes || []);
  const [loading, setLoading] = useState(!_cache.plantoes);
  const [refreshing, setRefreshing] = useState(false);
  const [raio, setRaio] = useState(50);
  const [urgente, setUrgente] = useState(null); // { id, titulo, hospital }

  const { location } = useLocation();

  const carregar = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!_cache.plantoes) setLoading(true);
    try {
      const params = { raio };
      if (location) { params.lat = location.lat; params.lng = location.lng; }
      const data = await plantaoService.listarDisponiveis(params);
      const lista = data.plantoes || data;
      _cache.plantoes = lista;
      setPlantoes(lista);
    } catch (err) {
      showToast('Erro ao carregar plantões', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [location, raio]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => { fetchCount(); }, []);

  useWebSocket((msg) => {
    if (msg.type === 'novo_plantao') {
      carregar();
      if (msg.urgente) {
        setUrgente({ id: msg.plantaoId, titulo: msg.titulo, hospital: msg.hospitalNome });
      }
    }
  });

  if (loading) return <LoadingScreen message="Buscando plantões..." />;

  return (
    <LinearGradient colors={['#0A1628', '#0D1B2E']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Urgente banner */}
        {urgente && (
          <TouchableOpacity
            style={styles.urgenteBanner}
            onPress={() => { setUrgente(null); navigation.navigate('PlantaoDetail', { id: urgente.id }); }}
            activeOpacity={0.85}
          >
            <Ionicons name="flash" size={18} color="#fff" />
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <Text style={styles.urgenteTitle}>Plantão URGENTE próximo!</Text>
              <Text style={styles.urgenteSub} numberOfLines={1}>{urgente.titulo} · {urgente.hospital}</Text>
            </View>
            <TouchableOpacity onPress={() => setUrgente(null)}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá, {user?.nomeCompleto?.split(' ')[0] || 'Médico'}</Text>
            <Text style={styles.subtitle}>Plantões disponíveis</Text>
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

        {/* Raio filter */}
        <View style={styles.raioRow}>
          {[20, 50, 100, 200].map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.raioBtn, raio === r && styles.raioBtnActive]}
              onPress={() => setRaio(r)}
            >
              <Text style={[styles.raioText, raio === r && styles.raioTextActive]}>{r} km</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        <FlatList
          data={plantoes}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => carregar(true)} tintColor={COLORS.accent} />}
          renderItem={({ item }) => (
            <PlantaoCard
              plantao={item}
              showDistance={!!location}
              onPress={() => navigation.navigate('PlantaoDetail', { id: item.id })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Nenhum plantão disponível no raio de {raio} km</Text>
              <TouchableOpacity onPress={() => setRaio(200)}>
                <Text style={{ color: COLORS.accent, marginTop: 8 }}>Ampliar busca</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 8 },
  greeting: { color: '#fff', fontSize: 22, fontWeight: '800' },
  subtitle: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
  notifBtn: { position: 'relative', padding: 4 },
  badge: { position: 'absolute', top: 0, right: 0, backgroundColor: COLORS.danger, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  raioRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  raioBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  raioBtnActive: { backgroundColor: 'rgba(38,208,206,0.15)', borderColor: COLORS.accent },
  raioText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  raioTextActive: { color: COLORS.accent },
  list: { padding: 16, paddingTop: 8 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginTop: 12 },
  urgenteBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#c0392b', paddingHorizontal: 16, paddingVertical: 12,
  },
  urgenteTitle: { color: '#fff', fontSize: 13, fontWeight: '800' },
  urgenteSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
});
