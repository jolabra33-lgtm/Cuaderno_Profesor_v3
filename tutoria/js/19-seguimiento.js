/* ============================================================================
   Gestor de Tutoría · Seguimiento individual del alumnado
   tutoria/js/19-seguimiento.js
   ============================================================================ */

if (!window._segCtx) window._segCtx = { nivel: '', grupo: '', idx: -1, draft: null };

document.getElementById('segFamOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('segFamOverlay')) closeSegFamilia();
});

function _segNuevoBorrador(nivel, grupo) {
  const materias = getMateriasParaNivel(nivel, grupo) || [];
  return {
    fecha: new Date().toISOString().slice(0, 10),
    materias: materias.map(m => ({ nombre: m, trabajo: '', examenes: '', comportamiento: '' })),
    observaciones: ''
  };
}

window.openSegFamilia = function(nivel, grupo, idx) {
  const alumno = data[nivel]?.[grupo]?.[idx];
  if (!alumno) return;
  if (!Array.isArray(alumno.seguimientos)) alumno.seguimientos = [];
  _segCtx = { nivel, grupo, idx, draft: _segNuevoBorrador(nivel, grupo) };
  renderSegFamiliaBody();
  document.getElementById('segFamOverlay').classList.add('open');
};
window.closeSegFamilia = function() {
  document.getElementById('segFamOverlay').classList.remove('open');
};

function _segEsc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function renderSegFamiliaBody() {
  const { nivel, grupo, idx, draft } = _segCtx;
  const alumno = data[nivel]?.[grupo]?.[idx];
  if (!alumno) return;
  const sub = document.getElementById('segFamSubtitle');
  if (sub) sub.textContent = `${_segEsc(alumno.nombre)} — ${nivel} · Grupo ${grupo}`;

  const filasMaterias = draft.materias.map((m, i) => `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:9px">
        <input style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:8px 11px;color:var(--text);font-family:inherit;font-size:14px;font-weight:700"
          placeholder="Materia" value="${_segEsc(m.nombre)}" oninput="_segUpdateMateria(${i},'nombre',this.value)">
        <button class="btn btn-ghost btn-sm" style="color:var(--red);border-color:rgba(247,110,110,0.3);flex-shrink:0" onclick="_segDelMateria(${i})" title="Quitar esta materia">🗑 Quitar</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">
        <label style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.4px;font-weight:700">Trabajo
          <textarea style="width:100%;min-height:60px;margin-top:4px;background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:8px 10px;color:var(--text);font-family:inherit;font-size:13px;resize:vertical"
            placeholder="Lo que ha comentado el profesor/a…" oninput="_segUpdateMateria(${i},'trabajo',this.value)">${_segEsc(m.trabajo)}</textarea>
        </label>
        <label style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.4px;font-weight:700">Exámenes
          <textarea style="width:100%;min-height:60px;margin-top:4px;background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:8px 10px;color:var(--text);font-family:inherit;font-size:13px;resize:vertical"
            placeholder="Lo que ha comentado el profesor/a…" oninput="_segUpdateMateria(${i},'examenes',this.value)">${_segEsc(m.examenes)}</textarea>
        </label>
        <label style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.4px;font-weight:700">Comportamiento
          <textarea style="width:100%;min-height:60px;margin-top:4px;background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:8px 10px;color:var(--text);font-family:inherit;font-size:13px;resize:vertical"
            placeholder="Lo que ha comentado el profesor/a…" oninput="_segUpdateMateria(${i},'comportamiento',this.value)">${_segEsc(m.comportamiento)}</textarea>
        </label>
      </div>
    </div>`).join('');

  const historial = (alumno.seguimientos || []).slice().sort((a,b) => (b.fecha||'').localeCompare(a.fecha||'')).map(reg => `
    <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:12.5px;color:var(--text3);min-width:90px">${_segEsc(reg.fecha)}</div>
      <div style="flex:1;font-size:12.5px;color:var(--text2)">${(reg.materias||[]).length} materia${(reg.materias||[]).length===1?'':'s'}${reg.observaciones?' · con observaciones':''}</div>
      <button class="btn btn-ghost btn-sm" onclick="printSegFamiliaRegistro('${jsAttr(nivel)}','${jsAttr(grupo)}',${idx},'${reg.id}')">🖨 Imprimir</button>
      <button class="btn btn-ghost btn-sm" style="color:var(--red);border-color:rgba(247,110,110,0.3)" onclick="_segEliminarRegistro('${reg.id}')">🗑</button>
    </div>`).join('');

  document.getElementById('segFamBody').innerHTML = `
    <div style="font-size:12px;color:var(--text2);margin-bottom:16px;line-height:1.6;background:var(--surface2);border-radius:8px;padding:10px 14px;border:1px solid var(--border)">
      📞 Recoge aquí lo que te haya dicho cada profesor/a por correo antes de la reunión con la familia. Quita las materias que no correspondan (optativas, quien no haya contestado) y añade las que hagan falta.
    </div>
    <div style="display:flex;gap:16px;align-items:center;margin-bottom:14px">
      <label style="font-size:12px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:0.4px">Fecha
        <input type="date" style="display:block;margin-top:4px;background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:7px 10px;color:var(--text);font-family:inherit;font-size:13px"
          value="${_segEsc(draft.fecha)}" onchange="_segSetFecha(this.value)">
      </label>
    </div>
    <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.4px;font-weight:700;margin-bottom:6px">Materias</div>
    <div id="segMateriasList">${filasMaterias || '<div style="font-size:12.5px;color:var(--text3);padding:8px 0">Sin materias — añade alguna con el botón de abajo.</div>'}</div>
    <button class="btn btn-ghost btn-sm" style="margin-top:4px" onclick="_segAddMateria()">＋ Añadir materia</button>

    <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.4px;font-weight:700;margin:18px 0 6px">Observaciones generales</div>
    <textarea style="width:100%;min-height:130px;background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:9px 11px;color:var(--text);font-family:inherit;font-size:13px;resize:vertical"
      placeholder="Cualquier otra cosa comentada o acordada con la familia…" onchange="_segSetObservaciones(this.value)">${_segEsc(draft.observaciones)}</textarea>

    <div style="margin-top:14px">
      <button class="btn btn-primary btn-sm" onclick="_segGuardar()">💾 Guardar este registro</button>
    </div>

    <div style="border-top:1px solid var(--border);margin-top:20px;padding-top:14px">
      <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.4px;font-weight:700;margin-bottom:8px">Historial de este alumno/a (${(alumno.seguimientos||[]).length})</div>
      ${historial || '<div style="font-size:12.5px;color:var(--text3);padding:8px 0">Todavía no hay ningún registro guardado.</div>'}
    </div>
  `;
}

window._segUpdateMateria = function(i, field, val) { _segCtx.draft.materias[i][field] = val; };
window._segAddMateria = function() { _segCtx.draft.materias.push({ nombre: '', trabajo: '', examenes: '', comportamiento: '' }); renderSegFamiliaBody(); };
window._segDelMateria = function(i) { _segCtx.draft.materias.splice(i, 1); renderSegFamiliaBody(); };
window._segSetFecha = function(v) { _segCtx.draft.fecha = v; };
window._segSetObservaciones = function(v) { _segCtx.draft.observaciones = v; };

window._segGuardar = function() {
  const { nivel, grupo, idx, draft } = _segCtx;
  const alumno = data[nivel]?.[grupo]?.[idx];
  if (!alumno) return;
  if (!Array.isArray(alumno.seguimientos)) alumno.seguimientos = [];
  const materiasFinal = draft.materias.filter(m => (m.nombre||'').trim());
  alumno.seguimientos.push({
    id: 'seg' + Date.now() + Math.random().toString(36).slice(2,6),
    fecha: draft.fecha,
    materias: materiasFinal.map(m => ({ nombre: m.nombre, trabajo: m.trabajo, examenes: m.examenes, comportamiento: m.comportamiento })),
    observaciones: draft.observaciones
  });
  markDirty();
  showToast('✅ Registro de seguimiento guardado');
  _segCtx.draft = _segNuevoBorrador(nivel, grupo);
  renderSegFamiliaBody();
};

window._segEliminarRegistro = async function(segId) {
  const { nivel, grupo, idx } = _segCtx;
  const alumno = data[nivel]?.[grupo]?.[idx];
  if (!alumno || !Array.isArray(alumno.seguimientos)) return;
  if (!await confirmar('¿Eliminar este registro de seguimiento? No se puede deshacer.')) return;
  alumno.seguimientos = alumno.seguimientos.filter(r => r.id !== segId);
  markDirty();
  renderSegFamiliaBody();
};

function _segPortadaHTML(iesName, alumnoNombre, nivel, grupo) {
  return `
    <div style="background:linear-gradient(135deg,#152a44,#25456b);color:#fff;padding:18px 24px;border-radius:10px;margin-bottom:18px">
      <div style="font-size:1rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em">${_segEsc(iesName)}</div>
      <div style="margin-top:8px;font-size:1.3rem;font-weight:700">Seguimiento con familia</div>
      <div style="font-size:.85rem;color:rgba(255,255,255,.85);margin-top:2px">${_segEsc(alumnoNombre)} — ${_segEsc(nivel)} · Grupo ${_segEsc(grupo)}</div>
    </div>`;
}
function _segRegistroHTML(reg) {
  const filas = (reg.materias||[]).map(m => {
    // Compatibilidad: registros guardados antes de tener los tres campos
    // separados solo tenían "texto" — se muestra igualmente, sin perderlo.
    const esFormatoAntiguo = m.trabajo===undefined && m.examenes===undefined && m.comportamiento===undefined && m.texto;
    if (esFormatoAntiguo) {
      return `<tr><td style="width:170px;font-weight:700;padding:8px 10px 8px 0;vertical-align:top;border-bottom:1px solid #ddd">${_segEsc(m.nombre)}</td><td colspan="3" style="padding:8px 0;vertical-align:top;border-bottom:1px solid #ddd">${_segEsc(m.texto)}</td></tr>`;
    }
    const celda = (v) => v ? _segEsc(v) : '<span style="color:#aaa">—</span>';
    return `<tr>
      <td style="font-weight:700;padding:8px 10px 8px 0;vertical-align:top;border-bottom:1px solid #ddd">${_segEsc(m.nombre)}</td>
      <td style="padding:8px 8px;vertical-align:top;border-bottom:1px solid #ddd;width:26%">${celda(m.trabajo)}</td>
      <td style="padding:8px 8px;vertical-align:top;border-bottom:1px solid #ddd;width:26%">${celda(m.examenes)}</td>
      <td style="padding:8px 8px;vertical-align:top;border-bottom:1px solid #ddd;width:26%">${celda(m.comportamiento)}</td>
    </tr>`;
  }).join('');
  return `
    <p style="font-size:13px;color:#666;margin:0 0 14px">Fecha: <strong>${_segEsc(reg.fecha)}</strong></p>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="text-align:left;font-size:10.5px;color:#777;text-transform:uppercase">
        <th style="padding:0 10px 6px 0">Materia</th><th style="padding:0 8px 6px">Trabajo</th><th style="padding:0 8px 6px">Exámenes</th><th style="padding:0 8px 6px">Comportamiento</th>
      </tr></thead>
      <tbody>${filas}</tbody>
    </table>
    ${reg.observaciones ? `<div style="margin-top:16px"><strong style="font-size:13px">Observaciones generales:</strong><p style="font-size:13px;margin:6px 0 0;white-space:pre-wrap">${_segEsc(reg.observaciones)}</p></div>` : ''}
  `;
}

window.printSegFamiliaRegistro = function(nivel, grupo, idx, segId) {
  const alumno = data[nivel]?.[grupo]?.[idx];
  if (!alumno) return;
  const reg = (alumno.seguimientos||[]).find(r => r.id === segId);
  if (!reg) return;
  const iesName = document.getElementById('headerIesName')?.value || 'IES —';
  const win = _ventanaDoc();
  win.document.write(`<!DOCTYPE html><html><head><title>Seguimiento — ${_segEsc(alumno.nombre)}</title>
    <style>
      body{font-family:'Segoe UI',Arial,sans-serif;padding:0;margin:0;color:#222}
      .page{max-width:800px;margin:0 auto;padding:30px}
      .toolbar{position:sticky;top:0;background:#1a1d27;padding:9px 18px;display:flex;align-items:center;justify-content:space-between;gap:10px}
      .toolbar span{font-size:13px;font-weight:600;color:#e8eaf2}
      .tbtn{padding:6px 14px;border-radius:7px;border:none;cursor:pointer;font-family:Arial;font-size:12px;font-weight:600}
      .tbtn-print{background:#2563eb;color:#fff}
      .tbtn-close{background:transparent;color:#8891b4;border:1px solid #2e3350}
      @media print{ .no-print{display:none !important} }
    </style></head><body>
    <div class="toolbar no-print">
      <span>📞 Seguimiento con familia — ${_segEsc(alumno.nombre)}</span>
      <div style="display:flex;gap:8px">
        <button class="tbtn tbtn-print" onclick="window.print()">🖨️ Imprimir / PDF</button>
        <button class="tbtn tbtn-close" onclick="window.close()">✕ Cerrar</button>
      </div>
    </div>
    <div class="page">
    ${_segPortadaHTML(iesName, alumno.nombre, nivel, grupo)}
    ${_segRegistroHTML(reg)}
    <div style="margin-top:50px;text-align:right;font-size:13px;color:#444">
      <div style="display:inline-block;border-top:1px solid #999;padding-top:6px;min-width:220px">Fdo.: el tutor/a</div>
    </div>
    </div>
    </body></html>`);
  win.document.close();
};

/* ─────────────────────────────────────────────────────────
   Vista "📞 Seguimientos" — listado por grupo de todos los
   registros de seguimiento con familia, para consulta e
   impresión conjunta (por ejemplo, si inspección los pide).
   ───────────────────────────────────────────────────────── */
if (!window._segListState) window._segListState = { nivel: '', grupo: '', seleccionados: new Set() };

function _segTodosDelGrupo(nivel, grupo) {
  const alumnos = (data[nivel]?.[grupo] || []).filter(a => a.nombre && a.nombre.trim());
  const registros = [];
  alumnos.forEach((a, idx) => {
    (a.seguimientos || []).forEach(reg => {
      registros.push({ reg, alumno: a, idx });
    });
  });
  registros.sort((x, y) => (y.reg.fecha||'').localeCompare(x.reg.fecha||''));
  return registros;
}

function renderSegFamiliaListado() {
  const mc = document.getElementById('mainContent');
  if (!_segListState.nivel && NIVELES.length) {
    _segListState.nivel = NIVELES[0];
    _segListState.grupo = (GRUPOS_POR_NIVEL[NIVELES[0]] || [])[0] || '';
  }
  const { nivel, grupo } = _segListState;
  const gruposDisponibles = GRUPOS_POR_NIVEL[nivel] || [];
  const registros = nivel && grupo ? _segTodosDelGrupo(nivel, grupo) : [];
  const nSel = _segListState.seleccionados.size;

  const filas = registros.map(({ reg, alumno, idx }) => `
    <div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--border)">
      <input type="checkbox" style="width:16px;height:16px;flex-shrink:0" ${_segListState.seleccionados.has(reg.id) ? 'checked' : ''}
        onchange="_segListToggleSel('${reg.id}',this.checked)">
      <div style="width:90px;font-size:12.5px;color:var(--text3)">${_segEsc(reg.fecha)}</div>
      <div style="flex:1;font-size:13px;font-weight:600;color:var(--text)">${_segEsc(alumno.nombre)}</div>
      <div style="font-size:12px;color:var(--text2);min-width:140px">${(reg.materias||[]).length} materia${(reg.materias||[]).length===1?'':'s'}${reg.observaciones?' · obs.':''}</div>
      <button class="btn btn-ghost btn-sm" onclick="printSegFamiliaRegistro('${jsAttr(nivel)}','${jsAttr(grupo)}',${idx},'${reg.id}')">🖨 Imprimir</button>
    </div>`).join('');

  mc.innerHTML = `
    <div style="max-width:980px;margin:0 auto;padding:24px 20px">
      <div style="font-family:inherit;font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px;margin-bottom:4px">📞 Seguimientos con familia</div>
      <div style="font-size:12.5px;color:var(--text2);margin-bottom:18px">Todos los registros de "Seguimiento con familia" del grupo, para consulta o para imprimir juntos (por ejemplo, si inspección los pide).</div>

      <div style="display:flex;gap:12px;align-items:center;margin-bottom:18px;flex-wrap:wrap">
        <select id="segListNivel" aria-label="Nivel" style="background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:8px 12px;color:var(--text);font-family:inherit;font-size:13px" onchange="_segListSetNivel(this.value)">
          ${NIVELES.map(n => `<option value="${_segEsc(n)}" ${n===nivel?'selected':''}>${_segEsc(n)}</option>`).join('')}
        </select>
        <select id="segListGrupo" aria-label="Grupo" style="background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:8px 12px;color:var(--text);font-family:inherit;font-size:13px" onchange="_segListSetGrupo(this.value)">
          ${gruposDisponibles.map(g => `<option value="${_segEsc(g)}" ${g===grupo?'selected':''}>Grupo ${_segEsc(g)}</option>`).join('')}
        </select>
        <span style="flex:1"></span>
        <button class="btn btn-ghost btn-sm" ${nSel?'':'disabled style="opacity:.4"'} onclick="printSegFamiliaVarios([..._segListState.seleccionados])">🖨 Imprimir seleccionados (${nSel})</button>
        <button class="btn btn-primary btn-sm" ${registros.length?'':'disabled style="opacity:.4"'} onclick="printSegFamiliaVarios(_segTodosDelGrupo('${jsAttr(nivel)}','${jsAttr(grupo)}').map(r=>r.reg.id))">🖨 Imprimir todos (${registros.length})</button>
      </div>

      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:6px 16px">
        ${filas || `<div style="text-align:center;padding:32px;color:var(--text3)">
          <div style="font-size:28px;margin-bottom:10px">📞</div>
          <div style="font-size:13px">Sin registros de seguimiento todavía en este grupo.</div>
        </div>`}
      </div>
    </div>`;
}

window._segListSetNivel = function(n) {
  _segListState.nivel = n;
  _segListState.grupo = (GRUPOS_POR_NIVEL[n] || [])[0] || '';
  _segListState.seleccionados = new Set();
  renderSegFamiliaListado();
};
window._segListSetGrupo = function(g) {
  _segListState.grupo = g;
  _segListState.seleccionados = new Set();
  renderSegFamiliaListado();
};
window._segListToggleSel = function(id, checked) {
  if (checked) _segListState.seleccionados.add(id); else _segListState.seleccionados.delete(id);
  renderSegFamiliaListado();
};

window.printSegFamiliaVarios = function(ids) {
  const { nivel, grupo } = _segListState;
  const todos = _segTodosDelGrupo(nivel, grupo).filter(r => ids.includes(r.reg.id));
  if (!todos.length) return;
  const iesName = document.getElementById('headerIesName')?.value || 'IES —';
  const secciones = todos.map(({ reg, alumno }, i) => `
    <div style="${i>0?'page-break-before:always;':''}padding-top:${i>0?'20px':'0'}">
      ${_segPortadaHTML(iesName, alumno.nombre, nivel, grupo)}
      ${_segRegistroHTML(reg)}
      <div style="margin-top:50px;text-align:right;font-size:13px;color:#444">
        <div style="display:inline-block;border-top:1px solid #999;padding-top:6px;min-width:220px">Fdo.: el tutor/a</div>
      </div>
    </div>`).join('');
  const win = _ventanaDoc();
  win.document.write(`<!DOCTYPE html><html><head><title>Seguimientos con familia — ${_segEsc(nivel)} ${_segEsc(grupo)}</title>
    <style>
      body{font-family:'Segoe UI',Arial,sans-serif;padding:0;margin:0;color:#222}
      .page{max-width:800px;margin:0 auto;padding:30px}
      .toolbar{position:sticky;top:0;background:#1a1d27;padding:9px 18px;display:flex;align-items:center;justify-content:space-between;gap:10px}
      .toolbar span{font-size:13px;font-weight:600;color:#e8eaf2}
      .tbtn{padding:6px 14px;border-radius:7px;border:none;cursor:pointer;font-family:Arial;font-size:12px;font-weight:600}
      .tbtn-print{background:#2563eb;color:#fff}
      .tbtn-close{background:transparent;color:#8891b4;border:1px solid #2e3350}
      @media print{ .no-print{display:none !important} }
    </style></head><body>
    <div class="toolbar no-print">
      <span>📞 Seguimientos con familia — ${_segEsc(nivel)} · Grupo ${_segEsc(grupo)} (${todos.length})</span>
      <div style="display:flex;gap:8px">
        <button class="tbtn tbtn-print" onclick="window.print()">🖨️ Imprimir / PDF</button>
        <button class="tbtn tbtn-close" onclick="window.close()">✕ Cerrar</button>
      </div>
    </div>
    <div class="page">
    ${secciones}
    </div>
    </body></html>`);
  win.document.close();
};
