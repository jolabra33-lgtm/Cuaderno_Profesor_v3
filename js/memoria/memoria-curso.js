/* ============================================================================
   Cuaderno del profesor · Memoria de curso
   js/memoria/memoria-curso.js
   ============================================================================ */

/* =================================================================
   MEMORIA DE CURSO — sección independiente que junta TODOS los grupos
   a la vez: resultados, asistencia, convivencia y SdA, por trimestre o
   para el curso completo. La valoración de cada grupo reutiliza el
   mismo campo que ya tiene en Resumen (una sola fuente, no dos copias).
   En la memoria final, además, la evolución de cada grupo a lo largo
   del curso (nunca comparando un grupo con otro).
   ================================================================= */
function memoriaMetricasGrupo(grupo,periodo){
  // periodo: 0,1,2 (trimestre) o "curso" (curso completo)
  const rf=resumenAprobados(grupo, periodo==="curso"?"final":periodo);
  let desde="2000-01-01", hasta="2099-12-31", sinFechas=false;
  if(periodo!=="curso"){
    const ft=grupo.fechasTrimestre&&grupo.fechasTrimestre[periodo];
    if(ft&&ft.inicio&&ft.fin){ desde=ft.inicio; hasta=ft.fin; } else sinFechas=true;
  }
  const asis={falta_justificada:0,falta_no_justificada:0,retraso:0};
  const conv={ac:0,rc:0,pa:0};
  grupo.alumnos.forEach(al=>{
    const a=asistContarPeriodo(grupo,al.id,desde,hasta);
    asis.falta_justificada+=a.falta_justificada||0; asis.falta_no_justificada+=a.falta_no_justificada||0; asis.retraso+=a.retraso||0;
    const c=convContarTipos(grupo,al.id,desde,hasta);
    conv.ac+=c.ac||0; conv.rc+=c.rc||0; conv.pa+=c.pa||0;
  });
  const sda=sdaResumenGrupo(grupo, periodo==="curso"?"curso":periodo);
  const nese=grupo.alumnos.filter(a=>a.nese).length;
  const repetidores=grupo.alumnos.filter(a=>a.repetidor).length;
  const problematica=grupo.alumnos.filter(a=>a.nese||a.repetidor).length;
  return {aprobados:rf, asistencia:asis, convivencia:conv, sda, nese, repetidores, problematica, sinFechas};
}
function svgBarrasMultiserie(categorias,series,opts){
  opts=opts||{};
  const ancho=opts.ancho||270, alto=opts.alto||130, padIzq=6, padInf=20, padSup=16;
  const areaAncho=ancho-padIzq-8, areaAlto=alto-padInf-padSup;
  const maxValor=Math.max(1,...series.flatMap(s=>s.valores));
  const grupoAncho=areaAncho/categorias.length;
  const barraAncho=(grupoAncho*0.6)/series.length;
  let out="";
  categorias.forEach((cat,ci)=>{
    const xGrupo=padIzq+ci*grupoAncho+grupoAncho*0.2;
    series.forEach((s,si)=>{
      const v=s.valores[ci]||0;
      const h=maxValor?areaAlto*(v/maxValor):0;
      const x=xGrupo+si*barraAncho;
      const y=padSup+areaAlto-h;
      out+=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(barraAncho*0.8).toFixed(1)}" height="${Math.max(h,1.5).toFixed(1)}" rx="2" fill="${s.color}"/>`;
      if(v>0) out+=`<text x="${(x+barraAncho*0.4).toFixed(1)}" y="${(y-3).toFixed(1)}" font-size="9" text-anchor="middle" fill="${s.color}" font-weight="700">${v}</text>`;
    });
    out+=`<text x="${(padIzq+ci*grupoAncho+grupoAncho/2).toFixed(1)}" y="${alto-5}" font-size="10.5" text-anchor="middle" fill="#8a94a3">${esc(cat)}</text>`;
  });
  out+=`<line x1="${padIzq}" y1="${padSup+areaAlto}" x2="${ancho-4}" y2="${padSup+areaAlto}" stroke="#e0e0e0" stroke-width="1"/>`;
  const leyenda=series.map(s=>`<span style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;color:#666;margin-right:10px"><span style="width:9px;height:9px;border-radius:2px;background:${s.color};display:inline-block"></span>${esc(s.nombre)}</span>`).join("");
  return `<svg width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}" style="max-width:100%">${out}</svg><div style="margin-top:2px">${leyenda}</div>`;
}
function svgLineaEvolucion(categorias,valores){
  const ancho=270, alto=110, padIzq=16, padDer=16, padSup=18, padInf=22;
  const areaAncho=ancho-padIzq-padDer, areaAlto=alto-padSup-padInf;
  const maxV=100;
  const paso=areaAncho/Math.max(1,categorias.length-1);
  const puntos=valores.map((v,i)=>({x:padIzq+i*paso, y: v==null?null:padSup+areaAlto*(1-v/maxV), v}));
  const validos=puntos.filter(p=>p.y!=null);
  let path="",area="";
  if(validos.length){
    path=validos.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    area=`M${validos[0].x.toFixed(1)},${(padSup+areaAlto).toFixed(1)} ${path} L${validos[validos.length-1].x.toFixed(1)},${(padSup+areaAlto).toFixed(1)} Z`;
  }
  const marcas=puntos.map((p,i)=> p.y==null?`<text x="${p.x.toFixed(1)}" y="${alto-5}" font-size="10.5" text-anchor="middle" fill="#8a94a3">${esc(categorias[i])}</text>`:`
    <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="#b3893a"/>
    <text x="${p.x.toFixed(1)}" y="${(p.y-8).toFixed(1)}" font-size="10.5" text-anchor="middle" fill="#b3893a" font-weight="700">${p.v}%</text>
    <text x="${p.x.toFixed(1)}" y="${alto-5}" font-size="10.5" text-anchor="middle" fill="#8a94a3">${esc(categorias[i])}</text>`).join("");
  return `<svg width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}" style="max-width:100%">
    <line x1="${padIzq}" y1="${padSup+areaAlto}" x2="${ancho-padDer}" y2="${padSup+areaAlto}" stroke="#e0e0e0" stroke-width="1"/>
    ${area?`<path d="${area}" fill="#d7b463" fill-opacity="0.16"/>`:""}
    ${path?`<path d="${path}" fill="none" stroke="#b3893a" stroke-width="2.2"/>`:""}
    ${marcas}
  </svg>`;
}
function memoriaEvolucionGrupoHTML(grupo){
  const m=[0,1,2].map(t=>memoriaMetricasGrupo(grupo,t));
  const pctAprob=m.map(x=> x.aprobados.total-x.aprobados.sc>0 ? Math.round(x.aprobados.ap/(x.aprobados.total-x.aprobados.sc)*100) : null);
  const cats=["1ª ev.","2ª ev.","3ª ev."];
  let html=`<div class="flex" style="gap:20px;flex-wrap:wrap;align-items:flex-start;margin-top:10px">
    <div><div style="font-size:12px;color:var(--mut);font-weight:600;margin-bottom:4px">% Aprobados (sobre calificados)</div>${svgLineaEvolucion(cats,pctAprob)}</div>
    <div><div style="font-size:12px;color:var(--mut);font-weight:600;margin-bottom:4px">Asistencia</div>${svgBarrasMultiserie(cats,[
      {nombre:"Just.",color:"#2563eb",valores:m.map(x=>x.asistencia.falta_justificada)},
      {nombre:"No just.",color:"#c62839",valores:m.map(x=>x.asistencia.falta_no_justificada)},
      {nombre:"Retraso",color:"#a3620a",valores:m.map(x=>x.asistencia.retraso)},
    ])}</div>
    <div><div style="font-size:12px;color:var(--mut);font-weight:600;margin-bottom:4px">Convivencia</div>${svgBarrasMultiserie(cats,[
      {nombre:"AC",color:"#c62839",valores:m.map(x=>x.convivencia.ac)},
      {nombre:"RC",color:"#16a34a",valores:m.map(x=>x.convivencia.rc)},
      {nombre:"PA",color:"#a3620a",valores:m.map(x=>x.convivencia.pa)},
    ])}</div>
  </div>`;
  return html;
}
/* ---- Perfil competencial del grupo (radar), reutilizando svgRadarCC ya usado en Resultados ---- */
function graficoRadarCCGrupoHTML(grupo,periodo){
  if(!grupo.alumnos.length) return "";
  const idx=catIndex(grupo.catalogoKey);
  const ccList=Object.keys(COMP_CLAVE).filter(cc=>idx.cat.ces.some(ce=>ce.cc.includes(cc)));
  const ejes=ccList.map(cc=>{
    const valores=grupo.alumnos.map(al=> periodo==="curso"?scoreCCAnual(grupo,al.id,cc):conTrim(periodo,()=>scoreCC(grupo,al.id,cc))).filter(v=>v!=null);
    const media=valores.length? valores.reduce((a,b)=>a+b,0)/valores.length : null;
    return {label:cc,value:media};
  });
  if(ejes.filter(e=>e.value!=null).length<3) return "";
  return svgRadarCC(ejes);
}
function memoriaResumenGrupoHTML(grupo,periodo,opts){
  opts=opts||{};
  const m=memoriaMetricasGrupo(grupo,periodo);
  const pctAprob = (m.aprobados.total-m.aprobados.sc)>0 ? Math.round(m.aprobados.ap/(m.aprobados.total-m.aprobados.sc)*100) : null;
  const propuesta = periodo==="curso" ? (grupo.propuestasMejoraFinal||"") : (grupo.propuestasMejora[periodo]||"");
  const radar=graficoRadarCCGrupoHTML(grupo,periodo);
  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-top:8px">
      <div><div style="font-size:11.5px;color:var(--mut)">Aprobados</div><div style="font-size:18px;font-weight:700">${pctAprob==null?"—":pctAprob+"%"}</div><div style="font-size:11px;color:var(--mut)">${m.aprobados.ap} de ${m.aprobados.total-m.aprobados.sc} calificados</div></div>
      <div><div style="font-size:11.5px;color:var(--mut)">Faltas</div><div style="font-size:18px;font-weight:700">${m.asistencia.falta_justificada+m.asistencia.falta_no_justificada}</div><div style="font-size:11px;color:var(--mut)">${m.asistencia.falta_justificada} just. · ${m.asistencia.falta_no_justificada} no just. · ${m.asistencia.retraso} retr.</div></div>
      <div><div style="font-size:11.5px;color:var(--mut)">Convivencia</div><div style="font-size:18px;font-weight:700">${m.convivencia.ac+m.convivencia.rc+m.convivencia.pa}</div><div style="font-size:11px;color:var(--mut)">${m.convivencia.ac} AC · ${m.convivencia.rc} RC · ${m.convivencia.pa} PA</div></div>
      <div><div style="font-size:11.5px;color:var(--mut)">SdA impartidas</div><div style="font-size:18px;font-weight:700">${m.sda?m.sda.impartidas+"/"+m.sda.total:"—"}</div><div style="font-size:11px;color:var(--mut)">${m.sda?"":"sin Programación vinculada"}</div></div>
      <div><div style="font-size:11.5px;color:var(--mut)">NESE / Repetidor</div><div style="font-size:18px;font-weight:700">${m.nese} / ${m.repetidores}</div><div style="font-size:11px;color:var(--mut)">${m.problematica} con problemática</div></div>
    </div>
    ${radar?`<div class="section-eyebrow" style="margin-top:16px">Perfil competencial del grupo</div><div style="max-width:300px;border:1px solid var(--line);border-radius:12px;padding:12px;background:${opts.print?'#fff':'var(--card)'}">${radar}</div>`:""}
    ${!opts.print?`<label style="font-size:12px;color:var(--mut);font-weight:500;display:block;margin-top:10px">Valoración de este grupo ${periodo==="curso"?"(evaluación final / memoria de curso)":`(${TRIMESTRES[periodo]})`} <span style="font-weight:400">— el mismo campo que en Resumen</span>
      <textarea class="in" style="width:100%;margin-top:4px;min-height:60px;resize:vertical" onchange="${periodo==='curso'?`setPropuestaMejoraFinal(this.value)`:`memoriaSetPropuestaTrim('${grupo.id}',${periodo},this.value)`}" data-memgrupo="${grupo.id}">${esc(propuesta)}</textarea>
    </label>`:`<div style="margin-top:10px"><strong style="font-size:12.5px">Valoración:</strong> <span style="font-size:13px">${propuesta?esc(propuesta):"<em style=color:#999>Sin registrar.</em>"}</span></div>`}
    ${periodo==="curso"?`<div class="section-eyebrow" style="margin-top:14px">Evolución a lo largo del curso</div>${memoriaEvolucionGrupoHTML(grupo)}`:""}
  `;
}
window.memoriaSetPropuestaTrim=(grupoId,trim,valor)=>{
  const g=(state.grupos||[]).find(x=>x.id===grupoId); if(!g) return;
  if(!Array.isArray(g.propuestasMejora)) g.propuestasMejora=["","",""];
  g.propuestasMejora[trim]=valor; save();
};
window.memoriaSetPeriodo=(v)=>{ state.ui.memoriaPeriodo=v; save(); render(); };
function renderMemoriaApp(){
  const app=document.getElementById("app");
  const periodo = state.ui.memoriaPeriodo==="curso" ? "curso" : Number(state.ui.memoriaPeriodo);
  const grupos=state.grupos||[];
  const totales={ap:0,su:0,sc:0,total:0, falta_justificada:0,falta_no_justificada:0,retraso:0, ac:0,rc:0,pa:0, nese:0,repetidores:0,problematica:0};
  grupos.forEach(g=>{
    const m=memoriaMetricasGrupo(g,periodo);
    totales.ap+=m.aprobados.ap; totales.su+=m.aprobados.su; totales.sc+=m.aprobados.sc; totales.total+=m.aprobados.total;
    totales.falta_justificada+=m.asistencia.falta_justificada; totales.falta_no_justificada+=m.asistencia.falta_no_justificada; totales.retraso+=m.asistencia.retraso;
    totales.ac+=m.convivencia.ac; totales.rc+=m.convivencia.rc; totales.pa+=m.convivencia.pa;
    totales.nese+=m.nese; totales.repetidores+=m.repetidores; totales.problematica+=m.problematica;
  });
  const pctAprobTotal = (totales.total-totales.sc)>0 ? Math.round(totales.ap/(totales.total-totales.sc)*100) : null;
  app.innerHTML=`<div class="card" style="padding:12px 16px">
    <div class="flex" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div><strong style="font-size:15px">📄 Memoria de curso</strong><span style="color:var(--mut);font-size:13px"> · todos tus grupos juntos</span></div>
      <div class="flex">
        <select class="in" onchange="memoriaSetPeriodo(this.value)">
          <option value="0" ${periodo===0?"selected":""}>1ª evaluación</option>
          <option value="1" ${periodo===1?"selected":""}>2ª evaluación</option>
          <option value="2" ${periodo===2?"selected":""}>3ª evaluación</option>
          <option value="curso" ${periodo==="curso"?"selected":""}>Memoria final (curso completo)</option>
        </select>
        <button class="ghost" style="border:1px solid var(--line)" onclick="memoriaImprimir()">🖨️ Imprimir memoria</button>
        <button class="ghost" style="border:1px solid var(--line)" onclick="irInicio()">🏠 Inicio</button>
      </div>
    </div>
  </div>
  <div id="memoriaRoot"></div>`;
  const root=document.getElementById("memoriaRoot");
  if(!grupos.length){ root.innerHTML=`<div class="card"><p class="sub" style="margin:0">Todavía no tienes ningún grupo creado.</p></div>`; return; }
  root.innerHTML=`
  <div class="card" style="border-color:var(--accent)">
    <h2 style="font-size:15.5px">Totales de todos los grupos${periodo==="curso"?" · curso completo":" · "+TRIMESTRES[periodo]}</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:8px">
      <div><div style="font-size:12px;color:var(--mut)">Alumnado total</div><div style="font-size:20px;font-weight:700">${totales.total}</div></div>
      <div><div style="font-size:12px;color:var(--mut)">% Aprobados</div><div style="font-size:20px;font-weight:700">${pctAprobTotal==null?"—":pctAprobTotal+"%"}</div></div>
      <div><div style="font-size:12px;color:var(--mut)">Faltas (just. / no just. / retrasos)</div><div style="font-size:20px;font-weight:700">${totales.falta_justificada} / ${totales.falta_no_justificada} / ${totales.retraso}</div></div>
      <div><div style="font-size:12px;color:var(--mut)">Convivencia (AC / RC / PA)</div><div style="font-size:20px;font-weight:700">${totales.ac} / ${totales.rc} / ${totales.pa}</div></div>
      <div><div style="font-size:12px;color:var(--mut)">NESE / Repetidor / Problemática</div><div style="font-size:20px;font-weight:700">${totales.nese} / ${totales.repetidores} / ${totales.problematica}</div></div>
    </div>
  </div>
  ${grupos.map(g=>{ const cat=getCatalogo(g.catalogoKey); return `
    <div class="card">
      <h2 style="font-size:15px">${esc(g.nombre)} <span class="sub" style="font-weight:400">· ${esc(cat.materia)} · ${esc(cat.curso)}</span></h2>
      ${memoriaResumenGrupoHTML(g,periodo)}
    </div>`;
  }).join("")}`;
}
window.memoriaImprimir=()=>{
  const periodo = state.ui.memoriaPeriodo==="curso" ? "curso" : Number(state.ui.memoriaPeriodo);
  const grupos=state.grupos||[];
  const tituloPeriodo = periodo==="curso" ? "Memoria final de curso" : `Memoria de la ${TRIMESTRES[periodo]}`;
  const indiceItems=["Totales de todos los grupos", ...grupos.map(g=>g.nombre)];
  const portada=`
    <div style="min-height:85vh;display:flex;flex-direction:column;justify-content:center;page-break-after:always">
      <div style="background:linear-gradient(135deg,#152a44,#25456b);color:#fff;padding:26px 30px;border-radius:12px;text-align:center">
        <div style="font-size:1.15rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em">${esc(state.centroNombre)||"Memoria de curso"}</div>
        ${state.centroCodigo?`<div style="font-size:.8rem;color:rgba(255,255,255,.7);margin-top:2px">Cód. Centro: ${esc(state.centroCodigo)}</div>`:""}
        <div style="margin-top:22px;font-size:1.6rem;font-weight:700">${esc(tituloPeriodo)}</div>
        <div style="font-size:1rem;color:rgba(255,255,255,.9);margin-top:8px">Curso escolar ${esc(cursoEscolarEfectivo(null))}</div>
        ${profesorNombreEfectivo(null)?`<div style="font-size:.95rem;color:rgba(255,255,255,.85);margin-top:4px">Elaborada por: <strong>${esc(profesorNombreEfectivo(null))}</strong></div>`:""}
      </div>
      <div style="margin-top:40px">
        <h2 style="border-bottom:1px solid #ccc;padding-bottom:6px">Índice</h2>
        <ul style="list-style:none;padding:0;margin:10px 0 0">
          ${indiceItems.map(t=>`<li style="padding:6px 0;border-bottom:1px dotted #ccc;font-size:14px">${esc(t)}</li>`).join("")}
        </ul>
      </div>
    </div>`;
  const totales={ap:0,su:0,sc:0,total:0, falta_justificada:0,falta_no_justificada:0,retraso:0, ac:0,rc:0,pa:0, nese:0,repetidores:0,problematica:0};
  grupos.forEach(g=>{
    const m=memoriaMetricasGrupo(g,periodo);
    totales.ap+=m.aprobados.ap; totales.su+=m.aprobados.su; totales.sc+=m.aprobados.sc; totales.total+=m.aprobados.total;
    totales.falta_justificada+=m.asistencia.falta_justificada; totales.falta_no_justificada+=m.asistencia.falta_no_justificada; totales.retraso+=m.asistencia.retraso;
    totales.ac+=m.convivencia.ac; totales.rc+=m.convivencia.rc; totales.pa+=m.convivencia.pa;
    totales.nese+=m.nese; totales.repetidores+=m.repetidores; totales.problematica+=m.problematica;
  });
  const pctAprobTotal=(totales.total-totales.sc)>0?Math.round(totales.ap/(totales.total-totales.sc)*100):null;
  const body=`
    <style>
      body{text-align:justify}
      h1,h2,h3,.meta,ul,li,table{text-align:left}
      @page{ margin:2cm 1.6cm 2.2cm 1.6cm; @bottom-center{ content:"Página " counter(page) " de " counter(pages); font-size:10px; color:#777; } }
    </style>
    ${portada}
    <h2>Totales de todos los grupos</h2>
    <table><tbody>
      <tr><th style="width:220px">Alumnado total</th><td>${totales.total}</td></tr>
      <tr><th>% Aprobados</th><td>${pctAprobTotal==null?"—":pctAprobTotal+"%"} (${totales.ap} de ${totales.total-totales.sc} calificados)</td></tr>
      <tr><th>Faltas justificadas / no justificadas / retrasos</th><td>${totales.falta_justificada} / ${totales.falta_no_justificada} / ${totales.retraso}</td></tr>
      <tr><th>Convivencia — AC / RC / PA</th><td>${totales.ac} / ${totales.rc} / ${totales.pa}</td></tr>
      <tr><th>NESE / Repetidor / Con problemática</th><td>${totales.nese} / ${totales.repetidores} / ${totales.problematica}</td></tr>
    </tbody></table>
    ${grupos.map(g=>{ const cat=getCatalogo(g.catalogoKey); return `<h2>${esc(g.nombre)} — ${esc(cat.materia)} · ${esc(cat.curso)}</h2>${memoriaResumenGrupoHTML(g,periodo,{print:true})}`; }).join("")}
    <div style="margin-top:40px;display:flex;justify-content:flex-end">
      <div style="text-align:center;font-size:13px;color:#444">
        <div style="border-top:1px solid #999;padding-top:6px;min-width:220px">Fdo.: ______________________________</div>
        <div style="margin-top:4px;color:#777">Fecha: ____ / ____ / ________</div>
      </div>
    </div>
  `;
  abrirVentanaInforme(tituloPeriodo, body);
};
