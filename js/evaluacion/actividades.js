/* ============================================================================
   Cuaderno del profesor · Actividades y recuperaciones (interfaz)
   js/evaluacion/actividades.js
   ============================================================================ */

/* ---------- Actividades ---------- */
function renderActividades(grupo){
  const idx=catIndex(grupo.catalogoKey);
  const f=state.ui.form;
  if(!f.bloqueId) f.bloqueId=defBloque(f.tipo,grupo.bloques);
  const editando=!!f.editId;
  const bloqueSel=grupo.bloques.find(b=>b.id===f.bloqueId);
  const previewCount=grupo.actividades.filter(a=>a.trimestre===state.ui.trim && a.bloqueId===f.bloqueId && a.id!==f.editId && !a.recupera).length+1;
  const previewPct=(100/previewCount).toFixed(0);
  const prog=progDeGrupo(grupo);
  const c=document.getElementById("tabContent");
  const formularioLibreHTML=`
  <div class="card">
    <h2>${editando?"Editar actividad":"Nueva actividad de evaluación"}</h2>
    <p class="sub">${editando?"Modifica los datos y guarda los cambios.":`Se crea en ${TRIMESTRES[state.ui.trim]}.`} Marca uno o varios criterios; cada uno con su peso dentro de la actividad. El bloque decide en qué cuenta para la nota cuantitativa.</p>
    <div class="grid" style="margin-bottom:14px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))">
      <input class="in" id="fN" placeholder="Nombre de la actividad" value="${esc(f.nombre)}">
      ${prog?"":`<input class="in" id="fSdA" placeholder="Situación de Aprendizaje (opcional, ej. SdA 1)" value="${esc(f.sda||'')}">`}
    </div>
    <div class="grid" style="margin-bottom:14px">
      <div class="flex">
        <select class="in" id="fT">${TIPOS.map(t=>`<option ${t===f.tipo?"selected":""}>${t}</option>`).join("")}</select>
        <select class="in" id="fB">${grupo.bloques.map(b=>`<option value="${b.id}" ${b.id===f.bloqueId?"selected":""}>${esc(b.label)} (${b.peso} %)</option>`).join("")}</select>
        <label style="display:flex;align-items:center;gap:7px;font-size:14px;color:var(--mut)">
          <input type="checkbox" id="fE" ${f.esExamen?"checked":""}> Es examen / prueba objetiva (nota cuantitativa propia)
        </label>
      </div>
      <label style="display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--mut);max-width:420px">
        Peso dentro de "${bloqueSel?esc(bloqueSel.label):""}"
        <input class="in" style="width:80px" type="number" min="0" id="fPB" placeholder="${previewPct}" value="${f.pesoBloque??""}">%
      </label>
      <p class="sub" style="margin:0">Déjalo en blanco para repartir el bloque a partes iguales entre sus actividades (ahora mismo: ${previewPct} %). Ponlo solo si, por ejemplo, un examen debe pesar más que otro dentro del mismo bloque.</p>
    </div>
    <div style="font-size:14px;font-weight:500;margin-bottom:8px">Criterios evaluados</div>
    ${f.esExamen?'<p class="sub" style="margin:-4px 0 8px">En un examen, el peso de cada criterio solo se usa para la calificación cualitativa (competencias). La nota cuantitativa del examen se introduce aparte, en la pantalla "Calificar", y es la que cuenta para la nota numérica.</p>':''}
    <div class="scroll">
      ${idx.cat.ces.map(ce=>`
        <div style="font-size:12.5px;color:var(--mut);font-weight:500;margin:6px 0 3px">${ce.id} · ${esc(ce.titulo)}</div>
        ${ce.criterios.map(cr=>{
          const l=f.links.find(x=>x.critId===cr.id);
          return `<div class="critbox ${l?"sel":""}">
            <label style="display:flex;align-items:center;gap:9px;flex:1;cursor:pointer;font-size:13.5px">
              <input type="checkbox" ${l?"checked":""} onchange="toggleCrit('${cr.id}')">
              <span><strong>${cr.id}</strong> ${esc(cr.texto)}</span>
            </label>
            ${l?`<span style="display:flex;align-items:center;gap:4px;font-size:12.5px;color:var(--mut)">peso
              <input class="in miniw" type="number" min="0" value="${l.peso}" onchange="setLinkPeso('${cr.id}',this.value)"></span>`:""}
          </div>`;}).join("")}
      `).join("")}
    </div>
    <div class="flex" style="margin-top:12px">
      <button class="btn" id="fSave" onclick="saveActividad()" ${(!f.nombre.trim()||!f.links.length)?"disabled":""}>${editando?"Guardar cambios":"Guardar actividad"}</button>
      ${editando?`<button class="ghost" onclick="cancelarEdicionActividad()">Cancelar</button>`:""}
    </div>
  </div>`;
  const selectorProgramacionHTML=!prog?"":`
  <div class="card">
    <h2>Añadir actividad desde la Programación</h2>
    <p class="sub">Este grupo tiene vinculada la Programación "<strong>${esc(prog.nombre)}</strong>". Elige la Situación de Aprendizaje y, dentro de ella, la actividad ya planificada — se copiará aquí con sus criterios y pesos, lista para calificar.</p>
    <div class="flex" style="flex-wrap:wrap;gap:8px;align-items:center">
      <select class="in" id="actElegirSda" style="min-width:220px" onchange="actActualizarSelectorActividad()">
        <option value="">— Elige la Situación de Aprendizaje —</option>
        ${prog.sdas.map(s=>`<option value="${s.id}">${TRIMESTRES[s.trimestre]} · ${esc(s.titulo||"(sin título)")}</option>`).join("")}
        ${prog.actividades.some(a=>!(a.sdaIds||[]).length)?`<option value="__sinsda__">— Actividades sin SdA asignada —</option>`:""}
      </select>
      <select class="in" id="actElegirActividad" style="min-width:220px">
        <option value="">— Elige la actividad —</option>
      </select>
      <button class="btn" onclick="actAnadirDesdeProgramacion()">+ Añadir esta actividad</button>
    </div>
    <p class="sub" style="margin-top:8px">¿Falta la actividad que buscas? <a onclick="irAProgramacion()" style="cursor:pointer;text-decoration:underline;color:var(--brand-3)">Añádela en Programación de Aula</a> y vuelve aquí — se puede ir completando durante el curso.</p>
  </div>`;
  c.innerHTML=(editando||!prog?formularioLibreHTML:selectorProgramacionHTML)+`
  <div class="card">
    <h2>Actividades de ${TRIMESTRES[state.ui.trim]}</h2>
    ${actsTrim(grupo).length>1?`<p class="sub" style="margin:4px 0 0">Ordénalas a tu gusto: arrastra una actividad por ⠿ o usa ▲▼. El orden se usa también en Calificar, Resultados e informes.</p>`:""}
    ${actsTrim(grupo).length? `<div class="grid" style="margin-top:8px">${actsTrim(grupo).map((a,iAct,lista)=>{
      const b=grupo.bloques.find(x=>x.id===a.bloqueId);
      const pctEnBloque=pesoActividadEnBloque(grupo,a).toFixed(0);
      const tipoDesc = a.rubrica ? "examen con rúbrica: nota cuantitativa + % por criterio (gestionado desde el Corrector)"
        : a.esExamen ? "examen: nota cuantitativa + escala de 4 niveles por criterio" : "escala de 4 niveles";
      const nAct=lista.length;
      return `<div class="act-row" ${nAct>1?`draggable="true" ondragstart="actDragStart(event,'${a.id}')" ondragend="actDragEnd()" ondragover="actDragOver(event,this)" ondragleave="this.classList.remove('act-drop')" ondrop="actDrop(event,'${a.id}')"`:""} data-actid="${a.id}" style="border:1px solid var(--line);border-radius:8px;padding:10px 12px">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:start">
          ${nAct>1?`<div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0">
            <span style="cursor:grab;color:var(--mut);font-size:17px;user-select:none;line-height:1" title="Arrastra para reordenar">⠿</span>
            <button class="ghost" style="padding:2px 8px;min-width:0" title="Subir un puesto" aria-label="Subir ${esc(a.nombre)}" ${iAct===0?"disabled":""} onclick="moverActividad('${a.id}',-1)">▲</button>
            <button class="ghost" style="padding:2px 8px;min-width:0" title="Bajar un puesto" aria-label="Bajar ${esc(a.nombre)}" ${iAct===nAct-1?"disabled":""} onclick="moverActividad('${a.id}',1)">▼</button>
          </div>`:""}
          <div style="flex:1;min-width:0">
            <div style="font-size:14.5px;font-weight:500">${esc(a.nombre)} ${a.sda ? `<span class="badge" style="vertical-align:middle;margin-left:6px">${esc(a.sda)}</span>` : ''}</div>
            <div style="font-size:12.5px;color:var(--mut);margin-top:2px">${a.tipo} · ${b?esc(b.label):""} · ${tipoDesc}</div>
            ${a.recupera?`<div style="font-size:12.5px;margin-top:2px;color:var(--accent-2,#8a5a12);font-weight:600">🔁 ${recResumenTexto(grupo,a)}</div>`:`<div style="font-size:12.5px;color:var(--mut);margin-top:2px">Peso dentro del bloque: ${pctEnBloque} %${(a.pesoBloque==null||a.pesoBloque==="")?" (automático)":""}</div>`}
            ${!a.recupera && recuperacionesDe(grupo,a.id).length?`<div style="font-size:12.5px;color:var(--mut);margin-top:2px">🔁 Tiene recuperación: ${recuperacionesDe(grupo,a.id).map(r=>esc(r.nombre)).join(", ")}</div>`:""}
            ${cxAvisoCriteriosBadgeHTML(grupo,a)}
            <div style="font-size:12.5px;color:var(--mut);margin-top:4px">Criterios: ${a.criterios.length?a.criterios.map(l=>`${critLinkHTML(grupo.catalogoKey,l.critId)} (${l.peso})`).join(" · "):"ninguno todavía"}</div>
          </div>
          <div class="flex">
            ${a.rubrica?`<button class="ghost" onclick="cxAbrirDesdeOtroModo('${a.id}')">Abrir en el Corrector</button>`:`<button class="ghost" onclick="editarActividad('${a.id}')">Editar</button>${a.esExamen?`<button class="ghost" title="Abre este examen en el Corrector con una rúbrica inicial (un ítem por criterio) para ajustarla y corregir con ella" onclick="cxAnadirRubrica('${a.id}')">🖊️ Añadir rúbrica</button>`:""}`}
            <button class="ghost" onclick="duplicarActividad('${a.id}')">Duplicar</button>
            ${a.recupera?`<button class="ghost" onclick="recAbrirModal('${a.id}')">🔁 Recuperación…</button>`:(a.esExamen?`<button class="ghost" title="Crea un examen de recuperación vinculado a este" onclick="recCrear('${a.id}')">🔁 Crear recuperación</button>`:`<button class="ghost" title="Marcar esta actividad como recuperación de otra(s)" onclick="recAbrirModal('${a.id}')">🔁</button>`)}
            <button class="ghost" onclick="delActividad('${a.id}')">Eliminar</button>
          </div>
        </div>
      </div>`;}).join("")}</div>`
      : '<p style="color:var(--mut);font-size:14px">Todavía no hay actividades en este periodo.</p>'}
  </div>
  ${state.ui.recModalAct?recModalHTML(grupo):""}
  ${grupo.papelera.actividades.length? `<div class="card">
    <h2 style="font-size:15px">Papelera de actividades</h2>
    <p class="sub">Las últimas eliminadas de este grupo, con las notas que tuvieran. Se guardan las ${grupo.papelera.actividades.length<10?"últimas "+grupo.papelera.actividades.length:"últimas 10"}.</p>
    <div class="grid">
      ${grupo.papelera.actividades.map((it,i)=>`
        <div class="row" style="justify-content:space-between">
          <span style="font-size:13.5px;color:var(--mut)">${esc(it.actividad.nombre)} · ${TRIMESTRES[it.actividad.trimestre]} · eliminada ${haceTiempo(it.borradoEn)}</span>
          <div class="flex">
            <button class="ghost" onclick="restaurarActividadPapelera(${i})">Restaurar</button>
            <button class="ghost danger" onclick="purgarActividadPapelera(${i})">Eliminar definitivamente</button>
          </div>
        </div>`).join("")}
    </div>
  </div>` : ""}`;
  document.getElementById("fN")?.addEventListener("input",e=>{ state.ui.form.nombre=e.target.value; save();
    document.getElementById("fSave").disabled=!(state.ui.form.nombre.trim()&&state.ui.form.links.length); });
  document.getElementById("fSdA")?.addEventListener("input",e=>{ state.ui.form.sda=e.target.value; save(); });
  document.getElementById("fT")?.addEventListener("change",e=>{ const ff=state.ui.form; ff.tipo=e.target.value; ff.esExamen=e.target.value.includes("examen"); ff.bloqueId=defBloque(e.target.value,grupo.bloques); save(); render(); });
  document.getElementById("fPB")?.addEventListener("change",e=>{ setPesoBloqueForm(e.target.value); render(); });
  document.getElementById("fB")?.addEventListener("change",e=>{ state.ui.form.bloqueId=e.target.value; save(); });
  document.getElementById("fE")?.addEventListener("change",e=>{ state.ui.form.esExamen=e.target.checked; save(); render(); });
}
window.toggleCrit=cid=>{ const L=state.ui.form.links; const i=L.findIndex(x=>x.critId===cid);
  if(i>=0) L.splice(i,1); else L.push({critId:cid,peso:100}); save(); render(); };
window.setLinkPeso=(cid,v)=>{ const l=state.ui.form.links.find(x=>x.critId===cid); if(l){ l.peso=v; save(); } };
window.editarActividad=id=>{ const grupo=grupoActual(); const a=grupo.actividades.find(x=>x.id===id); if(!a) return;
  state.ui.form={editId:id,nombre:a.nombre,tipo:a.tipo,esExamen:a.esExamen,bloqueId:a.bloqueId,pesoBloque:a.pesoBloque??"",links:a.criterios.map(l=>({...l})),sda:a.sda||""};
  save(); render(); window.scrollTo(0,0); };
window.cancelarEdicionActividad=()=>{ state.ui.form={editId:null,nombre:"",tipo:TIPOS[0],esExamen:false,bloqueId:"",pesoBloque:"",links:[],sda:""}; save(); render(); };
window.actActualizarSelectorActividad=()=>{
  const grupo=grupoActual();
  const prog=progDeGrupo(grupo);
  const sdaId=document.getElementById("actElegirSda").value;
  const sel=document.getElementById("actElegirActividad");
  if(!prog||!sel){ return; }
  let acts=[];
  if(sdaId==="__sinsda__") acts=prog.actividades.filter(a=>!(a.sdaIds||[]).length);
  else if(sdaId) acts=prog.actividades.filter(a=>(a.sdaIds||[]).includes(sdaId));
  sel.innerHTML='<option value="">— Elige la actividad —</option>'+acts.map(a=>`<option value="${a.id}">${esc(a.nombre||"(sin nombre)")}${a.esExamen?" (examen)":""}</option>`).join("");
};
window.actAnadirDesdeProgramacion=()=>{
  const grupo=grupoActual();
  const prog=progDeGrupo(grupo);
  const actId=document.getElementById("actElegirActividad").value;
  if(!prog||!actId){ mostrarAviso("Elige primero la Situación de Aprendizaje y luego la actividad."); return; }
  const progAct=prog.actividades.find(a=>a.id===actId);
  if(!progAct){ mostrarAviso("Esa actividad ya no existe en la Programación."); return; }
  if(!(progAct.nombre||"").trim()){ mostrarAviso("Esa actividad todavía no tiene nombre en la Programación — complétalo allí antes de añadirla aquí."); return; }
  if(!(progAct.criterios||[]).length){ mostrarAviso("Esa actividad todavía no tiene criterios marcados en la Programación — márcalos allí antes de añadirla aquí."); return; }
  const act=progCrearActividadEnGrupo(grupo,progAct,state.ui.trim);
  save(); render();
  mostrarToast(act.rubrica? "✓ Examen añadido con rúbrica — ábrelo en el Corrector para ajustarla" : "✓ Actividad añadida — "+progAct.nombre);
};
/* Orden manual de las actividades de un trimestre: se reordenan dentro de
   grupo.actividades ocupando los mismos huecos que ya tenían las de ese
   trimestre, así que las de otros trimestres no se mueven. */
function actReordenarTrim(grupo,trim,fn){
  const acts=grupo.actividades;
  const huecos=[]; acts.forEach((x,k)=>{ if(x.trimestre===trim) huecos.push(k); });
  const orden=huecos.map(k=>acts[k]);
  if(fn(orden)===false) return false;
  orden.forEach((x,k)=>{ acts[huecos[k]]=x; });
  return true;
}
window.moverActividad=(id,dir)=>{
  const grupo=grupoActual(); const a=grupo&&grupo.actividades.find(x=>x.id===id); if(!a) return;
  const ok=actReordenarTrim(grupo,a.trimestre,orden=>{
    const i=orden.indexOf(a), j=i+dir;
    if(j<0||j>=orden.length) return false;
    [orden[i],orden[j]]=[orden[j],orden[i]];
  });
  if(ok){ save(); render(); }
};
let actArrastrando=null;
window.actDragStart=(ev,id)=>{
  actArrastrando=id;
  try{ ev.dataTransfer.effectAllowed="move"; ev.dataTransfer.setData("text/plain",id); }catch(_){}
  ev.currentTarget.classList.add("act-arrastrando");
};
window.actDragEnd=()=>{
  actArrastrando=null;
  document.querySelectorAll(".act-row").forEach(el=>el.classList.remove("act-drop","act-arrastrando"));
};
window.actDragOver=(ev,el)=>{
  if(!actArrastrando) return;
  ev.preventDefault();
  if(el.dataset.actid!==actArrastrando) el.classList.add("act-drop");
};
window.actDrop=(ev,destinoId)=>{
  ev.preventDefault();
  const origenId=actArrastrando;
  actDragEnd();
  if(!origenId||origenId===destinoId) return;
  const grupo=grupoActual(); if(!grupo) return;
  const origen=grupo.actividades.find(x=>x.id===origenId), destino=grupo.actividades.find(x=>x.id===destinoId);
  if(!origen||!destino||origen.trimestre!==destino.trimestre) return;
  const ok=actReordenarTrim(grupo,origen.trimestre,orden=>{
    const iO=orden.indexOf(origen), iD=orden.indexOf(destino);
    orden.splice(iO,1);
    orden.splice(iD,0,origen); // ocupa el puesto de la actividad sobre la que se suelta
  });
  if(ok){ save(); render(); }
};
window.duplicarActividad=id=>{ const grupo=grupoActual(); const a=grupo.actividades.find(x=>x.id===id); if(!a) return;
  const copia={...a,id:uid(),nombre:a.nombre+" (copia)",pesoBloque:a.pesoBloque??"",criterios:a.criterios.map(l=>({...l})),sda:a.sda||""};
  if(a.rubrica) copia.rubrica=JSON.parse(JSON.stringify(a.rubrica));
  if(a.variantes) copia.variantes=JSON.parse(JSON.stringify(a.variantes));
  if(a.recupera) copia.recupera=JSON.parse(JSON.stringify(a.recupera));
  grupo.actividades.push(copia);
  save(); render(); };
/* ---- v2 · Recuperaciones: interfaz ---- */
function recResumenTexto(grupo,r){
  const ids=(r.recupera&&r.recupera.ids)||[];
  const nombres=ids.map(id=>{ const a=grupo.actividades.find(x=>x.id===id); return a?`${esc(a.nombre)} (${TRIMESTRES[a.trimestre].replace(" evaluación","")})`:null; }).filter(Boolean);
  const modo=(REC_MODOS.find(m=>m.id===r.recupera.modo)||REC_MODOS[0]).label.toLowerCase();
  const tope=(r.recupera.tope!=null&&r.recupera.tope!=="")?` · nota máxima ${String(r.recupera.tope).replace(".",",")}`:"";
  return `Recuperación de ${nombres.length?nombres.join(", "):"(ninguna actividad)"} · ${modo}${tope}. No cuenta por sí sola: solo cambia la nota de lo que recupera, y solo a quien tenga nota en ella.`;
}
window.recCrear=id=>{
  const grupo=grupoActual(); const a=grupo.actividades.find(x=>x.id===id); if(!a) return;
  const r={id:uid(),trimestre:state.ui.trim,nombre:"Recuperación — "+a.nombre,tipo:a.tipo,bloqueId:a.bloqueId,esExamen:true,pesoBloque:"",
    criterios:a.criterios.map(l=>({...l})),sda:a.sda||"",recupera:{ids:[a.id],modo:"mayor",tope:""}};
  if(a.rubrica){ r.rubrica=JSON.parse(JSON.stringify(a.rubrica)); r.escalarA10=a.escalarA10!==false; }
  if(a.variantes) r.variantes=JSON.parse(JSON.stringify(a.variantes));
  grupo.actividades.push(r);
  state.ui.recModalAct=r.id; state.ui.tab="actividades";
  save(); render();
  mostrarToast("✓ Recuperación creada en "+TRIMESTRES[state.ui.trim]+". Revisa cómo cuenta.");
};
window.recAbrirModal=id=>{ state.ui.recModalAct=id; save(); render(); };
window.recCerrarModal=()=>{ state.ui.recModalAct=""; save(); render(); };
function recModalHTML(grupo){
  const r=grupo.actividades.find(x=>x.id===state.ui.recModalAct);
  if(!r){ state.ui.recModalAct=""; return ""; }
  const cfg=r.recupera||{ids:[],modo:"mayor",tope:""};
  const candidatas=grupo.actividades.filter(a=>a.id!==r.id && !a.recupera);
  const porTrim=[0,1,2].map(t=>({t,acts:candidatas.filter(a=>a.trimestre===t)})).filter(x=>x.acts.length);
  return `<div class="modal-overlay" onclick="if(event.target===this) recCerrarModal()">
    <div class="modal-box" style="max-width:620px">
      <div class="flex" style="justify-content:space-between;align-items:center"><h2 style="font-size:17px">🔁 ${esc(r.nombre)}</h2><button class="modal-close" onclick="recCerrarModal()" aria-label="Cerrar">×</button></div>
      <p class="sub">Marca qué actividades recupera. La recuperación <strong>no cuenta por sí sola</strong>: solo cambia la nota de esas actividades, y solo para el alumnado que tenga nota en ella. Las originales pueden ser de otro trimestre (p. ej. recuperar la 1ª evaluación en la 2ª).</p>
      <div class="scroll" style="max-height:34vh;border:1px solid var(--line);border-radius:8px;padding:6px 10px">
        ${porTrim.length?porTrim.map(x=>`<div style="font-size:12px;color:var(--mut);font-weight:600;margin:6px 0 2px">${TRIMESTRES[x.t]}</div>
          ${x.acts.map(a=>`<label style="display:flex;gap:8px;align-items:center;font-size:13.5px;padding:3px 0;cursor:pointer"><input type="checkbox" ${cfg.ids.includes(a.id)?"checked":""} onchange="recToggleOriginal('${r.id}','${a.id}',this.checked)"> ${esc(a.nombre)}${a.esExamen?' <span class="badge">examen</span>':""}</label>`).join("")}`).join(""):'<p class="sub">No hay otras actividades en el grupo.</p>'}
      </div>
      <div class="grid" style="margin-top:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">
        <label style="font-size:13px;color:var(--mut)">Cómo cuenta
          <select class="in" style="width:100%;margin-top:3px" onchange="recSetCampo('${r.id}','modo',this.value)">${REC_MODOS.map(m=>`<option value="${m.id}" ${cfg.modo===m.id?"selected":""}>${m.label}</option>`).join("")}</select>
        </label>
        <label style="font-size:13px;color:var(--mut)">Nota máxima al recuperar (opcional)
          <input class="in" type="text" inputmode="decimal" style="width:100%;margin-top:3px" placeholder="sin límite (p. ej. 5)" value="${cfg.tope==null?"":String(cfg.tope).replace(".",",")}" onchange="recSetCampo('${r.id}','tope',this.value)">
        </label>
      </div>
      <div class="flex" style="justify-content:space-between;margin-top:14px;flex-wrap:wrap;gap:8px">
        <button class="ghost danger" onclick="recQuitar('${r.id}')">Ya no es una recuperación</button>
        <button class="btn" onclick="recCerrarModal()">Hecho</button>
      </div>
    </div>
  </div>`;
}
window.recToggleOriginal=(rid,aid,on)=>{
  const grupo=grupoActual(); const r=grupo.actividades.find(x=>x.id===rid); if(!r) return;
  if(!r.recupera) r.recupera={ids:[],modo:"mayor",tope:""};
  const i=r.recupera.ids.indexOf(aid);
  if(on && i<0) r.recupera.ids.push(aid); else if(!on && i>=0) r.recupera.ids.splice(i,1);
  save(); render();
};
window.recSetCampo=(rid,campo,v)=>{
  const grupo=grupoActual(); const r=grupo.actividades.find(x=>x.id===rid); if(!r) return;
  if(!r.recupera) r.recupera={ids:[],modo:"mayor",tope:""};
  if(campo==="tope"){
    const n=parseNotaTexto(v);
    if(n===undefined){ mostrarAviso("La nota máxima debe ser un número entre 0 y 10, o dejarse en blanco."); render(); return; }
    r.recupera.tope=n==null?"":n;
  }else r.recupera[campo]=v;
  save(); render();
};
window.recQuitar=async rid=>{
  const grupo=grupoActual(); const r=grupo.actividades.find(x=>x.id===rid); if(!r) return;
  if(!await confirmar("Esta actividad dejará de ser una recuperación y pasará a contar como una actividad normal. ¿Continuar?")) return;
  delete r.recupera; state.ui.recModalAct=""; save(); render();
};
window.setPesoBloqueForm=v=>{ state.ui.form.pesoBloque=v; save(); };
window.saveActividad=()=>{ const grupo=grupoActual(); const f=state.ui.form;
  if(!f.nombre.trim()||!f.links.length) return;
  const criterios=f.links.map(l=>({critId:l.critId,peso:Number(l.peso)||0}));
  const pesoBloque=(f.pesoBloque===""||f.pesoBloque==null)?"":Number(f.pesoBloque);
  const sdaStr = (f.sda||"").trim();
  if(f.editId){
    const a=grupo.actividades.find(x=>x.id===f.editId);
    if(a){
      a.nombre=f.nombre.trim(); a.tipo=f.tipo; a.bloqueId=f.bloqueId; a.esExamen=f.esExamen; a.criterios=criterios; a.pesoBloque=pesoBloque; a.sda=sdaStr;
      const keep=new Set(criterios.map(l=>l.critId));
      for(const alId in grupo.notas){
        const n=grupo.notas[alId]?.[a.id]; if(!n) continue;
        for(const cid in n) if(!keep.has(cid)) delete n[cid];
      }
    }
  }else{
    grupo.actividades.push({id:uid(),trimestre:state.ui.trim,nombre:f.nombre.trim(),tipo:f.tipo,bloqueId:f.bloqueId,esExamen:f.esExamen,pesoBloque,criterios,sda:sdaStr});
  }
  state.ui.form={editId:null,nombre:"",tipo:TIPOS[0],esExamen:false,bloqueId:"",pesoBloque:"",links:[],sda:""}; save(); render(); };
window.delActividad=async id=>{ const grupo=grupoActual(); const a=grupo.actividades.find(x=>x.id===id); if(!a) return;
  if(await confirmar(`¿Eliminar la actividad "${a.nombre}"? Podrás restaurarla desde la papelera de esta pestaña si te equivocas.`)){
    const notas={}; const notasCuant={}; const rubricScores={}; const examComentarios={};
    for(const alId in grupo.notas){ if(grupo.notas[alId]?.[id]) notas[alId]=JSON.parse(JSON.stringify(grupo.notas[alId][id])); }
    for(const alId in grupo.notasCuant){ if(grupo.notasCuant[alId]?.[id]!=null) notasCuant[alId]=grupo.notasCuant[alId][id]; }
    for(const alId in (grupo.rubricScores||{})){ if(grupo.rubricScores[alId]?.[id]) rubricScores[alId]=JSON.parse(JSON.stringify(grupo.rubricScores[alId][id])); }
    for(const alId in (grupo.examComentarios||{})){ if(grupo.examComentarios[alId]?.[id]) examComentarios[alId]=grupo.examComentarios[alId][id]; }
    grupo.papelera.actividades.unshift({actividad:JSON.parse(JSON.stringify(a)),notas,notasCuant,rubricScores,examComentarios,borradoEn:Date.now()});
    if(grupo.papelera.actividades.length>10) grupo.papelera.actividades.length=10;
    grupo.actividades=grupo.actividades.filter(x=>x.id!==id);
    for(const al in grupo.notas) delete grupo.notas[al]?.[id];
    for(const al in grupo.notasCuant) delete grupo.notasCuant[al]?.[id];
    for(const al in (grupo.rubricScores||{})) delete grupo.rubricScores[al]?.[id];
    for(const al in (grupo.examComentarios||{})) delete grupo.examComentarios[al]?.[id];
    if(state.ui.form.editId===id) state.ui.form={editId:null,nombre:"",tipo:TIPOS[0],esExamen:false,bloqueId:"",pesoBloque:"",links:[],sda:""};
    if(state.ui.corExamId===id){ state.ui.corExamId=""; state.ui.corTab="lista"; }
    save(); render();
  } };
window.restaurarActividadPapelera=idx=>{
  const grupo=grupoActual(); const it=grupo.papelera.actividades[idx]; if(!it) return;
  grupo.actividades.push(it.actividad);
  for(const alId in it.notas){ grupo.notas[alId]=grupo.notas[alId]||{}; grupo.notas[alId][it.actividad.id]=it.notas[alId]; }
  for(const alId in (it.notasCuant||{})){ grupo.notasCuant[alId]=grupo.notasCuant[alId]||{}; grupo.notasCuant[alId][it.actividad.id]=it.notasCuant[alId]; }
  for(const alId in (it.rubricScores||{})){ grupo.rubricScores[alId]=grupo.rubricScores[alId]||{}; grupo.rubricScores[alId][it.actividad.id]=it.rubricScores[alId]; }
  for(const alId in (it.examComentarios||{})){ grupo.examComentarios[alId]=grupo.examComentarios[alId]||{}; grupo.examComentarios[alId][it.actividad.id]=it.examComentarios[alId]; }
  grupo.papelera.actividades.splice(idx,1);
  save(); render();
};
window.purgarActividadPapelera=idx=>{ const grupo=grupoActual(); grupo.papelera.actividades.splice(idx,1); save(); render(); };

