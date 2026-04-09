'use strict';
const fs = require('fs');

// ── medicos.html ──────────────────────────────────────────────────────────────
let m = fs.readFileSync('D:/Desenvolvimentos/Produtos/encontramed/frontend/admin/medicos.html', 'utf8');

m = m.replace(
  '<th>Médico</th><th>CRM / UF</th><th>Status CRM</th><th>Especialidades</th><th>Cadastrado</th><th>Ações</th>',
  '<th>Médico</th><th>CRM / UF</th><th>Status CRM</th><th>Nota</th><th>Cadastrado</th><th>Ações</th>'
);

m = m.replace(
  '<td><span class="text-muted text-sm">Ver perfil</span></td>',
  `<td>\${m.notaMedia ? '⭐ ' + Number(m.notaMedia).toFixed(1) + ' <span class="text-muted text-sm">(' + (m.totalAvaliacoes||0) + ')</span>' : '<span class="text-muted">—</span>'}</td>`
);

fs.writeFileSync('D:/Desenvolvimentos/Produtos/encontramed/frontend/admin/medicos.html', m, 'utf8');
console.log('medicos.html done');

// ── hospitais.html ────────────────────────────────────────────────────────────
let h = fs.readFileSync('D:/Desenvolvimentos/Produtos/encontramed/frontend/admin/hospitais.html', 'utf8');

h = h.replace(
  '<th>Hospital</th><th>CNPJ</th><th>CNES</th><th>Cidade/UF</th><th>Verificado</th><th>Cadastrado</th><th>Ações</th>',
  '<th>Hospital</th><th>CNPJ</th><th>CNES</th><th>Nota</th><th>Verificado</th><th>Cadastrado</th><th>Ações</th>'
);

h = h.replace(
  `colspan="7"><div class="empty-state"><div class="empty-icon">🏥`,
  `colspan="8"><div class="empty-state"><div class="empty-icon">🏥`
);

// Add nota cell before Verificado
h = h.replace(
  `<td>\${h.enderecoCidade ? \`\${h.enderecoCidade}/\${h.enderecoEstado}\` : '—'}</td>\n        <td>\${h.verificado`,
  `<td>\${h.enderecoCidade ? \`\${h.enderecoCidade}/\${h.enderecoEstado}\` : '—'}</td>\n        <td>\${h.notaMedia ? '⭐ ' + Number(h.notaMedia).toFixed(1) + ' <span class="text-muted text-sm">(' + (h.totalAvaliacoes||0) + ')</span>' : '<span class="text-muted">—</span>'}</td>\n        <td>\${h.verificado`
);

fs.writeFileSync('D:/Desenvolvimentos/Produtos/encontramed/frontend/admin/hospitais.html', h, 'utf8');
console.log('hospitais.html done');
