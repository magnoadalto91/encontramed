import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { COLORS } from '../../utils/constants';
import { getLogBuffer } from '../../utils/logBuffer';

// All hooks before any conditional return
export default function SuporteScreen({ navigation }) {
  const showToast = useToast();
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [form, setForm] = useState({ titulo: '', descricao: '' });
  const [errors, setErrors] = useState({});
  const [incluirLog, setIncluirLog] = useState(false); // LGPD — opt-in desligado por padrão

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.titulo.trim()) e.titulo = 'Título obrigatório';
    if (!form.descricao.trim() || form.descricao.length < 20) e.descricao = 'Descreva o problema (mínimo 20 caracteres)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleEnviar = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),
        logDiagnostico: incluirLog ? { erros: getLogBuffer() } : null,
      };
      await api.post('/chamados', payload);
      showToast('Chamado enviado! Responderemos em breve.', 'success', 5000);
      setEnviado(true);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Erro ao enviar chamado', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <LinearGradient colors={['#0A1628', '#0D1B2E']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 64, marginBottom: 20 }}>✅</Text>
          <Text style={styles.title}>Chamado enviado!</Text>
          <Text style={styles.successText}>Nossa equipe responderá o mais breve possível. Você pode acompanhar pelo e-mail cadastrado.</Text>
          <Button title="Voltar" onPress={() => navigation.goBack()} style={{ marginTop: 28 }} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0A1628', '#0D1B2E']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Button title="← Voltar" variant="ghost" onPress={() => navigation.goBack()} size="sm" style={{ alignSelf: 'flex-start', marginBottom: 20 }} />
            <Text style={styles.title}>Suporte</Text>
            <Text style={styles.subtitle}>Descreva seu problema e nossa equipe responderá em breve.</Text>

            <View style={styles.card}>
              <Input
                label="Título do problema"
                value={form.titulo}
                onChangeText={v => update('titulo', v)}
                placeholder="Ex: Não consigo fazer candidatura"
                error={errors.titulo}
              />
              <Input
                label="Descrição detalhada"
                value={form.descricao}
                onChangeText={v => update('descricao', v)}
                placeholder="Descreva o que aconteceu, quando ocorreu, e o que você tentou fazer..."
                error={errors.descricao}
                {...{ multiline: true, numberOfLines: 5, textAlignVertical: 'top', style: { minHeight: 120 } }}
              />

              {/* LGPD — consentimento explícito para log de diagnóstico */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Incluir log de diagnóstico</Text>
                  <Text style={styles.switchDesc}>
                    Dados técnicos anônimos do app para auxiliar no diagnóstico. Sem dados pessoais.
                  </Text>
                </View>
                <Switch
                  value={incluirLog}
                  onValueChange={setIncluirLog}
                  trackColor={{ false: COLORS.border, true: COLORS.accent }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            <Button title="Enviar chamado" onPress={handleEnviar} loading={loading} style={{ marginTop: 8 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: COLORS.textMuted, fontSize: 14, marginBottom: 24, lineHeight: 22, textAlign: 'center' },
  successText: { color: COLORS.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 8 },
  card: { backgroundColor: '#112240', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 16, marginTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  switchLabel: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  switchDesc: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },
});
