import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { COLORS } from '../../utils/constants';

function maskPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
}

function maskCNPJ(v) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

// ⚠️ ALL hooks BEFORE any conditional return
export default function RegisterScreen({ navigation }) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [crmValidando, setCrmValidando] = useState(false);
  const [crmValidado, setCrmValidado] = useState(null); // dados da CFM após validação
  const [form, setForm] = useState({ nomeCompleto: '', email: '', senha: '', telefone: '', crm: '', crmUf: '', cnpj: '' });
  const [errors, setErrors] = useState({});
  const showToast = useToast();

  const update = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    // Reset CRM validation when CRM/UF changes
    if (key === 'crm' || key === 'crmUf') setCrmValidado(null);
  };

  const validate = () => {
    const e = {};
    if (!form.nomeCompleto.trim()) e.nomeCompleto = 'Nome é obrigatório';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'E-mail inválido';
    if (!form.senha || form.senha.length < 8) e.senha = 'Mínimo 8 caracteres';
    if (role === 'MEDICO') {
      if (!form.crm.trim()) e.crm = 'CRM é obrigatório';
      if (!form.crmUf.trim()) e.crmUf = 'UF é obrigatória';
    }
    if (role === 'HOSPITAL') {
      if (!form.cnpj.replace(/\D/g,'') || form.cnpj.replace(/\D/g,'').length < 14) e.cnpj = 'CNPJ inválido';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleValidarCrm = async () => {
    if (!form.crm.trim() || !form.crmUf.trim()) {
      setErrors(e => ({ ...e, crm: !form.crm.trim() ? 'Informe o CRM' : e.crm, crmUf: !form.crmUf.trim() ? 'Informe a UF' : e.crmUf }));
      return;
    }
    setCrmValidando(true);
    setCrmValidado(null);
    try {
      const { data } = await api.get(`/crm/validar?crm=${form.crm.replace(/\D/g,'')}&uf=${form.crmUf}`);
      setCrmValidado(data);
      // Auto-fill name from CFM if empty
      if (!form.nomeCompleto.trim() && data.nome) {
        update('nomeCompleto', data.nome);
      }
      showToast(`CRM validado: ${data.situacao === 'ATIVO' ? '✅ Ativo' : '⚠️ ' + data.situacao}`, data.situacao === 'ATIVO' ? 'success' : 'warning');
    } catch (err) {
      showToast(err?.message || 'Não foi possível validar o CRM', 'error');
    } finally {
      setCrmValidando(false);
    }
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { ...form, role });
      showToast(res?.data?.message || 'Conta criada! Faça login para continuar.', 'success', 5000);
      navigation.navigate('Login');
    } catch (err) {
      showToast(err?.message || 'Erro ao criar conta', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0A1628', '#0D1B2E']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Button title="← Voltar" variant="ghost" onPress={() => navigation.goBack()} size="sm" style={{ alignSelf: 'flex-start' }} />
              <Text style={styles.title}>Criar conta</Text>
              <Text style={styles.subtitle}>Escolha seu tipo de acesso</Text>
            </View>

            {/* Role selection */}
            {!role && (
              <View style={styles.roleGrid}>
                <TouchableOpacity style={styles.roleCard} onPress={() => setRole('MEDICO')} activeOpacity={0.7}>
                  <Text style={styles.roleIcon}>👨‍⚕️</Text>
                  <Text style={styles.roleTitle}>Sou Médico</Text>
                  <Text style={styles.roleDesc}>Acesse plantões disponíveis na sua região</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.roleCard} onPress={() => setRole('HOSPITAL')} activeOpacity={0.7}>
                  <Text style={styles.roleIcon}>🏥</Text>
                  <Text style={styles.roleTitle}>Sou Hospital</Text>
                  <Text style={styles.roleDesc}>Publique plantões e gerencie escalas</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Form */}
            {role && (
              <View style={styles.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                  <TouchableOpacity onPress={() => { setRole(null); setCrmValidado(null); }} style={{ marginRight: 12 }}>
                    <Text style={{ color: COLORS.accent, fontSize: 14 }}>← Voltar</Text>
                  </TouchableOpacity>
                  <Text style={styles.roleSelected}>{role === 'MEDICO' ? '👨‍⚕️ Médico' : '🏥 Hospital'}</Text>
                </View>

                {/* CRM first for médicos — pre-fills name from CFM */}
                {role === 'MEDICO' && (
                  <>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
                      <View style={{ flex: 2 }}>
                        <Input label="CRM" value={form.crm} onChangeText={v => update('crm', v.replace(/\D/g,''))} placeholder="123456" keyboardType="numeric" error={errors.crm} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Input label="UF" value={form.crmUf} onChangeText={v => update('crmUf', v.toUpperCase())} placeholder="SP" maxLength={2} error={errors.crmUf} autoCapitalize="characters" />
                      </View>
                      <TouchableOpacity
                        style={[styles.validateBtn, crmValidado && { backgroundColor: COLORS.success }]}
                        onPress={handleValidarCrm}
                        disabled={crmValidando}
                      >
                        {crmValidando
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{crmValidado ? '✓ OK' : 'Validar'}</Text>
                        }
                      </TouchableOpacity>
                    </View>

                    {/* CFM data preview */}
                    {crmValidado && (
                      <View style={styles.cfmCard}>
                        <Text style={styles.cfmTitle}>✅ Dados da CFM</Text>
                        {crmValidado.nome && <Text style={styles.cfmRow}><Text style={styles.cfmLabel}>Nome: </Text>{crmValidado.nome}</Text>}
                        <Text style={styles.cfmRow}><Text style={styles.cfmLabel}>Situação: </Text>
                          <Text style={{ color: crmValidado.situacao === 'ATIVO' ? COLORS.success : COLORS.warning }}>{crmValidado.situacao}</Text>
                        </Text>
                        {crmValidado.especialidades?.length > 0 && (
                          <Text style={styles.cfmRow}>
                            <Text style={styles.cfmLabel}>Especialidades: </Text>
                            {crmValidado.especialidades.map(e => e.nome + (e.rqe ? ` (RQE ${e.rqe})` : '')).join(', ')}
                          </Text>
                        )}
                      </View>
                    )}
                  </>
                )}

                <Input label="Nome completo" value={form.nomeCompleto} onChangeText={v => update('nomeCompleto', v)} placeholder="Dr. João Silva" error={errors.nomeCompleto} />
                <Input label="E-mail" value={form.email} onChangeText={v => update('email', v)} placeholder="seu@email.com" keyboardType="email-address" error={errors.email} />
                <Input label="Senha" value={form.senha} onChangeText={v => update('senha', v)} placeholder="Mínimo 8 caracteres" secureTextEntry error={errors.senha} />
                <Input label="Telefone (opcional)" value={form.telefone} onChangeText={v => update('telefone', maskPhone(v))} placeholder="(11) 99999-9999" keyboardType="phone-pad" />

                {role === 'HOSPITAL' && (
                  <Input label="CNPJ" value={form.cnpj} onChangeText={v => update('cnpj', maskCNPJ(v))} placeholder="00.000.000/0000-00" keyboardType="numeric" error={errors.cnpj} />
                )}

                <Button title="Criar conta" onPress={handleRegister} loading={loading} style={{ marginTop: 8 }} />
              </View>
            )}

            <View style={styles.loginArea}>
              <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>Já tem conta? </Text>
              <Button title="Fazer login" variant="ghost" onPress={() => navigation.navigate('Login')} size="sm" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 24 },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 16, marginBottom: 4 },
  subtitle: { color: COLORS.textMuted, fontSize: 15 },
  roleGrid: { gap: 16, marginBottom: 32 },
  roleCard: {
    backgroundColor: '#112240', borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  roleIcon: { fontSize: 48, marginBottom: 12 },
  roleTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 6 },
  roleDesc: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  card: {
    backgroundColor: '#112240', borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 24,
  },
  roleSelected: { color: COLORS.accent, fontSize: 16, fontWeight: '600' },
  loginArea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingBottom: 24 },
  validateBtn: {
    backgroundColor: COLORS.blue, borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 12, marginBottom: 2, alignItems: 'center', justifyContent: 'center',
  },
  cfmCard: {
    backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)', marginBottom: 16, marginTop: 4,
  },
  cfmTitle: { color: COLORS.success, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  cfmRow: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 4, lineHeight: 18 },
  cfmLabel: { color: COLORS.textMuted, fontWeight: '600' },
});
