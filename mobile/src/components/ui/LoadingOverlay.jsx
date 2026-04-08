import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../utils/constants';

export default function LoadingOverlay({ message = 'Carregando...' }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.accent} />
      {message && <Text style={styles.text}>{message}</Text>}
    </View>
  );
}

export function LoadingScreen({ message }) {
  return (
    <View style={styles.screen}>
      <LoadingOverlay message={message} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  text: { color: COLORS.textMuted, fontSize: 14, marginTop: 12 },
  screen: { flex: 1, backgroundColor: '#0A1628', alignItems: 'center', justifyContent: 'center' },
});
