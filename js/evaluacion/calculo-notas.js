/* ============================================================================
   Cuaderno del profesor · Motor de cálculo de notas (criterios, CE, CC, bloques, trimestres, final) y recuperaciones
   js/evaluacion/calculo-notas.js
   ============================================================================ */

/* =================================================================
   Ventana emergente con la descripción completa de un criterio
   Se invoca al pinchar en el número/código de cualquier criterio
   (en Calificar, Actividades…) para no tener que mostrar el texto
   entero en sitios donde solo cabe el identificador.
   ================================================================= */
function critLinkHTML(catalogoKey,critId,label){
  return `<span class="critlink" onclick="verCriterio('${catalogoKey}','${esc(critId)}')" title="Ver la descripción completa de este criterio">${esc(label||critId)}</span>`;
}
function cerrarModalCriterioEsc(e){ if(e.key==="Escape") cerrarModalCriterio(); }
window.verCriterio=(catalogoKey,critId)=>{
  const idx=catIndex(catalogoKey);
  const l=idx.critMap[critId];
  if(!l){ return; }
  const ce=idx.ceMap[l.ceId];
  const grupo=grupoActual();
  let pesoHTML="";
  if(grupo && grupo.catalogoKey===catalogoKey){
    const p=pesoCriterio(grupo,critId);
    pesoHTML=`<div style="font-size:12.5px;color:var(--mut);margin-top:12px">Peso dentro de ${esc(ce.id)}: <strong>${fmt(p)}%</strong></div>`;
  }
  const ccHTML=(ce.cc||[]).map(cc=>`<span class="badge" style="margin:0 5px 5px 0;display:inline-block">${esc(cc)} · ${esc(COMP_CLAVE[cc]||cc)}</span>`).join("");
  cerrarModalCriterio();
  const wrap=document.createElement("div");
  wrap.id="critModalWrap";
  wrap.innerHTML=`<div class="modal-overlay" onclick="if(event.target===this) cerrarModalCriterio()">
    <div class="modal-box">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px">
        <div style="font-size:16px;font-weight:600">Criterio ${esc(critId)}</div>
        <button class="modal-close" onclick="cerrarModalCriterio()" aria-label="Cerrar">×</button>
      </div>
      <div style="font-size:14.5px;line-height:1.6">${esc(l.texto)}</div>
      ${pesoHTML}
      <div style="font-size:12.5px;color:var(--mut);margin:14px 0 6px">Pertenece a la competencia específica</div>
      <div style="font-size:13.5px;line-height:1.5"><strong>${esc(ce.id)}</strong> · ${esc(ce.titulo)}</div>
      <div style="font-size:12.5px;color:var(--mut);margin:14px 0 6px">Competencias clave relacionadas</div>
      <div>${ccHTML}</div>
    </div>
  </div>`;
  document.body.appendChild(wrap);
  document.addEventListener("keydown",cerrarModalCriterioEsc);
};
window.cerrarModalCriterio=()=>{
  const el=document.getElementById("critModalWrap");
  if(el) el.remove();
  document.removeEventListener("keydown",cerrarModalCriterioEsc);
};

/* v6 · Rendimiento: índice de la estructura de actividades de cada grupo
   (qué actividades hay en cada trimestre y qué recuperaciones afectan a
   cada una). Se reconstruye solo si cambia la lista de actividades y se
   invalida en cada guardado y en cada pintado, así que nunca queda viejo.
   Con 10 grupos × 30 alumnos × 60 actividades, la Memoria de curso pasa
   de ~0,5 s a una fracción. */
let _cacheEstructura=new WeakMap();
function _invalidarCaches(){ _cacheEstructura=new WeakMap(); }
function _estructura(grupo){
  const acts=grupo.actividades;
  let c=_cacheEstructura.get(grupo);
  if(!c || c.acts!==acts || c.n!==acts.length){
    c={acts,n:acts.length,rec:{},trim:{},memo:new Map()};
    acts.forEach(r=>{ if(r.recupera && Array.isArray(r.recupera.ids)) r.recupera.ids.forEach(id=>{ (c.rec[id]=c.rec[id]||[]).push(r); }); });
    _cacheEstructura.set(grupo,c);
  }
  return c;
}
function actsTrim(grupo){ const c=_estructura(grupo), t=state.ui.trim; return c.trim[t]||(c.trim[t]=grupo.actividades.filter(a=>a.trimestre===t)); }

/* =================================================================
   v2 · RECUPERACIONES
   Una actividad con act.recupera = {ids:[…], modo, tope} es la
   recuperación de otra(s). No cuenta por sí misma: modifica la nota de
   las actividades que recupera (aunque sean de otro trimestre):
     - "mayor": se queda con la nota más alta (por defecto)
     - "sustituye": la nota de la recuperación sustituye a la original
     - "media": media entre original y recuperación
   tope (opcional): nota máxima que puede aportar la recuperación (p. ej. 5).
   Para las competencias, se aplica igual criterio a criterio, en los
   criterios que comparten original y recuperación.
   ================================================================= */
const REC_MODOS=[{id:"mayor",label:"Se queda con la nota más alta"},{id:"sustituye",label:"Sustituye a la nota original"},{id:"media",label:"Media entre original y recuperación"}];
function recuperacionesDe(grupo,actId){
  return _estructura(grupo).rec[actId]||[];
}
function _combinarRec(v,rv,modo){
  if(rv==null) return v;
  if(modo==="sustituye") return rv;
  if(modo==="media") return v==null?rv:(v+rv)/2;
  return v==null?rv:Math.max(v,rv);
}
function _notaCritCruda(grupo,alId,a,cid){
  const n=grupo.notas?.[alId]?.[a.id]?.[cid];
  return (n==null||n==="")?null:Number(n);
}
function scoreCriterio(grupo,alId,cid){
  let sw=0,sv=0;
  for(const a of actsTrim(grupo)){
    if(a.recupera) continue;
    const l=a.criterios.find(x=>x.critId===cid); if(!l) continue;
    let n=_notaCritCruda(grupo,alId,a,cid);
    for(const r of recuperacionesDe(grupo,a.id)){
      if(marcaDe(grupo,alId,r.id)==="EX") continue;
      n=_combinarRec(n,_notaCritCruda(grupo,alId,r,cid),r.recupera.modo);
    }
    if(n==null||n==="") continue;
    const w=Number(l.peso)||0; if(w<=0) continue;
    sw+=w; sv+=(Number(n)/10)*100*w;
  }
  return sw>0? sv/sw : null;
}
function scoreCE(grupo,alId,ceId){
  const _m=_estructura(grupo).memo, _k="ce|"+state.ui.trim+"|"+alId+"|"+ceId;
  if(_m.has(_k)) return _m.get(_k);
  const _v=_scoreCEsinCache(grupo,alId,ceId); _m.set(_k,_v); return _v;
}
function _scoreCEsinCache(grupo,alId,ceId){
  const idx=catIndex(grupo.catalogoKey);
  let sw=0,sv=0;
  for(const c of idx.ceMap[ceId].criterios){
    const sc=scoreCriterio(grupo,alId,c.id); if(sc==null) continue;
    const w=pesoCriterio(grupo,c.id); sw+=w; sv+=sc*w;
  }
  return sw>0? sv/sw : null;
}
function scoreCC(grupo,alId,cc){
  const idx=catIndex(grupo.catalogoKey);
  let sw=0,sv=0;
  for(const ce of idx.cat.ces){
    if(!ce.cc.includes(cc)) continue;
    const sc=scoreCE(grupo,alId,ce.id); if(sc==null) continue;
    const w=pesoCEenCC(grupo,ce.id,cc); sw+=w; sv+=sc*w;
  }
  return sw>0? sv/sw : null;
}
function nivel(grupo,p){
  if(p==null) return null;
  const u=grupo.umbrales;
  if(p>=u.excelente) return NIV.excelente;
  if(p>=u.adecuado) return NIV.adecuado;
  if(p>=u.enProceso) return NIV.enProceso;
  return NIV.necesita;
}

function notaActividad(grupo,alId,a){
  if(a.recupera) return null; // la recuperación no cuenta sola: actúa sobre sus originales
  let v=notaActividadBase(grupo,alId,a);
  for(const r of recuperacionesDe(grupo,a.id)){
    if(marcaDe(grupo,alId,r.id)==="EX") continue;
    let rv=notaActividadBase(grupo,alId,r);
    if(rv==null) continue;
    const tope=r.recupera.tope;
    if(tope!=null && tope!=="" && isFinite(Number(tope))) rv=Math.min(rv,Number(tope));
    v=_combinarRec(v,rv,r.recupera.modo);
  }
  return v;
}
function notaActividadBase(grupo,alId,a){
  if(a.esExamen){
    /* Los exámenes tienen una nota cuantitativa propia e independiente de la
       calificación cualitativa de cada criterio (ver grupo.notasCuant). Esta
       es la única que cuenta para la nota de bloque/trimestre/final. */
    const vc=grupo.notasCuant?.[alId]?.[a.id];
    return (vc==null||vc==="")? null : Number(vc);
  }
  let sw=0,sv=0;
  for(const l of a.criterios){
    const n=grupo.notas?.[alId]?.[a.id]?.[l.critId];
    if(n==null||n==="") continue;
    const w=Number(l.peso)||0; if(w<=0) continue;
    sw+=w; sv+=Number(n)*w;
  }
  return sw>0? sv/sw : null;
}
function pesoActividadEnBloque(grupo,act){
  const v=act.pesoBloque; if(v!=null && v!=="") return Number(v);
  const n=grupo.actividades.filter(a=>a.trimestre===act.trimestre && a.bloqueId===act.bloqueId && !a.recupera).length;
  return n>0? 100/n : 100;
}
function notaBloque(grupo,alId,bloqueId,trim){
  const acts=grupo.actividades.filter(a=>a.trimestre===trim && a.bloqueId===bloqueId);
  let sw=0,sv=0;
  for(const a of acts){
    const v=notaActividad(grupo,alId,a); if(v==null) continue;
    const w=pesoActividadEnBloque(grupo,a); if(w<=0) continue;
    sw+=w; sv+=v*w;
  }
  return sw>0? sv/sw : null;
}
/* v1: bloques de calificación que ya tienen actividades corregidas en el
   trimestre pero en los que ESTE alumno/a no tiene ninguna nota. Como la
   media se reparte solo entre los bloques con nota, un bloque vacío
   (p. ej. no ha hecho ningún examen) cambia el peso real del resto: se avisa. */
function bloquesSinNota(grupo,alId,trim){
  const out=[];
  for(const b of grupo.bloques){
    if(!(Number(b.peso)>0)) continue;
    const acts=grupo.actividades.filter(a=>a.trimestre===trim && a.bloqueId===b.id);
    const corregidas=acts.filter(a=>grupo.alumnos.some(x=>notaActividad(grupo,x.id,a)!=null));
    if(!corregidas.length) continue;
    const exento=corregidas.every(a=>marcaDe(grupo,alId,a.id)==="EX");
    if(exento) continue;
    if(notaBloque(grupo,alId,b.id,trim)==null) out.push(b.label);
  }
  return out;
}
function avisoBloquesHTML(grupo,alId,trim){
  const f=bloquesSinNota(grupo,alId,trim); if(!f.length) return "";
  return ` <span title="Sin ninguna nota en: ${esc(f.join(", "))}. Su nota de ${TRIMESTRES[trim]} se calcula solo con el resto de bloques. Pon la nota que falte, o márcalo como NP (cuenta 0) o Exento." style="cursor:help;color:#b45309">⚠️</span>`;
}
function notaTrimestre(grupo,alId,trim){
  const _m=_estructura(grupo).memo, _k="nt|"+trim+"|"+alId;
  if(_m.has(_k)) return _m.get(_k);
  const _v=_notaTrimestreSinCache(grupo,alId,trim); _m.set(_k,_v); return _v;
}
function _notaTrimestreSinCache(grupo,alId,trim){
  let sw=0,sv=0;
  for(const b of grupo.bloques){
    const v=notaBloque(grupo,alId,b.id,trim); if(v==null) continue;
    sw+=b.peso; sv+=v*b.peso;
  }
  return sw>0? sv/sw : null;
}
function pesoTrimestreEfectivo(grupo,t,disponibles){
  const v=grupo.pesosTrim && grupo.pesosTrim[t];
  if(v!=null && v!=="") return Number(v);
  return 100/disponibles.length;
}
function notaFinal(grupo,alId){
  const disponibles=[0,1,2].filter(t=>notaTrimestre(grupo,alId,t)!=null);
  if(!disponibles.length) return null;
  let sw=0,sv=0;
  for(const t of disponibles){
    const v=notaTrimestre(grupo,alId,t);
    const w=pesoTrimestreEfectivo(grupo,t,disponibles);
    sw+=w; sv+=v*w;
  }
  return sw>0? sv/sw : null;
}
/* Nota con 1 decimal (redondeo normal). Única excepción: una nota por debajo
   de 5 nunca se muestra como "5,0" (4,96 → "4,9"), para que la cifra no
   sugiera un aprobado que la nota de acta no da. */
const fmt=x=>{
  if(x==null||x===""||isNaN(Number(x))) return "—";
  x=_limpiaFP(x);
  let r=Math.round(_limpiaFP(x*10))/10;
  if(x<5 && r>=5) r=4.9;
  return r.toFixed(1).replace(".",",");
};
function pillHTML(grupo,p){
  const nv=nivel(grupo,p);
  if(!nv) return '<span style="color:var(--mut);font-size:13px">—</span>';
  return `<span class="pill" style="background:${nv.bg};color:${nv.fg}"><strong>${p.toFixed(0)}%</strong> ${nv.etq}</span>`;
}
function pillCuant(v,grupo){
  const n=etiquetaNota(v,grupo);
  if(!n) return '<span style="color:var(--mut);font-size:13px">—</span>';
  return `<span class="pill" title="Nota de acta: ${notaActa(v,grupo)} (regla de redondeo en Ajustes del grupo)" style="background:${n.bg};color:${n.fg}">${n.etq} · ${notaActa(v,grupo)}</span>`;
}
function actividadesDeCriterio(grupo,alId,cid){
  const set=new Set();
  for(const a of actsTrim(grupo)){
    if(a.recupera) continue;
    const l=a.criterios.find(x=>x.critId===cid); if(!l) continue;
    const n=grupo.notas?.[alId]?.[a.id]?.[cid];
    if(n!=null&&n!=="") set.add(a.nombre);
    for(const r of recuperacionesDe(grupo,a.id)){ if(_notaCritCruda(grupo,alId,r,cid)!=null) set.add(r.nombre); }
  }
  return [...set];
}
function actividadesDeCE(grupo,alId,ceId){
  const idx=catIndex(grupo.catalogoKey);
  const set=new Set();
  idx.ceMap[ceId].criterios.forEach(c=>actividadesDeCriterio(grupo,alId,c.id).forEach(n=>set.add(n)));
  return [...set];
}
function actividadesDeCC(grupo,alId,cc){
  const idx=catIndex(grupo.catalogoKey);
  const set=new Set();
  idx.cat.ces.filter(ce=>ce.cc.includes(cc)).forEach(ce=>actividadesDeCE(grupo,alId,ce.id).forEach(n=>set.add(n)));
  return [...set];
}
function abrevActs(names,max=3){
  if(!names.length) return "Sin actividades con nota en este periodo";
  const shown=names.slice(0,max).join(" · ");
  return names.length>max? `${shown} · +${names.length-max} más` : shown;
}

/* =================================================================
   Informe final de curso: agregados anuales (media de las 3 evaluaciones)
   Varias funciones de puntuación (scoreCriterio, scoreCE, scoreCC,
   actividadesDeCE/CC…) dependen del trimestre "actual" (state.ui.trim).
   conTrim() permite reutilizarlas para un trimestre concreto sin tocar
   la interfaz: cambia el trimestre global, ejecuta la función y lo
   restaura siempre (incluso si la función lanza un error).
   ================================================================= */
function conTrim(trim,fn){
  const prev=state.ui.trim;
  state.ui.trim=trim;
  try{ return fn(); } finally { state.ui.trim=prev; }
}
/* Media ponderada (misma lógica que notaFinal) de una puntuación de
   competencia a lo largo de los trimestres en los que hay dato. */
function mediaAnualPonderada(grupo,valoresPorTrim){
  const disponibles=valoresPorTrim.filter(x=>x.v!=null);
  if(!disponibles.length) return null;
  const trims=disponibles.map(x=>x.t);
  let sw=0,sv=0;
  for(const {t,v} of disponibles){ const w=pesoTrimestreEfectivo(grupo,t,trims); sw+=w; sv+=v*w; }
  return sw>0? sv/sw : null;
}
function scoreCEAnual(grupo,alId,ceId){
  return mediaAnualPonderada(grupo,[0,1,2].map(t=>({t,v:conTrim(t,()=>scoreCE(grupo,alId,ceId))})));
}
function scoreCCAnual(grupo,alId,cc){
  return mediaAnualPonderada(grupo,[0,1,2].map(t=>({t,v:conTrim(t,()=>scoreCC(grupo,alId,cc))})));
}
function actividadesDeCEAnual(grupo,alId,ceId){
  const set=new Set();
  for(const t of [0,1,2]) conTrim(t,()=>actividadesDeCE(grupo,alId,ceId)).forEach(n=>set.add(n));
  return [...set];
}
function actividadesDeCCAnual(grupo,alId,cc){
  const set=new Set();
  for(const t of [0,1,2]) conTrim(t,()=>actividadesDeCC(grupo,alId,cc)).forEach(n=>set.add(n));
  return [...set];
}

/* v2: la cabecera muestra las materias reales de tus grupos (antes decía
   siempre "Geografía e Historia"). */
function materiasEtiqueta(){
  const ms=[...new Set(state.grupos.map(g=>{ const c=getCatalogo(g.catalogoKey); return c&&c.materia; }).filter(Boolean))];
  if(!ms.length) return "Cuaderno del profesor";
  if(ms.length<=2) return ms.join(" · ");
  return ms.slice(0,2).join(" · ")+` y ${ms.length-2} más`;
}
