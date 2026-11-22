/* ============================================================================
   Gestor de Tutoría · 📑 Acta de calificaciones (como la de Itaca)
   tutoria/js/29-acta-calificaciones.js
   ============================================================================

   Una hoja apaisada con la relación alfabética del alumnado y la calificación
   de cada materia en una evaluación, como el acta que saca Itaca, para
   revisarla en la sesión, imprimirla o guardarla en PDF. Sale de lo que ya hay
   en Tutoría: las notas que llegan del Cuaderno o que se introducen a mano
   (alumno.porMateria) y las materias suspensas de la evaluación (S, sin nota).

   Debajo: aprobados, suspensos, % de aprobados y nota media de cada materia,
   el reparto del alumnado por número de suspensas, la leyenda de abreviaturas
   con el profesor/a de cada materia y el espacio para las firmas.
   Archivo .html sin scripts. No lleva contactos de las familias ni entrevistas.
*/

const _AC_NO_SIGNIFICA = new Set(['a', 'al', 'de', 'del', 'el', 'en', 'la', 'las', 'los', 'y', 'e', 'o', 'para', 'con', 'i', 'per', 'les']);
const _AC_ROMANO = /^(i{1,3}|iv|v|vi{0,3}|[0-9]+[ºª]?)$/i;

// «Lengua Castellana y Literatura II» → «LCL II»; «Inglés» → «ING»; «Matemáticas aplicadas a las CCSS II» → «MACCSS II».
function _acAbrev(m) {
  const pal = String(m || '').replace(/[():,.;\-–/]+/g, ' ').split(/\s+/).filter(Boolean);
  const num = pal.length > 1 && _AC_ROMANO.test(pal[pal.length - 1]) ? pal.pop().toUpperCase() : '';
  const sig = pal.filter(p => !_AC_NO_SIGNIFICA.has(p.toLowerCase()));
  let ab = sig.length === 1
    ? sig[0].normalize('NFD').replace(/[̀-ͯ]/g, '').slice(0, 3).toUpperCase()
    : sig.map(p => (p.length > 1 && p === p.toUpperCase()) ? p : p[0].toUpperCase()).join('');
  ab = ab.normalize('NFD').replace(/[̀-ͯ]/g, '') || '?';
  return num ? ab + ' ' + num : ab;
}
// Abreviaturas sin repetir dentro del acta.
function _acAbrevs(materias) {
  const usadas = {};
  return materias.map(m => {
    let ab = _acAbrev(m), base = ab, n = 2;
    while (usadas[ab]) ab = base + n++;
    usadas[ab] = true;
    return ab;
  });
}
function _acNota(n) { return (Math.round(n * 100) / 100).toString().replace('.', ','); }

/* Todas las cifras del acta, sin HTML (también las usan las pruebas). */
function datosActaCalificaciones(nivel, grupo, k) {
  k = String(k);
  const c = _SES_CAMPOS[k], periodos = k === '3' ? ['final', '3'] : [c.periodo];
  const alumnos = (data[nivel]?.[grupo] || []).filter(a => (a.nombre || '').trim())
    .slice().sort((x, y) => x.nombre.localeCompare(y.nombre, 'es', { sensitivity: 'base' }));
  const profes = _getAsistenciaData(nivel, grupo).profesores;
  const entrada = (a, m) => { const cl = Object.keys(a.porMateria || {}).find(x => _tNorm(x) === _tNorm(m)); return cl ? a.porMateria[cl] : null; };
  const celda = (a, m) => {
    const d = entrada(a, m);
    const n = d ? periodos.map(p => (d.notas || {})[p]).find(x => typeof x === 'number') : undefined;
    if (typeof n === 'number') return { n, texto: _acNota(n), susp: n < 5 };
    if ((d && periodos.some(p => (d.suspensa || {})[p])) || _ieTiene(a[c.pend], m)) return { n: null, texto: 'S', susp: true };
    return null;
  };
  // Materias: primero las del catálogo del nivel (en su orden), luego las demás; solo las que tienen
  // alguna calificación o están en el equipo docente.
  const cand = [];
  const add = m => { m = String(m || '').trim(); if (m && _tNorm(m) !== 'tutoria' && !cand.some(x => _tNorm(x) === _tNorm(m))) cand.push(m); };
  (getMateriasParaNivel(nivel, grupo) || []).forEach(add);
  _ieMateriasGrupo(nivel, grupo, k).forEach(add);
  alumnos.forEach(a => Object.keys(a.porMateria || {}).forEach(add));
  const materias = cand.filter(m => profes.some(p => _tNorm(p.materia) === _tNorm(m)) || alumnos.some(a => celda(a, m)));
  const abrevs = _acAbrevs(materias);
  const filas = alumnos.map((a, i) => {
    const celdas = materias.map(m => celda(a, m));
    const notas = celdas.filter(x => x && typeof x.n === 'number').map(x => x.n);
    const susp = Math.max(celdas.filter(x => x && x.susp).length, +a[c.n] || 0);
    return { orden: i + 1, nombre: a.nombre, celdas, susp, media: notas.length ? Math.round(notas.reduce((s, x) => s + x, 0) / notas.length * 100) / 100 : null };
  });
  const porMateria = materias.map((m, j) => {
    const cs = filas.map(f => f.celdas[j]).filter(Boolean), notas = cs.filter(x => typeof x.n === 'number').map(x => x.n);
    const susp = cs.filter(x => x.susp).length, p = profes.find(x => _tNorm(x.materia) === _tNorm(m));
    const d = alumnos.map(a => entrada(a, m)).find(x => x && x.profesor);
    return { materia: m, abrev: abrevs[j], profesor: (p && p.nombre) || (d && d.profesor) || '', calificados: cs.length, aprobados: cs.length - susp, suspensos: susp,
      pctAprob: cs.length ? Math.round((cs.length - susp) / cs.length * 100) : null, media: notas.length ? Math.round(notas.reduce((s, x) => s + x, 0) / notas.length * 100) / 100 : null };
  });
  const reparto = [['Todo aprobado', f => f.susp === 0], ['1 suspensa', f => f.susp === 1], ['2 suspensas', f => f.susp === 2], ['3 o más', f => f.susp >= 3]]
    .map(([etq, fn]) => ({ etq, n: filas.filter(fn).length }));
  const fecha = (getDates(nivel) || {})['eval' + k];
  const d0 = fecha ? new Date(fecha) : new Date(), y = d0.getFullYear(), curso = d0.getMonth() >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  return { nivel, grupo, k, nombreEval: FT_NOMBRE_EVAL[k], fecha: fecha ? fmtDate(fecha) : '', curso, tutor: tutores[`${nivel}-${grupo}`] || '',
    centro: (document.getElementById('headerIesName')?.value || '').trim(), materias, abrevs, filas, porMateria, reparto,
    sinCalificar: porMateria.filter(x => !x.calificados).map(x => x.materia) };
}

function actaCalificacionesHTML(nivel, grupo, k, opciones) {
  const o = opciones || {}, D = datosActaCalificaciones(nivel, grupo, k), e = s => _tEsc(s == null ? '' : String(s));
  const EVAL = { '1': 'PRIMERA EVALUACIÓN', '2': 'SEGUNDA EVALUACIÓN', '3': 'EVALUACIÓN FINAL' }[D.k];
  const titulo = `Acta de calificaciones — ${nivel} ${grupo} — ${D.nombreEval}`;
  const pie = (etq, fn) => `<tr class="pie"><th colspan="2" scope="row">${etq}</th>${D.porMateria.map(fn).join('')}<td></td><td></td></tr>`;
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(titulo)}</title>
<style>
  @page{size:A4 landscape;margin:9mm}
  *{box-sizing:border-box} body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;font-size:11px}
  .pagina{max-width:1120px;margin:0 auto;padding:14px}
  h1{font-size:13px;text-align:center;margin:0 0 2px;text-transform:uppercase} .sub{text-align:center;font-size:11px;margin:0 0 10px}
  .cab{width:100%;border-collapse:collapse;margin-bottom:10px} .cab td{border:1px solid #555;padding:4px 6px;vertical-align:top}
  .cab small{display:block;font-size:8.5px;color:#555;text-transform:uppercase} .cab b{font-size:11.5px}
  table.acta{width:100%;border-collapse:collapse;table-layout:auto}
  .acta th,.acta td{border:1px solid #555;padding:3px 4px;text-align:center}
  .acta thead th{background:#eef1f5;font-size:9.5px}
  .acta td.nom,.acta th.nom{text-align:left;white-space:nowrap}
  .acta td.ord{width:26px;color:#444} .acta th.m{width:54px} .acta th.t{width:50px}
  .acta td.s{font-weight:700;background:#fde2e2;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .acta td.tot{font-weight:700;background:#f6f7f9} .acta td.tot.mal{color:#b91c1c}
  .acta tr:nth-child(even) td:not(.s){background:#fafbfc}
  .acta tr.pie th,.acta tr.pie td{background:#eef1f5;font-size:10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .bloques{display:grid;grid-template-columns:1fr 2fr;gap:14px;margin-top:12px;break-inside:avoid}
  h2{font-size:11px;text-transform:uppercase;margin:0 0 4px}
  .mini{width:100%;border-collapse:collapse} .mini th,.mini td{border:1px solid #999;padding:3px 5px;text-align:left} .mini td.n{text-align:center;width:50px}
  .firma{height:26px;width:170px}
  .notas{font-size:9.5px;color:#444;margin-top:8px}
  .firmas{display:flex;gap:40px;margin-top:22px;break-inside:avoid} .firmas div{flex:1;border-top:1px solid #555;padding-top:4px;text-align:center;font-size:10px}
  @media screen{body{background:#f3f4f6}.pagina{background:#fff;margin:12px auto;box-shadow:0 1px 6px rgba(0,0,0,.12)}}
</style></head><body><div class="pagina">
<h1>Acta de calificaciones · ${e(EVAL)}</h1>
<p class="sub">${e(nivel)} — Grupo ${e(grupo)}</p>
<table class="cab"><tr>
  <td colspan="3"><small>Centro</small><b>${e(D.centro || '—')}</b></td>
  <td><small>Curso académico</small><b>${e(D.curso)}</b></td>
  <td><small>Fecha de evaluación</small><b>${e(D.fecha || '—')}</b></td>
</tr><tr>
  <td><small>Nivel</small><b>${e(nivel)}</b></td>
  <td><small>Grupo</small><b>${e(grupo)}</b></td>
  <td><small>Tutor/a</small><b>${e(D.tutor || '—')}</b></td>
  <td><small>Número total de alumnos</small><b>${D.filas.length}</b></td>
  <td><small>Evaluación</small><b>${e(D.nombreEval)}</b></td>
</tr></table>
<table class="acta">
  <thead><tr><th scope="col">Ord.</th><th scope="col" class="nom">Apellidos y nombre</th>
    ${D.porMateria.map(m => `<th scope="col" class="m" title="${e(m.materia)}">${e(m.abrev)}</th>`).join('')}
    <th scope="col" class="t" title="Materias suspensas">Nº susp.</th><th scope="col" class="t">Media</th></tr></thead>
  <tbody>${D.filas.map(f => `<tr><td class="ord">${f.orden}</td><td class="nom">${o.sinNombres ? '*' : e(f.nombre)}</td>
    ${f.celdas.map(x => x ? `<td class="${x.susp ? 's' : ''}">${e(x.texto)}</td>` : '<td></td>').join('')}
    <td class="tot ${f.susp ? 'mal' : ''}">${f.susp}</td><td class="tot">${f.media == null ? '' : _acNota(f.media)}</td></tr>`).join('')}
  </tbody>
  <tfoot>
    ${pie('Aprobados', m => `<td>${m.calificados ? m.aprobados : ''}</td>`)}
    ${pie('Suspensos', m => `<td>${m.calificados ? m.suspensos : ''}</td>`)}
    ${pie('% de aprobados', m => `<td>${m.pctAprob == null ? '' : m.pctAprob + '%'}</td>`)}
    ${pie('Nota media', m => `<td>${m.media == null ? '' : _acNota(m.media)}</td>`)}
  </tfoot>
</table>
<p class="notas">Nota numérica de 0 a 10; en rojo, las suspensas. <b>S</b>: suspensa, sin nota numérica. En blanco: sin calificación en Tutoría (materia que no cursa o datos que aún no han llegado).${D.sinCalificar.length ? ` Sin ninguna calificación todavía: ${e(D.sinCalificar.join(', '))}.` : ''}</p>
<div class="bloques">
  <div><h2>Resultados del grupo</h2><table class="mini"><tbody>
    ${D.reparto.map(r => `<tr><th scope="row">${e(r.etq)}</th><td class="n">${r.n}</td><td class="n">${D.filas.length ? Math.round(r.n / D.filas.length * 100) : 0}%</td></tr>`).join('')}
  </tbody></table></div>
  <div><h2>Materias y equipo docente</h2><table class="mini"><thead><tr><th scope="col">Abrev.</th><th scope="col">Materia</th><th scope="col">Profesor/a</th><th scope="col">Firma</th></tr></thead><tbody>
    ${D.porMateria.map(m => `<tr><td>${e(m.abrev)}</td><td>${e(m.materia)}</td><td>${e(m.profesor)}</td><td class="firma"></td></tr>`).join('')}
  </tbody></table></div>
</div>
<div class="firmas"><div>El tutor/a${D.tutor ? ': ' + e(D.tutor) : ''}</div><div>Vº Bº Jefatura de estudios</div></div>
<p class="notas">Generado con el Gestor de Tutoría a partir de los datos introducidos; no sustituye al acta oficial de Itaca. Contiene datos personales del alumnado.</p>
</div></body></html>`;
}

function _acNombreArchivo(nivel, grupo, k) {
  const limpio = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  return `acta-calificaciones-${limpio(nivel)}-${limpio(grupo)}-eval${k}.html`;
}

/* Ventana para elegir la evaluación y verla (para imprimir o guardar en PDF) o descargarla. */
window.abrirActaCalificaciones = function(nivel, grupo, k) {
  if (!data[nivel]?.[grupo]?.length) { showToast('⚠ No hay alumnos en este grupo'); return; }
  k = String(k || (typeof _sesEvalPropuesta === 'function' ? _sesEvalPropuesta(nivel) : '1'));
  let sinNombres = false;
  const ov = document.createElement('div');
  ov.className = 'tdlg-ov'; ov.style.zIndex = String(++_tDlgZ); ov.id = 'actaCalifOv';
  const pintar = () => {
    const D = datosActaCalificaciones(nivel, grupo, k), conDatos = D.porMateria.filter(m => m.calificados).length;
    ov.innerHTML = `<div class="tdlg-box" role="dialog" aria-modal="true" aria-labelledby="acT" style="max-width:540px">
      <h2 id="acT">📑 Acta de calificaciones</h2>
      <div class="tdlg-msg" style="font-size:13px">${_tEsc(nivel)} ${_tEsc(grupo)}: la nota de cada alumno/a en cada materia, como el acta de Itaca, con aprobados, suspensos y media de cada materia. Para revisarla en la sesión, imprimirla o guardarla en PDF.</div>
      <label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:13px">Evaluación
        <select class="tdlg-in" style="width:auto;margin:0" id="acEval">${['1', '2', '3'].map(x => `<option value="${x}" ${x === k ? 'selected' : ''}>${FT_NOMBRE_EVAL[x]}</option>`).join('')}</select></label>
      <label style="display:flex;gap:8px;align-items:center;margin-top:8px;font-size:13px"><input type="checkbox" id="acSinNombres" ${sinNombres ? 'checked' : ''}> Sin los nombres (solo el número de orden)</label>
      <p style="font-size:12.5px;margin:10px 0 0;padding:8px 10px;border-radius:8px;background:var(--surface2);border:1px solid var(--border)">${conDatos
        ? `✅ ${conDatos} de ${D.porMateria.length} materias con calificaciones.${D.sinCalificar.length ? ` Faltan: ${_tEsc(D.sinCalificar.join(', '))}.` : ''}`
        : '🕐 Todavía no hay calificaciones de esta evaluación: llegan con los archivos del Cuaderno o con «✍️ Introducir datos de una materia».'}</p>
      <div class="tdlg-bar" style="flex-wrap:wrap">
        <button class="tdlg-no" data-acc="cerrar">Cerrar</button>
        <button class="tdlg-no" data-acc="manual">✍️ Introducir notas</button>
        <button class="tdlg-no" data-acc="descargar">⬇ Descargar .html</button>
        <button class="tdlg-si" data-acc="ver">👁 Ver e imprimir</button>
      </div></div>`;
    ov.querySelector('#acEval').onchange = ev => { k = ev.target.value; pintar(); };
    ov.querySelector('#acSinNombres').onchange = ev => { sinNombres = ev.target.checked; };
    ov.querySelector('[data-acc="cerrar"]').onclick = () => ov.remove();
    ov.querySelector('[data-acc="manual"]').onclick = () => { ov.remove(); if (!document.getElementById('datosMateriaOverlay')?.classList.contains('open')) openDatosMateria(nivel, grupo, k); };
    ov.querySelector('[data-acc="ver"]').onclick = () => { ov.remove(); const w = _ventanaDoc(); w.document.write(actaCalificacionesHTML(nivel, grupo, k, { sinNombres })); w.document.close(); };
    ov.querySelector('[data-acc="descargar"]').onclick = async () => {
      await _tGuardarArchivo(new Blob([actaCalificacionesHTML(nivel, grupo, k, { sinNombres })], { type: 'text/html' }), _acNombreArchivo(nivel, grupo, k));
      showToast('⬇ Acta de calificaciones guardada');
    };
  };
  document.body.appendChild(ov);
  pintar();
  ov.addEventListener('keydown', ev => { if (ev.key === 'Escape') { ev.stopPropagation(); ov.remove(); } });
  setTimeout(() => ov.querySelector('[data-acc="ver"]')?.focus(), 20);
};
