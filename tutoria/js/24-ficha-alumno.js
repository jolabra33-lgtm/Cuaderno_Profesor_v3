/* ============================================================================
   Gestor de Tutoría · Ficha completa del alumno/a y entrevistas con la familia
   tutoria/js/24-ficha-alumno.js
   ============================================================================

   Reúne en una sola ventana lo que antes estaba repartido (observaciones,
   historial, seguimiento, PAP/EC, lo recibido del equipo docente):
     Resumen · Académico · Faltas y convivencia · Entrevistas · Seguimientos.

   ENTREVISTAS con la familia: alumno.entrevistas = [{id, fecha, hora, medio,
   solicitadaPor, asistentes, motivo, acuerdos, proximaCita, proximaHora,
   observaciones}] (campo nuevo: los datos antiguos no lo tienen y empiezan sin
   entrevistas). Cada una tiene su acta imprimible. La «próxima cita» aparece en
   las alertas y en «🧭 Qué me falta».
*/

let _fichaCtx = { nivel: '', grupo: '', idx: 0, pestana: 'resumen', borrador: null };
const _FICHA_PESTANAS = [['resumen', '🧾 Resumen'], ['academico', '🎓 Académico'], ['convivencia', '🤝 Faltas y convivencia'], ['entrevistas', '👪 Entrevistas'], ['seguimientos', '📞 Seguimientos']];
const _ENT_MEDIOS = ['Presencial', 'Teléfono', 'Videollamada', 'Correo / Web Familia'];
const _ENT_SOLICITA = ['Familia', 'Tutor/a', 'Equipo docente', 'Orientación', 'Jefatura de estudios'];

function _fichaAlumno() { const { nivel, grupo, idx } = _fichaCtx; return data[nivel]?.[grupo]?.[idx]; }
function _fichaEntrevistas(a) { if (!Array.isArray(a.entrevistas)) a.entrevistas = []; return a.entrevistas; }

window.openFichaAlumno = function(nivel, grupo, idx, pestana) {
  if (!data[nivel]?.[grupo]?.[idx]) return;
  _fichaCtx = { nivel, grupo, idx, pestana: pestana || 'resumen', borrador: null };
  let ov = document.getElementById('fichaOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'fichaOverlay';
    ov.className = 'modal-overlay';
    ov.innerHTML = `<div class="modal ficha-modal" role="dialog" aria-modal="true" aria-labelledby="fichaTitulo">
      <div id="fichaCab"></div>
      <div id="fichaPestanas" class="ficha-pestanas" role="tablist"></div>
      <div id="fichaBody" class="modal-scroll"></div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) closeFichaAlumno(); });
    ov.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.querySelector('.tdlg-ov')) { e.stopPropagation(); closeFichaAlumno(); } });
  }
  ov.classList.add('open');
  renderFichaAlumno();
  setTimeout(() => ov.querySelector('.ficha-pestanas [aria-selected="true"]')?.focus(), 30);
};
window.closeFichaAlumno = function() {
  document.getElementById('fichaOverlay')?.classList.remove('open');
  // Lo cambiado en la ficha (observaciones, entrevistas) se ve también en la tabla y en Inicio.
  if (GRUPOS_POR_NIVEL[currentNivel]) updateTable(currentNivel, currentGrupos[currentNivel]);
  else if (currentNivel === '__home__') renderAll();
};
window._fichaIr = function(campo, valor) {
  if (campo === 'idx') { _fichaCtx.idx = valor; _fichaCtx.borrador = null; }
  else _fichaCtx[campo] = valor;
  renderFichaAlumno();
};
// Abre otra ventana de la app (seguimiento, historial…) desde la ficha, cerrándola antes.
window._fichaAbrir = function(fn) {
  const { nivel, grupo, idx } = _fichaCtx;
  closeFichaAlumno();
  fn(nivel, grupo, idx);
};

function renderFichaAlumno() {
  const { nivel, grupo, idx, pestana } = _fichaCtx;
  const a = _fichaAlumno();
  if (!a) { closeFichaAlumno(); return; }
  const total = (data[nivel][grupo] || []).length;
  const edad = calcEdad(a.fecha);
  const al = typeof _alertasAlumno === 'function' ? _alertasSerias(_alertasAlumno(a, nivel)) : [];
  document.getElementById('fichaCab').innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:10px">
      <div style="flex:1;min-width:220px">
        <div class="modal-title" id="fichaTitulo" style="margin-bottom:2px">👤 ${_tEsc(a.nombre || 'Sin nombre')}</div>
        <div style="font-size:12px;color:var(--text2)">${_tEsc(nivel)} · Grupo ${_tEsc(grupo)}${edad !== '' ? ` · ${edad} años` : ''}${a.repetidor === 'Sí' ? ' · repite' : ''}${a.nese === 'Sí' ? ' · NESE' : ''}${al.length ? ` · <span style="color:var(--yellow);font-weight:600">⚠ ${al.length} alerta${al.length === 1 ? '' : 's'}</span>` : ''}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="_fichaIr('idx',${idx - 1})" ${idx > 0 ? '' : 'disabled'} aria-label="Alumno/a anterior" title="Alumno/a anterior">◀</button>
      <span style="font-size:12px;color:var(--text3);align-self:center">${idx + 1} / ${total}</span>
      <button class="btn btn-ghost btn-sm" onclick="_fichaIr('idx',${idx + 1})" ${idx < total - 1 ? '' : 'disabled'} aria-label="Alumno/a siguiente" title="Alumno/a siguiente">▶</button>
      <button class="btn btn-ghost btn-sm" onclick="closeFichaAlumno()">✕ Cerrar</button>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
      <button class="btn btn-ghost btn-sm" onclick="_fichaAbrir(openSegFamilia)">📞 Seguimiento con familia</button>
      <button class="btn btn-ghost btn-sm" onclick="_fichaAbrir(openHistorial)">📅 Historial académico</button>
      <button class="btn btn-ghost btn-sm" onclick="_fichaAbrir((n,g,i)=>openInformacionEquipo(n,g,'alumno',i))">📬 Información del equipo docente</button>
      <button class="btn btn-ghost btn-sm" onclick="_fichaAbrir(printSeguimientoAlumno)">📋 Informe de seguimiento</button>
      ${a.papActivo ? `<button class="btn btn-ghost btn-sm" onclick="_fichaAbrir(openPapModal)">🧩 PAP</button>` : ''}
      ${a.ecActivo ? `<button class="btn btn-ghost btn-sm" onclick="_fichaAbrir(openAcModal)">🌟 Enriquecimiento</button>` : ''}
    </div>`;
  document.getElementById('fichaPestanas').innerHTML = _FICHA_PESTANAS.map(([k, t]) => {
    const n = k === 'entrevistas' ? _fichaEntrevistas(a).length : k === 'seguimientos' ? (a.seguimientos || []).length : 0;
    return `<button role="tab" aria-selected="${k === pestana}" class="ficha-pestana${k === pestana ? ' activa' : ''}" onclick="_fichaIr('pestana','${k}')">${t}${n ? ` <span class="ficha-num">${n}</span>` : ''}</button>`;
  }).join('');
  const cuerpo = { resumen: _fichaResumen, academico: _fichaAcademico, convivencia: _fichaConvivencia, entrevistas: _fichaEntrevistasHTML, seguimientos: _fichaSeguimientos }[pestana] || _fichaResumen;
  const body = document.getElementById('fichaBody');
  body.innerHTML = cuerpo(a);
  _tA11y(body);
}

const _fichaDato = (etq, valor) => `<div class="ficha-dato"><span>${etq}</span><strong>${valor || '<span style="color:var(--text3);font-weight:400">—</span>'}</strong></div>`;

function _fichaResumen(a) {
  const { nivel } = _fichaCtx;
  const lista = typeof _alertasAlumno === 'function' ? _alertasAlumno(a, nivel) : [];
  const recursos = _getNeseCodes(a.recursoNese);
  const datos = [
    _fichaDato('Fecha de nacimiento', a.fecha ? _tEsc(fmtDate(a.fecha)) : ''),
    _fichaDato('Repite', _tEsc(a.repetidor || 'No')),
    _fichaDato('NESE', _tEsc(a.nese || '') + (recursos.length ? ' · ' + recursos.map(_tEsc).join(', ') : '')),
    _fichaDato('Compensatoria', _tEsc(a.compensatoria || '') + ((a.codComp || []).length ? ' · ' + a.codComp.map(_tEsc).join(', ') : '')),
    _fichaDato('Lengua base', _tEsc(a.lenguaBase || '')),
    _fichaDato('Centro de procedencia', _tEsc(a.colegioProcedencia || '')),
    _fichaDato('Pendientes de cursos anteriores', (a.pendientesAnteriores || []).map(_tEsc).join(', ')),
    _fichaDato('Medidas', [a.papActivo ? 'PAP' : '', a.ecActivo ? 'Enriquecimiento curricular' : ''].filter(Boolean).join(' · ')),
  ].join('');
  const familia = (Array.isArray(a.familia) ? a.familia : []).filter(f => f.nombre || f.email || f.telefono).map(f => `
    <li><strong>${_tEsc(f.nombre || '—')}</strong>${f.parentesco ? ` (${_tEsc(f.parentesco)})` : ''}
      ${f.email ? ` · <a href="mailto:${_tEsc(encodeURIComponent(f.email))}">${_tEsc(f.email)}</a>` : ''}
      ${f.telefono ? ` · <a href="tel:${_tEsc(String(f.telefono).replace(/[^\d+]/g, ''))}">${_tEsc(f.telefono)}</a>` : ''}</li>`).join('');
  const alertas = lista.map(x => `<li class="ficha-alerta ${x.nivel}"><span aria-hidden="true">${x.icono}</span> ${_tEsc(x.texto)}${x.detalle ? ` <span style="color:var(--text3)">· ${_tEsc(x.detalle)}</span>` : ''}</li>`).join('');
  // Línea de tiempo: entrevistas, seguimientos y próxima cita
  const hitos = [];
  _fichaEntrevistas(a).forEach(e => {
    hitos.push({ fecha: e.fecha, txt: `👪 Entrevista (${_tEsc(e.medio || '—')})${e.motivo ? ': ' + _tEsc(e.motivo.slice(0, 90)) + (e.motivo.length > 90 ? '…' : '') : ''}` });
    if (e.proximaCita) hitos.push({ fecha: e.proximaCita, txt: `🗓️ Próxima cita con la familia${e.proximaHora ? ' a las ' + _tEsc(e.proximaHora) : ''}` });
  });
  (a.seguimientos || []).forEach(s => hitos.push({ fecha: s.fecha, txt: `📞 Seguimiento con familia (${(s.materias || []).length} materias)` }));
  hitos.sort((x, y) => (y.fecha || '').localeCompare(x.fecha || ''));
  return `
    <div class="ficha-rejilla">
      <section><h3>Datos</h3><div class="ficha-datos">${datos}</div></section>
      <section><h3>Alertas</h3>
        ${alertas ? `<ul class="ficha-lista">${alertas}</ul>` : '<p class="ficha-vacio">✓ Sin alertas.</p>'}
        <button class="qmf-link" style="font-size:12px" onclick="abrirUmbralesAlertas()">⚙ Umbrales de las alertas</button>
        <h3 style="margin-top:16px">Familia</h3>
        ${familia ? `<ul class="ficha-lista">${familia}</ul>` : '<p class="ficha-vacio">Sin contactos.</p>'}
        <button class="qmf-link" style="font-size:12px" onclick="_fichaAbrir(openSegFamilia)">Añadir o cambiar contactos (en el seguimiento con familia)</button>
      </section>
    </div>
    <section style="margin-top:14px"><h3>Observaciones</h3>
      <textarea class="ficha-texto" rows="4" aria-label="Observaciones del alumno/a" placeholder="Lo que quieras recordar de este alumno/a…" onchange="_fichaSetNotas(this.value)">${_tEsc(a.notas || '')}</textarea>
    </section>
    <section style="margin-top:14px"><h3>Línea de tiempo</h3>
      ${hitos.length ? `<ul class="ficha-lista ficha-tiempo">${hitos.slice(0, 15).map(h => `<li><span class="ficha-fecha">${_tEsc(fmtDate(h.fecha))}</span> ${h.txt}</li>`).join('')}</ul>` : '<p class="ficha-vacio">Todavía no hay entrevistas ni seguimientos.</p>'}
    </section>`;
}
window._fichaSetNotas = function(v) {
  const a = _fichaAlumno(); if (!a) return;
  a.notas = v; markDirty();
};

function _fichaAcademico(a) {
  const { nivel } = _fichaCtx;
  const prop = p => { const o = getPropObj(p); return [o.tipo, o.destino].filter(Boolean).map(_tEsc).join(' → ') || '—'; };
  const filas = [
    ['I Evaluación', a.eval1, a.pendientes1, prop(a.propuesta1)],
    ['II Evaluación', a.eval2, a.pendientes2, prop(a.propuesta2)],
    ['Evaluación final', a.eval3, a.pendientesIII, prop(a.propuesta3)],
  ];
  if (isBach(nivel)) filas.push(['Extraordinaria', a.evalExtr, a.pendientesExtr, '—']);
  const tabla = filas.map(([t, n, mats, p]) => `<tr><th scope="row">${t}</th><td style="text-align:center;${(+n || 0) > 0 ? 'color:var(--red);font-weight:700' : ''}">${+n || 0}</td>
    <td>${(mats || []).map(_tEsc).join(', ') || '<span style="color:var(--text3)">—</span>'}</td><td>${p}</td></tr>`).join('');
  const pm = a.porMateria || {};
  const mats = Object.keys(pm).sort((x, y) => x.localeCompare(y, 'es'));
  const nota = v => typeof v === 'number' ? `<span style="${v < 5 ? 'color:var(--red);font-weight:700' : ''}">${_tEsc(String(v).replace('.', ','))}</span>` : '<span style="color:var(--text3)">—</span>';
  const recibido = mats.length ? `<div style="overflow-x:auto"><table class="inf-tabla" style="width:100%;border-collapse:collapse;font-size:12.5px">
      <thead><tr><th scope="col" style="text-align:left">Materia</th>${['I', 'II', 'III', 'Final'].map(x => `<th scope="col" style="text-align:center">${x}</th>`).join('')}</tr></thead>
      <tbody>${mats.map(m => `<tr><th scope="row" style="text-align:left">${_tEsc(m)}<br><span style="font-size:11px;font-weight:400;color:var(--text3)">${_tEsc(pm[m].profesor || '')}</span></th>
        ${['1', '2', '3', 'final'].map(k => `<td style="text-align:center">${nota((pm[m].notas || {})[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
    : '<p class="ficha-vacio">Aún no ha llegado ninguna nota del equipo docente (📬).</p>';
  const decision = prop(a.promociona);
  return `
    <section><h3>Por evaluación</h3>
      <div style="overflow-x:auto"><table class="inf-tabla" style="width:100%;border-collapse:collapse;font-size:12.5px">
        <thead><tr><th scope="col"></th><th scope="col" style="text-align:center">Suspensas</th><th scope="col" style="text-align:left">Materias</th><th scope="col" style="text-align:left">Propuesta</th></tr></thead>
        <tbody>${tabla}</tbody></table></div>
      <p style="font-size:13px;margin:10px 0 0">Decisión final: <strong>${decision}</strong></p>
    </section>
    <section style="margin-top:16px"><h3>Notas recibidas del equipo docente</h3>${recibido}</section>
    <section style="margin-top:16px"><h3>Cursos anteriores</h3>
      <div class="ficha-datos">
        ${_fichaDato('Pendientes', (a.pendientesAnteriores || []).map(_tEsc).join(', '))}
        ${_fichaDato('Recuperadas', (a.recuperadasAnteriores || []).map(_tEsc).join(', '))}
        ${_fichaDato('No recuperadas', (a.noRecuperadasAnteriores || []).map(_tEsc).join(', '))}
      </div></section>`;
}

function _fichaConvivencia(a) {
  const col = (base) => [1, 2, 3].map(k => +a[base + k] || 0);
  const filas = [['Faltas justificadas', 'faltasJust'], ['Faltas sin justificar', 'faltasInjust'], ['AC (actitud y comportamiento)', 'ac'], ['Partes', 'partes'], ['Expedientes', 'expedientes']];
  const tabla = filas.map(([t, b]) => { const v = col(b); const s = v.reduce((x, y) => x + y, 0);
    return `<tr><th scope="row" style="text-align:left">${t}</th>${v.map(n => `<td style="text-align:center">${n}</td>`).join('')}<td style="text-align:center;font-weight:700">${s}</td></tr>`; }).join('');
  const pm = a.porMateria || {};
  const mats = Object.keys(pm).filter(m => (pm[m].faltas || {}).curso || (pm[m].convivencia || {}).curso).sort((x, y) => x.localeCompare(y, 'es'));
  const cuad = mats.length ? `<div style="overflow-x:auto"><table class="inf-tabla" style="width:100%;border-collapse:collapse;font-size:12.5px">
      <thead><tr><th scope="col">Materia</th><th scope="col">Sin justificar</th><th scope="col">Justificadas</th><th scope="col">Retrasos</th><th scope="col">AC</th><th scope="col">Reconocimientos</th><th scope="col">Partes</th></tr></thead>
      <tbody>${mats.map(m => { const f = (pm[m].faltas || {}).curso || {}, c = (pm[m].convivencia || {}).curso || {};
        return `<tr><th scope="row" style="text-align:left">${_tEsc(m)}</th>${[f.injustificadas, f.justificadas, f.retrasos, c.ac, c.rc, c.pa].map(n => `<td style="text-align:center">${n || 0}</td>`).join('')}</tr>`; }).join('')}</tbody></table></div>`
    : '<p class="ficha-vacio">Aún no ha llegado nada de los Cuadernos del profesorado (📬).</p>';
  return `
    <section><h3>Registrado en Tutoría</h3>
      <div style="overflow-x:auto"><table class="inf-tabla" style="width:100%;border-collapse:collapse;font-size:12.5px">
        <thead><tr><th scope="col"></th><th scope="col">I</th><th scope="col">II</th><th scope="col">III</th><th scope="col">Total</th></tr></thead>
        <tbody>${tabla}</tbody></table></div>
      <p style="font-size:11.5px;color:var(--text3);margin:6px 0 0">Se cambian en la tabla del grupo, en cada evaluación.</p></section>
    <section style="margin-top:16px"><h3>Registrado por el profesorado en su materia (curso)</h3>${cuad}</section>`;
}

/* ---------------- Entrevistas con la familia ---------------- */
function _entNueva(a) {
  const { nivel, grupo } = _fichaCtx;
  const fam = (Array.isArray(a.familia) ? a.familia : []).filter(f => f.nombre).map(f => f.nombre + (f.parentesco ? ` (${f.parentesco})` : ''));
  const tutor = tutores[`${nivel}-${grupo}`];
  return { id: '', fecha: _hoyLocal(), hora: '', medio: 'Presencial', solicitadaPor: 'Familia',
    asistentes: [...fam, tutor ? `${tutor} (tutor/a)` : ''].filter(Boolean).join('; '), motivo: '', acuerdos: '', proximaCita: '', proximaHora: '', observaciones: '' };
}
function _fichaEntrevistasHTML(a) {
  const b = _fichaCtx.borrador;
  if (b) return _entFormularioHTML(b);
  const ents = _fichaEntrevistas(a).slice().sort((x, y) => (y.fecha || '').localeCompare(x.fecha || ''));
  const tarjetas = ents.map(e => `
    <article class="ent-tarjeta">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <strong>${_tEsc(fmtDate(e.fecha))}${e.hora ? ' · ' + _tEsc(e.hora) : ''}</strong>
        <span class="ent-chip">${_tEsc(e.medio || '—')}</span>
        <span style="font-size:11.5px;color:var(--text3)">Solicitada por: ${_tEsc(e.solicitadaPor || '—')}</span>
        <span style="flex:1"></span>
        <button class="btn btn-ghost btn-sm" onclick="_entEditar('${jsAttr(e.id)}')">✏ Editar</button>
        <button class="btn btn-ghost btn-sm" onclick="_entActa('${jsAttr(e.id)}')">🖨 Acta</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="_entBorrar('${jsAttr(e.id)}')" aria-label="Borrar esta entrevista" title="Borrar esta entrevista">🗑</button>
      </div>
      ${e.asistentes ? `<div class="ent-campo"><span>Asistentes</span>${_tEsc(e.asistentes)}</div>` : ''}
      ${e.motivo ? `<div class="ent-campo"><span>Motivo</span>${_tEsc(e.motivo)}</div>` : ''}
      ${e.acuerdos ? `<div class="ent-campo"><span>Acuerdos</span>${_tEsc(e.acuerdos)}</div>` : ''}
      ${e.proximaCita ? `<div class="ent-campo"><span>Próxima cita</span>${_tEsc(fmtDate(e.proximaCita))}${e.proximaHora ? ' · ' + _tEsc(e.proximaHora) : ''}</div>` : ''}
    </article>`).join('');
  return `
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px">
      <button class="btn btn-primary btn-sm" onclick="_entEditar('')">＋ Nueva entrevista</button>
      <span style="font-size:12px;color:var(--text2)">Reuniones con la familia: quién vino, qué se habló, qué se acordó y cuándo es la próxima.</span>
    </div>
    ${tarjetas || '<p class="ficha-vacio">Todavía no hay ninguna entrevista anotada.</p>'}`;
}
function _entFormularioHTML(b) {
  const campo = (k, etq, tipo, extra) => `<label class="ent-form-campo"><span>${etq}</span><input type="${tipo || 'text'}" value="${_tEsc(b[k])}" oninput="_entSet('${k}',this.value)" ${extra || ''}></label>`;
  const area = (k, etq, ph) => `<label class="ent-form-campo ancho"><span>${etq}</span><textarea rows="3" placeholder="${ph || ''}" oninput="_entSet('${k}',this.value)">${_tEsc(b[k])}</textarea></label>`;
  const sel = (k, etq, ops) => `<label class="ent-form-campo"><span>${etq}</span><select onchange="_entSet('${k}',this.value)">${ops.map(o => `<option ${o === b[k] ? 'selected' : ''}>${_tEsc(o)}</option>`).join('')}${ops.includes(b[k]) || !b[k] ? '' : `<option selected>${_tEsc(b[k])}</option>`}</select></label>`;
  return `
    <h3 style="margin-top:0">${b.id ? 'Editar entrevista' : 'Nueva entrevista'}</h3>
    <div class="ent-form">
      ${campo('fecha', 'Fecha', 'date', 'required')}
      ${campo('hora', 'Hora', 'time')}
      ${sel('medio', 'Medio', _ENT_MEDIOS)}
      ${sel('solicitadaPor', 'Solicitada por', _ENT_SOLICITA)}
      <label class="ent-form-campo ancho"><span>Asistentes</span><input type="text" value="${_tEsc(b.asistentes)}" placeholder="Familia, tutor/a, orientación…" oninput="_entSet('asistentes',this.value)"></label>
      ${area('motivo', 'Motivo', 'Por qué se reúnen…')}
      ${area('acuerdos', 'Acuerdos', 'Qué se acuerda y quién se encarga…')}
      ${campo('proximaCita', 'Próxima cita', 'date')}
      ${campo('proximaHora', 'Hora de la próxima cita', 'time')}
      ${area('observaciones', 'Observaciones', '')}
    </div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn btn-primary btn-sm" onclick="_entGuardar()">💾 Guardar entrevista</button>
      <button class="btn btn-ghost btn-sm" onclick="_fichaIr('borrador',null)">Cancelar</button>
    </div>`;
}
window._entSet = function(k, v) { if (_fichaCtx.borrador) _fichaCtx.borrador[k] = v; };
window._entEditar = function(id) {
  const a = _fichaAlumno(); if (!a) return;
  const e = id ? _fichaEntrevistas(a).find(x => x.id === id) : null;
  _fichaCtx.borrador = e ? JSON.parse(JSON.stringify(e)) : _entNueva(a);
  _fichaCtx.pestana = 'entrevistas';
  renderFichaAlumno();
  setTimeout(() => document.querySelector('#fichaBody .ent-form input')?.focus(), 20);
};
window._entGuardar = function() {
  const { nivel, grupo } = _fichaCtx;
  const a = _fichaAlumno(), b = _fichaCtx.borrador;
  if (!a || !b) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.fecha || '')) { mostrarAviso('Pon la fecha de la entrevista.'); return; }
  if (b.proximaCita && b.proximaCita < b.fecha) { mostrarAviso('La próxima cita no puede ser anterior a la entrevista.'); return; }
  _undoPush(nivel, grupo);
  const lista = _fichaEntrevistas(a);
  const limpio = {};
  ['fecha', 'hora', 'medio', 'solicitadaPor', 'asistentes', 'motivo', 'acuerdos', 'proximaCita', 'proximaHora', 'observaciones'].forEach(k => { limpio[k] = String(b[k] || '').trim(); });
  if (b.id) { const i = lista.findIndex(x => x.id === b.id); if (i >= 0) lista[i] = { ...lista[i], ...limpio }; }
  else lista.push({ id: 'ent' + Date.now() + Math.random().toString(36).slice(2, 6), ...limpio });
  _fichaCtx.borrador = null;
  markDirty();
  renderFichaAlumno();
  showToast('✅ Entrevista guardada');
};
window._entBorrar = async function(id) {
  const { nivel, grupo } = _fichaCtx;
  const a = _fichaAlumno(); if (!a) return;
  const e = _fichaEntrevistas(a).find(x => x.id === id); if (!e) return;
  if (!await confirmar(`¿Borrar la entrevista del ${fmtDate(e.fecha)}? Se puede deshacer con Ctrl+Z.`)) return;
  _undoPush(nivel, grupo);
  a.entrevistas = _fichaEntrevistas(a).filter(x => x.id !== id);
  markDirty();
  renderFichaAlumno();
};
// Acta de la entrevista, en la vista de documentos de la app (imprimir / PDF).
window._entActa = function(id) {
  const { nivel, grupo } = _fichaCtx;
  const a = _fichaAlumno(); if (!a) return;
  const e = _fichaEntrevistas(a).find(x => x.id === id); if (!e) return;
  const ies = document.getElementById('headerIesName')?.value || '';
  const fila = (t, v) => v ? `<tr><th>${t}</th><td>${_tEsc(v)}</td></tr>` : '';
  const win = _ventanaDoc();
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Acta de entrevista — ${_tEsc(a.nombre)}</title>
    <style>
      body{font-family:'Segoe UI',Arial,sans-serif;color:#222;margin:0}
      .page{max-width:780px;margin:0 auto;padding:30px}
      .toolbar{position:sticky;top:0;background:#1a1d27;padding:9px 18px;display:flex;justify-content:space-between;align-items:center}
      .toolbar span{color:#e8eaf2;font-size:13px;font-weight:600}
      .tbtn{padding:6px 14px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:600;background:#2563eb;color:#fff}
      h1{font-size:20px;margin:0 0 4px} .sub{color:#555;font-size:13px;margin-bottom:18px}
      table{width:100%;border-collapse:collapse;font-size:13px} th{width:170px;text-align:left;vertical-align:top;padding:8px 10px 8px 0;color:#444;border-bottom:1px solid #ddd}
      td{padding:8px 0;border-bottom:1px solid #ddd;white-space:pre-wrap;vertical-align:top}
      .firmas{display:flex;justify-content:space-between;gap:30px;margin-top:60px;font-size:13px}
      .firmas div{flex:1;border-top:1px solid #999;padding-top:6px;text-align:center}
      @media print{.no-print{display:none!important}}
    </style></head><body>
    <div class="toolbar no-print"><span>👪 Acta de entrevista — ${_tEsc(a.nombre)}</span><button class="tbtn" onclick="window.print()">🖨️ Imprimir / PDF</button></div>
    <div class="page">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#666">${_tEsc(ies)}</div>
      <h1>Acta de entrevista con la familia</h1>
      <div class="sub">${_tEsc(a.nombre)} — ${_tEsc(nivel)} · Grupo ${_tEsc(grupo)}</div>
      <table>
        ${fila('Fecha', fmtDate(e.fecha) + (e.hora ? ' · ' + e.hora : ''))}
        ${fila('Medio', e.medio)}
        ${fila('Solicitada por', e.solicitadaPor)}
        ${fila('Asistentes', e.asistentes)}
        ${fila('Motivo', e.motivo)}
        ${fila('Acuerdos', e.acuerdos)}
        ${fila('Próxima cita', e.proximaCita ? fmtDate(e.proximaCita) + (e.proximaHora ? ' · ' + e.proximaHora : '') : '')}
        ${fila('Observaciones', e.observaciones)}
      </table>
      <div class="firmas"><div>Fdo.: la familia</div><div>Fdo.: el tutor/a${tutores[`${nivel}-${grupo}`] ? '<br>' + _tEsc(tutores[`${nivel}-${grupo}`]) : ''}</div></div>
    </div></body></html>`);
  win.document.close();
};

function _fichaSeguimientos(a) {
  const { nivel, grupo, idx } = _fichaCtx;
  const regs = (a.seguimientos || []).slice().sort((x, y) => (y.fecha || '').localeCompare(x.fecha || ''));
  return `
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px">
      <button class="btn btn-primary btn-sm" onclick="_fichaAbrir(openSegFamilia)">📞 Abrir el seguimiento con familia</button>
      <span style="font-size:12px;color:var(--text2)">Lo que dice cada profesor/a antes de una reunión con la familia.</span>
    </div>
    ${regs.length ? `<ul class="ficha-lista">${regs.map(r => `<li style="display:flex;gap:10px;align-items:center">
      <span class="ficha-fecha">${_tEsc(fmtDate(r.fecha))}</span>
      <span style="flex:1">${(r.materias || []).length} materia${(r.materias || []).length === 1 ? '' : 's'}${r.observaciones ? ' · con observaciones' : ''}</span>
      <button class="btn btn-ghost btn-sm" onclick="printSegFamiliaRegistro('${jsAttr(nivel)}','${jsAttr(grupo)}',${idx},'${jsAttr(r.id)}')">🖨 Imprimir</button></li>`).join('')}</ul>`
      : '<p class="ficha-vacio">Todavía no hay ningún seguimiento guardado.</p>'}`;
}
