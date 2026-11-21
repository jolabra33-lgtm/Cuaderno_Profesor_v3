/* ============================================================================
   Cuaderno del profesor · Panel para las familias (informe en el móvil)
   js/informes/panel-familias.js
   ============================================================================ */

/* Un archivo .html por alumno/a y evaluación (o curso completo) para enviarlo a la familia, que lo abre en el
   móvil sin instalar nada y sin conexión. Contiene SOLO los datos de esa persona en ese periodo (nunca las
   observaciones privadas) y se organiza en pestañas: Resumen, De dónde sale la nota, Pruebas objetivas,
   Trabajos de clase, Competencias, Asistencia, Convivencia e Informe (el informe oficial, que es lo único que
   sale al imprimir).
   - Sin JavaScript: las pestañas son botones de opción y CSS, porque la vista previa de los adjuntos en el
     iPhone (Mail, WhatsApp) no ejecuta código. Tampoco carga nada de fuera.
   - Los cálculos son los de siempre (notaTrimestre, resumenCalculoNotaHTML, scoreCriterio, asistencia…).
   - Desde la ventana del ojo (un alumno/a: pfDescargarAlumno) o desde Resultados (todo el grupo en un .zip:
     pfDescargarGrupo). */
const PF_TABS_EVAL=[["resumen","Resumen"],["nota","De dónde sale la nota"],["pruebas","Pruebas objetivas"],["trabajos","Trabajos de clase"],["competencias","Competencias"],["asistencia","Asistencia"],["convivencia","Convivencia"],["informe","Informe"]];
const PF_CONV={ac:"Falta de actitud o comportamiento",rc:"Reconocimiento positivo",pa:"Parte de amonestación"};

function pfEsFinal(periodo){ return String(periodo)==="final"; }
function pfPeriodoTexto(periodo){ return pfEsFinal(periodo)? "Final de curso" : TRIMESTRES[Number(periodo)]; }
function pfFechaCorta(f){ const m=String(f||"").match(/^(\d{4})-(\d{2})-(\d{2})$/); return m? `${Number(m[3])}/${Number(m[2])}/${m[1]}` : String(f||""); }
function pfSinTildes(s){ return String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Za-z0-9]+/g,"_").replace(/^_+|_+$/g,""); }
function pfNombreArchivo(grupo,al,periodo){
  const p=pfEsFinal(periodo)? "Final_de_curso" : ["1a","2a","3a"][Number(periodo)]+"_evaluacion";
  return `Informe_${p}_${pfSinTildes(grupo.nombre)}_${pfSinTildes(al.nombre)}.html`;
}
/* Fechas de la evaluación (Ajustes del grupo → fechas de cada evaluación). Sin fechas: todo el curso hasta hoy. */
function pfRango(grupo,periodo){
  if(pfEsFinal(periodo)) return {desde:"2000-01-01",hasta:"2099-12-31",texto:"curso completo"};
  const ft=grupo.fechasTrimestre&&grupo.fechasTrimestre[Number(periodo)];
  if(ft&&ft.inicio&&ft.fin) return {desde:ft.inicio,hasta:ft.fin,texto:`del ${pfFechaCorta(ft.inicio)} al ${pfFechaCorta(ft.fin)}`};
  return {desde:"2000-01-01",hasta:"2099-12-31",texto:"desde el inicio de curso"};
}
function pfNotaChip(grupo,v){
  if(v==null) return `<span class="pf-chip pf-gris">Sin nota</span>`;
  const e=etiquetaNota(v,grupo);
  return `<span class="pf-chip" style="background:${e.bg};color:${e.fg}">${e.etq} · ${notaActa(v,grupo)}</span>`;
}
function pfNivelChip(grupo,p){
  const nv=nivel(grupo,p);
  if(!nv) return `<span class="pf-chip pf-gris">Sin datos</span>`;
  return `<span class="pf-chip" style="background:${nv.bg};color:${nv.fg}">${nv.etq} · ${Math.round(p)} %</span>`;
}
function pfEstadoActividad(grupo,al,a){
  const m=marcaDe(grupo,al.id,a.id);
  if(m==="NP") return {txt:"No presentado",clase:"pf-mal",nota:"0"};
  if(m==="EX") return {txt:"Exento/a",clase:"pf-gris",nota:"—"};
  const v=notaActividad(grupo,al.id,a);
  if(v==null) return {txt:"Sin nota",clase:"pf-gris",nota:"—"};
  return {txt:"Entregado",clase:v>=5?"pf-bien":"pf-medio",nota:notaActividadInformeHTML(grupo,al.id,a),v};
}
function pfComentarioHTML(texto){ const t=String(texto||"").trim(); return t? `<div class="pf-coment">${esc(t)}</div>` : ""; }

/* ---- Pestañas ---- */
function pfResumenHTML(grupo,al,periodo){
  const fin=pfEsFinal(periodo);
  const v=fin? notaFinal(grupo,al.id) : notaTrimestre(grupo,al.id,Number(periodo));
  const barras=[0,1,2].map(t=>({label:TRIMESTRES[t],value:notaTrimestre(grupo,al.id,t),activo:!fin&&t===Number(periodo)}));
  if(fin) barras.push({label:"Final",value:notaFinal(grupo,al.id),activo:true});
  const visibles=fin? barras : barras.slice(0,Number(periodo)+1);
  const acts=grupo.actividades.filter(a=>!a.recupera&&(fin||a.trimestre===Number(periodo)));
  const est=acts.map(a=>pfEstadoActividad(grupo,al,a));
  const n=k=>est.filter(e=>e.txt===k).length;
  const r=pfRango(grupo,periodo), asis=asistContarPeriodo(grupo,al.id,r.desde,r.hasta);
  const comentarios=fin
    ? [0,1,2].map(t=>({t:TRIMESTRES[t],c:(al.comentariosEval||[])[t]})).concat([{t:"Final de curso",c:al.comentarioFinal}]).filter(x=>String(x.c||"").trim())
    : [{t:"",c:(al.comentariosEval||[])[Number(periodo)]}].filter(x=>String(x.c||"").trim());
  return `<div class="pf-tarjeta pf-nota">
      <div class="pf-etq">${fin?"Nota final de curso":"Nota de la "+esc(TRIMESTRES[Number(periodo)])}</div>
      <div class="pf-grande">${notaEvalInformeHTML(grupo,al.id,fin?"final":Number(periodo))}</div>
      ${pfNotaChip(grupo,v)}
    </div>
    ${comentarios.length?`<div class="pf-tarjeta"><h3>💬 Comentario del profesor/a</h3>${comentarios.map(x=>`${x.t?`<div class="pf-sub">${esc(x.t)}</div>`:""}${pfComentarioHTML(x.c)}`).join("")}</div>`:""}
    <div class="pf-tarjeta"><h3>📈 Evolución</h3>${svgBarNotas(visibles)}</div>
    <div class="pf-cifras">
      <div><b>${n("Entregado")}</b><span>actividades con nota</span></div>
      <div><b>${n("No presentado")}</b><span>no presentadas</span></div>
      <div><b>${asis.falta_no_justificada}</b><span>faltas sin justificar</span></div>
      <div><b>${asis.retraso}</b><span>retrasos</span></div>
    </div>
    <p class="pf-nota-pie">Las pestañas de arriba explican de dónde sale la nota y qué ha hecho en cada actividad. «Informe» es el informe oficial, el que sale al imprimir.</p>`;
}
function pfActividadesHTML(grupo,al,periodo,examenes){
  const fin=pfEsFinal(periodo), trims=fin?[0,1,2]:[Number(periodo)];
  const bloques=trims.map(t=>{
    const acts=grupo.actividades.filter(a=>a.trimestre===t&&!!a.esExamen===examenes);
    if(!acts.length) return "";
    let cuerpo;
    if(examenes){
      cuerpo=acts.map(a=>{
        const e=pfEstadoActividad(grupo,al,a);
        const com=(grupo.examComentarios&&grupo.examComentarios[al.id]&&grupo.examComentarios[al.id][a.id])||"";
        const rec=a.recupera? grupo.actividades.filter(x=>(a.recupera.ids||[]).includes(x.id)).map(x=>x.nombre) : [];
        return `<div class="pf-item">
          <div class="pf-fila"><span class="pf-nom">${esc(a.nombre)}</span><span class="pf-val ${e.clase}">${e.txt==="Entregado"?e.nota:e.txt}</span></div>
          ${rec.length?`<div class="pf-sub">Recuperación de: ${esc(rec.join(", "))}</div>`:""}
          ${String(com).trim()?`<div class="pf-coment">${comentRicoHTML(com)}</div>`:""}
        </div>`;
      }).join("");
    }else{
      const porSda={}; acts.forEach(a=>{ const s=a.sda||"Otras actividades"; (porSda[s]=porSda[s]||[]).push(a); });
      cuerpo=Object.keys(porSda).map(s=>`<div class="pf-sub pf-sda">${esc(s)}</div>${porSda[s].map(a=>{ const e=pfEstadoActividad(grupo,al,a);
        return `<div class="pf-item"><div class="pf-fila"><span class="pf-nom">${esc(a.nombre)}<small>${esc(a.tipo||"")}</small></span><span class="pf-val ${e.clase}">${e.txt==="Entregado"?e.nota:e.txt}</span></div></div>`; }).join("")}`).join("");
    }
    return `${fin?`<h3 class="pf-eval">${esc(TRIMESTRES[t])}</h3>`:""}<div class="pf-tarjeta pf-lista">${cuerpo}</div>`;
  }).join("");
  const leyenda=`<p class="pf-nota-pie">«No presentado» cuenta como 0. «Sin nota»: todavía no calificada o sin entregar.</p>`;
  return bloques? bloques+leyenda : `<div class="pf-tarjeta pf-vacio">No hay ${examenes?"pruebas objetivas":"trabajos"} en este periodo.</div>`;
}
function pfCompetenciasHTML(grupo,al,periodo){
  const fin=pfEsFinal(periodo), idx=catIndex(grupo.catalogoKey), u=grupo.umbrales;
  const valCrit=cid=> fin? mediaAnualPonderada(grupo,[0,1,2].map(t=>({t,v:conTrim(t,()=>scoreCriterio(grupo,al.id,cid))})))
                         : conTrim(Number(periodo),()=>scoreCriterio(grupo,al.id,cid));
  const valCE=id=> fin? scoreCEAnual(grupo,al.id,id) : conTrim(Number(periodo),()=>scoreCE(grupo,al.id,id));
  const valCC=cc=> fin? scoreCCAnual(grupo,al.id,cc) : conTrim(Number(periodo),()=>scoreCC(grupo,al.id,cc));
  // Con qué actividades y exámenes se ha evaluado (todas: las familias deben poder ver el detalle).
  const unir=f=>{ const s=new Set(); (fin?[0,1,2]:[Number(periodo)]).forEach(t=>conTrim(t,f).forEach(n=>s.add(n))); return [...s]; };
  const actsCrit=cid=>unir(()=>actividadesDeCriterio(grupo,al.id,cid));
  const actsCE=id=>unir(()=>actividadesDeCE(grupo,al.id,id));
  const actsCC=cc=>unir(()=>actividadesDeCC(grupo,al.id,cc));
  const conQue=l=>l.length? `<div class="pf-con">Evaluado con: ${l.map(esc).join(" · ")}</div>` : "";
  const ces=idx.cat.ces.map(ce=>({ce,p:valCE(ce.id),crits:ce.criterios.map(c=>({c,p:valCrit(c.id)})).filter(x=>x.p!=null)})).filter(x=>x.p!=null||x.crits.length);
  const ccs=Object.keys(COMP_CLAVE).filter(cc=>idx.cat.ces.some(ce=>ce.cc.includes(cc))).map(cc=>({cc,p:valCC(cc)})).filter(x=>x.p!=null);
  if(!ces.length&&!ccs.length) return `<div class="pf-tarjeta pf-vacio">Todavía no hay competencias evaluadas en este periodo.</div>`;
  return `<div class="pf-tarjeta"><p class="pf-explica">La evaluación por competencias dice <b>qué ha aprendido</b>, no solo qué nota ha sacado. Cada criterio sale de las actividades y pruebas en las que se ha trabajado: <b>Excelente</b> (${u.excelente} % o más), <b>Adecuado</b> (${u.adecuado} %), <b>En proceso</b> (${u.enProceso} %) y <b>Necesita mejorar</b> (menos del ${u.enProceso} %).</p></div>
    ${ccs.length?`<h3 class="pf-eval">Competencias clave</h3><div class="pf-tarjeta pf-lista">${ccs.map(x=>`<div class="pf-item"><div class="pf-fila"><span class="pf-nom">${esc(COMP_CLAVE[x.cc])}<small>${esc(x.cc)}</small></span>${pfNivelChip(grupo,x.p)}</div>${conQue(actsCC(x.cc))}</div>`).join("")}</div>`:""}
    <h3 class="pf-eval">Competencias específicas y criterios</h3>
    ${ces.map(x=>`<div class="pf-tarjeta pf-lista"><div class="pf-item"><div class="pf-fila"><span class="pf-nom"><b>${esc(x.ce.id)}</b> ${esc(x.ce.titulo||"")}</span>${x.p!=null?pfNivelChip(grupo,x.p):""}</div>${conQue(actsCE(x.ce.id))}</div>
      ${x.crits.map(c=>`<div class="pf-item pf-crit"><div class="pf-fila"><span class="pf-nom"><b>${esc(c.c.id)}</b> ${esc(c.c.texto||"")}</span>${pfNivelChip(grupo,c.p)}</div>${conQue(actsCrit(c.c.id))}</div>`).join("")}</div>`).join("")}`;
}
function pfAsistenciaHTML(grupo,al,periodo){
  const r=pfRango(grupo,periodo), c=asistContarPeriodo(grupo,al.id,r.desde,r.hasta);
  const dias=Object.keys(grupo.asistencia||{}).filter(f=>f>=r.desde&&f<=r.hasta).sort()
    .map(f=>({f,reg:grupo.asistencia[f][al.id]})).filter(x=>x.reg&&x.reg.estado&&x.reg.estado!=="presente");
  const etq={falta_justificada:["Falta justificada","pf-azul"],falta_no_justificada:["Falta sin justificar","pf-mal"],retraso:["Retraso","pf-medio"]};
  return `<div class="pf-cifras">
      <div><b>${c.falta_justificada}</b><span>faltas justificadas</span></div>
      <div><b>${c.falta_no_justificada}</b><span>faltas sin justificar</span></div>
      <div><b>${c.retraso}</b><span>retrasos</span></div>
    </div>
    <p class="pf-nota-pie">Periodo: ${esc(r.texto)}. Solo cuenta las clases de esta materia.</p>
    ${dias.length?`<div class="pf-tarjeta pf-lista">${dias.map(x=>{ const e=etq[x.reg.estado]||[x.reg.estado,"pf-gris"];
      return `<div class="pf-item"><div class="pf-fila"><span class="pf-nom">${pfFechaCorta(x.f)}${x.reg.nota?`<small>${esc(x.reg.nota)}</small>`:""}</span><span class="pf-val ${e[1]}">${e[0]}</span></div></div>`; }).join("")}</div>`
      :`<div class="pf-tarjeta pf-vacio">Ninguna falta ni retraso en este periodo. 👏</div>`}`;
}
function pfConvivenciaHTML(grupo,al,periodo){
  const r=pfRango(grupo,periodo);
  const ent=convEntradasAlumno(grupo,al.id,r.desde,r.hasta).slice().sort((a,b)=>a.fecha.localeCompare(b.fecha));
  if(!ent.length) return `<div class="pf-tarjeta pf-vacio">Ninguna anotación de convivencia en este periodo.</div><p class="pf-nota-pie">Periodo: ${esc(r.texto)}.</p>`;
  return `<p class="pf-nota-pie">Periodo: ${esc(r.texto)}.</p><div class="pf-tarjeta pf-lista">${ent.map(e=>`<div class="pf-item">
      <div class="pf-fila"><span class="pf-nom">${pfFechaCorta(e.fecha)}</span><span class="pf-val ${e.tipo==="rc"?"pf-bien":"pf-mal"}">${esc(PF_CONV[e.tipo]||e.tipo)}</span></div>
      ${(e.tipo==="pa"?paResumenTexto(e.pa):e.descripcion)?`<div class="pf-coment">${esc(e.tipo==="pa"?paResumenTexto(e.pa):e.descripcion)}</div>`:""}
    </div>`).join("")}</div>`;
}
function pfInformeHTML(grupo,al,periodo){
  // actsCompletas: en las competencias, todas las actividades y exámenes con los que se ha evaluado (sin «+N más»).
  const cuerpo=pfEsFinal(periodo)? informeFinalAlumnoBodyHTML(grupo,al,{actsCompletas:true}) : conTrim(Number(periodo),()=>informeAlumnoBodyHTML(grupo,al,{actsCompletas:true}));
  return `<p class="pf-nota-pie pf-solo-pantalla">Para guardarlo en PDF o imprimirlo: menú del navegador → <b>Imprimir</b> (o Compartir → Imprimir). Solo se imprime este informe.</p>
    <div class="pf-informe">${cuerpo}</div>`;
}

/* ---- Documento completo ---- */
function pfCSS(n){
  const sel=k=>Array.from({length:n},(_,i)=>k(i)).join(",");
  return `
  *{box-sizing:border-box} html{-webkit-text-size-adjust:100%}
  body{margin:0;background:#eef1f6;color:#141b28;font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  .pf-r{position:absolute;opacity:0;pointer-events:none}
  .pf-cab{background:linear-gradient(120deg,#0a1120,#152a44 55%,#25456b);color:#f7f2e4;padding:18px 16px 14px}
  .pf-cab .pf-eyebrow{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#d7b463;font-weight:800}
  .pf-cab h1{font-family:Georgia,"Times New Roman",serif;font-size:22px;margin:4px 0 2px;line-height:1.2}
  .pf-cab p{margin:0;font-size:13px;color:rgba(247,242,228,.8)}
  .pf-nav{position:sticky;top:0;z-index:5;display:flex;gap:6px;overflow-x:auto;padding:10px 12px;background:rgba(238,241,246,.97);border-bottom:1px solid #dde3ec;-webkit-overflow-scrolling:touch;scrollbar-width:none}
  .pf-nav::-webkit-scrollbar{display:none}
  .pf-nav label{flex:0 0 auto;padding:8px 14px;border-radius:999px;background:#fff;border:1px solid #dde3ec;font-size:13.5px;font-weight:700;color:#5b6b82;cursor:pointer;white-space:nowrap}
  .pf-main{max-width:760px;margin:0 auto;padding:14px 12px 40px}
  .pf-p{display:none}
  ${sel(i=>`#pf-${i}:checked ~ .pf-main #pp-${i}`)}{display:block}
  ${sel(i=>`#pf-${i}:checked ~ .pf-nav label[for=pf-${i}]`)}{background:#152a44;border-color:#152a44;color:#fff}
  ${sel(i=>`#pf-${i}:focus-visible ~ .pf-nav label[for=pf-${i}]`)}{outline:3px solid #b3893a;outline-offset:2px}
  .pf-p > h2{font-family:Georgia,"Times New Roman",serif;font-size:19px;margin:4px 0 12px}
  .pf-tarjeta{background:#fff;border:1px solid #dde3ec;border-radius:16px;padding:14px;margin:0 0 12px}
  .pf-tarjeta h3{margin:0 0 8px;font-size:15px}
  .pf-nota{text-align:center}
  .pf-etq{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5b6b82;font-weight:700}
  .pf-grande{font-size:44px;font-weight:800;line-height:1.1;margin:4px 0 8px}
  .pf-chip{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12.5px;font-weight:700;white-space:nowrap}
  .pf-gris{background:#eef1f6;color:#5b6b82}
  .pf-cifras{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:0 0 12px}
  .pf-cifras div{background:#fff;border:1px solid #dde3ec;border-radius:14px;padding:10px;text-align:center}
  .pf-cifras b{display:block;font-size:24px}
  .pf-cifras span{font-size:12px;color:#5b6b82}
  .pf-lista{padding:4px 14px}
  .pf-item{padding:10px 0;border-bottom:1px solid #eef1f6}
  .pf-item:last-child{border-bottom:none}
  .pf-fila{display:flex;justify-content:space-between;align-items:center;gap:10px}
  .pf-nom{min-width:0;font-size:14px}
  .pf-nom small{display:block;color:#5b6b82;font-size:12px}
  .pf-val{flex-shrink:0;font-weight:800;font-size:14px;padding:3px 10px;border-radius:999px}
  .pf-bien{background:#dcece0;color:#1e5631} .pf-medio{background:#f6eccf;color:#8a5a12} .pf-mal{background:#f3dcdc;color:#912525} .pf-azul{background:#d9e6f2;color:#1d4e74}
  .pf-crit .pf-nom{font-size:13px;color:#33405a}
  .pf-con{margin-top:5px;font-size:12px;color:#5b6b82}
  .pf-sub{font-size:12.5px;color:#5b6b82;margin-top:4px}
  .pf-sda{margin:10px 0 0;font-weight:700;text-transform:uppercase;letter-spacing:.04em;font-size:11.5px}
  .pf-eval{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#7d5a12;margin:16px 0 8px}
  .pf-coment{margin-top:6px;background:#faf3e2;border-left:3px solid #b3893a;border-radius:8px;padding:8px 10px;font-size:13.5px;white-space:pre-wrap}
  .pf-explica{margin:0;font-size:13.5px}
  .pf-vacio{color:#5b6b82;text-align:center}
  .pf-nota-pie{font-size:12.5px;color:#5b6b82;margin:4px 2px 12px}
  .pf-scroll{overflow-x:auto}
  .pf-informe{background:#fff;border:1px solid #dde3ec;border-radius:16px;padding:16px;overflow-x:auto;font-size:13px}
  .pf-informe h1{font-size:18px;margin:0 0 2px} .pf-informe h2{font-size:15px;margin:18px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px}
  .pf-informe .meta{color:#666;font-size:12px;margin-bottom:14px}
  .pf-informe table{border-collapse:collapse;width:100%;font-size:12.5px;margin-bottom:6px}
  .pf-informe th,.pf-informe td{text-align:left;padding:5px 7px;border-bottom:1px solid #ddd;vertical-align:top}
  .pf-informe .pill{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11.5px;font-weight:600}
  .pf-informe .alert{background:#fcf4e3;border:1px solid #b57b0e;padding:8px;font-size:12.5px;border-radius:6px;margin:8px 0}
  .pf-pie{text-align:center;color:#5b6b82;font-size:12px;padding:18px 12px 30px}
  @media print{
    body{background:#fff}
    .pf-cab,.pf-nav,.pf-pie,.pf-solo-pantalla{display:none!important}
    .pf-p{display:none!important}
    #pp-${n-1}{display:block!important}
    .pf-main{max-width:none;padding:0}
    .pf-informe{border:none;padding:0;border-radius:0;overflow:visible}
    .pf-informe tr{break-inside:avoid}
  }`;
}
function panelFamiliaHTML(grupo,al,periodo){
  const cat=getCatalogo(grupo.catalogoKey);
  const tabs=PF_TABS_EVAL.map(([id,titulo])=>{
    let html;
    if(id==="resumen") html=pfResumenHTML(grupo,al,periodo);
    else if(id==="nota") html=`<div class="pf-scroll">${resumenCalculoNotaHTML(grupo,al,pfEsFinal(periodo)?"final":Number(periodo))}</div><p class="pf-nota-pie">La nota es la media ponderada de cada bloque de calificación${pfEsFinal(periodo)?" (en la nota final, de cada evaluación)":""}, con el peso que aparece al lado de cada uno.</p>`;
    else if(id==="pruebas") html=pfActividadesHTML(grupo,al,periodo,true);
    else if(id==="trabajos") html=pfActividadesHTML(grupo,al,periodo,false);
    else if(id==="competencias") html=pfCompetenciasHTML(grupo,al,periodo);
    else if(id==="asistencia") html=pfAsistenciaHTML(grupo,al,periodo);
    else if(id==="convivencia") html=pfConvivenciaHTML(grupo,al,periodo);
    else html=pfInformeHTML(grupo,al,periodo);
    return {id,titulo,html};
  });
  const centro=state.centroNombre||"", prof=profesorNombreEfectivo(null)||"", curso=cursoEscolarEfectivo(null)||"";
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<title>${esc(al.nombre)} · ${esc(cat.materia)} · ${esc(pfPeriodoTexto(periodo))}</title>
<style>${pfCSS(tabs.length)}</style></head>
<body>
${tabs.map((t,i)=>`<input type="radio" name="pf" id="pf-${i}" class="pf-r"${i===0?" checked":""} aria-label="${esc(t.titulo)}">`).join("")}
<header class="pf-cab">
  <div class="pf-eyebrow">${esc(cat.materia)} · ${esc(cat.curso)} · ${esc(pfPeriodoTexto(periodo))}</div>
  <h1>${esc(al.nombre)}</h1>
  <p>Grupo ${esc(grupo.nombre)}${curso?" · Curso "+esc(curso):""}${centro?" · "+esc(centro):""}${prof?" · "+esc(prof):""}</p>
</header>
<nav class="pf-nav">${tabs.map((t,i)=>`<label for="pf-${i}">${esc(t.titulo)}</label>`).join("")}</nav>
<main class="pf-main">
${tabs.map((t,i)=>`<section class="pf-p" id="pp-${i}"><h2>${esc(t.titulo)}</h2>${t.html}</section>`).join("\n")}
</main>
<footer class="pf-pie">Generado el ${new Date().toLocaleDateString("es-ES")} con el Cuaderno del profesor. Refleja las notas a esa fecha.</footer>
</body></html>`;
}

/* ---- Descargas ---- */
window.pfDescargarAlumno=(alId,periodo)=>{
  const grupo=grupoActual(), al=grupo&&grupo.alumnos.find(a=>a.id===alId); if(!al) return;
  const p=pfEsFinal(periodo)?"final":Number(periodo);
  guardarArchivo(new Blob([panelFamiliaHTML(grupo,al,p)],{type:"text/html"}),pfNombreArchivo(grupo,al,p));
};
window.pfDescargarGrupo=periodo=>{
  const grupo=grupoActual(); if(!grupo) return;
  if(!grupo.alumnos.length){ mostrarAviso("Este grupo todavía no tiene alumnado."); return; }
  const p=pfEsFinal(periodo)?"final":Number(periodo);
  const archivos=grupo.alumnos.map(al=>({nombre:pfNombreArchivo(grupo,al,p),datos:new TextEncoder().encode(panelFamiliaHTML(grupo,al,p))}));
  const zip=pfZip(archivos);
  const nombre=`Informes_familias_${pfEsFinal(p)?"Final_de_curso":["1a","2a","3a"][p]+"_evaluacion"}_${pfSinTildes(grupo.nombre)}.zip`;
  guardarArchivo(new Blob([zip],{type:"application/zip"}),nombre);
  mostrarToast(`✓ ${archivos.length} informe${archivos.length===1?"":"s"} en un .zip: uno por alumno/a`);
};
/* ZIP sin comprimir (método «stored»): un único archivo con todos los informes del grupo, que cualquier móvil,
   tableta u ordenador abre sin programas. Nombres en UTF-8 (bit 11). */
const _PF_CRC=(()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1? 0xEDB88320^(c>>>1) : c>>>1; t[n]=c>>>0; } return t; })();
function pfCrc32(d){ let c=0xFFFFFFFF; for(let i=0;i<d.length;i++) c=_PF_CRC[(c^d[i])&0xFF]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function pfZip(archivos){
  const enc=new TextEncoder(), ahora=new Date();
  const hora=(ahora.getHours()<<11)|(ahora.getMinutes()<<5)|(ahora.getSeconds()>>1);
  const dia=((ahora.getFullYear()-1980)<<9)|((ahora.getMonth()+1)<<5)|ahora.getDate();
  const partes=[], central=[]; let off=0;
  archivos.forEach(f=>{
    const nom=enc.encode(f.nombre), crc=pfCrc32(f.datos), n=f.datos.length;
    const lh=new DataView(new ArrayBuffer(30));
    lh.setUint32(0,0x04034b50,true); lh.setUint16(4,20,true); lh.setUint16(6,0x0800,true); lh.setUint16(8,0,true);
    lh.setUint16(10,hora,true); lh.setUint16(12,dia,true); lh.setUint32(14,crc,true); lh.setUint32(18,n,true); lh.setUint32(22,n,true);
    lh.setUint16(26,nom.length,true); lh.setUint16(28,0,true);
    partes.push(new Uint8Array(lh.buffer),nom,f.datos);
    const ch=new DataView(new ArrayBuffer(46));
    ch.setUint32(0,0x02014b50,true); ch.setUint16(4,20,true); ch.setUint16(6,20,true); ch.setUint16(8,0x0800,true); ch.setUint16(10,0,true);
    ch.setUint16(12,hora,true); ch.setUint16(14,dia,true); ch.setUint32(16,crc,true); ch.setUint32(20,n,true); ch.setUint32(24,n,true);
    ch.setUint16(28,nom.length,true); ch.setUint16(30,0,true); ch.setUint16(32,0,true); ch.setUint16(34,0,true); ch.setUint16(36,0,true);
    ch.setUint32(38,0,true); ch.setUint32(42,off,true);
    central.push(new Uint8Array(ch.buffer),nom);
    off+=30+nom.length+n;
  });
  const tamCentral=central.reduce((s,x)=>s+x.length,0);
  const fin=new DataView(new ArrayBuffer(22));
  fin.setUint32(0,0x06054b50,true); fin.setUint16(8,archivos.length,true); fin.setUint16(10,archivos.length,true);
  fin.setUint32(12,tamCentral,true); fin.setUint32(16,off,true);
  return new Blob([...partes,...central,new Uint8Array(fin.buffer)]);
}
