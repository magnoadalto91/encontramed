'use strict';

const PAGINAS_SUPORTE = ['chamados.html', 'documentos.html'];

function checkAuth() {
  const token = localStorage.getItem('admin_token');
  const role  = localStorage.getItem('admin_role');

  if (!token) {
    if (!window.location.pathname.includes('login.html')) {
      window.location.href = 'login.html';
    }
    return;
  }

  // SUPORTE: só pode acessar chamados e documentos
  if (role === 'SUPORTE') {
    const paginaAtual = window.location.pathname.split('/').pop() || 'index.html';
    if (!PAGINAS_SUPORTE.includes(paginaAtual) && paginaAtual !== 'login.html') {
      window.location.href = 'chamados.html';
    }
  }
}

function logout() {
  api.post('/auth/logout').catch(() => {}).finally(() => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_user');
    window.location.href = 'login.html';
  });
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('admin_user') || '{}'); } catch { return {}; }
}

function populateUserInfo() {
  const user = getUser();
  const el = document.getElementById('user-nome');
  if (el) el.textContent = user.nomeCompleto || 'Admin';
  const roleEl = document.getElementById('user-role');
  if (roleEl) roleEl.textContent = user.role || '';
  const avatar = document.getElementById('user-avatar');
  if (avatar && user.nomeCompleto) {
    const iniciais = user.nomeCompleto.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
    avatar.textContent = iniciais;
  }
}

// Execute immediately
checkAuth();
document.addEventListener('DOMContentLoaded', () => {
  populateUserInfo();
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
});

window.checkAuth = checkAuth;
window.logout = logout;
window.getUser = getUser;
