import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, Switch, TouchableOpacity, TextInput, Modal, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { plantaoService } from '../../services/plantao.service';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import DateTimePicker from '../../components/ui/DateTimePicker';
import { COLORS } from '../../utils/constants';

// ─── Especialidade Search Modal ───────────────────────────────────────────────
function EspecialidadeModal({ visible, especialidades, onSelect, onClose }) {
  const [busca, setBusca] = useState('');
  const filtradas = especialidades.filter(e =>
    e.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Especialidade</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={modalStyles.searchRow}>
            <Ionicons name="search-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={modalStyles.searchInput}
              value={busca}
              onChangeText={setBusca}
              placeholder="Buscar especialidade..."
              placeholderTextColor={COLORS.textMuted}
              autoFocus
            />
          </View>
          <FlatList
            data={filtradas}
            keyExtractor={e => String(e.id)}
            style={{ maxHeight: 380 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={modalStyles.item} onPress={() => { onSelect(item); onClose(); }}>
                <Text style={modalStyles.itemNome}>{item.nome}</Text>
                <Text style={modalStyles.itemCodigo}>{item.codigo}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={{ color: COLORS.textMuted, textAlign: 'center', padding: 20 }}>
                Nenhuma especialidade encontrada
              </Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

function formatCep(v) {
  const digits = v.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return digits;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CriarPlantaoScreen({ navigation }) {
  const showToast = useToast();
  const [loading, setLoading] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [especialidades, setEspecialidades] = useState([]);
  const [espSelecionada, setEspSelecionada] = useState(null);
  const [showEspModal, setShowEspModal] = useState(false);
  const [tipoValor, setTipoValor] = useState('FIXO'); // 'FIXO' | 'POR_HORA'
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    dataInicio: null,  // Date object
    dataFim: null,     // Date object
    valor: '',
    valorMinimoBid: '',
    localCep: '',
    localNome: '',
    localCidade: '',
    localUf: '',
    exigeRQE: false,
    permiteBid: false,
    urgente: false,
  });
  const [errors, setErrors] = useState({});

  const buscarCep = async (cep) => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setBuscandoCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const d = await r.json();
      if (d.erro) { showToast('CEP não encontrado', 'error'); return; }
      setForm(prev => ({
        ...prev,
        localNome: prev.localNome || d.logradouro || '',
        localCidade: d.localidade || prev.localCidade,
        localUf: d.uf || prev.localUf,
      }));
    } catch {
      showToast('Erro ao buscar CEP', 'error');
    } finally {
      setBuscandoCep(false);
    }
  };

  useEffect(() => {
    api.get('/especialidades').then(r => setEspecialidades(r.data)).catch(() => {});
  }, []);

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.titulo.trim()) e.titulo = 'Título é obrigatório';
    if (!espSelecionada) e.especialidade = 'Selecione uma especialidade';
    if (!form.dataInicio) e.dataInicio = 'Data/hora de início obrigatória';
    if (!form.dataFim) e.dataFim = 'Data/hora de fim obrigatória';
    if (form.dataInicio && form.dataFim && form.dataFim <= form.dataInicio) {
      e.dataFim = 'Data de fim deve ser após o início';
    }
    if (!form.valor || isNaN(parseFloat(form.valor.replace(',', '.')))) e.valor = 'Valor inválido';
    if (!form.localNome.trim()) e.localNome = 'Nome do local obrigatório';
    if (!form.localCidade.trim()) e.localCidade = 'Cidade obrigatória';
    if (!form.localUf.trim()) e.localUf = 'UF obrigatória';
    if (form.permiteBid && (!form.valorMinimoBid || isNaN(parseFloat(form.valorMinimoBid.replace(',', '.'))))) {
      e.valorMinimoBid = 'Valor mínimo inválido';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCriar = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await plantaoService.criar({
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || undefined,
        especialidadeId: espSelecionada.id,
        dataInicio: form.dataInicio.toISOString(),
        dataFim: form.dataFim.toISOString(),
        valorBase: parseFloat(form.valor.replace(',', '.')),
        tipoValor,
        valorMinimoBid: form.permiteBid ? parseFloat(form.valorMinimoBid.replace(',', '.')) : undefined,
        localNome: form.localNome.trim(),
        localCidade: form.localCidade.trim(),
        localUf: form.localUf.trim().toUpperCase(),
        localCep: form.localCep.trim() || undefined,
        exigeRQE: form.exigeRQE,
        permiteBid: form.permiteBid,
        urgente: form.urgente,
      });
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

            {/* Header */}
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.pageTitle}>Publicar Plantão</Text>
            </View>

            {/* Informações Gerais */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text-outline" size={15} color={COLORS.textMuted} />
                <Text style={styles.sectionTitle}>Informações Gerais</Text>
              </View>
              <Input label="Título" value={form.titulo} onChangeText={v => update('titulo', v)} placeholder="Ex: Plantão UTI — 12h" error={errors.titulo} />
              <Input label="Descrição (opcional)" value={form.descricao} onChangeText={v => update('descricao', v)} placeholder="Detalhes adicionais..." multiline />

              {/* Especialidade */}
              <Text style={styles.inputLabel}>Especialidade <Text style={{ color: COLORS.danger }}>*</Text></Text>
              <TouchableOpacity style={[styles.selectField, errors.especialidade && styles.selectFieldError]} onPress={() => setShowEspModal(true)} activeOpacity={0.7}>
                <Ionicons name="medical-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />
                <Text style={[styles.selectText, !espSelecionada && styles.selectPlaceholder]}>
                  {espSelecionada ? espSelecionada.nome : 'Selecionar especialidade...'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
              {errors.especialidade ? <Text style={styles.errorText}>{errors.especialidade}</Text> : null}
            </View>

            {/* Data e horário */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar-outline" size={15} color={COLORS.textMuted} />
                <Text style={styles.sectionTitle}>Data e Horário</Text>
              </View>
              <DateTimePicker
                label="Início"
                value={form.dataInicio}
                onChange={v => update('dataInicio', v)}
                error={errors.dataInicio}
              />
              <DateTimePicker
                label="Fim"
                value={form.dataFim}
                onChange={v => update('dataFim', v)}
                error={errors.dataFim}
                minDate={form.dataInicio}
              />
              {form.dataInicio && form.dataFim && form.dataFim > form.dataInicio && (
                <View style={styles.duracaoChip}>
                  <Ionicons name="time-outline" size={14} color={COLORS.accent} />
                  <Text style={styles.duracaoText}>
                    Duração: {((form.dataFim - form.dataInicio) / 3600000).toFixed(1)}h
                  </Text>
                </View>
              )}
            </View>

            {/* Local */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="location-outline" size={15} color={COLORS.textMuted} />
                <Text style={styles.sectionTitle}>Local</Text>
              </View>

              {/* CEP primeiro com busca automática */}
              <Text style={styles.inputLabel}>CEP</Text>
              <View style={styles.cepRow}>
                <TextInput
                  style={[styles.cepInput, errors.localCep && styles.cepInputError]}
                  value={form.localCep}
                  onChangeText={v => {
                    const masked = formatCep(v);
                    update('localCep', masked);
                    if (masked.replace(/\D/g,'').length === 8) buscarCep(masked);
                  }}
                  placeholder="00000-000"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  maxLength={9}
                />
                {buscandoCep
                  ? <Ionicons name="reload-outline" size={18} color={COLORS.accent} style={styles.cepIcon} />
                  : <Ionicons name="search-outline" size={18} color={COLORS.textMuted} style={styles.cepIcon} />
                }
              </View>
              {errors.localCep ? <Text style={styles.errorText}>{errors.localCep}</Text> : null}

              <Input label="Nome do local / Hospital" value={form.localNome} onChangeText={v => update('localNome', v)} placeholder="Hospital São Lucas" error={errors.localNome} />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 2 }}>
                  <Input label="Cidade" value={form.localCidade} onChangeText={v => update('localCidade', v)} placeholder="São Paulo" error={errors.localCidade} />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="UF" value={form.localUf} onChangeText={v => update('localUf', v.toUpperCase())} placeholder="SP" maxLength={2} error={errors.localUf} />
                </View>
              </View>
            </View>

            {/* Remuneração */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="cash-outline" size={15} color={COLORS.textMuted} />
                <Text style={styles.sectionTitle}>Remuneração</Text>
              </View>

              {/* Tipo de valor */}
              <View style={styles.tipoRow}>
                <TouchableOpacity
                  style={[styles.tipoBtn, tipoValor === 'FIXO' && styles.tipoBtnActive]}
                  onPress={() => setTipoValor('FIXO')}
                >
                  <Ionicons name="checkmark-circle" size={16} color={tipoValor === 'FIXO' ? '#0A1628' : COLORS.textMuted} />
                  <Text style={[styles.tipoBtnText, tipoValor === 'FIXO' && styles.tipoBtnTextActive]}>Valor fixo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tipoBtn, tipoValor === 'POR_HORA' && styles.tipoBtnActive]}
                  onPress={() => setTipoValor('POR_HORA')}
                >
                  <Ionicons name="time-outline" size={16} color={tipoValor === 'POR_HORA' ? '#0A1628' : COLORS.textMuted} />
                  <Text style={[styles.tipoBtnText, tipoValor === 'POR_HORA' && styles.tipoBtnTextActive]}>Valor/hora</Text>
                </TouchableOpacity>
              </View>

              <Input
                label={tipoValor === 'FIXO' ? 'Valor total (R$)' : 'Valor por hora (R$/h)'}
                value={form.valor}
                onChangeText={v => update('valor', v)}
                placeholder={tipoValor === 'FIXO' ? '800,00' : '120,00'}
                keyboardType="decimal-pad"
                error={errors.valor}
              />

              {tipoValor === 'POR_HORA' && form.dataInicio && form.dataFim && form.dataFim > form.dataInicio && form.valor && !isNaN(parseFloat(form.valor.replace(',','.'))) && (
                <View style={styles.calcChip}>
                  <Ionicons name="calculator-outline" size={14} color={COLORS.success} />
                  <Text style={styles.calcText}>
                    Total estimado: R$ {(parseFloat(form.valor.replace(',','.')) * ((form.dataFim - form.dataInicio) / 3600000)).toFixed(2).replace('.', ',')}
                  </Text>
                </View>
              )}

              <SwitchRow icon="ribbon-outline" label="Exige RQE" desc="Apenas médicos com RQE validado" value={form.exigeRQE} onChange={v => update('exigeRQE', v)} />
              <SwitchRow icon="trending-up-outline" label="Aceitar propostas (bid)" desc="Médicos podem propor outro valor" value={form.permiteBid} onChange={v => update('permiteBid', v)} />
              {form.permiteBid && (
                <Input label="Valor mínimo da proposta (R$)" value={form.valorMinimoBid} onChangeText={v => update('valorMinimoBid', v)} placeholder="600,00" keyboardType="decimal-pad" error={errors.valorMinimoBid} />
              )}
              <SwitchRow icon="flash-outline" label="Urgente" desc="Notifica médicos próximos imediatamente" value={form.urgente} onChange={v => update('urgente', v)} />
            </View>

            <Button title="Publicar plantão" onPress={handleCriar} loading={loading} style={{ marginTop: 8, marginBottom: 32 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <EspecialidadeModal
        visible={showEspModal}
        especialidades={especialidades}
        onSelect={setEspSelecionada}
        onClose={() => setShowEspModal(false)}
      />
    </LinearGradient>
  );
}

function SwitchRow({ icon, label, desc, value, onChange }) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchLeft}>
        <Ionicons name={icon} size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.switchLabel}>{label}</Text>
          <Text style={styles.switchDesc}>{desc}</Text>
        </View>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: COLORS.border, true: COLORS.accent }} thumbColor="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20 },
  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 8 },
  backBtn: { padding: 4 },
  pageTitle: { color: '#fff', fontSize: 22, fontWeight: '800', flex: 1 },

  section: { backgroundColor: '#112240', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  sectionTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  inputLabel: { color: '#C9D4E8', fontSize: 13, fontWeight: '500', marginBottom: 6 },
  cepRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, marginBottom: 16 },
  cepInput: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 13 },
  cepInputError: { borderColor: '#FF6B6B' },
  cepIcon: { marginLeft: 8 },
  selectField: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14, paddingVertical: 13, marginBottom: 16,
  },
  selectFieldError: { borderColor: '#FF6B6B' },
  selectText: { flex: 1, color: '#fff', fontSize: 15 },
  selectPlaceholder: { color: COLORS.textMuted },
  errorText: { color: '#FF6B6B', fontSize: 12, marginTop: -12, marginBottom: 12 },

  duracaoChip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  duracaoText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },

  tipoRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  tipoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  tipoBtnActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  tipoBtnText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  tipoBtnTextActive: { color: '#0A1628' },

  calcChip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, padding: 10, backgroundColor: 'rgba(46,213,115,0.08)', borderRadius: 8 },
  calcText: { color: COLORS.success, fontSize: 13, fontWeight: '600' },

  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  switchLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  switchLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  switchDesc: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#112240', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { color: '#fff', fontSize: 16, fontWeight: '700' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemNome: { color: '#fff', fontSize: 14, flex: 1 },
  itemCodigo: { color: COLORS.textMuted, fontSize: 12, marginLeft: 8 },
});
