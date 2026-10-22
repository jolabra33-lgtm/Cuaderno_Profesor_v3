/* ============================================================================
   Gestor de Tutoría · Equipo docente
   tutoria/js/20-equipo-docente.js
   ============================================================================ */

if (!window._eqCtx) window._eqCtx = { nivel: '', grupo: '', seleccionados: new Set() };

document.getElementById('eqDocenteOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('eqDocenteOverlay')) closeEquipoDocente();
});

window.openEquipoDocente = function(nivel, grupo) {
  _eqCtx = { nivel, grupo, seleccionados: new Set() };
  renderEquipoDocenteBody();
  document.getElementById('eqDocenteOverlay').classList.add('open');
};
window.closeEquipoDocente = function() {
  document.getElementById('eqDocenteOverlay').classList.remove('open');
};

function _eqRefrescarSubtitulo(d, nivel, grupo) {
  const sub = document.getElementById('eqDocenteSubtitle');
  if (sub) sub.textContent = `${nivel} — Grupo ${grupo} · ${d.profesores.length} profesor${d.profesores.length !== 1 ? 'es' : ''} registrado${d.profesores.length !== 1 ? 's' : ''}`;
}

function renderEquipoDocenteBody() {
  const { nivel, grupo } = _eqCtx;
  const d = _getAsistenciaData(nivel, grupo);
  _eqRefrescarSubtitulo(d, nivel, grupo);

  const conCorreo = d.profesores.filter(p => (p.correo || '').trim());
  const nSel = _eqCtx.seleccionados.size;

  const rows = d.profesores.map(p => {
    const marcado = _eqCtx.seleccionados.has(p.id);
    return `
    <div class="asist-prof-row" style="align-items:center;gap:10px;padding:10px 0;">
      <input type="checkbox" style="width:16px;height:16px;flex-shrink:0" ${marcado ? 'checked' : ''}
        onchange="_eqToggleSeleccion('${p.id}',this.checked)" title="Seleccionar para enviar correo conjunto">
      <div style="flex:1;display:flex;flex-direction:column;gap:3px;">
        <label style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;font-weight:700">Nombre y apellidos</label>
        <input style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:7px 10px;color:var(--text);font-family:inherit;font-size:13px;font-weight:600;"
          placeholder="Nombre y apellidos" value="${(p.nombre||'').replace(/"/g,'&quot;')}"
          oninput="_eqUpdateProf('${p.id}','nombre',this.value)">
      </div>
      <div style="width:170px;display:flex;flex-direction:column;gap:3px;">
        <label style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;font-weight:700">Materia</label>
        <input style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:7px 10px;color:var(--text);font-family:inherit;font-size:13px;"
          placeholder="Materia" value="${(p.materia||'').replace(/"/g,'&quot;')}"
          oninput="_eqUpdateProf('${p.id}','materia',this.value)">
      </div>
      <div style="width:220px;display:flex;flex-direction:column;gap:3px;">
        <label style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;font-weight:700">Correo corporativo</label>
        <input type="email" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:7px 10px;color:var(--text);font-family:inherit;font-size:13px;"
          placeholder="nombre@gva.es" value="${(p.correo||'').replace(/"/g,'&quot;')}"
          oninput="_eqUpdateProf('${p.id}','correo',this.value)">
      </div>
      <div style="display:flex;flex-direction:column;gap:3px;padding-top:16px;">
        <button class="btn btn-ghost btn-sm" onclick="_eqEnviarA(['${p.id}'])" title="Enviar correo a esta persona">✉</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:3px;padding-top:16px;">
        <button class="btn btn-ghost btn-sm" style="color:var(--red);border-color:rgba(247,110,110,0.3)" onclick="_eqDelProf('${p.id}')" title="Eliminar">🗑</button>
      </div>
    </div>
    <div style="height:1px;background:var(--border);opacity:0.5"></div>`;
  }).join('');

  document.getElementById('eqDocenteBody').innerHTML = `
    <div style="font-size:12px;color:var(--text2);margin-bottom:16px;line-height:1.6;background:var(--surface2);border-radius:8px;padding:10px 14px;border:1px solid var(--border)">
      📋 Equipo docente de <strong>${nivel} ${grupo}</strong>. Se usa aquí y en "👥 Asistencia sesión" para pasar lista en las juntas de evaluación.
    </div>
    <div id="eqDocenteList">${rows || `
      <div style="text-align:center;padding:28px;color:var(--text3);font-size:13px">
        <div style="font-size:28px;margin-bottom:8px">👥</div>
        Sin profesores registrados. Añade el equipo docente.
      </div>`}
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid var(--border);flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" onclick="_eqAddProf()">＋ Añadir profesor/a</button>
      <button class="btn btn-ghost btn-sm" onclick="_eqImportTutor()">📋 Añadir tutor/a del grupo</button>
      <span style="flex:1"></span>
      <button class="btn btn-ghost btn-sm" ${nSel?'':'disabled style="opacity:.4"'} onclick="_eqEnviarA([..._eqCtx.seleccionados])">
        ✉ Enviar a seleccionados (${nSel})
      </button>
      <button class="btn btn-ghost btn-sm" ${conCorreo.length?'':'disabled style="opacity:.4"'} onclick="_eqEnviarATodos()">
        ✉ Enviar a todo el equipo (${conCorreo.length})
      </button>
    </div>
  `;
}

window._eqEnviarA = function(ids) {
  const { nivel, grupo } = _eqCtx;
  const d = _getAsistenciaData(nivel, grupo);
  const correos = d.profesores.filter(p => ids.includes(p.id)).map(p => (p.correo||'').trim()).filter(Boolean);
  if (!correos.length) { showToast('ℹ No hay correo registrado para esta selección'); return; }
  window.location.href = 'mailto:' + correos.map(encodeURIComponent).join(',');
};
window._eqEnviarATodos = function() {
  const { nivel, grupo } = _eqCtx;
  const d = _getAsistenciaData(nivel, grupo);
  _eqEnviarA(d.profesores.map(p => p.id));
};

window._eqToggleSeleccion = function(id, marcado) {
  if (marcado) _eqCtx.seleccionados.add(id); else _eqCtx.seleccionados.delete(id);
  renderEquipoDocenteBody();
};
window._eqUpdateProf = function(id, field, val) {
  const { nivel, grupo } = _eqCtx;
  const d = _getAsistenciaData(nivel, grupo);
  const p = d.profesores.find(x => x.id === id);
  if (p) p[field] = val;
  markDirty();
  _eqRefrescarSubtitulo(d, nivel, grupo);
};
window._eqAddProf = function() {
  const { nivel, grupo } = _eqCtx;
  const d = _getAsistenciaData(nivel, grupo);
  d.profesores.push({ id: 'prof' + Math.random().toString(36).slice(2, 9), nombre: '', materia: '', correo: '' });
  ['eval1','eval2','eval3'].forEach(k => {
    if (!d.sesiones[k]) d.sesiones[k] = [];
    d.sesiones[k].push({ asistio: null, justificacion: '' });
  });
  markDirty();
  renderEquipoDocenteBody();
};
window._eqDelProf = function(id) {
  const { nivel, grupo } = _eqCtx;
  const d = _getAsistenciaData(nivel, grupo);
  const idx = d.profesores.findIndex(p => p.id === id);
  if (idx === -1) return;
  d.profesores.splice(idx, 1);
  ['eval1','eval2','eval3'].forEach(k => {
    if (d.sesiones[k]) d.sesiones[k].splice(idx, 1);
  });
  _eqCtx.seleccionados.delete(id);
  markDirty();
  renderEquipoDocenteBody();
};
window._eqImportTutor = function() {
  const { nivel, grupo } = _eqCtx;
  const t = tutores[`${nivel}-${grupo}`];
  if (!t) { showToast('ℹ No hay tutor/a asignado/a a este grupo'); return; }
  const d = _getAsistenciaData(nivel, grupo);
  if (d.profesores.some(p => p.nombre === t)) { showToast('ℹ El tutor/a ya está en la lista'); return; }
  d.profesores.push({ id: 'prof' + Math.random().toString(36).slice(2, 9), nombre: t, materia: 'Tutoría', correo: '' });
  ['eval1','eval2','eval3'].forEach(k => {
    if (!d.sesiones[k]) d.sesiones[k] = [];
    d.sesiones[k].push({ asistio: null, justificacion: '' });
  });
  markDirty();
  renderEquipoDocenteBody();
  showToast(`✅ ${t} añadido/a al equipo docente`);
};
