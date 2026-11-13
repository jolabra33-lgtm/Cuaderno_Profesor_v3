/* ============================================================================
   Cuaderno del profesor · Modelos A, B y C: orden propio, reparto y rúbrica en su orden
   js/corrector/modelo-b.js
   ============================================================================ */

/* =================================================================
   v3.1 · MODELOS DE UN MISMO EXAMEN (A, B y C)
   Los modelos B y C son el MISMO examen que el general (modelo A) con las preguntas en otro orden,
   para repartirlos el día del examen y evitar que se copien. Como máximo, tres modelos.
   - act.modelos={lista:[{letra:"B",orden,examId,num},{letra:"C",…}], numA, asignados:{alId:"B"|"C"}}.
     (El formato antiguo act.modeloB se convierte solo: migrarModeloB, js/nucleo/estado-migraciones.js.)
   - De cada modelo solo se guarda el ORDEN (por cada lista del examen —«_raiz» o el id de su apartado
     o pregunta—, el orden de sus preguntas). El examen se reconstruye a partir del general cada vez:
     si cambias el general, los modelos cambian igual; si añades una pregunta, entra en un sitio al azar.
     Su diseño se guarda en «<examen>:B» y «<examen>:C».
   - Las preguntas conservan su identidad (id) en todos los modelos. La rúbrica es una sola: cada ítem
     recuerda la pregunta de la que viene (fuenteId), así que, al corregir a un alumno/a del modelo B o C,
     se le muestra en el orden de su modelo y con su numeración. Los ítems son los mismos: las notas no cambian.
   - Quién hace cada modelo: act.modelos.asignados (quien no aparece, hace el A). El alumnado con un examen
     alternativo (NESE u otro día) sigue con el suyo.
   - numA / num: número de cada pregunta en el A y en cada modelo (para «3. … (modelo A: 1.)»).
   - Rúbricas hechas a mano (sin fuenteId): «🔗 Enlazar la rúbrica con el diseño» empareja cada
     ítem con su pregunta por el texto, sin tocar ítems, puntos ni lo ya corregido.
   ================================================================= */
const MB_RAIZ="_raiz", MB_LETRAS=["B","C"];   // con el A (el examen general), tres modelos como máximo

/* ---------- Datos ---------- */
function mbModelos(act){
  if(!act) return null;
  if(act.modeloB&&!act.modelos) migrarModeloB(act);
  const m=act.modelos;
  if(!m||!Array.isArray(m.lista)||!m.lista.length) return null;
  if(!m.asignados||typeof m.asignados!=="object") m.asignados={};
  return m;
}
function mbLista(act){ const m=mbModelos(act); return m? m.lista : []; }
function mbModelo(act,letra){ return mbLista(act).find(x=>x.letra===letra)||null; }
function mbSiguienteLetra(act){ const usadas=new Set(mbLista(act).map(x=>x.letra)); return MB_LETRAS.find(l=>!usadas.has(l))||null; }
/* Letras de todos los modelos, empezando por el A. */
function mbLetras(act){ return ["A",...mbLista(act).map(x=>x.letra)]; }

/* ---------- Orden ---------- */
/* Orden de las preguntas de un examen, por listas. */
function mbOrdenDe(exam){
  const orden={};
  (function w(lista,clave){
    const qs=(lista||[]).filter(n=>n&&n.type==="question").map(n=>n.id);
    if(qs.length) orden[clave]=qs;
    (lista||[]).forEach(n=>{ if(n&&Array.isArray(n.children)) w(n.children,n.id); });
  })(exam&&exam.body,MB_RAIZ);
  return orden;
}
function _mbBarajar(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function _mbConstruirUna(general,orden){
  const ex=JSON.parse(JSON.stringify(general||{body:[]}));
  const nuevo={}; let nuevas=0;
  (function w(lista,clave){
    if(!Array.isArray(lista)) return;
    const slots=[], qs=[];
    lista.forEach((n,i)=>{ if(n&&n.type==="question"){ slots.push(i); qs.push(n); } });
    if(qs.length){
      const porId=new Map(qs.map(n=>[n.id,n])), guardado=(orden&&orden[clave])||null;
      let ids;
      if(!guardado){
        ids=qs.map(n=>n.id);
        if(ids.length>1){ let t=0, b; do{ b=_mbBarajar(ids); }while(++t<8 && b.join()===ids.join()); ids=b; }
      }else{
        ids=guardado.filter(id=>porId.has(id));
        qs.forEach(n=>{ if(!ids.includes(n.id)){ ids.splice(Math.floor(Math.random()*(ids.length+1)),0,n.id); nuevas++; } });
      }
      ids.forEach((id,k)=>{ lista[slots[k]]=porId.get(id); });
      nuevo[clave]=ids;
    }
    lista.forEach(n=>{ if(n&&Array.isArray(n.children)) w(n.children,n.id); });
  })(ex.body,MB_RAIZ);
  return {exam:ex,orden:nuevo,nuevas};
}
/* Construye el examen de un modelo a partir del general y de un orden guardado. Lo que el orden no
   conoce (preguntas nuevas) entra en un sitio al azar; lo que ya no existe se descarta. Sin orden
   guardado se baraja todo, procurando que no quede igual que el A ni que otro modelo («evitar»:
   órdenes que no debe repetir). repetido=true si no ha sido posible (muy pocas preguntas). */
function mbConstruir(general,orden,letra,evitar){
  let r=_mbConstruirUna(general,orden), repetido=false;
  if(!orden||!Object.keys(orden).length){
    const prohibidos=new Set([JSON.stringify(mbOrdenDe(general)),...(evitar||[]).map(o=>JSON.stringify(o||{}))]);
    let t=0; while(prohibidos.has(JSON.stringify(r.orden)) && ++t<40) r=_mbConstruirUna(general,null);
    repetido=prohibidos.has(JSON.stringify(r.orden)) && Object.values(r.orden).some(l=>l.length>1);
  }
  // Para distinguirlo en papel: «Modelo B» (o C) encima del título.
  const tit=(r.exam.body||[]).find(n=>n&&n.type==="title"), rotulo="Modelo "+(letra||"B");
  if(tit){
    const previo=String(tit.eyebrow||"").replace(/(^|\s*·\s*)Modelo [A-Z]\b/g,"").trim();
    tit.eyebrow=(previo?previo+" · ":"")+rotulo;
  }
  r.repetido=repetido;
  return r;
}
/* Compatibilidad: el modelo B a partir del general. */
function mbConstruirB(general,orden){ return mbConstruir(general,orden,"B"); }
/* Número de cada pregunta (solo preguntas) según el editor. */
function _mbNumeros(win,exam){
  const out={};
  try{ (function w(l){ (l||[]).forEach(n=>{ if(n.tipo==="question"&&n.num) out[n.id]=n.num; w(n.hijos); }); })(win.__ee.estructura(exam).nodos); }catch(e){}
  return out;
}
/* Pone al día un modelo con el examen general: reconstruye, guarda su diseño y su numeración. */
async function mbActualizarModelo(act,letra,general,win){
  const mb=mbModelos(act), m=mbModelo(act,letra);
  if(!mb||!m||!general) return null;
  const evitar=mb.lista.filter(x=>x!==m).map(x=>x.orden);
  const r=mbConstruir(general,m.orden,letra,evitar);
  if(!m.examId) m.examId=uid();
  r.exam.id=m.examId;   // id propio: las «Versiones» del editor no se mezclan con las del general
  const antes=JSON.stringify([m.orden,m.num,mb.numA]);
  m.orden=r.orden;
  if(win&&win.__ee&&win.__ee.estructura){ mb.numA=_mbNumeros(win,general); m.num=_mbNumeros(win,r.exam); }
  try{ await exPut({key:act.id+":"+letra,exam:r.exam,actualizado:Date.now(),nombre:act.nombre}); }catch(e){}
  if(JSON.stringify([m.orden,m.num,mb.numA])!==antes) save();
  return r;
}
/* Pone al día TODOS los modelos con el examen general. Devuelve null si el examen no tiene modelos. */
async function mbActualizar(act,general,win){
  if(!mbModelos(act)||!general) return null;
  const out={};
  for(const m of mbLista(act).slice()) out[m.letra]=await mbActualizarModelo(act,m.letra,general,win);
  return out;
}
/* Al abrir la pestaña de un modelo: se crea si no existe (o se pasa al formato nuevo) y se reconstruye desde el general. */
async function mbPreparar(act,letra,general,guardado,win){
  let aviso="";
  if(!mbModelo(act,letra)){
    if(!act.modelos||!Array.isArray(act.modelos.lista)) act.modelos={lista:[],asignados:{}};
    // Había una copia fija de antes (solo el B): se conserva su orden en lo que coincida con el general actual.
    const m={letra,orden:guardado&&guardado.exam?mbOrdenDe(guardado.exam):{}};
    act.modelos.lista.push(m);
    act.modelos.lista.sort((a,b)=>a.letra.localeCompare(b.letra));
    if(guardado&&guardado.exam){
      const enGeneral=new Set(Object.values(mbOrdenDe(general)).flat()), enM=new Set(Object.values(m.orden).flat());
      const faltan=[...enGeneral].filter(id=>!enM.has(id)).length;
      if(faltan) aviso=`El modelo ${letra} se ha puesto al día con el examen general: le faltaban ${faltan} pregunta${faltan===1?"":"s"}.`;
    }
    save();
  }
  const r=await mbActualizarModelo(act,letra,general,win);
  if(r&&r.repetido) aviso=`Con tan pocas preguntas no hay otro orden posible: el modelo ${letra} queda igual que otro modelo.`;
  else if(r&&r.nuevas&&!aviso) aviso=`El modelo ${letra} se ha puesto al día con el examen general (${r.nuevas} pregunta${r.nuevas===1?" nueva":"s nuevas"}).`;
  return {exam:r?r.exam:null,aviso};
}
/* Compatibilidad con el nombre anterior. */
function mbPrepararB(act,general,guardado,win){ return mbPreparar(act,"B",general,guardado,win); }
/* Lo que se edita en la pestaña de un modelo: solo cuenta el orden de las preguntas. */
let _mbAvisoEdicion={};
async function mbGuardadoEn(act,letra,exM,win){
  const m=mbModelo(act,letra); if(!m) return;
  const general=(await exGet(act.id)||{}).exam; if(!general) return;
  m.orden=mbOrdenDe(exM);
  const r=await mbActualizarModelo(act,letra,general,win);
  if(!r) return;
  const limpio=e=>JSON.stringify((e&&e.body)||[]);
  if(limpio(r.exam)!==limpio(exM) && !_mbAvisoEdicion[act.id]){
    _mbAvisoEdicion[act.id]=true;
    mostrarAviso(`En el modelo ${letra} solo cuenta el ORDEN de las preguntas (arrástralas o usa «🔀 Mezclar de nuevo»).\n\nLos cambios de texto, puntos o formato hazlos en «Examen general»: los modelos se generan a partir de él y los cambios hechos aquí no se guardan.`,"Modelo "+letra);
  }
}
/* Quita un modelo. Su alumnado pasa al A. Si se quita el B y existe el C, el C pasa a llamarse B. */
async function mbQuitar(act,letra){
  const mb=mbModelos(act); if(!mb||!mbModelo(act,letra)) return;
  Object.keys(mb.asignados).forEach(id=>{ if(mb.asignados[id]===letra) delete mb.asignados[id]; });
  mb.lista=mb.lista.filter(x=>x.letra!==letra);
  const viejas=["B","C"];
  // Las letras se reasignan en orden (B, C) para que no quede un «modelo C» sin B.
  const renombre={};
  mb.lista.forEach((x,i)=>{ const nueva=MB_LETRAS[i]; if(x.letra!==nueva){ renombre[x.letra]=nueva; x.letra=nueva; } });
  Object.keys(mb.asignados).forEach(id=>{ const l=mb.asignados[id]; if(renombre[l]) mb.asignados[id]=renombre[l]; });
  for(const l of viejas) if(!mbModelo(act,l)){ try{ await exBorrar(act.id+":"+l); }catch(e){} }
  if(!mb.lista.length) delete act.modelos;
  else{ const general=(await exGet(act.id)||{}).exam; if(general) await mbActualizar(act,general,_exFrame&&_exFrame.contentWindow); }
  save();
}

/* ---------- Rúbrica en el orden de cada modelo ---------- */
/* Modelo que hace un alumno/a: "A", "B" o "C"; null si hace un examen alternativo (NESE u otro día). */
function mbModeloDe(act,alId){
  if(cxVarianteDeAlumno(act,alId)) return null;
  const mb=mbModelos(act); if(!mb) return "A";
  const l=mb.asignados[alId];
  return l&&mbModelo(act,l)? l : "A";
}
function mbHaceB(act,alId){ const l=mbModeloDe(act,alId); return !!l&&l!=="A"; }   // ¿hace un modelo distinto del A?
/* ¿Se puede ordenar la rúbrica general según los modelos? (necesita ítems enlazados con el diseño) */
function mbRubricaEnlazada(act){
  if(!mbModelos(act)||!act.rubrica) return false;
  const ids=new Set(mbLista(act).flatMap(m=>Object.values(m.orden||{}).flat()));
  return cxNodosFlat(act.rubrica).some(x=>ids.has(x.n.fuenteId))||cxItemsFlat(act.rubrica).some(it=>ids.has(it.fuenteId));
}
/* Rúbrica que se ve al corregir (e imprimir) a un alumno/a: la suya y, si hace el modelo B o C, en el
   orden de su modelo. Son los mismos ítems (mismos id): las puntuaciones no cambian. */
function mbRubricaVista(act,alId){
  const rub=cxRubricaDe(act,alId), letra=mbModeloDe(act,alId);
  if(!letra||letra==="A") return rub;
  const mb=mbModelos(act), m=mbModelo(act,letra), rango=new Map();
  Object.values(m.orden||{}).forEach(ids=>ids.forEach((id,i)=>rango.set(id,i)));
  const numA=mb.numA||{}, numM=m.num||{};
  // Cambia el número del principio por el del modelo, con el estilo que tenga el texto («2)», «2.-», «2.»…).
  const nucleo=s=>String(s||"").replace(/[^0-9A-Za-z]/g,"");
  const renumera=(txt,fid)=>{
    const a=nucleo(numA[fid]), b=nucleo(numM[fid]); txt=String(txt||"");
    if(!a||!b||a===b) return txt;
    const mt=txt.match(new RegExp("^(\\s*)"+a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"(\\s*[).:\\-–]+)"));
    if(!mt) return txt;
    return mt[1]+b+mt[2]+txt.slice(mt[0].length)+` (modelo A: ${a})`;
  };
  // Los nodos con pregunta del modelo ocupan sus huecos en el orden del modelo; el resto no se mueve.
  const ordena=lista=>{
    const huecos=[], conRango=[];
    lista.forEach((n,i)=>{ if(rango.has(n.fuenteId)){ huecos.push(i); conRango.push(n); } });
    conRango.sort((x,y)=>rango.get(x.fuenteId)-rango.get(y.fuenteId));
    const out=lista.slice(); huecos.forEach((p,k)=>{ out[p]=conRango[k]; }); return out;
  };
  const item=it=>it.fuenteId&&numA[it.fuenteId]?{...it,label:renumera(it.label,it.fuenteId)}:it;
  const bloque=b=>({...b,title:renumera(b.title,b.fuenteId),items:ordena((b.items||[]).map(item)),subs:ordena((b.subs||[]).map(bloque))});
  return ordena(rub.map(bloque));
}

/* ---------- Reparto de modelos ---------- */
function _mbCtx(){ const grupo=grupoActual(); const act=grupo&&grupo.actividades.find(a=>a.id===state.ui.corExamId); return act&&mbModelos(act)? {grupo,act} : null; }
function _mbConExamenGeneral(x){ return x.grupo.alumnos.filter(al=>!cxVarianteDeAlumno(x.act,al.id)); }
window.mbSetModelo=(alId,letra)=>{
  const x=_mbCtx(); if(!x) return;
  const a=x.act.modelos.asignados;
  if(letra&&letra!=="A"&&mbModelo(x.act,letra)) a[alId]=letra; else delete a[alId];
  save(); render();
};
function _mbResumen(x){
  const n={}; mbLetras(x.act).forEach(l=>{ n[l]=0; });
  _mbConExamenGeneral(x).forEach(al=>{ n[mbModeloDe(x.act,al.id)]++; });
  return mbLetras(x.act).map(l=>`${n[l]} con el ${l}`).join(", ");
}
function _mbAplicarReparto(x,porAlumno,texto){
  const a={}; Object.keys(porAlumno).forEach(id=>{ if(porAlumno[id]!=="A") a[id]=porAlumno[id]; });
  x.act.modelos.asignados=a; save(); render();
  mostrarToast(`✓ ${texto}: ${_mbResumen(x)}`);
}
window.mbAlternarLista=()=>{
  const x=_mbCtx(); if(!x) return; const L=mbLetras(x.act), rep={};
  _mbConExamenGeneral(x).forEach((al,i)=>{ rep[al.id]=L[i%L.length]; });
  _mbAplicarReparto(x,rep,"Alternados por lista");
};
/* Según el plano de aula: ni el compañero de al lado ni el de delante tienen el mismo modelo.
   Con dos modelos, en damero; con tres, cada fila se desplaza dos puestos respecto a la anterior. */
window.mbAlternarPlano=()=>{
  const x=_mbCtx(); if(!x) return;
  const pos=(x.grupo.plano&&x.grupo.plano.posiciones)||{}, L=mbLetras(x.act), n=L.length;
  const alumnos=_mbConExamenGeneral(x), conSitio=alumnos.filter(al=>pos[al.id]), sinSitio=alumnos.filter(al=>!pos[al.id]);
  if(!conSitio.length){ mostrarAviso("Todavía no hay nadie colocado en el plano de aula de este grupo (pestaña «Plano de aula»). Usa «Alternar por lista»."); return; }
  const rep={};
  conSitio.forEach(al=>{ const f=Number(pos[al.id].fila)||0, c=Number(pos[al.id].col)||0; rep[al.id]=L[(((n===2?f+c:2*f+c))%n+n)%n]; });
  sinSitio.forEach((al,i)=>{ rep[al.id]=L[i%n]; });
  _mbAplicarReparto(x,rep,"Alternados según el plano"+(sinSitio.length?` (${sinSitio.length} sin sitio, por lista)`:""));
};
window.mbTodosA=()=>{ const x=_mbCtx(); if(!x) return; x.act.modelos.asignados={}; save(); render(); mostrarToast("Todo el grupo con el modelo A","info"); };

/* Barra de reparto (encima de la lista de Corregir) y celda de cada alumno/a. */
function mbBarraRepartoHTML(grupo,act){
  if(!mbModelos(act)){
    const hayDiseno=(exTodosSync()||[]).some(r=>r.key===act.id);
    return hayDiseno?`<p class="sub" style="margin:12px 0 0">¿Varios modelos para evitar la copia? Crea el <strong>Modelo B</strong> (y, si quieres, el C) en ✏️ Diseño y luego reparte aquí quién hace cada uno.</p>`:"";
  }
  const x={grupo,act}, L=mbLetras(act);
  const hayB=_mbConExamenGeneral(x).some(al=>mbModeloDe(act,al.id)!=="A");
  const hayPlano=Object.keys((grupo.plano&&grupo.plano.posiciones)||{}).length>0;
  const sinEnlazar=act.rubrica&&!mbRubricaEnlazada(act);
  const lista=L.join("/");
  return `<div class="mb-barra" style="margin-top:12px">
    <span><strong>Modelos:</strong> ${_mbResumen(x)}</span>
    <button class="ghost small" style="border:1px solid var(--line)" onclick="mbAlternarLista()">Alternar ${lista} por lista</button>
    ${hayPlano?`<button class="ghost small" style="border:1px solid var(--line)" title="Ni el compañero de al lado ni el de delante tienen el mismo modelo" onclick="mbAlternarPlano()">Alternar según el plano</button>`:""}
    ${hayB?`<button class="ghost small" style="border:1px solid var(--line)" onclick="mbTodosA()">Todos con el A</button>`:""}
  </div>
  ${sinEnlazar&&hayB?`<div class="alert-box" style="margin-top:8px">🔗 La rúbrica no está enlazada con el diseño, así que los modelos ${L.slice(1).join(" y ")} se corregirán en el orden del A. Enlázala en ✏️ Diseño → «🔗 Enlazar la rúbrica con el diseño» (no se pierde nada de lo corregido).</div>`:""}`;
}
function mbCeldaHTML(act,al){
  if(!mbModelos(act)) return "";
  const va=cxVarianteDeAlumno(act,al.id);
  if(va) return `<td><span class="sub" style="margin:0">${va.tipo==="ausencia"?"Otro día":"Adaptado"}</span></td>`;
  const actual=mbModeloDe(act,al.id);
  return `<td><span class="mb-ab" role="group" aria-label="Modelo de ${esc(al.nombre)}">${mbLetras(act).map(l=>
    `<button class="${actual===l?"on":""}" aria-pressed="${actual===l?"true":"false"}" onclick="mbSetModelo('${escJS(al.id)}','${l}')">${l}</button>`).join("")}</span></td>`;
}

/* ---------- Enlazar una rúbrica hecha a mano con el diseño ---------- */
function _mbNorm(s){
  return String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase()
    .replace(/^\s*(pregunta|ejercicio|apartado|cuestion)?\s*([0-9]+|[a-z]|[ivxlc]+)\s*[).:\-–]\s*/,"")   // numeración del principio
    .replace(/[^a-z0-9ñ]+/g," ").trim();
}
function _mbParecido(a,b){
  a=_mbNorm(a); b=_mbNorm(b);
  if(!a||!b) return 0;
  if(a===b) return 1;
  const corto=a.length<b.length?a:b, largo=a.length<b.length?b:a;
  if(corto.length>=20 && largo.startsWith(corto.slice(0,Math.min(60,corto.length)))) return 0.95;   // enunciado recortado
  const big=s=>{ const m=new Map(); for(let i=0;i<s.length-1;i++){ const k=s.slice(i,i+2); m.set(k,(m.get(k)||0)+1); } return m; };
  const A=big(a.slice(0,160)), B=big(b.slice(0,160)); let c=0, na=0, nb=0;
  A.forEach(v=>{ na+=v; }); B.forEach(v=>{ nb+=v; }); A.forEach((v,k)=>{ c+=Math.min(v,B.get(k)||0); });
  return na+nb? 2*c/(na+nb) : 0;
}
/* Propone el emparejamiento ítem/bloque de la rúbrica → pregunta del diseño. */
function mbProponerEnlaces(rub,est){
  const nodos=[], padre=new Map();
  (function w(l,p){ (l||[]).forEach(n=>{ nodos.push(n); if(p) padre.set(n.id,p.id); w(n.hijos,n); }); })(est.nodos,null);
  const items=cxItemsFlat(rub), bloques=cxNodosFlat(rub).map(x=>x.n);
  const bloqueDe=new Map(); bloques.forEach(b=>(b.items||[]).forEach(it=>bloqueDe.set(it.id,b)));
  const txt=it=>it.label||(bloqueDe.get(it.id)||{}).title||"";
  const pares=[];
  items.filter(it=>!it.fuenteId).forEach(it=>{ nodos.forEach(n=>{
    let p=Math.max(_mbParecido(txt(it),n.rotulo||n.label),_mbParecido(txt(it),n.label));
    if(p<0.35) return;
    if(n.max!=null&&Math.abs((Number(it.max)||0)-n.max)<0.001) p+=0.04;   // mismos puntos: desempata
    if(!(n.hijos||[]).length) p+=0.02;                                        // los ítems suelen ser hojas
    pares.push({it,n,p});
  }); });
  pares.sort((x,y)=>y.p-x.p);
  const usadoIt=new Set(), usadoN=new Set(cxItemsFlat(rub).filter(i=>i.fuenteId).map(i=>i.fuenteId)), enlaces=[];
  pares.forEach(({it,n,p})=>{ if(usadoIt.has(it.id)||usadoN.has(n.id)) return; usadoIt.add(it.id); usadoN.add(n.id); enlaces.push({it,n,p:Math.min(1,p),texto:txt(it)}); });
  const sinPareja=items.filter(it=>!it.fuenteId&&!usadoIt.has(it.id));
  // Bloques por su título (una pregunta que en la rúbrica se ha dividido a mano en partes que el diseño no tiene).
  const parB=[];
  bloques.filter(b=>!b.fuenteId&&String(b.title||"").trim()).forEach(b=>{ nodos.forEach(n=>{
    const p=Math.max(_mbParecido(b.title,n.rotulo||n.label),_mbParecido(b.title,n.label)); if(p>=0.5) parB.push({b,n,p}); }); });
  parB.sort((x,y)=>y.p-x.p);
  const usadoB=new Set(), usadoNB=new Set(bloques.filter(b=>b.fuenteId).map(b=>b.fuenteId)), enlacesBloque=[];
  parB.forEach(({b,n,p})=>{ if(usadoB.has(b.id)||usadoNB.has(n.id)) return; usadoB.add(b.id); usadoNB.add(n.id); enlacesBloque.push({b,n,p:Math.min(1,p),texto:b.title,bloque:true}); });
  // Último recurso, por el número: «7)» de la rúbrica con «7.-» del examen, en el mismo nivel. Va como dudoso.
  const numDe=s=>{ const m=String(s||"").trim().match(/^(?:pregunta|ejercicio)?\s*([0-9]+|[a-z])\s*[).:\-–]/i); return m?m[1].toLowerCase():null; };
  const raizB=new Set(rub), raizN=new Set(est.nodos);
  bloques.filter(b=>!b.fuenteId&&!usadoB.has(b.id)&&numDe(b.title)).forEach(b=>{
    const cand=nodos.filter(n=>!usadoNB.has(n.id)&&numDe(n.label)===numDe(b.title)&&raizB.has(b)===raizN.has(n));
    if(cand.length!==1) return;   // solo si no hay duda de cuál es
    usadoB.add(b.id); usadoNB.add(cand[0].id); enlacesBloque.push({b,n:cand[0],p:0.7,texto:b.title,bloque:true,porNumero:true});
  });
  // Todo lo que se propone aplicar: los ítems, y los bloques que no se deducen ya de sus ítems.
  const itemsEnlazados=new Set(enlaces.map(e=>e.it.id));
  const todos=[...enlaces,...enlacesBloque.filter(e=>!(e.b.items||[]).length||!(e.b.items||[]).every(it=>itemsEnlazados.has(it.id)))];
  return {enlaces,enlacesBloque,todos,sinPareja,padre,nodos};
}
/* Aplica los enlaces: ítems y, por deducción, sus bloques (la pregunta o el apartado común). */
function mbAplicarEnlaces(rub,enlaces,padre){
  enlaces.forEach(e=>{ if(e.bloque) e.b.fuenteId=e.n.id; else e.it.fuenteId=e.n.id; });
  const porItem=new Map(cxItemsFlat(rub).map(it=>[it.id,it.fuenteId]));
  let bloques=0;
  // De dentro afuera: un bloque es la pregunta de su único ítem («pregunta suelta»), o el padre común de lo que contiene.
  const fuenteDe=b=>{
    (b.subs||[]).forEach(fuenteDe);
    if(b.fuenteId) return b.fuenteId;
    const its=(b.items||[]).map(it=>porItem.get(it.id)).filter(Boolean), hijos=(b.subs||[]).map(s=>s.fuenteId).filter(Boolean);
    let f=null;
    if(its.length===1&&!(b.subs||[]).length&&(b.items||[])[0].unico) f=its[0];
    else{ const ps=[...its,...hijos].map(id=>padre.get(id)); if(ps.length&&ps[0]&&ps.every(p=>p===ps[0])&&ps.length===(b.items||[]).length+(b.subs||[]).length) f=ps[0]; }
    if(f){ b.fuenteId=f; bloques++; }
    return b.fuenteId;
  };
  rub.forEach(fuenteDe);
  return bloques;
}
window.mbEnlazarRubrica=async()=>{
  const grupo=grupoActual(), act=grupo&&grupo.actividades.find(a=>a.id===state.ui.corExamId);
  if(!act||!act.rubrica) return;
  const win=_exFrame&&_exFrame.contentWindow;
  if(!win||!win.__ee){ mostrarAviso("Espera a que cargue el editor y vuelve a pulsarlo."); return; }
  exFlush();
  const gen=(await exGet(act.id)||{}).exam;
  if(!gen){ mostrarAviso("Este examen todavía no tiene diseño con el que enlazar la rúbrica."); return; }
  const est=win.__ee.estructura(gen);
  const prop=mbProponerEnlaces(act.rubrica,est), sinPareja=prop.sinPareja, padre=prop.padre, enlaces=prop.todos;
  if(!enlaces.length){ mostrarAviso("No se ha encontrado ninguna pregunta del diseño parecida a los ítems de la rúbrica."); return; }
  const seguros=enlaces.filter(e=>e.p>=0.85), dudosos=enlaces.filter(e=>e.p<0.85);
  const fila=(e,i)=>`<label class="mb-par"><input type="checkbox" data-i="${i}" ${e.p>=0.6?"checked":""}><span><strong>${esc(String(e.texto).slice(0,90))}</strong><br><span class="sub" style="margin:0">→ ${esc(String(e.n.rotulo||e.n.label).slice(0,110))}${e.porNumero?" · emparejados por el número (el texto es distinto)":""}</span></span></label>`;
  const div=document.createElement("div"); div.className="modal-overlay"; div.style.zIndex="1500";
  div.innerHTML=`<div class="modal-box" style="max-width:640px" role="dialog" aria-modal="true" aria-labelledby="mbT">
    <h2 id="mbT" style="font-size:17px">🔗 Enlazar la rúbrica con el diseño</h2>
    <p class="sub">Cada ítem de la rúbrica se empareja con su pregunta del examen por el texto. No cambia ningún ítem, punto, criterio ni lo ya corregido: solo quedan enlazados, y así la rúbrica puede salir en el orden de cada modelo (y «Importar a la rúbrica» los actualizará en vez de duplicarlos).</p>
    <p style="font-size:13.5px;margin:6px 0">✓ <strong>${seguros.length}</strong> enlazados con seguridad${dudosos.length?` · <strong>${dudosos.length}</strong> dudosos (revísalos)`:""}${sinPareja.length?` · <strong>${sinPareja.length}</strong> ítems sin pareja en el diseño: son partes que solo tiene la rúbrica y siguen dentro de su pregunta`:""}</p>
    ${dudosos.length?`<div class="scroll" style="max-height:44vh;border:1px solid var(--line);border-radius:10px;padding:6px 10px">${dudosos.map((e,i)=>fila(e,i)).join("")}</div>`:""}
    <div class="flex" style="justify-content:flex-end;gap:8px;margin-top:14px"><button class="ghost" id="mbNo" style="border:1px solid var(--line)">Cancelar</button><button class="btn" id="mbSi">Enlazar</button></div>
  </div>`;
  document.body.appendChild(div);
  div.querySelector("#mbNo").onclick=()=>div.remove();
  div.querySelector("#mbSi").onclick=()=>{
    const elegidos=[...seguros,...[...div.querySelectorAll("input[data-i]")].filter(c=>c.checked).map(c=>dudosos[Number(c.dataset.i)])];
    div.remove();
    const deducidos=mbAplicarEnlaces(act.rubrica,elegidos,padre);
    const nIt=elegidos.filter(e=>!e.bloque).length, nBl=elegidos.filter(e=>e.bloque).length+deducidos;
    save(); render();
    mostrarToast(`✓ ${nIt} ítem${nIt===1?"":"s"} y ${nBl} pregunta${nBl===1?"":"s"} de la rúbrica enlazados con el diseño`);
  };
};
/* Ítems de la rúbrica general sin enlazar con el diseño (para el botón del Diseño). */
function mbSinEnlazar(act){ return act&&act.rubrica? cxItemsFlat(act.rubrica).filter(it=>!it.fuenteId).length : 0; }
