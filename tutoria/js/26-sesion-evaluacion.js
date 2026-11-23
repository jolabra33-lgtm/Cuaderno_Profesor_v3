/* ============================================================================
   Gestor de Tutoría · 🎓 Sesión de evaluación (pantalla para proyectar)
   tutoria/js/26-sesion-evaluacion.js
   ============================================================================

   Una pantalla completa para llevar la junta de evaluación de un grupo:
     - «👥 El grupo»: asistencia del profesorado, horas, valoración general,
       acuerdos del grupo y un resumen de resultados.
     - Alumno por alumno: suspensas y materias, notas y comentarios recibidos del
       profesorado, faltas y convivencia, alertas, la propuesta (o la decisión
       final en la 3.ª) con botones grandes y los acuerdos individuales.
   Al terminar: 📝 acta de la sesión (se genera sola) y 📤 ficha del grupo para
   el profesorado (archivo que cada uno carga en su Cuaderno: «📥 De la tutoría»).

   Dónde se guarda (sin claves nuevas en el estado):
     alumno.sesionEval[k] = {acuerdos, revisado}                     (k = '1' | '2' | '3')
     _asistenciaData['nivel-grupo'].actasSesion[k] = {valoracion, acuerdosGrupo, horaInicio, horaFin}
     la asistencia del profesorado, en las sesiones de siempre (21-asistencia.js).
*/

let _sesCtx = { nivel: '', grupo: '', k: '1', sel: 'grupo' };
const _SES_CAMPOS = {
  '1': { n: 'eval1', pend: 'pendientes1', prop: 'propuesta1', propEtq: 'Propuesta', periodo: '1' },
  '2': { n: 'eval2', pend: 'pendientes2', prop: 'propuesta2', propEtq: 'Propuesta', periodo: '2' },
  '3': { n: 'eval3', pend: 'pendientesIII', prop: 'promociona', propEtq: 'Decisión final', periodo: 'final' },
};

function _sesAlumnos() { return data[_sesCtx.nivel]?.[_sesCtx.grupo] || []; }
function _sesDeAlumno(a, k) {
  if (!a.sesionEval || typeof a.sesionEval !== 'object') a.sesionEval = {};
  if (!a.sesionEval[k]) a.sesionEval[k] = { acuerdos: '', revisado: false };
  return a.sesionEval[k];
}
function _sesActa(nivel, grupo, k) {
  const d = _getAsistenciaData(nivel, grupo);
  if (!d.actasSesion || typeof d.actasSesion !== 'object') d.actasSesion = {};
  if (!d.actasSesion[k]) d.actasSesion[k] = { valoracion: '', acuerdosGrupo: '', horaInicio: '', horaFin: '' };
  return d.actasSesion[k];
}
// Evaluación que toca: la de la próxima sesión si es en una semana o menos; si no, la última que ha pasado.
function _sesEvalPropuesta(nivel) {
  const prox = typeof _alProximaSesion === 'function' ? _alProximaSesion(nivel) : null;
  if (prox && prox.dias <= 7) return String(prox.k);
  const k = typeof _alEvalActual === 'function' ? _alEvalActual(nivel, data[nivel]?.[currentGrupos[nivel]] || []) : 0;
  return String(k || 1);
}

window.openSesionEvaluacion = function(nivel, grupo, k) {
  if (!data[nivel]?.[grupo]) return;
  _sesCtx = { nivel, grupo, k: String(k || _sesEvalPropuesta(nivel)), sel: 'grupo' };
  if (typeof _aeMigrar === 'function') _aeMigrar(nivel, grupo, _sesCtx.k);   // lo guardado en el antiguo Acta Oficial pasa a la sesión
  let ov = document.getElementById('sesionOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'sesionOverlay';
    ov.className = 'sesion-ov';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'sesTitulo');
    ov.innerHTML = `<header class="ses-cab" id="sesCab"></header><div class="ses-cuerpo"><nav class="ses-lista" id="sesLista" aria-label="Alumnado"></nav><main class="ses-main" id="sesMain"></main></div>`;
    document.body.appendChild(ov);
    // En el documento (no solo en la ventana): al redibujar, el foco puede quedarse en la página.
    document.addEventListener('keydown', e => {
      if (!ov.classList.contains('open') || document.querySelector('.tdlg-ov') || document.getElementById('tdocOverlay')) return;
      const t = e.target, escribiendo = /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable;
      if (e.key === 'Escape') { e.stopPropagation(); closeSesionEvaluacion(); }
      else if (!escribiendo && (e.key === 'ArrowRight' || e.key === 'ArrowDown')) { e.preventDefault(); _sesMover(1); }
      else if (!escribiendo && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) { e.preventDefault(); _sesMover(-1); }
    }, true);
  }
  ov.classList.add('open');
  document.body.classList.add('sesion-abierta');
  renderSesion();
  setTimeout(() => ov.querySelector('.ses-cab select')?.focus(), 30);
};
window.closeSesionEvaluacion = function() {
  document.getElementById('sesionOverlay')?.classList.remove('open');
  document.body.classList.remove('sesion-abierta');
  renderAll();
};
window._sesIr = function(sel) { _sesCtx.sel = sel; renderSesion(); document.getElementById('sesMain')?.scrollTo(0, 0); };
window._sesCambiarEval = function(k) { _sesCtx.k = String(k); if (typeof _aeMigrar === 'function') _aeMigrar(_sesCtx.nivel, _sesCtx.grupo, _sesCtx.k); renderSesion(); };
window._sesMover = function(paso) {
  const n = _sesAlumnos().length;
  const actual = _sesCtx.sel === 'grupo' ? -1 : +_sesCtx.sel;
  const sig = Math.max(-1, Math.min(n - 1, actual + paso));
  _sesIr(sig < 0 ? 'grupo' : sig);
};

function renderSesion() {
  const { nivel, grupo, k, sel } = _sesCtx;
  const alumnos = _sesAlumnos();
  const revisados = alumnos.filter(a => (a.sesionEval || {})[k]?.revisado).length;
  const fecha = getDates(nivel)['eval' + k];
  document.getElementById('sesCab').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <h1 id="sesTitulo" class="ses-titulo">🎓 Sesión de evaluación · ${_tEsc(nivel)} ${_tEsc(grupo)}</h1>
      <select class="tdlg-in" style="width:auto;margin:0" aria-label="Evaluación" onchange="_sesCambiarEval(this.value)">
        ${['1', '2', '3'].map(x => `<option value="${x}" ${x === k ? 'selected' : ''}>${FT_NOMBRE_EVAL[x]}</option>`).join('')}
      </select>
      <span class="ses-progreso" aria-live="polite">${revisados} de ${alumnos.length} revisados${fecha ? ' · ' + _tEsc(fmtDate(fecha)) : ''}</span>
      <span style="flex:1"></span>
      <button class="btn btn-ghost btn-sm" onclick="abrirInformeEquipo('${jsAttr(nivel)}','${jsAttr(grupo)}','${k}')" title="Resultados del grupo para el profesorado (previo a la sesión o actualizado tras ella)">📊 Informe para el equipo</button>
      <button class="btn btn-primary btn-sm" onclick="generarActaEvaluacion('${jsAttr(nivel)}','${jsAttr(grupo)}','${k}')" title="El acta de la evaluación con todo lo apuntado en la sesión (imprimir, PDF, Word)">🖨 Acta de evaluación</button>
      ${typeof _aeHayActaAntigua === 'function' && _aeHayActaAntigua(nivel, grupo, k) ? `<button class="btn btn-ghost btn-sm" onclick="verActaAntigua('${jsAttr(nivel)}','${jsAttr(grupo)}','${k}')" title="Acta de esta evaluación guardada con el modelo anterior (solo consulta)">📂 Acta antigua</button>` : ''}
      <button class="btn btn-ghost btn-sm" onclick="abrirActaCalificaciones('${jsAttr(nivel)}','${jsAttr(grupo)}','${k}')" title="Todas las notas del grupo en una hoja, como el acta de Itaca">📑 Acta de calificaciones</button>
      <button class="btn btn-ghost btn-sm" onclick="exportarFichaGrupo('${jsAttr(nivel)}','${jsAttr(grupo)}','${k}')">📤 Ficha para el profesorado</button>
      <button class="btn btn-primary btn-sm" onclick="closeSesionEvaluacion()">✕ Salir</button>
    </div>
    <div class="ses-barra" role="progressbar" aria-label="Alumnado revisado" aria-valuemin="0" aria-valuemax="${alumnos.length}" aria-valuenow="${revisados}"><div style="width:${alumnos.length ? Math.round(revisados / alumnos.length * 100) : 0}%"></div></div>`;
  document.getElementById('sesLista').innerHTML = `
    <button class="ses-item${sel === 'grupo' ? ' activo' : ''}" onclick="_sesIr('grupo')" aria-current="${sel === 'grupo'}">👥 El grupo</button>
    ${alumnos.map((a, i) => {
      const rev = (a.sesionEval || {})[k]?.revisado;
      const nAl = typeof _alertasAlumno === 'function' ? _alertasSerias(_alertasAlumno(a, nivel)).length : 0;
      return `<button class="ses-item${String(sel) === String(i) ? ' activo' : ''}" onclick="_sesIr(${i})" aria-current="${String(sel) === String(i)}">
        <span class="ses-marca" aria-label="${rev ? 'Revisado' : 'Sin revisar'}">${rev ? '✓' : '○'}</span>
        <span class="ses-nombre">${_tEsc(a.nombre || 'Sin nombre')}</span>${nAl ? `<span class="ses-al" title="${nAl} alerta${nAl === 1 ? '' : 's'}">⚠${nAl}</span>` : ''}</button>`;
    }).join('')}`;
  const main = document.getElementById('sesMain');
  main.innerHTML = sel === 'grupo' ? _sesGrupoHTML() : _sesAlumnoHTML(+sel);
  _tA11y(main);
  document.querySelector('#sesLista .ses-item.activo')?.scrollIntoView({ block: 'nearest' });
  // Al meter notas con Intro se pasa a la siguiente materia.
  if (_sesCtx.foco != null) { const sig = main.querySelector(`input.ses-nota[data-m="${_sesCtx.foco}"]`); _sesCtx.foco = null; if (sig) { sig.focus(); sig.select(); } }
}

// Distribución de suspensas y materias con más suspensos (de las listas de materias de cada alumno/a).
function _sesResumenGrupo(nivel, grupo, k) {
  const c = _SES_CAMPOS[k], alumnos = data[nivel]?.[grupo] || [];
  const r = { total: alumnos.length, cero: 0, unaDos: 0, tresMas: 0, materias: {} };
  alumnos.forEach(a => {
    const n = +a[c.n] || 0;
    if (n === 0) r.cero++; else if (n <= 2) r.unaDos++; else r.tresMas++;
    (a[c.pend] || []).forEach(m => { r.materias[m] = (r.materias[m] || 0) + 1; });
  });
  r.ranking = Object.entries(r.materias).sort((x, y) => y[1] - x[1]);
  return r;
}

function _sesGrupoHTML() {
  const { nivel, grupo, k } = _sesCtx;
  const d = _getAsistenciaData(nivel, grupo), acta = _sesActa(nivel, grupo, k);
  const ses = d.sesiones['eval' + k] || [];
  const r = _sesResumenGrupo(nivel, grupo, k);
  const pct = n => r.total ? Math.round(n / r.total * 100) : 0;
  const profes = d.profesores.map((p, i) => {
    const s = ses[i] || {};
    return `<div class="ses-prof">
      <span style="flex:1;min-width:0"><strong>${_tEsc(p.nombre || '—')}</strong> <span style="color:var(--text3)">${_tEsc(_tMateriaDeProfesor(p))}${p.esTutor ? ' · tutor/a' : ''}</span></span>
      <label><input type="radio" name="sesAs${i}" ${s.asistio === true ? 'checked' : ''} onchange="_sesAsistencia(${i},true)"> Asiste</label>
      <label><input type="radio" name="sesAs${i}" ${s.asistio === false ? 'checked' : ''} onchange="_sesAsistencia(${i},false)"> No asiste</label>
      ${s.asistio === false ? `<input class="tdlg-in" style="margin:0;flex:1 1 160px" placeholder="Motivo" aria-label="Motivo de la ausencia" value="${_tEsc(s.justificacion || '')}" oninput="_sesJustificacion(${i},this.value)">` : ''}
    </div>`;
  }).join('');
  return `
    <section class="ses-bloque"><h2>Asistencia del profesorado</h2>
      ${profes || `<p class="ficha-vacio">No hay equipo docente en este grupo. Añádelo en «👨‍🏫 Equipo docente» (menú «⋯ Más») o carga los archivos «Para la tutoría».</p>`}
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:10px">
        <label class="ent-form-campo" style="max-width:150px"><span>Hora de inicio</span><input type="time" value="${_tEsc(acta.horaInicio)}" onchange="_sesActaSet('horaInicio',this.value)"></label>
        <label class="ent-form-campo" style="max-width:150px"><span>Hora de fin</span><input type="time" value="${_tEsc(acta.horaFin)}" onchange="_sesActaSet('horaFin',this.value)"></label>
      </div>
    </section>
    <section class="ses-bloque"><h2>Resultados del grupo · ${FT_NOMBRE_EVAL[k]}</h2>
      <div class="ses-cifras">
        <div><strong>${r.cero}</strong><span>todo aprobado (${pct(r.cero)} %)</span></div>
        <div><strong>${r.unaDos}</strong><span>1 o 2 suspensas (${pct(r.unaDos)} %)</span></div>
        <div class="${r.tresMas ? 'mal' : ''}"><strong>${r.tresMas}</strong><span>3 o más (${pct(r.tresMas)} %)</span></div>
      </div>
      ${r.ranking.length ? `<p style="font-size:14px;margin:10px 0 0">Materias con más suspensos: ${r.ranking.slice(0, 6).map(([m, n]) => `<strong>${_tEsc(m)}</strong> (${n})`).join(' · ')}</p>` : ''}
    </section>
    <section class="ses-bloque"><h2>Análisis general del grupo</h2>
      <div class="ses-rejilla">${(typeof _AE_ANALISIS !== 'undefined' ? _AE_ANALISIS : []).filter(([clave]) => clave !== 'cohesion' || k === '1' || (acta.analisis || {}).cohesion).map(([clave, etq]) => `
        <label class="ent-form-campo"><span>${_tEsc(etq)}</span><textarea class="ficha-texto" rows="2" oninput="_sesAnalisis('${clave}',this.value)">${_tEsc((acta.analisis || {})[clave] || '')}</textarea></label>`).join('')}</div>
    </section>
    <section class="ses-bloque"><h2>Valoración general del grupo</h2>
      <textarea class="ficha-texto ses-texto" rows="4" aria-label="Valoración general del grupo" placeholder="Ambiente de trabajo, convivencia, evolución respecto a la evaluación anterior…" oninput="_sesActaSet('valoracion',this.value)">${_tEsc(acta.valoracion)}</textarea>
    </section>
    <section class="ses-bloque"><h2>Propuestas de mejora y acuerdos del equipo docente</h2>
      <textarea class="ficha-texto ses-texto" rows="4" aria-label="Propuestas de mejora y acuerdos del equipo docente" placeholder="Medidas para todo el grupo, cambios de sitio, coordinación entre materias…" oninput="_sesActaSet('acuerdosGrupo',this.value)">${_tEsc(acta.acuerdosGrupo)}</textarea>
    </section>
    <section class="ses-bloque"><h2>Datos del acta</h2>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <label class="ent-form-campo" style="max-width:190px"><span>Fecha de la sesión</span><input type="date" value="${_tEsc(acta.fecha || getDates(nivel)['eval' + k] || '')}" onchange="_sesActaSet('fecha',this.value)"></label>
        <label class="ent-form-campo" style="flex:1 1 220px"><span>Jefe/a de Estudios (firma)</span><input value="${_tEsc(acta.jefeEstudios || '')}" placeholder="Apellidos, Nombre" oninput="_sesActaSet('jefeEstudios',this.value)"></label>
        <label class="ent-form-campo" style="flex:1 1 220px"><span>Director/a (firma)</span><input value="${_tEsc(acta.director || '')}" placeholder="Apellidos, Nombre" oninput="_sesActaSet('director',this.value)"></label>
      </div>
    </section>
    <div style="display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap">
      <button class="btn btn-ghost" onclick="generarActaEvaluacion('${jsAttr(nivel)}','${jsAttr(grupo)}','${k}')">🖨 Acta de evaluación</button>
      <button class="btn btn-primary" onclick="_sesIr(0)" ${r.total ? '' : 'disabled'}>Empezar con el alumnado ▶</button></div>`;
}
window._sesAsistencia = function(i, valor) {
  const d = _getAsistenciaData(_sesCtx.nivel, _sesCtx.grupo);
  const s = d.sesiones['eval' + _sesCtx.k][i]; if (!s) return;
  s.asistio = valor; if (valor) s.justificacion = '';
  markDirty(); renderSesion();
};
window._sesJustificacion = function(i, v) {
  const s = _getAsistenciaData(_sesCtx.nivel, _sesCtx.grupo).sesiones['eval' + _sesCtx.k][i]; if (!s) return;
  s.justificacion = v; markDirty();
};
window._sesActaSet = function(campo, v) { _sesActa(_sesCtx.nivel, _sesCtx.grupo, _sesCtx.k)[campo] = v; markDirty(); };
window._sesAnalisis = function(clave, v) { const acta = _sesActa(_sesCtx.nivel, _sesCtx.grupo, _sesCtx.k); if (!acta.analisis || typeof acta.analisis !== 'object') acta.analisis = {}; acta.analisis[clave] = v; markDirty(); };

function _sesAlumnoHTML(i) {
  const { nivel, grupo, k } = _sesCtx;
  const a = _sesAlumnos()[i]; if (!a) return '';
  const c = _SES_CAMPOS[k], s = _sesDeAlumno(a, k);
  const sus = +a[c.n] || 0, antes = k > 1 ? (+a[_SES_CAMPOS[String(k - 1)].n] || 0) : null;
  const mats_ = a[c.pend] || [];
  const tutF = { j: +a['faltasJust' + k] || 0, i: +a['faltasInjust' + k] || 0, ac: +a['ac' + k] || 0, pa: +a['partes' + k] || 0 };
  const alertas = typeof _alertasAlumno === 'function' ? _alertasSerias(_alertasAlumno(a, nivel)) : [];
  const pm = a.porMateria || {};
  const kReg = k === '3' ? 'curso' : k;
  /* Notas de cada materia, editables aquí mismo: lo que se cambia va a las suspensas de la evaluación (columna
     I/II/III PEND. y su número), al acta de calificaciones, a la ficha y a los informes (como «✍️ Datos de una materia»).
     Materias: las del equipo docente, las que tienen datos y las suspensas; menos las que no cursa. */
  const cat = getMateriasParaNivel(nivel, grupo) || [];
  const mats = [];
  const add = m => { m = String(m || '').trim(); if (m && _tNorm(m) !== 'tutoria' && !_tNoCursa(a, m) && !mats.some(x => _tNorm(x) === _tNorm(m))) mats.push(m); };
  _getAsistenciaData(nivel, grupo).profesores.forEach(p => add(_tMatEnCatalogo(p.materia, cat) || p.materia));
  Object.keys(pm).forEach(add); mats_.forEach(add);
  const pos = m => { const j = cat.findIndex(x => _tNorm(x) === _tNorm(m)); return j < 0 ? 999 : j; };
  mats.sort((x, y) => pos(x) - pos(y) || x.localeCompare(y, 'es'));
  _sesCtx.mats = mats;
  const recibido = mats.map((m, j) => {
    const clave = Object.keys(pm).find(x => _tNorm(x) === _tNorm(m)), d = clave ? pm[clave] : {};
    const n = (d.notas || {})[c.periodo] ?? (d.notas || {})[k];
    const f = (d.faltas || {})[kReg], cv = (d.convivencia || {})[kReg], com = (d.comentarios || {})[c.periodo] || (d.comentarios || {})[k] || '';
    const extra = [f && f.injustificadas ? `${f.injustificadas} F.s.j.` : '', cv && cv.ac ? `${cv.ac} AC` : '', cv && cv.pa ? `${cv.pa} partes` : ''].filter(Boolean).join(' · ');
    const susp = typeof n === 'number' ? n < 5 : mats_.some(x => _tNorm(x) === _tNorm(m));
    return `<tr><th scope="row">${_tEsc(m)}${d.profesor ? `<br><span class="ses-prof-m">${_tEsc(d.profesor)}</span>` : ''}</th>
      <td style="text-align:center"><input class="ses-nota${susp ? ' mal' : ''}" data-m="${j}" inputmode="decimal" value="${typeof n === 'number' ? _tEsc(String(n).replace('.', ',')) : ''}" aria-label="Nota de ${_tEsc(m)}" placeholder="—"
        onchange="_sesNota(${i},${j},this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();_sesCtx.foco=${j + 1};this.blur();}"></td>
      <td style="text-align:center"><input type="checkbox" ${susp ? 'checked' : ''} ${typeof n === 'number' ? 'disabled title="Con nota, sale sola (menos de 5)"' : 'title="Suspensa sin nota"'} aria-label="${_tEsc(m)} suspensa" onchange="_sesSusp(${i},${j},this.checked)"></td>
      <td>${_tEsc(extra)}</td><td>${_tEsc(com)}</td></tr>`;
  }).join('');
  const p = getPropObj(a[c.prop]);
  const total = _sesAlumnos().length;
  return `
    <div class="ses-alumno-cab">
      <h2 class="ses-alumno-nombre">${_tEsc(a.nombre || 'Sin nombre')}</h2>
      <span class="ses-chips">${[a.nese === 'Sí' ? 'NESE' + (_getNeseCodes(a.recursoNese).length ? ' · ' + _getNeseCodes(a.recursoNese).join(', ') : '') : '', a.repetidor === 'Sí' ? 'Repite' : '', a.compensatoria === 'Sí' ? 'Compensatoria' : '',
        a.papActivo ? 'PAP' : '', a.ecActivo ? 'Enriquecimiento' : '', (a.pendientesAnteriores || []).length ? `Pendientes: ${(a.pendientesAnteriores || []).join(', ')}` : '']
        .filter(Boolean).map(x => `<span class="ent-chip">${_tEsc(x)}</span>`).join('')}</span>
      <span style="flex:1"></span>
      <span style="color:var(--text3);font-size:13px">${i + 1} / ${total}</span>
    </div>
    <div class="ses-cifras">
      <div class="${sus >= 3 ? 'mal' : ''}"><strong>${sus}</strong><span>suspensas${antes != null ? ` (antes ${antes})` : ''}</span></div>
      <div class="${tutF.i ? 'mal' : ''}"><strong>${tutF.i}</strong><span>faltas sin justificar · ${tutF.j} justificadas</span></div>
      <div class="${tutF.pa ? 'mal' : ''}"><strong>${tutF.ac} · ${tutF.pa}</strong><span>AC · partes</span></div>
    </div>
    ${mats_.length ? `<p class="ses-mats">Materias suspensas: ${mats_.map(m => `<span class="ses-mat">${_tEsc(m)}</span>`).join('')}</p>` : ''}
    ${alertas.length ? `<ul class="ficha-lista" style="margin-top:10px">${alertas.map(x => `<li class="ficha-alerta ${x.nivel}"><span aria-hidden="true">${x.icono}</span> ${_tEsc(x.texto)}</li>`).join('')}</ul>` : ''}
    ${recibido ? `<section class="ses-bloque"><h2>Notas y lo que dice el profesorado <small style="font-weight:400;font-size:12px;color:var(--text3)">· las notas se pueden cambiar aquí (Intro pasa a la siguiente)</small></h2><div style="overflow-x:auto"><table class="inf-tabla ses-tabla">
      <thead><tr><th scope="col" style="text-align:left">Materia</th><th scope="col" style="text-align:center">Nota</th><th scope="col" style="text-align:center">Susp.</th><th scope="col" style="text-align:left">Faltas y convivencia</th><th scope="col" style="text-align:left">Comentario</th></tr></thead><tbody>${recibido}</tbody></table></div></section>` : ''}
    <section class="ses-bloque"><h2>${c.propEtq}</h2>
      <div class="ses-props" role="group" aria-label="${c.propEtq}">
        ${PROPUESTA_TIPOS.map(t => `<button class="ses-prop ${t.cls}${p.tipo === t.key ? ' elegida' : ''}" aria-pressed="${p.tipo === t.key}" onclick="_sesPropuesta(${i},'tipo','${jsAttr(t.key)}')">${_tEsc(t.label)}</button>`).join('')}
        <button class="ses-prop${!p.tipo ? ' elegida' : ''}" aria-pressed="${!p.tipo}" onclick="_sesPropuesta(${i},'tipo','')">Sin decidir</button>
      </div>
      <label class="ent-form-campo" style="max-width:340px;margin-top:10px"><span>Destino</span>
        <select onchange="_sesPropuesta(${i},'destino',this.value)"><option value="">—</option>${PROPUESTA_DESTINOS.map(x => `<option ${p.destino === x ? 'selected' : ''}>${_tEsc(x)}</option>`).join('')}
        ${p.destino && !PROPUESTA_DESTINOS.includes(p.destino) ? `<option selected>${_tEsc(p.destino)}</option>` : ''}</select></label>
    </section>
    <section class="ses-bloque"><h2>Acuerdos para este alumno/a</h2>
      <textarea class="ficha-texto ses-texto" rows="3" aria-label="Acuerdos para este alumno/a" placeholder="Medidas, quién se encarga, qué se comunica a la familia…" oninput="_sesAcuerdo(${i},this.value)">${_tEsc(s.acuerdos)}</textarea>
    </section>
    ${_sesParaActaHTML(a, i)}
    <div class="ses-pie">
      <button class="btn btn-ghost" onclick="_sesMover(-1)">◀ Anterior</button>
      <label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer"><input type="checkbox" ${s.revisado ? 'checked' : ''} onchange="_sesRevisado(${i},this.checked)"> Revisado</label>
      <span style="flex:1"></span>
      <button class="btn btn-primary" onclick="_sesRevisado(${i},true);_sesMover(1)">${i < total - 1 ? 'Revisado y siguiente ▶' : 'Revisado ✓'}</button>
    </div>`;
}
window._sesPropuesta = function(i, campo, valor) {
  const { nivel, grupo, k } = _sesCtx;
  const a = _sesAlumnos()[i]; if (!a) return;
  const c = _SES_CAMPOS[k];
  _undoPush(nivel, grupo);   // Ctrl+Z (fuera de la sesión) deshace la decisión
  const p = { ...getPropObj(a[c.prop]) };
  p[campo] = valor;
  a[c.prop] = { tipo: p.tipo || '', destino: p.destino || '' };
  markDirty(); renderSesion();
};
window._sesAcuerdo = function(i, v) { const a = _sesAlumnos()[i]; if (!a) return; _sesDeAlumno(a, _sesCtx.k).acuerdos = v; markDirty(); };

// Notas desde la sesión (ver _tGuardarNotaAlumno en 28-datos-materia.js).
window._sesNota = function(i, j, valor) {
  const { nivel, grupo, k } = _sesCtx, a = _sesAlumnos()[i], m = (_sesCtx.mats || [])[j]; if (!a || !m) return;
  const n = _dmLeerNota(valor);
  if (!n.ok) { _sesCtx.foco = null; showToast('⚠ La nota va de 0 a 10 (vale la coma)'); renderSesion(); return; }
  const antes = ((Object.entries(a.porMateria || {}).find(([x]) => _tNorm(x) === _tNorm(m)) || [])[1] || {}).notas || {};
  const periodo = _SES_CAMPOS[k].periodo; if ((antes[periodo] ?? null) === n.v) { renderSesion(); return; }
  _undoPush(nivel, grupo);
  const enLista = (a[_SES_CAMPOS[k].pend] || []).some(x => _tNorm(x) === _tNorm(m));
  const cambio = _tGuardarNotaAlumno(a, k, m, n.v, n.v === null ? enLista : undefined);
  markDirty(); renderSesion();
  showToast(`✓ ${m}: ${n.v === null ? 'sin nota' : String(n.v).replace('.', ',')}${cambio ? ' · suspensas actualizadas' : ''}`);
};
window._sesSusp = function(i, j, marcada) {
  const { nivel, grupo, k } = _sesCtx, a = _sesAlumnos()[i], m = (_sesCtx.mats || [])[j]; if (!a || !m) return;
  _undoPush(nivel, grupo);
  _tGuardarNotaAlumno(a, k, m, null, !!marcada);
  markDirty(); renderSesion();
};

/* «📋 Para el acta»: lo que el acta de evaluación necesita de cada alumno/a (ver 30-acta-evaluacion.js). */
function _sesParaActaHTML(a, i) {
  const { nivel, k } = _sesCtx, c = _SES_CAMPOS[k], s = _aeDeAlumno(a, k), p = getPropObj(a[c.prop]);
  const campo = (etq, clave, ph, filas) => `<label class="ent-form-campo"><span>${etq}</span>${filas
    ? `<textarea class="ficha-texto" rows="${filas}" placeholder="${_tEsc(ph || '')}" oninput="_sesActaAl(${i},'${clave}',this.value)">${_tEsc(s[clave] || '')}</textarea>`
    : `<input value="${_tEsc(s[clave] || '')}" placeholder="${_tEsc(ph || '')}" oninput="_sesActaAl(${i},'${clave}',this.value)">`}</label>`;
  const neseOcomp = a.nese === 'Sí' || _getNeseCodes(a.recursoNese).length || (Array.isArray(a.codComp) ? a.codComp.length : a.codComp);
  const ant = a.pendientesAnteriores || [];
  const partes = [
    `<div class="ses-casos" role="group" aria-label="Caso particular"><span>Caso particular:</span>${_AE_CASOS.map(([clave, etq]) =>
      `<label><input type="checkbox" ${s.casos.includes(clave) ? 'checked' : ''} onchange="_sesCaso(${i},'${clave}',this.checked)"> ${_tEsc(etq.split(' (')[0])}</label>`).join('')}</div>
     ${s.casos.length ? campo('Áreas / materias del caso', 'casoMaterias', 'Las materias en las que se nota (si no, salen sus suspensas)') + '<p class="ses-nota-ayuda">Las «medidas a tomar» son los acuerdos de arriba.</p>' : ''}`,
    a.repetidor === 'Sí' ? campo('Valoración de la repetición', 'valoracionRepeticion', '¿Está funcionando la repetición?', 2) : '',
    !isBach(nivel) && k !== '1' ? `<div class="ses-rejilla">
      <label class="ent-form-campo"><span>Programa de atención a la diversidad (Nivel III) / FPB</span>
        <select onchange="_sesActaAl(${i},'programa',this.value,true)"><option value="">— Ninguno —</option>${_AE_PROGRAMAS.map(x => `<option ${s.programa === x ? 'selected' : ''}>${_tEsc(x)}</option>`).join('')}</select></label>
      ${s.programa ? campo('Motivo', 'programaMotivo', '') : ''}
      ${s.programa === 'FPB' ? campo('Familia profesional (FPB)', 'fpbFamilia', '') : ''}</div>` : '',
    neseOcomp ? campo('Medidas adoptadas (NESE / Compensatoria)', 'medidasNese', 'Adaptaciones, apoyos (PT, AL), seguimiento…', 2) : '',
    ant.length ? `<div class="ses-subt">Pendientes de cursos anteriores — decisión</div><table class="inf-tabla ses-tabla ses-tabla-pend"><thead><tr><th scope="col" style="text-align:left">Materia</th><th scope="col" style="text-align:left">Estado</th><th scope="col" style="text-align:center">Nota</th><th scope="col" style="text-align:left">Motivo / observaciones</th></tr></thead><tbody>
      ${ant.map((m, j) => { const v = _aePendAnt(a, k, m); return `<tr><th scope="row">${_tEsc(m)}</th>
        <td><select aria-label="Estado de ${_tEsc(m)}" onchange="_sesPendAnt(${i},${j},'estado',this.value)">${_AE_ESTADOS_PEND.map(x => `<option ${v.estado === x ? 'selected' : ''}>${x}</option>`).join('')}</select></td>
        <td style="text-align:center"><input class="ses-nota" style="width:60px" value="${_tEsc(v.nota)}" aria-label="Nota de ${_tEsc(m)}" oninput="_sesPendAnt(${i},${j},'nota',this.value)"></td>
        <td><input value="${_tEsc(v.motivo)}" aria-label="Motivo de ${_tEsc(m)}" style="width:100%" oninput="_sesPendAnt(${i},${j},'motivo',this.value)"></td></tr>`; }).join('')}</tbody></table>` : '',
    k === '3' && p.tipo === 'Repetición' ? campo('Motivos de la no promoción (Plan de Repetición)', 'motivoNoPromocion', '', 2) : '',
    k === '3' ? campo('Agrupación para el próximo curso (observaciones)', 'agrupacion', 'Con quién sí / con quién no, optativas, grupo…') : '',
  ].filter(Boolean);
  return `<section class="ses-bloque ses-para-acta"><h2>📋 Para el acta</h2>${partes.join('')}</section>`;
}
window._sesActaAl = function(i, clave, v, redibujar) {
  const a = _sesAlumnos()[i]; if (!a) return;
  _aeDeAlumno(a, _sesCtx.k)[clave] = v; markDirty();
  if (redibujar) renderSesion();
};
window._sesCaso = function(i, clave, marcado) {
  const a = _sesAlumnos()[i]; if (!a) return;
  const s = _aeDeAlumno(a, _sesCtx.k);
  s.casos = s.casos.filter(x => x !== clave); if (marcado) s.casos.push(clave);
  markDirty(); renderSesion();
};
window._sesPendAnt = function(i, j, campo, v) {
  const a = _sesAlumnos()[i]; if (!a) return;
  const m = (a.pendientesAnteriores || [])[j]; if (!m) return;
  const s = _aeDeAlumno(a, _sesCtx.k);
  s.pendAnt[m] = Object.assign({}, _aePendAnt(a, _sesCtx.k, m), s.pendAnt[m] || {}, { [campo]: v });
  // El estado es el mismo que el de las columnas «Recuperadas» / «No recuperadas» de la tabla del grupo.
  if (campo === 'estado') {
    const quitar = l => (l || []).filter(x => x !== m);
    a.recuperadasAnteriores = quitar(a.recuperadasAnteriores); a.noRecuperadasAnteriores = quitar(a.noRecuperadasAnteriores);
    if (v === 'Recuperada') a.recuperadasAnteriores.push(m); else if (v === 'No recuperada') a.noRecuperadasAnteriores.push(m);
  }
  markDirty();
};
window._sesRevisado = function(i, v) {
  const a = _sesAlumnos()[i]; if (!a) return;
  const s = _sesDeAlumno(a, _sesCtx.k);
  if (s.revisado === !!v) return;
  s.revisado = !!v; markDirty(); renderSesion();
};

/* ---------------- 📝 Acta de la sesión (vista de documentos: imprimir / PDF / guardar) ---------------- */
window.generarActaSesion = function(nivel, grupo, k) {
  k = String(k);
  const c = _SES_CAMPOS[k], alumnos = data[nivel]?.[grupo] || [];
  const d = _getAsistenciaData(nivel, grupo), acta = _sesActa(nivel, grupo, k), ses = d.sesiones['eval' + k] || [];
  const r = _sesResumenGrupo(nivel, grupo, k);
  const ies = document.getElementById('headerIesName')?.value || '';
  const tutor = tutores[`${nivel}-${grupo}`] || '';
  const fecha = getDates(nivel)['eval' + k];
  const asisten = d.profesores.filter((p, i) => ses[i]?.asistio === true);
  const faltan = d.profesores.map((p, i) => ({ p, s: ses[i] || {} })).filter(x => x.s.asistio === false);
  const sinMarcar = d.profesores.filter((p, i) => ses[i]?.asistio !== true && ses[i]?.asistio !== false);
  const prop = p => { const o = getPropObj(p); return [o.tipo, o.destino].filter(Boolean).join(' → '); };
  const parrafo = t => t ? `<p style="white-space:pre-wrap">${_tEsc(t)}</p>` : '<p style="color:#999">—</p>';
  const filas = alumnos.map((a, i) => `<tr><td style="text-align:center">${i + 1}</td><td>${_tEsc(a.nombre)}</td><td style="text-align:center">${+a[c.n] || 0}</td>
    <td>${_tEsc((a[c.pend] || []).join(', '))}</td><td>${_tEsc(prop(a[c.prop]))}</td><td style="white-space:pre-wrap">${_tEsc(((a.sesionEval || {})[k] || {}).acuerdos || '')}</td></tr>`).join('');
  const win = _ventanaDoc();
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Acta de la sesión de evaluación — ${_tEsc(nivel)} ${_tEsc(grupo)} — ${FT_NOMBRE_EVAL[k]}</title>
    <style>
      body{font-family:'Segoe UI',Arial,sans-serif;color:#222;margin:0;font-size:12.5px}
      .page{max-width:900px;margin:0 auto;padding:28px}
      .toolbar{position:sticky;top:0;background:#1a1d27;padding:9px 18px;display:flex;justify-content:space-between;align-items:center}
      .toolbar span{color:#e8eaf2;font-size:13px;font-weight:600} .tbtn{padding:6px 14px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:600;background:#2563eb;color:#fff}
      h1{font-size:19px;margin:0 0 4px} h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#444;border-bottom:1px solid #ccc;padding-bottom:4px;margin:20px 0 8px}
      .sub{color:#555;margin-bottom:6px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ccc;padding:5px 6px;vertical-align:top;text-align:left}
      th{background:#f2f2f2;font-size:11px} .cifras{display:flex;gap:10px} .cifras div{flex:1;border:1px solid #ccc;border-radius:6px;padding:8px;text-align:center} .cifras strong{display:block;font-size:18px}
      .firmas{display:flex;justify-content:space-between;gap:40px;margin-top:56px} .firmas div{flex:1;border-top:1px solid #999;padding-top:6px;text-align:center}
      @media print{.no-print{display:none!important} tr{page-break-inside:avoid}}
    </style></head><body>
    <div class="toolbar no-print"><span>📝 Acta de la sesión — ${_tEsc(nivel)} ${_tEsc(grupo)}</span><button class="tbtn" onclick="window.print()">🖨️ Imprimir / PDF</button></div>
    <div class="page">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#666">${_tEsc(ies)}</div>
      <h1>Acta de la sesión de evaluación · ${FT_NOMBRE_EVAL[k]}</h1>
      <div class="sub">${_tEsc(nivel)} · Grupo ${_tEsc(grupo)}${fecha ? ' · ' + _tEsc(fmtDate(fecha)) : ''}${acta.horaInicio ? ' · de ' + _tEsc(acta.horaInicio) + (acta.horaFin ? ' a ' + _tEsc(acta.horaFin) : '') : ''}${tutor ? ' · Tutor/a: ' + _tEsc(tutor) : ''}</div>
      <h2>Asistentes</h2>
      ${asisten.length ? `<p>${asisten.map(p => `${_tEsc(p.nombre)}${p.materia || p.esTutor ? ' (' + [_tMateriaDeProfesor(p), p.esTutor ? 'tutor/a' : ''].filter(Boolean).map(_tEsc).join(', ') + ')' : ''}`).join('; ')}.</p>` : '<p style="color:#999">—</p>'}
      ${faltan.length ? `<p><strong>No asisten:</strong> ${faltan.map(x => `${_tEsc(x.p.nombre)}${x.p.materia ? ' (' + _tEsc(_tMateriaDeProfesor(x.p)) + ')' : ''}${x.s.justificacion ? ': ' + _tEsc(x.s.justificacion) : ''}`).join('; ')}.</p>` : ''}
      ${sinMarcar.length ? `<p style="color:#999">Sin anotar: ${sinMarcar.map(p => _tEsc(p.nombre)).join('; ')}.</p>` : ''}
      <h2>Resultados</h2>
      <div class="cifras"><div><strong>${r.total}</strong>alumnos</div><div><strong>${r.cero}</strong>todo aprobado</div><div><strong>${r.unaDos}</strong>1 o 2 suspensas</div><div><strong>${r.tresMas}</strong>3 o más</div></div>
      ${r.ranking.length ? `<p>Materias con más suspensos: ${r.ranking.slice(0, 8).map(([m, n]) => `${_tEsc(m)} (${n})`).join(', ')}.</p>` : ''}
      <h2>Valoración general del grupo</h2>${parrafo(acta.valoracion)}
      <h2>Acuerdos del grupo</h2>${parrafo(acta.acuerdosGrupo)}
      <h2>Alumnado</h2>
      <table><thead><tr><th style="text-align:center">Nº</th><th>Alumno/a</th><th style="text-align:center">Susp.</th><th>Materias</th><th>${c.propEtq}</th><th>Acuerdos</th></tr></thead><tbody>${filas}</tbody></table>
      <div class="firmas"><div>Fdo.: el tutor/a${tutor ? '<br>' + _tEsc(tutor) : ''}</div><div>Vº Bº jefatura de estudios</div></div>
    </div></body></html>`);
  win.document.close();
};

/* ---------------- 📤 Ficha del grupo para el profesorado (formato en js/comun/formato-tutoria.js) ---------------- */
function fichaGrupoParaProfesorado(nivel, grupo, k) {
  k = String(k);
  const c = _SES_CAMPOS[k], acta = _sesActa(nivel, grupo, k);
  return {
    formato: FT_FORMATO_FICHA, version: FT_VERSION_FICHA,
    nivel, grupo, tutor: tutores[`${nivel}-${grupo}`] || '', evaluacion: k, fechaSesion: getDates(nivel)['eval' + k] || '',
    generado: new Date().toISOString(), acuerdosGrupo: acta.acuerdosGrupo || '', valoracion: acta.valoracion || '',
    alumnos: (data[nivel]?.[grupo] || []).filter(a => (a.nombre || '').trim()).map(a => ({
      idsCuaderno: (a.idsCuaderno || []).map(String), nombre: a.nombre,
      nese: a.nese === 'Sí', recursosNese: _getNeseCodes(a.recursoNese), repetidor: a.repetidor === 'Sí', compensatoria: a.compensatoria === 'Sí',
      pap: !!a.papActivo, enriquecimiento: !!a.ecActivo, pendientesAnteriores: a.pendientesAnteriores || [],
      propuesta: getPropObj(a[c.prop]), acuerdos: ((a.sesionEval || {})[k] || {}).acuerdos || '',
    })),
  };
}
window.exportarFichaGrupo = async function(nivel, grupo, k) {
  const o = fichaGrupoParaProfesorado(nivel, grupo, k);
  const limpio = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  await _tGuardarArchivo(new Blob([JSON.stringify(o, null, 2)], { type: 'application/json' }), `ficha-grupo-${limpio(nivel)}-${limpio(grupo)}-eval${k}.json`);
  mostrarAviso(`Ficha del grupo guardada (${o.alumnos.length} alumnos, ${FT_NOMBRE_EVAL[k]}).\n\nEnvíala al equipo docente: cada profesor/a la carga en su Cuaderno, en el grupo → Resultados → «📥 De la tutoría». ` +
    `Marca NESE y repetición, sus pendientes de cursos anteriores y guarda los acuerdos para consultarlos en la ficha de cada alumno/a.\n\nNo lleva contactos de las familias ni entrevistas.`, 'Ficha del grupo');
};
