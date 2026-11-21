/* ============================================================================
   Cuaderno del profesor · Aviso temprano: alumnado en riesgo en la evaluación elegida
   js/inicio/aviso-riesgo.js
   ============================================================================ */

/* Tarjeta de Inicio que avisa ANTES de la sesión de evaluación. Usa exactamente los mismos cálculos que
   Resultados (notaTrimestre, notaActa, marcas NP), así que dice lo mismo que verías entrando grupo a grupo.
   Motivos, para la evaluación elegida arriba (Periodo):
     - suspende: su nota de la evaluación, en nota de acta, está por debajo de 5;
     - baja:     tiene RIESGO_BAJADA puntos o más menos que en la evaluación anterior;
     - np:       RIESGO_NP actividades o más marcadas «No presentado».
   Solo informa: no cambia ninguna nota. */
const RIESGO_BAJADA=2, RIESGO_NP=2;

function riesgoCalcular(){
  const t=state.ui.trim, filas=[];
  (state.grupos||[]).forEach(g=>{
    const actsT=(g.actividades||[]).filter(a=>a.trimestre===t);
    (g.alumnos||[]).forEach(al=>{
      const motivos=[]; let peso=0;
      const nt=notaTrimestre(g,al.id,t);
      if(nt!=null){
        const acta=notaActa(nt,g);
        if(acta!=null && acta<5){ motivos.push({tipo:"suspende",texto:`suspende (${fmt(nt)})`}); peso+=3; }
        if(t>0){
          const na=notaTrimestre(g,al.id,t-1);
          if(na!=null && na-nt>=RIESGO_BAJADA-1e-9){ motivos.push({tipo:"baja",texto:`ha bajado de ${fmt(na)} a ${fmt(nt)} respecto a la ${TRIMESTRES[t-1]}`}); peso+=2; }
        }
      }
      const np=actsT.filter(a=>marcaDe(g,al.id,a.id)==="NP").length;
      if(np>=RIESGO_NP){ motivos.push({tipo:"np",texto:`${np} «No presentado»`}); peso+=1; }
      if(motivos.length) filas.push({g,al,motivos,peso,nt});
    });
  });
  // Primero lo más grave; a igualdad, la nota más baja.
  filas.sort((a,b)=>(b.peso-a.peso)||((a.nt??11)-(b.nt??11)));
  return filas;
}

function avisoRiesgoHTML(){
  const filas=riesgoCalcular(); if(!filas.length) return "";
  const MAX=state.ui.riesgoTodos?filas.length:8, vis=filas.slice(0,MAX);
  const icono={suspende:"🔴",baja:"📉",np:"⚪"};
  return `<div class="card aviso-riesgo" style="margin-bottom:14px">
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <strong style="font-size:14px">🚦 Alumnado en riesgo · ${TRIMESTRES[state.ui.trim]}</strong>
      <span class="sub" style="margin:0">${filas.length} alumno${filas.length===1?"":"s"}/a${filas.length===1?"":"s"} en tus grupos</span>
    </div>
    <p class="sub" style="margin:4px 0 8px;font-size:12.5px">Para actuar antes de la sesión de evaluación: quien va suspendiendo, quien ha bajado ${RIESGO_BAJADA} puntos o más respecto a la evaluación anterior y quien acumula «No presentado». Las notas son las de Resultados.</p>
    <div style="display:grid;gap:6px">
      ${vis.map(f=>`<div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:nowrap;gap:8px">
        <span style="font-size:13px;min-width:0"><strong>${esc(f.g.nombre)}</strong> · ${esc(f.al.nombre)}: ${f.motivos.map(m=>`<span>${icono[m.tipo]}&nbsp;${m.texto}</span>`).join(" · ")}</span>
        <button class="ghost small" style="border:1px solid var(--line);flex-shrink:0" onclick="riesgoIr('${escJS(f.g.id)}','${escJS(f.al.id)}')">Ver</button>
      </div>`).join("")}
      ${filas.length>vis.length?`<button class="ghost small" style="justify-self:start;border:1px solid var(--line)" onclick="state.ui.riesgoTodos=true;render()">Ver los ${filas.length-vis.length} restantes</button>`:""}
    </div>
  </div>`;
}
/* «Ver»: abre Resultados del grupo con el informe de ese alumno/a desplegado. */
window.riesgoIr=(gid,alId)=>{ state.ui.resVista=""; state.ui.resAl=alId; hoyIr(gid,"resultados"); };
