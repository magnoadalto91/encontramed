import * as SecureStore from 'expo-secure-store';
import api from './api';

const TOKEN_KEY = 'auth_token';

/**
 * Login with email and password
 * @param {string} email
 * @param {string} senha
 * @param {'web'|'mobile'} plataforma
 * @returns {Promise<{token: string, user: object}>}
 */
export async function login(email, senha, plataforma = 'mobile') {
  const response = await api.post('/auth/login', { email, senha, plataforma });
  const { token, user } = response.data;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  return { token, user };
}

/**
 * Logout — invalidate session on server
 */
export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    // Ignore errors — always clear local token
  } finally {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

/**
 * Register a new user (MEDICO or HOSPITAL)
 * @param {object} dados
 * @param {'MEDICO'|'HOSPITAL'} role
 */
export async function register(dados, role) {
  const response = await api.post('/auth/register', { ...dados, role });
  return response.data;
}

/**
 * Verify email with OTP code
 * @param {string} email
 * @param {string} codigo
 */
export async function verificarEmail(email, codigo) {
  const response = await api.post('/auth/verificar-email', { email, codigo });
  return response.data;
}

/**
 * Resend email verification code
 * @param {string} email
 */
export async function reenviarVerificacao(email) {
  const response = await api.post('/auth/reenviar-verificacao', { email });
  return response.data;
}

/**
 * Request password recovery link
 * @param {string} email
 */
export async function recuperarSenha(email) {
  const response = await api.post('/auth/recuperar-senha', { email });
  return response.data;
}

/**
 * Reset password with token
 * @param {string} token
 * @param {string} novaSenha
 */
export async function redefinirSenha(token, novaSenha) {
  const response = await api.post('/auth/redefinir-senha', { token, novaSenha });
  return response.data;
}

/**
 * Get current authenticated user profile
 */
export async function getMe() {
  const response = await api.get('/auth/me');
  return response.data;
}

/**
 * Get stored auth token
 */
export async function getStoredToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated (has valid token in SecureStore)
 */
export async function isAuthenticated() {
  const token = await getStoredToken();
  return !!token;
}
