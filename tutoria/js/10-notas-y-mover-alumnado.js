/* ============================================================================
   Gestor de Tutoría · Deshacer, notas, mover alumnado e informe de Bachillerato
   tutoria/js/10-notas-y-mover-alumnado.js
   ============================================================================ */

// ===================== UNDO =====================

function withUndo(nivel, grupo, fn) {
  _undoPush(nivel, grupo);
  fn();
  showUndoToast(`↩ Deshacer último cambio`);
}

function deleteAlumnoNoConfirm(nivel, grupo, idx) {
  data[nivel][grupo].splice(idx, 1);
  updateTable(nivel, grupo);
  updateStats(nivel, grupo);
  updateStats2(nivel, grupo);
  updateCharts(nivel, grupo);
  markDirty();
  renderNivelTabs();
  if (currentNivel === '__home__') {
    clearTimeout(_resumenDebounce);
    _resumenDebounce = setTimeout(renderResumen, 400);
  }
}

// ===================== NOTAS =====================

let _activeNotesPanel = null;

function openNotesPanel(e, nivel, grupo, idx) {
  e.stopPropagation();
  closeNotesPanel();

  const alumno = data[nivel][grupo][idx];
  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();

  const panel = document.createElement('div');
  panel.className = 'notes-panel open';
  const spaceBelow = window.innerHeight - rect.bottom;
  panel.style.top = (spaceBelow > 200 ? rect.bottom + 6 : rect.top - 220) + 'px';
  panel.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 320)) + 'px';

  panel.innerHTML = `
    <div class="notes-panel-title">📝 Observaciones — ${alumno.nombre}</div>
    <textarea class="notes-textarea" id="notesPanelTA" placeholder="Escribe aquí tus observaciones sobre este alumno/a…">${alumno.notas || ''}</textarea>
    <div class="notes-panel-footer">
      <button class="btn btn-ghost btn-sm" onclick="closeNotesPanel()">Cerrar</button>
      <button class="btn btn-primary btn-sm" onclick="saveNote('${jsAttr(nivel)}','${jsAttr(grupo)}',${idx})">Guardar</button>
    </div>
  `;

  document.body.appendChild(panel);
  _activeNotesPanel = { panel, nivel, grupo, idx };
  document.getElementById('notesPanelTA').focus();
}

function saveNote(nivel, grupo, idx) {
  const ta = document.getElementById('notesPanelTA');
  if (!ta) return;
  data[nivel][grupo][idx].notas = ta.value.trim();
  markDirty();
  closeNotesPanel();
  // Refresh only the notes button visual state
  const key = `${nivel}-${grupo}`;
  const tbl = document.getElementById(`tbl-${key}`);
  if (tbl) {
    const rows = tbl.querySelectorAll('tbody tr');
    for (const row of rows) {
      if (parseInt(row.dataset.idx) === idx) {
        const nb = row.querySelector('.notes-btn');
        if (nb) {
          const hasNote = !!(data[nivel][grupo][idx].notas);
          nb.className = 'notes-btn' + (hasNote ? ' has-note' : '');
          nb.title = hasNote ? 'Ver/editar nota' : 'Añadir nota';
        }
        break;
      }
    }
  }
  showToast('📝 Nota guardada');
}

function closeNotesPanel() {
  if (_activeNotesPanel) {
    _activeNotesPanel.panel.remove();
    _activeNotesPanel = null;
  }
}

document.addEventListener('click', function(e) {
  if (_activeNotesPanel &&
      !_activeNotesPanel.panel.contains(e.target) &&
      !e.target.closest('.notes-btn')) {
    closeNotesPanel();
  }
});

// ===================== MOVER ALUMNO =====================
let _activeMovePanel = null;

function closeMovePanel() {
  if (_activeMovePanel) {
    _activeMovePanel.remove();
    _activeMovePanel = null;
  }
}

document.addEventListener('click', function(e) {
  if (_activeMovePanel &&
      !_activeMovePanel.contains(e.target) &&
      !e.target.closest('.move-btn')) {
    closeMovePanel();
  }
});

function openMovePanel(e, nivel, grupo, idx) {
  e.stopPropagation();
  closeMovePanel();

  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();
  const alumno = data[nivel][grupo][idx];

  const panel = document.createElement('div');
  panel.className = 'move-panel open';
  const spaceBelow = window.innerHeight - rect.bottom;
  panel.style.top = (spaceBelow > 220 ? rect.bottom + 6 : rect.top - 230) + 'px';
  panel.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 270)) + 'px';

  // Build nivel options (all except current)
  const nivelOpts = NIVELES.map(n =>
    `<option value="${n}" ${n === nivel ? 'selected' : ''}>${n}</option>`
  ).join('');

  function getGrupoOpts(targetNivel) {
    return (GRUPOS_POR_NIVEL[targetNivel] || []).map(g =>
      `<option value="${g}" ${targetNivel === nivel && g === grupo ? '' : ''}>${g}</option>`
    ).join('');
  }

  panel.innerHTML = `
    <div class="move-panel-title">↗ Mover alumno</div>
    <div style="font-size:12px;color:var(--text);font-weight:600;margin-bottom:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${alumno.nombre || 'Sin nombre'}</div>
    <label>Nivel destino</label>
    <select id="movePanelNivel" onchange="
      var g=document.getElementById('movePanelGrupo');
      var opts=(GRUPOS_POR_NIVEL[this.value]||[]).map(function(x){return '<option value=\\''+x+'\\'>'+x+'</option>';}).join('');
      g.innerHTML=opts;
    ">${nivelOpts}</select>
    <label>Grupo destino</label>
    <select id="movePanelGrupo">${getGrupoOpts(nivel)}</select>
    <div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end;">
      <button class="btn btn-ghost btn-sm" onclick="closeMovePanel()">Cancelar</button>
      <button class="btn btn-primary btn-sm" onclick="executeMoveAlumno('${jsAttr(nivel)}','${jsAttr(grupo)}',${idx})">↗ Mover</button>
    </div>
  `;

  document.body.appendChild(panel);
  _activeMovePanel = panel;
}

function executeMoveAlumno(nivelOrig, grupoOrig, idx) {
  const targetNivel = document.getElementById('movePanelNivel')?.value;
  const targetGrupo = document.getElementById('movePanelGrupo')?.value;
  if (!targetNivel || !targetGrupo) return;
  if (targetNivel === nivelOrig && targetGrupo === grupoOrig) {
    showToast('ℹ El alumno ya está en ese grupo');
    closeMovePanel();
    return;
  }
  const alumno = data[nivelOrig][grupoOrig][idx];
  if (!alumno) return;

  // Ensure destination exists
  if (!data[targetNivel]) data[targetNivel] = {};
  if (!data[targetNivel][targetGrupo]) data[targetNivel][targetGrupo] = [];

  // Remove from origin and add to destination
  data[nivelOrig][grupoOrig].splice(idx, 1);
  data[targetNivel][targetGrupo].push(alumno);

  markDirty();
  closeMovePanel();

  // Refresh origin group (always rendered since we're viewing it)
  updateTable(nivelOrig, grupoOrig);
  updateStats(nivelOrig, grupoOrig);
  updateStats2(nivelOrig, grupoOrig);
  updateCharts(nivelOrig, grupoOrig);
  updateTabProgress(nivelOrig, grupoOrig);

  // Refresh destination group only if currently visible
  if (currentNivel === targetNivel) {
    updateTable(targetNivel, targetGrupo);
    updateStats(targetNivel, targetGrupo);
    updateStats2(targetNivel, targetGrupo);
    updateCharts(targetNivel, targetGrupo);
    updateTabProgress(targetNivel, targetGrupo);
  }

  // Always refresh the nivel tabs so counters are correct everywhere
  renderNivelTabs();

  // If on __home__, refresh it too
  if (currentNivel === '__home__') {
    clearTimeout(_resumenDebounce);
    _resumenDebounce = setTimeout(renderResumen, 400);
  }

  showToast(`✅ ${alumno.nombre || 'Alumno'} movido a ${targetNivel} ${targetGrupo}`);
}

// Bulk move — opens a modal overlay
function openBulkMovePanel() {
  const { nivel, grupo } = _bulkContext;
  const key = `${nivel}-${grupo}`;
  const sel = _bulkSel[key];
  if (!sel || !sel.size) { showToast('ℹ No hay alumnos seleccionados'); return; }

  // Build modal
  let overlay = document.getElementById('bulkMoveOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'bulkMoveOverlay';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '600';
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
    document.body.appendChild(overlay);
  }

  const nivelOpts = NIVELES.map(n =>
    `<option value="${n}" ${n === nivel ? 'selected' : ''}>${n}</option>`
  ).join('');
  const grupoOpts = (GRUPOS_POR_NIVEL[nivel] || []).map(g =>
    `<option value="${g}">${g}</option>`
  ).join('');

  overlay.innerHTML = `
    <div class="modal" style="width:360px">
      <div class="modal-title">↗ Mover ${sel.size} alumno${sel.size !== 1 ? 's' : ''}</div>
      <div class="modal-field">
        <label class="modal-label">Nivel destino</label>
        <select class="modal-input" id="bulkMoveNivel" onchange="
          var g=document.getElementById('bulkMoveGrupo');
          var opts=(GRUPOS_POR_NIVEL[this.value]||[]).map(function(x){return '<option value=\\''+x+'\\'>'+x+'</option>';}).join('');
          g.innerHTML=opts;
        ">${nivelOpts}</select>
      </div>
      <div class="modal-field">
        <label class="modal-label">Grupo destino</label>
        <select class="modal-input" id="bulkMoveGrupo">${grupoOpts}</select>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="document.getElementById('bulkMoveOverlay').classList.remove('open')">Cancelar</button>
        <button class="btn btn-primary" onclick="executeBulkMove('${jsAttr(nivel)}','${jsAttr(grupo)}')">↗ Mover seleccionados</button>
      </div>
    </div>
  `;
  overlay.classList.add('open');
}

function executeBulkMove(nivelOrig, grupoOrig) {
  const targetNivel = document.getElementById('bulkMoveNivel')?.value;
  const targetGrupo = document.getElementById('bulkMoveGrupo')?.value;
  if (!targetNivel || !targetGrupo) return;
  if (targetNivel === nivelOrig && targetGrupo === grupoOrig) {
    showToast('ℹ Destino igual al origen');
    return;
  }

  const key = `${nivelOrig}-${grupoOrig}`;
  const sel = _bulkSel[key];
  if (!sel || !sel.size) return;

  if (!data[targetNivel]) data[targetNivel] = {};
  if (!data[targetNivel][targetGrupo]) data[targetNivel][targetGrupo] = [];

  // Sort descending so splices don't shift remaining indices
  const indices = [...sel].sort((a, b) => b - a);
  const moved = [];
  indices.forEach(idx => {
    const alumno = data[nivelOrig][grupoOrig][idx];
    if (alumno) {
      data[nivelOrig][grupoOrig].splice(idx, 1);
      moved.push(alumno);
    }
  });
  // Add to destination (preserve order)
  data[targetNivel][targetGrupo].push(...moved.reverse());

  markDirty();
  document.getElementById('bulkMoveOverlay').classList.remove('open');
  clearBulkSelection();

  // Refresh origin
  updateTable(nivelOrig, grupoOrig);
  updateStats(nivelOrig, grupoOrig);
  updateStats2(nivelOrig, grupoOrig);
  updateCharts(nivelOrig, grupoOrig);
  updateTabProgress(nivelOrig, grupoOrig);

  // Refresh destination if visible
  if (currentNivel === targetNivel) {
    updateTable(targetNivel, targetGrupo);
    updateStats(targetNivel, targetGrupo);
    updateStats2(targetNivel, targetGrupo);
    updateCharts(targetNivel, targetGrupo);
    updateTabProgress(targetNivel, targetGrupo);
  }
  renderNivelTabs();

  if (currentNivel === '__home__') { clearTimeout(_resumenDebounce); _resumenDebounce = setTimeout(renderResumen, 400); }

  showToast(`✅ ${moved.length} alumno${moved.length !== 1 ? 's' : ''} movido${moved.length !== 1 ? 's' : ''} a ${targetNivel} ${targetGrupo}`);
}

// ===================== INFORME BACHILLERATO =====================

function openInformeBach(nivel, grupo, evalNum, forzarRegenerar) {
  const overlay = document.getElementById('informeOverlay');
  const contentEl = document.getElementById('informeContent');
  const titleEl = document.getElementById('informeToolbarTitle');
  window._actaActual = { nivel, grupo, evalNum };

  const evalNames = {1:'Primera',2:'Segunda',3:'Final'};
  const titulosBach = {1: 'Acta I Evaluación', 2: 'Acta II Evaluación', 3: 'Acta Evaluación Final'};
  titleEl.textContent = `${titulosBach[evalNum]} — ${nivel} ${grupo}`;

  // Si existe una versión guardada de esta acta, se carga directamente para
  // poder continuar editándola, salvo que se pida regenerarla en blanco.
  if (!forzarRegenerar) {
    const guardada = _actaGetGuardada(nivel, grupo, evalNum);
    if (guardada) {
      contentEl.innerHTML = guardada.html;
      _actaEnableRowDelete(contentEl);
      overlay.style.display = 'flex';
      _actaMostrarAvisoGuardada(guardada.savedAt);
      return;
    }
  }

  const alumnos = data[nivel][grupo];
  const tutor = tutores[`${nivel}-${grupo}`] || '___________________________';
  const date = new Date();
  const dateStr = `${date.getDate()} de ${['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][date.getMonth()]} de ${date.getFullYear()}`;

  const totalAl = alumnos.length;
  const evalField = evalNum === 1 ? 'eval1' : evalNum === 2 ? 'eval2' : 'eval3';
  const todos0 = alumnos.filter(a => (+a[evalField]||0) === 0).length;
  const entre1_2 = alumnos.filter(a => { const v=+a[evalField]||0; return v>=1&&v<=2; }).length;
  const entre3_5 = alumnos.filter(a => { const v=+a[evalField]||0; return v>=3&&v<=5; }).length;
  const mas5 = alumnos.filter(a => (+a[evalField]||0) > 5).length;

  const emptyRows = (n, cols) => Array(n).fill('').map(()=>
    `<tr>${Array(cols).fill('<td contenteditable="true">&nbsp;</td>').join('')}</tr>`
  ).join('');

  // Alumnos with propuesta en eval extraordinaria (only for evalNum===3)
  const propField = evalNum === 1 ? 'propuesta1' : evalNum === 2 ? 'propuesta2' : 'propuesta3';
  const repAlumnos = alumnos.filter(a => getPropObj(a[propField]).tipo === 'Repetición');
  const promoAlumnos = alumnos.filter(a => getPropObj(a[propField]).tipo === 'Promoción');
  const titulaAlumnos = alumnos.filter(a => getPropObj(a[propField]).tipo === 'Titulación');

  // For final: alumnos with evalExtr
  const extrAlumnos = evalNum === 3 ? alumnos.filter(a => (+a.evalExtr||0) > 0) : [];
  const extrRows = (extrAlumnos.length
    ? extrAlumnos.map(a=>`<tr><td>${a.nombre}</td><td style="text-align:center;font-weight:700">${a.evalExtr}</td><td contenteditable="true">&nbsp;</td></tr>`).join('')
      + emptyRows(Math.max(0,4-extrAlumnos.length),3)
    : emptyRows(4,3)) + _actaAddRowBtnRow(3);

  const tituloActaPorEval = {1: 'ACTA I EVALUACIÓN', 2: 'ACTA II EVALUACIÓN', 3: 'ACTA EVALUACIÓN FINAL'};

  let html = '<div class="inf-body"><div class="inf-page1">';

  html += `
    <div class="inf-header-box">
      <div class="inf-header-title">
        ${tituloActaPorEval[evalNum]} — BACHILLERATO
      </div>
      <div class="inf-header-row">
        <div class="inf-header-field"><label>Curso:</label><input type="text" value="${nivel}" /></div>
        <div class="inf-header-field"><label>Modalidad:</label><input type="text" value="${grupo}" /></div>
        <div class="inf-header-field"><label>Tutor/a:</label><input type="text" value="${tutor}" style="min-width:200px;" /></div>
        <div class="inf-header-field"><label>Evaluación:</label>
          <select>
            <option ${evalNum===1?'selected':''}>1ª Evaluación</option>
            <option ${evalNum===2?'selected':''}>2ª Evaluación</option>
            <option ${evalNum===3?'selected':''}>Evaluación Final</option>
          </select>
        </div>
        <div class="inf-header-field"><label>Fecha:</label><input type="text" value="${dateStr}" style="min-width:180px;" /></div>
      </div>
    </div>`;

  // Stats cards
  html += `
    <div class="inf-stats-grid">
      <div class="inf-stat-card blue">
        <div class="inf-stat-label">Total alumnado</div>
        <div class="inf-stat-value blue">${totalAl}</div>
      </div>
      <div class="inf-stat-card green">
        <div class="inf-stat-label">Todo aprobado</div>
        <div class="inf-stat-value green">${todos0}</div>
      </div>
      <div class="inf-stat-card yellow">
        <div class="inf-stat-label">1–2 mat. no sup.</div>
        <div class="inf-stat-value yellow">${entre1_2}</div>
      </div>
      <div class="inf-stat-card red">
        <div class="inf-stat-label">3+ mat. no sup.</div>
        <div class="inf-stat-value red">${entre3_5 + mas5}</div>
      </div>
      ${evalNum >= 2 ? `
      <div class="inf-stat-card red">
        <div class="inf-stat-label">No promociona</div>
        <div class="inf-stat-value red">${repAlumnos.length}</div>
      </div>
      <div class="inf-stat-card green">
        <div class="inf-stat-label">Promociona</div>
        <div class="inf-stat-value green">${promoAlumnos.length}</div>
      </div>
      <div class="inf-stat-card blue">
        <div class="inf-stat-label">Titula</div>
        <div class="inf-stat-value blue">${titulaAlumnos.length}</div>
      </div>
      <div class="inf-stat-card yellow">
        <div class="inf-stat-label">Eval. extraord.</div>
        <div class="inf-stat-value yellow">${extrAlumnos.length}</div>
      </div>` : ''}
    </div>`;

  html += `
    <div class="inf-section">
      <div class="inf-section-title">1. Análisis de resultados académicos</div>
      <table class="inf-table">
        <tr><th style="width:55%">Información</th><th>Datos</th></tr>
        <tr><td>Total alumnado</td><td style="text-align:center;font-weight:bold">${totalAl}</td></tr>
        <tr><td>Alumnado con todo aprobado</td><td contenteditable="true" style="text-align:center;font-weight:bold">${todos0}</td></tr>
        <tr><td>Alumnado con 1-2 materias no superadas</td><td contenteditable="true" style="text-align:center;font-weight:bold">${entre1_2}</td></tr>
        <tr><td>Alumnado con 3-5 materias no superadas</td><td contenteditable="true" style="text-align:center;font-weight:bold">${entre3_5}</td></tr>
        <tr><td>Alumnado con más de 5 materias no superadas</td><td contenteditable="true" style="text-align:center;font-weight:bold">${mas5}</td></tr>
        <tr><td>Materias con más del 50% de no superadas</td><td contenteditable="true">&nbsp;</td></tr>
      </table>
    </div>`;

  if (evalNum >= 2) {
    html += `
      <div class="inf-section">
        <div class="inf-section-title">2. Propuestas de evaluación</div>
        <table class="inf-table">
          <tr><th style="width:35%">Decisión</th><th>Alumnado</th><th style="width:35%">Observaciones</th></tr>
          <tr><td style="font-weight:bold;color:#c0392b">No Promociona / Repite</td>
            <td contenteditable="true" style="text-align:center">${repAlumnos.length > 0 ? repAlumnos.map(a=>a.nombre).join(', ') : '—'}</td>
            <td contenteditable="true">&nbsp;</td></tr>
          <tr><td style="font-weight:bold;color:#27ae60">Promociona</td>
            <td contenteditable="true" style="text-align:center">${promoAlumnos.length}</td>
            <td contenteditable="true">&nbsp;</td></tr>
          <tr><td style="font-weight:bold;color:#8e44ad">Titula</td>
            <td contenteditable="true" style="text-align:center">${titulaAlumnos.length}</td>
            <td contenteditable="true">&nbsp;</td></tr>
        </table>
      </div>`;
  }

  if (evalNum === 3) {
    html += `
      <div class="inf-section">
        <div class="inf-section-title">3. Alumnado con materias pendientes de Evaluación Extraordinaria</div>
        <table class="inf-table">
          <tr><th style="width:40%">Alumno/a</th><th style="width:15%">Nº Mat.</th><th>Observaciones</th></tr>
          ${extrRows}
        </table>
      </div>`;
  }

  html += `
    <div class="inf-section">
      <div class="inf-section-title">${evalNum===3?'4':'3'}. Valoración general del grupo y propuestas de mejora</div>
      <table class="inf-table">
        <tr><th style="width:35%">Aspecto</th><th>Valoración</th></tr>
        <tr><td style="font-weight:bold">Clima de aula y convivencia</td><td contenteditable="true">&nbsp;</td></tr>
        <tr><td style="font-weight:bold">Motivación y actitud</td><td contenteditable="true">&nbsp;</td></tr>
        <tr><td style="font-weight:bold">Hábito de estudio / trabajo</td><td contenteditable="true">&nbsp;</td></tr>
        <tr><td style="font-weight:bold">Orientación universitaria / FP</td><td contenteditable="true">&nbsp;</td></tr>
        <tr><td style="font-weight:bold">Propuestas de mejora</td><td contenteditable="true">&nbsp;</td></tr>
      </table>
    </div>`;

  html += `
    <div class="inf-section">
      <div class="inf-section-title">${evalNum===3?'5':'4'}. Alumnado con necesidades específicas de apoyo educativo (NESE)</div>
      <table class="inf-table">
        <tr><th style="width:35%">Alumno/a</th><th style="width:25%">Tipo de necesidad</th><th>Medidas adoptadas</th></tr>
        ${alumnos.filter(a=>a.nese==='Sí').map(a=>`<tr><td>${a.nombre}</td><td contenteditable="true">${_getNeseCodes(a.recursoNese).join('/') || '&nbsp;'}</td><td contenteditable="true">&nbsp;</td></tr>`).join('') || emptyRows(3,3)}
        ${_actaAddRowBtnRow(3)}
      </table>
    </div>`;

  html += `
    <div class="inf-sign" style="margin-top:auto;">
      <div class="inf-sign-block">
        <div class="inf-sign-label">Tutor/a del grupo</div>
        <div class="inf-sign-line"></div>
        <div class="inf-sign-name">${tutor !== '___________________________' ? tutor : ''}</div>
      </div>
      <div class="inf-sign-block">
        <div class="inf-sign-label">Jefe/a de Estudios</div>
        <div class="inf-sign-line"></div>
      </div>
      <div class="inf-sign-block">
        <div class="inf-sign-label">Fecha de la sesión</div>
        <div class="inf-sign-line"></div>
      </div>
    </div>`;

  html += `
    </div><!-- /inf-page1 -->
    <div class="inf-pagebreak"></div>
    <div class="inf-profesorado-page">
      <div class="inf-section">
        <div class="inf-section-title">${evalNum===3?'6':'5'}. Profesorado asistente a la sesión de evaluación</div>
        <table class="inf-table">
          <tr><th style="width:55%">Nombre del profesor/a</th><th>Materia que imparte</th></tr>
          ${emptyRows(20,2)}
          ${_actaAddRowBtnRow(2)}
        </table>
      </div>
      <div class="inf-sign" style="margin-top:auto">
        <div class="inf-sign-block">
          <div class="inf-sign-label">Tutor/a del grupo</div>
          <div class="inf-sign-line"></div>
          <div class="inf-sign-name">${tutor !== '___________________________' ? tutor : ''}</div>
        </div>
        <div class="inf-sign-block">
          <div class="inf-sign-label">Jefe/a de Estudios</div>
          <div class="inf-sign-line"></div>
        </div>
        <div class="inf-sign-block">
          <div class="inf-sign-label">Fecha</div>
          <div class="inf-sign-line"></div>
        </div>
      </div>
    </div>`;

  html += '</div>';
  contentEl.innerHTML = html;
  _actaEnableRowDelete(contentEl);
  overlay.style.display = 'flex';
  _actaOcultarAviso();
}
