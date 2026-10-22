/* ============================================================================
   Cuaderno del profesor · Navegación del Corrector, lista de exámenes y crear examen
   js/corrector/navegacion-lista-crear.js
   ============================================================================ */

/* ---------- Navegación del Corrector ---------- */
window.cxTab=k=>{ if(k!=="editor") cxAvisarAlSalirDelEditor(); state.ui.corTab=k; if(k==="lista"){ state.ui.corExamId=""; state.ui.corAlId=""; } save(); render(); };
function cxAvisarAlSalirDelEditor(){
  if(state.ui.corTab!=="editor") return;
  const grupo=grupoActual(); const act=grupo&&grupo.actividades.find(a=>a.id===state.ui.corExamId); if(!act||!act.rubrica) return;
  const av=cxAvisosCriterios(grupo,act); if(!av.length) return;
  const ids=[...new Set(av.flatMap(a=>a.faltan))];
  setTimeout(()=>mostrarToast(`⚠️ «${act.nombre}»: ${ids.length===1?"el criterio "+ids[0]+" se ha":"los criterios "+ids.join(", ")+" se han"} quedado sin vincular en la rúbrica`,"info"),50);
}
window.cxIrLista=()=>{ cxAvisarAlSalirDelEditor(); state.ui.corTab="lista"; state.ui.corExamId=""; state.ui.corAlId=""; save(); render(); };
window.cxIrCrear=()=>{ state.ui.corTab="crear"; save(); render(); };
window.cxIrEditor=examId=>{ if(state.ui.corExamId!==examId) state.ui.corVarId=""; state.ui.corTab="editor"; state.ui.corExamId=examId; save(); render(); };
window.cxIrCorregir=examId=>{ cxAvisarAlSalirDelEditor(); state.ui.corTab="corregir"; state.ui.corExamId=examId; state.ui.corAlId=""; save(); render(); };
window.cxIrAlumno=alId=>{ state.ui.corAlId=alId; save(); render(); };
window.cxVolverLista=()=>{ state.ui.corAlId=""; save(); render(); };

function renderCorMain(){
  const grupo=grupoActual();
  const app=document.getElementById("app");
  if(!grupo){ renderCorSinGrupo(); return; }
  app.innerHTML = `<div class="card" style="padding:12px 16px">
    <div class="flex" style="justify-content:space-between">
      <div>
        <strong style="font-size:15px">🖊️ Corrector de Exámenes</strong>
        <span style="color:var(--mut);font-size:13px"> · ${esc(grupo.nombre)}</span>
      </div>
      <div class="flex">
        ${[["lista","Exámenes"],["crear","Nuevo examen"]].map(([k,l])=>`<button class="tab ${state.ui.corTab===k?"on":""}" onclick="cxTab('${k}')">${l}</button>`).join("")}
      </div>
    </div>
  </div><div id="tabContent"></div>`;
  const t=state.ui.corTab;
  if(t==="crear") renderCorCrear(grupo);
  else if(t==="diseno") renderCorDiseno(grupo);
  else if(t==="editor"){ renderCorEditor(grupo); cxPonerSubtabs(grupo); }
  else if(t==="corregir"){ renderCorCorregir(grupo); if(!state.ui.corAlId) cxPonerSubtabs(grupo); }
  else renderCorLista(grupo);
}
function renderCorSinGrupo(){
  const app=document.getElementById("app");
  const hay=state.grupos.length>0;
  app.innerHTML=`<div class="hero">
    <div class="hero-eyebrow">Corrector de Exámenes</div>
    <h1 class="hero-title">Elige un grupo</h1>
    <p class="hero-tag">${hay?"Selecciona un grupo arriba para gestionar sus exámenes.":"Todavía no tienes ningún grupo creado. Créalo desde Evaluación por Competencias: el Corrector usa el mismo alumnado, sin darlo de alta dos veces."}</p>
    ${!hay?`<button class="btn" onclick="irModo('competencial')">Ir a Evaluación por Competencias</button>`:""}
  </div>`;
}

/* ---------- Lista de exámenes ---------- */
function renderCorLista(grupo){
  const c=document.getElementById("tabContent");
  const exams=cxExamenesRubrica(grupo);
  c.innerHTML=`
  <div class="card">
    <div class="flex" style="justify-content:space-between">
      <div><h2>Exámenes de ${TRIMESTRES[state.ui.trim]}</h2><p class="sub" style="margin:0">También aparecen en la pestaña "Actividades" de Evaluación por Competencias.</p></div>
      <button class="btn" onclick="cxIrCrear()">+ Nuevo examen</button>
    </div>
  </div>
  ${exams.length? exams.map(act=>{
    const notas=grupo.alumnos.filter(al=>!marcaDe(grupo,al.id,act.id)).map(al=>grupo.notasCuant?.[al.id]?.[act.id]).filter(v=>v!=null);
    const media=notas.length? notas.reduce((a,b)=>a+b,0)/notas.length : null;
    const b=grupo.bloques.find(x=>x.id===act.bloqueId);
    return `<div class="card" style="padding:14px 16px">
      <div class="flex" style="justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-size:15px;font-weight:600">${esc(act.nombre)} ${act.sda?`<span class="badge" style="vertical-align:middle;margin-left:6px">${esc(act.sda)}</span>`:''}</div>
          <div style="font-size:12.5px;color:var(--mut);margin-top:2px">${b?esc(b.label):""} · ${notas.length}/${grupo.alumnos.length} corregido${notas.length===1?"":"s"}${media!=null?` · media ${fmt(media)}`:""}</div>
          ${cxAvisoCriteriosBadgeHTML(grupo,act)}
        </div>
        <div class="flex">
          <button class="btn small" onclick="cxIrCorregir('${act.id}')">Corregir</button>
          <button class="ghost" style="border:1px solid var(--line)" onclick="cxIrDiseno('${act.id}')">✏️ Diseño</button>
          <button class="ghost" style="border:1px solid var(--line)" onclick="cxIrEditor('${act.id}')">Rúbrica</button>
          ${notas.length?`<button class="ghost" style="border:1px solid var(--line)" title="Imprimir juntas y ordenadas por alumno/a todas las rúbricas ya corregidas de este examen" onclick="cxImprimirRubricasTodos('${act.id}')">🖨️ Imprimir</button>`:""}
          <button class="ghost" style="border:1px solid var(--line)" onclick="cxExportarCSV('${act.id}')">CSV</button>
          <button class="ghost danger" onclick="delActividad('${act.id}')">Eliminar</button>
        </div>
      </div>
    </div>`;
  }).join("") : '<div class="card"><p class="sub" style="margin:0">Todavía no hay ningún examen con rúbrica en este periodo.</p></div>'}
  ${cxPendientesHTML(grupo)}`;
}
/* Exámenes que aún no se corrigen con rúbrica: los del grupo sin rúbrica y los
   de la Programación vinculada que todavía no se han traído a este grupo. */
function cxPendientesHTML(grupo){
  const sinRub=grupo.actividades.filter(a=>a.esExamen && !a.rubrica && a.trimestre===state.ui.trim);
  const prog=progDeGrupo(grupo);
  const deProg=prog? (prog.actividades||[]).filter(pa=>pa.esExamen && (pa.nombre||"").trim() && !progActividadesEnGrupo(grupo,pa).length) : [];
  if(!sinRub.length && !deProg.length) return "";
  const trimDe=pa=>{ const t=(pa.sdaIds||[]).map(sid=>(prog.sdas.find(s=>s.id===sid)||{}).trimestre).filter(x=>typeof x==="number"&&TRIMESTRES[x]); return t.length?Math.min(...t):null; };
  return `<div class="card">
    <h2 style="font-size:15px">Exámenes sin rúbrica</h2>
    <p class="sub" style="margin:0 0 8px">Al añadirles rúbrica se crea una inicial con un ítem por cada criterio marcado (o la que tengas guardada en la Programación), lista para ajustar.</p>
    <div class="grid" style="gap:8px">
      ${sinRub.map(a=>`<div class="row" style="justify-content:space-between;border:1px solid var(--line);border-radius:8px;padding:8px 12px">
        <span style="font-size:14px">${esc(a.nombre)} <span style="font-size:12.5px;color:var(--mut)">· en Evaluación${cxActTieneNotas(grupo,a)?" · ya tiene notas":""}</span></span>
        <button class="btn small" onclick="cxAnadirRubrica('${a.id}')">🖊️ Añadir rúbrica</button>
      </div>`).join("")}
      ${deProg.map(pa=>{ const t=trimDe(pa); return `<div class="row" style="justify-content:space-between;border:1px dashed var(--line);border-radius:8px;padding:8px 12px">
        <span style="font-size:14px">${esc(pa.nombre)} <span style="font-size:12.5px;color:var(--mut)">· en la Programación${t!=null?" ("+TRIMESTRES[t]+")":""}, aún no traído a este grupo${(pa.rubrica||[]).length?" · con rúbrica guardada":""}</span></span>
        <button class="btn small" title="Lo añade a Evaluación por Competencias en ${TRIMESTRES[state.ui.trim]}, ya con rúbrica" onclick="cxTraerDeProgramacion('${pa.id}')">+ Traer a ${TRIMESTRES[state.ui.trim].replace("ª evaluación","ª ev.")} con rúbrica</button>
      </div>`; }).join("")}
    </div>
  </div>`;
}
window.cxTraerDeProgramacion=async progActId=>{
  const grupo=grupoActual(); const prog=progDeGrupo(grupo); if(!grupo||!prog) return;
  const pa=prog.actividades.find(x=>x.id===progActId); if(!pa) return;
  if(!(pa.criterios||[]).length && !(pa.rubrica||[]).length){
    if(!await confirmar(`«${pa.nombre}» todavía no tiene criterios marcados en la Programación, así que la rúbrica empezará en blanco y no contará para las competencias hasta que vincules sus ítems a criterios.\n\n¿Continuar?`)) return;
  }
  const act=progCrearActividadEnGrupo(grupo,pa,state.ui.trim);
  cxAbrirEditor(grupo,act);
  mostrarToast("✓ Examen añadido con rúbrica — ajústala y corrige desde aquí");
};

/* ---------- Crear examen ---------- */
function renderCorCrear(grupo){
  const c=document.getElementById("tabContent");
  const f=state.ui.corForm;
  if(!f.bloqueId) f.bloqueId=grupo.bloques[0]?.id||"";
  const plantillas=state.plantillasRubrica||[];
  c.innerHTML=`<div class="card">
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><h2>Nuevo examen</h2><button class="ghost" style="border:1px solid var(--line)" title="Crear el examen a partir de un paquete exportado (examen + rúbrica + variantes)" onclick="exImportarPaquete()">📥 Importar paquete</button></div>
    <p class="sub">Se crea en ${TRIMESTRES[state.ui.trim]}. Después diseñas la rúbrica y vinculas cada ítem a los criterios que trabaja.</p>
    <div class="grid" style="max-width:640px">
      <input class="in" id="cxfNombre" placeholder="Nombre del examen" value="${esc(f.nombre)}">
      <select class="in" id="cxfBloque">${grupo.bloques.map(b=>`<option value="${b.id}" ${b.id===f.bloqueId?"selected":""}>${esc(b.label)}</option>`).join("")}</select>
      <input class="in" id="cxfSda" placeholder="Situación de Aprendizaje (opcional)" value="${esc(f.sda||'')}">
      <label style="font-size:12.5px;color:var(--mut);font-weight:500">Fecha del examen (opcional)
        <input class="in" style="width:100%;margin-top:4px" type="date" id="cxfFecha" value="${esc(f.fecha||'')}">
      </label>
      <p class="sub" style="margin:-4px 0 0;font-size:11.5px">Si la indicas, se crea también en el calendario de Inicio.</p>
      <label style="font-size:12.5px;color:var(--mut);font-weight:500">Empezar la rúbrica desde
        <select class="in" style="width:100%;margin-top:4px" id="cxfPlantilla">
          <option value="">Rúbrica en blanco</option>
          ${plantillas.map(p=>`<option value="${p.id}" ${f.plantillaId===p.id?"selected":""}>${esc(p.nombre)}</option>`).join("")}
        </select>
      </label>
      ${plantillas.length?`<p class="sub" style="margin:-4px 0 0;font-size:11.5px">Los ítems se copian con sus puntos y descriptores; los criterios vinculados solo se copian si existen en el catálogo de este grupo.</p>`:""}
      <div>
        <button class="ghost" style="border:1px solid var(--line)" onclick="state.ui.corFormCritAbierto=!state.ui.corFormCritAbierto;save();render()">${state.ui.corFormCritAbierto?"▾":"▸"} Criterios de evaluación que evalúa — ${(f.criterios||[]).length} marcado${(f.criterios||[]).length===1?"":"s"}</button>
        <p class="sub" style="margin:4px 0 0;font-size:11.5px">Opcional, pero recomendable: la rúbrica empezará con una pregunta por criterio, solo te ofrecerá estos para vincular y te avisará si alguno se queda sin evaluar. Pueden ser de varias Situaciones de Aprendizaje.</p>
        ${state.ui.corFormCritAbierto?cxSelectorCriteriosHTML(grupo.catalogoKey,f.criterios||[],"cxFormToggleCrit"):""}
      </div>
      <button class="btn" id="cxfBtn" onclick="cxCrearExamen()" ${!f.nombre.trim()?"disabled":""} style="justify-self:start">Crear y diseñar rúbrica</button>
    </div>
  </div>
  ${plantillas.length?`<div class="card">
    <h2 style="font-size:14.5px">Plantillas guardadas</h2>
    <div class="flex">
      ${plantillas.map(p=>`<span class="chip">${esc(p.nombre)} <button class="ghost danger small" style="padding:2px 6px;margin-left:4px" onclick="cxEliminarPlantilla('${p.id}')" title="Eliminar plantilla">✕</button></span>`).join("")}
    </div>
  </div>`:""}`;
  document.getElementById("cxfNombre").addEventListener("input",e=>{ state.ui.corForm.nombre=e.target.value; save();
    document.getElementById("cxfBtn").disabled=!e.target.value.trim(); });
  document.getElementById("cxfBloque").addEventListener("change",e=>{ state.ui.corForm.bloqueId=e.target.value; save(); });
  document.getElementById("cxfSda").addEventListener("input",e=>{ state.ui.corForm.sda=e.target.value; save(); });
  document.getElementById("cxfFecha").addEventListener("change",e=>{ state.ui.corForm.fecha=e.target.value; save(); });
  document.getElementById("cxfPlantilla").addEventListener("change",e=>{ state.ui.corForm.plantillaId=e.target.value; save(); });
}
window.cxEliminarPlantilla=async id=>{
  if(!await confirmar("¿Eliminar esta plantilla de rúbrica? No afecta a los exámenes ya creados con ella.")) return;
  state.plantillasRubrica=(state.plantillasRubrica||[]).filter(p=>p.id!==id);
  save(); render();
};
window.cxGuardarComoPlantilla=async examId=>{
  const grupo=grupoActual(); const act=grupo.actividades.find(a=>a.id===examId); if(!act) return;
  const nombre=await pedirTexto("Nombre para esta plantilla de rúbrica:", act.nombre);
  if(!nombre || !nombre.trim()) return;
  if(!Array.isArray(state.plantillasRubrica)) state.plantillasRubrica=[];
  state.plantillasRubrica.push({ id:uid(), nombre:nombre.trim(), rubrica:JSON.parse(JSON.stringify(act.rubrica)) });
  save();
  mostrarAviso(`Plantilla "${nombre.trim()}" guardada. Podrás elegirla al crear un nuevo examen.`);
};
function cxCriteriosValidosEnCatalogo(catalogoKey){
  const idx=catIndex(catalogoKey); const set=new Set();
  idx.cat.ces.forEach(ce=>ce.criterios.forEach(c=>set.add(c.id)));
  return set;
}
window.cxCrearExamen=()=>{
  const grupo=grupoActual(); const f=state.ui.corForm;
  if(!f.nombre.trim()) return;
  if(!f.bloqueId) f.bloqueId=defBloque("Prueba objetiva / examen",grupo.bloques);
  const critsForm=(f.criterios||[]).filter(c=>cxCriteriosValidosEnCatalogo(grupo.catalogoKey).has(c));
  let rubricaInicial= critsForm.length? cxRubricaDesdeCriterios(critsForm.map(c=>({critId:c,peso:100})),grupo.catalogoKey)
    : [{id:uid(),title:"Apartado 1",items:[{id:uid(),label:"",max:10,desc:[],links:[]}]}];
  if(f.plantillaId){
    const plantilla=(state.plantillasRubrica||[]).find(p=>p.id===f.plantillaId);
    if(plantilla){
      rubricaInicial=cxClonarRubrica(plantilla.rubrica,grupo.catalogoKey);
    }
  }
  const act={ id:uid(), trimestre:state.ui.trim, nombre:f.nombre.trim(), tipo:"Prueba objetiva / examen",
    bloqueId:f.bloqueId, esExamen:true, pesoBloque:"", criterios:[], sda:(f.sda||"").trim(),
    rubrica:rubricaInicial, escalarA10:true, criteriosPrevistos:critsForm };
  cxSyncCriteriosActividad(act);
  grupo.actividades.push(act);
  if((f.fecha||"").trim()){
    if(!Array.isArray(state.eventos)) state.eventos=[];
    state.eventos.push({id:uid(), fecha:f.fecha.trim(), titulo:act.nombre, tipo:"examen", grupoId:grupo.id, notas:"", examId:act.id});
    state.ui.agMes=f.fecha.trim().slice(0,7);
  }
  state.ui.corExamId=act.id; state.ui.corTab="editor"; state.ui.corForm={nombre:"",bloqueId:"",sda:"",fecha:"",plantillaId:"",criterios:[]}; state.ui.corFormCritAbierto=false;
  save(); render();
};

