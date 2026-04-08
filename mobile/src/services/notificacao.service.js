import { api } from './api';

export const notificacaoService = {
  listar: (params) => api.get('/notificacoes', { params }).then(r => r.data),
  countNaoLidas: () => api.get('/notificacoes/count').then(r => r.data),
  marcarLida: (id) => api.patch(`/notificacoes/${id}/lida`).then(r => r.data),
  marcarTodasLidas: () => api.patch('/notificacoes/todas-lidas').then(r => r.data),
  registrarPushToken: (token) => api.post('/users/push-token', { token }).then(r => r.data),
};
