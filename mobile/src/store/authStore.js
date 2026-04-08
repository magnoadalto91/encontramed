import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';

const TOKEN_KEY = 'encontramed_token';
const USER_KEY = 'encontramed_user';

export const authStore = create((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userStr = await SecureStore.getItemAsync(USER_KEY);
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ token, user, isAuthenticated: true });
        // Set token in api instance
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    } catch {
      // Ignore — treat as unauthenticated
    }
  },

  login: async (email, senha, plataforma = 'mobile') => {
    set({ isLoading: true });
    try {
      const resp = await api.post('/auth/login', { email, senha, plataforma });
      const { token, user } = resp.data;

      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));

      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      set({ token, user, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
    delete api.defaults.headers.common['Authorization'];
    set({ token: null, user: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user }),
}));
