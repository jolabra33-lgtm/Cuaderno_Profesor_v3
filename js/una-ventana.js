/* Cuaderno del profesor · Una sola ventana guardando a la vez
   js/una-ventana.js — lo cargan el Cuaderno (index.html) y Tutoría (tutoria/index.html),
   SIEMPRE el primero, antes que cualquier otro script:
     <script src="js/una-ventana.js" data-app="cuaderno" data-nombre="Cuaderno del profesor"></script>

   El problema: si la app está abierta en dos ventanas (dos pestañas, Split View en el iPad,
   o la v2 y la v3 a la vez, que comparten los datos del navegador), cada una trabaja con su
   copia y la última que guarda borra sin aviso los cambios de la otra.

   La solución: solo una ventana —la «activa»— puede guardar.
   - Al abrirse, la ventana pregunta (BroadcastChannel) si hay otra activa. Si contesta
     alguna, esta queda BLOQUEADA: aviso a pantalla completa y nada de lo que intente
     guardar llega al almacenamiento. Si nadie contesta en medio segundo, pasa a ser la activa.
   - «Usar esta ventana» pide el relevo: la activa guarda lo que tenga pendiente, cede y se
     bloquea; esta se recarga para leer los datos más recientes.
   - Cada relevo sube un contador guardado en localStorage. Una ventana que estaba dormida
     (iPad en segundo plano) y despierta después de que otra tomara el control lo nota en su
     primer intento de guardar y se bloquea sin escribir nada.
   El bloqueo actúa sobre el almacenamiento (localStorage, IndexedDB y archivos), así cubre
   todos los guardados de la app, también los del editor de exámenes y la Planificación. */
(function () {
  const script = document.currentScript;
  const APP = (script && script.dataset.app) || 'app';
  const NOMBRE = (script && script.dataset.nombre) || 'La aplicación';
  const CLAVE = 'una-ventana:' + APP;            // {id, n}: ventana activa y nº de relevo
  const yo = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const ls = window.localStorage;
  const setOriginal = Storage.prototype.setItem;
  const getOriginal = Storage.prototype.getItem;
  const removeOriginal = Storage.prototype.removeItem;
  const clearOriginal = Storage.prototype.clear;
  const transOriginal = window.IDBDatabase && IDBDatabase.prototype.transaction;
  const escrituraArchivoOriginal = window.FileSystemFileHandle && FileSystemFileHandle.prototype.createWritable;

  let estado = 'pendiente';   // 'pendiente' → 'activa' | 'bloqueada'
  let miN = null;
  const pendientes = new Map();   // escrituras en localStorage mientras se decide (se aplican si queda activa)
  const antesDeCeder = [];

  function leerTurno() { try { return JSON.parse(getOriginal.call(ls, CLAVE)); } catch (e) { return null; } }
  function escribirTurno(t) { try { setOriginal.call(ls, CLAVE, JSON.stringify(t)); } catch (e) {} }

  // ¿Sigue siendo esta la ventana activa? Si otra ha tomado el control, se bloquea.
  function sigoActiva() {
    if (estado !== 'activa') return false;
    const t = leerTurno();
    if (t && t.n !== miN) { bloquear('relevada'); return false; }
    if (!t) escribirTurno({ id: yo, n: miN });   // alguien borró los datos del sitio: se recupera el turno
    return true;
  }

  /* ---------- Almacenamiento protegido ---------- */
  function puedeEscribir(storage, clave) {
    if (storage !== ls) return 'si';            // sessionStorage no se comparte entre ventanas
    if (clave === CLAVE) return 'si';
    if (estado === 'pendiente') return 'espera';
    return sigoActiva() ? 'si' : 'no';
  }
  Storage.prototype.setItem = function (clave, valor) {
    const p = puedeEscribir(this, String(clave));
    if (p === 'espera') { pendientes.set(String(clave), String(valor)); return; }
    if (p === 'si') return setOriginal.call(this, clave, valor);
  };
  // Mientras se decide, lo que la app acaba de escribir se lee tal como lo escribió.
  Storage.prototype.getItem = function (clave) {
    if (this === ls && estado === 'pendiente' && pendientes.has(String(clave))) return pendientes.get(String(clave));
    return getOriginal.call(this, clave);
  };
  Storage.prototype.removeItem = function (clave) {
    const p = puedeEscribir(this, String(clave));
    if (p === 'espera') { pendientes.set(String(clave), null); return; }
    if (p === 'si') return removeOriginal.call(this, clave);
  };
  Storage.prototype.clear = function () {
    if (this !== ls || (estado === 'activa' && sigoActiva())) return clearOriginal.call(this);
  };
  function errorBloqueo() {
    try { return new DOMException('Esta ventana no puede guardar: la aplicación está abierta en otra.', 'ReadOnlyError'); }
    catch (e) { return new Error('Esta ventana no puede guardar: la aplicación está abierta en otra.'); }
  }
  if (transOriginal) {
    IDBDatabase.prototype.transaction = function (stores, modo, opciones) {
      if (modo === 'readwrite' && estado !== 'pendiente' && !sigoActiva()) throw errorBloqueo();
      return transOriginal.call(this, stores, modo, opciones);
    };
  }
  if (escrituraArchivoOriginal) {
    FileSystemFileHandle.prototype.createWritable = function (...args) {
      if (estado !== 'activa' || !sigoActiva()) return Promise.reject(errorBloqueo());
      return escrituraArchivoOriginal.apply(this, args);
    };
  }
  // Los marcos de la misma app (editor de exámenes, Planificación) tienen su propio
  // almacenamiento «de ventana»: al bloquear, también dejan de poder escribir.
  function bloquearMarcos(win) {
    for (const f of Array.from(win.frames || [])) {
      try {
        if (f.Storage && f.Storage.prototype.setItem !== Storage.prototype.setItem) {
          f.Storage.prototype.setItem = function () {};
          f.Storage.prototype.removeItem = function () {};
          f.Storage.prototype.clear = function () {};
          if (f.IDBDatabase) {
            const t = f.IDBDatabase.prototype.transaction;
            f.IDBDatabase.prototype.transaction = function (s, m, o) { if (m === 'readwrite') throw errorBloqueo(); return t.call(this, s, m, o); };
          }
        }
        bloquearMarcos(f);
      } catch (e) { /* marco de otro origen: no guarda en nuestro almacenamiento */ }
    }
  }

  /* ---------- Avisos ---------- */
  const TEXTOS = {
    'ya-abierta': ['🔒 ' + NOMBRE + ' ya está abierto en otra ventana',
      'Para no perder cambios, solo una ventana puede trabajar a la vez. También cuenta la otra versión de la app (v2 o v3) si la usas en este navegador. En esta ventana no se guardará nada.'],
    'cedida': ['🔒 Ahora se está usando otra ventana',
      'Has pasado a trabajar en otra ventana. Esta ya ha guardado todo y ha dejado de guardar, para no sobrescribir lo que hagas allí.'],
    'relevada': ['🔒 Ahora se está usando otra ventana',
      'Mientras esta ventana estaba en segundo plano, la app se abrió en otra. Para no sobrescribir lo que se haya hecho allí, esta ventana ha dejado de guardar.']
  };
  function mostrarAviso(motivo) {
    if (!document.body) { document.addEventListener('DOMContentLoaded', () => mostrarAviso(motivo), { once: true }); return; }
    let ov = document.getElementById('unaVentanaOverlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'unaVentanaOverlay';
      ov.setAttribute('role', 'alertdialog');
      ov.setAttribute('aria-modal', 'true');
      ov.setAttribute('aria-labelledby', 'unaVentanaTitulo');
      ov.setAttribute('aria-describedby', 'unaVentanaTexto');
      ov.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;' +
        'background:rgba(15,23,42,.72);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif';
      document.body.appendChild(ov);
    }
    const [titulo, texto] = TEXTOS[motivo] || TEXTOS['ya-abierta'];
    ov.innerHTML = '<div style="max-width:460px;width:100%;background:#fff;color:#0f172a;border-radius:14px;padding:22px 22px 18px;box-shadow:0 20px 50px rgba(0,0,0,.35)">' +
      '<h2 id="unaVentanaTitulo" style="font-size:18px;margin:0 0 10px;line-height:1.3"></h2>' +
      '<p id="unaVentanaTexto" style="margin:0 0 12px;color:#334155"></p>' +
      '<p style="margin:0 0 16px;font-size:13.5px;color:#64748b">Si quieres trabajar aquí, pulsa «Usar esta ventana»: la otra guardará lo pendiente y se bloqueará, y esta se recargará con los datos más recientes.</p>' +
      '<div style="display:flex;justify-content:flex-end"><button type="button" id="unaVentanaUsar" style="background:#2563eb;color:#fff;border:0;border-radius:9px;padding:10px 16px;font:inherit;font-weight:600;cursor:pointer">Usar esta ventana</button></div></div>';
    ov.querySelector('#unaVentanaTitulo').textContent = titulo;
    ov.querySelector('#unaVentanaTexto').textContent = texto;
    const btn = ov.querySelector('#unaVentanaUsar');
    btn.onclick = usarEstaVentana;
    setTimeout(() => btn.focus(), 30);
  }

  /* ---------- Coordinación entre ventanas ---------- */
  const canal = 'BroadcastChannel' in window ? new BroadcastChannel(CLAVE) : null;
  function enviar(m) { try { canal && canal.postMessage(Object.assign({ de: yo }, m)); } catch (e) {} }

  function bloquear(motivo) {
    if (estado === 'bloqueada') return;
    estado = 'bloqueada';
    pendientes.clear();
    try { bloquearMarcos(window); } catch (e) {}
    mostrarAviso(motivo);
  }
  function hacerseActiva() {
    const t = leerTurno();
    miN = ((t && t.n) || 0) + 1;
    escribirTurno({ id: yo, n: miN });
    estado = 'activa';
    for (const [k, v] of pendientes) { try { v === null ? removeOriginal.call(ls, k) : setOriginal.call(ls, k, v); } catch (e) {} }
    pendientes.clear();
  }
  function guardarPendiente() {
    for (const fn of antesDeCeder) { try { fn(); } catch (e) {} }
  }

  let esperandoRelevo = null;
  if (canal) canal.onmessage = (ev) => {
    const m = ev.data || {};
    if (m.de === yo) return;
    if (m.tipo === 'quien' && estado === 'activa' && sigoActiva()) enviar({ tipo: 'aqui' });
    else if (m.tipo === 'aqui' && estado === 'pendiente') bloquear('ya-abierta');
    else if (m.tipo === 'pide' && estado === 'activa') { guardarPendiente(); bloquear('cedida'); enviar({ tipo: 'cedo', para: m.de }); }
    else if (m.tipo === 'cedo' && m.para === yo && esperandoRelevo) esperandoRelevo();
  };

  function usarEstaVentana() {
    const btn = document.getElementById('unaVentanaUsar');
    if (btn) { btn.disabled = true; btn.textContent = 'Cambiando…'; }
    // Se espera a que la otra ventana guarde y ceda; si está dormida y no contesta, se sigue igualmente.
    new Promise(ok => { esperandoRelevo = ok; enviar({ tipo: 'pide' }); setTimeout(ok, 1500); }).then(() => {
      const t = leerTurno();
      escribirTurno({ id: yo, n: ((t && t.n) || 0) + 1 });
      location.reload();
    });
  }

  // Al volver a la ventana o si otra cambia el turno, se comprueba enseguida.
  window.addEventListener('storage', (e) => { if (e.key === CLAVE && estado === 'activa') sigoActiva(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && estado === 'activa') sigoActiva(); });

  window.UnaVentana = {
    /* La app registra aquí cómo guardar al momento lo que tenga pendiente (se llama antes de ceder). */
    antesDeCeder(fn) { if (typeof fn === 'function') antesDeCeder.push(fn); },
    get estado() { return estado; }
  };

  if (!canal) { hacerseActiva(); return; }   // navegador muy antiguo: sin coordinación, como antes
  enviar({ tipo: 'quien' });
  setTimeout(() => { if (estado === 'pendiente') hacerseActiva(); }, 500);
})();
