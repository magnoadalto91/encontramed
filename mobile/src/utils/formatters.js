/**
 * Currency formatter
 * @param {number} value
 * @returns {string} formatted currency (BRL)
 */
export function formatCurrency(value) {
  if (value == null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Date formatter — returns "DD/MM/YYYY"
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Date formatter — returns "DD/MM/YYYY às HH:mm"
 * @param {string|Date} datetime
 * @returns {string}
 */
export function formatDateTime(datetime) {
  if (!datetime) return '';
  const d = new Date(datetime);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Time formatter — returns "HH:mm"
 * @param {string|Date} datetime
 * @returns {string}
 */
export function formatTime(datetime) {
  if (!datetime) return '';
  const d = new Date(datetime);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Duration formatter
 * @param {number} hours
 * @returns {string}
 */
export function formatDuration(hours) {
  if (!hours) return '';
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  if (hours % 1 === 0) return `${hours}h`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${m > 0 ? `${m}min` : ''}`;
}

/**
 * CRM formatter — "CRM-UF XXXXXX"
 * @param {string} crm
 * @param {string} uf
 * @returns {string}
 */
export function formatCRM(crm, uf) {
  if (!crm) return '';
  const num = String(crm).replace(/\D/g, '');
  if (uf) return `CRM-${uf.toUpperCase()} ${num}`;
  return `CRM ${num}`;
}

/**
 * Phone formatter — "(XX) XXXXX-XXXX" or "(XX) XXXX-XXXX"
 * @param {string} phone
 * @returns {string}
 */
export function formatPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

/**
 * CNPJ formatter — "XX.XXX.XXX/XXXX-XX"
 * @param {string} cnpj
 * @returns {string}
 */
export function formatCNPJ(cnpj) {
  if (!cnpj) return '';
  const digits = String(cnpj).replace(/\D/g, '');
  if (digits.length !== 14) return cnpj;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

/**
 * CPF formatter — "XXX.XXX.XXX-XX"
 * @param {string} cpf
 * @returns {string}
 */
export function formatCPF(cpf) {
  if (!cpf) return '';
  const digits = String(cpf).replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Relative time — "há X minutos", "há X horas", etc.
 * @param {string|Date} date
 * @returns {string}
 */
export function formatRelativeTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays === 1) return 'ontem';
  if (diffDays < 7) return `há ${diffDays} dias`;
  return formatDate(date);
}

/**
 * Distance formatter
 * @param {number} km
 * @returns {string}
 */
export function formatDistance(km) {
  if (km == null) return '';
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}
