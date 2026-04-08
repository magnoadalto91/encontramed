import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authStore } from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';
import { ConfirmModal } from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import { COLORS } from '../../utils/constants';

function maskCNPJ(v) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export default function PerfilHospitalScreen({ navigation }) {
  const user = authStore(s => s.user);
  const logout = authStore(s => s.logout);
  const showToast = useToast();
  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const hospital = user?.hospital;
  const cnes = hospital?.cnesDados;

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await logout(); }
    catch { showToast('Erro ao sair', 'error'); }
    finally { setLoggingOut(false); setShowLogout(false); }
  };

  return (
    <LinearGradient colors={['#0A1628', '#0D1B2E']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>

          {/* Avatar */}
          <View style={styles.avatarArea}>
            <View style={styles.avatar}>
              <Text style={{ fontSize: 36 }}>🏥</Text>
            </View>
            <Text style={styles.nome}>{hospital?.nomeFantasia || hospital?.razaoSocial || 'Hospital'}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <Badge
              label={hospital?.verificado ? 'Verificado' : 'Aguardando verificação'}
              variant={hospital?.verificado ? 'success' : 'warning'}
              size="sm"
            />
          </View>

          {/* Dados básicos */}
          {hospital && (
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Dados do Hospital</Text>
              {hospital.razaoSocial    && <InfoRow label="Razão Social"  value={hospital.razaoSocial} />}
              {hospital.cnpj           && <InfoRow label="CNPJ"          value={maskCNPJ(hospital.cnpj)} />}
              {hospital.codigoCNES     && <InfoRow label="CNES"          value={hospital.codigoCNES} />}
              {hospital.tipoEstabelecimento && <InfoRow label="Tipo"     value={hospital.tipoEstabelecimento} />}
              {hospital.telefoneContato && <InfoRow label="Telefone"     value={hospital.telefoneContato} />}
              {hospital.enderecoCidade && (
                <InfoRow label="Localização"
                  value={`${hospital.enderecoCidade}${hospital.enderecoEstado ? ' – ' + hospital.enderecoEstado : ''}`}
                />
              )}
            </Card>
          )}

          {/* Dados CNES — leitos e equipamentos */}
          {cnes && (
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Dados do CNES / Receita Federal</Text>

              {cnes.leitos && (
                <>
                  <Text style={styles.subTitle}>🛏 Leitos</Text>
                  <View style={styles.leitosRow}>
                    <LeitoStat label="Total" value={cnes.leitos.total} />
                    <LeitoStat label="SUS" value={cnes.leitos.sus} color={COLORS.success} />
                    <LeitoStat label="Não-SUS" value={cnes.leitos.naoSus} color={COLORS.textMuted} />
                    {cnes.leitos.contratados > 0 && (
                      <LeitoStat label="Contrat." value={cnes.leitos.contratados} color={COLORS.accent} />
                    )}
                  </View>
                  {cnes.leitos.detalhes?.length > 0 && (
                    <View style={{ marginTop: 8 }}>
                      {cnes.leitos.detalhes.slice(0, 8).map((l, i) => (
                        <View key={i} style={styles.leitoItem}>
                          <Text style={styles.leitoNome} numberOfLines={1}>{l.tipo}</Text>
                          <Text style={styles.leitoQtd}>{l.existentes}</Text>
                        </View>
                      ))}
                      {cnes.leitos.detalhes.length > 8 && (
                        <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4 }}>
                          +{cnes.leitos.detalhes.length - 8} tipos
                        </Text>
                      )}
                    </View>
                  )}
                </>
              )}

              {cnes.equipamentos?.length > 0 && (
                <>
                  <Text style={[styles.subTitle, { marginTop: 16 }]}>🔬 Equipamentos</Text>
                  {cnes.equipamentos.slice(0, 10).map((e, i) => (
                    <View key={i} style={styles.leitoItem}>
                      <Text style={styles.leitoNome} numberOfLines={1}>{e.nome}</Text>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.leitoQtd}>{e.quantidade}</Text>
                        {e.emUso > 0 && <Text style={{ color: COLORS.textMuted, fontSize: 10 }}>{e.emUso} em uso</Text>}
                      </View>
                    </View>
                  ))}
                  {cnes.equipamentos.length > 10 && (
                    <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4 }}>
                      +{cnes.equipamentos.length - 10} equipamentos
                    </Text>
                  )}
                </>
              )}

              {cnes.servicos?.length > 0 && (
                <>
                  <Text style={[styles.subTitle, { marginTop: 16 }]}>🏥 Serviços</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {cnes.servicos.slice(0, 12).map((s, i) => (
                      <View key={i} style={styles.servicoBadge}>
                        <Text style={styles.servicoText} numberOfLines={1}>{s.servico}</Text>
                      </View>
                    ))}
                    {cnes.servicos.length > 12 && (
                      <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>+{cnes.servicos.length - 12}</Text>
                    )}
                  </View>
                </>
              )}

              {hospital.cnesUltimaConsulta && (
                <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 12 }}>
                  Consultado em {new Date(hospital.cnesUltimaConsulta).toLocaleDateString('pt-BR')}
                </Text>
              )}
            </Card>
          )}

          {/* Menu */}
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Conta</Text>
            <MenuItem icon="🔔" label="Notificações" onPress={() => navigation.navigate('Notificacoes')} />
            <MenuItem icon="🆘" label="Suporte"       onPress={() => navigation.navigate('Suporte')} />
          </Card>

          <Button title="Sair da conta" variant="danger" onPress={() => setShowLogout(true)} style={{ marginTop: 8 }} />
        </ScrollView>

        <ConfirmModal
          visible={showLogout}
          onClose={() => setShowLogout(false)}
          onConfirm={handleLogout}
          title="Sair da conta"
          message="Deseja realmente sair?"
          confirmText="Sair"
          loading={loggingOut}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function LeitoStat({ label, value, color }) {
  return (
    <View style={styles.leitoStat}>
      <Text style={[styles.leitoStatVal, color ? { color } : {}]}>{value ?? '—'}</Text>
      <Text style={styles.leitoStatLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={{ color: COLORS.textMuted }}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40 },
  avatarArea: { alignItems: 'center', marginBottom: 28, marginTop: 8 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(38,208,206,0.15)',
    borderWidth: 2, borderColor: COLORS.accent,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  nome: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  email: { color: COLORS.textMuted, fontSize: 14, marginBottom: 10 },
  card: { marginBottom: 14 },
  sectionTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  subTitle: { color: COLORS.accent, fontSize: 13, fontWeight: '700', marginBottom: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoLabel: { color: COLORS.textMuted, fontSize: 13, flex: 1 },
  infoValue: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1.5, textAlign: 'right' },
  leitosRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  leitoStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 10, alignItems: 'center' },
  leitoStatVal: { color: '#fff', fontSize: 22, fontWeight: '800' },
  leitoStatLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  leitoItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  leitoNome: { color: COLORS.textSecondary, fontSize: 13, flex: 1, marginRight: 8 },
  leitoQtd: { color: '#fff', fontSize: 13, fontWeight: '600' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuIcon: { fontSize: 18, marginRight: 12, width: 24 },
  menuLabel: { flex: 1, color: '#fff', fontSize: 15 },
  servicoBadge: { backgroundColor: 'rgba(38,208,206,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(38,208,206,0.25)' },
  servicoText: { color: COLORS.accent, fontSize: 11, fontWeight: '600' },
});
