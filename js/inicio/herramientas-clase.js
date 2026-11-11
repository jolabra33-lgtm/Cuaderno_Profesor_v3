/* ============================================================================
   Cuaderno del profesor · Herramientas de clase: sorteo de alumno/a y creación de grupos
   js/inicio/herramientas-clase.js
   ============================================================================ */

/* =================================================================
   v3 · SORTEO Y GRUPOS — en el mismo panel flotante que el cronómetro
   (pestañas ⏱️ Cronómetro · 🎲 Sorteo · 👥 Grupos).
   - Sorteo: elige a alguien del grupo al azar. Por defecto no repite
     hasta que hayan salido todos y deja fuera a quien falta hoy (según
     la pestaña Asistencia).
   - Grupos: reparte al grupo al azar en N equipos, o en equipos de N
     personas, lo más igualados posible. Se pueden copiar.
   No toca los datos: ni el sorteo ni los equipos se guardan (como el
   cronómetro). El panel se pensó para proyectarlo, así que el «Modo
   proyector» no oculta sus nombres.
   ================================================================= */
let claseTab="crono", claseGrupoId="", claseSinRepetir=true, claseSinAusentes=true;
const claseYaSalieron={};            // grupoId → Set de ids que ya han salido
let claseUltimo=null, claseAnimacion=null;
let claseModoGrupos="num", claseNumGrupos=4, claseEquipos=null;

function claseGrupo(){
  return state.grupos.find(g=>g.id===claseGrupoId) || (typeof grupoActual==="function" && grupoActual()) || state.grupos.find(g=>g.alumnos.length) || state.grupos[0] || null;
}
function claseNombre(a){ const n=(a.nombreP||"").trim(), ap=(a.apellidos||"").trim(); return n ? (n+(ap?" "+ap:"")) : (a.nombre||"(sin nombre)"); }
function claseAusentesHoy(g){
  const dia=(g.asistencia||{})[agHoyStr()]||{};
  return new Set(Object.keys(dia).filter(id=>/^falta/.test((dia[id]||{}).estado||"")));
}
function claseCandidatos(g){
  const fuera=claseSinAusentes?claseAusentesHoy(g):new Set();
  return g.alumnos.filter(a=>!fuera.has(a.id));
}
function claseBarajar(lista){
  const a=lista.slice();
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
/* Reparte en equipos lo más igualados posible (tamaños que difieren como mucho en 1). */
function claseRepartir(alumnos,modo,n){
  const total=alumnos.length; if(!total) return [];
  n=Math.max(1,Math.floor(Number(n)||1));
  const numEquipos=Math.min(total, modo==="tam" ? Math.max(1,Math.round(total/n)) : n);
  const equipos=Array.from({length:numEquipos},()=>[]);
  claseBarajar(alumnos).forEach((a,i)=>equipos[i%numEquipos].push(a));
  return equipos;
}

window.claseIrTab=t=>{ claseTab=t; clasePintar(); };
window.claseElegirGrupo=id=>{ claseGrupoId=id; claseUltimo=null; claseEquipos=null; clasePintar(); };
window.claseOpcion=(k,v)=>{ if(k==="repetir") claseSinRepetir=v; else if(k==="ausentes") claseSinAusentes=v; else if(k==="modo") claseModoGrupos=v; else if(k==="num") claseNumGrupos=Math.max(1,Math.min(40,parseInt(v)||1)); if(k!=="num") clasePintar(); };
window.claseReiniciarSorteo=()=>{ const g=claseGrupo(); if(g) delete claseYaSalieron[g.id]; claseUltimo=null; clasePintar(); };
window.claseSortear=()=>{
  const g=claseGrupo(); if(!g) return;
  const candidatos=claseCandidatos(g);
  if(!candidatos.length){ claseUltimo=null; clasePintar(); return; }
  let ya=claseYaSalieron[g.id]||(claseYaSalieron[g.id]=new Set());
  let bolsa=claseSinRepetir?candidatos.filter(a=>!ya.has(a.id)):candidatos;
  if(!bolsa.length){ ya.clear(); bolsa=candidatos; }            // han salido todos: vuelta a empezar
  const elegido=bolsa[Math.floor(Math.random()*bolsa.length)];
  ya.add(elegido.id);
  const mostrar=()=>{ claseUltimo={grupoId:g.id,id:elegido.id,nombre:claseNombre(elegido)}; clasePintar(); };
  clearInterval(claseAnimacion);
  const caja=document.getElementById("claseElegido");
  const sinMovimiento=window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(!caja || sinMovimiento || candidatos.length<3){ mostrar(); return; }
  // Unos nombres pasando deprisa antes de parar en el elegido.
  let pasos=0; caja.classList.add("clase-girando");
  claseAnimacion=setInterval(()=>{
    caja.textContent=claseNombre(candidatos[Math.floor(Math.random()*candidatos.length)]);
    if(++pasos>=9){ clearInterval(claseAnimacion); claseAnimacion=null; mostrar(); }
  },70);
};
window.claseCrearGrupos=()=>{
  const g=claseGrupo(); if(!g) return;
  const el=document.getElementById("claseNum"); if(el) claseNumGrupos=Math.max(1,Math.min(40,parseInt(el.value)||1));
  claseEquipos={grupoId:g.id,equipos:claseRepartir(claseCandidatos(g),claseModoGrupos,claseNumGrupos).map(e=>e.map(claseNombre))};
  clasePintar();
};
window.claseCopiarGrupos=async()=>{
  if(!claseEquipos) return;
  const txt=claseEquipos.equipos.map((e,i)=>`Grupo ${i+1}: ${e.join(", ")}`).join("\n");
  try{ await navigator.clipboard.writeText(txt); mostrarToast("✓ Grupos copiados"); }
  catch(e){ mostrarAviso(txt,"Grupos (copia el texto)"); }
};

function claseSelectorGrupoHTML(g){
  if(state.grupos.length<2) return `<div class="sub" style="margin:0 0 8px">${esc(g.nombre)}</div>`;
  return `<select class="in" style="width:100%;margin-bottom:8px" aria-label="Grupo" onchange="claseElegirGrupo(this.value)">${state.grupos.map(x=>`<option value="${x.id}" ${x.id===g.id?"selected":""}>${esc(x.nombre)} (${x.alumnos.length})</option>`).join("")}</select>`;
}
function claseSorteoHTML(){
  const g=claseGrupo();
  if(!g || !g.alumnos.length) return `<p class="sub" style="margin:10px 0">Añade alumnado a un grupo para poder sortear.</p>`;
  const candidatos=claseCandidatos(g), ya=claseYaSalieron[g.id]||new Set();
  const quedan=claseSinRepetir?candidatos.filter(a=>!ya.has(a.id)).length:candidatos.length;
  const ausentes=g.alumnos.length-candidatos.length;
  const elegido=claseUltimo && claseUltimo.grupoId===g.id ? claseUltimo.nombre : "";
  return `${claseSelectorGrupoHTML(g)}
    <div id="claseElegido" class="clase-elegido ${elegido?"":"clase-vacio"}" role="status" aria-live="polite">${elegido?esc(elegido):"¿A quién le toca?"}</div>
    <button class="btn" style="width:100%;font-size:15px;padding:11px" onclick="claseSortear()" ${candidatos.length?"":"disabled"}>🎲 ${elegido?"Otra persona":"Elegir a alguien"}</button>
    <div class="sub" style="margin:8px 0 6px;text-align:center">${candidatos.length?(claseSinRepetir?`Quedan ${quedan} de ${candidatos.length}`:`${candidatos.length} en el sorteo`):"No hay nadie en el sorteo"}${ausentes?` · ${ausentes} ausente${ausentes===1?"":"s"} hoy`:""}</div>
    <label class="clase-op"><input type="checkbox" ${claseSinRepetir?"checked":""} onchange="claseOpcion('repetir',this.checked)"> No repetir hasta que salgan todos</label>
    <label class="clase-op"><input type="checkbox" ${claseSinAusentes?"checked":""} onchange="claseOpcion('ausentes',this.checked)"> Dejar fuera a quien falta hoy</label>
    ${claseSinRepetir&&ya.size?`<button class="ghost small" style="border:1px solid var(--line);margin-top:8px;width:100%" onclick="claseReiniciarSorteo()">↺ Empezar de nuevo</button>`:""}`;
}
function claseGruposHTML(){
  const g=claseGrupo();
  if(!g || !g.alumnos.length) return `<p class="sub" style="margin:10px 0">Añade alumnado a un grupo para poder hacer equipos.</p>`;
  const candidatos=claseCandidatos(g);
  const eq=claseEquipos && claseEquipos.grupoId===g.id ? claseEquipos.equipos : null;
  return `${claseSelectorGrupoHTML(g)}
    <div class="flex" style="gap:6px;align-items:center;flex-wrap:nowrap">
      <select class="in" style="flex:1;min-width:0" aria-label="Cómo repartir" onchange="claseOpcion('modo',this.value)">
        <option value="num" ${claseModoGrupos==="num"?"selected":""}>Número de grupos</option>
        <option value="tam" ${claseModoGrupos==="tam"?"selected":""}>Personas por grupo</option>
      </select>
      <input class="in" id="claseNum" type="number" min="1" max="40" style="width:64px" value="${claseNumGrupos}" aria-label="${claseModoGrupos==="num"?"Número de grupos":"Personas por grupo"}" onchange="claseOpcion('num',this.value)">
    </div>
    <label class="clase-op" style="margin-top:6px"><input type="checkbox" ${claseSinAusentes?"checked":""} onchange="claseOpcion('ausentes',this.checked)"> Dejar fuera a quien falta hoy</label>
    <button class="btn" style="width:100%;margin-top:8px" onclick="claseCrearGrupos()" ${candidatos.length?"":"disabled"}>👥 ${eq?"Repartir otra vez":"Hacer grupos"} (${candidatos.length})</button>
    ${eq?`<div class="clase-equipos scroll" role="status" aria-live="polite">${eq.map((e,i)=>`<div class="clase-equipo"><strong>Grupo ${i+1}</strong> <span class="sub" style="margin:0">(${e.length})</span><div>${e.map(n=>esc(n)).join("<br>")}</div></div>`).join("")}</div>
      <button class="ghost small" style="border:1px solid var(--line);margin-top:8px;width:100%" onclick="claseCopiarGrupos()">📋 Copiar los grupos</button>`:""}`;
}
function clasePintar(){
  const panel=document.getElementById("cronoPanel"); if(!panel) return;
  panel.querySelectorAll("[data-clase-tab]").forEach(b=>{ const on=b.dataset.claseTab===claseTab; b.classList.toggle("on",on); b.setAttribute("aria-selected",on?"true":"false"); });
  const crono=document.getElementById("claseCrono"), otra=document.getElementById("claseOtra");
  if(crono) crono.hidden=claseTab!=="crono";
  if(otra){ otra.hidden=claseTab==="crono"; otra.innerHTML=claseTab==="sorteo"?claseSorteoHTML():claseTab==="grupos"?claseGruposHTML():""; }
  panel.classList.toggle("clase-ancho",claseTab==="grupos");
}
