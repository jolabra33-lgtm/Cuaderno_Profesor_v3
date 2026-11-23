/* ============================================================================
   Gestor de Tutoría · 📋 Acta de evaluación (una sola, desde la sesión de evaluación)
   tutoria/js/30-acta-evaluacion.js
   ============================================================================

   Todo se apunta en «🎓 Sesión de evaluación» (26-sesion-evaluacion.js) y el acta sale de ahí, con el diseño
   del antiguo Acta Oficial y todo lo que pedían el Acta Oficial y las actas del Calendario:
     asistencia del profesorado (la que se marca en la sesión), resultados de cada alumno/a con su propuesta y
     sus acuerdos, resumen de propuestas, análisis de resultados, evolución, casos particulares, repetidores,
     programas de atención a la diversidad (Nivel III) y FPB, Plan de Repetición, Plan de Refuerzo, agrupación
     para el próximo curso (o la extraordinaria en Bachillerato), pendientes de cursos anteriores, NESE y
     Compensatoria, faltas y convivencia, análisis general del grupo, acuerdos y firmas.
   No se edita en el documento: para cambiar algo se vuelve a la sesión (así nunca hay dos versiones).

   Dónde se guarda lo que solo es del acta (sin claves nuevas en el estado):
     _asistenciaData['nivel-grupo'].actasSesion[k] += {fecha, jefeEstudios, director, analisis:{…}}
     alumno.sesionEval[k] += {casos:[…], casoMaterias, valoracionRepeticion, programa, programaMotivo,
                              fpbFamilia, medidasNese, pendAnt:{materia:{estado,nota,motivo}}, motivoNoPromocion, agrupacion}
   Lo que se guardó antes en el Acta Oficial (acuerdos, firmas, decisiones sobre pendientes) pasa a la sesión la
   primera vez; las actas del Calendario guardadas se pueden seguir consultando (solo lectura).
*/

const _AE_NOMBRE = { '1': 'Primera Evaluación', '2': 'Segunda Evaluación', '3': 'Evaluación Final' };
const _AE_CORTO = { '1': 'I', '2': 'II', '3': 'Final' };
const _AE_CASOS = [
  ['comportamiento', 'Comportamiento / Convivencia'],
  ['asistencia', 'Asistencia / Retrasos'],
  ['diversidad', 'Atención a la diversidad e inclusión (NESE, dificultades de aprendizaje, incorporación tardía, altas capacidades…)'],
];
const _AE_PROGRAMAS = ['PAC / Refuerzo', 'Diversificación 3º', 'Diversificación 4º', 'FPB'];
const _AE_ANALISIS = [
  ['comportamiento', 'Comportamiento general'],
  ['asistencia', 'Faltas de asistencia / Retrasos'],
  ['participacion', 'Participación en clase'],
  ['trabajo', 'Hábito de trabajo / Realización de tareas'],
  ['cohesion', 'Cohesión de grupo'],
  ['otros', 'Otros'],
];
const _AE_ESTADOS_PEND = ['En proceso de recuperación', 'Recuperada', 'No recuperada'];

// Lo del acta de cada alumno/a y evaluación (dentro de alumno.sesionEval[k]).
function _aeDeAlumno(a, k) {
  const s = _sesDeAlumno(a, k);
  if (!Array.isArray(s.casos)) s.casos = [];
  if (!s.pendAnt || typeof s.pendAnt !== 'object') s.pendAnt = {};
  return s;
}
function _aeActa(nivel, grupo, k) {
  const acta = _sesActa(nivel, grupo, k);
  if (!acta.analisis || typeof acta.analisis !== 'object') acta.analisis = {};
  return acta;
}
// Texto de un HTML guardado (los acuerdos del Acta Oficial se escribían en un cuadro con formato).
function _aeTextoDeHtml(html) {
  const d = document.createElement('div');
  d.innerHTML = _tHtmlSeguro(String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|tr)>/gi, '\n'));
  return d.textContent.replace(/ /g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/* Lo que se guardó en el Acta Oficial pasa a la sesión (una sola vez por grupo y evaluación): acuerdos, nombres de
   Jefatura y Dirección y las decisiones sobre las pendientes de cursos anteriores. Lo que ya hubiera en la sesión
   se respeta. Los nombres de Jefatura y Dirección se proponen también desde otra evaluación del grupo. */
function _aeMigrar(nivel, grupo, k) {
  k = String(k);
  const acta = _aeActa(nivel, grupo, k);
  if (!acta.migrado) {
    acta.migrado = true;
    const ao = (window._actasOficialesData || {})[`${nivel}-${grupo}-eval${k}`];
    if (ao) {
      if (typeof markDirty === 'function') markDirty();   // solo se guarda si había algo que pasar
      const t = _aeTextoDeHtml(ao.acuerdos);
      if (t && !String(acta.acuerdosGrupo || '').includes(t)) acta.acuerdosGrupo = acta.acuerdosGrupo ? acta.acuerdosGrupo.trim() + '\n\n' + t : t;
      if (!acta.jefeEstudios && ao.jefeEstudios) acta.jefeEstudios = ao.jefeEstudios;
      if (!acta.director && ao.director) acta.director = ao.director;
      // El Acta Oficial numeraba las filas por su orden: alumnado con pendientes, en orden alfabético.
      const conPend = (data[nivel]?.[grupo] || []).slice().sort((x, y) => (x.nombre || '').localeCompare(y.nombre || '', 'es')).filter(a => (a.pendientesAnteriores || []).length);
      Object.entries(ao.pendAnt || {}).forEach(([pk, v]) => {
        const [ai, mi] = pk.split('-').map(Number), a = conPend[ai], m = a && (a.pendientesAnteriores || [])[mi];
        if (!m || !v) return;
        const s = _aeDeAlumno(a, k);
        if (!s.pendAnt[m]) s.pendAnt[m] = { estado: v.estado || '', nota: v.nota || '', motivo: v.motivo || '' };
      });
    }
  }
  if (!acta.jefeEstudios || !acta.director) {
    const otras = ['1', '2', '3'].filter(x => x !== k).map(x => ((_getAsistenciaData(nivel, grupo).actasSesion || {})[x]) || {});
    if (!acta.jefeEstudios) acta.jefeEstudios = (otras.find(o => o.jefeEstudios) || {}).jefeEstudios || '';
    if (!acta.director) acta.director = (otras.find(o => o.director) || {}).director || '';
  }
  return acta;
}

// Estado de una pendiente de cursos anteriores en el acta: lo decidido en la sesión o lo que dice la tabla.
function _aePendAnt(a, k, m) {
  const v = (((a.sesionEval || {})[k] || {}).pendAnt || {})[m];
  if (v && v.estado) return v;
  const rec = (a.recuperadasAnteriores || []).includes(m), norec = (a.noRecuperadasAnteriores || []).includes(m);
  return { estado: rec ? 'Recuperada' : norec ? 'No recuperada' : 'En proceso de recuperación', nota: (v && v.nota) || '', motivo: (v && v.motivo) || '' };
}

/* ---------------- El documento ---------------- */
function actaEvaluacionHTML(nivel, grupo, k) {
  k = String(k);
  const acta = _aeMigrar(nivel, grupo, k);
  const c = _SES_CAMPOS[k], alumnos = (data[nivel]?.[grupo] || []).filter(a => (a.nombre || '').trim());
  const sorted = alumnos.slice().sort((x, y) => (x.nombre || '').localeCompare(y.nombre || '', 'es'));
  const esc = s => _tEsc(s == null ? '' : String(s));
  const bach = isBach(nivel), final = k === '3';
  const ies = document.getElementById('headerIesName')?.value || '';
  const tutor = tutores[`${nivel}-${grupo}`] || '';
  const fechaIso = acta.fecha || getDates(nivel)['eval' + k] || '';
  const fecha = fechaIso ? fmtDate(fechaIso) : '';
  const total = alumnos.length;
  const pct = n => total ? Math.round(n / total * 100) + ' %' : '—';
  const susp = a => +a[c.n] || 0;
  const pend = a => a[c.pend] || [];
  const prop = a => getPropObj(a[c.prop]);
  const ses = a => ((a.sesionEval || {})[k]) || {};
  const parrafo = t => String(t || '').trim() ? `<div class="texto">${esc(String(t).trim())}</div>` : '<div class="vacio">—</div>';
  const chips = (l, cls) => l.length ? l.map(m => `<span class="chip ${cls || ''}">${esc(m)}</span>`).join(' ') : '<span class="ok">✓ Todo superado</span>';
  const ninguno = t => `<div class="vacio">${t}</div>`;
  let n = 0; const sec = (titulo, extra) => `<div class="section-title${extra ? ' ' + extra : ''}"><span>${++n}</span>${titulo}</div>`;

  // Asistencia del profesorado (la de la sesión).
  const d = _getAsistenciaData(nivel, grupo), sesiones = d.sesiones['eval' + k] || [];
  const filasProf = d.profesores.map((p, i) => {
    const s = sesiones[i] || {};
    const est = s.asistio === true ? '<span class="ok">Asiste</span>' : s.asistio === false ? `<span class="mal">No asiste</span>${s.justificacion ? ' — ' + esc(s.justificacion) : ''}` : '<span class="vacio">Sin anotar</span>';
    return `<tr><td class="c">${i + 1}</td><td><strong>${esc(p.nombre || '—')}</strong>${p.esTutor ? ' <span class="tag">tutor/a</span>' : ''}</td><td>${esc(_tMateriaDeProfesor(p)) || '—'}</td><td>${est}</td></tr>`;
  }).join('');
  const nAsisten = sesiones.slice(0, d.profesores.length).filter(s => s && s.asistio === true).length;

  // Resultados.
  const cero = alumnos.filter(a => !susp(a)).length, unaDos = alumnos.filter(a => susp(a) >= 1 && susp(a) <= 2).length;
  const tresCinco = alumnos.filter(a => susp(a) >= 3 && susp(a) <= 5).length, masCinco = alumnos.filter(a => susp(a) > 5).length;
  const cuenta = {}; alumnos.forEach(a => pend(a).forEach(m => { cuenta[m] = (cuenta[m] || 0) + 1; }));
  const ranking = Object.entries(cuenta).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0], 'es'));
  const mitad = ranking.filter(([, v]) => total && v / total > 0.5);
  const tipos = {}; alumnos.forEach(a => { const t = prop(a).tipo || 'Sin decidir'; tipos[t] = (tipos[t] || 0) + 1; });
  const colorProp = t => t === 'Repetición' ? 'mal' : (t === 'Promoción' || t === 'Titulación') ? 'ok' : t === 'Abandono' ? 'gris' : 'aviso';
  const nese = alumnos.filter(a => a.nese === 'Sí').length, repetidores = alumnos.filter(a => a.repetidor === 'Sí').length;

  const filasAl = sorted.map((a, i) => {
    const p = prop(a), s = ses(a);
    const ant = (a.pendientesAnteriores || []).filter(m => _aePendAnt(a, k, m).estado !== 'Recuperada');
    return `<tr><td class="c gris">${i + 1}</td>
      <td><strong>${esc(a.nombre)}</strong>${a.nese === 'Sí' ? ' <span class="tag nese" title="NESE">NESE</span>' : ''}${a.repetidor === 'Sí' ? ' <span class="tag" title="Repite curso">Rep.</span>' : ''}</td>
      <td class="c"><strong class="${susp(a) ? (susp(a) >= 3 ? 'mal' : 'aviso') : 'ok'}">${susp(a)}</strong></td>
      <td>${chips(pend(a))}</td>
      ${final ? `<td>${(a.pendientesAnteriores || []).length ? (ant.length ? chips(ant, 'roja') : '<span class="ok">✓ Recuperadas</span>') : '<span class="vacio">—</span>'}</td>` : ''}
      <td><strong class="${colorProp(p.tipo)}">${esc(p.tipo || 'Sin decidir')}</strong>${p.destino ? `<br><span class="gris">→ ${esc(p.destino)}</span>` : ''}</td>
      <td class="pequeno">${esc(s.acuerdos || '')}</td></tr>`;
  }).join('');

  // Casos particulares, repetidores, programas, planes, pendientes, NESE, convivencia.
  const casos = _AE_CASOS.map(([clave, etq]) => {
    const l = sorted.filter(a => (ses(a).casos || []).includes(clave));
    return l.length ? l.map((a, j) => `<tr>${j === 0 ? `<td rowspan="${l.length}" class="grupo-etq">${esc(etq)}</td>` : ''}<td><strong>${esc(a.nombre)}</strong></td><td>${esc(ses(a).casoMaterias || pend(a).join(', '))}</td><td class="pequeno">${esc(ses(a).acuerdos || '')}</td></tr>`).join('') : '';
  }).join('');
  const reps = sorted.filter(a => a.repetidor === 'Sí');
  const prog = p => sorted.filter(a => ses(a).programa === p);
  const repiten = sorted.filter(a => prop(a).tipo === 'Repetición');
  const refuerzo = sorted.filter(a => (prop(a).tipo === 'Promoción' || prop(a).tipo === 'Titulación') && pend(a).length);
  const agrupa = sorted.filter(a => String(ses(a).agrupacion || '').trim());
  const extr = sorted.filter(a => pend(a).length);
  const conPendAnt = sorted.filter(a => (a.pendientesAnteriores || []).length);
  const neseAl = sorted.filter(a => a.nese === 'Sí' || _getNeseCodes(a.recursoNese).length || (Array.isArray(a.codComp) ? a.codComp.length : a.codComp));
  const codigos = new Set(); neseAl.forEach(a => (Array.isArray(a.codComp) ? a.codComp : (a.codComp ? [a.codComp] : [])).forEach(x => codigos.add(String(x))));
  const leyenda = (typeof COMP_CODES !== 'undefined' ? COMP_CODES : []).filter(x => codigos.has(x.code));
  const usaAL = neseAl.some(a => _getNeseCodes(a.recursoNese).includes('AL')), usaPT = neseAl.some(a => _getNeseCodes(a.recursoNese).includes('PT'));
  const cv = (a, b) => +a[b + k] || 0;
  const conv = { fj: 'faltasJust', fi: 'faltasInjust', ac: 'ac', pa: 'partes', ex: 'expedientes' };
  const tot = Object.fromEntries(Object.entries(conv).map(([x, b]) => [x, alumnos.reduce((s, a) => s + cv(a, b), 0)]));
  const conIncid = sorted.filter(a => Object.values(conv).some(b => cv(a, b) > 0));
  let evolucion = '';
  if (k !== '1' && total) {
    const prev = k === '2' ? 'eval1' : 'eval2', etqPrev = k === '2' ? 'I Evaluación' : 'II Evaluación';
    const mPrev = alumnos.reduce((s, a) => s + (+a[prev] || 0), 0) / total, mAct = alumnos.reduce((s, a) => s + susp(a), 0) / total, dlt = mAct - mPrev;
    evolucion = `<section class="bloque">${sec('Evolución respecto a la evaluación anterior')}<div class="stats-grid tres">
      <div class="stat-box"><div class="sv">${mPrev.toFixed(2).replace('.', ',')}</div><div class="sl">Media de suspensas · ${etqPrev}</div></div>
      <div class="stat-box"><div class="sv">${mAct.toFixed(2).replace('.', ',')}</div><div class="sl">Media de suspensas · ${_AE_NOMBRE[k]}</div></div>
      <div class="stat-box ${dlt < 0 ? 'green' : dlt > 0 ? 'red' : 'yellow'}"><div class="sv">${dlt > 0 ? '+' : ''}${dlt.toFixed(2).replace('.', ',')}</div><div class="sl">${dlt < 0 ? 'Mejora' : dlt > 0 ? 'Empeora' : 'Sin cambios'}</div></div></div></section>`;
  }
  const analisis = _AE_ANALISIS.filter(([clave]) => clave !== 'cohesion' || k === '1' || String(acta.analisis.cohesion || '').trim());

  const titulo = `Acta de ${final ? 'la Evaluación Final' : 'la ' + _AE_NOMBRE[k]} — ${nivel} ${grupo}`;
  const archivo = `Acta_${_AE_CORTO[k]}_Evaluacion_${nivel}_${grupo}`.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '') + '.docx';
  // Cada apartado va en su bloque: no se parte entre páginas (si cabe) y su título nunca se queda solo al pie.
  // Solo puede seguir en la página siguiente un apartado largo (una tabla de más de 14 filas, que no cabría entera);
  // los cortos van siempre enteros.
  const bloque = (t, contenido) => `<section class="bloque${(contenido.match(/<tr/g) || []).length > 14 ? ' largo' : ''}">${sec(t)}${contenido}</section>`;
  const tabla = (cab, filas) => `<table><thead><tr>${cab}</tr></thead><tbody>${filas}</tbody></table>`;
  const listaAl = (l, celdas) => l.map(a => `<tr><td><strong>${esc(a.nombre)}</strong></td>${celdas(a)}</tr>`).join('');

  const cuerpo = [
    bloque('Profesorado asistente a la sesión', d.profesores.length
      ? tabla('<th class="c" style="width:4%">#</th><th style="width:30%">Profesor/a</th><th style="width:36%">Materia que imparte</th><th>Asistencia</th>', filasProf) + `<div class="nota">${nAsisten} de ${d.profesores.length} asisten.</div>`
      : ninguno('No hay equipo docente registrado (👨‍🏫 Equipo docente).'), 'largo'),
    bloque('Relación de alumnado y resultados', tabla(`<th class="c" style="width:3.5%">Nº</th><th style="width:19%">Alumno/a</th><th class="c" style="width:6%">Mat. no sup.</th><th>Materias no superadas</th>${final ? '<th style="width:15%">Pend. cursos ant.</th>' : ''}<th style="width:11%">${esc(c.propEtq)}</th><th style="width:22%">Acuerdos</th>`,
      filasAl || '<tr><td colspan="7" class="vacio">Sin alumnado</td></tr>'), 'largo'),
    `<div class="dos-col">${bloque(final ? 'Resumen de decisiones' : 'Resumen de propuestas', tabla(`<th>${final ? 'Decisión' : 'Propuesta'}</th><th class="c" style="width:22%">Alumnos</th><th class="c" style="width:18%">%</th>`,
        ['Promoción', 'Titulación', 'Repetición', 'Abandono', 'Sin decidir'].filter(t => tipos[t]).map(t => `<tr><td class="${colorProp(t === 'Sin decidir' ? '' : t)}"><strong>${t}</strong></td><td class="c">${tipos[t]}</td><td class="c">${pct(tipos[t])}</td></tr>`).join('') || '<tr><td colspan="3" class="vacio">—</td></tr>'))}
      ${bloque('Análisis de resultados académicos del grupo', tabla('<th>Información relevante</th><th class="c" style="width:18%">Alumnos</th><th class="c" style="width:14%">%</th>',
        `<tr><td>Alumnado con todo aprobado</td><td class="c"><strong>${cero}</strong></td><td class="c">${pct(cero)}</td></tr>
         <tr><td>Alumnado con 1 o 2 materias no superadas</td><td class="c"><strong>${unaDos}</strong></td><td class="c">${pct(unaDos)}</td></tr>
         <tr><td>Alumnado con 3 a 5 materias no superadas</td><td class="c"><strong>${tresCinco}</strong></td><td class="c">${pct(tresCinco)}</td></tr>
         <tr><td>Alumnado con más de 5 materias no superadas</td><td class="c"><strong>${masCinco}</strong></td><td class="c">${pct(masCinco)}</td></tr>`))}</div>`,
    bloque('Materias con más alumnado suspenso', `<div class="sub">Materias con más del 50 % de suspensos: ${mitad.length ? mitad.map(([m, v]) => `<span class="chip">${esc(m)} (${v} · ${pct(v)})</span>`).join(' ') : '<span class="vacio">ninguna</span>'}</div>
      ${ranking.length ? tabla('<th>Materia</th><th class="c" style="width:10%">Suspensos</th><th class="c" style="width:8%">%</th><th style="width:35%">&nbsp;</th>',
        ranking.map(([m, v]) => `<tr><td>${esc(m)}</td><td class="c"><strong class="mal">${v}</strong></td><td class="c">${pct(v)}</td><td><div class="barra"><div style="width:${Math.round(v / ranking[0][1] * 100)}%"></div></div></td></tr>`).join(''))
        : ninguno('✓ No hay materias con alumnado suspenso en esta evaluación.')}`),
    evolucion,
    bloque('Relación de alumnado con dificultades (casos particulares)', casos ? tabla('<th style="width:22%">Problemática</th><th style="width:20%">Alumno/a</th><th style="width:20%">Áreas / materias</th><th>Medidas a tomar</th>', casos) : ninguno('No se ha señalado ningún caso particular.'), 'largo'),
    bloque('Alumnado repetidor', reps.length ? tabla('<th style="width:28%">Alumno/a</th><th>Valoración de la repetición</th>', listaAl(reps, a => `<td>${esc(ses(a).valoracionRepeticion || '')}</td>`)) : ninguno('No hay alumnado repetidor.')),
    !bach && k !== '1' ? bloque((final ? 'Propuesta' : 'Primera propuesta') + ' de alumnado para programas de atención a la diversidad grupal — Nivel III',
      tabla(_AE_PROGRAMAS.slice(0, 3).map(p => `<th style="width:33.3%">${esc(p)}</th>`).join(''), `<tr>${_AE_PROGRAMAS.slice(0, 3).map(p => `<td>${prog(p).map(a => `<div><strong>${esc(a.nombre)}</strong>${ses(a).programaMotivo ? ` · <span class="gris">${esc(ses(a).programaMotivo)}</span>` : ''}</div>`).join('') || '<span class="vacio">—</span>'}</td>`).join('')}</tr>`)
      + `<div class="sub">Propuesta de alumnado para FPB</div>` + (prog('FPB').length ? tabla('<th style="width:28%">Alumno/a</th><th>Motivo</th><th style="width:30%">Familia profesional (FPB)</th>', listaAl(prog('FPB'), a => `<td>${esc(ses(a).programaMotivo || '')}</td><td>${esc(ses(a).fpbFamilia || '')}</td>`)) : ninguno('Ninguna'))) : '',
    final && !bach ? bloque('Permanencia un año más: deben elaborar Plan de Repetición', repiten.length ? tabla('<th style="width:24%">Alumno/a</th><th style="width:38%">Materias no superadas</th><th>Motivos de la no promoción</th>', listaAl(repiten, a => `<td>${chips(pend(a))}</td><td>${esc(ses(a).motivoNoPromocion || '')}</td>`)) : ninguno('Nadie')) : '',
    final && !bach ? bloque('Alumnado que promociona con materias pendientes: deben elaborar Plan de Refuerzo', refuerzo.length ? tabla('<th style="width:28%">Alumno/a</th><th>Materias no superadas</th>', listaAl(refuerzo, a => `<td>${chips(pend(a))}</td>`)) : ninguno('Nadie')) : '',
    final && bach ? bloque('Alumnado con materias para la evaluación extraordinaria', (extr.length ? tabla('<th style="width:28%">Alumno/a</th><th class="c" style="width:8%">Nº mat.</th><th>Materias</th>', listaAl(extr, a => `<td class="c">${susp(a)}</td><td>${chips(pend(a))}</td>`)) : ninguno('Nadie'))
      + (repiten.length ? `<div class="sub">No promocionan / no titulan</div>` + tabla('<th style="width:28%">Alumno/a</th><th>Motivos</th>', listaAl(repiten, a => `<td>${esc(ses(a).motivoNoPromocion || '')}</td>`)) : '')) : '',
    final ? bloque('Propuesta de agrupación para el próximo curso', agrupa.length ? tabla('<th style="width:24%">Alumno/a</th><th style="width:38%">Materias no superadas</th><th>Observaciones</th>', listaAl(agrupa, a => `<td>${chips(pend(a))}</td><td>${esc(ses(a).agrupacion)}</td>`)) : ninguno('Sin observaciones')) : '',
    bloque('Materias pendientes de cursos anteriores — decisión adoptada', conPendAnt.length ? tabla('<th style="width:22%">Alumno/a</th><th style="width:26%">Materia pendiente</th><th style="width:17%">Estado</th><th class="c" style="width:7%">Nota</th><th>Motivo / observaciones</th>',
      conPendAnt.map(a => (a.pendientesAnteriores || []).map((m, j) => { const v = _aePendAnt(a, k, m); return `<tr>${j === 0 ? `<td rowspan="${a.pendientesAnteriores.length}"><strong>${esc(a.nombre)}</strong></td>` : ''}<td>${esc(m)}</td><td class="${v.estado === 'Recuperada' ? 'ok' : v.estado === 'No recuperada' ? 'mal' : 'aviso'}">${esc(v.estado)}</td><td class="c">${esc(v.nota)}</td><td>${esc(v.motivo)}</td></tr>`; }).join('')).join(''))
      : ninguno('✓ Ningún alumno/a tiene materias pendientes de cursos anteriores.'), 'largo'),
    bloque('Alumnado NESE y de Compensatoria', neseAl.length ? tabla('<th style="width:24%">Alumno/a</th><th class="c" style="width:10%">Recurso</th><th style="width:14%">Cód. Comp.</th><th>Medidas adoptadas / observaciones</th>',
        listaAl(neseAl, a => `<td class="c">${esc(_getNeseCodes(a.recursoNese).join(' / ')) || '—'}</td><td>${esc(Array.isArray(a.codComp) ? a.codComp.join(', ') : (a.codComp || '')) || '—'}</td><td>${esc(ses(a).medidasNese || '')}</td>`))
      + (leyenda.length || usaAL || usaPT ? `<div class="nota"><strong>Leyenda:</strong> ${[usaAL ? '<strong>AL</strong> = Audición y Lenguaje' : '', usaPT ? '<strong>PT</strong> = Pedagogía Terapéutica' : '', ...leyenda.map(x => `<strong>${esc(x.code)}</strong> = ${esc(x.label)}`)].filter(Boolean).join(' · ')}</div>` : '')
      : ninguno('Sin alumnado con medidas de atención específica.'), 'largo'),
    bloque('Faltas de asistencia y convivencia', `<div class="stats-grid cinco">
        <div class="stat-box blue"><div class="sv">${tot.fj}</div><div class="sl">Faltas justificadas</div></div>
        <div class="stat-box red"><div class="sv">${tot.fi}</div><div class="sl">Faltas sin justificar</div></div>
        <div class="stat-box yellow"><div class="sv">${tot.ac}</div><div class="sl">Amonestaciones (AC)</div></div>
        <div class="stat-box red"><div class="sv">${tot.pa}</div><div class="sl">Partes</div></div>
        <div class="stat-box red"><div class="sv">${tot.ex}</div><div class="sl">Expedientes</div></div></div>`
      + (conIncid.length ? tabla('<th style="width:30%">Alumno/a</th><th class="c">F. justificadas</th><th class="c">F. sin justificar</th><th class="c">AC</th><th class="c">Partes</th><th class="c">Expedientes</th>',
          listaAl(conIncid, a => Object.values(conv).map(b => `<td class="c">${cv(a, b) ? `<strong>${cv(a, b)}</strong>` : '0'}</td>`).join('')))
        : ninguno('✓ No hay faltas ni incidencias registradas en esta evaluación.')), 'largo'),
    bloque('Análisis general del grupo', tabla('<th style="width:28%">Aspecto</th><th>Valoración</th>', analisis.map(([clave, etq]) => `<tr><td><strong>${esc(etq)}</strong></td><td>${esc(acta.analisis[clave] || '')}</td></tr>`).join(''))
      + `<div class="sub">Valoración general del grupo</div>${parrafo(acta.valoracion)}`),
    bloque('Propuestas de mejora y acuerdos adoptados por el equipo docente', parrafo(acta.acuerdosGrupo)),
    bloque('Firmas', `<div class="firmas-grid">
      <div class="firma-block"><div class="firma-line"></div><div class="firma-label">Tutor/a del grupo</div><div class="firma-name">${esc(tutor)}</div></div>
      <div class="firma-block"><div class="firma-line"></div><div class="firma-label">Jefe/a de Estudios</div><div class="firma-name">${esc(acta.jefeEstudios || '')}</div></div>
      <div class="firma-block"><div class="firma-line"></div><div class="firma-label">Director/a del centro</div><div class="firma-name">${esc(acta.director || '')}</div></div></div>
      <div class="pie">Generado el ${esc(new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }))} · Gestor de Tutoría${ies ? ' · ' + esc(ies) : ''}</div>`),
  ].filter(Boolean).join('\n');

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${esc(titulo)}</title>
<style>
  /* A4 apaisado con 3 cm de margen: queda una caja de 23,7 × 15 cm. */
  @page { size: A4 landscape; margin: 3cm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt; line-height: 1.35; color: #111; background: #e8ebf0; }
  .page { width: 237mm; margin: 14px auto 30px; padding: 12mm 14mm; background: #fff; box-shadow: 0 2px 14px rgba(0,0,0,.18); box-sizing: content-box; }
  .acta-header { border: 1.5px solid #1a3a6b; border-radius: 3px; overflow: hidden; }
  .acta-header-top { background: #1a3a6b; color: #fff; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .acta-header-org { font-size: 7pt; opacity: .85; letter-spacing: .8px; text-transform: uppercase; }
  .acta-header-title { font-size: 11.5pt; font-weight: bold; letter-spacing: .3px; }
  .acta-header-badge { background: rgba(255,255,255,.18); border: 1px solid rgba(255,255,255,.45); border-radius: 3px; padding: 2px 9px; font-size: 8pt; font-weight: bold; white-space: nowrap; }
  .acta-meta { display: grid; grid-template-columns: 1.2fr 1fr 1.3fr .8fr .7fr 1fr; }
  .acta-meta-cell { padding: 4px 9px; border-right: 1px solid #c5d8ef; }
  .acta-meta-cell:last-child { border-right: none; }
  .acta-meta-label { color: #5a6a8a; font-size: 6.5pt; text-transform: uppercase; letter-spacing: .4px; }
  .acta-meta-value { font-weight: bold; color: #1a2a4a; font-size: 8.5pt; }
  .stats-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 5px; margin: 8px 0 2px; }
  .stats-grid.tres { grid-template-columns: repeat(3, 1fr); }
  .stats-grid.cinco { grid-template-columns: repeat(5, 1fr); margin: 0 0 6px; }
  .stat-box { border: 1px solid #c5d8ef; border-radius: 4px; padding: 4px 6px; text-align: center; background: #f8faff; break-inside: avoid; }
  .stat-box .sv { font-size: 13pt; font-weight: bold; line-height: 1.1; }
  .stat-box .sl { font-size: 6.5pt; color: #5a6a8a; line-height: 1.2; }
  .stat-box.green { border-color: #86efac; background: #f0fdf4; } .stat-box.green .sv { color: #166534; }
  .stat-box.red { border-color: #fca5a5; background: #fef2f2; } .stat-box.red .sv { color: #991b1b; }
  .stat-box.yellow { border-color: #fde68a; background: #fefce8; } .stat-box.yellow .sv { color: #92400e; }
  .stat-box.blue { border-color: #93c5fd; } .stat-box.blue .sv { color: #1e40af; }
  .bloque { margin-top: 11px; break-inside: avoid; page-break-inside: avoid; }
  .bloque.largo { break-inside: auto; page-break-inside: auto; }
  .dos-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; break-inside: avoid; page-break-inside: avoid; }
  .section-title { font-size: 8pt; font-weight: bold; text-transform: uppercase; letter-spacing: .5px; color: #1a3a6b; border-bottom: 1.5px solid #1a3a6b; padding-bottom: 2px; margin-bottom: 5px; break-after: avoid; page-break-after: avoid; }
  .section-title span { background: #1a3a6b; color: #fff; padding: 0 6px; border-radius: 2px; margin-right: 6px; }
  .sub { font-size: 7.5pt; font-weight: bold; color: #1a3a6b; margin: 6px 0 4px; break-after: avoid; page-break-after: avoid; }
  table { width: 100%; border-collapse: collapse; font-size: 8pt; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  th { background: #dce8f5; font-weight: bold; padding: 3px 5px; border: 1px solid #9ab5d4; text-align: left; color: #1a3a6b; font-size: 6.8pt; text-transform: uppercase; letter-spacing: .2px; vertical-align: bottom; }
  td { padding: 3px 5px; border: 1px solid #c0d0e0; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #f8faff; }
  th.c, td.c { text-align: center; }
  td.grupo-etq { background: #dce8f5 !important; font-weight: bold; color: #1a3a6b; }
  .chip { display: inline-block; background: #fee2e2; border: 1px solid #fecaca; border-radius: 2px; padding: 0 3px; font-size: 7pt; margin: 1px 0; line-height: 1.3; }
  .chip.roja { background: #fef3c7; border-color: #fde68a; }
  .tag { display: inline-block; border: 1px solid #c5d8ef; border-radius: 2px; padding: 0 3px; font-size: 6.5pt; color: #1a3a6b; background: #eef4ff; font-weight: normal; }
  .tag.nese { color: #92400e; border-color: #fde68a; background: #fefce8; }
  .ok { color: #166534; } .mal { color: #991b1b; } .aviso { color: #b45309; } .gris { color: #6b7280; }
  .pequeno { white-space: pre-wrap; }
  .texto { border: 1px solid #c5d8ef; border-radius: 3px; padding: 5px 9px; background: #fafcff; white-space: pre-wrap; }
  .vacio { color: #9aa3bb; font-style: italic; }
  .nota { color: #5a6a8a; font-size: 7.5pt; margin-top: 3px; }
  .barra { background: #f1f5f9; border-radius: 3px; height: 8px; overflow: hidden; } .barra div { height: 8px; background: #ef4444; }
  .firmas-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-top: 8px; }
  .firma-block { text-align: center; }
  .firma-line { border-bottom: 1px solid #555; height: 46px; margin-bottom: 3px; }
  .firma-label { font-size: 7pt; color: #5a6a8a; text-transform: uppercase; letter-spacing: .4px; }
  .firma-name { font-size: 8pt; font-weight: bold; color: #1a2a4a; min-height: 11px; }
  .pie { text-align: right; margin-top: 10px; font-size: 7pt; color: #888; }
  .acta-toolbar { position: sticky; top: 0; z-index: 50; background: #1a1d27; padding: 8px 20px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .acta-toolbar span { font-size: 12px; color: #c8cde0; }
  .toolbar-btn { padding: 7px 14px; border-radius: 7px; border: none; cursor: pointer; font-family: Arial; font-size: 12px; font-weight: 600; background: #8a63d2; color: #fff; }
  @media print {
    body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { width: auto; margin: 0; padding: 0; box-shadow: none; }
    .no-print { display: none !important; }
  }
</style></head><body>
<div class="acta-toolbar no-print"><span>📋 Se rellena en «🎓 Sesión de evaluación»: para cambiar algo, vuelve allí y genera el acta de nuevo. Se imprime en A4 apaisado.</span>
  <button class="toolbar-btn" onclick="_aeWord()">📄 Exportar a Word</button></div>
<div class="page">
  <div class="acta-header">
    <div class="acta-header-top">
      <div><div class="acta-header-org">Generalitat Valenciana · Conselleria d'Educació</div>
        <div class="acta-header-title">ACTA DE ${final ? 'LA EVALUACIÓN FINAL' : 'LA ' + _AE_NOMBRE[k].toUpperCase()}</div></div>
      <div class="acta-header-badge">${bach ? 'Bachillerato' : 'ESO'} · Evaluación ${_AE_CORTO[k]}</div>
    </div>
    <div class="acta-meta">
      <div class="acta-meta-cell"><div class="acta-meta-label">Centro educativo</div><div class="acta-meta-value">${esc(ies) || '&nbsp;'}</div></div>
      <div class="acta-meta-cell"><div class="acta-meta-label">Nivel y grupo</div><div class="acta-meta-value">${esc(nivel)} — ${esc(grupo)}</div></div>
      <div class="acta-meta-cell"><div class="acta-meta-label">Tutor/a</div><div class="acta-meta-value">${esc(tutor) || '&nbsp;'}</div></div>
      <div class="acta-meta-cell"><div class="acta-meta-label">Fecha de la sesión</div><div class="acta-meta-value">${esc(fecha) || '&nbsp;'}</div></div>
      <div class="acta-meta-cell"><div class="acta-meta-label">Horario</div><div class="acta-meta-value">${acta.horaInicio ? esc(acta.horaInicio) + (acta.horaFin ? '–' + esc(acta.horaFin) : '') : '&nbsp;'}</div></div>
      <div class="acta-meta-cell"><div class="acta-meta-label">Curso escolar</div><div class="acta-meta-value">${_tCursoActual('–')} · ${total} alumnos</div></div>
    </div>
  </div>
  <div class="stats-grid">
    <div class="stat-box blue"><div class="sv">${total}</div><div class="sl">Total alumnado</div></div>
    <div class="stat-box green"><div class="sv">${cero}</div><div class="sl">Todo superado</div></div>
    <div class="stat-box yellow"><div class="sv">${unaDos}</div><div class="sl">1–2 no superadas</div></div>
    <div class="stat-box red"><div class="sv">${tresCinco + masCinco}</div><div class="sl">3 o más no superadas</div></div>
    <div class="stat-box yellow"><div class="sv">${nese}</div><div class="sl">Con NESE</div></div>
    <div class="stat-box"><div class="sv">${repetidores}</div><div class="sl">Repetidores</div></div>
    <div class="stat-box red"><div class="sv">${tipos['Repetición'] || 0}</div><div class="sl">${final ? 'Repiten' : 'Propuesta de repetición'}</div></div>
    <div class="stat-box green"><div class="sv">${(tipos['Promoción'] || 0) + (tipos['Titulación'] || 0)}</div><div class="sl">${final ? 'Promocionan / titulan' : 'Propuesta de promoción / titulación'}</div></div>
  </div>
${cuerpo}
</div>
<script>
/* «Exportar a Word»: lo hace la app (un .docx de verdad, ver _aeExportarDocx en 30-acta-evaluacion.js). */
var _AE_ARCHIVO = '${jsAttr(archivo)}';
function _aeWord() {
  try { if (window.parent && window.parent !== window && typeof window.parent._aeExportarDocx === 'function') { window.parent._aeExportarDocx(document, _AE_ARCHIVO); return; } } catch (e) {}
  alert('Para exportar a Word, abre el acta desde el Gestor de Tutoría (🎓 Sesión de evaluación → 🖨 Acta de evaluación).');
}
<\/script>
</body></html>`;
}
/* ---------------- Exportar a Word: un .docx de verdad ----------------
   Se construye a partir del acta tal como se ve (su documento ya dibujado): cada apartado, tabla, cifra y firma pasa
   a WordprocessingML con sus colores, negritas, fondos y anchos. Página A4 apaisada con 3 cm de margen, filas que no se
   parten, cabecera de las tablas repetida en cada página y el título de cada apartado siempre con lo que le sigue.
   Sin librerías (funciona sin conexión): el .docx es un .zip sin comprimir con cinco archivos XML. */
const _AE_DOCX_ANCHO = 16838 - 2 * 1701;   // ancho útil en twips: A4 apaisado (29,7 cm) menos 3 cm por lado
function _aeZip(archivos) {
  const enc = new TextEncoder(), tablaCrc = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; tablaCrc[n] = c >>> 0; }
  const crc = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = tablaCrc[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const u16 = v => [v & 255, (v >>> 8) & 255], u32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  const partes = [], central = []; let pos = 0;
  archivos.forEach(([nombre, texto]) => {
    const nb = enc.encode(nombre), datos = enc.encode(texto), c = crc(datos);
    const cab = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(c), ...u32(datos.length), ...u32(datos.length), ...u16(nb.length), ...u16(0)]);
    partes.push(cab, nb, datos);
    central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(c), ...u32(datos.length), ...u32(datos.length), ...u16(nb.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(pos)]), nb);
    pos += cab.length + nb.length + datos.length;
  });
  const tamCentral = central.reduce((s, b) => s + b.length, 0);
  const fin = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(archivos.length), ...u16(archivos.length), ...u32(tamCentral), ...u32(pos), ...u16(0)]);
  return new Blob([...partes, ...central, fin], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
function _aeDocxXml(doc) {
  const win = doc.defaultView, cs = el => win.getComputedStyle(el);
  const x = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const hex = v => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(v || ''); if (!m || (m[4] !== undefined && +m[4] < 0.05)) return ''; return [m[1], m[2], m[3]].map(n => (+n).toString(16).padStart(2, '0')).join('').toUpperCase(); };
  // El fondo tal como se ve: los semitransparentes, mezclados con lo que tienen debajo (la etiqueta de la cabecera azul).
  const rgba = v => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(v || ''); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : [0, 0, 0, 0]; };
  const fondoVisto = el => {
    const capas = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const c = rgba(cs(e).backgroundColor); if (c[3] > 0) { capas.push(c); if (c[3] >= 1) break; } }
    if (!capas.length) return '';
    let col = [255, 255, 255]; capas.reverse().forEach(c => { col = col.map((v, n) => Math.round(c[n] * c[3] + v * (1 - c[3]))); });
    return col.map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase();
  };
  const BLOQUE = /^(DIV|P|SECTION|TABLE|UL|OL|LI|H1|H2|H3)$/;
  const esBloque = n => n.nodeType === 1 && (n.tagName === 'TABLE' || (BLOQUE.test(n.tagName) && !/^inline/.test(cs(n).display)));
  // Un trozo de texto con su formato: negrita, cursiva, color, tamaño, mayúsculas y el fondo de las etiquetas (chips).
  const run = (texto, st, fondo) => {
    const sz = Math.max(10, Math.round(parseFloat(st.fontSize) * 0.75 * 2)), col = hex(st.color);
    return `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>${+st.fontWeight >= 600 ? '<w:b/>' : ''}${st.fontStyle === 'italic' ? '<w:i/>' : ''}${st.textTransform === 'uppercase' ? '<w:caps/>' : ''}${col ? `<w:color w:val="${col}"/>` : ''}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>${fondo ? `<w:shd w:val="clear" w:color="auto" w:fill="${fondo}"/>` : ''}</w:rPr><w:t xml:space="preserve">${x(texto)}</w:t></w:r>`;
  };
  const runs = (nodos, fondo) => {
    let out = '';
    nodos.forEach(n => {
      if (n.nodeType === 3) { const t = n.nodeValue.replace(/\s+/g, ' '); if (t) out += run(t, cs(n.parentElement), fondo); return; }
      if (n.nodeType !== 1 || /no-print/.test(n.className)) return;
      if (n.tagName === 'BR') { out += '<w:r><w:br/></w:r>'; return; }
      if (n.classList.contains('barra')) { const w = parseFloat((n.firstElementChild && n.firstElementChild.style.width) || 0); out += `<w:r><w:rPr><w:color w:val="EF4444"/><w:sz w:val="14"/></w:rPr><w:t>${'█'.repeat(Math.max(1, Math.round(w / 4)))}</w:t></w:r>`; return; }
      const propio = /^inline/.test(cs(n).display) && rgba(cs(n).backgroundColor)[3] >= 0.9 ? hex(cs(n).backgroundColor) : '';   // chips, etiquetas y el número de cada apartado
      out += runs([...n.childNodes], propio || fondo);
      if (/\bchip\b/.test(n.className)) out += '<w:r><w:t xml:space="preserve"> </w:t></w:r>';
    });
    return out;
  };
  const alin = st => { const a = st && st.textAlign; return a === 'center' ? 'center' : (a === 'right' || a === 'end') ? 'right' : 'left'; };
  // Párrafo. o.seguir: mantener con el siguiente (los apartados cortos no se parten y los títulos no se quedan solos).
  const p = (contenido, st, o = {}) => `<w:p><w:pPr>${o.seguir ? '<w:keepNext/><w:keepLines/>' : ''}${o.pBdr || ''}${o.shd ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.shd}"/>` : ''}<w:spacing w:before="${o.antes || 0}" w:after="${o.despues || 0}" w:line="240" w:lineRule="auto"/><w:jc w:val="${alin(st)}"/></w:pPr>${contenido}</w:p>`;
  // Lo de dentro de un elemento: el texto seguido va en un párrafo; cada bloque (div, tabla…) aparte.
  const contenido = (el, ancho, o = {}) => {
    let out = '', linea = [];
    const cerrar = () => { const r = runs(linea); if (r) out += p(r, cs(el), o); linea = []; };
    el.childNodes.forEach(n => { if (esBloque(n)) { cerrar(); out += n.tagName === 'TABLE' ? tabla(n, ancho, o) : elemento(n, ancho, o); } else linea.push(n); });
    cerrar();
    return out;
  };
  const casilla = (inner, ancho, st, extra, el) => {
    const fondo = el && el.nodeType === 1 ? fondoVisto(el) : (st ? hex(st.backgroundColor) : '');
    inner = inner || p('', st);
    if (/<\/w:tbl>$/.test(inner)) inner += '<w:p><w:pPr><w:spacing w:after="0" w:line="120" w:lineRule="exact"/></w:pPr></w:p>';
    return `<w:tc><w:tcPr><w:tcW w:w="${Math.round(ancho)}" w:type="dxa"/>${extra || ''}${fondo ? `<w:shd w:val="clear" w:color="auto" w:fill="${fondo}"/>` : ''}<w:vAlign w:val="${st && st.verticalAlign === 'middle' ? 'center' : 'top'}"/></w:tcPr>${inner}</w:tc>`;
  };
  const bordes = (color, sz) => ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(b => `<w:${b} w:val="${color ? 'single' : 'nil'}" w:sz="${sz || 4}" w:space="0" w:color="${color || 'auto'}"/>`).join('');
  // Propiedades de una tabla, en el orden que exige Word (si no, puede decir que el archivo está dañado).
  const tblPr = (ancho, brd, mar, sep) => `<w:tblPr><w:tblW w:w="${Math.round(ancho)}" w:type="dxa"/>${sep ? `<w:tblCellSpacing w:w="${sep}" w:type="dxa"/>` : ''}<w:tblBorders>${brd}</w:tblBorders><w:tblLayout w:type="fixed"/>${mar}</w:tblPr>`;
  const margenes = (v, h) => `<w:tblCellMar><w:top w:w="${v}" w:type="dxa"/><w:left w:w="${h}" w:type="dxa"/><w:bottom w:w="${v}" w:type="dxa"/><w:right w:w="${h}" w:type="dxa"/></w:tblCellMar>`;
  // Tabla con sus anchos reales, cabecera repetida en cada página, filas que no se parten y casillas combinadas.
  function tabla(t, ancho, o = {}) {
    const filas = [...t.rows]; if (!filas.length) return '';
    const total = t.getBoundingClientRect().width || 1;
    const rej = filas.map(() => []); let ncols = 0;
    filas.forEach((f, i) => { let c = 0; [...f.cells].forEach(cel => { while (rej[i][c]) c++; for (let a = 0; a < cel.rowSpan && i + a < filas.length; a++) for (let b = 0; b < cel.colSpan; b++) rej[i + a][c + b] = { cel, a }; c += cel.colSpan; ncols = Math.max(ncols, c); }); });
    const px = Array(ncols).fill(0);
    rej.forEach(f => f.forEach((z, c) => { if (z && z.cel.colSpan === 1 && !px[c]) px[c] = z.cel.getBoundingClientRect().width; }));
    const sin = px.filter(w => !w).length, resto = Math.max(0, total - px.reduce((s, w) => s + w, 0));
    const tw = px.map(w => (w || resto / Math.max(1, sin)) / total * ancho);
    const borde = hex(cs(filas[0].cells[0]).borderTopColor) || 'C0D0E0';
    let out = `<w:tbl>${tblPr(ancho, bordes(borde, 4), margenes(25, 70))}<w:tblGrid>${tw.map(w => `<w:gridCol w:w="${Math.round(w)}"/>`).join('')}</w:tblGrid>`;
    filas.forEach((f, i) => {
      const cab = f.parentElement.tagName === 'THEAD', ultima = i === filas.length - 1;
      out += `<w:tr><w:trPr><w:cantSplit/>${cab ? '<w:tblHeader/>' : ''}</w:trPr>`;
      for (let c = 0; c < ncols;) {
        const z = rej[i][c]; if (!z) { out += casilla('', tw[c], null); c++; continue; }
        const span = z.cel.colSpan, w = tw.slice(c, c + span).reduce((s, v) => s + v, 0);
        // Bordes también en cada casilla (además de en la tabla): así se ven en cualquier programa.
        const extra = (span > 1 ? `<w:gridSpan w:val="${span}"/>` : '') + (z.cel.rowSpan > 1 ? (z.a === 0 ? '<w:vMerge w:val="restart"/>' : '<w:vMerge/>') : '')
          + `<w:tcBorders>${['top', 'left', 'bottom', 'right'].map(l => `<w:${l} w:val="single" w:sz="4" w:space="0" w:color="${borde}"/>`).join('')}</w:tcBorders>`;
        // La cabecera va siempre unida a la primera fila; en un apartado corto, toda la tabla junta.
        out += casilla(z.a === 0 ? contenido(z.cel, w, { seguir: cab || (o.seguir && !ultima) }) : '', w, cs(z.cel), extra, z.cel);
        c += span;
      }
      out += '</w:tr>';
    });
    return out + '</w:tbl>';
  }
  // Rejillas de la pantalla (cabecera, cifras, dos columnas, firmas): una tabla sin bordes; cada caja con su fondo y su borde.
  function rejilla(el, ancho, o, conBordes, vMargen) {
    const hijos = [...el.children]; if (!hijos.length) return '';
    const fr = hijos.map(h => h.getBoundingClientRect().width || 1), suma = fr.reduce((s, v) => s + v, 0), sep = conBordes ? 80 : 0;
    const ws = fr.map(v => v / suma * ancho);
    return `<w:tbl>${tblPr(ancho, bordes('', 0), margenes(vMargen == null ? 40 : vMargen, 80), sep / 2)}<w:tblGrid>${ws.map(w => `<w:gridCol w:w="${Math.round(w)}"/>`).join('')}</w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>${hijos.map((h, n) => {
      const st = cs(h), b = conBordes ? hex(st.borderTopColor) : '';
      return casilla(contenido(h, ws[n] - 160, o), ws[n], st, (b ? `<w:tcBorders>${['top', 'left', 'bottom', 'right'].map(l => `<w:${l} w:val="single" w:sz="6" w:space="0" w:color="${b}"/>`).join('')}</w:tcBorders>` : ''), h);
    }).join('')}</w:tr></w:tbl>`;
  }
  function elemento(el, ancho, o = {}) {
    const c = el.classList;
    if (c.contains('no-print')) return '';
    if (c.contains('section-title')) return p(runs([...el.childNodes]), cs(el), { seguir: true, pBdr: '<w:pBdr><w:bottom w:val="single" w:sz="10" w:space="1" w:color="1A3A6B"/></w:pBdr>', antes: 220, despues: 80 });
    if (c.contains('sub')) return p(runs([...el.childNodes]), cs(el), { seguir: true, antes: 100, despues: 50 });
    if (c.contains('texto')) {
      const caja = '<w:pBdr>' + ['top', 'left', 'bottom', 'right'].map(l => `<w:${l} w:val="single" w:sz="4" w:space="4" w:color="C5D8EF"/>`).join('') + '</w:pBdr>';
      return el.textContent.split('\n').map(l => p(run(l || ' ', cs(el)), cs(el), { pBdr: caja, shd: 'FAFCFF', seguir: o.seguir })).join('');
    }
    if (c.contains('acta-header')) {
      const st = cs(el.querySelector('.acta-header-top') || el);
      return `<w:tbl>${tblPr(ancho, bordes('1A3A6B', 12), margenes(0, 0))}<w:tblGrid><w:gridCol w:w="${Math.round(ancho)}"/></w:tblGrid>`
        + `<w:tr><w:trPr><w:cantSplit/></w:trPr>${casilla(rejilla(el.querySelector('.acta-header-top'), ancho, o, false, 60), ancho, st)}</w:tr>`
        + `<w:tr><w:trPr><w:cantSplit/></w:trPr>${casilla(rejilla(el.querySelector('.acta-meta'), ancho, o, false, 30), ancho, null)}</w:tr></w:tbl>`;
    }
    if (c.contains('dos-col') || c.contains('firmas-grid')) return rejilla(el, ancho, o, false, 0);
    if (c.contains('stats-grid')) return rejilla(el, ancho, o, true) + p('', null, { despues: 40 });
    if (c.contains('firma-line')) return p('', null, { pBdr: '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="555555"/></w:pBdr>', antes: 700 });
    if (c.contains('bloque')) {
      const xml = contenido(el, ancho, { seguir: !c.contains('largo') });
      return xml.replace(/<w:keepNext\/>(?![\s\S]*<w:keepNext\/>)/, '');   // el final del apartado no arrastra al siguiente
    }
    return contenido(el, ancho, o);
  }
  const cuerpo = [...doc.querySelector('.page').children].map(el => elemento(el, _AE_DOCX_ANCHO)).join('');
  const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  return [
    ['[Content_Types].xml', xml + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'],
    ['_rels/.rels', xml + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ['word/_rels/document.xml.rels', xml + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
    ['word/document.xml', xml + `<w:document ${W}><w:body>${cuerpo}<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="1701" w:right="1701" w:bottom="1701" w:left="1701" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>`],
    ['word/styles.xml', xml + `<w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/><w:sz w:val="17"/><w:szCs w:val="17"/><w:lang w:val="es-ES"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblCellMar><w:left w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>`],
  ];
}
// El botón «📄 Exportar a Word» del acta (en su vista) llama aquí con su documento ya dibujado.
window._aeExportarDocx = function(doc, nombre) {
  try { _tGuardarArchivo(_aeZip(_aeDocxXml(doc)), nombre || 'Acta_de_evaluacion.docx'); }
  catch (e) { mostrarAviso('No se ha podido crear el documento de Word: ' + (e.message || e)); }
};

window.generarActaEvaluacion = function(nivel, grupo, k) {
  k = String(k || (typeof _sesEvalPropuesta === 'function' ? _sesEvalPropuesta(nivel) : '1'));
  if (!data[nivel]?.[grupo]) return;
  const w = _ventanaDoc(); w.document.write(actaEvaluacionHTML(nivel, grupo, k)); w.document.close();
};
// Nombre de siempre del botón de la sesión.
window.generarActaSesion = window.generarActaEvaluacion;

/* ---------------- Actas antiguas del Calendario (solo consulta) ---------------- */
function _aeHayActaAntigua(nivel, grupo, k) { return typeof _actaGetGuardada === 'function' && !!_actaGetGuardada(nivel, grupo, +k); }
window.verActaAntigua = function(nivel, grupo, k) {
  const g = _actaGetGuardada(nivel, grupo, +k); if (!g) return;
  const div = document.createElement('div'); div.innerHTML = _tHtmlSeguro(g.html);
  div.querySelectorAll('[contenteditable]').forEach(e => e.removeAttribute('contenteditable'));
  div.querySelectorAll('.no-print, .acta-addrow-row, button').forEach(e => e.remove());
  div.querySelectorAll('input').forEach(e => { const s = document.createElement('span'); s.textContent = e.value; e.replaceWith(s); });
  div.querySelectorAll('select').forEach(e => { const s = document.createElement('span'); s.textContent = e.options[e.selectedIndex]?.text || ''; e.replaceWith(s); });
  let cuando = ''; try { cuando = new Date(g.savedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) {}
  const w = _ventanaDoc();
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Acta antigua (${_AE_CORTO[k]}) — ${_tEsc(nivel)} ${_tEsc(grupo)}</title><style>${_actaReportCss()}
    .aviso-antigua{font:13px Arial,sans-serif;background:#fef9c3;border-bottom:1px solid #fde68a;padding:8px 16px;color:#713f12}@media print{.aviso-antigua{display:none}}</style></head><body>
    <div class="aviso-antigua">📂 Acta guardada${cuando ? ' el ' + _tEsc(cuando) : ''} con el modelo anterior (solo consulta). Las actas nuevas salen de «🎓 Sesión de evaluación».</div>${div.innerHTML}</body></html>`);
  w.document.close();
};

/* ---------------- Botón «📋 Acta de evaluación» del grupo ---------------- */
window.openActaMenu = function(nivel, grupo) {
  let m = document.getElementById('actaMenuOverlay');
  if (!m) {
    m = document.createElement('div'); m.id = 'actaMenuOverlay'; m.className = 'modal-overlay'; m.style.zIndex = '610';
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
    document.body.appendChild(m);
  }
  const cerrar = `document.getElementById('actaMenuOverlay').classList.remove('open')`;
  const antiguas = ['1', '2', '3'].filter(k => _aeHayActaAntigua(nivel, grupo, k));
  m.innerHTML = `
    <div class="modal" style="width:380px" role="dialog" aria-modal="true" aria-labelledby="actaMenuT">
      <div class="modal-title" id="actaMenuT">📋 Acta de evaluación</div>
      <p style="font-size:12px;color:var(--text2);margin-bottom:16px;line-height:1.6">Se rellena en <strong>🎓 Sesión de evaluación</strong> (asistencia, propuestas, acuerdos y lo de cada alumno/a) y sale con todo lo que pide el acta del centro.</p>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${['1', '2', '3'].map(k => `<button class="btn btn-primary" onclick="${cerrar};generarActaEvaluacion('${jsAttr(nivel)}','${jsAttr(grupo)}','${k}')">📄 Acta ${k === '3' ? 'Evaluación Final' : _AE_CORTO[k] + ' Evaluación'}</button>`).join('')}
        <button class="btn btn-ghost" onclick="${cerrar};openSesionEvaluacion('${jsAttr(nivel)}','${jsAttr(grupo)}')">🎓 Abrir la sesión de evaluación</button>
        <button class="btn btn-ghost" onclick="${cerrar};abrirActaCalificaciones('${jsAttr(nivel)}','${jsAttr(grupo)}')" title="La nota de cada alumno/a en cada materia, como el acta de Itaca">📑 Acta de calificaciones (notas por materia)</button>
        ${antiguas.length ? `<div style="font-size:11.5px;color:var(--text3);margin-top:6px">Actas guardadas con el modelo anterior (solo consulta):</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">${antiguas.map(k => `<button class="btn btn-ghost btn-sm" onclick="${cerrar};verActaAntigua('${jsAttr(nivel)}','${jsAttr(grupo)}','${k}')">📂 ${k === '3' ? 'Final' : _AE_CORTO[k] + ' Ev.'}</button>`).join('')}</div>` : ''}
      </div>
      <div class="modal-actions" style="margin-top:16px"><button class="btn btn-ghost" onclick="${cerrar}">Cancelar</button></div>
    </div>`;
  m.classList.add('open');
};
// Nombre antiguo del botón (por si algo lo sigue llamando).
window.openActaOficialMenu = window.openActaMenu;
