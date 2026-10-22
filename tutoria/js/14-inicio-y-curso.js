/* ============================================================================
   Gestor de Tutoría · Arranque, menú del curso, versiones, convocatoria, tema e importación del centro
   tutoria/js/14-inicio-y-curso.js
   ============================================================================ */

// ===================== INIT =====================

function syncDateInputs() {
  const bar = document.getElementById('evalDatesBar');
  if (!bar) return;
  const nivel = currentNivel;
  const SPECIAL = ['__home__', '__materias__', '__calendario__', '__convivencia__', '__informe__', '__vacantes__'];
  if (SPECIAL.includes(nivel)) {
    bar.style.display = 'none';
    return;
  }
  bar.style.display = 'flex';
  const d = getDates(nivel);
  const inp = (id, val, color, label, field) =>
    `<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text2);">
      <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block"></span>
      ${label}
      <input type="date" id="${id}"
        style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:4px 8px;color:var(--text);font-family:inherit;font-size:12px;"
        value="${val}"
        onchange="evalDates['${jsAttr(nivel)}']['${field}']=this.value;refreshAges()" />
    </label>`;
  bar.innerHTML =
    `<span style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">
       📅 ${nivel} — Fechas de evaluación:
     </span>` +
    inp('dateEval1', d.eval1, 'var(--accent)', 'I Evaluación',  'eval1') +
    inp('dateEval2', d.eval2, 'var(--green)',  'II Evaluación', 'eval2') +
    inp('dateEval3', d.eval3, 'var(--orange)', 'III Evaluación','eval3') +
    `<span style="font-size:11px;color:var(--text3);margin-left:auto;">La edad se calcula en la fecha de cada sesión de evaluación</span>`;
}

function refreshAges() {
  const nivel = currentNivel;
  const SPECIAL = ['__home__', '__materias__', '__calendario__', '__convivencia__', '__informe__', '__vacantes__'];
  if (SPECIAL.includes(nivel)) return;
  const grupo = currentGrupos[nivel];
  updateTable(nivel, grupo);
}

// ===================== DROPDOWN MENÚ CURSO =====================

function toggleCourseMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById('courseMenu');
  const arrow = document.getElementById('courseMenuArrow');
  const isOpen = menu.classList.contains('open');
  menu.classList.toggle('open', !isOpen);
  arrow.classList.toggle('open', !isOpen);
}

function closeCourseMenu() {
  document.getElementById('courseMenu').classList.remove('open');
  document.getElementById('courseMenuArrow').classList.remove('open');
}

document.addEventListener('click', function(e) {
  const wrapper = document.getElementById('courseMenuWrapper');
  if (wrapper && !wrapper.contains(e.target)) closeCourseMenu();
});

// ===================== GUARDAR VERSIÓN DEL CURSO =====================

/* La app está repartida en archivos (css/, js/, vendor/). La versión del curso
   es un único .html que se abre desde el correo, sin servidor: aquí se mete
   dentro el contenido de cada archivo, en el mismo orden y en el mismo sitio.
   No se incluyen el aviso de versión nueva ni el bloqueo de ventanas, que
   solo tienen sentido en la app instalada. */
const _VERSION_SIN = ['../js/registro-sw.js', '../js/una-ventana.js'];
async function _htmlAutocontenido() {
  const raiz = document.documentElement.cloneNode(true);
  raiz.querySelectorAll('#avisoVersionNueva, #unaVentanaOverlay').forEach(n => n.remove());
  const leer = async (src) => {
    const r = await fetch(new URL(src, location.href).href);
    if (!r.ok) throw new Error('No se ha podido leer ' + src);
    return r.text();
  };
  for (const sc of [...raiz.querySelectorAll('script[src]')]) {
    const src = sc.getAttribute('src');
    if (_VERSION_SIN.includes(src)) { sc.remove(); continue; }
    const nuevo = document.createElement('script');
    // Un cierre de etiqueta dentro del código cortaría el script: se neutraliza.
    nuevo.textContent = '\n' + (await leer(src)).replace(/<\/(script)/gi, '<\\/$1') + '\n';
    sc.replaceWith(nuevo);
  }
  for (const ln of [...raiz.querySelectorAll('link[rel="stylesheet"]')]) {
    const st = document.createElement('style');
    st.textContent = '\n' + (await leer(ln.getAttribute('href'))) + '\n';
    ln.replaceWith(st);
  }
  raiz.querySelectorAll('link[rel="manifest"]').forEach(n => n.remove());
  return raiz.outerHTML;
}

async function guardarVersionCurso() {
  const year  = new Date().getFullYear();
  const month = String(new Date().getMonth()+1).padStart(2,'0');
  const day   = String(new Date().getDate()).padStart(2,'0');
  const filename = `evaluaciones_IES_${year}-${month}-${day}.html`;

  let html;
  try { html = await _htmlAutocontenido(); }
  catch (e) { mostrarAviso('No se ha podido generar la versión del curso: ' + (e.message || e) + '. Ábrela con conexión e inténtalo de nuevo.'); return; }

  // Construimos las etiquetas de apertura y cierre por CONCATENACION para que
  // el texto fuente de esta funcion no contenga nunca, de forma literal, la
  // apertura ni el cierre de una etiqueta de script. Si apareciera tal cual,
  // el navegador cerraria aqui mismo el script principal de la aplicacion y la
  // version exportada se rompe entera (ningun boton funcionaria). Por el mismo
  // motivo, ningun comentario de esta funcion usa el caracter "menor que".
  const S_OPEN  = '<' + 'script id="__snapshot__">';
  const S_CLOSE = '<' + '/script>';

  // 1. Si se re-exporta un archivo ya fosilizado, quitar el snapshot anterior.
  //    Anclado tras la cabecera para no afectar a ninguna otra parte.
  html = html.replace(
    new RegExp('(<head>\\s*)' + S_OPEN + '[\\s\\S]*?' + S_CLOSE + '\\s*', 'i'),
    (m, g1) => g1
  );

  // 2. Datos completos de la aplicacion, congelados para la version exportada.
  const cap = (obj) => { const out={}; Object.entries(obj||{}).forEach(([k,v])=>{ if(v && v.src && v.src.length < 2_000_000) out[k]=v; }); return out; };
  const snap = {
    data:            JSON.parse(JSON.stringify(data)),
    GRUPOS_POR_NIVEL:JSON.parse(JSON.stringify(GRUPOS_POR_NIVEL)),
    NIVELES:         JSON.parse(JSON.stringify(NIVELES)),
    tutores:         JSON.parse(JSON.stringify(tutores)),
    evalDates:       JSON.parse(JSON.stringify(evalDates)),
    iesName:         document.getElementById('headerIesName')?.value || '',
    obsGrupoData:    JSON.parse(JSON.stringify(window._obsGrupoData || {})),
    materiasCustom:  JSON.parse(JSON.stringify(_materiasCustom || {})),
    asistenciaData:  JSON.parse(JSON.stringify(window._asistenciaData || {})),
    convivenciaData: JSON.parse(JSON.stringify(window._convivenciaData || {})),
    actasData:       JSON.parse(JSON.stringify(window._actasData || {})),
    actasOficialesData: JSON.parse(JSON.stringify(window._actasOficialesData || {})),
    vacantesCfg:     JSON.parse(JSON.stringify(typeof _vacantesCfg!=='undefined' ? _vacantesCfg : {})),
    actasNoOficialesTabVisible: _actasNoOficialesTabVisible,
    fotoData:        cap(window._fotoData),
    horarioData:     cap(window._horarioData),
  };

  // 3. Blindaje del JSON incrustado: escapamos cada caracter "menor que" como
  //    su forma unicode (y los separadores de linea U+2028/U+2029) para que
  //    ningun dato (observaciones, nombres, materias...) pueda formar una
  //    etiqueta que el navegador interprete y que rompa el script. Al abrir el
  //    archivo, JSON.parse devuelve los valores originales intactos.
  const snapJson = JSON.stringify(snap)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  // Cuerpo del script de restauracion. No contiene el caracter "menor que" en
  // ningun punto, asi que es seguro incrustarlo entre S_OPEN y S_CLOSE.
  const snapBody = `
window.__IS_SNAPSHOT_EXPORT__ = true;
(function(){
  var _s = JSON.parse(${JSON.stringify(snapJson)});
  function _applySnap(){
    try {
      if(_s.data){ Object.keys(_s.data).forEach(function(n){ if(typeof data!=='undefined') data[n]=_s.data[n]; }); }
      if(_s.GRUPOS_POR_NIVEL && typeof GRUPOS_POR_NIVEL!=='undefined'){
        Object.keys(GRUPOS_POR_NIVEL).forEach(function(k){ delete GRUPOS_POR_NIVEL[k]; });
        Object.keys(_s.GRUPOS_POR_NIVEL).forEach(function(n){ GRUPOS_POR_NIVEL[n]=_s.GRUPOS_POR_NIVEL[n]; });
      }
      if(_s.NIVELES && typeof NIVELES!=='undefined'){
        NIVELES.length=0; _s.NIVELES.forEach(function(n){ NIVELES.push(n); });
      }
      if(_s.tutores && typeof tutores!=='undefined') Object.assign(tutores, _s.tutores);
      if(_s.evalDates && typeof evalDates!=='undefined') Object.assign(evalDates, _s.evalDates);
      if(_s.obsGrupoData && typeof window._obsGrupoData!=='undefined') Object.assign(window._obsGrupoData, _s.obsGrupoData);
      if(_s.materiasCustom && typeof _materiasCustom!=='undefined') Object.assign(_materiasCustom, _s.materiasCustom);
      if(_s.asistenciaData){ if(!window._asistenciaData) window._asistenciaData={}; Object.assign(window._asistenciaData, _s.asistenciaData); }
      if(_s.convivenciaData){ if(!window._convivenciaData) window._convivenciaData={}; Object.assign(window._convivenciaData, _s.convivenciaData); }
      if(_s.actasData){ if(!window._actasData) window._actasData={}; Object.assign(window._actasData, _s.actasData); }
      if(_s.actasOficialesData){ if(!window._actasOficialesData) window._actasOficialesData={}; Object.assign(window._actasOficialesData, _s.actasOficialesData); }
      if(_s.vacantesCfg && typeof _vacantesCfg!=='undefined') Object.assign(_vacantesCfg, _s.vacantesCfg);
      if(typeof _s.actasNoOficialesTabVisible === 'boolean' && typeof _actasNoOficialesTabVisible!=='undefined') _actasNoOficialesTabVisible = _s.actasNoOficialesTabVisible;
      if(_s.fotoData){ if(!window._fotoData) window._fotoData={}; Object.assign(window._fotoData, _s.fotoData); }
      if(_s.horarioData){ if(!window._horarioData) window._horarioData={}; Object.assign(window._horarioData, _s.horarioData); }
      if(_s.iesName){ var el=document.getElementById('headerIesName'); if(el) el.value=_s.iesName; }
      if(typeof NIVELES!=='undefined' && typeof currentGrupos!=='undefined'){
        NIVELES.forEach(function(n){ if((!currentGrupos[n]||!GRUPOS_POR_NIVEL[n]?.includes(currentGrupos[n]))&&GRUPOS_POR_NIVEL[n]) currentGrupos[n]=GRUPOS_POR_NIVEL[n][0]; });
      }
    } catch(e){ console.warn('Snapshot restore error', e); }
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', function(){ _applySnap(); if(typeof renderAll==='function'){renderAll(); if(typeof syncDateInputs==='function')syncDateInputs();} });
  } else {
    _applySnap();
  }
})();
`;
  const snapshotScript = S_OPEN + snapBody + S_CLOSE;

  // 4. Inyectamos el snapshot justo despues de la cabecera. Usamos la forma de
  //    FUNCION de String.replace para que secuencias como dolar-ampersand que
  //    pudieran aparecer en los datos no se tomen como patrones especiales.
  html = html.replace('<head>', () => '<head>\n' + snapshotScript);

  // 5. outerHTML no incluye la declaracion DOCTYPE; sin ella el navegador entra
  //    en "quirks mode" y la maquetacion se descuadra. La restauramos.
  const DOCTYPE = '<' + '!DOCTYPE html>\n';
  if (!/^\s*<!doctype/i.test(html)) html = DOCTYPE + html;

  const blob = new Blob([html], {type: 'text/html;charset=utf-8'});
  triggerDownload(blob, filename);
  const mb = (blob.size / (1024*1024)).toFixed(1);
  if (blob.size > 9 * 1024 * 1024) {
    showToast(`✅ Generado ${filename} (${mb} MB) — pesa bastante para un correo normal; si falla el envío, súbelo a Drive/OneDrive y comparte el enlace`);
  } else {
    showToast(`✅ Versión fosilizada lista: ${filename} (${mb} MB) — ya puedes adjuntarla al correo para el claustro`);
  }
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
}

function openGuide() {
  let overlay = document.getElementById('guideOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'guideOverlay';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '700';
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
    overlay.innerHTML = `
      <div class="modal" style="width:560px;max-height:80vh;overflow-y:auto;">
        <div class="modal-title">📖 Guía rápida — Gestor de Tutoría</div>
        <div style="font-size:13px;color:var(--text2);line-height:1.8;">
          <p style="margin-bottom:12px">Gestor de Tutoría: seguimiento de evaluaciones, promoción y tutoría para centros de secundaria de la Comunitat Valenciana. Tiene sus propios datos y su propio archivo <code>.json</code>. Del Cuaderno del profesor puede recibir la lista de alumnado (botón <strong>📥 Del Cuaderno</strong> de cada grupo) y los suspensos de cada materia (⚙️ Gestión del Curso → «Importar suspensos del Cuaderno»).</p>
          <div style="font-weight:700;color:var(--text);margin-bottom:4px">🏠 Pestañas principales</div>
          <ul style="margin:0 0 12px 16px">
            <li><strong>Inicio</strong> — Resumen global con propuestas por nivel, FPB, PDC y Titulación</li>
            <li><strong>📅 Calendario</strong> — Fechas de las sesiones de evaluación (círculos de color) y <strong>tus propios eventos</strong> (cuadrados): pulsa cualquier día para añadir reunión, junta, entrega, actividad… Vista de mes o cronología</li>
            <li><strong>🎓 Informe Académico</strong> — Estadísticas de aprobados/suspensos por materia y nivel, con subpestañas para I Eval., II Eval., Evaluación Final y Extraordinaria; incluye el PDF Estadísticas</li>
            <li><strong>📞 Seguimientos</strong> — Listado por grupo de todos los registros de "Seguimiento con familia", para consultarlos o imprimirlos juntos (por ejemplo, si inspección los pide)</li>
            <li><strong>🤝 Informe Convivencia</strong> — Amonestaciones, partes, expedientes y faltas de asistencia, calculados a partir de las tablas de cada evaluación</li>
            <li><strong>⚙ Materias</strong> — Personaliza las materias disponibles por nivel</li>
          </ul>
          <div style="font-weight:700;color:var(--text);margin-bottom:4px">👤 Por alumno (una columna por botón, al final de su fila)</div>
          <ul style="margin:0 0 12px 16px">
            <li><strong>📅</strong> Historial académico de cursos anteriores</li>
            <li><strong>📋</strong> Informe de seguimiento individual (PDF), generado automáticamente con sus datos</li>
            <li><strong>📞</strong> <strong>Seguimiento con familia</strong> — para cuando los padres piden reunión: anota, materia por materia, lo que te ha dicho cada profesor/a (Trabajo, Exámenes, Comportamiento). Quita las materias que no correspondan y añade las que hagan falta. Cada vez que guardas se crea un registro nuevo fechado, así que puedes repetirlo tantas veces al año como haga falta; cada uno se imprime por separado</li>
            <li><strong>↗</strong> Mover alumno a otro grupo o nivel</li>
          </ul>
          <div style="font-weight:700;color:var(--text);margin-bottom:4px">📋 Por grupo (cabecera de grupo)</div>
          <ul style="margin:0 0 12px 16px">
            <li><strong>🗂️ Actas no Oficiales</strong> — Pestaña que centraliza el acceso a las Actas I/II/Final (editables) de todos los grupos; se puede ocultar/mostrar con el icono 🗂️👁️ junto a "＋ Nivel"</li>
            <li><strong>Acta I/II/Final</strong> — Actas de sesión de evaluación, editables y guardables; se pueden exportar a PDF, Word o HTML (esta última conserva la maquetación exacta)</li>
            <li><strong>Acta Oficial</strong> — Genera el acta de sesión para I, II o Evaluación Final, con estadísticas de materias suspendidas, pendientes de cursos anteriores, alumnado NESE/Compensatoria con leyenda de códigos, faltas/convivencia y evolución entre evaluaciones; permite guardar acuerdos, firmas y decisiones sobre pendientes, y exportar a PDF, Word o HTML</li>
            <li><strong>🖼️ Fotos del grupo</strong> — Galería de fotos del alumnado</li>
            <li><strong>🪑 Plano del grupo</strong> — Distribución de mesas: toca un alumno/a (de la lista o de una mesa) y luego una mesa; si está libre se sienta ahí, si está ocupada se intercambian. Tamaño de cuadrícula ajustable e imprimible</li>
            <li><strong>🕐 Horario del grupo</strong> — Horario semanal del grupo</li>
            <li><strong>👥 Asistencia sesión</strong> — Pasa lista al equipo docente en cada junta de evaluación</li>
            <li><strong>👨‍🏫 Equipo docente</strong> — Nombre, materia y correo corporativo de cada profesor/a del grupo. Es la lista que usa "Asistencia sesión" para pasar lista, y desde aquí puedes enviar un correo a una persona, a varias seleccionadas o a todo el equipo (se abre tu propio Outlook con los destinatarios puestos)</li>
            <li><strong>📝 Observaciones del grupo</strong> — Notas generales del grupo</li>
          </ul>
          <div style="font-weight:700;color:var(--text);margin-bottom:4px">💾 Guardar datos</div>
          <ul style="margin:0 0 12px 16px">
            <li>Los datos se guardan automáticamente en el navegador (localStorage), siempre en formato JSON</li>
            <li>Usa <strong>Ctrl+S</strong> o el menú de guardar para escribir al archivo <code>.json</code></li>
            <li>El archivo <code>.json</code> es portable — lo puedes abrir en cualquier ordenador, e incluso con un editor de texto</li>
          </ul>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" onclick="document.getElementById('guideOverlay').classList.remove('open')">Entendido</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }
  overlay.classList.add('open');
}

function showToast(msg) {
  let t = document.getElementById('appToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'appToast';
    t.style.cssText = `position:fixed;bottom:28px;left:50%;transform:translateX(-50%);
      background:var(--surface2);border:1px solid var(--border);color:var(--text);
      padding:12px 22px;border-radius:10px;font-size:13px;font-weight:500;
      box-shadow:0 8px 32px rgba(0,0,0,0.5);z-index:9999;
      transition:opacity 0.4s;pointer-events:none;`;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._to);
  t._to = setTimeout(()=>{ t.style.opacity='0'; }, 3500);
}

// ===================== MODAL NUEVA CONVOCATORIA =====================

function openResetModal() {
  const el = document.getElementById('resetOverlay');
  el.style.display = 'flex';
  document.getElementById('resetConfirmInput').value = '';
  document.getElementById('resetExecBtn').disabled = true;
}

function closeResetModal() {
  document.getElementById('resetOverlay').style.display = 'none';
}

function executeReset() {
  // Clear all students from all levels/groups
  Object.keys(data).forEach(nivel => {
    if (data[nivel] && typeof data[nivel] === 'object') {
      Object.keys(data[nivel]).forEach(grupo => {
        data[nivel][grupo] = [];
      });
    }
  });
  closeResetModal();
  renderAll();
  markDirty();
  showToast('🗑 Nueva convocatoria iniciada — todos los alumnos eliminados');
}

// ===================== TEMA CLARO / OSCURO =====================

function toggleTheme() {
  const isLight = document.documentElement.classList.toggle('light');
  // Mismo tema que el Cuaderno (geohist_tema); evalies_theme se mantiene para la v2.
  localStorage.setItem('geohist_tema', isLight ? 'claro' : 'oscuro');
  localStorage.setItem('evalies_theme', isLight ? 'light' : 'dark');
  updateThemeBtn(isLight);
  // Rebuild charts so they pick up new colors
  const SPECIAL = ['__home__', '__materias__', '__calendario__', '__convivencia__', '__informe__', '__vacantes__'];
  if (!SPECIAL.includes(currentNivel)) {
    const grupo = currentGrupos[currentNivel];
    setTimeout(() => updateCharts(currentNivel, grupo), 50);
  }
}

function updateThemeBtn(isLight) {
  const btn = document.getElementById('themeToggleBtn');
  if (btn) btn.textContent = isLight ? '🌙' : '☀️';
}

function loadTheme() {
  // Mismo tema que el Cuaderno: claro salvo que allí (o aquí) se haya elegido oscuro.
  const tema = localStorage.getItem('geohist_tema');
  const isLight = tema ? tema !== 'oscuro' : localStorage.getItem('evalies_theme') !== 'dark';
  document.documentElement.classList.toggle('light', isLight);
  updateThemeBtn(isLight);
}

// ===================== IMPORTAR CENTRO COMPLETO =====================

let icState = {
  step: 1,          // 1 = subir archivo, 2 = previsualizar, 3 = resultado
  rawText: '',
  delimiter: ',',
  headers: [],
  rows: [],
  mapping: {},
  grupoCol: -1,
  mode: 'replace',  // 'add' | 'replace'
  plan: [],         // [{csvCode, nivel, grupo, alumnos, status}]
};

function openImportCentroModal() {
  icState = { step:1, rawText:'', delimiter:',', headers:[], rows:[], mapping:{}, grupoCol:-1, mode:'replace', plan:[] };
  document.getElementById('importCentroOverlay').classList.add('open');
  renderICStep();
}

function closeImportCentroModal() {
  document.getElementById('importCentroOverlay').classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('importCentroOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('importCentroOverlay')) closeImportCentroModal();
  });
});

function renderICStep() {
  const body = document.getElementById('icBody');
  const actions = document.getElementById('icActions');

  if (icState.step === 1) {
    body.innerHTML = `
      <p style="font-size:12px;color:var(--text2);margin-bottom:16px">
        Sube el CSV con <strong>todos los alumnos del centro</strong>. La app leerá la columna <code style="background:var(--surface2);padding:1px 6px;border-radius:4px">grupo</code>,
        la traducirá usando las equivalencias configuradas, y distribuirá cada alumno en su grupo automáticamente.
      </p>
      <div class="drop-zone" id="icDropZone" onclick="document.getElementById('icFileInput').click()">
        <div class="drop-icon">📂</div>
        <div class="drop-title">Arrastra el CSV del centro aquí</div>
        <div class="drop-sub">o haz clic para seleccionarlo</div>
        <input type="file" id="icFileInput" accept=".csv,.txt" style="display:none" onchange="icHandleFile(event)" />
      </div>
      <div style="margin-top:14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
        <label style="font-size:12px;color:var(--text2)">Separador:</label>
        <label style="font-size:12px;display:flex;align-items:center;gap:5px;cursor:pointer">
          <input type="radio" name="icDelim" value=";" ${icState.delimiter===';'?'checked':''} onchange="icState.delimiter=this.value"> Punto y coma (;)
        </label>
        <label style="font-size:12px;display:flex;align-items:center;gap:5px;cursor:pointer">
          <input type="radio" name="icDelim" value="," ${icState.delimiter===','?'checked':''} onchange="icState.delimiter=this.value"> Coma (,)
        </label>
        <label style="font-size:12px;display:flex;align-items:center;gap:5px;cursor:pointer">
          <input type="radio" name="icDelim" value="\\t" onchange="icState.delimiter='\\t'"> Tabulador
        </label>
      </div>
    `;
    // Drag & drop
    setTimeout(() => {
      const dz = document.getElementById('icDropZone');
      if (!dz) return;
      dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
      dz.addEventListener('drop', e => {
        e.preventDefault(); dz.classList.remove('dragover');
        if (e.dataTransfer.files[0]) icReadFile(e.dataTransfer.files[0]);
      });
    }, 0);
    actions.innerHTML = `<button class="btn btn-ghost" onclick="closeImportCentroModal()">Cancelar</button>`;

  } else if (icState.step === 2) {
    icBuildPlan();
    const ok      = icState.plan.filter(p => p.status === 'ok').length;
    const create  = icState.plan.filter(p => p.status === 'create').length;
    const skip    = icState.plan.filter(p => p.status === 'skip').length;
    const total   = icState.plan.reduce((s,p) => s + p.alumnos.length, 0);
    const importable = icState.plan.filter(p => p.status === 'ok' || p.status === 'create');

    const rows = icState.plan.map(p => {
      const statusHtml = {
        ok:     `<span class="ic-status-ok">✓ Listo</span>`,
        create: `<span class="ic-status-create">⚡ Crear grupo</span>`,
        skip:   `<span class="ic-status-skip">— Sin equivalencia</span>`,
        err:    `<span class="ic-status-err">✗ Error</span>`,
      }[p.status];
      return `<tr>
        <td><code style="background:var(--surface2);padding:1px 6px;border-radius:4px;font-size:11px">${p.csvCode}</code></td>
        <td>${p.status !== 'skip' ? `<strong>${p.nivel}</strong>` : '<span style="color:var(--text3)">—</span>'}</td>
        <td>${p.status !== 'skip' ? p.grupo : '<span style="color:var(--text3)">—</span>'}</td>
        <td style="text-align:center;font-family:inherit;font-weight:700">${p.alumnos.length}</td>
        <td>${statusHtml}</td>
      </tr>`;
    }).join('');

    body.innerHTML = `
      <div class="ic-summary">
        <span class="ic-pill blue">📄 ${icState.rows.length} alumnos en CSV</span>
        <span class="ic-pill blue">📋 ${icState.plan.length} grupos detectados</span>
        <span class="ic-pill green">✓ ${ok} grupos listos</span>
        ${create ? `<span class="ic-pill yellow">⚡ ${create} grupos por crear</span>` : ''}
        ${skip   ? `<span class="ic-pill" style="color:var(--text3)">— ${skip} sin equivalencia (se omiten)</span>` : ''}
      </div>

      <div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:8px">Modo de importación:</div>
      <div class="ic-mode-toggle">
        <div class="ic-mode-opt ${icState.mode==='replace'?'active':''}" onclick="icState.mode='replace';renderICStep()">
          🔄 Reemplazar — vacía cada grupo antes de importar
        </div>
        <div class="ic-mode-opt ${icState.mode==='add'?'active':''}" onclick="icState.mode='add';renderICStep()">
          ➕ Añadir — agrega alumnos a los existentes
        </div>
      </div>

      <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;max-height:340px;overflow-y:auto;">
        <table class="ic-group-table">
          <thead><tr>
            <th>Código CSV</th><th>Nivel en App</th><th>Grupo en App</th><th style="text-align:center">Alumnos</th><th>Estado</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${create ? `<div style="background:rgba(245,200,66,0.08);border:1px solid rgba(245,200,66,0.3);border-radius:8px;padding:10px 14px;font-size:12px;color:var(--yellow);margin-top:12px">
        ⚡ <strong>${create} grupos</strong> no existen aún en la app y se crearán automáticamente al confirmar.
      </div>` : ''}
    `;
    actions.innerHTML = `
      <button class="btn btn-ghost" onclick="icState.step=1;renderICStep()">← Atrás</button>
      <button class="btn btn-primary" onclick="icExecute()"
        ${importable.length===0?'disabled style="opacity:0.5;cursor:not-allowed"':''}>
        🏫 Importar ${total} alumnos en ${importable.length} grupos
      </button>
    `;

  } else if (icState.step === 3) {
    // Results
    const lines = icState.result || [];
    body.innerHTML = `
      <div style="text-align:center;padding:20px 0 10px;">
        <div style="font-size:40px;margin-bottom:10px">✅</div>
        <div style="font-size:18px;font-weight:700;color:var(--green);margin-bottom:6px">Importación completada</div>
      </div>
      <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;max-height:320px;overflow-y:auto;">
        <table class="ic-group-table">
          <thead><tr><th>Grupo</th><th style="text-align:center">Alumnos importados</th><th>Acción</th></tr></thead>
          <tbody>${lines.map(l=>`<tr>
            <td><strong>${l.nivel} ${l.grupo}</strong></td>
            <td style="text-align:center;font-family:inherit;font-weight:700;color:var(--green)">${l.count}</td>
            <td style="color:var(--text3);font-size:11px">${l.action}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    `;
    actions.innerHTML = `<button class="btn btn-primary" onclick="closeImportCentroModal()">Cerrar</button>`;
  }
}

function icHandleFile(e) {
  const file = e.target.files[0];
  if (file) icReadFile(file);
}

function icReadFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    icState.rawText = e.target.result;
    icState.delimiter = autoDetectDelimiter(icState.rawText);
    // Sync radio
    document.querySelectorAll('input[name="icDelim"]').forEach(r => {
      r.checked = (r.value === '\\t' ? '\t' : r.value) === icState.delimiter;
    });
    icParseCSV();
    icState.step = 2;
    renderICStep();
  };
  reader.readAsText(file, 'UTF-8');
}

function icParseCSV() {
  // Reuse the same parser from importState — call parseCSV logic directly
  const lines = icState.rawText.split(/\r?\n/).filter(l => l.trim());
  const delim = icState.delimiter === '\\t' ? '\t' : icState.delimiter;

  function splitLine(line) {
    const result = []; let cur = ''; let inQ = false; let i = 0;
    while (i < line.length) {
      const c = line[i];
      if (inQ) {
        if (c === '"') { if (i+1<line.length&&line[i+1]==='"'){cur+='"';i+=2;}else{inQ=false;i++;} }
        else { cur+=c; i++; }
      } else {
        if (c==='"'){inQ=true;i++;}
        else if (c===delim){result.push(cur.trim());cur='';i++;}
        else{cur+=c;i++;}
      }
    }
    result.push(cur.trim());
    return result;
  }

  if (lines.length === 0) return;
  icState.headers = splitLine(lines[0]);
  icState.rows = lines.slice(1).map(l => splitLine(l)).filter(r => r.some(c=>c.trim()));

  // Auto-detect column indices using same synonyms
  const headers = icState.headers.map(h => h.toLowerCase().trim().replace(/[_\-\.]/g,' '));
  icState.mapping = {};
  Object.entries(FIELD_SYNONYMS).forEach(([key, syns]) => {
    const idx = headers.findIndex(h => syns.some(s => h===s||h.includes(s)||s.includes(h)));
    icState.mapping[key] = idx;
  });
  icState.mapping.apellido1 = headers.findIndex(h => ['apellido1','apellido 1','primer apellido'].some(s=>h===s||h.includes(s)));
  icState.mapping.apellido2 = headers.findIndex(h => ['apellido2','apellido 2','segundo apellido'].some(s=>h===s||h.includes(s)));
  icState.grupoCol = headers.findIndex(h => ['grupo','group','clase'].some(s=>h===s||h.includes(s)));
}

function icBuildPlan() {
  const m = icState.mapping;
  const expectedCols = icState.headers.length;
  const nombreIdx = m['nombre'] >= 0 ? m['nombre'] : -1;
  const ap1Idx    = (m['apellido1']??-1) >= 0 ? m['apellido1'] : -1;
  const ap2Idx    = (m['apellido2']??-1) >= 0 ? m['apellido2'] : -1;

  const PARTICLES = new Set(['de','del','y','e','i','las','los','la']);
  function toTitleCase(str) {
    return str.toLowerCase().split(/\s+/).map((w,i) =>
      (i>0 && PARTICLES.has(w)) ? w : w.charAt(0).toUpperCase()+w.slice(1)
    ).join(' ');
  }

  function normalizeRow(cols) {
    if (cols.length<=expectedCols||nombreIdx<0) return cols;
    const extra=cols.length-expectedCols;
    return [...cols.slice(0,nombreIdx),
      cols.slice(nombreIdx,nombreIdx+extra+1).map(s=>s.trim()).join(', '),
      ...cols.slice(nombreIdx+extra+1)];
  }

  function buildNombre(row) {
    const ap1 = ap1Idx>=0 ? toTitleCase((row[ap1Idx]||'').trim()) : '';
    const ap2  = ap2Idx>=0 ? toTitleCase((row[ap2Idx]||'').trim()) : '';
    const nom  = nombreIdx>=0 ? toTitleCase((row[nombreIdx]||'').trim()) : '';
    if (ap1||ap2) { const aps=[ap1,ap2].filter(Boolean).join(' '); return nom?`${aps}, ${nom}`:aps; }
    return nom;
  }

  function get(row, key) {
    const idx = m[key]; if (idx===undefined||idx<0||idx>=row.length) return '';
    return (row[idx]||'').trim();
  }

  // Group rows by CSV grupo code
  const byGrupo = {};
  icState.rows.forEach(rawRow => {
    const row = normalizeRow(rawRow);
    const csvCode = icState.grupoCol>=0 ? (rawRow[icState.grupoCol]||'').trim() : '';
    if (!byGrupo[csvCode]) byGrupo[csvCode] = [];

    const nombre = buildNombre(row);
    if (!nombre) return;

    let fecha = get(row,'fecha');
    if (fecha) {
      const m1 = fecha.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
      if (m1) { const y=m1[3].length===2?'20'+m1[3]:m1[3]; fecha=`${y}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`; }
    }

    byGrupo[csvCode].push({
      id: Date.now()+Math.random(),
      nombre,
      fecha,
      repetidor: normalizeYesNo(get(row,'repetidor')),
      nese: normalizeYesNo(get(row,'nese')),
      recursoNese: (()=>{
        const raw = get(row,'recursoNese')||'';
        if (!raw.trim()) return [];
        return raw.split(/[,;\s/]+/).map(s=>s.trim().toUpperCase()).filter(s=>s==='AL'||s==='PT');
      })(),
      compensatoria: normalizeYesNo(get(row,'compensatoria')),
      codComp: [],
      eval1:0, eval2:0, eval3:0,
      propuesta2:{tipo:'',destino:''}, propuesta3:{tipo:'',destino:''},
      evalExtr:0,
      promociona:{tipo:'',destino:''},
      notas:'',
      lenguaBase:'',
      colegioProcedencia:'',
      pendientesIII:[],
      pendientesExtr:[],
      historial:[],
    });
  });

  // Build plan
  icState.plan = Object.entries(byGrupo).sort(([a],[b])=>a.localeCompare(b)).map(([csvCode, alumnos]) => {
    if (!csvCode) return null;
    const eq = resolveGrupoEquiv(csvCode);
    if (!eq) return { csvCode, nivel:'', grupo:'', alumnos, status:'skip' };
    const exists = GRUPOS_POR_NIVEL[eq.nivel] && GRUPOS_POR_NIVEL[eq.nivel].includes(eq.grupo);
    return { csvCode, nivel:eq.nivel, grupo:eq.grupo, alumnos, status: exists?'ok':'create' };
  }).filter(Boolean);
}

function icExecute() {
  const result = [];
  icState.plan.filter(p=>p.status==='ok'||p.status==='create').forEach(p => {
    // Create grupo if needed
    if (p.status==='create') {
      if (!GRUPOS_POR_NIVEL[p.nivel]) {
        // nivel doesn't exist either — skip
        return;
      }
      GRUPOS_POR_NIVEL[p.nivel].push(p.grupo);
      data[p.nivel][p.grupo] = [];
      tutores[`${p.nivel}-${p.grupo}`] = '';
    }
    // Ensure evalDates exists for this nivel
    if (!evalDates[p.nivel]) evalDates[p.nivel] = { eval1: _today, eval2: _today, eval3: _today };

    const action = icState.mode==='replace' ? 'Reemplazado' : 'Añadido';
    if (icState.mode==='replace') {
      data[p.nivel][p.grupo] = p.alumnos;
    } else {
      data[p.nivel][p.grupo].push(...p.alumnos);
    }
    result.push({ nivel:p.nivel, grupo:p.grupo, count:p.alumnos.length, action });
  });

  icState.result = result;
  icState.step = 3;
  renderICStep();
  renderAll();
  markDirty();
  showToast(`✅ ${result.reduce((s,r)=>s+r.count,0)} alumnos importados en ${result.length} grupos`);
}
