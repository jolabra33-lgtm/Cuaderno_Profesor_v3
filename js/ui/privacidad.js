/* ============================================================================
   Cuaderno del profesor · Privacidad en el aula: modo proyector y ajustes del bloqueo con PIN
   js/ui/privacidad.js
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

/* =================================================================
   v3 · BLOQUEO CON PIN — ajustes (🛟 Copias)
   El bloqueo en sí está en js/bloqueo.js, que cargan el Cuaderno y
   Tutoría antes que nada. Aquí solo se activa, se cambia o se quita.
   ================================================================= */
const BLOQUEO_MINUTOS=[[1,"1 minuto"],[5,"5 minutos"],[15,"15 minutos"],[60,"1 hora"],[0,"Solo al abrir la app"]];
function bloqueoSeccionHTML(){
  const B=window.BloqueoPIN; if(!B || !B.disponible) return "";
  const nota=`<p class="sub" style="margin:6px 0 0">Evita que alguien abra la app en un descuido (un alumno con el iPad, el ordenador del aula). Vale también para Tutoría. <strong>No cifra los datos</strong>: para eso protege el dispositivo con su contraseña y usa copias cifradas.</p>`;
  if(!B.activo) return `<div class="card" style="margin:0 0 10px;padding:12px 14px">
    <strong style="font-size:13.5px">🔒 Bloqueo con PIN</strong>
    <p class="sub" style="margin:4px 0 8px">Pide un PIN al abrir la app y tras unos minutos sin usarla.</p>
    <button class="btn small" onclick="bloqueoActivar()">Activar el PIN</button>${nota}</div>`;
  return `<div class="card" style="margin:0 0 10px;padding:12px 14px">
    <strong style="font-size:13.5px">🔒 Bloqueo con PIN</strong>
    <p class="sub" style="margin:4px 0 8px">✓ Activado. Con 🔒 en la cabecera bloqueas la app al momento.</p>
    <div class="flex" style="gap:6px;flex-wrap:wrap;align-items:center">
      <label class="sub" style="margin:0" for="bloqueoMin">Bloquear sola tras</label>
      <select class="in" id="bloqueoMin" style="padding:6px 9px" onchange="BloqueoPIN.cambiarMinutos(this.value);mostrarToast('✓ Guardado')">${BLOQUEO_MINUTOS.map(([m,l])=>`<option value="${m}" ${B.minutos===m?"selected":""}>${l}</option>`).join("")}</select>
      <button class="ghost small" style="border:1px solid var(--line)" onclick="bloqueoActivar(true)">Cambiar el PIN</button>
      <button class="ghost small" style="border:1px solid var(--line)" onclick="bloqueoQuitar()">Quitar el PIN</button>
    </div>${nota}</div>`;
}
/* Pide un PIN nuevo (dos veces) en una ventana propia. Devuelve el PIN o null. */
function bloqueoPedirPin(titulo,texto,confirmarlo){
  return new Promise(resolve=>{
    const div=document.createElement("div"); div.className="modal-overlay"; div.style.zIndex="1500";
    div.innerHTML=`<div class="modal-box" style="max-width:400px" role="dialog" aria-modal="true" aria-labelledby="bqpT">
      <h2 id="bqpT" style="font-size:17px">${titulo}</h2>
      <p class="sub">${texto}</p>
      <input class="in" type="password" inputmode="numeric" autocomplete="off" maxlength="12" id="bqp1" aria-label="PIN" placeholder="PIN (4 a 12 cifras)" style="width:100%;margin-top:6px">
      ${confirmarlo?'<input class="in" type="password" inputmode="numeric" autocomplete="off" maxlength="12" id="bqp2" aria-label="Repite el PIN" placeholder="Repite el PIN" style="width:100%;margin-top:8px">':""}
      <div id="bqpErr" role="alert" style="color:var(--danger,#b91c1c);font-size:12.5px;min-height:18px;margin-top:6px"></div>
      <div class="flex" style="justify-content:flex-end;gap:8px"><button class="ghost" id="bqpNo" style="border:1px solid var(--line)">Cancelar</button><button class="btn" id="bqpSi">Aceptar</button></div></div>`;
    document.body.appendChild(div);
    const p1=div.querySelector("#bqp1"), p2=div.querySelector("#bqp2"), err=div.querySelector("#bqpErr");
    const fin=v=>{ div.remove(); resolve(v); };
    const ok=()=>{
      if(confirmarlo && !/^\d{4,12}$/.test(p1.value)){ err.textContent="El PIN debe tener entre 4 y 12 cifras."; return; }
      if(confirmarlo && p1.value!==p2.value){ err.textContent="Los dos PIN no coinciden."; return; }
      if(!p1.value){ err.textContent="Escribe el PIN."; return; }
      fin(p1.value);
    };
    div.querySelector("#bqpSi").onclick=ok;
    div.querySelector("#bqpNo").onclick=()=>fin(null);
    div.addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); e.stopPropagation(); ok(); } else if(e.key==="Escape"){ e.stopPropagation(); fin(null); } });
    setTimeout(()=>p1.focus(),30);
  });
}
window.bloqueoActivar=async(cambio)=>{
  const B=window.BloqueoPIN; if(!B) return;
  if(cambio){
    const actual=await bloqueoPedirPin("🔒 Cambiar el PIN","Escribe primero el PIN actual.",false);
    if(actual==null) return;
    if(!await B.comprobar(actual)){ mostrarAviso("Ese no es el PIN actual."); return; }
  }
  const pin=await bloqueoPedirPin(cambio?"🔒 PIN nuevo":"🔒 Activar el bloqueo con PIN","Elige un PIN de 4 a 12 cifras. Se pedirá al abrir la app (el Cuaderno y Tutoría) y tras unos minutos sin usarla.",true);
  if(pin==null) return;
  let codigo;
  try{ codigo=await B.configurar(pin, cambio?B.minutos:5); }catch(e){ mostrarAviso(e.message||String(e)); return; }
  if(_copiasModalEl) pintarCopias();
  await mostrarAviso("Apunta este código de recuperación y guárdalo fuera de este dispositivo:\n\n"+codigo+"\n\nSi olvidas el PIN, con él podrás quitarlo («He olvidado el PIN»). No se volverá a mostrar.","🔒 PIN "+(cambio?"cambiado":"activado"));
};
window.bloqueoQuitar=async()=>{
  const B=window.BloqueoPIN; if(!B) return;
  const pin=await bloqueoPedirPin("🔓 Quitar el PIN","Escribe el PIN actual para quitar el bloqueo.",false);
  if(pin==null) return;
  if(!await B.comprobar(pin)){ mostrarAviso("Ese no es el PIN actual."); return; }
  B.quitar();
  if(_copiasModalEl) pintarCopias();
  mostrarToast("PIN quitado: la app ya no se bloquea","info");
};
