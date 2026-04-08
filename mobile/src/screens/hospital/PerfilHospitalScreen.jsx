import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

  const capacidades = [
    cnes?.possuiCentroCirurgico  && { icon: 'cut-outline',          label: 'Centro Cirúrgico' },
    cnes?.possuiCentroObstetrico && { icon: 'heart-outline',         label: 'Centro Obstétrico' },
    cnes?.possuiAtendimentoHosp  && { icon: 'bed-outline',           label: 'Internação' },
    cnes?.possuiAtendimentoAmb   && { icon: 'medical-outline',       label: 'Ambulatório' },
    cnes?.possuiServApoio        && { icon: 'flask-outline',         label: 'Serv. Apoio' },
  ].filter(Boolean);

  return (
    <LinearGradient colors={['#0A1628', '#0D1B2E']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>

          {/* Avatar */}
          <View style={styles.avatarArea}>
            <View style={styles.avatar}>
              <Ionicons name="business" size={36} color={COLORS.accent} />
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
              {hospital.razaoSocial     && <InfoRow icon="business-outline"     label="Razão Social"  value={hospital.razaoSocial} />}
              {hospital.cnpj            && <InfoRow icon="card-outline"          label="CNPJ"          value={maskCNPJ(hospital.cnpj)} />}
              {hospital.codigoCNES      && <InfoRow icon="barcode-outline"       label="CNES"          value={hospital.codigoCNES} />}
              {hospital.tipoEstabelecimento && <InfoRow icon="layers-outline"    label="Tipo"          value={hospital.tipoEstabelecimento} />}
              {hospital.telefoneContato && <InfoRow icon="call-outline"          label="Telefone"      value={hospital.telefoneContato} />}
              {cnes?.emailContato       && <InfoRow icon="mail-outline"          label="E-mail"        value={cnes.emailContato} />}
              {hospital.enderecoCidade  && (
                <InfoRow icon="location-outline" label="Localização"
                  value={`${hospital.enderecoCidade}${hospital.enderecoEstado ? ' – ' + hospital.enderecoEstado : ''}`}
                />
              )}
            </Card>
          )}

          {/* Dados CNES */}
          {cnes && (
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Dados CNES / Receita Federal</Text>

              {(cnes.tipoGestao || cnes.esferaAdministrativa || cnes.nivelHierarquia || cnes.turnoAtendimento || cnes.naturezaJuridica) && (
                <View style={styles.badgesRow}>
                  {cnes.tipoGestao          && <InfoBadge icon="business-outline"     label={'Gestão: ' + cnes.tipoGestao} />}
                  {cnes.esferaAdministrativa && <InfoBadge icon="layers-outline"       label={cnes.esferaAdministrativa} />}
                  {cnes.nivelHierarquia      && <InfoBadge icon="git-branch-outline"   label={cnes.nivelHierarquia} />}
                  {cnes.turnoAtendimento     && <InfoBadge icon="time-outline"         label={cnes.turnoAtendimento} />}
                  {cnes.naturezaJuridica     && <InfoBadge icon="document-outline"     label={cnes.naturezaJuridica} />}
                </View>
              )}

              {capacidades.length > 0 && (
                <View style={[styles.badgesRow, { marginTop: 8 }]}>
                  {capacidades.map((c, i) => <InfoBadge key={i} icon={c.icon} label={c.label} color={COLORS.accent} />)}
                </View>
              )}

              {/* Leitos */}
              <View style={styles.subTitleRow}>
                <Ionicons name="bed-outline" size={14} color={COLORS.accent} />
                <Text style={styles.subTitle}>Leitos</Text>
              </View>
              {cnes.leitos ? (
                <>
                  <View style={styles.leitosRow}>
                    <LeitoStat label="Total"    value={cnes.leitos.total} />
                    <LeitoStat label="SUS"      value={cnes.leitos.sus}         color={COLORS.success} />
                    <LeitoStat label="Não-SUS"  value={cnes.leitos.naoSus}      color={COLORS.textMuted} />
                    {cnes.leitos.contratados > 0 && <LeitoStat label="Contrat." value={cnes.leitos.contratados} color={COLORS.accent} />}
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
              ) : (
                <Text style={styles.emptyText}>Nenhum leito registrado no CNES</Text>
              )}

              {/* Equipamentos */}
              <View style={styles.subTitleRow}>
                <Ionicons name="hardware-chip-outline" size={14} color={COLORS.accent} />
                <Text style={styles.subTitle}>Equipamentos</Text>
              </View>
              {cnes.equipamentos?.length > 0 ? (
                <>
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
              ) : (
                <Text style={styles.emptyText}>Nenhum equipamento registrado no CNES</Text>
              )}

              {/* Serviços */}
              <View style={styles.subTitleRow}>
                <Ionicons name="medical-outline" size={14} color={COLORS.accent} />
                <Text style={styles.subTitle}>Serviços</Text>
              </View>
              {cnes.servicos?.length > 0 ? (
                <View style={[styles.badgesRow, { marginTop: 4 }]}>
                  {cnes.servicos.slice(0, 12).map((s, i) => (
                    <InfoBadge key={i} label={s.servico} />
                  ))}
                  {cnes.servicos.length > 12 && (
                    <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>+{cnes.servicos.length - 12}</Text>
                  )}
                </View>
              ) : (
                <Text style={styles.emptyText}>Nenhum serviço registrado no CNES</Text>
              )}

              {hospital?.cnesUltimaConsulta && (
                <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 14 }}>
                  Consultado em {new Date(hospital.cnesUltimaConsulta).toLocaleDateString('pt-BR')}
                </Text>
              )}
            </Card>
          )}

          {/* Menu */}
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Conta</Text>
            <MenuItem icon="notifications-outline" label="Notificações" onPress={() => navigation.navigate('Notificacoes')} />
            <MenuItem icon="headset-outline"        label="Suporte"       onPress={() => navigation.navigate('Suporte')} />
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

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
        <Ionicons name={icon} size={13} color={COLORS.textMuted} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function InfoBadge({ icon, label, color }) {
  return (
    <View style={[styles.infoBadge, color && { borderColor: color + '40', backgroundColor: color + '15' }]}>
      {icon && <Ionicons name={icon} size={11} color={color || COLORS.textSecondary} style={{ marginRight: 4 }} />}
      <Text style={[styles.infoBadgeText, color && { color }]} numberOfLines={1}>{label}</Text>
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
      <Ionicons name={icon} size={20} color={COLORS.textMuted} style={styles.menuIcon} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
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
  subTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, marginBottom: 8 },
  subTitle: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoLabel: { color: COLORS.textMuted, fontSize: 13 },
  infoValue: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1.5, textAlign: 'right' },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  infoBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(38,208,206,0.08)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(38,208,206,0.2)',
  },
  infoBadgeText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '500' },
  leitosRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  leitoStat: { flex: 1, minWidth: 60, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 10, alignItems: 'center' },
  leitoStatVal: { color: '#fff', fontSize: 20, fontWeight: '800' },
  leitoStatLabel: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  leitoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  leitoNome: { color: COLORS.textSecondary, fontSize: 13, flex: 1, marginRight: 8 },
  leitoQtd: { color: '#fff', fontSize: 13, fontWeight: '600' },
  emptyText: { color: COLORS.textMuted, fontSize: 13, fontStyle: 'italic', paddingVertical: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuIcon: { marginRight: 12 },
  menuLabel: { flex: 1, color: '#fff', fontSize: 15 },
});
