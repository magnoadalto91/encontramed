import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import { COLORS } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';

function Stars({ value, onChange }) {
  return (
    <View style={styles.starsRow}>
      {[1,2,3,4,5].map(n => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} activeOpacity={0.7}>
          <Ionicons
            name={n <= value ? 'star' : 'star-outline'}
            size={40}
            color={n <= value ? '#FFD700' : COLORS.border}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const LABEL = ['', 'Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente'];

export default function AvaliacaoScreen({ route, navigation }) {
  const { plantaoId, titulo, nomeAvaliado, dataInicio } = route.params;
  const showToast = useToast();
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [loading, setLoading] = useState(false);

  const enviar = async () => {
    if (!nota) { showToast('Selecione uma nota', 'error'); return; }
    setLoading(true);
    try {
      await api.post(`/avaliacoes/${plantaoId}`, { nota, comentario: comentario.trim() || undefined });
      showToast('Avaliação enviada!', 'success');
      navigation.goBack();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Erro ao enviar avaliação', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0A1628', '#0D1B2E']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.center}>
              <Ionicons name="star-half-outline" size={48} color={COLORS.accent} style={{ marginBottom: 16 }} />
              <Text style={styles.title}>Como foi o plantão?</Text>
              <Text style={styles.subtitle}>{titulo}</Text>
              {dataInicio && <Text style={styles.date}>{formatDate(dataInicio)}</Text>}
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Avalie {nomeAvaliado}</Text>
              <Stars value={nota} onChange={setNota} />
              {nota > 0 && (
                <Text style={styles.notaLabel}>{LABEL[nota]}</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Comentário (opcional)</Text>
              <TextInput
                style={styles.textarea}
                value={comentario}
                onChangeText={setComentario}
                placeholder="Compartilhe sua experiência..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                maxLength={500}
                numberOfLines={4}
              />
              <Text style={styles.counter}>{comentario.length}/500</Text>
            </View>

            <Button
              title="Enviar avaliação"
              onPress={enviar}
              loading={loading}
              disabled={!nota}
              style={{ marginTop: 8, marginBottom: 32 }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20 },
  backBtn: { padding: 4, marginBottom: 16 },
  center: { alignItems: 'center', marginBottom: 24 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: COLORS.accent, fontSize: 14, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  date: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
  card: { backgroundColor: '#112240', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  label: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  notaLabel: { color: '#FFD700', fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 12 },
  textarea: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    padding: 14, color: '#fff', fontSize: 14, minHeight: 100, textAlignVertical: 'top',
  },
  counter: { color: COLORS.textMuted, fontSize: 11, textAlign: 'right', marginTop: 6 },
});
