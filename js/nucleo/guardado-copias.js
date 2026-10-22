/* ============================================================================
   Cuaderno del profesor · Guardado a prueba de pérdidas, deshacer/rehacer y copias automáticas
   js/nucleo/guardado-copias.js
   ============================================================================ */

/* =================================================================
   v1 · GUARDADO A PRUEBA DE PÉRDIDAS
   1) Almacenamiento principal: localStorage (como hasta ahora).
   2) Copia interna espejo en IndexedDB (sin el límite de ~5 MB y menos
      expuesta a borrados): si la principal falla o se borra, al abrir la
      app se recuperan los datos de aquí automáticamente.
   3) Copias automáticas (instantáneas) en IndexedDB: cada pocas horas de
      trabajo y SIEMPRE antes de importar o restaurar. Se consultan y
      restauran en 🛟 Copias.
   4) Se pide al navegador que no borre estos datos (storage.persist).
   El contador «cambios sin copia» solo cuenta cambios de DATOS (notas,
   alumnado…), no la navegación entre pantallas.
   ================================================================= */
const IDB_NOMBRE="cuaderno-profesor-db";
let _idbPromesa=null;
function idbAbrir(){
  if(_idbPromesa) return _idbPromesa;
  _idbPromesa=new Promise((res,rej)=>{
    if(!window.indexedDB){ rej(new Error("IndexedDB no disponible")); return; }
    let r; try{ r=indexedDB.open(IDB_NOMBRE,1); }catch(e){ rej(e); return; }
    r.onupgradeneeded=()=>{
      const db=r.result;
      if(!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      if(!db.objectStoreNames.contains("copias")) db.createObjectStore("copias",{keyPath:"id"});
    };
    r.onsuccess=()=>res(r.result);
    r.onerror=()=>rej(r.error);
    r.onblocked=()=>rej(new Error("IndexedDB bloqueada"));
  });
  _idbPromesa.catch(()=>{ _idbPromesa=null; });
  return _idbPromesa;
}
function idbReq(store,mode,fn){
  return idbAbrir().then(db=>new Promise((res,rej)=>{
    let tx; try{ tx=db.transaction(store,mode); }catch(e){ rej(e); return; }
    const req=fn(tx.objectStore(store));
    let out; if(req) req.onsuccess=()=>{ out=req.result; };
    tx.oncomplete=()=>res(out);
    tx.onerror=()=>rej(tx.error);
    tx.onabort=()=>rej(tx.error||new Error("abortada"));
  }));
}
const idbGet=(store,key)=>idbReq(store,"readonly",st=>st.get(key));
const idbPut=(store,val,key)=>idbReq(store,"readwrite",st=>key===undefined?st.put(val):st.put(val,key));
const idbDel=(store,key)=>idbReq(store,"readwrite",st=>st.delete(key));
const idbAll=(store)=>idbReq(store,"readonly",st=>st.getAll());

let _ultimoDatosStr=null, _idbEspejoTimer=null, _idbJsonPendiente=null;
function _datosSinUI(obj){
  const {ui,cambiosSinCopia,lastBackupAt,_guardadoEn,_ultimaCopiaAuto,...resto}=obj||state;
  return JSON.stringify(resto);
}
/* =================================================================
   v4 · DESHACER / REHACER
   Cada cambio de DATOS guarda el estado anterior (sin la navegación) en
   una pila de hasta 30 pasos (y ~25 MB). ↶ en la barra superior o
   Ctrl/Cmd+Z deshace; Ctrl/Cmd+Mayús+Z (o Ctrl+Y) rehace. Si estás
   escribiendo en un campo de texto, Ctrl+Z sigue deshaciendo el texto.
   ================================================================= */
const _pilaDeshacer=[], _pilaRehacer=[];
let _aplicandoDeshacer=false;
function _actualizarBotonesDeshacer(){
  [["btnDeshacer",_pilaDeshacer],["btnRehacer",_pilaRehacer]].forEach(([id,p])=>{ const b=document.getElementById(id); if(b){ b.disabled=!p.length; b.style.opacity=p.length?"":".45"; } });
}
function _recortarPila(pila){
  let total=pila.reduce((n,x)=>n+x.length,0);
  while(pila.length>30 || (pila.length>1 && total>25e6)){ total-=pila.shift().length; }
}
function _aplicarDatos(str){
  const conservar={ui:state.ui,cambiosSinCopia:state.cambiosSinCopia,lastBackupAt:state.lastBackupAt,_ultimaCopiaAuto:state._ultimaCopiaAuto,_guardadoEn:state._guardadoEn,novedadesVistas:state.novedadesVistas};
  const datos=JSON.parse(str);
  state=Object.assign(defAppState(),datos,conservar);
  Object.keys(CAT_CACHE).forEach(k=>delete CAT_CACHE[k]);
  if(state.ui.grupoId && !state.grupos.find(g=>g.id===state.ui.grupoId)) state.ui.grupoId=null;
  _aplicandoDeshacer=true;
  try{ save(); } finally { _aplicandoDeshacer=false; }
  render();
}
window.deshacer=()=>{
  if(!_pilaDeshacer.length){ mostrarToast("No hay nada que deshacer","info"); return; }
  const actual=_ultimoDatosStr; const previo=_pilaDeshacer.pop();
  if(actual!=null) _pilaRehacer.push(actual);
  _aplicarDatos(previo);
  mostrarToast("↶ Deshecho");
};
window.rehacer=()=>{
  if(!_pilaRehacer.length){ mostrarToast("No hay nada que rehacer","info"); return; }
  const actual=_ultimoDatosStr; const sig=_pilaRehacer.pop();
  if(actual!=null) _pilaDeshacer.push(actual);
  _aplicarDatos(sig);
  mostrarToast("↷ Rehecho");
};
document.addEventListener("keydown",e=>{
  if(!(e.ctrlKey||e.metaKey)) return;
  const k=e.key.toLowerCase();
  if(k!=="z" && k!=="y") return;
  const t=e.target, enCampo=t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
  if(enCampo || document.querySelector(".dlg-overlay") || document.getElementById("printOverlay")) return;
  e.preventDefault();
  if(k==="y" || (k==="z" && e.shiftKey)) rehacer(); else deshacer();
});
function save(){
  let cambio=false, datosOK=false;
  try{
    const d=_datosSinUI();
    if(_ultimoDatosStr!==null && d!==_ultimoDatosStr){
      cambio=true;
      if(!_aplicandoDeshacer){ _pilaDeshacer.push(_ultimoDatosStr); _recortarPila(_pilaDeshacer); _pilaRehacer.length=0; }
    }
    _ultimoDatosStr=d; datosOK=true;
  }catch(e){}
  _invalidarCaches();
  if(cambio) _actualizarBotonesDeshacer();
  if(cambio) state.cambiosSinCopia=(state.cambiosSinCopia||0)+1;
  state._guardadoEn=Date.now();
  let json;
  try{
    // v6: se reutiliza la parte de datos ya serializada (antes se serializaba todo dos veces).
    const meta={ui:state.ui,cambiosSinCopia:state.cambiosSinCopia,lastBackupAt:state.lastBackupAt,_guardadoEn:state._guardadoEn,_ultimaCopiaAuto:state._ultimaCopiaAuto};
    const m=JSON.stringify(meta);
    json=(datosOK && _ultimoDatosStr.length>2) ? m.slice(0,-1)+","+_ultimoDatosStr.slice(1) : JSON.stringify(state);
  }catch(e){ saveState.ok=false; actualizarAvisoGuardado(); return; }
  saveState.bytesLS=json.length;
  if(json.length>4e6 && !saveState.avisoEspacio){ saveState.avisoEspacio=true; setTimeout(()=>mostrarToast("ℹ️ El almacenamiento principal está casi lleno. Tus datos siguen a salvo en la copia interna; exporta una copia de vez en cuando.","info"),800); }
  try{
    localStorage.setItem(KEY,json);
    if(!saveState.ok){ saveState.ok=true; actualizarAvisoGuardado(); }
  }catch(e){
    saveState.ok=false;
    actualizarAvisoGuardado();
  }
  // Espejo en IndexedDB (agrupando ráfagas de cambios).
  _idbJsonPendiente=json;
  clearTimeout(_idbEspejoTimer);
  _idbEspejoTimer=setTimeout(volcarEspejoIDB, saveState.ok?700:0);
  if(cambio) programarCopiaAuto();
}
function volcarEspejoIDB(){
  clearTimeout(_idbEspejoTimer); _idbEspejoTimer=null;
  const json=_idbJsonPendiente; if(json==null) return Promise.resolve();
  _idbJsonPendiente=null;
  return idbPut("kv",{guardadoEn:state._guardadoEn||Date.now(),json},"estado").then(()=>{
    if(!saveState.idbOk){ saveState.idbOk=true; actualizarAvisoGuardado(); }
  }).catch(()=>{
    saveState.idbOk=false; actualizarAvisoGuardado();
  });
}
// Al ocultar/cerrar la app se vuelca de inmediato lo pendiente.
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="hidden") volcarEspejoIDB(); });
window.addEventListener("pagehide",()=>{ volcarEspejoIDB(); });

/* ---- Copias automáticas (instantáneas) ---- */
const COPIA_AUTO_INTERVALO_MS=3*60*60*1000; // como mucho una cada 3 h de trabajo
let _copiaAutoTimer=null;
function programarCopiaAuto(){
  const ultima=state._ultimaCopiaAuto||0;
  if(Date.now()-ultima<COPIA_AUTO_INTERVALO_MS) return;
  clearTimeout(_copiaAutoTimer);
  _copiaAutoTimer=setTimeout(()=>{ crearCopiaAuto("Automática"); },4000);
}
function resumenEstado(st){
  const grupos=(st.grupos||[]);
  const alumnos=grupos.reduce((n,g)=>n+((g.alumnos||[]).length),0);
  const actividades=grupos.reduce((n,g)=>n+((g.actividades||[]).length),0);
  const otros=(st.programaciones||[]).length+(st.reuniones||[]).length+(st.planesRefuerzo||[]).length+(st.planesRepeticion||[]).length+(st.planesNESE||[]).length+(st.eventos||[]).length;
  const partes=[`${grupos.length} grupo${grupos.length===1?"":"s"}`,`${alumnos} alumno${alumnos===1?"":"s"}`,`${actividades} actividad${actividades===1?"":"es"}`];
  if((st.programaciones||[]).length) partes.push(`${st.programaciones.length} programación(es)`);
  if((st.reuniones||[]).length) partes.push(`${st.reuniones.length} reunión(es)`);
  return {grupos:grupos.length,alumnos,actividades,total:grupos.length+alumnos+actividades+otros,texto:partes.join(" · ")};
}
function crearCopiaAuto(motivo,forzar){
  const r=resumenEstado(state);
  if(!forzar && r.total===0) return Promise.resolve(null);
  let json; try{ json=JSON.stringify(state); }catch(e){ return Promise.resolve(null); }
  const copia={id:Date.now()+"-"+uid(), fecha:Date.now(), motivo:motivo||"Automática", resumen:r.texto, bytes:json.length, json};
  return idbPut("copias",copia).then(()=>{
    state._ultimaCopiaAuto=copia.fecha;
    try{ localStorage.setItem(KEY,JSON.stringify(state)); }catch(e){}
    return podarCopiasAuto().then(()=>copia);
  }).catch(()=>null);
}
/* Se conservan las 12 más recientes y, de las anteriores, una por día
   durante 30 días. Las demás se borran. */
function podarCopiasAuto(){
  return idbAll("copias").then(lista=>{
    lista.sort((a,b)=>b.fecha-a.fecha);
    const conservar=new Set(), dias=new Set();
    const limite=Date.now()-30*86400000;
    lista.forEach((c,i)=>{
      if(i<12){ conservar.add(c.id); return; }
      const dia=new Date(c.fecha).toDateString();
      if(c.fecha>=limite && !dias.has(dia)){ dias.add(dia); conservar.add(c.id); }
    });
    lista.forEach((c,i)=>{ if(i<12) dias.add(new Date(c.fecha).toDateString()); });
    return Promise.all(lista.filter(c=>!conservar.has(c.id)).map(c=>idbDel("copias",c.id)));
  }).catch(()=>{});
}
function _fmtBytes(n){ return n<1024?n+" B":n<1048576?(n/1024).toFixed(0)+" KB":(n/1048576).toFixed(1).replace(".",",")+" MB"; }
function _fechaHora(ts){ return new Date(ts).toLocaleString("es-ES",{weekday:"short",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}); }

/* Carga un estado completo (de una copia importada o de una instantánea)
   aplicando TODAS las migraciones, como si se abriera la app de cero. */
function cargarEstadoCompleto(nuevo){
  const previo=state;
  try{
    state=Object.assign(defAppState(),nuevo);
    if(!state.ui || typeof state.ui!=="object") state.ui=defAppState().ui;
    Object.keys(CAT_CACHE).forEach(k=>delete CAT_CACHE[k]);
    migrarEstado();
    state.ui.appMode="inicio"; state.ui.grupoId=null;
    _ultimoDatosStr=null;
    save();
    render();
    return true;
  }catch(e){
    state=previo;
    Object.keys(CAT_CACHE).forEach(k=>delete CAT_CACHE[k]);
    try{ render(); }catch(_){}
    mostrarAviso("No se ha podido cargar: "+(e.message||e)+". Tus datos anteriores siguen intactos.");
    return false;
  }
}

let _copiasModalEl=null;
window.abrirCopias=async()=>{
  cerrarCopias();
  const div=document.createElement("div");
  div.className="modal-overlay";
  div.onclick=e=>{ if(e.target===div) cerrarCopias(); };
  div.innerHTML=`<div class="modal-box" style="max-width:640px"><div class="flex" style="justify-content:space-between;align-items:center"><h2 style="font-size:17px">🛟 Copias de seguridad</h2><button class="modal-close" onclick="cerrarCopias()" aria-label="Cerrar">×</button></div><div id="copiasCuerpo"><p class="sub">Cargando…</p></div></div>`;
  document.body.appendChild(div); _copiasModalEl=div;
  await pintarCopias();
};
window.cerrarCopias=()=>{ if(_copiasModalEl){ _copiasModalEl.remove(); _copiasModalEl=null; } };
async function pintarCopias(){
  const cuerpo=document.getElementById("copiasCuerpo"); if(!cuerpo) return;
  let lista=[], errorIDB="";
  try{ lista=(await idbAll("copias"))||[]; }catch(e){ errorIDB=String(e.message||e); }
  lista.sort((a,b)=>b.fecha-a.fecha);
  let persist=null, uso=null;
  try{ if(navigator.storage&&navigator.storage.persisted) persist=await navigator.storage.persisted(); }catch(e){}
  try{ if(navigator.storage&&navigator.storage.estimate) uso=await navigator.storage.estimate(); }catch(e){}
  const avisoPersist = persist===true
    ? `<div class="sub" style="color:#1e7a44;margin:6px 0">✓ El navegador protege estos datos frente a borrados automáticos.</div>`
    : `<div class="alert-box" style="margin:8px 0">⚠️ El navegador todavía no garantiza que conserve estos datos. En iPad, <strong>añade la app a la pantalla de inicio</strong> y ábrela desde ahí: Safari borra los datos de las webs que no se abren en 7 días. Y exporta una copia a Archivos/iCloud de vez en cuando.</div>`;
  const filas=lista.length? lista.map(c=>`<div class="ag-evento" style="cursor:default;align-items:center">
      <div class="ag-evento-info"><div class="ag-evento-titulo">${esc(_fechaHora(c.fecha))} · ${esc(c.motivo||"")}</div><div class="ag-evento-grupo">${esc(c.resumen||"")} · ${_fmtBytes(c.bytes||0)}</div></div>
      <div class="flex" style="flex-shrink:0;gap:6px"><button class="ghost small" style="border:1px solid var(--line)" onclick="descargarCopiaAuto('${c.id}')">⬇ Descargar</button><button class="btn small" onclick="restaurarCopiaAuto('${c.id}')">Restaurar</button></div>
    </div>`).join("") : `<p class="sub">${errorIDB?"No se pueden guardar copias internas en este navegador ("+esc(errorIDB)+"). Exporta copias a un archivo con regularidad.":"Todavía no hay copias automáticas. Se crean solas mientras trabajas (como mucho una cada 3 horas) y siempre antes de importar o restaurar."}</p>`;
  cuerpo.innerHTML=`
    <p class="sub" style="margin-top:6px">Además de la copia que exportas tú, la app guarda <strong>copias automáticas</strong> dentro del propio dispositivo: las 12 más recientes y una por día durante 30 días. Si algo sale mal (un borrado, una importación equivocada…), restaura desde aquí.</p>
    ${avisoPersist}
    ${uso&&uso.usage?`<p class="sub" style="margin:0 0 8px">Espacio usado por la app en este dispositivo: ${_fmtBytes(uso.usage)}.</p>`:""}
    ${(()=>{ const b=saveState.bytesLS||0; const pct=Math.round(b/5e6*100); return `<p class="sub" style="margin:0 0 8px">Almacenamiento principal: ${_fmtBytes(b)} de unos 5 MB (${pct} %)${pct>=80?' — <strong style="color:#b45309">casi lleno</strong>: no pasa nada, la copia interna no tiene ese límite, pero conviene exportar copias.':"."}</p>`; })()}
    <div class="flex" style="gap:8px;margin-bottom:10px;flex-wrap:wrap">
      <button class="btn" onclick="exportarTodo()">⬇ Exportar copia a un archivo</button>
      ${cifradoDisponible()?'<button class="btn" onclick="exportarCifrada()" title="Recomendado si la copia va a salir del dispositivo (correo, pendrive, nube)">🔒 Exportar copia cifrada</button>':""}
      <button class="ghost" style="border:1px solid var(--line)" onclick="copiaManualAhora()">＋ Crear copia interna ahora</button>
      <button class="ghost" style="border:1px solid var(--line)" onclick="cerrarCopias();abrirDiagnostico()">🩺 Revisar mis datos</button>
    </div>
    <div class="scroll" style="max-height:48vh">${filas}</div>`;
}
window.copiaManualAhora=async()=>{
  const c=await crearCopiaAuto("Manual",true);
  if(c) mostrarToast("✓ Copia interna creada"); else mostrarAviso("No se ha podido crear la copia interna en este navegador. Exporta una copia a archivo.");
  pintarCopias();
};
window.descargarCopiaAuto=async id=>{
  try{
    const c=await idbGet("copias",id); if(!c) return;
    const d=new Date(c.fecha), pad=n=>String(n).padStart(2,"0");
    descargarBlob(new Blob([c.json],{type:"application/json"}),`copia-cuaderno-${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`);
  }catch(e){ mostrarAviso("No se ha podido leer la copia: "+(e.message||e)); }
};
window.restaurarCopiaAuto=async id=>{
  let c; try{ c=await idbGet("copias",id); }catch(e){}
  if(!c){ mostrarAviso("No se encuentra esa copia."); return; }
  const actual=resumenEstado(state);
  if(!await confirmar(`¿Restaurar la copia del ${_fechaHora(c.fecha)}?\n• ${c.resumen}\n\nSustituirá lo que tienes ahora (${actual.texto}). Antes se guarda una copia de lo actual, por si quieres volver atrás.`)) return;
  await crearCopiaAuto("Antes de restaurar",true);
  let nuevo; try{ nuevo=JSON.parse(c.json); }catch(e){ mostrarAviso("La copia está dañada y no se puede restaurar."); return; }
  if(cargarEstadoCompleto(nuevo)){ cerrarCopias(); mostrarToast("✓ Copia restaurada"); }
};

/* Guardar un archivo: en iPad/iPhone abre el menú Compartir (→ «Guardar
   en Archivos», iCloud, AirDrop, correo…); en el resto, descarga normal.
   Devuelve true si el archivo se ha guardado/compartido. */
function _esIOS(){ return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1); }
function descargarBlob(blob,nombre){
  const u=URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=u; a.download=nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),4000);
}
async function guardarArchivo(blob,nombre){
  if(_esIOS() && navigator.canShare){
    try{
      const f=new File([blob],nombre,{type:blob.type});
      if(navigator.canShare({files:[f]})){
        await navigator.share({files:[f],title:nombre});
        return true;
      }
    }catch(e){
      if(e && e.name==="AbortError") return false;
    }
  }
  descargarBlob(blob,nombre);
  return true;
}

