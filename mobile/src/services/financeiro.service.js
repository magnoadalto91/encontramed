import { api } from './api';

export const financeiroService = {
  getExtrato: (params) => api.get('/financeiro/extrato', { params }).then(r => r.data),
  getExtratoHospital: (params) => api.get('/financeiro/extrato/hospital', { params }).then(r => r.data),
  getResumo: () => api.get('/financeiro/resumo').then(r => r.data),
};
