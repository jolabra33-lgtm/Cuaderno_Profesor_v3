/* ============================================================================
   Cuaderno del profesor · Pantalla de bienvenida y conservación de scroll
   js/ui/bienvenida.js
   ============================================================================ */

/* =================================================================
   Pantalla de bienvenida
   Se muestra siempre al abrir o recargar la app (no se guarda en el
   estado ni depende de en qué pantalla se quedó la última vez). El
   botón «Entrar» lleva siempre a Inicio; «Abrir archivo» reutiliza el
   importador de copias de seguridad ya existente.
   ================================================================= */
let _mostrarBienvenida=true;
window.entrarDesdeBienvenida=()=>{ _mostrarBienvenida=false; state.ui.appMode="inicio"; save(); render(); };
function _bienvenidaSaludo(){
  const h=new Date().getHours();
  if(h<6) return "Buenas noches";
  if(h<12) return "Buenos días";
  if(h<20) return "Buenas tardes";
  return "Buenas noches";
}
window._bienvenidaSoltarArchivo=e=>{
  e.preventDefault();
  if(e.currentTarget) e.currentTarget.classList.remove("bienvenida-sobre");
  const file=e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if(!file) return;
  if(!/\.json$/i.test(file.name)){ mostrarAviso("Arrastra un archivo .json de copia de seguridad."); return; }
  _procesarArchivoCopiaJSON(file,null);
};
document.addEventListener("keydown",e=>{
  if(_mostrarBienvenida && e.key==="Enter") entrarDesdeBienvenida();
});
function renderBienvenidaHTML(){
  const r=resumenEstado(state);
  const hayDatos=r.total>0;
  const diasSinCopia=state.lastBackupAt?(Date.now()-state.lastBackupAt)/86400000:Infinity;
  const avisoCopia=hayDatos && diasSinCopia>7;
  const avisoTexto=state.lastBackupAt
    ?`Hace tiempo que no exportas una copia externa (${haceTiempo(state.lastBackupAt)}). Consérvala fuera de este dispositivo desde 🛟 Copias.`
    :"Todavía no has exportado ninguna copia de seguridad a un archivo. Hazlo desde 🛟 Copias en cuanto entres.";
  const botonEntrar=`<button class="btn" onclick="entrarDesdeBienvenida()">Entrar →</button>`;
  const botonAbrir=`<label class="file">📂 Abrir archivo…<input type="file" accept="application/json,.json" style="display:none" onchange="importarTodo(this)"></label>`;
  return `<div class="bienvenida-wrap" ondragover="event.preventDefault();this.classList.add('bienvenida-sobre')" ondragleave="this.classList.remove('bienvenida-sobre')" ondrop="_bienvenidaSoltarArchivo(event)">
    <div class="bienvenida-emblema">🗂️</div>
    <div class="bienvenida-eyebrow">${_bienvenidaSaludo()} · Geografía e Historia · Evaluación</div>
    <h1 class="bienvenida-title">Cuaderno del profesor</h1>
    <p class="bienvenida-tag">Programación de aula, evaluación por competencias, corrección con rúbricas y el seguimiento diario de tu alumnado — todo en un mismo sitio, sin cuentas y sin conexión.</p>
    ${hayDatos?`<div class="bienvenida-resumen">📊 ${esc(r.texto)}</div>`:""}
    <div class="bienvenida-botones${hayDatos?"":" nuevo"}">
      ${hayDatos?botonEntrar+botonAbrir:botonAbrir+botonEntrar}
    </div>
    ${avisoCopia?`<p class="bienvenida-aviso">⚠️ ${avisoTexto}</p>`:""}
    <p class="bienvenida-nota">${hayDatos?"«Abrir archivo» sustituye los datos de este dispositivo por los de la copia (.json) que elijas — se guarda antes una copia de seguridad automática de lo actual. También puedes arrastrarla aquí.":"¿Vienes de otro dispositivo? Arrastra aquí tu copia de seguridad (.json) o usa «Abrir archivo» para cargarla y continuar donde lo dejaste."}</p>
  </div>`;
}
