/* ============================================================================
   Cuaderno del profesor · Correos de la familia y papelera de alumnado
   js/alumnado/ficha-familia.js
   ============================================================================ */

/* =================================================================
   v7 · CORREOS DE LA FAMILIA EN LA FICHA DEL ALUMNO/A
   Dos contactos por alumno/a (parentesco, nombre y correo). Se guardan,
   como todo lo demás, solo en este dispositivo y en tus copias (para
   sacarlas del dispositivo, mejor la copia cifrada). Un correo mal
   escrito se marca en la ficha y en 🩺 Revisar mis datos.
   ================================================================= */
const FAMILIA_PARENTESCOS=["Madre","Padre","Tutor/a legal","Otro familiar"];
function emailValido(e){ return /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(String(e||"").trim()); }
function familiaCorreos(a){ return (a.familia||[]).map(f=>String(f.email||"").trim()).filter(e=>e&&emailValido(e)); }
function familiaFichaHTML(a){
  if(!Array.isArray(a.familia)||a.familia.length<2) normalizarAlumno(a);
  const filas=(a.familia||[]).map((f,i)=>{
    const e=String(f.email||"").trim(); const mal=e && !emailValido(e);
    return `<div class="grid" style="grid-template-columns:minmax(120px,1fr) minmax(120px,1.2fr);gap:8px;padding:8px 0;${i?"border-top:1px dashed var(--line)":""}">
      <label style="font-size:12px;color:var(--mut)">Parentesco
        <select class="in" style="width:100%;margin-top:3px" onchange="setFamilia('${a.id}',${i},'parentesco',this.value)">
          <option value="" ${!f.parentesco?"selected":""}>—</option>
          ${FAMILIA_PARENTESCOS.map(p=>`<option ${f.parentesco===p?"selected":""}>${p}</option>`).join("")}
        </select>
      </label>
      <label style="font-size:12px;color:var(--mut)">Nombre (opcional)
        <input class="in" style="width:100%;margin-top:3px" autocomplete="off" value="${esc(f.nombre||"")}" onchange="setFamilia('${a.id}',${i},'nombre',this.value)">
      </label>
      <label style="font-size:12px;color:var(--mut);grid-column:1/-1">Correo electrónico
        <span class="flex" style="gap:6px;margin-top:3px;flex-wrap:nowrap">
          <input class="in" type="email" inputmode="email" autocomplete="off" autocapitalize="off" spellcheck="false" style="flex:1;min-width:0${mal?";border-color:#dc2626":""}" placeholder="nombre@ejemplo.com" value="${esc(e)}" onchange="setFamilia('${a.id}',${i},'email',this.value)" aria-invalid="${mal?"true":"false"}">
          ${e&&!mal?`<a class="ghost small" href="mailto:${encodeURIComponent(e).replace(/%40/g,"@")}" style="text-decoration:none;border:1px solid var(--line);display:inline-flex;align-items:center" title="Escribir a ${esc(e)}" aria-label="Escribir a ${esc(e)}">✉️</a>`:""}
        </span>
        ${mal?`<span style="color:#dc2626;font-size:12px">⚠️ Este correo no parece válido. Revísalo.</span>`:""}
      </label>
    </div>`;
  }).join("");
  return `<div style="border-top:1px solid var(--line);padding-top:8px">
    <div style="font-size:12.5px;color:var(--mut);font-weight:600">👪 Contacto de la familia</div>
    ${filas}
    <div style="font-size:11.5px;color:var(--mut)">Datos personales: se guardan solo en este dispositivo y en tus copias de seguridad.</div>
  </div>`;
}
window.setFamilia=(alId,i,campo,valor)=>{
  const g=grupoActual(); const a=g&&g.alumnos.find(x=>x.id===alId); if(!a) return;
  normalizarAlumno(a);
  let v=String(valor||"").trim();
  if(campo==="email"){
    v=v.replace(/^mailto:/i,"").replace(/\s+/g,"").toLowerCase();
    if(v && !emailValido(v)) mostrarToast("⚠️ Ese correo no parece válido: revísalo","info");
  }
  a.familia[i][campo]=v;
  save(); render();
};
window.setObservacion=(id,v)=>{ const g=grupoActual(); const a=g.alumnos.find(x=>x.id===id); if(a){ a.observaciones=v; save(); } };
window.delAlumno=async id=>{ const g=grupoActual(); const a=g.alumnos.find(x=>x.id===id);
  if(a && await confirmar(`¿Eliminar a "${a.nombre}"? Podrás restaurarlo desde la papelera de esta pestaña si te equivocas.`)){
    const notas=g.notas[id]?JSON.parse(JSON.stringify(g.notas[id])):{};
    const notasCuant=g.notasCuant[id]?JSON.parse(JSON.stringify(g.notasCuant[id])):{};
    const rubricScores=g.rubricScores?.[id]?JSON.parse(JSON.stringify(g.rubricScores[id])):{};
    const examComentarios=g.examComentarios?.[id]?JSON.parse(JSON.stringify(g.examComentarios[id])):{};
    g.papelera.alumnos.unshift({alumno:JSON.parse(JSON.stringify(a)),notas,notasCuant,rubricScores,examComentarios,borradoEn:Date.now()});
    if(g.papelera.alumnos.length>10) g.papelera.alumnos.length=10;
    g.alumnos=g.alumnos.filter(x=>x.id!==id);
    delete g.notas[id]; delete g.notasCuant[id];
    if(g.rubricScores) delete g.rubricScores[id];
    if(g.examComentarios) delete g.examComentarios[id];
    if(state.ui.corAlId===id) state.ui.corAlId="";
    save(); render();
  } };
window.restaurarAlumnoPapelera=idx=>{
  const g=grupoActual(); const it=g.papelera.alumnos[idx]; if(!it) return;
  g.alumnos.push(it.alumno);
  if(it.notas && Object.keys(it.notas).length) g.notas[it.alumno.id]=it.notas;
  if(it.notasCuant && Object.keys(it.notasCuant).length) g.notasCuant[it.alumno.id]=it.notasCuant;
  if(it.rubricScores && Object.keys(it.rubricScores).length) g.rubricScores[it.alumno.id]=it.rubricScores;
  if(it.examComentarios && Object.keys(it.examComentarios).length) g.examComentarios[it.alumno.id]=it.examComentarios;
  g.papelera.alumnos.splice(idx,1);
  ordenarAlumnos(g);
  save(); render();
};
window.purgarAlumnoPapelera=idx=>{ const g=grupoActual(); g.papelera.alumnos.splice(idx,1); save(); render(); };

