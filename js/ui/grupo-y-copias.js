/* ============================================================================
   Cuaderno del profesor · Navegación por grupo, pantalla inicial vacía, exportar/importar todo
   js/ui/grupo-y-copias.js
   ============================================================================ */

window.irAGrupo=id=>{ state.ui.grupoId=id;
  if(state.ui.appMode==="corrector"){ state.ui.corTab="lista"; state.ui.corExamId=""; state.ui.corAlId=""; }
  else if(id){ state.ui.tab="resultados";
    state.ui.form={editId:null,nombre:"",tipo:TIPOS[0],esExamen:false,bloqueId:"",pesoBloque:"",links:[],sda:""}; state.ui.alumAbierto=null; }
  save(); render(); };

function renderMain(){
  const grupo=grupoActual();
  if(!grupo) return renderLanding();
  renderGrupo(grupo);
}

function avisoCopiaHTML(){
  const hasData=state.grupos.some(g=>g.alumnos.length>0||g.actividades.length>0);
  if(!hasData) return "";
  const last=state.lastBackupAt;
  if(!last) return `<div class="alert-box">⚠️ <strong>Todavía no has exportado ninguna copia de seguridad.</strong>&nbsp;Todo se guarda solo en este navegador: exporta una copia (arriba a la derecha) para no perder tu trabajo si cambias de equipo o se borra el caché.</div>`;
  const days=Math.floor((Date.now()-last)/86400000);
  if(days>=14) return `<div class="alert-box">⚠️ <strong>Última copia de seguridad: hace ${days} días.</strong>&nbsp;Conviene exportar una copia reciente.</div>`;
  return `<p class="sub" style="margin:-6px 0 4px">Última copia de seguridad: ${haceTiempo(last)}.</p>`;
}
function renderLanding(){
  const app=document.getElementById("app");
  const ng=state.ui.nuevoGrupo;
  if(!getCatalogo(ng.catalogoKey) || catalogoEstaOculto(ng.catalogoKey)) ng.catalogoKey=ORDEN_CATALOGOS.find(k=>!catalogoEstaOculto(k))||ORDEN_CATALOGOS[0];
  const hayGrupos=state.grupos.length>0;
  app.innerHTML=`
  <div class="hero">
    <div class="hero-eyebrow">Evaluación por competencias (LOMLOE) · para cualquier materia</div>
    <h1 class="hero-title">Evaluación por competencias</h1>
    <p class="hero-tag">Cualitativa y cuantitativa, criterio a criterio, trimestre a trimestre. Incluye de serie los catálogos de Geografía e Historia, y te permite importar los de cualquier otra materia (más abajo). Funciona en local: sin cuenta, sin conexión, sin que ningún dato salga de este dispositivo.</p>
    <div class="timeline">
      <div class="pt"><span class="dot"></span><span class="lbl">1ª evaluación</span></div>
      <span class="seg"></span>
      <div class="pt"><span class="dot"></span><span class="lbl">2ª evaluación</span></div>
      <span class="seg"></span>
      <div class="pt"><span class="dot"></span><span class="lbl">3ª evaluación</span></div>
    </div>
    ${avisoCopiaHTML()}
  </div>

  ${hayGrupos ? `
  <div>
    <div class="section-eyebrow">Tus grupos</div>
    <div class="gcard-grid">
      ${state.grupos.map(g=>{
        const cat=getCatalogo(g.catalogoKey);
        return `<div class="gcard">
          <div class="gcard-title">${esc(g.nombre)}</div>
          <div class="gcard-meta">${esc(cat.materia)} · ${esc(cat.curso)}</div>
          <div class="gcard-count">${g.alumnos.length} alumno${g.alumnos.length===1?"":"s"} · ${g.actividades.length} actividad${g.actividades.length===1?"":"es"}</div>
          <div class="gcard-actions">
            <button class="btn" onclick="irAGrupo('${g.id}')">Abrir</button>
            <button class="ghost danger" onclick="borrarGrupoId('${g.id}')">Eliminar</button>
          </div>
        </div>`;
      }).join("")}
    </div>
  </div>` : `
  <div class="card">
    <h2>Bienvenido/a</h2>
    <p class="sub">Empieza cargando una copia que ya tuvieras exportada, o crea tu primer grupo.</p>
  </div>`}

  <div class="card">
    <h2>Cargar archivo exportado</h2>
    <p class="sub">Recupera todos tus grupos, alumnado y calificaciones desde una copia de seguridad (.json) exportada previamente.</p>
    <label class="in file">Elegir archivo…<input type="file" accept="application/json,.json" style="display:none" onchange="importarTodo(this)"></label>
  </div>
  <div class="card">
    <h2>Crear grupo nuevo</h2>
    <p class="sub">Elige la materia y el curso: el catálogo de competencias específicas, criterios y competencias clave se carga automáticamente. Si tu materia no está en la lista, o quieres editar o eliminar alguna, hazlo en "Materias: importar, editar o eliminar plantillas" (justo debajo) y luego vuelve aquí.</p>
    <div class="grid" style="max-width:440px">
      <input class="in" id="ngNombre" placeholder="Nombre del grupo (p. ej. 1º Bach A)" value="${esc(ng.nombre)}">
      <select class="in" id="ngCat">${opcionesCatalogosHTML(ng.catalogoKey)}</select>
      <button class="btn" onclick="crearGrupo()" ${!ng.nombre.trim()?"disabled":""} style="justify-self:start">Crear grupo</button>
    </div>
  </div>

  ${renderGestionCatalogosHTML()}`;
  document.getElementById("ngNombre").addEventListener("input",e=>{ state.ui.nuevoGrupo.nombre=e.target.value; save();
    document.querySelector("main .btn[onclick=\"crearGrupo()\"]").disabled=!state.ui.nuevoGrupo.nombre.trim(); });
  document.getElementById("ngCat").addEventListener("change",e=>{ state.ui.nuevoGrupo.catalogoKey=e.target.value; save(); });
  document.getElementById("ngNombre").addEventListener("keydown",e=>{ if(e.key==="Enter") crearGrupo(); });
  bindGestionCatalogosEventos();
}
window.cargarArchivoCatalogo=inp=>{
  const file=inp.files[0]; if(!file) return;
  const rd=new FileReader();
  rd.onload=()=>{
    const ta=document.getElementById("catTexto");
    if(ta){ ta.value=String(rd.result); state.ui.catImportTexto=ta.value; save(); }
    inp.value="";
  };
  rd.readAsText(file);
};
window.crearGrupo=()=>{
  const ng=state.ui.nuevoGrupo; if(!ng.nombre.trim()) return;
  const g=defGrupo(ng.nombre.trim(),ng.catalogoKey);
  state.grupos.push(g);
  state.ui.grupoId=g.id; state.ui.tab="alumnos";
  state.ui.nuevoGrupo={nombre:"",catalogoKey:ORDEN_CATALOGOS[0]};
  save(); render();
};

window.exportarTodo=async()=>{
  volcarEspejoIDB();
  const d=new Date(), pad=n=>String(n).padStart(2,"0");
  const nombre=`copia-cuaderno-${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
  const _exAll=exTodosSync()||await exLeerTodos(); const blob=new Blob([JSON.stringify(_exAll.length?{...state,_examenesDiseno:_exAll}:state,null,2)],{type:"application/json"});
  const ok=await guardarArchivo(blob,nombre);
  if(!ok) return; // cancelado en el menú Compartir: no cuenta como copia
  state.lastBackupAt=Date.now(); state.cambiosSinCopia=0; save(); render();
  if(_copiasModalEl) pintarCopias();
  exLimpiarPendientes();
  mostrarToast("✓ Copia exportada");
};
function _procesarArchivoCopiaJSON(file,limpiar){
  if(!file) return; const rd=new FileReader();
  rd.onload=async()=>{
    if(limpiar) limpiar();
    let s;
    try{ s=JSON.parse(rd.result); }catch(e){ mostrarAviso("El archivo no es una copia válida: no se puede leer."); return; }
    s=await descifrarSiHaceFalta(s,file.name);
    if(s===null) return;
    if(!s || typeof s!=="object" || !Array.isArray(s.grupos)){
      mostrarAviso(s && s.grupo ? "Este archivo es un grupo suelto: cárgalo con «Importar grupo…» (junto a las pestañas de grupos)." : "El archivo no parece una copia de seguridad de esta app (le falta la lista de grupos).");
      return;
    }
    const nuevo=resumenEstado(s), actual=resumenEstado(state);
    const hayDatos=actual.total>0;
    const msg=`Vas a cargar la copia «${file.name}»:\n• ${nuevo.texto}`+
      (hayDatos?`\n\nEsto SUSTITUIRÁ todo lo que tienes ahora:\n• ${actual.texto}\n\nAntes se guarda automáticamente una copia de lo actual (recuperable en 🛟 Copias).`:"")+"\n\n¿Continuar?";
    if(!await confirmar(msg)) return;
    if(hayDatos) await crearCopiaAuto("Antes de importar «"+file.name+"»",true);
    const _exDis=s._examenesDiseno; delete s._examenesDiseno;
    if(cargarEstadoCompleto(s)){
      if(Array.isArray(_exDis)){ await exGuardarVarios(_exDis); exLimpiarPendientes(); }
      state.cambiosSinCopia=0; state.lastBackupAt=Date.now(); _mostrarBienvenida=false; save(); render();
      mostrarToast("✓ Copia cargada");
    }
  };
  rd.readAsText(file);
}
window.importarTodo=inp=>{ _procesarArchivoCopiaJSON(inp.files[0],()=>{ inp.value=""; }); };

function renderGrupo(grupo){
  const cat=getCatalogo(grupo.catalogoKey);
  const app=document.getElementById("app");
  app.innerHTML=`
  <div class="card" style="padding:12px 16px">
    <div class="flex" style="justify-content:space-between">
      <div>
        <strong style="font-size:15px">${esc(grupo.nombre)}</strong>
        <span style="color:var(--mut);font-size:13px"> · ${esc(cat.materia)} · ${esc(cat.curso)}</span>
      </div>
      <div class="flex">
        <button class="ghost" style="border:1px solid var(--line)" onclick="irAGrupo(null)">← Inicio</button>
        <select class="in" style="font-weight:600;min-width:160px" onchange="irATab(this.value)">
          ${[["alumnos","Alumnado"],["plano","Plano de aula"],["actividades","Actividades"],["calificar","Calificar"],["resultados","Resultados"],["asistencia","Asistencia"],["convivencia","Convivencia"],["familias","Familias"],["resumen","Resumen"],["diario","Diario"],["cobertura","Cobertura"],["ajustes","Ajustes"]]
            .map(([k,l])=>`<option value="${k}" ${state.ui.tab===k?"selected":""}>${l}</option>`).join("")}
        </select>
      </div>
    </div>
  </div>
  <div id="tabContent"></div>`;
  const t=state.ui.tab;
  try{
    if(t==="alumnos") renderAlumnos(grupo);
    else if(t==="plano") renderPlano(grupo);
    else if(t==="actividades") renderActividades(grupo);
    else if(t==="calificar") renderCalificar(grupo);
    else if(t==="resultados") renderResultados(grupo);
    else if(t==="resumen") renderResumen(grupo);
    else if(t==="cobertura") renderCobertura(grupo);
    else if(t==="asistencia") renderAsistencia(grupo);
    else if(t==="convivencia") renderConvivencia(grupo);
    else if(t==="familias") renderFamilias(grupo);
    else if(t==="diario") renderDiario(grupo);
    else if(t==="ajustes") renderAjustes(grupo);
  }catch(err){
    const tc=document.getElementById("tabContent");
    if(tc) tc.innerHTML=`<div class="card" style="border-color:var(--danger)">
      <h2 style="color:var(--danger)">⚠️ Ha habido un problema al mostrar esta pestaña</h2>
      <p class="sub">Prueba a recargar la página. Si sigue pasando, haz una captura de este mensaje (con el detalle técnico) y compártela para poder arreglarlo.</p>
      <details style="margin-top:8px"><summary style="cursor:pointer;font-size:13px;color:var(--mut)">Detalle técnico</summary>
        <pre style="white-space:pre-wrap;font-size:11.5px;color:var(--mut);background:var(--surface);padding:10px;border-radius:8px;margin-top:6px">Pestaña: ${esc(t)}
${esc(err.message||String(err))}
${esc(err.stack||"")}</pre>
      </details>
    </div>`;
    console.error("Error al renderizar la pestaña '"+t+"':", err);
  }
}
window.irATab=k=>{ state.ui.tab=k; save(); render(); };
window.irAAlumnoResultados=id=>{ state.ui.resAl = (state.ui.resAl===id && id!=="") ? "" : id; save(); render(); };

