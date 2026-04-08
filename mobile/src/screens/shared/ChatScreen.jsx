import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { authStore } from '../../store/authStore';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { COLORS } from '../../utils/constants';
import useWebSocket from '../../hooks/useWebSocket';

function pad(n) { return String(n).padStart(2, '0'); }
function fmtTime(iso) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtDate(iso) {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
}

export default function ChatScreen({ route, navigation }) {
  const { plantaoId, titulo, hospitalNome } = route.params;
  const user = authStore(s => s.user);
  const showToast = useToast();
  const flatRef = useRef(null);

  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await api.get(`/chat/plantao/${plantaoId}`);
      setMensagens(r.data);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
    } catch {
      showToast('Erro ao carregar mensagens', 'error');
    }
  }, [plantaoId]);

  useEffect(() => { carregar(); }, []);

  useWebSocket((msg) => {
    if (msg.type === 'nova_mensagem_chat' && msg.plantaoId === plantaoId) {
      setMensagens(prev => [...prev, msg.mensagem]);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  });

  const enviar = async () => {
    const t = texto.trim();
    if (!t) return;
    setTexto('');
    setEnviando(true);
    try {
      const r = await api.post(`/chat/plantao/${plantaoId}`, { texto: t });
      setMensagens(prev => [...prev, r.data]);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Erro ao enviar', 'error');
      setTexto(t); // restore on error
    } finally {
      setEnviando(false);
    }
  };

  const renderMsg = ({ item, index }) => {
    const mine = item.autor.id === user.id;
    const prev = index > 0 ? mensagens[index-1] : null;
    const showDate = !prev || fmtDate(item.criadoEm) !== fmtDate(prev.criadoEm);
    return (
      <>
        {showDate && (
          <View style={styles.dateDivider}>
            <View style={styles.dateLine} />
            <Text style={styles.dateText}>{fmtDate(item.criadoEm)}</Text>
            <View style={styles.dateLine} />
          </View>
        )}
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
          {!mine && <Text style={styles.bubbleAuthor}>{item.autor.nomeCompleto}</Text>}
          <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.texto}</Text>
          <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>{fmtTime(item.criadoEm)}</Text>
        </View>
      </>
    );
  };

  return (
    <LinearGradient colors={['#0A1628', '#0D1B2E']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle} numberOfLines={1}>{titulo || 'Chat'}</Text>
              <Text style={styles.headerSub} numberOfLines={1}>{hospitalNome || 'Plantão'}</Text>
            </View>
          </View>

          {/* Messages */}
          <FlatList
            ref={flatRef}
            data={mensagens}
            keyExtractor={item => String(item.id)}
            renderItem={renderMsg}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>Nenhuma mensagem ainda.</Text>
                <Text style={styles.emptySubtext}>Inicie a conversa sobre este plantão.</Text>
              </View>
            }
          />

          {/* Input */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={texto}
              onChangeText={setTexto}
              placeholder="Digite uma mensagem..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={1000}
              onSubmitEditing={enviar}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!texto.trim() || enviando) && styles.sendBtnDisabled]}
              onPress={enviar}
              disabled={!texto.trim() || enviando}
              activeOpacity={0.8}
            >
              <Ionicons name="send" size={18} color={texto.trim() ? '#0A1628' : COLORS.textMuted} />
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 6, marginRight: 8 },
  headerInfo: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  listContent: { padding: 16, paddingBottom: 8, flexGrow: 1 },

  dateDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  dateLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dateText: { color: COLORS.textMuted, fontSize: 11, marginHorizontal: 10 },

  bubble: {
    maxWidth: '80%', marginVertical: 3, padding: 10, borderRadius: 14,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.accent,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: '#1A2E4A',
    borderBottomLeftRadius: 4,
  },
  bubbleAuthor: { color: COLORS.accent, fontSize: 11, fontWeight: '700', marginBottom: 3 },
  bubbleText: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20 },
  bubbleTextMine: { color: '#0A1628' },
  bubbleTime: { color: 'rgba(150,170,200,0.7)', fontSize: 10, marginTop: 4, textAlign: 'right' },
  bubbleTimeMine: { color: 'rgba(10,22,40,0.6)' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600' },
  emptySubtext: { color: COLORS.border, fontSize: 13 },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: 12, paddingBottom: 16,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 10,
    color: '#fff', fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44,
    backgroundColor: COLORS.accent,
    borderRadius: 22, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.border },
});
