/* ============================================================================
   Cuaderno del profesor · Informe final de curso
   js/informes/informe-final.js
   ============================================================================ */

/* -----------------------------------------------------------------
   Informe final de curso: resume las 3 evaluaciones trimestrales
   (nota y comentario de cada una), la nota final ya ponderada, y la
   media anual de adquisición de cada competencia clave/específica.
   Es el informe pensado para entregar a las familias a fin de curso.
   ----------------------------------------------------------------- */
function informeFinalAlumnoBodyHTML(grupo,al,opts){
  opts=opts||{};
  const cat=getCatalogo(grupo.catalogoKey); const idx=catIndex(grupo.catalogoKey);
  const nf=notaFinal(grupo,al.id);
  const ccF=Object.keys(COMP_CLAVE).filter(cc=>idx.cat.ces.some(ce=>ce.cc.includes(cc))).map(cc=>({cc,p:scoreCCAnual(grupo,al.id,cc)})).filter(x=>x.p!=null);
  const ceF=idx.cat.ces.map(ce=>({ce,p:scoreCEAnual(grupo,al.id,ce.id)})).filter(x=>x.p!=null);
  const filas3=TRIMESTRES.map((t,i)=>{const v=notaTrimestre(grupo,al.id,i); const com=(al.comentariosEval&&al.comentariosEval[i])||"";
    return `<tr><td>${t}</td><td>${fmt(v)}</td><td>${pillCuant(v)}</td><td>${com?esc(com):"—"}</td></tr>`;}).join("");

  let htmlActsPDF = `<h2>Desglose de actividades (curso completo)</h2>`;
  const trimsConActs=[0,1,2].filter(t=>grupo.actividades.some(a=>a.trimestre===t));
  if(!trimsConActs.length){
    htmlActsPDF += '<p>Sin actividades registradas este curso.</p>';
  } else {
    trimsConActs.forEach(t=>{
      const actsT=grupo.actividades.filter(a=>a.trimestre===t);
      htmlActsPDF += `<h3 style="font-size:13px;color:#666;margin:14px 0 4px">${TRIMESTRES[t]}</h3>`;
      const sdaMap={};
      actsT.forEach(a=>{ const s=a.sda||'Sin SdA'; if(!sdaMap[s]) sdaMap[s]=[]; sdaMap[s].push(a); });
      Object.keys(sdaMap).forEach(sda=>{
        if(sda!=='Sin SdA') htmlActsPDF += `<div style="font-size:12px;color:#888;margin:6px 0 2px">${esc(sda)}</div>`;
        htmlActsPDF += '<table><thead><tr><th>Actividad</th><th>Tipo</th><th>Nota (0-10)</th></tr></thead><tbody>';
        sdaMap[sda].forEach(a=>{
          const val=notaActividad(grupo,al.id,a);
          const valDisplay=val==null?"—":fmt(val);
          htmlActsPDF += `<tr><td>${esc(a.nombre)}</td><td>${esc(a.tipo)}</td><td><strong>${valDisplay}</strong></td></tr>`;
        });
        htmlActsPDF += '</tbody></table>';
      });
    });
  }

  const critTrabajados=new Set();
  [0,1,2].forEach(t=>grupo.actividades.filter(a=>a.trimestre===t).forEach(a=>a.criterios.forEach(c=>critTrabajados.add(c.critId))));
  const critSinNota=[];
  critTrabajados.forEach(cid=>{ const tieneNota=[0,1,2].some(t=>conTrim(t,()=>scoreCriterio(grupo,al.id,cid))!=null); if(!tieneNota) critSinNota.push(cid); });
  const htmlAlertaAsimetria = critSinNota.length>0
    ? `<div class="alert">⚠️ <strong>Atención:</strong> El alumno no tiene ninguna calificación en todo el curso en los siguientes criterios trabajados por el grupo: ${critSinNota.join(', ')}.</div>`
    : '';

  const asistCntFinal=asistContarPeriodo(grupo,al.id,"2000-01-01","2099-12-31");
  const htmlAsistenciaFinal=`<h2>Asistencia del curso</h2>
    <table><tbody>
      <tr><th style="width:200px">Faltas justificadas</th><td>${asistCntFinal.falta_justificada}</td></tr>
      <tr><th>Faltas no justificadas</th><td>${asistCntFinal.falta_no_justificada}</td></tr>
      <tr><th>Retrasos</th><td>${asistCntFinal.retraso}</td></tr>
    </tbody></table>`;

  return `
    <div${opts.pageBreak?' style="page-break-before:always;break-before:page"':''}>
    <h1>Informe final de curso</h1>
    <div class="meta">${esc(cat.materia)} · ${esc(cat.curso)} · Grupo ${esc(grupo.nombre)} · Curso completo · Generado el ${new Date().toLocaleDateString("es-ES")}</div>
    <h2>Alumno/a: ${esc(al.nombre)}</h2>
    ${htmlAlertaAsimetria}
    <table><thead><tr><th>Periodo</th><th>Nota</th><th>Calificación</th><th>Comentario a la calificación</th></tr></thead><tbody>${filas3}<tr><td><strong>Nota final</strong></td><td><strong>${fmt(nf)}</strong></td><td>${pillCuant(nf)}</td><td></td></tr></tbody></table>
    <p style="font-size:12px;color:#666;margin-top:-2px">La nota final es la media ponderada de las evaluaciones con datos disponibles.</p>
    ${htmlAsistenciaFinal}
    ${htmlActsPDF}
    <h2>Competencias clave trabajadas (media del curso)</h2>
    ${ccF.length?`<table><thead><tr><th>Competencia clave</th><th>Adquisición</th><th>Actividades y exámenes utilizados</th></tr></thead><tbody>
      ${ccF.map(x=>`<tr><td>${x.cc} · ${COMP_CLAVE[x.cc]}</td><td>${pillPlain(grupo,x.p)}</td><td style="font-size:12px;color:#555">${esc(abrevActs(actividadesDeCCAnual(grupo,al.id,x.cc),4))}</td></tr>`).join("")}</tbody></table>`:"<p>Sin datos en todo el curso.</p>"}
    <h2>Competencias específicas trabajadas (media del curso)</h2>
    ${ceF.length?`<table><thead><tr><th>Competencia específica</th><th>Adquisición</th><th>Actividades y exámenes utilizados</th></tr></thead><tbody>
      ${ceF.map(x=>`<tr><td>${x.ce.id} · ${esc(x.ce.titulo)}</td><td>${pillPlain(grupo,x.p)}</td><td style="font-size:12px;color:#555">${esc(abrevActs(actividadesDeCEAnual(grupo,al.id,x.ce.id),4))}</td></tr>`).join("")}</tbody></table>`:"<p>Sin datos en todo el curso.</p>"}
    </div>
  `;
}
window.exportarInformeFinalAlumno=alId=>{
  const grupo=grupoActual();
  const al=grupo.alumnos.find(a=>a.id===alId);
  const cat=getCatalogo(grupo.catalogoKey);
  const portada=generarPortadaHTML(`Informe final de curso — ${al.nombre}`,
    [`${esc(cat.materia)} · ${esc(cat.curso)} · Grupo ${esc(grupo.nombre)}`,
     `Curso escolar: <strong>${esc(cursoEscolarEfectivo(null))}</strong>`,
     profesorNombreEfectivo(null)?`Elaborado por: <strong>${esc(profesorNombreEfectivo(null))}</strong>`:""], []);
  abrirVentanaInforme(`Informe final · ${al.nombre}`, informeFinalAlumnoBodyHTML(grupo,al), {portada});
};
window.exportarInformesFinalesTodos=()=>{
  const grupo=grupoActual();
  if(!grupo.alumnos.length){ mostrarAviso("Este grupo todavía no tiene alumnado."); return; }
  const cat=getCatalogo(grupo.catalogoKey);
  const partes=grupo.alumnos.map((al,i)=>informeFinalAlumnoBodyHTML(grupo,al,{pageBreak:i>0}));
  const portada=generarPortadaHTML(`Informes finales de curso — ${grupo.nombre}`,
    [`${esc(cat.materia)} · ${esc(cat.curso)}`,
     `Curso escolar: <strong>${esc(cursoEscolarEfectivo(null))}</strong>`,
     profesorNombreEfectivo(null)?`Elaborado por: <strong>${esc(profesorNombreEfectivo(null))}</strong>`:""],
    grupo.alumnos.map(al=>al.nombre));
  abrirVentanaInforme(`Informes finales de curso · ${grupo.nombre}`, partes.join(""), {portada});
};

window.exportarInformeGrupo=(modo)=>{
  // modo: 0 | 1 | 2 (una evaluación concreta) o "final" (informe de final de curso, el más completo)
  if(modo===undefined||modo===null||modo==="") modo=state.ui.trim;
  const esFinal = modo==="final";
  const trim = esFinal? null : Number(modo);
  const grupo=grupoActual(); const cat=getCatalogo(grupo.catalogoKey); const idx=catIndex(grupo.catalogoKey);
  function media(arr){ return arr.length? arr.reduce((a,b)=>a+b,0)/arr.length : null; }

  let tituloPeriodo, filasAl, cabNotas, resumenHTML, ceFilas, ccFilas;
  const ccKeys=Object.keys(COMP_CLAVE).filter(cc=>idx.cat.ces.some(ce=>ce.cc.includes(cc)));

  if(esFinal){
    tituloPeriodo="Evaluación final · curso completo";
    cabNotas=`<th>Alumno/a</th><th>1ª ev.</th><th>2ª ev.</th><th>3ª ev.</th><th>Nota final</th><th>Calificación</th>`;
    filasAl=grupo.alumnos.map(a=>{
      const t0=notaTrimestre(grupo,a.id,0),t1=notaTrimestre(grupo,a.id,1),t2=notaTrimestre(grupo,a.id,2),f=notaFinal(grupo,a.id);
      return `<tr><td>${esc(a.nombre)}</td><td>${fmt(t0)}</td><td>${fmt(t1)}</td><td>${fmt(t2)}</td><td><strong>${fmt(f)}</strong></td><td>${pillCuant(f)}</td></tr>`;}).join("");
    resumenHTML=resumenInformeFinalHTML(grupo);
    // Competencias del curso completo (media anual ponderada)
    ceFilas=idx.cat.ces.map(ce=>{
      const vals=grupo.alumnos.map(a=>scoreCEAnual(grupo,a.id,ce.id)).filter(x=>x!=null);
      const m=media(vals); return `<tr><td>${ce.id} · ${esc(ce.titulo)}</td><td>${pillPlain(grupo,m)}</td><td>${vals.length}/${grupo.alumnos.length}</td></tr>`;
    }).join("");
    ccFilas=ccKeys.map(cc=>{
      const vals=grupo.alumnos.map(a=>scoreCCAnual(grupo,a.id,cc)).filter(x=>x!=null);
      const m=media(vals); return `<tr><td>${cc} · ${COMP_CLAVE[cc]}</td><td>${pillPlain(grupo,m)}</td><td>${vals.length}/${grupo.alumnos.length}</td></tr>`;
    }).join("");
  }else{
    tituloPeriodo=TRIMESTRES[trim];
    cabNotas=`<th>Alumno/a</th><th>Nota · ${TRIMESTRES[trim]}</th><th>Calificación</th>`;
    filasAl=grupo.alumnos.map(a=>{
      const t=notaTrimestre(grupo,a.id,trim);
      return `<tr><td>${esc(a.nombre)}</td><td><strong>${fmt(t)}</strong></td><td>${pillCuant(t)}</td></tr>`;}).join("");
    resumenHTML=resumenInformeTrimHTML(grupo,trim);
    // Competencias calculadas SOBRE esa evaluación concreta (conTrim garantiza el
    // trimestre correcto aunque el selector Periodo esté en otro distinto)
    ceFilas=idx.cat.ces.map(ce=>{
      const vals=grupo.alumnos.map(a=>conTrim(trim,()=>scoreCE(grupo,a.id,ce.id))).filter(x=>x!=null);
      const m=media(vals); return `<tr><td>${ce.id} · ${esc(ce.titulo)}</td><td>${pillPlain(grupo,m)}</td><td>${vals.length}/${grupo.alumnos.length}</td></tr>`;
    }).join("");
    ccFilas=ccKeys.map(cc=>{
      const vals=grupo.alumnos.map(a=>conTrim(trim,()=>scoreCC(grupo,a.id,cc))).filter(x=>x!=null);
      const m=media(vals); return `<tr><td>${cc} · ${COMP_CLAVE[cc]}</td><td>${pillPlain(grupo,m)}</td><td>${vals.length}/${grupo.alumnos.length}</td></tr>`;
    }).join("");
  }

  let asistConvTitulo="Asistencia y convivencia (curso completo hasta la fecha)", asistConvDesde=null, asistConvHasta=null;
  if(!esFinal){
    const ft=grupo.fechasTrimestre&&grupo.fechasTrimestre[trim];
    if(ft&&ft.inicio&&ft.fin){ asistConvDesde=ft.inicio; asistConvHasta=ft.fin; asistConvTitulo=`Asistencia y convivencia (${TRIMESTRES[trim].toLowerCase()}: ${fmt2(ft.inicio)} – ${fmt2(ft.fin)})`; }
    else{ asistConvTitulo=`Asistencia y convivencia (curso completo — sin fechas indicadas para ${TRIMESTRES[trim].toLowerCase()} en Ajustes)`; }
  }
  const body=`
    <h1>Informe de grupo${esFinal?" · final de curso":""}</h1>
    <div class="meta">${esc(cat.materia)} · ${esc(cat.curso)} · Grupo ${esc(grupo.nombre)} · ${tituloPeriodo} · Generado el ${new Date().toLocaleDateString("es-ES")}</div>
    ${resumenHTML}
    <h2>Calificación cuantitativa</h2>
    <table><thead><tr>${cabNotas}</tr></thead><tbody>${filasAl}</tbody></table>
    <h2>Media del grupo · competencias clave</h2>
    <table><thead><tr><th>Competencia clave</th><th>Adquisición media</th><th>Alumnado con datos</th></tr></thead><tbody>${ccFilas}</tbody></table>
    <h2>Media del grupo · competencias específicas</h2>
    <table><thead><tr><th>Competencia específica</th><th>Adquisición media</th><th>Alumnado con datos</th></tr></thead><tbody>${ceFilas}</tbody></table>
    <h2>${asistConvTitulo}</h2>
    ${resumenAsistConvGrupoHTML(grupo,asistConvDesde,asistConvHasta)}
  `;
  const portada=generarPortadaHTML(`Informe de grupo — ${grupo.nombre}`,
    [`${esc(cat.materia)} · ${esc(cat.curso)}`,
     `<strong>${esc(tituloPeriodo)}</strong>`,
     `Curso escolar: <strong>${esc(cursoEscolarEfectivo(null))}</strong>`,
     profesorNombreEfectivo(null)?`Elaborado por: <strong>${esc(profesorNombreEfectivo(null))}</strong>`:""],
    ["Calificación cuantitativa","Media del grupo · competencias clave","Media del grupo · competencias específicas",asistConvTitulo]);
  abrirVentanaInforme(`Informe de grupo · ${grupo.nombre} · ${tituloPeriodo}`,body,{portada});
};

