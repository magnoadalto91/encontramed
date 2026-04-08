import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { plantaoService } from '../../services/plantao.service';
import { candidaturaService } from '../../services/candidatura.service';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/plantao/StatusBadge';
import { LoadingScreen } from '../../components/ui/LoadingOverlay';
import { COLORS } from '../../utils/constants';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters';

export default function PlantaoDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const showToast = useToast();

  const [plantao, setPlantao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [candidatando, setCandidatando] = useState(false);
  const [bid, setBid] = useState('');
  const [showBid, setShowBid] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await plantaoService.getById(id);
        setPlantao(data);
      } catch {
        showToast('Erro ao carregar plantão', 'error');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleCandidatar = async () => {
    setCandidatando(true);
    try {
      await candidaturaService.candidatar(id, {});
      showToast('Candidatura enviada com sucesso!', 'success');
      navigation.goBack();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Erro ao candidatar', 'error');
    } finally {
      setCandidatando(false);
    }
  };

  const handleBid = async () => {
    const valor = parseFloat(bid.replace(',', '.'));
    if (!valor || isNaN(valor)) { showToast('Valor inválido', 'error'); return; }
    setCandidatando(true);
    try {
      await candidaturaService.criarBid(id, valor);
      showToast('Proposta enviada!', 'success');
      navigation.goBack();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Erro ao enviar proposta', 'error');
    } finally {
      setCandidatando(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!plantao) return null;

  const duracao = Math.round((new Date(plantao.dataFim) - new Date(plantao.dataInicio)) / 3600000);

  return (
    <LinearGradient colors={['#0A1628', '#0D1B2E']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Button title="← Voltar" variant="ghost" onPress={() => navigation.goBack()} size="sm" style={{ alignSelf: 'flex-start', marginBottom: 16 }} />

          {/* Header */}
          <View style={styles.headerCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <Text style={styles.titulo}>{plantao.titulo}</Text>
              <StatusBadge status={plantao.status} />
            </View>
            <Text style={styles.especialidade}>{plantao.especialidade?.nome || 'Geral'}</Text>
            <Text style={styles.valor}>{formatCurrency(plantao.valor)}</Text>
          </View>

          {/* Details */}
          <View style={styles.card}>
            <Row icon="📅" label="Data" value={formatDate(plantao.dataInicio)} />
            <Row icon="⏰" label="Horário" value={`${formatTime(plantao.dataInicio)} – ${formatTime(plantao.dataFim)} (${duracao}h)`} />
            <Row icon="📍" label="Local" value={`${plantao.localNome}, ${plantao.localCidade} – ${plantao.localUf}`} />
            {plantao.exigeRQE && <Row icon="📋" label="Exige RQE" value="Sim" highlight />}
            {plantao.permiteBid && <Row icon="💰" label="Aceita propostas" value={`Mín. ${formatCurrency(plantao.valorMinimoBid)}`} />}
            {plantao.prazoConfirmacao && <Row icon="⏳" label="Prazo confirmar" value={formatDate(plantao.prazoConfirmacao)} />}
          </View>

          {/* Description */}
          {plantao.descricao && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Descrição</Text>
              <Text style={styles.descText}>{plantao.descricao}</Text>
            </View>
          )}

          {/* Hospital */}
          {plantao.hospital && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Hospital</Text>
              <Text style={styles.hospitalNome}>{plantao.hospital.nomeFantasia || plantao.hospital.razaoSocial}</Text>
            </View>
          )}

          {/* Actions */}
          {plantao.status === 'ABERTO' && (
            <View style={styles.actions}>
              {plantao.permiteBid ? (
                <>
                  <Button title="Candidatar (valor fixo)" onPress={handleCandidatar} loading={candidatando} />
                  <Button
                    title={showBid ? 'Cancelar proposta' : 'Fazer proposta de valor'}
                    variant="secondary"
                    onPress={() => setShowBid(!showBid)}
                    style={{ marginTop: 8 }}
                  />
                  {showBid && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.bidLabel}>Sua proposta (R$)</Text>
                      <View style={styles.bidRow}>
                        <Text style={styles.bidPrefix}>R$ </Text>
                        <Text
                          style={styles.bidInput}
                          onPress={() => {}}
                        >{bid || '0,00'}</Text>
                        <Button title="Enviar" onPress={handleBid} loading={candidatando} size="sm" style={{ marginLeft: 8 }} />
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <Button title="Candidatar-me" onPress={handleCandidatar} loading={candidatando} />
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Row({ icon, label, value, highlight }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, highlight && { color: COLORS.accent }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20 },
  headerCard: { backgroundColor: '#112240', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  titulo: { color: '#fff', fontSize: 18, fontWeight: '800', flex: 1, marginRight: 8 },
  especialidade: { color: COLORS.accent, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  valor: { color: COLORS.accent, fontSize: 28, fontWeight: '800' },
  card: { backgroundColor: '#112240', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  rowIcon: { fontSize: 16, marginRight: 10, marginTop: 2, width: 20 },
  rowLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '500', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  rowValue: { color: COLORS.textSecondary, fontSize: 14 },
  sectionTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  descText: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 22 },
  hospitalNome: { color: '#fff', fontSize: 15, fontWeight: '600' },
  actions: { marginTop: 8, marginBottom: 24 },
  bidLabel: { color: COLORS.textMuted, fontSize: 12, marginBottom: 6 },
  bidRow: { flexDirection: 'row', alignItems: 'center' },
  bidPrefix: { color: COLORS.textMuted, fontSize: 16 },
  bidInput: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1, borderBottomWidth: 1, borderBottomColor: COLORS.accent, paddingBottom: 4 },
});
