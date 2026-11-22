/* ============================================================================
   Gestor de Tutoría · Importar la lista de alumnado desde el Cuaderno del profesor
   tutoria/js/22-importar-del-cuaderno.js
   ============================================================================ */

/* Las dos aplicaciones viven en la misma dirección web, así que Tutoría puede
   LEER los datos que el Cuaderno guarda en este navegador (nunca los modifica).
   Se copian el nombre, la fecha de nacimiento, NESE y repetición; las notas de
   cada app siguen separadas.
   - Quien ya está en el grupo (por su identificador del Cuaderno, o por el
     nombre aunque esté en otro orden, en mayúsculas o sin tildes) no se
     duplica: se le COMPLETA lo que le falte (p. ej. la fecha de nacimiento).
   - Si un dato de Tutoría es distinto del del Cuaderno, solo se cambia si se
     marca «Sustituir los datos distintos».
   - Un nombre parecido pero no igual se propone para confirmarlo.
   Antes de aplicar se ve qué va a pasar con cada alumno/a, y todo se puede
   deshacer con Ctrl+Z. */

const _CUADERNO_CLAVE_LS = 'geohist_multigrupo_v1';   // = KEY en js/nucleo/utilidades.js
const _CUADERNO_IDB = 'cuaderno-profesor-db';         // = IDB_NOMBRE en js/nucleo/guardado-copias.js

function _nombreClave(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Copia interna del Cuaderno en IndexedDB. Si la base de datos no existe, se
// cancela su creación para no dejar una vacía que estropee la del Cuaderno.
function _leerEspejoCuaderno() {
  return new Promise(resolve => {
    if (!window.indexedDB) { resolve(null); return; }
    let req;
    try { req = indexedDB.open(_CUADERNO_IDB); } catch (e) { resolve(null); return; }
    req.onupgradeneeded = () => { try { req.transaction.abort(); } catch (e) {} };
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
    req.onsuccess = () => {
      const db = req.result;
      try {
        if (!db.objectStoreNames.contains('kv')) { db.close(); resolve(null); return; }
        const get = db.transaction('kv', 'readonly').objectStore('kv').get('estado');
        get.onsuccess = () => { db.close(); resolve(get.result || null); };
        get.onerror = () => { db.close(); resolve(null); };
      } catch (e) { db.close(); resolve(null); }
    };
  });
}

// Estado del Cuaderno: el más reciente entre el almacenamiento principal y su copia interna.
async function _leerEstadoCuaderno() {
  let principal = null;
  try { principal = JSON.parse(localStorage.getItem(_CUADERNO_CLAVE_LS)); } catch (e) {}
  let espejo = null;
  const esp = await _leerEspejoCuaderno();
  if (esp && esp.json) { try { espejo = JSON.parse(esp.json); espejo._guardadoEn = espejo._guardadoEn || esp.guardadoEn || 0; } catch (e) {} }
  if (principal && espejo) return (espejo._guardadoEn || 0) > (principal._guardadoEn || 0) + 1500 ? espejo : principal;
  return principal || espejo;
}

// Clave de un nombre sin importar el orden de las palabras, las mayúsculas, las
// tildes ni las comas: «GARCÍA LÓPEZ, Ana» = «Ana García López».
function _nombreClavePalabras(s) {
  return _tPalabras(s).sort().join(' ');
}

// Fecha del Cuaderno en el formato de Tutoría (AAAA-MM-DD); acepta también DD/MM/AAAA.
function _fechaDelCuaderno(f) {
  f = String(f || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(f)) return f;
  const m = f.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';
}

// Datos que el Cuaderno aporta a la ficha de Tutoría. Solo cuentan los que el
// Cuaderno tiene (un «No» del Cuaderno puede ser solo que no se rellenó).
const _IMP_CAMPOS = [
  { campo: 'fecha',     etiqueta: 'fecha de nacimiento', valor: c => _fechaDelCuaderno(c.fechaNacimiento), ver: v => fmtDate(v) },
  { campo: 'nese',      etiqueta: 'NESE',                valor: c => (c.nese ? 'Sí' : ''),                  ver: v => v },
  { campo: 'repetidor', etiqueta: 'repite',              valor: c => (c.repetidor ? 'Sí' : ''),             ver: v => v },
];

/* Qué pasaría al importar el grupo del Cuaderno «gc» en nivel/grupo, sin cambiar nada.
   Devuelve una fila por alumno/a del Cuaderno:
     tipo 'existe' (i = posición en Tutoría) o 'nuevo';
     completar: campos vacíos en Tutoría que se rellenan;
     distintos: campos con otro valor en Tutoría (solo se cambian si se pide);
     propuesta: {idx, parecido} si hay alguien con un nombre parecido (hay que confirmarlo);
     vincular: si hay que apuntarle el identificador del Cuaderno.
   «confirmados» (Map nombre del Cuaderno → posición en Tutoría) son las propuestas aceptadas. */
function _planImportarCuaderno(nivel, grupo, gc, confirmados) {
  const lista = (data[nivel] && data[nivel][grupo]) || [];
  const porId = new Map(), porNombre = new Map(), porPalabras = new Map();
  lista.forEach((a, i) => {
    (a.idsCuaderno || []).forEach(id => { if (!porId.has(String(id))) porId.set(String(id), i); });
    const k = _nombreClave(a.nombre), kp = _nombreClavePalabras(a.nombre);
    if (k && !porNombre.has(k)) porNombre.set(k, i);
    if (kp && !porPalabras.has(kp)) porPalabras.set(kp, i);
  });
  const usados = new Set();
  const libre = i => (i != null && !usados.has(i)) ? i : undefined;
  // 1.º Coincidencias seguras: identificador del Cuaderno, nombre igual, mismas palabras en otro orden.
  const filas = ((gc && gc.alumnos) || []).filter(c => String(c.nombre || '').trim()).map(c => {
    const nombre = String(c.nombre).trim();
    let i = c.id != null ? libre(porId.get(String(c.id))) : undefined;
    if (i == null) i = libre(porNombre.get(_nombreClave(nombre)));
    if (i == null) i = libre(porPalabras.get(_nombreClavePalabras(nombre)));
    if (i != null) usados.add(i);
    return { c, nombre, i, tipo: i != null ? 'existe' : 'nuevo' };
  });
  // 2.º Nombres parecidos (Lopes ↔ López, Ana ↔ Ana María): se proponen, no se dan por buenos.
  filas.forEach(f => {
    if (f.i != null) return;
    let mejor = -1, nota = 0;
    lista.forEach((a, j) => { if (usados.has(j)) return; const v = _tSimilitud(f.nombre, a.nombre); if (v > nota) { nota = v; mejor = j; } });
    if (mejor < 0 || nota < _T_SIM_PROPONER) return;
    usados.add(mejor);
    f.propuesta = { idx: mejor, parecido: nota };
    if (confirmados && confirmados.get(f.nombre) === mejor) { f.i = mejor; f.tipo = 'existe'; }
  });
  // 3.º Qué cambia en cada uno.
  filas.forEach(f => {
    const a = f.i != null ? lista[f.i] : null;
    f.completar = []; f.distintos = [];
    _IMP_CAMPOS.forEach(k => {
      const v = k.valor(f.c);
      if (!v || !a) return;
      const actual = String(a[k.campo] == null ? '' : a[k.campo]);
      if (!actual) f.completar.push({ k, v });
      else if (actual !== v) f.distintos.push({ k, v, actual });
    });
    f.vincular = !!(a && f.c.id != null && !(a.idsCuaderno || []).map(String).includes(String(f.c.id)));
  });
  return filas;
}

// Propuestas de nombre parecido que se marcan de entrada (parecido muy alto).
function _impConfirmadosIniciales(nivel, grupo, gc) {
  const m = new Map();
  _planImportarCuaderno(nivel, grupo, gc, null).forEach(f => { if (f.propuesta && f.propuesta.parecido >= _T_SIM_MARCAR) m.set(f.nombre, f.propuesta.idx); });
  return m;
}

// Resumen de un plan: cuántos nuevos, completados, distintos…
function _impResumen(filas, sustituir) {
  const r = { nuevos: 0, completados: 0, distintos: 0, alDia: 0, dudas: 0, vincular: 0 };
  filas.forEach(f => {
    if (f.tipo === 'nuevo') { r.nuevos++; if (f.propuesta) r.dudas++; return; }
    if (f.completar.length) r.completados++;
    if (f.distintos.length) r.distintos++;
    if (f.vincular) r.vincular++;
    if (!f.completar.length && !(sustituir && f.distintos.length)) r.alDia++;
  });
  return r;
}

async function abrirImportarDelCuaderno(nivel, grupo) {
  const estado = await _leerEstadoCuaderno();
  const grupos = ((estado && estado.grupos) || []).filter(g => (g.alumnos || []).length);
  if (!grupos.length) {
    mostrarAviso('No hay alumnado en el Cuaderno del profesor de este navegador.\n\nAñade antes la lista de tu grupo en el Cuaderno (desde el mismo dispositivo y la misma dirección web) y vuelve a intentarlo.', 'Importar del Cuaderno');
    return;
  }
  // Grupo del Cuaderno que se propone: el que más alumnado comparte con este; si no, el de nombre más parecido.
  const objetivo = `${nivel} ${grupo}`;
  let elegido = 0, mejor = -1;
  grupos.forEach((g, i) => {
    const comunes = _planImportarCuaderno(nivel, grupo, g, null).filter(f => f.tipo === 'existe').length;
    const puntos = comunes * 10 + _tSimilitud(g.nombre || '', objetivo);
    if (puntos > mejor) { mejor = puntos; elegido = i; }
  });

  const ov = document.createElement('div');
  ov.className = 'modal-overlay open';
  ov.id = 'importCuadernoOverlay';
  ov.innerHTML = `
    <div class="modal" style="width:600px;max-width:96vw;max-height:88vh;overflow:auto" role="dialog" aria-modal="true" aria-labelledby="impCuadTitulo">
      <div class="modal-title" id="impCuadTitulo">📥 Importar alumnado del Cuaderno</div>
      <p style="font-size:13px;color:var(--text2);margin:0 0 12px">
        A <strong>${_tEsc(nivel)} ${_tEsc(grupo)}</strong> se añade quien falte y, a quien ya está, se le completa
        lo que no tenga: <strong>fecha de nacimiento, NESE y repetición</strong>. Nadie se duplica ni se borra,
        y las notas del Cuaderno no se copian.
      </p>
      <fieldset style="border:0;padding:0;margin:0">
        <legend class="modal-label" style="margin-bottom:6px">Grupo del Cuaderno</legend>
        ${grupos.map((g, i) => `<label style="display:flex;gap:10px;align-items:center;padding:8px 10px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;cursor:pointer">
            <input type="radio" name="impCuadGrupo" value="${i}" ${i === elegido ? 'checked' : ''}>
            <span style="flex:1">${_tEsc(g.nombre || 'Grupo sin nombre')}</span>
            <span style="font-size:12px;color:var(--text2)">${g.alumnos.length} alumnos</span>
          </label>`).join('')}
      </fieldset>
      <div id="impCuadPlan" aria-live="polite" style="margin-top:12px"></div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
        <button type="button" class="btn btn-ghost" data-accion="cancelar">Cancelar</button>
        <button type="button" class="btn btn-primary" data-accion="importar">Importar</button>
      </div>
    </div>`;
  document.body.appendChild(ov);

  let confirmados = new Map(), grupoDeConfirmados = -1, sustituir = false;
  const grupoSel = () => { const sel = ov.querySelector('input[name="impCuadGrupo"]:checked'); return Number(sel ? sel.value : 0); };
  const plan = () => {
    const gi = grupoSel();
    if (gi !== grupoDeConfirmados) { grupoDeConfirmados = gi; confirmados = _impConfirmadosIniciales(nivel, grupo, grupos[gi]); }
    return _planImportarCuaderno(nivel, grupo, grupos[gi], confirmados);
  };
  const lista = data[nivel][grupo] || [];
  const pintar = () => {
    const filas = plan(), r = _impResumen(filas, sustituir);
    const cambio = x => `${x.k.etiqueta} <strong>${_tEsc(x.k.ver(x.v))}</strong>`;
    const linea = (icono, nombre, texto, color) => `<li style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);font-size:12.5px">
        <span aria-hidden="true">${icono}</span><span style="flex:1"><strong>${_tEsc(nombre)}</strong><br><span style="color:${color || 'var(--text2)'}">${texto}</span></span></li>`;
    const dudas = filas.filter(f => f.propuesta);
    const conCambios = filas.filter(f => f.tipo === 'nuevo' || f.completar.length || f.distintos.length);
    const sinCambios = filas.filter(f => !conCambios.includes(f));
    const partes = [];
    partes.push(`<div style="display:flex;flex-wrap:wrap;gap:6px;font-size:12.5px;margin-bottom:8px">
      <span class="nese-pill" style="cursor:default">➕ ${r.nuevos} nuevo${r.nuevos === 1 ? '' : 's'}</span>
      <span class="nese-pill" style="cursor:default">✏️ ${r.completados} se completa${r.completados === 1 ? '' : 'n'}</span>
      ${r.distintos ? `<span class="nese-pill" style="cursor:default">⚠️ ${r.distintos} con datos distintos</span>` : ''}
      <span class="nese-pill" style="cursor:default">✓ ${sinCambios.length} ya al día</span></div>`);
    if (dudas.length) {
      partes.push(`<div style="font-size:12.5px;margin:8px 0 4px"><strong>¿Son la misma persona?</strong> El nombre no coincide exactamente. Si no lo marcas, se añade como alumno/a nuevo:</div>` +
        dudas.map(f => `<label style="display:flex;gap:8px;align-items:center;margin-top:4px;cursor:pointer;font-size:12.5px">
          <input type="checkbox" data-duda="${_tEsc(f.nombre)}" data-idx="${f.propuesta.idx}" ${confirmados.get(f.nombre) === f.propuesta.idx ? 'checked' : ''}>
          <span>«${_tEsc(f.nombre)}» (Cuaderno) = «${_tEsc(lista[f.propuesta.idx].nombre)}» (Tutoría)</span></label>`).join(''));
    }
    if (r.distintos) {
      partes.push(`<label style="display:flex;gap:8px;align-items:center;margin-top:10px;cursor:pointer;font-size:12.5px">
        <input type="checkbox" id="impCuadSustituir" ${sustituir ? 'checked' : ''}>
        <span>Sustituir los datos distintos por los del Cuaderno (si no, se deja lo que hay en Tutoría)</span></label>`);
    }
    if (conCambios.length) {
      partes.push(`<ul style="list-style:none;margin:10px 0 0;padding:0;max-height:34vh;overflow:auto">` + conCambios.map(f => {
        if (f.tipo === 'nuevo') {
          const datos = _IMP_CAMPOS.map(k => ({ k, v: k.valor(f.c) })).filter(x => x.v).map(cambio);
          return linea('➕', f.nombre, 'Alumno/a nuevo' + (datos.length ? ' · ' + datos.join(' · ') : ' · el Cuaderno no tiene su fecha de nacimiento'), 'var(--green)');
        }
        const t = [];
        if (f.completar.length) t.push('Se completa: ' + f.completar.map(cambio).join(' · '));
        if (f.distintos.length) t.push(`${sustituir ? 'Se cambia' : 'Distinto (no se toca)'}: ` + f.distintos.map(x => `${x.k.etiqueta} ${_tEsc(x.k.ver(x.actual))} en Tutoría, ${_tEsc(x.k.ver(x.v))} en el Cuaderno`).join(' · '));
        const nombreT = lista[f.i].nombre;
        return linea(f.completar.length ? '✏️' : '⚠️', nombreT + (_nombreClave(nombreT) !== _nombreClave(f.nombre) ? ` ← «${f.nombre}»` : ''), t.join('<br>'), f.completar.length ? '' : 'var(--yellow)');
      }).join('') + `</ul>`);
    }
    if (!conCambios.length) partes.push(`<div style="font-size:12.5px;color:var(--text2)">Todo el alumnado de ese grupo ya está en ${_tEsc(nivel)} ${_tEsc(grupo)} con sus datos al día.</div>`);
    ov.querySelector('#impCuadPlan').innerHTML = partes.join('');
    ov.querySelectorAll('[data-duda]').forEach(cb => {
      cb.onchange = () => { if (cb.checked) confirmados.set(cb.dataset.duda, Number(cb.dataset.idx)); else confirmados.delete(cb.dataset.duda); pintar(); };
    });
    const sus = ov.querySelector('#impCuadSustituir');
    if (sus) sus.onchange = () => { sustituir = sus.checked; pintar(); };
  };
  ov.querySelectorAll('input[name="impCuadGrupo"]').forEach(r => { r.onchange = pintar; });
  pintar();

  const cerrar = () => { ov.remove(); document.removeEventListener('keydown', alPulsar, true); };
  const alPulsar = e => { if (e.key === 'Escape') { e.stopPropagation(); cerrar(); } };
  document.addEventListener('keydown', alPulsar, true);
  ov.addEventListener('click', e => { if (e.target === ov) cerrar(); });
  ov.querySelector('[data-accion="cancelar"]').onclick = cerrar;
  ov.querySelector('[data-accion="importar"]').onclick = () => {
    const filas = plan();
    cerrar();
    _importarAlumnadoCuaderno(nivel, grupo, filas, sustituir);
  };
  setTimeout(() => ov.querySelector('input[name="impCuadGrupo"]:checked')?.focus(), 50);
}

// Aplica un plan de _planImportarCuaderno (se puede deshacer con Ctrl+Z).
function _importarAlumnadoCuaderno(nivel, grupo, filas, sustituir) {
  const lista = data[nivel][grupo];
  const hayQueHacer = filas.some(f => f.tipo === 'nuevo' || f.vincular || f.completar.length || (sustituir && f.distintos.length));
  if (!hayQueHacer) { showToast('ℹ️ Todo el alumnado de ese grupo ya estaba en ' + nivel + ' ' + grupo + ' con sus datos al día'); return; }
  _undoPush(nivel, grupo);
  let nuevos = 0, completados = 0, cambiados = 0;
  filas.forEach(f => {
    if (f.tipo === 'nuevo') {
      const campos = { nombre: f.nombre, idsCuaderno: f.c.id != null ? [f.c.id] : [] };
      _IMP_CAMPOS.forEach(k => { const v = k.valor(f.c); if (v) campos[k.campo] = v; });
      lista.push(_alumnoNuevo(campos));
      nuevos++;
      return;
    }
    const a = lista[f.i];
    if (f.vincular) a.idsCuaderno = (a.idsCuaderno || []).concat(f.c.id);
    f.completar.forEach(x => { a[x.k.campo] = x.v; });
    if (f.completar.length) completados++;
    if (sustituir && f.distintos.length) { f.distintos.forEach(x => { a[x.k.campo] = x.v; }); cambiados++; }
  });
  updateStats(nivel, grupo);
  updateStats2(nivel, grupo);
  updateCharts(nivel, grupo);
  renderNivelTabs();
  if (nivel === currentNivel && grupo === currentGrupos[currentNivel]) updateTable(nivel, grupo);
  else renderMain();
  markDirty();
  const partes = [];
  if (nuevos) partes.push(`${nuevos} nuevo${nuevos === 1 ? '' : 's'}`);
  if (completados) partes.push(`${completados} completado${completados === 1 ? '' : 's'}`);
  if (cambiados) partes.push(`${cambiados} actualizado${cambiados === 1 ? '' : 's'}`);
  showToast('✅ Del Cuaderno: ' + (partes.length ? partes.join(' · ') : 'alumnado vinculado') + ' · Ctrl+Z deshace');
}
