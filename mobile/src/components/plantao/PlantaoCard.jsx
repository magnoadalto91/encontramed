import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters';
import StatusBadge from './StatusBadge';

export default function PlantaoCard({ plantao, onPress, showStatus = true, showDistance = false }) {
  const { titulo, especialidade, dataInicio, dataFim, valorBase, valor, localNome, localCidade, localUf, status, distanciaKm, tipoValor } = plantao;
  const valorDisplay = valorBase ?? valor;
  const isPorHora = tipoValor === 'POR_HORA';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.titulo} numberOfLines={1}>{titulo}</Text>
          <Text style={styles.especialidade}>{especialidade?.nome || 'Geral'}</Text>
        </View>
        {showStatus && <StatusBadge status={status} size="sm" />}
      </View>

      <View style={styles.grid}>
        <InfoItem icon="calendar-outline"  label={formatDate(dataInicio)} />
        <InfoItem icon="time-outline"      label={`${formatTime(dataInicio)} – ${formatTime(dataFim)}`} />
        <InfoItem icon="location-outline"  label={`${localCidade || localNome}, ${localUf}`} />
        {showDistance && distanciaKm != null && (
          <InfoItem icon="navigate-outline" label={`${distanciaKm.toFixed(1)} km`} />
        )}
      </View>

      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Text style={styles.valor}>{formatCurrency(valorDisplay)}</Text>
          {isPorHora && <Text style={styles.valorUnit}>/h</Text>}
        </View>
        <View style={styles.detailsBtn}>
          <Text style={styles.verMais}>Ver detalhes</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function InfoItem({ icon, label }) {
  return (
    <View style={styles.infoItem}>
      <Ionicons name={icon} size={13} color={COLORS.textMuted} style={{ marginRight: 6, width: 16 }} />
      <Text style={styles.infoLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#112240', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  titulo: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  especialidade: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  grid: { gap: 6, marginBottom: 14 },
  infoItem: { flexDirection: 'row', alignItems: 'center' },
  infoLabel: { color: COLORS.textSecondary, fontSize: 13, flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  valor: { color: COLORS.accent, fontSize: 18, fontWeight: '800' },
  valorUnit: { color: COLORS.textMuted, fontSize: 13 },
  detailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  verMais: { color: COLORS.textMuted, fontSize: 12 },
});
