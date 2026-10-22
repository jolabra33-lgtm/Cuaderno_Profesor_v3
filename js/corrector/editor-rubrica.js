/* ============================================================================
   Cuaderno del profesor · Editor de rúbrica y rúbricas adaptadas (NESE)
   js/corrector/editor-rubrica.js
   ============================================================================ */

/* ---------- Editor de rúbrica ---------- */
const CX_NOMBRE_NIVEL=["Apartado","Subapartado","Sub-subapartado"];
const CX_NOMBRE_TIPO={apartado:"Apartado",pregunta:"Pregunta",subpregunta:"Subpregunta"};   // bloques importados del Diseño
function cxFmtPts(v){ return String(Math.round((Number(v)||0)*100)/100).replace(".",","); }
function renderCorEditor(grupo){
  const c=document.getElementById("tabContent");
  const act=grupo.actividades.find(a=>a.id===state.ui.corExamId);
  if(!act || !act.rubrica){ state.ui.corTab="lista"; renderCorLista(grupo); return; }
  if(state.ui.corVarId && !cxVariantes(act).some(v=>v.id===state.ui.corVarId)) state.ui.corVarId="";
  const variante=cxVarEditando(act);
  const rub=cxRubEd(act);
  const escalar=variante? variante.escalarA10!==false : !!act.escalarA10;
  const maxTotal=cxMaxTotal(rub);
  const totalOk=Math.abs(maxTotal-10)<0.01;
  const progRef=cxProgActDe(grupo,act);
  const enVariantes=new Set(cxVariantes(act).flatMap(v=>v.alumnos||[]));
  const nGeneral=grupo.alumnos.filter(al=>!enVariantes.has(al.id)).length;
  const prevCrit=cxCriteriosPrevistos(grupo,act);
  _cxCritPermitidos = prevCrit && !state.ui.corVerTodosCrit ? new Set(prevCrit) : null;
  _cxHayPrevistos = !!prevCrit;
  _cxPrevistosSet = prevCrit ? new Set(prevCrit) : null;
  const pestanas=`<div class="flex" style="flex-wrap:wrap;gap:6px;margin-top:12px;align-items:center">
      <button class="tab ${!variante?"on":""}" onclick="cxElegirVariante('')">Rúbrica general · ${nGeneral} alumno${nGeneral===1?"":"s"}</button>
      ${cxVariantes(act).map(v=>`<button class="tab ${variante&&variante.id===v.id?"on":""}" onclick="cxElegirVariante('${v.id}')">${esc(v.nombre||"Rúbrica adaptada")} · ${(v.alumnos||[]).length} alumno${(v.alumnos||[]).length===1?"":"s"}</button>`).join("")}
      <button class="ghost" style="border:1px dashed var(--line)" title="Examen diferente para uno o varios alumnos/as (p. ej. NESE): se corrigen con su propia rúbrica y el resto con la general" onclick="cxNuevaVariante()">+ Rúbrica adaptada (NESE)</button>
    </div>`;
  const panelVariante=variante? `<div class="card" style="border-left:4px solid var(--accent)">
    <div class="flex" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
      <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1;min-width:220px">Nombre de esta rúbrica adaptada
        <input class="in" style="width:100%;margin-top:4px" value="${esc(variante.nombre||"")}" onchange="cxSetVarianteNombre(this.value)">
      </label>
      <div class="flex" style="align-items:flex-end">
        <button class="ghost" style="border:1px solid var(--line)" title="Sustituye esta rúbrica adaptada por una copia de la general" onclick="cxCopiarGeneralEnVariante()">Copiar la general aquí</button>
        <button class="ghost danger" onclick="cxEliminarVariante()">Eliminar rúbrica adaptada</button>
      </div>
    </div>
    <div class="section-eyebrow" style="margin:12px 0 6px">Alumnado que hace este examen</div>
    <div class="flex" style="flex-wrap:wrap;gap:6px 16px">
      ${[...grupo.alumnos].sort((a,b)=>Number(!!b.nese)-Number(!!a.nese)).map(al=>{
        const otra=cxVarianteDeAlumno(act,al.id);
        const aqui=otra&&otra.id===variante.id;
        const bloqueado=otra&&!aqui;
        return `<label style="font-size:13px;display:flex;align-items:center;gap:6px;${bloqueado?"opacity:.55":""}" ${bloqueado?`title="Ya hace «${esc(otra.nombre||"otra rúbrica adaptada")}»"`:""}>
          <input type="checkbox" ${aqui?"checked":""} ${bloqueado?"disabled":""} onchange="cxToggleAlumnoVariante('${al.id}',this.checked)"> ${esc(al.nombre)}${neseBadgeHTML(al)}
        </label>`;
      }).join("")||'<span class="sub">Este grupo todavía no tiene alumnado.</span>'}
    </div>
    <p class="sub" style="margin:8px 0 0">Quien esté marcado aquí se corrige con esta rúbrica y no con la general; su nota cuenta en el mismo examen, con el mismo peso.</p>
  </div>` : "";
  c.innerHTML=`
  <div class="card">
    <div class="flex" style="justify-content:space-between;align-items:flex-start;flex-wrap:wrap">
      <input class="in" id="cxNombre" value="${esc(act.nombre)}" style="font-size:15px;font-weight:600;min-width:240px;flex:1">
      <div class="flex">
        <select class="in" id="cxBloque">${grupo.bloques.map(b=>`<option value="${b.id}" ${b.id===act.bloqueId?"selected":""}>${esc(b.label)}</option>`).join("")}</select>
        <input class="in" id="cxSda" placeholder="SdA (opcional)" value="${esc(act.sda||'')}" style="width:160px">
        <button class="ghost" style="border:1px solid var(--line)" onclick="cxIrLista()">← Exámenes</button>
      </div>
    </div>
    <div class="flex" style="margin-top:10px;align-items:center">
      <label style="font-size:12.5px;color:var(--mut);display:flex;align-items:center;gap:6px">Peso dentro del bloque
        <input class="in miniw" type="number" min="0" style="width:70px" value="${act.pesoBloque??''}" placeholder="auto" onchange="cxSetPesoBloque(this.value)">%
      </label>
    </div>
    ${pestanas}
  </div>
  ${panelVariante}
  ${cxPanelPrevistosHTML(grupo,act,rub,variante)}
  <div class="card">
    <p class="sub" style="margin:0">Organiza el examen como necesites: <strong>apartados</strong> con sus preguntas o ítems y, si hace falta, <strong>subapartados</strong> dentro (hasta ${CX_MAX_NIVELES} niveles). Cada ítem tiene su puntuación máxima, descriptores opcionales y los criterios de evaluación que trabaja. Si el alumnado elige (p. ej. «responda UNA de las dos opciones»), indica en ese apartado cuántos cuentan. Al importar desde el Diseño, la rúbrica copia su estructura (apartado → pregunta → subpregunta) con los puntos de cada parte.</p>
    <div class="flex" style="margin-top:10px;align-items:center">
      <span class="pill" style="background:${totalOk?'#dcece0':'#f3dcdc'};color:${totalOk?'#1e5631':'#912525'}">Suma de puntos${variante?" (rúbrica adaptada)":""}: ${maxTotal.toFixed(2)} / 10</span>

      ${!totalOk?`<label style="font-size:12.5px;color:var(--ink);display:inline-flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" ${escalar?"checked":""} onchange="cxSetEscalarA10(this.checked)"> Convertir la puntuación a nota sobre 10 ${maxTotal>0?`(p. ej. ${cxFmtPts(maxTotal/2)} puntos → 5)`:""}</label>
        ${escalar?"":'<span style="font-size:12.5px;color:var(--danger,#b91c1c)">Sin convertir, la nota será la suma de puntos (máximo 10).</span>'}`:''}
      <span style="flex:1"></span>
      <button class="ghost small" style="border:1px solid var(--line)" onclick="cxPlegarTodo(true)">▸ Plegar todo</button>
      <button class="ghost small" style="border:1px solid var(--line)" onclick="cxPlegarTodo(false)">▾ Desplegar todo</button>
    </div>
  </div>
  ${rub.map((sec,sIdx)=>renderCxNodoHTML(grupo,sec,0,sIdx,rub.length)).join("")}
  <div class="flex">
    <button class="btn" onclick="cxAddSeccion()">+ Añadir apartado</button>
    ${rub.length===1&&!rub[0].sinTitulo&&!cxElegirEf(rub[0])&&(!rub[0].tipo||rub[0].tipo==="apartado")?`<button class="ghost" style="border:1px solid var(--line)" title="Mostrar solo las preguntas, sin cabecera de apartado" onclick="cxOcultarApartado('${rub[0].id}')">Sin apartado</button>`:""}
    ${!variante?`<button class="ghost" style="border:1px solid var(--line)" onclick="cxGuardarComoPlantilla('${act.id}')">💾 Guardar como plantilla</button>`:""}
    ${progRef&&!variante?`<button class="ghost" style="border:1px solid var(--line)" title="Guarda esta rúbrica en el examen de la Programación &quot;${esc(progRef.prog.nombre)}&quot;: los demás grupos y los cursos siguientes la recibirán ya hecha al traer el examen" onclick="cxGuardarRubricaEnProgramacion('${act.id}')">📌 ${(progRef.progAct.rubrica||[]).length?"Actualizar la rúbrica de la Programación":"Guardar en la Programación"}</button>`:""}
    <button class="ghost" style="border:1px solid var(--line)" onclick="cxIrCorregir('${act.id}')">Ir a corregir →</button>
  </div>`;
  document.getElementById("cxNombre").addEventListener("change",e=>{ act.nombre=e.target.value.trim()||act.nombre;
    const evVinc=(state.eventos||[]).find(ev=>ev.examId===act.id); if(evVinc) evVinc.titulo=act.nombre;
    save(); });
  document.getElementById("cxBloque").addEventListener("change",e=>{ act.bloqueId=e.target.value; save(); });
  document.getElementById("cxSda").addEventListener("change",e=>{ act.sda=e.target.value.trim(); save(); });
  c.querySelectorAll("textarea.cx-autogrow").forEach(cxAutoGrow);
}
function cxAutoGrow(t){ t.style.height="auto"; t.style.height=(t.scrollHeight+2)+"px"; }
function renderCxPlanoHTML(grupo,sec){
  const items=sec.items||[], subs=sec.subs||[];
  return `<div class="card" data-cxnodo="${sec.id}">
    <div class="flex" style="justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
      <span class="section-eyebrow" style="margin:0">Preguntas · ${cxFmtPts(cxMaxNodo(sec))} pts</span>
      <button class="ghost small" style="border:1px solid var(--line)" title="Agrupar las preguntas bajo un apartado con título (también permite «a elegir»)" onclick="cxMostrarApartado('${sec.id}')">Usar apartado</button>
    </div>
    ${items.length?`<div class="grid" style="margin-top:10px;gap:10px">${items.map((it,i)=>renderCxItemHTML(grupo,sec,it,i)).join("")}</div>`:""}
    ${subs.map((x,i)=>renderCxNodoHTML(grupo,x,1,i,subs.length)).join("")}
    <div class="flex" style="margin-top:10px;gap:6px">
      <button class="ghost" style="border:1px solid var(--line)" onclick="cxAddItem('${sec.id}')">+ Pregunta / ítem</button>
      <button class="ghost" style="border:1px solid var(--line)" onclick="cxAddSub('${sec.id}')">+ ${CX_NOMBRE_NIVEL[1]}</button>
    </div>
  </div>`;
}
window.cxMostrarApartado=id=>{ const x=cxCtxEd(), n=x&&cxFindNodo(x.rub,id); if(!n) return; n.sinTitulo=false; if(!(n.title||"").trim()) n.title="Apartado 1"; save(); render(); };
window.cxOcultarApartado=id=>{ const x=cxCtxEd(), n=x&&cxFindNodo(x.rub,id); if(!n) return; n.sinTitulo=true; save(); render(); };
function renderCxNodoHTML(grupo,sec,depth,sIdx,nHermanos){
  if(depth===0 && sec.sinTitulo && !cxElegirEf(sec)) return renderCxPlanoHTML(grupo,sec);
  const items=sec.items||[], subs=sec.subs||[];
  const nHijos=items.length+subs.length;
  const k=cxElegirEf(sec);
  const nivel=CX_NOMBRE_TIPO[sec.tipo]||CX_NOMBRE_NIVEL[depth]||"Subapartado";
  const estilo= depth===0 ? "" : `margin:10px 0 0;padding:12px 12px 12px 14px;border:1px solid var(--line);border-left:4px solid ${depth===1?"var(--accent)":"var(--brand-3,#7a8fb3)"};border-radius:10px;background:var(--surface-2,transparent)`;
  const abre= depth===0 ? `<div class="card" data-cxnodo="${sec.id}">` : `<div style="${estilo}" data-cxnodo="${sec.id}">`;
  const plegado=cxEstaPlegado(sec.id);
  const nomSub=(sec.tipo==="apartado"?"pregunta":sec.tipo==="pregunta"?"subpregunta":(CX_NOMBRE_NIVEL[depth+1]||"Subapartado")).toLowerCase();
  const nomItem=(sec.tipo==="pregunta"||sec.tipo==="subpregunta")?"subpregunta":"pregunta";
  const resumen=[items.length?`${items.length} ${nomItem}${items.length===1?"":"s"}`:"", subs.length?`${subs.length} ${nomSub}${subs.length===1?"":"s"}`:""].filter(Boolean).join(" · ");
  const cabecera=`<div class="flex" style="justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
      <button class="ghost" style="display:flex;align-items:center;gap:8px;padding:2px 6px;margin-left:-6px;text-align:left;flex:1;min-width:0;justify-content:flex-start" title="${plegado?"Desplegar":"Plegar"}" aria-expanded="${!plegado}" onclick="cxTogglePlegado('${sec.id}')">
        <span style="display:inline-block;width:14px;transition:transform .15s;transform:rotate(${plegado?0:90}deg);color:var(--mut)">▶</span>
        <span class="section-eyebrow" style="margin:0">${nivel} · ${cxFmtPts(cxMaxNodo(sec))} pts${k?` · cuentan ${k} de ${nHijos}`:""}${plegado&&resumen?` · ${resumen}`:""}</span>
      </button>
      <div class="flex" style="gap:4px">`;
  if(plegado){
    const titulo=(sec.title||"").trim();
    return `${abre}
    ${cabecera}
        <button class="ghost small" title="Subir" ${sIdx===0?"disabled":""} onclick="cxMoveSeccion('${sec.id}',-1)">↑</button>
        <button class="ghost small" title="Bajar" ${sIdx===nHermanos-1?"disabled":""} onclick="cxMoveSeccion('${sec.id}',1)">↓</button>
      </div>
    </div>
    <div onclick="cxTogglePlegado('${sec.id}')" style="cursor:pointer;margin-top:4px;font-weight:600;font-size:${depth===0?"14.5px":"13.5px"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${titulo?"":"color:var(--mut);font-weight:400;font-style:italic"}">${titulo?esc(titulo.split("\n")[0]):"(sin título)"}</div>
  </div>`;
  }
  return `${abre}
    ${cabecera}
        <button class="ghost small" title="Subir" ${sIdx===0?"disabled":""} onclick="cxMoveSeccion('${sec.id}',-1)">↑</button>
        <button class="ghost small" title="Bajar" ${sIdx===nHermanos-1?"disabled":""} onclick="cxMoveSeccion('${sec.id}',1)">↓</button>
        <button class="ghost danger small" onclick="cxDelSeccion('${sec.id}')">Eliminar ${nivel.toLowerCase()}</button>
      </div>
    </div>
    <textarea class="in cx-autogrow" rows="1" style="display:block;width:100%;box-sizing:border-box;margin-top:6px;font-weight:600;resize:none;overflow:hidden;line-height:1.45;font-size:${depth===0?"14.5px":"13.5px"}" placeholder="${sec.tipo==="pregunta"||sec.tipo==="subpregunta"?"Enunciado de la "+sec.tipo:depth===0?"Título y enunciado del apartado (p. ej. II. Comentario de fuente histórica — elija UNA de las dos fuentes)":"Título y enunciado del subapartado (p. ej. 2.1. Describa el tipo de fuente, analice el contenido…)"}" oninput="cxAutoGrow(this)" onchange="cxSetSeccionTitle('${sec.id}',this.value)">${esc(sec.title||"")}</textarea>
    ${nHijos>=2?`<label style="font-size:12.5px;color:var(--mut);display:flex;align-items:center;gap:6px;margin-top:8px;flex-wrap:wrap">El alumnado responde
      <select class="in" style="padding:4px 8px" onchange="cxSetNodoElegir('${sec.id}',this.value)">
        <option value="0" ${!k?"selected":""}>todo (${nHijos} de ${nHijos})</option>
        ${Array.from({length:nHijos-1},(_,i)=>i+1).map(n=>`<option value="${n}" ${k===n?"selected":""}>solo ${n} de ${nHijos}, a elegir</option>`).join("")}
      </select>
      ${k?`<span>· al corregir, puntúa solo lo que haya respondido: ${k===1?"cuenta la mejor":`cuentan las ${k} mejores`}.</span>`:""}
    </label>`:""}
    ${items.length?`<div class="grid" style="margin-top:10px;gap:10px">
      ${items.map((it,iIdx)=>renderCxItemHTML(grupo,sec,it,iIdx)).join("")}
    </div>`:""}
    ${subs.map((s,i)=>renderCxNodoHTML(grupo,s,depth+1,i,subs.length)).join("")}
    <div class="flex" style="margin-top:10px;gap:6px">
      <button class="ghost" style="border:1px solid var(--line)" onclick="cxAddItem('${sec.id}')">+ Pregunta / ítem</button>
      ${depth<CX_MAX_NIVELES-1?`<button class="ghost" style="border:1px solid var(--line)" onclick="cxAddSub('${sec.id}')">+ ${sec.tipo==="apartado"?"Pregunta con subpreguntas":sec.tipo==="pregunta"?"Subpregunta con partes":CX_NOMBRE_NIVEL[depth+1]}</button>`:""}
    </div>
  </div>`;
}
function cxEstaPlegado(id){ return !!(state.ui.corPlegados&&state.ui.corPlegados[id]); }
function cxDesplegar(id){ if(state.ui.corPlegados) delete state.ui.corPlegados[id]; }
window.cxTogglePlegado=id=>{
  if(!state.ui.corPlegados||typeof state.ui.corPlegados!=="object") state.ui.corPlegados={};
  if(state.ui.corPlegados[id]) delete state.ui.corPlegados[id]; else state.ui.corPlegados[id]=true;
  save(); render();
  // Mantener a la vista el apartado que se acaba de plegar o desplegar.
  const el=document.querySelector(`[data-cxnodo="${id}"]`);
  if(el){ const r=el.getBoundingClientRect(); if(r.top<80||r.top>window.innerHeight-60) el.scrollIntoView({block:"start",behavior:"auto"}); if(el.getBoundingClientRect().top<90) window.scrollBy(0,-110); }
};
window.cxPlegarTodo=plegar=>{
  const x=cxCtxEd(); if(!x) return;
  if(!state.ui.corPlegados||typeof state.ui.corPlegados!=="object") state.ui.corPlegados={};
  cxNodosFlat(x.rub).forEach(({n})=>{ if(plegar) state.ui.corPlegados[n.id]=true; else delete state.ui.corPlegados[n.id]; });
  save(); render();
};
function renderCxItemHTML(grupo,sec,it,iIdx){
  const idx=catIndex(grupo.catalogoKey);
  const abierto=state.ui.corItemAbierto===it.id;
  const nCrit=(it.links||[]).length;
  return `<div style="border:1px solid var(--line);border-radius:8px;padding:10px 12px;background:var(--surface,#fff)">
    <div class="flex" style="align-items:flex-start">
      ${it.unico?`<span style="flex:1;min-width:180px;font-size:12.5px;color:var(--mut)">Puntuación de la pregunta</span>`:`<input class="in" placeholder="Pregunta / enunciado / criterio de corrección" value="${esc(it.label)}" style="flex:1;min-width:180px" onchange="cxSetItemLabel('${sec.id}','${it.id}',this.value)">`}
      <span class="flex" style="gap:4px;align-items:center">
        <input class="in miniw" type="text" inputmode="decimal" autocomplete="off" value="${String(it.max).replace('.',',')}" style="width:70px" onchange="cxSetItemMax('${sec.id}','${it.id}',this.value)">
        <span style="font-size:12.5px;color:var(--mut)">pts</span>
      </span>
      <button class="ghost small" ${iIdx===0?"disabled":""} onclick="cxMoveItem('${sec.id}','${it.id}',-1)">↑</button>
      <button class="ghost small" ${iIdx===(sec.items||[]).length-1?"disabled":""} onclick="cxMoveItem('${sec.id}','${it.id}',1)">↓</button>
      <button class="ghost danger" onclick="cxDelItem('${sec.id}','${it.id}')">Eliminar</button>
    </div>
    <textarea class="in cx-autogrow" style="width:100%;box-sizing:border-box;margin-top:6px;min-height:44px;resize:vertical;font-size:13px" placeholder="Descriptores (opcional, una línea por cada uno: p. ej. «Identifica el tipo de fuente y su autor (0,5)»)" oninput="cxAutoGrow(this)" onchange="cxSetItemDesc('${sec.id}','${it.id}',this.value)">${esc((it.desc||[]).join("\n"))}</textarea>
    <button class="ghost" style="border:1px solid var(--line);margin-top:6px" onclick="cxToggleItemCriterios('${it.id}')">${abierto?"Ocultar":"Vincular"} criterios${nCrit?` (${nCrit})`:""}</button>
    ${abierto?(()=>{
      const linkados=new Set((it.links||[]).map(l=>l.critId));
      const visible=cr=> !_cxCritPermitidos || _cxCritPermitidos.has(cr.id) || linkados.has(cr.id);
      const ces=idx.cat.ces.map(ce=>({...ce,criterios:ce.criterios.filter(visible)})).filter(ce=>ce.criterios.length);
      const nota= _cxHayPrevistos
        ? `<div class="flex" style="justify-content:space-between;align-items:center;margin:2px 0 4px;gap:8px"><span class="sub" style="margin:0;font-size:12px">${_cxCritPermitidos?"Solo se muestran los criterios previstos para este examen.":"Se muestran todos los criterios de la materia."}</span><button class="ghost small" style="padding:2px 8px" onclick="cxToggleVerTodosCrit()">${_cxCritPermitidos?"Ver todos":"Ver solo los previstos"}</button></div>`
        : `<div class="sub" style="margin:2px 0 4px;font-size:12px">Este examen no tiene criterios previstos, así que se muestran todos.</div>`;
      return `<div class="scroll" style="margin-top:8px;max-height:260px">${nota}
      ${ces.map(ce=>`
        <div style="font-size:12px;color:var(--mut);font-weight:500;margin:6px 0 3px">${ce.id} · ${esc(ce.titulo)}</div>
        ${ce.criterios.map(cr=>{
          const l=(it.links||[]).find(x=>x.critId===cr.id);
          return `<div class="critbox ${l?"sel":""}">
            <label style="display:flex;align-items:center;gap:9px;flex:1;cursor:pointer;font-size:13px">
              <input type="checkbox" ${l?"checked":""} onchange="cxToggleItemLink('${sec.id}','${it.id}','${cr.id}')">
              <span><strong>${cr.id}</strong> ${esc(cr.texto)}</span>
            </label>
            ${(cxCritNoPrevisto(cr.id)?'<span class="badge" style="background:var(--danger-soft,#f3dcdc);color:var(--danger,#912525)" title="No estaba entre los criterios previstos de este examen">no previsto</span>':"")}
            ${l?`<span style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--mut)">peso
              <input class="in miniw" type="number" min="0" value="${l.peso}" onchange="cxSetItemLinkPeso('${it.id}','${cr.id}',this.value)"></span>`:""}
          </div>`;}).join("")}
      `).join("")}
    </div>`; })():""}
  </div>`;
}
let _cxCritPermitidos=null, _cxHayPrevistos=false, _cxPrevistosSet=null;
function cxCritNoPrevisto(cid){ return !!(_cxPrevistosSet && !_cxPrevistosSet.has(cid)); }
function cxNuevoItem(max){ return {id:uid(),label:"",max:max??0,desc:[],links:[]}; }
function cxCtxEd(){ const grupo=grupoActual(); const act=grupo&&grupo.actividades.find(a=>a.id===state.ui.corExamId); return act? {grupo,act,rub:cxRubEd(act)} : null; }
window.cxSetPesoBloque=v=>{ const x=cxCtxEd(); if(!x) return;
  x.act.pesoBloque=(v===""||v==null)?"":Number(v); save(); };
window.cxAddSeccion=()=>{ const x=cxCtxEd(); if(!x) return;
  x.rub.push({id:uid(),title:"",items:[cxNuevoItem()],subs:[]});
  save(); render(); };
window.cxAddSub=secId=>{ const x=cxCtxEd(); if(!x) return;
  const sec=cxFindNodo(x.rub,secId); if(!sec) return;
  if(cxNivelNodo(x.rub,secId)>=CX_MAX_NIVELES-1) return;
  if(!Array.isArray(sec.subs)) sec.subs=[];
  sec.subs.push({id:uid(),title:"",items:[cxNuevoItem()],subs:[]});
  cxDesplegar(secId);
  save(); render(); };
window.cxDelSeccion=async secId=>{ const x=cxCtxEd(); if(!x) return;
  const lista=cxListaDeNodo(x.rub,secId); if(!lista) return;
  if(lista===x.rub && x.rub.length<=1){ mostrarAviso("Debe quedar al menos un apartado. Si quieres vaciarlo, elimina sus ítems o borra el examen entero."); return; }
  const n=lista.find(s=>s.id===secId);
  const nItems=cxItemsFlat([n]).length, nSubs=cxNodosFlat([n]).length-1;
  if(!await confirmar(`¿Eliminar este ${CX_NOMBRE_NIVEL[cxNivelNodo(x.rub,secId)]?.toLowerCase()||"apartado"}${nSubs?`, sus ${nSubs} subapartado${nSubs===1?"":"s"}`:""} y ${nItems===1?"su ítem":`sus ${nItems} ítems`}?`)) return;
  lista.splice(lista.indexOf(n),1);
  cxLimpiarPuntuacionesHuerfanas(x.grupo,x.act);
  save(); render(); };
window.cxMoveSeccion=(secId,dir)=>{ const x=cxCtxEd(); if(!x) return;
  const lista=cxListaDeNodo(x.rub,secId); if(!lista) return;
  const i=lista.findIndex(s=>s.id===secId); const j=i+dir; if(j<0||j>=lista.length) return;
  [lista[i],lista[j]]=[lista[j],lista[i]]; save(); render(); };
window.cxSetSeccionTitle=(secId,v)=>{ const x=cxCtxEd(); if(!x) return;
  const sec=cxFindNodo(x.rub,secId); if(sec){ sec.title=v; save(); } };
window.cxSetNodoElegir=(secId,v)=>{ const x=cxCtxEd(); if(!x) return;
  const sec=cxFindNodo(x.rub,secId); if(!sec) return;
  const k=Number(v)||0; if(k>0) sec.elegir=k; else delete sec.elegir;
  cxRecalcTodosLosAlumnos(x.grupo,x.act); save(); render(); };
window.cxAddItem=secId=>{ const x=cxCtxEd(); if(!x) return;
  const sec=cxFindNodo(x.rub,secId); if(!sec) return;
  if(!Array.isArray(sec.items)) sec.items=[];
  sec.items.push(cxNuevoItem()); cxDesplegar(secId); save(); render(); };
window.cxDelItem=(secId,itemId)=>{ const x=cxCtxEd(); if(!x) return;
  const sec=cxFindNodo(x.rub,secId); if(!sec) return;
  if((sec.items||[]).length<=1 && !(sec.subs||[]).length){ mostrarAviso("Debe quedar al menos un ítem (o un subapartado) en el apartado. Si sobra, elimina el apartado entero."); return; }
  sec.items=sec.items.filter(it=>it.id!==itemId);
  if(sec.elegir && sec.elegir>=cxNumHijos(sec)) delete sec.elegir;
  cxLimpiarPuntuacionesHuerfanas(x.grupo,x.act);
  save(); render(); };
window.cxMoveItem=(secId,itemId,dir)=>{ const x=cxCtxEd(); if(!x) return;
  const sec=cxFindNodo(x.rub,secId); if(!sec) return;
  const i=sec.items.findIndex(it=>it.id===itemId); const j=i+dir; if(j<0||j>=sec.items.length) return;
  [sec.items[i],sec.items[j]]=[sec.items[j],sec.items[i]]; save(); render(); };
window.cxSetItemLabel=(secId,itemId,v)=>{ const it=cxFindItem(secId,itemId); if(it){ it.label=v; save(); } };
window.cxSetEscalarA10=on=>{
  const x=cxCtxEd(); if(!x) return;
  const v=cxVarEditando(x.act);
  if(v) v.escalarA10=!!on; else x.act.escalarA10=!!on;
  cxRecalcTodosLosAlumnos(x.grupo,x.act); save(); render();
  mostrarToast(on?"✓ Notas recalculadas sobre 10":"Notas recalculadas como suma de puntos");
};
window.cxSetItemMax=(secId,itemId,v)=>{
  const x=cxCtxEd(); const it=cxFindItem(secId,itemId); if(!it||!x) return;
  it.max=Math.max(0,Number(String(v??"").replace(",","."))||0);
  // Si el nuevo máximo queda por debajo de puntuaciones ya guardadas, se reajustan
  // para no generar porcentajes por encima del 100% ni notas cuantitativas infladas.
  Object.keys(x.grupo.rubricScores||{}).forEach(alId=>{
    const val=x.grupo.rubricScores[alId]?.[x.act.id]?.[itemId];
    if(val!=null && Number(val)>it.max) x.grupo.rubricScores[alId][x.act.id][itemId]=it.max;
  });
  cxRecalcTodosLosAlumnos(x.grupo,x.act);
  save(); render();
};
window.cxSetItemDesc=(secId,itemId,v)=>{ const it=cxFindItem(secId,itemId); if(it){ it.desc=String(v||"").split("\n").map(s=>s.trim()).filter(Boolean); save(); } };
window.cxToggleItemCriterios=itemId=>{ state.ui.corItemAbierto = state.ui.corItemAbierto===itemId? "" : itemId; save(); render(); };
window.cxToggleItemLink=(secId,itemId,critId)=>{
  const x=cxCtxEd(); if(!x) return;
  const it=cxFindItem(secId,itemId); if(!it) return;
  if(!it.links) it.links=[];
  const i=it.links.findIndex(l=>l.critId===critId);
  if(i>=0) it.links.splice(i,1); else it.links.push({critId,peso:100});
  cxSyncCriteriosActividad(x.act); cxRecalcTodosLosAlumnos(x.grupo,x.act);
  save(); render(); };
window.cxSetItemLinkPeso=(itemId,critId,v)=>{
  const x=cxCtxEd(); if(!x) return;
  const it=cxItemsFlat(x.rub).find(y=>y.id===itemId); if(!it) return;
  const l=(it.links||[]).find(y=>y.critId===critId); if(l){ l.peso=Number(v)||0; cxRecalcTodosLosAlumnos(x.grupo,x.act); save(); } };
/* ---- Rúbricas adaptadas (NESE) ---- */
window.cxElegirVariante=id=>{ state.ui.corVarId=id||""; state.ui.corItemAbierto=""; save(); render(); };
window.cxNuevaVariante=()=>{
  const x=cxCtxEd(); if(!x) return;
  if(!Array.isArray(x.act.variantes)) x.act.variantes=[];
  const ocupados=new Set(cxVariantes(x.act).flatMap(v=>v.alumnos||[]));
  const nese=x.grupo.alumnos.filter(al=>al.nese && !ocupados.has(al.id)).map(al=>al.id);
  const n=x.act.variantes.length+1;
  const v={id:uid(), nombre:n===1?"Adaptada (NESE)":"Adaptada "+n, rubrica:cxClonarRubrica(x.act.rubrica,null), escalarA10:true, alumnos:nese};
  x.act.variantes.push(v);
  state.ui.corVarId=v.id;
  nese.forEach(alId=>cxRecalcAlumno(x.grupo,x.act,alId));
  cxSyncCriteriosActividad(x.act);
  save(); render();
  mostrarToast(nese.length?`✓ Rúbrica adaptada creada (copia de la general) con ${nese.length} alumno${nese.length===1?"":"s"} NESE`:"✓ Rúbrica adaptada creada (copia de la general). Marca qué alumnado la hace");
};
window.cxSetVarianteNombre=v=>{ const x=cxCtxEd(); const va=x&&cxVarEditando(x.act); if(!va) return; va.nombre=String(v||"").trim()||va.nombre; save(); render(); };
window.cxToggleAlumnoVariante=(alId,on)=>{
  const x=cxCtxEd(); const va=x&&cxVarEditando(x.act); if(!va) return;
  const tienePuntos=Object.keys(x.grupo.rubricScores?.[alId]?.[x.act.id]||{}).length>0;
  va.alumnos=(va.alumnos||[]).filter(id=>id!==alId);
  if(on){ cxVariantes(x.act).forEach(v=>{ v.alumnos=(v.alumnos||[]).filter(id=>id!==alId); }); va.alumnos.push(alId); }
  cxRecalcAlumno(x.grupo,x.act,alId);
  save(); render();
  if(tienePuntos) mostrarToast("Ojo: este alumno/a ya estaba corregido con otra rúbrica — revisa su corrección","info");
};
window.cxCopiarGeneralEnVariante=async ()=>{
  const x=cxCtxEd(); const va=x&&cxVarEditando(x.act); if(!va) return;
  if(!await confirmar("¿Sustituir esta rúbrica adaptada por una copia de la general? Se perderán sus apartados actuales y lo ya corregido con ella.",{ok:"Sí, sustituir"})) return;
  va.rubrica=cxClonarRubrica(x.act.rubrica,null);
  cxLimpiarPuntuacionesHuerfanas(x.grupo,x.act);
  save(); render();
};
window.cxEliminarVariante=async ()=>{
  const x=cxCtxEd(); const va=x&&cxVarEditando(x.act); if(!va) return;
  if(!await confirmar(`¿Eliminar la rúbrica adaptada «${va.nombre}»? ${(va.alumnos||[]).length?"Su alumnado pasará a corregirse con la rúbrica general.":""}`)) return;
  x.act.variantes=cxVariantes(x.act).filter(v=>v.id!==va.id);
  state.ui.corVarId="";
  cxLimpiarPuntuacionesHuerfanas(x.grupo,x.act);
  save(); render();
};

