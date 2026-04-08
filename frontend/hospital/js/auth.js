'use strict';
function checkAuth() {
  const token = localStorage.getItem('hospital_token');
  if (!token && !window.location.pathname.includes('login.html')) {
    window.location.href = 'login.html';
    return;
  }
}
function logout() {
  const token = localStorage.getItem('hospital_token');
  const headers = token ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : {};
  fetch('/api/auth/logout', { method: 'POST', headers }).catch(() => {}).finally(() => {
    localStorage.removeItem('hospital_token');
    localStorage.removeItem('hospital_user');
    window.location.href = 'login.html';
  });
}
function getUser() {
  try { return JSON.parse(localStorage.getItem('hospital_user') || '{}'); } catch { return {}; }
}
function populateUserInfo() {
  const user = getUser();
  const el = document.getElementById('user-nome');
  if (el) el.textContent = user.nomeCompleto || user.nomeFantasia || 'Hospital';
  const avatar = document.getElementById('user-avatar');
  if (avatar && (user.nomeCompleto || user.nomeFantasia)) {
    const name = user.nomeCompleto || user.nomeFantasia || '';
    avatar.textContent = name.split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase();
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
