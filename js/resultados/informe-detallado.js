/* ============================================================================
   Cuaderno del profesor · Distribución, evolución del alumno e informe detallado de cálculo
   js/resultados/informe-detallado.js
   ============================================================================ */

/* ---------- Resultados ---------- */
function distribucionNotas(grupo,trim){
  const counts={}; NIVCUANT.forEach(n=>counts[n.etq]=0);
  let conNota=0;
  grupo.alumnos.forEach(al=>{
    const v=notaTrimestre(grupo,al.id,trim);
    if(v==null) return;
    conNota++;
    counts[etiquetaNota(v,grupo).etq]++;
  });
  return {counts,conNota,total:grupo.alumnos.length};
}
function renderDistribucionHTML(grupo,trim){
  const {counts,conNota,total}=distribucionNotas(grupo,trim);
  if(conNota===0) return '<p style="color:var(--mut);font-size:14px">Todavía no hay notas de este periodo.</p>';
  const max=Math.max(...NIVCUANT.map(n=>counts[n.etq]),1);
  return `<div class="grid" style="gap:8px">
    ${NIVCUANT.map(n=>{
      const cnt=counts[n.etq]||0; const pct=max?(cnt/max*100):0;
      return `<div class="flex" style="gap:10px;align-items:center;flex-wrap:nowrap">
        <span style="width:100px;font-size:12.5px;color:var(--mut);flex-shrink:0">${n.etq}</span>
        <div style="flex:1;background:var(--paper);border-radius:6px;height:18px;overflow:hidden;min-width:60px">
          <div style="width:${pct}%;background:${n.bg};height:100%;border-left:3px solid ${n.fg}"></div>
        </div>
        <span style="width:22px;text-align:right;font-size:13px;font-weight:600;flex-shrink:0">${cnt}</span>
      </div>`;
    }).join("")}
    <p class="sub" style="margin:4px 0 0">${conNota} de ${total} alumno${total===1?"":"s"} con nota en ${TRIMESTRES[trim]}.</p>
  </div>`;
}
/* ---------- Modal "Evolución del alumno/a" (icono 👁️ en Resultados) ----------
   Muestra el informe detallado de cálculo de la nota (ver informeDetalladoBodyHTML,
   definido más abajo junto al resto de utilidades de cálculo). Permite elegir la
   evaluación (o la nota final de curso) sin cerrar el modal, y el botón Imprimir
   abre exactamente el mismo documento en la ventana de impresión ya existente
   (abrirVentanaInforme), así que lo que se ve en pantalla y lo que se imprime
   son siempre idénticos. */
function evolucionModalHTML(grupo,al){
  if(!al) return "";
  const periodo=state.ui.evolPeriodo;
  const periodoArg=periodo==="final"?"'final'":String(periodo);
  const tabBtn=(val,label)=>{
    const activo=periodo===val;
    return `<button class="${activo?'btn':'ghost'} small" style="${activo?'':'border:1px solid var(--line)'}" onclick="cambiarEvolPeriodo(${val==='final'?"'final'":val})">${label}</button>`;
  };
  const entrega=grupoTieneEntrega(grupo,al.id,periodo);
  const entregaBtn=entrega
    ?`<button class="ghost small" style="border:1px solid #bcdac8;color:#1e5631;background:#eef7f1" title="Pulsa para desmarcar" onclick="marcarInformeEntregado('${al.id}',${periodoArg})">✓ Entregado el ${fmt2(entrega.fecha)}</button>`
    :`<button class="ghost small" style="border:1px solid var(--line)" onclick="marcarInformeEntregado('${al.id}',${periodoArg})">Marcar como entregado</button>`;
  return `<div class="modal-overlay" onclick="if(event.target===this) cerrarEvolucionAlumno()">
    <div class="modal-box" style="max-width:80vw;width:80vw;height:80vh;max-height:80vh;display:flex;flex-direction:column;padding:0;overflow:hidden;background:var(--card);backdrop-filter:none;-webkit-backdrop-filter:none">
      <div style="padding:14px 26px;border-bottom:1px solid var(--line);flex-shrink:0">
        <div class="flex" style="justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap">
          <div style="font-weight:700;font-size:15px">👁️ ${esc(al.nombre)}</div>
          <div class="flex" style="flex-shrink:0;flex-wrap:wrap">
            ${entregaBtn}
            <button class="ghost" style="border:1px solid var(--line)" title="Informe para la familia: un archivo que se abre en el móvil, organizado por pestañas" onclick="pfDescargarAlumno('${al.id}',${periodoArg})">📱 Para la familia</button>
            <button class="ghost" style="border:1px solid var(--line)" onclick="exportarInformeDetallado('${al.id}',${periodoArg})">🖨️ Imprimir</button>
            <button class="modal-close" onclick="cerrarEvolucionAlumno()" aria-label="Cerrar">×</button>
          </div>
        </div>
        <div class="flex" style="gap:6px;flex-wrap:wrap;margin-top:10px">
          ${tabBtn(0,TRIMESTRES[0])}${tabBtn(1,TRIMESTRES[1])}${tabBtn(2,TRIMESTRES[2])}${tabBtn('final',"Evaluación final")}
        </div>
      </div>
      <div class="informe-modal-content" style="overflow-y:auto;-webkit-overflow-scrolling:touch;padding:24px 30px;flex:1">
        ${dsgReportCSS()}${informeDetalladoBodyHTML(grupo,al,periodo)}
      </div>
    </div>
  </div>`;
}
window.verEvolucionAlumno=alId=>{ state.ui.evolModalAl=alId; state.ui.evolPeriodo=state.ui.trim; save(); render(); };
window.cerrarEvolucionAlumno=()=>{ state.ui.evolModalAl=""; save(); render(); };
window.cambiarEvolPeriodo=periodo=>{ state.ui.evolPeriodo=periodo; save(); render(); };
function grupoTieneEntrega(grupo,alId,periodo){
  return grupo.entregasInforme?.[alId]?.[periodo]||null;
}
window.marcarInformeEntregado=(alId,periodo)=>{
  const grupo=grupoActual(); if(!grupo) return;
  if(!grupo.entregasInforme) grupo.entregasInforme={};
  if(!grupo.entregasInforme[alId]) grupo.entregasInforme[alId]={};
  if(grupo.entregasInforme[alId][periodo]) delete grupo.entregasInforme[alId][periodo];
  else grupo.entregasInforme[alId][periodo]={fecha:fechaISOLocal()};
  save(); render();
};

/* ==================================================================
   Informe detallado de cálculo de la nota (modal 👁️ "Evolución" y su
   versión imprimible). Muestra, con cifras, cómo se ha llegado tanto a
   la nota cuantitativa (0-10) como a la cualitativa (adquisición de
   competencias, en %): bloques → actividades → criterios/rúbrica, y
   competencias clave → específicas → criterios → actividades. Pensado
   para poder entregarse a una familia que pida explicaciones sobre
   una nota, así que va siempre con cifras y pesos explícitos, nunca
   solo con la nota final.
   ================================================================== */
function fmtPct(v){
  if(v==null||isNaN(v)) return "—";
  const r=Math.round(v*10)/10;
  return (Number.isInteger(r)?String(r):r.toFixed(1).replace(".",","))+"%";
}
function pct1(v){ return v==null?"—":Math.round(v)+"%"; }
function critLabelPlain(catalogoKey,critId){
  const idx=catIndex(catalogoKey);
  const l=idx.critMap[critId];
  if(!l) return esc(critId);
  const txt=l.texto||"";
  const corto=txt.length>90?txt.slice(0,90)+"…":txt;
  return `<strong>${esc(critId)}</strong><span class="dsg-crittexto">${esc(corto)}</span>`;
}

/* ---- Resumen del cálculo de la nota cuantitativa ----
   Tabla corta, para leer de un vistazo de dónde sale la nota de la evaluación
   elegida (o la final): cada bloque con su peso, las notas que lo forman, su
   media y lo que aporta; y la suma final. Va al principio del informe detallado
   y en el informe individual. Usa exactamente las mismas funciones del motor de
   notas (notaActividad, notaBloque, notaTrimestre…), así que no puede dar otra cifra. */
function rsnN(x){
  if(x==null||!isFinite(x)) return "—";
  const r=Math.round(_limpiaFP(x)*100)/100;
  return String(r).replace(".",",");
}
function rsnFactor(p){ return rsnN(p/100); }
function rsnCSS(){
  return `<style>
    .rsn{ --rk:#141b28; --rm:#5b6b82; --rl:#dde3ec; --ra:#b3893a; --rs:#f6f7f9; margin:0 0 26px; border:1px solid var(--rl); border-radius:12px; overflow:hidden; background:#fff; color:var(--rk); break-inside:avoid; page-break-inside:avoid; font-size:13px; line-height:1.4; -webkit-box-decoration-break:clone; box-decoration-break:clone; }
    .rsn-head{ display:flex; justify-content:space-between; align-items:baseline; gap:10px; flex-wrap:wrap; padding:11px 16px; background:linear-gradient(135deg,#152a44,#25456b); color:#fff; }
    .rsn-head b{ font-size:14px; letter-spacing:.01em; }
    .rsn-head span{ font-size:11.5px; color:rgba(255,255,255,.8); text-transform:uppercase; letter-spacing:.06em; }
    .rsn table{ width:100%; border-collapse:collapse; margin:0; font-size:13px; }
    .rsn th{ text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:var(--rm); font-weight:700; padding:7px 16px; border-bottom:1px solid var(--rl); background:#fff; }
    .rsn td{ padding:5px 16px; border:none; vertical-align:top; }
    .rsn tr{ break-inside:avoid; page-break-inside:avoid; }
    .rsn .rsn-num{ text-align:right; white-space:nowrap; font-variant-numeric:tabular-nums; }
    .rsn tbody.rsn-bloque{ break-inside:avoid; page-break-inside:avoid; }
    .rsn tbody.rsn-bloque + tbody.rsn-bloque tr.rsn-bh td{ border-top:1px solid var(--rl); }
    .rsn tr.rsn-bh td{ padding-top:10px; font-weight:700; background:var(--rs); }
    .rsn tr.rsn-bh .rsn-peso{ display:inline-block; margin-left:6px; padding:1px 7px; border-radius:9px; background:rgba(183,137,58,.16); color:#7a5a1e; font-size:11px; font-weight:700; }
    .rsn tr.rsn-act td{ color:#2b3445; }
    .rsn tr.rsn-act td:first-child{ padding-left:30px; }
    .rsn .rsn-nota{ font-weight:600; }
    .rsn .rsn-mut{ color:var(--rm); font-size:11.5px; font-weight:400; }
    .rsn .rsn-chips{ display:flex; flex-wrap:wrap; gap:4px 14px; padding-left:14px; font-size:12px; color:#2b3445; }
    .rsn .rsn-chips b{ font-weight:600; }
    .rsn tr.rsn-calc td{ padding-bottom:10px; color:var(--rm); font-size:12.5px; }
    .rsn tr.rsn-calc td:first-child{ padding-left:30px; font-style:italic; }
    .rsn tr.rsn-calc b{ color:var(--rk); }
    .rsn tfoot td{ border-top:2px solid var(--rk); padding:11px 16px; font-weight:700; background:#fff; }
    .rsn tfoot tr.rsn-extra td{ border-top:1px solid var(--rl); font-weight:400; padding:7px 16px; }
    .rsn .rsn-final{ font-size:18px; }
    .rsn .rsn-aviso{ padding:8px 16px 11px; font-size:11.5px; color:var(--rm); border-top:1px solid var(--rl); background:#fff; }
    .rsn .pill{ display:inline-block; padding:2px 9px; border-radius:10px; font-size:12px; font-weight:600; margin-left:8px; vertical-align:middle; }
    /* Móvil (y el informe para la familia): más compacta, y las cuentas pueden partirse en dos líneas. */
    @media (max-width:600px){
      .rsn table{ font-size:12px; }
      .rsn th, .rsn td, .rsn tfoot td, .rsn tfoot tr.rsn-extra td{ padding-left:8px; padding-right:8px; }
      .rsn tr.rsn-act td:first-child, .rsn tr.rsn-calc td:first-child{ padding-left:14px; }
      .rsn .rsn-num{ white-space:normal; }
      .rsn tr.rsn-calc td{ font-size:11.5px; }
      .rsn .rsn-final{ font-size:16px; }
    }
  </style>`;
}
/* Media de una lista {v,w}: «(7 + 9) / 2 = 8» o, con pesos distintos, «(7 × 40 + 9 × 60) / 100 = 8,2». */
function rsnMediaTexto(items,media){
  if(!items.length) return "—";
  if(items.length===1) return `<b>${rsnN(media)}</b>`;
  const iguales=items.every(x=>Math.abs(x.w-items[0].w)<1e-9);
  if(items.length>6) return `media de ${items.length} notas${iguales?"":" (ponderada)"} = <b>${rsnN(media)}</b>`;
  if(iguales) return `(${items.map(x=>rsnN(x.v)).join(" + ")}) / ${items.length} = <b>${rsnN(media)}</b>`;
  const sw=items.reduce((s,x)=>s+x.w,0);
  return `(${items.map(x=>`${rsnN(x.v)} × ${rsnN(x.w)}`).join(" + ")}) / ${rsnN(sw)} = <b>${rsnN(media)}</b>`;
}
function resumenCalculoNotaHTML(grupo,al,periodo){
  const esFinal=periodo==="final";
  const titulo=esFinal?"Nota final de curso":TRIMESTRES[periodo];
  const nota=esFinal?notaFinal(grupo,al.id):notaTrimestre(grupo,al.id,periodo);
  const base=esFinal?notaFinalSinExtra(grupo,al.id):notaTrimestreSinExtra(grupo,al.id,periodo);
  const cab=`<div class="rsn-head"><b>De dónde sale la nota · ${esc(titulo)}</b><span>Resumen del cálculo</span></div>`;
  let cuerpo="", aportes=[], sumaPesos=0, aviso="";
  if(esFinal){
    const disp=[0,1,2].filter(t=>notaTrimestre(grupo,al.id,t)!=null);
    if(!disp.length) return rsnCSS()+`<div class="rsn">${cab}<div class="rsn-aviso">Todavía no hay ninguna evaluación con nota.</div></div>`;
    const sw=disp.reduce((s,t)=>s+pesoTrimestreEfectivo(grupo,t,disp),0);
    cuerpo=disp.map(t=>{
      const v=notaTrimestre(grupo,al.id,t), w=pesoTrimestreEfectivo(grupo,t,disp), ap=v*w/sw, pe=ptsExtraEval(grupo,al.id,t);
      aportes.push(ap);
      return `<tbody class="rsn-bloque"><tr class="rsn-bh"><td>${esc(TRIMESTRES[t])}<span class="rsn-peso">${fmtPct(w/sw*100)}</span>${pe?` <span class="rsn-mut">(incluye +${fmtPts(pe)} extra)</span>`:""}</td><td class="rsn-num rsn-nota">${rsnN(v)}</td><td class="rsn-num">${rsnN(v)} × ${rsnN(w/sw)} = <b>${rsnN(ap)}</b></td></tr></tbody>`;
    }).join("");
    const sinNota=[0,1,2].filter(t=>!disp.includes(t));
    if(sinNota.length) aviso=`Sin nota todavía: ${sinNota.map(t=>esc(TRIMESTRES[t])).join(", ")}. La nota final se reparte entre las evaluaciones que ya tienen nota.`;
    sumaPesos=100;
  }else{
    const trim=periodo;
    const bloques=grupo.bloques.filter(b=>grupo.actividades.some(a=>a.trimestre===trim && a.bloqueId===b.id && !a.recupera));
    if(!bloques.length) return rsnCSS()+`<div class="rsn">${cab}<div class="rsn-aviso">No hay actividades en esta evaluación.</div></div>`;
    const sinNotaBloques=[];
    cuerpo=bloques.map(b=>{
      const acts=grupo.actividades.filter(a=>a.trimestre===trim && a.bloqueId===b.id && !a.recupera);
      const vb=notaBloque(grupo,al.id,b.id,trim), peso=Number(b.peso)||0;
      const items=[], fuera=[];
      acts.forEach(a=>{
        const v=notaActividad(grupo,al.id,a), m=marcaDe(grupo,al.id,a.id);
        if(v==null){ fuera.push(esc(a.nombre)+(m==="EX"?" (exento)":"")); return; }
        const sinEx=notaActividadSinExtra(grupo,al.id,a), orig=notaActividadBase(grupo,al.id,a), ex=extraAplicadoActividad(grupo,al.id,a);
        const notas=[];
        if(m==="NP") notas.push("no presentado");
        if(orig!=null && sinEx!=null && Math.abs(orig-sinEx)>1e-9) notas.push(`recuperación: ${rsnN(orig)} → ${rsnN(sinEx)}`);
        else if(orig==null && sinEx!=null) notas.push("nota de la recuperación");
        if(ex) notas.push(`+${fmtPts(ex)} extra`);
        items.push({a,v,w:pesoActividadEnBloque(grupo,a),notas});
      });
      const iguales=items.every(x=>Math.abs(x.w-(items[0]?items[0].w:0))<1e-9);
      if(vb==null || !(peso>0)){
        if(peso>0) sinNotaBloques.push(esc(b.label));
        return `<tbody class="rsn-bloque"><tr class="rsn-bh"><td>${esc(b.label)}<span class="rsn-peso">${fmtPct(peso)}</span></td><td class="rsn-num rsn-mut">${vb==null?"sin nota":rsnN(vb)}</td><td class="rsn-num rsn-mut">${peso>0?"no cuenta":"peso 0 %"}</td></tr></tbody>`;
      }
      const ap=vb*peso/100; aportes.push(ap); sumaPesos+=peso;
      let filas;
      if(items.length>6){
        filas=`<tr class="rsn-act"><td colspan="3"><div class="rsn-chips">${items.map(x=>`<span>${esc(x.a.nombre)}: <b>${rsnN(x.v)}</b>${x.notas.length?` <span class="rsn-mut">(${esc(x.notas.join("; "))})</span>`:""}</span>`).join("")}</div></td></tr>`;
      }else{
        filas=items.map(x=>`<tr class="rsn-act"><td>${esc(x.a.nombre)}${!iguales?` <span class="rsn-mut">· peso ${fmtPct(x.w)}</span>`:""}${x.notas.length?` <span class="rsn-mut">(${esc(x.notas.join("; "))})</span>`:""}</td><td class="rsn-num rsn-nota">${rsnN(x.v)}</td><td></td></tr>`).join("");
      }
      const fueraTxt=fuera.length?`<tr class="rsn-act"><td colspan="3" class="rsn-mut">No cuentan (sin nota): ${fuera.join(", ")}</td></tr>`:"";
      return `<tbody class="rsn-bloque">
        <tr class="rsn-bh"><td>${esc(b.label)}<span class="rsn-peso">${fmtPct(peso)}</span></td><td class="rsn-num">${rsnN(vb)}</td><td class="rsn-num"><b>${rsnN(ap)}</b></td></tr>
        ${filas}${fueraTxt}
        <tr class="rsn-calc"><td>Media del bloque</td><td class="rsn-num">${rsnMediaTexto(items,vb)}</td><td class="rsn-num">${rsnN(vb)} × ${rsnFactor(peso)} = <b>${rsnN(ap)}</b></td></tr>
      </tbody>`;
    }).join("");
    if(sinNotaBloques.length) aviso=`Sin ninguna nota en: ${sinNotaBloques.join(", ")}. La nota se calcula solo con los bloques que tienen nota (sus pesos suman el ${fmtPct(sumaPesos)}).`;
  }
  // Suma final
  const ajuste=!esFinal && sumaPesos>0 && Math.abs(sumaPesos-100)>0.01;
  const suma=aportes.length>1?`${aportes.map(rsnN).join(" + ")} = ${rsnN(aportes.reduce((s,x)=>s+x,0))}`:(aportes.length?rsnN(aportes[0]):"—");
  const sumaTxt=ajuste?`(${aportes.map(rsnN).join(" + ")}) / ${rsnFactor(sumaPesos)} = ${rsnN(base)}`:suma;
  const periodoExtra=esFinal?"final":periodo;
  const pe=base==null?0:ptsExtraEval(grupo,al.id,periodoExtra), eE=extraEval(grupo,al.id,periodoExtra);
  const filaBase=pe?`<tr class="rsn-extra"><td>${esFinal?"Media de las evaluaciones":"Suma de los bloques"}</td><td class="rsn-num" colspan="2">${sumaTxt}</td></tr>
    <tr class="rsn-extra"><td>Puntos extra${eE&&eE.motivo?` <span class="rsn-mut">· ${esc(eE.motivo)}</span>`:""}</td><td class="rsn-num" colspan="2">${rsnN(base)} + ${fmtPts(pe)}${base+pe>EXTRA_TOPE?' <span class="rsn-mut">(máximo 10)</span>':""} = ${rsnN(nota)}</td></tr>`:"";
  const totalCalc=pe?"":`<span class="rsn-mut" style="font-weight:400;margin-right:10px">${sumaTxt} →</span>`;
  return rsnCSS()+`<div class="rsn">${cab}
    <table>
      <thead><tr><th>${esFinal?"Evaluación":"Bloque y actividades"}</th><th class="rsn-num">Nota</th><th class="rsn-num">Aporta a la nota</th></tr></thead>
      ${cuerpo}
      <tfoot>${filaBase}<tr><td>${esFinal?"Nota final":"Nota de la evaluación"}</td><td class="rsn-num" colspan="2">${totalCalc}<span class="rsn-final">${nota==null?"—":fmt(nota)}</span>${nota==null?"":pillCuant(nota,grupo)}</td></tr></tfoot>
    </table>
    ${aviso?`<div class="rsn-aviso">${aviso}</div>`:""}
  </div>`;
}

/* ---- Nota cuantitativa: desglose ---- */
function desgloseNotaActividadHTML(grupo,al,a){
  if(a.esExamen){
    const vc=grupo.notasCuant?.[al.id]?.[a.id];
    if(a.rubrica){
      const sc=grupo.rubricScores?.[al.id]?.[a.id]||{};
      const rubAl=cxRubricaDe(a,al.id);
      const maxTotal=cxMaxTotal(rubAl);
      const nodo=(sec,depth)=>{
        const ev=cxEvalNodo(sec,sc);
        const itemsRows=(sec.items||[]).filter(it=>!it.unico).map(it=>{
          const val=sc[it.id]; const max=Number(it.max)||0;
          return `<tr><td style="padding-left:${16+depth*12}px">${esc(it.label||"Ítem")}</td><td style="text-align:right;white-space:nowrap">${val==null?"—":fmt(Number(val))} / ${fmt(max)}</td></tr>`;
        }).join("");
        return `<tr${sec.sinTitulo&&depth===0&&!cxElegirEf(sec)?' style="display:none"':""}><td style="font-size:10px;font-weight:700;${sec.tipo==="pregunta"||sec.tipo==="subpregunta"?"":"text-transform:uppercase;"}letter-spacing:.03em;color:var(--mu);padding-top:7px;padding-left:${depth*12}px">${esc((sec.title||"Apartado").split("\n")[0])}${cxElegirEf(sec)?` (${cxElegirEf(sec)} de ${cxNumHijos(sec)})`:""}</td><td style="text-align:right;font-size:11px;color:var(--mu);padding-top:7px">${ev.hay?fmt(ev.pts):"—"} / ${fmt(cxMaxNodo(sec))}</td></tr>${itemsRows}${(sec.subs||[]).map(s=>nodo(s,depth+1)).join("")}`;
      };
      const filas=(rubAl||[]).map(sec=>nodo(sec,0)).join("");
      return `<table class="dsg-mini"><tbody>${filas}<tr><td style="font-weight:700">Total del examen (rúbrica)</td><td style="text-align:right;font-weight:700">${vc==null?"—":fmt(vc)} / ${fmt(cxEscalarDe(a,al.id)&&maxTotal>0&&Math.abs(maxTotal-10)>=0.01?10:maxTotal)}</td></tr></tbody></table>`;
    }
    return `<p class="dsg-note">Nota directa del examen (sin rúbrica): <strong>${vc==null?"—":fmt(vc)}</strong> / 10.</p>`;
  }
  const filas=(a.criterios||[]).map(l=>{
    const n=grupo.notas?.[al.id]?.[a.id]?.[l.critId];
    return `<tr><td>${critLabelPlain(grupo.catalogoKey,l.critId)}</td><td style="text-align:right;white-space:nowrap">${n==null||n===""?"—":fmt(Number(n))}</td><td style="text-align:right;white-space:nowrap">${fmtPct(Number(l.peso)||0)}</td></tr>`;
  }).join("");
  if(!filas) return `<p class="dsg-note">Sin criterios calificados en esta actividad.</p>`;
  return `<table class="dsg-mini"><thead><tr><th>Criterio</th><th style="text-align:right">Nota</th><th style="text-align:right">Peso</th></tr></thead><tbody>${filas}</tbody></table>`;
}
function desgloseBloqueHTML(grupo,al,b,trim){
  const acts=grupo.actividades.filter(a=>a.trimestre===trim && a.bloqueId===b.id && !a.recupera);
  const v=notaBloque(grupo,al.id,b.id,trim);
  if(!acts.length){
    return `<div class="dsg-bloque"><div class="dsg-bloque-head"><span>${esc(b.label)}</span><span class="dsg-muted">Sin actividades este periodo</span></div></div>`;
  }
  const filas=acts.map(a=>{
    const va=notaActividadSinExtra(grupo,al.id,a);
    const vb=notaActividadBase(grupo,al.id,a);
    const ex=extraAplicadoActividad(grupo,al.id,a), exE=extraActividad(grupo,al.id,a.id);
    const w=pesoActividadEnBloque(grupo,a);
    const m=marcaDe(grupo,al.id,a.id);
    const recs=recuperacionesDe(grupo,a.id).filter(r=>notaActividadBase(grupo,al.id,r)!=null);
    const conRec=recs.length && va!=null && (vb==null || Math.abs(va-vb)>1e-9);
        let celda=m==="EX"?"Exento":(conRec?`${vb==null?"—":fmt(vb)} → <strong>${fmt(va)}</strong>`:(va==null?"—":fmt(va)))+(m==="NP"?" (NP)":"");
    if(ex) celda+=` + ${fmtPts(ex)} extra = <strong>${fmt(notaActividad(grupo,al.id,a))}</strong>`;
    // Cada actividad (fila + su desglose) es una pieza que no se parte entre dos páginas.
    return `<div class="dsg-act">
        <div class="dsg-act-fila">
          <div>${esc(a.nombre)}<span class="dsg-tag">${esc(a.tipo)}</span>${conRec?`<div class="dsg-muted" style="font-size:11.5px">Recuperada con: ${recs.map(r=>esc(r.nombre)).join(", ")}</div>`:""}${ex?`<div class="dsg-muted" style="font-size:11.5px">Puntos extra: +${fmtPts(ex)}${exE&&exE.motivo?" · "+esc(exE.motivo):""}</div>`:""}</div>
          <div class="dsg-act-num">${celda}</div>
          <div class="dsg-act-num">${fmtPct(w)}</div>
        </div>
        <div class="dsg-act-det">${desgloseNotaActividadHTML(grupo,al,a)}</div>
      </div>`;
  });
  // La cabecera del bloque va pegada a su primera actividad: nunca se queda sola al pie de una página.
  return `<div class="dsg-bloque">
    <div class="dsg-bloque-cab">
      <div class="dsg-bloque-head"><span>${esc(b.label)}</span><span>${v==null?"—":fmt(v)} <small>peso ${fmtPct(b.peso)} del trimestre</small></span></div>
      <div class="dsg-act-fila dsg-act-th"><div>Actividad</div><div class="dsg-act-num">Nota</div><div class="dsg-act-num">Peso en el bloque</div></div>
      ${filas[0]||""}
    </div>
    ${filas.slice(1).join("")}
  </div>`;
}
function desgloseTrimestreHTML(grupo,al,trim){
  const v=notaTrimestre(grupo,al.id,trim);
  const bloquesHtml=grupo.bloques.map(b=>desgloseBloqueHTML(grupo,al,b,trim)).join("");
  return `<div class="dsg-formula">Nota = media ponderada de los bloques de calificación de ${esc(TRIMESTRES[trim].toLowerCase())}.</div>
    ${bloquesHtml}
    ${dsgExtraEvalHTML(grupo,al,trim,notaTrimestreSinExtra(grupo,al.id,trim),"Media de los bloques")}
    <div class="dsg-total"><span>Nota del periodo</span><span>${v==null?"—":fmt(v)} / 10</span></div>`;
}
/* Línea «Media … X · Puntos extra +Y (motivo)» antes del total, solo si hay extra que se suma. */
function dsgExtraEvalHTML(grupo,al,periodo,base,etiqueta){
  const pts=ptsExtraEval(grupo,al.id,periodo); if(!pts||base==null) return "";
  const e=extraEval(grupo,al.id,periodo);
  return `<table class="dsg-mini" style="margin-top:10px"><tbody>
    <tr><td>${etiqueta}</td><td style="text-align:right">${fmt(base)}</td></tr>
    <tr><td>Puntos extra${e&&e.motivo?` <span class="dsg-muted">· ${esc(e.motivo)}</span>`:""}</td><td style="text-align:right">+${fmtPts(pts)}${base+pts>EXTRA_TOPE?' <span class="dsg-muted">(máximo 10)</span>':""}</td></tr>
  </tbody></table>`;
}
function desgloseTrimResumenBloquesHTML(grupo,al,trim){
  const filas=grupo.bloques.map(b=>{
    const v=notaBloque(grupo,al.id,b.id,trim);
    return `<tr><td>${esc(b.label)}</td><td style="text-align:right">${v==null?"—":fmt(v)}</td><td style="text-align:right">${fmtPct(b.peso)}</td></tr>`;
  }).join("");
  return `<table class="dsg-mini"><thead><tr><th>Bloque</th><th style="text-align:right">Nota</th><th style="text-align:right">Peso</th></tr></thead><tbody>${filas}</tbody></table>`;
}
function desgloseFinalHTML(grupo,al){
  const disponibles=[0,1,2].filter(t=>notaTrimestre(grupo,al.id,t)!=null);
  const nf=notaFinal(grupo,al.id);
  const filasResumen=[0,1,2].map(t=>{
    const v=notaTrimestre(grupo,al.id,t);
    const w=v==null?null:pesoTrimestreEfectivo(grupo,t,disponibles);
    const pe=v==null?0:ptsExtraEval(grupo,al.id,t);
    return `<tr><td>${esc(TRIMESTRES[t])}${pe?` <span class="dsg-muted">(incluye +${fmtPts(pe)} extra)</span>`:""}</td><td style="text-align:right">${v==null?"—":fmt(v)}</td><td style="text-align:right">${w==null?"—":fmtPct(w)}</td></tr>`;
  }).join("");
  const detalle=disponibles.map(t=>`<div class="dsg-trim-block"><h3>${esc(TRIMESTRES[t])}</h3>${desgloseTrimResumenBloquesHTML(grupo,al,t)}</div>`).join("");
  return `<div class="dsg-formula">Nota final = media ponderada de las evaluaciones con nota registrada.</div>
    <table class="dsg-tabla"><thead><tr><th>Evaluación</th><th style="text-align:right">Nota</th><th style="text-align:right">Peso</th></tr></thead><tbody>${filasResumen}</tbody></table>
    ${dsgExtraEvalHTML(grupo,al,"final",notaFinalSinExtra(grupo,al.id),"Media de las evaluaciones")}
    <div class="dsg-total"><span>Nota final de curso</span><span>${nf==null?"—":fmt(nf)} / 10</span></div>
    ${detalle?`<div class="dsg-subtitle" style="margin-top:18px">Detalle de bloques por evaluación</div>${detalle}`:""}`;
}

/* ---- Nota cualitativa (competencias): desglose ---- */
function desgloseCriterioHTML(grupo,al,cid,trim){
  return conTrim(trim,()=>{
    const acts=actsTrim(grupo).filter(a=>(a.criterios||[]).some(l=>l.critId===cid));
    if(!acts.length) return `<p class="dsg-muted" style="margin:2px 0 8px">Sin actividades con este criterio en este periodo.</p>`;
    const filas=acts.map(a=>{
      const l=a.criterios.find(x=>x.critId===cid);
      const n=grupo.notas?.[al.id]?.[a.id]?.[cid];
      return `<tr><td>${esc(a.nombre)}</td><td style="text-align:right">${n==null||n===""?"—":fmt(Number(n))}</td><td style="text-align:right">${fmtPct(Number(l.peso)||0)}</td></tr>`;
    }).join("");
    return `<table class="dsg-mini"><thead><tr><th>Actividad</th><th style="text-align:right">Nota (0-10)</th><th style="text-align:right">Peso</th></tr></thead><tbody>${filas}</tbody></table>`;
  });
}
function desgloseCEHTML(grupo,al,ce,periodo){
  const p=periodo==="final"?scoreCEAnual(grupo,al.id,ce.id):conTrim(periodo,()=>scoreCE(grupo,al.id,ce.id));
  if(p==null) return "";
  let interior;
  if(periodo==="final"){
    const disponibles=[0,1,2].filter(t=>conTrim(t,()=>scoreCE(grupo,al.id,ce.id))!=null);
    const filas=[0,1,2].map(t=>{
      const v=conTrim(t,()=>scoreCE(grupo,al.id,ce.id));
      const w=v==null?null:pesoTrimestreEfectivo(grupo,t,disponibles);
      return `<tr><td>${esc(TRIMESTRES[t])}</td><td style="text-align:right">${v==null?"—":pct1(v)}</td><td style="text-align:right">${w==null?"—":fmtPct(w)}</td></tr>`;
    }).join("");
    interior=`<table class="dsg-mini"><thead><tr><th>Evaluación</th><th style="text-align:right">Adquisición</th><th style="text-align:right">Peso</th></tr></thead><tbody>${filas}</tbody></table>`;
  }else{
    interior=ce.criterios.map(c=>{
      const cp=conTrim(periodo,()=>scoreCriterio(grupo,al.id,c.id));
      if(cp==null) return "";
      const w=pesoCriterio(grupo,c.id);
      return `<div class="dsg-criterio">
        <div class="dsg-criterio-head"><span>${critLabelPlain(grupo.catalogoKey,c.id)}</span><span>${pct1(cp)} <small>· peso ${fmtPct(w)}</small></span></div>
        ${desgloseCriterioHTML(grupo,al,c.id,periodo)}
      </div>`;
    }).filter(Boolean).join("")||`<p class="dsg-muted">Sin criterios con nota en este periodo.</p>`;
  }
  return `<div class="dsg-ce">
    <div class="dsg-ce-head"><span><strong>${esc(ce.id)}</strong> · ${esc(ce.titulo)}</span><span>${pillPlain(grupo,p)}</span></div>
    ${interior}
  </div>`;
}
function desgloseCCHTML(grupo,al,cc,periodo){
  const idx=catIndex(grupo.catalogoKey);
  const p=periodo==="final"?scoreCCAnual(grupo,al.id,cc):conTrim(periodo,()=>scoreCC(grupo,al.id,cc));
  if(p==null) return "";
  const cesFilas=idx.cat.ces.filter(ce=>ce.cc.includes(cc)).map(ce=>{
    const cep=periodo==="final"?scoreCEAnual(grupo,al.id,ce.id):conTrim(periodo,()=>scoreCE(grupo,al.id,ce.id));
    if(cep==null) return "";
    const w=pesoCEenCC(grupo,ce.id,cc);
    return `<tr><td>${esc(ce.id)} · ${esc(ce.titulo)}</td><td style="text-align:right">${pct1(cep)}</td><td style="text-align:right">${fmtPct(w)}</td></tr>`;
  }).filter(Boolean).join("");
  if(!cesFilas) return "";
  return `<div class="dsg-ce">
    <div class="dsg-ce-head"><span><strong>${esc(cc)}</strong> · ${esc(COMP_CLAVE[cc]||cc)}</span><span>${pillPlain(grupo,p)}</span></div>
    <table class="dsg-mini"><thead><tr><th>Competencia específica</th><th style="text-align:right">Adquisición</th><th style="text-align:right">Peso en ${esc(cc)}</th></tr></thead><tbody>${cesFilas}</tbody></table>
  </div>`;
}
/* ---- Gráficos (SVG en línea, sin librerías: se ven igual en pantalla y en el PDF impreso) ---- */
function svgBarNotas(valores){
  const w=640,h=168,padL=30,padB=26,padT=16,padR=10;
  const chartW=w-padL-padR, chartH=h-padT-padB;
  const n=valores.length, gap=16;
  const barW=(chartW-gap*(n-1))/n;
  const gridLines=[0,5,10].map(v=>{
    const y=padT+chartH-(v/10)*chartH;
    return `<line x1="${padL}" y1="${y}" x2="${w-padR}" y2="${y}" stroke="#eef1f6" stroke-width="1"/><text x="${padL-6}" y="${y+3}" text-anchor="end" font-size="9" fill="#8d97ab">${v}</text>`;
  }).join("");
  const bars=valores.map((d,i)=>{
    const x=padL+i*(barW+gap);
    const val=d.value==null?0:d.value;
    const bh=d.value==null?0:(val/10)*chartH;
    const y=padT+chartH-bh;
    const fill=d.value==null?"#eef1f6":(d.activo?"#b3893a":"#e4d9c0");
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" rx="5" fill="${fill}"/>
      <text x="${(x+barW/2).toFixed(1)}" y="${(y-7).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="#141b28">${d.value==null?"—":fmt(d.value)}</text>
      <text x="${(x+barW/2).toFixed(1)}" y="${h-7}" text-anchor="middle" font-size="10.5" font-weight="${d.activo?700:400}" fill="${d.activo?'#141b28':'#5b6b82'}">${esc(d.label)}</text>`;
  }).join("");
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block" role="img" aria-label="Evolución de la nota por evaluación">${gridLines}${bars}</svg>`;
}
function svgRadarCC(ejes){
  const n=ejes.length;
  if(n<3) return "";
  const size=320, cx=size/2, cy=size/2-4, R=size/2-76;
  const angle=i=>-Math.PI/2+i*(2*Math.PI/n);
  const pt=(i,r)=>{ const a=angle(i); return [cx+r*Math.cos(a), cy+r*Math.sin(a)]; };
  const rings=[25,50,75,100].map(pctv=>{
    const r=R*(pctv/100);
    return `<polygon points="${ejes.map((_,i)=>pt(i,r).map(v=>v.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="#e6e9ef" stroke-width="1"/>`;
  }).join("");
  const axes=ejes.map((e,i)=>{ const [x,y]=pt(i,R); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e6e9ef" stroke-width="1"/>`; }).join("");
  const dataPts=ejes.map((e,i)=>pt(i,R*((e.value==null?0:e.value)/100)).map(v=>v.toFixed(1)).join(",")).join(" ");
  const labels=ejes.map((e,i)=>{
    const [x,y]=pt(i,R+28);
    const c=Math.cos(angle(i));
    const anchor=Math.abs(c)<0.35?"middle":(c>0?"start":"end");
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" font-size="10.5" font-weight="700" fill="#141b28">${esc(e.label)}</text>
      <text x="${x.toFixed(1)}" y="${(y+12).toFixed(1)}" text-anchor="${anchor}" font-size="9.5" fill="#5b6b82">${e.value==null?"—":Math.round(e.value)+"%"}</text>`;
  }).join("");
  return `<svg viewBox="0 0 ${size} ${size-16}" style="width:100%;max-width:340px;height:auto;display:block;margin:0 auto" role="img" aria-label="Perfil de competencias clave">
    ${rings}${axes}<polygon points="${dataPts}" fill="rgba(183,137,58,.28)" stroke="#b3893a" stroke-width="2"/>${labels}
  </svg>`;
}
function graficoEvolucionNotaHTML(grupo,al,periodoActivo){
  const etiquetas=["1ª ev.","2ª ev.","3ª ev."];
  const valores=[0,1,2].map(t=>({label:etiquetas[t],value:notaTrimestre(grupo,al.id,t),activo:periodoActivo===t}));
  valores.push({label:"Final",value:notaFinal(grupo,al.id),activo:periodoActivo==="final"});
  return svgBarNotas(valores);
}
function graficoRadarCCHTML(grupo,al,periodo){
  const idx=catIndex(grupo.catalogoKey);
  const ccList=Object.keys(COMP_CLAVE).filter(cc=>idx.cat.ces.some(ce=>ce.cc.includes(cc)));
  const ejes=ccList.map(cc=>({label:cc,value:periodo==="final"?scoreCCAnual(grupo,al.id,cc):conTrim(periodo,()=>scoreCC(grupo,al.id,cc))}));
  if(ejes.filter(e=>e.value!=null).length<3) return "";
  return svgRadarCC(ejes);
}


function desgloseCualitativoHTML(grupo,al,periodo){
  const idx=catIndex(grupo.catalogoKey);
  const ccList=Object.keys(COMP_CLAVE).filter(cc=>idx.cat.ces.some(ce=>ce.cc.includes(cc)));
  const ccHtml=ccList.map(cc=>desgloseCCHTML(grupo,al,cc,periodo)).filter(Boolean).join("");
  const ceHtml=idx.cat.ces.map(ce=>desgloseCEHTML(grupo,al,ce,periodo)).filter(Boolean).join("");
  const radar=graficoRadarCCHTML(grupo,al,periodo);
  return `${radar?`<div class="dsg-chart-box" style="margin-bottom:22px"><div class="dsg-subtitle" style="text-align:center">Perfil competencial</div>${radar}</div>`:""}
    <div class="dsg-subtitle">Competencias clave</div>
    ${ccHtml||'<p class="dsg-muted">Sin datos de competencias en este periodo.</p>'}
    <div class="dsg-subtitle" style="margin-top:22px">Competencias específicas — detalle</div>
    ${ceHtml||'<p class="dsg-muted">Sin datos de competencias en este periodo.</p>'}`;
}

/* ---- Documento completo + hoja de estilos propia (pantalla e impresión) ---- */
function dsgReportCSS(){
  return `<style>
    .dsg-report{ --dk:#141b28; --mu:#5b6b82; --ln:#dde3ec; --ac:#b3893a; --acsoft:rgba(183,137,58,.14); --acbord:rgba(183,137,58,.4); --sf2:#f3f5f8; color:var(--dk); line-height:1.5; }
    .dsg-report .dsg-letterhead{ font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--mu); margin:0 0 14px; padding-bottom:10px; border-bottom:1px solid var(--ln); }
    .dsg-report .dsg-eyebrow{ font-size:11px; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:var(--ac); margin:0 0 7px; }
    .dsg-report .dsg-alumno{ font-size:26px; font-weight:700; margin:0 0 9px; color:var(--dk); letter-spacing:-.01em; }
    .dsg-report .dsg-meta{ font-size:14px; color:var(--mu); margin:0 0 20px; }
    .dsg-report .dsg-meta b{ color:var(--dk); font-weight:600; }
    .dsg-report .dsg-meta .sep{ color:#c7d1de; margin:0 8px; }
    .dsg-report .dsg-resumen{ display:flex; justify-content:space-between; align-items:center; gap:16px; margin:0 0 28px; padding:16px 20px; background:var(--acsoft); border:1px solid var(--acbord); border-radius:12px; }
    .dsg-report .dsg-resumen-label{ font-size:11.5px; text-transform:uppercase; letter-spacing:.05em; color:var(--ac); font-weight:700; }
    .dsg-report .dsg-resumen-valor{ font-size:26px; font-weight:700; color:#1c1408; margin-top:2px; }
    .dsg-report .dsg-resumen-valor small{ font-size:13px; font-weight:400; color:var(--ac); }
    .dsg-report .dsg-h2{ font-size:14px; text-transform:uppercase; letter-spacing:.04em; color:var(--dk); border-bottom:2px solid var(--ln); padding-bottom:8px; margin:0 0 14px; font-weight:800; }
    .dsg-report .dsg-formula{ font-size:13px; color:var(--mu); font-style:italic; margin:0 0 12px; }
    .dsg-report .dsg-subtitle{ font-size:12.5px; text-transform:uppercase; letter-spacing:.04em; color:var(--mu); font-weight:700; margin:0 0 10px; padding-top:4px; }
    .dsg-report .dsg-muted{ color:var(--mu); font-size:13px; }
    .dsg-report .dsg-note{ font-size:12.5px; color:var(--mu); margin:2px 0 10px; }
    .dsg-report .dsg-bloque{ border:1px solid var(--ln); border-radius:10px; margin:0 0 14px; overflow:hidden; -webkit-box-decoration-break:clone; box-decoration-break:clone; }
    .dsg-report .dsg-bloque-cab, .dsg-report .dsg-act{ break-inside:avoid; page-break-inside:avoid; }
    .dsg-report .dsg-act-fila{ display:grid; grid-template-columns:minmax(0,1fr) 190px 130px; gap:12px; padding:8px 14px; font-size:13px; align-items:start; }
    .dsg-report .dsg-act + .dsg-act .dsg-act-fila, .dsg-report .dsg-bloque-cab + .dsg-act .dsg-act-fila{ border-top:1px solid var(--ln); }
    .dsg-report .dsg-act-th{ font-size:10.5px; text-transform:uppercase; letter-spacing:.05em; color:var(--mu); font-weight:700; border-bottom:1px solid var(--ln); }
    .dsg-report .dsg-act-num{ text-align:right; }
    .dsg-report .dsg-act-det{ padding:0 14px 12px; }
    .dsg-report .dsg-act-det .dsg-mini{ margin-bottom:2px; }
    .dsg-report .dsg-bloque-head{ display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--sf2); font-size:13.5px; font-weight:700; }
    .dsg-report .dsg-bloque-head small{ font-weight:400; color:var(--mu); font-size:11.5px; }
    .dsg-report .dsg-tabla{ width:100%; border-collapse:collapse; font-size:13px; }
    .dsg-report .dsg-tabla th{ text-align:left; font-size:10.5px; text-transform:uppercase; letter-spacing:.05em; color:var(--mu); padding:8px 14px; border-bottom:1px solid var(--ln); }
    .dsg-report .dsg-tabla td{ padding:8px 14px; border-bottom:1px solid var(--ln); vertical-align:top; }
    .dsg-report .dsg-tag{ display:inline-block; font-size:10px; color:var(--mu); border:1px solid var(--ln); border-radius:5px; padding:1px 6px; margin-left:6px; text-transform:uppercase; }
    .dsg-report .dsg-mini{ width:100%; border-collapse:collapse; font-size:12px; margin:2px 0 10px; background:var(--sf2); border-radius:8px; overflow:hidden; }
    .dsg-report .dsg-mini th{ text-align:left; font-size:10px; text-transform:uppercase; color:var(--mu); padding:6px 10px; }
    .dsg-report .dsg-mini td{ padding:6px 10px; border-top:1px solid #e6e9ef; vertical-align:top; }
    .dsg-report .dsg-crittexto{ display:block; color:var(--mu); font-weight:400; font-size:11.5px; margin-top:1px; }
    .dsg-report .dsg-total{ display:flex; justify-content:space-between; font-size:15px; font-weight:800; padding:12px 14px; border-top:2px solid var(--dk); margin-top:6px; }
    .dsg-report .dsg-trim-block{ margin:0 0 18px; page-break-inside:avoid; }
    .dsg-report .dsg-trim-block h3{ font-size:12.5px; text-transform:uppercase; letter-spacing:.04em; color:var(--ac); margin:0 0 8px; font-weight:800; }
    .dsg-report .dsg-ce{ border:1px solid var(--ln); border-radius:10px; margin:0 0 14px; padding:12px 14px; page-break-inside:avoid; }
    .dsg-report .dsg-ce-head{ display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:8px; font-size:13.5px; }
    .dsg-report .dsg-criterio{ margin:0 0 10px; }
    .dsg-report .dsg-criterio-head{ display:flex; justify-content:space-between; gap:10px; font-size:12.5px; font-weight:600; margin-bottom:4px; }
    .dsg-report .dsg-criterio-head small{ font-weight:400; color:var(--mu); }
    .dsg-report .dsg-chart-box{ border:1px solid var(--ln); border-radius:12px; padding:16px 18px; background:#fff; page-break-inside:avoid; }
    /* Maquetación al imprimir: ningún título se queda solo al pie de una página
       y los cuadros no se parten (si uno no cabe en una página entera, se parte
       entre actividades o criterios y el borde se repite en cada trozo). */
    .dsg-report .dsg-h2, .dsg-report .dsg-subtitle, .dsg-report .dsg-formula, .dsg-report .dsg-bloque-head,
    .dsg-report .dsg-ce-head, .dsg-report .dsg-criterio-head, .dsg-report .dsg-trim-block h3{ break-after:avoid; page-break-after:avoid; }
    .dsg-report .dsg-total{ break-before:avoid; page-break-before:avoid; break-inside:avoid; }
    .dsg-report .dsg-resumen, .dsg-report .dsg-criterio, .dsg-report .dsg-mini tr, .dsg-report .dsg-tabla tr{ break-inside:avoid; page-break-inside:avoid; }
    .dsg-report .dsg-ce{ -webkit-box-decoration-break:clone; box-decoration-break:clone; }
    .dsg-report .dsg-mini thead{ display:table-header-group; }
    .dsg-report p{ orphans:3; widows:3; }
    @page{ margin:2.3cm 2cm; }
  </style>`;
}
function informeDetalladoBodyHTML(grupo,al,periodo,opts){
  opts=opts||{};
  const cat=getCatalogo(grupo.catalogoKey);
  const periodoLabel=periodo==="final"?"Evaluación final (curso completo)":TRIMESTRES[periodo];
  const notaC=periodo==="final"?notaFinal(grupo,al.id):notaTrimestre(grupo,al.id,periodo);
  const fechaLarga=new Date().toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"});
  return `<div class="dsg-report"${opts.pageBreak?' style="page-break-before:always;break-before:page"':''}>
    ${state.centroNombre?`<div class="dsg-letterhead">${esc(state.centroNombre)}</div>`:""}
    <div class="dsg-eyebrow">Informe detallado de evaluación</div>
    <h1 class="dsg-alumno">${esc(al.nombre)}</h1>
    <div class="dsg-meta">${esc(cat.materia)} ${esc(cat.curso)}<span class="sep">·</span>Grupo ${esc(grupo.nombre)}<span class="sep">·</span><b>${esc(periodoLabel)}</b><span class="sep">·</span>${fechaLarga}</div>
    <div class="dsg-resumen">
      <div><div class="dsg-resumen-label">Nota cuantitativa</div><div class="dsg-resumen-valor">${notaC==null?"—":fmt(notaC)}<small> / 10</small></div></div>
      <div>${pillCuant(notaC)}</div>
    </div>
    ${resumenCalculoNotaHTML(grupo,al,periodo)}
    <div class="dsg-chart-box" style="margin-bottom:28px">
      <div class="dsg-subtitle" style="text-align:center">Evolución de la nota cuantitativa</div>
      ${graficoEvolucionNotaHTML(grupo,al,periodo)}
    </div>
    <h2 class="dsg-h2">Cómo se ha calculado la nota cuantitativa</h2>
    ${periodo==="final"?desgloseFinalHTML(grupo,al):desgloseTrimestreHTML(grupo,al,periodo)}
    <h2 class="dsg-h2" style="margin-top:30px">Cómo se ha calculado la nota cualitativa (competencias)</h2>
    ${desgloseCualitativoHTML(grupo,al,periodo)}
  </div>`;
}
window.exportarInformeDetallado=(alId,periodo)=>{
  const grupo=grupoActual(); if(!grupo) return;
  const al=grupo.alumnos.find(a=>a.id===alId); if(!al) return;
  const p=(periodo==="final")?"final":Number(periodo);
  const periodoLabel=p==="final"?"final de curso":TRIMESTRES[p];
  const cat=getCatalogo(grupo.catalogoKey);
  const portada=generarPortadaHTML(`Informe detallado — ${al.nombre}`,
    [`${esc(cat.materia)} · ${esc(cat.curso)} · Grupo ${esc(grupo.nombre)}`,
     `<strong>${esc(p==="final"?"Evaluación final":periodoLabel)}</strong>`,
     `Curso escolar: <strong>${esc(cursoEscolarEfectivo(null))}</strong>`,
     profesorNombreEfectivo(null)?`Elaborado por: <strong>${esc(profesorNombreEfectivo(null))}</strong>`:""], []);
  abrirVentanaInforme(`Informe detallado · ${al.nombre} · ${periodoLabel}`, dsgReportCSS()+informeDetalladoBodyHTML(grupo,al,p), {portada});
};
function informesDetalladosPortadaHTML(grupo,alumnos,periodo){
  const cat=getCatalogo(grupo.catalogoKey);
  const periodoLabel=periodo==="final"?"Evaluación final (curso completo)":TRIMESTRES[periodo];
  const fechaLarga=new Date().toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"});
  const filas=alumnos.map(al=>{
    const v=periodo==="final"?notaFinal(grupo,al.id):notaTrimestre(grupo,al.id,periodo);
    return `<tr><td>${esc(al.nombre)}</td><td style="text-align:right;font-weight:600;white-space:nowrap">${v==null?"—":fmt(v)}</td><td>${pillCuant(v)}</td></tr>`;
  }).join("");
  return `<div class="dsg-report">
    ${state.centroNombre?`<div class="dsg-letterhead">${esc(state.centroNombre)}</div>`:""}
    <div class="dsg-eyebrow">Informes detallados de evaluación</div>
    <h1 class="dsg-alumno" style="font-size:23px">${esc(grupo.nombre)}</h1>
    <div class="dsg-meta">${esc(cat.materia)} ${esc(cat.curso)}<span class="sep">·</span><b>${esc(periodoLabel)}</b><span class="sep">·</span>${fechaLarga}</div>
    <p class="dsg-muted" style="margin:0 0 16px">${alumnos.length} alumno${alumnos.length===1?"":"s"} con nota en este periodo, ordenados alfabéticamente por apellidos. Cada uno ocupa sus propias páginas a continuación de este índice.</p>
    <table class="dsg-tabla"><thead><tr><th>Alumno/a</th><th style="text-align:right">Nota</th><th>Calificación</th></tr></thead><tbody>${filas}</tbody></table>
  </div>`;
}
window.exportarInformesDetalladosTodos=periodo=>{
  const grupo=grupoActual(); if(!grupo) return;
  const p=(periodo==="final")?"final":Number(periodo);
  const conNota=grupo.alumnos.filter(al=>(p==="final"?notaFinal(grupo,al.id):notaTrimestre(grupo,al.id,p))!=null);
  if(!conNota.length){ mostrarAviso("Todavía no hay ningún alumno o alumna con nota en este periodo."); return; }
  const periodoLabel=p==="final"?"final de curso":TRIMESTRES[p];
  const cat=getCatalogo(grupo.catalogoKey);
  const portadaResumen=informesDetalladosPortadaHTML(grupo,conNota,p);
  const partes=conNota.map(al=>informeDetalladoBodyHTML(grupo,al,p,{pageBreak:true}));
  const portada=generarPortadaHTML(`Informes detallados — ${grupo.nombre}`,
    [`${esc(cat.materia)} · ${esc(cat.curso)}`,
     `<strong>${esc(p==="final"?"Evaluación final (curso completo)":periodoLabel)}</strong>`,
     `Curso escolar: <strong>${esc(cursoEscolarEfectivo(null))}</strong>`,
     profesorNombreEfectivo(null)?`Elaborado por: <strong>${esc(profesorNombreEfectivo(null))}</strong>`:""], []);
  abrirVentanaInforme(`Informes detallados · ${grupo.nombre} · ${periodoLabel}`, dsgReportCSS()+portadaResumen+partes.join(""), {portada});
};


