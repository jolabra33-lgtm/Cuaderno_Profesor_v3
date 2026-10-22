/* ============================================================================
   Cuaderno del profesor · Cobertura de la evaluación, «Revisar mis datos» y novedades
   js/resultados/cobertura-diagnostico.js
   ============================================================================ */

/* ---------- Cobertura Curricular ---------- */
/* =================================================================
   v3 · COBERTURA DE LA EVALUACIÓN EN CURSO
   Criterios trabajados en el trimestre con una sola evidencia
   (instrumento) y alumnado al que le falta nota en algún criterio
   trabajado. Se avisa en Inicio cuando se acerca el fin de la
   evaluación (fechas en Ajustes del grupo).
   ================================================================= */
/* =================================================================
   v6 · 🩺 REVISAR MIS DATOS
   Revisa la coherencia interna de todos los grupos y ofrece arreglar
   automáticamente lo que es seguro arreglar (restos de alumnado o
   actividades borrados, notas fuera de 0–10, enlaces rotos). Antes de
   arreglar se guarda una copia automática y además se puede deshacer.
   Lo que requiere una decisión tuya se muestra como aviso, sin tocarlo.
   ================================================================= */
function diagnosticarDatos(){
  const res=[]; // {tipo:'arreglo'|'aviso'|'info', donde, texto, fix?}
  const add=(tipo,donde,texto,fix)=>res.push({tipo,donde,texto,fix});
  const idsGrupos=new Set(state.grupos.map(g=>g.id));
  state.grupos.forEach(g=>{
    const donde=g.nombre;
    const idx=catIndex(g.catalogoKey);
    const alIds=new Set(g.alumnos.map(a=>a.id)), actIds=new Set(g.actividades.map(a=>a.id));
    // 1-2. Restos de alumnado / actividades borrados
    let restosAl=0, restosAct=0;
    ["notas","notasCuant","rubricScores","examComentarios","marcas","entregasInforme"].forEach(k=>{
      const m=g[k]||{};
      Object.keys(m).forEach(alId=>{
        if(!alIds.has(alId)){ restosAl++; return; }
        if(k==="entregasInforme") return;
        Object.keys(m[alId]||{}).forEach(aId=>{ if(!actIds.has(aId)) restosAct++; });
      });
    });
    if(restosAl||restosAct) add("arreglo",donde,`Hay datos sueltos de ${restosAl?restosAl+" alumno(s) ya borrado(s)":""}${restosAl&&restosAct?" y ":""}${restosAct?restosAct+" nota(s) de actividades ya borradas":""}. No se ven ni cuentan; ocupan espacio. (Lo que está en la papelera no se toca.)`,()=>{
      ["notas","notasCuant","rubricScores","examComentarios","marcas","entregasInforme"].forEach(k=>{
        const m=g[k]||{};
        Object.keys(m).forEach(alId=>{
          if(!alIds.has(alId)){ delete m[alId]; return; }
          if(k==="entregasInforme") return;
          Object.keys(m[alId]||{}).forEach(aId=>{ if(!actIds.has(aId)) delete m[alId][aId]; });
        });
      });
    });
    // 3. Notas fuera de rango o no numéricas
    let fuera=0;
    Object.values(g.notas||{}).forEach(pa=>Object.values(pa||{}).forEach(pc=>Object.values(pc||{}).forEach(v=>{ if(v!==""&&v!=null&&(!isFinite(Number(v))||Number(v)<0||Number(v)>10)) fuera++; })));
    Object.values(g.notasCuant||{}).forEach(pa=>Object.values(pa||{}).forEach(v=>{ if(v!==""&&v!=null&&(!isFinite(Number(v))||Number(v)<0||Number(v)>10)) fuera++; }));
    if(fuera) add("arreglo",donde,`${fuera} nota(s) fuera de 0–10 o no numéricas (de versiones anteriores sin validación). Se ajustan a 0–10 y las no numéricas se quitan.`,()=>{
      const fix=(obj,k)=>{ const v=obj[k]; if(v===""||v==null) return; const n=Number(v); if(!isFinite(n)) delete obj[k]; else obj[k]=Math.max(0,Math.min(10,n)); };
      Object.values(g.notas||{}).forEach(pa=>Object.values(pa||{}).forEach(pc=>Object.keys(pc||{}).forEach(k=>fix(pc,k))));
      Object.values(g.notasCuant||{}).forEach(pa=>Object.keys(pa||{}).forEach(k=>fix(pa,k)));
    });
    // 4. Criterios que ya no existen en la materia
    const critsRotos=[]; g.actividades.forEach(a=>(a.criterios||[]).forEach(l=>{ if(!idx.critMap[l.critId]) critsRotos.push(`${a.nombre} (${l.critId})`); }));
    if(critsRotos.length) add("arreglo",donde,`${critsRotos.length} enlace(s) a criterios que ya no existen en la materia (¿se editó la plantilla?): ${critsRotos.slice(0,5).join(", ")}${critsRotos.length>5?"…":""}. Se quitan esos enlaces.`,()=>{
      g.actividades.forEach(a=>{ a.criterios=(a.criterios||[]).filter(l=>idx.critMap[l.critId]); });
    });
    // 5. Actividades sin criterios
    const sinCrit=g.actividades.filter(a=>!a.recupera && !a.rubrica && !(a.criterios||[]).length);
    if(sinCrit.length) add("aviso",donde,`${sinCrit.length} actividad(es) sin ningún criterio: ${sinCrit.slice(0,4).map(a=>"«"+a.nombre+"»").join(", ")}. No cuentan para las competencias${sinCrit.some(a=>!a.esExamen)?" (ni para la nota, si no son exámenes)":""}.`);
    // 6. Recuperaciones rotas
    const recRotas=g.actividades.filter(a=>a.recupera && (a.recupera.ids||[]).some(id=>!actIds.has(id)));
    if(recRotas.length) add("arreglo",donde,`${recRotas.length} recuperación(es) apuntan a exámenes que ya no existen. Se quitan esas referencias.`,()=>{ recRotas.forEach(r=>{ r.recupera.ids=(r.recupera.ids||[]).filter(id=>actIds.has(id)); }); });
    const recVacias=g.actividades.filter(a=>a.recupera && !(a.recupera.ids||[]).filter(id=>actIds.has(id)).length);
    if(recVacias.length) add("aviso",donde,`${recVacias.length} recuperación(es) no recuperan nada: ${recVacias.map(a=>"«"+a.nombre+"»").join(", ")}. Ábrelas en Actividades (🔁) y marca qué recuperan.`);
    // 7. Bloques
    const suma=g.bloques.reduce((n,b)=>n+(Number(b.peso)||0),0);
    if(Math.abs(suma-100)>0.01) add("aviso",donde,`Los bloques de calificación suman ${String(Math.round(suma*100)/100).replace(".",",")} % (Ajustes).`);
    const bIds=new Set(g.bloques.map(b=>b.id));
    const sinBloque=g.actividades.filter(a=>!bIds.has(a.bloqueId));
    if(sinBloque.length) add("arreglo",donde,`${sinBloque.length} actividad(es) están en un bloque que ya no existe, así que NO cuentan para la nota: ${sinBloque.slice(0,4).map(a=>"«"+a.nombre+"»").join(", ")}. Se pasan al bloque que les corresponde por su tipo.`,()=>{ sinBloque.forEach(a=>{ a.bloqueId=defBloque(a.tipo||"",g.bloques); }); });
    // 8. Rúbricas que no suman 10 sin convertir
    const rub=g.actividades.filter(a=>a.rubrica && Math.abs(cxMaxTotal(a.rubrica)-10)>=0.01 && !a.escalarA10);
    if(rub.length) add("aviso",donde,`${rub.length} rúbrica(s) no suman 10 puntos y no se convierten a nota sobre 10: ${rub.map(a=>"«"+a.nombre+"»").join(", ")}. Revísalo en el Corrector.`);
    // 9. Nombres
    const vistos={}, dup=new Set(); g.alumnos.forEach(a=>{ const k=normalizarTexto(a.nombre||""); if(!k) return; if(vistos[k]) dup.add(a.nombre); vistos[k]=1; });
    if(dup.size) add("aviso",donde,`Nombres repetidos en el grupo: ${[...dup].join(", ")}. Puede confundir en listas, informes y al pasar datos a Tutoría.`);
    const correosMal=g.alumnos.filter(a=>(a.familia||[]).some(f=>f.email&&!emailValido(f.email)));
    if(correosMal.length) add("aviso",donde,`Correo de la familia mal escrito en: ${correosMal.map(a=>a.nombre).join(", ")}. Revísalo en su ficha (Alumnado → Editar).`);
    const sinNombre=g.alumnos.filter(a=>!(a.nombre||"").trim());
    if(sinNombre.length) add("aviso",donde,`${sinNombre.length} alumno(s) sin nombre.`);
    // 10. Plano
    const planoRestos=Object.keys((g.plano&&g.plano.posiciones)||{}).filter(id=>!alIds.has(id));
    if(planoRestos.length) add("arreglo",donde,`${planoRestos.length} mesa(s) del plano ocupadas por alumnado ya borrado. Se liberan.`,()=>{ planoRestos.forEach(id=>delete g.plano.posiciones[id]); });
    // 11. Programación vinculada
    if(g.programacionId && !(state.programaciones||[]).some(p=>p.id===g.programacionId)) add("arreglo",donde,"Está vinculado a una Programación de Aula que ya no existe. Se desvincula.",()=>{ g.programacionId=""; });
    // 12. Fechas de evaluación
    (g.fechasTrimestre||[]).forEach((f,t)=>{ if(f&&f.inicio&&f.fin&&f.fin<f.inicio) add("aviso",donde,`Las fechas de la ${TRIMESTRES[t]} están al revés (termina antes de empezar). Corrígelas en Ajustes.`); });
    if(!(g.fechasTrimestre||[]).some(f=>f&&f.inicio&&f.fin)) add("info",donde,"Sin fechas de evaluación (Ajustes): con ellas la app avisa antes de cada cierre y filtra asistencia y convivencia por evaluación.");
  });
  // Globales
  const celdasRotas=Object.entries((state.horario&&state.horario.celdas)||{}).filter(([k,c])=>c&&c.grupoId&&!idsGrupos.has(c.grupoId));
  if(celdasRotas.length) add("arreglo","Mi horario",`${celdasRotas.length} casilla(s) enlazadas a grupos que ya no existen. Se quita el enlace (la casilla se conserva).`,()=>{ celdasRotas.forEach(([k,c])=>{ c.grupoId=""; }); });
  let evRotos=0; (state.eventos||[]).forEach(e=>{ if(Array.isArray(e.grupoIds)) evRotos+=e.grupoIds.filter(id=>!idsGrupos.has(id)).length; });
  if(evRotos) add("arreglo","Calendario",`${evRotos} evento(s) apuntan a grupos borrados. Se quitan esas referencias.`,()=>{ (state.eventos||[]).forEach(e=>{ if(Array.isArray(e.grupoIds)) e.grupoIds=e.grupoIds.filter(id=>idsGrupos.has(id)); }); });
  const reunRotas=(state.reuniones||[]).filter(r=>r.grupoId&&!idsGrupos.has(r.grupoId));
  if(reunRotas.length) add("arreglo","Reuniones",`${reunRotas.length} reunión(es) vinculadas a grupos borrados. Se desvinculan (el acta se conserva).`,()=>{ reunRotas.forEach(r=>{ r.grupoId=""; r.alumnoId=""; }); });
  if(!state.lastBackupAt || Date.now()-state.lastBackupAt>14*86400000) add("aviso","Copias",state.lastBackupAt?`Tu última copia exportada es de hace ${Math.floor((Date.now()-state.lastBackupAt)/86400000)} días. Exporta una (mejor cifrada) y guárdala fuera del dispositivo.`:"Todavía no has exportado ninguna copia a un archivo. Hazlo desde 🛟 Copias (mejor cifrada).");
  return res;
}
let _diagModalEl=null;
window.abrirDiagnostico=()=>{
  cerrarDiagnostico();
  const div=document.createElement("div"); div.className="modal-overlay"; div.onclick=e=>{ if(e.target===div) cerrarDiagnostico(); };
  document.body.appendChild(div); _diagModalEl=div; pintarDiagnostico();
};
window.cerrarDiagnostico=()=>{ if(_diagModalEl){ _diagModalEl.remove(); _diagModalEl=null; } };
function pintarDiagnostico(){
  if(!_diagModalEl) return;
  const r=diagnosticarDatos();
  const arreglos=r.filter(x=>x.tipo==="arreglo"), avisos=r.filter(x=>x.tipo==="aviso"), infos=r.filter(x=>x.tipo==="info");
  const fila=(x,icono)=>`<div style="padding:7px 0;border-bottom:1px solid var(--line);font-size:13.5px;line-height:1.45">${icono} <strong>${esc(x.donde)}</strong> — ${esc(x.texto)}</div>`;
  _diagModalEl.innerHTML=`<div class="modal-box" style="max-width:680px">
    <div class="flex" style="justify-content:space-between;align-items:center"><h2 style="font-size:17px">🩺 Revisión de tus datos</h2><button class="modal-close" onclick="cerrarDiagnostico()" aria-label="Cerrar">×</button></div>
    ${!r.length||(!arreglos.length&&!avisos.length)?`<p style="font-size:14.5px;color:#1e7a44;font-weight:600;margin:10px 0">✓ Todo en orden: no hay nada que arreglar.</p>`:`<p class="sub">${arreglos.length} cosa(s) que se pueden arreglar solas · ${avisos.length} aviso(s) para que lo revises tú.</p>`}
    <div class="scroll" style="max-height:52vh">
      ${arreglos.length?`<div class="section-eyebrow" style="margin-top:8px">Se pueden arreglar automáticamente</div>${arreglos.map(x=>fila(x,"🔧")).join("")}`:""}
      ${avisos.length?`<div class="section-eyebrow" style="margin-top:12px">Para revisar tú</div>${avisos.map(x=>fila(x,"⚠️")).join("")}`:""}
      ${infos.length?`<div class="section-eyebrow" style="margin-top:12px">Sugerencias</div>${infos.map(x=>fila(x,"💡")).join("")}`:""}
    </div>
    <div class="flex" style="justify-content:flex-end;gap:8px;margin-top:12px">
      ${arreglos.length?`<button class="btn" onclick="aplicarArreglosDiagnostico()">🔧 Arreglar ${arreglos.length} automáticamente</button>`:""}
      <button class="ghost" style="border:1px solid var(--line)" onclick="cerrarDiagnostico()">Cerrar</button>
    </div>
  </div>`;
}
window.aplicarArreglosDiagnostico=async()=>{
  const arreglos=diagnosticarDatos().filter(x=>x.tipo==="arreglo"&&x.fix);
  if(!arreglos.length) return;
  await crearCopiaAuto("Antes de revisar datos",true);
  let hechos=0; arreglos.forEach(x=>{ try{ x.fix(); hechos++; }catch(e){ console.error("Arreglo fallido:",x.texto,e); } });
  Object.keys(CAT_CACHE).forEach(k=>delete CAT_CACHE[k]);
  save(); render(); pintarDiagnostico();
  mostrarToast(`✓ ${hechos} arreglo(s) aplicados. Si algo no te convence: ↶ Deshacer o 🛟 Copias.`);
};

/* v3 · Tarjeta de novedades: se ve una vez tras actualizar, y se cierra. */
const NOVEDADES_VERSION="mejorada-v7";
window.cerrarNovedades=()=>{ state.novedadesVistas=NOVEDADES_VERSION; save(); render(); };
function novedadesHTML(){
  if(state.novedadesVistas===NOVEDADES_VERSION) return "";
  return `<div class="card" style="border-left:4px solid var(--accent-2);padding:14px 18px">
    <div class="flex" style="justify-content:space-between;align-items:flex-start;gap:10px">
      <strong style="font-size:14.5px">✨ Novedades de esta versión</strong>
      <button class="modal-close" onclick="cerrarNovedades()" aria-label="Cerrar novedades">×</button>
    </div>
    <ul style="margin:8px 0 0 18px;font-size:13.5px;line-height:1.6">
      <li><strong>Nota de acta</strong> entera y coherente (Ajustes → regla de redondeo), <strong>NP / Exento</strong> y <strong>🔁 recuperaciones</strong>.</li>
      <li><strong>🛟 Copias</strong> automáticas en el dispositivo, recuperación sola si se borran los datos y <strong>🔒 copia cifrada</strong>.</li>
      <li><strong>📌 Hoy</strong> con tus clases, <strong>franjas horarias</strong> editables, <strong>Intro</strong> y <strong>pegar desde Excel</strong> al calificar.</li>
      <li>Plano: <strong>pasar lista</strong> tocando mesas y <strong>🎲 alumno al azar</strong>. <strong>🧭 Cobertura</strong> antes del cierre y <strong>💬 comentarios sugeridos</strong> (castellano/valencià).</li>
      <li><strong>Imprimir</strong> sin ventanas emergentes (vista previa dentro de la app, también en iPad) y <strong>↶ deshacer / ↷ rehacer</strong> cualquier cambio (Ctrl/Cmd+Z).</li>
      <li><strong>👪 Correos de la familia</strong> en la ficha de cada alumno/a (Alumnado → Editar), con la columna «Familia» para ver de un vistazo a quién le falta.</li>
      <li><strong>🩺 Revisar mis datos</strong> (Inicio): comprueba que todo cuadra y arregla solo lo seguro. Más rápida con muchos grupos y mejor en modo oscuro.</li>
      <li><strong>👥 Para la tutoría</strong> (Resultados): pasa tus suspensos de cada evaluación al Gestor de Tutoría del tutor/a, que ahora también arranca en blanco, sin ventanas emergentes y con el curso escolar correcto en las actas.</li>
    </ul>
    <div class="flex" style="gap:8px;margin-top:10px"><a class="btn small" href="guia_mejorada.html#novedades" style="text-decoration:none">Ver la guía de novedades</a><button class="ghost small" style="border:1px solid var(--line)" onclick="cerrarNovedades()">Entendido</button></div>
  </div>`;
}
function coberturaTrim(grupo,trim){
  const acts=grupo.actividades.filter(a=>a.trimestre===trim && !a.recupera);
  const porCrit={};
  acts.forEach(a=>(a.criterios||[]).forEach(l=>{ (porCrit[l.critId]=porCrit[l.critId]||[]).push(a); }));
  const unaSola=Object.keys(porCrit).filter(cid=>porCrit[cid].length===1);
  const sinNota=[];
  grupo.alumnos.forEach(al=>{
    const faltan=Object.keys(porCrit).filter(cid=>{
      // solo cuenta si al menos alguien ya tiene nota en ese criterio (actividad corregida)
      const corregido=porCrit[cid].some(a=>grupo.alumnos.some(x=>_notaCritCruda(grupo,x.id,a,cid)!=null));
      if(!corregido) return false;
      if(porCrit[cid].every(a=>marcaDe(grupo,al.id,a.id)==="EX")) return false;
      return conTrim(trim,()=>scoreCriterio(grupo,al.id,cid))==null;
    });
    if(faltan.length) sinNota.push({al,faltan});
  });
  return {trabajados:Object.keys(porCrit).length,unaSola,sinNota,porCrit};
}
function trimActualPorFecha(grupo,hoy){
  const f=grupo.fechasTrimestre||[];
  for(let t=0;t<3;t++){ const x=f[t]; if(x&&x.inicio&&x.fin&&hoy>=x.inicio&&hoy<=x.fin) return t; }
  return null;
}
function coberturaAvisosInicio(){
  const hoy=agHoyStr(); const out=[];
  (state.grupos||[]).forEach(g=>{
    const t=trimActualPorFecha(g,hoy); if(t==null) return;
    const fin=g.fechasTrimestre[t].fin;
    const dias=Math.round((new Date(fin+"T00:00:00")-new Date(hoy+"T00:00:00"))/86400000);
    if(dias>21) return;
    const cb=coberturaTrim(g,t);
    if(!cb.unaSola.length && !cb.sinNota.length) return;
    out.push({g,t,dias,cb});
  });
  return out;
}
function coberturaAvisosInicioHTML(){
  const av=coberturaAvisosInicio(); if(!av.length) return "";
  return `<div class="card" style="border-color:#b45309;margin-bottom:14px">
    <strong style="font-size:14px">🧭 Antes de cerrar la evaluación</strong>
    <div style="display:grid;gap:8px;margin-top:8px">
    ${av.map(({g,t,dias,cb})=>`<div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <span style="font-size:13px"><strong>${esc(g.nombre)}</strong> · ${TRIMESTRES[t]} ${dias>=0?`termina en ${dias} día${dias===1?"":"s"}`:"ya ha terminado"}:
        ${cb.unaSola.length?`${cb.unaSola.length} criterio${cb.unaSola.length===1?"":"s"} con una sola evidencia`:""}${cb.unaSola.length&&cb.sinNota.length?" · ":""}${cb.sinNota.length?`${cb.sinNota.length} alumno${cb.sinNota.length===1?"":"s"} sin nota en algún criterio trabajado`:""}.</span>
      <button class="ghost small" style="border:1px solid var(--line)" onclick="state.ui.trim=${t};hoyIr('${g.id}','cobertura')">Ver cobertura</button>
    </div>`).join("")}
    </div></div>`;
}
function renderCobertura(grupo){
  const c=document.getElementById("tabContent");
  const idx=catIndex(grupo.catalogoKey);

  const actsByCrit = {};
  grupo.actividades.forEach(a => {
     a.criterios.forEach(l => {
        if(!actsByCrit[l.critId]) actsByCrit[l.critId] = [];
        actsByCrit[l.critId].push(a);
     });
  });

  const _cb=coberturaTrim(grupo,state.ui.trim);
  let html = `<div class="card" style="border-left:4px solid ${(_cb.unaSola.length||_cb.sinNota.length)?"#b45309":"#1e7a44"}">
    <h2 style="font-size:15px">🧭 ${TRIMESTRES[state.ui.trim]}: ¿hay evidencias suficientes?</h2>
    ${!_cb.trabajados?'<p class="sub" style="margin:0">Todavía no hay actividades con criterios en esta evaluación.</p>':`
    <p class="sub" style="margin:4px 0 8px">${_cb.trabajados} criterio${_cb.trabajados===1?"":"s"} trabajado${_cb.trabajados===1?"":"s"} en esta evaluación.</p>
    ${_cb.unaSola.length?`<div style="font-size:13px;margin-bottom:6px">⚠️ <strong>Con una sola evidencia</strong> (conviene evaluarlos con más de un instrumento): ${_cb.unaSola.map(cid=>`${critLinkHTML(grupo.catalogoKey,cid)} <span class="sub">(${esc(_cb.porCrit[cid][0].nombre)})</span>`).join(" · ")}</div>`:'<div style="font-size:13px;margin-bottom:6px;color:#1e7a44">✓ Todos los criterios trabajados tienen al menos dos evidencias.</div>'}
    ${_cb.sinNota.length?`<details style="font-size:13px"><summary style="cursor:pointer">⚠️ <strong>${_cb.sinNota.length} alumno${_cb.sinNota.length===1?"":"s"}</strong> sin nota en algún criterio ya corregido</summary>
      <ul style="margin:6px 0 0 18px">${_cb.sinNota.map(x=>`<li>${esc(x.al.nombre)}: ${x.faltan.map(cid=>critLinkHTML(grupo.catalogoKey,cid)).join(", ")}</li>`).join("")}</ul></details>`:'<div style="font-size:13px;color:#1e7a44">✓ Nadie tiene huecos en los criterios ya corregidos.</div>'}`}
    ${!(grupo.fechasTrimestre&&grupo.fechasTrimestre[state.ui.trim]&&grupo.fechasTrimestre[state.ui.trim].fin)?'<p class="sub" style="margin:8px 0 0">Consejo: pon las fechas de cada evaluación en Ajustes y la app te avisará en Inicio tres semanas antes del cierre.</p>':""}
  </div>
  <div class="card">
    <h2>Cobertura curricular y de evaluación</h2>
    <p class="sub">Listado general de las competencias específicas y criterios de evaluación. Comprueba qué actividades evalúan cada criterio a lo largo del curso para garantizar que se abordan íntegramente. Se marcarán con ⚠️ aquellos que solo se hayan evaluado una vez en todo el curso.</p>
  </div>`;

  idx.cat.ces.forEach(ce => {
     const ceActs = new Set();
     ce.criterios.forEach(cr => {
        (actsByCrit[cr.id] || []).forEach(a => ceActs.add(a.nombre));
     });
     const ceStatus = ceActs.size > 0 ? `<span class="pill" style="background:#dcece0;color:#1e5631">Trabajada</span>` : `<span class="pill" style="background:#f3dcdc;color:#912525">Pendiente</span>`;

     html += `<div class="card" style="padding:0;overflow:hidden;margin-bottom:16px">
        <div style="background:var(--paper);padding:12px 16px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:start;gap:12px">
           <div style="font-size:14.5px;font-weight:600">${ce.id} · ${esc(ce.titulo)}</div>
           <div style="flex-shrink:0">${ceStatus}</div>
        </div>
        <div style="padding:12px 16px" class="grid">
     `;

     ce.criterios.forEach((cr, i) => {
        const acts = actsByCrit[cr.id] || [];
        let crStatus = "";
        if (acts.length === 0) crStatus = `<span style="color:var(--danger);font-weight:600;font-size:13px">✗ Pendiente</span>`;
        else if (acts.length === 1) crStatus = `<span style="color:var(--warning);font-weight:600;font-size:13px">⚠️ Eval. 1 sola vez</span>`;
        else crStatus = `<span style="color:var(--accent);font-weight:600;font-size:13px">✓ Evaluado (${acts.length})</span>`;
        
        const borderStyle = i === ce.criterios.length - 1 ? 'border-bottom:none;padding-bottom:0' : 'border-bottom:1px dashed var(--line);padding-bottom:10px';
        
        html += `
           <div style="font-size:13.5px;${borderStyle}">
              <div style="margin-bottom:6px"><strong>${cr.id}</strong> ${esc(cr.texto)}</div>
              <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
                 ${crStatus}
                 ${acts.length > 0 ? `<div style="display:flex;gap:6px;flex-wrap:wrap">${acts.map(a => `<span class="chip" style="padding:3px 8px;font-size:11.5px;background:var(--paper)">${esc(a.nombre)} <span style="opacity:0.6">(${TRIMESTRES[a.trimestre]})</span></span>`).join("")}</div>` : '<span style="color:var(--mut);font-size:12.5px">Ninguna actividad asociada</span>'}
              </div>
           </div>
        `;
     });

     html += `</div></div>`;
  });

  c.innerHTML = html;
}

