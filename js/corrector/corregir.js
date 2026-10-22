/* ============================================================================
   Cuaderno del profesor · Corregir, estadísticas por ítem e impresión de la rúbrica corregida
   js/corrector/corregir.js
   ============================================================================ */

/* ---------- Corregir (lista de alumnado de un examen + panel por alumno) ---------- */
function renderCorCorregir(grupo){
  const c=document.getElementById("tabContent");
  const exams=cxExamenesRubrica(grupo);
  if(!exams.length){ c.innerHTML='<div class="card"><h2>Corregir</h2><p class="sub">Todavía no hay ningún examen con rúbrica en este periodo.</p><button class="btn" onclick="cxIrCrear()">+ Nuevo examen</button></div>'; return; }
  if(!exams.find(a=>a.id===state.ui.corExamId)) state.ui.corExamId=exams[0].id;
  const act=exams.find(a=>a.id===state.ui.corExamId);
  if(state.ui.corAlId){
    const al=grupo.alumnos.find(a=>a.id===state.ui.corAlId);
    if(al){ renderCxGradingAlumno(grupo,act,al); return; }
    state.ui.corAlId="";
  }
  if(!grupo.alumnos.length){ c.innerHTML='<div class="card"><h2>Corregir</h2><p class="sub">Este grupo todavía no tiene alumnado (añádelo desde Evaluación por Competencias → Alumnado).</p></div>'; return; }
  if(state.ui.corModoPreg){ exRenderPorPregunta(grupo,act); return; }
  const rows=grupo.alumnos.map(al=>{
    const vc=grupo.notasCuant?.[al.id]?.[act.id];
    const hecho=vc!=null;
    return `<tr>
      <td>${esc(al.nombre)}${neseBadgeHTML(al)}${marcaBadgeHTML(grupo,al.id,act.id)}${cxVarianteDeAlumno(act,al.id)?` <span class="badge" title="Se corrige con una rúbrica adaptada">${esc(cxVarianteDeAlumno(act,al.id).nombre||"Adaptada")}</span>`:""}</td>
      <td style="font-weight:600">${hecho?fmt(vc):"—"}</td>
      <td>${hecho?pillCuant(vc):'<span class="badge">Sin corregir</span>'}</td>
      <td><button class="btn small" onclick="cxIrAlumno('${al.id}')">${hecho?"Revisar":"Corregir"}</button>${hecho?` <button class="ghost small" style="border:1px solid var(--line)" title="Imprimir la rúbrica de este alumno/a" onclick="cxImprimirRubrica('${al.id}','${act.id}')">🖨️</button>`:""}</td>
    </tr>`;
  }).join("");
  // Las marcas NP/Exento no entran en la media ni en las estadísticas del examen.
  const notas=grupo.alumnos.filter(al=>!marcaDe(grupo,al.id,act.id)).map(al=>grupo.notasCuant?.[al.id]?.[act.id]).filter(v=>v!=null);
  const media=notas.length? notas.reduce((a,b)=>a+b,0)/notas.length : null;
  const aprob=notas.filter(v=>esAprobado(v)).length;
  c.innerHTML=`
  <div class="card">
    <div class="flex" style="justify-content:space-between;flex-wrap:wrap">
      <div>
        <h2>${esc(act.nombre)}</h2>
        <p class="sub" style="margin:0">${TRIMESTRES[act.trimestre]} · ${notas.length} de ${grupo.alumnos.length} corregidos</p>
      </div>
      <div class="flex">
        <button class="ghost" style="border:1px solid var(--line)" title="Corregir una pregunta de todo el grupo seguida (opcional)" onclick="exTogglePreg()">↕ Por pregunta</button>
        <select class="in" id="cxExamSel">${exams.map(a=>`<option value="${a.id}" ${a.id===act.id?"selected":""}>${esc(a.nombre)}</option>`).join("")}</select>
        <button class="ghost" style="border:1px solid var(--line)" onclick="cxIrEditor('${act.id}')">✏️ Editar rúbrica</button>
        ${notas.length?`<button class="ghost" style="border:1px solid var(--line)" onclick="cxImprimirRubricasTodos('${act.id}')">🖨️ Imprimir rúbricas</button>`:""}
        <button class="ghost" style="border:1px solid var(--line)" onclick="cxExportarCSV('${act.id}')">⬇ CSV</button>
      </div>
    </div>
    ${notas.length?`<div class="flex" style="margin-top:12px;gap:24px">
      <div><div style="font-size:12.5px;color:var(--mut)">Media</div><span class="big" style="font-size:24px">${fmt(media)}</span></div>
      <div><div style="font-size:12.5px;color:var(--mut)">Aprobados</div><span class="big" style="font-size:24px">${aprob}/${notas.length}</span></div>
    </div>`:""}
  </div>
  <div class="card">
    <div class="flex" style="justify-content:space-between;align-items:center">
      <h2 style="font-size:15px">📊 Estadísticas por ítem</h2>
      <button class="ghost small" style="border:1px solid var(--line)" onclick="cxToggleEstadisticas()">${state.ui.cxVerEstadisticas?"Ocultar":"Ver"}</button>
    </div>
    ${state.ui.cxVerEstadisticas
      ? (notas.length? cxEstadisticasItemsHTML(grupo,act) : '<p class="sub" style="margin:6px 0 0">Corrige al menos un alumno/a para ver las estadísticas.</p>')
      : '<p class="sub" style="margin:6px 0 0">Qué ítems de la rúbrica ha fallado más la clase, para saber qué reforzar antes de seguir.</p>'}
  </div>
  <div class="card"><div style="overflow-x:auto"><table>
    <thead><tr><th>Alumno/a</th><th>Nota</th><th>Calificación</th><th></th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div></div>`;
  document.getElementById("cxExamSel").addEventListener("change",e=>{ state.ui.corExamId=e.target.value; save(); render(); });
}
/* ---- Estadísticas por ítem: qué ha fallado más la clase en este examen ---- */
function barraHorizontalHTML(label,pct,color){
  const w=pct==null?0:Math.max(2,Math.round(pct));
  return `<div style="margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;gap:10px;font-size:12.5px;margin-bottom:3px"><span>${esc(label)}</span><span style="font-weight:700;white-space:nowrap">${pct==null?"—":Math.round(pct)+"%"}</span></div>
    <div style="background:var(--surface-2);border-radius:6px;height:10px;overflow:hidden"><div style="width:${w}%;height:100%;background:${color};border-radius:6px"></div></div>
  </div>`;
}
function cxEstadisticasItems(grupo,act){
  const corregidos=grupo.alumnos.filter(al=>grupo.notasCuant?.[al.id]?.[act.id]!=null);
  const filas=[];
  const grupos=[{nombre:"",rubrica:act.rubrica,alumnos:corregidos.filter(al=>!cxVarianteDeAlumno(act,al.id))},
    ...cxVariantes(act).map(v=>({nombre:v.nombre||"Adaptada",rubrica:v.rubrica,alumnos:corregidos.filter(al=>(v.alumnos||[]).includes(al.id))}))];
  grupos.forEach(gr=>{
    if(gr.nombre && !gr.alumnos.length) return;
    const walk=(list,ruta)=>(list||[]).forEach(sec=>{
      const r=[...ruta,(sec.title||"").split("\n")[0].slice(0,60)].filter(Boolean);
      (sec.items||[]).forEach(it=>{
        const max=Number(it.max)||0;
        const vals=gr.alumnos.map(al=>{
          const v=grupo.rubricScores?.[al.id]?.[act.id]?.[it.id];
          return (v==null||max<=0)?null:(Number(v)/max)*100;
        }).filter(v=>v!=null);
        const avg=vals.length? vals.reduce((x,y)=>x+y,0)/vals.length : null;
        const rr=(it.unico&&!it.label)? r.slice(0,-1) : r;
        filas.push({seccion:(gr.nombre?"["+gr.nombre+"] ":"")+rr.join(" › "),label:it.label||(it.unico&&r[r.length-1])||"(sin enunciado)",avg,n:vals.length});
      });
      walk(sec.subs,r);
    });
    walk(gr.rubrica,[]);
  });
  return filas;
}
function cxEstadisticasItemsHTML(grupo,act){
  const stats=cxEstadisticasItems(grupo,act).sort((a,b)=>{
    if(a.avg==null) return 1; if(b.avg==null) return -1; return a.avg-b.avg;
  });
  if(!stats.length) return '<p class="sub" style="margin:6px 0 0">Esta rúbrica todavía no tiene ítems.</p>';
  const color=v=> v==null?"#c7cede": v<50?"#c62839": v<75?"#a3620a":"#1e7a44";
  const filas=stats.map(s=>barraHorizontalHTML(`${s.label} — ${s.seccion}`,s.avg,color(s.avg))).join("");
  return `<div style="margin-top:10px">${filas}</div>
    <p class="sub" style="margin:4px 0 0;font-size:11px">Media de acierto de cada ítem (puntos obtenidos / puntos máximos) sobre el alumnado ya corregido, de peor a mejor.</p>`;
}
window.cxToggleEstadisticas=()=>{ state.ui.cxVerEstadisticas=!state.ui.cxVerEstadisticas; save(); render(); };
function cxNodoCorregirHTML(sec,depth,sc,alId,actId){
  const k=cxElegirEf(sec);
  const ev=cxEvalNodo(sec,sc);
  const elegidos=new Set(ev.elegidosIds);
  const atenuar=id=> k && ev.hay && !elegidos.has(id);
  const items=(sec.items||[]).map(it=>`
        <div class="row" style="justify-content:space-between;margin-bottom:6px;align-items:flex-start;${atenuar(it.id)?"opacity:.5":""}">
          <div style="flex:1" data-fuente="${it.fuenteId||""}"${it.unico?' data-unico="1"':""}>
            ${it.unico&&!it.label?"":`<div style="font-size:13.5px">${esc(it.label||"(sin enunciado)")}</div>`}
            ${it.desc&&it.desc.length?`<div style="font-size:11.5px;color:var(--mut);margin-top:2px">${it.desc.map(d=>`• ${esc(d)}`).join("<br>")}</div>`:""}
            ${exComentHTML(alId,actId,it.id)}
          </div>
          <span class="flex" style="align-items:center;flex-shrink:0">
            <input class="in miniw" type="text" inputmode="decimal" autocomplete="off" style="width:70px" value="${sc[it.id]==null?'':String(sc[it.id]).replace('.',',')}" onchange="cxSetItemScore('${alId}','${actId}','${it.id}',this.value)">
            <span style="font-size:12px;color:var(--mut)">/ ${cxFmtPts(it.max)}</span>
          </span>
        </div>`).join("");
  const subs=(sec.subs||[]).map(s=>`<div style="${atenuar(s.id)?"opacity:.5;":""}">${cxNodoCorregirHTML(s,depth+1,sc,alId,actId)}</div>`).join("");
  const cab=`<div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline;margin-bottom:6px">
      <div style="${depth===0&&sec.tipo!=="pregunta"?"font-size:12.5px;text-transform:uppercase;letter-spacing:.02em":"font-size:13px"};color:var(--mut);font-weight:600;white-space:pre-wrap">${esc(sec.title||CX_NOMBRE_TIPO[sec.tipo]||(depth===0?"Apartado":"Subapartado"))}</div>
      <div style="font-size:12px;color:var(--mut);white-space:nowrap">${ev.hay?`<strong style="color:var(--ink)">${cxFmtPts(ev.pts)}</strong>`:"—"} / ${cxFmtPts(cxMaxNodo(sec))}</div>
    </div>
    ${k?`<div class="sub" style="font-size:11.5px;margin:-2px 0 6px">A elegir: cuentan ${k} de ${cxNumHijos(sec)}. Puntúa solo lo que haya respondido.</div>`:""}`;
  if(depth===0) return `<div style="margin-bottom:16px">${sec.sinTitulo&&!k?"":cab}${items}${subs}</div>`;
  return `<div style="margin:8px 0 10px ${depth>1?"14px":"10px"};padding-left:10px;border-left:3px solid var(--line)">${cab}${items}${subs}</div>`;
}
function renderCxGradingAlumno(grupo,act,al){
  const c=document.getElementById("tabContent");
  const alumnos=grupo.alumnos;
  const i=alumnos.findIndex(a=>a.id===al.id);
  grupo.rubricScores[al.id]=grupo.rubricScores[al.id]||{};
  const sc=grupo.rubricScores[al.id][act.id]=grupo.rubricScores[al.id][act.id]||{};
  const rubAl=cxRubricaDe(act,al.id);
  const varAl=cxVarianteDeAlumno(act,al.id);
  const critIds=cxCriteriosDeRubrica(rubAl);
  const itemsHtml=rubAl.map(sec=>cxNodoCorregirHTML(sec,0,sc,al.id,act.id)).join("");
  const vc=grupo.notasCuant?.[al.id]?.[act.id];
  const critPanel=critIds.length? `<div class="grid" style="gap:6px;margin-top:6px">
    ${critIds.map(cid=>{
      const v=grupo.notas?.[al.id]?.[act.id]?.[cid];
      return `<div class="flex" style="justify-content:space-between">
        <span style="font-size:13px">${critLinkHTML(grupo.catalogoKey,cid)}</span>
        <span style="font-size:13px;color:var(--mut)">${v==null?"—":v.toFixed(1)+"/10 · "+Math.round(v*10)+"%"}</span>
      </div>`;}).join("")}
  </div>` : '<p class="sub" style="margin:6px 0 0">Ningún ítem de esta rúbrica está vinculado todavía a un criterio.</p>';
  c.innerHTML=`
  <div class="card">
    <div class="flex" style="justify-content:space-between;flex-wrap:wrap">
      <div><h2>${esc(al.nombre)}${neseBadgeHTML(al)}${marcaBadgeHTML(grupo,al.id,act.id)}</h2><p class="sub" style="margin:0">${esc(act.nombre)} · ${marcaBotonesHTML(grupo,al.id,act.id)}</p></div>
      <div class="flex">
        ${vc!=null?`<button class="ghost" style="border:1px solid var(--line)" onclick="cxImprimirRubrica('${al.id}','${act.id}')">🖨️ Imprimir rúbrica</button>`:""}
        <button class="ghost" style="border:1px solid var(--line)" onclick="cxVolverLista()">← Lista</button>
        <button class="ghost" style="border:1px solid var(--line)" ${i<=0?"disabled":""} onclick="cxIrAlumno('${i>0?alumnos[i-1].id:al.id}')">← Anterior</button>
        <button class="ghost" style="border:1px solid var(--line)" ${i>=alumnos.length-1?"disabled":""} onclick="cxIrAlumno('${i<alumnos.length-1?alumnos[i+1].id:al.id}')">Siguiente →</button>
      </div>
    </div>
  </div>
  <div class="card">
    <h2 style="font-size:15px">Rúbrica${varAl?` <span class="badge" style="vertical-align:middle">${esc(varAl.nombre||"Adaptada")}</span>`:""}</h2>
    ${varAl?`<p class="sub" style="margin:0 0 10px">Este alumno/a hace un examen adaptado y se corrige con su propia rúbrica.</p>`:""}
    ${itemsHtml}
  </div>
  <div class="card">
    <div style="font-size:12.5px;color:var(--mut)">Nota cuantitativa</div>
    <span class="big" style="color:var(--accent)">${vc==null?"—":fmt(vc)}</span>
    <p class="sub" style="margin:8px 0 0">Cuenta para la nota numérica del trimestre.</p>
  </div>
  <div class="card">
    <h2 style="font-size:15px">Calificación cualitativa por criterio</h2>
    <p class="sub">Se calcula sola a partir de los ítems vinculados a cada criterio. Se guarda automáticamente en Evaluación por Competencias.</p>
    ${critPanel}
  </div>
  <div class="card">
    <h2 style="font-size:15px">Comentario (opcional)</h2>
    <textarea class="in" style="width:100%;min-height:70px;resize:vertical" id="cxComentario" placeholder="Comentario para este alumno/a en este examen…">${esc(grupo.examComentarios?.[al.id]?.[act.id]||"")}</textarea>
  </div>`;
  document.getElementById("cxComentario").addEventListener("change",e=>{
    grupo.examComentarios[al.id]=grupo.examComentarios[al.id]||{};
    grupo.examComentarios[al.id][act.id]=e.target.value; save();
  });
}
window.cxSetItemScore=(alId,actId,itemId,v)=>{
  const grupo=grupoActual(); const act=grupo.actividades.find(a=>a.id===actId); if(!act) return;
  const item=cxItemsFlat(cxRubricaDe(act,alId)).find(it=>it.id===itemId); if(!item) return;
  const txt=String(v??"").trim().replace(",",".");
  let val=txt===""?null:Number(txt);
  if(val!=null){
    if(!isFinite(val)){ mostrarAviso(`"${v}" no es una puntuación válida. Usa un número entre 0 y ${item.max} (puedes usar coma: 1,5).`); render(); return; }
    if(val<0) val=0; if(val>item.max){ mostrarToast(`Máximo del ítem: ${item.max}. Se ha ajustado.`,"info"); val=Number(item.max); }
  }
  quitarMarcaSiHay(grupo,alId,actId);
  grupo.rubricScores[alId]=grupo.rubricScores[alId]||{};
  grupo.rubricScores[alId][actId]=grupo.rubricScores[alId][actId]||{};
  if(val==null) delete grupo.rubricScores[alId][actId][itemId]; else grupo.rubricScores[alId][actId][itemId]=val;
  cxRecalcAlumno(grupo,act,alId);
  save(); render();
};
window.cxExportarCSV=actId=>{
  const grupo=grupoActual(); const act=grupo.actividades.find(a=>a.id===actId); if(!act) return;
  let csv="Alumno;Nota (0-10);Calificacion;Rubrica\n";
  const q=s=>'"'+String(s??"").replace(/"/g,'""')+'"';
  grupo.alumnos.forEach(al=>{
    const v=grupo.notasCuant?.[al.id]?.[act.id];
    const et=etiquetaNota(v,grupo);
    const va=cxVarianteDeAlumno(act,al.id);
    csv+=`${q(al.nombre)};${v==null?'':String(fmt(v))};${et?et.etq:''};${q(va?(va.nombre||"Adaptada"):"General")}\n`;
  });
  const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"});
  const u=URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=u; a.download="examen-"+act.nombre.replace(/[^a-z0-9]+/gi,"-").toLowerCase()+".csv"; a.click(); URL.revokeObjectURL(u);
};

/* ---------- Impresión de la rúbrica corregida (retroalimentación para alumnado/familias) ----------
   Documento pensado para entregar en mano o enviar a casa: solo el enunciado de cada ítem de la
   rúbrica, su descripción/criterios de logro y la puntuación obtenida. Deliberadamente NO incluye
   los criterios de evaluación de la Programación de Aula a los que está vinculado cada ítem: esa
   vinculación es información de gestión interna del profesorado, no retroalimentación para el
   alumnado.
   Lleva su propia hoja de estilos (cxRubricaPrintCSS), inyectada solo dentro de esta ventana de
   impresión concreta: no toca la plantilla que usan el resto de informes de la aplicación. */
function cxRubricaPrintCSS(){
  return `<style>
    @page{ margin:2.3cm 2cm; }
    body{ margin:0; padding:46px 54px 70px; max-width:740px; line-height:1.55; }
    .cx-letterhead{ font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#5b6b82; margin:0 0 14px; padding-bottom:10px; border-bottom:1px solid #dde3ec; }
    .cx-eyebrow{ font-size:11px; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:#b3893a; margin:0 0 7px; }
    .cx-alumno{ font-size:27px; font-weight:700; margin:0 0 9px; color:#141b28; letter-spacing:-.01em; }
    .cx-portada-titulo{ font-size:23px; font-weight:700; margin:0 0 9px; color:#141b28; }
    .cx-meta-line{ font-size:14px; color:#465064; margin:0 0 28px; }
    .cx-meta-line b{ color:#141b28; font-weight:600; }
    .cx-meta-line .sep{ color:#c7d1de; margin:0 8px; }
    .cx-sub{ font-size:13.5px; color:#5b6b82; margin:0 0 16px; line-height:1.6; }
    .cx-sec{ margin:0 0 24px; page-break-inside:avoid; }
    .cx-sec h2{ font-size:12.5px; text-transform:uppercase; letter-spacing:.04em; color:#5b6b82; border-bottom:1px solid #dde3ec; padding-bottom:7px; margin:0 0 4px; }
    .cx-sec table{ border:1px solid #e6e9ef; }
    .cx-sec td{ padding:11px 13px; }
    .cx-item-label{ font-size:14px; font-weight:600; color:#141b28; }
    .cx-item-desc{ font-size:12.5px; color:#5b6b82; margin-top:4px; line-height:1.6; }
    .cx-item-score{ font-size:16px; font-weight:700; color:#141b28; }
    .cx-item-score small{ font-weight:400; color:#8d97ab; font-size:12px; }
    .cx-total-box{ display:flex; justify-content:space-between; align-items:center; gap:16px; margin:26px 0; padding:16px 20px; background:rgba(183,137,58,.12); border:1px solid rgba(183,137,58,.35); border-radius:10px; page-break-inside:avoid; }
    .cx-total-label{ font-size:12px; text-transform:uppercase; letter-spacing:.05em; color:#8a6a2a; font-weight:700; }
    .cx-total-value{ font-size:27px; font-weight:700; color:#1c1408; margin-top:2px; }
    .cx-total-value small{ font-size:14px; font-weight:400; color:#8a6a2a; }
    .cx-comentario{ margin-top:8px; padding:14px 17px; background:#f6f7f9; border-left:3px solid #b3893a; border-radius:0 8px 8px 0; page-break-inside:avoid; }
    .cx-comentario h2{ font-size:12.5px; margin:0 0 6px; border:none; padding:0; color:#141b28; text-transform:none; letter-spacing:0; }
    .cx-comentario p{ margin:0; font-size:13.5px; color:#333; }
    .cx-portada-table td, .cx-portada-table th{ padding:10px 13px; }
  </style>`;
}
function cxRubricaBodyHTML(grupo,act,al,opts){
  opts=opts||{};
  const cat=getCatalogo(grupo.catalogoKey);
  const sc=grupo.rubricScores?.[al.id]?.[act.id]||{};
  const vc=grupo.notasCuant?.[al.id]?.[act.id];
  const rubAl=cxRubricaDe(act,al.id);
  const maxTotal=cxMaxTotal(rubAl);
  const comentario=(grupo.examComentarios?.[al.id]?.[act.id]||"").trim();
  const fechaLarga=new Date().toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"});
  const filaItem=it=>{
      const val=sc[it.id];
      const max=Number(it.max)||0;
      const desc=(it.desc&&it.desc.length)?`<div class="cx-item-desc">${it.desc.map(d=>"• "+esc(d)).join("<br>")}</div>`:"";
      return `<tr><td>
          ${it.unico&&!it.label?"":`<div class="cx-item-label">${esc(it.label||"(sin enunciado)")}</div>`}
          ${desc}
          ${(grupo.examComentarios?.[al.id]?.[act.id+"|"+it.id]||"").trim()?`<div class="cx-item-desc" style="font-style:italic">✎ ${esc(grupo.examComentarios[al.id][act.id+"|"+it.id])}</div>`:""}
        </td>
        <td style="text-align:right;white-space:nowrap;vertical-align:top">
          <span class="cx-item-score">${val==null?"—":fmt(Number(val))}</span>
          <small> / ${fmt(max)}</small>
        </td></tr>`;
  };
  // En los apartados "a elegir" se imprime solo lo que ha respondido el alumno/a.
  const nodoHTML=(sec,depth)=>{
    const k=cxElegirEf(sec); const ev=cxEvalNodo(sec,sc); const eleg=new Set(ev.elegidosIds);
    const mostrar=id=> !k || !ev.hay || eleg.has(id);
    const filas=(sec.items||[]).filter(it=>mostrar(it.id)).map(filaItem).join("");
    const subs=(sec.subs||[]).filter(s=>mostrar(s.id)).map(s=>nodoHTML(s,depth+1)).join("");
    const tit=esc(sec.title||CX_NOMBRE_TIPO[sec.tipo]||(depth===0?"Apartado":"Subapartado"));
    const pts=`<span style="float:right;font-weight:600;color:#141b28;text-transform:none;letter-spacing:0">${ev.hay?fmt(ev.pts):"—"} / ${fmt(cxMaxNodo(sec))}</span>`;
    if(depth===0) return `<div class="cx-sec"><h2 style="white-space:pre-wrap${sec.tipo==="pregunta"?";text-transform:none;letter-spacing:0;font-size:13.5px;color:#141b28":""}">${pts}${tit}</h2>${filas?`<table><tbody>${filas}</tbody></table>`:""}${subs}</div>`;
    return `<div style="margin:12px 0 0 ${depth>1?"14px":"0"}"><h3 style="font-size:12.5px;color:#465064;margin:0 0 4px;white-space:pre-wrap">${pts}${tit}</h3>${filas?`<table><tbody>${filas}</tbody></table>`:""}${subs}</div>`;
  };
  const seccionesHtml=(rubAl||[]).map(sec=>nodoHTML(sec,0)).join("");
  return `
    <div${opts.pageBreak?' style="page-break-before:always;break-before:page"':''}>
    ${state.centroNombre?`<div class="cx-letterhead">${esc(state.centroNombre)}</div>`:""}
    <div class="cx-eyebrow">Rúbrica de corrección</div>
    <h1 class="cx-alumno">${esc(al.nombre)}</h1>
    <div class="cx-meta-line">${esc(act.nombre)}<span class="sep">·</span>${esc(cat.materia)} ${esc(cat.curso)}<span class="sep">·</span>Grupo ${esc(grupo.nombre)}<span class="sep">·</span><b>${fechaLarga}</b></div>
    ${seccionesHtml}
    <div class="cx-total-box">
      <div><div class="cx-total-label">Puntuación total</div><div class="cx-total-value">${vc==null?"—":fmt(vc)} <small>/ ${fmt(cxEscalarDe(act,al.id)&&maxTotal>0&&Math.abs(maxTotal-10)>=0.01?10:maxTotal)}</small></div></div>
      <div>${pillCuant(vc)}</div>
    </div>
    ${comentario?`<div class="cx-comentario"><h2>Comentario del profesor/a</h2><p style="white-space:pre-wrap">${esc(comentario)}</p></div>`:""}
    </div>`;
}
window.cxImprimirRubrica=(alId,actId)=>{
  const grupo=grupoActual(); if(!grupo) return;
  const act=grupo.actividades.find(a=>a.id===actId); if(!act||!act.rubrica) return;
  const al=grupo.alumnos.find(a=>a.id===alId); if(!al) return;
  abrirVentanaInforme(`Rúbrica · ${al.nombre} · ${act.nombre}`, cxRubricaPrintCSS()+cxRubricaBodyHTML(grupo,act,al));
};
function cxRubricasPortadaHTML(grupo,act,alumnos){
  const cat=getCatalogo(grupo.catalogoKey);
  const fechaLarga=new Date().toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"});
  const filas=alumnos.map(al=>{
    const vc=grupo.notasCuant?.[al.id]?.[act.id];
    return `<tr><td>${esc(al.nombre)}</td><td style="text-align:right;font-weight:600;white-space:nowrap">${vc==null?"—":fmt(vc)}</td><td>${pillCuant(vc)}</td></tr>`;
  }).join("");
  return `
    <div>
    ${state.centroNombre?`<div class="cx-letterhead">${esc(state.centroNombre)}</div>`:""}
    <div class="cx-eyebrow">Rúbricas de corrección</div>
    <h1 class="cx-portada-titulo">${esc(act.nombre)}</h1>
    <div class="cx-meta-line" style="margin-bottom:8px">${esc(cat.materia)} ${esc(cat.curso)}<span class="sep">·</span>Grupo ${esc(grupo.nombre)}<span class="sep">·</span><b>${fechaLarga}</b></div>
    <p class="cx-sub">${alumnos.length} alumno${alumnos.length===1?"":"s"} corregido${alumnos.length===1?"":"s"}, ordenados alfabéticamente por apellidos. Cada uno ocupa su propia página a continuación de este índice.</p>
    <table class="cx-portada-table"><thead><tr><th>Alumno/a</th><th style="width:70px;text-align:right">Nota</th><th style="width:150px">Calificación</th></tr></thead><tbody>${filas}</tbody></table>
    </div>`;
}
window.cxImprimirRubricasTodos=actId=>{
  const grupo=grupoActual(); if(!grupo) return;
  const act=grupo.actividades.find(a=>a.id===actId); if(!act||!act.rubrica) return;
  const corregidos=grupo.alumnos.filter(al=>grupo.notasCuant?.[al.id]?.[act.id]!=null);
  if(!corregidos.length){ mostrarAviso("Todavía no hay ningún alumno o alumna corregido en este examen."); return; }
  const portada=cxRubricasPortadaHTML(grupo,act,corregidos);
  const partes=corregidos.map(al=>cxRubricaBodyHTML(grupo,act,al,{pageBreak:true}));
  abrirVentanaInforme(`Rúbricas · ${act.nombre}`, cxRubricaPrintCSS()+portada+partes.join(""));
};

/* ---------- Vista de solo-lectura del examen dentro de "Calificar" (Evaluación Competencial) ---------- */
function renderCalificarRubrica(grupo,act,acts){
  const c=document.getElementById("tabContent");
  const critIds=cxCriteriosDeActividad(act);
  const rows=grupo.alumnos.map(al=>{
    const vc=grupo.notasCuant?.[al.id]?.[act.id];
    const crit=critIds.map(cid=>{
      const v=grupo.notas?.[al.id]?.[act.id]?.[cid];
      return `${critLinkHTML(grupo.catalogoKey,cid)} ${v==null?"—":v.toFixed(1)}`;
    }).join(" · ");
    return `<tr><td>${esc(al.nombre)}${neseBadgeHTML(al)}</td><td>${vc==null?"—":fmt(vc)}</td><td style="font-size:12.5px;color:var(--mut)">${crit||"—"}</td></tr>`;
  }).join("");
  c.innerHTML=`<div class="card">
    <h2 style="margin-bottom:12px">Calificar actividad</h2>
    <select class="in" id="calSel" style="margin-bottom:16px;min-width:260px">
      ${acts.map(a=>`<option value="${a.id}" ${a.id===act.id?"selected":""}>${esc(a.nombre)}</option>`).join("")}
    </select>
    <div class="alert-box" style="margin-bottom:14px">🖊️ Este examen se corrige con rúbrica desde el <strong>Corrector de Exámenes</strong>: la nota cuantitativa y la de cada criterio se calculan solas.
      <button class="btn small" onclick="cxAbrirDesdeOtroModo('${act.id}')">Abrir en el Corrector →</button>
    </div>
    <div style="overflow-x:auto"><table><thead><tr><th>Alumno/a</th><th>Nota (0-10)</th><th>Criterios</th></tr></thead><tbody>${rows}</tbody></table></div>
  </div>`;
  document.getElementById("calSel").addEventListener("change",e=>{ state.ui.calAct=e.target.value; save(); render(); });
}

