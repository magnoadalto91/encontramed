import React, { useState, useEffect } from 'react';
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
import { formatCRM } from '../../utils/formatters';

const CRM_VARIANT = { ATIVO: 'success', SUSPENSO: 'danger', PENDENTE: 'warning', INATIVO: 'muted' };

export default function PerfilScreen({ navigation }) {
  const user = authStore(s => s.user);
  const logout = authStore(s => s.logout);
  const showToast = useToast();
  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const medico = user?.medico;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      showToast('Erro ao sair', 'error');
    } finally {
      setLoggingOut(false);
      setShowLogout(false);
    }
  };

  return (
    <LinearGradient colors={['#0A1628', '#0D1B2E']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Avatar */}
          <View style={styles.avatarArea}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.nome?.[0] || '?'}</Text>
            </View>
            <Text style={styles.nome}>{user?.nome}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            {medico && (
              <Badge
                label={medico.statusCrm || 'PENDENTE'}
                variant={CRM_VARIANT[medico.statusCrm] || 'muted'}
                size="sm"
              />
            )}
          </View>

          {/* CRM Info */}
          {medico && (
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Dados Profissionais</Text>
              <InfoRow label="CRM" value={formatCRM(medico.crm, medico.crmUf)} />
              {medico.especialidades?.map(e => (
                <InfoRow key={e.id} label="Especialidade" value={`${e.especialidade?.nome}${e.rqeValidado ? ' ✓ RQE' : ''}`} />
              ))}
            </Card>
          )}

          {/* Options */}
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Conta</Text>
            <MenuItem icon="📄" label="Meus documentos" onPress={() => navigation.navigate('Documentos')} />
            <MenuItem icon="🔔" label="Notificações" onPress={() => navigation.navigate('Notificacoes')} />
            <MenuItem icon="🆘" label="Suporte" onPress={() => navigation.navigate('Suporte')} />
          </Card>

          <Button
            title="Sair da conta"
            variant="danger"
            onPress={() => setShowLogout(true)}
            style={{ marginTop: 8 }}
          />
        </ScrollView>

        <ConfirmModal
          visible={showLogout}
          onClose={() => setShowLogout(false)}
          onConfirm={handleLogout}
          title="Sair da conta"
          message="Deseja realmente sair? Você precisará fazer login novamente."
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
      <Text style={styles.infoValue}>{value}</Text>
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
  avatarText: { color: COLORS.accent, fontSize: 32, fontWeight: '800' },
  nome: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  email: { color: COLORS.textMuted, fontSize: 14, marginBottom: 10 },
  card: { marginBottom: 14 },
  sectionTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoLabel: { color: COLORS.textMuted, fontSize: 13 },
  infoValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuIcon: { fontSize: 18, marginRight: 12, width: 24 },
  menuLabel: { flex: 1, color: '#fff', fontSize: 15 },
});
