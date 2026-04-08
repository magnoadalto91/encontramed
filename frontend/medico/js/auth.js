'use strict';
function checkAuth() {
  const token = localStorage.getItem('medico_token');
  if (!token && !window.location.pathname.includes('login.html')) {
    window.location.href = 'login.html';
    return;
  }
}
function logout() {
  // call api.post('/auth/logout') then clear storage
  const token = localStorage.getItem('medico_token');
  const headers = token ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : {};
  fetch('/api/auth/logout', { method: 'POST', headers }).catch(() => {}).finally(() => {
    localStorage.removeItem('medico_token');
    localStorage.removeItem('medico_user');
    window.location.href = 'login.html';
  });
}
function getUser() {
  try { return JSON.parse(localStorage.getItem('medico_user') || '{}'); } catch { return {}; }
}
function populateUserInfo() {
  const user = getUser();
  const el = document.getElementById('user-nome');
  if (el) el.textContent = user.nomeCompleto || 'Médico';
  const avatar = document.getElementById('user-avatar');
  if (avatar && user.nomeCompleto) {
    avatar.textContent = user.nomeCompleto.split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase();
  }
}
checkAuth();
document.addEventListener('DOMContentLoaded', () => {
  populateUserInfo();
  document.getElementById('logout-btn')?.addEventListener('click', logout);
});
window.checkAuth = checkAuth;
window.logout = logout;
window.getUser = getUser;
