/* ============================================================================
   Gestor de Tutoría · 📬 Información del equipo docente
   tutoria/js/23-informacion-equipo.js
   ============================================================================

   Reúne lo que ha llegado de cada materia desde los Cuadernos del profesorado
   (archivos «👥 Para la tutoría» o «📥 Del Cuaderno» en este navegador), que se
   guarda en alumno.porMateria[materia] = {profesor, generado, notas, faltas,
   convivencia, comentarios} (ver js/comun/formato-tutoria.js).

   - «Por materia»: qué materias han enviado datos de cada evaluación y cuáles
     faltan, con un correo ya redactado para recordárselo a quien falte.
   - «Por alumno/a»: notas, faltas, convivencia y comentarios de cada materia,
     y un botón para llevarlo al seguimiento con la familia.
   Solo lee los datos: no cambia nada salvo al rellenar un seguimiento.
*/

let _infCtx = { nivel: '', grupo: '', periodo: '1', vista: 'materias', alumno: 0 };
const _INF_PERIODOS = [['1', 'I Evaluación'], ['2', 'II Evaluación'], ['3', 'III Evaluación'], ['final', 'Final']];

// Clave de faltas/convivencia para un periodo: la final usa lo acumulado en el curso.
function _infClaveRegistro(periodo) { return periodo === 'final' ? 'curso' : periodo; }

function _infAlumnos(nivel, grupo) { return (data[nivel] && data[nivel][grupo]) || []; }

// Materias del grupo: las de la lista del nivel y las que hayan llegado con otro nombre.
function _infMaterias(nivel, grupo) {
  const lista = [...(getMateriasParaNivel(nivel, grupo) || [])];
  _infAlumnos(nivel, grupo).forEach(a => Object.keys(a.porMateria || {}).forEach(m => {
    if (!lista.some(x => _tNorm(x) === _tNorm(m))) lista.push(m);
  }));
  return lista;
}
function _infDeMateria(a, materia) {
  const pm = a.porMateria || {};
  const k = Object.keys(pm).find(m => _tNorm(m) === _tNorm(materia));
  return k ? pm[k] : null;
}

/* Resumen de una materia en un periodo: si ha llegado algo y cuándo, quién la da,
   y cuántos suspensos, faltas sin justificar, AC y partes suma el grupo. */
function _infResumenMateria(nivel, grupo, materia, periodo) {
  const r = { conDatos: 0, conNota: 0, introducido: 0, suspensos: 0, injust: 0, ac: 0, pa: 0, generado: '', profesor: '', aMano: false };
  const kReg = _infClaveRegistro(periodo);
  _infAlumnos(nivel, grupo).forEach(a => {
    const d = _infDeMateria(a, materia); if (!d) return;
    r.conDatos++;
    if (d.generado > r.generado) { r.generado = d.generado; r.profesor = d.profesor || r.profesor; }
    const n = d.notas && d.notas[periodo];
    if (typeof n === 'number') { r.conNota++; if (n < 5) r.suspensos++; }
    else if ((d.suspensa || {})[periodo]) r.suspensos++;   // introducido a mano: «suspensa» sin nota
    if ((d.manual || {})[periodo]) { r.introducido++; r.aMano = true; }
    const f = d.faltas && d.faltas[kReg]; if (f) r.injust += f.injustificadas || 0;
    const c = d.convivencia && d.convivencia[kReg]; if (c) { r.ac += c.ac || 0; r.pa += c.pa || 0; }
  });
  r.hayDatos = r.conNota > 0 || r.introducido > 0;   // ha llegado (o se ha introducido) algo de este periodo
  if (!r.profesor) {
    const p = ((window._asistenciaData || {})[`${nivel}-${grupo}`] || { profesores: [] }).profesores.find(x => _tNorm(x.materia) === _tNorm(materia));
    if (p) r.profesor = p.nombre || '';
  }
  return r;
}

window.openInformacionEquipo = function(nivel, grupo, vista, alumnoIdx) {
  // Periodo propuesto: el último con notas recibidas.
  let periodo = '1';
  _INF_PERIODOS.forEach(([k]) => { if (_infAlumnos(nivel, grupo).some(a => Object.values(a.porMateria || {}).some(d => d.notas && typeof d.notas[k] === 'number'))) periodo = k; });
  _infCtx = { nivel, grupo, periodo, vista: vista || 'materias', alumno: alumnoIdx || 0 };
  let ov = document.getElementById('infEquipoOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'infEquipoOverlay';
    ov.className = 'modal-overlay';
    ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="infEquipoTitulo" style="width:980px;max-width:96vw;max-height:90vh;display:flex;flex-direction:column">
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">
        <div style="flex:1"><div class="modal-title" id="infEquipoTitulo" style="margin-bottom:2px">📬 Información del equipo docente</div>
        <div id="infEquipoSub" style="font-size:12px;color:var(--text2)"></div></div>
        <button class="btn btn-ghost btn-sm" onclick="closeInformacionEquipo()">✕ Cerrar</button>
      </div>
      <div id="infEquipoBody" class="modal-scroll"></div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) closeInformacionEquipo(); });
    ov.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeInformacionEquipo(); } });
  }
  ov.classList.add('open');
  renderInformacionEquipo();
  setTimeout(() => ov.querySelector('button')?.focus(), 30);
};
window.closeInformacionEquipo = function() {
  document.getElementById('infEquipoOverlay')?.classList.remove('open');
};
window._infSet = function(campo, valor) { _infCtx[campo] = valor; renderInformacionEquipo(); };

function renderInformacionEquipo() {
  const { nivel, grupo, periodo, vista } = _infCtx;
  const sub = document.getElementById('infEquipoSub');
  if (sub) sub.textContent = `${nivel} — Grupo ${grupo}`;
  const boton = (activo, txt, js) => `<button class="btn ${activo ? 'btn-primary' : 'btn-ghost'} btn-sm" onclick="${js}" aria-pressed="${activo}">${txt}</button>`;
  const cabecera = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
      ${boton(vista === 'materias', '📚 Por materia', "_infSet('vista','materias')")}
      ${boton(vista === 'alumno', '🧑‍🎓 Por alumno/a', "_infSet('vista','alumno')")}
      <span style="flex:1"></span>
      <label style="font-size:12px;color:var(--text2)">Evaluación
        <select class="tdlg-in" style="width:auto;margin:0 0 0 6px;padding:5px 8px;font-size:12.5px" onchange="_infSet('periodo',this.value)">
          ${_INF_PERIODOS.map(([k, t]) => `<option value="${k}" ${k === periodo ? 'selected' : ''}>${t}</option>`).join('')}
        </select></label>
    </div>
    <div style="font-size:12px;color:var(--text2);background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;margin-bottom:12px;line-height:1.55">
      Llega del Cuaderno de cada profesor/a: con su archivo «👥 Para la tutoría» (Gestión del Curso → Importar suspensos del Cuaderno, admite varios a la vez)
      o, para tu materia, con «📥 Del Cuaderno» en este mismo navegador.
    </div>`;
  document.getElementById('infEquipoBody').innerHTML = cabecera + (vista === 'alumno' ? _infVistaAlumno() : _infVistaMaterias());
  _tA11y(document.getElementById('infEquipoBody'));
}

function _infVistaMaterias() {
  const { nivel, grupo, periodo } = _infCtx;
  const total = _infAlumnos(nivel, grupo).length;
  const nombreP = (_INF_PERIODOS.find(x => x[0] === periodo) || [])[1];
  const filas = _infMaterias(nivel, grupo).map(m => {
    const r = _infResumenMateria(nivel, grupo, m, periodo);
    const llegado = r.hayDatos;
    const estado = llegado
      ? `<span style="color:var(--green);font-weight:600">${r.aMano ? '✍ Introducido a mano' : '✓ Recibido'}</span><br><span style="font-size:11px;color:var(--text3)">${_tEsc(new Date(r.generado).toLocaleDateString('es-ES'))}</span>`
      : (r.conDatos ? `<span style="color:var(--yellow);font-weight:600">Sin notas de ${_tEsc(nombreP)}</span>` : `<span style="color:var(--text3)">— Falta</span>`);
    return `<tr data-materia="${_tEsc(m)}" data-recibido="${llegado ? 1 : 0}">
      <td style="font-weight:600">${_tEsc(m)}</td>
      <td>${_tEsc(r.profesor) || '<span style="color:var(--text3)">—</span>'}</td>
      <td>${estado}</td>
      <td style="text-align:center">${llegado ? `${Math.max(r.conNota, r.introducido)}/${total}` : '—'}</td>
      <td style="text-align:center;${r.suspensos ? 'color:var(--red);font-weight:700' : ''}">${llegado ? r.suspensos : '—'}</td>
      <td style="text-align:center">${r.conDatos ? r.injust : '—'}</td>
      <td style="text-align:center">${r.conDatos ? r.ac : '—'}</td>
      <td style="text-align:center">${r.conDatos ? r.pa : '—'}</td>
      <td style="text-align:center"><button class="btn btn-ghost btn-sm" style="padding:3px 8px" onclick="closeInformacionEquipo();openDatosMateria('${jsAttr(nivel)}','${jsAttr(grupo)}','${periodo === 'final' ? '3' : periodo}','${jsAttr(m)}')" title="Introducir o corregir a mano los datos de ${_tEsc(m)}" aria-label="Introducir a mano los datos de ${_tEsc(m)}">✍️</button></td>
    </tr>`;
  });
  const faltan = _infMaterias(nivel, grupo).filter(m => !_infResumenMateria(nivel, grupo, m, periodo).hayDatos);
  return `
    <div style="overflow-x:auto"><table class="inf-tabla" style="width:100%;border-collapse:collapse;font-size:12.5px">
      <thead><tr style="text-align:left;color:var(--text3);font-size:10.5px;text-transform:uppercase;letter-spacing:.4px">
        <th scope="col">Materia</th><th scope="col">Profesor/a</th><th scope="col">${_tEsc(nombreP)}</th><th scope="col" style="text-align:center">Con datos</th>
        <th scope="col" style="text-align:center">Suspensos</th><th scope="col" style="text-align:center" title="Faltas sin justificar">F. sin just.</th>
        <th scope="col" style="text-align:center" title="Faltas de actitud y comportamiento">AC</th><th scope="col" style="text-align:center">Partes</th><th scope="col"><span class="sr-only">A mano</span></th></tr></thead>
      <tbody>${filas.join('') || '<tr><td colspan="9" style="color:var(--text3);padding:14px 0">No hay materias para este nivel (⚙ Materias).</td></tr>'}</tbody>
    </table></div>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:14px">
      <button class="btn btn-ghost btn-sm" onclick="_infRecordar()" ${faltan.length ? '' : 'disabled style="opacity:.45"'}>✉ Recordar a quien falta (${faltan.length})</button>
      <button class="btn btn-ghost btn-sm" onclick="closeInformacionEquipo();importarDelCuaderno()">📥 Cargar archivos «Para la tutoría»</button>
      <button class="btn btn-ghost btn-sm" onclick="closeInformacionEquipo();openDatosMateria('${jsAttr(nivel)}','${jsAttr(grupo)}','${periodo === 'final' ? '3' : periodo}')" title="Para quien no usa el Cuaderno: lo que te mande por correo o en un Excel">✍️ Introducir a mano</button>
      <span style="font-size:11.5px;color:var(--text3)">Las faltas y la convivencia son las registradas por cada profesor/a en su materia${periodo === 'final' ? ' en todo el curso' : ''}.</span>
    </div>`;
}

/* Correo ya redactado al profesorado de las materias que aún no han enviado sus datos.
   Las direcciones salen del equipo docente (👨‍🏫); si falta alguna, se avisa. */
function _infCorreoRecordatorio(nivel, grupo, periodo) {
  const faltan = _infMaterias(nivel, grupo).filter(m => !_infResumenMateria(nivel, grupo, m, periodo).hayDatos);
  const equipo = ((window._asistenciaData || {})[`${nivel}-${grupo}`] || { profesores: [] }).profesores;
  const correos = [], sinCorreo = [];
  faltan.forEach(m => {
    const p = equipo.find(x => _tNorm(x.materia) === _tNorm(m));
    if (p && String(p.correo || '').trim()) { if (!correos.includes(p.correo.trim())) correos.push(p.correo.trim()); }
    else sinCorreo.push(m);
  });
  if (!correos.length) return { url: '', correos, sinCorreo };
  const nombreP = (_INF_PERIODOS.find(x => x[0] === periodo) || [])[1];
  const asunto = `${nivel} ${grupo} · Datos de la ${nombreP} para la tutoría`;
  const cuerpo = `Hola:\n\nPara preparar la ${nombreP} de ${nivel} ${grupo}, ¿me puedes enviar el archivo «Para la tutoría» de tu materia?\n\n` +
    `En el Cuaderno del profesor: grupo ${nivel} ${grupo} → Resultados → «👥 Para la tutoría». Lleva las notas, las faltas, la convivencia y los comentarios de evaluación.\n\nGracias.`;
  return { url: 'mailto:' + correos.map(encodeURIComponent).join(',') + '?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(cuerpo), correos, sinCorreo };
}
window._infRecordar = function() {
  const { nivel, grupo, periodo } = _infCtx;
  const r = _infCorreoRecordatorio(nivel, grupo, periodo);
  if (!r.url) {
    mostrarAviso(`No hay correo en el equipo docente para: ${r.sinCorreo.join(', ')}.\n\nAñádelo en «👨‍🏫 Equipo docente» (menú «Más» del grupo).`);
    return;
  }
  if (r.sinCorreo.length) showToast(`ℹ Sin correo en el equipo docente: ${r.sinCorreo.join(', ')}`);
  window.location.href = r.url;
};

function _infTextoFaltas(f) { return f ? `${f.injustificadas || 0} sin justificar · ${f.justificadas || 0} justificadas · ${f.retrasos || 0} retrasos` : ''; }
function _infTextoConv(c) { return c ? `${c.ac || 0} AC · ${c.rc || 0} reconocimientos · ${c.pa || 0} partes` : ''; }

function _infVistaAlumno() {
  const { nivel, grupo, periodo } = _infCtx;
  const alumnos = _infAlumnos(nivel, grupo);
  if (!alumnos.length) return '<div style="color:var(--text3);padding:14px 0">No hay alumnado en este grupo.</div>';
  if (_infCtx.alumno >= alumnos.length) _infCtx.alumno = 0;
  const a = alumnos[_infCtx.alumno];
  const kReg = _infClaveRegistro(periodo);
  const filas = _infMaterias(nivel, grupo).map(m => {
    const d = _infDeMateria(a, m);
    if (!d) return `<tr><td style="font-weight:600">${_tEsc(m)}</td><td colspan="4" style="color:var(--text3)">— Sin datos de esta materia</td></tr>`;
    const n = d.notas && d.notas[periodo];
    return `<tr>
      <td style="font-weight:600">${_tEsc(m)}<br><span style="font-size:11px;font-weight:400;color:var(--text3)">${_tEsc(d.profesor || '')}</span></td>
      <td style="text-align:center;font-weight:700;${typeof n === 'number' && n < 5 ? 'color:var(--red)' : ''}">${typeof n === 'number' ? _tEsc(String(n).replace('.', ',')) : '—'}</td>
      <td>${_tEsc(_infTextoFaltas(d.faltas && d.faltas[kReg])) || '<span style="color:var(--text3)">—</span>'}</td>
      <td>${_tEsc(_infTextoConv(d.convivencia && d.convivencia[kReg])) || '<span style="color:var(--text3)">—</span>'}</td>
      <td style="white-space:pre-wrap">${_tEsc((d.comentarios && d.comentarios[periodo]) || '') || '<span style="color:var(--text3)">—</span>'}</td>
    </tr>`;
  }).join('');
  return `
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
      <button class="btn btn-ghost btn-sm" onclick="_infSet('alumno',${Math.max(0, _infCtx.alumno - 1)})" ${_infCtx.alumno ? '' : 'disabled'} aria-label="Alumno/a anterior">◀</button>
      <select class="tdlg-in" style="width:auto;flex:1;min-width:200px;margin:0" aria-label="Alumno/a" onchange="_infSet('alumno',+this.value)">
        ${alumnos.map((x, i) => `<option value="${i}" ${i === _infCtx.alumno ? 'selected' : ''}>${_tEsc(x.nombre || 'Sin nombre')}</option>`).join('')}
      </select>
      <button class="btn btn-ghost btn-sm" onclick="_infSet('alumno',${Math.min(alumnos.length - 1, _infCtx.alumno + 1)})" ${_infCtx.alumno < alumnos.length - 1 ? '' : 'disabled'} aria-label="Alumno/a siguiente">▶</button>
      <button class="btn btn-primary btn-sm" onclick="_infAlSeguimiento()">📞 Llevar al seguimiento con familia</button>
    </div>
    <div style="overflow-x:auto"><table class="inf-tabla" style="width:100%;border-collapse:collapse;font-size:12.5px">
      <thead><tr style="text-align:left;color:var(--text3);font-size:10.5px;text-transform:uppercase;letter-spacing:.4px">
        <th scope="col">Materia</th><th scope="col" style="text-align:center">Nota</th><th scope="col">Faltas</th><th scope="col">Convivencia</th><th scope="col">Comentario</th></tr></thead>
      <tbody>${filas}</tbody>
    </table></div>`;
}

window._infAlSeguimiento = function() {
  const { nivel, grupo, alumno } = _infCtx;
  closeInformacionEquipo();
  openSegFamilia(nivel, grupo, alumno);
  _segRellenarDelEquipo();
};

/* Rellena el borrador del seguimiento con familia con lo recibido de cada materia.
   Solo escribe en las casillas VACÍAS (no borra lo que ya hayas escrito) y añade
   las materias que hayan enviado datos y no estén en la lista. */
window._segRellenarDelEquipo = function() {
  const { nivel, grupo, idx, draft } = _segCtx;
  const a = data[nivel]?.[grupo]?.[idx];
  if (!a || !draft) return;
  const pm = a.porMateria || {};
  if (!Object.keys(pm).length) { showToast('ℹ Aún no ha llegado información del equipo docente para este alumno/a'); return; }
  let rellenas = 0;
  Object.keys(pm).forEach(m => {
    const d = pm[m];
    let fila = draft.materias.find(x => _tNorm(x.nombre) === _tNorm(m));
    if (!fila) { fila = { nombre: m, trabajo: '', examenes: '', comportamiento: '' }; draft.materias.push(fila); }
    const notas = ['1', '2', '3', 'final'].filter(k => typeof (d.notas || {})[k] === 'number')
      .map(k => `${k === 'final' ? 'Final' : ['', 'I', 'II', 'III'][k] + ' Ev.'}: ${String(d.notas[k]).replace('.', ',')}`);
    const ultimoCom = ['final', '3', '2', '1'].map(k => (d.comentarios || {})[k]).find(Boolean) || '';
    const f = (d.faltas || {}).curso, c = (d.convivencia || {}).curso;
    const comp = [f ? `Faltas sin justificar: ${f.injustificadas || 0} · retrasos: ${f.retrasos || 0}` : '', c ? `AC: ${c.ac || 0} · reconocimientos: ${c.rc || 0} · partes: ${c.pa || 0}` : ''].filter(Boolean).join(' · ');
    let cambio = false;
    if (!fila.examenes && notas.length) { fila.examenes = 'Notas — ' + notas.join(' · '); cambio = true; }
    if (!fila.trabajo && ultimoCom) { fila.trabajo = ultimoCom; cambio = true; }
    if (!fila.comportamiento && comp) { fila.comportamiento = comp + ' (en el curso)'; cambio = true; }
    if (cambio) rellenas++;
  });
  renderSegFamiliaBody();
  showToast(rellenas ? `✅ ${rellenas} materia${rellenas === 1 ? '' : 's'} rellenada${rellenas === 1 ? '' : 's'} con lo recibido. Revísalo antes de guardar.` : 'ℹ No había casillas vacías que rellenar');
};
