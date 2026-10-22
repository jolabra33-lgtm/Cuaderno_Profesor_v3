/* ============================================================================
   Cuaderno del profesor · Modelo de datos: grupos, alumnado, columnas de la lista
   js/nucleo/modelo-datos.js
   ============================================================================ */

function defGrupo(nombre,catalogoKey){
  const cat=getCatalogo(catalogoKey);
  return {
    id:uid(), nombre, catalogoKey,
    alumnos:[], actividades:[], notas:{}, notasCuant:{}, rubricScores:{}, examComentarios:{}, entregasInforme:{},
    pesos:{crit:{},ceCc:{}}, pesosTrim:{},
    umbrales:{excelente:85,adecuado:65,enProceso:45},
    sdaPrevistas:[null,null,null],
    propuestasMejora:["","",""], propuestasMejoraFinal:"",
    bloques:cat.bloques.map((b,i)=>({id:"b"+i,label:b.label,peso:b.peso})),
    marcas:{}, papelera:{alumnos:[],actividades:[]}, diario:{}, asistencia:{}, convivencia:[], contactosFamilia:[], fechasTrimestre:[{inicio:"",fin:""},{inicio:"",fin:""},{inicio:"",fin:""}], programacionId:"",
    plano:{filas:5,columnas:6,posiciones:{}}
  };
}
function normalizarGrupo(g){
  if(!g.pesosTrim) g.pesosTrim={};
  if(!g.marcas || typeof g.marcas!=="object") g.marcas={};
  if(!g.notasCuant || typeof g.notasCuant!=="object") g.notasCuant={};
  if(!g.rubricScores || typeof g.rubricScores!=="object") g.rubricScores={};
  if(!g.examComentarios || typeof g.examComentarios!=="object") g.examComentarios={};
  if(!g.entregasInforme || typeof g.entregasInforme!=="object") g.entregasInforme={};
  if(!Array.isArray(g.sdaPrevistas)) g.sdaPrevistas=[null,null,null];
  if(!g.plano || typeof g.plano!=="object") g.plano={filas:5,columnas:6,posiciones:{}};
  if(typeof g.plano.filas!=="number") g.plano.filas=5;
  if(typeof g.plano.columnas!=="number") g.plano.columnas=6;
  if(!g.plano.posiciones || typeof g.plano.posiciones!=="object") g.plano.posiciones={};
  if(!Array.isArray(g.propuestasMejora)) g.propuestasMejora=["","",""];
  if(typeof g.propuestasMejoraFinal!=="string") g.propuestasMejoraFinal="";
  if(!g.papelera) g.papelera={alumnos:[],actividades:[]};
  if(!Array.isArray(g.papelera.alumnos)) g.papelera.alumnos=[];
  if(!Array.isArray(g.papelera.actividades)) g.papelera.actividades=[];
  if(!g.diario || typeof g.diario!=="object") g.diario={};
  Object.keys(g.diario).forEach(fecha=>{
    if(typeof g.diario[fecha]==="string") g.diario[fecha]={nota:g.diario[fecha],unidadId:""};
    else if(g.diario[fecha] && typeof g.diario[fecha].unidadId!=="string") g.diario[fecha].unidadId="";
  });
  if(g.diarioOrden!=null && !Array.isArray(g.diarioOrden)) g.diarioOrden=null;
  if(!g.asistencia || typeof g.asistencia!=="object") g.asistencia={};
  if(!Array.isArray(g.convivencia)) g.convivencia=[];
  if(!Array.isArray(g.contactosFamilia)) g.contactosFamilia=[];
  if(!Array.isArray(g.fechasTrimestre) || g.fechasTrimestre.length!==3) g.fechasTrimestre=[{inicio:"",fin:""},{inicio:"",fin:""},{inicio:"",fin:""}];
  if(g.programacionId===undefined) g.programacionId="";
  return g;
}
function haceTiempo(ts){
  const diff=Date.now()-ts;
  const min=Math.floor(diff/60000);
  if(min<1) return "hace un momento";
  if(min<60) return `hace ${min} min`;
  const h=Math.floor(min/60);
  if(h<24) return `hace ${h} h`;
  const d=Math.floor(h/24);
  return `hace ${d} día${d===1?"":"s"}`;
}
function defAppState(){ return { grupos:[], catalogosPersonalizados:{}, catalogosOcultos:{}, eventos:[], festivos:[], tiposColores:{}, reuniones:[], plantillasRubrica:[], plantillasReunion:[], planesRefuerzo:[], planesRepeticion:[], planesNESE:[], horario:{celdas:{}}, centroNombre:"", centroCodigo:"", cursoEscolarGlobal:cursoAcademicoActual(), profesorNombreGlobal:"", programaciones:[], ui:{
  appMode:"inicio", corTab:"lista", corExamId:"", corAlId:"", corItemAbierto:"", corForm:{nombre:"",bloqueId:"",sda:"",fecha:"",plantillaId:""},
  agMes:"", agModalFecha:"", agModalEventId:"", agVista:"mes", agFiltroGrupo:"", agFiltroTipo:"", agDiaSel:"", diarioFecha:"", asistFecha:"", asistDesde:"", asistHasta:"",
  convVista:"lista", convId:"", convModalNueva:false, convFiltroAlumno:"", convFiltroTipo:"",
  famModalNueva:false, famFiltroAlumno:"", famFiltroMedio:"", resumenFiltroTrim:"", progTab:"lista", progId:"", progModalNueva:false, progActividadAbierta:null, progSaberesAbierto:null,
  reTab:"lista", reId:"", reModalNueva:false, reFiltroTipo:"", reBusqueda:"", reFiltroDesde:"", reFiltroHasta:"",
  rfTab:"lista", rfId:"", rfModalNueva:false, rfFiltroEstado:"", rfBusqueda:"",
  neTab:"lista", neId:"", neModalCrear:null, prepNuevoModal:null, horModalCelda:null,
  rpTab:"lista", rpId:"", rpModalNueva:false, rpFiltroEstado:"", rpBusqueda:"", prepModal:null,
  grupoId:null, tab:"alumnos", trim:0, calAct:"", calViewMode:"cards", resAl:"", evolModalAl:"", evolPeriodo:0, asistModalAl:"", convModalAl:"", cxVerEstadisticas:false, alumAbierto:null, alumPendAbierto:null, fichaAlumnoId:"", alumColumnasOcultas:[], alumColAnchos:{}, alumSortCol:"", alumSortDir:"asc", memoriaPeriodo:"curso",
  form:{editId:null,nombre:"",tipo:TIPOS[0],esExamen:false,bloqueId:"",pesoBloque:"",links:[],sda:""},
  nuevoGrupo:{nombre:"",catalogoKey:ORDEN_CATALOGOS[0]}, catImportTexto:"" } }; }

function splitApellidosNombre(str){
  str=(str||"").trim();
  if(!str) return {apellidos:"",nombreP:""};
  const i=str.indexOf(",");
  if(i>=0) return {apellidos:str.slice(0,i).trim(), nombreP:str.slice(i+1).trim()};
  return {apellidos:str, nombreP:""};
}
function nombreCompleto(apellidos,nombreP){
  apellidos=(apellidos||"").trim(); nombreP=(nombreP||"").trim();
  if(apellidos && nombreP) return `${apellidos}, ${nombreP}`;
  return apellidos || nombreP || "";
}
function normalizarTexto(str){
  return String(str||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/\s+/g," ");
}
/* Normaliza un nombre de curso ("2\u00ba ESO", "2.\u00ba ESO", "2 eso"\u2026) a una forma
   comparable, quitando ordinales y puntuaci\u00f3n pero conservando el n\u00famero y
   la etapa, para poder casar el texto libre de "curso que repite" con el
   campo "curso" de los cat\u00e1logos de materias. */
function normalizarCurso(str){
  return normalizarTexto(str).replace(/[.\u00ba\u00aa]/g,"").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
}
const collatorEs=new Intl.Collator("es",{sensitivity:"base"});
function ordenarAlumnos(grupo){
  grupo.alumnos.sort((a,b)=>
    collatorEs.compare(a.apellidos||a.nombre||"", b.apellidos||b.nombre||"") ||
    collatorEs.compare(a.nombreP||"", b.nombreP||""));
}
function neseBadgeHTML(a){
  if(!a.nese) return "";
  const txt = a.neseNivel? `NESE · ${a.neseNivel}` : "NESE";
  return `<span class="badge" style="font-size:10px;margin-left:9px;color:var(--warning);border-color:var(--warning);vertical-align:middle" title="Necesidad específica de apoyo educativo">${esc(txt)}</span>`;
}
function planBadgeHTML(a){
  if(!a.plan) return "";
  const label=a.plan==="refuerzo"?"Refuerzo":"Repetición";
  const color=a.plan==="refuerzo"?"#2563eb":"#7c3aed";
  return `<span class="badge" style="font-size:10px;margin-left:9px;color:${color};border-color:${color};vertical-align:middle">${label}</span>`;
}
function repetidorBadgeHTML(a){
  if(!a.repetidor) return "";
  return `<span class="badge" style="font-size:10px;margin-left:9px;color:#dc2626;border-color:#dc2626;vertical-align:middle">Repite</span>`;
}
function normalizarAlumno(a){
  if(a.observaciones===undefined) a.observaciones=a.comentario||"";
  if(!Array.isArray(a.comentariosEval)) a.comentariosEval=["","",""];
  while(a.comentariosEval.length<3) a.comentariosEval.push("");
  delete a.comentario;
  if(a.apellidos===undefined || a.nombreP===undefined){
    const partes=splitApellidosNombre(a.nombre||"");
    if(a.apellidos===undefined) a.apellidos=partes.apellidos;
    if(a.nombreP===undefined) a.nombreP=partes.nombreP;
  }
  a.nombre = nombreCompleto(a.apellidos,a.nombreP) || a.nombre || "";
  if(a.nese===undefined) a.nese=false;
  if(a.neseNivel===undefined) a.neseNivel="";
  if(a.neseNivelOtro===undefined) a.neseNivelOtro = !!(a.neseNivel && !NIVELES_NESE.includes(a.neseNivel));
  if(a.plan===undefined) a.plan="";
  if(a.repetidor===undefined) a.repetidor=false;
  if(!Array.isArray(a.pendientes)) a.pendientes=[];
  if(a.fechaNacimiento===undefined) a.fechaNacimiento="";
  // v7: dos contactos de la familia (parentesco, nombre y correo)
  if(!Array.isArray(a.familia)) a.familia=[];
  while(a.familia.length<2) a.familia.push({parentesco:"",nombre:"",email:""});
  a.familia=a.familia.slice(0,2).map(f=>({parentesco:(f&&f.parentesco)||"",nombre:(f&&f.nombre)||"",email:(f&&f.email)||""}));
  return a;
}
function calcularEdad(fechaNacimiento){
  if(!fechaNacimiento) return null;
  const nac=new Date(fechaNacimiento+"T00:00:00");
  if(isNaN(nac.getTime())) return null;
  const hoy=new Date();
  let edad=hoy.getFullYear()-nac.getFullYear();
  const m=hoy.getMonth()-nac.getMonth();
  if(m<0 || (m===0 && hoy.getDate()<nac.getDate())) edad--;
  return edad>=0 && edad<130 ? edad : null;
}
const ALUM_COLUMNAS_OPCIONALES=[
  {id:"nese",label:"NESE",sortKey:"nese"},
  {id:"nivelNese",label:"Nivel NESE"},
  {id:"plan",label:"Plan",sortKey:"plan"},
  {id:"repite",label:"Repite",sortKey:"repite"},
  {id:"pendientes",label:"Pendientes"},
  {id:"nacimiento",label:"Nacimiento",sortKey:"nacimiento"},
  {id:"edad",label:"Edad"},
  {id:"familia",label:"Correo familia"},
];
function alumColVisible(colId){ return !(state.ui.alumColumnasOcultas||[]).includes(colId); }

// Anchos por defecto de cada columna (px) — el usuario puede redimensionar
// arrastrando el borde derecho de cualquier cabecera; lo elegido se recuerda.
const ALUM_COL_ANCHO_DEFECTO={
  apellidos:170, nombre:130, nese:55, nivelNese:115, plan:110,
  repite:65, pendientes:105, nacimiento:130, edad:65, familia:90
};
function alumColAncho(colId){
  const guardado=(state.ui.alumColAnchos||{})[colId];
  return guardado || ALUM_COL_ANCHO_DEFECTO[colId] || 100;
}
window.alumStartResize=(e,colId)=>{
  e.preventDefault(); e.stopPropagation();
  const startX=e.clientX;
  const anchoInicial=alumColAncho(colId);
  const overlay=document.createElement("div");
  overlay.style.cssText="position:fixed;inset:0;cursor:col-resize;z-index:9999";
  document.body.appendChild(overlay);
  function onMove(ev){
    const nuevo=Math.max(40, anchoInicial+(ev.clientX-startX));
    if(!state.ui.alumColAnchos) state.ui.alumColAnchos={};
    state.ui.alumColAnchos[colId]=nuevo;
    const tabla=document.getElementById("tablaAlumnos");
    if(tabla){
      const col=tabla.querySelector(`col[data-alumcol="${colId}"]`);
      if(col) col.style.width=nuevo+"px";
      const colsVisiblesIds=["apellidos","nombre",...ALUM_COLUMNAS_OPCIONALES.filter(c=>alumColVisible(c.id)).map(c=>c.id)];
      const anchoTotal=colsVisiblesIds.reduce((s,id)=>s+alumColAncho(id),0)+66+74+78;
      tabla.style.width=anchoTotal+"px";
    }
  }
  function onUp(){
    document.body.removeChild(overlay);
    overlay.removeEventListener("mousemove",onMove);
    overlay.removeEventListener("mouseup",onUp);
    save();
  }
  overlay.addEventListener("mousemove",onMove);
  overlay.addEventListener("mouseup",onUp);
};

// Ordenación: se recuerda una sola preferencia para toda la aplicación,
// igual que ya pasa con qué columnas se ocultan.
window.alumSetSort=(col)=>{
  if(state.ui.alumSortCol===col) state.ui.alumSortDir=state.ui.alumSortDir==="asc"?"desc":"asc";
  else { state.ui.alumSortCol=col; state.ui.alumSortDir="asc"; }
  save(); render();
};
function alumSortearAlumnos(alumnos){
  const col=state.ui.alumSortCol;
  if(!col) return alumnos;
  const dir=state.ui.alumSortDir==="desc"?-1:1;
  const arr=[...alumnos];
  arr.sort((a,b)=>{
    let va,vb;
    if(col==="apellidos"){ va=(a.apellidos||"")+" "+(a.nombreP||""); vb=(b.apellidos||"")+" "+(b.nombreP||""); return dir*va.localeCompare(vb,"es"); }
    if(col==="nese"){ va=a.nese?1:0; vb=b.nese?1:0; return dir*(va-vb); }
    if(col==="plan"){ va=a.plan||""; vb=b.plan||""; return dir*va.localeCompare(vb,"es"); }
    if(col==="repite"){ va=a.repetidor?1:0; vb=b.repetidor?1:0; return dir*(va-vb); }
    if(col==="nacimiento"){ va=a.fechaNacimiento||""; vb=b.fechaNacimiento||""; return dir*va.localeCompare(vb); }
    return 0;
  });
  return arr;
}
function alumThHTML(colId,label,opts){
  opts=opts||{};
  const ancho=alumColAncho(colId);
  const sk=opts.sortKey;
  const activo=sk && state.ui.alumSortCol===sk;
  const indicador=sk?`<span style="font-size:9px;margin-left:3px;opacity:${activo?1:0.4};color:${activo?"var(--accent-2)":"inherit"}">${activo?(state.ui.alumSortDir==="asc"?"▲":"▼"):"⇅"}</span>`:"";
  const clickAttr=sk?` onclick="alumSetSort('${sk}')"`:"";
  return `<th style="overflow:hidden;white-space:nowrap;font-size:${opts.small?"11.5px":"12.5px"};${sk?"cursor:pointer;user-select:none;":""}"${clickAttr}>${esc(label)}${indicador}<div class="alum-col-resizer" onmousedown="alumStartResize(event,'${colId}')"></div></th>`;
}
window.toggleColumnasAlumnoPanel=()=>{ alumColumnasPanelAbierto=!alumColumnasPanelAbierto; render(); };
window.toggleColumnaAlumno=(colId,visible)=>{
  if(!Array.isArray(state.ui.alumColumnasOcultas)) state.ui.alumColumnasOcultas=[];
  const idx=state.ui.alumColumnasOcultas.indexOf(colId);
  if(!visible && idx===-1) state.ui.alumColumnasOcultas.push(colId);
  else if(visible && idx!==-1) state.ui.alumColumnasOcultas.splice(idx,1);
  save(); render();
};

