/* ============================================================================
   Gestor de Tutoría · Equipo docente
   tutoria/js/20-equipo-docente.js
   ============================================================================ */

if (!window._eqCtx) window._eqCtx = { nivel: '', grupo: '', seleccionados: new Set() };

document.getElementById('eqDocenteOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('eqDocenteOverlay')) closeEquipoDocente();
});

window.openEquipoDocente = function(nivel, grupo) {
  _eqCtx = { nivel, grupo, seleccionados: new Set() };
  renderEquipoDocenteBody();
  document.getElementById('eqDocenteOverlay').classList.add('open');
};
window.closeEquipoDocente = function() {
  document.getElementById('eqDocenteOverlay').classList.remove('open');
};

function _eqRefrescarSubtitulo(d, nivel, grupo) {
  const sub = document.getElementById('eqDocenteSubtitle');
  if (sub) sub.textContent = `${nivel} — Grupo ${grupo} · ${d.profesores.length} profesor${d.profesores.length !== 1 ? 'es' : ''} registrado${d.profesores.length !== 1 ? 's' : ''}`;
}

/* ---- El tutor/a, dentro del equipo docente ----
   Quien tutoriza el grupo también da una materia: se marca con la casilla «Tutor/a» en su fila
   (p.esTutor, solo uno por grupo) y no hace falta repetirlo. Queda enlazado con el tutor/a del grupo
   (tutores['nivel-grupo'], el que usan las actas y los informes): cambiar el nombre en la cabecera del
   grupo o en el equipo docente lo cambia en los dos sitios. */
function _eqClaveNombre(s) { return _tNorm(ftApellidosNombre(s)); }
function _eqTutorDe(nivel, grupo) {
  const d = (window._asistenciaData || {})[`${nivel}-${grupo}`];
  return d ? (d.profesores || []).find(p => p.esTutor) || null : null;
}
// Datos de antes: si nadie está marcado y el nombre del tutor/a coincide con alguien del equipo, se le marca
// (mejor la fila que tiene materia que una fila «Tutoría» suelta). Devuelve true si ha cambiado algo.
function _eqSincronizarTutor(nivel, grupo) {
  const d = _getAsistenciaData(nivel, grupo), t = String(tutores[`${nivel}-${grupo}`] || '').trim();
  if (!t || d.profesores.some(p => p.esTutor)) return false;
  const iguales = d.profesores.filter(p => p.nombre && _eqClaveNombre(p.nombre) === _eqClaveNombre(t));
  const elegido = iguales.find(p => (p.materia || '').trim() && _tNorm(p.materia) !== 'tutoria') || iguales[0];
  if (!elegido) return false;
  elegido.esTutor = true;
  return true;
}
// Filas que repiten al tutor/a: con su mismo nombre y sin materia o con «Tutoría».
function _eqDuplicadosTutor(d) {
  const tut = d.profesores.find(p => p.esTutor);
  if (!tut || !tut.nombre) return [];
  return d.profesores.filter(p => p !== tut && p.nombre && _eqClaveNombre(p.nombre) === _eqClaveNombre(tut.nombre) && (!(p.materia || '').trim() || _tNorm(p.materia) === 'tutoria'));
}
function _eqRefrescarCabeceraTutor(nivel, grupo) {
  const el = document.getElementById(`tutor-${nivel}-${grupo}`);
  if (el && document.activeElement !== el) el.value = tutores[`${nivel}-${grupo}`] || '';
}
// Desde la cabecera del grupo («Tutor/a del grupo»): también cambia el nombre del profesor/a marcado.
window._eqTutorDesdeCabecera = function(nivel, grupo, valor) {
  tutores[`${nivel}-${grupo}`] = valor;
  const p = _eqTutorDe(nivel, grupo);
  if (p) p.nombre = valor;
  markDirty();
};
window._eqMarcarTutor = function(id, marcado) {
  const { nivel, grupo } = _eqCtx, d = _getAsistenciaData(nivel, grupo);
  const p = d.profesores.find(x => x.id === id); if (!p) return;
  d.profesores.forEach(x => { if (x !== p) delete x.esTutor; });
  if (marcado) { p.esTutor = true; if ((p.nombre || '').trim()) tutores[`${nivel}-${grupo}`] = p.nombre; }
  else delete p.esTutor;
  markDirty(); renderEquipoDocenteBody(); _eqRefrescarCabeceraTutor(nivel, grupo);
  if (marcado) showToast(`✅ ${p.nombre || 'Este profesor/a'} es el tutor/a del grupo`);
};
// Une las filas repetidas del tutor/a en la suya, sin perder la asistencia a las sesiones ni el correo.
window._eqUnirTutor = function() {
  const { nivel, grupo } = _eqCtx, d = _getAsistenciaData(nivel, grupo);
  const tut = d.profesores.find(p => p.esTutor), dups = _eqDuplicadosTutor(d);
  if (!tut || !dups.length) return;
  const iT = d.profesores.indexOf(tut);
  dups.forEach(dup => {
    const i = d.profesores.indexOf(dup);
    ['eval1', 'eval2', 'eval3'].forEach(k => {
      const s = d.sesiones[k] || [], a = s[iT], b = s[i];
      if (a && b && (a.asistio === null || a.asistio === undefined) && b.asistio !== null && b.asistio !== undefined) { a.asistio = b.asistio; a.justificacion = b.justificacion || ''; }
    });
    if (!(tut.correo || '').trim() && (dup.correo || '').trim()) tut.correo = dup.correo;
  });
  dups.map(dup => d.profesores.indexOf(dup)).sort((x, y) => y - x).forEach(i => {
    d.profesores.splice(i, 1);
    ['eval1', 'eval2', 'eval3'].forEach(k => { if (d.sesiones[k]) d.sesiones[k].splice(i, 1); });
  });
  markDirty(); renderEquipoDocenteBody();
  showToast(`✅ ${tut.nombre} aparece ahora una sola vez, con su materia`);
};
// «Marcar al tutor/a»: si el tutor/a del grupo ya está en el equipo, se le marca; si no, se añade (falta su materia).
function _eqAsegurarTutor(nivel, grupo) {
  const t = String(tutores[`${nivel}-${grupo}`] || '').trim(), d = _getAsistenciaData(nivel, grupo);
  if (d.profesores.some(p => p.esTutor)) return 'ℹ El tutor/a ya está marcado en el equipo docente';
  if (!t) return 'ℹ Marca la casilla «Tutor/a» del profesor/a que tutoriza el grupo';
  if (_eqSincronizarTutor(nivel, grupo)) { markDirty(); return `✅ ${t} marcado/a como tutor/a`; }
  d.profesores.push({ id: 'prof' + Math.random().toString(36).slice(2, 9), nombre: t, materia: '', correo: '', esTutor: true });
  ['eval1', 'eval2', 'eval3'].forEach(k => { if (!d.sesiones[k]) d.sesiones[k] = []; d.sesiones[k].push({ asistio: null, justificacion: '' }); });
  markDirty();
  return `✅ ${t} añadido/a como tutor/a: escribe su materia`;
}

/* Los nombres del profesorado se escriben como en las actas: «Apellidos, Nombre».
   Si un nombre no lleva coma, se propone cómo quedaría (primera palabra = nombre). */
function _eqNecesitaFormato(nombre) {
  const t = String(nombre || '').trim();
  return !!t && !ftTieneFormatoApellidos(t) && t.split(/\s+/).length > 1;
}
function _eqHintHTML(p) {
  if (!_eqNecesitaFormato(p.nombre)) return '';
  const propuesta = ftApellidosNombre(p.nombre);
  return `<span style="color:var(--yellow)">Escríbelo como «Apellidos, Nombre».</span>
    <button type="button" class="btn btn-ghost btn-sm" style="padding:2px 8px;font-size:11px" onclick="_eqPasarFormato(['${jsAttr(p.id)}'])">↔ Cambiar a «${_tEsc(propuesta)}»</button>`;
}
window._eqPasarFormato = function(ids) {
  const d = _getAsistenciaData(_eqCtx.nivel, _eqCtx.grupo);
  let n = 0;
  d.profesores.forEach(p => { if (ids.includes(p.id) && _eqNecesitaFormato(p.nombre)) { p.nombre = ftApellidosNombre(p.nombre); n++; } });
  if (!n) return;
  markDirty();
  renderEquipoDocenteBody();
  showToast(n === 1 ? '✅ Nombre en formato «Apellidos, Nombre» (revisa si el nombre es compuesto)' : `✅ ${n} nombres en formato «Apellidos, Nombre» (revisa los nombres compuestos)`);
};
// Ordena el equipo docente por apellidos. Las sesiones de asistencia van por posición: se reordenan igual.
window._eqOrdenarApellidos = function() {
  const d = _getAsistenciaData(_eqCtx.nivel, _eqCtx.grupo);
  const orden = d.profesores.map((p, i) => i).sort((a, b) =>
    (d.profesores[a].nombre || '\uffff').localeCompare(d.profesores[b].nombre || '\uffff', 'es', { sensitivity: 'base' }));
  if (orden.every((v, i) => v === i)) { showToast('ℹ El equipo docente ya está ordenado por apellidos'); return; }
  d.profesores = orden.map(i => d.profesores[i]);
  ['eval1', 'eval2', 'eval3'].forEach(k => { const s = d.sesiones[k] || []; d.sesiones[k] = orden.map(i => s[i] || { asistio: null, justificacion: '' }); });
  markDirty();
  renderEquipoDocenteBody();
  showToast('🔤 Equipo docente ordenado por apellidos');
};

/* ---- La materia de cada profesor/a sale del catálogo (⚙ Materias) ----
   Así se llama igual que en las suspensas, las notas que llegan del Cuaderno y el acta. Lo que se escribió
   a mano antes y no está en el catálogo se marca, con la materia del catálogo que más se parece para
   cambiarla (también en las suspensas y los datos del alumnado del grupo) o la opción de añadirla. */
const _EQ_NUEVA = '__nueva__';
function _eqEsTutoria(m) { return _tNorm(m) === 'tutoria'; }
function _eqMateriaFuera(p, catalogo) {
  const m = String(p.materia || '').trim();
  return !!m && !_eqEsTutoria(m) && !_tMatEnCatalogo(m, catalogo);
}
function _eqOpcionesMateria(p, catalogo) {
  const m = String(p.materia || '').trim(), enCat = _tMatEnCatalogo(m, catalogo);
  const opc = (v, t, sel) => `<option value="${_tEsc(v)}"${sel ? ' selected' : ''}>${_tEsc(t)}</option>`;
  return opc('', '— Elige la materia —', !m) +
    (_eqMateriaFuera(p, catalogo) ? opc(m, `⚠ ${m} (no está en ⚙ Materias)`, true) : '') +
    catalogo.map(c => opc(c, c, c === enCat)).join('') +
    opc('Tutoría', 'Tutoría (sin otra materia)', _eqEsTutoria(m)) +
    opc(_EQ_NUEVA, '＋ Otra materia (se añade a ⚙ Materias)…', false);
}
function _eqMateriaHintHTML(p, catalogo, d) {
  if (!_eqMateriaFuera(p, catalogo)) return '';
  const { nivel, grupo } = _eqCtx, m = p.materia.trim(), base = _tSinSustituto(m);
  const prop = _tMateriaParecida(m, catalogo);
  const otro = prop ? d.profesores.find(x => x !== p && _tNorm(x.materia) === _tNorm(prop)) : null;
  const n = _tAlumnosConMateria(nivel, grupo, m);
  return `<div class="eq-mat-hint" role="status">
    <span style="flex:1 1 260px">«${_tEsc(m)}» no está en ⚙ Materias de ${_tEsc(nivel)}${n ? ` (la usan las suspensas o los datos de ${n} alumno${n === 1 ? '' : 's'})` : ''}.
      ${prop ? `¿Es <strong>«${_tEsc(prop)}»</strong>?${otro ? ` <span style="color:var(--text3)">(ya la tiene ${_tEsc(otro.nombre || 'otro profesor/a')}${_tEsSustituto(m) ? '' : '; si es otra materia, añádela'})</span>` : ''}` : 'Elige la equivalente en el desplegable o añádela al catálogo.'}</span>
    ${prop ? `<button type="button" class="btn btn-ghost btn-sm" onclick="_eqUsarMateria('${jsAttr(p.id)}','${jsAttr(prop)}')">✓ Usar «${_tEsc(prop)}»</button>` : ''}
    <button type="button" class="btn btn-ghost btn-sm" onclick="_eqAnadirMateriaCatalogo('${jsAttr(p.id)}')">＋ Añadir «${_tEsc(base)}» a ⚙ Materias</button>
  </div>`;
}
// Pone «destino» como materia del profesor/a. Si «mover», pasa también las suspensas y los datos del alumnado
// del grupo que estaban con el nombre antiguo. Devuelve false si no se ha podido (dos materias se mezclarían).
async function _eqCambiarMateria(p, destino, mover) {
  const { nivel, grupo } = _eqCtx, antes = String(p.materia || '').trim();
  if (mover && antes && _tNorm(antes) !== _tNorm(destino)) {
    const r = _tRenombrarMateriaGrupo(nivel, grupo, antes, destino);
    if (r.choque) {
      // No se mezclan: serían dos juegos de notas y faltas para la misma materia.
      const quien = r.choque.slice(0, 3).map(a => a.nombre).join('; ') + (r.choque.length > 3 ? '…' : '');
      const solo = await confirmar(`${r.choque.length === 1 ? 'Un alumno/a ya tiene' : r.choque.length + ' alumnos/as ya tienen'} datos de «${destino}» y también de «${antes}» (${quien}), así que sus datos no se pueden juntar sin perder unos u otros.

¿Cambiar solo la materia del profesor/a? Los datos de «${antes}» se quedan con ese nombre.` +
        (_tEsSustituto(antes) ? '' : ` Si en realidad son dos materias distintas, cancela y usa «＋ Añadir a ⚙ Materias».`), { ok: 'Cambiar solo el profesor/a', peligro: false });
      if (!solo) { renderEquipoDocenteBody(); return false; }
    }
    if (r.alumnos) _tRefrescarTablaGrupo(nivel, grupo);
  } else if (mover && antes && antes !== destino) {
    _tRenombrarMateriaGrupo(nivel, grupo, antes, destino);   // solo cambian mayúsculas o tildes
  }
  if (_tEsSustituto(antes)) p.sustituto = true;
  p.materia = destino;
  markDirty();
  renderEquipoDocenteBody();
  return true;
}
window._eqUsarMateria = async function(id, destino) {
  const p = _getAsistenciaData(_eqCtx.nivel, _eqCtx.grupo).profesores.find(x => x.id === id); if (!p) return;
  const antes = p.materia;
  if (await _eqCambiarMateria(p, destino, true)) showToast(`✅ «${antes}» es ahora «${destino}», también en las suspensas y los datos del alumnado`);
};
window._eqAnadirMateriaCatalogo = async function(id) {
  const { nivel, grupo } = _eqCtx, p = _getAsistenciaData(nivel, grupo).profesores.find(x => x.id === id); if (!p) return;
  const nombre = _tAnadirAlCatalogo(nivel, grupo, _tSinSustituto(p.materia));
  if (await _eqCambiarMateria(p, nombre, true)) showToast(`✅ «${nombre}» añadida a ⚙ Materias de ${nivel}`);
};
// El desplegable de la materia.
window._eqElegirMateria = async function(id, valor) {
  const { nivel, grupo } = _eqCtx, p = _getAsistenciaData(nivel, grupo).profesores.find(x => x.id === id); if (!p) return;
  if (valor === _EQ_NUEVA) {
    const t = await _tDialogo({ titulo: '＋ Otra materia', mensaje: `Nombre de la materia tal como quieres que salga en las actas. Se añade a ⚙ Materias de ${nivel} y queda disponible para todos sus grupos.`, entrada: true, valor: _eqMateriaFuera(p, getMateriasParaNivel(nivel, grupo) || []) ? _tSinSustituto(p.materia) : '', ok: 'Añadir', cancelar: 'Cancelar' });
    const nombre = String(t || '').trim();
    if (!nombre) { renderEquipoDocenteBody(); return; }
    valor = _tAnadirAlCatalogo(nivel, grupo, nombre);
    showToast(`✅ «${valor}» añadida a ⚙ Materias de ${nivel}`);
  }
  const antes = String(p.materia || '').trim();
  if (_tNorm(antes) === _tNorm(valor)) { if (antes !== valor) await _eqCambiarMateria(p, valor, true); else renderEquipoDocenteBody(); return; }
  // Si la de antes estaba escrita a mano (fuera del catálogo) y el alumnado tiene datos con ella, se ofrece pasarlos.
  let mover = false;
  if (antes && !_eqEsTutoria(antes) && !_tMatEnCatalogo(antes, getMateriasParaNivel(nivel, grupo) || []) && valor && !_eqEsTutoria(valor)) {
    const n = _tAlumnosConMateria(nivel, grupo, antes);
    if (n) mover = await confirmar(`${n === 1 ? 'Un alumno/a tiene' : n + ' alumnos/as tienen'} suspensas, notas o faltas con «${antes}». ¿Pasarlas a «${valor}»?\n\nSi no, se quedan con el nombre antiguo (se ven como «Fuera del catálogo»).`, { ok: 'Sí, pasarlas', peligro: false });
  }
  await _eqCambiarMateria(p, valor, mover);
};

function renderEquipoDocenteBody() {
  const { nivel, grupo } = _eqCtx;
  const d = _getAsistenciaData(nivel, grupo);
  if (_eqSincronizarTutor(nivel, grupo)) markDirty();
  const duplicados = _eqDuplicadosTutor(d);
  _eqRefrescarSubtitulo(d, nivel, grupo);

  const conCorreo = d.profesores.filter(p => (p.correo || '').trim());
  const nSel = _eqCtx.seleccionados.size;

  const catalogo = getMateriasParaNivel(nivel, grupo) || [];
  const fueraDeCatalogo = d.profesores.filter(p => _eqMateriaFuera(p, catalogo)).length;
  const rows = d.profesores.map(p => {
    const marcado = _eqCtx.seleccionados.has(p.id);
    return `
    <div class="asist-prof-row" style="align-items:center;gap:10px;padding:10px 0;">
      <input type="checkbox" style="width:16px;height:16px;flex-shrink:0" ${marcado ? 'checked' : ''}
        onchange="_eqToggleSeleccion('${p.id}',this.checked)" title="Seleccionar para enviar correo conjunto" aria-label="Seleccionar para enviar correo conjunto">
      <label class="eq-tutor${p.esTutor ? ' activo' : ''}" title="Es el tutor/a del grupo (solo uno)"><input type="checkbox" ${p.esTutor ? 'checked' : ''} onchange="_eqMarcarTutor('${jsAttr(p.id)}',this.checked)"> Tutor/a</label>
      <div style="flex:1.5 1 190px;min-width:0;display:flex;flex-direction:column;gap:3px;">
        <label style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;font-weight:700">Apellidos, Nombre</label>
        <input style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:7px 10px;color:var(--text);font-family:inherit;font-size:13px;font-weight:600;"
          placeholder="Apellidos, Nombre (p. ej. López Martín, Ana)" value="${_tEsc((p.nombre||''))}" aria-label="Apellidos, Nombre"
          oninput="_eqUpdateProf('${p.id}','nombre',this.value)">
        <div id="eqHint-${_tEsc(p.id)}" class="eq-hint" style="font-size:11px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">${_eqHintHTML(p)}</div>
      </div>
      <div style="flex:1 1 170px;min-width:0;display:flex;flex-direction:column;gap:3px;">
        <label for="eqMat-${_tEsc(p.id)}" style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;font-weight:700">Materia</label>
        <select id="eqMat-${_tEsc(p.id)}" class="eq-materia" style="width:100%;background:var(--bg);border:1px solid ${_eqMateriaFuera(p, catalogo) ? 'var(--yellow)' : 'var(--border)'};border-radius:7px;padding:7px 8px;color:var(--text);font-family:inherit;font-size:13px;"
          onchange="_eqElegirMateria('${jsAttr(p.id)}',this.value)">${_eqOpcionesMateria(p, catalogo)}</select>
        <label class="eq-sust" title="Sustituye al titular de esta materia: puede estar en el equipo a la vez que él o ella"><input type="checkbox" ${p.sustituto ? 'checked' : ''} onchange="_eqUpdateProf('${jsAttr(p.id)}','sustituto',this.checked)"> Sustituto/a</label>
      </div>
      <div style="flex:1 1 170px;min-width:0;display:flex;flex-direction:column;gap:3px;">
        <label style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;font-weight:700">Correo corporativo</label>
        <input type="email" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:7px 10px;color:var(--text);font-family:inherit;font-size:13px;"
          placeholder="nombre@gva.es" value="${_tEsc((p.correo||''))}"
          oninput="_eqUpdateProf('${p.id}','correo',this.value)">
      </div>
      <div style="display:flex;flex-direction:column;gap:3px;padding-top:16px;">
        <button class="btn btn-ghost btn-sm" onclick="_eqEnviarA(['${p.id}'])" title="Enviar correo a esta persona">✉</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:3px;padding-top:16px;">
        <button class="btn btn-ghost btn-sm" style="color:var(--red);border-color:rgba(247,110,110,0.3)" onclick="_eqDelProf('${p.id}')" title="Eliminar">🗑</button>
      </div>
    </div>
    ${_eqMateriaHintHTML(p, catalogo, d)}
    <div style="height:1px;background:var(--border);opacity:0.5"></div>`;
  }).join('');

  document.getElementById('eqDocenteBody').innerHTML = `
    <div style="font-size:12px;color:var(--text2);margin-bottom:16px;line-height:1.6;background:var(--surface2);border-radius:8px;padding:10px 14px;border:1px solid var(--border)">
      📋 Equipo docente de <strong>${_tEsc(nivel)} ${_tEsc(grupo)}</strong>. Se usa aquí y en "👥 Asistencia sesión" para pasar lista en las juntas de evaluación.
      Marca <strong>Tutor/a</strong> en el profesor/a que tutoriza el grupo: no hace falta añadirlo otra vez, y su nombre es el que sale como tutor/a en las actas y los informes.
      La <strong>materia</strong> se elige de <strong>⚙ Materias</strong> (el catálogo del nivel): así casa con las suspensas, las notas y el acta. Si falta alguna, «＋ Otra materia» la añade al catálogo.
    </div>
    ${fueraDeCatalogo ? `<div role="status" style="font-size:12.5px;margin-bottom:12px;padding:9px 12px;border-radius:8px;border:1px solid rgba(245,158,11,.45);background:rgba(245,158,11,.1)">
      ⚠️ ${fueraDeCatalogo === 1 ? 'Una materia está escrita' : fueraDeCatalogo + ' materias están escritas'} con un nombre que no está en ⚙ Materias de ${_tEsc(nivel)}: sus suspensas y notas no casan con el resto de la app. Debajo de cada una tienes cómo ponerla al día.</div>` : ''}
    ${duplicados.length ? `<div role="status" style="font-size:12.5px;margin-bottom:12px;padding:9px 12px;border-radius:8px;border:1px solid rgba(245,158,11,.45);background:rgba(245,158,11,.1);display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <span style="flex:1">⚠️ ${_tEsc(duplicados[0].nombre)} aparece ${duplicados.length + 1} veces (como tutor/a y con su materia).</span>
      <button class="btn btn-ghost btn-sm" onclick="_eqUnirTutor()">🔗 Dejarlo una sola vez</button></div>` : ''}
    <div id="eqDocenteList">${rows || `
      <div style="text-align:center;padding:28px;color:var(--text3);font-size:13px">
        <div style="font-size:28px;margin-bottom:8px">👥</div>
        Sin profesores registrados. Añade el equipo docente.
      </div>`}
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid var(--border);flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" onclick="_eqAddProf()">＋ Añadir profesor/a</button>
      <button class="btn btn-ghost btn-sm" onclick="_eqImportTutor()" title="Marca como tutor/a al profesor/a que tiene el nombre puesto en la cabecera del grupo">👤 Marcar al tutor/a del grupo</button>
      <button class="btn btn-ghost btn-sm" ${d.profesores.length > 1 ? '' : 'disabled style="opacity:.4"'} onclick="_eqOrdenarApellidos()">🔤 Ordenar por apellidos</button>
      ${d.profesores.some(p => _eqNecesitaFormato(p.nombre)) ? `<button class="btn btn-ghost btn-sm" onclick="_eqPasarFormato(_getAsistenciaData(_eqCtx.nivel,_eqCtx.grupo).profesores.map(p=>p.id))">↔ Pasar todos a «Apellidos, Nombre»</button>` : ''}
      <span style="flex:1"></span>
      <button class="btn btn-ghost btn-sm" ${nSel?'':'disabled style="opacity:.4"'} onclick="_eqEnviarA([..._eqCtx.seleccionados])">
        ✉ Enviar a seleccionados (${nSel})
      </button>
      <button class="btn btn-ghost btn-sm" ${conCorreo.length?'':'disabled style="opacity:.4"'} onclick="_eqEnviarATodos()">
        ✉ Enviar a todo el equipo (${conCorreo.length})
      </button>
    </div>
  `;
}

window._eqEnviarA = function(ids) {
  const { nivel, grupo } = _eqCtx;
  const d = _getAsistenciaData(nivel, grupo);
  const correos = d.profesores.filter(p => ids.includes(p.id)).map(p => (p.correo||'').trim()).filter(Boolean);
  if (!correos.length) { showToast('ℹ No hay correo registrado para esta selección'); return; }
  window.location.href = 'mailto:' + correos.map(encodeURIComponent).join(',');
};
window._eqEnviarATodos = function() {
  const { nivel, grupo } = _eqCtx;
  const d = _getAsistenciaData(nivel, grupo);
  _eqEnviarA(d.profesores.map(p => p.id));
};

window._eqToggleSeleccion = function(id, marcado) {
  if (marcado) _eqCtx.seleccionados.add(id); else _eqCtx.seleccionados.delete(id);
  renderEquipoDocenteBody();
};
window._eqUpdateProf = function(id, field, val) {
  const { nivel, grupo } = _eqCtx;
  const d = _getAsistenciaData(nivel, grupo);
  const p = d.profesores.find(x => x.id === id);
  if (p && field === 'sustituto') { if (val) p.sustituto = true; else delete p.sustituto; markDirty(); return; }
  if (p) p[field] = val;
  if (p && field === 'nombre' && p.esTutor) { tutores[`${nivel}-${grupo}`] = val; _eqRefrescarCabeceraTutor(nivel, grupo); }
  markDirty();
  _eqRefrescarSubtitulo(d, nivel, grupo);
  // Aviso de formato al momento, sin redibujar (no se pierde el cursor del campo).
  if (p && field === 'nombre') { const h = document.getElementById('eqHint-' + id); if (h) h.innerHTML = _eqHintHTML(p); }
};
window._eqAddProf = function() {
  const { nivel, grupo } = _eqCtx;
  const d = _getAsistenciaData(nivel, grupo);
  d.profesores.push({ id: 'prof' + Math.random().toString(36).slice(2, 9), nombre: '', materia: '', correo: '' });
  ['eval1','eval2','eval3'].forEach(k => {
    if (!d.sesiones[k]) d.sesiones[k] = [];
    d.sesiones[k].push({ asistio: null, justificacion: '' });
  });
  markDirty();
  renderEquipoDocenteBody();
};
window._eqDelProf = function(id) {
  const { nivel, grupo } = _eqCtx;
  const d = _getAsistenciaData(nivel, grupo);
  const idx = d.profesores.findIndex(p => p.id === id);
  if (idx === -1) return;
  d.profesores.splice(idx, 1);
  ['eval1','eval2','eval3'].forEach(k => {
    if (d.sesiones[k]) d.sesiones[k].splice(idx, 1);
  });
  _eqCtx.seleccionados.delete(id);
  markDirty();
  renderEquipoDocenteBody();
};
window._eqImportTutor = function() {
  const { nivel, grupo } = _eqCtx;
  showToast(_eqAsegurarTutor(nivel, grupo));
  renderEquipoDocenteBody();
};
