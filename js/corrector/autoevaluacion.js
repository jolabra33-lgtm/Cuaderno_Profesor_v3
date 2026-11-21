/* ============================================================================
   Cuaderno del profesor · Autoevaluación y coevaluación con la rúbrica de un examen
   js/corrector/autoevaluacion.js
   ============================================================================ */

/* Con la rúbrica de un examen:
   1) «🙋 Autoevaluación» (lista de Corregir) imprime hojas para el alumnado: autoevaluación (cada uno se puntúa) o
      coevaluación (puntúa a un compañero/a), con su nombre o en blanco, en el orden de su modelo (A, B, C) y con su
      rúbrica si hace un examen alternativo. En una rúbrica por niveles, se marca la casilla del nivel.
   2) En la corrección de cada alumno/a, la tarjeta «🙋 Autoevaluación y coevaluación» recoge lo que puso en la hoja,
      ítem a ítem, y lo compara con tu corrección.
   Solo informa: NO cambia la nota del examen ni la de los criterios.
   Datos: grupo.autoeval[alId][actId] = { auto:{items:{itemId:puntos}, fecha}, co:{items:{…}, por:alId|"", fecha} }.
   Es de un curso concreto: «Empezar curso nuevo» lo vacía (ncGrupoVacio parte de un grupo nuevo). */
const AE_TIPOS={auto:{titulo:"Autoevaluación",icono:"🙋",quien:"Se pone"},co:{titulo:"Coevaluación",icono:"👥",quien:"Le pone su compañero/a"}};

function aeRegistro(grupo,alId,actId,tipo){
  const r=grupo&&grupo.autoeval&&grupo.autoeval[alId]&&grupo.autoeval[alId][actId]&&grupo.autoeval[alId][actId][tipo];
  return r&&r.items&&typeof r.items==="object"&&Object.keys(r.items).length? r : null;
}
/* Nota sobre 10 que sale de unas puntuaciones, con las mismas reglas que la del examen (cxNotaCuant). */
function aeNota(act,alId,items){
  if(!items||!Object.keys(items).length) return null;
  const rub=cxRubricaDe(act,alId);
  let total=cxEvalRubrica(rub,items).pts;
  const max=cxMaxTotal(rub);
  if(cxEscalarDe(act,alId) && max>0 && Math.abs(max-10)>=0.01) total=total*10/max;
  return Math.round(Math.max(0,Math.min(10,total))*100)/100;
}
/* Una hoja está completa cuando tiene puntos en todos los ítems de su rúbrica: solo entonces su nota se compara en el
   resumen del grupo (con media hoja, la nota saldría baja sin serlo). */
function aeCompleto(act,alId,r){ return !!r && cxItemsFlat(cxRubricaDe(act,alId)).every(it=>r.items[it.id]!=null); }
function aeDifHTML(d){
  if(d==null||!isFinite(d)) return "";
  const r=Math.round(d*100)/100;
  if(Math.abs(r)<0.005) return `<span class="ae-dif ae-igual" title="Coincide con tu corrección">=</span>`;
  return `<span class="ae-dif ${r>0?"ae-mas":"ae-menos"}" title="${r>0?"Más":"Menos"} que tu corrección">${r>0?"+":"−"}${cxFmtPts(Math.abs(r))}</span>`;
}

/* ---- Desplegable de puntos de un ítem (de 0,25 en 0,25) o del nivel, en una rúbrica por niveles ---- */
function aeSelectHTML(rub,it,v,onchange,etiqueta){
  const max=Number(it.max)||0, act=v==null||v===""?null:Number(v);
  let ops;
  if(cxEsNiveles(rub)){
    const niv=cxnNiveles(rub);
    ops=niv.map(l=>({v:cxnPuntosNivel(it,l,niv),t:`${l.nombre||"(sin nombre)"} (${cxFmtPts(cxnPuntosNivel(it,l,niv))})`}));
  }else{
    const pasos=Math.min(400,Math.floor(max*4+1e-9)); ops=[];
    for(let i=0;i<=pasos;i++) ops.push({v:Math.round(i*25)/100,t:cxFmtPts(Math.round(i*25)/100)});
    if(Math.abs((ops.length?ops[ops.length-1].v:0)-max)>1e-9) ops.push({v:max,t:cxFmtPts(max)});
  }
  if(act!=null&&!ops.some(o=>Math.abs(o.v-act)<1e-9)){ ops.push({v:act,t:cxFmtPts(act)}); ops.sort((a,b)=>a.v-b.v); }
  return `<select class="in miniw" style="min-width:84px" aria-label="${esc(etiqueta)}" onchange="${onchange}">
    <option value=""${act==null?" selected":""}>—</option>${ops.map(o=>`<option value="${o.v}"${act!=null&&Math.abs(o.v-act)<1e-9?" selected":""}>${esc(o.t)}</option>`).join("")}</select>`;
}

/* ---- Tarjeta en la corrección de un alumno/a ---- */
function aeTarjetaHTML(grupo,act,al){
  const rubVista=mbRubricaVista(act,al.id), rub=cxRubricaDe(act,al.id);
  const sc=grupo.rubricScores?.[al.id]?.[act.id]||{};
  const vc=grupo.notasCuant?.[al.id]?.[act.id];
  const items=cxItemsFlat(rubVista);
  const aid=escJS(al.id), xid=escJS(act.id);
  const resumen=tipo=>{ const r=aeRegistro(grupo,al.id,act.id,tipo); if(!r) return ""; const n=aeNota(act,al.id,r.items);
    return aeCompleto(act,al.id,r)? `${AE_TIPOS[tipo].icono} ${fmt(n)}${vc!=null?" "+aeDifHTML(n-vc):""}` : `${AE_TIPOS[tipo].icono} a medias`; };
  const res=[resumen("auto"),resumen("co")].filter(Boolean).join(" · ");
  const bloque=tipo=>{
    const r=aeRegistro(grupo,al.id,act.id,tipo), vals=(r&&r.items)||{};
    const n=r? aeNota(act,al.id,vals) : null;
    const por=tipo==="co"? `<label class="sub" style="margin:0;display:flex;gap:6px;align-items:center;flex-wrap:wrap">Le evalúa
        <select class="in" style="padding:6px 9px" aria-label="Compañero/a que hace la coevaluación" onchange="aeSetPor('${aid}','${xid}',this.value)">
          <option value="">— (sin indicar)</option>
          ${grupo.alumnos.filter(x=>x.id!==al.id).map(x=>`<option value="${escJS(x.id)}"${(r&&r.por)===x.id?" selected":""}>${esc(x.nombre)}</option>`).join("")}
        </select></label>` : "";
    return `<div class="ae-bloque">
      <div class="flex" style="justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
        <strong style="font-size:14px">${AE_TIPOS[tipo].icono} ${AE_TIPOS[tipo].titulo}</strong>
        <span style="font-size:13px">${n!=null?(aeCompleto(act,al.id,r)
          ?`${AE_TIPOS[tipo].quien}: <strong>${fmt(n)}</strong>${vc!=null?` · tu nota: ${fmt(vc)} ${aeDifHTML(n-vc)}`:""}`
          :`<span class="sub" style="margin:0">Copiados ${Object.keys(vals).length} de ${items.length} ítems</span>`):'<span class="sub" style="margin:0">Sin datos todavía</span>'}</span>
      </div>
      ${por}
      <div class="ae-items">${items.map(it=>`<div class="ae-item">
        <span class="ae-item-txt">${esc(it.label||"(sin enunciado)")}</span>
        <span class="flex" style="gap:6px;align-items:center;flex-wrap:nowrap;flex-shrink:0">
          ${aeSelectHTML(rub,it,vals[it.id],`aeSetItem('${aid}','${xid}','${tipo}','${escJS(it.id)}',this.value)`,AE_TIPOS[tipo].titulo+": "+(it.label||"ítem"))}
          <span class="sub" style="margin:0;font-size:12px">/ ${cxFmtPts(Number(it.max)||0)}</span>
          ${vals[it.id]!=null&&sc[it.id]!=null?aeDifHTML(Number(vals[it.id])-Number(sc[it.id])):""}
        </span></div>`).join("")}</div>
      ${r?`<button class="ghost small danger" style="margin-top:6px" onclick="aeBorrar('${aid}','${xid}','${tipo}')">Borrar la ${AE_TIPOS[tipo].titulo.toLowerCase()}</button>`:""}
    </div>`;
  };
  return `<div class="card">
    <details class="ae-detalles"${state.ui.aeAbierto?" open":""} ontoggle="state.ui.aeAbierto=this.open">
      <summary><strong style="font-size:15px">🙋 Autoevaluación y coevaluación</strong>${res?` <span style="font-size:13px;margin-left:6px">${res}</span>`:' <span class="sub" style="margin:0 0 0 6px">(opcional)</span>'}</summary>
      <p class="sub" style="margin:8px 0 10px">Copia aquí lo que el alumno/a puso en su hoja (la imprimes con «🙋 Autoevaluación» en la lista de Corregir). Al lado de cada ítem ves la diferencia con tu corrección. <strong>No cambia la nota.</strong></p>
      <div class="ae-dos">${bloque("auto")}${bloque("co")}</div>
    </details>
  </div>`;
}
/* Distintivo en la lista de Corregir. */
function aeBadgeHTML(grupo,alId,act){
  return ["auto","co"].map(tipo=>{ const r=aeRegistro(grupo,alId,act.id,tipo); if(!r) return "";
    const txt=aeCompleto(act,alId,r)? fmt(aeNota(act,alId,r.items)) : "…";
    return ` <span class="badge" title="${AE_TIPOS[tipo].titulo}: ${aeCompleto(act,alId,r)?txt:"a medias"}">${AE_TIPOS[tipo].icono} ${txt}</span>`; }).join("");
}
/* Resumen del grupo en la cabecera del examen: cuánto se ponen frente a lo que les pones tú (mismo alumnado). */
function aeResumenGrupoHTML(grupo,act){
  const partes=["auto","co"].map(tipo=>{
    const pares=grupo.alumnos.map(al=>{ const r=aeRegistro(grupo,al.id,act.id,tipo); const vc=grupo.notasCuant?.[al.id]?.[act.id];
      return aeCompleto(act,al.id,r)&&vc!=null&&!marcaDe(grupo,al.id,act.id)? {a:aeNota(act,al.id,r.items),p:vc} : null; }).filter(Boolean);
    if(!pares.length) return "";
    const ma=pares.reduce((s,x)=>s+x.a,0)/pares.length, mp=pares.reduce((s,x)=>s+x.p,0)/pares.length;
    return `<div><div style="font-size:12.5px;color:var(--mut)">${AE_TIPOS[tipo].icono} ${AE_TIPOS[tipo].titulo} · ${pares.length} alumno${pares.length===1?"":"s"}/a${pares.length===1?"":"s"}</div>
      <span style="font-size:15px"><strong>${fmt(ma)}</strong> frente a tu ${fmt(mp)} ${aeDifHTML(ma-mp)}</span></div>`;
  }).filter(Boolean);
  return partes.length? `<div class="flex" style="margin-top:12px;gap:24px">${partes.join("")}</div>` : "";
}

/* ---- Acciones ---- */
function aeAsegurar(grupo,alId,actId,tipo){
  if(!grupo.autoeval||typeof grupo.autoeval!=="object") grupo.autoeval={};
  const a=grupo.autoeval[alId]=grupo.autoeval[alId]||{}, b=a[actId]=a[actId]||{};
  return b[tipo]=b[tipo]||{items:{}};
}
function aeLimpiar(grupo,alId,actId){
  const a=grupo.autoeval&&grupo.autoeval[alId]; if(!a||!a[actId]) return;
  ["auto","co"].forEach(t=>{ const r=a[actId][t]; if(r&&(!r.items||!Object.keys(r.items).length)&&!r.por) delete a[actId][t]; });
  if(!Object.keys(a[actId]).length) delete a[actId];
  if(!Object.keys(a).length) delete grupo.autoeval[alId];
}
window.aeSetItem=(alId,actId,tipo,itemId,v)=>{
  const grupo=grupoActual(), act=grupo&&grupo.actividades.find(a=>a.id===actId); if(!act||!AE_TIPOS[tipo]) return;
  const it=cxItemsFlat(cxRubricaDe(act,alId)).find(x=>x.id===itemId); if(!it) return;
  const r=aeAsegurar(grupo,alId,actId,tipo);
  const n=v===""||v==null? null : Number(v);
  if(n==null||!isFinite(n)) delete r.items[itemId];
  else r.items[itemId]=Math.max(0,Math.min(Number(it.max)||0,n));
  r.fecha=fechaISOLocal();
  aeLimpiar(grupo,alId,actId);
  save(); render();
};
window.aeSetPor=(alId,actId,porId)=>{
  const grupo=grupoActual(); if(!grupo) return;
  const r=aeAsegurar(grupo,alId,actId,"co");
  r.por=grupo.alumnos.some(x=>x.id===porId)? porId : "";
  aeLimpiar(grupo,alId,actId);
  save(); render();
};
window.aeBorrar=async(alId,actId,tipo)=>{
  const grupo=grupoActual(); if(!grupo||!AE_TIPOS[tipo]) return;
  if(!await confirmar(`¿Borrar la ${AE_TIPOS[tipo].titulo.toLowerCase()} de este alumno/a en este examen? (Se puede deshacer con ↶.)`,{ok:"Borrar",peligro:true})) return;
  const a=grupo.autoeval&&grupo.autoeval[alId]&&grupo.autoeval[alId][actId]; if(a) delete a[tipo];
  aeLimpiar(grupo,alId,actId);
  save(); render();
};

/* ---- Hojas para el alumnado ---- */
window.aeAbrirHojas=actId=>{
  const grupo=grupoActual(), act=grupo&&grupo.actividades.find(a=>a.id===actId); if(!act) return;
  const xid=escJS(act.id);
  exModal(`<h2 style="font-size:16.5px;margin-bottom:4px">🙋 Hojas de autoevaluación y coevaluación</h2>
    <p class="sub" style="margin:0 0 12px">Con la rúbrica de «${esc(act.nombre)}». Después, en la corrección de cada alumno/a, copias lo que puso para compararlo con tu nota. No cuenta en la nota.</p>
    <fieldset class="ae-opciones"><legend>Tipo</legend>
      <label><input type="radio" name="aeTipo" value="auto" checked> 🙋 Autoevaluación: cada alumno/a se puntúa a sí mismo/a</label>
      <label><input type="radio" name="aeTipo" value="co"> 👥 Coevaluación: puntúa el examen de un compañero/a</label>
    </fieldset>
    <fieldset class="ae-opciones"><legend>Hojas</legend>
      <label><input type="radio" name="aeHojas" value="nombre" checked> Una por alumno/a, con su nombre (y su modelo o examen alternativo)</label>
      <label><input type="radio" name="aeHojas" value="blanco"> En blanco, para fotocopiar</label>
    </fieldset>
    <fieldset class="ae-opciones"><legend>Incluir</legend>
      <label><input type="checkbox" id="aeDesc" checked> Lo que se valora en cada pregunta (descriptores)</label>
      <label><input type="checkbox" id="aeRefl" checked> Preguntas para reflexionar al final</label>
    </fieldset>
    <button class="btn" style="margin-top:6px" onclick="aeImprimirHojas('${xid}',{tipo:document.querySelector('input[name=aeTipo]:checked').value,hojas:document.querySelector('input[name=aeHojas]:checked').value,desc:document.getElementById('aeDesc').checked,refl:document.getElementById('aeRefl').checked})">🖨️ Preparar las hojas</button>`);
};
function aeHojaHTML(grupo,act,rub,al,o){
  const cat=getCatalogo(grupo.catalogoKey), co=o.tipo==="co", niveles=cxEsNiveles(rub);
  const caja='<span class="ae-caja"></span>';
  const datos=co? `<div class="ae-datos"><span>Evalúo a: ${al?`<b>${esc(al.nombre)}</b>`:'<span class="ae-linea"></span>'}</span><span>Me llamo: <span class="ae-linea"></span></span><span>Fecha: <span class="ae-linea corta"></span></span></div>`
                : `<div class="ae-datos"><span>Nombre: ${al?`<b>${esc(al.nombre)}</b>`:'<span class="ae-linea"></span>'}</span><span>Fecha: <span class="ae-linea corta"></span></span></div>`;
  const instr=niveles
    ? (co? "En cada fila, marca con una X la casilla del nivel que crees que ha alcanzado tu compañero/a. Valora el trabajo, no a la persona."
         : "En cada fila, marca con una X la casilla del nivel que crees que has alcanzado. Sé sincero/a: sirve para aprender a valorar tu trabajo y no cambia tu nota.")
    : (co? "Lee cada pregunta y escribe en la casilla los puntos que crees que ha conseguido tu compañero/a. Valora el trabajo, no a la persona."
         : "Lee cada pregunta y escribe en la casilla los puntos que crees que has conseguido. Sé sincero/a: sirve para aprender a valorar tu trabajo y no cambia tu nota.");
  const desc=it=>o.desc&&it.desc&&it.desc.length? `<div class="ae-desc">${cxDescHTML(it.desc,"#555","#222",it.descFmt!==2)}</div>` : "";
  let tabla;
  if(niveles){
    const niv=cxnNiveles(rub);
    tabla=`<table class="ae-tabla ae-niv"><thead><tr><th>Qué se valora</th>${niv.map(l=>`<th>${esc(l.nombre||"")}</th>`).join("")}</tr></thead>
      <tbody>${cxItemsFlat(rub).map(it=>`<tr><th class="ae-cat">${esc(it.label||"(sin nombre)")}<div class="ae-peso">${cxnPct(cxnPeso(it))} % de la nota</div></th>
        ${niv.map(l=>`<td>${caja}${o.desc?`<div class="ae-desc">${esc(String((it.celdas||{})[l.id]||"").trim())}</div>`:""}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }else{
    const filas=[];
    const nodo=(sec,depth)=>{
      const k=cxElegirEf(sec);
      if(!sec.sinTitulo||k) filas.push(`<tr class="ae-sec"><td colspan="3">${esc(sec.title||CX_NOMBRE_TIPO[sec.tipo]||(depth===0?"Apartado":"Subapartado"))}${k?` · <i>contesta ${k} de ${cxNumHijos(sec)}</i>`:""}</td></tr>`);
      (sec.items||[]).forEach(it=>filas.push(`<tr><td>${it.unico&&!it.label?"":`<div class="ae-lab">${esc(it.label||"(sin enunciado)")}</div>`}${desc(it)}</td><td class="ae-max">${cxFmtPts(Number(it.max)||0)}</td><td class="ae-pts">${caja}</td></tr>`));
      (sec.subs||[]).forEach(s=>nodo(s,depth+1));
    };
    rub.forEach(s=>nodo(s,0));
    tabla=`<table class="ae-tabla"><thead><tr><th>Pregunta</th><th class="ae-max">Puntos</th><th class="ae-pts">${co?"Le doy":"Me doy"}</th></tr></thead><tbody>${filas.join("")}</tbody>
      <tfoot><tr><td style="text-align:right">Total</td><td class="ae-max">${cxFmtPts(cxMaxTotal(rub))}</td><td class="ae-pts">${caja}</td></tr></tfoot></table>`;
  }
  const refl=o.refl? `<div class="ae-refl">
      <div><b>${co?"Lo que mejor ha hecho:":"Lo que mejor he hecho:"}</b><span class="ae-renglon"></span><span class="ae-renglon"></span></div>
      <div><b>${co?"Un consejo para mejorar:":"Lo que tengo que mejorar y cómo lo haré:"}</b><span class="ae-renglon"></span><span class="ae-renglon"></span></div>
      ${co?"":`<div><b>¿Qué nota sobre 10 crees que vas a sacar?</b> ${caja}</div>`}
    </div>` : "";
  return `<section class="ae-hoja">
    <div class="ae-cab"><div class="ae-tit">${co?"👥 Coevaluación":"🙋 Autoevaluación"} · ${esc(act.nombre)}</div><div class="ae-meta">${esc(grupo.nombre)} · ${esc(cat.materia)}</div></div>
    ${datos}<p class="ae-instr">${instr}</p>${tabla}${refl}
  </section>`;
}
window.aeImprimirHojas=(actId,o)=>{
  const grupo=grupoActual(), act=grupo&&grupo.actividades.find(a=>a.id===actId); if(!act||!act.rubrica) return;
  o={tipo:o&&o.tipo==="co"?"co":"auto",hojas:o&&o.hojas==="blanco"?"blanco":"nombre",desc:!o||o.desc!==false,refl:!o||o.refl!==false};
  const hojas=o.hojas==="blanco"
    ? Array.from({length:Math.max(1,grupo.alumnos.length)},()=>aeHojaHTML(grupo,act,act.rubrica,null,o))
    : grupo.alumnos.filter(al=>marcaDe(grupo,al.id,act.id)!=="EX").map(al=>aeHojaHTML(grupo,act,mbRubricaVista(act,al.id),al,o));
  const css=`<style>
    body{max-width:none!important}
    .ae-hoja{break-after:page;page-break-after:always;font-size:13px}
    .ae-hoja:last-child{break-after:auto;page-break-after:auto}
    .ae-cab{display:flex;justify-content:space-between;align-items:baseline;gap:12px;border-bottom:2px solid #152a44;padding-bottom:6px;margin-bottom:10px}
    .ae-tit{font-family:Lora,Georgia,serif;font-size:19px;font-weight:700;color:#152a44}
    .ae-meta{color:#555;font-size:12px;white-space:nowrap}
    .ae-datos{display:flex;flex-wrap:wrap;gap:8px 26px;margin:6px 0 8px}
    .ae-linea{display:inline-block;min-width:220px;border-bottom:1px solid #333;height:1em;vertical-align:-2px}
    .ae-linea.corta{min-width:90px}
    .ae-instr{background:#f6efdc;border-left:4px solid #b3893a;padding:6px 10px;margin:0 0 10px;font-size:12.5px}
    .ae-tabla{border-collapse:collapse;width:100%}
    .ae-tabla th,.ae-tabla td{border:1px solid #bbb;padding:6px 8px;vertical-align:top;text-align:left}
    .ae-tabla thead th{background:#eef1f6;font-size:12px}
    .ae-tabla .ae-max{width:62px;text-align:center;white-space:nowrap}
    .ae-tabla .ae-pts{width:82px;text-align:center}
    .ae-sec td{background:#f6f3ea;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.03em}
    .ae-lab{font-weight:600}
    .ae-desc{color:#555;font-size:11.5px;margin-top:3px}
    .ae-caja{display:inline-block;width:46px;height:24px;border:1.5px solid #333;border-radius:4px;vertical-align:middle}
    .ae-niv td{text-align:center}
    .ae-niv td .ae-caja{width:20px;height:20px;display:block;margin:0 auto 4px}
    .ae-niv td .ae-desc{text-align:left}
    .ae-cat{background:#fafafa;min-width:120px}
    .ae-peso{font-weight:400;color:#666;font-size:11px}
    .ae-refl{margin-top:14px;display:grid;gap:10px}
    .ae-renglon{display:block;border-bottom:1px solid #999;height:22px}
    tr{break-inside:avoid;page-break-inside:avoid}
  </style>`;
  const tit=(o.tipo==="co"?"Coevaluación":"Autoevaluación")+" · "+act.nombre;
  abrirVentanaInforme(tit,css+hojas.join(""),{});
};
