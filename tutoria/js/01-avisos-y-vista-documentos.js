/* ============================================================================
   Gestor de Tutoría · Avisos, confirmaciones y vista de documentos dentro de la app
   tutoria/js/01-avisos-y-vista-documentos.js
   ============================================================================ */

/* Texto seguro para meterlo entre comillas simples en código JavaScript que va dentro de
   un atributo HTML (onclick="selectNivel('…')"). Sin esto, un grupo o nivel con apóstrofo
   («PMAR d'Alt», «l'Eliana») cortaba el código y sus botones dejaban de funcionar. */
function jsAttr(s) {
  return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    .replace(/"/g, '\\x22').replace(/</g, '\\x3c').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

/* =================================================================
   v5 · AVISOS Y VISTA DE DOCUMENTOS DENTRO DE LA APP (Tutoría)
   - Avisos/confirmaciones propios en lugar de alert()/confirm() del
     navegador (Intro acepta, Esc cancela, borrar se ve en rojo).
   - Los informes y actas ya no abren ventanas emergentes (que el
     navegador bloqueaba y que en el iPad con la app instalada a veces no
     funcionaban): se muestran dentro de la app, con Imprimir / Guardar.
     Las actas editables siguen guardándose en la app (window.opener se
     redirige a esta ventana).
   ================================================================= */
/* v5: el curso escolar se calcula (de septiembre a agosto); antes estaba
   escrito a mano como "2025 – 2026" en el acta oficial y en dos pantallas. */
function _tCursoActual(sep,corto){ const d=new Date(); const y=d.getMonth()>=8?d.getFullYear():d.getFullYear()-1; return y+(sep||"-")+(corto?String(y+1).slice(2):(y+1)); }
function _tEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
(function(){
  const css=document.createElement('style');
  css.textContent=`
  .tdlg-ov{position:fixed;inset:0;background:rgba(5,8,16,.62);display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
  .tdlg-box{background:var(--surface,#0f1420);color:var(--text,#e8ecf5);border:1px solid var(--border2,#2e3a5c);border-radius:14px;max-width:460px;width:100%;padding:20px 22px;box-shadow:0 20px 60px rgba(0,0,0,.45);font-family:inherit}
  .tdlg-box h2{font-size:16px;margin:0 0 8px}
  .tdlg-msg{font-size:14px;line-height:1.5}
  .tdlg-in{width:100%;margin-top:10px;padding:8px 10px;border-radius:8px;border:1px solid var(--border2,#2e3a5c);background:var(--surface2,#161c2d);color:inherit;font-size:14px}
  .tdlg-bar{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
  .tdlg-bar button{padding:8px 16px;border-radius:8px;border:1px solid var(--border2,#2e3a5c);background:var(--surface2,#161c2d);color:inherit;font-weight:600;cursor:pointer;font-size:13.5px}
  .tdlg-bar .tdlg-si{background:var(--accent,#4f8ef7);border-color:var(--accent,#4f8ef7);color:#fff}
  .tdlg-bar .tdlg-si.peligro{background:#dc2626;border-color:#dc2626}
  .tdoc-ov{position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column;background:rgba(20,24,32,.95)}
  .tdoc-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 16px;background:#0b1220;color:#fff;box-shadow:0 2px 10px rgba(0,0,0,.35)}
  .tdoc-bar strong{font-size:14px;flex:1;min-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .tdoc-bar button{padding:7px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.35);background:transparent;color:#fff;font-weight:600;cursor:pointer;font-size:13px}
  .tdoc-bar button.tdoc-print{background:#4f8ef7;border-color:#4f8ef7}
  .tdoc-frame{flex:1;border:0;width:100%;background:#fff}
  :focus-visible{outline:3px solid #4f8ef7;outline-offset:2px}`;
  document.head.appendChild(css);
})();
let _tDlgZ=10000;
function _tDialogo({titulo,mensaje,ok,cancelar,peligro,entrada,valor}){
  if(window.__dialogosAuto){ (window.__dialogosLog=window.__dialogosLog||[]).push(String(mensaje)); if(entrada) return Promise.resolve(window.__dialogosAuto.texto??null); return Promise.resolve(cancelar?window.__dialogosAuto.confirmar!==false:true); }
  return new Promise(resolve=>{
    const previo=document.activeElement;
    const ov=document.createElement('div'); ov.className='tdlg-ov'; ov.style.zIndex=String(++_tDlgZ);
    ov.innerHTML=`<div class="tdlg-box" role="${cancelar?'alertdialog':'dialog'}" aria-modal="true" aria-labelledby="tdlgT${_tDlgZ}">
      <h2 id="tdlgT${_tDlgZ}">${titulo||(cancelar?(peligro?'⚠️ ¿Seguro?':'¿Continuar?'):'Aviso')}</h2>
      <div class="tdlg-msg">${_tEsc(mensaje).replace(/\n/g,'<br>')}</div>
      ${entrada?`<input class="tdlg-in" value="${_tEsc(valor||'')}">`:''}
      <div class="tdlg-bar">${cancelar?`<button class="tdlg-no">${cancelar}</button>`:''}<button class="tdlg-si ${peligro?'peligro':''}" id="dlgOk">${ok||'Aceptar'}</button></div></div>`;
    document.body.appendChild(ov);
    const inp=ov.querySelector('.tdlg-in');
    const fin=v=>{ ov.remove(); document.removeEventListener('keydown',tecla,true); try{ previo&&previo.focus&&previo.focus(); }catch(e){} resolve(v); };
    const si=()=>fin(entrada?inp.value:true), no=()=>fin(entrada?null:false);
    const tecla=e=>{ if(Number(ov.style.zIndex)!==_tDlgZ) return; if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); (cancelar||entrada)?no():si(); } else if(e.key==='Enter'){ e.preventDefault(); e.stopPropagation(); si(); } };
    document.addEventListener('keydown',tecla,true);
    ov.querySelector('.tdlg-si').onclick=si; const b=ov.querySelector('.tdlg-no'); if(b) b.onclick=no;
    ov.onclick=e=>{ if(e.target===ov && (cancelar||entrada)) no(); };
    setTimeout(()=>{ (inp||ov.querySelector('.tdlg-si')).focus(); },20);
  });
}
function mostrarAviso(m,t){ return _tDialogo({titulo:t||'Aviso',mensaje:m}); }
function confirmar(m,o){ o=o||{}; const peligro=o.peligro!=null?o.peligro:/eliminar|borrar|vaciar|descartar|reemplaz|restaurar|no se puede deshacer/i.test(String(m)); return _tDialogo({titulo:o.titulo,mensaje:m,ok:o.ok||(peligro?(/eliminar|borrar/i.test(String(m))?'Eliminar':'Sí, continuar'):'Aceptar'),cancelar:'Cancelar',peligro}); }

/* ---- Vista de documentos (sustituye a window.open) ---- */
function _tEsIOS(){ return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1); }
async function _tGuardarArchivo(blob,nombre){
  if(_tEsIOS() && navigator.canShare){ try{ const f=new File([blob],nombre,{type:blob.type}); if(navigator.canShare({files:[f]})){ await navigator.share({files:[f],title:nombre}); return; } }catch(e){ if(e&&e.name==='AbortError') return; } }
  const u=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=u; a.download=nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000);
}
window.__cerrarVistaDocT=function(){ const o=document.getElementById('tdocOverlay'); if(o) o.remove(); };
function _mostrarDocumentoT(html){
  window.__cerrarVistaDocT();
  const m=/<title>([\s\S]*?)<\/title>/i.exec(html); const titulo=m?m[1].replace(/<[^>]+>/g,'').trim():'Documento';
  const shim='<script>try{window.opener=window.parent;}catch(e){}window.close=function(){try{parent.__cerrarVistaDocT();}catch(e){}};<\/script>';
  const doc=/<head[^>]*>/i.test(html)?html.replace(/<head[^>]*>/i,x=>x+shim):shim+html;
  const ov=document.createElement('div'); ov.id='tdocOverlay'; ov.className='tdoc-ov'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true'); ov.setAttribute('aria-label','Vista previa: '+titulo);
  ov.innerHTML=`<div class="tdoc-bar"><strong>${_tEsc(titulo)}</strong><button class="tdoc-print">🖨️ Imprimir / Guardar PDF</button><button class="tdoc-save">⬇ Guardar archivo</button><button class="tdoc-close" aria-label="Cerrar vista previa">✕ Cerrar</button></div><iframe class="tdoc-frame" title="${_tEsc(titulo)}"></iframe>`;
  document.body.appendChild(ov);
  const fr=ov.querySelector('iframe'); fr.srcdoc=doc;
  ov.querySelector('.tdoc-print').onclick=()=>{ try{ fr.contentWindow.focus(); fr.contentWindow.print(); }catch(e){ mostrarAviso('No se ha podido abrir la impresión. Usa «Guardar archivo» y ábrelo en el navegador para imprimirlo.'); } };
  ov.querySelector('.tdoc-save').onclick=()=>{ _tGuardarArchivo(new Blob([html],{type:'text/html'}),titulo.replace(/[\\/:*?"<>|]+/g,' ').slice(0,90)+'.html'); };
  ov.querySelector('.tdoc-close').onclick=window.__cerrarVistaDocT;
  setTimeout(()=>{ try{ ov.querySelector('.tdoc-print').focus(); }catch(e){} },30);
}
/* Objeto con la misma forma que la ventana que devolvía window.open:
   el código de siempre escribe en él y, al cerrar el documento, se muestra. */
function _ventanaDoc(){
  let buf='';
  const w={ closed:false, document:{ write:(h)=>{ buf+=h; }, writeln:(h)=>{ buf+=h+'\n'; }, open:()=>{ buf=''; }, close:()=>{ _mostrarDocumentoT(buf); } }, focus:()=>{}, print:()=>{}, close:()=>{ window.__cerrarVistaDocT(); } };
  return w;
}
document.addEventListener('keydown',e=>{
  if(e.key==='Escape' && document.getElementById('tdocOverlay') && !document.querySelector('.tdlg-ov')){ e.preventDefault(); window.__cerrarVistaDocT(); }
});
/* =================================================================
   v5 · IMPORTAR SUSPENSOS DEL CUADERNO DEL PROFESOR
   Cada profesor/a exporta desde su Cuaderno (Resultados → «👥 Para la
   tutoría») un archivo con la nota de acta de su materia por evaluación.
   Aquí se carga: la materia se añade a «Pendientes I / II evaluación» y a
   «Pendientes próximo curso» (final) a quien la tiene suspensa, y se
   quita a quien la ha aprobado. El nº de materias no superadas de cada
   evaluación se sube si queda por debajo de las materias marcadas.
   ================================================================= */
function _tNorm(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]/g,''); }
/* Parecido entre dos nombres (0 a 1): el mayor entre «contiene todas las palabras del
   más corto» (Ana ↔ Ana María) y la coincidencia de pares de letras (Lopes ↔ López). */
function _tPalabras(s){ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().split(/[^a-z0-9ñ]+/).filter(w=>w.length>1); }
function _tSimilitud(a,b){
  const A=new Set(_tPalabras(a)), B=new Set(_tPalabras(b));
  if(!A.size||!B.size) return 0;
  let comunes=0; A.forEach(w=>{ if(B.has(w)) comunes++; });
  const contiene=comunes/Math.min(A.size,B.size);
  const pares=t=>{ const m=new Map(); for(let i=0;i<t.length-1;i++){ const k=t.slice(i,i+2); m.set(k,(m.get(k)||0)+1); } return m; };
  const x=_tNorm(a), y=_tNorm(b); const px=pares(x), py=pares(y); let inter=0;
  px.forEach((n,k)=>{ inter+=Math.min(n,py.get(k)||0); });
  const dice=(x.length>1&&y.length>1)? 2*inter/((x.length-1)+(y.length-1)) : 0;
  // Si solo coincide una palabra (p. ej. el nombre de pila), no basta para proponerlo.
  return Math.max(comunes>=2||A.size===1||B.size===1 ? contiene : 0, dice);
}
const _T_SIM_PROPONER=0.75, _T_SIM_MARCAR=0.9;
function _tNivelDeCurso(curso){
  const c=_tNorm(curso).replace(/o(?=eso|bach)/,'');
  return NIVELES.find(n=>{ const k=_tNorm(n).replace(/o(?=eso|bach)/,''); return k===c || c.startsWith(k) || k.startsWith(c); }) || '';
}
function importarDelCuaderno(){
  let inp=document.getElementById('impCuadernoFile');
  if(!inp){ inp=document.createElement('input'); inp.type='file'; inp.accept='.json,application/json'; inp.id='impCuadernoFile'; inp.style.display='none'; document.body.appendChild(inp); }
  inp.value='';
  inp.onchange=()=>{ const f=inp.files[0]; if(!f) return; const rd=new FileReader(); rd.onload=()=>{ let o; try{ o=JSON.parse(rd.result); }catch(e){ mostrarAviso('El archivo no se puede leer.'); return; } _tImpCuadernoModal(o,f.name); }; rd.readAsText(f); };
  inp.click();
}
function _tImpCuadernoModal(o,nombreArchivo){
  if(!o || o.formato!=='cuaderno-a-tutoria' || !Array.isArray(o.alumnos)){ mostrarAviso('Este archivo no viene del Cuaderno del Profesor («👥 Para la tutoría» en Resultados).'); return; }
  const nivelSug=_tNivelDeCurso(o.curso) || (NIVELES.includes(currentNivel)?currentNivel:NIVELES[0]);
  const letra=(String(o.grupo||'').trim().split(/\s+/).pop()||'');
  const ov=document.createElement('div'); ov.className='tdlg-ov'; ov.style.zIndex=String(++_tDlgZ); ov.id='impCuadernoOv';
  const opcNivel=NIVELES.map(n=>`<option ${n===nivelSug?'selected':''}>${_tEsc(n)}</option>`).join('');
  ov.innerHTML=`<div class="tdlg-box" role="dialog" aria-modal="true" aria-labelledby="impCT" style="max-width:560px">
    <h2 id="impCT">📥 Suspensos de ${_tEsc(o.materia)} — ${_tEsc(o.grupo)}</h2>
    <div class="tdlg-msg" style="font-size:13px">${[o.alumnos.length+' alumnos', o.profesor?_tEsc(o.profesor):'', 'generado el '+_tEsc(new Date(o.generado).toLocaleDateString('es-ES'))].filter(Boolean).join(' · ')}. Elige a qué grupo de Tutoría corresponde:</div>
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
      <select id="impCNivel" class="tdlg-in" style="width:auto;margin:0">${opcNivel}</select>
      <select id="impCGrupo" class="tdlg-in" style="width:auto;margin:0"></select>
      <input id="impCMateria" class="tdlg-in" style="flex:1;min-width:180px;margin:0" value="${_tEsc(o.materia)}" aria-label="Nombre de la materia en Tutoría" list="impCMatList"><datalist id="impCMatList"></datalist>
    </div>
    <div id="impCResumen" class="tdlg-msg" style="font-size:12.5px;margin-top:10px;max-height:34vh;overflow:auto"></div>
    <div class="tdlg-bar"><button class="tdlg-no">Cancelar</button><button class="tdlg-si" id="impCOk">Importar</button></div></div>`;
  document.body.appendChild(ov);
  const selN=ov.querySelector('#impCNivel'), selG=ov.querySelector('#impCGrupo'), inM=ov.querySelector('#impCMateria');
  const pintarGrupos=()=>{ const gs=GRUPOS_POR_NIVEL[selN.value]||[]; selG.innerHTML=gs.map(g=>`<option ${_tNorm(g)===_tNorm(letra)?'selected':''}>${_tEsc(g)}</option>`).join(''); const mats=getMateriasParaNivel(selN.value, selG.value)||[]; ov.querySelector('#impCMatList').innerHTML=mats.map(m=>`<option value="${_tEsc(m)}">`).join(''); const exacta=mats.find(m=>_tNorm(m)===_tNorm(o.materia)); if(exacta) inM.value=exacta; };
  // Propuestas de nombre parecido: marcadas de entrada si el parecido es muy alto.
  let confirmados=new Map(), grupoDePropuestas='';
  const plan=()=>{
    const clave=selN.value+'|'+selG.value;
    if(clave!==grupoDePropuestas){
      grupoDePropuestas=clave; confirmados=new Map();
      _tImpCuadernoPlan(o,selN.value,selG.value,inM.value.trim(),null).propuestas.forEach(pr=>{ if(pr.parecido>=_T_SIM_MARCAR) confirmados.set(pr.nombre,pr.idx); });
    }
    return _tImpCuadernoPlan(o,selN.value,selG.value,inM.value.trim(),confirmados);
  };
  const pintarResumen=()=>{
    const p=plan(); const mats=getMateriasParaNivel(selN.value, selG.value)||[];
    ov.querySelector('#impCResumen').innerHTML=
      (mats.length && !mats.some(m=>_tNorm(m)===_tNorm(inM.value))?`<div style="color:#f59e0b">⚠️ «${_tEsc(inM.value)}» no está en la lista de materias de ${_tEsc(selN.value)}. Elige la equivalente en el desplegable.</div>`:'')+
      `<div>✓ ${p.emparejados.length} alumnos encontrados en ${_tEsc(selN.value)} ${_tEsc(selG.value)} · ${p.cambios} cambios en sus pendientes.</div>`+
      (p.propuestas.length?`<div style="margin-top:8px"><strong>¿Son la misma persona?</strong> El nombre no coincide exactamente:</div>`+
        p.propuestas.map((pr,k)=>`<label style="display:flex;gap:8px;align-items:center;margin-top:4px;cursor:pointer"><input type="checkbox" data-prop="${k}" ${confirmados.get(pr.nombre)===pr.idx?'checked':''}> <span>«${_tEsc(pr.nombre)}» (Cuaderno) → «${_tEsc(pr.nombreTutoria)}» (Tutoría)</span></label>`).join(''):'')+
      (p.noEncontrados.filter(n=>!p.propuestas.some(pr=>pr.nombre===n)).length?`<div style="color:#f59e0b;margin-top:6px">⚠️ Sin encontrar: ${p.noEncontrados.filter(n=>!p.propuestas.some(pr=>pr.nombre===n)).map(_tEsc).join(', ')}. Comprueba que el nombre coincide («Apellidos, Nombre»).</div>`:'');
    ov.querySelectorAll('#impCResumen input[data-prop]').forEach(cb=>{ cb.onchange=()=>{ const pr=p.propuestas[+cb.dataset.prop]; if(cb.checked) confirmados.set(pr.nombre,pr.idx); else confirmados.delete(pr.nombre); pintarResumen(); }; });
  };
  selN.onchange=()=>{ pintarGrupos(); pintarResumen(); }; selG.onchange=pintarResumen; inM.oninput=pintarResumen;
  pintarGrupos(); pintarResumen();
  const cerrar=()=>ov.remove();
  ov.querySelector('.tdlg-no').onclick=cerrar;
  ov.querySelector('#impCOk').onclick=()=>{ const p=plan(); if(!p.emparejados.length){ mostrarAviso('No se ha encontrado a ningún alumno/a de este archivo en ese grupo.'); return; } _tImpCuadernoAplicar(p); cerrar();
    showToast(`✓ ${o.materia}: ${p.cambios} cambios en ${p.emparejados.length} alumnos${p.noEncontrados.length?` · ${p.noEncontrados.length} sin encontrar`:''}`); };
  ov.addEventListener('keydown',e=>{ if(e.key==='Escape'){ e.stopPropagation(); cerrar(); } });
  setTimeout(()=>selN.focus(),20);
}
function _tImpCuadernoPlan(o,nivel,grupo,materia,confirmados){
  const lista=(data[nivel]&&data[nivel][grupo])||[];
  const idx={}; lista.forEach((a,i)=>{ idx[_tNorm(a.nombre)]=i; });
  const porId={}; lista.forEach((a,i)=>{ (a.idsCuaderno||[]).forEach(id=>{ porId[id]=i; }); });
  const emparejados=[], noEncontrados=[], propuestas=[]; let cambios=0;
  // Alumnado de Tutoría que ya tiene pareja exacta: no se propone a nadie más.
  const usados=new Set(o.alumnos.map(x=>(x.id!=null?porId[x.id]:undefined) ?? idx[_tNorm(x.nombre)] ?? (x.apellidos?idx[_tNorm(x.apellidos+', '+x.nombrePropio)]:undefined)).filter(i=>i!=null));
  const CAMPOS={1:['pendientes1','eval1'],2:['pendientes2','eval2'],final:['pendientesIII','eval3']};
  o.alumnos.forEach(x=>{
    let i=(x.id!=null && porId[x.id]!=null) ? porId[x.id] : idx[_tNorm(x.nombre)];   // primero, el identificador del Cuaderno
    if(i==null && x.apellidos) i=idx[_tNorm(x.apellidos+', '+x.nombrePropio)];
    if(i==null){
      // Nombre que no coincide exactamente: se propone el más parecido del grupo.
      let mejor=-1, nota=0;
      lista.forEach((a,j)=>{ if(usados.has(j)) return; const v=_tSimilitud(x.nombre,a.nombre); if(v>nota){ nota=v; mejor=j; } });
      if(mejor>=0 && nota>=_T_SIM_PROPONER){
        propuestas.push({nombre:x.nombre, idx:mejor, nombreTutoria:lista[mejor].nombre, parecido:nota});
        usados.add(mejor);
        if(confirmados && confirmados.get(x.nombre)===mejor) i=mejor;
      }
      if(i==null){ noEncontrados.push(x.nombre); return; }
    }
    const a=lista[i]; const ops=[];
    Object.keys(CAMPOS).forEach(k=>{
      const nota=x.notas[k]; if(nota==null) return;
      const [campo,evalCampo]=CAMPOS[k]; const arr=Array.isArray(a[campo])?a[campo]:[];
      const tiene=arr.some(m=>_tNorm(m)===_tNorm(materia));
      if(nota<5 && !tiene){ ops.push({campo,evalCampo,accion:'add'}); cambios++; }
      else if(nota>=5 && tiene){ ops.push({campo,evalCampo,accion:'del'}); cambios++; }
    });
    emparejados.push({a,ops,idCuaderno:x.id});
  });
  return {nivel,grupo,materia,emparejados,noEncontrados,propuestas,cambios};
}
function _tImpCuadernoAplicar(p){
  p.emparejados.forEach(({a,idCuaderno})=>{ if(idCuaderno!=null && !(a.idsCuaderno||[]).includes(idCuaderno)) a.idsCuaderno=(a.idsCuaderno||[]).concat(idCuaderno); });
  p.emparejados.forEach(({a,ops})=>ops.forEach(op=>{
    if(!Array.isArray(a[op.campo])) a[op.campo]=[];
    if(op.accion==='add') a[op.campo].push(p.materia);
    else a[op.campo]=a[op.campo].filter(m=>_tNorm(m)!==_tNorm(p.materia));
    const n=a[op.campo].length; if((+a[op.evalCampo]||0)<n) a[op.evalCampo]=n;
  }));
  markDirty(); renderAll();
}

/* ---- Accesibilidad: nombre legible en botones que solo tienen un icono ---- */
const _T_ICONOS={'✕':'Cerrar','×':'Cerrar','✏️':'Editar','🗑':'Eliminar','🗑️':'Eliminar','☀️':'Cambiar tema','🌙':'Cambiar tema','?':'Ayuda','🏠':'Inicio','▲':'Subir','▼':'Bajar','＋':'Añadir','+':'Añadir','🗂️🙈':'Mostrar u ocultar Actas no Oficiales'};
function _tA11y(raiz){
  (raiz||document).querySelectorAll('button:not([aria-label])').forEach(b=>{
    const t=(b.textContent||'').trim();
    if(/[A-Za-zÁÉÍÓÚÑáéíóúñ0-9]{2,}/.test(t)) return;
    if(b.title) b.setAttribute('aria-label',b.title); else if(_T_ICONOS[t]) b.setAttribute('aria-label',_T_ICONOS[t]);
  });
  (raiz||document).querySelectorAll('input:not([aria-label]):not([type="hidden"]),select:not([aria-label]),textarea:not([aria-label])').forEach(el=>{
    if(el.title || el.getAttribute('aria-labelledby') || (el.labels && el.labels.length)) return;
    const n=_tNombreCampo(el); if(n) el.setAttribute('aria-label',n);
  });
}
/* Nombre de un campo sin etiqueta: en la tabla, la cabecera de su columna; fuera
   de ella, su texto de ejemplo o el texto corto que tiene justo delante. */
function _tNombreCampo(el){
  if(el.classList.contains('row-cb')) return 'Seleccionar esta fila';
  const td=el.closest('td');
  if(td){ const c=_tCabeceraColumna(td); if(c) return c; }
  if(el.placeholder) return el.placeholder;
  const prev=el.previousElementSibling, t=prev && (prev.textContent||'').trim();
  if(t && t.length<=40) return t.replace(/[:：]\s*$/,'');
  return '';
}
function _tCabeceraColumna(td){
  const tabla=td.closest('table'), filas=tabla && tabla.tHead && tabla.tHead.rows;
  if(!filas || !filas.length) return '';
  let x=0; for(let c=td.previousElementSibling;c;c=c.previousElementSibling) x+=c.colSpan||1;
  for(let i=filas.length-1;i>=0;i--){
    let pos=0;
    for(const th of filas[i].cells){
      const ancho=th.colSpan||1;
      if(x>=pos && x<pos+ancho){ const t=(th.textContent||'').replace(/\s+/g,' ').trim(); if(t) return t; break; }
      pos+=ancho;
    }
  }
  return '';
}
new MutationObserver(()=>{ clearTimeout(window.__tA11yT); window.__tA11yT=setTimeout(()=>{ try{ _tA11y(document); }catch(e){} },120); }).observe(document.documentElement,{childList:true,subtree:true});
