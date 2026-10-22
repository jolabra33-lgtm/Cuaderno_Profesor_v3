/* ============================================================================
   Gestor de Tutoría · Alta de alumnado, exportación e importación CSV
   tutoria/js/05-alumnado-importar-exportar.js
   ============================================================================ */

// ===================== MODAL =====================
function openAddAlumno() {
  const SPECIAL = ['__home__', '__materias__', '__calendario__', '__convivencia__', '__informe__', '__vacantes__'];
  const nivel = SPECIAL.includes(currentNivel) ? NIVELES[0] : currentNivel;
  const grupo = currentGrupos[nivel] || (GRUPOS_POR_NIVEL[nivel]||[])[0] || '';
  currentModalTarget = { nivel, grupo };
  document.getElementById('mNombre').value = '';
  document.getElementById('mFecha').value = '';
  document.getElementById('mRepetidor').value = '';
  document.getElementById('mNESE').value = '';
  document.getElementById('mCompensatoria').value = '';
  const ml = document.getElementById('mLengua'); if (ml) ml.value = '';
  const mc = document.getElementById('mCeip'); if (mc) mc.value = '';
  const mo = document.getElementById('mCeipOtros'); if (mo) { mo.value = ''; mo.style.display = 'none'; }
  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(() => document.getElementById('mNombre').focus(), 80);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

// Alumno/a nuevo con todos los campos de la tabla en blanco. Lo usan el alta
// manual (addAlumno) y la importación desde el Cuaderno del profesor.
// El id es la hora en milisegundos, sin repetirse aunque se den de alta varios a la vez.
let _ultimoIdAlumno = 0;
function _alumnoNuevo(campos) {
  _ultimoIdAlumno = Math.max(Date.now(), _ultimoIdAlumno + 1);
  return Object.assign({
    id: _ultimoIdAlumno,
    nombre: '', fecha: '', repetidor: '', nese: '', compensatoria: '',
    idsCuaderno: [],   // identificadores del alumno/a en los Cuadernos del profesorado (uno por Cuaderno)
    recursoNese: [], codComp: [],
    papActivo: false, ecActivo: false,
    eval1: 0, propuesta1: {tipo:'', destino:''}, eval2: 0, propuesta2: {tipo:'', destino:''},
    eval3: 0, propuesta3: {tipo:'', destino:''},
    evalExtr: 0,
    promociona: {tipo:'', destino:''},
    notas: '',
    lenguaBase: '',
    colegioProcedencia: '',
    pendientesIII: [],
    pendientesExtr: [],
    pendientesAnteriores: [],
    recuperadasAnteriores: [],
    noRecuperadasAnteriores: [],
    historial: [],
    seguimientos: [],
    faltasJust1: 0, faltasInjust1: 0, ac1: 0, partes1: 0, expedientes1: 0,
    faltasJust2: 0, faltasInjust2: 0, ac2: 0, partes2: 0, expedientes2: 0,
    faltasJust3: 0, faltasInjust3: 0, ac3: 0, partes3: 0, expedientes3: 0,
    pendientes1: [],
    pendientes2: [],
  }, campos);
}

function addAlumno() {
  const nombre = document.getElementById('mNombre').value.trim();
  if (!nombre) { mostrarAviso('El nombre es obligatorio'); return; }
  const { nivel, grupo } = currentModalTarget;
  const ceipSel = document.getElementById('mCeip')?.value || '';
  const ceipOtros = document.getElementById('mCeipOtros')?.value.trim() || '';
  const ceip = ceipSel === '__otros__' ? ceipOtros : ceipSel;
  data[nivel][grupo].push(_alumnoNuevo({
    nombre,
    fecha: document.getElementById('mFecha').value,
    repetidor: document.getElementById('mRepetidor').value,
    nese: document.getElementById('mNESE').value,
    compensatoria: document.getElementById('mCompensatoria').value,
    lenguaBase: document.getElementById('mLengua')?.value || '',
    colegioProcedencia: ceip,
  }));
  closeModal();
  updateStats(nivel, grupo);
  updateStats2(nivel, grupo);
  updateCharts(nivel, grupo);
  renderNivelTabs();
  // Si se ha añadido al grupo que está a la vista, basta con refrescar su tabla
  // (más rápido y conserva scroll/estado); si es otro grupo, se redibuja todo.
  if (nivel === currentNivel && grupo === currentGrupos[currentNivel]) {
    _searchQuery = '';
    const sb = document.getElementById('searchBox');
    if (sb) sb.value = '';
    updateTable(nivel, grupo);
  } else {
    renderMain();
  }
  showToast(`✅ Alumno/a ${nombre} añadido/a`);
}

document.addEventListener('DOMContentLoaded', function() {
  const mo = document.getElementById('modalOverlay');
  if (mo) mo.addEventListener('click', function(e) { if (e.target === this) closeModal(); });

  const lo = document.getElementById('legendaOverlay');
  if (lo) lo.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('open'); });

  const io = document.getElementById('importOverlay');
  if (io) io.addEventListener('click', function(e) { if (e.target === this) closeImportModal(); });

  const inf = document.getElementById('informeOverlay');
  if (inf) inf.addEventListener('click', function(e) { if (e.target === this) closeInforme(); });

  const ag = document.getElementById('addGrupoOverlay');
  if (ag) ag.addEventListener('click', function(e) { if (e.target === this) closeAddGrupoModal(); });

  const rg = document.getElementById('renameGrupoOverlay');
  if (rg) rg.addEventListener('click', function(e) { if (e.target === this) closeRenameGrupoModal(); });

  const ji = document.getElementById('jsonImportOverlay');
  if (ji) ji.addEventListener('click', function(e) { if (e.target === this) closeJsonImportModal(); });

  const dn = document.getElementById('deleteNivelOverlay');
  if (dn) dn.addEventListener('click', function(e) { if (e.target === this) closeDeleteNivelModal(); });

  // Keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    const tag = document.activeElement?.tagName;
    const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    // Ctrl+Z undo (not in inputs)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      if (inInput) return;
      e.preventDefault();
      _undoPop();
    }

    // Ctrl+F → focus search bar
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      const sb = document.getElementById('alumnoSearch');
      if (sb) { e.preventDefault(); sb.focus(); sb.select(); }
    }

    // Escape → close modals / clear search
    if (e.key === 'Escape') {
      closeModal();
      closeInforme?.();
      closeLightbox?.();
      closeFotoGaleria?.();
      const sb = document.getElementById('alumnoSearch');
      if (sb && document.activeElement === sb) {
        sb.value = ''; _searchQuery = ''; sb.blur();
        document.getElementById('searchClear')?.classList.remove('visible');
        applySearch();
      }
    }
  });

  // Scroll-to-top button
  const fab = document.getElementById('scrollTopBtn');
  if (fab) {
    window.addEventListener('scroll', () => {
      fab.classList.toggle('visible', window.scrollY > 320);
    });
  }
});

// ===================== EXPORT ALL CSV =====================
function exportAllCSV() {
  const headers = ['Curso','Grupo','Tutor/a','Alumno','Fecha Nacimiento','Repetidor','NESE',
    'Recurso NESE','Compensatoria','Cód. Comp.','I Eval','I Propuesta','II Eval','II Propuesta',
    'III Eval','Pend. Próx. Curso (III Eval)','III Propuesta',
    'Eval. Extraordinaria','Pend. Eval. Extraordinaria',
    'Promociona','Lengua Base','CEIP Procedencia','Pend. Cursos Ant.','Recuperadas Cursos Ant.','No Recuperadas Cursos Ant.','Observaciones'];
  const rows = [];
  NIVELES.forEach(n => {
    (GRUPOS_POR_NIVEL[n]||[]).forEach(g => {
      const tutor = tutores[`${n}-${g}`]||'';
      (data[n]?.[g]||[]).forEach(a => {
        rows.push([
          n, g, tutor, a.nombre||'', a.fecha||'', a.repetidor||'', a.nese||'',
          _getNeseCodes(a.recursoNese).join(';'), a.compensatoria||'',
          (Array.isArray(a.codComp)?a.codComp:[]).join(';'),
          a.eval1||0,
          getPropObj(a.propuesta1).tipo ? [getPropObj(a.propuesta1).tipo, getPropObj(a.propuesta1).destino].filter(Boolean).join(' → ') : '',
          a.eval2||0,
          getPropObj(a.propuesta2).tipo ? [getPropObj(a.propuesta2).tipo, getPropObj(a.propuesta2).destino].filter(Boolean).join(' → ') : '',
          a.eval3||0,
          (a.pendientesIII||[]).join('; '),
          getPropObj(a.propuesta3).tipo ? [getPropObj(a.propuesta3).tipo, getPropObj(a.propuesta3).destino].filter(Boolean).join(' → ') : '',
          a.evalExtr||0,
          (a.pendientesExtr||[]).join('; '),
          getPropObj(a.promociona).tipo ? [getPropObj(a.promociona).tipo, getPropObj(a.promociona).destino].filter(Boolean).join(' → ') : '',
          a.lenguaBase||'', a.colegioProcedencia||'',
          (a.pendientesAnteriores||[]).join('; '),
          (a.recuperadasAnteriores||[]).join('; '),
          (a.noRecuperadasAnteriores||[]).join('; '),
          a.notas||''
        ]);
      });
    });
  });
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const year = new Date().getFullYear();
  triggerDownload(blob, `evaluaciones_completo_${year}.csv`);
  showToast(`✅ CSV exportado — ${rows.length} alumnos`);
}

// ===================== EXPORT =====================
function exportData() {
  const nivel = currentNivel;
  const SPECIAL = ['__home__', '__materias__', '__calendario__', '__convivencia__', '__informe__', '__vacantes__'];
  if (SPECIAL.includes(nivel)) { showToast('⚠ Selecciona un nivel para exportar CSV'); return; }
  const grupo = currentGrupos[nivel];
  const alumnos = data[nivel][grupo];
  const tutorNombre = tutores[`${nivel}-${grupo}`] || '';
  const bach = isBach(nivel);
  const headers = ['Curso','Grupo','Tutor/a','Repetidor','Alumno','Fecha Nacimiento','Edad Actual',
    'NESE','Recurso NESE','Compensatoria','Cód. Compensatoria',
    'I Eval Mat No Sup','I Eval Propuesta','II Eval Mat No Sup','II Eval Propuesta','III Eval Mat No Sup',
    'Pend. Próx. Curso (III Eval)',
    ...(bach ? ['III Eval Propuesta','Eval. Extraordinaria','Pend. Eval. Extraordinaria'] : ['III Eval Propuesta']),
    'Promociona','Lengua Base','CEIP Procedencia','Pend. Cursos Ant.','Recuperadas Cursos Ant.','No Recuperadas Cursos Ant.','Observaciones'];
  const rows = alumnos.map(a => [
    nivel, grupo, tutorNombre, a.repetidor||'', a.nombre||'', a.fecha||'',
    calcEdad(a.fecha),
    a.nese||'', _getNeseCodes(a.recursoNese).join(';'), a.compensatoria||'',
    (Array.isArray(a.codComp)?a.codComp:a.codComp?[a.codComp]:[]).join(';'),
    a.eval1||0,
    getPropObj(a.propuesta1).tipo ? [getPropObj(a.propuesta1).tipo, getPropObj(a.propuesta1).destino].filter(Boolean).join(' - ') : '',
    a.eval2||0,
    getPropObj(a.propuesta2).tipo ? [getPropObj(a.propuesta2).tipo, getPropObj(a.propuesta2).destino].filter(Boolean).join(' - ') : '',
    a.eval3||0,
    (a.pendientesIII||[]).join('; '),
    ...(bach
      ? [
          getPropObj(a.propuesta3).tipo ? [getPropObj(a.propuesta3).tipo, getPropObj(a.propuesta3).destino].filter(Boolean).join(' - ') : '',
          a.evalExtr||0,
          (a.pendientesExtr||[]).join('; ')
        ]
      : [
          getPropObj(a.propuesta3).tipo ? [getPropObj(a.propuesta3).tipo, getPropObj(a.propuesta3).destino].filter(Boolean).join(' - ') : ''
        ]),
    getPropObj(a.promociona).tipo ? [getPropObj(a.promociona).tipo, getPropObj(a.promociona).destino].filter(Boolean).join(' - ') : '',
    a.lenguaBase||'', a.colegioProcedencia||'',
    (a.pendientesAnteriores||[]).join('; '),
    (a.recuperadasAnteriores||[]).join('; '),
    (a.noRecuperadasAnteriores||[]).join('; '),
    a.notas||''
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `evaluacion_${nivel.replace(/\s+/g,'_')}_${grupo.replace(/\s+/g,'_')}.csv`);
}

// ===================== IMPORT CSV =====================
// ===================== EQUIVALENCIAS GRUPO CSV → APP =====================
// Mapea el código del CSV al [nivel, grupo] de la aplicación.
// Editable: el usuario puede añadir más desde la UI (futuro) o aquí directamente.
const GRUPO_EQUIVALENCIAS = {
  '1ESOA':      ['1º ESO', 'A'],
  '1ESOB':      ['1º ESO', 'B'],
  '1ESOC':      ['1º ESO', 'C'],
  '1ESOD':      ['1º ESO', 'D'],
  '1ESOE':      ['1º ESO', 'E'],
  '2ESOA':      ['2º ESO', 'A'],
  '2ESOB':      ['2º ESO', 'B'],
  '2ESOC':      ['2º ESO', 'C'],
  '2ESOD':      ['2º ESO', 'D'],
  '2ESOE':      ['2º ESO', 'E'],
  '2ESO_PAC':   ['2º ESO', 'PAC'],
  '3ESOA':      ['3º ESO', 'A'],
  '3ESOB':      ['3º ESO', 'B'],
  '3ESOC':      ['3º ESO', 'C'],
  '3ESOD':      ['3º ESO', 'D'],
  '3ESO_PDC':   ['3º ESO', 'PDC'],
  '4ESOA':      ['4º ESO', 'A'],
  '4ESOB':      ['4º ESO', 'B'],
  '4ESOC':      ['4º ESO', 'C'],
  '4ESO_PDC':   ['4º ESO', 'PDC'],
  '1BAC_CIENT': ['1º Bach.', 'Científico'],
  '1BAH_HS':    ['1º Bach.', 'Humanístico-Social'],
  '2BAC_CIEN':  ['2º Bach.', 'Científico'],
  '2BAH_HS_A':  ['2º Bach.', 'Humanístico-Social A'],
  '2BAH_HS_B':  ['2º Bach.', 'Humanístico-Social B'],
};

// Resolve a CSV grupo code → {nivel, grupo} in the app, or null if unknown
function resolveGrupoEquiv(csvCode) {
  const eq = GRUPO_EQUIVALENCIAS[csvCode];
  if (!eq) return null;
  const [nivel, grupo] = eq;
  // Only return if the nivel+grupo actually exist in the app
  if (GRUPOS_POR_NIVEL[nivel] && GRUPOS_POR_NIVEL[nivel].includes(grupo)) {
    return { nivel, grupo };
  }
  // Nivel/grupo exist in equivalence table but not yet created in app → still return for info
  return { nivel, grupo, missing: true };
}

const FIELD_DEFS = [
  { key: 'nombre',        label: 'Alumno / Nombre completo',   required: true  },
  { key: 'apellido1',     label: 'Apellido 1',                 required: false },
  { key: 'apellido2',     label: 'Apellido 2',                 required: false },
  { key: 'fecha',         label: 'Fecha de Nacimiento',        required: false },
  { key: 'repetidor',     label: 'Repetidor',                  required: false },
  { key: 'nese',          label: 'NESE',                       required: false },
  { key: 'compensatoria', label: 'Compensatoria',              required: false },
  { key: 'eval1',         label: 'I Eval. Mat. No Superadas',  required: false },
  { key: 'propuesta1',    label: 'I Eval. Propuesta',          required: false },
  { key: 'eval2',         label: 'II Eval. Mat. No Superadas', required: false },
  { key: 'propuesta2',    label: 'II Eval. Propuesta',         required: false },
  { key: 'eval3',         label: 'III Eval. Mat. No Sup.',     required: false },
  { key: 'propuesta3',    label: 'III Eval. Propuesta',        required: false },
  { key: 'promociona',    label: 'Promociona',                 required: false },
];

// Synonyms for auto-detection
const FIELD_SYNONYMS = {
  nombre:        ['nombre completo','nombre y apellidos','alumno','alumna','name','nombre'],
  apellido1:     ['apellido1','apellido 1','primer apellido','first surname','apellidos'],
  apellido2:     ['apellido2','apellido 2','segundo apellido','second surname'],
  fecha:         ['fecha','nacimiento','fecha nacimiento','birth','f.nac','fnac','fecha de nacimiento','fecha_nac'],
  repetidor:     ['repetidor','repite','repeat','repetidora'],
  nese:          ['nese','necesidades','necesidades educativas','nee'],
  compensatoria: ['compensatoria','compen','comp'],
  eval1:         ['i eval','eval1','evaluacion 1','1 eval','1ª eval','primera eval','i evaluacion','mat no sup 1','materias 1'],
  propuesta1:    ['propuesta 1','propuesta i','prop1','propuesta primera','i propuesta'],
  eval2:         ['ii eval','eval2','evaluacion 2','2 eval','2ª eval','segunda eval','ii evaluacion','mat no sup 2','materias 2'],
  propuesta2:    ['propuesta 2','propuesta ii','prop2','propuesta segunda','ii propuesta'],
  eval3:         ['iii eval','eval3','evaluacion 3','3 eval','3ª eval','tercera eval','iii evaluacion','mat no sup 3','materias 3'],
  propuesta3:    ['propuesta 3','propuesta iii','prop3','propuesta tercera','iii propuesta','propuesta final','propuesta'],
  promociona:    ['promociona','promo','promocion','promoción'],
};

let importState = {
  step: 1,
  rawText: '',
  delimiter: ',',
  headers: [],
  rows: [],
  mapping: {},        // fieldKey -> csvColumnIndex or -1
  grupoCol: -1,       // index of 'grupo' column in CSV, -1 if not present
  grupoFilter: '',    // selected grupo value to filter, '' = all
  targetNivel: '',
  targetGrupo: '',
  importMode: 'add',  // 'add' | 'replace'
  preview: [],
};

function openImportModal() {
  const SPECIAL = ['__home__', '__materias__', '__calendario__', '__convivencia__', '__informe__', '__vacantes__'];
  const safeNivel = SPECIAL.includes(currentNivel) ? NIVELES[0] : currentNivel;
  const safeGrupo = currentGrupos[safeNivel] || (GRUPOS_POR_NIVEL[safeNivel]||[])[0] || '';
  importState = {
    step: 1, rawText: '', delimiter: ',', headers: [], rows: [],
    mapping: {}, grupoCol: -1, grupoFilter: '', targetNivel: safeNivel, targetGrupo: safeGrupo,
    importMode: 'add', preview: [],
  };
  document.getElementById('importOverlay').classList.add('open');
  renderImportStep();
}

function closeImportModal() {
  document.getElementById('importOverlay').classList.remove('open');
}

// importOverlay listener moved to DOMContentLoaded

function setImportStep(n) {
  importState.step = n;
  ['istep1','istep2','istep3','istep4'].forEach((id, i) => {
    const el = document.getElementById(id);
    el.className = 'import-step' + (i+1 < n ? ' done' : i+1 === n ? ' active' : '');
  });
  renderImportStep();
}

function renderImportStep() {
  const body = document.getElementById('importBody');
  const actions = document.getElementById('importActions');

  if (importState.step === 1) {
    body.innerHTML = `
      <div class="modal-title" style="margin-bottom:16px">📥 Importar desde CSV</div>

      <div class="drop-zone" id="dropZone" onclick="document.getElementById('csvFileInput').click()">
        <div class="drop-icon">📂</div>
        <div class="drop-title">Arrastra tu archivo CSV aquí</div>
        <div class="drop-sub">o haz clic para seleccionarlo</div>
        <input type="file" id="csvFileInput" accept=".csv,.txt" style="display:none" onchange="handleFileSelect(event)" />
      </div>

      <div style="margin-top:16px;display:flex;gap:12px;align-items:center">
        <label style="font-size:12px;color:var(--text2)">Separador:</label>
        <label style="font-size:12px;display:flex;align-items:center;gap:5px;cursor:pointer">
          <input type="radio" name="delim" value="," ${importState.delimiter===','?'checked':''} onchange="importState.delimiter=this.value;reparseCSV()"> Coma (,)
        </label>
        <label style="font-size:12px;display:flex;align-items:center;gap:5px;cursor:pointer">
          <input type="radio" name="delim" value=";" ${importState.delimiter===';'?'checked':''} onchange="importState.delimiter=this.value;reparseCSV()"> Punto y coma (;)
        </label>
        <label style="font-size:12px;display:flex;align-items:center;gap:5px;cursor:pointer">
          <input type="radio" name="delim" value="\\t" ${importState.delimiter==='\t'?'checked':''} onchange="importState.delimiter='\t';reparseCSV()"> Tabulador
        </label>
      </div>

      <div class="csv-hint" style="margin-top:16px">
        <strong>📋 Columnas reconocidas automáticamente:</strong><br>
        <code>Nombre</code>, <code>Fecha Nacimiento</code>, <code>Repetidor</code>, <code>NESE</code>, <code>Compensatoria</code>,
        <code>I Eval</code>, <code>II Eval</code>, <code>Propuesta</code>, <code>III Eval</code>, <code>Promociona</code>…<br><br>
        No importa el orden ni el nombre exacto — podrás ajustar la correspondencia en el paso 2.
        El archivo puede tener columnas extra; solo se importarán las mapeadas.
      </div>
    `;
    actions.innerHTML = `
      <button class="btn btn-ghost" onclick="closeImportModal()">Cancelar</button>
    `;

    // Drag & drop
    const dz = document.getElementById('dropZone');
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', e => {
      e.preventDefault(); dz.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) readCSVFile(file);
    });

  } else if (importState.step === 2) {
    // Mapping step
    const opts = importState.headers.map((h, i) => `<option value="${i}">${h}</option>`).join('');
    const noOpt = `<option value="-1">— No importar —</option>`;

    let mapRows = FIELD_DEFS.map(f => {
      const sel = importState.mapping[f.key] !== undefined ? importState.mapping[f.key] : -1;
      return `
        <div class="mapping-label" title="${f.label}">${f.label}${f.required ? ' <span style="color:var(--red)">*</span>' : ''}</div>
        <div class="mapping-arrow">→</div>
        <select class="mapping-select" data-field="${f.key}" onchange="importState.mapping[this.dataset.field]=+this.value">
          ${noOpt}
          ${importState.headers.map((h, i) => `<option value="${i}" ${sel==i?'selected':''}>${h}</option>`).join('')}
        </select>
      `;
    }).join('');

    body.innerHTML = `
      <div class="modal-title" style="margin-bottom:4px">🔗 Mapear columnas</div>
      <p style="font-size:12px;color:var(--text2);margin-bottom:16px">
        Asocia cada campo de la aplicación con la columna de tu CSV. Las columnas detectadas automáticamente ya están asignadas.
      </p>
      <div style="display:grid;grid-template-columns:1fr 24px 1fr;gap:6px;margin-bottom:10px;padding:0 0 8px;border-bottom:1px solid var(--border)">
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px">Campo de la App</div>
        <div></div>
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px">Columna en tu CSV</div>
      </div>
      <div class="mapping-grid">${mapRows}</div>

      ${(() => {
        // Apellido merge notice
        const hasAp1 = (importState.mapping['apellido1'] ?? -1) >= 0;
        const hasAp2 = (importState.mapping['apellido2'] ?? -1) >= 0;
        if (hasAp1 || hasAp2) return `
          <div style="background:rgba(79,142,247,0.08);border:1px solid rgba(79,142,247,0.25);border-radius:8px;padding:10px 14px;font-size:12px;color:var(--accent);margin-top:10px">
            ℹ️ Se detectaron columnas de apellidos separados. El nombre se construirá automáticamente como <strong>Apellido1 Apellido2, Nombre</strong>.
            ${(importState.mapping['nombre'] ?? -1) >= 0 ? ' Si también mapeas "Nombre completo", se usarán los apellidos para construir el formato correcto.' : ''}
          </div>`;
        return '';
      })()}

      ${(() => {
        // Grupo filter
        if (importState.grupoCol < 0) return '';
        const valores = [...new Set(importState.rows.map(r => (r[importState.grupoCol]||'').trim()).filter(Boolean))].sort();
        if (valores.length === 0) return '';

        const opts = [`<option value="">— Todos los alumnos (sin filtrar) —</option>`,
          ...valores.map(v => {
            const eq = resolveGrupoEquiv(v);
            const label = eq
              ? `${v}  →  ${eq.nivel} ${eq.grupo}${eq.missing ? ' ⚠ (no creado)' : ''}`
              : v;
            return `<option value="${v}" ${importState.grupoFilter===v?'selected':''}>${label}</option>`;
          })
        ].join('');

        const selEq = importState.grupoFilter ? resolveGrupoEquiv(importState.grupoFilter) : null;
        const destInfo = selEq && !selEq.missing
          ? `<div style="font-size:11px;color:var(--green);margin-top:8px;display:flex;align-items:center;gap:6px;">
               <span style="width:6px;height:6px;border-radius:50%;background:var(--green);display:inline-block"></span>
               Destino automático: <strong>${selEq.nivel} — Grupo ${selEq.grupo}</strong>
             </div>`
          : selEq && selEq.missing
          ? `<div style="font-size:11px;color:var(--yellow);margin-top:8px;">⚠ El grupo <strong>${selEq.nivel} ${selEq.grupo}</strong> no está creado aún en la app. Créalo primero o elige destino manualmente en el paso 3.</div>`
          : importState.grupoFilter
          ? `<div style="font-size:11px;color:var(--text3);margin-top:8px;">Sin equivalencia conocida para <code>${importState.grupoFilter}</code>. Podrás elegir destino manualmente en el paso 3.</div>`
          : '';

        return `
          <div style="background:rgba(45,212,160,0.07);border:1px solid rgba(45,212,160,0.25);border-radius:8px;padding:12px 14px;margin-top:10px">
            <div style="font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">
              📋 Filtrar por grupo del CSV
            </div>
            <div style="font-size:12px;color:var(--text2);margin-bottom:8px">
              Tu CSV tiene <strong>${valores.length} grupos</strong>. Selecciona cuál importar:
            </div>
            <select style="background:var(--surface2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-family:inherit;font-size:13px;font-weight:600;padding:6px 10px;width:100%"
              onchange="importState.grupoFilter=this.value; applyGrupoEquivToTarget(); renderImportStep()">
              ${opts}
            </select>
            ${destInfo}
          </div>`;
      })()}

      <p style="font-size:11px;color:var(--text3);margin-top:12px">
        📄 ${importState.rows.length} filas detectadas · ${importState.headers.length} columnas · separador: <code style="background:var(--surface2);padding:1px 5px;border-radius:4px;color:var(--accent)">${importState.delimiter==='\t'?'tabulador':importState.delimiter===';'?'punto y coma (;)':'coma (,'}</code>
        &nbsp;·&nbsp; <button class="btn btn-ghost btn-sm" style="font-size:10px;padding:2px 8px;" onclick="setImportStep(1)">Cambiar separador</button>
      </p>
    `;
    actions.innerHTML = `
      <button class="btn btn-ghost" onclick="setImportStep(1)">← Atrás</button>
      <button class="btn btn-primary" onclick="goToStep3()">Siguiente →</button>
    `;

  } else if (importState.step === 3) {
    // Target step
    const nivelOpts = NIVELES.map(n => `<option value="${n}" ${n===importState.targetNivel?'selected':''}>${n}</option>`).join('');
    const grupoOpts = GRUPOS_POR_NIVEL[importState.targetNivel].map(g => `<option value="${g}" ${g===importState.targetGrupo?'selected':''}>${g}</option>`).join('');

    body.innerHTML = `
      <div class="modal-title" style="margin-bottom:16px">🎯 Destino de la importación</div>

      <p style="font-size:12px;color:var(--text2);margin-bottom:18px">
        ¿A qué curso y grupo quieres importar los datos?
      </p>

      <div class="target-selector">
        <label>Nivel:</label>
        <select id="impNivel" onchange="importState.targetNivel=this.value; importState.targetGrupo=GRUPOS_POR_NIVEL[this.value][0]; renderImportStep()">
          ${nivelOpts}
        </select>
        <label>Grupo:</label>
        <select id="impGrupo" onchange="importState.targetGrupo=this.value">
          ${grupoOpts}
        </select>
      </div>

      <p style="font-size:12px;color:var(--text2);margin-bottom:12px">¿Cómo quieres importar?</p>
      <div class="import-mode-toggle">
        <div class="mode-opt ${importState.importMode==='add'?'active':''}" onclick="importState.importMode='add';renderImportStep()">
          ➕ Añadir a los existentes
        </div>
        <div class="mode-opt ${importState.importMode==='replace'?'active':''}" onclick="importState.importMode='replace';renderImportStep()">
          🔄 Reemplazar grupo completo
        </div>
      </div>

      ${importState.importMode === 'replace' ? `
        <div style="background:rgba(247,110,110,0.1);border:1px solid rgba(247,110,110,0.3);border-radius:8px;padding:12px 14px;font-size:12px;color:var(--red);margin-top:4px">
          ⚠️ Se eliminarán todos los alumnos actuales de <strong>${importState.targetNivel} ${importState.targetGrupo}</strong> y se reemplazarán por los del CSV.
        </div>` : ''}
    `;
    actions.innerHTML = `
      <button class="btn btn-ghost" onclick="setImportStep(2)">← Atrás</button>
      <button class="btn btn-primary" onclick="goToStep4()">Previsualizar →</button>
    `;

  } else if (importState.step === 4) {
    // Preview step
    buildPreview();
    const ok = importState.preview.filter(r => !r._error).length;
    const err = importState.preview.filter(r => r._error).length;

    const previewRows = importState.preview.slice(0, 50).map(r => {
      if (r._error) {
        return `<tr><td colspan="8" class="err">⚠️ Fila ignorada: ${r._error}</td></tr>`;
      }
      return `<tr>
        <td>${r.nombre || '<em style="color:var(--text3)">—</em>'}</td>
        <td>${r.fecha || '—'}</td>
        <td>${r.repetidor || '—'}</td>
        <td>${r.nese || '—'}</td>
        <td class="${r.eval1>0?'warn':''}">${r.eval1 ?? '0'}</td>
        <td class="${r.eval2>0?'warn':''}">${r.eval2 ?? '0'}</td>
        <td class="${r.eval3>0?'warn':''}">${r.eval3 ?? '0'}</td>
        <td class="${getPropObj(r.promociona).tipo==='Promoción'||getPropObj(r.promociona).tipo==='Titulación'?'ok':getPropObj(r.promociona).tipo==='Repetición'?'err':''}">${getPropObj(r.promociona).tipo||'—'}</td>
      </tr>`;
    }).join('');

    body.innerHTML = `
      <div class="modal-title" style="margin-bottom:12px">👁 Previsualización</div>
      <div class="import-info">
        <span class="import-pill blue">${importState.rows.length} filas en CSV</span>
        <span class="import-pill green">✓ ${ok} válidas</span>
        ${err ? `<span class="import-pill red">✗ ${err} con error</span>` : ''}
        <span class="import-pill yellow">→ ${importState.targetNivel} ${importState.targetGrupo}</span>
        <span class="import-pill ${importState.importMode==='replace'?'red':'blue'}">${importState.importMode==='replace'?'Reemplazar':'Añadir'}</span>
      </div>
      <div class="preview-table-wrap">
        <table class="preview-table">
          <thead><tr>
            <th>Nombre</th><th>F. Nac.</th><th>Repetidor</th><th>NESE</th>
            <th>I Eval</th><th>II Eval</th><th>III Eval</th><th>Promociona</th>
          </tr></thead>
          <tbody>${previewRows}</tbody>
        </table>
      </div>
      ${importState.preview.length > 50 ? `<p style="font-size:11px;color:var(--text3);margin-top:8px">Mostrando primeros 50 de ${ok} registros válidos.</p>` : ''}
    `;
    actions.innerHTML = `
      <button class="btn btn-ghost" onclick="setImportStep(3)">← Atrás</button>
      <button class="btn btn-ghost" onclick="closeImportModal()">Cancelar</button>
      ${ok > 0 ? `<button class="btn btn-green" onclick="executeImport()">✓ Importar ${ok} alumno${ok!==1?'s':''}</button>` : ''}
    `;
  }
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) readCSVFile(file);
}

function readCSVFile(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    importState.rawText = e.target.result;
    // Autodetect delimiter from first line
    importState.delimiter = autoDetectDelimiter(importState.rawText);
    // Sync radio button UI if it's visible
    const radios = document.querySelectorAll('input[name="delim"]');
    radios.forEach(r => {
      const rval = r.value === '\\t' ? '\t' : r.value;
      r.checked = rval === importState.delimiter;
    });
    parseCSV();
    autoDetectMapping();
    applyGrupoEquivToTarget();
    setImportStep(2);
  };
  reader.readAsText(file, 'UTF-8');
}

function autoDetectDelimiter(text) {
  // Count candidate delimiters in the first line (outside quotes)
  const firstLine = text.split(/\r?\n/)[0] || '';
  const candidates = [';', ',', '\t', '|'];
  let best = ','; let bestCount = -1;
  for (const d of candidates) {
    // Count unquoted occurrences
    let count = 0; let inQ = false;
    for (let i = 0; i < firstLine.length; i++) {
      const c = firstLine[i];
      if (c === '"') { inQ = !inQ; continue; }
      if (!inQ && c === d) count++;
    }
    if (count > bestCount) { bestCount = count; best = d; }
  }
  return best;
}

function parseCSV() {
  const lines = importState.rawText.split(/\r?\n/).filter(l => l.trim());
  // Handle both stored '\t' string and actual tab char
  const delim = importState.delimiter === '\\t' ? '\t' : importState.delimiter;

  // RFC 4180-compliant CSV parser: handles quoted fields, escaped "" and newlines within quotes
  function splitLine(line) {
    const result = [];
    let cur = '';
    let inQ = false;
    let i = 0;
    while (i < line.length) {
      const c = line[i];
      if (inQ) {
        if (c === '"') {
          // Peek ahead: "" = escaped quote, otherwise end of quoted field
          if (i + 1 < line.length && line[i + 1] === '"') {
            cur += '"';
            i += 2;
          } else {
            inQ = false;
            i++;
          }
        } else {
          cur += c;
          i++;
        }
      } else {
        if (c === '"') {
          inQ = true;
          i++;
        } else if (c === delim) {
          result.push(cur.trim());
          cur = '';
          i++;
        } else {
          cur += c;
          i++;
        }
      }
    }
    result.push(cur.trim());
    return result;
  }

  if (lines.length === 0) return;
  importState.headers = splitLine(lines[0]);
  importState.rows = lines.slice(1).map(l => splitLine(l));
}

function reparseCSV() {
  // Called when user manually changes delimiter radio
  if (!importState.rawText) return;
  parseCSV();
  autoDetectMapping();
  applyGrupoEquivToTarget();
  renderImportStep();
}

function applyGrupoEquivToTarget() {
  if (!importState.grupoFilter) return;
  const eq = resolveGrupoEquiv(importState.grupoFilter);
  if (eq && !eq.missing) {
    importState.targetNivel = eq.nivel;
    importState.targetGrupo = eq.grupo;
  }
}

function autoDetectMapping() {
  importState.mapping = {};
  const headers = importState.headers.map(h => h.toLowerCase().trim().replace(/[_\-\.]/g,' '));

  Object.entries(FIELD_SYNONYMS).forEach(([fieldKey, synonyms]) => {
    const idx = headers.findIndex(h => synonyms.some(s => h === s || h.includes(s) || s.includes(h)));
    importState.mapping[fieldKey] = idx; // -1 if not found
  });

  // Detect 'grupo' column separately (not a mappable field, used for filtering)
  importState.grupoCol = headers.findIndex(h => ['grupo','group','clase','class'].some(s => h === s || h.includes(s)));
  // Pre-populate grupoFilter with first available grupo value if column found
  if (importState.grupoCol >= 0) {
    const valores = [...new Set(importState.rows.map(r => (r[importState.grupoCol]||'').trim()).filter(Boolean))].sort();
    importState.grupoFilter = valores[0] || '';
  }
}

function goToStep3() {
  // Validate at least nombre is mapped
  if ((importState.mapping['nombre'] ?? -1) < 0) {
    mostrarAviso('⚠️ Debes mapear al menos la columna "Alumno / Nombre" para continuar.');
    return;
  }
  setImportStep(3);
}

function goToStep4() {
  setImportStep(4);
}

function buildPreview() {
  const m = importState.mapping;
  const expectedCols = importState.headers.length;
  const nombreIdx = (m['nombre'] !== undefined && m['nombre'] >= 0) ? m['nombre'] : -1;
  const ap1Idx   = (m['apellido1'] !== undefined && m['apellido1'] >= 0) ? m['apellido1'] : -1;
  const ap2Idx   = (m['apellido2'] !== undefined && m['apellido2'] >= 0) ? m['apellido2'] : -1;

  function normalizeRow(cols) {
    if (cols.length <= expectedCols || nombreIdx < 0) return cols;
    const extra = cols.length - expectedCols;
    return [
      ...cols.slice(0, nombreIdx),
      cols.slice(nombreIdx, nombreIdx + extra + 1).map(s => s.trim()).join(', '),
      ...cols.slice(nombreIdx + extra + 1)
    ];
  }

  const PARTICLES = new Set(['de','del','y','e','i','las','los','la']);
  function toTitleCase(str) {
    const words = str.toLowerCase().split(/\s+/);
    return words.map((word, i) => {
      if (i === 0) return word.charAt(0).toUpperCase() + word.slice(1);
      // Particle after 'de': de la, de los, de las, del
      if (PARTICLES.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  }

  // Build nombre from apellidos if mapped, otherwise use nombre column directly
  function buildNombre(row) {
    const ap1 = ap1Idx >= 0 ? toTitleCase((row[ap1Idx]||'').trim()) : '';
    const ap2  = ap2Idx >= 0 ? toTitleCase((row[ap2Idx]||'').trim()) : '';
    const nom  = nombreIdx >= 0 ? toTitleCase((row[nombreIdx]||'').trim()) : '';
    if (ap1 || ap2) {
      const apellidos = [ap1, ap2].filter(Boolean).join(' ');
      return nom ? `${apellidos}, ${nom}` : apellidos;
    }
    return nom;
  }

  const grupoCol    = importState.grupoCol;
  const grupoFilter = importState.grupoFilter;

  importState.preview = importState.rows
    .filter(r => r.some(c => c.trim()))
    .filter(r => {
      if (grupoCol < 0 || !grupoFilter) return true;
      return (r[grupoCol]||'').trim() === grupoFilter;
    })
    .map(r => {
      const row = normalizeRow(r);
      const get = (key) => {
        const idx = m[key];
        if (idx === undefined || idx < 0 || idx >= row.length) return '';
        return (row[idx] || '').trim();
      };

      const nombre = buildNombre(row);
      if (!nombre) return { _error: 'Nombre vacío', _raw: r.join(' | ') };

      // Normalize fecha
      let fecha = get('fecha');
      if (fecha) {
        const m1 = fecha.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
        if (m1) {
          const y = m1[3].length === 2 ? '20'+m1[3] : m1[3];
          fecha = `${y}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;
        }
      }

      const eval1v = parseInt(get('eval1')) || 0;
      const eval2v = parseInt(get('eval2')) || 0;
      const eval3v = parseInt(get('eval3')) || 0;

      return {
        id: Date.now() + Math.random(),
        nombre,
        fecha,
        repetidor: normalizeYesNo(get('repetidor')),
        nese: normalizeYesNo(get('nese')),
        recursoNese: (()=>{
          const raw = get('recursoNese')||get('recurso nese')||'';
          if (!raw.trim()) return [];
          // Support "AL;PT", "AL", "PT", "AL PT"
          return raw.split(/[,;\s/]+/).map(s=>s.trim().toUpperCase()).filter(s=>s==='AL'||s==='PT');
        })(),
        codComp: (get('codComp')||get('cod comp')||get('código compensatoria')||'').split(/[,;\s]+/).map(s=>s.trim()).filter(s=>/^[1-9]$/.test(s)),
        compensatoria: normalizeYesNo(get('compensatoria')),
        eval1: eval1v,
        propuesta1: parsePropuesta(get('propuesta1'), get('destino1')),
        eval2: eval2v,
        propuesta2: parsePropuesta(get('propuesta2'), get('destino2')),
        eval3: eval3v,
        propuesta3: parsePropuesta(get('propuesta3'), get('destino3')),
        evalExtr: parseInt(get('evalExtr')||get('eval extr')||'0') || 0,
        promociona: parsePropuesta(get('promociona'), get('destinoFinal')),
        notas: get('observaciones')||get('notas')||'',
      };
    });
}

function normalizeYesNo(v) {
  if (!v) return '';
  const lower = v.toLowerCase().trim();
  if (['si','sí','yes','s','1','true','y'].includes(lower)) return 'Sí';
  if (['no','n','0','false'].includes(lower)) return 'No';
  return v;
}

// Convierte el texto de una columna de propuesta/decisión en {tipo, destino}.
// Acepta valores combinados ("Promoción → 1º ESO", "Repetición - 1º ESO", "Titula | CFGM")
// y normaliza el tipo a las claves canónicas (Promoción/Titulación/Repetición/Abandono).
function parsePropuesta(raw, destinoRaw) {
  raw = (raw || '').trim();
  let tipo = raw;
  let destino = (destinoRaw || '').trim();
  // Si no viene un destino aparte, intentar separar "tipo <sep> destino"
  // Separadores: flechas (→, ->) o un guion/raya rodeado de espacios o "|" o ":"
  if (!destino && raw) {
    const parts = raw.split(/\s*(?:→|-+>|⟶)\s*|\s+[-–—]\s+|\s*[|:]\s*/);
    if (parts.length > 1) {
      tipo = parts[0].trim();
      destino = parts.slice(1).join(' ').replace(/\s+/g, ' ').trim();
    }
  }
  // Normalizar el tipo a su forma canónica si se reconoce
  const t = tipo.toLowerCase();
  if (/\bno\s+promo/.test(t) || /\bno\s+titul/.test(t)) {
    // "No promociona"/"No titula" no son tipos canónicos actuales: se trata como repetición
    tipo = 'Repetición';
  } else if (/promo/.test(t)) tipo = 'Promoción';
  else if (/titul/.test(t)) tipo = 'Titulación';
  else if (/repet|repit/.test(t)) tipo = 'Repetición';
  else if (/abandon/.test(t)) tipo = 'Abandono';
  // Si no coincide con ninguno, se conserva el texto original (tipo ya = raw recortado)
  return { tipo, destino };
}

function executeImport() {
  const { targetNivel, targetGrupo, importMode } = importState;
  const valid = importState.preview.filter(r => !r._error);

  // Ensure evalDates is initialized for this nivel
  if (!evalDates[targetNivel]) evalDates[targetNivel] = { eval1: _today, eval2: _today, eval3: _today };

  if (importMode === 'replace') {
    data[targetNivel][targetGrupo] = valid;
  } else {
    data[targetNivel][targetGrupo].push(...valid);
  }

  closeImportModal();
  currentNivel = targetNivel;
  currentGrupos[targetNivel] = targetGrupo;
  renderAll();
  setTimeout(() => { updateStats2(targetNivel, targetGrupo); }, 80);

  // Show success toast
  showToast(`✓ ${valid.length} alumnos importados en ${targetNivel} ${targetGrupo}`);
  markDirty();
}
