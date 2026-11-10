/* ============================================================================
   Cuaderno del profesor · Modo proyector: oculta nombres del alumnado y notas
   js/ui/modo-proyector.js
   ============================================================================ */

/* =================================================================
   v3 · MODO PROYECTOR
   Para usar la app con la pantalla proyectada o a la vista de la clase.
   Con el botón 🙈 de la cabecera, los nombres del alumnado (y de sus
   familias) y las notas de su misma fila se muestran difuminados en
   todas las pantallas, ventanas y resultados del buscador.
   - No cambia ningún dato: es solo cómo se pinta. Es una preferencia del
     dispositivo, como el tema, y no viaja con las copias.
   - Un campo difuminado se ve con normalidad mientras se escribe en él.
   - Al imprimir, todo sale sin difuminar.
   - El panel de Sorteo y Grupos no se difumina: está pensado para
     proyectarlo (lleva data-sin-privacidad).
   Cómo funciona: tras cada cambio de la página se recorren los textos y
   campos; lo que coincide con el nombre de un alumno/a recibe la clase
   «priv», y también las notas de su fila o tarjeta.
   ================================================================= */
let _proyector=false, _proyObs=null, _proyNombres=null, _proyFirma="";
try{ _proyector=localStorage.getItem("geohist_proyector")==="1"; }catch(e){}

function _proyEscRe(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); }
/* Nombres que hay que ocultar: se recalculan solo si cambia la lista de alumnado. */
function _proyDatos(){
  const firma=(state.grupos||[]).map(g=>g.id+":"+g.alumnos.length+":"+((g.papelera&&g.papelera.alumnos)||[]).length).join("|")+"#"+(state._guardadoEn||0);
  if(_proyNombres && firma===_proyFirma) return _proyNombres;
  const exactos=new Set(), largos=new Set();
  const anota=(s,soloExacto)=>{ const t=normalizarTexto(s); if(t.length<2) return; exactos.add(t); if(!soloExacto && t.length>=5) largos.add(t); };
  (state.grupos||[]).forEach(g=>[...(g.alumnos||[]),...(((g.papelera||{}).alumnos)||[]).map(x=>x.alumno||x)].forEach(a=>{
    if(!a) return;
    anota(a.nombre);                                             // «Apellidos, Nombre»
    if(a.apellidos&&a.nombreP){ anota(a.nombreP+" "+a.apellidos); anota(a.apellidos+" "+a.nombreP); }
    anota(a.apellidos,true); anota(a.nombreP,true);              // sueltos, solo si el texto es exactamente eso
    (a.familia||[]).forEach(f=>{ if(f){ anota(f.nombre); anota(f.email); } });
  }));
  const lista=[...largos].sort((x,y)=>y.length-x.length);
  _proyFirma=firma;
  return _proyNombres={exactos, re:lista.length?new RegExp(lista.map(_proyEscRe).join("|")):null};
}
function _proyEsNombre(txt,d){
  const t=normalizarTexto(txt);
  if(t.length<2) return false;
  return d.exactos.has(t) || (d.re && t.length>=5 && d.re.test(t));
}
const _PROY_FILA="tr, .cal-tarjeta, li, .ag-evento, .gcard";
const _PROY_NOTA=/^\s*\d{1,3}([.,]\d{1,2})?\s*%?\s*$/;
function proyectorPasada(){
  if(!_proyector || !document.body || typeof state==="undefined" || !state) return;
  const d=_proyDatos(), marcados=[];
  const fuera=el=>!el || el.closest("[data-sin-privacidad], script, style, #unaVentanaOverlay, #bloqueoOverlay");
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT); let n;
  while((n=w.nextNode())){
    const pe=n.parentElement;
    if(!pe || pe.classList.contains("priv") || n.nodeValue.length<2 || fuera(pe)) continue;
    if(pe.tagName==="OPTION"){ if(pe.selected && _proyEsNombre(n.nodeValue,d)) marcados.push(pe.parentElement.closest("select")||pe.parentElement); continue; }
    if(_proyEsNombre(n.nodeValue,d)) marcados.push(pe);
  }
  document.body.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="date"]):not([type="number"]):not([type="password"]), textarea').forEach(el=>{
    if(!el.classList.contains("priv") && el.value && !fuera(el) && _proyEsNombre(el.value,d)) marcados.push(el);
  });
  marcados.forEach(el=>{
    el.classList.add("priv");
    // Las notas de la misma fila o tarjeta que el nombre.
    const fila=el.closest(_PROY_FILA); if(!fila || fila.dataset.privFila) return;
    fila.dataset.privFila="1";
    fila.querySelectorAll(".pill, input[data-cal-col], input[type=number], .cal-crit .on, .chip.on").forEach(x=>x.classList.add("priv"));
    fila.querySelectorAll("td").forEach(td=>{ if(!td.children.length && _PROY_NOTA.test(td.textContent)) td.classList.add("priv"); });
  });
}
function _proyAplicar(){
  document.body.setAttribute("data-proyector",_proyector?"1":"0");
  const btn=document.getElementById("proyectorBtn");
  if(btn){ btn.textContent=_proyector?"🙈":"👁️"; btn.setAttribute("aria-pressed",_proyector?"true":"false");
    btn.title=_proyector?"Modo proyector ACTIVADO: los nombres del alumnado y las notas se ven difuminados. Pulsa para mostrarlos.":"Modo proyector: difumina los nombres del alumnado y las notas (para proyectar la pantalla)"; }
  if(_proyObs){ _proyObs.disconnect(); _proyObs=null; }
  if(_proyector){
    // Cualquier cambio de la página (otra pantalla, una ventana, resultados del buscador) se repasa antes de pintarse.
    _proyObs=new MutationObserver(()=>{ try{ proyectorPasada(); }catch(e){} });
    _proyObs.observe(document.body,{childList:true,subtree:true,characterData:true});
    try{ proyectorPasada(); }catch(e){}
  }else{
    document.querySelectorAll(".priv").forEach(el=>el.classList.remove("priv"));
    document.querySelectorAll("[data-priv-fila]").forEach(el=>el.removeAttribute("data-priv-fila"));
  }
}
window.toggleProyector=()=>{
  _proyector=!_proyector;
  try{ localStorage.setItem("geohist_proyector",_proyector?"1":"0"); }catch(e){}
  _proyAplicar();
  mostrarToast(_proyector?"🙈 Modo proyector: nombres y notas difuminados":"👁️ Nombres y notas visibles","info");
};
