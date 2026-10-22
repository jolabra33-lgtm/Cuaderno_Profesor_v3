/* ============================================================================
   Gestor de Tutoría · Datos: niveles, grupos, estado global y deshacer
   tutoria/js/02-datos.js
   ============================================================================ */

// ===================== DATA =====================
const NIVELES = ['1º ESO', '2º ESO', '3º ESO', '4º ESO', '1º Bach.', '2º Bach.'];
/* v5 · La app arranca EN BLANCO (un grupo "A" por nivel, sin alumnado),
   igual que "Nuevo archivo". Antes arrancaba con 135 alumnos inventados al
   azar que, al tocar cualquier cosa, se guardaban como si fueran reales.
   Los datos de ejemplo solo se cargan si se piden (y nunca se guardan). */
const GRUPOS_EJEMPLO = {
  '1º ESO': ['A', 'B', 'C', 'D'],
  '2º ESO': ['A', 'B', 'C'],
  '3º ESO': ['A', 'B', 'C'],
  '4º ESO': ['A', 'B'],
  '1º Bach.': ['Científico', 'Hum.-Social'],
  '2º Bach.': ['Científico', 'Hum.-Social'],
};
let GRUPOS_POR_NIVEL = {
  '1º ESO': ['A'], '2º ESO': ['A'], '3º ESO': ['A'], '4º ESO': ['A'], '1º Bach.': ['A'], '2º Bach.': ['A'],
};

const BACH_NIVELES = ['1º Bach.', '2º Bach.'];
const isBach = n => BACH_NIVELES.includes(n) || /bach/i.test(n || '');

const PROPUESTAS = ['', 'Promociona', 'No Promociona', 'Titula', 'No Titula', 'Pendiente'];
const PROPUESTAS_FINAL = ['', 'Promociona', 'No Promociona', 'Titula', 'No Titula', 'Pendiente'];

// Configuración para el cálculo de Unidades Vacantes (editable y persistida)
let _vacantesCfg = {
  ratioESO: 30,
  ratioBach: 35,
  nuevos1ESO:   { cast: 0, val: 0 },   // alumnado de nueva entrada a 1º ESO (CEIP adscritos)
  ext1BachCient: 0,                    // alumnado externo que entra a 1º Bach Científico
  ext1BachHS:    0                     // alumnado externo que entra a 1º Bach HS
};

let currentNivel = '__home__';
let currentGrupos = {};
NIVELES.forEach(n => { currentGrupos[n] = GRUPOS_POR_NIVEL[n][0]; });

// Visibilidad de la pestaña "Actas no Oficiales" (se puede ocultar/mostrar
// desde el icono 🗂️ junto a "＋ Nivel"; el estado se guarda con el resto del
// estado de la app).
let _actasNoOficialesTabVisible = true;

// Estructura de datos: data[nivel][grupo] = [ {alumno...}, ... ]
let data = {};
NIVELES.forEach(nivel => {
  data[nivel] = {};
  GRUPOS_POR_NIVEL[nivel].forEach(grupo => {
    data[nivel][grupo] = [];
  });
});

let charts = {}; // chart instances per "nivel-grupo"
let _searchQuery = '';

// Sort state per grupo key
let _sortState = {}; // key -> {col, dir} where dir is 'asc'|'desc'

// Filter state per grupo key
let _filterState = {}; // key -> {nese, compensatoria, repetidor, propuesta, matSus}

// Column visibility/deletion state per grupo key
let _colState = {};

// Debounce timer for Inicio tab auto-refresh
let _resumenDebounce = null;

// Undo stack
const _undoStack = [];
const _UNDO_MAX = 30;

function _undoPush(nivel, grupo) {
  _undoStack.push({
    nivel, grupo,
    snapshot: JSON.parse(JSON.stringify(data[nivel][grupo]))
  });
  if (_undoStack.length > _UNDO_MAX) _undoStack.shift();
}

function _undoPop() {
  if (!_undoStack.length) return;
  const { nivel, grupo, snapshot } = _undoStack.pop();
  data[nivel][grupo] = snapshot;
  updateTable(nivel, grupo);
  updateStats(nivel, grupo);
  updateStats2(nivel, grupo);
  updateCharts(nivel, grupo);
  markDirty();
  showToast('↩ Cambio deshecho');
  hideUndoToast();
}

function showUndoToast(label) {
  let t = document.getElementById('undoToast');
  if (!t) return;
  t.querySelector('span').textContent = label;
  t.classList.add('visible');
  clearTimeout(t._to);
  t._to = setTimeout(() => t.classList.remove('visible'), 6000);
}

function hideUndoToast() {
  const t = document.getElementById('undoToast');
  if (t) { t.classList.remove('visible'); clearTimeout(t._to); }
}

function getFilterState(key) {
  if (!_filterState[key]) _filterState[key] = {};
  return _filterState[key];
}

function toggleFilter(key, field, value) {
  const fs = getFilterState(key);
  if (fs[field] === value) delete fs[field];
  else fs[field] = value;
  // Preserve open state of the filter bar across re-render
  const fb = document.getElementById(`filterbar-${key}`);
  const wasOpen = fb && fb.classList.contains('open');
  updateTable(currentNivel, currentGrupos[currentNivel]);
  if (wasOpen) {
    const fbNew = document.getElementById(`filterbar-${key}`);
    if (fbNew) fbNew.classList.add('open');
  }
}

function clearFilters(key) {
  _filterState[key] = {};
  const fb = document.getElementById(`filterbar-${key}`);
  const wasOpen = fb && fb.classList.contains('open');
  updateTable(currentNivel, currentGrupos[currentNivel]);
  if (wasOpen) {
    const fbNew = document.getElementById(`filterbar-${key}`);
    if (fbNew) fbNew.classList.add('open');
  }
}

function getAppliedFilters(key, alumnos) {
  const fs = getFilterState(key);
  if (!Object.keys(fs).length) return alumnos;
  return alumnos.filter(a => {
    if (fs.nese !== undefined) {
      if (fs.nese === 'Sí' && a.nese !== 'Sí') return false;
      if (fs.nese === '' && a.nese === 'Sí') return false; // 'Sin NESE' = anything that isn't Sí
    }
    if (fs.compensatoria !== undefined && a.compensatoria !== fs.compensatoria) return false;
    if (fs.repetidor !== undefined && a.repetidor !== fs.repetidor) return false;
    if (fs.propuesta !== undefined) {
      const tipo = getPropObj(a.promociona).tipo;
      if (tipo !== fs.propuesta) return false;
    }
    if (fs.matSus !== undefined) {
      const v = +a.eval3 || 0;
      if (fs.matSus === '0' && v !== 0) return false;
      if (fs.matSus === '1-2' && (v < 1 || v > 2)) return false;
      if (fs.matSus === '3+' && v < 3) return false;
    }
    if (fs.lengua !== undefined) {
      const lb = a.lenguaBase || '';
      if (fs.lengua === '' && lb !== '') return false;   // "No vota" = empty string
      if (fs.lengua !== '' && lb !== fs.lengua) return false;
    }
    if (fs.pendientes !== undefined) {
      const hasPend = (a.pendientesIII||[]).length > 0 || (a.pendientesExtr||[]).length > 0;
      if (fs.pendientes === 'si' && !hasPend) return false;
    }
    if (fs.sinDecision !== undefined) {
      const tieneDecision = !!getPropObj(a.promociona).tipo;
      if (fs.sinDecision === 'si' && tieneDecision) return false;
    }
    return true;
  });
}

function getSortedAlumnos(key, alumnos) {
  const ss = _sortState[key];
  if (!ss) return alumnos;
  const arr = [...alumnos];
  const { col, dir } = ss;
  const mult = dir === 'asc' ? 1 : -1;
  arr.sort((a, b) => {
    let va, vb;
    if (col === 'nombre') { va = a.nombre||''; vb = b.nombre||''; return mult * va.localeCompare(vb, 'es'); }
    if (col === 'fecha') { va = a.fecha||''; vb = b.fecha||''; return mult * va.localeCompare(vb); }
    if (col === 'eval1') { va = +a.eval1||0; vb = +b.eval1||0; return mult*(va-vb); }
    if (col === 'eval2') { va = +a.eval2||0; vb = +b.eval2||0; return mult*(va-vb); }
    if (col === 'eval3') { va = +a.eval3||0; vb = +b.eval3||0; return mult*(va-vb); }
    if (col === 'evalExtr') { va = +a.evalExtr||0; vb = +b.evalExtr||0; return mult*(va-vb); }
    if (col === 'nese') { va = a.nese||''; vb = b.nese||''; return mult*va.localeCompare(vb,'es'); }
    if (col === 'repetidor') { va = a.repetidor||''; vb = b.repetidor||''; return mult*va.localeCompare(vb,'es'); }
    if (col === 'propuesta') { va = getPropObj(a.promociona).tipo||''; vb = getPropObj(b.promociona).tipo||''; return mult*va.localeCompare(vb,'es'); }
    return 0;
  });
  return arr;
}

// Tutores por nivel-grupo
let tutores = {};
NIVELES.forEach(n => {
  GRUPOS_POR_NIVEL[n].forEach(g => { tutores[`${n}-${g}`] = ''; });
});
let currentModalTarget = null;

// Fechas de sesion de evaluacion configurables
const _today = new Date().toISOString().split('T')[0];
// evalDates is now per-nivel: evalDates[nivel] = {eval1, eval2, eval3}
let evalDates = {};
// Eventos propios del calendario de Tutoría (independientes de la app principal).
// Cada uno: {id, fecha:"YYYY-MM-DD", titulo, tipo, nota}
let calEventos = [];
const CAL_EV_TIPOS = [
  { id:'reunion',  label:'Reunión',          color:'#7c3aed' },
  { id:'junta',    label:'Junta de evaluación', color:'#0d9488' },
  { id:'entrega',  label:'Entrega / plazo',  color:'#2563eb' },
  { id:'actividad',label:'Actividad',        color:'#16a34a' },
  { id:'otro',     label:'Otro',             color:'#64748b' }
];
function calEvTipoInfo(id){ return CAL_EV_TIPOS.find(t=>t.id===id) || CAL_EV_TIPOS[4]; }
function _calEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
NIVELES.forEach(n => { evalDates[n] = { eval1: _today, eval2: _today, eval3: _today }; });
// Helper: get dates for the active nivel (or a specific one)
function getDates(nivel) { return evalDates[nivel] || { eval1: _today, eval2: _today, eval3: _today }; }

function fmtDate(iso) {
  if (!iso) return '—';
  const [y,m,d] = iso.split('-');
  return d+'/'+m+'/'+y;
}

function generateSampleData(nivel, grupo) {
  const nombres = [
    'García López, Ana', 'Martínez Ruiz, Carlos', 'Sánchez Torres, Lucía',
    'Fernández Gil, Pablo', 'López Mora, María', 'González Pérez, Javier',
    'Romero Díaz, Sofía', 'Jiménez Castro, Diego', 'Navarro Ortiz, Elena',
    'Molina Reyes, Andrés'
  ];
  const n = 6 + Math.floor(Math.random() * 5);
  return nombres.slice(0, n).map((nombre, i) => {
    const year = 2008 + (4 - parseInt(nivel[0]));
    const month = String(Math.floor(Math.random()*12)+1).padStart(2,'0');
    const day = String(Math.floor(Math.random()*28)+1).padStart(2,'0');
    const fecha = `${year}-${month}-${day}`;
    const ev1 = Math.floor(Math.random() * 5);
    const ev2 = Math.floor(Math.random() * 5);
    const ev3 = Math.floor(Math.random() * 4);
    return {
      id: Date.now() + Math.random(),
      nombre, fecha,
      repetidor: Math.random() > 0.8 ? 'Sí' : 'No',
      nese: ['', '', 'Sí', 'No', 'Sí', 'No', ''][Math.floor(Math.random()*7)],
      recursoNese: [],
      compensatoria: Math.random() > 0.85 ? 'Sí' : '',
      codComp: [],
      eval1: ev1,
      propuesta1: ev1 > 2 ? {tipo:'Repetición',destino:''} : ev1 === 0 ? {tipo:'Promoción',destino:''} : {tipo:'',destino:''},
      eval2: ev2,
      propuesta2: ev2 > 2 ? {tipo:'Repetición',destino:''} : ev2 === 0 ? {tipo:'Promoción',destino:''} : {tipo:'',destino:''},
      eval3: ev3,
      propuesta3: ev3 === 0 ? {tipo:'Promoción',destino:''} : ev3 > 3 ? {tipo:'Repetición',destino:''} : {tipo:'',destino:''},
      evalExtr: isBach(nivel) ? Math.floor(Math.random() * 4) : 0,
      promociona: ev3 === 0 ? {tipo:'Promoción',destino:''} : ev3 > 3 ? {tipo:'Repetición',destino:''} : {tipo:'',destino:''},
      notas: '',
      lenguaBase: '',
      colegioProcedencia: '',
      pendientesIII: [],
      pendientesExtr: [],
      // Materias suspendidas de cursos anteriores pendientes este curso + recuperadas/no recuperadas (eval. final)
      pendientesAnteriores: [],
      recuperadasAnteriores: [],
      noRecuperadasAnteriores: [],
      historial: [],
      // Seguimientos con familia: registros fechados, uno por cada vez que se
      // recoge lo que ha dicho el equipo docente para una reunión con la familia.
      seguimientos: [],
      // Convivencia y faltas por evaluación
      faltasJust1: 0, faltasInjust1: 0, ac1: 0, partes1: 0, expedientes1: 0,
      faltasJust2: 0, faltasInjust2: 0, ac2: 0, partes2: 0, expedientes2: 0,
      faltasJust3: 0, faltasInjust3: 0, ac3: 0, partes3: 0, expedientes3: 0,
      // Pendientes I y II evaluación
      pendientes1: [],
      pendientes2: [],
    };
  });
}

function calcEdad(fechaNac, fechaRef) {
  if (!fechaNac) return '';
  const ref = fechaRef ? new Date(fechaRef) : new Date();
  const nac = new Date(fechaNac);
  if (isNaN(ref) || isNaN(nac)) return '';
  let edad = ref.getFullYear() - nac.getFullYear();
  const m = ref.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < nac.getDate())) edad--;
  return edad >= 0 ? edad : '';
}
