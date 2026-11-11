/* ============================================================================
   Cuaderno del profesor · Asistente «Empezar curso nuevo»
   js/nucleo/nuevo-curso.js
   ============================================================================ */

/* =================================================================
   v3 · EMPEZAR CURSO NUEVO
   En septiembre el Cuaderno tiene el alumnado y las notas del curso que
   acaba, pero también cosas que se reutilizan: los grupos con sus
   bloques y pesos, las Programaciones de Aula, el horario, las materias
   propias y las plantillas. Este asistente:
     1) ARCHIVA el curso que termina: prepara una copia completa (cifrada
        si se quiere) y no sigue hasta que el archivo se ha guardado;
        además deja una copia interna «Antes de empezar el curso…».
     2) VACÍA lo que es de un solo curso (alumnado, actividades, notas,
        asistencia, diario, convivencia, familias, reuniones, planes de
        refuerzo/repetición/NESE, eventos y diseños de examen) y
     3) CONSERVA lo que se haya marcado.
   Se puede deshacer con ↶ justo después, y la copia interna y el archivo
   permiten volver atrás en cualquier momento (Importar copia).
   ================================================================= */
let _ncModal=null, _ncArchivo=null;

function ncCursoSiguiente(curso){
  const m=/^\s*(\d{4})\s*[-–\/]\s*(\d{2,4})\s*$/.exec(curso||"");
  if(!m) return cursoAcademicoActual();
  const a=Number(m[1])+1;
  return a+"-"+(m[2].length===2 ? String((a+1)%100).padStart(2,"0") : a+1);
}

/* Grupo listo para el curso nuevo: misma identidad y configuración, sin nada de un curso concreto. */
function ncGrupoVacio(g,opc){
  const n=defGrupo(g.nombre,g.catalogoKey);
  n.id=g.id;                                   // el horario y los planos lo siguen encontrando
  n.bloques=JSON.parse(JSON.stringify(g.bloques||n.bloques));
  n.pesos=JSON.parse(JSON.stringify(g.pesos||n.pesos));
  n.pesosTrim=JSON.parse(JSON.stringify(g.pesosTrim||{}));
  n.umbrales=Object.assign({},g.umbrales||n.umbrales);
  n.sdaPrevistas=Array.isArray(g.sdaPrevistas)?g.sdaPrevistas.slice():n.sdaPrevistas;
  n.programacionId=opc.programaciones?(g.programacionId||""):"";
  n.plano={filas:(g.plano&&g.plano.filas)||5,columnas:(g.plano&&g.plano.columnas)||6,posiciones:{}};
  if(opc.alumnado){
    // Solo los datos de la persona: ni notas, ni observaciones, ni planes, ni pendientes.
    n.alumnos=(g.alumnos||[]).map(a=>normalizarAlumno({id:a.id,apellidos:a.apellidos,nombreP:a.nombreP,nombre:a.nombre,
      fechaNacimiento:a.fechaNacimiento||"",familia:JSON.parse(JSON.stringify(a.familia||[])),nese:!!a.nese,neseNivel:a.neseNivel||"",neseNivelOtro:!!a.neseNivelOtro}));
    ordenarAlumnos(n);
    n.plano.posiciones=JSON.parse(JSON.stringify((g.plano&&g.plano.posiciones)||{}));
  }
  return normalizarGrupo(n);
}

/* Aplica el cambio de curso al estado. No guarda ni pinta: lo hace quien la llama. */
function ncAplicar(opc){
  const idsGrupos=new Set();
  if(opc.grupos){ state.grupos=state.grupos.map(g=>ncGrupoVacio(g,opc)); state.grupos.forEach(g=>idsGrupos.add(g.id)); }
  else state.grupos=[];
  if(opc.programaciones){ (state.programaciones||[]).forEach(p=>{ p.cursoEscolar=opc.curso; }); }
  else state.programaciones=[];
  if(opc.horario){
    // Las clases de grupos que ya no existen se quedan como huecos con su texto, sin enlace.
    Object.values((state.horario&&state.horario.celdas)||{}).forEach(c=>{ if(c && c.grupoId && !idsGrupos.has(c.grupoId)) c.grupoId=""; });
  } else if(state.horario) state.horario.celdas={};
  if(!opc.festivos) state.festivos=[];
  state.eventos=[]; state.reuniones=[];
  state.planesRefuerzo=[]; state.planesRepeticion=[]; state.planesNESE=[];
  state.cursoEscolarGlobal=opc.curso;
  const ui=defAppState().ui; ui.appMode="inicio"; state.ui=ui;
  migrarEstado();
}

/* Diseños de examen: los de las actividades del curso que acaba se borran (van en el archivo);
   las plantillas de las Programaciones («prog:…») se conservan si se conservan las Programaciones. */
async function ncLimpiarDisenos(opc){
  try{
    const todos=await exLeerTodos();
    for(const r of todos){ if(!opc.programaciones || !String(r.key).startsWith("prog:")) await exBorrar(r.key); }
    exLimpiarPendientes();
  }catch(e){}
}

function ncCerrar(){ if(_ncModal){ _ncModal.remove(); _ncModal=null; } _ncArchivo=null; }
window.ncCerrar=ncCerrar;

window.abrirNuevoCurso=()=>{
  ncCerrar();
  const r=resumenEstado(state);
  if(r.total===0){ mostrarAviso("Todavía no hay nada que archivar: el Cuaderno está vacío."); return; }
  const actual=state.cursoEscolarGlobal||cursoAcademicoActual();
  const div=document.createElement("div");
  div.className="modal-overlay";
  div.innerHTML=`<div class="modal-box" style="max-width:600px" role="dialog" aria-modal="true" aria-labelledby="ncTitulo">
    <div class="flex" style="justify-content:space-between;align-items:center"><h2 id="ncTitulo" style="font-size:17px">🎓 Empezar un curso nuevo</h2><button class="modal-close" onclick="ncCerrar()" aria-label="Cerrar">×</button></div>
    <div id="ncCuerpo">
      <p class="sub" style="margin-top:6px">Archiva el curso que termina (<strong>${esc(actual)}</strong> · ${esc(r.texto)}) y deja el Cuaderno preparado para el siguiente. <strong>Antes de cambiar nada se guarda una copia completa</strong> en un archivo y dentro del dispositivo.</p>
      <label style="display:block;font-size:13px;font-weight:600;margin:12px 0 4px" for="ncCurso">Curso que empieza</label>
      <input class="in" id="ncCurso" style="width:160px" value="${esc(ncCursoSiguiente(actual))}">
      <div style="font-size:13px;font-weight:600;margin:14px 0 6px">Qué quieres conservar</div>
      <label class="nc-op"><input type="checkbox" id="ncGrupos" checked> <span><strong>Los grupos, vacíos</strong> — nombre, materia, bloques de calificación, pesos y umbrales. Sin alumnado ni notas.</span></label>
      <label class="nc-op" style="margin-left:26px"><input type="checkbox" id="ncAlumnado"> <span><strong>También su alumnado</strong> (nombre, fecha de nacimiento, familia y NESE), por si sigues con el mismo grupo. Sin notas, asistencia, observaciones ni planes.</span></label>
      <label class="nc-op"><input type="checkbox" id="ncProgramaciones" checked> <span><strong>Las Programaciones de Aula</strong>, con sus situaciones, actividades planificadas y rúbricas.</span></label>
      <label class="nc-op"><input type="checkbox" id="ncHorario" checked> <span><strong>El horario semanal</strong> y sus franjas.</span></label>
      <label class="nc-op"><input type="checkbox" id="ncFestivos"> <span><strong>Los festivos</strong> del calendario (normalmente cambian cada curso).</span></label>
      <p class="sub" style="margin:10px 0 0">Se conservan siempre las materias propias, las plantillas de rúbrica y de reunión, los datos del centro y los ajustes. <strong>Se vacía</strong> lo que es de un solo curso: actividades, notas, asistencia, diario, convivencia, contactos con familias, reuniones, planes de refuerzo, repetición y NESE, y los eventos del calendario.</p>
      ${cifradoDisponible()?`<label class="nc-op" style="margin-top:10px"><input type="checkbox" id="ncCifrar"> <span>🔒 <strong>Cifrar el archivo</strong> del curso con una contraseña (recomendado si va a salir del dispositivo).</span></label>`:""}
      <div class="flex" style="justify-content:flex-end;gap:8px;margin-top:16px">
        <button class="ghost" style="border:1px solid var(--line)" onclick="ncCerrar()">Cancelar</button>
        <button class="btn" onclick="ncPreparar()">Preparar el archivo del curso →</button>
      </div>
    </div></div>`;
  document.body.appendChild(div); _ncModal=div;
  const gr=div.querySelector("#ncGrupos"), al=div.querySelector("#ncAlumnado");
  gr.addEventListener("change",()=>{ al.disabled=!gr.checked; if(!gr.checked) al.checked=false; });
};

function ncLeerOpciones(){
  const v=id=>{ const el=_ncModal && _ncModal.querySelector("#"+id); return !!(el && el.checked); };
  const curso=((_ncModal && _ncModal.querySelector("#ncCurso").value)||"").trim();
  return {curso, grupos:v("ncGrupos"), alumnado:v("ncGrupos")&&v("ncAlumnado"), programaciones:v("ncProgramaciones"), horario:v("ncHorario"), festivos:v("ncFestivos"), cifrar:v("ncCifrar")};
}

/* Paso 1 → 2: prepara el archivo del curso que acaba (cifrado si se ha pedido). */
window.ncPreparar=async()=>{
  if(!_ncModal) return;
  const opc=ncLeerOpciones();
  if(!opc.curso){ mostrarAviso("Escribe el curso que empieza (por ejemplo, 2027-2028)."); return; }
  let pass=null;
  if(opc.cifrar){
    pass=await pedirContrasena({titulo:"🔒 Archivo del curso cifrado",confirmar:true,boton:"Cifrar",
      texto:"Elige una contraseña para el archivo del curso. <strong>Apúntala en un lugar seguro: si la olvidas, el archivo no se podrá abrir.</strong>"});
    if(!pass) return;
  }
  volcarEspejoIDB();
  let texto;
  try{
    const dis=exTodosSync()||await exLeerTodos();
    texto=JSON.stringify(dis.length?{...state,_examenesDiseno:dis}:state,null,pass?0:2);
    if(pass) texto=await cifrarTexto(texto,pass);
  }catch(e){ mostrarAviso("No se ha podido preparar el archivo: "+(e.message||e)); return; }
  if(!_ncModal) return;
  const viejo=(state.cursoEscolarGlobal||cursoAcademicoActual()).replace(/[^0-9A-Za-z-]+/g,"-");
  const nombre=`curso-${viejo}-cuaderno${pass?"-CIFRADO":""}-${fechaISOLocal()}.json`;
  _ncArchivo={blob:new Blob([texto],{type:"application/json"}),nombre,opc};
  const lista=[opc.grupos?(opc.alumnado?"los grupos con su alumnado (sin notas)":"los grupos, vacíos"):null, opc.programaciones?"las Programaciones de Aula":null, opc.horario?"el horario":null, opc.festivos?"los festivos":null].filter(Boolean);
  _ncModal.querySelector("#ncCuerpo").innerHTML=`
    <p class="sub" style="margin-top:6px">El archivo del curso ${esc(state.cursoEscolarGlobal||"")} está listo:</p>
    <div class="card" style="margin:8px 0;padding:10px 14px"><strong style="font-size:13.5px">${esc(nombre)}</strong><div class="sub" style="margin:2px 0 0">${_fmtBytes(texto.length)}${pass?" · cifrado":""} · contiene todo lo que hay ahora en el Cuaderno</div></div>
    <p class="sub">Al pulsar el botón se guarda el archivo y, <strong>solo si se ha guardado</strong>, empieza el curso <strong>${esc(opc.curso)}</strong> conservando ${lista.length?esc(lista.join(", ")):"solo las materias, plantillas y ajustes"}. Guárdalo en un sitio seguro: es tu expediente del curso que termina.</p>
    <div class="flex" style="justify-content:flex-end;gap:8px;margin-top:16px">
      <button class="ghost" style="border:1px solid var(--line)" onclick="ncCerrar()">Cancelar</button>
      <button class="btn" id="ncConfirmar" onclick="ncConfirmar()">💾 Guardar el archivo y empezar el curso ${esc(opc.curso)}</button>
    </div>`;
};

/* Paso 2: guarda el archivo y, si se ha guardado, hace el cambio de curso. */
window.ncConfirmar=async()=>{
  if(!_ncArchivo) return;
  const {blob,nombre,opc}=_ncArchivo;
  const btn=_ncModal && _ncModal.querySelector("#ncConfirmar"); if(btn) btn.disabled=true;
  let ok=false;
  try{ ok=await guardarArchivo(blob,nombre); }catch(e){ ok=false; }
  if(!ok){ if(btn) btn.disabled=false; mostrarToast("No se ha guardado el archivo: no se ha cambiado nada","info"); return; }
  const viejo=state.cursoEscolarGlobal||"anterior";
  const copia=await crearCopiaAuto("Antes de empezar el curso "+opc.curso+" (curso "+viejo+" completo)",true);
  if(!copia && !await confirmar("No se ha podido crear la copia interna de seguridad en este dispositivo. El archivo del curso sí se ha guardado. ¿Empezar el curso nuevo igualmente?",{ok:"Sí, continuar",peligro:true})){ if(btn) btn.disabled=false; return; }
  ncAplicar(opc);
  state.lastBackupAt=Date.now(); state.cambiosSinCopia=0;
  save();
  await ncLimpiarDisenos(opc);
  ncCerrar();
  _mostrarBienvenida=false;
  render();
  mostrarToast("✓ Curso "+opc.curso+" preparado. El curso "+viejo+" queda en el archivo y en 🛟 Copias");
};
