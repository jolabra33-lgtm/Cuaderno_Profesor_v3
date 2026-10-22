/* ============================================================================
   Cuaderno del profesor · Convivencia: AC, RC y parte de amonestación
   js/clase/convivencia.js
   ============================================================================ */

/* ---- Helpers de datos ---- */
function convEntradasAlumno(grupo,alumnoId,desde,hasta){
  return (grupo.convivencia||[]).filter(e=>e.alumnoId===alumnoId && (!desde||e.fecha>=desde) && (!hasta||e.fecha<=hasta));
}
function convContarTipos(grupo,alumnoId,desde,hasta){
  const entradas=convEntradasAlumno(grupo,alumnoId,desde,hasta);
  return {ac:entradas.filter(e=>e.tipo==="ac").length, rc:entradas.filter(e=>e.tipo==="rc").length, pa:entradas.filter(e=>e.tipo==="pa").length};
}
function paResumenTexto(pa){
  if(!pa) return "Sin datos";
  const n=(pa.faltasLeves||[]).length+(pa.faltasGraves||[]).length;
  const desc=(pa.descripcionHechos||"").trim();
  if(n && desc) return `${n} falta(s) marcada(s) — ${desc.slice(0,70)}${desc.length>70?"…":""}`;
  if(n) return `${n} falta(s) marcada(s)`;
  if(desc) return desc.slice(0,90);
  return "Sin rellenar todavía";
}

/* ---- Handlers ---- */
window.convSetCentro=(campo,valor)=>{
  if(campo==="nombre") state.centroNombre=valor;
  else if(campo==="codigo") state.centroCodigo=valor;
  save();
};
window.convAbrirModalNueva=()=>{ state.ui.convModalNueva=true; render(); };
window.convCerrarModalNueva=()=>{ state.ui.convModalNueva=false; render(); };
window.convActualizarModalTipo=()=>{
  const tipo=document.getElementById("convNTipo").value;
  const wrap=document.getElementById("convNDescripcionWrap"), aviso=document.getElementById("convNAvisoPA");
  if(wrap) wrap.style.display=tipo==="pa"?"none":"";
  if(aviso) aviso.style.display=tipo==="pa"?"":"none";
};
window.convCrearRegistro=()=>{
  const grupo=grupoActual();
  const alumnoId=document.getElementById("convNAlumno").value;
  const fecha=document.getElementById("convNFecha").value;
  const tipo=document.getElementById("convNTipo").value;
  if(!alumnoId||!fecha||!tipo){ mostrarAviso("Elige alumno/a, fecha y tipo."); return; }
  const entry={id:uid(),alumnoId,fecha,tipo,descripcion:""};
  if(tipo==="pa"){ entry.pa=convPADefault(); }
  else{ entry.descripcion=(document.getElementById("convNDescripcion").value||"").trim(); }
  if(!Array.isArray(grupo.convivencia)) grupo.convivencia=[];
  grupo.convivencia.push(entry);
  state.ui.convModalNueva=false;
  if(tipo==="pa"){ state.ui.convVista="detalle"; state.ui.convId=entry.id; }
  save(); render();
  mostrarToast(tipo==="pa"?"✓ Parte de amonestación creado":"✓ Registro guardado");
};
window.convAbrirDetalle=(id)=>{ state.ui.convVista="detalle"; state.ui.convId=id; save(); render(); };
window.convVolverLista=()=>{ state.ui.convVista="lista"; state.ui.convId=""; save(); render(); };
window.convEliminarRegistro=async (id)=>{
  if(!await confirmar("¿Eliminar este registro de convivencia? No se puede deshacer.")) return;
  const grupo=grupoActual();
  grupo.convivencia=(grupo.convivencia||[]).filter(e=>e.id!==id);
  state.ui.convVista="lista"; state.ui.convId="";
  save(); render();
  mostrarToast("Registro eliminado","info");
};
window.convSetCampoSimple=(campo,valor)=>{
  const grupo=grupoActual(); const entry=(grupo.convivencia||[]).find(e=>e.id===state.ui.convId);
  if(!entry) return; entry[campo]=valor; save();
};
window.convSetCampoPA=(campo,valor)=>{
  const grupo=grupoActual(); const entry=(grupo.convivencia||[]).find(e=>e.id===state.ui.convId);
  if(!entry) return; if(!entry.pa) entry.pa=convPADefault();
  entry.pa[campo]=valor; save();
};
window.convToggleCheckPA=(lista,id,checked)=>{
  const grupo=grupoActual(); const entry=(grupo.convivencia||[]).find(e=>e.id===state.ui.convId);
  if(!entry) return; if(!entry.pa) entry.pa=convPADefault();
  const arr=entry.pa[lista]; const idx=arr.indexOf(id);
  if(checked && idx===-1) arr.push(id);
  else if(!checked && idx!==-1) arr.splice(idx,1);
  save();
};
window.convFiltrar=()=>{
  state.ui.convFiltroAlumno=document.getElementById("convFiltroAlumno").value;
  state.ui.convFiltroTipo=document.getElementById("convFiltroTipo").value;
  save(); render();
};

/* ---- Modal "Nuevo registro" ---- */
function convModalNuevaHTML(grupo){
  return `<div class="modal-overlay" onclick="if(event.target===this) convCerrarModalNueva()">
    <div class="modal-box" style="max-width:460px">
      <div class="flex" style="justify-content:space-between;align-items:center">
        <h2 style="font-size:16px">Nuevo registro de convivencia</h2>
        <button class="ghost" onclick="convCerrarModalNueva()">✕</button>
      </div>
      <div class="grid" style="gap:10px;margin-top:10px">
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Alumno/a
          <select class="in" id="convNAlumno" style="width:100%;margin-top:4px">
            <option value="">— Elige —</option>
            ${grupo.alumnos.map(a=>`<option value="${a.id}">${esc(a.nombre)}</option>`).join("")}
          </select>
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Fecha
          <input type="date" class="in" id="convNFecha" style="width:100%;margin-top:4px" value="${agHoyStr()}">
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Tipo
          <select class="in" id="convNTipo" style="width:100%;margin-top:4px" onchange="convActualizarModalTipo()">
            ${CONV_TIPOS.map(t=>`<option value="${t.id}">${t.label}</option>`).join("")}
          </select>
        </label>
        <div id="convNDescripcionWrap">
          <label style="font-size:12.5px;color:var(--mut);font-weight:500">Descripción
            <textarea class="in" id="convNDescripcion" style="width:100%;margin-top:4px;min-height:70px" placeholder="Describe brevemente en qué consiste…"></textarea>
          </label>
        </div>
        <p class="sub" id="convNAvisoPA" style="display:none;margin:0">Al crearlo se abrirá el formulario completo del Parte de Amonestación para rellenarlo.</p>
      </div>
      <div class="flex" style="justify-content:flex-end;margin-top:16px">
        <button class="ghost" onclick="convCerrarModalNueva()">Cancelar</button>
        <button class="btn" onclick="convCrearRegistro()">Crear</button>
      </div>
    </div>
  </div>`;
}

/* ---- Vista lista ---- */
function renderConvivencia(grupo){
  const c=document.getElementById("tabContent");
  if(state.ui.convVista==="detalle"){ renderConvivenciaDetalle(grupo); return; }
  const filtroAl=state.ui.convFiltroAlumno||"", filtroTipo=state.ui.convFiltroTipo||"";
  let entradas=(grupo.convivencia||[]).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  if(filtroAl) entradas=entradas.filter(e=>e.alumnoId===filtroAl);
  if(filtroTipo) entradas=entradas.filter(e=>e.tipo===filtroTipo);
  const nombreAl=id=>{ const a=grupo.alumnos.find(x=>x.id===id); return a?a.nombre:"—"; };
  const filas=entradas.length?entradas.map(e=>{
    const info=convTipoInfo(e.tipo);
    const resumen=e.tipo==="pa"?paResumenTexto(e.pa):(e.descripcion||"—");
    return `<div class="row" style="cursor:pointer;align-items:flex-start;flex-direction:column;gap:2px" onclick="convAbrirDetalle('${e.id}')">
      <div class="flex" style="justify-content:space-between;width:100%">
        <div><strong style="font-size:13px">${esc(nombreAl(e.alumnoId))}</strong> <span class="badge" style="font-size:10px;color:${info.color};border-color:${info.color}">${info.corto}</span></div>
        <span style="font-size:12px;color:var(--mut)">${fmt2(e.fecha)}</span>
      </div>
      <div style="font-size:13px;color:var(--mut)">${esc(resumen)}</div>
    </div>`;
  }).join(""):'<p class="sub" style="margin:0">Todavía no hay registros de convivencia.</p>';
  c.innerHTML=`
  <div class="card">
    <div class="flex" style="justify-content:space-between;align-items:center">
      <h2 style="font-size:15px">⚖️ Convivencia</h2>
      <button class="btn" onclick="convAbrirModalNueva()">+ Nuevo registro</button>
    </div>
    <p class="sub" style="margin:6px 0 10px">AC (falta de actitud y comportamiento), RC (reconocimiento positivo) y PA (parte de amonestación, con las categorías del Decreto 193/2025). Puede haber varios registros el mismo día.</p>
    <div class="flex" style="gap:8px;flex-wrap:wrap;align-items:center">
      <select class="in" id="convFiltroAlumno" style="min-width:160px" onchange="convFiltrar()">
        <option value="">Todo el alumnado</option>
        ${grupo.alumnos.map(a=>`<option value="${a.id}" ${filtroAl===a.id?"selected":""}>${esc(a.nombre)}</option>`).join("")}
      </select>
      <select class="in" id="convFiltroTipo" style="min-width:140px" onchange="convFiltrar()">
        <option value="">Todos los tipos</option>
        ${CONV_TIPOS.map(t=>`<option value="${t.id}" ${filtroTipo===t.id?"selected":""}>${t.corto} — ${t.label.split(" — ")[1]}</option>`).join("")}
      </select>
      ${filtroAl?`<button class="ghost" style="border:1px solid var(--line)" onclick="convVerAlumno('${filtroAl}')">👁️ Ver informe</button>${grupoTieneEntrega(grupo,filtroAl,"conv")?`<span title="Informe entregado el ${fmt2(grupoTieneEntrega(grupo,filtroAl,"conv").fecha)}" style="color:#1e5631;font-weight:700;font-size:13px">✓</span>`:""}`:""}
    </div>
  </div>
  <div class="card">
    <h2 style="font-size:15px">Historial (${entradas.length})</h2>
    <div class="grid" style="gap:8px;margin-top:8px">${filas}</div>
  </div>
  ${state.ui.convModalNueva?convModalNuevaHTML(grupo):""}
  ${state.ui.convModalAl?convModalAlumnoHTML(grupo,grupo.alumnos.find(x=>x.id===state.ui.convModalAl)):""}`;
}
/* ---- Detalle por alumno/a: gráfico mensual + registro de entrega + impresión ---- */
function convPorMes(grupo,alId){
  const meses={};
  convEntradasAlumno(grupo,alId,null,null).forEach(e=>{
    const m=e.fecha.slice(0,7);
    if(!meses[m]) meses[m]={ac:0,rc:0,pa:0};
    if(meses[m][e.tipo]!==undefined) meses[m][e.tipo]++;
  });
  return meses;
}
function graficoConvivenciaAlumnoHTML(grupo,alId){
  const meses=convPorMes(grupo,alId);
  const keys=Object.keys(meses).sort();
  if(!keys.length) return '<p class="sub" style="margin:0">Sin registros de convivencia.</p>';
  const cats=keys.map(k=>{ const mIdx=Number(k.slice(5,7))-1; const nom=AG_MESES[mIdx]||""; return nom.slice(0,1).toUpperCase()+nom.slice(1,3); });
  return svgBarrasMultiserie(cats,[
    {nombre:"AC",color:"#c62839",valores:keys.map(k=>meses[k].ac)},
    {nombre:"RC",color:"#16a34a",valores:keys.map(k=>meses[k].rc)},
    {nombre:"PA",color:"#a3620a",valores:keys.map(k=>meses[k].pa)},
  ],{ancho:520,alto:150});
}
function convInformeAlumnoBodyHTML(grupo,al){
  const entradas=convEntradasAlumno(grupo,al.id,null,null).slice().sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const cnt=convContarTipos(grupo,al.id,null,null);
  const filas=entradas.map(e=>{
    const info=convTipoInfo(e.tipo);
    const resumen=e.tipo==="pa"?paResumenTexto(e.pa):(e.descripcion||"—");
    return `<tr><td>${fmt2(e.fecha)}</td><td style="color:${info.color};font-weight:700">${info.corto}</td><td>${esc(resumen)}</td></tr>`;
  }).join("");
  return `
    <div class="flex" style="gap:22px;margin:4px 0 16px;flex-wrap:wrap">
      <div><div style="font-size:11.5px;color:var(--mut)">AC</div><div style="font-size:20px;font-weight:700">${cnt.ac}</div></div>
      <div><div style="font-size:11.5px;color:var(--mut)">RC</div><div style="font-size:20px;font-weight:700">${cnt.rc}</div></div>
      <div><div style="font-size:11.5px;color:var(--mut)">PA</div><div style="font-size:20px;font-weight:700">${cnt.pa}</div></div>
    </div>
    ${graficoConvivenciaAlumnoHTML(grupo,al.id)}
    ${entradas.length?`<table style="margin-top:16px"><thead><tr><th>Fecha</th><th>Tipo</th><th>Resumen</th></tr></thead><tbody>${filas}</tbody></table>`:'<p class="sub" style="margin-top:12px">Sin registros.</p>'}
  `;
}
function convModalAlumnoHTML(grupo,al){
  if(!al) return "";
  const entrega=grupoTieneEntrega(grupo,al.id,"conv");
  const entregaBtn=entrega
    ?`<button class="ghost small" style="border:1px solid #bcdac8;color:#1e5631;background:#eef7f1" title="Pulsa para desmarcar" onclick="marcarInformeEntregado('${al.id}','conv')">✓ Entregado el ${fmt2(entrega.fecha)}</button>`
    :`<button class="ghost small" style="border:1px solid var(--line)" onclick="marcarInformeEntregado('${al.id}','conv')">Marcar como entregado</button>`;
  return `<div class="modal-overlay" onclick="if(event.target===this) convCerrarAlumno()">
    <div class="modal-box" style="max-width:80vw;width:80vw;max-height:80vh;display:flex;flex-direction:column;padding:0;overflow:hidden">
      <div style="padding:14px 26px;border-bottom:1px solid var(--line);flex-shrink:0">
        <div class="flex" style="justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap">
          <div style="font-weight:700;font-size:15px">👁️ Convivencia de ${esc(al.nombre)}</div>
          <div class="flex" style="flex-shrink:0;flex-wrap:wrap">
            ${entregaBtn}
            <button class="ghost" style="border:1px solid var(--line)" onclick="convImprimirAlumno('${al.id}')">🖨️ Imprimir</button>
            <button class="modal-close" onclick="convCerrarAlumno()" aria-label="Cerrar">×</button>
          </div>
        </div>
        <p class="sub" style="margin:4px 0 0">Historial completo del curso</p>
      </div>
      <div style="overflow-y:auto;padding:20px 26px;flex:1">
        ${convInformeAlumnoBodyHTML(grupo,al)}
      </div>
    </div>
  </div>`;
}
window.convVerAlumno=alId=>{ state.ui.convModalAl=alId; save(); render(); };
window.convCerrarAlumno=()=>{ state.ui.convModalAl=""; save(); render(); };
window.convImprimirAlumno=alId=>{
  const grupo=grupoActual(); if(!grupo) return;
  const al=grupo.alumnos.find(a=>a.id===alId); if(!al) return;
  const cat=getCatalogo(grupo.catalogoKey);
  const body=`
    <h1>Informe de convivencia</h1>
    <div class="meta">${esc(al.nombre)} · ${esc(grupo.nombre)} · ${esc(cat.materia)} · Generado el ${new Date().toLocaleDateString("es-ES")}</div>
    ${convInformeAlumnoBodyHTML(grupo,al)}
  `;
  const portada=generarPortadaHTML(`Informe de convivencia — ${al.nombre}`,
    [`${esc(grupo.nombre)} · ${esc(cat.materia)}`,
     `Curso escolar: <strong>${esc(cursoEscolarEfectivo(null))}</strong>`,
     profesorNombreEfectivo(null)?`Elaborado por: <strong>${esc(profesorNombreEfectivo(null))}</strong>`:""], []);
  abrirVentanaInforme(`Convivencia · ${al.nombre}`, body, {portada});
};

/* ---- Vista detalle (AC/RC simple, o formulario PA completo) ---- */
function paChecklistHTML(lista,catalogo,marcados){
  const quienClase={Prof:"prof",Dir:"dir",Exp:"exp"};
  return catalogo.map(item=>`
    <label class="pa-check-item">
      <input type="checkbox" ${marcados.includes(item.id)?"checked":""} onchange="convToggleCheckPA('${lista}','${item.id}',this.checked)">
      <span>${esc(item.texto)}${item.quien?` <span class="pa-badge-who ${quienClase[item.quien]||''}">${item.quien}</span>`:""}</span>
    </label>`).join("");
}
function renderConvivenciaDetalle(grupo){
  const c=document.getElementById("tabContent");
  const entry=(grupo.convivencia||[]).find(e=>e.id===state.ui.convId);
  if(!entry){ state.ui.convVista="lista"; renderConvivencia(grupo); return; }
  const al=grupo.alumnos.find(a=>a.id===entry.alumnoId);
  const info=convTipoInfo(entry.tipo);
  if(entry.tipo!=="pa"){
    c.innerHTML=`<div class="card">
      <button class="ghost" style="border:1px solid var(--line)" onclick="convVolverLista()">← Volver al listado</button>
      <h2 style="font-size:15px;margin-top:10px">${info.label}</h2>
      <div style="font-size:13px;color:var(--mut);margin-bottom:10px">${esc(al?al.nombre:"—")} · ${esc(grupo.nombre)}</div>
      <label style="font-size:12.5px;color:var(--mut);font-weight:500;max-width:220px">Fecha
        <input type="date" class="in" style="width:100%;margin-top:4px" value="${entry.fecha}" onchange="convSetCampoSimple('fecha',this.value)">
      </label>
      <label style="font-size:12.5px;color:var(--mut);font-weight:500;display:block;margin-top:10px">Descripción
        <textarea class="in" style="width:100%;margin-top:4px;min-height:100px;resize:vertical" onchange="convSetCampoSimple('descripcion',this.value)">${esc(entry.descripcion||"")}</textarea>
      </label>
      <div class="flex" style="margin-top:14px">
        <button class="ghost danger" onclick="convEliminarRegistro('${entry.id}')">Eliminar registro</button>
      </div>
    </div>`;
    return;
  }
  const pa=entry.pa||(entry.pa=convPADefault());
  const cat=getCatalogo(grupo.catalogoKey);
  c.innerHTML=`
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px">
      <button class="ghost" style="border:1px solid var(--line)" onclick="convVolverLista()">← Volver al listado</button>
      <div class="flex">
        <button class="ghost" style="border:1px solid var(--line)" onclick="convImprimirPA('${entry.id}')">🖨️ Imprimir parte</button>
        <button class="ghost danger" onclick="convEliminarRegistro('${entry.id}')">Eliminar</button>
      </div>
    </div>
    <div class="pa-form-card">
      <div class="pa-form-header">
        <div style="flex:1;min-width:200px">
          <input class="pa-centro-nombre" placeholder="NOMBRE DEL CENTRO (OPCIONAL)" value="${esc(state.centroNombre||"")}" onchange="convSetCentro('nombre',this.value)">
          <input class="pa-centro-codigo" placeholder="Código de centro (opcional)" value="${esc(state.centroCodigo||"")}" onchange="convSetCentro('codigo',this.value)">
        </div>
        <div class="pa-decreto-badge">
          <strong>DECRETO 193/2025</strong>
          Gestión de Convivencia
        </div>
      </div>
      <div class="pa-title-strip">Hoja de Registro de Incidencias</div>
      <div class="pa-body">
        <div class="flex" style="flex-wrap:wrap;gap:14px 20px;margin-bottom:6px">
          <div style="flex:2;min-width:200px">
            <span class="pa-field-label">Alumno/a</span>
            <div style="font-size:.95rem;font-weight:600">${esc(al?al.nombre:"—")}</div>
          </div>
          <div style="flex:1;min-width:120px">
            <span class="pa-field-label">Grupo</span>
            <div style="font-size:.95rem;font-weight:600">${esc(grupo.nombre)}</div>
          </div>
          <div style="flex:1;min-width:130px">
            <span class="pa-field-label">Fecha *</span>
            <input type="date" class="in" style="width:100%" value="${entry.fecha}" onchange="convSetCampoSimple('fecha',this.value)">
          </div>
        </div>
        <div class="flex" style="flex-wrap:wrap;gap:14px 20px;margin-top:10px">
          <div style="flex:2;min-width:200px">
            <span class="pa-field-label">Profesor/a</span>
            <input class="in" style="width:100%" placeholder="Nombre del docente" value="${esc(pa.profesor)}" onchange="convSetCampoPA('profesor',this.value)">
          </div>
          <div style="flex:1.3;min-width:150px">
            <span class="pa-field-label">Materia</span>
            <input class="in" style="width:100%" value="${esc(pa.materia||cat.materia)}" onchange="convSetCampoPA('materia',this.value)">
          </div>
          <div style="flex:.8;min-width:100px">
            <span class="pa-field-label">Hora</span>
            <input type="time" class="in" style="width:100%" value="${esc(pa.hora)}" onchange="convSetCampoPA('hora',this.value)">
          </div>
        </div>

        <div class="pa-conduct-section leve">
          <div class="pa-conduct-header">
            <span>1. Faltas leves</span>
            <span style="font-size:.68rem;background:#f39c12;color:#fff;padding:2px 10px;border-radius:20px">Prescripción: 20 días</span>
          </div>
          <div class="pa-conduct-body">
            <div class="pa-check-grid">${paChecklistHTML("faltasLeves",CONV_FALTAS_LEVES,pa.faltasLeves)}</div>
            <hr class="pa-measures-divider">
            <div class="pa-measures-label">Medidas correctoras (art. 24.1)</div>
            <div class="pa-check-grid">${paChecklistHTML("medidasLeves",CONV_MEDIDAS_LEVES,pa.medidasLeves)}</div>
          </div>
        </div>

        <div class="pa-conduct-section grave">
          <div class="pa-conduct-header">
            <span>2. Faltas graves</span>
            <span style="font-size:.68rem;background:#c0392b;color:#fff;padding:2px 10px;border-radius:20px">Prescripción: 2 meses</span>
          </div>
          <div class="pa-conduct-body">
            <div class="pa-check-grid">${paChecklistHTML("faltasGraves",CONV_FALTAS_GRAVES,pa.faltasGraves)}</div>
            <hr class="pa-measures-divider">
            <div class="pa-measures-label">Medidas disciplinarias — Expediente (art. 26.2)</div>
            <div class="pa-check-grid">${paChecklistHTML("medidasGraves",CONV_MEDIDAS_GRAVES,pa.medidasGraves)}</div>
          </div>
        </div>

        <div style="margin-top:18px">
          <span class="pa-field-label">Descripción de los hechos</span>
          <textarea class="in" style="width:100%;min-height:100px;resize:vertical" placeholder="Descripción detallada de la incidencia…" onchange="convSetCampoPA('descripcionHechos',this.value)">${esc(pa.descripcionHechos)}</textarea>
        </div>
        <div style="margin-top:12px">
          <span class="pa-field-label">Observaciones</span>
          <textarea class="in" style="width:100%;min-height:60px;resize:vertical" placeholder="Observaciones adicionales…" onchange="convSetCampoPA('observaciones',this.value)">${esc(pa.observaciones)}</textarea>
        </div>
      </div>
    </div>`;
}

/* ---- Impresión del Parte de Amonestación ---- */
window.convImprimirPA=(id)=>{
  const grupo=grupoActual();
  const entry=(grupo.convivencia||[]).find(e=>e.id===id); if(!entry) return;
  const al=grupo.alumnos.find(a=>a.id===entry.alumnoId);
  const cat=getCatalogo(grupo.catalogoKey);
  const pa=entry.pa||convPADefault();
  const listaMarcada=(lista,marcados)=>{
    const activos=lista.filter(x=>(marcados||[]).includes(x.id));
    return activos.length? `<ul style="margin:4px 0 0 18px">${activos.map(x=>`<li style="margin-bottom:4px">${esc(x.texto)}${x.quien?` <em>(${x.quien})</em>`:""}</li>`).join("")}</ul>` : '<p style="color:#999;font-style:italic;margin:4px 0 0">Ninguna marcada.</p>';
  };
  const body=`
    <div style="background:linear-gradient(135deg,#152a44,#25456b);color:#fff;padding:16px 22px;border-radius:10px 10px 0 0;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">
      <div>
        <div style="font-size:1.15rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em">${esc(state.centroNombre)||"Hoja de Registro de Incidencias"}</div>
        ${state.centroCodigo?`<div style="font-size:.75rem;color:rgba(255,255,255,.7);margin-top:2px">Cód. Centro: ${esc(state.centroCodigo)}</div>`:""}
      </div>
      <div style="text-align:right;background:rgba(0,0,0,.2);padding:6px 14px;border-radius:6px;font-size:.72rem;line-height:1.5">
        <strong style="font-size:.8rem;display:block;color:#f0a35e">DECRETO 193/2025</strong>
        Gestión de Convivencia
      </div>
    </div>
    <div style="background:#e8ecf0;padding:8px 22px;text-align:center;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#25456b;border-radius:0 0 10px 10px;margin-bottom:16px">Hoja de Registro de Incidencias</div>
    <h1 style="margin-top:0">Parte de Amonestación</h1>
    <div class="meta">${esc(grupo.nombre)} · ${esc(cat.materia)} · Generado el ${new Date().toLocaleDateString("es-ES")}</div>
    <table><tbody>
      <tr><th style="width:170px">Alumno/a</th><td>${esc(al?al.nombre:"—")}</td></tr>
      <tr><th>Grupo</th><td>${esc(grupo.nombre)}</td></tr>
      <tr><th>Fecha</th><td>${fmt2(entry.fecha)}</td></tr>
      <tr><th>Profesor/a</th><td>${esc(pa.profesor)||"—"}</td></tr>
      <tr><th>Materia</th><td>${esc(pa.materia)||"—"}</td></tr>
      <tr><th>Hora</th><td>${esc(pa.hora)||"—"}</td></tr>
    </tbody></table>
    <h2>1. Faltas leves</h2>${listaMarcada(CONV_FALTAS_LEVES,pa.faltasLeves)}
    <h2>Medidas correctoras (art. 24.1)</h2>${listaMarcada(CONV_MEDIDAS_LEVES,pa.medidasLeves)}
    <h2>2. Faltas graves</h2>${listaMarcada(CONV_FALTAS_GRAVES,pa.faltasGraves)}
    <h2>Medidas disciplinarias — expediente (art. 26.2)</h2>${listaMarcada(CONV_MEDIDAS_GRAVES,pa.medidasGraves)}
    <h2>Descripción de los hechos</h2><p style="white-space:pre-wrap">${esc(pa.descripcionHechos)||"—"}</p>
    <h2>Observaciones</h2><p style="white-space:pre-wrap">${esc(pa.observaciones)||"—"}</p>
  `;
  abrirVentanaInforme(`Parte de amonestación — ${al?al.nombre:""}`, body);
};

