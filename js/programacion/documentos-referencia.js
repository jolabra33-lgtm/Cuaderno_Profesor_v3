/* ============================================================================
   Cuaderno del profesor · Documentos de referencia de cada Programación de Aula
   js/programacion/documentos-referencia.js
   ============================================================================ */

/* Cada Programación de Aula tiene dos huecos fijos: el «Modelo de Programación de Aula» y la «Propuesta
   Pedagógica». En cada uno se puede guardar:
     - un ENLACE (p. ej. de OneDrive): abre siempre la última versión, pero necesita conexión;
     - el PDF dentro de la app: se ve también sin conexión.
   En el estado solo va la referencia (p.documentos[tipo] = {enlace, archivo:{id,nombre,tamano,fecha}}). El PDF
   va en la base de datos de los diseños de examen con la clave «prog:doc:<id>» (js/corrector/editor-examenes.js):
   así entra solo en todas las copias que ya incluyen los diseños (Exportar copia, copia cifrada, copia en carpeta,
   Empezar curso nuevo) y vuelve al importarlas, sin inflar localStorage ni la pila de deshacer.
   - El id del archivo cambia cada vez que se sube un PDF, así que un mismo id es siempre el mismo contenido.
     «Duplicar» comparte el archivo; se borra de la base de datos cuando ya no lo usa ninguna programación.
   - Quitar un PDF o eliminar la programación lo borra del dispositivo: deshacer (↶) devuelve la referencia,
     pero no el archivo; la app lo dice y pide volver a subirlo.
   - Para verlo se usa pdf.js (tutoria/vendor/, también guardado para el uso sin conexión). */
const PROG_DOCS=[
  {id:"modelo",titulo:"Modelo de Programación de Aula",corto:"Modelo"},
  {id:"propuesta",titulo:"Propuesta Pedagógica",corto:"Propuesta Pedagógica"}
];
const PROG_DOC_MAX_MB=25;
const PROG_DOC_PREFIJO="prog:doc:";
function progDocTipo(tipo){ return PROG_DOCS.find(d=>d.id===tipo)||null; }
function progDoc(p,tipo){
  const d=p&&p.documentos&&typeof p.documentos==="object"? p.documentos[tipo] : null;
  return d&&typeof d==="object"? d : {};
}
/* El enlace se vuelve a comprobar al usarlo: una copia manipulada podría traer «javascript:…». */
function progDocEnlace(p,tipo){ return progDocEnlaceNormalizado(progDoc(p,tipo).enlace)||""; }
function progDocArchivo(p,tipo){ const a=progDoc(p,tipo).archivo; return a&&typeof a==="object"&&a.id? a : null; }
function progDocTamanoTexto(b){
  b=Number(b)||0;
  return b<1024*1024? Math.max(1,Math.round(b/1024))+" KB" : String(Math.round(b/1024/1024*10)/10).replace(".",",")+" MB";
}
/* Solo direcciones web. Sin «https://» delante se añade; cualquier otra cosa (javascript:, data:…) se rechaza. */
function progDocEnlaceNormalizado(v){
  let u=String(v||"").trim(); if(!u) return "";
  if(!/^[a-z][a-z0-9+.-]*:/i.test(u)) u="https://"+u;
  if(!/^https?:\/\/[^\s"'<>`]+$/i.test(u)) return null;
  return u;
}
/* PDF guardado: {datos:"data:application/pdf;base64,…"}. Primero la copia en memoria (sin esperar). */
function progDocRegistroSync(id){
  const todos=typeof exTodosSync==="function"? exTodosSync() : null;
  return todos? (todos.find(r=>r.key===PROG_DOC_PREFIJO+id)||null) : undefined;
}
async function progDocRegistro(id){
  const r=progDocRegistroSync(id); if(r!==undefined && r) return r;
  try{ return (await exGet(PROG_DOC_PREFIJO+id))||null; }catch(e){ return null; }
}
function progDocDatosValidos(datos){
  if(typeof datos!=="string" || !datos.startsWith("data:application/pdf;base64,")) return false;
  try{ return atob(datos.slice(28,28+12)).startsWith("%PDF-"); }catch(e){ return false; }
}
function progDocEnUso(id){
  return (state.programaciones||[]).some(p=>PROG_DOCS.some(d=>{ const a=progDocArchivo(p,d.id); return a&&a.id===id; }));
}
async function progDocBorrarSiNoSeUsa(id){
  if(!id || progDocEnUso(id)) return;
  try{ await exBorrar(PROG_DOC_PREFIJO+id); }catch(e){}
}
function progDocAsegurar(p,tipo){
  if(!p.documentos||typeof p.documentos!=="object") p.documentos={};
  if(!p.documentos[tipo]||typeof p.documentos[tipo]!=="object") p.documentos[tipo]={enlace:"",archivo:null};
  return p.documentos[tipo];
}

/* ---- Tarjeta en el detalle de la programación ---- */
function progDocsCardHTML(p){
  const pid=escJS(p.id);
  const fila=d=>{
    const a=progDocArchivo(p,d.id), enlace=progDocEnlace(p,d.id);
    const subir=texto=>`<label class="ghost file" style="border:1px solid var(--line)">${texto}
        <input type="file" accept="application/pdf,.pdf" style="display:none" aria-label="${esc(texto+": "+d.titulo)}" onchange="progDocSubir('${pid}','${d.id}',this)"></label>`;
    return `<div class="prog-doc" style="border:1px solid var(--line);border-radius:12px;padding:10px 12px">
      <div style="font-weight:700;font-size:14px">📄 ${d.titulo}</div>
      <div class="flex" style="gap:8px;margin-top:8px;align-items:center">
        ${a?`<button class="btn small" onclick="progDocVer('${pid}','${d.id}')">📖 Ver el PDF</button>
          <span class="sub" style="margin:0;font-size:12.5px">${esc(a.nombre||"documento.pdf")} · ${progDocTamanoTexto(a.tamano)}${a.fecha?" · guardado el "+esc(cxFechaCorta(a.fecha)):""}</span>
          ${subir("Cambiar PDF")}
          <button class="ghost danger" onclick="progDocQuitar('${pid}','${d.id}')">Quitar PDF</button>`
         :`${subir("⬆ Guardar el PDF en la app")}<span class="sub" style="margin:0;font-size:12.5px">Se podrá ver sin conexión (máximo ${PROG_DOC_MAX_MB} MB).</span>`}
      </div>
      <div class="flex" style="gap:8px;margin-top:8px;align-items:center">
        <input class="in" style="flex:1;min-width:200px" value="${esc(enlace)}" placeholder="Enlace de OneDrive (Compartir → Copiar vínculo)" aria-label="${esc("Enlace: "+d.titulo)}" onchange="progDocSetEnlace('${pid}','${d.id}',this.value)">
        ${enlace?`<a class="ghost" style="border:1px solid var(--line);text-decoration:none" href="${esc(enlace)}" target="_blank" rel="noopener noreferrer">☁️ Abrir en OneDrive</a>`:""}
      </div>
    </div>`;
  };
  return `<div class="card">
    <h2 style="font-size:15px;margin:0 0 4px">📎 Documentos de referencia</h2>
    <p class="sub" style="margin:0 0 10px">El modelo de programación y la Propuesta Pedagógica que sigue esta programación. Guarda el PDF en la app para verlo sin conexión y, si quieres, el enlace de OneDrive para abrir siempre la última versión.</p>
    <div class="grid" style="gap:10px">${PROG_DOCS.map(fila).join("")}</div>
  </div>`;
}
/* Accesos rápidos en el listado de programaciones. */
function progDocsChipsHTML(p){
  const hay=PROG_DOCS.filter(d=>progDocArchivo(p,d.id)||progDocEnlace(p,d.id));
  if(!hay.length) return "";
  return `<div class="flex" style="gap:6px;margin-top:6px" onclick="event.stopPropagation()">${hay.map(d=>`<button class="ghost small" style="border:1px solid var(--line)" onclick="progDocAbrir('${escJS(p.id)}','${d.id}')">📄 ${d.corto}</button>`).join("")}</div>`;
}

/* ---- Acciones ---- */
window.progDocSetEnlace=(progId,tipo,valor)=>{
  const p=progPorId(progId); if(!p||!progDocTipo(tipo)) return;
  const u=progDocEnlaceNormalizado(valor);
  if(u===null){ render(); mostrarAviso("Ese enlace no es una dirección web. Cópialo desde OneDrive con «Compartir → Copiar vínculo» y pégalo aquí."); return; }
  progDocAsegurar(p,tipo).enlace=u;
  save(); render();
  if(u) mostrarToast("✓ Enlace guardado");
};
window.progDocSubir=(progId,tipo,inp)=>{
  const file=inp&&inp.files&&inp.files[0]; if(inp) inp.value="";
  const p=progPorId(progId), d=progDocTipo(tipo); if(!file||!p||!d) return;
  if(!/\.pdf$/i.test(file.name||"") && file.type!=="application/pdf"){ mostrarAviso("Elige un archivo PDF."); return; }
  if(file.size>PROG_DOC_MAX_MB*1024*1024){ mostrarAviso(`El PDF ocupa ${progDocTamanoTexto(file.size)}: el máximo es ${PROG_DOC_MAX_MB} MB. Guarda solo el enlace de OneDrive, o reduce el PDF.`); return; }
  const rd=new FileReader();
  rd.onload=async()=>{
    const datos="data:application/pdf;base64,"+String(rd.result||"").split(",")[1];
    if(!progDocDatosValidos(datos)){ mostrarAviso("Este archivo no es un PDF válido."); return; }
    const id=uid(), viejo=progDocArchivo(p,tipo);
    try{ await exPut({key:PROG_DOC_PREFIJO+id,doc:{nombre:file.name||"documento.pdf",tamano:file.size,datos},actualizado:Date.now()}); }
    catch(e){ mostrarAviso("No se ha podido guardar el PDF en este dispositivo (puede que no quede espacio). Guarda al menos el enlace de OneDrive."); return; }
    progDocAsegurar(p,tipo).archivo={id,nombre:String(file.name||"documento.pdf").slice(0,200),tamano:file.size,fecha:fechaISOLocal()};
    save(); render();
    if(viejo) await progDocBorrarSiNoSeUsa(viejo.id);
    mostrarToast("✓ PDF guardado en la app: "+d.titulo);
  };
  rd.onerror=()=>mostrarAviso("No se ha podido leer el archivo.");
  rd.readAsDataURL(file);
};
window.progDocQuitar=async(progId,tipo)=>{
  const p=progPorId(progId), d=progDocTipo(tipo), a=progDocArchivo(p,tipo); if(!p||!d||!a) return;
  if(!await confirmar(`¿Quitar el PDF «${a.nombre||"documento.pdf"}» (${d.titulo}) de este dispositivo?\n\nEl enlace de OneDrive, si lo hay, se conserva. Para volver a tenerlo sin conexión tendrás que guardarlo otra vez.`,{ok:"Quitar",peligro:true})) return;
  progDocAsegurar(p,tipo).archivo=null;
  save(); render();
  await progDocBorrarSiNoSeUsa(a.id);
};
/* Desde el listado: el PDF si está en la app; si no, el enlace. */
window.progDocAbrir=(progId,tipo)=>{
  const p=progPorId(progId); if(!p) return;
  if(progDocArchivo(p,tipo)) return progDocVer(progId,tipo);
  const u=progDocEnlace(p,tipo); if(!u) return;
  const a=document.createElement("a"); a.href=u; a.target="_blank"; a.rel="noopener noreferrer"; document.body.appendChild(a); a.click(); a.remove();
};

/* ---- Visor (pdf.js), dentro de la app ---- */
let _pdfJsPromesa=null;
function progDocCargarPdfJs(){
  if(window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return _pdfJsPromesa||(_pdfJsPromesa=new Promise((ok,ko)=>{
    const s=document.createElement("script"); s.src="tutoria/vendor/pdf.min.js";
    s.onload=()=>{ if(!window.pdfjsLib){ _pdfJsPromesa=null; ko(new Error("pdf.js")); return; } window.pdfjsLib.GlobalWorkerOptions.workerSrc="tutoria/vendor/pdf.worker.min.js"; ok(window.pdfjsLib); };
    s.onerror=()=>{ _pdfJsPromesa=null; ko(new Error("pdf.js")); };
    document.head.appendChild(s);
  }));
}
function progDocBytes(datos){
  const bin=atob(datos.slice(datos.indexOf(",")+1)), n=bin.length, u=new Uint8Array(n);
  for(let i=0;i<n;i++) u[i]=bin.charCodeAt(i);
  return u;
}
window.progDocVer=async(progId,tipo)=>{
  const p=progPorId(progId), d=progDocTipo(tipo), a=progDocArchivo(p,tipo); if(!p||!d||!a) return;
  const rec=await progDocRegistro(a.id);
  if(!rec||!rec.doc||!progDocDatosValidos(rec.doc.datos)){
    mostrarAviso(`El PDF de «${d.titulo}» no está guardado en este dispositivo (puede que se quitara o que la copia que cargaste no lo llevara). Vuelve a guardarlo con «Cambiar PDF».`);
    return;
  }
  const enlace=progDocEnlace(p,tipo);
  const bytes=progDocBytes(rec.doc.datos);
  const url=URL.createObjectURL(new Blob([bytes],{type:"application/pdf"}));
  const ov=document.createElement("div");
  ov.className="modal-overlay prog-doc-visor"; ov.setAttribute("role","dialog"); ov.setAttribute("aria-modal","true"); ov.setAttribute("aria-label",d.titulo);
  ov.innerHTML=`<div class="modal-box prog-doc-caja">
    <div class="flex" style="justify-content:space-between;align-items:center;gap:8px;flex-wrap:nowrap">
      <div style="min-width:0"><strong style="font-size:15px">📄 ${d.titulo}</strong><div class="sub" style="margin:0;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.nombre||"")} · ${esc(p.nombre)}</div></div>
      <div class="flex" style="gap:6px;flex-wrap:nowrap;flex-shrink:0">
        <a class="ghost" style="border:1px solid var(--line);text-decoration:none" href="${url}" download="${esc(a.nombre||"documento.pdf")}">⬇<span class="tb-fuera-movil"> Descargar</span></a>
        ${enlace?`<a class="ghost" style="border:1px solid var(--line);text-decoration:none" href="${esc(enlace)}" target="_blank" rel="noopener noreferrer">☁️<span class="tb-fuera-movil"> OneDrive</span></a>`:""}
        <button class="modal-close" aria-label="Cerrar">×</button>
      </div>
    </div>
    <div class="prog-doc-paginas" tabindex="0" aria-label="Páginas del PDF"><p class="sub" style="text-align:center;margin:30px 0">Abriendo el PDF…</p></div>
  </div>`;
  let doc=null, obs=null;
  const cerrar=()=>{ if(obs) obs.disconnect(); try{ doc&&doc.destroy(); }catch(e){} ov.remove(); setTimeout(()=>URL.revokeObjectURL(url),60000); };
  ov.querySelector(".modal-close").onclick=cerrar;
  ov.addEventListener("click",e=>{ if(e.target===ov) cerrar(); });
  document.body.appendChild(ov);
  ov.querySelector(".modal-close").focus();
  const cont=ov.querySelector(".prog-doc-paginas");
  try{
    const pdfjs=await progDocCargarPdfJs();
    doc=await pdfjs.getDocument({data:bytes}).promise;
    if(!ov.isConnected){ doc.destroy(); return; }
    cont.innerHTML="";
    const ancho=()=>Math.max(200,cont.clientWidth-16);
    const pintar=async(div)=>{
      if(div.dataset.pintada) return; div.dataset.pintada="1";
      const pag=await doc.getPage(Number(div.dataset.n));
      const v1=pag.getViewport({scale:1}), esc_=ancho()/v1.width, dpr=Math.min(window.devicePixelRatio||1,2);
      const vp=pag.getViewport({scale:esc_*dpr});
      const c=document.createElement("canvas"); c.width=Math.floor(vp.width); c.height=Math.floor(vp.height);
      c.style.width="100%"; c.style.height="auto"; c.setAttribute("aria-hidden","true");
      await pag.render({canvasContext:c.getContext("2d"),viewport:vp}).promise;
      div.style.minHeight=""; div.textContent=""; div.appendChild(c);
    };
    obs=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting) pintar(e.target).catch(()=>{}); }),{root:cont,rootMargin:"600px 0px"});
    const p1=await doc.getPage(1), v=p1.getViewport({scale:1}), proporcion=v.height/v.width;
    for(let n=1;n<=doc.numPages;n++){
      const div=document.createElement("div"); div.className="prog-doc-pagina"; div.dataset.n=n;
      div.setAttribute("role","img"); div.setAttribute("aria-label",`Página ${n} de ${doc.numPages}`);
      div.style.minHeight=Math.round(ancho()*proporcion)+"px";
      cont.appendChild(div); obs.observe(div);
    }
  }catch(e){
    if(!ov.isConnected) return;
    cont.innerHTML=`<p class="sub" style="text-align:center;margin:30px 12px">No se ha podido mostrar el PDF aquí. Usa <strong>⬇ Descargar</strong> para abrirlo con el visor del dispositivo.</p>`;
  }
};

/* ---- Exportar / importar una programación con sus PDF ---- */
/* Datos de los PDF de una programación, para meterlos en el .json exportado ({id: "data:application/pdf;base64,…"}). */
function progDocsParaExportar(p){
  const out={};
  PROG_DOCS.forEach(d=>{ const a=progDocArchivo(p,d.id); if(!a) return; const r=progDocRegistroSync(a.id); if(r&&r.doc&&progDocDatosValidos(r.doc.datos)) out[a.id]=r.doc.datos; });
  return out;
}
/* Documentos de una programación importada: enlaces válidos y PDF guardados con un id nuevo. */
async function progDocsDeImportada(original,pdfs){
  const docs={};
  for(const d of PROG_DOCS){
    const o=original&&original.documentos&&original.documentos[d.id]; if(!o||typeof o!=="object") continue;
    const enlace=progDocEnlaceNormalizado(o.enlace)||"";
    let archivo=null;
    const a=o.archivo, datos=a&&pdfs&&typeof a.id==="string"? pdfs[a.id] : null;
    if(a && progDocDatosValidos(datos)){
      const id=uid();
      try{
        await exPut({key:PROG_DOC_PREFIJO+id,doc:{nombre:String(a.nombre||"documento.pdf").slice(0,200),tamano:Number(a.tamano)||0,datos},actualizado:Date.now()});
        archivo={id,nombre:String(a.nombre||"documento.pdf").slice(0,200),tamano:Number(a.tamano)||0,fecha:typeof a.fecha==="string"&&/^\d{4}-\d\d-\d\d$/.test(a.fecha)?a.fecha:fechaISOLocal()};
      }catch(e){}
    }
    if(enlace||archivo) docs[d.id]={enlace,archivo};
  }
  return docs;
}
