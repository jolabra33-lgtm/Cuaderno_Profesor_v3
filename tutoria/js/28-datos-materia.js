/* ============================================================================
   Gestor de Tutoría · ✍️ Datos de una materia (introducidos a mano)
   tutoria/js/28-datos-materia.js
   ============================================================================

   Para el profesorado que no usa el Cuaderno: el tutor/a mete lo que le mandan
   por correo o en un Excel. Una tabla por grupo, evaluación y materia, con el
   alumnado en filas: nota (o solo «suspensa»), faltas sin justificar,
   justificadas, retrasos, AC, partes y comentario. Se rellena con el teclado
   (Intro baja a la fila siguiente) y admite pegar columnas copiadas de Excel.

   Al guardar va al mismo sitio que los archivos «Para la tutoría», así que lo
   usan igual 📬, la sesión de evaluación, el informe para el equipo, la ficha y
   las alertas:
     alumno.porMateria[materia]: notas, faltas, convivencia y comentarios de esa
       evaluación (se conservan las demás), suspensa[periodo] y manual[periodo];
     las materias suspensas de la evaluación (pendientes1 / pendientes2 / pendientesIII);
     el profesor/a, al equipo docente del grupo.
   Se deshace con Ctrl+Z.
*/

const _DM_COLS = [
  { k: 'nota', etq: 'Nota', tipo: 'nota', ancho: 70, ayuda: 'De 0 a 10 (vale la coma). Vacía si solo sabes si suspende.' },
  { k: 'fi', etq: 'F. sin just.', tipo: 'n', ancho: 92 },
  { k: 'fj', etq: 'F. just.', tipo: 'n', ancho: 70 },
  { k: 're', etq: 'Retrasos', tipo: 'n', ancho: 70 },
  { k: 'ac', etq: 'AC', tipo: 'n', ancho: 56 },
  { k: 'pa', etq: 'Partes', tipo: 'n', ancho: 60 },
  { k: 'com', etq: 'Comentario', tipo: 't', ancho: 0 },
];
const _DM_PEND = { '1': ['pendientes1', 'eval1'], '2': ['pendientes2', 'eval2'], '3': ['pendientesIII', 'eval3'] };
// Periodos en los que se guarda la nota: en la 3.ª, como III evaluación y como final.
const _DM_PERIODOS_NOTA = { '1': ['1'], '2': ['2'], '3': ['3', 'final'] };

let _dmCtx = { nivel: '', grupo: '', k: '1', materia: '', profesor: '', filas: [], cambios: false };

function _dmAlumnos() { return data[_dmCtx.nivel]?.[_dmCtx.grupo] || []; }
// Materias para el desplegable, en un orden fijo: primero las del grupo (equipo docente, suspensas
// o con datos), en el orden del catálogo del nivel; después, las demás del nivel.
function _dmMateriasGrupos(nivel, grupo, k) {
  const catalogo = getMateriasParaNivel(nivel, grupo) || [];
  const pos = m => { const i = catalogo.findIndex(x => _tNorm(x) === _tNorm(m)); return i < 0 ? 999 : i; };
  const lista = () => { const out = []; out.add = m => { m = String(m || '').trim(); if (m && _tNorm(m) !== 'tutoria' && !out.some(x => _tNorm(x) === _tNorm(m))) out.push(m); }; return out; };
  // ⚙ Materias manda: solo se eligen materias del catálogo (con su nombre de allí). Las que el grupo tiene con
  // otro nombre van aparte («fuera»): se pueden ver y pasar a una del catálogo, pero no se guarda con ellas.
  const delGrupo = lista(), otras = lista(), fuera = lista();
  const usadas = lista();
  _ieMateriasGrupo(nivel, grupo, k).forEach(usadas.add);
  (data[nivel]?.[grupo] || []).forEach(a => Object.keys(a.porMateria || {}).forEach(usadas.add));
  usadas.forEach(m => { const c = _tMatEnCatalogo(m, catalogo); if (c) delGrupo.add(c); else fuera.add(m); });
  delGrupo.sort((x, y) => pos(x) - pos(y) || x.localeCompare(y, 'es'));
  catalogo.forEach(m => { if (!delGrupo.some(x => _tNorm(x) === _tNorm(m))) otras.add(m); });
  return { delGrupo: [...delGrupo], otras: [...otras], fuera: [...fuera].sort((x, y) => x.localeCompare(y, 'es')) };
}
function _dmEntrada(a, materia) {
  const pm = a.porMateria || {};
  const clave = Object.keys(pm).find(m => _tNorm(m) === _tNorm(materia));
  return clave ? pm[clave] : null;
}
function _dmTexto(v) { return v === undefined || v === null ? '' : String(v); }
function _dmNotaTexto(n) { return typeof n === 'number' ? String(n).replace('.', ',') : ''; }
function _dmLeerNota(t) {
  t = String(t || '').trim().replace(',', '.');
  if (!t) return { ok: true, v: null };
  const n = Number(t);
  return (isFinite(n) && n >= 0 && n <= 10) ? { ok: true, v: Math.round(n * 100) / 100 } : { ok: false };
}
function _dmLeerCuenta(t) {
  t = String(t || '').trim();
  if (!t) return { ok: true, v: 0 };
  const n = Number(t);
  return (Number.isInteger(n) && n >= 0 && n <= 9999) ? { ok: true, v: n } : { ok: false };
}

// Carga en la tabla lo que ya hay de esa materia y evaluación (de un archivo del Cuaderno o de antes).
function _dmCargarFilas() {
  const { k, materia } = _dmCtx, [pend] = _DM_PEND[k], pn = _DM_PERIODOS_NOTA[k];
  _dmCtx.filas = _dmAlumnos().map(a => {
    const d = materia ? _dmEntrada(a, materia) : null;
    const nota = d ? pn.map(p => (d.notas || {})[p]).find(n => typeof n === 'number') : undefined;
    const f = (d && (d.faltas || {})[k]) || {}, c = (d && (d.convivencia || {})[k]) || {};
    const nc = !!materia && _tNoCursa(a, materia);
    const susp = !nc && (typeof nota === 'number' ? nota < 5 : (!!materia && ((a[pend] || []).some(m => _tNorm(m) === _tNorm(materia)) || !!(d && (d.suspensa || {})[pn[pn.length - 1]]))));
    return { nc, nota: _dmNotaTexto(nota), susp, fi: f.injustificadas ? String(f.injustificadas) : '', fj: f.justificadas ? String(f.justificadas) : '', re: f.retrasos ? String(f.retrasos) : '',
      ac: c.ac ? String(c.ac) : '', pa: c.pa ? String(c.pa) : '', com: d ? _dmTexto(pn.map(p => (d.comentarios || {})[p]).find(Boolean)) : '' };
  });
  if (!_dmCtx.profesor) {
    const p = _tProfesorDeMateria(_getAsistenciaData(_dmCtx.nivel, _dmCtx.grupo).profesores, materia);
    const d = _dmAlumnos().map(a => _dmEntrada(a, materia)).find(Boolean);
    _dmCtx.profesor = p ? p.nombre : (d && d.profesor) || '';
  }
  _dmCtx.cambios = false;
}

window.openDatosMateria = async function(nivel, grupo, k, materia) {
  if (!data[nivel]?.[grupo]) return;
  k = String(k || (typeof _sesEvalPropuesta === 'function' ? _sesEvalPropuesta(nivel) : '1'));
  if (!materia) {
    // Propuesta: la primera materia del equipo docente que aún no tiene datos de esta evaluación.
    const periodo = _DM_PERIODOS_NOTA[k][_DM_PERIODOS_NOTA[k].length - 1];
    const cat = getMateriasParaNivel(nivel, grupo) || [];
    const equipo = _getAsistenciaData(nivel, grupo).profesores.map(p => _tMatEnCatalogo(p.materia, cat)).filter(Boolean);
    materia = equipo.find(m => !_infResumenMateria(nivel, grupo, m, periodo).hayDatos) || equipo[0] || '';
  }
  let solo = false; try { solo = localStorage.getItem('tut_dm_solo') === '1'; } catch (e) {}
  _dmCtx = { nivel, grupo, k, materia, profesor: '', filas: [], cambios: false, solo };
  _dmCargarFilas();
  let ov = document.getElementById('datosMateriaOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'datosMateriaOverlay';
    ov.className = 'modal-overlay';
    ov.innerHTML = `<div class="modal dm-modal" role="dialog" aria-modal="true" aria-labelledby="dmTitulo"><div id="dmCab"></div><div id="dmBody" class="modal-scroll"></div><div id="dmPie"></div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) closeDatosMateria(); });
    ov.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.querySelector('.tdlg-ov')) { e.stopPropagation(); closeDatosMateria(); } });
  }
  ov.classList.add('open');
  renderDatosMateria();
  setTimeout(() => document.querySelector('#dmBody input[data-c="nota"]')?.focus(), 30);
};
// Si hay cambios sin guardar, pregunta antes de perderlos.
async function _dmPuedeSalir() {
  if (!_dmCtx.cambios) return true;
  return await confirmar('Hay datos sin guardar en esta tabla. ¿Salir sin guardarlos?', { ok: 'Salir sin guardar', peligro: true });
}
window.closeDatosMateria = async function() {
  if (!(await _dmPuedeSalir())) return;
  document.getElementById('datosMateriaOverlay')?.classList.remove('open');
  renderAll();
};
window._dmCambiar = async function(campo, valor) {
  if (!(await _dmPuedeSalir())) { renderDatosMateria(); return; }
  _dmCtx[campo] = String(valor);
  if (campo === 'materia') _dmCtx.profesor = '';
  _dmCargarFilas();
  renderDatosMateria();
};

// Desplegable de materias: «➕ Otra materia…» muestra un cuadro para escribirla.
window._dmElegirMateria = function(v) {
  if (v !== '__otra') { _dmCambiar('materia', v); return; }
  // La que se escriba se añade a ⚙ Materias (ver _dmOtraMateria).
  const sel = document.getElementById('dmMateriaSel'), otra = document.getElementById('dmMateriaOtra');
  if (sel) sel.value = _dmCtx.materia || '';
  if (otra) { otra.hidden = false; otra.focus(); }
};
// «➕ Otra materia»: lo escrito se añade a ⚙ Materias del nivel y se elige.
window._dmOtraMateria = function(t) {
  t = String(t || '').trim(); if (!t) return;
  const m = _tAnadirAlCatalogo(_dmCtx.nivel, _dmCtx.grupo, t);
  showToast(`✅ «${m}» está en ⚙ Materias de ${_dmCtx.nivel}`);
  _dmCambiar('materia', m);
};
/* Una materia que el grupo tiene con un nombre que no está en ⚙ Materias: se puede ver, y pasarla a la del
   catálogo (también en el alumnado y el equipo docente del grupo) o añadirla al catálogo. */
function _dmAvisoFueraHTML(materia) {
  const cat = getMateriasParaNivel(_dmCtx.nivel, _dmCtx.grupo) || [], prop = _tMateriaParecida(materia, cat);
  return `<div class="eq-mat-hint" role="status"><span style="flex:1 1 260px">⚠ «${_tEsc(materia)}» no está en ⚙ Materias de ${_tEsc(_dmCtx.nivel)}: puedes ver sus datos, pero para guardar hay que pasarla a una materia del catálogo${prop ? ` (¿es <strong>«${_tEsc(prop)}»</strong>?)` : ''}.</span>
    ${prop ? `<button type="button" class="btn btn-ghost btn-sm" onclick="_dmPasarMateria('${jsAttr(prop)}')">✓ Pasar a «${_tEsc(prop)}»</button>` : ''}
    <button type="button" class="btn btn-ghost btn-sm" onclick="_dmPasarMateria(null)">＋ Añadir «${_tEsc(_tSinSustituto(materia))}» a ⚙ Materias</button></div>`;
}
window._dmPasarMateria = async function(destino) {
  if (!(await _dmPuedeSalir())) return;
  const { nivel, grupo } = _dmCtx, antes = _dmCtx.materia;
  destino = destino || _tAnadirAlCatalogo(nivel, grupo, _tSinSustituto(antes));
  const r = _tRenombrarMateriaGrupo(nivel, grupo, antes, destino);
  if (r.choque) { mostrarAviso(`No se ha cambiado: ${r.choque.length === 1 ? 'un alumno/a ya tiene' : r.choque.length + ' alumnos/as ya tienen'} datos de «${destino}» y también de «${antes}» (${r.choque.slice(0, 3).map(a => a.nombre).join('; ')}), y se mezclarían. Revisa cuál es cuál.`); return; }
  _getAsistenciaData(nivel, grupo).profesores.forEach(p => { if (_tNorm(p.materia) === _tNorm(antes)) { if (_tEsSustituto(p.materia)) p.sustituto = true; p.materia = destino; } });
  markDirty();
  _tRefrescarTablaGrupo(nivel, grupo);
  showToast(`✅ «${antes}» es ahora «${destino}» en ${nivel} ${grupo}`);
  _dmCtx.cambios = false;
  await _dmCambiar('materia', destino);
};
function _dmPeriodo(k) { return _DM_PERIODOS_NOTA[k][_DM_PERIODOS_NOTA[k].length - 1]; }
// La materia que va después de la actual (en el orden del desplegable de antes de guardar): la siguiente
// del grupo que aún no tiene datos de esta evaluación. Sin materias del grupo, la siguiente del nivel sin datos.
function _dmSiguienteMateria(g) {
  const { nivel, grupo, k, materia } = _dmCtx, mats = g.delGrupo.concat(g.otras);
  const i = mats.findIndex(m => _tNorm(m) === _tNorm(materia));
  const orden = mats.slice(i + 1).concat(mats.slice(0, Math.max(i, 0))).filter(m => _tNorm(m) !== _tNorm(materia));
  const sinDatos = m => !_infResumenMateria(nivel, grupo, m, _dmPeriodo(k)).hayDatos;
  const delGrupo = orden.filter(m => g.delGrupo.some(x => _tNorm(x) === _tNorm(m)));
  return delGrupo.length ? (delGrupo.find(sinDatos) || '') : (orden.find(sinDatos) || '');
}
window._dmGuardarYSiguiente = async function() {
  const g = _dmMateriasGrupos(_dmCtx.nivel, _dmCtx.grupo, _dmCtx.k);
  if (!guardarDatosMateria()) return;
  const sig = _dmSiguienteMateria(g);
  if (sig) await _dmCambiar('materia', sig);
  else showToast(`✅ Todas las materias del grupo tienen ya datos de la ${FT_NOMBRE_EVAL[_dmCtx.k]} · 📑 ya puedes sacar el acta de calificaciones`);
  setTimeout(() => document.querySelector('#dmBody input[data-c="nota"]')?.focus(), 30);
};

function renderDatosMateria() {
  const { nivel, grupo, k, materia, profesor, filas } = _dmCtx;
  const grupos = _dmMateriasGrupos(nivel, grupo, k);
  if (materia && !grupos.delGrupo.concat(grupos.otras, grupos.fuera).some(m => _tNorm(m) === _tNorm(materia))) grupos.fuera.push(materia);
  const fueraDeCatalogo = !!materia && !_tMatEnCatalogo(materia, getMateriasParaNivel(nivel, grupo) || []);
  const conDatos = m => _infResumenMateria(nivel, grupo, m, _dmPeriodo(k)).hayDatos;
  const alumnos = _dmAlumnos();
  document.getElementById('dmCab').innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px">
      <div style="flex:1"><div class="modal-title" id="dmTitulo" style="margin-bottom:2px">✍️ Datos de una materia</div>
        <div style="font-size:12px;color:var(--text2)">${_tEsc(nivel)} — Grupo ${_tEsc(grupo)} · para el profesorado que no usa el Cuaderno: copia aquí lo que te mande por correo o en un Excel.</div></div>
      <button class="btn btn-ghost btn-sm" onclick="closeDatosMateria()">✕ Cerrar</button>
    </div>
    <div class="dm-selectores">
      <label class="ent-form-campo"><span>Evaluación</span><select onchange="_dmCambiar('k',this.value)">${['1', '2', '3'].map(x => `<option value="${x}" ${x === k ? 'selected' : ''}>${FT_NOMBRE_EVAL[x]}</option>`).join('')}</select></label>
      <label class="ent-form-campo"><span>Materia <small style="font-weight:400;text-transform:none;letter-spacing:0">(✓ ya tiene datos)</small></span>
        <select id="dmMateriaSel" onchange="_dmElegirMateria(this.value)">
          ${materia ? '' : '<option value="" selected>— Elige la materia —</option>'}
          ${[['Materias del grupo', grupos.delGrupo], ['Otras materias del nivel', grupos.otras]].filter(([, l]) => l.length).map(([etq, l]) => `<optgroup label="${etq}">${l.map(m =>
            `<option value="${_tEsc(m)}" ${_tNorm(m) === _tNorm(materia) ? 'selected' : ''}>${conDatos(m) ? '✓ ' : ''}${_tEsc(m)}</option>`).join('')}</optgroup>`).join('')}
          ${grupos.fuera.length ? `<optgroup label="⚠ Fuera de ⚙ Materias (solo para consultar)">${grupos.fuera.map(m =>
            `<option value="${_tEsc(m)}" ${_tNorm(m) === _tNorm(materia) ? 'selected' : ''}>⚠ ${_tEsc(m)}</option>`).join('')}</optgroup>` : ''}
          <option value="__otra">➕ Otra materia (se añade a ⚙ Materias)…</option>
        </select>
        <input id="dmMateriaOtra" hidden placeholder="Escribe la materia y pulsa Intro" style="margin-top:4px" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}" onchange="_dmOtraMateria(this.value)"></label>
      <label class="ent-form-campo"><span>Profesor/a (Apellidos, Nombre)</span><input value="${_tEsc(profesor)}" placeholder="Se añade al equipo docente" oninput="_dmCtx.profesor=this.value;_dmCtx.cambios=true"></label>
    </div>`;
  const cab = _DM_COLS.map(c => `<th scope="col"${c.ancho ? ` style="width:${c.ancho}px"` : ''}${c.ayuda ? ` title="${_tEsc(c.ayuda)}"` : ''}>${c.etq}</th>`).join('');
  const celda = (i, c) => {
    const v = filas[i][c.k];
    const dis = filas[i].nc ? ' disabled' : '';
    if (c.tipo === 't') return `<td><input class="dm-in dm-com" data-r="${i}" data-c="${c.k}" value="${_tEsc(v)}"${dis} aria-label="Comentario de ${_tEsc(alumnos[i].nombre)}"></td>`;
    return `<td><input class="dm-in" data-r="${i}" data-c="${c.k}" value="${_tEsc(v)}"${dis} inputmode="${c.tipo === 'nota' ? 'decimal' : 'numeric'}" aria-label="${_tEsc(c.etq)} de ${_tEsc(alumnos[i].nombre)}"></td>`;
  };
  document.getElementById('dmBody').innerHTML = !materia
    ? '<p class="ficha-vacio">Elige la materia.</p>'
    : (fueraDeCatalogo ? _dmAvisoFueraHTML(materia) : '') + `<p style="font-size:12px;color:var(--text2);margin:0 0 6px">⌨️ Intro baja a la fila siguiente. 📋 Puedes copiar una columna (o varias) de Excel y pegarla en la primera casilla: se reparte hacia abajo y hacia la derecha, saltándose a quien no la cursa. La casilla <strong>Susp.</strong> se marca sola con una nota menor que 5; sin nota, márcala tú. En optativas, Inglés o Francés y Religión, marca <strong>No la cursa</strong> (se recuerda en las demás evaluaciones).</p>
      <div class="dm-acciones">
        <label><input type="checkbox" id="dmSolo" ${_dmCtx.solo ? 'checked' : ''}> Ver solo a quien la cursa</label>
        <button class="btn btn-ghost btn-sm" id="dmBlancoNC" title="Para optativas: después de meter las notas de quien la cursa, marca al resto">🚫 Quien está en blanco no la cursa</button>
      </div>
      <div style="overflow-x:auto"><table class="inf-tabla dm-tabla ${_dmCtx.solo ? 'dm-solo' : ''}">
        <thead><tr><th scope="col">Alumno/a</th><th scope="col" style="width:66px;white-space:normal;line-height:1.15" title="El alumno/a no está matriculado en esta materia">No la cursa</th>${cab}<th scope="col" style="width:50px">Susp.</th></tr></thead>
        <tbody>${alumnos.map((a, i) => `<tr class="${filas[i].susp ? 'dm-susp' : ''} ${filas[i].nc ? 'dm-nc' : ''}">
          <th scope="row">${_tEsc(a.nombre || 'Sin nombre')}</th>
          <td style="text-align:center"><input type="checkbox" data-r="${i}" data-c="nc" ${filas[i].nc ? 'checked' : ''} aria-label="${_tEsc(a.nombre)} no cursa ${_tEsc(materia)}"></td>
          ${_DM_COLS.map(c => celda(i, c)).join('')}
          <td style="text-align:center"><input type="checkbox" data-r="${i}" data-c="susp" ${filas[i].susp ? 'checked' : ''} ${filas[i].nc ? 'disabled' : ''} aria-label="Suspende ${_tEsc(materia)}: ${_tEsc(a.nombre)}"></td>
        </tr>`).join('')}</tbody></table></div>`;
  document.getElementById('dmPie').innerHTML = `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px">
      <span id="dmResumen" style="font-size:12.5px;color:var(--text2)">${materia ? _dmResumen() : ''}</span>
      <span style="flex:1"></span>
      <button class="btn btn-ghost btn-sm" onclick="abrirActaCalificaciones('${jsAttr(nivel)}','${jsAttr(grupo)}','${k}')" title="Todas las notas del grupo en una hoja, como el acta de Itaca">📑 Acta de calificaciones</button>
      <button class="btn btn-ghost btn-sm" onclick="closeDatosMateria()">Cerrar</button>
      <button class="btn btn-ghost btn-sm" onclick="_dmGuardarYSiguiente()" ${materia ? '' : 'disabled'} title="Guarda esta materia y abre la siguiente que aún no tiene datos">💾 Guardar y siguiente ▶</button>
      <button class="btn btn-primary btn-sm" onclick="guardarDatosMateria()" ${materia ? '' : 'disabled'}>💾 Guardar ${_tEsc(materia || '')}</button>
    </div>`;
  _dmEnlazar();
  _tA11y(document.getElementById('datosMateriaOverlay'));
}

function _dmPintarFila(i) {
  const tr = document.querySelector(`#dmBody input[data-r="${i}"]`)?.closest('tr'); if (!tr) return;
  const f = _dmCtx.filas[i];
  tr.classList.toggle('dm-susp', !!f.susp);
  tr.classList.toggle('dm-nc', !!f.nc);
  const cb = tr.querySelector('input[data-c="susp"]'); if (cb) { cb.checked = !!f.susp; cb.disabled = !!f.nc; }
  const nc = tr.querySelector('input[data-c="nc"]'); if (nc) nc.checked = !!f.nc;
  _DM_COLS.forEach(c => { const inp = tr.querySelector(`input[data-c="${c.k}"]`); if (!inp) return; inp.disabled = !!f.nc; if (document.activeElement !== inp) inp.value = f[c.k]; });
  const r = document.getElementById('dmResumen');
  if (r) r.textContent = _dmResumen();
}
function _dmResumen() {
  const fs = _dmCtx.filas, n = fs.filter(x => x.susp).length, nc = fs.filter(x => x.nc).length;
  return `${n} suspenso${n === 1 ? '' : 's'} de ${fs.length - nc}${nc ? ` que la cursan (${nc} no la cursa${nc === 1 ? '' : 'n'})` : ''}`;
}
// Filas en las que se escribe (las de quien no la cursa se saltan al pegar y con Intro).
function _dmFilasActivas() { return _dmCtx.filas.map((f, i) => f.nc ? -1 : i).filter(i => i >= 0); }
function _dmMarcarNoCursa(i, nc) {
  const f = _dmCtx.filas[i]; if (!f) return;
  f.nc = !!nc;
  if (f.nc) { f.susp = false; ['nota', 'fi', 'fj', 're', 'ac', 'pa', 'com'].forEach(c => { f[c] = ''; }); }
  _dmCtx.cambios = true;
  _dmPintarFila(i);
}
function _dmPonerValor(i, col, valor) {
  const f = _dmCtx.filas[i]; if (!f) return;
  f[col] = valor;
  if (col === 'nota') { const n = _dmLeerNota(valor); if (n.ok && n.v !== null) f.susp = n.v < 5; }
  _dmCtx.cambios = true;
}
function _dmEnlazar() {
  const body = document.getElementById('dmBody');
  body.querySelectorAll('input.dm-in').forEach(inp => {
    inp.addEventListener('input', () => { _dmPonerValor(+inp.dataset.r, inp.dataset.c, inp.value); inp.classList.remove('dm-mal'); _dmPintarFila(+inp.dataset.r); });
    inp.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const act = _dmFilasActivas(), pos = act.indexOf(+inp.dataset.r);
      const r = act[pos + (e.shiftKey ? -1 : 1)];
      if (r !== undefined) body.querySelector(`input[data-r="${r}"][data-c="${inp.dataset.c}"]`)?.focus();
    });
    // Pegar desde Excel: filas separadas por saltos de línea y columnas por tabuladores.
    inp.addEventListener('paste', e => {
      const t = (e.clipboardData || window.clipboardData)?.getData('text') || '';
      if (!/[\t\n]/.test(t.replace(/\r?\n$/, ''))) return;   // un solo valor: pegado normal
      e.preventDefault();
      const filas = t.replace(/\r/g, '').replace(/\n$/, '').split('\n').map(l => l.split('\t'));
      const c0 = _DM_COLS.findIndex(c => c.k === inp.dataset.c);
      const destino = _dmFilasActivas().filter(i => i >= +inp.dataset.r).slice(0, filas.length);
      filas.forEach((celdas, dr) => celdas.forEach((v, dc) => {
        const col = _DM_COLS[c0 + dc]; if (!col || destino[dr] === undefined) return;
        _dmPonerValor(destino[dr], col.k, v.trim());
      }));
      destino.forEach(_dmPintarFila);
      body.querySelectorAll('input.dm-in').forEach(x => { const f = _dmCtx.filas[+x.dataset.r]; if (f) x.value = f[x.dataset.c]; });
      showToast(`📋 Pegado en ${destino.length} filas${filas.length > destino.length ? ` (sobran ${filas.length - destino.length})` : ''}`);
    });
  });
  body.querySelectorAll('input[data-c="susp"]').forEach(cb => cb.addEventListener('change', () => {
    const f = _dmCtx.filas[+cb.dataset.r]; f.susp = cb.checked; _dmCtx.cambios = true; _dmPintarFila(+cb.dataset.r);
  }));
  body.querySelectorAll('input[data-c="nc"]').forEach(cb => cb.addEventListener('change', () => _dmMarcarNoCursa(+cb.dataset.r, cb.checked)));
  const solo = document.getElementById('dmSolo');
  if (solo) solo.addEventListener('change', () => {
    _dmCtx.solo = solo.checked;
    try { localStorage.setItem('tut_dm_solo', solo.checked ? '1' : '0'); } catch (e) {}
    body.querySelector('.dm-tabla')?.classList.toggle('dm-solo', solo.checked);
  });
  const blanco = document.getElementById('dmBlancoNC');
  if (blanco) blanco.addEventListener('click', () => {
    const vacia = f => !f.nc && !f.susp && ['nota', 'fi', 'fj', 're', 'ac', 'pa', 'com'].every(c => !String(f[c] || '').trim());
    const idx = _dmCtx.filas.map((f, i) => vacia(f) ? i : -1).filter(i => i >= 0);
    if (!idx.length) { showToast('ℹ No hay nadie en blanco'); return; }
    if (idx.length === _dmCtx.filas.length) { mostrarAviso('Están todos en blanco: mete primero las notas de quien la cursa.'); return; }
    idx.forEach(i => _dmMarcarNoCursa(i, true));
    showToast(`🚫 ${idx.length} marcado${idx.length === 1 ? '' : 's'} como «no la cursa» · guarda para conservarlo`);
  });
}

window.guardarDatosMateria = function() {
  const { nivel, grupo, k } = _dmCtx, materia = String(_dmCtx.materia || '').trim();
  if (!materia) { mostrarAviso('Elige la materia.'); return false; }
  if (!_tMatEnCatalogo(materia, getMateriasParaNivel(nivel, grupo) || [])) {
    mostrarAviso(`«${materia}» no está en ⚙ Materias de ${nivel}, así que no se guarda con ese nombre: las suspensas no saldrían en su sitio en la columna de pendientes. Pásala a una materia del catálogo (o añádela) con los botones de arriba.`);
    return false;
  }
  // Validación: notas de 0 a 10 y números enteros; las casillas mal escritas se marcan.
  let malas = 0;
  document.querySelectorAll('#dmBody input.dm-in').forEach(inp => {
    const col = _DM_COLS.find(c => c.k === inp.dataset.c); if (!col || col.tipo === 't' || inp.disabled) return;
    const ok = (col.tipo === 'nota' ? _dmLeerNota(inp.value) : _dmLeerCuenta(inp.value)).ok;
    inp.classList.toggle('dm-mal', !ok); if (!ok) malas++;
  });
  if (malas) { mostrarAviso(`Hay ${malas} casilla${malas === 1 ? '' : 's'} con un valor que no vale (en rojo): la nota va de 0 a 10 y las faltas, AC y partes son números enteros.`); return false; }
  _undoPush(nivel, grupo);
  const [campo, evalCampo] = _DM_PEND[k], pn = _DM_PERIODOS_NOTA[k];
  const prof = ftApellidosNombre(_dmCtx.profesor);
  let cambiosSusp = 0;
  _dmAlumnos().forEach((a, i) => {
    const f = _dmCtx.filas[i]; if (!f) return;
    const existe = Object.keys(a.porMateria || {}).find(m => _tNorm(m) === _tNorm(materia));
    // No la cursa: se apunta para todo el curso y se quita lo que hubiera de esa materia.
    _tPonerNoCursa(a, materia, !!f.nc);
    if (f.nc) {
      if (existe) delete a.porMateria[existe];
      if (_tAjustarSuspensa(a, campo, evalCampo, existe || materia, false)) cambiosSusp++;
      return;
    }
    const nota = _dmLeerNota(f.nota).v;
    const algo = nota !== null || f.susp || f.com.trim() || ['fi', 'fj', 're', 'ac', 'pa'].some(c => _dmLeerCuenta(f[c]).v > 0);
    if (!existe && !algo) { if (_tAjustarSuspensa(a, campo, evalCampo, materia, false)) cambiosSusp++; return; }   // en blanco: no se crea nada
    if (!a.porMateria || typeof a.porMateria !== 'object') a.porMateria = {};
    const clave = existe || materia;
    const d = a.porMateria[clave] || (a.porMateria[clave] = { origen: 'manual', notas: {}, faltas: {}, convivencia: {}, comentarios: {} });
    ['notas', 'faltas', 'convivencia', 'comentarios', 'suspensa', 'manual'].forEach(x => { if (!d[x] || typeof d[x] !== 'object') d[x] = {}; });
    pn.forEach(p => {
      if (nota === null) delete d.notas[p]; else d.notas[p] = nota;
      if (f.com.trim()) d.comentarios[p] = f.com.trim(); else delete d.comentarios[p];
      d.suspensa[p] = !!f.susp;
      if (nota !== null || f.susp) d.manual[p] = true; else delete d.manual[p];   // calificado a mano en este periodo
    });
    d.faltas[k] = { injustificadas: _dmLeerCuenta(f.fi).v, justificadas: _dmLeerCuenta(f.fj).v, retrasos: _dmLeerCuenta(f.re).v };
    d.convivencia[k] = { ac: _dmLeerCuenta(f.ac).v, rc: (d.convivencia[k] || {}).rc || 0, pa: _dmLeerCuenta(f.pa).v };
    // Lo de todo el curso: en lo introducido a mano, la suma de las tres evaluaciones (lo del Cuaderno se deja como venga).
    if (d.origen === 'manual') {
      const suma = (obj, campos) => campos.reduce((o, c) => (o[c] = ['1', '2', '3'].reduce((s, x) => s + (((obj || {})[x] || {})[c] || 0), 0), o), {});
      d.faltas.curso = suma(d.faltas, ['injustificadas', 'justificadas', 'retrasos']);
      d.convivencia.curso = suma(d.convivencia, ['ac', 'rc', 'pa']);
    }
    if (prof) d.profesor = prof;
    d.generado = new Date().toISOString();
    if (_tAjustarSuspensa(a, campo, evalCampo, clave, !!f.susp)) cambiosSusp++;
  });
  const profAccion = prof ? _tAplicarProfesor(nivel, grupo, materia, prof).accion : 'nada';
  _dmCtx.cambios = false;
  markDirty();
  if (GRUPOS_POR_NIVEL[currentNivel] && currentNivel === nivel && currentGrupos[nivel] === grupo) { updateTable(nivel, grupo); updateStats(nivel, grupo); updateStats2(nivel, grupo); }
  showToast(`✅ ${materia} · ${FT_NOMBRE_EVAL[k]} guardada${cambiosSusp ? ` · ${cambiosSusp} cambio${cambiosSusp === 1 ? '' : 's'} en suspensas` : ''}${profAccion === 'nuevo' ? ' · profesor/a añadido al equipo docente' : ''} · Ctrl+Z deshace`);
  renderDatosMateria();
  return true;
};
