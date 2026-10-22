/* ============================================================================
   Gestor de Tutoría · Asistencia a la sesión de evaluación
   tutoria/js/21-asistencia.js
   ============================================================================ */

if (!window._asistenciaData) window._asistenciaData = {};
// Structure: _asistenciaData['nivel-grupo'] = {
//   profesores: [{nombre, materia}],
//   sesiones: { eval1: [{asistio: bool|null, justificacion: ''}], eval2: [...], eval3: [...] }
// }

let _asistCtx = { nivel: '', grupo: '', evalKey: 'eval1' };

document.getElementById('asistOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('asistOverlay')) closeAsistencia();
});

function _getAsistenciaData(nivel, grupo) {
  const key = `${nivel}-${grupo}`;
  if (!_asistenciaData[key]) {
    _asistenciaData[key] = { profesores: [], sesiones: { eval1: [], eval2: [], eval3: [] } };
  }
  const d = _asistenciaData[key];
  // Migración: cada profesor tiene un id propio y estable (no solo su posición
  // en el array), y un campo de correo — para el nuevo botón "Equipo docente"
  // y el envío de correos. No cambia cómo se enlaza con las sesiones de
  // asistencia (eso sigue siendo por posición, ya sincronizado en las
  // funciones que añaden/quitan profesores).
  d.profesores.forEach(p => {
    if (!p.id) p.id = 'prof' + Math.random().toString(36).slice(2, 9);
    if (typeof p.correo !== 'string') p.correo = '';
  });
  // Normaliza: cada evaluación debe tener exactamente una sesión por profesor
  // (mismo índice). Si faltan (datos antiguos, guardado parcial, etc.) se
  // rellenan en blanco en vez de dejar huecos que romperían _asistToggle y
  // el resto de funciones que indexan sesiones[evalKey][idx] por posición.
  const nProf = d.profesores.length;
  ['eval1', 'eval2', 'eval3'].forEach(k => {
    if (!Array.isArray(d.sesiones[k])) d.sesiones[k] = [];
    while (d.sesiones[k].length < nProf) d.sesiones[k].push({ asistio: null, justificacion: '' });
  });
  return d;
}

function _getAsistenciaIndicator(nivel, grupo) {
  const d = _asistenciaData[`${nivel}-${grupo}`];
  if (!d || !d.profesores.length) return '';
  const anyData = ['eval1','eval2','eval3'].some(k =>
    (d.sesiones[k]||[]).some(s => s.asistio !== null && s.asistio !== undefined)
  );
  return anyData ? ' <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--orange);vertical-align:middle;margin-left:2px;"></span>' : '';
}

function openAsistencia(nivel, grupo) {
  _asistCtx = { nivel, grupo, evalKey: 'eval1' };
  const d = _getAsistenciaData(nivel, grupo);
  document.getElementById('asistTitle').textContent = `👥 Asistencia a la sesión`;
  document.getElementById('asistSubtitle').textContent = `${nivel} — Grupo ${grupo} · ${d.profesores.length} profesor${d.profesores.length !== 1 ? 'es' : ''} registrado${d.profesores.length !== 1 ? 's' : ''}`;
  renderAsistTabs();
  renderAsistBody();
  document.getElementById('asistOverlay').classList.add('open');
}

function closeAsistencia() {
  document.getElementById('asistOverlay').classList.remove('open');
}

function renderAsistTabs() {
  const tabs = [
    { key: 'eval1', label: 'I Evaluación' },
    { key: 'eval2', label: 'II Evaluación' },
    { key: 'eval3', label: 'Eval. Final' },
    { key: '__profs__', label: '⚙ Equipo docente' },
  ];
  document.getElementById('asistTabs').innerHTML = tabs.map(t => `
    <button class="asist-tab ${_asistCtx.evalKey === t.key ? 'active' : ''}"
      onclick="_asistSetTab('${t.key}')">${t.label}</button>`).join('');
}

function _asistSetTab(key) {
  _asistCtx.evalKey = key;
  renderAsistTabs();
  renderAsistBody();
}

function renderAsistBody() {
  const { nivel, grupo, evalKey } = _asistCtx;
  const d = _getAsistenciaData(nivel, grupo);
  const body = document.getElementById('asistBody');

  if (evalKey === '__profs__') {
    // Solo lectura: el equipo docente ahora se gestiona desde su propio botón
    // "👨‍🏫 Equipo docente" (fuera de este modal). Aquí solo se muestra un
    // resumen y un acceso directo, para no duplicar la edición en dos sitios.
    const rows = d.profesores.map(p => `
      <div class="asist-prof-row" style="align-items:center;gap:10px;padding:8px 0;">
        <div style="flex:1;font-size:13px;font-weight:600;color:var(--text)">${(p.nombre||'—').replace(/</g,'&lt;')}</div>
        <div style="width:160px;font-size:12.5px;color:var(--text2)">${(p.materia||'—').replace(/</g,'&lt;')}</div>
        <div style="width:220px;font-size:12.5px;color:var(--text2)">${(p.correo||'—').replace(/</g,'&lt;')}</div>
      </div>
      <div style="height:1px;background:var(--border);opacity:0.5"></div>`).join('');

    body.innerHTML = `
      <div style="font-size:12px;color:var(--text2);margin-bottom:16px;line-height:1.6;background:var(--surface2);border-radius:8px;padding:10px 14px;border:1px solid var(--border)">
        📋 El equipo docente de <strong>${nivel} ${grupo}</strong> se gestiona ahora desde su propio botón, fuera de este modal — aquí solo se muestra para consulta.
      </div>
      <div id="asistProfList">${rows || `
        <div style="text-align:center;padding:28px;color:var(--text3);font-size:13px">
          <div style="font-size:28px;margin-bottom:8px">👥</div>
          Sin profesores registrados todavía.
        </div>`}
      </div>
      <div style="display:flex;gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid var(--border)">
        <button class="btn btn-primary btn-sm" onclick="closeAsistencia();openEquipoDocente('${nivel}','${grupo}')">👨‍🏫 Gestionar equipo docente</button>
      </div>
    `;
    return;
  }

  // Attendance for an evaluation
  const evalLabels = { eval1: 'I Evaluación', eval2: 'II Evaluación', eval3: 'Evaluación Final' };
  const sesiones = d.sesiones[evalKey] || [];

  // Sync sesiones length with profesores
  while (sesiones.length < d.profesores.length) sesiones.push({ asistio: null, justificacion: '' });
  d.sesiones[evalKey] = sesiones;

  if (!d.profesores.length) {
    body.innerHTML = `
      <div style="text-align:center;padding:32px;color:var(--text3)">
        <div style="font-size:28px;margin-bottom:10px">👥</div>
        <div style="font-size:13px;font-weight:600;margin-bottom:6px">Sin equipo docente configurado</div>
        <div style="font-size:12px;margin-bottom:16px">Añade el equipo docente desde su propio botón, fuera de este modal</div>
        <button class="btn btn-primary btn-sm" onclick="closeAsistencia();openEquipoDocente('${nivel}','${grupo}')">👨‍🏫 Gestionar equipo docente</button>
      </div>`;
    return;
  }

  const present  = sesiones.filter(s => s.asistio === true).length;
  const absent   = sesiones.filter(s => s.asistio === false).length;
  const pending  = sesiones.filter(s => s.asistio === null || s.asistio === undefined).length;

  const rows = d.profesores.map((p, i) => {
    const s = sesiones[i] || { asistio: null, justificacion: '' };
    const stateClass = s.asistio === true ? 'present' : s.asistio === false ? 'absent' : 'pending';
    const stateIcon  = s.asistio === true ? '✓' : s.asistio === false ? '✕' : '?';
    const isAbsent   = s.asistio === false;
    const presets = ['Baja médica', 'Otra sesión evaluación', 'Formación', 'Guardia / sustitución', 'Otro motivo'];
    return `
      <div class="asist-prof-row" style="flex-direction:column;align-items:stretch;gap:0;padding:10px 0">
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="asist-check ${stateClass}" title="${s.asistio===true?'Presente':s.asistio===false?'Ausente':'Sin marcar'}"
            onclick="_asistToggle(${i})">
            <span>${stateIcon}</span>
          </div>
          <div class="asist-prof-name">${(p.nombre||'—').replace(/</g,'&lt;')}</div>
          <div class="asist-prof-mat" style="margin-left:auto">${(p.materia||'—').replace(/</g,'&lt;')}</div>
          <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;flex-shrink:0;
            background:${s.asistio===true?'rgba(45,212,160,0.12)':s.asistio===false?'rgba(247,110,110,0.12)':'var(--surface3)'};
            color:${s.asistio===true?'var(--green)':s.asistio===false?'var(--red)':'var(--text3)'}">
            ${s.asistio===true?'Presente':s.asistio===false?'Ausente':'Sin marcar'}
          </span>
        </div>
        ${isAbsent ? `
        <div style="margin-top:8px;padding:10px 12px;background:rgba(247,110,110,0.06);border-radius:8px;border:1px solid rgba(247,110,110,0.2);margin-left:30px;">
          <div style="font-size:10px;color:var(--red);font-weight:700;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:7px">Motivo de la ausencia</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:7px">
            ${presets.map(pre => `<button class="btn btn-sm" style="font-size:10px;padding:2px 8px;
              background:${(s.justificacion||'')==='${pre}'?'rgba(247,110,110,0.2)':'var(--surface2)'};
              border:1px solid ${(s.justificacion||'')==='${pre}'?'rgba(247,110,110,0.5)':'var(--border)'};
              color:${(s.justificacion||'')==='${pre}'?'var(--red)':'var(--text2)'}"
              onclick="_asistSetJust(${i},'${pre.replace(/'/g,"\\'")}')">
              ${pre}
            </button>`).join('')}
          </div>
          <input class="asist-just-input visible" id="asistJust-${i}"
            placeholder="O escribe el motivo aquí…"
            value="${(s.justificacion||'').replace(/"/g,'&quot;')}"
            onchange="_asistUpdateJust(${i},this.value)"
            style="width:100%">
        </div>` : ''}
      </div>`;
  }).join('');

  const cleanRows = rows;

  body.innerHTML = `
    <div style="margin-bottom:4px;font-size:12px;color:var(--text3)">
      Haz clic en el círculo para marcar: <strong style="color:var(--green)">✓ Presente</strong> · <strong style="color:var(--red)">✕ Ausente</strong> · <strong style="color:var(--text3)">? Sin marcar</strong>
    </div>
    <div class="asist-summary">
      <div class="asist-sum-item"><div class="asist-sum-dot" style="background:var(--green)"></div><strong>${present}</strong> presentes</div>
      <div class="asist-sum-item"><div class="asist-sum-dot" style="background:var(--red)"></div><strong>${absent}</strong> ausentes</div>
      <div class="asist-sum-item"><div class="asist-sum-dot" style="background:var(--border)"></div><strong>${pending}</strong> sin marcar</div>
      <div style="margin-left:auto;display:flex;gap:6px;">
        <button class="btn btn-sm btn-ghost" style="font-size:11px" onclick="_asistSetAll('present')">✓ Marcar todos presentes</button>
        <button class="btn btn-sm btn-ghost" style="font-size:11px" onclick="_asistSetAll('pending')">↺ Limpiar</button>
      </div>
    </div>
    <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">
      ${evalLabels[evalKey]} — ${nivel} ${grupo}
    </div>
    <div id="asistProfRows">${cleanRows}</div>
  `;
}

window._asistToggle = function(idx) {
  const { nivel, grupo, evalKey } = _asistCtx;
  const d = _getAsistenciaData(nivel, grupo);
  const s = d.sesiones[evalKey][idx];
  // Cycle: null → true → false → null
  if (s.asistio === null || s.asistio === undefined) s.asistio = true;
  else if (s.asistio === true) s.asistio = false;
  else s.asistio = null;
  markDirty();
  renderAsistBody();
};

window._asistUpdateJust = function(idx, val) {
  const { nivel, grupo, evalKey } = _asistCtx;
  _getAsistenciaData(nivel, grupo).sesiones[evalKey][idx].justificacion = val;
  markDirty();
};

window._asistSetJust = function(idx, val) {
  const { nivel, grupo, evalKey } = _asistCtx;
  _getAsistenciaData(nivel, grupo).sesiones[evalKey][idx].justificacion = val;
  markDirty();
  renderAsistBody();
};

window._asistSetAll = function(state) {
  const { nivel, grupo, evalKey } = _asistCtx;
  const d = _getAsistenciaData(nivel, grupo);
  d.sesiones[evalKey].forEach(s => {
    s.asistio = state === 'present' ? true : null;
    if (state !== 'present') s.justificacion = '';
  });
  markDirty();
  renderAsistBody();
};

window._asistAddProf = function() {
  const { nivel, grupo } = _asistCtx;
  const d = _getAsistenciaData(nivel, grupo);
  d.profesores.push({ id: 'prof' + Math.random().toString(36).slice(2, 9), nombre: '', materia: '', correo: '' });
  ['eval1','eval2','eval3'].forEach(k => {
    if (!d.sesiones[k]) d.sesiones[k] = [];
    d.sesiones[k].push({ asistio: null, justificacion: '' });
  });
  markDirty();
  renderAsistBody();
};

window._asistDelProf = function(idx) {
  const { nivel, grupo } = _asistCtx;
  const d = _getAsistenciaData(nivel, grupo);
  d.profesores.splice(idx, 1);
  ['eval1','eval2','eval3'].forEach(k => {
    if (d.sesiones[k]) d.sesiones[k].splice(idx, 1);
  });
  markDirty();
  renderAsistBody();
};

window._asistUpdateProf = function(idx, field, val) {
  const { nivel, grupo } = _asistCtx;
  _getAsistenciaData(nivel, grupo).profesores[idx][field] = val;
  markDirty();
  // Update subtitle
  const d = _getAsistenciaData(nivel, grupo);
  const sub = document.getElementById('asistSubtitle');
  if (sub) sub.textContent = `${nivel} — Grupo ${grupo} · ${d.profesores.length} profesor${d.profesores.length !== 1 ? 'es' : ''} registrado${d.profesores.length !== 1 ? 's' : ''}`;
};

window._asistImportTutor = function() {
  const { nivel, grupo } = _asistCtx;
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
  renderAsistBody();
  showToast(`✅ ${t} añadido/a al equipo docente`);
};

function saveAsistencia() {
  markDirty();
  closeAsistencia();
  showToast('✅ Asistencia guardada');
}

function exportAsistenciaPDF() {
  const { nivel, grupo } = _asistCtx;
  const d = _getAsistenciaData(nivel, grupo);
  const iesName = document.getElementById('headerIesName')?.value || 'IES —';
  const tutor   = tutores[`${nivel}-${grupo}`] || '—';
  const dateStr = new Date().toLocaleDateString('es-ES', {year:'numeric', month:'long', day:'numeric'});
  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const evalKeys  = ['eval1','eval2','eval3'];
  const evalNames = ['I Evaluación','II Evaluación','Evaluación Final'];

  let tableHtml = '';
  evalKeys.forEach((key, ei) => {
    const ses = d.sesiones[key] || [];
    const present = ses.filter(s=>s.asistio===true).length;
    const absent  = ses.filter(s=>s.asistio===false).length;
    const pending = ses.filter(s=>s.asistio!==true&&s.asistio!==false).length;

    const rows = d.profesores.map((p, i) => {
      const s = ses[i] || {};
      const estado = s.asistio===true ? 'Presente' : s.asistio===false ? 'Ausente' : '—';
      const col    = s.asistio===true ? '#166534' : s.asistio===false ? '#991b1b' : '#888';
      const bg     = s.asistio===true ? '#f0fdf4' : s.asistio===false ? '#fef2f2' : '#fff';
      return `<tr style="background:${bg}">
        <td style="font-weight:600">${esc(p.nombre)||'—'}</td>
        <td>${esc(p.materia)||'—'}</td>
        <td style="text-align:center;font-weight:700;color:${col}">${estado}</td>
        <td style="font-size:9pt;color:${s.asistio===false?'#991b1b':'#555'};font-style:${s.justificacion?'normal':'italic'}">${esc(s.justificacion||'') || (s.asistio===false?'Sin justificar':'')}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="4" style="text-align:center;color:#888;font-style:italic">Sin profesores registrados</td></tr>`;

    tableHtml += `
      <div style="margin-bottom:24px;page-break-inside:avoid;">
        <div style="background:#1a3a6b;color:white;font-weight:700;padding:6px 12px;border-radius:4px 4px 0 0;font-size:10pt;display:flex;justify-content:space-between;">
          <span>${evalNames[ei]}</span>
          <span style="font-weight:400;font-size:9pt">${present} presentes · ${absent} ausentes${pending?` · ${pending} sin marcar`:''}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:9.5pt;">
          <thead><tr style="background:#dce8f5">
            <th style="padding:5px 8px;border:1px solid #9ab5d4;text-align:left;color:#1a3a6b;font-size:8.5pt">Profesor/a</th>
            <th style="padding:5px 8px;border:1px solid #9ab5d4;text-align:left;color:#1a3a6b;font-size:8.5pt">Materia</th>
            <th style="padding:5px 8px;border:1px solid #9ab5d4;text-align:center;color:#1a3a6b;font-size:8.5pt;width:100px">Asistencia</th>
            <th style="padding:5px 8px;border:1px solid #9ab5d4;text-align:left;color:#1a3a6b;font-size:8.5pt">Justificación ausencia</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  });

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Asistencia — ${esc(nivel)} ${esc(grupo)}</title>
    <style>
      * { margin:0;padding:0;box-sizing:border-box; }
      body { font-family:Arial,sans-serif;font-size:10.5pt;color:#111;background:#fff; }
      .page { padding:12mm 15mm; }
      @media print { @page{margin:10mm 12mm;size:A4;} body{-webkit-print-color-adjust:exact;print-color-adjust:exact;} .no-print{display:none;} }
      .toolbar{position:sticky;top:0;background:#1a1d27;padding:9px 18px;display:flex;align-items:center;justify-content:space-between;}
      .toolbar span{font-size:13px;font-weight:600;color:#e8eaf2;}
      .tbtn{padding:6px 14px;border-radius:7px;border:none;cursor:pointer;font-family:Arial;font-size:12px;font-weight:600;}
      td{padding:5px 8px;border:1px solid #c0d0e0;}
    </style></head><body>
    <div class="toolbar no-print">
      <span>👥 Lista de asistencia — ${esc(nivel)} ${esc(grupo)}</span>
      <div style="display:flex;gap:8px">
        <button class="tbtn" style="background:#2563eb;color:white" onclick="window.print()">🖨️ Imprimir / PDF</button>
        <button class="tbtn" style="background:transparent;color:#8891b4;border:1px solid #2e3350" onclick="window.close()">✕</button>
      </div>
    </div>
    <div class="page">
      <div style="border-bottom:3px solid #1a3a6b;padding-bottom:10px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-end">
        <div>
          <div style="font-size:8pt;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Conselleria d'Educació · ${esc(iesName)}</div>
          <div style="font-size:14pt;font-weight:bold;color:#1a3a6b">Control de asistencia a las sesiones de evaluación</div>
          <div style="font-size:10pt;color:#4a5580;margin-top:2px">${esc(nivel)} — Grupo ${esc(grupo)} · Tutor/a: ${esc(tutor)}</div>
        </div>
        <div style="text-align:right;font-size:8.5pt;color:#888">${dateStr}<br>${d.profesores.length} prof. registrados</div>
      </div>
      ${tableHtml}
      <div style="margin-top:20px;padding-top:10px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:8.5pt;color:#9ca3af">
        <span>EvalIES · ${esc(iesName)}</span>
        <span>Generado el ${dateStr}</span>
      </div>
    </div>
    <script>window.onload=function(){}<\/script>
    </body></html>`;

  const win = _ventanaDoc();
  if (win) { win.document.write(html); win.document.close(); }
  else showToast('⚠ Permite las ventanas emergentes para exportar');
}
