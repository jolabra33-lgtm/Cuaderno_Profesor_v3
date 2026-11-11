/* Cuaderno del profesor · Bloqueo con PIN
   js/bloqueo.js — lo cargan el Cuaderno (index.html) y Tutoría (tutoria/index.html), en <head>:
     <script src="js/bloqueo.js"></script>

   Para qué sirve: que nadie abra la app en un descuido (un alumno con el iPad, el ordenador del aula,
   la pantalla proyectada). Si hay un PIN configurado, la app se abre tapada y pide el PIN; también se
   bloquea sola tras unos minutos sin usarla o en segundo plano, y con el botón 🔒 de la cabecera.

   Qué NO es: no cifra los datos. Es un cierre de pantalla, no una caja fuerte: no protege frente a quien
   tenga acceso técnico al dispositivo. Para eso están la contraseña del propio dispositivo y las copias
   cifradas.

   - El PIN no se guarda: se guarda su resumen (PBKDF2-SHA-256 con sal) en localStorage. Es una
     preferencia del dispositivo: no viaja con las copias de seguridad.
   - Al activarlo se muestra, una sola vez, un código de recuperación. Con él se quita el PIN si se olvida.
   - El desbloqueo vale para la pestaña (sessionStorage): pasar del Cuaderno a Tutoría o recargar no
     vuelve a pedir el PIN mientras no haya pasado el tiempo de bloqueo.
   - Tras 5 intentos fallidos hay que esperar 30 segundos.

   API (window.BloqueoPIN): activo, minutos, configurar(pin, minutos) → código de recuperación,
   comprobar(pin), cambiarMinutos(m), quitar(), bloquear().                                        */
(function () {
  const CLAVE = 'cuaderno_bloqueo_pin';          // {sal, hash, iter, min, rsal, rhash}
  const CLAVE_SESION = 'cuaderno_bloqueo_ok';    // marca de tiempo de la última actividad con la app desbloqueada
  const ITER = 150000;
  const hayCripto = !!(window.crypto && crypto.subtle && window.TextEncoder);

  function leer() { try { const c = JSON.parse(localStorage.getItem(CLAVE)); return c && c.hash && c.sal ? c : null; } catch (e) { return null; } }
  function guardar(c) { try { if (c) localStorage.setItem(CLAVE, JSON.stringify(c)); else localStorage.removeItem(CLAVE); return true; } catch (e) { return false; } }
  const b64 = buf => { let s = ''; new Uint8Array(buf).forEach(b => { s += String.fromCharCode(b); }); return btoa(s); };
  const deB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function resumen(texto, sal, iter) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(texto), 'PBKDF2', false, ['deriveBits']);
    return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: sal, iterations: iter, hash: 'SHA-256' }, base, 256));
  }
  const normCodigo = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  function codigoNuevo() {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // sin 0/O ni 1/I, que se confunden
    const r = crypto.getRandomValues(new Uint8Array(12));
    const c = Array.from(r, b => abc[b % abc.length]).join('');
    return c.slice(0, 4) + '-' + c.slice(4, 8) + '-' + c.slice(8);
  }

  const CLAVE_INTENTOS = 'cuaderno_bloqueo_intentos';   // {fallos, hasta}: se guarda para que recargar no salte la espera
  let bloqueada = false, fallos = 0, esperaHasta = 0, ultimaActividad = Date.now(), ocultaDesde = 0;
  try { const i = JSON.parse(localStorage.getItem(CLAVE_INTENTOS)); if (i) { fallos = Number(i.fallos) || 0; esperaHasta = Number(i.hasta) || 0; } } catch (e) {}
  const guardarIntentos = () => { try { if (fallos || esperaHasta > Date.now()) localStorage.setItem(CLAVE_INTENTOS, JSON.stringify({ fallos, hasta: esperaHasta })); else localStorage.removeItem(CLAVE_INTENTOS); } catch (e) {} };
  const sesionOk = () => { try { sessionStorage.setItem(CLAVE_SESION, String(Date.now())); } catch (e) {} };
  const sesionVale = (c) => {
    try {
      const t = Number(sessionStorage.getItem(CLAVE_SESION)) || 0;
      if (!t) return false;
      return !c.min || Date.now() - t < c.min * 60000;
    } catch (e) { return false; }
  };

  // Mientras está bloqueada, lo único visible de la página es la ventana del PIN.
  const css = document.createElement('style');
  css.textContent = 'html.app-bloqueada body > *:not(#bloqueoOverlay){visibility:hidden!important}' +
    'html.app-bloqueada, html.app-bloqueada body{overflow:hidden!important}' +
    '#bloqueoOverlay{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;padding:16px;' +
    'background:linear-gradient(135deg,#0a1120,#1b3358);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}' +
    '#bloqueoOverlay .bq-caja{max-width:360px;width:100%;background:#fff;color:#0f172a;border-radius:16px;padding:24px 22px 18px;box-shadow:0 20px 50px rgba(0,0,0,.4);text-align:center}' +
    '#bloqueoOverlay h2{font-size:19px;margin:6px 0 4px;line-height:1.3}' +
    '#bloqueoOverlay p{margin:0 0 12px;color:#475569;font-size:13.5px}' +
    '#bloqueoOverlay input{width:100%;box-sizing:border-box;font:inherit;font-size:22px;letter-spacing:.25em;text-align:center;padding:10px;border:1.5px solid #94a3b8;border-radius:10px;color:#0f172a;background:#fff}' +
    '#bloqueoOverlay input.bq-codigo{font-size:16px;letter-spacing:.08em}' +
    '#bloqueoOverlay input:focus{outline:3px solid #93c5fd;border-color:#2563eb}' +
    '#bloqueoOverlay .bq-btn{width:100%;margin-top:12px;background:#1d4ed8;color:#fff;border:0;border-radius:10px;padding:11px 16px;font:inherit;font-weight:600;cursor:pointer}' +
    '#bloqueoOverlay .bq-btn:disabled{opacity:.6;cursor:default}' +
    '#bloqueoOverlay .bq-enlace{margin-top:12px;background:none;border:0;color:#1d4ed8;font:inherit;font-size:13px;text-decoration:underline;cursor:pointer}' +
    '#bloqueoOverlay .bq-error{min-height:20px;margin:8px 0 0;color:#b91c1c;font-size:13px}';
  document.head.appendChild(css);

  function pintar(modo) {
    if (!document.body) { document.addEventListener('DOMContentLoaded', () => pintar(modo), { once: true }); return; }
    let ov = document.getElementById('bloqueoOverlay');
    if (!ov) {
      ov = document.createElement('div'); ov.id = 'bloqueoOverlay';
      ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'bqTitulo');
      document.body.appendChild(ov);
    }
    const rec = modo === 'recuperar';
    ov.innerHTML = '<form class="bq-caja" autocomplete="off"><div style="font-size:34px" aria-hidden="true">🔒</div>' +
      '<h2 id="bqTitulo">' + (rec ? 'Quitar el PIN con el código de recuperación' : 'Cuaderno del profesor bloqueado') + '</h2>' +
      '<p>' + (rec ? 'Escribe el código que se te mostró al activar el PIN. Tus datos no se tocan.' : 'Escribe el PIN para continuar.') + '</p>' +
      (rec ? '<input class="bq-codigo" id="bqCampo" type="text" autocapitalize="characters" spellcheck="false" aria-label="Código de recuperación" placeholder="XXXX-XXXX-XXXX">'
           : '<input id="bqCampo" type="password" inputmode="numeric" autocomplete="off" aria-label="PIN" maxlength="12">') +
      '<div class="bq-error" id="bqError" role="alert"></div>' +
      '<button class="bq-btn" type="submit">' + (rec ? 'Quitar el PIN' : 'Desbloquear') + '</button>' +
      '<button class="bq-enlace" type="button" id="bqOtro">' + (rec ? '← Volver a escribir el PIN' : 'He olvidado el PIN') + '</button></form>';
    const campo = ov.querySelector('#bqCampo'), err = ov.querySelector('#bqError'), btn = ov.querySelector('.bq-btn');
    ov.querySelector('#bqOtro').onclick = () => pintar(rec ? 'pin' : 'recuperar');
    ov.querySelector('form').onsubmit = async (e) => {
      e.preventDefault();
      const c = leer(); if (!c) { desbloquear(); return; }
      const falta = Math.ceil((esperaHasta - Date.now()) / 1000);
      if (falta > 0) { err.textContent = 'Demasiados intentos. Espera ' + falta + ' s.'; return; }
      const valor = campo.value; if (!valor) return;
      btn.disabled = true;
      let ok = false;
      try {
        ok = rec ? (!!c.rhash && await resumen(normCodigo(valor), deB64(c.rsal), c.iter || ITER) === c.rhash)
                 : (await resumen(valor, deB64(c.sal), c.iter || ITER) === c.hash);
      } catch (e2) { ok = false; }
      btn.disabled = false;
      if (ok) {
        fallos = 0; esperaHasta = 0; guardarIntentos();
        if (rec) { guardar(null); desbloquear(); avisar('PIN eliminado. Puedes activar uno nuevo en 🛟 Copias.'); }
        else desbloquear();
        return;
      }
      fallos++;
      if (fallos >= 5) { fallos = 0; esperaHasta = Date.now() + 30000; err.textContent = 'Demasiados intentos. Espera 30 s.'; }
      else err.textContent = rec ? 'Ese código no es correcto.' : 'PIN incorrecto.';
      guardarIntentos();
      campo.value = ''; campo.focus();
    };
    setTimeout(() => { try { campo.focus(); } catch (e) {} }, 40);
  }
  function avisar(t) { try { if (typeof mostrarToast === 'function') mostrarToast(t, 'info'); else if (typeof showToast === 'function') showToast(t); } catch (e) {} }

  function bloquear() {
    if (bloqueada || !leer() || !hayCripto) return;
    bloqueada = true;
    try { sessionStorage.removeItem(CLAVE_SESION); } catch (e) {}
    try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) {}
    document.documentElement.classList.add('app-bloqueada');
    pintar('pin');
  }
  function desbloquear() {
    bloqueada = false; ultimaActividad = Date.now(); sesionOk();
    document.documentElement.classList.remove('app-bloqueada');
    const ov = document.getElementById('bloqueoOverlay'); if (ov) ov.remove();
    actualizarBoton();
  }
  function actualizarBoton() {
    const b = document.getElementById('bloqueoBtn'); if (b) b.style.display = leer() && hayCripto ? '' : 'none';
  }

  // Bloqueo automático: tras «min» minutos sin tocar la app o con la app en segundo plano.
  const actividad = () => { if (!bloqueada) { const a = Date.now(); if (a - ultimaActividad > 5000) sesionOk(); ultimaActividad = a; } };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(ev => window.addEventListener(ev, actividad, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => {
    const c = leer(); if (!c || bloqueada) return;
    if (document.visibilityState === 'hidden') { ocultaDesde = Date.now(); return; }
    if (c.min && ocultaDesde && Date.now() - Math.min(ocultaDesde, ultimaActividad) >= c.min * 60000) bloquear();
    ocultaDesde = 0;
  });
  setInterval(() => { const c = leer(); if (c && c.min && !bloqueada && Date.now() - ultimaActividad >= c.min * 60000) bloquear(); }, 15000);

  window.BloqueoPIN = {
    get disponible() { return hayCripto; },
    get activo() { return !!leer(); },
    get minutos() { const c = leer(); return c ? (c.min || 0) : 0; },
    get bloqueada() { return bloqueada; },
    /* Activa o cambia el PIN. Devuelve el código de recuperación (se muestra una sola vez). */
    async configurar(pin, minutos) {
      if (!hayCripto) throw new Error('Este navegador no permite activar el PIN aquí.');
      pin = String(pin || '');
      if (!/^\d{4,12}$/.test(pin)) throw new Error('El PIN debe tener entre 4 y 12 cifras.');
      const sal = crypto.getRandomValues(new Uint8Array(16)), rsal = crypto.getRandomValues(new Uint8Array(16)), codigo = codigoNuevo();
      const c = { sal: b64(sal), hash: await resumen(pin, sal, ITER), iter: ITER, min: Math.max(0, Number(minutos) || 0), rsal: b64(rsal), rhash: await resumen(normCodigo(codigo), rsal, ITER) };
      if (!guardar(c)) throw new Error('No se ha podido guardar el PIN en este dispositivo.');
      sesionOk(); actualizarBoton();
      return codigo;
    },
    async comprobar(pin) { const c = leer(); if (!c) return true; try { return await resumen(String(pin || ''), deB64(c.sal), c.iter || ITER) === c.hash; } catch (e) { return false; } },
    cambiarMinutos(m) { const c = leer(); if (!c) return; c.min = Math.max(0, Number(m) || 0); guardar(c); },
    quitar() { guardar(null); actualizarBoton(); },
    bloquear
  };

  // Al abrir: si hay PIN y la pestaña no estaba ya desbloqueada, la app arranca tapada.
  const c0 = leer();
  if (c0 && hayCripto && !sesionVale(c0)) bloquear();
  else if (c0) sesionOk();
  document.addEventListener('DOMContentLoaded', actualizarBoton);
})();
