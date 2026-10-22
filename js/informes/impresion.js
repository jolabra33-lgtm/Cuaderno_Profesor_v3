/* ============================================================================
   Cuaderno del profesor · Impresión sin ventanas emergentes e informe del alumno
   js/informes/impresion.js
   ============================================================================ */

/* =================================================================
   v4 · IMPRESIÓN SIN VENTANAS EMERGENTES
   Antes cada informe se abría en una ventana nueva (window.open): el
   navegador la bloqueaba a menudo y en el iPad, con la app instalada en
   la pantalla de inicio, no siempre funcionaba. Ahora el documento se
   muestra dentro de la propia app, aislado en un Shadow DOM (sus estilos
   no se mezclan con los de la app), con tres botones:
     🖨️ Imprimir / PDF · ⬇ Guardar (archivo .html, o menú Compartir en
     iPad) · ✕ Cerrar.
   Al imprimir, la hoja de estilos de impresión oculta todo lo demás.
   ================================================================= */
let _imprimibleActual=null;
function _adaptarCSSImprimible(css){
  const paginas=[];
  css=css.replace(/@page\s*\{[^}]*\}/g,m=>{ paginas.push(m); return ""; });
  css=css.replace(/(^|[\s,}])html\s*,\s*body\s*\{/g,"$1.doc-root{").replace(/(^|[\s,}])body\s*\{/g,"$1.doc-root{").replace(/(^|[\s,}])html\s*\{/g,"$1:host{");
  css=css.replace(/\bbody\s+(?=[.#\w])/g,".doc-root ");
  return {css,paginas};
}
function mostrarImprimible(docHtml,titulo){
  cerrarImprimible();
  let doc; try{ doc=new DOMParser().parseFromString(docHtml,"text/html"); }catch(e){ doc=null; }
  const estilos=doc?[...doc.querySelectorAll("style")].map(x=>x.textContent).join("\n"):"";
  const cuerpo=doc?doc.body.innerHTML:docHtml;
  const {css,paginas}=_adaptarCSSImprimible(estilos);
  const ov=document.createElement("div");
  ov.id="printOverlay"; ov.className="modal-overlay print-overlay";
  ov.setAttribute("role","dialog"); ov.setAttribute("aria-modal","true"); ov.setAttribute("aria-label","Vista previa: "+(titulo||"documento"));
  ov.innerHTML=`<div class="print-toolbar">
      <strong class="print-titulo">${esc(titulo||"Vista previa")}</strong>
      <span style="flex:1"></span>
      <button class="btn" id="prtImprimir">🖨️ Imprimir / Guardar PDF</button>
      <button class="ghost" id="prtGuardar" style="border:1px solid rgba(255,255,255,.4);color:#fff">⬇ Guardar archivo</button>
      <button class="ghost modal-close" id="prtCerrar" aria-label="Cerrar vista previa" style="color:#fff;font-size:20px">✕</button>
    </div>
    <div class="print-scroll"><div class="print-hoja"></div></div>`;
  document.body.appendChild(ov);
  document.body.classList.add("imprimiendo");
  const host=ov.querySelector(".print-hoja");
  const sh=host.attachShadow({mode:"open"});
  sh.innerHTML=`<style>:host{all:initial;display:block}
    .doc-root{display:block;background:#fff;color:#222;font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.4}
    ${css}
    .doc-root .btnbar{display:none!important}
    .doc-root{box-sizing:border-box}
    @media screen{ .doc-root{margin:0 auto!important;padding:28px;box-shadow:0 2px 18px rgba(0,0,0,.25);border-radius:4px;width:auto!important} }
    @media print{ .doc-root{margin:0!important;padding:0!important;width:auto!important;max-width:100%!important;box-shadow:none!important;border-radius:0!important} }
  </style><div class="doc-root">${cuerpo}</div>`;
  let pag=document.getElementById("printPageRule");
  if(!pag){ pag=document.createElement("style"); pag.id="printPageRule"; document.head.appendChild(pag); }
  pag.textContent=paginas.join("\n");
  _imprimibleActual={docHtml,titulo:titulo||"documento"};
  ov.querySelector("#prtImprimir").onclick=()=>{ try{ window.print(); }catch(e){ mostrarAviso("No se ha podido abrir la impresión. Usa «Guardar archivo» y ábrelo en el navegador para imprimirlo."); } };
  ov.querySelector("#prtGuardar").onclick=()=>{
    const nombre=(titulo||"documento").replace(/[\\/:*?"<>|·]+/g," ").replace(/\s+/g," ").trim().slice(0,90)+".html";
    guardarArchivo(new Blob([docHtml],{type:"text/html"}),nombre);
  };
  ov.querySelector("#prtCerrar").onclick=cerrarImprimible;
  setTimeout(()=>{ try{ ov.querySelector("#prtImprimir").focus(); }catch(e){} },30);
}
function cerrarImprimible(){
  const ov=document.getElementById("printOverlay"); if(ov) ov.remove();
  document.body.classList.remove("imprimiendo");
  const pag=document.getElementById("printPageRule"); if(pag) pag.textContent="";
  _imprimibleActual=null;
}
window.cerrarImprimible=cerrarImprimible;
/* Portada estándar (mismo estilo que la de Memoria/Programación de Aula) para
   cualquier documento imprimible: cabecera con el centro, título del
   documento, curso escolar y profesor/a, y opcionalmente un índice de
   contenidos. "subtitulos" es un array de fragmentos HTML ya construidos
   (no se escapan) y "indiceItems" un array de textos planos (sí se escapan). */
function generarPortadaHTML(titulo,subtitulos,indiceItems){
  const subt=(subtitulos||[]).filter(Boolean).map(s=>`<div style="font-size:1rem;color:rgba(255,255,255,.9);margin-top:8px">${s}</div>`).join("");
  const indice=(indiceItems||[]).filter(Boolean);
  return `<div style="min-height:85vh;display:flex;flex-direction:column;justify-content:center;page-break-after:always">
    <div style="background:linear-gradient(135deg,#152a44,#25456b);color:#fff;padding:26px 30px;border-radius:12px;text-align:center">
      <div style="font-size:1.15rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em">${esc(state.centroNombre)||"Cuaderno del profesor"}</div>
      ${state.centroCodigo?`<div style="font-size:.8rem;color:rgba(255,255,255,.7);margin-top:2px">Cód. Centro: ${esc(state.centroCodigo)}</div>`:""}
      <div style="margin-top:22px;font-size:1.6rem;font-weight:700">${esc(titulo)}</div>
      ${subt}
    </div>
    ${indice.length?`<div style="margin-top:40px">
      <h2 style="border-bottom:1px solid #ccc;padding-bottom:6px">Índice</h2>
      <ul style="list-style:none;padding:0;margin:10px 0 0">
        ${indice.map(t=>`<li style="padding:6px 0;border-bottom:1px dotted #ccc;font-size:14px">${esc(t)}</li>`).join("")}
      </ul>
    </div>`:""}
  </div>`;
}
function abrirVentanaInforme(titulo,bodyHtml,opts){
  opts=opts||{};
  const paisaje=!!opts.landscape;
  const centrado=!!opts.center;
  const maxWidth=opts.maxWidth||"820px";
  const margenBody = centrado ? "28px auto" : "28px";
  mostrarImprimible(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
  <style>
    @page{ margin:1.5cm ${paisaje?"1.3cm":"2cm"}; ${paisaje?"size: A4 landscape;":""} }
    *{box-sizing:border-box}
    body{font-family:system-ui,sans-serif;color:#222;margin:${margenBody};max-width:${maxWidth};width:100%;print-color-adjust:exact;-webkit-print-color-adjust:exact}
    h1{font-size:19px;margin:0 0 2px}
    h2{font-size:15px;margin:22px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px}
    .meta{color:#666;font-size:13px;margin-bottom:18px}
    table{border-collapse:collapse;width:100%;font-size:13px;margin-bottom:6px}
    th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #ddd}
    th{color:#555}
    tr{page-break-inside:avoid}
    thead{display:table-header-group}
    .pill{display:inline-block;padding:2px 9px;border-radius:10px;font-size:12px;font-weight:600}
    .btnbar{margin-bottom:22px}
    button{padding:8px 16px;font-size:14px;cursor:pointer}
    .alert{background:#fcf4e3;border:1px solid #b57b0e;padding:10px;font-size:13px;border-radius:6px;margin:10px 0}
    @media print{ .btnbar{display:none} ${centrado?"body{margin:0 auto}":""} }
  </style></head><body>
  <div class="btnbar"><button onclick="window.print()">Imprimir / Guardar como PDF</button> <button onclick="window.close()" style="background:#eee;color:#333">✕ Cerrar</button></div>
  ${opts.portada||""}
  ${bodyHtml}
  </body></html>`, titulo);
}
function pillPlain(grupo,p){ const nv=nivel(grupo,p); if(!nv) return "—"; return `<span class="pill" style="background:${nv.bg};color:${nv.fg}">${p.toFixed(0)}% ${nv.etq}</span>`; }

function informeAlumnoBodyHTML(grupo,al,opts){
  opts=opts||{};
  const cat=getCatalogo(grupo.catalogoKey); const idx=catIndex(grupo.catalogoKey);
  const trim=state.ui.trim;
  const nt=notaTrimestre(grupo,al.id,trim), nf=notaFinal(grupo,al.id);
  const ccT=Object.keys(COMP_CLAVE).filter(cc=>idx.cat.ces.some(ce=>ce.cc.includes(cc))).map(cc=>({cc,p:scoreCC(grupo,al.id,cc)})).filter(x=>x.p!=null);
  const ceT=idx.cat.ces.map(ce=>({ce,p:scoreCE(grupo,al.id,ce.id)})).filter(x=>x.p!=null);
  const filas3=TRIMESTRES.map((t,i)=>{const v=notaTrimestre(grupo,al.id,i); const com=(al.comentariosEval&&al.comentariosEval[i])||"";
    return `<tr><td>${t}</td><td>${fmt(v)}</td><td>${pillCuant(v)}</td><td>${com?esc(com):"—"}</td></tr>`;}).join("");

  const actsT = actsTrim(grupo);
  let htmlActsPDF = `<h2>Desglose de actividades (${TRIMESTRES[trim]})</h2>`;
  if (actsT.length === 0) {
      htmlActsPDF += '<p>Sin actividades en este periodo.</p>';
  } else {
      const sdaMap = {};
      actsT.forEach(a => { const s = a.sda || 'Sin SdA'; if(!sdaMap[s]) sdaMap[s]=[]; sdaMap[s].push(a); });
      Object.keys(sdaMap).forEach(sda => {
          if(sda !== 'Sin SdA') htmlActsPDF += `<h3 style="font-size:13px;color:#666;margin:12px 0 4px">${esc(sda)}</h3>`;
          htmlActsPDF += '<table><thead><tr><th>Actividad</th><th>Tipo</th><th>Nota (0-10)</th></tr></thead><tbody>';
          sdaMap[sda].forEach(a => {
             const val = notaActividad(grupo, al.id, a);
             const _m = marcaDe(grupo, al.id, a.id);
             const _vr = a.recupera ? notaActividadBase(grupo, al.id, a) : null;
             const valDisplay = _m==="NP" ? "NP (0)" : _m==="EX" ? "Exento" : a.recupera ? (_vr==null ? "—" : fmt(_vr)+" (recuperación)") : (val == null ? "—" : fmt(val));
             htmlActsPDF += `<tr><td>${esc(a.nombre)}</td><td>${esc(a.tipo)}</td><td><strong>${valDisplay}</strong></td></tr>`;
          });
          htmlActsPDF += '</tbody></table>';
      });
  }

  const critTrabajados = new Set();
  actsT.forEach(a => a.criterios.forEach(c => critTrabajados.add(c.critId)));
  const critSinNota = [];
  critTrabajados.forEach(cid => { if(scoreCriterio(grupo, al.id, cid) == null) critSinNota.push(cid); });
  const htmlAlertaAsimetria = critSinNota.length > 0 
     ? `<div class="alert">⚠️ <strong>Atención:</strong> El alumno no tiene calificación en los siguientes criterios trabajados por el grupo este trimestre: ${critSinNota.join(', ')}.</div>`
     : '';

  const asistCnt=asistContarPeriodo(grupo,al.id,"2000-01-01","2099-12-31");
  const htmlAsistencia=`<h2>Asistencia (curso completo hasta la fecha)</h2>
    <table><tbody>
      <tr><th style="width:200px">Faltas justificadas</th><td>${asistCnt.falta_justificada}</td></tr>
      <tr><th>Faltas no justificadas</th><td>${asistCnt.falta_no_justificada}</td></tr>
      <tr><th>Retrasos</th><td>${asistCnt.retraso}</td></tr>
    </tbody></table>`;

  const convEntradas=(grupo.convivencia||[]).filter(e=>e.alumnoId===al.id);
  const convCnt=convContarTipos(grupo,al.id,"2000-01-01","2099-12-31");
  const htmlConvivencia=`<h2>Convivencia (curso completo hasta la fecha)</h2>
    <table><tbody>
      <tr><th style="width:200px">Faltas de actitud y comportamiento (AC)</th><td>${convCnt.ac}</td></tr>
      <tr><th>Reconocimientos positivos (RC)</th><td>${convCnt.rc}</td></tr>
      <tr><th>Partes de amonestación (PA)</th><td>${convCnt.pa}</td></tr>
    </tbody></table>
    ${convEntradas.length?`<table style="margin-top:6px"><thead><tr><th style="width:95px">Fecha</th><th style="width:50px">Tipo</th><th>Descripción</th></tr></thead><tbody>
      ${convEntradas.slice().sort((a,b)=>a.fecha.localeCompare(b.fecha)).map(e=>`<tr><td>${fmt2(e.fecha)}</td><td>${convTipoInfo(e.tipo).corto}</td><td>${e.tipo==="pa"?esc(paResumenTexto(e.pa)):esc(e.descripcion||"—")}</td></tr>`).join("")}
    </tbody></table>`:""}`;

  return `
    <div${opts.pageBreak?' style="page-break-before:always;break-before:page"':''}>
    <h1>Informe individual de evaluación</h1>
    <div class="meta">${esc(cat.materia)} · ${esc(cat.curso)} · Grupo ${esc(grupo.nombre)} · ${TRIMESTRES[trim]} · Generado el ${new Date().toLocaleDateString("es-ES")}</div>
    <h2>Alumno/a: ${esc(al.nombre)}</h2>
    ${htmlAlertaAsimetria}
    <table><thead><tr><th>Periodo</th><th>Nota</th><th>Calificación</th><th>Comentario a la calificación</th></tr></thead><tbody>${filas3}<tr><td><strong>Nota final</strong></td><td><strong>${fmt(nf)}</strong></td><td>${pillCuant(nf)}</td><td></td></tr></tbody></table>
    ${htmlAsistencia}
    ${htmlConvivencia}
    ${htmlActsPDF}
    <h2>Competencias clave trabajadas</h2>
    ${ccT.length?`<table><thead><tr><th>Competencia clave</th><th>Adquisición</th><th>Actividades y exámenes utilizados</th></tr></thead><tbody>
      ${ccT.map(x=>`<tr><td>${x.cc} · ${COMP_CLAVE[x.cc]}</td><td>${pillPlain(grupo,x.p)}</td><td style="font-size:12px;color:#555">${esc(abrevActs(actividadesDeCC(grupo,al.id,x.cc),4))}</td></tr>`).join("")}</tbody></table>`:"<p>Sin datos en este periodo.</p>"}
    <h2>Competencias específicas trabajadas</h2>
    ${ceT.length?`<table><thead><tr><th>Competencia específica</th><th>Adquisición</th><th>Actividades y exámenes utilizados</th></tr></thead><tbody>
      ${ceT.map(x=>`<tr><td>${x.ce.id} · ${esc(x.ce.titulo)}</td><td>${pillPlain(grupo,x.p)}</td><td style="font-size:12px;color:#555">${esc(abrevActs(actividadesDeCE(grupo,al.id,x.ce.id),4))}</td></tr>`).join("")}</tbody></table>`:"<p>Sin datos en este periodo.</p>"}
    </div>
  `;
}
window.exportarInformeAlumno=alId=>{
  const grupo=grupoActual();
  const al=grupo.alumnos.find(a=>a.id===alId);
  const cat=getCatalogo(grupo.catalogoKey);
  const portada=generarPortadaHTML(`Informe individual — ${al.nombre}`,
    [`${esc(cat.materia)} · ${esc(cat.curso)} · Grupo ${esc(grupo.nombre)}`,
     `<strong>${esc(TRIMESTRES[state.ui.trim])}</strong>`,
     `Curso escolar: <strong>${esc(cursoEscolarEfectivo(null))}</strong>`,
     profesorNombreEfectivo(null)?`Elaborado por: <strong>${esc(profesorNombreEfectivo(null))}</strong>`:""], []);
  abrirVentanaInforme(`Informe · ${al.nombre}`, informeAlumnoBodyHTML(grupo,al), {portada});
};
window.exportarInformesTodos=()=>{
  const grupo=grupoActual();
  if(!grupo.alumnos.length){ mostrarAviso("Este grupo todavía no tiene alumnado."); return; }
  const cat=getCatalogo(grupo.catalogoKey);
  const partes=grupo.alumnos.map((al,i)=>informeAlumnoBodyHTML(grupo,al,{pageBreak:i>0}));
  const portada=generarPortadaHTML(`Informes individuales — ${grupo.nombre}`,
    [`${esc(cat.materia)} · ${esc(cat.curso)}`,
     `<strong>${esc(TRIMESTRES[state.ui.trim])}</strong>`,
     `Curso escolar: <strong>${esc(cursoEscolarEfectivo(null))}</strong>`,
     profesorNombreEfectivo(null)?`Elaborado por: <strong>${esc(profesorNombreEfectivo(null))}</strong>`:""],
    grupo.alumnos.map(al=>al.nombre));
  abrirVentanaInforme(`Informes individuales · ${grupo.nombre}`, partes.join(""), {portada});
};

