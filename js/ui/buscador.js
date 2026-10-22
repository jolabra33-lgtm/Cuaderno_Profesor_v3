/* ============================================================================
   Cuaderno del profesor · Buscador global
   js/ui/buscador.js
   ============================================================================ */

/* =================================================================
   BUSCADOR GLOBAL — alumnado, actividades/exámenes, reuniones y
   eventos de calendario, en toda la aplicación a la vez. Vive fuera
   del árbol de render() habitual: es una capa aparte sobre cualquier
   pantalla, así que no toca state.ui ni se guarda con la copia.
   ================================================================= */
let _buscarModalEl=null;
function buscarCoincide(texto,tokens){
  const t=normalizarTexto(texto);
  return tokens.every(tok=>t.includes(tok));
}
function buscarResultados(q){
  const tokens=normalizarTexto(q).split(/\s+/).filter(Boolean);
  const vacio={alumnos:[],actividades:[],reuniones:[],refuerzo:[],repeticion:[],eventos:[],programaciones:[]};
  if(!tokens.length) return vacio;
  const alumnos=[];
  state.grupos.forEach(g=>g.alumnos.forEach(al=>{ if(buscarCoincide(al.nombre,tokens)) alumnos.push({al,g}); }));
  const actividades=[];
  state.grupos.forEach(g=>g.actividades.forEach(a=>{ if(buscarCoincide(a.nombre,tokens)||buscarCoincide(a.sda||"",tokens)) actividades.push({a,g}); }));
  const reuniones=(state.reuniones||[]).filter(r=>buscarCoincide(r.titulo||"",tokens)
    || (r.asistentes||[]).some(x=>buscarCoincide(x.nombre||"",tokens)));
  const refuerzo=(state.planesRefuerzo||[]).filter(p=>{
    const alV=rfAlumno(p);
    return buscarCoincide(p.titulo||"",tokens) || (alV&&buscarCoincide(alV.al.nombre,tokens));
  });
  const repeticion=(state.planesRepeticion||[]).filter(p=>{
    const alV=rpAlumno(p);
    return buscarCoincide(p.cursoRepite||"",tokens) || (alV&&buscarCoincide(alV.al.nombre,tokens)) || buscarCoincide(p.alumnoNombre||"",tokens);
  });
  const eventos=(state.eventos||[]).filter(e=>buscarCoincide(e.titulo||"",tokens));
  const programaciones=(state.programaciones||[]).filter(p=>{
    const cat=catIndex(p.catalogoKey).cat;
    return buscarCoincide(p.nombre||"",tokens) || buscarCoincide((cat&&cat.materia)||"",tokens) || buscarCoincide((cat&&cat.curso)||"",tokens);
  });
  return { alumnos:alumnos.slice(0,8), actividades:actividades.slice(0,8), reuniones:reuniones.slice(0,8), refuerzo:refuerzo.slice(0,8), repeticion:repeticion.slice(0,8), eventos:eventos.slice(0,8), programaciones:programaciones.slice(0,8) };
}
function buscarFilaHTML(titulo,meta,onclick){
  return `<div class="ag-evento" onclick="${onclick}">
    <div class="ag-evento-info"><div class="ag-evento-titulo">${titulo}</div><div class="ag-evento-grupo">${meta}</div></div>
  </div>`;
}
function buscarNavItems(){
  const items=[
    {label:"🏠 Inicio", modo:"inicio"},
    {label:"📊 Evaluación por Competencias", modo:"competencial"},
    {label:"📘 Programación de Aula", modo:"programacion"},
    {label:"🖊️ Corrector de Exámenes", modo:"corrector"},
    {label:"🗂️ Reuniones", modo:"reuniones"},
    {label:"📈 Plan de Refuerzo", modo:"refuerzo"},
    {label:"🔁 Plan de Repetición", modo:"repeticion"},
    {label:"🧩 Alumnos NESE", modo:"nese"},
    {label:"📋 Memoria de curso", modo:"memoria"},
  ].map(it=>({label:it.label, meta:"Ir al módulo", onclick:`buscarIrModulo('${it.modo}')`}));
  state.grupos.forEach(g=>{
    items.push({label:`👥 ${esc(g.nombre)}`, meta:"Ir al grupo", onclick:`buscarIrGrupo('${g.id}')`});
  });
  return items;
}
window.buscarIrModulo=(modo)=>{ buscarCerrar(); state.ui.appMode=modo; save(); render(); };
window.buscarIrGrupo=(gid)=>{ buscarCerrar(); state.ui.appMode="competencial"; state.ui.grupoId=gid; state.ui.tab="alumnos"; save(); render(); };
window.buscarIrProgramacion=(pid)=>{ buscarCerrar(); state.ui.appMode="programacion"; state.ui.progTab="detalle"; state.ui.progId=pid; state.ui.progDetTab="general"; save(); render(); };
function buscarRenderResultados(q){
  const cont=document.getElementById("buscarResultados"); if(!cont) return;
  const secc=(titulo,html)=> html? `<div class="section-eyebrow" style="margin-top:12px">${titulo}</div>${html}` : "";
  const qn=q.trim();
  const navFiltrados=buscarNavItems().filter(it=>!qn||normalizarTexto(it.label).includes(normalizarTexto(qn)));
  const navHtml=secc("Ir a…", navFiltrados.map(it=>buscarFilaHTML(it.label,it.meta,it.onclick)).join(""));
  if(!qn){
    cont.innerHTML=navHtml+'<p class="sub" style="margin:12px 0 0">O escribe para buscar en alumnado, Programaciones de Aula, actividades y exámenes, reuniones, planes y eventos del calendario, de todos los grupos a la vez.</p>';
    return;
  }
  const r=buscarResultados(q);
  const total=r.alumnos.length+r.actividades.length+r.reuniones.length+r.refuerzo.length+r.repeticion.length+r.eventos.length+r.programaciones.length;
  if(!total && !navFiltrados.length){ cont.innerHTML=`<p class="sub" style="margin:6px 0 0">Sin resultados para "${esc(q)}".</p>`; return; }
  let html=navHtml;
  html+=secc("Alumnado", r.alumnos.map(({al,g})=>buscarFilaHTML(esc(al.nombre)+neseBadgeHTML(al), esc(g.nombre), `buscarIrAlumno('${g.id}','${al.id}')`)).join(""));
  html+=secc("Programaciones de Aula", r.programaciones.map(p=>{ const cat=catIndex(p.catalogoKey).cat; return buscarFilaHTML(esc(p.nombre), `${esc((cat&&cat.materia)||"")} · ${esc((cat&&cat.curso)||"")}`, `buscarIrProgramacion('${p.id}')`); }).join(""));
  html+=secc("Actividades y exámenes", r.actividades.map(({a,g})=>buscarFilaHTML(esc(a.nombre)+(a.rubrica?" 🖊️":""), `${esc(g.nombre)} · ${TRIMESTRES[a.trimestre]}`, `buscarIrActividad('${g.id}','${a.id}')`)).join(""));
  html+=secc("Reuniones", r.reuniones.map(re=>buscarFilaHTML(esc(re.titulo), `${reTipoInfo(re.tipo).label}${re.fecha?" · "+fmt2(re.fecha):""}`, `buscarIrReunion('${re.id}')`)).join(""));
  html+=secc("Planes de refuerzo", r.refuerzo.map(p=>buscarFilaHTML(esc(p.titulo), `${esc(rfNombre(p))} · ${rfEstadoInfo(p.estado).label}`, `buscarIrRefuerzo('${p.id}')`)).join(""));
  html+=secc("Planes de repetición", r.repeticion.map(p=>buscarFilaHTML(esc(rpNombre(p)), `${rpEstadoInfo(p.estado).label}${p.cursoRepite?" · "+esc(p.cursoRepite):""}`, `buscarIrRepeticion('${p.id}')`)).join(""));
  html+=secc("Calendario", r.eventos.map(e=>buscarFilaHTML(esc(e.titulo), fmt2(e.fecha), `buscarIrEvento('${e.fecha}','${e.id}')`)).join(""));
  cont.innerHTML=html;
}
window.buscarAbrir=()=>{
  if(_buscarModalEl) return;
  const div=document.createElement("div");
  div.className="modal-overlay";
  div.onclick=e=>{ if(e.target===div) buscarCerrar(); };
  div.innerHTML=`
    <div class="modal-box" style="max-width:560px">
      <div class="flex" style="justify-content:space-between;align-items:center">
        <h2 style="font-size:17px">🔍 Buscar</h2>
        <button class="modal-close" onclick="buscarCerrar()">×</button>
      </div>
      <input class="in" id="buscarInput" style="width:100%;margin-top:10px;font-size:15px" placeholder="Alumnado, Programaciones, exámenes, reuniones, eventos…" autocomplete="off">
      <div id="buscarResultados" class="scroll" style="margin-top:4px;max-height:50vh"></div>
    </div>`;
  document.body.appendChild(div);
  _buscarModalEl=div;
  const inp=document.getElementById("buscarInput");
  inp.addEventListener("input",()=>buscarRenderResultados(inp.value));
  buscarRenderResultados("");
  setTimeout(()=>inp.focus(),30);
};
window.buscarCerrar=()=>{ if(_buscarModalEl){ _buscarModalEl.remove(); _buscarModalEl=null; } };
document.addEventListener("keydown",e=>{
  if((e.ctrlKey||e.metaKey) && (e.key==="k"||e.key==="K")){ e.preventDefault(); _buscarModalEl?buscarCerrar():buscarAbrir(); }
  else if(e.key==="Escape" && _buscarModalEl){ buscarCerrar(); }
});
window.buscarIrAlumno=(gid,alId)=>{
  buscarCerrar();
  state.ui.appMode="competencial"; state.ui.grupoId=gid; state.ui.tab="resultados"; state.ui.resAl=alId;
  save(); render();
};
window.buscarIrActividad=(gid,aId)=>{
  buscarCerrar();
  const g=state.grupos.find(x=>x.id===gid); const a=g&&g.actividades.find(x=>x.id===aId);
  if(a && a.rubrica){ cxAbrirDesdeOtroModo(aId); return; }
  state.ui.appMode="competencial"; state.ui.grupoId=gid; state.ui.tab="actividades"; if(a) state.ui.trim=a.trimestre;
  save(); render();
};
window.buscarIrReunion=id=>{ buscarCerrar(); reAbrirDesdeOtroModo(id); };
window.buscarIrEvento=(fecha,id)=>{
  buscarCerrar();
  state.ui.appMode="inicio"; state.ui.agMes=fecha.slice(0,7);
  agAbrirModal(fecha,id);
};
window.buscarIrRefuerzo=id=>{ buscarCerrar(); rfAbrirDesdeOtroModo(id); };
window.buscarIrRepeticion=id=>{ buscarCerrar(); rpAbrirDesdeOtroModo(id); };

