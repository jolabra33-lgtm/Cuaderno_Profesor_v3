/* ============================================================================
   Cuaderno del profesor · Programación ↔ Corrector: rúbricas para los exámenes planificados
   js/corrector/programacion-corrector.js
   ============================================================================ */

/* =================================================================
   PROGRAMACIÓN ↔ CORRECTOR — rúbricas para los exámenes planificados
   - Al traer un examen de la Programación a Evaluación, se crea ya con
     rúbrica (la guardada en la Programación, si la hay; si no, una
     inicial con un ítem por cada criterio marcado, con los puntos
     repartidos según sus pesos hasta sumar 10).
   - Cualquier examen sin rúbrica (traído antes, o creado a mano) puede
     abrirse en el Corrector para añadírsela.
   - Desde la Programación, cada examen tiene "Abrir en el Corrector": lo
     busca (o lo trae) en el grupo vinculado y abre su rúbrica.
   - La rúbrica de un examen se puede guardar de vuelta en la Programación
     para reutilizarla en otros grupos y en otros cursos.
   La actividad del grupo recuerda de qué actividad de la Programación
   viene en act.progActId.
   ================================================================= */
function cxRepartirPuntos(pesos,total){
  // Reparte "total" puntos según los pesos, en múltiplos de 0,25, y ajusta
  // el último ítem para que la suma sea exacta.
  const n=pesos.length; if(!n) return [];
  const suma=pesos.reduce((s,p)=>s+(Number(p)>0?Number(p):0),0);
  const base=suma>0? pesos.map(p=>(Number(p)>0?Number(p):0)/suma*total) : pesos.map(()=>total/n);
  const out=base.map(v=>Math.round(v*4)/4);
  const dif=Math.round((total-out.reduce((s,v)=>s+v,0))*100)/100;
  out[n-1]=Math.max(0,Math.round((out[n-1]+dif)*100)/100);
  return out;
}
function cxRubricaDesdeCriterios(criterios,catalogoKey){
  const crits=(criterios||[]).filter(l=>l&&l.critId);
  if(!crits.length) return [{id:uid(),title:"Apartado 1",items:[{id:uid(),label:"",max:10,desc:[],links:[]}]}];
  const idx=catIndex(catalogoKey);
  const textoDe=cid=>{ for(const ce of idx.cat.ces){ const cr=ce.criterios.find(c=>c.id===cid); if(cr) return cr.texto||""; } return ""; };
  const puntos=cxRepartirPuntos(crits.map(l=>l.peso),10);
  return [{id:uid(),title:"Apartado 1",items:crits.map((l,i)=>{
    let t=textoDe(l.critId); if(t.length>90) t=t.slice(0,87).trim()+"…";
    return {id:uid(),label:`Pregunta ${i+1} · criterio ${l.critId}${t?" — "+t:""}`,max:puntos[i],desc:[],links:[{critId:l.critId,peso:100}]};
  })}];
}
function cxClonarRubrica(rubrica,catalogoKey){
  const validos=catalogoKey? cxCriteriosValidosEnCatalogo(catalogoKey) : null;
  const clonar=sec=>({
    ...sec, id:uid(),
    items:(sec.items||[]).map(it=>({...it, id:uid(), desc:Array.isArray(it.desc)?it.desc:[], links:(it.links||[]).filter(l=>!validos||validos.has(l.critId))})),
    subs:(sec.subs||[]).map(clonar)
  });
  return JSON.parse(JSON.stringify(rubrica||[])).map(clonar);
}
/* Actividad de la Programación de la que procede una actividad del grupo (o null). */
function cxProgActDe(grupo,act){
  if(!act||!act.progActId) return null;
  const prog=progDeGrupo(grupo);
  const enProg=prog&&(prog.actividades||[]).find(x=>x.id===act.progActId);
  if(enProg) return {prog,progAct:enProg};
  for(const p of (state.programaciones||[])){ const x=(p.actividades||[]).find(y=>y.id===act.progActId); if(x) return {prog:p,progAct:x}; }
  return null;
}
function cxRubricaInicial(grupo,act,progAct){
  if(progAct && Array.isArray(progAct.rubrica) && progAct.rubrica.length) return cxClonarRubrica(progAct.rubrica,grupo.catalogoKey);
  return cxRubricaDesdeCriterios(act.criterios,grupo.catalogoKey);
}
function cxActTieneNotas(grupo,act){
  return grupo.alumnos.some(al=>{
    if(grupo.notasCuant?.[al.id]?.[act.id]!=null) return true;
    const q=grupo.notas?.[al.id]?.[act.id];
    return !!(q && Object.keys(q).length);
  });
}
/* Pone rúbrica a un examen que no la tenía. Devuelve true si se ha puesto. */
async function cxPonerRubrica(grupo,act){
  if(act.rubrica) return true;
  if(cxActTieneNotas(grupo,act)){
    const ok=await confirmar(`«${act.nombre}» ya tiene notas puestas en Calificar.\n\nAl pasar a corregirse con rúbrica, sus notas (cuantitativa y por criterio) se sustituirán por las que salgan de la rúbrica, y tendrás que corregirlo de nuevo en el Corrector. Las marcas (no presentado, exento…) se mantienen.`,{titulo:"Este examen ya tiene notas",ok:"Sí, sustituir por la rúbrica"});
    if(!ok) return false;
  }
  const ref=cxProgActDe(grupo,act);
  if(!Array.isArray(act.criteriosPrevistos) || !act.criteriosPrevistos.length) act.criteriosPrevistos=(act.criterios||[]).map(c=>c.critId);
  act.rubrica=cxRubricaInicial(grupo,act,ref&&ref.progAct);
  act.escalarA10=true;
  act.esExamen=true;
  cxSyncCriteriosActividad(act);
  cxRecalcTodosLosAlumnos(grupo,act);
  return true;
}
function cxAbrirEditor(grupo,act){
  state.ui.appMode="corrector"; state.ui.grupoId=grupo.id; state.ui.trim=act.trimestre;
  state.ui.corTab="editor"; state.ui.corExamId=act.id; state.ui.corAlId=""; state.ui.corVarId="";
  save(); render();
}
/* Abrir en el Corrector un examen que todavía no tiene rúbrica (desde Evaluación o desde la lista del Corrector). */
window.cxAnadirRubrica=async actId=>{
  const grupo=grupoActual(); const act=grupo&&grupo.actividades.find(a=>a.id===actId); if(!act) return;
  if(!await cxPonerRubrica(grupo,act)) return;
  cxAbrirEditor(grupo,act);
  mostrarToast("✓ Rúbrica creada — ajústala y corrige desde aquí");
};
/* Crea en el grupo la actividad de evaluación a partir de una de la Programación
   (si es examen, ya con rúbrica). Devuelve la actividad creada. */
function progCrearActividadEnGrupo(grupo,progAct,trimestre){
  const act={ id:uid(), nombre:progAct.nombre, tipo:progAct.tipo, esExamen:!!progAct.esExamen, bloqueId:defBloque(progAct.tipo,grupo.bloques), pesoBloque:"",
    trimestre, criterios:(progAct.criterios||[]).map(c=>({...c})), sda:"", progActId:progAct.id,
    criteriosPrevistos:(progAct.criterios||[]).map(c=>c.critId) };
  if(act.esExamen){
    act.rubrica=cxRubricaInicial(grupo,act,progAct);
    act.escalarA10=true;
    cxSyncCriteriosActividad(act);
  }
  grupo.actividades.push(act);
  return act;
}
/* Actividades del grupo que vienen de una actividad de la Programación. Las
   traídas antes de existir act.progActId se reconocen por el nombre. */
function progActividadesEnGrupo(grupo,progAct){
  const porId=grupo.actividades.filter(a=>!a.recupera && a.progActId===progAct.id);
  if(porId.length) return porId;
  const nom=(progAct.nombre||"").trim().toLowerCase();
  return nom? grupo.actividades.filter(a=>!a.recupera && !a.progActId && (a.nombre||"").trim().toLowerCase()===nom) : [];
}
/* Selector sencillo con la misma apariencia que el resto de avisos de la app. */
function elegirOpcion(titulo,mensaje,opciones){
  if(window.__dialogosAuto) return Promise.resolve(opciones.length?opciones[0].value:null);
  return new Promise(resolve=>{
    const div=document.createElement("div");
    div.className="modal-overlay dlg-overlay"; div.style.zIndex=String(++_dlgZ);
    div.innerHTML=`<div class="modal-box dlg-box" role="dialog" aria-modal="true" style="max-width:460px">
      <h2 style="font-size:16.5px;margin-bottom:6px">${esc(titulo)}</h2>
      <div class="dlg-msg" style="font-size:14px;line-height:1.5;color:var(--ink)">${_textoDialogoHTML(mensaje)}</div>
      <div class="grid" style="gap:6px;margin-top:12px">${opciones.map((o,i)=>`<button class="ghost dlg-op" data-i="${i}" style="border:1px solid var(--line);text-align:left;justify-content:flex-start">${esc(o.label)}</button>`).join("")}</div>
      <div class="flex" style="justify-content:flex-end;margin-top:14px"><button class="ghost dlg-no" style="border:1px solid var(--line)">Cancelar</button></div>
    </div>`;
    document.body.appendChild(div);
    const fin=v=>{ div.remove(); document.removeEventListener("keydown",tecla,true); resolve(v); };
    const tecla=e=>{ if(e.key==="Escape"){ e.preventDefault(); e.stopPropagation(); fin(null); } };
    document.addEventListener("keydown",tecla,true);
    div.querySelectorAll(".dlg-op").forEach(b=>b.onclick=()=>fin(opciones[Number(b.dataset.i)].value));
    div.querySelector(".dlg-no").onclick=()=>fin(null);
    div.onclick=e=>{ if(e.target===div) fin(null); };
    setTimeout(()=>{ div.querySelector(".dlg-op")?.focus(); },20);
  });
}
/* Botón "Abrir en el Corrector" de un examen en la Programación de Aula. */
window.progAbrirEnCorrector=async actId=>{
  const p=progPorId(state.ui.progId); if(!p) return;
  const progAct=p.actividades.find(a=>a.id===actId); if(!progAct) return;
  if(!(progAct.nombre||"").trim()){ mostrarAviso("Ponle antes un nombre al examen."); return; }
  const grupos=state.grupos.filter(g=>g.programacionId===p.id);
  if(!grupos.length){ mostrarAviso(`El Corrector trabaja con el alumnado de un grupo, y ningún grupo tiene vinculada todavía la Programación "${p.nombre}".\n\nVincúlala a un grupo y vuelve a pulsar aquí.`); return; }
  let grupo=grupos.length===1? grupos[0] : null;
  if(!grupo){
    const gid=await elegirOpcion("🖊️ Abrir en el Corrector",`¿En qué grupo quieres abrir «${progAct.nombre}»?`,
      grupos.map(g=>{ const ya=progActividadesEnGrupo(g,progAct); return {value:g.id,label:g.nombre+(ya.length?(ya.some(a=>a.rubrica)?" · ya tiene rúbrica":" · ya está en Evaluación"):" · se añadirá a Evaluación")}; }));
    if(!gid) return;
    grupo=state.grupos.find(g=>g.id===gid); if(!grupo) return;
  }
  const existentes=progActividadesEnGrupo(grupo,progAct);
  let act=existentes.find(a=>a.rubrica)||existentes[0]||null;
  if(act){
    if(!act.progActId) act.progActId=progAct.id;
    if(!act.rubrica){ if(!await cxPonerRubrica(grupo,act)) return; }
    cxAbrirEditor(grupo,act);
    return;
  }
  if(!(progAct.criterios||[]).length && !(progAct.rubrica||[]).length){
    if(!await confirmar(`«${progAct.nombre}» todavía no tiene criterios marcados, así que la rúbrica empezará en blanco y no contará para las competencias hasta que vincules sus ítems a criterios en el Corrector.\n\n¿Continuar?`)) return;
  }
  const trims=(progAct.sdaIds||[]).map(sid=>(p.sdas.find(s=>s.id===sid)||{}).trimestre).filter(t=>typeof t==="number"&&TRIMESTRES[t]);
  const trim=trims.length? Math.min(...trims) : state.ui.trim;
  act=progCrearActividadEnGrupo(grupo,progAct,trim);
  cxAbrirEditor(grupo,act);
  mostrarToast(`✓ Añadido a Evaluación de ${grupo.nombre} (${TRIMESTRES[trim]}) con rúbrica`);
};
/* Guardar la rúbrica de un examen del grupo en su actividad de la Programación. */
window.cxGuardarRubricaEnProgramacion=async examId=>{
  const grupo=grupoActual(); const act=grupo&&grupo.actividades.find(a=>a.id===examId); if(!act||!act.rubrica) return;
  const ref=cxProgActDe(grupo,act); if(!ref){ mostrarAviso("Este examen no procede de la Programación."); return; }
  if(Array.isArray(ref.progAct.rubrica)&&ref.progAct.rubrica.length){
    if(!await confirmar(`La Programación "${ref.prog.nombre}" ya tiene guardada una rúbrica para «${ref.progAct.nombre}». ¿Sustituirla por esta?`,{ok:"Sí, sustituir"})) return;
  }
  ref.progAct.rubrica=JSON.parse(JSON.stringify(act.rubrica));
  save(); render();
  mostrarToast("✓ Rúbrica guardada en la Programación");
};
window.progQuitarRubrica=async actId=>{
  const p=progPorId(state.ui.progId); const a=p&&p.actividades.find(x=>x.id===actId); if(!a) return;
  if(!await confirmar("¿Quitar la rúbrica guardada en la Programación para este examen? Los exámenes ya creados en los grupos conservan la suya.",{ok:"Quitar"})) return;
  delete a.rubrica; save(); render();
};

/* Acceso cruzado: abrir un examen concreto en el Corrector desde Evaluación por Competencias */
window.cxAbrirDesdeOtroModo=examId=>{
  state.ui.appMode="corrector"; state.ui.corTab="corregir"; state.ui.corExamId=examId; state.ui.corAlId="";
  save(); render();
};

