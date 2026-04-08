'use strict';

/**
 * Escapes HTML special characters to prevent XSS and HTML injection.
 * Use in all email templates and any user-supplied content rendered as HTML.
 * @param {*} str - Value to escape
 * @returns {string} Escaped string safe for HTML context
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { escapeHtml };
