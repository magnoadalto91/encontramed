import { api } from './api';

export const plantaoService = {
  listarDisponiveis: (params) => api.get('/plantoes/disponiveis', { params }).then(r => r.data),
  listarMeusPlantoes: (params) => api.get('/plantoes/meus', { params }).then(r => r.data),
  listarDoHospital: (params) => api.get('/plantoes/hospital', { params }).then(r => r.data),
  getById: (id) => api.get(`/plantoes/${id}`).then(r => r.data),
  criar: (data) => api.post('/plantoes', data).then(r => r.data),
  atualizar: (id, data) => api.put(`/plantoes/${id}`, data).then(r => r.data),
  cancelar: (id, motivo) => api.post(`/plantoes/${id}/cancelar`, { motivo }).then(r => r.data),
  marcarRealizado: (id) => api.post(`/plantoes/${id}/realizado`).then(r => r.data),
  getCandidaturas: (plantaoId) => api.get(`/plantoes/${plantaoId}/candidaturas`).then(r => r.data),
};
