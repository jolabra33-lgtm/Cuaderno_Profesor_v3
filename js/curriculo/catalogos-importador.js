/* ============================================================================
   Cuaderno del profesor · Autocarga del currículo e importador de materias propias
   js/curriculo/catalogos-importador.js
   ============================================================================ */

function grupoActual(){ return state.grupos.find(g=>g.id===state.ui.grupoId) || null; }

const CAT_CACHE={};
function catIndex(catalogoKey){
  if(CAT_CACHE[catalogoKey]) return CAT_CACHE[catalogoKey];
  const cat=getCatalogo(catalogoKey); const ceMap={}, critMap={};
  cat.ces.forEach(ce=>{ ceMap[ce.id]=ce; ce.criterios.forEach(c=>{ critMap[c.id]={...c,ceId:ce.id}; }); });
  const idx={cat,ceMap,critMap}; CAT_CACHE[catalogoKey]=idx; return idx;
}
/* =================================================================
   Autocarga del currículo (CE, criterios, competencias clave y saberes
   básicos) de un catálogo a partir de un texto libre de "curso" (p. ej.
   el "curso que repite" de un Plan de Repetición). Se usa para no tener
   que volver a teclear a mano el currículo del curso que el alumno/a
   está repitiendo.
   ================================================================= */
function catalogosDisponiblesParaCurso(){
  const claves=[...new Set([...ORDEN_CATALOGOS, ...Object.keys(state.catalogosPersonalizados||{})])];
  return claves.map(k=>({key:k,cat:getCatalogo(k)})).filter(x=>x.cat && !catalogoEstaOculto(x.key));
}
/* Catálogo(s) cuyo campo "curso" casa con el texto libre dado. Si se indica
   una materia preferida (normalmente la del grupo actual del alumno/a) y
   hay coincidencias en esa materia, se devuelven solo esas para evitar
   ambigüedad entre materias distintas que comparten nombre de curso
   (p. ej. varias materias de 2.º de Bachillerato). */
function catalogosPosiblesParaCurso(cursoTexto,materiaPreferida){
  const objetivo=normalizarCurso(cursoTexto||"");
  if(!objetivo) return [];
  const todos=catalogosDisponiblesParaCurso().filter(x=>normalizarCurso(x.cat.curso)===objetivo);
  if(materiaPreferida){
    const enMateria=todos.filter(x=>normalizarTexto(x.cat.materia)===normalizarTexto(materiaPreferida));
    if(enMateria.length) return enMateria;
  }
  return todos;
}
/* Catálogo único (sin ambigüedad) que corresponde al "curso que repite" de
   un Plan de Repetición, o null si no hay ninguno o hay varios candidatos
   distintos sin forma de elegir entre ellos automáticamente. */
function materiaDelGrupo(grupoId){
  const g=state.grupos.find(x=>x.id===grupoId);
  const cat=g?getCatalogo(g.catalogoKey):null;
  return cat?cat.materia:null;
}
function rpCatalogoParaCursoRepite(p){
  if(p.cursoRepiteCatalogoKey && getCatalogo(p.cursoRepiteCatalogoKey)) return p.cursoRepiteCatalogoKey;
  // Compatibilidad con planes creados antes del selector: intenta adivinarlo
  // a partir del texto libre que se guardó entonces en "cursoRepite".
  const posibles=catalogosPosiblesParaCurso(p.cursoRepite,materiaDelGrupo(p.grupoId));
  return posibles.length===1?posibles[0].key:null;
}
/* Igual que rpCatalogoParaCursoRepite, pero para el "curso a reforzar" de un
   Plan de Refuerzo (el curso/materia cuyo currículo se quiere cargar para
   elegir de él las competencias específicas no conseguidas). */
function rfCatalogoParaCursoRefuerza(p){
  if(p.cursoRefuerzaCatalogoKey && getCatalogo(p.cursoRefuerzaCatalogoKey)) return p.cursoRefuerzaCatalogoKey;
  const posibles=catalogosPosiblesParaCurso(p.cursoRefuerza,materiaDelGrupo(p.grupoId));
  return posibles.length===1?posibles[0].key:null;
}
/* Opciones <optgroup>/<option> (agrupadas por materia) para elegir con un
   clic el curso y la materia que se repite, a partir de todos los catálogos
   disponibles. La materia del grupo actual del alumno/a (si se conoce) se
   muestra primero para que sea la opción más a mano. */
function catalogoSelectOptionsHTML(seleccionKey,materiaPreferida){
  const todos=catalogosDisponiblesParaCurso();
  const porMateria={};
  todos.forEach(x=>{ (porMateria[x.cat.materia]=porMateria[x.cat.materia]||[]).push(x); });
  const materias=Object.keys(porMateria).sort((a,b)=>{
    if(materiaPreferida){ if(a===materiaPreferida) return -1; if(b===materiaPreferida) return 1; }
    return collatorEs.compare(a,b);
  });
  return materias.map(m=>`<optgroup label="${esc(m)}">${porMateria[m]
    .slice().sort((a,b)=>collatorEs.compare(a.cat.curso,b.cat.curso))
    .map(x=>`<option value="${esc(x.key)}" ${x.key===seleccionKey?"selected":""}>${esc(x.cat.curso)}</option>`).join("")}</optgroup>`).join("");
}
/* Construye, a partir de un catálogo, la tabla de "competencias específicas /
   criterios de evaluación / competencias clave no conseguidas" ya rellena
   con TODO el currículo de ese curso (una fila por criterio), lista para que
   el profesor/a marque cuáles se han trabajado y quite los que no apliquen,
   en lugar de tener que escribirlos a mano uno a uno. */
function gruposCEDesdeCatalogo(catalogoKey){
  const idx=catIndex(catalogoKey);
  return idx.cat.ces.map(ce=>({
    ce: ce.id,
    cc: (ce.cc||[]).join(", "),
    criterios: ce.criterios.map(c=>({id:c.id, texto:`${c.id}. ${c.texto}`, trabajado:false}))
  }));
}
/* Tabla de referencia (CE, competencias clave, criterios y saberes básicos)
   de un catálogo completo, en el mismo formato de tabla usado en el resto
   de la aplicación. Se usa tanto en pantalla (dentro de una .card) como en
   los documentos imprimibles. */
function referenciaCurricularTablaHTML(catalogoKey,comoColapsable){
  const idx=catIndex(catalogoKey); const cat=idx.cat;
  const saberes=progSaberesDelCatalogo(catalogoKey)||{};
  const filas=cat.ces.map(ce=>{
    const sab=saberes[ce.id]||[];
    const criteriosHTML=ce.criterios.map(c=>`${c.id} ${esc(c.texto)}`).join("<br>");
    const saberesHTML=sab.length?`<ul style="margin:0 0 0 16px;padding:0">${sab.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>`:"—";
    return `<tr>
      <td style="min-width:150px"><strong>${esc(ce.id)}</strong><br><span style="font-size:11.5px">${esc(ce.titulo)}</span></td>
      <td style="min-width:90px;font-size:12px">${(ce.cc||[]).join(", ")||"—"}</td>
      <td style="min-width:220px;font-size:12px">${criteriosHTML}</td>
      <td style="min-width:180px;font-size:12px">${saberesHTML}</td>
    </tr>`;
  }).join("");
  const titulo=`📘 Currículo de referencia — ${esc(cat.materia)} · ${esc(cat.curso)}`;
  const tabla=`<div style="overflow-x:auto"><table><thead><tr><th>Competencia específica</th><th>Comp. clave</th><th>Criterios de evaluación</th><th>Saberes básicos</th></tr></thead>
  <tbody>${filas}</tbody></table></div>`;
  if(comoColapsable){
    return `<details><summary style="cursor:pointer;font-size:15px;font-weight:700">${titulo}</summary><div style="margin-top:10px">${tabla}</div></details>`;
  }
  return `<h2 style="font-size:15px">${titulo}</h2>${tabla}`;
}

/* =================================================================
   Importador de materias propias
   Permite a cualquier profesor/a de cualquier materia dar de alta su
   propio catálogo (competencias específicas, criterios y bloques de
   calificación) sin tocar código. Admite dos formatos de entrada:
   un formato de texto sencillo (recomendado) y JSON (para quien ya
   lo tenga en ese formato).
   ================================================================= */
function slugCatalogo(materia,curso){
  const base=normalizarTexto(materia+"_"+curso).replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");
  return "custom_"+(base||uid());
}
function ejemploCatalogoTexto(){
  return `MATERIA: Matemáticas
CURSO: 2º ESO

BLOQUES
Pruebas y exámenes = 60
Trabajo diario y cuaderno = 30
Actitud y participación = 10

CE1: Interpretar y transmitir información cuantitativa, espacial y de incertidumbre analizando textos, gráficos y datos matemáticos | CCL, STEM
1.1: Interpretar y describir informaciones, datos y argumentaciones que contengan elementos matemáticos.
1.2: Reconocer y comprender el papel de las matemáticas en el mundo, emitiendo juicios fundamentados.
SABERES:
- Lectura e interpretación de tablas, gráficos y diagramas estadísticos sencillos.
- Estimación y redondeo de cantidades en contextos cotidianos.

CE2: Utilizar el razonamiento y la argumentación para investigar y resolver problemas, seleccionando y aplicando estrategias adecuadas | STEM, CPSAA
2.1: Emplear estrategias de resolución (ensayo-error, particularización, patrones…) en situaciones de la vida cotidiana.
2.2: Comprobar la validez matemática de las soluciones a un problema.
2.3: Formular conjeturas y proponer razonamientos para su verificación.`;
}
function plantillaCatalogoTexto(){
  return `# ======================================================================
# PLANTILLA PARA IMPORTAR UNA MATERIA · Evaluación por competencias
# ======================================================================
# Rellena los datos de tu materia sustituyendo todo lo que está entre
# corchetes [así] por tus propios datos, y luego pega este contenido
# (o carga directamente este archivo) en la aplicación, en
# "Importar una materia nueva" → "Validar e importar".
#
# Las líneas que empiezan por "#", como esta, son solo explicaciones:
# la aplicación las ignora al importar. Puedes dejarlas, borrarlas, o
# añadir tus propias notas con "#" delante.
# ======================================================================

# Nombre de tu materia y el curso al que corresponde este catálogo:
MATERIA: [Nombre de la materia]
CURSO: [Curso, p. ej. 2º ESO]

# ----------------------------------------------------------------------
# BLOQUES DE CALIFICACIÓN
# Son las partes que se combinan para la nota (exámenes, trabajo
# diario, actitud...). Una línea "Nombre del bloque = porcentaje" por
# bloque; lo habitual es que los porcentajes sumen 100. Puedes añadir
# tantos bloques como necesites, o quitar alguno de los dos de ejemplo.
# ----------------------------------------------------------------------
BLOQUES
[Nombre del bloque 1, p. ej. Pruebas y exámenes] = [porcentaje, p. ej. 60]
[Nombre del bloque 2, p. ej. Trabajo diario] = [porcentaje, p. ej. 40]

# ----------------------------------------------------------------------
# COMPETENCIAS ESPECÍFICAS Y CRITERIOS DE EVALUACIÓN
# Cópialos de tu currículum oficial (Real Decreto de enseñanzas
# mínimas o el decreto de tu comunidad autónoma).
#
# Una línea "CEn: título | CÓDIGOS_CC" por cada competencia específica.
# Códigos de competencias clave disponibles (usa los que correspondan,
# separados por comas): CCL, CP, STEM, CD, CPSAA, CC, CE, CCEC.
#
# Debajo de cada CE, una línea "n.n: texto" por cada criterio de
# evaluación asociado, con la numeración de tu currículum.
#
# Opcional: si quieres que Programación de Aula pueda ofrecerte también
# los saberes básicos oficiales al elegir los de una Situación de
# Aprendizaje (en vez de solo el cuadro de texto libre), añade debajo
# de los criterios de esa CE una línea "SABERES:" seguida de una línea
# "- texto" por cada saber básico. Es opcional: si no los pones, la
# materia se importa igual, solo que sin saberes precargados.
# ----------------------------------------------------------------------
CE1: [Título de la primera competencia específica] | [CCL, STEM]
1.1: [Texto del primer criterio de evaluación]
1.2: [Texto del segundo criterio de evaluación]
SABERES:
- [Primer saber básico de esta competencia específica]
- [Segundo saber básico de esta competencia específica]

CE2: [Título de la segunda competencia específica] | [STEM, CPSAA]
2.1: [Texto del primer criterio de evaluación]
2.2: [Texto del segundo criterio de evaluación]

# Añade tantas competencias específicas (CE3, CE4…) y sus criterios
# (3.1, 3.2…) como tenga tu materia, siguiendo el mismo patrón.`;
}
function parseCatalogoTexto(texto){
  const lines=String(texto||"").split(/\r?\n/);
  let materia="", curso="";
  const ces=[]; const bloques=[];
  let modo=null, ceActual=null;
  const errores=[];
  lines.forEach((raw,i)=>{
    const line=raw.trim(); const n=i+1;
    if(!line) return;
    if(line.startsWith("#")) return;
    let m;
    if((m=line.match(/^MATERIA\s*:\s*(.+)$/i))){ materia=m[1].trim(); modo=null; return; }
    if((m=line.match(/^CURSO\s*:\s*(.+)$/i))){ curso=m[1].trim(); modo=null; return; }
    if(/^BLOQUES\s*$/i.test(line)){ modo="bloques"; return; }
    if(modo==="bloques" && (m=line.match(/^(.+?)\s*=\s*([\d.,]+)\s*%?\s*$/))){
      bloques.push({label:m[1].trim(), peso:Number(m[2].replace(",","."))});
      return;
    }
    if((m=line.match(/^CE\s*([A-Za-z0-9._-]*)\s*:\s*([^|]+?)\s*(?:\|\s*(.+))?$/i))){
      modo=null;
      const id="CE"+(m[1]||(ces.length+1));
      const titulo=m[2].trim();
      const cc=(m[3]||"").split(",").map(s=>s.trim().toUpperCase()).filter(Boolean);
      ceActual={id,titulo,cc,criterios:[],saberes:[]};
      ces.push(ceActual);
      return;
    }
    if((m=line.match(/^(\d+(?:\.\d+)?)\s*:\s*(.+)$/))){
      modo=null;
      if(!ceActual){ errores.push(`Línea ${n}: hay un criterio ("${line}") antes de definir ninguna competencia específica (una línea "CE1: …").`); return; }
      ceActual.criterios.push({id:m[1], texto:m[2].trim()});
      return;
    }
    if(/^SABERES\s*:?\s*$/i.test(line)){
      if(!ceActual){ errores.push(`Línea ${n}: "SABERES" aparece antes de definir ninguna competencia específica (una línea "CE1: …").`); return; }
      modo="saberes";
      return;
    }
    if(modo==="saberes" && (m=line.match(/^[-•]\s*(.+)$/))){
      ceActual.saberes.push(m[1].trim());
      return;
    }
    errores.push(`Línea ${n}: no se entiende "${line.length>60?line.slice(0,60)+"…":line}". Revisa el formato.`);
  });
  return {materia,curso,ces,bloques,erroresFormato:errores};
}
function validarCatalogo(obj){
  const errores=[];
  if(!obj || typeof obj!=="object") return {ok:false, errores:["No se ha podido interpretar el contenido pegado."]};
  const materia=(obj.materia||"").toString().trim();
  const curso=(obj.curso||"").toString().trim();
  if(!materia) errores.push('Falta el nombre de la materia (línea "MATERIA: …").');
  if(!curso) errores.push('Falta el curso (línea "CURSO: …").');
  const ces=Array.isArray(obj.ces)?obj.ces:[];
  if(!ces.length) errores.push("No se ha definido ninguna competencia específica (CE).");
  const idsCE=new Set(), idsCriterio=new Set();
  const ccValidos=Object.keys(COMP_CLAVE);
  ces.forEach((ce,i)=>{
    const n=i+1, nombreCE=(ce&&ce.id)||`nº${n}`;
    const id=((ce&&ce.id)||"").toString().trim();
    if(!id) errores.push(`La competencia específica ${nombreCE} no tiene identificador.`);
    else if(idsCE.has(id)) errores.push(`El identificador de competencia específica "${id}" está repetido.`);
    idsCE.add(id||nombreCE);
    if(!((ce&&ce.titulo||"").toString().trim())) errores.push(`La competencia específica "${nombreCE}" no tiene título.`);
    const cc=Array.isArray(ce&&ce.cc)?ce.cc:[];
    if(!cc.length) errores.push(`La competencia específica "${nombreCE}" no tiene ninguna competencia clave asociada (CCL, STEM, CD, CP, CPSAA, CC, CE, CCEC).`);
    cc.forEach(c=>{ if(!ccValidos.includes(c)) errores.push(`"${c}" no es una competencia clave válida en "${nombreCE}" (usa: ${ccValidos.join(", ")}).`); });
    const criterios=Array.isArray(ce&&ce.criterios)?ce.criterios:[];
    if(!criterios.length) errores.push(`La competencia específica "${nombreCE}" no tiene ningún criterio de evaluación.`);
    criterios.forEach((cr,j)=>{
      const cid=((cr&&cr.id)||"").toString().trim();
      if(!cid) errores.push(`Un criterio de "${nombreCE}" no tiene identificador.`);
      else if(idsCriterio.has(cid)) errores.push(`El identificador de criterio "${cid}" está repetido.`);
      idsCriterio.add(cid||`${nombreCE}.${j+1}`);
      if(!((cr&&cr.texto||"").toString().trim())) errores.push(`El criterio "${cid||j+1}" de "${nombreCE}" no tiene texto.`);
    });
  });
  const bloques=Array.isArray(obj.bloques)?obj.bloques:[];
  if(!bloques.length) errores.push('No se ha definido ningún bloque de calificación (bloque "BLOQUES").');
  let sumaPesos=0;
  bloques.forEach((b,i)=>{
    if(!((b&&b.label||"").toString().trim())) errores.push(`El bloque nº${i+1} no tiene nombre.`);
    const peso=Number(b&&b.peso);
    if(!isFinite(peso)||peso<=0) errores.push(`El bloque "${(b&&b.label)||i+1}" no tiene un porcentaje válido.`);
    else sumaPesos+=peso;
  });
  let aviso=null;
  if(bloques.length && errores.length===0 && Math.abs(sumaPesos-100)>0.5){
    aviso=`Los porcentajes de los bloques suman ${sumaPesos}% (lo habitual es que sumen 100%). Se puede importar igualmente, pero conviene revisarlo.`;
  }
  return {ok:errores.length===0, errores, aviso, materia, curso};
}
function opcionesCatalogosHTML(selectedKey){
  const built=ORDEN_CATALOGOS.filter(k=>!catalogoEstaOculto(k)).map(k=>{
    const c=getCatalogo(k);
    return `<option value="${k}" ${k===selectedKey?"selected":""}>${esc(c.materia)} · ${esc(c.curso)}</option>`;
  }).join("");
  const customKeys=Object.keys(state.catalogosPersonalizados||{}).filter(k=>!CATALOGOS[k]);
  const custom=customKeys.length? `<optgroup label="Materias importadas">${customKeys.map(k=>{
    const c=state.catalogosPersonalizados[k];
    return `<option value="${k}" ${k===selectedKey?"selected":""}>${esc(c.materia)} · ${esc(c.curso)}</option>`;
  }).join("")}</optgroup>` : "";
  return `<optgroup label="Catálogos incluidos (Geografía e Historia)">${built}</optgroup>${custom}`;
}
function actualizarSelectCatalogos(selectedKey){
  const sel=document.getElementById("ngCat"); if(!sel) return;
  sel.innerHTML=opcionesCatalogosHTML(selectedKey);
  sel.value=selectedKey;
  state.ui.nuevoGrupo.catalogoKey=selectedKey; save();
}
function mostrarResultadoImportacion(html){
  const cont=document.getElementById("catImportResultado");
  if(cont) cont.innerHTML=html;
}
window.toggleEjemploCatalogo=()=>{
  const pre=document.getElementById("catEjemplo");
  if(!pre) return;
  const visible=pre.style.display!=="none";
  pre.style.display=visible?"none":"block";
  const btn=document.getElementById("catEjemploBtn");
  if(btn) btn.textContent = visible? "Ver un ejemplo ya relleno" : "Ocultar ejemplo";
};
window.descargarPlantillaCatalogo=()=>{
  const blob=new Blob([plantillaCatalogoTexto()],{type:"text/plain;charset=utf-8"});
  const u=URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=u; a.download="plantilla-materia.txt"; a.click(); URL.revokeObjectURL(u);
};
window.validarEImportarCatalogo=async ()=>{
  const ta=document.getElementById("catTexto");
  const raw=(ta.value||"").trim();
  if(!raw){ mostrarResultadoImportacion('<div class="alert-box">Pega o escribe primero los datos de tu materia en el cuadro de texto (o descarga la plantilla, rellénala y cárgala).</div>'); return; }
  const rawSinComentarios=raw.split(/\r?\n/).filter(l=>!l.trim().startsWith("#")).join("\n");
  if(/\[[^\]\n]{2,80}\]/.test(rawSinComentarios)){
    mostrarResultadoImportacion(`<div class="alert-box" style="border-color:var(--danger);background:#fbeaea">⚠️ <strong>Parece que quedan marcadores de la plantilla sin sustituir</strong>, como <code>[Nombre de la materia]</code>. Sustituye todo lo que esté entre corchetes <code>[así]</code> por tus propios datos y vuelve a intentarlo.</div>`);
    return;
  }
  let obj, erroresFormato=[];
  const pareceJSON=raw.startsWith("{");
  if(pareceJSON){
    try{ obj=JSON.parse(raw); }
    catch(e){ mostrarResultadoImportacion(`<div class="alert-box" style="border-color:var(--danger);background:#fbeaea">⚠️ <strong>El texto parece JSON pero no es válido:</strong> ${esc(e.message)}</div>`); return; }
  } else {
    const parsed=parseCatalogoTexto(raw);
    obj={materia:parsed.materia, curso:parsed.curso, ces:parsed.ces, bloques:parsed.bloques};
    erroresFormato=parsed.erroresFormato;
  }
  const val=validarCatalogo(obj);
  const errores=[...erroresFormato, ...val.errores];
  if(errores.length){
    mostrarResultadoImportacion(`<div class="alert-box" style="border-color:var(--danger);background:#fbeaea;align-items:flex-start">
      <span>⚠️</span>
      <div><strong>No se ha podido importar. Revisa esto:</strong>
        <ul style="margin:6px 0 0;padding-left:18px">${errores.map(e=>`<li>${esc(e)}</li>`).join("")}</ul>
      </div>
    </div>`);
    return;
  }
  const editando=!!state.ui.catEditKey;
  let key;
  if(editando){
    key=state.ui.catEditKey;
  } else {
    key=slugCatalogo(val.materia,val.curso);
    if(state.catalogosPersonalizados[key] && !await confirmar(`Ya tienes una materia importada como "${val.materia} · ${val.curso}". ¿Reemplazarla por esta nueva versión? Los grupos que ya la usan pasarán a usar el catálogo nuevo.`)) return;
  }
  const saberesPorCE={};
  obj.ces.forEach(ce=>{
    const arr=(ce.saberes||[]).map(s=>String(s).trim()).filter(Boolean);
    if(arr.length) saberesPorCE[String(ce.id).trim()]=arr;
  });
  const catalogo={
    materia:val.materia, curso:val.curso,
    ces:obj.ces.map(ce=>({
      id:String(ce.id).trim(), titulo:String(ce.titulo).trim(),
      cc:(ce.cc||[]).map(c=>String(c).trim().toUpperCase()),
      criterios:(ce.criterios||[]).map(cr=>({id:String(cr.id).trim(), texto:String(cr.texto).trim()}))
    })),
    bloques:obj.bloques.map(b=>({label:String(b.label).trim(), peso:Number(b.peso)})),
    saberes:saberesPorCE
  };
  state.catalogosPersonalizados[key]=catalogo;
  delete CAT_CACHE[key];
  state.ui.catImportTexto="";
  state.ui.catEditKey="";
  save();
  const nCrit=catalogo.ces.reduce((n,ce)=>n+ce.criterios.length,0);
  const nSaberes=Object.values(saberesPorCE).reduce((n,arr)=>n+arr.length,0);
  mostrarResultadoImportacion(`<div class="alert-box" style="border-color:var(--accent);background:var(--accent-soft)">
    ✓ <strong>${editando?"Guardado correctamente":"Importado correctamente"}:</strong> ${esc(catalogo.materia)} · ${esc(catalogo.curso)} — ${catalogo.ces.length} competencia${catalogo.ces.length===1?"":"s"} específica${catalogo.ces.length===1?"":"s"}, ${nCrit} criterio${nCrit===1?"":"s"}, ${catalogo.bloques.length} bloque${catalogo.bloques.length===1?"":"s"}${nSaberes?`, ${nSaberes} saber${nSaberes===1?"":"es"} básico${nSaberes===1?"":"s"}`:""}.
    ${val.aviso?`<br>⚠️ ${esc(val.aviso)}`:""}
    ${editando?"":`<br>Ya puedes elegirla en "Crear grupo nuevo", abajo.`}
  </div>`);
  ta.value="";
  actualizarSelectCatalogos(key);
  renderListaCatalogosPersonalizados();
};
function renderListaCatalogosPersonalizados(){
  const cont=document.getElementById("catImportadasLista");
  if(!cont) return;
  const datos=listaPlantillasDatos();
  cont.innerHTML=`<div style="font-size:12.5px;color:var(--mut);margin:14px 0 6px">Todas las plantillas de materia</div>
    <div class="grid">
      ${datos.map(d=>{
        const nCrit=d.cat.ces.reduce((n,ce)=>n+ce.criterios.length,0);
        const badges=`<span class="badge">${d.cat.ces.length} CE · ${nCrit} criterios</span>`
          +(d.oficial?` <span class="badge" style="opacity:.75">oficial</span>`:` <span class="badge" style="opacity:.75">personalizada</span>`)
          +(d.override?` <span class="badge" style="background:var(--accent-soft);color:var(--accent-2)">editada</span>`:"")
          +(d.oculto?` <span class="badge" style="background:var(--danger-soft);color:var(--danger)">oculta</span>`:"");
        const editable=catalogoEsEditableComoTexto(d.cat);
        const botones=[];
        if(d.oculto){
          botones.push(`<button class="ghost" style="border:1px solid var(--line)" onclick="mostrarPlantilla('${d.key}')">Mostrar de nuevo</button>`);
        } else {
          if(editable) botones.push(`<button class="ghost" style="border:1px solid var(--line)" onclick="editarCatalogo('${d.key}')">✏️ Editar</button>`);
          if(d.override) botones.push(`<button class="ghost" style="border:1px solid var(--line)" onclick="restaurarPlantillaOriginal('${d.key}')">↺ Restaurar oficial</button>`);
          botones.push(`<button class="ghost danger" onclick="eliminarPlantilla('${d.key}')">${d.oficial?"Ocultar":"Eliminar"}</button>`);
        }
        return `<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:6px;${d.oculto?"opacity:.6":""}">
          <span style="font-size:13.5px">${esc(d.cat.materia)} · ${esc(d.cat.curso)} ${badges}</span>
          <span class="flex" style="gap:6px">${botones.join("")}</span>
        </div>`;
      }).join("")}
    </div>`;
}
window.borrarCatalogoPersonalizado=key=>window.eliminarPlantilla(key);
/* Tarjeta reutilizable de "Gestionar plantillas de materias" (importar, editar,
   eliminar/ocultar): se usa tanto en Evaluación por Competencias como en
   Programación de Aula, para no tener dos formularios independientes. */
function renderGestionCatalogosHTML(){
  const editando=!!state.ui.catEditKey;
  const catEdit=editando?getCatalogo(state.ui.catEditKey):null;
  return `<div class="card">
    <h2>${editando?"Editar plantilla de materia":"Materias: importar, editar o eliminar plantillas"}</h2>
    ${editando
      ? `<div class="alert-box">✏️ Editando <strong>${esc(catEdit?catEdit.materia:"")} · ${esc(catEdit?catEdit.curso:"")}</strong>. Cambia lo que necesites abajo y pulsa "Guardar cambios", o <a onclick="cancelarEdicionCatalogo()" style="cursor:pointer;text-decoration:underline;color:var(--brand-3)">cancela la edición</a>.</div>`
      : `<p class="sub">¿Impartes una materia distinta a Geografía e Historia? Da de alta tu propio catálogo de competencias específicas, criterios de evaluación y bloques de calificación, y úsalo igual que los precargados. También puedes editar o eliminar/ocultar cualquier plantilla, incluidas las que trae la aplicación de serie.</p>`}
    <div class="flex" style="margin-bottom:14px">
      <button class="btn" onclick="descargarPlantillaCatalogo()">⬇ Descargar plantilla en blanco (.txt)</button>
      <button class="ghost" id="catEjemploBtn" style="border:1px solid var(--line)" onclick="toggleEjemploCatalogo()">Ver un ejemplo ya relleno</button>
    </div>
    <p class="sub" style="margin-top:-8px">Descarga la plantilla, ábrela con cualquier editor de texto (Bloc de notas, TextEdit…), sustituye lo que está entre corchetes <code>[así]</code> por los datos de tu materia y vuelve aquí para cargarla con el botón "cargar un archivo" de más abajo.</p>
    <pre id="catEjemplo" style="display:none;background:var(--paper);border:1px solid var(--line);border-radius:8px;padding:10px 12px;font-size:12px;white-space:pre-wrap;margin-bottom:14px">${esc(ejemploCatalogoTexto())}</pre>
    <details style="margin-bottom:14px">
      <summary style="cursor:pointer;font-size:13.5px;color:var(--accent);font-weight:500">Cómo rellenar el formato (instrucciones)</summary>
      <div style="font-size:13.5px;color:var(--ink);margin-top:10px;line-height:1.65">
        <p>La plantilla descargable ya trae el formato con marcadores de ejemplo, pero por si prefieres escribirlo tú mismo/a, así funciona, una línea por dato:</p>
        <ul style="padding-left:18px;margin:6px 0">
          <li><code>MATERIA: ...</code> y <code>CURSO: ...</code> — el nombre de tu materia y el curso.</li>
          <li><code>BLOQUES</code> seguido de líneas <code>Nombre del bloque = porcentaje</code> (conviene que sumen 100). Son las partes que se combinan para la nota: exámenes, trabajo diario, actitud…</li>
          <li>Una línea <code>CE1: título de la competencia específica | CCL, STEM</code> por cada competencia específica de tu currículum. El número puede ser el que quieras (CE1, CE2…); tras la barra "|" van los códigos de las competencias clave que trabaja (lista abajo).</li>
          <li>Debajo de cada CE, una línea <code>1.1: texto del criterio</code> por cada criterio de evaluación asociado, con la numeración de tu currículum (1.1, 1.2, 2.1…).</li>
          <li><strong>Opcional</strong>: debajo de los criterios de una CE, una línea <code>SABERES:</code> seguida de una línea <code>- texto</code> por cada saber básico de esa competencia. Si los rellenas, Programación de Aula podrá ofrecértelos al elegir los saberes de una Situación de Aprendizaje, en vez de solo el cuadro de texto libre — imprescindible si tu materia no está entre las que trae la aplicación por defecto y quieres hacer una Programación de Aula completa.</li>
          <li>Las líneas que empiezan por <code>#</code> son solo comentarios/explicaciones: la aplicación las ignora al importar, así que puedes dejarlas, borrarlas o añadir las tuyas.</li>
        </ul>
        <p>Las competencias específicas y los criterios son los de tu materia y curso: puedes copiarlos de tu currículum oficial (Real Decreto de enseñanzas mínimas o el decreto de tu comunidad autónoma).</p>
        <p><strong>Competencias clave (CC)</strong> — son las mismas 8 para todas las materias (fijadas por ley); solo tienes que usar sus códigos al definir cada CE:</p>
        <ul style="padding-left:18px;margin:6px 0;columns:2;font-size:13px">
          ${Object.entries(COMP_CLAVE).map(([k,v])=>`<li><strong>${k}</strong> · ${esc(v)}</li>`).join("")}
        </ul>
      </div>
    </details>
    <textarea class="in" id="catTexto" style="width:100%;min-height:160px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:16px" placeholder="MATERIA: ...&#10;CURSO: ...&#10;&#10;BLOQUES&#10;Exámenes = 70&#10;Trabajo diario = 30&#10;&#10;CE1: ... | CCL, STEM&#10;1.1: ...">${esc(state.ui.catImportTexto||"")}</textarea>
    <div class="flex" style="margin-top:8px">
      <button class="btn" onclick="validarEImportarCatalogo()">${editando?"Guardar cambios":"Validar e importar"}</button>
      ${editando?`<button class="ghost" style="border:1px solid var(--line)" onclick="cancelarEdicionCatalogo()">Cancelar</button>`:`<label class="ghost file">o cargar un archivo .txt/.json…<input type="file" accept=".txt,.json,text/plain,application/json" style="display:none" onchange="cargarArchivoCatalogo(this)"></label>`}
    </div>
    <div id="catImportResultado" style="margin-top:10px"></div>
    <div id="catImportadasLista"></div>
  </div>`;
}
function bindGestionCatalogosEventos(){
  const ta=document.getElementById("catTexto");
  if(ta) ta.addEventListener("change",e=>{ state.ui.catImportTexto=e.target.value; save(); });
  renderListaCatalogosPersonalizados();
}

function pesoCriterio(grupo,cid){
  const v=grupo.pesos.crit[cid]; if(v!=null && v!=="") return Number(v);
  const idx=catIndex(grupo.catalogoKey);
  return 100/idx.ceMap[idx.critMap[cid].ceId].criterios.length;
}
function pesoCEenCC(grupo,ceId,cc){
  const v=grupo.pesos.ceCc[ceId+"|"+cc]; if(v!=null && v!=="") return Number(v);
  const idx=catIndex(grupo.catalogoKey);
  return 100/idx.cat.ces.filter(ce=>ce.cc.includes(cc)).length;
}
function defBloque(tipo,bloques){
  const t=tipo.toLowerCase();
  const byKw=kw=>bloques.find(b=>b.label.toLowerCase().includes(kw));
  let b=null;
  if(t.includes("diaria")||t.includes("casa")) b=byKw("diario")||byKw("casa");
  if(!b && t.includes("actitud")) b=byKw("actitud")||byKw("hábito")||byKw("habito");
  if(!b) b=bloques.reduce((max,cur)=>cur.peso>max.peso?cur:max,bloques[0]);
  return b.id;
}

