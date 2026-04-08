import { api } from './api';

export const candidaturaService = {
  candidatar: (plantaoId, data) => api.post(`/candidaturas/${plantaoId}`, data).then(r => r.data),
  listarMinhas: (params) => api.get('/candidaturas/minhas', { params }).then(r => r.data),
  listarDoPlantao: (plantaoId) => api.get(`/candidaturas/plantao/${plantaoId}`).then(r => r.data),
  confirmar: (id) => api.post(`/candidaturas/${id}/confirmar`).then(r => r.data),
  rejeitar: (id, motivo) => api.post(`/candidaturas/${id}/rejeitar`, { motivo }).then(r => r.data),
  criarBid: (plantaoId, valor) => api.post(`/bids/${plantaoId}`, { valor }).then(r => r.data),
};
