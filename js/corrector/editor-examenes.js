/* ============================================================================
   Cuaderno del profesor · Editor de exámenes dentro del Corrector (pestaña «Diseño»)
   js/corrector/editor-examenes.js
   ============================================================================ */

/* =================================================================
   EDITOR DE EXÁMENES dentro del Corrector (pestaña «Diseño»)
   - El editor corre en un iframe aislado (editor/index.html) y NO escribe en el
     estado principal: los diseños van a su propia base IndexedDB
     (cuaderno_examenes_v1) para no inflar localStorage ni la pila de deshacer.
   - Clave del diseño = id de la actividad del grupo (y "prog:<id>" como
     plantilla de la Programación para reutilizarlo en otros grupos).
   - Las copias «Exportar todo» incluyen los diseños (_examenesDiseno).
   ================================================================= */
let _exDBp=null,_exFrame=null,_exFirma="",_exFull=false;
window.exPantallaCompleta=on=>{ _exFull=!!on; const w=document.getElementById("exWrap"); if(w) w.classList.toggle("ex-full",_exFull); document.documentElement.style.overflow=_exFull?"hidden":""; document.documentElement.classList.toggle("ex-pantalla-completa",_exFull); };
function exDB(){ return _exDBp||(_exDBp=new Promise((ok,ko)=>{ const r=indexedDB.open("cuaderno_examenes_v1",2); r.onupgradeneeded=()=>{ const d=r.result; if(!d.objectStoreNames.contains("examenes")) d.createObjectStore("examenes",{keyPath:"key"}); if(!d.objectStoreNames.contains("copias")) d.createObjectStore("copias",{keyPath:"ts"}); }; r.onsuccess=()=>ok(r.result); r.onerror=()=>{ _exDBp=null; ko(r.error); }; })); }
function exTx(modo,fn,store){ store=store||"examenes"; return exDB().then(db=>new Promise((ok,ko)=>{ const t=db.transaction(store,modo); const rq=fn(t.objectStore(store)); t.oncomplete=()=>ok(rq&&rq.result); t.onerror=t.onabort=()=>ko(t.error); })); }
/* v2: copia en memoria de todos los diseños. Permite preparar «Exportar copia» y
   «Exportar paquete» sin esperar a la base de datos: en iPad, el menú Compartir
   solo se abre si se llama justo después del toque. */
let _exCache=null;
const exGet=k=>exTx("readonly",s=>s.get(k)),
  exPut=r=>{ if(_exCache) _exCache.set(r.key,r); return exTx("readwrite",s=>s.put(r)); },
  exBorrar=k=>{ if(_exCache) _exCache.delete(k); return exTx("readwrite",s=>s.delete(k)); },
  exLeerTodos=()=>exTx("readonly",s=>s.getAll()).then(r=>r||[]).catch(()=>[]);
function exTodosSync(){ return _exCache? [..._exCache.values()] : null; }
exLeerTodos().then(a=>{ const m=new Map(a.map(r=>[r.key,r])); if(_exCache) _exCache.forEach((v,k)=>m.set(k,v)); _exCache=m; });
async function exGuardarVarios(a){ for(const r of a) try{ await exPut(r); }catch(e){} }
/* Modelo que se está viendo en el Diseño: "" (el general, modelo A), "B" o "C". */
function exModeloViendo(act){ const l=state.ui.corModelo; return l&&!cxVarEditando(act)&&mbModelo(act,l)? l : ""; }
function exClave(act){ const v=cxVarEditando(act), l=exModeloViendo(act); return v? act.id+":"+v.id : (l? act.id+":"+l : act.id); }
window.exSel=id=>{ state.ui.corModelo=""; cxElegirVariante(id); };
window.exVerModelo=letra=>{ state.ui.corModelo=MB_LETRAS.includes(letra)?letra:""; state.ui.corVarId=""; save(); render(); };
window.exVerB=async()=>{ const g=grupoActual(), act=g&&g.actividades.find(a=>a.id===state.ui.corExamId); if(act&&!mbModelo(act,"B")) return exNuevoModelo(); exVerModelo("B"); };
/* «+ Modelo B / C»: se crea al abrir su pestaña (sale del examen general). Tres modelos como máximo. */
window.exNuevoModelo=async()=>{
  const g=grupoActual(), act=g&&g.actividades.find(a=>a.id===state.ui.corExamId); if(!act) return;
  const l=mbSiguienteLetra(act); if(!l){ mostrarAviso("Como máximo hay tres modelos: A, B y C."); return; }
  exFlush();
  if(!await exGet(act.id)){ mostrarAviso("Diseña antes el examen general: los modelos se generan a partir de él."); return; }
  // Se apunta ya (para que las pestañas lo muestren); su examen se construye al abrirlo, desde el general.
  // Si quedaba un diseño suelto de antes con esa clave, se aprovecha su orden.
  const viejo=await exGet(act.id+":"+l);
  if(!act.modelos||!Array.isArray(act.modelos.lista)) act.modelos={lista:[],asignados:{}};
  act.modelos.lista.push({letra:l,orden:viejo&&viejo.exam?mbOrdenDe(viejo.exam):{}});
  act.modelos.lista.sort((a,b)=>a.letra.localeCompare(b.letra));
  exVerModelo(l);
};
window.exQuitarModelo=async()=>{
  const g=grupoActual(), act=g&&g.actividades.find(a=>a.id===state.ui.corExamId); if(!act) return;
  const l=exModeloViendo(act); if(!l||!mbModelo(act,l)) return;
  const n=Object.values((mbModelos(act)||{}).asignados||{}).filter(x=>x===l).length, hayC=l==="B"&&mbModelo(act,"C");
  if(!await confirmar(`¿Quitar el modelo ${l}?${n?` ${n} alumno${n===1?"":"s"} que lo ${n===1?"hace pasa":"hacen pasan"} al modelo A.`:""}${hayC?" El modelo C pasará a llamarse B.":""}\n\nLa rúbrica y lo ya corregido no cambian.`,{ok:"Quitar modelo "+l})) return;
  await mbQuitar(act,l);
  state.ui.corModelo=""; save(); render();
  mostrarToast(`Modelo ${l} quitado`,"info");
};
/* Desde el Diseño: si el examen aún no tiene rúbrica, se le pone primero (como al pasar a la pestaña Rúbrica). */
window.exNuevoAdaptado=async()=>{
  const g=grupoActual(), act=g&&g.actividades.find(a=>a.id===state.ui.corExamId); if(!act) return;
  if(!act.rubrica && !await cxPonerRubrica(g,act)) return;
  exFlush(); cxNuevoAlternativo();
};
/* Otro orden al azar para el modelo que se está viendo (sale del examen general actual). */
window.exMezclar=async()=>{
  const g=grupoActual(), act=g&&g.actividades.find(a=>a.id===state.ui.corExamId), win=_exFrame&&_exFrame.contentWindow;
  if(!act||!win||!win.__ee) return;
  const l=exModeloViendo(act), m=l&&mbModelo(act,l); if(!m) return;
  const gen=(await exGet(act.id)||{}).exam; if(!gen){ mostrarAviso("Diseña antes el examen general."); return; }
  m.orden={};
  const r=await mbActualizarModelo(act,l,gen,win); if(!r) return;
  win.__ee.cargar(r.exam); const g0=win.__ee.get(); g0.updated=0; _exFirma=JSON.stringify(g0);
  save(); render();
  mostrarToast(r.repetido?`Con tan pocas preguntas no hay otro orden distinto para el modelo ${l}`:`🔀 Nuevo orden para el modelo ${l}`,r.repetido?"info":undefined);
};
function exSelectorVariante(act){
  const vs=cxVariantes(act), vid=state.ui.corVarId, l=exModeloViendo(act), ms=mbLista(act), sig=mbSiguienteLetra(act);
  return `<button class="tab ${!cxVarEditando(act)&&!l?"on":""}" onclick="exSel('')">Examen general${ms.length?" · modelo A":""}</button>`
    +ms.map(m=>`<button class="tab ${!cxVarEditando(act)&&l===m.letra?"on":""}" title="Mismo examen con las preguntas en otro orden; comparte la rúbrica, que al corregir sale en el orden de cada modelo" onclick="exVerModelo('${m.letra}')">Modelo ${m.letra}</button>`).join("")
    +(sig?`<button class="ghost" style="border:1px dashed var(--line)" title="Mismo examen con las preguntas en otro orden, para repartir el día del examen y evitar la copia (hasta tres modelos: A, B y C)" onclick="exNuevoModelo()">+ Modelo ${sig}</button>`:"")
    +vs.map(v=>`<button class="tab ${vid===v.id?"on":""}" title="${v.tipo==="ausencia"?"Examen alternativo para quien no vino el día del examen":"Examen adaptado (NESE)"}" onclick="cxElegirVariante('${v.id}')">${v.tipo==="ausencia"?"📅 ":""}${esc(v.nombre||"Examen alternativo")}${v.fecha?" · "+esc(cxFechaCorta(v.fecha)):""}</button>`).join("")
    +`<button class="ghost" style="border:1px dashed var(--line)" title="Examen con otras preguntas para uno o varios alumnos/as: quien no vino el día del examen o el alumnado NESE. Se corrige con su propia rúbrica y su nota cuenta en este mismo examen." onclick="exNuevoAdaptado()">+ Examen alternativo</button>`;
}
/* Aviso de diseños sin exportar (solo cuenta; no toca el estado de la app) */
const EX_PEND="cuaderno_ex_sin_copia";
function exPendientes(){ try{ return JSON.parse(localStorage.getItem(EX_PEND)||"[]"); }catch(e){ return []; } }
function exMarcarPendiente(k){ try{ const a=exPendientes(); if(!a.includes(k)){ a.push(k); localStorage.setItem(EX_PEND,JSON.stringify(a)); } }catch(e){} }
function exLimpiarPendientes(){ try{ localStorage.removeItem(EX_PEND); }catch(e){} }
function exAvisoCopia(){
  const n=exPendientes().length; if(!n) return "";
  if(Date.now()-(state.lastBackupAt||0)<3*864e5) return "";
  return `<span style="font-size:12.5px;color:var(--danger,#b91c1c)">⚠️ ${n} diseño${n===1?"":"s"} sin exportar · <a href="#" onclick="exportarTodo();return false">Exportar todo</a></span>`;
}
function exModal(html){
  const d=document.createElement("div"); d.className="modal-overlay"; d.style.zIndex="1500";
  d.innerHTML=`<div class="modal-box" style="max-width:660px;max-height:85vh;overflow:auto">${html}<div class="flex" style="justify-content:flex-end;margin-top:14px"><button class="btn">Cerrar</button></div></div>`;
  d.onclick=e=>{ if(e.target===d||e.target.tagName==="BUTTON") d.remove(); };
  document.body.appendChild(d);
}
/* Panel de cobertura: qué criterios evalúa el examen y cuánto pesa cada uno */
window.exCobertura=()=>{
  const grupo=grupoActual(), act=grupo&&grupo.actividades.find(a=>a.id===state.ui.corExamId);
  if(!act||!_exFrame||!_exFrame.contentWindow.__ee){ mostrarAviso("El editor todavía no ha cargado."); return; }
  exFlush();
  const est=exConReparto(_exFrame.contentWindow.__ee.estructura()), hojas=[];
  exHojas(est.nodos).forEach(n=>hojas.push(n));
  if(!hojas.length){ mostrarAviso("El examen aún no tiene preguntas con puntuación."); return; }
  const total=hojas.reduce((a,h)=>a+h.max,0), pts=new Map();
  hojas.forEach(h=>{ const c=h.crit||[]; c.forEach(id=>pts.set(id,(pts.get(id)||0)+h.max/c.length)); });
  const lista=exCriteriosDe(grupo,act), prev=cxCriteriosPrevistos(grupo,act), conPrev=!!(prev&&prev.length);
  const filas=lista.filter(c=>conPrev||pts.has(c.id)).map(c=>{ const p=pts.get(c.id)||0;
    return `<tr${p?"":' style="color:var(--danger,#b91c1c)"'}><td style="padding:3px 8px 3px 0;white-space:nowrap">${esc(c.id)}</td><td style="padding:3px 8px;font-size:12px">${esc(c.texto)}</td><td style="padding:3px 0;text-align:right;white-space:nowrap">${p?cxFmtPts(p)+" pts · "+Math.round(p/total*100)+" %":"sin evaluar"}</td></tr>`; }).join("");
  const sinCrit=hojas.filter(h=>!(h.crit||[]).length), av=[];
  if(Math.abs(total-10)>0.01) av.push(`El examen suma ${cxFmtPts(total)} puntos (no 10). Se escalará a 10 si la rúbrica está en «convertir a 10».`);
  (est.descuadres||[]).forEach(d=>av.push(`«${esc(String(d.label).slice(0,50))}» vale ${cxFmtPts(d.max)} pts, pero sus partes suman ${cxFmtPts(d.suma)}. La rúbrica copia las partes (${cxFmtPts(d.suma)} pts): corrige los puntos en el Diseño y vuelve a importar.`));
  if((est.repartidos||[]).length) av.push(`${est.repartidos.length} pregunta${est.repartidos.length===1?"":"s"} con subpreguntas sin puntos propios (${est.repartidos.slice(0,4).map(s=>esc(String(s).slice(0,40))).join("; ")}${est.repartidos.length>4?"…":""}): la rúbrica reparte sus puntos a partes iguales. Pon puntos a cada subpregunta en el Diseño si quieres otro reparto.`);
  if(sinCrit.length) av.push(`${sinCrit.length} pregunta${sinCrit.length===1?"":"s"} sin criterio: ${sinCrit.slice(0,6).map(h=>esc(h.label.slice(0,40))).join("; ")}${sinCrit.length>6?"…":""}`);
  if(conPrev){ const f=lista.filter(c=>!pts.has(c.id)).length; if(f) av.push(`${f} criterio${f===1?"":"s"} previsto${f===1?"":"s"} para este examen no se evalúa${f===1?"":"n"} en ninguna pregunta.`); }
  exModal(`<h2 style="font-size:16.5px;margin-bottom:4px">📊 Cobertura de criterios</h2><p class="sub" style="margin:0 0 10px">${hojas.length} ${hojas.length===1?"ítem puntuable":"ítems puntuables"} · ${cxFmtPts(total)} puntos${conPrev?" · criterios previstos del examen":" · criterios marcados"}</p>
    ${av.length?`<div class="alert-box" style="margin-bottom:10px">${av.map(a=>"• "+a).join("<br>")}</div>`:`<p style="color:var(--ok,#15803d);margin:0 0 10px">✓ Sin avisos: todas las preguntas tienen criterio y el total es correcto.</p>`}
    ${filas?`<table style="width:100%;border-collapse:collapse;font-size:13px">${filas}</table>`:`<p class="sub">Ninguna pregunta tiene criterios marcados todavía.</p>`}`);
};
/* Análisis del examen ya corregido: acierto medio por pregunta y por criterio */
window.exAnalisis=()=>{
  const g=grupoActual(), act=g&&g.actividades.find(a=>a.id===state.ui.corExamId); if(!act||!act.rubrica){ mostrarAviso("Este examen aún no tiene rúbrica."); return; }
  const items=new Map(), crits=new Map(); let n=0, sumN=0, nN=0;
  g.alumnos.forEach(al=>{
    if(marcaDe(g,al.id,act.id)) return;
    const sc=g.rubricScores&&g.rubricScores[al.id]&&g.rubricScores[al.id][act.id]; if(!sc||!Object.keys(sc).length) return;
    n++; const nota=g.notasCuant&&g.notasCuant[al.id]&&g.notasCuant[al.id][act.id]; if(nota!=null){ sumN+=nota; nN++; }
    cxItemsFlat(cxRubricaDe(act,al.id)).forEach(it=>{
      const v=sc[it.id]; if(v==null||v==="") return;
      const val=Number(v), max=Number(it.max)||0; if(!isFinite(val)||!max) return;
      const key=it.fuenteId||it.id, r=items.get(key)||{label:exEtiquetaItem(cxRubricaDe(act,al.id),it),sum:0,max:0,n:0}; r.sum+=val; r.max+=max; r.n++; items.set(key,r);
      (it.links||[]).forEach(l=>{ const w=(Number(l.peso)||0)/100, c=crits.get(l.critId)||{sum:0,max:0}; c.sum+=val*w; c.max+=max*w; crits.set(l.critId,c); });
    });
  });
  if(!n){ mostrarAviso("Todavía no hay alumnado corregido con la rúbrica de este examen."); return; }
  const barra=p=>`<div style="background:var(--line);height:6px;border-radius:3px;min-width:70px"><div style="width:${Math.max(2,p)}%;height:6px;border-radius:3px;background:${p<50?"#b91c1c":p<70?"#d97706":"#15803d"}"></div></div>`;
  const fila=(t,r)=>{ const p=Math.round(r.sum/r.max*100); return `<tr><td style="padding:4px 8px 4px 0;font-size:12.5px">${t}</td><td style="padding:4px 8px;width:90px">${barra(p)}</td><td style="padding:4px 0;text-align:right;white-space:nowrap;font-size:12.5px">${p} %</td></tr>`; };
  const arr=[...items.values()], peores=arr.filter(r=>r.sum/r.max<0.5).sort((a,b)=>a.sum/a.max-b.sum/b.max).slice(0,3);
  exModal(`<h2 style="font-size:16.5px;margin-bottom:4px">📈 Análisis de «${esc(act.nombre)}»</h2>
    <p class="sub" style="margin:0 0 10px">${n} alumno${n===1?"":"s"} corregido${n===1?"":"s"}${nN?` · nota media ${cxFmtPts(sumN/nN)}`:""} · porcentaje medio de puntos logrados</p>
    ${peores.length?`<div class="alert-box" style="margin-bottom:10px">Preguntas con menos del 50 % de acierto: ${peores.map(r=>esc(String(r.label).slice(0,50))).join("; ")}.</div>`:""}
    <h3 style="font-size:13.5px;margin:6px 0">Por pregunta</h3><table style="width:100%;border-collapse:collapse">${arr.map(r=>fila(esc(String(r.label||"(sin enunciado)").slice(0,120)),r)).join("")}</table>
    ${crits.size?`<h3 style="font-size:13.5px;margin:12px 0 6px">Por criterio de evaluación</h3><table style="width:100%;border-collapse:collapse">${[...crits.entries()].map(([id,r])=>r.max?fila(esc(id),r):"").join("")}</table>`:""}`);
};
/* Enunciado del diseño junto a cada ítem al corregir (se rellena de forma asíncrona) */
function exTextoNodo(n){
  const plano=x=>{ const t=document.createElement("template"); t.innerHTML=String(x||"").replace(/<br\s*\/?>/gi," ").replace(/\n/g," "); return t.content.textContent.replace(/\s+/g," ").trim(); };
  let s=plano(n.text)||plano(n.title);
  const subs=(n.children||[]).filter(c=>c.type==="subquestion"&&plano(c.text)).map((c,i)=>String.fromCharCode(97+i)+") "+plano(c.text));
  if(subs.length) s+=(s?"\n":"")+subs.join("\n");
  return s.slice(0,600);
}
async function exPintarEnunciados(){
  try{
    const els=[...document.querySelectorAll("[data-fuente]")].filter(e=>e.dataset.fuente&&!e.querySelector(".ex-enun")); if(!els.length) return;
    const g=grupoActual(), act=g&&g.actividades.find(a=>a.id===state.ui.corExamId); if(!act) return;
    const va=state.ui.corAlId? cxVarianteDeAlumno(act,state.ui.corAlId):null;
    let rec=va? await exGet(act.id+":"+va.id):null; if(!rec) rec=await exGet(act.id); if(!rec) return;
    const mapa=new Map(); (function w(l){ (l||[]).forEach(n=>{ mapa.set(n.id,n); w(n.children); }); })(rec.exam.body);
    const norm=s=>String(s||"").replace(/\s+/g," ").trim();
    els.forEach(e=>{ const n=mapa.get(e.dataset.fuente); if(!n||e.querySelector(".ex-enun")) return; const tx=exTextoNodo(n); if(!tx) return;
      const visto=e.dataset.unico? null : norm(e.firstElementChild&&e.firstElementChild.textContent);
      if(e.dataset.unico? tx.length<=400 : (visto&&visto.includes(norm(tx).slice(0,80)))) return;   // ya se ve en la rúbrica
      const d=document.createElement("div"); d.className="ex-enun"; d.style.cssText="font-size:11.5px;color:var(--mut);margin-top:3px;white-space:pre-wrap;max-height:84px;overflow:auto;border-left:2px solid var(--line);padding-left:6px"; d.textContent=tx; e.insertBefore(d,e.querySelector(".ex-coment")); });
  }catch(e){}
}
window.exTogglePreg=()=>{ state.ui.corModoPreg=!state.ui.corModoPreg; save(); render(); };
window.exElegirPreg=k=>{ state.ui.corPregSel=k; save(); render(); };
window.exPregScore=(alId,actId,itemId,inp)=>{
  if(inp.value==="NP"){ setMarca(alId,actId,"NP"); return; }
  const r0=render; render=function(){};
  try{ cxSetItemScore(alId,actId,itemId,inp.value); } finally{ render=r0; }
  const g=grupoActual(), v=g&&g.rubricScores&&g.rubricScores[alId]&&g.rubricScores[alId][actId]&&g.rubricScores[alId][actId][itemId];
  if(inp.tagName==="SELECT"){
    const s=v==null?"":String(v);
    if(s!==""&&![...inp.options].some(o=>o.value===s)){ const o=document.createElement("option"); o.value=s; o.textContent=cxFmtPts(v); inp.appendChild(o); }
    inp.value=s;
  } else inp.value=v==null?"":String(v).replace(".",",");
};
window.exEnter=(ev,inp)=>{ if(ev.key!=="Enter") return; ev.preventDefault(); const all=[...document.querySelectorAll(".ex-preg-in")], i=all.indexOf(inp); inp.blur(); const nx=all[i+1]||inp; nx.focus(); if(nx.select) nx.select(); };
function exRenderPorPregunta(grupo,act){
  const c=document.getElementById("tabContent"), gen=cxItemsFlat(act.rubrica), keyOf=it=>it.fuenteId||it.id;
  if(!gen.length){ state.ui.corModoPreg=false; c.innerHTML='<div class="card"><p class="sub">Este examen todavía no tiene preguntas en la rúbrica.</p></div>'; return; }
  const sel=gen.find(it=>keyOf(it)===state.ui.corPregSel)||gen[0], k=keyOf(sel);
  const filas=grupo.alumnos.map(al=>{
    const it=cxItemsFlat(cxRubricaDe(act,al.id)).find(x=>keyOf(x)===k);
    const v=grupo.rubricScores&&grupo.rubricScores[al.id]&&grupo.rubricScores[al.id][act.id]&&it? grupo.rubricScores[al.id][act.id][it.id] : null;
    const rubAl=cxRubricaDe(act,al.id), nivAl=cxnNiveles(rubAl), posAl=it&&nivAl.length&&marcaDe(grupo,al.id,act.id)!=="NP"? cxnPosicion(it,v,nivAl) : null;
    const botones=it&&nivAl.length? `<span class="cxn-mini" role="group" aria-label="Nivel de ${esc(al.nombre)}">${nivAl.map((l,i)=>{ const col=cxnColor(l.color,i), on=!!(posAl&&posAl.exacto===l.id);
      return `<button type="button" class="cxn-mini-btn${on?" on":""}" style="--cxn:${col};--cxn-tinta:${cxnTinta(col)}" aria-pressed="${on}" onclick="cxnElegir('${al.id}','${act.id}','${it.id}','${l.id}')">${esc(l.nombre||"")}</button>`; }).join("")}</span> ` : "";
    const celda= marcaDe(grupo,al.id,act.id)==="EX"? '<span class="badge">Exento</span>'
      : it? `${botones}${cxSelectPuntuacionHTML(it.max,v,"ex-preg-in",`onchange="exPregScore('${al.id}','${act.id}','${it.id}',this)" onkeydown="exEnter(event,this)"`,marcaDe(grupo,al.id,act.id)==="NP")} <span style="font-size:12px;color:var(--mut)">/ ${cxFmtPts(it.max)}</span>`
      : `<span style="color:var(--mut);font-size:12.5px">— su rúbrica adaptada no incluye esta ${cxEsNiveles(act.rubrica)?"categoría":"pregunta"}</span>`;
    return `<tr><td style="padding:5px 8px 5px 0">${esc(al.nombre)}${neseBadgeHTML(al)}</td><td>${celda}</td></tr>`;
  }).join("");
  c.innerHTML=`<div class="card"><div class="flex" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h2 style="font-size:15px">${esc(act.nombre)} · corregir por ${cxEsNiveles(act.rubrica)?"categoría":"pregunta"}</h2>
    <button class="ghost" style="border:1px solid var(--line)" onclick="exTogglePreg()">← Corregir por alumno/a</button></div>
    <label style="font-size:12.5px;color:var(--mut);display:block;margin-top:8px">${cxEsNiveles(act.rubrica)?"Categoría":"Pregunta"}<select class="in" style="width:100%;margin-top:4px" onchange="exElegirPreg(this.value)">${gen.map(it=>`<option value="${esc(keyOf(it))}" ${keyOf(it)===k?"selected":""}>${esc(exEtiquetaItem(act.rubrica,it).slice(0,110))} · ${cxFmtPts(it.max)} pts</option>`).join("")}</select></label>
    <div data-fuente="${esc(sel.fuenteId||"")}" style="margin-top:6px"></div>
    <p class="sub" style="margin:8px 0 0;font-size:12px">${cxEsNiveles(act.rubrica)?"Pulsa el nivel de cada alumno/a o afina los puntos en el desplegable":"Elige la puntuación en el desplegable"} (Intro pasa al siguiente alumno/a). «—» = sin puntuar.</p></div>
    <div class="card"><table style="width:100%"><tbody>${filas}</tbody></table></div>`;
}
/* Fase 3 · Paquete reutilizable: examen + rúbrica + variantes NESE + versión B (sin alumnado ni notas) */
window.exExportarPaquete=async()=>{
  const g=grupoActual(), act=g&&g.actividades.find(a=>a.id===state.ui.corExamId);
  if(!act||!act.rubrica){ mostrarAviso("Este examen todavía no tiene rúbrica que exportar."); return; }
  exFlush();
  if(!_exCache) await exLeerTodos().then(a=>{ _exCache=new Map(a.map(r=>[r.key,r])); });
  const get=k=>{ const r=_exCache.get(k); return r?r.exam:null; };
  const vs=cxVariantes(act), disenos={general:get(act.id),B:get(act.id+":B"),modelos:{},variantes:{}};
  mbLista(act).forEach(m=>{ const e=get(act.id+":"+m.letra); if(e) disenos.modelos[m.letra]=e; });
  for(const v of vs){ const e=get(act.id+":"+v.id); if(e) disenos.variantes[v.id]=e; }
  const _cat=getCatalogo(g.catalogoKey)||{};
  const paquete={tipo:"paquete-examen",version:1,nombre:act.nombre,catalogoKey:g.catalogoKey,cursoNombre:[_cat.materia,_cat.curso].filter(Boolean).join(" · "),escalarA10:act.escalarA10!==false,criteriosPrevistos:act.criteriosPrevistos||[],
    rubrica:act.rubrica,variantes:vs.map(v=>({id:v.id,nombre:v.nombre,tipo:v.tipo||"nese",escalarA10:v.escalarA10!==false,rubrica:v.rubrica})),disenos,
    ordenB:mbModelo(act,"B")?mbModelo(act,"B").orden:null,   // para versiones anteriores de la app
    ordenes:Object.fromEntries(mbLista(act).map(m=>[m.letra,m.orden]))};
  const slug=String(act.nombre).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"examen";
  await guardarArchivo(new Blob([JSON.stringify(paquete)],{type:"application/json"}),"paquete-examen-"+slug+".json");
};
window.exImportarPaquete=()=>{
  const inp=document.createElement("input"); inp.type="file"; inp.accept=".json,application/json";
  inp.onchange=async()=>{
    const f=inp.files&&inp.files[0]; if(!f) return;
    let p; try{ p=JSON.parse(await f.text()); }catch(e){ mostrarAviso("El archivo no es un JSON válido."); return; }
    if(!p||p.tipo!=="paquete-examen"||!Array.isArray(p.rubrica)){ mostrarAviso("Este archivo no es un paquete de examen."); return; }
    const grupo=grupoActual(); if(!grupo) return;
    let sinVinculos=false;
    if(p.catalogoKey && p.catalogoKey!==grupo.catalogoKey){
      const c=getCatalogo(grupo.catalogoKey)||{}, aqui=[c.materia,c.curso].filter(Boolean).join(" · ")||grupo.nombre;
      sinVinculos=!await confirmar(`Este paquete se preparó para «${p.cursoNombre||p.catalogoKey}» y este grupo es de «${aqui}».\n\nLos criterios de evaluación se enlazan por su número (1.1, 2.3…), y en otro curso ese número puede ser otro criterio. Consérvalos solo si los criterios coinciden en los dos cursos (por ejemplo, 3.º y 4.º ESO).`,{titulo:"📥 Paquete de otro curso",ok:"Conservar vínculos",cancelar:"Quitar vínculos",peligro:false});
      if(sinVinculos){
        const limpiaR=r=>{ (function w(l){ (l||[]).forEach(n=>{ (n.items||[]).forEach(it=>{ it.links=[]; }); w(n.subs); }); })(r); return r; };
        p.rubrica=limpiaR(JSON.parse(JSON.stringify(p.rubrica))); (p.variantes||[]).forEach(v=>{ v.rubrica=limpiaR(JSON.parse(JSON.stringify(v.rubrica||[]))); });
        p.criteriosPrevistos=[];
        const limpiaE=ex=>{ if(!ex) return ex; const e=JSON.parse(JSON.stringify(ex)); (function w(l){ (l||[]).forEach(n=>{ delete n.crit; w(n.children); }); })(e.body); return e; };
        if(p.disenos){ p.disenos.general=limpiaE(p.disenos.general); p.disenos.B=limpiaE(p.disenos.B); ["modelos","variantes"].forEach(g=>Object.keys(p.disenos[g]||{}).forEach(k=>{ p.disenos[g][k]=limpiaE(p.disenos[g][k]); })); }
      }
    }
    const ok=cxCriteriosValidosEnCatalogo(grupo.catalogoKey), mapaVar=[];
    const act={ id:uid(), trimestre:state.ui.trim, nombre:String(p.nombre||"Examen importado"), tipo:"Prueba objetiva / examen",
      bloqueId:defBloque("Prueba objetiva / examen",grupo.bloques), esExamen:true, pesoBloque:"", criterios:[], sda:"",
      rubrica:cxClonarRubrica(p.rubrica,grupo.catalogoKey), escalarA10:p.escalarA10!==false, criteriosPrevistos:(p.criteriosPrevistos||[]).filter(c=>ok.has(c)) };
    const vs=(p.variantes||[]).map(v=>{ const nv={id:uid(),nombre:v.nombre||"Adaptada",rubrica:cxClonarRubrica(v.rubrica,grupo.catalogoKey),escalarA10:v.escalarA10!==false,alumnos:[]}; if(v.tipo==="ausencia") nv.tipo="ausencia"; mapaVar.push([v.id,nv.id]); return nv; });
    if(vs.length) act.variantes=vs;
    // Mismo orden de preguntas de cada modelo (los paquetes antiguos solo traen el del B).
    const ordenes=(p.ordenes&&typeof p.ordenes==="object")? p.ordenes : (p.ordenB&&typeof p.ordenB==="object"? {B:p.ordenB} : {});
    const lista=MB_LETRAS.filter(l=>ordenes[l]&&typeof ordenes[l]==="object").map(l=>({letra:l,orden:JSON.parse(JSON.stringify(ordenes[l]))}));
    if(lista.length) act.modelos={lista,asignados:{}};
    cxSyncCriteriosActividad(act);
    grupo.actividades.push(act);
    const d=p.disenos||{}, nuevo=ex=>{ const e=JSON.parse(JSON.stringify(ex)); e.id=uid(); return e; };
    const guarda=async(k,ex)=>{ if(!ex) return; await exPut({key:k,exam:nuevo(ex),actualizado:Date.now(),nombre:act.nombre}); exMarcarPendiente(k); };
    try{
      await guarda(act.id,d.general);
      for(const m of (act.modelos?act.modelos.lista:[])) await guarda(act.id+":"+m.letra,(d.modelos&&d.modelos[m.letra])||(m.letra==="B"?d.B:null));
      for(const [vo,vn] of mapaVar) await guarda(act.id+":"+vn,d.variantes&&d.variantes[vo]);
    }catch(e){ mostrarAviso("El examen se ha creado, pero no se han podido guardar los diseños del paquete."); }
    state.ui.corExamId=act.id; state.ui.corTab=d.general?"diseno":"editor"; state.ui.corVarId=""; state.ui.corModelo="";
    save(); render();
    mostrarToast("✓ Paquete importado"+(sinVinculos?" · sin vínculos a criterios":"")+(vs.length?` · ${vs.length} examen${vs.length===1?"":"es"} alternativo${vs.length===1?"":"s"} (asigna de nuevo su alumnado)`:""));
  };
  inp.click();
};
window.exComentItem=(alId,actId,itemId,v)=>{
  const g=grupoActual(); if(!g) return; if(!g.examComentarios) g.examComentarios={};
  const m=(g.examComentarios[alId]=g.examComentarios[alId]||{}), k=actId+"|"+itemId, t=String(v||"").trim();
  if(t) m[k]=t; else delete m[k]; save();
};
function exComentHTML(alId,actId,itemId){
  const g=grupoActual(), v=(g&&g.examComentarios&&g.examComentarios[alId]&&g.examComentarios[alId][actId+"|"+itemId])||"";
  return `<input class="in ex-coment" style="margin-top:4px;font-size:12px;padding:3px 7px;width:100%" placeholder="Comentario para el alumno/a (opcional)" value="${esc(v)}" onchange="exComentItem('${alId}','${actId}','${itemId}',this.value)">`;
}
/* Copia propia de los diseños: como mucho una al día, se guardan las 3 últimas */
const EX_COPIA_DIA="cuaderno_ex_copia_dia";
async function exCopiaDiaria(forzar){
  try{
    const hoy=fechaISOLocal();
    if(!forzar && localStorage.getItem(EX_COPIA_DIA)===hoy) return;
    const todos=await exLeerTodos(); if(!todos.length) return;
    await exTx("readwrite",s=>s.put({ts:Date.now(),fecha:hoy,disenos:todos}),"copias");
    const ts=(await exTx("readonly",s=>s.getAllKeys(),"copias"))||[]; ts.sort((a,b)=>b-a);
    for(const k of ts.slice(3)) await exTx("readwrite",s=>s.delete(k),"copias");
    localStorage.setItem(EX_COPIA_DIA,hoy);
  }catch(e){}
}
window.exCopiasDiseno=async()=>{
  const cp=((await exTx("readonly",s=>s.getAll(),"copias").catch(()=>[]))||[]).sort((a,b)=>b.ts-a.ts);
  exModal(`<h2 style="font-size:16.5px;margin-bottom:4px">🛟 Copias de seguridad de los diseños</h2>
    <p class="sub" style="margin:0 0 10px">Se guarda una copia automática al día (las 3 últimas) en este navegador. No sustituye a «Exportar todo».</p>
    ${cp.length?`<table style="width:100%;border-collapse:collapse;font-size:13px">${cp.map(c=>`<tr><td style="padding:4px 0">${new Date(c.ts).toLocaleString("es-ES")}</td><td>${c.disenos.length} diseño${c.disenos.length===1?"":"s"}</td><td style="text-align:right"><button class="ghost small" style="border:1px solid var(--line)" onclick="exRestaurarCopia(${c.ts})">Restaurar</button></td></tr>`).join("")}</table>`:`<p class="sub">Todavía no hay copias.</p>`}
    <div style="margin-top:12px"><button class="ghost small" style="border:1px solid var(--line)" onclick="exLimpiarHuerfanos()">🧹 Buscar diseños de exámenes que ya no existen</button></div>`);
};
window.exRestaurarCopia=async ts=>{
  const c=await exTx("readonly",s=>s.get(ts),"copias"); if(!c) return;
  if(!await confirmar(`Se restaurarán ${c.disenos.length} diseños de la copia del ${new Date(c.ts).toLocaleString("es-ES")}. Los diseños actuales con el mismo examen se sustituirán por los de la copia.\n\n¿Continuar?`,{ok:"Restaurar",peligro:true})) return;
  await exCopiaDiaria(true); await exGuardarVarios(c.disenos);
  document.querySelectorAll(".modal-overlay").forEach(m=>{ if(m.querySelector("button.btn")&&/Copias de seguridad de los dise/.test(m.textContent)) m.remove(); });
  mostrarToast("✓ Diseños restaurados"); render();
};
window.exLimpiarHuerfanos=async()=>{
  const ids=new Set(); (state.grupos||[]).forEach(g=>(g.actividades||[]).forEach(a=>ids.add(a.id)));
  const huer=(await exLeerTodos()).filter(r=>!String(r.key).startsWith("prog:")&&!ids.has(String(r.key).split(":")[0]));
  if(!huer.length){ mostrarAviso("No hay diseños sin examen: todo está en uso."); return; }
  if(!await confirmar(`Hay ${huer.length} diseño${huer.length===1?"":"s"} de exámenes que ya no existen en ningún grupo. Antes de borrar se guarda una copia, que podrás restaurar.\n\n¿Borrarlos?`,{ok:"Borrar",peligro:true})) return;
  await exCopiaDiaria(true);
  for(const r of huer) await exBorrar(r.key);
  mostrarToast("✓ "+huer.length+" diseño"+(huer.length===1?"":"s")+" eliminado"+(huer.length===1?"":"s"));
};
window.exAyuda=()=>exModal(`<h2 style="font-size:16.5px;margin-bottom:8px">❔ Cómo usar el diseño de exámenes</h2>
  <ol style="margin:0 0 10px 18px;padding:0;font-size:13.5px;line-height:1.55">
    <li><b>Crear.</b> En Programación de Aula, «Abrir en el Corrector». El examen aparece en el Corrector con tres pestañas: Diseño · Rúbrica · Corregir.</li>
    <li><b>Diseñar.</b> Con «⛶ Pantalla completa» el editor ocupa toda la pantalla. Escribe el examen y pon <i>puntos</i> a cada pregunta (o a sus apartados, no a ambos). En el panel de la pregunta puedes marcar los <i>criterios de evaluación</i> que trabaja. «📊 Cobertura» muestra qué criterios evalúa y avisa si algo no cuadra.</li>
    <li><b>Importar a la rúbrica.</b> «Importar a la rúbrica →» crea la rúbrica con la misma estructura (apartados, preguntas y subpreguntas, en el mismo orden) y los puntos de cada parte; si una pregunta tiene puntos propios y también sus subpreguntas, cuentan los de las subpreguntas. Puedes reimportar tras retocar el examen: se conservan descriptores, vínculos y notas; si ya hay alumnado corregido, se avisa de lo que cambia y ninguna puntuación queda por encima del nuevo máximo. Si el examen no tiene apartados, la rúbrica tampoco los muestra.</li>
    <li><b>Corregir.</b> Por alumno/a, o con «↕ Por pregunta» una pregunta de todo el grupo. Cada ítem muestra su enunciado y admite un comentario que sale en la hoja impresa. «📈 Análisis» resume el acierto por pregunta y criterio. La nota pasa sola a Calificar.</li>
    <li><b>Modelos A, B y C.</b> «+ Modelo B» (y luego «+ Modelo C») es el mismo examen con las preguntas en otro orden, para repartirlo el día del examen y evitar la copia. Se genera solo a partir del general, comparte la rúbrica y, al corregir, sale en el orden de cada modelo. Quién hace cada modelo se reparte en 🖊️ Corregir.</li>
    <li><b>Examen alternativo.</b> «+ Examen alternativo» crea un examen con otras preguntas y su propia rúbrica, dentro de este mismo examen: para quien <i>no vino el día del examen</i> (tipo «Otro día», con su fecha) o para el alumnado NESE (tipo «Adaptado»). Puede empezar como copia del general o en blanco. Su nota cuenta en este examen y aparece en la misma lista de corrección.</li>
    <li><b>Reutilizar.</b> «💾 Plantilla de la Programación» sirve el diseño a otros grupos de la misma actividad. «📦 Exportar paquete» guarda examen, rúbrica y adaptaciones en un archivo; en «Nuevo examen» → «📥 Importar paquete» lo recuperas en otro grupo o curso (hay que reasignar el alumnado NESE).</li>
  </ol>
  <p style="font-size:13px;margin:0 0 10px"><b>PDF.</b> «Exportar PDF» abre la vista previa de impresión del Cuaderno; elige «Guardar como PDF», márgenes «Ninguno» y escala 100 %. Lora e Inter funcionan sin conexión; las demás fuentes del editor necesitan internet (sin conexión se sustituyen por otra parecida).</p>
  <div class="alert-box" style="font-size:12.5px"><b>Seguridad.</b> Los diseños se guardan en una base propia del navegador, no en las copias automáticas 🛟. «Exportar copia» (normal o cifrada) sí los incluye: hazla con regularidad. Además hay una copia automática diaria de los diseños. Las «Versiones» del editor son solo un historial de este dispositivo.</div>
  <div style="margin-top:10px"><button class="ghost small" style="border:1px solid var(--line)" onclick="exCopiasDiseno()">🛟 Copias de los diseños</button></div>`);
function exCriteriosDe(grupo,act){
  const out=[]; try{
    const idx=catIndex(grupo.catalogoKey), prev=cxCriteriosPrevistos(grupo,act), ok=prev&&prev.length? new Set(prev) : null;
    ((idx&&idx.cat&&idx.cat.ces)||[]).forEach(ce=>(ce.criterios||[]).forEach(c=>{ if(!ok||ok.has(c.id)) out.push({id:c.id,texto:String(c.texto||"").slice(0,140)}); }));
  }catch(e){}
  return out;
}
/* v2: el PDF del editor se imprime desde la vista previa del Cuaderno (fiable en iPad) */
window.exImprimirDesdeEditor=(docHtml,titulo,fontCss,links)=>{
  try{
    let st=document.getElementById("exFuentesImpresion");
    if(!st){ st=document.createElement("style"); st.id="exFuentesImpresion"; st.textContent=fontCss||""; document.head.appendChild(st); }
    (links||[]).forEach(u=>{ if(![...document.querySelectorAll("link[data-exfuente]")].some(l=>l.href===u)){ const l=document.createElement("link"); l.rel="stylesheet"; l.href=u; l.dataset.exfuente="1"; document.head.appendChild(l); } });
  }catch(e){}
  mostrarImprimible(docHtml,titulo);
  const ov=document.getElementById("printOverlay");
  if(ov&&!ov.querySelector(".ex-pdf-nota")){ const n=document.createElement("div"); n.className="ex-pdf-nota"; n.style.cssText="padding:6px 16px;background:#13213a;color:#cfd8e6;font-size:12.5px"; n.textContent="Para el PDF: tamaño de papel A4 (o el del examen), márgenes «Ninguno», escala 100 % y sin encabezados ni pies del navegador."; ov.insertBefore(n,ov.children[1]); }
};
function exEstado(t){ const e=document.getElementById("exEstado"); if(e) e.textContent=t; }
function exFlush(){ try{ if(_exFrame&&_exFrame.isConnected&&_exFrame.contentWindow.__ee) _exFrame.contentWindow.__ee.flush(); }catch(e){} }
{ const _r0=render; render=function(){ exFlush(); if(_exFull&&!(state.ui.appMode==="corrector"&&state.ui.corTab==="diseno")) exPantallaCompleta(false); const r=_r0.apply(this,arguments); if(state.ui.appMode==="corrector"&&state.ui.corTab==="corregir") setTimeout(exPintarEnunciados,0); return r; }; }

function cxSubtabs(act,on){
  return `<div class="card" style="padding:8px 14px"><div class="flex" style="gap:6px;flex-wrap:wrap;align-items:center"><strong style="font-size:13.5px;margin-right:6px">${esc(act.nombre)}</strong>${[["diseno","✏️ Diseño"],["rubrica","📋 Rúbrica"],["corregir","🖊️ Corregir"]].map(([k,l])=>`<button class="tab ${on===k?"on":""}" onclick="cxSubIr('${k}')">${l}</button>`).join("")}<span style="flex:1"></span><button class="ghost small" style="border:1px solid var(--line)" title="Acierto medio por pregunta y por criterio" onclick="exAnalisis()">📈 Análisis</button><button class="ghost small" style="border:1px solid var(--line)" title="Cómo usar el diseño de exámenes" onclick="exAyuda()">❔ Ayuda</button></div></div>`;
}
function cxPonerSubtabs(grupo){
  const act=grupo.actividades.find(a=>a.id===state.ui.corExamId), c=document.getElementById("tabContent"), t=state.ui.corTab;
  if(!act||!c||(t!=="editor"&&t!=="corregir")) return;
  c.insertAdjacentHTML("afterbegin",cxSubtabs(act,t==="editor"?"rubrica":"corregir"));
}
window.cxIrDiseno=id=>{ cxAvisarAlSalirDelEditor(); state.ui.corTab="diseno"; state.ui.corExamId=id; state.ui.corAlId=""; save(); render(); };
window.cxSubIr=async k=>{
  const g=grupoActual(), act=g&&g.actividades.find(a=>a.id===state.ui.corExamId); if(!act) return;
  if(k==="diseno") return cxIrDiseno(act.id);
  if(!act.rubrica && !await cxPonerRubrica(g,act)) return;
  if(k==="rubrica") cxIrEditor(act.id); else cxIrCorregir(act.id);
};

function renderCorDiseno(grupo){
  const c=document.getElementById("tabContent");
  const act=grupo.actividades.find(a=>a.id===state.ui.corExamId);
  if(!act){ state.ui.corTab="lista"; renderCorLista(grupo); return; }
  c.innerHTML=cxSubtabs(act,"diseno")+cxAvisoNeseHTML(grupo,act)+`<div class="card" style="padding:10px 14px"><div class="flex" style="gap:8px;flex-wrap:wrap;align-items:center">
    ${exSelectorVariante(act)}<button class="btn" onclick="exImportar()">Importar a la rúbrica →</button>
    <button class="ghost" style="border:1px solid var(--line)" title="Guarda este diseño como plantilla de la actividad de la Programación para reutilizarlo en otros grupos" onclick="exComoPlantilla()">💾 Plantilla de la Programación</button>
    ${exModeloViendo(act)?`<button class="ghost" style="border:1px solid var(--line)" title="Vuelve a barajar el orden de las preguntas" onclick="exMezclar()">🔀 Mezclar de nuevo</button><button class="ghost danger" style="border:1px solid var(--line)" onclick="exQuitarModelo()">Quitar modelo ${exModeloViendo(act)}</button>`:""}
    ${act.rubrica&&mbSinEnlazar(act)&&!cxVarEditando(act)?`<button class="ghost" style="border:1px solid var(--line)" title="Empareja cada ítem de la rúbrica con su pregunta del examen, sin cambiar nada de lo corregido. Hace falta para que la rúbrica salga en el orden de cada modelo." onclick="mbEnlazarRubrica()">🔗 Enlazar la rúbrica con el diseño (${mbSinEnlazar(act)} sin enlazar)</button>`:""}
    <button class="ghost" style="border:1px solid var(--line)" title="Qué criterios evalúa el examen y con qué peso" onclick="exCobertura()">📊 Cobertura</button>
    <button class="ghost" style="border:1px solid var(--line)" title="Ocupa toda la pantalla con el editor (útil en el iPad)" onclick="exPantallaCompleta(true)">⛶ Pantalla completa</button>
    <button class="ghost" style="border:1px solid var(--line)" title="Descarga examen, rúbrica, exámenes alternativos y modelos para reutilizarlos en otro grupo o curso (sin alumnado ni notas)" onclick="exExportarPaquete()">📦 Exportar paquete</button>
    <span id="exEstado" style="font-size:12.5px;color:var(--mut)">Cargando editor…</span>${exAvisoCopia()}</div>
    ${exModeloViendo(act)?`<p class="sub" style="margin:8px 0 0">El <strong>modelo ${exModeloViendo(act)}</strong> se genera a partir del examen general: aquí solo cuenta el <strong>orden</strong> de las preguntas (arrástralas o «🔀 Mezclar de nuevo»). El texto, los puntos y el formato se cambian en «Examen general» y el modelo los sigue solo. Reparte quién hace cada modelo en 🖊️ Corregir.</p>`:""}
    ${cxVarEditando(act)?`<p class="sub" style="margin:8px 0 0">${cxVarEditando(act).tipo==="ausencia"?"📅 <strong>Examen alternativo (otro día)</strong>":"🧩 <strong>Examen adaptado (NESE)</strong>"}: sus preguntas son independientes del general y se corrige con su propia rúbrica (pestaña 📋 Rúbrica, donde también marcas qué alumnado lo hace). Al terminar, «Importar a la rúbrica →».</p>`:""}</div>
    <div id="exWrap" class="ex-wrap${_exFull?" ex-full":""}"><iframe id="exFrame" title="Editor de exámenes" style="width:100%;height:calc(100vh - 250px);height:calc(100dvh - 250px);min-height:560px;border:1px solid var(--line);border-radius:10px;background:#fff"></iframe><button class="btn ex-salir" onclick="exPantallaCompleta(false)">✕ Salir de pantalla completa</button></div>`;
  if(location.protocol==="file:"){
    const w=document.getElementById("exWrap");
    if(w) w.innerHTML=`<div class="card" style="padding:16px 18px"><strong>El editor de exámenes necesita abrir la app desde su dirección web.</strong><p style="margin:8px 0 0;color:var(--mut)">Estás abriendo <code>index.html</code> con doble clic y el navegador no permite que cargue el editor. Abre la app desde GitHub Pages (o desde la pantalla de inicio del iPad) y funcionará, también sin conexión. El resto de la app funciona igual.</p></div>`;
    exEstado("No disponible abriendo el archivo con doble clic"); return;
  }
  const f=document.getElementById("exFrame"); _exFrame=f;
  f.onload=async()=>{
    try{
      const win=f.contentWindow;
      const clave=exClave(act), vr=cxVarEditando(act), letra=exModeloViendo(act), esB=!!letra; let avisoB=""; let rec=await exGet(clave);
      if(!rec && vr && vr.progVarId && act.progActId){ const p=await exGet("prog:"+act.progActId+":"+vr.progVarId); if(p){ rec={key:clave,exam:JSON.parse(JSON.stringify(p.exam))}; rec.exam.id=uid(); } }
      if(!rec && vr && !vr.enBlanco){ const g=await exGet(act.id); if(g){ rec={key:clave,exam:JSON.parse(JSON.stringify(g.exam))}; rec.exam.id=uid(); } }
      // v3: los modelos B y C se reconstruyen SIEMPRE a partir del examen general y de su orden (js/corrector/modelo-b.js).
      if(esB){ const g=await exGet(act.id); if(g&&g.exam){ const pr=await mbPreparar(act,letra,g.exam,rec,win); if(pr.exam){ rec={key:clave,exam:pr.exam}; avisoB=pr.aviso; } } }
      if(!rec && act.progActId && !vr && !esB){ const p=await exGet("prog:"+act.progActId); if(p) rec={key:act.id,exam:JSON.parse(JSON.stringify(p.exam))}; }
      if(_exFrame!==f) return;
      let exam;
      if(rec) exam=rec.exam;
      else { const b=win.blankExam(); b.name=act.nombre; b.body[0].title=act.nombre; b.body[0].eyebrow=grupo.nombre; if(vr&&vr.tipo==="ausencia"&&vr.fecha) b.body[0].eyebrow+=" · "+cxFechaCorta(vr.fecha); exam=JSON.parse(JSON.stringify(b)); }
      win.__eeCriterios=exCriteriosDe(grupo,act);
      win.__ee.cargar(exam);
      if(!vr && !esB && mbModelos(act)) mbActualizar(act,exam,win);   // numeración de los modelos al día
      if(avisoB) mostrarToast(avisoB,"info");
      const g0=win.__ee.get(); g0.updated=0; _exFirma=JSON.stringify(g0);
      await exPut({key:clave,exam:win.__ee.get(),actualizado:Date.now(),nombre:act.nombre});
      win.__eeOnSave=ex=>{
        const g=JSON.parse(JSON.stringify(ex)); g.updated=0; const fr=JSON.stringify(g); if(fr===_exFirma) return; _exFirma=fr;
        // Modelos B y C: solo cuenta el orden de sus preguntas; el contenido sale siempre del general.
        if(esB){ mbGuardadoEn(act,letra,JSON.parse(JSON.stringify(ex)),win).then(()=>{ exMarcarPendiente(clave); exEstado("Orden guardado · "+new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})); }); return; }
        exPut({key:clave,exam:JSON.parse(JSON.stringify(ex)),actualizado:Date.now(),nombre:act.nombre})
          .then(()=>{ if(!vr && mbModelos(act)) return mbActualizar(act,JSON.parse(JSON.stringify(ex)),win); })   // los modelos siguen al general
          .then(()=>{ exMarcarPendiente(clave); exCopiaDiaria(); exEstado("Guardado · "+new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})); })
          .catch(()=>exEstado("⚠️ No se pudo guardar el diseño: usa «Guardar archivo» del editor"));
      };
      exEstado("Diseño cargado");
    }catch(e){ exEstado("⚠️ No se pudo iniciar el editor"); console.error(e); }
  };
  f.src="editor/index.html";
}
window.exComoPlantilla=async()=>{
  const g=grupoActual(), act=g&&g.actividades.find(a=>a.id===state.ui.corExamId); if(!act||!_exFrame) return;
  if(exModeloViendo(act)){ mostrarAviso(`El modelo ${exModeloViendo(act)} se genera solo a partir del examen general: cámbiate a «Examen general» para guardar la plantilla.`); return; }
  if(!act.progActId){ mostrarAviso("Este examen no procede de la Programación de Aula, así que no hay actividad a la que asociar la plantilla."); return; }
  const ex=_exFrame.contentWindow.__ee.get(); if(!ex) return;
  const vr=cxVarEditando(act);
  if(vr){
    // El diseño adaptado se guarda junto a su rúbrica: la versión adaptada pasa a formar parte de la plantilla.
    const ref=cxProgActDe(g,act); if(!ref){ mostrarAviso("No se encuentra la actividad de la Programación de este examen."); return; }
    const pv=cxGuardarVarianteEnProgAct(ref.progAct,vr);
    await exPut({key:"prog:"+act.progActId+":"+pv.id,exam:ex,actualizado:Date.now(),nombre:act.nombre+" · "+(vr.nombre||"Adaptada")});
    save(); render();
    mostrarToast(`✓ «${vr.nombre||"Adaptada"}» guardada en la Programación: los próximos grupos tendrán ya este examen adaptado`);
    return;
  }
  await exPut({key:"prog:"+act.progActId,exam:ex,actualizado:Date.now(),nombre:act.nombre});
  mostrarToast("✓ Diseño guardado como plantilla de la Programación");
};

/* Importar el diseño a la rúbrica. La rúbrica copia el árbol del Diseño tal cual:
   Apartado → Pregunta → Subpregunta, en el mismo orden y con los puntos de cada parte.
   - Solo se puntúan las «hojas»: la subpregunta, o la pregunta si no se desglosa en partes
     con puntos. Cada apartado y cada pregunta suman lo de sus partes.
   - Si una pregunta tiene puntos propios y también sus subpreguntas, mandan las subpreguntas
     (📊 Cobertura avisa cuando no suman lo mismo).
   - En un mismo nivel (también en la raíz), si se mezclan preguntas desglosadas y preguntas sueltas,
     estas últimas pasan a ser un bloque propio de un solo ítem para no alterar el orden del examen.
     Un examen sin ninguna pregunta desglosada se importa como antes: un único bloque «Preguntas».
   - Cada ítem y cada bloque recuerdan el nodo del examen del que vienen (fuenteId): al
     reimportar se actualizan enunciados y puntos SIN perder descriptores, vínculos a criterios
     ni ids (y por tanto las notas ya puestas). */
function exPuntua(n){ return n.max!=null||(n.hijos||[]).some(exPuntua); }      // ¿hay algo puntuable en este nodo?
function exDesglosa(n){ return (n.hijos||[]).some(exPuntua); }                   // ¿se divide en partes puntuables?
function exHojas(l){ return (l||[]).filter(exPuntua).flatMap(n=>exDesglosa(n)? exHojas(n.hijos) : [n]); }
/* Subpreguntas sin puntos: si la pregunta (o subpregunta) tiene puntos y alguna de sus partes no, esas partes
   se reparten a partes iguales lo que no han asignado las demás. Así la rúbrica copia siempre la estructura
   completa y no cambia el total; los puntos se afinan después en el Diseño o en la propia rúbrica. */
function exConReparto(est){
  const e=JSON.parse(JSON.stringify(est)), rep=[], suma=n=>exHojas([n]).reduce((s,h)=>s+h.max,0);
  (function w(l){ (l||[]).forEach(n=>{
    const hs=n.hijos||[];
    if(n.max!=null&&hs.length){
      const sin=hs.filter(h=>!exPuntua(h)), resto=Math.round((n.max-hs.filter(exPuntua).reduce((s,h)=>s+suma(h),0))*100)/100;
      if(sin.length&&resto>0.001){ const cada=Math.floor(resto/sin.length*100)/100; let ac=0;
        sin.forEach((h,i)=>{ h.max=i<sin.length-1? cada : Math.round((resto-ac)*100)/100; ac+=h.max; });
        rep.push(n.label); }
    }
    w(hs); }); })(e.nodos);
  e.repartidos=rep; e.descuadres=(e.descuadres||[]).filter(d=>rep.indexOf(d.label)<0);   // lo repartido ya cuadra
  return e;
}
async function cxImportarEstructura(grupo,act,est,dest){
  dest=dest||act; const _okC=cxCriteriosValidosEnCatalogo(grupo.catalogoKey);
  const viejas=new Map(), viejosN=new Map();
  cxItemsFlat(dest.rubrica).forEach(it=>{ if(it.fuenteId) viejas.set(it.fuenteId,it); });
  cxNodosFlat(dest.rubrica).forEach(x=>{ if(x.n.fuenteId) viejosN.set(x.n.fuenteId,x.n); });
  const usados=new Set(), rotulo=n=>n.rotulo||n.label;
  const tipoDe=t=>t==="section"?"apartado":t==="question"?"pregunta":"subpregunta";
  const leaf=(n,unico)=>{ const o=viejas.get(n.id); usados.add(n.id); const m=Math.round(n.max*100)/100;
    const q=(n.crit||[]).filter(id=>_okC.has(id)), base=q.length?Math.round(100/q.length):0;
    const lk=q.length? q.map((id,i)=>({critId:id,peso:i<q.length-1?base:100-base*(q.length-1)})) : null;
    const mismos=o&&lk&&(o.links||[]).length&&[...new Set(o.links.map(l=>l.critId))].sort().join("|")===[...q].sort().join("|");
    const lab=unico?"":rotulo(n);
    const r=o? {...o,label:lab,max:m,fuenteId:n.id,tipo:tipoDe(n.tipo),...(lk&&!mismos?{links:lk}:{})} : {id:uid(),label:lab,max:m,desc:[],links:lk||[],fuenteId:n.id,tipo:tipoDe(n.tipo)};
    if(unico) r.unico=true; else delete r.unico;
    return r; };
  const nodo=(fid,title,tipo,r,plano)=>{ const o=viejosN.get(fid);
    return {id:o?o.id:uid(),title,...(tipo?{tipo}:{}),items:r.items,subs:r.subs,elegir:o?(o.elegir||0):0,sinTitulo:o?!!o.sinTitulo:!!plano,fuenteId:fid}; };
  /* d = nivel (0 = apartado) de los bloques que se crean dentro; la rúbrica admite CX_MAX_NIVELES niveles:
     más abajo se aplanan las hojas dentro del último bloque. */
  const conv=(nodos,d)=>{ const lista=nodos.filter(exPuntua), puedeBloque=d<=CX_MAX_NIVELES-1;
    const hayBloques=puedeBloque&&lista.some(exDesglosa), items=[], subs=[];
    for(const n of lista){
      if(!exDesglosa(n)){
        if(hayBloques) subs.push(nodo(n.id,rotulo(n),tipoDe(n.tipo),{items:[leaf(n,true)],subs:[]}));
        else items.push(leaf(n));
      } else if(puedeBloque) subs.push(nodo(n.id,rotulo(n),tipoDe(n.tipo),conv(n.hijos,d+1)));
      else exHojas([n]).forEach(h=>items.push(leaf(h)));
    }
    return {items,subs}; };
  /* Raíz: si ninguna pregunta se desglosa, el examen es «plano» y va en un solo bloque «Preguntas» sin cabecera;
     si alguna se desglosa (o hay apartados), cada nodo de la raíz es un bloque y las preguntas sueltas son bloques de un ítem. */
  const rub=[], raiz=est.nodos.filter(exPuntua);
  if(!raiz.some(exDesglosa)){ if(raiz.length) rub.push(nodo("_p0","Preguntas",null,{items:raiz.map(n=>leaf(n)),subs:[]},true)); }
  else raiz.forEach(n=>rub.push(nodo(n.id,rotulo(n),tipoDe(n.tipo),exDesglosa(n)? conv(n.hijos,1) : {items:[leaf(n,true)],subs:[]})));
  if(!rub.length) return null;
  let huerfanos=0;
  if(viejas.size||viejosN.size){
    viejas.forEach((it,fid)=>{ if(!usados.has(fid)) huerfanos++; });
    const man=[]; (function w(l){ (l||[]).forEach(n=>{ (n.items||[]).forEach(it=>{ if(!it.fuenteId) man.push(it); }); w(n.subs); }); })(dest.rubrica);
    if(man.length) rub.push({id:uid(),title:"Añadidos a mano",items:man,subs:[],elegir:0,fuenteId:"_manual"});
  }
  dest.rubrica=rub;
  /* v2: ninguna puntuación puede quedar por encima del nuevo máximo de su pregunta */
  let recortes=0; const maxPorId=new Map(cxItemsFlat(rub).map(it=>[it.id,Number(it.max)||0]));
  (grupo.alumnos||[]).forEach(al=>{ const sc=grupo.rubricScores&&grupo.rubricScores[al.id]&&grupo.rubricScores[al.id][act.id]; if(!sc) return;
    Object.keys(sc).forEach(id=>{ if(!maxPorId.has(id)) return; const v=Number(sc[id]), mx=maxPorId.get(id); if(sc[id]!=null&&sc[id]!==""&&isFinite(v)&&v>mx){ sc[id]=mx; recortes++; } }); });
  cxSyncCriteriosActividad(act);
  cxRecalcTodosLosAlumnos(grupo,act);
  const cuenta={apartado:0,pregunta:0,subpregunta:0};
  cxNodosFlat(rub).forEach(({n})=>{ if(cuenta[n.tipo]!=null) cuenta[n.tipo]++; });
  cxItemsFlat(rub).forEach(it=>{ if(!it.unico&&cuenta[it.tipo]!=null) cuenta[it.tipo]++; });
  const resumen=[["apartado","apartados"],["pregunta","preguntas"],["subpregunta","subpreguntas"]].filter(([a])=>cuenta[a]).map(([a,b])=>cuenta[a]+" "+(cuenta[a]===1?a:b)).join(" · ");
  return {items:cxItemsFlat(rub).length,total:cxMaxTotal(rub),huerfanos,recortes,resumen};
}
/* Texto de un ítem con su recorrido (apartado › pregunta › …) para listas donde se ve suelto */
function exEtiquetaItem(rub,it){
  let ruta=null;
  (function w(l,r){ (l||[]).forEach(n=>{ if(ruta) return; const t=(n.sinTitulo&&!cxElegirEf(n))?"":String(n.title||"").split("\n")[0].slice(0,45), rr=t?[...r,t]:r;
    if((n.items||[]).some(x=>x.id===it.id)) ruta=rr; else w(n.subs,rr); }); })(rub,[]);
  return [...(ruta||[]),it.unico?"":String(it.label||"")].filter(Boolean).join(" › ")||"(sin enunciado)";
}
/* v2: qué cambia al reimportar si ya hay alumnado corregido */
function exPrevisionReimport(grupo,act,est,dest){
  const nuevos=new Map(); exHojas(est.nodos).forEach(n=>nuevos.set(n.id,Math.round(n.max*100)/100));
  const enDiseno=new Set(); (function w(l){ (l||[]).forEach(n=>{ enDiseno.add(n.id); w(n.hijos); }); })(est.nodos);
  const viejos=cxItemsFlat(dest.rubrica).filter(it=>it.fuenteId);
  const conNota=it=>(grupo.alumnos||[]).filter(al=>{ const v=grupo.rubricScores&&grupo.rubricScores[al.id]&&grupo.rubricScores[al.id][act.id]&&grupo.rubricScores[al.id][act.id][it.id]; return v!=null&&v!==""; });
  const alumnos=new Set(), cambian=[], quitan=[], desglosan=[]; let exceden=0;
  viejos.forEach(it=>{ const cn=conNota(it), et=String(it.label||(it.unico&&exEtiquetaItem(dest.rubrica,it).split(" › ").pop())||"(sin enunciado)").slice(0,40);
    if(!nuevos.has(it.fuenteId)){
      if(enDiseno.has(it.fuenteId)) desglosan.push({et,conNota:cn.length>0});   // sigue en el examen pero ahora se divide en partes
      else if(cn.length) quitan.push(et);
    } else if(cn.length){ const nm=nuevos.get(it.fuenteId);
      if(Math.abs(nm-Number(it.max))>0.001){ cambian.push(`${et} (${cxFmtPts(it.max)} → ${cxFmtPts(nm)})`); cn.forEach(al=>{ if(Number(grupo.rubricScores[al.id][act.id][it.id])>nm) exceden++; }); } }
    cn.forEach(al=>alumnos.add(al.id));
  });
  return {alumnos:alumnos.size,cambian,quitan,exceden,desglosan};
}
window.exImportar=async()=>{
  const grupo=grupoActual(), act=grupo&&grupo.actividades.find(a=>a.id===state.ui.corExamId);
  if(!act||!_exFrame||!_exFrame.contentWindow.__ee){ mostrarAviso("El editor todavía no ha cargado."); return; }
  if(exModeloViendo(act)){ mostrarAviso(`El modelo ${exModeloViendo(act)} es el examen general con las preguntas en otro orden y comparte su rúbrica (al corregir sale en el orden de cada modelo). Importa desde «Examen general».`); return; }
  exFlush();
  const est=exConReparto(_exFrame.contentWindow.__ee.estructura());
  if(!est.nodos.length){ mostrarAviso("El examen aún no tiene preguntas ni apartados con puntuación. Añade puntos a las preguntas o a sus subpreguntas (campo «puntos») y vuelve a importar."); return; }
  if(!act.rubrica && !await cxPonerRubrica(grupo,act)) return;
  if(cxEsNiveles((cxVarEditando(act)||act).rubrica)){ mostrarAviso("Esta rúbrica es por niveles de logro (categorías × niveles), así que no se construye a partir de las preguntas del Diseño.\n\nSi quieres una rúbrica por preguntas, pásala antes a «por puntos» en la pestaña 📋 Rúbrica («⇄ Pasar a rúbrica por puntos») y vuelve a importar."); return; }
  const dest=cxVarEditando(act)||act; const yaImp=cxItemsFlat(dest.rubrica).some(i=>i.fuenteId);
  if(!yaImp){
    const n=cxItemsFlat(dest.rubrica).length;
    if(!await confirmar(`Se sustituirá la rúbrica actual (${n} ítem${n===1?"":"s"}) por la estructura del examen: apartados, preguntas y subpreguntas, con los puntos de cada una. Los criterios marcados en cada pregunta del Diseño pasan a la rúbrica; el resto podrás vincularlos en la pestaña Rúbrica.\n\n¿Continuar?`,{ok:"Importar",peligro:false})) return;
  } else {
    const pv=exPrevisionReimport(grupo,act,est,dest);
    const L=a=>a.slice(0,5).join("; ")+(a.length>5?"…":""), avisoNotas=pv.alumnos&&(pv.cambian.length||pv.quitan.length), desglose=pv.desglosan.length>0;
    if(avisoNotas||desglose){
      const msg=(pv.alumnos?`Ya hay ${pv.alumnos} alumno${pv.alumnos===1?"":"s"} corregido${pv.alumnos===1?"":"s"} con esta rúbrica y el examen ha cambiado:`:"La rúbrica se va a actualizar con la estructura actual del examen:")
        +(desglose?`\n• Ahora se dividen en subpreguntas, que se puntúan una a una (se pierden sus descriptores${pv.desglosan.some(d=>d.conNota)?" y las notas que tuvieran como pregunta entera":""}): ${L(pv.desglosan.map(d=>d.et))}`:"")
        +(pv.cambian.length?`\n• Cambian de puntuación: ${L(pv.cambian)}`:"")
        +(pv.quitan.length?`\n• Ya no están en el examen (se quitan de la rúbrica y de la nota): ${L(pv.quitan)}`:"")
        +(pv.exceden?`\n• ${pv.exceden} puntuaci${pv.exceden===1?"ón supera":"ones superan"} el nuevo máximo y se ajustará${pv.exceden===1?"":"n"} a él.`:"")
        +(pv.alumnos?`\n\nLas notas se recalcularán. ¿Continuar?`:`\n\n¿Continuar?`);
      if(!await confirmar(msg,{titulo:pv.alumnos?"⚠️ Reimportar con notas puestas":"Reimportar a la rúbrica",ok:"Reimportar",peligro:!!pv.alumnos})) return;
    }
  }
  const r=await cxImportarEstructura(grupo,act,est,dest);
  if(!r){ mostrarAviso("Ninguna pregunta tiene puntuación asignada, así que no hay nada que importar. Asigna puntos a las preguntas en el editor."); return; }
  save();
  state.ui.corTab="editor"; save(); render();
  mostrarToast(`✓ Estructura importada: ${r.resumen||r.items+" ítems"} · total ${cxFmtPts(r.total)} pts`+(r.huerfanos?` · ${r.huerfanos} ya no existen en el examen`:"")+(r.recortes?` · ${r.recortes} puntuaci${r.recortes===1?"ón ajustada":"ones ajustadas"} al nuevo máximo`:"")+((est.descuadres||[]).length?` · ⚠️ ${est.descuadres.length} pregunta${est.descuadres.length===1?"":"s"} con partes que no suman lo que vale la pregunta (mira 📊 Cobertura)`:"")+((est.repartidos||[]).length?` · ℹ️ ${est.repartidos.length} pregunta${est.repartidos.length===1?"":"s"} con subpreguntas sin puntos: se han repartido a partes iguales (ajústalas en el Diseño o en la rúbrica)`:"")+(Math.abs(r.total-10)>0.01?" · ⚠️ no suma 10":""),"info");
};
