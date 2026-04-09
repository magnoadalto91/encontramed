'use strict';
const fs = require('fs');

let c = fs.readFileSync('D:/Desenvolvimentos/Produtos/encontramed/frontend/hospital/plantoes.html', 'utf8');

// 1. Add recorrência CSS styles
c = c.replace(
  `    /* Chat modal */`,
  `    /* Recorrência */
    .recorrencia-section { border-top:1px solid var(--border); margin-top:var(--space-4); padding-top:var(--space-4); }
    .recorrencia-section h5 { color:var(--text-secondary); font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; margin-bottom:12px; }
    .dias-semana { display:flex; gap:6px; flex-wrap:wrap; }
    .dia-btn { width:36px; height:36px; border-radius:50%; border:1px solid var(--border); background:transparent; color:var(--text-secondary); font-size:12px; font-weight:600; cursor:pointer; transition:all .15s; }
    .dia-btn.selected { background:rgba(38,208,206,.2); border-color:var(--accent); color:var(--accent); }
    /* Contrato modal */
    .contrato-overlay { position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:2000;display:none;align-items:center;justify-content:center; }
    .contrato-modal { background:var(--bg-card);border:1px solid var(--border);border-radius:16px;width:480px;max-width:95vw;padding:28px; }
    .contrato-status-box { border-radius:10px; padding:16px 20px; margin-bottom:16px; }
    .contrato-status-box.pendente { background:rgba(255,152,0,.08); border:1px solid rgba(255,152,0,.3); }
    .contrato-status-box.assinado { background:rgba(46,213,115,.08); border:1px solid rgba(46,213,115,.3); }
    /* Chat modal */`
);

// 2. Add recorrência fields inside the form, after the description textarea
c = c.replace(
  `          </div>
        </form>
      </div>
      <div class="modal-footer">`,
  `          <!-- Recorrência -->
          <div class="recorrencia-section form-col-full">
            <h5>Recorrência</h5>
            <div class="form-group" style="margin-bottom:12px;">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input type="checkbox" id="p-recorrente" onchange="toggleRecorrencia()" />
                <span style="color:var(--text-secondary);font-size:13px;">Este é um plantão recorrente</span>
              </label>
            </div>
            <div id="recorrencia-fields" style="display:none;">
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Tipo</label>
                  <select class="select-field" id="p-rec-tipo" onchange="toggleRecTipo()">
                    <option value="SEMANAL">Semanal (dias da semana)</option>
                    <option value="DIARIA">Diária</option>
                    <option value="MENSAL">Mensal (mesmo dia do mês)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Repetir até</label>
                  <input type="date" class="input-field" id="p-rec-fim" />
                </div>
                <div class="form-group form-col-full" id="grupo-dias-semana">
                  <label class="form-label">Dias da semana</label>
                  <div class="dias-semana">
                    <button type="button" class="dia-btn" data-dia="0" onclick="toggleDia(this)">Dom</button>
                    <button type="button" class="dia-btn" data-dia="1" onclick="toggleDia(this)">Seg</button>
                    <button type="button" class="dia-btn" data-dia="2" onclick="toggleDia(this)">Ter</button>
                    <button type="button" class="dia-btn" data-dia="3" onclick="toggleDia(this)">Qua</button>
                    <button type="button" class="dia-btn" data-dia="4" onclick="toggleDia(this)">Qui</button>
                    <button type="button" class="dia-btn" data-dia="5" onclick="toggleDia(this)">Sex</button>
                    <button type="button" class="dia-btn" data-dia="6" onclick="toggleDia(this)">Sáb</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          </div>
        </form>
      </div>
      <div class="modal-footer">`
);

// 3. Add Contrato button to each plantão row (after Chat, before Candidatos)
c = c.replace(
  `<button class="btn btn-ghost btn-xs" onclick="abrirChat(${'{'}p.id${'}'}, '${'{'}(p.titulo||'Plantão #'+p.id).replace(/'/g,"\\\\'")${'}'}'`,
  // this won't work with simple replace due to template literal — use regex below
  'PLACEHOLDER_WONT_MATCH'
);

// Use a targeted replacement for the actions cell
c = c.replace(
  `              <button class="btn btn-ghost btn-xs" onclick="abrirChat(\${p.id}, '\${(p.titulo||'Plantão #'+p.id).replace(/'/g,"\\\\'")}', '\${fmtDate(p.dataInicio)}')">💬 Chat</button>
              <a href="candidaturas.html?plantao=\${p.id}" class="btn btn-ghost btn-xs">Candidatos</a>
              \${p.status === 'ABERTO' ? \`<button class="btn btn-danger btn-xs" onclick="cancelarPlantao(\${p.id})">Cancelar</button>\` : ''}`,
  `              <button class="btn btn-ghost btn-xs" onclick="abrirChat(\${p.id}, '\${(p.titulo||'Plantão #'+p.id).replace(/'/g,"\\\\'")}', '\${fmtDate(p.dataInicio)}')">💬 Chat</button>
              \${p.status === 'CONFIRMADO' ? \`<button class="btn btn-ghost btn-xs" style="color:var(--accent)" onclick="abrirContrato(\${p.id})">📄 Contrato</button>\` : ''}
              <a href="candidaturas.html?plantao=\${p.id}" class="btn btn-ghost btn-xs">Candidatos</a>
              \${p.status === 'ABERTO' ? \`<button class="btn btn-danger btn-xs" onclick="cancelarPlantao(\${p.id})">Cancelar</button>\` : ''}`
);

// 4. Add Contrato modal HTML (before Chat modal)
c = c.replace(
  `  <!-- Modal Chat -->`,
  `  <!-- Modal Contrato -->
  <div class="contrato-overlay" id="contrato-overlay">
    <div class="contrato-modal">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h3 style="color:var(--text-primary);font-size:16px;font-weight:700;margin:0;">Contrato Digital</h3>
        <button class="modal-close-btn" onclick="fecharContrato()">×</button>
      </div>
      <div id="contrato-status-area"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
        <button class="btn btn-ghost btn-sm" onclick="verPDFContrato()">📄 Ver PDF</button>
        <button class="btn btn-primary btn-sm" id="btn-aceitar-contrato" onclick="aceitarContrato()">✔ Aceitar Contrato</button>
        <button class="btn btn-ghost btn-sm" onclick="fecharContrato()">Fechar</button>
      </div>
    </div>
  </div>

  <!-- Modal Chat -->`
);

// 5. Add JS functions for recorrência and contrato (before Init section)
c = c.replace(
  `  // ─── Init ──────────────────────────────────────────────────────────────────`,
  `  // ─── Recorrência ────────────────────────────────────────────────────────────
  function toggleRecorrencia() {
    document.getElementById('recorrencia-fields').style.display =
      document.getElementById('p-recorrente').checked ? 'block' : 'none';
  }
  window.toggleRecorrencia = toggleRecorrencia;

  function toggleRecTipo() {
    const tipo = document.getElementById('p-rec-tipo').value;
    document.getElementById('grupo-dias-semana').style.display = tipo === 'SEMANAL' ? 'block' : 'none';
  }
  window.toggleRecTipo = toggleRecTipo;

  function toggleDia(btn) {
    btn.classList.toggle('selected');
  }
  window.toggleDia = toggleDia;

  // ─── Contrato ──────────────────────────────────────────────────────────────
  let _contratoPId = null;

  async function abrirContrato(plantaoId) {
    _contratoPId = plantaoId;
    document.getElementById('contrato-overlay').style.display = 'flex';
    const area = document.getElementById('contrato-status-area');
    area.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);">Carregando...</div>';
    document.getElementById('btn-aceitar-contrato').style.display = 'none';
    try {
      const data = await api.get(\`/contratos/\${plantaoId}/status\`);
      const assinado = data.status === 'ASSINADO';
      area.innerHTML = \`
        <div class="contrato-status-box \${assinado ? 'assinado' : 'pendente'}">
          <div style="font-weight:700;font-size:14px;color:\${assinado ? '#2ed573' : '#ff9800'};">
            \${assinado ? '✔ Contrato Assinado' : '⏳ Aguardando Assinatura'}
          </div>
          \${assinado ? \`<div style="font-size:12px;color:var(--text-secondary);margin-top:6px;">
            Aceito em: \${new Date(data.assinadoEm).toLocaleString('pt-BR')}
          </div>\` : \`<div style="font-size:12px;color:var(--text-secondary);margin-top:6px;">
            O médico ou o hospital ainda não aceitou o contrato eletrônico (Lei 14.063/2020).
          </div>\`}
        </div>
      \`;
      if (!assinado) document.getElementById('btn-aceitar-contrato').style.display = 'inline-block';
    } catch {
      area.innerHTML = '<div style="color:var(--danger);font-size:14px;">Erro ao carregar contrato.</div>';
    }
  }
  window.abrirContrato = abrirContrato;

  function fecharContrato() {
    document.getElementById('contrato-overlay').style.display = 'none';
    _contratoPId = null;
  }
  window.fecharContrato = fecharContrato;

  document.getElementById('contrato-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('contrato-overlay')) fecharContrato();
  });

  function verPDFContrato() {
    if (!_contratoPId) return;
    const token = localStorage.getItem('hospital_token') || localStorage.getItem('token');
    const base = (window.API_URL || '').replace(/\\/api$/, '');
    window.open(\`\${base}/api/contratos/\${_contratoPId}/pdf?token=\${token}\`, '_blank');
  }
  window.verPDFContrato = verPDFContrato;

  async function aceitarContrato() {
    if (!_contratoPId) return;
    const btn = document.getElementById('btn-aceitar-contrato');
    btn.classList.add('btn-loading'); btn.disabled = true;
    try {
      await api.post(\`/contratos/\${_contratoPId}/aceitar\`);
      toast.success('Contrato aceito com sucesso!');
      fecharContrato();
    } catch(err) {
      toast.error(err.message || 'Erro ao aceitar contrato');
      btn.classList.remove('btn-loading'); btn.disabled = false;
    }
  }
  window.aceitarContrato = aceitarContrato;

  // ─── Init ──────────────────────────────────────────────────────────────────`
);

// 6. Update submit to include recorrência fields
c = c.replace(
  `        localNome,
        localCidade: localCid,
        localUf,
        descricao: obs || undefined,
      });`,
  `        localNome,
        localCidade: localCid,
        localUf,
        descricao: obs || undefined,
        recorrente: document.getElementById('p-recorrente').checked || undefined,
        recorrenciaTipo: document.getElementById('p-recorrente').checked ? document.getElementById('p-rec-tipo').value : undefined,
        recorrenciaDias: document.getElementById('p-recorrente').checked && document.getElementById('p-rec-tipo').value === 'SEMANAL'
          ? [...document.querySelectorAll('.dia-btn.selected')].map(b => b.dataset.dia).join(',') || undefined
          : undefined,
        recorrenciaFim: document.getElementById('p-recorrente').checked && document.getElementById('p-rec-fim').value
          ? new Date(document.getElementById('p-rec-fim').value).toISOString()
          : undefined,
      });`
);

// 7. Reset recorrência on form reset
c = c.replace(
  `      document.getElementById('form-plantao').reset();
      setTipoValor('FIXO');
      document.getElementById('grupo-bid').style.display = 'none';`,
  `      document.getElementById('form-plantao').reset();
      setTipoValor('FIXO');
      document.getElementById('grupo-bid').style.display = 'none';
      document.getElementById('recorrencia-fields').style.display = 'none';
      document.querySelectorAll('.dia-btn').forEach(b => b.classList.remove('selected'));`
);

fs.writeFileSync('D:/Desenvolvimentos/Produtos/encontramed/frontend/hospital/plantoes.html', c, 'utf8');
console.log('plantoes.html done');
