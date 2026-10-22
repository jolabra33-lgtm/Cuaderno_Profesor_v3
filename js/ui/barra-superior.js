/* ============================================================================
   Cuaderno del profesor · Barra superior y navegación entre las aplicaciones
   js/ui/barra-superior.js
   ============================================================================ */

function renderTopBar(){
  const h1=document.getElementById("pageH1");
  if(h1){ const t=materiasEtiqueta(); const txt=t==="Cuaderno del profesor"?t:"Cuaderno · "+t; if(h1.textContent!==txt) h1.textContent=txt; }
  const tabs=document.getElementById("groupTabs");
  tabs.innerHTML = state.grupos.map(g=>{
    const cat=getCatalogo(g.catalogoKey);
    return `<div class="gpill ${g.id===state.ui.grupoId?"on":""}">
      <span class="gpillname" onclick="irAGrupo('${g.id}')">${esc(g.nombre)}<span class="mat">${esc(cat.materia)} · ${esc(cat.curso)}</span></span>
      <button class="gpillx" title="Eliminar grupo" onclick="borrarGrupoId('${g.id}')">×</button>
    </div>`;
  }).join("") + `<button class="gpill" style="border-style:dashed" onclick="irAGrupo(null)">+ Nuevo grupo</button>
    <label class="gpill file" style="border-style:dashed;cursor:pointer">Importar grupo…<input type="file" accept=".json,application/json" style="display:none" onchange="importarGrupoArchivo(this)"></label>`;

  const diasSinCopia = state.lastBackupAt? (Date.now()-state.lastBackupAt)/86400000 : Infinity;
  const cambios = state.cambiosSinCopia||0;
  const copiaUrge = diasSinCopia>7 || cambios>=40 || !state.lastBackupAt;
  const copiaTitulo = state.lastBackupAt?new Date(state.lastBackupAt).toLocaleString('es-ES'):'Todavía no has exportado ninguna copia';
  const copiaBadge = copiaUrge
    ? `<button onclick="exportarTodo()" title="${copiaTitulo}" style="border:none;border-radius:20px;padding:4px 11px;font-size:12px;font-weight:600;background:var(--warning-soft);color:var(--warning);border:1px solid var(--warning);cursor:pointer">⚠️ Conviene exportar copia (${state.lastBackupAt?haceTiempo(state.lastBackupAt):'nunca'})</button>`
    : `<span class="badge" title="${copiaTitulo}">Copia: ${haceTiempo(state.lastBackupAt)}</span>`;
  document.getElementById("backupBar").innerHTML = `
    <button class="ghost" style="border:1px solid var(--line)" onclick="irInicio()">🏠 Inicio</button>
    ${copiaBadge}
    <span class="badge">Periodo</span>
    <select class="in" id="trimSel" style="padding:6px 9px"></select>
    <button class="ghost" onclick="exportarTodo()">Exportar copia</button>
    <label class="ghost file">Importar copia<input type="file" accept="application/json,.json" style="display:none" onchange="importarTodo(this)"></label>
    <button class="ghost" onclick="abrirCopias()" title="Copias automáticas guardadas en este dispositivo">🛟 Copias</button>
    <button class="ghost" id="btnDeshacer" onclick="deshacer()" ${_pilaDeshacer.length?"":"disabled"} title="Deshacer el último cambio (Ctrl/Cmd+Z)" aria-label="Deshacer el último cambio" style="${_pilaDeshacer.length?"":"opacity:.45"}">↶</button>
    <button class="ghost" id="btnRehacer" onclick="rehacer()" ${_pilaRehacer.length?"":"disabled"} title="Rehacer (Ctrl/Cmd+Mayús+Z)" aria-label="Rehacer" style="${_pilaRehacer.length?"":"opacity:.45"}">↷</button>`;
  const trimSel=document.getElementById("trimSel");
  trimSel.innerHTML=TRIMESTRES.map((t,i)=>`<option value="${i}">${t}</option>`).join("");
  trimSel.value=state.ui.trim;
  trimSel.addEventListener("change",e=>{ state.ui.trim=Number(e.target.value); save(); render(); });
}
function renderShell(){ renderTopBar(); renderMain(); }
function renderCorrectorApp(){ renderTopBar(); renderCorMain(); }
window.irInicio=()=>{ state.ui.appMode="inicio"; save(); render(); };

/* =================================================================
   INICIO — hub de acceso a las tres aplicaciones
   ================================================================= */
window.irModo=modo=>{ state.ui.appMode=modo; save(); render(); };

