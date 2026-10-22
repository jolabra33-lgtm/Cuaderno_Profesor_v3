/* ============================================================================
   Cuaderno del profesor · Diario de clase
   js/clase/diario.js
   ============================================================================ */

/* =================================================================
   DIARIO DE CLASE — un registro por grupo de qué se ha dado cada día,
   para saber siempre por dónde va cada grupo. Una entrada por fecha
   (guardadas en grupo.diario, un objeto {fecha:{nota,incidencias,unidadId}}), editable
   e imprimible. Cada entrada puede enlazarse opcionalmente a una Situación
   de Aprendizaje de la Programación de Aula vinculada a este grupo, para
   que el seguimiento (pestaña Programación) se calcule solo.
   ================================================================= */
function renderDiario(grupo){
  const c=document.getElementById("tabContent");
  const fechaSel=state.ui.diarioFecha||agHoyStr();
  const entradaActual=grupo.diario[fechaSel]||{nota:"",incidencias:"",unidadId:""};
  const entradas=diarioFechasOrdenadas(grupo).map(f=>[f,grupo.diario[f]]);
  const ordenManual=Array.isArray(grupo.diarioOrden);
  const prog=progDeGrupo(grupo);
  const sdas=prog?prog.sdas:[];
  const nombreSda=id=>{ const s=sdas.find(x=>x.id===id); return s?(s.titulo||"(sin título)"):""; };
  c.innerHTML=`
  <div class="card">
    <h2 style="font-size:15px">📔 Diario de clase</h2>
    <p class="sub" style="margin:0 0 10px">Anota qué has dado cada día con este grupo, para saber siempre por dónde vas. Una entrada por fecha — si eliges un día que ya tiene nota, la verás para editarla.</p>
    <div class="grid" style="gap:10px">
      <label style="font-size:12.5px;color:var(--mut);font-weight:500;max-width:220px">Fecha
        <input type="date" class="in" style="width:100%;margin-top:4px" id="diarioFechaInput" value="${fechaSel}" onchange="diarioSeleccionarFecha(this.value)">
      </label>
      ${sdas.length?`<label style="font-size:12.5px;color:var(--mut);font-weight:500;max-width:340px">Situación de Aprendizaje (opcional)
        <select class="in" style="width:100%;margin-top:4px" id="diarioUnidadInput">
          <option value="">— Ninguna —</option>
          ${sdas.map(s=>`<option value="${s.id}" ${entradaActual.unidadId===s.id?"selected":""}>${TRIMESTRES[s.trimestre]} · ${esc(s.titulo||"(sin título)")}</option>`).join("")}
        </select>
      </label>`:`<p class="sub" style="margin:0">${prog?"La Programación vinculada todavía no tiene Situaciones de Aprendizaje.":"Este grupo no tiene una Programación de Aula vinculada (ver Ajustes) — puedes seguir usando el Diario con normalidad."}</p>`}
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">¿Qué se ha dado?
          <textarea class="in" style="width:100%;margin-top:4px;min-height:120px;resize:vertical" id="diarioNotaInput" placeholder="Ej. Tema 3, apartado 2: causas de la Revolución Industrial. Actividad de comentario de gráficos.">${esc(entradaActual.nota||"")}</textarea>
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Incidencias
          <textarea class="in" style="width:100%;margin-top:4px;min-height:120px;resize:vertical" id="diarioIncidenciasInput" placeholder="Ej. Dos alumnos sin material. Interrupción de la clase por una conducta disruptiva.">${esc(entradaActual.incidencias||"")}</textarea>
        </label>
      </div>
      <style>@media(max-width:700px){#diarioNotaInput,#diarioIncidenciasInput{min-height:100px} .grid[style*="repeat(2,minmax(0,1fr))"]{grid-template-columns:1fr!important}}</style>
      <div class="flex">
        <button class="btn" onclick="diarioGuardarEntrada()">Guardar</button>
        ${(entradaActual.nota||entradaActual.incidencias)?`<button class="ghost danger" onclick="diarioBorrarEntrada()">Eliminar esta entrada</button>`:""}
      </div>
    </div>
  </div>
  <div class="card">
    <div class="flex" style="justify-content:space-between;align-items:center">
      <h2 style="font-size:15px">Historial (${entradas.length} entrada${entradas.length===1?"":"s"})</h2>
      <div class="flex" style="gap:6px;flex-wrap:wrap">
        ${entradas.length>1?`<div class="flex" style="gap:0;align-items:center" role="group" aria-label="Orden del historial">
          <span class="sub" style="font-size:12.5px;margin:0 6px 0 0;align-self:center">Orden:</span>
          <button class="${ordenManual?"ghost":"btn"}" style="border:1px solid var(--line);border-radius:8px 0 0 8px;padding:5px 10px" aria-pressed="${!ordenManual}" title="De más reciente a más antigua" onclick="diarioRestablecerOrden()">📅 Por fecha</button>
          <button class="${ordenManual?"btn":"ghost"}" style="border:1px solid var(--line);border-left:none;border-radius:0 8px 8px 0;padding:5px 10px" aria-pressed="${ordenManual}" title="Colocar las entradas a mano" onclick="diarioActivarOrdenManual()">✋ Manual</button>
        </div>`:""}
        ${entradas.length?`<button class="ghost" style="border:1px solid var(--line)" onclick="diarioImprimir()">🖨️ Imprimir diario</button>`:""}
      </div>
    </div>
    ${entradas.length>1?`<p class="sub" style="margin:6px 0 0;font-size:12px">${ordenManual?"Orden manual: arrastra una entrada (⠿) o usa ▲▼ para cambiar su posición.":"Ordenadas de más reciente a más antigua. Si mueves una entrada (⠿ o ▲▼), el orden pasa a Manual."}</p>`:""}
    <div class="grid" style="gap:6px;margin-top:8px">
      ${entradas.length?entradas.map(([fecha,e],i)=>`
        <div class="row diario-row" draggable="true" data-fecha="${fecha}" style="cursor:pointer;flex-direction:column;align-items:flex-start;gap:2px" onclick="diarioSeleccionarFecha('${fecha}')" ondragstart="diarioDragStart(event,'${fecha}')" ondragend="diarioDragEnd()" ondragover="diarioDragOver(event,this)" ondragleave="this.classList.remove('diario-drop')" ondrop="diarioDrop(event,'${fecha}')">
          <div class="flex" style="justify-content:space-between;width:100%;align-items:center;gap:8px">
            <div class="flex" style="align-items:center;gap:6px">
              ${entradas.length>1?`<span style="cursor:grab;color:var(--mut);font-size:17px;user-select:none" title="Arrastra para reordenar">⠿</span>`:""}
              <strong style="font-size:13px">${fmt2(fecha)}</strong>
              ${e.unidadId&&nombreSda(e.unidadId)?`<span class="badge" style="font-size:10px">${esc(nombreSda(e.unidadId))}</span>`:""}
            </div>
            ${entradas.length>1?`<div class="flex" style="gap:4px">
              <button class="ghost" style="padding:2px 8px;min-width:0" title="Subir un puesto" aria-label="Subir entrada del ${fmt2(fecha)}" ${i===0?"disabled":""} onclick="event.stopPropagation();diarioMoverEntrada('${fecha}',-1)">▲</button>
              <button class="ghost" style="padding:2px 8px;min-width:0" title="Bajar un puesto" aria-label="Bajar entrada del ${fmt2(fecha)}" ${i===entradas.length-1?"disabled":""} onclick="event.stopPropagation();diarioMoverEntrada('${fecha}',1)">▼</button>
            </div>`:""}
          </div>
          ${e.nota?`<div style="font-size:13.5px;color:var(--mut);white-space:pre-wrap"><strong>¿Qué se ha dado?</strong><br>${esc(e.nota)}</div>`:""}
          ${e.incidencias?`<div style="font-size:13.5px;color:var(--mut);white-space:pre-wrap;margin-top:5px"><strong>Incidencias</strong><br>${esc(e.incidencias)}</div>`:""}
        </div>`).join(""):'<p class="sub" style="margin:0">Todavía no hay entradas. Añade la primera arriba.</p>'}
    </div>
    <style>.diario-row.diario-drop{box-shadow:0 -3px 0 0 var(--accent-2) inset, 0 3px 0 0 var(--accent-2)} .diario-row.diario-arrastrando{opacity:.45}</style>
  </div>`;
}
/* Orden del historial del Diario: por defecto de más reciente a más antigua.
   Si el profesor reordena a mano, el orden se guarda en grupo.diarioOrden
   (array de fechas); las entradas nuevas que aún no estén en él aparecen arriba. */
function diarioFechasOrdenadas(grupo){
  const fechas=Object.keys(grupo.diario||{});
  const porFecha=[...fechas].sort((a,b)=>b.localeCompare(a));
  if(!Array.isArray(grupo.diarioOrden)) return porFecha;
  const existe=new Set(fechas), vistas=new Set(), enOrden=[];
  grupo.diarioOrden.forEach(f=>{ if(existe.has(f)&&!vistas.has(f)){ vistas.add(f); enOrden.push(f); } });
  return [...porFecha.filter(f=>!vistas.has(f)), ...enOrden];
}
window.diarioMoverEntrada=(fecha,dir)=>{
  const grupo=grupoActual();
  const orden=diarioFechasOrdenadas(grupo);
  const i=orden.indexOf(fecha), j=i+dir;
  if(i<0||j<0||j>=orden.length) return;
  [orden[i],orden[j]]=[orden[j],orden[i]];
  grupo.diarioOrden=orden;
  save(); render();
};
let diarioArrastrando=null;
window.diarioDragStart=(ev,fecha)=>{
  diarioArrastrando=fecha;
  try{ ev.dataTransfer.effectAllowed="move"; ev.dataTransfer.setData("text/plain",fecha); }catch(_){}
  ev.currentTarget.classList.add("diario-arrastrando");
};
window.diarioDragEnd=()=>{
  diarioArrastrando=null;
  document.querySelectorAll(".diario-row").forEach(el=>el.classList.remove("diario-drop","diario-arrastrando"));
};
window.diarioDragOver=(ev,el)=>{
  if(!diarioArrastrando) return;
  ev.preventDefault();
  if(el.dataset.fecha!==diarioArrastrando) el.classList.add("diario-drop");
};
window.diarioDrop=(ev,fechaDestino)=>{
  ev.preventDefault();
  const origen=diarioArrastrando;
  diarioDragEnd();
  if(!origen||origen===fechaDestino) return;
  const grupo=grupoActual();
  const orden=diarioFechasOrdenadas(grupo);
  const iOrigen=orden.indexOf(origen), iDestino=orden.indexOf(fechaDestino);
  if(iOrigen<0||iDestino<0) return;
  orden.splice(iOrigen,1);
  orden.splice(iDestino,0,origen);   // ocupa el puesto de la entrada sobre la que se suelta
  grupo.diarioOrden=orden;
  save(); render();
};
window.diarioActivarOrdenManual=()=>{
  const grupo=grupoActual();
  if(Array.isArray(grupo.diarioOrden)) return;
  grupo.diarioOrden=diarioFechasOrdenadas(grupo);
  save(); render();
};
window.diarioRestablecerOrden=async ()=>{
  const grupo=grupoActual();
  if(!Array.isArray(grupo.diarioOrden)) return;
  if(!await confirmar("¿Volver a ordenar por fecha? Se perderá el orden manual.")) return;
  grupo.diarioOrden=null;
  save(); render();
  mostrarToast("✓ Diario ordenado por fecha");
};
window.diarioSeleccionarFecha=(f)=>{ state.ui.diarioFecha=f; save(); render(); };
window.diarioGuardarEntrada=()=>{
  const grupo=grupoActual();
  const fecha=document.getElementById("diarioFechaInput").value;
  const nota=document.getElementById("diarioNotaInput").value.trim();
  const incidenciasEl=document.getElementById("diarioIncidenciasInput");
  const incidencias=incidenciasEl?incidenciasEl.value.trim():"";
  const unidadEl=document.getElementById("diarioUnidadInput");
  const unidadId=unidadEl?unidadEl.value:"";
  if(!fecha){ mostrarAviso("Elige una fecha."); return; }
  if(!grupo.diario) grupo.diario={};
  if(nota||incidencias) grupo.diario[fecha]={nota,incidencias,unidadId}; else delete grupo.diario[fecha];
  if(Array.isArray(grupo.diarioOrden)){
    if(nota||incidencias){ if(!grupo.diarioOrden.includes(fecha)) grupo.diarioOrden.unshift(fecha); }
    else grupo.diarioOrden=grupo.diarioOrden.filter(f=>f!==fecha);
  }
  state.ui.diarioFecha=fecha;
  save(); render();
  if(nota||incidencias) mostrarToast("✓ Entrada guardada — "+fmt2(fecha));
};
window.diarioBorrarEntrada=async ()=>{
  const grupo=grupoActual();
  const fecha=state.ui.diarioFecha||agHoyStr();
  if(!await confirmar("¿Eliminar la entrada de este día?")) return;
  if(grupo.diario) delete grupo.diario[fecha];
  if(Array.isArray(grupo.diarioOrden)) grupo.diarioOrden=grupo.diarioOrden.filter(f=>f!==fecha);
  save(); render();
};
window.diarioImprimir=()=>{
  const grupo=grupoActual();
  const cat=getCatalogo(grupo.catalogoKey);
  const prog=progDeGrupo(grupo);
  const sdas=prog?prog.sdas:[];
  const nombreSda=id=>{ const s=sdas.find(x=>x.id===id); return s?(s.titulo||"(sin título)"):""; };
  const entradas=Array.isArray(grupo.diarioOrden)
    ? diarioFechasOrdenadas(grupo).map(f=>[f,grupo.diario[f]])
    : Object.entries(grupo.diario||{}).sort((a,b)=>a[0].localeCompare(b[0]));
  const filas=entradas.map(([fecha,e])=>`<tr><td style="white-space:nowrap;font-size:12px;color:#666">${fmt2(fecha)}</td><td style="font-size:12px;color:#666">${e.unidadId?esc(nombreSda(e.unidadId)):"—"}</td><td style="white-space:pre-wrap">${esc(e.nota||"")}</td><td style="white-space:pre-wrap">${esc(e.incidencias||"")}</td></tr>`).join("");
  const body=`
    <h1>Diario de clase</h1>
    <div class="meta">${esc(grupo.nombre)} · ${esc(cat.materia)} · ${esc(cat.curso)} · Generado el ${new Date().toLocaleDateString("es-ES")}</div>
    <table><thead><tr><th style="width:110px">Fecha</th><th style="width:160px">Situación de Aprendizaje</th><th>¿Qué se ha dado?</th><th>Incidencias</th></tr></thead><tbody>${filas}</tbody></table>
  `;
  const portada=generarPortadaHTML(`Diario de clase — ${grupo.nombre}`,
    [`${esc(cat.materia)} · ${esc(cat.curso)}`,
     `Curso escolar: <strong>${esc(cursoEscolarEfectivo(null))}</strong>`,
     profesorNombreEfectivo(null)?`Elaborado por: <strong>${esc(profesorNombreEfectivo(null))}</strong>`:""], []);
  abrirVentanaInforme(`Diario de clase — ${grupo.nombre}`, body, {portada});
};

