/* ============================================================================
   Cuaderno del profesor · Alertas automáticas y pantalla de Inicio
   js/inicio/alertas-home.js
   ============================================================================ */

/* =================================================================
   Alertas automáticas de Inicio — un vistazo rápido a los últimos 30
   días de todos los grupos, sin tener que entrar módulo por módulo.
   Reutiliza exactamente los mismos cálculos que ya usan Asistencia,
   Convivencia y Refuerzo/Repetición.
   ================================================================= */
function homeAlertasCalcular(){
  const hasta=agHoyStr();
  const d=new Date(); d.setDate(d.getDate()-30);
  const desde=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  let totalFaltasNoJust=0, alumnosConFaltas=new Set();
  let totalConv=0, alumnosConConv=new Set();
  (state.grupos||[]).forEach(g=>{
    (g.alumnos||[]).forEach(al=>{
      const asis=asistContarPeriodo(g,al.id,desde,hasta);
      if(asis.falta_no_justificada>0){ totalFaltasNoJust+=asis.falta_no_justificada; alumnosConFaltas.add(g.id+"|"+al.id); }
      const conv=convContarTipos(g,al.id,desde,hasta);
      const totalConvAl=conv.ac+conv.rc+conv.pa;
      if(totalConvAl>0){ totalConv+=totalConvAl; alumnosConConv.add(g.id+"|"+al.id); }
    });
  });
  const planesActivos=(state.planesRefuerzo||[]).filter(p=>p.estado==="activo").length+(state.planesRepeticion||[]).filter(p=>p.estado==="activo").length;
  return {
    alumnosConFaltas:alumnosConFaltas.size, totalFaltasNoJust,
    alumnosConConv:alumnosConConv.size, totalConv,
    planesActivos
  };
}
function homeAlertasHTML(){
  if(!(state.grupos||[]).length) return "";
  const a=homeAlertasCalcular();
  const hayAlgo=a.alumnosConFaltas>0||a.alumnosConConv>0;
  if(!hayAlgo && a.planesActivos===0) return "";
  return `<div class="card" style="border-color:${hayAlgo?"#dc2626":"var(--border-soft)"};margin-bottom:14px">
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <strong style="font-size:14px">${hayAlgo?"⚠️":"✅"} Últimos 30 días, todos los grupos</strong>
      <span class="sub" style="margin:0">de un vistazo, sin entrar módulo por módulo</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin-top:10px">
      ${a.alumnosConFaltas>0?`<div style="cursor:pointer" onclick="irModo('competencial')">
        <div style="font-size:19px;font-weight:700;color:#dc2626">${a.alumnosConFaltas}</div>
        <div style="font-size:12px;color:var(--mut)">alumno${a.alumnosConFaltas===1?"":"s"} con faltas no justificadas (${a.totalFaltasNoJust} en total)</div>
      </div>`:`<div><div style="font-size:19px;font-weight:700;color:var(--green,#16a34a)">0</div><div style="font-size:12px;color:var(--mut)">faltas no justificadas</div></div>`}
      ${a.alumnosConConv>0?`<div style="cursor:pointer" onclick="irModo('competencial')">
        <div style="font-size:19px;font-weight:700;color:#dc2626">${a.alumnosConConv}</div>
        <div style="font-size:12px;color:var(--mut)">alumno${a.alumnosConConv===1?"":"s"} con convivencia registrada (${a.totalConv} en total)</div>
      </div>`:`<div><div style="font-size:19px;font-weight:700;color:var(--green,#16a34a)">0</div><div style="font-size:12px;color:var(--mut)">incidencias de convivencia</div></div>`}
      <div><div style="font-size:19px;font-weight:700">${a.planesActivos}</div><div style="font-size:12px;color:var(--mut)">plan${a.planesActivos===1?"":"es"} de Refuerzo/Repetición activo${a.planesActivos===1?"":"s"}</div></div>
    </div>
  </div>`;
}

function renderHome(){
  const app=document.getElementById("app");
  const nGrupos=state.grupos.length;
  const nAlumnos=state.grupos.reduce((s,g)=>s+g.alumnos.length,0);
  const nExamenes=state.grupos.reduce((s,g)=>s+g.actividades.filter(a=>a.esExamen&&a.rubrica).length,0);
  const nProgramaciones=(state.programaciones||[]).length;
  const nReuniones=(state.reuniones||[]).length;
  const nRefuerzoActivos=(state.planesRefuerzo||[]).filter(p=>p.estado==="activo").length;
  const nRepeticionActivos=(state.planesRepeticion||[]).filter(p=>p.estado==="activo").length;
  const nNeseTotal=state.grupos.reduce((s,g)=>s+g.alumnos.filter(a=>a.nese).length,0);
  const nNesePendientes=state.grupos.reduce((s,g)=>s+g.alumnos.filter(a=>a.nese && !nePlanDe(a.id)).length,0);
  app.innerHTML=`
  <div class="hero">
    <div class="hero-eyebrow">${esc(materiasEtiqueta())}</div>
    <h1 class="hero-title">Inicio</h1>
    <p class="hero-tag" style="max-width:none">Tu cuaderno de profesor completo: programación, evaluación por competencias y corrección con rúbricas, más el seguimiento diario del alumnado — asistencia, convivencia, familias, refuerzo, repetición y NESE. Todo comparte el mismo alumnado y las mismas notas, y todo sale en informes listos para imprimir.</p>
    <div class="flex" style="gap:10px;margin-top:12px;flex-wrap:wrap">
      <label style="font-size:12px;color:rgba(255,255,255,.75);font-weight:500">Curso escolar
        <input class="in" style="display:block;margin-top:3px;width:130px;background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.25);color:#fff" placeholder="2026-2027" value="${esc(state.cursoEscolarGlobal||"")}" onchange="setDatoGlobal('cursoEscolarGlobal',this.value)">
      </label>
      <label style="font-size:12px;color:rgba(255,255,255,.75);font-weight:500">Profesor/a
        <input class="in" style="display:block;margin-top:3px;width:220px;background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.25);color:#fff" placeholder="Nombre y apellidos" value="${esc(state.profesorNombreGlobal||"")}" onchange="setDatoGlobal('profesorNombreGlobal',this.value)">
      </label>
      <label style="font-size:12px;color:rgba(255,255,255,.75);font-weight:500">Centro
        <input class="in" style="display:block;margin-top:3px;width:240px;background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.25);color:#fff" placeholder="Nombre del centro" value="${esc(state.centroNombre||"")}" onchange="setDatoGlobal('centroNombre',this.value)">
      </label>
      <label style="font-size:12px;color:rgba(255,255,255,.75);font-weight:500">Cód. centro
        <input class="in" style="display:block;margin-top:3px;width:110px;background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.25);color:#fff" placeholder="46001234" value="${esc(state.centroCodigo||"")}" onchange="setDatoGlobal('centroCodigo',this.value)">
      </label>
    </div>
    <p class="hero-tag" style="margin-top:8px;font-size:12px;max-width:none;opacity:.75">Estos datos se usan en las portadas de todos los documentos imprimibles. Cada Programación de Aula puede tener su propio curso escolar y profesor/a si lo necesitas; si los deja en blanco, usa estos.</p>
    <div class="flex" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button class="ghost small" style="color:#fff;border:1px solid rgba(255,255,255,.35)" onclick="abrirDiagnostico()">🩺 Revisar mis datos</button><button class="ghost small" style="color:#fff;border:1px solid rgba(255,255,255,.35)" onclick="abrirCopias()">🛟 Copias de seguridad</button></div>
    <p class="hero-tag" style="margin-top:6px;font-size:12.5px;max-width:none;opacity:.85">📶 Añádela a la pantalla de inicio del iPad (Safari → compartir → "Añadir a inicio"). Tras abrirla una vez con conexión, sigue funcionando sin wifi.</p>
  </div>
  ${novedadesHTML()}
  ${hoyTarjetaHTML()}
  ${coberturaAvisosInicioHTML()}
  ${homeAlertasHTML()}

  ${homeSeccionHeaderHTML("evaluacion","Evaluación y corrección")}
  ${homeSecciones.evaluacion?`<div class="gcard-grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">
    <div class="gcard">
      <div style="font-size:28px;margin-bottom:4px">📊</div>
      <div class="gcard-title">Evaluación por Competencias</div>
      <div class="gcard-meta">Alumnado, actividades, competencias específicas y clave, informes por trimestre.</div>
      <div class="gcard-count">${nGrupos} grupo${nGrupos===1?"":"s"} · ${nAlumnos} alumno${nAlumnos===1?"":"s"}</div>
      <div class="gcard-actions"><button class="btn" onclick="irModo('competencial')">Abrir</button></div>
    </div>
    <div class="gcard">
      <div style="font-size:28px;margin-bottom:4px">📘</div>
      <div class="gcard-title">Programación de Aula</div>
      <div class="gcard-meta">El plan de Situaciones de Aprendizaje del curso, con sus actividades y criterios — reutilizable de año en año, y de donde se recogen las actividades a evaluar.</div>
      <div class="gcard-count">${nProgramaciones} programación${nProgramaciones===1?"":"es"}</div>
      <div class="gcard-actions"><button class="btn" onclick="irModo('programacion')">Abrir</button></div>
    </div>
    <div class="gcard">
      <div style="font-size:28px;margin-bottom:4px">🖊️</div>
      <div class="gcard-title">Corrector de Exámenes</div>
      <div class="gcard-meta">Rúbricas por examen, vinculadas a criterios de evaluación. La nota cuantitativa y la cualitativa por criterio se calculan solas y se guardan en Competencias.</div>
      <div class="gcard-count">${nExamenes} examen${nExamenes===1?"":"es"} con rúbrica</div>
      <div class="gcard-actions"><button class="btn" onclick="irModo('corrector')">Abrir</button></div>
    </div>
  </div>`:""}

  ${homeSeccionHeaderHTML("seguimiento","Seguimiento y apoyo al alumnado")}
  ${homeSecciones.seguimiento?`<div class="gcard-grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">
    <div class="gcard">
      <div style="font-size:28px;margin-bottom:4px">📈</div>
      <div class="gcard-title">Plan de Refuerzo</div>
      <div class="gcard-meta">Seguimiento individualizado: objetivos, medidas aplicadas y diario de evolución por alumno/a.</div>
      <div class="gcard-count">${nRefuerzoActivos} plan${nRefuerzoActivos===1?"":"es"} activo${nRefuerzoActivos===1?"":"s"}</div>
      <div class="gcard-actions"><button class="btn" onclick="irModo('refuerzo')">Abrir</button></div>
    </div>
    <div class="gcard">
      <div style="font-size:28px;margin-bottom:4px">🔁</div>
      <div class="gcard-title">Plan de Repetición</div>
      <div class="gcard-meta">Seguimiento trimestral de alumnado que repite curso, con el objetivo de superar tu materia este año.</div>
      <div class="gcard-count">${nRepeticionActivos} plan${nRepeticionActivos===1?"":"es"} activo${nRepeticionActivos===1?"":"s"}</div>
      <div class="gcard-actions"><button class="btn" onclick="irModo('repeticion')">Abrir</button></div>
    </div>
    <div class="gcard">
      <div style="font-size:28px;margin-bottom:4px">🧩</div>
      <div class="gcard-title">Alumnos NESE</div>
      <div class="gcard-meta">Plan de seguimiento curricular adaptado, organizado por grupo, con informes por evaluación.</div>
      <div class="gcard-count">${nNeseTotal} alumno${nNeseTotal===1?"":"s"}${nNesePendientes?` · ${nNesePendientes} sin plan`:""}</div>
      <div class="gcard-actions"><button class="btn" onclick="irModo('nese')">Abrir</button></div>
    </div>
  </div>`:""}

  ${homeSeccionHeaderHTML("organizacion","Organización")}
  ${homeSecciones.organizacion?`<div class="gcard-grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">
    <div class="gcard">
      <div style="font-size:28px;margin-bottom:4px">🗂️</div>
      <div class="gcard-title">Reuniones</div>
      <div class="gcard-meta">Registro de reuniones con familias, alumnado y equipo directivo, con acta imprimible.</div>
      <div class="gcard-count">${nReuniones} reunión${nReuniones===1?"":"es"} registrada${nReuniones===1?"":"s"}</div>
      <div class="gcard-actions"><button class="btn" onclick="irModo('reuniones')">Abrir</button></div>
    </div>
    <div class="gcard">
      <div style="font-size:28px;margin-bottom:4px">📄</div>
      <div class="gcard-title">Memoria de curso</div>
      <div class="gcard-meta">Resultados, asistencia, convivencia y SdA de todos tus grupos juntos, por evaluación o para el curso completo, con la evolución de cada grupo.</div>
      <div class="gcard-count">${state.grupos.length} grupo${state.grupos.length===1?"":"s"}</div>
      <div class="gcard-actions"><button class="btn" onclick="irModo('memoria')">Abrir</button></div>
    </div>
    <div class="gcard">
      <div style="font-size:28px;margin-bottom:4px">👥</div>
      <div class="gcard-title">Gestor de Tutoría</div>
      <div class="gcard-meta">Aplicación independiente (sus propios datos). Ábrela desde aquí como acceso rápido.</div>
      <div class="gcard-count">Se abre en su propia carpeta</div>
      <div class="gcard-actions"><a class="btn" href="tutoria/index.html" target="_blank" rel="noopener" style="text-decoration:none;display:inline-flex;align-items:center">Abrir</a></div>
    </div>
  </div>`:""}

  ${homeSeccionHeaderHTML("calendario","Calendario y Mi horario")}
  ${homeSecciones.calendario?`<div class="card" style="margin-top:0;padding-bottom:10px">
    <div class="flex" style="gap:8px">
      <button class="tab ${homeTabActual==="calendario"?"on":""}" onclick="homeSetTab('calendario')">📅 Calendario</button>
      <button class="tab ${homeTabActual==="horario"?"on":""}" onclick="homeSetTab('horario')">🗓️ Mi horario</button>
    </div>
  </div>
  ${homeTabActual==="calendario"?`<div class="ag-layout">
    ${agRenderCalendarioHTML()}
    ${agRenderResumenHTML()}
  </div>`:horRenderGridHTML()}`:""}

  <button class="home-seccion-header" onclick="homeToggleAyuda()" aria-expanded="${homeAyudaAbierta}">
    <span class="home-seccion-chevron">${homeAyudaAbierta?"▾":"▸"}</span>
    <span class="section-eyebrow" style="margin:0">Ayuda</span>
  </button>
  ${homeAyudaAbierta?`<div class="card" style="margin-top:0">
    <div class="grid" style="gap:10px">
      <div class="row" style="justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:700;font-size:13.5px">📖 Guía de uso</div>
          <p class="sub" style="margin:2px 0 0">Primeros pasos, rúbricas, copias de seguridad, papelera y preguntas frecuentes.</p>
        </div>
        <a class="btn small" href="guia_mejorada.html" style="text-decoration:none;display:inline-flex;align-items:center;flex-shrink:0">Abrir guía</a>
      </div>
      <div class="row" style="align-items:flex-start">
        <div>
          <div style="font-weight:700;font-size:13.5px">Nota sobre el Gestor de Tutoría</div>
          <p class="sub" style="margin:2px 0 0">Vive en la subcarpeta <code>tutoria/</code>, junto a este archivo. No comparte alumnado ni notas con las otras dos aplicaciones: es una pieza independiente con sus propios datos.</p>
        </div>
      </div>
    </div>
  </div>`:""}
  ${state.ui.agModalFecha ? agRenderModalHTML() : ""}
  ${state.ui.agModalFestivos ? agRenderModalFestivosHTML() : ""}
  ${state.ui.agModalColores ? agRenderModalColoresHTML() : ""}
  ${state.ui.agModalMesGrande ? agModalMesGrandeHTML() : ""}
  ${state.ui.horModalCelda ? horRenderModalHTML() : ""}
  ${state.ui.horModalFranjas ? horFranjasModalHTML() : ""}`;
}
