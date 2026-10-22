/* ============================================================================
   Cuaderno del profesor · Copias cifradas con contraseña
   js/nucleo/cifrado.js
   ============================================================================ */

/* =================================================================
   v2 · COPIAS CIFRADAS CON CONTRASEÑA
   La copia contiene datos personales sensibles (NESE, convivencia,
   repetición, familias). Cifrado AES-GCM de 256 bits con clave derivada
   de la contraseña (PBKDF2-SHA-256, 310.000 iteraciones). Sin la
   contraseña el archivo es ilegible; si se olvida, NO se puede recuperar.
   ================================================================= */
const CIFRADO_FORMATO="cuaderno-profesor-cifrado";
function cifradoDisponible(){ return !!(window.crypto && crypto.subtle && window.TextEncoder); }
function _b64(buf){ let s=""; const b=new Uint8Array(buf); for(let i=0;i<b.length;i+=0x8000) s+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000)); return btoa(s); }
function _unb64(str){ const s=atob(str); const b=new Uint8Array(s.length); for(let i=0;i<s.length;i++) b[i]=s.charCodeAt(i); return b; }
async function _claveDe(pass,salt,iter){
  const base=await crypto.subtle.importKey("raw",new TextEncoder().encode(pass),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:iter,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
async function cifrarTexto(texto,pass){
  const salt=crypto.getRandomValues(new Uint8Array(16)), iv=crypto.getRandomValues(new Uint8Array(12)), iter=310000;
  const k=await _claveDe(pass,salt,iter);
  const ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},k,new TextEncoder().encode(texto));
  return JSON.stringify({formato:CIFRADO_FORMATO,version:1,kdf:"PBKDF2-SHA256",iteraciones:iter,sal:_b64(salt),iv:_b64(iv),datos:_b64(ct),creado:new Date().toISOString(),
    aviso:"Copia cifrada del Cuaderno del Profesor. Solo se puede abrir desde la app (Importar copia) con su contraseña."});
}
async function descifrarTexto(obj,pass){
  const k=await _claveDe(pass,_unb64(obj.sal),obj.iteraciones||310000);
  const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:_unb64(obj.iv)},k,_unb64(obj.datos));
  return new TextDecoder().decode(pt);
}
/* Ventana para pedir contraseña (campos de tipo contraseña, no prompt()). */
function pedirContrasena({titulo,texto,confirmar,boton}){
  return new Promise(resolve=>{
    const div=document.createElement("div"); div.className="modal-overlay"; div.style.zIndex="60";
    div.innerHTML=`<div class="modal-box" style="max-width:440px">
      <h2 style="font-size:17px">${titulo}</h2>
      <p class="sub">${texto||""}</p>
      <input class="in" type="password" id="pwd1" autocomplete="new-password" placeholder="Contraseña" style="width:100%;margin-top:6px">
      ${confirmar?'<input class="in" type="password" id="pwd2" autocomplete="new-password" placeholder="Repite la contraseña" style="width:100%;margin-top:8px">':""}
      <div id="pwdErr" style="color:var(--danger,#b91c1c);font-size:12.5px;min-height:18px;margin-top:6px"></div>
      <div class="flex" style="justify-content:flex-end;gap:8px"><button class="ghost" id="pwdNo" style="border:1px solid var(--line)">Cancelar</button><button class="btn" id="pwdSi">${boton||"Aceptar"}</button></div>
    </div>`;
    document.body.appendChild(div);
    const fin=v=>{ div.remove(); resolve(v); };
    const p1=div.querySelector("#pwd1"), p2=div.querySelector("#pwd2"), err=div.querySelector("#pwdErr");
    const ok=()=>{
      const a=p1.value;
      if(confirmar){
        if(a.length<8){ err.textContent="Usa al menos 8 caracteres."; return; }
        if(a!==p2.value){ err.textContent="Las dos contraseñas no coinciden."; return; }
      }else if(!a){ err.textContent="Escribe la contraseña."; return; }
      fin(a);
    };
    div.querySelector("#pwdSi").onclick=ok;
    div.querySelector("#pwdNo").onclick=()=>fin(null);
    div.addEventListener("keydown",e=>{ if(e.key==="Enter") ok(); else if(e.key==="Escape") fin(null); });
    setTimeout(()=>p1.focus(),30);
  });
}
window.exportarCifrada=async()=>{
  if(!cifradoDisponible()){ mostrarAviso("Este navegador no permite cifrar aquí (hace falta abrir la app desde https o como archivo en Chrome/Edge/Safari actualizados)."); return; }
  const pass=await pedirContrasena({titulo:"🔒 Copia cifrada",confirmar:true,boton:"Cifrar",
    texto:"Elige una contraseña para proteger la copia. <strong>Apúntala en un lugar seguro: si la olvidas, la copia no se podrá abrir</strong> (nadie puede recuperarla, tampoco la app)."});
  if(!pass) return;
  volcarEspejoIDB();
  let txt;
  try{ const _exC=exTodosSync()||await exLeerTodos(); txt=await cifrarTexto(JSON.stringify(_exC.length?{...state,_examenesDiseno:_exC}:state),pass); }catch(e){ mostrarAviso("No se ha podido cifrar: "+(e.message||e)); return; }
  const d=new Date(), pad=n=>String(n).padStart(2,"0");
  const nombre=`copia-cuaderno-CIFRADA-${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
  const blob=new Blob([txt],{type:"application/json"});
  // Botón aparte para guardar: en iPad el menú Compartir exige un toque "fresco".
  const div=document.createElement("div"); div.className="modal-overlay"; div.style.zIndex="60";
  div.innerHTML=`<div class="modal-box" style="max-width:420px;text-align:center"><h2 style="font-size:17px">🔒 Copia cifrada lista</h2><p class="sub">${esc(nombre)} · ${_fmtBytes(txt.length)}</p><div class="flex" style="justify-content:center;gap:8px;margin-top:8px"><button class="ghost" id="cfNo" style="border:1px solid var(--line)">Cancelar</button><button class="btn" id="cfSi">💾 Guardar archivo</button></div></div>`;
  document.body.appendChild(div);
  div.querySelector("#cfNo").onclick=()=>div.remove();
  div.querySelector("#cfSi").onclick=async()=>{
    const ok=await guardarArchivo(blob,nombre);
    div.remove();
    if(!ok) return;
    state.lastBackupAt=Date.now(); state.cambiosSinCopia=0; save(); render();
    if(_copiasModalEl) pintarCopias();
    exLimpiarPendientes(); mostrarToast("✓ Copia cifrada exportada");
  };
};
async function descifrarSiHaceFalta(s,nombreArchivo){
  if(!s || s.formato!==CIFRADO_FORMATO) return s;
  if(!cifradoDisponible()){ mostrarAviso("Esta copia está cifrada y este navegador no permite descifrarla aquí."); return null; }
  for(let intento=0;intento<5;intento++){
    const pass=await pedirContrasena({titulo:"🔒 Copia cifrada",texto:`«${esc(nombreArchivo||"copia")}» está protegida con contraseña.${intento?' <strong style="color:var(--danger,#b91c1c)">Contraseña incorrecta, prueba de nuevo.</strong>':""}`,boton:"Abrir"});
    if(pass==null) return null;
    try{ return JSON.parse(await descifrarTexto(s,pass)); }catch(e){ /* contraseña incorrecta o archivo dañado */ }
  }
  mostrarAviso("No se ha podido abrir la copia: contraseña incorrecta o archivo dañado.");
  return null;
}

/* Pinta u oculta la franja de aviso persistente cuando el guardado falla.
   Se define aquí porque save() puede llamarse antes del primer render. */
function actualizarAvisoGuardado(){
  let bar=document.getElementById("saveWarnBar");
  if(saveState.ok && saveState.idbOk){ if(bar) bar.remove(); return; }
  if(!bar){
    bar=document.createElement("div");
    bar.id="saveWarnBar";
    bar.setAttribute("role","alert");
    document.body.insertBefore(bar,document.body.firstChild);
  }
  const grave=!saveState.ok && !saveState.idbOk;
  bar.style.cssText=`position:sticky;top:0;z-index:20;background:${grave?"#912525":"#8a5a12"};color:#fff;padding:10px 16px;font-size:13.5px;font-weight:500;display:flex;gap:12px;align-items:center;justify-content:center;text-align:center;flex-wrap:wrap`;
  const msg = grave
    ? "⚠️ No se ha podido guardar en el dispositivo. Tus últimos cambios podrían perderse si cierras la app. Exporta una copia ahora."
    : !saveState.ok
      ? "⚠️ El almacenamiento principal está lleno o bloqueado. Tus cambios se siguen guardando en la copia interna, pero exporta una copia por seguridad."
      : "⚠️ No se puede usar la copia interna del dispositivo (IndexedDB). Tus datos se guardan igualmente; exporta copias con regularidad.";
  bar.innerHTML=`${msg} <button onclick="exportarTodo()" style="background:#fff;color:#333;border:none;border-radius:6px;padding:6px 12px;font-weight:600;cursor:pointer">Exportar copia</button>`;
}

