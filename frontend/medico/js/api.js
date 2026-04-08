'use strict';

// Médico portal é servido pelo próprio backend — usa path relativo em produção
const API_URL = window.API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api');

async function apiRequest(method, endpoint, data = null, isFormData = false) {
  const token = localStorage.getItem('medico_token');
  const headers = {};

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData && data) headers['Content-Type'] = 'application/json';

  const opts = { method, headers };
  if (data) opts.body = isFormData ? data : JSON.stringify(data);

  let resp;
  try {
    resp = await fetch(`${API_URL}${endpoint}`, opts);
  } catch (err) {
    throw new Error('Erro de conexão com o servidor. Verifique sua internet.');
  }

  if (resp.status === 401) {
    const body = await resp.json().catch(() => ({}));
    if (body.sessionExpired || body.error?.includes('Token') || body.error?.includes('Sessão')) {
      localStorage.removeItem('medico_token');
      localStorage.removeItem('medico_user');
      window.location.href = 'login.html';
      return;
    }
  }

  const text = await resp.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { error: text }; }

  if (!resp.ok) {
    const msg = json?.error || json?.message || `Erro ${resp.status}`;
    throw Object.assign(new Error(msg), { status: resp.status, data: json });
  }

  return json;
}

const api = {
  get: (endpoint) => apiRequest('GET', endpoint),
  post: (endpoint, data) => apiRequest('POST', endpoint, data),
  put: (endpoint, data) => apiRequest('PUT', endpoint, data),
  patch: (endpoint, data) => apiRequest('PATCH', endpoint, data),
  del: (endpoint) => apiRequest('DELETE', endpoint),
  upload: (endpoint, formData) => apiRequest('POST', endpoint, formData, true),
};

window.api = api;
