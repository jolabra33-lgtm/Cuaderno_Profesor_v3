/* ============================================================================
   Cuaderno del profesor · Copia automática en una carpeta (ordenador)
   js/nucleo/copia-carpeta.js
   ============================================================================ */

/* =================================================================
   v3 · COPIA AUTOMÁTICA EN UNA CARPETA
   En el ordenador (Chrome / Edge) se elige una carpeta una vez; la app
   guarda ahí sola una copia (el mismo archivo que «Exportar copia») unos
   minutos después de cada cambio y al cerrar o cambiar de ventana. Si la
   carpeta es de Drive / OneDrive / iCloud sincronizada, la copia llega a
   los otros equipos: al abrir la app en otro, si en la carpeta hay una
   copia más reciente de otro dispositivo, se ofrece cargarla.
   - Un archivo por día y por dispositivo (los equipos no se pisan entre
     sí); se conservan los CC_MAX_ARCHIVOS más recientes de cada dispositivo.
   - El permiso de la carpeta lo concede el navegador. Si tras reiniciarlo
     queda «en pausa», un aviso en Inicio permite reactivarlo con un toque.
   - En iPad/Safari no existe esta función del navegador: se explica cómo
     hacerlo con «Exportar copia» y el menú Compartir.
   - v3 · Cifrado opcional: «🔒 Cifrar las copias» pide una contraseña una
     vez; la clave derivada (no la contraseña) se guarda en este dispositivo
     y cada copia se escribe cifrada (AES-GCM, mismo formato que «Exportar
     copia cifrada»). En otro dispositivo se abre con la contraseña.
   ================================================================= */
const CC_CLAVE_IDB="carpetaCopias";          // en el almacén «kv» (IndexedDB)
const CC_MAX_ARCHIVOS=10;
const CC_ESPERA_MS=2*60*1000;                // copia como mucho cada 2 minutos tras un cambio
const CC_PREFIJO="copia-cuaderno-auto-";
let _ccHandle=null, _ccEstado="no", _ccTimer=null, _ccPendiente=false, _ccUltima=0, _ccError="";
let _ccMasReciente=null, _ccIgnorarReciente=false;
const CC_CLAVE_CIFRADO_IDB="carpetaClave";   // {sal,iter,clave}: clave AES no extraíble (IndexedDB)
let _ccClave=null;

function ccDisponible(){ return typeof window.showDirectoryPicker==="function"; }
function ccDispositivo(){
  let d=""; try{ d=localStorage.getItem("cc_dispositivo")||""; }catch(e){}
  if(!/^[a-z0-9]{4,8}$/.test(d)){ d=Math.random().toString(36).slice(2,7); try{ localStorage.setItem("cc_dispositivo",d); }catch(e){} }
  return d;
}
function _ccNombreHoy(){
  const d=new Date(), p=n=>String(n).padStart(2,"0");
  return `${CC_PREFIJO}${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}-${ccDispositivo()}.json`;
}
async function _ccPermiso(pedir){
  if(!_ccHandle) return "no";
  try{
    let p=await _ccHandle.queryPermission({mode:"readwrite"});
    if(p!=="granted" && pedir) p=await _ccHandle.requestPermission({mode:"readwrite"});
    return p;
  }catch(e){ return "denied"; }
}
function _ccRepintar(){
  if(state.ui && state.ui.appMode==="inicio" && typeof render==="function") render();
  if(typeof _copiasModalEl!=="undefined" && _copiasModalEl && typeof pintarCopias==="function") pintarCopias();
}

/* Al abrir: recupera la carpeta elegida y mira si otro dispositivo ha dejado una copia más reciente. */
async function ccIniciar(){
  if(!ccDisponible()){ _ccEstado="no-disponible"; return; }
  if(window.UnaVentana && UnaVentana.estado==="bloqueada") return;
  try{ _ccHandle=await idbGet("kv",CC_CLAVE_IDB)||null; }catch(e){ _ccHandle=null; }
  try{ _ccClave=cifradoDisponible() ? (await idbGet("kv",CC_CLAVE_CIFRADO_IDB)||null) : null; }catch(e){ _ccClave=null; }
  if(!_ccHandle){ _ccEstado="no"; return; }
  _ccEstado=(await _ccPermiso(false))==="granted" ? "activa" : "sin-permiso";
  if(_ccEstado==="activa") await ccBuscarMasReciente();
  _ccRepintar();
}

async function _ccArchivos(){
  const lista=[];
  for await (const [nombre,h] of _ccHandle.entries()){
    if(h.kind!=="file" || !/^copia-cuaderno-.*\.json$/i.test(nombre)) continue;
    try{ const f=await h.getFile(); lista.push({nombre,h,f,fecha:f.lastModified}); }catch(e){}
  }
  return lista.sort((a,b)=>b.fecha-a.fecha);
}

/* Copia de OTRO dispositivo más reciente que lo que hay aquí. */
async function ccBuscarMasReciente(){
  _ccMasReciente=null;
  if(_ccEstado!=="activa") return;
  try{
    const propio=new RegExp("-"+ccDispositivo()+"\\.json$");
    const ajeno=(await _ccArchivos()).find(a=>!propio.test(a.nombre));
    const local=state._guardadoEn||0;
    if(!ajeno || ajeno.fecha<=local+60000) return;
    let suyo=ajeno.fecha;
    try{ const s=JSON.parse(await ajeno.f.text()); if(s && s._guardadoEn) suyo=s._guardadoEn; }catch(e){ /* cifrada o ilegible: vale la fecha del archivo */ }
    if(suyo>local+60000) _ccMasReciente={nombre:ajeno.nombre,f:ajeno.f,fecha:suyo};
  }catch(e){}
}

/* Escribe la copia de hoy de este dispositivo y poda las antiguas. */
async function ccEscribir(){
  clearTimeout(_ccTimer); _ccTimer=null;
  if(_ccEstado!=="activa" || !_ccHandle) return false;
  if(window.UnaVentana && UnaVentana.estado!=="activa") return false;
  _ccPendiente=false;
  try{
    const ex=(typeof exTodosSync==="function" && exTodosSync()) || (typeof exLeerTodos==="function" ? await exLeerTodos() : []);
    let json=JSON.stringify(ex && ex.length ? {...state,_examenesDiseno:ex} : state);
    // Cifrada si se ha activado. «_guardadoEn» va fuera del cifrado: es solo la fecha, para comparar copias.
    if(_ccClave) json=await cifrarConClave(json,_ccClave.clave,_ccClave.sal,_ccClave.iter,{_guardadoEn:state._guardadoEn||Date.now()});
    const fh=await _ccHandle.getFileHandle(_ccNombreHoy(),{create:true});
    const w=await fh.createWritable(); await w.write(new Blob([json],{type:"application/json"})); await w.close();
    _ccUltima=Date.now(); _ccError="";
    state.lastBackupAt=_ccUltima; state.cambiosSinCopia=0;
    save();   // guarda la fecha de la copia (no cuenta como cambio de datos)
    await _ccPodar();
    if(typeof renderTopBar==="function" && state.ui && state.ui.appMode!=="inicio") { try{ renderTopBar(); }catch(e){} }
    return true;
  }catch(e){
    _ccError=String(e && (e.message||e.name) || e);
    if(e && e.name==="NotAllowedError"){ _ccEstado="sin-permiso"; _ccRepintar(); }
    return false;
  }
}
async function _ccPodar(){
  const propias=(await _ccArchivos()).filter(a=>a.nombre.startsWith(CC_PREFIJO) && a.nombre.endsWith("-"+ccDispositivo()+".json"));
  for(const a of propias.slice(CC_MAX_ARCHIVOS)){ try{ await _ccHandle.removeEntry(a.nombre); }catch(e){} }
}

/* La llama save() cuando cambian los datos: copia unos minutos después (agrupa ráfagas). */
function ccProgramar(){
  if(_ccEstado!=="activa") return;
  _ccPendiente=true;
  if(_ccTimer) return;
  const espera=Math.max(5000, CC_ESPERA_MS-(Date.now()-_ccUltima));
  _ccTimer=setTimeout(ccEscribir, espera);
}
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="hidden" && _ccPendiente) ccEscribir(); });

/* ---------- Acciones de la interfaz ---------- */
window.ccElegirCarpeta=async()=>{
  try{
    const h=await window.showDirectoryPicker({id:"copias-cuaderno",mode:"readwrite"});
    _ccHandle=h; await idbPut("kv",h,CC_CLAVE_IDB);
    _ccEstado=(await _ccPermiso(true))==="granted" ? "activa" : "sin-permiso";
    if(_ccEstado==="activa"){ const ok=await ccEscribir(); mostrarToast(ok?`✓ Copia automática activada en «${h.name}»`:"No se ha podido escribir en esa carpeta"); await ccBuscarMasReciente(); }
  }catch(e){ if(!e || e.name!=="AbortError") mostrarAviso("No se ha podido usar esa carpeta: "+(e&&e.message||e)); }
  _ccRepintar();
};
window.ccReactivar=async()=>{
  _ccEstado=(await _ccPermiso(true))==="granted" ? "activa" : "sin-permiso";
  if(_ccEstado==="activa"){ await ccEscribir(); await ccBuscarMasReciente(); mostrarToast("✓ Copia automática reactivada"); }
  _ccRepintar();
};
window.ccCopiarAhora=async()=>{ const ok=await ccEscribir(); mostrarToast(ok?"✓ Copia guardada en la carpeta":"No se ha podido guardar la copia: "+_ccError); _ccRepintar(); };
window.ccQuitar=async()=>{
  if(!await confirmar("¿Dejar de guardar copias automáticas en esa carpeta? Los archivos que ya hay en ella no se borran.",{ok:"Dejar de guardar",peligro:false})) return;
  try{ await idbDel("kv",CC_CLAVE_IDB); }catch(e){}
  _ccHandle=null; _ccEstado="no"; _ccMasReciente=null; _ccRepintar();
};
/* ---------- Cifrado de las copias de la carpeta ---------- */
async function ccActivarCifrado(pass){
  const sal=crypto.getRandomValues(new Uint8Array(16)), iter=310000;
  const clave=await _claveDe(pass,sal,iter);
  const reg={sal,iter,clave};
  await idbPut("kv",reg,CC_CLAVE_CIFRADO_IDB);
  _ccClave=reg;
  return _ccEstado==="activa" ? ccEscribir() : true;
}
/* Copias automáticas de ESTE dispositivo que siguen sin cifrar en la carpeta (de antes de activar el cifrado). */
async function _ccPropiasSinCifrar(){
  const out=[];
  for(const a of (await _ccArchivos()).filter(a=>a.nombre.startsWith(CC_PREFIJO) && a.nombre.endsWith("-"+ccDispositivo()+".json"))){
    try{ const inicio=await a.f.slice(0,400).text(); if(!inicio.includes(CIFRADO_FORMATO)) out.push(a); }catch(e){}
  }
  return out;
}
window.ccCifrar=async()=>{
  if(!cifradoDisponible()){ mostrarAviso("Este navegador no permite cifrar aquí."); return; }
  const pass=await pedirContrasena({titulo:"🔒 Cifrar las copias de la carpeta",confirmar:true,boton:"Cifrar",
    texto:"Elige una contraseña. A partir de ahora las copias automáticas se guardan cifradas y, sin ella, son ilegibles. En este dispositivo no te la volverá a pedir; en otro, la necesitarás al cargar la copia. <strong>Apúntala en un lugar seguro: si la olvidas, esas copias no se podrán abrir.</strong>"});
  if(!pass) return;
  let ok=false;
  try{ ok=await ccActivarCifrado(pass); }catch(e){ mostrarAviso("No se ha podido activar el cifrado: "+(e&&e.message||e)); _ccRepintar(); return; }
  mostrarToast(ok?"✓ Las copias de la carpeta se guardan ya cifradas":"Cifrado activado; se aplicará en la próxima copia");
  try{
    const viejas=_ccEstado==="activa" ? await _ccPropiasSinCifrar() : [];
    if(viejas.length && await confirmar(`En la carpeta quedan ${viejas.length} copia${viejas.length===1?"":"s"} automática${viejas.length===1?"":"s"} de este dispositivo sin cifrar, de días anteriores. ¿Borrarlas? (La de hoy ya está cifrada.)`,{ok:"Borrar las sin cifrar",peligro:true})){
      for(const a of viejas){ try{ await _ccHandle.removeEntry(a.nombre); }catch(e){} }
      mostrarToast("✓ Copias sin cifrar borradas");
    }
  }catch(e){}
  _ccRepintar();
};
window.ccQuitarCifrado=async()=>{
  if(!await confirmar("¿Dejar de cifrar las copias de la carpeta? Las próximas se guardarán sin cifrar, legibles por cualquiera que tenga acceso a la carpeta. Las que ya están cifradas siguen necesitando la contraseña.",{ok:"Dejar de cifrar",peligro:true})) return;
  try{ await idbDel("kv",CC_CLAVE_CIFRADO_IDB); }catch(e){}
  _ccClave=null;
  if(_ccEstado==="activa") await ccEscribir();
  _ccRepintar();
};
/* Si la copia se cifró con la clave que guarda este dispositivo (misma sal), se abre sin pedir contraseña. */
async function ccIntentarDescifrar(s){
  if(!_ccClave || !s || s.sal!==_b64(_ccClave.sal)) return null;
  try{
    const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:_unb64(s.iv)},_ccClave.clave,_unb64(s.datos));
    return JSON.parse(new TextDecoder().decode(pt));
  }catch(e){ return null; }
}
window.ccCargarMasReciente=()=>{ if(_ccMasReciente) _procesarArchivoCopiaJSON(_ccMasReciente.f); };
window.ccIgnorarMasReciente=()=>{ _ccIgnorarReciente=true; _ccRepintar(); };
window.ccCompartirCopia=()=>exportarTodo();   // en el iPad abre el menú Compartir (iCloud Drive, Drive…)

/* ---------- Avisos y sección en «🛟 Copias» ---------- */
function ccAvisoInicioHTML(){
  if(_ccEstado==="sin-permiso") return `<div class="card" style="margin-bottom:14px;border-color:var(--warning)">
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <span style="font-size:13.5px">⏸️ <strong>La copia automática en tu carpeta está en pausa.</strong> El navegador pide confirmar el permiso tras reiniciarse.</span>
      <button class="btn small" onclick="ccReactivar()">Reactivar</button></div></div>`;
  if(_ccMasReciente && !_ccIgnorarReciente) return `<div class="card" style="margin-bottom:14px;border-color:var(--accent-2)">
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <span style="font-size:13.5px">🔄 <strong>Hay una copia más reciente de otro dispositivo</strong> en tu carpeta (${esc(_fechaHora(_ccMasReciente.fecha))}). ¿La cargas para seguir donde lo dejaste?</span>
      <span class="flex" style="gap:6px"><button class="ghost small" style="border:1px solid var(--line)" onclick="ccIgnorarMasReciente()">Ahora no</button><button class="btn small" onclick="ccCargarMasReciente()">Cargar</button></span></div></div>`;
  return "";
}
function ccSeccionHTML(){
  if(_ccEstado==="no-disponible") return `<div class="card" style="margin:0 0 10px;padding:12px 14px">
    <strong style="font-size:13.5px">☁️ Pasar los datos a otro dispositivo</strong>
    <p class="sub" style="margin:4px 0 8px">En este navegador (iPad, Safari, Firefox) la app no puede guardar sola en una carpeta. Pulsa «Compartir copia» y elige <strong>Guardar en Archivos</strong> (iCloud Drive) o Drive; en el otro dispositivo, «Importar copia». En un ordenador con Chrome o Edge puedes activar la copia automática.</p>
    <button class="btn small" onclick="ccCompartirCopia()">📤 Compartir copia</button></div>`;
  const aviso=_ccClave
    ? `<p class="sub" style="margin:6px 0 0">🔒 Las copias se guardan <strong>cifradas</strong> con tu contraseña. En otro dispositivo, «Importar copia» te la pedirá.</p>`
    : `<p class="sub" style="margin:6px 0 0">La copia se guarda <strong>sin cifrar</strong>, igual que «Exportar copia». Contiene datos del alumnado: usa una carpeta de tu cuenta del centro o de tu ordenador, no una compartida${cifradoDisponible()?", o pulsa «🔒 Cifrar las copias»":""}.</p>`;
  if(_ccEstado==="no" || !_ccHandle) return `<div class="card" style="margin:0 0 10px;padding:12px 14px">
    <strong style="font-size:13.5px">☁️ Copia automática en una carpeta</strong>
    <p class="sub" style="margin:4px 0 8px">Elige una carpeta y la app guardará sola una copia unos minutos después de cada cambio. Si es una carpeta de Drive, OneDrive o iCloud sincronizada en este ordenador, la copia llega a tus otros equipos y, al abrir allí la app, te ofrecerá cargarla.</p>
    <button class="btn small" onclick="ccElegirCarpeta()">📁 Elegir carpeta</button>${aviso}</div>`;
  const estado=_ccEstado==="activa"
    ? `✓ Activa en «${esc(_ccHandle.name)}»${_ccUltima?` · última copia: ${esc(_fechaHora(_ccUltima))}`:""}${_ccError?` · <span style="color:var(--danger)">${esc(_ccError)}</span>`:""}`
    : `⏸️ En pausa en «${esc(_ccHandle.name)}»: el navegador pide confirmar el permiso.`;
  return `<div class="card" style="margin:0 0 10px;padding:12px 14px">
    <strong style="font-size:13.5px">☁️ Copia automática en una carpeta</strong>
    <p class="sub" style="margin:4px 0 8px">${estado}</p>
    <div class="flex" style="gap:6px;flex-wrap:wrap">
      ${_ccEstado==="activa"?`<button class="btn small" onclick="ccCopiarAhora()">Guardar copia ahora</button>`:`<button class="btn small" onclick="ccReactivar()">Reactivar</button>`}
      ${_ccMasReciente?`<button class="btn small" onclick="ccCargarMasReciente()">🔄 Cargar la copia más reciente de otro dispositivo</button>`:""}
      ${!cifradoDisponible()?"":_ccClave?`<button class="ghost small" style="border:1px solid var(--line)" onclick="ccQuitarCifrado()">🔓 Dejar de cifrar</button>`:`<button class="btn small" onclick="ccCifrar()">🔒 Cifrar las copias</button>`}
      <button class="ghost small" style="border:1px solid var(--line)" onclick="ccElegirCarpeta()">Cambiar carpeta</button>
      <button class="ghost small" style="border:1px solid var(--line)" onclick="ccQuitar()">Dejar de usarla</button>
    </div>${aviso}</div>`;
}

window.addEventListener("load",()=>{ setTimeout(()=>{ ccIniciar(); },1200); });
