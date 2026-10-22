/* ============================================================================
   Gestor de Tutoría · Plano del grupo
   tutoria/js/18-plano-del-grupo.js
   ============================================================================ */

/* ─────────────────────────────────────────────────────────
   Plano del grupo — misma mecánica que en Evaluación por
   Competencias (tocar alumno + tocar mesa, sin arrastrar,
   para que funcione bien en iPad), pero con los datos
   propios de Tutoría.
   ───────────────────────────────────────────────────────── */
if (!window._planoCtx) window._planoCtx = { nivel: '', grupo: '', seleccionado: null };
if (!window._planosGrupo) window._planosGrupo = {};

document.getElementById('planoGrupoOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('planoGrupoOverlay')) closePlanoGrupo();
});

function _planoDatos(nivel, grupo) {
  const key = `${nivel}-${grupo}`;
  if (!window._planosGrupo[key]) window._planosGrupo[key] = { filas: 5, columnas: 6, posiciones: {} };
  const p = window._planosGrupo[key];
  if (typeof p.filas !== 'number') p.filas = 5;
  if (typeof p.columnas !== 'number') p.columnas = 6;
  if (!p.posiciones || typeof p.posiciones !== 'object') p.posiciones = {};
  return p;
}
function _planoOcupante(plano, fila, col) {
  return Object.keys(plano.posiciones).find(n => {
    const p = plano.posiciones[n];
    return p.fila === fila && p.col === col;
  }) || null;
}
function _planoEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

window.openPlanoGrupo = function(nivel, grupo) {
  _planoCtx = { nivel, grupo, seleccionado: null };
  renderPlanoGrupoBody();
  document.getElementById('planoGrupoOverlay').classList.add('open');
};
window.closePlanoGrupo = function() {
  document.getElementById('planoGrupoOverlay').classList.remove('open');
};

function renderPlanoGrupoBody() {
  const { nivel, grupo, seleccionado } = _planoCtx;
  const plano = _planoDatos(nivel, grupo);
  const alumnos = (data[nivel]?.[grupo] || []).filter(a => a.nombre && a.nombre.trim());
  const colocados = new Set(Object.keys(plano.posiciones));
  const sinColocar = alumnos.filter(a => !colocados.has(a.nombre));

  const sub = document.getElementById('planoGrupoSubtitle');
  if (sub) sub.textContent = `${nivel} — Grupo ${grupo} · ${colocados.size} de ${alumnos.length} colocados`;

  let celdas = '';
  for (let f = 0; f < plano.filas; f++) {
    for (let c = 0; c < plano.columnas; c++) {
      const nombre = _planoOcupante(plano, f, c);
      const esSel = seleccionado === nombre && !!nombre;
      const corto = nombre ? _planoEsc(nombre.split(',')[0]) : '';
      celdas += `<div class="tplano-mesa ${nombre?'ocupada':''} ${esSel?'sel':''}" onclick="_planoTocarMesa(${f},${c})" title="${nombre?_planoEsc(nombre):'Mesa libre'}">${nombre?corto:'+'}</div>`;
    }
  }

  document.getElementById('planoGrupoBody').innerHTML = `
    <div style="font-size:12px;color:var(--text2);margin-bottom:14px;line-height:1.6;background:var(--surface2);border-radius:8px;padding:10px 14px;border:1px solid var(--border)">
      🪑 Toca un alumno/a (de la lista o de una mesa) y luego una mesa: si está libre, se sienta ahí; si ya tiene a alguien, se intercambian.
    </div>
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;flex-wrap:wrap">
      <label style="font-size:11px;color:var(--text3);font-weight:700">Filas
        <input type="number" id="tplanoFilas" min="1" max="15" value="${plano.filas}" style="width:56px;margin-left:5px;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:5px 7px;color:var(--text);font-family:inherit;font-size:12px">
      </label>
      <label style="font-size:11px;color:var(--text3);font-weight:700">Columnas
        <input type="number" id="tplanoColumnas" min="1" max="15" value="${plano.columnas}" style="width:56px;margin-left:5px;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:5px 7px;color:var(--text);font-family:inherit;font-size:12px">
      </label>
      <button class="btn btn-ghost btn-sm" onclick="_planoAplicarTamano()">Aplicar tamaño</button>
      <button class="btn btn-ghost btn-sm" onclick="_planoVaciar()">Vaciar plano</button>
    </div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
      <div style="flex:2;min-width:280px">
        <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.4px;font-weight:700;margin-bottom:6px">Mesas — vista desde la pizarra</div>
        <div class="tplano-grid" style="grid-template-columns:repeat(${plano.columnas},1fr)">${celdas}</div>
      </div>
      <div style="width:200px;flex-shrink:0">
        <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.4px;font-weight:700;margin-bottom:6px">Sin colocar (${sinColocar.length})</div>
        <div style="display:flex;flex-direction:column;gap:5px;max-height:400px;overflow-y:auto">
          ${sinColocar.length ? sinColocar.map(a=>`<div class="tplano-chip ${seleccionado===a.nombre?'sel':''}" onclick="_planoSeleccionar('${_planoEsc(a.nombre).replace(/'/g,"\\'")}')">${_planoEsc(a.nombre)}</div>`).join('') : '<div style="font-size:12px;color:var(--text3)">Todos colocados.</div>'}
        </div>
        ${seleccionado && colocados.has(seleccionado) ? `<button class="btn btn-ghost btn-sm" style="margin-top:8px;width:100%" onclick="_planoQuitar()">🗑 Quitar de su mesa</button>` : ''}
      </div>
    </div>`;
}

window._planoSeleccionar = function(nombre) {
  _planoCtx.seleccionado = (_planoCtx.seleccionado === nombre) ? null : nombre;
  renderPlanoGrupoBody();
};
window._planoTocarMesa = function(fila, col) {
  const { nivel, grupo, seleccionado } = _planoCtx;
  const plano = _planoDatos(nivel, grupo);
  const ocupante = _planoOcupante(plano, fila, col);
  if (!seleccionado) {
    if (ocupante) { _planoCtx.seleccionado = ocupante; renderPlanoGrupoBody(); }
    return;
  }
  if (ocupante === seleccionado) { _planoCtx.seleccionado = null; renderPlanoGrupoBody(); return; }
  const posAnterior = plano.posiciones[seleccionado];
  if (ocupante) {
    if (posAnterior) plano.posiciones[ocupante] = posAnterior;
    else delete plano.posiciones[ocupante];
  }
  plano.posiciones[seleccionado] = { fila, col };
  _planoCtx.seleccionado = null;
  markDirty();
  renderPlanoGrupoBody();
};
window._planoQuitar = function() {
  const { nivel, grupo, seleccionado } = _planoCtx;
  const plano = _planoDatos(nivel, grupo);
  delete plano.posiciones[seleccionado];
  _planoCtx.seleccionado = null;
  markDirty();
  renderPlanoGrupoBody();
};
window._planoVaciar = async function() {
  if (!await confirmar('¿Vaciar el plano? Todo el alumnado volverá a la lista de sin colocar.')) return;
  const { nivel, grupo } = _planoCtx;
  const plano = _planoDatos(nivel, grupo);
  plano.posiciones = {};
  _planoCtx.seleccionado = null;
  markDirty();
  renderPlanoGrupoBody();
};
window._planoAplicarTamano = function() {
  const { nivel, grupo } = _planoCtx;
  const plano = _planoDatos(nivel, grupo);
  const filas = Math.max(1, Math.min(15, parseInt(document.getElementById('tplanoFilas').value) || 5));
  const columnas = Math.max(1, Math.min(15, parseInt(document.getElementById('tplanoColumnas').value) || 6));
  plano.filas = filas; plano.columnas = columnas;
  Object.keys(plano.posiciones).forEach(n => {
    const p = plano.posiciones[n];
    if (p.fila >= filas || p.col >= columnas) delete plano.posiciones[n];
  });
  markDirty();
  renderPlanoGrupoBody();
};
window.printPlanoGrupo = function() {
  const { nivel, grupo } = _planoCtx;
  const plano = _planoDatos(nivel, grupo);
  const iesName = document.getElementById('headerIesName')?.value || '';
  let filasHTML = '';
  for (let f = 0; f < plano.filas; f++) {
    let cols = '';
    for (let c = 0; c < plano.columnas; c++) {
      const nombre = _planoOcupante(plano, f, c);
      cols += `<td style="border:1.5px solid #999;padding:8px;text-align:center;vertical-align:middle;height:54px;font-size:12px;width:${(100/plano.columnas).toFixed(2)}%">${nombre?_planoEsc(nombre):''}</td>`;
    }
    filasHTML += `<tr>${cols}</tr>`;
  }
  const win = _ventanaDoc();
  win.document.write(`<!DOCTYPE html><html><head><title>Plano — ${_planoEsc(nivel)} ${_planoEsc(grupo)}</title>
    <style>
      body{font-family:'Segoe UI',Arial,sans-serif;padding:0;margin:0;color:#222}
      .page{max-width:900px;margin:0 auto;padding:30px}
      .toolbar{position:sticky;top:0;background:#1a1d27;padding:9px 18px;display:flex;align-items:center;justify-content:space-between;gap:10px}
      .toolbar span{font-size:13px;font-weight:600;color:#e8eaf2}
      .tbtn{padding:6px 14px;border-radius:7px;border:none;cursor:pointer;font-family:Arial;font-size:12px;font-weight:600}
      .tbtn-print{background:#2563eb;color:#fff}
      .tbtn-close{background:transparent;color:#8891b4;border:1px solid #2e3350}
      @media print{ .no-print{display:none !important} }
    </style></head><body>
    <div class="toolbar no-print">
      <span>🪑 Plano del grupo — ${_planoEsc(nivel)} ${_planoEsc(grupo)}</span>
      <div style="display:flex;gap:8px">
        <button class="tbtn tbtn-print" onclick="window.print()">🖨️ Imprimir / PDF</button>
        <button class="tbtn tbtn-close" onclick="window.close()">✕ Cerrar</button>
      </div>
    </div>
    <div class="page">
      <h1 style="font-size:20px;margin:0 0 4px">Plano del grupo — ${_planoEsc(nivel)} ${_planoEsc(grupo)}</h1>
      <p style="color:#666;font-size:12px;margin:0 0 18px">${_planoEsc(iesName)} · Vista desde la pizarra</p>
      <table style="width:100%;border-collapse:separate;border-spacing:4px">${filasHTML}</table>
    </div>
    </body></html>`);
  win.document.close();
};
