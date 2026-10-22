/* ============================================================================
   Cuaderno del profesor · Calendario de Inicio: eventos, exámenes y entregas
   js/inicio/calendario.js
   ============================================================================ */

/* =================================================================
   CALENDARIO DE INICIO — eventos (exámenes, entregas...) con vista
   mensual y resumen editable. Vive en state.eventos (top-level, se
   incluye solo con Exportar/Importar copia).
   ================================================================= */
const AG_TIPOS=[
  {id:"examen",label:"Examen",color:"#dc2626"},
  {id:"entrega",label:"Entrega de trabajo",color:"#2563eb"},
  {id:"reunion",label:"Reunión",color:"#7c3aed"},
  {id:"cocope",label:"COCOPE",color:"#059669"},
  {id:"claustro",label:"Claustro",color:"#ea580c"},
  {id:"otro",label:"Otro",color:"#64748b"}
];
const AG_DIAS=["L","M","X","J","V","S","D"];
const AG_DIAS_LARGO=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const AG_MESES=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
function agTipoBase(id){ return AG_TIPOS.find(t=>t.id===id)||AG_TIPOS[AG_TIPOS.length-1]; }
function agTipoInfo(id){
  const base=agTipoBase(id);
  const custom=(state.tiposColores||{})[id];
  return custom ? {...base,color:custom} : base;
}
function agHoyStr(){ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function agFestivoEnDia(fecha){ return (state.festivos||[]).find(f=>f && f.fechaInicio && fecha>=f.fechaInicio && fecha<=(f.fechaFin||f.fechaInicio)); }
function agEsFestivo(fecha){ return !!agFestivoEnDia(fecha); }
window.agToggleFestivo=(fecha)=>{
  if(!Array.isArray(state.festivos)) state.festivos=[];
  const existente=agFestivoEnDia(fecha);
  if(existente){ state.festivos=state.festivos.filter(f=>f.id!==existente.id); }
  else{ state.festivos.push({id:uid(),fechaInicio:fecha,fechaFin:fecha,etiqueta:""}); }
  save(); render();
};
window.agAnadirFestivo=()=>{
  const ini=document.getElementById("agFestIni")?.value||"";
  const finInput=document.getElementById("agFestFin")?.value||"";
  const etiqueta=(document.getElementById("agFestEtiqueta")?.value||"").trim();
  if(!ini) return;
  const fin=(finInput && finInput>=ini) ? finInput : ini;
  if(!Array.isArray(state.festivos)) state.festivos=[];
  state.festivos.push({id:uid(),fechaInicio:ini,fechaFin:fin,etiqueta});
  save(); render();
  mostrarToast("✓ Festivo añadido");
};
window.agEliminarFestivo=(id)=>{
  state.festivos=(state.festivos||[]).filter(f=>f.id!==id);
  save(); render();
};
window.agImportarFestivos=()=>{
  const texto=document.getElementById("agFestImportTexto")?.value||"";
  const lineas=texto.split("\n").map(l=>l.trim()).filter(Boolean);
  const reFecha=/^\d{4}-\d{2}-\d{2}$/;
  let ok=0, fallidas=0;
  if(!Array.isArray(state.festivos)) state.festivos=[];
  lineas.forEach(linea=>{
    const [rango,...restoEtq]=linea.split(";");
    const etiqueta=restoEtq.join(";").trim();
    const partes=rango.split(":").map(p=>p.trim());
    const ini=partes[0], fin=partes[1]||partes[0];
    if(reFecha.test(ini) && reFecha.test(fin) && fin>=ini){
      state.festivos.push({id:uid(),fechaInicio:ini,fechaFin:fin,etiqueta});
      ok++;
    }else fallidas++;
  });
  if(ok){ const ta=document.getElementById("agFestImportTexto"); if(ta) ta.value=""; save(); render(); }
  mostrarToast(ok?`✓ ${ok} festivo(s) importado(s)`+(fallidas?` — ${fallidas} línea(s) no reconocida(s)`:""):"No se ha reconocido ninguna línea válida", ok?"success":"info");
};
window.agAbrirModalFestivos=()=>{ state.ui.agModalFestivos=true; save(); render(); };
window.agCerrarModalFestivos=()=>{ state.ui.agModalFestivos=false; save(); render(); };
function agRenderModalFestivosHTML(){
  const lista=(state.festivos||[]).filter(f=>f && f.fechaInicio).slice().sort((a,b)=>a.fechaInicio.localeCompare(b.fechaInicio));
  const filas=lista.length? lista.map(f=>{
    const rango=f.fechaInicio===f.fechaFin ? fmt2(f.fechaInicio) : `${fmt2(f.fechaInicio)} – ${fmt2(f.fechaFin)}`;
    return `<div class="ag-evento" style="cursor:default">
      <div class="ag-evento-info">
        <span class="pill" style="background:rgba(220,38,38,.14);color:#b91c1c">🔴 ${rango}</span>
        ${f.etiqueta?`<div class="ag-evento-titulo" style="font-size:12.5px">${esc(f.etiqueta)}</div>`:""}
      </div>
      <button class="ghost danger small" onclick="agEliminarFestivo('${f.id}')" title="Eliminar">✕</button>
    </div>`;
  }).join("") : `<p class="sub" style="margin:8px 0 0">Todavía no hay festivos marcados.</p>`;
  return `
  <div class="modal-overlay" onclick="if(event.target===this) agCerrarModalFestivos()">
    <div class="modal-box" style="max-width:460px">
      <div class="flex" style="justify-content:space-between;align-items:flex-start">
        <h2 style="font-size:17px">🔴 Festivos</h2>
        <button class="modal-close" onclick="agCerrarModalFestivos()">×</button>
      </div>
      <div class="grid" style="gap:12px;margin-top:10px">
        <div class="flex" style="gap:10px;align-items:flex-start">
          <label style="flex:1;font-size:12.5px;color:var(--mut);font-weight:500">Fecha inicio
            <input class="in" style="width:100%;margin-top:4px" type="date" id="agFestIni">
          </label>
          <label style="flex:1;font-size:12.5px;color:var(--mut);font-weight:500">Fecha fin (opcional)
            <input class="in" style="width:100%;margin-top:4px" type="date" id="agFestFin">
          </label>
        </div>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Etiqueta (opcional)
          <input class="in" style="width:100%;margin-top:4px" id="agFestEtiqueta" placeholder="Fallas, Navidad, Festivo local…">
        </label>
        <button class="btn" style="justify-self:start" onclick="agAnadirFestivo()">+ Añadir festivo</button>
        <div style="border-top:1px solid var(--line);padding-top:10px">
          <div style="font-size:11px;font-weight:700;color:var(--mut);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">Festivos marcados</div>
          <div class="ag-lista" style="max-height:180px">${filas}</div>
        </div>
        <div style="border-top:1px solid var(--line);padding-top:10px">
          <div style="font-size:11px;font-weight:700;color:var(--mut);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">Importar varios a la vez</div>
          <p class="sub" style="margin:0 0 6px">Una línea por festivo. Formatos admitidos: <code>2026-03-16</code>, <code>2026-03-16:2026-03-20</code> o <code>2026-03-16:2026-03-20;Fallas</code>.</p>
          <textarea class="in" style="width:100%;min-height:70px;resize:vertical;font-family:monospace;font-size:12px" id="agFestImportTexto" placeholder="2026-01-01
2026-03-16:2026-03-20;Fallas"></textarea>
          <button class="ghost small" style="margin-top:6px;border:1px solid var(--line)" onclick="agImportarFestivos()">⬇ Importar</button>
        </div>
      </div>
      <div class="flex" style="justify-content:flex-end;margin-top:18px">
        <button class="btn" onclick="agCerrarModalFestivos()">Cerrar</button>
      </div>
    </div>
  </div>`;
}
function agMesActual(){
  if(!state.ui.agMes) state.ui.agMes=agHoyStr().slice(0,7);
  return state.ui.agMes;
}
function agGrupoIdsDeEvento(e){ return Array.isArray(e.grupoIds) ? e.grupoIds : (e.grupoId?[e.grupoId]:[]); }
function agGruposDeEvento(e){ return agGrupoIdsDeEvento(e).map(id=>state.grupos.find(g=>g.id===id)).filter(Boolean); }
function agGruposLabelEvento(e){ return agGruposDeEvento(e).map(g=>g.nombre).join(", "); }
function agEventosFiltrados(lista){
  const f=state.ui.agFiltroGrupo, t=state.ui.agFiltroTipo, q=(state.ui.agBusqueda||"").trim().toLowerCase();
  let out=lista;
  if(f) out = f==="__general__" ? out.filter(e=>agGrupoIdsDeEvento(e).length===0) : out.filter(e=>agGrupoIdsDeEvento(e).includes(f));
  if(t) out = out.filter(e=>e.tipo===t);
  if(q) out = out.filter(e=>(e.titulo||"").toLowerCase().includes(q) || (e.notas||"").toLowerCase().includes(q));
  return out;
}
function agEventoFin(e){ return e.fechaFin||e.fecha; }
function agEventoActivoEnDia(e,fecha){ return fecha>=e.fecha && fecha<=agEventoFin(e); }
function agEventosDelMes(mesStr){
  const [y,m]=mesStr.split("-").map(Number);
  const inicioMes=mesStr+"-01";
  const finMes=y+"-"+String(m).padStart(2,"0")+"-"+String(new Date(y,m,0).getDate()).padStart(2,"0");
  const base=(state.eventos||[]).filter(e=>e.fecha<=finMes && agEventoFin(e)>=inicioMes);
  return agEventosFiltrados(base).sort((a,b)=>a.fecha.localeCompare(b.fecha));
}
function agEventosHoy(){
  const hoy=agHoyStr();
  return agEventosFiltrados((state.eventos||[]).filter(e=>agEventoActivoEnDia(e,hoy)));
}
function agProximosEventos(n){
  const hoy=agHoyStr();
  const base=(state.eventos||[]).filter(e=>agEventoFin(e)>=hoy);
  return agEventosFiltrados(base).sort((a,b)=>a.fecha.localeCompare(b.fecha)).slice(0,n||10);
}
function agEventosBusqueda(){
  return agEventosFiltrados(state.eventos||[]).sort((a,b)=>a.fecha.localeCompare(b.fecha));
}
window.agSetBusqueda=(v)=>{ state.ui.agBusqueda=v; save(); render(); };
function agExamenesDisponibles(){
  const out=[];
  state.grupos.forEach(g=>{ g.actividades.filter(a=>a.esExamen&&a.rubrica).forEach(a=>{ out.push({id:a.id,label:a.nombre+" — "+g.nombre}); }); });
  return out;
}
function agBuscarExamenVinculado(examId){
  if(!examId) return null;
  for(const g of state.grupos){ const a=g.actividades.find(x=>x.id===examId); if(a) return {a,g}; }
  return null;
}
function agFechaPorDefecto(){
  const mesStr=agMesActual(), hoy=agHoyStr();
  return mesStr===hoy.slice(0,7) ? hoy : mesStr+"-01";
}
function agIcsEscape(s){ return String(s||"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n"); }
function agGenerarICS(){
  const evs=agEventosFiltrados(state.eventos||[]).slice().sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const ahora=new Date().toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
  let ics="BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Geografia e Historia//Calendario//ES\r\nCALSCALE:GREGORIAN\r\n";
  evs.forEach(e=>{
    const info=agTipoInfo(e.tipo);
    const grupoLabel=agGruposLabelEvento(e);
    const desc=[info.label, grupoLabel?("Grupo: "+grupoLabel):"", e.notas||""].filter(Boolean).join(" — ");
    const fechaIcs=e.fecha.replace(/-/g,"");
    let dtstart, dtend="";
    if(e.hora){
      dtstart="DTSTART:"+fechaIcs+"T"+e.hora.replace(":","")+"00\r\n";
      if(e.fechaFin && e.fechaFin>e.fecha) dtend="DTEND:"+e.fechaFin.replace(/-/g,"")+"T"+e.hora.replace(":","")+"00\r\n";
    }else{
      dtstart="DTSTART;VALUE=DATE:"+fechaIcs+"\r\n";
      if(e.fechaFin && e.fechaFin>e.fecha){
        const finExclusivo=new Date(e.fechaFin+"T00:00:00"); finExclusivo.setDate(finExclusivo.getDate()+1);
        const finIcs=finExclusivo.getFullYear()+String(finExclusivo.getMonth()+1).padStart(2,"0")+String(finExclusivo.getDate()).padStart(2,"0");
        dtend="DTEND;VALUE=DATE:"+finIcs+"\r\n";
      }
    }
    ics+="BEGIN:VEVENT\r\nUID:"+e.id+"@geohist-suite\r\nDTSTAMP:"+ahora+"\r\n"+dtstart+dtend;
    ics+="SUMMARY:"+agIcsEscape(e.titulo)+"\r\n";
    if(desc) ics+="DESCRIPTION:"+agIcsEscape(desc)+"\r\n";
    ics+="END:VEVENT\r\n";
  });
  return ics+"END:VCALENDAR\r\n";
}
window.agExportarICS=()=>{
  const evs=agEventosFiltrados(state.eventos||[]);
  if(!evs.length){ mostrarAviso("No hay eventos para exportar"+((state.ui.agFiltroGrupo||state.ui.agFiltroTipo)?" con este filtro.":".")); return; }
  const blob=new Blob([agGenerarICS()],{type:"text/calendar;charset=utf-8"});
  const u=URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=u; a.download="calendario-geohist.ics"; a.click(); URL.revokeObjectURL(u);
};
function agImprimirMesHTML(mesStr,tamano){
  tamano=(tamano==="A4")?"A4":"A3";
  const esA4=tamano==="A4";
  const [y,m]=mesStr.split("-").map(Number);
  const hoyStr=agHoyStr();
  const eventosDelMes=agEventosDelMes(mesStr);
  const grupoFiltro = state.ui.agFiltroGrupo ? (state.ui.agFiltroGrupo==="__general__" ? "Sin grupo (general)" : esc((state.grupos.find(g=>g.id===state.ui.agFiltroGrupo)||{}).nombre||"")) : "Todos los grupos";
  const tipoFiltro = state.ui.agFiltroTipo ? esc(agTipoInfo(state.ui.agFiltroTipo).label) : "Todos los tipos";
  const centro = esc(state.centroNombre||"");

  const celdas=agCalcularCeldasMes(mesStr).map(c=>{
    if(c.pad) return c;
    const evs=eventosDelMes.filter(e=>agEventoActivoEnDia(e,c.fecha)).sort((a,b)=>(a.hora||"99:99").localeCompare(b.hora||"99:99"));
    return {...c,evs,esHoy:c.fecha===hoyStr};
  });

  const celdaHTML=(c,colIdx)=>{
    const esFinde=colIdx===5||colIdx===6;
    if(c.pad) return `<td class="ap-pad${esFinde?" ap-finde":""}"></td>`;
    const esFestivo=agEsFestivo(c.fecha);
    const items=c.evs.map(e=>{
      const info=agTipoInfo(e.tipo);
      const esInicio=e.fecha===c.fecha;
      const txt=(esInicio&&e.hora?`<b>${esc(e.hora)}</b> `:"")+esc(e.titulo)+(!esInicio?" (sigue)":"");
      return `<div class="ap-ev" style="background:${info.color}1f;color:${info.color}">${txt}</div>`;
    }).join("");
    const clases=[esFinde?"ap-finde":"", c.esHoy?"ap-hoy":"", esFestivo?"ap-festivo":""].filter(Boolean).join(" ");
    return `<td class="${clases}"><div class="ap-daynum">${c.dia}</div>${items}</td>`;
  };
  const filasHtml=[];
  for(let i=0;i<celdas.length;i+=7){
    filasHtml.push(`<tr>${celdas.slice(i,i+7).map((c,idx)=>celdaHTML(c,idx)).join("")}</tr>`);
  }
  const leyenda=AG_TIPOS.map(t=>`<span class="ap-leyenda-item"><span class="ap-dot" style="background:${t.color}"></span>${esc(t.label)}</span>`).join("");

  /* A4 es más pequeño que A3 (~71% lineal en apaisado): se reducen tipografías
     y la altura de las celdas en la misma proporción para que el mes entero
     siga encajando en una sola página, sin recortes ni desbordamientos. */
  const s = esA4 ? 0.72 : 1;
  const px=(n)=>Math.round(n*s*10)/10;

  /* Cálculo de la altura de fila que llena la página entera, en vez de una
     altura fija o un simple factor por número de filas: se parte del tamaño
     físico real de la página (A3/A4 apaisada, con sus márgenes) y se le resta
     lo que ocupan la cabecera, la leyenda, el encabezado de la tabla y los
     huecos entre filas — con esas mismas medidas que usa el CSS de abajo, para
     que el cálculo y lo que se ve coincidan. Lo que sobra se reparte entre las
     filas que tenga ese mes exactamente, así que un mes de 4 filas aprovecha
     mucho más papel por fila que uno de 6, y ningún mes deja hueco en blanco.
     Un margen de seguridad (safetyFactor) evita que un cálculo optimista haga
     saltar el contenido a una segunda página. */
  const MM_PX=96/25.4; // equivalencia estándar 96dpi
  const pageHmm = esA4 ? 210 : 297;
  const pageMarginMm = esA4 ? 8 : 11;
  const usableHpx = (pageHmm - pageMarginMm*2) * MM_PX;
  const nFilas=Math.max(1,Math.ceil(celdas.length/7));
  const bodyMarginV = px(9)*2;
  const bandaH = px(12)*2 /*padding*/ + px(38) /*título+meta, aprox*/ + px(8) /*margin-bottom*/;
  const leyendaH = state.ui.agFiltroGrupo ? px(8) : (px(11)*1.4 + px(6));
  const theadH = px(4)*2 + px(11.5)*1.3;
  const spacingV = px(3)*(nFilas+2); // border-spacing entre filas y bordes
  const chromeH = bodyMarginV + bandaH + leyendaH + theadH + spacingV;
  const safetyFactor = 0.94;
  const cellHExacto = ((usableHpx - chromeH) * safetyFactor) / nFilas;
  const cellH = Math.max(px(72), Math.min(px(240), cellHExacto));
  const factor = cellH/px(110); // cuánto ha crecido la celda respecto al tamaño "de referencia", para escalar letra/relleno a la vez
  const evFactor = Math.min(1.55, Math.max(0.85, 1+(factor-1)*0.5));
  const cellPadV = px(4*Math.min(1.6,Math.max(0.85,1+(factor-1)*0.35)));

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Calendario — ${esc(AG_MESES[m-1])} ${y}</title>
  <style>
    @page{ size: ${tamano} landscape; margin: ${esA4?"0.8cm":"1.1cm"}; }
    *{box-sizing:border-box}
    body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1c2536;margin:${px(9)}px;print-color-adjust:exact;-webkit-print-color-adjust:exact}
    .ap-banda{background:linear-gradient(120deg,#0a1120 0%,#152a44 55%,#25456b 100%);color:#f7f2e4;border-radius:${px(14)}px;padding:${px(12)}px ${px(22)}px;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:10px;margin-bottom:${px(8)}px}
    .ap-banda h1{font-size:${px(25)}px;margin:0;text-transform:capitalize;color:#ecc978;letter-spacing:-.01em}
    .ap-centro{font-size:${px(11)}px;color:rgba(247,242,228,.6);letter-spacing:.04em;text-transform:uppercase;margin-bottom:2px}
    .ap-meta{color:rgba(247,242,228,.78);font-size:${px(11.5)}px;margin-top:2px}
    .ap-leyenda{display:flex;gap:14px;flex-wrap:wrap;font-size:${px(11)}px;color:#4b5768;margin:0 0 6px;align-items:center}
    .ap-leyenda-item{display:inline-flex;align-items:center;gap:5px;font-weight:600}
    .ap-dot{width:${px(9)}px;height:${px(9)}px;border-radius:50%;display:inline-block;flex-shrink:0}
    table{border-collapse:separate;border-spacing:${px(3)}px;width:100%;table-layout:fixed}
    th{border:none;background:linear-gradient(120deg,#152a44,#25456b);color:#f0e4c8;font-size:${px(11.5)}px;padding:${px(4)}px;text-align:center;font-weight:700;letter-spacing:.05em;text-transform:uppercase;border-radius:${px(6)}px}
    td{border:1px solid #dde3ec;vertical-align:top;padding:${cellPadV}px ${px(5)}px;height:${cellH}px;width:14.28%;overflow:hidden;background:#fff;border-radius:${px(8)}px}
    td.ap-finde{background:#f7f4ec}
    td.ap-pad{background:#f7f8fa;border-style:dashed}
    td.ap-hoy{background:#fdf6e4;box-shadow:inset 0 0 0 2px #d7b463}
    td.ap-festivo{background:rgba(220,38,38,.16)}
    td.ap-festivo.ap-hoy{background:#fdf6e4;box-shadow:inset 0 0 0 2px #d7b463,inset 0 0 0 4px rgba(220,38,38,.55)}
    .ap-daynum{font-weight:800;font-size:${px(14*Math.min(1.3,Math.max(0.9,1+(factor-1)*0.32)))}px;margin-bottom:${px(4*evFactor)}px;color:#1c2536}
    td.ap-hoy .ap-daynum{color:#8a6414}
    .ap-ev{font-size:${px(10*evFactor)}px;line-height:1.35;padding:${px(2*evFactor)}px ${px(6*evFactor)}px;margin-bottom:${px(3*evFactor)}px;border-radius:5px;overflow-wrap:break-word;font-weight:600}
    .btnbar{margin-bottom:16px}
    button{padding:8px 16px;font-size:14px;cursor:pointer;border-radius:8px;border:1px solid #ccc}
    @media print{ .btnbar{display:none} }
  </style></head><body>
  <div class="btnbar"><button onclick="window.print()">Imprimir / Guardar como PDF</button> <button onclick="window.close()" style="background:#eee;color:#333">✕ Cerrar</button></div>
  <div class="ap-banda">
    <div>
      ${centro?`<div class="ap-centro">${centro}</div>`:""}
      <h1>📅 ${esc(AG_MESES[m-1])} ${y}</h1>
    </div>
    <div class="ap-meta">${grupoFiltro} · ${tipoFiltro}<br>Generado el ${new Date().toLocaleDateString("es-ES")}</div>
  </div>
  ${state.ui.agFiltroGrupo?"":`<div class="ap-leyenda">${leyenda}</div>`}
  <table style="${state.ui.agFiltroGrupo?"margin-top:8px":""}">
    <thead><tr>${AG_DIAS_LARGO.map(d=>`<th>${d}</th>`).join("")}</tr></thead>
    <tbody>${filasHtml.join("")}</tbody>
  </table>
  </body></html>`;
}
window.agImprimirMes=(tamano)=>{
  const mesStr=agMesActual();
  mostrarImprimible(agImprimirMesHTML(mesStr,tamano),"Calendario "+mesStr);
};
/* ---- Vista grande del mes (modal a pantalla completa) ---- */
window.agAbrirModalMesGrande=()=>{ state.ui.agModalMesGrande=true; save(); render(); };
window.agCerrarModalMesGrande=()=>{ state.ui.agModalMesGrande=false; save(); render(); };
function agModalMesGrandeHTML(){
  const mesStr=agMesActual();
  const [y,m]=mesStr.split("-").map(Number);
  const hoyStr=agHoyStr();
  const eventosDelMes=agEventosDelMes(mesStr);
  const celdas=agCalcularCeldasMes(mesStr).map(c=>{
    if(c.pad) return c;
    const evs=eventosDelMes.filter(e=>agEventoActivoEnDia(e,c.fecha)).sort((a,b)=>(a.hora||"99:99").localeCompare(b.hora||"99:99"));
    return {...c,evs,esHoy:c.fecha===hoyStr,esFestivo:agEsFestivo(c.fecha)};
  });
  const celdaHTML=(c,colIdx)=>{
    const esFinde=colIdx===5||colIdx===6;
    if(c.pad) return `<div class="agg-cell agg-pad${esFinde?" agg-finde":""}"></div>`;
    const items=c.evs.map(e=>{
      const info=agTipoInfo(e.tipo);
      const esInicio=e.fecha===c.fecha;
      const txt=(esInicio&&e.hora?`<b>${esc(e.hora)}</b> `:"")+esc(e.titulo)+(!esInicio?" (sigue)":"");
      return `<div class="agg-ev" style="background:${info.color}1f;color:${info.color}" onclick="event.stopPropagation();agAbrirModal('${e.fecha}','${e.id}')">${txt}</div>`;
    }).join("");
    const clases=[esFinde?"agg-finde":"", c.esHoy?"agg-hoy":"", c.esFestivo?"agg-festivo":""].filter(Boolean).join(" ");
    return `<div class="agg-cell ${clases}" onclick="agCerrarModalMesGrande();agSeleccionarDia('${c.fecha}')">
      <div class="agg-daynum">${c.dia}${c.esFestivo?` <span class="agg-festivo-tag">Festivo</span>`:""}</div>
      ${items}
    </div>`;
  };
  const filas=[];
  for(let i=0;i<celdas.length;i+=7) filas.push(celdas.slice(i,i+7).map((c,idx)=>celdaHTML(c,idx)).join(""));
  const leyenda=AG_TIPOS.map(t=>`<span class="agg-leyenda-item"><span class="agg-dot" style="background:${t.color}"></span>${esc(t.label)}</span>`).join("");
  const grupoFiltro = state.ui.agFiltroGrupo ? (state.ui.agFiltroGrupo==="__general__" ? "Sin grupo (general)" : esc((state.grupos.find(g=>g.id===state.ui.agFiltroGrupo)||{}).nombre||"")) : "";

  return `<div class="modal-overlay" onclick="if(event.target===this) agCerrarModalMesGrande()">
    <div class="modal-box agg-modal-box" style="max-width:min(1400px,96vw);width:96vw;height:92vh;max-height:92vh;display:flex;flex-direction:column;padding:0;overflow:hidden;background:var(--card);backdrop-filter:none;-webkit-backdrop-filter:none">
      <div style="padding:14px 22px;border-bottom:1px solid var(--line);flex-shrink:0">
        <div class="flex" style="justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <div class="flex" style="gap:6px;align-items:center">
            <button class="ghost" style="border:1px solid var(--line)" onclick="agCerrarModalMesGrande()">← Volver</button>
            <strong style="font-size:16px;text-transform:capitalize;margin-left:6px">📅 ${AG_MESES[m-1]} ${y}</strong>
            ${grupoFiltro?`<span class="badge" style="margin-left:2px">${grupoFiltro}</span>`:""}
          </div>
          <div class="flex" style="gap:6px;flex-wrap:wrap">
            <button class="ghost" style="border:1px solid var(--line)" onclick="agMesAnterior()" title="Mes anterior">←</button>
            <button class="ghost" style="border:1px solid var(--line)" onclick="agMesHoy()">Hoy</button>
            <button class="ghost" style="border:1px solid var(--line)" onclick="agMesSiguiente()" title="Mes siguiente">→</button>
            <button class="ghost" style="border:1px solid var(--line)" onclick="agImprimirMes('A4')" title="Vista imprimible en una página A4 apaisada">🖨️ Imprimir A4</button>
            <button class="ghost" style="border:1px solid var(--line)" onclick="agImprimirMes('A3')" title="Vista imprimible en una página A3 apaisada (más grande, más legible)">🖨️ Imprimir A3</button>
            <button class="modal-close" onclick="agCerrarModalMesGrande()" aria-label="Cerrar">×</button>
          </div>
        </div>
      </div>
      <div style="padding:16px 22px;overflow-y:auto;-webkit-overflow-scrolling:touch;flex:1">
        <div class="agg-leyenda">${leyenda}</div>
        <div class="agg-grid-head">${AG_DIAS_LARGO.map(d=>`<div class="agg-cell-head">${d}</div>`).join("")}</div>
        <div class="agg-grid">${filas.join("")}</div>
      </div>
    </div>
  </div>
  <style>
    .agg-leyenda{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--mut);margin-bottom:10px}
    .agg-leyenda-item{display:inline-flex;align-items:center;gap:5px;font-weight:600}
    .agg-dot{width:9px;height:9px;border-radius:50%;display:inline-block;flex-shrink:0}
    .agg-grid-head,.agg-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
    .agg-grid-head{margin-bottom:6px}
    .agg-cell-head{font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--mut);text-align:center;padding:4px 0}
    .agg-cell{min-height:110px;border:1px solid var(--line);border-radius:10px;padding:6px 7px;cursor:pointer;background:var(--card);overflow:hidden}
    .agg-cell:hover{border-color:var(--accent)}
    .agg-pad{background:var(--surface);border-style:dashed;opacity:.5;cursor:default}
    .agg-finde{background:var(--surface)}
    .agg-hoy{box-shadow:inset 0 0 0 2px #d7b463}
    .agg-festivo{background:var(--danger-soft)}
    .agg-daynum{font-weight:800;font-size:14px;margin-bottom:4px}
    .agg-festivo-tag{font-size:9.5px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:.03em}
    .agg-ev{font-size:11px;line-height:1.3;padding:2px 6px;margin-bottom:3px;border-radius:5px;overflow-wrap:break-word;font-weight:600;cursor:pointer}
    @media (max-width:720px){
      .agg-grid-head,.agg-grid{grid-template-columns:repeat(7,minmax(0,1fr))}
      .agg-cell{min-height:70px;padding:4px}
      .agg-daynum{font-size:12px}
      .agg-ev{font-size:9px}
    }
  </style>`;
}
function agImprimirAnioHTML(anio){
  const centro=esc(state.centroNombre||"");
  const meses=[];
  for(let mes=1; mes<=12; mes++){
    const mesStr=anio+"-"+String(mes).padStart(2,"0");
    const eventosDelMes=agEventosDelMes(mesStr);
    const celdas=agCalcularCeldasMes(mesStr).map(c=>{
      if(c.pad) return c;
      const evs=eventosDelMes.filter(e=>agEventoActivoEnDia(e,c.fecha));
      return {...c,evs,esHoy:c.fecha===agHoyStr(),esFestivo:agEsFestivo(c.fecha)};
    });
    const filas=[];
    for(let i=0;i<celdas.length;i+=7){
      filas.push(`<tr>${celdas.slice(i,i+7).map(c=>{
        if(c.pad) return `<td class="ay-pad"></td>`;
        const clases=[c.esHoy?"ay-hoy":"", c.esFestivo?"ay-festivo":""].filter(Boolean).join(" ");
        const punto = c.evs.length ? `<span class="ay-dot" style="background:${agTipoInfo(c.evs[0].tipo).color}"></span>` : "";
        return `<td class="${clases}">${c.dia}${punto}</td>`;
      }).join("")}</tr>`);
    }
    meses.push(`<div class="ay-mes">
      <h3>${AG_MESES[mes-1]}</h3>
      <table><thead><tr>${AG_DIAS.map(d=>`<th>${d}</th>`).join("")}</tr></thead><tbody>${filas.join("")}</tbody></table>
    </div>`);
  }
  const leyenda=`<span class="ay-leyenda-item"><span class="ay-dot" style="background:rgba(220,38,38,.5)"></span>Festivo</span>` + AG_TIPOS.map(t=>`<span class="ay-leyenda-item"><span class="ay-dot" style="background:${t.color}"></span>${esc(t.label)}</span>`).join("");
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Calendario anual ${anio}</title>
  <style>
    @page{ size: A4 landscape; margin: 1.1cm; }
    *{box-sizing:border-box}
    body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1c2536;margin:10px;print-color-adjust:exact;-webkit-print-color-adjust:exact}
    h1{font-size:20px;margin:0 0 2px;color:#152a44}
    .ay-centro{font-size:11px;color:#667;text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px}
    .ay-leyenda{display:flex;gap:14px;flex-wrap:wrap;font-size:10px;color:#4b5768;margin:0 0 10px}
    .ay-leyenda-item{display:inline-flex;align-items:center;gap:4px;font-weight:600}
    .ay-grid{display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(3,1fr);gap:10px}
    .ay-mes{border:1px solid #dde3ec;border-radius:8px;padding:6px}
    .ay-mes h3{margin:0 0 4px;font-size:12px;text-transform:capitalize;text-align:center;color:#152a44}
    .ay-mes table{border-collapse:collapse;width:100%;table-layout:fixed}
    .ay-mes th{font-size:7.5px;color:#8a93a3;font-weight:700;padding:1px}
    .ay-mes td{font-size:8.5px;text-align:center;padding:2px 0;position:relative;border-radius:3px}
    .ay-pad{}
    .ay-hoy{background:#fdf6e4;font-weight:800}
    .ay-festivo{background:rgba(220,38,38,.22);font-weight:700}
    .ay-dot{width:4px;height:4px;border-radius:50%;display:inline-block;margin-left:1px;vertical-align:middle}
    .btnbar{margin-bottom:14px}
    button{padding:8px 16px;font-size:14px;cursor:pointer;border-radius:8px;border:1px solid #ccc}
    @media print{ .btnbar{display:none} }
  </style></head><body>
  <div class="btnbar"><button onclick="window.print()">Imprimir / Guardar como PDF</button> <button onclick="window.close()" style="background:#eee;color:#333">✕ Cerrar</button></div>
  ${centro?`<div class="ay-centro">${centro}</div>`:""}
  <h1>🗓️ Calendario ${anio}</h1>
  <div class="ay-leyenda">${leyenda}</div>
  <div class="ay-grid">${meses.join("")}</div>
  </body></html>`;
}
window.agImprimirAnio=()=>{
  const anio=Number(agMesActual().slice(0,4));
  mostrarImprimible(agImprimirAnioHTML(anio),"Calendario "+anio);
};
function agFiltroSelectHTML(){
  return `<div class="flex" style="gap:8px;flex-wrap:wrap;align-items:center">
  <input class="in" style="padding:6px 10px;font-size:13px;width:150px" id="agBusquedaInput" placeholder="🔎 Buscar evento…" value="${esc(state.ui.agBusqueda||"")}" oninput="agSetBusqueda(this.value)">
  <select class="in" style="padding:6px 10px;font-size:13px" id="agFiltroSel" onchange="agSetFiltro(this.value)">
    <option value="" ${state.ui.agFiltroGrupo===""?"selected":""}>Todos los grupos</option>
    <option value="__general__" ${state.ui.agFiltroGrupo==="__general__"?"selected":""}>Sin grupo (general)</option>
    ${state.grupos.map(g=>`<option value="${g.id}" ${state.ui.agFiltroGrupo===g.id?"selected":""}>${esc(g.nombre)}</option>`).join("")}
  </select>
  <select class="in" style="padding:6px 10px;font-size:13px" id="agFiltroTipoSel" onchange="agSetFiltroTipo(this.value)">
    <option value="" ${state.ui.agFiltroTipo===""?"selected":""}>Todos los tipos</option>
    ${AG_TIPOS.map(t=>`<option value="${t.id}" ${state.ui.agFiltroTipo===t.id?"selected":""}>${t.label}</option>`).join("")}
  </select>
  </div>`;
}
window.agSetFiltro=v=>{ state.ui.agFiltroGrupo=v; save(); render(); };
window.agSetFiltroTipo=v=>{ state.ui.agFiltroTipo=v; save(); render(); };
window.agSetVista=v=>{ state.ui.agVista=v; save(); render(); };
function agRenderHoyBannerHTML(){
  const evs=agEventosHoy();
  if(!evs.length) return "";
  const chips=evs.map(e=>{
    const info=agTipoInfo(e.tipo);
    const grupoLabel=agGruposLabelEvento(e);
    return `<span class="ag-hoy-chip" style="border-color:${info.color}55;background:${info.color}14" onclick="agAbrirModal('${e.fecha}','${e.id}')">
      <span class="ag-dot" style="background:${info.color}"></span>${e.hora?esc(e.hora)+" · ":""}${esc(e.titulo)}${grupoLabel?` · ${esc(grupoLabel)}`:""}
    </span>`;
  }).join("");
  return `<div class="card" style="border-left:4px solid var(--accent);padding:14px 18px">
    <div class="flex" style="align-items:center;gap:10px;flex-wrap:wrap">
      <strong style="font-size:13.5px;color:var(--accent-2);flex-shrink:0">📌 Hoy</strong>
      <div class="flex" style="gap:8px">${chips}</div>
    </div>
  </div>`;
}
window.agAbrirModalColores=()=>{ state.ui.agModalColores=true; save(); render(); };
window.agCerrarModalColores=()=>{ state.ui.agModalColores=false; save(); render(); };
window.agSetColorTipo=(id,color)=>{
  if(!state.tiposColores || typeof state.tiposColores!=="object") state.tiposColores={};
  state.tiposColores[id]=color;
  save(); render();
};
window.agResetColorTipo=(id)=>{
  if(state.tiposColores) delete state.tiposColores[id];
  save(); render();
};
function agRenderModalColoresHTML(){
  const filas=AG_TIPOS.map(t=>{
    const color=agTipoInfo(t.id).color;
    const personalizado=!!(state.tiposColores&&state.tiposColores[t.id]);
    return `<div class="flex" style="justify-content:space-between;align-items:center;padding:6px 0">
      <span class="pill" style="background:${color}1a;color:${color}">${t.label}</span>
      <div class="flex" style="gap:6px;align-items:center">
        <input type="color" value="${color}" style="width:34px;height:28px;padding:0;border:1px solid var(--line);border-radius:6px;cursor:pointer" onchange="agSetColorTipo('${t.id}',this.value)">
        ${personalizado?`<button class="ghost small" style="border:1px solid var(--line)" onclick="agResetColorTipo('${t.id}')" title="Restablecer color por defecto">↺</button>`:""}
      </div>
    </div>`;
  }).join("");
  return `
  <div class="modal-overlay" onclick="if(event.target===this) agCerrarModalColores()">
    <div class="modal-box" style="max-width:380px">
      <div class="flex" style="justify-content:space-between;align-items:flex-start">
        <h2 style="font-size:17px">🎨 Colores de los tipos de evento</h2>
        <button class="modal-close" onclick="agCerrarModalColores()">×</button>
      </div>
      <div style="margin-top:10px">${filas}</div>
      <div class="flex" style="justify-content:flex-end;margin-top:18px">
        <button class="btn" onclick="agCerrarModalColores()">Cerrar</button>
      </div>
    </div>
  </div>`;
}
function agCalcularCeldasMes(mesStr){
  const [y,m]=mesStr.split("-").map(Number);
  const primerDia=new Date(y,m-1,1);
  let offset=primerDia.getDay(); offset=offset===0?6:offset-1;
  const ultimoDia=new Date(y,m,0).getDate();
  const celdas=[];
  for(let i=0;i<offset;i++) celdas.push({pad:true});
  for(let d=1; d<=ultimoDia; d++){
    const fecha=`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    celdas.push({dia:d,fecha});
  }
  while(celdas.length%7!==0) celdas.push({pad:true});
  return celdas;
}
function agLunesDeFecha(fecha){
  const d=new Date(fecha+"T00:00:00");
  const dow=(d.getDay()+6)%7;
  d.setDate(d.getDate()-dow);
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function agSemanaInicioActual(){
  if(!state.ui.agSemanaInicio) state.ui.agSemanaInicio=agLunesDeFecha(agHoyStr());
  return state.ui.agSemanaInicio;
}
function agSumarDiasFecha(fecha,dias){
  const d=new Date(fecha+"T00:00:00"); d.setDate(d.getDate()+dias);
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
window.agSetVistaCal=(v)=>{ state.ui.agVistaCal=v; save(); render(); };
window.agSemanaAnterior=()=>{ state.ui.agSemanaInicio=agSumarDiasFecha(agSemanaInicioActual(),-7); save(); render(); };
window.agSemanaSiguiente=()=>{ state.ui.agSemanaInicio=agSumarDiasFecha(agSemanaInicioActual(),7); save(); render(); };
window.agSemanaHoy=()=>{ state.ui.agSemanaInicio=agLunesDeFecha(agHoyStr()); save(); render(); };
function agRenderSemanaHTML(toggleVista,botonesExtra){
  const inicio=agSemanaInicioActual();
  const dIni=new Date(inicio+"T00:00:00");
  const dias=[];
  for(let i=0;i<7;i++){
    const d=new Date(dIni); d.setDate(d.getDate()+i);
    dias.push({fecha:d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"), d});
  }
  const dFin=dias[6].d;
  const rangoLabel = dIni.getMonth()===dFin.getMonth()
    ? `${dIni.getDate()}–${dFin.getDate()} de ${AG_MESES[dIni.getMonth()]} ${dFin.getFullYear()}`
    : `${dIni.getDate()} ${AG_MESES[dIni.getMonth()].slice(0,3)} – ${dFin.getDate()} ${AG_MESES[dFin.getMonth()].slice(0,3)} ${dFin.getFullYear()}`;
  const hoyStr=agHoyStr();
  const cols=dias.map((it,idx)=>{
    const evs=agEventosFiltrados((state.eventos||[]).filter(e=>agEventoActivoEnDia(e,it.fecha))).sort((a,b)=>(a.hora||"99:99").localeCompare(b.hora||"99:99"));
    const esHoy=it.fecha===hoyStr;
    const esFestivo=agEsFestivo(it.fecha);
    const chips=evs.map(e=>{
      const info=agTipoInfo(e.tipo);
      return `<div class="ag-semana-ev" style="background:${info.color}1f;color:${info.color}" onclick="agAbrirModal('${e.fecha}','${e.id}')" title="${esc((e.hora?e.hora+" ":"")+e.titulo)}">${e.hora?`<b>${esc(e.hora)}</b> `:""}${esc(e.titulo)}</div>`;
    }).join("");
    return `<div class="ag-semana-col ${esHoy?"hoy":""} ${esFestivo?"festivo":""}">
      <div class="ag-semana-dia">${AG_DIAS_LARGO[idx].slice(0,3)}</div>
      <div class="ag-semana-num">${it.d.getDate()}</div>
      <div class="ag-semana-evs">${chips}</div>
      <button class="ghost small" style="margin-top:auto;padding:2px 6px;font-size:11px" onclick="agAbrirModal('${it.fecha}','')">+ Añadir</button>
    </div>`;
  }).join("");
  return `
  <div class="card">
    <div class="flex" style="justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:8px">
      ${toggleVista}
      ${botonesExtra}
    </div>
    <div class="flex" style="justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
      <h2 style="font-size:16px">📅 ${rangoLabel}</h2>
      <div class="flex" style="gap:8px;flex-wrap:wrap">
        ${agFiltroSelectHTML()}
        <div class="flex" style="gap:4px">
          <button class="ghost" onclick="agSemanaAnterior()" title="Semana anterior">←</button>
          <button class="ghost" onclick="agSemanaHoy()">Hoy</button>
          <button class="ghost" onclick="agSemanaSiguiente()" title="Semana siguiente">→</button>
        </div>
      </div>
    </div>
    <div class="ag-semana">${cols}</div>
    <div class="flex" style="margin-top:14px">
      <button class="btn" onclick="agAbrirModal('${agFechaPorDefecto()}','')">+ Añadir evento</button>
      <button class="ghost" style="border:1px solid var(--line)" onclick="agExportarICS()" title="Descarga un archivo .ics para importar en el Calendario del iPad, iPhone, Mac o Google Calendar">⬇ Exportar .ics</button>
    </div>
  </div>`;
}
function agRenderCalendarioHTML(){
  const vistaCal=state.ui.agVistaCal||"mes";
  const toggleVista=`<div class="flex" style="gap:4px">
    <button class="tab ${vistaCal==="mes"?"on":""}" style="padding:5px 12px;font-size:12.5px" onclick="agSetVistaCal('mes')">📅 Mes</button>
    <button class="tab ${vistaCal==="semana"?"on":""}" style="padding:5px 12px;font-size:12.5px" onclick="agSetVistaCal('semana')">🗓️ Semana</button>
  </div>`;
  const botonesExtra=`<div class="flex" style="gap:8px;flex-wrap:wrap">
    <button class="ghost small" style="border:1px solid var(--line)" onclick="agAbrirModalFestivos()">🔴 Festivos</button>
    <button class="ghost small" style="border:1px solid var(--line)" onclick="agAbrirModalColores()">🎨 Colores</button>
  </div>`;
  if(vistaCal==="semana") return agRenderSemanaHTML(toggleVista,botonesExtra);
  const mesStr=agMesActual();
  const [y,m]=mesStr.split("-").map(Number);
  const primerDia=new Date(y,m-1,1);
  let offset=primerDia.getDay(); offset=offset===0?6:offset-1;
  const ultimoDia=new Date(y,m,0).getDate();
  const hoyStr=agHoyStr();
  const eventosDelMes=agEventosDelMes(mesStr);

  let celdas="";
  for(let i=0;i<offset;i++) celdas+=`<div class="ag-cell ag-cell-pad"></div>`;
  for(let d=1; d<=ultimoDia; d++){
    const fecha=`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const evs=eventosDelMes.filter(e=>agEventoActivoEnDia(e,fecha));
    const esHoy=fecha===hoyStr;
    const esSel=fecha===state.ui.agDiaSel;
    const esFestivo=agEsFestivo(fecha);
    const festivoInfo=agFestivoEnDia(fecha);
    const puntos=evs.slice(0,3).map(e=>`<span class="ag-dot" style="background:${agTipoInfo(e.tipo).color}"></span>`).join("");
    const tituloTip=[esFestivo?("Festivo"+(festivoInfo&&festivoInfo.etiqueta?": "+festivoInfo.etiqueta:"")):"", evs.length?evs.map(e=>(e.hora?e.hora+" ":"")+e.titulo).join(" · "):""].filter(Boolean).join(". ");
    celdas+=`<div class="ag-cell ${esHoy?"ag-cell-hoy":""} ${esSel?"ag-cell-sel":""} ${esFestivo?"ag-cell-festivo":""}" title="${esc(tituloTip)}" onclick="agSeleccionarDia('${fecha}')">
      <span class="ag-daynum">${d}</span>
      ${evs.length?`<span class="ag-dots">${puntos}${evs.length>3?`<span class="ag-more">+${evs.length-3}</span>`:""}</span>`:""}
    </div>`;
  }
  const restante=(7-((offset+ultimoDia)%7))%7;
  for(let i=0;i<restante;i++) celdas+=`<div class="ag-cell ag-cell-pad"></div>`;

  return `
  <div class="card">
    <div class="flex" style="justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:8px">
      ${toggleVista}
      ${botonesExtra}
    </div>
    <div class="flex" style="justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
      <h2 style="font-size:16px;text-transform:capitalize;display:inline-flex;align-items:center;gap:4px">
        <span style="cursor:pointer" onclick="agAbrirModalMesGrande()" title="Ver este mes en grande y en pantalla completa">📅 ${AG_MESES[m-1]} ${y}</span>
        <span style="position:relative;display:inline-flex;align-items:center;padding:2px" title="Ir directamente a otro mes">
          <span style="font-size:11px;color:var(--mut);cursor:pointer">▾</span>
          <input type="month" id="agMesInput" value="${mesStr}" onchange="agIrAMes(this.value)" style="position:absolute;inset:0;opacity:0;border:0;padding:0;margin:0;cursor:pointer;font-size:inherit">
        </span>
      </h2>
      <div class="flex" style="gap:8px;flex-wrap:wrap">
        ${agFiltroSelectHTML()}
        <div class="flex" style="gap:4px">
          <button class="ghost" onclick="agMesAnterior()" title="Mes anterior">←</button>
          <button class="ghost" onclick="agMesHoy()">Hoy</button>
          <button class="ghost" onclick="agMesSiguiente()" title="Mes siguiente">→</button>
        </div>
      </div>
    </div>
    <div class="ag-grid ag-grid-head">${AG_DIAS.map(d=>`<div class="ag-cell-head">${d}</div>`).join("")}</div>
    <div class="ag-grid">${celdas}</div>
    <div class="flex" style="margin-top:14px">
      <button class="btn" onclick="agAbrirModal('${agFechaPorDefecto()}','')">+ Añadir evento</button>
      <button class="ghost" style="border:1px solid var(--line)" onclick="agExportarICS()" title="Descarga un archivo .ics para importar en el Calendario del iPad, iPhone, Mac o Google Calendar">⬇ Exportar .ics</button>
      <button class="ghost" style="border:1px solid var(--line)" onclick="agAbrirModalMesGrande()" title="Abre este mes en grande, con todos los eventos y festivos, y desde ahí se puede imprimir en A4 o A3">🔍 Ver mes en grande</button>
      <button class="ghost" style="border:1px solid var(--line)" onclick="agImprimirMes()" title="Abre una vista imprimible de este mes, lista para imprimir en A3">🖨️ Imprimir mes (A3)</button>
      <button class="ghost" style="border:1px solid var(--line)" onclick="agImprimirAnio()" title="Vista anual compacta con los festivos marcados, lista para imprimir">🖨️ Imprimir año</button>
    </div>
  </div>`;
}
function agConQuienLabel(e){ return e.tipo==="reunion" && e.reunionCon ? reTipoInfo(e.reunionCon).label : ""; }
function agRangoLabel(e){ return (e.fechaFin && e.fechaFin!==e.fecha) ? `${fmt2(e.fecha)} – ${fmt2(e.fechaFin)}` : ""; }
function agEventoDiaFilaHTML(e){
  const info=agTipoInfo(e.tipo);
  const grupoLabel=agGruposLabelEvento(e);
  const con=agConQuienLabel(e);
  const rango=agRangoLabel(e);
  return `<div class="ag-evento" onclick="agAbrirModal('${e.fecha}','${e.id}')">
    <div style="flex-shrink:0;width:44px;text-align:center;padding-top:2px">
      <strong style="font-size:12.5px;color:var(--mut)">${e.hora?esc(e.hora):"—"}</strong>
    </div>
    <div class="ag-evento-info">
      <span class="pill" style="background:${info.color}1a;color:${info.color}">${info.label}</span>
      <div class="ag-evento-titulo">${esc(e.titulo)}</div>
      ${grupoLabel?`<div class="ag-evento-grupo">${esc(grupoLabel)}</div>`:""}
      ${con?`<div class="ag-evento-grupo">👥 ${esc(con)}</div>`:""}
      ${rango?`<div class="ag-evento-grupo">📅 ${rango}</div>`:""}
    </div>
  </div>`;
}
function agHorarioDelDia(fecha){
  const d=new Date(fecha+"T00:00:00");
  const diaId=AG_DIAS[(d.getDay()+6)%7];
  if(!HOR_DIAS.find(x=>x.id===diaId)) return [];
  const out=[];
  horFilas().forEach((f,i)=>{
    const c=horCelda(i,diaId);
    if(!c.tipo || c.tipo==="recreo") return;
    out.push({inicio:f.inicio,fin:f.fin,celda:c,fila:i,dia:diaId});
  });
  return out;
}
function agHorarioFilaHTML(h){
  const info=horTipoInfo(h.celda.tipo);
  const detalle = h.celda.tipo==="clase" ? [h.celda.materia,h.celda.nivelGrupo,h.celda.aula].filter(Boolean).join(" · ") : (h.celda.nota||"");
  return `<div class="ag-evento" style="cursor:default">
    <div style="flex-shrink:0;width:44px;text-align:center;padding-top:2px">
      <strong style="font-size:11px;color:var(--mut)">${h.inicio}</strong>
    </div>
    <div class="ag-evento-info">
      <span class="pill" style="background:${info.color}1a;color:${info.color}">${info.label}</span>
      ${detalle?`<div class="ag-evento-titulo" style="font-size:12.5px;font-weight:600">${esc(detalle)}</div>`:""}
    </div>
  </div>`;
}
function agRenderDiaHTML(fecha){
  const d=new Date(fecha+"T00:00:00");
  const nombreDia=AG_DIAS_LARGO[(d.getDay()+6)%7];
  const evs=agEventosFiltrados((state.eventos||[]).filter(e=>agEventoActivoEnDia(e,fecha))).sort((a,b)=>(a.hora||"99:99").localeCompare(b.hora||"99:99")||a.titulo.localeCompare(b.titulo));
  const esHoy=fecha===agHoyStr();
  const esFestivo=agEsFestivo(fecha);
  const festivoInfo=agFestivoEnDia(fecha);
  const horarioDia=agHorarioDelDia(fecha);
  const filas=evs.length? evs.map(agEventoDiaFilaHTML).join("") : `<p class="sub" style="margin:8px 0 0">No hay nada previsto este día.</p>`;
  return `
  <div class="card">
    <div class="flex" style="justify-content:space-between;align-items:center;margin-bottom:2px;flex-wrap:wrap;gap:8px">
      <div>
        <strong style="font-size:14.5px">${nombreDia} ${d.getDate()} de ${AG_MESES[d.getMonth()]}</strong>
        ${esHoy?`<span class="pill" style="background:var(--accent-soft);color:var(--accent-2);margin-left:8px">Hoy</span>`:""}
        ${esFestivo?`<span class="pill" style="background:rgba(220,38,38,.14);color:#b91c1c;margin-left:8px">Festivo${festivoInfo&&festivoInfo.etiqueta?": "+esc(festivoInfo.etiqueta):""}</span>`:""}
      </div>
      <button class="ghost" style="padding:2px 10px" onclick="agCerrarDia()" title="Volver al resumen del mes">× Cerrar</button>
    </div>
    <div class="flex" style="margin-top:6px">
      <button class="ghost small" style="border:1px solid ${esFestivo?"#dc2626":"var(--line)"};color:${esFestivo?"#dc2626":"inherit"}" onclick="agToggleFestivo('${fecha}')">${esFestivo?"✕ Quitar festivo":"🔴 Marcar como festivo"}</button>
    </div>
    ${horarioDia.length?`<div style="margin-top:12px">
      <div style="font-size:11px;font-weight:700;color:var(--mut);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">🗓️ Horario</div>
      <div class="ag-lista" style="max-height:170px">${horarioDia.map(agHorarioFilaHTML).join("")}</div>
    </div>`:""}
    <div style="font-size:11px;font-weight:700;color:var(--mut);text-transform:uppercase;letter-spacing:.04em;margin:14px 0 6px">📌 Eventos</div>
    <div class="ag-lista">${filas}</div>
    <div class="flex" style="margin-top:12px">
      <button class="btn small" onclick="agAbrirModal('${fecha}','')">+ Añadir evento este día</button>
    </div>
  </div>`;
}
function agRenderResumenHTML(){
  if(state.ui.agDiaSel) return agRenderDiaHTML(state.ui.agDiaSel);
  const busqueda=(state.ui.agBusqueda||"").trim();
  const vista=state.ui.agVista||"mes";
  const evs = busqueda ? agEventosBusqueda() : (vista==="proximos" ? agProximosEventos(10) : agEventosDelMes(agMesActual()));
  const filas = evs.length? evs.map(e=>{
    const info=agTipoInfo(e.tipo);
    const d=new Date(e.fecha+"T00:00:00");
    const etiquetaFecha = (busqueda||vista==="proximos") ? AG_MESES[d.getMonth()].slice(0,3) : AG_DIAS[(d.getDay()+6)%7];
    const grupoLabel=agGruposLabelEvento(e);
    const con=agConQuienLabel(e);
    const rango=agRangoLabel(e);
    return `<div class="ag-evento" onclick="agAbrirModal('${e.fecha}','${e.id}')">
      <div class="ag-evento-fecha"><span>${etiquetaFecha}</span><strong>${d.getDate()}</strong></div>
      <div class="ag-evento-info">
        <span class="pill" style="background:${info.color}1a;color:${info.color}">${info.label}</span>
        ${e.hora?`<span class="pill" style="background:var(--surface);border:1px solid var(--line);color:var(--mut);margin-left:4px">⏰ ${esc(e.hora)}</span>`:""}
        <div class="ag-evento-titulo">${esc(e.titulo)}</div>
        ${grupoLabel?`<div class="ag-evento-grupo">${esc(grupoLabel)}</div>`:""}
        ${con?`<div class="ag-evento-grupo">👥 ${esc(con)}</div>`:""}
        ${rango?`<div class="ag-evento-grupo">📅 ${rango}</div>`:""}
      </div>
    </div>`;
  }).join("") : `<p class="sub" style="margin:8px 0 0">${busqueda?"Sin resultados para esta búsqueda.":(vista==="proximos"?"No hay próximos eventos.":"Sin eventos este mes.")} ${busqueda?"":`Pulsa un día del calendario para ver qué hay previsto, o "Nuevo" para añadir uno.`}</p>`;
  return `
  <div class="card">
    <div class="flex" style="justify-content:space-between;align-items:center;margin-bottom:2px;flex-wrap:wrap;gap:8px">
      <div class="flex" style="gap:4px">
        ${busqueda?`<span class="pill" style="background:var(--accent-soft);color:var(--accent-2)">🔎 Resultados de "${esc(busqueda)}"</span>`:`
        <button class="tab ${vista==="mes"?"on":""}" style="padding:5px 12px;font-size:12.5px" onclick="agSetVista('mes')">Este mes</button>
        <button class="tab ${vista==="proximos"?"on":""}" style="padding:5px 12px;font-size:12.5px" onclick="agSetVista('proximos')">Próximos</button>`}
      </div>
      <button class="btn small" onclick="agAbrirModal('${agFechaPorDefecto()}','')">+ Nuevo</button>
    </div>
    <div class="ag-lista" style="margin-top:10px">${filas}</div>
  </div>`;
}
function agRenderModalHTML(){
  const fecha=state.ui.agModalFecha, id=state.ui.agModalEventId;
  const ev = id? (state.eventos||[]).find(e=>e.id===id) : null;
  const tipoInicial = ev? ev.tipo : AG_TIPOS[0].id;
  const vinc = ev? agBuscarExamenVinculado(ev.examId) : null;
  const vincRe = ev && ev.reunionId ? (state.reuniones||[]).find(r=>r.id===ev.reunionId) : null;
  return `
  <div class="modal-overlay" onclick="if(event.target===this) agCerrarModal()">
    <div class="modal-box" style="max-width:440px">
      <div class="flex" style="justify-content:space-between;align-items:flex-start">
        <h2 style="font-size:17px">${ev?"Editar evento":"Nuevo evento"}</h2>
        <button class="modal-close" onclick="agCerrarModal()">×</button>
      </div>
      ${vinc?`<div class="alert-box" style="margin-top:8px">🖊️ Vinculado al examen "${esc(vinc.a.nombre)}" (${esc(vinc.g.nombre)}).
        <button class="btn small" onclick="agCerrarModal();cxAbrirDesdeOtroModo('${vinc.a.id}')">Corregir →</button></div>`:""}
      ${vincRe?`<div class="alert-box" style="margin-top:8px">🗂️ Vinculado a la reunión "${esc(vincRe.titulo)}".
        <button class="btn small" onclick="agCerrarModal();reAbrirDesdeOtroModo('${vincRe.id}')">Ver reunión →</button></div>`:""}
      <div class="grid" style="gap:12px;margin-top:10px">
        <div class="flex" style="gap:10px;align-items:flex-start">
          <label style="flex:1;font-size:12.5px;color:var(--mut);font-weight:500">Fecha
            <input class="in" style="width:100%;margin-top:4px" type="date" id="agFFecha" value="${ev?ev.fecha:fecha}">
          </label>
          <label style="width:130px;flex-shrink:0;font-size:12.5px;color:var(--mut);font-weight:500">Hora (opcional)
            <input class="in" style="width:100%;margin-top:4px" type="time" id="agFHora" value="${ev?esc(ev.hora||""):""}">
          </label>
        </div>
        <div class="flex" style="gap:10px;align-items:flex-start">
          <label style="flex:1;font-size:12.5px;color:var(--mut);font-weight:500">Fecha fin (opcional, para eventos de varios días)
            <input class="in" style="width:100%;margin-top:4px" type="date" id="agFFechaFin" value="${ev?esc(ev.fechaFin||""):""}">
          </label>
          <label style="width:130px;flex-shrink:0;font-size:12.5px;color:var(--mut);font-weight:500">Hora fin (opcional)
            <input class="in" style="width:100%;margin-top:4px" type="time" id="agFHoraFin" value="${ev?esc(ev.horaFin||""):""}">
          </label>
        </div>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500;display:${(tipoInicial==="cocope"||tipoInicial==="claustro")?"none":""}" id="agFTituloWrap">Título
          <input class="in" style="width:100%;margin-top:4px" id="agFTitulo" placeholder="Examen Tema 3, entrega del trabajo…" value="${ev?esc(ev.titulo):""}">
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Tipo
          <select class="in" style="width:100%;margin-top:4px" id="agFTipo" onchange="agActualizarCamposModalEvento(this.value)">
            ${AG_TIPOS.map(t=>`<option value="${t.id}" ${tipoInicial===t.id?"selected":""}>${t.label}</option>`).join("")}
          </select>
        </label>
        <div id="agExamWrap" style="display:${tipoInicial==="examen"?"":"none"}">
          <label style="font-size:12.5px;color:var(--mut);font-weight:500">Examen vinculado (opcional)
            <select class="in" style="width:100%;margin-top:4px" id="agFExamen">
              <option value="">Ninguno</option>
              ${agExamenesDisponibles().map(x=>`<option value="${x.id}" ${ev&&ev.examId===x.id?"selected":""}>${esc(x.label)}</option>`).join("")}
            </select>
          </label>
          <p class="sub" style="margin:4px 0 0;font-size:11.5px">Al vincularlo, este evento abrirá un acceso directo para corregirlo.</p>
        </div>
        <div id="agReConWrap" style="display:${tipoInicial==="reunion"?"":"none"}">
          <label style="font-size:12.5px;color:var(--mut);font-weight:500">¿Con quién es la reunión?
            <select class="in" style="width:100%;margin-top:4px" id="agFReunionCon">
              <option value="">Sin especificar</option>
              ${RE_TIPOS.map(t=>`<option value="${t.id}" ${ev&&ev.reunionCon===t.id?"selected":""}>${t.label}</option>`).join("")}
            </select>
          </label>
        </div>
        <div id="agReWrap" style="display:${tipoInicial==="reunion"?"":"none"}">
          <label style="font-size:12.5px;color:var(--mut);font-weight:500">Reunión vinculada (opcional)
            <select class="in" style="width:100%;margin-top:4px" id="agFReunion" onchange="agSincronizarConReunion(this.value)">
              <option value="">Ninguna</option>
              ${(state.reuniones||[]).map(r=>`<option value="${r.id}" ${ev&&ev.reunionId===r.id?"selected":""}>${esc(r.titulo)}</option>`).join("")}
            </select>
          </label>
          <p class="sub" style="margin:4px 0 0;font-size:11.5px">Al vincularla, este evento abrirá un acceso directo a su acta.</p>
        </div>
        <div style="font-size:12.5px;color:var(--mut);font-weight:500" id="agFGrupoWrap">
          Grupos (opcional) <span id="agFGrupoNingunoTxt" style="font-weight:400;font-style:italic">${(tipoInicial==="cocope"||tipoInicial==="claustro")?"— Ninguno (no aplica a grupos) —":"— vacío = General / todos —"}</span>
          <div class="ag-lista" id="agFGrupoLista" style="max-height:120px;margin-top:4px;border:1px solid var(--line);border-radius:10px;padding:6px 10px">
            ${state.grupos.length? state.grupos.map(g=>`<label class="flex" style="gap:8px;align-items:center;font-weight:400;font-size:13px;padding:3px 0">
              <input type="checkbox" class="agFGrupoChk" value="${g.id}" ${ev&&agGrupoIdsDeEvento(ev).includes(g.id)?"checked":""}>${esc(g.nombre)}
            </label>`).join("") : `<p class="sub" style="margin:2px 0">No hay grupos creados todavía.</p>`}
          </div>
        </div>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Notas (opcional)
          <textarea class="in" style="width:100%;margin-top:4px;min-height:60px;resize:vertical" id="agFNotas">${ev?esc(ev.notas||""):""}</textarea>
        </label>
        ${!ev?`<div>
          <label style="font-size:12.5px;color:var(--mut);font-weight:500">Repetir
            <select class="in" style="width:100%;margin-top:4px" id="agFRepetir" onchange="document.getElementById('agRepetirHastaWrap').style.display=this.value?'':'none'">
              <option value="">No repetir</option>
              <option value="semanal">Cada semana</option>
              <option value="quincenal">Cada 15 días</option>
              <option value="mensual">Cada mes</option>
            </select>
          </label>
          <div id="agRepetirHastaWrap" style="display:none;margin-top:8px">
            <label style="font-size:12.5px;color:var(--mut);font-weight:500">Repetir hasta (inclusive)
              <input class="in" style="width:100%;margin-top:4px" type="date" id="agFRepetirHasta">
            </label>
            <p class="sub" style="margin:4px 0 0;font-size:11.5px">Si además indicas una fecha fin arriba, se ignora la repetición: un evento de varios días no forma serie.</p>
          </div>
        </div>`:""}
        ${ev&&ev.recurrenciaId?`<p class="sub" style="margin:0;font-size:11.5px">🔁 Forma parte de una serie. "Eliminar" solo quita este día; hay una opción aparte para quitar toda la serie.</p>`:""}
      </div>
      <div class="flex" style="justify-content:space-between;margin-top:18px">
        <div class="flex">${ev?`<button class="ghost danger" onclick="agEliminarEvento('${ev.id}')">Eliminar</button>`:""}${ev&&ev.recurrenciaId?`<button class="ghost danger" onclick="agEliminarSerie('${ev.recurrenciaId}')">Eliminar serie</button>`:""}${ev?`<button class="ghost" onclick="agDuplicarEvento('${ev.id}')" title="Crea una copia de este evento para otra fecha">⧉ Duplicar</button>`:""}</div>
        <div class="flex">
          <button class="ghost" onclick="agCerrarModal()">Cancelar</button>
          <button class="btn" id="agFGuardar" onclick="agGuardarEvento()">Guardar</button>
        </div>
      </div>
    </div>
  </div>`;
}
window.agActualizarCamposModalEvento=(tipo)=>{
  document.getElementById("agExamWrap").style.display=tipo==="examen"?"":"none";
  document.getElementById("agReWrap").style.display=tipo==="reunion"?"":"none";
  document.getElementById("agReConWrap").style.display=tipo==="reunion"?"":"none";
  const sinTitulo = tipo==="cocope"||tipo==="claustro";
  const tituloWrap=document.getElementById("agFTituloWrap");
  if(tituloWrap) tituloWrap.style.display=sinTitulo?"none":"";
  const grupoNingunoTxt=document.getElementById("agFGrupoNingunoTxt");
  if(grupoNingunoTxt){
    grupoNingunoTxt.textContent=sinTitulo?"— Ninguno (no aplica a grupos) —":"— vacío = General / todos —";
    if(sinTitulo) document.querySelectorAll(".agFGrupoChk").forEach(chk=>{ chk.checked=false; });
  }
};
window.agAbrirModal=(fecha,eventoId)=>{ state.ui.agModalFecha=fecha||agFechaPorDefecto(); state.ui.agModalEventId=eventoId||""; save(); render(); };
window.agCerrarModal=()=>{ state.ui.agModalFecha=""; state.ui.agModalEventId=""; save(); render(); };
window.agSincronizarConReunion=(reunionId)=>{
  if(!reunionId) return;
  const r=(state.reuniones||[]).find(x=>x.id===reunionId);
  const sel=document.getElementById("agFReunionCon");
  if(r && sel) sel.value=r.tipo;
};
window.agDuplicarEvento=id=>{
  const ev=(state.eventos||[]).find(e=>e.id===id);
  if(!ev) return;
  const copia={...ev, id:uid(), recurrenciaId:"", grupoIds:agGrupoIdsDeEvento(ev).slice()};
  if(!Array.isArray(state.eventos)) state.eventos=[];
  state.eventos.push(copia);
  state.ui.agModalEventId=copia.id;
  state.ui.agModalFecha=copia.fecha;
  save(); render();
};
window.agGuardarEvento=()=>{
  const fecha=document.getElementById("agFFecha").value;
  const tipo=document.getElementById("agFTipo").value;
  let titulo=document.getElementById("agFTitulo")?.value.trim()||"";
  if(!titulo && (tipo==="cocope"||tipo==="claustro")) titulo=agTipoInfo(tipo).label;
  const hora=document.getElementById("agFHora")?.value||"";
  const fechaFinInput=document.getElementById("agFFechaFin")?.value||"";
  const fechaFin = (fechaFinInput && fechaFinInput>fecha) ? fechaFinInput : "";
  const horaFin=document.getElementById("agFHoraFin")?.value||"";
  const grupoIds=Array.from(document.querySelectorAll(".agFGrupoChk:checked")).map(chk=>chk.value);
  const notas=document.getElementById("agFNotas").value.trim();
  const examId = tipo==="examen" ? (document.getElementById("agFExamen")?.value||"") : "";
  const reunionId = tipo==="reunion" ? (document.getElementById("agFReunion")?.value||"") : "";
  const reunionCon = tipo==="reunion" ? (document.getElementById("agFReunionCon")?.value||"") : "";
  if(!fecha || !titulo) return;
  if(!Array.isArray(state.eventos)) state.eventos=[];
  const id=state.ui.agModalEventId;
  if(id){
    const ev=state.eventos.find(e=>e.id===id);
    if(ev){ ev.fecha=fecha; ev.fechaFin=fechaFin; ev.titulo=titulo; ev.tipo=tipo; ev.hora=hora; ev.horaFin=horaFin; ev.grupoIds=grupoIds; delete ev.grupoId; ev.notas=notas; ev.examId=examId; ev.reunionId=reunionId; ev.reunionCon=reunionCon; }
  }else{
    const repetir = fechaFin ? "" : (document.getElementById("agFRepetir")?.value||"");
    const hasta=repetir? document.getElementById("agFRepetirHasta")?.value : "";
    if(repetir && hasta && hasta>fecha){
      const recurrenciaId=uid();
      const inicio=new Date(fecha+"T00:00:00");
      const diaObjetivo=inicio.getDate();
      const pasoDias = repetir==="quincenal" ? 14 : 7;
      let n=0, creados=0, f=fecha;
      while(creados<120){
        if(repetir==="mensual"){
          const totalM=inicio.getMonth()+n;
          const y2=inicio.getFullYear()+Math.floor(totalM/12);
          const m2=((totalM%12)+12)%12;
          const ultimoDiaMes=new Date(y2,m2+1,0).getDate();
          f=y2+"-"+String(m2+1).padStart(2,"0")+"-"+String(Math.min(diaObjetivo,ultimoDiaMes)).padStart(2,"0");
        }else{
          const dt=new Date(inicio); dt.setDate(dt.getDate()+pasoDias*n);
          f=dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0")+"-"+String(dt.getDate()).padStart(2,"0");
        }
        if(f>hasta) break;
        state.eventos.push({id:uid(),fecha:f,fechaFin:"",titulo,tipo,hora,horaFin,grupoIds,notas,examId:"",reunionId:"",reunionCon,recurrenciaId});
        n++; creados++;
      }
    }else{
      state.eventos.push({id:uid(),fecha,fechaFin,titulo,tipo,hora,horaFin,grupoIds,notas,examId,reunionId,reunionCon,recurrenciaId:""});
    }
  }
  state.ui.agMes=fecha.slice(0,7);
  if(state.ui.agDiaSel) state.ui.agDiaSel=fecha;
  state.ui.agModalFecha=""; state.ui.agModalEventId="";
  // Si el filtro activo dejaría oculto el evento que se acaba de guardar, se quita
  // para que se vea de inmediato (si no, parece que el evento no se ha guardado).
  const filtroGrupoOk = !state.ui.agFiltroGrupo || (state.ui.agFiltroGrupo==="__general__" ? grupoIds.length===0 : grupoIds.includes(state.ui.agFiltroGrupo));
  const filtroTipoOk = !state.ui.agFiltroTipo || state.ui.agFiltroTipo===tipo;
  let filtroAjustado=false;
  if(!filtroGrupoOk){ state.ui.agFiltroGrupo=""; filtroAjustado=true; }
  if(!filtroTipoOk){ state.ui.agFiltroTipo=""; filtroAjustado=true; }
  save(); render();
  mostrarToast(filtroAjustado?"✓ Evento guardado — se ha quitado el filtro que lo ocultaba":"✓ Evento guardado");
};
window.agEliminarSerie=async recurrenciaId=>{
  if(!await confirmar("¿Eliminar TODAS las repeticiones de este evento semanal? No se puede deshacer.")) return;
  state.eventos=(state.eventos||[]).filter(e=>e.recurrenciaId!==recurrenciaId);
  state.ui.agModalFecha=""; state.ui.agModalEventId="";
  save(); render();
};
window.agEliminarEvento=async id=>{
  if(!await confirmar("¿Eliminar este evento? No se puede deshacer.")) return;
  state.eventos=(state.eventos||[]).filter(e=>e.id!==id);
  state.ui.agModalFecha=""; state.ui.agModalEventId="";
  save(); render();
};
window.agMesAnterior=()=>{ const [y,m]=agMesActual().split("-").map(Number); const d=new Date(y,m-2,1); state.ui.agMes=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"); state.ui.agDiaSel=""; save(); render(); };
window.agMesSiguiente=()=>{ const [y,m]=agMesActual().split("-").map(Number); const d=new Date(y,m,1); state.ui.agMes=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"); state.ui.agDiaSel=""; save(); render(); };
window.agMesHoy=()=>{ state.ui.agMes=agHoyStr().slice(0,7); state.ui.agDiaSel=agHoyStr(); save(); render(); };
window.agIrAMes=v=>{ if(!v) return; state.ui.agMes=v; state.ui.agDiaSel=""; save(); render(); };
window.agSeleccionarDia=fecha=>{ state.ui.agDiaSel = (state.ui.agDiaSel===fecha) ? "" : fecha; save(); render(); };
window.agCerrarDia=()=>{ state.ui.agDiaSel=""; save(); render(); };

