/* ============================================================================
   Cuaderno del profesor · Resumen del grupo: aprobados, SdA y estadísticas
   js/resumen/resumen-grupo.js
   ============================================================================ */

/* =================================================================
   RESUMEN DEL GRUPO — aprobados/suspensos por evaluación, SdA
   trabajadas vs previstas y propuestas de mejora. Estos datos se
   incorporan también al informe de grupo imprimible.
   ================================================================= */
function resumenAprobados(grupo,trim){
  // trim = 0/1/2 para una evaluación; "final" para la nota final del curso
  let ap=0,su=0,sc=0;
  grupo.alumnos.forEach(al=>{
    const v = trim==="final" ? notaFinal(grupo,al.id) : notaTrimestre(grupo,al.id,trim);
    if(v==null) sc++;
    else if(esAprobado(v,grupo)) ap++;
    else su++;
  });
  return {ap,su,sc,total:grupo.alumnos.length};
}
function sdasDeTrim(grupo,trim){
  const set=new Set();
  grupo.actividades.filter(a=>a.trimestre===trim && (a.sda||"").trim()).forEach(a=>set.add(a.sda.trim().toLowerCase()));
  return set;
}
function sdasDeCurso(grupo){
  const set=new Set();
  [0,1,2].forEach(t=>sdasDeTrim(grupo,t).forEach(s=>set.add(s)));
  return set;
}
function sdaPrevistasCurso(grupo){
  const vals=(grupo.sdaPrevistas||[]).map(v=>Number(v)).filter(v=>!isNaN(v)&&v>0);
  return vals.length? vals.reduce((a,b)=>a+b,0) : null;
}
function barraAprobadosHTML(r,opts){
  // Barra apilada aprobados/suspensos/sin calificar; funciona en pantalla y en impresión.
  opts=opts||{};
  if(!r.total) return `<p style="color:${opts.print?'#666':'var(--mut)'};font-size:13px;margin:6px 0">Sin alumnado.</p>`;
  const seg=(n,color,label)=> n>0? `<div title="${label}: ${n}" style="flex:${n};background:${color};display:flex;align-items:center;justify-content:center;color:#fff;font-size:11.5px;font-weight:600;min-width:26px;print-color-adjust:exact;-webkit-print-color-adjust:exact">${n}</div>`:"";
  return `
  <div style="display:flex;height:26px;border-radius:7px;overflow:hidden;border:1px solid ${opts.print?'#ccc':'var(--line)'};margin:6px 0 4px">
    ${seg(r.ap,"#2f7d4f","Aprobados")}${seg(r.su,"#b04343","Suspensos")}${seg(r.sc,"#9aa1ab","Sin calificar")}
  </div>
  <div style="font-size:12px;color:${opts.print?'#555':'var(--mut)'}">
    <span style="color:#2f7d4f;font-weight:600">■</span> Aprobados ${r.ap} (${Math.round(r.ap/r.total*100)}%) ·
    <span style="color:#b04343;font-weight:600">■</span> Suspensos ${r.su} (${Math.round(r.su/r.total*100)}%)
    ${r.sc?` · <span style="color:#9aa1ab;font-weight:600">■</span> Sin calificar ${r.sc}`:""}
  </div>`;
}
function sdaResumenTexto(trabajadas,previstas,opts){
  opts=opts||{};
  const prev = (previstas==null||previstas==="")? null : Number(previstas);
  const color = opts.print? '#555' : 'var(--mut)';
  if(prev==null || isNaN(prev) || prev<=0) return `<span style="font-size:13px;color:${color}">SdA trabajadas: <strong>${trabajadas}</strong> (previstas sin indicar)</span>`;
  const pct=Math.min(100,Math.round(trabajadas/prev*100));
  return `<span style="font-size:13px;color:${color}">SdA trabajadas: <strong>${trabajadas} de ${prev}</strong> previstas (${pct}%)</span>`;
}
function evolucionAprobadosHTML(grupo){
  const datos=[0,1,2].map(t=>{ const r=resumenAprobados(grupo,t); const pct=r.total?Math.round(r.ap/r.total*100):null; return {trim:t,pct}; });
  const barras=datos.map(d=>{
    const alturaPx = d.pct==null? 4 : Math.max(4, Math.round(d.pct/100*90));
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1">
      <div style="font-size:12px;font-weight:700;color:${d.pct==null?'var(--mut)':'var(--accent-2)'}">${d.pct==null?"—":d.pct+"%"}</div>
      <div style="width:100%;max-width:46px;height:90px;display:flex;align-items:flex-end;background:var(--surface-2);border-radius:6px;overflow:hidden">
        <div style="width:100%;height:${alturaPx}px;background:linear-gradient(180deg,var(--accent),var(--accent-2));border-radius:6px 6px 0 0"></div>
      </div>
      <div style="font-size:11px;color:var(--mut);text-align:center">${TRIMESTRES[d.trim].replace("ª evaluación","ª ev.")}</div>
    </div>`;
  }).join("");
  return `<div class="card" style="flex:1;min-width:260px">
    <h2 style="font-size:15px">Evolución de aprobados por evaluación</h2>
    <p class="sub" style="margin:0 0 10px">Porcentaje de aprobados (nota cuantitativa) en cada evaluación de este grupo.</p>
    <div class="flex" style="align-items:flex-end;gap:14px;max-width:320px">${barras}</div>
  </div>`;
}
function evolucionMediaGrupoHTML(grupo){
  const etiquetas=["1ª ev.","2ª ev.","3ª ev."];
  const valores=[0,1,2].map(t=>{
    const notas=grupo.alumnos.map(al=>notaTrimestre(grupo,al.id,t)).filter(v=>v!=null);
    const media=notas.length? notas.reduce((a,b)=>a+b,0)/notas.length : null;
    return {label:etiquetas[t],value:media,activo:false};
  });
  const notasFinal=grupo.alumnos.map(al=>notaFinal(grupo,al.id)).filter(v=>v!=null);
  const mediaFinal=notasFinal.length? notasFinal.reduce((a,b)=>a+b,0)/notasFinal.length : null;
  valores.push({label:"Final",value:mediaFinal,activo:true});
  return `<div class="card" style="flex:1;min-width:280px">
    <h2 style="font-size:15px">Evolución de la media del grupo</h2>
    <p class="sub" style="margin:0 0 10px">Media de la nota cuantitativa (0-10) de todo el alumnado en cada evaluación.</p>
    ${svgBarNotas(valores)}
  </div>`;
}
function distribucionCalificacionesHTML(grupo){
  const trim=state.ui.trim;
  const notas=grupo.alumnos.map(al=>notaTrimestre(grupo,al.id,trim)).filter(v=>v!=null);
  const total=notas.length;
  const filas=NIVCUANT.map(n=>{
    const cnt=notas.filter(v=>etiquetaNota(v)===n).length;
    const pct=total? (cnt/total*100) : null;
    return barraHorizontalHTML(`${n.etq} (${cnt})`,pct,n.fg);
  }).join("");
  return `<div class="card" style="flex:1;min-width:260px">
    <h2 style="font-size:15px">Distribución de calificaciones</h2>
    <p class="sub" style="margin:0 0 10px">${TRIMESTRES[trim]} · ${total} alumno${total===1?"":"s"} con nota.</p>
    ${total?filas:'<p class="sub" style="margin:0">Todavía no hay ninguna nota registrada en esta evaluación.</p>'}
  </div>`;
}
function statsProblematicaHTML(grupo){
  const nese=grupo.alumnos.filter(a=>a.nese).length;
  const repetidores=grupo.alumnos.filter(a=>a.repetidor).length;
  const problematica=grupo.alumnos.filter(a=>a.nese||a.repetidor).length;
  return `<div class="card" style="flex:1;min-width:230px">
    <h2 style="font-size:15px">NESE y repetidores</h2>
    <p class="sub" style="margin:0 0 10px">De los ${grupo.alumnos.length} alumnos de este grupo.</p>
    <div class="grid" style="gap:7px">
      <div class="flex" style="justify-content:space-between"><span style="font-size:13.5px">Alumnado NESE</span><strong style="font-size:14px">${nese}</strong></div>
      <div class="flex" style="justify-content:space-between"><span style="font-size:13.5px">Alumnado repetidor</span><strong style="font-size:14px">${repetidores}</strong></div>
      <div class="flex" style="justify-content:space-between;border-top:1px solid var(--line);padding-top:7px;margin-top:1px">
        <span style="font-size:13.5px;font-weight:600">Alumnado con problemática</span><strong style="font-size:15px;color:var(--accent-2)">${problematica}</strong>
      </div>
    </div>
    <p class="sub" style="margin:8px 0 0;font-size:11px">"Con problemática" = NESE o repetidor; a quien sea las dos cosas se le cuenta una sola vez.</p>
  </div>`;
}
function resumenAsistConvGrupoHTML(grupo,desde,hasta){
  if(!grupo.alumnos.length) return "";
  const d=desde||"2000-01-01", h=hasta||"2099-12-31";
  const filas=grupo.alumnos.map(al=>{
    const asis=asistContarPeriodo(grupo,al.id,d,h);
    const conv=convContarTipos(grupo,al.id,d,h);
    return `<tr><td>${esc(al.nombre)}</td>
      <td style="text-align:center">${asis.falta_justificada||"—"}</td>
      <td style="text-align:center">${asis.falta_no_justificada||"—"}</td>
      <td style="text-align:center">${asis.retraso||"—"}</td>
      <td style="text-align:center">${conv.ac||"—"}</td>
      <td style="text-align:center">${conv.rc||"—"}</td>
      <td style="text-align:center">${conv.pa||"—"}</td>
    </tr>`;
  }).join("");
  return `<table><thead><tr><th>Alumno/a</th><th>Faltas justif.</th><th>Faltas no justif.</th><th>Retrasos</th><th>AC</th><th>RC</th><th>PA</th></tr></thead><tbody>${filas}</tbody></table>`;
}
window.setResumenFiltroTrim=(v)=>{ state.ui.resumenFiltroTrim=v; save(); render(); };
function renderResumen(grupo){
  const c=document.getElementById("tabContent");
  const cards=[0,1,2].map(t=>{
    const r=resumenAprobados(grupo,t);
    const sdaResumen=sdaResumenGrupo(grupo,t);
    return `<div class="card">
      <h2 style="font-size:15.5px">${TRIMESTRES[t]}</h2>
      <div style="font-size:12.5px;color:var(--mut);margin-bottom:2px">Aprobados y suspensos (nota cuantitativa)</div>
      ${barraAprobadosHTML(r)}
      <div class="flex" style="margin-top:12px;align-items:center;flex-wrap:wrap;gap:10px">
        ${sdaResumenTextoNuevo(sdaResumen)}
      </div>
      <div style="margin-top:14px">
        <div style="font-size:12.5px;color:var(--mut);margin-bottom:4px">Propuestas de mejora (${TRIMESTRES[t]})</div>
        <textarea class="in" style="width:100%;min-height:80px;resize:vertical;font-size:14px" placeholder="Medidas y propuestas de mejora acordadas para esta evaluación…" onchange="setPropuestaMejora(${t},this.value)">${esc(grupo.propuestasMejora[t]||"")}</textarea>
      </div>
    </div>`;
  }).join("");
  const rf=resumenAprobados(grupo,"final");
  const sdaResumenCurso=sdaResumenGrupo(grupo,"curso");
  const filtroTrim=state.ui.resumenFiltroTrim||"";
  let desdeF=null, hastaF=null;
  if(filtroTrim!==""){
    const fechasArr=Array.isArray(grupo.fechasTrimestre)?grupo.fechasTrimestre:[];
    const ft=fechasArr[Number(filtroTrim)];
    desdeF=(ft&&ft.inicio)||null; hastaF=(ft&&ft.fin)||null;
  }
  const trimValido=TRIMESTRES[Number(filtroTrim)]||"";
  const sinFechasTrim = filtroTrim!=="" && !desdeF && !hastaF;
  c.innerHTML=`
  <div class="card">
    <div class="flex" style="justify-content:space-between;flex-wrap:wrap">
      <div>
        <h2>Resumen del grupo</h2>
        <p class="sub" style="margin:0">Resultados por evaluación, seguimiento de Situaciones de Aprendizaje, propuestas de mejora, y Asistencia y Convivencia de todo el alumnado. Todo esto se incorpora a los informes de grupo imprimibles (pestaña Resultados): el de cada evaluación incluye solo lo de esa evaluación; el de <strong>evaluación final</strong> es el más completo (las tres evaluaciones + curso completo) y es el indicado para entregar a las familias.</p>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <h2 style="font-size:15.5px">Asistencia y convivencia</h2>
      <label style="font-size:12.5px;color:var(--mut);font-weight:500">Filtrar por
        <select class="in" style="margin-left:6px" onchange="setResumenFiltroTrim(this.value)">
          <option value="" ${filtroTrim===""?"selected":""}>Curso completo</option>
          ${TRIMESTRES.map((t,i)=>`<option value="${i}" ${filtroTrim===String(i)?"selected":""}>${t}</option>`).join("")}
        </select>
      </label>
    </div>
    ${sinFechasTrim?`<p class="sub" style="margin:6px 0 10px;color:var(--warning)">⚠️ No has indicado las fechas de ${trimValido.toLowerCase()} en Ajustes — de momento se muestra el curso completo.</p>`:`<p class="sub" style="margin:6px 0 10px">${filtroTrim===""?"Curso completo hasta la fecha.":`${trimValido}: del ${fmt2(desdeF)} al ${fmt2(hastaF)}.`}</p>`}
    <div style="overflow-x:auto">${resumenAsistConvGrupoHTML(grupo,sinFechasTrim?null:desdeF,sinFechasTrim?null:hastaF)}</div>
  </div>
  <div class="flex" style="align-items:stretch;flex-wrap:wrap;gap:16px">
    ${evolucionAprobadosHTML(grupo)}
    ${statsProblematicaHTML(grupo)}
  </div>
  <div class="flex" style="align-items:stretch;flex-wrap:wrap;gap:16px">
    ${evolucionMediaGrupoHTML(grupo)}
    ${distribucionCalificacionesHTML(grupo)}
  </div>
  ${cards}
  <div class="card" style="border-color:var(--accent)">
    <h2 style="font-size:15.5px">Evaluación final · curso completo</h2>
    <div style="font-size:12.5px;color:var(--mut);margin-bottom:2px">Aprobados y suspensos (nota final, media ponderada de las tres evaluaciones)</div>
    ${barraAprobadosHTML(rf)}
    <div style="margin-top:12px">
      ${sdaResumenTextoNuevo(sdaResumenCurso)}
    </div>
    <div style="margin-top:14px">
      <div style="font-size:12.5px;color:var(--mut);margin-bottom:4px">Propuestas de mejora (evaluación final / memoria de curso)</div>
      <textarea class="in" style="width:100%;min-height:90px;resize:vertical;font-size:14px" placeholder="Valoración global del curso y propuestas de mejora para el próximo…" onchange="setPropuestaMejoraFinal(this.value)">${esc(grupo.propuestasMejoraFinal||"")}</textarea>
    </div>
  </div>`;
}
window.setSdaPrevistas=(t,v)=>{ const g=grupoActual(); g.sdaPrevistas[t]=(v===""||v==null)?null:Math.max(0,Number(v)||0); save(); render(); };
window.setPropuestaMejora=(t,v)=>{ const g=grupoActual(); g.propuestasMejora[t]=v; save(); };
window.setPropuestaMejoraFinal=v=>{ const g=grupoActual(); g.propuestasMejoraFinal=v; save(); };

/* Bloques de resumen para los informes de grupo imprimibles.
   - Por evaluación (0/1/2): SOLO esa evaluación, sin ninguna referencia a la final.
   - Final: el más completo — las tres evaluaciones + la final + todas las propuestas. */
function resumenInformeTrimHTML(grupo,trim){
  const r=resumenAprobados(grupo,trim);
  const sdaResumen=sdaResumenGrupo(grupo,trim);
  const propTrim=(grupo.propuestasMejora[trim]||"").trim();
  const parr=t=>esc(t).replace(/\n/g,"<br>");
  return `
    <h2>Resumen de resultados · ${TRIMESTRES[trim]}</h2>
    ${barraAprobadosHTML(r,{print:true})}
    <div style="margin:8px 0 0">${sdaResumenTextoNuevo(sdaResumen,{print:true})}</div>

    <h2>Propuestas de mejora · ${TRIMESTRES[trim]}</h2>
    <p style="font-size:13px;margin:0">${propTrim?parr(propTrim):'<em style="color:#888">Sin propuestas registradas para esta evaluación.</em>'}</p>
  `;
}
function resumenInformeFinalHTML(grupo){
  const parr=t=>esc(t).replace(/\n/g,"<br>");
  const porEval=[0,1,2].map(t=>{
    const r=resumenAprobados(grupo,t);
    const sdaResumen=sdaResumenGrupo(grupo,t);
    return `
      <h3 style="font-size:13.5px;margin:14px 0 2px">${TRIMESTRES[t]}</h3>
      ${barraAprobadosHTML(r,{print:true})}
      <div style="margin:6px 0 0">${sdaResumenTextoNuevo(sdaResumen,{print:true})}</div>`;
  }).join("");
  const rf=resumenAprobados(grupo,"final");
  const sdaResumenCurso=sdaResumenGrupo(grupo,"curso");
  const propuestas=[0,1,2].map(t=>{
    const p=(grupo.propuestasMejora[t]||"").trim();
    return `<p style="font-size:13px;margin:4px 0 2px"><strong>${TRIMESTRES[t]}:</strong></p>
      <p style="font-size:13px;margin:0 0 10px">${p?parr(p):'<em style="color:#888">Sin propuestas registradas.</em>'}</p>`;
  }).join("");
  const propFinal=(grupo.propuestasMejoraFinal||"").trim();
  return `
    <h2>Resumen de resultados por evaluación</h2>
    ${porEval}
    <h2>Resumen de resultados · evaluación final</h2>
    ${barraAprobadosHTML(rf,{print:true})}
    <div style="margin:8px 0 0">${sdaResumenTextoNuevo(sdaResumenCurso,{print:true})}
      <span style="font-size:12px;color:#777">(curso completo)</span></div>

    <h2>Propuestas de mejora</h2>
    ${propuestas}
    <p style="font-size:13px;margin:4px 0 2px"><strong>Evaluación final / memoria de curso:</strong></p>
    <p style="font-size:13px;margin:0">${propFinal?parr(propFinal):'<em style="color:#888">Sin propuestas registradas.</em>'}</p>
  `;
}

