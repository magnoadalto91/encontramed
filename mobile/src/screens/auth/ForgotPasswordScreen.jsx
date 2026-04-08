import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { COLORS } from '../../utils/constants';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const showToast = useToast();

  const handleSubmit = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('E-mail inválido');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/recuperar-senha', { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (err) {
      // Never reveal if email exists (anti-enumeration)
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0A1628', '#0D1B2E']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Button title="← Voltar" variant="ghost" onPress={() => navigation.goBack()} size="sm" style={{ alignSelf: 'flex-start', marginBottom: 32 }} />

            <View style={styles.icon}>
              <Text style={{ fontSize: 48 }}>🔑</Text>
            </View>

            <Text style={styles.title}>Recuperar senha</Text>

            {sent ? (
              <View style={styles.card}>
                <Text style={styles.successIcon}>✉️</Text>
                <Text style={styles.successTitle}>E-mail enviado!</Text>
                <Text style={styles.successText}>
                  Se esse e-mail estiver cadastrado, você receberá um link para redefinir sua senha em breve.
                  Verifique também sua caixa de spam.
                </Text>
                <Button title="Voltar ao login" onPress={() => navigation.navigate('Login')} style={{ marginTop: 24 }} />
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.subtitle}>
                  Digite seu e-mail e enviaremos um link para redefinir sua senha.
                </Text>
                <Input
                  label="E-mail"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="seu@email.com"
                  keyboardType="email-address"
                  leftIcon="✉️"
                  error={error}
                />
                <Button title="Enviar link" onPress={handleSubmit} loading={loading} style={{ marginTop: 8 }} />
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  icon: { alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 32 },
  card: {
    backgroundColor: '#112240', borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: COLORS.border,
  },
  subtitle: { color: COLORS.textMuted, fontSize: 14, marginBottom: 20, lineHeight: 22 },
  successIcon: { fontSize: 48, textAlign: 'center', marginBottom: 16 },
  successTitle: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  successText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
