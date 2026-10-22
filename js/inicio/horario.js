/* ============================================================================
   Cuaderno del profesor · Horario semanal, franjas horarias y vista «Hoy»
   js/inicio/horario.js
   ============================================================================ */

/* =================================================================
   HORARIO SEMANAL — cuadrícula Lunes-Viernes con las franjas horarias
   del centro. Cada celda: Clase (materia/nivel-grupo/aula), Guardia,
   Complementaria, Reducción, Recreo u Otro, con nota libre donde
   aplica. Vive en state.horario (top-level, se incluye solo con
   Exportar/Importar copia).
   ================================================================= */
const HOR_FILAS_DEF=[
  {inicio:"07:45",fin:"08:00",recreo:false},
  {inicio:"08:00",fin:"08:55",recreo:false},
  {inicio:"08:55",fin:"09:50",recreo:false},
  {inicio:"09:50",fin:"10:45",recreo:false},
  {inicio:"10:45",fin:"11:15",recreo:true},
  {inicio:"11:15",fin:"12:10",recreo:false},
  {inicio:"12:10",fin:"13:05",recreo:false},
  {inicio:"13:05",fin:"14:00",recreo:false},
  {inicio:"14:00",fin:"14:10",recreo:true},
  {inicio:"14:10",fin:"15:05",recreo:false},
];
/* v2: las franjas son editables (state.horario.filas). Si no se han
   tocado, se usan las de siempre (HOR_FILAS_DEF). */
function horFilas(){ const f=state&&state.horario&&state.horario.filas; return (Array.isArray(f)&&f.length)?f:HOR_FILAS_DEF; }
const HOR_DIAS=[{id:"L",label:"Lunes"},{id:"M",label:"Martes"},{id:"X",label:"Miércoles"},{id:"J",label:"Jueves"},{id:"V",label:"Viernes"}];
const HOR_TIPOS=[
  {id:"",label:"— Vacío —",color:"var(--muted-border)"},
  {id:"clase",label:"Clase",color:"#2563eb"},
  {id:"guardia",label:"Guardia",color:"#b45309"},
  {id:"complementaria",label:"Complementaria",color:"#7c3aed"},
  {id:"reduccion",label:"Reducción",color:"#0d9488"},
  {id:"reunion",label:"Reunión",color:"#be185d"},
  {id:"atencionFamilias",label:"Atención a Familias",color:"#15803d"},
  {id:"recreo",label:"Recreo",color:"#64748b"},
  {id:"otro",label:"Otro",color:"#64748b"}
];
function horTipoInfo(id){ return HOR_TIPOS.find(t=>t.id===id)||HOR_TIPOS[0]; }
function horClave(fila,dia){ return fila+"-"+dia; }
function horCelda(fila,dia){
  const c=(state.horario&&state.horario.celdas)?state.horario.celdas[horClave(fila,dia)]:null;
  if(c) return c;
  if(horFilas()[fila].recreo) return {tipo:"recreo",materia:"",nivelGrupo:"",aula:"",nota:""};
  return {tipo:"",materia:"",nivelGrupo:"",aula:"",nota:""};
}
window.horAbrirModal=(fila,dia)=>{ state.ui.horModalCelda={fila,dia}; save(); render(); };
window.horCerrarModal=()=>{ state.ui.horModalCelda=null; save(); render(); };
function horRenderModalHTML(){
  const {fila,dia}=state.ui.horModalCelda;
  const f=horFilas()[fila]; const diaInfo=HOR_DIAS.find(d=>d.id===dia);
  const c=horCelda(fila,dia);
  const materiasSugeridas=[...new Set(state.grupos.map(g=>g.nombre.replace(/\s*\d.*$/,"").trim()).filter(Boolean))];
  return `<div class="modal-overlay" onclick="if(event.target===this) horCerrarModal()">
    <div class="modal-box" style="max-width:420px">
      <div class="flex" style="justify-content:space-between;align-items:flex-start">
        <h2 style="font-size:17px">${diaInfo.label} · ${f.inicio}–${f.fin}</h2>
        <button class="modal-close" onclick="horCerrarModal()">×</button>
      </div>
      <div class="grid" style="gap:12px;margin-top:10px">
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Tipo
          <select class="in" style="width:100%;margin-top:4px" id="horFTipo" onchange="horActualizarCamposModal()">
            ${HOR_TIPOS.map(t=>`<option value="${t.id}" ${c.tipo===t.id?"selected":""}>${t.label}</option>`).join("")}
          </select>
        </label>
        <div id="horFCamposClase" style="display:${c.tipo==="clase"?"":"none"}">
          <div class="grid" style="gap:10px">
            <label style="font-size:12.5px;color:var(--mut);font-weight:500">Materia
              <input class="in" style="width:100%;margin-top:4px" id="horFMateria" list="horMateriasList" value="${esc(c.materia||"")}" placeholder="Geografía e Historia">
              <datalist id="horMateriasList">${materiasSugeridas.map(m=>`<option value="${esc(m)}">`).join("")}</datalist>
            </label>
            <label style="font-size:12.5px;color:var(--mut);font-weight:500">Grupo del cuaderno (para los accesos de «Hoy»)
              <select class="in" style="width:100%;margin-top:4px" id="horFGrupoId">
                <option value="">— Sin enlazar —</option>
                ${state.grupos.map(g=>`<option value="${g.id}" ${(c.grupoId||(horGrupoDeCelda(c)||{}).id)===g.id?"selected":""}>${esc(g.nombre)}</option>`).join("")}
              </select>
            </label>
            <label style="font-size:12.5px;color:var(--mut);font-weight:500">Nivel y grupo
              <input class="in" style="width:100%;margin-top:4px" id="horFNivelGrupo" value="${esc(c.nivelGrupo||"")}" placeholder="2.º ESO A">
            </label>
            <label style="font-size:12.5px;color:var(--mut);font-weight:500">Aula
              <input class="in" style="width:100%;margin-top:4px" id="horFAula" value="${esc(c.aula||"")}" placeholder="Aula 12 / Aula de informática…">
            </label>
          </div>
        </div>
        <div id="horFCamposNota" style="display:${(c.tipo&&c.tipo!=="clase")?"":"none"}">
          <label style="font-size:12.5px;color:var(--mut);font-weight:500">Nota (opcional)
            <input class="in" style="width:100%;margin-top:4px" id="horFNota" value="${esc(c.nota||"")}" placeholder="Ej. Guardia de pasillo 2ª planta, Coordinación de departamento…">
          </label>
        </div>
      </div>
      <div class="flex" style="justify-content:space-between;margin-top:18px">
        <button class="ghost danger" onclick="horBorrarCelda('${fila}','${dia}')">Vaciar casilla</button>
        <div class="flex">
          <button class="ghost" onclick="horCerrarModal()">Cancelar</button>
          <button class="btn" onclick="horGuardarCelda('${fila}','${dia}')">Guardar</button>
        </div>
      </div>
    </div>
  </div>`;
}
window.horActualizarCamposModal=()=>{
  const tipo=document.getElementById("horFTipo").value;
  document.getElementById("horFCamposClase").style.display=tipo==="clase"?"":"none";
  document.getElementById("horFCamposNota").style.display=(tipo&&tipo!=="clase")?"":"none";
};
window.horGuardarCelda=(fila,dia)=>{
  const tipo=document.getElementById("horFTipo").value;
  const celda={ tipo,
    materia:tipo==="clase"?document.getElementById("horFMateria").value.trim():"",
    nivelGrupo:tipo==="clase"?document.getElementById("horFNivelGrupo").value.trim():"",
    aula:tipo==="clase"?document.getElementById("horFAula").value.trim():"",
    nota:(tipo&&tipo!=="clase")?document.getElementById("horFNota").value.trim():"",
    grupoId:tipo==="clase"?(document.getElementById("horFGrupoId")?.value||""):""
  };
  if(celda.grupoId){
    const g=state.grupos.find(x=>x.id===celda.grupoId);
    if(g){ if(!celda.nivelGrupo) celda.nivelGrupo=g.nombre; if(!celda.materia){ const cat=getCatalogo(g.catalogoKey); celda.materia=(cat&&cat.materia)||""; } }
  }
  if(!state.horario) state.horario={celdas:{}};
  if(!state.horario.celdas) state.horario.celdas={};
  state.horario.celdas[horClave(fila,dia)]=celda;
  state.ui.horModalCelda=null;
  save(); render();
};
window.horBorrarCelda=(fila,dia)=>{
  if(!state.horario) state.horario={celdas:{}};
  if(!state.horario.celdas) state.horario.celdas={};
  // Se guarda explícitamente vacía (en vez de borrar la clave) para que, en las
  // filas de Recreo, quede realmente en blanco y no vuelva a aparecer "Recreo"
  // por defecto ese día concreto.
  state.horario.celdas[horClave(fila,dia)]={tipo:"",materia:"",nivelGrupo:"",aula:"",nota:""};
  state.ui.horModalCelda=null;
  save(); render();
};
/* Copiar/pegar casillas: estado puramente de sesión (no persistido), igual
   que el resto de "modo" de Inicio — se resetea al recargar la página. */
let horPortapapeles=null;
function horResumenTextoPlano(c){
  const info=horTipoInfo(c.tipo);
  if(c.tipo==="clase") return `${c.materia||"Clase"}${c.nivelGrupo?" · "+c.nivelGrupo:""}`;
  return info.label+(c.nota?" — "+c.nota:"");
}
window.horCopiarCelda=(fila,dia)=>{
  const c=horCelda(fila,dia);
  if(!c.tipo) return;
  horPortapapeles={tipo:c.tipo, materia:c.materia||"", nivelGrupo:c.nivelGrupo||"", aula:c.aula||"", nota:c.nota||"", grupoId:c.grupoId||""};
  render();
  mostrarToast("📋 Copiado — toca otra casilla para pegar","info");
};
window.horPegarEnCelda=(fila,dia)=>{
  if(!horPortapapeles) return;
  if(!state.horario) state.horario={celdas:{}};
  if(!state.horario.celdas) state.horario.celdas={};
  state.horario.celdas[horClave(fila,dia)]={...horPortapapeles};
  save(); render();
  mostrarToast("✓ Pegado");
};
window.horCancelarCopia=()=>{ horPortapapeles=null; render(); };
function horCeldaResumenHTML(fila,dia){
  const c=horCelda(fila,dia);
  const info=horTipoInfo(c.tipo);
  if(!c.tipo) return "";
  if(c.tipo==="clase"){
    return `<div style="font-weight:700;font-size:11.5px;line-height:1.25">${esc(c.materia||"Clase")}</div>
      ${c.nivelGrupo?`<div style="font-size:10.5px;opacity:.85">${esc(c.nivelGrupo)}</div>`:""}
      ${c.aula?`<div style="font-size:10px;opacity:.7">${esc(c.aula)}</div>`:""}`;
  }
  return `<div style="font-weight:700;font-size:11px">${info.label}</div>${c.nota?`<div style="font-size:10px;opacity:.8">${esc(c.nota)}</div>`:""}`;
}
function horRenderGridHTML(){
  const enModoCopia=!!horPortapapeles;
  const cabecera=`<div class="hor-cell hor-head"></div>`+HOR_DIAS.map(d=>`<div class="hor-cell hor-head">${d.label}</div>`).join("");
  const filas=horFilas().map((f,fi)=>{
    const horaLbl=`<div class="hor-cell hor-time">${f.inicio}<br>${f.fin}</div>`;
    const celdas=HOR_DIAS.map(d=>{
      const c=horCelda(fi,d.id);
      const info=horTipoInfo(c.tipo);
      const vacio=!c.tipo;
      const onclickAttr=enModoCopia?`horPegarEnCelda(${fi},'${d.id}')`:`horAbrirModal(${fi},'${d.id}')`;
      const copiarBtn=(!vacio && !enModoCopia)?`<button class="hor-copiar-btn" onclick="event.stopPropagation();horCopiarCelda(${fi},'${d.id}')" title="Copiar esta casilla">📋</button>`:"";
      return `<div class="hor-cell hor-slot ${c.tipo==="recreo"?"hor-slot-recreo":""} ${enModoCopia?"hor-slot-pegar":""}" style="${!vacio?`background:${info.color}1a;border-color:${info.color}55;color:${info.color}`:""}" onclick="${onclickAttr}">
        ${horCeldaResumenHTML(fi,d.id)}
        ${copiarBtn}
      </div>`;
    }).join("");
    return `${horaLbl}${celdas}`;
  }).join("");
  const bannerCopia=enModoCopia?`<div class="alert-box" style="margin-bottom:10px;align-items:center;flex-wrap:wrap;gap:8px">
    <span>📋 <strong>Copiando:</strong> ${esc(horResumenTextoPlano(horPortapapeles))} — toca cualquier casilla para pegar. Puedes pegar en varias seguidas.</span>
    <button class="btn small" onclick="horCancelarCopia()">✓ Aceptar</button>
    <button class="ghost small" onclick="horCancelarCopia()">Cancelar</button>
  </div>`:"";
  return `<div class="card">
    <div class="flex" style="justify-content:space-between;align-items:center;margin-bottom:10px">
      <h2 style="font-size:15px">🗓️ Mi horario semanal</h2>
      <div class="flex" style="gap:6px"><button class="ghost" style="border:1px solid var(--line)" onclick="horAbrirFranjas()">⚙️ Franjas horarias</button>
      <button class="ghost" style="border:1px solid var(--line)" onclick="horImprimir()">🖨️ Imprimir horario</button></div>
    </div>
    ${bannerCopia}
    <div class="hor-grid">${cabecera}${filas}</div>
    <p class="sub" style="margin:8px 0 0">Toca el icono 📋 de una casilla rellena para copiarla, y luego toca cualquier otra para pegarla.</p>
  </div>`;
}
window.horImprimir=()=>{
  const hexA=(hex,a)=>{
    if(!hex.startsWith("#")) return `rgba(100,116,139,${a})`; // var(--muted-border) u otro sin hex
    const n=parseInt(hex.slice(1),16); const r=(n>>16)&255,g=(n>>8)&255,b=n&255;
    return `rgba(${r},${g},${b},${a})`;
  };
  const filasHtml=horFilas().map((f,fi)=>{
    const celdas=HOR_DIAS.map(d=>{
      const c=horCelda(fi,d.id);
      const esRecreoVacio=f.recreo && !c.tipo;
      if(!c.tipo){
        return esRecreoVacio
          ? `<td style="background:repeating-linear-gradient(135deg,#f3f3f3 0 6px,#e6e6e6 6px 12px);padding:14px 10px"></td>`
          : `<td style="padding:14px 10px"></td>`;
      }
      const info=horTipoInfo(c.tipo);
      const bg=hexA(info.color,0.16);
      const borde=hexA(info.color,0.55);
      if(c.tipo==="clase") return `<td style="background:${bg};border-left:3px solid ${borde};padding:14px 10px;font-size:13.5px"><strong>${esc(c.materia||"Clase")}</strong>${c.nivelGrupo?"<br>"+esc(c.nivelGrupo):""}${c.aula?'<br><span style="color:#777;font-size:12px">'+esc(c.aula)+"</span>":""}</td>`;
      return `<td style="background:${bg};border-left:3px solid ${borde};padding:14px 10px;font-size:13.5px"><strong>${info.label}</strong>${c.nota?"<br><span style=\"font-size:12px;color:#555\">"+esc(c.nota)+"</span>":""}</td>`;
    }).join("");
    return `<tr><td style="white-space:nowrap;font-size:12.5px;color:#666;font-weight:600;padding:14px 10px">${f.inicio}–${f.fin}</td>${celdas}</tr>`;
  }).join("");
  const leyenda=HOR_TIPOS.filter(t=>t.id && t.id!=="otro").map(t=>
    `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:14px;font-size:11.5px;color:#555">
      <span style="width:11px;height:11px;border-radius:3px;background:${hexA(t.color,0.35)};border:1.5px solid ${hexA(t.color,0.8)};display:inline-block"></span>${esc(t.label)}
    </span>`).join("");
  const body=`
    <div style="background:linear-gradient(135deg,#152a44,#25456b);color:#fff;padding:16px 22px;border-radius:10px;margin-bottom:16px">
      <div style="font-size:1.15rem;font-weight:700;text-transform:uppercase;letter-spacing:.03em">${esc(state.centroNombre)||"Horario semanal"}</div>
      <div style="font-size:.85rem;color:rgba(255,255,255,.85);margin-top:4px">Curso escolar ${esc(cursoEscolarEfectivo(null))}${profesorNombreEfectivo(null)?" · "+esc(profesorNombreEfectivo(null)):""}</div>
    </div>
    <table style="border-collapse:collapse;table-layout:fixed;font-size:14px">
      <thead><tr><th style="width:9%"></th>${HOR_DIAS.map(d=>`<th style="font-size:14px;padding:10px 8px">${d.label}</th>`).join("")}</tr></thead>
      <tbody>${filasHtml}</tbody>
    </table>
    <div style="margin-top:14px">${leyenda}</div>
  `;
  abrirVentanaInforme("Horario semanal", body, {landscape:true, maxWidth:"100%", center:true});
};

/* =================================================================
   v2 · FRANJAS HORARIAS EDITABLES
   Cada centro tiene su horario: aquí se añaden, quitan y cambian las
   franjas. Las casillas ya rellenas se mueven con su franja.
   ================================================================= */
function _horAsegurarFilasPropias(){
  if(!state.horario) state.horario={celdas:{}};
  if(!Array.isArray(state.horario.filas)||!state.horario.filas.length) state.horario.filas=HOR_FILAS_DEF.map(f=>({...f}));
  if(!state.horario.celdas) state.horario.celdas={};
}
function _horRemapear(fn){
  const nuevas={};
  Object.entries(state.horario.celdas||{}).forEach(([k,v])=>{
    const [f,d]=k.split("-"); const nf=fn(Number(f));
    if(nf!=null) nuevas[nf+"-"+d]=v;
  });
  state.horario.celdas=nuevas;
}
window.horAbrirFranjas=()=>{ state.ui.horModalFranjas=true; render(); };
window.horCerrarFranjas=()=>{ state.ui.horModalFranjas=false; render(); };
window.horSetFranja=(i,campo,v)=>{
  _horAsegurarFilasPropias();
  const f=state.horario.filas[i]; if(!f) return;
  if(campo==="recreo") f.recreo=!!v; else f[campo]=v;
  if(f.inicio&&f.fin&&f.fin<=f.inicio) mostrarToast("⚠️ La hora de fin debe ser posterior a la de inicio","info");
  save(); render();
};
window.horQuitarFranja=async i=>{
  _horAsegurarFilasPropias();
  const f=state.horario.filas[i]; if(!f) return;
  const ocupadas=HOR_DIAS.filter(d=>{ const c=state.horario.celdas[i+"-"+d.id]; return c&&c.tipo&&c.tipo!=="recreo"; }).length;
  if(state.horario.filas.length<=1){ mostrarAviso("El horario necesita al menos una franja."); return; }
  if(!await confirmar(`¿Quitar la franja ${f.inicio}–${f.fin}?${ocupadas?`\nTiene ${ocupadas} casilla(s) rellena(s), que se borrarán.`:""}`)) return;
  state.horario.filas.splice(i,1);
  _horRemapear(n=>n===i?null:(n>i?n-1:n));
  save(); render();
};
window.horInsertarFranja=i=>{
  _horAsegurarFilasPropias();
  const filas=state.horario.filas;
  const prev=filas[i];
  const ini=prev?prev.fin:"08:00";
  const [h,m]=ini.split(":").map(Number); const t=h*60+m+55;
  const fin=String(Math.floor(t/60)%24).padStart(2,"0")+":"+String(t%60).padStart(2,"0");
  filas.splice(i+1,0,{inicio:ini,fin,recreo:false});
  _horRemapear(n=>n>i?n+1:n);
  save(); render();
};
window.horRestablecerFranjas=async ()=>{
  if(!await confirmar("¿Volver a las franjas horarias por defecto? Las casillas se conservan por posición (1ª franja, 2ª franja…).")) return;
  if(state.horario) delete state.horario.filas;
  save(); render();
};
function horFranjasModalHTML(){
  const filas=horFilas();
  return `<div class="modal-overlay" onclick="if(event.target===this) horCerrarFranjas()">
    <div class="modal-box" style="max-width:560px">
      <div class="flex" style="justify-content:space-between;align-items:center"><h2 style="font-size:17px">⚙️ Franjas horarias de tu centro</h2><button class="modal-close" onclick="horCerrarFranjas()" aria-label="Cerrar">×</button></div>
      <p class="sub">Cambia las horas, marca los recreos y añade o quita franjas. Lo que ya tengas en cada casilla se mueve con su franja.</p>
      <div class="scroll" style="max-height:52vh">
        ${filas.map((f,i)=>`<div class="flex" style="gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid var(--line);flex-wrap:wrap">
          <span style="width:22px;color:var(--mut);font-size:12px">${i+1}.</span>
          <input class="in" type="time" value="${esc(f.inicio)}" style="width:110px" onchange="horSetFranja(${i},'inicio',this.value)">
          <span style="color:var(--mut)">–</span>
          <input class="in" type="time" value="${esc(f.fin)}" style="width:110px" onchange="horSetFranja(${i},'fin',this.value)">
          <label style="font-size:13px;display:inline-flex;gap:5px;align-items:center;cursor:pointer"><input type="checkbox" ${f.recreo?"checked":""} onchange="horSetFranja(${i},'recreo',this.checked)"> Recreo</label>
          <span style="flex:1"></span>
          <button class="ghost small" title="Añadir una franja justo después" onclick="horInsertarFranja(${i})">＋</button>
          <button class="ghost small danger" title="Quitar esta franja" onclick="horQuitarFranja(${i})">🗑</button>
        </div>`).join("")}
      </div>
      <div class="flex" style="justify-content:space-between;margin-top:12px;flex-wrap:wrap;gap:8px">
        <button class="ghost" style="border:1px solid var(--line)" onclick="horRestablecerFranjas()">↺ Franjas por defecto</button>
        <button class="btn" onclick="horCerrarFranjas()">Hecho</button>
      </div>
    </div>
  </div>`;
}
/* =================================================================
   v2 · HOY — lo que toca hoy según tu horario, con accesos directos
   a pasar lista, diario, calificar y plano del grupo de cada clase.
   ================================================================= */
function horGrupoDeCelda(c){
  if(!c || c.tipo!=="clase") return null;
  if(c.grupoId){ const g=state.grupos.find(x=>x.id===c.grupoId); if(g) return g; }
  const t=normalizarTexto(c.nivelGrupo||"").replace(/[^a-z0-9]/g,"");
  if(!t) return null;
  const cand=state.grupos.filter(g=>{ const n=normalizarTexto(g.nombre).replace(/[^a-z0-9]/g,""); return n===t || n.includes(t) || t.includes(n); });
  return cand.length===1?cand[0]:null;
}
window.hoyIr=(gid,tab)=>{
  const hoy=agHoyStr();
  state.ui.appMode="competencial"; state.ui.grupoId=gid; state.ui.tab=tab;
  if(tab==="asistencia") state.ui.asistFecha=hoy;
  if(tab==="diario") state.ui.diarioFecha=hoy;
  save(); render(); window.scrollTo(0,0);
};
function hoyTarjetaHTML(){
  const hoy=agHoyStr();
  const evs=agEventosHoy();
  const festivo=agFestivoEnDia(hoy);
  const franjas=festivo?[]:agHorarioDelDia(hoy);
  const hayHorario=Object.values((state.horario&&state.horario.celdas)||{}).some(c=>c&&c.tipo&&c.tipo!=="recreo");
  if(!franjas.length && !evs.length && !festivo && !hayHorario) return "";
  const ahora=new Date(); const min=ahora.getHours()*60+ahora.getMinutes();
  const aMin=t=>{ const [h,m]=String(t||"0:0").split(":").map(Number); return h*60+m; };
  let proximaMarcada=false;
  const filas=franjas.map(h=>{
    const ini=aMin(h.inicio), fin=aMin(h.fin);
    let estado="";
    if(min>=ini && min<fin) estado="ahora";
    else if(min<ini && !proximaMarcada){ estado="proxima"; }
    if(estado) proximaMarcada=true;
    const info=horTipoInfo(h.celda.tipo);
    const g=horGrupoDeCelda(h.celda);
    const detalle=h.celda.tipo==="clase"?[h.celda.materia,h.celda.nivelGrupo,h.celda.aula].filter(Boolean).map(esc).join(" · "):esc(info.label+(h.celda.nota?" — "+h.celda.nota:""));
    const acciones=g?`<div class="flex" style="gap:6px;flex-wrap:wrap">
        <button class="${estado==="ahora"?"btn":"ghost"} small" style="${estado==="ahora"?"":"border:1px solid var(--line)"}" onclick="hoyIr('${g.id}','asistencia')">✅ Lista</button>
        <button class="ghost small" style="border:1px solid var(--line)" onclick="hoyIr('${g.id}','diario')">📝 Diario</button>
        <button class="ghost small" style="border:1px solid var(--line)" onclick="hoyIr('${g.id}','calificar')">✍️ Calificar</button>
        <button class="ghost small" style="border:1px solid var(--line)" onclick="hoyIr('${g.id}','plano')">🪑 Plano</button>
      </div>`
      : (h.celda.tipo==="clase"?`<button class="ghost small" style="border:1px dashed var(--line)" onclick="homeTabActual='horario';horAbrirModal(${h.fila},'${h.dia}')">🔗 Enlazar a un grupo</button>`:"");
    return `<div class="flex" style="gap:12px;align-items:center;padding:8px 10px;border-radius:10px;flex-wrap:wrap;${estado==="ahora"?"background:var(--surface-2);box-shadow:inset 3px 0 0 var(--accent)":""}${min>=fin?";opacity:.55":""}">
      <div style="width:92px;flex-shrink:0;font-variant-numeric:tabular-nums;font-size:13px;font-weight:600">${esc(h.inicio)}–${esc(h.fin)}${estado==="ahora"?'<div style="font-size:11px;color:var(--accent-2)">● ahora</div>':estado==="proxima"?'<div style="font-size:11px;color:var(--mut)">siguiente</div>':""}</div>
      <div style="flex:1;min-width:160px"><span class="ag-dot" style="background:${info.color};display:inline-block;margin-right:6px"></span><strong style="font-size:13.5px">${detalle||info.label}</strong></div>
      ${acciones}
    </div>`;
  }).join("");
  const chips=evs.map(e=>{
    const info=agTipoInfo(e.tipo); const gl=agGruposLabelEvento(e);
    return `<span class="ag-hoy-chip" style="border-color:${info.color}55;background:${info.color}14" onclick="agAbrirModal('${e.fecha}','${e.id}')"><span class="ag-dot" style="background:${info.color}"></span>${e.hora?esc(e.hora)+" · ":""}${esc(e.titulo)}${gl?` · ${esc(gl)}`:""}</span>`;
  }).join("");
  const fechaLarga=ahora.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"});
  const finde=[0,6].includes(ahora.getDay());
  const vacio=festivo?`🎉 Hoy es festivo${festivo.etiqueta?": "+esc(festivo.etiqueta):""}.`:finde?"Fin de semana: no hay clases.":hayHorario?"Hoy no tienes nada en tu horario.":"";
  return `<div class="card" style="border-left:4px solid var(--accent);padding:14px 18px">
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <strong style="font-size:14.5px;color:var(--accent-2)">📌 Hoy · ${esc(fechaLarga.charAt(0).toUpperCase()+fechaLarga.slice(1))}</strong>
      ${hayHorario?"":`<button class="ghost small" style="border:1px solid var(--line)" onclick="homeTabActual='horario';homeSecciones.calendario=true;render()">🗓️ Rellena tu horario para ver aquí tus clases</button>`}
    </div>
    ${chips?`<div class="flex" style="gap:8px;margin-top:10px;flex-wrap:wrap">${chips}</div>`:""}
    ${filas?`<div style="margin-top:8px;display:grid;gap:2px">${filas}</div>`:(vacio?`<p class="sub" style="margin:8px 0 0">${vacio}</p>`:"")}
  </div>`;
}

/* Estado puramente visual de Inicio (pestaña activa y desplegable de ayuda).
   Deliberadamente NO vive en state: es una preferencia de la sesión en curso,
   no afecta a los datos ni a Exportar/Importar copia. */
let homeTabActual="calendario";
let homeAyudaAbierta=false;
let homeSecciones={evaluacion:true,seguimiento:true,organizacion:true,calendario:true};
let alumColumnasPanelAbierto=false;
let planoSeleccionado=null;
let progTrimAbiertos={0:true,1:true,2:true};
window.progToggleTrim=(t)=>{ progTrimAbiertos[t]=!progTrimAbiertos[t]; render(); };
let progSdaAbiertas={};
window.progToggleSdaAbierta=(id)=>{ progSdaAbiertas[id]=!progSdaAbiertas[id]; render(); };
window.homeSetTab=(t)=>{ homeTabActual=t; render(); };
window.homeToggleAyuda=()=>{ homeAyudaAbierta=!homeAyudaAbierta; render(); };
window.homeToggleSeccion=(k)=>{ homeSecciones[k]=!homeSecciones[k]; render(); };
function homeSeccionHeaderHTML(key,titulo){
  const abierta=homeSecciones[key];
  return `<button class="home-seccion-header" onclick="homeToggleSeccion('${key}')" aria-expanded="${abierta}">
    <span class="home-seccion-chevron">${abierta?"▾":"▸"}</span>
    <span class="section-eyebrow" style="margin:0">${titulo}</span>
  </button>`;
}
