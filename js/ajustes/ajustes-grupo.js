/* ============================================================================
   Cuaderno del profesor · Ajustes del grupo
   js/ajustes/ajustes-grupo.js
   ============================================================================ */

window.setRedondeoActa=v=>{
  if(!state.ajustesNota) state.ajustesNota={};
  state.ajustesNota.redondeoActa=v; save(); render();
  mostrarToast("✓ Regla de redondeo actualizada en todos los grupos");
};
function renderAjustes(grupo){
  const idx=catIndex(grupo.catalogoKey);
  const c=document.getElementById("tabContent");
  c.innerHTML=`
  <div class="card">
    <h2>Datos del grupo</h2>
    <div class="flex">
      <input class="in" id="gpNombre" value="${esc(grupo.nombre)}" style="min-width:220px">
      <button class="btn" onclick="renombrarGrupo()">Guardar nombre</button>
      <button class="ghost" onclick="duplicarGrupo()">Duplicar estructura (sin alumnado)</button>
      <button class="ghost" onclick="exportarGrupo()">Exportar solo este grupo (.json)</button>
      <button class="btn danger" onclick="borrarGrupo()">Eliminar este grupo</button>
    </div>
  </div>

  <div class="card">
    <h2>Programación de Aula vinculada</h2>
    <p class="sub">Al vincular una Programación, en Actividades eliges de ahí las actividades ya planificadas (con sus criterios) en vez de crearlas sueltas, y el Diario permite enlazar cada entrada a su Situación de Aprendizaje.</p>
    ${(() => {
      const opciones=(state.programaciones||[]).filter(p=>p.catalogoKey===grupo.catalogoKey);
      return `<div class="flex" style="align-items:center">
        <select class="in" id="gpProgramacion" style="min-width:240px" onchange="setProgramacionGrupo(this.value)">
          <option value="">— Ninguna —</option>
          ${opciones.map(p=>`<option value="${p.id}" ${grupo.programacionId===p.id?"selected":""}>${esc(p.nombre)}</option>`).join("")}
        </select>
        ${!opciones.length?`<span class="sub" style="margin:0">No tienes ninguna Programación de ${esc(idx.cat.materia)} · ${esc(idx.cat.curso)} todavía.</span>`:""}
        <button class="ghost" style="border:1px solid var(--line)" onclick="irAProgramacion()">📘 Ir a Programación de Aula</button>
      </div>`;
    })()}
  </div>

  <div class="card">
    <h2>Redondeo de la nota de acta</h2>
    <p class="sub">La calificación oficial (Insuficiente…Sobresaliente, aprobado/suspenso) sale siempre de la <strong>nota de acta</strong>, entera y sin decimales, como en ITACA. Aquí eliges cómo se pasa de la media con decimales a esa nota. Se aplica a <strong>todos tus grupos</strong>. En ESO la nota mínima de acta es 1; en Bachillerato, 0.</p>
    <select class="in" style="min-width:260px;max-width:100%" onchange="setRedondeoActa(this.value)">
      ${REDONDEO_MODOS.map(m=>`<option value="${m.id}" ${modoRedondeoActa()===m.id?"selected":""}>${esc(m.label)}</option>`).join("")}
    </select>
  </div>

  <div class="card">
    <h2>Ponderación de la nota final entre evaluaciones</h2>
    <p class="sub">Pesos relativos entre 1ª, 2ª y 3ª evaluación para calcular la nota final. En blanco = reparto equitativo entre las evaluaciones que ya tengan datos. Súbelo, por ejemplo, si la 3ª evaluación debe contar más que las anteriores.</p>
    <div class="flex">
      ${[0,1,2].map(t=>`
        <label style="font-size:13.5px;color:var(--mut);display:flex;flex-direction:column;gap:4px">${TRIMESTRES[t]}
          <input class="in" style="width:100px" type="number" min="0" placeholder="auto" value="${grupo.pesosTrim[t]??''}" oninput="setPesoTrim(${t},this.value)"></label>`).join("")}
    </div>
  </div>

  <div class="card">
    <h2>Fechas de cada evaluación</h2>
    <p class="sub">Marca cuándo empieza y termina cada trimestre. Se usa para poder filtrar la Asistencia y la Convivencia por evaluación en la pestaña Resumen.</p>
    <style>@media(max-width:460px){.ajustesFechasGrid{grid-template-columns:1fr!important}}</style>
    <div class="ajustesFechasGrid" style="display:grid;grid-template-columns:repeat(3,minmax(120px,1fr));gap:12px">
      ${[0,1,2].map(t=>`
        <div style="display:flex;flex-direction:column;gap:4px;min-width:0">
          <span style="font-size:13px;font-weight:600">${TRIMESTRES[t]}</span>
          <label style="font-size:12px;color:var(--mut)">Inicio
            <input type="date" class="in" style="width:100%;margin-top:2px" value="${grupo.fechasTrimestre[t].inicio||''}" onchange="setFechaTrimestre(${t},'inicio',this.value)">
          </label>
          <label style="font-size:12px;color:var(--mut)">Fin
            <input type="date" class="in" style="width:100%;margin-top:2px" value="${grupo.fechasTrimestre[t].fin||''}" onchange="setFechaTrimestre(${t},'fin',this.value)">
          </label>
        </div>`).join("")}
    </div>
  </div>

  <div class="card">
    <h2>Ponderación de la nota cuantitativa</h2>
    <p class="sub">Bloques de la propuesta pedagógica de ${esc(idx.cat.materia)}. Deben sumar 100.</p>
    <p id="sumaBloquesAviso" style="font-size:13px;margin:0 0 8px">${sumaBloquesHTML(grupo)}</p>
    <div class="flex">
      ${grupo.bloques.map((b,i)=>`
        <label style="font-size:13.5px;color:var(--mut);display:flex;flex-direction:column;gap:4px;max-width:220px">${esc(b.label)} (%)
          <input class="in" type="number" value="${b.peso}" oninput="setBloqueW(${i},this.value)"></label>`).join("")}
    </div>
  </div>

  <div class="card">
    <h2>Cortes de las escalas cualitativas</h2>
    <p class="sub">Porcentaje mínimo de cada nivel. Por debajo de “En proceso” → Necesita mejorar.</p>
    <div class="flex">
      ${[["excelente","Excelente ≥"],["adecuado","Adecuado ≥"],["enProceso","En proceso ≥"]].map(([k,l])=>`
        <label style="font-size:13.5px;color:var(--mut);display:flex;flex-direction:column;gap:4px">${l}
          <input class="in" style="width:100px" type="number" value="${grupo.umbrales[k]}" oninput="setUmbral('${k}',this.value)"></label>`).join("")}
    </div>
  </div>

  <div class="card">
    <h2>Peso de cada competencia específica dentro de su competencia clave</h2>
    <p class="sub">Pesos relativos: se normalizan solos. En blanco = reparto equitativo.</p>
    ${Object.keys(COMP_CLAVE).filter(cc=>idx.cat.ces.some(ce=>ce.cc.includes(cc))).map(cc=>`
      <div style="margin-bottom:12px">
        <div style="font-size:13.5px;font-weight:500;margin-bottom:6px">${cc} · ${COMP_CLAVE[cc]}</div>
        <div class="flex">${idx.cat.ces.filter(ce=>ce.cc.includes(cc)).map(ce=>`
          <label style="font-size:12.5px;color:var(--mut);display:flex;align-items:center;gap:5px">${ce.id}
            <input class="in miniw" type="number" placeholder="${pesoCEenCC(grupo,ce.id,cc).toFixed(0)}" value="${grupo.pesos.ceCc[ce.id+'|'+cc]??''}" oninput="setCeCc('${ce.id}','${cc}',this.value)"></label>`).join("")}</div>
      </div>`).join("")}
  </div>

  <div class="card">
    <h2>Peso de cada criterio dentro de su competencia específica</h2>
    <p class="sub">En blanco = reparto equitativo entre los criterios de cada CE.</p>
    ${idx.cat.ces.map(ce=>`
      <div style="margin-bottom:12px">
        <div style="font-size:13.5px;font-weight:500;margin-bottom:6px">${ce.id} · ${esc(ce.titulo)}</div>
        <div class="flex">${ce.criterios.map(cr=>`
          <label style="font-size:12.5px;color:var(--mut);display:flex;align-items:center;gap:5px">${cr.id}
            <input class="in miniw" type="number" placeholder="${pesoCriterio(grupo,cr.id).toFixed(0)}" value="${grupo.pesos.crit[cr.id]??''}" oninput="setCrit('${cr.id}',this.value)"></label>`).join("")}</div>
      </div>`).join("")}
  </div>`;
  document.getElementById("gpNombre").addEventListener("keydown",e=>{ if(e.key==="Enter") renombrarGrupo(); });
}
window.renombrarGrupo=()=>{ const grupo=grupoActual(); const v=document.getElementById("gpNombre").value.trim(); if(v){ grupo.nombre=v; save(); renderShell(); } };
window.duplicarGrupo=async ()=>{
  const grupo=grupoActual();
  const nombre=await pedirTexto("Nombre para el grupo nuevo:", grupo.nombre+" (copia)");
  if(!nombre||!nombre.trim()) return;
  const nuevo=defGrupo(nombre.trim(),grupo.catalogoKey);
  nuevo.pesos=JSON.parse(JSON.stringify(grupo.pesos));
  nuevo.umbrales={...grupo.umbrales};
  nuevo.pesosTrim={...grupo.pesosTrim};
  nuevo.bloques=grupo.bloques.map(b=>({...b}));
  nuevo.actividades=grupo.actividades.map(a=>{
    const copia={...a,id:uid(),criterios:a.criterios.map(l=>({...l}))};
    if(a.rubrica) copia.rubrica=JSON.parse(JSON.stringify(a.rubrica));
    // El grupo nuevo no tiene alumnado: las rúbricas adaptadas se copian sin alumnos asignados.
    if(a.variantes) copia.variantes=JSON.parse(JSON.stringify(a.variantes)).map(v=>({...v,alumnos:[]}));
    return copia;
  });
  state.grupos.push(nuevo);
  state.ui.grupoId=nuevo.id; state.ui.tab="alumnos";
  save(); render();
  mostrarAviso(`Grupo "${nuevo.nombre}" creado con la misma configuración y ${nuevo.actividades.length} actividad${nuevo.actividades.length===1?"":"es"}. Añade ahora su propio alumnado.`);
};
window.exportarGrupo=()=>{
  const grupo=grupoActual();
  const blob=new Blob([JSON.stringify({grupos:[grupo]},null,2)],{type:"application/json"});
  const u=URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=u; a.download="grupo-"+grupo.nombre.replace(/[^a-z0-9]+/gi,"-").toLowerCase()+"-"+new Date().toISOString().slice(0,10)+".json"; a.click(); URL.revokeObjectURL(u);
};
window.importarGrupoArchivo=inp=>{
  const file=inp.files[0]; if(!file) return;
  const rd=new FileReader();
  rd.onload=()=>{
    let datos;
    try{ datos=JSON.parse(rd.result); }
    catch(e){ mostrarAviso("El archivo no es un JSON válido."); inp.value=""; return; }
    const original = datos && Array.isArray(datos.grupos) && datos.grupos[0] ? datos.grupos[0] : null;
    if(!original){ mostrarAviso("Este archivo no parece ser un grupo exportado desde esta aplicación."); inp.value=""; return; }
    if(!CATALOGOS[original.catalogoKey] && !(state.catalogosPersonalizados||{})[original.catalogoKey]){
      mostrarAviso("Este grupo es de una materia/curso que no existe en tu catálogo — no se puede importar.");
      inp.value=""; return;
    }
    // Se importa como un grupo NUEVO e independiente: id propio (los de sus
    // alumnos se mantienen, ya que solo se referencian dentro de este mismo
    // grupo). Si venía vinculado a una Programación de Aula que no tienes
    // (las Programaciones no viajan con el grupo), se desvincula sin más.
    const copia=JSON.parse(JSON.stringify(original));
    copia.id=uid();
    copia.nombre=original.nombre+" (importado)";
    if(copia.programacionId && !progPorId(copia.programacionId)) copia.programacionId="";
    normalizarGrupo(copia);
    (copia.alumnos||[]).forEach(normalizarAlumno);
    ordenarAlumnos(copia);
    if(!Array.isArray(state.grupos)) state.grupos=[];
    state.grupos.push(copia);
    save(); render();
    mostrarToast("✓ Grupo importado — añadido a tu lista, sin tocar los que ya tenías");
    inp.value="";
  };
  rd.readAsText(file);
};
window.borrarGrupoId=async id=>{
  const g=state.grupos.find(x=>x.id===id); if(!g) return;
  if(await confirmar(`¿Eliminar "${g.nombre}" y todos sus datos (alumnado, actividades, notas)? Esta acción no se puede deshacer.`)){
    state.grupos=state.grupos.filter(x=>x.id!==id);
    if(state.ui.grupoId===id){ state.ui.grupoId=null; state.ui.corExamId=""; state.ui.corAlId=""; state.ui.corTab="lista"; }
    if(state.ui.agFiltroGrupo===id) state.ui.agFiltroGrupo="";
    (state.eventos||[]).forEach(e=>{ e.grupoIds=agGrupoIdsDeEvento(e).filter(gid=>gid!==id); if(e.grupoId===id) e.grupoId=""; });
    (state.reuniones||[]).forEach(r=>{ if(r.grupoId===id){ r.grupoId=""; r.alumnoId=""; } });
    save(); render();
  }
};
window.borrarGrupo=()=>{ const grupo=grupoActual(); if(grupo) borrarGrupoId(grupo.id); };
window.setBloqueW=(i,v)=>{ const grupo=grupoActual(); grupo.bloques[i].peso=Math.max(0,Number(String(v).replace(",","."))||0); save();
  const el=document.getElementById("sumaBloquesAviso"); if(el) el.innerHTML=sumaBloquesHTML(grupo); };
/* v4: suma de los bloques en vivo. Si no suman 100, la nota se sigue
   calculando (en proporción), pero se avisa para que sea intencionado. */
function sumaBloquesHTML(grupo){
  const t=Math.round(grupo.bloques.reduce((n,b)=>n+(Number(b.peso)||0),0)*100)/100;
  if(Math.abs(t-100)<0.01) return `<span style="color:#1e7a44;font-weight:600">✓ Suman 100 %</span>`;
  return `<span style="color:#b45309;font-weight:600">⚠️ Suman ${String(t).replace(".",",")} %.</span> <span class="sub">La nota se calcula igualmente en proporción (cada bloque pesa su parte sobre ${String(t).replace(".",",")}), pero lo normal es que sumen 100.</span>`;
}
window.setUmbral=(k,v)=>{ grupoActual().umbrales[k]=Number(v)||0; save(); };
window.setPesoTrim=(t,v)=>{ const g=grupoActual(); if(!g.pesosTrim) g.pesosTrim={}; g.pesosTrim[t]=v; save(); };
window.setFechaTrimestre=(t,campo,v)=>{ const g=grupoActual(); if(!g.fechasTrimestre) g.fechasTrimestre=[{inicio:"",fin:""},{inicio:"",fin:""},{inicio:"",fin:""}]; g.fechasTrimestre[t][campo]=v; save(); };
window.setProgramacionGrupo=(id)=>{ const g=grupoActual(); g.programacionId=id; save(); render(); };
window.irAProgramacion=()=>{ state.ui.appMode="programacion"; state.ui.progTab="lista"; save(); render(); };
window.setCeCc=(ce,cc,v)=>{ grupoActual().pesos.ceCc[ce+"|"+cc]=v; save(); };
window.setCrit=(id,v)=>{ grupoActual().pesos.crit[id]=v; save(); };

