/* ============================================================================
   Cuaderno del profesor · Planificación temporal de la materia (herramienta incrustada)
   js/programacion/planificacion-temporal.js
   ============================================================================ */

/* =================================================================
   PLANIFICACIÓN TEMPORAL DE LA MATERIA — integrada como pestaña de
   cada Programación de Aula. Se embebe como una app HTML autónoma
   (la misma que el usuario ya tenía suelta) dentro de un
   <iframe srcdoc>, sembrada con los datos guardados en la propia
   Programación (p.planTemp) o, si todavía no hay ninguno, con una
   plantilla de ejemplo cuyo nombre de materia/curso se adapta a la
   Programación desde la que se abre. Los cambios que se hacen dentro
   del iframe llegan al documento principal por postMessage y se
   guardan (con un pequeño retardo, para no escribir en cada pulsación)
   en state.programaciones[].planTemp — no hace falta ningún botón de
   "guardar" aparte.
   ================================================================= */
let __planTempDefaultCache=null;
/* La plantilla de la herramienta está en tools/planificacion.html (antes iba incrustada en base64).
   Se descarga una sola vez (y queda en la caché del service worker para el uso sin conexión). */
let __planTempHtml=null, __planTempPromesa=null;
function planTempAsegurar(){
  if(__planTempHtml!==null) return Promise.resolve(true);
  if(!__planTempPromesa) __planTempPromesa=fetch("tools/planificacion.html").then(r=>{ if(!r.ok) throw new Error("HTTP "+r.status); return r.text(); })
    .then(t=>{ __planTempHtml=t; return true; })
    .catch(()=>{ __planTempPromesa=null; return false; });
  return __planTempPromesa;
}
function planTempTemplateHTML(){
  if(__planTempHtml===null) throw new Error("La plantilla de la Planificación temporal todavía no se ha cargado");
  return __planTempHtml;
}
function planTempDefaultData(){
  if(__planTempDefaultCache) return __planTempDefaultCache;
  try{
    const html=planTempTemplateHTML();
    const m=html.match(/<script type="application\/json" id="course-data">([\s\S]*?)<\/script>/);
    __planTempDefaultCache = m? JSON.parse(m[1]) : {};
  }catch(e){ __planTempDefaultCache={}; }
  return __planTempDefaultCache;
}
function planTempSeedPara(p){
  if(p.planTemp) return p.planTemp;
  const idx=catIndex(p.catalogoKey), cat=idx.cat;
  const base=JSON.parse(JSON.stringify(planTempDefaultData()));
  const materia=cat.materia||"", curso=cat.curso||"";
  base.subjectName={es:materia,va:materia};
  base.courseLevel={es:curso,va:curso};
  if(p.cursoEscolar) base.courseLabel=p.cursoEscolar;
  return base;
}
function planTempBuildDoc(p){
  const seed=planTempSeedPara(p);
  const html=planTempTemplateHTML();
  const seedJSON=JSON.stringify(seed).replace(/<\/script/gi,"<\\/script");
  return html.replace(/<script type="application\/json" id="course-data">[\s\S]*?<\/script>/, `<script type="application/json" id="course-data">${seedJSON}<\/script>`);
}
async function planTempMontar(p){
  const wrap=document.getElementById("planTempWrap");
  if(!wrap) return;
  wrap.innerHTML="";
  if(!await planTempAsegurar()){ wrap.innerHTML=`<div class="card" style="padding:14px 16px;color:var(--mut)">${location.protocol==="file:"?"La Planificación temporal necesita abrir la app desde su dirección web (GitHub Pages): el navegador no la deja cargar si abres <code>index.html</code> con doble clic.":"No se ha podido cargar la herramienta de Planificación temporal. Comprueba la conexión y vuelve a abrir esta pestaña (una vez cargada, funciona sin conexión)."}</div>`; return; }
  if(!document.getElementById("planTempWrap")) return;
  const ifr=document.createElement("iframe");
  ifr.name=p.id;
  ifr.title="Planificación temporal de la materia";
  ifr.setAttribute("sandbox","allow-scripts allow-downloads allow-modals allow-forms allow-popups");
  ifr.style.cssText="width:100%;height:82vh;border:0;display:block;background:#fff";
  wrap.appendChild(ifr);
  ifr.srcdoc=planTempBuildDoc(p);
}
window.addEventListener("message",(ev)=>{
  const d=ev.data;
  if(!d || d.type!=="planTempState" || !d.progId) return;
  // v2: solo se aceptan mensajes de la propia Planificación temporal incrustada.
  const ifr=document.querySelector("#planTempWrap iframe");
  if(!ifr || ev.source!==ifr.contentWindow || ifr.name!==d.progId) return;
  const p=progPorId(d.progId);
  if(!p) return;
  p.planTemp=d.state;
  if(Array.isArray(d.unitsSchedule)) p.planTempUnitsSchedule=d.unitsSchedule;
  clearTimeout(window.__planTempSaveTimer);
  window.__planTempSaveTimer=setTimeout(()=>{ save(); },500);
});
window.progSetDetTab=(tab)=>{ state.ui.progDetTab=tab; save(); render(); };
function planTempL0(v){ return (v&&typeof v==="object")?(v.es||v.va||""):(v||""); }
window.planTempImportarSdas=async (progId)=>{
  const p=progPorId(progId); if(!p) return;
  if(!p.sdas||!p.sdas.length){ mostrarAviso("Esta Programación todavía no tiene ninguna Situación de Aprendizaje en la pestaña «Programación». Añade alguna primero y luego tráela aquí."); return; }
  if(!await confirmar(`Se va a sustituir la lista de situaciones de la Planificación temporal por las ${p.sdas.length} de la Programación (ordenadas por trimestre). Si una situación ya existía en la planificación con el mismo nombre, conserva su número de sesiones y su "fijación" de fecha. ¿Continuar?`)) return;
  if(!p.planTemp && !await planTempAsegurar()){ mostrarAviso("No se ha podido cargar la herramienta de Planificación temporal. Comprueba la conexión e inténtalo de nuevo."); return; }
  const seedBase = p.planTemp ? JSON.parse(JSON.stringify(p.planTemp)) : planTempSeedPara(p);
  const existentesPorNombre = {};
  (seedBase.units||[]).forEach(u=>{ existentesPorNombre[planTempL0(u.name).trim().toLowerCase()] = u; });
  const ordenadas=[...p.sdas].sort((a,b)=>(a.trimestre||0)-(b.trimestre||0));
  seedBase.units = ordenadas.map(s=>{
    const nombre=(s.titulo||"Situación sin título").trim();
    const prev = existentesPorNombre[nombre.toLowerCase()];
    return {name:{es:nombre,va:nombre}, sessions: Number(s.sesionesPrevistas)||(prev?prev.sessions:6), fixed: prev?!!prev.fixed:false};
  });
  p.planTemp = seedBase;
  save();
  planTempMontar(p);
};
window.planTempAplicarAProgramacion=async (progId)=>{
  const p=progPorId(progId); if(!p) return;
  const sched=p.planTempUnitsSchedule;
  if(!sched||!sched.length){ mostrarAviso("Todavía no hay datos calculados en la Planificación temporal para aplicar. Abre esa pestaña y comprueba que tiene situaciones con fechas."); return; }
  const nuevasPrevias=sched.filter(u=>{
    const nombre=(u.name||"").trim().toLowerCase();
    return nombre && !p.sdas.some(s=>(s.titulo||"").trim().toLowerCase()===nombre);
  }).length;
  const msg=nuevasPrevias
    ? `Esto actualizará las sesiones previstas y el trimestre de las Situaciones de Aprendizaje que ya existan en la Programación con el mismo nombre, y creará ${nuevasPrevias} nueva(s) que hay en la Planificación temporal pero todavía no están en la Programación. ¿Continuar?`
    : "Esto actualizará, en la Programación, las sesiones previstas (y el trimestre) de cada Situación de Aprendizaje cuyo nombre coincida exactamente con una de la Planificación temporal. ¿Continuar?";
  if(!await confirmar(msg)) return;
  const TRIM_DESDE_PT={1:0,2:1,3:2}; // en la Programación el trimestre se guarda 0-indexado
  let actualizadas=0, creadas=0;
  sched.forEach(u=>{
    const nombre=(u.name||"").trim();
    if(!nombre) return;
    const trimestre=(u.trimestres && u.trimestres.length && TRIM_DESDE_PT[u.trimestres[0]]!==undefined) ? TRIM_DESDE_PT[u.trimestres[0]] : 0;
    let sda=p.sdas.find(s=>(s.titulo||"").trim().toLowerCase()===nombre.toLowerCase());
    if(sda){
      sda.sesionesPrevistas = u.sessions;
      sda.trimestre = trimestre;
      actualizadas++;
    }else{
      const nueva=progSdaDefault(trimestre);
      nueva.titulo=nombre;
      nueva.sesionesPrevistas=u.sessions;
      p.sdas.push(nueva);
      creadas++;
    }
  });
  save();
  if(!actualizadas && !creadas){ mostrarAviso("No se encontró ninguna Situación de Aprendizaje con nombre en la Planificación temporal."); return; }
  mostrarToast(`✓ ${actualizadas} actualizada(s)${creadas?`, ${creadas} creada(s)`:""}`);
  render();
};

function renderProgramacionApp(){
  const app=document.getElementById("app");
  app.innerHTML=`<div class="card" style="padding:12px 16px">
    <div class="flex" style="justify-content:space-between">
      <div><strong style="font-size:15px">📘 Programación de Aula</strong><span style="color:var(--mut);font-size:13px"> · reutilizable de año en año</span></div>
      <button class="ghost" style="border:1px solid var(--line)" onclick="irInicio()">🏠 Inicio</button>
    </div>
  </div><div id="progRoot"></div>`;
  const root=document.getElementById("progRoot");
  if(state.ui.progTab==="detalle" && state.ui.progId && progPorId(state.ui.progId)){
    progDetalleHTML(root);
  }else{
    progListaHTML(root);
  }
  if(state.ui.progModalNueva) root.insertAdjacentHTML("beforeend", progRenderModalNuevaHTML());
}
