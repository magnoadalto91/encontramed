import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
      showToast('Candidatura enviada!', 'success');
      // Open chat after applying
      navigation.replace('Chat', {
        plantaoId: id,
        titulo: plantao.titulo,
        hospitalNome: plantao.hospital?.nomeFantasia || plantao.hospital?.razaoSocial,
      });
    } catch (err) {
      showToast(err?.response?.data?.error || 'Erro ao candidatar', 'error');
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
      navigation.replace('Chat', {
        plantaoId: id,
        titulo: plantao.titulo,
        hospitalNome: plantao.hospital?.nomeFantasia || plantao.hospital?.razaoSocial,
      });
    } catch (err) {
      showToast(err?.response?.data?.error || 'Erro ao enviar proposta', 'error');
      setCandidatando(false);
    }
  };

  const openChat = () => navigation.navigate('Chat', {
    plantaoId: id,
    titulo: plantao.titulo,
    hospitalNome: plantao.hospital?.nomeFantasia || plantao.hospital?.razaoSocial,
  });

  if (loading) return <LoadingScreen />;
  if (!plantao) return null;

  const duracao = Math.round((new Date(plantao.dataFim) - new Date(plantao.dataInicio)) / 3600000);
  const isPorHora = plantao.tipoValor === 'POR_HORA';

  return (
    <LinearGradient colors={['#0A1628', '#0D1B2E']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>

          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={openChat} style={styles.chatBtn}>
              <Ionicons name="chatbubble-outline" size={20} color={COLORS.accent} />
              <Text style={styles.chatBtnText}>Chat</Text>
            </TouchableOpacity>
          </View>

          {/* Header card */}
          <View style={styles.headerCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <Text style={styles.titulo}>{plantao.titulo}</Text>
              <StatusBadge status={plantao.status} />
            </View>
            <Text style={styles.especialidade}>{plantao.especialidade?.nome || 'Geral'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={styles.valor}>{formatCurrency(plantao.valorBase)}</Text>
              {isPorHora && <Text style={styles.valorUnit}>/h</Text>}
            </View>
            {isPorHora && (
              <Text style={styles.totalEstimado}>
                Total estimado: {formatCurrency(parseFloat(plantao.valorBase) * duracao)}
              </Text>
            )}
          </View>

          {/* Details */}
          <View style={styles.card}>
            <Row icon="calendar-outline" label="Data" value={formatDate(plantao.dataInicio)} />
            <Row icon="time-outline" label="Horário" value={`${formatTime(plantao.dataInicio)} – ${formatTime(plantao.dataFim)} (${duracao}h)`} />
            <Row icon="location-outline" label="Local" value={`${plantao.localNome}, ${plantao.localCidade} – ${plantao.localUf}`} />
            {plantao.exigeRQE && <Row icon="ribbon-outline" label="Exige RQE" value="Sim" highlight />}
            {plantao.permiteBid && <Row icon="trending-up-outline" label="Aceita propostas" value={`Mín. ${formatCurrency(plantao.valorMinimoBid)}`} />}
          </View>

          {/* Description */}
          {plantao.descricao ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Descrição</Text>
              <Text style={styles.descText}>{plantao.descricao}</Text>
            </View>
          ) : null}

          {/* Hospital */}
          {plantao.hospital ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Hospital</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <View style={styles.hospitalIcon}>
                  <Ionicons name="business-outline" size={18} color={COLORS.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hospitalNome}>{plantao.hospital.nomeFantasia || plantao.hospital.razaoSocial}</Text>
                  {plantao.hospital.enderecoCidade && (
                    <Text style={styles.hospitalCidade}>{plantao.hospital.enderecoCidade}{plantao.hospital.enderecoEstado ? ` – ${plantao.hospital.enderecoEstado}` : ''}</Text>
                  )}
                </View>
              </View>
              {plantao.hospital.tipoEstabelecimento ? (
                <Row icon="medical-outline" label="Tipo" value={plantao.hospital.tipoEstabelecimento} />
              ) : null}
              {plantao.hospital.codigoCNES ? (
                <Row icon="barcode-outline" label="CNES" value={plantao.hospital.codigoCNES} />
              ) : null}
              {plantao.hospital.telefoneContato ? (
                <Row icon="call-outline" label="Telefone" value={plantao.hospital.telefoneContato} />
              ) : null}
            </View>
          ) : null}

          {/* Actions */}
          {plantao.status === 'ABERTO' && (
            <View style={styles.actions}>
              {plantao.permiteBid ? (
                <>
                  <Button title="Candidatar-me (valor fixo)" onPress={handleCandidatar} loading={candidatando} />
                  <Button
                    title={showBid ? 'Cancelar proposta' : 'Fazer contraproposta de valor'}
                    variant="secondary"
                    onPress={() => setShowBid(!showBid)}
                    style={{ marginTop: 8 }}
                  />
                  {showBid && (
                    <View style={styles.bidBox}>
                      <Text style={styles.bidLabel}>Sua proposta (R${isPorHora ? '/h' : ''})</Text>
                      <View style={styles.bidRow}>
                        <TextInput
                          style={styles.bidInput}
                          value={bid}
                          onChangeText={setBid}
                          placeholder="0,00"
                          placeholderTextColor={COLORS.textMuted}
                          keyboardType="decimal-pad"
                        />
                        <Button title="Enviar proposta" onPress={handleBid} loading={candidatando} size="sm" style={{ marginLeft: 10 }} />
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <Button title="Candidatar-me" onPress={handleCandidatar} loading={candidatando} />
              )}
              <Button title="Abrir chat com hospital" variant="ghost" onPress={openChat} style={{ marginTop: 10 }} />
            </View>
          )}

          {/* Confirmed: chat + contract */}
          {plantao.status === 'CONFIRMADO' && (
            <View style={styles.actions}>
              <Button title="Abrir chat" onPress={openChat} />
              <Button
                title="Ver contrato"
                variant="ghost"
                onPress={() => navigation.navigate('Contrato', { plantaoId: id, titulo: plantao.titulo })}
                style={{ marginTop: 8 }}
              />
            </View>
          )}

          {/* Realizado/Pago: rate */}
          {['REALIZADO', 'PAGO'].includes(plantao.status) && (
            <View style={styles.actions}>
              <Button
                title="Avaliar este plantão"
                onPress={() => navigation.navigate('Avaliacao', {
                  plantaoId: id,
                  titulo: plantao.titulo,
                  nomeAvaliado: plantao.hospital?.nomeFantasia || plantao.hospital?.razaoSocial,
                  dataInicio: plantao.dataInicio,
                })}
              />
              <Button title="Abrir chat" variant="ghost" onPress={openChat} style={{ marginTop: 8 }} />
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
      <Ionicons name={icon} size={16} color={highlight ? COLORS.accent : COLORS.textMuted} style={styles.rowIcon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, highlight && { color: COLORS.accent }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backBtn: { padding: 4 },
  chatBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.accent },
  chatBtnText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },

  headerCard: { backgroundColor: '#112240', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  titulo: { color: '#fff', fontSize: 18, fontWeight: '800', flex: 1, marginRight: 8 },
  especialidade: { color: COLORS.accent, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  valor: { color: COLORS.accent, fontSize: 28, fontWeight: '800' },
  valorUnit: { color: COLORS.textMuted, fontSize: 16 },
  totalEstimado: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },

  card: { backgroundColor: '#112240', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  rowIcon: { marginRight: 10, marginTop: 2, width: 20 },
  rowLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '500', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  rowValue: { color: COLORS.textSecondary, fontSize: 14 },

  sectionTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  descText: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 22 },

  hospitalIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(38,208,206,0.15)', justifyContent: 'center', alignItems: 'center' },
  hospitalNome: { color: '#fff', fontSize: 15, fontWeight: '600' },
  hospitalCidade: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },

  actions: { marginTop: 8, marginBottom: 24 },
  bidBox: { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14 },
  bidLabel: { color: COLORS.textMuted, fontSize: 12, marginBottom: 8, fontWeight: '500' },
  bidRow: { flexDirection: 'row', alignItems: 'center' },
  bidInput: {
    flex: 1, color: '#fff', fontSize: 18, fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
});
