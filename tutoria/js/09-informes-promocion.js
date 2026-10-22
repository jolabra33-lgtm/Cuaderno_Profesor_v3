/* ============================================================================
   Gestor de Tutoría · Informes de propuestas, promoción, destino y pendientes
   tutoria/js/09-informes-promocion.js
   ============================================================================ */

// ============ INFORME PROPUESTAS FINALES (ORIENTACIÓN) ============

function printPropuestasFinales() {
  const iesName = document.getElementById('headerIesName')?.value || 'Centro Educativo';
  const dateStr = new Date().toLocaleDateString('es-ES',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const esc = s => String(s==null?'':s).replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Decision style mapping (tipo -> {label,color})
  const tipoMeta = {
    'Promoción':    { label:'Promociona',    color:'#1a9d6b' },
    'Titulación':   { label:'Titula',        color:'#7c3aed' },
    'Repetición':   { label:'Repite',        color:'#c0392b' },
    'No Promociona':{ label:'No promociona', color:'#c0392b' },
    'No Titula':    { label:'No titula',     color:'#c0392b' },
    'Abandono':     { label:'Abandono',      color:'#6b7280' },
  };

  // Global tallies
  let gTotal = 0, gPromo = 0, gTitula = 0, gRepite = 0, gAband = 0, gSin = 0;

  // Build one section per nivel
  const sections = NIVELES.map(nivel => {
    const grupos = GRUPOS_POR_NIVEL[nivel] || [];
    // All students with a name across the grupos of this nivel
    const alumnos = grupos.flatMap(g => (data[nivel]?.[g]||[])
      .filter(a => a.nombre && a.nombre.trim())
      .map(a => ({...a, _grupo:g})));
    if (!alumnos.length) return '';

    // Sort by grupo then name
    alumnos.sort((a,b)=> (a._grupo||'').localeCompare(b._grupo||'','es') || (a.nombre||'').localeCompare(b.nombre||'','es'));

    // Per-nivel counts
    let nTot=0,nPromo=0,nTitula=0,nRepite=0,nAband=0,nSin=0;

    const rows = alumnos.map((a,i)=>{
      const o = getPropObj(a.promociona);
      const meta = tipoMeta[o.tipo];
      nTot++; gTotal++;
      if (o.tipo==='Promoción') { nPromo++; gPromo++; }
      else if (o.tipo==='Titulación') { nTitula++; gTitula++; }
      else if (o.tipo==='Repetición'||o.tipo==='No Promociona'||o.tipo==='No Titula') { nRepite++; gRepite++; }
      else if (o.tipo==='Abandono') { nAband++; gAband++; }
      else { nSin++; gSin++; }

      const decisionCell = meta
        ? `<span style="color:${meta.color};font-weight:700">${meta.label}</span>`
        : `<span style="color:#d98c00;font-weight:700">⏳ Sin decidir</span>`;
      const destino = o.destino ? esc(o.destino) : '—';
      const nese = a.nese==='Sí' ? '<span style="color:#7c3aed;font-weight:700">Sí</span>' : '—';
      const rep  = a.repetidor==='Sí' ? '<span style="color:#c0392b;font-weight:700">Sí</span>' : '—';
      const obs  = (a.notas||'').trim() ? esc(a.notas) : '';
      return `<tr>
        <td class="num">${i+1}</td>
        <td class="nom">${esc(a.nombre)}</td>
        <td class="ctr">${esc(a._grupo)}</td>
        <td>${decisionCell}</td>
        <td>${destino}</td>
        <td class="ctr">${nese}</td>
        <td class="ctr">${rep}</td>
        <td class="obs">${obs}</td>
      </tr>`;
    }).join('');

    const chip = (label,val,color)=> val>0
      ? `<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:9.5pt;font-weight:700;color:${color};background:${color}1a;border:1px solid ${color}55;margin:0 4px 4px 0;">${label}: ${val}</span>`
      : '';

    return `<section class="nivel-block">
      <div class="nivel-head">
        <h2>${esc(nivel)}</h2>
        <span class="nivel-meta">${nTot} alumno${nTot!==1?'s':''}</span>
      </div>
      <div class="chips">
        ${chip('Promocionan',nPromo,'#1a9d6b')}
        ${chip('Titulan',nTitula,'#7c3aed')}
        ${chip('Repiten / No promocionan',nRepite,'#c0392b')}
        ${chip('Abandono',nAband,'#6b7280')}
        ${nSin>0 ? `<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:9.5pt;font-weight:700;color:#d98c00;background:#d98c001a;border:1px solid #d98c0055;margin:0 4px 4px 0;">Sin decidir: ${nSin}</span>` : ''}
      </div>
      <table>
        <thead><tr>
          <th style="width:4%">#</th>
          <th style="width:26%">Alumno/a</th>
          <th style="width:7%">Grupo</th>
          <th style="width:14%">Decisión final</th>
          <th style="width:15%">Destino</th>
          <th style="width:6%">NESE</th>
          <th style="width:6%">Rep.</th>
          <th>Observaciones</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
  }).filter(Boolean).join('');

  const gChip = (label,val,color)=>
    `<div class="gstat" style="border-top:3px solid ${color}"><div class="gnum" style="color:${color}">${val}</div><div class="glbl">${label}</div></div>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Propuestas Finales — Orientación</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; color: #1a1a1a; margin: 16mm 14mm; }
  h1 { font-size: 16pt; color: #14532d; margin: 0 0 2px; }
  .subtitle { font-size: 10pt; color: #555; margin-bottom: 14px; }
  .gstats { display: flex; gap: 10px; flex-wrap: wrap; margin: 0 0 22px; }
  .gstat { flex: 1; min-width: 90px; background: #f7faf9; border: 1px solid #dde6e2; border-radius: 8px; padding: 10px 8px; text-align: center; }
  .gnum { font-size: 20pt; font-weight: 800; line-height: 1; }
  .glbl { font-size: 8.5pt; color: #555; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.4px; }
  .nivel-block { margin-bottom: 22px; page-break-inside: avoid; }
  .nivel-head { display: flex; align-items: baseline; gap: 10px; border-bottom: 2px solid #14532d; padding-bottom: 4px; margin-bottom: 6px; }
  .nivel-head h2 { font-size: 13pt; color: #14532d; margin: 0; }
  .nivel-meta { font-size: 9.5pt; color: #777; }
  .chips { margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th { background: #14532d; color: #fff; padding: 6px 8px; text-align: left; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.3px; }
  td { padding: 5px 8px; border-bottom: 1px solid #d6e0db; vertical-align: top; }
  tr:nth-child(even) td { background: #f5f9f7; }
  td.num { text-align: center; color: #999; font-size: 9pt; }
  td.ctr { text-align: center; }
  td.nom { font-weight: 600; }
  td.obs { font-size: 9pt; color: #444; }
  .footer { margin-top: 26px; font-size: 9pt; color: #888; border-top: 1px solid #ccc; padding-top: 8px; display: flex; justify-content: space-between; }
  .empty { padding: 30px; text-align: center; color: #888; }
  @media print {
    body { margin: 12mm 12mm; }
    @page { margin: 12mm; }
    .nivel-block { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <h1>✅ Propuestas Finales de Evaluación</h1>
  <div class="subtitle">
    ${esc(iesName)} &nbsp;·&nbsp; ${dateStr.charAt(0).toUpperCase()+dateStr.slice(1)} &nbsp;·&nbsp; Informe para el Departamento de Orientación
  </div>
  <div class="gstats">
    ${gChip('Total alumnado', gTotal, '#1a3a6b')}
    ${gChip('Promocionan', gPromo, '#1a9d6b')}
    ${gChip('Titulan', gTitula, '#7c3aed')}
    ${gChip('Repiten / No prom.', gRepite, '#c0392b')}
    ${gAband>0 ? gChip('Abandono', gAband, '#6b7280') : ''}
    ${gSin>0 ? gChip('Sin decidir', gSin, '#d98c00') : ''}
  </div>
  ${sections || '<div class="empty">No hay alumnado registrado todavía.</div>'}
  <div class="footer">
    <span>Gestor de Tutoría — ${esc(iesName)}</span>
    <span>Generado el ${new Date().toLocaleDateString('es-ES')}</span>
  </div>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`;

  const win = _ventanaDoc();
  if (win) { win.document.write(html); win.document.close(); }
  else showToast('⚠ Permite las ventanas emergentes para imprimir');
}

// ===================== IMPRIMIR INFORME DE PROMOCIÓN POR GRUPO =====================

// CSS compartido por los informes de promoción (A4 apaisado, válido para 1 grupo o etapa completa)
function _promocionaReportStyles() {
  return `
  * { box-sizing: border-box; }
  html, body { background: #fff; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #1a1a1a; margin: 10mm 12mm; }
  /* Cada grupo es una "página" del informe; en modo etapa cada uno empieza en hoja nueva */
  .report-page + .report-page { page-break-before: always; }
  .report-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; border-bottom: 2.5px solid #14532d; padding-bottom: 8px; margin-bottom: 14px; }
  h1 { font-size: 17pt; color: #14532d; margin: 0 0 2px; letter-spacing: -0.2px; }
  .subtitle { font-size: 9.5pt; color: #555; }
  .head-meta { text-align: right; font-size: 9pt; color: #777; white-space: nowrap; }
  .head-meta strong { color: #14532d; font-size: 11pt; display: block; }

  /* Panel superior a dos columnas para aprovechar el apaisado (float = compatible con todo) */
  .dashboard { margin-bottom: 14px; }
  .dashboard::after { content: ""; display: block; clear: both; }
  .panel-wide { float: left; width: 58%; }
  .panel-narrow { float: right; width: 39.5%; }
  .section-label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.7px; color: #888; font-weight: 700; margin: 0 0 7px; }

  .gstats { font-size: 0; margin: 0 0 10px; }
  .gstat { display: inline-block; vertical-align: top; width: 30.6%; margin: 0 1.5% 9px 0; background: #f7faf9; border: 1px solid #dde6e2; border-radius: 8px; padding: 9px 6px; text-align: center; }
  .gnum { font-size: 19pt; font-weight: 800; line-height: 1; }
  .glbl { font-size: 7.8pt; color: #555; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.15; }
  .gsub { font-size: 7.8pt; color: #888; margin-top: 2px; }

  .propbar { display: flex; width: 100%; height: 20px; border-radius: 5px; overflow: hidden; border: 1px solid #d6e0db; margin-bottom: 7px; }
  .propbar div { height: 100%; }
  .propbar-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 8.8pt; color: #444; margin-top: auto; }
  .propbar-legend span { display: inline-flex; align-items: center; gap: 5px; }
  .propbar-legend i { width: 11px; height: 11px; border-radius: 3px; display: inline-block; }

  /* Tabla apaisada, ancho completo */
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; table-layout: fixed; }
  thead { display: table-header-group; }
  th { background: #14532d; color: #fff; padding: 6px 9px; text-align: left; font-size: 8.3pt; text-transform: uppercase; letter-spacing: 0.3px; }
  td { padding: 5px 9px; border-bottom: 1px solid #d9e3de; vertical-align: top; word-wrap: break-word; }
  tr:nth-child(even) td { background: #f5f9f7; }
  td.num { text-align: center; color: #999; font-size: 9pt; }
  td.ctr { text-align: center; }
  td.nom { font-weight: 600; }
  td.obs { font-size: 9pt; color: #444; }

  .footer { margin-top: 18px; font-size: 8.8pt; color: #888; border-top: 1px solid #ccc; padding-top: 7px; display: flex; justify-content: space-between; }
  #print-bar { position: fixed; top: 0; left: 0; right: 0; background: #14532d; color: #fff; padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; font-size: 10pt; z-index: 999; }
  #print-bar button { background: #fff; color: #14532d; border: none; border-radius: 6px; padding: 6px 14px; font-weight: 700; font-size: 10pt; cursor: pointer; }
  body { padding-top: 0; }
  @media screen { body { margin-top: 52px; } }
  @media print {
    @page { size: A4 landscape; margin: 10mm 12mm; }
    body { margin: 0; }
    #print-bar { display: none; }
    .dashboard { page-break-inside: avoid; }
    tr { page-break-inside: avoid; }
    thead { display: table-header-group; }
    .report-page + .report-page { page-break-before: always; }
  }
`;
}

// Construye el bloque .report-page de un grupo (cabecera + estadísticas + tabla). '' si no hay alumnado.
function _buildPromocionaGroupSection(nivel, grupo) {
  const iesName = document.getElementById('headerIesName')?.value || 'Centro Educativo';
  const dateStr = new Date().toLocaleDateString('es-ES',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const esc = s => String(s==null?'':s).replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const bach = isBach(nivel);

  const alumnos = (data[nivel]?.[grupo] || [])
    .filter(a => a.nombre && a.nombre.trim())
    .slice()
    .sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'','es'));

  if (!alumnos.length) return '';

  const tipoMeta = {
    'Promoción':    { label:'Promociona',    color:'#1a9d6b' },
    'Titulación':   { label:'Titula',        color:'#7c3aed' },
    'Repetición':   { label:'Repite',        color:'#c0392b' },
    'No Promociona':{ label:'No promociona', color:'#c0392b' },
    'No Titula':    { label:'No titula',     color:'#c0392b' },
    'Abandono':     { label:'Abandono',      color:'#6b7280' },
  };

  const total = alumnos.length;
  let nPromo=0,nTitula=0,nRepite=0,nAband=0,nSin=0,nPromoFPB=0;
  alumnos.forEach(a=>{
    const o = getPropObj(a.promociona);
    if (o.tipo==='Promoción'){ nPromo++; if(o.destino==='FPB') nPromoFPB++; }
    else if (o.tipo==='Titulación') nTitula++;
    else if (o.tipo==='Repetición'||o.tipo==='No Promociona'||o.tipo==='No Titula') nRepite++;
    else if (o.tipo==='Abandono') nAband++;
    else nSin++;
  });
  const nPromoNormal = nPromo - nPromoFPB;
  const nese = alumnos.filter(a=>a.nese==='Sí').length;
  const comp = alumnos.filter(a=>a.compensatoria==='Sí').length;
  const rep  = alumnos.filter(a=>a.repetidor==='Sí').length;
  const avgE1 = total ? (alumnos.reduce((s,a)=>s+(+a.eval1||0),0)/total).toFixed(1) : '—';
  const avgE3 = total ? (alumnos.reduce((s,a)=>s+(+a.eval3||0),0)/total).toFixed(1) : '—';
  const decididas = total - nSin;
  const pctDecidido = total ? Math.round(decididas/total*100) : 0;

  const gChip = (label,val,color,sub='') =>
    `<div class="gstat" style="border-top:3px solid ${color}"><div class="gnum" style="color:${color}">${val}</div><div class="glbl">${label}</div>${sub?`<div class="gsub">${sub}</div>`:''}</div>`;

  let statCards = '';
  statCards += gChip('Total alumnado', total, '#1a3a6b');
  statCards += gChip('Promocionan', (bach||nivel==='4º ESO') ? nPromoNormal : nPromo, '#1a9d6b', nPromoFPB>0?`+${nPromoFPB} a FPB`:'');
  if (nTitula>0) statCards += gChip('Titulan', nTitula, '#7c3aed');
  statCards += gChip('Repiten / No prom.', nRepite, '#c0392b');
  if (nAband>0) statCards += gChip('Abandono', nAband, '#6b7280');
  if (nSin>0) statCards += gChip('Sin decidir', nSin, '#d98c00');

  let ctxCards = '';
  ctxCards += gChip('Con NESE', nese, '#7c3aed', total?`${Math.round(nese/total*100)}%`:'');
  if (comp>0) ctxCards += gChip('Compensatoria', comp, '#d98c00', total?`${Math.round(comp/total*100)}%`:'');
  ctxCards += gChip('Repetidores', rep, '#c0392b', total?`${Math.round(rep/total*100)}%`:'');
  ctxCards += gChip('Ø Susp. I Ev.', avgE1, '#1a3a6b');
  ctxCards += gChip('Ø Susp. III Ev.', avgE3, '#1a9d6b');
  ctxCards += gChip('Decididas', `${pctDecidido}%`, pctDecidido===100?'#1a9d6b':'#d98c00', `${decididas}/${total}`);

  const seg = (val,color,name)=> val>0 ? `<div title="${name}: ${val}" style="width:${(val/total*100).toFixed(2)}%;background:${color}"></div>` : '';
  const bar = total ? `<div class="propbar">
      ${seg(nPromo,'#1a9d6b','Promocionan')}${seg(nTitula,'#7c3aed','Titulan')}${seg(nRepite,'#c0392b','Repiten / No promocionan')}${seg(nAband,'#6b7280','Abandono')}${seg(nSin,'#d98c00','Sin decidir')}
    </div>
    <div class="propbar-legend">
      ${nPromo?`<span><i style="background:#1a9d6b"></i>Promocionan ${nPromo}</span>`:''}
      ${nTitula?`<span><i style="background:#7c3aed"></i>Titulan ${nTitula}</span>`:''}
      ${nRepite?`<span><i style="background:#c0392b"></i>Repiten / No prom. ${nRepite}</span>`:''}
      ${nAband?`<span><i style="background:#6b7280"></i>Abandono ${nAband}</span>`:''}
      ${nSin?`<span><i style="background:#d98c00"></i>Sin decidir ${nSin}</span>`:''}
    </div>` : '';

  const rows = alumnos.map((a,i)=>{
    const o = getPropObj(a.promociona);
    const meta = tipoMeta[o.tipo];
    const decisionCell = meta
      ? `<span style="color:${meta.color};font-weight:700">${meta.label}</span>`
      : `<span style="color:#d98c00;font-weight:700">⏳ Sin decidir</span>`;
    const destino = o.destino ? esc(o.destino) : '—';
    const neseC = a.nese==='Sí' ? '<span style="color:#7c3aed;font-weight:700">Sí</span>' : '—';
    const repC  = a.repetidor==='Sí' ? '<span style="color:#c0392b;font-weight:700">Sí</span>' : '—';
    const susp = bach ? ((+a.evalExtr>0) ? +a.evalExtr : (+a.eval3||0)) : (+a.eval3||0);
    const suspC = susp>0 ? `<span style="color:#c0392b;font-weight:700">${susp}</span>` : '<span style="color:#1a9d6b;font-weight:700">0</span>';
    const obs  = (a.notas||'').trim() ? esc(a.notas) : '';
    return `<tr>
      <td class="num">${i+1}</td>
      <td class="nom">${esc(a.nombre)}</td>
      <td class="ctr">${repC}</td>
      <td class="ctr">${neseC}</td>
      <td class="ctr">${suspC}</td>
      <td>${decisionCell}</td>
      <td>${destino}</td>
      <td class="obs">${obs}</td>
    </tr>`;
  }).join('');

  const suspHeader = bach ? 'Susp. III/Extr.' : 'Susp. III Ev.';

  return `<section class="report-page">
  <div class="report-head">
    <div>
      <h1>📋 Informe de Promoción — ${esc(nivel)} ${esc(grupo)}</h1>
      <div class="subtitle">Decisiones de promoción del grupo</div>
    </div>
    <div class="head-meta">
      <strong>${esc(iesName)}</strong>
      ${dateStr.charAt(0).toUpperCase()+dateStr.slice(1)}
    </div>
  </div>

  <div class="dashboard">
    <div class="panel-wide">
      <div class="section-label">Resumen de decisiones</div>
      <div class="gstats">${statCards}</div>
      ${bar}
    </div>
    <div class="panel-narrow">
      <div class="section-label">Datos del grupo</div>
      <div class="gstats">${ctxCards}</div>
    </div>
  </div>

  <div class="section-label">Listado de alumnado y decisión</div>
  <table>
    <thead><tr>
      <th style="width:34px">#</th>
      <th style="width:24%">Alumno/a</th>
      <th style="width:48px">Rep.</th>
      <th style="width:52px">NESE</th>
      <th style="width:10%">${suspHeader}</th>
      <th style="width:13%">Decisión</th>
      <th style="width:17%">Destino</th>
      <th>Observaciones</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    <span>Gestor de Tutoría — ${esc(iesName)}</span>
    <span>Generado el ${new Date().toLocaleDateString('es-ES')} · ${total} alumno${total!==1?'s':''}</span>
  </div>
  </section>`;
}

// Envuelve uno o varios .report-page en un documento imprimible y lo abre con auto-impresión.
function _openPromocionaReport(title, barLabel, innerHTML) {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>${_promocionaReportStyles()}</style>
</head>
<body>
  <div id="print-bar">
    <span>${barLabel}</span>
    <button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
  </div>
  ${innerHTML}
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 300); }<\/script>
</body>
</html>`;
  const win = _ventanaDoc();
  if (win) { win.document.write(html); win.document.close(); }
  else showToast('⚠ Permite las ventanas emergentes para imprimir');
}

// Informe de un solo grupo
function printPromocionaGrupo(nivel, grupo) {
  const section = _buildPromocionaGroupSection(nivel, grupo);
  if (!section) { showToast('⚠ No hay alumnado en este grupo'); return; }
  _openPromocionaReport(
    `Informe de Promoción — ${nivel} ${grupo}`,
    `Informe de promoción · ${nivel} ${grupo} (A4 apaisado)`,
    section
  );
}

// Informe combinado de TODOS los grupos de una etapa: etapa = 'ESO' | 'BACH'
function printPromocionaEtapa(etapa) {
  const esBach = etapa === 'BACH';
  const niveles = NIVELES.filter(n => esBach ? isBach(n) : !isBach(n));
  const sections = [];
  let grupos = 0;
  niveles.forEach(n => (GRUPOS_POR_NIVEL[n] || []).forEach(g => {
    const sec = _buildPromocionaGroupSection(n, g);
    if (sec) { sections.push(sec); grupos++; }
  }));

  if (!sections.length) {
    showToast(`⚠ No hay alumnado en ${esBach ? 'Bachillerato' : 'la ESO'}`);
    return;
  }

  const etapaLabel = esBach ? 'Bachillerato' : 'ESO';
  _openPromocionaReport(
    `Informes de Promoción — ${etapaLabel}`,
    `Informes de promoción · ${etapaLabel} · ${grupos} grupo${grupos!==1?'s':''} (A4 apaisado, uno por hoja)`,
    sections.join('\n')
  );
}

// ===================== IMPRIMIR LISTA DESTINO =====================

function printDestinoList(propField, destino, icon, label, color) {
  const list = [];
  NIVELES.forEach(n=>(GRUPOS_POR_NIVEL[n]||[]).forEach(g=>
    (data[n]?.[g]||[]).forEach(a=>{
      if (getPropObj(a[propField]).destino===destino) list.push({...a,_nivel:n,_grupo:g});
    })
  ));

  const iesName = document.getElementById('headerIesName')?.value || 'Centro Educativo';
  const dateStr = new Date().toLocaleDateString('es-ES',{year:'numeric',month:'long',day:'numeric'});

  const rows = list.map((a,i)=>`
    <tr>
      <td style="text-align:center">${i+1}</td>
      <td>${(a.nombre||'—').replace(/</g,'&lt;')}</td>
      <td style="text-align:center">${a._nivel}</td>
      <td style="text-align:center">${a._grupo}</td>
      <td>${(a.colegioProcedencia||'—').replace(/</g,'&lt;')}</td>
      <td>${(a.notas||'').replace(/</g,'&lt;')}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${label} — ${destino}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #111; margin: 20mm 18mm; }
  h1 { font-size: 14pt; color: #1a3a6b; margin-bottom: 4px; }
  .meta { font-size: 10pt; color: #555; margin-bottom: 18px; }
  table { width:100%; border-collapse: collapse; font-size: 10.5pt; }
  th { background: #1a3a6b; color: #fff; padding: 7px 10px; text-align: left; font-size: 10pt; }
  td { padding: 6px 10px; border-bottom: 1px solid #c0d0e0; vertical-align: top; }
  tr:nth-child(even) td { background: #f5f9ff; }
  td:first-child { text-align: center; color: #888; font-size: 9.5pt; }
  .footer { margin-top: 28px; font-size: 9.5pt; color: #888; border-top: 1px solid #ccc; padding-top: 8px; display:flex; justify-content:space-between; }
  @media print {
    body { margin: 12mm 14mm; }
    @page { margin: 14mm; }
  }
</style>
</head>
<body>
  <h1>${icon} ${label} → ${destino}</h1>
  <div class="meta">
    ${iesName} &nbsp;·&nbsp; ${dateStr} &nbsp;·&nbsp; <strong>${list.length} alumno${list.length!==1?'s':''}</strong>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:4%">#</th>
        <th style="width:28%">Alumno/a</th>
        <th style="width:10%">Nivel</th>
        <th style="width:8%">Grupo</th>
        <th style="width:28%">CEIP de procedencia</th>
        <th>Observaciones</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#888;padding:20px">Sin alumnos propuestos</td></tr>'}</tbody>
  </table>
  <div class="footer">
    <span>Gestor de Tutoría — ${iesName}</span>
    <span>${dateStr}</span>
  </div>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`;

  const win = _ventanaDoc();
  if (win) { win.document.write(html); win.document.close(); }
  else showToast('⚠ Permite las ventanas emergentes para imprimir');
}

// ===================== INFORME PENDIENTES POR NIVEL =====================

function printPendientesNivel(nivel) {
  const grupos  = GRUPOS_POR_NIVEL[nivel] || [];
  const bach    = isBach(nivel);
  const iesName = document.getElementById('headerIesName')?.value || 'Centro Educativo';
  const dateStr = new Date().toLocaleDateString('es-ES', {year:'numeric', month:'long', day:'numeric'});

  // Gather students with pendientes for this nivel
  const alumnos = grupos.flatMap(g =>
    (data[nivel]?.[g] || [])
      .map(a => ({...a, _grupo: g}))
      .filter(a => (a.pendientesIII||[]).length > 0 || (a.pendientesExtr||[]).length > 0)
  ).sort((a,b) => (a.nombre||'').localeCompare(b.nombre||'', 'es'));

  if (!alumnos.length) {
    showToast(`ℹ ${nivel}: sin alumnos con materias pendientes`);
    return;
  }

  // Materia ranking for this nivel
  const rankMap = {};
  alumnos.forEach(a => {
    [...(a.pendientesIII||[]), ...(a.pendientesExtr||[])].forEach(m => {
      rankMap[m] = (rankMap[m]||0) + 1;
    });
  });
  const rankSorted = Object.entries(rankMap).sort((a,b) => b[1]-a[1]);

  // Build rows
  const rows = alumnos.map((a, idx) => {
    const pIII  = a.pendientesIII  || [];
    const pExtr = a.pendientesExtr || [];
    const total = pIII.length + pExtr.length;
    const color = total >= 4 ? '#dc2626' : total >= 2 ? '#b45309' : '#166534';

    const pendCell = bach
      ? `<td>${pIII.length  ? pIII.join('<br>')  : '<span style="color:#aaa">—</span>'}</td>
         <td>${pExtr.length ? pExtr.join('<br>') : '<span style="color:#aaa">—</span>'}</td>`
      : `<td>${pIII.length  ? pIII.join('<br>')  : '<span style="color:#aaa">—</span>'}</td>`;

    return `<tr>
      <td style="text-align:center;color:#888;font-size:9pt">${idx+1}</td>
      <td style="font-weight:600">${(a.nombre||'—').replace(/</g,'&lt;')}</td>
      <td style="text-align:center"><span style="background:#e8ecf5;border-radius:4px;padding:1px 7px;font-weight:600">${a._grupo}</span></td>
      ${pendCell}
      <td style="text-align:center;font-weight:800;color:${color};font-size:11pt">${total}</td>
    </tr>`;
  }).join('');

  const bachThs = bach
    ? `<th style="width:28%">Pend. III Evaluación</th><th style="width:22%">Pend. Eval. Extraordinaria</th>`
    : `<th style="width:42%">Materias pendientes próximo curso</th>`;

  // Ranking mini-table
  const rankRows = rankSorted.map(([m,c],i) =>
    `<tr><td style="text-align:center;color:#888;font-size:9pt">${i+1}</td>
     <td>${m}</td>
     <td style="text-align:center;font-weight:700;color:#b45309">${c} alumno${c!==1?'s':''}</td></tr>`
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Pendientes ${nivel} — ${iesName}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 10.5pt; color: #111; }
  .page { padding: 12mm 14mm; }

  .doc-title { font-size: 14pt; font-weight: bold; color: #1a3a6b; margin-bottom: 2px; }
  .doc-sub   { font-size: 11.5pt; font-weight: bold; color: #1a6b3a; margin-bottom: 14px; }

  table { width:100%; border-collapse:collapse; font-size:9.5pt; margin-bottom:20px; }
  th { background:#1a3a6b; color:#fff; padding:6px 9px; text-align:left; font-size:9pt; border:1px solid #9ab5d4; }
  td { padding:5px 9px; border:1px solid #c0d0e0; vertical-align:top; }
  tr:nth-child(even) td { background:#f8faff; }

  .ranking-title { background:#854d0e; color:#fff; font-weight:bold;
    padding:6px 12px; border-radius:4px 4px 0 0; font-size:10.5pt; margin-top:18px; }

  @media print {
    @page { margin:10mm; size:A4; }
    tr { page-break-inside:avoid; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="doc-title">📚 Materias Pendientes</div>
  <div class="doc-sub">${nivel} — ${iesName.replace(/</g,'&lt;')}</div>

  <table>
    <thead>
      <tr>
        <th style="width:3%">#</th>
        <th style="width:26%">Alumno/a</th>
        <th style="width:7%">Grupo</th>
        ${bachThs}
        <th style="width:5%">Nº</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="ranking-title">🏆 Ranking de materias con más alumnos pendientes — ${nivel}</div>
  <table style="margin-top:0;border-top:none;">
    <thead>
      <tr style="background:#854d0e;">
        <th style="width:4%">#</th>
        <th>Materia</th>
        <th style="width:18%;text-align:center">Alumnos</th>
      </tr>
    </thead>
    <tbody>${rankRows}</tbody>
  </table>
</div>
<script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`;

  const win = _ventanaDoc();
  if (win) { win.document.write(html); win.document.close(); }
  else showToast('⚠ Permite las ventanas emergentes para imprimir');
}

function printPendientesReport() {
  const iesName = document.getElementById('headerIesName')?.value || 'Centro Educativo';
  const dateStr = new Date().toLocaleDateString('es-ES', {year:'numeric', month:'long', day:'numeric'});

  let bodyHtml = '';
  let totalAlumnosConPend = 0;

  NIVELES.forEach(n => {
    const grupos = GRUPOS_POR_NIVEL[n] || [];
    const todosAlumnos = grupos.flatMap(g =>
      (data[n]?.[g] || [])
        .map(a => ({...a, _grupo: g}))
        .filter(a => (a.pendientesIII||[]).length > 0 || (a.pendientesExtr||[]).length > 0)
    );
    if (!todosAlumnos.length) return;

    totalAlumnosConPend += todosAlumnos.length;
    const bach = isBach(n);

    // Sort by apellidos
    todosAlumnos.sort((a,b) => (a.nombre||'').localeCompare(b.nombre||'', 'es'));

    const rows = todosAlumnos.map((a, idx) => {
      const pIII  = (a.pendientesIII  || []).join(' · ') || '—';
      const pExtr = (a.pendientesExtr || []).join(' · ') || '—';
      const totalPend = (a.pendientesIII||[]).length + (a.pendientesExtr||[]).length;
      return `<tr>
        <td style="text-align:center;color:#888;font-size:9pt">${idx+1}</td>
        <td style="font-weight:600">${(a.nombre||'—').replace(/</g,'&lt;')}</td>
        <td style="text-align:center">${a._grupo}</td>
        ${bach
          ? `<td style="color:#b45309">${pIII}</td>
             <td style="color:#c2410c">${pExtr}</td>`
          : `<td style="color:#b45309">${pIII}</td>`
        }
        <td style="text-align:center;font-weight:700;color:${totalPend>=3?'#dc2626':totalPend>=2?'#b45309':'#166534'}">${totalPend}</td>
      </tr>`;
    }).join('');

    const bachThs = bach
      ? `<th style="width:30%">Pend. III Evaluación</th><th style="width:25%">Pend. Eval. Extraordinaria</th>`
      : `<th style="width:45%">Materias pendientes próximo curso</th>`;

    bodyHtml += `
      <div class="nivel-section">
        <div class="nivel-header">
          <span>${n}</span>
          <span class="nivel-count">${todosAlumnos.length} alumno${todosAlumnos.length!==1?'s':''} con materias pendientes</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:3%">#</th>
              <th style="width:24%">Alumno/a</th>
              <th style="width:6%">Grupo</th>
              ${bachThs}
              <th style="width:5%">Nº</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  });

  if (!bodyHtml) {
    showToast('ℹ No hay alumnos con materias pendientes registradas');
    return;
  }

  // Ranking de materias global
  const rankingMap = {};
  NIVELES.forEach(n => {
    const grupos = GRUPOS_POR_NIVEL[n] || [];
    grupos.forEach(g => {
      (data[n]?.[g] || []).forEach(a => {
        [...(a.pendientesIII||[]), ...(a.pendientesExtr||[])].forEach(m => {
          if (!rankingMap[m]) rankingMap[m] = 0;
          rankingMap[m]++;
        });
      });
    });
  });
  const rankingSorted = Object.entries(rankingMap).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const rankingRows = rankingSorted.map(([m,c],i) =>
    `<tr><td style="text-align:center;color:#888">${i+1}</td><td>${m}</td><td style="text-align:center;font-weight:700;color:#b45309">${c}</td></tr>`
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe Materias Pendientes — ${iesName}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 10.5pt; color: #111; }
  .page { padding: 14mm 16mm; }

  .doc-header { margin-bottom: 18px; }
  .doc-title { font-size: 15pt; font-weight: bold; color: #1a3a6b; margin-bottom: 3px; }
  .doc-meta { font-size: 9.5pt; color: #555; display: flex; gap: 24px; flex-wrap: wrap; }
  .doc-meta span { display: flex; align-items: center; gap: 5px; }

  .summary-bar {
    display: flex; gap: 14px; margin-bottom: 20px;
    padding: 10px 14px; background: #f0f5ff;
    border: 1px solid #c5d8ef; border-radius: 6px;
  }
  .summary-pill {
    padding: 4px 12px; border-radius: 12px; font-size: 9.5pt; font-weight: bold;
  }
  .pill-yellow { background: #fef9c3; color: #854d0e; border: 1px solid #fde68a; }
  .pill-blue   { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }

  .nivel-section { margin-bottom: 22px; page-break-inside: avoid; }
  .nivel-header {
    background: #1a3a6b; color: white; font-weight: bold;
    padding: 6px 12px; border-radius: 4px 4px 0 0;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 11pt;
  }
  .nivel-count { font-size: 9pt; font-weight: normal; opacity: 0.85; }

  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th {
    background: #dce8f5; font-weight: bold; padding: 5px 8px;
    border: 1px solid #9ab5d4; text-align: left; color: #1a3a6b;
    font-size: 9pt;
  }
  td { padding: 5px 8px; border: 1px solid #c0d0e0; vertical-align: top; }
  tr:nth-child(even) td { background: #f8faff; }

  .ranking-section { margin-top: 24px; page-break-inside: avoid; }
  .ranking-title {
    background: #854d0e; color: white; font-weight: bold;
    padding: 6px 12px; border-radius: 4px 4px 0 0; font-size: 11pt;
  }

  .footer {
    margin-top: 28px; padding-top: 10px;
    border-top: 1.5px solid #c5d8ef;
    display: flex; justify-content: space-between;
    font-size: 8.5pt; color: #777;
  }

  @media print {
    .page { padding: 10mm 12mm; }
    @page { margin: 10mm; size: A4; }
    .nivel-section { page-break-inside: avoid; }
  }

  #print-bar {
    position: fixed; top: 0; left: 0; right: 0;
    background: #1a3a6b; color: white;
    padding: 10px 20px; display: flex; align-items: center; gap: 14px;
    font-family: Arial; font-size: 13px; z-index: 1000;
  }
  #print-bar button {
    padding: 6px 18px; border-radius: 6px; border: none;
    background: #f5c842; color: #111; font-weight: bold;
    cursor: pointer; font-size: 13px;
  }
  #print-bar button:hover { background: #fde047; }
  @media print { #print-bar { display: none; } body { padding-top: 0; } }
  body { padding-top: 48px; }
</style>
</head>
<body>
<div id="print-bar">
  <span>📋 Informe de Materias Pendientes</span>
  <button onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
  <button onclick="window.close()" style="background:rgba(255,255,255,0.2);color:white;">✕ Cerrar</button>
</div>

<div class="page">
  <div class="doc-header">
    <div class="doc-title">📚 Informe de Materias Pendientes</div>
    <div class="doc-meta">
      <span>🏫 ${iesName.replace(/</g,'&lt;')}</span>
      <span>📅 ${dateStr}</span>
      <span>👥 ${totalAlumnosConPend} alumnos con materias pendientes</span>
    </div>
  </div>

  ${bodyHtml}

  <div class="ranking-section">
    <div class="ranking-title">🏆 Top 10 — Materias con más alumnos pendientes (todos los niveles)</div>
    <table>
      <thead>
        <tr>
          <th style="width:4%">#</th>
          <th>Materia</th>
          <th style="width:12%;text-align:center">Nº alumnos</th>
        </tr>
      </thead>
      <tbody>${rankingRows}</tbody>
    </table>
  </div>

  <div class="footer">
    <span>Gestor de Tutoría — ${iesName.replace(/</g,'&lt;')}</span>
    <span>Generado el ${dateStr}</span>
  </div>
</div>
<script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`;

  const win = _ventanaDoc();
  if (win) { win.document.write(html); win.document.close(); }
  else showToast('⚠ Permite las ventanas emergentes para imprimir');
}

// Separa "Materia (Curso)" en sus dos partes. Si no hay paréntesis (formato antiguo
// o nivel sin equivalencia académica), devuelve el texto completo como materia.
function _splitMateriaCurso(valor) {
  const m = /^(.*)\s\(([^()]+)\)\s*$/.exec(valor || '');
  return m ? { materia: m[1], curso: m[2] } : { materia: valor || '', curso: '' };
}

function buildPendientesDisplay(materias, nivel, grupo, idx, mode) {
  const arr = Array.isArray(materias) ? materias : [];
  const isExtr = mode === 'extr';
  const isP1 = mode === 'p1';
  const isP2 = mode === 'p2';
  const isAnt = mode === 'ant';
  const cls = isExtr ? 'extr-mode' : isAnt ? 'ant-mode' : '';
  const tagCls = isExtr ? ' extr' : isAnt ? ' ant' : '';
  const field = isExtr ? 'pendientesExtr' : isP1 ? 'pendientes1' : isP2 ? 'pendientes2' : isAnt ? 'pendientesAnteriores' : 'pendientesIII';
  if (!arr.length) {
    return `<div class="pendientes-display ${cls}" onclick="openPendientesPanel(event,'${jsAttr(nivel)}','${jsAttr(grupo)}',${idx},'${field}')">
      <span class="pendientes-placeholder">—</span>
    </div>`;
  }
  const renderTag = (m) => {
    if (!isAnt) return `<span class="pend-tag${tagCls}" title="${m}">${m}</span>`;
    const { materia, curso } = _splitMateriaCurso(m);
    return `<span class="pend-tag${tagCls}" title="${m}">${materia}${curso ? `<span class="pend-tag-curso">${curso}</span>` : ''}</span>`;
  };
  const pills = arr.slice(0,2).map(renderTag).join('');
  const extra = arr.length > 2
    ? `<span class="pend-count${tagCls}">+${arr.length-2}</span>` : '';
  return `<div class="pendientes-display ${cls}" onclick="openPendientesPanel(event,'${jsAttr(nivel)}','${jsAttr(grupo)}',${idx},'${field}')" title="${arr.join(', ')}">
    ${pills}${extra}
  </div>`;
}

// ===== RECUPERADAS (materias de cursos anteriores recuperadas en eval. final) =====
// Solo se pueden recuperar materias que el alumno tenga marcadas como pendientes
// de cursos anteriores. Mecanismo de marcado idéntico al de pendientes (multi-selección).
function buildRecuperadasDisplay(a, nivel, grupo, idx) {
  const pend = Array.isArray(a.pendientesAnteriores) ? a.pendientesAnteriores : [];
  const rec  = Array.isArray(a.recuperadasAnteriores) ? a.recuperadasAnteriores : [];
  const norec = Array.isArray(a.noRecuperadasAnteriores) ? a.noRecuperadasAnteriores : [];
  // Solo cuentan las que siguen estando entre las pendientes de cursos anteriores
  const recValid   = rec.filter(m => pend.includes(m));
  const norecValid = norec.filter(m => pend.includes(m) && !recValid.includes(m));
  if (!pend.length) {
    return `<div class="pendientes-display rec-mode rec-empty" title="Sin materias pendientes de cursos anteriores">
      <span class="pendientes-placeholder">—</span>
    </div>`;
  }
  if (!recValid.length && !norecValid.length) {
    return `<div class="pendientes-display rec-mode" onclick="openRecuperadasPanel(event,'${jsAttr(nivel)}','${jsAttr(grupo)}',${idx})" title="Marcar materias recuperadas / no recuperadas (${pend.length} pendiente${pend.length>1?'s':''})">
      <span class="pendientes-placeholder">— marcar</span>
    </div>`;
  }
  const renderTag = (m, recuperada) => {
    const { materia, curso } = _splitMateriaCurso(m);
    const cls  = recuperada ? 'rec' : 'norec';
    const icon = recuperada ? '✓' : '✗';
    const tip  = recuperada ? 'Recuperada' : 'No recuperada';
    return `<span class="pend-tag ${cls}" title="${tip}: ${m}">${icon} ${materia}${curso ? `<span class="pend-tag-curso">${curso}</span>` : ''}</span>`;
  };
  // Etiquetas combinadas: primero recuperadas (verde), luego no recuperadas (rojo)
  const items = [...recValid.map(m => [m, true]), ...norecValid.map(m => [m, false])];
  const pills = items.slice(0,2).map(([m, r]) => renderTag(m, r)).join('');
  const extra = items.length > 2 ? `<span class="pend-count rec">+${items.length-2}</span>` : '';
  const titleParts = [];
  if (recValid.length)   titleParts.push(`Recuperadas: ${recValid.join(', ')}`);
  if (norecValid.length) titleParts.push(`No recuperadas: ${norecValid.join(', ')}`);
  return `<div class="pendientes-display rec-mode" onclick="openRecuperadasPanel(event,'${jsAttr(nivel)}','${jsAttr(grupo)}',${idx})" title="${titleParts.join(' · ')} · ${recValid.length+norecValid.length}/${pend.length} marcada${(recValid.length+norecValid.length)>1?'s':''}">
    ${pills}${extra}
  </div>`;
}


let _activePendientesPanel = null;

function closePendientesPanel() {
  if (_activePendientesPanel) {
    _activePendientesPanel.panel.remove();
    if (_activePendientesPanel.display) _activePendientesPanel.display.classList.remove('open');
    _activePendientesPanel = null;
  }
}

document.addEventListener('click', function(e) {
  if (_activePendientesPanel &&
      !_activePendientesPanel.panel.contains(e.target) &&
      !e.target.closest('.pendientes-display')) {
    closePendientesPanel();
  }
});

function openPendientesPanel(e, nivel, grupo, idx, field) {
  e.stopPropagation();
  closePendientesPanel();

  const display = e.currentTarget;
  display.classList.add('open');
  const rect = display.getBoundingClientRect();
  const alumno = data[nivel][grupo][idx];
  const isExtr = field === 'pendientesExtr';
  const isP1   = field === 'pendientes1';
  const isP2   = field === 'pendientes2';
  const isAnt  = field === 'pendientesAnteriores';
  const selected = Array.isArray(alumno[field]) ? [...alumno[field]] : [];
  const materias = isAnt ? getMateriasCursosAnteriores(nivel) : getMateriasParaNivel(nivel, grupo);
  const label = isExtr ? 'Pend. Eval. Extraordinaria' : isP1 ? 'Pend. I Evaluación' : isP2 ? 'Pend. II Evaluación' : isAnt ? 'Pendientes de cursos anteriores' : 'Pend. Próximo Curso';

  const panel = document.createElement('div');
  panel.className = 'pendientes-panel open' + (isExtr ? ' extr-mode' : isAnt ? ' ant-mode' : '');

  // Position panel
  const spaceBelow = window.innerHeight - rect.bottom;
  const panelH = 400;
  const top = (spaceBelow > panelH || spaceBelow > rect.top)
    ? rect.bottom + 4
    : rect.top - panelH - 4;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - 395));
  panel.style.cssText = `position:fixed;top:${top}px;left:${left}px;`;

  function save() {
    alumno[field] = [...selected];
    // Si cambian las pendientes de cursos anteriores, limpiar de "recuperadas"
    // y "no recuperadas" las que ya no estén pendientes (coherencia de datos)
    if (isAnt && Array.isArray(alumno.recuperadasAnteriores)) {
      alumno.recuperadasAnteriores = alumno.recuperadasAnteriores.filter(m => selected.includes(m));
    }
    if (isAnt && Array.isArray(alumno.noRecuperadasAnteriores)) {
      alumno.noRecuperadasAnteriores = alumno.noRecuperadasAnteriores.filter(m => selected.includes(m));
    }
    markDirty();
    // Update display cell inline — use replaceWith to avoid broken outerHTML ref
    const key = `${nivel}-${grupo}`;
    const tbl = document.getElementById(`tbl-${key}`);
    if (tbl) {
      const row = tbl.querySelector(`tbody tr[data-idx="${idx}"]`);
      if (row) {
        row.querySelectorAll('td').forEach(td => {
          const disp = td.querySelector('.pendientes-display');
          if (!disp) return;
          // Detect which field this display corresponds to via onclick attr
          const onc = disp.getAttribute('onclick') || '';
          // La celda de "Recuperadas" depende de pendientesAnteriores: refrescar también
          if (onc.includes('openRecuperadasPanel') || disp.classList.contains('rec-mode')) {
            if (isAnt) td.innerHTML = buildRecuperadasDisplay(alumno, nivel, grupo, idx);
            return;
          }
          let thisField = 'pendientesIII';
          let modeStr = 'iii';
          if (onc.includes("'pendientesExtr'")) { thisField = 'pendientesExtr'; modeStr = 'extr'; }
          else if (onc.includes("'pendientes1'"))  { thisField = 'pendientes1';   modeStr = 'p1'; }
          else if (onc.includes("'pendientes2'"))  { thisField = 'pendientes2';   modeStr = 'p2'; }
          else if (onc.includes("'pendientesAnteriores'")) { thisField = 'pendientesAnteriores'; modeStr = 'ant'; }
          if (thisField !== field) return;
          td.innerHTML = buildPendientesDisplay(selected, nivel, grupo, idx, modeStr);
        });
      }
    }
  }

  function renderPanel() {
    const searchVal = panel.querySelector('.pendientes-search')?.value.toLowerCase() || '';
    const accentColor = isExtr ? 'var(--orange)' : isAnt ? 'var(--red)' : 'var(--yellow)';
    panel.innerHTML = `
      <div class="pendientes-panel-title">
        <span>${label}</span>
        <span style="color:${accentColor};font-weight:700">
          ${selected.length ? selected.length + ' seleccionada' + (selected.length>1?'s':'') : 'ninguna'}
        </span>
      </div>
      <input class="pendientes-search" type="text" placeholder="Buscar materia…" value="${searchVal}"
        oninput="(function(inp){
          var panel = inp.closest('.pendientes-panel');
          panel.querySelectorAll('.pendientes-option').forEach(o=>{
            o.classList.toggle('hidden', !o.dataset.label.toLowerCase().includes(inp.value.toLowerCase()));
          });
          panel.querySelectorAll('.pendientes-group-header').forEach(h=>{
            var next = h.nextElementSibling, anyVisible = false;
            while (next && next.classList.contains('pendientes-option')) {
              if (!next.classList.contains('hidden')) { anyVisible = true; break; }
              next = next.nextElementSibling;
            }
            h.classList.toggle('hidden', !anyVisible);
          });
          panel.querySelector('.pendientes-panel-title span:last-child')
            .textContent = panel.querySelectorAll('.pendientes-option:not(.hidden)').length + ' mostradas';
        })(this)" />
      <div class="pendientes-list">
        ${!materias.length ? `<div style="padding:14px 8px;font-size:11px;color:var(--text3);line-height:1.5;text-align:center;">${isAnt ? (NIVELES.indexOf(nivel) <= 0 && !_normalizarNivelAcademico(nivel) ? 'No hay niveles anteriores definidos a la izquierda de este nivel en la barra de pestañas.' : (_normalizarNivelAcademico(nivel) === '1º ESO' ? 'No hay cursos anteriores a 1º ESO.' : 'Este curso no tiene materias previas registradas.')) + '<br>Las materias se toman del catálogo de la pestaña ⚙ Materias.' : 'No hay materias definidas para este nivel.'}</div>` : ''}
        ${(() => {
          if (!isAnt) {
            return materias.map(m => {
              const mSafe = m.replace(/"/g,'&quot;').replace(/'/g,'&#39;');
              return `
              <label class="pendientes-option" data-label="${mSafe}">
                <input type="checkbox" value="${mSafe}" ${selected.includes(m)?'checked':''}
                  onchange="(function(cb){
                    var panel=cb.closest('.pendientes-panel');
                    var sel=Array.from(panel.querySelectorAll('input[type=checkbox]:checked')).map(c=>c.value);
                    panel.querySelector('.pendientes-panel-title span:last-child').textContent=
                      sel.length?sel.length+' seleccionada'+(sel.length>1?'s':''):'ninguna';
                  })(this)" />
                <span class="pendientes-option-label">${m}</span>
              </label>`;
            }).join('');
          }
          // Modo "ant": agrupar visualmente por curso de origen
          let lastCurso = null;
          return materias.map(m => {
            const { materia, curso } = _splitMateriaCurso(m);
            const mSafe = m.replace(/"/g,'&quot;').replace(/'/g,'&#39;');
            const header = curso !== lastCurso ? `<div class="pendientes-group-header">${curso}</div>` : '';
            lastCurso = curso;
            return `${header}
              <label class="pendientes-option" data-label="${mSafe}">
                <input type="checkbox" value="${mSafe}" ${selected.includes(m)?'checked':''}
                  onchange="(function(cb){
                    var panel=cb.closest('.pendientes-panel');
                    var sel=Array.from(panel.querySelectorAll('input[type=checkbox]:checked')).map(c=>c.value);
                    panel.querySelector('.pendientes-panel-title span:last-child').textContent=
                      sel.length?sel.length+' seleccionada'+(sel.length>1?'s':''):'ninguna';
                  })(this)" />
                <span class="pendientes-option-label">${materia}</span>
              </label>`;
          }).join('');
        })()}
      </div>
      <div class="pendientes-footer">
        <span style="font-size:11px;color:var(--text3)">${materias.length} materias</span>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="
            this.closest('.pendientes-panel').querySelectorAll('input[type=checkbox]').forEach(cb=>cb.checked=false);
            this.closest('.pendientes-panel')._selected=[];
            this.closest('.pendientes-panel').querySelector('.pendientes-panel-title span:last-child').textContent='ninguna';
          ">Limpiar</button>
          <button class="btn btn-primary btn-sm" onclick="
            var panel=this.closest('.pendientes-panel');
            panel._doSave();
            closePendientesPanel();
          ">Hecho</button>
        </div>
      </div>`;

    // Re-check selected after render
    panel.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.checked = selected.includes(cb.value);
    });
    panel._selected = [...selected];
  }

  renderPanel();
  document.body.appendChild(panel);

  // Simplified save: read checked state directly from panel, no global needed
  panel._doSave = function() {
    const checked = Array.from(panel.querySelectorAll('input[type=checkbox]:checked')).map(c => c.value);
    selected.length = 0;
    checked.forEach(v => selected.push(v));
    save();
  };

  _activePendientesPanel = { panel, display, field, nivel, grupo, idx, selected };

  // Focus search
  setTimeout(() => panel.querySelector('.pendientes-search')?.focus(), 50);
}

// ===== PANEL RECUPERADAS / NO RECUPERADAS (materias de cursos anteriores) =====
// Las opciones son EXACTAMENTE las materias que el alumno tiene marcadas como
// pendientes de cursos anteriores. Para cada una se indica si ha sido recuperada,
// no recuperada, o se deja sin marcar. Recuperada y No recuperada son excluyentes.
function openRecuperadasPanel(e, nivel, grupo, idx) {
  e.stopPropagation();
  closePendientesPanel();

  const display = e.currentTarget;
  display.classList.add('open');
  const rect = display.getBoundingClientRect();
  const alumno = data[nivel][grupo][idx];
  const pendientes = Array.isArray(alumno.pendientesAnteriores) ? [...alumno.pendientesAnteriores] : [];

  if (!pendientes.length) {
    display.classList.remove('open');
    showToast('ℹ️ Marca primero las materias pendientes de cursos anteriores');
    return;
  }

  // Estado local por materia: 'rec' | 'norec' | '' (sin marcar)
  const estado = {};
  pendientes.forEach(m => { estado[m] = ''; });
  (alumno.recuperadasAnteriores || []).forEach(m => { if (pendientes.includes(m)) estado[m] = 'rec'; });
  (alumno.noRecuperadasAnteriores || []).forEach(m => { if (pendientes.includes(m) && estado[m] !== 'rec') estado[m] = 'norec'; });

  const panel = document.createElement('div');
  panel.className = 'pendientes-panel open rec-mode';

  const spaceBelow = window.innerHeight - rect.bottom;
  const panelH = 420;
  const top = (spaceBelow > panelH || spaceBelow > rect.top) ? rect.bottom + 4 : rect.top - panelH - 4;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - 395));
  panel.style.cssText = `position:fixed;top:${top}px;left:${left}px;`;

  function counts() {
    let r = 0, n = 0;
    pendientes.forEach(m => { if (estado[m] === 'rec') r++; else if (estado[m] === 'norec') n++; });
    return { r, n };
  }

  function save() {
    alumno.recuperadasAnteriores   = pendientes.filter(m => estado[m] === 'rec');
    alumno.noRecuperadasAnteriores = pendientes.filter(m => estado[m] === 'norec');
    markDirty();
    const key = `${nivel}-${grupo}`;
    const tbl = document.getElementById(`tbl-${key}`);
    if (tbl) {
      const row = tbl.querySelector(`tbody tr[data-idx="${idx}"]`);
      if (row) {
        row.querySelectorAll('td').forEach(td => {
          const disp = td.querySelector('.pendientes-display.rec-mode');
          if (disp) td.innerHTML = buildRecuperadasDisplay(alumno, nivel, grupo, idx);
        });
      }
    }
  }

  function renderPanel() {
    const c = counts();
    panel.innerHTML = `
      <div class="pendientes-panel-title">
        <span>Recuperadas / No recuperadas</span>
        <span style="font-weight:700"><span style="color:var(--green)">${c.r} ✓</span> · <span style="color:var(--red)">${c.n} ✗</span> <span style="color:var(--text3)">/ ${pendientes.length}</span></span>
      </div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:6px;line-height:1.4;">
        Para cada materia pendiente de cursos anteriores indica si el alumnado la <b style="color:var(--green)">ha recuperado</b> o <b style="color:var(--red)">no la ha recuperado</b>. Pulsa de nuevo un botón para desmarcarlo.
      </div>
      <div class="pendientes-list">
        ${pendientes.map(m => {
          const st = estado[m];
          const mAttr = encodeURIComponent(m);
          return `
          <div class="recnorec-row" style="display:flex;align-items:center;gap:6px;padding:5px 4px;border-bottom:1px solid var(--border);">
            <span class="pendientes-option-label" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${m.replace(/"/g,'&quot;')}">${m}</span>
            <button type="button" class="recnorec-btn" data-m="${mAttr}" data-set="rec"
              style="border:1px solid ${st==='rec'?'var(--green)':'var(--border2)'};background:${st==='rec'?'var(--green)':'transparent'};color:${st==='rec'?'#08231a':'var(--text2)'};border-radius:5px;padding:3px 7px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;">✓</button>
            <button type="button" class="recnorec-btn" data-m="${mAttr}" data-set="norec"
              style="border:1px solid ${st==='norec'?'var(--red)':'var(--border2)'};background:${st==='norec'?'var(--red)':'transparent'};color:${st==='norec'?'#fff':'var(--text2)'};border-radius:5px;padding:3px 7px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;">✗</button>
          </div>`;
        }).join('')}
      </div>
      <div class="pendientes-footer">
        <span style="font-size:11px;color:var(--text3)">${pendientes.length} pendiente${pendientes.length>1?'s':''}</span>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" data-action="clear">Limpiar</button>
          <button class="btn btn-primary btn-sm" data-action="done">Hecho</button>
        </div>
      </div>`;
  }

  renderPanel();
  document.body.appendChild(panel);

  // Manejo de clics dentro del panel (delegación). Cada cambio guarda al momento.
  panel.addEventListener('click', function(ev){
    const btn = ev.target.closest('.recnorec-btn');
    if (btn) {
      ev.stopPropagation();
      const m = decodeURIComponent(btn.dataset.m);
      const set = btn.dataset.set;
      estado[m] = (estado[m] === set) ? '' : set;  // alterna; rec y norec son excluyentes
      save();
      renderPanel();
      return;
    }
    const act = ev.target.closest('[data-action]');
    if (act) {
      ev.stopPropagation();
      if (act.dataset.action === 'clear') {
        pendientes.forEach(m => { estado[m] = ''; });
        save();
        renderPanel();
      } else if (act.dataset.action === 'done') {
        save();
        closePendientesPanel();
      }
    }
  });

  panel._doSave = save;
  _activePendientesPanel = { panel, display, field: 'recuperadasAnteriores', nivel, grupo, idx };
}


function setSortCol(nivel, grupo, col) {
  const key = `${nivel}-${grupo}`;
  const ss = _sortState[key] || {};
  if (ss.col === col) {
    _sortState[key] = { col, dir: ss.dir === 'asc' ? 'desc' : 'asc' };
  } else {
    _sortState[key] = { col, dir: 'asc' };
  }
  updateTable(nivel, grupo);
}
