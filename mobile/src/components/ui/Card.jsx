import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../utils/constants';

export default function Card({ children, style, onPress, padding = 16 }) {
  const inner = <View style={[styles.card, { padding }, style]}>{children}</View>;

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#112240',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
