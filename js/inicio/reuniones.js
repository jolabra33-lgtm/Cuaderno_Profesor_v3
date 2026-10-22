/* ============================================================================
   Cuaderno del profesor · Registro de reuniones con familias, alumnado y equipo
   js/inicio/reuniones.js
   ============================================================================ */

/* =================================================================
   REUNIONES — registro de reuniones (familias, alumnado, equipo
   directivo...) con acta imprimible. Vive en state.reuniones
   (top-level, se incluye solo con Exportar/Importar copia).
   ================================================================= */
const RE_TIPOS=[
  {id:"familia",label:"Familia",color:"#0d9488"},
  {id:"alumno",label:"Alumno/a",color:"#2563eb"},
  {id:"directiva",label:"Equipo directivo",color:"#dc2626"},
  {id:"otro",label:"Otro",color:"#64748b"}
];
function reTipoInfo(id){ return RE_TIPOS.find(t=>t.id===id)||RE_TIPOS[3]; }
const RE_PLANTILLAS_BASE=[
  {nombre:"Entrega de notas", ordenDia:["Presentación de resultados académicos del trimestre","Fortalezas y áreas de mejora","Propuestas de mejora para el próximo trimestre"]},
  {nombre:"Reunión inicial de curso", ordenDia:["Presentación del equipo docente y la tutoría","Normas de funcionamiento del grupo","Calendario de evaluaciones y vías de comunicación"]},
  {nombre:"Seguimiento académico individual", ordenDia:["Evolución de las calificaciones","Actitud y hábitos de trabajo","Acuerdos y compromisos para la mejora"]},
  {nombre:"Reunión de convivencia", ordenDia:["Exposición de los hechos","Escucha de las partes implicadas","Medidas acordadas y seguimiento"]}
];
function rePlantillasDisponibles(){
  return [...RE_PLANTILLAS_BASE.map((p,i)=>({id:"base:"+i,nombre:p.nombre,ordenDia:p.ordenDia,base:true})),
          ...(state.plantillasReunion||[]).map(p=>({...p,base:false}))];
}
function reNuevaReunion(datos){
  return { id:uid(), titulo:datos.titulo, tipo:datos.tipo||"familia", fecha:datos.fecha||"", horaInicio:datos.horaInicio||"", horaFin:"",
    lugar:"", grupoId:datos.grupoId||"", alumnoId:datos.alumnoId||"", estado:"borrador",
    asistentes:[{nombre:"",rol:""}], ordenDia:(datos.ordenDia&&datos.ordenDia.length)?[...datos.ordenDia]:[""], desarrollo:"", acuerdos:[""], observaciones:"",
    proximaFecha:"", proximaHora:"", firmantes:[{nombre:"",rol:""}], eventoId:"" };
}
function reListaFiltrada(){
  const f=state.ui.reFiltroTipo, q=(state.ui.reBusqueda||"").toLowerCase().trim();
  const desde=state.ui.reFiltroDesde||"", hasta=state.ui.reFiltroHasta||"";
  return (state.reuniones||[]).filter(r=>{
    if(f && r.tipo!==f) return false;
    if(q && !(r.titulo||"").toLowerCase().includes(q)) return false;
    if(desde && (r.fecha||"")<desde) return false;
    if(hasta && (r.fecha||"")>hasta) return false;
    return true;
  }).sort((a,b)=>(b.fecha||"").localeCompare(a.fecha||"")||b.id.localeCompare(a.id));
}
function reAlumno(r){ if(!r.grupoId||!r.alumnoId) return null; const g=state.grupos.find(x=>x.id===r.grupoId); if(!g) return null; const al=g.alumnos.find(x=>x.id===r.alumnoId); return al?{al,g}:null; }
window.reTab=k=>{ state.ui.reTab=k; if(k==="lista") state.ui.reId=""; save(); render(); };
window.reIrLista=()=>{ state.ui.reTab="lista"; state.ui.reId=""; save(); render(); };
window.reAbrirDetalle=id=>{ state.ui.reTab="detalle"; state.ui.reId=id; save(); render(); };
window.reAbrirDesdeOtroModo=id=>{ state.ui.appMode="reuniones"; state.ui.reTab="detalle"; state.ui.reId=id; save(); render(); };
window.reSetFiltroTipo=v=>{ state.ui.reFiltroTipo=v; save(); render(); };
window.reSetBusqueda=v=>{ state.ui.reBusqueda=v; save(); render(); };
window.reSetFiltroFecha=(campo,v)=>{ state.ui[campo]=v; save(); render(); };
window.reLimpiarFiltroFecha=()=>{ state.ui.reFiltroDesde=""; state.ui.reFiltroHasta=""; save(); render(); };

function renderReunionesApp(){
  const app=document.getElementById("app");
  app.innerHTML=`<div class="card" style="padding:12px 16px">
    <div class="flex" style="justify-content:space-between">
      <div><strong style="font-size:15px">🗂️ Reuniones</strong><span style="color:var(--mut);font-size:13px"> · registro y actas</span></div>
      <button class="ghost" style="border:1px solid var(--line)" onclick="irInicio()">🏠 Inicio</button>
    </div>
  </div><div id="reRoot"></div>`;
  const root=document.getElementById("reRoot");
  if(state.ui.reTab==="detalle" && state.ui.reId && (state.reuniones||[]).find(r=>r.id===state.ui.reId)){
    renderReDetalleHTML(root);
  }else{
    renderReListaHTML(root);
  }
  if(state.ui.reModalNueva) root.insertAdjacentHTML("beforeend", reRenderModalNuevaHTML());
}

function renderReListaHTML(root){
  const lista=reListaFiltrada();
  const total=(state.reuniones||[]).length;
  const cerradas=(state.reuniones||[]).filter(r=>r.estado==="cerrada").length;
  const filas = lista.length ? lista.map(r=>{
    const info=reTipoInfo(r.tipo);
    const alV=reAlumno(r);
    const nAsist=(r.asistentes||[]).filter(a=>a.nombre&&a.nombre.trim()).length;
    const resumen = r.desarrollo? (r.desarrollo.length>110? r.desarrollo.slice(0,110)+"…" : r.desarrollo)
      : ((r.ordenDia||[]).filter(t=>t&&t.trim()).length? `${(r.ordenDia||[]).filter(t=>t&&t.trim()).length} tema(s) en el orden del día` : "Sin desarrollo registrado.");
    return `<div class="card" style="cursor:pointer;padding:16px 18px" onclick="reAbrirDetalle('${r.id}')">
      <div class="flex" style="justify-content:space-between;align-items:flex-start">
        <div style="min-width:0">
          <span class="pill" style="background:${info.color}1a;color:${info.color};margin-bottom:6px">${info.label}</span>
          <div style="font-size:15px;font-weight:700">${esc(r.titulo||"Sin título")}</div>
          <div style="font-size:12.5px;color:var(--mut);margin-top:2px">
            ${r.fecha?fmt2(r.fecha):"Sin fecha"}${r.horaInicio?" · "+r.horaInicio:""}${alV?" · "+esc(alV.al.nombre):""}${r.grupoId&&!alV?" · "+esc((state.grupos.find(g=>g.id===r.grupoId)||{}).nombre||""):""}
          </div>
          <div style="font-size:12.5px;color:var(--mut);margin-top:6px;max-width:560px">${esc(resumen)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <span class="badge">${nAsist} asistente${nAsist===1?"":"s"}</span>
          <div style="margin-top:6px"><span class="pill" style="background:${r.estado==="cerrada"?"#dcfce7":"#f1f5f9"};color:${r.estado==="cerrada"?"#166534":"#64748b"}">${r.estado==="cerrada"?"✓ Cerrada":"Borrador"}</span></div>
        </div>
      </div>
    </div>`;
  }).join("") : `<div class="card"><p class="sub" style="margin:0">${total===0?"Todavía no has registrado ninguna reunión.":"Sin resultados con este filtro/búsqueda."}</p></div>`;

  root.innerHTML=`
  <div class="card">
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
      <div class="flex" style="gap:16px">
        <div><div class="big" style="font-size:24px">${total}</div><div class="sub" style="margin:0">Total</div></div>
        <div><div class="big" style="font-size:24px">${cerradas}</div><div class="sub" style="margin:0">Cerradas</div></div>
        <div><div class="big" style="font-size:24px">${total-cerradas}</div><div class="sub" style="margin:0">Borrador</div></div>
      </div>
      <div class="flex">
        <button class="ghost" style="border:1px solid var(--line)" onclick="reExportarCSV()" title="Exporta un resumen (título, tipo, fecha, asistentes, acuerdos…) en un archivo que abre Excel/Sheets">⬇ Exportar a Excel</button>
        <button class="btn" onclick="reAbrirModalNueva()">+ Nueva reunión</button>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="flex" style="flex-wrap:wrap">
      <input class="in" style="flex:1;min-width:180px" placeholder="Buscar por título…" id="reBusquedaInput" value="${esc(state.ui.reBusqueda||"")}">
      <select class="in" id="reFiltroInput">
        <option value="">Todos los tipos</option>
        ${RE_TIPOS.map(t=>`<option value="${t.id}" ${state.ui.reFiltroTipo===t.id?"selected":""}>${t.label}</option>`).join("")}
      </select>
      <label style="font-size:12.5px;color:var(--mut);display:flex;align-items:center;gap:6px">Desde
        <input type="date" class="in" id="reFiltroDesdeInput" style="min-width:150px" value="${esc(state.ui.reFiltroDesde||"")}">
      </label>
      <label style="font-size:12.5px;color:var(--mut);display:flex;align-items:center;gap:6px">Hasta
        <input type="date" class="in" id="reFiltroHastaInput" style="min-width:150px" value="${esc(state.ui.reFiltroHasta||"")}">
      </label>
      ${(state.ui.reFiltroDesde||state.ui.reFiltroHasta)?`<button class="ghost" style="border:1px solid var(--line)" onclick="reLimpiarFiltroFecha()">✕ Quitar fechas</button>`:""}
    </div>
  </div>
  <div class="grid" style="gap:10px">${filas}</div>`;
  document.getElementById("reBusquedaInput").addEventListener("input",e=>{ reSetBusqueda(e.target.value); });
  document.getElementById("reFiltroInput").addEventListener("change",e=>{ reSetFiltroTipo(e.target.value); });
  document.getElementById("reFiltroDesdeInput").addEventListener("change",e=>{ reSetFiltroFecha("reFiltroDesde",e.target.value); });
  document.getElementById("reFiltroHastaInput").addEventListener("change",e=>{ reSetFiltroFecha("reFiltroHasta",e.target.value); });
}

window.reAbrirModalNueva=()=>{ state.ui.reModalNueva=true; save(); render(); };
window.reCerrarModalNueva=()=>{ state.ui.reModalNueva=false; save(); render(); };
function reRenderModalNuevaHTML(){
  return `
  <div class="modal-overlay" onclick="if(event.target===this) reCerrarModalNueva()">
    <div class="modal-box" style="max-width:460px">
      <div class="flex" style="justify-content:space-between;align-items:flex-start">
        <h2 style="font-size:17px">Nueva reunión</h2>
        <button class="modal-close" onclick="reCerrarModalNueva()">×</button>
      </div>
      <div class="grid" style="gap:12px;margin-top:10px">
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Título / motivo
          <input class="in" style="width:100%;margin-top:4px" id="reNTitulo" placeholder="Seguimiento académico, entrevista trimestral…">
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Tipo
          <select class="in" style="width:100%;margin-top:4px" id="reNTipo">
            ${RE_TIPOS.map(t=>`<option value="${t.id}">${t.label}</option>`).join("")}
          </select>
        </label>
        <div class="flex">
          <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1">Fecha
            <input class="in" style="width:100%;margin-top:4px" type="date" id="reNFecha" value="${agHoyStr()}">
          </label>
          <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1">Hora
            <input class="in" style="width:100%;margin-top:4px" type="time" id="reNHora">
          </label>
        </div>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Grupo (opcional)
          <select class="in" style="width:100%;margin-top:4px" id="reNGrupo" onchange="reRefrescarAlumnoSel()">
            <option value="">Ninguno / general</option>
            ${state.grupos.map(g=>`<option value="${g.id}">${esc(g.nombre)}</option>`).join("")}
          </select>
        </label>
        <div id="reNAlumnoWrap"></div>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Orden del día desde plantilla (opcional)
          <select class="in" style="width:100%;margin-top:4px" id="reNPlantilla">
            <option value="">En blanco</option>
            ${rePlantillasDisponibles().map(p=>`<option value="${p.id}">${esc(p.nombre)}${p.base?"":" (guardada)"}</option>`).join("")}
          </select>
        </label>
        ${(state.plantillasReunion||[]).length?`<div class="flex" style="gap:6px">
          ${state.plantillasReunion.map(p=>`<span class="chip" style="font-size:11.5px">${esc(p.nombre)} <button class="ghost danger small" style="padding:1px 5px;margin-left:2px" onclick="reEliminarPlantilla('${p.id}')" title="Eliminar plantilla">✕</button></span>`).join("")}
        </div>`:""}
      </div>
      <div class="flex" style="justify-content:flex-end;margin-top:18px">
        <button class="ghost" onclick="reCerrarModalNueva()">Cancelar</button>
        <button class="btn" onclick="reCrearReunion()">Crear</button>
      </div>
    </div>
  </div>`;
}
window.reRefrescarAlumnoSel=()=>{
  const gid=document.getElementById("reNGrupo").value;
  const wrap=document.getElementById("reNAlumnoWrap");
  if(!gid){ wrap.innerHTML=""; return; }
  const g=state.grupos.find(x=>x.id===gid);
  wrap.innerHTML=`<label style="font-size:12.5px;color:var(--mut);font-weight:500">Alumno/a (opcional)
    <select class="in" style="width:100%;margin-top:4px" id="reNAlumno">
      <option value="">Ninguno</option>
      ${g.alumnos.map(al=>`<option value="${al.id}">${esc(al.nombre)}</option>`).join("")}
    </select>
  </label>`;
};
window.reCrearReunion=()=>{
  const titulo=document.getElementById("reNTitulo").value.trim();
  if(!titulo){ mostrarAviso("Indica el título o motivo de la reunión."); return; }
  const tipo=document.getElementById("reNTipo").value;
  const fecha=document.getElementById("reNFecha").value;
  const horaInicio=document.getElementById("reNHora").value;
  const grupoId=document.getElementById("reNGrupo").value;
  const alumnoId=document.getElementById("reNAlumno")?.value||"";
  const plantillaId=document.getElementById("reNPlantilla")?.value||"";
  let ordenDia=null;
  if(plantillaId){ const p=rePlantillasDisponibles().find(x=>x.id===plantillaId); if(p) ordenDia=p.ordenDia; }
  const r=reNuevaReunion({titulo,tipo,fecha,horaInicio,grupoId,alumnoId,ordenDia});
  if(fecha){
    if(!Array.isArray(state.eventos)) state.eventos=[];
    const ev={id:uid(),fecha,fechaFin:"",hora:horaInicio||"",titulo,tipo:"reunion",grupoId,notas:"",examId:"",reunionId:r.id,reunionCon:tipo};
    state.eventos.push(ev); r.eventoId=ev.id; state.ui.agMes=fecha.slice(0,7);
  }
  if(!Array.isArray(state.reuniones)) state.reuniones=[];
  state.reuniones.push(r);
  state.ui.reModalNueva=false; state.ui.reTab="detalle"; state.ui.reId=r.id;
  save(); render();
};

function renderReDetalleHTML(root){
  const r=(state.reuniones||[]).find(x=>x.id===state.ui.reId);
  const info=reTipoInfo(r.tipo);
  const alV=reAlumno(r);
  const asistentesHtml=(r.asistentes||[]).map((a,i)=>`
    <div class="flex" style="margin-bottom:6px">
      <input class="in" style="flex:1" placeholder="Nombre" value="${esc(a.nombre||"")}" onchange="reSetAsistente(${i},'nombre',this.value)">
      <input class="in" style="flex:1" placeholder="Rol (madre, tutor legal, orientador…)" value="${esc(a.rol||"")}" onchange="reSetAsistente(${i},'rol',this.value)">
      <button class="ghost danger" onclick="reQuitarAsistente(${i})">✕</button>
    </div>`).join("");
  const ordenHtml=(r.ordenDia||[]).map((t,i)=>`
    <div class="flex" style="margin-bottom:6px;align-items:center">
      <span class="badge" style="flex-shrink:0">${i+1}</span>
      <input class="in" style="flex:1" placeholder="Tema a tratar…" value="${esc(t||"")}" onchange="reSetOrden(${i},this.value)">
      <button class="ghost danger" onclick="reQuitarOrden(${i})">✕</button>
    </div>`).join("");
  const acuerdosHtml=(r.acuerdos||[]).map((a,i)=>`
    <div class="flex" style="margin-bottom:6px;align-items:center">
      <span class="badge" style="flex-shrink:0">✓</span>
      <input class="in" style="flex:1" placeholder="Acuerdo o compromiso adoptado…" value="${esc(a||"")}" onchange="reSetAcuerdo(${i},this.value)">
      <button class="ghost danger" onclick="reQuitarAcuerdo(${i})">✕</button>
    </div>`).join("");
  const firmantesHtml=(r.firmantes||[]).map((f,i)=>`
    <div class="flex" style="margin-bottom:6px">
      <input class="in" style="flex:1" placeholder="Nombre" value="${esc(f.nombre||"")}" onchange="reSetFirmante(${i},'nombre',this.value)">
      <input class="in" style="flex:1" placeholder="Cargo / relación" value="${esc(f.rol||"")}" onchange="reSetFirmante(${i},'rol',this.value)">
      <button class="ghost danger" onclick="reQuitarFirmante(${i})">✕</button>
    </div>`).join("");

  root.innerHTML=`
  <div class="card">
    <div class="flex" style="justify-content:space-between;flex-wrap:wrap;gap:10px">
      <button class="ghost" style="border:1px solid var(--line)" onclick="reIrLista()">← Reuniones</button>
      <div class="flex">
        <button class="ghost" style="border:1px solid var(--line);color:${r.estado==='cerrada'?'#166534':'inherit'}" onclick="reToggleEstado()">${r.estado==="cerrada"?"✓ Cerrada":"Marcar como cerrada"}</button>
        <button class="btn" onclick="reImprimirActa('${r.id}')">🖨️ Imprimir acta</button>
        <button class="ghost danger" onclick="reEliminarReunion('${r.id}')">Eliminar</button>
      </div>
    </div>
    <div class="grid" style="gap:12px;margin-top:14px;max-width:640px">
      <label style="font-size:12.5px;color:var(--mut);font-weight:500">Título / motivo
        <input class="in" style="width:100%;margin-top:4px;font-size:16px;font-weight:600" id="reDTitulo" value="${esc(r.titulo||"")}">
      </label>
      <div class="flex">
        <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1">Tipo
          <select class="in" style="width:100%;margin-top:4px" id="reDTipo">${RE_TIPOS.map(t=>`<option value="${t.id}" ${r.tipo===t.id?"selected":""}>${t.label}</option>`).join("")}</select>
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1">Fecha
          <input class="in" style="width:100%;margin-top:4px" type="date" id="reDFecha" value="${r.fecha||""}">
        </label>
      </div>
      <div class="flex">
        <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1">Hora inicio
          <input class="in" style="width:100%;margin-top:4px" type="time" id="reDHoraInicio" value="${r.horaInicio||""}">
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1">Hora fin
          <input class="in" style="width:100%;margin-top:4px" type="time" id="reDHoraFin" value="${r.horaFin||""}">
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1">Lugar
          <input class="in" style="width:100%;margin-top:4px" id="reDLugar" value="${esc(r.lugar||"")}">
        </label>
      </div>
      <div class="flex">
        <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1">Grupo (opcional)
          <select class="in" style="width:100%;margin-top:4px" id="reDGrupo" onchange="reRefrescarAlumnoDetalle()">
            <option value="">Ninguno / general</option>
            ${state.grupos.map(g=>`<option value="${g.id}" ${r.grupoId===g.id?"selected":""}>${esc(g.nombre)}</option>`).join("")}
          </select>
        </label>
        <div style="flex:1" id="reDAlumnoWrap">${r.grupoId?`<label style="font-size:12.5px;color:var(--mut);font-weight:500">Alumno/a (opcional)
          <select class="in" style="width:100%;margin-top:4px" id="reDAlumno">
            <option value="">Ninguno</option>
            ${(state.grupos.find(g=>g.id===r.grupoId)?.alumnos||[]).map(al=>`<option value="${al.id}" ${r.alumnoId===al.id?"selected":""}>${esc(al.nombre)}</option>`).join("")}
          </select></label>`:""}</div>
      </div>
    </div>

    <h2 style="font-size:15px;margin-top:22px">Asistentes</h2>
    <div style="max-width:640px">${asistentesHtml}</div>
    <button class="ghost" style="border:1px solid var(--line)" onclick="reAnadirAsistente()">+ Añadir asistente</button>

    <h2 style="font-size:15px;margin-top:22px">Orden del día</h2>
    <div style="max-width:640px">${ordenHtml}</div>
    <button class="ghost" style="border:1px solid var(--line)" onclick="reAnadirOrden()">+ Añadir tema</button>
    <button class="ghost" style="border:1px solid var(--line)" onclick="reGuardarComoPlantilla()">💾 Guardar orden del día como plantilla</button>

    <h2 style="font-size:15px;margin-top:22px">Desarrollo de la reunión</h2>
    <textarea class="in" style="width:100%;max-width:640px;min-height:120px;resize:vertical" id="reDDesarrollo" placeholder="Contenido tratado durante la reunión…">${esc(r.desarrollo||"")}</textarea>

    <h2 style="font-size:15px;margin-top:22px">Acuerdos y compromisos</h2>
    <div style="max-width:640px">${acuerdosHtml}</div>
    <button class="ghost" style="border:1px solid var(--line)" onclick="reAnadirAcuerdo()">+ Añadir acuerdo</button>

    <h2 style="font-size:15px;margin-top:22px">Observaciones</h2>
    <textarea class="in" style="width:100%;max-width:640px;min-height:70px;resize:vertical" id="reDObservaciones" placeholder="Observaciones adicionales…">${esc(r.observaciones||"")}</textarea>

    <div class="flex" style="margin-top:14px">
      <label style="font-size:12.5px;color:var(--mut);font-weight:500">Próxima reunión — fecha
        <input class="in" style="width:100%;margin-top:4px" type="date" id="reDProxFecha" value="${r.proximaFecha||""}">
      </label>
      <label style="font-size:12.5px;color:var(--mut);font-weight:500">Hora
        <input class="in" style="width:100%;margin-top:4px" type="time" id="reDProxHora" value="${r.proximaHora||""}">
      </label>
    </div>

    <h2 style="font-size:15px;margin-top:22px">Firmantes</h2>
    <div style="max-width:640px">${firmantesHtml}</div>
    <button class="ghost" style="border:1px solid var(--line)" onclick="reAnadirFirmante()">+ Añadir firmante</button>
  </div>`;

  const campo=(id,fn)=>document.getElementById(id).addEventListener("change",e=>{ fn(e.target.value); reGuardarCampos(); });
  campo("reDTitulo",v=>{ r.titulo=v.trim()||r.titulo; reSyncEvento(r); });
  campo("reDTipo",v=>{ r.tipo=v; reSyncEvento(r); });
  campo("reDFecha",v=>{ r.fecha=v; reSyncEvento(r); if(v) state.ui.agMes=v.slice(0,7); });
  campo("reDHoraInicio",v=>{ r.horaInicio=v; reSyncEvento(r); });
  campo("reDHoraFin",v=>r.horaFin=v);
  campo("reDLugar",v=>r.lugar=v.trim());
  if(document.getElementById("reDAlumno")) campo("reDAlumno",v=>r.alumnoId=v);
  campo("reDDesarrollo",v=>r.desarrollo=v);
  campo("reDObservaciones",v=>r.observaciones=v);
  campo("reDProxFecha",v=>r.proximaFecha=v);
  campo("reDProxHora",v=>r.proximaHora=v);
}
function reGuardarCampos(){ save(); }
function reSyncEvento(r){
  const vinculados=(state.eventos||[]).filter(e=>e.reunionId===r.id);
  if(!vinculados.length) return;
  vinculados.forEach(ev=>{ ev.titulo=r.titulo; ev.tipo="reunion"; if(r.fecha) ev.fecha=r.fecha; ev.grupoIds=r.grupoId?[r.grupoId]:[]; ev.reunionCon=r.tipo; ev.hora=r.horaInicio||""; });
  save();
}
window.reRefrescarAlumnoDetalle=()=>{
  const r=(state.reuniones||[]).find(x=>x.id===state.ui.reId);
  const gid=document.getElementById("reDGrupo").value;
  const wrap=document.getElementById("reDAlumnoWrap");
  if(!gid){ wrap.innerHTML=""; r.grupoId=""; r.alumnoId=""; reSyncEvento(r); save(); return; }
  const g=state.grupos.find(x=>x.id===gid);
  wrap.innerHTML=`<label style="font-size:12.5px;color:var(--mut);font-weight:500">Alumno/a (opcional)
    <select class="in" style="width:100%;margin-top:4px" id="reDAlumno" onchange="reSetAlumnoDetalle(this.value)">
      <option value="">Ninguno</option>
      ${g.alumnos.map(al=>`<option value="${al.id}">${esc(al.nombre)}</option>`).join("")}
    </select>
  </label>`;
  r.grupoId=gid; r.alumnoId=""; reSyncEvento(r); save();
};
window.reSetAlumnoDetalle=v=>{ const r=(state.reuniones||[]).find(x=>x.id===state.ui.reId); r.alumnoId=v; save(); };
window.reToggleEstado=()=>{ const r=(state.reuniones||[]).find(x=>x.id===state.ui.reId); r.estado=r.estado==="cerrada"?"borrador":"cerrada"; save(); render(); };
window.reEliminarReunion=async id=>{
  if(!await confirmar("¿Eliminar esta reunión y su acta? No se puede deshacer.")) return;
  state.eventos=(state.eventos||[]).filter(e=>e.reunionId!==id);
  state.reuniones=(state.reuniones||[]).filter(x=>x.id!==id);
  state.ui.reTab="lista"; state.ui.reId="";
  save(); render();
};
window.reAnadirAsistente=()=>{ const r=(state.reuniones||[]).find(x=>x.id===state.ui.reId); r.asistentes.push({nombre:"",rol:""}); save(); render(); };
window.reQuitarAsistente=i=>{ const r=(state.reuniones||[]).find(x=>x.id===state.ui.reId); r.asistentes.splice(i,1); save(); render(); };
window.reSetAsistente=(i,campo,v)=>{ const r=(state.reuniones||[]).find(x=>x.id===state.ui.reId); r.asistentes[i][campo]=v; save(); };
window.reAnadirOrden=()=>{ const r=(state.reuniones||[]).find(x=>x.id===state.ui.reId); r.ordenDia.push(""); save(); render(); };
window.reQuitarOrden=i=>{ const r=(state.reuniones||[]).find(x=>x.id===state.ui.reId); r.ordenDia.splice(i,1); save(); render(); };
window.reSetOrden=(i,v)=>{ const r=(state.reuniones||[]).find(x=>x.id===state.ui.reId); r.ordenDia[i]=v; save(); };
window.reGuardarComoPlantilla=async ()=>{
  const r=(state.reuniones||[]).find(x=>x.id===state.ui.reId);
  const temas=(r.ordenDia||[]).filter(t=>t&&t.trim());
  if(!temas.length){ mostrarAviso("Añade al menos un tema al orden del día antes de guardarlo como plantilla."); return; }
  const nombre=await pedirTexto("Nombre para esta plantilla de orden del día:", r.titulo||"");
  if(!nombre || !nombre.trim()) return;
  if(!Array.isArray(state.plantillasReunion)) state.plantillasReunion=[];
  state.plantillasReunion.push({ id:uid(), nombre:nombre.trim(), ordenDia:temas.slice() });
  save();
  mostrarAviso(`Plantilla "${nombre.trim()}" guardada. Podrás elegirla al crear una nueva reunión.`);
};
window.reEliminarPlantilla=async id=>{
  if(!await confirmar("¿Eliminar esta plantilla de orden del día?")) return;
  state.plantillasReunion=(state.plantillasReunion||[]).filter(p=>p.id!==id);
  save(); render();
};
window.reAnadirAcuerdo=()=>{ const r=(state.reuniones||[]).find(x=>x.id===state.ui.reId); r.acuerdos.push(""); save(); render(); };
window.reQuitarAcuerdo=i=>{ const r=(state.reuniones||[]).find(x=>x.id===state.ui.reId); r.acuerdos.splice(i,1); save(); render(); };
window.reSetAcuerdo=(i,v)=>{ const r=(state.reuniones||[]).find(x=>x.id===state.ui.reId); r.acuerdos[i]=v; save(); };
window.reAnadirFirmante=()=>{ const r=(state.reuniones||[]).find(x=>x.id===state.ui.reId); r.firmantes.push({nombre:"",rol:""}); save(); render(); };
window.reQuitarFirmante=i=>{ const r=(state.reuniones||[]).find(x=>x.id===state.ui.reId); r.firmantes.splice(i,1); save(); render(); };
window.reSetFirmante=(i,campo,v)=>{ const r=(state.reuniones||[]).find(x=>x.id===state.ui.reId); r.firmantes[i][campo]=v; save(); };

/* ---------- Acta imprimible ---------- */
function fmt2(d){ if(!d) return "—"; const [y,m,dd]=d.split("-"); return `${dd}/${m}/${y}`; }
/* Convierte una fecha escrita a mano (dd/mm/aaaa, dd-mm-aaaa, dd.mm.aaaa, con año de 2 o 4
   cifras, o ya en formato ISO aaaa-mm-dd) a ISO. Devuelve null si no es una fecha válida
   (incluye la comprobación de que el día/mes/año coincidan tras construir la fecha, para
   rechazar cosas como 31/02/2024). */
function parseFechaFlexible(str){
  if(!str) return null;
  str=String(str).trim();
  let m=str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(m){
    const d=new Date(str+"T00:00:00");
    return isNaN(d.getTime())?null:str;
  }
  m=str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if(!m) return null;
  let [,dd,mm,yy]=m;
  dd=dd.padStart(2,"0"); mm=mm.padStart(2,"0");
  if(yy.length===2) yy=(Number(yy)<70?"20":"19")+yy;
  const iso=`${yy}-${mm}-${dd}`;
  const d=new Date(iso+"T00:00:00");
  if(isNaN(d.getTime())||d.getFullYear()!==Number(yy)||d.getMonth()+1!==Number(mm)||d.getDate()!==Number(dd)) return null;
  return iso;
}
/* Campo de fecha combinado: input de texto libre (para escribir la fecha a mano) + icono
   de calendario nativo (para elegirla como hasta ahora). onChangeTexto/onChangeCalendario
   son fragmentos JS ya listos para usar como atributo onchange. */
function campoFechaDualHTML(dateId,isoValue,onChangeTexto,onChangeCalendario){
  const txt=isoValue?fmt2(isoValue):"";
  return `<div class="flex" style="gap:6px;align-items:center;flex-wrap:nowrap">
    <input type="text" class="in" style="flex:1;min-width:0" inputmode="numeric" autocomplete="off" placeholder="dd/mm/aaaa" value="${txt==="—"?"":esc(txt)}" onchange="${onChangeTexto}">
    <div class="date-icon-wrap" title="Elegir en el calendario" aria-label="Elegir fecha en el calendario">📅<input type="date" id="${dateId}" value="${isoValue||""}" onchange="${onChangeCalendario}"></div>
  </div>`;
}
window.reExportarCSV=()=>{
  const lista=reListaFiltrada();
  if(!lista.length){ mostrarAviso("No hay reuniones para exportar"+(state.ui.reFiltroTipo||state.ui.reBusqueda?" con este filtro/búsqueda.":".")); return; }
  const esc2=s=>'"'+String(s??"").replace(/"/g,'""')+'"';
  let csv="Titulo;Tipo;Fecha;Hora;Grupo;Alumno;Estado;Asistentes;Temas orden del dia;Acuerdos\n";
  lista.forEach(r=>{
    const info=reTipoInfo(r.tipo);
    const alV=reAlumno(r);
    const grupo=r.grupoId?state.grupos.find(g=>g.id===r.grupoId):null;
    const nAsist=(r.asistentes||[]).filter(a=>a.nombre&&a.nombre.trim()).length;
    const nTemas=(r.ordenDia||[]).filter(t=>t&&t.trim()).length;
    const nAcuerdos=(r.acuerdos||[]).filter(a=>a&&a.trim()).length;
    csv+=[esc2(r.titulo),esc2(info.label),esc2(fmt2(r.fecha)),esc2(r.horaInicio||""),esc2(grupo?grupo.nombre:""),esc2(alV?alV.al.nombre:""),esc2(r.estado==="cerrada"?"Cerrada":"Borrador"),nAsist,nTemas,nAcuerdos].join(";")+"\n";
  });
  const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"});
  const u=URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=u; a.download="reuniones-"+new Date().toISOString().slice(0,10)+".csv"; a.click(); URL.revokeObjectURL(u);
};
window.reImprimirActa=id=>{
  const r=(state.reuniones||[]).find(x=>x.id===id); if(!r) return;
  const info=reTipoInfo(r.tipo);
  const alV=reAlumno(r);
  const asistRows=(r.asistentes||[]).filter(a=>a.nombre&&a.nombre.trim()).map((a,i)=>`<tr><td style="color:#999;text-align:center">${i+1}</td><td>${esc(a.nombre)}</td><td>${esc(a.rol||"")}</td></tr>`).join("");
  const ordenLis=(r.ordenDia||[]).filter(t=>t&&t.trim()).map((t,i)=>`<li style="margin-bottom:6px">${esc(t)}</li>`).join("");
  const acuerdosLis=(r.acuerdos||[]).filter(a=>a&&a.trim()).map(a=>`<li style="margin-bottom:6px">${esc(a)}</li>`).join("");
  const firmasBoxes=(r.firmantes||[]).filter(f=>f.nombre&&f.nombre.trim()).map(f=>`
    <div style="border:1px solid #ddd;border-radius:6px;padding:10px;text-align:center">
      <div style="height:44px;border-bottom:1.5px solid #333;margin-bottom:7px"></div>
      <div style="font-weight:600;font-size:12.5px">${esc(f.nombre)}</div>
      <div style="font-size:11px;color:#777">${esc(f.rol||"")}</div>
    </div>`).join("");
  const body=`
    <h1>Acta de reunión</h1>
    <div class="meta">${info.label}${r.grupoId?" · "+esc((state.grupos.find(g=>g.id===r.grupoId)||{}).nombre||""):""}${alV?" · "+esc(alV.al.nombre):""} · Generada el ${new Date().toLocaleDateString("es-ES")}</div>
    <table>
      <tr><th style="width:160px">Título / motivo</th><td>${esc(r.titulo||"—")}</td></tr>
      <tr><th>Fecha</th><td>${fmt2(r.fecha)}${r.horaInicio?" · "+r.horaInicio+(r.horaFin?" a "+r.horaFin:""):""}</td></tr>
      <tr><th>Lugar</th><td>${esc(r.lugar||"—")}</td></tr>
      <tr><th>Estado</th><td><span class="pill" style="background:${r.estado==="cerrada"?"#dcfce7":"#f1f5f9"};color:${r.estado==="cerrada"?"#166534":"#666"}">${r.estado==="cerrada"?"Cerrada":"Borrador"}</span></td></tr>
    </table>
    <h2>Asistentes</h2>
    ${asistRows?`<table><thead><tr><th style="width:30px"></th><th>Nombre</th><th>Rol / relación</th></tr></thead><tbody>${asistRows}</tbody></table>`:'<p style="color:#999;font-style:italic">Sin asistentes registrados.</p>'}
    <h2>Orden del día</h2>
    ${ordenLis?`<ol style="margin-left:18px">${ordenLis}</ol>`:'<p style="color:#999;font-style:italic">Sin orden del día registrado.</p>'}
    <h2>Desarrollo de la reunión</h2>
    <p style="white-space:pre-wrap;line-height:1.6">${r.desarrollo?esc(r.desarrollo):'<em style="color:#999">Sin desarrollo registrado.</em>'}</p>
    <h2>Acuerdos y compromisos adoptados</h2>
    ${acuerdosLis?`<ol style="margin-left:18px">${acuerdosLis}</ol>`:'<p style="color:#999;font-style:italic">Sin acuerdos registrados.</p>'}
    ${(r.observaciones||r.proximaFecha)?`<h2>Observaciones</h2>
      ${r.observaciones?`<p style="white-space:pre-wrap;line-height:1.6;margin-bottom:10px">${esc(r.observaciones)}</p>`:""}
      ${r.proximaFecha?`<p><strong>Próxima reunión:</strong> ${fmt2(r.proximaFecha)}${r.proximaHora?" · "+r.proximaHora:""}</p>`:""}`:""}
    <h2>Firmas de los asistentes</h2>
    ${firmasBoxes?`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-top:8px">${firmasBoxes}</div>`:'<p style="color:#999;font-style:italic">Sin firmantes definidos.</p>'}
  `;
  const portada=generarPortadaHTML(`Acta — ${r.titulo||"reunión"}`,
    [info.label, `Curso escolar: <strong>${esc(cursoEscolarEfectivo(null))}</strong>`, profesorNombreEfectivo(null)?`Elaborada por: <strong>${esc(profesorNombreEfectivo(null))}</strong>`:""],
    ["Asistentes","Orden del día","Desarrollo de la reunión","Acuerdos y compromisos adoptados",(r.observaciones||r.proximaFecha)?"Observaciones":"","Firmas de los asistentes"]);
  abrirVentanaInforme(`Acta — ${r.titulo||"reunión"}`, body, {portada});
};

