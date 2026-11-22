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
window._sesCambiarEval = function(k) { _sesCtx.k = String(k); renderSesion(); };
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
      <button class="btn btn-ghost btn-sm" onclick="generarActaSesion('${jsAttr(nivel)}','${jsAttr(grupo)}','${k}')">📝 Acta de la sesión</button>
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
      <span style="flex:1;min-width:0"><strong>${_tEsc(p.nombre || '—')}</strong> <span style="color:var(--text3)">${_tEsc(p.materia || '')}${p.esTutor ? ' · tutor/a' : ''}</span></span>
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
    <section class="ses-bloque"><h2>Valoración general del grupo</h2>
      <textarea class="ficha-texto ses-texto" rows="4" aria-label="Valoración general del grupo" placeholder="Ambiente de trabajo, convivencia, evolución respecto a la evaluación anterior…" oninput="_sesActaSet('valoracion',this.value)">${_tEsc(acta.valoracion)}</textarea>
    </section>
    <section class="ses-bloque"><h2>Acuerdos del grupo</h2>
      <textarea class="ficha-texto ses-texto" rows="4" aria-label="Acuerdos del grupo" placeholder="Medidas para todo el grupo, cambios de sitio, coordinación entre materias…" oninput="_sesActaSet('acuerdosGrupo',this.value)">${_tEsc(acta.acuerdosGrupo)}</textarea>
    </section>
    <div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" onclick="_sesIr(0)" ${r.total ? '' : 'disabled'}>Empezar con el alumnado ▶</button></div>`;
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

function _sesAlumnoHTML(i) {
  const { nivel, grupo, k } = _sesCtx;
  const a = _sesAlumnos()[i]; if (!a) return '';
  const c = _SES_CAMPOS[k], s = _sesDeAlumno(a, k);
  const sus = +a[c.n] || 0, antes = k > 1 ? (+a[_SES_CAMPOS[String(k - 1)].n] || 0) : null;
  const mats = a[c.pend] || [];
  const tutF = { j: +a['faltasJust' + k] || 0, i: +a['faltasInjust' + k] || 0, ac: +a['ac' + k] || 0, pa: +a['partes' + k] || 0 };
  const alertas = typeof _alertasAlumno === 'function' ? _alertasSerias(_alertasAlumno(a, nivel)) : [];
  const pm = a.porMateria || {};
  const kReg = k === '3' ? 'curso' : k;
  const recibido = Object.keys(pm).sort((x, y) => x.localeCompare(y, 'es')).map(m => {
    const d = pm[m], n = (d.notas || {})[c.periodo] ?? (d.notas || {})[k];
    const f = (d.faltas || {})[kReg], cv = (d.convivencia || {})[kReg], com = (d.comentarios || {})[c.periodo] || (d.comentarios || {})[k] || '';
    const extra = [f && f.injustificadas ? `${f.injustificadas} F.s.j.` : '', cv && cv.ac ? `${cv.ac} AC` : '', cv && cv.pa ? `${cv.pa} partes` : ''].filter(Boolean).join(' · ');
    return `<tr><th scope="row">${_tEsc(m)}</th><td class="${typeof n === 'number' && n < 5 ? 'mal' : ''}">${typeof n === 'number' ? _tEsc(String(n).replace('.', ',')) : '—'}</td>
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
    ${mats.length ? `<p class="ses-mats">Materias suspensas: ${mats.map(m => `<span class="ses-mat">${_tEsc(m)}</span>`).join('')}</p>` : ''}
    ${alertas.length ? `<ul class="ficha-lista" style="margin-top:10px">${alertas.map(x => `<li class="ficha-alerta ${x.nivel}"><span aria-hidden="true">${x.icono}</span> ${_tEsc(x.texto)}</li>`).join('')}</ul>` : ''}
    ${recibido ? `<section class="ses-bloque"><h2>Lo que dice el profesorado</h2><div style="overflow-x:auto"><table class="inf-tabla ses-tabla">
      <thead><tr><th scope="col">Materia</th><th scope="col">Nota</th><th scope="col">Faltas y convivencia</th><th scope="col">Comentario</th></tr></thead><tbody>${recibido}</tbody></table></div></section>` : ''}
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
  const filas = alumnos.map((a, i) => `<tr><td>${i + 1}</td><td>${_tEsc(a.nombre)}</td><td style="text-align:center">${+a[c.n] || 0}</td>
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
      ${asisten.length ? `<p>${asisten.map(p => `${_tEsc(p.nombre)}${p.materia || p.esTutor ? ' (' + [p.materia, p.esTutor ? 'tutor/a' : ''].filter(Boolean).map(_tEsc).join(', ') + ')' : ''}`).join('; ')}.</p>` : '<p style="color:#999">—</p>'}
      ${faltan.length ? `<p><strong>No asisten:</strong> ${faltan.map(x => `${_tEsc(x.p.nombre)}${x.p.materia ? ' (' + _tEsc(x.p.materia) + ')' : ''}${x.s.justificacion ? ': ' + _tEsc(x.s.justificacion) : ''}`).join('; ')}.</p>` : ''}
      ${sinMarcar.length ? `<p style="color:#999">Sin anotar: ${sinMarcar.map(p => _tEsc(p.nombre)).join('; ')}.</p>` : ''}
      <h2>Resultados</h2>
      <div class="cifras"><div><strong>${r.total}</strong>alumnos</div><div><strong>${r.cero}</strong>todo aprobado</div><div><strong>${r.unaDos}</strong>1 o 2 suspensas</div><div><strong>${r.tresMas}</strong>3 o más</div></div>
      ${r.ranking.length ? `<p>Materias con más suspensos: ${r.ranking.slice(0, 8).map(([m, n]) => `${_tEsc(m)} (${n})`).join(', ')}.</p>` : ''}
      <h2>Valoración general del grupo</h2>${parrafo(acta.valoracion)}
      <h2>Acuerdos del grupo</h2>${parrafo(acta.acuerdosGrupo)}
      <h2>Alumnado</h2>
      <table><thead><tr><th>Nº</th><th>Alumno/a</th><th>Susp.</th><th>Materias</th><th>${c.propEtq}</th><th>Acuerdos</th></tr></thead><tbody>${filas}</tbody></table>
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
