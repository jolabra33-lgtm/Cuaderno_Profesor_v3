/* ============================================================================
   Cuaderno del profesor · Calificar, entrada rápida de notas y marcas NP/Exento
   js/evaluacion/calificar.js
   ============================================================================ */

/* ---------- Calificar ---------- */
function renderCalificar(grupo){
  const c=document.getElementById("tabContent");
  const acts=actsTrim(grupo);
  if(!acts.length){ c.innerHTML='<div class="card"><h2>Calificar</h2><p style="color:var(--mut);font-size:14px">Crea antes alguna actividad en este periodo.</p></div>'; return; }
  if(!grupo.alumnos.length){ c.innerHTML='<div class="card"><h2>Calificar</h2><p style="color:var(--mut);font-size:14px">Añade antes alumnado.</p></div>'; return; }
  if(!acts.find(a=>a.id===state.ui.calAct)) state.ui.calAct=acts[0].id;
  const act=acts.find(a=>a.id===state.ui.calAct);
  if(act.rubrica){ renderCalificarRubrica(grupo,act,acts); return; }
  
  const isTable = state.ui.calViewMode === 'table';

  let htmlEditor = '';
  if(!isTable){
    htmlEditor = `<div class="grid" style="gap:14px">
      ${grupo.alumnos.map(al=>`
        <div style="border:1px solid var(--line);border-radius:8px;padding:10px 12px">
          <div class="flex" style="justify-content:space-between;margin-bottom:8px"><div style="font-size:14.5px;font-weight:500">${esc(al.nombre)}${neseBadgeHTML(al)}${marcaBadgeHTML(grupo,al.id,act.id)}</div>${marcaBotonesHTML(grupo,al.id,act.id)}</div>
          <div class="grid">
            ${act.esExamen? (()=>{
              const vc=grupo.notasCuant?.[al.id]?.[act.id];
              return `<div class="flex" style="padding-bottom:6px;margin-bottom:2px;border-bottom:1px dashed var(--line)">
                <span style="font-size:12.5px;color:var(--mut);font-weight:600">Nota cuantitativa del examen</span>
                <input class="in" type="text" inputmode="decimal" enterkeyhint="next" autocomplete="off" data-cal-col="cuant" data-cal-al="${al.id}" placeholder="0–10" style="width:90px" value="${vc==null?"":String(vc).replace(".",",")}" onchange="setNotaCuantExamen('${al.id}','${act.id}',this.value)">
                <span style="font-size:11.5px;color:var(--mut)">cuenta para la nota numérica</span>
              </div>`;
            })():""}
            ${act.criterios.map(l=>{
              const val=grupo.notas?.[al.id]?.[act.id]?.[l.critId];
              return `<div class="flex">
                <span style="font-size:12.5px;color:var(--mut);width:44px">${critLinkHTML(grupo.catalogoKey,l.critId)}</span>
                <div class="flex">${ESCALA.map(o=>`<button class="chip ${val===o.v?"on":""}" onclick="setNota('${al.id}','${act.id}','${l.critId}',${val===o.v?"''":o.v},true)">${o.etq} (${String(o.v).replace('.',',')})</button>`).join("")}</div>
              </div>`;}).join("")}
          </div>
        </div>`).join("")}
    </div>`;
  } else {
    htmlEditor = `<div style="overflow-x:auto"><table>
      <thead>
        <tr>
          <th>Alumno/a</th>
          <th title="NP: no presentado (cuenta 0) · Exento: no cuenta">Marca</th>
          ${act.esExamen?`<th style="min-width:150px">Nota cuantitativa <button class="ghost small" title="Llenar vacíos" onclick="massFillCuantExamen('${act.id}')">⚡</button><button class="ghost small" title="Pegar una columna de notas (desde Excel, Sheets…)" onclick="calPegarColumna('${act.id}','cuant')">📋</button></th>`:""}
          ${act.criterios.map(l=>`<th style="min-width:120px">${critLinkHTML(grupo.catalogoKey,l.critId)} <button class="ghost small" title="Llenar vacíos a todos en este criterio" onclick="massFill('${act.id}','${l.critId}')">⚡</button><button class="ghost small" title="Pegar una columna de valores (10, 7,5, 5, 0)" onclick="calPegarColumna('${act.id}','${l.critId}')">📋</button></th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${grupo.alumnos.map(al=>{
          const vc=act.esExamen? grupo.notasCuant?.[al.id]?.[act.id] : null;
          return `<tr>
          <td style="font-weight:500">${esc(al.nombre)}${neseBadgeHTML(al)}</td>
          <td><select class="in" style="font-size:14px;padding:5px 6px" onchange="setMarca('${al.id}','${act.id}',this.value)">
            <option value="">—</option><option value="NP" ${marcaDe(grupo,al.id,act.id)==="NP"?"selected":""}>NP</option><option value="EX" ${marcaDe(grupo,al.id,act.id)==="EX"?"selected":""}>Exento</option>
          </select></td>
          ${act.esExamen?`<td><input type="text" inputmode="decimal" enterkeyhint="next" autocomplete="off" data-cal-col="cuant" data-cal-al="${al.id}" class="in miniw" style="width:80px" value="${vc==null?"":String(vc).replace(".",",")}" onchange="setNotaCuantExamen('${al.id}','${act.id}',this.value)"></td>`:""}
          ${act.criterios.map(l=>{
             const val=grupo.notas?.[al.id]?.[act.id]?.[l.critId];
             return `<td><select class="in" data-cal-col="c_${l.critId}" data-cal-al="${al.id}" style="width:100%;max-width:140px;font-size:16px;padding:6px 8px" onchange="setNota('${al.id}','${act.id}','${l.critId}',this.value,false)">
                <option value="">-</option>
                ${ESCALA.map(o=>`<option value="${o.v}" ${val===o.v?'selected':''}>${o.v}</option>`).join("")}
              </select></td>`;
          }).join("")}
        </tr>`;}).join("")}
      </tbody>
    </table></div>`;
  }

  c.innerHTML=`<div class="card">
    <div class="flex" style="justify-content:space-between; margin-bottom:12px">
      <div>
        <h2>Calificar actividad</h2>
        <p class="sub" style="margin:0">Elige una actividad y asigna la valoración. Haz clic en ⚡ en modo tabla para calificar masivamente a los que no tengan nota. ${act.esExamen?"Los exámenes tienen una nota cuantitativa propia (cuenta para la nota numérica) además de la calificación de cada criterio (cuenta para las competencias).":""}</p>
      </div>
      <div class="flex" style="background:var(--paper);border:1px solid var(--line);border-radius:8px;padding:4px">
         <button class="ghost ${!isTable?'on':''}" style="${!isTable?'background:var(--card);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.05);border-radius:4px':''}" onclick="setCalView('cards')">Tarjetas</button>
         <button class="ghost ${isTable?'on':''}" style="${isTable?'background:var(--card);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.05);border-radius:4px':''}" onclick="setCalView('table')">Tabla</button>
      </div>
    </div>
    <select class="in" id="calSel" style="margin-bottom:16px;min-width:260px">
      ${acts.map(a=>`<option value="${a.id}" ${a.id===act.id?"selected":""}>${a.recupera?"🔁 ":""}${esc(a.nombre)}</option>`).join("")}
    </select>
    ${act.recupera?`<div class="alert-box" style="margin-bottom:12px">🔁 ${recResumenTexto(grupo,act)} Deja en blanco a quien no se presente.</div>`:""}
    ${htmlEditor}
  </div>`;
  document.getElementById("calSel").addEventListener("change",e=>{ state.ui.calAct=e.target.value; save(); render(); });
  calActivarNavegacion(c, act.id);
}
/* =================================================================
   v2 · ENTRADA RÁPIDA DE NOTAS
   - Intro (o ↓ en los campos de texto) baja al siguiente alumno/a en la
     misma columna; ↑ sube (Mayús+Intro también sube). Así se pasan las
     notas de un examen sin tocar el ratón.
   - Pegar en la columna de nota numérica varias líneas copiadas de
     Excel/Sheets las reparte hacia abajo, alumno a alumno.
   - 📋 en la cabecera: pegar una columna completa (también admite NP y
     Exento).
   ================================================================= */
function calActivarNavegacion(cont, actId){
  if(cont.__calNav) { cont.__calNavAct=actId; return; }
  cont.__calNav=true; cont.__calNavAct=actId;
  const campos=()=>[...cont.querySelectorAll("[data-cal-col]")];
  const mover=(el,dir)=>{
    const col=el.getAttribute("data-cal-col");
    const lista=campos().filter(x=>x.getAttribute("data-cal-col")===col);
    const i=lista.indexOf(el); const sig=lista[i+dir];
    if(sig){ sig.focus(); if(sig.select) try{ sig.select(); }catch(e){} sig.scrollIntoView({block:"nearest"}); }
    else if(dir>0){ el.blur(); }
  };
  cont.addEventListener("keydown",e=>{
    const el=e.target; if(!el || !el.hasAttribute || !el.hasAttribute("data-cal-col")) return;
    const esTexto=el.tagName==="INPUT";
    if(e.key==="Enter"){ e.preventDefault(); if(esTexto) el.dispatchEvent(new Event("change",{bubbles:true})); mover(el,e.shiftKey?-1:1); }
    else if(esTexto && e.key==="ArrowDown"){ e.preventDefault(); el.dispatchEvent(new Event("change",{bubbles:true})); mover(el,1); }
    else if(esTexto && e.key==="ArrowUp"){ e.preventDefault(); el.dispatchEvent(new Event("change",{bubbles:true})); mover(el,-1); }
  });
  cont.addEventListener("paste",e=>{
    const el=e.target; if(!el || !el.getAttribute || el.getAttribute("data-cal-col")!=="cuant") return;
    const txt=(e.clipboardData||window.clipboardData).getData("text");
    const lineas=txt.replace(/\r/g,"").split("\n"); if(lineas.length && lineas[lineas.length-1]==="") lineas.pop();
    if(lineas.length<2) return; // una sola nota: pegado normal
    e.preventDefault();
    calAplicarColumna(cont.__calNavAct,"cuant",lineas,el.getAttribute("data-cal-al"));
  });
}
function _valorPegado(t){
  t=String(t||"").split("\t")[0].trim();
  if(!t) return {tipo:"vacio"};
  const u=t.toUpperCase();
  if(u==="NP"||u==="N.P."||u==="NO PRESENTADO") return {tipo:"marca",v:"NP"};
  if(u==="EX"||u==="EXENTO"||u==="EXENTA") return {tipo:"marca",v:"EX"};
  const n=parseNotaTexto(t);
  return (n===undefined||n===null)?{tipo:"error",t}:{tipo:"nota",v:n};
}
function calAplicarColumna(actId,col,lineas,desdeAlId){
  const grupo=grupoActual(); const act=grupo&&grupo.actividades.find(a=>a.id===actId); if(!act) return;
  let i0=0; if(desdeAlId){ const k=grupo.alumnos.findIndex(a=>a.id===desdeAlId); if(k>=0) i0=k; }
  const errores=[]; let n=0;
  lineas.forEach((ln,j)=>{
    const al=grupo.alumnos[i0+j]; if(!al) return;
    const r=_valorPegado(ln);
    if(r.tipo==="vacio") return;
    if(r.tipo==="error"){ errores.push(`${al.nombre}: «${r.t}»`); return; }
    grupo.notas[al.id]=grupo.notas[al.id]||{}; grupo.notasCuant[al.id]=grupo.notasCuant[al.id]||{};
    if(r.tipo==="marca"){
      if(!grupo.marcas) grupo.marcas={}; grupo.marcas[al.id]=grupo.marcas[al.id]||{}; grupo.marcas[al.id][actId]=r.v; aplicarMarca(grupo,act,al.id);
    }else if(col==="cuant"){ grupo.notasCuant[al.id][actId]=r.v; quitarMarcaSiHay(grupo,al.id,actId); }
    else{ grupo.notas[al.id][actId]=grupo.notas[al.id][actId]||{}; grupo.notas[al.id][actId][col]=r.v; quitarMarcaSiHay(grupo,al.id,actId); }
    n++;
  });
  const sobrantes=Math.max(0,lineas.length-(grupo.alumnos.length-i0));
  save(); render();
  mostrarToast(`✓ ${n} nota${n===1?"":"s"} pegada${n===1?"":"s"}`);
  if(errores.length||sobrantes) mostrarAviso((errores.length?`No se han entendido ${errores.length} valor(es) (deben ser números de 0 a 10, NP o Exento):\n• ${errores.slice(0,12).join("\n• ")}`:"")+(sobrantes?`\n\nSobraban ${sobrantes} línea(s): hay más valores que alumnos.`:""));
}
window.calPegarColumna=(actId,col)=>{
  const grupo=grupoActual(); if(!grupo) return;
  const div=document.createElement("div"); div.className="modal-overlay";
  div.innerHTML=`<div class="modal-box" style="max-width:520px">
    <h2 style="font-size:17px">📋 Pegar columna</h2>
    <p class="sub">Pega aquí una columna copiada de Excel, Sheets o Numbers: <strong>un valor por línea, en el mismo orden que la lista de alumnado</strong> (${grupo.alumnos.length} alumnos, empezando por ${esc(grupo.alumnos[0]?grupo.alumnos[0].nombre:"—")}). Líneas en blanco = no se toca. Admite coma decimal, NP y Exento.</p>
    <textarea class="in" id="pegCol" rows="10" style="width:100%;font-family:ui-monospace,monospace"></textarea>
    <div class="flex" style="justify-content:flex-end;gap:8px;margin-top:10px"><button class="ghost" id="pegNo" style="border:1px solid var(--line)">Cancelar</button><button class="btn" id="pegSi">Aplicar</button></div>
  </div>`;
  document.body.appendChild(div);
  div.querySelector("#pegNo").onclick=()=>div.remove();
  div.querySelector("#pegSi").onclick=()=>{
    const lineas=div.querySelector("#pegCol").value.replace(/\r/g,"").split("\n");
    while(lineas.length && lineas[lineas.length-1].trim()==="") lineas.pop();
    div.remove();
    if(lineas.length) calAplicarColumna(actId,col,lineas,null);
  };
  setTimeout(()=>div.querySelector("#pegCol").focus(),30);
};

window.setNota=(alId,actId,cid,v,rerender)=>{
  const grupo=grupoActual();
  grupo.notas[alId]=grupo.notas[alId]||{}; grupo.notas[alId][actId]=grupo.notas[alId][actId]||{};
  const n=parseNotaTexto(v);
  if(n===undefined){ mostrarAviso("La nota debe ser un número entre 0 y 10."); render(); return; }
  if(n===null) delete grupo.notas[alId][actId][cid]; else grupo.notas[alId][actId][cid]=n;
  if(n!==null) quitarMarcaSiHay(grupo,alId,actId);
  save(); if(rerender) render();
};
window.setNotaCuantExamen=(alId,actId,v,rerender)=>{
  const grupo=grupoActual();
  grupo.notasCuant[alId]=grupo.notasCuant[alId]||{};
  const n=parseNotaTexto(v);
  if(n===undefined){ mostrarAviso("La nota del examen debe ser un número entre 0 y 10 (puedes usar coma: 7,5)."); render(); return; }
  if(n===null) delete grupo.notasCuant[alId][actId]; else grupo.notasCuant[alId][actId]=n;
  if(n!==null) quitarMarcaSiHay(grupo,alId,actId);
  save(); if(rerender) render();
};
/* =================================================================
   v1 · MARCAS NP / EXENTO por alumno y actividad (grupo.marcas).
   - NP (no presentado): la actividad cuenta como 0 en todos sus
     criterios y, si es examen, en la nota numérica.
   - Exento: la actividad no cuenta para ese alumno/a (queda sin nota,
     igual que si no existiera), pero queda registrado que es a propósito
     y el relleno masivo (⚡) ya no la rellena por error.
   Guardar una nota a mano sobre una actividad marcada quita la marca.
   ================================================================= */
const MARCAS_NOTA={NP:{etq:"NP",titulo:"No presentado: cuenta como 0",bg:"#f3dcdc",fg:"#912525"},EX:{etq:"Exento",titulo:"Exento: esta actividad no cuenta para este alumno/a",bg:"#e5e7eb",fg:"#374151"}};
function parseNotaTexto(v){
  // null = vacío (borrar); undefined = no válido; número 0-10 en otro caso. Admite coma decimal.
  if(v===null||v===undefined) return null;
  const t=String(v).trim().replace(",",".");
  if(t==="") return null;
  const n=Number(t);
  if(!isFinite(n)||n<0||n>10) return undefined;
  return Math.round(n*100)/100;
}
function marcaDe(grupo,alId,actId){ return (grupo.marcas&&grupo.marcas[alId]&&grupo.marcas[alId][actId])||""; }
function quitarMarcaSiHay(grupo,alId,actId){ if(grupo.marcas&&grupo.marcas[alId]) delete grupo.marcas[alId][actId]; }
function aplicarMarca(grupo,act,alId){
  const m=marcaDe(grupo,alId,act.id); if(!m) return false;
  grupo.notas[alId]=grupo.notas[alId]||{}; grupo.notasCuant[alId]=grupo.notasCuant[alId]||{};
  if(m==="NP"){
    const d=grupo.notas[alId][act.id]={};
    (act.criterios||[]).forEach(l=>{ d[l.critId]=0; });
    if(act.esExamen) grupo.notasCuant[alId][act.id]=0;
  }else if(m==="EX"){
    delete grupo.notas[alId][act.id];
    delete grupo.notasCuant[alId][act.id];
  }
  return true;
}
function marcaBadgeHTML(grupo,alId,actId){
  const m=marcaDe(grupo,alId,actId); if(!m) return "";
  const i=MARCAS_NOTA[m];
  return `<span class="pill" title="${i.titulo}" style="background:${i.bg};color:${i.fg};font-size:11px;padding:1px 7px;margin-left:6px">${i.etq}</span>`;
}
function marcaBotonesHTML(grupo,alId,actId){
  const m=marcaDe(grupo,alId,actId);
  const b=(tipo)=>`<button class="chip ${m===tipo?"on":""}" title="${MARCAS_NOTA[tipo].titulo}" onclick="setMarca('${alId}','${actId}','${m===tipo?"":tipo}')">${MARCAS_NOTA[tipo].etq}</button>`;
  return `<span class="flex" style="gap:4px;display:inline-flex">${b("NP")}${b("EX")}</span>`;
}
window.setMarca=(alId,actId,tipo)=>{
  const grupo=grupoActual(); if(!grupo) return;
  const act=grupo.actividades.find(a=>a.id===actId); if(!act) return;
  if(!grupo.marcas) grupo.marcas={};
  grupo.marcas[alId]=grupo.marcas[alId]||{};
  const previa=grupo.marcas[alId][actId]||"";
  if(tipo){
    grupo.marcas[alId][actId]=tipo;
    aplicarMarca(grupo,act,alId);
  }else{
    delete grupo.marcas[alId][actId];
    if(act.rubrica){ cxRecalcAlumno(grupo,act,alId); }
    else if(previa==="NP"){
      // Los ceros los puso la marca, no el profesor/a: se retiran.
      if(grupo.notas[alId]) delete grupo.notas[alId][actId];
      if(grupo.notasCuant[alId]) delete grupo.notasCuant[alId][actId];
    }
  }
  save(); render();
};
window.setCalView = view => { state.ui.calViewMode = view; save(); render(); };
window.massFill = async (actId, critId) => {
   { const g=grupoActual(); const a=g&&g.actividades.find(x=>x.id===actId); if(a&&a.recupera){ mostrarAviso("Esta actividad es una recuperación: califica solo a quien se haya presentado (el relleno masivo aprobaría o cambiaría la nota de todo el grupo)."); return; } }
   let input = await pedirTexto(`Nota para los sin calificar en ${critId} (10, 7.5, 5 o 0):`);
   if(input === null || input.trim() === "") return;
   let val = Number(input.replace(',','.'));
   if(isNaN(val) || val < 0 || val > 10) { mostrarAviso("Valor numérico no válido."); return; }
   if(![10, 7.5, 5, 0].includes(val)) { mostrarAviso("Atención: el valor introducido no corresponde exactamente a los de la escala cualitativa (10, 7.5, 5 o 0), pero se aplicará como nota personalizada."); }
   const grupo = grupoActual();
   let changed = false;
   grupo.alumnos.forEach(al => {
      if(!grupo.notas[al.id]) grupo.notas[al.id] = {};
      if(!grupo.notas[al.id][actId]) grupo.notas[al.id][actId] = {};
      if(marcaDe(grupo,al.id,actId)) return;
      if(grupo.notas[al.id][actId][critId] == null || grupo.notas[al.id][actId][critId] === "") {
         grupo.notas[al.id][actId][critId] = val;
         changed = true;
      }
   });
   if(changed) { save(); render(); }
};
window.massFillCuantExamen = async (actId) => {
   { const g=grupoActual(); const a=g&&g.actividades.find(x=>x.id===actId); if(a&&a.recupera){ mostrarAviso("Esta actividad es una recuperación: califica solo a quien se haya presentado (el relleno masivo cambiaría la nota de todo el grupo)."); return; } }
   const grupo = grupoActual(); const act = grupo.actividades.find(x=>x.id===actId); if(!act) return;
   let input = await pedirTexto(`Nota cuantitativa (0-10) para alumnos sin nota en este examen:`);
   if(input === null || input.trim() === "") return;
   let val = Number(input.replace(',','.'));
   if(isNaN(val) || val < 0 || val > 10) { mostrarAviso("Valor numérico no válido."); return; }
   let changed = false;
   grupo.alumnos.forEach(al => {
      grupo.notasCuant[al.id] = grupo.notasCuant[al.id] || {};
      if(marcaDe(grupo,al.id,actId)) return;
      const actual = grupo.notasCuant[al.id][actId];
      if(actual == null || actual === "") {
         grupo.notasCuant[al.id][actId] = val;
         changed = true;
      }
   });
   if(changed) { save(); render(); }
};

