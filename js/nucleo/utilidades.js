/* ============================================================================
   Cuaderno del profesor · Nota de acta, utilidades (uid, esc), avisos, toasts y diálogos
   js/nucleo/utilidades.js
   ============================================================================ */

/* =================================================================
   v1 · NOTA DE ACTA — una única fuente de verdad para la calificación.
   Antes, la etiqueta (Insuficiente…Sobresaliente) usaba unos cortes
   (4,9 / 5,9…), la pantalla redondeaba a 1 decimal y el recuento de
   aprobados usaba ≥5: con 4,93 se veía "4,9 · Suficiente" pero contaba
   como suspenso. Ahora la calificación oficial es SIEMPRE la nota de acta
   (entera, sin decimales, como exige la normativa) y de ella salen la
   etiqueta y el aprobado. La regla de redondeo es configurable
   (Ajustes del grupo → Redondeo de la nota de acta) y común a todos los grupos.
   ================================================================= */
const REDONDEO_MODOS=[
  {id:"sinAprobarPorRedondeo",label:"Redondeo normal, pero sin aprobar por redondeo (4,5–4,9 → 4; 6,5 → 7)"},
  {id:"estandar",label:"Redondeo normal (4,5 → 5; 6,5 → 7)"},
  {id:"truncar",label:"Truncar, sin redondear (4,9 → 4; 6,9 → 6)"}
];
function _limpiaFP(x){ return Number(Number(x).toPrecision(12)); }
function modoRedondeoActa(){ return (state && state.ajustesNota && state.ajustesNota.redondeoActa) || "sinAprobarPorRedondeo"; }
function _grupoEsBach(grupo){
  const g=grupo||(typeof grupoActual==="function"?grupoActual():null);
  if(!g) return false;
  const cat=getCatalogo(g.catalogoKey);
  return /bach/i.test((cat&&cat.curso)||"")||/bach/i.test(g.nombre||"");
}
function notaActa(v,grupo){
  if(v==null||v===""||isNaN(Number(v))) return null;
  v=Math.max(0,Math.min(10,_limpiaFP(v)));
  const modo=modoRedondeoActa();
  let n;
  if(modo==="truncar") n=Math.floor(v);
  else{
    n=Math.floor(_limpiaFP(v+0.5));
    if(modo==="sinAprobarPorRedondeo" && v<5 && n>=5) n=4;
  }
  // En ESO la escala oficial va de 1 a 10 (Insuficiente: 1-4); en Bachillerato, de 0 a 10.
  if(n<1 && !_grupoEsBach(grupo)) n=1;
  return n;
}
function esAprobado(v,grupo){ const n=notaActa(v,grupo); return n!=null && n>=5; }
function etiquetaNota(v,grupo){
  const n=notaActa(v,grupo);
  if(n==null) return null;
  for(const x of NIVCUANT) if(n<=x.max) return x;
  return NIVCUANT[NIVCUANT.length-1];
}

const KEY="geohist_multigrupo_v1";
const OLD_KEY="hmc_eval_local_v1"; 
const uid=()=>Math.random().toString(36).slice(2,9);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
/* Notificación breve no bloqueante (sustituye a mostrarAviso() en confirmaciones que
   no necesitan respuesta del usuario, p. ej. "Guardado", "Copiado al portapapeles…"). */
let _toastTimer=null;
function mostrarToast(mensaje,tipo){
  let el=document.getElementById("toastGlobal");
  if(!el){ el=document.createElement("div"); el.id="toastGlobal"; el.className="toast-global"; document.body.appendChild(el); }
  el.textContent=mensaje;
  el.className="toast-global toast-show"+(tipo==="info"?" toast-info":"");
  clearTimeout(_toastTimer);
  _toastTimer=setTimeout(()=>{ el.classList.remove("toast-show"); },2400);
}

/* =================================================================
   v3 · AVISOS PROPIOS DE LA APP
   Sustituyen a alert(), confirm() y prompt() del navegador, que bloquean
   la pantalla, no se pueden leer bien en iPad y en la app instalada a
   veces ni aparecen. Intro = aceptar, Escape = cancelar. Las acciones
   peligrosas (eliminar…) se muestran con el botón en rojo.
   ================================================================= */
let _dlgZ=80;
function _textoDialogoHTML(m){ return esc(String(m??"")).replace(/\n/g,"<br>"); }
function _dialogo({titulo,mensaje,ok,cancelar,peligro,entrada,valor}){
  const auto=window.__dialogosAuto;
  if(auto){
    (window.__dialogosLog=window.__dialogosLog||[]).push(String(mensaje));
    if(entrada) return Promise.resolve(auto.texto!=null?String(auto.texto):null);
    return Promise.resolve(cancelar?auto.confirmar!==false:true);
  }
  return new Promise(resolve=>{
    const previo=document.activeElement;
    const div=document.createElement("div");
    div.className="modal-overlay dlg-overlay"; div.style.zIndex=String(++_dlgZ);
    const idT="dlgT"+_dlgZ;
    div.innerHTML=`<div class="modal-box dlg-box" role="${cancelar?"alertdialog":"dialog"}" aria-modal="true" aria-labelledby="${idT}" style="max-width:460px">
      <h2 id="${idT}" style="font-size:16.5px;margin-bottom:6px">${titulo||(cancelar?(peligro?"⚠️ ¿Seguro?":"¿Continuar?"):"Aviso")}</h2>
      <div class="dlg-msg" style="font-size:14px;line-height:1.5;color:var(--ink)">${_textoDialogoHTML(mensaje)}</div>
      ${entrada?`<input class="in dlg-in" style="width:100%;margin-top:10px" value="${esc(valor??"")}">`:""}
      <div class="flex" style="justify-content:flex-end;gap:8px;margin-top:16px">
        ${cancelar?`<button class="ghost dlg-no" style="border:1px solid var(--line)">${cancelar}</button>`:""}
        <button class="btn dlg-si ${peligro?"danger":""}" id="dlgOk" style="${peligro?"background:#b91c1c;color:#fff;border-color:#b91c1c":""}">${ok||"Aceptar"}</button>
      </div></div>`;
    document.body.appendChild(div);
    const inp=div.querySelector(".dlg-in");
    const fin=v=>{ div.remove(); document.removeEventListener("keydown",tecla,true); try{ previo&&previo.focus&&previo.focus(); }catch(e){} resolve(v); };
    const si=()=>fin(entrada?inp.value:true), no=()=>fin(entrada?null:false);
    const tecla=e=>{
      if(!document.body.contains(div)) return;
      if(div.style.zIndex!==String(_dlgZMax())) return;
      if(e.key==="Escape"){ e.preventDefault(); e.stopPropagation(); cancelar||entrada?no():si(); }
      else if(e.key==="Enter" && !(e.target && e.target.tagName==="TEXTAREA")){ e.preventDefault(); e.stopPropagation(); si(); }
    };
    document.addEventListener("keydown",tecla,true);
    div.querySelector(".dlg-si").onclick=si;
    const b=div.querySelector(".dlg-no"); if(b) b.onclick=no;
    div.onclick=e=>{ if(e.target===div && (cancelar||entrada)) no(); };
    setTimeout(()=>{ (inp||div.querySelector(".dlg-si")).focus(); if(inp) inp.select(); },20);
  });
}
function _dlgZMax(){ return Math.max(0,...[...document.querySelectorAll(".dlg-overlay")].map(d=>Number(d.style.zIndex)||0)); }
function mostrarAviso(mensaje,titulo){ return _dialogo({titulo:titulo||"Aviso",mensaje}); }
function confirmar(mensaje,opts){
  opts=opts||{};
  const peligro=opts.peligro!=null?opts.peligro:/eliminar|borrar|quitar|vaciar|descartar|sustituir|reemplaz|no se puede deshacer/i.test(String(mensaje));
  const okTxt=opts.ok||(peligro?(/eliminar|borrar/i.test(String(mensaje))?"Eliminar":"Sí, continuar"):"Aceptar");
  return _dialogo({titulo:opts.titulo,mensaje,ok:okTxt,cancelar:opts.cancelar||"Cancelar",peligro});
}
function pedirTexto(mensaje,valor){ return _dialogo({titulo:"✏️",mensaje,ok:"Aceptar",cancelar:"Cancelar",entrada:true,valor}); }

/* Devuelve un catálogo (materia+curso con sus CE, criterios y bloques), ya sea
   uno de los precargados o uno importado por el profesor/a para su propia materia. */
function getCatalogo(key){
  // Una plantilla editada por el profesor/a se guarda con la MISMA clave en
  // catalogosPersonalizados y "tapa" a la oficial (CATALOGOS) mientras exista.
  return (state && state.catalogosPersonalizados && state.catalogosPersonalizados[key]) || CATALOGOS[key] || null;
}
