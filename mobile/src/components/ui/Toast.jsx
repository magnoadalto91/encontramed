import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../utils/constants';

const ToastContext = createContext(null);

const TOAST_COLORS = {
  success: { bg: 'rgba(16,185,129,0.15)', border: '#10B981', icon: '✓' },
  error:   { bg: 'rgba(239,68,68,0.15)',  border: '#EF4444', icon: '✕' },
  warning: { bg: 'rgba(245,158,11,0.15)', border: '#F59E0B', icon: '⚠' },
  info:    { bg: 'rgba(26,110,189,0.15)', border: '#1A6EBD', icon: 'ℹ' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={styles.container} pointerEvents="none">
        {toasts.map(t => {
          const colors = TOAST_COLORS[t.type] || TOAST_COLORS.info;
          return (
            <View key={t.id} style={[styles.toast, { backgroundColor: colors.bg, borderLeftColor: colors.border }]}>
              <Text style={[styles.icon, { color: colors.border }]}>{colors.icon}</Text>
              <Text style={styles.message}>{t.message}</Text>
            </View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.showToast;
}

// Convenience hook
export function useShowToast() {
  return useToast();
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 60, left: 16, right: 16, zIndex: 9999, gap: 8 },
  toast: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 10, borderLeftWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 8,
  },
  icon: { fontSize: 16, fontWeight: '700', marginRight: 10 },
  message: { color: '#fff', fontSize: 14, flex: 1, lineHeight: 20 },
});
