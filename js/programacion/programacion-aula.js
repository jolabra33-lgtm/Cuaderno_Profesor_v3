/* ============================================================================
   Cuaderno del profesor · Programación de aula: lista, SdA y recursos
   js/programacion/programacion-aula.js
   ============================================================================ */

/* =================================================================
   PROGRAMACIÓN DE AULA — sección independiente y reutilizable de año
   en año (no vive dentro de un grupo: se crea o duplica al principio
   de curso y se vincula a los grupos que la usan). Se va completando
   poco a poco durante el curso; siempre editable. Cada Situación de
   Aprendizaje (SdA) agrupa actividades con sus criterios de evaluación
   y pesos — las mismas que luego se "recogen" (se copian) en Evaluación
   por Competencias al crear la actividad real, sin volver a marcar los
   criterios dos veces. Una actividad puede pertenecer a varias SdA a la
   vez (típico de un examen que agrupa varios temas).
   ================================================================= */
function progNueva(nombre,catalogoKey){ return {id:uid(), nombre, catalogoKey, sdas:[], actividades:[], recursos:progRecursosDefault(), cursoEscolar:"", profesorNombre:"", metodologia:"", criteriosCalifCualitativa:"", criteriosCalifCuantitativa:""}; }
function progRecursosDefault(){ return {libroTexto:false, presentaciones:false, fichasDossieres:false, mapasAtlas:false, documentalesVideo:false, recursosTIC:false, salidasCampo:false, prensaActualidad:false, otros:""}; }
const PROG_RECURSOS_OPCIONES=[
  {id:"libroTexto", label:"Libro de texto"},
  {id:"presentaciones", label:"Presentaciones digitales"},
  {id:"fichasDossieres", label:"Fichas y dossieres propios"},
  {id:"mapasAtlas", label:"Mapas y atlas"},
  {id:"documentalesVideo", label:"Documentales y vídeos"},
  {id:"recursosTIC", label:"Recursos TIC / plataformas digitales"},
  {id:"salidasCampo", label:"Salidas de campo / visitas"},
  {id:"prensaActualidad", label:"Prensa y actualidad"},
];
function progPorId(id){ return (state.programaciones||[]).find(p=>p.id===id)||null; }
function progDeGrupo(grupo){ return grupo&&grupo.programacionId? progPorId(grupo.programacionId) : null; }
function progSdaDefault(trimestre){ return {id:uid(), titulo:"", trimestre:trimestre??0, sesionesPrevistas:"", saberesIds:[], saberesOtros:"", recursos:[]}; }
function recursoIconoTipo(nombre,url){
  const n=(nombre||"").toLowerCase(), u=(url||"").toLowerCase();
  if(/\.pdf(\?|$|\s)/.test(n)) return "📄";
  if(/\.(docx?|odt)(\?|$|\s)/.test(n)) return "📝";
  if(/\.(pptx?|odp)(\?|$|\s)/.test(n)) return "📊";
  if(/\.(xlsx?|ods|csv)(\?|$|\s)/.test(n)) return "📈";
  if(/\.(mp4|mov|avi|mkv)(\?|$|\s)/.test(n)) return "🎬";
  if(/youtube\.com|youtu\.be|vimeo\.com/.test(u)) return "🎥";
  if(/onedrive\.live\.com|1drv\.ms|sharepoint\.com/.test(u)) return "☁️";
  if(/drive\.google\.com|docs\.google\.com/.test(u)) return "📁";
  return "🔗";
}
function progActividadDefault(){ return {id:uid(), nombre:"", tipo:TIPOS[0], esExamen:false, sdaIds:[], criterios:[]}; }
function progSaberesDelCatalogo(catalogoKey){
  const oficiales=(typeof SABERES_BASICOS!=="undefined" && SABERES_BASICOS[catalogoKey])||null;
  if(oficiales) return oficiales;
  const custom=(state.catalogosPersonalizados||{})[catalogoKey];
  return (custom && custom.saberes) || {};
}
/* CE (competencia específica) de un saber básico marcado en una SdA: el id del
   saber es "CE1#0", "CE1#1"... — la parte antes de "#" es la CE. */
function progCEDeSaber(saberId){ return String(saberId).split("#")[0]; }
/* CEs "habilitadas" para una actividad, según los saberes básicos marcados en
   la(s) SdA a las que está vinculada. Devuelve null si la actividad no está
   vinculada a ninguna SdA (en ese caso no hay restricción posible: se dejan
   ver todas las CE, como hasta ahora). Devuelve un Set (posiblemente vacío,
   si aún no se ha marcado ningún saber) en caso contrario. */
function progCEsPermitidasActividad(p,a){
  const sdaIds=(a.sdaIds||[]);
  if(!sdaIds.length) return null;
  const ces=new Set();
  sdaIds.forEach(sid=>{
    const s=(p.sdas||[]).find(x=>x.id===sid);
    if(!s) return;
    (s.saberesIds||[]).forEach(said=>ces.add(progCEDeSaber(said)));
  });
  return ces;
}
function progSesionesReales(grupo,sdaId){
  return Object.values(grupo.diario||{}).filter(e=>e&&e.unidadId===sdaId).length;
}
function progSdaImpartida(grupo,sdaId){ return progSesionesReales(grupo,sdaId)>0; }
function progFechasReales(grupo,sdaId){
  const fechas=Object.entries(grupo.diario||{}).filter(([,e])=>e&&e.unidadId===sdaId).map(([f])=>f).sort();
  return {inicio:fechas[0]||null, fin:fechas[fechas.length-1]||null};
}
function sdaResumenGrupo(grupo,trim){
  const prog=progDeGrupo(grupo);
  if(!prog) return null;
  const sdas = trim==="curso"? prog.sdas : prog.sdas.filter(s=>s.trimestre===trim);
  const impartidas=sdas.filter(s=>progSdaImpartida(grupo,s.id)).length;
  return {impartidas, total:sdas.length};
}
function sdaResumenTextoNuevo(resumen,opts){
  opts=opts||{};
  const color=opts.print?'#555':'var(--mut)';
  if(!resumen) return `<span style="font-size:13px;color:${color}">Este grupo no tiene una Programación de Aula vinculada (ver Ajustes).</span>`;
  if(!resumen.total) return `<span style="font-size:13px;color:${color}">La Programación vinculada no tiene Situaciones de Aprendizaje en este periodo.</span>`;
  const pct=Math.round(resumen.impartidas/resumen.total*100);
  return `<span style="font-size:13px;color:${color}">SdA impartidas: <strong>${resumen.impartidas} de ${resumen.total}</strong> (${pct}%)</span>`;
}

/* ---- Módulo independiente: lista + detalle (mismo patrón que Refuerzo/Repetición) ---- */
window.progAbrirModalNueva=()=>{ state.ui.progModalNueva=true; render(); };
window.progCerrarModalNueva=()=>{ state.ui.progModalNueva=false; render(); };
window.progCrear=()=>{
  const nombre=(document.getElementById("progNNombre").value||"").trim();
  const catalogoKey=document.getElementById("progNCatalogo").value;
  if(!nombre||!catalogoKey){ mostrarAviso("Escribe un nombre y elige materia/curso."); return; }
  if(!Array.isArray(state.programaciones)) state.programaciones=[];
  const p=progNueva(nombre,catalogoKey);
  state.programaciones.push(p);
  state.ui.progModalNueva=false;
  state.ui.progTab="detalle";
  state.ui.progId=p.id;
  save(); render();
  mostrarToast("✓ Programación creada");
};
window.progExportar=(id)=>{
  const p=progPorId(id); if(!p) return;
  const cat=getCatalogo(p.catalogoKey);
  const paquete={tipo:"geohist-programacion-aula",version:1,exportadoEl:new Date().toISOString(),programacion:p};
  const blob=new Blob([JSON.stringify(paquete,null,2)],{type:"application/json"});
  const u=URL.createObjectURL(blob); const a=document.createElement("a");
  const nombreArchivo="programacion-"+p.nombre.replace(/[^a-z0-9]+/gi,"-").toLowerCase()+".json";
  a.href=u; a.download=nombreArchivo; a.click(); URL.revokeObjectURL(u);
  mostrarToast("✓ Programación exportada");
};
window.progImportarArchivo=inp=>{
  const file=inp.files[0]; if(!file) return;
  const rd=new FileReader();
  rd.onload=()=>{
    let datos;
    try{ datos=JSON.parse(rd.result); }
    catch(e){ mostrarAviso("El archivo no es un JSON válido."); inp.value=""; return; }
    const original = datos && datos.tipo==="geohist-programacion-aula" && datos.programacion ? datos.programacion : (datos && datos.sdas && datos.catalogoKey ? datos : null);
    if(!original){ mostrarAviso("Este archivo no parece ser una Programación de Aula exportada desde esta aplicación."); inp.value=""; return; }
    if(!CATALOGOS[original.catalogoKey] && !(state.catalogosPersonalizados||{})[original.catalogoKey]){
      mostrarAviso("Esta Programación es de una materia/curso que no existe en tu catálogo — no se puede importar.");
      inp.value=""; return;
    }
    // Se importa como una programación NUEVA e independiente: id propio, y los id de
    // sus SdA/actividades se regeneran para no chocar con nada que ya tengas.
    const mapaIds={};
    const nuevasSdas=(original.sdas||[]).map(s=>{ const nid=uid(); mapaIds[s.id]=nid; return {...s,id:nid}; });
    const nuevasActividades=(original.actividades||[]).map(a=>({...a, id:uid(), sdaIds:(a.sdaIds||[]).map(sid=>mapaIds[sid]).filter(Boolean), criterios:(a.criterios||[]).map(c=>({...c})), ...(a.rubrica?{rubrica:JSON.parse(JSON.stringify(a.rubrica))}:{})}));
    const copia={id:uid(), nombre:original.nombre||"Programación importada", catalogoKey:original.catalogoKey,
      sdas:nuevasSdas, actividades:nuevasActividades,
      recursos:{...(original.recursos||progRecursosDefault())}, cursoEscolar:original.cursoEscolar||cursoAcademicoActual(),
      profesorNombre:original.profesorNombre||"",
      metodologia:progTextoAHTML(original.metodologia||""), criteriosCalifCualitativa:progTextoAHTML(original.criteriosCalifCualitativa||""), criteriosCalifCuantitativa:progTextoAHTML(original.criteriosCalifCuantitativa||"")};
    if(!Array.isArray(state.programaciones)) state.programaciones=[];
    state.programaciones.push(copia);
    save(); render();
    mostrarToast("✓ Programación importada — añadida a tu lista");
    inp.value="";
  };
  rd.readAsText(file);
};
window.progDuplicar=(id)=>{
  const orig=progPorId(id); if(!orig) return;
  const mapaIds={};
  const nuevasSdas=orig.sdas.map(s=>{ const nid=uid(); mapaIds[s.id]=nid; return {...s,id:nid}; });
  const nuevasActividades=orig.actividades.map(a=>({...a, id:uid(), sdaIds:(a.sdaIds||[]).map(sid=>mapaIds[sid]).filter(Boolean), criterios:(a.criterios||[]).map(c=>({...c})), ...(a.rubrica?{rubrica:JSON.parse(JSON.stringify(a.rubrica))}:{})}));
  const copia={id:uid(), nombre:orig.nombre+" (copia)", catalogoKey:orig.catalogoKey, sdas:nuevasSdas, actividades:nuevasActividades,
    recursos:{...(orig.recursos||progRecursosDefault())}, cursoEscolar:"", profesorNombre:orig.profesorNombre||"",
    metodologia:orig.metodologia||"", criteriosCalifCualitativa:orig.criteriosCalifCualitativa||"", criteriosCalifCuantitativa:orig.criteriosCalifCuantitativa||""};
  if(!Array.isArray(state.programaciones)) state.programaciones=[];
  state.programaciones.push(copia);
  save(); render();
  mostrarToast("✓ Programación duplicada — lista para un nuevo curso, con el seguimiento en blanco");
};
window.progEliminar=async (id)=>{
  const usada=(state.grupos||[]).some(g=>g.programacionId===id);
  if(usada && !await confirmar("Hay grupos vinculados a esta Programación. Si la eliminas, esos grupos se quedarán sin Programación de Aula vinculada (sus actividades ya creadas no se ven afectadas). ¿Continuar?")) return;
  if(!usada && !await confirmar("¿Eliminar esta Programación de Aula? No se puede deshacer.")) return;
  state.programaciones=(state.programaciones||[]).filter(p=>p.id!==id);
  (state.grupos||[]).forEach(g=>{ if(g.programacionId===id) g.programacionId=""; });
  state.ui.progId=""; state.ui.progTab="lista";
  save(); render();
  mostrarToast("Programación eliminada","info");
};
window.progAbrirDetalle=(id)=>{ state.ui.progTab="detalle"; state.ui.progId=id; save(); render(); };
window.progVolverLista=()=>{ state.ui.progTab="lista"; state.ui.progId=""; save(); render(); };

function progRenderModalNuevaHTML(){
  const builtKeys=ORDEN_CATALOGOS.filter(k=>!catalogoEstaOculto(k));
  const customKeys=Object.keys(state.catalogosPersonalizados||{}).filter(k=>!CATALOGOS[k]);
  const catalogos=[...builtKeys,...customKeys].map(k=>[k,getCatalogo(k)]);
  return `<div class="modal-overlay" onclick="if(event.target===this) progCerrarModalNueva()">
    <div class="modal-box" style="max-width:440px">
      <div class="flex" style="justify-content:space-between;align-items:center">
        <h2 style="font-size:16px">Nueva Programación de Aula</h2>
        <button class="ghost" onclick="progCerrarModalNueva()">✕</button>
      </div>
      <div class="grid" style="gap:10px;margin-top:10px">
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Nombre
          <input class="in" id="progNNombre" style="width:100%;margin-top:4px" placeholder="Ej. 2.º ESO — Geografía e Historia">
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Materia y curso
          <select class="in" id="progNCatalogo" style="width:100%;margin-top:4px">
            ${catalogos.map(([key,cat])=>`<option value="${key}">${esc(cat.materia)} · ${esc(cat.curso)}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="flex" style="justify-content:flex-end;margin-top:16px">
        <button class="ghost" onclick="progCerrarModalNueva()">Cancelar</button>
        <button class="btn" onclick="progCrear()">Crear</button>
      </div>
    </div>
  </div>`;
}
function progListaHTML(root){
  const progs=state.programaciones||[];
  root.innerHTML=`
  <div class="card">
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
      <div><h2 style="font-size:15px">📘 Programaciones de Aula</h2><p class="sub" style="margin:0">Se crean una vez y se reutilizan curso tras curso. "Duplicar" es la forma de reaprovechar una programación en un año nuevo, con el seguimiento en blanco.</p></div>
      <div class="flex">
        <label class="in file" style="text-align:center">Importar programación…
          <input type="file" accept=".json,application/json" style="display:none" onchange="progImportarArchivo(this)">
        </label>
        <button class="btn" onclick="progAbrirModalNueva()">+ Nueva programación</button>
      </div>
    </div>
    <p class="sub" style="margin:8px 0 0">Importar añade la programación del archivo a tu lista, sin tocar ni sobrescribir ninguna de las que ya tengas.</p>
  </div>
  ${progs.length? progs.map(p=>{
      const cat=getCatalogo(p.catalogoKey);
      const gruposVinculados=(state.grupos||[]).filter(g=>g.programacionId===p.id).map(g=>g.nombre);
      return `<div class="card" style="cursor:pointer" onclick="progAbrirDetalle('${p.id}')">
        <div class="flex" style="justify-content:space-between;align-items:flex-start">
          <div>
            <strong style="font-size:14.5px">${esc(p.nombre)}</strong>
            <div class="sub" style="margin:2px 0 0">${esc(cat.materia)} · ${esc(cat.curso)} · ${p.sdas.length} SdA · ${p.actividades.length} actividad${p.actividades.length===1?"":"es"}</div>
            <div class="sub" style="margin:2px 0 0">${gruposVinculados.length? "Vinculada a: "+gruposVinculados.map(esc).join(", ") : "Sin grupos vinculados todavía"}</div>
          </div>
          <div class="flex" onclick="event.stopPropagation()">
            <button class="ghost" style="border:1px solid var(--line)" onclick="progExportar('${p.id}')">Exportar (.json)</button>
            <button class="ghost" style="border:1px solid var(--line)" onclick="progDuplicar('${p.id}')">Duplicar</button>
            <button class="ghost danger" onclick="progEliminar('${p.id}')">Eliminar</button>
          </div>
        </div>
      </div>`;
    }).join("") : `<div class="card"><p class="sub" style="margin:0">Todavía no has creado ninguna Programación de Aula.</p></div>`}
  ${renderGestionCatalogosHTML()}
  `;
  bindGestionCatalogosEventos();
}

/* ---- Detalle: SdA por trimestre + actividades (con criterios y pesos, y enlace a una o varias SdA) ---- */
window.progAnadirSda=(trimestre)=>{ const p=progPorId(state.ui.progId); if(!p) return; p.sdas.push(progSdaDefault(trimestre)); save(); render(); };
window.progMoverSda=(sdaId,dir)=>{
  const p=progPorId(state.ui.progId); if(!p) return;
  const sda=p.sdas.find(s=>s.id===sdaId); if(!sda) return;
  const mismos=p.sdas.filter(s=>s.trimestre===sda.trimestre);
  const posSub=mismos.findIndex(s=>s.id===sdaId);
  const posVecinoSub=posSub+dir;
  if(posVecinoSub<0||posVecinoSub>=mismos.length) return;
  const vecino=mismos[posVecinoSub];
  const i1=p.sdas.indexOf(sda), i2=p.sdas.indexOf(vecino);
  [p.sdas[i1],p.sdas[i2]]=[p.sdas[i2],p.sdas[i1]];
  save(); render();
};
let __progDragSdaId=null;
window.progSdaDragStart=(ev,sdaId)=>{
  __progDragSdaId=sdaId;
  try{ ev.dataTransfer.effectAllowed="move"; ev.dataTransfer.setData("text/plain",sdaId); }catch(e){}
};
window.progSdaDrop=(ev,trimestreDestino,antesDeId)=>{
  ev.preventDefault();
  let sdaId=__progDragSdaId;
  try{ sdaId = sdaId || (ev.dataTransfer && ev.dataTransfer.getData("text/plain")); }catch(e){}
  __progDragSdaId=null;
  if(!sdaId || sdaId===antesDeId) return;
  const p=progPorId(state.ui.progId); if(!p) return;
  const sda=p.sdas.find(s=>s.id===sdaId); if(!sda) return;
  const idxActual=p.sdas.indexOf(sda);
  p.sdas.splice(idxActual,1);
  sda.trimestre=trimestreDestino;
  if(antesDeId){
    let idxDestino=p.sdas.findIndex(s=>s.id===antesDeId);
    p.sdas.splice(idxDestino<0?p.sdas.length:idxDestino,0,sda);
  }else{
    let lastIdx=-1;
    p.sdas.forEach((s,i)=>{ if(s.trimestre===trimestreDestino) lastIdx=i; });
    p.sdas.splice(lastIdx+1,0,sda);
  }
  save(); render();
};
window.progEliminarSda=async (sdaId)=>{
  const p=progPorId(state.ui.progId); if(!p) return;
  if(!await confirmar("¿Eliminar esta Situación de Aprendizaje? Las actividades que solo estuvieran enlazadas a ella se quedarán sin SdA asignada. No se puede deshacer.")) return;
  p.sdas=p.sdas.filter(s=>s.id!==sdaId);
  p.actividades.forEach(a=>{ a.sdaIds=(a.sdaIds||[]).filter(id=>id!==sdaId); });
  save(); render();
};
window.progAnadirRecurso=(sdaId)=>{
  const p=progPorId(state.ui.progId); if(!p) return;
  const s=p.sdas.find(x=>x.id===sdaId); if(!s) return;
  const inNombre=document.getElementById("progRecNombre_"+sdaId);
  const inEnlace=document.getElementById("progRecEnlace_"+sdaId);
  const nombre=(inNombre.value||"").trim();
  let enlace=(inEnlace.value||"").trim();
  if(!nombre||!enlace){ mostrarAviso("Escribe un nombre y pega el enlace."); return; }
  if(!/^https?:\/\//i.test(enlace)) enlace="https://"+enlace;
  if(!Array.isArray(s.recursos)) s.recursos=[];
  s.recursos.push({id:uid(), nombre, enlace});
  save(); render();
  mostrarToast("✓ Recurso añadido");
};
window.progEliminarRecurso=(sdaId,recursoId)=>{
  const p=progPorId(state.ui.progId); if(!p) return;
  const s=p.sdas.find(x=>x.id===sdaId); if(!s) return;
  s.recursos=(s.recursos||[]).filter(r=>r.id!==recursoId);
  save(); render();
};
window.progSetSdaCampo=(sdaId,campo,valor)=>{
  const p=progPorId(state.ui.progId); if(!p) return;
  const s=p.sdas.find(x=>x.id===sdaId); if(!s) return;
  s[campo]= campo==="trimestre"?Number(valor):valor;
  save(); if(campo==="trimestre") render();
};
window.progToggleRecurso=(id,checked)=>{
  const p=progPorId(state.ui.progId); if(!p) return;
  if(!p.recursos) p.recursos=progRecursosDefault();
  p.recursos[id]=checked; save();
};
window.progSetCampo=(campo,valor)=>{
  const p=progPorId(state.ui.progId); if(!p) return;
  p[campo]=valor; save();
};
window.progSetRecursoOtros=(valor)=>{
  const p=progPorId(state.ui.progId); if(!p) return;
  if(!p.recursos) p.recursos=progRecursosDefault();
  p.recursos.otros=valor; save();
};

