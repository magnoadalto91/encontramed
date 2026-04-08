import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../utils/constants';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters';
import StatusBadge from './StatusBadge';

export default function PlantaoCard({ plantao, onPress, showStatus = true, showDistance = false }) {
  const {
    titulo, especialidade, dataInicio, dataFim, valor, localNome, localCidade, localUf,
    status, distanciaKm,
  } = plantao;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.titulo} numberOfLines={1}>{titulo}</Text>
          <Text style={styles.especialidade}>{especialidade?.nome || 'Geral'}</Text>
        </View>
        {showStatus && <StatusBadge status={status} size="sm" />}
      </View>

      {/* Info grid */}
      <View style={styles.grid}>
        <InfoItem icon="📅" label={formatDate(dataInicio)} />
        <InfoItem icon="⏰" label={`${formatTime(dataInicio)} – ${formatTime(dataFim)}`} />
        <InfoItem icon="📍" label={`${localCidade || localNome}, ${localUf}`} />
        {showDistance && distanciaKm != null && (
          <InfoItem icon="🗺️" label={`${distanciaKm.toFixed(1)} km`} />
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.valor}>{formatCurrency(valor)}</Text>
        <Text style={styles.verMais}>Ver detalhes →</Text>
      </View>
    </TouchableOpacity>
  );
}

function InfoItem({ icon, label }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#112240', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 12,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  titulo: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  especialidade: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  grid: { gap: 6, marginBottom: 14 },
  infoItem: { flexDirection: 'row', alignItems: 'center' },
  infoIcon: { fontSize: 13, marginRight: 6, width: 18 },
  infoLabel: { color: COLORS.textSecondary, fontSize: 13, flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  valor: { color: COLORS.accent, fontSize: 18, fontWeight: '800' },
  verMais: { color: COLORS.textMuted, fontSize: 12 },
});
