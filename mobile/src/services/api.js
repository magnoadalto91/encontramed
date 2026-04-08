import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '@utils/constants';

// axios pinned at 1.7.9 — do NOT upgrade (security: versions above 1.13.x were compromised)
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token from SecureStore
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // SecureStore unavailable — continue without token
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Navigation ref — set from App.jsx after NavigationContainer mounts
let _navigationRef = null;
export function setNavigationRef(ref) {
  _navigationRef = ref;
}

// Response interceptor — handle auth errors and network issues
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) {
      // Network error
      const networkError = new Error('Sem conexão com o servidor. Verifique sua internet.');
      networkError.isNetworkError = true;
      return Promise.reject(networkError);
    }

    const { status, data } = error.response;

    if (status === 401) {
      // Session expired or invalid token
      try {
        await SecureStore.deleteItemAsync('auth_token');
      } catch {
        // ignore
      }

      if (_navigationRef?.isReady()) {
        _navigationRef.resetRoot({
          index: 0,
          routes: [{ name: 'Auth', params: { sessionExpired: data?.sessionExpired } }],
        });
      }

      const authError = new Error(data?.error || 'Sessão expirada. Faça login novamente.');
      authError.isAuthError = true;
      authError.sessionExpired = data?.sessionExpired || true;
      return Promise.reject(authError);
    }

    if (status === 403) {
      const forbiddenError = new Error(data?.error || 'Acesso negado.');
      forbiddenError.isForbidden = true;
      return Promise.reject(forbiddenError);
    }

    if (status === 429) {
      const rateLimitError = new Error('Muitas tentativas. Aguarde alguns minutos.');
      rateLimitError.isRateLimit = true;
      return Promise.reject(rateLimitError);
    }

    if (status >= 500) {
      const serverError = new Error('Erro interno do servidor. Tente novamente.');
      serverError.isServerError = true;
      return Promise.reject(serverError);
    }

    // Return API error message
    const apiError = new Error(data?.error || data?.message || 'Ocorreu um erro inesperado.');
    apiError.status = status;
    apiError.data = data;
    return Promise.reject(apiError);
  }
);

export default api;
