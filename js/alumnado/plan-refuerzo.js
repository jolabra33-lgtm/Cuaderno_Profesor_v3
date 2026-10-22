/* ============================================================================
   Cuaderno del profesor · Plan de refuerzo: seguimiento individualizado
   js/alumnado/plan-refuerzo.js
   ============================================================================ */

/* =================================================================
   PLAN DE REFUERZO — seguimiento individualizado de alumnado con
   medidas de refuerzo/apoyo: objetivos, medidas aplicadas y un
   diario de seguimiento fechado. Vive en state.planesRefuerzo
   (top-level, se incluye solo con Exportar/Importar copia).
   ================================================================= */
const RF_ESTADOS=[
  {id:"activo",label:"Activo",color:"#2563eb"},
  {id:"pausado",label:"Pausado",color:"#b45309"},
  {id:"superado",label:"Superado",color:"#16a34a"},
  {id:"no_superado",label:"No superado",color:"#dc2626"}
];
const RF_VALORACIONES=[
  {id:"positiva",label:"Positiva",color:"#16a34a"},
  {id:"neutra",label:"Neutra",color:"#64748b"},
  {id:"preocupante",label:"Preocupante",color:"#dc2626"}
];
function rfEstadoInfo(id){ return RF_ESTADOS.find(e=>e.id===id)||RF_ESTADOS[0]; }
function rfValoracionInfo(id){ return RF_VALORACIONES.find(v=>v.id===id)||RF_VALORACIONES[1]; }
function rfAlumno(p){ const g=state.grupos.find(x=>x.id===p.grupoId); if(!g) return null; const al=g.alumnos.find(x=>x.id===p.alumnoId); return al?{al,g}:null; }
function rfNombre(p){ const alV=rfAlumno(p); return alV?alV.al.nombre:(p.alumnoNombre||"(sin asignar)"); }
/* Orden académico de un grupo a partir de su nombre: nivel educativo
   (Primaria < ESO < FPB < Bachillerato) y, dentro de cada nivel, el
   número de curso. Se usa para listar Planes de Refuerzo/Repetición
   agrupados por curso en vez de por fecha. */
const RFRP_NIVEL_ORDEN={"primaria":0,"eso":1,"fpb":2,"bachillerato":3};
function rfrpOrdenCursoGrupo(g){
  if(!g) return 999;
  const t=normalizarTexto(g.nombre||"");
  const m=t.match(/(\d+)\s*(?:er|do|to|º|o|\.)?\s*(primaria|eso|fpb|bachillerato|bach)/);
  if(!m) return 999;
  const num=parseInt(m[1],10)||0;
  const nivel=m[2]==="bach"?"bachillerato":m[2];
  const rango=RFRP_NIVEL_ORDEN[nivel];
  return (rango===undefined?9:rango)*10+num;
}
function rfrpComparaPorCurso(pa,pb,alumnoFn,nombreFn){
  const gA=(alumnoFn(pa)||{}).g, gB=(alumnoFn(pb)||{}).g;
  const oa=rfrpOrdenCursoGrupo(gA), ob=rfrpOrdenCursoGrupo(gB);
  if(oa!==ob) return oa-ob;
  const cmpGrupo=collatorEs.compare(gA?gA.nombre:"", gB?gB.nombre:"");
  if(cmpGrupo) return cmpGrupo;
  return collatorEs.compare(nombreFn(pa), nombreFn(pb));
}
function rfListaFiltrada(){
  const f=state.ui.rfFiltroEstado, q=(state.ui.rfBusqueda||"").toLowerCase().trim();
  return (state.planesRefuerzo||[]).filter(p=>{
    if(f && p.estado!==f) return false;
    if(q){ const alV=rfAlumno(p); const texto=normalizarTexto((p.titulo||"")+" "+(alV?alV.al.nombre:"")); if(!texto.includes(normalizarTexto(q))) return false; }
    return true;
  }).sort((a,b)=>rfrpComparaPorCurso(a,b,rfAlumno,rfNombre));
}
window.rfTab=k=>{ state.ui.rfTab=k; if(k==="lista") state.ui.rfId=""; save(); render(); };
window.rfIrLista=()=>{ state.ui.rfTab="lista"; state.ui.rfId=""; save(); render(); };
window.rfAbrirDetalle=id=>{ state.ui.rfTab="detalle"; state.ui.rfId=id; save(); render(); };
window.rfAbrirDesdeOtroModo=id=>{ state.ui.appMode="refuerzo"; state.ui.rfTab="detalle"; state.ui.rfId=id; save(); render(); };
window.rfSetFiltroEstado=v=>{ state.ui.rfFiltroEstado=v; save(); render(); };
window.rfSetBusqueda=v=>{ state.ui.rfBusqueda=v; save(); render(); };
window.rfAbrirModalNueva=()=>{ if(!state.grupos.length){ mostrarAviso("Crea primero un grupo con alumnado desde Evaluación por Competencias."); return; } state.ui.rfModalNueva=true; save(); render(); };
window.rfCerrarModalNueva=()=>{ state.ui.rfModalNueva=false; save(); render(); };

function renderRefuerzoApp(){
  const app=document.getElementById("app");
  app.innerHTML=`<div class="card" style="padding:12px 16px">
    <div class="flex" style="justify-content:space-between">
      <div><strong style="font-size:15px">📈 Plan de Refuerzo</strong><span style="color:var(--mut);font-size:13px"> · seguimiento individualizado</span></div>
      <button class="ghost" style="border:1px solid var(--line)" onclick="irInicio()">🏠 Inicio</button>
    </div>
  </div><div id="rfRoot"></div>`;
  const root=document.getElementById("rfRoot");
  if(state.ui.rfTab==="detalle" && state.ui.rfId && (state.planesRefuerzo||[]).find(p=>p.id===state.ui.rfId)){
    renderRfDetalleHTML(root);
  }else{
    renderRfListaHTML(root);
  }
  if(state.ui.rfModalNueva){ root.insertAdjacentHTML("beforeend", rfRenderModalNuevaHTML()); rfRefrescarAlumnoSel(); }
  if(state.ui.prepModal) root.insertAdjacentHTML("beforeend", prepararModalHTML());
  if(state.ui.prepNuevoModal) root.insertAdjacentHTML("beforeend", prepararNuevoModalHTML());
  if(state.ui.rfModalElegirCE) root.insertAdjacentHTML("beforeend", rfModalElegirCEHTML());
}

function renderRfListaHTML(root){
  const lista=rfListaFiltrada();
  const total=(state.planesRefuerzo||[]).length;
  const activos=(state.planesRefuerzo||[]).filter(p=>p.estado==="activo").length;
  const filas = lista.length? lista.map(p=>{
    const info=rfEstadoInfo(p.estado);
    const alV=rfAlumno(p);
    const ultimo=(p.seguimiento||[]).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha))[0];
    return `<div class="card" style="cursor:pointer;padding:16px 18px" onclick="rfAbrirDetalle('${p.id}')">
      <div class="flex" style="justify-content:space-between;align-items:flex-start">
        <div style="min-width:0">
          <span class="pill" style="background:${info.color}1a;color:${info.color};margin-bottom:6px">${info.label}</span>
          <div style="font-size:15px;font-weight:700">${esc(p.titulo||"Sin título")}</div>
          <div style="font-size:12.5px;color:var(--mut);margin-top:2px">${esc(rfNombre(p))}${alV?neseBadgeHTML(alV.al)+" · "+esc(alV.g.nombre):" · pendiente de asignar"}</div>
          <div style="font-size:12.5px;color:var(--mut);margin-top:6px">${p.fechaInicio?"Desde "+fmt2(p.fechaInicio):""}${ultimo?" · último seguimiento "+fmt2(ultimo.fecha):""}</div>
        </div>
        <span class="badge">${(p.seguimiento||[]).length} entrada${(p.seguimiento||[]).length===1?"":"s"}</span>
      </div>
    </div>`;
  }).join("") : `<div class="card" style="text-align:center;padding:34px 18px">
    <div style="font-size:34px;margin-bottom:8px;opacity:.8">📈</div>
    <p class="sub" style="margin:0">${total===0?"Todavía no has creado ningún plan de refuerzo.":"Sin resultados con este filtro/búsqueda."}</p>
    ${total===0?'<button class="btn small" style="margin-top:12px" onclick="rfAbrirModalNueva()">+ Crear el primero</button>':""}
  </div>`;

  root.innerHTML=`
  <div class="card">
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
      <div class="flex" style="gap:16px">
        <div><div class="big" style="font-size:24px">${total}</div><div class="sub" style="margin:0">Total</div></div>
        <div><div class="big" style="font-size:24px">${activos}</div><div class="sub" style="margin:0">Activos</div></div>
      </div>
      <div class="flex">
        <button class="ghost" style="border:1px solid var(--line)" onclick="prepararNuevoAbrir('refuerzo')" title="Prepara un plan para un alumno/a que este año no tiene plan, de cara al curso que viene">📅 Preparar curso siguiente</button>
        <button class="btn" onclick="rfAbrirModalNueva()">+ Nuevo plan</button>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="flex">
      <input class="in" style="flex:1;min-width:180px" placeholder="Buscar por alumno o título…" id="rfBusquedaInput" value="${esc(state.ui.rfBusqueda||"")}">
      <select class="in" id="rfFiltroInput">
        <option value="">Todos los estados</option>
        ${RF_ESTADOS.map(e=>`<option value="${e.id}" ${state.ui.rfFiltroEstado===e.id?"selected":""}>${e.label}</option>`).join("")}
      </select>
    </div>
  </div>
  <div class="grid" style="gap:10px">${filas}</div>`;
  document.getElementById("rfBusquedaInput").addEventListener("input",e=>{ rfSetBusqueda(e.target.value); });
  document.getElementById("rfFiltroInput").addEventListener("change",e=>{ rfSetFiltroEstado(e.target.value); });
}

function rfRenderModalNuevaHTML(){
  return `
  <div class="modal-overlay" onclick="if(event.target===this) rfCerrarModalNueva()">
    <div class="modal-box" style="max-width:460px">
      <div class="flex" style="justify-content:space-between;align-items:flex-start">
        <h2 style="font-size:17px">Nuevo plan de refuerzo</h2>
        <button class="modal-close" onclick="rfCerrarModalNueva()">×</button>
      </div>
      <p class="sub" style="margin-top:6px">Para un alumno/a que promociona con la materia no superada. Los motivos, los elementos no conseguidos y la evaluación se completan en el detalle del plan.</p>
      <div class="grid" style="gap:12px;margin-top:6px">
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Grupo
          <select class="in" style="width:100%;margin-top:4px" id="rfNGrupo" onchange="rfRefrescarAlumnoSel()">
            ${state.grupos.map(g=>`<option value="${g.id}">${esc(g.nombre)}</option>`).join("")}
          </select>
        </label>
        <div id="rfNAlumnoWrap"></div>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Curso académico
          <input class="in" style="width:100%;margin-top:4px" id="rfNCursoAcademico" placeholder="2026-2027">
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Fecha de inicio
          <input class="in" style="width:100%;margin-top:4px" type="date" id="rfNFecha" value="${agHoyStr()}">
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Curso no superado (modelo del departamento, opcional)
          <select class="in" style="width:100%;margin-top:4px" id="rfNModelo">
            <option value="">Sin modelo — plan en blanco</option>
            <option value="1">1.º ESO</option>
            <option value="2">2.º ESO</option>
            <option value="3">3.º ESO</option>
          </select>
        </label>
        <p class="sub" style="margin:-4px 0 0;font-size:11.5px">Rellena las tres evaluaciones con las competencias específicas, criterios de evaluación, saberes básicos y competencias clave no conseguidas del curso <strong>suspendido</strong> (el anterior al de matrícula actual), más el dossier de actividades por defecto. Queda todo editable después.</p>
      </div>
      <div class="flex" style="justify-content:flex-end;margin-top:18px">
        <button class="ghost" onclick="rfCerrarModalNueva()">Cancelar</button>
        <button class="btn" onclick="rfCrearPlan()">Crear</button>
      </div>
    </div>
  </div>`;
}
window.rfRefrescarAlumnoSel=()=>{
  const gid=document.getElementById("rfNGrupo").value;
  const wrap=document.getElementById("rfNAlumnoWrap");
  const g=state.grupos.find(x=>x.id===gid);
  if(!g || !g.alumnos.length){ wrap.innerHTML='<p class="sub" style="margin:0">Este grupo no tiene alumnado todavía.</p>'; return; }
  wrap.innerHTML=`<label style="font-size:12.5px;color:var(--mut);font-weight:500">Alumno/a
    <select class="in" style="width:100%;margin-top:4px" id="rfNAlumno">
      ${g.alumnos.map(al=>`<option value="${al.id}">${esc(al.nombre)}</option>`).join("")}
    </select>
  </label>`;
};
window.rfCrearPlan=()=>{
  const grupoId=document.getElementById("rfNGrupo").value;
  const alumnoId=document.getElementById("rfNAlumno")?.value;
  if(!alumnoId){ mostrarAviso("Este grupo no tiene alumnado."); return; }
  const g=state.grupos.find(x=>x.id===grupoId); const al=g.alumnos.find(x=>x.id===alumnoId);
  const cursoAcademico=document.getElementById("rfNCursoAcademico").value.trim();
  const fechaInicio=document.getElementById("rfNFecha").value;
  const nivelModelo=document.getElementById("rfNModelo").value;
  const trimestres=rfrpTrimestresIniciales(nivelModelo);
  const p={ id:uid(), grupoId, alumnoId, alumnoNombre:al.nombre, titulo:"Refuerzo — "+al.nombre, cursoAcademico,
    motivos:rfrpMotivosDefault(), trimestres, valoracionFinal:"",
    fechaInicio, fechaFinPrevista:"", estado:"activo", seguimiento:[], observacionesFinales:"", planOrigenId:"", planOrigenTipo:"" };
  if(!Array.isArray(state.planesRefuerzo)) state.planesRefuerzo=[];
  state.planesRefuerzo.push(p);
  state.ui.rfModalNueva=false; state.ui.rfTab="detalle"; state.ui.rfId=p.id;
  save(); render();
};

function rfrpTablaCEHTML(tipo,trimIdx,gruposCE){
  let filas="";
  (gruposCE||[]).forEach((g,gi)=>{
    const n=g.criterios.length;
    if(n===0){
      filas+=`<tr>
        <td class="rfrp-td-ce"><input class="in" style="width:100%;font-weight:700" placeholder="CE" value="${esc(g.ce||"")}" onchange="rfrpSetGrupoCampo('${tipo}',${trimIdx},${gi},'ce',this.value)"></td>
        <td class="rfrp-td-ce"><input class="in" style="width:100%" placeholder="Comp. clave" value="${esc(g.cc||"")}" onchange="rfrpSetGrupoCampo('${tipo}',${trimIdx},${gi},'cc',this.value)"></td>
        <td colspan="2" style="color:var(--mut);font-style:italic">Sin criterios en esta competencia.</td>
      </tr>`;
    }else{
      g.criterios.forEach((c,ci)=>{
        filas+="<tr>";
        if(ci===0){
          filas+=`<td class="rfrp-td-ce" rowspan="${n}"><input class="in" style="width:100%;font-weight:700" placeholder="CE" value="${esc(g.ce||"")}" onchange="rfrpSetGrupoCampo('${tipo}',${trimIdx},${gi},'ce',this.value)"></td>
          <td class="rfrp-td-ce" rowspan="${n}"><input class="in" style="width:100%" placeholder="Comp. clave" value="${esc(g.cc||"")}" onchange="rfrpSetGrupoCampo('${tipo}',${trimIdx},${gi},'cc',this.value)"></td>`;
        }
        filas+=`<td><textarea class="rfrp-criterio-texto" placeholder="Criterio de evaluación no conseguido…" onchange="rfrpSetCriterioTexto('${tipo}',${trimIdx},${gi},${ci},this.value)">${esc(c.texto||"")}</textarea></td>
          <td style="text-align:center;white-space:nowrap"><input type="checkbox" ${c.trabajado?"checked":""} onchange="rfrpToggleCriterioTrabajado('${tipo}',${trimIdx},${gi},${ci},this.checked)"> <button class="ghost danger small" style="margin-left:2px" onclick="rfrpQuitarCriterioEnGrupo('${tipo}',${trimIdx},${gi},${ci})">✕</button></td>
        </tr>`;
      });
    }
    filas+=`<tr class="rfrp-fila-acciones"><td colspan="4">
      <button class="ghost small" onclick="rfrpAnadirCriterioEnGrupo('${tipo}',${trimIdx},${gi})">+ Añadir criterio a ${esc(g.ce)||"esta CE"}</button>
      <button class="ghost danger small" onclick="rfrpQuitarGrupoCE('${tipo}',${trimIdx},${gi})">Quitar esta competencia específica</button>
    </td></tr>`;
  });
  return `<div style="overflow-x:auto"><table class="rfrp-tabla-ce">
    <colgroup><col style="width:70px"><col style="width:150px"><col><col style="width:90px"></colgroup>
    <thead><tr><th>CE</th><th>Comp. clave</th><th>Criterio de evaluación no conseguido</th><th>Trabajado</th></tr></thead>
    <tbody>${filas||'<tr><td colspan="4" style="color:var(--mut);font-style:italic">Sin competencias específicas añadidas.</td></tr>'}</tbody>
  </table></div>
  <button class="ghost" style="border:1px solid var(--line);margin-top:8px" onclick="rfrpAnadirGrupoCE('${tipo}',${trimIdx})">+ Añadir competencia específica</button>`;
}
function renderRfDetalleHTML(root){
  const p=(state.planesRefuerzo||[]).find(x=>x.id===state.ui.rfId);
  if(!Array.isArray(p.trimestres) || p.trimestres.length!==3) p.trimestres=rfrpTrimestresIniciales("");
  if(!p.motivos) p.motivos=rfrpMotivosDefault();
  if(p.valoracionFinal===undefined) p.valoracionFinal="";
  if(p.cursoAcademico===undefined) p.cursoAcademico="";
  if(p.cursoRefuerzaCatalogoKey===undefined) p.cursoRefuerzaCatalogoKey="";
  const alV=rfAlumno(p);
  const catalogoCursoKey=rfCatalogoParaCursoRefuerza(p);
  const referenciaCurricularHTML=catalogoCursoKey?`<div class="card">${referenciaCurricularTablaHTML(catalogoCursoKey,true)}
    <p class="sub" style="margin-top:8px">Currículo cargado automáticamente a partir del curso y la materia a reforzar. Usa el botón «🔍 Elegir de las competencias cargadas» en cada evaluación para marcar cuáles no se han conseguido: se añaden solas a la tabla, sin tener que escribirlas a mano. No se imprime en el informe.</p>
  </div>`:"";
  const motivosHTML=`<div class="card">
    <h2 style="font-size:15px">Motivos de la no superación de la materia</h2>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;max-width:760px;margin-top:8px">
      ${RFRP_MOTIVOS.map(m=>`<label class="row" style="cursor:pointer;gap:8px">
        <input type="checkbox" ${p.motivos[m.id]?"checked":""} onchange="rfSetMotivo('${m.id}',this.checked)">
        <span style="font-size:13.5px">${m.label}</span>
      </label>`).join("")}
    </div>
    ${p.motivos.otros?`<textarea class="in" style="width:100%;margin-top:8px;min-height:50px;resize:vertical" id="rfDMotivoOtros" placeholder="Explica el motivo…">${esc(p.motivos.otrosTexto||"")}</textarea>`:""}
  </div>`;
  const trimestreHTML=(idx)=>{
    const trim=p.trimestres[idx];
    const actividadesHtml=(trim.actividades||[]).map((t,i)=>`
      <div class="flex" style="margin-bottom:6px;align-items:flex-start">
        <span class="badge" style="flex-shrink:0;margin-top:9px">✓</span>
        <textarea class="rfrp-criterio-texto" style="flex:1" placeholder="Actividad de evaluación…" onchange="rfrpSetActividad('rf',${idx},${i},this.value)">${esc(t||"")}</textarea>
        <button class="ghost danger" style="margin-top:4px" onclick="rfrpQuitarActividad('rf',${idx},${i})">✕</button>
      </div>`).join("");
    const vinfo=rfrpValoracionPNInfo(trim.valoracion);
    return `<div class="card">
      <h2 style="font-size:15px">${TRIMESTRES[idx]}</h2>
      <div class="section-eyebrow" style="margin-top:8px">Competencias específicas, criterios de evaluación y competencias clave no conseguidas</div>
      ${catalogoCursoKey?`<button class="ghost" style="border:1px solid var(--line);margin-bottom:8px" onclick="rfAbrirModalElegirCE(${idx})">🔍 Elegir de las competencias cargadas</button>`
        :`<p class="sub" style="margin:0 0 8px">Selecciona arriba el curso y la materia a reforzar para poder elegirlas de una lista en vez de escribirlas a mano.</p>`}
      ${rfrpTablaCEHTML("rf",idx,trim.gruposCE)}
      <div class="section-eyebrow" style="margin-top:16px">Actividades de evaluación</div>
      <div>${actividadesHtml}</div>
      <button class="ghost" style="border:1px solid var(--line);margin-top:4px" onclick="rfrpAnadirActividad('rf',${idx})">+ Añadir actividad</button>
      <div class="flex" style="margin-top:14px">
        <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1">Calificación obtenida
          <input class="in" style="width:100%;margin-top:4px" placeholder="Ej. 6" value="${esc(trim.calificacion||"")}" onchange="rfrpSetTrimCampo('rf',${idx},'calificacion',this.value)">
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1">Valoración de ${TRIMESTRES[idx].toLowerCase()}
          <select class="in" style="width:100%;margin-top:4px;color:${vinfo.color}" onchange="rfrpSetTrimCampo('rf',${idx},'valoracion',this.value)">
            ${RFRP_VALORACION_PN.map(v=>`<option value="${v.id}" ${trim.valoracion===v.id?"selected":""}>${v.label}</option>`).join("")}
          </select>
        </label>
      </div>
      <label style="font-size:12.5px;color:var(--mut);font-weight:500;display:block;margin-top:10px">Justificación de la valoración
        <textarea class="in" style="width:100%;margin-top:4px;min-height:56px;resize:vertical" placeholder="Por qué esta valoración…" onchange="rfrpSetTrimCampo('rf',${idx},'justificacion',this.value)">${esc(trim.justificacion||"")}</textarea>
      </label>
    </div>`;
  };
  const seguimientoOrdenado=(p.seguimiento||[]).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const seguimientoHtml=seguimientoOrdenado.length? seguimientoOrdenado.map(s=>{
    const v=rfValoracionInfo(s.valoracion);
    return `<div class="row" style="align-items:flex-start;flex-direction:column;gap:4px">
      <div class="flex" style="justify-content:space-between;width:100%">
        <div class="flex" style="gap:8px"><strong style="font-size:13px">${fmt2(s.fecha)}</strong><span class="pill" style="background:${v.color}1a;color:${v.color};font-size:11px">${v.label}</span></div>
        <button class="ghost danger small" onclick="rfQuitarSeguimiento('${s.id}')">Eliminar</button>
      </div>
      <div style="font-size:13.5px;white-space:pre-wrap">${esc(s.nota||"")}</div>
    </div>`;
  }).join("") : '<p class="sub" style="margin:0">Todavía no hay entradas de seguimiento.</p>';
  const reunionesRelacionadas=(state.reuniones||[]).filter(r=>r.alumnoId===p.alumnoId && p.alumnoId);
  const vfinal=rfrpValoracionPNInfo(p.valoracionFinal);
  root.innerHTML=`
  <div class="card">
    <div class="flex" style="justify-content:space-between;flex-wrap:wrap;gap:10px">
      <button class="ghost" style="border:1px solid var(--line)" onclick="rfIrLista()">← Planes de refuerzo</button>
      <div class="flex">
        <select class="in" id="rfDEstado" style="font-weight:600">${RF_ESTADOS.map(e=>`<option value="${e.id}" ${p.estado===e.id?"selected":""}>${e.label}</option>`).join("")}</select>
        <button class="ghost" style="border:1px solid var(--line)" onclick="prepararSiguienteCurso('refuerzo','${p.id}')" title="Crear el plan del curso que viene para este alumno/a">➜ Preparar curso siguiente</button>
        <button class="btn" onclick="rfImprimirInforme('${p.id}')">🖨️ Imprimir informe</button>
        <button class="ghost danger" onclick="rfEliminarPlan('${p.id}')">Eliminar</button>
      </div>
    </div>
    ${!alV?`<div class="alert-box" style="align-items:flex-start;flex-direction:column;gap:8px;margin-top:14px">
      <div>👤 <strong>${esc(p.alumnoNombre||"Sin asignar")}</strong> — pendiente de asignar a un grupo de este curso.</div>
      <div class="flex" style="width:100%">
        <select class="in" id="rfReasignGrupo" style="flex:1" onchange="rfRefrescarReasignAlumno()">
          <option value="">Elige un grupo…</option>
          ${state.grupos.map(g=>`<option value="${g.id}">${esc(g.nombre)}</option>`).join("")}
        </select>
        <span id="rfReasignAlumnoWrap" style="flex:1"></span>
        <button class="btn small" onclick="rfConfirmarReasignacion('${p.id}')">Asignar</button>
      </div>
    </div>`:""}
    ${p.planOrigenId?`<p class="sub" style="margin:10px 0 0">➜ Continuación de un plan de ${p.planOrigenTipo==="repeticion"?"repetición":"refuerzo"} del curso anterior.</p>`:""}
    <div class="grid" style="gap:12px;margin-top:14px">
      <div style="font-size:14px"><strong>${esc(rfNombre(p))}</strong>${alV?neseBadgeHTML(alV.al)+planBadgeHTML(alV.al)+repetidorBadgeHTML(alV.al)+` <span class="sub">· ${esc(alV.g.nombre)}</span>`:""}</div>
      <label style="font-size:12.5px;color:var(--mut);font-weight:500">Título del plan
        <input class="in" style="width:100%;margin-top:4px;font-size:15px;font-weight:600" id="rfDTitulo" value="${esc(p.titulo||"")}">
      </label>
      <label style="font-size:12.5px;color:var(--mut);font-weight:500">Curso y materia a reforzar
        <select class="in" style="width:100%;margin-top:4px;font-size:15px;font-weight:600" id="rfDCurso" onchange="rfSetCursoRefuerzaCatalogo(this.value)">
          <option value="" ${!catalogoCursoKey?"selected":""}>${(!catalogoCursoKey && p.cursoRefuerza)?"— "+esc(p.cursoRefuerza)+" (elige de la lista) —":"— Selecciona curso y materia —"}</option>
          ${catalogoSelectOptionsHTML(catalogoCursoKey||"",materiaDelGrupo(p.grupoId))}
        </select>
      </label>
      <div class="flex" style="align-items:center;gap:8px;flex-wrap:wrap">
        ${catalogoCursoKey?`<span class="sub" style="margin:0">📘 ${esc(getCatalogo(catalogoCursoKey).materia)} · <strong>${esc(getCatalogo(catalogoCursoKey).curso)}</strong> — currículo cargado más abajo.</span>`
        :`<span class="sub" style="margin:0">Elige el curso y la materia a reforzar para cargar sus competencias, criterios y saberes básicos.</span>`}
      </div>
      <div class="flex">
        <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1">Curso académico
          <input class="in" style="width:100%;margin-top:4px" id="rfDCursoAcademico" value="${esc(p.cursoAcademico||"")}" placeholder="2026-2027">
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1">Fecha de inicio
          <input class="in" style="width:100%;margin-top:4px" type="date" id="rfDFechaInicio" value="${p.fechaInicio||""}">
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1">Fin previsto (opcional)
          <input class="in" style="width:100%;margin-top:4px" type="date" id="rfDFechaFin" value="${p.fechaFinPrevista||""}">
        </label>
      </div>
  </div>
  ${referenciaCurricularHTML}
  ${motivosHTML}
  ${trimestreHTML(0)}
  ${trimestreHTML(1)}
  ${trimestreHTML(2)}
  ${rfrpCeLegendHTML()}
  <div class="card">
    <h2 style="font-size:15px">Valoración final del plan</h2>
    <select class="in" style="max-width:260px;color:${vfinal.color};font-weight:600" onchange="rfrpSetValoracionFinal('rf',this.value)">
      ${RFRP_VALORACION_PN.map(v=>`<option value="${v.id}" ${p.valoracionFinal===v.id?"selected":""}>${v.label}</option>`).join("")}
    </select>
  </div>
  <div class="card">
    <h2 style="font-size:15px">Seguimiento</h2>
    <div class="card" style="background:var(--surface)">
      <div class="grid" style="gap:8px">
        <textarea class="in" id="rfSegNota" placeholder="Anotación de seguimiento…" style="min-height:60px;resize:vertical"></textarea>
        <div class="flex">
          <input class="in" type="date" id="rfSegFecha" value="${agHoyStr()}" style="flex:1">
          <select class="in" id="rfSegValoracion" style="flex:1">${RF_VALORACIONES.map(v=>`<option value="${v.id}">${v.label}</option>`).join("")}</select>
          <button class="btn small" onclick="rfAnadirSeguimiento('${p.id}')">+ Añadir entrada</button>
        </div>
      </div>
    </div>
    <div class="grid" style="gap:8px;margin-top:10px">${seguimientoHtml}</div>

    <h2 style="font-size:15px;margin-top:22px">Observaciones finales</h2>
    <textarea class="in" style="width:100%;min-height:70px;resize:vertical" id="rfDObservaciones" placeholder="Valoración de cierre del plan (cuando proceda)…">${esc(p.observacionesFinales||"")}</textarea>

    ${reunionesRelacionadas.length?`<h2 style="font-size:15px;margin-top:22px">Reuniones relacionadas con este alumno</h2>
      <div class="grid" style="gap:6px">
        ${reunionesRelacionadas.map(r=>`<div class="ag-evento" onclick="reAbrirDesdeOtroModo('${r.id}')">
          <div class="ag-evento-info"><div class="ag-evento-titulo">${esc(r.titulo)}</div><div class="ag-evento-grupo">${reTipoInfo(r.tipo).label}${r.fecha?" · "+fmt2(r.fecha):""}</div></div>
        </div>`).join("")}
      </div>`:""}
  </div>`;
  const campo=(id,fn)=>document.getElementById(id).addEventListener("change",e=>{ fn(e.target.value); save(); });
  campo("rfDEstado",v=>p.estado=v);
  campo("rfDTitulo",v=>p.titulo=v.trim()||p.titulo);
  campo("rfDCursoAcademico",v=>p.cursoAcademico=v.trim());
  campo("rfDFechaInicio",v=>p.fechaInicio=v);
  campo("rfDFechaFin",v=>p.fechaFinPrevista=v);
  campo("rfDObservaciones",v=>p.observacionesFinales=v);
  if(document.getElementById("rfDMotivoOtros")) campo("rfDMotivoOtros",v=>p.motivos.otrosTexto=v);
}
window.rfSetMotivo=(id,checked)=>{
  const p=(state.planesRefuerzo||[]).find(x=>x.id===state.ui.rfId);
  p.motivos[id]=checked; save(); render();
};
/* Al elegir en el desplegable el curso y la materia a reforzar, guarda la
   clave exacta del catálogo y el texto del curso para mostrarlo en
   cabeceras e informes. No toca la tabla de competencias: eso se hace
   aparte, a demanda, con el selector emergente de cada evaluación. */
window.rfSetCursoRefuerzaCatalogo=(key)=>{
  const p=(state.planesRefuerzo||[]).find(x=>x.id===state.ui.rfId); if(!p) return;
  p.cursoRefuerzaCatalogoKey=key||"";
  const cat=key?getCatalogo(key):null;
  p.cursoRefuerza=cat?cat.curso:"";
  save(); render();
};
/* ---- Selector emergente de competencias específicas / criterios / saberes
   básicos no conseguidos, a partir del catálogo ya cargado, para una
   evaluación concreta de un Plan de Refuerzo (igual que el de Repetición). ---- */
window.rfAbrirModalElegirCE=(trimIdx)=>{
  const p=(state.planesRefuerzo||[]).find(x=>x.id===state.ui.rfId); if(!p) return;
  if(!rfCatalogoParaCursoRefuerza(p)){ mostrarAviso("Elige primero, arriba, el curso y la materia a reforzar."); return; }
  state.ui.rfModalElegirCE={trimIdx};
  save(); render();
};
window.rfCerrarModalElegirCE=()=>{ state.ui.rfModalElegirCE=null; save(); render(); };
function rfModalElegirCEHTML(){
  const {trimIdx}=state.ui.rfModalElegirCE;
  const p=(state.planesRefuerzo||[]).find(x=>x.id===state.ui.rfId); if(!p) return "";
  const key=rfCatalogoParaCursoRefuerza(p); if(!key) return "";
  const idx=catIndex(key); const cat=idx.cat;
  const saberes=progSaberesDelCatalogo(key)||{};
  const trim=p.trimestres[trimIdx];
  const marcados=new Set();
  (trim.gruposCE||[]).forEach(g=>(g.criterios||[]).forEach(c=>{ if(c.id) marcados.add(c.id); }));
  const bloques=cat.ces.map(ce=>{
    const sab=saberes[ce.id]||[];
    const filasCrit=ce.criterios.map(c=>`
      <label class="row" style="cursor:pointer;gap:8px;align-items:flex-start;padding:4px 0">
        <input type="checkbox" class="rfElegirCrit" data-ce="${esc(ce.id)}" data-crit="${esc(c.id)}" ${marcados.has(c.id)?"checked":""} style="margin-top:3px">
        <span style="font-size:13px"><strong>${esc(c.id)}</strong> ${esc(c.texto)}</span>
      </label>`).join("");
    return `<div style="margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--line)">
      <div class="flex" style="justify-content:space-between;align-items:center;gap:8px">
        <div style="font-weight:700;font-size:13.5px">${esc(ce.id)} · ${esc(ce.titulo)}</div>
        <button type="button" class="ghost small" style="border:1px solid var(--line);flex-shrink:0" onclick="rfToggleTodosCE('${esc(ce.id)}')">Marcar/desmarcar</button>
      </div>
      <div class="sub" style="margin:2px 0 6px">Competencias clave: ${(ce.cc||[]).join(", ")||"—"}</div>
      ${sab.length?`<details style="margin:0 0 8px"><summary class="sub" style="cursor:pointer">Saberes básicos (${sab.length})</summary><ul style="margin:4px 0 0 18px;font-size:12px">${sab.map(s=>`<li>${esc(s)}</li>`).join("")}</ul></details>`:""}
      ${filasCrit}
    </div>`;
  }).join("");
  return `<div class="modal-overlay" onclick="if(event.target===this) rfCerrarModalElegirCE()">
    <div class="modal-box" style="max-width:680px;max-height:82vh;display:flex;flex-direction:column;padding:0;overflow:hidden">
      <div style="padding:16px 22px;border-bottom:1px solid var(--line);flex-shrink:0">
        <div class="flex" style="justify-content:space-between;align-items:flex-start">
          <div>
            <h2 style="font-size:17px;margin:0">Elegir competencias no conseguidas</h2>
            <p class="sub" style="margin:4px 0 0">${TRIMESTRES[trimIdx]} · ${esc(cat.materia)} · ${esc(cat.curso)}</p>
          </div>
          <button class="modal-close" onclick="rfCerrarModalElegirCE()">×</button>
        </div>
      </div>
      <div style="overflow-y:auto;padding:16px 22px;flex:1">
        <div class="flex" style="gap:6px;margin-bottom:12px">
          <button type="button" class="ghost small" style="border:1px solid var(--line)" onclick="rfMarcarTodosModal(true)">Seleccionar todo</button>
          <button type="button" class="ghost small" style="border:1px solid var(--line)" onclick="rfMarcarTodosModal(false)">Vaciar selección</button>
        </div>
        ${bloques}
      </div>
      <div style="padding:14px 22px;border-top:1px solid var(--line);flex-shrink:0">
        <label class="row" style="cursor:pointer;gap:8px;margin-bottom:10px">
          <input type="checkbox" id="rfElegirTodosTrim">
          <span style="font-size:12.5px">Aplicar esta misma selección a las tres evaluaciones</span>
        </label>
        <div class="flex" style="justify-content:flex-end">
          <button class="ghost" onclick="rfCerrarModalElegirCE()">Cancelar</button>
          <button class="btn" onclick="rfAplicarSeleccionCE()">Aplicar selección</button>
        </div>
      </div>
    </div>
  </div>`;
}
window.rfToggleTodosCE=(ceId)=>{
  const boxes=[...document.querySelectorAll(".rfElegirCrit")].filter(b=>b.dataset.ce===ceId);
  const todosMarcados=boxes.every(b=>b.checked);
  boxes.forEach(b=>{ b.checked=!todosMarcados; });
};
window.rfMarcarTodosModal=(marcar)=>{
  document.querySelectorAll(".rfElegirCrit").forEach(b=>{ b.checked=marcar; });
};
window.rfAplicarSeleccionCE=()=>{
  const {trimIdx}=state.ui.rfModalElegirCE;
  const p=(state.planesRefuerzo||[]).find(x=>x.id===state.ui.rfId); if(!p) return;
  const key=rfCatalogoParaCursoRefuerza(p); if(!key) return;
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
    const marcados=[...document.querySelectorAll(".rfElegirCrit")].filter(b=>b.dataset.ce===ce.id && b.checked);
    const seleccionados=marcados.map(chk=>{
      const c=ce.criterios.find(x=>x.id===chk.dataset.crit);
      return c?{id:c.id, texto:`${c.id}. ${c.texto}`, trabajado:!!trabajadoPrevio[c.id]}:null;
    }).filter(Boolean);
    const manuales=manualesEnCatalogo[ce.id]||[];
    if(seleccionados.length||manuales.length) nuevosGrupos.push({ce:ce.id, cc:(ce.cc||[]).join(", "), criterios:[...seleccionados,...manuales]});
  });
  trim.gruposCE=[...nuevosGrupos,...gruposManuales];
  const aplicarTodos=document.getElementById("rfElegirTodosTrim");
  if(aplicarTodos && aplicarTodos.checked){
    [0,1,2].filter(i=>i!==trimIdx).forEach(i=>{
      p.trimestres[i].gruposCE=trim.gruposCE.map(g=>({ce:g.ce,cc:g.cc,criterios:g.criterios.map(c=>({...c}))}));
    });
  }
  state.ui.rfModalElegirCE=null;
  save(); render();
  mostrarToast("✓ Competencias actualizadas");
};
function rfrpPlanActual(tipo){
  return tipo==="rf" ? (state.planesRefuerzo||[]).find(x=>x.id===state.ui.rfId) : (state.planesRepeticion||[]).find(x=>x.id===state.ui.rpId);
}
window.rpSetMotivo=(id,checked)=>{
  const p=rfrpPlanActual("rp");
  p.motivos[id]=checked; save(); render();
};
window.rfrpAnadirGrupoCE=(tipo,t)=>{ const p=rfrpPlanActual(tipo); p.trimestres[t].gruposCE.push(rfrpGrupoCEVacio()); save(); render(); };
window.rfrpQuitarGrupoCE=async (tipo,t,gi)=>{ const p=rfrpPlanActual(tipo); if(!await confirmar("¿Quitar esta competencia específica y todos sus criterios?")) return; p.trimestres[t].gruposCE.splice(gi,1); save(); render(); };
window.rfrpSetGrupoCampo=(tipo,t,gi,campo,v)=>{ const p=rfrpPlanActual(tipo); p.trimestres[t].gruposCE[gi][campo]=v; save(); render(); };
window.rfrpAnadirCriterioEnGrupo=(tipo,t,gi)=>{ const p=rfrpPlanActual(tipo); p.trimestres[t].gruposCE[gi].criterios.push({texto:"",trabajado:false}); save(); render(); };
window.rfrpQuitarCriterioEnGrupo=(tipo,t,gi,ci)=>{ const p=rfrpPlanActual(tipo); p.trimestres[t].gruposCE[gi].criterios.splice(ci,1); save(); render(); };
window.rfrpSetCriterioTexto=(tipo,t,gi,ci,v)=>{ const p=rfrpPlanActual(tipo); p.trimestres[t].gruposCE[gi].criterios[ci].texto=v; save(); };
window.rfrpToggleCriterioTrabajado=(tipo,t,gi,ci,checked)=>{ const p=rfrpPlanActual(tipo); p.trimestres[t].gruposCE[gi].criterios[ci].trabajado=checked; save(); };
window.rfrpAnadirActividad=(tipo,t)=>{ const p=rfrpPlanActual(tipo); p.trimestres[t].actividades.push(""); save(); render(); };
window.rfrpQuitarActividad=(tipo,t,i)=>{ const p=rfrpPlanActual(tipo); p.trimestres[t].actividades.splice(i,1); save(); render(); };
window.rfrpSetActividad=(tipo,t,i,v)=>{ const p=rfrpPlanActual(tipo); p.trimestres[t].actividades[i]=v; save(); };
window.rfrpSetTrimCampo=(tipo,t,campo,v)=>{ const p=rfrpPlanActual(tipo); p.trimestres[t][campo]=v; save(); if(campo==="valoracion") render(); };
window.rfrpSetValoracionFinal=(tipo,v)=>{ const p=rfrpPlanActual(tipo); p.valoracionFinal=v; save(); render(); };
window.rfRefrescarReasignAlumno=()=>{
  const gid=document.getElementById("rfReasignGrupo").value;
  const wrap=document.getElementById("rfReasignAlumnoWrap");
  const g=state.grupos.find(x=>x.id===gid);
  if(!g||!g.alumnos.length){ wrap.innerHTML=""; return; }
  wrap.innerHTML=`<select class="in" id="rfReasignAlumno">${g.alumnos.map(al=>`<option value="${al.id}">${esc(al.nombre)}</option>`).join("")}</select>`;
};
window.rfConfirmarReasignacion=id=>{
  const gid=document.getElementById("rfReasignGrupo").value;
  const alId=document.getElementById("rfReasignAlumno")?.value;
  if(!gid||!alId){ mostrarAviso("Elige grupo y alumno/a."); return; }
  const p=(state.planesRefuerzo||[]).find(x=>x.id===id);
  const g=state.grupos.find(x=>x.id===gid); const al=g.alumnos.find(x=>x.id===alId);
  p.grupoId=gid; p.alumnoId=alId; p.alumnoNombre=al.nombre;
  save(); render();
};

window.rfAnadirSeguimiento=id=>{
  const p=(state.planesRefuerzo||[]).find(x=>x.id===id);
  const nota=document.getElementById("rfSegNota").value.trim();
  if(!nota){ mostrarAviso("Escribe una anotación antes de añadir la entrada."); return; }
  const fecha=document.getElementById("rfSegFecha").value||agHoyStr();
  const valoracion=document.getElementById("rfSegValoracion").value;
  p.seguimiento=p.seguimiento||[];
  p.seguimiento.push({id:uid(),fecha,nota,valoracion});
  save(); render();
};
window.rfQuitarSeguimiento=async id=>{
  if(!await confirmar("¿Eliminar esta entrada de seguimiento?")) return;
  const p=(state.planesRefuerzo||[]).find(x=>x.id===state.ui.rfId);
  p.seguimiento=(p.seguimiento||[]).filter(s=>s.id!==id);
  save(); render();
};
window.rfEliminarPlan=async id=>{
  if(!await confirmar("¿Eliminar este plan de refuerzo y todo su seguimiento? No se puede deshacer.")) return;
  state.planesRefuerzo=(state.planesRefuerzo||[]).filter(x=>x.id!==id);
  state.ui.rfTab="lista"; state.ui.rfId="";
  save(); render();
  mostrarToast("Plan eliminado","info");
};
function rfrpMotivosResumenHTML(motivos){
  if(!motivos) return "—";
  const activos=RFRP_MOTIVOS.filter(m=>motivos[m.id]).map(m=>m.id==="otros"&&motivos.otrosTexto?`Otros: ${esc(motivos.otrosTexto)}`:esc(m.label));
  return activos.length?activos.join(", "):"—";
}
function rfrpTablaCEPrintHTML(gruposCE){
  const grupos=(gruposCE||[]).filter(g=>g.criterios.some(c=>c.texto&&c.texto.trim()));
  if(!grupos.length) return '<p style="color:#999;font-style:italic">Sin registros.</p>';
  let filas="";
  grupos.forEach(g=>{
    const crits=g.criterios.filter(c=>c.texto&&c.texto.trim());
    const n=crits.length;
    crits.forEach((c,ci)=>{
      filas+="<tr>";
      if(ci===0){
        filas+=`<td rowspan="${n}" style="font-weight:700;vertical-align:top">${esc(g.ce)||"—"}</td><td rowspan="${n}" style="vertical-align:top">${esc(g.cc)||"—"}</td>`;
      }
      filas+=`<td>${esc(c.texto)}</td><td style="text-align:center">${c.trabajado?"✓":"—"}</td></tr>`;
    });
  });
  return `<table>
    <thead><tr><th style="width:55px">CE</th><th style="width:130px">Comp. clave</th><th>Criterio de evaluación no conseguido</th><th style="width:70px">Trabajado</th></tr></thead>
    <tbody>${filas}</tbody>
  </table>`;
}
function rfrpTrimBodyHTML(idx,trim){
  const actividadesLis=(trim.actividades||[]).filter(a=>a&&a.trim()).map(a=>`<li style="margin-bottom:6px">${esc(a)}</li>`).join("");
  const vinfo=rfrpValoracionPNInfo(trim.valoracion);
  return `<h2>${TRIMESTRES[idx]}</h2>
    <p style="font-size:13px;font-weight:600;margin:6px 0 2px">Competencias específicas, criterios de evaluación y competencias clave no conseguidas</p>
    ${rfrpTablaCEPrintHTML(trim.gruposCE)}
    <p style="font-size:13px;font-weight:600;margin:10px 0 2px">Actividades de evaluación</p>
    ${actividadesLis?`<ol style="margin-left:18px">${actividadesLis}</ol>`:'<p style="color:#999;font-style:italic">Sin actividades registradas.</p>'}
    <table style="margin-top:6px">
      <tr><th style="width:170px">Calificación obtenida</th><td>${esc(trim.calificacion)||"—"}</td></tr>
      <tr><th>Valoración</th><td><span class="pill" style="background:${vinfo.color}1a;color:${vinfo.color}">${vinfo.label}</span></td></tr>
      <tr><th>Justificación</th><td>${esc(trim.justificacion)||"—"}</td></tr>
    </table>`;
}
window.rfImprimirInforme=id=>{
  const p=(state.planesRefuerzo||[]).find(x=>x.id===id); if(!p) return;
  const alV=rfAlumno(p);
  const seguimientoOrdenado=(p.seguimiento||[]).slice().sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const seguimientoFilas=seguimientoOrdenado.map(s=>`<tr><td style="white-space:nowrap">${fmt2(s.fecha)}</td><td>${rfValoracionInfo(s.valoracion).label}</td><td>${esc(s.nota)}</td></tr>`).join("");
  const vfinal=rfrpValoracionPNInfo(p.valoracionFinal);
  const body=`
    <h1>Plan de refuerzo</h1>
    <div class="meta">${esc(rfNombre(p))}${alV?" · "+esc(alV.g.nombre):""} · Geografía e Historia · Generado el ${new Date().toLocaleDateString("es-ES")}</div>
    <table>
      <tr><th style="width:170px">Título</th><td>${esc(p.titulo||"—")}</td></tr>
      <tr><th>Curso académico</th><td>${esc(p.cursoAcademico)||"—"}</td></tr>
      <tr><th>Periodo</th><td>${fmt2(p.fechaInicio)}${p.fechaFinPrevista?" a "+fmt2(p.fechaFinPrevista):""}</td></tr>
      <tr><th>Estado</th><td><span class="pill" style="background:${rfEstadoInfo(p.estado).color}1a;color:${rfEstadoInfo(p.estado).color}">${rfEstadoInfo(p.estado).label}</span></td></tr>
      <tr><th>Motivos de la no superación</th><td>${rfrpMotivosResumenHTML(p.motivos)}</td></tr>
    </table>
    ${rfrpTrimBodyHTML(0,p.trimestres[0])}
    ${rfrpTrimBodyHTML(1,p.trimestres[1])}
    ${rfrpTrimBodyHTML(2,p.trimestres[2])}
    <h2>Valoración final del plan</h2>
    <p><span class="pill" style="background:${vfinal.color}1a;color:${vfinal.color}">${vfinal.label}</span></p>
    <h2>Diario de seguimiento</h2>
    ${seguimientoFilas?`<table><thead><tr><th>Fecha</th><th>Valoración</th><th>Anotación</th></tr></thead><tbody>${seguimientoFilas}</tbody></table>`:'<p style="color:#999;font-style:italic">Sin entradas de seguimiento.</p>'}
    ${p.observacionesFinales?`<h2>Observaciones finales</h2><p style="white-space:pre-wrap;line-height:1.6">${esc(p.observacionesFinales)}</p>`:""}
    ${rfrpCeLegendPrintHTML()}
  `;
  const portada=generarPortadaHTML(`Plan de refuerzo — ${p.titulo||"plan"}`,
    [alV?`Alumno/a: <strong>${esc(alV.al.nombre)}</strong> · ${esc(alV.g.nombre)}`:`Alumno/a: <strong>${esc(p.alumnoNombre||"—")}</strong>`,
     `Curso escolar: <strong>${esc(p.cursoAcademico||cursoEscolarEfectivo(null))}</strong>`,
     profesorNombreEfectivo(null)?`Elaborado por: <strong>${esc(profesorNombreEfectivo(null))}</strong>`:""],
    ["Motivos de la no superación",TRIMESTRES[0],TRIMESTRES[1],TRIMESTRES[2],"Valoración final del plan","Diario de seguimiento",p.observacionesFinales?"Observaciones finales":"","Leyenda de competencias clave"]);
  abrirVentanaInforme(`Plan de refuerzo — ${p.titulo||"plan"}`, body, {portada});
};

