/* ============================================================================
   Cuaderno del profesor · Editor de texto enriquecido y actividades de la programación
   js/programacion/actividades-y-texto-rico.js
   ============================================================================ */

/* ---- Editor de texto enriquecido (negrita, color, viñetas y subviñetas) para los
   campos generales de la Programación (metodología y criterios de calificación).
   Se guarda como HTML saneado (solo unas pocas etiquetas seguras).
   Nota: RTE_COLORES/RTE_ETIQUETAS_PERMITIDAS/RTE_ELIMINAR_ENTERO se declaran DENTRO
   de las funciones (no como const de módulo) para que progSanitizarHTML pueda
   invocarse de forma segura desde la migración de datos, que corre muy pronto
   al cargar la página — antes de que un "const" a nivel de módulo definido más
   abajo en el archivo esté disponible (zona muerta temporal). ---- */
function progSanitizarHTML(html){
  if(!html) return "";
  const permitidas=new Set(["B","STRONG","I","EM","U","UL","OL","LI","BR","SPAN","DIV","P","FONT"]);
  const eliminarEntero=new Set(["SCRIPT","STYLE","TEMPLATE","IFRAME","OBJECT","EMBED","SVG","NOSCRIPT","LINK","META"]);
  const tmp=document.createElement("div");
  tmp.innerHTML=html;
  (function limpiar(nodo){
    [...nodo.childNodes].forEach(hijo=>{
      if(hijo.nodeType===1){
        if(eliminarEntero.has(hijo.tagName)){ nodo.removeChild(hijo); return; }
        if(!permitidas.has(hijo.tagName)){
          while(hijo.firstChild) nodo.insertBefore(hijo.firstChild,hijo);
          nodo.removeChild(hijo);
          return;
        }
        [...hijo.attributes].forEach(attr=>{
          const n=attr.name.toLowerCase();
          if(hijo.tagName==="FONT" && n==="color"){
            if(!/^#[0-9a-f]{3,8}$|^[a-z]+$/i.test(attr.value.trim())) hijo.removeAttribute("color");
            return;
          }
          if(n==="style"){
            const m=attr.value.match(/color\s*:\s*(#[0-9a-f]{3,8}|rgba?\([^)]*\)|[a-z]+)/i);
            if(m) hijo.setAttribute("style",`color:${m[1]}`); else hijo.removeAttribute("style");
            return;
          }
          hijo.removeAttribute(attr.name);
        });
        limpiar(hijo);
      } else if(hijo.nodeType!==3){
        nodo.removeChild(hijo);
      }
    });
  })(tmp);
  return tmp.innerHTML;
}
function progTextoAHTML(valor){
  if(!valor) return "";
  if(/<\s*(b|strong|i|em|u|ul|ol|li|br|span|div|p)[\s>]/i.test(valor)) return progSanitizarHTML(valor);
  return esc(valor).replace(/\n/g,"<br>");
}
let progRTEUltimaSeleccion={};
function progRTEGuardar(campo,el){
  const p=progPorId(state.ui.progId); if(!p) return;
  p[campo]=progSanitizarHTML(el.innerHTML);
  save();
}
window.progRTEInput=(campo,el)=>{ progRTEGuardar(campo,el); };
window.progRTECmd=(campo,cmd,valor)=>{
  const el=document.getElementById("rte_"+campo); if(!el) return;
  el.focus();
  document.execCommand(cmd,false,valor||null);
  progRTEGuardar(campo,el);
};
window.progRTEGuardarSeleccion=(campo)=>{
  const sel=window.getSelection();
  if(sel && sel.rangeCount>0){
    const el=document.getElementById("rte_"+campo);
    if(el && el.contains(sel.anchorNode)) progRTEUltimaSeleccion[campo]=sel.getRangeAt(0).cloneRange();
  }
};
window.progRTEColorCustom=(campo,input)=>{
  const el=document.getElementById("rte_"+campo); if(!el) return;
  const rango=progRTEUltimaSeleccion[campo];
  el.focus();
  if(rango){ const sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(rango); }
  document.execCommand("foreColor",false,input.value);
  progRTEGuardar(campo,el);
};
window.progRTEPegar=(ev,campo)=>{
  ev.preventDefault();
  const texto=(ev.clipboardData||window.clipboardData).getData("text/plain");
  document.execCommand("insertText",false,texto);
  const el=document.getElementById("rte_"+campo); if(el) progRTEGuardar(campo,el);
};
function progRTEToolbarHTML(campo){
  const colores=["#1f2937","#b91c1c","#b45309","#047857","#1d4ed8","#7c3aed"];
  return `<div class="flex rte-toolbar" style="gap:4px;flex-wrap:wrap;padding:5px 6px">
    <button type="button" class="ghost small" style="font-weight:800" title="Negrita" onmousedown="event.preventDefault()" onclick="progRTECmd('${campo}','bold')">N</button>
    <button type="button" class="ghost small" title="Viñetas" onmousedown="event.preventDefault()" onclick="progRTECmd('${campo}','insertUnorderedList')">• Viñetas</button>
    <button type="button" class="ghost small" title="Subviñeta (aumentar sangría)" onmousedown="event.preventDefault()" onclick="progRTECmd('${campo}','indent')">→ Subviñeta</button>
    <button type="button" class="ghost small" title="Reducir sangría" onmousedown="event.preventDefault()" onclick="progRTECmd('${campo}','outdent')">← Sangría</button>
    <span style="display:inline-flex;align-items:center;gap:4px;padding:0 2px">
      ${colores.map(c=>`<button type="button" title="Color de fuente" style="width:18px;height:18px;border-radius:50%;border:1px solid var(--line);background:${c};padding:0" onmousedown="event.preventDefault()" onclick="progRTECmd('${campo}','foreColor','${c}')"></button>`).join("")}
      <input type="color" title="Color personalizado" style="width:22px;height:22px;padding:0;border:1px solid var(--line);border-radius:6px;background:none" onmousedown="progRTEGuardarSeleccion('${campo}')" onchange="progRTEColorCustom('${campo}',this)">
    </span>
    <button type="button" class="ghost small" title="Quitar formato" onmousedown="event.preventDefault()" onclick="progRTECmd('${campo}','removeFormat')">✕ Formato</button>
  </div>`;
}
/* Secciones plegables de la Programación (Recursos didácticos, Metodología…).
   Empiezan plegadas: se rellenan una vez al principio de curso y así no
   obligan a hacer scroll hasta las Situaciones de Aprendizaje. */
function progPlegado(id){ const m=state.ui.progPlegados||{}; return m[id]!==false; }
window.progTogglePlegado=id=>{
  if(!state.ui.progPlegados||typeof state.ui.progPlegados!=="object") state.ui.progPlegados={};
  state.ui.progPlegados[id]=!progPlegado(id);
  save(); render();
};
function progRTETieneTexto(html){ const d=document.createElement("div"); d.innerHTML=html||""; return !!(d.textContent||"").trim(); }
function progCabeceraPlegableHTML(id,titulo,resumen){
  const pl=progPlegado(id);
  return `<button class="home-seccion-header" style="margin:0;padding:2px 2px" aria-expanded="${!pl}" onclick="progTogglePlegado('${id}')">
    <span class="home-seccion-chevron" style="font-size:12px">${pl?"▸":"▾"}</span>
    <span style="font-size:15px;font-weight:700;color:var(--ink)">${titulo}</span>
    ${pl&&resumen?`<span style="font-size:12.5px;color:var(--mut);margin-left:6px">${resumen}</span>`:""}
  </button>`;
}
function progRTEEditorHTML(campo,valorHTML,placeholder){
  return `${progRTEToolbarHTML(campo)}<div id="rte_${campo}" class="in rte-editable" contenteditable="true" data-placeholder="${esc(placeholder||"")}" style="width:100%;min-height:90px" oninput="progRTEInput('${campo}',this)" onblur="progRTEInput('${campo}',this)" onpaste="progRTEPegar(event,'${campo}')">${valorHTML||""}</div>`;
}
window.progToggleSaberesAbierto=(sdaId)=>{ state.ui.progSaberesAbierto = state.ui.progSaberesAbierto===sdaId?null:sdaId; save(); render(); };
window.progToggleSaberSda=(sdaId,saberId,checked)=>{
  const p=progPorId(state.ui.progId); if(!p) return;
  const s=p.sdas.find(x=>x.id===sdaId); if(!s) return;
  if(!Array.isArray(s.saberesIds)) s.saberesIds=[];
  const idx=s.saberesIds.indexOf(saberId);
  if(checked && idx===-1) s.saberesIds.push(saberId);
  else if(!checked && idx!==-1) s.saberesIds.splice(idx,1);
  save(); render();
};
window.progAnadirActividad=(sdaId)=>{
  const p=progPorId(state.ui.progId); if(!p) return;
  const a=progActividadDefault();
  if(sdaId) a.sdaIds=[sdaId];
  p.actividades.push(a);
  save(); render();
};
window.progEliminarActividad=async (actId)=>{
  const p=progPorId(state.ui.progId); if(!p) return;
  if(!await confirmar("¿Eliminar esta actividad de la Programación? No se puede deshacer.")) return;
  p.actividades=p.actividades.filter(a=>a.id!==actId);
  save(); render();
};
/* Reordena una actividad dentro del listado de una SdA concreta (o de las
   "sin SdA" si grupoId es ""), moviéndola un puesto arriba/abajo (dir=-1/1).
   Las actividades se guardan en una única lista p.actividades (una misma
   actividad puede pertenecer a varias SdA a la vez), así que se busca su
   posición dentro del subconjunto que comparte esa SdA y se intercambia con
   la vecina en ese mismo subconjunto, igual que ya se hace con progMoverSda. */
window.progMoverActividad=(actId,grupoId,dir)=>{
  const p=progPorId(state.ui.progId); if(!p) return;
  const enGrupo=grupoId? (a=>(a.sdaIds||[]).includes(grupoId)) : (a=>!(a.sdaIds||[]).length);
  const mismos=p.actividades.filter(enGrupo);
  const posSub=mismos.findIndex(a=>a.id===actId); if(posSub===-1) return;
  const posVecinoSub=posSub+dir;
  if(posVecinoSub<0||posVecinoSub>=mismos.length) return;
  const act=mismos[posSub], vecino=mismos[posVecinoSub];
  const i1=p.actividades.indexOf(act), i2=p.actividades.indexOf(vecino);
  [p.actividades[i1],p.actividades[i2]]=[p.actividades[i2],p.actividades[i1]];
  save(); render();
};
window.progSetActividadCampo=(actId,campo,valor)=>{
  const p=progPorId(state.ui.progId); if(!p) return;
  const a=p.actividades.find(x=>x.id===actId); if(!a) return;
  a[campo]= campo==="esExamen"?valor:valor;
  save();
};
window.progToggleActividadSda=(actId,sdaId,checked)=>{
  const p=progPorId(state.ui.progId); if(!p) return;
  const a=p.actividades.find(x=>x.id===actId); if(!a) return;
  if(!Array.isArray(a.sdaIds)) a.sdaIds=[];
  const idx=a.sdaIds.indexOf(sdaId);
  if(checked && idx===-1) a.sdaIds.push(sdaId);
  else if(!checked && idx!==-1) a.sdaIds.splice(idx,1);
  save(); render();
};
window.progToggleActividadCriterio=(actId,critId,checked)=>{
  const p=progPorId(state.ui.progId); if(!p) return;
  const a=p.actividades.find(x=>x.id===actId); if(!a) return;
  if(!Array.isArray(a.criterios)) a.criterios=[];
  const idx=a.criterios.findIndex(c=>c.critId===critId);
  if(checked && idx===-1) a.criterios.push({critId,peso:100});
  else if(!checked && idx!==-1) a.criterios.splice(idx,1);
  save(); render();
};
window.progSetActividadCriterioPeso=(actId,critId,peso)=>{
  const p=progPorId(state.ui.progId); if(!p) return;
  const a=p.actividades.find(x=>x.id===actId); if(!a) return;
  const c=(a.criterios||[]).find(x=>x.critId===critId); if(c) c.peso=Number(peso)||0;
  save();
};
window.progToggleActividadAbierta=(actId)=>{ state.ui.progActividadAbierta = state.ui.progActividadAbierta===actId?null:actId; save(); render(); };
function progActividadCardHTML(idx,a,p,grupoId,iAct,totalGrupo){
  const abierta=state.ui.progActividadAbierta===a.id;
  const nCrit=(a.criterios||[]).length;
  const conOrden=typeof iAct==="number";
  return `<div class="card" style="margin-top:8px">
    <div class="flex" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
      ${conOrden?`<span style="display:inline-flex;gap:2px">
        <button class="ghost" style="padding:2px 8px;min-width:0" title="Subir un puesto" ${iAct===0?"disabled":""} onclick="progMoverActividad('${a.id}','${grupoId}',-1)">▲</button>
        <button class="ghost" style="padding:2px 8px;min-width:0" title="Bajar un puesto" ${iAct===totalGrupo-1?"disabled":""} onclick="progMoverActividad('${a.id}','${grupoId}',1)">▼</button>
      </span>`:""}
      <input class="in" style="flex:2;min-width:180px;font-weight:600" placeholder="Nombre de la actividad…" value="${esc(a.nombre)}" onchange="progSetActividadCampo('${a.id}','nombre',this.value)">
      <select class="in" style="flex:1;min-width:120px" onchange="progSetActividadCampo('${a.id}','tipo',this.value)">
        ${TIPOS.map(t=>`<option value="${t}" ${a.tipo===t?"selected":""}>${t}</option>`).join("")}
      </select>
      <label style="font-size:12.5px;display:flex;align-items:center;gap:5px;color:var(--mut)">
        <input type="checkbox" ${a.esExamen?"checked":""} onchange="progSetActividadCampo('${a.id}','esExamen',this.checked);render()"> Es examen
      </label>
      ${a.esExamen?`<button class="ghost" style="border:1px solid var(--line)" title="Abre este examen en el Corrector del grupo vinculado para crear o editar su rúbrica (si aún no está en Evaluación, se añade)" onclick="progAbrirEnCorrector('${a.id}')">🖊️ Abrir en el Corrector</button>`:""}
      <button class="ghost danger" onclick="progEliminarActividad('${a.id}')">✕</button>
    </div>
    ${a.esExamen&&(a.rubrica||[]).length?(()=>{ const n=cxItemsFlat(a.rubrica).length, tot=cxMaxTotal(a.rubrica);
      return `<div style="font-size:12.5px;color:var(--mut);margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">📌 Rúbrica guardada: ${a.rubrica.length} apartado${a.rubrica.length===1?"":"s"}, ${n} ítem${n===1?"":"s"}, ${String(Math.round(tot*100)/100).replace(".",",")} pts — se usará al traer este examen a cualquier grupo.
        <button class="ghost danger small" style="padding:2px 8px" onclick="progQuitarRubrica('${a.id}')">Quitar</button></div>`; })():""}
    <div style="margin-top:8px">
      <div class="section-eyebrow" style="margin:0 0 4px">Situaciones de Aprendizaje que cubre (marca varias si es un examen conjunto)</div>
      <div class="flex" style="flex-wrap:wrap;gap:10px">
        ${p.sdas.map(s=>`<label style="font-size:12.5px;display:flex;align-items:center;gap:5px">
          <input type="checkbox" ${(a.sdaIds||[]).includes(s.id)?"checked":""} onchange="progToggleActividadSda('${a.id}','${s.id}',this.checked)"> ${TRIMESTRES[s.trimestre].replace("ª evaluación","ª ev.")} · ${esc(s.titulo||"(sin título)")}
        </label>`).join("")||'<span class="sub">Crea antes alguna SdA.</span>'}
      </div>
    </div>
    <button class="ghost" style="border:1px solid var(--line);margin-top:8px" onclick="progToggleActividadAbierta('${a.id}')">${abierta?"Ocultar":"Elegir"} criterios de evaluación — ${nCrit} marcado${nCrit===1?"":"s"}</button>
    ${abierta?(()=>{
      const permitidas=progCEsPermitidasActividad(p,a);
      // CEs con algún criterio ya marcado aunque hayan quedado fuera de las
      // permitidas (p. ej. si luego se cambian los saberes de la SdA): se
      // siguen mostrando para no ocultar ni perder datos ya elegidos, con un
      // aviso, en vez de hacerlos desaparecer sin más.
      const idsConSeleccion=new Set((a.criterios||[]).map(c=>c.critId));
      const cesFueraConSeleccion=permitidas? idx.cat.ces.filter(ce=>!permitidas.has(ce.id) && ce.criterios.some(cr=>idsConSeleccion.has(cr.id))) : [];
      const cesBase=permitidas? idx.cat.ces.filter(ce=>permitidas.has(ce.id)) : idx.cat.ces;
      const cesAMostrar=[...cesBase, ...cesFueraConSeleccion];
      const aviso = permitidas===null
        ? `<p class="sub" style="margin:0 0 8px">Esta actividad no está vinculada a ninguna Situación de Aprendizaje, así que se muestran todos los criterios de la materia. Márcala en una SdA (arriba) para que solo aparezcan los de las competencias específicas trabajadas en ella.</p>`
        : (!cesBase.length ? `<p class="sub" style="margin:0 0 8px">Todavía no hay saberes básicos marcados en la Situación de Aprendizaje de esta actividad. Elígelos primero (en "Elegir saberes básicos") para que aquí aparezcan sus criterios de evaluación.</p>` : "");
      return `<div class="scroll" style="margin-top:8px;max-height:320px;overflow-y:auto;border:1px solid var(--line);border-radius:10px;padding:10px">
      ${aviso}
      ${cesAMostrar.map(ce=>`
        <div style="margin-bottom:10px">
          <div style="font-size:12.5px;font-weight:700;color:var(--ink)">${ce.id}${cesFueraConSeleccion.includes(ce)?' <span class="badge" style="background:var(--danger-soft);color:var(--danger)">fuera de los saberes elegidos</span>':""}</div>
          <div style="font-size:11.5px;color:var(--mut);margin:1px 0 6px;line-height:1.35">${esc(ce.titulo||"")}</div>
          ${ce.criterios.map(cr=>{
            const link=(a.criterios||[]).find(c=>c.critId===cr.id);
            return `<div style="display:flex;align-items:flex-start;gap:6px;padding:2px 4px;font-size:12.5px">
              <input type="checkbox" style="margin-top:3px" ${link?"checked":""} onchange="progToggleActividadCriterio('${a.id}','${cr.id}',this.checked)">
              <span style="flex:1">${esc(cr.texto)}</span>
              ${link?`<input type="number" class="in miniw" style="width:56px" min="0" max="100" value="${link.peso}" onchange="progSetActividadCriterioPeso('${a.id}','${cr.id}',this.value)">`:""}
            </div>`;
          }).join("")}
        </div>`).join("")}
    </div>`;
    })():""}
  </div>`;
}
