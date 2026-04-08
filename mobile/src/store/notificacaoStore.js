import { create } from 'zustand';
import { notificacaoService } from '../services/notificacao.service';

export const notificacaoStore = create((set, get) => ({
  count: 0,
  notificacoes: [],

  fetchCount: async () => {
    try {
      const data = await notificacaoService.countNaoLidas();
      set({ count: data.count });
    } catch {}
  },

  fetchNotificacoes: async () => {
    try {
      const data = await notificacaoService.listar({ limit: 30 });
      set({ notificacoes: data.notificacoes || data, count: data.naoLidas ?? get().count });
    } catch {}
  },

  marcarLida: async (id) => {
    try {
      await notificacaoService.marcarLida(id);
      set(s => ({
        notificacoes: s.notificacoes.map(n => n.id === id ? { ...n, lida: true } : n),
        count: Math.max(0, s.count - 1),
      }));
    } catch {}
  },

  marcarTodasLidas: async () => {
    try {
      await notificacaoService.marcarTodasLidas();
      set(s => ({
        notificacoes: s.notificacoes.map(n => ({ ...n, lida: true })),
        count: 0,
      }));
    } catch {}
  },

  incrementCount: () => set(s => ({ count: s.count + 1 })),
  resetCount: () => set({ count: 0 }),
}));
