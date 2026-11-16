/* ============================================================================
   Cuaderno del profesor · Puntos extra en actividades y evaluaciones (interfaz)
   js/evaluacion/puntos-extra.js
   El cálculo está en js/evaluacion/calculo-notas.js (apartado «PUNTOS EXTRA»):
     grupo.extras[alId][actId]       = {pts, motivo}
     grupo.extrasEval[alId][periodo] = {pts, motivo}   (periodo "0", "1", "2" o "final")
   ============================================================================ */
function etiquetaPeriodoExtra(p){ return String(p)==="final"?"Nota final de curso":TRIMESTRES[Number(p)]; }
/* Puntos con coma y sin ceros de más: 0,5 · 1 · 0,25 */
function fmtPts(p){ return String(Math.round(Number(p)*100)/100).replace(".",","); }
/* «6,5 + 1 = 7,5» (o «9,5 + 1 = 10» si llega al tope). */
function textoNotaConExtra(base,pts,total){ return `${fmt(base)} + ${fmtPts(pts)} = ${fmt(total)}`; }

/* Píldora «+1 extra» junto al nombre o la nota. Si hay extra apuntado pero no se suma
   (NP, Exento o todavía sin nota), sale en gris y lo explica al pasar el ratón. */
function extraBadgeHTML(grupo,alId,act){
  const e=extraActividad(grupo,alId,act.id), pts=_ptsExtra(e); if(!pts||act.recupera) return "";
  const aplicado=extraAplicadoActividad(grupo,alId,act)>0;
  const m=marcaDe(grupo,alId,act.id);
  const porQue=aplicado?"":(m==="NP"?" · No se suma: no presentado (NP)":m==="EX"?" · No se suma: exento":" · Se sumará cuando tenga nota");
  const titulo=`Puntos extra: +${fmtPts(pts)}${e.motivo?" · "+e.motivo:""}${porQue}`;
  return ` <span class="pill extra-pill${aplicado?"":" extra-off"}" title="${esc(titulo)}">+${fmtPts(pts)} extra</span>`;
}
function extraEvalBadgeHTML(grupo,alId,periodo){
  const e=extraEval(grupo,alId,periodo), pts=_ptsExtra(e); if(!pts) return "";
  return ` <span class="pill extra-pill" title="${esc(`Puntos extra en ${etiquetaPeriodoExtra(periodo)}: +${fmtPts(pts)}${e.motivo?" · "+e.motivo:""}`)}">+${fmtPts(pts)}</span>`;
}

/* Guarda (o borra, si los puntos quedan vacíos o en 0) un extra. Devuelve false si los puntos no valen. */
function _guardarExtra(mapa,alId,clave,ptsTxt,motivo){
  const n=parseNotaTexto(ptsTxt);
  if(n===undefined) return false;
  mapa[alId]=mapa[alId]||{};
  if(n===null||n===0){ delete mapa[alId][clave]; if(!Object.keys(mapa[alId]).length) delete mapa[alId]; return true; }
  mapa[alId][clave]={pts:n,motivo:String(motivo||"").trim().slice(0,200)};
  return true;
}
const AVISO_PTS_EXTRA="Los puntos extra deben ser un número entre 0 y 10 (puedes usar coma: 0,5).";

/* Cambios sueltos desde un campo (Resultados, Corregir). Los dos campos de la fila
   (puntos y motivo) se leen juntos por su data-extra. */
window.extraGuardarCampos=(el)=>{
  const grupo=grupoActual(); if(!grupo) return;
  const fila=el.closest("[data-extra]"); if(!fila) return;
  const tipo=fila.getAttribute("data-extra"), alId=fila.getAttribute("data-al"), clave=fila.getAttribute("data-clave");
  if(!grupo.alumnos.some(a=>a.id===alId)) return;
  if(tipo==="act" && !grupo.actividades.some(a=>a.id===clave)) return;
  if(tipo==="eval" && !["0","1","2","final"].includes(clave)) return;
  const pts=fila.querySelector("[data-extra-pts]").value, motivo=(fila.querySelector("[data-extra-motivo]")||{}).value||"";
  const mapa=tipo==="act"?(grupo.extras=grupo.extras||{}):(grupo.extrasEval=grupo.extrasEval||{});
  if(!_guardarExtra(mapa,alId,clave,pts,motivo)){ mostrarAviso(AVISO_PTS_EXTRA); render(); return; }
  save(); render();
};
/* Pareja de campos «+ puntos · motivo» para un alumno/a. */
function extraCamposHTML(tipo,alId,clave,e){
  const pts=_ptsExtra(e);
  return `<span class="extra-campos" data-extra="${tipo}" data-al="${alId}" data-clave="${clave}">
    <label class="extra-lbl">+ <input class="in" type="text" inputmode="decimal" autocomplete="off" data-extra-pts aria-label="Puntos extra" placeholder="0" style="width:58px" value="${pts?fmtPts(pts):""}" onchange="extraGuardarCampos(this)"></label>
    <input class="in" type="text" autocomplete="off" data-extra-motivo aria-label="Motivo de los puntos extra" placeholder="Motivo (opcional)" maxlength="200" style="flex:1;min-width:140px" value="${esc((e&&e.motivo)||"")}" onchange="extraGuardarCampos(this)">
  </span>`;
}

/* ---------- Ventana «Puntos extra» para todo el grupo ----------
   tipo "act": de una actividad (clave = id de la actividad)
   tipo "eval": de una evaluación o de la nota final (clave = "0","1","2","final") */
function _extraVentana(tipo,clave,focoAlId){
  const grupo=grupoActual(); if(!grupo) return;
  let act=null;
  if(tipo==="act"){ act=grupo.actividades.find(a=>a.id===clave); if(!act) return; if(act.recupera){ mostrarAviso("Los puntos extra se ponen en la actividad original, no en su recuperación: se suman a la nota que quede después de recuperar."); return; } }
  clave=String(clave);
  const mapa=tipo==="act"?(grupo.extras||{}):(grupo.extrasEval||{});
  const base=al=>tipo==="act"?notaActividadSinExtra(grupo,al.id,act):(clave==="final"?notaFinalSinExtra(grupo,al.id):notaTrimestreSinExtra(grupo,al.id,Number(clave)));
  const titulo=tipo==="act"?esc(act.nombre):esc(etiquetaPeriodoExtra(clave));
  const explica=tipo==="act"
    ? `Se suman a la nota de la actividad${recuperacionesDe(grupo,act.id).length?" (después de aplicar la recuperación)":""} y con ella cuentan en el bloque y en la evaluación. No se suman con NP ni Exento.`
    : clave==="final"
      ? "Se suman a la nota final de curso (la media de las evaluaciones, que ya llevan sus propios extras)."
      : "Se suman a la nota de la evaluación (la media de los bloques). Con ella cuentan también en la nota final.";
  const div=document.createElement("div"); div.className="modal-overlay";
  const filas=grupo.alumnos.map(al=>{
    const e=mapa[al.id]&&mapa[al.id][clave], b=base(al), m=tipo==="act"?marcaDe(grupo,al.id,act.id):"";
    return `<tr data-al="${al.id}">
      <td>${esc(al.nombre)}</td>
      <td style="white-space:nowrap;color:var(--mut)">${m?MARCAS_NOTA[m].etq:fmt(b)}</td>
      <td><input class="in" type="text" inputmode="decimal" autocomplete="off" data-pts aria-label="Puntos extra de ${esc(al.nombre)}" placeholder="0" style="width:64px" value="${_ptsExtra(e)?fmtPts(e.pts):""}"></td>
      <td><input class="in" type="text" autocomplete="off" data-motivo aria-label="Motivo para ${esc(al.nombre)}" maxlength="200" style="width:100%" value="${esc((e&&e.motivo)||"")}"></td>
    </tr>`;
  }).join("");
  const selPeriodo=tipo==="eval"?`<select class="in" id="extraPeriodo" aria-label="Evaluación">${["0","1","2","final"].map(p=>`<option value="${p}" ${p===clave?"selected":""}>${esc(etiquetaPeriodoExtra(p))}</option>`).join("")}</select>`:"";
  div.innerHTML=`<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="extraTit" style="max-width:640px">
    <div class="flex" style="justify-content:space-between;align-items:center"><h2 id="extraTit" style="font-size:17px">➕ Puntos extra · ${titulo}</h2><button class="modal-close" aria-label="Cerrar">×</button></div>
    ${selPeriodo?`<div style="margin:6px 0">${selPeriodo}</div>`:""}
    <p class="sub">Escribe los puntos solo a quien le correspondan (0,5, 1…). ${explica} La nota nunca pasa de 10. Los niveles de logro de criterios y competencias no cambian.</p>
    <div class="flex" style="gap:6px;margin:0 0 8px;flex-wrap:wrap">
      <input class="in" id="extraMotivoComun" maxlength="200" placeholder="Motivo común (p. ej. «Voluntario/a en la exposición»)" aria-label="Motivo común" style="flex:1;min-width:200px">
      <button class="ghost small" id="extraMotivoAplicar" style="border:1px solid var(--line)" title="Lo escribe en quien tenga puntos y todavía no tenga motivo">Poner a quien tenga puntos</button>
    </div>
    <div style="max-height:52vh;overflow:auto"><table>
      <thead><tr><th>Alumno/a</th><th>${tipo==="act"?"Nota":"Nota sin extra"}</th><th>Puntos</th><th>Motivo</th></tr></thead>
      <tbody>${filas}</tbody></table></div>
    <div class="flex" style="justify-content:flex-end;gap:8px;margin-top:12px"><button class="ghost" id="extraNo" style="border:1px solid var(--line)">Cancelar</button><button class="btn" id="extraSi">Guardar</button></div>
  </div>`;
  document.body.appendChild(div);
  const cerrar=()=>div.remove();
  div.querySelector(".modal-close").onclick=cerrar;
  div.querySelector("#extraNo").onclick=cerrar;
  div.addEventListener("click",e=>{ if(e.target===div) cerrar(); });
  const sel=div.querySelector("#extraPeriodo");
  if(sel) sel.onchange=()=>{ cerrar(); _extraVentana("eval",sel.value,focoAlId); };
  div.querySelector("#extraMotivoAplicar").onclick=()=>{
    const t=div.querySelector("#extraMotivoComun").value.trim(); if(!t) return;
    div.querySelectorAll("tbody tr").forEach(tr=>{
      const p=tr.querySelector("[data-pts]").value.trim(), mo=tr.querySelector("[data-motivo]");
      if(p && !mo.value.trim()) mo.value=t;
    });
  };
  div.querySelector("#extraSi").onclick=()=>{
    const filasDom=[...div.querySelectorAll("tbody tr")];
    const malos=filasDom.filter(tr=>parseNotaTexto(tr.querySelector("[data-pts]").value)===undefined)
      .map(tr=>(grupo.alumnos.find(a=>a.id===tr.getAttribute("data-al"))||{}).nombre);
    if(malos.length){ mostrarAviso(AVISO_PTS_EXTRA+"\n\nRevisa: "+malos.join(", ")); return; }
    const comun=div.querySelector("#extraMotivoComun").value.trim();
    const destino=tipo==="act"?(grupo.extras=grupo.extras||{}):(grupo.extrasEval=grupo.extrasEval||{});
    let n=0;
    filasDom.forEach(tr=>{
      const alId=tr.getAttribute("data-al"); if(!grupo.alumnos.some(a=>a.id===alId)) return;
      const pts=tr.querySelector("[data-pts]").value; let mo=tr.querySelector("[data-motivo]").value;
      if(!mo.trim() && comun && String(pts).trim()) mo=comun;
      _guardarExtra(destino,alId,clave,pts,mo);
      if(_ptsExtra(destino[alId]&&destino[alId][clave])) n++;
    });
    cerrar(); save(); render();
    mostrarToast(n?`✓ Puntos extra guardados (${n} alumno${n===1?"":"s"})`:"✓ Sin puntos extra");
  };
  setTimeout(()=>{
    const fila=focoAlId&&[...div.querySelectorAll("tbody tr")].find(tr=>tr.getAttribute("data-al")===focoAlId);
    if(fila){ fila.style.background="var(--surface-2)"; fila.scrollIntoView({block:"center"}); }
    const x=(fila||div).querySelector("[data-pts]"); if(x) x.focus();
  },30);
}
window.abrirExtrasActividad=(actId,alId)=>_extraVentana("act",actId,alId);
window.abrirExtrasEvaluacion=periodo=>_extraVentana("eval",periodo==null?String(state.ui.trim):String(periodo));

/* Alumno/a borrado o restaurado y actividad borrada o restaurada: sus extras van con ellos a la papelera. */
function extrasDeAlumnoCopia(g,alId){
  return {extras:g.extras&&g.extras[alId]?JSON.parse(JSON.stringify(g.extras[alId])):{},
          extrasEval:g.extrasEval&&g.extrasEval[alId]?JSON.parse(JSON.stringify(g.extrasEval[alId])):{}};
}

/* Nota anotada para los informes impresos: «7,5 (incluye +1 extra: motivo)». */
function _notaInformeExtra(v,pts,e){
  if(v==null) return "—";
  if(!pts) return fmt(v);
  return `${fmt(v)} <small style="font-weight:400;color:#666">(incluye +${fmtPts(pts)} extra${e&&e.motivo?": "+esc(e.motivo):""})</small>`;
}
function notaActividadInformeHTML(grupo,alId,a){
  return _notaInformeExtra(notaActividad(grupo,alId,a),extraAplicadoActividad(grupo,alId,a),extraActividad(grupo,alId,a.id));
}
function notaEvalInformeHTML(grupo,alId,periodo){
  const v=String(periodo)==="final"?notaFinal(grupo,alId):notaTrimestre(grupo,alId,Number(periodo));
  return _notaInformeExtra(v,v==null?0:ptsExtraEval(grupo,alId,periodo),extraEval(grupo,alId,periodo));
}
