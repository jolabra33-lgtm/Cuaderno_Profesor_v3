/* ============================================================================
   Cuaderno del profesor · Asistencia (y constantes de convivencia y familias)
   js/clase/asistencia.js
   ============================================================================ */

/* ---------- Ajustes ---------- */
/* =================================================================
   DIARIO DE CLASE — un registro por grupo de qué se ha dado cada día,
   para saber siempre por dónde va cada grupo. Una entrada por fecha
   (guardadas en grupo.diario, un objeto {fecha: nota}), editable e
   imprimible. Vive dentro del propio grupo, no en el estado global.
   ================================================================= */
/* =================================================================
   ASISTENCIA — pasar lista por grupo, cualquier fecha (sin relación
   con el horario semanal). Solo se guardan las excepciones (falta
   justificada/no justificada/retraso); "presente" es el valor por
   defecto y no ocupa espacio en el almacenamiento. Con nota opcional
   por registro, y un resumen por alumno filtrable por semana, mes o
   curso completo, imprimible y también incluido en el informe de
   evaluación individual.
   ================================================================= */
const ASIST_ESTADOS=[
  {id:"presente",label:"Presente",color:"#16a34a"},
  {id:"falta_justificada",label:"Falta justificada",color:"#2563eb"},
  {id:"falta_no_justificada",label:"Falta no justificada",color:"#dc2626"},
  {id:"retraso",label:"Retraso",color:"#b45309"}
];
function asistEstadoInfo(id){ return ASIST_ESTADOS.find(e=>e.id===id)||ASIST_ESTADOS[0]; }

/* =================================================================
   CONVIVENCIA — AC (falta de actitud/comportamiento), RC (reconocimiento
   positivo) y PA (parte de amonestación, con las categorías oficiales del
   Decreto 193/2025 de convivencia). Varios registros por alumno/a y día.
   ================================================================= */
const CONV_TIPOS=[
  {id:"ac", label:"AC — Falta de actitud y comportamiento", corto:"AC", color:"#c62839"},
  {id:"rc", label:"RC — Reconocimiento positivo", corto:"RC", color:"#16a34a"},
  {id:"pa", label:"PA — Parte de amonestación", corto:"PA", color:"#a3620a"},
];
function convTipoInfo(id){ return CONV_TIPOS.find(t=>t.id===id)||CONV_TIPOS[0]; }
const CONV_FALTAS_LEVES=[
  {id:"L_a",texto:"Puntualidad / Asistencia."},
  {id:"L_b",texto:"Alterar el desarrollo de las actividades."},
  {id:"L_c",texto:"Sustancias no permitidas."},
  {id:"L_d",texto:"Dificultar el derecho al estudio de los compañeros/as."},
  {id:"L_e",texto:"Incitación a actos contrarios a las normas de convivencia."},
  {id:"L_f",texto:"Incorrección hacia otros miembros de la comunidad educativa."},
  {id:"L_g",texto:"Falta de colaboración / material."},
  {id:"L_h",texto:"Uso de móviles / tecnología no autorizada."},
  {id:"L_i",texto:"Uso inadecuado de las TIC."},
  {id:"L_j",texto:"Otras conductas leves."},
];
const CONV_MEDIDAS_LEVES=[
  {id:"ML_a",texto:"Amonestación verbal.",quien:"Prof"},
  {id:"ML_b",texto:"Amonestación escrita.",quien:"Prof"},
  {id:"ML_c",texto:"Comparecencia ante Jefatura.",quien:"Prof"},
  {id:"ML_d",texto:"Trabajos en horario no lectivo.",quien:"Prof"},
  {id:"ML_e",texto:"Reparar los daños causados.",quien:"Dir"},
  {id:"ML_f",texto:"Retirada de objetos.",quien:"Dir"},
  {id:"ML_g",texto:"Suspensión de actividades extraescolares (< 15 días).",quien:"Dir"},
  {id:"ML_h",texto:"Cambio de grupo (< 5 días).",quien:"Dir"},
  {id:"ML_i",texto:"Suspensión de asistencia (< 3 días).",quien:"Dir"},
];
const CONV_FALTAS_GRAVES=[
  {id:"G_a",texto:"Indisciplina / injuria grave."},
  {id:"G_b",texto:"Acoso / ciberacoso."},
  {id:"G_c",texto:"Agresión / violencia de género."},
  {id:"G_d",texto:"Discriminación / vejación."},
  {id:"G_e",texto:"Grabación / difusión de imágenes."},
  {id:"G_f",texto:"Daños graves en bienes."},
  {id:"G_g",texto:"Suplantación de personalidad."},
  {id:"G_h",texto:"Daño a la autoridad del profesor."},
  {id:"G_i",texto:"Falsificación de documentos."},
  {id:"G_j",texto:"Sustancias prohibidas (uso/venta)."},
  {id:"G_k",texto:"Perjudicial para la salud."},
  {id:"G_l",texto:"Incitación a falta grave."},
  {id:"G_m",texto:"Incumplimiento de sanción."},
  {id:"G_n",texto:"Delitos informáticos."},
  {id:"G_o",texto:"Robo con violencia."},
  {id:"G_p",texto:"Hurto / daño en instalaciones."},
  {id:"G_q",texto:"Otros delitos del Código Penal."},
];
const CONV_MEDIDAS_GRAVES=[
  {id:"MG_a",texto:"Tareas educativas fuera de horario.",quien:"Exp"},
  {id:"MG_b",texto:"Suspensión de extraescolares (15-30 días).",quien:"Exp"},
  {id:"MG_c",texto:"Suspensión de patio (< 7 días).",quien:"Exp"},
  {id:"MG_d",texto:"Cambio de grupo definitivo.",quien:"Exp"},
  {id:"MG_e",texto:"Suspensión de materias (7-15 días).",quien:"Exp"},
  {id:"MG_f",texto:"Suspensión de asistencia al centro (15-30 días).",quien:"Exp"},
  {id:"MG_g",texto:"Suspensión de transporte/comedor (7-15 días).",quien:"Exp"},
  {id:"MG_h",texto:"Cambio de centro.",quien:"Exp"},
];
function convPADefault(){
  return { profesor:"", materia:"", hora:"", faltasLeves:[], medidasLeves:[], faltasGraves:[], medidasGraves:[], descripcionHechos:"", observaciones:"" };
}

/* =================================================================
   CONTACTO CON FAMILIAS — registro ligero (llamada, email, nota escrita,
   reunión informal u otro), independiente del informe individual del
   alumno/a a propósito, para no mezclarlo con las notas académicas.
   ================================================================= */
const FAM_MEDIOS=[
  {id:"llamada", label:"Llamada telefónica", icono:"📞"},
  {id:"email", label:"Email", icono:"✉️"},
  {id:"nota", label:"Nota escrita", icono:"📝"},
  {id:"reunion", label:"Reunión informal", icono:"🗣️"},
  {id:"otro", label:"Otro", icono:"•"},
];
function famMedioInfo(id){ return FAM_MEDIOS.find(m=>m.id===id)||FAM_MEDIOS[FAM_MEDIOS.length-1]; }
function asistDelDia(grupo,fecha,alumnoId){
  const dia=grupo.asistencia&&grupo.asistencia[fecha];
  if(dia && dia[alumnoId]) return dia[alumnoId];
  return {estado:"presente",nota:""};
}
function asistContarPeriodo(grupo,alumnoId,desde,hasta){
  const conteo={falta_justificada:0,falta_no_justificada:0,retraso:0};
  Object.keys(grupo.asistencia||{}).forEach(fecha=>{
    if(fecha<desde||fecha>hasta) return;
    const reg=grupo.asistencia[fecha][alumnoId];
    if(reg && conteo[reg.estado]!==undefined) conteo[reg.estado]++;
  });
  return conteo;
}
function asistResumenTextoPlano(grupo,alumnoId,desde,hasta){
  const c=asistContarPeriodo(grupo,alumnoId,desde,hasta);
  return `${c.falta_justificada} falta(s) justificada(s), ${c.falta_no_justificada} no justificada(s), ${c.retraso} retraso(s)`;
}
window.asistSeleccionarFecha=(f)=>{ state.ui.asistFecha=f; save(); render(); };
window.asistMarcar=(alumnoId,estado)=>{
  const grupo=grupoActual(); const fecha=state.ui.asistFecha||agHoyStr();
  if(!grupo.asistencia) grupo.asistencia={};
  if(estado==="presente"){
    if(grupo.asistencia[fecha]) delete grupo.asistencia[fecha][alumnoId];
  }else{
    if(!grupo.asistencia[fecha]) grupo.asistencia[fecha]={};
    const notaActual=(grupo.asistencia[fecha][alumnoId]&&grupo.asistencia[fecha][alumnoId].nota)||"";
    grupo.asistencia[fecha][alumnoId]={estado,nota:notaActual};
  }
  save(); render();
};
window.asistSetNota=(alumnoId,nota)=>{
  const grupo=grupoActual(); const fecha=state.ui.asistFecha||agHoyStr();
  if(!grupo.asistencia || !grupo.asistencia[fecha] || !grupo.asistencia[fecha][alumnoId]) return;
  grupo.asistencia[fecha][alumnoId].nota=nota.trim();
  save();
};
window.asistMarcarTodosPresentes=()=>{
  const grupo=grupoActual(); const fecha=state.ui.asistFecha||agHoyStr();
  if(grupo.asistencia && grupo.asistencia[fecha]){ delete grupo.asistencia[fecha]; save(); render(); }
};
window.asistRangoRapido=(tipo)=>{
  const hoy=new Date(); let desde,hasta;
  const iso=d=>d.toISOString().slice(0,10);
  if(tipo==="semana"){
    const diaSemana=hoy.getDay()||7;
    const lunes=new Date(hoy); lunes.setDate(hoy.getDate()-diaSemana+1);
    const domingo=new Date(lunes); domingo.setDate(lunes.getDate()+6);
    desde=iso(lunes); hasta=iso(domingo);
  }else if(tipo==="mes"){
    desde=iso(new Date(hoy.getFullYear(),hoy.getMonth(),1));
    hasta=iso(new Date(hoy.getFullYear(),hoy.getMonth()+1,0));
  }else{
    // "Curso completo": del inicio de la 1ª Evaluación al fin de la 3ª (Ajustes). Si el
    // grupo todavía no tiene esas fechas configuradas, se mantiene el rango abierto de antes.
    const g=grupoActual();
    const ft=Array.isArray(g&&g.fechasTrimestre)?g.fechasTrimestre:[];
    const inicioCurso=ft[0]&&ft[0].inicio, finCurso=ft[2]&&ft[2].fin;
    desde=inicioCurso||"2000-01-01"; hasta=finCurso||"2099-12-31";
  }
  state.ui.asistDesde=desde; state.ui.asistHasta=hasta;
  save(); render();
};
window.asistActualizarRango=()=>{
  state.ui.asistDesde=document.getElementById("asistDesde").value;
  state.ui.asistHasta=document.getElementById("asistHasta").value;
  save(); render();
};
/* Escritura manual de las fechas de asistencia (además del calendario). Si el texto no se
   reconoce como una fecha válida, se avisa y se vuelve a pintar con el valor anterior. */
window.asistFechaTextoChange=(txt)=>{
  const iso=parseFechaFlexible(txt);
  if(!iso){ mostrarToast("Fecha no válida. Usa el formato dd/mm/aaaa."); render(); return; }
  asistSeleccionarFecha(iso);
};
window.asistDesdeTextoChange=(txt)=>{
  const iso=parseFechaFlexible(txt);
  if(!iso){ mostrarToast("Fecha no válida. Usa el formato dd/mm/aaaa."); render(); return; }
  const inp=document.getElementById("asistDesde"); if(inp) inp.value=iso;
  asistActualizarRango();
};
window.asistHastaTextoChange=(txt)=>{
  const iso=parseFechaFlexible(txt);
  if(!iso){ mostrarToast("Fecha no válida. Usa el formato dd/mm/aaaa."); render(); return; }
  const inp=document.getElementById("asistHasta"); if(inp) inp.value=iso;
  asistActualizarRango();
};
/* Rango por defecto de la pestaña de Asistencia cuando el profesor/a todavía no ha tocado
   Desde/Hasta: el curso completo, tomado de las fechas de evaluación (Ajustes) — el inicio
   de curso coincide con el inicio de la 1ª Evaluación y el final con el fin de la 3ª. Si esas
   fechas no están configuradas, se mantiene el comportamiento anterior (hoy). */
function asistRangoPorDefecto(grupo){
  const ft=Array.isArray(grupo&&grupo.fechasTrimestre)?grupo.fechasTrimestre:[];
  const inicioCurso=ft[0]&&ft[0].inicio, finCurso=ft[2]&&ft[2].fin;
  return { desde: inicioCurso||agHoyStr(), hasta: finCurso||agHoyStr() };
}
function renderAsistencia(grupo){
  const c=document.getElementById("tabContent");
  const fecha=state.ui.asistFecha||agHoyStr();
  const rangoDef=asistRangoPorDefecto(grupo);
  const desde=state.ui.asistDesde||rangoDef.desde;
  const hasta=state.ui.asistHasta||rangoDef.hasta;
  const filasLista=grupo.alumnos.length?grupo.alumnos.map(al=>{
    const reg=asistDelDia(grupo,fecha,al.id);
    return `<div class="row" style="flex-wrap:wrap;gap:8px;align-items:center">
      <div style="flex:1;min-width:150px"><strong style="font-size:13.5px">${esc(al.nombre)}</strong></div>
      <div class="flex" style="gap:4px;flex-wrap:wrap">
        ${ASIST_ESTADOS.map(e=>`<button class="chip ${reg.estado===e.id?"on":""}" style="font-size:12px;padding:5px 10px${reg.estado===e.id?`;background:${e.color};color:#fff;border-color:${e.color}`:""}" onclick="asistMarcar('${al.id}','${e.id}')">${e.label}</button>`).join("")}
      </div>
      ${reg.estado!=="presente"?`<input class="in" style="flex:1;min-width:160px;font-size:12.5px;padding:5px 9px" placeholder="Nota (opcional)…" value="${esc(reg.nota||"")}" onchange="asistSetNota('${al.id}',this.value)">`:""}
    </div>`;
  }).join(""):'<p class="sub" style="margin:0">Este grupo todavía no tiene alumnado.</p>';

  const resumenFilas=grupo.alumnos.length?grupo.alumnos.map(al=>{
    const cnt=asistContarPeriodo(grupo,al.id,desde,hasta);
    return `<tr><td>${esc(al.nombre)}</td>
      <td style="text-align:center">${cnt.falta_justificada||"—"}</td>
      <td style="text-align:center">${cnt.falta_no_justificada||"—"}</td>
      <td style="text-align:center">${cnt.retraso||"—"}</td>
      <td><button class="ghost small" style="border:1px solid var(--line)" title="Ver el detalle de asistencia de ${esc(al.nombre)}" onclick="asistVerAlumno('${al.id}')">👁️</button>${grupoTieneEntrega(grupo,al.id,asistPeriodoKey(desde,hasta))?`<span title="Informe entregado el ${fmt2(grupoTieneEntrega(grupo,al.id,asistPeriodoKey(desde,hasta)).fecha)}" style="margin-left:4px;color:#1e5631;font-weight:700;font-size:13px">✓</span>`:""}</td></tr>`;
  }).join(""):"";

  c.innerHTML=`
  <div class="card">
    <h2 style="font-size:15px">📋 Pasar lista</h2>
    <p class="sub" style="margin:0 0 10px">Cualquier fecha, sin relación con tu horario semanal. Por defecto, todo el alumnado está "Presente" — solo marca las excepciones.</p>
    <label style="font-size:12.5px;color:var(--mut);font-weight:500;display:block;max-width:260px;margin-bottom:10px">Fecha
      <div style="margin-top:4px">${campoFechaDualHTML("asistFechaInput",fecha,"asistFechaTextoChange(this.value)","asistSeleccionarFecha(this.value)")}</div>
    </label>
    <div class="grid" style="gap:8px">${filasLista}</div>
    ${grupo.alumnos.length?`<button class="ghost" style="border:1px solid var(--line);margin-top:10px" onclick="asistMarcarTodosPresentes()">Marcar todos presentes este día</button>`:""}
  </div>
  <div class="card">
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <h2 style="font-size:15px">Resumen</h2>
      ${grupo.alumnos.length?`<button class="ghost" style="border:1px solid var(--line)" onclick="asistImprimirResumen()">🖨️ Imprimir resumen</button>`:""}
    </div>
    <div class="flex" style="margin-top:8px;flex-wrap:wrap">
      <button class="chip" onclick="asistRangoRapido('semana')">Esta semana</button>
      <button class="chip" onclick="asistRangoRapido('mes')">Este mes</button>
      <button class="chip" onclick="asistRangoRapido('curso')">Curso completo</button>
    </div>
    <div class="flex" style="margin-top:8px;flex-wrap:wrap">
      <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1;min-width:180px">Desde
        <div style="margin-top:4px">${campoFechaDualHTML("asistDesde",desde,"asistDesdeTextoChange(this.value)","asistActualizarRango()")}</div>
      </label>
      <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1;min-width:180px">Hasta
        <div style="margin-top:4px">${campoFechaDualHTML("asistHasta",hasta,"asistHastaTextoChange(this.value)","asistActualizarRango()")}</div>
      </label>
    </div>
    ${grupo.alumnos.length?`<div style="overflow-x:auto;margin-top:12px"><table>
      <thead><tr><th>Alumno/a</th><th style="text-align:center">Faltas justif.</th><th style="text-align:center">Faltas no justif.</th><th style="text-align:center">Retrasos</th><th></th></tr></thead>
      <tbody>${resumenFilas}</tbody>
    </table></div>`:""}
  </div>
  ${state.ui.asistModalAl?asistModalAlumnoHTML(grupo,grupo.alumnos.find(x=>x.id===state.ui.asistModalAl),desde,hasta):""}`;
}
/* ---- Detalle por alumno/a: gráfico mensual + registro de entrega + impresión ---- */
function asistPeriodoKey(desde,hasta){ return `asist:${desde}_${hasta}`; }
function asistPorMes(grupo,alId,desde,hasta){
  const meses={};
  Object.keys(grupo.asistencia||{}).sort().forEach(fecha=>{
    if(fecha<desde||fecha>hasta) return;
    const reg=grupo.asistencia[fecha][alId]; if(!reg||reg.estado==="presente") return;
    const m=fecha.slice(0,7);
    if(!meses[m]) meses[m]={falta_justificada:0,falta_no_justificada:0,retraso:0};
    if(meses[m][reg.estado]!==undefined) meses[m][reg.estado]++;
  });
  return meses;
}
function asistEntradasAlumno(grupo,alId,desde,hasta){
  return Object.keys(grupo.asistencia||{}).sort().filter(fecha=>{
    if(fecha<desde||fecha>hasta) return false;
    const reg=grupo.asistencia[fecha][alId];
    return reg && reg.estado!=="presente";
  }).map(fecha=>({fecha,...grupo.asistencia[fecha][alId]}));
}
function graficoAsistenciaAlumnoHTML(grupo,alId,desde,hasta){
  const meses=asistPorMes(grupo,alId,desde,hasta);
  const keys=Object.keys(meses).sort();
  if(!keys.length) return '<p class="sub" style="margin:0">Sin faltas ni retrasos registrados en este periodo.</p>';
  const cats=keys.map(k=>{ const mIdx=Number(k.slice(5,7))-1; const nom=AG_MESES[mIdx]||""; return nom.slice(0,1).toUpperCase()+nom.slice(1,3); });
  return svgBarrasMultiserie(cats,[
    {nombre:"Justif.",color:"#2563eb",valores:keys.map(k=>meses[k].falta_justificada)},
    {nombre:"No justif.",color:"#dc2626",valores:keys.map(k=>meses[k].falta_no_justificada)},
    {nombre:"Retraso",color:"#b45309",valores:keys.map(k=>meses[k].retraso)},
  ],{ancho:520,alto:150});
}
function asistInformeAlumnoBodyHTML(grupo,al,desde,hasta){
  const cnt=asistContarPeriodo(grupo,al.id,desde,hasta);
  const entradas=asistEntradasAlumno(grupo,al.id,desde,hasta);
  const filas=entradas.map(e=>`<tr><td>${fmt2(e.fecha)}</td><td>${asistEstadoInfo(e.estado).label}</td><td>${esc(e.nota||"—")}</td></tr>`).join("");
  return `
    <div class="flex" style="gap:22px;margin:4px 0 16px;flex-wrap:wrap">
      <div><div style="font-size:11.5px;color:var(--mut)">Faltas justificadas</div><div style="font-size:20px;font-weight:700">${cnt.falta_justificada}</div></div>
      <div><div style="font-size:11.5px;color:var(--mut)">Faltas no justificadas</div><div style="font-size:20px;font-weight:700">${cnt.falta_no_justificada}</div></div>
      <div><div style="font-size:11.5px;color:var(--mut)">Retrasos</div><div style="font-size:20px;font-weight:700">${cnt.retraso}</div></div>
    </div>
    ${graficoAsistenciaAlumnoHTML(grupo,al.id,desde,hasta)}
    ${entradas.length?`<table style="margin-top:16px"><thead><tr><th>Fecha</th><th>Estado</th><th>Nota</th></tr></thead><tbody>${filas}</tbody></table>`:""}
  `;
}
function asistModalAlumnoHTML(grupo,al,desde,hasta){
  if(!al) return "";
  const periodo=asistPeriodoKey(desde,hasta);
  const entrega=grupoTieneEntrega(grupo,al.id,periodo);
  const entregaBtn=entrega
    ?`<button class="ghost small" style="border:1px solid #bcdac8;color:#1e5631;background:#eef7f1" title="Pulsa para desmarcar" onclick="marcarInformeEntregado('${al.id}','${periodo}')">✓ Entregado el ${fmt2(entrega.fecha)}</button>`
    :`<button class="ghost small" style="border:1px solid var(--line)" onclick="marcarInformeEntregado('${al.id}','${periodo}')">Marcar como entregado</button>`;
  return `<div class="modal-overlay" onclick="if(event.target===this) asistCerrarAlumno()">
    <div class="modal-box" style="max-width:80vw;width:80vw;max-height:80vh;display:flex;flex-direction:column;padding:0;overflow:hidden">
      <div style="padding:14px 26px;border-bottom:1px solid var(--line);flex-shrink:0">
        <div class="flex" style="justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap">
          <div style="font-weight:700;font-size:15px">👁️ Asistencia de ${esc(al.nombre)}</div>
          <div class="flex" style="flex-shrink:0;flex-wrap:wrap">
            ${entregaBtn}
            <button class="ghost" style="border:1px solid var(--line)" onclick="asistImprimirAlumno('${al.id}')">🖨️ Imprimir</button>
            <button class="modal-close" onclick="asistCerrarAlumno()" aria-label="Cerrar">×</button>
          </div>
        </div>
        <p class="sub" style="margin:4px 0 0">Del ${fmt2(desde)} al ${fmt2(hasta)}</p>
      </div>
      <div style="overflow-y:auto;padding:20px 26px;flex:1">
        ${asistInformeAlumnoBodyHTML(grupo,al,desde,hasta)}
      </div>
    </div>
  </div>`;
}
window.asistVerAlumno=alId=>{ state.ui.asistModalAl=alId; save(); render(); };
window.asistCerrarAlumno=()=>{ state.ui.asistModalAl=""; save(); render(); };
window.asistImprimirAlumno=alId=>{
  const grupo=grupoActual(); if(!grupo) return;
  const al=grupo.alumnos.find(a=>a.id===alId); if(!al) return;
  const cat=getCatalogo(grupo.catalogoKey);
  const rangoDef=asistRangoPorDefecto(grupo);
  const desde=state.ui.asistDesde||rangoDef.desde, hasta=state.ui.asistHasta||rangoDef.hasta;
  const body=`
    <h1>Informe de asistencia</h1>
    <div class="meta">${esc(al.nombre)} · ${esc(grupo.nombre)} · ${esc(cat.materia)} · Del ${fmt2(desde)} al ${fmt2(hasta)} · Generado el ${new Date().toLocaleDateString("es-ES")}</div>
    ${asistInformeAlumnoBodyHTML(grupo,al,desde,hasta)}
  `;
  const portada=generarPortadaHTML(`Informe de asistencia — ${al.nombre}`,
    [`${esc(grupo.nombre)} · ${esc(cat.materia)}`, `Del ${fmt2(desde)} al ${fmt2(hasta)}`,
     `Curso escolar: <strong>${esc(cursoEscolarEfectivo(null))}</strong>`,
     profesorNombreEfectivo(null)?`Elaborado por: <strong>${esc(profesorNombreEfectivo(null))}</strong>`:""], []);
  abrirVentanaInforme(`Asistencia · ${al.nombre}`, body, {portada});
};
window.asistImprimirResumen=()=>{
  const grupo=grupoActual();
  const cat=getCatalogo(grupo.catalogoKey);
  const rangoDef=asistRangoPorDefecto(grupo);
  const desde=state.ui.asistDesde||rangoDef.desde, hasta=state.ui.asistHasta||rangoDef.hasta;
  const filas=grupo.alumnos.map(al=>{
    const cnt=asistContarPeriodo(grupo,al.id,desde,hasta);
    return `<tr><td>${esc(al.nombre)}</td><td style="text-align:center">${cnt.falta_justificada}</td><td style="text-align:center">${cnt.falta_no_justificada}</td><td style="text-align:center">${cnt.retraso}</td></tr>`;
  }).join("");
  const body=`
    <h1>Resumen de asistencia</h1>
    <div class="meta">${esc(grupo.nombre)} · ${esc(cat.materia)} · Del ${fmt2(desde)} al ${fmt2(hasta)} · Generado el ${new Date().toLocaleDateString("es-ES")}</div>
    <table><thead><tr><th>Alumno/a</th><th>Faltas justificadas</th><th>Faltas no justificadas</th><th>Retrasos</th></tr></thead><tbody>${filas}</tbody></table>
  `;
  const portada=generarPortadaHTML(`Resumen de asistencia — ${grupo.nombre}`,
    [`${esc(cat.materia)} · ${esc(cat.curso)}`, `Del ${fmt2(desde)} al ${fmt2(hasta)}`,
     `Curso escolar: <strong>${esc(cursoEscolarEfectivo(null))}</strong>`,
     profesorNombreEfectivo(null)?`Elaborado por: <strong>${esc(profesorNombreEfectivo(null))}</strong>`:""], []);
  abrirVentanaInforme(`Resumen de asistencia — ${grupo.nombre}`, body, {portada});
};
