/* ============================================================================
   Cuaderno del profesor · Corrector de exámenes: motor de rúbricas
   js/corrector/motor-rubricas.js
   ============================================================================ */

/* =================================================================
   CORRECTOR DE EXÁMENES — motor de rúbricas
   Cada examen "esExamen" puede llevar una rúbrica propia (act.rubrica):
   apartados → ítems, cada ítem con una puntuación máxima y, opcionalmente,
   vinculado a uno o varios criterios de evaluación (con peso).
   De la rúbrica se calculan SIEMPRE dos notas independientes que se
   guardan en los mismos campos que ya usa Evaluación por Competencias:
     - Cuantitativa (grupo.notasCuant): suma de puntos de los ítems (0-10).
       Cuenta para la nota numérica del bloque/trimestre.
     - Cualitativa por criterio (grupo.notas): porcentaje logrado en los
       ítems vinculados a ESE criterio, en escala continua 0-10 (a
       diferencia de las demás actividades, que usan 4 niveles fijos).
       Cuenta para las competencias específicas y clave.
   No hay sincronización entre el Corrector y Evaluación por Competencias
   porque no hay dos bases de datos: es el mismo grupo, el mismo alumnado
   y los mismos campos de nota, vistos desde dos pantallas distintas.
   ================================================================= */
/* ---- Estructura de la rúbrica (v2) ----
   La rúbrica es una lista de APARTADOS. Cada apartado (y cada subapartado)
   es un "nodo" {id, title, items:[...], subs:[nodos], elegir}:
     - items: preguntas/ítems puntuables {id,label,max,desc,links}.
     - subs: subapartados, con la misma forma (hasta 3 niveles).
     - elegir: si es N>0, de sus hijos (ítems + subapartados) solo cuentan N
       (p. ej. "defina DOS de los cuatro conceptos", "elija UNA de las dos
       fuentes"): el máximo es el de los N mayores y, al corregir, cuentan los
       N hijos puntuados con más nota.
   Las rúbricas antiguas (apartados solo con items) siguen siendo válidas.
   Rúbricas adaptadas (NESE): act.variantes=[{id,nombre,rubrica,escalarA10,
   alumnos:[alId]}]. Un alumno/a incluido en una variante se corrige con ella;
   el resto, con act.rubrica. */
const CX_MAX_NIVELES=3;
function cxItemsFlat(rubrica){
  const out=[]; const walk=list=>(list||[]).forEach(n=>{ (n.items||[]).forEach(it=>out.push(it)); walk(n.subs); }); walk(rubrica); return out;
}
function cxNodosFlat(rubrica){
  const out=[]; const walk=(list,depth)=>(list||[]).forEach(n=>{ out.push({n,depth}); walk(n.subs,depth+1); }); walk(rubrica,0); return out;
}
function cxFindNodo(rubrica,id){ const r=cxNodosFlat(rubrica).find(x=>x.n.id===id); return r?r.n:null; }
/* Lista (array) que contiene al nodo id, para moverlo o borrarlo. */
function cxListaDeNodo(rubrica,id){
  if((rubrica||[]).some(n=>n.id===id)) return rubrica;
  for(const x of cxNodosFlat(rubrica)){ if((x.n.subs||[]).some(s=>s.id===id)) return x.n.subs; }
  return null;
}
function cxNivelNodo(rubrica,id){ const r=cxNodosFlat(rubrica).find(x=>x.n.id===id); return r?r.depth:0; }
function cxNumHijos(n){ return (n.items||[]).length+(n.subs||[]).length; }
function cxElegirEf(n){ const k=Number(n.elegir)||0; return (k>0 && k<cxNumHijos(n))? k : 0; }
function cxSumaElegidos(vals,k){
  if(k>0 && k<vals.length) return [...vals].sort((a,b)=>b-a).slice(0,k).reduce((s,v)=>s+v,0);
  return vals.reduce((s,v)=>s+v,0);
}
function cxMaxNodo(n){
  const vals=[...(n.items||[]).map(it=>Number(it.max)||0), ...(n.subs||[]).map(cxMaxNodo)];
  return cxSumaElegidos(vals,cxElegirEf(n));
}
function cxMaxTotal(rubrica){ return (rubrica||[]).reduce((s,n)=>s+cxMaxNodo(n),0); }
/* Evalúa un nodo con las puntuaciones de un alumno/a: puntos, si hay algo
   puntuado y qué ítems cuentan (los de los hijos elegidos). */
function cxEvalNodo(n,sc){
  const hijos=[
    ...(n.items||[]).map(it=>{ const v=sc[it.id]; const hay=v!=null&&v!==""; return {id:it.id,pts:hay?(Number(v)||0):0,hay,ids:[it.id]}; }),
    ...(n.subs||[]).map(s=>({id:s.id,...cxEvalNodo(s,sc)}))
  ];
  const k=cxElegirEf(n);
  const elegidos=k? [...hijos].sort((a,b)=>(Number(b.hay)-Number(a.hay))||(b.pts-a.pts)).slice(0,k) : hijos;
  return {pts:elegidos.reduce((s,h)=>s+h.pts,0), hay:hijos.some(h=>h.hay), ids:elegidos.flatMap(h=>h.ids), elegidosIds:elegidos.map(h=>h.id)};
}
function cxEvalRubrica(rubrica,sc){
  let pts=0; const ids=new Set();
  (rubrica||[]).forEach(n=>{ const e=cxEvalNodo(n,sc); pts+=e.pts; e.ids.forEach(i=>ids.add(i)); });
  return {pts,ids};
}
function cxCriteriosDeRubrica(rubrica){
  const set=new Set(); cxItemsFlat(rubrica).forEach(it=>(it.links||[]).forEach(l=>set.add(l.critId))); return [...set];
}
/* ---- Rúbricas adaptadas ---- */
function cxVariantes(act){ return Array.isArray(act&&act.variantes)? act.variantes : []; }
function cxVarianteDeAlumno(act,alId){ return cxVariantes(act).find(v=>(v.alumnos||[]).includes(alId))||null; }
function cxRubricaDe(act,alId){ const v=cxVarianteDeAlumno(act,alId); return v? v.rubrica : act.rubrica; }
function cxEscalarDe(act,alId){ const v=cxVarianteDeAlumno(act,alId); return v? v.escalarA10!==false : !!act.escalarA10; }
function cxTodasLasRubricas(act){ return [act.rubrica,...cxVariantes(act).map(v=>v.rubrica)].filter(Boolean); }
function cxCriteriosDeActividad(act){
  const set=new Set(); cxTodasLasRubricas(act).forEach(r=>cxCriteriosDeRubrica(r).forEach(c=>set.add(c))); return [...set];
}
function cxNotaCuant(grupo,alId,act){
  const sc=grupo.rubricScores?.[alId]?.[act.id]||{};
  const rub=cxRubricaDe(act,alId);
  let total=cxEvalRubrica(rub,sc).pts;
  // Si la rúbrica no suma 10 y tiene activada la conversión, la puntuación se
  // pasa a nota sobre 10. En cualquier caso, nunca >10.
  const max=cxMaxTotal(rub);
  if(cxEscalarDe(act,alId) && max>0 && Math.abs(max-10)>=0.01) total=total*10/max;
  total=Math.max(0,Math.min(10,total));
  return Math.round(total*100)/100;
}
function cxNotaCriterio(grupo,alId,act,critId){
  const sc=grupo.rubricScores?.[alId]?.[act.id]||{};
  const rub=cxRubricaDe(act,alId);
  const cuentan=cxEvalRubrica(rub,sc).ids;
  let sw=0,sv=0;
  cxItemsFlat(rub).forEach(it=>{
    if(!cuentan.has(it.id)) return;
    const link=(it.links||[]).find(l=>l.critId===critId); if(!link) return;
    const w=Number(link.peso)||0; if(w<=0) return;
    const max=Number(it.max)||0; if(max<=0) return;
    const val=sc[it.id]; if(val==null||val==="") return;
    sw+=w; sv+=(Number(val)/max)*10*w;
  });
  return sw>0? Math.round((sv/sw)*100)/100 : null;
}
function cxSyncCriteriosActividad(act){
  const ids=cxCriteriosDeActividad(act);
  act.criterios=ids.map(cid=>{
    const prev=(act.criterios||[]).find(l=>l.critId===cid);
    return {critId:cid, peso:prev?prev.peso:100};
  });
}
function cxRecalcAlumno(grupo,act,alId){
  if(aplicarMarca(grupo,act,alId)) return;
  const rub=cxRubricaDe(act,alId);
  const validos=new Set(cxItemsFlat(rub).map(it=>it.id));
  const perAct=grupo.rubricScores?.[alId]?.[act.id];
  const tieneAlgo = perAct && Object.keys(perAct).some(k=>validos.has(k));
  if(!tieneAlgo){
    if(grupo.notasCuant[alId]) delete grupo.notasCuant[alId][act.id];
    if(grupo.notas[alId]) delete grupo.notas[alId][act.id];
    return;
  }
  grupo.notasCuant[alId]=grupo.notasCuant[alId]||{};
  grupo.notasCuant[alId][act.id]=cxNotaCuant(grupo,alId,act);
  grupo.notas[alId]=grupo.notas[alId]||{};
  const destino=grupo.notas[alId][act.id]=grupo.notas[alId][act.id]||{};
  const critIds=cxCriteriosDeRubrica(rub);
  critIds.forEach(cid=>{
    const v=cxNotaCriterio(grupo,alId,act,cid);
    if(v==null) delete destino[cid]; else destino[cid]=v;
  });
  Object.keys(destino).forEach(cid=>{ if(!critIds.includes(cid)) delete destino[cid]; });
}
function cxRecalcTodosLosAlumnos(grupo,act){ grupo.alumnos.forEach(al=>cxRecalcAlumno(grupo,act,al.id)); }
function cxLimpiarPuntuacionesHuerfanas(grupo,act){
  const validIds=new Set(cxTodasLasRubricas(act).flatMap(r=>cxItemsFlat(r).map(it=>it.id)));
  Object.keys(grupo.rubricScores||{}).forEach(alId=>{
    const perAct=grupo.rubricScores[alId]?.[act.id]; if(!perAct) return;
    Object.keys(perAct).forEach(itemId=>{ if(!validIds.has(itemId)) delete perAct[itemId]; });
  });
  cxSyncCriteriosActividad(act);
  cxRecalcTodosLosAlumnos(grupo,act);
}
/* Rúbrica que se está editando ahora en el editor: la general o una adaptada. */
function cxActEditando(){ const grupo=grupoActual(); return grupo && grupo.actividades.find(a=>a.id===state.ui.corExamId) || null; }
function cxVarEditando(act){ return act && state.ui.corVarId ? cxVariantes(act).find(v=>v.id===state.ui.corVarId)||null : null; }
function cxRubEd(act){ const v=cxVarEditando(act); return v? v.rubrica : act.rubrica; }
function cxFindItem(secId,itemId){
  const act=cxActEditando(); if(!act) return null;
  const sec=cxFindNodo(cxRubEd(act),secId); if(!sec) return null;
  return (sec.items||[]).find(it=>it.id===itemId)||null;
}
/* ---- Criterios previstos del examen ----
   Son los criterios marcados al crear la actividad: en la Programación de
   Aula (si el examen viene de allí; un examen puede abarcar varias SdA y sus
   criterios pueden ser de varias CE), al crearlo en Evaluación por
   Competencias o en el Corrector. Sirven para dos cosas: en el editor de la
   rúbrica solo se ofrecen esos criterios para vincular, y se avisa si alguno
   se ha quedado sin vincular a ningún ítem (no se evaluaría en este examen).
   Devuelve null si el examen no tiene criterios previstos. */
function cxCriteriosPrevistos(grupo,act){
  const ref=cxProgActDe(grupo,act);
  if(ref && (ref.progAct.criterios||[]).length) return ref.progAct.criterios.map(c=>c.critId);
  if(Array.isArray(act.criteriosPrevistos) && act.criteriosPrevistos.length) return act.criteriosPrevistos.slice();
  return null;
}
function cxCriteriosSinVincular(grupo,act,rub){
  const prev=cxCriteriosPrevistos(grupo,act); if(!prev) return [];
  const usados=new Set(cxCriteriosDeRubrica(rub||act.rubrica));
  return prev.filter(c=>!usados.has(c));
}
/* Todas las rúbricas del examen (general y adaptadas) con lo que les falta. */
function cxAvisosCriterios(grupo,act){
  const out=[];
  const g=cxCriteriosSinVincular(grupo,act,act.rubrica); if(g.length) out.push({nombre:"",faltan:g});
  cxVariantes(act).forEach(v=>{ if(!(v.alumnos||[]).length) return; const f=cxCriteriosSinVincular(grupo,act,v.rubrica); if(f.length) out.push({nombre:v.nombre||"Adaptada",faltan:f}); });
  return out;
}
function cxCritChipsHTML(grupo,ids){ return ids.map(cid=>critLinkHTML(grupo.catalogoKey,cid)).join(" · "); }
/* Aviso compacto para listas (Corrector y Evaluación). */
function cxAvisoCriteriosBadgeHTML(grupo,act){
  if(!act.rubrica) return "";
  const av=cxAvisosCriterios(grupo,act); if(!av.length) return "";
  const n=new Set(av.flatMap(a=>a.faltan)).size;
  return `<div style="font-size:12.5px;margin-top:3px;color:var(--danger,#b91c1c);font-weight:600">⚠️ ${n} criterio${n===1?"":"s"} previsto${n===1?"":"s"} sin vincular en la rúbrica: ${cxCritChipsHTML(grupo,[...new Set(av.flatMap(a=>a.faltan))])}</div>`;
}
/* Nombres de las SdA que abarca el examen (si viene de la Programación). */
function cxSdasDeExamen(grupo,act){
  const ref=cxProgActDe(grupo,act); if(!ref) return [];
  return (ref.progAct.sdaIds||[]).map(sid=>ref.prog.sdas.find(s=>s.id===sid)).filter(Boolean).map(s=>s.titulo||"(SdA sin título)");
}
/* Selector de criterios agrupado por CE (para crear examen y para editar los previstos). */
function cxSelectorCriteriosHTML(catalogoKey,seleccion,onchange){
  const idx=catIndex(catalogoKey); const sel=new Set(seleccion||[]);
  return `<div class="scroll cx-selcrit" style="max-height:280px;overflow-y:auto;border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin-top:6px">
    ${idx.cat.ces.map(ce=>`
      <div style="font-size:12px;color:var(--mut);font-weight:600;margin:6px 0 3px">${ce.id} · ${esc(ce.titulo)}</div>
      ${ce.criterios.map(cr=>`<label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;padding:2px 0;cursor:pointer">
        <input type="checkbox" style="margin-top:3px" ${sel.has(cr.id)?"checked":""} onchange="${onchange}('${cr.id}',this.checked)">
        <span><strong>${cr.id}</strong> ${esc(cr.texto)}</span></label>`).join("")}
    `).join("")}
  </div>`;
}
/* Redibuja sin perder la posición de la lista de criterios ni de la página. */
function cxRenderConservandoScroll(){
  const caja=document.querySelector(".cx-selcrit"); const st=caja?caja.scrollTop:0; const wy=window.scrollY;
  render();
  const c2=document.querySelector(".cx-selcrit"); if(c2) c2.scrollTop=st;
  window.scrollTo(0,wy);
}
window.cxFormToggleCrit=(cid,on)=>{
  const f=state.ui.corForm; if(!Array.isArray(f.criterios)) f.criterios=[];
  f.criterios=f.criterios.filter(c=>c!==cid); if(on) f.criterios.push(cid);
  save(); cxRenderConservandoScroll();
};
window.cxTogglePrevisto=(cid,on)=>{
  const x=cxCtxEd(); if(!x) return;
  if(!Array.isArray(x.act.criteriosPrevistos)) x.act.criteriosPrevistos=[];
  x.act.criteriosPrevistos=x.act.criteriosPrevistos.filter(c=>c!==cid); if(on) x.act.criteriosPrevistos.push(cid);
  save(); cxRenderConservandoScroll();
};
window.cxToggleEditarPrevistos=()=>{ state.ui.corEditPrevistos=!state.ui.corEditPrevistos; save(); render(); };
window.cxToggleVerTodosCrit=()=>{ state.ui.corVerTodosCrit=!state.ui.corVerTodosCrit; save(); render(); };
/* Panel del editor: criterios previstos + aviso de los que faltan por vincular. */
function cxPanelPrevistosHTML(grupo,act,rub,variante){
  const prev=cxCriteriosPrevistos(grupo,act);
  const ref=cxProgActDe(grupo,act);
  const viaProg=!!(ref && (ref.progAct.criterios||[]).length);
  const sdas=cxSdasDeExamen(grupo,act);
  const faltan=cxCriteriosSinVincular(grupo,act,rub);
  const usados=new Set(cxCriteriosDeRubrica(rub));
  const extra=prev? [...usados].filter(c=>!prev.includes(c)) : [];
  const editando=!!state.ui.corEditPrevistos && !viaProg;
  let html=`<div class="card" style="${faltan.length?"border-left:4px solid var(--danger,#b91c1c)":""}">
    <div class="flex" style="justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
      <div style="flex:1;min-width:240px">
        <h2 style="font-size:14.5px;margin:0 0 4px">Criterios previstos para este examen</h2>
        <p class="sub" style="margin:0">${viaProg?`Marcados en la Programación «${esc(ref.prog.nombre)}»${sdas.length?` · ${sdas.length>1?"abarca":"de"} ${sdas.map(esc).join(", ")}`:""}. Para cambiarlos, hazlo allí.`
          : prev? "Marcados al crear el examen." : "Este examen no tiene criterios previstos: márcalos para que la rúbrica solo te ofrezca esos y te avise si se queda alguno sin vincular."}</p>
      </div>
      ${!viaProg?`<button class="ghost small" style="border:1px solid var(--line)" onclick="cxToggleEditarPrevistos()">${editando?"Hecho":prev?"Cambiar criterios previstos":"Marcar criterios previstos"}</button>`:""}
    </div>
    ${prev?`<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px 10px">${prev.map(cid=>`<span style="font-size:12.5px;padding:2px 8px;border-radius:999px;${usados.has(cid)?"background:#dcece0;color:#1e5631":"background:#f3dcdc;color:#912525;font-weight:600"}" title="${usados.has(cid)?"Vinculado a algún ítem de la rúbrica":"Sin vincular: no se evaluará en este examen"}">${usados.has(cid)?"✓":"⚠️"} ${critLinkHTML(grupo.catalogoKey,cid)}</span>`).join("")}</div>`:""}
    ${editando?cxSelectorCriteriosHTML(grupo.catalogoKey,act.criteriosPrevistos||[],"cxTogglePrevisto"):""}
    ${faltan.length?`<p style="margin:10px 0 0;font-size:13px;color:var(--danger,#b91c1c);font-weight:600">⚠️ ${faltan.length===1?"Hay 1 criterio previsto":`Hay ${faltan.length} criterios previstos`} sin vincular a ningún ítem${variante?" de esta rúbrica adaptada":""}: ${cxCritChipsHTML(grupo,faltan)}. No se evaluará${faltan.length===1?"":"n"} en este examen hasta que lo${faltan.length===1?"":"s"} vincules a alguna pregunta (botón «Vincular criterios» de cada ítem).</p>`:""}
    ${extra.length?`<p class="sub" style="margin:8px 0 0">También vinculado${extra.length===1?"":"s"} aunque no estaba${extra.length===1?"":"n"} previsto${extra.length===1?"":"s"}: ${cxCritChipsHTML(grupo,extra)}.</p>`:""}
  </div>`;
  return html;
}
function cxExamenesRubrica(grupo){ return grupo.actividades.filter(a=>a.esExamen && a.rubrica && a.trimestre===state.ui.trim); }

