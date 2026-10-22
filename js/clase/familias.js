/* ============================================================================
   Cuaderno del profesor · Contacto con familias
   js/clase/familias.js
   ============================================================================ */

/* ---- Contacto con familias: helpers y handlers ---- */
window.famAbrirModalNueva=()=>{ state.ui.famModalNueva=true; render(); };
window.famCerrarModalNueva=()=>{ state.ui.famModalNueva=false; render(); };
window.famCrearRegistro=()=>{
  const grupo=grupoActual();
  const alumnoId=document.getElementById("famNAlumno").value;
  const fecha=document.getElementById("famNFecha").value;
  const medio=document.getElementById("famNMedio").value;
  const asunto=(document.getElementById("famNAsunto").value||"").trim();
  const notas=(document.getElementById("famNNotas").value||"").trim();
  if(!alumnoId||!fecha||!medio){ mostrarAviso("Elige alumno/a, fecha y medio de contacto."); return; }
  if(!Array.isArray(grupo.contactosFamilia)) grupo.contactosFamilia=[];
  grupo.contactosFamilia.push({id:uid(),alumnoId,fecha,medio,asunto,notas});
  state.ui.famModalNueva=false;
  save(); render();
  mostrarToast("✓ Contacto registrado");
};
window.famEliminarRegistro=async (id)=>{
  if(!await confirmar("¿Eliminar este registro de contacto? No se puede deshacer.")) return;
  const grupo=grupoActual();
  grupo.contactosFamilia=(grupo.contactosFamilia||[]).filter(e=>e.id!==id);
  save(); render();
  mostrarToast("Registro eliminado","info");
};
window.famSetCampo=(id,campo,valor)=>{
  const grupo=grupoActual(); const entry=(grupo.contactosFamilia||[]).find(e=>e.id===id);
  if(!entry) return; entry[campo]=valor; save();
};
window.famFiltrar=()=>{
  state.ui.famFiltroAlumno=document.getElementById("famFiltroAlumno").value;
  state.ui.famFiltroMedio=document.getElementById("famFiltroMedio").value;
  save(); render();
};
window.famToggleDetalle=(id)=>{
  document.querySelectorAll(`[data-fam-detalle]`).forEach(el=>{ if(el.dataset.famDetalle!==id) el.style.display="none"; });
  const el=document.querySelector(`[data-fam-detalle="${id}"]`);
  if(el) el.style.display = el.style.display==="none"? "" : "none";
};
function famModalNuevaHTML(grupo){
  return `<div class="modal-overlay" onclick="if(event.target===this) famCerrarModalNueva()">
    <div class="modal-box" style="max-width:460px">
      <div class="flex" style="justify-content:space-between;align-items:center">
        <h2 style="font-size:16px">Nuevo contacto con familia</h2>
        <button class="ghost" onclick="famCerrarModalNueva()">✕</button>
      </div>
      <div class="grid" style="gap:10px;margin-top:10px">
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Alumno/a
          <select class="in" id="famNAlumno" style="width:100%;margin-top:4px">
            <option value="">— Elige —</option>
            ${grupo.alumnos.map(a=>`<option value="${a.id}">${esc(a.nombre)}</option>`).join("")}
          </select>
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Fecha
          <input type="date" class="in" id="famNFecha" style="width:100%;margin-top:4px" value="${agHoyStr()}">
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Medio de contacto
          <select class="in" id="famNMedio" style="width:100%;margin-top:4px">
            ${FAM_MEDIOS.map(m=>`<option value="${m.id}">${m.icono} ${m.label}</option>`).join("")}
          </select>
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Asunto
          <input class="in" id="famNAsunto" style="width:100%;margin-top:4px" placeholder="Ej. Retraso reiterado, felicitación, entrega de notas…">
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Notas
          <textarea class="in" id="famNNotas" style="width:100%;margin-top:4px;min-height:70px" placeholder="Qué se habló, acuerdos tomados…"></textarea>
        </label>
      </div>
      <div class="flex" style="justify-content:flex-end;margin-top:16px">
        <button class="ghost" onclick="famCerrarModalNueva()">Cancelar</button>
        <button class="btn" onclick="famCrearRegistro()">Crear</button>
      </div>
    </div>
  </div>`;
}
function renderFamilias(grupo){
  const c=document.getElementById("tabContent");
  const filtroAl=state.ui.famFiltroAlumno||"", filtroMedio=state.ui.famFiltroMedio||"";
  let entradas=(grupo.contactosFamilia||[]).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  if(filtroAl) entradas=entradas.filter(e=>e.alumnoId===filtroAl);
  if(filtroMedio) entradas=entradas.filter(e=>e.medio===filtroMedio);
  const nombreAl=id=>{ const a=grupo.alumnos.find(x=>x.id===id); return a?a.nombre:"—"; };
  const filas=entradas.length?entradas.map(e=>{
    const info=famMedioInfo(e.medio);
    return `<div class="row" style="flex-direction:column;align-items:flex-start;gap:2px">
      <div class="flex" style="justify-content:space-between;width:100%;cursor:pointer" onclick="famToggleDetalle('${e.id}')">
        <div><strong style="font-size:13px">${esc(nombreAl(e.alumnoId))}</strong> <span class="badge" style="font-size:10px">${info.icono} ${info.label}</span></div>
        <span style="font-size:12px;color:var(--mut)">${fmt2(e.fecha)}</span>
      </div>
      <div style="font-size:13px;color:var(--mut)">${esc(e.asunto||"—")}</div>
      <div data-fam-detalle="${e.id}" style="display:none;width:100%;margin-top:6px;padding-top:8px;border-top:1px solid var(--line)">
        <label style="font-size:12.5px;color:var(--mut);font-weight:500;display:block">Notas
          <textarea class="in" style="width:100%;margin-top:4px;min-height:70px" onchange="famSetCampo('${e.id}','notas',this.value)">${esc(e.notas||"")}</textarea>
        </label>
        <button class="ghost danger" style="margin-top:8px" onclick="famEliminarRegistro('${e.id}')">Eliminar registro</button>
      </div>
    </div>`;
  }).join(""):'<p class="sub" style="margin:0">Todavía no hay contactos registrados.</p>';
  c.innerHTML=`
  <div class="card">
    <div class="flex" style="justify-content:space-between;align-items:center">
      <h2 style="font-size:15px">👪 Contacto con familias</h2>
      <button class="btn" onclick="famAbrirModalNueva()">+ Nuevo contacto</button>
    </div>
    <p class="sub" style="margin:6px 0 10px">Llamadas, emails, notas escritas o reuniones informales con la familia — un registro rápido, independiente de las notas académicas.</p>
    <div class="flex" style="gap:8px;flex-wrap:wrap">
      <select class="in" id="famFiltroAlumno" style="min-width:160px" onchange="famFiltrar()">
        <option value="">Todo el alumnado</option>
        ${grupo.alumnos.map(a=>`<option value="${a.id}" ${filtroAl===a.id?"selected":""}>${esc(a.nombre)}</option>`).join("")}
      </select>
      <select class="in" id="famFiltroMedio" style="min-width:150px" onchange="famFiltrar()">
        <option value="">Todos los medios</option>
        ${FAM_MEDIOS.map(m=>`<option value="${m.id}" ${filtroMedio===m.id?"selected":""}>${m.icono} ${m.label}</option>`).join("")}
      </select>
    </div>
  </div>
  <div class="card">
    <div class="flex" style="justify-content:space-between;align-items:center">
      <h2 style="font-size:15px">Historial (${entradas.length})</h2>
      ${entradas.length?`<button class="ghost" style="border:1px solid var(--line)" onclick="famImprimirHistorial()">🖨️ Imprimir historial</button>`:""}
    </div>
    <div class="grid" style="gap:8px;margin-top:8px">${filas}</div>
  </div>
  ${state.ui.famModalNueva?famModalNuevaHTML(grupo):""}`;
}
window.famImprimirHistorial=()=>{
  const grupo=grupoActual();
  const filtroAl=state.ui.famFiltroAlumno||"", filtroMedio=state.ui.famFiltroMedio||"";
  let entradas=(grupo.contactosFamilia||[]).slice().sort((a,b)=>a.fecha.localeCompare(b.fecha));
  if(filtroAl) entradas=entradas.filter(e=>e.alumnoId===filtroAl);
  if(filtroMedio) entradas=entradas.filter(e=>e.medio===filtroMedio);
  const nombreAl=id=>{ const a=grupo.alumnos.find(x=>x.id===id); return a?a.nombre:"—"; };
  const filas=entradas.map(e=>`<tr><td style="white-space:nowrap;font-size:12px">${fmt2(e.fecha)}</td><td>${esc(nombreAl(e.alumnoId))}</td><td>${famMedioInfo(e.medio).label}</td><td>${esc(e.asunto)||"—"}</td><td>${esc(e.notas)||"—"}</td></tr>`).join("");
  const body=`
    <h1>Contacto con familias</h1>
    <div class="meta">${esc(grupo.nombre)} · Generado el ${new Date().toLocaleDateString("es-ES")}</div>
    <table><thead><tr><th style="width:90px">Fecha</th><th>Alumno/a</th><th>Medio</th><th>Asunto</th><th>Notas</th></tr></thead><tbody>${filas}</tbody></table>
  `;
  const portada=generarPortadaHTML(`Contacto con familias — ${grupo.nombre}`,
    [`Curso escolar: <strong>${esc(cursoEscolarEfectivo(null))}</strong>`,
     profesorNombreEfectivo(null)?`Elaborado por: <strong>${esc(profesorNombreEfectivo(null))}</strong>`:""], []);
  abrirVentanaInforme(`Contacto con familias — ${grupo.nombre}`, body, {portada});
};

