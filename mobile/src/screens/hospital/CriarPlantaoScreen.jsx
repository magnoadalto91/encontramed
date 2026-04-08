import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Switch, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { plantaoService } from '../../services/plantao.service';
import { useToast } from '../../components/ui/Toast';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { COLORS } from '../../utils/constants';

// All hooks must be declared before any conditional return
export default function CriarPlantaoScreen({ navigation }) {
  const showToast = useToast();
  const [loading, setLoading] = useState(false);
  const [especialidades, setEspecialidades] = useState([]);
  const [espSelecionada, setEspSelecionada] = useState(null);
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    dataInicio: '',
    dataFim: '',
    valor: '',
    localNome: '',
    localCidade: '',
    localUf: '',
    localCep: '',
    exigeRQE: false,
    permiteBid: false,
    valorMinimoBid: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    api.get('/especialidades').then(r => setEspecialidades(r.data)).catch(() => {});
  }, []);

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.titulo.trim()) e.titulo = 'Título é obrigatório';
    if (!form.dataInicio) e.dataInicio = 'Data/hora de início obrigatória';
    if (!form.dataFim) e.dataFim = 'Data/hora de fim obrigatória';
    if (!form.valor || isNaN(parseFloat(form.valor))) e.valor = 'Valor inválido';
    if (!form.localNome.trim()) e.localNome = 'Nome do local obrigatório';
    if (!form.localCidade.trim()) e.localCidade = 'Cidade obrigatória';
    if (!form.localUf.trim()) e.localUf = 'UF obrigatória';
    if (form.permiteBid && (!form.valorMinimoBid || isNaN(parseFloat(form.valorMinimoBid)))) {
      e.valorMinimoBid = 'Valor mínimo da proposta inválido';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCriar = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        valor: parseFloat(form.valor.replace(',', '.')),
        valorMinimoBid: form.valorMinimoBid ? parseFloat(form.valorMinimoBid.replace(',', '.')) : undefined,
        especialidadeId: espSelecionada,
        dataInicio: new Date(form.dataInicio).toISOString(),
        dataFim: new Date(form.dataFim).toISOString(),
      };
      await plantaoService.criar(payload);
      showToast('Plantão publicado com sucesso!', 'success');
      navigation.goBack();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Erro ao criar plantão', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0A1628', '#0D1B2E']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Button title="← Voltar" variant="ghost" onPress={() => navigation.goBack()} size="sm" style={{ alignSelf: 'flex-start', marginBottom: 16 }} />
            <Text style={styles.title}>Publicar Plantão</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Informações gerais</Text>
              <Input label="Título" value={form.titulo} onChangeText={v => update('titulo', v)} placeholder="Ex: Plantão Clínica Geral – UTI" error={errors.titulo} />
              <Input label="Descrição (opcional)" value={form.descricao} onChangeText={v => update('descricao', v)} placeholder="Detalhes adicionais..." />

              <Text style={styles.label}>Especialidade (opcional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {especialidades.map(e => (
                  <TouchableOpacity
                    key={e.id}
                    style={[styles.espTag, espSelecionada === e.id && styles.espTagActive]}
                    onPress={() => setEspSelecionada(espSelecionada === e.id ? null : e.id)}
                  >
                    <Text style={[styles.espTagText, espSelecionada === e.id && { color: COLORS.accent }]}>{e.nome}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Data e horário</Text>
              <Input label="Início (AAAA-MM-DD HH:MM)" value={form.dataInicio} onChangeText={v => update('dataInicio', v)} placeholder="2025-06-01 08:00" error={errors.dataInicio} />
              <Input label="Fim (AAAA-MM-DD HH:MM)" value={form.dataFim} onChangeText={v => update('dataFim', v)} placeholder="2025-06-01 20:00" error={errors.dataFim} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Local</Text>
              <Input label="Nome do local / Hospital" value={form.localNome} onChangeText={v => update('localNome', v)} placeholder="Hospital São Lucas" error={errors.localNome} />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 2 }}>
                  <Input label="Cidade" value={form.localCidade} onChangeText={v => update('localCidade', v)} placeholder="São Paulo" error={errors.localCidade} />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="UF" value={form.localUf} onChangeText={v => update('localUf', v.toUpperCase())} placeholder="SP" maxLength={2} error={errors.localUf} />
                </View>
              </View>
              <Input label="CEP (opcional)" value={form.localCep} onChangeText={v => update('localCep', v)} placeholder="00000-000" keyboardType="numeric" />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Remuneração</Text>
              <Input label="Valor (R$)" value={form.valor} onChangeText={v => update('valor', v)} placeholder="800,00" keyboardType="decimal-pad" error={errors.valor} />

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Exige RQE</Text>
                  <Text style={styles.switchDesc}>Apenas médicos com RQE validado</Text>
                </View>
                <Switch value={form.exigeRQE} onValueChange={v => update('exigeRQE', v)} trackColor={{ false: COLORS.border, true: COLORS.accent }} thumbColor="#fff" />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Aceitar propostas (bid)</Text>
                  <Text style={styles.switchDesc}>Médicos podem propor outro valor</Text>
                </View>
                <Switch value={form.permiteBid} onValueChange={v => update('permiteBid', v)} trackColor={{ false: COLORS.border, true: COLORS.accent }} thumbColor="#fff" />
              </View>

              {form.permiteBid && (
                <Input label="Valor mínimo da proposta (R$)" value={form.valorMinimoBid} onChangeText={v => update('valorMinimoBid', v)} placeholder="600,00" keyboardType="decimal-pad" error={errors.valorMinimoBid} />
              )}
            </View>

            <Button title="Publicar plantão" onPress={handleCriar} loading={loading} style={{ marginTop: 8, marginBottom: 32 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 24 },
  section: { backgroundColor: '#112240', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  sectionTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 8 },
  espTag: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  espTagActive: { backgroundColor: 'rgba(38,208,206,0.15)', borderColor: COLORS.accent },
  espTagText: { color: COLORS.textMuted, fontSize: 13 },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  switchLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  switchDesc: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
});
