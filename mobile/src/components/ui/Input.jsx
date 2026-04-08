import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../utils/constants';

export default function Input({ label, value, onChangeText, placeholder, secureTextEntry = false, keyboardType = 'default', error, leftIcon, rightIcon, style, ...props }) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = secureTextEntry;

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, focused && styles.inputFocused, error && styles.inputError]}>
        {leftIcon && <Text style={styles.icon}>{leftIcon}</Text>}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
          {...props}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.iconBtn}>
            <Text style={styles.icon}>{showPassword ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        )}
        {rightIcon && !isPassword && <Text style={styles.icon}>{rightIcon}</Text>}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#112240', borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 14, minHeight: 48,
  },
  inputFocused: { borderColor: COLORS.accent },
  inputError: { borderColor: COLORS.danger },
  input: { flex: 1, color: COLORS.textPrimary, fontSize: 15, paddingVertical: 12 },
  icon: { fontSize: 18, marginHorizontal: 4, color: COLORS.textMuted },
  iconBtn: { padding: 4 },
  errorText: { fontSize: 12, color: COLORS.danger, marginTop: 4 },
});
