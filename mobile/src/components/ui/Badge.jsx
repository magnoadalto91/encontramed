import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../utils/constants';

const VARIANTS = {
  success:  { bg: 'rgba(16,185,129,0.15)', text: '#10B981', border: '#10B981' },
  danger:   { bg: 'rgba(239,68,68,0.15)',  text: '#EF4444', border: '#EF4444' },
  warning:  { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', border: '#F59E0B' },
  info:     { bg: 'rgba(26,110,189,0.15)', text: '#1A6EBD', border: '#1A6EBD' },
  accent:   { bg: 'rgba(38,208,206,0.15)', text: COLORS.accent, border: COLORS.accent },
  muted:    { bg: 'rgba(255,255,255,0.05)', text: COLORS.textMuted, border: COLORS.border },
  primary:  { bg: 'rgba(38,208,206,0.15)', text: COLORS.accent, border: COLORS.accent },
};

export default function Badge({ label, variant = 'muted', size = 'md' }) {
  const v = VARIANTS[variant] || VARIANTS.muted;
  const textSize = size === 'sm' ? 10 : 12;
  const px = size === 'sm' ? 6 : 10;
  const py = size === 'sm' ? 2 : 4;

  return (
    <View style={[styles.badge, { backgroundColor: v.bg, borderColor: v.border, paddingHorizontal: px, paddingVertical: py }]}>
      <Text style={[styles.text, { color: v.text, fontSize: textSize }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start' },
  text: { fontWeight: '600' },
});
