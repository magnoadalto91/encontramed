import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { notificacaoStore } from '../../store/notificacaoStore';
import Button from '../../components/ui/Button';
import { COLORS } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';

const TIPO_ICON = {
  NOVO_PLANTAO: '🏥',
  CANDIDATURA_ACEITA: '✅',
  CANDIDATURA_REJEITADA: '❌',
  PLANTAO_CANCELADO: '🚫',
  NOVO_BID: '💰',
  TROCA_SOLICITADA: '🔄',
  CRM_SUSPENSO: '⚠️',
  PAGAMENTO: '💳',
  SISTEMA: 'ℹ️',
};

export default function NotificacoesScreen({ navigation }) {
  const notificacoes = notificacaoStore(s => s.notificacoes);
  const fetchNotificacoes = notificacaoStore(s => s.fetchNotificacoes);
  const marcarLida = notificacaoStore(s => s.marcarLida);
  const marcarTodasLidas = notificacaoStore(s => s.marcarTodasLidas);
  const count = notificacaoStore(s => s.count);

  useEffect(() => { fetchNotificacoes(); }, []);

  return (
    <LinearGradient colors={['#0A1628', '#0D1B2E']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Button title="← Voltar" variant="ghost" onPress={() => navigation.goBack()} size="sm" style={{ alignSelf: 'flex-start' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <Text style={styles.title}>Notificações</Text>
            {count > 0 && (
              <Button title="Marcar todas lidas" variant="ghost" size="sm" onPress={marcarTodasLidas} />
            )}
          </View>
        </View>

        <FlatList
          data={notificacoes}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={fetchNotificacoes} tintColor={COLORS.accent} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.item, !item.lida && styles.itemUnread]}
              onPress={() => { if (!item.lida) marcarLida(item.id); }}
              activeOpacity={0.7}
            >
              <Text style={styles.icon}>{TIPO_ICON[item.tipo] || 'ℹ️'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.titulo}</Text>
                <Text style={styles.itemMsg}>{item.mensagem}</Text>
                <Text style={styles.itemDate}>{formatDate(item.createdAt)}</Text>
              </View>
              {!item.lida && <View style={styles.dot} />}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>🔔</Text>
              <Text style={styles.emptyText}>Nenhuma notificação</Text>
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
  list: { padding: 16, paddingTop: 8 },
  item: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#112240', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  itemUnread: { borderColor: 'rgba(38,208,206,0.4)' },
  icon: { fontSize: 22, marginRight: 12, marginTop: 2 },
  itemTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  itemMsg: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  itemDate: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent, marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, marginTop: 12 },
});
