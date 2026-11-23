/* ============================================================================
   Gestor de Tutoría · Compensatoria, propuestas, colegio de procedencia y materias
   tutoria/js/06-materias.js
   ============================================================================ */

// ===================== MULTI-CODE COMPENSATORIA =====================
const COMP_CODES = [
  { code: '1', label: 'Acogida en instituciones de protección social del menor o acogida familiar' },
  { code: '2', label: 'Condiciones económicas o sociales desfavorecidas' },
  { code: '3', label: 'Condiciones sociales que comportan posibles situaciones de desprotección y abandono' },
  { code: '4', label: 'Cumplimiento de medidas judiciales' },
  { code: '5', label: 'Informe del equipo de intervención social APB' },
  { code: '6', label: 'Dolencias crónicas que requieren una atención específica' },
  { code: '7', label: 'Escolarización irregular por abandonos educativos reiterados y periódicos y absentismo' },
  { code: '8', label: 'Escolarización irregular por itinerancia familiar' },
  { code: '9', label: 'Pertenencia a minorías étnicas o culturales y alumnado recién llegado en situación de desventaja social y económico' },
];

let _activePanel = null;

function closeMultiCodePanel() {
  if (_activePanel) {
    _activePanel.remove();
    _activePanel = null;
  }
}

document.addEventListener('click', function(e) {
  if (_activePanel && !_activePanel.contains(e.target) && !e.target.closest('.multicode-display') && !e.target.closest('#multicodeDragHandle')) {
    closeMultiCodePanel();
  }
});

function openMultiCode(e, nivel, grupo, idx) {
  e.stopPropagation();
  closeMultiCodePanel();

  const display = e.currentTarget;
  const alumno = data[nivel][grupo][idx];
  let selected = Array.isArray(alumno.codComp) ? [...alumno.codComp] : (alumno.codComp ? [String(alumno.codComp)] : []);

  const panel = document.createElement('div');
  panel.className = 'multicode-panel open';

  // Center panel in viewport
  panel.style.top  = Math.max(10, Math.round(window.innerHeight / 2 - 220)) + 'px';
  panel.style.left = Math.max(10, Math.round(window.innerWidth  / 2 - 150)) + 'px';

  const alumName = alumno.nombre || `Alumno ${idx + 1}`;

  function renderPanel() {
    panel.innerHTML = `
      <div class="multicode-drag-handle" id="multicodeDragHandle">
        <div class="multicode-drag-title">
          <div class="multicode-drag-dots">
            ${Array(6).fill('<span></span>').join('')}
          </div>
          📚 ${_tEsc(alumName)}
        </div>
        <button class="multicode-drag-close" onclick="closeMultiCodePanel()" title="Cerrar">✕</button>
      </div>
      <div class="multicode-panel-title">
        <span>Códigos compensatorios</span>
        <span style="color:var(--orange);font-weight:700">${selected.length ? _tEsc(selected.join(', ')) : 'ninguno'}</span>
      </div>
      ${COMP_CODES.map(c => `
        <label class="multicode-option">
          <input type="checkbox" value="${c.code}" ${selected.includes(c.code)?'checked':''} onchange="toggleCode(event,'${jsAttr(nivel)}','${jsAttr(grupo)}',${idx},'${c.code}')">
          <span class="multicode-option-code">${c.code}</span>
          <span class="multicode-option-label">${c.label}</span>
        </label>
      `).join('')}
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:6px;">
        <button class="btn btn-ghost btn-sm" onclick="clearCodes('${jsAttr(nivel)}','${jsAttr(grupo)}',${idx})">Limpiar</button>
        <button class="btn btn-primary btn-sm" onclick="closeMultiCodePanel()">Hecho</button>
      </div>
    `;
    // Re-attach drag after re-render
    attachPanelDrag(panel);
  }

  renderPanel();
  document.body.appendChild(panel);
  _activePanel = panel;
  display.classList.add('open');

  panel._selected = selected;
  panel._display  = display;
  panel._render   = renderPanel;
}

function attachPanelDrag(panel) {
  const handle = panel.querySelector('#multicodeDragHandle');
  if (!handle) return;
  let startX, startY, startLeft, startTop, dragging = false;

  handle.addEventListener('mousedown', function(e) {
    if (e.target.classList.contains('multicode-drag-close')) return;
    e.preventDefault();
    dragging = true;
    startX    = e.clientX;
    startY    = e.clientY;
    startLeft = parseInt(panel.style.left, 10) || 0;
    startTop  = parseInt(panel.style.top,  10) || 0;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  });

  function onMove(e) {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const newLeft = Math.max(0, Math.min(window.innerWidth  - panel.offsetWidth,  startLeft + dx));
    const newTop  = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, startTop  + dy));
    panel.style.left = newLeft + 'px';
    panel.style.top  = newTop  + 'px';
  }

  function onUp() {
    dragging = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup',   onUp);
  }
}

function toggleCode(e, nivel, grupo, idx, code) {
  e.stopPropagation();
  const alumno = data[nivel][grupo][idx];
  let codes = Array.isArray(alumno.codComp) ? [...alumno.codComp] : [];
  if (e.target.checked) {
    if (!codes.includes(code)) codes.push(code);
    codes.sort();
  } else {
    codes = codes.filter(c => c !== code);
  }
  alumno.codComp = codes;
  markDirty();

  // Update the display pills without full re-render
  if (_activePanel) {
    const titleSpan = _activePanel.querySelector('.multicode-panel-title span:last-child');
    if (titleSpan) titleSpan.textContent = codes.length ? codes.join(', ') : 'ninguno';
  }
  // Update the cell display — use data-idx to find correct row even when filtered/sorted
  const key = `${nivel}-${grupo}`;
  const tbl = document.getElementById(`tbl-${key}`);
  if (tbl) {
    const row = tbl.querySelector(`tbody tr[data-idx="${idx}"]`);
    const display = row ? row.querySelector('.multicode-display') : null;
    if (display) {
      display.innerHTML = codes.length
        ? codes.map(c=>`<span class="code-pill">${_tEsc(c)}</span>`).join('')
        : '<span class="multicode-placeholder">—</span>';
    }
  }
}

function clearCodes(nivel, grupo, idx) {
  data[nivel][grupo][idx].codComp = [];
  // Uncheck all
  if (_activePanel) {
    _activePanel.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
    const titleSpan = _activePanel.querySelector('.multicode-panel-title span:last-child');
    if (titleSpan) titleSpan.textContent = 'ninguno';
  }
  // Update cell — use data-idx to find correct row even when filtered/sorted
  const key = `${nivel}-${grupo}`;
  const tbl = document.getElementById(`tbl-${key}`);
  if (tbl) {
    const row = tbl.querySelector(`tbody tr[data-idx="${idx}"]`);
    const display = row ? row.querySelector('.multicode-display') : null;
    if (display) display.innerHTML = '<span class="multicode-placeholder">—</span>';
  }
}

// ===================== PROPUESTA MULTI-SELECT =====================
const PROPUESTA_TIPOS = [
  { key: 'Repetición', label: 'Repetición', cls: 'repite'   },
  { key: 'Promoción',  label: 'Promoción',  cls: 'promo'    },
  { key: 'Titulación', label: 'Titulación', cls: 'titula'   },
  { key: 'Abandono',   label: 'Abandono',   cls: 'abandono' },
];
const PROPUESTA_DESTINOS = [
  '1º ESO', '2º ESO', '3º ESO', '3º PDC', '4º ESO', '4º PDC',
  'FPB', '1º Bachillerato Científico', '1º Bachillerato HS', '2º Bachillerato Científico', '2º Bachillerato HS', '2 PAC', 'CFGM'
];

// ===================== COLEGIO DE PROCEDENCIA =====================
const CEIP_KNOWN = [
  'CEIP Verge de la Font (Villalonga)',
  'CEIP Sant Marc (Beniarjó)',
  'CEIP La Murtera (Ador/Palma de Gandía)',
  "CEIP Francesc Carròs (La Font d'en Carròs)",
  'CRA Alfauir-Ròtova (Rótova)',
  'CRA Alfauir-Ròtova (Alfauir)',
  'CRA Riu Vernissa (Llocnou de Sant Jeroni/Almiserà/Castellonet de la Conquesta)',
];

// ===================== MATERIAS POR NIVEL =====================
const MATERIAS_POR_NIVEL = {
  '1º ESO': [
    'Valenciano: Lengua y Literatura','Lengua Castellana y Literatura','Inglés',
    'Geografía e Historia','Educación Física','Matemáticas','Biología y Geología',
    'Música','Tecnología y Digitalización','Finanzas y Consumo Responsables',
    'Lab. Artes Escénicas','Lab. Creación Audiovisual','Proyectos Interdisciplinarios',
    'Segunda Lengua Extranjera','Talleres de Profundización','Taller Relac. Digitales',
    'Taller de Refuerzo','Religión'
  ],
  '2º ESO': [
    'Valenciano: Lengua y Literatura','Lengua Castellana y Literatura','Inglés',
    'Geografía e Historia','Educación Física','Matemáticas','Física y Química','Música',
    'Ed. Plástica, Visual y Audiovisual','Emprendimiento Social y Sostenible',
    'Programación, IA y Robótica I','Proyectos Interdisciplinarios',
    'Segunda Lengua Extranjera','Taller de Profundización','Taller de Refuerzo','Religión'
  ],
  '3º ESO': [
    'Valenciano: Lengua y Literatura','Lengua Castellana y Literatura','Inglés',
    'Geografía e Historia','Educación Física','Matemáticas','Biología y Geología',
    'Física y Química','Educación Plástica y Visual','Música','Tecnología y Digitalización',
    'CCO en Primera Lengua Extranjera','Creatividad Musical','Cultura Clásica',
    'Programación, IA y Robótica II','Proyectos Interdisciplinarios',
    'Segunda Lengua Extranjera','Taller de Profundización','Taller de Economía',
    'Taller de Refuerzo','Religión'
  ],
  '3º PDC': [
    'Ámbito Lingüístico-Social','Ámbito Científico','Ámbito Práctico','Inglés',
    'Educación Física','Música','CCO en Primera Lengua Extranjera','Creatividad Musical',
    'Cultura Clásica','Programación, IA y Robótica II','Proyectos Interdisciplinarios',
    'Segunda Lengua Extranjera','Taller de Profundización','Taller de Economía',
    'Taller de Refuerzo','Religión'
  ],
  '4º ESO': [
    'Educación Física','Educación en Valores Cívicos y Éticos','Geografía e Historia',
    'Valenciano: Lengua y Literatura','Lengua Castellana y Literatura','Lengua Extranjera',
    'Matemáticas B','Matemáticas A','Física y Química','Biología','Tecnología','Latín',
    'Economía','FOPP','Digitalización','Música','Francés','Expresión Artística',
    'Artes Escénicas','CCO en Primera Lengua Extranjera','Filosofía',
    'Proyectos Interdisciplinarios','Taller de Profundización','Taller de Refuerzo','Religión'
  ],
  '4º PDC': [
    'Ámbito Lingüístico-Social','Ámbito Científico','Ámbito Práctico','Inglés',
    'Educación Física','Educación en Valores Cívicos y Éticos','Artes Escénicas',
    'CCO en Primera Lengua Extranjera','Filosofía','Proyectos Interdisciplinarios',
    'Taller de Profundización','Taller de Refuerzo','Religión'
  ],
  '1º Bach.': [
    'Educación Física','Filosofía','Valenciano: Lengua y Literatura I',
    'Lengua Castellana y Literatura I','Lengua Extranjera I','Matemáticas I',
    'Física y Química','Dibujo Técnico I','Biología, Geología y CC. Ambientales',
    'Tecnología e Ingeniería I','Matemáticas CCSS I','Latín I','Economía','Griego',
    'Historia del Mundo Contemporáneo','Literatura Universal',
    'Segunda Lengua Extranjera I','Programación, Redes y Sistemas I',
    'Biología Humana y Salud','Gestión Proyectos de Emprendimiento',
    'Psicología','Religión'
  ],
  '2º Bach.': [
    'Historia de la Filosofía','Historia de España',
    'Valenciano: Lengua y Literatura II','Lengua Castellana y Literatura II',
    'Lengua Extranjera II','Matemáticas II','Matemáticas CCSS II','Química',
    'Tecnología e Ingeniería II','Dibujo Técnico II','Biología','Física',
    'Geología y CC. Ambientales','Latín II','Empresa y Diseño de Mod. de Negocio',
    'Griego II','Historia del Arte','Geografía','Segunda Lengua Extranjera II',
    'Programación, Redes y Sistemas II','Actividad Física para la Salud',
    'Trabajo Experimental en Física y Química','Producción Musical','Religión'
  ]
};

function getMateriasParaNivel(nivel, grupo) {
  const g = (grupo||'').toUpperCase();
  if (g === 'PDC' || g.endsWith('PDC')) {
    const pdcKey = nivel.includes('3º') ? '3º PDC' : nivel.includes('4º') ? '4º PDC' : null;
    if (pdcKey) {
      if (_materiasCustom[pdcKey]) return _materiasCustom[pdcKey];
      if (MATERIAS_POR_NIVEL[pdcKey]) return MATERIAS_POR_NIVEL[pdcKey];
    }
  }
  if (_materiasCustom[nivel]) return _materiasCustom[nivel];
  if (MATERIAS_POR_NIVEL[nivel]) return MATERIAS_POR_NIVEL[nivel];
  // Fallback: el nombre de la pestaña de grupo puede no coincidir literalmente
  // con la clave canónica del catálogo (p. ej. "2º Bachillerato Científico" o
  // "2º Bachillerato HS" en vez de "2º Bach."). Se reintenta con el nivel
  // académico normalizado, igual que ya hace getMateriasCursosAnteriores().
  const claveCanonica = _normalizarNivelAcademico(nivel);
  if (claveCanonica) {
    if (_materiasCustom[claveCanonica]) return _materiasCustom[claveCanonica];
    if (MATERIAS_POR_NIVEL[claveCanonica]) return MATERIAS_POR_NIVEL[claveCanonica];
  }
  return [];
}

/* ===================== EL CATÁLOGO MANDA EN LOS NOMBRES DE MATERIA =====================
   Las materias se cruzan por su nombre en todas partes (suspensas, notas, faltas, equipo docente,
   acta…). Si el equipo docente pone «Matemáticas aplicadas a la CCSS II» y el catálogo (⚙ Materias)
   dice «Matemáticas CCSS II», son dos materias distintas para la app. Por eso la materia del
   profesor/a se elige del catálogo, y estas funciones ayudan a poner al día lo escrito antes a mano. */
const _T_MAT_VACIAS = new Set(['de','del','la','las','el','los','y','e','a','al','en','para','con','por','aplicadas','aplicada']);
const _T_MAT_ROMANOS = new Set(['i','ii','iii','iv']);
const _T_RE_SUSTITUTO = /\s*\(\s*(?:sustitut[oa]s?|sust\.?)\s*\)\s*$/i;
function _tMatPalabras(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\([^)]*\)/g, ' ')
    .split(/[^a-z0-9]+/).filter(w => w && !_T_MAT_VACIAS.has(w));
}
// «Producción Musical (sustituto)» → «Producción Musical».
function _tSinSustituto(m) { return String(m || '').replace(_T_RE_SUSTITUTO, '').trim(); }
function _tEsSustituto(m) { return _T_RE_SUSTITUTO.test(String(m || '')); }
// La materia tal como está escrita en el catálogo (sin mirar mayúsculas ni tildes), o ''.
function _tMatEnCatalogo(m, catalogo) { return (catalogo || []).find(c => _tNorm(c) === _tNorm(m)) || ''; }
/* La materia del catálogo que más se parece a «m», o '' si ninguna se parece lo bastante o hay dos igual de
   buenas (entonces elige el usuario). «evitar»: nombres que ya usa otra materia del grupo.
   «Matemáticas aplicadas a la CCSS II» → «Matemáticas CCSS II»; «Educación Física» no es «Física»;
   «Matemáticas II» no es «Matemáticas I»; «Lengua extranjera II (Francés)» solo casa con una que diga «Francés». */
function _tMateriaParecida(m, catalogo, evitar) {
  evitar = (evitar || []).map(_tNorm);
  m = _tSinSustituto(m);
  const A = _tMatPalabras(m); if (!A.length) return '';
  const parA = _tMatPalabras((String(m).match(/\(([^)]*)\)/g) || []).join(' ').replace(/[()]/g, ' '));
  const romA = A.filter(w => _T_MAT_ROMANOS.has(w)), txtA = A.filter(w => !_T_MAT_ROMANOS.has(w));
  const igual = (x, y) => x === y || (Math.min(x.length, y.length) >= 3 && (x.startsWith(y) || y.startsWith(x)));   // «Mod.» = «modelos»
  const notas = [];
  (catalogo || []).forEach(c => {
    if (evitar.includes(_tNorm(c))) return;
    const B = _tMatPalabras(c), romB = B.filter(w => _T_MAT_ROMANOS.has(w)), txtB = B.filter(w => !_T_MAT_ROMANOS.has(w));
    if (romA.length && romB.length && romA.join() !== romB.join()) return;
    if (!txtA.length || !txtB.length) return;
    const todasB = _tMatPalabras(String(c).replace(/[()]/g, ' '));
    if (parA.some(w => !todasB.includes(w))) return;
    const comunes = txtA.filter(w => txtB.some(v => igual(w, v))).length;
    if (!comunes || (comunes === 1 && txtB.length < txtA.length)) return;
    const contiene = comunes / Math.min(txtA.length, txtB.length), cubre = comunes / Math.max(txtA.length, txtB.length);
    notas.push({ c, contiene, comunes, p: 0.6 * contiene + 0.4 * cubre });
  });
  notas.sort((x, y) => y.contiene - x.contiene || y.comunes - x.comunes || y.p - x.p);
  const [a, b] = notas;
  if (!a || a.p < 0.7) return '';
  if (b && b.contiene === a.contiene && b.comunes === a.comunes) return '';
  return a.c;
}
// Clave del catálogo de la que sale la lista de un grupo (la misma que usa getMateriasParaNivel).
function _tClaveCatalogo(nivel, grupo) {
  const g = (grupo || '').toUpperCase();
  if (g === 'PDC' || g.endsWith('PDC')) {
    const pdc = nivel.includes('3º') ? '3º PDC' : nivel.includes('4º') ? '4º PDC' : null;
    if (pdc && (_materiasCustom[pdc] || MATERIAS_POR_NIVEL[pdc])) return pdc;
  }
  if (_materiasCustom[nivel] || MATERIAS_POR_NIVEL[nivel]) return nivel;
  const canon = _normalizarNivelAcademico(nivel);
  if (canon && (_materiasCustom[canon] || MATERIAS_POR_NIVEL[canon])) return canon;
  return nivel;
}
// Añade una materia al catálogo del nivel (si no estaba) y devuelve el nombre con el que queda.
function _tAnadirAlCatalogo(nivel, grupo, materia) {
  materia = String(materia || '').trim();
  if (!materia) return '';
  const actual = getMateriasParaNivel(nivel, grupo) || [];
  const ya = _tMatEnCatalogo(materia, actual);
  if (ya) return ya;
  _materiasCustom[_tClaveCatalogo(nivel, grupo)] = [...actual, materia];
  saveMateriaCustom();
  return materia;
}
/* Cambia el nombre de una materia en el alumnado de un grupo: suspensas de cada evaluación, «no la cursa»
   y sus datos (notas, faltas, comentarios). También su abreviatura del acta. Si algún alumno/a ya tiene
   datos con los dos nombres no se toca nada (se mezclarían dos materias) y se devuelve {choque}. */
function _tRenombrarMateriaGrupo(nivel, grupo, de, a) {
  const alumnos = data[nivel]?.[grupo] || [];
  if (!de || !a || de === a) return { alumnos: 0 };
  const choque = alumnos.filter(al => { const ks = Object.keys(al.porMateria || {}); return ks.some(k => _tNorm(k) === _tNorm(de)) && ks.some(k => _tNorm(k) === _tNorm(a)) && _tNorm(de) !== _tNorm(a); });
  if (choque.length) return { alumnos: 0, choque };
  let n = 0;
  alumnos.forEach(al => {
    let cambia = false;
    ['pendientes1', 'pendientes2', 'pendientesIII', 'pendientesExtr', 'noCursa'].forEach(campo => {
      if (!Array.isArray(al[campo])) return;
      const tieneA = al[campo].some(m => _tNorm(m) === _tNorm(a));
      const nueva = [];
      al[campo].forEach(m => { if (_tNorm(m) === _tNorm(de)) { cambia = true; if (!tieneA && !nueva.includes(a)) nueva.push(a); } else nueva.push(m); });
      al[campo] = nueva;
    });
    const k = Object.keys(al.porMateria || {}).find(x => _tNorm(x) === _tNorm(de));
    if (k && k !== a) { al.porMateria[a] = al.porMateria[k]; delete al.porMateria[k]; cambia = true; }
    if (cambia) n++;
  });
  if (typeof _abrevMaterias === 'object' && _abrevMaterias) {
    const k = Object.keys(_abrevMaterias).find(x => _tNorm(x) === _tNorm(de));
    if (k && !Object.keys(_abrevMaterias).some(x => _tNorm(x) === _tNorm(a))) { _abrevMaterias[a] = _abrevMaterias[k]; delete _abrevMaterias[k]; }
  }
  return { alumnos: n };
}
// Cuántos alumnos/as del grupo tienen algo guardado con ese nombre de materia.
function _tAlumnosConMateria(nivel, grupo, materia) {
  return (data[nivel]?.[grupo] || []).filter(al =>
    ['pendientes1', 'pendientes2', 'pendientesIII', 'pendientesExtr', 'noCursa'].some(c => (al[c] || []).some(m => _tNorm(m) === _tNorm(materia))) ||
    Object.keys(al.porMateria || {}).some(x => _tNorm(x) === _tNorm(materia))).length;
}
/* Grupos que toman su lista de materias de esa clave del catálogo (p. ej. «2º Bach.»: los grupos de
   «2º Bachillerato HS» y «2º Bachillerato Científico» comparten la lista). */
function _tGruposDelCatalogo(clave) {
  const out = [];
  (typeof NIVELES !== 'undefined' ? NIVELES : []).forEach(nivel => (GRUPOS_POR_NIVEL[nivel] || []).forEach(grupo => {
    if (_tClaveCatalogo(nivel, grupo) === clave) out.push({ nivel, grupo });
  }));
  return out;
}
// Quién usa una materia del catálogo: profesores/as y alumnado de los grupos que comparten esa lista.
function _tUsoMateriaCatalogo(clave, materia) {
  const grupos = _tGruposDelCatalogo(clave).map(({ nivel, grupo }) => {
    const d = (window._asistenciaData || {})[`${nivel}-${grupo}`];
    const profes = ((d && d.profesores) || []).filter(p => _tNorm(p.materia) === _tNorm(materia)).length;
    return { nivel, grupo, profes, alumnos: _tAlumnosConMateria(nivel, grupo, materia) };
  }).filter(g => g.profes || g.alumnos);
  return { grupos, profes: grupos.reduce((n, g) => n + g.profes, 0), alumnos: grupos.reduce((n, g) => n + g.alumnos, 0),
    texto: grupos.map(g => `${g.nivel} ${g.grupo}`).join(', ') };
}
function _tUsoTexto(u) {
  return [u.profes ? `${u.profes} profesor${u.profes === 1 ? '/a' : 'es/as'} del equipo docente` : '', u.alumnos ? `${u.alumnos} alumno${u.alumnos === 1 ? '/a' : 's/as'} (suspensas, notas o faltas)` : ''].filter(Boolean).join(' y ');
}
/* Cambia el nombre de una materia del catálogo en todo lo que la usa: equipo docente y alumnado de los grupos
   que comparten esa lista. Si en algún alumno/a hay datos con los dos nombres no se cambian los datos (se
   mezclarían dos materias): devuelve {choque} y no toca nada. */
function _tRenombrarEnGruposDelCatalogo(clave, de, a, comprobar) {
  const grupos = _tGruposDelCatalogo(clave);
  const choque = [];
  grupos.forEach(({ nivel, grupo }) => (data[nivel]?.[grupo] || []).forEach(al => {
    const ks = Object.keys(al.porMateria || {});
    if (_tNorm(de) !== _tNorm(a) && ks.some(k => _tNorm(k) === _tNorm(de)) && ks.some(k => _tNorm(k) === _tNorm(a))) choque.push(`${al.nombre} (${nivel} ${grupo})`);
  }));
  if (choque.length || comprobar) return { choque, profes: 0, alumnos: 0 };
  let profes = 0, alumnos = 0;
  grupos.forEach(({ nivel, grupo }) => {
    const d = (window._asistenciaData || {})[`${nivel}-${grupo}`];
    ((d && d.profesores) || []).forEach(p => { if (_tNorm(p.materia) === _tNorm(de)) { p.materia = a; profes++; } });
    alumnos += _tRenombrarMateriaGrupo(nivel, grupo, de, a).alumnos || 0;
  });
  return { choque, profes, alumnos };
}
// La materia de un profesor/a para mostrarla: «Producción Musical (sustituto/a)».
function _tMateriaDeProfesor(p) { const m = String((p && p.materia) || '').trim(); return m && p.sustituto ? m + ' (sustituto/a)' : m; }
// El profesor/a de una materia en el equipo docente: si hay titular y sustituto/a, quien da la clase ahora (el sustituto/a).
function _tProfesorDeMateria(profesores, materia) {
  const de = (profesores || []).filter(p => _tNorm(p.materia) === _tNorm(materia));
  return de.find(p => p.sustituto) || de[0] || null;
}

// Materias de CURSOS ANTERIORES: unión (sin duplicados) de las materias de TODOS
// los cursos académicamente anteriores al nivel del alumno — 1º ESO, 2º ESO, 3º ESO…
// según corresponda — estén o no creados como pestaña en esta instalación.
// Esto es así porque el listado de materias por curso (pestaña ⚙ Materias) es
// el catálogo de referencia del centro, independiente de qué niveles tenga
// abiertos el tutor en este momento.
const ORDEN_ACADEMICO = ['1º ESO', '2º ESO', '3º ESO', '4º ESO', '1º Bach.', '2º Bach.'];

// Normaliza el nombre de un nivel (incluido uno creado por el usuario, p.ej.
// "2 ESO" o "2ºESO") a su clave canónica dentro de ORDEN_ACADEMICO, si existe.
function _normalizarNivelAcademico(nivel) {
  if (!nivel) return null;
  if (ORDEN_ACADEMICO.includes(nivel)) return nivel;
  // Normaliza quitando puntos, espacios y acentos para una detección robusta
  // frente a cualquier variante de escritura que el tutor haya usado al crear
  // el nivel ("2 Bachillerato", "2ºBach", "2 BACH.", "Segundo de Bachillerato"…).
  const s = nivel.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos (º, é, etc. no afectan aquí pero por si acaso)
    .replace(/[.\s]/g, '');

  // Detecta el curso (1º/2º/3º/4º o "primero".."cuarto") y la etapa (eso/bach)
  const numMap = { '1':'1','primero':'1','primer':'1', '2':'2','segundo':'2', '3':'3','tercero':'3','tercer':'3', '4':'4','cuarto':'4' };
  const mNum = s.match(/^(1|2|3|4|primero|primer|segundo|tercero|tercer|cuarto)/);
  const numero = mNum ? numMap[mNum[1]] : null;

  if (/bach/.test(s)) {
    if (numero === '1') return '1º Bach.';
    if (numero === '2') return '2º Bach.';
    return null; // "Bachillerato" sin curso identificable (no debería ocurrir vía isBach)
  }
  if (/eso/.test(s)) {
    if (['1','2','3','4'].includes(numero)) return `${numero}º ESO`;
    return null;
  }
  return null;
}

// Devuelve las materias de cursos anteriores ETIQUETADAS con su curso de origen,
// p.ej. "Matemáticas (1º ESO)". Es necesario porque la misma materia (Matemáticas,
// Inglés, Educación Física…) existe en varios cursos con contenidos distintos, y un
// alumno puede tener pendiente la de 1º, la de 2º y la de 3º a la vez — son pendientes
// distintas y deben poder marcarse y verse por separado.
// El valor devuelto (con el "(curso)" incluido) es el que se guarda en
// a.pendientesAnteriores, de modo que la etiqueta de curso queda fijada para
// siempre aunque el orden de pestañas cambie más adelante.
function getMateriasCursosAnteriores(nivel) {
  const claveCanonica = _normalizarNivelAcademico(nivel);
  const pares = []; // [{materia, curso}]

  if (claveCanonica) {
    // Caso normal: el nivel es un curso reconocido (1º-4º ESO, 1º/2º Bach.).
    // Tomamos TODOS los cursos académicamente anteriores del catálogo general,
    // existan o no como pestaña creada en esta instalación reducida.
    const idx = ORDEN_ACADEMICO.indexOf(claveCanonica);
    for (let i = 0; i < idx; i++) {
      const lvl = ORDEN_ACADEMICO[i];
      const mats = _materiasCustom[lvl] || MATERIAS_POR_NIVEL[lvl] || [];
      mats.forEach(m => pares.push({ materia: m, curso: lvl }));
    }
  } else {
    // Nivel totalmente personalizado (p.ej. "1º FPB") sin equivalencia académica
    // reconocida: recurrimos al orden de pestañas definido por el tutor, que es
    // la única referencia disponible en ese caso.
    const idx = NIVELES.indexOf(nivel);
    for (let i = 0; i < idx; i++) {
      const lvl = NIVELES[i];
      const mats = _materiasCustom[lvl] || MATERIAS_POR_NIVEL[lvl] || [];
      mats.forEach(m => pares.push({ materia: m, curso: lvl }));
    }
  }

  // Evitar duplicados exactos (mismo nombre + mismo curso, por si dos claves
  // resolviesen al mismo nivel)
  const vistos = new Set();
  const etiquetadas = [];
  pares.forEach(({ materia, curso }) => {
    const valor = `${materia} (${curso})`;
    if (vistos.has(valor)) return;
    vistos.add(valor);
    etiquetadas.push(valor);
  });

  // Orden: por curso (cronológico, 1º ESO primero) y, dentro de cada curso, alfabético.
  // No se ordena por el string completo para no mezclar cursos entre sí.
  const ordenCursoIdx = (curso) => {
    const i = ORDEN_ACADEMICO.indexOf(curso);
    return i >= 0 ? i : ORDEN_ACADEMICO.length + NIVELES.indexOf(curso);
  };
  return etiquetadas.sort((a, b) => {
    const pa = _splitMateriaCurso(a), pb = _splitMateriaCurso(b);
    const ca = ordenCursoIdx(pa.curso), cb = ordenCursoIdx(pb.curso);
    if (ca !== cb) return ca - cb;
    return pa.materia.localeCompare(pb.materia, 'es');
  });
}

// ===================== MATERIAS PERSONALIZADAS =====================
// Stores per-nivel custom lists. Overrides MATERIAS_POR_NIVEL when set.
let _materiasCustom = {};

function saveMateriaCustom() {
  try { localStorage.setItem('evalies_materias', JSON.stringify(_materiasCustom)); } catch(e) {}
  markDirty();
}

function loadMateriasCustom() {
  try {
    const raw = localStorage.getItem('evalies_materias');
    if (raw) Object.assign(_materiasCustom, JSON.parse(raw));
  } catch(e) {}
}

function resetMateriaCustom(nivel) {
  delete _materiasCustom[nivel];
  saveMateriaCustom();
  renderMaterias();
  showToast(`↺ ${nivel}: materias restauradas a plantilla por defecto`);
}

function renderMaterias() {
  const mc = document.getElementById('mainContent');
  mc.innerHTML = '';

  // El catálogo de materias es el de referencia del centro (1º-4º ESO, 1º/2º Bach.,
  // más las variantes PDC), independientemente de qué niveles tenga creados el
  // tutor como pestaña de trabajo en esta instalación. Así la plantilla de
  // materias está siempre disponible — incluida la de cursos que el tutor no
  // tenga abiertos — y sirve de referencia para "Pend. Ant." en cualquier nivel.
  const allLevels = [...ORDEN_ACADEMICO, '3º PDC', '4º PDC'];
  // Añadir también los niveles personalizados creados por el tutor que no
  // encajen en el catálogo académico estándar (p. ej. "1º FPB"), para que
  // también se les pueda definir una plantilla de materias propia.
  NIVELES.forEach(n => {
    if (!allLevels.includes(n) && !_normalizarNivelAcademico(n)) allLevels.push(n);
  });

  let currentEditLevel = allLevels[0] || '';

  function getMats(nivel) {
    return _materiasCustom[nivel] ? [..._materiasCustom[nivel]] : [...(MATERIAS_POR_NIVEL[nivel] || [])];
  }
  function isCustom(nivel) { return !!_materiasCustom[nivel]; }

  function buildEditor(nivel) {
    const mats = getMats(nivel);
    const custom = isCustom(nivel);
    const rows = mats.map((m, i) => `
      <div class="mat-row" data-idx="${i}" draggable="true">
        <span class="mat-drag-handle" title="Arrastrar para reordenar">⠿</span>
        <span class="mat-name" id="matName-${nivel.replace(/[^a-zA-Z0-9]/g,'_')}-${i}"
          style="flex:1;cursor:text;" title="Doble clic para renombrar"
          ondblclick="_matStartRename('${jsAttr(nivel)}',${i},this)">${_tEsc(m)}</span>
        <div class="mat-row-actions">
          <button class="mat-btn" title="Renombrar" onclick="_matStartRename('${jsAttr(nivel)}',${i},document.getElementById('matName-${nivel.replace(/[^a-zA-Z0-9]/g,'_')}-${i}'))">✏</button>
          <button class="mat-btn mat-btn-up"   title="Subir"    onclick="_matMove('${jsAttr(nivel)}',${i},-1)">↑</button>
          <button class="mat-btn mat-btn-down" title="Bajar"    onclick="_matMove('${jsAttr(nivel)}',${i},+1)">↓</button>
          <button class="mat-btn mat-btn-del"  title="Eliminar" onclick="_matDel('${jsAttr(nivel)}',${i})">✕</button>
        </div>
      </div>`).join('');

    const idSafe = nivel.replace(/[^a-zA-Z0-9]/g,'_');
    return `
      <div class="mat-editor">
        <div class="mat-editor-header">
          <div>
            <div style="font-size:15px;font-weight:700;color:var(--text)">${_tEsc(nivel)}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:2px">
              ${mats.length} materias ·
              ${custom
                ? `<span style="color:var(--yellow)">⚙ Plantilla personalizada</span>`
                : `<span style="color:var(--text3)">Plantilla por defecto</span>`}
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button class="btn btn-ghost btn-sm" title="Exportar esta plantilla como JSON" onclick="_matExport('${jsAttr(nivel)}')">⬇ Exportar</button>
            <button class="btn btn-ghost btn-sm" title="Importar plantilla desde JSON" onclick="_matImportClick('${jsAttr(nivel)}')">⬆ Importar</button>
            ${custom ? `<button class="btn btn-ghost btn-sm" style="color:var(--red);border-color:rgba(247,110,110,0.4)" onclick="resetMateriaCustom('${jsAttr(nivel)}')">↺ Restaurar defecto</button>` : ''}
          </div>
        </div>

        <input type="file" id="matImportFile-${idSafe}" accept=".json" style="display:none"
          onchange="_matImportFile('${jsAttr(nivel)}',this)">

        <div class="mat-list" id="matList-${idSafe}">${rows}</div>

        <div class="mat-add-row">
          <input type="text" class="mat-add-input" id="matAddInput-${idSafe}"
            placeholder="Nueva materia… (Enter para añadir)"
            onkeydown="if(event.key==='Enter'){_matAdd('${jsAttr(nivel)}');event.preventDefault();}">
          <button class="btn btn-primary btn-sm" onclick="_matAdd('${jsAttr(nivel)}')">＋ Añadir</button>
          ${!custom ? `<button class="btn btn-ghost btn-sm" onclick="_matDuplFromDefault('${jsAttr(nivel)}')">📋 Editar copia</button>` : ''}
        </div>

        <div style="font-size:10px;color:var(--text3);padding:8px 14px;border-top:1px solid var(--border);margin-top:4px;">
          💡 Doble clic o botón ✏ para renombrar · Arrastra para reordenar · Los cambios se guardan automáticamente en el archivo .json
        </div>
      </div>`;
  }

  // Level selector tabs
  const _nivelesNormalizados = new Set(NIVELES.map(n => _normalizarNivelAcademico(n) || n));
  const levelTabs = allLevels.map(n => {
    const noCreado = !_nivelesNormalizados.has(n) && !NIVELES.includes(n);
    return `
    <button class="mat-level-tab ${n === currentEditLevel ? 'active' : ''}"
      id="matLevelTab-${n.replace(/[^a-zA-Z0-9]/g,'_')}"
      title="${noCreado ? 'Este nivel no está creado como pestaña, pero su plantilla de materias sigue disponible como referencia (p. ej. para marcar "Pend. Ant." en niveles posteriores)' : ''}"
      onclick="document.querySelectorAll('.mat-level-tab').forEach(t=>t.classList.remove('active'));this.classList.add('active');document.getElementById('matEditorArea').innerHTML=window._buildMatEditor('${jsAttr(n)}');window._initMatDrag('${jsAttr(n)}');">
      ${_tEsc(n)}${isCustom(n) ? ' <span style="color:var(--yellow);font-size:10px">⚙</span>' : ''}${noCreado ? ' <span style="color:var(--text3);font-size:10px">○</span>' : ''}
    </button>`;
  }).join('');

  mc.innerHTML = `
    <div class="main dash-wrap">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
        <div>
          <div style="font-family:inherit;font-size:20px;font-weight:800;color:var(--text);letter-spacing:-0.5px;">⚙ Plantilla de Materias</div>
          <div style="font-size:12px;color:var(--text2);margin-top:4px;">Personaliza las materias disponibles por nivel para tu centro. Los cambios afectan a los selectores de materias pendientes. <span style="color:var(--text3)">○ = nivel no creado todavía como pestaña, pero su plantilla está disponible como referencia para "Pend. Ant.".</span></div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="(async()=>{if(await confirmar('¿Restaurar TODAS las materias a los valores por defecto?')){_materiasCustom={};saveMateriaCustom();renderMaterias();showToast('↺ Todas las materias restauradas');}})()">↺ Restaurar todo</button>
      </div>

      <div class="mat-level-tabs">${levelTabs}</div>

      <div id="matEditorArea">${buildEditor(currentEditLevel)}</div>
    </div>
  `;

  // Expose helpers globally so inline handlers reach them
  window._buildMatEditor = buildEditor;
  window._initMatDrag = function(nivel) {
    const listId = `matList-${nivel.replace(/[^a-zA-Z0-9]/g,'_')}`;
    const list = document.getElementById(listId);
    if (!list) return;
    let dragSrc = null;
    list.querySelectorAll('.mat-row').forEach(row => {
      row.addEventListener('dragstart', e => { dragSrc = row; row.style.opacity = '0.4'; e.dataTransfer.effectAllowed = 'move'; });
      row.addEventListener('dragend', () => { row.style.opacity = ''; list.querySelectorAll('.mat-row').forEach(r => r.classList.remove('mat-drag-over')); });
      row.addEventListener('dragover', e => { e.preventDefault(); if (row !== dragSrc) row.classList.add('mat-drag-over'); });
      row.addEventListener('dragleave', () => row.classList.remove('mat-drag-over'));
      row.addEventListener('drop', e => {
        e.preventDefault();
        row.classList.remove('mat-drag-over');
        if (!dragSrc || dragSrc === row) return;
        const mats = getMats(nivel);
        const fromIdx = parseInt(dragSrc.dataset.idx);
        const toIdx   = parseInt(row.dataset.idx);
        mats.splice(toIdx, 0, mats.splice(fromIdx, 1)[0]);
        _materiasCustom[nivel] = mats;
        saveMateriaCustom();
        document.getElementById('matEditorArea').innerHTML = buildEditor(nivel);
        window._initMatDrag(nivel);
      });
    });
  };

  window._matMove = function(nivel, idx, dir) {
    const mats = getMats(nivel);
    const ni = idx + dir;
    if (ni < 0 || ni >= mats.length) return;
    [mats[idx], mats[ni]] = [mats[ni], mats[idx]];
    _materiasCustom[nivel] = mats;
    saveMateriaCustom();
    document.getElementById('matEditorArea').innerHTML = buildEditor(nivel);
    window._initMatDrag(nivel);
    // refresh level tab badge
    const tab = document.getElementById(`matLevelTab-${nivel.replace(/[^a-zA-Z0-9]/g,'_')}`);
    if (tab) tab.innerHTML = `${nivel} <span style="color:var(--yellow);font-size:10px">⚙</span>`;
  };

  window._matDel = async function(nivel, idx) {
    const mats = getMats(nivel);
    // Quitarla del catálogo no borra datos: si alguien la usa, se avisa antes de lo que pasará.
    const uso = _tUsoMateriaCatalogo(nivel, mats[idx]);
    if (uso.profes || uso.alumnos) {
      const ok = await confirmar(`«${mats[idx]}» la usan ${_tUsoTexto(uso)} en ${uso.texto}.\n\nSi la quitas de ⚙ Materias no se borra ningún dato: el alumnado la conserva («Fuera del catálogo» en las suspensas, y en el acta si tiene nota) y el profesor/a sale en amarillo en el equipo docente para elegirle otra.`, { titulo: '¿Quitar la materia del catálogo?', ok: 'Quitar de ⚙ Materias', peligro: true });
      if (!ok) return;
    }
    mats.splice(idx, 1);
    _materiasCustom[nivel] = mats;
    saveMateriaCustom();
    document.getElementById('matEditorArea').innerHTML = buildEditor(nivel);
    window._initMatDrag(nivel);
  };

  window._matAdd = function(nivel) {
    const inputId = `matAddInput-${nivel.replace(/[^a-zA-Z0-9]/g,'_')}`;
    const inp = document.getElementById(inputId);
    const val = (inp?.value || '').trim();
    if (!val) { showToast('⚠ Escribe el nombre de la materia'); return; }
    const mats = getMats(nivel);
    if (mats.includes(val)) { showToast('⚠ Esa materia ya existe'); return; }
    mats.push(val);
    _materiasCustom[nivel] = mats;
    saveMateriaCustom();
    document.getElementById('matEditorArea').innerHTML = buildEditor(nivel);
    window._initMatDrag(nivel);
    showToast(`✅ "${val}" añadida a ${nivel}`);
    const tab = document.getElementById(`matLevelTab-${nivel.replace(/[^a-zA-Z0-9]/g,'_')}`);
    if (tab) tab.innerHTML = `${nivel} <span style="color:var(--yellow);font-size:10px">⚙</span>`;
  };

  window._matDuplFromDefault = function(nivel) {
    _materiasCustom[nivel] = [...(MATERIAS_POR_NIVEL[nivel] || [])];
    saveMateriaCustom();
    document.getElementById('matEditorArea').innerHTML = buildEditor(nivel);
    window._initMatDrag(nivel);
    showToast(`📋 Plantilla copiada para ${nivel} — ya puedes editarla`);
  };

  // ── Rename inline ──
  window._matStartRename = function(nivel, idx, spanEl) {
    if (!spanEl) return;
    const current = spanEl.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = current;
    input.className = 'mat-add-input';
    input.style.cssText = 'flex:1;margin:0;padding:3px 8px;font-size:12px;';
    spanEl.replaceWith(input);
    input.focus();
    input.select();
    let hecho = false;
    async function commit() {
      if (hecho) return; hecho = true;
      const val = input.value.trim();
      if (val && val !== current) {
        const mats = getMats(nivel);
        if (mats.some((m, i) => i !== idx && _tNorm(m) === _tNorm(val))) showToast('⚠ Esa materia ya está en la lista');
        else {
          // El nombre nuevo pasa también al equipo docente y al alumnado de los grupos que usan esta lista:
          // si no, se quedarían con el antiguo y dejarían de casar con el catálogo.
          const uso = _tUsoMateriaCatalogo(nivel, current);
          let datos = !!(uso.profes || uso.alumnos);
          const prueba = datos ? _tRenombrarEnGruposDelCatalogo(nivel, current, val, true) : { choque: [] };
          if (prueba.choque.length) {
            const r = prueba;
            const seguir = await confirmar(`Hay alumnado con datos de «${current}» y también de «${val}» (${r.choque.slice(0, 3).join('; ')}${r.choque.length > 3 ? '…' : ''}): no se pueden juntar sin perder unos u otros.\n\n¿Cambiar el nombre solo en ⚙ Materias? El equipo docente y el alumnado se quedan con «${current}» (saldrán como «fuera del catálogo»).`, { ok: 'Cambiar solo en ⚙ Materias', peligro: false });
            if (!seguir) { document.getElementById('matEditorArea').innerHTML = buildEditor(nivel); window._initMatDrag(nivel); return; }
            datos = false;
          }
          mats[idx] = val;
          _materiasCustom[nivel] = mats;
          saveMateriaCustom();
          const r = datos ? _tRenombrarEnGruposDelCatalogo(nivel, current, val) : null;
          showToast(r && (r.profes || r.alumnos) ? `✅ «${current}» → «${val}», también en ${_tUsoTexto(r)} (${uso.texto})` : '✅ Materia renombrada');
        }
      }
      document.getElementById('matEditorArea').innerHTML = buildEditor(nivel);
      window._initMatDrag(nivel);
    }
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = current; input.blur(); }
    });
  };

  // ── Export template as JSON ──
  window._matExport = function(nivel) {
    const mats = getMats(nivel);
    const payload = JSON.stringify({ nivel, materias: mats }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `materias_${nivel.replace(/[^a-zA-Z0-9]/g,'_')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(`⬇ Plantilla de ${nivel} exportada`);
  };

  // ── Import template from JSON ──
  window._matImportClick = function(nivel) {
    const idSafe = nivel.replace(/[^a-zA-Z0-9]/g,'_');
    document.getElementById(`matImportFile-${idSafe}`)?.click();
  };
  window._matImportFile = function(nivel, input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const parsed = JSON.parse(e.target.result);
        const mats = Array.isArray(parsed) ? parsed
          : Array.isArray(parsed.materias) ? parsed.materias : null;
        if (!mats || !mats.length) { showToast('⚠ Formato no reconocido'); return; }
        if (!await confirmar(`¿Reemplazar las materias de ${nivel} con las ${mats.length} del archivo?`)) return;
        _materiasCustom[nivel] = mats.map(m => String(m).trim()).filter(Boolean);
        saveMateriaCustom();
        document.getElementById('matEditorArea').innerHTML = buildEditor(nivel);
        window._initMatDrag(nivel);
        showToast(`✅ ${mats.length} materias importadas para ${nivel}`);
      } catch(err) { showToast('⚠ Error al leer el archivo JSON'); }
      input.value = '';
    };
    reader.readAsText(file);
  };

  // Init drag on first render
  window._initMatDrag(currentEditLevel);
}

function buildPropuestaPills(p) {
  if (!p || (!p.tipo && !p.destino)) return '<span class="propuesta-placeholder">—</span>';
  let html = '';
  if (p.tipo) {
    const t = PROPUESTA_TIPOS.find(t => t.key === p.tipo);
    const cls = t ? t.cls : 'promo';
    html += `<span class="propuesta-pill-tipo ${cls}">${p.tipo}</span>`;
  }
  if (p.destino) html += `<span class="propuesta-pill-destino">${_tEsc(p.destino)}</span>`;
  return html || '<span class="propuesta-placeholder">—</span>';
}

let _activePropuestaPanel = null;

function closePropuestaPanel() {
  if (_activePropuestaPanel) {
    _activePropuestaPanel.panel.remove();
    if (_activePropuestaPanel.display) _activePropuestaPanel.display.classList.remove('open');
    _activePropuestaPanel = null;
  }
}

document.addEventListener('click', function(e) {
  if (_activePropuestaPanel &&
      !_activePropuestaPanel.panel.contains(e.target) &&
      !e.target.closest('.propuesta-display')) {
    closePropuestaPanel();
  }
});

function openPropuesta(e, nivel, grupo, idx, field) {
  e.stopPropagation();
  closePropuestaPanel();

  const display = e.currentTarget;
  display.classList.add('open');
  const rect = display.getBoundingClientRect();
  const alumno = data[nivel][grupo][idx];
  const current = (alumno[field] && typeof alumno[field] === 'object')
    ? { ...alumno[field] }
    : { tipo: '', destino: '' };

  const panel = document.createElement('div');
  panel.className = 'propuesta-panel open';

  const spaceBelow = window.innerHeight - rect.bottom;
  const panelW = 300;
  const panelH = 360;
  // Use fixed positioning so panel stays in viewport regardless of scroll
  panel.style.position = 'fixed';
  const topPos = (spaceBelow > panelH || spaceBelow > rect.top)
    ? rect.bottom + 4
    : rect.top - panelH - 4;
  const leftPos = Math.max(8, Math.min(rect.left, window.innerWidth - panelW - 8));
  panel.style.top = topPos + 'px';
  panel.style.left = leftPos + 'px';

  function save() {
    alumno[field] = { ...current };
    // Update cell display — find row by data-idx (works even when table is filtered/sorted)
    const key = `${nivel}-${grupo}`;
    const tbl = document.getElementById(`tbl-${key}`);
    if (tbl) {
      const row = tbl.querySelector(`tbody tr[data-idx="${idx}"]`);
      if (row) {
        const targetDisplay = row.querySelector(`.propuesta-display[data-field="${field}"]`);
        if (targetDisplay) targetDisplay.innerHTML = buildPropuestaPills(current);
      }
    }
    // Refresh stats and charts
    updateStats(nivel, grupo);
    updateStats2(nivel, grupo);
    updateCharts(nivel, grupo);
    // Refresh grupo tab progress bar
    if (field === 'promociona') updateTabProgress(nivel, grupo);
    markDirty();
  }

  function renderPanel() {
    panel.innerHTML = `
      <div class="propuesta-panel-title">${field==='promociona' ? 'Decisión final de evaluación' : 'Propuesta de evaluación'}</div>

      <div class="propuesta-section-label">Decisión</div>
      <div class="propuesta-chips">
        ${PROPUESTA_TIPOS.map(t => `
          <span class="propuesta-chip ${current.tipo===t.key ? 'selected-'+t.cls : ''}"
            onclick="selectPropuestaTipo(event,'${t.key}','${t.cls}')">
            ${t.label}
          </span>`).join('')}
        <span class="propuesta-chip ${!current.tipo ? 'selected-destino' : ''}"
          onclick="selectPropuestaTipo(event,'','')">
          Borrar
        </span>
      </div>

      <div class="propuesta-section-label">Destino</div>
      <div class="propuesta-chips">
        ${PROPUESTA_DESTINOS.map(d => `
          <span class="propuesta-chip ${current.destino===d ? 'selected-destino' : ''}"
            onclick="selectPropuestaDestino(event,'${d}')">
            ${d}
          </span>`).join('')}
        <span class="propuesta-chip ${!current.destino ? 'selected-destino' : ''}"
          onclick="selectPropuestaDestino(event,'')">
          Borrar
        </span>
      </div>

      <div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:6px;">
        <button class="btn btn-primary btn-sm" onclick="closePropuestaPanel()">Hecho</button>
      </div>
    `;
  }

  // Expose current obj so chip handlers can mutate it
  panel._current = current;
  panel._save = save;
  panel._render = renderPanel;

  renderPanel();
  document.body.appendChild(panel);
  _activePropuestaPanel = { panel, display };
}

function selectPropuestaTipo(e, tipo, cls) {
  e.stopPropagation();
  if (!_activePropuestaPanel) return;
  const p = _activePropuestaPanel.panel;
  p._current.tipo = tipo;
  p._save();
  // Update chips UI
  p.querySelectorAll('.propuesta-chips:nth-of-type(1) .propuesta-chip').forEach(ch => {
    ch.className = 'propuesta-chip';
  });
  if (tipo) {
    e.target.classList.add('selected-' + cls);
  } else {
    e.target.classList.add('selected-destino');
  }
}

function selectPropuestaDestino(e, destino) {
  e.stopPropagation();
  if (!_activePropuestaPanel) return;
  const p = _activePropuestaPanel.panel;
  p._current.destino = destino;
  p._save();
  // Update chips UI
  p.querySelectorAll('.propuesta-chips').forEach((grp, gi) => {
    if (gi === 1) {
      grp.querySelectorAll('.propuesta-chip').forEach(ch => ch.className = 'propuesta-chip');
      e.target.classList.add('selected-destino');
    }
  });
}

// ===================== COLUMN RESIZE =====================
let _resizeState = null;

function startResize(e, nivel, grupo, colIdx) {
  e.preventDefault();
  e.stopPropagation();
  const key = `${nivel}-${grupo}`;
  const evalTab = (window._evalTab && window._evalTab[key]) || 'eval1';
  const colKey = key + '_' + evalTab;
  if (!window.colWidths[colKey]) window.colWidths[colKey] = window.colWidths[key] || [];
  const startX = e.clientX;
  const startW = window.colWidths[colKey][colIdx];
  const resizer = e.target;
  resizer.classList.add('dragging');

  // Overlay to capture mouse events globally
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;cursor:col-resize;z-index:9999;';
  document.body.appendChild(overlay);

  function onMove(ev) {
    const diff = ev.clientX - startX;
    const newW = Math.max(40, startW + diff);
    window.colWidths[colKey][colIdx] = newW;

    // Update colgroup col width live
    const tbl = document.getElementById(`tbl-${key}`);
    if (tbl) {
      const col = tbl.querySelector(`col[data-col="${colIdx}"]`);
      if (col) col.style.width = newW + 'px';
      // Update total table width
      const total = window.colWidths[colKey].reduce((a,b)=>a+b,0);
      tbl.style.width = total + 'px';
      // Update th width too
      const th = tbl.querySelectorAll('thead th:not(.cb-col)')[colIdx];
      if (th) { th.style.width = newW+'px'; th.style.minWidth = newW+'px'; }
    }
    // Keep sticky nombre offset in sync when resizing cols before it
    if (colIdx < 3) updateStickyOffset(nivel, grupo);
  }

  function onUp() {
    resizer.classList.remove('dragging');
    document.body.removeChild(overlay);
    overlay.removeEventListener('mousemove', onMove);
    overlay.removeEventListener('mouseup', onUp);
  }

  overlay.addEventListener('mousemove', onMove);
  overlay.addEventListener('mouseup', onUp);
}
