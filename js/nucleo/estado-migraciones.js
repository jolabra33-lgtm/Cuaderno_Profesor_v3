/* ============================================================================
   Cuaderno del profesor · Estado global de la app y migraciones de datos antiguos
   js/nucleo/estado-migraciones.js
   ============================================================================ */

let state;
/* v1: todas las normalizaciones/migraciones del estado, agrupadas en una
   función para poder re-ejecutarlas al importar una copia o al recuperar
   datos desde la copia interna (IndexedDB), no solo al arrancar. */
function migrarEstado(){
(state.grupos||[]).forEach(g=>{ normalizarGrupo(g); (g.alumnos||[]).forEach(normalizarAlumno); ordenarAlumnos(g); });
/* Migración única: hasta ahora un examen guardaba la MISMA nota clonada en
   todos sus criterios, y esa nota servía a la vez para la calificación
   cuantitativa y para la cualitativa. A partir de esta versión son dos notas
   independientes; esta migración copia, una sola vez, la nota ya existente a
   la nueva "nota cuantitativa" para que ningún alumno cambie de nota el día
   que se activa la mejora. Se ejecuta solo la primera vez (state.examenDualMigrado)
   para no interferir nunca con exámenes nuevos que se califiquen a partir de ahora. */
if(!state.examenDualMigrado){
  state.grupos.forEach(g=>{
    (g.actividades||[]).forEach(a=>{
      if(!a.esExamen || !a.criterios || !a.criterios.length) return;
      const critRef=a.criterios[0].critId;
      (g.alumnos||[]).forEach(al=>{
        const v=g.notas?.[al.id]?.[a.id]?.[critRef];
        if(v==null||v==="") return;
        g.notasCuant[al.id]=g.notasCuant[al.id]||{};
        if(g.notasCuant[al.id][a.id]==null) g.notasCuant[al.id][a.id]=v;
      });
    });
  });
  state.examenDualMigrado=true;
}
if(!state.ui) state.ui=defAppState().ui;
if(!state.catalogosPersonalizados || typeof state.catalogosPersonalizados!=="object") state.catalogosPersonalizados={};
if(!state.catalogosOcultos || typeof state.catalogosOcultos!=="object") state.catalogosOcultos={};
if(!Array.isArray(state.eventos)) state.eventos=[];
state.eventos.forEach(e=>{ if(!Array.isArray(e.grupoIds)) e.grupoIds = e.grupoId?[e.grupoId]:[]; });
if(!Array.isArray(state.festivos)) state.festivos=[];
state.festivos = state.festivos.map(f=>{
  if(typeof f==="string") return {id:uid(),fechaInicio:f,fechaFin:f,etiqueta:""};
  if(f && typeof f==="object"){
    const fechaInicio = f.fechaInicio || f.fecha || f.inicio || "";
    const fechaFin = f.fechaFin || f.fin || fechaInicio;
    return {id:f.id||uid(), fechaInicio, fechaFin, etiqueta:f.etiqueta||""};
  }
  return null;
}).filter(f=>f && f.fechaInicio);
if(!state.tiposColores || typeof state.tiposColores!=="object") state.tiposColores={};
if(!Array.isArray(state.reuniones)) state.reuniones=[];
if(!Array.isArray(state.plantillasRubrica)) state.plantillasRubrica=[];
if(!Array.isArray(state.plantillasReunion)) state.plantillasReunion=[];
if(!Array.isArray(state.planesRefuerzo)) state.planesRefuerzo=[];
state.planesRefuerzo.forEach(p=>{
  if(!Array.isArray(p.trimestres) || p.trimestres.length!==3){
    const objetivosViejos=Array.isArray(p.objetivos)?p.objetivos:[""];
    const medidasViejas=Array.isArray(p.medidas)?p.medidas:[""];
    p.trimestres=[{objetivos:objetivosViejos,medidas:medidasViejas},{objetivos:[],medidas:[]},{objetivos:[],medidas:[]}];
    delete p.objetivos; delete p.medidas;
  }
  p.trimestres=p.trimestres.map(t=>{
    if(Array.isArray(t.gruposCE)) return t; // ya en formato v3
    let criteriosPlanos;
    let actividades, calificacion, valoracion, justificacion;
    if(Array.isArray(t.criterios)){ // formato v2
      criteriosPlanos=t.criterios; actividades=t.actividades; calificacion=t.calificacion; valoracion=t.valoracion; justificacion=t.justificacion;
    }else{ // formato v1 (objetivos/medidas)
      criteriosPlanos=(t.objetivos||[]).filter(o=>o&&o.trim()).map(o=>({ce:"",cc:"",texto:o}));
      actividades=(t.medidas||[]).filter(m=>m&&m.trim());
      calificacion=""; valoracion=""; justificacion="";
    }
    const gruposCE=[];
    criteriosPlanos.filter(c=>c.texto&&c.texto.trim()).forEach(c=>{
      let g=gruposCE.find(x=>x.ce===(c.ce||"") && x.cc===(c.cc||""));
      if(!g){ g={ce:c.ce||"",cc:c.cc||"",criterios:[]}; gruposCE.push(g); }
      g.criterios.push({texto:c.texto,trabajado:false});
    });
    return { gruposCE, actividades: (actividades&&actividades.length)?actividades:["Elaboración de un dossier de actividades de evaluación y consolidación de los saberes básicos no conseguidos."],
      calificacion:calificacion||"", valoracion:valoracion||"", justificacion:justificacion||"" };
  });
  if(!p.motivos) p.motivos=rfrpMotivosDefault();
  if(p.valoracionFinal===undefined) p.valoracionFinal="";
  if(p.cursoAcademico===undefined) p.cursoAcademico="";
});
if(!Array.isArray(state.planesRepeticion)) state.planesRepeticion=[];
state.planesRepeticion.forEach(p=>{
  if(!Array.isArray(p.trimestres) || p.trimestres.length!==3) p.trimestres=rfrpTrimestresIniciales("");
  p.trimestres=p.trimestres.map(t=>{
    if(Array.isArray(t.gruposCE)) return t; // ya en formato v3
    let criteriosPlanos, actividades, calificacion, valoracion, justificacion;
    if(Array.isArray(t.criterios)){ // formato v2
      criteriosPlanos=t.criterios; actividades=t.actividades; calificacion=t.calificacion; valoracion=t.valoracion; justificacion=t.justificacion;
    }else{ // formato v1 (objetivos/medidas/valoracion en texto libre)
      criteriosPlanos=(t.objetivos||[]).filter(o=>o&&o.trim()).map(o=>({ce:"",cc:"",texto:o}));
      actividades=(t.medidas||[]).filter(m=>m&&m.trim());
      calificacion=""; valoracion="";
      justificacion=(typeof t.valoracion==="string" && t.valoracion && t.valoracion!=="positiva" && t.valoracion!=="negativa")?t.valoracion:"";
    }
    const gruposCE=[];
    criteriosPlanos.filter(c=>c.texto&&c.texto.trim()).forEach(c=>{
      let g=gruposCE.find(x=>x.ce===(c.ce||"") && x.cc===(c.cc||""));
      if(!g){ g={ce:c.ce||"",cc:c.cc||"",criterios:[]}; gruposCE.push(g); }
      g.criterios.push({texto:c.texto,trabajado:false});
    });
    return { gruposCE, actividades:(actividades&&actividades.length)?actividades:["Elaboración de un dossier de actividades de evaluación y consolidación de los saberes básicos no conseguidos."],
      calificacion:calificacion||"", valoracion:valoracion||"", justificacion:justificacion||"" };
  });
  if(!p.motivos){ p.motivos=rfrpMotivosDefault(); if(p.motivo){ p.motivos.otros=true; p.motivos.otrosTexto=p.motivo; } }
  if(!p.medidasNivelII) p.medidasNivelII=rpMedidasDefault(RP_MEDIDAS_II);
  if(!p.medidasNivelIII) p.medidasNivelIII=rpMedidasDefault(RP_MEDIDAS_III);
  if(p.valoracionFinal===undefined) p.valoracionFinal="";
  if(p.cursoAcademico===undefined) p.cursoAcademico="";
  delete p.motivo;
});
if(!Array.isArray(state.planesNESE)) state.planesNESE=[];
state.planesNESE.forEach(p=>{
  if(p.valoracion1T===undefined) p.valoracion1T="";
  if(p.valoracion2T===undefined) p.valoracion2T="";
  if(p.valoracion3T===undefined) p.valoracion3T="";
  if(p.valoracionFinal===undefined) p.valoracionFinal="";
});
if(!state.horario || typeof state.horario!=="object") state.horario={celdas:{}};
if(!state.horario.celdas || typeof state.horario.celdas!=="object") state.horario.celdas={};
if(state.ui.horModalCelda===undefined) state.ui.horModalCelda=null;
if(state.ui.neTab===undefined) state.ui.neTab="lista";
if(state.ui.neId===undefined) state.ui.neId="";
if(state.ui.neModalCrear===undefined) state.ui.neModalCrear=null;
if(state.ui.prepNuevoModal===undefined) state.ui.prepNuevoModal=null;
if(state.ui.rfTab===undefined) state.ui.rfTab="lista";
if(state.ui.rfId===undefined) state.ui.rfId="";
if(state.ui.rfModalNueva===undefined) state.ui.rfModalNueva=false;
if(state.ui.rfFiltroEstado===undefined) state.ui.rfFiltroEstado="";
if(state.ui.rfBusqueda===undefined) state.ui.rfBusqueda="";
if(state.ui.rpTab===undefined) state.ui.rpTab="lista";
if(state.ui.rpId===undefined) state.ui.rpId="";
if(state.ui.rpModalNueva===undefined) state.ui.rpModalNueva=false;
if(state.ui.rpFiltroEstado===undefined) state.ui.rpFiltroEstado="";
if(state.ui.prepModal===undefined) state.ui.prepModal=null;
if(state.ui.rpBusqueda===undefined) state.ui.rpBusqueda="";
if(state.ui.reTab===undefined) state.ui.reTab="lista";
if(state.ui.reId===undefined) state.ui.reId="";
if(state.ui.reModalNueva===undefined) state.ui.reModalNueva=false;
if(state.ui.reFiltroTipo===undefined) state.ui.reFiltroTipo="";
if(state.ui.reBusqueda===undefined) state.ui.reBusqueda="";
if(state.ui.reFiltroDesde===undefined) state.ui.reFiltroDesde="";
if(state.ui.reFiltroHasta===undefined) state.ui.reFiltroHasta="";
if(state.ui.agMes===undefined) state.ui.agMes="";
if(state.ui.agModalFecha===undefined) state.ui.agModalFecha="";
if(state.ui.agModalEventId===undefined) state.ui.agModalEventId="";
if(state.ui.agModalMesGrande===undefined) state.ui.agModalMesGrande=false;
if(state.ui.agVista===undefined) state.ui.agVista="mes";
if(state.ui.agFiltroGrupo===undefined) state.ui.agFiltroGrupo="";
if(state.ui.agDiaSel===undefined) state.ui.agDiaSel="";
if(state.ui.agFiltroTipo===undefined) state.ui.agFiltroTipo="";
if(state.ui.diarioFecha===undefined) state.ui.diarioFecha="";
if(state.ui.asistFecha===undefined) state.ui.asistFecha="";
if(state.ui.convVista===undefined) state.ui.convVista="lista";
if(state.ui.convId===undefined) state.ui.convId="";
if(state.ui.convModalNueva===undefined) state.ui.convModalNueva=false;
if(state.ui.convFiltroAlumno===undefined) state.ui.convFiltroAlumno="";
if(state.ui.convFiltroTipo===undefined) state.ui.convFiltroTipo="";
if(state.ui.famModalNueva===undefined) state.ui.famModalNueva=false;
if(state.ui.famFiltroAlumno===undefined) state.ui.famFiltroAlumno="";
if(state.ui.famFiltroMedio===undefined) state.ui.famFiltroMedio="";
if(state.ui.alumPendAbierto===undefined) state.ui.alumPendAbierto=null;
if(state.ui.fichaAlumnoId===undefined) state.ui.fichaAlumnoId="";
if(state.ui.evolModalAl===undefined) state.ui.evolModalAl="";
if(state.ui.evolPeriodo===undefined) state.ui.evolPeriodo=0;
if(state.ui.asistModalAl===undefined) state.ui.asistModalAl="";
if(state.ui.convModalAl===undefined) state.ui.convModalAl="";
if(state.ui.cxVerEstadisticas===undefined) state.ui.cxVerEstadisticas=false;
if(!Array.isArray(state.ui.alumColumnasOcultas)) state.ui.alumColumnasOcultas=[];
if(!state.ui.alumColAnchos || typeof state.ui.alumColAnchos!=="object") state.ui.alumColAnchos={};
if(state.ui.alumSortCol===undefined) state.ui.alumSortCol="";
if(state.ui.alumSortDir===undefined) state.ui.alumSortDir="asc";
if(state.ui.memoriaPeriodo===undefined) state.ui.memoriaPeriodo="curso";
if(state.centroNombre===undefined) state.centroNombre="";
if(state.centroCodigo===undefined) state.centroCodigo="";
if(typeof state.cursoEscolarGlobal!=="string") state.cursoEscolarGlobal=cursoAcademicoActual();
if(typeof state.profesorNombreGlobal!=="string") state.profesorNombreGlobal="";
if(state.programaciones && !Array.isArray(state.programaciones) && typeof state.programaciones==="object"){
  // Formato antiguo: diccionario por catálogo. Se migra a una lista de Programaciones de
  // Aula independientes, conservando los mismos id de SdA (para no romper enlaces del Diario).
  const nuevas=[];
  Object.entries(state.programaciones).forEach(([catKey,p])=>{
    const cat=getCatalogo(catKey);
    nuevas.push({ id:uid(), nombre:`${cat.materia} · ${cat.curso}`, catalogoKey:catKey,
      sdas:(p.unidades||[]).map(u=>({id:u.id, titulo:u.titulo||"", trimestre:u.trimestre||0, sesionesPrevistas:u.sesionesPrevistas||"", saberes:u.saberes||""})),
      actividades:[] });
  });
  state.programaciones=nuevas;
  // Vincula automáticamente cada grupo a la programación migrada de su mismo catálogo,
  // para no perder el enlace que antes era automático.
  (state.grupos||[]).forEach(g=>{
    if(!g.programacionId){ const p=nuevas.find(x=>x.catalogoKey===g.catalogoKey); if(p) g.programacionId=p.id; }
  });
}
if(!Array.isArray(state.programaciones)) state.programaciones=[];
state.programaciones.forEach(p=>{
  if(!p.recursos || typeof p.recursos!=="object") p.recursos=progRecursosDefault();
  else Object.keys(progRecursosDefault()).forEach(k=>{ if(p.recursos[k]===undefined) p.recursos[k]=(k==="otros"?"":false); });
  if(typeof p.cursoEscolar!=="string") p.cursoEscolar=cursoAcademicoActual();
  if(typeof p.profesorNombre!=="string") p.profesorNombre="";
  if(typeof p.metodologia!=="string") p.metodologia="";
  else p.metodologia=progTextoAHTML(p.metodologia);
  if(typeof p.criteriosCalifCualitativa!=="string") p.criteriosCalifCualitativa="";
  else p.criteriosCalifCualitativa=progTextoAHTML(p.criteriosCalifCualitativa);
  if(typeof p.criteriosCalifCuantitativa!=="string") p.criteriosCalifCuantitativa="";
  else p.criteriosCalifCuantitativa=progTextoAHTML(p.criteriosCalifCuantitativa);
  (p.sdas||[]).forEach(s=>{
    if(!Array.isArray(s.saberesIds)) s.saberesIds=[];
    if(typeof s.saberesOtros!=="string") s.saberesOtros = (typeof s.saberes==="string" ? s.saberes : "");
    delete s.saberes;
    if(!Array.isArray(s.recursos)) s.recursos=[];
  });
});
if(state.ui.progTab===undefined) state.ui.progTab="lista";
if(state.ui.progId===undefined) state.ui.progId="";
if(state.ui.progDetTab===undefined) state.ui.progDetTab="general";
if(state.ui.progModalNueva===undefined) state.ui.progModalNueva=false;
if(state.ui.progActividadAbierta===undefined) state.ui.progActividadAbierta=null;
if(state.ui.progSaberesAbierto===undefined) state.ui.progSaberesAbierto=null;
if(state.ui.asistDesde===undefined) state.ui.asistDesde="";
if(state.ui.asistHasta===undefined) state.ui.asistHasta="";
if(state.ui.catImportTexto===undefined) state.ui.catImportTexto="";
if(state.ui.catEditKey===undefined) state.ui.catEditKey="";
if(state.ui.appMode===undefined) state.ui.appMode="inicio";
if(state.ui.corTab===undefined) state.ui.corTab="lista";
if(state.ui.corExamId===undefined) state.ui.corExamId="";
if(state.ui.corAlId===undefined) state.ui.corAlId="";
if(state.ui.corItemAbierto===undefined) state.ui.corItemAbierto="";
if(!state.ui.corForm) state.ui.corForm={nombre:"",bloqueId:"",sda:"",fecha:"",plantillaId:""};
if(state.ui.corForm.fecha===undefined) state.ui.corForm.fecha="";
state.ui.grupoId=null;
state.ui.calViewMode = state.ui.calViewMode || 'cards';
if(state.ui.recModalAct===undefined) state.ui.recModalAct="";
state.ui.horModalFranjas=false;
if(typeof state.cambiosSinCopia!=="number") state.cambiosSinCopia=0;
if(!state.ajustesNota || typeof state.ajustesNota!=="object") state.ajustesNota={redondeoActa:"sinAprobarPorRedondeo"};
if(!REDONDEO_MODOS.some(m=>m.id===state.ajustesNota.redondeoActa)) state.ajustesNota.redondeoActa="sinAprobarPorRedondeo";
}
/* Estado de guardado observable por la interfaz:
   - saveOk: false si el último intento de guardar en el dispositivo falló
     (cuota llena, modo privado de Safari, almacenamiento bloqueado…). */
let saveState={ ok:true, idbOk:true };
