import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authStore } from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { COLORS } from '../../utils/constants';

// ⚠️ ALL hooks BEFORE any conditional return (Rules of Hooks)
export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [errors, setErrors] = useState({});

  const login = authStore(s => s.login);
  const isLoading = authStore(s => s.isLoading);
  const showToast = useToast();

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'E-mail é obrigatório';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'E-mail inválido';
    if (!senha) e.senha = 'Senha é obrigatória';
    else if (senha.length < 6) e.senha = 'Mínimo 6 caracteres';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    try {
      await login(email.trim().toLowerCase(), senha);
      // Navigation handled by RootNavigator when isAuthenticated changes
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Credenciais inválidas';
      showToast(msg, 'error');
    }
  };

  return (
    <LinearGradient colors={['#0A1628', '#0D1B2E']} style={styles.bg}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {/* Logo */}
            <View style={styles.logoArea}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoCircleText}>EM</Text>
              </View>
              <Text style={styles.logoText}>
                <Text style={styles.logoEncontra}>Encontra</Text>
                <Text style={styles.logoMed}>Med</Text>
              </Text>
              <Text style={styles.tagline}>CONEXÃO MÉDICA INTELIGENTE</Text>
            </View>

            {/* Form */}
            <View style={styles.card}>
              <Text style={styles.title}>Entrar na conta</Text>

              <Input
                label="E-mail"
                value={email}
                onChangeText={setEmail}
                placeholder="seu@email.com"
                keyboardType="email-address"
                leftIcon="✉️"
                error={errors.email}
              />
              <Input
                label="Senha"
                value={senha}
                onChangeText={setSenha}
                placeholder="••••••••"
                secureTextEntry
                leftIcon="🔒"
                error={errors.senha}
              />

              <Button
                title="Entrar"
                onPress={handleLogin}
                loading={isLoading}
                style={styles.loginBtn}
              />

              <Button
                title="Esqueci minha senha"
                variant="ghost"
                onPress={() => navigation.navigate('ForgotPassword')}
                style={styles.forgotBtn}
                size="sm"
              />
            </View>

            {/* Register link */}
            <View style={styles.registerArea}>
              <Text style={styles.registerText}>Não tem conta? </Text>
              <Button
                title="Criar conta gratuita"
                variant="secondary"
                onPress={() => navigation.navigate('Register')}
                size="sm"
                style={styles.registerBtn}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  logoArea: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(38,208,206,0.15)',
    borderWidth: 2, borderColor: COLORS.accent,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  logoCircleText: { color: COLORS.accent, fontSize: 24, fontWeight: '800' },
  logoText: { fontSize: 36, fontWeight: '800', marginBottom: 6 },
  logoEncontra: { color: COLORS.accent },
  logoMed: { color: '#fff' },
  tagline: { color: COLORS.textMuted, fontSize: 11, letterSpacing: 2 },
  card: {
    backgroundColor: '#112240', borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: COLORS.border,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 24, textAlign: 'center' },
  loginBtn: { marginTop: 8 },
  forgotBtn: { marginTop: 12 },
  registerArea: { alignItems: 'center', marginTop: 24 },
  registerText: { color: COLORS.textMuted, fontSize: 14, marginBottom: 12 },
  registerBtn: {},
});
