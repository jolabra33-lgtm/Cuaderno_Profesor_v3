/* ============================================================================
   Cuaderno del profesor · Plano de aula y lista de alumnado
   js/alumnado/plano-aula.js
   ============================================================================ */

/* ---------- Alumnado ---------- */
/* =================================================================
   Plano de aula — distribución visual de mesas por grupo. Toca un
   alumno (de la lista de "sin colocar" o ya sentado) para elegirlo, y
   luego toca una mesa: si está libre, se sienta ahí; si ya tiene a
   alguien, se intercambian. No usa arrastre (drag&drop es poco fiable
   en iPad), solo toques, para que funcione bien también en tablet.
   ================================================================= */
function planoOcupanteEn(grupo,fila,col){
  return Object.keys(grupo.plano.posiciones).find(id=>{
    const p=grupo.plano.posiciones[id];
    return p.fila===fila && p.col===col;
  })||null;
}
/* v3 · Modos del plano: colocar (como siempre), pasar lista tocando las
   mesas, y sacar un alumno/a al azar sin repetir. */
let planoModo="colocar";
const planoAzar={usados:{},actual:null};
const ASIST_CICLO=["presente","falta_no_justificada","retraso","falta_justificada"];
window.planoSetModo=m=>{ planoModo=m; planoSeleccionado=null; render(); };
window.planoListaTocar=alumnoId=>{
  const grupo=grupoActual(); const fecha=state.ui.asistFecha||agHoyStr();
  const actual=asistDelDia(grupo,fecha,alumnoId).estado;
  const sig=ASIST_CICLO[(ASIST_CICLO.indexOf(actual)+1)%ASIST_CICLO.length];
  asistMarcar(alumnoId,sig);
};
window.planoSacarAlAzar=()=>{
  const grupo=grupoActual(); if(!grupo||!grupo.alumnos.length) return;
  const fecha=agHoyStr();
  const usados=planoAzar.usados[grupo.id]=planoAzar.usados[grupo.id]||new Set();
  const presentes=grupo.alumnos.filter(a=>{ const e=asistDelDia(grupo,fecha,a.id).estado; return e==="presente"||e==="retraso"; });
  let pool=presentes.filter(a=>!usados.has(a.id));
  if(!pool.length){ usados.clear(); pool=presentes.slice(); mostrarToast("🔄 Ya habían salido todos: empieza una nueva ronda","info"); }
  if(!pool.length){ mostrarAviso("Hoy no hay nadie presente según la lista."); return; }
  const r=new Uint32Array(1); (window.crypto&&crypto.getRandomValues)?crypto.getRandomValues(r):(r[0]=Math.floor(Math.random()*4294967295));
  const al=pool[r[0]%pool.length];
  usados.add(al.id); planoAzar.actual=al.id;
  render();
};
window.planoAzarReiniciar=()=>{ const g=grupoActual(); if(g) delete planoAzar.usados[g.id]; planoAzar.actual=null; render(); };
function renderPlano(grupo){
  const tc=document.getElementById("tabContent");
  const plano=grupo.plano;
  const sel=planoSeleccionado;
  const idsColocados=new Set(Object.keys(plano.posiciones));
  const sinColocar=grupo.alumnos.filter(a=>!idsColocados.has(a.id));
  const fechaLista=state.ui.asistFecha||agHoyStr();
  const modoLista=planoModo==="lista", modoAzar=planoModo==="azar";
  const estadoDe=id=>asistDelDia(grupo,fechaLista,id).estado;
  const colorEstado=id=>{ const e=estadoDe(id); return e==="presente"?"":asistEstadoInfo(e).color; };
  const usadosAzar=planoAzar.usados[grupo.id]||new Set();

  let celdas="";
  for(let f=0; f<plano.filas; f++){
    for(let c=0; c<plano.columnas; c++){
      const alumnoId=planoOcupanteEn(grupo,f,c);
      const al=alumnoId?grupo.alumnos.find(a=>a.id===alumnoId):null;
      const esSel=sel===alumnoId && !!alumnoId;
      const nombreCorto=al?esc((al.apellidos||"").split(",")[0]||al.nombre)+(al.nombreP?" "+esc(al.nombreP[0])+".":""):"";
      const col=al&&modoLista?colorEstado(al.id):"";
      const esAzar=al&&modoAzar&&planoAzar.actual===al.id;
      const yaSalio=al&&modoAzar&&usadosAzar.has(al.id)&&!esAzar;
      const click=modoLista?(al?`planoListaTocar('${al.id}')`:""):modoAzar?"":`planoTocarMesa(${f},${c})`;
      celdas+=`<div class="plano-mesa ${al?"ocupada":""} ${esSel&&!modoLista&&!modoAzar?"seleccionada":""}" ${click?`onclick="${click}"`:""} title="${al?esc(al.nombre)+(modoLista?" · "+asistEstadoInfo(estadoDe(al.id)).label:""):"Mesa libre"}" style="${col?`background:${col}22;border-color:${col};box-shadow:inset 0 0 0 2px ${col};color:var(--ink)`:""}${esAzar?";background:var(--accent);color:var(--accent-ink,#1c1408);transform:scale(1.08);box-shadow:0 0 0 4px var(--accent-2)":""}${yaSalio?";opacity:.45":""}">
        ${al?nombreCorto+(col?`<div style="font-size:9.5px;font-weight:700;color:${col}">${asistEstadoInfo(estadoDe(al.id)).label.replace("Falta ","F. ")}</div>`:""):'<span class="plano-vacia">+</span>'}
      </div>`;
    }
  }

  tc.innerHTML=`
  <div class="card">
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
      <h2 style="font-size:15px">🪑 Plano de aula — ${esc(grupo.nombre)}</h2>
      <div class="flex" style="flex-wrap:wrap">
        <label style="font-size:12.5px;color:var(--mut);display:flex;align-items:center;gap:5px">Filas
          <input type="number" id="planoFilasInput" class="in" style="width:56px" min="1" max="15" value="${plano.filas}">
        </label>
        <label style="font-size:12.5px;color:var(--mut);display:flex;align-items:center;gap:5px">Columnas
          <input type="number" id="planoColumnasInput" class="in" style="width:56px" min="1" max="15" value="${plano.columnas}">
        </label>
        <button class="ghost" style="border:1px solid var(--line)" onclick="planoAplicarTamano()">Aplicar tamaño</button>
        <button class="ghost" style="border:1px solid var(--line)" onclick="planoVaciar()">Vaciar plano</button>
        <button class="btn" onclick="planoImprimir()">🖨️ Imprimir</button>
      </div>
    </div>
    <div class="flex" style="gap:6px;margin-top:10px;flex-wrap:wrap" role="tablist" aria-label="Modo del plano">
      <button class="${planoModo==="colocar"?"btn":"ghost"} small" style="${planoModo==="colocar"?"":"border:1px solid var(--line)"}" role="tab" aria-selected="${planoModo==="colocar"}" onclick="planoSetModo('colocar')">🪑 Colocar</button>
      <button class="${modoLista?"btn":"ghost"} small" style="${modoLista?"":"border:1px solid var(--line)"}" role="tab" aria-selected="${modoLista}" onclick="planoSetModo('lista')">✅ Pasar lista</button>
      <button class="${modoAzar?"btn":"ghost"} small" style="${modoAzar?"":"border:1px solid var(--line)"}" role="tab" aria-selected="${modoAzar}" onclick="planoSetModo('azar')">🎲 Al azar</button>
    </div>
    ${modoLista?`<div class="flex" style="gap:10px;align-items:center;margin-top:10px;flex-wrap:wrap">
        <label style="font-size:12.5px;color:var(--mut)">Fecha <input type="date" class="in" value="${fechaLista}" onchange="asistSeleccionarFecha(this.value)"></label>
        <span class="sub" style="margin:0">Toca una mesa para cambiar: presente → falta → retraso → falta justificada. Se guarda en Asistencia.</span>
        <button class="ghost small" style="border:1px solid var(--line)" onclick="asistMarcarTodosPresentes()">Todos presentes</button>
      </div>`
    :modoAzar?`<div class="flex" style="gap:10px;align-items:center;margin-top:10px;flex-wrap:wrap">
        <button class="btn" onclick="planoSacarAlAzar()">🎲 Sacar alumno/a</button>
        ${planoAzar.actual&&grupo.alumnos.find(a=>a.id===planoAzar.actual)?`<strong style="font-size:18px" aria-live="polite">👉 ${esc(grupo.alumnos.find(a=>a.id===planoAzar.actual).nombre)}</strong>`:'<span class="sub" style="margin:0" aria-live="polite">No repite hasta que hayan salido todos, y no saca a quien tenga falta hoy.</span>'}
        <span class="sub" style="margin:0">${usadosAzar.size}/${grupo.alumnos.length} han salido</span>
        ${usadosAzar.size?'<button class="ghost small" style="border:1px solid var(--line)" onclick="planoAzarReiniciar()">↺ Nueva ronda</button>':""}
      </div>`
    :`<p class="sub" style="margin:8px 0 0">Toca un alumno (de la lista o de una mesa) para elegirlo, y luego toca una mesa: si está libre, se sienta ahí; si ya tiene a alguien, se intercambian.</p>`}
  </div>
  <div style="display:flex;gap:20px;margin-top:14px;flex-wrap:wrap;align-items:flex-start">
    <div class="card" style="flex:2;min-width:300px">
      <div class="section-eyebrow" style="margin-bottom:8px">Mesas — vista desde la pizarra</div>
      <div class="plano-grid" style="grid-template-columns:repeat(${plano.columnas},1fr)" id="planoGrid">${celdas}</div>
    </div>
    <div class="card" style="width:230px;flex-shrink:0">
      <div class="section-eyebrow" style="margin-bottom:8px">Sin colocar (${sinColocar.length})</div>
      <div class="plano-sidebar">
        ${sinColocar.length?sinColocar.map(a=>{ const col=modoLista?colorEstado(a.id):""; const click=modoLista?`planoListaTocar('${a.id}')`:modoAzar?"":`planoSeleccionar('${a.id}')`;
          return `<div class="plano-chip ${sel===a.id&&!modoLista?"seleccionado":""}" ${click?`onclick="${click}"`:""} style="${col?`border-color:${col};box-shadow:inset 3px 0 0 ${col}`:""}${modoAzar&&planoAzar.actual===a.id?";background:var(--accent);font-weight:700":""}">${esc(a.nombre)}${col?` <small style="color:${col}">· ${asistEstadoInfo(estadoDe(a.id)).label}</small>`:""}</div>`; }).join(""):'<p class="sub" style="margin:0">Todo el alumnado está ya colocado.</p>'}
      </div>
      ${sel&&idsColocados.has(sel)?`<button class="ghost" style="border:1px solid var(--line);margin-top:10px;width:100%" onclick="planoQuitarDeMesa('${sel}')">🗑️ Quitar de su mesa</button>`:""}
    </div>
  </div>`;
}
window.planoSeleccionar=(alumnoId)=>{ planoSeleccionado=(planoSeleccionado===alumnoId)?null:alumnoId; render(); };
window.planoTocarMesa=(fila,col)=>{
  const grupo=grupoActual(); const selId=planoSeleccionado;
  if(!selId){
    // Nada seleccionado: si la mesa tiene a alguien, lo selecciona directamente.
    const ocupanteId=planoOcupanteEn(grupo,fila,col);
    if(ocupanteId){ planoSeleccionado=ocupanteId; render(); }
    return;
  }
  const ocupanteId=planoOcupanteEn(grupo,fila,col);
  if(ocupanteId===selId){ planoSeleccionado=null; render(); return; }
  const posAnteriorSel=grupo.plano.posiciones[selId];
  if(ocupanteId){
    if(posAnteriorSel) grupo.plano.posiciones[ocupanteId]=posAnteriorSel;
    else delete grupo.plano.posiciones[ocupanteId];
  }
  grupo.plano.posiciones[selId]={fila,col};
  planoSeleccionado=null;
  save(); render();
};
window.planoQuitarDeMesa=(alumnoId)=>{
  const grupo=grupoActual();
  delete grupo.plano.posiciones[alumnoId];
  planoSeleccionado=null;
  save(); render();
};
window.planoVaciar=async ()=>{
  if(!await confirmar("¿Vaciar todo el plano? Todo el alumnado volverá a la lista de sin colocar. No se puede deshacer."))return;
  const grupo=grupoActual();
  grupo.plano.posiciones={};
  planoSeleccionado=null;
  save(); render();
};
window.planoAplicarTamano=()=>{
  const grupo=grupoActual();
  const filas=Math.max(1,Math.min(15,parseInt(document.getElementById("planoFilasInput").value)||5));
  const columnas=Math.max(1,Math.min(15,parseInt(document.getElementById("planoColumnasInput").value)||6));
  grupo.plano.filas=filas; grupo.plano.columnas=columnas;
  Object.keys(grupo.plano.posiciones).forEach(id=>{
    const p=grupo.plano.posiciones[id];
    if(p.fila>=filas||p.col>=columnas) delete grupo.plano.posiciones[id];
  });
  save(); render();
};
window.planoImprimir=()=>{
  const grupo=grupoActual(); const plano=grupo.plano;
  let filasHTML="";
  for(let f=0; f<plano.filas; f++){
    let cols="";
    for(let c=0; c<plano.columnas; c++){
      const alumnoId=planoOcupanteEn(grupo,f,c);
      const al=alumnoId?grupo.alumnos.find(a=>a.id===alumnoId):null;
      cols+=`<td style="border:1.5px solid #999;padding:8px;text-align:center;vertical-align:middle;width:${(100/plano.columnas).toFixed(2)}%;height:56px;font-size:12.5px;border-radius:4px">${al?esc(al.nombre):""}</td>`;
    }
    filasHTML+=`<tr>${cols}</tr>`;
  }
  const body=`
    <h1>Plano de aula — ${esc(grupo.nombre)}</h1>
    <p style="text-align:center;color:#666;font-size:12px;margin-top:-10px">Vista desde la pizarra · ${esc(getCatalogo(grupo.catalogoKey).materia)}</p>
    <table style="width:100%;border-collapse:separate;border-spacing:4px;margin-top:18px">${filasHTML}</table>
  `;
  abrirVentanaInforme("Plano de aula",body);
};
function renderAlumnos(grupo){
  const c=document.getElementById("tabContent");
  const abierto=state.ui.alumAbierto;
  const pap=grupo.papelera.alumnos;
  c.innerHTML=`<div class="card">
    <h2>Alumnado de ${esc(grupo.nombre)}</h2>
    <p class="sub">Protección de datos: usa iniciales o número de expediente en lugar del nombre completo. Puedes editar apellidos y nombre por separado, marcar si un alumno/a es NESE (necesidad específica de apoyo educativo) e indicar el nivel de referencia en la materia, añadir observaciones internas o eliminar a cada alumno/a. Las observaciones son solo para ti: no se imprimen en ningún informe (para comentarios que sí se impriman, usa "Comentarios a la calificación" en la pestaña Resultados).</p>
    <div class="flex" style="margin-bottom:16px;align-items:flex-end">
      <div style="flex:1;min-width:160px">
        <label style="display:block;font-size:12px;color:var(--mut);margin-bottom:3px">Apellidos</label>
        <input class="in" id="alApellidos" style="width:100%" placeholder="Pérez Martínez">
      </div>
      <div style="flex:1;min-width:160px">
        <label style="display:block;font-size:12px;color:var(--mut);margin-bottom:3px">Nombre</label>
        <input class="in" id="alNombreP" style="width:100%" placeholder="Juan">
      </div>
      <button class="btn" onclick="addAlumno(); document.getElementById('alApellidos')?.focus()">Añadir</button>
    </div>
    <div class="flex" style="margin-bottom:10px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
      ${grupo.alumnos.length>5?`<input class="in" id="alBuscar" style="width:100%;max-width:280px" placeholder="Buscar alumno/a…" oninput="filtrarAlumnos(this.value)">`:"<span></span>"}
      <div style="position:relative">
        <button class="ghost" style="border:1px solid var(--line)" onclick="toggleColumnasAlumnoPanel()">⚙ Columnas</button>
        ${alumColumnasPanelAbierto?`<div class="card" id="panelColumnasAlumnado" style="position:absolute;right:0;top:100%;margin-top:6px;z-index:20;width:220px;padding:12px">
          <div style="font-size:12px;color:var(--mut);margin-bottom:8px">Elige qué columnas ver</div>
          ${ALUM_COLUMNAS_OPCIONALES.map(c=>`<label style="display:flex;align-items:center;gap:7px;font-size:13px;padding:3px 0">
            <input type="checkbox" ${alumColVisible(c.id)?"checked":""} onchange="toggleColumnaAlumno('${c.id}',this.checked)"> ${c.label}
          </label>`).join("")}
        </div>`:""}
      </div>
    </div>
    <div class="scroll" style="max-height:520px">
    ${(()=>{
      const colsVisiblesIds=["apellidos","nombre",...ALUM_COLUMNAS_OPCIONALES.filter(c=>alumColVisible(c.id)).map(c=>c.id)];
      const anchoTotal=colsVisiblesIds.reduce((s,id)=>s+alumColAncho(id),0)+66+74+78;
      return `<table id="tablaAlumnos" style="width:${anchoTotal}px">`;
    })()}
      <colgroup>
        <col data-alumcol="apellidos" style="width:${alumColAncho("apellidos")}px">
        <col data-alumcol="nombre" style="width:${alumColAncho("nombre")}px">
        ${alumColVisible("nese")?`<col data-alumcol="nese" style="width:${alumColAncho("nese")}px">`:""}
        ${alumColVisible("nivelNese")?`<col data-alumcol="nivelNese" style="width:${alumColAncho("nivelNese")}px">`:""}
        ${alumColVisible("plan")?`<col data-alumcol="plan" style="width:${alumColAncho("plan")}px">`:""}
        ${alumColVisible("repite")?`<col data-alumcol="repite" style="width:${alumColAncho("repite")}px">`:""}
        ${alumColVisible("pendientes")?`<col data-alumcol="pendientes" style="width:${alumColAncho("pendientes")}px">`:""}
        ${alumColVisible("nacimiento")?`<col data-alumcol="nacimiento" style="width:${alumColAncho("nacimiento")}px">`:""}
        ${alumColVisible("edad")?`<col data-alumcol="edad" style="width:${alumColAncho("edad")}px">`:""}
        ${alumColVisible("familia")?`<col data-alumcol="familia" style="width:${alumColAncho("familia")}px">`:""}
        <col style="width:66px"><col style="width:74px"><col style="width:78px">
      </colgroup>
      <thead><tr>
        ${alumThHTML("apellidos","Apellidos",{sortKey:"apellidos"})}
        ${alumThHTML("nombre","Nombre")}
        ${alumColVisible("nese")?alumThHTML("nese","NESE",{small:true,sortKey:"nese"}):""}
        ${alumColVisible("nivelNese")?alumThHTML("nivelNese","Nivel NESE",{small:true}):""}
        ${alumColVisible("plan")?alumThHTML("plan","Plan",{small:true,sortKey:"plan"}):""}
        ${alumColVisible("repite")?alumThHTML("repite","Repite",{small:true,sortKey:"repite"}):""}
        ${alumColVisible("pendientes")?alumThHTML("pendientes","Pendientes",{small:true}):""}
        ${alumColVisible("nacimiento")?alumThHTML("nacimiento","Nacimiento",{small:true,sortKey:"nacimiento"}):""}
        ${alumColVisible("edad")?alumThHTML("edad","Edad",{small:true}):""}
        ${alumColVisible("familia")?alumThHTML("familia","Familia",{small:true}):""}
        <th></th><th></th><th></th>
      </tr></thead>
      <tbody>
      ${grupo.alumnos.length? alumSortearAlumnos(grupo.alumnos).map(a=>{ const edad=calcularEdad(a.fechaNacimiento); const colspanTotal=5+ALUM_COLUMNAS_OPCIONALES.filter(c=>alumColVisible(c.id)).length; return `
        <tr data-id="${a.id}" data-buscar="${esc(normalizarTexto(a.apellidos+" "+a.nombreP))}">
          <td><input class="in" style="width:100%;border-color:transparent;background:transparent" value="${esc(a.apellidos||"")}" onchange="renombrarApellidos('${a.id}',this.value)"></td>
          <td><input class="in" style="width:100%;border-color:transparent;background:transparent" value="${esc(a.nombreP||"")}" onchange="renombrarNombreP('${a.id}',this.value)"></td>
          ${alumColVisible("nese")?`<td style="text-align:center"><input type="checkbox" ${a.nese?"checked":""} onchange="toggleNese('${a.id}',this.checked)"></td>`:""}
          ${alumColVisible("nivelNese")?`<td style="font-size:12.5px">${a.nese?neseNivelHTML(a):'<span style="color:var(--mut);font-size:12.5px">—</span>'}</td>`:""}
          ${alumColVisible("plan")?`<td><select class="in" style="width:100%;font-size:12.5px;padding:6px 8px" onchange="setAlumnoPlan('${a.id}',this.value)">
            <option value="" ${!a.plan?"selected":""}>— Ninguno —</option>
            <option value="refuerzo" ${a.plan==="refuerzo"?"selected":""}>Refuerzo</option>
            <option value="repeticion" ${a.plan==="repeticion"?"selected":""}>Repetición</option>
          </select></td>`:""}
          ${alumColVisible("repite")?`<td style="text-align:center"><input type="checkbox" ${a.repetidor?"checked":""} onchange="toggleRepetidor('${a.id}',this.checked)"></td>`:""}
          ${alumColVisible("pendientes")?`<td><button class="ghost" style="font-size:11.5px;padding:5px 8px;width:100%;overflow:hidden;text-overflow:ellipsis" onclick="togglePendientesRow('${a.id}')">${a.pendientes.length?esc(a.pendientes.map(n=>n+"º").join(", ")):"— Ninguna —"}</button></td>`:""}
          ${alumColVisible("nacimiento")?`<td>
            <input type="date" class="in" style="width:100%;font-size:12.5px;padding:6px 8px" value="${esc(a.fechaNacimiento||"")}" onchange="setFechaNacimiento('${a.id}',this.value)" onblur="refrescarFechaNacimiento()">
            <input type="text" class="in" placeholder="o DD/MM/AAAA" title="Escribe la fecha completa (o solo pégala) y pulsa Intro o sal del campo" style="width:100%;font-size:11px;padding:3px 8px;margin-top:3px;border-color:transparent;background:transparent" onkeydown="if(event.key==='Enter'){ if(setFechaNacimientoTexto('${a.id}',this.value)) this.blur(); }" onblur="if(this.value){ setFechaNacimientoTexto('${a.id}',this.value); this.value=''; }">
          </td>`:""}
          ${alumColVisible("edad")?`<td style="text-align:center;font-size:12.5px;color:${edad==null?"var(--mut)":"var(--ink)"}">${edad==null?"—":edad+" años"}</td>`:""}
          ${alumColVisible("familia")?(()=>{ const ok=familiaCorreos(a).length, mal=(a.familia||[]).some(f=>f.email&&!emailValido(f.email)); return `<td style="text-align:center;font-size:12.5px"><button class="ghost small" style="padding:3px 7px;${mal?"color:#dc2626":""}" title="${mal?"Hay un correo mal escrito":ok?familiaCorreos(a).join(", "):"Sin correo de la familia"}" onclick="abrirFichaAlumno('${a.id}')">${mal?"⚠️":ok?"✉️ "+ok:"—"}</button></td>`; })():""}
          <td><button class="ghost" onclick="abrirFichaAlumno('${a.id}')">Editar</button></td>
          <td><button class="ghost" onclick="toggleObservacion('${a.id}')">${abierto===a.id?"Ocultar obs.":(a.observaciones?"Ver obs.":"+ Obs.")}</button></td>
          <td><button class="ghost" onclick="delAlumno('${a.id}')">Eliminar</button></td>
        </tr>
        ${state.ui.alumPendAbierto===a.id?`<tr data-pendfor="${a.id}"><td colspan="${colspanTotal}" style="background:var(--paper)">
          <div style="padding:10px 4px">
            <div style="font-size:12.5px;color:var(--mut);margin-bottom:8px">Marca los cursos anteriores en los que este alumno/a tiene la materia pendiente. Al marcar uno, se crea automáticamente su Plan de Refuerzo (si no lo tenía ya) con el modelo de ese curso; desmarcarlo no borra el plan.</div>
            <div class="flex" style="gap:14px;flex-wrap:wrap">
              ${["1","2","3","4"].map(n=>`<label style="font-size:13px;display:flex;align-items:center;gap:6px">
                <input type="checkbox" ${a.pendientes.includes(n)?"checked":""} onchange="toggleAlumnoPendiente('${a.id}','${n}',this.checked)"> ${n}º ESO
              </label>`).join("")}
            </div>
          </div>
        </td></tr>`:""}
        ${abierto===a.id?`<tr data-obsfor="${a.id}"><td colspan="${colspanTotal}" style="background:var(--paper)">
              <div style="font-size:12px;color:var(--mut);margin:6px 0 4px">Observaciones del alumno · uso interno, no se imprime</div>
              <textarea class="in" style="width:100%;min-height:80px;resize:vertical" placeholder="Notas privadas para ti sobre este alumno/a…" onchange="setObservacion('${a.id}',this.value)">${esc(a.observaciones||"")}</textarea>
            </td></tr>`:""}`;}).join("")
        : `<tr><td colspan="${5+ALUM_COLUMNAS_OPCIONALES.filter(c=>alumColVisible(c.id)).length}" style="color:var(--mut);font-size:14px">Aún no hay alumnado. Añade el primero arriba, o usa la carga en bloque de más abajo.</td></tr>`}
      </tbody>
    </table>
    <p id="alSinResultados" style="display:none;color:var(--mut);font-size:13.5px;margin-top:6px">Ningún alumno/a coincide con la búsqueda.</p>
    </div></div>

  <div class="card">
    <h2>Añadir varios a la vez</h2>
    <p class="sub">Pega una lista (un alumno por línea, en formato <strong>Apellidos, Nombre</strong> — p. ej. "Pérez Martínez, Juan") o importa un CSV. Se aceptan tanto archivos con una columna (Apellidos, Nombre en la misma celda) como con dos columnas separadas (Apellidos / Nombre).</p>
    <div class="flex" style="align-items:flex-start;gap:20px">
      <div style="flex:1;min-width:220px">
        <textarea class="in" id="alBulk" style="width:100%;min-height:100px;resize:vertical" placeholder="Pérez Martínez, Juan&#10;García López, Ana, 14/03/2011&#10;…"></textarea>
        <button class="btn" style="margin-top:8px" onclick="addAlumnosBulk()">Añadir lista</button>
        <p class="sub" style="margin:6px 0 0">Un tercer dato opcional por línea, DD/MM/AAAA, para la fecha de nacimiento.</p>
      </div>
      <div style="flex:1;min-width:220px">
        <label class="in file" style="display:block;text-align:center">Elegir archivo CSV…
          <input type="file" accept=".csv,text/csv" style="display:none" onchange="importarCSVAlumnos(this)">
        </label>
        <p class="sub" style="margin:8px 0 0">Si la primera fila es una cabecera (p. ej. "Alumno" o "Apellidos"), se detecta y se ignora. Si además hay una columna "Fecha de nacimiento" (formato DD/MM/AAAA), se importa también. El NESE y su nivel no se importan por CSV: se marcan a mano en la tabla de arriba.</p>
      </div>
    </div>
  </div>

  ${pap.length? `<div class="card">
    <h2 style="font-size:15px">Papelera de alumnado</h2>
    <p class="sub">Los últimos eliminados de este grupo, con sus notas y observaciones. Se guardan los ${pap.length<10?"últimos "+pap.length:"últimos 10"}.</p>
    <div class="grid">
      ${pap.map((it,i)=>`
        <div class="row" style="justify-content:space-between">
          <span style="font-size:13.5px;color:var(--mut)">${esc(it.alumno.nombre)} · eliminado ${haceTiempo(it.borradoEn)}</span>
          <div class="flex">
            <button class="ghost" onclick="restaurarAlumnoPapelera(${i})">Restaurar</button>
            <button class="ghost danger" onclick="purgarAlumnoPapelera(${i})">Eliminar definitivamente</button>
          </div>
        </div>`).join("")}
    </div>
  </div>` : ""}
  ${state.ui.fichaAlumnoId?fichaAlumnoModalHTML(grupo,state.ui.fichaAlumnoId):""}`;
  const iAp=document.getElementById("alApellidos");
  const iNo=document.getElementById("alNombreP");
  iAp.addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); iNo.focus(); } });
  iNo.addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); addAlumno(); document.getElementById("alApellidos")?.focus(); } });
}
window.filtrarAlumnos=q=>{
  const norm=normalizarTexto(q||"");
  const tabla=document.getElementById("tablaAlumnos");
  if(!tabla) return;
  let visibles=0;
  [...tabla.querySelectorAll("tbody tr[data-id]")].forEach(tr=>{
    const match=!norm || tr.dataset.buscar.includes(norm);
    if(match) visibles++;
    tr.style.display = match? "" : "none";
    const next=tr.nextElementSibling;
    if(next && next.dataset.obsfor===tr.dataset.id){ next.style.display = match? "" : "none"; }
  });
  const aviso=document.getElementById("alSinResultados");
  if(aviso) aviso.style.display = (norm && visibles===0)? "" : "none";
};
window.addAlumno=()=>{
  const g=grupoActual();
  const iAp=document.getElementById("alApellidos"); const iNo=document.getElementById("alNombreP");
  const apellidos=iAp.value.trim(); const nombreP=iNo.value.trim();
  if(!apellidos && !nombreP) return;
  g.alumnos.push(normalizarAlumno({id:uid(),apellidos,nombreP,nombre:nombreCompleto(apellidos,nombreP)}));
  ordenarAlumnos(g);
  save(); render();
};
function parsearFechaFlexible(str){
  if(!str) return "";
  str=String(str).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  let m=str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if(m){ const d=m[1].padStart(2,"0"),mo=m[2].padStart(2,"0"),y=m[3]; return `${y}-${mo}-${d}`; }
  return "";
}
function normalizarEntradaAlumno(x){
  // Acepta tanto un texto plano (compatibilidad con llamadas antiguas) como
  // {nombre, fechaNacimiento}.
  if(typeof x==="string") return {nombre:x, fechaNacimiento:""};
  return {nombre:x.nombre||"", fechaNacimiento:x.fechaNacimiento||""};
}
function addAlumnosNombres(entradas){
  const g=grupoActual();
  const existentes=new Set(g.alumnos.map(a=>normalizarTexto(a.nombre)));
  let anadidos=0, omitidos=0;
  entradas.forEach(x=>{
    const {nombre:linea,fechaNacimiento}=normalizarEntradaAlumno(x);
    const texto=(linea||"").trim(); if(!texto) return;
    const {apellidos,nombreP}=splitApellidosNombre(texto);
    const nombre=nombreCompleto(apellidos,nombreP);
    if(!nombre) return;
    const clave=normalizarTexto(nombre);
    if(existentes.has(clave)){ omitidos++; return; }
    g.alumnos.push(normalizarAlumno({id:uid(),apellidos,nombreP,nombre,fechaNacimiento:parsearFechaFlexible(fechaNacimiento)}));
    existentes.add(clave);
    anadidos++;
  });
  ordenarAlumnos(g);
  save(); render();
  if(anadidos||omitidos) mostrarAviso(`Añadidos ${anadidos} alumno${anadidos===1?"":"s"}.${omitidos?` Omitidos ${omitidos} por tener ya un nombre muy similar en el grupo.`:""}`);
}
window.addAlumnosBulk=()=>{
  const ta=document.getElementById("alBulk");
  const lineas=ta.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(!lineas.length) return;
  const entradas=lineas.map(linea=>{
    const celdas=splitCSVLine(linea,",");
    if(celdas.length>=3 && celdas[2] && celdas[2].trim()){
      // "Apellidos, Nombre, DD/MM/AAAA"
      return {nombre:nombreCompleto(celdas[0],celdas[1]), fechaNacimiento:parsearFechaFlexible(celdas[2])};
    }
    return {nombre:linea, fechaNacimiento:""};
  });
  addAlumnosNombres(entradas);
};
function splitCSVLine(line,delim){
  const cells=[]; let cur=""; let inQuotes=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(inQuotes){
      if(ch==='"'){
        if(line[i+1]==='"'){ cur+='"'; i++; } else { inQuotes=false; }
      } else cur+=ch;
    } else {
      if(ch==='"') inQuotes=true;
      else if(ch===delim){ cells.push(cur); cur=""; }
      else cur+=ch;
    }
  }
  cells.push(cur);
  return cells.map(c=>c.trim().replace(/^["']|["']$/g,""));
}
function parseCSVAlumnos(text){
  const lines=text.split(/\r?\n/).filter(l=>l.trim().length>0);
  if(!lines.length) return [];
  const delim=(lines[0].match(/;/g)||[]).length>=(lines[0].match(/,/g)||[]).length?";":",";
  const primeraCeldas=splitCSVLine(lines[0],delim);
  const primera=(primeraCeldas[0]||"").toLowerCase();
  const cabecerasNombre=["nombre","alumno","alumno/a","nombre completo","name","apellidos, nombre","alumnado","apellidos"];
  const cabecerasFecha=["nacimiento","fecha nacimiento","fecha de nacimiento","f. nacimiento","fecha_nacimiento","nace"];
  const esCabecera=cabecerasNombre.includes(primera);
  let colFecha=-1;
  if(esCabecera){
    colFecha=primeraCeldas.findIndex(c=>cabecerasFecha.includes((c||"").trim().toLowerCase()));
  }
  const inicio=esCabecera?1:0;
  const entradas=[];
  for(let i=inicio;i<lines.length;i++){
    const celdas=splitCSVLine(lines[i],delim);
    if(!celdas.length || !celdas[0]) continue;
    let apellidos="",nombreP="";
    // Si hay columna de fecha detectada, las columnas de nombre son las que quedan antes de ella
    const colNombreFin = colFecha>=0? colFecha : celdas.length;
    if(colNombreFin>=2 && celdas[1] && celdas[1].trim() && (colFecha!==1)){
      apellidos=celdas[0]; nombreP=celdas[1];
    } else {
      const partes=splitApellidosNombre(celdas[0]);
      apellidos=partes.apellidos; nombreP=partes.nombreP;
    }
    const nombre=nombreCompleto(apellidos,nombreP);
    if(!nombre) continue;
    const fechaNacimiento = colFecha>=0 && celdas[colFecha] ? parsearFechaFlexible(celdas[colFecha]) : "";
    entradas.push({nombre,fechaNacimiento});
  }
  return entradas;
}
window.importarCSVAlumnos=inp=>{
  const file=inp.files[0]; if(!file) return;
  const rd=new FileReader();
  rd.onload=()=>{
    const buf=rd.result;
    let text;
    try{
      // Intento estricto en UTF-8: si el archivo no es UTF-8 válido (p. ej. viene de
      // Excel en Windows-1252/ISO-8859-1), esto lanza un error y pasamos al catch.
      text=new TextDecoder("utf-8",{fatal:true}).decode(buf);
    }catch(e){
      text=new TextDecoder("windows-1252").decode(buf);
    }
    const entradas=parseCSVAlumnos(text);
    if(!entradas.length){ mostrarAviso("No se ha encontrado ningún nombre en el archivo."); return; }
    addAlumnosNombres(entradas);
  };
  rd.readAsArrayBuffer(file);
  inp.value="";
};
function neseNivelHTML(a){
  const esOtro = a.neseNivelOtro || !!(a.neseNivel && !NIVELES_NESE.includes(a.neseNivel));
  const selValue = esOtro? "__otro__" : (a.neseNivel||"");
  return `<div class="flex" style="gap:6px;flex-wrap:wrap;align-items:center">
    <select class="in" style="min-width:128px;font-size:12.5px;padding:6px 8px" onchange="setNeseNivelSelect('${a.id}',this.value)">
      <option value="" ${selValue===""?"selected":""}>Seleccionar…</option>
      ${NIVELES_NESE.map(n=>`<option value="${esc(n)}" ${selValue===n?"selected":""}>${esc(n)}</option>`).join("")}
      <option value="__otro__" ${selValue==="__otro__"?"selected":""}>Otro (especificar)</option>
    </select>
    ${esOtro?`<input class="in" style="min-width:150px" placeholder="Especifica el nivel" value="${esc(a.neseNivel||"")}" onchange="setNeseNivel('${a.id}',this.value)">`:""}
  </div>`;
}
window.setNeseNivelSelect=(id,v)=>{ const g=grupoActual(); const a=g.alumnos.find(x=>x.id===id);
  if(!a) return;
  if(v==="__otro__"){ a.neseNivelOtro=true; a.neseNivel=""; } else { a.neseNivelOtro=false; a.neseNivel=v; }
  save(); render(); };
window.renombrarApellidos=(id,v)=>{ const g=grupoActual(); const a=g.alumnos.find(x=>x.id===id);
  if(a){ a.apellidos=v.trim(); a.nombre=nombreCompleto(a.apellidos,a.nombreP); ordenarAlumnos(g); save(); renderShell(); } };
window.renombrarNombreP=(id,v)=>{ const g=grupoActual(); const a=g.alumnos.find(x=>x.id===id);
  if(a){ a.nombreP=v.trim(); a.nombre=nombreCompleto(a.apellidos,a.nombreP); ordenarAlumnos(g); save(); renderShell(); } };
window.toggleNese=(id,checked)=>{ const g=grupoActual(); const a=g.alumnos.find(x=>x.id===id);
  if(a){ a.nese=checked; if(!checked){ a.neseNivel=""; a.neseNivelOtro=false; } save(); render(); } };
window.setNeseNivel=(id,v)=>{ const g=grupoActual(); const a=g.alumnos.find(x=>x.id===id);
  if(a){ a.neseNivel=v.trim(); save(); } };
window.setAlumnoPlan=(id,v)=>{ const g=grupoActual(); const a=g.alumnos.find(x=>x.id===id);
  if(a){
    a.plan=v;
    if(v==="refuerzo"){ if(autoCrearPlanRefuerzoSiFalta(g,a)) mostrarToast("✓ Plan de Refuerzo creado para "+a.nombre); }
    else if(v==="repeticion"){ if(autoCrearPlanRepeticionSiFalta(g,a)) mostrarToast("✓ Plan de Repetición creado para "+a.nombre); }
    save(); render();
  } };
function autoCrearPlanRefuerzoSiFalta(g,a){
  if(!Array.isArray(state.planesRefuerzo)) state.planesRefuerzo=[];
  if(state.planesRefuerzo.some(p=>p.grupoId===g.id && p.alumnoId===a.id)) return false; // ya tiene uno en este grupo, no duplicar
  state.planesRefuerzo.push({ id:uid(), grupoId:g.id, alumnoId:a.id, alumnoNombre:a.nombre, titulo:"Refuerzo — "+a.nombre, cursoAcademico:"",
    motivos:rfrpMotivosDefault(), trimestres:rfrpTrimestresIniciales(""), valoracionFinal:"",
    fechaInicio:"", fechaFinPrevista:"", estado:"activo", seguimiento:[], observacionesFinales:"", planOrigenId:"", planOrigenTipo:"" });
  return true;
}
function autoCrearPlanRepeticionSiFalta(g,a){
  if(!Array.isArray(state.planesRepeticion)) state.planesRepeticion=[];
  if(state.planesRepeticion.some(p=>p.grupoId===g.id && p.alumnoId===a.id)) return false; // ya tiene uno en este grupo, no duplicar
  state.planesRepeticion.push({ id:uid(), grupoId:g.id, alumnoId:a.id, alumnoNombre:a.nombre, cursoRepite:"", cursoAcademico:"",
    motivos:rfrpMotivosDefault(), medidasNivelII:rpMedidasDefault(RP_MEDIDAS_II), medidasNivelIII:rpMedidasDefault(RP_MEDIDAS_III),
    fechaInicio:"", estado:"activo", trimestres:rfrpTrimestresIniciales(""), valoracionFinal:"",
    observacionesFinales:"", planOrigenId:"", planOrigenTipo:"" });
  return true;
}
function autoCrearPlanRefuerzoPendiente(g,a,curso){
  // Materia pendiente de un curso anterior: distinto del Plan de Refuerzo "normal"
  // (que es único por alumno/grupo) — aquí puede haber varios, uno por cada curso
  // pendiente, identificados por cursoPendiente para no duplicar al volver a marcar.
  if(!Array.isArray(state.planesRefuerzo)) state.planesRefuerzo=[];
  if(state.planesRefuerzo.some(p=>p.grupoId===g.id && p.alumnoId===a.id && p.cursoPendiente===curso)) return false;
  state.planesRefuerzo.push({ id:uid(), grupoId:g.id, alumnoId:a.id, alumnoNombre:a.nombre,
    titulo:`Refuerzo — ${a.nombre} (pendiente ${curso}º ESO)`, cursoAcademico:"", cursoPendiente:curso,
    motivos:rfrpMotivosDefault(), trimestres:rfrpTrimestresIniciales(curso), valoracionFinal:"",
    fechaInicio:"", fechaFinPrevista:"", estado:"activo", seguimiento:[], observacionesFinales:"", planOrigenId:"", planOrigenTipo:"" });
  return true;
}
window.toggleRepetidor=(id,checked)=>{ const g=grupoActual(); const a=g.alumnos.find(x=>x.id===id);
  if(a){
    a.repetidor=checked;
    if(checked){
      if(!a.plan) a.plan="repeticion";
      if(autoCrearPlanRepeticionSiFalta(g,a)) mostrarToast("✓ Plan de Repetición creado para "+a.nombre);
    }
    save(); render();
  } };
window.toggleObservacion=id=>{ state.ui.alumAbierto = state.ui.alumAbierto===id? null : id; save(); render(); };
window.togglePendientesRow=id=>{ state.ui.alumPendAbierto = state.ui.alumPendAbierto===id? null : id; save(); render(); };
window.setFechaNacimiento=(id,valor)=>{ const g=grupoActual(); const a=g.alumnos.find(x=>x.id===id); if(a){ a.fechaNacimiento=valor; save(); } };
/* No repintamos en cada "change" del <input type="date">: en varios navegadores ese
   evento se dispara con cada dígito que completa el subcampo (día/mes/año), y un
   repintado completo de la tabla destruye y recrea el input, perdiendo el foco a
   mitad de escritura (de ahí que solo "entrase" la última cifra del año y el foco
   pareciera saltar). Guardamos el valor al vuelo y solo repintamos al salir del
   campo (blur), momento en que ya se puede recalcular la edad y reordenar. */
window.refrescarFechaNacimiento=()=>{ render(); };
window.setFechaNacimientoTexto=(id,valor)=>{
  const f=parsearFechaFlexible(valor);
  if(!f) return false;
  const g=grupoActual(); const a=g.alumnos.find(x=>x.id===id);
  if(a){ a.fechaNacimiento=f; save(); render(); }
  return true;
};
window.abrirFichaAlumno=(id)=>{ state.ui.fichaAlumnoId=id; save(); render(); };
window.cerrarFichaAlumno=()=>{ state.ui.fichaAlumnoId=""; save(); render(); };
function fichaAlumnoModalHTML(grupo,alumnoId){
  const a=grupo.alumnos.find(x=>x.id===alumnoId);
  if(!a) return "";
  const edad=calcularEdad(a.fechaNacimiento);
  return `<div class="modal-overlay" onclick="if(event.target===this) cerrarFichaAlumno()">
    <div class="modal-box" style="max-width:520px">
      <div class="flex" style="justify-content:space-between;align-items:center">
        <h2 style="font-size:16px">Ficha de ${esc(a.nombre)}</h2>
        <button class="ghost" onclick="cerrarFichaAlumno()">✕</button>
      </div>
      <div class="grid" style="gap:10px;margin-top:10px">
        <div class="flex" style="gap:10px">
          <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1">Apellidos
            <input class="in" style="width:100%;margin-top:4px" value="${esc(a.apellidos||"")}" onchange="renombrarApellidos('${a.id}',this.value)">
          </label>
          <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1">Nombre
            <input class="in" style="width:100%;margin-top:4px" value="${esc(a.nombreP||"")}" onchange="renombrarNombreP('${a.id}',this.value)">
          </label>
        </div>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500;max-width:220px">Fecha de nacimiento
          <input type="date" class="in" style="width:100%;margin-top:4px" value="${esc(a.fechaNacimiento||"")}" onchange="setFechaNacimiento('${a.id}',this.value)" onblur="refrescarFechaNacimiento()">
          <span style="font-size:12px;color:var(--mut)">${edad==null?"":"→ "+edad+" años"}</span>
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500;max-width:220px">O escríbela a mano (DD/MM/AAAA)
          <input type="text" class="in" placeholder="p. ej. 15/03/2012" style="width:100%;margin-top:4px" onkeydown="if(event.key==='Enter'){ if(setFechaNacimientoTexto('${a.id}',this.value)) this.blur(); else mostrarToast('Formato no válido. Usa DD/MM/AAAA'); }" onblur="if(this.value){ if(setFechaNacimientoTexto('${a.id}',this.value)) this.value=''; }">
        </label>
        <div class="flex" style="gap:14px;flex-wrap:wrap;align-items:center;padding-top:4px;border-top:1px solid var(--line)">
          <label style="font-size:13px;display:flex;align-items:center;gap:6px">
            <input type="checkbox" ${a.nese?"checked":""} onchange="toggleNese('${a.id}',this.checked)"> NESE
          </label>
          ${a.nese?neseNivelHTML(a):""}
        </div>
        <div class="flex" style="gap:14px;flex-wrap:wrap;align-items:center">
          <label style="font-size:12.5px;color:var(--mut);font-weight:500">Plan
            <select class="in" style="margin-top:4px;min-width:150px" onchange="setAlumnoPlan('${a.id}',this.value)">
              <option value="" ${!a.plan?"selected":""}>— Ninguno —</option>
              <option value="refuerzo" ${a.plan==="refuerzo"?"selected":""}>Refuerzo</option>
              <option value="repeticion" ${a.plan==="repeticion"?"selected":""}>Repetición</option>
            </select>
          </label>
          <label style="font-size:13px;display:flex;align-items:center;gap:6px;margin-top:18px">
            <input type="checkbox" ${a.repetidor?"checked":""} onchange="toggleRepetidor('${a.id}',this.checked)"> Repite curso
          </label>
        </div>
        <div>
          <div style="font-size:12.5px;color:var(--mut);font-weight:500;margin-bottom:4px">Materia pendiente de cursos anteriores</div>
          <div class="flex" style="gap:14px;flex-wrap:wrap">
            ${["1","2","3","4"].map(n=>`<label style="font-size:13px;display:flex;align-items:center;gap:6px">
              <input type="checkbox" ${a.pendientes.includes(n)?"checked":""} onchange="toggleAlumnoPendiente('${a.id}','${n}',this.checked)"> ${n}º ESO
            </label>`).join("")}
          </div>
        </div>
        ${familiaFichaHTML(a)}
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Observaciones (uso interno, no se imprime)
          <textarea class="in" style="width:100%;margin-top:4px;min-height:70px;resize:vertical" onchange="setObservacion('${a.id}',this.value)">${esc(a.observaciones||"")}</textarea>
        </label>
      </div>
      <div class="flex" style="justify-content:flex-end;margin-top:16px">
        <button class="btn" onclick="cerrarFichaAlumno()">Listo</button>
      </div>
    </div>
  </div>`;
}
window.toggleAlumnoPendiente=(alId,curso,checked)=>{
  const g=grupoActual(); const a=g.alumnos.find(x=>x.id===alId);
  if(!a) return;
  if(checked){
    if(!a.pendientes.includes(curso)) a.pendientes.push(curso);
    const creado=autoCrearPlanRefuerzoPendiente(g,a,curso);
    save(); render();
    if(creado) mostrarToast(`✓ Plan de Refuerzo creado — ${curso}º ESO pendiente`);
  }else{
    a.pendientes=a.pendientes.filter(c=>c!==curso);
    save(); render();
  }
};
