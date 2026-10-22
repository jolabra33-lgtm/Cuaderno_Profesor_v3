/* ============================================================================
   Gestor de Tutoría · Gestión de grupos y niveles, unidades vacantes
   tutoria/js/08-grupos-niveles-vacantes.js
   ============================================================================ */

// ===================== GESTIÓN DE GRUPOS =====================

function openAddGrupoModal(nivel) {
  document.getElementById('addGrupoNivel').value = nivel;
  document.getElementById('addGrupoNivelDisplay').textContent = nivel;
  document.getElementById('addGrupoLetra').value = '';
  document.getElementById('addGrupoError').style.display = 'none';
  document.getElementById('addGrupoOverlay').classList.add('open');
  setTimeout(() => document.getElementById('addGrupoLetra').focus(), 100);
}

function closeAddGrupoModal() {
  document.getElementById('addGrupoOverlay').classList.remove('open');
}

function confirmAddGrupo() {
  const nivel = document.getElementById('addGrupoNivel').value;
  const letra = document.getElementById('addGrupoLetra').value.trim();
  const errEl = document.getElementById('addGrupoError');

  if (!letra) {
    errEl.textContent = 'Introduce una letra o nombre para el grupo.';
    errEl.style.display = 'block';
    return;
  }
  if (GRUPOS_POR_NIVEL[nivel].includes(letra)) {
    errEl.textContent = `El grupo ${letra} ya existe en ${nivel}.`;
    errEl.style.display = 'block';
    return;
  }

  // Add to data structures
  GRUPOS_POR_NIVEL[nivel].push(letra);
  data[nivel][letra] = [];
  tutores[`${nivel}-${letra}`] = '';
  currentGrupos[nivel] = letra;

  closeAddGrupoModal();
  renderAll();
  markDirty();
  showToast(`✓ Grupo ${nivel} ${letra} creado`);
}

let _pendingRenameGrupo = null; // { nivel, grupo }

function openRenameGrupoModal(nivel, grupo) {
  _pendingRenameGrupo = { nivel, grupo };
  const inp = document.getElementById('renameGrupoNombre');
  if (inp) inp.value = grupo;
  const err = document.getElementById('renameGrupoError');
  if (err) err.style.display = 'none';
  document.getElementById('renameGrupoOverlay').classList.add('open');
  setTimeout(() => { if (inp) { inp.focus(); inp.select(); } }, 100);
}

function closeRenameGrupoModal() {
  document.getElementById('renameGrupoOverlay').classList.remove('open');
  _pendingRenameGrupo = null;
}

function confirmRenameGrupo() {
  if (!_pendingRenameGrupo) return;
  const { nivel, grupo: grupoViejo } = _pendingRenameGrupo;
  const grupoNuevo = (document.getElementById('renameGrupoNombre').value || '').trim();
  const errEl = document.getElementById('renameGrupoError');
  const showErr = (msg) => { errEl.textContent = msg; errEl.style.display = 'block'; };

  if (!grupoNuevo) { showErr('Introduce un nombre para el grupo.'); return; }
  if (grupoNuevo === grupoViejo) { closeRenameGrupoModal(); return; }
  if (GRUPOS_POR_NIVEL[nivel].includes(grupoNuevo)) {
    showErr(`Ya existe un grupo "${grupoNuevo}" en ${nivel}.`);
    return;
  }

  // Update GRUPOS_POR_NIVEL preserving order
  const idx = GRUPOS_POR_NIVEL[nivel].indexOf(grupoViejo);
  GRUPOS_POR_NIVEL[nivel].splice(idx, 1, grupoNuevo);

  // Move data
  data[nivel][grupoNuevo] = data[nivel][grupoViejo];
  delete data[nivel][grupoViejo];

  // Move tutor
  const tutorKey = `${nivel}-${grupoViejo}`;
  const newTutorKey = `${nivel}-${grupoNuevo}`;
  tutores[newTutorKey] = tutores[tutorKey] || '';
  delete tutores[tutorKey];

  // Move evalDates if per-group (they're per-nivel so nothing to do)

  // Move colState if present (una entrada por cada pestaña de evaluación, más
  // la entrada compartida de las columnas comunes a las tres evaluaciones)
  ['eval1', 'eval2', 'eval3', 'shared'].forEach(ev => {
    const oldKey = `${nivel}-${grupoViejo}_${ev}`;
    const newKey = `${nivel}-${grupoNuevo}_${ev}`;
    if (_colState[oldKey]) {
      _colState[newKey] = _colState[oldKey];
      delete _colState[oldKey];
    }
  });

  // Update currentGrupos
  if (currentGrupos[nivel] === grupoViejo) currentGrupos[nivel] = grupoNuevo;

  closeRenameGrupoModal();
  renderAll();
  markDirty();
  showToast(`✓ Grupo renombrado a "${nivel} ${grupoNuevo}"`);
}

async function confirmDeleteGrupo(nivel, grupo) {
  const alumnos = data[nivel][grupo].length;
  const msg = alumnos > 0
    ? `¿Eliminar el grupo ${nivel} ${grupo}? Contiene ${alumnos} alumno${alumnos!==1?'s':''} y se perderán todos sus datos.`
    : `¿Eliminar el grupo ${nivel} ${grupo}?`;

  if (!await confirmar(msg)) return;

  // Remove from structures
  GRUPOS_POR_NIVEL[nivel] = GRUPOS_POR_NIVEL[nivel].filter(g => g !== grupo);
  delete data[nivel][grupo];
  delete tutores[`${nivel}-${grupo}`];

  // Switch to first available grupo
  currentGrupos[nivel] = GRUPOS_POR_NIVEL[nivel][0];

  // Clean up colWidths cache
  if (window.colWidths) delete window.colWidths[`${nivel}-${grupo}`];

  // Limpiar el resto de estructuras indexadas por "nivel-grupo": estado de
  // columnas, actas guardadas, observaciones, asistencia, fotos y horario.
  const gk = `${nivel}-${grupo}`;
  ['eval1', 'eval2', 'eval3', 'shared'].forEach(ev => { delete _colState[`${gk}_${ev}`]; });
  [1, 2, 3].forEach(evalNum => { if (window._actasData) delete window._actasData[`${gk}-eval${evalNum}`]; });
  [1, 2, 3].forEach(evalNum => { if (window._actasOficialesData) delete window._actasOficialesData[`${gk}-eval${evalNum}`]; });
  if (window._obsGrupoData) delete window._obsGrupoData[gk];
  if (window._asistenciaData) delete window._asistenciaData[gk];
  if (window._fotoData) delete window._fotoData[gk];
  if (window._horarioData) delete window._horarioData[gk];
  saveColState();

  renderAll();
  markDirty();
  showToast(`Grupo ${nivel} ${grupo} eliminado`);
}

// ===================== GESTIÓN DE NIVELES =====================

let _pendingDeleteNivel = null;

function openAddNivelModal() {
  const inp = document.getElementById('addNivelNombre');
  const grp = document.getElementById('addNivelGrupo');
  if (inp) inp.value = '';
  if (grp) grp.value = 'A';
  const err = document.getElementById('addNivelError');
  if (err) err.style.display = 'none';
  document.getElementById('addNivelOverlay').classList.add('open');
  setTimeout(() => inp && inp.focus(), 100);
}

function closeAddNivelModal() {
  document.getElementById('addNivelOverlay').classList.remove('open');
}

function confirmAddNivel() {
  const nombre = (document.getElementById('addNivelNombre').value || '').trim();
  let grupo = (document.getElementById('addNivelGrupo').value || '').trim();
  const errEl = document.getElementById('addNivelError');
  const showErr = (msg) => { errEl.textContent = msg; errEl.style.display = 'block'; };

  if (!nombre) { showErr('Introduce un nombre para el nivel.'); return; }
  if (NIVELES.includes(nombre)) { showErr(`El nivel "${nombre}" ya existe.`); return; }
  if (['__home__','__materias__','__calendario__','__convivencia__','__informe__','__vacantes__'].includes(nombre)) {
    showErr('Ese nombre está reservado. Elige otro.'); return;
  }
  if (!grupo) grupo = 'A';

  // Crear estructuras de datos para el nuevo nivel
  NIVELES.push(nombre);
  GRUPOS_POR_NIVEL[nombre] = [grupo];
  data[nombre] = { [grupo]: [] };
  currentGrupos[nombre] = grupo;
  tutores[`${nombre}-${grupo}`] = '';
  if (typeof evalDates !== 'undefined') {
    const _t = (typeof _today !== 'undefined') ? _today : new Date().toISOString().slice(0,10);
    evalDates[nombre] = { eval1: _t, eval2: _t, eval3: _t };
  }

  closeAddNivelModal();
  currentNivel = nombre;
  renderAll();
  markDirty();
  showToast(`✓ Nivel "${nombre}" creado`);
}

// ===================== RENOMBRAR NIVEL =====================
// A diferencia de crear/eliminar, renombrar un nivel exige migrar TODAS las
// estructuras que usan su nombre como clave — tanto las indexadas solo por
// nivel (data, GRUPOS_POR_NIVEL, evalDates, currentGrupos) como las indexadas
// por "nivel-grupo" para cada uno de sus grupos (tutores, _colState, actas,
// observaciones de grupo, asistencia, fotos, horario).
let _pendingRenameNivel = null;

function openRenameNivelModal(nivel) {
  _pendingRenameNivel = nivel;
  const inp = document.getElementById('renameNivelNombre');
  if (inp) inp.value = nivel;
  const err = document.getElementById('renameNivelError');
  if (err) err.style.display = 'none';
  document.getElementById('renameNivelOverlay').classList.add('open');
  setTimeout(() => { if (inp) { inp.focus(); inp.select(); } }, 100);
}

function closeRenameNivelModal() {
  document.getElementById('renameNivelOverlay').classList.remove('open');
  _pendingRenameNivel = null;
}

function confirmRenameNivel() {
  const nivelViejo = _pendingRenameNivel;
  if (!nivelViejo) return;
  const nivelNuevo = (document.getElementById('renameNivelNombre').value || '').trim();
  const errEl = document.getElementById('renameNivelError');
  const showErr = (msg) => { errEl.textContent = msg; errEl.style.display = 'block'; };

  if (!nivelNuevo) { showErr('Introduce un nombre para el nivel.'); return; }
  if (nivelNuevo === nivelViejo) { closeRenameNivelModal(); return; }
  if (NIVELES.includes(nivelNuevo)) { showErr(`Ya existe un nivel llamado "${nivelNuevo}".`); return; }
  if (['__home__','__materias__','__calendario__','__convivencia__','__informe__','__vacantes__'].includes(nivelNuevo)) {
    showErr('Ese nombre está reservado. Elige otro.'); return;
  }

  const grupos = GRUPOS_POR_NIVEL[nivelViejo] || [];
  // Si cambia el tipo de curso (ESO <-> Bachillerato), las columnas de la
  // tabla cambian de cantidad y orden (aparecen/desaparecen Eval. Extr./Pend.
  // Extr. en eval3), así que el estado de columnas ocultas/eliminadas
  // guardado por posición numérica ya no sería fiable tras migrarlo: en vez
  // de arrastrar una visibilidad potencialmente desalineada, se reinicia
  // (todas las columnas visibles de nuevo) para ese nivel.
  const cambioTipoCurso = isBach(nivelViejo) !== isBach(nivelNuevo);

  // NIVELES: sustituir en el mismo índice para conservar el orden (importante
  // para "Pend. Ant.", que depende del orden académico/posición de pestañas)
  const idx = NIVELES.indexOf(nivelViejo);
  if (idx >= 0) NIVELES.splice(idx, 1, nivelNuevo);

  // Estructuras indexadas solo por nivel
  GRUPOS_POR_NIVEL[nivelNuevo] = GRUPOS_POR_NIVEL[nivelViejo];
  delete GRUPOS_POR_NIVEL[nivelViejo];
  data[nivelNuevo] = data[nivelViejo];
  delete data[nivelViejo];
  if (typeof evalDates !== 'undefined' && evalDates[nivelViejo]) {
    evalDates[nivelNuevo] = evalDates[nivelViejo];
    delete evalDates[nivelViejo];
  }
  if (currentGrupos[nivelViejo] !== undefined) {
    currentGrupos[nivelNuevo] = currentGrupos[nivelViejo];
    delete currentGrupos[nivelViejo];
  }

  // Estructuras indexadas por "nivel-grupo" (una migración por cada grupo del nivel)
  grupos.forEach(g => {
    const oldGK = `${nivelViejo}-${g}`;
    const newGK = `${nivelNuevo}-${g}`;

    if (tutores[oldGK] !== undefined) { tutores[newGK] = tutores[oldGK]; delete tutores[oldGK]; }

    ['eval1', 'eval2', 'eval3', 'shared'].forEach(ev => {
      const oldCK = `${oldGK}_${ev}`;
      const newCK = `${newGK}_${ev}`;
      if (cambioTipoCurso) {
        // Descartar: las columnas de eval3 cambian de cantidad/orden entre
        // ESO y Bachillerato, así que el índice guardado ya no es de fiar.
        delete _colState[oldCK];
      } else if (_colState[oldCK]) {
        _colState[newCK] = _colState[oldCK];
        delete _colState[oldCK];
      }
    });

    [1, 2, 3].forEach(evalNum => {
      const oldAK = `${oldGK}-eval${evalNum}`;
      const newAK = `${newGK}-eval${evalNum}`;
      if (window._actasData && window._actasData[oldAK]) {
        window._actasData[newAK] = window._actasData[oldAK];
        delete window._actasData[oldAK];
      }
      if (window._actasOficialesData && window._actasOficialesData[oldAK]) {
        window._actasOficialesData[newAK] = window._actasOficialesData[oldAK];
        delete window._actasOficialesData[oldAK];
      }
    });

    if (window._obsGrupoData && window._obsGrupoData[oldGK] !== undefined) {
      window._obsGrupoData[newGK] = window._obsGrupoData[oldGK];
      delete window._obsGrupoData[oldGK];
    }
    if (window._asistenciaData && window._asistenciaData[oldGK]) {
      window._asistenciaData[newGK] = window._asistenciaData[oldGK];
      delete window._asistenciaData[oldGK];
    }
    if (window._fotoData && window._fotoData[oldGK]) {
      window._fotoData[newGK] = window._fotoData[oldGK];
      delete window._fotoData[oldGK];
    }
    if (window._horarioData && window._horarioData[oldGK]) {
      window._horarioData[newGK] = window._horarioData[oldGK];
      delete window._horarioData[oldGK];
    }
  });

  saveColState();
  closeRenameNivelModal();
  if (currentNivel === nivelViejo) currentNivel = nivelNuevo;
  renderAll();
  markDirty();
  showToast(cambioTipoCurso
    ? `✓ Nivel renombrado a "${nivelNuevo}" — al cambiar entre ESO y Bachillerato, las columnas ocultas se han restaurado a la vista por defecto`
    : `✓ Nivel renombrado a "${nivelNuevo}"`);
}

function openDeleteNivelModal(nivel) {
  _pendingDeleteNivel = nivel;
  document.getElementById('deleteNivelName').textContent = nivel;
  document.getElementById('deleteNivelOverlay').classList.add('open');
}

function closeDeleteNivelModal() {
  _pendingDeleteNivel = null;
  document.getElementById('deleteNivelOverlay').classList.remove('open');
}

function executeDeleteNivel() {
  const nivel = _pendingDeleteNivel;
  if (!nivel) return;

  const grupos = GRUPOS_POR_NIVEL[nivel] || [];

  // Remove from NIVELES array
  const idx = NIVELES.indexOf(nivel);
  if (idx > -1) NIVELES.splice(idx, 1);

  // Clean up data structures indexadas solo por nivel
  delete GRUPOS_POR_NIVEL[nivel];
  delete data[nivel];
  delete currentGrupos[nivel];
  if (typeof evalDates !== 'undefined') delete evalDates[nivel];

  // Clean colWidths cache (claves nivel-grupo, y nivel-grupo_evalN)
  if (window.colWidths) {
    Object.keys(window.colWidths).forEach(k => {
      if (k.startsWith(nivel + '-')) delete window.colWidths[k];
    });
  }

  // Limpiar el resto de estructuras indexadas por "nivel-grupo" para cada
  // grupo del nivel eliminado: tutores, estado de columnas, actas guardadas,
  // observaciones de grupo, asistencia, fotos y horario. Si no se limpian
  // aquí, quedan huérfanas para siempre en el guardado local.
  grupos.forEach(g => {
    const gk = `${nivel}-${g}`;
    delete tutores[gk];
    ['eval1', 'eval2', 'eval3', 'shared'].forEach(ev => { delete _colState[`${gk}_${ev}`]; });
    [1, 2, 3].forEach(evalNum => { if (window._actasData) delete window._actasData[`${gk}-eval${evalNum}`]; });
    [1, 2, 3].forEach(evalNum => { if (window._actasOficialesData) delete window._actasOficialesData[`${gk}-eval${evalNum}`]; });
    if (window._obsGrupoData) delete window._obsGrupoData[gk];
    if (window._asistenciaData) delete window._asistenciaData[gk];
    if (window._fotoData) delete window._fotoData[gk];
    if (window._horarioData) delete window._horarioData[gk];
  });
  saveColState();

  closeDeleteNivelModal();

  // Navigate home if we were on the deleted nivel
  if (currentNivel === nivel) currentNivel = '__home__';

  renderAll();
  markDirty();
  showToast(`🗑 Nivel ${nivel} eliminado`);
}

function exportJSON() {
  // Reutiliza exactamente el mismo "instantáneo" que usan el autoguardado
  // y el archivo de "Guardar como" (buildState), así la copia de seguridad
  // manual contiene SIEMPRE todo lo necesario para reconstruir el centro
  // en otro dispositivo: alumnos, grupos, tutores, fechas de evaluación,
  // calendario, planos de aula, observaciones de grupo, convivencia,
  // asistencia/equipo docente, materias personalizadas, configuración de
  // vacantes, actas (oficiales y no oficiales), fotos y horarios.
  const payload = buildState(true, true);

  // Metadatos propios de esta exportación manual (no confundir con el
  // "savedAt" interno del autoguardado).
  payload.exportVersion = 2;                 // v2 = exportación completa (ver executeJsonImport)
  payload.exportedAt = new Date().toISOString();

  // Preferencias de interfaz: se incluyen para que, al importar en modo
  // "Sobrescribir todo" en otro dispositivo, la app quede visualmente
  // igual (columnas visibles, tema claro/oscuro).
  payload.colState = _colState || {};
  payload.theme = document.documentElement.classList.contains('light') ? 'light' : 'dark';

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const d = new Date();
  triggerDownload(blob, `evaluaciones_ies_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.json`);
  showToast('✓ Copia de seguridad completa exportada (JSON)');
}

// Holds parsed JSON pending user choice
let _pendingJson = null;

function importJSON(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = ''; // reset so same file can be re-imported
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.data || !parsed.GRUPOS_POR_NIVEL) {
        showToast('⚠ Archivo JSON no válido', 'error'); return;
      }
      _pendingJson = parsed;
      // Show info in modal
      let totalAl = 0;
      Object.values(parsed.data).forEach(nv => Object.values(nv).forEach(gr => totalAl += (gr||[]).length));
      const niveles = Object.keys(parsed.data).join(', ');
      const totalGrupos = Object.values(parsed.GRUPOS_POR_NIVEL || {}).reduce((s, gs) => s + (gs||[]).length, 0);
      const fechaExport = parsed.exportedAt || parsed.savedAt;
      const esCompleto = (parsed.exportVersion || 0) >= 2;

      // Piezas de datos "extra" que trae el archivo, para que quede claro
      // qué se va a importar además de los alumnos.
      const extras = [];
      if (parsed.calEventos && parsed.calEventos.length) extras.push(`${parsed.calEventos.length} eventos de calendario`);
      const nActas = Object.keys(parsed.actasData || {}).length + Object.keys(parsed.actasOficialesData || {}).length;
      if (nActas) extras.push(`${nActas} actas`);
      const nObs = Object.keys(parsed.obsGrupoData || {}).length;
      if (nObs) extras.push(`observaciones de ${nObs} grupo(s)`);
      const nPlanos = Object.keys(parsed.planosGrupo || {}).length;
      if (nPlanos) extras.push(`${nPlanos} plano(s) de aula`);
      const nFotos = Object.keys(parsed.fotoData || {}).length;
      if (nFotos) extras.push(`${nFotos} foto(s)`);
      const nHorarios = Object.keys(parsed.horarioData || {}).length;
      if (nHorarios) extras.push(`${nHorarios} horario(s)`);
      if (parsed.materiasCustom && Object.keys(parsed.materiasCustom).length) extras.push('materias personalizadas');
      if (parsed.vacantesCfg) extras.push('configuración de vacantes');

      document.getElementById('jsonImportInfo').innerHTML =
        `<strong>Archivo:</strong> ${file.name}<br>` +
        `<strong>Exportado el:</strong> ${fechaExport ? new Date(fechaExport).toLocaleString('es-ES') : '—'}<br>` +
        `<strong>Centro:</strong> ${parsed.iesName ? parsed.iesName : '—'}<br>` +
        `<strong>Niveles:</strong> ${niveles || '—'}<br>` +
        `<strong>Grupos:</strong> ${totalGrupos}<br>` +
        `<strong>Total alumnos:</strong> ${totalAl}` +
        (extras.length ? `<br><strong>Incluye además:</strong> ${extras.join(', ')}` : '') +
        (!esCompleto ? `<br><span style="color:var(--yellow)">⚠ Copia de seguridad de un formato anterior (sin calendario, actas, planos de aula, etc.)</span>` : '');
      // Highlight selected radio on click
      document.querySelectorAll('#jsonImportOverlay input[type=radio]').forEach(r => {
        r.onchange = () => {
          document.getElementById('jsonOptOverwrite').style.borderColor = r.value==='overwrite' ? 'var(--accent)' : 'var(--border)';
          document.getElementById('jsonOptMerge').style.borderColor = r.value==='merge' ? 'var(--accent)' : 'var(--border)';
        };
      });
      document.getElementById('jsonImportOverlay').classList.add('open');
    } catch(err) {
      showToast('⚠ Error al leer el archivo JSON', 'error');
    }
  };
  reader.readAsText(file);
}

function closeJsonImportModal() {
  _pendingJson = null;
  document.getElementById('jsonImportOverlay').classList.remove('open');
}

// Sincroniza un "diccionario" (objeto plano clave→valor) del archivo importado
// contra el estado en vivo de la app. En modo "overwrite" reemplaza el
// contenido entero; en modo "merge" solo añade las claves que aún no existen
// (no pisa nada de lo que ya había en este dispositivo).
function _jsonSyncDict(target, src, mode) {
  if (!src) return target;
  if (!target) target = {};
  if (mode === 'overwrite') {
    Object.keys(target).forEach(k => delete target[k]);
    Object.assign(target, src);
  } else {
    Object.keys(src).forEach(k => { if (!(k in target)) target[k] = src[k]; });
  }
  return target;
}

function executeJsonImport() {
  if (!_pendingJson) return;
  const mode = document.querySelector('#jsonImportOverlay input[name=jsonMode]:checked').value;
  const src = _pendingJson;

  if (mode === 'overwrite') {
    // Full replace — sync NIVELES to match new file
    // Si el archivo trae el orden explícito de niveles (NIVELES), se respeta
    // tal cual; si no (backups antiguos), se deduce del orden de GRUPOS_POR_NIVEL.
    const newNiveles = Array.isArray(src.NIVELES) ? src.NIVELES.slice() : Object.keys(src.GRUPOS_POR_NIVEL);
    NIVELES.length = 0;
    newNiveles.forEach(n => NIVELES.push(n));
    // Replace GRUPOS_POR_NIVEL
    Object.keys(GRUPOS_POR_NIVEL).forEach(k => delete GRUPOS_POR_NIVEL[k]);
    Object.assign(GRUPOS_POR_NIVEL, src.GRUPOS_POR_NIVEL);
    // Replace data
    Object.keys(data).forEach(k => delete data[k]);
    Object.keys(src.data).forEach(nivel => {
      data[nivel] = {};
      Object.keys(src.data[nivel]).forEach(grupo => { data[nivel][grupo] = src.data[nivel][grupo]; });
    });
    Object.keys(tutores).forEach(k => delete tutores[k]);
    Object.assign(tutores, src.tutores || {});
    if (src.evalDates) {
      if (src.evalDates.eval1 !== undefined) {
        // legacy: apply same dates to all niveles
        NIVELES.forEach(n => { evalDates[n] = {eval1:src.evalDates.eval1||'',eval2:src.evalDates.eval2||'',eval3:src.evalDates.eval3||''}; });
      } else {
        Object.keys(evalDates).forEach(k => delete evalDates[k]);
        Object.assign(evalDates, src.evalDates);
      }
    }
    // Nombre del centro
    if (src.iesName !== undefined) {
      const el = document.getElementById('headerIesName');
      if (el) el.value = src.iesName;
    }
    // Calendario: reemplazo completo
    if (Array.isArray(src.calEventos)) {
      calEventos.length = 0;
      src.calEventos.forEach(e => calEventos.push(e));
    }
    // Configuración de vacantes: reemplazo completo
    if (src.vacantesCfg) Object.assign(_vacantesCfg, src.vacantesCfg);
    // Materias personalizadas: reemplazo completo
    if (src.materiasCustom) {
      Object.keys(_materiasCustom).forEach(k => delete _materiasCustom[k]);
      Object.assign(_materiasCustom, src.materiasCustom);
      try { localStorage.setItem('evalies_materias', JSON.stringify(_materiasCustom)); } catch(e) {}
    }
    if (typeof src.actasNoOficialesTabVisible === 'boolean') _actasNoOficialesTabVisible = src.actasNoOficialesTabVisible;
    // Preferencias de interfaz (solo tiene sentido restaurarlas al sobrescribir)
    if (src.colState) { Object.keys(_colState).forEach(k => delete _colState[k]); const cs = JSON.parse(JSON.stringify(src.colState)); _colStateNombrePrimero(cs); Object.assign(_colState, cs); saveColState(); }
    if (src.theme === 'light' || src.theme === 'dark') {
      localStorage.setItem('evalies_theme', src.theme);
      document.documentElement.classList.toggle('light', src.theme === 'light');
    }

  } else {
    // Merge: add new niveles/grupos, append non-duplicate alumnos
    Object.keys(src.GRUPOS_POR_NIVEL).forEach(nivel => {
      if (!GRUPOS_POR_NIVEL[nivel]) {
        GRUPOS_POR_NIVEL[nivel] = [];
        data[nivel] = {};
        if (!NIVELES.includes(nivel)) NIVELES.push(nivel);
        // Init evalDates for new nivel
        if (!evalDates[nivel]) evalDates[nivel] = { eval1: _today, eval2: _today, eval3: _today };
      }
      src.GRUPOS_POR_NIVEL[nivel].forEach(grupo => {
        if (!GRUPOS_POR_NIVEL[nivel].includes(grupo)) {
          GRUPOS_POR_NIVEL[nivel].push(grupo);
          data[nivel][grupo] = [];
        }
        // Merge alumnos: skip if same nombre already exists
        const existing = new Set((data[nivel][grupo]||[]).map(a => a.nombre.trim().toLowerCase()));
        (src.data[nivel]?.[grupo] || []).forEach(a => {
          if (!existing.has((a.nombre||'').trim().toLowerCase())) {
            data[nivel][grupo].push(a);
            existing.add((a.nombre||'').trim().toLowerCase());
          }
        });
      });
    });
    // Merge tutores sin sobrescribir los que ya hay
    Object.keys(src.tutores || {}).forEach(k => { if (!tutores[k]) tutores[k] = src.tutores[k]; });
    // Nombre del centro: solo si aún no hay uno puesto
    const iesEl = document.getElementById('headerIesName');
    if (src.iesName && iesEl && !iesEl.value.trim()) iesEl.value = src.iesName;
    // Calendario: añade solo los eventos con id nuevo
    if (Array.isArray(src.calEventos)) {
      const existingIds = new Set(calEventos.map(e => e.id));
      src.calEventos.forEach(e => { if (!existingIds.has(e.id)) { calEventos.push(e); existingIds.add(e.id); } });
    }
    // Configuración de vacantes: combina campo a campo sin pisar lo existente
    if (src.vacantesCfg) _vacMergeCfg(src.vacantesCfg);
    // Materias personalizadas: combina por nivel sin pisar lo existente
    if (src.materiasCustom) {
      Object.keys(src.materiasCustom).forEach(k => { if (!(k in _materiasCustom)) _materiasCustom[k] = src.materiasCustom[k]; });
      try { localStorage.setItem('evalies_materias', JSON.stringify(_materiasCustom)); } catch(e) {}
    }
  }

  // Reset currentGrupos for any new niveles
  NIVELES.forEach(n => {
    if (!currentGrupos[n] && GRUPOS_POR_NIVEL[n]) currentGrupos[n] = GRUPOS_POR_NIVEL[n][0];
    // Ensure evalDates exists for every nivel
    if (!evalDates[n]) evalDates[n] = { eval1: _today, eval2: _today, eval3: _today };
  });
  Object.keys(GRUPOS_POR_NIVEL).forEach(n => { if (!currentGrupos[n]) currentGrupos[n] = GRUPOS_POR_NIVEL[n][0]; });

  // Convivencia, equipo docente/asistencia, observaciones de grupo, planos
  // de aula, actas (oficiales y no oficiales), fotos y horarios: todos son
  // diccionarios clave→valor que se sincronizan igual, según el modo elegido.
  window._convivenciaData     = _jsonSyncDict(window._convivenciaData,     src.convivenciaData,     mode);
  window._asistenciaData      = _jsonSyncDict(window._asistenciaData,      src.asistenciaData,      mode);
  window._obsGrupoData        = _jsonSyncDict(window._obsGrupoData,        src.obsGrupoData,         mode);
  window._planosGrupo         = _jsonSyncDict(window._planosGrupo,         src.planosGrupo,          mode);
  window._actasData           = _jsonSyncDict(window._actasData,          src.actasData,             mode);
  window._actasOficialesData  = _jsonSyncDict(window._actasOficialesData, src.actasOficialesData,    mode);
  window._fotoData            = _jsonSyncDict(window._fotoData,           src.fotoData,              mode);
  window._horarioData         = _jsonSyncDict(window._horarioData,        src.horarioData,           mode);

  closeJsonImportModal();
  renderAll();
  const totalAl = Object.values(data).reduce((s,nv)=>s+Object.values(nv).reduce((s2,gr)=>s2+gr.length,0),0);
  showToast(`✓ JSON importado (${mode==='overwrite'?'sobrescrito':'combinado'}) — ${totalAl} alumnos`);
  markDirty();
}

function renderResumen() {
  const mc = document.getElementById('mainContent');
  mc.innerHTML = '';

  const todosAl = [];
  NIVELES.forEach(n => (GRUPOS_POR_NIVEL[n]||[]).forEach(g =>
    (data[n]?.[g]||[]).forEach(a => todosAl.push({...a,_nivel:n,_grupo:g}))
  ));

  const totalAl   = todosAl.length;
  const totalNese = todosAl.filter(a=>a.nese==='Sí').length;
  const totalComp = todosAl.filter(a=>a.compensatoria==='Sí').length;
  const totalRep  = todosAl.filter(a=>a.repetidor==='Sí').length;
  const totalAbandono = todosAl.filter(a=>getPromocionaTipo(a)==='Abandono').length;
  const fpbP2     = todosAl.filter(a=>getPropObj(a.propuesta2).destino==='FPB').length;
  const fpbP3     = todosAl.filter(a=>getPropObj(a.propuesta3).destino==='FPB').length;
  const totalConPendIII  = todosAl.filter(a=>(a.pendientesIII ||[]).length>0).length;
  const totalConPendExtr = todosAl.filter(a=>(a.pendientesExtr||[]).length>0).length;
  const totalGrupos = NIVELES.reduce((s,n)=>s+(GRUPOS_POR_NIVEL[n]||[]).length,0);

  const iesName = document.getElementById('headerIesName')?.value || 'Centro Educativo';
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-ES',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  const kpiColor = (c) => `border-left-color:${c}`;

  let html = `<div class="resumen-body">`;

  // ── Welcome banner ──
  html += `<div style="
    background: linear-gradient(135deg, var(--surface2) 0%, var(--surface) 100%);
    border: 1px solid var(--border2);
    border-radius: 14px; padding: 24px 28px; margin-bottom: 28px;
    display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;
    position: relative; overflow: hidden;
  ">
    <div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(79,142,247,0.06) 0%,transparent 60%);pointer-events:none;"></div>
    <div style="position:relative">
      <div style="font-family:inherit;font-size:22px;font-weight:800;color:var(--text);margin-bottom:4px;letter-spacing:-0.5px;">${iesName}</div>
      <div style="font-size:12px;color:var(--text2);">📅 ${dateStr.charAt(0).toUpperCase()+dateStr.slice(1)}</div>
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;position:relative">
      <div style="background:rgba(79,142,247,0.1);border:1px solid rgba(79,142,247,0.25);border-radius:10px;padding:10px 18px;text-align:center;">
        <div style="font-family:inherit;font-size:26px;font-weight:700;color:var(--accent)">${totalAl}</div>
        <div style="font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-top:2px">Alumnos</div>
      </div>
      <div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:10px;padding:10px 18px;text-align:center;">
        <div style="font-family:inherit;font-size:26px;font-weight:700;color:var(--text)">${NIVELES.length}</div>
        <div style="font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-top:2px">Niveles</div>
      </div>
      <div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:10px;padding:10px 18px;text-align:center;">
        <div style="font-family:inherit;font-size:26px;font-weight:700;color:var(--text)">${totalGrupos}</div>
        <div style="font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-top:2px">Grupos</div>
      </div>
    </div>
  </div>`;

  // v5: app vacía → cómo empezar (y datos de ejemplo opcionales, que no se guardan)
  if (totalAl === 0 && !window.__MODO_EJEMPLO__) {
    html += `<div style="border:1px dashed var(--border2);border-radius:12px;padding:16px 20px;margin-bottom:24px;display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap">
      <div style="font-size:13.5px;color:var(--text2);max-width:640px"><strong style="color:var(--text)">Todavía no hay alumnado.</strong> Añádelo en cada nivel con «+ Añadir Alumno», impórtalo desde CSV (⚙️ Gestión del Curso) o abre un archivo guardado. ¿Quieres ver antes cómo queda con datos? Carga un ejemplo: <em>no se guarda nada</em>.</div>
      <button class="btn" style="padding:8px 14px;border-radius:8px;border:1px solid var(--border2);background:var(--surface2);color:var(--text);cursor:pointer" onclick="cargarDatosEjemplo()">🧪 Ver con datos de ejemplo</button>
    </div>`;
  }

  // ── KPIs ──
  html += `<div class="resumen-kpis">
    <div class="kpi-card" style="${kpiColor('var(--purple)')}">
      <div class="kpi-label">NESE</div>
      <div class="kpi-value" style="color:var(--purple)">${totalNese}</div>
      ${totalAl ? `<div style="font-size:10px;color:var(--text3);margin-top:4px">${Math.round(totalNese/totalAl*100)}% del alumnado</div>` : ''}
    </div>
    <div class="kpi-card" style="${kpiColor('var(--orange)')}">
      <div class="kpi-label">Compensatoria</div>
      <div class="kpi-value" style="color:var(--orange)">${totalComp}</div>
      ${totalAl ? `<div style="font-size:10px;color:var(--text3);margin-top:4px">${Math.round(totalComp/totalAl*100)}% del alumnado</div>` : ''}
    </div>
    <div class="kpi-card" style="${kpiColor('var(--yellow)')}">
      <div class="kpi-label">Repetidores</div>
      <div class="kpi-value" style="color:var(--yellow)">${totalRep}</div>
      ${totalAl ? `<div style="font-size:10px;color:var(--text3);margin-top:4px">${Math.round(totalRep/totalAl*100)}% del alumnado</div>` : ''}
    </div>
    ${totalAbandono > 0 ? `
    <div class="kpi-card" style="${kpiColor('#9aa3bb')}">
      <div class="kpi-label">🚪 Abandono</div>
      <div class="kpi-value" style="color:#9aa3bb">${totalAbandono}</div>
      ${totalAl ? `<div style="font-size:10px;color:var(--text3);margin-top:4px">${Math.round(totalAbandono/totalAl*100)}% del alumnado</div>` : ''}
    </div>` : ''}
    <div class="kpi-card" style="${kpiColor('var(--orange)')}">
      <div class="kpi-label">FPB · II Eval.</div>
      <div class="kpi-value" style="color:var(--orange)">${fpbP2}</div>
    </div>
    <div class="kpi-card" style="${kpiColor('var(--red)')}">
      <div class="kpi-label">FPB · III Eval.</div>
      <div class="kpi-value" style="color:var(--red)">${fpbP3}</div>
    </div>
    ${totalConPendIII > 0 ? `
    <div class="kpi-card" style="${kpiColor('var(--yellow)')}">
      <div class="kpi-label">📚 Pend. III Eval.</div>
      <div class="kpi-value" style="color:var(--yellow)">${totalConPendIII}</div>
      ${totalAl ? `<div style="font-size:10px;color:var(--text3);margin-top:4px">${Math.round(totalConPendIII/totalAl*100)}% del alumnado</div>` : ''}
    </div>` : ''}
    ${totalConPendExtr > 0 ? `
    <div class="kpi-card" style="${kpiColor('var(--orange)')}">
      <div class="kpi-label">📚 Pend. Extr.</div>
      <div class="kpi-value" style="color:var(--orange)">${totalConPendExtr}</div>
      ${totalAl ? `<div style="font-size:10px;color:var(--text3);margin-top:4px">${Math.round(totalConPendExtr/totalAl*100)}% del alumnado</div>` : ''}
    </div>` : ''}
  </div>`;

  // ── Helper: build one nivel-summary-card ──
  const tipoMeta = {
    'Repetición': { cls:'red',    bar:'var(--red)',    label:'Repite'    },
    'Promoción':  { cls:'green',  bar:'var(--green)',  label:'Promociona'},
    'Titulación': { cls:'purple', bar:'var(--purple)', label:'Titula'    },
    'Abandono':   { cls:'gray',   bar:'#9aa3bb',       label:'Abandono'  },
  };

  function nivelCard(nivel, propField) {
    const grupos = GRUPOS_POR_NIVEL[nivel]||[];
    const alumnos = grupos.flatMap(g=>(data[nivel]?.[g]||[]).map(a=>({...a,_grupo:g})));
    if (!alumnos.length) return '';
    const tot = alumnos.length;

    // counts
    const counts = {'Repetición':0,'Promoción':0,'Titulación':0,'Abandono':0,'Sin propuesta':0,'→ FPB':0};
    alumnos.forEach(a=>{
      const o = getPropObj(a[propField]);
      if (o.destino==='FPB') { counts['→ FPB']++; return; }
      if (tipoMeta[o.tipo]) counts[o.tipo]++;
      else counts['Sin propuesta']++;
    });

    let rows = '';
    const order = ['Repetición','Promoción','Titulación','→ FPB','Abandono','Sin propuesta'];
    const colors = {'Repetición':'var(--red)','Promoción':'var(--green)','Titulación':'var(--purple)','→ FPB':'var(--orange)','Abandono':'#9aa3bb','Sin propuesta':'var(--text3)'};
    order.forEach(k=>{
      if (!counts[k]) return;
      const pct = Math.round(counts[k]/tot*100);
      rows += `<div class="nivel-summary-row">
        <span class="ns-label">${k}</span>
        <div class="ns-bar-wrap"><div class="ns-bar" style="width:${pct}%;background:${colors[k]}"></div></div>
        <span class="ns-num" style="color:${colors[k]}">${counts[k]}</span>
        <span class="ns-pct">${pct}%</span>
      </div>`;

      // For 4º ESO Titulación: show sub-breakdown by destination
      if (k === 'Titulación' && nivel === '4º ESO' && counts[k] > 0) {
        const bachDests = [
          { dest:'1º Bachillerato Científico', icon:'🔬', color:'var(--accent)' },
          { dest:'1º Bachillerato HS',         icon:'📚', color:'var(--green)'  },
          { dest:'CFGM',                        icon:'🎓', color:'var(--orange)' },
        ];
        bachDests.forEach(({dest, icon, color}) => {
          const n = alumnos.filter(a => getPropObj(a[propField]).tipo==='Titulación' && getPropObj(a[propField]).destino===dest).length;
          if (!n) return;
          const subPct = Math.round(n/tot*100);
          rows += `<div class="nivel-summary-row" style="padding-left:18px;opacity:0.85">
            <span class="ns-label" style="color:${color};font-size:10px">${icon} ${dest}</span>
            <div class="ns-bar-wrap"><div class="ns-bar" style="width:${subPct}%;background:${color};opacity:0.6"></div></div>
            <span class="ns-num" style="color:${color};font-size:11px">${n}</span>
            <span class="ns-pct" style="font-size:10px">${subPct}%</span>
          </div>`;
        });
      }

      // For Bachillerato: show sub-breakdown of each outcome by especialidad (grupo)
      if (isBach(nivel) && grupos.length > 1 && counts[k] > 0) {
        const matchOutcome = (a, key) => {
          const o = getPropObj(a[propField]);
          if (o.destino === 'FPB') return key === '→ FPB';
          if (tipoMeta[o.tipo]) return o.tipo === key;
          return key === 'Sin propuesta';
        };
        grupos.forEach(g => {
          const n = alumnos.filter(a => a._grupo === g && matchOutcome(a, k)).length;
          if (!n) return;
          const subPct = Math.round(n/tot*100);
          rows += `<div class="nivel-summary-row" style="padding-left:18px;opacity:0.85">
            <span class="ns-label" style="color:${colors[k]};font-size:10px">↳ ${g}</span>
            <div class="ns-bar-wrap"><div class="ns-bar" style="width:${subPct}%;background:${colors[k]};opacity:0.6"></div></div>
            <span class="ns-num" style="color:${colors[k]};font-size:11px">${n}</span>
            <span class="ns-pct" style="font-size:10px">${subPct}%</span>
          </div>`;
        });
      }
    });

    // group links with semaforo
    const links = grupos.map(g => {
      const al = data[nivel]?.[g] || [];
      const tot = al.length;
      const sinDecision = al.filter(a =>
        !!(a.nombre && (a.eval3 > 0 || getPropObj(a.propuesta3).tipo)) && !getPropObj(a.promociona).tipo
      ).length;
      let semaforoClass, semaforoLabel;
      if (!tot) { semaforoClass = 'amarillo'; semaforoLabel = '— sin datos'; }
      else if (sinDecision === 0) { semaforoClass = 'verde'; semaforoLabel = '✓ Completo'; }
      else if (sinDecision < tot) { semaforoClass = 'amarillo'; semaforoLabel = `⚠ ${sinDecision} pendientes`; }
      else { semaforoClass = 'rojo'; semaforoLabel = '✕ Sin decidir'; }
      return `<span class="grupo-link" onclick="selectNivel('${jsAttr(nivel)}');currentGrupos['${jsAttr(nivel)}']='${jsAttr(g)}';renderAll();">
        ${nivel} ${g}
        <span class="semaforo ${semaforoClass}" style="margin-left:4px">${semaforoLabel}</span>
      </span>`;
    }).join('');

    // semaforo for this nivel
    const niveAlTotal = alumnos.length;
    const niveSinDec = alumnos.filter(a =>
      !!(a.nombre && (a.eval3 > 0 || getPropObj(a.propuesta3).tipo)) && !getPropObj(a.promociona).tipo
    ).length;
    let nivSemClass, nivSemLabel;
    if (!niveAlTotal) { nivSemClass='amarillo'; nivSemLabel='— sin datos'; }
    else if (niveSinDec === 0) { nivSemClass='verde'; nivSemLabel='✓ Decisiones completas'; }
    else if (niveSinDec < niveAlTotal) { nivSemClass='amarillo'; nivSemLabel=`⚠ ${niveSinDec} pendientes`; }
    else { nivSemClass='rojo'; nivSemLabel='✕ Sin decisiones'; }

    // Determine the "positive outcome" metric for this nivel
    const isFinalCourse = nivel === '4º ESO' || nivel === '2º Bach.' || nivel === '2º Bach. Científico' || nivel === '2º Bach. HS';
    const positiveType  = isFinalCourse ? 'Titulación' : 'Promoción';
    const positiveCount = alumnos.filter(a => getPropObj(a[propField]).tipo === positiveType).length;
    const positivePct   = tot ? Math.round(positiveCount / tot * 100) : 0;
    const positiveLabel = isFinalCourse ? 'Titulan' : 'Promocionan';
    const positiveColor = isFinalCourse ? 'var(--purple)' : 'var(--green)';
    const positiveStat  = positiveCount > 0
      ? `<span style="font-size:11px;font-weight:700;color:${positiveColor};background:${positiveColor}18;border:1px solid ${positiveColor}44;border-radius:6px;padding:2px 8px;">${positivePct}% ${positiveLabel}</span>`
      : '';

    return `<div class="nivel-summary-card">
      <div class="nivel-summary-header">
        <span class="nivel-summary-name">${nivel}</span>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          ${positiveStat}
          <span class="semaforo ${nivSemClass}">${nivSemLabel}</span>
          <span class="nivel-summary-meta">${tot} alumnos · ${grupos.length} grupo${grupos.length>1?'s':''}</span>
        </div>
      </div>
      <div class="nivel-summary-rows">${rows}</div>
      <div class="nivel-groups-row">${links}</div>
    </div>`;
  }

  // ── Lengua Base stats ──
  const lenguaTotCast = todosAl.filter(a=>a.lenguaBase==='Castellano').length;
  const lenguaTotVal  = todosAl.filter(a=>a.lenguaBase==='Valenciano').length;
  const lenguaTotNV   = todosAl.filter(a=>!a.lenguaBase||a.lenguaBase==='').length;

  // Promoción / No promoción por lengua base
  const _esPromo   = a => { const t=getPropObj(a.promociona).tipo; return t==='Promoción'||t==='Titulación'; };
  const _esNoPromo = a => { const t=getPropObj(a.promociona).tipo; return t==='Repetición'||t==='No Promociona'||t==='No Titula'; };
  const _lenguaEs  = (a,l) => l==='' ? (!a.lenguaBase||a.lenguaBase==='') : a.lenguaBase===l;
  const castPromo   = todosAl.filter(a=>_lenguaEs(a,'Castellano') && _esPromo(a)).length;
  const castNoPromo = todosAl.filter(a=>_lenguaEs(a,'Castellano') && _esNoPromo(a)).length;
  const valPromo    = todosAl.filter(a=>_lenguaEs(a,'Valenciano') && _esPromo(a)).length;
  const valNoPromo  = todosAl.filter(a=>_lenguaEs(a,'Valenciano') && _esNoPromo(a)).length;
  const nvPromo     = todosAl.filter(a=>_lenguaEs(a,'')           && _esPromo(a)).length;
  const nvNoPromo   = todosAl.filter(a=>_lenguaEs(a,'')           && _esNoPromo(a)).length;
  const _promoLine  = (p,np,base) => {
    const pp  = base ? Math.round(p/base*100)  : 0;
    const npp = base ? Math.round(np/base*100) : 0;
    return `<div style="font-size:10px;margin-top:6px;display:flex;gap:10px;justify-content:center;align-items:center;flex-wrap:wrap">
        <span style="color:var(--green);font-weight:600">✓ ${p} promociona${p!==1?'n':''} (${pp}%)</span>
        <span style="color:var(--text3)">·</span>
        <span style="color:var(--red);font-weight:600">✕ ${np} no (${npp}%)</span>
      </div>`;
  };

  function lenguaCard(nivel) {
    const grupos = GRUPOS_POR_NIVEL[nivel]||[];
    const al = grupos.flatMap(g=>(data[nivel]?.[g]||[]));
    if (!al.length) return '';
    const tot = al.length;
    const cast = al.filter(a=>a.lenguaBase==='Castellano').length;
    const val  = al.filter(a=>a.lenguaBase==='Valenciano').length;
    const nv   = tot - cast - val;
    const pct  = v => tot ? Math.round(v/tot*100) : 0;
    // Promoción por lengua dentro del curso (porcentajes relativos a cada lengua)
    const promoSub = (count, lang) => {
      if (!count) return '';
      const sub = al.filter(a => _lenguaEs(a, lang));
      const p  = sub.filter(_esPromo).length;
      const np = sub.filter(_esNoPromo).length;
      const pp  = count ? Math.round(p/count*100)  : 0;
      const npp = count ? Math.round(np/count*100) : 0;
      return `<div style="padding:0 14px 5px 30px;margin-top:-3px;font-size:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span style="color:var(--green);font-weight:600">✓ ${p} prom. (${pp}%)</span>
        <span style="color:var(--text3)">·</span>
        <span style="color:var(--red);font-weight:600">✕ ${np} no (${npp}%)</span>
      </div>`;
    };
    return `<div class="nivel-summary-card">
      <div class="nivel-summary-header">
        <span class="nivel-summary-name">${nivel}</span>
        <span class="nivel-summary-meta">${tot} alumnos · ${cast+val} votos emitidos</span>
      </div>
      <div class="nivel-summary-rows">
        <div class="nivel-summary-row">
          <span class="ns-label">🟦 Castellano</span>
          <div class="ns-bar-wrap"><div class="ns-bar" style="width:${pct(cast)}%;background:var(--accent)"></div></div>
          <span class="ns-num" style="color:var(--accent)">${cast}</span>
          <span class="ns-pct">${pct(cast)}%</span>
        </div>
        ${promoSub(cast, 'Castellano')}
        <div class="nivel-summary-row">
          <span class="ns-label">🟩 Valenciano</span>
          <div class="ns-bar-wrap"><div class="ns-bar" style="width:${pct(val)}%;background:var(--green)"></div></div>
          <span class="ns-num" style="color:var(--green)">${val}</span>
          <span class="ns-pct">${pct(val)}%</span>
        </div>
        ${promoSub(val, 'Valenciano')}
        <div class="nivel-summary-row">
          <span class="ns-label">⬜ No vota</span>
          <div class="ns-bar-wrap"><div class="ns-bar" style="width:${pct(nv)}%;background:var(--text3)"></div></div>
          <span class="ns-num" style="color:var(--text3)">${nv}</span>
          <span class="ns-pct">${pct(nv)}%</span>
        </div>
        ${promoSub(nv, '')}
      </div>
    </div>`;
  }

  html += `<div class="resumen-block">
    <div class="resumen-block-title">🗣️ Voto Lengua Base</div>
    <div class="resumen-kpis" style="margin-bottom:16px">
      <div class="kpi-card" style="${kpiColor('var(--accent)')}">
        <div class="kpi-label">Castellano</div>
        <div class="kpi-value" style="color:var(--accent)">${lenguaTotCast}</div>
        ${totalAl?`<div style="font-size:10px;color:var(--text3);margin-top:4px">${Math.round(lenguaTotCast/totalAl*100)}% del alumnado</div>`:''}
        ${_promoLine(castPromo, castNoPromo, lenguaTotCast)}
      </div>
      <div class="kpi-card" style="${kpiColor('var(--green)')}">
        <div class="kpi-label">Valenciano</div>
        <div class="kpi-value" style="color:var(--green)">${lenguaTotVal}</div>
        ${totalAl?`<div style="font-size:10px;color:var(--text3);margin-top:4px">${Math.round(lenguaTotVal/totalAl*100)}% del alumnado</div>`:''}
        ${_promoLine(valPromo, valNoPromo, lenguaTotVal)}
      </div>
      <div class="kpi-card" style="${kpiColor('var(--text3)')}">
        <div class="kpi-label">No vota / Sin datos</div>
        <div class="kpi-value" style="color:var(--text3)">${lenguaTotNV}</div>
        ${totalAl?`<div style="font-size:10px;color:var(--text3);margin-top:4px">${Math.round(lenguaTotNV/totalAl*100)}% del alumnado</div>`:''}
        ${_promoLine(nvPromo, nvNoPromo, lenguaTotNV)}
      </div>
    </div>
    <div class="nivel-summary-grid">
      ${NIVELES.map(n=>lenguaCard(n)).join('')}
    </div>
  </div>`;

  // ── II Eval proposals ──
  html += `<div class="resumen-block">
    <div class="resumen-block-title">📋 Propuestas II Evaluación</div>
    <div class="nivel-summary-grid">
      ${NIVELES.map(n=>nivelCard(n,'propuesta2')).join('')}
    </div>
  </div>`;

  // ── Decisión Final (Promociona) ──
  html += `<div class="resumen-block">
    <div class="resumen-block-title" style="justify-content:space-between;flex-wrap:wrap;gap:8px;">
      <span>✅ Decisión Final (Promociona)</span>
      <span style="display:flex;gap:6px;flex-wrap:wrap;">
        <button onclick="event.stopPropagation();printPromocionaEtapa('ESO')" title="Imprimir de una vez los informes de decisión final de todos los grupos de la ESO (uno por hoja)"
          style="padding:4px 14px;border-radius:7px;border:1px solid var(--accent);background:rgba(79,142,247,0.12);color:var(--accent);font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;text-transform:none;letter-spacing:0;">🖨 Informes ESO</button>
        <button onclick="event.stopPropagation();printPromocionaEtapa('BACH')" title="Imprimir de una vez los informes de decisión final de todos los grupos de Bachillerato (uno por hoja)"
          style="padding:4px 14px;border-radius:7px;border:1px solid var(--purple);background:rgba(167,139,250,0.12);color:var(--purple);font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;text-transform:none;letter-spacing:0;">🖨 Informes Bachillerato</button>
        <button onclick="event.stopPropagation();printPropuestasFinales()" title="Imprimir informe de propuestas finales para Orientación"
          style="padding:4px 14px;border-radius:7px;border:1px solid var(--green);background:rgba(45,212,160,0.12);color:var(--green);font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;text-transform:none;letter-spacing:0;">🖨 Informe Orientación</button>
      </span>
    </div>
    <div class="nivel-summary-grid">
      ${NIVELES.map(n=>nivelCard(n,'promociona')).join('')}
    </div>
  </div>`;

  // ── Generic destino-panel builder ──
  function destinoPanel(propField, label, destino, icon, color) {
    const list = [];
    NIVELES.forEach(n=>(GRUPOS_POR_NIVEL[n]||[]).forEach(g=>
      (data[n]?.[g]||[]).forEach(a=>{
        if (getPropObj(a[propField]).destino===destino) list.push({...a,_nivel:n,_grupo:g});
      })
    ));
    const rows = list.length
      ? list.map(a=>`<div class="fpb-row">
          <span class="fpb-nombre">${a.nombre||'—'}</span>
          <span class="badge badge-blue" style="font-size:10px">${a._nivel}</span>
          <span class="badge badge-gray" style="font-size:10px;margin-left:4px">${a._grupo}</span>
          <span style="font-size:10px;color:var(--text3);margin-left:4px;">${a.colegioProcedencia||''}</span>
          <span class="grupo-link" style="margin-left:auto" onclick="selectNivel('${jsAttr(a._nivel)}');currentGrupos['${jsAttr(a._nivel)}']='${jsAttr(a._grupo)}';renderAll();">Ver grupo</span>
        </div>`).join('')
      : `<div class="fpb-empty">Sin alumnos propuestos para ${destino}</div>`;
    const isPrint = propField === 'promociona';
    const printBtn = isPrint && list.length
      ? `<button onclick="printDestinoList('${propField}','${destino.replace(/'/g,"\\'")}','${icon.replace(/'/g,"\\'")}','${label.replace(/'/g,"\\'")}','${color.replace(/'/g,"\\'")}')" title="Imprimir lista de ${destino}"
           style="margin-left:10px;padding:3px 10px;border-radius:6px;border:1px solid ${color};background:transparent;color:${color};font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;">🖨 Imprimir</button>`
      : '';
    return `<div class="fpb-panel" style="--destino-color:${color}">
      <div class="fpb-panel-header" style="background:${color}18;border-color:${color}4d;color:${color};flex-wrap:wrap;gap:6px;">
        <span>${icon} ${destino} — ${label}</span>
        <span style="display:flex;align-items:center;gap:6px;margin-left:auto;">
          <span style="font-size:11px;font-weight:400;color:var(--text2)">${list.length} alumno${list.length!==1?'s':''}</span>
          ${printBtn}
        </span>
      </div>
      <div class="fpb-list">${rows}</div>
    </div>`;
  }

  // ── FPB section ──
  function fpbPanel(propField, label) {
    return destinoPanel(propField, label, 'FPB', '🎓', 'var(--orange)');
  }

  // ── 1º ESO — Promoción por CEIP de procedencia ──
  (function() {
    const n1eso = '1º ESO';
    const al1 = (GRUPOS_POR_NIVEL[n1eso]||[]).flatMap(g=>(data[n1eso]?.[g]||[]).map(a=>({...a,_grupo:g})));
    if (!al1.length) return;

    // Group by colegioProcedencia
    const ceipMap = {};
    al1.forEach(a => {
      const ceip = (a.colegioProcedencia||'').trim() || '— Sin asignar';
      if (!ceipMap[ceip]) ceipMap[ceip] = { promo:[], noPromo:[], sinDec:[] };
      const tipo = getPropObj(a.promociona).tipo;
      if (tipo === 'Promoción' || tipo === 'Titulación') ceipMap[ceip].promo.push(a);
      else if (tipo === 'Repetición' || tipo === 'No Promociona') ceipMap[ceip].noPromo.push(a);
      else ceipMap[ceip].sinDec.push(a);
    });

    const sortedCeips = Object.keys(ceipMap).sort((a,b) => {
      if (a === '— Sin asignar') return 1;
      if (b === '— Sin asignar') return -1;
      return a.localeCompare(b, 'es');
    });

    const rows = sortedCeips.map(ceip => {
      const d = ceipMap[ceip];
      const tot = d.promo.length + d.noPromo.length + d.sinDec.length;
      const pPct = tot ? Math.round(d.promo.length/tot*100) : 0;
      const nPct = tot ? Math.round(d.noPromo.length/tot*100) : 0;
      const sPct = tot ? Math.round(d.sinDec.length/tot*100) : 0;
      const isSinAsignar = ceip === '— Sin asignar';
      return `<tr style="${isSinAsignar?'opacity:0.55':''}">
        <td style="padding:7px 12px;border-bottom:1px solid var(--border);font-size:12px;color:var(--text);max-width:320px;white-space:normal;word-break:break-word;">${ceip}</td>
        <td style="padding:7px 10px;border-bottom:1px solid var(--border);text-align:center;font-family:inherit;font-weight:700;color:var(--text2)">${tot}</td>
        <td style="padding:7px 10px;border-bottom:1px solid var(--border);">
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="flex:1;background:var(--surface2);border-radius:4px;height:8px;overflow:hidden;">
              <div style="width:${pPct}%;height:8px;background:var(--green);border-radius:4px;transition:width .4s"></div>
            </div>
            <span style="font-family:inherit;font-size:12px;font-weight:700;color:var(--green);min-width:24px;text-align:right">${d.promo.length}</span>
            <span style="font-size:10px;color:var(--text3);min-width:32px">${pPct}%</span>
          </div>
        </td>
        <td style="padding:7px 10px;border-bottom:1px solid var(--border);">
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="flex:1;background:var(--surface2);border-radius:4px;height:8px;overflow:hidden;">
              <div style="width:${nPct}%;height:8px;background:var(--red);border-radius:4px;transition:width .4s"></div>
            </div>
            <span style="font-family:inherit;font-size:12px;font-weight:700;color:var(--red);min-width:24px;text-align:right">${d.noPromo.length}</span>
            <span style="font-size:10px;color:var(--text3);min-width:32px">${nPct}%</span>
          </div>
        </td>
        <td style="padding:7px 10px;border-bottom:1px solid var(--border);text-align:center;">
          ${d.sinDec.length
            ? `<span style="font-family:inherit;font-size:12px;color:var(--yellow);font-weight:700">${d.sinDec.length}</span><span style="font-size:10px;color:var(--text3);margin-left:4px">${sPct}%</span>`
            : `<span style="color:var(--green);font-size:12px">✓</span>`}
        </td>
      </tr>`;
    }).join('');

    const totalPromo  = al1.filter(a=>{const t=getPropObj(a.promociona).tipo;return t==='Promoción'||t==='Titulación';}).length;
    const totalNoPromo = al1.filter(a=>{const t=getPropObj(a.promociona).tipo;return t==='Repetición'||t==='No Promociona';}).length;
    const totalSin    = al1.length - totalPromo - totalNoPromo;

    html += `<div class="resumen-block">
      <div class="resumen-block-title" style="justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <span>🏫 1º ESO — Promoción a 2º ESO por CEIP de procedencia</span>
        <span style="display:flex;gap:14px;font-size:11px;text-transform:none;letter-spacing:0;color:var(--text2)">
          <span>Total: <strong style="color:var(--text)">${al1.length}</strong></span>
          <span style="color:var(--green)">✓ Promocionan: <strong>${totalPromo}</strong></span>
          <span style="color:var(--red)">✕ No promocionan: <strong>${totalNoPromo}</strong></span>
          ${totalSin ? `<span style="color:var(--yellow)">⏳ Sin decidir: <strong>${totalSin}</strong></span>` : ''}
        </span>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:var(--surface2);">
              <th style="padding:8px 12px;text-align:left;font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;font-weight:700;border-bottom:2px solid var(--border);">CEIP de procedencia</th>
              <th style="padding:8px 10px;text-align:center;font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;font-weight:700;border-bottom:2px solid var(--border);">Total</th>
              <th style="padding:8px 10px;font-size:10px;color:var(--green);text-transform:uppercase;letter-spacing:0.5px;font-weight:700;border-bottom:2px solid var(--border);">✓ Promocionan</th>
              <th style="padding:8px 10px;font-size:10px;color:var(--red);text-transform:uppercase;letter-spacing:0.5px;font-weight:700;border-bottom:2px solid var(--border);">✕ No promocionan</th>
              <th style="padding:8px 10px;text-align:center;font-size:10px;color:var(--yellow);text-transform:uppercase;letter-spacing:0.5px;font-weight:700;border-bottom:2px solid var(--border);">⏳ Sin decidir</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  })();

  html += `<div class="resumen-block">
    <div class="resumen-block-title">🎓 Alumnado propuesto para FPB</div>
    <div class="fpb-grid">
      ${fpbPanel('propuesta2','Propuesta II Evaluación')}
      ${fpbPanel('promociona','Decisión Final')}
    </div>
  </div>`;

  // ── PAC section ──
  const _pac = '2 PAC';
  const _pac2 = destinoPanel('propuesta2','Propuesta II Evaluaci\xF3n',_pac,'\uD83D\uDCD8','var(--accent)');
  const _pac3 = destinoPanel('promociona','Decisi\xF3n Final',_pac,'\uD83D\uDCD8','var(--accent)');
  html += '<div class="resumen-block"><div class="resumen-block-title">\uD83D\uDCD8 Alumnado propuesto para PAC</div><div class="fpb-grid">' + _pac2 + _pac3 + '</div></div>';

  // ── 3 PDC section ──
  const _3pdc = '3\xBA PDC';
  const _3pdc2 = destinoPanel('propuesta2','Propuesta II Evaluaci\xF3n',_3pdc,'\uD83D\uDCD7','var(--green)');
  const _3pdc3 = destinoPanel('promociona','Decisi\xF3n Final',_3pdc,'\uD83D\uDCD7','var(--green)');
  html += '<div class="resumen-block"><div class="resumen-block-title">\uD83D\uDCD7 Alumnado propuesto para 3\xBA PDC</div><div class="fpb-grid">' + _3pdc2 + _3pdc3 + '</div></div>';

  // ── 4 PDC section ──
  const _4pdc = '4\xBA PDC';
  const _4pdc2 = destinoPanel('propuesta2','Propuesta II Evaluaci\xF3n',_4pdc,'\uD83D\uDCD9','var(--purple)');
  const _4pdc3 = destinoPanel('promociona','Decisi\xF3n Final',_4pdc,'\uD83D\uDCD9','var(--purple)');
  html += '<div class="resumen-block"><div class="resumen-block-title">\uD83D\uDCD9 Alumnado propuesto para 4\xBA PDC</div><div class="fpb-grid">' + _4pdc2 + _4pdc3 + '</div></div>';

  // ── 4º ESO Titulación — desglose por destino (Bach Científico / Bach HS / CFGM) ──
  (function() {
    const n4 = '4º ESO';
    const grupos4 = GRUPOS_POR_NIVEL[n4] || [];
    const al4 = grupos4.flatMap(g => (data[n4]?.[g] || []).map(a => ({...a, _grupo: g})));
    if (!al4.length) return;

    // Helper: count titulan by destination for a given propField, filtered to 4º ESO
    function titulaDestPanel(propField, evalLabel) {
      const destinos = ['1º Bachillerato Científico', '1º Bachillerato HS', 'CFGM'];
      const colors   = { '1º Bachillerato Científico': 'var(--accent)', '1º Bachillerato HS': 'var(--green)', 'CFGM': 'var(--orange)' };
      const icons    = { '1º Bachillerato Científico': '🔬', '1º Bachillerato HS': '📚', 'CFGM': '🎓' };

      // Only students from 4º ESO
      const titulanAll = al4.filter(a => getPropObj(a[propField]).tipo === 'Titulación');
      const sinDestino = titulanAll.filter(a => !destinos.includes(getPropObj(a[propField]).destino));

      const panels = destinos.map(dest => {
        const list = al4.filter(a =>
          getPropObj(a[propField]).tipo === 'Titulación' &&
          getPropObj(a[propField]).destino === dest
        );
        const color = colors[dest];
        const icon  = icons[dest];
        const rows = list.length
          ? list.map(a => `<div class="fpb-row">
              <span class="fpb-nombre">${a.nombre || '—'}</span>
              <span class="badge badge-gray" style="font-size:10px;margin-left:4px">${a._grupo}</span>
              <span class="grupo-link" style="margin-left:auto" onclick="selectNivel('${jsAttr(n4)}');currentGrupos['${jsAttr(n4)}']='${jsAttr(a._grupo)}';renderAll();">Ver grupo</span>
            </div>`).join('')
          : `<div class="fpb-empty">Sin alumnos → ${dest}</div>`;
        return `<div class="fpb-panel" style="--destino-color:${color}">
          <div class="fpb-panel-header" style="background:${color}18;border-color:${color}4d;color:${color}">
            <span>${icon} ${dest} — ${evalLabel}</span>
            <span style="font-size:11px;font-weight:400;color:var(--text2);margin-left:auto">${list.length} alumno${list.length!==1?'s':''}</span>
          </div>
          <div class="fpb-list">${rows}</div>
        </div>`;
      }).join('');

      // Show sinDestino only if any exist
      const sinDestinoHtml = sinDestino.length ? `<div style="margin-top:8px;padding:8px 12px;background:rgba(245,200,66,0.08);border:1px solid rgba(245,200,66,0.3);border-radius:8px;font-size:12px;color:var(--yellow);">
        ⚠ ${sinDestino.length} alumno${sinDestino.length!==1?'s':''} con Titulación pero sin destino asignado
      </div>` : '';

      return `<div>
        <div style="font-size:11px;font-weight:700;color:var(--purple);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;padding:6px 10px;background:rgba(124,92,252,0.1);border-radius:6px;">
          🎓 Titulación ${evalLabel} — ${titulanAll.length} alumno${titulanAll.length!==1?'s':''} en total
        </div>
        <div class="fpb-grid">${panels}</div>
        ${sinDestinoHtml}
      </div>`;
    }

    html += `<div class="resumen-block">
      <div class="resumen-block-title">🎓 4º ESO — Titulación por destino (Bach. Científico / Bach. HS / CFGM)</div>
      <div style="display:flex;flex-direction:column;gap:20px;">
        ${titulaDestPanel('propuesta2', 'II Evaluación')}
        ${titulaDestPanel('promociona', 'Decisión Final')}
      </div>
    </div>`;
  })();

  // ── Materias pendientes por nivel ──
  (function() {
    const thS = 'padding:7px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid var(--border);background:var(--surface2);';

    const nivelRows = NIVELES.map(n => {
      const grupos = GRUPOS_POR_NIVEL[n] || [];
      const alumnos = grupos.flatMap(g => (data[n]?.[g] || []).map(a => ({...a, _grupo: g})));
      if (!alumnos.length) return null;

      const countIII = {}, countExtr = {};
      alumnos.forEach(a => {
        (a.pendientesIII  || []).forEach(m => { countIII[m]  = (countIII[m]  || 0) + 1; });
        (a.pendientesExtr || []).forEach(m => { countExtr[m] = (countExtr[m] || 0) + 1; });
      });

      const allMaterias = [...new Set([...Object.keys(countIII), ...Object.keys(countExtr)])];
      const isBachNivel = isBach(n);
      const conPend = alumnos.filter(a => (a.pendientesIII||[]).length + (a.pendientesExtr||[]).length > 0).length;

      if (!allMaterias.length) {
        return `<div style="margin-bottom:12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;">
          <div style="padding:9px 14px;background:var(--surface2);border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:13px;font-weight:700;color:var(--text)">${n}</span>
            <span style="font-size:11px;color:var(--green)">✓ Sin materias pendientes registradas</span>
          </div>
        </div>`;
      }

      const sorted = allMaterias
        .map(m => ({ m, iii: countIII[m]||0, extr: countExtr[m]||0, total:(countIII[m]||0)+(countExtr[m]||0) }))
        .sort((a,b) => b.total - a.total);

      const maxTotal = sorted[0]?.total || 1;

      const rows = sorted.map(({m, iii, extr, total}) => {
        const pct    = Math.round(total / alumnos.length * 100);
        const barPct = Math.round(total / maxTotal * 100);
        return `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid var(--border);font-size:12px;color:var(--text)">${m}</td>
          <td style="padding:6px 10px;border-bottom:1px solid var(--border);min-width:160px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <div style="flex:1;background:var(--surface2);border-radius:3px;height:6px;overflow:hidden;">
                <div style="width:${barPct}%;height:6px;background:var(--yellow);border-radius:3px;"></div>
              </div>
              <span style="font-family:inherit;font-size:12px;font-weight:700;color:var(--yellow);min-width:20px;text-align:right">${total}</span>
              <span style="font-size:10px;color:var(--text3);min-width:30px">${pct}%</span>
            </div>
          </td>
          ${isBachNivel ? `
          <td style="padding:6px 10px;border-bottom:1px solid var(--border);text-align:center;font-size:11px;color:var(--yellow);font-weight:600">${iii||'—'}</td>
          <td style="padding:6px 10px;border-bottom:1px solid var(--border);text-align:center;font-size:11px;color:var(--orange);font-weight:600">${extr||'—'}</td>
          ` : ''}
        </tr>`;
      }).join('');

      return `<div style="margin-bottom:12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;">
        <div style="padding:9px 14px;background:var(--surface2);border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
          <span style="font-size:13px;font-weight:700;color:var(--text)">${n}</span>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <span style="font-size:11px;color:var(--text3)">${conPend} alumno${conPend!==1?'s':''} con pendientes · ${sorted.length} materia${sorted.length!==1?'s':''}</span>
            <button onclick="printPendientesNivel('${n.replace(/'/g,"\\'")}')" style="padding:3px 12px;border-radius:6px;border:1px solid var(--yellow);background:rgba(245,200,66,0.1);color:var(--yellow);font-family:inherit;font-size:10px;font-weight:700;cursor:pointer;">🖨 Informe ${n}</button>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr>
            <th style="${thS}text-align:left;">Materia</th>
            <th style="${thS}">Alumnos con pendiente</th>
            ${isBachNivel ? `<th style="${thS}color:var(--yellow);text-align:center;">III Ev.</th><th style="${thS}color:var(--orange);text-align:center;">Extr.</th>` : ''}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    }).filter(Boolean);

    // Always render the block (shows "sin datos" per nivel if empty)
    html += `<div class="resumen-block">
      <div class="resumen-block-title" style="justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <span>📚 Materias con más alumnos pendientes — por nivel</span>
        <button onclick="printPendientesReport()" style="padding:4px 14px;border-radius:7px;border:1px solid var(--yellow);background:rgba(245,200,66,0.12);color:var(--yellow);font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;text-transform:none;letter-spacing:0;">🖨 Informe pendientes</button>
      </div>
      <div>${nivelRows.length ? nivelRows.join('') : '<div style="padding:20px;text-align:center;color:var(--text3);font-size:13px;">Sin datos — añade alumnos y registra sus materias pendientes</div>'}</div>
    </div>`;
  })();

  html += `</div>`; // end resumen-body
  mc.innerHTML = html;

  // Make resumen-block titles collapsible
  mc.querySelectorAll('.resumen-block-title').forEach(title => {
    // Add collapse icon
    const icon = document.createElement('span');
    icon.className = 'collapse-icon';
    icon.textContent = '▾';
    title.classList.add('collapsible');
    title.appendChild(icon);
    // Wrap next sibling content
    const block = title.parentElement;
    const body = document.createElement('div');
    body.className = 'resumen-block-body';
    while (title.nextSibling) body.appendChild(title.nextSibling);
    block.appendChild(body);
    title.addEventListener('click', () => {
      const collapsed = body.classList.toggle('collapsed');
      icon.classList.toggle('closed', collapsed);
    });
  });
}

// ===================== DEFINICIÓN DE UNIDADES VACANTES =====================
// A partir del alumnado que promociona/titula (según la II Evaluación o la
// Evaluación Final) calcula las unidades (grupos) previstas para el curso
// siguiente. Reglas: ratio 30 en ESO y 35 en Bachillerato; el alumnado que
// vota Castellano forma línea aparte (el resto, Valenciano + sin voto, va a la
// línea de Valenciano); PAC (2º ESO) y PDC (3º/4º ESO) forman grupo aparte.

function _vacMergeCfg(src) {
  if (!src || typeof src !== 'object') return;
  if (src.ratioESO  != null) _vacantesCfg.ratioESO  = +src.ratioESO  || _vacantesCfg.ratioESO;
  if (src.ratioBach != null) _vacantesCfg.ratioBach = +src.ratioBach || _vacantesCfg.ratioBach;
  if (src.nuevos1ESO && typeof src.nuevos1ESO === 'object') {
    _vacantesCfg.nuevos1ESO.cast = +src.nuevos1ESO.cast || 0;
    _vacantesCfg.nuevos1ESO.val  = +src.nuevos1ESO.val  || 0;
  }
  if (src.ext1BachCient != null) _vacantesCfg.ext1BachCient = +src.ext1BachCient || 0;
  if (src.ext1BachHS    != null) _vacantesCfg.ext1BachHS    = +src.ext1BachHS    || 0;
}

// Especialidad de Bachillerato a partir del nombre de grupo (Científico A/B → Científico, etc.)
function _bachEspecialidad(grupo) {
  const g = (grupo || '').toLowerCase();
  if (g.includes('cient')) return 'Científico';
  if (g.includes('hum') || g.includes('social') || /\bhs\b/.test(g)) return 'Humanístico-Social';
  return null;
}

// Localiza el nombre real de cada nivel dentro de NIVELES (por si se renombran)
function _vacNiv(re, fallback) { return NIVELES.find(n => re.test(n)) || fallback; }

function computeVacantes(propField) {
  const rESO  = +_vacantesCfg.ratioESO  || 30;
  const rBach = +_vacantesCfg.ratioBach || 35;
  const tipoOf = a => getPropObj(a[propField]).tipo;
  const destOf = a => getPropObj(a[propField]).destino;
  const esPromo  = a => tipoOf(a) === 'Promoción';
  const esTitula = a => tipoOf(a) === 'Titulación';
  const esRepite = a => ['Repetición','No Promociona','No Titula'].includes(tipoOf(a));
  const saleDelCentro = a => ['FPB','CFGM'].includes(destOf(a)); // dejan la vía ordinaria de ESO
  const lang = a => a.lenguaBase === 'Castellano' ? 'cast' : 'val'; // "val" absorbe Valenciano + sin voto
  const ceil = (n, r) => n > 0 ? Math.ceil(n / r) : 0;

  const N1ESO = _vacNiv(/^1º?\s*ESO/i, '1º ESO');
  const N2ESO = _vacNiv(/^2º?\s*ESO/i, '2º ESO');
  const N3ESO = _vacNiv(/^3º?\s*ESO/i, '3º ESO');
  const N4ESO = _vacNiv(/^4º?\s*ESO/i, '4º ESO');
  const N1BAC = _vacNiv(/1º?\s*Bach/i, '1º Bach.');
  const N2BAC = _vacNiv(/2º?\s*Bach/i, '2º Bach.');

  const alumnosDe = (nivel) => (GRUPOS_POR_NIVEL[nivel] || [])
    .flatMap(g => (data[nivel]?.[g] || []).filter(a => a.nombre && a.nombre.trim()).map(a => ({ ...a, _grupo: g })));

  // Curso ESO ordinario: promoción del curso anterior + repetidores del propio curso
  function esoCurso(target, prevNivel, divDest, divLabel) {
    const prev   = prevNivel ? alumnosDe(prevNivel) : [];
    const propio = alumnosDe(target);
    const promueven = prev.filter(a => esPromo(a) && !saleDelCentro(a));
    const repiten   = propio.filter(a => esRepite(a) && !saleDelCentro(a));
    const regProm = promueven.filter(a => destOf(a) !== divDest);
    const regRep  = repiten.filter(a => destOf(a) !== divDest);
    const divTot  = promueven.filter(a => destOf(a) === divDest).length
                  + repiten.filter(a => destOf(a) === divDest).length;
    const reg = [...regProm, ...regRep];
    const cast = reg.filter(a => lang(a) === 'cast').length;
    const val  = reg.filter(a => lang(a) === 'val').length;
    const sinVoto = reg.filter(a => lang(a) === 'val' && (!a.lenguaBase || a.lenguaBase === '')).length;
    const fueraFPB = prev.filter(a => esPromo(a) && saleDelCentro(a)).length;
    return {
      target, prevNivel,
      promueven: regProm.length, repiten: regRep.length, total: reg.length,
      cast, val, sinVoto, castU: ceil(cast, rESO), valU: ceil(val, rESO),
      divTot, divLabel, divUnits: divTot > 0 ? 1 : 0, fueraFPB
    };
  }

  // 1º ESO: entrada nueva (manual, CEIP adscritos) + repetidores de 1º ESO de este curso
  const nu = _vacantesCfg.nuevos1ESO || { cast: 0, val: 0 };
  const nuCast = +nu.cast || 0, nuVal = +nu.val || 0;
  const rep1 = alumnosDe(N1ESO).filter(a => esRepite(a) && !saleDelCentro(a));
  const rep1Cast = rep1.filter(a => lang(a) === 'cast').length;
  const rep1Val  = rep1.filter(a => lang(a) === 'val').length;
  const rep1SinVoto = rep1.filter(a => lang(a) === 'val' && (!a.lenguaBase || a.lenguaBase === '')).length;
  const cast1 = nuCast + rep1Cast, val1 = nuVal + rep1Val;
  const primESO = {
    target: N1ESO, manual: true,
    nuCast, nuVal, rep1Cast, rep1Val, rep1SinVoto,
    cast: cast1, val: val1, total: cast1 + val1,
    castU: ceil(cast1, rESO), valU: ceil(val1, rESO)
  };

  const segESO = esoCurso(N2ESO, N1ESO, '2 PAC', N2ESO + ' PAC');
  const terESO = esoCurso(N3ESO, N2ESO, '3º PDC', '3º PDC');
  const cuaESO = esoCurso(N4ESO, N3ESO, '4º PDC', '4º PDC');

  // 1º Bachillerato: titulación de 4º ESO por destino + externos (manual)
  const c4 = alumnosDe(N4ESO);
  const titCient = c4.filter(a => esTitula(a) && destOf(a) === '1º Bachillerato Científico').length;
  const titHS    = c4.filter(a => esTitula(a) && destOf(a) === '1º Bachillerato HS').length;
  const eC = +_vacantesCfg.ext1BachCient || 0, eH = +_vacantesCfg.ext1BachHS || 0;
  const primBach = {
    cient: { tit: titCient, ext: eC, total: titCient + eC, units: ceil(titCient + eC, rBach) },
    hs:    { tit: titHS,    ext: eH, total: titHS + eH,    units: ceil(titHS + eH, rBach) }
  };

  // 2º Bachillerato: promoción por especialidad de 1º Bach + repetidores de 2º Bach
  const b1 = alumnosDe(N1BAC), b2 = alumnosDe(N2BAC);
  const promEsp = esp => b1.filter(a => esPromo(a) && _bachEspecialidad(a._grupo) === esp).length;
  const repEsp  = esp => b2.filter(a => esRepite(a) && _bachEspecialidad(a._grupo) === esp).length;
  const segBach = { cient: {}, hs: {} };
  segBach.cient.prom = promEsp('Científico');
  segBach.cient.rep  = repEsp('Científico');
  segBach.cient.total = segBach.cient.prom + segBach.cient.rep;
  segBach.cient.units = ceil(segBach.cient.total, rBach);
  segBach.hs.prom = promEsp('Humanístico-Social');
  segBach.hs.rep  = repEsp('Humanístico-Social');
  segBach.hs.total = segBach.hs.prom + segBach.hs.rep;
  segBach.hs.units = ceil(segBach.hs.total, rBach);

  return { rESO, rBach, primESO, segESO, terESO, cuaESO, primBach, segBach };
}

function _vacInput(label, value, onchange) {
  return `<label style="display:flex;flex-direction:column;gap:4px;font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;font-weight:700">
    ${label}
    <input type="number" min="0" value="${value}" onchange="${onchange}" onfocus="this.select()"
      style="width:90px;background:var(--surface2);border:1px solid var(--border);border-radius:7px;color:var(--text);padding:7px 10px;font-family:inherit;font-size:14px;font-weight:600;text-align:center"/>
  </label>`;
}

function _vacSet(path, value) {
  const num = Math.max(0, Math.round(+value || 0));
  if (path === 'ratioESO')  _vacantesCfg.ratioESO  = num || 1;
  else if (path === 'ratioBach') _vacantesCfg.ratioBach = num || 1;
  else if (path === 'nuevos1ESO.cast') _vacantesCfg.nuevos1ESO.cast = num;
  else if (path === 'nuevos1ESO.val')  _vacantesCfg.nuevos1ESO.val  = num;
  else if (path === 'ext1BachCient') _vacantesCfg.ext1BachCient = num;
  else if (path === 'ext1BachHS')    _vacantesCfg.ext1BachHS    = num;
  markDirty();
  renderVacantes();
}

function renderVacantes() {
  const mc = document.getElementById('mainContent');
  if (!mc) return;
  const cfg = _vacantesCfg;

  const section = (propField, titulo, icono, color) => {
    const v = computeVacantes(propField);

    // Tarjeta ESO ordinaria
    const esoCard = (r) => {
      const unidades = r.castU + r.valU;
      const pctBar = (n) => r.total ? Math.round(n / r.total * 100) : 0;
      return `<div class="nivel-summary-card">
        <div class="nivel-summary-header">
          <span class="nivel-summary-name">${r.target}</span>
          <span class="nivel-summary-meta">${r.total} alumnos · <strong style="color:${color}">${unidades} unidad${unidades!==1?'es':''}</strong>${r.divUnits?` (+1 ${r.divLabel})`:''}</span>
        </div>
        <div style="padding:7px 14px 2px;font-size:11px;color:var(--text2);display:flex;gap:12px;flex-wrap:wrap">
          <span>↑ ${r.promueven} promocionan de ${r.prevNivel}</span>
          <span style="color:var(--red)">↻ ${r.repiten} repiten</span>
          ${r.fueraFPB?`<span style="color:var(--orange)">→ ${r.fueraFPB} a FPB (no computan)</span>`:''}
        </div>
        <div class="nivel-summary-rows">
          <div class="nivel-summary-row">
            <span class="ns-label">🟦 Castellano</span>
            <div class="ns-bar-wrap"><div class="ns-bar" style="width:${pctBar(r.cast)}%;background:var(--accent)"></div></div>
            <span class="ns-num" style="color:var(--accent)">${r.cast}</span>
            <span class="ns-pct" style="min-width:60px;color:var(--accent);font-weight:700">${r.castU} unid.</span>
          </div>
          <div class="nivel-summary-row">
            <span class="ns-label">🟩 Valenciano${r.sinVoto?` <span style="color:var(--text3);font-weight:400">(+${r.sinVoto} sin voto)</span>`:''}</span>
            <div class="ns-bar-wrap"><div class="ns-bar" style="width:${pctBar(r.val)}%;background:var(--green)"></div></div>
            <span class="ns-num" style="color:var(--green)">${r.val}</span>
            <span class="ns-pct" style="min-width:60px;color:var(--green);font-weight:700">${r.valU} unid.</span>
          </div>
          ${r.divTot?`<div class="nivel-summary-row">
            <span class="ns-label" style="color:var(--purple)">🎯 ${r.divLabel}</span>
            <div class="ns-bar-wrap"><div class="ns-bar" style="width:100%;background:var(--purple);opacity:0.5"></div></div>
            <span class="ns-num" style="color:var(--purple)">${r.divTot}</span>
            <span class="ns-pct" style="min-width:60px;color:var(--purple);font-weight:700">1 grupo</span>
          </div>`:''}
        </div>
      </div>`;
    };

    // 1º ESO (manual)
    const p = v.primESO;
    const u1 = p.castU + p.valU;
    const primCard = `<div class="nivel-summary-card">
      <div class="nivel-summary-header">
        <span class="nivel-summary-name">${p.target}</span>
        <span class="nivel-summary-meta">${p.total} alumnos · <strong style="color:${color}">${u1} unidad${u1!==1?'es':''}</strong></span>
      </div>
      <div style="padding:7px 14px 2px;font-size:11px;color:var(--text2);display:flex;gap:12px;flex-wrap:wrap">
        <span>🏫 ${p.nuCast + p.nuVal} nueva entrada (manual)</span>
        <span style="color:var(--red)">↻ ${p.rep1Cast + p.rep1Val} repiten 1º ESO</span>
      </div>
      <div class="nivel-summary-rows">
        <div class="nivel-summary-row">
          <span class="ns-label">🟦 Castellano <span style="color:var(--text3);font-weight:400">(${p.nuCast} nuevos + ${p.rep1Cast} repiten)</span></span>
          <span class="ns-num" style="color:var(--accent)">${p.cast}</span>
          <span class="ns-pct" style="min-width:60px;color:var(--accent);font-weight:700">${p.castU} unid.</span>
        </div>
        <div class="nivel-summary-row">
          <span class="ns-label">🟩 Valenciano <span style="color:var(--text3);font-weight:400">(${p.nuVal} nuevos + ${p.rep1Val} repiten${p.rep1SinVoto?`, ${p.rep1SinVoto} sin voto`:''})</span></span>
          <span class="ns-num" style="color:var(--green)">${p.val}</span>
          <span class="ns-pct" style="min-width:60px;color:var(--green);font-weight:700">${p.valU} unid.</span>
        </div>
      </div>
    </div>`;

    // 1º Bach
    const b = v.primBach;
    const bachCard = (esp, d, col, icon) => `<div class="nivel-summary-card">
      <div class="nivel-summary-header">
        <span class="nivel-summary-name">${icon} 1º Bach. ${esp}</span>
        <span class="nivel-summary-meta">${d.total} alumnos · <strong style="color:${col}">${d.units} unidad${d.units!==1?'es':''}</strong></span>
      </div>
      <div class="nivel-summary-rows">
        <div class="nivel-summary-row"><span class="ns-label">🎓 Titulan de 4º ESO</span><span class="ns-num" style="color:${col}">${d.tit}</span><span class="ns-pct"></span></div>
        <div class="nivel-summary-row"><span class="ns-label">➕ Externos (adscritos)</span><span class="ns-num" style="color:${col}">${d.ext}</span><span class="ns-pct"></span></div>
        <div class="nivel-summary-row" style="border-top:1px solid var(--border)"><span class="ns-label" style="font-weight:700">Total</span><span class="ns-num" style="color:${col}">${d.total}</span><span class="ns-pct" style="min-width:60px;color:${col};font-weight:700">${d.units} unid.</span></div>
      </div>
    </div>`;

    // 2º Bach
    const s = v.segBach;
    const seg2Card = (esp, d, col, icon) => `<div class="nivel-summary-card">
      <div class="nivel-summary-header">
        <span class="nivel-summary-name">${icon} 2º Bach. ${esp}</span>
        <span class="nivel-summary-meta">${d.total} alumnos · <strong style="color:${col}">${d.units} unidad${d.units!==1?'es':''}</strong></span>
      </div>
      <div class="nivel-summary-rows">
        <div class="nivel-summary-row"><span class="ns-label">↑ Promocionan de 1º Bach.</span><span class="ns-num" style="color:${col}">${d.prom}</span><span class="ns-pct"></span></div>
        <div class="nivel-summary-row"><span class="ns-label" style="color:var(--red)">↻ Repiten 2º Bach.</span><span class="ns-num" style="color:var(--red)">${d.rep}</span><span class="ns-pct"></span></div>
        <div class="nivel-summary-row" style="border-top:1px solid var(--border)"><span class="ns-label" style="font-weight:700">Total</span><span class="ns-num" style="color:${col}">${d.total}</span><span class="ns-pct" style="min-width:60px;color:${col};font-weight:700">${d.units} unid.</span></div>
      </div>
    </div>`;

    const totalUnidades =
      p.castU + p.valU +
      v.segESO.castU + v.segESO.valU + v.segESO.divUnits +
      v.terESO.castU + v.terESO.valU + v.terESO.divUnits +
      v.cuaESO.castU + v.cuaESO.valU + v.cuaESO.divUnits +
      b.cient.units + b.hs.units + s.cient.units + s.hs.units;

    return `<div class="resumen-block">
      <div class="resumen-block-title" style="color:${color}">${icono} ${titulo}</div>
      <div style="font-size:12px;color:var(--text2);margin:-2px 0 14px;">Total previsto: <strong style="color:${color}">${totalUnidades} unidades</strong> &nbsp;·&nbsp; ratio ESO ${v.rESO} &nbsp;·&nbsp; ratio Bach. ${v.rBach}</div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);font-weight:700;margin:6px 0 8px">ESO (ratio ${v.rESO})</div>
      <div class="nivel-summary-grid">
        ${primCard}
        ${esoCard(v.segESO)}
        ${esoCard(v.terESO)}
        ${esoCard(v.cuaESO)}
      </div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);font-weight:700;margin:18px 0 8px">Bachillerato (ratio ${v.rBach})</div>
      <div class="nivel-summary-grid">
        ${bachCard('Científico', b.cient, 'var(--accent)', '🔬')}
        ${bachCard('Humanístico-Social', b.hs, 'var(--green)', '📚')}
        ${seg2Card('Científico', s.cient, 'var(--accent)', '🔬')}
        ${seg2Card('Humanístico-Social', s.hs, 'var(--green)', '📚')}
      </div>
    </div>`;
  };

  const cfgPanel = `<div class="resumen-block">
    <div class="resumen-block-title">⚙️ Parámetros de cálculo</div>
    <div style="display:flex;flex-wrap:wrap;gap:18px;align-items:flex-end">
      ${_vacInput('Ratio ESO', cfg.ratioESO, "_vacSet('ratioESO',this.value)")}
      ${_vacInput('Ratio Bachillerato', cfg.ratioBach, "_vacSet('ratioBach',this.value)")}
      <div style="border-left:1px solid var(--border);padding-left:18px;display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end">
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;width:100%;font-weight:700;margin-bottom:-4px">Nueva entrada 1º ESO (CEIP adscritos)</div>
        ${_vacInput('Castellano', cfg.nuevos1ESO.cast, "_vacSet('nuevos1ESO.cast',this.value)")}
        ${_vacInput('Valenciano', cfg.nuevos1ESO.val, "_vacSet('nuevos1ESO.val',this.value)")}
      </div>
      <div style="border-left:1px solid var(--border);padding-left:18px;display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end">
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;width:100%;font-weight:700;margin-bottom:-4px">Externos 1º Bach. (La Font d'en Carròs · Sta. Ana)</div>
        ${_vacInput('Científico', cfg.ext1BachCient, "_vacSet('ext1BachCient',this.value)")}
        ${_vacInput('Hum.-Social', cfg.ext1BachHS, "_vacSet('ext1BachHS',this.value)")}
      </div>
    </div>
  </div>`;

  mc.innerHTML = `<div class="resumen-body">
    <div style="margin-bottom:18px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
      <div style="flex:1;min-width:300px">
        <div style="font-family:inherit;font-size:22px;font-weight:800;color:var(--text)">🏗️ Definición de Unidades Vacantes</div>
        <div style="font-size:12px;color:var(--text2);margin-top:6px;max-width:900px;line-height:1.5">Previsión de grupos para el curso siguiente a partir del alumnado que promociona/titula. El alumnado que vota <strong>Castellano</strong> forma línea aparte; el resto (<strong>Valenciano</strong> y sin voto) va a la línea de Valenciano. <strong>PAC</strong> (2º ESO) y <strong>PDC</strong> (3º/4º ESO) forman grupo aparte. Cada curso suma los repetidores del propio nivel; el alumnado a FPB/CFGM no ocupa plaza en el curso ordinario.</div>
      </div>
      <button onclick="printVacantes()" class="btn btn-primary" style="white-space:nowrap;font-size:13px;padding:9px 16px">🖨 Imprimir / PDF</button>
    </div>
    ${cfgPanel}
    ${section('propuesta2','Según la II Evaluación','📋','var(--orange)')}
    ${section('promociona','Según la Evaluación Final','✅','var(--green)')}
  </div>`;
}

function printVacantes() {
  const iesName = document.getElementById('headerIesName')?.value || 'Centro Educativo';
  const dateStr = new Date().toLocaleDateString('es-ES',{year:'numeric',month:'long',day:'numeric'});
  const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const sectionHtml = (propField, titulo) => {
    const v = computeVacantes(propField);
    const b = v.primBach, s = v.segBach;
    const totalUnidades =
      v.primESO.castU + v.primESO.valU +
      v.segESO.castU + v.segESO.valU + v.segESO.divUnits +
      v.terESO.castU + v.terESO.valU + v.terESO.divUnits +
      v.cuaESO.castU + v.cuaESO.valU + v.cuaESO.divUnits +
      b.cient.units + b.hs.units + s.cient.units + s.hs.units;

    const esoRow = (r) => {
      const u = r.castU + r.valU;
      return `<tr>
        <td style="font-weight:700">${esc(r.target)}</td>
        <td style="text-align:center">${r.promueven} <span style="color:#888;font-size:8pt">(${esc(r.prevNivel)})</span></td>
        <td style="text-align:center">${r.repiten}</td>
        <td style="text-align:center">${r.cast} · <b>${r.castU}u</b></td>
        <td style="text-align:center">${r.val} · <b>${r.valU}u</b></td>
        <td style="text-align:center">${r.divTot?`${r.divTot} ${esc(r.divLabel)} · 1u`:'—'}</td>
        <td style="text-align:center;font-weight:700;color:#1a3a6b">${u}${r.divUnits?' (+1)':''}</td>
      </tr>`;
    };
    const p = v.primESO, u1 = p.castU + p.valU;
    const primRow = `<tr>
      <td style="font-weight:700">${esc(p.target)}</td>
      <td style="text-align:center">${p.nuCast + p.nuVal} <span style="color:#888;font-size:8pt">(nueva entrada)</span></td>
      <td style="text-align:center">${p.rep1Cast + p.rep1Val}</td>
      <td style="text-align:center">${p.cast} · <b>${p.castU}u</b></td>
      <td style="text-align:center">${p.val} · <b>${p.valU}u</b></td>
      <td style="text-align:center">—</td>
      <td style="text-align:center;font-weight:700;color:#1a3a6b">${u1}</td>
    </tr>`;
    const bachRow = (name, comp, total, units) => `<tr>
      <td style="font-weight:700">${esc(name)}</td>
      <td colspan="4" style="font-size:9pt;color:#444">${esc(comp)}</td>
      <td style="text-align:center">${total}</td>
      <td style="text-align:center;font-weight:700;color:#5b2a91">${units}</td>
    </tr>`;

    return `
      <div style="margin-bottom:22px;page-break-inside:avoid">
        <div style="background:#1a3a6b;color:white;font-weight:700;padding:6px 12px;border-radius:4px 4px 0 0;font-size:10.5pt;display:flex;justify-content:space-between">
          <span>${esc(titulo)}</span><span style="font-weight:400;font-size:9.5pt">Total previsto: ${totalUnidades} unidades</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:9.5pt;margin-bottom:6px">
          <thead><tr style="background:#dce8f5">
            <th style="text-align:left">Curso</th><th>Promocionan</th><th>Repiten</th>
            <th>Castellano</th><th>Valenciano</th><th>PAC / PDC</th><th>Unidades</th>
          </tr></thead>
          <tbody>${primRow}${esoRow(v.segESO)}${esoRow(v.terESO)}${esoRow(v.cuaESO)}</tbody>
        </table>
        <table style="width:100%;border-collapse:collapse;font-size:9.5pt">
          <thead><tr style="background:#ece4fb">
            <th style="text-align:left">Bachillerato</th><th colspan="4">Procedencia</th><th>Alumnos</th><th>Unidades</th>
          </tr></thead>
          <tbody>
            ${bachRow('1º Bach. Científico', `Titulan 4º ESO: ${b.cient.tit}  +  externos: ${b.cient.ext}`, b.cient.total, b.cient.units)}
            ${bachRow('1º Bach. Humanístico-Social', `Titulan 4º ESO: ${b.hs.tit}  +  externos: ${b.hs.ext}`, b.hs.total, b.hs.units)}
            ${bachRow('2º Bach. Científico', `Promocionan 1º Bach.: ${s.cient.prom}  +  repiten: ${s.cient.rep}`, s.cient.total, s.cient.units)}
            ${bachRow('2º Bach. Humanístico-Social', `Promocionan 1º Bach.: ${s.hs.prom}  +  repiten: ${s.hs.rep}`, s.hs.total, s.hs.units)}
          </tbody>
        </table>
      </div>`;
  };

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Unidades Vacantes — ${esc(iesName)}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;font-size:10.5pt;color:#111;background:#fff}
      .page{padding:12mm 14mm}
      th,td{padding:5px 8px;border:1px solid #c0d0e0}
      th{color:#1a3a6b;font-size:8.5pt;text-transform:uppercase;letter-spacing:.3px}
      @media print{@page{margin:10mm 12mm;size:A4}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none}}
      .toolbar{position:sticky;top:0;background:#1a1d27;padding:9px 18px;display:flex;align-items:center;justify-content:space-between}
      .toolbar span{font-size:13px;font-weight:600;color:#e8eaf2}
      .tbtn{padding:6px 14px;border-radius:7px;border:none;cursor:pointer;font-family:Arial;font-size:12px;font-weight:600}
    </style></head><body>
    <div class="toolbar no-print">
      <span>🏗️ Definición de Unidades Vacantes — ${esc(iesName)}</span>
      <div style="display:flex;gap:8px">
        <button class="tbtn" style="background:#2563eb;color:white" onclick="window.print()">🖨️ Imprimir / PDF</button>
        <button class="tbtn" style="background:transparent;color:#8891b4;border:1px solid #2e3350" onclick="window.close()">✕</button>
      </div>
    </div>
    <div class="page">
      <div style="border-bottom:3px solid #1a3a6b;padding-bottom:10px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-end">
        <div>
          <div style="font-size:8pt;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Conselleria d'Educació · ${esc(iesName)}</div>
          <div style="font-size:14pt;font-weight:bold;color:#1a3a6b">Definición de Unidades Vacantes — curso siguiente</div>
          <div style="font-size:9.5pt;color:#4a5580;margin-top:2px">Ratio ESO ${esc(_vacantesCfg.ratioESO)} · Ratio Bachillerato ${esc(_vacantesCfg.ratioBach)}</div>
        </div>
        <div style="text-align:right;font-size:8.5pt;color:#888">${esc(dateStr)}</div>
      </div>
      ${sectionHtml('propuesta2','Según la II Evaluación')}
      ${sectionHtml('promociona','Según la Evaluación Final')}
      <div style="margin-top:14px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:8pt;color:#9ca3af;line-height:1.5">
        El alumnado de Castellano forma línea aparte; el resto (Valenciano y sin voto) va a la línea de Valenciano. PAC/PDC forman grupo aparte. El alumnado a FPB/CFGM no ocupa plaza en el curso ordinario. "u" = unidades. Documento generado por EvalIES el ${esc(dateStr)}.
      </div>
    </div>
    <script>window.onload=function(){}<\/script>
    </body></html>`;

  const win = _ventanaDoc();
  if (win) { win.document.write(html); win.document.close(); }
  else showToast('⚠ Permite las ventanas emergentes para imprimir');
}
