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
    if (typeof markDirty === 'function') markDirty();
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
    evolucion = sec('Evolución respecto a la evaluación anterior') + `<div class="stats-grid tres">
      <div class="stat-box"><div class="sv">${mPrev.toFixed(2).replace('.', ',')}</div><div class="sl">Media de suspensas · ${etqPrev}</div></div>
      <div class="stat-box"><div class="sv">${mAct.toFixed(2).replace('.', ',')}</div><div class="sl">Media de suspensas · ${_AE_NOMBRE[k]}</div></div>
      <div class="stat-box ${dlt < 0 ? 'green' : dlt > 0 ? 'red' : 'yellow'}"><div class="sv">${dlt > 0 ? '+' : ''}${dlt.toFixed(2).replace('.', ',')}</div><div class="sl">${dlt < 0 ? 'Mejora' : dlt > 0 ? 'Empeora' : 'Sin cambios'}</div></div></div>`;
  }
  const analisis = _AE_ANALISIS.filter(([clave]) => clave !== 'cohesion' || k === '1' || String(acta.analisis.cohesion || '').trim());

  const titulo = `Acta de ${final ? 'la Evaluación Final' : 'la ' + _AE_NOMBRE[k]} — ${nivel} ${grupo}`;
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${esc(titulo)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; color: #111; background:#fff; }
  .page { padding: 14mm 16mm; max-width: 210mm; margin: 0 auto; }
  .acta-header { border: 2px solid #1a3a6b; border-radius: 4px; margin-bottom: 14px; overflow: hidden; }
  .acta-header-top { background: #1a3a6b; color: #fff; padding: 8px 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .acta-header-title { font-size: 13pt; font-weight: bold; letter-spacing: .3px; }
  .acta-header-badge { background: rgba(255,255,255,.2); border: 1px solid rgba(255,255,255,.4); border-radius: 4px; padding: 3px 10px; font-size: 10pt; font-weight: bold; white-space: nowrap; }
  .acta-meta { display: grid; grid-template-columns: 1fr 1fr 1fr; }
  .acta-meta-cell { padding: 7px 14px; border-right: 1px solid #c5d8ef; border-top: 1px solid #c5d8ef; font-size: 9.5pt; }
  .acta-meta-cell:nth-child(3n) { border-right: none; }
  .acta-meta-label { color: #5a6a8a; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 2px; }
  .acta-meta-value { font-weight: bold; color: #1a2a4a; }
  .section-title { font-size: 9pt; font-weight: bold; text-transform: uppercase; letter-spacing: .6px; color: #1a3a6b; border-bottom: 2px solid #1a3a6b; padding-bottom: 4px; margin: 18px 0 8px; }
  .section-title span { background: #1a3a6b; color: #fff; padding: 1px 8px; border-radius: 3px; margin-right: 8px; }
  .sub { font-size: 9pt; font-weight: bold; color: #1a3a6b; margin: 10px 0 5px; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th { background: #dce8f5; font-weight: bold; padding: 5px 8px; border: 1px solid #9ab5d4; text-align: left; color: #1a3a6b; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .3px; }
  td { padding: 5px 8px; border: 1px solid #c0d0e0; vertical-align: top; }
  tr:nth-child(even) td { background: #f8faff; }
  th.c, td.c { text-align: center; }
  td.grupo-etq { background: #dce8f5 !important; font-weight: bold; color: #1a3a6b; width: 24%; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
  .stats-grid.tres { grid-template-columns: repeat(3, 1fr); }
  .stat-box { border: 1px solid #c5d8ef; border-radius: 5px; padding: 8px 10px; text-align: center; background: #f8faff; }
  .stat-box .sv { font-size: 18pt; font-weight: bold; line-height: 1.1; }
  .stat-box .sl { font-size: 8pt; color: #5a6a8a; margin-top: 2px; }
  .stat-box.green { border-color: #86efac; background: #f0fdf4; } .stat-box.green .sv { color: #166534; }
  .stat-box.red { border-color: #fca5a5; background: #fef2f2; } .stat-box.red .sv { color: #991b1b; }
  .stat-box.yellow { border-color: #fde68a; background: #fefce8; } .stat-box.yellow .sv { color: #92400e; }
  .stat-box.blue { border-color: #93c5fd; } .stat-box.blue .sv { color: #1e40af; }
  .chip { display: inline-block; background: #fee2e2; border: 1px solid #fecaca; border-radius: 3px; padding: 0 4px; font-size: 8pt; margin: 1px; }
  .chip.roja { background: #fde68a55; border-color: #fde68a; }
  .tag { display: inline-block; border: 1px solid #c5d8ef; border-radius: 3px; padding: 0 4px; font-size: 7.5pt; color: #1a3a6b; background: #eef4ff; font-weight: normal; }
  .tag.nese { color: #92400e; border-color: #fde68a; background: #fefce8; }
  .ok { color: #166534; } .mal { color: #991b1b; } .aviso { color: #b45309; } .gris { color: #6b7280; }
  .pequeno { font-size: 8.5pt; white-space: pre-wrap; }
  .texto { border: 1.5px solid #c5d8ef; border-radius: 5px; padding: 8px 12px; background: #fafcff; white-space: pre-wrap; line-height: 1.6; }
  .vacio { color: #9aa3bb; font-style: italic; font-size: 9pt; }
  .barra { background: #f1f5f9; border-radius: 4px; height: 10px; overflow: hidden; } .barra div { height: 10px; background: #ef4444; }
  .leyenda { font-size: 8pt; color: #3a4560; margin-top: 6px; line-height: 1.7; background: #f8faff; border: 1px solid #e2e8f5; border-radius: 5px; padding: 8px 10px; }
  .firmas-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 30px; }
  .firma-block { text-align: center; }
  .firma-line { border-bottom: 1.5px solid #555; height: 46px; margin-bottom: 4px; }
  .firma-label { font-size: 8.5pt; color: #5a6a8a; text-transform: uppercase; letter-spacing: .4px; }
  .firma-name { font-size: 9pt; font-weight: bold; color: #1a2a4a; margin-top: 2px; min-height: 14px; }
  .pie { text-align: right; margin-top: 12px; font-size: 8.5pt; color: #888; }
  .acta-toolbar { position: sticky; top: 0; z-index: 50; background: #1a1d27; padding: 9px 20px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .acta-toolbar span { font-size: 12.5px; color: #c8cde0; }
  .toolbar-btn { padding: 7px 14px; border-radius: 7px; border: none; cursor: pointer; font-family: Arial; font-size: 12px; font-weight: 600; background: #8a63d2; color: #fff; }
  @media print { @page { margin: 12mm 14mm; size: A4; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } tr { page-break-inside: avoid; } .salto { page-break-before: always; } }
</style></head><body>
<div class="acta-toolbar no-print"><span>📋 Se rellena en «🎓 Sesión de evaluación»: para cambiar algo, vuelve allí y genera el acta de nuevo.</span>
  <button class="toolbar-btn" onclick="_aeWord()">📄 Exportar a Word</button></div>
<div class="page">
  <div class="acta-header">
    <div class="acta-header-top">
      <div><div style="font-size:9pt;opacity:.8;letter-spacing:1px;text-transform:uppercase;margin-bottom:2px">Generalitat Valenciana · Conselleria d'Educació</div>
        <div class="acta-header-title">ACTA DE ${final ? 'LA EVALUACIÓN FINAL' : 'LA ' + _AE_NOMBRE[k].toUpperCase()}</div></div>
      <div class="acta-header-badge">${bach ? 'Bachillerato' : 'ESO'} · Evaluación ${_AE_CORTO[k]}</div>
    </div>
    <div class="acta-meta">
      <div class="acta-meta-cell"><div class="acta-meta-label">Centro educativo</div><div class="acta-meta-value">${esc(ies) || '&nbsp;'}</div></div>
      <div class="acta-meta-cell"><div class="acta-meta-label">Nivel y grupo</div><div class="acta-meta-value">${esc(nivel)} — Grupo ${esc(grupo)}</div></div>
      <div class="acta-meta-cell"><div class="acta-meta-label">Tutor/a</div><div class="acta-meta-value">${esc(tutor) || '&nbsp;'}</div></div>
      <div class="acta-meta-cell"><div class="acta-meta-label">Fecha de la sesión</div><div class="acta-meta-value">${esc(fecha) || '&nbsp;'}</div></div>
      <div class="acta-meta-cell"><div class="acta-meta-label">Horario</div><div class="acta-meta-value">${acta.horaInicio ? esc(acta.horaInicio) + (acta.horaFin ? ' – ' + esc(acta.horaFin) : '') : '&nbsp;'}</div></div>
      <div class="acta-meta-cell"><div class="acta-meta-label">Curso escolar</div><div class="acta-meta-value">${_tCursoActual(' – ')} · ${total} alumnos</div></div>
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

  ${sec('Profesorado asistente a la sesión')}
  ${d.profesores.length ? `<table><thead><tr><th class="c" style="width:5%">#</th><th style="width:34%">Profesor/a</th><th>Materia que imparte</th><th style="width:28%">Asistencia</th></tr></thead><tbody>${filasProf}</tbody></table>
  <div class="vacio" style="margin-top:4px;font-style:normal">${nAsisten} de ${d.profesores.length} asisten.</div>` : ninguno('No hay equipo docente registrado (👨‍🏫 Equipo docente).')}

  ${sec('Relación de alumnado y resultados')}
  <table><thead><tr><th class="c" style="width:4%">Nº</th><th style="width:22%">Alumno/a</th><th class="c" style="width:7%">Mat. no sup.</th><th>Materias no superadas</th>${final ? '<th style="width:15%">Pend. cursos ant.</th>' : ''}<th style="width:13%">${esc(c.propEtq)}</th><th style="width:20%">Acuerdos</th></tr></thead>
    <tbody>${filasAl || '<tr><td colspan="7" class="vacio">Sin alumnado</td></tr>'}</tbody></table>

  ${sec(final ? 'Resumen de decisiones' : 'Resumen de propuestas')}
  <table style="max-width:460px"><thead><tr><th>${final ? 'Decisión' : 'Propuesta'}</th><th class="c">Alumnos</th><th class="c">%</th></tr></thead><tbody>
    ${['Promoción', 'Titulación', 'Repetición', 'Abandono', 'Sin decidir'].filter(t => tipos[t]).map(t => `<tr><td class="${colorProp(t === 'Sin decidir' ? '' : t)}"><strong>${t}</strong></td><td class="c">${tipos[t]}</td><td class="c">${pct(tipos[t])}</td></tr>`).join('') || '<tr><td colspan="3" class="vacio">—</td></tr>'}
  </tbody></table>

  ${sec('Análisis de resultados académicos del grupo')}
  <table style="max-width:560px"><thead><tr><th>Información relevante</th><th class="c">Alumnos</th><th class="c">%</th></tr></thead><tbody>
    <tr><td>Alumnado con todo aprobado</td><td class="c"><strong>${cero}</strong></td><td class="c">${pct(cero)}</td></tr>
    <tr><td>Alumnado con 1 o 2 materias no superadas</td><td class="c"><strong>${unaDos}</strong></td><td class="c">${pct(unaDos)}</td></tr>
    <tr><td>Alumnado con 3 a 5 materias no superadas</td><td class="c"><strong>${tresCinco}</strong></td><td class="c">${pct(tresCinco)}</td></tr>
    <tr><td>Alumnado con más de 5 materias no superadas</td><td class="c"><strong>${masCinco}</strong></td><td class="c">${pct(masCinco)}</td></tr>
  </tbody></table>
  <div class="sub">Materias con más del 50 % de suspensos</div>
  ${mitad.length ? `<div>${mitad.map(([m, v]) => `<span class="chip">${esc(m)} (${v} · ${pct(v)})</span>`).join(' ')}</div>` : ninguno('Ninguna')}
  <div class="sub">Materias con más alumnado suspenso</div>
  ${ranking.length ? `<table style="max-width:560px"><thead><tr><th>Materia</th><th class="c" style="width:80px">Suspensos</th><th style="width:170px">&nbsp;</th></tr></thead><tbody>
    ${ranking.map(([m, v]) => `<tr><td>${esc(m)}</td><td class="c"><strong class="mal">${v}</strong></td><td><div class="barra"><div style="width:${Math.round(v / ranking[0][1] * 100)}%"></div></div></td></tr>`).join('')}</tbody></table>` : ninguno('✓ No hay materias con alumnado suspenso en esta evaluación.')}

  ${evolucion}

  ${sec('Relación de alumnado con dificultades (casos particulares)', 'salto')}
  ${casos ? `<table><thead><tr><th>Problemática</th><th style="width:24%">Alumno/a</th><th style="width:20%">Áreas / materias</th><th>Medidas a tomar</th></tr></thead><tbody>${casos}</tbody></table>` : ninguno('No se ha señalado ningún caso particular.')}

  ${sec('Alumnado repetidor')}
  ${reps.length ? `<table><thead><tr><th style="width:34%">Alumno/a</th><th>Valoración de la repetición</th></tr></thead><tbody>${reps.map(a => `<tr><td><strong>${esc(a.nombre)}</strong></td><td class="pequeno">${esc(ses(a).valoracionRepeticion || '')}</td></tr>`).join('')}</tbody></table>` : ninguno('No hay alumnado repetidor.')}

  ${!bach && k !== '1' ? `${sec((final ? 'Propuesta' : 'Primera propuesta') + ' de alumnado para programas de atención a la diversidad grupal — Nivel III')}
  <table><thead><tr>${_AE_PROGRAMAS.slice(0, 3).map(p => `<th style="width:33%">${esc(p)}</th>`).join('')}</tr></thead><tbody><tr>
    ${_AE_PROGRAMAS.slice(0, 3).map(p => `<td>${prog(p).map(a => `<div><strong>${esc(a.nombre)}</strong>${ses(a).programaMotivo ? `<br><span class="pequeno gris">${esc(ses(a).programaMotivo)}</span>` : ''}</div>`).join('') || '<span class="vacio">—</span>'}</td>`).join('')}</tr></tbody></table>
  <div class="sub">Propuesta de alumnado para FPB</div>
  ${prog('FPB').length ? `<table><thead><tr><th style="width:34%">Alumno/a</th><th>Motivo</th><th style="width:28%">Familia profesional (FPB)</th></tr></thead><tbody>${prog('FPB').map(a => `<tr><td><strong>${esc(a.nombre)}</strong></td><td class="pequeno">${esc(ses(a).programaMotivo || '')}</td><td>${esc(ses(a).fpbFamilia || '')}</td></tr>`).join('')}</tbody></table>` : ninguno('Ninguna')}` : ''}

  ${final && !bach ? `${sec('Permanencia un año más: deben elaborar Plan de Repetición')}
  ${repiten.length ? `<table><thead><tr><th style="width:30%">Alumno/a</th><th style="width:35%">Materias no superadas</th><th>Motivos de la no promoción</th></tr></thead><tbody>${repiten.map(a => `<tr><td><strong>${esc(a.nombre)}</strong></td><td>${chips(pend(a))}</td><td class="pequeno">${esc(ses(a).motivoNoPromocion || '')}</td></tr>`).join('')}</tbody></table>` : ninguno('Nadie')}
  ${sec('Alumnado que promociona con materias pendientes: deben elaborar Plan de Refuerzo')}
  ${refuerzo.length ? `<table><thead><tr><th style="width:34%">Alumno/a</th><th>Materias no superadas</th></tr></thead><tbody>${refuerzo.map(a => `<tr><td><strong>${esc(a.nombre)}</strong></td><td>${chips(pend(a))}</td></tr>`).join('')}</tbody></table>` : ninguno('Nadie')}` : ''}
  ${final && bach ? `${sec('Alumnado con materias para la evaluación extraordinaria')}
  ${extr.length ? `<table><thead><tr><th style="width:34%">Alumno/a</th><th class="c" style="width:10%">Nº mat.</th><th>Materias</th></tr></thead><tbody>${extr.map(a => `<tr><td><strong>${esc(a.nombre)}</strong></td><td class="c">${susp(a)}</td><td>${chips(pend(a))}</td></tr>`).join('')}</tbody></table>` : ninguno('Nadie')}
  ${repiten.length ? `<div class="sub">No promocionan / no titulan</div><table><thead><tr><th style="width:34%">Alumno/a</th><th>Motivos</th></tr></thead><tbody>${repiten.map(a => `<tr><td><strong>${esc(a.nombre)}</strong></td><td class="pequeno">${esc(ses(a).motivoNoPromocion || '')}</td></tr>`).join('')}</tbody></table>` : ''}` : ''}
  ${final ? `${sec('Propuesta de agrupación para el próximo curso')}
  ${agrupa.length ? `<table><thead><tr><th style="width:30%">Alumno/a</th><th style="width:35%">Materias no superadas</th><th>Observaciones</th></tr></thead><tbody>${agrupa.map(a => `<tr><td><strong>${esc(a.nombre)}</strong></td><td>${chips(pend(a))}</td><td class="pequeno">${esc(ses(a).agrupacion)}</td></tr>`).join('')}</tbody></table>` : ninguno('Sin observaciones')}` : ''}

  ${sec('Materias pendientes de cursos anteriores — decisión adoptada', 'salto')}
  ${conPendAnt.length ? `<table><thead><tr><th style="width:24%">Alumno/a</th><th style="width:22%">Materia pendiente</th><th style="width:19%">Estado</th><th class="c" style="width:8%">Nota</th><th>Motivo / observaciones</th></tr></thead><tbody>
    ${conPendAnt.map(a => (a.pendientesAnteriores || []).map((m, j) => { const v = _aePendAnt(a, k, m); return `<tr>${j === 0 ? `<td rowspan="${a.pendientesAnteriores.length}"><strong>${esc(a.nombre)}</strong></td>` : ''}<td>${esc(m)}</td><td class="${v.estado === 'Recuperada' ? 'ok' : v.estado === 'No recuperada' ? 'mal' : 'aviso'}">${esc(v.estado)}</td><td class="c">${esc(v.nota)}</td><td class="pequeno">${esc(v.motivo)}</td></tr>`; }).join('')).join('')}</tbody></table>`
    : ninguno('✓ Ningún alumno/a tiene materias pendientes de cursos anteriores.')}

  ${sec('Alumnado NESE y de Compensatoria')}
  ${neseAl.length ? `<table><thead><tr><th style="width:28%">Alumno/a</th><th class="c" style="width:12%">Recurso</th><th style="width:16%">Cód. Comp.</th><th>Medidas adoptadas / observaciones</th></tr></thead><tbody>
    ${neseAl.map(a => `<tr><td><strong>${esc(a.nombre)}</strong></td><td class="c">${esc(_getNeseCodes(a.recursoNese).join(' / ')) || '—'}</td><td>${esc(Array.isArray(a.codComp) ? a.codComp.join(', ') : (a.codComp || '')) || '—'}</td><td class="pequeno">${esc(ses(a).medidasNese || '')}</td></tr>`).join('')}</tbody></table>
  ${leyenda.length || usaAL || usaPT ? `<div class="leyenda"><strong>Leyenda</strong>${usaAL ? '<br><strong>AL</strong> = Audición y Lenguaje' : ''}${usaPT ? '<br><strong>PT</strong> = Pedagogía Terapéutica' : ''}${leyenda.map(x => `<br><strong>${esc(x.code)}</strong> = ${esc(x.label)}`).join('')}</div>` : ''}`
    : ninguno('Sin alumnado con medidas de atención específica.')}

  ${sec('Faltas de asistencia y convivencia')}
  <div class="stats-grid" style="grid-template-columns:repeat(5,1fr)">
    <div class="stat-box blue"><div class="sv">${tot.fj}</div><div class="sl">Faltas justificadas</div></div>
    <div class="stat-box red"><div class="sv">${tot.fi}</div><div class="sl">Faltas sin justificar</div></div>
    <div class="stat-box yellow"><div class="sv">${tot.ac}</div><div class="sl">Amonestaciones (AC)</div></div>
    <div class="stat-box red"><div class="sv">${tot.pa}</div><div class="sl">Partes</div></div>
    <div class="stat-box red"><div class="sv">${tot.ex}</div><div class="sl">Expedientes</div></div>
  </div>
  ${conIncid.length ? `<table><thead><tr><th style="width:30%">Alumno/a</th><th class="c">F. just.</th><th class="c">F. sin just.</th><th class="c">AC</th><th class="c">Partes</th><th class="c">Expedientes</th></tr></thead><tbody>
    ${conIncid.map(a => `<tr><td><strong>${esc(a.nombre)}</strong></td>${Object.values(conv).map(b => `<td class="c">${cv(a, b) ? `<strong>${cv(a, b)}</strong>` : '0'}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    : ninguno('✓ No hay faltas ni incidencias registradas en esta evaluación.')}

  ${sec('Análisis general del grupo', 'salto')}
  <table><thead><tr><th style="width:32%">Aspecto</th><th>Valoración</th></tr></thead><tbody>
    ${analisis.map(([clave, etq]) => `<tr><td><strong>${esc(etq)}</strong></td><td class="pequeno">${esc(acta.analisis[clave] || '')}</td></tr>`).join('')}</tbody></table>
  <div class="sub">Valoración general del grupo</div>
  ${parrafo(acta.valoracion)}

  ${sec('Propuestas de mejora y acuerdos adoptados por el equipo docente')}
  ${parrafo(acta.acuerdosGrupo)}

  ${sec('Firmas')}
  <div class="firmas-grid">
    <div class="firma-block"><div class="firma-line"></div><div class="firma-label">Tutor/a del grupo</div><div class="firma-name">${esc(tutor)}</div></div>
    <div class="firma-block"><div class="firma-line"></div><div class="firma-label">Jefe/a de Estudios</div><div class="firma-name">${esc(acta.jefeEstudios || '')}</div></div>
    <div class="firma-block"><div class="firma-line"></div><div class="firma-label">Director/a del centro</div><div class="firma-name">${esc(acta.director || '')}</div></div>
  </div>
  <div class="pie">Generado el ${esc(new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }))} · Gestor de Tutoría${ies ? ' · ' + esc(ies) : ''}</div>
</div>
<script>
// Word no entiende la rejilla (grid): cabecera, cifras y firmas pasan a tablas antes de exportar.
function _aeWord() {
  var clon = document.querySelector('.page').cloneNode(true);
  var rejilla = function (cont, sel, porFila) {
    if (!cont) return; var items = Array.prototype.filter.call(cont.children, function (e) { return e.matches(sel); }); if (!items.length) return;
    var t = document.createElement('table'); t.style.cssText = 'width:100%;border-collapse:collapse;table-layout:fixed;';
    for (var i = 0; i < items.length; i += porFila) { var tr = document.createElement('tr');
      for (var j = i; j < Math.min(i + porFila, items.length); j++) { var td = document.createElement('td'); td.className = items[j].className; td.style.cssText = 'vertical-align:top;border:none;padding:3px;'; td.innerHTML = items[j].innerHTML; tr.appendChild(td); }
      t.appendChild(tr); }
    cont.parentNode.replaceChild(t, cont);
  };
  rejilla(clon.querySelector('.acta-meta'), '.acta-meta-cell', 3);
  Array.prototype.forEach.call(clon.querySelectorAll('.stats-grid'), function (g) { rejilla(g, '.stat-box', 4); });
  rejilla(clon.querySelector('.firmas-grid'), '.firma-block', 3);
  var css = document.querySelector('style').textContent;
  var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>' + document.title + '</title><style>@page Section1 { size: 21cm 29.7cm; margin: 1.2cm 1.4cm 1.8cm 1.4cm; } div.Section1 { page: Section1; } ' + css + '</style></head><body><div class="Section1">' + clon.outerHTML + '</div></body></html>';
  var u = URL.createObjectURL(new Blob(['\\ufeff', html], { type: 'application/msword' }));
  var a = document.createElement('a'); a.href = u; a.download = document.title.replace(/[^a-zA-Z0-9ÁÉÍÓÚÑÜáéíóúñü]+/g, '_') + '.doc'; document.body.appendChild(a); a.click();
  setTimeout(function () { a.remove(); URL.revokeObjectURL(u); }, 300);
}
<\/script>
</body></html>`;
}
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
