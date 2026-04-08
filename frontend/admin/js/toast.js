'use strict';

(function () {
  const ICONS = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  function getContainer() {
    let c = document.getElementById('toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toast-container';
      c.className = 'toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  function showToast(message, type = 'success', duration = 4000) {
    const container = getContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${ICONS[type] || ICONS.info}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="Fechar">×</button>
      <div class="toast-progress" style="animation-duration: ${duration}ms"></div>
    `;

    const close = () => {
      toast.classList.add('toast-hiding');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
      setTimeout(() => toast.remove(), 400);
    };

    toast.querySelector('.toast-close').addEventListener('click', close);
    container.appendChild(toast);

    // Auto-dismiss
    setTimeout(close, duration);

    return close;
  }

  window.showToast = showToast;
  window.toast = {
    success: (msg, d) => showToast(msg, 'success', d),
    error:   (msg, d) => showToast(msg, 'error', d),
    warning: (msg, d) => showToast(msg, 'warning', d),
    info:    (msg, d) => showToast(msg, 'info', d),
  };
})();
