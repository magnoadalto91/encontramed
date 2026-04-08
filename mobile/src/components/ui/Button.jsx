import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../utils/constants';

const SIZE = {
  sm: { height: 36, fontSize: 13, px: 14 },
  md: { height: 48, fontSize: 15, px: 20 },
  lg: { height: 56, fontSize: 17, px: 24 },
};

export default function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, size = 'md', icon, style }) {
  const s = SIZE[size] || SIZE.md;
  const isDisabled = disabled || loading;

  const content = (
    <View style={[styles.inner, { paddingHorizontal: s.px, height: s.height }]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : COLORS.accent} size="small" />
      ) : (
        <>
          {icon && <Text style={[styles.icon, { fontSize: s.fontSize }]}>{icon}</Text>}
          <Text style={[styles.label, { fontSize: s.fontSize }, variant === 'primary' ? styles.labelPrimary : styles.labelAlt]}>
            {title}
          </Text>
        </>
      )}
    </View>
  );

  if (variant === 'primary') {
    return (
      <TouchableOpacity onPress={onPress} disabled={isDisabled} style={[styles.touchable, style, isDisabled && styles.disabled]} activeOpacity={0.8}>
        <LinearGradient colors={['#26D0CE', '#1A6EBD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.gradient, { borderRadius: 10, opacity: isDisabled ? 0.5 : 1 }]}>
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantStyles = {
    secondary: { bg: 'rgba(38,208,206,0.1)', border: COLORS.accent, textColor: COLORS.accent },
    danger:    { bg: 'rgba(239,68,68,0.1)',  border: COLORS.danger, textColor: COLORS.danger },
    ghost:     { bg: 'transparent', border: 'rgba(255,255,255,0.15)', textColor: COLORS.textMuted },
  }[variant] || { bg: 'transparent', border: COLORS.border, textColor: COLORS.textMuted };

  return (
    <TouchableOpacity
      onPress={onPress} disabled={isDisabled} activeOpacity={0.7}
      style={[styles.touchable, { backgroundColor: variantStyles.bg, borderWidth: 1, borderColor: variantStyles.border, borderRadius: 10, opacity: isDisabled ? 0.5 : 1 }, style]}
    >
      <View style={[styles.inner, { paddingHorizontal: s.px, height: s.height }]}>
        {icon && <Text style={{ fontSize: s.fontSize, marginRight: 6 }}>{icon}</Text>}
        <Text style={[styles.label, { fontSize: s.fontSize, color: variantStyles.textColor }]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: { borderRadius: 10 },
  gradient: {},
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  label: { fontWeight: '600' },
  labelPrimary: { color: '#fff' },
  labelAlt: {},
  icon: { marginRight: 6 },
  disabled: { opacity: 0.5 },
});
