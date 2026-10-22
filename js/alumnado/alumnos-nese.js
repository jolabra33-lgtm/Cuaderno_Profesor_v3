/* ============================================================================
   Cuaderno del profesor · Alumnado NESE: plan de seguimiento curricular adaptado
   js/alumnado/alumnos-nese.js
   ============================================================================ */

/* =================================================================
   ALUMNOS NESE — plan de seguimiento curricular adaptado para
   alumnado NESE, organizado por grupo. Cada plan copia uno de los
   3 modelos de NESE_MODELOS (según ciclo elegido) y se rellena con
   I/P/A por trimestre. Vive en state.planesNESE (top-level, se
   incluye solo con Exportar/Importar copia).
   ================================================================= */
const NE_VALORES=[
  {id:"",label:"—"},
  {id:"I",label:"Iniciado"},
  {id:"P",label:"En proceso"},
  {id:"A",label:"Alcanzado"}
];
function neValorColor(v){ return v==="A"?"#16a34a":v==="P"?"#b45309":v==="I"?"#2563eb":"var(--mut)"; }
function neAlumno(p){ const g=state.grupos.find(x=>x.id===p.grupoId); if(!g) return null; const al=g.alumnos.find(x=>x.id===p.alumnoId); return al?{al,g}:null; }
function neNombre(p){ const alV=neAlumno(p); return alV?alV.al.nombre:(p.alumnoNombre||"(sin asignar)"); }
function neCicloSugerido(al){
  const n=al.neseNivel||"";
  if(["1º de Primaria","2º de Primaria"].includes(n)) return "1";
  if(["3º de Primaria","4º de Primaria"].includes(n)) return "2";
  if(["5º de Primaria","6º de Primaria"].includes(n)) return "3";
  if(n==="1º de ESO") return "4";
  if(n==="2º de ESO") return "5";
  if(n==="Altas Capacidades") return "altas";
  return "";
}
function nePlanDe(alumnoId){ return (state.planesNESE||[]).find(p=>p.alumnoId===alumnoId); }
function neResumenPlan(p){
  let i=0,pr=0,a=0;
  (p.filas||[]).forEach(f=>{ [f.v1,f.v2,f.v3].forEach(v=>{ if(v==="I")i++; else if(v==="P")pr++; else if(v==="A")a++; }); });
  return {i,pr,a};
}
window.neTab=k=>{ state.ui.neTab=k; if(k==="lista") state.ui.neId=""; save(); render(); };
window.neIrLista=()=>{ state.ui.neTab="lista"; state.ui.neId=""; save(); render(); };
window.neAbrirDetalle=id=>{ state.ui.neTab="detalle"; state.ui.neId=id; save(); render(); };
window.neAbrirDesdeOtroModo=id=>{ state.ui.appMode="nese"; state.ui.neTab="detalle"; state.ui.neId=id; save(); render(); };
window.neAbrirModalCrear=(grupoId,alumnoId)=>{ state.ui.neModalCrear={grupoId,alumnoId}; save(); render(); };
window.neCerrarModalCrear=()=>{ state.ui.neModalCrear=null; save(); render(); };

function renderNeseApp(){
  const app=document.getElementById("app");
  app.innerHTML=`<div class="card" style="padding:12px 16px">
    <div class="flex" style="justify-content:space-between">
      <div><strong style="font-size:15px">🧩 Alumnos NESE</strong><span style="color:var(--mut);font-size:13px"> · seguimiento curricular adaptado</span></div>
      <button class="ghost" style="border:1px solid var(--line)" onclick="irInicio()">🏠 Inicio</button>
    </div>
  </div><div id="neRoot"></div>`;
  const root=document.getElementById("neRoot");
  if(state.ui.neTab==="detalle" && state.ui.neId && (state.planesNESE||[]).find(p=>p.id===state.ui.neId)){
    renderNeDetalleHTML(root);
  }else{
    renderNeListaHTML(root);
  }
  if(state.ui.neModalCrear) root.insertAdjacentHTML("beforeend", neRenderModalCrearHTML());
}

function renderNeListaHTML(root){
  const gruposConNese=state.grupos.map(g=>({g, alumnos:g.alumnos.filter(a=>a.nese)})).filter(x=>x.alumnos.length);
  const totalNese=gruposConNese.reduce((s,x)=>s+x.alumnos.length,0);
  const totalPlanes=(state.planesNESE||[]).length;
  if(!gruposConNese.length){
    root.innerHTML=`<div class="card"><p class="sub" style="margin:0">Todavía no hay alumnado marcado como NESE. Márcalo desde Evaluación por Competencias → Alumnado (columna NESE), y aparecerá aquí automáticamente.</p></div>`;
    return;
  }
  const bloques=gruposConNese.map(({g,alumnos})=>{
    const filas=alumnos.map(al=>{
      const p=nePlanDe(al.id);
      if(!p){
        return `<div class="row" style="justify-content:space-between">
          <div><strong>${esc(al.nombre)}</strong>${al.neseNivel?` <span class="sub">· nivel de referencia: ${esc(al.neseNivel)}</span>`:""}</div>
          <button class="btn small" onclick="neAbrirModalCrear('${g.id}','${al.id}')">+ Crear plan</button>
        </div>`;
      }
      const r=neResumenPlan(p);
      const badgeTxt=p.tipo==="altas"?"🌟 Altas Capacidades":`Modelo ${p.ciclo} · ${NE_MODELO_LABELS[p.ciclo]||""}`;
      return `<div class="row" style="justify-content:space-between;cursor:pointer" onclick="neAbrirDetalle('${p.id}')">
        <div><strong>${esc(al.nombre)}</strong> <span class="badge">${badgeTxt}</span></div>
        <div class="flex" style="gap:6px">
          ${p.tipo==="altas"?`<span class="sub" style="margin:0">${p.medidasTomadas?"con medidas registradas":"plan en blanco"}</span>`:`
          <span class="pill" style="background:#dbeafe;color:#1d4ed8">${r.i} I</span>
          <span class="pill" style="background:#fef3c7;color:#92400e">${r.pr} P</span>
          <span class="pill" style="background:#dcfce7;color:#166534">${r.a} A</span>`}
        </div>
      </div>`;
    }).join("");
    return `<div class="card">
      <h2 style="font-size:15px">${esc(g.nombre)}</h2>
      <div class="grid" style="gap:8px;margin-top:8px">${filas}</div>
    </div>`;
  }).join("");
  root.innerHTML=`
  <div class="card">
    <div class="flex" style="gap:16px">
      <div><div class="big" style="font-size:24px">${totalNese}</div><div class="sub" style="margin:0">Alumnado NESE</div></div>
      <div><div class="big" style="font-size:24px">${totalPlanes}</div><div class="sub" style="margin:0">Con plan creado</div></div>
    </div>
  </div>
  ${bloques}`;
}

function neRenderModalCrearHTML(){
  const {grupoId,alumnoId}=state.ui.neModalCrear;
  const g=state.grupos.find(x=>x.id===grupoId); const al=g?g.alumnos.find(x=>x.id===alumnoId):null;
  if(!al) return "";
  const sugerido=neCicloSugerido(al);
  return `<div class="modal-overlay" onclick="if(event.target===this) neCerrarModalCrear()">
    <div class="modal-box" style="max-width:480px">
      <div class="flex" style="justify-content:space-between;align-items:flex-start">
        <h2 style="font-size:17px">Nuevo plan NESE — ${esc(al.nombre)}</h2>
        <button class="modal-close" onclick="neCerrarModalCrear()">×</button>
      </div>
      <p class="sub" style="margin-top:6px">Elige el modelo según el nivel de competencia curricular real del alumno/a (no su curso de matrícula).${al.neseNivel?` Su nivel de referencia actual es <strong>${esc(al.neseNivel)}</strong>.`:""}</p>
      <div class="grid" style="gap:8px;margin-top:8px" id="neCicloOpciones">
        ${["1","2","3","4","5"].map(c=>{
          const label="Modelo "+c+" · "+NE_MODELO_LABELS[c];
          return `<button class="chip ${c===sugerido?"on":""}" style="text-align:left;padding:10px 14px;justify-content:flex-start" data-tipo="curricular" data-ciclo="${c}" onclick="document.querySelectorAll('#neCicloOpciones .chip').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${label}${c===sugerido?" — sugerido":""}</button>`;
        }).join("")}
        <button class="chip ${sugerido==="altas"?"on":""}" style="text-align:left;padding:10px 14px;justify-content:flex-start" data-tipo="altas" onclick="document.querySelectorAll('#neCicloOpciones .chip').forEach(b=>b.classList.remove('on'));this.classList.add('on')">🌟 Altas Capacidades · Plan en blanco${sugerido==="altas"?" — sugerido":""}</button>
      </div>
      <p class="sub" style="margin-top:6px">Para Altas Capacidades no se parte de ningún modelo curricular: se crea un plan en blanco con un espacio libre para ir anotando las medidas y actuaciones que se apliquen.</p>
      <div class="grid" style="gap:10px;margin-top:14px">
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Necesidad educativa específica (breve)
          <input class="in" style="width:100%;margin-top:4px" id="neNNecesidad" placeholder="Ej. discapacidad intelectual leve, TEA…">
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Medidas de acceso previstas
          <input class="in" style="width:100%;margin-top:4px" id="neNMedidas" placeholder="Ej. apoyo PT dentro del aula, materiales adaptados…">
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Fecha de inicio
          <input class="in" style="width:100%;margin-top:4px" type="date" id="neNFecha" value="${agHoyStr()}">
        </label>
      </div>
      <div class="flex" style="justify-content:flex-end;margin-top:18px">
        <button class="ghost" onclick="neCerrarModalCrear()">Cancelar</button>
        <button class="btn" onclick="neCrearPlan()">Crear plan</button>
      </div>
    </div>
  </div>`;
}
window.neCrearPlan=()=>{
  const {grupoId,alumnoId}=state.ui.neModalCrear;
  const g=state.grupos.find(x=>x.id===grupoId); const al=g.alumnos.find(x=>x.id===alumnoId);
  const opcionBtn=document.querySelector('#neCicloOpciones .chip.on');
  if(!opcionBtn){ mostrarAviso("Elige uno de los tres modelos, o la opción de Altas Capacidades."); return; }
  const tipo=opcionBtn.dataset.tipo||"curricular";
  const ciclo=tipo==="curricular"?opcionBtn.dataset.ciclo:"";
  const necesidadEspecifica=document.getElementById("neNNecesidad").value.trim();
  const medidasAcceso=document.getElementById("neNMedidas").value.trim();
  const fechaInicio=document.getElementById("neNFecha").value;
  const filas=[];
  if(tipo==="curricular"){
    NESE_MODELOS[ciclo].forEach(bloque=>{
      bloque.filas.forEach(f=>{
        filas.push({ id:uid(), bloque:bloque.titulo, saber:f.saber, criterio:f.criterio, ce:f.ce, cc:f.cc, v1:"", v2:"", v3:"" });
      });
    });
  }
  const p={ id:uid(), grupoId, alumnoId, alumnoNombre:al.nombre, tipo, ciclo, necesidadEspecifica, medidasAcceso, fechaInicio, filas,
    medidasTomadas:"", valoracion1T:"", valoracion2T:"", valoracion3T:"", valoracionFinal:"" };
  if(!Array.isArray(state.planesNESE)) state.planesNESE=[];
  state.planesNESE.push(p);
  state.ui.neModalCrear=null; state.ui.neTab="detalle"; state.ui.neId=p.id;
  save(); render();
};

function renderNeDetalleHTML(root){
  const p=(state.planesNESE||[]).find(x=>x.id===state.ui.neId);
  const alV=neAlumno(p);
  const cesUsadas=[...new Set(p.filas.map(f=>f.ce).filter(c=>c && c!=="Transversal"))];
  const ceDicc=NESE_CE[p.ciclo]||{};
  const ceRefHTML=cesUsadas.length?`<div class="card">
    <h2 style="font-size:14.5px">Competencias específicas de este plan</h2>
    <div class="grid" style="gap:6px;margin-top:6px">
      ${cesUsadas.map(c=>`<div style="font-size:13px"><strong>${c}</strong> — ${esc(ceDicc[c]||"")}</div>`).join("")}
    </div>
  </div>`:"";
  const bloquesAgrupados=[];
  p.filas.forEach(f=>{
    let b=bloquesAgrupados.find(x=>x.titulo===f.bloque);
    if(!b){ b={titulo:f.bloque, filas:[]}; bloquesAgrupados.push(b); }
    b.filas.push(f);
  });
  const selectorHTML=(f,campo)=>`<select class="in" style="padding:4px 6px;font-size:12.5px" onchange="neSetValor('${f.id}','${campo}',this.value)">
    ${NE_VALORES.map(v=>`<option value="${v.id}" ${f[campo]===v.id?"selected":""} style="color:${neValorColor(v.id)}">${v.id||"—"}</option>`).join("")}
  </select>`;
  const bloquesHTML=bloquesAgrupados.map(b=>`
    <div class="card">
      <h2 style="font-size:15px">${esc(b.titulo)}</h2>
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Saber básico</th><th>Criterio de evaluación</th><th>CE</th><th>CC</th><th>1T</th><th>2T</th><th>3T</th></tr></thead>
        <tbody>
          ${b.filas.map(f=>`<tr>
            <td style="min-width:170px">${esc(f.saber)}</td>
            <td style="min-width:220px;font-size:12.5px">${esc(f.criterio)}</td>
            <td style="font-size:12px">${esc(f.ce)}</td>
            <td style="font-size:12px">${esc(f.cc)}</td>
            <td>${selectorHTML(f,"v1")}</td>
            <td>${selectorHTML(f,"v2")}</td>
            <td>${selectorHTML(f,"v3")}</td>
          </tr>`).join("")}
        </tbody>
      </table></div>
    </div>`).join("");
  const leyendaHTML=`<div class="alert-box" style="align-items:center">
    📋 <strong>Escala:</strong>&nbsp; <strong>I</strong> = Iniciado &nbsp;·&nbsp; <strong>P</strong> = En proceso &nbsp;·&nbsp; <strong>A</strong> = Alcanzado
  </div>`;
  const medidasTomadasHTML=p.tipo==="altas"?`<div class="card">
    <h2 style="font-size:15px">Medidas y actuaciones aplicadas</h2>
    <p class="sub" style="margin:0 0 8px">Plan en blanco: ve anotando aquí, a medida que se apliquen, las medidas y actuaciones de atención a la Alta Capacidad llevadas a cabo con este alumno/a (enriquecimiento, ampliación curricular, flexibilización, agrupamientos flexibles, mentorías, participación en programas específicos…).</p>
    <textarea class="in" style="width:100%;min-height:240px;resize:vertical" id="neDMedidasTomadas" placeholder="Ve anotando aquí las medidas y actuaciones que se vayan aplicando…">${esc(p.medidasTomadas||"")}</textarea>
  </div>`:"";
  const valoracionesHTML=`<div class="card">
    <h2 style="font-size:15px">Valoración del aprovechamiento del plan</h2>
    <p class="sub" style="margin:0 0 8px">Valoración global de cómo avanza el plan en cada evaluación, además del detalle fila a fila de arriba.</p>
    <div class="grid" style="gap:12px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
      <label style="font-size:12.5px;color:var(--mut);font-weight:500">Valoración 1ª evaluación
        <textarea class="in" style="width:100%;margin-top:4px;min-height:60px;resize:vertical" id="neDVal1T" placeholder="Cómo avanza el plan en la 1ª evaluación…">${esc(p.valoracion1T||"")}</textarea>
      </label>
      <label style="font-size:12.5px;color:var(--mut);font-weight:500">Valoración 2ª evaluación
        <textarea class="in" style="width:100%;margin-top:4px;min-height:60px;resize:vertical" id="neDVal2T" placeholder="Cómo avanza el plan en la 2ª evaluación…">${esc(p.valoracion2T||"")}</textarea>
      </label>
      <label style="font-size:12.5px;color:var(--mut);font-weight:500">Valoración 3ª evaluación
        <textarea class="in" style="width:100%;margin-top:4px;min-height:60px;resize:vertical" id="neDVal3T" placeholder="Cómo avanza el plan en la 3ª evaluación…">${esc(p.valoracion3T||"")}</textarea>
      </label>
      <label style="font-size:12.5px;color:var(--mut);font-weight:500">Valoración final del curso
        <textarea class="in" style="width:100%;margin-top:4px;min-height:70px;resize:vertical" id="neDValFinal" placeholder="Valoración global del aprovechamiento del plan a lo largo de todo el curso…">${esc(p.valoracionFinal||"")}</textarea>
      </label>
    </div>
  </div>`;
  root.innerHTML=`
  <div class="card">
    <div class="flex" style="justify-content:space-between;flex-wrap:wrap;gap:10px">
      <button class="ghost" style="border:1px solid var(--line)" onclick="neIrLista()">← Alumnos NESE</button>
      <div class="flex">
        <div class="flex" style="gap:4px">
          <button class="ghost small" style="border:1px solid var(--line)" onclick="neImprimirInforme('${p.id}','1')">Informe 1ª ev.</button>
          <button class="ghost small" style="border:1px solid var(--line)" onclick="neImprimirInforme('${p.id}','2')">2ª ev.</button>
          <button class="ghost small" style="border:1px solid var(--line)" onclick="neImprimirInforme('${p.id}','3')">3ª ev.</button>
          <button class="btn small" onclick="neImprimirInforme('${p.id}','final')">🖨️ Informe final</button>
        </div>
        <button class="ghost danger" onclick="neEliminarPlan('${p.id}')">Eliminar</button>
      </div>
    </div>
    <div class="grid" style="gap:12px;margin-top:14px;max-width:640px">
      <div style="font-size:15px;font-weight:700">${esc(neNombre(p))}${alV?neseBadgeHTML(alV.al)+` <span class="sub" style="font-weight:400">· ${esc(alV.g.nombre)}</span>`:""} <span class="badge">${p.tipo==="altas"?"🌟 Altas Capacidades":`Modelo ${p.ciclo} · ${NE_MODELO_LABELS[p.ciclo]||""}`}</span></div>
      <label style="font-size:12.5px;color:var(--mut);font-weight:500">Necesidad educativa específica
        <input class="in" style="width:100%;margin-top:4px" id="neDNecesidad" value="${esc(p.necesidadEspecifica||"")}">
      </label>
      <label style="font-size:12.5px;color:var(--mut);font-weight:500">Medidas de acceso previstas
        <input class="in" style="width:100%;margin-top:4px" id="neDMedidas" value="${esc(p.medidasAcceso||"")}">
      </label>
      <label style="font-size:12.5px;color:var(--mut);font-weight:500">Fecha de inicio
        <input class="in" style="width:100%;margin-top:4px" type="date" id="neDFecha" value="${p.fechaInicio||""}">
      </label>
    </div>
  </div>
  ${p.tipo==="altas"?"":leyendaHTML}
  ${ceRefHTML}
  ${bloquesHTML}
  ${medidasTomadasHTML}
  ${valoracionesHTML}`;
  const campo=(id,fn)=>document.getElementById(id).addEventListener("change",e=>{ fn(e.target.value); save(); });
  campo("neDNecesidad",v=>p.necesidadEspecifica=v.trim());
  campo("neDMedidas",v=>p.medidasAcceso=v.trim());
  campo("neDFecha",v=>p.fechaInicio=v);
  if(p.tipo==="altas") campo("neDMedidasTomadas",v=>p.medidasTomadas=v);
  campo("neDVal1T",v=>p.valoracion1T=v);
  campo("neDVal2T",v=>p.valoracion2T=v);
  campo("neDVal3T",v=>p.valoracion3T=v);
  campo("neDValFinal",v=>p.valoracionFinal=v);
}
window.neSetValor=(filaId,campo,valor)=>{
  const p=(state.planesNESE||[]).find(x=>x.id===state.ui.neId);
  const f=p.filas.find(x=>x.id===filaId);
  if(f){ f[campo]=valor; save(); }
};
window.neEliminarPlan=async id=>{
  if(!await confirmar("¿Eliminar este plan NESE? No se puede deshacer.")) return;
  state.planesNESE=(state.planesNESE||[]).filter(x=>x.id!==id);
  state.ui.neTab="lista"; state.ui.neId="";
  save(); render();
  mostrarToast("Plan eliminado","info");
};
window.neImprimirInforme=(id,alcance)=>{
  const p=(state.planesNESE||[]).find(x=>x.id===id); if(!p) return;
  const alV=neAlumno(p);
  const cesUsadas=[...new Set(p.filas.map(f=>f.ce).filter(c=>c && c!=="Transversal"))];
  const ceDicc=NESE_CE[p.ciclo]||{};
  const ceTabla=cesUsadas.length?`<table><thead><tr><th style="width:70px">Código</th><th>Competencia específica</th></tr></thead><tbody>
    ${cesUsadas.map(c=>`<tr><td>${c}</td><td>${esc(ceDicc[c]||"")}</td></tr>`).join("")}
  </tbody></table>`:"";
  const bloquesAgrupados=[];
  p.filas.forEach(f=>{
    let b=bloquesAgrupados.find(x=>x.titulo===f.bloque);
    if(!b){ b={titulo:f.bloque, filas:[]}; bloquesAgrupados.push(b); }
    b.filas.push(f);
  });
  let cuerpoBloques;
  const etiquetaEv={"1":"1ª evaluación","2":"2ª evaluación","3":"3ª evaluación","final":"Curso completo"}[alcance];
  if(p.tipo==="altas"){
    cuerpoBloques=p.medidasTomadas?`<h2>Medidas y actuaciones aplicadas</h2><p style="white-space:pre-wrap">${esc(p.medidasTomadas)}</p>`:'<p style="color:#999;font-style:italic">Todavía no se han registrado medidas.</p>';
  }else if(alcance==="final"){
    cuerpoBloques=bloquesAgrupados.map(b=>{
      const filas=b.filas.filter(f=>f.v1||f.v2||f.v3);
      if(!filas.length) return "";
      return `<h2>${esc(b.titulo)}</h2>
        <table><thead><tr><th>Saber básico</th><th>Criterio</th><th>1T</th><th>2T</th><th>3T</th></tr></thead><tbody>
        ${filas.map(f=>`<tr><td>${esc(f.saber)}</td><td style="font-size:12px">${esc(f.criterio)}</td><td style="text-align:center">${f.v1||"—"}</td><td style="text-align:center">${f.v2||"—"}</td><td style="text-align:center">${f.v3||"—"}</td></tr>`).join("")}
        </tbody></table>`;
    }).join("");
  }else{
    const campo="v"+alcance;
    cuerpoBloques=bloquesAgrupados.map(b=>{
      const filas=b.filas.filter(f=>f[campo]);
      if(!filas.length) return "";
      return `<h2>${esc(b.titulo)}</h2>
        <table><thead><tr><th>Saber básico</th><th>Criterio</th><th>Valoración</th></tr></thead><tbody>
        ${filas.map(f=>`<tr><td>${esc(f.saber)}</td><td style="font-size:12px">${esc(f.criterio)}</td><td style="text-align:center;font-weight:700">${f[campo]}</td></tr>`).join("")}
        </tbody></table>`;
    }).join("");
  }
  if(!cuerpoBloques.trim()) cuerpoBloques='<p style="color:#999;font-style:italic">Sin registros para este periodo.</p>';
  let valoracionesBody="";
  if(alcance==="final"){
    const partes=[];
    if(p.valoracion1T) partes.push(`<p><strong>1ª evaluación:</strong> ${esc(p.valoracion1T)}</p>`);
    if(p.valoracion2T) partes.push(`<p><strong>2ª evaluación:</strong> ${esc(p.valoracion2T)}</p>`);
    if(p.valoracion3T) partes.push(`<p><strong>3ª evaluación:</strong> ${esc(p.valoracion3T)}</p>`);
    if(p.valoracionFinal) partes.push(`<p><strong>Valoración final:</strong> ${esc(p.valoracionFinal)}</p>`);
    if(partes.length) valoracionesBody=`<h2>Valoración del aprovechamiento del plan</h2>${partes.join("")}`;
  }else{
    const valTrim=p["valoracion"+alcance+"T"];
    if(valTrim) valoracionesBody=`<h2>Valoración de la evaluación</h2><p>${esc(valTrim)}</p>`;
  }
  const body=`
    <h1>Plan de Seguimiento NESE</h1>
    <div class="meta">${esc(neNombre(p))}${alV?" · "+esc(alV.g.nombre):""} · ${etiquetaEv} · Generado el ${new Date().toLocaleDateString("es-ES")}</div>
    ${p.tipo==="altas"?"":'<p style="font-size:13px;color:#666">Escala de valoración: <strong>I</strong> = Iniciado · <strong>P</strong> = En proceso · <strong>A</strong> = Alcanzado</p>'}
    <table>
      <tr><th style="width:160px">Necesidad educativa específica</th><td>${esc(p.necesidadEspecifica||"—")}</td></tr>
      <tr><th>Medidas de acceso</th><td>${esc(p.medidasAcceso||"—")}</td></tr>
      <tr><th>Fecha de inicio</th><td>${fmt2(p.fechaInicio)}</td></tr>
      <tr><th>Modelo utilizado</th><td>${p.tipo==="altas"?"Altas Capacidades — Plan en blanco":`Modelo ${p.ciclo} · ${NE_MODELO_LABELS[p.ciclo]||""}`}</td></tr>
    </table>
    ${ceTabla?`<h2>Competencias específicas</h2>${ceTabla}`:""}
    ${cuerpoBloques}
    ${valoracionesBody}
  `;
  const portada=generarPortadaHTML(`Plan NESE — ${neNombre(p)}`,
    [alV?`Alumno/a: <strong>${esc(alV.al.nombre)}</strong> · ${esc(alV.g.nombre)}`:`Alumno/a: <strong>${esc(p.alumnoNombre||neNombre(p))}</strong>`,
     `${etiquetaEv}`,
     `Curso escolar: <strong>${esc(cursoEscolarEfectivo(null))}</strong>`,
     profesorNombreEfectivo(null)?`Elaborado por: <strong>${esc(profesorNombreEfectivo(null))}</strong>`:""],
    [ceTabla?"Competencias específicas":"", ...bloquesAgrupados.map(b=>b.titulo), valoracionesBody?"Valoración del aprovechamiento del plan":""]);
  abrirVentanaInforme(`Plan NESE — ${neNombre(p)} · ${etiquetaEv}`, body, {portada});
};

