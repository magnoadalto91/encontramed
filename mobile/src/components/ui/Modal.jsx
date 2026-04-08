import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal as RNModal, TouchableOpacity, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { COLORS } from '../../utils/constants';
import Button from './Button';

export default function Modal({ visible, onClose, title, children, footer, size = 'md' }) {
  const maxHeight = size === 'lg' ? '85%' : size === 'sm' ? '40%' : '65%';

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { maxHeight }]}>
              {/* Header */}
              {title && (
                <View style={styles.header}>
                  <Text style={styles.title} numberOfLines={2}>{title}</Text>
                  <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.closeIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Body */}
              <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                {children}
              </ScrollView>

              {/* Footer */}
              {footer && <View style={styles.footer}>{footer}</View>}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
}

export function ConfirmModal({ visible, onClose, onConfirm, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', variant = 'danger', loading = false }) {
  return (
    <Modal visible={visible} onClose={onClose} title={title} size="sm">
      <Text style={styles.confirmMessage}>{message}</Text>
      <View style={styles.confirmActions}>
        <Button title={cancelText} variant="ghost" onPress={onClose} style={{ flex: 1, marginRight: 8 }} />
        <Button title={confirmText} variant={variant} onPress={onConfirm} loading={loading} style={{ flex: 1 }} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  container: {
    backgroundColor: '#112240', borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    width: '100%', overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, marginRight: 12 },
  closeBtn: { padding: 4 },
  closeIcon: { color: COLORS.textMuted, fontSize: 16 },
  body: { padding: 20 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: COLORS.border },
  confirmMessage: { color: COLORS.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: 24 },
  confirmActions: { flexDirection: 'row' },
});
