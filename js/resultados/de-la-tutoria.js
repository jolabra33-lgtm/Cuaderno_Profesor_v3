/* ============================================================================
   Cuaderno del profesor · «📥 De la tutoría» (Resultados del grupo)
   js/resultados/de-la-tutoria.js
   ============================================================================
   Carga la «Ficha del grupo» que el tutor/a genera en el Gestor de Tutoría tras
   la sesión de evaluación (formato en js/comun/formato-tutoria.js). Antes de
   aplicar se ve qué cambia y se elige con casillas:
     - marcar NESE y «Repite curso» a quien lo tenga en Tutoría (nunca se desmarca);
     - las pendientes de cursos anteriores de TU materia;
     - guardar los acuerdos, la propuesta y las medidas para verlos en la ficha de
       cada alumno/a (alumno.deTutoria) y los del grupo en Resultados (grupo.deTutoria).
   Se empareja por el identificador del Cuaderno (si el tutor/a importó la lista
   desde aquí) y si no, por el nombre aunque esté en otro orden o en mayúsculas.
   Se deshace con ↶ como cualquier otro cambio.
*/
function _dtClave(s){ return String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().split(/[^a-z0-9ñ]+/).filter(w=>w.length>1).sort().join(" "); }

function _dtPlan(grupo,o){
  const cat=getCatalogo(grupo.catalogoKey), materia=(cat&&cat.materia)||"";
  const porNombre=new Map(); grupo.alumnos.forEach(a=>{ const k=_dtClave(a.nombre); if(k && !porNombre.has(k)) porNombre.set(k,a); });
  const usados=new Set(), filas=[], sin=[];
  o.alumnos.forEach(x=>{
    let a=grupo.alumnos.find(al=>!usados.has(al.id) && x.idsCuaderno.includes(String(al.id)));
    if(!a){ const p=porNombre.get(_dtClave(x.nombre)); if(p && !usados.has(p.id)) a=p; }
    if(!a){ sin.push(x.nombre); return; }
    usados.add(a.id);
    // Pendientes «Materia (2º ESO)» de esta materia → curso «2» en el Cuaderno.
    const pend=[];
    x.pendientesAnteriores.forEach(s=>{
      const m=/^(.*)\s\(([^()]+)\)\s*$/.exec(s), mat=m?m[1]:s, num=((m?m[2]:"").match(/(\d)/)||[])[1];
      if(num && materia && _dtClave(mat)===_dtClave(materia) && !(a.pendientes||[]).includes(num) && !pend.includes(num)) pend.push(num);
    });
    const medidas=[x.nese?"NESE"+(x.recursosNese.length?" ("+x.recursosNese.join(", ")+")":""):"", x.repetidor?"Repite":"", x.compensatoria?"Compensatoria":"", x.pap?"PAP":"", x.enriquecimiento?"Enriquecimiento curricular":""].filter(Boolean);
    filas.push({a,x,nese:x.nese&&!a.nese,rep:x.repetidor&&!a.repetidor,pend,medidas,info:!!(x.acuerdos||x.propuesta.tipo||medidas.length)});
  });
  return {filas,sin,materia};
}

window.importarDeTutoria=()=>{
  const grupo=grupoActual(); if(!grupo) return;
  let inp=document.getElementById("deTutoriaArchivo");
  if(!inp){ inp=document.createElement("input"); inp.type="file"; inp.accept=".json,application/json"; inp.id="deTutoriaArchivo"; inp.style.display="none"; document.body.appendChild(inp); }
  inp.value="";
  inp.onchange=async()=>{
    const f=inp.files[0]; if(!f) return;
    let o=null; try{ o=ftNormalizarFichaGrupo(JSON.parse(await f.text())); }catch(e){}
    if(!o){ mostrarAviso("Este archivo no es una «Ficha del grupo» del Gestor de Tutoría.\n\nEl tutor/a la genera en Tutoría → 🎓 Sesión de evaluación → «📤 Ficha para el profesorado»."); return; }
    _dtVentana(grupo,o);
  };
  inp.click();
};

function _dtVentana(grupo,o){
  const p=_dtPlan(grupo,o);
  if(!p.filas.length){ mostrarAviso(`No se ha encontrado en «${grupo.nombre}» a nadie de esta ficha (${o.nivel} ${o.grupo}).\n\nComprueba que es el grupo correcto: los nombres tienen que coincidir («Apellidos, Nombre»).`); return; }
  const n={nese:p.filas.filter(f=>f.nese).length, rep:p.filas.filter(f=>f.rep).length, pend:p.filas.filter(f=>f.pend.length).length, info:p.filas.filter(f=>f.info).length};
  const opcion=(id,txt,num)=>`<label style="display:flex;gap:8px;align-items:center;margin-top:6px;font-size:13.5px;${num?"":"opacity:.5"}"><input type="checkbox" id="${id}" ${num?"checked":"disabled"}> ${txt} <strong>(${num})</strong></label>`;
  const div=document.createElement("div");
  div.className="modal-overlay"; div.id="deTutoriaOv";
  div.innerHTML=`<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="dtTit" style="max-width:600px">
    <h2 id="dtTit" style="font-size:16px">📥 Ficha del grupo de la tutoría</h2>
    <p class="sub" style="margin:4px 0 10px">${esc(o.nivel)} ${esc(o.grupo)} · ${esc(FT_NOMBRE_EVAL[o.evaluacion]||"")}${o.fechaSesion?" · "+esc(o.fechaSesion.split("-").reverse().join("/")):""}${o.tutor?" · Tutor/a: "+esc(o.tutor):""} → en tu grupo <strong>${esc(grupo.nombre)}</strong>: ${p.filas.length} alumnos encontrados.</p>
    ${opcion("dtNese","Marcar NESE a quien lo tiene en Tutoría",n.nese)}
    ${opcion("dtRep","Marcar «Repite curso»",n.rep)}
    ${opcion("dtPend",`Pendientes de cursos anteriores de ${esc(p.materia||"tu materia")}`,n.pend)}
    ${opcion("dtInfo","Guardar acuerdos, propuesta y medidas para verlos en la ficha de cada alumno/a",n.info)}
    ${o.acuerdosGrupo||o.valoracion?`<div style="margin-top:12px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font-size:13px">
      ${o.valoracion?`<div><strong>Valoración del grupo:</strong> <span style="white-space:pre-wrap">${esc(o.valoracion)}</span></div>`:""}
      ${o.acuerdosGrupo?`<div style="margin-top:6px"><strong>Acuerdos del grupo:</strong> <span style="white-space:pre-wrap">${esc(o.acuerdosGrupo)}</span></div>`:""}</div>`:""}
    ${p.sin.length?`<p style="font-size:12.5px;color:#b45309;margin-top:10px">⚠️ Sin encontrar en tu grupo: ${p.sin.map(esc).join(", ")}.</p>`:""}
    <p class="sub" style="font-size:12px;margin-top:10px">No se desmarca ni se borra nada de lo que ya tienes. Se deshace con ↶.</p>
    <div class="flex" style="justify-content:flex-end;gap:8px;margin-top:12px">
      <button class="ghost" style="border:1px solid var(--line)" data-acc="no">Cancelar</button>
      <button class="btn" data-acc="si">Aplicar</button>
    </div></div>`;
  document.body.appendChild(div);
  const cerrar=()=>div.remove();
  div.onclick=e=>{ if(e.target===div) cerrar(); };
  div.addEventListener("keydown",e=>{ if(e.key==="Escape"){ e.stopPropagation(); cerrar(); } });
  div.querySelector('[data-acc="no"]').onclick=cerrar;
  div.querySelector('[data-acc="si"]').onclick=()=>{
    const quiere=id=>{ const c=div.querySelector("#"+id); return c && c.checked; };
    const r=_dtAplicar(grupo,o,p,{nese:quiere("dtNese"),rep:quiere("dtRep"),pend:quiere("dtPend"),info:quiere("dtInfo")});
    cerrar(); save(); render();
    mostrarToast(`✓ De la tutoría: ${r} alumno${r===1?"":"s"} actualizado${r===1?"":"s"}`);
  };
  setTimeout(()=>div.querySelector('[data-acc="si"]').focus(),20);
}

function _dtAplicar(grupo,o,p,elige){
  let cambiados=0;
  p.filas.forEach(f=>{
    const a=f.a; let cambio=false;
    if(elige.nese && f.nese){ a.nese=true; cambio=true; }
    if(elige.rep && f.rep){ a.repetidor=true; cambio=true; }
    if(elige.pend && f.pend.length){ a.pendientes=(a.pendientes||[]).concat(f.pend); cambio=true; }
    if(elige.info && f.info){
      a.deTutoria={evaluacion:o.evaluacion,fechaSesion:o.fechaSesion,tutor:o.tutor,recibido:o.generado||new Date().toISOString(),
        propuesta:f.x.propuesta,medidas:f.medidas,acuerdos:f.x.acuerdos};
      cambio=true;
    }
    if(cambio) cambiados++;
  });
  if(elige.info && (o.acuerdosGrupo||o.valoracion)) grupo.deTutoria={evaluacion:o.evaluacion,fechaSesion:o.fechaSesion,tutor:o.tutor,recibido:o.generado||"",acuerdosGrupo:o.acuerdosGrupo,valoracion:o.valoracion};
  return cambiados;
}

/* Bloque «🏫 De la tutoría» en la ficha del alumno/a (js/alumnado/plano-aula.js). */
function deTutoriaFichaHTML(a){
  const d=a&&a.deTutoria; if(!d) return "";
  const prop=[d.propuesta&&d.propuesta.tipo,d.propuesta&&d.propuesta.destino].filter(Boolean).join(" → ");
  return `<div style="border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:13px">
    <div style="font-weight:600;margin-bottom:4px">🏫 De la tutoría · ${esc(FT_NOMBRE_EVAL[d.evaluacion]||"")}${d.fechaSesion?" ("+esc(d.fechaSesion.split("-").reverse().join("/"))+")":""}</div>
    ${(d.medidas||[]).length?`<div>Medidas: ${d.medidas.map(esc).join(" · ")}</div>`:""}
    ${prop?`<div>Propuesta: ${esc(prop)}</div>`:""}
    ${d.acuerdos?`<div style="margin-top:4px;white-space:pre-wrap"><strong>Acuerdos:</strong> ${esc(d.acuerdos)}</div>`:""}
    ${d.tutor?`<div class="sub" style="font-size:11.5px;margin-top:4px">Tutor/a: ${esc(d.tutor)}</div>`:""}
  </div>`;
}
/* Acuerdos del grupo en Resultados. */
function deTutoriaGrupoHTML(grupo){
  const d=grupo&&grupo.deTutoria; if(!d || !(d.acuerdosGrupo||d.valoracion)) return "";
  return `<details class="card" style="margin-bottom:12px"><summary style="cursor:pointer;font-weight:600">🏫 Acuerdos de la sesión de evaluación · ${esc(FT_NOMBRE_EVAL[d.evaluacion]||"")}${d.fechaSesion?" ("+esc(d.fechaSesion.split("-").reverse().join("/"))+")":""}</summary>
    ${d.valoracion?`<p style="white-space:pre-wrap;font-size:13.5px"><strong>Valoración del grupo:</strong> ${esc(d.valoracion)}</p>`:""}
    ${d.acuerdosGrupo?`<p style="white-space:pre-wrap;font-size:13.5px"><strong>Acuerdos:</strong> ${esc(d.acuerdosGrupo)}</p>`:""}
  </details>`;
}
