/* ============================================================================
   Gestor de Tutoría · Alertas del alumnado y «🧭 Qué me falta» (Inicio)
   tutoria/js/25-alertas-y-pendientes.js
   ============================================================================

   ALERTAS (por alumno/a), con los umbrales de _alertasCfg (02-datos.js):
     faltas sin justificar, AC, partes y expedientes · materias suspensas en la
     evaluación en curso · empeora respecto a la anterior · cita con la familia
     vencida sin registrar · alertas sin ningún contacto con la familia.
   Faltas, AC y partes se cuentan con lo mayor entre las columnas de Tutoría
   (suma de las tres evaluaciones) y lo recibido de los Cuadernos (suma de las
   materias en el curso): son dos formas de contar lo mismo, no se suman.
   Las citas próximas salen como aviso («info»), no como alerta.

   «QUÉ ME FALTA» resume, para cada grupo con alumnado: la próxima sesión de
   evaluación, las decisiones finales pendientes, las materias que aún no han
   enviado sus datos, el alumnado con alertas y las citas con familias.
*/

function _alHoy() { return _hoyLocal(); }
function _alSumaEval(a, base) { return [1, 2, 3].reduce((s, k) => s + (+a[base + k] || 0), 0); }
function _alSumaMaterias(a, tipo, campo) {
  return Object.values(a.porMateria || {}).reduce((s, d) => s + (((((d || {})[tipo] || {}).curso) || {})[campo] || 0), 0);
}
function _alFechasPuestas(nivel) {
  const d = getDates(nivel);
  return !(d.eval1 === d.eval2 && d.eval2 === d.eval3);
}
/* Evaluación en curso de un nivel (1, 2 o 3): la última cuya sesión ya ha pasado.
   Sin fechas puestas, la última con materias suspensas apuntadas en el grupo (o 0). */
function _alEvalActual(nivel, alumnos) {
  if (_alFechasPuestas(nivel)) {
    const d = getDates(nivel), hoy = _alHoy();
    let k = 0;
    [1, 2, 3].forEach(i => { if (d['eval' + i] && d['eval' + i] <= hoy) k = i; });
    return k;
  }
  for (const k of [3, 2, 1]) if ((alumnos || []).some(a => (+a['eval' + k] || 0) > 0)) return k;
  return 0;
}
// Próxima sesión de evaluación de un nivel: {k, fecha, dias} o null.
function _alProximaSesion(nivel) {
  if (!_alFechasPuestas(nivel)) return null;
  const d = getDates(nivel), hoy = _alHoy();
  for (const k of [1, 2, 3]) {
    const f = d['eval' + k];
    if (f && f >= hoy) return { k, fecha: f, dias: Math.round((new Date(f + 'T00:00:00') - new Date(hoy + 'T00:00:00')) / 86400000) };
  }
  return null;
}
const _AL_EVAL_NOMBRE = { 1: 'I Evaluación', 2: 'II Evaluación', 3: 'Evaluación final' };

/* Alertas de un alumno/a: [{clave, icono, texto, detalle, nivel:'alta'|'media'|'info'}]. */
function _alertasAlumno(a, nivel, evalActual) {
  const c = _alertasCfg, out = [];
  const regla = (clave, icono, umbral, tutoria, cuaderno, texto) => {
    const n = Math.max(tutoria, cuaderno);
    if (!umbral || n < umbral) return;
    const det = [tutoria ? `Tutoría: ${tutoria}` : '', cuaderno ? `Cuadernos: ${cuaderno}` : ''].filter(Boolean).join(' · ');
    out.push({ clave, icono, texto: texto(n), detalle: det, nivel: n >= umbral * 2 ? 'alta' : 'media' });
  };
  regla('faltas', '🚫', c.faltasInjust, _alSumaEval(a, 'faltasInjust'), _alSumaMaterias(a, 'faltas', 'injustificadas'), n => `${n} faltas sin justificar`);
  regla('ac', '⚠️', c.ac, _alSumaEval(a, 'ac'), _alSumaMaterias(a, 'convivencia', 'ac'), n => `${n} AC (actitud y comportamiento)`);
  regla('partes', '📄', c.partes, _alSumaEval(a, 'partes'), _alSumaMaterias(a, 'convivencia', 'pa'), n => `${n} parte${n === 1 ? '' : 's'} de amonestación`);
  const exp = _alSumaEval(a, 'expedientes');
  if (exp > 0) out.push({ clave: 'expedientes', icono: '⚖️', texto: `${exp} expediente${exp === 1 ? '' : 's'} disciplinario${exp === 1 ? '' : 's'}`, detalle: '', nivel: 'alta' });
  const k = evalActual == null ? _alEvalActual(nivel, [a]) : evalActual;
  if (k) {
    const sus = +a['eval' + k] || 0;
    if (c.suspensas && sus >= c.suspensas) out.push({ clave: 'suspensas', icono: '📉', texto: `${sus} materias suspensas en la ${_AL_EVAL_NOMBRE[k]}`, detalle: '', nivel: sus >= c.suspensas + 2 ? 'alta' : 'media' });
    if (k > 1 && c.empeora) {
      const antes = +a['eval' + (k - 1)] || 0;
      if (sus - antes >= c.empeora) out.push({ clave: 'empeora', icono: '↘️', texto: `Empeora: de ${antes} a ${sus} suspensas`, detalle: `${_AL_EVAL_NOMBRE[k - 1]} → ${_AL_EVAL_NOMBRE[k]}`, nivel: 'media' });
    }
  }
  // Citas con la familia (entrevistas con «próxima cita»).
  const hoy = _alHoy(), ents = Array.isArray(a.entrevistas) ? a.entrevistas : [];
  ents.forEach(e => {
    const f = e && e.proximaCita; if (!f) return;
    const hecha = ents.some(x => x !== e && x.fecha && x.fecha >= f);
    if (hecha) return;
    if (f < hoy) out.push({ clave: 'cita-vencida', icono: '📅', texto: `Cita del ${fmtDate(f)} sin registrar`, detalle: 'Anota la entrevista o cambia la fecha de la próxima cita', nivel: 'media', fecha: f });
    else {
      const dias = Math.round((new Date(f + 'T00:00:00') - new Date(hoy + 'T00:00:00')) / 86400000);
      if (dias <= (c.diasCita || 0)) out.push({ clave: 'cita', icono: '🗓️', texto: dias === 0 ? 'Cita con la familia hoy' : `Cita con la familia el ${fmtDate(f)}`, detalle: e.proximaHora ? `a las ${e.proximaHora}` : '', nivel: 'info', fecha: f });
    }
  });
  if (c.sinContacto && out.some(x => x.nivel !== 'info') && !ents.length && !(a.seguimientos || []).length) {
    out.push({ clave: 'sin-contacto', icono: '👪', texto: 'Sin entrevistas ni seguimientos con la familia', detalle: '', nivel: 'media' });
  }
  return out;
}
function _alertasSerias(lista) { return lista.filter(x => x.nivel !== 'info'); }

// Insignia «⚠ n» para la tabla del grupo (abre la ficha en el resumen).
function _alInsigniaHTML(a, nivel, grupo, i) {
  const al = _alertasSerias(_alertasAlumno(a, nivel));
  if (!al.length) return '';
  const alta = al.some(x => x.nivel === 'alta');
  return `<button class="alerta-insignia${alta ? ' alta' : ''}" title="${_tEsc(al.map(x => x.texto).join(' · '))}"
    onclick="openFichaAlumno('${jsAttr(nivel)}','${jsAttr(grupo)}',${i},'resumen')" aria-label="${al.length} alerta${al.length === 1 ? '' : 's'}: ver la ficha">⚠ ${al.length}</button>`;
}

/* ---------------- «🧭 Qué me falta» (arriba del todo en Inicio) ---------------- */
const _qmfLi = (icono, contenido) => `<li><span class="qmf-ico" aria-hidden="true">${icono}</span><span class="qmf-txt">${contenido}</span></li>`;
/* Materias que cuentan para «sin datos»: las del equipo docente del grupo y las que ya han
   enviado algo (la lista del nivel incluye optativas que el grupo no tiene). */
function _qmfMateriasDelGrupo(nivel, grupo) {
  const out = [];
  const add = m => { if (m && !out.some(x => _tNorm(x) === _tNorm(m))) out.push(m); };
  (((window._asistenciaData || {})[`${nivel}-${grupo}`] || {}).profesores || []).forEach(p => { if (_tNorm(p.materia) !== 'tutoria') add(p.materia); });
  (data[nivel]?.[grupo] || []).forEach(a => Object.keys(a.porMateria || {}).forEach(add));
  return out;
}
function _qmfGrupos() {
  const out = [];
  NIVELES.forEach(n => (GRUPOS_POR_NIVEL[n] || []).forEach(g => { if ((data[n]?.[g] || []).length) out.push([n, g]); }));
  return out;
}
function _qmfHTML() {
  const grupos = _qmfGrupos();
  if (!grupos.length) return '';
  const hoy = _alHoy();
  const tarjetas = [];
  let totalAlertas = 0, totalCitas = 0;
  grupos.forEach(([nivel, grupo]) => {
    const alumnos = data[nivel][grupo];
    const k = _alEvalActual(nivel, alumnos);
    const prox = _alProximaSesion(nivel);
    const items = [];
    // Próxima sesión
    if (!_alFechasPuestas(nivel)) items.push(_qmfLi('📅', `<button class="qmf-link" onclick="_qmfIr('${jsAttr(nivel)}','${jsAttr(grupo)}')">Pon las fechas de evaluación de ${_tEsc(nivel)}</button>`));
    else if (prox) items.push(_qmfLi('📅', `${_AL_EVAL_NOMBRE[prox.k]}: <strong>${_tEsc(fmtDate(prox.fecha))}</strong> ${prox.dias === 0 ? '(hoy)' : `(en ${prox.dias} día${prox.dias === 1 ? '' : 's'})`}` +
      (prox.dias <= 7 && typeof openSesionEvaluacion === 'function' ? ` · <button class="qmf-link" onclick="_qmfIr('${jsAttr(nivel)}','${jsAttr(grupo)}');openSesionEvaluacion('${jsAttr(nivel)}','${jsAttr(grupo)}','${prox.k}')">🎓 Abrir la sesión</button>` : '') +
      (prox.dias <= 7 && typeof abrirInformeEquipo === 'function' ? ` · <button class="qmf-link" onclick="abrirInformeEquipo('${jsAttr(nivel)}','${jsAttr(grupo)}','${prox.k}')">📊 Informe previo para el equipo</button>` : '')));
    // Materias sin datos para la próxima sesión (cuando faltan 3 semanas o menos)
    if (prox && prox.dias <= 21 && typeof _infResumenMateria === 'function') {
      const periodo = prox.k === 3 ? 'final' : String(prox.k);
      const mats = _qmfMateriasDelGrupo(nivel, grupo);
      const faltan = mats.filter(m => !_infResumenMateria(nivel, grupo, m, periodo).hayDatos);
      const abrir = `_qmfIr('${jsAttr(nivel)}','${jsAttr(grupo)}');openInformacionEquipo('${jsAttr(nivel)}','${jsAttr(grupo)}')`;
      if (!mats.length) items.push(_qmfLi('📬', `<button class="qmf-link" onclick="${abrir}">Aún no ha llegado nada del equipo docente para la ${_AL_EVAL_NOMBRE[prox.k]}</button>`));
      else if (faltan.length) items.push(_qmfLi('📬', `<button class="qmf-link" onclick="${abrir}">${faltan.length} de ${mats.length} materias sin datos para la ${_AL_EVAL_NOMBRE[prox.k]}</button>`));
    }
    // Decisiones finales pendientes (como la insignia de la pestaña del nivel)
    const pendDec = alumnos.filter(a => !!(a.nombre && (a.eval3 > 0 || getPropObj(a.propuesta3).tipo)) && !getPropObj(a.promociona).tipo).length;
    if (pendDec) items.push(_qmfLi('🎓', `<button class="qmf-link" onclick="_qmfIr('${jsAttr(nivel)}','${jsAttr(grupo)}','eval3')">${pendDec} decisi${pendDec === 1 ? 'ón final pendiente' : 'ones finales pendientes'}</button>`));
    // Alumnado con alertas y citas
    const conAlertas = [], citas = [];
    alumnos.forEach((a, i) => {
      const lista = _alertasAlumno(a, nivel, k);
      const serias = _alertasSerias(lista);
      if (serias.length) conAlertas.push({ a, i, serias });
      lista.filter(x => x.clave === 'cita').forEach(x => citas.push({ a, i, x }));
    });
    totalAlertas += conAlertas.length; totalCitas += citas.length;
    if (conAlertas.length) {
      conAlertas.sort((x, y) => y.serias.length - x.serias.length);
      items.push(_qmfLi('⚠️', `${conAlertas.length} alumno${conAlertas.length === 1 ? '' : 's'} con alertas:
        <span class="qmf-chips">${conAlertas.map(({ a, i, serias }) => `<button class="qmf-chip${serias.some(s => s.nivel === 'alta') ? ' alta' : ''}" title="${_tEsc(serias.map(s => s.texto).join(' · '))}"
          onclick="openFichaAlumno('${jsAttr(nivel)}','${jsAttr(grupo)}',${i},'resumen')">${_tEsc(a.nombre || 'Sin nombre')} · ${serias.length}</button>`).join('')}</span>`));
    }
    citas.sort((x, y) => (x.x.fecha || '').localeCompare(y.x.fecha || '')).forEach(({ a, i, x }) => {
      items.push(_qmfLi('🗓️', `<button class="qmf-link" onclick="openFichaAlumno('${jsAttr(nivel)}','${jsAttr(grupo)}',${i},'entrevistas')">${_tEsc(x.texto)}${x.detalle ? ' ' + _tEsc(x.detalle) : ''} — ${_tEsc(a.nombre)}</button>`));
    });
    if (items.length) tarjetas.push(`<div class="qmf-grupo">
        <div class="qmf-grupo-tit"><button class="qmf-link" onclick="_qmfIr('${jsAttr(nivel)}','${jsAttr(grupo)}')"><strong>${_tEsc(nivel)} ${_tEsc(grupo)}</strong></button>
          <span style="color:var(--text3);font-size:11.5px">${alumnos.length} alumnos${tutores[`${nivel}-${grupo}`] ? ' · ' + _tEsc(tutores[`${nivel}-${grupo}`]) : ''}</span></div>
        <ul>${items.join('')}</ul></div>`);
  });
  return `<section class="qmf" aria-labelledby="qmfTitulo">
    <div class="qmf-cab">
      <h2 id="qmfTitulo">🧭 Qué me falta</h2>
      <span style="font-size:12px;color:var(--text2)">${totalAlertas} alumno${totalAlertas === 1 ? '' : 's'} con alertas · ${totalCitas} cita${totalCitas === 1 ? '' : 's'} próxima${totalCitas === 1 ? '' : 's'} · hoy ${_tEsc(fmtDate(hoy))}</span>
      <span style="flex:1"></span>
      <button class="btn btn-ghost btn-sm" onclick="abrirUmbralesAlertas()">⚙ Umbrales de las alertas</button>
    </div>
    ${tarjetas.length ? `<div class="qmf-rejilla">${tarjetas.join('')}</div>` : '<div style="font-size:13px;color:var(--text2);padding:6px 2px">✓ Nada pendiente por ahora.</div>'}
  </section>`;
}
window._qmfIr = function(nivel, grupo, evalTab) {
  if (!GRUPOS_POR_NIVEL[nivel]) return;
  currentGrupos[nivel] = grupo;
  selectNivel(nivel);
  if (evalTab && typeof selectEvalTab === 'function') selectEvalTab(nivel, grupo, evalTab);
};

/* ---------------- Umbrales de las alertas ---------------- */
const _AL_CAMPOS_CFG = [
  ['faltasInjust', 'Faltas sin justificar (en el curso)', 'Avisa a partir de este número'],
  ['ac', 'AC — actitud y comportamiento', ''],
  ['partes', 'Partes de amonestación', ''],
  ['suspensas', 'Materias suspensas en la evaluación en curso', ''],
  ['empeora', 'Suspensas de más que en la evaluación anterior', ''],
  ['diasCita', 'Días de antelación para avisar de una cita', ''],
];
window.abrirUmbralesAlertas = function() {
  const ov = document.createElement('div');
  ov.className = 'tdlg-ov'; ov.style.zIndex = String(++_tDlgZ); ov.id = 'umbralesOv';
  ov.innerHTML = `<div class="tdlg-box" role="dialog" aria-modal="true" aria-labelledby="umbT" style="max-width:520px">
    <h2 id="umbT">⚙ Umbrales de las alertas</h2>
    <div class="tdlg-msg" style="font-size:12.5px">Cada alerta sale a partir del número que pongas. Con <strong>0</strong> esa alerta no se usa.</div>
    ${_AL_CAMPOS_CFG.map(([k, t]) => `<label style="display:flex;align-items:center;gap:10px;margin-top:8px;font-size:13px">
      <span style="flex:1">${t}</span>
      <input type="number" min="0" max="999" class="tdlg-in" style="width:80px;margin:0" data-umbral="${k}" value="${_alertasCfg[k]}"></label>`).join('')}
    <label style="display:flex;align-items:center;gap:10px;margin-top:10px;font-size:13px;cursor:pointer">
      <input type="checkbox" data-umbral-cb="sinContacto" ${_alertasCfg.sinContacto ? 'checked' : ''}>
      <span>Avisar si hay alertas y no consta ninguna entrevista ni seguimiento con la familia</span></label>
    <div class="tdlg-bar"><button class="tdlg-no" data-acc="defecto" style="margin-right:auto">Valores por defecto</button><button class="tdlg-no" data-acc="cancelar">Cancelar</button><button class="tdlg-si" data-acc="guardar">Guardar</button></div></div>`;
  document.body.appendChild(ov);
  const cerrar = () => ov.remove();
  ov.querySelector('[data-acc="cancelar"]').onclick = cerrar;
  ov.querySelector('[data-acc="defecto"]').onclick = () => {
    ov.querySelectorAll('[data-umbral]').forEach(i => { i.value = ALERTAS_CFG_DEFECTO[i.dataset.umbral]; });
    ov.querySelector('[data-umbral-cb]').checked = !!ALERTAS_CFG_DEFECTO.sinContacto;
  };
  ov.querySelector('[data-acc="guardar"]').onclick = () => {
    const nuevo = {};
    ov.querySelectorAll('[data-umbral]').forEach(i => { nuevo[i.dataset.umbral] = i.value === '' ? 0 : i.value; });
    nuevo.sinContacto = ov.querySelector('[data-umbral-cb]').checked ? 1 : 0;
    _alertasMergeCfg(nuevo);
    markDirty(); cerrar(); renderAll();
    showToast('✅ Umbrales de las alertas guardados');
  };
  ov.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); cerrar(); } });
  setTimeout(() => ov.querySelector('[data-umbral]')?.focus(), 20);
};

// Inicio se dibuja por primera vez antes de que se cargue este archivo: se vuelve a dibujar con el panel.
if (currentNivel === '__home__' && document.getElementById('mainContent') && typeof renderAll === 'function') renderAll();
