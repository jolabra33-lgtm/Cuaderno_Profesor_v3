/* ============================================================================
   Gestor de Tutoría · Acta oficial, estadísticas en PDF e informe de seguimiento
   tutoria/js/11-acta-oficial-y-seguimiento.js
   ============================================================================ */

// ===================== ACTA OFICIAL DE EVALUACIÓN =====================

function openActaOficialMenu(nivel, grupo) {
  // Quick modal to choose which evaluation
  let m = document.getElementById('actaMenuOverlay');
  if (!m) {
    m = document.createElement('div');
    m.id = 'actaMenuOverlay';
    m.className = 'modal-overlay';
    m.style.zIndex = '610';
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
    document.body.appendChild(m);
  }
  m.innerHTML = `
    <div class="modal" style="width:360px">
      <div class="modal-title">📋 Acta Oficial de Evaluación</div>
      <p style="font-size:12px;color:var(--text2);margin-bottom:20px;line-height:1.6;">
        Selecciona la evaluación para la que quieres generar el acta oficial.
      </p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button class="btn btn-primary" onclick="openActaOficial('${jsAttr(nivel)}','${jsAttr(grupo)}',1);document.getElementById('actaMenuOverlay').classList.remove('open')">
          📄 Acta I Evaluación
        </button>
        <button class="btn btn-primary" style="background:linear-gradient(135deg,var(--green),#1fb88a);" onclick="openActaOficial('${jsAttr(nivel)}','${jsAttr(grupo)}',2);document.getElementById('actaMenuOverlay').classList.remove('open')">
          📄 Acta II Evaluación
        </button>
        <button class="btn btn-primary" style="background:linear-gradient(135deg,var(--purple),#6d28d9);" onclick="openActaOficial('${jsAttr(nivel)}','${jsAttr(grupo)}',3);document.getElementById('actaMenuOverlay').classList.remove('open')">
          📄 Acta Evaluación Final
        </button>
      </div>
      <div class="modal-actions" style="margin-top:16px;">
        <button class="btn btn-ghost" onclick="document.getElementById('actaMenuOverlay').classList.remove('open')">Cancelar</button>
      </div>
    </div>`;
  m.classList.add('open');
}

function openActaOficial(nivel, grupo, evalNum) {
  const alumnos = data[nivel]?.[grupo] || [];
  if (!alumnos.length) { showToast('⚠ No hay alumnos en este grupo'); return; }

  const iesName  = document.getElementById('headerIesName')?.value || 'IES —';
  const tutor    = tutores[`${nivel}-${grupo}`] || '';
  const isFinal  = evalNum === 3;
  const evalNombres = { 1: 'Primera', 2: 'Segunda', 3: 'Final' };
  const evalOrdinal = { 1: 'I', 2: 'II', 3: 'Final' };
  const evalLabel   = evalNombres[evalNum];
  const propField   = evalNum === 1 ? 'propuesta1' : evalNum === 2 ? 'propuesta2' : evalNum === 3 ? 'promociona' : null;
  const evalField   = evalNum === 1 ? 'eval1' : evalNum === 2 ? 'eval2' : 'eval3';
  const materias    = getMateriasParaNivel(nivel, grupo);
  const date        = new Date();
  const dateStr     = date.toLocaleDateString('es-ES', {year:'numeric', month:'long', day:'numeric'});
  const codigoNivel = nivel.replace(/[^A-Za-z0-9]/g,'');

  const isBachNivel = isBach(nivel);

  // Anotaciones guardadas en una sesión anterior (acuerdos, firmas de
  // Jefatura/Dirección, decisiones sobre pendientes de cursos anteriores).
  // El resto del acta se recalcula siempre a partir de los datos actuales.
  const guardada = _actaOficialGetGuardada(nivel, grupo, evalNum) || {};
  const guardadaPendAnt = guardada.pendAnt || {};

  // Numeración automática de las secciones: como varias son condicionales
  // (propuestas solo en II/Final, detalle de suspensos solo en I/II...), se
  // numeran con un contador correlativo en vez de índices fijos, para que
  // nunca queden huecos ni números repetidos.
  let _secN = 0;
  const nextSec = () => ++_secN;

  // ── HELPERS ──
  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // Escapado para incrustar nivel/grupo dentro de literales JS de comillas
  // simples en el script de la ventana emergente (ver más abajo).
  const jsEsc = s => String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const propTipo = a => {
    if (!propField) return '—';
    const p = getPropObj(a[propField]);
    return p.tipo ? (p.destino ? `${p.tipo} → ${p.destino}` : p.tipo) : '—';
  };
  const propColor = a => {
    if (!propField) return '#555';
    const t = getPropObj(a[propField]).tipo;
    if (t === 'Promoción' || t === 'Titulación') return '#166534';
    if (t === 'Repetición') return '#991b1b';
    if (t === 'Abandono') return '#6b7280';
    return '#555';
  };

  // ── SECTION 1: student list ──
  let tbodyRows = '';
  const sorted = [...alumnos].sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'','es'));

  if (isFinal) {
    // Final evaluation: show pending subjects per student + final decision
    sorted.forEach((a, idx) => {
      const pendIII  = (a.pendientesIII  || []);
      const pendExtr = (a.pendientesExtr || []);
      // pendientesExtr son las materias que SIGUEN suspensas tras la extraordinaria
      // (subconjunto de pendIII, no una lista aparte) — no se concatenan para
      // evitar duplicar la misma materia dos veces en la celda.
      const allPend  = pendIII;
      const pendAnt  = (a.pendientesAnteriores || []);
      const recAnt   = (a.recuperadasAnteriores || []);
      const susp     = +a[evalField] || 0;
      const decision = propTipo(a);
      const dColor   = propColor(a);
      const neseMark = (a.nese === 'Sí') ? '<sup style="color:#92400e;font-weight:700" title="NESE">●</sup>' : '';
      // Si hay registro de extraordinaria, se distingue dentro de la misma
      // pastilla qué materias de pendIII siguen suspensas tras ella (rojo) de
      // las que se han recuperado en la extraordinaria (verde + tachado) —
      // nunca se listan dos veces.
      const hayExtr = isBachNivel && a.evalExtr != null && a.evalExtr !== '';
      const pendStr = allPend.length
        ? allPend.map(m => {
            if (!hayExtr) return `<span style="display:inline-block;background:#fef9c3;border:1px solid #fde68a;border-radius:3px;padding:0 4px;font-size:8pt;margin:1px;">${esc(m)}</span>`;
            const sigueSuspensa = pendExtr.includes(m);
            return sigueSuspensa
              ? `<span style="display:inline-block;background:#fee2e2;border:1px solid #fecaca;border-radius:3px;padding:0 4px;font-size:8pt;margin:1px;" title="Sigue pendiente tras la extraordinaria">${esc(m)}</span>`
              : `<span style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:3px;padding:0 4px;font-size:8pt;margin:1px;text-decoration:line-through;color:#166534" title="Recuperada en la extraordinaria">${esc(m)}</span>`;
          }).join(' ')
        : '<span style="color:#166534;font-size:9pt">✓ Todo superado</span>';
      // Pendientes de cursos anteriores que SIGUEN sin recuperar (las recuperadas no se repiten aquí)
      const pendAntSinRecuperar = pendAnt.filter(m => !recAnt.includes(m));
      const pendAntStr = pendAntSinRecuperar.length
        ? pendAntSinRecuperar.map(m => `<span style="display:inline-block;background:#fee2e2;border:1px solid #fecaca;border-radius:3px;padding:0 4px;font-size:8pt;margin:1px;">${esc(m)}</span>`).join(' ')
        : (pendAnt.length ? '<span style="color:#166534;font-size:9pt">✓ Recuperadas</span>' : '<span style="color:#888;font-size:9pt">—</span>');
      tbodyRows += `<tr>
        <td style="text-align:center;color:#888;font-size:9pt">${idx+1}</td>
        <td style="font-weight:600;white-space:nowrap">${esc(a.nombre)}${neseMark}</td>
        <td style="text-align:center;font-weight:700;color:${susp>0?'#b45309':'#166534'}">${susp}</td>
        <td style="font-size:9pt;line-height:1.5">${pendStr}</td>
        <td style="font-size:9pt;line-height:1.5">${pendAntStr}</td>
        <td style="font-weight:700;color:${dColor};white-space:nowrap;font-size:9pt">${esc(decision)}</td>
      </tr>`;
    });
  } else {
    // I or II evaluation: show mat. no superadas + propuesta (if II)
    sorted.forEach((a, idx) => {
      const susp = +a[evalField] || 0;
      const neseMark = (a.nese === 'Sí') ? '<sup style="color:#92400e;font-weight:700" title="NESE">●</sup>' : '';
      const propCell = propField
        ? `<td style="font-weight:700;color:${propColor(a)};white-space:nowrap;font-size:9pt">${esc(propTipo(a))}</td>`
        : '';
      tbodyRows += `<tr>
        <td style="text-align:center;color:#888;font-size:9pt">${idx+1}</td>
        <td style="font-weight:600;white-space:nowrap">${esc(a.nombre)}${neseMark}</td>
        <td style="text-align:center;font-weight:700;color:${susp===0?'#166534':susp>=4?'#991b1b':'#92400e'}">${susp}</td>
        ${propCell}
      </tr>`;
    });
  }

  // ── SECTION 2: NESE students ──
  const neseAlumnos = sorted.filter(a => a.nese === 'Sí' || _getNeseCodes(a.recursoNese).length || (Array.isArray(a.codComp)?a.codComp.length:a.codComp));
  let neseRows = neseAlumnos.map(a => {
    const recurso = _getNeseCodes(a.recursoNese).join(' / ') || '—';
    const codigos = Array.isArray(a.codComp) ? a.codComp.join(', ') : (a.codComp || '—');
    return `<tr>
      <td style="font-weight:600">${esc(a.nombre)}</td>
      <td style="text-align:center">${esc(recurso)}</td>
      <td>${esc(codigos)}</td>
      <td></td>
    </tr>`;
  }).join('');
  if (!neseRows) neseRows = `<tr><td colspan="4" style="text-align:center;color:#888;font-style:italic">Sin alumnado con medidas de atención específica</td></tr>`;

  // Leyenda de los códigos de Compensatoria y de recurso NESE realmente
  // presentes en este grupo (los 9 códigos oficiales están en COMP_CODES;
  // aquí solo se listan los que de verdad aparecen, para no sobrecargar el acta).
  const codigosCompUsados = new Set();
  neseAlumnos.forEach(a => (Array.isArray(a.codComp) ? a.codComp : (a.codComp ? [a.codComp] : [])).forEach(c => codigosCompUsados.add(String(c))));
  const leyendaComp = (typeof COMP_CODES !== 'undefined' ? COMP_CODES : []).filter(c => codigosCompUsados.has(c.code));
  const usaAL = neseAlumnos.some(a => _getNeseCodes(a.recursoNese).includes('AL'));
  const usaPT = neseAlumnos.some(a => _getNeseCodes(a.recursoNese).includes('PT'));

  // ── SECTION 3: summary stats ──
  const total       = alumnos.length;
  const todo0       = alumnos.filter(a=>(+a[evalField]||0)===0).length;
  const con1_2      = alumnos.filter(a=>{const v=+a[evalField]||0;return v>=1&&v<=2;}).length;
  const con3_4      = alumnos.filter(a=>{const v=+a[evalField]||0;return v>=3&&v<=4;}).length;
  const con5mas     = alumnos.filter(a=>(+a[evalField]||0)>=5).length;
  const nese        = alumnos.filter(a=>a.nese==='Sí').length;
  const repetidores = alumnos.filter(a=>a.repetidor==='Sí').length;

  let propSummary = '';
  if (propField) {
    const reps   = alumnos.filter(a=>getPropObj(a[propField]).tipo==='Repetición').length;
    const promos = alumnos.filter(a=>getPropObj(a[propField]).tipo==='Promoción').length;
    const titula = alumnos.filter(a=>getPropObj(a[propField]).tipo==='Titulación').length;
    const abando = alumnos.filter(a=>getPropObj(a[propField]).tipo==='Abandono').length;
    const sinDec = alumnos.filter(a=>!getPropObj(a[propField]).tipo).length;
    propSummary = `
      <tr><td colspan="2" style="background:#f0fdf4;font-weight:700;color:#166534;padding:5px 8px">Promocionan / Titulan</td>
          <td style="background:#f0fdf4;font-weight:700;color:#166534;text-align:center">${promos + titula}</td>
          <td style="background:#f0fdf4;color:#166534;font-size:9pt">${Math.round((promos+titula)/total*100)}%</td></tr>
      <tr><td colspan="2" style="background:#fef2f2;font-weight:700;color:#991b1b;padding:5px 8px">Repiten</td>
          <td style="background:#fef2f2;font-weight:700;color:#991b1b;text-align:center">${reps}</td>
          <td style="background:#fef2f2;color:#991b1b;font-size:9pt">${Math.round(reps/total*100)}%</td></tr>
      ${abando > 0 ? `<tr><td colspan="2" style="padding:5px 8px;color:#6b7280">Abandono</td>
          <td style="text-align:center;color:#6b7280">${abando}</td>
          <td style="color:#6b7280;font-size:9pt">${Math.round(abando/total*100)}%</td></tr>` : ''}
      ${sinDec > 0 ? `<tr><td colspan="2" style="padding:5px 8px;color:#b45309">Sin decisión</td>
          <td style="text-align:center;color:#b45309">${sinDec}</td>
          <td style="font-size:9pt;color:#b45309">${Math.round(sinDec/total*100)}%</td></tr>` : ''}`;
  }

  // Empty rows for professors
  const profRows = Array(18).fill('').map((_,i)=>
    `<tr><td style="color:#bbb;text-align:center">${i+1}</td><td></td><td></td></tr>`
  ).join('');

  // ══════════════════════════════════════════════════════════════════════
  // NUEVAS SECCIONES: estadísticas académicas y de convivencia adicionales
  // ══════════════════════════════════════════════════════════════════════

  // Materias no superadas EN ESTA EVALUACIÓN (misma fuente que la tabla
  // principal: pendientes1 / pendientes2 / pendientesIII), para el ranking
  // de materias con más suspensos y el detalle por alumno.
  const pendField = evalNum === 1 ? 'pendientes1' : evalNum === 2 ? 'pendientes2' : 'pendientesIII';
  const matCount = {};
  alumnos.forEach(a => (Array.isArray(a[pendField]) ? a[pendField] : []).forEach(m => { matCount[m] = (matCount[m] || 0) + 1; }));
  const matRanking = Object.entries(matCount).map(([materia, susp]) => ({ materia, susp }))
    .sort((a, b) => b.susp - a.susp || a.materia.localeCompare(b.materia, 'es'));
  const maxSuspMat = matRanking.length ? matRanking[0].susp : 1;
  const alumnosConSusp = sorted.filter(a => (Array.isArray(a[pendField]) ? a[pendField] : []).length > 0);

  // Materias pendientes de cursos anteriores: una fila por (alumno, materia)
  // con su estado (recuperada / en proceso / no recuperada) y campos libres
  // de nota y motivo que el equipo docente rellena en la propia sesión.
  const alumnosConPendAnt = sorted.filter(a => (a.pendientesAnteriores || []).length > 0);

  // Faltas de asistencia, AC, partes de amonestación y expedientes de esta evaluación.
  const fjField = `faltasJust${evalNum}`, fiField = `faltasInjust${evalNum}`,
        acField = `ac${evalNum}`, partField = `partes${evalNum}`, expField = `expedientes${evalNum}`;
  const totalFJ = alumnos.reduce((s, a) => s + (+a[fjField] || 0), 0);
  const totalFI = alumnos.reduce((s, a) => s + (+a[fiField] || 0), 0);
  const totalAC = alumnos.reduce((s, a) => s + (+a[acField] || 0), 0);
  const totalPartes = alumnos.reduce((s, a) => s + (+a[partField] || 0), 0);
  const totalExp = alumnos.reduce((s, a) => s + (+a[expField] || 0), 0);
  const alumnosConvivencia = sorted
    .filter(a => (+a[fjField] || 0) + (+a[fiField] || 0) + (+a[acField] || 0) + (+a[partField] || 0) + (+a[expField] || 0) > 0)
    .sort((a, b) => (+b[fiField] || 0) - (+a[fiField] || 0) || (+b[partField] || 0) - (+a[partField] || 0) || (+b[expField] || 0) - (+a[expField] || 0));

  // Evolución del nº medio de materias no superadas respecto a la evaluación
  // anterior (solo tiene sentido a partir de la II Evaluación).
  let evolucion = null;
  if (evalNum >= 2 && total > 0) {
    const prevField = evalNum === 2 ? 'eval1' : 'eval2';
    const prevLabel = evalNum === 2 ? 'I Evaluación' : 'II Evaluación';
    const promPrev = alumnos.reduce((s, a) => s + (+a[prevField] || 0), 0) / total;
    const promAct  = alumnos.reduce((s, a) => s + (+a[evalField] || 0), 0) / total;
    evolucion = { prevLabel, promPrev, promAct, delta: promAct - promPrev };
  }

  // ── HEADER COLUMNS for main table ──
  const mainThFinal = `<th>Nº</th><th>Alumno/a</th><th style="text-align:center">Mat. no sup.</th><th>Materias pendientes</th><th>Pend. cursos ant.</th><th>Decisión final</th>`;
  const mainThNonFinal = `<th>Nº</th><th>Alumno/a</th><th style="text-align:center">Mat. no sup.</th>${propField ? '<th>Propuesta</th>' : ''}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Acta ${evalOrdinal[evalNum]} Evaluación — ${nivel} ${grupo}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; color: #111; background:#fff; }
  .page { padding: 14mm 16mm; max-width: 210mm; margin: 0 auto; }

  /* HEADER */
  .acta-header { border: 2px solid #1a3a6b; border-radius: 4px; margin-bottom: 14px; overflow: hidden; }
  .acta-header-top {
    background: #1a3a6b; color: white; padding: 8px 14px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .acta-header-title { font-size: 13pt; font-weight: bold; letter-spacing: 0.3px; }
  .acta-header-badge {
    background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4);
    border-radius: 4px; padding: 3px 10px; font-size: 10pt; font-weight: bold;
  }
  .acta-meta { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0; }
  .acta-meta-cell {
    padding: 7px 14px; border-right: 1px solid #c5d8ef;
    font-size: 9.5pt;
  }
  .acta-meta-cell:last-child { border-right: none; }
  .acta-meta-label { color: #5a6a8a; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px; }
  .acta-meta-value { font-weight: bold; color: #1a2a4a; }
  .acta-meta-input {
    border: none; border-bottom: 1.5px solid #93c5fd; outline: none;
    font-family: Arial; font-size: 10pt; font-weight: bold; color: #1a2a4a;
    background: transparent; width: 100%; padding: 1px 0;
  }

  /* SECTION TITLES */
  .section-title {
    font-size: 9pt; font-weight: bold; text-transform: uppercase;
    letter-spacing: 0.6px; color: #1a3a6b;
    border-bottom: 2px solid #1a3a6b; padding-bottom: 4px;
    margin: 16px 0 8px;
  }
  .section-title span { background: #1a3a6b; color: white; padding: 1px 8px; border-radius: 3px; margin-right: 8px; font-size: 9pt; }

  /* TABLES */
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th {
    background: #dce8f5; font-weight: bold; padding: 5px 8px;
    border: 1px solid #9ab5d4; text-align: left; color: #1a3a6b;
    font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.3px;
  }
  td { padding: 5px 8px; border: 1px solid #c0d0e0; vertical-align: middle; }
  tr:nth-child(even) td { background: #f8faff; }
  tr:hover td { background: #eef4ff; }

  /* STATS CARD */
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
  .stat-box {
    border: 1px solid #c5d8ef; border-radius: 5px; padding: 8px 10px;
    text-align: center; background: #f8faff;
  }
  .stat-box .sv { font-size: 18pt; font-weight: bold; line-height: 1.1; }
  .stat-box .sl { font-size: 8pt; color: #5a6a8a; margin-top: 2px; }
  .stat-box.green { border-color: #86efac; background: #f0fdf4; }
  .stat-box.green .sv { color: #166534; }
  .stat-box.red { border-color: #fca5a5; background: #fef2f2; }
  .stat-box.red .sv { color: #991b1b; }
  .stat-box.yellow { border-color: #fde68a; background: #fefce8; }
  .stat-box.yellow .sv { color: #92400e; }
  .stat-box.blue { border-color: #93c5fd; }
  .stat-box.blue .sv { color: #1e40af; }

  /* ACUERDOS */
  .acuerdos-box {
    border: 1.5px solid #c5d8ef; border-radius: 5px; min-height: 90px;
    padding: 8px 12px; margin-bottom: 12px; font-size: 10pt; line-height: 1.7;
    background: #fafcff; color: #1a2a4a;
  }
  [contenteditable]:focus { outline: 2px solid #93c5fd; border-radius: 3px; }
  [contenteditable]:empty:before { content: attr(data-placeholder); color: #aab0c4; font-style: italic; }

  /* FIRMA */
  .firmas-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 14px; }
  .firma-block { text-align: center; }
  .firma-line { border-bottom: 1.5px solid #555; height: 38px; margin-bottom: 4px; }
  .firma-label { font-size: 8.5pt; color: #5a6a8a; text-transform: uppercase; letter-spacing: 0.4px; }
  .firma-name  { font-size: 9pt; font-weight: bold; color: #1a2a4a; margin-top: 2px; min-height: 14px; }

  /* PRINT */
  @media print {
    @page { margin: 12mm 14mm; size: A4; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
  }

  /* TOOLBAR */
  .acta-toolbar {
    position: sticky; top: 0; z-index: 50;
    background: #1a1d27; padding: 10px 20px;
    display: flex; align-items: center; justify-content: space-between;
    gap: 10px; flex-wrap: wrap;
  }
  .acta-toolbar-title { font-family: inherit; font-size: 13px; font-weight: 600; color: #e8eaf2; }
  .toolbar-btn {
    padding: 7px 16px; border-radius: 7px; border: none; cursor: pointer;
    font-family: Arial; font-size: 12px; font-weight: 600;
  }
  .btn-print  { background: #2563eb; color: white; }
  .btn-close  { background: transparent; color: #8891b4; border: 1px solid #2e3350; }
  .btn-print:hover { background: #1d4ed8; }
  .btn-close:hover { color: #e8eaf2; }
</style>
</head>
<body>

<div class="acta-toolbar no-print">
  <span class="acta-toolbar-title">📋 Acta ${evalLabel} Evaluación — ${esc(nivel)} ${esc(grupo)}</span>
  <div style="display:flex;gap:8px;flex-wrap:wrap;">
    <button class="toolbar-btn" id="aoSaveBtn" style="background:#2dd4a0;color:#062b20;" onclick="_aoGuardar()">💾 Guardar</button>
    <button class="toolbar-btn" style="background:#8a63d2;color:#fff;" onclick="_aoExportarWord()">📄 Exportar a Word</button>
    <button class="toolbar-btn" style="background:#22d3ee;color:#042a30;" onclick="_aoExportarHTML()">🌐 Exportar a HTML</button>
    <button class="toolbar-btn btn-print" onclick="window.print()">🖨️ Imprimir / PDF</button>
    <button class="toolbar-btn btn-close" onclick="window.close()">✕ Cerrar</button>
  </div>
</div>

<div class="page">

  <!-- CABECERA OFICIAL -->
  <div class="acta-header">
    <div class="acta-header-top">
      <div>
        <div style="font-size:9pt;opacity:0.8;letter-spacing:1px;text-transform:uppercase;margin-bottom:2px">Generalitat Valenciana · Conselleria d'Educació</div>
        <div class="acta-header-title">ACTA DE ${evalLabel.toUpperCase()} EVALUACIÓN</div>
      </div>
      <div class="acta-header-badge">Evaluación ${evalOrdinal[evalNum]}</div>
    </div>
    <div class="acta-meta">
      <div class="acta-meta-cell">
        <div class="acta-meta-label">Centro educativo</div>
        <div class="acta-meta-value">${esc(iesName)}</div>
      </div>
      <div class="acta-meta-cell">
        <div class="acta-meta-label">Nivel y grupo</div>
        <div class="acta-meta-value">${esc(nivel)} — Grupo ${esc(grupo)}</div>
      </div>
      <div class="acta-meta-cell">
        <div class="acta-meta-label">Tutor/a</div>
        <div class="acta-meta-value">${esc(tutor) || '&nbsp;'}</div>
      </div>
      <div class="acta-meta-cell">
        <div class="acta-meta-label">Fecha de la sesión</div>
        <div class="acta-meta-value">
          <input class="acta-meta-input" type="text" value="${dateStr}" placeholder="dd/mm/aaaa" />
        </div>
      </div>
      <div class="acta-meta-cell">
        <div class="acta-meta-label">Curso escolar</div>
        <div class="acta-meta-value">${_tCursoActual(" – ")}</div>
      </div>
      <div class="acta-meta-cell">
        <div class="acta-meta-label">Nº total de alumnos</div>
        <div class="acta-meta-value">${total}</div>
      </div>
    </div>
  </div>

  <!-- ESTADÍSTICAS RÁPIDAS -->
  <div class="stats-grid">
    <div class="stat-box blue"><div class="sv">${total}</div><div class="sl">Total alumnos</div></div>
    <div class="stat-box green"><div class="sv">${todo0}</div><div class="sl">Todo superado</div></div>
    <div class="stat-box yellow"><div class="sv">${con1_2}</div><div class="sl">1–2 no sup.</div></div>
    <div class="stat-box red"><div class="sv">${con3_4 + con5mas}</div><div class="sl">3+ no sup.</div></div>
    <div class="stat-box yellow"><div class="sv">${nese}</div><div class="sl">Con NESE</div></div>
    <div class="stat-box"><div class="sv">${repetidores}</div><div class="sl">Repetidores</div></div>
    <div class="stat-box blue"><div class="sv">${con5mas}</div><div class="sl">≥5 no sup.</div></div>
    <div class="stat-box"><div class="sv" style="font-size:14pt">${esc(nivel)}</div><div class="sl">Nivel</div></div>
  </div>

  <!-- SECCIÓN 1: RELACIÓN DE ALUMNADO -->
  <div class="section-title"><span>${nextSec()}</span>Relación de alumnado y resultados</div>
  <table>
    <thead><tr>${isFinal ? mainThFinal : mainThNonFinal}</tr></thead>
    <tbody>${tbodyRows}</tbody>
  </table>

  ${propField ? `
  <!-- RESUMEN PROPUESTAS -->
  <div class="section-title" style="margin-top:18px"><span>${nextSec()}</span>Resumen de propuestas / decisiones</div>
  <table style="max-width:420px">
    <thead><tr><th colspan="2">Decisión</th><th style="text-align:center">Alumnos</th><th>%</th></tr></thead>
    <tbody>
      <tr><td colspan="2" style="padding:5px 8px">Todo superado</td>
          <td style="text-align:center">${todo0}</td>
          <td style="font-size:9pt">${Math.round(todo0/total*100)}%</td></tr>
      ${propSummary}
    </tbody>
  </table>` : ''}

  <!-- SECCIÓN NUEVA: RANKING DE MATERIAS CON MÁS SUSPENSOS -->
  <div class="section-title" style="margin-top:18px"><span>${nextSec()}</span>Materias con más alumnado suspenso</div>
  ${matRanking.length ? `
  <table style="max-width:540px">
    <thead><tr><th>Materia</th><th style="text-align:center;width:70px">Suspensos</th><th style="width:170px">&nbsp;</th></tr></thead>
    <tbody>
      ${matRanking.map(x => `<tr>
        <td style="font-size:9.5pt">${esc(x.materia)}</td>
        <td style="text-align:center;font-weight:700;color:${x.susp>0?'#991b1b':'#166534'}">${x.susp}</td>
        <td><div style="background:#f1f5f9;border-radius:4px;height:10px;overflow:hidden;"><div style="width:${Math.round(x.susp/maxSuspMat*100)}%;height:10px;background:#ef4444;"></div></div></td>
      </tr>`).join('')}
    </tbody>
  </table>` : `<div style="color:#166534;font-size:9.5pt;font-style:italic">✓ No hay materias con alumnado suspenso en esta evaluación.</div>`}

  ${!isFinal ? `
  <!-- SECCIÓN NUEVA: DETALLE DE MATERIAS SUSPENDIDAS POR ALUMNO -->
  <div class="section-title" style="margin-top:18px"><span>${nextSec()}</span>Detalle de materias suspendidas por alumno</div>
  ${alumnosConSusp.length ? `
  <table>
    <thead><tr><th style="width:32%">Alumno/a</th><th>Materias suspendidas</th></tr></thead>
    <tbody>
      ${alumnosConSusp.map(a => `<tr>
        <td style="font-weight:600">${esc(a.nombre)}</td>
        <td style="font-size:9pt;line-height:1.5">${(a[pendField]||[]).map(m=>`<span style="display:inline-block;background:#fee2e2;border:1px solid #fecaca;border-radius:3px;padding:0 4px;font-size:8pt;margin:1px;">${esc(m)}</span>`).join(' ')}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : `<div style="color:#166534;font-size:9.5pt;font-style:italic">✓ Ningún alumno tiene materias suspendidas en esta evaluación.</div>`}
  ` : ''}

  <!-- SECCIÓN NUEVA: MATERIAS PENDIENTES DE CURSOS ANTERIORES — DECISIÓN -->
  <div class="section-title page-break" style="margin-top:18px"><span>${nextSec()}</span>Materias pendientes de cursos anteriores — decisión adoptada</div>
  ${alumnosConPendAnt.length ? `
  <div style="font-size:8.5pt;color:#5a6a8a;margin-bottom:6px">Para cada materia pendiente: si la recuperación está en proceso, si ya se ha recuperado (con qué nota) o si no se ha recuperado (con el motivo).</div>
  <table>
    <thead><tr><th style="width:20%">Alumno/a</th><th style="width:20%">Materia pendiente</th><th style="width:19%">Estado</th><th style="width:11%">Nota</th><th>Motivo / Observaciones</th></tr></thead>
    <tbody>
      ${alumnosConPendAnt.map((a, ai) => (a.pendientesAnteriores||[]).map((m, mi) => {
        const pk = `${ai}-${mi}`;
        const recuperada = (a.recuperadasAnteriores||[]).includes(m);
        const fila = guardadaPendAnt[pk] || null;
        const estadoG = fila ? fila.estado : (recuperada ? 'Recuperada' : 'En proceso de recuperación');
        const notaG = fila ? esc(fila.nota||'') : '';
        const motivoG = fila ? esc(fila.motivo||'') : '';
        return `<tr data-pk="${pk}">
          <td style="font-weight:600">${esc(a.nombre)}</td>
          <td style="font-size:9pt">${esc(m)}</td>
          <td><select class="ao-estado-select" style="font-family:inherit;font-size:8.5pt;border:1px solid #c5d8ef;border-radius:3px;padding:2px 4px;background:#fff;max-width:100%;">
            <option ${estadoG==='En proceso de recuperación'?'selected':''}>En proceso de recuperación</option>
            <option ${estadoG==='Recuperada'?'selected':''}>Recuperada</option>
            <option ${estadoG==='No recuperada'?'selected':''}>No recuperada</option>
          </select></td>
          <td contenteditable="true" class="ao-nota" style="font-size:9pt;min-width:36px">${notaG}</td>
          <td contenteditable="true" class="ao-motivo" style="font-size:9pt;min-width:110px">${motivoG}</td>
        </tr>`;
      }).join('')).join('')}
    </tbody>
  </table>` : `<div style="color:#166534;font-size:9.5pt;font-style:italic">✓ Ningún alumno tiene materias pendientes de cursos anteriores.</div>`}

  <!-- SECCIÓN NESE -->
  <div class="section-title page-break" style="margin-top:36px"><span>${nextSec()}</span>Alumnado NESE y de Compensatoria</div>
  <div style="font-size:8.5pt;color:#5a6a8a;margin-bottom:6px">
    AL = Audición y Lenguaje · PT = Pedagogía Terapéutica · «Cód. Comp.» = código oficial de compensatoria educativa (ver leyenda debajo de la tabla)
  </div>
  <table>
    <thead><tr><th style="width:35%">Alumno/a</th><th style="width:15%;text-align:center">Recurso</th><th style="width:20%">Cód. Comp.</th><th>Observaciones / Medidas tomadas</th></tr></thead>
    <tbody>${neseRows}</tbody>
  </table>
  ${(leyendaComp.length || usaAL || usaPT) ? `
  <div style="font-size:8pt;color:#3a4560;margin-top:6px;line-height:1.7;background:#f8faff;border:1px solid #e2e8f5;border-radius:5px;padding:8px 10px;">
    <strong>Leyenda de códigos</strong>
    ${(usaAL || usaPT) ? `<br>${usaAL?'<strong>AL</strong> = Audición y Lenguaje':''}${usaAL&&usaPT?' · ':''}${usaPT?'<strong>PT</strong> = Pedagogía Terapéutica':''}` : ''}
    ${leyendaComp.length ? leyendaComp.map(c => `<br><strong>${esc(c.code)}</strong> = ${esc(c.label)}`).join('') : ''}
  </div>` : ''}

  <!-- SECCIÓN NUEVA: FALTAS DE ASISTENCIA Y CONVIVENCIA -->
  <div class="section-title page-break" style="margin-top:32px"><span>${nextSec()}</span>Faltas de asistencia y convivencia</div>
  <div class="stats-grid" style="margin-bottom:10px">
    <div class="stat-box blue"><div class="sv">${totalFJ}</div><div class="sl">Faltas justif.</div></div>
    <div class="stat-box red"><div class="sv">${totalFI}</div><div class="sl">Faltas injustif.</div></div>
    <div class="stat-box yellow"><div class="sv">${totalAC}</div><div class="sl">Amonestaciones (AC)</div></div>
    <div class="stat-box red"><div class="sv">${totalPartes}</div><div class="sl">Partes</div></div>
    <div class="stat-box red"><div class="sv">${totalExp}</div><div class="sl">Expedientes</div></div>
  </div>
  ${alumnosConvivencia.length ? `
  <table>
    <thead><tr><th style="width:28%">Alumno/a</th><th style="text-align:center">F. Just.</th><th style="text-align:center">F. Injust.</th><th style="text-align:center">AC</th><th style="text-align:center">Partes</th><th style="text-align:center">Expedientes</th></tr></thead>
    <tbody>
      ${alumnosConvivencia.map(a => `<tr>
        <td style="font-weight:600">${esc(a.nombre)}</td>
        <td style="text-align:center">${+a[fjField]||0}</td>
        <td style="text-align:center;font-weight:${(+a[fiField]||0)>0?'700':'400'};color:${(+a[fiField]||0)>0?'#991b1b':'#111'}">${+a[fiField]||0}</td>
        <td style="text-align:center">${+a[acField]||0}</td>
        <td style="text-align:center;font-weight:${(+a[partField]||0)>0?'700':'400'};color:${(+a[partField]||0)>0?'#b45309':'#111'}">${+a[partField]||0}</td>
        <td style="text-align:center;font-weight:${(+a[expField]||0)>0?'700':'400'};color:${(+a[expField]||0)>0?'#991b1b':'#111'}">${+a[expField]||0}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : `<div style="color:#166534;font-size:9.5pt;font-style:italic">✓ No hay faltas ni incidencias registradas en esta evaluación.</div>`}

  ${evolucion ? `
  <!-- SECCIÓN NUEVA: EVOLUCIÓN RESPECTO A LA EVALUACIÓN ANTERIOR -->
  <div class="section-title" style="margin-top:18px"><span>${nextSec()}</span>Evolución respecto a la evaluación anterior</div>
  <div class="stats-grid" style="margin-bottom:6px">
    <div class="stat-box"><div class="sv">${evolucion.promPrev.toFixed(2)}</div><div class="sl">Media ${evolucion.prevLabel}</div></div>
    <div class="stat-box"><div class="sv">${evolucion.promAct.toFixed(2)}</div><div class="sl">Media ${evalLabel} Evaluación</div></div>
    <div class="stat-box ${evolucion.delta<0?'green':evolucion.delta>0?'red':'yellow'}"><div class="sv">${evolucion.delta>0?'+':''}${evolucion.delta.toFixed(2)}</div><div class="sl">${evolucion.delta<0?'Mejora':evolucion.delta>0?'Empeora':'Sin cambios'} (nº medio de materias no superadas)</div></div>
  </div>
  ` : ''}

  <!-- SECCIÓN ACUERDOS -->
  <div class="section-title" style="margin-top:32px"><span>${nextSec()}</span>Acuerdos de la sesión de evaluación</div>
  <div class="acuerdos-box" id="acuerdosBox" contenteditable="true"
    data-placeholder="Escribe aquí los acuerdos adoptados en la sesión: medidas de mejora, compromisos del equipo docente, actuaciones con familias, etc.">${guardada.acuerdos || ''}</div>
  <div class="no-print" style="font-size:8pt;color:#9aa3bb;margin-top:4px;">Pulsa «💾 Guardar» para no perder este texto, las firmas y las decisiones sobre pendientes — la ventana no lo guarda solo al cerrarla.</div>

  <!-- SECCIÓN PROFESORES ASISTENTES -->
  <div class="section-title"><span>${nextSec()}</span>Profesorado asistente a la sesión</div>
  <table>
    <thead><tr><th style="width:4%">#</th><th>Nombre del profesor/a</th><th>Materia que imparte</th></tr></thead>
    <tbody>${profRows}</tbody>
  </table>

  <!-- FIRMAS -->
  <div class="section-title" style="margin-top:20px"><span>${nextSec()}</span>Firmas</div>
  <div class="firmas-grid">
    <div class="firma-block">
      <div class="firma-line"></div>
      <div class="firma-label">Tutor/a del grupo</div>
      <div class="firma-name">${esc(tutor)}</div>
    </div>
    <div class="firma-block">
      <div class="firma-line"></div>
      <div class="firma-label">Jefe/a de Estudios</div>
      <div class="firma-name" id="firmaJefeEstudios" contenteditable="true" data-placeholder="Nombre y apellidos">${esc(guardada.jefeEstudios||'')}</div>
    </div>
    <div class="firma-block">
      <div class="firma-line"></div>
      <div class="firma-label">Director/a del centro</div>
      <div class="firma-name" id="firmaDirector" contenteditable="true" data-placeholder="Nombre y apellidos">${esc(guardada.director||'')}</div>
    </div>
  </div>
  <div style="text-align:right;margin-top:10px;font-size:8.5pt;color:#888">
    Generado el ${dateStr} · Gestor de Tutoría · ${esc(iesName)}
  </div>

</div><!-- /page -->
<script>
window.onload = function(){ /* ready */ };

var _AO_NIVEL = '${jsEsc(nivel)}';
var _AO_GRUPO = '${jsEsc(grupo)}';
var _AO_EVAL  = ${evalNum};

// Guarda en la ventana principal (window.opener) todo el contenido rellenable
// de esta acta: acuerdos, firmas de Jefatura/Dirección y las decisiones sobre
// materias pendientes de cursos anteriores. Esta ventana emergente no tiene
// forma propia de persistir datos entre sesiones.
function _aoGuardar() {
  var box = document.getElementById('acuerdosBox');
  var acuerdos = box ? box.innerHTML : '';
  var jefeEl = document.getElementById('firmaJefeEstudios');
  var dirEl  = document.getElementById('firmaDirector');
  var jefeEstudios = jefeEl ? jefeEl.textContent.trim() : '';
  var director = dirEl ? dirEl.textContent.trim() : '';
  var pendAnt = {};
  var filas = document.querySelectorAll('tr[data-pk]');
  for (var i = 0; i < filas.length; i++) {
    var tr = filas[i];
    var pk = tr.getAttribute('data-pk');
    var sel = tr.querySelector('.ao-estado-select');
    var nota = tr.querySelector('.ao-nota');
    var motivo = tr.querySelector('.ao-motivo');
    pendAnt[pk] = {
      estado: sel ? sel.options[sel.selectedIndex].text : '',
      nota: nota ? nota.textContent.trim() : '',
      motivo: motivo ? motivo.textContent.trim() : ''
    };
  }
  var btn = document.getElementById('aoSaveBtn');
  if (window.opener && !window.opener.closed && typeof window.opener.guardarActaOficial === 'function') {
    window.opener.guardarActaOficial(_AO_NIVEL, _AO_GRUPO, _AO_EVAL, {
      acuerdos: acuerdos, jefeEstudios: jefeEstudios, director: director, pendAnt: pendAnt
    });
    if (btn) {
      var original = btn.textContent;
      btn.textContent = '✓ Guardado';
      setTimeout(function(){ if (btn) btn.textContent = original; }, 1600);
    }
  } else {
    alert('No se puede guardar: se ha perdido la conexión con la ventana principal del Gestor de Tutoría. Vuelve a abrir el Acta Oficial desde allí e inténtalo de nuevo.');
  }
}

// Clona la página quitando los controles de pantalla (toolbar) antes de
// exportar, igual que se hace con las actas editables.
function _aoCleanClone() {
  var clone = document.querySelector('.page').cloneNode(true);
  var els = clone.querySelectorAll('.no-print');
  for (var i = 0; i < els.length; i++) { els[i].parentNode.removeChild(els[i]); }
  return clone;
}

function _aoDownload(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = filename; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
}

function _aoFileBase() {
  return ('Acta_Oficial_${jsEsc(evalOrdinal[evalNum])}_${jsEsc(nivel)}_${jsEsc(grupo)}').replace(/[^a-zA-Z0-9ÁÉÍÓÚÑÜáéíóúñü]+/g,'_');
}

// Exporta el acta oficial tal cual se ve (misma hoja de estilos), para no
// perder la maquetación al archivarla o compartirla.
function _aoExportarHTML() {
  var clone = _aoCleanClone();
  var styleEl = document.querySelector('style');
  var css = styleEl ? styleEl.textContent : '';
  var html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Acta ${jsEsc(evalLabel)} Evaluación — ${jsEsc(nivel)} ${jsEsc(grupo)}</title><style>' + css + '</style></head><body>' + clone.outerHTML + '</body></html>';
  var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  _aoDownload(blob, _aoFileBase() + '.html');
}

// Igual que en las actas editables: Word no entiende flexbox/grid, así que
// las zonas maquetadas en cuadrícula (cabecera, estadísticas, firmas) se
// convierten a tablas equivalentes antes de exportar.
function _aoWordifyGrid(container, itemSelector, perRow) {
  if (!container) return;
  var items = Array.prototype.filter.call(container.children, function(el){ return el.matches(itemSelector); });
  if (!items.length) return;
  var table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;table-layout:fixed;';
  for (var i = 0; i < items.length; i += perRow) {
    var tr = document.createElement('tr');
    for (var j = i; j < Math.min(i + perRow, items.length); j++) {
      var td = document.createElement('td');
      td.className = items[j].className;
      td.style.cssText = 'vertical-align:top;border:none;padding:3px;';
      td.innerHTML = items[j].innerHTML;
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  container.parentNode.replaceChild(table, container);
}

function _aoExportarWord() {
  var clone = _aoCleanClone();
  var editables = clone.querySelectorAll('[contenteditable]');
  for (var k = 0; k < editables.length; k++) { editables[k].removeAttribute('contenteditable'); }
  var inputs = clone.querySelectorAll('input');
  for (var m = 0; m < inputs.length; m++) {
    var span = document.createElement('span');
    span.textContent = inputs[m].value || '';
    inputs[m].parentNode.replaceChild(span, inputs[m]);
  }
  // Word no interpreta los <select> (estado de las materias pendientes) como
  // controles útiles: se sustituyen por el texto de la opción seleccionada.
  var selects = clone.querySelectorAll('select');
  for (var s = 0; s < selects.length; s++) {
    var selSpan = document.createElement('span');
    var opt = selects[s].options[selects[s].selectedIndex];
    selSpan.textContent = opt ? opt.text : '';
    selects[s].parentNode.replaceChild(selSpan, selects[s]);
  }
  _aoWordifyGrid(clone.querySelector('.acta-meta'), '.acta-meta-cell', 3);
  var statsGrids = clone.querySelectorAll('.stats-grid');
  for (var g = 0; g < statsGrids.length; g++) { _aoWordifyGrid(statsGrids[g], '.stat-box', 4); }
  _aoWordifyGrid(clone.querySelector('.firmas-grid'), '.firma-block', 3);
  var styleEl = document.querySelector('style');
  var css = styleEl ? styleEl.textContent : '';
  var titulo = 'Acta ${jsEsc(evalLabel)} Evaluación — ${jsEsc(nivel)} ${jsEsc(grupo)}';
  var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>' + titulo + '</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]--><style>@page Section1 { size: 21cm 29.7cm; margin: 1.2cm 1.4cm 1.8cm 1.4cm; } div.Section1 { page: Section1; } table { border-collapse: collapse; } ' + css + '</style></head><body><div class="Section1">' + clone.outerHTML + '</div></body></html>';
  var blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  _aoDownload(blob, _aoFileBase() + '.doc');
}
<\/script>
</body>
</html>`;

  const win = _ventanaDoc();
  if (win) { win.document.write(html); win.document.close(); }
  else showToast('⚠ Permite las ventanas emergentes para generar el acta');
}

// ===================== EXPORT STATS PDF =====================

// Mapea cada fuente de pendientes a sus campos de nota y propuesta asociados,
// para poder construir el PDF de Estadísticas de cualquier evaluación.
const INFORME_PDF_CAMPOS = {
  pendientes1:    { campoEval: 'eval1',    campoPend: 'pendientes1',    campoProp: 'propuesta1', tituloEval: 'I Evaluación' },
  pendientes2:    { campoEval: 'eval2',    campoPend: 'pendientes2',    campoProp: 'propuesta2', tituloEval: 'II Evaluación' },
  pendientesIII:  { campoEval: 'eval3',    campoPend: 'pendientesIII',  campoProp: 'promociona', tituloEval: 'Evaluación Final' },
  pendientesExtr: { campoEval: 'evalExtr', campoPend: 'pendientesExtr', campoProp: 'promociona', tituloEval: 'Evaluación Extraordinaria' },
};

// PDF de Estadísticas — se exporta desde la pestaña Informe Académico para la
// evaluación actualmente seleccionada (fuente = 'pendientes1'|'pendientes2'|'pendientesIII'|'pendientesExtr').
// Recoge, para cada grupo, toda la información relevante de esa evaluación:
// nota media, materias suspendidas, propuesta/decisión, NESE y Compensatoria.
function exportStatsPDF(fuente) {
  const cfg = INFORME_PDF_CAMPOS[fuente] || INFORME_PDF_CAMPOS.pendientesIII;
  const fcfg = INFORME_FUENTES[fuente] || INFORME_FUENTES.pendientesIII;
  const soloBach = !!fcfg.soloBach;
  const nivelesFuente = soloBach ? NIVELES.filter(n => isBach(n)) : NIVELES;

  // Recopilar todos los grupos con alumnos para esta evaluación
  const gruposInfo = [];
  nivelesFuente.forEach(n => (GRUPOS_POR_NIVEL[n]||[]).forEach(g => {
    const alumnos = (data[n]?.[g] || []).filter(a => a.nombre && a.nombre.trim());
    if (alumnos.length) gruposInfo.push({ nivel: n, grupo: g, alumnos });
  }));

  if (!gruposInfo.length) {
    showToast(soloBach
      ? '⚠ No hay alumnos de Bachillerato registrados para la Evaluación Extraordinaria'
      : '⚠ No hay alumnos registrados');
    return;
  }

  const dateStr = new Date().toLocaleDateString('es-ES',{year:'numeric',month:'long',day:'numeric'});
  const iesName = document.getElementById('headerIesName')?.value || 'Centro Educativo';
  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const bar = (v, max, color) => {
    const pct = max ? Math.round(v/max*100) : 0;
    return `<div style="display:flex;align-items:center;gap:8px;margin:3px 0">
      <div style="flex:1;background:#e8ecf4;border-radius:4px;height:12px;overflow:hidden">
        <div style="width:${pct}%;background:${color};height:100%;border-radius:4px"></div>
      </div>
      <span style="min-width:28px;font-weight:700;font-size:11px">${v}</span>
      <span style="min-width:35px;color:#666;font-size:10px">${pct}%</span>
    </div>`;
  };

  // ── Cálculo de estadísticas por grupo ──
  const statsGrupos = gruposInfo.map(({ nivel, grupo, alumnos }) => {
    const total = alumnos.length;
    const tutor = tutores[`${nivel}-${grupo}`] || '—';
    const avgEval = (alumnos.reduce((s,a)=>s+(+a[cfg.campoEval]||0),0)/total).toFixed(1);
    const todoAprobado = alumnos.filter(a => (Array.isArray(a[cfg.campoPend]) ? a[cfg.campoPend].length : 0) === 0 && (+a[cfg.campoEval]||0) === 0).length;
    const nese = alumnos.filter(a=>a.nese==='Sí').length;
    const comp = alumnos.filter(a=>a.compensatoria==='Sí').length;
    const rep  = alumnos.filter(a=>a.repetidor==='Sí').length;

    // Propuesta / decisión (no existe campo propio para la extraordinaria: se usa 'promociona')
    const propCount = { 'Promoción':0,'Repetición':0,'Titulación':0,'Abandono':0,'Sin propuesta':0 };
    alumnos.forEach(a => { const t = getPropObj(a[cfg.campoProp]).tipo; if (propCount[t]!==undefined) propCount[t]++; else propCount['Sin propuesta']++; });

    // Ranking de materias suspendidas en ESTA evaluación, para este grupo
    const matCount = {};
    alumnos.forEach(a => (Array.isArray(a[cfg.campoPend]) ? a[cfg.campoPend] : []).forEach(m => { matCount[m] = (matCount[m]||0)+1; }));
    const matRanking = Object.entries(matCount).map(([materia,susp])=>({materia,susp})).sort((a,b)=>b.susp-a.susp);
    const totalSusp = matRanking.reduce((s,x)=>s+x.susp,0);

    return { nivel, grupo, tutor, total, avgEval, todoAprobado, nese, comp, rep, propCount, matRanking, totalSusp };
  });

  // ── Total de alumnos (para el subtítulo del informe) ──
  const totalAlumnos = statsGrupos.reduce((s,g)=>s+g.total,0);

  // ── Tarjeta HTML de un grupo ──
  const grupoCard = (g) => `
    <div class="card" style="margin-bottom:14px;page-break-inside:avoid;">
      <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
        <div style="font-size:12pt;font-weight:700;color:#1a3a6b">${esc(g.nivel)} ${esc(g.grupo)}</div>
        <div style="font-size:9pt;color:#666">Tutor/a: ${esc(g.tutor)} &nbsp;·&nbsp; ${g.total} alumno${g.total!==1?'s':''}</div>
      </div>
      <div class="kpi-row" style="margin-bottom:10px;">
        <div class="kpi"><div class="kpi-val">${g.avgEval}</div><div class="kpi-lab">Nota media</div></div>
        <div class="kpi"><div class="kpi-val" style="color:#27ae60">${g.todoAprobado}</div><div class="kpi-lab">Todo aprobado</div></div>
        <div class="kpi"><div class="kpi-val" style="color:#e74c3c">${g.totalSusp}</div><div class="kpi-lab">Suspensos (materias)</div></div>
        <div class="kpi"><div class="kpi-val" style="color:#8e44ad">${g.nese}</div><div class="kpi-lab">NESE</div></div>
        <div class="kpi"><div class="kpi-val" style="color:#e67e22">${g.comp}</div><div class="kpi-lab">Compensatoria</div></div>
        <div class="kpi"><div class="kpi-val" style="color:#f39c12">${g.rep}</div><div class="kpi-lab">Repetidores</div></div>
      </div>
      <div class="grid2" style="margin-bottom:0;">
        <div class="card" style="background:#fff;border:1px solid #e3e7f0;">
          <div class="card-title">Propuesta / Decisión — ${esc(cfg.tituloEval)}</div>
          ${bar(g.propCount['Promoción'], g.total, '#27ae60')} Promociona
          ${bar(g.propCount['Repetición'], g.total, '#e74c3c')} Repite
          ${bar(g.propCount['Titulación'], g.total, '#8e44ad')} Titula
          ${g.propCount['Abandono'] > 0 ? bar(g.propCount['Abandono'], g.total, '#8a8fa8') + ' Abandono' : ''}
          ${bar(g.propCount['Sin propuesta'], g.total, '#bbb')} Sin propuesta/decisión
        </div>
        <div class="card" style="background:#fff;border:1px solid #e3e7f0;">
          <div class="card-title">Materias suspendidas (${esc(cfg.tituloEval)})</div>
          ${g.matRanking.length ? g.matRanking.slice(0,8).map(x => `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
              <span style="flex:1;font-size:10pt;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px" title="${esc(x.materia)}">${esc(x.materia)}</span>
              <span style="font-weight:700;font-size:10pt;color:#e74c3c;min-width:22px;text-align:right">${x.susp}</span>
            </div>`).join('') : '<div style="color:#999;font-size:10pt">Sin suspensos registrados.</div>'}
        </div>
      </div>
    </div>`;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Estadísticas ${esc(cfg.tituloEval)}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11pt; color: #1a1a2e; margin: 0; padding: 20px; }
    h1 { font-size: 16pt; color: #1a3a6b; margin-bottom: 4px; }
    .subtitle { color: #666; font-size: 10pt; margin-bottom: 20px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .card { background: #f4f6fb; border-radius: 10px; padding: 14px 18px; }
    .card-title { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #666; margin-bottom: 10px; }
    .kpi-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
    .kpi { background: #fff; border: 1px solid #dde; border-radius: 8px; padding: 9px 13px; text-align: center; flex: 1; min-width: 76px; }
    .kpi-val { font-size: 19pt; font-weight: 700; color: #1a3a6b; }
    .kpi-lab { font-size: 8.5pt; color: #888; }
    .section-title { font-size: 13pt; font-weight: 800; color: #1a3a6b; margin: 22px 0 10px; border-bottom: 2px solid #dde; padding-bottom: 6px; }
    @media print { body { padding: 0; } .card { page-break-inside: avoid; } }
  </style>
  </head><body>
  <h1>📊 Estadísticas de Evaluación — ${esc(cfg.tituloEval)}</h1>
  <div class="subtitle">${esc(iesName)} &nbsp;·&nbsp; ${dateStr} &nbsp;·&nbsp; ${totalAlumnos} alumnos en ${statsGrupos.length} grupo${statsGrupos.length!==1?'s':''}</div>

  ${statsGrupos.map(grupoCard).join('')}

  </body></html>`;

  const win = _ventanaDoc();
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  } else {
    showToast('⚠ Activa las ventanas emergentes para exportar PDF');
  }
}

// ===================== INFORME DE SEGUIMIENTO POR ALUMNO =====================

function printSeguimientoAlumno(nivel, grupo, idx) {
  const alumno = data[nivel]?.[grupo]?.[idx];
  if (!alumno) return;

  const iesName  = document.getElementById('headerIesName')?.value || 'IES —';
  const tutor    = tutores[`${nivel}-${grupo}`] || '—';
  const dateStr  = new Date().toLocaleDateString('es-ES', {year:'numeric', month:'long', day:'numeric'});
  const esc      = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // ── Helpers ──
  const evalBar = (v, max=12) => {
    if (v === null || v === undefined || v === '') return '<span style="color:#bbb">—</span>';
    const n = +v;
    const pct = Math.min(100, Math.round(n / max * 100));
    const col = n === 0 ? '#166534' : n >= 5 ? '#991b1b' : n >= 3 ? '#b45309' : '#1e40af';
    const bg  = n === 0 ? '#dcfce7' : n >= 5 ? '#fee2e2' : n >= 3 ? '#fef9c3' : '#dbeafe';
    return `<div style="display:flex;align-items:center;gap:6px;">
      <div style="flex:1;background:#e5e7eb;border-radius:4px;height:8px;overflow:hidden;min-width:40px">
        <div style="width:${pct}%;height:8px;background:${col};border-radius:4px"></div>
      </div>
      <span style="font-family:monospace;font-size:10pt;font-weight:700;color:${col};min-width:18px">${n}</span>
    </div>`;
  };

  const decBadge = (tipo, destino) => {
    if (!tipo) return '<span style="color:#9ca3af;font-style:italic">Sin registrar</span>';
    const cfg = {
      'Promoción':  { bg:'#dcfce7', col:'#166534', border:'#86efac' },
      'Titulación': { bg:'#ede9fe', col:'#5b21b6', border:'#c4b5fd' },
      'Repetición': { bg:'#fee2e2', col:'#991b1b', border:'#fca5a5' },
      'Abandono':   { bg:'#f3f4f6', col:'#4b5563', border:'#d1d5db' },
    };
    const s = cfg[tipo] || { bg:'#f3f4f6', col:'#4b5563', border:'#d1d5db' };
    const dest = destino ? ` → ${destino}` : '';
    return `<span style="background:${s.bg};color:${s.col};border:1px solid ${s.border};border-radius:5px;padding:2px 10px;font-weight:700;font-size:9.5pt">${esc(tipo)}${esc(dest)}</span>`;
  };

  const propObj = p => (p && typeof p === 'object') ? p : {tipo:'', destino:''};

  // ── Current year section ──
  const p2     = propObj(alumno.propuesta2);
  const p3     = propObj(alumno.propuesta3);
  const pFinal = propObj(alumno.promociona);
  const pendIII  = (alumno.pendientesIII  || []);
  const pendExtr = (alumno.pendientesExtr || []);
  const allPend  = [...pendIII, ...pendExtr];

  const pendHtml = allPend.length
    ? allPend.map(m => `<span style="display:inline-block;background:#fef9c3;border:1px solid #fde68a;border-radius:4px;padding:1px 8px;font-size:9pt;margin:2px">${esc(m)}</span>`).join('')
    : '<span style="color:#166534;font-size:9pt">✓ Ninguna</span>';

  // ── Materias de cursos anteriores: recuperadas / no recuperadas / sin determinar ──
  const pendAntAll    = (alumno.pendientesAnteriores || []);
  const recAntList    = (alumno.recuperadasAnteriores   || []).filter(m => pendAntAll.includes(m));
  const norecAntList  = (alumno.noRecuperadasAnteriores || []).filter(m => pendAntAll.includes(m) && !recAntList.includes(m));
  const sinMarcarList = pendAntAll.filter(m => !recAntList.includes(m) && !norecAntList.includes(m));
  const antTag = (m, bg, bd, col) => `<span style="display:inline-block;background:${bg};border:1px solid ${bd};border-radius:4px;padding:1px 8px;font-size:9pt;margin:2px;color:${col}">${esc(m)}</span>`;
  const cursosAntHtml = pendAntAll.length ? `
  <div class="section">
    <div class="section-title">🔁 Materias pendientes de cursos anteriores</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <div>
        <div style="font-size:8pt;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px">✓ Recuperadas (${recAntList.length})</div>
        <div>${recAntList.length ? recAntList.map(m=>antTag(m,'#f0fdf4','#bbf7d0','#166534')).join('') : '<span style="color:#9ca3af;font-size:9pt">—</span>'}</div>
      </div>
      <div>
        <div style="font-size:8pt;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px">✗ No recuperadas (${norecAntList.length})</div>
        <div>${norecAntList.length ? norecAntList.map(m=>antTag(m,'#fef2f2','#fecaca','#991b1b')).join('') : '<span style="color:#9ca3af;font-size:9pt">—</span>'}</div>
      </div>
      ${sinMarcarList.length ? `<div>
        <div style="font-size:8pt;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px">⋯ Sin determinar (${sinMarcarList.length})</div>
        <div>${sinMarcarList.map(m=>antTag(m,'#fefce8','#fde68a','#92400e')).join('')}</div>
      </div>` : ''}
    </div>
  </div>` : '';

  const neseLine = alumno.nese === 'Sí'
    ? `<span style="background:#ede9fe;color:#5b21b6;border:1px solid #c4b5fd;border-radius:4px;padding:1px 8px;font-size:9pt;font-weight:700">NESE${_getNeseCodes(alumno.recursoNese).length?' — '+_getNeseCodes(alumno.recursoNese).join(' / '):''}</span>`
    : '<span style="color:#6b7280;font-size:9pt">No</span>';

  const codigosComp = Array.isArray(alumno.codComp) ? alumno.codComp : (alumno.codComp ? [alumno.codComp] : []);
  const codHtml = codigosComp.length
    ? codigosComp.map(c=>`<span style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;border-radius:4px;padding:1px 8px;font-size:9pt;font-weight:700">${esc(c)}</span>`).join(' ')
    : '<span style="color:#9ca3af;font-size:9pt">—</span>';

  // ── Historial section ──
  const historial = alumno.historial || [];
  const histRows = historial.length
    ? historial.map(h => {
        const hFinal = propObj({tipo: h.decision, destino: h.destino});
        return `<tr>
          <td style="font-weight:600;white-space:nowrap">${esc(h.curso||'—')}</td>
          <td style="font-weight:600">${esc(h.nivel||'—')}</td>
          <td>${esc(h.centro||'—')}</td>
          <td style="text-align:center">${evalBar(h.eval1)}</td>
          <td style="text-align:center">${evalBar(h.eval2)}</td>
          <td style="text-align:center">${evalBar(h.eval3)}</td>
          <td>${decBadge(h.decision, h.destino)}</td>
          <td style="font-size:8.5pt;color:#555">${esc(h.obs||'')}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="8" style="text-align:center;color:#9ca3af;font-style:italic;padding:14px">Sin historial de cursos anteriores registrado</td></tr>`;

  // ── Notas ──
  const notasHtml = (alumno.notas||'').trim()
    ? `<div style="background:#fafcff;border:1.5px solid #c5d8ef;border-radius:6px;padding:10px 14px;font-size:10pt;line-height:1.7;white-space:pre-wrap">${esc(alumno.notas)}</div>`
    : '<div style="color:#9ca3af;font-style:italic;font-size:9.5pt">Sin observaciones registradas</div>';

  // ── Trend indicator ──
  const trendHtml = (() => {
    const e1 = +alumno.eval1||0, e2 = +alumno.eval2||0, e3 = +alumno.eval3||0;
    const hasData = e1 > 0 || e2 > 0 || e3 > 0;
    if (!hasData) return '';
    const vals = [e1, e2, e3].map((v, i) => {
      const col = v === 0 ? '#166534' : v >= 5 ? '#991b1b' : v >= 3 ? '#b45309' : '#1e40af';
      const labels = ['I Eval.', 'II Eval.', 'III Eval.'];
      return `<div style="text-align:center;flex:1">
        <div style="font-size:7.5pt;color:#6b7280;margin-bottom:4px">${labels[i]}</div>
        <div style="font-size:18pt;font-weight:800;color:${col};font-family:monospace">${v}</div>
        <div style="font-size:7.5pt;color:#9ca3af">mat. no sup.</div>
      </div>`;
    }).join(`<div style="display:flex;align-items:center;color:#d1d5db;font-size:16pt;padding-bottom:12px">→</div>`);
    const trend = e3 < e1 ? '↑ Tendencia mejora' : e3 > e1 ? '↓ Tendencia empeora' : '→ Tendencia estable';
    const tCol  = e3 < e1 ? '#166534' : e3 > e1 ? '#991b1b' : '#6b7280';
    return `<div style="background:#f8faff;border:1px solid #dce8f5;border-radius:8px;padding:14px 18px;margin-bottom:14px">
      <div style="font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#1a3a6b;margin-bottom:12px">Evolución del curso actual</div>
      <div style="display:flex;align-items:flex-end;gap:0">${vals}</div>
      <div style="text-align:center;margin-top:10px;font-size:9pt;font-weight:700;color:${tCol}">${trend}</div>
    </div>`;
  })();

  const edad = calcEdad(alumno.fecha);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Seguimiento — ${esc(alumno.nombre)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; color: #111; background:#fff; }
  .page { padding: 12mm 15mm; max-width: 210mm; margin: 0 auto; }

  .doc-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 3px solid #1a3a6b; padding-bottom: 10px; margin-bottom: 14px;
  }
  .doc-logo {
    width: 44px; height: 44px; border-radius: 10px;
    background: linear-gradient(135deg, #1e40af, #5b21b6);
    display: flex; align-items: center; justify-content: center;
    font-size: 18pt; font-weight: 900; color: white; flex-shrink: 0;
  }
  .doc-title-block { margin-left: 12px; }
  .doc-title { font-size: 14pt; font-weight: bold; color: #1a3a6b; }
  .doc-subtitle { font-size: 9pt; color: #6b7280; margin-top: 2px; }
  .doc-meta { text-align: right; font-size: 8.5pt; color: #6b7280; line-height: 1.6; }

  /* ALUMNO CARD */
  .alumno-card {
    background: linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%);
    border: 1.5px solid #c7d2fe; border-radius: 10px;
    padding: 14px 18px; margin-bottom: 14px;
    display: flex; gap: 20px; align-items: flex-start;
  }
  .alumno-avatar {
    width: 52px; height: 52px; border-radius: 50%;
    background: linear-gradient(135deg, #2563eb, #7c3aed);
    display: flex; align-items: center; justify-content: center;
    font-size: 20pt; font-weight: 800; color: white; flex-shrink: 0;
  }
  .alumno-info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px 16px; flex: 1; }
  .alumno-info-item { }
  .alumno-info-label { font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.4px; color: #6b7280; font-weight: 700; }
  .alumno-info-value { font-size: 10pt; font-weight: 600; color: #1e2040; margin-top: 1px; }
  .alumno-name { font-size: 14pt; font-weight: 800; color: #1a3a6b; margin-bottom: 10px; }

  /* SECTION */
  .section { margin-bottom: 14px; }
  .section-title {
    font-size: 8.5pt; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.6px; color: #1a3a6b; background: #e0e7ff;
    border-left: 4px solid #2563eb; padding: 4px 10px;
    border-radius: 0 4px 4px 0; margin-bottom: 8px;
  }

  /* EVAL GRID current year */
  .eval-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; }
  .eval-cell {
    background: #f8faff; border: 1px solid #dce8f5; border-radius: 7px;
    padding: 8px 10px; text-align: center;
  }
  .eval-cell .ec-label { font-size: 7.5pt; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
  .eval-cell .ec-val { font-size: 17pt; font-weight: 800; font-family: monospace; margin: 4px 0; }
  .eval-cell .ec-sub { font-size: 8pt; color: #9ca3af; }
  .green-cell { border-color: #86efac; background: #f0fdf4; }
  .green-cell .ec-val { color: #166534; }
  .red-cell   { border-color: #fca5a5; background: #fef2f2; }
  .red-cell   .ec-val { color: #991b1b; }
  .yellow-cell{ border-color: #fde68a; background: #fefce8; }
  .yellow-cell .ec-val { color: #92400e; }
  .blue-cell  { border-color: #93c5fd; }
  .blue-cell  .ec-val { color: #1e40af; }

  /* PROPUESTA ROW */
  .prop-row { display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
  .prop-block { background: #f8faff; border: 1px solid #dce8f5; border-radius: 7px; padding: 8px 12px; flex: 1; min-width: 140px; }
  .prop-label { font-size: 7.5pt; color: #6b7280; text-transform: uppercase; letter-spacing: 0.4px; font-weight: 700; margin-bottom: 5px; }

  /* HISTORIAL TABLE */
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  th { background: #dce8f5; padding: 5px 8px; border: 1px solid #9ab5d4; text-align: left; color: #1a3a6b; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.3px; font-weight: 700; }
  td { padding: 5px 8px; border: 1px solid #c0d0e0; vertical-align: middle; }
  tr:nth-child(even) td { background: #f8faff; }

  /* TAGS */
  .tag { display: inline-block; border-radius: 4px; padding: 1px 8px; font-size: 8.5pt; font-weight: 600; margin: 1px; }

  /* PRINT */
  @media print {
    @page { margin: 10mm 12mm; size: A4; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
  .toolbar {
    position: sticky; top: 0; background: #1a1d27; padding: 9px 18px;
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
  }
  .toolbar span { font-size: 13px; font-weight: 600; color: #e8eaf2; }
  .tbtn { padding: 6px 14px; border-radius: 7px; border: none; cursor: pointer; font-family: Arial; font-size: 12px; font-weight: 600; }
  .tbtn-print { background: #2563eb; color: white; }
  .tbtn-close { background: transparent; color: #8891b4; border: 1px solid #2e3350; }
</style>
</head>
<body>

<div class="toolbar no-print">
  <span>📋 Informe de seguimiento — ${esc(alumno.nombre)}</span>
  <div style="display:flex;gap:8px">
    <button class="tbtn tbtn-print" onclick="window.print()">🖨️ Imprimir / PDF</button>
    <button class="tbtn tbtn-close" onclick="window.close()">✕ Cerrar</button>
  </div>
</div>

<div class="page">

  <!-- CABECERA -->
  <div class="doc-header">
    <div style="display:flex;align-items:center;gap:12px">
      <div class="doc-logo">IE</div>
      <div class="doc-title-block">
        <div class="doc-title">Informe de Seguimiento Individual</div>
        <div class="doc-subtitle">Generalitat Valenciana · Conselleria d'Educació · ${esc(iesName)}</div>
      </div>
    </div>
    <div class="doc-meta">
      Generado el ${dateStr}<br>
      Tutor/a: ${esc(tutor)}<br>
      ${esc(nivel)} — Grupo ${esc(grupo)}
    </div>
  </div>

  <!-- FICHA DEL ALUMNO -->
  <div class="alumno-card">
    <div class="alumno-avatar">${(alumno.nombre||'?').charAt(0).toUpperCase()}</div>
    <div style="flex:1">
      <div class="alumno-name">${esc(alumno.nombre||'Sin nombre')}</div>
      <div class="alumno-info-grid">
        <div class="alumno-info-item">
          <div class="alumno-info-label">Nivel y Grupo</div>
          <div class="alumno-info-value">${esc(nivel)} — ${esc(grupo)}</div>
        </div>
        <div class="alumno-info-item">
          <div class="alumno-info-label">F. Nacimiento</div>
          <div class="alumno-info-value">${alumno.fecha ? new Date(alumno.fecha).toLocaleDateString('es-ES') : '—'}${edad!==''?` (${edad} años)`:''}</div>
        </div>
        <div class="alumno-info-item">
          <div class="alumno-info-label">Repetidor</div>
          <div class="alumno-info-value">${alumno.repetidor==='Sí'?'<span style="color:#991b1b;font-weight:700">Sí</span>':'No'}</div>
        </div>
        <div class="alumno-info-item">
          <div class="alumno-info-label">NESE</div>
          <div class="alumno-info-value">${neseLine}</div>
        </div>
        <div class="alumno-info-item">
          <div class="alumno-info-label">Compensatoria</div>
          <div class="alumno-info-value">${alumno.compensatoria==='Sí'?'<span style="color:#c2410c;font-weight:700">Sí</span>':'No'}</div>
        </div>
        <div class="alumno-info-item">
          <div class="alumno-info-label">Cód. Comp.</div>
          <div class="alumno-info-value">${codHtml}</div>
        </div>
        ${alumno.colegioProcedencia ? `
        <div class="alumno-info-item" style="grid-column:1/-1">
          <div class="alumno-info-label">Centro de procedencia</div>
          <div class="alumno-info-value">${esc(alumno.colegioProcedencia)}</div>
        </div>` : ''}
        ${alumno.lenguaBase ? `
        <div class="alumno-info-item">
          <div class="alumno-info-label">Lengua base</div>
          <div class="alumno-info-value">${esc(alumno.lenguaBase)}</div>
        </div>` : ''}
      </div>
    </div>
  </div>

  <!-- EVOLUCIÓN GRÁFICA -->
  ${trendHtml}

  <!-- RESULTADOS CURSO ACTUAL -->
  <div class="section">
    <div class="section-title">📊 Resultados curso actual (${_tCursoActual("-",true)})</div>
    <div class="eval-grid">
      ${[['I Evaluación','eval1'],['II Evaluación','eval2'],['III Evaluación','eval3']].map(([lbl, fld]) => {
        const v = +alumno[fld] || 0;
        const cls = v===0?'green-cell':v>=5?'red-cell':v>=3?'yellow-cell':'blue-cell';
        return `<div class="eval-cell ${cls}">
          <div class="ec-label">${lbl}</div>
          <div class="ec-val">${v}</div>
          <div class="ec-sub">mat. no superadas</div>
        </div>`;
      }).join('')}
    </div>
    <div class="prop-row">
      <div class="prop-block">
        <div class="prop-label">II Propuesta</div>
        ${decBadge(p2.tipo, p2.destino)}
      </div>
      <div class="prop-block">
        <div class="prop-label">III Propuesta</div>
        ${decBadge(p3.tipo, p3.destino)}
      </div>
      <div class="prop-block" style="border-color:#a5b4fc;background:#eff6ff">
        <div class="prop-label" style="color:#1e40af">✅ Decisión final</div>
        ${decBadge(pFinal.tipo, pFinal.destino)}
      </div>
    </div>
    ${allPend.length ? `
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:7px;padding:8px 12px;margin-top:4px">
      <div style="font-size:8pt;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:6px">📚 Materias pendientes</div>
      <div>${pendHtml}</div>
    </div>` : `
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:7px;padding:8px 12px;margin-top:4px;font-size:9pt;color:#166534;font-weight:600">
      ✓ Sin materias pendientes registradas
    </div>`}
  </div>

  <!-- MATERIAS DE CURSOS ANTERIORES (recuperadas / no recuperadas) -->
  ${cursosAntHtml}

  <!-- HISTORIAL CURSOS ANTERIORES -->
  <div class="section">
    <div class="section-title">🗂 Historial de cursos anteriores</div>
    <table>
      <thead>
        <tr>
          <th>Curso</th><th>Nivel</th><th>Centro</th>
          <th style="text-align:center">I Ev.</th>
          <th style="text-align:center">II Ev.</th>
          <th style="text-align:center">III Ev.</th>
          <th>Decisión</th>
          <th>Observaciones</th>
        </tr>
      </thead>
      <tbody>${histRows}</tbody>
    </table>
  </div>

  <!-- OBSERVACIONES DEL TUTOR -->
  <div class="section">
    <div class="section-title">📝 Observaciones del tutor/a</div>
    ${notasHtml}
  </div>

  <!-- OBSERVACIONES DEL GRUPO -->
  ${(window._obsGrupoData||{})[`${nivel}-${grupo}`] ? `
  <div class="section">
    <div class="section-title">🏫 Observaciones del grupo (${esc(nivel)} ${esc(grupo)})</div>
    <div style="background:#fafcff;border:1.5px solid #c5d8ef;border-radius:6px;padding:10px 14px;font-size:10pt;line-height:1.7;white-space:pre-wrap">${esc((window._obsGrupoData||{})[nivel+'-'+grupo]||'')}</div>
  </div>` : ''}

  <!-- PIE -->
  <div style="margin-top:20px;padding-top:10px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;font-size:8.5pt;color:#9ca3af">
    <span>Gestor de Tutoría · ${esc(iesName)}</span>
    <span>Generado el ${dateStr}</span>
    <div style="text-align:right">
      <div style="border-bottom:1px solid #555;height:24px;width:140px;margin-bottom:3px"></div>
      <div>Tutor/a del grupo</div>
    </div>
  </div>

</div>
<script>window.onload=function(){}<\/script>
</body>
</html>`;

  const win = _ventanaDoc();
  if (win) { win.document.write(html); win.document.close(); }
  else showToast('⚠ Permite las ventanas emergentes para generar el informe');
}
