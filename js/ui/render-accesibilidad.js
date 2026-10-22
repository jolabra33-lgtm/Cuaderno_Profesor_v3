/* ============================================================================
   Cuaderno del profesor · Accesibilidad y render principal
   js/ui/render-accesibilidad.js
   ============================================================================ */

/* =================================================================
   Arranque
   ================================================================= */
/* Conservación de scroll: al marcar un criterio, poner una nota, etc., la app
   se re-renderiza entera; sin esto, la página y las listas con scroll interno
   (como la lista de criterios) saltarían arriba con cada clic. Se conserva la
   posición solo cuando la vista es la misma; al navegar a otra pantalla o
   pestaña se empieza arriba, como es natural. */
let _lastViewSig=null;
/* =================================================================
   v3 · ACCESIBILIDAD
   Tras cada pintado: los botones que solo tienen un icono reciben un
   nombre legible para lectores de pantalla (VoiceOver, TalkBack); los
   elementos pulsables que no son botones (filas, tarjetas) se pueden
   alcanzar con Tab y activar con Intro/Espacio; Escape cierra la
   ventana que esté abierta.
   ================================================================= */
const _A11Y_ICONOS={"×":"Cerrar","✕":"Cerrar","🗑":"Eliminar","🗑️":"Eliminar","📋":"Copiar o pegar","⚡":"Rellenar vacíos","＋":"Añadir","+":"Añadir","👁️":"Ver evolución","✏️":"Editar","🖨️":"Imprimir","🔁":"Recuperación","⏱️":"Cronómetro","🌙":"Cambiar tema","☀️":"Cambiar tema","🖥️":"Cambiar ancho","↺":"Restablecer","▲":"Subir","▼":"Bajar","←":"Anterior","→":"Siguiente"};
function accesibilidadPasada(raiz){
  raiz.querySelectorAll("button:not([aria-label])").forEach(b=>{
    const t=(b.textContent||"").trim();
    const soloIcono=!/[A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/.test(t);
    if(b.title && soloIcono) b.setAttribute("aria-label",b.title);
    else if(soloIcono){ const k=_A11Y_ICONOS[t]; if(k) b.setAttribute("aria-label",k); }
  });
  raiz.querySelectorAll("[onclick]:not(button):not(a):not(input):not(select):not(label):not(option):not([role])").forEach(el=>{
    if(el.classList.contains("modal-overlay")) return;
    el.setAttribute("role","button");
    if(!el.hasAttribute("tabindex")) el.setAttribute("tabindex","0");
  });
}
document.addEventListener("keydown",e=>{
  const el=e.target;
  if((e.key==="Enter"||e.key===" ") && el && el.getAttribute && el.getAttribute("role")==="button" && !/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)){
    e.preventDefault(); el.click(); return;
  }
  if(e.key==="Escape" && !document.querySelector(".dlg-overlay") && !_buscarModalEl){
    const abiertas=[...document.querySelectorAll(".modal-overlay")];
    const top=abiertas[abiertas.length-1];
    if(top){ const x=top.querySelector(".modal-close"); if(x){ e.preventDefault(); x.click(); } }
  }
});
new MutationObserver(ms=>{ for(const m of ms) m.addedNodes.forEach(n=>{ if(n.nodeType===1 && n.classList && n.classList.contains("modal-overlay")) try{ accesibilidadPasada(n); }catch(e){} }); }).observe(document.body,{childList:true});
function render(){
  _invalidarCaches();
  const sig=[_mostrarBienvenida?1:0,state.ui.appMode,state.ui.grupoId,state.ui.tab,state.ui.trim,
             state.ui.corTab,state.ui.corExamId,state.ui.corAlId,state.ui.calAct,
             state.ui.reTab,state.ui.reId,state.ui.reModalNueva,
             state.ui.rfTab,state.ui.rfId,state.ui.rfModalNueva,
             state.ui.rpTab,state.ui.rpId,state.ui.rpModalNueva,
             state.ui.neTab,state.ui.neId,state.ui.neModalCrear?1:0,state.ui.prepNuevoModal?1:0].join("|");
  const mismaVista = sig===_lastViewSig;
  _lastViewSig=sig;
  const sy = mismaVista? (window.scrollY||0) : 0;
  const innerScrolls = mismaVista? [...document.querySelectorAll(".scroll")].map(el=>el.scrollTop) : [];

  const tabs=document.getElementById("groupTabs"), bar=document.getElementById("backupBar"), header=document.getElementById("appHeader");
  try{
    if(_mostrarBienvenida){
      if(header) header.style.display="none";
      tabs.style.display="none"; bar.style.display="none";
      document.getElementById("app").innerHTML=renderBienvenidaHTML();
    }else if(state.ui.appMode==="inicio"){
      if(header) header.style.display="";
      tabs.style.display="none"; bar.style.display="";
      renderTopBar(); renderHome();
    }else if(state.ui.appMode==="corrector"){
      if(header) header.style.display="";
      tabs.style.display=""; bar.style.display="";
      renderCorrectorApp();
    }else if(state.ui.appMode==="reuniones"){
      if(header) header.style.display="";
      tabs.style.display="none"; bar.style.display="";
      renderTopBar(); renderReunionesApp();
    }else if(state.ui.appMode==="refuerzo"){
      if(header) header.style.display="";
      tabs.style.display="none"; bar.style.display="";
      renderTopBar(); renderRefuerzoApp();
    }else if(state.ui.appMode==="repeticion"){
      if(header) header.style.display="";
      tabs.style.display="none"; bar.style.display="";
      renderTopBar(); renderRepeticionApp();
    }else if(state.ui.appMode==="nese"){
      if(header) header.style.display="";
      tabs.style.display="none"; bar.style.display="";
      renderTopBar(); renderNeseApp();
    }else if(state.ui.appMode==="programacion"){
      if(header) header.style.display="";
      tabs.style.display="none"; bar.style.display="";
      renderTopBar(); renderProgramacionApp();
    }else if(state.ui.appMode==="memoria"){
      if(header) header.style.display="";
      tabs.style.display="none"; bar.style.display="";
      renderTopBar(); renderMemoriaApp();
    }else{
      if(header) header.style.display="";
      tabs.style.display=""; bar.style.display="";
      renderShell();
    }
  }catch(err){
    const appEl=document.getElementById("app");
    if(appEl) appEl.innerHTML=`<div class="card" style="border-color:var(--danger)">
      <h2 style="color:var(--danger)">⚠️ Ha habido un problema al mostrar esta pantalla</h2>
      <p class="sub">Prueba a recargar la página, o vuelve a Inicio con el botón de arriba. Si sigue pasando, haz una captura de este mensaje (con el detalle técnico) y compártela para poder arreglarlo. Tus datos no se han perdido.</p>
      <details style="margin-top:8px"><summary style="cursor:pointer;font-size:13px;color:var(--mut)">Detalle técnico</summary>
        <pre style="white-space:pre-wrap;font-size:11.5px;color:var(--mut);background:var(--surface);padding:10px;border-radius:8px;margin-top:6px">Pantalla: ${esc(state.ui.appMode||"")}
${esc(err.message||String(err))}
${esc(err.stack||"")}</pre>
      </details>
    </div>`;
    console.error("Error al renderizar la pantalla '"+state.ui.appMode+"':", err);
  }

  try{ accesibilidadPasada(document); }catch(e){}
  window.scrollTo(0,sy);
  if(mismaVista){
    [...document.querySelectorAll(".scroll")].forEach((el,i)=>{ if(innerScrolls[i]!=null) el.scrollTop=innerScrolls[i]; });
  }else{
    const appEl=document.getElementById("app");
    appEl.classList.remove("view-enter"); void appEl.offsetWidth; appEl.classList.add("view-enter");
  }
}
