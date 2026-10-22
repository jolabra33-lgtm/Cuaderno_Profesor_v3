/* ============================================================================
   Gestor de Tutoría · Informes de evaluación y actas no oficiales
   tutoria/js/07-actas.js
   ============================================================================ */

// ===================== INFORMES DE EVALUACIÓN =====================

// ===================== GUARDADO DE ACTAS DE EVALUACIÓN =====================
// Las actas (I/II Evaluación y Evaluación Final) se rellenan a mano con campos
// editables (contenteditable, inputs, selects). Para poder rellenarlas un día y
// continuar otro, su contenido HTML ya editado se guarda en window._actasData,
// indexado por nivel-grupo-evaluación, y persiste igual que el resto de datos
// de la app (autoguardado en localStorage vía buildState/loadFromLocalStorage).
function _actaKey(nivel, grupo, evalNum) { return `${nivel}-${grupo}-eval${evalNum}`; }

function _actaGetGuardada(nivel, grupo, evalNum) {
  if (!window._actasData) window._actasData = {};
  return window._actasData[_actaKey(nivel, grupo, evalNum)] || null;
}

// Guarda el contenido actualmente editado del acta abierta en el overlay.
function saveActa() {
  if (!window._actaActual) { showToast('⚠ No hay un acta abierta'); return; }
  const { nivel, grupo, evalNum } = window._actaActual;
  const contentEl = document.getElementById('informeContent');
  if (!contentEl) return;
  if (!window._actasData) window._actasData = {};
  window._actasData[_actaKey(nivel, grupo, evalNum)] = {
    html: contentEl.innerHTML,
    savedAt: new Date().toISOString(),
  };
  markDirty();
  const btn = document.getElementById('actaSaveBtn');
  if (btn) {
    const original = btn.textContent;
    btn.textContent = '✓ Guardado';
    setTimeout(() => { if (btn) btn.textContent = original; }, 1600);
  }
  // Aviso proactivo: el HTML completo de cada acta puede pesar bastante. Si el
  // conjunto de actas guardadas crece mucho, conviene avisar ANTES de que el
  // autoguardado falle por memoria llena (límite típico ~5-10 MB por dominio).
  const actasSize = getActasStorageSize();
  const ACTAS_WARN_THRESHOLD = 1_500_000; // ~1.5 MB
  if (actasSize > ACTAS_WARN_THRESHOLD && !window._actasSizeWarned) {
    window._actasSizeWarned = true;
    showToast(`💾 Acta guardada — ⚠ las actas guardadas ocupan ya ${_fmtBytes(actasSize)}. Si notas que el autoguardado falla, exporta una copia con Ctrl+S.`);
  } else {
    showToast('💾 Acta guardada — puedes continuar rellenándola otro día');
  }
}

// Borra la versión guardada del acta abierta y la regenera en blanco desde los
// datos actuales del grupo (por si el tutor quiere empezar de nuevo).
async function resetActa() {
  if (!window._actaActual) return;
  const { nivel, grupo, evalNum } = window._actaActual;
  if (!await confirmar('¿Descartar el acta guardada y generarla de nuevo en blanco con los datos actuales del grupo?')) return;
  if (window._actasData) delete window._actasData[_actaKey(nivel, grupo, evalNum)];
  markDirty();
  if (isBach(nivel)) openInformeBach(nivel, grupo, evalNum, true);
  else openInforme(nivel, grupo, evalNum, true);
}

// Muestra en la toolbar del acta un pequeño aviso de que se ha cargado una
// versión previamente guardada, con la fecha, para que quede claro que no es
// una generación nueva en blanco.
function _actaMostrarAvisoGuardada(savedAt) {
  const bar = document.getElementById('actaSavedNotice');
  if (!bar) return;
  let fecha = '';
  try {
    const d = new Date(savedAt);
    fecha = d.toLocaleDateString('es-ES', {day:'numeric',month:'long',year:'numeric'}) + ' a las ' +
      d.toLocaleTimeString('es-ES', {hour:'2-digit',minute:'2-digit'});
  } catch (e) {}
  bar.innerHTML = `📂 Continuando un acta guardada${fecha ? ' el ' + fecha : ''} ·
    <a href="#" onclick="resetActa();return false;" style="color:#f5c842;text-decoration:underline;cursor:pointer;">empezar en blanco</a>`;
  bar.style.display = 'block';
}

function _actaOcultarAviso() {
  const bar = document.getElementById('actaSavedNotice');
  if (bar) bar.style.display = 'none';
}

// ===================== ANOTACIONES DEL ACTA OFICIAL =====================
// El Acta Oficial (ver openActaOficial) se genera en una ventana aparte, así
// que sus campos rellenables (acuerdos, firmas de Jefatura/Dirección y las
// decisiones sobre materias pendientes de cursos anteriores) no pueden
// guardarse solos ahí: la ventana emergente llama de vuelta a esta función,
// en la ventana principal (vía window.opener), y aquí se guardan indexados
// por nivel-grupo-evaluación para que persistan con el resto de datos de la
// app (autoguardado, archivo .json, etc.). El resto del acta (listados,
// estadísticas...) siempre se recalcula a partir de los datos actuales del
// grupo cada vez que se abre, para no mostrar notas desactualizadas.
function _actaOficialKey(nivel, grupo, evalNum) { return `${nivel}-${grupo}-eval${evalNum}`; }

function _actaOficialGetGuardada(nivel, grupo, evalNum) {
  if (!window._actasOficialesData) window._actasOficialesData = {};
  return window._actasOficialesData[_actaOficialKey(nivel, grupo, evalNum)] || null;
}

function guardarActaOficial(nivel, grupo, evalNum, payload) {
  if (!window._actasOficialesData) window._actasOficialesData = {};
  window._actasOficialesData[_actaOficialKey(nivel, grupo, evalNum)] = {
    ...payload,
    savedAt: new Date().toISOString(),
  };
  markDirty();
  showToast('💾 Acta Oficial guardada — anotaciones, firmas y decisiones sobre pendientes conservadas');
  return true;
}

// ── Filas ampliables en las actas ──────────────────────────────────────────
// Genera la fila con el botón "+ Añadir fila" que se coloca al final de cada
// bloque de tabla. cols = nº de celdas editables que tendrá la fila nueva.
// rowspanTargetId (opcional) = id de la celda con rowspan del bloque (para las
// tablas agrupadas de la Sección 1), a la que hay que sumarle 1 al insertar.
function _actaAddRowBtnRow(cols, rowspanTargetId) {
  return `<tr class="no-print acta-addrow-row">
    <td colspan="${cols}" style="text-align:center;padding:4px;background:#f7fafd;border:1px dashed #9ab5d4;">
      <button type="button" onclick="actaAddRow(this, ${cols}${rowspanTargetId ? `, '${rowspanTargetId}'` : ''})" style="padding:3px 12px;border-radius:5px;border:1px solid #4f8ef7;background:#eaf2ff;color:#2f6fb3;cursor:pointer;font-family:inherit;font-size:9.5pt;font-weight:600;">+ Añadir fila</button>
    </td>
  </tr>`;
}

// Inserta una fila nueva (con `cols` celdas editables) justo encima de la fila
// del botón que la ha generado, para que el botón se quede siempre al final.
// Si el bloque tiene una celda con rowspan (Sección 1), se le suma 1 para que
// siga cubriendo todas las filas del grupo, incluida la nueva.
function actaAddRow(btn, cols, rowspanTargetId) {
  const row = btn.closest('tr');
  if (!row || !row.parentNode) return;
  const tr = document.createElement('tr');
  tr.className = 'inf-empty-row';
  for (let i = 0; i < cols; i++) {
    const td = document.createElement('td');
    td.setAttribute('contenteditable', 'true');
    td.innerHTML = '&nbsp;';
    tr.appendChild(td);
  }
  row.parentNode.insertBefore(tr, row);
  if (rowspanTargetId) {
    const cell = document.getElementById(rowspanTargetId);
    if (cell) {
      const cur = parseInt(cell.getAttribute('rowspan') || '1', 10);
      cell.setAttribute('rowspan', String(cur + 1));
    }
  }
  const firstTd = tr.querySelector('td[contenteditable]');
  if (firstTd) firstTd.focus();
  _actaAttachDelBtn(tr);
}

// ── Eliminar filas en las tablas ampliables de las actas ────────────────────
// Recorre todas las tablas que tienen botón "+ Añadir fila" y añade, a cada
// fila de datos del bloque (tanto a las que ya venían prellenadas como a las
// vacías), un pequeño botón "✕" para poder quitarla. No se añade a la fila
// "ancla" de los bloques con celda de rowspan (Sección 1), para no romper esa
// celda compartida; esas filas solo se pueden vaciar de contenido, no borrar.
function _actaEnableRowDelete(scope) {
  const root = scope || document.getElementById('informeContent');
  if (!root) return;
  root.querySelectorAll('tr.acta-addrow-row').forEach(addRow => {
    const btnTd = addRow.querySelector('td');
    if (!btnTd) return;
    const cols = btnTd.colSpan || 1;
    let sib = addRow.previousElementSibling;
    while (sib && sib.tagName === 'TR') {
      if (sib.classList.contains('acta-addrow-row')) break; // fin del grupo anterior
      if (sib.querySelector(':scope > th')) break; // fila de cabecera de la tabla
      const tds = sib.querySelectorAll(':scope > td');
      if (tds.length !== cols) break; // fila "ancla" con rowspan u otra estructura
      _actaAttachDelBtn(sib);
      sib = sib.previousElementSibling;
    }
  });
}

// Añade el botón de eliminar a una fila concreta (si no lo tiene ya).
function _actaAttachDelBtn(tr) {
  if (!tr || tr.querySelector(':scope > td > .acta-delrow-btn')) return;
  const tds = tr.querySelectorAll(':scope > td');
  if (!tds.length) return;
  tds[tds.length - 1].insertAdjacentHTML('beforeend',
    '<button type="button" class="acta-delrow-btn no-print" contenteditable="false" ' +
    'title="Eliminar esta fila" onclick="actaDelRow(this)">✕</button>');
}

// Quita la fila donde está el botón pulsado. Si la fila pertenece a un bloque
// con una celda "ancla" con rowspan (Sección 1), reduce ese rowspan en 1 para
// que la tabla no se descuadre al desaparecer una fila del grupo.
function actaDelRow(btn) {
  const tr = btn.closest('tr');
  if (!tr || !tr.parentNode) return;
  let sib = tr.previousElementSibling;
  while (sib && sib.tagName === 'TR') {
    const rsCell = sib.querySelector(':scope > td[rowspan]');
    if (rsCell) {
      const span = parseInt(rsCell.getAttribute('rowspan') || '1', 10);
      if (span > 1) rsCell.setAttribute('rowspan', String(span - 1));
      break;
    }
    if (sib.classList.contains('acta-addrow-row') || sib.querySelector(':scope > th')) break;
    sib = sib.previousElementSibling;
  }
  tr.remove();
}

function openInforme(nivel, grupo, evalNum, forzarRegenerar) {
  // Bach niveles have their own report
  if (isBach(nivel)) { openInformeBach(nivel, grupo, evalNum, forzarRegenerar); return; }

  const overlay = document.getElementById('informeOverlay');
  const contentEl = document.getElementById('informeContent');
  const titleEl = document.getElementById('informeToolbarTitle');
  window._actaActual = { nivel, grupo, evalNum };

  const titles = {1: 'Acta I Evaluación', 2: 'Acta II Evaluación', 3: 'Acta Evaluación Final'};
  const evalNames = {1: 'Primera', 2: 'Segunda', 3: 'Final'};
  titleEl.textContent = `${titles[evalNum]} — ${nivel} ${grupo}`;

  // Si existe una versión guardada de esta acta (rellenada previamente), se
  // carga directamente para poder continuar editándola, salvo que se pida
  // explícitamente regenerarla en blanco.
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

  // Stats calculated from data
  const totalAl = alumnos.length;
  const conNese = alumnos.filter(a => a.nese === 'Sí').length;
  const repetidores = alumnos.filter(a => a.repetidor === 'Sí').length;

  const evalField = evalNum === 1 ? 'eval1' : evalNum === 2 ? 'eval2' : 'eval3';
  const todos0 = alumnos.filter(a => (a[evalField]||0) === 0).length;
  const entre1_2 = alumnos.filter(a => {const v=a[evalField]||0; return v>=1&&v<=2;}).length;
  const entre3_5 = alumnos.filter(a => {const v=a[evalField]||0; return v>=3&&v<=5;}).length;
  const mas5 = alumnos.filter(a => (a[evalField]||0) > 5).length;

  // Alumnos con NESE for the cases table
  const nesAlumnos = alumnos.filter(a => a.nese === 'Sí' || _getNeseCodes(a.recursoNese).length || (Array.isArray(a.codComp)?a.codComp.length:a.codComp));

  // CSS is in the main <style> block above
  const css = '';

  // Build empty rows helper
  const emptyRows = (n, cols) => Array(n).fill('').map(()=>
    `<tr class="inf-empty-row">${Array(cols).fill('<td contenteditable="true">&nbsp;</td>').join('')}</tr>`
  ).join('');

  // Pre-fill alumnos NESE table rows
  const neseRows = nesAlumnos.length > 0
    ? nesAlumnos.map(a => `<tr>
        <td>${a.nombre||''}</td>
        <td contenteditable="true">${a.nese==='Sí'?(_getNeseCodes(a.recursoNese).join('+') || 'NESE'):''}</td>
        <td contenteditable="true">&nbsp;</td>
        <td contenteditable="true">&nbsp;</td>
      </tr>`).join('') + emptyRows(Math.max(0, 5-nesAlumnos.length), 4)
    : emptyRows(5, 4);

  // Alumnos repetidores
  const repAlumnos = alumnos.filter(a => a.repetidor === 'Sí');
  const REP_ROWS_BASE = 6;
  const repRows = (repAlumnos.length > 0
    ? repAlumnos.map(a => `<tr>
        <td>${a.nombre||''}</td>
        <td contenteditable="true">&nbsp;</td>
      </tr>`).join('') + emptyRows(Math.max(0, REP_ROWS_BASE-repAlumnos.length), 2)
    : emptyRows(REP_ROWS_BASE, 2)) + _actaAddRowBtnRow(2);

  // Alumnos NESE para pre-rellenar sección 1
  const neseAlumnos = alumnos.filter(a => a.nese === 'Sí');
  const nesePreRows = neseAlumnos.length > 0
    ? neseAlumnos.map(a => `<tr>
        <td contenteditable="true">${_getNeseCodes(a.recursoNese).join('/') || '&nbsp;'}</td>
        <td contenteditable="true">${a.nombre||''}</td>
        <td contenteditable="true">&nbsp;</td>
        <td contenteditable="true">&nbsp;</td>
      </tr>`).join('') + emptyRows(Math.max(0, 8-neseAlumnos.length), 4)
    : emptyRows(8, 4);

  // Alumnos con propuesta de repetición (según la evaluación: I, II o III)
  const propField = evalNum === 1 ? 'propuesta1' : evalNum === 2 ? 'propuesta2' : 'propuesta3';
  const repPropAlumnos = alumnos.filter(a => getPropObj(a[propField]).tipo === 'Repetición');
  const repPropRows = (repPropAlumnos.length > 0
    ? repPropAlumnos.map(a => {
        const ev = evalNum === 1 ? (a.eval1||0) : evalNum === 2 ? (a.eval2||0) : (a.eval3||0);
        return `<tr>
          <td>${a.nombre||''}</td>
          <td contenteditable="true">${ev > 0 ? ev + ' mat. no superadas' : ''}</td>
          <td contenteditable="true">&nbsp;</td>
        </tr>`;
      }).join('') + emptyRows(Math.max(0, 5-repPropAlumnos.length), 3)
    : emptyRows(5, 3)) + _actaAddRowBtnRow(3);

  // Alumnos que promocionan con suspensos (eval final)
  const promoConSusp = alumnos.filter(a => getPromocionaTipo(a) === 'Promoción' && (a.eval3||0) > 0);
  const promoSuspRows = (promoConSusp.length > 0
    ? promoConSusp.map(a => `<tr>
        <td>${a.nombre||''}</td>
        <td contenteditable="true">${(a.eval3||0)} mat. no superadas</td>
      </tr>`).join('') + emptyRows(Math.max(0, 5-promoConSusp.length), 2)
    : emptyRows(5, 2)) + _actaAddRowBtnRow(2);

  // Build reports
  const tituloActaPorEval = {1: 'ACTA I EVALUACIÓN', 2: 'ACTA II EVALUACIÓN', 3: 'ACTA EVALUACIÓN FINAL'};

  let html = css + '<div class="inf-body"><div class="inf-page1">';

  // ─── HEADER ───
  html += `
    <div class="inf-header-box">
      <div class="inf-header-title">
        ${tituloActaPorEval[evalNum]} — ESO
      </div>
      <div class="inf-header-row">
        <div class="inf-header-field"><label>Curso:</label><input type="text" value="${nivel}" /></div>
        <div class="inf-header-field"><label>Grupo:</label><input type="text" value="${grupo}" /></div>
        <div class="inf-header-field"><label>Tutor/a:</label><input type="text" value="${tutor}" style="min-width:200px;" /></div>
        <div class="inf-header-field"><label>Trimestre:</label>
          <select>
            <option ${evalNum===1?'selected':''}>1º Trimestre</option>
            <option ${evalNum===2?'selected':''}>2º Trimestre</option>
            <option ${evalNum===3?'selected':''}>3º Trimestre</option>
          </select>
        </div>
        <div class="inf-header-field"><label>Fecha:</label><input type="text" value="${dateStr}" style="min-width:180px;" /></div>
      </div>
    </div>`;

  // ─── STATS CARDS ───
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
      <div class="inf-stat-card red">
        <div class="inf-stat-label">Repetidores</div>
        <div class="inf-stat-value red">${repetidores}</div>
      </div>
      <div class="inf-stat-card yellow">
        <div class="inf-stat-label">Con NESE</div>
        <div class="inf-stat-value yellow">${conNese}</div>
      </div>
      <div class="inf-stat-card red">
        <div class="inf-stat-label">Propuesta repet.</div>
        <div class="inf-stat-value red">${alumnos.filter(a=>getPropObj(a[propField]).tipo==='Repetición').length}</div>
      </div>
      <div class="inf-stat-card green">
        <div class="inf-stat-label">Propuesta promo.</div>
        <div class="inf-stat-value green">${alumnos.filter(a=>getPropObj(a[propField]).tipo==='Promoción').length}</div>
      </div>
      ${alumnos.filter(a=>getPropObj(a[propField]).tipo==='Abandono').length > 0 ? `
      <div class="inf-stat-card" style="border-top:3px solid #9aa3bb">
        <div class="inf-stat-label">Abandono</div>
        <div class="inf-stat-value" style="color:#555">${alumnos.filter(a=>getPropObj(a[propField]).tipo==='Abandono').length}</div>
      </div>` : ''}
    </div>`;

  // ─── SECCIÓN 1: Alumnado con dificultades ───
  html += `
    <div class="inf-section">
      <div class="inf-section-title">1. Relación de alumnado con dificultades (casos particulares)</div>
      <table class="inf-table" style="table-layout:fixed;">
        <colgroup>
          <col style="width:20%">
          <col style="width:25%">
          <col style="width:16%">
          <col style="width:39%">
        </colgroup>
        <tr>
          <th>Problemática</th>
          <th>Alumno/a</th>
          <th>Áreas/Mat.</th>
          <th>Medidas a tomar</th>
        </tr>
        <tr>
          <td rowspan="8" id="s1LabelComport" style="font-weight:bold;vertical-align:top;background:#dce8f5;">Comportamiento / Convivencia</td>
          ${Array(4).fill('<td contenteditable="true">&nbsp;</td>').join('')}
        </tr>
        ${emptyRows(7, 4)}
        ${_actaAddRowBtnRow(4, `s1LabelComport`)}
        <tr>
          <td rowspan="4" id="s1LabelAsist" style="font-weight:bold;vertical-align:top;background:#dce8f5;">Asistencia / Retrasos</td>
          ${Array(4).fill('<td contenteditable="true">&nbsp;</td>').join('')}
        </tr>
        ${emptyRows(3, 4)}
        ${_actaAddRowBtnRow(4, `s1LabelAsist`)}
        <tr>
          <td rowspan="${1 + Math.max(8, neseAlumnos.length)}" id="s1LabelNese" style="font-weight:bold;vertical-align:top;background:#dce8f5;">Atención a la diversidad e inclusión educativa — NESE<br/><small style="font-weight:normal">(dificultades de aprendizaje, incorporación tardía, altas capacidades, NEE…)</small></td>
          ${Array(4).fill('<td contenteditable="true">&nbsp;</td>').join('')}
        </tr>
        ${nesePreRows}
        ${_actaAddRowBtnRow(4, `s1LabelNese`)}
      </table>
    </div>`;

  // ─── SECCIÓN 2: Alumnado repetidor ───
  html += `
    <div class="inf-section">
      <div class="inf-section-title">2. Alumnado repetidor</div>
      <table class="inf-table">
        <tr><th style="width:40%">Alumno/a</th><th>Valoración de la repetición</th></tr>
        ${repRows}
      </table>
    </div>`;

  // ─── SECCIÓN 3 (II y Final): Propuesta alumnado FPB y diversidad ───
  if (evalNum >= 2) {
    const isFinal = evalNum === 3;
    const fpbAlumnos = alumnos.filter(a => {
      const p = getPropObj(a[propField]);
      return p.tipo === 'Promoción' && p.destino === 'FPB';
    });
    const fpbRows = (fpbAlumnos.length > 0
      ? fpbAlumnos.map(a=>`<tr><td>${a.nombre}</td><td contenteditable="true">&nbsp;</td><td contenteditable="true">&nbsp;</td></tr>`).join('')
        + emptyRows(Math.max(0,3-fpbAlumnos.length),3)
      : emptyRows(3,3)) + _actaAddRowBtnRow(3);

    html += `
      <div class="inf-section">
        <div class="inf-section-title">3. ${isFinal?'Propuesta':'Primera propuesta'} de alumnado para programas de atención a la diversidad grupal — Nivel III</div>
        <table class="inf-table">
          <tr>
            <th style="width:33%">PAC / Refuerzo</th>
            <th style="width:33%">Diversificación 3º</th>
            <th style="width:34%">Diversificación 4º</th>
          </tr>
          ${emptyRows(5, 3)}
          ${_actaAddRowBtnRow(3)}
        </table>
        <div style="margin-top:10px;">
          <div class="inf-section-title" style="border-radius:4px;font-size:10.5pt;">Propuesta de alumnado para FPB</div>
          <table class="inf-table">
            <tr><th style="width:40%">Alumno/a</th><th style="width:30%">Motivo</th><th style="width:30%">Familia FPB</th></tr>
            ${fpbRows}
          </table>
        </div>
      </div>`;
  }

  // ─── SECCIÓN 4: Análisis general del grupo ───
  html += `
    <div class="inf-section">
      <div class="inf-section-title">${evalNum>=2?'4':'3'}. Análisis general del grupo</div>
      <table class="inf-table">
        <tr><th style="width:35%">Característica</th><th>Valoración</th></tr>
        <tr><td style="font-weight:bold">Comportamiento general</td><td contenteditable="true">&nbsp;</td></tr>
        <tr><td style="font-weight:bold">Faltas de asistencia / Retrasos</td><td contenteditable="true">&nbsp;</td></tr>
        <tr><td style="font-weight:bold">Participación en clase</td><td contenteditable="true">&nbsp;</td></tr>
        <tr><td style="font-weight:bold">Hábito de trabajo${evalNum>=2?' / Realización de tareas':''}</td><td contenteditable="true">&nbsp;</td></tr>
        ${evalNum===1?'<tr><td style="font-weight:bold">Cohesión de grupo</td><td contenteditable="true">&nbsp;</td></tr>':''}
        <tr><td style="font-weight:bold">Otros</td><td contenteditable="true">&nbsp;</td></tr>
      </table>
    </div>`;

  // ─── SECCIÓN 5: Análisis de resultados académicos ───
  const secNum = evalNum >= 2 ? 5 : 4;
  html += `
    <div class="inf-section">
      <div class="inf-section-title">${secNum}. Análisis de resultados académicos del grupo</div>
      <table class="inf-table">
        <tr><th style="width:55%">Información relevante</th><th>Datos</th></tr>
        <tr><td>Alumnado con todo aprobado</td><td contenteditable="true" style="font-weight:bold;text-align:center;">${todos0}</td></tr>
        <tr><td>Alumnado entre 1 y 2 materias no superadas</td><td contenteditable="true" style="font-weight:bold;text-align:center;">${entre1_2}</td></tr>
        <tr><td>Alumnado entre 3 y 5 materias no superadas</td><td contenteditable="true" style="font-weight:bold;text-align:center;">${entre3_5}</td></tr>
        <tr><td>Alumnado con más de 5 materias no superadas</td><td contenteditable="true" style="font-weight:bold;text-align:center;">${mas5}</td></tr>
        <tr><td>Materias con más del 50% de suspensos <small>(detectar dificultades del alumnado)</small></td><td contenteditable="true">&nbsp;</td></tr>
      </table>
    </div>`;

  // ─── SECCIÓN EXTRA EVALUACIÓN FINAL: Alumnos que repiten / que promocionan con suspensos ───
  if (evalNum === 3) {
    html += `
      <div class="inf-section">
        <div class="inf-section-title">6. Permanencia 1 año más: deben elaborar Plan de Repetición</div>
        <table class="inf-table">
          <tr><th style="width:35%">Nombre y Apellidos</th><th style="width:35%">Materias no superadas</th><th style="width:30%">Motivos de la no promoción</th></tr>
          ${repPropRows}
        </table>
      </div>
      <div class="inf-section">
        <div class="inf-section-title">7. Alumnado que promociona con materias pendientes: deben elaborar Plan de Refuerzo</div>
        <table class="inf-table">
          <tr><th style="width:45%">Nombre y Apellidos</th><th>Materias no superadas</th></tr>
          ${promoSuspRows}
        </table>
      </div>
      <div class="inf-section">
        <div class="inf-section-title">8. Propuesta de agrupación para el próximo curso</div>
        <table class="inf-table">
          <tr><th style="width:35%">Nombre y Apellidos</th><th style="width:35%">Materias no superadas</th><th style="width:30%">Observaciones</th></tr>
          ${emptyRows(8, 3)}
          ${_actaAddRowBtnRow(3)}
        </table>
      </div>`;
  }

  // ─── PROPUESTAS Y ACUERDOS ───
  const propSecNum = evalNum === 3 ? 9 : evalNum === 2 ? 6 : 5;
  html += `
    <div class="inf-section">
      <div class="inf-section-title">${propSecNum}. Propuestas de mejora y acuerdos adoptados por el equipo docente</div>
      <div class="inf-proposals" contenteditable="true">&nbsp;</div>
    </div>`;

  // ─── FIRMAS ───
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

  // ─── RELACIÓN DE PROFESORADO ASISTENTE (nueva página, siempre junta) ───
  const profSecNum = propSecNum + 1;
  html += `
    </div><!-- /inf-page1 -->
    <div class="inf-pagebreak"></div>
    <div class="inf-profesorado-page">
      <div class="inf-section">
        <div class="inf-section-title">${profSecNum}. Relación de profesorado asistente a la sesión de evaluación</div>
        <table class="inf-table">
          <tr><th style="width:55%">Nombre del profesor/a</th><th>Materia que imparte</th></tr>
          ${emptyRows(20, 2)}
          ${_actaAddRowBtnRow(2)}
        </table>
      </div>
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
          <div class="inf-sign-label">Fecha</div>
          <div class="inf-sign-line"></div>
        </div>
      </div>
    </div>`;

  html += '</div>'; // end inf-body

  contentEl.innerHTML = html;
  _actaEnableRowDelete(contentEl);
  overlay.style.display = 'flex';
  _actaOcultarAviso();
}

function closeInforme() {
  document.getElementById('informeOverlay').style.display = 'none';
  window._actaActual = null;
}

// Limpia una copia del contenido del acta antes de enviarla a imprimir/PDF o
// exportar a Word: quita los controles de pantalla ("+ Añadir fila" y "✕
// eliminar fila") que no deben aparecer en el documento final.
function _actaCleanClone(srcEl) {
  const clone = srcEl.cloneNode(true);
  clone.querySelectorAll('.acta-addrow-row, .acta-delrow-btn').forEach(el => el.remove());
  return clone;
}

// CSS compartido por la vista de impresión/PDF y por la exportación a Word
// del acta, para no duplicar las mismas reglas en dos sitios.
function _actaReportCss() {
  return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* Force color printing in all browsers */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10pt;
      color: #111;
      background: #fff;
    }

    @page {
      size: A4 portrait;
      margin: 1.2cm 1.4cm 1.8cm 1.4cm;
      /* Remove browser header/footer (URL, date, time) */
      margin-top: 1.2cm;
    }

    @page {
      /* Suppress browser-generated header and footer text */
      @top-left   { content: ''; }
      @top-center { content: ''; }
      @top-right  { content: ''; }
      @bottom-left   { content: ''; }
      @bottom-center { content: counter(page); font-family: Arial, sans-serif; font-size: 9pt; color: #666; }
      @bottom-right  { content: ''; }
    }

    input, select {
      border: none !important;
      border-bottom: 1px solid #999 !important;
      background: transparent !important;
      font-family: Arial, sans-serif;
      font-size: 10pt;
      color: #111;
      outline: none;
      padding: 1px 3px;
    }
    [contenteditable] { outline: none !important; }

    /* ══════════════════════════════════════════
       HEADER
    ══════════════════════════════════════════ */
    .inf-header-box {
      background: #1a3a6b !important;
      border-radius: 8px;
      padding: 14px 20px;
      margin-bottom: 14px;
    }
    .inf-header-title {
      font-size: 13pt;
      font-weight: bold;
      color: #ffffff !important;
      text-align: center;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .inf-header-row {
      display: flex;
      gap: 0;
      flex-wrap: wrap;
      background: #ffffff !important;
      border-radius: 5px;
      padding: 8px 12px;
      row-gap: 6px;
      column-gap: 20px;
      align-items: center;
    }
    .inf-header-field {
      display: flex;
      gap: 5px;
      align-items: center;
      font-size: 9.5pt;
    }
    .inf-header-field label {
      font-weight: bold;
      color: #1a3a6b !important;
      white-space: nowrap;
    }
    .inf-header-field input,
    .inf-header-field select {
      border: none !important;
      border-bottom: 1.5px solid #1a3a6b !important;
      background: transparent !important;
      font-size: 9.5pt;
      font-weight: 600;
      color: #111 !important;
      min-width: 100px;
    }

    /* ══════════════════════════════════════════
       STATS CARDS
    ══════════════════════════════════════════ */
    .inf-stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .inf-stat-card {
      border: 1.5px solid #c5d8ef !important;
      border-top: 4px solid #1a3a6b !important;
      border-radius: 6px;
      padding: 8px 10px 7px;
      background: #f4f8ff !important;
      text-align: center;
    }
    .inf-stat-card.green  { border-top-color: #059669 !important; }
    .inf-stat-card.red    { border-top-color: #dc2626 !important; }
    .inf-stat-card.yellow { border-top-color: #b45309 !important; }
    .inf-stat-label {
      font-size: 7pt;
      color: #374d6b !important;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 4px;
      line-height: 1.2;
    }
    .inf-stat-value {
      font-size: 20pt;
      font-weight: bold;
      color: #1a3a6b !important;
      line-height: 1;
    }
    .inf-stat-value.green  { color: #059669 !important; }
    .inf-stat-value.red    { color: #dc2626 !important; }
    .inf-stat-value.yellow { color: #b45309 !important; }
    .inf-stat-value.blue   { color: #1a3a6b !important; }

    /* ══════════════════════════════════════════
       SECTIONS
    ══════════════════════════════════════════ */
    .inf-section {
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .inf-section-title {
      background: #1a3a6b !important;
      color: #ffffff !important;
      font-weight: bold;
      padding: 5px 11px;
      font-size: 9.5pt;
      border-radius: 4px 4px 0 0;
      letter-spacing: 0.1px;
    }

    /* ══════════════════════════════════════════
       TABLES
    ══════════════════════════════════════════ */
    table.inf-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
      table-layout: fixed;
    }
    table.inf-table th {
      background: #dce8f5 !important;
      font-weight: bold;
      padding: 5px 8px;
      border: 1px solid #9ab5d4;
      text-align: left;
      color: #1a3a6b !important;
      font-size: 9pt;
    }
    table.inf-table td {
      padding: 4px 8px;
      border: 1px solid #c0d0e0;
      vertical-align: top;
      color: #111 !important;
    }
    table.inf-table tr:nth-child(even) td {
      background: #f6f9ff !important;
    }
    .inf-empty-row td { height: 22px; }

    /* ══════════════════════════════════════════
       PROPOSALS TEXT AREA
    ══════════════════════════════════════════ */
    .inf-proposals {
      padding: 8px 12px;
      background: #f6f9ff !important;
      border: 1px solid #9ab5d4;
      border-top: none;
      border-radius: 0 0 4px 4px;
      min-height: 48px;
      font-size: 9.5pt;
      color: #111 !important;
    }

    /* ══════════════════════════════════════════
       SIGNATURES
    ══════════════════════════════════════════ */
    .inf-sign {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 20px;
      padding-top: 14px;
      border-top: 1.5px solid #c5d8ef;
      page-break-inside: avoid;
    }
    .inf-sign-block { display: flex; flex-direction: column; gap: 3px; min-width: 160px; }
    .inf-sign-label { font-size: 8.5pt; color: #555 !important; font-weight: bold; margin-bottom: 2px; }
    .inf-sign-name  { font-size: 9pt; color: #111 !important; margin-top: 3px; }
    .inf-sign-line  { border-bottom: 1px solid #444; height: 20px; margin-top: 2px; }

    /* ══════════════════════════════════════════
       PAGE BREAKS
    ══════════════════════════════════════════ */
    .inf-pagebreak { page-break-before: always; break-before: page; }
    /* La relación de profesorado (con sus firmas) siempre debe quedar junta
       en una sola página al imprimir/exportar, con las firmas ancladas al
       final de esa página. Lo mismo para la primera página del acta (todo lo
       anterior al profesorado), cuyo primer bloque de firmas también debe
       caer al final de la página en la que aparezca. */
    .inf-profesorado-page, .inf-page1 {
      display: flex; flex-direction: column; min-height: 26.7cm;
    }
    .inf-profesorado-page { page-break-inside: avoid; break-inside: avoid-page; }
    .inf-body { width: 100%; }
  `;
}

function printInforme() {
  const _clone = _actaCleanClone(document.getElementById('informeContent'));
  const content = _clone.innerHTML;
  const css = _actaReportCss();

  const win = _ventanaDoc();
  win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Acta de Evaluación</title>
  <style>${css}</style>
  <style>
    /* Screen-only instruction bar */
    @media screen {
      body { padding-top: 56px; }
      #print-notice {
        position: fixed; top: 0; left: 0; right: 0; z-index: 999;
        background: #1a3a6b; color: white;
        padding: 10px 20px;
        display: flex; align-items: center; justify-content: space-between;
        font-family: Arial, sans-serif; font-size: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      }
      #print-notice strong { font-size: 13px; }
      #print-notice .hint {
        background: rgba(255,255,255,0.15); border-radius: 4px;
        padding: 4px 10px; font-size: 11px;
      }
      #print-btn {
        background: white; color: #1a3a6b; border: none;
        padding: 7px 16px; border-radius: 5px; font-weight: bold;
        font-size: 12px; cursor: pointer;
      }
      #print-btn:hover { background: #e8f0ff; }
    }
    @media print {
      #print-notice { display: none !important; }
    }
  </style>
</head>
<body>
  <div id="print-notice">
    <div>
      <strong>🖨️ Listo para imprimir</strong>
      <span class="hint" style="margin-left:12px">En el diálogo de impresión → desactiva <em>Encabezados y pies de página</em> para eliminar la URL y la fecha</span>
    </div>
    <button id="print-btn" onclick="window.print()">Imprimir / Guardar PDF</button>
  </div>
  ${content}
</body>
</html>`);
  win.document.close();
  win.focus();
  // Don't auto-trigger print so user can read the notice first
}

// ── Exportar acta a Word ────────────────────────────────────────────────
// Genera un documento .doc (HTML con las cabeceras que Word reconoce) a
// partir del contenido actual del acta, para poder seguir editándolo o
// archivarlo en Word además de imprimirlo/guardarlo en PDF. No requiere
// ninguna librería externa: Word (y LibreOffice) abren con normalidad un
// archivo .doc cuyo contenido es en realidad HTML con estas cabeceras.
// ── Adaptar el HTML para Word ────────────────────────────────────────────
// Word no entiende flexbox ni CSS grid (que es como se colocan en fila la
// cabecera, las tarjetas de estadísticas y las firmas), así que esas zonas
// se convierten a tablas equivalentes antes de exportar: así el resultado en
// Word se parece lo máximo posible al de imprimir/PDF en vez de aparecer
// todo apilado en una sola columna.
function _wordifyRowToTable(container, itemSelector) {
  const items = Array.from(container.children).filter(el => el.matches(itemSelector));
  if (!items.length) return;
  const table = document.createElement('table');
  table.setAttribute('cellspacing', '0');
  table.setAttribute('cellpadding', '0');
  table.style.cssText = 'width:100%; border-collapse:collapse; table-layout:fixed;';
  const tr = document.createElement('tr');
  items.forEach(item => {
    const td = document.createElement('td');
    td.className = item.className;
    td.style.cssText = 'vertical-align:middle; border:none; padding:2px 14px 2px 0;';
    td.innerHTML = item.innerHTML;
    tr.appendChild(td);
  });
  table.appendChild(tr);
  container.replaceWith(table);
}

// Igual que _wordifyRowToTable, pero repartiendo las tarjetas en filas de
// `perRow` columnas (para el grid de estadísticas, que en pantalla/PDF va en
// una cuadrícula de 4).
function _wordifyStatsGrid(container, perRow) {
  const cards = Array.from(container.children).filter(el => el.classList.contains('inf-stat-card'));
  if (!cards.length) return;
  const table = document.createElement('table');
  table.setAttribute('cellspacing', '4');
  table.setAttribute('cellpadding', '0');
  table.style.cssText = 'width:100%; border-collapse:separate; border-spacing:4px; table-layout:fixed;';
  for (let i = 0; i < cards.length; i += perRow) {
    const tr = document.createElement('tr');
    const rowCards = cards.slice(i, i + perRow);
    rowCards.forEach(card => {
      const td = document.createElement('td');
      td.className = card.className;
      td.style.cssText = `width:${Math.floor(100 / perRow)}%; vertical-align:top;`;
      td.innerHTML = card.innerHTML;
      tr.appendChild(td);
    });
    for (let k = rowCards.length; k < perRow; k++) {
      const td = document.createElement('td');
      td.innerHTML = '&nbsp;';
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  container.replaceWith(table);
}

function exportInformeWord() {
  const srcEl = document.getElementById('informeContent');
  if (!srcEl) { showToast('⚠ No hay ningún acta abierta'); return; }

  const _clone = _actaCleanClone(srcEl);

  // Word no interpreta inputs/selects como controles útiles en un documento;
  // se sustituyen por su valor/texto seleccionado en texto plano.
  _clone.querySelectorAll('input').forEach(inp => {
    const span = document.createElement('span');
    span.textContent = inp.value || '';
    inp.replaceWith(span);
  });
  _clone.querySelectorAll('select').forEach(sel => {
    const span = document.createElement('span');
    const opt = sel.options[sel.selectedIndex];
    span.textContent = opt ? opt.text : '';
    sel.replaceWith(span);
  });

  // Zonas maquetadas con flexbox/grid (invisibles para Word): se pasan a
  // tablas para que Word las muestre en fila, igual que en el PDF.
  _clone.querySelectorAll('.inf-stats-grid').forEach(grid => _wordifyStatsGrid(grid, 4));
  _clone.querySelectorAll('.inf-header-row').forEach(row => _wordifyRowToTable(row, '.inf-header-field'));
  _clone.querySelectorAll('.inf-sign').forEach(sign => _wordifyRowToTable(sign, '.inf-sign-block'));

  const content = _clone.innerHTML;
  const css = _actaReportCss();
  const tituloEl = document.getElementById('informeToolbarTitle');
  const titulo = (tituloEl && tituloEl.textContent) ? tituloEl.textContent.trim() : 'Acta de Evaluación';
  const tituloEsc = titulo.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${tituloEsc}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page Section1 { size: 21cm 29.7cm; margin: 1.2cm 1.4cm 1.8cm 1.4cm; mso-header-margin: .5cm; mso-footer-margin: .5cm; mso-paper-source: 0; }
  div.Section1 { page: Section1; }
  table { border-collapse: collapse; }
  ${css}
</style>
</head>
<body>
  <div class="Section1">${content}</div>
</body>
</html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const filename = `${titulo.replace(/[^a-zA-Z0-9ÁÉÍÓÚÑÜáéíóúñü]+/g,'_').replace(/^_+|_+$/g,'')}.doc`;
  triggerDownload(blob, filename);
  showToast('📄 Word generado — ábrelo con Microsoft Word o LibreOffice');
}

// ── Exportar acta a HTML ────────────────────────────────────────────────
// A diferencia del PDF (que puede variar según el navegador/impresora) y del
// Word (que necesita convertir flexbox/grid a tablas), el HTML exportado
// conserva exactamente la misma maquetación que se ve en pantalla, porque es
// el mismo contenido con su misma hoja de estilos. Además, al conservar los
// campos contenteditable/inputs, el archivo resultante se puede seguir
// editando si se vuelve a abrir en un navegador.
function exportInformeHTML() {
  const srcEl = document.getElementById('informeContent');
  if (!srcEl) { showToast('⚠ No hay ningún acta abierta'); return; }

  const _clone = _actaCleanClone(srcEl);
  const content = _clone.innerHTML;
  const css = _actaReportCss();
  const tituloEl = document.getElementById('informeToolbarTitle');
  const titulo = (tituloEl && tituloEl.textContent) ? tituloEl.textContent.trim() : 'Acta de Evaluación';
  const tituloEsc = titulo.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${tituloEsc}</title>
<style>${css}</style>
</head>
<body>
${content}
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const filename = `${titulo.replace(/[^a-zA-Z0-9ÁÉÍÓÚÑÜáéíóúñü]+/g,'_').replace(/^_+|_+$/g,'')}.html`;
  triggerDownload(blob, filename);
  showToast('🌐 HTML exportado — conserva la maquetación exacta y se puede seguir editando');
}

// informeOverlay listener moved to DOMContentLoaded
