/* ============================================================================
   Gestor de Tutoría · Autoguardado, búsqueda, archivos y copias de seguridad
   tutoria/js/15-guardado-y-archivos.js
   ============================================================================ */

// ===================== AUTOSAVE & LOCALSTORAGE =====================

let _autosaveTimer = null;
let _quotaWarned = false;   // para no repetir el aviso de memoria llena

// Estado COMPLETO de la aplicación: única fuente de verdad usada tanto por
// el autoguardado en localStorage como por el guardado en archivo .json.
// Así ambos mecanismos nunca se desincronizan (antes localStorage guardaba
// menos campos y "Continuar" perdía asistencia, observaciones, fotos, etc.).
function buildState(includeImages = true, includeActas = true) {
  const state = {
    version: 1,
    app: 'EvalIES',
    savedAt: new Date().toISOString(),
    iesName: document.getElementById('headerIesName')?.value || '',
    data,
    GRUPOS_POR_NIVEL,
    NIVELES,
    tutores,
    evalDates,
    calEventos,
    materiasCustom: _materiasCustom || {},
    obsGrupoData: window._obsGrupoData || {},
    asistenciaData: window._asistenciaData || {},
    planosGrupo: window._planosGrupo || {},
    convivenciaData: window._convivenciaData || {},
    actasData: includeActas ? (window._actasData || {}) : {},
    actasOficialesData: includeActas ? (window._actasOficialesData || {}) : {},
    vacantesCfg: _vacantesCfg,
    actasNoOficialesTabVisible: _actasNoOficialesTabVisible
  };
  if (includeImages) {
    // Las imágenes (base64) son lo más pesado; se capan a 2 MB por elemento.
    const cap = (obj) => {
      const out = {};
      Object.entries(obj || {}).forEach(([k, v]) => {
        if (v && v.src && v.src.length < 2_000_000) out[k] = v;
      });
      return out;
    };
    state.fotoData = cap(window._fotoData);
    state.horarioData = cap(window._horarioData);
  }
  return state;
}

// Tamaño aproximado (en bytes) de las actas guardadas — el HTML completo de
// cada acta editada puede pesar bastante, así que conviene poder medirlo para
// avisar al tutor antes de que la memoria del navegador se llene.
function getActasStorageSize() {
  try {
    return JSON.stringify(window._actasData || {}).length + JSON.stringify(window._actasOficialesData || {}).length;
  } catch (e) { return 0; }
}
function _fmtBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}

// Guarda el estado en localStorage con manejo de cuota: si la memoria del
// navegador está llena, reintenta sin imágenes, y si aún así no cabe, sin
// imágenes ni actas guardadas (el HTML completo de cada acta editada puede
// pesar bastante), avisando al usuario en cada nivel de degradación.
function persistLocal() {
  if (window.__IS_SNAPSHOT_EXPORT__) return false;  // nunca escribir desde un snapshot
  if (window.__MODO_EJEMPLO__) return false;        // v5: los datos de ejemplo nunca se guardan
  const dot = document.getElementById('autosaveDot');
  const lbl = document.getElementById('autosaveLabel');
  const writeIes = () => {
    const iname = document.getElementById('headerIesName');
    if (iname) localStorage.setItem('evalies_iesname', iname.value);
  };
  const isQuota = (e) => e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
  try {
    localStorage.setItem('evalies_data', JSON.stringify(buildState(true, true)));
    writeIes();
    if (dot) dot.className = 'autosave-dot';
    if (lbl) lbl.textContent = 'Guardado';
    maybeBackup();
    return true;
  } catch (e) {
    if (isQuota(e)) {
      // Reintento 1: sin fotos ni horarios
      try {
        localStorage.setItem('evalies_data', JSON.stringify(buildState(false, true)));
        writeIes();
        if (dot) dot.className = 'autosave-dot';
        if (lbl) lbl.textContent = 'Guardado (sin imágenes)';
        if (!_quotaWarned) {
          _quotaWarned = true;
          showToast('⚠ Memoria del navegador casi llena: las fotos y horarios no se guardan aquí. Guárdalos en un archivo con Ctrl+S.');
        }
        return true;
      } catch (e2) {
        // Reintento 2: tampoco las actas guardadas (su HTML completo puede pesar mucho)
        try {
          localStorage.setItem('evalies_data', JSON.stringify(buildState(false, false)));
          writeIes();
          if (dot) dot.className = 'autosave-dot';
          if (lbl) lbl.textContent = 'Guardado (sin imágenes ni actas)';
          if (!_quotaWarned) {
            _quotaWarned = true;
            showToast('⚠ Memoria del navegador muy llena: ni las imágenes ni las actas guardadas se autoguardan aquí. Expórtalas a un archivo con Ctrl+S antes de seguir editando.');
          }
          return true;
        } catch (e3) {
          if (dot) dot.className = 'autosave-dot error';
          if (lbl) lbl.textContent = 'Error: memoria llena';
          if (!_quotaWarned) {
            _quotaWarned = true;
            showToast('⚠ No se pudo autoguardar: memoria del navegador llena. Guarda en archivo con Ctrl+S.');
          }
          return false;
        }
      }
    }
    if (dot) dot.className = 'autosave-dot error';
    if (lbl) lbl.textContent = 'Error al guardar';
    return false;
  }
}

function markDirty() {
  clearTimeout(_autosaveTimer);
  const dot = document.getElementById('autosaveDot');
  const lbl = document.getElementById('autosaveLabel');
  if (dot) { dot.className = 'autosave-dot saving'; }
  if (lbl) lbl.textContent = 'Guardando…';
  _autosaveTimer = setTimeout(() => {
    persistLocal();
  }, 800);
}

// Si se pasa a trabajar en otra ventana, antes de ceder se guarda al momento (ver js/una-ventana.js).
if (window.UnaVentana) UnaVentana.antesDeCeder(() => { clearTimeout(_autosaveTimer); persistLocal(); });

function loadFromLocalStorage() {
  // Skip entirely in snapshot exports — data is already injected via __SNAPSHOT__
  if (window.__IS_SNAPSHOT_EXPORT__) return;
  try {
    const raw = localStorage.getItem('evalies_data');
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.GRUPOS_POR_NIVEL) {
        // Sync NIVELES to match saved structure: add new, remove deleted
        Object.assign(GRUPOS_POR_NIVEL, saved.GRUPOS_POR_NIVEL);
        // Remove niveles not in saved data
        NIVELES.slice().forEach(n => { if (!saved.GRUPOS_POR_NIVEL[n]) NIVELES.splice(NIVELES.indexOf(n), 1); });
        // Add new niveles from saved data in order
        Object.keys(saved.GRUPOS_POR_NIVEL).forEach(n => { if (!NIVELES.includes(n)) NIVELES.push(n); });
        // Remove GRUPOS_POR_NIVEL entries not in saved
        Object.keys(GRUPOS_POR_NIVEL).forEach(n => { if (!saved.GRUPOS_POR_NIVEL[n]) delete GRUPOS_POR_NIVEL[n]; });
      }
      if (saved.data) Object.keys(saved.data).forEach(n => { data[n] = saved.data[n]; });
      if (saved.tutores) Object.assign(tutores, saved.tutores);
      if (saved.evalDates) Object.assign(evalDates, saved.evalDates);
      if (Array.isArray(saved.calEventos)) { calEventos.length = 0; saved.calEventos.forEach(e => calEventos.push(e)); }
      if (saved.vacantesCfg) { _vacMergeCfg(saved.vacantesCfg); }
      if (saved.convivenciaData) { if (!window._convivenciaData) window._convivenciaData = {}; Object.assign(window._convivenciaData, saved.convivenciaData); }
      // Restaurar el resto del estado (antes se perdía al pulsar "Continuar")
      if (saved.materiasCustom) { Object.assign(_materiasCustom, saved.materiasCustom); }
      if (saved.obsGrupoData)   { if (!window._obsGrupoData)   window._obsGrupoData   = {}; Object.assign(window._obsGrupoData,   saved.obsGrupoData); }
      if (saved.asistenciaData) { if (!window._asistenciaData) window._asistenciaData = {}; Object.assign(window._asistenciaData, saved.asistenciaData); }
      if (saved.planosGrupo) { if (!window._planosGrupo) window._planosGrupo = {}; Object.assign(window._planosGrupo, saved.planosGrupo); }
      if (saved.actasData)      { if (!window._actasData)      window._actasData      = {}; Object.assign(window._actasData,      saved.actasData); }
      if (saved.actasOficialesData) { if (!window._actasOficialesData) window._actasOficialesData = {}; Object.assign(window._actasOficialesData, saved.actasOficialesData); }
      if (typeof saved.actasNoOficialesTabVisible === 'boolean') _actasNoOficialesTabVisible = saved.actasNoOficialesTabVisible;
      if (saved.fotoData)       { if (!window._fotoData)       window._fotoData       = {}; Object.assign(window._fotoData,       saved.fotoData); }
      if (saved.horarioData)    { if (!window._horarioData)    window._horarioData    = {}; Object.assign(window._horarioData,    saved.horarioData); }
      // Sync currentGrupos for all known niveles
      NIVELES.forEach(n => { if ((!currentGrupos[n] || !GRUPOS_POR_NIVEL[n]?.includes(currentGrupos[n])) && GRUPOS_POR_NIVEL[n]) currentGrupos[n] = GRUPOS_POR_NIVEL[n][0]; });
    }
    const iesname = localStorage.getItem('evalies_iesname');
    // «Gestor de Tutoría» era el texto por defecto, no el nombre de un centro.
    if (iesname && iesname !== 'Gestor de Tutoría') {
      const el = document.getElementById('headerIesName');
      if (el) el.value = iesname;
    }
  } catch(e) {}
}

function saveIesName(val) {
  localStorage.setItem('evalies_iesname', val);
}

// Patch updateField, addAlumno, deleteAlumno, executeReset, executeImport, executeJsonImport to trigger autosave
const _origUpdateField = updateField;
updateField = function(...args) { _origUpdateField(...args); markDirty(); };

const _origDeleteAlumno = deleteAlumno;
deleteAlumno = function(...args) { _origDeleteAlumno(...args); markDirty(); };

const _origAddAlumno = addAlumno;
addAlumno = function(...args) { _origAddAlumno(...args); markDirty(); };

// ===================== SEARCH =====================

function applySearch() {
  const q = _searchQuery.toLowerCase().trim();
  const tbl = document.querySelector('table tbody');
  if (!tbl) return;
  tbl.querySelectorAll('tr').forEach(row => {
    if (!q) {
      row.classList.remove('search-hidden','search-match');
    } else {
      const text = row.textContent.toLowerCase();
      if (text.includes(q)) {
        row.classList.remove('search-hidden');
        row.classList.add('search-match');
      } else {
        row.classList.add('search-hidden');
        row.classList.remove('search-match');
      }
    }
  });
  // Update visible count indicator
  const countEl = document.getElementById('searchResultCount');
  if (countEl && q) {
    const visible = tbl.querySelectorAll('tr:not(.search-hidden)').length;
    const total = tbl.querySelectorAll('tr').length;
    countEl.textContent = `${visible}/${total}`;
    countEl.style.display = '';
  } else if (countEl) {
    countEl.style.display = 'none';
  }
}

renderAll();
syncDateInputs();
loadTheme();
loadColState();
loadMateriasCustom();
loadFromLocalStorage();
// Re-render with saved data so it's ready when user clicks "Continuar"
if (localStorage.getItem('evalies_data')) renderAll();

// ===================== PWA + FILE SYSTEM ACCESS =====================

// --- Estado del archivo activo ---
let _fileHandle = null;      // FileSystemFileHandle del archivo abierto
let _fileUnsaved = false;    // Hay cambios sin guardar
let _autoSaveInterval = null;

// ===================== IndexedDB (handles de archivo + copias de seguridad) =====================
// IndexedDB nos permite (1) recordar el FileSystemFileHandle real de cada
// archivo reciente para reabrirlo con un clic, y (2) guardar copias de
// seguridad versionadas sin el límite de ~5 MB de localStorage.
const IDB_NAME = 'evalies-db';
const IDB_VERSION = 1;
let _idbPromise = null;
function idb() {
  if (_idbPromise) return _idbPromise;
  _idbPromise = new Promise((resolve, reject) => {
    let req;
    try { req = indexedDB.open(IDB_NAME, IDB_VERSION); }
    catch (e) { reject(e); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('handles')) db.createObjectStore('handles');
      if (!db.objectStoreNames.contains('backups')) db.createObjectStore('backups', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _idbPromise;
}
function idbPut(store, value, key) {
  return idb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    const req = (key !== undefined) ? os.put(value, key) : os.put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}
function idbGet(store, key) {
  return idb().then(db => new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}
function idbGetAll(store) {
  return idb().then(db => new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  }));
}
function idbDelete(store, key) {
  return idb().then(db => new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}

// ===================== COPIAS DE SEGURIDAD VERSIONADAS =====================
let _lastBackupAt = 0;
const BACKUP_INTERVAL_MS = 10 * 60 * 1000;  // como mucho una copia cada 10 min
const BACKUP_KEEP = 8;                       // conservar las 8 más recientes

// Crea una copia de seguridad si ha pasado el intervalo. Se llama tras cada
// guardado correcto. Silenciosa: nunca interrumpe el flujo del usuario.
async function maybeBackup() {
  if (window.__IS_SNAPSHOT_EXPORT__) return;
  const now = Date.now();
  if (now - _lastBackupAt < BACKUP_INTERVAL_MS) return;
  _lastBackupAt = now;
  try {
    const payload = JSON.stringify(buildState(true));  // estado completo, con imágenes
    await idbPut('backups', {
      savedAt: new Date().toISOString(),
      iesName: document.getElementById('headerIesName')?.value || '',
      payload
    });
    // Rotación: borrar las copias más antiguas que sobrepasen el límite
    const all = await idbGetAll('backups');
    if (all.length > BACKUP_KEEP) {
      all.sort((a, b) => (a.id || 0) - (b.id || 0));
      const toDelete = all.slice(0, all.length - BACKUP_KEEP);
      for (const b of toDelete) await idbDelete('backups', b.id);
    }
  } catch (_) { /* IndexedDB no disponible o sin espacio: ignorar */ }
}

// Modal para ver y restaurar copias de seguridad
async function openBackupsModal() {
  let overlay = document.getElementById('backupsOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'backupsOverlay';
    document.body.appendChild(overlay);
  }
  let backups = [];
  try { backups = await idbGetAll('backups'); } catch (_) {}
  backups.sort((a, b) => (b.id || 0) - (a.id || 0));
  const rows = backups.length ? backups.map(b => {
    const label = new Date(b.savedAt).toLocaleString('es-ES');
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px">
        <div><div style="font-weight:600;color:var(--text)">${(b.iesName || 'Centro')}</div>
        <div style="color:var(--text2);font-size:12px">${label}</div></div>
        <button class="btn btn-sm btn-primary" onclick="restoreBackup(${b.id})">Restaurar</button>
      </div>`;
  }).join('') : '<div style="color:var(--text2)">Aún no hay copias de seguridad. Se crearán automáticamente mientras trabajas.</div>';
  overlay.innerHTML = `<div class="modal" style="width:520px;max-width:94vw">
      <div class="modal-title">🛟 Copias de seguridad</div>
      <div style="max-height:55vh;overflow:auto;margin-bottom:8px">${rows}</div>
      <div style="color:var(--text2);font-size:12px;margin-bottom:16px;line-height:1.6">
        Se guarda una copia automática cada ~10 minutos y se conservan las ${BACKUP_KEEP} más recientes.
        Restaurar reemplaza los datos actuales (guarda antes si quieres conservarlos).
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="document.getElementById('backupsOverlay').classList.remove('open')">Cerrar</button>
      </div>
    </div>`;
  overlay.classList.add('open');
}

async function restoreBackup(id) {
  if (!await confirmar('¿Restaurar esta copia de seguridad? Se reemplazarán los datos actuales.')) return;
  try {
    const b = await idbGet('backups', id);
    if (!b) { showToast('⚠ No se encontró la copia'); return; }
    const parsed = JSON.parse(b.payload);
    applyFilePayload(parsed);
    persistLocal();
    document.getElementById('backupsOverlay')?.classList.remove('open');
    showToast('✅ Copia de seguridad restaurada');
  } catch (e) {
    showToast('⚠ Error al restaurar: ' + e.message);
  }
}

// --- Solicitar almacenamiento persistente ---
// Sin esto, el navegador puede borrar localStorage bajo presión de memoria
// (y Safari/iOS lo elimina tras ~7 días de inactividad). Esto marca los datos
// como persistentes para que no se eliminen automáticamente.
(async () => {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const already = navigator.storage.persisted ? await navigator.storage.persisted() : false;
      if (!already) {
        const granted = await navigator.storage.persist();
        console.log('Almacenamiento persistente:', granted ? 'concedido' : 'no concedido');
      }
    }
  } catch (_) { /* no soportado: continuar normalmente */ }
})();

// --- Pantalla de bienvenida ---
function showWelcomeScreen() {
  renderRecentsList();
  document.getElementById('welcomeScreen').style.display = 'flex';
}

function hideWelcomeScreen() {
  const ws = document.getElementById('welcomeScreen');
  if (!ws) return;
  ws.style.display = 'none'; // immediate — no opacity trick that could leave it blocking clicks
}

// Entrar directamente en la aplicación al abrir, sin mostrar la pantalla de bienvenida.
// Si hay una sesión guardada en localStorage se retoma automáticamente (mismo
// comportamiento que antes ofrecía el botón "Continuar sesión anterior");
// si no la hay, se abre con el estado inicial en blanco (igual que "Nuevo archivo").
window.addEventListener('load', () => {
  // Snapshot exports skip welcome — data already injected
  if (window.__IS_SNAPSHOT_EXPORT__) {
    hideWelcomeScreen();
    updateFileIndicator('Versión guardada del curso');
    return;
  }

  hideWelcomeScreen();
  renderAll();
  syncDateInputs();
  updateFileIndicator();
});

// --- Indicador de archivo en cabecera ---
function updateFileIndicator(name, unsaved) {
  const dot    = document.getElementById('fileDot');
  const label  = document.getElementById('fileNameLabel');
  const status = document.getElementById('fileStatus');
  const wrap   = document.getElementById('fileIndicator');
  if (!dot || !label) return;
  // ¿Puede el navegador reescribir el archivo directamente? (File System Access API)
  const escrituraDirecta = !!window.showSaveFilePicker;

  if (_fileHandle) {
    const n = name || _fileHandle.name;
    const isUnsaved = unsaved || _fileUnsaved;
    label.textContent = n;
    label.title = n + (isUnsaved ? ' — cambios sin guardar' : ' — todo guardado');
    dot.className = 'file-dot' + (isUnsaved ? ' unsaved' : '');
    if (status) {
      status.textContent = isUnsaved ? '● Sin guardar' : '✓ Guardado';
      status.className = 'file-status ' + (isUnsaved ? 'unsaved' : 'saved');
    }
    if (wrap) wrap.className = 'file-indicator ' + (isUnsaved ? 'is-unsaved' : 'is-saved');
    document.title = (isUnsaved ? '● ' : '') + n + ' — Gestor de Tutoría';
  } else {
    label.textContent = 'Sin archivo abierto';
    label.title = escrituraDirecta
      ? 'Abre o crea un archivo .json para guardar tus cambios'
      : 'Este navegador no reescribe archivos: Guardar descargará una copia';
    dot.className = 'file-dot nofile';
    if (status) {
      if (escrituraDirecta) { status.textContent = ''; status.className = 'file-status'; }
      else { status.textContent = '⤓ Guardar = descarga'; status.className = 'file-status download'; }
    }
    if (wrap) wrap.className = 'file-indicator';
    document.title = 'Gestor de Tutoría · Cuaderno del profesor';
  }
}

// --- Recientes (solo nombres, guardados en localStorage) ---
function getRecents() {
  try { return JSON.parse(localStorage.getItem('evalies_recents') || '[]'); }
  catch { return []; }
}

function addRecent(name, handle) {
  let recents = getRecents().filter(r => r.name !== name);
  recents.unshift({ name, date: new Date().toLocaleString('es-ES'), hasHandle: !!handle });
  if (recents.length > 6) recents = recents.slice(0, 6);
  localStorage.setItem('evalies_recents', JSON.stringify(recents));
  // Guardar el handle real para poder reabrir el archivo con un clic
  if (handle) { idbPut('handles', handle, name).catch(() => {}); }
}

function renderRecentsList() {
  const recents = getRecents();
  const container = document.getElementById('welcomeRecents');
  const list = document.getElementById('recentsList');
  if (!container || !list) return;
  if (!recents.length) { container.style.display = 'none'; return; }
  container.style.display = 'block';
  const escHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  list.innerHTML = recents.map((r, i) => `
    <div class="ws-recent-item" data-recent-idx="${i}">
      <div class="ws-recent-icon">📄</div>
      <div>
        <div class="ws-recent-name">${escHtml(r.name)}</div>
        <div class="ws-recent-date">${escHtml(r.date)}</div>
      </div>
    </div>
  `).join('');
  // Listeners (evita inyección por comillas en el nombre del archivo)
  list.querySelectorAll('.ws-recent-item').forEach(el => {
    const idx = parseInt(el.getAttribute('data-recent-idx'), 10);
    el.addEventListener('click', () => fsOpenRecent(recents[idx].name));
  });
}

// Reabrir un archivo reciente concreto usando su handle guardado.
// Si no hay handle (otro navegador, handle revocado, etc.) cae al selector.
async function fsOpenRecent(name) {
  if (_fileUnsaved) {
    if (!await confirmar('Hay cambios sin guardar. ¿Abrir otro archivo igualmente?')) return;
  }
  let handle;
  try { handle = await idbGet('handles', name); } catch (_) {}
  if (!handle || !window.showOpenFilePicker) { fsOpenFile(); return; }
  try {
    // requestPermission necesita un gesto del usuario: el clic en el reciente lo es.
    let perm = handle.queryPermission ? await handle.queryPermission({ mode: 'readwrite' }) : 'granted';
    if (perm !== 'granted' && handle.requestPermission) {
      perm = await handle.requestPermission({ mode: 'readwrite' });
    }
    if (perm !== 'granted') {
      showToast('ℹ Permiso denegado. Ábrelo con el selector de archivos.');
      fsOpenFile();
      return;
    }
    const file = await handle.getFile();
    const parsed = JSON.parse(await file.text());
    _fileHandle = handle;
    applyFilePayload(parsed);
    addRecent(handle.name, handle);
    updateFileIndicator();
    hideWelcomeScreen();
    showToast('✅ Abierto: ' + handle.name);
    startAutoSave();
  } catch (e) {
    if (e.name === 'AbortError') return;
    // El archivo pudo moverse o borrarse: limpiar y caer al selector
    showToast('ℹ No se pudo reabrir directamente. Usa el selector.');
    idbDelete('handles', name).catch(() => {});
    fsOpenFile();
  }
}

// --- Obtener payload completo para guardar (mismo estado que el autoguardado) ---
function getFilePayload() {
  return JSON.stringify(buildState(true), null, 2);
}

// --- Aplicar payload cargado desde archivo ---
function applyFilePayload(parsed) {
  if (parsed.iesName) {
    const el = document.getElementById('headerIesName');
    if (el) el.value = parsed.iesName;
  }
  if (parsed.GRUPOS_POR_NIVEL) {
    Object.keys(GRUPOS_POR_NIVEL).forEach(k => delete GRUPOS_POR_NIVEL[k]);
    Object.assign(GRUPOS_POR_NIVEL, parsed.GRUPOS_POR_NIVEL);
  }
  if (parsed.NIVELES) {
    NIVELES.length = 0;
    parsed.NIVELES.forEach(n => NIVELES.push(n));
  }
  if (parsed.data) {
    Object.keys(data).forEach(k => delete data[k]);
    Object.assign(data, parsed.data);
  }
  if (parsed.tutores) Object.assign(tutores, parsed.tutores);
  if (parsed.evalDates) Object.assign(evalDates, parsed.evalDates);
  if (parsed.vacantesCfg) { _vacMergeCfg(parsed.vacantesCfg); }
  if (parsed.materiasCustom) {
    Object.keys(_materiasCustom).forEach(k => delete _materiasCustom[k]);
    Object.assign(_materiasCustom, parsed.materiasCustom);
    try { localStorage.setItem('evalies_materias', JSON.stringify(_materiasCustom)); } catch(e) {}
  }
  // Calendario del centro (antes se perdía al abrir un archivo)
  if (Array.isArray(parsed.calEventos)) {
    calEventos.length = 0;
    parsed.calEventos.forEach(e => calEventos.push(e));
  }
  if (parsed.obsGrupoData) {
    if (!window._obsGrupoData) window._obsGrupoData = {};
    Object.keys(window._obsGrupoData).forEach(k => delete window._obsGrupoData[k]);
    Object.assign(window._obsGrupoData, parsed.obsGrupoData);
  }
  if (parsed.asistenciaData) {
    if (!window._asistenciaData) window._asistenciaData = {};
    Object.keys(window._asistenciaData).forEach(k => delete window._asistenciaData[k]);
    Object.assign(window._asistenciaData, parsed.asistenciaData);
  }
  if (parsed.convivenciaData) {
    if (!window._convivenciaData) window._convivenciaData = {};
    Object.keys(window._convivenciaData).forEach(k => delete window._convivenciaData[k]);
    Object.assign(window._convivenciaData, parsed.convivenciaData);
  }
  // Planos de aula (antes se perdían al abrir un archivo)
  if (parsed.planosGrupo) {
    if (!window._planosGrupo) window._planosGrupo = {};
    Object.keys(window._planosGrupo).forEach(k => delete window._planosGrupo[k]);
    Object.assign(window._planosGrupo, parsed.planosGrupo);
  }
  // Actas no oficiales y oficiales (antes se perdían al abrir un archivo)
  if (parsed.actasData) {
    if (!window._actasData) window._actasData = {};
    Object.keys(window._actasData).forEach(k => delete window._actasData[k]);
    Object.assign(window._actasData, parsed.actasData);
  }
  if (parsed.actasOficialesData) {
    if (!window._actasOficialesData) window._actasOficialesData = {};
    Object.keys(window._actasOficialesData).forEach(k => delete window._actasOficialesData[k]);
    Object.assign(window._actasOficialesData, parsed.actasOficialesData);
  }
  if (typeof parsed.actasNoOficialesTabVisible === 'boolean') _actasNoOficialesTabVisible = parsed.actasNoOficialesTabVisible;
  if (parsed.fotoData) {
    if (!window._fotoData) window._fotoData = {};
    Object.assign(window._fotoData, parsed.fotoData);
  }
  if (parsed.horarioData) {
    if (!window._horarioData) window._horarioData = {};
    Object.assign(window._horarioData, parsed.horarioData);
  }

  NIVELES.forEach(n => {
    if (!currentGrupos[n] || !GRUPOS_POR_NIVEL[n]?.includes(currentGrupos[n])) {
      currentGrupos[n] = GRUPOS_POR_NIVEL[n]?.[0];
    }
    // Ensure evalDates exists for every nivel
    if (!evalDates[n]) evalDates[n] = { eval1: _today, eval2: _today, eval3: _today };
  });
  currentNivel = '__home__';
  _fileUnsaved = false;
  renderAll();
}

// --- NUEVO ARCHIVO ---
/* v5 · Estado en blanco (lo usan "Nuevo archivo" en todos los navegadores). */
function _tutEstadoEnBlanco() {
  window.__MODO_EJEMPLO__ = false;
  NIVELES.length = 0;
  ['1º ESO','2º ESO','3º ESO','4º ESO','1º Bach.','2º Bach.'].forEach(n => NIVELES.push(n));
  Object.keys(GRUPOS_POR_NIVEL).forEach(k => delete GRUPOS_POR_NIVEL[k]);
  Object.assign(GRUPOS_POR_NIVEL, {'1º ESO':['A'],'2º ESO':['A'],'3º ESO':['A'],'4º ESO':['A'],'1º Bach.':['A'],'2º Bach.':['A']});
  Object.keys(data).forEach(k => delete data[k]);
  NIVELES.forEach(n => { data[n] = {}; GRUPOS_POR_NIVEL[n].forEach(g => { data[n][g] = []; }); });
  Object.keys(evalDates).forEach(k => delete evalDates[k]);
  NIVELES.forEach(n => { evalDates[n] = { eval1: _today, eval2: _today, eval3: _today }; });
  Object.keys(tutores).forEach(k => delete tutores[k]);
  NIVELES.forEach(n => GRUPOS_POR_NIVEL[n].forEach(g => { tutores[`${n}-${g}`] = ''; }));
  NIVELES.forEach(n => { currentGrupos[n] = GRUPOS_POR_NIVEL[n][0]; });
  currentNivel = '__home__';
}
/* v5 · Datos de ejemplo bajo petición: solo en memoria, nunca se guardan. */
function _tutTotalAlumnos() { let n = 0; Object.values(data).forEach(gs => Object.values(gs||{}).forEach(arr => { n += (arr||[]).length; })); return n; }
async function cargarDatosEjemplo() {
  if (_tutTotalAlumnos() > 0) { await mostrarAviso('Los datos de ejemplo solo se pueden ver cuando la app está vacía, para no mezclarlos con tus datos reales.'); return; }
  window.__MODO_EJEMPLO__ = true;
  NIVELES.length = 0; Object.keys(GRUPOS_EJEMPLO).forEach(n => NIVELES.push(n));
  Object.keys(GRUPOS_POR_NIVEL).forEach(k => delete GRUPOS_POR_NIVEL[k]);
  Object.keys(GRUPOS_EJEMPLO).forEach(n => { GRUPOS_POR_NIVEL[n] = GRUPOS_EJEMPLO[n].slice(); });
  Object.keys(data).forEach(k => delete data[k]);
  NIVELES.forEach(n => { data[n] = {}; GRUPOS_POR_NIVEL[n].forEach(g => { data[n][g] = generateSampleData(n, g); }); });
  NIVELES.forEach(n => { if (!evalDates[n]) evalDates[n] = { eval1: _today, eval2: _today, eval3: _today }; currentGrupos[n] = GRUPOS_POR_NIVEL[n][0]; });
  currentNivel = '__home__';
  renderAll();
  _tutBannerEjemplo();
}
function salirDatosEjemplo() { window.__MODO_EJEMPLO__ = false; location.reload(); }
function _tutBannerEjemplo() {
  let b = document.getElementById('bannerEjemplo');
  if (!window.__MODO_EJEMPLO__) { if (b) b.remove(); return; }
  if (!b) {
    b = document.createElement('div'); b.id = 'bannerEjemplo'; b.setAttribute('role','status');
    b.style.cssText = 'position:sticky;top:0;z-index:500;background:#b45309;color:#fff;padding:9px 16px;font-size:13.5px;font-weight:600;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;text-align:center';
    b.innerHTML = '🧪 Estás viendo DATOS DE EJEMPLO inventados. Nada de lo que hagas se guarda. <button onclick="salirDatosEjemplo()" style="background:#fff;color:#b45309;border:none;border-radius:6px;padding:5px 12px;font-weight:700;cursor:pointer">Salir del ejemplo</button>';
    document.body.insertBefore(b, document.body.firstChild);
  }
}
async function fsNewFile() {
  if (_fileUnsaved) {
    if (!await confirmar('Hay cambios sin guardar. ¿Crear un archivo nuevo igualmente?')) return;
  }
  if (!window.showSaveFilePicker) {
    // Fallback (iPad, Firefox…): v5 — ahora sí empieza EN BLANCO, como en Chrome/Edge.
    _tutEstadoEnBlanco();
    hideWelcomeScreen();
    renderAll();
    syncDateInputs();
    persistLocal();
    showToast('ℹ Archivo nuevo en blanco. En este navegador, «Guardar» (Ctrl+S) descarga una copia del archivo.');
    return;
  }
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: 'MiCentro_' + new Date().getFullYear() + '-' + String(new Date().getFullYear()+1).slice(2) + '.json',
      types: [{ description: 'Archivo del Gestor de Tutoría (JSON)', accept: { 'application/json': ['.json'] } }]
    });
    _fileHandle = handle;
    _tutEstadoEnBlanco();
    if (false) {
    NIVELES.length = 0;
    ['1º ESO','2º ESO','3º ESO','4º ESO','1º Bach.','2º Bach.'].forEach(n => NIVELES.push(n));
    Object.keys(GRUPOS_POR_NIVEL).forEach(k => delete GRUPOS_POR_NIVEL[k]);
    Object.assign(GRUPOS_POR_NIVEL, {'1º ESO':['A'],'2º ESO':['A'],'3º ESO':['A'],'4º ESO':['A'],'1º Bach.':['A'],'2º Bach.':['A']});
    Object.keys(data).forEach(k => delete data[k]);
    NIVELES.forEach(n => { data[n] = {}; GRUPOS_POR_NIVEL[n].forEach(g => { data[n][g] = []; }); });
    // Reset evalDates for all default niveles
    Object.keys(evalDates).forEach(k => delete evalDates[k]);
    NIVELES.forEach(n => { evalDates[n] = { eval1: _today, eval2: _today, eval3: _today }; });
    // Reset tutores
    Object.keys(tutores).forEach(k => delete tutores[k]);
    NIVELES.forEach(n => GRUPOS_POR_NIVEL[n].forEach(g => { tutores[`${n}-${g}`] = ''; }));
    NIVELES.forEach(n => { currentGrupos[n] = GRUPOS_POR_NIVEL[n][0]; });
    }
    currentNivel = '__home__';
    _fileUnsaved = false;

    await fsSave();
    addRecent(handle.name, handle);
    updateFileIndicator();
    hideWelcomeScreen();
    renderAll();
    showToast('✅ Archivo creado: ' + handle.name);
    startAutoSave();
  } catch (e) {
    if (e.name !== 'AbortError') showToast('⚠ Error al crear el archivo: ' + e.message);
  }
}

// --- ABRIR ARCHIVO ---
async function fsOpenFile() {
  if (_fileUnsaved) {
    if (!await confirmar('Hay cambios sin guardar. ¿Abrir otro archivo igualmente?')) return;
  }
  if (!window.showOpenFilePicker) {
    fsOpenFileFallback();
    return;
  }
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'Archivo del Gestor de Tutoría (JSON)', accept: { 'application/json': ['.json', '.evalies'] } }],
      multiple: false
    });
    _fileHandle = handle;
    const file = await handle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text);
    applyFilePayload(parsed);
    addRecent(handle.name, handle);
    updateFileIndicator();
    hideWelcomeScreen();
    showToast('✅ Abierto: ' + handle.name);
    startAutoSave();
  } catch (e) {
    if (e.name !== 'AbortError') showToast('⚠ Error al abrir: ' + e.message);
  }
}

// Fallback para navegadores sin File System Access API
function fsOpenFileFallback() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,.evalies';
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      applyFilePayload(parsed);
      addRecent(file.name);
      updateFileIndicator();
      hideWelcomeScreen();
      showToast('✅ Abierto: ' + file.name + ' (modo descarga — sin autoguardado)');
    } catch(e) {
      showToast('⚠ Error al leer el archivo: ' + e.message);
    }
  };
  input.click();
}

// --- GUARDAR ---
async function fsSave({ silent = false } = {}) {
  if (window.__MODO_EJEMPLO__) { if (!silent) showToast('ℹ Estás viendo datos de ejemplo: no se guardan. Pulsa «Salir del ejemplo» para empezar con tus datos.'); return; }
  if (!_fileHandle) {
    if (!silent) await fsSaveAs();
    return;
  }
  // Check permission before writing — avoids "User activation required" errors
  // when autoSave fires in background without a user gesture.
  try {
    const perm = await _fileHandle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      const dot = document.getElementById('autosaveDot');
      const lbl = document.getElementById('autosaveLabel');
      if (dot) dot.className = 'autosave-dot saving';
      if (lbl) lbl.textContent = 'Guarda con Ctrl+S';
      if (!silent) showToast('ℹ Usa Ctrl+S para guardar el archivo');
      return;
    }
  } catch(_) { /* queryPermission not supported — continue */ }

  try {
    const writable = await _fileHandle.createWritable();
    await writable.write(getFilePayload());
    await writable.close();
    _fileUnsaved = false;
    updateFileIndicator();
    const dot = document.getElementById('autosaveDot');
    const lbl = document.getElementById('autosaveLabel');
    if (dot) dot.className = 'autosave-dot';
    if (lbl) lbl.textContent = 'Guardado ' + new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
    addRecent(_fileHandle.name, _fileHandle);
  } catch(e) {
    if (e.name === 'AbortError') return;
    // Silently ignore activation errors from autosave background calls
    if (e.name === 'NotAllowedError' || (e.message && e.message.includes('User activation'))) {
      const dot = document.getElementById('autosaveDot');
      const lbl = document.getElementById('autosaveLabel');
      if (dot) dot.className = 'autosave-dot saving';
      if (lbl) lbl.textContent = 'Guarda con Ctrl+S';
      if (!silent) showToast('ℹ Usa Ctrl+S para guardar el archivo');
      return;
    }
    if (!silent) showToast('⚠ Error al guardar: ' + e.message);
  }
}

// Guardar como (nuevo nombre/ubicación)
async function fsSaveAs() {
  if (!window.showSaveFilePicker) {
    // Fallback: descarga
    const blob = new Blob([getFilePayload()], {type:'application/json'});
    const name = (_fileHandle?.name || 'evalies_datos').replace(/\.(evalies|json)$/i,'') + '.json';
    triggerDownload(blob, name);
    _fileUnsaved = false;
    updateFileIndicator();
    showToast('✅ Archivo descargado: ' + name);
    return;
  }
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: (_fileHandle?.name || 'MiCentro').replace(/\.(evalies|json)$/i,'') + '.json',
      types: [{ description: 'Archivo del Gestor de Tutoría (JSON)', accept: { 'application/json': ['.json'] } }]
    });
    _fileHandle = handle;
    await fsSave();
    showToast('✅ Guardado como: ' + handle.name);
    startAutoSave();
  } catch(e) {
    if (e.name !== 'AbortError') showToast('⚠ Error al guardar: ' + e.message);
  }
}

// --- AUTOGUARDADO cada 45 segundos ---
function startAutoSave() {
  if (_autoSaveInterval) clearInterval(_autoSaveInterval);
  _autoSaveInterval = setInterval(async () => {
    if (_fileHandle && _fileUnsaved) {
      await fsSave({ silent: true });
    }
  }, 45000);
}

// --- Marcar como "con cambios sin guardar" ---
// Sobreescribimos markDirty para también marcar el archivo
const _origMarkDirty = markDirty;
markDirty = function() {
  _origMarkDirty();
  if (_fileHandle) {
    _fileUnsaved = true;
    updateFileIndicator();
    const dot = document.getElementById('autosaveDot');
    const lbl = document.getElementById('autosaveLabel');
    if (dot) dot.className = 'autosave-dot saving';
    if (lbl) lbl.textContent = 'Sin guardar…';
  }
};

// --- Ctrl+S / Ctrl+Shift+S ---
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (e.shiftKey) {
      fsSaveAs();
    } else {
      if (_fileHandle) fsSave();
      else fsSaveAs();
    }
  }
});

// --- Aviso antes de cerrar con cambios sin guardar ---
window.addEventListener('beforeunload', e => {
  if (_fileUnsaved && _fileHandle) {
    e.preventDefault();
    e.returnValue = '¿Cerrar sin guardar los cambios?';
  }
});

// --- Apertura desde el sistema operativo (doble clic en un .json/.evalies) ---
// Requiere que la app esté instalada como PWA y que el manifest declare
// "file_handlers" para esa extensión. El navegador lanza la app y nos entrega
// el archivo aquí, sin que el usuario tenga que abrirlo manualmente.
if ('launchQueue' in window && 'setConsumer' in window.launchQueue) {
  window.launchQueue.setConsumer(async (launchParams) => {
    if (!launchParams || !launchParams.files || !launchParams.files.length) return;
    try {
      const handle = launchParams.files[0];
      _fileHandle = handle;                 // permite reescribir con Ctrl+S
      const file = await handle.getFile();
      const parsed = JSON.parse(await file.text());
      applyFilePayload(parsed);
      try { addRecent(handle.name, handle); } catch (e) {}
      updateFileIndicator(handle.name, false);
      hideWelcomeScreen();
      renderAll();
      showToast('✅ Abierto desde el sistema: ' + handle.name);
      startAutoSave();
    } catch (e) {
      showToast('⚠ No se pudo abrir el archivo: ' + (e.message || e));
    }
  });
}

// --- Añadir botones de archivo al menú Gestión del Curso ---
// (se hace al cargar el DOM)
document.addEventListener('DOMContentLoaded', () => {
  const menu = document.getElementById('courseMenu');
  if (!menu) return;
  // Insertar sección de archivo al principio del menú
  const fileSection = document.createElement('div');
  fileSection.innerHTML = `
    <div class="dropdown-section-label">Archivo .json</div>
    <button class="dropdown-item" onclick="closeCourseMenu();fsNewFile()">
      <span class="di-icon">📄</span>
      <div><div class="di-title" style="color:var(--accent)">Nuevo archivo</div><div class="di-desc">Crear nuevo centro / curso académico</div></div>
    </button>
    <button class="dropdown-item" onclick="closeCourseMenu();fsOpenFile()">
      <span class="di-icon">📂</span>
      <div><div class="di-title">Abrir archivo .json</div><div class="di-desc">Abrir desde OneDrive, escritorio o USB</div></div>
    </button>
    <button class="dropdown-item di-save" onclick="closeCourseMenu();fsSave()">
      <span class="di-icon">💾</span>
      <div><div class="di-title">Guardar  <span style="font-size:10px;opacity:0.7">Ctrl+S</span></div><div class="di-desc">Guardar cambios en el archivo actual</div></div>
    </button>
    <button class="dropdown-item" onclick="closeCourseMenu();fsSaveAs()">
      <span class="di-icon">💿</span>
      <div><div class="di-title">Guardar como…  <span style="font-size:10px;opacity:0.7">Ctrl+⇧+S</span></div><div class="di-desc">Guardar con nuevo nombre o ubicación</div></div>
    </button>
    <div class="dropdown-divider"></div>
  `;
  menu.insertBefore(fileSection, menu.firstChild);
});

// --- PWA Install prompt ---
let _pwaInstallPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _pwaInstallPrompt = e;
  // Show install button in dropdown
  document.querySelectorAll('.install-app-btn').forEach(b => b.style.display = '');
  // Also show banner after 3s if not yet installed
  setTimeout(() => {
    const banner = document.getElementById('installBanner');
    if (banner) banner.classList.add('show');
  }, 3000);
});

// Hide install button if already installed
window.addEventListener('appinstalled', () => {
  document.querySelectorAll('.install-app-btn').forEach(b => b.style.display = 'none');
  document.getElementById('installBanner')?.classList.remove('show');
});

async function pwaInstall() {
  if (!_pwaInstallPrompt) return;
  _pwaInstallPrompt.prompt();
  const result = await _pwaInstallPrompt.userChoice;
  if (result.outcome === 'accepted') {
    showToast('✅ Gestor de Tutoría instalado. ¡Ya puedes abrirla desde el escritorio!');
    document.getElementById('installBanner')?.classList.remove('show');
  }
  _pwaInstallPrompt = null;
}
