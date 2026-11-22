/* ============================================================================
   Gestor de Tutoría · 📊 Informe para el equipo docente (HTML)
   tutoria/js/27-informe-equipo.js
   ============================================================================

   Un archivo .html (sin scripts, se abre en cualquier navegador, el móvil o
   impreso) para que el profesorado llegue a la junta con los datos del grupo:
     - resumen del grupo y distribución de materias suspensas;
     - cada alumno/a: cuántas y qué materias suspende, cambio respecto a la
       evaluación anterior, faltas y convivencia, medidas, alertas y lo que han
       comentado las demás materias;
     - cada materia: cuántos suspenden y quiénes, % del grupo, nota media
       (si ha llegado del Cuaderno) y cambio; las que tienen más y menos;
     - casos para comentar en la sesión, convivencia y atención a la diversidad.
   VERSIÓN PREVIA o TRAS LA SESIÓN: en cuanto hay algo de la sesión de
   evaluación (alumnado revisado, valoración o acuerdos), el informe añade la
   propuesta y los acuerdos de cada alumno/a y los del grupo.
   No lleva contactos de las familias ni entrevistas.
*/

const _IE_PREV = { '2': { n: 'eval1', pend: 'pendientes1' }, '3': { n: 'eval2', pend: 'pendientes2' } };

function _ieMateriasGrupo(nivel, grupo, k) {
  const out = [];
  const add = m => { m = String(m || '').trim(); if (m && _tNorm(m) !== 'tutoria' && !out.some(x => _tNorm(x) === _tNorm(m))) out.push(m); };
  _qmfMateriasDelGrupo(nivel, grupo).forEach(add);
  (data[nivel]?.[grupo] || []).forEach(a => {
    (a[_SES_CAMPOS[k].pend] || []).forEach(add);
    if (_IE_PREV[k]) (a[_IE_PREV[k].pend] || []).forEach(add);
  });
  return out.sort((x, y) => x.localeCompare(y, 'es'));
}
function _ieTiene(lista, m) { return (lista || []).some(x => _tNorm(x) === _tNorm(m)); }
// ¿Hay ya algo de la sesión de evaluación? Entonces el informe es el de «tras la sesión».
function _ieTrasSesion(nivel, grupo, k) {
  const acta = ((_getAsistenciaData(nivel, grupo).actasSesion) || {})[k] || {};
  return !!(acta.valoracion || acta.acuerdosGrupo) || (data[nivel]?.[grupo] || []).some(a => ((a.sesionEval || {})[k] || {}).revisado);
}

/* Todos los números del informe, sin HTML (también los usan las pruebas). */
function datosInformeEquipo(nivel, grupo, k) {
  k = String(k);
  const c = _SES_CAMPOS[k], prev = _IE_PREV[k], alumnos = (data[nivel]?.[grupo] || []).filter(a => (a.nombre || '').trim());
  const periodo = c.periodo, profes = _getAsistenciaData(nivel, grupo).profesores;
  const alum = alumnos.map(a => {
    const sus = +a[c.n] || 0, antes = prev ? (+a[prev.n] || 0) : null;
    const al = typeof _alertasAlumno === 'function' ? _alertasSerias(_alertasAlumno(a, nivel)) : [];
    const coms = Object.keys(a.porMateria || {}).sort((x, y) => x.localeCompare(y, 'es'))
      .map(m => ({ materia: m, texto: ((a.porMateria[m].comentarios || {})[periodo]) || ((a.porMateria[m].comentarios || {})[k]) || '' })).filter(x => x.texto);
    const medidas = [a.nese === 'Sí' ? 'NESE' + (_getNeseCodes(a.recursoNese).length ? ' (' + _getNeseCodes(a.recursoNese).join(', ') + ')' : '') : '',
      a.compensatoria === 'Sí' ? 'Compensatoria' : '', a.repetidor === 'Sí' ? 'Repite' : '', a.papActivo ? 'PAP' : '', a.ecActivo ? 'Enriquecimiento' : ''].filter(Boolean);
    return { a, nombre: a.nombre, sus, materias: a[c.pend] || [], antes, cambio: antes == null ? null : sus - antes, alertas: al, comentarios: coms, medidas,
      pendientesAnt: a.pendientesAnteriores || [], fj: +a['faltasJust' + k] || 0, fi: +a['faltasInjust' + k] || 0, ac: +a['ac' + k] || 0, pa: +a['partes' + k] || 0, ex: +a['expedientes' + k] || 0,
      propuesta: getPropObj(a[c.prop]), acuerdos: ((a.sesionEval || {})[k] || {}).acuerdos || '' };
  });
  const mats = _ieMateriasGrupo(nivel, grupo, k).map(m => {
    const susp = alum.filter(x => _ieTiene(x.materias, m));
    const antes = prev ? alumnos.filter(a => _ieTiene(a[prev.pend], m)).length : null;
    const notas = alumnos.map(a => { const d = Object.entries(a.porMateria || {}).find(([mm]) => _tNorm(mm) === _tNorm(m)); return d ? (d[1].notas || {})[periodo] : undefined; }).filter(n => typeof n === 'number');
    const p = profes.find(x => _tNorm(x.materia) === _tNorm(m));
    return { materia: m, profesor: p ? p.nombre : '', suspensos: susp.length, quienes: susp.map(x => x.nombre), antes,
      pct: alumnos.length ? Math.round(susp.length / alumnos.length * 100) : 0,
      media: notas.length ? Math.round(notas.reduce((s, n) => s + n, 0) / notas.length * 100) / 100 : null, conNota: notas.length };
  });
  const dist = [0, 1, 2, 3, 4, 5].map(n => alum.filter(x => n < 5 ? x.sus === n : x.sus >= 5).length);
  const conSusp = mats.filter(m => m.suspensos > 0).sort((x, y) => y.suspensos - x.suspensos || x.materia.localeCompare(y.materia, 'es'));
  const casos = alum.map(x => {
    const r = [];
    if (x.sus >= 3) r.push(`${x.sus} materias suspensas`);
    if (x.cambio != null && x.cambio >= 2) r.push(`empeora (de ${x.antes} a ${x.sus})`);
    x.alertas.filter(al => !['suspensas', 'empeora'].includes(al.clave)).forEach(al => r.push(al.texto));
    return { nombre: x.nombre, razones: r };
  }).filter(x => x.razones.length);
  return {
    nivel, grupo, k, nombreEval: FT_NOMBRE_EVAL[k], fecha: getDates(nivel)['eval' + k] || '', tutor: tutores[`${nivel}-${grupo}`] || '',
    ies: document.getElementById('headerIesName')?.value || '', trasSesion: _ieTrasSesion(nivel, grupo, k),
    acta: ((_getAsistenciaData(nivel, grupo).actasSesion) || {})[k] || {},
    total: alum.length, alumnos: alum, materias: mats, dist,
    todoAprobado: dist[0], unaDos: dist[1] + dist[2], tresMas: dist[3] + dist[4] + dist[5],
    media: alum.length ? Math.round(alum.reduce((s, x) => s + x.sus, 0) / alum.length * 10) / 10 : 0,
    // «Menos suspensos» (con alguno): sin repetir las que ya salen en «más suspensos».
    mas: conSusp.slice(0, 3), menos: conSusp.slice(3).reverse().slice(0, 3), sinSuspensos: mats.filter(m => m.suspensos === 0).map(m => m.materia),
    mejoran: prev ? alum.filter(x => x.cambio < 0).length : null, empeoran: prev ? alum.filter(x => x.cambio > 0).length : null, igual: prev ? alum.filter(x => x.cambio === 0).length : null,
    casos,
    faltas: { j: alum.reduce((s, x) => s + x.fj, 0), i: alum.reduce((s, x) => s + x.fi, 0), ac: alum.reduce((s, x) => s + x.ac, 0), pa: alum.reduce((s, x) => s + x.pa, 0), ex: alum.reduce((s, x) => s + x.ex, 0) },
  };
}

function informeEquipoHTML(nivel, grupo, k) {
  const D = datosInformeEquipo(nivel, grupo, k), e = _tEsc;
  const pct = n => D.total ? Math.round(n / D.total * 100) : 0;
  const coma = v => String(v).replace('.', ',');
  const cambio = v => v == null ? '' : v > 0 ? `<span class="peor">▲ +${v}</span>` : v < 0 ? `<span class="mejor">▼ ${v}</span>` : '<span class="igual">=</span>';
  const prop = p => [p.tipo, p.destino].filter(Boolean).map(e).join(' → ');
  const maxDist = Math.max(1, ...D.dist);
  const barras = D.dist.map((n, i) => `<div class="barra"><span class="etq">${i < 5 ? i : '5 o más'}</span><span class="pista"><span class="relleno${i >= 3 ? ' mal' : ''}" style="width:${Math.round(n / maxDist * 100)}%"></span></span><span class="num">${n}</span></div>`).join('');
  const filasAlumnos = D.alumnos.map((x, i) => `<tr${x.sus >= 3 ? ' class="destacar"' : ''}>
      <td>${i + 1}</td>
      <td><strong>${e(x.nombre)}</strong>${x.medidas.length ? `<div class="chips">${x.medidas.map(m => `<span class="chip">${e(m)}</span>`).join('')}</div>` : ''}
        ${x.comentarios.length ? `<details><summary>Comentarios del profesorado (${x.comentarios.length})</summary><ul>${x.comentarios.map(cm => `<li><strong>${e(cm.materia)}:</strong> ${e(cm.texto)}</li>`).join('')}</ul></details>` : ''}</td>
      <td class="cen"><strong class="${x.sus >= 3 ? 'mal' : ''}">${x.sus}</strong> ${cambio(x.cambio)}</td>
      <td>${x.materias.map(e).join(', ') || '<span class="gris">—</span>'}${x.pendientesAnt.length ? `<div class="gris peq">Pendientes de otros cursos: ${x.pendientesAnt.map(e).join(', ')}</div>` : ''}</td>
      <td class="cen">${x.fi}${x.fj ? `<div class="gris peq">${x.fj} just.</div>` : ''}</td>
      <td class="cen">${x.ac || x.pa || x.ex ? `${x.ac} · ${x.pa}${x.ex ? ` · <strong>${x.ex} exp.</strong>` : ''}` : '<span class="gris">—</span>'}</td>
      ${D.trasSesion ? `<td>${prop(x.propuesta) || '<span class="gris">—</span>'}</td><td class="pre">${e(x.acuerdos)}</td>` : ''}
    </tr>`).join('');
  const filasMaterias = D.materias.slice().sort((x, y) => y.suspensos - x.suspensos || x.materia.localeCompare(y.materia, 'es')).map(m => `<tr>
      <td><strong>${e(m.materia)}</strong>${m.profesor ? `<div class="gris peq">${e(m.profesor)}</div>` : ''}</td>
      <td class="cen"><strong class="${m.pct >= 40 ? 'mal' : ''}">${m.suspensos}</strong></td>
      <td><span class="pista mini"><span class="relleno${m.pct >= 40 ? ' mal' : ''}" style="width:${m.pct}%"></span></span> ${m.pct} %</td>
      <td class="cen">${m.antes == null ? '' : cambio(m.suspensos - m.antes)}</td>
      <td class="cen">${m.media == null ? '<span class="gris">—</span>' : coma(m.media)}</td>
      <td class="peq">${m.quienes.map(e).join(', ') || '<span class="gris">—</span>'}</td>
    </tr>`).join('');
  const lista = arr => arr.length ? arr.map(m => `<strong>${e(m.materia)}</strong> (${m.suspensos})`).join(' · ') : '<span class="gris">—</span>';
  const diversidad = [
    ['NESE', D.alumnos.filter(x => x.a.nese === 'Sí').map(x => x.nombre + (_getNeseCodes(x.a.recursoNese).length ? ' (' + _getNeseCodes(x.a.recursoNese).join(', ') + ')' : ''))],
    ['Compensatoria', D.alumnos.filter(x => x.a.compensatoria === 'Sí').map(x => x.nombre)],
    ['Repiten curso', D.alumnos.filter(x => x.a.repetidor === 'Sí').map(x => x.nombre)],
    ['PAP / enriquecimiento', D.alumnos.filter(x => x.a.papActivo || x.a.ecActivo).map(x => x.nombre + ' (' + [x.a.papActivo ? 'PAP' : '', x.a.ecActivo ? 'enriquecimiento' : ''].filter(Boolean).join(', ') + ')')],
    ['Con materias pendientes de otros cursos', D.alumnos.filter(x => x.pendientesAnt.length).map(x => `${x.nombre}: ${x.pendientesAnt.join(', ')}`)],
  ].filter(([, v]) => v.length);
  const masFaltas = D.alumnos.filter(x => x.fi > 0).sort((x, y) => y.fi - x.fi).slice(0, 5);
  const titulo = `Informe para el equipo docente — ${nivel} ${grupo} — ${D.nombreEval}`;
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(titulo)}</title>
<style>
  :root{--tinta:#1d2433;--gris:#6b7280;--linea:#d9dde5;--fondo:#f6f7f9;--marca:#1e3a5f;--mal:#b91c1c;--bien:#15803d;--aviso:#b45309}
  *{box-sizing:border-box} body{margin:0;font-family:'Segoe UI',system-ui,-apple-system,Arial,sans-serif;color:var(--tinta);background:#fff;font-size:14px;line-height:1.45}
  .pagina{max-width:1040px;margin:0 auto;padding:24px 18px 40px}
  header{border-bottom:3px solid var(--marca);padding-bottom:12px;margin-bottom:18px}
  .centro{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--gris)}
  h1{font-size:22px;margin:4px 0} .sub{color:var(--gris)}
  .estado{display:inline-block;margin-top:8px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;background:${D.trasSesion ? '#dcfce7' : '#fef3c7'};color:${D.trasSesion ? 'var(--bien)' : 'var(--aviso)'}}
  h2{font-size:15px;text-transform:uppercase;letter-spacing:.05em;color:var(--marca);margin:26px 0 10px;border-bottom:1px solid var(--linea);padding-bottom:5px}
  .cifras{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
  .cifras div{background:var(--fondo);border:1px solid var(--linea);border-radius:10px;padding:10px 12px}
  .cifras strong{display:block;font-size:26px;line-height:1.1} .cifras span{font-size:12.5px;color:var(--gris)}
  .barra{display:flex;align-items:center;gap:8px;margin:4px 0;font-size:13px} .barra .etq{width:70px;text-align:right;color:var(--gris)} .barra .num{width:30px;font-weight:700}
  .pista{flex:1;height:14px;background:var(--fondo);border:1px solid var(--linea);border-radius:7px;overflow:hidden;display:inline-block;vertical-align:middle}
  .pista.mini{flex:none;width:80px;height:9px} .relleno{display:block;height:100%;background:var(--marca)} .relleno.mal{background:var(--mal)}
  table{width:100%;border-collapse:collapse;font-size:13px} th,td{border-bottom:1px solid var(--linea);padding:7px 6px;text-align:left;vertical-align:top}
  th{background:var(--fondo);font-size:11.5px;text-transform:uppercase;letter-spacing:.03em;color:var(--gris)}
  .tabla{overflow-x:auto} .cen{text-align:center} .peq{font-size:12px} .gris{color:var(--gris)} .mal{color:var(--mal)} .pre{white-space:pre-wrap}
  tr.destacar td{background:#fff7f7} .peor{color:var(--mal);font-size:11.5px;font-weight:700} .mejor{color:var(--bien);font-size:11.5px;font-weight:700} .igual{color:var(--gris);font-size:11.5px}
  .chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:3px} .chip{font-size:11px;padding:1px 7px;border-radius:999px;background:#eef2ff;color:#3730a3}
  details{margin-top:4px;font-size:12.5px} summary{cursor:pointer;color:var(--marca)} details ul{margin:4px 0 0 16px;padding:0}
  .dos{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
  .caja{background:var(--fondo);border:1px solid var(--linea);border-radius:10px;padding:10px 14px}
  ul.limpia{margin:0;padding-left:18px} ul.limpia li{margin:3px 0}
  footer{margin-top:30px;padding-top:10px;border-top:1px solid var(--linea);font-size:12px;color:var(--gris)}
  @media print{body{font-size:11.5px} .pagina{padding:0} h2{break-after:avoid} tr{break-inside:avoid} details{display:block} details>*{display:block}}
</style></head><body><div class="pagina">
<header>
  ${D.ies ? `<div class="centro">${e(D.ies)}</div>` : ''}
  <h1>Informe para el equipo docente · ${e(D.nombreEval)}</h1>
  <div class="sub">${e(nivel)} · Grupo ${e(grupo)}${D.fecha ? ` · Sesión de evaluación: ${e(fmtDate(D.fecha))}` : ''}${D.tutor ? ` · Tutor/a: ${e(D.tutor)}` : ''}</div>
  <span class="estado">${D.trasSesion ? 'Actualizado tras la sesión de evaluación' : 'Informe previo a la sesión de evaluación'}</span>
  <span class="gris peq" style="margin-left:8px">Generado el ${e(new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }))}</span>
</header>

<h2>Resumen del grupo</h2>
<div class="cifras">
  <div><strong>${D.total}</strong><span>alumnos</span></div>
  <div><strong class="${''}">${D.todoAprobado}</strong><span>todo aprobado (${pct(D.todoAprobado)} %)</span></div>
  <div><strong>${D.unaDos}</strong><span>1 o 2 suspensas (${pct(D.unaDos)} %)</span></div>
  <div><strong class="${D.tresMas ? 'mal' : ''}">${D.tresMas}</strong><span>3 o más suspensas (${pct(D.tresMas)} %)</span></div>
  <div><strong>${coma(D.media)}</strong><span>suspensas de media por alumno/a</span></div>
  ${D.mejoran != null ? `<div><strong>${D.mejoran} · ${D.empeoran}</strong><span>mejoran · empeoran respecto a la evaluación anterior</span></div>` : ''}
</div>
<div class="dos" style="margin-top:14px">
  <div class="caja"><strong>Alumnado según el número de suspensas</strong>${barras}</div>
  <div class="caja">
    <p style="margin:0 0 6px"><strong>Materias con más suspensos:</strong> ${lista(D.mas)}</p>
    <p style="margin:0 0 6px"><strong>Materias con menos suspensos:</strong> ${lista(D.menos)}</p>
    <p style="margin:0"><strong>Sin suspensos:</strong> ${D.sinSuspensos.length ? D.sinSuspensos.map(e).join(', ') : '<span class="gris">—</span>'}</p>
  </div>
</div>

${D.trasSesion && (D.acta.valoracion || D.acta.acuerdosGrupo) ? `<h2>Sesión de evaluación</h2><div class="dos">
  <div class="caja"><strong>Valoración general del grupo</strong><p class="pre" style="margin:6px 0 0">${e(D.acta.valoracion || '—')}</p></div>
  <div class="caja"><strong>Acuerdos del grupo</strong><p class="pre" style="margin:6px 0 0">${e(D.acta.acuerdosGrupo || '—')}</p></div></div>` : ''}

${D.casos.length ? `<h2>Para comentar en la sesión</h2><ul class="limpia">${D.casos.map(x => `<li><strong>${e(x.nombre)}</strong>: ${x.razones.map(e).join(' · ')}</li>`).join('')}</ul>` : ''}

<h2>Alumnado</h2>
<div class="tabla"><table>
  <thead><tr><th>Nº</th><th>Alumno/a</th><th class="cen">Susp.${D.mejoran != null ? ' (cambio)' : ''}</th><th>Materias suspensas</th><th class="cen">Faltas sin just.</th><th class="cen">AC · partes</th>${D.trasSesion ? `<th>${e(_SES_CAMPOS[String(k)].propEtq)}</th><th>Acuerdos</th>` : ''}</tr></thead>
  <tbody>${filasAlumnos || '<tr><td colspan="8" class="gris">No hay alumnado en el grupo.</td></tr>'}</tbody>
</table></div>

<h2>Materias</h2>
<div class="tabla"><table>
  <thead><tr><th>Materia</th><th class="cen">Suspensos</th><th>% del grupo</th><th class="cen">${D.mejoran != null ? 'Cambio' : ''}</th><th class="cen">Nota media</th><th>Alumnado con la materia suspensa</th></tr></thead>
  <tbody>${filasMaterias || '<tr><td colspan="6" class="gris">Aún no hay materias con datos.</td></tr>'}</tbody>
</table></div>
<p class="gris peq">La nota media sale de las notas enviadas desde el Cuaderno de cada profesor/a («👥 Para la tutoría»); si una materia no las ha enviado, aparece «—».</p>

<h2>Asistencia y convivencia · ${e(D.nombreEval)}</h2>
<div class="cifras">
  <div><strong class="${D.faltas.i ? 'mal' : ''}">${D.faltas.i}</strong><span>faltas sin justificar</span></div>
  <div><strong>${D.faltas.j}</strong><span>faltas justificadas</span></div>
  <div><strong>${D.faltas.ac}</strong><span>AC (actitud y comportamiento)</span></div>
  <div><strong class="${D.faltas.pa ? 'mal' : ''}">${D.faltas.pa}</strong><span>partes de amonestación</span></div>
  ${D.faltas.ex ? `<div><strong class="mal">${D.faltas.ex}</strong><span>expedientes</span></div>` : ''}
</div>
${masFaltas.length ? `<p style="margin-top:10px"><strong>Más faltas sin justificar:</strong> ${masFaltas.map(x => `${e(x.nombre)} (${x.fi})`).join(' · ')}</p>` : ''}

${diversidad.length ? `<h2>Atención a la diversidad</h2><ul class="limpia">${diversidad.map(([t, v]) => `<li><strong>${t}:</strong> ${v.map(e).join('; ')}</li>`).join('')}</ul>` : ''}

<footer>Documento interno para el equipo docente de ${e(nivel)} ${e(grupo)}. Contiene datos personales del alumnado: no lo reenvíes fuera del equipo ni lo dejes en un lugar público.
Generado con el Gestor de Tutoría${D.trasSesion ? '' : '; se actualizará después de la sesión de evaluación con las propuestas y los acuerdos'}.</footer>
</div></body></html>`;
}

function _ieNombreArchivo(nivel, grupo, k) {
  const limpio = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  return `informe-equipo-${limpio(nivel)}-${limpio(grupo)}-eval${k}-${_ieTrasSesion(nivel, grupo, String(k)) ? 'tras-la-sesion' : 'previo'}.html`;
}

/* Ventana para elegir la evaluación y qué hacer: verlo, descargar el .html o preparar el correo al equipo. */
window.abrirInformeEquipo = function(nivel, grupo, k) {
  k = String(k || (typeof _sesEvalPropuesta === 'function' ? _sesEvalPropuesta(nivel) : '1'));
  const ov = document.createElement('div');
  ov.className = 'tdlg-ov'; ov.style.zIndex = String(++_tDlgZ); ov.id = 'informeEquipoOv';
  const pintar = () => {
    const tras = _ieTrasSesion(nivel, grupo, k);
    const correos = _getAsistenciaData(nivel, grupo).profesores.map(p => (p.correo || '').trim()).filter(Boolean);
    ov.innerHTML = `<div class="tdlg-box" role="dialog" aria-modal="true" aria-labelledby="ieT" style="max-width:540px">
      <h2 id="ieT">📊 Informe para el equipo docente</h2>
      <div class="tdlg-msg" style="font-size:13px">${_tEsc(nivel)} ${_tEsc(grupo)}: resultados del grupo, materias suspensas de cada alumno/a, suspensos por materia, casos para comentar, convivencia y atención a la diversidad. Un archivo .html que se abre en cualquier navegador o se imprime. No lleva contactos de las familias ni entrevistas.</div>
      <label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:13px">Evaluación
        <select class="tdlg-in" style="width:auto;margin:0" id="ieEval">${['1', '2', '3'].map(x => `<option value="${x}" ${x === k ? 'selected' : ''}>${FT_NOMBRE_EVAL[x]}</option>`).join('')}</select></label>
      <p style="font-size:12.5px;margin:10px 0 0;padding:8px 10px;border-radius:8px;background:var(--surface2);border:1px solid var(--border)">${tras
        ? '✅ <strong>Versión tras la sesión</strong>: incluye la propuesta y los acuerdos de cada alumno/a y la valoración y los acuerdos del grupo.'
        : '🕐 <strong>Versión previa a la sesión</strong>. Después de la sesión de evaluación vuelve a generarlo y llevará también las propuestas y los acuerdos.'}</p>
      <div class="tdlg-bar" style="flex-wrap:wrap">
        <button class="tdlg-no" data-acc="cerrar">Cerrar</button>
        <button class="tdlg-no" data-acc="correo" ${correos.length ? '' : 'disabled title="Añade los correos en «👨‍🏫 Equipo docente»"'}>✉ Correo al equipo (${correos.length})</button>
        <button class="tdlg-no" data-acc="ver">👁 Ver</button>
        <button class="tdlg-si" data-acc="descargar">⬇ Descargar .html</button>
      </div></div>`;
    ov.querySelector('#ieEval').onchange = ev => { k = ev.target.value; pintar(); };
    ov.querySelector('[data-acc="cerrar"]').onclick = () => ov.remove();
    ov.querySelector('[data-acc="ver"]').onclick = () => { ov.remove(); const w = _ventanaDoc(); w.document.write(informeEquipoHTML(nivel, grupo, k)); w.document.close(); };
    ov.querySelector('[data-acc="descargar"]').onclick = async () => {
      await _tGuardarArchivo(new Blob([informeEquipoHTML(nivel, grupo, k)], { type: 'text/html' }), _ieNombreArchivo(nivel, grupo, k));
      showToast('⬇ Informe guardado: envíalo al equipo docente (o pulsa «✉ Correo al equipo» y adjúntalo)');
    };
    ov.querySelector('[data-acc="correo"]').onclick = () => {
      const tras = _ieTrasSesion(nivel, grupo, k);
      const asunto = `${nivel} ${grupo} · ${FT_NOMBRE_EVAL[k]} · informe ${tras ? 'tras la sesión' : 'previo a la sesión'} de evaluación`;
      const cuerpo = `Hola:\n\nOs adjunto el informe ${tras ? 'actualizado tras la sesión' : 'previo a la sesión'} de evaluación de ${nivel} ${grupo} (${FT_NOMBRE_EVAL[k]}${getDates(nivel)['eval' + k] ? ', ' + fmtDate(getDates(nivel)['eval' + k]) : ''}). ` +
        `Es un archivo .html: se abre con doble clic en cualquier navegador.\n\nContiene datos del alumnado: por favor, no lo reenviéis fuera del equipo docente.\n\nUn saludo.`;
      window.location.href = 'mailto:' + correos.map(encodeURIComponent).join(',') + '?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(cuerpo);
    };
  };
  document.body.appendChild(ov);
  pintar();
  ov.addEventListener('keydown', ev => { if (ev.key === 'Escape') { ev.stopPropagation(); ov.remove(); } });
  setTimeout(() => ov.querySelector('[data-acc="descargar"]')?.focus(), 20);
};
