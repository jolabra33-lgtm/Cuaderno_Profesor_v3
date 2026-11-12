/* ============================================================================
   Cuaderno del profesor · Modelo B: orden propio, reparto A/B y rúbrica en su orden
   js/corrector/modelo-b.js
   ============================================================================ */

/* =================================================================
   v3 · MODELO B
   El modelo B es el MISMO examen que el general con las preguntas en otro orden.
   - Solo se guarda el ORDEN (act.modeloB.orden: por cada lista del examen —«_raiz» o el id de
     su apartado o pregunta—, el orden de sus preguntas). El examen B se reconstruye a partir del
     general cada vez: si cambias el general, el B cambia igual; si añades una pregunta, entra en
     el B en un sitio al azar. Antes se guardaba una copia fija que se quedaba anticuada.
   - Las preguntas conservan su identidad (id) en los dos modelos. La rúbrica es una sola: cada
     ítem recuerda la pregunta de la que viene (fuenteId), así que, al corregir a un alumno/a del
     modelo B, se le muestra la rúbrica en el orden del B y con su numeración. Los ítems son los
     mismos: las notas no cambian.
   - Quién hace el B: act.modeloB.alumnos. El alumnado con examen adaptado (NESE) sigue con el suyo.
   - act.modeloB.numA / numB: número de cada pregunta en cada modelo (para «3. … (modelo A: 1.)»).
   - Rúbricas hechas a mano (sin fuenteId): «🔗 Enlazar la rúbrica con el diseño» empareja cada
     ítem con su pregunta por el texto, sin tocar ítems, puntos ni lo ya corregido.
   ================================================================= */
const MB_RAIZ="_raiz";

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
/* Construye el examen B a partir del general y de un orden guardado. Lo que el orden no conoce
   (preguntas nuevas) entra en un sitio al azar; lo que ya no existe se descarta. Sin orden
   guardado, se baraja todo (y nunca queda igual que el A si hay al menos dos preguntas). */
function mbConstruirB(general,orden){
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
  // Para distinguirlo en papel: «Modelo B» encima del título.
  const tit=(ex.body||[]).find(n=>n&&n.type==="title");
  if(tit && !/Modelo B/.test(String(tit.eyebrow||""))) tit.eyebrow=(String(tit.eyebrow||"").trim()?String(tit.eyebrow).trim()+" · ":"")+"Modelo B";
  return {exam:ex,orden:nuevo,nuevas};
}
/* Número de cada pregunta (solo preguntas) según el editor. */
function _mbNumeros(win,exam){
  const out={};
  try{ (function w(l){ (l||[]).forEach(n=>{ if(n.tipo==="question"&&n.num) out[n.id]=n.num; w(n.hijos); }); })(win.__ee.estructura(exam).nodos); }catch(e){}
  return out;
}
/* Pone al día el modelo B con el examen general: reconstruye, guarda el diseño B y la numeración.
   Devuelve el resultado de mbConstruirB, o null si el examen todavía no tiene modelo B. */
async function mbActualizar(act,general,win){
  if(!act||!act.modeloB||!general) return null;
  const r=mbConstruirB(general,act.modeloB.orden);
  if(!act.modeloB.examId) act.modeloB.examId=uid();
  r.exam.id=act.modeloB.examId;   // id propio: las «Versiones» del editor no se mezclan con las del general
  const antes=JSON.stringify([act.modeloB.orden,act.modeloB.numA,act.modeloB.numB]);
  act.modeloB.orden=r.orden;
  if(win&&win.__ee&&win.__ee.estructura){ act.modeloB.numA=_mbNumeros(win,general); act.modeloB.numB=_mbNumeros(win,r.exam); }
  try{ await exPut({key:act.id+":B",exam:r.exam,actualizado:Date.now(),nombre:act.nombre}); }catch(e){}
  if(JSON.stringify([act.modeloB.orden,act.modeloB.numA,act.modeloB.numB])!==antes) save();
  return r;
}
/* Al abrir la pestaña del modelo B: se crea (o se pasa al formato nuevo) y se reconstruye desde el general. */
async function mbPrepararB(act,general,guardado,win){
  let aviso="";
  if(!act.modeloB){
    // Había una copia fija de antes: se conserva su orden en lo que coincida con el general actual.
    act.modeloB={orden:guardado&&guardado.exam?mbOrdenDe(guardado.exam):{},alumnos:[]};
    if(guardado&&guardado.exam){
      const enGeneral=new Set(Object.values(mbOrdenDe(general)).flat()), enB=new Set(Object.values(act.modeloB.orden).flat());
      const faltan=[...enGeneral].filter(id=>!enB.has(id)).length;
      if(faltan) aviso=`El modelo B se ha puesto al día con el examen general: le faltaban ${faltan} pregunta${faltan===1?"":"s"}.`;
    }
  }
  const r=await mbActualizar(act,general,win);
  if(r&&r.nuevas&&!aviso) aviso=`El modelo B se ha puesto al día con el examen general (${r.nuevas} pregunta${r.nuevas===1?" nueva":"s nuevas"}).`;
  return {exam:r?r.exam:null,aviso};
}
/* Lo que se edita en la pestaña del modelo B: solo cuenta el orden de las preguntas. */
let _mbAvisoEdicion={};
async function mbGuardadoEnB(act,exB,win){
  if(!act.modeloB) return;
  const general=(await exGet(act.id)||{}).exam; if(!general) return;
  const orden=mbOrdenDe(exB);
  act.modeloB.orden=orden;
  const r=await mbActualizar(act,general,win);
  if(!r) return;
  const limpio=e=>JSON.stringify((e&&e.body)||[]);
  if(limpio(r.exam)!==limpio(exB) && !_mbAvisoEdicion[act.id]){
    _mbAvisoEdicion[act.id]=true;
    mostrarAviso("En el modelo B solo cuenta el ORDEN de las preguntas (arrástralas o usa «🔀 Mezclar de nuevo»).\n\nLos cambios de texto, puntos o formato hazlos en «Examen general»: el modelo B se genera a partir de él y los cambios hechos aquí no se guardan.","Modelo B");
  }
}

/* ---------- Rúbrica en el orden del modelo B ---------- */
function mbHaceB(act,alId){ return !!(act&&act.modeloB&&(act.modeloB.alumnos||[]).includes(alId)&&!cxVarianteDeAlumno(act,alId)); }
/* ¿Se puede ordenar la rúbrica general según el modelo B? (necesita ítems enlazados con el diseño) */
function mbRubricaEnlazada(act){
  if(!act||!act.modeloB||!act.rubrica) return false;
  const ids=new Set(Object.values(act.modeloB.orden||{}).flat());
  return cxNodosFlat(act.rubrica).some(x=>ids.has(x.n.fuenteId))||cxItemsFlat(act.rubrica).some(it=>ids.has(it.fuenteId));
}
/* Rúbrica que se ve al corregir (e imprimir) a un alumno/a: la suya y, si hace el modelo B, en el
   orden del B. Son los mismos ítems (mismos id): las puntuaciones no cambian. */
function mbRubricaVista(act,alId){
  const rub=cxRubricaDe(act,alId);
  if(!mbHaceB(act,alId)) return rub;
  const mb=act.modeloB, rango=new Map();
  Object.values(mb.orden||{}).forEach(ids=>ids.forEach((id,i)=>rango.set(id,i)));
  const numA=mb.numA||{}, numB=mb.numB||{};
  // Cambia el número del principio por el del modelo B, con el estilo que tenga el texto («2)», «2.-», «2.»…).
  const nucleo=s=>String(s||"").replace(/[^0-9A-Za-z]/g,"");
  const renumera=(txt,fid)=>{
    const a=nucleo(numA[fid]), b=nucleo(numB[fid]); txt=String(txt||"");
    if(!a||!b||a===b) return txt;
    const m=txt.match(new RegExp("^(\\s*)"+a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"(\\s*[).:\\-–]+)"));
    if(!m) return txt;
    return m[1]+b+m[2]+txt.slice(m[0].length)+` (modelo A: ${a})`;
  };
  // Los nodos con pregunta del B ocupan sus huecos en el orden del B; el resto no se mueve.
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
function _mbCtx(){ const grupo=grupoActual(); const act=grupo&&grupo.actividades.find(a=>a.id===state.ui.corExamId); return act&&act.modeloB? {grupo,act} : null; }
function _mbConExamenGeneral(x){ return x.grupo.alumnos.filter(al=>!cxVarianteDeAlumno(x.act,al.id)); }
window.mbSetModelo=(alId,m)=>{
  const x=_mbCtx(); if(!x) return;
  const s=new Set(x.act.modeloB.alumnos||[]); if(m==="B") s.add(alId); else s.delete(alId);
  x.act.modeloB.alumnos=[...s]; save(); render();
};
function _mbAplicarReparto(x,deB,texto){
  x.act.modeloB.alumnos=deB; save(); render();
  mostrarToast(`✓ ${texto}: ${deB.length} con el modelo B, ${_mbConExamenGeneral(x).length-deB.length} con el A`);
}
window.mbAlternarLista=()=>{ const x=_mbCtx(); if(!x) return; _mbAplicarReparto(x,_mbConExamenGeneral(x).filter((al,i)=>i%2===1).map(al=>al.id),"Alternados por lista"); };
/* Según el plano de aula: en damero, así ni el de al lado ni el de delante tienen el mismo modelo. */
window.mbAlternarPlano=()=>{
  const x=_mbCtx(); if(!x) return;
  const pos=(x.grupo.plano&&x.grupo.plano.posiciones)||{};
  const alumnos=_mbConExamenGeneral(x), conSitio=alumnos.filter(al=>pos[al.id]), sinSitio=alumnos.filter(al=>!pos[al.id]);
  if(!conSitio.length){ mostrarAviso("Todavía no hay nadie colocado en el plano de aula de este grupo (pestaña «Plano de aula»). Usa «Alternar por lista»."); return; }
  const deB=conSitio.filter(al=>(Number(pos[al.id].fila)+Number(pos[al.id].col))%2===1).map(al=>al.id)
    .concat(sinSitio.filter((al,i)=>i%2===1).map(al=>al.id));
  _mbAplicarReparto(x,deB,"Alternados según el plano"+(sinSitio.length?` (${sinSitio.length} sin sitio, por lista)`:""));
};
window.mbTodosA=()=>{ const x=_mbCtx(); if(!x) return; x.act.modeloB.alumnos=[]; save(); render(); mostrarToast("Todo el grupo con el modelo A","info"); };

/* Barra de reparto (encima de la lista de Corregir) y celda de cada alumno/a. */
function mbBarraRepartoHTML(grupo,act){
  if(!act.modeloB){
    const hayDiseno=(exTodosSync()||[]).some(r=>r.key===act.id);
    return hayDiseno?`<p class="sub" style="margin:12px 0 0">¿Dos modelos? Abre <strong>Modelo B</strong> en ✏️ Diseño y luego reparte aquí quién hace cada uno.</p>`:"";
  }
  const nB=(act.modeloB.alumnos||[]).filter(id=>!cxVarianteDeAlumno(act,id)&&grupo.alumnos.some(a=>a.id===id)).length;
  const nA=_mbConExamenGeneral({grupo,act}).length-nB;
  const hayPlano=Object.keys((grupo.plano&&grupo.plano.posiciones)||{}).length>0;
  const sinEnlazar=act.rubrica&&!mbRubricaEnlazada(act);
  return `<div class="mb-barra" style="margin-top:12px">
    <span><strong>Modelos:</strong> ${nA} con el A · ${nB} con el B</span>
    <button class="ghost small" style="border:1px solid var(--line)" onclick="mbAlternarLista()">Alternar A/B por lista</button>
    ${hayPlano?`<button class="ghost small" style="border:1px solid var(--line)" title="En damero: ni el compañero de al lado ni el de delante tienen el mismo modelo" onclick="mbAlternarPlano()">Alternar según el plano</button>`:""}
    ${nB?`<button class="ghost small" style="border:1px solid var(--line)" onclick="mbTodosA()">Todos con el A</button>`:""}
  </div>
  ${sinEnlazar&&nB?`<div class="alert-box" style="margin-top:8px">🔗 La rúbrica no está enlazada con el diseño, así que el modelo B se corregirá en el orden del A. Enlázala en ✏️ Diseño → «🔗 Enlazar la rúbrica con el diseño» (no se pierde nada de lo corregido).</div>`:""}`;
}
function mbCeldaHTML(act,al){
  if(!act.modeloB) return "";
  if(cxVarianteDeAlumno(act,al.id)) return `<td><span class="sub" style="margin:0">Adaptado</span></td>`;
  const b=mbHaceB(act,al.id);
  return `<td><span class="mb-ab" role="group" aria-label="Modelo de ${esc(al.nombre)}">
    <button class="${b?"":"on"}" aria-pressed="${b?"false":"true"}" onclick="mbSetModelo('${escJS(al.id)}','A')">A</button><button class="${b?"on":""}" aria-pressed="${b?"true":"false"}" onclick="mbSetModelo('${escJS(al.id)}','B')">B</button>
  </span></td>`;
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
    <p class="sub">Cada ítem de la rúbrica se empareja con su pregunta del examen por el texto. No cambia ningún ítem, punto, criterio ni lo ya corregido: solo quedan enlazados, y así la rúbrica puede salir en el orden del modelo B (y «Importar a la rúbrica» los actualizará en vez de duplicarlos).</p>
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
