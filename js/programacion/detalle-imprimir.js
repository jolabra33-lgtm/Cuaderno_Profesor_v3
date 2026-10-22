/* ============================================================================
   Cuaderno del profesor · Detalle de la programación e impresión
   js/programacion/detalle-imprimir.js
   ============================================================================ */

function planTempPanelHTML(p){
  return `
  <div class="card" style="padding:12px 16px">
    <h2 style="font-size:15px;margin:0 0 4px">🗓️ Planificación temporal de la materia</h2>
    <p class="sub" style="margin:0">Calendario, reparto de sesiones por Situación de Aprendizaje y criterios de calificación de "<strong>${esc(p.nombre)}</strong>", con la herramienta de planificación. Se guarda automáticamente junto con el resto de la Programación — no hace falta pulsar ningún botón de guardar.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
      <button class="ghost" style="border:1px solid var(--line)" onclick="planTempImportarSdas('${p.id}')" title="Copia aquí las Situaciones de Aprendizaje que ya tienes en la pestaña Programación, para no escribirlas dos veces">⬇️ Traer situaciones desde la Programación</button>
      <button class="ghost" style="border:1px solid var(--line)" onclick="planTempAplicarAProgramacion('${p.id}')" title="Actualiza (y crea si faltan) las Situaciones de Aprendizaje de la pestaña Programación, con las sesiones y el trimestre calculados aquí">⬆️ Traer situaciones desde la Planificación temporal</button>
    </div>
  </div>`;
}
function progDetalleHTML(root){
  const p=progPorId(state.ui.progId);
  if(!p){ progListaHTML(root); return; }
  const idx=catIndex(p.catalogoKey);
  const cat=idx.cat;
  const porTrim=[0,1,2].map(t=>p.sdas.filter(s=>s.trimestre===t));
  root.innerHTML=`
  <div class="card">
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <button class="ghost" style="border:1px solid var(--line)" onclick="progVolverLista()">← Volver al listado</button>
      <button class="ghost" style="border:1px solid var(--line)" onclick="progImprimir('${p.id}')">🖨️ Imprimir programación</button>
    </div>
    <h2 style="font-size:16px;margin-top:10px">${esc(p.nombre)}</h2>
    <p class="sub" style="margin:0">${esc(cat.materia)} · ${esc(cat.curso)}</p>
    <div class="flex" style="flex-wrap:wrap;gap:10px;margin-top:12px">
      <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1;min-width:140px">Curso escolar
        <input class="in" style="width:100%;margin-top:4px" placeholder="Ej. 2026-2027" value="${esc(p.cursoEscolar||"")}" onchange="progSetCampo('cursoEscolar',this.value)">
      </label>
      <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:2;min-width:200px">Profesor/a que la elabora
        <input class="in" style="width:100%;margin-top:4px" placeholder="Nombre y apellidos" value="${esc(p.profesorNombre||"")}" onchange="progSetCampo('profesorNombre',this.value)">
      </label>
    </div>
  </div>
  <div class="card" style="padding:10px 14px">
    <select class="in" style="font-weight:600;min-width:260px" onchange="progSetDetTab(this.value)">
      <option value="general" ${state.ui.progDetTab==="general"?"selected":""}>📋 Programación (SdA, metodología, recursos…)</option>
      <option value="planificacion" ${state.ui.progDetTab==="planificacion"?"selected":""}>🗓️ Planificación temporal de la materia</option>
    </select>
  </div>
  ${planTempPanelHTML(p)}
  ${state.ui.progDetTab==="planificacion"?`
  <div class="card" style="padding:0;overflow:hidden">
    <div id="planTempWrap" style="height:82vh"></div>
  </div>
  `:`
  <div class="card">
    ${progCabeceraPlegableHTML("recursos","Recursos didácticos",(()=>{ const n=PROG_RECURSOS_OPCIONES.filter(r=>p.recursos[r.id]).length+((p.recursos.otros||"").trim()?1:0); return n?`${n} marcado${n===1?"":"s"}`:"ninguno marcado"; })())}
    ${progPlegado("recursos")?"":`<div style="margin-top:8px">
    <p class="sub" style="margin:0 0 8px">Señala los que vayas a utilizar este curso (sin adjuntar archivos, solo para dejar constancia en la programación).</p>
    <div class="flex" style="flex-wrap:wrap;gap:10px 18px">
      ${PROG_RECURSOS_OPCIONES.map(r=>`<label style="font-size:13px;display:flex;align-items:center;gap:6px">
        <input type="checkbox" ${p.recursos[r.id]?"checked":""} onchange="progToggleRecurso('${r.id}',this.checked)"> ${r.label}
      </label>`).join("")}
    </div>
    <label style="font-size:12.5px;color:var(--mut);font-weight:500;display:block;margin-top:10px">Otros recursos
      <input class="in" style="width:100%;margin-top:4px" placeholder="Ej. cuadernos de campo, prensa local…" value="${esc(p.recursos.otros)}" onchange="progSetRecursoOtros(this.value)">
    </label>
    </div>`}
  </div>
  <div class="card">
    ${progCabeceraPlegableHTML("metodologia","Metodología y criterios de calificación",[["Metodología",p.metodologia],["Cualitativa",p.criteriosCalifCualitativa],["Cuantitativa",p.criteriosCalifCuantitativa]].map(([l,v])=>`${l} ${progRTETieneTexto(v)?"✓":"—"}`).join(" · "))}
    ${progPlegado("metodologia")?"":`<div style="margin-top:8px">
    <p class="sub" style="margin:0 0 8px">Contenido general de la programación, común a todas las Situaciones de Aprendizaje.</p>
    <div style="font-size:12.5px;color:var(--mut);font-weight:500">Metodología
      <div style="margin-top:4px">${progRTEEditorHTML("metodologia",p.metodologia,"Enfoque metodológico, principios pedagógicos, agrupamientos, papel del alumnado y del profesorado…")}</div>
    </div>
    <div class="section-eyebrow" style="margin-top:14px">Criterios de calificación</div>
    <div style="font-size:12.5px;color:var(--mut);font-weight:500;margin-top:8px">Valoración cualitativa
      <div style="margin-top:4px">${progRTEEditorHTML("criteriosCalifCualitativa",p.criteriosCalifCualitativa,"Cómo se valoran los aprendizajes de forma cualitativa (rúbricas, escalas de logro, observación directa…)")}</div>
    </div>
    <div style="font-size:12.5px;color:var(--mut);font-weight:500;margin-top:10px">Valoración cuantitativa
      <div style="margin-top:4px">${progRTEEditorHTML("criteriosCalifCuantitativa",p.criteriosCalifCuantitativa,"Cómo se traduce a una nota numérica (ponderaciones, pesos por instrumento o competencia específica…)")}</div>
    </div>
    </div>`}
  </div>
  ${[0,1,2].map(t=>`
    <button class="home-seccion-header" onclick="progToggleTrim(${t})" aria-expanded="${progTrimAbiertos[t]}" style="margin-top:10px" ondragover="event.preventDefault()" ondrop="progSdaDrop(event,${t},null)">
      <span class="home-seccion-chevron">${progTrimAbiertos[t]?"▾":"▸"}</span>
      <span class="section-eyebrow" style="margin:0">${TRIMESTRES[t]} <span style="font-weight:400;text-transform:none;letter-spacing:0">— ${porTrim[t].length} SdA</span></span>
    </button>
    ${progTrimAbiertos[t]?`
    <div class="prog-sda-dropzone" data-trim="${t}" ondragover="event.preventDefault()" ondrop="progSdaDrop(event,${t},null)">
    ${porTrim[t].map((s,iSub)=>{
      const reales=progSesionesReales_todosGrupos(p,s.id);
      const abierta=!!progSdaAbiertas[s.id];
      return `<div class="card" draggable="true" data-sda-id="${s.id}" ondragstart="progSdaDragStart(event,'${s.id}')" ondragover="event.preventDefault();event.stopPropagation()" ondrop="event.stopPropagation();progSdaDrop(event,${t},'${s.id}')">
        <div class="flex" style="justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center">
          <span style="cursor:grab;color:var(--mut);font-size:17px;user-select:none" title="Arrastra para reordenar o cambiar de trimestre">⠿</span>
          <button class="ghost" style="padding:2px 8px;min-width:0" title="Subir un puesto" ${iSub===0?"disabled":""} onclick="progMoverSda('${s.id}',-1)">▲</button>
          <button class="ghost" style="padding:2px 8px;min-width:0" title="Bajar un puesto" ${iSub===porTrim[t].length-1?"disabled":""} onclick="progMoverSda('${s.id}',1)">▼</button>
          <button class="ghost" style="padding:2px 8px;min-width:0" title="${abierta?"Contraer":"Expandir"}" onclick="progToggleSdaAbierta('${s.id}')">${abierta?"▾":"▸"}</button>
          <input class="in" style="flex:1;min-width:200px;font-weight:600" placeholder="Título de la Situación de Aprendizaje…" value="${esc(s.titulo)}" onchange="progSetSdaCampo('${s.id}','titulo',this.value)">
          <select class="in" style="min-width:140px" onchange="progSetSdaCampo('${s.id}','trimestre',this.value)">
            ${TRIMESTRES.map((tt,i)=>`<option value="${i}" ${s.trimestre===i?"selected":""}>${tt}</option>`).join("")}
          </select>
          ${abierta?"":`<span class="sub" style="font-size:12px;white-space:nowrap">${esc(s.sesionesPrevistas||0)} sesiones${(s.saberesIds||[]).length?` · ${(s.saberesIds||[]).length} saberes`:""}${(s.recursos||[]).length?` · ${(s.recursos||[]).length} recursos`:""}</span>`}
          <button class="ghost danger" onclick="progEliminarSda('${s.id}')">Eliminar</button>
        </div>
        ${abierta?`
        <div class="flex" style="margin-top:10px;flex-wrap:wrap;gap:10px">
          <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1;min-width:140px">Sesiones previstas
            <input type="number" min="0" class="in miniw" style="width:100%;margin-top:4px" value="${esc(s.sesionesPrevistas)}" onchange="progSetSdaCampo('${s.id}','sesionesPrevistas',this.value)">
          </label>
        </div>
        <button class="ghost" style="border:1px solid var(--line);margin-top:8px" onclick="progToggleSaberesAbierto('${s.id}')">${state.ui.progSaberesAbierto===s.id?"Ocultar":"Elegir"} saberes básicos — ${(s.saberesIds||[]).length} marcado${(s.saberesIds||[]).length===1?"":"s"}</button>
        ${state.ui.progSaberesAbierto===s.id?`<div class="scroll" style="margin-top:8px;max-height:320px;overflow-y:auto;border:1px solid var(--line);border-radius:10px;padding:10px">
          ${Object.keys(progSaberesDelCatalogo(p.catalogoKey)).length? idx.cat.ces.map(ce=>{
            const lista=progSaberesDelCatalogo(p.catalogoKey)[ce.id]||[];
            if(!lista.length) return "";
            return `<div style="margin-bottom:10px">
              <div style="font-size:12.5px;font-weight:700;color:var(--ink)">${ce.id}</div>
              <div style="font-size:11.5px;color:var(--mut);margin:1px 0 6px;line-height:1.35">${esc(ce.titulo||"")}</div>
              ${lista.map((texto,i)=>{
                const sid=`${ce.id}#${i}`;
                return `<label style="display:flex;align-items:flex-start;gap:6px;font-size:12.5px;cursor:pointer;padding:2px 4px">
                  <input type="checkbox" style="margin-top:3px" ${(s.saberesIds||[]).includes(sid)?"checked":""} onchange="progToggleSaberSda('${s.id}','${sid}',this.checked)">
                  <span>${esc(texto)}</span>
                </label>`;
              }).join("")}
            </div>`;
          }).join("") : '<p class="sub" style="margin:0">No hay saberes básicos oficiales cargados para este catálogo — usa el campo de abajo.</p>'}
        </div>`:""}
        <label style="font-size:12.5px;color:var(--mut);font-weight:500;display:block;margin-top:10px">Otros saberes / notas (opcional)
          <textarea class="in" style="width:100%;margin-top:4px;min-height:46px;resize:vertical" placeholder="Cualquier saber adicional no listado arriba…" onchange="progSetSdaCampo('${s.id}','saberesOtros',this.value)">${esc(s.saberesOtros||"")}</textarea>
        </label>
        <div class="section-eyebrow" style="margin-top:12px">Recursos de esta SdA</div>
        ${(s.recursos||[]).length? `<div class="grid" style="gap:4px;margin-top:4px">
          ${s.recursos.map(r=>`<div class="flex" style="justify-content:space-between;align-items:center;border:1px solid var(--line);border-radius:8px;padding:6px 10px">
            <a href="${esc(r.enlace)}" target="_blank" rel="noopener" style="font-size:13.5px;text-decoration:underline;color:var(--brand-3)">${recursoIconoTipo(r.nombre,r.enlace)} ${esc(r.nombre||"(sin nombre)")}</a>
            <button class="ghost" style="font-size:12px;padding:3px 8px" onclick="progEliminarRecurso('${s.id}','${r.id}')">🗑️</button>
          </div>`).join("")}
        </div>` : '<p class="sub" style="margin:4px 0 0">Ninguno todavía.</p>'}
        <div class="flex" style="gap:8px;margin-top:8px;flex-wrap:wrap">
          <input class="in" style="flex:1;min-width:160px" id="progRecNombre_${s.id}" placeholder="Nombre (ej. Libro de Texto)">
          <input class="in" style="flex:2;min-width:220px" id="progRecEnlace_${s.id}" placeholder="Enlace (OneDrive, YouTube…)">
          <button class="ghost" style="border:1px solid var(--line)" onclick="progAnadirRecurso('${s.id}')">+ Añadir recurso</button>
        </div>
        <div class="section-eyebrow" style="margin-top:12px">Actividades de esta SdA</div>
        ${(()=>{ const actsSda=p.actividades.filter(a=>(a.sdaIds||[]).includes(s.id)); return actsSda.map((a,iAct)=>progActividadCardHTML(idx,a,p,s.id,iAct,actsSda.length)).join(""); })()}
        <button class="ghost" style="border:1px solid var(--line);margin-top:8px" onclick="progAnadirActividad('${s.id}')">+ Añadir actividad a esta SdA</button>
        `:""}
      </div>`;
    }).join("")}
    </div>
    <button class="ghost" style="border:1px solid var(--line);margin:4px 0 6px" onclick="progAnadirSda(${t})">+ Añadir Situación de Aprendizaje a ${TRIMESTRES[t].toLowerCase()}</button>
    `:""}
  `).join("")}
  <div class="card">
    <div class="section-eyebrow" style="margin:0 0 8px">Actividades sin ninguna SdA asignada</div>
    ${(()=>{ const actsSinSda=p.actividades.filter(a=>!(a.sdaIds||[]).length); return actsSinSda.map((a,iAct)=>progActividadCardHTML(idx,a,p,"",iAct,actsSinSda.length)).join(""); })()||'<p class="sub" style="margin:0">Ninguna.</p>'}
    <button class="ghost" style="border:1px solid var(--line);margin-top:8px" onclick="progAnadirActividad('')">+ Añadir actividad sin SdA</button>
  </div>`}`;
  if(state.ui.progDetTab==="planificacion") planTempMontar(p);
}
function progSesionesReales_todosGrupos(prog,sdaId){
  return (state.grupos||[]).filter(g=>g.programacionId===prog.id).reduce((s,g)=>s+progSesionesReales(g,sdaId),0);
}
function cursoAcademicoActual(){
  const hoy=new Date(); const y=hoy.getFullYear(); const m=hoy.getMonth()+1; // 1-12
  return m>=8 ? `${y}-${y+1}` : `${y-1}-${y}`;
}
// El valor propio de cada Programación manda; si está vacío, se usa el global de
// la aplicación (y, si tampoco lo hay, el curso académico calculado por fecha).
function cursoEscolarEfectivo(prog){
  if(prog && (prog.cursoEscolar||"").trim()) return prog.cursoEscolar.trim();
  if((state.cursoEscolarGlobal||"").trim()) return state.cursoEscolarGlobal.trim();
  return cursoAcademicoActual();
}
function profesorNombreEfectivo(prog){
  if(prog && (prog.profesorNombre||"").trim()) return prog.profesorNombre.trim();
  return (state.profesorNombreGlobal||"").trim();
}
function normativaReferencia(curso){
  const esBach=/Bachillerato/i.test(curso);
  return esBach
    ? "Decreto 108/2022, de 5 de agosto, del Consell (currículo de Bachillerato en la Comunitat Valenciana). LOMLOE (Ley Orgánica 3/2020) y Real Decreto 243/2022, de 5 de abril."
    : "Decreto 107/2022, de 5 de agosto, del Consell (currículo de la ESO en la Comunitat Valenciana). LOMLOE (Ley Orgánica 3/2020) y Real Decreto 217/2022.";
}
function actividadCriteriosAbreviadosHTML(idx,a){
  if(!(a.criterios||[]).length) return "";
  const porCE={};
  a.criterios.forEach(c=>{
    const info=idx.critMap[c.critId]; if(!info) return;
    if(!porCE[info.ceId]) porCE[info.ceId]=[];
    porCE[info.ceId].push(c.critId);
  });
  const partes=Object.keys(porCE).sort().map(ceId=>`${ceId} (${porCE[ceId].sort().join(", ")})`);
  return partes.length? ` — <span style="color:#666">${partes.join(" · ")}</span>` : "";
}
function progLeyendaCEHTML(idx){
  return `
    <h2>Leyenda de competencias específicas y criterios de evaluación</h2>
    <p style="font-size:12px;color:#666;margin:0 0 10px">${esc(normativaReferencia(idx.cat.curso))}</p>
    ${idx.cat.ces.map(ce=>`
      <div style="margin-bottom:10px">
        <p style="font-size:13px;margin:0 0 3px"><strong>${ce.id}.</strong> ${esc(ce.titulo)}</p>
        <ul style="margin:2px 0 0 18px;padding:0">
          ${ce.criterios.map(cr=>`<li style="font-size:12.5px;margin-bottom:2px"><strong>${cr.id}.</strong> ${esc(cr.texto)}</li>`).join("")}
        </ul>
      </div>`).join("")}
  `;
}
function planTempFmtHuman(iso){
  if(!iso) return "—";
  const d=new Date(iso+"T00:00:00");
  if(isNaN(d)) return "—";
  return `${d.getDate()} ${AG_MESES[d.getMonth()]} ${d.getFullYear()}`;
}
function planTempRangeLabel(first,last){
  if(!first||!last) return "";
  const M=AG_MESES;
  if(first.getTime()===last.getTime()) return `${first.getDate()} ${M[first.getMonth()].slice(0,3)} ${first.getFullYear()}`;
  const y1=first.getFullYear(), y2=last.getFullYear(), m1=first.getMonth(), m2=last.getMonth();
  if(y1===y2 && m1===m2) return `${first.getDate()}–${last.getDate()} ${M[m1]} ${y1}`;
  if(y1===y2) return `${first.getDate()} ${M[m1].slice(0,3)} – ${last.getDate()} ${M[m2].slice(0,3)} ${y1}`;
  return `${first.getDate()} ${M[m1].slice(0,3)} ${y1} – ${last.getDate()} ${M[m2].slice(0,3)} ${y2}`;
}
function planTempUnitDateText(u){
  if(!u.dates.length) return "Sin fecha asignada todavía";
  const groups=[];
  u.dates.forEach(d=>{
    const last=groups[groups.length-1];
    if(last && last.trimestre===d.trimestre) last.dates.push(d.date);
    else groups.push({trimestre:d.trimestre, dates:[d.date]});
  });
  const ordTxt={1:"1.º trim.",2:"2.º trim.",3:"3.º trim.",4:"fuera de curso"};
  if(groups.length===1) return planTempRangeLabel(u.dates[0].date, u.dates[u.dates.length-1].date);
  return groups.map(g=>`${planTempRangeLabel(g.dates[0], g.dates[g.dates.length-1])} (${ordTxt[g.trimestre]||g.trimestre})`).join(" · ");
}
function planTempComputeScheduleParaImprimir(pt){
  const parseISO=s=>new Date(s+"T00:00:00");
  const addDays=(d,n)=>{ const r=new Date(d); r.setDate(r.getDate()+n); return r; };
  const start=parseISO(pt.start), t1End=parseISO(pt.t1End), t2End=parseISO(pt.t2End), t3End=parseISO(pt.t3End);
  const totalNeeded=(pt.units||[]).reduce((a,u)=>a+(Number(u.sessions)||0),0);
  const weekdaySet=new Set((pt.weekdays||[]).map(Number));
  const nlRanges=(pt.nonLectivo||[]).map(r=>({start:parseISO(r.start), end:parseISO(r.end)}));
  let sessions=[], cur=new Date(start), guard=0;
  while(sessions.length<totalNeeded && guard<6000){
    guard++;
    if(weekdaySet.has(cur.getDay())){
      const isNL=nlRanges.some(r=>cur>=r.start && cur<=r.end);
      if(!isNL){
        let trimestre;
        if(cur<=t1End) trimestre=1; else if(cur<=t2End) trimestre=2; else if(cur<=t3End) trimestre=3; else trimestre=4;
        sessions.push({date:new Date(cur), trimestre});
      }
    }
    cur=addDays(cur,1);
  }
  let idx=0;
  const unitBlocks=(pt.units||[]).map(u=>{
    const n=Number(u.sessions)||0;
    const block=sessions.slice(idx, idx+n);
    idx+=n;
    return {name:planTempL0(u.name), sessions:n, dates:block};
  });
  return {sessions, unitBlocks, totalNeeded};
}
function planTempImprimirHTML(p){
  const pt=p.planTemp;
  if(!pt || !Array.isArray(pt.units) || !pt.units.length) return "";
  const sched=planTempComputeScheduleParaImprimir(pt);
  const filas=sched.unitBlocks.map(u=>{
    const trims=[...new Set(u.dates.map(d=>d.trimestre))];
    const trimTxt=trims.map(tr=>({1:"1.º",2:"2.º",3:"3.º",4:"Fuera de curso"}[tr]||tr)).join(", ")||"—";
    return `<tr><td>${esc(u.name||"(sin nombre)")}</td><td>${u.sessions}</td><td>${esc(planTempUnitDateText(u))}</td><td>${esc(trimTxt)}</td></tr>`;
  }).join("");
  return `
    <h2>Planificación temporal de la materia</h2>
    <table style="margin-bottom:10px">
      <thead><tr><th>Inicio de curso</th><th>1er trimestre hasta</th><th>2.º trimestre hasta</th><th>3er trimestre hasta</th></tr></thead>
      <tbody><tr>
        <td>${esc(planTempFmtHuman(pt.start))}</td>
        <td>${esc(planTempFmtHuman(pt.t1End))}</td>
        <td>${esc(planTempFmtHuman(pt.t2End))}</td>
        <td>${esc(planTempFmtHuman(pt.t3End))}</td>
      </tr></tbody>
    </table>
    <table>
      <thead><tr><th>Situación de aprendizaje</th><th>Sesiones</th><th>Fechas previstas</th><th>Trimestre</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
  `;
}
window.progImprimir=(id)=>{
  const p=progPorId(id); if(!p) return;
  const idx=catIndex(p.catalogoKey);
  const saberesCat=progSaberesDelCatalogo(p.catalogoKey);
  const textoSaber=sid=>{ const [ceId,i]=sid.split("#"); const lista=saberesCat[ceId]; return lista&&lista[Number(i)]; };
  const filasTrim=t=>{
    const sdas=p.sdas.filter(s=>s.trimestre===t);
    if(!sdas.length) return '<p style="color:#999;font-style:italic">Sin Situaciones de Aprendizaje.</p>';
    return sdas.map(s=>{
      const acts=p.actividades.filter(a=>(a.sdaIds||[]).includes(s.id));
      const actsHTML=acts.length? `<ul style="margin:4px 0 0 18px">${acts.map(a=>`<li>${esc(a.nombre||"(sin nombre)")} — ${esc(a.tipo)}${a.esExamen?" (examen)":""}${actividadCriteriosAbreviadosHTML(idx,a)}</li>`).join("")}</ul>` : '<p style="color:#999;font-style:italic;margin:2px 0">Sin actividades.</p>';
      const saberesTextos=(s.saberesIds||[]).map(textoSaber).filter(Boolean);
      const saberesHTML = saberesTextos.length? `<ul style="margin:4px 0 0 18px">${saberesTextos.map(t2=>`<li>${esc(t2)}</li>`).join("")}</ul>` : "";
      const recursosHTML = (s.recursos||[]).length? `<p style="font-size:13px;margin:6px 0 0"><strong>Recursos:</strong></p><ul style="margin:4px 0 0 18px">${s.recursos.map(r=>`<li>${recursoIconoTipo(r.nombre,r.enlace)} <a href="${esc(r.enlace)}">${esc(r.nombre||"(sin nombre)")}</a></li>`).join("")}</ul>` : "";
      return `<div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e5e5e5">
        <h3 style="margin:0 0 6px">${esc(s.titulo||"(sin título)")}</h3>
        <p style="font-size:12px;color:#666;margin:0 0 6px">Sesiones previstas: ${esc(s.sesionesPrevistas)||"—"}</p>
        ${saberesHTML||s.saberesOtros?`<p style="font-size:13px;margin:6px 0 0"><strong>Saberes básicos:</strong></p>${saberesHTML}${s.saberesOtros?`<p style="font-size:13px;margin:4px 0 0">${esc(s.saberesOtros)}</p>`:""}`:""}
        ${recursosHTML}
        <p style="font-size:13px;margin:6px 0 0"><strong>Actividades:</strong></p>
        ${actsHTML}
      </div>`;
    }).join("");
  };
  const recursosMarcados=PROG_RECURSOS_OPCIONES.filter(r=>p.recursos&&p.recursos[r.id]);
  const hayRecursos = recursosMarcados.length||(p.recursos&&p.recursos.otros);
  const recursosHTML = hayRecursos ? `
    <h2>Recursos didácticos</h2>
    ${recursosMarcados.length?`<ul style="margin:4px 0 0 18px">${recursosMarcados.map(r=>`<li>${esc(r.label)}</li>`).join("")}</ul>`:""}
    ${p.recursos&&p.recursos.otros?`<p style="font-size:13px;margin:6px 0 0">${esc(p.recursos.otros)}</p>`:""}
  ` : "";
  const textoPlano=html=>{ const t=document.createElement("div"); t.innerHTML=html||""; return (t.textContent||"").trim(); };
  const hayMetodologia=textoPlano(p.metodologia);
  const hayCriteriosCalif=textoPlano(p.criteriosCalifCualitativa)||textoPlano(p.criteriosCalifCuantitativa);
  const metodologiaCalifHTML = (hayMetodologia||hayCriteriosCalif) ? `
    ${hayMetodologia?`<h2>Metodología</h2><div style="font-size:13px">${progSanitizarHTML(p.metodologia)}</div>`:""}
    ${hayCriteriosCalif?`<h2>Criterios de calificación</h2>
      ${textoPlano(p.criteriosCalifCualitativa)?`<h3>Valoración cualitativa</h3><div style="font-size:13px">${progSanitizarHTML(p.criteriosCalifCualitativa)}</div>`:""}
      ${textoPlano(p.criteriosCalifCuantitativa)?`<h3>Valoración cuantitativa</h3><div style="font-size:13px">${progSanitizarHTML(p.criteriosCalifCuantitativa)}</div>`:""}
    `:""}
  ` : "";
  const indiceItems=["Leyenda de competencias específicas y criterios de evaluación"];
  if(hayRecursos) indiceItems.push("Recursos didácticos");
  if(hayMetodologia) indiceItems.push("Metodología");
  if(hayCriteriosCalif) indiceItems.push("Criterios de calificación");
  const planTempHTML=planTempImprimirHTML(p);
  if(planTempHTML) indiceItems.push("Planificación temporal de la materia");
  [0,1,2].forEach(t=>indiceItems.push(TRIMESTRES[t]));
  const portada=`
    <div style="min-height:85vh;display:flex;flex-direction:column;justify-content:center;page-break-after:always">
      <div style="background:linear-gradient(135deg,#152a44,#25456b);color:#fff;padding:26px 30px;border-radius:12px;text-align:center">
        <div style="font-size:1.15rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em">${esc(state.centroNombre)||"Programación de Aula"}</div>
        ${state.centroCodigo?`<div style="font-size:.8rem;color:rgba(255,255,255,.7);margin-top:2px">Cód. Centro: ${esc(state.centroCodigo)}</div>`:""}
        <div style="margin-top:22px;font-size:1.6rem;font-weight:700">${esc(p.nombre)}</div>
        <div style="font-size:1rem;color:rgba(255,255,255,.9);margin-top:8px">${esc(idx.cat.materia)} · ${esc(idx.cat.curso)}</div>
        <div style="font-size:.95rem;color:rgba(255,255,255,.85);margin-top:14px">Curso escolar: <strong>${esc(cursoEscolarEfectivo(p))}</strong></div>
        <div style="font-size:.95rem;color:rgba(255,255,255,.85);margin-top:4px">${profesorNombreEfectivo(p)?`Elaborada por: <strong>${esc(profesorNombreEfectivo(p))}</strong>`:""}</div>
      </div>
      <div style="margin-top:40px">
        <h2 style="border-bottom:1px solid #ccc;padding-bottom:6px">Índice</h2>
        <ul style="list-style:none;padding:0;margin:10px 0 0">
          ${indiceItems.map(t=>`<li style="padding:6px 0;border-bottom:1px dotted #ccc;font-size:14px">${esc(t)}</li>`).join("")}
        </ul>
      </div>
    </div>`;
  const body=`
    <style>
      body{text-align:justify}
      h1,h2,h3,.meta,ul,li,table{text-align:left}
      @page{ margin:2cm 1.6cm 2.2cm 1.6cm; @bottom-center{ content:"Página " counter(page) " de " counter(pages); font-size:10px; color:#777; } }
    </style>
    ${portada}
    ${progLeyendaCEHTML(idx)}
    ${recursosHTML}
    ${metodologiaCalifHTML}
    ${planTempHTML}
    ${[0,1,2].map(t=>`<h2>${TRIMESTRES[t]}</h2>${filasTrim(t)}`).join("")}
    <div style="margin-top:40px;display:flex;justify-content:flex-end">
      <div style="text-align:center;font-size:13px;color:#444">
        <div style="border-top:1px solid #999;padding-top:6px;min-width:220px">Fdo.: ______________________________</div>
        <div style="margin-top:4px;color:#777">Fecha: ____ / ____ / ________</div>
      </div>
    </div>
  `;
  abrirVentanaInforme(`Programación de Aula — ${p.nombre}`, body);
};
