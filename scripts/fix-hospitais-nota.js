'use strict';
const fs = require('fs');

let h = fs.readFileSync('D:/Desenvolvimentos/Produtos/encontramed/frontend/admin/hospitais.html', 'utf8');

const oldRow = `        <td class="text-sm">\${h.enderecoCidade ? \`\${h.enderecoCidade}/\${h.enderecoEstado}\` : '—'}</td>
        <td>\${h.verificado`;

const newRow = `        <td class="text-sm">\${h.enderecoCidade ? \`\${h.enderecoCidade}/\${h.enderecoEstado}\` : '—'}</td>
        <td>\${h.notaMedia ? '⭐ ' + Number(h.notaMedia).toFixed(1) + ' <span class="text-muted text-sm">(' + (h.totalAvaliacoes||0) + ')</span>' : '<span class="text-muted">—</span>'}</td>
        <td>\${h.verificado`;

if (h.includes(oldRow)) {
  h = h.replace(oldRow, newRow);
  console.log('replaced row ok');
} else {
  console.log('OLD STRING NOT FOUND — dumping relevant section:');
  const idx = h.indexOf('enderecoCidade');
  console.log(JSON.stringify(h.slice(idx - 20, idx + 120)));
}

fs.writeFileSync('D:/Desenvolvimentos/Produtos/encontramed/frontend/admin/hospitais.html', h, 'utf8');
