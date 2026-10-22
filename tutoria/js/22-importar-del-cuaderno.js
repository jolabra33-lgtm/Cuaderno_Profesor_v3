/* ============================================================================
   Gestor de Tutoría · Importar la lista de alumnado desde el Cuaderno del profesor
   tutoria/js/22-importar-del-cuaderno.js
   ============================================================================ */

/* Las dos aplicaciones viven en la misma dirección web, así que Tutoría puede
   LEER los datos que el Cuaderno guarda en este navegador (nunca los modifica).
   Solo se copian el nombre y la fecha de nacimiento; las notas de cada app
   siguen separadas. Quien ya esté en el grupo de destino (mismo nombre) no se
   duplica. Se puede deshacer con Ctrl+Z como cualquier otro cambio. */

const _CUADERNO_CLAVE_LS = 'geohist_multigrupo_v1';   // = KEY en js/nucleo/utilidades.js
const _CUADERNO_IDB = 'cuaderno-profesor-db';         // = IDB_NOMBRE en js/nucleo/guardado-copias.js

function _escImp(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
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

async function abrirImportarDelCuaderno(nivel, grupo) {
  const estado = await _leerEstadoCuaderno();
  const grupos = ((estado && estado.grupos) || []).filter(g => (g.alumnos || []).length);
  if (!grupos.length) {
    mostrarAviso('No hay alumnado en el Cuaderno del profesor de este navegador.\n\nAñade antes la lista de tu grupo en el Cuaderno (desde el mismo dispositivo y la misma dirección web) y vuelve a intentarlo.', 'Importar del Cuaderno');
    return;
  }
  const yaEstan = new Set((data[nivel][grupo] || []).map(a => _nombreClave(a.nombre)));
  const ov = document.createElement('div');
  ov.className = 'modal-overlay open';
  ov.id = 'importCuadernoOverlay';
  ov.innerHTML = `
    <div class="modal" style="width:520px;max-height:85vh;overflow:auto" role="dialog" aria-modal="true" aria-labelledby="impCuadTitulo">
      <div class="modal-title" id="impCuadTitulo">📥 Importar alumnado del Cuaderno</div>
      <p style="font-size:13px;color:var(--text2,#9aa4b8);margin:0 0 12px">
        Se añadirán a <strong>${_escImp(nivel)} ${_escImp(grupo)}</strong> con su nombre y fecha de nacimiento.
        Quien ya esté en el grupo no se duplica. Las notas del Cuaderno no se copian.
      </p>
      <fieldset style="border:0;padding:0;margin:0">
        <legend class="modal-label" style="margin-bottom:6px">Grupo del Cuaderno</legend>
        ${grupos.map((g, i) => {
          const nuevos = g.alumnos.filter(a => !yaEstan.has(_nombreClave(a.nombre))).length;
          return `<label style="display:flex;gap:10px;align-items:center;padding:8px 10px;border:1px solid var(--border,#2a3245);border-radius:8px;margin-bottom:6px;cursor:pointer">
            <input type="radio" name="impCuadGrupo" value="${i}" ${i === 0 ? 'checked' : ''}>
            <span style="flex:1">${_escImp(g.nombre || 'Grupo sin nombre')}</span>
            <span style="font-size:12px;color:var(--text2,#9aa4b8)">${g.alumnos.length} alumnos · ${nuevos} nuevos</span>
          </label>`;
        }).join('')}
      </fieldset>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
        <button type="button" class="btn btn-ghost" data-accion="cancelar">Cancelar</button>
        <button type="button" class="btn btn-primary" data-accion="importar">Importar</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  const cerrar = () => { ov.remove(); document.removeEventListener('keydown', alPulsar, true); };
  const alPulsar = e => { if (e.key === 'Escape') { e.stopPropagation(); cerrar(); } };
  document.addEventListener('keydown', alPulsar, true);
  ov.addEventListener('click', e => { if (e.target === ov) cerrar(); });
  ov.querySelector('[data-accion="cancelar"]').onclick = cerrar;
  ov.querySelector('[data-accion="importar"]').onclick = () => {
    const sel = ov.querySelector('input[name="impCuadGrupo"]:checked');
    const g = grupos[Number(sel ? sel.value : 0)];
    cerrar();
    _importarAlumnadoCuaderno(nivel, grupo, g);
  };
  setTimeout(() => ov.querySelector('input[name="impCuadGrupo"]:checked')?.focus(), 50);
}

function _importarAlumnadoCuaderno(nivel, grupo, grupoCuaderno) {
  const lista = data[nivel][grupo];
  const yaEstan = new Set(lista.map(a => _nombreClave(a.nombre)));
  const nuevos = [];
  (grupoCuaderno.alumnos || []).forEach(a => {
    const nombre = String(a.nombre || '').trim();
    if (!nombre || yaEstan.has(_nombreClave(nombre))) return;
    yaEstan.add(_nombreClave(nombre));
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(a.fechaNacimiento || '') ? a.fechaNacimiento : '';
    nuevos.push(_alumnoNuevo({ nombre, fecha }));
  });
  if (!nuevos.length) { showToast('ℹ️ Todo el alumnado de ese grupo ya estaba en ' + nivel + ' ' + grupo); return; }
  _undoPush(nivel, grupo);
  nuevos.forEach(a => lista.push(a));
  updateStats(nivel, grupo);
  updateStats2(nivel, grupo);
  updateCharts(nivel, grupo);
  renderNivelTabs();
  if (nivel === currentNivel && grupo === currentGrupos[currentNivel]) updateTable(nivel, grupo);
  else renderMain();
  markDirty();
  showToast(`✅ ${nuevos.length} alumno${nuevos.length === 1 ? '' : 's'} importado${nuevos.length === 1 ? '' : 's'} del Cuaderno`);
}
