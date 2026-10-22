/* ============================================================================
   Cuaderno del profesor · Plan de repetición: expediente formal
   js/alumnado/plan-repeticion.js
   ============================================================================ */

/* =================================================================
   PLAN DE REPETICIÓN — expediente formal de la decisión de
   promoción/repetición de curso: materias no superadas, medidas ya
   aplicadas, valoración del equipo docente, decisión final y plan
   específico para el curso siguiente si repite. Vive en
   state.planesRepeticion (top-level, se incluye solo con
   Exportar/Importar copia). Distinto del Plan de Refuerzo: este es
   el expediente de fin de curso, no el seguimiento del día a día.
   ================================================================= */
const RP_ESTADOS=[
  {id:"activo",label:"Activo",color:"#2563eb"},
  {id:"pausado",label:"Pausado",color:"#b45309"},
  {id:"superado",label:"Superado",color:"#16a34a"},
  {id:"no_superado",label:"No superado",color:"#dc2626"}
];
function rpEstadoInfo(id){ return RP_ESTADOS.find(e=>e.id===id)||RP_ESTADOS[0]; }
function rpAlumno(p){ const g=state.grupos.find(x=>x.id===p.grupoId); if(!g) return null; const al=g.alumnos.find(x=>x.id===p.alumnoId); return al?{al,g}:null; }
function rpNombre(p){ const alV=rpAlumno(p); return alV?alV.al.nombre:(p.alumnoNombre||"(sin asignar)"); }
function rpListaFiltrada(){
  const f=state.ui.rpFiltroEstado, q=(state.ui.rpBusqueda||"").toLowerCase().trim();
  return (state.planesRepeticion||[]).filter(p=>{
    if(f && p.estado!==f) return false;
    if(q){ const texto=normalizarTexto(rpNombre(p)+" "+(p.cursoRepite||"")); if(!texto.includes(normalizarTexto(q))) return false; }
    return true;
  }).sort((a,b)=>rfrpComparaPorCurso(a,b,rpAlumno,rpNombre));
}
window.rpTab=k=>{ state.ui.rpTab=k; if(k==="lista") state.ui.rpId=""; save(); render(); };
window.rpIrLista=()=>{ state.ui.rpTab="lista"; state.ui.rpId=""; save(); render(); };
window.rpAbrirDetalle=id=>{ state.ui.rpTab="detalle"; state.ui.rpId=id; save(); render(); };
window.rpAbrirDesdeOtroModo=id=>{ state.ui.appMode="repeticion"; state.ui.rpTab="detalle"; state.ui.rpId=id; save(); render(); };
window.rpSetFiltroEstado=v=>{ state.ui.rpFiltroEstado=v; save(); render(); };
window.rpSetBusqueda=v=>{ state.ui.rpBusqueda=v; save(); render(); };
window.rpAbrirModalNueva=()=>{ if(!state.grupos.length){ mostrarAviso("Crea primero un grupo con alumnado desde Evaluación por Competencias."); return; } state.ui.rpModalNueva=true; save(); render(); };
window.rpCerrarModalNueva=()=>{ state.ui.rpModalNueva=false; save(); render(); };

function renderRepeticionApp(){
  const app=document.getElementById("app");
  app.innerHTML=`<div class="card" style="padding:12px 16px">
    <div class="flex" style="justify-content:space-between">
      <div><strong style="font-size:15px">🔁 Plan de Repetición</strong><span style="color:var(--mut);font-size:13px"> · seguimiento trimestral de alumnado repetidor</span></div>
      <button class="ghost" style="border:1px solid var(--line)" onclick="irInicio()">🏠 Inicio</button>
    </div>
  </div><div id="rpRoot"></div>`;
  const root=document.getElementById("rpRoot");
  if(state.ui.rpTab==="detalle" && state.ui.rpId && (state.planesRepeticion||[]).find(p=>p.id===state.ui.rpId)){
    renderRpDetalleHTML(root);
  }else{
    renderRpListaHTML(root);
  }
  if(state.ui.rpModalNueva){ root.insertAdjacentHTML("beforeend", rpRenderModalNuevaHTML()); rpRefrescarAlumnoSel(); }
  if(state.ui.prepModal) root.insertAdjacentHTML("beforeend", prepararModalHTML());
  if(state.ui.prepNuevoModal) root.insertAdjacentHTML("beforeend", prepararNuevoModalHTML());
  if(state.ui.rpModalElegirCE) root.insertAdjacentHTML("beforeend", rpModalElegirCEHTML());
}

function renderRpListaHTML(root){
  const lista=rpListaFiltrada();
  const total=(state.planesRepeticion||[]).length;
  const activos=(state.planesRepeticion||[]).filter(p=>p.estado==="activo").length;
  const filas = lista.length? lista.map(p=>{
    const info=rpEstadoInfo(p.estado);
    const alV=rpAlumno(p);
    const objetivosTotal=(p.trimestres||[]).reduce((s,t)=>s+(t.objetivos||[]).filter(o=>o&&o.trim()).length,0);
    return `<div class="card" style="cursor:pointer;padding:16px 18px" onclick="rpAbrirDetalle('${p.id}')">
      <div class="flex" style="justify-content:space-between;align-items:flex-start">
        <div style="min-width:0">
          <span class="pill" style="background:${info.color}1a;color:${info.color};margin-bottom:6px">${info.label}</span>
          <div style="font-size:15px;font-weight:700">${esc(rpNombre(p))}</div>
          <div style="font-size:12.5px;color:var(--mut);margin-top:2px">${alV?esc(alV.g.nombre):"pendiente de asignar"}${p.cursoRepite?" · "+esc(p.cursoRepite):""}</div>
          <div style="font-size:12.5px;color:var(--mut);margin-top:6px">${p.fechaInicio?"Desde "+fmt2(p.fechaInicio):""}</div>
        </div>
        <span class="badge">${objetivosTotal} objetivo${objetivosTotal===1?"":"s"}</span>
      </div>
    </div>`;
  }).join("") : `<div class="card" style="text-align:center;padding:34px 18px">
    <div style="font-size:34px;margin-bottom:8px;opacity:.8">🔁</div>
    <p class="sub" style="margin:0">${total===0?"Todavía no has creado ningún plan de repetición.":"Sin resultados con este filtro/búsqueda."}</p>
    ${total===0?'<button class="btn small" style="margin-top:12px" onclick="rpAbrirModalNueva()">+ Crear el primero</button>':""}
  </div>`;

  root.innerHTML=`
  <div class="card">
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
      <div class="flex" style="gap:16px">
        <div><div class="big" style="font-size:24px">${total}</div><div class="sub" style="margin:0">Total</div></div>
        <div><div class="big" style="font-size:24px">${activos}</div><div class="sub" style="margin:0">Activos</div></div>
      </div>
      <div class="flex">
        <button class="ghost" style="border:1px solid var(--line)" onclick="prepararNuevoAbrir('repeticion')" title="Prepara un plan para un alumno/a que este año no tiene plan, de cara al curso que viene">📅 Preparar curso siguiente</button>
        <button class="btn" onclick="rpAbrirModalNueva()">+ Nuevo plan</button>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="flex">
      <input class="in" style="flex:1;min-width:180px" placeholder="Buscar por alumno o curso…" id="rpBusquedaInput" value="${esc(state.ui.rpBusqueda||"")}">
      <select class="in" id="rpFiltroInput">
        <option value="">Todos los estados</option>
        ${RP_ESTADOS.map(e=>`<option value="${e.id}" ${state.ui.rpFiltroEstado===e.id?"selected":""}>${e.label}</option>`).join("")}
      </select>
    </div>
  </div>
  <div class="grid" style="gap:10px">${filas}</div>`;
  document.getElementById("rpBusquedaInput").addEventListener("input",e=>{ rpSetBusqueda(e.target.value); });
  document.getElementById("rpFiltroInput").addEventListener("change",e=>{ rpSetFiltroEstado(e.target.value); });
}

function rpRenderModalNuevaHTML(){
  return `
  <div class="modal-overlay" onclick="if(event.target===this) rpCerrarModalNueva()">
    <div class="modal-box" style="max-width:460px">
      <div class="flex" style="justify-content:space-between;align-items:flex-start">
        <h2 style="font-size:17px">Nuevo plan de repetición</h2>
        <button class="modal-close" onclick="rpCerrarModalNueva()">×</button>
      </div>
      <p class="sub" style="margin-top:6px">Para un alumno/a que repite curso y una de las causas fue no superar tu materia. Objetivo: que la apruebe este año, trimestre a trimestre. Los motivos, las medidas propuestas y la evaluación se completan en el detalle del plan.</p>
      <div class="grid" style="gap:12px;margin-top:6px">
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Grupo
          <select class="in" style="width:100%;margin-top:4px" id="rpNGrupo" onchange="rpRefrescarAlumnoSel()">
            ${state.grupos.map(g=>`<option value="${g.id}">${esc(g.nombre)}</option>`).join("")}
          </select>
        </label>
        <div id="rpNAlumnoWrap"></div>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Curso y materia que repite
          <select class="in" style="width:100%;margin-top:4px" id="rpNCurso">
            <option value="">— Selecciona curso y materia —</option>
            ${catalogoSelectOptionsHTML("",null)}
          </select>
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Curso académico
          <input class="in" style="width:100%;margin-top:4px" id="rpNCursoAcademico" placeholder="2026-2027">
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Fecha de inicio
          <input class="in" style="width:100%;margin-top:4px" type="date" id="rpNFecha" value="${agHoyStr()}">
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Cargar modelo del departamento (opcional)
          <select class="in" style="width:100%;margin-top:4px" id="rpNModelo">
            <option value="">Sin modelo — plan en blanco</option>
            <option value="1">1.º ESO</option>
            <option value="2">2.º ESO</option>
            <option value="3">3.º ESO</option>
            <option value="4">4.º ESO</option>
          </select>
        </label>
        <p class="sub" style="margin:-4px 0 0;font-size:11.5px">Rellena las tres evaluaciones con el dossier de actividades por defecto de ese nivel. Una vez creado el plan, podrás elegir con un clic —desde una lista emergente— las competencias específicas, criterios y competencias clave no conseguidas del curso que repite.</p>
      </div>
      <div class="flex" style="justify-content:flex-end;margin-top:18px">
        <button class="ghost" onclick="rpCerrarModalNueva()">Cancelar</button>
        <button class="btn" onclick="rpCrearPlan()">Crear</button>
      </div>
    </div>
  </div>`;
}
window.rpRefrescarAlumnoSel=()=>{
  const gid=document.getElementById("rpNGrupo").value;
  const wrap=document.getElementById("rpNAlumnoWrap");
  const g=state.grupos.find(x=>x.id===gid);
  if(!g || !g.alumnos.length){ wrap.innerHTML='<p class="sub" style="margin:0">Este grupo no tiene alumnado todavía.</p>'; return; }
  wrap.innerHTML=`<label style="font-size:12.5px;color:var(--mut);font-weight:500">Alumno/a
    <select class="in" style="width:100%;margin-top:4px" id="rpNAlumno">
      ${g.alumnos.map(al=>`<option value="${al.id}">${esc(al.nombre)}</option>`).join("")}
    </select>
  </label>`;
  // Preselecciona, como opción más probable, la propia materia+curso del
  // grupo (lo habitual es repetir el mismo curso); el profesor/a puede
  // elegir otra cosa en el desplegable si no es el caso.
  const cursoSel=document.getElementById("rpNCurso");
  if(cursoSel && !cursoSel.value){
    cursoSel.innerHTML=`<option value="">— Selecciona curso y materia —</option>${catalogoSelectOptionsHTML(g.catalogoKey,getCatalogo(g.catalogoKey)?getCatalogo(g.catalogoKey).materia:null)}`;
  }
};
window.rpCrearPlan=()=>{
  const grupoId=document.getElementById("rpNGrupo").value;
  const alumnoId=document.getElementById("rpNAlumno")?.value;
  if(!alumnoId){ mostrarAviso("Este grupo no tiene alumnado."); return; }
  const g=state.grupos.find(x=>x.id===grupoId); const al=g.alumnos.find(x=>x.id===alumnoId);
  const cursoRepiteCatalogoKey=document.getElementById("rpNCurso").value;
  const catCursoRepite=cursoRepiteCatalogoKey?getCatalogo(cursoRepiteCatalogoKey):null;
  const cursoRepite=catCursoRepite?catCursoRepite.curso:"";
  const cursoAcademico=document.getElementById("rpNCursoAcademico").value.trim();
  const fechaInicio=document.getElementById("rpNFecha").value;
  const nivelModelo=document.getElementById("rpNModelo").value;
  const trimestres=rfrpTrimestresIniciales(nivelModelo);
  const p={ id:uid(), grupoId, alumnoId, alumnoNombre:al.nombre, cursoRepite, cursoRepiteCatalogoKey, cursoAcademico,
    motivos:rfrpMotivosDefault(), medidasNivelII:rpMedidasDefault(RP_MEDIDAS_II), medidasNivelIII:rpMedidasDefault(RP_MEDIDAS_III),
    fechaInicio, estado:"activo", trimestres, valoracionFinal:"",
    observacionesFinales:"", planOrigenId:"", planOrigenTipo:"" };
  if(!Array.isArray(state.planesRepeticion)) state.planesRepeticion=[];
  state.planesRepeticion.push(p);
  state.ui.rpModalNueva=false; state.ui.rpTab="detalle"; state.ui.rpId=p.id;
  save(); render();
};

function renderRpDetalleHTML(root){
  const p=(state.planesRepeticion||[]).find(x=>x.id===state.ui.rpId);
  if(!Array.isArray(p.trimestres) || p.trimestres.length!==3) p.trimestres=rfrpTrimestresIniciales("");
  if(!p.motivos) p.motivos=rfrpMotivosDefault();
  if(!p.medidasNivelII) p.medidasNivelII=rpMedidasDefault(RP_MEDIDAS_II);
  if(!p.medidasNivelIII) p.medidasNivelIII=rpMedidasDefault(RP_MEDIDAS_III);
  if(p.valoracionFinal===undefined) p.valoracionFinal="";
  if(p.cursoAcademico===undefined) p.cursoAcademico="";
  if(p.cursoRepiteCatalogoKey===undefined) p.cursoRepiteCatalogoKey="";
  const alV=rpAlumno(p);
  const catalogoCursoKey=rpCatalogoParaCursoRepite(p);
  const referenciaCurricularHTML=catalogoCursoKey?`<div class="card">${referenciaCurricularTablaHTML(catalogoCursoKey,true)}
    <p class="sub" style="margin-top:8px">Currículo cargado automáticamente a partir del curso y la materia que repite. Usa el botón «🔍 Elegir de las competencias cargadas» en cada evaluación para marcar cuáles no se han conseguido: se añaden solas a la tabla, sin tener que escribirlas a mano. No se imprime en el informe.</p>
  </div>`:"";
  const motivosHTML=`<div class="card">
    <h2 style="font-size:15px">Motivos de la no superación de la materia</h2>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;max-width:760px;margin-top:8px">
      ${RFRP_MOTIVOS.map(m=>`<label class="row" style="cursor:pointer;gap:8px">
        <input type="checkbox" ${p.motivos[m.id]?"checked":""} onchange="rpSetMotivo('${m.id}',this.checked)">
        <span style="font-size:13.5px">${m.label}</span>
      </label>`).join("")}
    </div>
    ${p.motivos.otros?`<textarea class="in" style="width:100%;margin-top:8px;min-height:50px;resize:vertical" id="rpDMotivoOtros" placeholder="Explica el motivo…">${esc(p.motivos.otrosTexto||"")}</textarea>`:""}
  </div>`;
  const medidasHTML=(titulo,lista,campo)=>`<div class="card">
    <h2 style="font-size:15px">${titulo}</h2>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px;max-width:900px;margin-top:8px">
      ${lista.map(m=>`<label class="row" style="cursor:pointer;gap:8px">
        <input type="checkbox" ${p[campo][m.id]?"checked":""} onchange="rpSetMedida('${campo}','${m.id}',this.checked)">
        <span style="font-size:13.5px">${m.label}</span>
      </label>`).join("")}
    </div>
    ${p[campo].otros?`<textarea class="in" style="width:100%;margin-top:8px;min-height:50px;resize:vertical" id="rpD_${campo}_Otros" placeholder="Explica la medida…">${esc(p[campo].otrosTexto||"")}</textarea>`:""}
  </div>`;
  const trimestreHTML=(idx)=>{
    const trim=p.trimestres[idx];
    const actividadesHtml=(trim.actividades||[]).map((t,i)=>`
      <div class="flex" style="margin-bottom:6px;align-items:flex-start">
        <span class="badge" style="flex-shrink:0;margin-top:9px">✓</span>
        <textarea class="rfrp-criterio-texto" style="flex:1" placeholder="Actividad de evaluación…" onchange="rfrpSetActividad('rp',${idx},${i},this.value)">${esc(t||"")}</textarea>
        <button class="ghost danger" style="margin-top:4px" onclick="rfrpQuitarActividad('rp',${idx},${i})">✕</button>
      </div>`).join("");
    const vinfo=rfrpValoracionPNInfo(trim.valoracion);
    return `<div class="card">
      <h2 style="font-size:15px">${TRIMESTRES[idx]}</h2>
      <div class="section-eyebrow" style="margin-top:8px">Competencias específicas, criterios de evaluación y competencias clave no conseguidas</div>
      ${catalogoCursoKey?`<button class="ghost" style="border:1px solid var(--line);margin-bottom:8px" onclick="rpAbrirModalElegirCE(${idx})">🔍 Elegir de las competencias cargadas</button>`
        :`<p class="sub" style="margin:0 0 8px">Selecciona arriba el curso y la materia que repite para poder elegirlas de una lista en vez de escribirlas a mano.</p>`}
      ${rfrpTablaCEHTML("rp",idx,trim.gruposCE)}
      <div class="section-eyebrow" style="margin-top:16px">Actividades de evaluación</div>
      <div>${actividadesHtml}</div>
      <button class="ghost" style="border:1px solid var(--line);margin-top:4px" onclick="rfrpAnadirActividad('rp',${idx})">+ Añadir actividad</button>
      <div class="flex" style="margin-top:14px">
        <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1">Calificación obtenida
          <input class="in" style="width:100%;margin-top:4px" placeholder="Ej. 6" value="${esc(trim.calificacion||"")}" onchange="rfrpSetTrimCampo('rp',${idx},'calificacion',this.value)">
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1">Valoración de ${TRIMESTRES[idx].toLowerCase()}
          <select class="in" style="width:100%;margin-top:4px;color:${vinfo.color}" onchange="rfrpSetTrimCampo('rp',${idx},'valoracion',this.value)">
            ${RFRP_VALORACION_PN.map(v=>`<option value="${v.id}" ${trim.valoracion===v.id?"selected":""}>${v.label}</option>`).join("")}
          </select>
        </label>
      </div>
      <label style="font-size:12.5px;color:var(--mut);font-weight:500;display:block;margin-top:10px">Justificación de la valoración
        <textarea class="in" style="width:100%;margin-top:4px;min-height:56px;resize:vertical" placeholder="Por qué esta valoración…" onchange="rfrpSetTrimCampo('rp',${idx},'justificacion',this.value)">${esc(trim.justificacion||"")}</textarea>
      </label>
    </div>`;
  };
  const reunionesRelacionadas=(state.reuniones||[]).filter(r=>r.alumnoId===p.alumnoId && p.alumnoId);
  const refuerzoRelacionados=(state.planesRefuerzo||[]).filter(r=>r.alumnoId===p.alumnoId && p.alumnoId);
  const vfinal=rfrpValoracionPNInfo(p.valoracionFinal);
  root.innerHTML=`
  <div class="card">
    <div class="flex" style="justify-content:space-between;flex-wrap:wrap;gap:10px">
      <button class="ghost" style="border:1px solid var(--line)" onclick="rpIrLista()">← Planes de repetición</button>
      <div class="flex">
        <select class="in" id="rpDEstado" style="font-weight:600">${RP_ESTADOS.map(e=>`<option value="${e.id}" ${p.estado===e.id?"selected":""}>${e.label}</option>`).join("")}</select>
        <button class="ghost" style="border:1px solid var(--line)" onclick="prepararSiguienteCurso('repeticion','${p.id}')" title="Crear el plan del curso que viene para este alumno/a">➜ Preparar curso siguiente</button>
        <button class="btn" onclick="rpImprimirInforme('${p.id}')">🖨️ Imprimir informe</button>
        <button class="ghost danger" onclick="rpEliminarPlan('${p.id}')">Eliminar</button>
      </div>
    </div>
    ${!alV?`<div class="alert-box" style="align-items:flex-start;flex-direction:column;gap:8px;margin-top:14px">
      <div>👤 <strong>${esc(p.alumnoNombre||"Sin asignar")}</strong> — pendiente de asignar a un grupo de este curso.</div>
      <div class="flex" style="width:100%">
        <select class="in" id="rpReasignGrupo" style="flex:1" onchange="rpRefrescarReasignAlumno()">
          <option value="">Elige un grupo…</option>
          ${state.grupos.map(g=>`<option value="${g.id}">${esc(g.nombre)}</option>`).join("")}
        </select>
        <span id="rpReasignAlumnoWrap" style="flex:1"></span>
        <button class="btn small" onclick="rpConfirmarReasignacion('${p.id}')">Asignar</button>
      </div>
    </div>`:""}
    ${p.planOrigenId?`<p class="sub" style="margin:10px 0 0">➜ Continuación de un plan de ${p.planOrigenTipo==="repeticion"?"repetición":"refuerzo"} del curso anterior.</p>`:""}
    <div class="grid" style="gap:12px;margin-top:14px">
      <div style="font-size:14px"><strong>${esc(rpNombre(p))}</strong>${alV?neseBadgeHTML(alV.al)+planBadgeHTML(alV.al)+repetidorBadgeHTML(alV.al)+` <span class="sub">· ${esc(alV.g.nombre)}</span>`:""}</div>
      <label style="font-size:12.5px;color:var(--mut);font-weight:500">Curso y materia que repite
        <select class="in" style="width:100%;margin-top:4px;font-size:15px;font-weight:600" id="rpDCurso" onchange="rpSetCursoRepiteCatalogo(this.value)">
          <option value="" ${!catalogoCursoKey?"selected":""}>${(!catalogoCursoKey && p.cursoRepite)?"— "+esc(p.cursoRepite)+" (elige de la lista) —":"— Selecciona curso y materia —"}</option>
          ${catalogoSelectOptionsHTML(catalogoCursoKey||"",materiaDelGrupo(p.grupoId))}
        </select>
      </label>
      <div class="flex" style="align-items:center;gap:8px;flex-wrap:wrap">
        ${catalogoCursoKey?`<span class="sub" style="margin:0">📘 ${esc(getCatalogo(catalogoCursoKey).materia)} · <strong>${esc(getCatalogo(catalogoCursoKey).curso)}</strong> — currículo cargado más abajo.</span>`
        :`<span class="sub" style="margin:0">Elige el curso y la materia que repite para cargar sus competencias, criterios y saberes básicos.</span>`}
      </div>
      <div class="flex">
        <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1">Curso académico
          <input class="in" style="width:100%;margin-top:4px" id="rpDCursoAcademico" value="${esc(p.cursoAcademico||"")}" placeholder="2026-2027">
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1">Fecha de inicio
          <input class="in" style="width:100%;margin-top:4px" type="date" id="rpDFechaInicio" value="${p.fechaInicio||""}">
        </label>
      </div>
    </div>
  </div>
  ${referenciaCurricularHTML}
  ${motivosHTML}
  ${medidasHTML("Medidas propuestas — Nivel II", RP_MEDIDAS_II, "medidasNivelII")}
  ${medidasHTML("Medidas propuestas — Nivel III", RP_MEDIDAS_III, "medidasNivelIII")}
  ${trimestreHTML(0)}
  ${trimestreHTML(1)}
  ${trimestreHTML(2)}
  ${rfrpCeLegendHTML()}
  <div class="card">
    <h2 style="font-size:15px">Valoración final del plan</h2>
    <select class="in" style="max-width:260px;color:${vfinal.color};font-weight:600" onchange="rfrpSetValoracionFinal('rp',this.value)">
      ${RFRP_VALORACION_PN.map(v=>`<option value="${v.id}" ${p.valoracionFinal===v.id?"selected":""}>${v.label}</option>`).join("")}
    </select>
  </div>
  <div class="card">
    <h2 style="font-size:15px">Observaciones finales</h2>
    <p class="sub" style="margin:0 0 8px">Valoración de cierre: si finalmente supera o no la materia este curso.</p>
    <textarea class="in" style="width:100%;min-height:70px;resize:vertical" id="rpDObservaciones" placeholder="Valoración de cierre del plan…">${esc(p.observacionesFinales||"")}</textarea>
    ${(reunionesRelacionadas.length||refuerzoRelacionados.length)?`<h2 style="font-size:15px;margin-top:22px">Relacionado con este alumno/a</h2>
      <div class="grid" style="gap:6px">
        ${refuerzoRelacionados.map(r=>`<div class="ag-evento" onclick="rfAbrirDesdeOtroModo('${r.id}')">
          <div class="ag-evento-info"><div class="ag-evento-titulo">📈 ${esc(r.titulo)}</div><div class="ag-evento-grupo">Plan de refuerzo · ${rfEstadoInfo(r.estado).label}</div></div>
        </div>`).join("")}
        ${reunionesRelacionadas.map(r=>`<div class="ag-evento" onclick="reAbrirDesdeOtroModo('${r.id}')">
          <div class="ag-evento-info"><div class="ag-evento-titulo">🗂️ ${esc(r.titulo)}</div><div class="ag-evento-grupo">${reTipoInfo(r.tipo).label}${r.fecha?" · "+fmt2(r.fecha):""}</div></div>
        </div>`).join("")}
      </div>`:""}
  </div>`;
  const campo=(id,fn)=>document.getElementById(id).addEventListener("change",e=>{ fn(e.target.value); save(); });
  campo("rpDEstado",v=>p.estado=v);
  campo("rpDCursoAcademico",v=>p.cursoAcademico=v.trim());
  campo("rpDFechaInicio",v=>p.fechaInicio=v);
  campo("rpDObservaciones",v=>p.observacionesFinales=v);
  if(document.getElementById("rpDMotivoOtros")) campo("rpDMotivoOtros",v=>p.motivos.otrosTexto=v);
  if(document.getElementById("rpD_medidasNivelII_Otros")) campo("rpD_medidasNivelII_Otros",v=>p.medidasNivelII.otrosTexto=v);
  if(document.getElementById("rpD_medidasNivelIII_Otros")) campo("rpD_medidasNivelIII_Otros",v=>p.medidasNivelIII.otrosTexto=v);
}
/* Al elegir en el desplegable el curso y la materia que repite, guarda la
   clave exacta del catálogo (sin ambigüedad posible, ya que se elige con un
   clic) y el texto del curso para mostrarlo en cabeceras e informes. No
   toca la tabla de competencias: eso se hace aparte, a demanda, con el
   selector emergente de cada evaluación. */
window.rpSetCursoRepiteCatalogo=(key)=>{
  const p=(state.planesRepeticion||[]).find(x=>x.id===state.ui.rpId); if(!p) return;
  p.cursoRepiteCatalogoKey=key||"";
  const cat=key?getCatalogo(key):null;
  p.cursoRepite=cat?cat.curso:"";
  save(); render();
};
/* ---- Selector emergente de competencias específicas / criterios / saberes
   básicos no conseguidos, a partir del catálogo ya cargado, para una
   evaluación concreta de un Plan de Repetición. ---- */
window.rpAbrirModalElegirCE=(trimIdx)=>{
  const p=(state.planesRepeticion||[]).find(x=>x.id===state.ui.rpId); if(!p) return;
  if(!rpCatalogoParaCursoRepite(p)){ mostrarAviso("Elige primero, arriba, el curso y la materia que repite."); return; }
  state.ui.rpModalElegirCE={trimIdx};
  save(); render();
};
window.rpCerrarModalElegirCE=()=>{ state.ui.rpModalElegirCE=null; save(); render(); };
function rpModalElegirCEHTML(){
  const {trimIdx}=state.ui.rpModalElegirCE;
  const p=(state.planesRepeticion||[]).find(x=>x.id===state.ui.rpId); if(!p) return "";
  const key=rpCatalogoParaCursoRepite(p); if(!key) return "";
  const idx=catIndex(key); const cat=idx.cat;
  const saberes=progSaberesDelCatalogo(key)||{};
  const trim=p.trimestres[trimIdx];
  const marcados=new Set();
  (trim.gruposCE||[]).forEach(g=>(g.criterios||[]).forEach(c=>{ if(c.id) marcados.add(c.id); }));
  const bloques=cat.ces.map(ce=>{
    const sab=saberes[ce.id]||[];
    const filasCrit=ce.criterios.map(c=>`
      <label class="row" style="cursor:pointer;gap:8px;align-items:flex-start;padding:4px 0">
        <input type="checkbox" class="rpElegirCrit" data-ce="${esc(ce.id)}" data-crit="${esc(c.id)}" ${marcados.has(c.id)?"checked":""} style="margin-top:3px">
        <span style="font-size:13px"><strong>${esc(c.id)}</strong> ${esc(c.texto)}</span>
      </label>`).join("");
    return `<div style="margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--line)">
      <div class="flex" style="justify-content:space-between;align-items:center;gap:8px">
        <div style="font-weight:700;font-size:13.5px">${esc(ce.id)} · ${esc(ce.titulo)}</div>
        <button type="button" class="ghost small" style="border:1px solid var(--line);flex-shrink:0" onclick="rpToggleTodosCE('${esc(ce.id)}')">Marcar/desmarcar</button>
      </div>
      <div class="sub" style="margin:2px 0 6px">Competencias clave: ${(ce.cc||[]).join(", ")||"—"}</div>
      ${sab.length?`<details style="margin:0 0 8px"><summary class="sub" style="cursor:pointer">Saberes básicos (${sab.length})</summary><ul style="margin:4px 0 0 18px;font-size:12px">${sab.map(s=>`<li>${esc(s)}</li>`).join("")}</ul></details>`:""}
      ${filasCrit}
    </div>`;
  }).join("");
  return `<div class="modal-overlay" onclick="if(event.target===this) rpCerrarModalElegirCE()">
    <div class="modal-box" style="max-width:680px;max-height:82vh;display:flex;flex-direction:column;padding:0;overflow:hidden">
      <div style="padding:16px 22px;border-bottom:1px solid var(--line);flex-shrink:0">
        <div class="flex" style="justify-content:space-between;align-items:flex-start">
          <div>
            <h2 style="font-size:17px;margin:0">Elegir competencias no conseguidas</h2>
            <p class="sub" style="margin:4px 0 0">${TRIMESTRES[trimIdx]} · ${esc(cat.materia)} · ${esc(cat.curso)}</p>
          </div>
          <button class="modal-close" onclick="rpCerrarModalElegirCE()">×</button>
        </div>
      </div>
      <div style="overflow-y:auto;padding:16px 22px;flex:1">
        <div class="flex" style="gap:6px;margin-bottom:12px">
          <button type="button" class="ghost small" style="border:1px solid var(--line)" onclick="rpMarcarTodosModal(true)">Seleccionar todo</button>
          <button type="button" class="ghost small" style="border:1px solid var(--line)" onclick="rpMarcarTodosModal(false)">Vaciar selección</button>
        </div>
        ${bloques}
      </div>
      <div style="padding:14px 22px;border-top:1px solid var(--line);flex-shrink:0">
        <label class="row" style="cursor:pointer;gap:8px;margin-bottom:10px">
          <input type="checkbox" id="rpElegirTodosTrim">
          <span style="font-size:12.5px">Aplicar esta misma selección a las tres evaluaciones</span>
        </label>
        <div class="flex" style="justify-content:flex-end">
          <button class="ghost" onclick="rpCerrarModalElegirCE()">Cancelar</button>
          <button class="btn" onclick="rpAplicarSeleccionCE()">Aplicar selección</button>
        </div>
      </div>
    </div>
  </div>`;
}
window.rpToggleTodosCE=(ceId)=>{
  const boxes=[...document.querySelectorAll(".rpElegirCrit")].filter(b=>b.dataset.ce===ceId);
  const todosMarcados=boxes.every(b=>b.checked);
  boxes.forEach(b=>{ b.checked=!todosMarcados; });
};
window.rpMarcarTodosModal=(marcar)=>{
  document.querySelectorAll(".rpElegirCrit").forEach(b=>{ b.checked=marcar; });
};
window.rpAplicarSeleccionCE=()=>{
  const {trimIdx}=state.ui.rpModalElegirCE;
  const p=(state.planesRepeticion||[]).find(x=>x.id===state.ui.rpId); if(!p) return;
  const key=rpCatalogoParaCursoRepite(p); if(!key) return;
  const idx=catIndex(key); const cat=idx.cat;
  const trim=p.trimestres[trimIdx];
  const catalogIds=new Set(cat.ces.map(ce=>ce.id));
  // Conserva el estado de "trabajado" de los criterios que ya estaban.
  const trabajadoPrevio={};
  (trim.gruposCE||[]).forEach(g=>(g.criterios||[]).forEach(c=>{ if(c.id) trabajadoPrevio[c.id]=!!c.trabajado; }));
  // Los grupos con una CE que no pertenece a este catálogo (añadidos a mano
  // con otro código) se dejan intactos.
  const gruposManuales=(trim.gruposCE||[]).filter(g=>!catalogIds.has(g.ce));
  // Dentro de una CE del catálogo puede haber además criterios añadidos a
  // mano (sin id de catálogo): también se conservan.
  const manualesEnCatalogo={};
  (trim.gruposCE||[]).forEach(g=>{ if(catalogIds.has(g.ce)) manualesEnCatalogo[g.ce]=(g.criterios||[]).filter(c=>!c.id); });
  const nuevosGrupos=[];
  cat.ces.forEach(ce=>{
    const marcados=[...document.querySelectorAll(".rpElegirCrit")].filter(b=>b.dataset.ce===ce.id && b.checked);
    const seleccionados=marcados.map(chk=>{
      const c=ce.criterios.find(x=>x.id===chk.dataset.crit);
      return c?{id:c.id, texto:`${c.id}. ${c.texto}`, trabajado:!!trabajadoPrevio[c.id]}:null;
    }).filter(Boolean);
    const manuales=manualesEnCatalogo[ce.id]||[];
    if(seleccionados.length||manuales.length) nuevosGrupos.push({ce:ce.id, cc:(ce.cc||[]).join(", "), criterios:[...seleccionados,...manuales]});
  });
  trim.gruposCE=[...nuevosGrupos,...gruposManuales];
  const aplicarTodos=document.getElementById("rpElegirTodosTrim");
  if(aplicarTodos && aplicarTodos.checked){
    [0,1,2].filter(i=>i!==trimIdx).forEach(i=>{
      p.trimestres[i].gruposCE=trim.gruposCE.map(g=>({ce:g.ce,cc:g.cc,criterios:g.criterios.map(c=>({...c}))}));
    });
  }
  state.ui.rpModalElegirCE=null;
  save(); render();
  mostrarToast("✓ Competencias actualizadas");
};
window.rpSetMedida=(campo,id,checked)=>{
  const p=(state.planesRepeticion||[]).find(x=>x.id===state.ui.rpId);
  p[campo][id]=checked; save(); render();
};
window.rpRefrescarReasignAlumno=()=>{
  const gid=document.getElementById("rpReasignGrupo").value;
  const wrap=document.getElementById("rpReasignAlumnoWrap");
  const g=state.grupos.find(x=>x.id===gid);
  if(!g||!g.alumnos.length){ wrap.innerHTML=""; return; }
  wrap.innerHTML=`<select class="in" id="rpReasignAlumno">${g.alumnos.map(al=>`<option value="${al.id}">${esc(al.nombre)}</option>`).join("")}</select>`;
};
window.rpConfirmarReasignacion=id=>{
  const gid=document.getElementById("rpReasignGrupo").value;
  const alId=document.getElementById("rpReasignAlumno")?.value;
  if(!gid||!alId){ mostrarAviso("Elige grupo y alumno/a."); return; }
  const p=(state.planesRepeticion||[]).find(x=>x.id===id);
  const g=state.grupos.find(x=>x.id===gid); const al=g.alumnos.find(x=>x.id===alId);
  p.grupoId=gid; p.alumnoId=alId; p.alumnoNombre=al.nombre;
  save(); render();
};

window.rpEliminarPlan=async id=>{
  if(!await confirmar("¿Eliminar este plan de repetición? No se puede deshacer.")) return;
  state.planesRepeticion=(state.planesRepeticion||[]).filter(x=>x.id!==id);
  state.ui.rpTab="lista"; state.ui.rpId="";
  save(); render();
  mostrarToast("Plan eliminado","info");
};
function rpMedidasResumenHTML(medidas,lista){
  if(!medidas) return "—";
  const activos=lista.filter(m=>medidas[m.id]).map(m=>m.id==="otros"&&medidas.otrosTexto?`Otros: ${esc(medidas.otrosTexto)}`:esc(m.label));
  return activos.length?activos.join(", "):"—";
}
window.rpImprimirInforme=id=>{
  const p=(state.planesRepeticion||[]).find(x=>x.id===id); if(!p) return;
  const alV=rpAlumno(p);
  const vfinal=rfrpValoracionPNInfo(p.valoracionFinal);
  const body=`
    <h1>Plan de repetición</h1>
    <div class="meta">${esc(rpNombre(p))}${alV?" · "+esc(alV.g.nombre):""}${p.cursoRepite?" · "+esc(p.cursoRepite):""} · Generado el ${new Date().toLocaleDateString("es-ES")}</div>
    <table>
      <tr><th style="width:170px">Curso académico</th><td>${esc(p.cursoAcademico)||"—"}</td></tr>
      <tr><th>Fecha de inicio</th><td>${fmt2(p.fechaInicio)}</td></tr>
      <tr><th>Estado</th><td><span class="pill" style="background:${rpEstadoInfo(p.estado).color}1a;color:${rpEstadoInfo(p.estado).color}">${rpEstadoInfo(p.estado).label}</span></td></tr>
      <tr><th>Motivos de la no superación</th><td>${rfrpMotivosResumenHTML(p.motivos)}</td></tr>
      <tr><th>Medidas Nivel II</th><td>${rpMedidasResumenHTML(p.medidasNivelII,RP_MEDIDAS_II)}</td></tr>
      <tr><th>Medidas Nivel III</th><td>${rpMedidasResumenHTML(p.medidasNivelIII,RP_MEDIDAS_III)}</td></tr>
    </table>
    ${rfrpTrimBodyHTML(0,p.trimestres[0])}
    ${rfrpTrimBodyHTML(1,p.trimestres[1])}
    ${rfrpTrimBodyHTML(2,p.trimestres[2])}
    <h2>Valoración final del plan</h2>
    <p><span class="pill" style="background:${vfinal.color}1a;color:${vfinal.color}">${vfinal.label}</span></p>
    ${p.observacionesFinales?`<h2>Observaciones finales</h2><p style="white-space:pre-wrap;line-height:1.6">${esc(p.observacionesFinales)}</p>`:""}
    ${rfrpCeLegendPrintHTML()}
  `;
  const portada=generarPortadaHTML(`Plan de repetición — ${rpNombre(p)}`,
    [alV?`Alumno/a: <strong>${esc(alV.al.nombre)}</strong> · ${esc(alV.g.nombre)}`:`Alumno/a: <strong>${esc(p.alumnoNombre||"—")}</strong>`,
     p.cursoRepite?`Curso que repite: <strong>${esc(p.cursoRepite)}</strong>`:"",
     `Curso escolar: <strong>${esc(p.cursoAcademico||cursoEscolarEfectivo(null))}</strong>`,
     profesorNombreEfectivo(null)?`Elaborado por: <strong>${esc(profesorNombreEfectivo(null))}</strong>`:""],
    ["Motivos de la no superación","Medidas propuestas",TRIMESTRES[0],TRIMESTRES[1],TRIMESTRES[2],"Valoración final del plan",p.observacionesFinales?"Observaciones finales":"","Leyenda de competencias clave"]);
  abrirVentanaInforme(`Plan de repetición — ${rpNombre(p)}`, body, {portada});
};

/* ---------- Compartido: preparar el plan del curso siguiente ---------- */
function prepararModalHTML(){
  const {tipo,id}=state.ui.prepModal;
  const origen = tipo==="refuerzo" ? (state.planesRefuerzo||[]).find(x=>x.id===id) : (state.planesRepeticion||[]).find(x=>x.id===id);
  if(!origen) return "";
  const nombre = tipo==="refuerzo" ? rfNombre(origen) : rpNombre(origen);
  return `<div class="modal-overlay" onclick="if(event.target===this) cerrarPrepararModal()">
    <div class="modal-box" style="max-width:440px">
      <div class="flex" style="justify-content:space-between;align-items:flex-start">
        <h2 style="font-size:17px">Preparar el curso siguiente</h2>
        <button class="modal-close" onclick="cerrarPrepararModal()">×</button>
      </div>
      <p class="sub" style="margin-top:6px">Para <strong>${esc(nombre)}</strong>. Se crea un plan nuevo con el contexto de este curso; asígnalo al grupo del curso que viene en cuanto lo crees.</p>
      <div class="grid" style="gap:10px;margin-top:10px">
        <button class="btn" style="justify-self:stretch;text-align:left" onclick="crearPlanSiguienteCurso('repeticion')">🔁 Va a repetir curso → nuevo Plan de Repetición</button>
        <button class="ghost" style="border:1px solid var(--line);justify-self:stretch;text-align:left" onclick="crearPlanSiguienteCurso('refuerzo')">📈 Promociona pero necesita apoyo → nuevo Plan de Refuerzo</button>
      </div>
      <div class="flex" style="justify-content:flex-end;margin-top:16px">
        <button class="ghost" onclick="cerrarPrepararModal()">Cancelar</button>
      </div>
    </div>
  </div>`;
}
window.prepararSiguienteCurso=(tipo,id)=>{ state.ui.prepModal={tipo,id}; save(); render(); };
window.cerrarPrepararModal=()=>{ state.ui.prepModal=null; save(); render(); };
window.crearPlanSiguienteCurso=tipoDestino=>{
  const {tipo,id}=state.ui.prepModal;
  const origen = tipo==="refuerzo" ? (state.planesRefuerzo||[]).find(x=>x.id===id) : (state.planesRepeticion||[]).find(x=>x.id===id);
  if(!origen) return;
  const nombre = tipo==="refuerzo" ? rfNombre(origen) : rpNombre(origen);
  const obsPrevias=(origen.observacionesFinales||"").trim();
  const motivos=rfrpMotivosDefault();
  motivos.otros=true;
  motivos.otrosTexto=`Continuación del Plan de ${tipo==="refuerzo"?"Refuerzo":"Repetición"} del curso anterior.`+(obsPrevias?" Observaciones del curso anterior: "+obsPrevias:"");
  if(tipoDestino==="repeticion"){
    const p={ id:uid(), grupoId:"", alumnoId:"", alumnoNombre:nombre, cursoRepite:"", cursoAcademico:"",
      motivos, medidasNivelII:rpMedidasDefault(RP_MEDIDAS_II), medidasNivelIII:rpMedidasDefault(RP_MEDIDAS_III),
      fechaInicio:"", estado:"activo", trimestres:rfrpTrimestresIniciales(""), valoracionFinal:"",
      observacionesFinales:"", planOrigenId:id, planOrigenTipo:tipo };
    if(!Array.isArray(state.planesRepeticion)) state.planesRepeticion=[];
    state.planesRepeticion.push(p);
    state.ui.prepModal=null; state.ui.appMode="repeticion"; state.ui.rpTab="detalle"; state.ui.rpId=p.id;
  }else{
    const p={ id:uid(), grupoId:"", alumnoId:"", alumnoNombre:nombre, titulo:"Seguimiento — "+nombre, cursoAcademico:"",
      motivos, trimestres:rfrpTrimestresIniciales(""), fechaInicio:"", fechaFinPrevista:"", estado:"activo", seguimiento:[], valoracionFinal:"",
      observacionesFinales:"", planOrigenId:id, planOrigenTipo:tipo };
    if(!Array.isArray(state.planesRefuerzo)) state.planesRefuerzo=[];
    state.planesRefuerzo.push(p);
    state.ui.prepModal=null; state.ui.appMode="refuerzo"; state.ui.rfTab="detalle"; state.ui.rfId=p.id;
  }
  save(); render();
};

/* ---------- Preparar plan para el curso siguiente a un alumno SIN plan este año ---------- */
window.prepararNuevoAbrir=tipo=>{
  if(!state.grupos.length){ mostrarAviso("Crea primero un grupo con alumnado desde Evaluación por Competencias."); return; }
  state.ui.prepNuevoModal={tipo}; save(); render();
};
window.prepararNuevoCerrar=()=>{ state.ui.prepNuevoModal=null; save(); render(); };
function prepararNuevoModalHTML(){
  const {tipo}=state.ui.prepNuevoModal;
  const tituloTipo=tipo==="repeticion"?"Plan de Repetición":"Plan de Refuerzo";
  return `<div class="modal-overlay" onclick="if(event.target===this) prepararNuevoCerrar()">
    <div class="modal-box" style="max-width:460px">
      <div class="flex" style="justify-content:space-between;align-items:flex-start">
        <h2 style="font-size:17px">Preparar ${tituloTipo} para el curso siguiente</h2>
        <button class="modal-close" onclick="prepararNuevoCerrar()">×</button>
      </div>
      <p class="sub" style="margin-top:6px">Para un alumno/a de este curso que <strong>no tiene plan ahora mismo</strong>, pero lo va a necesitar el año que viene (por ejemplo, promociona con la materia suspendida). El plan se crea vacío y sin grupo asignado — el del curso que viene todavía no existe — para que puedas ir dejando preparados los objetivos por evaluación desde ya, e imprimirlo para quien lo tenga el año próximo.</p>
      <div class="grid" style="gap:10px;margin-top:10px">
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Grupo (de este curso)
          <select class="in" style="width:100%;margin-top:4px" id="prepNGrupo" onchange="prepararNuevoRefrescarAlumno()">
            <option value="">Elige un grupo…</option>
            ${state.grupos.map(g=>`<option value="${g.id}">${esc(g.nombre)}</option>`).join("")}
          </select>
        </label>
        <div id="prepNAlumnoWrap"></div>
      </div>
      <div class="flex" style="justify-content:flex-end;margin-top:18px">
        <button class="ghost" onclick="prepararNuevoCerrar()">Cancelar</button>
        <button class="btn" onclick="prepararNuevoCrear()">Crear plan</button>
      </div>
    </div>
  </div>`;
}
window.prepararNuevoRefrescarAlumno=()=>{
  const gid=document.getElementById("prepNGrupo").value;
  const wrap=document.getElementById("prepNAlumnoWrap");
  const g=state.grupos.find(x=>x.id===gid);
  if(!g||!g.alumnos.length){ wrap.innerHTML=g?'<p class="sub" style="margin:0">Este grupo no tiene alumnado todavía.</p>':""; return; }
  wrap.innerHTML=`<label style="font-size:12.5px;color:var(--mut);font-weight:500">Alumno/a
    <select class="in" style="width:100%;margin-top:4px" id="prepNAlumno">
      ${g.alumnos.map(al=>`<option value="${al.id}">${esc(al.nombre)}</option>`).join("")}
    </select>
  </label>`;
};
window.prepararNuevoCrear=()=>{
  const {tipo}=state.ui.prepNuevoModal;
  const gid=document.getElementById("prepNGrupo").value;
  const alId=document.getElementById("prepNAlumno")?.value;
  if(!gid||!alId){ mostrarAviso("Elige grupo y alumno/a."); return; }
  const g=state.grupos.find(x=>x.id===gid); const al=g.alumnos.find(x=>x.id===alId);
  const nombre=al.nombre;
  const motivos=rfrpMotivosDefault();
  motivos.otros=true; motivos.otrosTexto="Plan preparado de cara al curso siguiente.";
  if(tipo==="repeticion"){
    const p={ id:uid(), grupoId:"", alumnoId:"", alumnoNombre:nombre, cursoRepite:"", cursoAcademico:"",
      motivos, medidasNivelII:rpMedidasDefault(RP_MEDIDAS_II), medidasNivelIII:rpMedidasDefault(RP_MEDIDAS_III),
      fechaInicio:"", estado:"activo", trimestres:rfrpTrimestresIniciales(""), valoracionFinal:"",
      observacionesFinales:"", planOrigenId:"", planOrigenTipo:"" };
    if(!Array.isArray(state.planesRepeticion)) state.planesRepeticion=[];
    state.planesRepeticion.push(p);
    state.ui.prepNuevoModal=null; state.ui.appMode="repeticion"; state.ui.rpTab="detalle"; state.ui.rpId=p.id;
  }else{
    const p={ id:uid(), grupoId:"", alumnoId:"", alumnoNombre:nombre, titulo:"Seguimiento — "+nombre, cursoAcademico:"",
      motivos, trimestres:rfrpTrimestresIniciales(""), fechaInicio:"", fechaFinPrevista:"", estado:"activo", seguimiento:[], valoracionFinal:"",
      observacionesFinales:"", planOrigenId:"", planOrigenTipo:"" };
    if(!Array.isArray(state.planesRefuerzo)) state.planesRefuerzo=[];
    state.planesRefuerzo.push(p);
    state.ui.prepNuevoModal=null; state.ui.appMode="refuerzo"; state.ui.rfTab="detalle"; state.ui.rfId=p.id;
  }
  save(); render();
};
