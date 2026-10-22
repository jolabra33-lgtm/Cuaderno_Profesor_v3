/* ============================================================================
   Cuaderno del profesor · Gestión de plantillas de materias: editar y eliminar/ocultar
   js/nucleo/plantillas-materias.js
   ============================================================================ */

/* =================================================================
   Gestión de plantillas de materias: editar y eliminar/ocultar
   ================================================================= */
function catalogoEsOficial(key){ return !!CATALOGOS[key]; }
function catalogoTieneOverride(key){ return !!(state.catalogosPersonalizados && state.catalogosPersonalizados[key]); }
function catalogoEstaOculto(key){ return !!(state.catalogosOcultos && state.catalogosOcultos[key]); }
function catalogoEsEditableComoTexto(cat){
  // El formulario de texto asume identificadores simples "CE1", "CE2"...; las
  // materias combinadas (p. ej. Ámbito Lingüístico-Social) usan identificadores
  // compuestos ("GH CE1", "Cast CE1"…) que no se pueden reconstruir con ese formato.
  return cat && cat.ces.every(ce=>/^CE\d+$/i.test(ce.id));
}
function clavesUsoCatalogo(key){
  const grupos=(state.grupos||[]).filter(g=>g.catalogoKey===key).map(g=>g.nombre);
  const progs=(state.programaciones||[]).filter(p=>p.catalogoKey===key).map(p=>p.nombre);
  return {grupos,progs};
}
function catalogoATexto(catalogoKey){
  const cat=getCatalogo(catalogoKey); if(!cat) return "";
  const saberesPorCE=progSaberesDelCatalogo(catalogoKey)||{};
  let out=`MATERIA: ${cat.materia}\nCURSO: ${cat.curso}\n\nBLOQUES\n`;
  out+=(cat.bloques||[]).map(b=>`${b.label} = ${b.peso}`).join("\n");
  out+="\n\n";
  out+=cat.ces.map(ce=>{
    const num=ce.id.replace(/^CE/i,"");
    let block=`CE${num}: ${ce.titulo} | ${(ce.cc||[]).join(", ")}\n`;
    block+=ce.criterios.map(c=>`${c.id}: ${c.texto}`).join("\n");
    const sab=saberesPorCE[ce.id];
    if(sab && sab.length) block+="\nSABERES:\n"+sab.map(s=>`- ${s}`).join("\n");
    return block;
  }).join("\n\n");
  return out;
}
function listaPlantillasDatos(){
  const keys=[...ORDEN_CATALOGOS, ...Object.keys(state.catalogosOcultos||{}).filter(k=>!ORDEN_CATALOGOS.includes(k))];
  const oficiales=keys.map(k=>({
    key:k, oficial:true, cat:getCatalogo(k), original:CATALOGOS[k],
    override:catalogoTieneOverride(k), oculto:catalogoEstaOculto(k)
  }));
  const customKeys=Object.keys(state.catalogosPersonalizados||{}).filter(k=>!CATALOGOS[k]);
  const custom=customKeys.map(k=>({key:k, oficial:false, cat:state.catalogosPersonalizados[k], original:null, override:false, oculto:false}));
  return [...oficiales, ...custom];
}
window.editarCatalogo=(key)=>{
  const cat=getCatalogo(key); if(!cat) return;
  if(!catalogoEsEditableComoTexto(cat)){
    mostrarAviso("Esta materia combina varias asignaturas con identificadores compuestos (p. ej. \"GH CE1\") y no se puede editar con este formulario de texto sencillo.");
    return;
  }
  state.ui.catImportTexto=catalogoATexto(key);
  state.ui.catEditKey=key;
  save(); render();
  setTimeout(()=>{
    const ta=document.getElementById("catTexto");
    if(ta){ ta.scrollIntoView({behavior:"smooth",block:"center"}); ta.focus(); }
  },50);
};
window.cancelarEdicionCatalogo=()=>{
  state.ui.catEditKey=""; state.ui.catImportTexto="";
  const ta=document.getElementById("catTexto"); if(ta) ta.value="";
  mostrarResultadoImportacion("");
  save(); render();
};
window.eliminarPlantilla=async (key)=>{
  const {grupos,progs}=clavesUsoCatalogo(key);
  if(grupos.length || progs.length){
    const partes=[];
    if(grupos.length) partes.push(`${grupos.length} grupo(s) (${grupos.join(", ")})`);
    if(progs.length) partes.push(`${progs.length} Programación(es) de Aula (${progs.join(", ")})`);
    mostrarAviso(`No se puede eliminar: la están usando ${partes.join(" y ")}. Cambia su materia o elimínalos primero.`);
    return;
  }
  const oficial=catalogoEsOficial(key);
  const cat=getCatalogo(key); if(!cat) return;
  if(oficial){
    if(!await confirmar(`¿Quitar "${cat.materia} · ${cat.curso}" de las listas para elegir materia? No se borra el contenido: podrás mostrarla de nuevo cuando quieras desde "Plantillas ocultas".`)) return;
    if(!state.catalogosOcultos) state.catalogosOcultos={};
    state.catalogosOcultos[key]=true;
  } else {
    if(!await confirmar(`¿Eliminar la materia importada "${cat.materia} · ${cat.curso}"? Podrás volver a importarla si conservas el texto.`)) return;
    delete state.catalogosPersonalizados[key];
  }
  delete CAT_CACHE[key];
  if(state.ui.catEditKey===key) state.ui.catEditKey="";
  save(); render();
};
window.mostrarPlantilla=(key)=>{
  if(state.catalogosOcultos) delete state.catalogosOcultos[key];
  save(); render();
};
window.restaurarPlantillaOriginal=async (key)=>{
  if(!catalogoTieneOverride(key)) return;
  if(!await confirmar("¿Descartar los cambios y volver a la versión oficial de esta plantilla? Se perderán las modificaciones guardadas.")) return;
  delete state.catalogosPersonalizados[key];
  delete CAT_CACHE[key];
  if(state.ui.catEditKey===key) state.ui.catEditKey="";
  save(); render();
};
