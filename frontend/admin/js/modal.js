'use strict';

(function () {
  let activeModal = null;

  function showModal({ title, body, confirmText = 'Confirmar', cancelText = 'Cancelar',
                       onConfirm, onCancel, type = 'default', hideCancel = false }) {
    closeModal();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', title);

    const iconMap = { danger: '⚠️', success: '✅', info: 'ℹ️', default: '' };
    const icon = iconMap[type] || '';

    overlay.innerHTML = `
      <div class="modal ${type !== 'default' ? 'modal-' + type : ''}">
        <div class="modal-header">
          ${icon ? `<span class="modal-icon">${icon}</span>` : ''}
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close-x" aria-label="Fechar">×</button>
        </div>
        <div class="modal-body">${typeof body === 'string' ? body : ''}</div>
        <div class="modal-footer">
          ${!hideCancel ? `<button class="btn btn-ghost modal-cancel">${cancelText}</button>` : ''}
          <button class="btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'} modal-confirm">${confirmText}</button>
        </div>
      </div>
    `;

    if (typeof body === 'object' && body instanceof HTMLElement) {
      overlay.querySelector('.modal-body').appendChild(body);
    }

    const close = (confirmed = false) => {
      overlay.classList.add('modal-hiding');
      overlay.addEventListener('animationend', () => { overlay.remove(); activeModal = null; }, { once: true });
      setTimeout(() => { if (overlay.parentNode) { overlay.remove(); activeModal = null; } }, 300);
      if (!confirmed && onCancel) onCancel();
    };

    overlay.querySelector('.modal-close-x').addEventListener('click', () => close(false));
    overlay.querySelector('.modal-cancel')?.addEventListener('click', () => close(false));
    overlay.querySelector('.modal-confirm').addEventListener('click', () => {
      if (onConfirm) onConfirm();
      close(true);
    });

    // Close on backdrop click
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });

    // Trap ESC
    const onKeyDown = (e) => {
      if (e.key === 'Escape') { close(false); document.removeEventListener('keydown', onKeyDown); }
    };
    document.addEventListener('keydown', onKeyDown);

    document.body.appendChild(overlay);
    activeModal = overlay;

    // Focus first focusable element
    requestAnimationFrame(() => {
      const focusable = overlay.querySelector('button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
      if (focusable) focusable.focus();
    });

    return { close };
  }

  function closeModal() {
    if (activeModal) {
      activeModal.remove();
      activeModal = null;
    }
  }

  function showConfirm(message, onConfirm, type = 'danger') {
    return showModal({ title: 'Confirmação', body: `<p>${message}</p>`, onConfirm, type, confirmText: 'Confirmar' });
  }

  window.showModal = showModal;
  window.closeModal = closeModal;
  window.showConfirm = showConfirm;
})();
